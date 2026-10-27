// Procedural background ambience, shared with the 토도독 phone app (TodokApp/ambient.js, AmbientPlayer.kt).
// Every scene is generated live, so there are no audio files or licenses involved.
(function (root) {
  const NAMES = ["빗소리", "창가의 비", "먼 천둥", "파도", "모닥불", "시냇물", "여름밤 숲", "바람", "몽환 패드", "별빛 오르골"];
  const TAU = Math.PI * 2;

  function createScene(type, SR) {
    const rnd = Math.random;
    const noise = () => rnd() * 2 - 1;
    const range = (a, b) => a + rnd() * (b - a);

    class OnePole {
      constructor(fc) { this.y = 0; this.set(fc); }
      set(fc) { this.a = 1 - Math.exp(-TAU * fc / SR); }
      p(x) { this.y += this.a * (x - this.y); return this.y; }
    }
    class Svf { // Chamberlin state-variable filter, band-pass output
      constructor(fc, damp) { this.fc = fc; this.damp = damp; this.low = 0; this.band = 0; }
      bp(x) {
        const f = 2 * Math.sin(Math.PI * this.fc / SR);
        this.low += f * this.band;
        const high = x - this.low - this.damp * this.band;
        this.band += f * high;
        return this.band;
      }
    }
    class Brown {
      constructor() { this.b = 0; }
      p() { this.b = (this.b + 0.02 * noise()) / 1.02; return this.b; }
    }
    class Drift { // smooth random value in 0..1 that wanders every `period` seconds
      constructor(period) { this.n = Math.floor(period * SR); this.c = 0; this.v = rnd(); this.t = rnd(); this.k = 1 / this.n; }
      p() { if (++this.c >= this.n) { this.c = 0; this.t = rnd(); } this.v += (this.t - this.v) * this.k * 3; return this.v; }
    }
    class Pings { // pool of decaying sine voices (drops, music box notes)
      constructor(n) {
        this.n = n; this.i = 0; this.l = 0; this.r = 0;
        this.f = new Float32Array(n); this.ph = new Float32Array(n); this.env = new Float32Array(n);
        this.k = new Float32Array(n); this.pl = new Float32Array(n); this.pr = new Float32Array(n);
      }
      hit(freq, decay, amp, pan) {
        const i = this.i; this.i = (i + 1) % this.n;
        this.f[i] = TAU * freq / SR; this.ph[i] = 0; this.env[i] = amp;
        this.k[i] = Math.exp(-1 / (decay * SR));
        this.pl[i] = Math.cos(pan * Math.PI / 2); this.pr[i] = Math.sin(pan * Math.PI / 2);
      }
      p() {
        let l = 0, r = 0;
        for (let i = 0; i < this.n; i++) {
          const e = this.env[i];
          if (e < 1e-4) continue;
          let ph = this.ph[i] + this.f[i]; if (ph > TAU) ph -= TAU; this.ph[i] = ph;
          const s = Math.sin(ph) * e; this.env[i] = e * this.k[i];
          l += s * this.pl[i]; r += s * this.pr[i];
        }
        this.l = l; this.r = r;
      }
    }
    class Bursts { // pool of decaying noise bursts (fire crackles)
      constructor(n) { this.n = n; this.i = 0; this.env = new Float32Array(n); this.k = new Float32Array(n); this.pl = new Float32Array(n); this.pr = new Float32Array(n); }
      hit(decay, amp, pan) {
        const i = this.i; this.i = (i + 1) % this.n;
        this.env[i] = amp; this.k[i] = Math.exp(-1 / (decay * SR));
        this.pl[i] = Math.cos(pan * Math.PI / 2); this.pr[i] = Math.sin(pan * Math.PI / 2);
      }
      p() {
        let l = 0, r = 0;
        for (let i = 0; i < this.n; i++) {
          const e = this.env[i];
          if (e < 1e-4) continue;
          const s = noise() * e; this.env[i] = e * this.k[i];
          l += s * this.pl[i]; r += s * this.pr[i];
        }
        this.l = l; this.r = r;
      }
    }
    class Delay { // stereo echo with a darkening feedback path
      constructor(lSec, rSec, fb, wet) {
        this.bl = new Float32Array(Math.floor(lSec * SR)); this.br = new Float32Array(Math.floor(rSec * SR));
        this.il = 0; this.ir = 0; this.fb = fb; this.wet = wet; this.lpl = new OnePole(1800); this.lpr = new OnePole(1800);
      }
      p(l, r) {
        const dl = this.bl[this.il], dr = this.br[this.ir];
        this.bl[this.il] = this.lpl.p(l + dr * this.fb); this.br[this.ir] = this.lpr.p(r + dl * this.fb);
        this.il = (this.il + 1) % this.bl.length; this.ir = (this.ir + 1) % this.br.length;
        return [l + dl * this.wet, r + dr * this.wet];
      }
    }
    const chance = perSec => rnd() < perSec / SR;
    const pan = () => range(0.15, 0.85);
    const midi = m => 440 * Math.pow(2, (m - 69) / 12);

    // Rain bed + drops, shared by the three rain scenes.
    function rain({ bedLp, bedHp, bedGain, dropRate, dropLo, dropHi, dropDecay, dropAmp, patterRate }) {
      const lpL = new OnePole(bedLp), lpR = new OnePole(bedLp), lp2L = new OnePole(bedLp), lp2R = new OnePole(bedLp);
      const hpL = new OnePole(bedHp), hpR = new OnePole(bedHp), gust = new Drift(6), drops = new Pings(32);
      return () => {
        if (chance(dropRate)) drops.hit(range(dropLo, dropHi), range(dropDecay[0], dropDecay[1]), range(dropAmp[0], dropAmp[1]), pan());
        if (chance(patterRate)) drops.hit(range(500, 1200), range(0.004, 0.01), range(0.02, 0.06), pan());
        drops.p();
        const a = bedGain * (0.75 + 0.5 * gust.p());
        const xl = lp2L.p(lpL.p(noise())), xr = lp2R.p(lpR.p(noise()));
        return [(xl - hpL.p(xl)) * a + drops.l, (xr - hpR.p(xr)) * a + drops.r];
      };
    }

    switch (type) {
      case 0: return rain({ bedLp: 2600, bedHp: 400, bedGain: 0.9, dropRate: 30, dropLo: 2000, dropHi: 4800,
        dropDecay: [0.002, 0.006], dropAmp: [0.02, 0.09], patterRate: 10 });

      case 1: { // muffled rain heard from inside, with glassy taps on the window
        const bed = rain({ bedLp: 650, bedHp: 90, bedGain: 1.6, dropRate: 0, dropLo: 0, dropHi: 0,
          dropDecay: [0.01, 0.01], dropAmp: [0, 0], patterRate: 6 });
        const taps = new Pings(16);
        return () => {
          if (chance(5)) taps.hit(range(900, 2000), range(0.01, 0.025), range(0.03, 0.09), pan());
          if (chance(0.6)) taps.hit(range(1300, 1800), range(0.05, 0.08), range(0.06, 0.1), pan());
          taps.p();
          const [l, r] = bed();
          return [l + taps.l, r + taps.r];
        };
      }

      case 2: { // steady rain with slow, distant thunder rolls
        const bed = rain({ bedLp: 1600, bedHp: 250, bedGain: 1.0, dropRate: 18, dropLo: 1500, dropHi: 3500,
          dropDecay: [0.002, 0.006], dropAmp: [0.02, 0.07], patterRate: 8 });
        const brown = new Brown(), lp1 = new OnePole(90), lp2 = new OnePole(90), rumble = new Drift(0.3);
        let wait = range(6, 14) * SR, env = 0, phase = 0, attack = 0, decayK = 0, peak = 0;
        return () => {
          if (--wait <= 0) { wait = range(18, 38) * SR; phase = 1; attack = 1 / (range(0.3, 0.8) * SR); decayK = Math.exp(-1 / (range(3, 5.5) * SR)); peak = range(0.6, 1); }
          if (phase === 1) { env += attack; if (env >= peak) phase = 2; } else env *= decayK;
          const t = lp2.p(lp1.p(brown.p())) * env * (0.5 + 0.5 * rumble.p()) * 9;
          const [l, r] = bed();
          return [l + t, r + t];
        };
      }

      case 3: { // ocean waves: each swell opens a low-pass filter, then washes out
        const lpL = new OnePole(400), lpR = new OnePole(400), lp2L = new OnePole(400), lp2R = new OnePole(400);
        let t = 0, period = range(7, 11) * SR, wpan = 0.5;
        return () => {
          if (++t >= period) { t = 0; period = range(7, 12) * SR; wpan = range(0.3, 0.7); }
          const x = t / period;
          const e = x < 0.4 ? Math.pow(Math.sin(x / 0.4 * Math.PI / 2), 2) : Math.exp(-(x - 0.4) * 5);
          const fc = 200 + 1400 * e;
          lpL.set(fc); lpR.set(fc); lp2L.set(fc); lp2R.set(fc);
          const a = 1.55 * (0.18 + 0.82 * e);
          return [lp2L.p(lpL.p(noise())) * a * (1.4 - wpan), lp2R.p(lpR.p(noise())) * a * (0.6 + wpan)];
        };
      }

      case 4: { // campfire: warm low roar with crackles and the occasional pop
        const brown = new Brown(), lp = new OnePole(380), flicker = new Drift(0.35), crack = new Bursts(24);
        const hpL = new OnePole(1200), hpR = new OnePole(1200);
        return () => {
          if (chance(6)) crack.hit(range(0.0004, 0.002), Math.pow(rnd(), 2) * 0.5 + 0.05, pan());
          if (chance(0.35)) crack.hit(range(0.003, 0.006), range(0.4, 0.7), pan());
          crack.p();
          const bed = lp.p(brown.p()) * 2.6 * (0.65 + 0.35 * flicker.p());
          return [bed + crack.l - hpL.p(crack.l), bed + crack.r - hpR.p(crack.r)];
        };
      }

      case 5: { // babbling brook
        const bpL = new Svf(900, 0.9), bpR = new Svf(900, 0.9), mod = new Drift(0.2), lowL = new OnePole(300), lowR = new OnePole(300);
        const bub = new Pings(40);
        return () => {
          if (chance(40)) bub.hit(range(350, 1100), range(0.004, 0.012), range(0.015, 0.075), pan());
          bub.p();
          const m = mod.p(); bpL.fc = 700 + 600 * m; bpR.fc = 1300 - 600 * m;
          return [bpL.bp(noise()) * 0.52 + lowL.p(noise()) * 0.75 + bub.l, bpR.bp(noise()) * 0.52 + lowR.p(noise()) * 0.75 + bub.r];
        };
      }

      case 6: { // summer night: soft breeze through leaves and two crickets
        const lpL = new OnePole(450), lpR = new OnePole(450), hpL = new OnePole(80), hpR = new OnePole(80), breeze = new Drift(5);
        const crickets = [
          { f: TAU * 4300 / SR, ph: 0, t: 0, group: 0.95 * SR, pan: 0.25, amp: 0.035 },
          { f: TAU * 4750 / SR, ph: 0, t: 0.4 * SR, group: 1.2 * SR, pan: 0.78, amp: 0.025 },
        ];
        const pulse = SR / 28;
        return () => {
          let l = 0, r = 0;
          for (const c of crickets) {
            c.ph += c.f; if (c.ph > TAU) c.ph -= TAU;
            if (++c.t >= c.group) c.t = 0;
            const k = Math.floor(c.t / pulse);
            if (k < 4) {
              const s = Math.sin(c.ph) * Math.pow(Math.sin(Math.PI * (c.t % pulse) / pulse), 2) * c.amp;
              l += s * (1 - c.pan); r += s * c.pan;
            }
          }
          const a = 1.5 * (0.4 + 0.6 * breeze.p());
          const xl = lpL.p(noise()), xr = lpR.p(noise());
          return [(xl - hpL.p(xl)) * a + l, (xr - hpR.p(xr)) * a + r];
        };
      }

      case 7: { // wind: resonant noise whose pitch slowly wanders
        const bL = new Svf(300, 0.28), bR = new Svf(300, 0.28), dL = new Drift(4), dR = new Drift(4.5), gust = new Drift(5);
        const lpL = new OnePole(250), lpR = new OnePole(250);
        return () => {
          bL.fc = 160 + 520 * dL.p(); bR.fc = 160 + 520 * dR.p();
          const a = 0.85 * (0.35 + 0.65 * gust.p());
          return [(bL.bp(noise()) + lpL.p(noise()) * 1.5) * a, (bR.bp(noise()) + lpR.p(noise()) * 1.5) * a];
        };
      }

      case 8: { // dreamy pad: slow low chords that melt into each other
        const chords = [[41, 48, 52, 55, 57], [40, 47, 50, 55, 59], [38, 45, 52, 53, 57], [36, 43, 52, 55, 59]];
        const pitches = [...new Set(chords.flat())].sort((a, b) => a - b);
        const voices = pitches.map((m, i) => ({ m, w1: TAU * midi(m) * 1.002 / SR, w2: TAU * midi(m) * 0.998 / SR, p1: rnd() * TAU, p2: rnd() * TAU, g: 0, pan: i % 2 ? 0.3 : 0.7 }));
        const delay = new Delay(0.41, 0.57, 0.5, 0.4), breath = new Drift(3);
        const smooth = 1 / (2.5 * SR), chordLen = 9 * SR;
        let t = 0, ci = 0;
        return () => {
          if (++t >= chordLen) { t = 0; ci = (ci + 1) % chords.length; }
          const chord = chords[ci], b = 0.75 + 0.25 * breath.p();
          let l = 0, r = 0;
          for (const v of voices) {
            v.g += ((chord.includes(v.m) ? 1 : 0) - v.g) * smooth;
            if (v.g < 1e-4) continue;
            v.p1 += v.w1; if (v.p1 > TAU) v.p1 -= TAU;
            v.p2 += v.w2; if (v.p2 > TAU) v.p2 -= TAU;
            const s = (Math.sin(v.p1) + Math.sin(v.p2) + 0.15 * Math.sin(2 * v.p1)) * v.g * 0.105 * b;
            l += s * (1 - v.pan); r += s * v.pan;
          }
          return delay.p(l, r);
        };
      }

      case 9: { // music box: sparse pentatonic notes drifting over a soft drone
        const scale = [60, 62, 64, 67, 69, 72, 74, 76, 79];
        const notes = new Pings(24), delay = new Delay(0.37, 0.53, 0.55, 0.5);
        const d1 = TAU * midi(48) / SR, d2 = TAU * midi(55) / SR, trem = new Drift(2);
        let p1 = 0, p2 = 0, wait = 0.5 * SR;
        const play = m => { const p = pan(); notes.hit(midi(m), 1.4, 0.17, p); notes.hit(midi(m) * 2, 0.4, 0.042, p); };
        return () => {
          if (--wait <= 0) {
            wait = range(0.35, 1.3) * SR;
            const m = scale[Math.floor(rnd() * scale.length)];
            play(m);
            if (rnd() < 0.3) play(m - 12);
          }
          notes.p();
          p1 += d1; if (p1 > TAU) p1 -= TAU; p2 += d2; if (p2 > TAU) p2 -= TAU;
          const drone = (Math.sin(p1) + 0.7 * Math.sin(p2)) * 0.042 * (0.6 + 0.4 * trem.p());
          return delay.p(notes.l + drone, notes.r + drone);
        };
      }
    }
  }

  // Volume slider (0..1) to gain, same curve as AmbientPlayer.kt: a 45 dB range topping out at -10 dB, 0 = silence.
  const gainOf = v => v <= 0 ? 0 : Math.pow(10, (-10 + (v - 1) * 45) / 20);

  const api = { NAMES, createScene, gainOf };
  if (typeof module !== "undefined") module.exports = api; else root.Ambient = api;
})(this);
