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
    port: 3009,
    hmr: {
      overlay: false,
    },
    // 開發時將 /api 轉發至後端（須與 .env 的 PORT 一致，預設 3011）
    proxy: {
      "/api": {
        target: "http://localhost:3011",
        changeOrigin: true,
      },
      "/ws": {
        target: "ws://localhost:3011",
        ws: true,
      },
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
