const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = Number(process.env.PORT || 3000);
const PUBLIC_DIR = path.join(__dirname, "public");
const rooms = new Map();

function sendJson(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 20_000) {
        reject(new Error("Mensaje demasiado grande"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function normalizeRoom(room) {
  return String(room || "general")
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40) || "general";
}

function getRoom(roomName) {
  const key = normalizeRoom(roomName);
  if (!rooms.has(key)) {
    rooms.set(key, {
      clients: new Set(),
      messages: []
    });
  }
  return rooms.get(key);
}

function broadcast(roomName, event, payload) {
  const room = getRoom(roomName);
  const packet = `event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`;
  for (const client of room.clients) {
    client.write(packet);
  }
}

function safeText(value, max) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : decodeURIComponent(req.url.split("?")[0]);
  const filePath = path.normalize(path.join(PUBLIC_DIR, requestPath));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, content) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const types = {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml"
    };
    res.writeHead(200, {
      "content-type": types[ext] || "application/octet-stream",
      "cache-control": "no-store"
    });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);

  if (req.method === "GET" && url.pathname === "/api/events") {
    const roomName = normalizeRoom(url.searchParams.get("room"));
    const room = getRoom(roomName);

    res.writeHead(200, {
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      "x-accel-buffering": "no"
    });
    res.write(`event: history\ndata: ${JSON.stringify(room.messages)}\n\n`);
    room.clients.add(res);
    req.on("close", () => room.clients.delete(res));
    return;
  }

  if (req.method === "POST" && url.pathname === "/api/messages") {
    try {
      const body = JSON.parse(await readBody(req));
      const roomName = normalizeRoom(body.room);
      const name = safeText(body.name, 24) || "Invitado";
      const text = safeText(body.text, 500);

      if (!text) {
        sendJson(res, 400, { error: "El mensaje esta vacio." });
        return;
      }

      const room = getRoom(roomName);
      const message = {
        id: crypto.randomUUID(),
        name,
        text,
        time: new Date().toISOString()
      };
      room.messages.push(message);
      room.messages = room.messages.slice(-80);
      broadcast(roomName, "message", message);
      sendJson(res, 201, { ok: true });
    } catch (error) {
      sendJson(res, 400, { error: "No se pudo enviar el mensaje." });
    }
    return;
  }

  if (req.method === "GET") {
    serveStatic(req, res);
    return;
  }

  sendJson(res, 405, { error: "Metodo no permitido." });
});

server.listen(PORT, () => {
  console.log(`Sala de chat lista en http://localhost:${PORT}`);
});
