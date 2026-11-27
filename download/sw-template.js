"use strict";
const cacheName = "lowstim-slate-" + "@VERSION@";
const assets = "@ASSETS@";
const shellURLs = new Set(assets.map(path => new URL(path, self.registration.scope).href));
self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const page = await fetch(new Request("./", {cache: "reload"}));
    if (!page.ok) throw new Error("The offline paper could not be loaded.");
    await cache.put("./index.html", new Response(page.body, {headers:page.headers}));
    await cache.addAll(assets.filter(path => path !== "./index.html").map(path => new Request(path, {cache: "reload"})));
  })());
});
self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if ((key.startsWith("lowstim-slate-") || key.startsWith("doodle-forge-shell-")) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener("fetch", event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  const isHome = url.pathname === new URL(".", self.registration.scope).pathname;
  if (isHome || shellURLs.has(url.href)) {
    const key = isHome ? new URL("index.html", self.registration.scope).href : req.url;
    event.respondWith(caches.open(cacheName).then(async cache => (await cache.match(key)) || fetch(req)));
  }
});
