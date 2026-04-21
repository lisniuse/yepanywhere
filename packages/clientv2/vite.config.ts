import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

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
  },
});
