/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'
  },
  experimental: {
    allowedDevOrigins: [
      'localhost',
      '127.0.0.1',
      '192.168.0.0/16',
      '10.0.0.0/8'
    ]
  }
};

module.exports = nextConfig;
