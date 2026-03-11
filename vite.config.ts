import { defineConfig } from "vite";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact(), tailwindcss()],
  root: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/ws": {
        target: "ws://localhost:9511",
        ws: true,
      },
      "/api": {
        target: "http://localhost:9511",
        changeOrigin: true,
      },
    },
  },
  preview: {
    port: 9599,
    host: true,
  },
});
