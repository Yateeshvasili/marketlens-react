import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // "/" for local dev & Express; set BASE=/marketlens-react/ for the GitHub Pages build.
  base: process.env.BASE || "/",
  plugins: [react()],
  server: {
    // forward /api to the backend during `npm run dev`
    proxy: { "/api": "http://localhost:3000" },
  },
});
