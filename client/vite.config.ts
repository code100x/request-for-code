import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import wasm from "vite-plugin-wasm";
import { nodePolyfills } from "vite-plugin-node-polyfills";

const alias = {
  "@": path.resolve(__dirname, "./src"),
};

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), wasm(), nodePolyfills()],
  resolve: {
    alias,
  },
  build: {
    target: "esnext",
  },
});
