import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import wasm from "vite-plugin-wasm";

import "dotenv/config";

// https://vitejs.dev/config/
export default defineConfig({
  build: {
    target: "esnext",
  },
  esbuild: {
    target: "esnext",
  },
  plugins: [
    react(),
    wasm(),
    nodePolyfills({
      // Whether to polyfill `Buffer`.
      buffer: true,
    }),
  ],
  define: {
    "process.env.MAIN_SERVER": JSON.stringify(
      process.env.MAIN_SERVER || "http://localhost:3000"
    ),
  },
});
