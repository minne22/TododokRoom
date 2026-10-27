// The room: drawing it, the character and pets living in it on their own, and decorating.
// Everything is drawn at 1x on a small canvas and scaled up by whole numbers, so pixels stay crisp.
"use strict";

const T = 16;                         // cell size
const MX = 8;                         // side walls
const WALL_TOP = 8, WALL_H = 26;      // the back wall's face
const FY = WALL_TOP + WALL_H;         // where the floor starts
const RW = ROOM.cols * T + MX * 2, RH = FY + ROOM.rows * T + 6;

const rand = (a, b) => a + Math.random() * (b - a);
const isNight = () => { const h = new Date().getHours(); return h >= NIGHT.from || h < NIGHT.to; };

// ---------------------------------------------------------------------------------------------
// Walls and floors: patterns in greys.
// ---------------------------------------------------------------------------------------------
const WALL_ART = {
  plain(r, x, y, w, h) { r(G7, x, y, w, h); },
  stripe(r, x, y, w, h) { r(G7, x, y, w, h); for (let k = 2; k < w; k += 8) r(G6, x + k, y, 3, h); },
  dots(r, x, y, w, h) { r(G7, x, y, w, h); for (let j = 3, row = 0; j < h - 4; j += 6, row++) for (let k = 3 + (row % 2) * 4; k < w; k += 8) r(G5, x + k, y + j, 1, 1); },
  check(r, x, y, w, h) { r(G7, x, y, w, h); for (let j = 0; j < h; j += 6) for (let k = (j / 6 % 2) * 6; k < w; k += 12) r(G6, x + k, y + j, 6, 6); },
  brick(r, x, y, w, h) {
    r(G6, x, y, w, h);
    for (let j = 0, row = 0; j < h; j += 6, row++) {
      r(G4, x, y + j + 5, w, 1);
      for (let k = (row % 2) * 6; k < w; k += 12) r(G4, x + k, y + j, 1, 5);
    }
  },
  wood(r, x, y, w, h) { r(G5, x, y, w, h); for (let k = 0; k < w; k += 8) { r(G4, x + k, y, 1, h); r(G6, x + k + 1, y, 1, h); } },
  // The yard: a picket fence against a pale sky.
  fence(r, x, y, w, h) {
    r(G8, x, y, w, h); r(G7, x, y + h - 10, w, 10);
    r(G4, x, y + h - 14, w, 2); r(G4, x, y + h - 7, w, 2);
    for (let k = 1; k < w; k += 6) { r(G5, x + k, y + h - 18, 4, 18); r(G5, x + k + 1, y + h - 19, 2, 1); r(G6, x + k, y + h - 18, 1, 18); }
  },
};
const FLOOR_ART = {
  tile(r, x, y, w, h) {
    r(G7, x, y, w, h);
    for (let j = 0; j < h; j += 8) for (let k = 0; k < w; k += 8) { if ((j + k) / 8 % 2) r(G6, x + k, y + j, 8, 8); }
    for (let j = 0; j < h; j += 8) r(G5, x, y + j, w, 1);
    for (let k = 0; k < w; k += 8) r(G5, x + k, y, 1, h);
  },
  plank(r, x, y, w, h) {
    r(G6, x, y, w, h);
    for (let j = 0, row = 0; j < h; j += 5, row++) {
      r(G5, x, y + j + 4, w, 1);
      for (let k = (row * 11) % 24; k < w; k += 24) r(G4, x + k, y + j, 1, 4);
    }
  },
  carpet(r, x, y, w, h) { r(G5, x, y, w, h); for (let j = 1; j < h; j += 3) for (let k = (j * 7) % 5; k < w; k += 5) r(G4, x + k, y + j, 1, 1); },
  checker(r, x, y, w, h) { r(G8, x, y, w, h); for (let j = 0; j < h; j += 8) for (let k = (j / 8 % 2) * 8; k < w; k += 16) r(G4, x + k, y + j, 8, 8); },
  herring(r, x, y, w, h) {
    r(G6, x, y, w, h);
    for (let j = 0; j < h; j += 4) for (let k = 0; k < w; k += 8) {
      const flip = ((j / 4) + (k / 8)) % 2;
      r(flip ? G5 : G7, x + k, y + j, 8, 4); r(G4, x + k + (flip ? 7 : 0), y + j, 1, 4);
    }
  },
  grass(r, x, y, w, h) {
    r(G5, x, y, w, h);
    for (let j = 1; j < h; j += 4) for (let k = (j * 5) % 7; k < w; k += 7) { r(G4, x + k, y + j, 1, 2); r(G6, x + k + 2, y + j + 1, 1, 1); }
  },
  marble(r, x, y, w, h) {
    r(G8, x, y, w, h);
    for (let k = -h; k < w; k += 21) for (let j = 0; j < h; j++) if ((j + k) % 3) r(G6, x + k + j, y + j, 1, 1);
    for (let j = 0; j < h; j += 16) r(G6, x, y + j, w, 1);
    for (let k = 0; k < w; k += 16) r(G6, x + k, y, 1, h);
  },
};

