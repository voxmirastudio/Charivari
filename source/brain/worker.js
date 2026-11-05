// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// CHARIVARI — cerveau des naissances, exécuté dans un Web Worker de l'interface (ou, à défaut, sur le fil principal).
// Messages reçus :
//   { type:'parent', id, L, R, sr }                    → analyse du parent, réponse { type:'ready', id, facts }
//   { type:'design', id, miroir, accord, gen }         → population (sans rendu), réponse { type:'population', id, miroir, accord, gen, kids }
//   { type:'birth', id, k, miroir, accord, gen, remut, token } → naissance de l'enfant k (remut : sa re-mutation, 0 = d'origine) + sa boucle de stase,
//   (gen : la génération de la troupe pour ce sujet — 0, 1, 2… ; voir genetique.js, historyOf)
//        réponse { type:'child', id, k, token, pcm (mots : enfant puis boucle en stéréo 24 bits empaqueté, puis anatomie),
//                  peak, frames (mots), childLen, loopStart, loopLen, anaFrames, desc, genome, layers, gainDb, ms }
import { analyseParent } from './parent.js';
import { scaleClasses, scaleLadder, forceScale, availMask, ZD_LIB, masterScale, masterKeep } from './microtonal.js';
import { designPopulation, redesignKid, buildLayers, birth, sustainLoop, accordLadder, degreeDomain, ladderOn, LOOP_SEC } from './genetique.js';
import { forceTempo } from './tempo2.js';
import { childAnatomy, ANA_REC } from './anatomie.js';
import { roomOf } from './room.js';
import { pack24, words24, FULL24 } from './pack24.js';
import { lacquerBlock, LACQ_W } from './laque.js';
import { holdGrains } from './grains.js';
import { resampleTo } from './resample.js';

// (V6.9.2) the version of the genes that changed since 6.8 (2: the isoperiodicity of 6.9.2): a mummer kept on the disk by an
// earlier version that carries such a gene is born again; every other one is kept as it is
export const GENE_VERSION = 2;
const SLOT = 3 << 19;                        // un emplacement du DSP : 1 572 864 mots = 2^20 images en 24 bits empaqueté
export const SUBJ = 16;                      // (V6.3) l'emplacement du sujet lui-même : le 17e pad (pôles, laque, lecture)
const state = { id: null, P: null, pops: new Map(), accord: null, mts: null, ms: null, keep: null, tune: { bpm: 0, scale: -1, mts: false, mscale: -1 } };

// (V6.9) WHAT MAT SETS BY HAND ON A SUBJECT, laid over its analysis (which is kept, untouched, in P.__ana): a typed tempo (the
// subject's pulse becomes exactly that tempo — tempo2.js, forceTempo), a scale chosen in the ZD Ultimate library (on the
// analysis's tuning — microtonal.js, forceScale), an MTS-ESP master's notes as the degrees of the Tuning switch (genetique.js,
// degreeDomain). Everything that reads the pulse or the scale is computed again from them (the troupe's design, the writings,
// the ladder); with nothing set, the subject is exactly its analysis.
function applyTune (t) {
  const P = state.P; t = t || {};
  if (!P.__ana) P.__ana = { tempo: P.tempo, tempoBpm: P.traits.tempoBpm, tuning: P.tuning, ladder: P.ladder };
  const A = P.__ana, bpm = Number(t.bpm);
  let fb = 0;
  if (bpm >= 20 && bpm <= 400) { P.tempo = forceTempo(P.attacks || [], bpm, P.tempoAll); P.traits.tempoBpm = bpm; fb = bpm; }
  else { P.tempo = A.tempo; P.traits.tempoBpm = A.tempoBpm; }
  P.tuning = A.tuning; P.ladder = A.ladder;
  let fs = -1;
  if (A.tuning && Number.isInteger(t.scale) && t.scale >= 0 && t.scale !== A.tuning.scaleIndex) {
    const c = { ...A.tuning, degrees: A.tuning.degrees.slice(), activeDegrees: A.tuning.activeDegrees.slice() };
    if (forceScale(c, t.scale)) { P.tuning = c; P.ladder = scaleLadder(c, 16); fs = t.scale; }
  }
  state.mts = t.mts && Array.isArray(t.mts.hz) && t.mts.hz.length === 128 ? { hz: t.mts.hz.map(Number), name: String(t.mts.name || '') } : null;
  // (1.0) a ZD scale on the master's notes (its own choice, apart from the scale chosen on the analysis's tuning): only the
  // degrees of the Tuning switch change — the writings keep reading the analysis's tuning, as before
  state.ms = state.mts ? masterScale(state.mts, P.fundamentalHz, P.fingerprint) : null;
  state.keep = state.ms && Number.isInteger(t.mscale) && t.mscale >= 0 ? masterKeep(state.ms, t.mscale) : null;
  state.accord = state.mts ? (ladderOn(degreeDomain(P, state.mts, state.keep), 16) || accordLadder(P, 16)) : accordLadder(P, 16);
  state.pops.clear(); delete P.__pops; delete P.__acts;
  state.tune = { bpm: fb, scale: fs, mts: !!state.mts, mscale: state.keep ? state.keep.s : -1 };
}

