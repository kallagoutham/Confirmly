import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://web:8000",
        changeOrigin: true,
      },
      "/admin": {
        target: "http://web:8000",
        changeOrigin: true,
      },
      "/api-auth": {
        target: "http://web:8000",
        changeOrigin: true,
      },
    },
  },
});
