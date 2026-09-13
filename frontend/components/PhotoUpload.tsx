'use client';

import React, { useState, useRef } from 'react';
import { Form, Button, Alert, Spinner } from 'react-bootstrap';
import styles from './PhotoUpload.module.scss';

interface PhotoUploadProps {
  onPhotoChange: (photoUrl: string) => void;
  currentPhoto?: string;
  disabled?: boolean;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({
  onPhotoChange,
  currentPhoto = '/datos/default/default-avatar.svg',
  disabled = false
}) => {
  const [preview, setPreview] = useState(currentPhoto);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de archivo
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setMessage({ type: 'error', text: 'Solo se permiten imágenes JPG, PNG, GIF o WebP' });
      return;
    }

    // Validar tamaño (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: 'error', text: 'La imagen no puede superar 5MB' });
      return;
    }

    // Mostrar preview local
    const reader = new FileReader();
    reader.onload = (event) => {
      const imageUrl = event.target?.result as string;
      setPreview(imageUrl);
    };
    reader.readAsDataURL(file);

    // Subir archivo
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/upload/photo`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`
          },
          body: formData
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Error al subir la foto');
      }

      const data = await response.json();
      // La foto se guarda como: /datos/uploads/users/{filename}
      // Guardamos solo la ruta relativa, el frontend la construye cuando la necesita
      onPhotoChange(data.photo);
      setMessage({ type: 'success', text: '✅ Foto subida exitosamente' });

      // Actualizar preview con URL completa
      if (data.url) {
        setPreview(data.url);
      }
    } catch (error: any) {
      setMessage({ type: 'error', text: `⚠️ ${error.message}` });
      setPreview(currentPhoto);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.photoUpload}>
      {message && (
        <Alert
          variant={message.type === 'success' ? 'success' : 'danger'}
          onClose={() => setMessage(null)}
          dismissible
          className="mb-3"
        >
          {message.text}
        </Alert>
      )}

      <div className={styles.previewContainer}>
        <img src={preview} alt="Vista previa de foto" className={styles.preview} />
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <Spinner animation="border" size="sm" />
          </div>
        )}
      </div>

      <Form.Group className={styles.uploadGroup}>
        <Form.Control
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          disabled={disabled || isLoading}
          className={styles.fileInput}
          hidden
        />
        <Button
          variant="outline-primary"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || isLoading}
          className={styles.uploadBtn}
        >
          {isLoading ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Subiendo...
            </>
          ) : (
            <>
              📤 Cambiar Foto
            </>
          )}
        </Button>
      </Form.Group>

      <small className={styles.hint}>
        JPG, PNG, GIF o WebP • Máximo 5MB
      </small>
    </div>
  );
};
