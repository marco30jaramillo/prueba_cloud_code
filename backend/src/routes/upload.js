const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// __dirname es backend/src/routes/, así que ../../.. sube a la raíz
const uploadDir = path.resolve(__dirname, '../../../datos/uploads/users');

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const userId = req.user?.userId || 'anonymous';
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    const filename = `${userId}-${timestamp}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG, GIF, WebP'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.post('/photo', authMiddleware, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return ResponseFormatter.badRequest(res, 'No file uploaded');
  }

  // Ruta relativa: Express sirve desde /datos, así que es solo /uploads/users/...
  const photoPath = `/uploads/users/${req.file.filename}`;

  return ResponseFormatter.success(res, {
    message: 'Foto subida exitosamente',
    photo: photoPath, // Retornar solo /uploads/users/... (Express sirve desde /datos)
    url: `${process.env.APP_URL || 'http://localhost:3001'}${photoPath}`,
    filename: req.file.filename,
    size: req.file.size
  }, 201);
});

router.delete('/photo/:filename', authMiddleware, (req, res) => {
  const { filename } = req.params;
  const filepath = path.join(uploadDir, filename);

  if (!filepath.startsWith(uploadDir)) {
    return ResponseFormatter.forbidden(res, 'Acceso denegado');
  }

  fs.unlink(filepath, (err) => {
    if (err) {
      return ResponseFormatter.notFound(res, 'Archivo no encontrado');
    }
    return ResponseFormatter.success(res, {
      message: 'Foto eliminada exitosamente'
    });
  });
});

module.exports = router;
