"use strict";
(() => {
  const $ = id => document.getElementById(id);
  const canvas = $("surface"), ctx = canvas.getContext("2d");
  const film = document.createElement("canvas");
  film.width = World.W; film.height = World.H;
  const ink = film.getContext("2d");
  const device = globalThis.SlateDevice;
  const models = globalThis.LowStimModels, accounts = globalThis.LowStimAccount;
  const input = $("idea"), popover = $("popover");
  const blankLabel = canvas.getAttribute("aria-label");
  let size, scene = null, record = null, lastPlanner = "", strokes = [], transition = null;
  let drawing = null, touch = null, lastTap = null, anchor = null;
  let sketchTimer, holdTimer, feedbackTimer, transcriptTimer, frameId = 0, previousTime = 0;
  let generation = 0, busy = false, saved = false, saving = false, planController = null;
  let previewingSpeech = false;
  let voiceSession = null, nativeVoice = null, nativePlan = null, activeKey = null;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const studio = createStudioMenu({
    device, current: () => scene, lastPlanner: () => lastPlanner,
    onNew: newSlate, onRefine: () => openChooser(center(), true), onOpenRecord: showSaved,
    onClose: () => { if (popover.hidden) canvas.focus({preventScroll: true}); renderSoon(); }
  });

  function feedback(text = "", action = null, delay = 0) {
    clearTimeout(feedbackTimer);
    $("notice").textContent = text;
    $("feedback").hidden = !text;
    const button = $("feedbackAction");
    button.hidden = !action; button.textContent = action?.label || ""; button.onclick = action?.run || null;
    if (delay) feedbackTimer = setTimeout(() => feedback(), delay);
  }
  const errorText = error => error?.message || "That action could not finish. Please try again.";
  function bindTool(name, fn) { $(name).addEventListener("click", fn); }
  const center = () => ({x: size.width / 2, y: size.height / 2});
  function placePopover() {
    if (!anchor || popover.hidden) return;
    const viewport = window.visualViewport;
    const left = viewport?.offsetLeft || 0, top = viewport?.offsetTop || 0;
    const width = viewport?.width || innerWidth, height = viewport?.height || innerHeight;
    const w = popover.offsetWidth, h = popover.offsetHeight;
    const preferredTop = anchor.y > top + h + 28 ? anchor.y - h - 14 : anchor.y + 16;
    const clamp = (value, min, max) => Math.max(min, Math.min(value, max));
    popover.style.left = Math.round(clamp(anchor.x - w / 2, left + 6, left + width - w - 6)) + "px";
    popover.style.top = Math.round(clamp(preferredTop, top + 6, top + height - h - 6)) + "px";
  }
  function tools(view, at) {
    clearTimeout(sketchTimer);
    clearTimeout(transcriptTimer);
    if (previewingSpeech && view !== "bar") {
      previewingSpeech = false;
      input.value = "";
      feedback();
    }
    if (at) anchor = at;
    for (const name of ["chooser", "bar", "voice"]) $(name).hidden = name !== view;
    popover.hidden = !view;
    placePopover();
  }
  function openChooser(at, keyboardNavigation = false) {
    if (busy || voiceSession || studio.openNow) return;
    input.blur(); feedback(); tools("chooser", at); lastTap = null;
    if (keyboardNavigation) $("mic").focus({preventScroll: true});
  }
  function openType(at) {
    if (busy || voiceSession) return;
    feedback(); tools("bar", at);
    input.placeholder = scene ? "Change this scene…" : "Make something…";
    input.focus({preventScroll: true});
    placePopover();
  }
  function openMenu(tab) {
    if (busy || voiceSession) return;
    resetPointer(); input.blur(); tools(null); feedback(); studio.open(tab);
  }
  function resize() {
    const r = canvas.getBoundingClientRect();
    const density = Math.min(3, window.devicePixelRatio || 1);
    canvas.width = Math.max(1, Math.round(r.width * density));
    canvas.height = Math.max(1, Math.round(r.height * density));
    ctx.imageSmoothingEnabled = false;
    // The launch pad stays in frame while portrait players see a larger rocket.
    // Puzzles and courses retain their full width so every target can be reached.
    const closeUp = scene?.mechanic === "launch" && r.height > r.width * 1.3;
    const zoom = closeUp ? 1.55 : 1;
    const scale = Math.min((canvas.width - 8 * density) * zoom / World.W, (canvas.height - 8 * density) / World.H);
    const w = Math.max(1, Math.floor(World.W * scale)), h = Math.max(1, Math.floor(World.H * scale));
    const x = closeUp ? Math.min(0, Math.max(canvas.width - w, canvas.width / 2 - w * scene.homeX / World.W)) : (canvas.width - w) / 2;
    size = {width: r.width, height: r.height, w, h, inkPixel: Math.max(2, Math.round(2 * density)),
      x: Math.floor(x), y: Math.floor((canvas.height - h) / 2)};
    const captionTop = Math.min(r.height - 48, (size.y + h) * r.height / canvas.height + 8);
    $("sceneHint").style.top = Math.round(Math.max(4, captionTop)) + "px";
    placePopover(); renderSoon();
  }
  const point = e => ({x: e.clientX, y: e.clientY});
  function worldPoint(p) {
    return {
      x: (p.x * canvas.width / size.width - size.x) * World.W / size.w,
      y: (p.y * canvas.height / size.height - size.y) * World.H / size.h
    };
  }
  const onWorld = p => p.x >= 0 && p.y >= 0 && p.x < World.W && p.y < World.H;
  function normalized(p) { return [p.x / size.width, p.y / size.height]; }
  function drawLine(line, transform = null) {
    // Integer steps keep the ink's chunky corners at every viewport size.
    const unit = size.inkPixel;
    let previous = null;
    for (const [x, y] of line) {
      const nx = transform ? x * transform.scale + transform.dx : x;
      const ny = transform ? y * transform.scale + transform.dy : y;
      const px = Math.round(nx * canvas.width / unit), py = Math.round(ny * canvas.height / unit);
      if (previous) {
        const [ax, ay] = previous, count = Math.max(Math.abs(px - ax), Math.abs(py - ay));
        for (let n = 1; n < count; n++) {
          ctx.fillRect(unit * Math.round(ax + (px - ax) * n / count), unit * Math.round(ay + (py - ay) * n / count), unit * 2, unit * 2);
        }
      }
      ctx.fillRect(unit * px, unit * py, unit * 2, unit * 2);
      previous = [px, py];
    }
  }
  function paint(time) {
    frameId = 0;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const progress = transition ? Math.min(1, Math.max(0, (time - transition.start) / 560)) : 1;
    if (progress === 1) transition = null;
    if (scene) {
      const dt = previousTime ? Math.min(0.05, (time - previousTime) / 1000) : 0;
      if (!busy && !studio.openNow && !document.hidden) {
        World.step(scene, dt * (reducedMotion.matches && scene.recipe.activity === "animation" ? 0.45 : 1));
      }
      const hint = World.hint?.(scene) || "";
      const goal = World.statusLabel?.(scene) || "";
      if ($("sceneInstruction").textContent !== hint) $("sceneInstruction").textContent = hint;
      if ($("sceneGoal").textContent !== goal) $("sceneGoal").textContent = goal;
      $("sceneHint").hidden = busy || (!hint && !goal);
      World.paint(ink, scene);
      ctx.globalAlpha = progress;
      ctx.drawImage(film, size.x, size.y, size.w, size.h);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = "#161616";
    if (transition) {
      const ease = progress * progress * (3 - 2 * progress);
      const endX = (size.x + size.w * transition.actorX / World.W) / canvas.width;
      const endY = (size.y + size.h * transition.actorY / World.H) / canvas.height;
      const scale = 1 + (transition.targetScale - 1) * ease;
      const transform = {
        scale,
        dx: (endX - transition.cx) * ease + transition.cx * (1 - scale),
        dy: (endY - transition.cy) * ease + transition.cy * (1 - scale)
      };
      ctx.globalAlpha = 1 - progress;
      for (const line of transition.lines) drawLine(line, transform);
      ctx.globalAlpha = 1;
    }
    for (const stroke of strokes) drawLine(stroke);
    previousTime = time;
    if (scene && !studio.openNow && !document.hidden && !busy) renderSoon();
  }
  function renderSoon() { if (!frameId) frameId = requestAnimationFrame(paint); }
  function setSaveIcon() {
    const label = saved ? "Creation saved" : "Save creation";
    $("save").setAttribute("aria-label", label); $("save").title = label;
    $("save").querySelector("use").setAttribute("href", saved ? "#i-check" : "#i-save");
    $("save").disabled = saving || saved;
  }
  function resetPointer() {
    clearTimeout(holdTimer);
    if (touch?.playing && scene) World.cancel(scene);
    const old = touch;
    touch = null; drawing = null; activeKey = null;
    if (old && canvas.hasPointerCapture(old.id)) canvas.releasePointerCapture(old.id);
  }
  function newSlate() {
    generation++; busy = false; cancelVoice(); stopPlan(); resetPointer();
    clearTimeout(sketchTimer); lastTap = null;
    scene = null; transition = null; record = null; saved = false; saving = false; strokes = []; input.value = "";
    $("sceneTools").hidden = true; $("sceneHint").hidden = true; resize();
    canvas.setAttribute("aria-label", blankLabel);
    input.blur(); tools(null); feedback(); previousTime = 0; renderSoon();
  }
  function sketchTransition(lines) {
    if (!lines.length || reducedMotion.matches) return null;
    let left = 1, top = 1, right = 0, bottom = 0;
    for (const line of lines) for (const [x, y] of line) {
      left = Math.min(left, x); top = Math.min(top, y);
      right = Math.max(right, x); bottom = Math.max(bottom, y);
    }
    const span = Math.max((right - left) * canvas.width, (bottom - top) * canvas.height, 1);
    return {lines, start: performance.now(), cx: (left + right) / 2, cy: (top + bottom) / 2,
      actorX: scene.x ?? World.W / 2, actorY: scene.y ?? World.H / 2,
      targetScale: Math.min(1.25, size.w * 0.13 / span)};
  }
  function showRecipe(recipe, item, alreadySaved) {
    resetPointer();
    scene = World.start(recipe); scene.domHints = true; resize();
    transition = !alreadySaved ? sketchTransition(strokes) : null;
    strokes = []; input.value = ""; input.blur(); tools(null);
    record = item; saved = alreadySaved; saving = false; setSaveIcon(); $("sceneTools").hidden = false;
    const title = record.title || recipe.name || recipe.subject;
    canvas.setAttribute("aria-label", title + ". " + (World.hint?.(scene) || "Interactive scene.") + " Open the slate menu to change it.");
    feedback(); previousTime = 0; renderSoon();
  }
  function showSaved(item) {
    generation++; busy = false;
    showRecipe(item.recipe, item, true);
  }
  async function saveCurrent() {
    if (!record || saved || saving) return;
    if (!accounts) { feedback("Storage could not open. Keep this slate open and try again."); return; }
    const item = record;
    saving = true; setSaveIcon();
    try {
      const result = await accounts.save(item);
      if (record !== item) return;
      saved = true;
      feedback(result.location === "cloud" ? "Saved to your account." :
        result.location === "pending" ? "Saved on this device. Account sync is pending." : "Saved on this device.", null, 3000);
    } catch (error) { if (record === item) feedback(errorText(error)); }
    finally { if (record === item) { saving = false; setSaveIcon(); } }
  }

  function queueSketch() {
    if (strokes.length && !scene && !studio.openNow && popover.hidden)
      sketchTimer = setTimeout(() => make(), 1450);
  }
  function endTouch() {
    clearTimeout(holdTimer);
    const old = touch;
    touch = null; drawing = null;
    if (old && canvas.hasPointerCapture(old.id)) canvas.releasePointerCapture(old.id);
  }
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  canvas.addEventListener("pointerdown", e => {
    if (e.button !== 0 || touch || busy || voiceSession || studio.openNow) return;
    const at = point(e), wp = worldPoint(at);
    canvas.dataset.pointing = "yes";
    clearTimeout(sketchTimer); clearTimeout(holdTimer);
    const dismissing = !popover.hidden;
    if (dismissing) { input.blur(); tools(null); }
    feedback();
    canvas.focus({preventScroll: true});
    touch = {id: e.pointerId, origin: at, moved: false, held: false, playing: Boolean(scene && onWorld(wp)), dismissing};
    canvas.setPointerCapture(e.pointerId);
    if (touch.playing) {
      transition = null;
      World.press(scene, wp);
    } else {
      holdTimer = setTimeout(() => {
        if (touch?.id !== e.pointerId || touch.moved) return;
        touch.held = true; openChooser(at);
      }, 510);
    }
  });
  canvas.addEventListener("pointermove", e => {
    if (touch?.id !== e.pointerId || touch.held) return;
    if (touch.playing) { World.move(scene, worldPoint(point(e))); return; }
    if (scene) return;
    const at = point(e);
    if (!touch.moved) {
      if (Math.hypot(at.x - touch.origin.x, at.y - touch.origin.y) < 4) return;
      touch.moved = true; lastTap = null; clearTimeout(holdTimer);
      drawing = [normalized(touch.origin)]; strokes.push(drawing); tools(null);
    }
    const samples = e.getCoalescedEvents?.();
    for (const sample of samples?.length ? samples : [e]) {
      if (drawing.length < 6000) drawing.push(normalized(point(sample)));
    }
    renderSoon();
  });
  canvas.addEventListener("pointerup", e => {
    if (touch?.id !== e.pointerId) return;
    const at = point(e), old = touch;
    if (old.playing) { World.release(scene, worldPoint(at)); endTouch(); return; }
    endTouch();
    if (old.held) return;
    if (!old.moved && !old.dismissing) {
      const now = performance.now();
      if (lastTap && now - lastTap.time < 380 && Math.hypot(at.x - lastTap.x, at.y - lastTap.y) < 30) {
        openChooser(at);
        return;
      }
      lastTap = {...at, time: now};
    }
    queueSketch();
  });
  function cancelTouch(e) {
    if (!touch || (e?.pointerId != null && e.pointerId !== touch.id)) return;
    resetPointer(); queueSketch();
  }
  canvas.addEventListener("pointercancel", cancelTouch);
  canvas.addEventListener("lostpointercapture", cancelTouch);

  function stopPlan() {
    planController?.abort(); planController = null;
    if (!nativePlan) return;
    clearTimeout(nativePlan.timer); nativePlan.resolve(null); nativePlan = null;
  }
  window.slatePlanResult = (received, value) => {
    if (!nativePlan || nativePlan.id !== Number(received)) return;
    const pending = nativePlan; nativePlan = null;
    clearTimeout(pending.timer); pending.resolve(value);
  };
  function callDevice(id, prompt, grammar) {
    return new Promise(resolve => {
      nativePlan = {id, resolve, timer: setTimeout(stopPlan, 90000)};
      try { device.plan(id, prompt, grammar); }
      catch { stopPlan(); }
    });
  }
  async function make() {
    clearTimeout(sketchTimer);
    if (busy || voiceSession || drawing) return;
    const idea = input.value.trim(), prior = scene?.recipe || null;
    if (!idea && !strokes.length) { openType(anchor || center()); return; }
    const points = strokes.map(line => line.map(([x, y]) => [x * size.width, y * size.height]));
    const sketch = points.length ? Forge.sketchLabel(points) : "";
    const options = {level: studio.level, seed: Forge.newSeed()};
    const id = ++generation;
    // Once submitted, the input remains available if generation needs a retry.
    previewingSpeech = false;
    busy = true; input.blur(); tools(null); $("sceneTools").hidden = true; $("sceneHint").hidden = true;
    feedback("Making your creation…", {label: "Cancel", run: () => {
      generation++; busy = false; stopPlan(); feedback(); $("sceneTools").hidden = !scene; renderSoon();
    }});
    let plan = null, failed = false;
    try {
      const available = device ? device.hasModel() : (await models?.status())?.planner;
      if (generation !== id) return;
      if (available) {
        const prompt = Forge.modelPrompt(idea, sketch, prior, options), grammar = Forge.gbnf(idea, sketch, prior, options);
        planController = new AbortController();
        const value = device ? await callDevice(id, prompt, grammar) : await models.plan(prompt, grammar, planController.signal);
        const result = typeof value === "string" ? JSON.parse(value) : value;
        if (Forge.validPlan(result)) plan = result;
        else failed = true;
      }
    } catch { failed = true; }
    if (generation !== id) return;
    planController = null;
    try {
      const recipe = Forge.recipe(idea, sketch, prior, {...options, plan});
      const key = globalThis.crypto.randomUUID ? crypto.randomUUID() : "scene-" + Date.now().toString(36) + "-" + options.seed.toString(36);
      lastPlanner = plan ? "local Qwen" : "the built-in planner";
      busy = false;
      showRecipe(recipe, {id: key, title: recipe.name || recipe.subject, recipe}, false);
      if (!prior) Forge.remember?.(idea, sketch, recipe);
      if (failed) feedback("The local model was unavailable. The built-in planner made this creation.", null, 5000);
    } catch (error) {
      busy = false; $("sceneTools").hidden = !scene;
      feedback(errorText(error), {label: "Try again", run: make});
    }
  }

  function finishVoice(session, phrase, error) {
    if (nativeVoice === session) nativeVoice = null;
    if (voiceSession !== session) return;
    voiceSession = null; tools(null);
    if (error || !phrase?.trim()) {
      feedback(error || "No words came through.", {label: "Type instead", run: () => openType(anchor || center())});
      return;
    }
    input.value = phrase.trim().slice(0, input.maxLength);
    previewingSpeech = true;
    tools("bar", anchor || center());
    feedback("Tap the transcript to edit, or let it play.");
    // Leave the keyboard closed until the speaker chooses to edit.
    transcriptTimer = setTimeout(() => {
      transcriptTimer = null;
      if (!document.hidden && !$("bar").hidden) make();
    }, 3200);
  }
  window.slateVoiceResult = (phrase, error) => {
    if (nativeVoice) finishVoice(nativeVoice, phrase, error);
  };
  window.slatePauseVoice = () => {
    if (nativeVoice) finishVoice(nativeVoice, "", "Listening stopped.");
  };
  async function beginVoice() {
    if (busy || voiceSession) return;
    const session = {active: false, stopping: false};
    voiceSession = session;
    feedback(); tools("voice", anchor || center());
    $("voiceInfo").textContent = "Opening mic…"; $("stopVoice").disabled = true;
    try {
      if (device) {
        if (nativeVoice) throw new Error("The last recording is finishing. Try again in a moment.");
        nativeVoice = session;
        device.listen();
      } else {
        const status = await models?.status();
        if (voiceSession !== session) return;
        if (!status?.speech) {
          voiceSession = null; tools(null);
          feedback("Add Whisper to use the microphone offline.", {label: "Speech setup", run: () => openMenu("offline")});
          return;
        }
        await models.listen((text, error) => finishVoice(session, text, error));
      }
      if (voiceSession !== session) {
        if (session.cancelled && !device) await models?.stopVoice();
        return;
      }
      session.active = true;
      $("voiceInfo").textContent = "Listening…"; $("stopVoice").disabled = false;
    } catch (error) { finishVoice(session, "", errorText(error)); }
  }
  async function stopVoice() {
    const session = voiceSession;
    if (!session?.active || session.stopping) return;
    session.stopping = true;
    $("voiceInfo").textContent = "Transcribing…"; $("stopVoice").disabled = true;
    try { if (device) device.stopVoice(); else await models.stopVoice(); }
    catch (error) { finishVoice(session, "", errorText(error)); }
  }
  function cancelVoice() {
    const session = voiceSession;
    if (!session) return;
    voiceSession = null; session.cancelled = true;
    if (session.active && !session.stopping) {
      try {
        const stopped = device ? device.stopVoice() : models?.stopVoice();
        Promise.resolve(stopped).catch(() => {});
      } catch {}
    }
    tools(null); feedback();
  }

  function keyboardPoint() {
    const x = scene?.x ?? World.W / 2, y = scene?.y ?? World.H / 2;
    return {x, y};
  }
  function keyboardDown(e) {
    if (e.target !== canvas && e.target !== document.body) return;
    if (busy || voiceSession || studio.openNow || e.ctrlKey || e.metaKey || e.altKey) return;
    if (scene && (e.key === " " || e.key.startsWith("Arrow"))) {
      e.preventDefault();
      if (activeKey && activeKey !== e.key) { World.release(scene, keyboardPoint()); activeKey = null; }
      const p = keyboardPoint();
      if (!activeKey) { World.press(scene, p); activeKey = e.key; }
      if (e.key !== " ") {
        const diff = {ArrowLeft: [-12, 0], ArrowRight: [12, 0], ArrowUp: [0, -12], ArrowDown: [0, 12]}[e.key];
        if (diff) World.move(scene, {x: p.x + diff[0], y: p.y + diff[1]});
      }
      return;
    }
    if (e.key === "Enter") { e.preventDefault(); openChooser(center(), true); }
    else if (e.key.length === 1 && !e.isComposing) {
      e.preventDefault(); openType(center()); input.value += e.key;
    }
  }
  document.addEventListener("keydown", e => {
    delete canvas.dataset.pointing;
    if (e.key === "Escape" && !studio.openNow) {
      if (voiceSession) cancelVoice();
      else { input.blur(); tools(null); feedback(); }
      queueSketch(); return;
    }
    keyboardDown(e);
  });
  document.addEventListener("keyup", e => {
    if (activeKey !== e.key || !scene) return;
    World.release(scene, keyboardPoint()); activeKey = null;
  });
  window.addEventListener("blur", () => { if (scene) World.cancel(scene); activeKey = null; });
  document.addEventListener("visibilitychange", () => { previousTime = 0; if (!document.hidden) renderSoon(); });
  bindTool("mic", beginVoice); bindTool("stopVoice", stopVoice); bindTool("cancelVoice", cancelVoice);
  bindTool("keyboard", () => openType(anchor || center()));
  bindTool("cancelType", () => { input.blur(); tools(null); canvas.focus({preventScroll: true}); queueSketch(); });
  bindTool("menu", () => openMenu()); bindTool("more", () => openMenu()); bindTool("save", saveCurrent);
  $("bar").onsubmit = e => { e.preventDefault(); make(); };
  input.addEventListener("focus", () => {
    clearTimeout(transcriptTimer); transcriptTimer = null; feedback();
  });
  input.onkeydown = e => { if (e.isComposing && e.key === "Enter") e.stopPropagation(); };
  window.addEventListener("resize", resize);
  window.visualViewport?.addEventListener("resize", placePopover);
  window.visualViewport?.addEventListener("scroll", placePopover);
  resize(); setSaveIcon();
})();
