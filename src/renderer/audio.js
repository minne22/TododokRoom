// Sound: a key sound on every key press ("typing"), or an endless soft typing pattern ("auto"),
// plus the background ambience. Settings live in game.state.settings.sound.
"use strict";

const SR = 44100;
const CLIP_NAMES = ["사운드 1", "사운드 2", "사운드 3"];
const CLIPS = ["my_key_click", "my_key_tok", "todok"];

const audio = {
  ctx: null,
  buffers: [],
  autoTimer: null,
  bgmNode: null, bgmScene: null, bgmType: -1, bgmGain: 0,

  get settings() { return game.state.settings.sound; },

  init() {
    this.ctx = new AudioContext({ sampleRate: SR });
    CLIPS.forEach((name, i) => {
      const bytes = Uint8Array.from(atob(window.SOUNDS[name]), ch => ch.charCodeAt(0));
      this.ctx.decodeAudioData(bytes.buffer).then(b => { this.buffers[i] = b; });
    });
    this.startBgm();
    this.apply();
  },

  // Call after any sound setting changes.
  apply() {
    clearTimeout(this.autoTimer);
    if (this.settings.mode === "auto") this.autoTick();
  },

  click(gain = 1) {
    const buf = this.buffers[this.settings.clip];
    if (!buf) return;
    if (this.ctx.state !== "running") this.ctx.resume();
    const src = this.ctx.createBufferSource(), g = this.ctx.createGain();
    src.buffer = buf;
    // The pitch knob sets 0.85x..1.15x; a hair of variation on top so fast typing doesn't buzz.
    src.playbackRate.value = (0.85 + this.settings.pitch * 0.3) * (0.98 + Math.random() * 0.04);
    g.gain.value = this.settings.volume * gain;
    src.connect(g).connect(this.ctx.destination);
    src.start();
  },

  // A real key press: sounds only in "typing" mode.
  onKey() { if (this.settings.mode === "typing") this.click(); },

  // Someone typing next to you: bursts of quick taps with the odd pause.
  autoTick() {
    if (this.settings.mode !== "auto") return;
    this.click(0.85);
    const delay = Math.random() < 1 / 16 ? 450 + Math.random() * 750 : 70 + Math.random() * 160;
    this.autoTimer = setTimeout(() => this.autoTick(), delay / (0.5 * 4 ** this.settings.autoPace));
  },

  // Ambience: always running, fading between scenes (or to silence when off).
  startBgm() {
    this.bgmNode = this.ctx.createScriptProcessor(2048, 0, 2);
    const step = 1 / (SR * 0.8);
    this.bgmNode.onaudioprocess = e => {
      const L = e.outputBuffer.getChannelData(0), R = e.outputBuffer.getChannelData(1);
      const want = this.settings.bgm;
      if (this.bgmGain <= 0 && want !== this.bgmType) {
        this.bgmType = want;
        this.bgmScene = want < 0 ? null : Ambient.createScene(want, SR);
      }
      const target = want === this.bgmType && want >= 0 ? 1 : 0;
      const level = Ambient.gainOf(this.settings.bgmVolume);
      for (let i = 0; i < L.length; i++) {
        this.bgmGain = Math.min(1, Math.max(0, this.bgmGain + Math.max(-step, Math.min(step, target - this.bgmGain))));
        if (!this.bgmScene) { L[i] = R[i] = 0; continue; }
        const [l, r] = this.bgmScene(), g = this.bgmGain * this.bgmGain * level;
        L[i] = Math.tanh(l * g); R[i] = Math.tanh(r * g);
      }
    };
    this.bgmNode.connect(this.ctx.destination);
  },
};
