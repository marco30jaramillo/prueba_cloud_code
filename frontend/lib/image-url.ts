export const getImageUrl = (photoPath: string | undefined): string => {
  if (!photoPath) {
    return getBaseUrl() + '/datos/default/default-avatar.svg';
  }

  if (photoPath.startsWith('http')) {
    return photoPath;
  }

  return getBaseUrl() + photoPath;
};

export const getBaseUrl = (): string => {
  // Lado del servidor
  if (typeof window === 'undefined') {
    return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
  }

  // Lado del cliente - detectar automáticamente
  const configuredUrl = process.env.NEXT_PUBLIC_API_URL;

  // Si está configurada una URL y no es localhost, usarla
  if (configuredUrl && !configuredUrl.includes('localhost')) {
    return configuredUrl;
  }

  // Detectar automáticamente basada en el hostname del navegador
  const backendPort = '3001';
  return `http://${window.location.hostname}:${backendPort}`;
};
