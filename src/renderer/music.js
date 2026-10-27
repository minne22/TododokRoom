// Background music in a few themes, composed and synthesized live (no recordings, so nothing to
// license). Each track is a short loop of chords, bass, drums and a melody made from a seed,
// which changes a little every few times round so it doesn't get stale. Added to Ambient after
// the nature scenes, and grouped into themes for the picker (BGM_THEMES).
"use strict";

(function () {
  const TAU = Math.PI * 2;
  const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
  const rng = seed => () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;

  // ---------- instruments: each note keeps its own state and gives one sample at a time ----------

  function makeNote(inst, midi, durSec, amp, pan, SR) {
    const f = mtof(midi), n = { t: 0, dur: durSec * SR, amp, pan, f, done: false, ph: 0, ph2: 0, lp: 0 };
    const dt = 1 / SR;
    switch (inst) {
      case "marimba":
        n.next = () => { const t = n.t * dt; if (t > 1.2) n.done = true; return (Math.sin(TAU * f * t) + 0.25 * Math.sin(TAU * 4 * f * t) * Math.exp(-t * 18)) * Math.exp(-t * 5); };
        break;
      case "pluck": {           // Karplus–Strong string: a ukulele / harp
        const len = Math.max(2, Math.round(SR / f)), buf = new Float32Array(len), r = rng(midi * 977 + 13);
        for (let i = 0; i < len; i++) buf[i] = r() * 2 - 1;
        let i = 0;
        n.next = () => { const v = buf[i], j = (i + 1) % len; buf[i] = 0.996 * 0.5 * (v + buf[j]); i = j; if (n.t > SR * 1.5) n.done = true; return v * 0.8; };
        break;
      }
      case "square": {          // chiptune lead, softened a touch
        n.next = () => {
          const t = n.t * dt, rel = n.t > n.dur ? Math.exp(-(n.t - n.dur) * dt * 40) : 1;
          if (rel < 0.01) n.done = true;
          n.ph = (n.ph + f * (1 + 0.004 * Math.sin(TAU * 6 * t)) * dt) % 1;
          const v = n.ph < 0.5 ? 1 : -1;
          n.lp += (v - n.lp) * 0.35;
          return n.lp * Math.min(1, t * 300) * (0.6 + 0.4 * Math.exp(-t * 8)) * rel * 0.5;
        };
        break;
      }
      case "tri": {             // round bass
        n.next = () => {
          const rel = n.t > n.dur ? Math.exp(-(n.t - n.dur) * dt * 30) : 1;
          if (rel < 0.01) n.done = true;
          n.ph = (n.ph + f * dt) % 1;
          return (4 * Math.abs(n.ph - 0.5) - 1) * Math.min(1, n.t * dt * 200) * rel;
        };
        break;
      }
      case "epiano":            // soft electric piano with a little tremolo
        n.next = () => { const t = n.t * dt; if (t > 3.5) n.done = true; return (Math.sin(TAU * f * t) + 0.3 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 3)) * Math.exp(-t * 1.2) * (1 + 0.15 * Math.sin(TAU * 4.5 * t)) * Math.min(1, t * 200); };
        break;
      case "bell":              // music box / bell (a little FM)
        n.next = () => { const t = n.t * dt; if (t > 3) n.done = true; return Math.sin(TAU * f * t + 1.6 * Math.sin(TAU * 3.01 * f * t) * Math.exp(-t * 4)) * Math.exp(-t * 2.2); };
        break;
      case "pad": {             // slow detuned pad, low-passed
        n.next = () => {
          const t = n.t * dt, att = Math.min(1, t / 1.5), rel = n.t > n.dur ? Math.exp(-(n.t - n.dur) * dt * 1.5) : 1;
          if (rel < 0.01) n.done = true;
          n.ph = (n.ph + f * dt) % 1; n.ph2 = (n.ph2 + f * 1.006 * dt) % 1;
          n.lp += ((n.ph * 2 - 1) + (n.ph2 * 2 - 1) - n.lp) * 0.04;
          return n.lp * 0.5 * att * rel;
        };
        break;
      }
      case "kick":
        n.next = () => { const t = n.t * dt; if (t > 0.4) n.done = true; n.ph += (45 + 110 * Math.exp(-t * 35)) * dt; return Math.sin(TAU * n.ph) * Math.exp(-t * 9); };
        break;
      case "snare": {
        const r = rng(91);
        n.next = () => { const t = n.t * dt; if (t > 0.25) n.done = true; return ((r() * 2 - 1) * 0.7 + 0.3 * Math.sin(TAU * 190 * t)) * Math.exp(-t * 22); };
        break;
      }
      case "hat": {
        const r = rng(57);
        n.next = () => { const t = n.t * dt; if (t > 0.08) n.done = true; const v = r() * 2 - 1, d = v - n.lp; n.lp = v; return d * Math.exp(-t * 70) * 0.5; };
        break;
      }
      case "thump":             // a dull heartbeat-like thud
        n.next = () => { const t = n.t * dt; if (t > 0.6) n.done = true; return Math.sin(TAU * 38 * t) * Math.exp(-t * 7) * Math.min(1, t * 80); };
        break;
      case "creak": {           // a slow rising/falling wooden creak
        const up = rng(midi)() < 0.5;
        n.next = () => {
          const t = n.t * dt; if (t > 1.4) n.done = true;
          const fr = f * (up ? 1 + t * 0.6 : 1.5 - t * 0.4);
          n.ph = (n.ph + fr * dt) % 1;
          const saw = n.ph * 2 - 1; n.lp += (saw - n.lp) * 0.08;
          return n.lp * Math.sin(Math.PI * Math.min(1, t / 1.4)) * (0.6 + 0.4 * Math.sin(TAU * 13 * t));
        };
        break;
      }
    }
    return n;
  }

  // ---------- a step sequencer that plays a looping pattern ----------

  // `compose(r)` returns { bpm, steps, events: [[step, inst, midi, beats, amp, pan], ...] } for one loop;
  // it is called again (new seed) every `renew` loops. `bed` is an optional continuous layer.
  function sequencer(SR, compose, { gain = 1, renew = 4, bed = null, swing = 0 } = {}) {
    let seed = 1, song = compose(rng(seed)), step = 0, loop = 0, sample = 0;
    let spb = SR * 60 / song.bpm / 4;            // samples per 16th note
    const notes = [], out = [0, 0];
    const trigger = s => {
      song.events.forEach(([at, inst, midi, beats, amp, pan]) => {
        if (at === s) notes.push(makeNote(inst, midi, beats * 4 * spb / SR, amp, pan ?? 0, SR));
      });
    };
    trigger(0);
    return () => {
      const len = spb * (step % 2 ? 1 - swing : 1 + swing);
      if (++sample >= len) {
        sample = 0;
        step++;
        if (step >= song.steps) {
          step = 0;
          if (++loop % renew === 0) { song = compose(rng(++seed * 7919)); spb = SR * 60 / song.bpm / 4; }
        }
        trigger(step);
      }
      let l = 0, r = 0;
      for (let i = notes.length - 1; i >= 0; i--) {
        const n = notes[i], v = n.next() * n.amp;
        n.t++;
        l += v * (1 - Math.max(0, n.pan)); r += v * (1 + Math.min(0, n.pan));
        if (n.done) notes.splice(i, 1);
      }
      if (bed) { const [bl, br] = bed(); l += bl; r += br; }
      out[0] = l * gain; out[1] = r * gain;
      return out;
    };
  }

  // Chords as MIDI notes; scales for melodies.
  const C = 60;
  const CHORD = {
    C: [0, 4, 7], Am: [-3, 0, 4], F: [-7, -3, 0], G: [-5, -1, 2], Dm: [-10, -7, -3], Em: [-8, -5, -1],
    Fmaj7: [-7, -3, 0, 4], Em7: [-8, -5, -1, 2], Dm7: [-10, -7, -3, 0], Cmaj7: [0, 4, 7, 11],
  };
  const PENTA = [0, 2, 4, 7, 9];
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  // A melody that steps around a pentatonic scale, landing on chord tones on the beat.
  function melody(r, chords, { base, density, inst, amp, dur = 0.5, range = 10 }) {
    const ev = [];
    let pos = 0;
    chords.forEach((ch, bar) => {
      for (let s = 0; s < 16; s += 2) {
        if (r() > density && s % 8) continue;
        const onBeat = s % 4 === 0;
        const cand = onBeat ? CHORD[ch].map(n => ((n % 12) + 12) % 12) : PENTA;
        pos = Math.max(-range / 2, Math.min(range, pos + Math.floor(r() * 5) - 2));
        const deg = cand[Math.abs(pos) % cand.length], oct = Math.floor(pos / cand.length);
        ev.push([bar * 16 + s, inst, base + deg + 12 * Math.max(-1, Math.min(1, oct)), dur, amp, (r() - 0.5) * 0.4]);
      }
    });
    return ev;
  }
  function noise() { return Math.random() * 2 - 1; }

  // ---------- the tracks ----------

  const TRACKS = [
    // Cute: a stroll through a flower village.
    { name: "꽃마을 산책", make: SR => sequencer(SR, r => {
      const prog = ["C", "Am", "F", "G", "C", "Am", "F", "G"], ev = [];
      prog.forEach((ch, bar) => {
        ev.push([bar * 16, "tri", C - 24 + CHORD[ch][0] + 12, 0.9, 0.35], [bar * 16 + 8, "tri", C - 24 + CHORD[ch][2], 0.9, 0.3]);
        [4, 12].forEach(s => CHORD[ch].forEach((n, k) => ev.push([bar * 16 + s, "pluck", C + n, 1, 0.18, k * 0.3 - 0.3])));
        for (let s = 2; s < 16; s += 4) ev.push([bar * 16 + s, "hat", 60, 0.1, 0.12]);
      });
      return { bpm: 112, steps: 128, events: ev.concat(melody(r, prog, { base: C + 12, density: 0.55, inst: "marimba", amp: 0.35 })) };
    }, { gain: 0.55 }) },

    // Cute: an 8-bit playground.
    { name: "8비트 놀이터", make: SR => sequencer(SR, r => {
      const prog = ["C", "G", "Am", "F", "C", "G", "F", "G"], ev = [];
      prog.forEach((ch, bar) => {
        for (let s = 0; s < 16; s += 2) ev.push([bar * 16 + s, "tri", C - 24 + CHORD[ch][0] + (s % 4 ? 12 : 0), 0.4, 0.3]);
        for (let s = 0; s < 16; s++) if (s % 4 === 2) ev.push([bar * 16 + s, "hat", 60, 0.1, 0.12]);
        ev.push([bar * 16 + 4, "snare", 60, 0.2, 0.14], [bar * 16 + 12, "snare", 60, 0.2, 0.14], [bar * 16, "kick", 40, 0.3, 0.35]);
        for (let s = 0; s < 16; s++) if (r() < 0.25) ev.push([bar * 16 + s, "square", C + CHORD[ch][s % 3], 0.1, 0.06, 0.3]);
      });
      return { bpm: 138, steps: 128, events: ev.concat(melody(r, prog, { base: C + 12, density: 0.75, inst: "square", amp: 0.16, dur: 0.4 })) };
    }, { gain: 0.6 }) },

    // Calm: a lo-fi room, with vinyl crackle.
    { name: "로파이 방", make: SR => sequencer(SR, r => {
      const prog = ["Fmaj7", "Em7", "Dm7", "Cmaj7"], ev = [];
      prog.forEach((ch, bar) => {
        CHORD[ch].forEach((n, k) => ev.push([bar * 16 + (k ? 0 : 0), "epiano", C + n, 3.5, 0.16, k * 0.2 - 0.3]));
        ev.push([bar * 16 + 10, "epiano", C + CHORD[ch][2] + 12, 1, 0.08, 0.3]);
        ev.push([bar * 16, "kick", 40, 0.3, 0.38], [bar * 16 + 7, "kick", 40, 0.3, 0.25], [bar * 16 + 10, "kick", 40, 0.3, 0.3]);
        ev.push([bar * 16 + 4, "snare", 60, 0.2, 0.1], [bar * 16 + 12, "snare", 60, 0.2, 0.1]);
        for (let s = 0; s < 16; s += 2) ev.push([bar * 16 + s, "hat", 60, 0.1, s % 4 ? 0.05 : 0.08]);
        ev.push([bar * 16, "tri", C - 24 + CHORD[ch][0] + 12, 3, 0.25]);
      });
      return { bpm: 76, steps: 64, events: ev.concat(melody(r, prog, { base: C + 12, density: 0.25, inst: "bell", amp: 0.12, dur: 1 })) };
    }, { gain: 0.7, swing: 0.18, bed: () => { const c = Math.random() < 0.0006 ? noise() * 0.25 : noise() * 0.004; return [c, c]; } }) },

    // Calm: an afternoon piano, slow broken chords.
    { name: "오후의 피아노", make: SR => sequencer(SR, r => {
      const prog = ["C", "G", "Am", "F", "Dm", "Em", "F", "G"], ev = [];
      prog.forEach((ch, bar) => {
        const notes = [CHORD[ch][0] - 12, ...CHORD[ch], CHORD[ch][0] + 12];
        [0, 3, 6, 8, 11, 14].forEach((s, k) => ev.push([bar * 16 + s, "epiano", C + notes[k % notes.length], 2, 0.14, k * 0.1 - 0.25]));
      });
      return { bpm: 66, steps: 128, events: ev.concat(melody(r, prog, { base: C + 12, density: 0.35, inst: "epiano", amp: 0.2, dur: 1 })) };
    }, { gain: 0.85 }) },

    // Horror: a corridor at midnight — a low drone, an out-of-tune music box, a heartbeat now and then.
    { name: "한밤의 복도", make: SR => {
      const box = [62, 65, 68, 69, 74, 63];                       // D minor with a flat second and a tritone
      return sequencer(SR, r => {
        const ev = [[0, "pad", 38, 15, 0.5, -0.2], [0, "pad", 44, 15, 0.25, 0.2]];
        for (let s = 0; s < 64; s++) if (r() < 0.12) ev.push([s, "bell", pick(r, box) + (r() < 0.3 ? 12 : 0), 2, 0.12, (r() - 0.5) * 1.4]);
        if (r() < 0.7) ev.push([Math.floor(r() * 56), "thump", 30, 0.5, 0.5], [0, "thump", 30, 0.5, 0]);
        return { bpm: 60, steps: 64, events: ev };
      }, { gain: 0.6, renew: 1, bed: (() => { let w = 0; return () => { w += (noise() - w) * 0.01; return [w * 0.25, w * 0.22]; }; })() });
    } },

    // Horror: wind through an empty house, with creaks.
    { name: "폐가의 바람", make: SR => sequencer(SR, r => {
      const ev = [[0, "pad", 33, 15, 0.35]];
      for (let k = 0; k < 4; k++) if (r() < 0.6) ev.push([Math.floor(r() * 60), "creak", 40 + Math.floor(r() * 20), 1, 0.25, (r() - 0.5) * 1.6]);
      return { bpm: 60, steps: 64, events: ev };
    }, { gain: 0.85, renew: 1, bed: (() => {
      let w = 0, b = 0, t = 0;
      return () => {           // wind: low-passed noise that swells and howls
        t++;
        const swell = 0.5 + 0.5 * Math.sin(t / SR * 0.4) * Math.sin(t / SR * 0.13);
        w += (noise() - w) * (0.02 + 0.04 * swell);
        b += (w - b) * 0.2;
        return [b * 0.6 * swell, b * 0.55 * swell];
      };
    })() }) },
  ];

  // Themes for the picker; numbers index Ambient.NAMES (the nature scenes come first).
  const base = Ambient.NAMES.length, baseCreate = Ambient.createScene;
  TRACKS.forEach(t => Ambient.NAMES.push(t.name));
  Ambient.createScene = (type, SR) => type >= base ? TRACKS[type - base].make(SR) : baseCreate(type, SR);
  window.BGM_THEMES = [
    { name: "자연", items: [0, 1, 2, 3, 4, 5, 6, 7] },
    { name: "잔잔한", items: [base + 2, base + 3] },
    { name: "귀여운", items: [base, base + 1] },
    { name: "몽환", items: [8, 9] },
    { name: "공포", items: [base + 4, base + 5] },
  ];
})();
