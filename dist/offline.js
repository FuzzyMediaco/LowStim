"use strict";
window.LowStimOffline = (() => {
  let installEvent;
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installEvent = event;
  });
  async function prepare(progress) {
    if (!window.isSecureContext || !("serviceWorker" in navigator)) throw new Error("Use the HTTPS site or the downloadable edition for offline access.");
    progress?.("Saving the slate on this device…");
    const registration = await navigator.serviceWorker.register("./sw.js");
    const worker = registration.installing || registration.waiting;
    if (worker && worker.state !== "installed" && worker.state !== "activated") await new Promise((resolve, reject) => {
      worker.addEventListener("statechange", () => {
        if (worker.state === "installed" || worker.state === "activated") resolve();
        if (worker.state === "redundant") reject(new Error("The download stopped. Reconnect and try again."));
      });
    });
    await navigator.serviceWorker.ready;
    try { await navigator.storage?.persist?.(); } catch {}
    progress?.("The slate is available offline. Install your voice and language models in Models.");
    return true;
  }
  async function install() {
    if (!installEvent) return false;
    const event = installEvent;
    installEvent = null;
    await event.prompt();
    return (await event.userChoice).outcome === "accepted";
  }
  return {prepare, install};
})();
