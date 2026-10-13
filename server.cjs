const http = require("http");
const fs = require("fs");
const path = require("path");
const db = require("./db.cjs");

const PORT = Number(process.env.PORT) || 3001;
const DIST_DIR = path.join(__dirname, "dist");
let state = db.load();

function persist() {
  db.save(state);
}

function send(res, status, body, headers = {}) {
  const payload = typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, {
    "Content-Type":
      typeof body === "string" ? "text/plain; charset=utf-8" : "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    ...headers,
  });
  res.end(payload);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end", () => {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("Invalid JSON"));
      }
    });
    req.on("error", reject);
  });
}

function getMonday(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d) {
  return d.toISOString().split("T")[0];
}

function getCurrentWeekId() {
  return formatDate(getMonday(new Date()));
}

function getNextWeekId() {
  const monday = getMonday(new Date());
  monday.setDate(monday.getDate() + 7);
  return formatDate(monday);
}

function getWeekLabel(weekId) {
  const d = new Date(weekId + "T00:00:00");
  const end = new Date(d);
  end.setDate(end.getDate() + 6);
  const opts = { month: "short", day: "numeric", year: "numeric" };
  return `${d.toLocaleDateString("en-US", opts)} \u2013 ${end.toLocaleDateString("en-US", opts)}`;
}

const DEFAULT_CATEGORIES = [
  { id: "drinks", name: "DRINKS" },
  { id: "party", name: "PARTY" },
  { id: "cleaning", name: "CLEANING" },
  { id: "office", name: "OFFICE SUPPLIES" },
];

function categoriesFromMaster(masterItems) {
  return DEFAULT_CATEGORIES.map((cat) => ({
    ...cat,
    items: (masterItems[cat.id] || []).map((name, i) => ({
      id: `master-${cat.id}-${i}`,
      name,
      inStock: 0,
      toOrder: 0,
    })),
  }));
}

function getSnapshot() {
  const currentWeekId = getCurrentWeekId();
  const weekData = state.weeks[currentWeekId];
  const categories = weekData
    ? weekData.categories
    : categoriesFromMaster(state.masterItems);

  const allWeekIds = Array.from(
    new Set([...Object.keys(state.weeks), currentWeekId])
  )
    .sort()
    .reverse();

  return {
    categories,
    currentWeekId,
    allWeekIds,
    masterItems: state.masterItems,
  };
}

