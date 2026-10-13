const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getDefaultState() {
  return {
    masterItems: {
      drinks: [],
      party: [],
      cleaning: [],
      office: [],
    },
    weeks: {},
  };
}

function load(forceReset = false) {
  ensureDir();
  if (forceReset || !fs.existsSync(DB_PATH)) {
    const state = getDefaultState();
    save(state);
    return state;
  }
  const raw = fs.readFileSync(DB_PATH, "utf8");
  return JSON.parse(raw);
}

function save(state) {
  ensureDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(state, null, 2), "utf8");
}

module.exports = { load, save, DB_PATH };