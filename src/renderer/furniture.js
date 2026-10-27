// Furniture and fixtures in the 3/4 top-down view, kept simple: black, white and greys only.
// Each draw function gets the top-left of its footprint on screen (x, y) and may reach above it
// for tall pieces; it returns the box it covered, for clicking.
"use strict";

// The interior's whole palette, darkest to lightest.
const G0 = "#262626", G1 = "#404040", G2 = "#5c5c5c", G3 = "#7d7d7d", G4 = "#a3a3a3", G5 = "#c8c8c8", G6 = "#e2e2e2", G7 = "#f2f2f2", G8 = "#ffffff";

const FURN_ART = {
  rug(r, x, y) {
    r(G3, x + 3, y + 3, 26, 1); r(G3, x + 2, y + 4, 28, 8); r(G3, x + 3, y + 12, 26, 1);
    r(G6, x + 4, y + 5, 24, 6);
    for (let k = 0; k < 6; k++) r(G5, x + 6 + k * 4, y + 7, 2, 2);
    r(G2, x + 3, y + 12, 26, 1);
    for (let k = 0; k < 4; k++) { r(G7, x + 1, y + 5 + k * 2, 1, 1); r(G7, x + 30, y + 5 + k * 2, 1, 1); }
    return { x: x + 1, y: y + 3, w: 30, h: 10 };
  },

  lamp(r, x, y, t, night) {
    if (night) { r("rgba(255, 255, 255, .12)", x - 6, y - 10, 28, 26); r("rgba(255, 255, 255, .14)", x - 2, y - 6, 20, 18); }
    r(G0, x + 4, y + 12, 8, 2); r(G2, x + 5, y + 11, 6, 1);
    r(G1, x + 7, y - 4, 2, 15);
    r(G7, x + 4, y - 11, 8, 1); r(G8, x + 3, y - 10, 10, 5); r(G5, x + 2, y - 5, 12, 2);
    return { x: x + 2, y: y - 11, w: 12, h: 25 };
  },

  plant(r, x, y) {
    r(G1, x + 4, y + 7, 8, 1); r(G8, x + 3, y + 8, 10, 3); r(G6, x + 4, y + 11, 8, 3); r(G4, x + 5, y + 14, 6, 1);
    r(G3, x + 5, y - 4, 6, 11); r(G3, x + 2, y - 1, 12, 6); r(G3, x + 3, y - 3, 10, 2);
    r(G5, x + 4, y - 2, 2, 2); r(G5, x + 8, y - 4, 2, 3); r(G5, x + 11, y, 2, 2);
    r(G1, x + 7, y + 1, 1, 6); r(G1, x + 3, y + 4, 3, 1); r(G1, x + 10, y + 3, 3, 1);
    return { x: x + 2, y: y - 4, w: 12, h: 19 };
  },

  chair(r, x, y) {
    r(G1, x + 3, y - 4, 10, 8); r(G2, x + 4, y - 3, 8, 6); r(G3, x + 4, y - 3, 8, 1);
    r(G1, x + 2, y + 4, 12, 6); r(G6, x + 3, y + 5, 10, 4);
    r(G1, x + 2, y + 10, 2, 4); r(G1, x + 12, y + 10, 2, 4);
    return { x: x + 2, y: y - 4, w: 12, h: 18 };
  },

  table(r, x, y) {
    r(G2, x + 3, y + 1, 10, 1); r(G2, x + 1, y + 2, 14, 7); r(G2, x + 3, y + 9, 10, 1);
    r(G8, x + 3, y + 2, 10, 6); r(G8, x + 2, y + 3, 12, 4);
    r(G6, x + 3, y + 7, 10, 1);
    r(G1, x + 3, y + 9, 10, 2);
    r(G1, x + 7, y + 11, 2, 3); r(G0, x + 5, y + 14, 6, 1);
    r(G3, x + 9, y + 3, 3, 3); r(G1, x + 10, y + 1, 1, 2); // a little vase
    return { x: x + 1, y: y + 1, w: 14, h: 14 };
  },

  bed(r, x, y) {
    r(G1, x, y - 5, 16, 6); r(G2, x + 1, y - 4, 14, 2);
    r(G1, x, y + 1, 1, 29); r(G1, x + 15, y + 1, 1, 29);
    r(G7, x + 1, y + 1, 14, 27);
    r(G8, x + 3, y + 2, 10, 6); r(G6, x + 3, y + 7, 10, 1);   // pillow
    r(G8, x + 1, y + 9, 14, 2);                               // folded sheet
    r(G5, x + 1, y + 11, 14, 16); r(G4, x + 1, y + 26, 14, 1);
    for (let k = 0; k < 3; k++) r(G4, x + 1, y + 15 + k * 4, 14, 1);
    r(G1, x, y + 27, 16, 4); r(G2, x + 1, y + 27, 14, 1);
    return { x, y: y - 5, w: 16, h: 36 };
  },

  // Wall pieces: (x, y) is the top-left of the wall face tile.
  frame(r, x, y) {
    r(G0, x + 2, y + 2, 12, 9); r(G8, x + 3, y + 3, 10, 7);
    r(G5, x + 4, y + 7, 8, 2); r(G3, x + 6, y + 5, 3, 2); r(G2, x + 9, y + 4, 2, 1);
    return { x: x + 2, y: y + 2, w: 12, h: 9 };
  },
  clock(r, x, y) {
    r(G0, x + 4, y + 2, 8, 1); r(G0, x + 3, y + 3, 10, 7); r(G0, x + 4, y + 10, 8, 1);
    r(G8, x + 4, y + 3, 8, 7);
    r(G0, x + 8, y + 4, 1, 3);                                       // minute hand
    const h = Math.floor(new Date().getHours() % 12 / 3);              // hour hand, roughly
    r(G0, x + 8 + [0, 1, 0, -2][h], y + 6 + [-2, 0, 1, 0][h], [1, 2, 1, 2][h], [2, 1, 2, 1][h]);
    return { x: x + 3, y: y + 2, w: 10, h: 9 };
  },

  bookshelf(r, x, y) {
    r(G1, x + 1, y - 12, 14, 28); r(G2, x + 1, y - 12, 14, 2);
    const books = [G8, G4, G6, G3, G7, G5];
    for (let s = 0; s < 3; s++) {
      const top = y - 9 + s * 8;
      r(G0, x + 2, top, 12, 6);
      let bx = x + 2;
      for (let k = 0; bx < x + 13; k++) {
        const bw = 1 + ((k + s) % 3 === 0 ? 2 : 1), bh = 4 + ((k * 3 + s) % 3);
        r(books[(k * 2 + s) % books.length], bx, top + 6 - bh, Math.min(bw, x + 14 - bx), bh);
        bx += bw;
      }
      r(G2, x + 2, top + 6, 12, 1);
    }
    return { x: x + 1, y: y - 12, w: 14, h: 28 };
  },

  radio(r, x, y) {
    r(G2, x + 2, y + 9, 12, 2); r(G1, x + 3, y + 11, 2, 3); r(G1, x + 11, y + 11, 2, 3);
    r(G0, x + 11, y - 3, 1, 5);
    r(G1, x + 2, y + 1, 12, 8); r(G6, x + 3, y + 2, 10, 6);
    r(G2, x + 4, y + 3, 4, 4); for (let k = 0; k < 2; k++) r(G4, x + 4, y + 4 + k * 2, 4, 1);
    r(G8, x + 9, y + 3, 3, 2); r(G0, x + 10, y + 6, 1, 1);
    return { x: x + 2, y: y - 3, w: 12, h: 17 };
  },

  desk(r, x, y, t, night) {
    r(G2, x + 1, y - 1, 30, 9); r(G7, x + 2, y, 28, 7);
    r(G1, x + 1, y + 8, 30, 2); r(G1, x + 2, y + 10, 2, 4); r(G1, x + 28, y + 10, 2, 4);
    r(G0, x + 14, y - 3, 4, 3);                                       // monitor stand
    r(G0, x + 8, y - 15, 16, 12); r(night ? G2 : G5, x + 9, y - 14, 14, 10);
    const line = Math.floor(t * 2) % 4;                                // text scrolling as you type
    for (let k = 0; k < 4; k++) r(G8, x + 10, y - 13 + k * 2, k === line ? 6 : 10 - k * 2, 1);
    r(G5, x + 9, y + 2, 14, 3); for (let k = 0; k < 6; k++) r(G3, x + 10 + k * 2, y + 3, 1, 1); // keyboard
    r(G8, x + 25, y + 1, 3, 4); r(G2, x + 25, y + 1, 3, 1);            // mug
    return { x: x + 1, y: y - 15, w: 30, h: 29 };
  },

  sofa(r, x, y) {
    r(G2, x + 2, y - 6, 28, 9); r(G4, x + 3, y - 5, 26, 7); r(G5, x + 3, y - 5, 26, 1);
    r(G5, x + 4, y + 3, 24, 7); r(G6, x + 4, y + 3, 24, 1); r(G3, x + 15, y + 3, 1, 7);
    r(G2, x + 1, y - 2, 4, 13); r(G4, x + 1, y - 2, 3, 12); r(G2, x + 27, y - 2, 4, 13); r(G4, x + 28, y - 2, 3, 12);
    r(G2, x + 2, y + 10, 28, 2);
    r(G0, x + 3, y + 12, 2, 2); r(G0, x + 27, y + 12, 2, 2);
    r(G8, x + 6, y - 2, 4, 4); // a cushion
    return { x: x + 1, y: y - 6, w: 30, h: 20 };
  },

  piano(r, x, y) {
    r(G0, x + 1, y - 14, 30, 24); r(G1, x + 2, y - 13, 28, 2);
    r(G3, x + 12, y - 9, 8, 3);                                       // music stand
    r(G8, x + 2, y + 2, 28, 5);
    for (let k = 0; k < 13; k++) r(G5, x + 4 + k * 2, y + 2, 1, 5);
    for (const k of [1, 2, 4, 5, 6, 8, 9, 11]) r(G0, x + 3 + k * 2, y + 2, 2, 3);
    r(G0, x + 1, y + 7, 30, 3);
    r(G0, x + 2, y + 10, 2, 4); r(G0, x + 28, y + 10, 2, 4);
    return { x: x + 1, y: y - 14, w: 30, h: 28 };
  },

  fireplace(r, x, y, t) {
    r(G1, x, y - 16, 32, 3); r(G2, x, y - 16, 32, 1);
    r(G6, x + 1, y - 13, 30, 26);
    for (let row = 0; row < 6; row++) for (let k = 0; k < 4; k++) r(G4, x + 1 + k * 8 + (row % 2) * 4, y - 13 + row * 4, 1, 4);
    for (let row = 1; row < 7; row++) r(G4, x + 1, y - 13 + row * 4, 30, 1);
    r(G0, x + 8, y - 4, 16, 16); r(G0, x + 9, y - 5, 14, 1);
    const f = Math.floor(t * 8) % 3;                                    // a flickering white flame
    r(G3, x + 10, y + 4 - f, 12, 7 + f); r(G6, x + 12, y + 6 - f, 8, 5 + f); r(G8, x + 14 + (f % 2), y + 8 - f, 4, 3 + f);
    r(G1, x + 10, y + 10, 12, 2);
    return { x, y: y - 16, w: 32, h: 30 };
  },

  cushion(r, x, y) {
    r(G2, x + 3, y + 5, 10, 8); r(G6, x + 4, y + 6, 8, 6); r(G7, x + 4, y + 6, 8, 1); r(G4, x + 7, y + 8, 2, 2);
    return { x: x + 3, y: y + 5, w: 10, h: 8 };
  },
  fridge(r, x, y) {
    r(G1, x + 2, y - 14, 12, 28); r(G7, x + 3, y - 13, 10, 9); r(G7, x + 3, y - 3, 10, 15); r(G8, x + 3, y - 13, 10, 1);
    r(G3, x + 11, y - 10, 1, 4); r(G3, x + 11, y, 1, 6);
    r(G4, x + 5, y - 11, 2, 2);                                        // a magnet
    r(G0, x + 3, y + 12, 2, 2); r(G0, x + 11, y + 12, 2, 2);
    return { x: x + 2, y: y - 14, w: 12, h: 28 };
  },
  speaker(r, x, y, t) {
    r(G0, x + 4, y - 6, 8, 19); r(G1, x + 4, y - 6, 8, 1);
    const beat = Math.floor(t * 4) % 2;                                 // the cone moves with the music
    r(G3, x + 6, y - 4, 4, 4); r(G2, x + 7, y - 3, 2, 2);
    r(G3, x + 5 - beat, y + 3 - beat, 6 + beat * 2, 6 + beat * 2); r(G1, x + 7, y + 5, 2, 2);
    return { x: x + 4, y: y - 6, w: 8, h: 19 };
  },
  easel(r, x, y) {
    r(G2, x + 3, y + 1, 1, 13); r(G2, x + 12, y + 1, 1, 13); r(G2, x + 8, y - 2, 1, 15);
    r(G1, x + 2, y - 11, 12, 12); r(G8, x + 3, y - 10, 10, 10);
    r(G4, x + 5, y - 8, 3, 2); r(G3, x + 9, y - 6, 2, 3); r(G5, x + 5, y - 4, 4, 2); r(G2, x + 10, y - 9, 1, 1);
    r(G3, x + 2, y + 1, 12, 1);
    return { x: x + 2, y: y - 11, w: 12, h: 25 };
  },
  fishbowl(r, x, y, t) {
    r(G1, x + 4, y + 8, 8, 6); r(G2, x + 5, y + 9, 6, 4);
    r(G4, x + 3, y - 2, 10, 10); r(G8, x + 4, y - 1, 8, 8); r(G6, x + 4, y + 2, 8, 5);
    const fx = x + 5 + [0, 1, 2, 3, 4, 3, 2, 1][Math.floor(t * 2) % 8];
    r(G2, fx, y + 4, 2, 1); r(G2, fx + (fx > x + 7 ? 2 : -1), y + 4, 1, 1);
    r(G8, x + 5, y, 2, 1);
    return { x: x + 3, y: y - 2, w: 10, h: 16 };
  },
  cattower(r, x, y) {
    r(G3, x + 7, y - 16, 3, 28);
    r(G5, x + 2, y - 17, 12, 3); r(G4, x + 2, y - 15, 12, 1);
    r(G5, x + 4, y - 5, 10, 3); r(G4, x + 4, y - 3, 10, 1);
    r(G1, x + 1, y + 10, 14, 4); r(G4, x + 2, y + 11, 12, 2);
    r(G2, x + 4, y - 14, 1, 5); r(G8, x + 3, y - 9, 3, 2);              // a dangling toy
    return { x: x + 1, y: y - 17, w: 14, h: 31 };
  },
  coffee(r, x, y, t) {
    r(G2, x + 1, y + 5, 14, 3); r(G1, x + 2, y + 8, 2, 6); r(G1, x + 12, y + 8, 2, 6);
    r(G0, x + 4, y - 7, 8, 12); r(G3, x + 5, y - 6, 6, 3); r(G8, x + 6, y, 3, 4); r(G0, x + 7, y - 2, 1, 2);
    if (Math.floor(t * 3) % 2) { r(G7, x + 7, y - 9, 1, 1); r(G7, x + 8, y - 11, 1, 1); }   // steam
    return { x: x + 1, y: y - 7, w: 14, h: 21 };
  },
  // More wall pieces.
  window(r, x, y, t, night) {
    r(G1, x + 1, y, 14, 13);
    r(night ? G1 : G8, x + 2, y + 1, 12, 11);
    if (night) { r(G7, x + 10, y + 3, 2, 2); r(G5, x + 4, y + 2, 1, 1); r(G5, x + 6, y + 8, 1, 1); }
    else { r(G6, x + 3, y + 7, 5, 2); r(G7, x + 4, y + 6, 3, 1); }   // a cloud
    r(G2, x + 7, y + 1, 1, 11); r(G2, x + 2, y + 6, 12, 1);
    r(G4, x, y + 13, 16, 2);
    return { x, y, w: 16, h: 15 };
  },
  shelf(r, x, y) {
    r(G2, x + 1, y + 10, 14, 2); r(G3, x + 2, y + 12, 1, 2); r(G3, x + 13, y + 12, 1, 2);
    r(G8, x + 2, y + 5, 3, 5); r(G4, x + 6, y + 7, 2, 3); r(G1, x + 9, y + 3, 2, 7); r(G5, x + 12, y + 6, 2, 4);
    return { x: x + 1, y: y + 3, w: 14, h: 11 };
  },
  lights(r, x, y, t) {
    for (let k = 0; k < 16; k++) r(G2, x + k, y + 2 + Math.round(Math.sin(k / 2.5) * 1.5), 1, 1);
    for (let k = 0; k < 4; k++) {
      const on = (Math.floor(t * 2) + k) % 2 === 0, bx = x + 1 + k * 4, by = y + 3 + Math.round(Math.sin((bx - x) / 2.5) * 1.5);
      r(on ? G8 : G5, bx, by, 2, 2); if (on) r("rgba(255, 255, 255, .25)", bx - 1, by - 1, 4, 4);
    }
    return { x, y: y + 1, w: 16, h: 7 };
  },

  // ---------- kitchen and yard ----------
  sink(r, x, y) {
    r(G1, x + 1, y - 2, 30, 12); r(G7, x + 2, y - 1, 28, 9); r(G8, x + 2, y - 1, 28, 1);
    r(G3, x + 5, y + 1, 12, 6); r(G5, x + 6, y + 2, 10, 4); r(G1, x + 10, y + 4, 2, 1);   // basin
    r(G1, x + 10, y - 6, 2, 5); r(G1, x + 10, y - 6, 5, 2); r(G4, x + 13, y - 4, 1, 2);    // tap
    r(G2, x + 20, y + 1, 8, 2); r(G2, x + 21, y + 4, 6, 2);                               // a dish rack
    r(G1, x + 1, y + 10, 30, 4); r(G6, x + 2, y + 10, 13, 3); r(G6, x + 16, y + 10, 14, 3); r(G3, x + 14, y + 11, 1, 2); r(G3, x + 17, y + 11, 1, 2);
    return { x: x + 1, y: y - 6, w: 30, h: 20 };
  },
  stove(r, x, y, t) {
    r(G1, x + 1, y - 2, 14, 16); r(G6, x + 2, y - 1, 12, 9); r(G7, x + 2, y + 9, 12, 4);
    r(G1, x + 3, y, 4, 3); r(G1, x + 9, y, 4, 3); r(G1, x + 3, y + 4, 4, 3); r(G1, x + 9, y + 4, 4, 3);   // burners
    if (Math.floor(t * 6) % 2) { r(G8, x + 4, y + 1, 2, 1); }                                   // a little flame
    r(G2, x + 3, y + 10, 10, 1); r(G0, x + 4, y + 11, 2, 1); r(G0, x + 10, y + 11, 2, 1);
    return { x: x + 1, y: y - 2, w: 14, h: 16 };
  },
  gardentree(r, x, y) {
    r(G1, x + 6, y + 2, 4, 10); r(G3, x + 7, y + 2, 2, 10);
    r(G2, x + 1, y - 14, 14, 14); r(G2, x + 3, y - 16, 10, 2); r(G2, x, y - 10, 16, 8);
    r(G4, x + 2, y - 13, 12, 12); r(G5, x + 4, y - 12, 4, 3); r(G5, x + 9, y - 8, 3, 3); r(G3, x + 6, y - 6, 3, 2);
    r(G1, x + 3, y + 11, 10, 3); r(G4, x + 4, y + 11, 8, 1);
    return { x, y: y - 16, w: 16, h: 30 };
  },
  outbench(r, x, y) {
    for (let k = 0; k < 3; k++) r(k % 2 ? G4 : G5, x + 2, y - 4 + k * 3, 28, 2);            // back slats
    r(G1, x + 2, y + 5, 28, 1);
    for (let k = 0; k < 3; k++) r(k % 2 ? G5 : G6, x + 2, y + 6 + k * 2, 28, 2);            // seat slats
    r(G0, x + 3, y - 6, 2, 20); r(G0, x + 27, y - 6, 2, 20);
    return { x: x + 2, y: y - 6, w: 28, h: 20 };
  },
  flowerbed(r, x, y) {
    r(G2, x + 1, y + 3, 30, 11); r(G4, x + 2, y + 4, 28, 9);
    for (let k = 0; k < 7; k++) {
      const fx = x + 4 + k * 4, fy = y + 5 + (k % 2) * 3;
      r(G2, fx + 1, fy + 2, 1, 3); r(k % 3 ? G8 : G6, fx, fy, 3, 2); r(G1, fx + 1, fy, 1, 1);
    }
    return { x: x + 1, y: y + 3, w: 30, h: 11 };
  },

  // ---------- for pets ----------
  bowl(r, x, y) {
    r(G1, x + 3, y + 7, 10, 1); r(G1, x + 2, y + 8, 12, 4); r(G2, x + 3, y + 12, 10, 1);
    r(G6, x + 3, y + 8, 10, 2); r(G4, x + 4, y + 9, 8, 1);
    return { x: x + 2, y: y + 7, w: 12, h: 6 };
  },
  feeder(r, x, y) {
    r(G2, x + 5, y, 6, 1); r(G1, x + 5, y + 1, 6, 8); r(G7, x + 6, y + 2, 4, 3); r(G5, x + 6, y + 5, 4, 3);   // the hopper, food inside
    r(G1, x + 2, y + 9, 12, 5); r(G6, x + 3, y + 9, 10, 2); r(G4, x + 4, y + 10, 8, 1);
    return { x: x + 2, y, w: 12, h: 14 };
  },
  petbed(r, x, y) {
    r(G2, x + 3, y + 4, 10, 1); r(G2, x + 2, y + 5, 12, 8); r(G2, x + 3, y + 13, 10, 1);
    r(G5, x + 3, y + 5, 10, 8); r(G7, x + 5, y + 7, 6, 4); r(G6, x + 5, y + 10, 6, 1);
    return { x: x + 2, y: y + 4, w: 12, h: 10 };
  },
  toyball(r, x, y) {
    r(G1, x + 6, y + 7, 5, 1); r(G1, x + 5, y + 8, 7, 4); r(G1, x + 6, y + 12, 5, 1);
    r(G7, x + 6, y + 8, 5, 4); r(G3, x + 6, y + 10, 5, 1); r(G8, x + 7, y + 8, 2, 1);
    return { x: x + 5, y: y + 7, w: 7, h: 6 };
  },
  toymouse(r, x, y) {
    r(G2, x + 1, y + 11, 4, 1); r(G2, x + 4, y + 10, 1, 1);                    // tail
    r(G1, x + 5, y + 8, 7, 5); r(G5, x + 6, y + 9, 5, 3); r(G1, x + 10, y + 7, 2, 2); r(G7, x + 10, y + 8, 1, 1);
    r(G0, x + 11, y + 10, 1, 1);
    return { x: x + 1, y: y + 7, w: 11, h: 6 };
  },
  scratcher(r, x, y) {
    r(G1, x + 2, y + 10, 12, 4); r(G4, x + 3, y + 11, 10, 2);
    r(G1, x + 5, y - 10, 6, 21); r(G6, x + 6, y - 9, 4, 19);
    for (let k = -8; k < 10; k += 2) r(G4, x + 6, y + k, 4, 1);             // rope
    r(G2, x + 3, y - 12, 10, 3); r(G4, x + 4, y - 12, 8, 1);
    r(G7, x + 11, y - 9, 1, 4); r(G7, x + 12, y - 6, 2, 2);                 // a dangling pompom
    return { x: x + 2, y: y - 12, w: 12, h: 26 };
  },
  hideout(r, x, y) {
    r(G2, x + 5, y - 5, 6, 1); r(G2, x + 3, y - 4, 10, 2); r(G2, x + 2, y - 2, 12, 15);
    r(G5, x + 4, y - 3, 8, 2); r(G5, x + 3, y - 1, 10, 13); r(G6, x + 4, y - 3, 3, 1);
    r(G0, x + 6, y + 3, 4, 1); r(G0, x + 5, y + 4, 6, 8);                   // the way in
    r(G4, x + 3, y + 12, 10, 1);
    return { x: x + 2, y: y - 5, w: 12, h: 18 };
  },
  catwheel(r, x, y, t) {
    const cx = x + 16, cy = y - 3;
    r(G1, x + 6, y + 9, 20, 4); r(G3, x + 7, y + 10, 18, 2);                // stand
    r(G1, x + 9, y + 2, 2, 8); r(G1, x + 21, y + 2, 2, 8);
    for (let a = 0; a < 64; a++) {                                             // the wheel's rim
      const ang = a / 64 * Math.PI * 2;
      r(G2, Math.round(cx + Math.cos(ang) * 12), Math.round(cy + Math.sin(ang) * 12), 2, 2);
    }
    for (let k = 0; k < 4; k++) {                                              // spokes turning
      const ang = t * 1.5 + k * Math.PI / 4;
      for (let d = 2; d < 11; d++) r(G4, Math.round(cx + Math.cos(ang) * d), Math.round(cy + Math.sin(ang) * d), 1, 1);
      for (let d = 2; d < 11; d++) r(G4, Math.round(cx - Math.cos(ang) * d), Math.round(cy - Math.sin(ang) * d), 1, 1);
    }
    r(G0, cx - 1, cy - 1, 3, 3);
    return { x: x + 3, y: y - 16, w: 27, h: 29 };
  },
  doghouse(r, x, y) {
    r(G1, x + 3, y - 4, 26, 17); r(G6, x + 4, y - 3, 24, 15);
    for (let k = 0; k < 4; k++) r(G5, x + 4, y - 1 + k * 4, 24, 1);          // boards
    for (let k = 0; k < 9; k++) { r(G1, x + 1 + k, y - 5 - k, 30 - k * 2, 1); r(G3, x + 2 + k, y - 4 - k, 28 - k * 2, 1); }   // roof
    r(G0, x + 11, y + 2, 10, 11); r(G0, x + 12, y + 1, 8, 1);                // door
    r(G8, x + 13, y - 9, 6, 3); r(G2, x + 14, y - 8, 4, 1);                  // name plate
    return { x: x + 1, y: y - 13, w: 30, h: 26 };
  },

  // ---------- turned: side views (front to the left) and back views ----------
  chair_side(r, x, y) {
    r(G1, x + 10, y - 6, 3, 16); r(G2, x + 11, y - 5, 1, 14);
    r(G1, x + 3, y + 4, 10, 5); r(G6, x + 4, y + 5, 7, 3);
    r(G1, x + 3, y + 9, 2, 5); r(G1, x + 10, y + 9, 2, 5);
    return { x: x + 3, y: y - 6, w: 10, h: 20 };
  },
  chair_back(r, x, y) {
    r(G1, x + 2, y + 1, 12, 6); r(G6, x + 3, y + 2, 10, 4);
    r(G1, x + 3, y + 5, 10, 9); r(G2, x + 4, y + 6, 8, 7); r(G3, x + 4, y + 6, 8, 1);
    r(G1, x + 2, y + 13, 2, 1); r(G1, x + 12, y + 13, 2, 1);
    return { x: x + 2, y: y + 1, w: 12, h: 13 };
  },
  desk_side(r, x, y, t, night) {
    r(G2, x + 3, y - 1, 10, 31); r(G7, x + 4, y, 8, 29);
    r(G1, x + 3, y + 30, 10, 2); r(G1, x + 4, y + 30, 2, 2); r(G1, x + 10, y + 30, 2, 2);
    r(G0, x + 9, y + 3, 3, 17); r(night ? G2 : G5, x + 8, y + 4, 1, 15); r(G0, x + 10, y + 20, 2, 3);   // monitor, edge on
    r(G5, x + 5, y + 7, 3, 13); for (let k = 0; k < 6; k++) r(G3, x + 6, y + 8 + k * 2, 1, 1);           // keyboard
    r(G8, x + 5, y + 24, 3, 3); r(G2, x + 5, y + 24, 3, 1);                                               // mug
    return { x: x + 3, y: y - 1, w: 10, h: 33 };
  },
  desk_back(r, x, y) {
    r(G2, x + 1, y - 1, 30, 9); r(G7, x + 2, y, 28, 7);
    r(G1, x + 8, y - 15, 16, 13); r(G2, x + 9, y - 14, 14, 11); r(G1, x + 14, y - 3, 4, 3);              // the monitor's back
    r(G1, x + 1, y + 8, 30, 2); r(G1, x + 2, y + 10, 2, 4); r(G1, x + 28, y + 10, 2, 4);
    return { x: x + 1, y: y - 15, w: 30, h: 29 };
  },
  sofa_side(r, x, y) {
    r(G2, x + 10, y - 4, 5, 35); r(G4, x + 11, y - 3, 3, 33);                                             // backrest
    r(G5, x + 3, y + 1, 8, 28); r(G6, x + 3, y + 1, 8, 1); r(G3, x + 3, y + 15, 8, 1);                   // seats
    r(G2, x + 2, y - 3, 13, 4); r(G4, x + 3, y - 2, 11, 2); r(G2, x + 2, y + 28, 13, 4); r(G4, x + 3, y + 28, 11, 2);   // arms
    r(G0, x + 3, y + 32, 2, 1); r(G0, x + 12, y + 32, 2, 1);
    r(G8, x + 5, y + 4, 4, 4);                                                                             // a cushion
    return { x: x + 2, y: y - 4, w: 13, h: 37 };
  },
  sofa_back(r, x, y) {
    r(G5, x + 4, y - 3, 24, 7); r(G6, x + 4, y - 3, 24, 1);
    r(G2, x + 2, y + 2, 28, 10); r(G4, x + 3, y + 3, 26, 8); r(G5, x + 3, y + 3, 26, 1);
    r(G2, x + 1, y - 4, 4, 15); r(G4, x + 2, y - 3, 2, 13); r(G2, x + 27, y - 4, 4, 15); r(G4, x + 28, y - 3, 2, 13);
    r(G0, x + 3, y + 12, 2, 2); r(G0, x + 27, y + 12, 2, 2);
    return { x: x + 1, y: y - 4, w: 30, h: 18 };
  },
  outbench_side(r, x, y) {
    r(G4, x + 11, y - 4, 2, 34); r(G5, x + 13, y - 4, 2, 34);                                           // back slats
    r(G6, x + 3, y, 2, 30); r(G5, x + 5, y, 2, 30); r(G6, x + 7, y, 2, 30); r(G1, x + 9, y, 1, 30);   // seat slats
    r(G0, x + 3, y - 2, 12, 2); r(G0, x + 3, y + 28, 12, 2);
    return { x: x + 3, y: y - 4, w: 12, h: 34 };
  },
  outbench_back(r, x, y) {
    r(G6, x + 2, y - 2, 28, 2); r(G5, x + 2, y, 28, 2);
    r(G4, x + 2, y + 4, 28, 2); r(G5, x + 2, y + 7, 28, 2); r(G4, x + 2, y + 10, 28, 2);
    r(G0, x + 3, y - 4, 2, 18); r(G0, x + 27, y - 4, 2, 18);
    return { x: x + 2, y: y - 4, w: 28, h: 18 };
  },
  piano_side(r, x, y) {
    r(G0, x + 5, y - 14, 9, 44); r(G1, x + 6, y - 13, 7, 2);
    r(G8, x + 1, y + 3, 5, 24); for (let k = 0; k < 6; k++) r(G5, x + 1, y + 5 + k * 4, 5, 1);           // keys, edge on
    r(G0, x + 1, y + 27, 5, 3); r(G0, x + 2, y + 30, 2, 2);
    return { x: x + 1, y: y - 14, w: 13, h: 46 };
  },
  piano_back(r, x, y) {
    r(G0, x + 1, y - 14, 30, 26); r(G1, x + 3, y - 12, 26, 1); r(G1, x + 3, y, 26, 1);
    r(G0, x + 2, y + 12, 2, 2); r(G0, x + 28, y + 12, 2, 2);
    return { x: x + 1, y: y - 14, w: 30, h: 28 };
  },
  fireplace_side(r, x, y, t) {
    r(G6, x + 6, y - 16, 9, 46); for (let k = 0; k < 11; k++) r(G4, x + 6, y - 14 + k * 4, 9, 1);
    r(G1, x + 5, y - 17, 11, 2);
    const f = Math.floor(t * 8) % 3;
    r(G0, x + 3, y + 4, 4, 16); r(G3, x + 3, y + 10 - f, 3, 8 + f); r(G8, x + 4, y + 13 - f, 2, 4);
    return { x: x + 3, y: y - 17, w: 13, h: 47 };
  },
  sink_side(r, x, y) {
    r(G1, x + 2, y - 2, 12, 32); r(G7, x + 3, y - 1, 10, 29); r(G8, x + 3, y - 1, 10, 1);
    r(G3, x + 4, y + 3, 6, 11); r(G5, x + 5, y + 4, 4, 9);
    r(G1, x + 10, y + 6, 3, 2); r(G1, x + 11, y + 4, 1, 4);                                               // tap
    r(G2, x + 5, y + 19, 4, 6);                                                                             // dish rack
    r(G6, x + 2, y + 30, 12, 2);
    return { x: x + 2, y: y - 2, w: 12, h: 34 };
  },
  catwheel_side(r, x, y, t) {
    r(G1, x + 3, y + 27, 10, 4); r(G3, x + 4, y + 28, 8, 2);
    r(G2, x + 6, y - 2, 4, 30); r(G4, x + 7, y - 1, 2, 28);
    for (let k = 0; k < 6; k++) r(G1, x + 6, y + ((k * 5 + Math.floor(t * 12)) % 28), 4, 1);            // treads going round
    return { x: x + 3, y: y - 2, w: 10, h: 33 };
  },
  doghouse_side(r, x, y) {
    r(G1, x + 2, y - 4, 12, 34); r(G6, x + 3, y - 3, 10, 32);
    for (let k = 0; k < 8; k++) r(G5, x + 3, y - 1 + k * 4, 10, 1);
    r(G1, x + 1, y - 10, 14, 7); r(G3, x + 2, y - 9, 12, 5);                                              // roof
    r(G0, x + 2, y + 8, 2, 14);                                                                             // the door's edge
    return { x: x + 1, y: y - 10, w: 14, h: 40 };
  },

  bookshelf_side(r, x, y) {
    r(G1, x + 4, y - 12, 8, 28); r(G2, x + 5, y - 11, 6, 26);
    for (let k = 0; k < 3; k++) r(G1, x + 5, y - 4 + k * 8, 6, 1);
    r(G8, x + 4, y - 9, 1, 5); r(G5, x + 4, y - 1, 1, 5); r(G6, x + 4, y + 7, 1, 5);          // book spines at the front edge
    return { x: x + 4, y: y - 12, w: 8, h: 28 };
  },
  bookshelf_back(r, x, y) {
    r(G1, x + 1, y - 12, 14, 28); r(G2, x + 2, y - 11, 12, 26);
    r(G1, x + 2, y - 3, 12, 1); r(G1, x + 2, y + 5, 12, 1); r(G1, x + 7, y - 11, 1, 26);
    return { x: x + 1, y: y - 12, w: 14, h: 28 };
  },
  radio_side(r, x, y) {
    r(G1, x + 5, y + 1, 6, 8); r(G2, x + 6, y + 2, 4, 6); r(G6, x + 5, y + 3, 1, 4);
    r(G0, x + 9, y - 3, 1, 5); r(G2, x + 5, y + 9, 6, 2); r(G1, x + 5, y + 11, 2, 3); r(G1, x + 9, y + 11, 2, 3);
    return { x: x + 5, y: y - 3, w: 6, h: 17 };
  },
  radio_back(r, x, y) {
    r(G1, x + 2, y + 1, 12, 8); r(G3, x + 3, y + 2, 10, 6);
    for (let k = 0; k < 5; k++) r(G1, x + 4 + k * 2, y + 3, 1, 4);                             // vents
    r(G0, x + 4, y - 3, 1, 5); r(G2, x + 2, y + 9, 12, 2); r(G1, x + 3, y + 11, 2, 3); r(G1, x + 11, y + 11, 2, 3);
    return { x: x + 2, y: y - 3, w: 12, h: 17 };
  },
  speaker_side(r, x, y) {
    r(G0, x + 6, y - 6, 5, 19); r(G1, x + 6, y - 6, 5, 1); r(G3, x + 6, y - 3, 1, 3); r(G3, x + 6, y + 4, 1, 4);
    return { x: x + 6, y: y - 6, w: 5, h: 19 };
  },
  speaker_back(r, x, y) {
    r(G0, x + 4, y - 6, 8, 19); r(G1, x + 5, y - 5, 6, 17); r(G2, x + 7, y + 6, 2, 2); r(G2, x + 8, y + 11, 1, 3);
    return { x: x + 4, y: y - 6, w: 8, h: 19 };
  },
  easel_side(r, x, y) {
    r(G2, x + 5, y + 1, 1, 13); r(G2, x + 10, y - 2, 1, 16); r(G2, x + 7, y - 1, 1, 2);
    r(G1, x + 6, y - 11, 2, 12); r(G8, x + 5, y - 10, 1, 10);                                  // the canvas, edge on
    r(G3, x + 4, y + 1, 5, 1);
    return { x: x + 4, y: y - 11, w: 7, h: 25 };
  },
  easel_back(r, x, y) {
    r(G2, x + 3, y + 1, 1, 13); r(G2, x + 12, y + 1, 1, 13); r(G2, x + 8, y - 2, 1, 15);
    r(G1, x + 2, y - 11, 12, 12); r(G5, x + 3, y - 10, 10, 10); r(G3, x + 3, y - 5, 10, 1); r(G3, x + 8, y - 10, 1, 10);
    return { x: x + 2, y: y - 11, w: 12, h: 25 };
  },
  fridge_side(r, x, y) {
    r(G1, x + 4, y - 14, 9, 28); r(G7, x + 5, y - 13, 7, 26); r(G6, x + 4, y - 13, 1, 26); r(G6, x + 5, y - 4, 7, 1);
    r(G3, x + 3, y - 10, 1, 4); r(G3, x + 3, y, 1, 6);                                          // handles stick out at the front
    r(G0, x + 5, y + 12, 2, 2); r(G0, x + 10, y + 12, 2, 2);
    return { x: x + 3, y: y - 14, w: 10, h: 28 };
  },
  fridge_back(r, x, y) {
    r(G1, x + 2, y - 14, 12, 28); r(G4, x + 3, y - 13, 10, 26);
    for (let k = 0; k < 7; k++) r(G2, x + 4, y - 10 + k * 3, 8, 1);                            // cooling coils
    r(G0, x + 3, y + 12, 2, 2); r(G0, x + 11, y + 12, 2, 2);
    return { x: x + 2, y: y - 14, w: 12, h: 28 };
  },
  coffee_side(r, x, y, t) {
    r(G2, x + 3, y + 5, 10, 3); r(G1, x + 4, y + 8, 2, 6); r(G1, x + 10, y + 8, 2, 6);
    r(G0, x + 5, y - 7, 6, 12); r(G3, x + 5, y - 6, 1, 3); r(G0, x + 4, y - 2, 1, 2); r(G8, x + 3, y, 3, 4);
    if (Math.floor(t * 3) % 2) { r(G7, x + 4, y - 3, 1, 1); r(G7, x + 3, y - 5, 1, 1); }
    return { x: x + 3, y: y - 7, w: 10, h: 21 };
  },
  coffee_back(r, x, y) {
    r(G2, x + 1, y + 5, 14, 3); r(G1, x + 2, y + 8, 2, 6); r(G1, x + 12, y + 8, 2, 6);
    r(G0, x + 4, y - 7, 8, 12); r(G1, x + 5, y - 6, 6, 10); r(G2, x + 11, y + 4, 1, 4);
    return { x: x + 1, y: y - 7, w: 14, h: 21 };
  },
  stove_side(r, x, y, t) {
    r(G1, x + 4, y - 2, 9, 16); r(G6, x + 5, y - 1, 7, 9); r(G1, x + 5, y - 2, 7, 1); r(G7, x + 5, y + 9, 7, 4);
    r(G0, x + 3, y + 2, 1, 1); r(G0, x + 3, y + 5, 1, 1);                                       // knobs at the front
    if (Math.floor(t * 6) % 2) r(G8, x + 6, y - 3, 2, 1);
    return { x: x + 3, y: y - 3, w: 10, h: 17 };
  },
  stove_back(r, x, y) {
    r(G1, x + 1, y - 2, 14, 16); r(G4, x + 2, y - 1, 12, 14);
    r(G2, x + 4, y + 2, 8, 1); r(G2, x + 4, y + 5, 8, 1); r(G3, x + 7, y - 6, 2, 4);           // vents, a gas pipe
    return { x: x + 1, y: y - 6, w: 14, h: 20 };
  },
  hideout_side(r, x, y) {
    r(G2, x + 5, y - 5, 6, 1); r(G2, x + 3, y - 4, 10, 2); r(G2, x + 2, y - 2, 12, 15);
    r(G5, x + 4, y - 3, 8, 2); r(G5, x + 3, y - 1, 10, 13); r(G6, x + 4, y - 3, 3, 1);
    r(G0, x + 2, y + 4, 2, 8);                                                                    // the way in, round the side
    r(G4, x + 3, y + 12, 10, 1);
    return { x: x + 2, y: y - 5, w: 12, h: 18 };
  },
  hideout_back(r, x, y) {
    r(G2, x + 5, y - 5, 6, 1); r(G2, x + 3, y - 4, 10, 2); r(G2, x + 2, y - 2, 12, 15);
    r(G5, x + 4, y - 3, 8, 2); r(G5, x + 3, y - 1, 10, 13); r(G6, x + 4, y - 3, 3, 1); r(G4, x + 3, y + 12, 10, 1);
    return { x: x + 2, y: y - 5, w: 12, h: 18 };
  },
  feeder_side(r, x, y) {
    r(G2, x + 6, y, 4, 1); r(G1, x + 6, y + 1, 4, 8); r(G7, x + 7, y + 2, 2, 3); r(G5, x + 7, y + 5, 2, 3);
    r(G1, x + 2, y + 9, 10, 5); r(G6, x + 3, y + 9, 8, 2);                                     // the bowl in front
    return { x: x + 2, y, w: 10, h: 14 };
  },
  cattower_side(r, x, y) {
    r(G3, x + 7, y - 16, 3, 28);
    r(G5, x + 4, y - 17, 9, 3); r(G4, x + 4, y - 15, 9, 1);
    r(G5, x + 3, y - 5, 9, 3); r(G4, x + 3, y - 3, 9, 1);
    r(G1, x + 2, y + 10, 12, 4); r(G4, x + 3, y + 11, 10, 2);
    r(G2, x + 3, y - 14, 1, 5); r(G8, x + 2, y - 9, 3, 2);
    return { x: x + 2, y: y - 17, w: 12, h: 31 };
  },
  fireplace_back(r, x, y) {
    r(G1, x, y - 16, 32, 3); r(G6, x + 1, y - 13, 30, 26);
    for (let row = 0; row < 6; row++) for (let k = 0; k < 4; k++) r(G4, x + 1 + k * 8 + (row % 2) * 4, y - 13 + row * 4, 1, 4);
    for (let row = 1; row < 7; row++) r(G4, x + 1, y - 13 + row * 4, 30, 1);
    return { x, y: y - 16, w: 32, h: 29 };
  },
  sink_back(r, x, y) {
    r(G1, x + 1, y - 2, 30, 12); r(G4, x + 2, y - 1, 28, 10);
    r(G1, x + 1, y + 10, 30, 4); r(G3, x + 2, y + 10, 28, 3); r(G2, x + 10, y + 10, 2, 4);     // pipes under
    return { x: x + 1, y: y - 2, w: 30, h: 16 };
  },
  doghouse_back(r, x, y) {
    r(G1, x + 3, y - 4, 26, 17); r(G6, x + 4, y - 3, 24, 15);
    for (let k = 0; k < 4; k++) r(G5, x + 4, y - 1 + k * 4, 24, 1);
    for (let k = 0; k < 9; k++) { r(G1, x + 1 + k, y - 5 - k, 30 - k * 2, 1); r(G3, x + 2 + k, y - 4 - k, 28 - k * 2, 1); }
    return { x: x + 1, y: y - 13, w: 30, h: 26 };
  },

  // ---------- fixtures ----------
  wardrobe(r, x, y) {
    r(G1, x + 1, y - 14, 14, 29); r(G6, x + 2, y - 13, 12, 26); r(G8, x + 2, y - 13, 12, 2);
    r(G3, x + 7, y - 11, 2, 24);
    r(G1, x + 6, y - 1, 1, 3); r(G1, x + 9, y - 1, 1, 3);
    r(G1, x + 2, y + 13, 2, 2); r(G1, x + 12, y + 13, 2, 2);
    r(G4, x + 4, y - 18, 8, 3); r(G8, x + 7, y - 20, 2, 2);            // a hat box on top
    return { x: x + 1, y: y - 20, w: 14, h: 35 };
  },
  bench(r, x, y) {
    r(G2, x, y + 1, 16, 8); r(G6, x + 1, y + 2, 14, 5); r(G7, x + 1, y + 2, 14, 1);
    r(G2, x + 1, y + 9, 2, 5); r(G2, x + 13, y + 9, 2, 5); r(G2, x + 3, y + 11, 10, 1);
    r(G3, x + 3, y + 3, 5, 2); r(G1, x + 3, y + 3, 1, 2);               // saw
    r(G1, x + 10, y + 2, 1, 4); r(G4, x + 9, y + 1, 3, 2);              // hammer
    return { x, y: y + 1, w: 16, h: 13 };
  },
  stairs(r, x, y) {
    // Steps going up toward the back wall, with a rail.
    for (let k = 0; k < 6; k++) { r(k % 2 ? G5 : G6, x + 2, y + 12 - k * 3 - 6, 12, 3); r(G3, x + 2, y + 14 - k * 3 - 6, 12, 1); }
    r(G1, x + 1, y - 7, 1, 21); r(G1, x + 14, y - 7, 1, 21);
    r(G2, x + 1, y - 8, 14, 1);
    return { x: x + 1, y: y - 8, w: 14, h: 22 };
  },
  elevator(r, x, y, t) {
    r(G1, x + 1, y - 14, 14, 28); r(G4, x + 2, y - 12, 12, 26);
    const open = Math.floor(t / 4) % 3 === 0 ? 2 : 0;                  // doors open now and then
    r(G6, x + 2, y - 12, 6 - open, 26); r(G6, x + 8 + open, y - 12, 6 - open, 26);
    r(G3, x + 7, y - 12, 2, 26);
    r(G0, x + 5, y - 17, 6, 3); r(G8, x + 6, y - 16, 1, 1); r(G8, x + 9, y - 16, 1, 1); // floor indicator
    return { x: x + 1, y: y - 17, w: 14, h: 31 };
  },
};

