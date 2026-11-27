// Usage: node tests/browser-models.cjs <qwen.gguf> <whisper.bin> <jfk.wav>
// Requires Playwright and Chromium. Set CHROMIUM_PATH when using system Chromium.
"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const http = require("node:http");
const os = require("node:os");
const path = require("node:path");
const {chromium} = require("playwright");
const root = path.resolve(__dirname, "../dist");
const [planner, speech, wav] = process.argv.slice(2).map(name => path.resolve(name));
if (!planner || !speech || !wav) throw new Error("Pass the official Qwen GGUF, Whisper BIN and JFK sample WAV.");
const packs = new Map([
  ["/model-packs/ggml-tiny.en-q5_1.bin", speech],
  ["/model-packs/qwen2.5-0.5b-instruct-q4_k_m.gguf", planner]
]);
const types = {".html":"text/html",".js":"text/javascript",".css":"text/css",".json":"application/json",
  ".wasm":"application/wasm",".ttf":"font/ttf",".webmanifest":"application/manifest+json",".png":"image/png"};
let cut = false;
const server = http.createServer(async (req, res) => {
  if (cut) { req.socket.destroy(); return; }
  const pathname = new URL(req.url, "http://localhost").pathname;
  const source = packs.get(pathname) || path.join(root, pathname === "/" ? "index.html" : pathname);
  try {
    const info = await fsp.stat(source);
    res.writeHead(200, {"Content-Type": types[path.extname(source)] || "application/octet-stream",
      "Content-Length": info.size, "Cross-Origin-Opener-Policy": "same-origin", "Cross-Origin-Embedder-Policy": "require-corp"});
    fs.createReadStream(source).pipe(res);
  } catch { res.writeHead(404); res.end(); }
});
async function test() {
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const profile = await fsp.mkdtemp(path.join(os.tmpdir(),"lowstim-browser-models-"));
  const context = await chromium.launchPersistentContext(profile, {executablePath: process.env.CHROMIUM_PATH || undefined, args: ["--disable-dev-shm-usage"]});
  try {
    const page = await context.newPage();
    page.on("pageerror", error => console.error(error.message));
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.evaluate(async () => {
      await navigator.serviceWorker.register("./sw.js");
      await navigator.serviceWorker.ready;

    });
    for (const kind of ["speech","planner"]) {
      await page.evaluate(kind => LowStimModels.install(kind), kind);
      console.log("Installed", kind);
    }
    await page.waitForFunction(() => navigator.serviceWorker.controller != null);
    cut = true;
    await context.setOffline(true);
    await page.reload();
    const state = await page.evaluate(() => LowStimModels.status());
    assert.deepEqual(state, {supported: true, planner: true, speech: true});
    const audio = (await fsp.readFile(wav)).toString("base64");
    const text = await page.evaluate(async data => {
      const bytes = Uint8Array.from(atob(data), char => char.charCodeAt(0));
      const decoder = new OfflineAudioContext(1, 1, 16000);
      const clip = await decoder.decodeAudioData(bytes.buffer);
      return LowStimModels.transcribe(clip.getChannelData(0));
    }, audio);
    assert.match(text, /country/i);
    console.log("Offline Whisper:", text);
    const scene = await page.evaluate(async () => {
      const text = "Hold the rocket to launch into space", options = {seed: 2403, level: "max"};
      const grammar = Forge.gbnf();
      const value = JSON.parse(await LowStimModels.plan(Forge.modelPrompt(text, "", null, options), grammar));
      if (!Forge.validPlan(value)) throw new Error("Model output failed scene tool validation.");
      const recipe = Forge.recipe(text, "", null, {...options, plan: value});
      if (!Forge.valid(recipe)) throw new Error("The generated scene cannot replay.");
      return {value, name: recipe.name};
    });
    console.log("Offline Qwen:", JSON.stringify(scene));
  } finally { await context.close(); await fsp.rm(profile,{recursive:true,force:true}); }
}
test().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => server.close());
