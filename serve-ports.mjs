// Serve the built SPA on many ports: portal on 5173, each sub-app on its own
// port (5174, 5175, …) so every sub-app is a DISTINCT ORIGIN a capture agent
// registers as a separate application. One process, many listeners, zero dependencies.
//
//   npm run build          # produce dist/
//   node serve-ports.mjs   # portal :5173, sub-apps :5174+
//
// (TCP ports max at 65535, so 5173+2 digits like 517301 is invalid — we use
//  consecutive real ports instead.)
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = join(__dirname, "dist");
const REG = join(__dirname, "src", "apps", "registry.ts");

if (!existsSync(DIST)) {
  console.error("dist/ not found — run `npm run build` first.");
  process.exit(1);
}

// ordered app ids, parsed from the registry so ports never drift
const ids = [...readFileSync(REG, "utf8").matchAll(/\{\s*id:\s*"([^"]+)"/g)].map((m) => m[1]);

const PORTAL = 5173;
// index.html with the multi-port flag injected → app opens sub-apps on their ports
const INDEX_HTML = readFileSync(join(DIST, "index.html"), "utf8").replace(
  "</head>",
  `<script>window.__MULTIPORT__=true;window.__PORTAL_PORT__=${PORTAL};</script></head>`,
);

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".map": "application/json",
};

function serve(req, res, rootApp) {
  const urlPath = decodeURIComponent((req.url || "/").split("?")[0]);
  if (rootApp && urlPath === "/") {
    res.writeHead(302, { Location: "/" + rootApp });
    res.end();
    return;
  }
  const filePath = normalize(join(DIST, urlPath));
  if (!filePath.startsWith(DIST)) {
    res.writeHead(403);
    res.end();
    return;
  }
  if (existsSync(filePath) && statSync(filePath).isFile() && !filePath.endsWith("index.html")) {
    res.writeHead(200, { "Content-Type": MIME[extname(filePath)] || "application/octet-stream" });
    res.end(readFileSync(filePath));
    return;
  }
  res.writeHead(200, { "Content-Type": "text/html" }); // SPA fallback (with multi-port flag)
  res.end(INDEX_HTML);
}

http.createServer((req, res) => serve(req, res, null)).listen(PORTAL, () =>
  console.log(`portal        http://localhost:${PORTAL}/`),
);
ids.forEach((id, i) => {
  const port = 5174 + i;
  http.createServer((req, res) => serve(req, res, id)).listen(port, () =>
    console.log(`${id.padEnd(13)} http://localhost:${port}/`),
  );
});
console.log(`\n${ids.length} sub-apps on ports 5174–${5174 + ids.length - 1}, portal on ${PORTAL}.`);
console.log("Point your capture agent / driver at each port (each is a separate app origin).");
