import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const entryInjector = {
  name: "zero-lvgl-entry",
  transformIndexHtml: {
    order: "pre",
    handler() {
      return [{
        tag: "script",
        attrs: { type: "module", src: "/src/main.tsx" },
        injectTo: "body",
      }];
    },
  },
};

export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react(), entryInjector],
  server: {
    host: "0.0.0.0",
    port: Number(process.env.PORT || 5173),
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port: Number(process.env.PORT || 4173),
    strictPort: true,
  },
});
