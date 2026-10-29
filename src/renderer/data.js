// Everything with a number on it: what typing earns, what things cost, what the room can hold.
// Prices are in 토독 (◆), earned by every key press and steadily while the window is open.
"use strict";

const EARN = {
  perKey: 4,
  perSec: 2,             // just for leaving it on
};

// The room: a grid of floor cells under a wall you can hang things on.
const ROOM = { cols: 9, rows: 5 };

// Furniture: [w, h] floor cells; `wall` pieces hang on the wall instead; `walk` ones (rugs, cushions)
// can be walked over and sit under other pieces. `sit` is where the character may rest, relative
// to the piece's top-left cell, and which way it faces there. `pet` pieces are sold with the pets
// and used by them: `food` holds meals, `rest` is somewhere to curl up, `play` somewhere to play;
// `only` limits a piece to cats or dogs. `flat` pieces lie on the floor, seen from above, so turning
// one just turns its picture; others are drawn from the side or from behind when turned (if they
// have such pictures in furniture.js), or else keep facing the front.
const FURNITURE = [
  { id: "desk",      name: "컴퓨터 책상", price: 0,    size: [2, 1], fixed: true },
  { id: "chair",     name: "의자",        price: 750,  size: [1, 1], sit: [0, 0, "down"] },
  { id: "rug",       name: "러그",        price: 450,  size: [2, 1], walk: true, flat: true },
  { id: "cushion",   name: "쿠션",        price: 450,  size: [1, 1], walk: true, sit: [0, 0, "down"], flat: true },
  { id: "lamp",      name: "스탠드",      price: 600,  size: [1, 1] },
  { id: "plant",     name: "화분",        price: 600,  size: [1, 1] },
  { id: "table",     name: "동그란 탁자",  price: 1050,  size: [1, 1] },
  { id: "bed",       name: "침대",        price: 1800,  size: [1, 2], flat: true, bed: true },
  { id: "frame",     name: "액자",        price: 1200,  size: [1, 1], wall: true },
  { id: "clock",     name: "벽시계",      price: 1200,  size: [1, 1], wall: true },
  { id: "window",    name: "창문",        price: 1500,  size: [1, 1], wall: true },
  { id: "shelf",     name: "벽 선반",     price: 1350,  size: [1, 1], wall: true },
  { id: "lights",    name: "전구 줄",     price: 1500,  size: [1, 1], wall: true },
  { id: "radio",     name: "라디오",      price: 2400,  size: [1, 1] },
  { id: "speaker",   name: "스피커",      price: 2100,  size: [1, 1] },
  { id: "turntable", name: "턴테이블",    price: 3900,  size: [1, 1] },
  { id: "bookshelf", name: "책장",        price: 2700,  size: [1, 1] },
  { id: "coffee",    name: "커피 머신",   price: 2700,  size: [1, 1] },
  { id: "easel",     name: "이젤",        price: 3000, size: [1, 1] },
  { id: "fridge",    name: "미니 냉장고", price: 3600, size: [1, 1] },
  { id: "fishbowl",  name: "어항",        price: 4500, size: [1, 1] },
  { id: "cattower",  name: "캣타워",      price: 5400, size: [1, 1], pet: "rest", only: "cat" },
  { id: "sofa",      name: "소파",        price: 7500, size: [2, 1], sit: [0, 0, "down"] },
  { id: "piano",     name: "피아노",      price: 18000, size: [2, 1] },
  { id: "fireplace", name: "벽난로",      price: 27000, size: [2, 1] },
  // For the kitchen and the yard.
  { id: "sink",      name: "싱크대",      price: 2400, size: [2, 1] },
  { id: "stove",     name: "가스레인지",  price: 1800, size: [1, 1] },
  { id: "gardentree", name: "정원수",     price: 1500, size: [1, 1] },
  { id: "outbench",  name: "벤치",        price: 1800, size: [2, 1], sit: [0, 0, "down"] },
  { id: "flowerbed", name: "꽃밭",        price: 900,  size: [2, 1], walk: true, flat: true },
  // More of everything.
  { id: "tv",          name: "TV",          price: 6000, size: [2, 1] },
  { id: "bigrug",      name: "큰 러그",     price: 2400, size: [3, 2], walk: true, flat: true },
  { id: "armchair",    name: "안락의자",    price: 3600, size: [1, 1], sit: [0, 0, "down"] },
  { id: "bigtable",    name: "큰 테이블",   price: 4500, size: [2, 2] },
  { id: "floorlamp",   name: "장스탠드",    price: 1500, size: [1, 1] },
  { id: "bigplant",    name: "큰 화분",     price: 1800, size: [1, 1] },
  { id: "doublebed",   name: "더블 침대",   price: 6000, size: [2, 2], flat: true, bed: true },
  { id: "wardrobe",    name: "옷장",        price: 4800, size: [2, 1] },
  { id: "dresser",     name: "서랍장",      price: 2400, size: [1, 1] },
  { id: "vanity",      name: "화장대",      price: 3600, size: [1, 1] },
  { id: "nightstand",  name: "협탁",        price: 1200, size: [1, 1] },
  { id: "mirror",      name: "전신 거울",   price: 2100, size: [1, 1] },
  { id: "diningtable", name: "식탁",        price: 3600, size: [2, 1] },
  { id: "counter",     name: "조리대",      price: 1800, size: [1, 1] },
  { id: "bathtub",     name: "욕조",        price: 6000, size: [2, 1] },
  { id: "toilet",      name: "변기",        price: 2400, size: [1, 1] },
  { id: "washbasin",   name: "세면대",      price: 1800, size: [1, 1] },
  { id: "washer",      name: "세탁기",      price: 4500, size: [1, 1] },
  { id: "guitar",      name: "기타",        price: 3000, size: [1, 1] },
  { id: "fan",         name: "선풍기",      price: 1200, size: [1, 1] },
  { id: "trashcan",    name: "휴지통",      price: 300,  size: [1, 1] },
  { id: "hanger",      name: "옷걸이",      price: 900,  size: [1, 1] },
  { id: "poster",      name: "포스터",      price: 600,  size: [1, 1], wall: true },
  { id: "calendar",    name: "달력",        price: 450,  size: [1, 1], wall: true },
  { id: "curtain",     name: "커튼 창문",   price: 2100, size: [1, 1], wall: true },
  { id: "aircon",      name: "에어컨",      price: 3000, size: [1, 1], wall: true },
  { id: "swing",       name: "그네",        price: 4500, size: [2, 1] },
  { id: "parasol",     name: "파라솔 테이블", price: 3000, size: [1, 1] },
  { id: "mailbox",     name: "우체통",      price: 1200, size: [1, 1] },
  { id: "pond",        name: "연못",        price: 5400, size: [2, 1], flat: true },
  // For pets.
  { id: "bowl",      name: "밥그릇",      price: 300,  size: [1, 1], walk: true, pet: "food", flat: true },
  { id: "feeder",    name: "자동 급식기", price: 1500, size: [1, 1], pet: "food", auto: true },
  { id: "petbed",    name: "방석",        price: 600,  size: [1, 1], walk: true, pet: "rest", flat: true },
  { id: "toyball",   name: "공",          price: 300,  size: [1, 1], walk: true, pet: "play", flat: true },
  { id: "toymouse",  name: "쥐 인형",     price: 300,  size: [1, 1], walk: true, pet: "play", flat: true },
  { id: "scratcher", name: "스크래쳐",    price: 900,  size: [1, 1], pet: "play", only: "cat" },
  { id: "hideout",   name: "숨숨집",      price: 1200, size: [1, 1], pet: "rest" },
  { id: "catwheel",  name: "캣휠",        price: 3000, size: [2, 1], pet: "play", only: "cat" },
  { id: "doghouse",  name: "개집",        price: 2400, size: [2, 1], pet: "rest", only: "dog" },
];

