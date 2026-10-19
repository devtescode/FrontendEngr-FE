
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],

  // Remove console statements and debugger in production builds
  esbuild: {
    drop: process.env.NODE_ENV === "production"
      ? ["console", "debugger"]
      : [],
  },

  build: {
    outDir: "dist",
  },

  server: {
    port: 5173,
  },
});
