// Offline support for the iPhone home-screen version. New versions load when online; the last one works offline.
const CACHE = "pokerbank-20261110113028";
const CORE = ["./", "./index.html", "./manifest.webmanifest", "./icon-180.png", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k.startsWith("pokerbank-") && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request; if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (req.mode === "navigate") {               // the app page: newest when online (3 s limit), saved copy when not
    e.respondWith((async () => {
      const cached = await caches.match("./index.html");
      try {
        const net = await Promise.race([fetch(req), new Promise((_, no) => setTimeout(() => no(new Error("slow")), 3000))]);
        if (net.ok) { const c = await caches.open(CACHE); c.put("./index.html", net.clone()); }
        return net;
      } catch { return cached || Response.error(); }
    })());
    return;
  }
  if (url.origin === location.origin || /fonts\.(googleapis|gstatic)\.com$/.test(url.hostname)) {   // icons and fonts: saved copy first
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(res => {
      if (res.ok || res.type === "opaque") { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