// Draws a piece whose footprint starts at screen (x, y). `t` drives animation.
function drawFurniture(g, id, x, y, t = 0, night = false) {
  const r = (c, a, b, w, h) => { g.fillStyle = c; g.fillRect(Math.round(a), Math.round(b), w, h); };
  return FURN_ART[id](r, x, y, t, night);
}

// A picture of a piece for the shop and the storage list.
const furnIconCache = {};
function furnitureIcon(id) {
  if (furnIconCache[id]) return furnIconCache[id];
  const f = FURNITURE.find(x => x.id === id), [w, h] = f ? f.size : [1, 1];
  const c = document.createElement("canvas"), g = c.getContext("2d");
  const pad = 22;
  c.width = w * 16 + 4; c.height = h * 16 + pad;
  drawFurniture(g, id, 2, f && f.wall ? 4 : pad - 2);
  // Trim to what was drawn, then scale up 2x crisp.
  const d = g.getImageData(0, 0, c.width, c.height).data;
  let y0 = c.height, y1 = 0;
  for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) if (d[(y * c.width + x) * 4 + 3]) { y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  const out = document.createElement("canvas"), o = out.getContext("2d");
  out.width = c.width * 2; out.height = (y1 - y0 + 1) * 2;
  o.imageSmoothingEnabled = false;
  o.drawImage(c, 0, y0, c.width, y1 - y0 + 1, 0, 0, out.width, out.height);
  return (furnIconCache[id] = out.toDataURL());
}