function population (miroir, gen) {
  const m = Math.round(miroir * 100), g = Math.max(0, Math.floor(gen || 0)), key = `${m}:${g}`;
  if (!state.pops.has(key)) state.pops.set(key, designPopulation(state.P, { miroir: m / 100, gen: g }));
  return state.pops.get(key);
}

// la gamme de l'analyse pour le DSP (pôles accordés) : degrés dans la période (cents, 0 en tête, doublons à moins de 5 c
// fusionnés), période, fondamentale mesurée du parent comme tonique ; sans gamme : tempérament égal sur la fondamentale
function scaleOf (P) {
  const root = P.fundamentalHz > 0 ? P.fundamentalHz : 261.63, t = P.tuning;
  if (!t) return { rootHz: root, period: 1200, degrees: Array.from({ length: 12 }, (_, i) => 100 * i) };
  const { period: p, cls } = scaleClasses(t), deg = [];
  for (const c of cls) { if (p - c < 5) continue; if (deg.length && c - deg[deg.length - 1] < 5) continue; deg.push(Math.round(c * 100) / 100); }
  return { rootHz: root, period: p, degrees: deg.slice(0, 60) };
}

// pouls lu (même au-dessous du seuil : l'interface dit alors qu'il n'est pas suivi), famille métrique, tatum, micro-groove
function pulseOf (P) {
  const A0 = P.tempoAll, ana = A0 ? { bpm: A0.bpm, conf: A0.confidence, used: !!(P.__ana ? P.__ana.tempo : P.tempo), sparse: A0.sparse ? { n: A0.sparse.n, chance: A0.sparse.chance } : null } : null;
  // (V6.9) a typed tempo: the pulse is the typed one, the analysis's reading kept beside it
  if (P.tempo && P.tempo.forced) { const T = P.tempo, g = T.groove;
    return { bpm: T.bpm, conf: 1, used: true, forced: true, ana, tatumMs: T.grid.tatum * 1000, perBeat: T.grid.R, global: true, family: [], ambiguous: false,
      groove: { templateMs: g.templateMs, slotN: g.slotN, swing: g.swing, rigidity: g.rigidity, residualMs: median(g.residualMs.map(Math.abs)), outliers: g.outliers, n: g.n }, sparse: null, regularity: T.grid.regularity }; }
  const A = A0; if (!A) return null;
  const g = A.groove;
  return { ana, bpm: A.bpm, conf: A.confidence, used: !!P.tempo, tatumMs: A.grid.tatum * 1000, perBeat: A.grid.R, global: A.grid.global,
    family: A.family.slice(0, 3).map(f => ({ bpm: f.bpm, ratio: f.ratio, rel: f.rel })), ambiguous: A.ambiguous,
    groove: { templateMs: g.templateMs, slotN: g.slotN, swing: g.swing, rigidity: g.rigidity, residualMs: median(g.residualMs.map(Math.abs)), outliers: g.outliers, n: g.n },
    sparse: A.sparse ? { n: A.sparse.n, chance: A.sparse.chance } : null };
}
const median = xs => { if (!xs.length) return 0; const s = xs.slice().sort((a, b) => a - b); return s[s.length >> 1]; };

