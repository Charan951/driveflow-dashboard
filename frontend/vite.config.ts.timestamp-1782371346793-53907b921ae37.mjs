// vite.config.ts
import { defineConfig, loadEnv } from "file:///C:/Users/Lenovo/OneDrive/Desktop/charan/frontend/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/Lenovo/OneDrive/Desktop/charan/frontend/node_modules/@vitejs/plugin-react-swc/index.js";
import compression from "file:///C:/Users/Lenovo/OneDrive/Desktop/charan/frontend/node_modules/vite-plugin-compression/dist/index.mjs";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///C:/Users/Lenovo/OneDrive/Desktop/charan/frontend/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_URL || env.VITE_API_URL || "http://127.0.0.1:5001";
  const proxyCommon = {
    target: proxyTarget,
    changeOrigin: true,
    secure: false,
    cookieDomainRewrite: "",
    cookiePathRewrite: "/"
  };
  return {
    base: "/",
    server: {
      host: "localhost",
      port: 8080,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin-allow-popups"
      },
      proxy: {
        "/uploads": {
          ...proxyCommon
        },
        "/api": {
          ...proxyCommon
        },
        "/socket.io": {
          ...proxyCommon,
          ws: true
        }
      },
      hmr: {
        overlay: false
      }
    },
    plugins: [
      react(),
      isProduction && {
        name: "defer-css",
        enforce: "post",
        transformIndexHtml(html) {
          return html.replace(/<link\s+([^>]*?rel="stylesheet"[^>]*?)>/g, (match) => {
            const preloaded = match.replace(/rel="stylesheet"/, 'rel="preload" as="style"').replace(/>$/, ` onload="this.onload=null;this.rel='stylesheet'">`);
            return `${preloaded}
    <noscript>${match}</noscript>`;
          });
        }
      },
      isProduction && compression({
        algorithm: "gzip",
        ext: ".gz",
        threshold: 10240,
        deleteOriginFile: false
      }),
      isProduction && compression({
        algorithm: "brotliCompress",
        ext: ".br",
        threshold: 10240,
        deleteOriginFile: false
      })
    ].filter(Boolean),
    build: {
      outDir: "dist",
      assetsDir: "assets",
      sourcemap: true,
      cssCodeSplit: true,
      minify: "esbuild",
      chunkSizeWarningLimit: 1e3,
      target: "es2020",
      modulePreload: {
        polyfill: false
      },
      reportCompressedSize: true,
      emptyOutDir: true,
      rollupOptions: {
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: "assets/[name]-[hash].js",
          assetFileNames: "assets/[name]-[hash].[ext]",
          manualChunks(id) {
            if (id.includes("node_modules")) {
              const normalizedId = id.replace(/\\/g, "/");
              if (normalizedId.includes("node_modules/lucide-react")) {
                return "vendor-lucide";
              }
              if (normalizedId.includes("node_modules/react/") || normalizedId.includes("node_modules/react-dom/") || normalizedId.includes("node_modules/react-router/") || normalizedId.includes("node_modules/react-router-dom/") || normalizedId.includes("node_modules/@tanstack/react-query/") || normalizedId.includes("node_modules/axios/") || normalizedId.includes("node_modules/zustand/")) {
                return "vendor-core";
              }
            }
          }
        }
      }
    },
    esbuild: {
      legalComments: "none",
      drop: isProduction ? ["console", "debugger"] : [],
      pure: isProduction ? ["console.log", "console.info", "console.debug", "console.warn"] : [],
      treeShaking: true
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    optimizeDeps: {
      include: ["react", "react-dom", "react-router-dom", "lucide-react", "clsx", "tailwind-merge"],
      exclude: [],
      esbuildOptions: {
        treeShaking: true
      }
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMZW5vdm9cXFxcT25lRHJpdmVcXFxcRGVza3RvcFxcXFxjaGFyYW5cXFxcZnJvbnRlbmRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXExlbm92b1xcXFxPbmVEcml2ZVxcXFxEZXNrdG9wXFxcXGNoYXJhblxcXFxmcm9udGVuZFxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTGVub3ZvL09uZURyaXZlL0Rlc2t0b3AvY2hhcmFuL2Zyb250ZW5kL3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnLCBsb2FkRW52IH0gZnJvbSBcInZpdGVcIjtcclxuaW1wb3J0IHJlYWN0IGZyb20gXCJAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2NcIjtcclxuaW1wb3J0IGNvbXByZXNzaW9uIGZyb20gJ3ZpdGUtcGx1Z2luLWNvbXByZXNzaW9uJztcclxuaW1wb3J0IHBhdGggZnJvbSBcInBhdGhcIjtcclxuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gXCJ1cmxcIjtcclxuXHJcbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpO1xyXG5cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xyXG4gIGNvbnN0IGlzUHJvZHVjdGlvbiA9IG1vZGUgPT09ICdwcm9kdWN0aW9uJztcclxuICBjb25zdCBlbnYgPSBsb2FkRW52KG1vZGUsIHByb2Nlc3MuY3dkKCksICcnKTtcclxuICBjb25zdCBwcm94eVRhcmdldCA9IGVudi5WSVRFX0FQSV9VUkwgfHwgZW52LlZJVEVfQVBJX1VSTCB8fCAnaHR0cDovLzEyNy4wLjAuMTo1MDAxJztcclxuXHJcbiAgY29uc3QgcHJveHlDb21tb24gPSB7XHJcbiAgICB0YXJnZXQ6IHByb3h5VGFyZ2V0LFxyXG4gICAgY2hhbmdlT3JpZ2luOiB0cnVlLFxyXG4gICAgc2VjdXJlOiBmYWxzZSxcclxuICAgIGNvb2tpZURvbWFpblJld3JpdGU6ICcnLFxyXG4gICAgY29va2llUGF0aFJld3JpdGU6ICcvJyxcclxuICB9O1xyXG4gIFxyXG4gIHJldHVybiB7XHJcbiAgICBiYXNlOiAnLycsXHJcbiAgICBzZXJ2ZXI6IHtcclxuICAgICAgaG9zdDogXCJsb2NhbGhvc3RcIixcclxuICAgICAgcG9ydDogODA4MCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDcm9zcy1PcmlnaW4tT3BlbmVyLVBvbGljeSc6ICdzYW1lLW9yaWdpbi1hbGxvdy1wb3B1cHMnLFxyXG4gICAgICB9LFxyXG4gICAgICBwcm94eToge1xyXG4gICAgICAgICcvdXBsb2Fkcyc6IHtcclxuICAgICAgICAgIC4uLnByb3h5Q29tbW9uLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgJy9hcGknOiB7XHJcbiAgICAgICAgICAuLi5wcm94eUNvbW1vbixcclxuICAgICAgICB9LFxyXG4gICAgICAgICcvc29ja2V0LmlvJzoge1xyXG4gICAgICAgICAgLi4ucHJveHlDb21tb24sXHJcbiAgICAgICAgICB3czogdHJ1ZSxcclxuICAgICAgICB9XHJcbiAgICAgIH0sXHJcbiAgICAgIGhtcjoge1xyXG4gICAgICAgIG92ZXJsYXk6IGZhbHNlLFxyXG4gICAgICB9LFxyXG4gICAgfSxcclxuICAgIHBsdWdpbnM6IFtcclxuICAgICAgcmVhY3QoKSxcclxuICAgICAgaXNQcm9kdWN0aW9uICYmIHtcclxuICAgICAgICBuYW1lOiAnZGVmZXItY3NzJyxcclxuICAgICAgICBlbmZvcmNlOiAncG9zdCcgYXMgY29uc3QsXHJcbiAgICAgICAgdHJhbnNmb3JtSW5kZXhIdG1sKGh0bWw6IHN0cmluZykge1xyXG4gICAgICAgICAgcmV0dXJuIGh0bWwucmVwbGFjZSgvPGxpbmtcXHMrKFtePl0qP3JlbD1cInN0eWxlc2hlZXRcIltePl0qPyk+L2csIChtYXRjaCkgPT4ge1xyXG4gICAgICAgICAgICBjb25zdCBwcmVsb2FkZWQgPSBtYXRjaFxyXG4gICAgICAgICAgICAgIC5yZXBsYWNlKC9yZWw9XCJzdHlsZXNoZWV0XCIvLCAncmVsPVwicHJlbG9hZFwiIGFzPVwic3R5bGVcIicpXHJcbiAgICAgICAgICAgICAgLnJlcGxhY2UoLz4kLywgJyBvbmxvYWQ9XCJ0aGlzLm9ubG9hZD1udWxsO3RoaXMucmVsPVxcJ3N0eWxlc2hlZXRcXCdcIj4nKTtcclxuICAgICAgICAgICAgcmV0dXJuIGAke3ByZWxvYWRlZH1cXG4gICAgPG5vc2NyaXB0PiR7bWF0Y2h9PC9ub3NjcmlwdD5gO1xyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICB9LFxyXG4gICAgICBpc1Byb2R1Y3Rpb24gJiYgY29tcHJlc3Npb24oe1xyXG4gICAgICAgIGFsZ29yaXRobTogJ2d6aXAnLFxyXG4gICAgICAgIGV4dDogJy5neicsXHJcbiAgICAgICAgdGhyZXNob2xkOiAxMDI0MCxcclxuICAgICAgICBkZWxldGVPcmlnaW5GaWxlOiBmYWxzZSxcclxuICAgICAgfSksXHJcbiAgICAgIGlzUHJvZHVjdGlvbiAmJiBjb21wcmVzc2lvbih7XHJcbiAgICAgICAgYWxnb3JpdGhtOiAnYnJvdGxpQ29tcHJlc3MnLFxyXG4gICAgICAgIGV4dDogJy5icicsXHJcbiAgICAgICAgdGhyZXNob2xkOiAxMDI0MCxcclxuICAgICAgICBkZWxldGVPcmlnaW5GaWxlOiBmYWxzZSxcclxuICAgICAgfSksXHJcbiAgICBdLmZpbHRlcihCb29sZWFuKSxcclxuICAgIGJ1aWxkOiB7XHJcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxyXG4gICAgICBhc3NldHNEaXI6ICdhc3NldHMnLFxyXG4gICAgICBzb3VyY2VtYXA6IHRydWUsXHJcbiAgICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICAgICAgbWluaWZ5OiAnZXNidWlsZCcsXHJcbiAgICAgIGNodW5rU2l6ZVdhcm5pbmdMaW1pdDogMTAwMCxcclxuICAgICAgdGFyZ2V0OiAnZXMyMDIwJyxcclxuICAgICAgbW9kdWxlUHJlbG9hZDoge1xyXG4gICAgICAgIHBvbHlmaWxsOiBmYWxzZSxcclxuICAgICAgfSxcclxuICAgICAgcmVwb3J0Q29tcHJlc3NlZFNpemU6IHRydWUsXHJcbiAgICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxyXG4gICAgICByb2xsdXBPcHRpb25zOiB7XHJcbiAgICAgICAgb3V0cHV0OiB7XHJcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9bbmFtZV0tW2hhc2hdLmpzJyxcclxuICAgICAgICAgIGNodW5rRmlsZU5hbWVzOiAnYXNzZXRzL1tuYW1lXS1baGFzaF0uanMnLFxyXG4gICAgICAgICAgYXNzZXRGaWxlTmFtZXM6ICdhc3NldHMvW25hbWVdLVtoYXNoXS5bZXh0XScsXHJcbiAgICAgICAgICBtYW51YWxDaHVua3MoaWQpIHtcclxuICAgICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMnKSkge1xyXG4gICAgICAgICAgICAgIGNvbnN0IG5vcm1hbGl6ZWRJZCA9IGlkLnJlcGxhY2UoL1xcXFwvZywgJy8nKTtcclxuICAgICAgICAgICAgICBpZiAobm9ybWFsaXplZElkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvbHVjaWRlLXJlYWN0JykpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiAndmVuZG9yLWx1Y2lkZSc7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgIGlmIChcclxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LycpIHx8XHJcbiAgICAgICAgICAgICAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9yZWFjdC1kb20vJykgfHxcclxuICAgICAgICAgICAgICAgIG5vcm1hbGl6ZWRJZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LXJvdXRlci8nKSB8fFxyXG4gICAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVhY3Qtcm91dGVyLWRvbS8nKSB8fFxyXG4gICAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQHRhbnN0YWNrL3JlYWN0LXF1ZXJ5LycpIHx8XHJcbiAgICAgICAgICAgICAgICBub3JtYWxpemVkSWQuaW5jbHVkZXMoJ25vZGVfbW9kdWxlcy9heGlvcy8nKSB8fFxyXG4gICAgICAgICAgICAgICAgbm9ybWFsaXplZElkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvenVzdGFuZC8nKVxyXG4gICAgICAgICAgICAgICkge1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuICd2ZW5kb3ItY29yZSc7XHJcbiAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH0sXHJcbiAgICBlc2J1aWxkOiB7XHJcbiAgICAgIGxlZ2FsQ29tbWVudHM6ICdub25lJyxcclxuICAgICAgZHJvcDogaXNQcm9kdWN0aW9uID8gWydjb25zb2xlJywgJ2RlYnVnZ2VyJ10gOiBbXSxcclxuICAgICAgcHVyZTogaXNQcm9kdWN0aW9uID8gWydjb25zb2xlLmxvZycsICdjb25zb2xlLmluZm8nLCAnY29uc29sZS5kZWJ1ZycsICdjb25zb2xlLndhcm4nXSA6IFtdLFxyXG4gICAgICB0cmVlU2hha2luZzogdHJ1ZSxcclxuICAgIH0sXHJcbiAgICByZXNvbHZlOiB7XHJcbiAgICAgIGFsaWFzOiB7XHJcbiAgICAgICAgXCJAXCI6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsIFwiLi9zcmNcIiksXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gICAgb3B0aW1pemVEZXBzOiB7XHJcbiAgICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJywgJ3JlYWN0LXJvdXRlci1kb20nLCAnbHVjaWRlLXJlYWN0JywgJ2Nsc3gnLCAndGFpbHdpbmQtbWVyZ2UnXSxcclxuICAgICAgZXhjbHVkZTogW10sXHJcbiAgICAgIGVzYnVpbGRPcHRpb25zOiB7XHJcbiAgICAgICAgdHJlZVNoYWtpbmc6IHRydWUsXHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIH07XHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQWdWLFNBQVMsY0FBYyxlQUFlO0FBQ3RYLE9BQU8sV0FBVztBQUNsQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFVBQVU7QUFDakIsU0FBUyxxQkFBcUI7QUFKdUwsSUFBTSwyQ0FBMkM7QUFNdFEsSUFBTSxZQUFZLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFFN0QsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsUUFBTSxlQUFlLFNBQVM7QUFDOUIsUUFBTSxNQUFNLFFBQVEsTUFBTSxRQUFRLElBQUksR0FBRyxFQUFFO0FBQzNDLFFBQU0sY0FBYyxJQUFJLGdCQUFnQixJQUFJLGdCQUFnQjtBQUU1RCxRQUFNLGNBQWM7QUFBQSxJQUNsQixRQUFRO0FBQUEsSUFDUixjQUFjO0FBQUEsSUFDZCxRQUFRO0FBQUEsSUFDUixxQkFBcUI7QUFBQSxJQUNyQixtQkFBbUI7QUFBQSxFQUNyQjtBQUVBLFNBQU87QUFBQSxJQUNMLE1BQU07QUFBQSxJQUNOLFFBQVE7QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLE1BQU07QUFBQSxNQUNOLFNBQVM7QUFBQSxRQUNQLDhCQUE4QjtBQUFBLE1BQ2hDO0FBQUEsTUFDQSxPQUFPO0FBQUEsUUFDTCxZQUFZO0FBQUEsVUFDVixHQUFHO0FBQUEsUUFDTDtBQUFBLFFBQ0EsUUFBUTtB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
