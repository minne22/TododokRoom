// The player's character: a chibi pixel paper doll built from the creator's choices.
// Each pose is drawn once into a small canvas (18 x 28, plus a 1px outline traced around the
// whole silhouette) and cached; (x, y) given to drawCharacter is the point between the feet.
"use strict";

const LOOK_OPTIONS = {
  gender: ["여자", "남자"],
  skin: ["#fbe3d3", "#f5cfb6", "#e2ae88", "#bd8460", "#83563a"],
  eyes: ["점", "동글", "반짝", "졸린", "웃는", "날카로운", "실눈"],
  nose: ["없음", "점", "콧날", "동그란 코"],
  mouth: ["미소", "헤벌쭉", "일자", "고양이", "씩"],
  // Options past the first few cost coins at the wardrobe (see COSMETIC_PRICES in data.js).
  hair: ["짧은 머리", "단발", "긴 머리", "포니테일", "똥머리", "삐죽 머리", "양갈래", "곱슬 머리", "히메컷", "가르마", "투블럭", "댄디컷", "스포츠머리"],
  hairColor: ["#3a2c3e", "#6b4430", "#a8683e", "#e6bf6a", "#d86a5a", "#9a7ac0", "#ece6dc"],
  // outfit 0 = top + bottom, 1 = dress; picking a dress or a top/bottom switches it.
  outfit: ["상의+하의", "원피스"],
  top: ["반팔", "후드", "셔츠", "줄무늬 티", "니트", "민소매", "패딩", "코트", "가디건"],
  bottom: ["긴바지", "반바지", "치마", "주름 치마", "롱스커트", "기모 바지"],
  dress: ["원피스", "멜빵 원피스", "앞치마 원피스", "세일러 원피스", "니트 원피스", "꽃무늬 원피스"],
  shoes: ["운동화", "구두", "장화", "슬리퍼", "샌들", "털부츠"],
  hat: ["없음", "밀짚모자", "비니", "리본", "귀달이 모자", "꽃핀"],
  glasses: ["없음", "동그란 안경", "선글라스"],
  neck: ["없음", "목도리"],
  hand: ["없음", "가방", "우산", "꽃다발", "부채", "장바구니"],
  cloth: ["#f6f2ea", "#e0605a", "#ee9a58", "#f4cf68", "#98cf74", "#58a056", "#66aeaa", "#6896d8", "#41659e", "#9a7ac0", "#eeaabd", "#7a5038", "#3a2c3e"],
};

// Hair and faces offered to each gender (0 = 여자, 1 = 남자); other options are for everyone.
const GENDER_OPTIONS = {
  hair: [[1, 2, 3, 4, 6, 8, 0, 7], [0, 9, 10, 11, 12, 5, 7]],
  eyes: [[0, 1, 2, 3, 4], [0, 1, 5, 6, 3, 4]],
  mouth: [[0, 1, 2, 3], [0, 4, 2, 1]],
};
function allowedFor(key, i, gender) { const g = GENDER_OPTIONS[key]; return !g || g[gender].includes(i); }
// After switching gender: anything that only suits the other one becomes this one's first choice.
function fitGender(look) {
  const out = { ...look };
  for (const key of Object.keys(GENDER_OPTIONS)) if (!allowedFor(key, out[key], out.gender)) out[key] = GENDER_OPTIONS[key][out.gender][0];
  return out;
}

function randomLook() {
  const pick = a => Math.floor(Math.random() * a.length), one = a => a[pick(a)];
  const gender = pick(LOOK_OPTIONS.gender);
  const cloth = () => pick(LOOK_OPTIONS.cloth);
  return {
    name: "",
    gender,
    skin: pick([0, 1, 2, 3, 4]),
    eyes: one(GENDER_OPTIONS.eyes[gender]),
    nose: one([0, 0, 1, 3]),
    mouth: one(GENDER_OPTIONS.mouth[gender]),
    hair: one(gender === 0 ? [1, 2, 3, 4] : [0, 9, 10, 11, 12]),
    hairColor: pick([0, 1, 2, 3]),
    outfit: gender === 0 && Math.random() < 0.4 ? 1 : 0,
    top: pick([0, 1, 2]), topColor: cloth(),
    bottom: gender === 0 ? pick([0, 1, 2]) : pick([0, 1]), bottomColor: cloth(),
    dress: pick([0, 1, 2]), dressColor: cloth(),
    shoes: pick([0, 1, 2]), shoesColor: cloth(),
    hat: 0, glasses: 0, neck: 0, hand: 0,
  };
}

