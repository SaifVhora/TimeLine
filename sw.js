/* Offline cache.
   Your own files (index.html, src/*) are network-first: upload a change and the
   next reload picks it up — no version bumping needed. The cache is only there
   so the app still opens with no connection.
   CDN files (fonts, React, Tailwind) stay cache-first because they never change. */
const CACHE = "events-timeline-v7";
const SHELL = ["./", "./index.html", "./src/app.js"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

const save = (req, res) => {
  if (res && res.status === 200) {
    const clone = res.clone();
    caches.open(CACHE).then((c) => c.put(req, clone)).catch(() => {});
  }
  return res;
};

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = req.url;
  if (url.includes("firebaseio.com") || url.includes("firebasedatabase.app")) return;

  const sameOrigin = url.startsWith(self.location.origin);

  if (sameOrigin) {
    /* network first — always get the freshest copy, fall back to cache offline */
    e.respondWith(
      fetch(req)
        .then((res) => save(req, res))
        .catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  /* third-party CDN assets — cache first, they're immutable */
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => save(req, res)).catch(() => hit))
  );
});
