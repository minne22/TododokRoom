// The save and its rules: earning 토독 by typing (and steadily by leaving the window open),
// buying things, and where each piece of furniture sits in which room.
"use strict";

const SAVE_KEY = "todokRoom.save.v1";

// Local date as "YYYY-MM-DD", for the per-day typing record.
function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// A room of the given kind, empty, with its own wall and floor.
function newRoom(kind, placed = []) {
  const k = ROOM_KINDS.find(x => x.id === kind);
  return { kind, placed, wall: k.wall, floor: k.floor, wallColor: k.wallColor || 0, floorColor: k.floorColor || 0 };
}

// What every home starts with (never refunded: they came free).
const STARTER_PIECES = { desk: 1, chair: 1, bed: 1, rug: 1, plant: 1, window: 1 };

function newState() {
  return {
    v: 1,
    created: false,
    look: randomLook(),
    points: 0,
    totalKeys: 0,
    days: {},            // "YYYY-MM-DD" -> key presses that day
    owned: {},           // furniture bought but not in any room: id -> count
    bought: { ...STARTER_PIECES },   // every piece had (starters + bought, less refunded): id -> count
    // Rooms, each with its pieces. Floor pieces: top-left cell (c, r); wall pieces: r = -1. A piece
    // may also have `color` (an index into COLORS; none = its original greys), `a` (turned this
    // many degrees, in tens) and `food` (meals left in a bowl).
    rooms: [newRoom("room", [
      { id: "desk", c: 3, r: 0 },
      { id: "chair", c: 3, r: 1 },
      { id: "bed", c: 0, r: 0 },
      { id: "rug", c: 3, r: 3 },
      { id: "plant", c: 8, r: 0 },
      { id: "window", c: 6, r: -1 },
    ])],
    cur: 0,              // the room on screen
    themes: ["wall:plain", "floor:tile"],
    unlocked: [],        // bought clothes/hair/accessories, as "key:index"
    pets: [],            // { kind: "cat" | "dog", color, name, full (0–100), giftIn (seconds), acc (worn accessory), hidden }
    petAcc: [],          // accessories bought for pets
    lps: [],             // LP records: { name, url (YouTube link), color (label, index into COLORS) }
    lpLists: [],         // playlists of LP records: { name, items (indices into lps, in order) }
    food: 3,             // bags of pet food
    settings: {
      // "global" (whole PC / phone) | "window" (only while this window has focus). On the phone,
      // counting other apps needs an accessibility permission, so it starts off.
      typing: window.shell && window.shell.phone ? "window" : "global",
      onTop: true,
      zoom: 2,
      sound: { mode: "typing", clip: 0, volume: 0.8, pitch: 0.5, autoPace: 0.5, bgm: -1, lastBgm: 12, bgmVolume: 0.6, lpVolume: 0.6 },
    },
    savedAt: Date.now(),
  };
}

