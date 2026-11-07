// Local helper for tools/images.html: serves the repo (so the page can load
// the real extension/background.js) and saves rendered images.
//   node tools/serve.mjs   then open http://localhost:5179/tools/images.html
// PUT /save/<name>.png writes tools/out/<name>.png (frames and stills);
// tools/make-images.py then builds docs/images from tools/out.
import { createServer } from "node:http";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const OUT = join(ROOT, "tools", "out");
const PORT = Number(process.env.PORT) || 5179;
const TYPES = { ".html": "text/html", ".js": "text/javascript", ".mjs": "text/javascript", ".png": "image/png", ".gif": "image/gif", ".css": "text/css" };

createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://localhost");
    if (req.method === "PUT" && url.pathname.startsWith("/save/")) {
      const name = url.pathname.slice(6);
      if (!/^[a-z0-9-]+\.png$/.test(name)) return void res.writeHead(400).end("bad name");
      const chunks = [];
      for await (const c of req) chunks.push(c);
      await mkdir(OUT, { recursive: true });
      await writeFile(join(OUT, name), Buffer.concat(chunks));
      return void res.writeHead(204).end();
    }
    const path = normalize(join(ROOT, decodeURIComponent(url.pathname)));
    if (!path.startsWith(ROOT) || path.split(sep).includes(".git")) return void res.writeHead(403).end();
    const body = await readFile(path);
    res.writeHead(200, { "content-type": TYPES[extname(path)] ?? "application/octet-stream", "cache-control": "no-store" }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, () => console.log(`http://localhost:${PORT}/tools/images.html`));
