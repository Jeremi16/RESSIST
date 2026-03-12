/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
    ],
  },
  // External packages that shouldn't be bundled
  serverExternalPackages: ['@whiskeysockets/baileys', '@hapi/boom', 'sharp'],
}

module.exports = nextConfig
