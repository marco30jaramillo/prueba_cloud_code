/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Build autocontenida (.next/standalone): server.js y solo las dependencias que usa. Es lo que
  // se sube a Azure App Service (ver desplegar-release.yml), no la carpeta completa.
  output: 'standalone',
  swcMinify: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '*.blob.core.windows.net' },
      { protocol: 'https', hostname: '*.azurewebsites.net' },
      { protocol: 'http', hostname: 'localhost' },
    ],
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'Access-Control-Allow-Origin', value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET,OPTIONS,PATCH,DELETE,POST,PUT' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, Authorization' },
        ],
      },
      {
        // Los enlaces de activación y de recuperación llevan un token en la URL: no debe viajar en
        // Referer ni quedar en caché.
        source: '/:ruta(activar|reset-password)',
        headers: [
          { key: 'Referrer-Policy', value: 'no-referrer' },
          { key: 'Cache-Control', value: 'no-store' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