// ---------------------------------------------------------------------------------------------
// Colour: everything is drawn in greys, then each grey is swapped for a shade of the chosen colour
// (dark greys to deep shades, light greys to pale tints), so the pixel shading survives.
// ---------------------------------------------------------------------------------------------
const rampCache = {};
function colorRamp(hex) {
  if (rampCache[hex]) return rampCache[hex];
  const n = parseInt(hex.slice(1), 16), base = [n >> 16, (n >> 8) & 255, n & 255], ramp = new Uint8ClampedArray(256 * 3);
  for (let L = 0; L < 256; L++) {
    const t = L / 255;
    for (let k = 0; k < 3; k++) {
      // White keeps its shading in pale greys, with the darkest lines still dark enough to read.
      ramp[L * 3 + k] = hex === "#ffffff" ? (t < 0.3 ? 70 + t / 0.3 * 140 : 210 + (t - 0.3) / 0.7 * 45)
        : t < 0.55 ? base[k] * (0.2 + 0.8 * t / 0.55) : base[k] + (255 - base[k]) * ((t - 0.55) / 0.45) * 0.8;
    }
  }
  return (rampCache[hex] = ramp);
}
function tintCanvas(c, hex) {
  const g = c.getContext("2d", { willReadFrequently: true }), img = g.getImageData(0, 0, c.width, c.height), d = img.data, ramp = colorRamp(hex);
  for (let i = 0; i < d.length; i += 4) {
    if (!d[i + 3] || d[i] !== d[i + 1] || d[i] !== d[i + 2]) continue;   // only greys are painted
    const L = d[i];
    d[i] = ramp[L * 3]; d[i + 1] = ramp[L * 3 + 1]; d[i + 2] = ramp[L * 3 + 2];
  }
  g.putImageData(img, 0, 0);
  return c;
}
// Pieces whose picture changes over time, and how: the rest are drawn once per colour.
const ANIMATED = new Set(["desk", "speaker", "fishbowl", "coffee", "lights", "fireplace", "lamp", "catwheel"]);
const tintedCache = new Map();
// How a piece turned `a` degrees is drawn: the picture to use (front, side or back), whether it's
// mirrored, and how far the picture itself is turned. Flat pieces (seen from above) simply turn;
// others turn to show their side or back when they have those pictures, plus any 10° tilt.
function viewOf(id, a = 0) {
  const q = Math.round(a / 90) % 4, tilt = a - Math.round(a / 90) * 90, f = FURNITURE.find(x => x.id === id);
  if (f.flat || f.wall) return { art: id, mirror: false, turn: a, size: f.size };
  if (q % 2 && FURN_ART[id + "_side"]) return { art: id + "_side", mirror: q === 3, turn: tilt, size: [f.size[1], f.size[0]] };
  if (q === 2 && FURN_ART[id + "_back"]) return { art: id + "_back", mirror: false, turn: tilt, size: f.size };
  return { art: id, mirror: false, turn: q % 2 && f.size[0] !== f.size[1] ? a : tilt, size: f.size };
}
// Draws a piece with its footprint's top-left at (x, y), painted `color` and turned `a` degrees.
function drawPiece(g, id, x, y, t, night, color, a = 0) {
  const hex = COLORS[color || 0];
  if (!hex && !a) return drawFurniture(g, id, x, y, t, night);
  const frame = ANIMATED.has(id) ? Math.floor(t * 8) % 32 : 0;
  const key = `${id}|${hex}|${night}|${frame}|${a}|${id === "clock" ? new Date().getHours() : ""}`;
  let c = tintedCache.get(key);
  if (!c) {
    // Drawn on its own canvas with room around the footprint for tall pieces, then painted, then
    // mirrored and/or turned on a bigger canvas about the footprint's middle.
    const v = viewOf(id, a), [w, h] = v.size;
    c = document.createElement("canvas");
    c.width = 64; c.height = 72;
    drawFurniture(c.getContext("2d", { willReadFrequently: true }), v.art, 16, 40, frame / 8, night);
    if (hex) tintCanvas(c, hex);
    const out = document.createElement("canvas"), o = out.getContext("2d");
    out.width = out.height = 96;
    o.imageSmoothingEnabled = false;
    o.translate(48, 48);
    o.rotate(v.turn * Math.PI / 180);
    if (v.mirror) o.scale(-1, 1);
    o.drawImage(c, -(16 + w * T / 2), -(40 + h * T / 2));
    c = out;
    if (tintedCache.size > 800) tintedCache.clear();
    tintedCache.set(key, c);
  }
  const [w, h] = game.size(id, a);
  g.drawImage(c, Math.round(x + w * T / 2 - 48), Math.round(y + h * T / 2 - 48));
}
// A painted wall or floor, drawn once per pattern and colour.
const surfaceCache = {};
function drawSurface(g, art, id, color, x, y, w, h) {
  const hex = COLORS[color || 0], key = `${id}|${hex}|${w}x${h}`;
  if (!hex) return art[id](rectOn(g), x, y, w, h);
  let c = surfaceCache[key];
  if (!c) {
    c = document.createElement("canvas");
    c.width = w; c.height = h;
    art[id](rectOn(c.getContext("2d", { willReadFrequently: true })), 0, 0, w, h);
    surfaceCache[key] = tintCanvas(c, hex);
  }
  g.drawImage(c, x, y);
}
const rectOn = g => (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };

// Pictures for the colour panel: a piece, or a wall/floor pattern, in one of the colours.
const iconCache = {};
function pieceIcon(id, color) {
  const key = id + "|" + (color || 0);
  if (iconCache[key]) return iconCache[key];
  const f = FURNITURE.find(x => x.id === id), [w, h] = f.size, pad = 22;
  const c = document.createElement("canvas"), g = c.getContext("2d", { willReadFrequently: true });
  c.width = w * 16 + 4; c.height = h * 16 + pad;
  drawFurniture(g, id, 2, f.wall ? 4 : pad - 2);
  if (COLORS[color || 0]) tintCanvas(c, COLORS[color]);
  // Trim to what was drawn, then scale up 2x crisp.
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let y0 = c.height, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const out = document.createElement("canvas"), o = out.getContext("2d");
  out.width = c.width * 2; out.height = (y1 - y0 + 1) * 2;
  o.imageSmoothingEnabled = false;
  o.drawImage(c, 0, y0, c.width, y1 - y0 + 1, 0, 0, out.width, out.height);
  return (iconCache[key] = out.toDataURL());
}
function surfaceIcon(kind, id, color) {
  const key = kind + id + "|" + (color || 0);
  if (iconCache[key]) return iconCache[key];
  const c = document.createElement("canvas");
  c.width = 40; c.height = 18;
  drawSurface(c.getContext("2d"), kind === "wall" ? WALL_ART : FLOOR_ART, id, color, 0, 0, 40, 18);
  return (iconCache[key] = c.toDataURL());
}

