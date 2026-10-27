// The phone app shell (Capacitor, Android): the same small set of things the desktop preload
// offers the page, plus the phone's own — the back button, being put away, and counting typing in
// other apps. That last one is an accessibility service (TypingService.java) that only notes "some
// text changed", never what it was; while the app is closed it keeps a count per day to hand over.
"use strict";

(() => {
  const cap = window.Capacitor;
  const call = (plugin, method, options = {}) => cap ? cap.nativePromise(plugin, method, options) : Promise.reject(new Error("no app shell"));
  const listen = (plugin, event, cb) => { if (cap) cap.addListener(plugin, event, cb); };

  let wantGlobal = false, allowed = false;
  const keyCbs = [], failCbs = [], allowedCbs = [], backCbs = [], pauseCbs = [];

  // Whether the accessibility service is switched on (it can be changed in the phone's settings
  // at any time, so this is asked again whenever the app comes back).
  function refresh() {
    return call("Typing", "status").then(r => {
      if (allowed === !!r.enabled) return;
      allowed = !!r.enabled;
      allowedCbs.forEach(cb => cb(allowed));
    }, () => {});
  }
  // What was typed in other apps while this one was closed: { "YYYY-MM-DD": count }.
  function takePending() {
    return call("Typing", "takePending").then(r => r.days || {}, () => ({}));
  }
  function catchUp() {
    if (!wantGlobal || !allowed) return;
    takePending().then(days => Object.entries(days).forEach(([day, n]) => { if (n > 0) keyCbs.forEach(cb => cb(n, day)); }));
  }

  // While the app is open, each change in another app (side by side, or in a pop-up window).
  listen("Typing", "keys", () => { if (wantGlobal) keyCbs.forEach(cb => cb()); });
  listen("App", "resume", () => refresh().then(catchUp));
  listen("App", "pause", () => pauseCbs.forEach(cb => cb()));
  // Back: let the page back out of what's open; otherwise put the app away (it keeps counting).
  listen("App", "backButton", () => {
    if (!backCbs.some(cb => cb())) call("App", "minimizeApp").catch(() => {});
  });

  window.shell = {
    phone: true,
    setGlobalTyping(on) {
      wantGlobal = on;
      if (!on) { takePending(); return; } // counted while off: not wanted
      refresh().then(() => allowed ? catchUp() : failCbs.forEach(cb => cb("accessibility service is off")));
    },
    onKey: cb => keyCbs.push(cb),
    onGlobalTypingFailed: cb => failCbs.push(cb),
    get typingAllowed() { return allowed; },
    onTypingAllowed: cb => allowedCbs.push(cb),
    openTypingSettings: () => call("Typing", "openSettings").catch(() => {}),
    onBack: cb => backCbs.push(cb),
    onPause: cb => pauseCbs.push(cb),
    // A window's things, which a phone screen doesn't have.
    setSize() {}, setOnTop() {}, dock() {},
    minimize: () => call("App", "minimizeApp").catch(() => {}),
    quit: () => call("App", "exitApp").catch(() => {}),
  };
})();
