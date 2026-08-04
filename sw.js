/* Events Timeline — offline support.

   The app's own code is fetched network-first: a deploy is picked up on the
   next load, never a stale mix of old and new modules. The cache is only a
   fallback for when there's no connection. */
const CACHE = "events-timeline-v22";

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(["./", "./index.html"])).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.hostname.indexOf("firebaseio.com") >= 0 || url.hostname.indexOf("firebasedatabase.app") >= 0) return;

  const ours = url.origin === self.location.origin;
  const isCode = ours && (req.mode === "navigate" || url.pathname.endsWith(".js") || url.pathname.endsWith(".html") || url.pathname === "/");

  if (isCode) {
    /* always try the network first so code is never stale */
    e.respondWith(
      fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => caches.match(req).then((hit) => hit || caches.match("./index.html")))
    );
    return;
  }

  /* fonts, CDN scripts and the like: cache first, they don't change */
  e.respondWith(
    caches.match(req).then((hit) => hit || fetch(req).then((res) => {
      if (res && res.status === 200) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
      }
      return res;
    }))
  );
});
