// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — rendu d'un enfant
//  Un enfant = une ou plusieurs STRATES. Une strate relit la micro-partition du parent :
//   • une carte du temps (segments linéaires τ → temps source, sens direct ou rétrograde) ;
//   • pour chaque voix-partiel : décalage (canon), cadence propre, hauteur, dynamique, place,
//     porte (hoquet), et l'horloge de VIE (vibrato/trémolo lus à leur vitesse naturelle même
//     quand le geste est étiré : lecture en palindrome autour de la position — continue, sans saut) ;
//   • le résidu, relu par la même carte (trames du son lui-même), éventuellement transposé.
//  Aux ruptures de la carte (segments), chaque voix s'éteint et renaît (fondu 4 ms, ou net à une
//  attaque). Tout est déterministe.
// ============================================================================================
import { synthPartials, grainMap, H, GRAIN_HOP } from './synth.js';
import { hzOf } from './microtonal.js';
import { resampleTo } from './wav.js';
import { renderSouffle } from './souffle.js';

// ---------------- carte du temps ----------------
export class TimeMap {
  // segs : [{ a, b (τ en éch.), sa, sb (source en éch.), sharpA?, sharpB? }] triés, disjoints
  constructor (segs) { this.segs = segs.filter(s => s.b > s.a).sort((x, y) => x.a - y.a); }
  seg (tau) { let lo = 0, hi = this.segs.length - 1; while (lo <= hi) { const m = (lo + hi) >> 1, s = this.segs[m]; if (tau < s.a) hi = m - 1; else if (tau >= s.b) lo = m + 1; else return m; } return -1; }
  at (tau) { const i = this.seg(tau); if (i < 0) return null; const s = this.segs[i]; return s.sa + (s.sb - s.sa) * (tau - s.a) / (s.b - s.a); }
  get end () { return this.segs.length ? this.segs[this.segs.length - 1].b : 0; }
  static identity (n) { return new TimeMap([{ a: 0, b: n, sa: 0, sb: n }]); }
  static linear (a, b, sa, sb) { return new TimeMap([{ a, b, sa, sb }]); }
}

const fold = (x, Lm) => { if (Lm <= 0) return 0; const p = ((x % (2 * Lm)) + 2 * Lm) % (2 * Lm); return p <= Lm ? p : 2 * Lm - p; };   // repli en palindrome
const clampv = (x, a, b) => x < a ? a : x > b ? b : x;
const lerp = (arr, q) => { const i = Math.floor(q), u = q - i; if (i < 0) return arr[0]; if (i >= arr.length - 1) return arr[arr.length - 1]; return arr[i] + (arr[i + 1] - arr[i]) * u; };

/**
 * Enveloppe spectrale (le « corps ») : enveloppe supérieure des partiels en dB sur l'axe des cents,
 * mesurée toutes les 4 trames (≈ 11 ms) puis MOYENNÉE dans le temps (triangle ±12 trames ≈ ±32 ms) :
 * un partiel qui naît ou meurt ne fait plus sauter le corps d'une trame à l'autre (mesuré : pointe
 * de +32 dB sur une seule trame dans un enfant miroir+écho, avant ce lissage).
 * Pente (régression pondérée) = la couleur générale.
 */
function rawBody (model, key) {
  const cache = model._bodyRaw || (model._bodyRaw = new Map());
  let e = cache.get(key); if (e) return e;
  const pts = [];
  for (const v of model.voices) { const q = key - v.j0; if (q < 0 || q >= v.m) continue; pts.push([v.cents[q], v.db[q]]); }
  pts.sort((a, b) => a[0] - b[0]);
  const up = pts.filter(([c, d]) => !pts.some(([c2, d2]) => Math.abs(c2 - c) < 150 && d2 > d + 0.01));
  let sw = 0, sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [c, d] of up) { const w = Math.pow(10, d / 20); sw += w; sx += w * c; sy += w * d; sxx += w * c * c; sxy += w * c * d; }
  const slope = sw > 0 && (sxx * sw - sx * sx) > 1e-9 ? (sxy * sw - sx * sy) / (sxx * sw - sx * sx) : 0;
  const icpt = sw > 0 ? (sy - slope * sx) / sw : -120;
  const at = c => { if (!up.length) return -120; if (c <= up[0][0]) return up[0][1] - (up[0][0] - c) * 0.01; if (c >= up[up.length - 1][0]) return up[up.length - 1][1] - (c - up[up.length - 1][0]) * 0.01;
    let lo = 0, hi = up.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (up[m][0] < c) lo = m; else hi = m; } const [c0, d0] = up[lo], [c1, d1] = up[hi]; return d0 + (d1 - d0) * (c - c0) / Math.max(1e-9, c1 - c0); };
  e = { n: up.length, at, tilt: c => icpt + slope * c };
  cache.set(key, e);
  return e;
}
export function bodyAt (model, jq) {
  const k0 = Math.round(jq / 4) * 4, list = [];
  for (let dk = -12; dk <= 12; dk += 4) { const r = rawBody(model, k0 + dk); if (r.n) list.push([r, 1 - Math.abs(dk) / 16]); }
  const W = list.reduce((s, x) => s + x[1], 0) || 1;
  return { at: c => list.length ? list.reduce((s, [r, w]) => s + w * r.at(c), 0) / W : -120,
    tilt: c => list.length ? list.reduce((s, [r, w]) => s + w * r.tilt(c), 0) / W : -120 };
}
/** correction de corps bornée (±15 dB) : ce qu'un partiel gagne ou perd en changeant de place */
export const bodyGain = (B, from, to, k = 1) => Math.max(-15, Math.min(15, k * (B.at(to) - B.at(from))));

