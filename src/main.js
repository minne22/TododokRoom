// Electron main process: a small window that sits in a corner of the screen, and the optional
// system-wide key hook.
const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");
const fs = require("fs");

let win = null;
let hook = null;           // uiohook, loaded only while system-wide typing is on
const held = new Set();    // keys currently down, so a held key counts once (key codes are never stored or sent)
const MARGIN = 12;         // gap from the screen edges when docked in a corner

// Games that run as administrator (Lost Ark and the like) hide their key presses from programs
// that don't, so counting keys inside them needs this app to run as administrator too.
const prefsFile = () => path.join(app.getPath("userData"), "prefs.json");
function loadPrefs() { try { return JSON.parse(fs.readFileSync(prefsFile(), "utf8")); } catch (e) { return {}; } }
function savePrefs(p) { try { fs.writeFileSync(prefsFile(), JSON.stringify(p)); } catch (e) {} }
let elevated = null;
function isElevated() {
  if (elevated === null) {
    try { require("child_process").execSync("net session", { stdio: "ignore", windowsHide: true }); elevated = true; } catch (e) { elevated = false; }
  }
  return elevated;
}
// Start a copy of this app as administrator (Windows asks first). Resolves true once it started,
// false if the person said no.
function launchElevated() {
  const quote = s => "'" + String(s).replace(/'/g, "''") + "'";
  const args = app.isPackaged ? [] : [app.getAppPath()];
  const cmd = `Start-Process -FilePath ${quote(process.execPath)}${args.length ? ` -ArgumentList ${args.map(a => quote(`"${a}"`)).join(",")}` : ""} -Verb RunAs`;
  return new Promise(resolve => {
    const ps = require("child_process").spawn("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", cmd], { windowsHide: true });
    ps.on("exit", code => resolve(code === 0));
    ps.on("error", () => resolve(false));
  });
}
// Hand over to an administrator copy; if that doesn't happen, carry on as we are.
async function relaunchElevated() {
  app.releaseSingleInstanceLock();
  if (await launchElevated()) { setGlobalTyping(false); app.exit(0); return true; }
  app.requestSingleInstanceLock();
  return false;
}

// Where the window was left, remembered between runs.
const placeFile = () => path.join(app.getPath("userData"), "window.json");
function loadPlace() {
  try { return JSON.parse(fs.readFileSync(placeFile(), "utf8")); } catch (e) { return null; }
}
let saveTimer = null;
function savePlace() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    if (!win || win.isDestroyed()) return;
    const [x, y] = win.getPosition(), [w, h] = win.getSize();
    try { fs.writeFileSync(placeFile(), JSON.stringify({ right: x + w, bottom: y + h })); } catch (e) {}
  }, 400);
}

// The window is placed by its bottom-right corner, so growing a panel opens upward and leftward
// from where it sits (or rightward when it is on the left half of the screen).
function placeWindow(w, h, anchor) {
  const area = screen.getDisplayNearestPoint({ x: anchor.right - 1, y: anchor.bottom - 1 }).workArea;
  const onLeft = anchor.left !== undefined;
  let x = onLeft ? anchor.left : anchor.right - w, y = anchor.bottom - h;
  x = Math.max(area.x, Math.min(area.x + area.width - w, x));
  y = Math.max(area.y, Math.min(area.y + area.height - h, y));
  win.setBounds({ x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(h) });
}
function currentAnchor() {
  const b = win.getBounds(), area = screen.getDisplayMatching(b).workArea;
  const leftHalf = b.x + b.width / 2 < area.x + area.width / 2;
  return leftHalf ? { left: b.x, right: b.x + b.width, bottom: b.y + b.height } : { right: b.x + b.width, bottom: b.y + b.height };
}

