import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import legacy from '@vitejs/plugin-legacy';
import compression from 'vite-plugin-compression';
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production';
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    base: '/',
    server: {
      host: "::",
      port: 8080,
      headers: {
        'Cross-Origin-Opener-Policy': 'same-origin-allow-popups',
      },
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
      legacy({
        targets: ['defaults', 'not IE 11'],
      }),
      // Enable compression for production builds
      isProduction && compression({
        algorithm: 'gzip',
        ext: '.gz',
      }),
      isProduction && compression({
        algorithm: 'brotliCompress',
        ext: '.br',
      }),
    ].filter(Boolean),
    build: {
      outDir: 'dist',
      assetsDir: 'assets',
      sourcemap: false,
      cssCodeSplit: true,
      minify: 'esbuild',
      chunkSizeWarningLimit: 800, // Slightly more aggressive limit
      target: 'esnext', // Target modern browsers for the main build
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules')) {
              // React and related core libs
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'vendor-core';
              }
              // Large UI/Animation libs
              if (id.includes('framer-motion') || id.includes('lucide-react') || id.includes('@radix-ui')) {
                return 'vendor-ui';
              }
              // Firebase
              if (id.includes('firebase')) {
                return 'vendor-firebase';
              }
              // Maps and Charts
              if (id.includes('leaflet') || id.includes('recharts')) {
                return 'vendor-visuals';
              }
              // Other node_modules
              return 'vendor';
            }
          },
          // Ensure predictable names for chunks
          entryFileNames: `assets/[name]-[hash].js`,
          chunkFileNames: `assets/[name]-[hash].js`,
          assetFileNames: `assets/[name]-[hash].[ext]`,
        },
      },
    },
    esbuild: {
      legalComments: 'none',
      drop: isProduction ? ['console', 'debugger'] : [],
      // Pure functions to help tree-shaking
      pure: isProduction ? ['console.log', 'console.info', 'console.debug', 'console.warn'] : [],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    // Optimize dependency pre-bundling
    optimizeDeps: {
      include: ['react', 'react-dom', 'react-router-dom', 'lucide-react'],
    },
  };
});
