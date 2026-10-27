// The window around the room: the top and bottom bars, the panel above the room (shop, closet,
// record, settings), decorating, tooltips and toasts. Also starts everything up.
"use strict";

// The app shell (preload, or phone.js in the phone app). Opened as a plain page, everything still
// works without it.
const host = window.shell || {
  setGlobalTyping() {}, onKey() {}, onGlobalTypingFailed() {}, setSize() {}, setOnTop() {}, dock() {}, minimize() {}, quit() {},
};
// The phone app fills the screen: no window to size or move, a typing pad under the room.
const PHONE = !!host.phone;
const $ = sel => document.querySelector(sel);
const TOK = () => iconUrl("iconTok", 2);
const priceHtml = p => `<span class="price${game.state.points < p ? " short" : ""}" data-price="${p}"><img src="${TOK()}" alt="토독">${fmt(p)}</span>`;
const buyBtn = (label, act, id, price) => `<button class="btn small buy" data-act="${act}" data-id="${id}" data-price="${price}"${game.state.points < price ? " disabled" : ""}>${label}</button>`;

const BAR_H = 24, FOOT_H = 32, BORDER = 4;
const panelHeight = () => (game.state.settings.zoom >= 4 ? 400 : game.state.settings.zoom >= 3 ? 330 : 290);

// ---------------------------------------------------------------------------------------------
// Character look helpers (shared by the closet and the shop).
// ---------------------------------------------------------------------------------------------
const CLOSET_TABS = [
  ["gender", "성별"], ["face", "얼굴"], ["hair", "머리"], ["top", "상의"], ["bottom", "하의"], ["dress", "원피스"], ["shoes", "신발"], ["acc", "악세사리"],
];
const COLOR_OPTIONS = { skin: "skin", hairColor: "hairColor", topColor: "cloth", bottomColor: "cloth", dressColor: "cloth", shoesColor: "cloth" };
// What the shop sells, by kind: [option key, name].
const LOOK_SHOP = [["top", "상의"], ["bottom", "하의"], ["dress", "원피스"], ["shoes", "신발"], ["hair", "헤어"], ["hat", "모자"], ["glasses", "안경"], ["neck", "목"], ["hand", "손"]];

// A look with one option changed; a dress and a top/bottom replace each other.
function withOption(look, key, i) {
  const out = { ...look, [key]: i };
  if (key === "dress") out.outfit = 1;
  if (key === "top" || key === "bottom") out.outfit = 0;
  return out;
}

// ---------------------------------------------------------------------------------------------
// The UI
// ---------------------------------------------------------------------------------------------
// Text someone typed (a room's name), safe inside HTML.
const esc = t => String(t).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

