import { tanstackRouter } from "@tanstack/router-plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { resolve } from "node:path";
import { defineConfig } from "vite";
import tsConfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  server: {
    port: 3000,
    host: "localhost",
    hmr: {
      overlay: true,
    },
    watch: {
      usePolling: false,
    },

    // these are the proxy routes that will be forwarded to your **BFF**
    proxy: {
      "/bff": {
        target: "http://localhost:3118",
        secure: false,
      },
      "/signin-oidc": {
        target: "http://localhost:3118",
        secure: false,
      },
      "/signout-callback-oidc": {
        target: "http://localhost:3118",
        secure: false,
      },
      "/api": {
        target: "http://localhost:3118",
        secure: false,
      },
    },
  },
  plugins: [
    tanstackRouter({ autoCodeSplitting: true }),
    viteReact(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
  ],
  resolve: {
    alias: {
      "~": resolve(__dirname, "./src"),
    },
  },
});
