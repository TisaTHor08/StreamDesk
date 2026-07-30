import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

const SERVER_TARGET = process.env.VITE_SERVER_URL ?? "http://localhost:8080";
const WS_TARGET = process.env.VITE_SERVER_WS_URL ?? "ws://localhost:8080";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "StreamDesk",
        short_name: "StreamDesk",
        description: "Surface de contrôle tactile modulaire, open source.",
        theme_color: "#101114",
        background_color: "#101114",
        display: "fullscreen",
        orientation: "any",
        start_url: "/",
        icons: [{ src: "favicon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
      },
      workbox: {
        // Never cache API/WebSocket traffic; only the app shell is precached.
        navigateFallbackDenylist: [/^\/api/, /^\/ws/],
      },
    }),
  ],
  server: {
    port: 5173,
    // Listen on all network interfaces, not just localhost — otherwise a
    // phone/tablet on the same LAN can never reach the dev server at all,
    // no matter what address the QR code / pairing link points to.
    host: true,
    proxy: {
      "/api": { target: SERVER_TARGET, changeOrigin: true },
      "/ws": { target: WS_TARGET, ws: true },
    },
  },
  build: {
    outDir: "dist",
  },
});
