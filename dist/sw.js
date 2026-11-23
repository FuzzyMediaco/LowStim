"use strict";
const cacheName="doodle-forge-shell-v2";
const assets=["./","./scene.js","./world.js","./slate.js","./sketch-model.js","./app.webmanifest","./icon-192.png","./icon-512.png"];
self.addEventListener("install",event=>event.waitUntil(caches.open(cacheName).then(cache=>cache.addAll(assets)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith("doodle-forge-shell-")&&k!==cacheName).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
  if(event.request.method!=="GET"||new URL(event.request.url).origin!==location.origin)return;
  if(event.request.mode==="navigate"){event.respondWith(fetch(event.request).catch(()=>caches.match("./")));return;}
  if(assets.some(p=>new URL(p,self.registration.scope).href===event.request.url))event.respondWith(fetch(event.request).catch(()=>caches.match(event.request)));
});
