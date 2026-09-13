const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');
const ResponseFormatter = require('../utils/responseFormatter');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

// ── Storage helpers ───────────────────────────────────────────────────────────

function usingAzureBlob() {
  return !!(process.env.AZURE_STORAGE_CONNECTION_STRING && process.env.AZURE_STORAGE_CONTAINER);
}

async function uploadToBlob(buffer, filename, mimetype) {
  const { BlobServiceClient } = require('@azure/storage-blob');
  const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const container = client.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
  await container.createIfNotExists({ access: 'blob' });
  const blobClient = container.getBlockBlobClient(filename);
  await blobClient.uploadData(buffer, {
    blobHTTPHeaders: { blobContentType: mimetype }
  });
  return blobClient.url;
}

async function deleteFromBlob(filename) {
  const { BlobServiceClient } = require('@azure/storage-blob');
  const client = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
  const container = client.getContainerClient(process.env.AZURE_STORAGE_CONTAINER);
  await container.deleteBlob(filename);
}

// ── Image processing ──────────────────────────────────────────────────────────

// Recorta al centro y comprime a WebP. Devuelve { buffer, filename, mimetype }.
async function processImage(file, userId) {
  const filename = `${userId}-${Date.now()}.webp`;
  const buffer = await sharp(file.buffer)
    .rotate()                          // respetar EXIF orientation
    .resize(400, 400, {
      fit: 'cover',                    // recorte centrado (crop)
      position: 'attention'            // enfoca la zona de interés (cara)
    })
    .webp({ quality: 80 })            // comprimir — ~30-60 KB típico
    .toBuffer();
  return { buffer, filename, mimetype: 'image/webp' };
}

// ── Multer setup ──────────────────────────────────────────────────────────────

// Siempre memoria — procesamos con sharp antes de guardar
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    // Aceptar cualquier imagen
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes'), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10 MB antes de comprimir
});

// ── Routes ────────────────────────────────────────────────────────────────────

router.post('/photo', authMiddleware, upload.single('photo'), async (req, res) => {
  if (!req.file) {
    return ResponseFormatter.badRequest(res, 'No se recibió ningún archivo');
  }

  try {
    const userId = req.user?.userId || 'anonymous';
    const { buffer, filename, mimetype } = await processImage(req.file, userId);

    let photoUrl;

    if (usingAzureBlob()) {
      photoUrl = await uploadToBlob(buffer, filename, mimetype);
    } else {
      const uploadDir = path.resolve(__dirname, '../../../datos/uploads/users');
      if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), buffer);
      photoUrl = `${process.env.APP_URL || 'http://localhost:3001'}/uploads/users/${filename}`;
    }

    return ResponseFormatter.success(res, {
      message: 'Foto subida exitosamente',
      photo: photoUrl,
      url: photoUrl,
      filename,
      size: buffer.length
    }, 201);
  } catch (err) {
    console.error('Upload error:', err.message);
    return ResponseFormatter.internalError(res, 'Error al procesar la foto');
  }
});

router.delete('/photo/:filename', authMiddleware, async (req, res) => {
  const { filename } = req.params;

  try {
    if (usingAzureBlob()) {
      await deleteFromBlob(filename);
    } else {
      const uploadDir = path.resolve(__dirname, '../../../datos/uploads/users');
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
