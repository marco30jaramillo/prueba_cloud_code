# 📁 Sistema de Almacenamiento de Archivos

Carpeta centralizada para almacenar archivos del sistema (fotos, documentos, etc.).

## Estructura

```
datos/
├── default/
│   └── default-avatar.svg      # Foto por defecto para usuarios
├── uploads/
│   ├── users/                  # Fotos de perfil de usuarios
│   │   └── {userId}.jpg
│   └── temp/                   # Archivos temporales
└── README.md                    # Este archivo
```

## 📷 Fotos de Perfil

### Ubicación
- **Almacenamiento**: `datos/uploads/users/{userId}.{extension}`
- **Referencia en DB**: `photo: "/datos/uploads/users/{userId}.{extension}"`
- **Por defecto**: `/datos/default/default-avatar.svg`

### Upload
- Se realiza mediante `POST /upload/photo`
- Backend procesa y guarda en `datos/uploads/users/`
- Retorna ruta relativa al proyecto
- Frontend referencia la ruta absoluta: `http://localhost:3001/datos/uploads/users/{userId}.jpg`

## 🔄 Flujo de Foto

1. **Registro/Edición**: Usuario selecciona foto del disco
2. **Frontend**: Envía archivo mediante `FormData` a `POST /upload/photo`
3. **Backend**: 
   - Valida formato (jpg, png, etc)
   - Genera nombre único: `{userId}.{timestamp}.{extension}`
   - Guarda en `datos/uploads/users/`
   - Retorna ruta: `/datos/uploads/users/{fileName}`
4. **Base de Datos**: Guarda ruta en campo `photo`
5. **Frontend**: Referencia URL completa: `http://localhost:3001/datos/uploads/users/...`

## 🔧 Configuración

### Backend (.env)
```env
UPLOAD_DIR=datos/uploads
MAX_FILE_SIZE=5242880  # 5MB
ALLOWED_EXTENSIONS=jpg,jpeg,png,gif,webp
```

### Frontend
```typescript
const UPLOAD_API = `${process.env.NEXT_PUBLIC_API_URL}/upload/photo`;
const DEFAULT_PHOTO = '/datos/default/default-avatar.svg';
```

## 📝 Notas Importantes

- **Temporal**: Este es almacenamiento temporal para desarrollo
- **Migración**: En producción migrar a:
  - AWS S3
  - Google Cloud Storage
  - Cloudinary
  - Base de datos (blob)
  - CDN dedicado
- **Limpieza**: Implementar garbage collection para fotos huérfanas
- **Backup**: Incluir `datos/` en backups regulares

## 🗂️ Gitignore

Se recomienda agregar a `.gitignore`:
```
datos/uploads/**/*.jpg
datos/uploads/**/*.jpeg
datos/uploads/**/*.png
datos/uploads/**/*.gif
```

Mantener solo `default/` en repositorio.