// How the shop sorts the furniture (pet things have their own panel; anything left out goes last).
const FURN_GROUPS = [
  ["거실", ["sofa", "armchair", "table", "bigtable", "tv", "rug", "bigrug", "cushion", "lamp", "floorlamp", "plant", "bigplant", "fishbowl", "speaker", "radio", "turntable", "piano", "fireplace"]],
  ["침실", ["bed", "doublebed", "wardrobe", "dresser", "vanity", "nightstand", "mirror", "hanger"]],
  ["주방", ["diningtable", "chair", "counter", "sink", "stove", "fridge", "coffee"]],
  ["욕실", ["bathtub", "toilet", "washbasin", "washer"]],
  ["취미·생활", ["bookshelf", "easel", "guitar", "fan", "trashcan"]],
  ["벽에 거는 가구", ["window", "curtain", "frame", "poster", "calendar", "clock", "shelf", "lights", "aircon"]],
  ["마당", ["gardentree", "flowerbed", "outbench", "swing", "parasol", "mailbox", "pond"]],
];

// Walls and floors, all in greys: how each is drawn lives in room.js.
const WALLPAPERS = [
  { id: "plain",   name: "민무늬",     price: 0 },
  { id: "stripe",  name: "세로 줄무늬", price: 1800 },
  { id: "dots",    name: "물방울",     price: 1800 },
  { id: "check",   name: "체크",       price: 2700 },
  { id: "brick",   name: "벽돌",       price: 3600 },
  { id: "wood",    name: "나무 판자",   price: 3600 },
  { id: "fence",   name: "울타리",     price: 1500 },
];
const FLOORS = [
  { id: "tile",    name: "타일",       price: 0 },
  { id: "plank",   name: "나무 마루",   price: 2100 },
  { id: "carpet",  name: "카펫",       price: 2100 },
  { id: "checker", name: "체크 타일",   price: 3000 },
  { id: "herring", name: "헤링본",     price: 4200 },
  { id: "marble",  name: "대리석",     price: 6000 },
  { id: "grass",   name: "잔디",       price: 1500 },
];

