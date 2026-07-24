import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";

/**
 * Generic SPA fallback: serve index.html for any GET that wants HTML and is not
 * a real static asset. The app mounts ~20 sub-apps under arbitrary first
 * segments (/copilot, /jira, /azure, …) with deep, ever-changing sub-paths, so
 * an allow-list would be brittle — instead we fall back everything that isn't an
 * asset request. Vite's own module/asset requests (/@…, /src, /node_modules,
 * /assets) and anything with a static file extension are left alone.
 */
const ASSET_EXT =
  /\.(?:js|mjs|cjs|ts|tsx|jsx|css|map|json|png|jpe?g|gif|svg|ico|webp|avif|woff2?|ttf|eot|wasm|txt|xml|webmanifest)$/i;

function isAssetPath(path: string): boolean {
  return (
    path.startsWith("/@") ||
    path.startsWith("/src/") ||
    path.startsWith("/node_modules/") ||
    path.startsWith("/assets/") ||
    ASSET_EXT.test(path)
  );
}

// Params typed loosely so this needs no @types/node to compile on a clean install.
const spaFallback = (req: any, _res: any, next: () => void): void => {
  const accept: string = (req.headers && req.headers.accept) || "";
  if (req.method === "GET" && accept.includes("text/html") && req.url) {
    const path = String(req.url).split("?")[0];
    if (!isAssetPath(path)) req.url = "/";
  }
  next();
};

function spaFallbackPlugin(): PluginOption {
  return {
    name: "intranet-spa-fallback",
    configureServer(server) {
      server.middlewares.use(spaFallback);
    },
    configurePreviewServer(server) {
      server.middlewares.use(spaFallback);
    },
  };
}

// For GitHub Pages project sites the app is served under /<repo>/, so set
// VITE_BASE (e.g. VITE_BASE=/Extension_Testing_Suite/). Defaults to "/" for
// localhost / serve-ports. Read without @types/node via a globalThis cast.
const base =
  (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env
    ?.VITE_BASE || "/";

export default defineConfig({
  base,
  plugins: [react(), spaFallbackPlugin()],
  server: { host: true, port: 5173, strictPort: true },
  preview: { host: true, port: 5173, strictPort: true },
});
