// Runs inside the app (see scripts/check.js): a busy room simulated for ten minutes, reporting any
// moment over a second where the character or a pet is outside the room or inside a piece of
// furniture it shouldn't be in.
(() => {
  // A busy room: seats, beds and pet things turned every which way, four pets, two toys.
  const s = game.state, rm = s.rooms[0];
  rm.placed = [
    { id: "desk", c: 3, r: 0 }, { id: "chair", c: 3, r: 1 },
    { id: "sofa", c: 6, r: 0, a: 90 }, { id: "sofa", c: 0, r: 3 }, { id: "outbench", c: 6, r: 4, a: 180 },
    { id: "bed", c: 0, r: 0, a: 90 }, { id: "chair", c: 8, r: 2, a: 270 }, { id: "cushion", c: 2, r: 4 },
    { id: "cattower", c: 8, r: 0, a: 90 }, { id: "hideout", c: 5, r: 2 }, { id: "catwheel", c: 1, r: 1, a: 180 },
    { id: "scratcher", c: 7, r: 2 }, { id: "bowl", c: 4, r: 4, food: 3 }, { id: "toyball", c: 4, r: 2 }, { id: "toymouse", c: 2, r: 2 },
  ];
  s.pets = [0, 1, 2, 3].map(i => ({ kind: i === 3 ? "dog" : "cat", color: i, name: "p" + i, full: i * 30, giftIn: 300 }));
  pets.moves = []; room.toys.clear();
  actor.at = 0; actor.x = 4; actor.y = 3; actor.path = null; actor.doing = "stand";

  const bad = [], seen = new Set(), runs = {};
  let hits = new Set();
  const note = (what) => { hits.add(what); };
  const cellOk = (x, y) => x >= 0 && y >= 0 && x <= ROOM.cols - 1 && y <= ROOM.rows - 1;
  const solidAt = (c, r) => rm.placed.find(p => { const f = game.piece(p.id); return !f.wall && !f.walk && game.cells(p).some(([x, y]) => x === c && y === r); });
  let now = performance.now(), nightOn = false;
  const realNight = NIGHT.from;
  for (let k = 0; k < 12000; k++) {
    const dt = 0.05; now += 50;
    if (k % 600 === 0) { const typing = (k / 600) % 3 === 1; game.lastKey = typing ? performance.now() + 1e12 : -1e9; }
    if (k % 2400 === 1200) { nightOn = !nightOn; NIGHT.from = nightOn ? 0 : realNight; }
    if (k % 500 === 250) { const toy = rm.placed.find(p => p.id === (k % 1000 ? "toyball" : "toymouse")); room.kick(toy, rm, Math.random() - 0.5, Math.random() - 0.5, 120); pets.chase(toy, 0); }
    if (k % 3000 === 1500) {
      const c = Math.round(actor.x), r = Math.round(actor.y);
      if (game.canPlace("plant", c, r, 0, rm)) rm.placed.push({ id: "plant", c, r });
      const m = pets.moves[0]; if (m && game.canPlace("lamp", Math.round(m.x), Math.round(m.y), 0, rm)) rm.placed.push({ id: "lamp", c: Math.round(m.x), r: Math.round(m.y) });
    }
    lastDt = dt;
    actor.update(dt, now); pets.update(dt, now); room.updateToys(dt);
    // The character.
    const ax = Math.round(actor.x), ay = Math.round(actor.y);
    if (!cellOk(actor.x, actor.y)) note(`character outside the room (${actor.x.toFixed(1)},${actor.y.toFixed(1)}) doing ${actor.doing}`);
    if (!actor.path && actor.at === 0) {
      const solid = solidAt(ax, ay);
      if (actor.doing === "stand" && solid) note(`character standing inside ${solid.id}`);
      if (actor.doing === "sit" && !(actor.seat && game.cells(actor.seat).some(([x, y]) => x === ax && y === ay))) note(`character sitting off its seat (${ax},${ay})`);
      if (actor.doing === "type" && solid && solid.id !== "chair") note(`character typing inside ${solid.id}`);
      if (actor.doing === "sleep" && !(solid && solid.id === "bed")) note(`character sleeping outside the bed (${ax},${ay})`);
    }
    // The pets.
    s.pets.forEach((pet, i) => {
      const m = pets.moves[i];
      if (!m || m.room !== 0) return;
      if (!cellOk(m.x, m.y)) note(`${pet.kind} outside the room (${m.x.toFixed(1)},${m.y.toFixed(1)})`);
      if (m.path || m.at || m.eating > 0) return;
      const solid = solidAt(Math.round(m.x), Math.round(m.y));
      if (solid) note(`${pet.kind} sitting inside ${solid.id}${solid.a ? " (turned)" : ""} task=${m.task}`);
    });
    // Only what lasts over a second counts.
    for (const w of Object.keys(runs)) if (!hits.has(w)) delete runs[w];
    for (const w of hits) { runs[w] = (runs[w] || 0) + 1; if (runs[w] === 20 && !seen.has(w)) { seen.add(w); bad.push(w); } }
    hits = new Set();
    // The toys.
    for (const id of ["toyball", "toymouse"]) {
      const toy = rm.placed.find(p => p.id === id), st = room.toys.get(toy);
      if (!st || (Math.abs(st.vx) + Math.abs(st.vy) < 1)) { const solid = solidAt(toy.c, toy.r); if (solid && !seen.has(id)) { seen.add(id); bad.push(`${id} resting under ${solid.id}`); } }
    }
  }
  NIGHT.from = realNight;
  return JSON.stringify({ steps: 12000, problems: bad });
})()