// Whether an option costs coins and isn't owned yet. `owned` is the save's list of "key:index".
function cosmeticPrice(key, index) { return (COSMETIC_PRICES[key] || {})[index] || 0; }
function isLocked(key, index, owned) { return cosmeticPrice(key, index) > 0 && !owned.includes(`${key}:${index}`); }

const INK = "#3a2c3e";
const OUTLINE = [58, 44, 62];

// Darker (k < 1) or lighter (k > 1) shade of a hex colour.
function shade(hex, k = 0.75) {
  const n = parseInt(hex.slice(1), 16);
  const c = [n >> 16, (n >> 8) & 255, n & 255].map(v => Math.min(255, Math.round(k > 1 ? v + (255 - v) * (k - 1) : v * k)));
  return "#" + c.map(v => v.toString(16).padStart(2, "0")).join("");
}

const DOLL_W = 18, DOLL_H = 28;
const dollCache = new Map();

/**
 * dir: "down" | "up" | "left" | "right"; pose: "stand" | "walk" | "swing" | "fish";
 * t: seconds, for animation; tool: "axe" | "pickaxe" | "rod" | null.
 */
function drawCharacter(g, look, x, y, dir = "down", pose = "stand", t = 0, tool = null) {
  const frame = pose === "walk" ? Math.floor(t * 8) % 4
    : pose === "swing" ? ((t % 1) < 0.45 ? 1 : 0)
    : (t % 3.7) < 0.14 ? 9 : 0; // a blink every few seconds
  const side = dir === "left" || dir === "right" ? "side" : dir;
  const key = JSON.stringify(look) + side + pose + frame + tool;
  let c = dollCache.get(key);
  if (!c) {
    c = renderDoll(look, side, pose, frame, tool);
    if (dollCache.size > 400) dollCache.clear();
    dollCache.set(key, c);
  }
  const left = Math.round(x) - DOLL_W / 2 - 1, top = Math.round(y) - DOLL_H - 1;
  if (dir !== "left") { g.drawImage(c, left, top); return; }
  g.save();
  g.translate(left + c.width, top);
  g.scale(-1, 1);
  g.drawImage(c, 0, 0);
  g.restore();
}

// Which season each basic piece suits, shown in its tooltip.
const LOOK_SEASONS = {
  top: { 0: "여름", 3: "봄", 4: "겨울", 5: "여름", 6: "겨울", 7: "가을", 8: "봄" },
  bottom: { 1: "여름", 4: "가을", 5: "겨울" },
  dress: { 4: "겨울", 5: "봄" },
  shoes: { 2: "장마", 3: "여름", 4: "여름", 5: "겨울" },
  hat: { 1: "여름", 2: "겨울", 4: "겨울", 5: "봄" },
  neck: { 1: "겨울" },
  hand: { 2: "장마", 4: "여름" },
};
function lookName(key, i) { const s = (LOOK_SEASONS[key] || {})[i]; return LOOK_OPTIONS[key][i] + (s ? ` · ${s}` : ""); }

