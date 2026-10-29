// The turntable's music: a record's YouTube link, played out of sight by the app shell (only one
// turntable plays at a time). While a record plays, the background music rests.
"use strict";

// A YouTube link -> { v } (a video, and the playlist it's in if any) or { list }, or null.
function parseYouTube(text) {
  let u;
  try { u = new URL(String(text).trim()); } catch (e) { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, ""), id = /^[\w-]{6,64}$/;
  let v = null;
  if (host === "youtu.be") v = u.pathname.slice(1).split("/")[0];
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    const m = u.pathname.match(/^\/(?:embed|shorts|live|v)\/([\w-]+)/);
    v = m ? m[1] : u.searchParams.get("v");
  } else return null;
  const list = u.searchParams.get("list");
  if (v && id.test(v)) return { v };
  if (list && id.test(list)) return { list };
  return null;
}

const turntable = {
  piece: null,       // the placed turntable playing
  status: null,      // { playing, title, error } from the player
  bgmBefore: null,   // the background music that was on before the record started
  timer: null,

  can() { return !!(window.shell && window.shell.lpPlay); },
  // Play the record on turntable `p`. Returns false (and why) when it can't.
  play(p) {
    const lp = game.state.lps[p.lp], what = lp && parseYouTube(lp.url);
    if (!lp) return "LP판을 먼저 올려 주세요.";
    if (!what) return "이 LP판에 유튜브 링크가 없습니다. 편집에서 링크를 넣어 주세요.";
    if (!this.can()) return "음악 재생은 PC에서만 됩니다.";
    const so = game.state.settings.sound;
    if (!this.piece && so.bgm >= 0) { this.bgmBefore = so.bgm; so.lastBgm = so.bgm; so.bgm = -1; }
    this.piece = p;
    this.status = { playing: false, title: "", error: "" };
    window.shell.lpPlay(what, so.lpVolume);
    clearInterval(this.timer);
    this.timer = setInterval(() => this.check(), 1500);
    game.emit("change");
    return true;
  },
  stop() {
    if (!this.piece) return;
    this.piece = null; this.status = null;
    clearInterval(this.timer); this.timer = null;
    if (window.shell && window.shell.lpStop) window.shell.lpStop();
    const so = game.state.settings.sound;
    if (this.bgmBefore != null && so.bgm < 0) so.bgm = this.bgmBefore;
    this.bgmBefore = null;
    game.emit("change");
  },
  setVolume(v) {
    game.state.settings.sound.lpVolume = v;
    if (this.piece && window.shell.lpVolume) window.shell.lpVolume(v);
  },
  playing(p) { return !!p && this.piece === p; },
  // Keep an eye on the player: a turntable put away (or its record taken off) stops the music, and
  // a video YouTube won't play here says so.
  async check() {
    const p = this.piece;
    if (!p) return;
    if (!game.allPlaced().includes(p) || p.lp == null) return this.stop();
    const st = await window.shell.lpStatus();
    if (this.piece !== p) return;
    if (!st.on) return this.stop();
    const was = this.status || {};
    this.status = st;
    if (st.error) { ui.toast("이 영상은 여기서 재생할 수 없습니다. 다른 링크를 넣어 보세요.", 4000); return this.stop(); }
    if (st.title !== was.title || st.playing !== was.playing) ui.lpStatusChanged();
  },
};

// A record as a picture: black vinyl with its label's colour.
const lpIconCache = new Map();
function lpIcon(color) {
  if (lpIconCache.has(color)) return lpIconCache.get(color);
  const c = document.createElement("canvas"), g = c.getContext("2d"), r = (col, x, y, w, h) => { g.fillStyle = col; g.fillRect(x, y, w, h); };
  c.width = c.height = 16;
  r(G0, 5, 1, 6, 14); r(G0, 3, 2, 10, 12); r(G0, 2, 3, 12, 10); r(G0, 1, 5, 14, 6);
  r(G1, 4, 4, 8, 1); r(G1, 3, 6, 1, 4); r(G1, 12, 6, 1, 4); r(G1, 4, 11, 8, 1);   // grooves
  r(COLORS[color] || G5, 6, 6, 4, 4); r(G8, 7, 7, 2, 2); r(G0, 7, 7, 1, 1);
  const url = c.toDataURL();
  lpIconCache.set(color, url);
  return url;
}
