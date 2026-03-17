import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { cpSync } from "node:fs";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    preact(),
    tailwindcss(),
    {
      name: "copy-assets",
      closeBundle() {
        cpSync("public/assets", "dist/assets", { recursive: true });
        cpSync("public/data", "dist/data", { recursive: true });
      },
    },
  ],
  root: "public",
  publicDir: false,
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/ws": {
        target: "ws://localhost:9598",
        ws: true,
      },
      "/api": {
        target: "http://localhost:9598",
        changeOrigin: true,
      },
      "/shell": {
        target: "ws://localhost:9598",
        ws: true,
      },
    },
  },
  preview: {
    port: 9599,
    host: true,
  },
});