function createWindow() {
  const area = screen.getPrimaryDisplay().workArea;
  win = new BrowserWindow({
    width: 320, height: 300,
    useContentSize: true,
    frame: false,
    resizable: false,
    maximizable: false,
    alwaysOnTop: true,
    backgroundColor: "#f2f2f2",
    title: "토도독 룸",
    icon: path.join(__dirname, "icon.png"),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      // Keep counting and playing sound while the window is hidden or minimized.
      backgroundThrottling: false,
      autoplayPolicy: "no-user-gesture-required",
    },
  });
  win.removeMenu();
  const saved = loadPlace();
  placeWindow(320, 300, saved || { right: area.x + area.width - MARGIN, bottom: area.y + area.height - MARGIN });
  win.on("moved", savePlace);
  win.once("ready-to-show", () => win.show());

  // TODOK_DEMO=1: start from a made-up save (never saved), for checking the art.
  const query = process.env.TODOK_DEMO ? { demo: process.env.TODOK_DEMO } : {};
  win.loadFile(path.join(__dirname, "renderer", "index.html"), { query });

  // TODOK_SNAPSHOT=<png path>: render once, save a screenshot and quit (for checking the look).
  if (process.env.TODOK_SNAPSHOT) {
    win.webContents.on("console-message", e => console.log(`[page ${e.level}] ${e.message}`));
    win.webContents.once("did-finish-load", () => {
      setTimeout(async () => {
        // TODOK_EVAL=<js>: run a script in the page first, e.g. to open a panel or check numbers.
        try {
          if (process.env.TODOK_EVAL) console.log("[eval]", await win.webContents.executeJavaScript(process.env.TODOK_EVAL));
          await new Promise(r => setTimeout(r, 400));
          const image = await win.webContents.capturePage();
          fs.writeFileSync(process.env.TODOK_SNAPSHOT, image.toPNG());
        } catch (e) {
          console.log("[snapshot failed]", String(e));
        }
        app.quit();
      }, Number(process.env.TODOK_DELAY || 2500));
    });
  }
}

// System-wide typing: counts key presses in any program. Only "a key went down" is passed on.
function setGlobalTyping(on) {
  if (on && !hook) {
    try {
      hook = require("uiohook-napi").uIOhook;
    } catch (e) {
      win.webContents.send("global-typing-failed", String(e));
      return;
    }
    hook.on("keydown", e => {
      if (held.has(e.keycode)) return; // auto-repeat while held
      held.add(e.keycode);
      if (win && !win.isDestroyed()) win.webContents.send("key");
    });
    hook.on("keyup", e => held.delete(e.keycode));
    hook.start();
  } else if (!on && hook) {
    hook.stop();
    hook.removeAllListeners();
    hook = null;
    held.clear();
  }
}

ipcMain.on("set-global-typing", (_, on) => setGlobalTyping(on));
ipcMain.on("set-size", (_, w, h) => { if (win) placeWindow(w, h, currentAnchor()); });
ipcMain.on("set-on-top", (_, on) => { if (win) win.setAlwaysOnTop(!!on); });
// Back to the bottom-right corner of the screen the window is on.
ipcMain.on("dock", () => {
  if (!win) return;
  const area = screen.getDisplayMatching(win.getBounds()).workArea, [w, h] = win.getSize();
  placeWindow(w, h, { right: area.x + area.width - MARGIN, bottom: area.y + area.height - MARGIN });
  savePlace();
});
ipcMain.handle("admin-state", () => ({ elevated: isElevated(), always: !!loadPrefs().admin }));
ipcMain.handle("set-admin-always", async (_, on) => {
  savePrefs({ ...loadPrefs(), admin: !!on });
  return on && !isElevated() ? relaunchElevated() : true;
});
ipcMain.handle("relaunch-admin", () => relaunchElevated());
ipcMain.on("minimize", () => win.minimize());
ipcMain.on("quit", () => app.quit());

// One copy at a time: a second copy would play every key sound twice. Starting it again
// just brings the open window forward. (Snapshot runs are exempt so checks work while playing.)
async function start() {
  // Set to always run as administrator: hand over before showing anything (if Windows' question is
  // declined, it simply opens normally).
  if (!process.env.TODOK_SNAPSHOT && loadPrefs().admin && !isElevated() && await launchElevated()) return app.exit(0);
  if (!process.env.TODOK_SNAPSHOT && !app.requestSingleInstanceLock()) return app.quit();
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });
  await app.whenReady();
  createWindow();
  checkForUpdates();
}
start();

// Updates: the installed app looks for a newer release on GitHub (TododokRoom) when it starts and
// every few hours, downloads it in the background and installs it the next time the app closes.
// Special editions made for a friend (the duck one) are built without this, so they stay as they are.
function checkForUpdates() {
  if (!app.isPackaged || process.env.TODOK_SNAPSHOT || require("../package.json").edition) return;
  let updater;
  try { updater = require("electron-updater").autoUpdater; } catch (e) { return; }
  updater.autoInstallOnAppQuit = true;
  updater.on("update-downloaded", info => { if (win && !win.isDestroyed()) win.webContents.send("update-ready", info.version); });
  updater.on("error", () => {});   // offline, or GitHub unreachable: try again later
  const check = () => updater.checkForUpdates().catch(() => {});
  check();
  setInterval(check, 4 * 60 * 60 * 1000);
}
app.on("window-all-closed", () => {
  setGlobalTyping(false);
  app.quit();
});