/**
 * Rend une strate. S = {
 *   map: TimeMap, gain (lin), include(v)→poids, delay(v)→éch. (sortie), rate(v)→cadence propre,
 *   cents(v, τ, c, jq)→c', db(v, τ, d, jq, c, c')→d', pan(v, τ, p)→p', gate(v, τ)→0..1,
 *   life: { cents, db, rate } , resid: { gain, ratio, gate(τ), map? } | null }
 * D = durée de sortie (éch.)
 */
// suites CONTINUES de segments (sans saut de source ni demi-tour) ; aux ruptures, fondu enchaîné
// à puissance constante de 13 ms CENTRÉ sur la rupture (la suite sortante lit un peu au-delà de sa fin,
// l'entrante un peu avant son début) ; si la suite entrante commence sur une attaque raide, elle
// démarre nette et la sortante s'efface en 3 ms sous l'attaque.
function runsOf (map, sr) {
  const X = Math.round(0.013 * sr), XS = Math.round(0.003 * sr), runs = [];
  let cur = null;
  map.segs.forEach((sg, i) => {
    const pg = map.segs[i - 1];
    const cont = pg && Math.abs(pg.sb - sg.sa) < 2 && Math.abs(pg.b - sg.a) < 2 && Math.sign(pg.sb - pg.sa) === Math.sign(sg.sb - sg.sa);
    if (!cont) { cur = { segs: [] }; runs.push(cur); }
    cur.segs.push(sg);
  });
  runs.forEach((r, i) => {
    const first = r.segs[0], last = r.segs[r.segs.length - 1], prev = runs[i - 1], next = runs[i + 1];
    const touchPrev = prev && Math.abs(prev.segs[prev.segs.length - 1].b - first.a) < 2;
    const touchNext = next && Math.abs(last.b - next.segs[0].a) < 2;
    r.sharpIn = !!first.sharpA;
    r.xin = touchPrev && !r.sharpIn ? X / 2 : 0;
    r.xout = touchNext ? (next.segs[0].sharpA ? XS : X / 2) : 0;
    r.a = first.a; r.b = last.b;
    const ext = [];
    for (const sg of r.segs) ext.push({ ...sg });
    const sl0 = (first.sb - first.sa) / (first.b - first.a), sl1 = (last.sb - last.sa) / (last.b - last.a);
    if (r.xin) ext[0] = { ...ext[0], a: first.a - r.xin, sa: first.sa - sl0 * r.xin };
    if (r.xout) ext[ext.length - 1] = { ...ext[ext.length - 1], b: last.b + r.xout, sb: last.sb + sl1 * r.xout };
    r.map = new TimeMap(ext);
    r.gain = tau => {
      let g = 1;
      if (r.xin && tau < r.a + r.xin) g *= Math.sin(Math.PI / 4 * Math.max(0, (tau - (r.a - r.xin)) / r.xin));
      if (r.xout) { if (next.segs[0].sharpA) { if (tau > r.b) g *= Math.cos(Math.PI / 2 * Math.min(1, (tau - r.b) / r.xout)); } else if (tau > r.b - r.xout) g *= Math.cos(Math.PI / 4 * Math.min(2, (tau - (r.b - r.xout)) / r.xout)); }
      return g;
    };
  });
  return runs;
}

