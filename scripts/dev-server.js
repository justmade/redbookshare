const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");

loadEnvFile(".env");
loadEnvFile(".env.local");

const { generateCopy } = require("../lib/generate-copy-core");

const root = process.cwd();
const preferredPort = Number(process.env.PORT || 3000);
const host = process.env.HOST || "127.0.0.1";
let activePort = preferredPort;

const contentTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

listen(preferredPort);

function listen(port) {
  activePort = port;
  const server = createServer();

  server.on("error", (error) => {
    if (error.code === "EADDRINUSE" && !process.env.PORT) {
      const nextPort = activePort + 1;
      console.log(`Port ${activePort} is in use, trying ${nextPort}...`);
      listen(nextPort);
      return;
    }

    console.error(error);
    process.exit(1);
  });

  server.listen(port, host, () => {
    console.log(`Local server running at http://${host}:${port}`);
  });
}

function createServer() {
  return http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (url.pathname === "/api/generate-copy") {
      await handleGenerateCopy(req, res);
      return;
    }

    serveStatic(url.pathname, res);
  });
}

async function handleGenerateCopy(req, res) {
  if (req.method === "OPTIONS") {
    res.writeHead(204, { Allow: "POST, OPTIONS" });
    res.end();
    return;
  }

  if (req.method !== "POST") {
    sendJson(res, 405, { error: "Method not allowed" }, { Allow: "POST, OPTIONS" });
    return;
  }

  const body = await readJsonBody(req);
  const result = await generateCopy(body);
  sendJson(res, 200, result, { "Cache-Control": "no-store" });
}

function serveStatic(pathname, res) {
  const normalized = pathname === "/" ? "/index.html" : pathname;
  const target = path.resolve(root, `.${decodeURIComponent(normalized)}`);

  if (!target.startsWith(root) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not found");
    return;
  }

  const ext = path.extname(target).toLowerCase();
  res.writeHead(200, {
    "Content-Type": contentTypes[ext] || "application/octet-stream",
    "Cache-Control": ext === ".html" ? "no-store" : "public, max-age=60"
  });
  fs.createReadStream(target).pipe(res);
}

function readJsonBody(req) {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 10_000) req.destroy();
    });
    req.on("end", () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch (error) {
        resolve({});
      }
    });
    req.on("error", () => resolve({}));
  });
}

function sendJson(res, statusCode, payload, headers = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    ...headers
  });
  res.end(JSON.stringify(payload));
}

function loadEnvFile(filename) {
  const filePath = path.join(process.cwd(), filename);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (!key || process.env[key] !== undefined) continue;

    if (
      (value.startsWith("\"") && value.endsWith("\"")) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}