// Pets: the sprites recoloured to the chosen coat, with an accessory on. The picture has a margin
// (2 at the sides, 4 above) so hats and bows fit; it still stands on its bottom row.
// Where each sprite's head is (left, width, top row) and its neck (left, width, row):
const PET_HEADS = {
  catSit: [1, 7, 2, 2, 5, 5], catWalkA: [6, 7, 2, 7, 5, 5], catWalkB: [6, 7, 2, 7, 5, 5],
  dogSit: [2, 7, 1, 3, 5, 6], dogWalkA: [5, 7, 1, 6, 5, 6], dogWalkB: [5, 7, 1, 6, 5, 6],
  duckSit: [3, 6, 1, 3, 6, 6], duckWalkA: [3, 6, 1, 3, 6, 6], duckWalkB: [3, 6, 1, 3, 6, 6],
  bigduckSit: [2, 7, 0, 2, 7, 6],
  catScratchA: [1, 5, 2, 2, 4, 5], catScratchB: [1, 5, 2, 2, 4, 5], bigduckWalkA: [2, 7, 0, 2, 7, 6], bigduckWalkB: [2, 7, 0, 2, 7, 6],
};
const PET_ACC_ART = {
  ribbon(px, hx, hw, top) {                                   // a pink bow by one ear
    const x = hx + hw - 4, y = top - 2;
    px("N", x, y); px("N", x + 1, y); px("N", x + 3, y); px("N", x + 4, y);
    px("N", x, y + 1); px("r", x + 2, y + 1); px("N", x + 4, y + 1); px("N", x + 1, y + 1); px("N", x + 3, y + 1);
  },
  bell(px, hx, hw, top, nx, nw, ny) {                         // a red collar with a little gold bell
    for (let k = 0; k < nw; k++) px("R", nx + k, ny);
    const b = nx + Math.floor(nw / 2); px("Y", b, ny + 1); px("y", b, ny + 2);
  },
  bandana(px, hx, hw, top, nx, nw, ny) {                      // a blue scarf tied at the neck
    for (let k = 0; k < nw; k++) px("U", nx + k, ny);
    for (let k = 1; k < nw - 1; k++) px("U", nx + k, ny + 1);
    px("u", nx + Math.floor(nw / 2), ny + 2); px("W", nx + 1, ny); px("W", nx + nw - 2, ny + 1);
  },
  partyhat(px, hx, hw, top) {                                 // a striped party hat with a pompom
    const c = hx + Math.floor(hw / 2);
    px("W", c, top - 5); px("Y", c, top - 4); px("N", c - 1, top - 3); px("Y", c, top - 3); px("N", c + 1, top - 3);
    for (let k = -2; k <= 2; k++) px(k % 2 ? "N" : "Y", c + k, top - 2);
  },
  flowers(px, hx, hw, top) {                                  // a crown of little flowers
    for (let k = 0; k < hw; k++) px(["N", "G", "Y", "G", "W", "G"][k % 6], hx + k, top - 1);
  },
  crown(px, hx, hw, top) {                                    // a tiny gold crown
    const c = hx + Math.floor(hw / 2);
    px("Y", c - 2, top - 3); px("Y", c, top - 3); px("Y", c + 2, top - 3);
    for (let k = -2; k <= 2; k++) px("Y", c + k, top - 2);
    for (let k = -2; k <= 2; k++) px("y", c + k, top - 1);
    px("R", c, top - 2);
  },
};
const tintCache = {};
function petSprite(name, main, dark, acc = null) {
  const key = name + main + (acc || "");
  if (tintCache[key]) return tintCache[key];
  const rows = SPRITES[name], c = document.createElement("canvas"), PADX = 2, PADY = 4;
  c.width = Math.max(...rows.map(r => r.length)) + PADX * 2; c.height = rows.length + PADY;
  const g = c.getContext("2d");
  const px = (ch, x, y) => { const color = ch === "O" ? main : ch === "o" ? dark : PALETTE[ch]; if (color) { g.fillStyle = color; g.fillRect(x + PADX, y + PADY, 1, 1); } };
  rows.forEach((row, y) => [...row].forEach((ch, x) => { if (ch !== ".") px(ch, x, y); }));
  const head = PET_HEADS[name];
  if (acc && head && PET_ACC_ART[acc]) PET_ACC_ART[acc](px, ...head);
  return (tintCache[key] = c);
}