function facts (P) {
  const T = P.traits;
  return {
    dur: T.dur, tonal: T.tonal, nHarm: T.nHarm, nVoices: T.nVoices, onsets: T.onsets, sharpOnsets: T.sharpOnsets,
    onsetRate: T.onsetRate, notes: T.notes, pitchRangeCents: T.pitchRangeCents, vibRate: T.vibRate, vibDepth: T.vibDepth,
    harmonicity: T.harmonicity, lifeCents: T.lifeCents, lifeDb: T.lifeDb, centroid: T.centroid,
    tempoBpm: T.tempoBpm, tempoConf: T.tempoConf, activeStart: T.activeStart, activeEnd: T.activeEnd,
    pulse: pulseOf(P),
    fundamentalName: P.fundamentalName, fundamentalHz: P.fundamentalHz,
    tuning: P.tuning ? { name: P.tuning.name, scaleName: P.tuning.scaleName, family: P.tuning.scaleFamily || '', lib: P.tuning.scaleLib || '',
      labels: P.tuning.scaleLabels || null, cents: P.tuning.scaleCents || null, match: P.tuning.scaleMatch ?? null,
      alt: (P.tuning.scaleAlt || []).map(a => a.name) } : null,
    ladder: P.ladder ? Array.from(P.ladder) : null, accord: state.accord, formants: P.formants, ms: P.ms, scale: scaleOf(P),
    onsetTimes: (P.onsetsAll || []).slice(0, 128).map(o => o.t),
    // (V6.9) what was set by hand, the scale menu (the analysis's proposal first, the scales its tuning can carry), every degree
    // of the Tuning switch, the MTS-ESP master when it gives the degrees
    tune: state.tune,
    scaleMenu: P.__ana && P.__ana.tuning ? { proposed: P.__ana.tuning.scaleIndex, current: P.tuning.scaleIndex, avail: availMask(P.__ana.tuning), proposedName: P.__ana.tuning.scaleName, keyCents: P.__ana.tuning.keyCents || null } : null,
    zd: ZD_LIB, degrees: degreeDomain(P, state.mts, state.keep), mts: state.mts ? { name: state.mts.name } : null,
    // (1.0) the scale menu on the master: its keys from the tonic, the notes realising each key, the analysis's proposal on it
    mtsMenu: state.ms ? { octave: state.ms.octave, tonic: state.ms.tonic, avail: state.ms.avail, keyCents: state.ms.keyCents, keyNotes: state.ms.keyNotes,
      proposed: state.ms.proposed, proposedName: state.ms.proposedName, current: state.keep ? state.keep.s : -1 } : null,
    room: (() => { try { const r = roomOf(P); return { t60: r.t60, measured: r.measured, tails: r.tails, tailDb: r.tailDb, near: r.nNear, far: r.nFar }; } catch (e) { return null; } })()
  };
}

// génomes et descriptions (strates construites sans rendu : quelques ms par enfant)
function kidsOf (pop, accord) {
  const P = state.P;
  return pop.kids.map((k, i) => {
    let desc = [];
    let active = null;
    try { const r = buildLayers(P, k, pop.ctx, { accordCents: accord && state.accord ? state.accord[i] || 0 : 0 }); desc = r.descs; active = r.active; } catch (e) { desc = []; }
    return { genome: k.genome.map(x => ({ g: x.g, v: x.v, iota: x.iota, organo: !!x.organo })), iota: k.iota, desc, active };
  });
}

