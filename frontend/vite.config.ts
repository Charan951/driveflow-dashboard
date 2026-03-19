import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import compression from 'vite-plugin-compression';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  return {
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
      compression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      compression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'vendor-react': ['react', 'react-dom', 'react-router-dom'],
            'vendor-ui': ['lucide-react', 'framer-motion', '@radix-ui/react-accordion', '@radix-ui/react-alert-dialog'],
            'vendor-charts': ['recharts'],
            'vendor-maps': ['leaflet', 'react-leaflet'],
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      minify: 'esbuild',
    },
    esbuild: {
      drop: mode === 'production' ? ['console', 'debugger'] : [],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