// ---------------------------------------------------------------------------------------------
// Who lives here. Positions are in cells (fractions while walking); the foot point is the
// middle of the cell, near its bottom. Each lives in one room at a time and goes between rooms
// through the door in the middle of the front wall.
// ---------------------------------------------------------------------------------------------
const DOOR = [Math.floor(ROOM.cols / 2), ROOM.rows - 1];

function walkable(c, r, rm) {
  if (c < 0 || r < 0 || c >= ROOM.cols || r >= ROOM.rows) return false;
  return !rm.placed.some(p => { const f = game.piece(p.id); return !f.wall && !f.walk && game.cells(p).some(([x, y]) => x === c && y === r); });
}
// Shortest path over a room's floor from `from` to any of `goals` (goal cells may be inside a seat).
function findPath(from, goals, rm) {
  const key = (c, r) => c + "," + r, want = new Set(goals.map(([c, r]) => key(c, r)));
  const start = [Math.round(from.x), Math.round(from.y)], prev = new Map([[key(...start), null]]), queue = [start];
  while (queue.length) {
    const [c, r] = queue.shift();
    if (want.has(key(c, r))) {
      const path = [];
      for (let at = [c, r]; at; at = prev.get(key(...at))) path.unshift(at);
      return path;
    }
    for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const n = [c + dc, r + dr];
      if (prev.has(key(...n)) || !(walkable(...n, rm) || want.has(key(...n)))) continue;
      prev.set(key(...n), [c, r]);
      queue.push(n);
    }
  }
  return null;
}
const freeCells = rm => {
  const out = [];
  for (let r = 0; r < ROOM.rows; r++) for (let c = 0; c < ROOM.cols; c++) if (walkable(c, r, rm)) out.push([c, r]);
  return out;
};
const pickOne = list => list[Math.floor(Math.random() * list.length)];

// Places to be: the desk seat (for typing), the bed (at night), seats (to rest).
// The desk seat is on the desk's front side, whichever way it's turned: { spot, dir (to face) }.
// Turned a quarter, the desk is drawn from the side with its front to the left (or, three
// quarters, to the right); turned half, from behind, so the seat is on the far side.
function deskSeat(rm) {
  const d = rm.placed.find(p => p.id === "desk");
  if (!d) return null;
  const [w, h] = game.size(d.id, d.a), q = Math.round((d.a || 0) / 90) % 4, options = [];
  if (q === 0) for (let k = 0; k < w; k++) options.push([d.c + k, d.r + h]);
  if (q === 2) for (let k = 0; k < w; k++) options.push([d.c + k, d.r - 1]);
  if (q === 1) for (let k = 0; k < h; k++) options.push([d.c - 1, d.r + k]);
  if (q === 3) for (let k = 0; k < h; k++) options.push([d.c + w, d.r + k]);
  const inside = options.filter(([c, r]) => c >= 0 && r >= 0 && c < ROOM.cols && r < ROOM.rows);
  const chair = inside.find(([c, r]) => rm.placed.some(p => p.id === "chair" && p.c === c && p.r === r));
  const spot = chair || inside.find(([c, r]) => walkable(c, r, rm)) || inside[0];
  return spot ? { spot, dir: ["up", "right", "down", "left"][q] } : null;
}
// A chair right in front of the desk is pushed in under its middle, and so is the character
// typing there: how far to shift them sideways, in pixels.
function underDesk(c, r, rm) {
  const d = rm.placed.find(p => p.id === "desk");
  if (!d || Math.round((d.a || 0) / 90) % 4) return 0;      // only in front of an unturned desk
  const [w, h] = game.size(d.id, d.a);
  if (r !== d.r + h || c < d.c || c >= d.c + w) return 0;
  return (d.c + (w - 1) / 2 - c) * T;
}
function bedSpot(rm) { const b = rm.placed.find(p => p.id === "bed"); return b ? [b.c, b.r] : null; }
function seats(rm) {
  const seat = deskSeat(rm), desk = seat && seat.spot;
  return rm.placed.flatMap(p => {
    const f = game.piece(p.id);
    if (!f.sit) return [];
    const spot = [p.c + f.sit[0], p.r + f.sit[1]];
    return desk && spot[0] === desk[0] && spot[1] === desk[1] ? [] : [{ spot, dir: f.sit[2] }];
  });
}
const REST_AFTER_MS = 20000;   // with no typing for this long, the character goes to bed for a rest
const roomWith = id => game.state.rooms.findIndex(r => r.placed.some(p => p.id === id));