const ui = {
  panel: null,        // "shop" | "pets" | "closet" | "paint" | "record" | "settings" | null
  tab: { shop: "furniture", looks: "top", pets: "adopt" },
  draft: null,        // the closet's look being edited
  closetTab: "gender",
  bgmTheme: null,
  adopt: { kind: "cat", color: 0, name: "" },
  paintTab: "piece",  // colour panel: "piece" | "wall" | "floor"
  admin: null,        // { elevated, always } from the app shell (PC only)

  init() {
    $("#pinIcon").src = iconUrl("iconPin", 2);
    $("#gearIcon").src = iconUrl("iconGear", 2);
    $("#tokIcon").src = TOK();
    $("#decoIcon").src = iconUrl("iconHammer", 2);
    $("#shopIcon").src = iconUrl("iconShop", 2);
    $("#petsIcon").src = iconUrl("iconPaw", 2);
    $("#recordIcon").src = iconUrl("iconChart", 2);
    $("#musicIcon").src = iconUrl("iconNote", 2);

    $("#pinBtn").onclick = () => { const st = game.state.settings; st.onTop = !st.onTop; host.setOnTop(st.onTop); this.updateBar(); };
    $("#setBtn").onclick = () => this.toggle("settings");
    $("#minBtn").onclick = () => host.minimize();
    $("#closeBtn").onclick = () => { game.save(); host.quit(); };
    $("#panelClose").onclick = () => this.close();
    document.querySelectorAll("[data-open]").forEach(b => b.onclick = () => b.dataset.open === "deco" ? this.startDeco() : this.toggle(b.dataset.open));
    $("#musicBtn").onclick = () => this.toggleMusic();
    $("#panelTabs").addEventListener("click", e => this.onAction(e));
    $("#panelExtra").addEventListener("click", e => this.onAction(e));
    $("#panelFoot").addEventListener("click", e => this.onAction(e));
    $("#panelBody").addEventListener("click", e => this.onAction(e));
    $("#panelBody").addEventListener("keydown", e => {
      if (e.key === "Enter" && e.target.id === "petRename") $("#panelBody [data-act=petRenameSave]").click();
      if (e.key === "Escape" && e.target.id === "petRename") { e.stopPropagation(); this.petEdit = null; this.render(); }
      if (e.key === "Enter" && e.target.id === "roomRename") $("#panelBody [data-act=roomRenameSave]").click();
      if (e.key === "Escape" && e.target.id === "roomRename") { e.stopPropagation(); this.roomEdit = null; this.render(); }
    });
    $("#panelBody").addEventListener("change", e => {
      if (e.target.id === "furnGroup") { this.furnGroup = e.target.value; this.render(); $("#panelBody").scrollTop = 0; }
    });
    $("#panelBody").addEventListener("input", e => {
      if (e.target.id === "lookName") this.draft.name = e.target.value;
      if (e.target.id === "petName") {
        this.adopt.name = e.target.value;
        const b = $("#panelBody [data-act=adopt]");
        if (b) b.disabled = !this.canAdopt();
      }
    });
    $("#storage").addEventListener("click", e => { const b = e.target.closest("[data-take]"); if (b) this.takeOut(b.dataset.take); });
    $("#storeBtn").onclick = () => this.storeHeld();
    $("#paintBtn").onclick = () => this.toggle("paint");
    $("#moveBtn").onclick = () => this.moveSelected();
    $("#footDeco").addEventListener("click", e => { const b = e.target.closest("[data-mode]"); if (b && b.dataset.mode === "me") this.open("closet"); });
    $("#pointsTip").dataset.tip = `토독: 키 1번에 ${EARN.perKey}, 켜 두기만 해도 1초에 ${EARN.perSec}씩 쌓입니다.`;
    $("#decoDone").onclick = () => this.stopDeco();

    const canvas = $("#room");
    canvas.addEventListener("pointerdown", e => this.decoDown(e));
    canvas.addEventListener("pointermove", e => this.decoMove(e));
    canvas.addEventListener("pointerup", e => this.decoUp(e));
    canvas.addEventListener("pointerleave", () => { if (room.deco) { room.deco.hover = null; room.deco.over = null; } });
    canvas.addEventListener("click", e => this.onRoomClick(e));
    canvas.addEventListener("contextmenu", e => { e.preventDefault(); if (room.deco) this.cancelHeld(); });
    addEventListener("keydown", e => { if (e.key === "Escape") this.back(); });
    this.initTooltips();
    game.on("petGift", i => {
      const m = pets.moves[i];
      if (m) { const f = room.foot(m.x, m.y); room.float(`+${PET_CARE.gift}`, f.x, f.y - 16); }
    });
    $("#roomBar").addEventListener("click", e => { const b = e.target.closest("[data-room]"); if (b) this.showRoom(game.state.cur + +b.dataset.room); });
    $("#whereMe").onclick = () => this.showRoom(actor.at);
    $("#roomName").onclick = () => this.editRoomName(game.state.cur);
    game.on("room", () => { this.renderRoomBar(); if (this.panel) this.render(); if (room.deco) this.renderStorage(); });
    game.on("change", () => {
      this.updateFoot();
      const typingHere = document.activeElement && document.activeElement.matches("#panelBody input");   // don't wipe a half-typed name
      if (this.panel && this.panel !== "closet" && !typingHere) this.render();
      if (room.deco) this.renderStorage();
    });
    if (PHONE) {
      $("#pad").hidden = false;
      host.onBack(() => this.back());
      host.onTypingAllowed(() => { if (this.panel === "settings") this.render(); });
      addEventListener("resize", () => this.layout());
    }
    this.updateBar();
    this.layout();
  },

  // Escape, or the phone's back button: put down what's carried, stop decorating, close the panel.
  // Returns whether there was anything to back out of.
  back() {
    if (room.deco) { room.deco.held ? this.cancelHeld() : this.stopDeco(); return true; }
    if (this.panel && game.state.created) { this.close(); return true; }
    return false;
  },

  // The window is as big as the room plus the bars, and the panel when one is open.
  // On the phone the page fills the screen and the room is scaled to its width instead.
  layout() {
    if (PHONE) return room.setZoom(phoneZoom());
    // As big as chosen, but never bigger than the screen, leaving room for at least a short panel
    // (so it doesn't jump when one opens); a big room gets a panel as tall as fits.
    const roomH = z => BORDER + BAR_H + RH * z + FOOT_H;
    const fits = z => RW * z + BORDER <= screen.availWidth && roomH(z) + 290 <= screen.availHeight;
    let z = game.state.settings.zoom;
    while (z > 2 && !fits(z)) z--;
    if (room.zoom !== z) room.setZoom(z);
    const panelH = this.panel ? Math.min(panelHeight(), Math.max(290, screen.availHeight - roomH(z))) : 0;
    $("#panel").style.flex = `0 0 ${panelH}px`;
    host.setSize(RW * z + BORDER, BORDER + BAR_H + panelH + RH * z + FOOT_H);
  },

  updateBar() {
    $("#pinBtn").classList.toggle("on", !!game.state.settings.onTop);
    $("#pinBtn").dataset.tip = game.state.settings.onTop ? "항상 위에 표시: 켜짐" : "항상 위에 표시: 꺼짐";
    $("#setBtn").classList.toggle("on", this.panel === "settings");
  },
  updateFoot() {
    const so = game.state.settings.sound;
    this.renderRoomBar();
    $("#points").textContent = fmt(game.state.points);
    $("#today").textContent = `오늘 ${fmt(game.today())}타`;
    $("#musicBtn").classList.toggle("on", so.bgm >= 0);
    $("#musicBtn").dataset.tip = so.bgm >= 0 ? `배경음: ${Ambient.NAMES[so.bgm]} (누르면 끄기)` : "배경음 켜기";
    document.querySelectorAll("[data-open]").forEach(b => b.classList.toggle("on", b.dataset.open === this.panel || (b.dataset.open === "deco" && (!!room.deco || this.panel === "closet"))));
    // Prices turn red and buy buttons grey while there isn't enough.
    document.querySelectorAll("#panelBody .price[data-price]").forEach(p => p.classList.toggle("short", game.state.points < +p.dataset.price));
    document.querySelectorAll("#panelBody .buy[data-price]").forEach(b => { b.disabled = game.state.points < +b.dataset.price; });
    const adopt = $("#panelBody [data-act=adopt]");
    if (adopt) adopt.disabled = !this.canAdopt();
  },

  toggleMusic() {
    const so = game.state.settings.sound;
    if (so.bgm >= 0) { so.lastBgm = so.bgm; so.bgm = -1; }
    else so.bgm = so.lastBgm >= 0 ? so.lastBgm : 12;
    this.updateFoot();
    if (this.panel === "settings") this.render();
  },

  // ---------- the panel ----------

  toggle(kind) { this.panel === kind ? this.close() : this.open(kind); },
  open(kind) {
    if (room.deco && kind !== "paint") this.stopDeco();
    this.panel = kind;
    if (kind === "closet") { this.draft = { ...game.state.look }; this.closetTab = "gender"; }
    $("#panel").hidden = false;
    this.layout();
    this.render();
    this.updateBar(); this.updateFoot();
    if (kind === "closet") this.previewLoop();
  },
  close() {
    this.panel = null;
    $("#panel").hidden = true;
    this.layout();
    this.updateBar(); this.updateFoot();
  },

  render() {
    const body = $("#panelBody"), scroll = body.scrollTop;
    let title = "", tabs = "", html = "";
    if (this.panel === "shop") [title, tabs, html] = ["상점", this.shopTabs(), this.shopHtml()];
    if (this.panel === "pets") [title, tabs, html] = ["반려동물", this.petTabs(), this.petsHtml()];
    if (this.panel === "closet") [title, tabs, html] = [game.state.created ? "캐릭터 꾸미기" : "캐릭터 만들기", this.closetTabs(), this.closetHtml()];
    if (this.panel === "paint") [title, tabs, html] = ["집 꾸미기", this.paintTabs(), this.paintHtml()];
    if (this.panel === "record") [title, html] = ["기록", this.recordHtml()];
    if (this.panel === "settings") [title, html] = ["설정", this.settingsHtml()];
    $("#panelTitle").textContent = title;
    // Decorating the character: a way back to decorating the house.
    // The character's buttons stay at the bottom of the panel, under the scrolling options.
    const first = !game.state.created;
    $("#panelFoot").hidden = this.panel !== "closet";
    if (this.panel === "closet") $("#panelFoot").innerHTML = `<button class="btn small" data-act="randomLook">무작위</button><span class="grow"></span>
      ${first ? "" : `<button class="btn small" data-act="close">취소</button>`}<button class="btn small on" data-act="saveLook">${first ? "시작하기" : "저장"}</button>`;
    // Decorating: switch between the house and the character.
    $("#panelExtra").innerHTML = this.panel === "closet" && game.state.created
      ? `<div class="seg"><button class="btn" data-act="decoHouse">집</button><button class="btn on">캐릭터</button></div>`
      : this.panel === "paint" ? `<div class="seg"><button class="btn on">집</button><button class="btn" data-act="decoMe">캐릭터</button></div>` : "";
    $("#panelTabs").innerHTML = tabs;
    $("#panelClose").hidden = !game.state.created;
    body.innerHTML = html;
    body.scrollTop = scroll;
    if (this.panel === "settings") this.bindSettings();
    if (this.panel === "closet") this.drawPreview();
    // A piece just chosen: its turning and colours come into view.
    if (this.panel === "paint" && this.scrollToSel) {
      this.scrollToSel = false;
      const sec = body.querySelector("#selSection");
      if (sec) body.scrollTop = sec.offsetTop - body.offsetTop - 4;
    }
    this.updateFoot();
  },

  // ---------- shop ----------

  shopTabs() {
    const t = this.tab.shop;
    const main = [["furniture", "가구"], ["theme", "벽·바닥"], ["room", "방"], ["looks", "옷·꾸미기"]].map(([id, name]) =>
      `<button class="btn${id === t ? " on" : ""}" data-act="shopTab" data-id="${id}">${name}</button>`).join("");
    return main;
  },
  shopHtml() {
    const s = game.state;
    switch (this.tab.shop) {
      case "furniture": {
        const listed = new Set(FURN_GROUPS.flatMap(([, ids]) => ids));
        const groups = FURN_GROUPS.map(([name, ids]) => [name, ids.map(id => FURNITURE.find(f => f.id === id)).filter(Boolean)]);
        const rest = FURNITURE.filter(f => !f.fixed && !f.pet && !listed.has(f.id));
        if (rest.length) groups.push(["그 밖의 가구", rest]);
        // A drop-down picks which kind is shown (or all of them).
        const pick = this.furnGroup || "all", shown = pick === "all" ? groups : groups.filter(([name]) => name === pick);
        return `<div class="row furn-pick"><span class="desc">종류</span><select id="furnGroup" aria-label="가구 종류">
            <option value="all"${pick === "all" ? " selected" : ""}>전체</option>${groups.map(([name]) => `<option value="${name}"${name === pick ? " selected" : ""}>${name}</option>`).join("")}</select></div>
          <div class="desc">구매한 가구는 보관함에 들어갑니다. 보관함에 있는 가구는 산 값 그대로 환불할 수 있습니다.</div>`
          + shown.map(([name, items]) => `${pick === "all" ? `<div class="section-label">${name}</div>` : ""}<div class="wares">${items.map(f => this.furnitureWare(f)).join("")}</div>`).join("");
      }
      case "theme": {
        const list = (kind, items, label) => `<div class="section-label">${label}</div><div class="wares">${items.map(t => {
          const have = game.hasTheme(kind, t.id), using = game.room()[kind] === t.id;
          return `<div class="ware"><div class="pic"><img class="swatch" src="${themeSwatch(kind, t.id)}" alt=""></div><div class="name">${t.name}</div>
            ${have ? `<span class="tag">${using ? "사용 중" : "보유"}</span>` : priceHtml(t.price)}
            ${using ? "" : have ? `<button class="btn small" data-act="useTheme" data-id="${kind}:${t.id}">사용</button>` : buyBtn("구매", "buyTheme", `${kind}:${t.id}`, t.price)}</div>`;
        }).join("")}</div>`;
        return `<div class="desc">지금 보고 있는 방(${game.roomName()})에 적용됩니다.</div>` + list("wall", WALLPAPERS, "벽지") + list("floor", FLOORS, "바닥");
      }
      case "room": {
        // Rooms to build: each comes with its own wall and floor; go between them with ◀ ▶ or the door.
        // Each room built: its name, which can be changed.
        const built = `<div class="card"><div class="title">지은 방 · ${s.rooms.length}개</div>${s.rooms.map((r, i) => `<div class="row room-row">${this.roomEdit === i
          ? `<input id="roomRename" maxlength="8" value="${esc(game.roomName(i))}" aria-label="방 이름"><button class="btn small on" data-act="roomRenameSave" data-id="${i}">저장</button><button class="btn small" data-act="roomEditCancel">취소</button>`
          : `<b>${esc(game.roomName(i))}</b>${i === s.cur ? `<span class="tag">보는 중</span>` : ""}<span class="grow"></span><button class="btn small" data-act="roomRename" data-id="${i}">이름 바꾸기</button>`}</div>`).join("")}
          <div class="desc">이름을 비우고 저장하면 원래 이름으로 돌아갑니다. 방 위쪽의 방 이름을 눌러도 바꿀 수 있습니다.</div></div>`;
        const wares = ROOM_KINDS.map(k => { const price = game.roomPrice(k.id); return `<div class="ware"><div class="pic"><img class="swatch" src="${surfaceIcon("floor", k.floor, k.floorColor)}" alt=""></div>
          <div class="name">${k.name}</div>${priceHtml(price)}${buyBtn("짓기", "buyRoom", k.id, price)}</div>`; }).join("");
        return built + `<div class="section-label">방 짓기</div><div class="wares">${wares}</div>`
          + `<div class="desc">같은 종류도 몇 개든 지을 수 있고, 방이 늘 때마다 다음 방은 ${fmt(ROOM_PRICE_STEP)}씩 비싸집니다. 방 위쪽의 ◀ ▶ 나 아래쪽 가운데의 문을 눌러 방을 오갈 수 있습니다. 캐릭터와 반려동물도 문으로 방을 오갑니다.</div>`;
      }
      case "looks": {
        const key = this.tab.looks;
        const sub = `<div class="tabs sub">${LOOK_SHOP.map(([k, name]) => `<button class="btn${k === key ? " on" : ""}" data-act="looksTab" data-id="${k}">${name}</button>`).join("")}</div>`;
        const wares = LOOK_OPTIONS[key].map((name, i) => {
          if (name === "없음" || !allowedFor(key, i, s.look.gender)) return "";
          const price = cosmeticPrice(key, i), owned = !price || s.unlocked.includes(`${key}:${i}`);
          const look = withOption(s.look, key, i);
          return `<div class="ware" data-tip="${lookName(key, i)}"><div class="pic"><img src="${key === "hair" ? lookPreview(look, "head", 2) : garmentPreview(look, key)}" alt=""></div>
            <div class="name">${name}</div>${!price ? `<span class="tag">기본</span>` : owned ? `<span class="tag">보유</span>` : priceHtml(price)}
            ${owned ? `<button class="btn small" data-act="wear" data-id="${key}:${i}">입기</button>` : buyBtn("구매", "buyLook", `${key}:${i}`, price)}</div>`;
        }).join("");
        return sub + `<div class="wares">${wares}</div>`;
      }
    }
    return "";
  },

  // A furniture card for the shop.
  furnitureWare(f) {
    const s = game.state, stored = s.owned[f.id] || 0, placed = game.allPlaced().filter(p => p.id === f.id).length;
    const note = f.wall ? " · 벽에 거는 가구" : f.only ? ` · ${PETS.kinds[f.only].name} 전용` : "";
    return `<div class="ware" data-tip="${f.name}${note}">
      <div class="pic"><img src="${furnitureIcon(f.id)}" alt=""></div><div class="name">${f.name}</div>
      ${priceHtml(f.price)}<div class="sub">${stored || placed ? `보관 ${stored} · 배치 ${placed}` : "&nbsp;"}</div>
      <div class="ware-btns">${buyBtn("구매", "buyFurniture", f.id, f.price)}${game.refundable(f.id) ? `<button class="btn small${this.refundAsk === f.id ? " danger" : ""}" data-act="refund" data-id="${f.id}" data-tip="보관함의 ${f.name} 하나를 ${fmt(f.price)}에 되돌려 받습니다">${this.refundAsk === f.id ? "정말 환불" : "환불"}</button>` : ""}</div></div>`;
  },
  // ---------- pets: their own panel ----------

  petTabs() {
    return [["adopt", "입양"], ["dress", "꾸미기"], ["care", "돌보기"]].map(([id, name]) =>
      `<button class="btn${id === this.tab.pets ? " on" : ""}" data-act="petTab" data-id="${id}">${name}</button>`).join("");
  },
  petsHtml() {
    const kinds = PETS.kinds;
    const pic = (kind, color) => { const [, main, dark] = kinds[kind].colors[color]; return petSprite(kind + "Sit", main, dark).toDataURL(); };
    if (this.tab.pets === "dress") return this.petDressHtml(pic);
    if (this.tab.pets === "care") return this.petCareHtml(pic);
    return this.petAdoptHtml(pic);
  },
  // 입양: kind, coat, name.
  petAdoptHtml(pic) {
    const s = game.state, a = this.adopt, kinds = PETS.kinds, price = game.petPrice();
    return `<div class="card">
      <div class="seg">${Object.entries(kinds).map(([k, v]) => `<button class="btn${k === a.kind ? " on" : ""}" data-act="adoptKind" data-id="${k}">${v.name}</button>`).join("")}</div>
      <div class="tiles">${kinds[a.kind].colors.map((c, i) => `<button class="tile${i === a.color ? " on" : ""}" data-act="adoptColor" data-id="${i}" data-tip="${c[0]}"><img src="${pic(a.kind, i)}" style="width:${32}px" alt="${c[0]}"></button>`).join("")}</div>
      <div class="closet-side"><input id="petName" maxlength="8" placeholder="이름" value="${a.name.replace(/"/g, "&quot;")}"></div>
      <div class="row">${price ? priceHtml(price) : `<span class="tag">무료</span>`}<span class="grow"></span><button class="btn small" data-act="adopt"${this.canAdopt() ? "" : " disabled"}>입양</button></div></div>
      <div class="desc">${s.pets.length ? `함께 사는 아이: ${s.pets.map(p => p.name).join(", ")}` : "반려동물은 방을 돌아다니며 곁에 머뭅니다. 누르면 하트를 보냅니다."}</div>`;
  },
  // 돌보기: how full each one is, food, and things for pets.
  petCareHtml(pic) {
    const s = game.state;
    const bowls = game.allPlaced().filter(p => p.id === "bowl"), emptyBowls = bowls.filter(p => !(p.food >= PET_CARE.servings)).length;
    const edit = this.petEdit || {};
    const family = s.pets.length ? `<div class="card"><div class="title">우리 아이들</div>${s.pets.map((p, i) => {
      const full = Math.round(p.full), mood = p.hidden ? "숨어 있어요" : full < PET_CARE.starvingBelow ? "배고파요" : full < PET_CARE.hungryBelow ? "출출해요" : "배불러요";
      const acts = edit.i === i && edit.mode === "rename"
        ? `<input id="petRename" maxlength="8" value="${p.name.replace(/"/g, "&quot;")}" aria-label="새 이름"><button class="btn small on" data-act="petRenameSave" data-id="${i}">저장</button><button class="btn small" data-act="petEditCancel">취소</button>`
        : edit.i === i && edit.mode === "hotel"
        ? `<span class="desc grow">${p.name}을(를) 호텔에 보낼까요? 다시 데려올 수 없습니다.</span><button class="btn small danger" data-act="petHotelYes" data-id="${i}">보내기</button><button class="btn small" data-act="petEditCancel">취소</button>`
        : `<button class="btn small" data-act="petRename" data-id="${i}">이름 바꾸기</button><button class="btn small" data-act="petHide" data-id="${i}">${p.hidden ? "방에 보이기" : "숨기기"}</button><button class="btn small" data-act="petHotel" data-id="${i}">호텔 보내기</button>`;
      return `<div class="pet-row${p.hidden ? " hidden-pet" : ""}"><div class="row"><img src="${pic(p.kind, p.color)}" style="width:22px" alt=""><b>${p.name}</b><span class="desc">${mood}</span><span class="grow"></span>
        <div class="progress" data-tip="배부름 ${full}%"><div class="fill${full < PET_CARE.starvingBelow ? " low" : ""}" style="width:${full}%"></div></div></div>
        <div class="row pet-acts">${acts}</div></div>`;
    }).join("")}
      <div class="desc">숨긴 아이는 방에서만 보이지 않고, 숨어 있는 동안에는 배도 고프지 않습니다.</div></div>` : `<div class="desc">아직 함께 사는 아이가 없습니다. 입양 탭에서 데려올 수 있습니다.</div>`;
    const food = `<div class="card"><div class="row"><b>사료</b><span class="desc">${fmt(s.food)}봉</span><span class="grow"></span>
        ${buyBtn(`${PET_CARE.bag.count}봉 사기`, "buyFood", "", PET_CARE.bag.price)}
        <button class="btn small" data-act="fillBowls"${emptyBowls && s.food ? "" : " disabled"}>밥그릇 채우기</button></div>
      <div class="desc">${bowls.length || game.allPlaced().some(p => p.id === "feeder") ? "배고프면 밥그릇에 가서 먹습니다. 방에서 밥그릇을 눌러도 채울 수 있고, 자동 급식기는 사료를 알아서 채웁니다. 배부른 아이는 가끔 토독을 물어 옵니다."
        : "밥그릇이나 자동 급식기를 놓으면 배고플 때 가서 먹습니다. 아래 용품에서 살 수 있습니다."}</div></div>`;
    const supplies = `<div class="section-label">반려동물 용품</div><div class="wares">${FURNITURE.filter(f => f.pet).map(f => this.furnitureWare(f)).join("")}</div>
      <div class="desc">산 용품은 보관함에 들어갑니다. 꾸미기에서 배치할 수 있습니다.</div>`;
    return family + food + supplies;
  },
  // 꾸미기: pick a pet, then each accessory shown on it, to buy (once, for all) or put on.
  petDressHtml(pic) {
    const s = game.state;
    if (!s.pets.length) return `<div class="desc">아직 함께 사는 아이가 없습니다. 입양 탭에서 데려올 수 있습니다.</div>`;
    const i = Math.min(this.dressPet || 0, s.pets.length - 1), pet = s.pets[i], [, main, dark] = PETS.kinds[pet.kind].colors[pet.color];
    const who = s.pets.length > 1 ? `<div class="tabs sub">${s.pets.map((p, k) =>
      `<button class="btn${k === i ? " on" : ""}" data-act="dressWho" data-id="${k}">${p.name}</button>`).join("")}</div>` : "";
    const wares = PET_ACCESSORIES.map(a => {
      const owned = s.petAcc.includes(a.id), on = pet.acc === a.id;
      return `<div class="ware${on ? " on" : ""}"><div class="pic"><img src="${petSprite(pet.kind + "Sit", main, dark, a.id).toDataURL()}" style="width:${(SPRITES[pet.kind + "Sit"][0].length + 4) * 3}px" alt=""></div>
        <div class="name">${a.name}</div>${owned ? `<span class="tag">${on ? "착용 중" : "보유"}</span>` : priceHtml(a.price)}
        ${owned ? `<button class="btn small" data-act="dress" data-id="${a.id}">${on ? "벗기" : "씌우기"}</button>` : buyBtn("구매", "buyPetAcc", a.id, a.price)}</div>`;
    }).join("");
    return `${who}<div class="section-label">${pet.name}의 액세서리</div><div class="wares">${wares}</div>
      <div class="desc">한 번 산 액세서리는 모든 아이에게 씌울 수 있습니다.</div>`;
  },
  canAdopt() { return !!this.adopt.name.trim() && game.state.points >= game.petPrice(); },

  // ---------- colour panel ----------

  paintTabs() {
    return [["piece", "가구"], ["wall", "벽"], ["floor", "바닥"]].map(([id, name]) =>
      `<button class="btn${id === this.paintTab ? " on" : ""}" data-act="paintTab" data-id="${id}">${name}</button>`).join("");
  },
  // The house panel. 가구: what's in this room and in storage (4 to a row), then for the piece
  // selected its turning and every colour as a card; 벽 / 바닥: the colours of this room's wall/floor.
  paintHtml() {
    const s = game.state, rm = game.room(), card = (pic, n, on, act) => `<div class="ware pick${on ? " on" : ""}" data-act="${act}" data-id="${n}">
      <div class="pic"><img src="${pic}" alt=""></div><div class="name">${COLOR_NAMES[n]}</div>${on ? `<span class="tag">사용 중</span>` : ""}</div>`;
    if (this.paintTab !== "piece") {
      const kind = this.paintTab, now = rm[kind === "wall" ? "wallColor" : "floorColor"] || 0, id = rm[kind];
      return `<div class="wares">${COLOR_ORDER.map(n => card(surfaceIcon(kind, id, n), n, n === now, "paintSurface").replace("<img ", '<img class="swatch" ')).join("")}</div>`;
    }
    const d = room.deco, sel = d && d.selected && rm.placed.includes(d.selected) ? d.selected : null;
    const small = (pic, name, attrs, on, extra = "") => `<div class="ware pick${on ? " on" : ""}" ${attrs} data-tip="${name}"><div class="pic"><img src="${pic}" alt=""></div><div class="name">${name}</div>${extra}</div>`;
    const placed = `<div class="section-label">배치된 가구 · ${game.roomName()}</div><div class="grid4">${rm.placed.map((p, i) =>
      small(pieceIcon(p.id, p.color), game.piece(p.id).name, `data-act="paintPick" data-id="${i}"`, p === sel)).join("")}</div>`;
    const owned = Object.entries(s.owned).filter(([, n]) => n > 0);
    const stored = `<div class="section-label">보관함</div>` + (owned.length ? `<div class="grid4">${owned.map(([id, n]) =>
      small(furnitureIcon(id), game.piece(id).name, `data-act="takeOut" data-id="${id}"`, d && d.held && d.held.id === id && !d.held.from, n > 1 ? `<span class="count">${n}</span>` : "")).join("")}</div>
      <div class="desc">보관함의 가구를 누른 뒤, 방에서 놓을 칸을 누르세요. 필요 없는 가구는 상점에서 환불할 수 있습니다.</div>` : `<div class="desc">비어 있습니다. 상점에서 산 가구가 여기에 들어옵니다.</div>`);
    if (!sel) return placed + stored + `<div class="desc">방이나 위의 목록에서 가구를 누르면 회전과 색을 바꿀 수 있습니다.</div>`;
    const f = game.piece(sel.id);
    return placed + stored + `<div class="section-label" id="selSection">선택한 가구 · ${f.name}</div>
      <div class="row turn"><span class="desc">회전 ${sel.a || 0}°</span>
        <button class="btn small" data-act="turn" data-id="-90">-90°</button><button class="btn small" data-act="turn" data-id="90">+90°</button>
        <button class="btn small" data-act="turn" data-id="-10">-10°</button><button class="btn small" data-act="turn" data-id="10">+10°</button></div>
      <div class="row"><button class="btn small" data-act="moveSel">옮기기</button>${f.fixed ? "" : `<button class="btn small" data-act="storeSel">보관함에 넣기</button>`}</div>
      <div class="wares">${COLOR_ORDER.map(n => card(pieceIcon(sel.id, n), n, n === (sel.color || 0), "paintPiece")).join("")}</div>`;
  },

  // ---------- closet ----------

  closetTabs() {
    return CLOSET_TABS.map(([id, name]) => `<button class="btn${id === this.closetTab ? " on" : ""}" data-act="closetTab" data-id="${id}">${name}</button>`).join("");
  },
  sections() {
    switch (this.closetTab) {
      case "gender": return [["gender", "성별", "full"]];
      case "face": return [["skin", "피부", "swatch"], ["eyes", "눈", "face"], ["nose", "코", "face"], ["mouth", "입", "face"]];
      case "hair": return [["hair", "머리 모양", "head"], ["hairColor", "머리 색", "swatch"]];
      case "top": return [["top", "상의", "garment"], ["topColor", "상의 색", "swatch"]];
      case "bottom": return [["bottom", "하의", "garment"], ["bottomColor", "하의 색", "swatch"]];
      case "dress": return [["dress", "원피스", "garment"], ["dressColor", "원피스 색", "swatch"]];
      case "shoes": return [["shoes", "신발", "garment"], ["shoesColor", "신발 색", "swatch"]];
      case "acc": return [["hat", "모자", "garment"], ["glasses", "안경", "garment"], ["neck", "목", "garment"], ["hand", "손", "garment"]];
    }
    return [];
  },
  wearing(key, i) {
    const L = this.draft;
    if (key === "dress") return L.outfit === 1 && L.dress === i;
    if (key === "top" || key === "bottom") return L.outfit !== 1 && L[key] === i;
    return L[key] === i;
  },
  closetHtml() {
    const L = this.draft, owned = game.state.unlocked, first = !game.state.created;
    const top = `<div class="closet-top"><canvas id="lookPreview" width="72" height="44"></canvas>
      <div class="closet-side">
        <span class="section-label">이름</span>
        <input id="lookName" maxlength="10" placeholder="캐릭터 이름" value="${(L.name || "").replace(/"/g, "&quot;")}">
      </div></div>`;
    const parts = this.sections().map(([key, label, region]) => {
      if (region === "swatch") {
        return `<div class="section-label">${label}</div><div class="swatches">${LOOK_OPTIONS[COLOR_OPTIONS[key]].map((c, i) =>
          `<button class="sw${L[key] === i ? " on" : ""}" style="background:${c}" data-act="pick" data-id="${key}:${i}" aria-label="${label} ${i + 1}"></button>`).join("")}</div>`;
      }
      const tiles = LOOK_OPTIONS[key].map((name, i) => {
        if (isLocked(key, i, owned) || !allowedFor(key, i, L.gender)) return "";
        if (name === "없음") return `<button class="tile${L[key] === i ? " on" : ""}" data-act="pick" data-id="${key}:${i}">없음</button>`;
        const look = withOption(L, key, i);
        const pic = region === "garment" ? garmentPreview(look, key) : lookPreview(look, region, 2);
        return `<button class="tile${this.wearing(key, i) ? " on" : ""}" data-act="pick" data-id="${key}:${i}" data-tip="${lookName(key, i)}"><img src="${pic}" alt="${name}"></button>`;
      }).join("");
      const off = key === "dress" ? `<button class="tile${L.outfit !== 1 ? " on" : ""}" data-act="pick" data-id="outfit:0">입지 않음</button>` : "";
      return `<div class="section-label">${label}</div><div class="tiles">${off}${tiles}</div>`;
    }).join("");
    return top + parts + (first ? "" : `<div class="desc">더 많은 옷과 헤어는 상점에서 구매할 수 있습니다.</div>`);
  },
  drawPreview() {
    const c = $("#lookPreview");
    if (!c) return;
    const g = c.getContext("2d"), t = performance.now() / 1000;
    g.imageSmoothingEnabled = false;
    g.clearRect(0, 0, c.width, c.height);
    g.fillStyle = "#a3a3a3"; g.fillRect(0, 36, c.width, c.height - 36);
    drawCharacter(g, this.draft, 14, 38, "down", "walk", t);
    drawCharacter(g, this.draft, 36, 38, "right", "walk", t + 0.3);
    drawCharacter(g, this.draft, 58, 38, "up", "walk", t + 0.6);
  },
  previewLoop() {
    if (this.panel !== "closet") return;
    this.drawPreview();
    requestAnimationFrame(() => this.previewLoop());
  },

  // ---------- record ----------

  recordHtml() {
    const days = game.recent(7), max = Math.max(1, ...days.map(d => d.keys)), names = ["일", "월", "화", "수", "목", "금", "토"];
    return `<div class="stat-grid">
        <div class="stat"><b>${fmt(game.today())}</b><small>오늘</small></div>
        <div class="stat"><b>${fmt(game.bestDay())}</b><small>하루 최고</small></div>
        <div class="stat"><b>${fmt(game.state.totalKeys)}</b><small>전체</small></div>
      </div>
      <div class="section-label">최근 7일</div>
      <div class="bars">${days.map((d, i) => `<div class="bar${i === days.length - 1 ? " today" : ""}" data-tip="${d.day.getMonth() + 1}/${d.day.getDate()} · ${fmt(d.keys)}타">
        <span>${d.keys ? fmt(d.keys) : ""}</span><div class="fill" style="height:${Math.round(d.keys / max * 56)}px"></div><span>${names[d.day.getDay()]}</span></div>`).join("")}</div>
      <div class="desc">키를 누를 때마다 토독이 ${EARN.perKey}씩 쌓이고, 켜 두기만 해도 1초에 ${EARN.perSec}씩 쌓입니다.</div>`;
  },

  // ---------- settings ----------

  settingsHtml() {
    const st = game.state.settings, so = st.sound;
    const seg = (key, value, options) => `<div class="seg">${options.map(([v, label]) =>
      `<button class="btn${String(v) === String(value) ? " on" : ""}" data-act="setting" data-id="${key}:${v}">${label}</button>`).join("")}</div>`;
    const select = (kind, key, label, value, options, off = false) => `<label class="pick-row${off ? " dim" : ""}"><span class="label">${label}</span>
      <select data-pick="${kind}" data-key="${key}"${off ? " disabled" : ""}>${options.map(([v, text]) =>
        `<option value="${v}"${String(v) === String(value) ? " selected" : ""}>${text}</option>`).join("")}</select></label>`;
    const slider = (key, label, off = false) => {
      const v = Math.round(so[key] * 100), d = off ? " disabled" : "";
      return `<div class="slider-row${off ? " dim" : ""}" data-slider="${key}"><span class="label">${label}</span>
        <input type="range" min="0" max="100" value="${v}" aria-label="${label}"${d}>
        <button class="step" data-step="-1" aria-label="${label} 내리기"${d}>−</button>
        <input class="num" type="number" min="0" max="100" value="${v}" aria-label="${label} 값"${d}>
        <button class="step" data-step="1" aria-label="${label} 올리기"${d}>+</button></div>`;
    };
    const current = so.bgm >= 0 ? so.bgm : so.lastBgm;
    const theme = this.bgmTheme ?? Math.max(0, BGM_THEMES.findIndex(t => t.items.includes(current)));
    this.bgmTheme = theme;
    return `
      <div class="card"><div class="title">효과음</div>
        ${select("sound", "mode", "재생", so.mode, [["typing", "키 입력 시"], ["auto", "자동 재생"], ["off", "끄기"]])}
        ${select("sound", "clip", "소리", so.clip, CLIP_NAMES.map((n, i) => [i, n]), so.mode === "off")}
        ${slider("pitch", "높낮이")}
        ${slider("volume", "볼륨")}
        ${so.mode === "auto" ? slider("autoPace", "속도") : ""}
      </div>
      <div class="card"><div class="title">배경음</div>
        ${select("bgmTheme", "theme", "장르", theme, BGM_THEMES.map((t, i) => [i, t.name]))}
        ${select("sound", "bgm", "곡", so.bgm, [[-1, "끄기"], ...BGM_THEMES[theme].items.map(i => [i, Ambient.NAMES[i]])])}
        ${slider("bgmVolume", "볼륨", so.bgm < 0)}
      </div>
      ${PHONE ? "" : `<div class="card"><div class="title">창</div>
        <div class="row"><span class="desc">항상 위에 표시</span><span class="grow"></span>${seg("onTop", st.onTop, [[true, "켜기"], [false, "끄기"]])}</div>
        <div class="row"><span class="desc">크기</span><span class="grow"></span>${seg("zoom", st.zoom, [[2, "작게"], [3, "크게"], [4, "더 크게"], [6, "아주 크게"]])}</div>
        <div class="row"><span class="desc">위쪽 바를 끌어 옮길 수 있습니다.</span><span class="grow"></span><button class="btn small" data-act="dock">오른쪽 아래로</button></div>
      </div>`}
      <div class="card"><div class="title">키 입력 감지 방식</div>
        ${PHONE ? `${seg("typing", st.typing, [["global", "폰 전체 입력"], ["window", "앱 안 입력"]])}
        <div class="desc">폰 전체 입력: 다른 앱에서 입력해도 셉니다. 접근성 권한이 필요하며, 입력한 내용은 쓰지 않고 횟수만 셉니다.</div>
        ${st.typing === "global" && !host.typingAllowed ? `<div class="row"><span class="desc">접근성 권한이 꺼져 있습니다.</span><span class="grow"></span>
          <button class="btn small" data-act="allowTyping">권한 켜기</button></div>` : ""}`
        : `${seg("typing", st.typing, [["global", "PC 입력"], ["window", "게임 내 입력"]])}
        <div class="desc">PC 입력: 다른 프로그램에서 입력해도 감지합니다.</div>`}</div>
      ${PHONE ? "" : this.adminHtml()}
      <div class="card"><div class="title">초기화</div>
        <div class="row" id="resetRow"><button class="btn small danger" data-act="reset">방과 토독 초기화</button></div></div>`;
  },
  // Games that run as administrator (Lost Ark and the like) keep their key presses from other
  // programs; running this app as administrator too lets it count them.
  adminHtml() {
    if (!host.adminState) return "";
    if (!this.admin) { host.adminState().then(a => { this.admin = a; if (this.panel === "settings") this.render(); }); return ""; }
    const a = this.admin;
    return `<div class="card"><div class="title">관리자 권한 실행</div>
      <div class="desc">관리자 권한 실행 프로그램 인식을 포함하려면 이 설정을 켜야 합니다.</div>
      <div class="row"><span class="desc">항상 관리자 권한으로 실행</span><span class="grow"></span>
        <div class="seg">${[[true, "켜기"], [false, "끄기"]].map(([v, label]) =>
          `<button class="btn${a.always === v ? " on" : ""}" data-act="adminAlways" data-id="${v}">${label}</button>`).join("")}</div></div>
      <div class="row"><span class="desc">지금: ${a.elevated ? "관리자 권한으로 실행 중" : "일반 권한으로 실행 중"}</span><span class="grow"></span>
        ${a.elevated ? "" : `<button class="btn small" data-act="relaunchAdmin">관리자 권한으로 다시 실행</button>`}</div></div>`;
  },
  bindSettings() {
    const so = game.state.settings.sound;
    document.querySelectorAll("#panelBody select[data-pick]").forEach(sel => {
      sel.onchange = () => {
        const v = sel.value;
        if (sel.dataset.pick === "bgmTheme") {
          this.bgmTheme = +v;
          if (so.bgm >= 0) so.bgm = BGM_THEMES[this.bgmTheme].items[0];
        } else {
          const k = sel.dataset.key;
          so[k] = k === "clip" || k === "bgm" ? +v : v;
          if (k === "bgm" && so.bgm >= 0) so.lastBgm = so.bgm;
          audio.apply();
          if (k === "clip") audio.click();
        }
        this.render();
      };
    });
    // Sliders: drag, type a number (0–100), or step with − / + (hold to repeat).
    document.querySelectorAll("#panelBody [data-slider]").forEach(row => {
      const key = row.dataset.slider, range = row.querySelector("input[type=range]"), num = row.querySelector(".num");
      const done = () => { if (key === "volume" || key === "pitch") audio.click(); };
      const set = v => {
        v = Math.max(0, Math.min(100, Math.round(v)));
        so[key] = v / 100;
        range.value = v;
        if (document.activeElement !== num) num.value = v;
      };
      range.oninput = () => set(+range.value);
      range.onchange = done;
      num.onchange = () => { set(num.value === "" ? +range.value : +num.value); num.value = range.value; done(); };
      num.onkeydown = e => { if (e.key === "Enter") num.blur(); };
      row.querySelectorAll(".step").forEach(b => {
        let timer = null;
        const by = +b.dataset.step;
        b.onpointerdown = e => {
          if (b.disabled) return;
          e.preventDefault();
          set(+range.value + by);
          const again = () => { set(+range.value + by); timer = setTimeout(again, 60); };
          timer = setTimeout(again, 400);
        };
        const stop = () => { if (timer !== null) { clearTimeout(timer); timer = null; done(); } };
        b.onpointerup = stop; b.onpointerleave = stop; b.onpointercancel = stop;
      });
    });
  },

  // ---------- one handler for every button in the panel ----------

  onAction(e) {
    const b = e.target.closest("[data-act]");
    if (!b || b.disabled) return;
    const id = b.dataset.id || "", s = game.state;
    switch (b.dataset.act) {
      case "close": this.close(); break;
      case "shopTab": this.tab.shop = id; $("#panelBody").scrollTop = 0; this.render(); break;
      case "petTab": this.tab.pets = id; $("#panelBody").scrollTop = 0; this.render(); break;
      case "looksTab": this.tab.looks = id; this.render(); break;
      case "buyFurniture":
        if (game.buyFurniture(id)) this.toast(`${game.piece(id).name}을(를) 보관함에 넣었습니다.`);
        break;
      case "buyTheme": { const [kind, t] = id.split(":"); game.buyTheme(kind, t); break; }
      case "useTheme": { const [kind, t] = id.split(":"); game.useTheme(kind, t); break; }
      case "buyLook": { const [key, i] = id.split(":"); if (game.buyCosmetic(key, +i)) this.toast(`${LOOK_OPTIONS[key][+i]}을(를) 구매했습니다.`); break; }
      case "wear": {
        const [key, i] = id.split(":");
        s.look = withOption(s.look, key, +i);
        game.save();
        this.toast(`${LOOK_OPTIONS[key][+i]}을(를) 입었습니다.`);
        break;
      }
      case "petRename": this.petEdit = { i: +id, mode: "rename" }; this.render(); setTimeout(() => { const el = $("#petRename"); if (el) { el.focus(); el.select(); } }); break;
      case "petRenameSave": {
        const el = $("#petRename");
        if (el && game.renamePet(+id, el.value)) { this.petEdit = null; this.render(); }
        else this.toast("이름을 입력해 주세요.");
        break;
      }
      case "petHide": game.togglePetHidden(+id); break;
      case "petHotel": this.petEdit = { i: +id, mode: "hotel" }; this.render(); break;
      case "petHotelYes": {
        this.petEdit = null;
        const pet = game.sendToHotel(+id);
        if (pet) this.toast(`${pet.name}은(는) 호텔로 떠났습니다.`);
        if ((this.dressPet || 0) >= s.pets.length) this.dressPet = 0;
        break;
      }
      case "petEditCancel": this.petEdit = null; this.render(); break;
      case "dressWho": this.dressPet = +id; this.render(); break;
      case "buyPetAcc": if (game.buyPetAcc(id)) game.dressPet(Math.min(this.dressPet || 0, s.pets.length - 1), id); break;
      case "dress": game.dressPet(Math.min(this.dressPet || 0, s.pets.length - 1), id); break;
      case "buyFood": if (game.buyFood()) this.toast(`사료 ${PET_CARE.bag.count}봉을 샀습니다.`); break;
      case "fillBowls": { const n = game.fillBowls(); if (n) this.toast(`밥그릇 ${n}개를 채웠습니다.`); break; }
      case "adoptKind": this.adopt.kind = id; this.adopt.color = 0; this.render(); break;
      case "adoptColor": this.adopt.color = +id; this.render(); break;
      case "adopt":
        if (!this.canAdopt()) { this.toast("이름을 입력해 주세요."); break; }
        if (game.adopt(this.adopt.kind, this.adopt.color, this.adopt.name.trim())) {
          this.toast(`${s.pets[s.pets.length - 1].name}이(가) 새 가족이 되었습니다.`);
          this.adopt.name = "";
        }
        break;
      case "closetTab": this.closetTab = id; $("#panelBody").scrollTop = 0; this.render(); break;
      case "pick": { const [key, i] = id.split(":"); this.draft = fitGender(withOption(this.draft, key, +i)); this.render(); break; }
      case "randomLook": this.draft = { ...randomLook(), name: this.draft.name }; this.render(); break;
      case "saveLook": {
        const first = !s.created;
        s.look = { ...this.draft, name: (this.draft.name || "").trim() };
        s.created = true;
        game.save();
        this.close();
        if (first) this.toast(`${s.look.name || "새 주민"}님, 환영합니다! 키를 누르면 토독이 쌓입니다.`, 6000);
        break;
      }
      case "setting": {
        const [key, v] = id.split(":"), st = s.settings;
        if (key === "onTop") { st.onTop = v === "true"; host.setOnTop(st.onTop); this.updateBar(); }
        if (key === "zoom") { st.zoom = +v; this.layout(); }
        if (key === "typing") { st.typing = v; host.setGlobalTyping(v === "global"); }
        this.render();
        break;
      }
      case "dock": host.dock(); break;
      case "decoHouse": this.close(); this.startDeco(); break;
      case "decoMe": this.open("closet"); break;
      case "paintTab": this.paintTab = id; $("#panelBody").scrollTop = 0; this.render(); break;
      case "paintPick": {
        if (!room.deco) this.startDeco(true);
        room.deco.selected = game.room().placed[+id];
        this.afterSelect(true);
        break;
      }
      case "takeOut": if (!room.deco) this.startDeco(true); this.takeOut(id); this.render(); break;
      case "turn": {
        const sel = room.deco && room.deco.selected;
        if (sel && !game.turn(sel, +id)) this.toast("돌릴 자리가 없습니다. 주변을 비우고 다시 해 보세요.", 2500);
        break;
      }
      case "moveSel": this.moveSelected(); this.render(); break;
      case "storeSel": this.storeHeld(); break;
      case "buyRoom": if (game.buyRoom(id)) { this.toast(`${game.roomName(s.rooms.length - 1)}을(를) 지었습니다. ◀ ▶로 가 볼 수 있습니다.`, 4000); this.renderRoomBar(); } break;
      case "refund":
        if (this.refundAsk !== id) { this.refundAsk = id; this.render(); break; }
        this.refundAsk = null;
        { const back = game.refund(id); if (back) this.toast(`${game.piece(id).name}을(를) 환불했습니다. (+${fmt(back)})`); else this.render(); }
        break;
      case "roomRename": this.editRoomName(+id); break;
      case "roomRenameSave": {
        const el = $("#roomRename");
        this.roomEdit = null;
        if (el) game.renameRoom(+id, el.value);
        this.render();
        break;
      }
      case "roomEditCancel": this.roomEdit = null; this.render(); break;
      case "paintPiece": {
        const sel = room.deco && room.deco.selected;
        if (!sel || !game.room().placed.includes(sel)) break;
        if (+id) sel.color = +id; else delete sel.color;
        game.save(); this.render();
        break;
      }
      case "paintSurface": game.paint(this.paintTab, +id); break;
      case "adminAlways": {
        const on = id === "true";
        game.save();
        host.setAdminAlways(on).then(ok => {
          this.admin = { ...this.admin, always: on };
          if (on && !ok) this.toast("관리자 권한으로 다시 실행하지 못했습니다. 다음에 켤 때 다시 묻습니다.", 5000);
          if (this.panel === "settings") this.render();
        });
        break;
      }
      case "relaunchAdmin":
        game.save();
        host.relaunchAdmin().then(ok => { if (!ok) this.toast("관리자 권한으로 다시 실행하지 못했습니다.", 4000); });
        break;
      case "allowTyping": host.openTypingSettings(); break;
      case "reset":
        $("#resetRow").innerHTML = `<span class="desc">방, 가구, 토독을 처음 상태로 되돌립니다. 캐릭터와 설정은 유지됩니다.</span>
          <button class="btn small danger" data-act="resetYes">초기화</button><button class="btn small" data-act="resetNo">취소</button>`;
        break;
      case "resetYes": game.reset(); pets.moves = []; this.toast("초기화했습니다."); this.render(); break;
      case "resetNo": this.render(); break;
    }
  },

  // ---------- the room: clicks and decorating ----------

  onRoomClick(e) {
    if (room.deco) return this.decoClick(e);
    if (room.onDoor(e)) return this.showRoom(game.state.cur + 1);
    const who = room.creatureAt(e);
    if (!who) {
      const p = room.pieceAtPoint(e);
      // A toy: it rolls away from where it was poked, and the pets in this room give chase.
      if (p && (p.id === "toyball" || p.id === "toymouse")) {
        const pt = room.point(e), box = room.pieceBox(p), dx = box.x + box.w / 2 - pt.x, dy = box.y + box.h / 2 - pt.y;
        room.kick(p, game.room(), dx + (Math.random() - 0.5) * 6, dy + (Math.random() - 0.5) * 6, 110 + Math.random() * 40);
        pets.chase(p, game.state.cur);
        return;
      }
      if (p && p.id === "bowl") {
        const r = game.fillBowl(p), f = room.pieceBox(p);
        if (r === "ok") room.float("밥!", f.x + 8, f.y + 4);
        else this.toast(r === "full" ? "밥그릇이 가득 찼습니다." : "사료가 없습니다. 반려동물 › 돌보기에서 살 수 있습니다.", 3000);
      }
      return;
    }
    if (who.me) {
      const f = room.foot(actor.x, actor.y), lines = ["!", "♪", "흠~", "안녕!", "톡톡"];
      room.float(lines[Math.floor(Math.random() * lines.length)], f.x, f.y - 30);
    } else {
      const m = pets.moves[who.pet], f = room.foot(m.x, m.y);
      m.heart = 1;
      const pet = game.state.pets[who.pet];
      room.float(pet.full < PET_CARE.starvingBelow ? "배고파" : ({ cat: "냐옹", dog: "멍!", duck: "꽥!", bigduck: "꽥꽥!" })[pet.kind], f.x, f.y - 16);
    }
  },

  // `quiet`: started from the colour panel, which stays open.
  startDeco(quiet = false) {
    if (room.deco || (this.panel === "closet" && !quiet)) { this.stopDeco(); if (this.panel === "closet") this.close(); return; }
    if (this.panel && !quiet) this.close();
    room.deco = { held: null, hover: null, over: null, selected: null, press: null };
    document.body.classList.add("decorating");
    $("#footNormal").hidden = true; $("#footDeco").hidden = false;
    this.renderStorage();
    this.updateFoot();
    if (!quiet) {
      // The house's colours open above the room, the way the character's options do.
      this.open("paint");
      this.toast("가구를 누르면 선택되고, 끌어서 옮길 수 있습니다.", 4000);
    }
  },
  stopDeco() {
    if (!room.deco) return;
    if (room.deco.held) this.cancelHeld();
    room.deco = null;
    game.settleOwned(game.state);   // anything that went missing while decorating is back in storage
    if (this.panel === "paint") this.close();
    document.body.classList.remove("decorating");
    $("#footNormal").hidden = false; $("#footDeco").hidden = true;
    game.save();
    this.updateFoot();
  },
  // Press on a piece: it may become a drag (move) or stay a click (select).
  decoDown(e) {
    const d = room.deco;
    if (!d || d.held || e.button !== 0) return;
    const p = room.pieceAtPoint(e);
    d.press = p ? { p, cell: room.cellAt(e) } : null;
  },
  decoMove(e) {
    const d = room.deco;
    if (!d) return;
    d.hover = room.cellAt(e);
    d.over = d.held ? null : room.pieceAtPoint(e);
    // Dragged off its cell: pick it up and carry it.
    if (d.press && (e.buttons & 1) && d.hover && String(d.hover) !== String(d.press.cell)) {
      const p = d.press.p;
      d.press = null;
      if (!game.room().placed.includes(p)) return;
      game.lift(p);
      d.held = { id: p.id, keep: { color: p.color, a: p.a, food: p.food }, from: { c: p.c, r: p.r }, drag: true };
      d.selected = null;
      this.renderStorage();
    }
  },
  decoUp(e) {
    const d = room.deco;
    if (!d) return;
    if (d.held && d.held.drag) {
      d.dropped = true;                      // the click that follows is part of this drop
      const cell = room.cellAt(e), { id, keep } = d.held, put = cell && game.put(id, cell[0], cell[1], keep);
      if (put) { d.held = null; d.selected = put; }
      else { this.cancelHeld(); this.toast(game.piece(id).wall ? "벽 칸에만 걸 수 있습니다." : "놓을 수 없는 자리입니다.", 1800); }
      this.afterSelect();
    } else if (d.press) {
      d.selected = d.press.p;
      d.press = null;
      d.dropped = true;
      this.afterSelect();
    }
  },
  decoClick(e) {
    const d = room.deco;
    if (d.dropped) { d.dropped = false; return; }
    // Carrying a piece (from storage, or 옮기기): put it on the cell clicked.
    if (d.held) {
      const cell = room.cellAt(e);
      if (!cell) return;
      const put = game.put(d.held.id, cell[0], cell[1], d.held.keep);
      if (put) { d.held = null; d.selected = put; this.afterSelect(); }
      else this.toast(game.piece(d.held.id).wall ? "벽 칸에만 걸 수 있습니다." : "놓을 수 없는 자리입니다.", 1800);
      return;
    }
    d.selected = null;                       // clicked on nothing
    this.afterSelect();
  },
  // After choosing a piece: the house panel shows its turning and colours (switching from the
  // wall/floor colours if those were up), scrolled into view.
  afterSelect(scroll = true) {
    const d = room.deco;
    if (d && d.selected && this.paintTab !== "piece") this.paintTab = "piece";
    this.scrollToSel = scroll && !!(d && d.selected);
    this.renderStorage();
    if (this.panel === "paint") this.render();
  },
  moveSelected() {
    const d = room.deco, p = d && d.selected;
    if (!p || !game.room().placed.includes(p)) return;
    game.lift(p);
    d.held = { id: p.id, keep: { color: p.color, a: p.a, food: p.food }, from: { c: p.c, r: p.r } };
    d.selected = null;
    this.renderStorage();
  },
  // Put the carried piece back where it came from (or back in storage).
  cancelHeld() {
    const d = room.deco;
    if (!d || !d.held) return;
    const { id, from, keep } = d.held;
    d.held = null;
    if (!from || !game.put(id, from.c, from.r, keep)) game.store(id);
    this.renderStorage();
  },
  // 보관: the piece in hand, or else the one selected, goes back into storage.
  storeHeld() {
    const d = room.deco;
    if (!d) return;
    if (d.held) {
      if (game.piece(d.held.id).fixed) return;
      game.store(d.held.id);
      d.held = null;
    } else if (d.selected) {
      // Hold on to it first: lifting it redraws the bar, which lets go of the selection.
      const p = d.selected;
      if (!game.room().placed.includes(p) || game.piece(p.id).fixed) return;
      d.selected = null;
      game.lift(p);
      game.store(p.id);
    }
    this.afterSelect();
  },
  takeOut(id) {
    if (room.deco.held) this.cancelHeld();
    if (game.takeOut(id)) { room.deco.held = { id, keep: {}, from: null }; this.toast("놓을 칸을 누르세요.", 2000); }
    room.deco.selected = null;
    this.renderStorage();
  },
  // The decorating bar: with a piece selected, what can be done with it; carrying one, where to
  // put it; otherwise what's in storage.
  renderStorage() {
    const d = room.deco;
    if (!d) return;
    const held = d.held, sel = !held && d.selected && game.room().placed.includes(d.selected) ? d.selected : null;
    if (!sel) d.selected = null;
    $("#storage").hidden = !!sel;
    $("#selName").hidden = !sel;
    $("#moveBtn").hidden = !sel;
    if (sel) $("#selName").textContent = game.piece(sel.id).name;
    $("#storage").innerHTML = `<span class="empty">${held ? "놓을 칸을 누르세요" : "가구를 눌러 선택하세요"}</span>`;
    const piece = held || sel;
    $("#storeBtn").hidden = !piece || !!game.piece(piece.id).fixed;
    $("#paintBtn").hidden = !!held || this.panel === "paint";
  },

  // ---------- rooms ----------

  showRoom(i) {
    const n = game.state.rooms.length;
    i = ((i % n) + n) % n;
    if (i === game.state.cur) return;
    if (room.deco) { this.cancelHeld(); room.deco.selected = null; }
    game.showRoom(i);
  },
  // Change a room's name, in the shop's 방 tab.
  editRoomName(i) {
    this.roomEdit = i;
    this.tab.shop = "room";
    if (this.panel === "shop") this.render(); else this.open("shop");
    setTimeout(() => { const el = $("#roomRename"); if (el) { el.focus(); el.select(); } });
  },
  renderRoomBar() {
    const s = game.state, many = s.rooms.length > 1;
    $("#roomBar").hidden = !many;
    if (!many) return;
    $("#roomName").textContent = game.roomName();
    const away = actor.at !== s.cur && s.rooms[actor.at];
    $("#whereMe").hidden = !away;
    if (away) $("#whereMe").textContent = `${s.look.name || "캐릭터"}: ${game.roomName(actor.at)}`;
  },

  // ---------- tooltips and toasts ----------

  initTooltips() {
    const tip = $("#tip");
    const show = (text, r) => {
      if (tip.hidden || tip.textContent !== text) { tip.textContent = text; tip.hidden = false; }
      const w = tip.offsetWidth, h = tip.offsetHeight;
      let y = r.bottom + 4;
      if (y + h > innerHeight - 4) y = r.top - h - 4;
      tip.style.left = Math.round(Math.max(4, Math.min(innerWidth - w - 4, (r.left + r.right) / 2 - w / 2))) + "px";
      tip.style.top = Math.round(Math.max(4, y)) + "px";
    };
    addEventListener("mousemove", e => {
      const el = e.target.closest && e.target.closest("[data-tip]");
      if (el) return show(el.dataset.tip, el.getBoundingClientRect());
      tip.hidden = true;
    });
    addEventListener("mouseleave", () => { tip.hidden = true; });
  },
  toast(msg, ms = 3500) {
    if ([...$("#toasts").children].some(t => t.textContent === msg && t.style.opacity !== "0")) return;   // already showing
    const t = document.createElement("div");
    t.className = "toast";
    t.textContent = msg;
    const box = $("#toasts");
    box.appendChild(t);
    while (box.children.length > 2) box.firstChild.remove();
    setTimeout(() => { t.style.opacity = "0"; setTimeout(() => t.remove(), 400); }, ms);
  },
};

// The room's scale on the phone: as wide as the screen (half its height when lying sideways),
// rounded down to whole device pixels so the pixel art stays crisp. Uses the screen's height, not
// the page's, so the room doesn't shrink when the keyboard comes up.
function phoneZoom() {
  const dpr = devicePixelRatio || 1, h = Math.max(innerHeight, screen.height * 0.8);
  return Math.max(1, Math.floor(Math.min(innerWidth / RW, h * 0.5 / RH) * dpr)) / dpr;
}

// A small picture of a wall or floor pattern, for the shop.
const swatchCache = {};
function themeSwatch(kind, id) {
  const key = kind + id;
  if (swatchCache[key]) return swatchCache[key];
  const c = document.createElement("canvas"), g = c.getContext("2d");
  c.width = 40; c.height = 18;
  const r = (col, a, b, w, h) => { g.fillStyle = col; g.fillRect(a, b, w, h); };
  (kind === "wall" ? WALL_ART : FLOOR_ART)[id](r, 0, 0, 40, 18);
  return (swatchCache[key] = c.toDataURL());
}

// ---------------------------------------------------------------------------------------------
// Start up
// ---------------------------------------------------------------------------------------------
async function boot() {
  await Promise.all(["12px Galmuri11", "8px Galmuri7"].map(f => document.fonts.load(f).catch(() => {})));
  game.load();
  room.init($("#room"));
  ui.init();
  audio.init();
  const st = game.state.settings;
  host.setOnTop(st.onTop);
  host.setGlobalTyping(st.typing === "global");
  host.onGlobalTypingFailed(() => ui.toast(PHONE
    ? "폰 전체 입력을 세려면 접근성 권한이 필요합니다. 설정에서 켤 수 있습니다."
    : "PC 입력 감지를 시작하지 못했습니다. 게임 내 입력만 감지합니다.", 5000));
  if (!game.state.created) ui.open("closet");
  if (host.onUpdateReady) host.onUpdateReady(v => ui.toast(`새 버전(${v})을 받아 두었습니다. 앱을 껐다 켜면 적용됩니다.`, 8000));

  // Key presses: from the whole PC (or phone) through the app shell, or only from this window.
  let sinceWord = 0;
  const onKey = () => {
    game.key();
    audio.onKey();
    actor.onKey();
    // Now and then a little "톡" rises from the desk.
    if (actor.doing === "type" && ++sinceWord >= 8) {
      sinceWord = 0;
      const f = room.foot(actor.x, actor.y);
      room.float(Math.random() < 0.5 ? "톡" : "독", f.x + rand(-8, 8), f.y - 30);
    }
  };
  // The phone app also hands over, in one go per day, what it counted while it was closed.
  host.onKey((n, day) => {
    if (game.state.settings.typing !== "global") return;
    if (!n) return onKey();
    game.key(n, day);
    ui.toast(`다른 앱에서 ${fmt(n)}타를 입력했습니다.`);
  });
  addEventListener("keydown", e => {
    if (e.repeat || game.state.settings.typing !== "window" || e.target.closest("input, select, textarea")) return;
    onKey();
  });
  // The phone's typing pad counts in either mode (counting other apps skips this one).
  const pad = $("#pad");
  pad.addEventListener("input", e => {
    onKey();
    if (!e.isComposing && pad.value.length > 2000) pad.value = pad.value.slice(-1000);
  });

  // Earning ticks on a timer (keeps going while minimized); drawing on animation frames.
  let last = performance.now();
  setInterval(() => { const now = performance.now(); game.tick((now - last) / 1000); last = now; ui.updateFoot(); }, 250);
  let lastFrame = performance.now();
  const frame = now => {
    lastDt = Math.min(0.1, (now - lastFrame) / 1000);
    lastFrame = now;
    room.frame(lastDt);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  setInterval(() => game.save(), 10000);
  addEventListener("beforeunload", () => game.save());
  // The phone app is put away rather than closed.
  if (PHONE) host.onPause(() => game.save());
}
boot();
