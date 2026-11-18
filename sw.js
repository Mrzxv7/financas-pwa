const CACHE = "financas-pwa-v3.0.0";
const CORE = [
  "./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest",
  "./icons/icon-180.png", "./icons/icon-192.png", "./icons/icon-512.png",
  "./vendor/pdf.mjs", "./vendor/pdf.worker.mjs"
];
const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(async cache => {
    await cache.addAll(CORE);
    try {
      const request = new Request(SUPABASE_CDN,{mode:"no-cors"});
      const response = await fetch(request);
      await cache.put(request,response);
    } catch (error) { console.warn("Cliente Supabase será armazenado no próximo acesso online.",error); }
  }).then(() => self.skipWaiting()));
});
self.addEventListener("activate", event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (event.request.url === SUPABASE_CDN || url.hostname === "cdn.jsdelivr.net") {
    event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
      const copy=response.clone(); caches.open(CACHE).then(cache => cache.put(event.request,copy)); return response;
    })));
    return;
  }
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE).then(cache => cache.put("./index.html",copy)); return response; }).catch(() => caches.match("./index.html")));
    return;
  }
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.status === 200) { const copy=response.clone(); caches.open(CACHE).then(cache => cache.put(event.request,copy)); }
    return response;
  })));
});