const actor = {
  at: 0,                        // which room
  x: 4, y: 2, dir: "down",
  path: null, doing: "stand",   // "walk" | "stand" | "type" | "sit" | "sleep"
  then: "stand", thenDir: "down", to: null,
  until: 0, bob: 0, anim: 0,

  rm() { return game.state.rooms[this.at] || game.state.rooms[0]; },

  update(dt, now) {
    this.anim += dt;
    if (!game.state.rooms[this.at]) this.enter(0);
    const rooms = game.state.rooms, typing = game.typingNow();
    // What it should be doing right now, and where.
    let goal = null;
    const deskAt = roomWith("desk"), bedAt = roomWith("bed");
    const seat = deskAt >= 0 && deskSeat(rooms[deskAt]);
    if (typing && seat) goal = { at: deskAt, doing: "type", dir: seat.dir };
    // Not typing for a while (or night): lie down in bed and rest.
    else if ((isNight() || performance.now() - game.lastKey > REST_AFTER_MS) && bedAt >= 0) goal = { at: bedAt, doing: "sleep", dir: "down" };
    if (goal && goal.at !== this.at) {
      if (this.then !== "leave" || this.to !== goal.at) this.travel(goal.at);
    } else if (goal) {
      const spot = goal.doing === "type" ? deskSeat(this.rm()).spot : bedSpot(this.rm());
      const there = Math.round(this.x) === spot[0] && Math.round(this.y) === spot[1] && !this.path;
      if (there) { this.doing = goal.doing; this.dir = goal.dir; }
      else if (!this.path || this.then !== goal.doing) this.go(spot, goal.doing, goal.dir);
    } else if (this.doing === "type" || this.doing === "sleep") {
      this.doing = "stand"; this.until = now + rand(1000, 3000);
    } else if (!this.path && now > this.until) {
      // Pottering about: rest on a seat, wander, look in on another room, or just stand a while.
      const spots = seats(this.rm()), roll = Math.random();
      if (rooms.length > 1 && roll < 0.1) this.travel(pickOne(rooms.map((_, i) => i).filter(i => i !== this.at)));
      else if (spots.length && roll < 0.4) { const s = pickOne(spots); this.go(s.spot, "sit", s.dir); }
      else if (roll < 0.8) { const free = freeCells(this.rm()); if (free.length) this.go(pickOne(free), "stand", "down"); }
      this.until = now + rand(3500, 9000);
    }
    if (this.path) this.walk(dt);
    this.bob = Math.max(0, this.bob - dt);
  },

  // To another room: out through the door if we're watching, otherwise just there.
  travel(to) {
    this.to = to;
    if (this.at !== game.state.cur) return this.enter(to);
    this.go(DOOR, "leave", "down");   // (go() hands over straight away if there's no way to the door)
  },
  enter(to) {
    this.at = to; this.x = DOOR[0]; this.y = DOOR[1];
    this.path = null; this.doing = "stand"; this.then = "stand"; this.dir = "up"; this.until = 0;
    pets.follow();
  },
  go(spot, then, dir) {
    const path = findPath(this, [spot], this.rm());
    if (!path) { this.until = performance.now() + 2000; if (then === "leave") this.enter(this.to); return; }
    this.path = path.slice(1);
    this.then = then; this.thenDir = dir;
    this.doing = "walk";
    if (!this.path.length) this.arrive();
  },
  walk(dt) {
    let move = 2.4 * dt;
    while (move > 0 && this.path.length) {
      const [tx, ty] = this.path[0], dx = tx - this.x, dy = ty - this.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > Math.abs(dy)) this.dir = dx > 0 ? "right" : "left";
      else if (d > 0) this.dir = dy > 0 ? "down" : "up";
      if (d <= move) { this.x = tx; this.y = ty; this.path.shift(); move -= d; }
      else { this.x += dx / d * move; this.y += dy / d * move; move = 0; }
    }
    if (!this.path.length) this.arrive();
  },
  arrive() {
    this.path = null;
    if (this.then === "leave") return this.enter(this.to);
    this.doing = this.then; this.dir = this.thenDir;
  },
  onKey() { if (this.doing === "type") this.bob = 0.07; },
};

