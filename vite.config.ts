import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
// GitHub Pages 部署時請設 VITE_BASE_PATH=/你的repo名稱/（或留空則用 /）
export default defineConfig(({ mode }) => ({
  base: process.env.VITE_BASE_PATH ?? "/",
  server: {
    host: "::",
    port: 5173,
    allowedHosts: true,
    hmr: {
      overlay: false,
    },
    // ─── 雙後端分流 proxy ───
    // 核心指揮中心 API → port 3011（我們這端）
    // 社區 API → port 3009（小蔡那端）
    proxy: {
      // 社區 API 必須放在 /api 前面（更具體的路徑優先）
      "/api/community": {
        target: "http://localhost:3009",
        changeOrigin: true,
        rewrite: (p) => p.replace(/^\/api\/community/, "/api"),
      },
      "/api": {
        target: "http://localhost:3011",
        changeOrigin: true,
      },
      // 社區 WebSocket
      "/ws/community": {
        target: "ws://localhost:3009",
        ws: true,
        rewrite: (p) => p.replace(/^\/ws\/community/, "/ws"),
      },
      "/ws": {
        target: "ws://localhost:3011",
        ws: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-ui": ["@radix-ui/react-tooltip", "@radix-ui/react-dialog", "@radix-ui/react-slot", "lucide-react"],
          "vendor-query": ["@tanstack/react-query"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
