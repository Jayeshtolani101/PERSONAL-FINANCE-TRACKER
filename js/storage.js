const DB_NAME = "FinanceTracker2026";
const DB_VERSION = 1;
let dbPromise;

function db() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return dbPromise;
}

export async function getValue(key, fallback) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("kv", "readonly");
    const req = tx.objectStore("kv").get(key);
    req.onsuccess = () => resolve(req.result ?? fallback);
    req.onerror = () => reject(req.error);
  });
}

export async function setValue(key, value) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const tx = database.transaction("kv", "readwrite");
    tx.objectStore("kv").put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function loadState() {
  const state = await getValue("state", null);
  if (state) return state;
  const backup = localStorage.getItem("FinanceTracker.session");
  return backup ? JSON.parse(backup) : null;
}

export async function saveState(state) {
  localStorage.setItem("FinanceTracker.session", JSON.stringify(state));
  await setValue("state", state);
}