// Pets keep to the character's room, eat from a bowl when hungry (in whichever room has food), and
// use their own furniture: curl up on a cushion or in a hideout, perch on the cat tower, run in the
// wheel, play by a toy.
const pets = {
  moves: [],
  move(i) {
    if (!this.moves[i]) {
      // A new pet starts on a free cell of the character's room (or by the door).
      const rm = game.state.rooms[actor.at] || game.state.rooms[0], free = freeCells(rm), [x, y] = free.length ? pickOne(free) : DOOR;
      this.moves[i] = { room: actor.at, x, y, path: null, dir: "right", until: 0, task: null, at: null, eating: 0 };
    }
    return this.moves[i];
  },
  // Everyone in the toy's room runs after it.
  chase(toy, rmIndex) {
    game.state.pets.forEach((pet, i) => {
      const m = this.move(i);
      if (m.room !== rmIndex || m.eating > 0 || m.leaving != null) return;
      Object.assign(m, { task: "chase", goal: toy, at: null, path: null, kicks: 0, maxKicks: 2 + Math.floor(Math.random() * 4), repathAt: 0, until: performance.now() + 20000 });
    });
  },
  // After the character goes to another room, the pets come along a little later.
  follow() { this.moves.forEach(m => { if (!m.eating) m.followIn = rand(1.5, 4); }); },
  // The pieces in a room a pet of this kind can use, as [piece, cell to go to]. A scratching post
  // is used from the cell beside it (left if free, else right).
  spots(kind, use, rm) {
    return rm.placed.filter(p => { const f = game.piece(p.id); return f.pet === use && (!f.only || f.only === kind); })
      .map(p => {
        if (p.id !== "scratcher") return [p, [p.c, p.r]];
        const side = [[p.c - 1, p.r], [p.c + 1, p.r]].find(([c, r]) => walkable(c, r, rm));
        return side ? [p, side] : null;
      }).filter(Boolean);
  },
  enter(m, to) {
    Object.assign(m, { room: to, x: DOOR[0], y: DOOR[1], path: null, task: null, at: null, goal: null, leaving: null, until: 0 });
  },
  update(dt, now) {
    game.state.pets.forEach((pet, i) => {
      const m = this.move(i), rooms = game.state.rooms;
      if (!rooms[m.room]) this.enter(m, 0);
      const rm = rooms[m.room];
      if (m.x < 0 || m.y < 0 || m.x > ROOM.cols - 1 || m.y > ROOM.rows - 1) { m.x = DOOR[0]; m.y = DOOR[1]; m.path = null; }   // lost outside the room
      // Chasing a toy: run to where it is now; on reaching it, bat it off again, a few times.
      if (m.task === "chase") {
        const toy = m.goal, pos = toy && rm.placed.includes(toy) && room.toyPos(toy);
        if (!pos || now > m.until) { m.task = null; m.goal = null; m.until = now + rand(2000, 5000); }
        else if (Math.hypot(pos.x - m.x, pos.y - m.y) < 0.7) {
          if (!m.pauseUntil || now > m.pauseUntil) {
            const dx = pos.x - m.x || (Math.random() - 0.5), dy = pos.y - m.y || (Math.random() - 0.5), d = Math.hypot(dx, dy) || 1;
            room.kick(toy, rm, dx / d + rand(-0.6, 0.6), dy / d + rand(-0.6, 0.6), rand(55, 95));
            m.path = null; m.pauseUntil = now + 450;
            if (++m.kicks >= m.maxKicks) { m.task = null; m.goal = null; m.heart = 1; m.until = now + rand(3000, 7000); }
          }
        } else if (!m.path || now > m.repathAt) {
          const goal = [Math.max(0, Math.min(ROOM.cols - 1, Math.round(pos.x))), Math.max(0, Math.min(ROOM.rows - 1, Math.round(pos.y)))];
          const path = findPath(m, [goal], rm);
          m.path = path && path.length > 1 ? path.slice(1) : null;
          if (!m.path && Math.hypot(pos.x - m.x, pos.y - m.y) < 1.2) m.path = [[pos.x, pos.y]];   // close enough: pounce
          m.repathAt = now + 400;
        }
      }
      if (m.eating > 0) {
        m.eating -= dt;
        if (m.eating <= 0) {
          const bowl = m.at;
          m.at = null; m.task = null;
          if (bowl && bowl.food > 0) {
            bowl.food--;
            pet.full = 100;
            m.heart = 1;
            if (m.room === game.state.cur) { const f = room.foot(m.x, m.y); room.float("냠냠", f.x, f.y - 14); }
            game.emit("change");
          }
        }
        return;
      }
      // Hungry with no food here but some in another room: go there.
      const hungry = pet.full < PET_CARE.hungryBelow, hasFood = r => this.spots(pet.kind, "food", r).some(([p]) => p.food > 0);
      let wantRoom = m.room;
      if (hungry && !hasFood(rm)) { const k = rooms.findIndex(hasFood); if (k >= 0) wantRoom = k; }
      else if (m.followIn !== undefined && (m.followIn -= dt) <= 0) { delete m.followIn; wantRoom = actor.at; }
      if (wantRoom !== m.room && m.leaving !== wantRoom) {
        if (m.room !== game.state.cur) this.enter(m, wantRoom);
        else { const path = findPath(m, [DOOR], rm); if (path) { m.path = path.slice(1); m.leaving = wantRoom; m.task = null; } else this.enter(m, wantRoom); }
      }
      if (!m.path && now > m.until && m.leaving == null && m.task !== "chase") {
        m.at = null; m.task = null;
        const roll = Math.random(), food = hungry && this.spots(pet.kind, "food", rm).filter(([p]) => p.food > 0);
        let pick = null;
        if (food && food.length) pick = { list: food, task: "eat" };
        else if (isNight() || roll < 0.25) pick = { list: this.spots(pet.kind, "rest", rm), task: "rest" };
        else if (roll < 0.5) pick = { list: this.spots(pet.kind, "play", rm), task: "play" };
        if (pick && pick.list.length) {
          const [piece, cell] = pickOne(pick.list);
          // A toy on its own: go and bat it about for a bit.
          if (piece.id === "toyball" || piece.id === "toymouse") Object.assign(m, { task: "chase", goal: piece, kicks: 0, maxKicks: 1 + Math.floor(Math.random() * 3), repathAt: 0, until: now + 15000 });
          else {
            const path = findPath(m, [cell], rm);
            if (path) { m.path = path.slice(1); m.task = pick.task; m.goal = piece; }
          }
        }
        if (!m.task) {
          // Mostly near the character (when in the same room); sometimes anywhere.
          const near = m.room === actor.at && Math.random() < 0.6, cx = Math.round(actor.x), cy = Math.round(actor.y);
          const free = freeCells(rm).filter(([c, r]) => !(near && c === cx && r === cy) && (!near || Math.abs(c - cx) + Math.abs(r - cy) <= 2));
          const path = free.length && findPath(m, [pickOne(free)], rm);
          if (path) m.path = path.slice(1);
        }
        if (m.task !== "chase") m.until = now + (m.task ? rand(9000, 20000) : rand(3000, 8000));
      }
      if (m.path) {
        let move = (m.task === "chase" ? 2.8 : 1.6) * dt;
        while (move > 0 && m.path.length) {
          const [tx, ty] = m.path[0], dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
          if (dx) m.dir = dx < 0 ? "left" : "right";
          if (d <= move) { m.x = tx; m.y = ty; m.path.shift(); move -= d; } else { m.x += dx / d * move; m.y += dy / d * move; move = 0; }
        }
        if (!m.path.length) {
          m.path = null;
          if (m.leaving != null) return this.enter(m, m.leaving);
          // Arrived: settle into whatever it came for (if it's still there).
          if (m.task === "chase") { /* keeps chasing */ }
          else if (m.task && rm.placed.includes(m.goal)) {
            m.at = m.goal;
            if (m.task === "eat") m.eating = 2.5;
            if (m.at.id === "scratcher") m.dir = m.at.c > m.x ? "right" : "left";   // face the post
          } else m.task = null;
        }
      }
      if (m.at && !rm.placed.includes(m.at)) { m.at = null; m.task = null; }   // its spot was moved
      if (m.heart) m.heart = Math.max(0, m.heart - dt);
      if (m.room === game.state.cur && pet.full < PET_CARE.starvingBelow && Math.random() < dtChance(0.08)) { const f = room.foot(m.x, m.y); room.float("배고파", f.x, f.y - 14); }
    });
  },
};

