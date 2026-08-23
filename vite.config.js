import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Yandex Games hosts the game from a CDN sub-path, so every asset URL
  // in the built index.html must be RELATIVE (./assets/...) — with the
  // default "/" base the bundle 404s on the platform and the SDK never
  // initializes (moderation rejects it as "SDK not integrated").
  base: "./",
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    hmr: {
      port: 3000,
    },
  },
});
