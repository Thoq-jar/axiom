import { defineConfig } from "vite";
import preact from "@preact/preset-vite";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [preact()],
  root: "public",
  build: {
    outDir: "../dist",
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      "/ws": {
        target: "ws://localhost:8000",
        ws: true,
        configure: (proxy, _options) => {
          // deno-lint-ignore no-explicit-any
          const originalOn = (proxy as any).on.bind(proxy);
          // deno-lint-ignore no-explicit-any
          (proxy as any).on = (event: string, listener: any) => {
            if (event === "error") {
              // deno-lint-ignore no-explicit-any
              const newListener = (
                err: any,
                req: any,
                res: any,
                target: any,
              ) => {
                const errStr = String(err?.message || err?.name || err);
                if (
                  errStr.includes("AbortError") ||
                  errStr.toLowerCase().includes("cancel") ||
                  err?.code === "ECONNRESET"
                ) {
                  return; // Suppress Vite's logging for these errors
                }
                return listener(err, req, res, target);
              };
              return originalOn(event, newListener);
            }
            return originalOn(event, listener);
          };
        },
      },
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        configure: (proxy, _options) => {
          // deno-lint-ignore no-explicit-any
          const originalOn = (proxy as any).on.bind(proxy);
          // deno-lint-ignore no-explicit-any
          (proxy as any).on = (event: string, listener: any) => {
            if (event === "error") {
              // deno-lint-ignore no-explicit-any
              const newListener = (
                err: any,
                req: any,
                res: any,
                target: any,
              ) => {
                const errStr = String(err?.message || err?.name || err);
                if (
                  errStr.includes("AbortError") ||
                  errStr.toLowerCase().includes("cancel") ||
                  err?.code === "ECONNRESET"
                ) {
                  return; // Suppress Vite's logging for these errors
                }
                return listener(err, req, res, target);
              };
              return originalOn(event, newListener);
            }
            return originalOn(event, listener);
          };
        },
      },
    },
  },
});
