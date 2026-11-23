"use strict";
const {contextBridge,ipcRenderer}=require("electron");
contextBridge.exposeInMainWorld("LowStimDesktop",{
  hasModel:()=>ipcRenderer.sendSync("model:present"),
  importModel:()=>ipcRenderer.invoke("model:select"),
  plan:(prompt,grammar)=>ipcRenderer.invoke("model:plan",prompt,grammar),
  transcribe:recording=>ipcRenderer.invoke("voice:transcribe",recording),
});
