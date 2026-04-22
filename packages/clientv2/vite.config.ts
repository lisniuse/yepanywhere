import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const basePort = process.env.PORT
  ? Number.parseInt(process.env.PORT, 10)
  : 3400;

const vitePort = process.env.CLIENTV2_PORT
  ? Number.parseInt(process.env.CLIENTV2_PORT, 10)
  : 3502;

const viteHost = process.env.VITE_HOST === "true" ? true : undefined;

export default defineConfig({
  clearScreen: false,
  plugins: [react()],
  resolve: {
    conditions: ["source"],
  },
  server: {
    port: vitePort,
    host: viteHost,
    proxy: {
      "/api": {
        target: `http://127.0.0.1:${basePort}`,
        changeOrigin: false,
      },
      "/health": {
        target: `http://127.0.0.1:${basePort}`,
        changeOrigin: false,
      },
    },
  },
});
