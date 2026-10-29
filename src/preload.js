// The small, fixed set of things the page may ask of the app shell.
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("shell", {
  setGlobalTyping: on => ipcRenderer.send("set-global-typing", on),
  onKey: cb => ipcRenderer.on("key", () => cb()),
  onGlobalTypingFailed: cb => ipcRenderer.on("global-typing-failed", (_, why) => cb(why)),
  setSize: (w, h) => ipcRenderer.send("set-size", w, h),
  setOnTop: on => ipcRenderer.send("set-on-top", on),
  dock: () => ipcRenderer.send("dock"),
  // Running as administrator, to count keys inside games that run that way.
  adminState: () => ipcRenderer.invoke("admin-state"),
  setAdminAlways: on => ipcRenderer.invoke("set-admin-always", on),
  relaunchAdmin: () => ipcRenderer.invoke("relaunch-admin"),
  onUpdateReady: cb => ipcRenderer.on("update-ready", (_, version) => cb(version)),
  // The turntable: play a YouTube video ({ v } or { list }) out of sight, change its volume, stop it.
  lpPlay: (what, volume) => ipcRenderer.send("lp-play", what, volume),
  lpVolume: v => ipcRenderer.send("lp-volume", v),
  lpStop: () => ipcRenderer.send("lp-stop"),
  lpControl: (act, n) => ipcRenderer.send("lp-control", act, n),   // "pause" | "play" | "seek" (to n s) | "skip" (by n s)
  lpStatus: () => ipcRenderer.invoke("lp-status"),
  minimize: () => ipcRenderer.send("minimize"),
  quit: () => ipcRenderer.send("quit"),
});
