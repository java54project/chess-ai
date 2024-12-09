import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        VitePWA({
            workbox: {
                globPatterns: ["**/*"],
                maximumFileSizeToCacheInBytes: 5000000
            },
            includeAssets: [
                "**/*",
            ],
            manifest: {
                "name": "Chess Academy",
                "short_name": "Chess Academy",
                "start_url": ".",
                "theme_color": "#ffffff",
                "background_color": "#ffffff",
                "display": "standalone"
            }
        })
    ],
    build: {
        sourcemap: true, // Enable source maps for debugging
        chunkSizeWarningLimit: 2000, // Handle warning on vendor.js bundle size
    },
});