const game = {
  state: null,
  lastKey: -1e9,       // performance.now() of the last key press
  idle: 0,             // part of a second not yet paid out
  listeners: {},

  on(name, fn) { (this.listeners[name] ||= []).push(fn); },
  emit(name, data) { (this.listeners[name] || []).forEach(fn => fn(data)); },

  load() {
    const demo = new URLSearchParams(location.search).get("demo");
    const fresh = newState();
    if (demo !== null) return this.loadDemo(fresh);
    let saved = null;
    try { saved = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) {}
    const s = saved && saved.v === 1 ? saved : fresh;
    // A save from before there were several rooms: its one room becomes 방.
    if (!s.rooms && s.placed) {
      s.rooms = [{ kind: "room", placed: s.placed, wall: s.wall || "plain", floor: s.floor || "tile", wallColor: s.wallColor || 0, floorColor: s.floorColor || 0 }];
      for (const k of ["placed", "wall", "floor", "wallColor", "floorColor"]) delete s[k];
    }
    // Fill in anything a save from an older build is missing.
    for (const k of Object.keys(fresh)) if (s[k] === undefined) s[k] = fresh[k];
    s.settings = { ...fresh.settings, ...s.settings, sound: { ...fresh.settings.sound, ...s.settings.sound } };
    s.look = { hat: 0, glasses: 0, neck: 0, hand: 0, ...s.look };
    s.pets.forEach(p => { p.full ??= 80; p.giftIn ??= PET_CARE.giftEverySec; });
    if (!s.rooms[s.cur]) s.cur = 0;
    this.settleOwned(s);
    this.state = s;
  },
  // Furniture is never thrown away, so whatever has been had (s.bought) but is neither in a room
  // nor in storage (put away wrongly, or still in hand when the app closed) goes back into storage.
  settleOwned(s) {
    const have = {};
    for (const p of s.rooms.flatMap(r => r.placed)) have[p.id] = (have[p.id] || 0) + 1;
    for (const [id, n] of Object.entries(s.owned)) have[id] = (have[id] || 0) + n;
    for (const [id, n] of Object.entries(have)) if (!(s.bought[id] >= n)) s.bought[id] = n;
    for (const [id, n] of Object.entries(s.bought)) {
      const lost = n - (have[id] || 0);
      if (lost > 0 && FURNITURE.some(f => f.id === id && !f.fixed)) s.owned[id] = (s.owned[id] || 0) + lost;
    }
  },
  // A made-up, well-furnished home for checking the art; never saved.
  loadDemo(s) {
    this.demo = true;
    Object.assign(s, { created: true, points: 43210, totalKeys: 23456 });
    s.look.name = "토독이";
    const today = new Date();
    for (let k = 0; k < 7; k++) { const d = new Date(today); d.setDate(d.getDate() - k); s.days[dayKey(d)] = 800 + ((k * 937) % 2400); }
    const home = s.rooms[0];
    home.placed.push({ id: "bookshelf", c: 7, r: 0 }, { id: "sofa", c: 6, r: 3 }, { id: "lamp", c: 8, r: 3 }, { id: "frame", c: 1, r: -1 },
      { id: "clock", c: 4, r: -1 }, { id: "lights", c: 7, r: -1 }, { id: "cushion", c: 2, r: 4 },
      { id: "bowl", c: 5, r: 4, food: 2 }, { id: "cattower", c: 8, r: 1 });
    home.wall = "stripe"; home.floor = "plank";
    s.rooms.push(newRoom("yard", [{ id: "gardentree", c: 1, r: 0 }, { id: "outbench", c: 4, r: 1 }, { id: "flowerbed", c: 6, r: 3 }, { id: "gardentree", c: 8, r: 2, color: 5 }]));
    s.themes.push("wall:stripe", "floor:plank", "wall:fence", "floor:grass");
    s.owned = { fishbowl: 1, easel: 1 };
    s.pets = [{ kind: "cat", color: 0, name: "냥이", full: 40, giftIn: 300 }];
    this.state = s;
  },
  save() {
    if (this.demo) return;
    this.state.savedAt = Date.now();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.state)); } catch (e) {}
  },
  reset() {
    const { settings, look, created } = this.state;
    this.state = { ...newState(), settings, look, created };
    this.save();
    this.emit("change");
  },

  // ---------- rooms ----------

  room(i = this.state.cur) { return this.state.rooms[i]; },
  // A room's own name if it was given one, else its kind's, numbered from the second of a kind on ("거실 2").
  roomName(i = this.state.cur) {
    const rooms = this.state.rooms, rm = rooms[i];
    if (rm.name) return rm.name;
    const n = rooms.slice(0, i + 1).filter(r => r.kind === rm.kind).length;
    return ROOM_KINDS.find(k => k.id === rm.kind).name + (n > 1 ? ` ${n}` : "");
  },
  renameRoom(i, name) {
    const rm = this.state.rooms[i];
    if (!rm) return false;
    name = String(name || "").trim().slice(0, 8);
    if (name) rm.name = name; else delete rm.name;   // left empty: back to the kind's name
    this.emit("room");
    this.emit("change");
    return true;
  },
  roomPrice(kind) { return ROOM_KINDS.find(k => k.id === kind).price + ROOM_PRICE_STEP * (this.state.rooms.length - 1); },
  buyRoom(kind) {
    const k = ROOM_KINDS.find(x => x.id === kind);
    if (!k || !this.pay(this.roomPrice(kind))) return false;
    this.state.rooms.push(newRoom(kind));
    for (const t of [`wall:${k.wall}`, `floor:${k.floor}`]) if (!this.state.themes.includes(t)) this.state.themes.push(t);
    this.emit("change");
    return true;
  },
  showRoom(i) {
    if (!this.state.rooms[i]) return;
    this.state.cur = i;
    this.emit("room");
  },
  // Every placed piece in every room.
  allPlaced() { return this.state.rooms.flatMap(r => r.placed); },

  // ---------- earning ----------

  // `n` presses at once, on `day`: the phone app hands over what it counted while closed.
  key(n = 1, d = dayKey()) {
    const s = this.state;
    s.points += EARN.perKey * n;
    s.totalKeys += n;
    s.days[d] = (s.days[d] || 0) + n;
    this.lastKey = performance.now();
    this.emit("key");
  },
  tick(dt) {
    const s = this.state;
    this.idle += dt;
    const whole = Math.floor(this.idle);
    if (whole > 0) { this.idle -= whole; s.points += whole * EARN.perSec; }
    // Pets get hungry; fed ones now and then bring a little 토독.
    s.pets.forEach((p, i) => {
      if (p.hidden) return;   // put away for now: neither hungry nor bringing gifts
      p.full = Math.max(0, p.full - PET_CARE.hungerPerSec * dt);
      if (p.full < PET_CARE.starvingBelow) return;
      p.giftIn -= dt;
      if (p.giftIn <= 0) { p.giftIn = PET_CARE.giftEverySec; s.points += PET_CARE.gift; this.emit("petGift", i); }
    });
    // Automatic feeders fill themselves from the bags in stock.
    this.allPlaced().forEach(p => { if (p.id === "feeder" && !(p.food > 0) && s.food > 0) { p.food = PET_CARE.servings; s.food--; } });
  },
  typingNow() { return performance.now() - this.lastKey < 4000; },
  today() { return this.state.days[dayKey()] || 0; },
  // The last `n` days, oldest first: [{ day, keys }].
  recent(n) {
    const out = [], now = new Date();
    for (let k = n - 1; k >= 0; k--) { const d = new Date(now); d.setDate(d.getDate() - k); const key = dayKey(d); out.push({ day: d, keys: this.state.days[key] || 0 }); }
    return out;
  },
  bestDay() { return Math.max(0, ...Object.values(this.state.days)); },

  // ---------- buying ----------

  pay(price) {
    if (this.state.points < price) return false;
    this.state.points -= price;
    return true;
  },
  buyFurniture(id) {
    const f = FURNITURE.find(x => x.id === id);
    if (!f || f.fixed || !this.pay(f.price)) return false;
    this.state.owned[id] = (this.state.owned[id] || 0) + 1;
    this.state.bought[id] = (this.state.bought[id] || 0) + 1;
    this.emit("change");
    return true;
  },
  // How many of a piece can go back to the shop: those in storage, but never the free starters.
  refundable(id) {
    const s = this.state;
    return Math.max(0, Math.min(s.owned[id] || 0, (s.bought[id] || 0) - (STARTER_PIECES[id] || 0)));
  },
  // One from storage back to the shop, for what it cost. Returns the money back (0: couldn't).
  refund(id) {
    const s = this.state, f = FURNITURE.find(x => x.id === id);
    if (!f || this.refundable(id) <= 0) return 0;
    if (!--s.owned[id]) delete s.owned[id];
    s.bought[id]--;
    s.points += f.price;
    this.emit("change");
    return f.price;
  },
  // Walls and floors: bought once, then used in any room.
  hasTheme(kind, id) { return this.state.themes.includes(`${kind}:${id}`); },
  buyTheme(kind, id) {
    const t = (kind === "wall" ? WALLPAPERS : FLOORS).find(x => x.id === id);
    if (!t || this.hasTheme(kind, id) || !this.pay(t.price)) return false;
    this.state.themes.push(`${kind}:${id}`);
    this.useTheme(kind, id);
    return true;
  },
  useTheme(kind, id) {
    if (!this.hasTheme(kind, id)) return;
    this.room()[kind] = id;
    this.emit("change");
  },
  buyCosmetic(key, index) {
    const price = cosmeticPrice(key, index), tag = `${key}:${index}`;
    if (!price || this.state.unlocked.includes(tag) || !this.pay(price)) return false;
    this.state.unlocked.push(tag);
    this.emit("change");
    return true;
  },
  // Any number of pets: the first costs less, every one after the same.
  petPrice() { return PETS.prices[Math.min(this.state.pets.length, PETS.prices.length - 1)]; },
  buyPetAcc(id) {
    const a = PET_ACCESSORIES.find(x => x.id === id);
    if (!a || this.state.petAcc.includes(id) || !this.pay(a.price)) return false;
    this.state.petAcc.push(id);
    this.emit("change");
    return true;
  },
  renamePet(i, name) {
    const pet = this.state.pets[i];
    if (!pet || !name.trim()) return false;
    pet.name = name.trim().slice(0, 8);
    this.emit("change");
    return true;
  },
  // Hidden pets stay in the list (and keep their things) but aren't in the room.
  togglePetHidden(i) {
    const pet = this.state.pets[i];
    if (!pet) return;
    if (pet.hidden) delete pet.hidden; else pet.hidden = true;
    this.emit("change");
  },
  // Off to the hotel: the pet leaves for good.
  sendToHotel(i) {
    if (!this.state.pets[i]) return null;
    const [pet] = this.state.pets.splice(i, 1);
    this.emit("petGone", i);
    this.emit("change");
    return pet;
  },
  // Put an accessory on a pet (the same one again takes it off).
  dressPet(i, id) {
    const pet = this.state.pets[i];
    if (!pet || (id && !this.state.petAcc.includes(id))) return;
    if (pet.acc === id || !id) delete pet.acc; else pet.acc = id;
    this.emit("change");
  },
  buyFood() {
    if (!this.pay(PET_CARE.bag.price)) return false;
    this.state.food += PET_CARE.bag.count;
    this.emit("change");
    return true;
  },
  // Fill a bowl with one bag; returns "ok", "full" or "empty" (no bags left).
  fillBowl(p) {
    if (p.food >= PET_CARE.servings) return "full";
    if (this.state.food <= 0) return "empty";
    p.food = PET_CARE.servings;
    this.state.food--;
    this.emit("change");
    return "ok";
  },
  // Fill every bowl in the home that isn't full; returns how many were filled.
  fillBowls() {
    let n = 0;
    this.allPlaced().forEach(p => { if (p.id === "bowl" && this.fillBowl(p) === "ok") n++; });
    return n;
  },
  adopt(kind, color, name) {
    const price = this.petPrice();
    if (price === undefined || !this.pay(price)) return false;
    this.state.pets.push({ kind, color, name: name || PETS.kinds[kind].name, full: 100, giftIn: PET_CARE.giftEverySec });
    this.emit("change");
    return true;
  },

  // ---------- furniture in a room ----------

  piece(id) { return FURNITURE.find(x => x.id === id); },
  // A piece's footprint: turned a quarter (or three), its width and depth swap.
  size(id, a = 0) {
    const [w, h] = this.piece(id).size, quarter = Math.round((a || 0) / 90) % 2;
    return quarter ? [h, w] : [w, h];
  },
  // The cells a placed piece covers.
  cells(p) {
    const [w, h] = this.size(p.id, p.a), out = [];
    for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) out.push([p.c + dx, p.r + dy]);
    return out;
  },
  // Whether `id`, turned `a` degrees, fits with its top-left at (c, r) in a room (leaving out the
  // piece `skip`). Wall pieces go on the wall row (r = -1), one per column; rugs and cushions only
  // avoid each other; everything else needs its cells free of solid pieces.
  canPlace(id, c, r, a = 0, rm = this.room(), skip = null) {
    const f = this.piece(id), others = rm.placed.filter(p => p !== skip);
    if (f.wall) return r === -1 && c >= 0 && c < ROOM.cols && !others.some(p => this.piece(p.id).wall && p.c === c);
    const [w, h] = this.size(id, a);
    if (r < 0 || c < 0 || c + w > ROOM.cols || r + h > ROOM.rows) return false;
    const mine = new Set(this.cells({ id, c, r, a }).map(([x, y]) => `${x},${y}`));
    return !others.some(p => {
      const o = this.piece(p.id);
      if (o.wall || !!o.walk !== !!f.walk) return false;
      return this.cells(p).some(([x, y]) => mine.has(`${x},${y}`));
    });
  },
  // Take a piece out of the room on screen (to move it); returns it.
  lift(p) {
    const list = this.room().placed, i = list.indexOf(p);
    if (i >= 0) list.splice(i, 1);
    this.emit("change");
    return p;
  },
  // Put a piece in the room on screen. `extra`: what it carries along (color, a, food).
  put(id, c, r, extra = {}) {
    if (!this.canPlace(id, c, r, extra.a)) return null;
    const p = { id, c, r };
    for (const k of ["color", "a", "food"]) if (extra[k]) p[k] = extra[k];
    if (extra.lp != null && this.state.lps[extra.lp]) p.lp = extra.lp;   // a turntable keeps its record on
    this.room().placed.push(p);
    this.emit("change");
    return p;
  },
  // Turn a placed piece by `by` degrees. A quarter turn needs room for the turned footprint.
  turn(p, by) {
    const a = (((p.a || 0) + by) % 360 + 360) % 360;
    if (Math.round(a / 90) % 2 !== Math.round((p.a || 0) / 90) % 2 && !this.canPlace(p.id, p.c, p.r, a, this.room(), p)) return false;
    if (a) p.a = a; else delete p.a;
    this.emit("change");
    return true;
  },
  // Nudge a placed piece a few pixels off its cells, to sit snug against its neighbours (it still
  // takes up the same cells). Wall pieces only go sideways. No arguments: back on its cells.
  nudge(p, dx = 0, dy = 0) {
    const most = 8, keep = v => Math.max(-most, Math.min(most, v));
    const ox = arguments.length > 1 ? keep((p.ox || 0) + dx) : 0, oy = arguments.length > 1 && !this.piece(p.id).wall ? keep((p.oy || 0) + dy) : 0;
    if (ox) p.ox = ox; else delete p.ox;
    if (oy) p.oy = oy; else delete p.oy;
    this.emit("change");
  },
  // Paint the wall or the floor of the room on screen (free, any time).
  paint(surface, color) {
    this.room()[surface === "wall" ? "wallColor" : "floorColor"] = color;
    this.emit("change");
  },
  // ---------- LP records ----------

  buyLp() {
    const s = this.state;
    if (!this.pay(LP.price)) return false;
    const colors = COLOR_ORDER.filter(n => n);
    s.lps.push({ name: `LP ${s.lps.length + 1}`, url: "", color: colors[s.lps.length * 5 % colors.length] });
    this.emit("change");
    return true;
  },
  editLp(i, { name, url, color }) {
    const lp = this.state.lps[i];
    if (!lp) return;
    lp.name = String(name || "").trim().slice(0, LP.nameMax) || `LP ${i + 1}`;
    lp.url = String(url || "").trim();
    if (COLORS[color] !== undefined) lp.color = color;
    this.emit("change");
  },
  // Make (k < 0) or change playlist `k`; returns its index.
  saveLpList(k, { name, items }) {
    const s = this.state, list = { name: String(name || "").trim().slice(0, LP.nameMax) || `플레이리스트 ${k < 0 ? s.lpLists.length + 1 : k + 1}`, items: items.filter(i => s.lps[i]) };
    if (k < 0 || !s.lpLists[k]) { s.lpLists.push(list); k = s.lpLists.length - 1; } else s.lpLists[k] = list;
    this.emit("change");
    return k;
  },
  deleteLpList(k) {
    this.state.lpLists.splice(k, 1);
    this.emit("change");
  },
  // Put record `i` on a turntable (taking it off any other), or take it off (i = null).
  putLp(p, i) {
    for (const q of this.allPlaced()) if (q.lp === i && q !== p) delete q.lp;
    if (i == null || !this.state.lps[i]) delete p.lp; else p.lp = i;
    this.emit("change");
  },
  store(id) {
    this.state.owned[id] = (this.state.owned[id] || 0) + 1;
    this.emit("change");
  },
  takeOut(id) {
    if (!(this.state.owned[id] > 0)) return false;
    if (!--this.state.owned[id]) delete this.state.owned[id];
    this.emit("change");
    return true;
  },
};

// 12345 -> "12,345".
const fmt = n => Math.floor(n).toLocaleString("ko-KR");
