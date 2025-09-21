/// <reference types="vitest" />
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/

export default defineConfig(({ mode }) => {
  // Load env (VITE_*) for both server and client usage
  const env = loadEnv(mode, process.cwd(), "");

  // Frontend dev server port (default 8080). Enforce strict port to avoid auto-increment.
  const frontendPort = Number(env.VITE_FRONTEND_PORT || 8080);

  // Backend API base URL for proxy (required)
  const backendApiBase = env.VITE_API_BASE_URL;
  if (!backendApiBase) {
    throw new Error('VITE_API_BASE_URL is required for proxy. Set it in Frontend/.env');
  }

  return {
    server: {
      host: "::",
      port: frontendPort,
      strictPort: true,
      allowedHosts: [
        "localhost",
        "5235-2401-4900-88b8-37f2-c0c-fb9c-8aaf-9592.ngrok-free.app",
        "53f396a077dd.ngrok-free.app",
      ],
      proxy: {
        '/api': {
          target: backendApiBase,
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    define: {
      global: 'globalThis',
      'process.env': {},
    },
    optimizeDeps: {
      include: ['@stackframe/stack'],
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      css: true,
    },
  };
});
