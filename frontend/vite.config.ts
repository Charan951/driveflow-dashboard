import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import compression from 'vite-plugin-compression';
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/',
    server: {
      host: "localhost",
      port: 8080,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
      proxy: {
        '/uploads': {
          target: env.VITE_API_URL || 'http://127.0.0.1:5001',
          changeOrigin: true,
          secure: false,
        },
        '/api': {
          target: env.VITE_API_URL || 'http://127.0.0.1:5001',
          changeOrigin: true,
          secure: false,
        },
        '/socket.io': {
          target: env.VITE_API_URL || 'http://127.0.0.1:5001',
          ws: true,
          changeOrigin: true,
          secure: false,
        }
      },
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      isProduction && compression({
        algorithm: 'gzip',
        ext: '.gz',
        threshold: 10240,
        deleteOriginFile: false,
      }),
      isProduction && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
        threshold: 10240,
        deleteOriginFile: false,
      }),
    ].filter(Boolean),
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      cssCodeSplit: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 1000,
      target: 'es2020',
      modulePreload: {
        polyfill: false,
      },
      reportCompressedSize: true,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: 'assets/[name]-[hash].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash].[ext]',
          manualChunks(id) {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-react';
              }
              if (id.includes('@radix-ui') || id.includes('lucide-react') || id.includes('framer-motion')) {
                return 'vendor-ui';
              }
              if (id.includes('@tanstack') || id.includes('axios') || id.includes('zustand')) {
                return 'vendor-utils';
              }
              if (id.includes('recharts') || id.includes('d3')) {
                return 'vendor-charts';
              }
              if (id.includes('leaflet') || id.includes('react-leaflet')) {
                return 'vendor-maps';
              }
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              return 'vendor'; // Fallback for other node_modules
            }
          }
        },
      },
    },
    esbuild: {
      legalComments: 'none',
      drop: isProduction ? ['console', 'debugger'] : [],
      pure: isProduction ? ['console.log', 'console.info', 'console.debug', 'console.warn'] : [],
      treeShaking: true,
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'lucide-react', 'clsx', 'tailwind-merge'],
      exclude: [],
      esbuildOptions: {
        treeShaking: true,
      },
    },
  };
});