export function renderStratum (model, S, D) {
  const sr = model.sr, hop = model.hop, nF = Math.ceil(D / H) + 1;
  const lifeC = S.life?.cents ?? 1, lifeD = S.life?.db ?? 1, W = 40;
  const parts = [];
  for (const run of runsOf(S.map, sr)) {
  const map = run.map;
  for (const v of (S.voicesOverride || model.voices)) {
    const wv = S.include ? S.include(v) : 1;
    if (!wv) continue;
    const dl = S.delay ? S.delay(v) : 0, rt = S.rate ? S.rate(v) : 1;
    let cur = null, lq = null, lastSeg = -2, lastQ = null;
    const flush = (sharpOut) => { if (cur && cur.f.length >= 3) { cur.sharpOut = sharpOut; cur.f = Float64Array.from(cur.f); cur.aL = Float64Array.from(cur.aL); cur.aR = Float64Array.from(cur.aR); cur.ipd = Float64Array.from(cur.ipd); cur.tph = cur.lock ? Float64Array.from(cur.tph) : null; parts.push(cur); } cur = null; };
    const m0 = Math.max(0, Math.floor((map.segs[0].a / rt + dl) / H) - 1), m1 = Math.min(nF - 1, Math.ceil((map.end / rt + dl) / H) + 1);
    for (let m = m0; m <= m1; ++m) {
      const tau = m * H, tv = (tau - dl) * rt;
      const si = map.seg(tv);
      if (si < 0) { flush(false); lastSeg = -2; continue; }
      const sg = map.segs[si], src = sg.sa + (sg.sb - sg.sa) * (tv - sg.a) / (sg.b - sg.a), q = src / hop - v.j0;
      if (q < 0 || q > v.m - 1) { flush(lastQ !== null && (q > v.m - 1 ? v.endAt !== undefined : v.startAt !== undefined)); lastQ = null; lastSeg = si; continue; }
      // changement de segment : on ne coupe que s'il y a RUPTURE (saut de source ou demi-tour)
      if (cur && si !== lastSeg) {
        const pg = map.segs[lastSeg];
        const contiguous = pg && Math.abs(pg.sb - sg.sa) < 2 && Math.sign(pg.sb - pg.sa) === Math.sign(sg.sb - sg.sa) && Math.abs(pg.b - sg.a) < 2;
        if (!contiguous) flush(!!pg?.sharpB);
      }
      const slope = (sg.sb - sg.sa) / (sg.b - sg.a) * rt;
      if (!cur) {
        const fwd = slope >= 0;
        cur = { t0: m, f: [], aL: [], aR: [], ipd: [], tph: [], lock: true, ph0: v.pL ? v.pL[Math.max(0, Math.min(v.m - 1, Math.round(q)))] : 0, dir: 1 };
        // naissance sur une attaque : départ à l'échantillon exact où la carte atteint le début de la voix
        if (fwd && v.startAt !== undefined && q < 1.5) {
          const tq = sg.a + (v.startAt - sg.sa) * (sg.b - sg.a) / (sg.sb - sg.sa);
          const st = Math.round(tq / rt + dl);
          if (st <= tau && st > tau - 3 * H) { cur.sharpIn = true; cur.startSample = st; }
        } else if (sg.sharpA && tv - sg.a < H) { cur.sharpIn = true; cur.startSample = Math.round(sg.a / rt + dl); }
        lq = q;
      }
      // horloge de vie : vitesse propre (±1 = naturelle), palindrome à ±W trames de la position ;
      // décalage de vie (S.lifeOffset) : la voix vit un AUTRE moment de sa vie (joueurs d'une section)
      const lr = (S.life?.rate ?? 1) * Math.sign(slope || 1), lo0 = S.lifeOffset || 0;
      if (Math.abs(slope - lr) < 1e-6) lq = lo0 ? fold(q + lo0, v.m - 1) : q;
      else {
        lq += lr * cur.dir;
        const lo = Math.max(0, q - W), hi = Math.min(v.m - 1, q + W);
        if (lq > hi) { lq = hi; cur.dir = -cur.dir; } else if (lq < lo) { lq = lo; cur.dir = -cur.dir; }
      }
      // attaque raide franchie entre la trame précédente et celle-ci (lecture directe) : l'amplitude
      // y SAUTE (le partiel est ré-excité) au lieu de rampe à travers la trame (pré-écho)
      if (lastQ !== null && slope > 0 && cur.f.length && model.sharpBounds) {
        const s0 = (v.j0 + lastQ) * hop;
        for (const b of model.sharpBounds) if (b > s0 && b <= src) { (cur.steps || (cur.steps = [])).push([cur.f.length - 1, Math.round((b - s0) / slope)]); break; }
      }
      const cT = lerp(v.centsTrend, q), cL = lerp(v.cents, lq) - lerp(v.centsTrend, lq);
      const dT = lerp(v.dbTrend, q), dL = lerp(v.db, lq) - lerp(v.dbTrend, lq);
      const jq = v.j0 + q;
      // la vie amplifiée reste une vie : ±600 c et +12 dB au-dessus du geste au plus (vers le bas : libre, le silence reste silence)
      // vie intacte (×1) : la hauteur source exacte (le verrou de phase en dépend) ; vie amplifiée : bornée
      // vie ×k : on AJOUTE (k−1)·vie au son tel qu'il est (borné : ±600 c, +12 dB) — à k = 1 le son exact
      const c = cT + cL + clampv((lifeC - 1) * cL, -600, 600);
      let d = dT + dL + Math.min((lifeD - 1) * dL, 12);
      const c2 = S.cents ? S.cents(v, tau, c, jq, lifeD * dL) : c;
      d = S.db ? S.db(v, tau, d, jq, c, c2) : d;
      // INERTIE du corps (taille, matière) : l'amplitude monte en `att` trames et retombe en `rel`
      // (enveloppe asymétrique, comme dans Ethereal Drift) — un grand corps résonne plus longtemps
      if (S.inertia) { const ir = S.inertia(v); if (cur.dS === undefined) cur.dS = d; else { const k = d > cur.dS ? 1 / Math.max(1, ir.att) : 1 / Math.max(1, ir.rel); cur.dS += (d - cur.dS) * k; } d = Math.max(d, cur.dS); if (d > cur.dS) cur.dS = d; }
      let p = lerp(v.pan, q); if (S.pan) p = S.pan(v, tau, p);
      let g = wv * (S.gate ? S.gate(v, tau) : 1) * (S.gain ?? 1);
      g *= run.gain(tv);
      const a = Math.pow(10, d / 20) * g;
      const fo = Math.max(1, Math.min(0.49 * sr, hzOf(c2)));
      // délai entre voies conservé : la différence de phase suit la fréquence (ipd·f'/f)
      let ip = lerp(v.ipd, q) * fo / hzOf(c); if (S.ipd) ip = S.ipd(v, tau, ip);
      // VERROU DE PHASE : lecture au temps propre (pente 1, trames entières) → la phase suit la phase
      // mesurée, avancée du rapport de fréquence (sauts de battement, micro-structure intacts)
      const qi = Math.round(q);
      // (seulement si la hauteur n'est que DÉCALÉE d'une constante et la vie non touchée : sinon la
      //  phase mesurée n'est plus celle du partiel transformé — mesuré : clic sur miroir + vie ×3,4)
      const dC = c2 - c;
      if (cur.dC === undefined) cur.dC = dC;
      if (cur.lock && v.adv && !S.lifeOffset && lifeC === 1 && lifeD === 1 && Math.abs(dC - cur.dC) < 0.5 && Math.abs(slope - 1) < 1e-9 && Math.abs(q - qi) < 1e-6) {
        const r = fo / hzOf(c);
        if (!cur.tph.length) cur.tph.push(v.pL[qi]);
        else cur.tph.push(cur.tph[cur.tph.length - 1] + v.adv[qi - 1] * (cur._r + r) / 2);
        cur._r = r;
      } else cur.lock = false;
      cur.f.push(fo); cur.aL.push(a * Math.cos(p * Math.PI / 2)); cur.aR.push(a * Math.sin(p * Math.PI / 2)); cur.ipd.push(ip);
      lastSeg = si; lastQ = q;
    }
    flush(false);
  }
  }
  if (globalThis.__parts) globalThis.__parts.push(...parts);
  const [PL, PR] = synthPartials(parts, D, sr);
  // ---------------- résidu = transitoires recopiés + souffle continu ----------------
  if (S.resid && (S.resid.gain ?? 1) > 0) {
    const rs = S.resid, rmap = rs.map || S.map, ratio = rs.ratio ?? 1;
    const Z = model.souffle;
    // transitoires : trames verrouillées sur les attaques (jamais étirées)
    const res = ratio === 1 ? Z.trans : residAt(model, ratio, Z.trans);
    const frames = [];
    for (let m = 0; m * GRAIN_HOP < D + GRAIN_HOP; ++m) {
      const tau = m * GRAIN_HOP, src = rmap.at(tau);
      if (src === null) { frames.push(null); continue; }
      const sg = rmap.segs[rmap.seg(tau)], np = S.noisePan ? S.noisePan(tau) : [1, 1];
      frames.push({ src: src / ratio, rev: sg.sb < sg.sa, gain: (rs.gain ?? 1) * (rs.gate ? rs.gate(tau) : 1) * (S.gain ?? 1) * (S.transGate ? S.transGate(tau) : 1), gL: np[0], gR: np[1] });
    }
    const [TL, TR] = grainMap(res, frames, D, { protect: model.sharpBounds.map(b => b / ratio) });
    const [NL, NR] = renderSouffle(model, S, D);
    // là où la carte lit le souffle À L'IDENTIQUE (pente 1, sens direct) et qu'aucun geste ne le
    // transforme, on prend le souffle d'origine lui-même (exact) ; ailleurs le souffle continu —
    // passage de l'un à l'autre en fondu de 10 ms
    const untouched = !S.noiseDb && !S.noiseShift && !S.noiseGate && !S.noisePan && ratio === 1;
    if (untouched) {
      if (!Z.stat) Z.stat = model.resid.map((x, c) => { const o = new Float64Array(x.length); for (let i = 0; i < x.length; ++i) o[i] = x[i] - Z.trans[c][i]; return o; });
      const [DL, DR] = grainMap(Z.stat, frames, D, { protect: model.sharpBounds });
      const w = new Float64Array(D), X = Math.round(0.01 * model.sr);
      for (let i = 0; i < D; i += 64) { const si = rmap.seg(i); const sg = si >= 0 ? rmap.segs[si] : null; const one = sg && Math.abs((sg.sb - sg.sa) / (sg.b - sg.a) - 1) < 1e-9; for (let k = i; k < Math.min(D, i + 64); ++k) w[k] = one ? 1 : 0; }
      let acc = 0; for (let i = 0; i < D; ++i) { acc += (w[i] - acc) / X; w[i] = acc; }
      for (let i = D - 1, a2 = w[D - 1]; i >= 0; --i) { a2 += (w[i] - a2) / X; w[i] = Math.min(w[i], a2); }
      for (let i = 0; i < D; ++i) { NL[i] = w[i] * DL[i] + (1 - w[i]) * NL[i]; NR[i] = w[i] * DR[i] + (1 - w[i]) * NR[i]; }
    }
    for (let i = 0; i < D; ++i) { PL[i] += TL[i] + NL[i]; PR[i] += TR[i] + NR[i]; }
  }
  return [PL, PR, parts.length];
}