async function handleApi(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const { pathname } = url;

  // GET /api/state
  if (req.method === "GET" && pathname === "/api/state") {
    send(res, 200, getSnapshot());
    return;
  }

  // POST /api/reset
  if (req.method === "POST" && pathname === "/api/reset") {
    state = db.load(true);
    send(res, 200, getSnapshot());
    return;
  }

  // POST /api/items
  if (req.method === "POST" && pathname === "/api/items") {
    const body = await readBody(req);
    const { categoryId, name } = body;
    const trimmed = name.trim();
    if (!trimmed || !categoryId) {
      send(res, 400, { error: "Missing categoryId or name" });
      return;
    }

    // Add to master items
    const existing = state.masterItems[categoryId] || [];
    if (!existing.includes(trimmed)) {
      state.masterItems[categoryId] = [...existing, trimmed];
    }

    // Add to current week if exists
    const currentWeekId = getCurrentWeekId();
    if (state.weeks[currentWeekId]) {
      const cat = state.weeks[currentWeekId].categories.find(
        (c) => c.id === categoryId
      );
      if (cat) {
        cat.items.push({
          id: Date.now().toString(),
          name: trimmed,
          inStock: 0,
          toOrder: 0,
        });
      }
    }

    persist();
    send(res, 200, getSnapshot());
    return;
  }

  // DELETE /api/items/:categoryId/:itemId
  const deleteMatch = pathname.match(
    /^\/api\/items\/([^/]+)\/([^/]+)$/
  );
  if (req.method === "DELETE" && deleteMatch) {
    const [, categoryId, itemId] = deleteMatch;
    let removedName = "";

    // Remove from current week
    const currentWeekId = getCurrentWeekId();
    if (state.weeks[currentWeekId]) {
      const cat = state.weeks[currentWeekId].categories.find(
        (c) => c.id === categoryId
      );
      if (cat) {
        const item = cat.items.find((i) => i.id === itemId);
        if (item) removedName = item.name;
        cat.items = cat.items.filter((i) => i.id !== itemId);
      }
    }

    // Remove from master items
    if (removedName) {
      const existing = state.masterItems[categoryId] || [];
      state.masterItems[categoryId] = existing.filter(
        (n) => n !== removedName
      );
    }

    persist();
    send(res, 200, getSnapshot());
    return;
  }

  // PATCH /api/items/:categoryId/:itemId/stock
  const stockMatch = pathname.match(
    /^\/api\/items\/([^/]+)\/([^/]+)\/stock$/
  );
  if (req.method === "PATCH" && stockMatch) {
    const [, categoryId, itemId] = stockMatch;
    const body = await readBody(req);
    const delta = Number(body.delta) || 0;

    const currentWeekId = getCurrentWeekId();
    if (!state.weeks[currentWeekId]) {
      state.weeks[currentWeekId] = {
        categories: categoriesFromMaster(state.masterItems),
        savedAt: new Date().toISOString(),
      };
    }

    const cat = state.weeks[currentWeekId].categories.find(
      (c) => c.id === categoryId
    );
    if (cat) {
      const item = cat.items.find((i) => i.id === itemId);
      if (item) {
        item.inStock = Math.max(0, item.inStock + delta);
      }
    }

    persist();
    send(res, 200, getSnapshot());
    return;
  }

  // PATCH /api/items/:categoryId/:itemId/order
  const orderMatch = pathname.match(
    /^\/api\/items\/([^/]+)\/([^/]+)\/order$/
  );
  if (req.method === "PATCH" && orderMatch) {
    const [, categoryId, itemId] = orderMatch;
    const body = await readBody(req);
    const delta = Number(body.delta) || 0;

    const currentWeekId = getCurrentWeekId();
    if (!state.weeks[currentWeekId]) {
      state.weeks[currentWeekId] = {
        categories: categoriesFromMaster(state.masterItems),
        savedAt: new Date().toISOString(),
      };
    }

    const cat = state.weeks[currentWeekId].categories.find(
      (c) => c.id === categoryId
    );
    if (cat) {
      const item = cat.items.find((i) => i.id === itemId);
      if (item) {
        item.toOrder = Math.max(0, item.toOrder + delta);
      }
    }

    persist();
    send(res, 200, getSnapshot());
    return;
  }

  // POST /api/weeks/:weekId
  const weekMatch = pathname.match(/^\/api\/weeks\/([^/]+)$/);
  if (req.method === "POST" && weekMatch) {
    const weekId = weekMatch[1];

    if (weekId === "new") {
      const newWeekId = getCurrentWeekId();
      state.weeks[newWeekId] = {
        categories: categoriesFromMaster(state.masterItems),
        savedAt: new Date().toISOString(),
      };
      persist();
      send(res, 200, getSnapshot());
      return;
    }

    if (weekId === "next") {
      const nextId = getNextWeekId();
      state.weeks[nextId] = {
        categories: categoriesFromMaster(state.masterItems),
        savedAt: new Date().toISOString(),
      };
      persist();
      send(res, 200, getSnapshot());
      return;
    }

    send(res, 400, { error: "Invalid week action" });
    return;
  }

  send(res, 404, { error: "Unknown API route" });
}

function mime(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return (
    {
      ".html": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "text/javascript; charset=utf-8",
      ".svg": "image/svg+xml",
      ".json": "application/json",
      ".ico": "image/x-icon",
    }[ext] || "application/octet-stream"
  );
}

function serveStatic(req, res) {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const rel = decodeURIComponent(url.pathname).replace(/^\/+/, "") || "index.html";
  const abs = path.resolve(DIST_DIR, rel);
  if (!abs.startsWith(DIST_DIR)) {
    send(res, 403, "Forbidden");
    return;
  }
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) {
    const indexPath = path.join(DIST_DIR, "index.html");
    if (fs.existsSync(indexPath)) {
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      fs.createReadStream(indexPath).pipe(res);
      return;
    }
    send(res, 404, "Not found");
    return;
  }
  res.writeHead(200, { "Content-Type": mime(abs) });
  fs.createReadStream(abs).pipe(res);
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === "OPTIONS") {
      send(res, 204, "");
      return;
    }
    if (req.url.startsWith("/api/")) {
      await handleApi(req, res);
      return;
    }
    if (req.method === "GET") {
      serveStatic(req, res);
      return;
    }
    send(res, 404, "Not found");
  } catch (err) {
    send(res, 400, { error: err.message });
  }
});

server.listen(PORT, () => {
  console.log(`Inventory API server: http://localhost:${PORT}`);
});