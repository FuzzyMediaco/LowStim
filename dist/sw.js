"use strict";
const cacheName = "lowstim-slate-" + "e57811f1e6930433e541";
const assets = ["./account.js", "./app.webmanifest", "./catalog.js", "./fonts/OFL.txt", "./fonts/pixelify.ttf", "./icon-192.png", "./icon-512.png", "./index.html", "./licenses/credits.txt", "./licenses/openai-whisper.txt", "./licenses/quickdraw-cc-by-4.txt", "./licenses/qwen.txt", "./local-models.js", "./mic-worklet.js", "./model-assets.json", "./model-runtime/hash-wasm-LICENSE.txt", "./model-runtime/sha256.js", "./model-runtime/whisper/LICENSE.txt", "./model-runtime/whisper/index.js", "./model-runtime/whisper/wasm/whisper-node.js", "./model-runtime/whisper/wasm/whisper-node.wasm", "./model-runtime/whisper/whisper-cpp-LICENSE.txt", "./model-runtime/whisper/whisper-model-LICENSE.txt", "./model-runtime/whisper/worker.js", "./model-runtime/wllama/LICENSE.txt", "./model-runtime/wllama/index.js", "./model-runtime/wllama/llama-cpp-LICENSE.txt", "./model-runtime/wllama/lowstim-lora.gguf", "./model-runtime/wllama/qwen-model-LICENSE.txt", "./model-runtime/wllama/wllama.wasm", "./offline.js", "./scene.js", "./sketch-model.js", "./slate.css", "./slate.js", "./studio-menu.js", "./world.js"];
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
