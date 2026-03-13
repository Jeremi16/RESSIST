/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // External packages that shouldn't be bundled
  serverExternalPackages: ["@whiskeysockets/baileys", "@hapi/boom", "sharp"],
  // Prevent deployment failures on constrained builders; run type checks separately in CI/local.
  typescript: {
    ignoreBuildErrors: true,
  },
};

module.exports = nextConfig;
