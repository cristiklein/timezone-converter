import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from "vite-plugin-pwa";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "Time Zone Converter",
        short_name: "TimeZ",
        description: "Quickly compare times across world time zones",
        theme_color: "#111111",
        background_color: "#000000",
        display: "standalone",
        start_url: "./",
        icons: [{
          "src": "favicon.svg",
          "sizes": "512x512",
          "type": "image/svg+xml"
        }],
      },
    }),
  ],
  base: "/timezone-converter/",
})
