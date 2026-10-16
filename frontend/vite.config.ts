import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
    }),
    react(),
  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
        secure: false,
      },
    },
  },
  build: {
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            {
              name: "vendor-react",
              test: /[\\/]node_modules[\\/](react|react-dom|react-router-dom|scheduler)[\\/]/,
              priority: 50,
            },
            {
              name: "vendor-mui-material",
              test: /[\\/]node_modules[\\/]@mui[\\/]material[\\/]/,
              priority: 40,
            },
            {
              name: "vendor-mui-data-grid",
              test: /[\\/]node_modules[\\/]@mui[\\/]x-data-grid[\\/]/,
              priority: 30,
            },
            {
              name: "vendor-mui-date-pickers",
              test: /[\\/]node_modules[\\/]@mui[\\/]x-date-pickers[\\/]/,
              priority: 25,
            },
            {
              name: "vendor-mui-charts",
              test: /[\\/]node_modules[\\/]@mui[\\/]x-charts[\\/]/,
              priority: 20,
            },
          ],
        },
      },
    },
  },
});
