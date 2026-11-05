// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// analyse complète d'un parent : attaques, tempo, fondamentale, tuning/gamme — chiffres mesurés
import fs from 'node:fs';
import { readWav, resampleTo } from './wav.js';
import { decompose } from './decompose.js';
import { inferTempo } from './tempo.js';
import { loadTunings, fingerprintPoints, matchTunings, centsOf, noteName, scaleLadder } from './microtonal.js';
const TUN = loadTunings(JSON.parse(fs.readFileSync(new URL('./tunings.json', import.meta.url))));
for (const f of process.argv.slice(2)) {
  const w = readWav(f); let ch = w.ch; if (w.sr !== 48000) ch = resampleTo(ch, w.sr, 48000);
  const sr = 48000, [L, R] = ch, n = L.length, t0 = Date.now();
  const d = decompose(L, R, sr, { passes: 2 });
  const tempo = inferTempo(d.onsets.map(o => o.t), d.onsets.map(o => Math.max(0.1, o.rise / 20)));
  // fondamentale dominante : f0 pondérée par l'énergie des trames harmoniques
  const hist = new Map();
  for (const [a, b] of d.segs) for (let j = a; j <= b; ++j) { const c = Math.round(centsOf(d.f0.f0[j]) / 10) * 10; hist.set(c, (hist.get(c) || 0) + d.f0.conf[j]); }
  let fc = null, fw = 0; for (const [c, w] of hist) if (w > fw) { fw = w; fc = c; }
  // raffinement : moyenne des f0 à ±50 c de ce pic
  if (fc !== null) { let s = 0, ws = 0; for (const [a, b] of d.segs) for (let j = a; j <= b; ++j) { const c = centsOf(d.f0.f0[j]); if (Math.abs(c - fc) < 50) { s += c * d.f0.conf[j]; ws += d.f0.conf[j]; } } fc = s / ws; }
  const pts = []; for (const t of d.tracks) for (let q = 0; q < t.j.length; ++q) pts.push({ f: t.f[q], w: (t.aL[q] + t.aR[q]) * 0.5 });
  const fp = fingerprintPoints(pts);
  const free = matchTunings(fp, TUN, { top: 3 });
  const fixed = fc !== null ? matchTunings(fp, TUN, { top: 3, rootCents: fc }) : [];
  console.log(`\n${f.split('/').pop()} — ${(n / sr).toFixed(2)} s, analyse ${Date.now() - t0} ms`);
  console.log(`  attaques ${d.onsets.length} (raides ${d.onsets.filter(o => o.sharp).length}) | partiels ${d.tracks.length}`);
  console.log(`  tempo : ${tempo.length ? tempo.slice(0, 3).map(t => `${t.bpm.toFixed(2)} BPM (conf ${(t.confidence).toFixed(2)}${t.octave ? ', parenté' : ''})`).join(' ; ') : 'aucun pouls'}`);
  console.log(`  fondamentale dominante : ${fc !== null ? noteName(fc) + ' = ' + (8.17579891564371 * Math.pow(2, fc / 1200)).toFixed(2) + ' Hz' : 'aucune (son non harmonique)'} | empreinte ${fp.meta.mode} (harmonicité ${fp.meta.harmonicity.toFixed(3)})`);
  for (const c of free) console.log(`  libre   : ${c.name} [${c.path}] fit ${c.fit.toFixed(3)} tonique ${c.rootNote} gamme ${c.scaleName} (${c.nActive}/${c.degrees.length})`);
  for (const c of fixed) console.log(`  tonique=fondamentale : ${c.name} fit ${c.fit.toFixed(3)} gamme ${c.scaleName} (${c.nActive}/${c.degrees.length}) → échelle des 16 enfants (c) ${scaleLadder(c, 16).map(x => Math.round(x)).join(' ')}`);
}
