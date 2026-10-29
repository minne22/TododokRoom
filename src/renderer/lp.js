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
  status: null,      // { playing, paused, ended, at, dur, title, error } from the player
  queue: null,       // playing one of the playlists: { list (index into lpLists), pos }
  bgmBefore: null,   // the background music that was on before the record started
  timer: null,

  can() { return !!(window.shell && window.shell.lpPlay); },
  // Play the record on turntable `p` (as part of playlist `queue`, or on its own). Returns true, or
  // why it can't.
  play(p, queue = null) {
    const lp = game.state.lps[p.lp], what = lp && parseYouTube(lp.url);
    if (!lp) return "LP판을 먼저 올려 주세요.";
    if (!what) return "이 LP판에 유튜브 링크가 없습니다. 편집에서 링크를 넣어 주세요.";
    if (!this.can()) return "음악 재생은 PC에서만 됩니다.";
    const so = game.state.settings.sound;
    if (!this.piece && so.bgm >= 0) { this.bgmBefore = so.bgm; so.lastBgm = so.bgm; so.bgm = -1; }
    this.piece = p; this.queue = queue;
    this.status = { playing: false, title: "", error: "", at: 0, dur: 0 };
    window.shell.lpPlay(what, so.lpVolume);
    clearInterval(this.timer);
    this.timer = setInterval(() => this.check(), 1000);
    game.emit("change");
    return true;
  },
  stop() {
    if (!this.piece) return;
    this.piece = null; this.status = null; this.queue = null;
    clearInterval(this.timer); this.timer = null;
    if (window.shell && window.shell.lpStop) window.shell.lpStop();
    const so = game.state.settings.sound;
    if (this.bgmBefore != null && so.bgm < 0) so.bgm = this.bgmBefore;
    this.bgmBefore = null;
    game.emit("change");
  },
  // "pause" | "play" | "seek" (to n seconds) | "skip" (by n seconds).
  control(act, n) {
    if (!this.piece || !window.shell.lpControl) return;
    window.shell.lpControl(act, n);
    const st = this.status || {};
    if (act === "pause") Object.assign(st, { paused: true, playing: false });
    if (act === "play") Object.assign(st, { paused: false, playing: true });
    if (act === "seek") st.at = n;
    if (act === "skip") st.at = Math.max(0, Math.min(st.dur || 1e9, (st.at || 0) + n));
    ui.lpStatusChanged();
  },
  togglePause() { this.control(this.status && this.status.paused ? "play" : "pause"); },
  // The next record: the playlist's next (round again at its end), or else the next record with a
  // link. A record on its own with nothing after it starts over.
  next() {
    const p = this.piece, s = game.state;
    if (!p) return;
    const list = this.queue && s.lpLists[this.queue.list];
    if (list && list.items.length) {
      const pos = (this.queue.pos + 1) % list.items.length;
      game.putLp(p, list.items[pos]);
      return this.play(p, { list: this.queue.list, pos });
    }
    const n = s.lps.length;
    for (let k = 1; k <= n; k++) {
      const i = ((p.lp || 0) + k) % n;
      if (i !== p.lp && parseYouTube(s.lps[i].url)) { game.putLp(p, i); return this.play(p); }
    }
    this.control("seek", 0); this.control("play");
  },
  // Play playlist `k` on turntable `p` from its first record.
  playList(p, k) {
    const list = game.state.lpLists[k];
    if (!list || !list.items.length) return "플레이리스트가 비어 있습니다.";
    game.putLp(p, list.items[0]);
    return this.play(p, { list: k, pos: 0 });
  },
  setVolume(v) {
    game.state.settings.sound.lpVolume = v;
    if (this.piece && window.shell.lpVolume) window.shell.lpVolume(v);
  },
  playing(p) { return !!p && this.piece === p; },
  // Keep an eye on the player: a turntable put away (or its record taken off) stops the music, a
  // record that's done moves on, and a video YouTube won't play here says so.
  async check() {
    const p = this.piece;
    if (!p) return;
    if (!game.allPlaced().includes(p) || p.lp == null) return this.stop();
    const st = await window.shell.lpStatus();
    if (this.piece !== p) return;
    if (!st.on) return this.stop();
    if (st.error) { ui.toast("이 영상은 여기서 재생할 수 없습니다. 다른 링크를 넣어 보세요.", 4000); return this.stop(); }
    this.status = st;
    if (st.ended) return this.next();
    ui.lpStatusChanged();
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
