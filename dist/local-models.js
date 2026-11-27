"use strict";
(() => {
  const base = new URL(".", document.currentScript.src);
  const local = path => new URL(path, base).href;
  const cacheName = "lowstim-verified-weights-v1";
  const installs = new Map();
  let catalogPromise, qwenPromise, whisperPromise, mic;
  const supported = () => isSecureContext && !!globalThis.WebAssembly && !!globalThis.caches && !!globalThis.Worker;
  const fileKey = info => local("model-files/" + info.sha256);

  function catalog() {
    if (!catalogPromise) catalogPromise = fetch(local("model-assets.json")).then(response => {
      if (!response.ok) throw new Error("The model download list could not be opened.");
      return response.json();
    }).catch(error => { catalogPromise = null; throw error; });
    return catalogPromise;
  }

  async function modelInfo(kind) {
    const info = (await catalog()).weights[kind];
    if (!info) throw new Error("Unknown local model.");
    return info;
  }

  async function status() {
    if (!supported()) return { supported: false, planner: false, speech: false };
    const [manifest, cache] = await Promise.all([catalog(), caches.open(cacheName)]);
    const present = new Set((await cache.keys()).map(request => request.url));
    return {
      supported: true,
      planner: present.has(fileKey(manifest.weights.planner)),
      speech: present.has(fileKey(manifest.weights.speech))
    };
  }

  async function store(kind, file, progress) {
    if (!supported()) throw new Error("Local models need HTTPS or localhost and a browser with WebAssembly and local storage.");
    const info = await modelInfo(kind);
    const cache = await caches.open(cacheName);
    if (await cache.match(fileKey(info))) { progress(1); return; }
    if (file && file.size !== info.bytes) throw new Error("Choose the complete " + info.name + " model file.");
    const space = await navigator.storage?.estimate?.();
    if (space?.quota && space.quota - space.usage < info.bytes) throw new Error("Free more device storage before installing " + info.name + ".");
    await navigator.storage?.persist?.().catch(() => {});
    await import(local("model-runtime/sha256.js"));
    const hash = await globalThis.hashwasm.createSHA256();
    let source;
    if (file) {
      source = file.stream();
    } else {
      let response;
      {
        const filename = info.url.slice(info.url.lastIndexOf("/") + 1);
        const bundled = await fetch(local("model-packs/" + filename)).catch(() => null);
        const size = Number(bundled?.headers.get("content-length"));
        if (bundled?.ok && (!size || size === info.bytes) && !bundled.headers.get("content-type")?.includes("text/html")) response = bundled;
        else await bundled?.body?.cancel();
      }
      response ??= await fetch(info.url, { credentials: "omit", referrerPolicy: "no-referrer" });
      if (!response.ok || !response.body) throw new Error("The model download failed. Retry or import a file.");
      source = response.body;
    }
    let length = 0, last = 0;
    const verified = source.pipeThrough(new TransformStream({
      transform(part, controller) {
        length += part.byteLength;
        if (length > info.bytes) throw new Error("Unexpected model size.");
        hash.update(part);
        controller.enqueue(part);
        if (performance.now() - last > 160) { progress(Math.min(.99, length / info.bytes)); last = performance.now(); }
      },
      flush() {
        if (length !== info.bytes || hash.digest("hex") !== info.sha256) throw new Error("Model verification failed. Download the complete file again.");
      }
    }));
    // Cache.put commits only after the verified stream closes. An interrupted install stays invisible.
    await cache.put(fileKey(info), new Response(verified, { headers: { "Content-Type": "application/octet-stream", "Content-Length": String(info.bytes) } }));
    progress(1);
  }

  function provision(kind, file, progress = () => {}) {
    if (!installs.has(kind)) installs.set(kind, store(kind, file, progress).finally(() => installs.delete(kind)));
    return installs.get(kind);
  }

  async function modelBlob(kind) {
    const info = await modelInfo(kind);
    const response = await (await caches.open(cacheName)).match(fileKey(info));
    if (!response) throw new Error("Install " + info.name + " in the slate menu first.");
    return response.blob();
  }

  async function loadQwen() {
    const [{ Wllama }, model] = await Promise.all([import(local("model-runtime/wllama/index.js")), modelBlob("planner")]);
    const engine = new Wllama({ default: local("model-runtime/wllama/wllama.wasm") }, { suppressNativeLog: true });
    engine.setCompat(null); // Keep all executables local, including on older browsers.
    try {
      const options = { n_ctx: 2048, n_batch: 128, n_threads: Math.min(4, navigator.hardwareConcurrency || 1), n_gpu_layers: 0 };
      const { adapter } = await catalog();
      if (adapter) {
        const response = await fetch(local(adapter.path));
        if (!response.ok) throw new Error("The LowStim scene adapter could not be loaded.");
        const bytes = await response.arrayBuffer();
        const digest = await crypto.subtle.digest("SHA-256", bytes);
        const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
        if (hex !== adapter.sha256) throw new Error("The LowStim scene adapter failed verification.");
        options.lora_adapters = [{ blob: new Blob([bytes]), scale: 1 }];
      }
      await engine.loadModel([model], options);
      return engine;
    } catch (error) {
      await engine.exit().catch(() => {});
      throw error;
    }
  }

  let planning = false;
  async function plan(prompt, grammar, signal) {
    if (planning) throw new Error("The local planner is already making a scene.");
    planning = true;
    try {
      if (!qwenPromise) qwenPromise = loadQwen().catch(error => { qwenPromise = null; throw error; });
      const engine = await qwenPromise;
      const result = await engine.createCompletion({ prompt, grammar, max_tokens: 160, temperature: .65, abortSignal: signal });
      return result.choices[0].text;
    } finally { planning = false; }
  }

  async function loadWhisper() {
    const [api, blob] = await Promise.all([import(local("model-runtime/whisper/index.js")), modelBlob("speech")]);
    if (!whisperConfigured) { api.configureWasm({ threads: false }); whisperConfigured = true; }
    const url = URL.createObjectURL(blob);
    try { return await api.initWhisper({ filePath: url, useGpu: false, cacheModel: false }); }
    finally { URL.revokeObjectURL(url); }
  }

  let whisperConfigured = false;
  async function transcribe(pcm) {
    if (!(pcm instanceof Float32Array) || pcm.length > 16000 * 30) throw new Error("Use a recording shorter than 30 seconds.");
    if (!whisperPromise) whisperPromise = loadWhisper().catch(error => { whisperPromise = null; throw error; });
    const engine = await whisperPromise;
    const output = await engine.transcribeData(pcm, { language: "en", maxThreads: 1, temperature: 0, bestOf: 1 }).promise;
    return output.result.trim().replace(/^\s*(?:\[.*?\]|\(.*?\))\s*$/s, "");
  }

  // Average across source frames, then return mono 16 kHz float PCM to Whisper.
  function pcm16k(parts, total, rate) {
    const raw = new Float32Array(total);
    let at = 0;
    for (const part of parts) { raw.set(part, at); at += part.length; }
    const samples = new Float32Array(Math.min(16000 * 30, Math.floor(total * 16000 / rate)));
    for (let i = 0; i < samples.length; i++) {
      const a = Math.floor(i * rate / 16000), b = Math.min(total, Math.max(a + 1, Math.floor((i + 1) * rate / 16000)));
      let sum = 0;
      for (let j = a; j < b; j++) sum += raw[j];
      samples[i] = sum / (b - a);
    }
    return samples;
  }

  async function release(m) {
    clearTimeout(m.timer);
    m.stream?.getTracks().forEach(track => track.stop());
    m.source?.disconnect();
    m.node?.disconnect();
    if (m.context && m.context.state !== "closed") await m.context.close().catch(() => {});
  }

  async function stopVoice() {
    if (!mic) return;
    const m = mic;
    mic = null;
    await release(m);
    if (!m.total) { m.done("", "The recording was empty."); return; }
    try { m.done(await transcribe(pcm16k(m.parts, m.total, m.context.sampleRate)), ""); }
    catch (error) { m.done("", error.message || "Whisper could not transcribe the recording."); }
  }

  async function listen(done) {
    if (mic) throw new Error("The microphone is already listening.");
    if (!(await status()).speech) throw new Error("Install Whisper in the slate menu first.");
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("Microphone access needs HTTPS or localhost.");
    const m = { done, parts: [], total: 0 };
    mic = m;
    try {
      m.stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1 }, video: false });
      if (mic !== m) { await release(m); return; }
      m.context = new AudioContext();
      await m.context.audioWorklet.addModule(local("mic-worklet.js"));
      if (mic !== m) return;
      await m.context.resume();
      if (mic !== m) return;
      m.source = m.context.createMediaStreamSource(m.stream);
      m.node = new AudioWorkletNode(m.context, "slate-microphone", { numberOfOutputs: 0 });
      m.node.port.onmessage = event => {
        if (mic !== m) return;
        const part = event.data, limit = 30 * m.context.sampleRate;
        if (m.total + part.length <= limit) { m.total += part.length; m.parts.push(part); }
        else stopVoice();
      };
      m.source.connect(m.node);
      m.timer = setTimeout(stopVoice, 30000);
    } catch (error) {
      if (mic === m) mic = null;
      await release(m);
      throw error;
    }
  }

  globalThis.LowStimModels = {
    status, install: (kind, progress) => provision(kind, null, progress),
    importFile: (kind, file, progress) => provision(kind, file, progress),
    plan, listen, stopVoice, transcribe
  };
})();
