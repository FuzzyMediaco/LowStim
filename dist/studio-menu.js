"use strict";
function createStudioMenu({device, current, lastPlanner, onNew, onRefine, onOpenRecord, onClose}) {
  const $ = id => document.getElementById(id);
  const dialog = $("collection");
  const accounts = globalThis.LowStimAccount;
  const models = globalThis.LowStimModels;
  const levels = {
    low: "A picture you can pick up and move.",
    medium: "Gentle movement and small interactions.",
    high: "More motion and simple play.",
    "extra high": "Busier worlds with more moving parts.",
    max: "The full range of games, motion, and interactions."
  };
  let level = "medium";
  try {
    const saved = localStorage.getItem("lowstim-stimulation");
    if (Object.hasOwn(levels, saved)) level = saved;
  } catch {}
  const nameOf = level => level.charAt(0).toUpperCase() + level.slice(1);
  function showLevel() {
    const radio = Array.from($("levels").querySelectorAll("input")).find(el => el.value === level);
    radio.checked = true;
    $("levelInfo").textContent = levels[level] + " Applies to your next creation.";
  }
  $("levels").addEventListener("change", event => {
    if (!Object.hasOwn(levels, event.target.value)) return;
    level = event.target.value;
    showLevel();
    try { localStorage.setItem("lowstim-stimulation", level); }
    catch { $("levelInfo").textContent = nameOf(level) + " selected for this session."; }
  });
  showLevel();

  let revision = 0, accountBusy = false;
  const errorMessage = error => error?.message || "This action could not finish. Try again.";
  function accountCaption(status) {
    if (status?.user) {
      if (status.localOnly) return "Signed in as " + status.user.name + ". Creations save on this device.";
      if (status.offline) return "Signed in as " + status.user.name + ". Offline changes stay on this device until you reconnect.";
      return "Signed in as " + status.user.name + ". Creations save to your account.";
    }
    return "Guest creations save on this device.";
  }
  async function accountPanel(version) {
    $("accountForm").hidden = true;
    $("logout").hidden = true;
    if (!accounts || device) {
      $("accountInfo").textContent = "Use the hosted or installed web edition to sign in. This edition keeps guest creations on this device.";
      return;
    }
    try {
      const status = await accounts.status();
      if (version !== revision) return;
      $("accountInfo").textContent = accountCaption(status) + (status.user ? "" : " Sign in to open your account.");
      $("accountForm").hidden = Boolean(status.user);
      $("logout").hidden = !status.user;
    } catch (error) {
      if (version !== revision) return;
      $("accountInfo").textContent = errorMessage(error);
      $("accountForm").hidden = false;
    }
  }
  async function accountAction(action) {
    if (accountBusy || !accounts) return;
    const user = $("username").value.trim(), password = $("password").value;
    if (action === "register" && (!/^[A-Za-z0-9_-]{3,32}$/.test(user) || password.length < 10)) {
      $("accountNotice").textContent = "Use 3–32 letters, numbers, dashes, or underscores for your username and at least 10 characters for your password.";
      return;
    }
    accountBusy = true;
    $("accountNotice").textContent = "Working…";
    const buttons = [...$("accountForm").querySelectorAll("button"), $("logout")];
    buttons.forEach(button => button.disabled = true);
    try {
      if (action === "logout") await accounts.logout();
      else await accounts[action](user, password);
      $("password").value = "";
      $("accountNotice").textContent = "";
      await accountPanel(revision);
    } catch (error) { $("accountNotice").textContent = errorMessage(error); }
    finally { accountBusy = false; buttons.forEach(button => button.disabled = false); }
  }
  $("accountForm").onsubmit = event => {
    event.preventDefault();
    accountAction(event.submitter?.value === "register" ? "register" : "login");
  };
  $("logout").onclick = () => accountAction("logout");

  async function libraryPanel(version) {
    const list = $("saved");
    list.replaceChildren();
    $("savePlace").textContent = "Opening library…";
    if (!accounts) {
      $("savePlace").textContent = "Storage is unavailable in this edition.";
      return;
    }
    try {
      const status = await accounts.status();
      if (version !== revision) return;
      const records = await accounts.list();
      if (version !== revision) return;
      $("savePlace").textContent = accountCaption(status);
      for (const record of records) {
        if (!Forge.valid(record.recipe)) continue;
        const button = document.createElement("button");
        button.textContent = record.title || record.recipe.name || record.recipe.subject;
        button.onclick = () => { dialog.close(); onOpenRecord(record); };
        list.append(button);
      }
      if (!list.children.length) list.textContent = "Use the save icon on a creation to keep it here.";
    } catch (error) {
      if (version === revision) $("savePlace").textContent = errorMessage(error);
    }
  }

  const modelControls = {
    planner: {info: $("modelInfo"), get: $("getPlanner"), file: $("importPlanner"), label: "Qwen"},
    speech: {info: $("speechInfo"), get: $("getSpeech"), file: $("importSpeech"), label: "Whisper"}
  };
  const installing = new Set();
  let fileKind = "planner";
  async function offlinePanel() {
    $("plannerInfo").textContent = lastPlanner() ? "Last creation used " + lastPlanner() + "." : "";
    $("offlineEdition").hidden = Boolean(device);
    const downloaded = ["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) && location.port === "41731";
    const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone;
    $("downloadApp").hidden = $("downloadFull").hidden = downloaded;
    $("installApp").hidden = downloaded;
    $("editionInfo").textContent = downloaded ?
      "This desktop edition saves creations on this device. If you downloaded both models, use Enable below to prepare the included files offline." :
      standalone ? "This installed slate saves creations on this device, including when you sign in. Download both models here for offline language and speech." :
      "Get the desktop ZIP with Qwen and Whisper (about 540 MB), or keep this slate in your browser and download each model below. Installed editions save on this device.";
    if (device) {
      $("model").hidden = false;
      $("modelInfo").textContent = device.hasModel() ? "Qwen is available on this device." : "Choose a local Qwen GGUF file to enable language planning.";
      $("speechInfo").textContent = "Whisper is bundled with this edition.";
      return;
    }
    let status;
    try { status = await models?.status(); }
    catch (error) {
      for (const {info} of Object.values(modelControls)) info.textContent = errorMessage(error);
      return;
    }
    for (const [kind, control] of Object.entries(modelControls)) {
      if (installing.has(kind)) continue;
      control.get.textContent = (downloaded ? "Enable " : "Download ") + control.label;
      control.get.hidden = !status?.supported || status[kind];
      control.file.hidden = !status?.supported || status[kind];
      control.info.textContent = status?.[kind] ? control.label + " is ready on this device." : (
        status?.supported ? (kind === "planner" ? "Qwen plans with the building blocks on this device (491 MB)." : "Whisper turns speech into text on this device (32 MB).") : "Local model setup is unavailable in this browser."
      );
    }
  }
  async function setupModel(kind, file) {
    if (!models || installing.has(kind)) return;
    installing.add(kind);
    const control = modelControls[kind];
    control.get.disabled = control.file.disabled = true;
    const update = fraction => {
      const progress = Number.isFinite(fraction) ? " " + Math.round(Math.min(1, Math.max(0, fraction)) * 100) + "%" : "";
      control.info.textContent = (file ? "Importing " : "Downloading ") + control.label + progress + "…";
    };
    update(0);
    try {
      if (file) await models.importFile(kind, file, update);
      else await models.install(kind, update);
      installing.delete(kind);
      await offlinePanel();
    } catch (error) { control.info.textContent = errorMessage(error); }
    finally { installing.delete(kind); control.get.disabled = control.file.disabled = false; }
  }
  for (const [kind, control] of Object.entries(modelControls)) {
    control.get.onclick = () => setupModel(kind);
    control.file.onclick = () => {
      fileKind = kind;
      $("modelFile").accept = kind === "planner" ? ".gguf" : ".bin";
      $("modelFile").click();
    };
  }
  $("modelFile").onchange = () => {
    const file = $("modelFile").files[0];
    $("modelFile").value = "";
    if (file) setupModel(fileKind, file);
  };
  $("model").onclick = () => device?.importModel();
  window.slateModelResult = message => {
    $("modelInfo").textContent = message;
    $("model").disabled = false;
  };
  $("installApp").onclick = async () => {
    const button = $("installApp");
    const offline = globalThis.LowStimOffline;
    if (!offline) { $("offlineInfo").textContent = "Offline installation is unavailable here."; return; }
    button.disabled = true;
    $("offlineInfo").textContent = "Keeping the slate on this device…";
    try {
      await offline.prepare();
      const prompted = await offline.install();
      $("offlineInfo").textContent = prompted ? "Offline files are ready." : "Offline files are ready. You can reopen this address offline or use your browser’s Install or Add to Home Screen command.";
    } catch (error) { $("offlineInfo").textContent = errorMessage(error); }
    finally { button.disabled = false; }
  };
  function select(tab) {
    const version = ++revision;
    for (const item of dialog.querySelectorAll("[data-tab]")) {
      const active = item.dataset.tab === tab;
      item.setAttribute("aria-pressed", active);
      $("panel-" + item.dataset.tab).hidden = !active;
    }
    $("refine").hidden = !current();
    if (tab === "library") libraryPanel(version);
    if (tab === "account") accountPanel(version);
    if (tab === "offline") offlinePanel();
  }
  for (const button of dialog.querySelectorAll("[data-tab]")) button.onclick = () => select(button.dataset.tab);
  $("close").onclick = () => dialog.close();
  $("new").onclick = () => { dialog.close(); onNew(); };
  $("refine").onclick = () => { dialog.close(); onRefine(); };
  dialog.addEventListener("close", () => {
    revision++;
    $("password").value = "";
    $("accountNotice").textContent = "";
    onClose();
  });
  dialog.addEventListener("click", event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
  return {
    open(tab = "slate") {
      select(tab);
      if (!dialog.open) dialog.showModal();
    },
    get level() { return level; },
    get openNow() { return dialog.open; }
  };
}
