const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Storage helpers ───────────────────────────────────────────────────────────

function usingAzureBlob() {
  return !!(process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONTAINER);
}

async function uploadToBlob(file) {
  const { BlobServiceClient } = require('@azure/storage-blob');
  const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const container = client.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
  await container.createIfNotExists({ access: 'blob' });
  const blobClient = container.getBlockBlobClient(file.filename);
  await blobClient.uploadData(file.buffer, {
    blobHTTPHeaders: { blobContentType: file.mimetype }
  });
  return blobClient.url;
}

async function deleteFromBlob(filename) {
  const { BlobServiceClient } = require('@azure/storage-blob');
  const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const container = client.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
  await container.deleteBlob(filename);
}

// ── Multer setup ──────────────────────────────────────────────────────────────

const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de archivo no permitido. Solo JPG, PNG, GIF, WebP'), false);
  }
};

function buildFilename(req, ext) {
  const userId = req.user?.userId || 'anonymous';
  return `${userId}-${Date.now()}${ext}`;
}

// Azure Blob: store in memory for direct upload
const memoryStorage = multer.memoryStorage();

// Local disk storage
const uploadDir = path.resolve(__dirname, '../../../datos/uploads/users');
if (!usingAzureBlob() && !fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, buildFilename(req, path.extname(file.originalname)))
});

const upload = multer({
  storage: usingAzureBlob() ? memoryStorage : diskStorage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return ResponseFormatter.badRequest(res, 'No file uploaded');
  }

  try {
    let photoUrl;

    if (usingAzureBlob()) {
      // multer stored file in buffer — give it a deterministic name
      req.file.filename = buildFilename(req, path.extname(req.file.originalname));
      photoUrl = await uploadToBlob(req.file);
    } else {
      // multer already wrote to disk — build the local URL
      const photoPath = `/uploads/users/${req.file.filename}`;
      photoUrl = `${process.env.APP_URL || 'http://localhost:3001'}${photoPath}`;
    }

    return ResponseFormatter.success(res, {
      message: 'Foto subida exitosamente',
      photo: photoUrl,
      url: photoUrl,
      filename: req.file.filename,
      size: req.file.size
    }, 201);
  } catch (err) {
    console.error('Upload error:', err.message);
    return ResponseFormatter.internalError(res, 'Error al subir la foto');
  }
});

router.delete('/photo/:filename', authMiddleware, async (req, res) => {
  const { filename } = req.params;

  try {
    if (usingAzureBlob()) {
      await deleteFromBlob(filename);
    } else {
      const filepath = path.join(uploadDir, filename);
      if (!filepath.startsWith(uploadDir)) {
        return ResponseFormatter.forbidden(res, 'Acceso denegado');
      }
      fs.unlinkSync(filepath);
    }

    return ResponseFormatter.success(res, { message: 'Foto eliminada exitosamente' });
  } catch {
    return ResponseFormatter.notFound(res, 'Archivo no encontrado');
  }
});

module.exports = router;
