import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path"; // <-- Pastikan ini diimpor!

// Fungsi untuk mendapatkan __dirname di ES module
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
        secure: false,
      },
    },
  },

  resolve: {
    // Memberi tahu Vite untuk mencari node_modules di folder saat ini juga
    alias: {
      "~": path.resolve(__dirname, "./src"),
    },
    // Ini menyelesaikan masalah 'Duplikat React' dan resolusi umum:
    dedupe: ["react", "react-dom", "react-select", "chart.js"],

    // Memberi tahu Vite di mana mencari paket eksternal (WAJIB di monorepo)
    // Memberi tahu Vite di mana mencari paket eksternal (WAJIB di monorepo)
    modules: [path.resolve(__dirname, "node_modules")],
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/setupTests.js",
  },
});