function born (m) {
  if (m.k === SUBJ) return subjectSlot(m);
  // (V6.2) remut > 0 : ce pad a été re-muté r fois — un autre génome, à la même dose (genetique.js, redesignKid)
  const t0 = Date.now(), P = state.P, pop = population(m.miroir, m.gen), kid0 = m.remut > 0 ? redesignKid(P, pop, m.k, m.remut) : pop.kids[m.k];
  if (!kid0) throw new Error('mummer ' + (m.k + 1) + ' missing from the troupe');
  // (V6.4) doses set by hand in the report: each gene of this mummer at the dose Mat gave it (the rest of its genome unchanged)
  const hand = Array.isArray(m.doses) ? m.doses : null;
  // (ι prend la dose de Mat ; amt = dose de Mat ÷ dose calculée, pour les gènes que leur dose ne gouverne pas ; à 0 % le gène
  // est éteint : le mummer naît sans lui)
  const kid = hand ? { ...kid0, genome: kid0.genome.map((x, i) => (Number.isFinite(hand[i]) ? { ...x, iota: Math.max(0, Math.min(1, hand[i])), amt: Math.max(0, Math.min(1, hand[i])) / Math.max(0.01, x.iota), off: hand[i] <= 0 } : x)) } : kid0;
  const genesOf = g => g.genome.map(x => ({ g: x.g, v: x.v, iota: x.iota, organo: !!x.organo }));
  // place d'un emplacement : enfant + boucle (1,5 mot par image) + anatomie (32 mots toutes les 1024 images)
  const Lloop = Math.round(LOOP_SEC * P.sr), maxSec = Math.floor((SLOT - words24(Lloop) - 4096) / (1.5 + 32 / 1024)) / P.sr;
  // (V6.9) a degree chosen by hand in the report: the cents of that degree, sent with the birth
  const accordCents = m.accord && state.accord ? (Number.isFinite(m.cents) ? m.cents : state.accord[m.k] || 0) : 0;
  const opts = { accordCents, maxSec };
  const c = birth(P, kid, pop.ctx, opts);
  const lp = sustainLoop(P, kid, pop.ctx, c, opts);
  let n = Math.min(c.L.length, Math.floor((SLOT - words24(lp.len) - 4096) / 1.5));
  const ana = childAnatomy(c.L.subarray(0, n), c.R.subarray(0, n), P.sr, c.cmap, P.formants);
  while (n > 0 && words24(n) + words24(lp.len) + ana.words.length + LACQ_W > SLOT) n -= 2;
  // (V6.3) la LAQUE : Moonvox ajusté au sujet, les phases relatives de CE mummer (laque.js), après l'anatomie
  // (V6.4) la tenue granulaire : relevée dans la zone tenue de CE son (grains.js), envoyée avec la laque
  const gr = (() => { try { return holdGrains(P, pop.ctx, { L: c.L.subarray(0, n), R: c.R.subarray(0, n) }, Math.min(lp.start, Math.max(0, n - 1)), lp); } catch (e) { return null; } })();
  const lq = lacquerBlock(P, c.L.subarray(0, n), c.R.subarray(0, n), ana, gr);
  const wc = words24(n), wl = words24(lp.len), total = wc + wl + ana.words.length + LACQ_W;
  let peak = 1e-9;
  for (let i = 0; i < n; ++i) peak = Math.max(peak, Math.abs(c.L[i]), Math.abs(c.R[i]));
  for (let i = 0; i < lp.len; ++i) peak = Math.max(peak, Math.abs(lp.L[i]), Math.abs(lp.R[i]));
  // mots : [enfant 24 bits][boucle 24 bits][anatomie] ; crête normalisée à pleine échelle 24 bits
  const pcm = new Int32Array(total), s = FULL24 / peak;
  pack24(c.L, c.R, n, s, pcm, 0);
  pack24(lp.L, lp.R, lp.len, s, pcm, wc);
  pcm.set(ana.words, wc + wl);
  pcm.set(lq.words, wc + wl + ana.words.length);
  return {
    type: 'child', id: m.id, k: m.k, token: m.token, pcm, peak, frames: total, childLen: n, bits: 24, lacquer: lacqFacts(lq),
    loopStart: Math.min(lp.start, Math.max(0, n - 1)), loopLen: lp.len, loopSeamless: !!lp.seamless, loopX: lp.xfade || 0, anaFrames: ana.nfr, gesteLevel: ana.level, anaCounts: ana.counts, cmap: c.cmap, desc: c.desc,
    genome: kid.genome.map(x => x.g), genes: genesOf(kid), genes0: genesOf(kid0), active: c.active, doses: hand, remut: m.remut || 0, layers: c.layers, cut: c.cut, gainDb: c.gainDb, accordCents, cents: Number.isFinite(m.cents) ? m.cents : null, gv: GENE_VERSION, ms: Date.now() - t0
  };
}

