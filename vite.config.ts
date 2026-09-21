import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackRouter } from "@tanstack/router-plugin/vite";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// Static SPA build (NO SSR). `vite build` → dist/ (index.html + assets/*).
// dist/ is what we upload to GCS (preview) / R2 (publish). No server runs.
//
// `base: "./"` — emit RELATIVE asset paths (`./assets/*`) instead of the
// default absolute `/assets/*`. The in-chat preview serves the built tree
// from a per-turn Cloud Storage prefix (`…/site/index.html`); with relative
// paths the assets resolve against that prefix, with absolute paths they'd
// point at the bucket root and the preview would render blank. The home
// page renders correctly this way; deep client-side routes only resolve when
// the site is served from a path root (the publish/R2 path sets its own base).
export default defineConfig({
  base: "./",
  plugins: [
    tanstackRouter({ target: "react", autoCodeSplitting: true }), // file-based routes → routeTree.gen.ts
    react(),
    tailwindcss(),
  ],
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
});