// Rooms to build, each starting with its own wall and floor (those come free with the room). Any
// kind can be built again and again; each room built makes the next one dearer (ROOM_PRICE_STEP).
// The first room, 방, has the desk.
const ROOM_PRICE_STEP = 1000;
const ROOM_KINDS = [
  { id: "room",    name: "방",   price: 3000, wall: "plain", floor: "tile" },
  { id: "living",  name: "거실", price: 3000, wall: "plain", floor: "plank", floorColor: 11 },
  { id: "bedroom", name: "침실", price: 3000, wall: "dots",  floor: "carpet", wallColor: 10 },
  { id: "kitchen", name: "주방", price: 4000, wall: "check", floor: "checker" },
  { id: "yard",    name: "마당", price: 6000, wall: "fence", floor: "grass", wallColor: 11, floorColor: 4 },
  { id: "bath",    name: "욕실", price: 4000, wall: "check", floor: "tile", wallColor: 7 },
  { id: "study",   name: "서재", price: 3000, wall: "wood",  floor: "plank", floorColor: 11 },
];

// Clothes, hair and accessories beyond the free basics, bought in the shop.
const COSMETIC_PRICES = {
  hair: { 6: 900, 7: 1500, 8: 2400 },
  top: { 3: 600, 4: 1200 },
  bottom: { 3: 900 },
  dress: { 3: 1800 },
  shoes: { 3: 450 },
  hat: { 1: 750, 2: 1050, 3: 450 },
  glasses: { 1: 900, 2: 1500 },
  hand: { 3: 350, 4: 250, 5: 450 },
};

// Pets to keep you company: free to adopt, as many as you like.
const PETS = {
  kinds: {
    cat: { name: "고양이", colors: [["치즈", "#e8894a", "#b8613a"], ["회색", "#9aa0b0", "#6c7180"], ["검정", "#4a3e4c", "#2e2430"], ["하양", "#f2ece4", "#c8bfb2"]] },
    dog: { name: "강아지", colors: [["갈색", "#b07a4a", "#7e5432"], ["크림", "#ecd2a2", "#c4a474"], ["하양", "#f4f0ea", "#cbc3b8"], ["검정", "#4a3e4c", "#2e2430"]] },
  },
  prices: [0],             // the first pet, then each one after (0 = free)
};
// Little things for pets to wear, bought once and put on any of them.
// LP records for the turntable: each plays a YouTube video or playlist given as a link.
const LP = { price: 1500, nameMax: 12 };

const PET_ACCESSORIES = [
  { id: "ribbon",   name: "리본",       price: 300 },
  { id: "bell",     name: "방울 목걸이", price: 400 },
  { id: "bandana",  name: "반다나",     price: 400 },
  { id: "flowers",  name: "꽃 화관",    price: 600 },
  { id: "partyhat", name: "고깔모자",   price: 600 },
  { id: "crown",    name: "왕관",       price: 1200 },
];
// The duck edition (made for a friend) has ducks too.
if (window.EDITION && window.EDITION.duck) {
  PETS.kinds.duck = { name: "오리", colors: [["하양", "#f6f2ea", "#d9d0c2"], ["노랑", "#f6d860", "#dcb43c"], ["갈색", "#b08a68", "#86664a"], ["회색", "#b4b8c2", "#868a96"]] };
  PETS.kinds.bigduck = { name: "왕부리 오리", colors: [["하양", "#ffffff", "#dcdcdc"], ["크림", "#fbf3dc", "#e2d6b4"], ["하늘", "#e4f1fb", "#bcd4e6"], ["분홍", "#fbe6ec", "#e6c0cc"]] };
}
// Feeding: pets get hungry over a day of the window being open, eat from a bowl with food in it
// (a bowl holds `servings` meals and is filled with one bag), and a well-fed pet now and then
// brings a little 토독. The automatic feeder fills itself from the bags you have.
const PET_CARE = {
  hungerPerSec: 100 / (8 * 3600),   // from full to empty in 8 hours
  hungryBelow: 60,                  // goes to eat
  starvingBelow: 25,                // asks for food
  servings: 3,
  bag: { count: 10, price: 300 },   // food bags sold together
  giftEverySec: 600, gift: 30,
};

// Colours to paint furniture, walls and floors with in decorate mode. 0 keeps the original greys.
const COLORS = [
  null, "#e06c6c", "#f0a05a", "#f2cf5b", "#9ccf6e", "#4f9f6b", "#6cc4bf",
  "#a6d2f4", "#3a4f8f", "#9b7ad0", "#f0a6c0", "#a8774f", "#e6d6b6", "#5b8ee0", "#ffffff",
];
const COLOR_NAMES = ["기본", "빨강", "주황", "노랑", "연두", "초록", "민트", "하늘", "남색", "보라", "분홍", "갈색", "베이지", "파랑", "흰색"];
// The order they're offered in (new colours are added at the end above, so saved choices keep their index).
const COLOR_ORDER = [0, 14, 1, 2, 3, 4, 5, 6, 7, 13, 8, 9, 10, 11, 12];

// When the character sleeps (local hours), if there is a bed.
const NIGHT = { from: 23, to: 7 };