// (V6.3) LE SUJET COMME 17e PAD : son propre emplacement — le sujet lui-même, tel quel (aucune naissance : pas de gain, pas
// de silence retiré), sa boucle de tenue choisie comme pour un mummer, son anatomie (carte du temps identité), sa laque
function subjectSlot (m) {
  const t0 = Date.now(), P = state.P, pop = population(m.miroir, m.gen), Lloop = Math.round(LOOP_SEC * P.sr);
  let n = Math.min(P.n, Math.floor((SLOT - words24(Lloop) - 4096 - LACQ_W) / (1.5 + 32 / 1024)));
  const nm = Math.ceil(n / 1024) + 2, cmap = new Float32Array(nm); for (let j = 0; j < nm; ++j) cmap[j] = Math.min(j * 1024, P.n - 1);
  const c = { L: P.L.subarray(0, n), R: P.R.subarray(0, n), D: n, cut: 0, g: 1, cmap, eSrc: null, desc: ['the subject itself'], layers: 1, gainDb: 0 };
  const kid = { genome: [], iota: 0 };
  const lp = sustainLoop(P, kid, pop.ctx, c, {});
  const ana = childAnatomy(c.L, c.R, P.sr, cmap, P.formants);
  while (n > 0 && words24(n) + words24(lp.len) + ana.words.length + LACQ_W > SLOT) n -= 2;
  // (V6.4) la tenue granulaire : relevée dans la zone tenue de CE son (grains.js), envoyée avec la laque
  const gr = (() => { try { return holdGrains(P, pop.ctx, { L: c.L.subarray(0, n), R: c.R.subarray(0, n) }, Math.min(lp.start, Math.max(0, n - 1)), lp); } catch (e) { return null; } })();
  const lq = lacquerBlock(P, c.L.subarray(0, n), c.R.subarray(0, n), ana, gr);
  const wc = words24(n), wl = words24(lp.len), total = wc + wl + ana.words.length + LACQ_W;
  let peak = 1e-9;
  for (let i = 0; i < n; ++i) peak = Math.max(peak, Math.abs(c.L[i]), Math.abs(c.R[i]));
  for (let i = 0; i < lp.len; ++i) peak = Math.max(peak, Math.abs(lp.L[i]), Math.abs(lp.R[i]));
  const pcm = new Int32Array(total), s = FULL24 / peak;
  pack24(c.L, c.R, n, s, pcm, 0);
  pack24(lp.L, lp.R, lp.len, s, pcm, wc);
  pcm.set(ana.words, wc + wl);
  pcm.set(lq.words, wc + wl + ana.words.length);
  return {
    type: 'child', id: m.id, k: SUBJ, token: m.token, pcm, peak, frames: total, childLen: n, bits: 24, lacquer: lacqFacts(lq),
    loopStart: Math.min(lp.start, Math.max(0, n - 1)), loopLen: lp.len, loopSeamless: !!lp.seamless, loopX: lp.xfade || 0, anaFrames: ana.nfr, gesteLevel: ana.level, anaCounts: ana.counts, cmap, desc: c.desc,
    genome: [], remut: 0, layers: 1, cut: 0, gainDb: 0, accordCents: 0, ms: Date.now() - t0
  };
}
// ce que l'interface dit de la laque : le timbre de Moonvox retenu et l'écart d'ajustement, le verrou des phases du son
function lacqFacts (lq) {
  const f = lq.fit, ph = lq.phase, loc = ph ? Array.from(ph.local).slice(1, 8).sort((a, b) => a - b) : [];
  return { timbre: f.name, designed: !!f.designed, none: !!f.none, oscillators: f.oscillators || 0, oboe: f.O, brass: f.B, balance: f.bal, tilt: f.tilt, rate: f.rate, calc: f.calc, coag: f.coag, subl: f.subl,
    fitDb: Number.isFinite(f.err) ? +f.err.toFixed(1) : null, lock: loc.length ? +loc[loc.length >> 1].toFixed(2) : null, grains: lq.grains ? lq.grains.desc : null };
}

export function handle (m) {
  if (m.type === 'parent') {
    state.id = m.id; state.pops.clear();
    state.P = analyseParent(m.L, m.R, m.sr);
    applyTune(m.tune || null);
    return { type: 'ready', id: m.id, facts: facts(state.P), seq: m.seq || 0 };
  }
  // (V6.5) a file at another rate is decoded at ITS rate by the interface and converted here (resample.js: Kaiser, 140 dB,
  // flat to 95.5 % of Nyquist) — the browser's own conversion is of unknown quality
  if (m.type === 'resample') { const [L, R] = resampleTo([m.L, m.R], m.srIn, m.srOut); return { type: 'resampled', id: m.id, L: Float32Array.from(L), R: Float32Array.from(R) }; }
  if (!state.P || m.id !== state.id) return { type: 'error', id: m.id, k: m.k, message: 'no subject loaded' };
  if (m.type === 'tune') { applyTune(m.tune || null); return { type: 'ready', id: m.id, facts: facts(state.P), tuned: true, seq: m.seq || 0 }; }
  if (m.type === 'design') return { type: 'population', id: m.id, miroir: m.miroir, accord: !!m.accord, gen: m.gen || 0, kids: kidsOf(population(m.miroir, m.gen), m.accord) };
  if (m.type === 'birth') return born(m);
  return { type: 'error', id: m.id, message: 'unknown message ' + m.type };
}

// dans un Worker : répond aux messages ; le pcm est transféré (pas copié)
if (typeof self !== 'undefined' && typeof self.postMessage === 'function' && typeof window === 'undefined') {
  self.onmessage = e => {
    const m = e.data;
    try {
      const r = handle(m);
      self.postMessage(r, r && r.pcm ? [r.pcm.buffer] : r && r.type === 'resampled' ? [r.L.buffer, r.R.buffer] : []);
    } catch (err) {
      self.postMessage({ type: 'error', id: m.id, k: m.k, token: m.token, message: String(err && err.message || err) });
    }
  };
}
export const __state = () => state;             // tests
