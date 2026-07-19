const CACHE = "financetracker-2026-v2";
const ASSETS = ["./","./index.html","./manifest.json","./css/style.css","./css/dashboard.css","./css/animations.css","./js/app.js","./js/storage.js","./js/charts.js","./js/ui.js","./js/export.js","./js/import.js","./js/theme.js","./js/analytics.js","./js/vendor/chart.umd.min.js","./js/vendor/xlsx.full.min.js","./js/vendor/jspdf.umd.min.js","./icons/icon.svg","./icons/icon-192.png","./icons/icon-512.png"];
self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    const copy = response.clone();
    caches.open(CACHE).then(cache => cache.put(event.request, copy));
    return response;
  }).catch(() => caches.match("./index.html"))));
});