// résidu transposé (rééchantillonné, sinc Kaiser) — mis en cache par rapport
function residAt (model, ratio, sig) {
  const c = model._rcache || (model._rcache = new Map()), k = ratio.toFixed(6);
  if (!c.has(k)) c.set(k, resampleTo(sig || model.resid, Math.round(model.sr * ratio), model.sr));
  return c.get(k);
}

/** enfant = somme de strates, puis niveau ramené à celui du parent (RMS des zones actives), crête ≤ −1 dBFS */
export function renderChild (model, strata, D, opts = {}) {
  const L = new Float64Array(D), R = new Float64Array(D);
  let nParts = 0;
  for (const S of strata) { const [a, b, np] = renderStratum(model, S, D); nParts += np; for (let i = 0; i < D; ++i) { L[i] += a[i]; R[i] += b[i]; } }
  const rms = (X, Y) => { const B = Math.round(0.05 * model.sr), e = []; for (let b = 0; b + B <= X.length; b += B) { let s = 0; for (let i = b; i < b + B; ++i) s += X[i] * X[i] + Y[i] * Y[i]; e.push(s / B / 2); } const mx = Math.max(...e, 1e-20); const act = e.filter(x => x > mx * 1e-3); return Math.sqrt(act.reduce((a, b) => a + b, 0) / (act.length || 1)); };
  const target = rms(model.L, model.R), cur = rms(L, R);
  let pk = 0; for (let i = 0; i < D; ++i) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  const g = opts.noNorm ? 1 : Math.min(cur > 0 ? target / cur : 1, pk > 0 ? 0.891 / pk : 1);
  for (let i = 0; i < D; ++i) { L[i] *= g; R[i] *= g; }
  // fin de l'enfant : fondu de 30 ms (un enfant ne s'arrête jamais sur un échantillon non nul)
  const F = Math.min(D, Math.round(0.03 * model.sr));
  for (let i = 0; i < F; ++i) { const w = 0.5 - 0.5 * Math.cos(Math.PI * i / F); L[D - 1 - i] *= w; R[D - 1 - i] *= w; }
  return { L, R, gainDb: 20 * Math.log10(g), nParts };
}