// Just one garment on its own (no body), trimmed and enlarged, for the creator and shop tiles.
const GARMENT_KEYS = ["top", "bottom", "dress", "shoes", "hat", "glasses", "neck", "hand"];
function garmentPreview(look, key) {
  const k = JSON.stringify(look) + "only" + key;
  if (previewCache.has(k)) return previewCache.get(k);
  const doll = renderDoll({ ...look, only: key }, "down", "stand", 0, null);
  const d = doll.getContext("2d").getImageData(0, 0, doll.width, doll.height).data;
  let x0 = doll.width, y0 = doll.height, x1 = -1, y1 = -1;
  for (let y = 0; y < doll.height; y++) for (let x = 0; x < doll.width; x++) {
    if (!d[(y * doll.width + x) * 4 + 3]) continue;
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  const out = document.createElement("canvas");
  if (x1 < 0) out.width = out.height = 1;
  else {
    const w = x1 - x0 + 1, h = y1 - y0 + 1, sc = Math.max(1, Math.min(6, Math.floor(60 / Math.max(w, h))));
    out.width = w * sc; out.height = h * sc;
    const g = out.getContext("2d");
    g.imageSmoothingEnabled = false;
    g.drawImage(doll, x0, y0, w, h, 0, 0, out.width, out.height);
  }
  const url = out.toDataURL();
  previewCache.set(k, url);
  return url;
}

// A close-up of one part of a look, for the option tiles in the creator and the shop.
// Regions are boxes on the outlined doll (20 x 30): which part to show for each kind of option.
const PREVIEW_REGIONS = {
  full: [0, 0, 20, 30],
  head: [1, 0, 18, 17],
  face: [3, 6, 14, 10],
  body: [1, 14, 18, 10],
  legs: [2, 18, 16, 11],
  dress: [1, 14, 18, 13],
  feet: [3, 22, 14, 8],
};
const previewCache = new Map();
function lookPreview(look, region = "full", scale = 3) {
  const key = JSON.stringify(look) + region + scale;
  if (previewCache.has(key)) return previewCache.get(key);
  const doll = document.createElement("canvas");
  doll.width = DOLL_W + 2; doll.height = DOLL_H + 2;
  drawCharacter(doll.getContext("2d"), look, DOLL_W / 2 + 1, DOLL_H + 1, "down", "stand", 1);
  const [x, y, w, h] = PREVIEW_REGIONS[region];
  const out = document.createElement("canvas");
  out.width = w * scale; out.height = h * scale;
  const g = out.getContext("2d");
  g.imageSmoothingEnabled = false;
  g.drawImage(doll, x, y, w, h, 0, 0, out.width, out.height);
  const url = out.toDataURL();
  if (previewCache.size > 600) previewCache.clear();
  previewCache.set(key, url);
  return url;
}

function renderDoll(look, view, pose, frame, tool) {
  const c = document.createElement("canvas");
  c.width = DOLL_W + 2; c.height = DOLL_H + 2;
  const g = c.getContext("2d", { willReadFrequently: true });   // the outline pass reads pixels back
  g.translate(1, 1);
  const skin = LOOK_OPTIONS.skin[look.skin], skinD = shade(skin, 0.86);
  // look.only = one garment key: draw just that piece (skin is never part of a garment).
  let part = "body";
  const only = look.only;
  const px = (color, x, y, w = 1, h = 1) => {
    if (only && (part !== only || color === skin || color === skinD)) return;
    g.fillStyle = color; g.fillRect(x, y, w, h);
  };
  const hair = LOOK_OPTIONS.hairColor[look.hairColor], hairD = shade(hair, 0.72), hairL = shade(hair, 1.25);
  const dress = look.outfit === 1;
  const topC = LOOK_OPTIONS.cloth[dress ? look.dressColor : look.topColor], topD = shade(topC, 0.8);
  const botC = LOOK_OPTIONS.cloth[dress ? look.dressColor : look.bottomColor], botD = shade(botC, 0.8);
  const shoeC = LOOK_OPTIONS.cloth[look.shoesColor], shoeD = shade(shoeC, 0.75);
  const front = view === "down", back = view === "up", side = view === "side";
  const T = dress ? -1 : look.top;   // which top, or -1 under a dress
  const walking = pose === "walk", armUp = pose === "swing" && frame === 1, blink = frame === 9;

  // Walking: one leg lifts, the body bobs, arms swing.
  const liftL = walking && frame === 1 ? 1 : 0, liftR = walking && frame === 3 ? 1 : 0;
  const bob = walking && frame % 2 ? 1 : 0;
  const swing = walking ? (frame === 1 ? 1 : frame === 3 ? -1 : 0) : 0;

  // ---------------- long hair behind everything ----------------
  part = "hair";
  if (!back) {
    if (look.hair === 2 || look.hair === 8) px(hair, side ? 2 : 3, 7 + bob, side ? 7 : 12, 13);
    if (look.hair === 3 && side) { px(hair, 1, 5 + bob, 3, 9); px(hairD, 1, 12 + bob, 3, 2); }
  }

  // ---------------- legs and shoes ----------------
  const bareLegs = dress || (look.bottom > 0 && look.bottom < 5);
  const legC = bareLegs ? skin : botC;
  const leg = (x, lift) => {
    part = dress ? "dress" : "bottom";
    px(legC, x, 22 - lift, 2, 4);
    if (!dress && look.bottom === 5) px(shade(botC, 1.3), x, 24 - lift, 2, 1);   // fleece cuffs
    part = "shoes";
    const boots = look.shoes === 2 || look.shoes === 5, sx = x - (side ? 0 : 1);
    if (look.shoes === 3) {                 // slippers: a flat sole and a strap over the toes
      px(shoeC, sx, 26 - lift, 3, 1); px("#ffffff", sx, 25 - lift, 3, 1);
      return;
    }
    if (look.shoes === 4) {                 // sandals: a sole and thin straps
      px(shoeD, sx, 26 - lift, 3, 1); px(shoeC, sx, 25 - lift, 1, 1); px(shoeC, sx + 2, 25 - lift, 1, 1); px(shoeC, x, 24 - lift, 2, 1);
      return;
    }
    px(shoeC, sx, 25 - lift, 3, 2);
    if (boots) px(shoeC, x, 23 - lift, 2, 2);
    if (look.shoes === 5) px("#f6f2ea", sx, 23 - lift, 3, 1);   // fur trim
    px(shoeD, sx, 26 - lift, 3, 1);
    if (look.shoes === 0) px("#ffffff", sx, 26 - lift, 3, 1);
    if (look.shoes === 1) px(shade(shoeC, 1.3), x, 25 - lift, 1, 1);
  };
  if (side) { leg(7, liftR); leg(9, liftL); }
  else { leg(6, liftL); leg(10, liftR); }

  g.translate(0, bob);

  // ---------------- lower clothes ----------------
  part = dress ? "dress" : "bottom";
  if (dress) {
    px(botC, 5, 19, 8, 2); px(botC, 4, 21, 10, 2);
    px(botD, 4, 22, 10, 1);
    if (look.dress === 5) { px("#ffffff", 5, 21, 1, 1); px("#f4cf68", 8, 22, 1, 1); px("#ffffff", 11, 21, 1, 1); px("#eeaabd", 7, 20, 1, 1); px("#eeaabd", 10, 20, 1, 1); }
    if (look.dress === 4) for (let k = 5; k < 13; k += 2) px(botD, k, 20, 1, 1);
  } else if (look.bottom === 0 || look.bottom === 5) {
    px(botC, 5, 19, 8, 3);
    if (!side) px(botD, 8, 20, 2, 2);
  } else if (look.bottom === 4) {          // long skirt down to the ankles
    px(botC, 5, 19, 8, 2); px(botC, 4, 21, 10, 3);
    px(botD, 4, 23, 10, 1);
  } else if (look.bottom === 1) {
    px(botC, 5, 19, 8, 3);
    if (!side) px(botD, 8, 21, 2, 1);
  } else {
    px(botC, 5, 19, 8, 2); px(botC, 4, 21, 10, 1);
    px(botD, 4, 21, 10, 1);
    if (look.bottom === 3) for (let k = 5; k < 13; k += 2) px(botD, k, 19, 1, 3);   // pleats
  }

  // ---------------- torso and arms ----------------
  part = dress ? "dress" : "top";
  const puffy = T === 6;
  const torsoX = (side ? 6 : 5) - (puffy ? 1 : 0), torsoW = (side ? 6 : 8) + (puffy ? 2 : 0);
  px(topC, torsoX, 15, torsoW, 5);
  px(topD, torsoX, 19, torsoW, 1);
  if (puffy) { px(topD, torsoX, 17, torsoW, 1); px(shade(topC, 1.2), torsoX + 1, 15, torsoW - 2, 1); }   // quilted
  if (T === 7) {                                                                                         // coat
    px(topC, torsoX, 20, torsoW, 3); px(topD, torsoX, 22, torsoW, 1);
    if (front) { px(topD, 7, 16, 1, 1); px(topD, 7, 18, 1, 1); px(topD, 10, 16, 1, 1); px(topD, 10, 18, 1, 1); }
  }
  if (T === 8 && front) { px("#ffffff", 8, 15, 2, 5); px(topD, 7, 16, 1, 1); px(topD, 7, 18, 1, 1); }      // cardigan over a shirt
  if (dress && look.dress === 4) for (let k = torsoX + 1; k < torsoX + torsoW; k += 2) px(topD, k, 17, 1, 1);
  if (!dress && look.top === 3) { px("#ffffff", torsoX, 16, torsoW, 1); px("#ffffff", torsoX, 18, torsoW, 1); } // stripes
  if (!dress && look.top === 4) {                                                                               // knit
    px(topD, torsoX + 1, 15, torsoW - 2, 1);
    for (let k = torsoX + 1; k < torsoX + torsoW; k += 2) px(topD, k, 17, 1, 1);
  }
  if (front && !dress) {
    if (look.top === 1) { px(topD, 7, 15, 4, 1); px("#ffffff", 8, 16, 1, 2); px("#ffffff", 9, 16, 1, 2); }  // hood + strings
    if (look.top === 2) { px("#ffffff", 7, 15, 4, 1); px(topD, 9, 16, 1, 3); }                              // collar + buttons
  }
  if (front && dress) {
    if (look.dress === 1) { px(botD, 6, 15, 1, 4); px(botD, 11, 15, 1, 4); }                                // straps
    if (look.dress === 2) { px("#ffffff", 6, 17, 6, 5); px(shade("#ffffff", 0.9), 6, 21, 6, 1); }          // apron
    if (look.dress === 3) { px("#ffffff", 5, 15, 8, 2); px("#e0605a", 8, 16, 2, 2); }                      // sailor collar
  }
  if (back && dress && look.dress === 3) px("#ffffff", 5, 15, 8, 3);
  const longSleeve = [1, 2, 4, 6, 7, 8].includes(T) || (dress && look.dress === 4);
  const arm = (x, dy) => {
    px(T === 5 ? skin : topC, x, 15 + dy, 2, 2);
    px(longSleeve ? topC : skin, x, 17 + dy, 2, 2);
    px(skin, x, 19 + dy, 2, 1);
  };
  if (side) {
    if (armUp) { px(longSleeve ? topC : skin, 9, 10, 2, 5); px(skin, 9, 9, 2, 1); }
    else arm(8, swing);
  } else {
    arm(3, swing);
    if (armUp && front) { px(topC, 13, 13, 2, 2); px(longSleeve ? topC : skin, 13, 10, 2, 3); px(skin, 13, 9, 2, 1); }
    else arm(13, -swing);
  }

  // ---------------- head ----------------
  part = "body";
  const head = (color, top = 3) => {
    px(color, 5, top, 8, 1);
    px(color, 4, top + 1, 10, 1);
    px(color, 3, top + 2, 12, 8);
    px(color, 4, top + 10, 10, 1);
    px(color, 5, top + 11, 8, 1);
  };
  head(skin);
  px(skinD, 4, 13, 10, 1);
  if (side) px(skin, 15, 10, 1, 2);   // nose tip in profile

  // ---------------- face ----------------
  if (!back) {
    const eyes = side ? [12] : [5, 11];
    eyes.forEach((e, i) => {
      const outer = side ? e + 1 : i === 0 ? e - 1 : e + 2;
      if (blink || look.eyes === 3) { px(INK, e, 10, 2, 1); if (look.eyes === 3 && !blink) px(INK, outer, 9, 1, 1); return; }
      switch (look.eyes) {
        case 0: px(INK, e, 9, 2, 2); break;
        case 1: px(INK, e, 8, 2, 3); px("#ffffff", e, 8, 1, 1); break;
        case 2: px(INK, e, 8, 2, 1); px("#41659e", e, 9, 2, 2); px("#ffffff", e, 9, 1, 1); px("#a8d0f0", e + 1, 10, 1, 1); break;
        case 4: { const a = side ? e - 1 : i === 0 ? e - 1 : e; px(INK, a, 10, 1, 1); px(INK, a + 1, 9, 1, 1); px(INK, a + 2, 10, 1, 1); break; }
        case 5: { const inner = side ? e : i === 0 ? e + 1 : e; px(INK, e, 9, 2, 2); px(skin, inner, 9, 1, 1); px(INK, side ? e : i === 0 ? e - 1 : e + 1, 8, 2, 1); break; }  // sharp, with a brow
        case 6: px(INK, e, 10, 2, 1); px(INK, e, 8, 2, 1); break;                                                                      // narrow, with a brow
      }
      if (look.gender === 0 && look.eyes !== 4 && look.eyes < 5) px(INK, outer, 8, 1, 1); // a lash
    });
    if (side) px("#f2a0a8", 12, 11, 2, 1);
    else { px("#f2a0a8", 4, 11, 2, 1); px("#f2a0a8", 12, 11, 2, 1); }
    if (look.nose === 1 && !side) px(skinD, 9, 11, 1, 1);
    if (look.nose === 2 && !side) { px(skinD, 9, 10, 1, 2); }
    if (look.nose === 3 && !side) px(skinD, 8, 11, 2, 1);
    const m = side ? 12 : 8;
    switch (look.mouth) {
      case 0: if (side) px(INK, m, 12, 2, 1); else { px(INK, m, 13, 2, 1); px(INK, m - 1, 12, 1, 1); px(INK, m + 2, 12, 1, 1); } break;
      case 1: px(INK, m, 12, 2, 1); px("#d86a5a", m, 13, 2, 1); break;
      case 2: px(INK, m, 12, side ? 1 : 2, 1); break;
      case 3: if (side) { px(INK, m, 12, 1, 1); px(INK, m + 1, 13, 1, 1); } else { px(INK, m - 1, 12, 1, 1); px(INK, m, 13, 1, 1); px(INK, m + 1, 12, 1, 1); px(INK, m + 2, 13, 1, 1); px(INK, m + 3, 12, 1, 1); } break;
      case 4: if (side) px(INK, m, 12, 2, 1); else { px(INK, m - 1, 12, 3, 1); px(INK, m + 2, 11, 1, 1); } break;   // a lopsided grin
    }
  }

  // ---------------- scarf ----------------
  part = "neck";
  if (look.neck === 1) {
    px("#e0605a", 4, 14, 10, 2); px("#ffffff", 6, 14, 1, 2); px("#ffffff", 11, 14, 1, 2);
    if (front) { px("#e0605a", 10, 16, 2, 3); px("#ffffff", 10, 18, 2, 1); }
    if (side) px("#e0605a", 4, 16, 2, 3);
  }

  // ---------------- hair ----------------
  part = "hair";
  const cap = () => { px(hair, 5, 2, 8, 1); px(hair, 4, 3, 10, 1); px(hair, 3, 4, 12, 2); px(hairD, 5, 2, 8, 1); px(hairL, 6, 3, 3, 1); };
  if (back) {
    head(hair, 2); px(hair, 3, 4, 12, 9); px(hairD, 4, 13, 10, 1);
    if (look.hair === 1 || look.hair === 7) px(hair, 2, 6, 14, 7);
    if (look.hair === 2 || look.hair === 8) { px(hair, 2, 6, 14, 14); px(hairD, 2, 19, 14, 1); }
    if (look.hair === 6) { px(hair, 0, 6, 3, 9); px(hair, 15, 6, 3, 9); px("#e0605a", 2, 6, 1, 2); px("#e0605a", 15, 6, 1, 2); }
    if (look.hair === 7) for (let k = 0; k < 6; k++) px(hairD, 3 + k * 2, 12 + (k % 2), 1, 1);
    if (look.hair === 3) { px(hairD, 8, 5, 2, 1); px(hair, 8, 6, 2, 10); px(hairD, 8, 15, 2, 1); }
    if (look.hair === 4) { px(hair, 7, 0, 4, 2); px(hairD, 8, 1, 2, 1); }
    if (look.hair === 5) for (let k = 0; k < 5; k++) px(hair, 4 + k * 2, 1 - (k % 2), 1, 2);
    if (look.hair === 10) { px(hair, 4, 1, 10, 2); px(shade(hair, 0.6), 3, 9, 12, 4); }       // two-block: volume on top, shaved below
    if (look.hair === 12) px(hairD, 3, 10, 12, 3);                                             // buzz cut
    px(hairL, 6, 3, 3, 1);
  } else if (side) {
    cap();
    px(hair, 3, 4, 7, 7);            // the back of the head
    px(hairD, 3, 10, 6, 1);
    px(hair, 10, 6, 5, 1);            // fringe over the brow
    if (look.hair === 1 || look.hair === 7) px(hair, 3, 6, 6, 7);
    if (look.hair === 3) px(hairD, 2, 5, 2, 2);
    if (look.hair === 6) { px(hair, 1, 6, 3, 9); px("#e0605a", 3, 6, 1, 2); }
    if (look.hair === 8) px(hair, 10, 7, 2, 6);   // the blunt side lock
    if (look.hair === 4) { px(hair, 4, 0, 4, 3); px(hairD, 5, 1, 2, 1); }
    if (look.hair === 5) for (let k = 0; k < 4; k++) px(hair, 4 + k * 2, 1 - (k % 2), 1, 2);
    if (look.hair === 9) px(hair, 10, 6, 5, 2);                                                // side part sweeps forward
    if (look.hair === 10) { px(hair, 4, 1, 9, 2); px(shade(hair, 0.6), 3, 7, 5, 4); }
    if (look.hair === 11) px(hair, 10, 6, 5, 3);
    if (look.hair === 12) { px(skin, 10, 6, 5, 1); px(hairD, 3, 8, 6, 3); }
  } else {
    cap();
    // Fringe with a soft, uneven edge (none for the buzz cut).
    if (look.hair !== 12) {
      px(hair, 3, 6, 2, 3); px(hair, 13, 6, 2, 3);
      px(hair, 5, 6, 3, 1); px(hair, 10, 6, 3, 1); px(hair, 6, 7, 1, 1); px(hair, 11, 7, 1, 1);
    }
    switch (look.hair) {
      case 0: px(hair, 3, 9, 1, 2); px(hair, 14, 9, 1, 2); break;
      case 1: px(hair, 2, 5, 2, 9); px(hair, 14, 5, 2, 9); px(hairD, 2, 13, 2, 1); px(hairD, 14, 13, 2, 1); break;
      case 2: px(hair, 2, 5, 2, 15); px(hair, 14, 5, 2, 15); px(hairD, 2, 19, 2, 1); px(hairD, 14, 19, 2, 1); break;
      case 3: px(hair, 15, 4, 2, 8); px(hairD, 15, 11, 2, 1); px("#e0605a", 14, 4, 1, 2); px(hair, 3, 9, 1, 2); break;
      case 4: px(hair, 6, 0, 6, 2); px(hairD, 7, 1, 4, 1); px(hairL, 7, 0, 2, 1); px(hair, 3, 9, 1, 2); px(hair, 14, 9, 1, 2); break;
      case 5: for (let k = 0; k < 5; k++) px(hair, 4 + k * 2, 1 - (k % 2), 2, 2); px(hair, 3, 9, 1, 1); px(hair, 14, 9, 1, 1); break;
      case 6: // twin tails
        px(hair, 0, 6, 3, 9); px(hair, 15, 6, 3, 9); px(hairD, 0, 14, 3, 1); px(hairD, 15, 14, 3, 1);
        px("#e0605a", 2, 6, 1, 2); px("#e0605a", 15, 6, 1, 2); break;
      case 7: // curly: a bumpy outline all round
        for (let k = 0; k < 6; k++) px(hair, 3 + k * 2, 1 + (k % 2), 2, 1);
        px(hair, 2, 5, 2, 8); px(hair, 14, 5, 2, 8); px(hairD, 2, 8, 1, 1); px(hairD, 15, 10, 1, 1); px(hairD, 2, 12, 2, 1); px(hairD, 14, 12, 2, 1); break;
      case 8: // hime cut: straight fringe, blunt side locks, long back
        px(hair, 3, 6, 12, 1); px(hair, 2, 5, 2, 15); px(hair, 14, 5, 2, 15); px(hair, 4, 7, 1, 6); px(hair, 13, 7, 1, 6);
        px(hairD, 2, 19, 2, 1); px(hairD, 14, 19, 2, 1); break;
      case 9: // side part: the fringe swept to one side from a parting
        px(hair, 3, 6, 7, 2); px(hair, 4, 8, 4, 1); px(hairD, 10, 4, 1, 2); px(hair, 3, 9, 1, 2); px(hair, 14, 9, 1, 1); break;
      case 10: // two-block: a full top, the sides cut short
        px(hair, 4, 1, 10, 2); px(hairL, 6, 1, 4, 1); px(hair, 4, 6, 10, 1);
        px(shade(hair, 0.6), 3, 7, 1, 3); px(shade(hair, 0.6), 14, 7, 1, 3); px(skin, 3, 8, 1, 1); px(skin, 14, 8, 1, 1); break;
      case 11: // dandy cut: a straight, heavy fringe down to the brows
        px(hair, 4, 6, 10, 2); px(hair, 3, 6, 1, 5); px(hair, 14, 6, 1, 5); px(hairD, 6, 7, 1, 1); px(hairD, 10, 7, 1, 1); break;
      case 12: // buzz cut: just a short cap
        for (let k = 0; k < 5; k++) px(hairD, 5 + k * 2, 3 + (k % 2), 1, 1);
        px(hair, 3, 6, 1, 2); px(hair, 14, 6, 1, 2); break;
    }
  }

  // ---------------- hat and glasses ----------------
  part = "hat";
  if (look.hat === 1) {             // straw hat
    px("#e6c46a", 0, 5, 18, 2); px("#c9a24a", 0, 6, 18, 1);
    px("#e6c46a", 4, 1, 10, 4); px("#f4dc8a", 5, 1, 6, 1); px("#e0605a", 4, 4, 10, 1);
  } else if (look.hat === 2) {      // beanie
    px("#e0605a", 3, 2, 12, 4); px("#b84a44", 3, 5, 12, 1); px("#f6c8c4", 4, 2, 2, 1);
    px("#ffffff", 8, 0, 2, 2);
  } else if (look.hat === 3) {      // bow
    const bx = back ? 7 : side ? 6 : 12;
    px("#ee7a9a", bx - 2, 2, 2, 3); px("#ee7a9a", bx + 1, 2, 2, 3); px("#c8506e", bx, 3, 1, 1);
  } else if (look.hat === 4) {      // earflap hat
    px("#c9a27a", 3, 1, 12, 5); px("#a8825a", 3, 5, 12, 1); px("#f6f2ea", 8, 0, 2, 1);
    if (!back) { px("#c9a27a", 2, 5, 2, 5); px("#f6f2ea", 2, 9, 2, 1); if (!side) { px("#c9a27a", 14, 5, 2, 5); px("#f6f2ea", 14, 9, 2, 1); } }
  } else if (look.hat === 5) {      // flower pin
    const fx = side ? 5 : 12;
    px("#f6b8c8", fx, 4, 3, 1); px("#f6b8c8", fx + 1, 3, 1, 3); px("#f4cf68", fx + 1, 4, 1, 1);
  }
  part = "glasses";
  if (look.glasses && !back) {
    const lens = look.glasses === 2 ? INK : null;
    const ring = ex => { px(INK, ex, 7, 3, 1); px(INK, ex, 11, 3, 1); px(INK, ex - 1, 8, 1, 3); px(INK, ex + 3, 8, 1, 3); if (lens) px(lens, ex, 8, 3, 3); };
    if (side) ring(11);
    else { ring(4); ring(11); px(INK, 8, 9, 2, 1); }
  }

  // ---------------- something in the right hand (not while holding a tool) ----------------
  part = "hand";
  if (look.hand && !tool && !armUp) {
    // Front: the right hand is at (13..14, 19); in profile at (8..9, 19); from behind, on the left.
    const hx = side ? 8 : back ? 3 : 13, hy = 19 + (front ? -swing : swing);
    switch (look.hand) {
      case 1: // bag
        px("#8a5a3b", hx + 1, hy, 1, 1); px("#c98a5a", hx, hy + 1, 4, 3); px("#a8683e", hx, hy + 3, 4, 1); px("#f4cf68", hx + 1, hy + 2, 1, 1); break;
      case 2: // closed umbrella
        px(INK, hx + 1, hy - 2, 2, 1); px(INK, hx + 1, hy - 1, 1, 1); px("#6896d8", hx + 1, hy + 1, 2, 4); px("#41659e", hx + 2, hy + 1, 1, 4); px(INK, hx + 2, hy + 5, 1, 2); break;
      case 3: // bouquet
        px("#58a056", hx + 1, hy, 1, 3); px("#ee7a9a", hx, hy - 3, 2, 2); px("#f4cf68", hx + 2, hy - 3, 2, 2); px("#ffffff", hx + 1, hy - 4, 1, 1); px("#98cf74", hx + 2, hy - 1, 1, 1); break;
      case 4: // fan
        px(INK, hx + 1, hy, 1, 2); px("#f6f2ea", hx, hy - 3, 4, 3); px("#e0605a", hx + 1, hy - 2, 2, 1); break;
      case 5: // basket
        px("#8a5a3b", hx, hy - 1, 1, 2); px("#8a5a3b", hx + 4, hy - 1, 1, 2); px("#8a5a3b", hx, hy - 2, 5, 1);
        px("#c98a5a", hx, hy + 1, 5, 3); px("#a8683e", hx, hy + 2, 5, 1); px("#58a056", hx + 1, hy, 1, 1); px("#ee9a58", hx + 3, hy, 1, 1); break;
    }
  }

  // ---------------- tools ----------------
  part = "tool";
  if ((tool === "axe" || tool === "pickaxe") && pose === "swing") {
    const hx = side ? 10 : 14;
    if (armUp) {
      px("#8a5a3b", hx, 2, 1, 8);
      if (tool === "axe") { px("#c8ccd8", hx + 1, 2, 3, 3); px("#8b8fa3", hx + 3, 2, 1, 3); }
      else { px("#c8ccd8", hx - 2, 2, 5, 1); px("#c8ccd8", hx - 2, 3, 1, 1); px("#c8ccd8", hx + 2, 3, 1, 1); }
    } else {
      px("#8a5a3b", hx, 19, 4, 1);
      if (tool === "axe") px("#c8ccd8", hx + 3, 17, 2, 3);
      else px("#c8ccd8", hx + 3, 16, 1, 5);
    }
  }
  if (tool === "rod") {
    const rx = side ? 10 : 14;
    for (let k = 0; k < 9; k++) px("#8a5a3b", rx + Math.floor(k / 2), 19 - k, 1, 1);
  }

  // ---------------- outline around the whole silhouette ----------------
  g.setTransform(1, 0, 0, 1, 0, 0);
  const img = g.getImageData(0, 0, c.width, c.height), d = img.data, W = c.width, H = c.height;
  const solid = i => d[i * 4 + 3] > 0;
  const edge = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x;
    if (solid(i)) continue;
    if ((x > 0 && solid(i - 1)) || (x < W - 1 && solid(i + 1)) || (y > 0 && solid(i - W)) || (y < H - 1 && solid(i + W))) edge.push(i);
  }
  edge.forEach(i => { d[i * 4] = OUTLINE[0]; d[i * 4 + 1] = OUTLINE[1]; d[i * 4 + 2] = OUTLINE[2]; d[i * 4 + 3] = 255; });
  g.putImageData(img, 0, 0);
  return c;
}
