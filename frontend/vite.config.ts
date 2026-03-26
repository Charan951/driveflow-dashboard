import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
    base: '/',
    server: {
      host: "::",
      port: 8080,
      proxy: {
        '/uploads': env.VITE_API_URL || 'http://localhost:5000',
        '/api': env.VITE_API_URL || 'http://localhost:5000'
      },
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
    ],
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      cssCodeSplit: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react')) return 'vendor-react';
              if (id.includes('lucide') || id.includes('framer-motion') || id.includes('@radix-ui')) return 'vendor-ui';
              if (id.includes('recharts')) return 'vendor-charts';
              if (id.includes('leaflet')) return 'vendor-maps';
              return 'vendor';
            }
          }
        },
      },
    },
    esbuild: {
      legalComments: 'none',
      treeShaking: true,
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
