"use strict";
window.LowStimAccount = (() => {
  const localOnly = Boolean(window.SlateDevice || location.hostname === "127.0.0.1" || location.hostname === "localhost" ||
    matchMedia("(display-mode: standalone)").matches || navigator.standalone);
  const remembered = "lowstim.account.v1";
  const guest = "guest";
  let user;
  try { user = JSON.parse(localStorage.getItem(remembered)) || null; } catch { user = null; }
  let offline = !navigator.onLine;
  let database;

  function open() {
    if (!database) database = new Promise((resolve, reject) => {
      const request = indexedDB.open("lowstim-creations", 1);
      request.onupgradeneeded = () => {
        const scenes = request.result.createObjectStore("scenes", {keyPath: ["owner", "id"]});
        scenes.createIndex("owner", "owner");
      };
      request.onerror = () => reject(new Error("Device storage is unavailable."));
      request.onsuccess = () => resolve(request.result);
    }).catch(error => { database = null; throw error; });
    return database;
  }
  async function store(mode, fn) {
    const db = await open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("scenes", mode);
      const result = fn(tx.objectStore("scenes"));
      tx.oncomplete = () => resolve(result?.result);
      tx.onabort = tx.onerror = () => reject(new Error("Device storage could not keep this creation. Check free space."));
    });
  }
  function remember(next) {
    user = next;
    if (next) localStorage.setItem(remembered, JSON.stringify(next));
    else localStorage.removeItem(remembered);
  }
  const snapshot = () => ({user, offline, localOnly});
  async function request(route, value) {
    let response;
    try {
      response = await fetch("/api/" + route, {
        method: value === undefined ? "GET" : "POST",
        headers: value === undefined ? {} : {"Content-Type": "application/json"},
        body: value === undefined ? undefined : JSON.stringify(value),
        credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(12000)
      });
    } catch {
      offline = true;
      throw new Error("Connect to the internet to reach your account.");
    }
    if (!response.headers.get("Content-Type")?.includes("application/json")) {
      offline = true;
      throw new Error("The account service is unavailable here.");
    }
    const data = await response.json();
    if (!response.ok) {
      offline = response.status >= 500;
      const error = new Error(data.error || "The account service is unavailable.");
      error.status = response.status;
      throw error;
    }
    offline = false;
    return data;
  }
  async function status() {
    if (window.SlateDevice || !navigator.onLine) { offline = true; return snapshot(); }
    try {
      if (localStorage.getItem("lowstim.signout")) {
        await request("logout", {});
        localStorage.removeItem("lowstim.signout");
      }
      const reply = await request("status");
      if (reply.user || !localOnly) remember(reply.user);
    } catch {}
    return snapshot();
  }
  async function authorize(mode, name, password) {
    if (window.SlateDevice) throw new Error("Open the LowStim website or downloaded edition to sign in.");
    const result = await request(mode, {name, password});
    localStorage.removeItem("lowstim.signout");
    remember(result.user);
    return snapshot();
  }
  async function logout() {
    remember(null);
    localStorage.setItem("lowstim.signout", "1");
    try { await request("logout", {}); localStorage.removeItem("lowstim.signout"); } catch {}
    return snapshot();
  }
  async function migrate() {
    const flag = "lowstim.migrated.v2";
    if (localStorage.getItem(flag)) return;
    let old;
    try { old = JSON.parse(localStorage.getItem("doodle-forge-slate-scenes-v2") || "[]"); } catch { old = []; }
    if (Array.isArray(old)) await store("readwrite", scenes => {
      old.forEach((recipe, i) => {
        if (recipe && window.Forge?.valid(recipe)) scenes.put({
          owner: guest, id: "original-" + i, title: recipe.subject + " · " + recipe.setting, recipe, savedAt: 1 - i
        });
      });
    });
    localStorage.setItem(flag, "1");
  }
  function validate(record) {
    if (!record?.id || !record.title || !window.Forge.valid(record.recipe)) throw new Error("This creation could not be opened.");
  }
  async function save(record) {
    validate(record);
    const owner = user?.id || guest;
    const pending = !localOnly && owner !== guest;
    const row = {id: record.id, title: record.title, recipe: record.recipe, savedAt: Date.now(), owner, pending};
    await store("readwrite", scenes => scenes.put(row));
    if (!pending || !navigator.onLine) return {record: row, location: pending ? "pending" : "device"};
    try {
      await request("creations", row);
      await store("readwrite", scenes => scenes.put({...row, pending: false}));
      return {record: row, location: "cloud"};
    } catch { return {record: row, location: "pending"}; }
  }
  async function list() {
    const owner = user?.id || guest;
    if (owner === guest) await migrate();
    const read = () => store("readonly", scenes => scenes.index("owner").getAll(owner));
    let rows = await read();
    if (!localOnly && owner !== guest && navigator.onLine) {
      try {
        // Reconcile precisely the account whose library was opened, including after a tab switches accounts.
        const {user: active} = await request("status");
        if (active?.id !== owner) throw new Error("Sign in to this account to sync.");
        for (const row of rows.filter(r => r.pending)) {
          await request("creations", {...row, owner});
          await store("readwrite", scenes => scenes.put({...row, pending: false}));
        }
        let offset = 0, more = true;
        while (more) {
          const page = await request("creations?owner=" + encodeURIComponent(owner) + "&offset=" + offset);
          await store("readwrite", scenes => {
            for (const row of page.creations) {
              if (row?.id && window.Forge.valid(row.recipe)) scenes.put({...row, owner, pending: false});
            }
          });
          more = page.more && page.creations.length > 0;
          offset += page.creations.length;
        }
        rows = await read();
      } catch { /* Locally committed creations remain available. */ }
    }
    return rows.sort((a,b) => b.savedAt - a.savedAt);
  }
  window.addEventListener("online", () => { if (!localOnly && user) list().catch(() => {}); });
  window.addEventListener("storage", event => {
    if (event.key === remembered) { try { user = JSON.parse(event.newValue); } catch { user = null; } }
  });
  return {status, login: (n,p) => authorize("login",n,p), register: (n,p) => authorize("register",n,p), logout, list, save};
})();