// ---------------------------------------------------------------------------------------------
// Drawing the room on screen
// ---------------------------------------------------------------------------------------------
const room = {
  canvas: null, g: null, zoom: 2, time: 0,
  floats: [],          // little rising words: { text, x, y, t }
  // Decorating: { held: { id, color, a, keep, from } | null (the piece being carried), hover: [c, r] | null,
  // over: the placed piece under the pointer, selected: the placed piece clicked on }.
  deco: null,

  init(canvas) {
    this.canvas = canvas;
    this.canvas.width = RW; this.canvas.height = RH;
    this.g = canvas.getContext("2d");
    this.setZoom(game.state.settings.zoom);
  },
  setZoom(z) {
    this.zoom = z;
    this.canvas.style.width = RW * z + "px";
    this.canvas.style.height = RH * z + "px";
  },

  float(text, x, y) { this.floats.push({ text, x, y, t: 0 }); },

  // Toys that roll about when batted: per toy, its offset from its cell in pixels, speed and spin.
  toys: new Map(),
  kick(toy, rm, dx, dy, speed) {
    const st = this.toys.get(toy) || { ox: 0, oy: 0, vx: 0, vy: 0, spin: 0, rm };
    const d = Math.hypot(dx, dy) || 1;
    st.vx = dx / d * speed; st.vy = dy / d * speed; st.rm = rm;
    this.toys.set(toy, st);
  },
  // Where a toy is now, in cells.
  toyPos(toy) { const st = this.toys.get(toy); return { x: toy.c + (st ? st.ox / T : 0), y: toy.r + (st ? st.oy / T : 0) }; },
  updateToys(dt) {
    for (const [toy, st] of this.toys) {
      if (!st.rm.placed.includes(toy)) { this.toys.delete(toy); continue; }
      const speed = Math.hypot(st.vx, st.vy);
      if (speed > 4) {
        st.ox += st.vx * dt; st.oy += st.vy * dt;
        st.spin += speed * dt * (st.vx >= 0 ? 6 : -6);
        // Bounce off the walls.
        const ax = toy.c * T + st.ox, ay = toy.r * T + st.oy;
        if (ax < 0 || ax > (ROOM.cols - 1) * T) { st.vx *= -0.6; st.ox = Math.max(-toy.c * T, Math.min((ROOM.cols - 1 - toy.c) * T, st.ox)); }
        if (ay < 0 || ay > (ROOM.rows - 1) * T) { st.vy *= -0.6; st.oy = Math.max(-toy.r * T, Math.min((ROOM.rows - 1 - toy.r) * T, st.oy)); }
        const k = Math.pow(0.2, dt);   // rolling slows down
        st.vx *= k; st.vy *= k;
      } else {
        st.vx = st.vy = 0;
        // Come to rest: belong to the nearest free cell, then ease onto it.
        const nc = Math.round(toy.c + st.ox / T), nr = Math.round(toy.r + st.oy / T);
        if ((nc !== toy.c || nr !== toy.r) && game.canPlace(toy.id, nc, nr, toy.a, st.rm, toy)) { st.ox += (toy.c - nc) * T; st.oy += (toy.r - nr) * T; toy.c = nc; toy.r = nr; }
        const e = Math.pow(0.02, dt);
        st.ox *= e; st.oy *= e;
        if (Math.abs(st.ox) < 0.3 && Math.abs(st.oy) < 0.3 && Math.abs(st.spin % 360) < 1) { this.toys.delete(toy); continue; }
        st.spin = Math.round(st.spin / 10) * 10;
      }
    }
  },
  point(e) { const b = this.canvas.getBoundingClientRect(); return { x: (e.clientX - b.left) / this.zoom, y: (e.clientY - b.top) / this.zoom }; },

  // Where a placed piece shows on screen (a chair pushed in under the desk sits half a cell over).
  pieceBox(p) {
    const f = game.piece(p.id), [w, h] = game.size(p.id, p.a);
    const x = MX + p.c * T + (p.id === "chair" ? underDesk(p.c, p.r, game.room()) : 0);
    return f.wall ? { x, y: WALL_TOP + 2, w: T, h: WALL_H - 4 } : { x, y: FY + p.r * T, w: w * T, h: h * T };
  },
  // Page point -> the placed piece shown there (a solid piece before a rug), or null.
  pieceAtPoint(e) {
    const { x, y } = this.point(e);
    let best = null;
    for (const p of game.room().placed) {
      const q = this.pieceBox(p);
      if (x < q.x || x >= q.x + q.w || y < q.y || y >= q.y + q.h) continue;
      if (!best || game.piece(best.id).walk) best = p;
    }
    return best;
  },
  // Page point -> cell; r = -1 on the wall, null outside the room.
  cellAt(e) {
    const { x, y } = this.point(e), c = Math.floor((x - MX) / T);
    if (c < 0 || c >= ROOM.cols) return null;
    if (y >= WALL_TOP && y < FY) return [c, -1];
    const r = Math.floor((y - FY) / T);
    return r >= 0 && r < ROOM.rows ? [c, r] : null;
  },
  // Whether a page point is on the door (the gap in the front wall, below the middle cell).
  onDoor(e) {
    if (game.state.rooms.length < 2) return false;
    const { x, y } = this.point(e), dx = MX + DOOR[0] * T;
    return x >= dx && x < dx + T && y >= FY + ROOM.rows * T - 4 && y < RH;
  },
  // Page point -> who's there (character or a pet), for a little reaction when clicked.
  creatureAt(e) {
    const { x, y } = this.point(e), cur = game.state.cur;
    const near = (cx, cy, w, h) => { const f = this.foot(cx, cy); return x > f.x - w / 2 && x < f.x + w / 2 && y > f.y - h && y < f.y + 2; };
    const i = pets.moves.findIndex((m, k) => game.state.pets[k] && m.room === cur && near(m.x, m.y, 14, 12));
    if (i >= 0) return { pet: i };
    if (actor.at === cur && near(actor.x, actor.y, 16, 28)) return { me: true };
    return null;
  },
  foot(x, y) { return { x: Math.round(MX + x * T + T / 2), y: Math.round(FY + y * T + T - 2) }; },

  frame(dt) {
    this.time += dt;
    const now = performance.now();
    actor.update(dt, now);
    pets.update(dt, now);
    this.updateToys(dt);
    const g = this.g, s = game.state, rm = game.room(), cur = s.cur, night = isNight(), t = this.time;
    const r = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };

    // Shell: walls round the room, the wallpaper, the floor, the door in the front wall.
    r(G2, 0, 0, RW, RH);
    drawSurface(g, WALL_ART, WALL_ART[rm.wall] ? rm.wall : "plain", rm.wallColor, MX, WALL_TOP, ROOM.cols * T, WALL_H);
    r(G3, MX, FY - 3, ROOM.cols * T, 3); r(G4, MX, FY - 3, ROOM.cols * T, 1);           // skirting
    drawSurface(g, FLOOR_ART, FLOOR_ART[rm.floor] ? rm.floor : "tile", rm.floorColor, MX, FY, ROOM.cols * T, ROOM.rows * T);
    r("rgba(0, 0, 0, .08)", MX, FY, ROOM.cols * T, 3);                                    // the wall's shadow
    r(G1, 0, 0, RW, 2); r(G3, 2, 2, RW - 4, 1);
    r(G1, 0, 0, 2, RH); r(G1, RW - 2, 0, 2, RH); r(G1, 0, RH - 2, RW, 2);
    if (s.rooms.length > 1) {
      const dx = MX + DOOR[0] * T, dy = FY + ROOM.rows * T;
      r(G0, dx + 1, dy, T - 2, RH - dy - 2); r(G4, dx + 3, dy - 3, T - 6, 3); r(G3, dx + 3, dy - 1, T - 6, 1);   // the doorway, a mat
    }

    // Wall pieces.
    rm.placed.forEach(p => { if (game.piece(p.id).wall) drawPiece(g, p.id, MX + p.c * T, WALL_TOP + 6, t, night, p.color, p.a); });

    // Floor pieces, the character and pets, back to front. Rugs and cushions go first.
    const items = [], here = actor.at === cur;
    rm.placed.forEach(p => {
      const f = game.piece(p.id);
      if (f.wall) return;
      const [, h] = game.size(p.id, p.a);
      const toy = this.toys.get(p);
      const x = MX + p.c * T + (p.id === "chair" ? underDesk(p.c, p.r, rm) : 0) + (toy ? toy.ox : 0), y = FY + p.r * T + (toy ? toy.oy : 0);
      const turned = toy ? (((p.a || 0) + Math.round(toy.spin / 10) * 10) % 360 + 360) % 360 : p.a;
      const busy = p.id !== "catwheel" || s.pets.some((pet, i) => pets.moves[i] && pets.moves[i].at === p && !pets.moves[i].path);
      items.push({ d: f.walk ? -1 : y + h * T - 1, draw: () => {
        drawPiece(g, p.id, x, y, busy ? t : 0, night, p.color, turned);
        if (p.a) return;
        if ((p.id === "bowl" || p.id === "feeder") && p.food > 0) this.drawFood(g, x, y + (p.id === "feeder" ? -2 : 0), p.food);
        if (p.id === "hideout" || p.id === "doghouse") this.drawPeek(g, p, x, y);
        if (p.id === "bed" && here && actor.doing === "sleep" && Math.round(actor.x) === p.c && Math.round(actor.y) === p.r) this.drawSleeper(g, x, y);
      } });
    });
    if (here && !(actor.doing === "sleep" && rm.placed.some(p => p.id === "bed" && !p.a && p.c === Math.round(actor.x) && p.r === Math.round(actor.y)))) {
      const f = this.foot(actor.x, actor.y), cx = Math.round(actor.x), cy = Math.round(actor.y);
      // Typing on the desk chair: drawn just before the chair, so its back hides all but the head
      // and shoulders, the way someone sitting at a desk looks from behind.
      const onChair = actor.doing === "type" && actor.dir === "up" && rm.placed.some(p => p.id === "chair" && p.c === cx && p.r === cy);
      items.push({ d: onChair ? FY + cy * T + T - 1.5 : f.y + (actor.doing === "type" ? T : 0.5), draw: () => this.drawMe(g, f) });
    }
    s.pets.forEach((pet, i) => {
      const m = pets.moves[i];
      if (!m || m.room !== cur) return;
      const at = m.at && !m.path ? m.at : null, f = this.foot(m.x, m.y);
      if (at && !at.a && (at.id === "hideout" || at.id === "doghouse")) return;     // inside: drawn with the piece
      if (at && !at.a && at.id === "cattower") return items.push({ d: FY + at.r * T + T - 0.5, draw: () => this.drawPet(g, pet, m, { x: f.x, y: f.y - 16 }) });
      if (at && at.id === "scratcher" && pet.kind === "cat") return items.push({ d: f.y + 0.2, draw: () => this.drawPet(g, pet, m, { x: f.x + (m.dir === "left" ? -6 : 6), y: f.y }, false, true) });
      if (at && !at.a && at.id === "catwheel") return items.push({ d: FY + at.r * T + T - 0.5, draw: () => this.drawPet(g, pet, { ...m, dir: "right" }, { x: MX + at.c * T + T, y: f.y - 4 }, true) });
      items.push({ d: f.y + 0.2, draw: () => this.drawPet(g, pet, m, f) });
    });
    items.sort((a, b) => a.d - b.d).forEach(it => it.draw());

    if (night) r("rgba(18, 22, 44, .22)", 0, 0, RW, RH);
    if (this.deco) this.drawDeco(g, r);

    // Rising words ("톡", "zZ", hearts).
    g.font = "8px Galmuri7, monospace"; g.textAlign = "center";
    this.floats = this.floats.filter(f => (f.t += dt) < 1.2);
    for (const f of this.floats) {
      g.globalAlpha = Math.min(1, (1.2 - f.t) * 2);
      g.fillStyle = "#262626"; g.fillText(f.text, f.x + 1, f.y - f.t * 10 + 1);
      g.fillStyle = "#ffffff"; g.fillText(f.text, f.x, f.y - f.t * 10);
    }
    g.globalAlpha = 1;
  },

  drawMe(g, f) {
    const sitting = actor.doing === "sit" || actor.doing === "type";
    const pose = actor.doing === "walk" ? "walk" : "stand";
    const y = f.y - (sitting ? 2 : 0) - (actor.bob > 0 ? 1 : 0);
    const x = f.x + (actor.doing === "type" ? underDesk(Math.round(actor.x), Math.round(actor.y), actor.rm()) : 0);
    drawCharacter(g, game.state.look, x, y, actor.dir, pose, actor.anim);
  },
  // Asleep in bed: the head on the pillow, the blanket pulled up, and the odd "z".
  drawSleeper(g, x, y) {
    const r = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(a, b, w, h); };
    g.save();
    g.beginPath(); g.rect(x, y - 6, 16, 16); g.clip();
    drawCharacter(g, game.state.look, x + 8, y + 22, "down", "stand", 0.2);
    g.restore();
    r(G5, x + 1, y + 9, 14, 18); r(G6, x + 1, y + 9, 14, 2); r(G4, x + 1, y + 26, 14, 1);
    for (let k = 0; k < 3; k++) r(G4, x + 1, y + 15 + k * 4, 14, 1);
    if (Math.random() < dtChance(isNight() ? 0.6 : 0.2)) this.float(isNight() ? "z" : "~", x + 12, y - 2);   // asleep, or just resting
  },
  // Kibble in a bowl: fuller bowls are heaped higher.
  drawFood(g, x, y, n) {
    const r = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(a, b, w, h); };
    for (let k = 0; k < 4 + n * 2; k++) r(k % 2 ? "#8a5a3b" : "#b8834f", x + 4 + (k * 3) % 8, y + 8 - (k % 3 === 0 && n > 1 ? 1 : 0), 2, 1);
  },
  // A pet tucked inside a hideout or dog house: just its eyes in the dark doorway.
  drawPeek(g, p, x, y) {
    const inside = game.state.pets.some((pet, i) => pets.moves[i] && pets.moves[i].at === p && !pets.moves[i].path);
    if (!inside || Math.floor(this.time * 0.7) % 5 === 0) return;      // a blink now and then
    const ex = p.id === "doghouse" ? x + 13 : x + 6, ey = p.id === "doghouse" ? y + 6 : y + 7;
    g.fillStyle = "#f6f2ea"; g.fillRect(ex, ey, 1, 1); g.fillRect(ex + 3, ey, 1, 1);
  },
  drawPet(g, pet, m, f, running = false, scratching = false) {
    const [, main, dark] = PETS.kinds[pet.kind].colors[pet.color];
    const walking = !!m.path || running;
    // Scratching: paws going up and down, with a little rest now and then.
    const name = scratching ? (Math.floor(this.time * 6) % 2 && Math.floor(this.time / 2) % 3 ? "ScratchA" : "ScratchB")
      : walking ? (Math.floor(this.time * (running ? 10 : 4)) % 2 ? "WalkA" : "WalkB") : "Sit";
    const sp = petSprite(pet.kind + name, main, dark, pet.acc);
    g.save();
    if (m.dir === "left") { g.translate(Math.round(f.x + sp.width / 2), 0); g.scale(-1, 1); g.drawImage(sp, 0, f.y - sp.height); }
    else g.drawImage(sp, Math.round(f.x - sp.width / 2), f.y - sp.height);
    g.restore();
    if (m.heart) drawSprite(g, "heart", f.x, f.y - 12 - Math.round((1 - m.heart) * 4));
  },

  // Decorating: the grid, the piece under the pointer, and the piece being carried.
  drawDeco(g, r) {
    const d = this.deco, rm = game.room();
    g.fillStyle = "rgba(38, 38, 38, .18)";
    for (let c = 0; c <= ROOM.cols; c++) g.fillRect(MX + c * T, FY, 1, ROOM.rows * T);
    for (let k = 0; k <= ROOM.rows; k++) g.fillRect(MX, FY + k * T, ROOM.cols * T, 1);
    for (let c = 0; c <= ROOM.cols; c++) g.fillRect(MX + c * T, WALL_TOP + 2, 1, WALL_H - 5);
    const box = (q, color, k = 1) => { r(color, q.x, q.y, q.w, k); r(color, q.x, q.y + q.h - k, q.w, k); r(color, q.x, q.y, k, q.h); r(color, q.x + q.w - k, q.y, k, q.h); };
    if (d.selected && rm.placed.includes(d.selected)) box(this.pieceBox(d.selected), "#f2cf5b", 2);
    if (!d.hover) return;
    const [c, row] = d.hover;
    if (d.held) {
      const f = game.piece(d.held.id), [w, h] = game.size(d.held.id, d.held.a), ok = game.canPlace(d.held.id, c, row, d.held.a);
      const x = MX + c * T + (d.held.id === "chair" ? underDesk(c, row, rm) : 0), y = f.wall ? WALL_TOP + 6 : FY + row * T;
      g.globalAlpha = 0.7;
      if (f.wall ? row === -1 : row >= 0) drawPiece(g, d.held.id, x, y, this.time, false, d.held.color, d.held.a);
      g.globalAlpha = 1;
      box({ x, y: f.wall ? WALL_TOP + 2 : y, w: w * T, h: f.wall ? WALL_H - 4 : h * T }, ok ? "#3f8a3c" : "#c8483c");
    } else if (d.over && d.over !== d.selected) {
      box(this.pieceBox(d.over), "#ffffff");
    }
  },
};

// Chance per frame for something that should happen about `perSec` times a second.
let lastDt = 1 / 60;
const dtChance = perSec => perSec * lastDt;
