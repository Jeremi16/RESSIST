import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";

// Vite + Bun frontend (Opsi A).
// - SPA di dist/ (deploy Vercel static CDN)
// - /api/* di dev di-proxy ke Hono BFF (bun run server/index.ts, port 3001)
// - di prod Vercel rewrite /api/* -> api/index.ts (Vercel Functions, Node runtime)
export default defineConfig({
  plugins: [react(), tailwindcss(), tsconfigPaths()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 4173,
  },
  optimizeDeps: {
    // Server-only native/bundling-external — jangan di-prebundle Vite
    exclude: ["sharp", "@whiskeysockets/baileys"],
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
