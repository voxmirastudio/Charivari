// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — décomposition sinusoïdale de haute précision (la « carte des partiels » du sample)
//
//  • Fréquence : différence de phase entre deux trames décalées d'UN échantillon (méthode de la
//    carte des partiels de jgcompose : exacte pour un partiel stable, indépendante du bin).
//  • Amplitude/phase : noyau analytique de la fenêtre de Hann centrée, au décalage exact.
//  • Fenêtres SYNCHRONES DES ATTAQUES : aucune fenêtre ne franchit une attaque raide ; près
//    d'elle la fenêtre raccourcit (4096 → 1024) ; plus courte, on n'analyse pas (zone de
//    transitoire, laissée au résidu). → pas de pré-écho, attaques nettes.
//  • Un pic est retenu s'il ÉMERGE de son plancher local (25e centile autour de lui) de E dB
//    (règle d'émergence de la carte des partiels), si son bin se désigne lui-même (|δ| ≤ 0,6)
//    et si son lobe est cohérent (les bins voisins désignent la même composante).
//  • Une piste est retenue si sa PHASE est prédictible d'une trame à l'autre (un partiel avance
//    de 2π·f·Δt ; le bruit, non) : erreur moyenne ≤ seuil (bruit ≈ π/2).
//  • Resynthèse McAulay-Quatieri (phase cubique), G et D séparés (image stéréo de chaque partiel),
//    les pistes nées sur une attaque démarrent À l'attaque (extrapolation de phase exacte).
// ============================================================================================
import { fft } from './fft.js';

export const HOP = 256;
const winCache = new Map();
function hannWin (N) { let w = winCache.get(N); if (!w) { w = new Float64Array(N); for (let i = 0; i < N; ++i) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N); winCache.set(N, w); } return w; }

// spectre d'une trame de N centrée en c (phase rapportée au centre)
function frameSpec (x, c, N, re, im) {
  const w = hannWin(N), H = N >> 1;
  for (let i = 0; i < N; ++i) {
    const s = c - H + i;
    re[(i + H) & (N - 1)] = (s >= 0 && s < x.length) ? x[s] * w[i] : 0; im[(i + H) & (N - 1)] = 0;
  }
  fft(re, im);
}
function hannKernel (d) {
  const ad = Math.abs(d);
  if (ad < 1e-9) return 1;
  if (Math.abs(ad - 1) < 1e-9) return 0.5;
  return (Math.sin(Math.PI * d) / (Math.PI * d)) / (1 - d * d);
}
export const wrap = p => p - 2 * Math.PI * Math.floor((p + Math.PI) / (2 * Math.PI));

// PLANCHER DE BRUIT du son d'origine : 25e centile dans des bandes de ±max(240 Hz, 16 % de f)
// centrées sur une grille (pas = ½ largeur), interpolé par bin. Sert à l'émergence des pics.
function floorCurve (mag, half, bin) {
  const g = [], v = [];
  let f = 0;
  const tmp = [];
  while (f < half * bin) {
    const w = Math.max(240, 0.16 * f), k0 = Math.max(1, Math.round((f - w) / bin)), k1 = Math.min(half - 1, Math.round((f + w) / bin));
    tmp.length = 0; for (let k = k0; k <= k1; ++k) tmp.push(mag[k]);
    tmp.sort((a, b) => a - b);
    g.push(f / bin); v.push(tmp.length ? tmp[Math.floor(tmp.length * 0.25)] : 0);
    f += 0.5 * w;
  }
  const out = new Float64Array(half + 1);
  let q = 0;
  for (let k = 0; k <= half; ++k) {
    while (q + 1 < g.length - 1 && g[q + 1] < k) q += 1;
    const a = g[q], b = g[Math.min(q + 1, g.length - 1)], u = b > a ? Math.max(0, Math.min(1, (k - a) / (b - a))) : 0;
    out[k] = v[q] * (1 - u) + v[Math.min(q + 1, v.length - 1)] * u;
  }
  return out;
}

// jeu de spectres d'une trame (mono c et c+1, gauche, droite), calculés à la demande
function makeSpec (N) {
  const o = { N, half: N >> 1, r0: new Float64Array(N), i0: new Float64Array(N), r1: new Float64Array(N), i1: new Float64Array(N),
    rl: new Float64Array(N), il: new Float64Array(N), rr: new Float64Array(N), ir: new Float64Array(N),
    mag: new Float64Array((N >> 1) + 1), ifr: new Float64Array((N >> 1) + 1), cM: -1, cLR: -1 };
  return o;
}
function specM (o, M, c, sr) {
  if (o.cM === c) return;
  frameSpec(M, c, o.N, o.r0, o.i0); frameSpec(M, c + 1, o.N, o.r1, o.i1);
  const { r0, i0, r1, i1, mag, ifr } = o;
  for (let k = 1; k < o.half; ++k) {
    mag[k] = Math.hypot(r0[k], i0[k]);
    const dp = Math.atan2(i1[k] * r0[k] - r1[k] * i0[k], r1[k] * r0[k] + i1[k] * i0[k]);
    ifr[k] = (dp >= 0 ? dp : dp + 2 * Math.PI) * sr / (2 * Math.PI);
  }
  o.cM = c;
}
function specLR (o, L, R, c) { if (o.cLR === c) return; frameSpec(L, c, o.N, o.rl, o.il); frameSpec(R, c, o.N, o.rr, o.ir); o.cLR = c; }
function peakParams (o, k, f, sr) {
  const d = f / (sr / o.N) - k, g = hannKernel(d) * (o.N / 4);
  return { f, a: o.mag[k] / g, aL: Math.hypot(o.rl[k], o.il[k]) / g, aR: Math.hypot(o.rr[k], o.ir[k]) / g,
    pL: Math.atan2(o.il[k], o.rl[k]), pR: Math.atan2(o.ir[k], o.rr[k]), pM: Math.atan2(o.i0[k], o.r0[k]), N: o.N };
}

/**
 * @param bounds  échantillons des attaques raides (triés) ; 0 et n sont ajoutés
 * MULTI-RÉSOLUTION : les pics sont trouvés sur la fenêtre la plus longue permise (meilleure
 * séparation), puis MESURÉS sur la fenêtre la plus courte qui sépare encore le pic de ses voisins
 * (écart ≥ 8 bins : fuite des lobes de Hann < −47 dB) : un partiel aigu sous vibrato est suivi à 10–20 ms au lieu de 85 ms.
 * @returns { frames: [{ N, c, b0, b1, peaks:[{f,a,aL,aR,pL,pR,pM,emerg,N}] } | null] }  null = zone de transitoire
 */
export function analyzePeaks (L, R, sr, opts = {}) {
  const Nmax = opts.Nmax ?? 4096, Nmin = opts.Nmin ?? 1024, Nres = opts.Nres ?? 512, E = opts.emergeDb ?? 6;
  const floorDb = opts.floorDb ?? -100, relDb = opts.relDb ?? -80, hop = opts.hop ?? HOP, multi = opts.multi ?? true;
  const n = L.length, nfr = Math.floor((n - 1) / hop) + 1;
  const M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  const B = [0, ...(opts.bounds || []).filter(b => b > 0 && b < n), n].sort((a, b) => a - b);
  const S = new Map(); const spec = N => { let o = S.get(N); if (!o) S.set(N, o = makeSpec(N)); return o; };
  const frames = [];
  let bi = 0;
  const lm = [], tmp = [];
  for (let j = 0; j < nfr; ++j) {
    const c = j * hop;
    while (bi + 1 < B.length && B[bi + 1] <= c) bi += 1;
    const b0 = B[bi], b1 = B[Math.min(bi + 1, B.length - 1)];
    const room = Math.min(c - b0, b1 - c - 1);
    let N = Nmax; while (N > 2 * room && N > 16) N >>= 1;
    if (N < Nmin) { frames.push(null); continue; }
    const o = spec(N); specM(o, M, c, sr);
    const { mag, ifr } = o, HALF = o.half, bin = sr / N;
    let mx = 0; for (let k = 1; k < HALF; ++k) if (mag[k] > mx) mx = mag[k];
    const flc = opts.keepFloor ? floorCurve(mag, HALF, bin) : null;
    const ref = opts.ref ? opts.ref.frames : null;
    // un reste ne se mesure pas contre lui-même : seuil relatif au maximum du son d'origine
    if (ref && ref[j]) mx = Math.max(mx, ref[j].mx);
    const peaks = [];
    if (mx > 0) {
      const thr = Math.max(mx * Math.pow(10, relDb / 20), (N / 4) * Math.pow(10, floorDb / 20));
      lm.length = 0;
      for (let k = 2; k < HALF - 1; ++k) if (mag[k] > mag[k - 1] && mag[k] >= mag[k + 1] && mag[k] > thr * 0.03) lm.push(k);
      for (let li = 0; li < lm.length; ++li) {
        const k = lm[li];
        if (k < 3 || k > HALF - 4 || mag[k] <= thr) continue;
        const f = ifr[k], d = f / bin - k;
        if (Math.abs(d) > 0.6) continue;
        if (Math.abs(ifr[k - 1] - f) > 1.2 * bin || Math.abs(ifr[k + 1] - f) > 1.2 * bin) continue;
        // plancher : le sien, et celui du SON D'ORIGINE si on analyse un reste (un reste troué par
        // les partiels retirés aurait un plancher faux, et son bruit « émergerait »)
        const Bb = Math.max(6, Math.round(Math.max(120, 0.08 * f) / bin));
        tmp.length = 0;
        for (let q = Math.max(1, k - Bb); q <= Math.min(HALF - 1, k + Bb); ++q) if (Math.abs(q - k) > 2) tmp.push(mag[q]);
        tmp.sort((a, b) => a - b);
        const fl = Math.max(tmp.length ? tmp[Math.floor(tmp.length * 0.25)] : 0, ref && ref[j] ? ref[j].floor[k] : 0);
        if (mag[k] < fl * Math.pow(10, E / 20)) continue;
        const emerg = 20 * Math.log10(mag[k] / (fl + 1e-30));
        // écart au voisin significatif (à −30 dB du pic au plus)
        let sp = 1e9;
        for (let q = li - 1; q >= 0; --q) { if (mag[lm[q]] >= mag[k] * 0.0316) { sp = Math.min(sp, (k - lm[q]) * bin); break; } if ((k - lm[q]) * bin > sp) break; }
        for (let q = li + 1; q < lm.length; ++q) { if (mag[lm[q]] >= mag[k] * 0.0316) { sp = Math.min(sp, (lm[q] - k) * bin); break; } }
        let pk = null;
        if (multi) {
          let Nr = Nres; while (Nr < N && sr / Nr * 8 > sp) Nr <<= 1;
          if (Nr < N) {
            const q = spec(Nr); specM(q, M, c, sr);
            const bq = sr / Nr, kc = Math.round(f / bq);
            let kk = kc; for (const t of [kc - 1, kc + 1]) if (t > 1 && t < q.half - 1 && q.mag[t] > q.mag[kk]) kk = t;
            if (kk > 1 && kk < q.half - 1 && q.mag[kk] >= q.mag[kk - 1] && q.mag[kk] >= q.mag[kk + 1]) {
              const f2 = q.ifr[kk], d2 = f2 / bq - kk;
              if (Math.abs(d2) <= 0.6 && Math.abs(f2 - f) <= 0.5 * bq) { specLR(q, L, R, c); pk = peakParams(q, kk, f2, sr); }
            }
          }
        }
        if (!pk) { specLR(o, L, R, c); pk = peakParams(o, k, f, sr); }
        pk.emerg = emerg;
        peaks.push(pk);
      }
    }
    frames.push({ N, c, b0, b1, peaks, mx, floor: opts.keepFloor ? flc : null });
  }
  return { frames, sr, n, hop, bounds: B };
}

// erreur moyenne de prédiction de phase sur `lag` trames contiguës (voie la plus forte)
function phaseErr (t, lag, hop, sr) {
  let es = 0, ne = 0;
  for (let q = 0; q + lag < t.j.length; ++q) {
    if (t.j[q + lag] - t.j[q] !== lag) continue;
    if (t.fr && (t.fr[q] || t.fr[q + lag])) continue;
    let adv = 0; for (let r = q; r < q + lag; ++r) adv += Math.PI * (t.f[r] + t.f[r + 1]) * hop / sr;
    const P = t.aL[q] >= t.aR[q] ? t.pL : t.pR;
    es += Math.abs(wrap(P[q + lag] - P[q] - adv)); ne += 1;
  }
  return ne ? es / ne : 9;
}

/**
 * Suivi des partiels. Une piste : { j:Int32Array (trames), f, aL, aR, pL, pR, pM, startAt?, endAt?, perr }
 * Les zones de transitoire (trames null) ne comptent pas comme absences : une piste qui continue
 * sous une attaque est reliée par-dessus (la phase cubique la traverse).
 */
export function trackPartials (an, opts = {}) {
  const maxCents = opts.maxCents ?? 50, maxHz = opts.maxHz ?? 6, minLen = opts.minLen ?? 6;
  const maxPerr = opts.maxPerr ?? 1.0, gapMiss = opts.gap ?? 6, minEmerg = opts.minEmerg ?? 15;
  const { frames, hop, sr } = an;
  const done = [], active = [];
  for (let j = 0; j < frames.length; ++j) {
    const fr = frames[j];
    if (!fr) continue;                                          // zone de transitoire : on attend
    const pk = fr.peaks.slice().sort((a, b) => b.a - a.a);
    const used = new Uint8Array(pk.length);
    const next = [];
    active.sort((a, b) => b.aLast - a.aLast);
    for (const t of active) {
      const nj = t.j[t.j.length - 1];
      // une piste interrompue par une attaque raide ne se relie que si la zone est franchie d'un saut
      const fp = t.fPred;
      let best = -1, bd = 1e9;
      for (let q = 0; q < pk.length; ++q) {
        if (used[q]) continue;
        const dHz = Math.abs(pk[q].f - fp), dc = Math.abs(1200 * Math.log2(pk[q].f / fp));
        if (dc > maxCents && dHz > maxHz) continue;
        if (t.miss > 0 && dc > 30) continue;                          // après une absence : raccord serré
        const ddb = Math.abs(20 * Math.log10((pk[q].a + 1e-12) / (t.aLast + 1e-12)));
        // un saut de niveau n'est pas le même partiel : +20 dB d'une trame à l'autre, c'en est un
        // autre qui naît ; après une attaque raide (zone franchie) ou une absence, 12 dB au plus
        const crossed = t.j[t.j.length - 1] < j - 1 - t.miss;
        if (ddb > ((crossed || t.miss > 0) ? 12 : 20)) continue;
        const cost = dc + 2 * ddb;
        if (cost < bd) { bd = cost; best = q; }
      }
      if (best >= 0) {
        used[best] = 1; const p = pk[best];
        t.j.push(j); t.f.push(p.f); t.aL.push(p.aL); t.aR.push(p.aR); t.pL.push(p.pL); t.pR.push(p.pR); t.pM.push(p.pM); t.em.push(p.emerg); t.fr.push(0);
        const m = t.f.length;
        const slope = m >= 2 ? (t.f[m - 1] - t.f[m - 2]) / (t.j[m - 1] - t.j[m - 2]) : 0;
        t.fPred = p.f + slope; t.aLast = p.a; t.miss = 0;
        next.push(t);
      } else if (t.miss < gapMiss) { t.miss += 1; t.fPred = t.f[t.f.length - 1]; next.push(t); }
      else done.push(t);
      void nj;
    }
    for (let q = 0; q < pk.length; ++q) {
      if (used[q]) continue;
      const p = pk[q];
      next.push({ j: [j], f: [p.f], aL: [p.aL], aR: [p.aR], pL: [p.pL], pR: [p.pR], pM: [p.pM], em: [p.emerg], fr: [0], fPred: p.f, aLast: p.a, miss: 0 });
    }
    active.length = 0; active.push(...next);
  }
  done.push(...active);
  const joined = opts.join === false ? done : joinFragments(done, frames, opts);
  const out = [];
  for (const t of joined) {
    const m = t.f.length;
    if (m < minLen) continue;
    // cohérence de phase sur un demi-fenêtrage (8 hops = 2048 échantillons) : un partiel avance de
    // ∫2πf dt, le bruit non (mesuré : bruit blanc 1,0–2,0 rad, partiels < 0,6 rad)
    const perr = phaseErr(t, m >= 9 ? 8 : 4, hop, sr);
    let emerg = 0, nm = 0; for (let q = 0; q < m; ++q) if (!t.fr[q]) { emerg += t.em[q]; nm += 1; } emerg /= Math.max(1, nm);
    // règle mesurée (bruit blanc : émergence moyenne < 12 dB dans 99 % des pistes)
    const ok = m >= 9 ? ((emerg >= minEmerg && perr <= maxPerr) || (emerg >= minEmerg + 9 && perr <= maxPerr + 0.5))
                      : (emerg >= minEmerg + 3 && perr <= 0.6);
    if (!ok) continue;
    const tr = { j: Int32Array.from(t.j), f: Float64Array.from(t.f), aL: Float64Array.from(t.aL), aR: Float64Array.from(t.aR),
      pL: Float64Array.from(t.pL), pR: Float64Array.from(t.pR), perr, emerg };
    if (t.fr.some(v => v)) tr.free = Uint8Array.from(t.fr);
    // née juste après une attaque raide (trames précédentes = zone de transitoire) → commence À l'attaque
    const j0 = t.j[0], fr0 = frames[j0];
    if (fr0 && fr0.b0 > 0 && (j0 === 0 || frames[j0 - 1] === null)) tr.startAt = fr0.b0;
    const j1 = t.j[m - 1], fr1 = frames[j1];
    if (fr1 && fr1.b1 < an.n && (j1 + 1 >= frames.length || frames[j1 + 1] === null)) tr.endAt = fr1.b1;
    out.push(tr);
  }
  return out;
}

/**
 * RACCORD DES FRAGMENTS. Un partiel sous vibrato profond se perd aux extrêmes de l'oscillation
 * (la fenêtre étale le lobe) et se retrouve ensuite : deux fragments du même partiel.
 * • Guide harmonique : si un partiel long et fort (le guide) traverse le trou, et que le RAPPORT
 *   de fréquence au guide est le même des deux côtés (à 20 c), les fragments sont le même partiel
 *   modulé comme le guide ; le trou suit le guide (f = r(t)·f_guide(t)), vibrato compris.
 * • Sans guide : raccord si la fréquence prolongée tombe à (40 + 6·trou) cents.
 * Les trames du trou sont « libres » (phase intégrée, pas mesurée) ; le verrouillage de phase
 * du raffinement hétérodyne les recale ensuite sur le son.
 */
function joinFragments (raw, frames, opts = {}) {
  const G = opts.joinGap ?? 20;
  const frag = raw.filter(t => t.f.length >= 2);
  const guides = frag.filter(t => t.f.length >= 40).map(t => {
    let em = 0; for (const e of t.em) em += e; em /= t.em.length;
    return { t, em, j0: t.j[0], j1: t.j[t.j.length - 1] };
  }).filter(g => g.em >= 20).sort((a, b) => b.em - a.em).slice(0, 60);
  for (const g of guides) { g.fAt = new Float64Array(g.j1 - g.j0 + 1).fill(NaN); for (let q = 0; q < g.t.j.length; ++q) g.fAt[g.t.j[q] - g.j0] = g.t.f[q]; }
  const fG = (g, j) => { if (j < g.j0 || j > g.j1) return NaN; return g.fAt[j - g.j0]; };
  const byStart = new Map(); for (const t of frag) { const k = t.j[0]; let l = byStart.get(k); if (!l) byStart.set(k, l = []); l.push(t); }
  const pairs = [];
  for (const A of frag) {
    const ja = A.j[A.j.length - 1], fa = A.f[A.f.length - 1], aa = Math.hypot(A.aL[A.aL.length - 1], A.aR[A.aR.length - 1]);
    const m = A.f.length, sl = m >= 3 ? (A.f[m - 1] - A.f[m - 3]) / Math.max(1, A.j[m - 1] - A.j[m - 3]) : 0;
    for (let jb = ja + 2; jb <= ja + G; ++jb) {
      for (const B of byStart.get(jb) || []) {
        if (B === A) continue;
        const fb = B.f[0], ab = Math.hypot(B.aL[0], B.aR[0]);
        if (Math.abs(20 * Math.log10((ab + 1e-12) / (aa + 1e-12))) > 20) continue;
        const gap = jb - ja;
        let best = null, bc = 1e9;
        for (const g of guides) {
          if (g.t === A || g.t === B) continue;
          const ga = fG(g, ja), gb = fG(g, jb);
          if (!(ga > 0 && gb > 0)) continue;
          const rA = fa / ga, rB = fb / gb, c = Math.abs(1200 * Math.log2(rA / rB));
          if (c <= 20 && c < bc) { bc = c; best = { g, rA, rB }; }
        }
        let cost;
        if (best) cost = bc + 0.5 * gap;
        else {
          const pred = Math.max(fa * 0.89, Math.min(fa * 1.12, fa + sl * gap));
          const c = Math.abs(1200 * Math.log2(fb / pred));
          if (c > 40 + 6 * gap) continue;
          cost = c + 2 * gap + 30;
        }
        pairs.push({ cost, A, B, guide: best });
      }
    }
  }
  pairs.sort((a, b) => a.cost - b.cost);
  for (const p of pairs) {
    if (p.A.next || p.B.prev) continue;
    // pas de cycle : B ne doit pas déjà précéder A dans une chaîne
    let h = p.A; while (h.prev) h = h.prev.A; if (h === p.B) continue;
    p.A.next = p; p.B.prev = p;
  }
  const out = [];
  for (const t of raw) {
    if (t.prev) continue;
    if (!t.next) { out.push(t); continue; }
    const c = { j: [...t.j], f: [...t.f], aL: [...t.aL], aR: [...t.aR], pL: [...t.pL], pR: [...t.pR], pM: [...t.pM], em: [...t.em], fr: [...t.fr] };
    let cur = t;
    while (cur.next) {
      const { B, guide } = cur.next, ja = c.j[c.j.length - 1], jb = B.j[0];
      const fa = c.f[c.f.length - 1], fb = B.f[0];
      const aLa = c.aL[c.aL.length - 1], aRa = c.aR[c.aR.length - 1];
      for (let j = ja + 1; j < jb; ++j) {
        if (!frames[j]) continue;                                   // zone de transitoire : pas de point
        const u = (j - ja) / (jb - ja);
        let f = fa * Math.pow(fb / fa, u);
        if (guide) { const g = fG(guide.g, j); if (g > 0) f = g * (guide.rA + (guide.rB - guide.rA) * u); }
        const iL = Math.exp(Math.log(aLa + 1e-12) * (1 - u) + Math.log(B.aL[0] + 1e-12) * u);
        const iR = Math.exp(Math.log(aRa + 1e-12) * (1 - u) + Math.log(B.aR[0] + 1e-12) * u);
        c.j.push(j); c.f.push(f); c.aL.push(iL); c.aR.push(iR); c.pL.push(0); c.pR.push(0); c.pM.push(0); c.em.push(0); c.fr.push(1);
      }
      for (let q = 0; q < B.j.length; ++q) { c.j.push(B.j[q]); c.f.push(B.f[q]); c.aL.push(B.aL[q]); c.aR.push(B.aR[q]); c.pL.push(B.pL[q]); c.pR.push(B.pR[q]); c.pM.push(B.pM[q]); c.em.push(B.em[q]); c.fr.push(B.fr[q]); }
      cur = B;
    }
    out.push(c);
  }
  return out;
}

/**
 * Resynthèse McAulay-Quatieri. opts.freePhase : phases intégrées (pour pistes transformées).
 * Fondus d'extrémité : 1 hop (naissance/mort naturelle), 0,5 ms sur une attaque (startAt/endAt).
 */
function boundIn (B, a, b) {           // recherche dichotomique d'une attaque dans ]a, b[
  let lo = 0, hi = B.length;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (B[mid] <= a) lo = mid + 1; else hi = mid; }
  return lo < B.length && B[lo] < b ? B[lo] : -1;
}

export function resynth (tracks, n, hop, sr, opts = {}) {
  const L = new Float64Array(n), R = new Float64Array(n), bounds = opts.bounds || null;
  const w2s = 2 * Math.PI / sr, fadeA = Math.max(8, Math.round(0.0005 * sr));
  for (const t of tracks) {
    const m = t.f.length;
    for (let side = 0; side < 2; ++side) {
      const A = side ? t.aR : t.aL, P = side ? t.pR : t.pL, out = side ? R : L;
      const free = !!opts.freePhase || !P;
      const th = new Float64Array(m);
      th[0] = P && !opts.freePhase ? P[0] : (t.ph0 ?? 0);
      // début
      {
        const c1 = t.j[0] * hop, w = t.f[0] * w2s;
        if (t.startAt !== undefined) {
          // extrapolation vers l'attaque : phase exacte, amplitude log-linéaire (pente des 2 premières trames), bornée
          const s0 = t.startAt, D = c1 - s0;
          let r = 1;
          if (m >= 2 && A[1] > 0 && A[0] > 0) { const sl = Math.log(A[0] / A[1]) / ((t.j[1] - t.j[0]) * hop); r = Math.exp(sl * D); }
          r = Math.min(2, Math.max(0.25, r));
          for (let s = Math.max(0, s0); s < Math.min(n, c1); ++s) {
            const u = (s - s0) / D, a = A[0] * Math.pow(r, 1 - u);
            const g = s - s0 < fadeA ? 0.5 - 0.5 * Math.cos(Math.PI * (s - s0) / fadeA) : 1;
            out[s] += g * a * Math.cos(th[0] - w * (c1 - s));
          }
        } else {
          const c0 = c1 - hop;
          for (let s = Math.max(0, c0); s < Math.min(n, c1); ++s) out[s] += A[0] * ((s - c0) / hop) * Math.cos(th[0] - w * (c1 - s));
        }
      }
      for (let q = 0; q + 1 < m; ++q) {
        const c0 = t.j[q] * hop, T = (t.j[q + 1] - t.j[q]) * hop;
        const w0 = t.f[q] * w2s, w1 = t.f[q + 1] * w2s;
        const a0 = A[q], a1 = A[q + 1];
        let th1;
        if (!free && !(t.free && t.free[q + 1])) { const pred = th[q] + (w0 + w1) * T / 2; th1 = P[q + 1] + 2 * Math.PI * Math.round((pred - P[q + 1]) / (2 * Math.PI)); }
        else th1 = th[q] + (w0 + w1) * T / 2;
        th[q + 1] = th1;
        const e = th1 - th[q] - w0 * T, dw = w1 - w0;
        const al = 3 * e / (T * T) - dw / T, be = -2 * e / (T * T * T) + dw / (T * T);
        const s1 = Math.min(n, c0 + T);
        // lien qui franchit une attaque raide : l'amplitude ne rampe pas à travers (pré-écho) ;
        // elle tient a0 jusqu'à l'attaque puis passe à a1 en 0,5 ms (la phase, elle, reste continue)
        const bx = bounds ? boundIn(bounds, c0, c0 + T) : -1;
        for (let s = Math.max(0, c0); s < s1; ++s) {
          const tt = s - c0;
          let a;
          if (bx < 0) a = a0 + (a1 - a0) * tt / T;
          else { const u = (s - bx) / fadeA; a = u <= -0.5 ? a0 : u >= 0.5 ? a1 : a0 + (a1 - a0) * (0.5 + 0.5 * Math.sin(Math.PI * u)); }
          out[s] += a * Math.cos(th[q] + tt * (w0 + tt * (al + tt * be)));
        }
      }
      // fin
      {
        const c0 = t.j[m - 1] * hop, w = t.f[m - 1] * w2s, a = A[m - 1], ph = th[m - 1];
        if (t.endAt !== undefined) {
          const e1 = t.endAt;
          for (let s = Math.max(0, c0); s < Math.min(n, e1); ++s) {
            const g = e1 - s < fadeA ? 0.5 - 0.5 * Math.cos(Math.PI * (e1 - s) / fadeA) : 1;
            out[s] += g * a * Math.cos(ph + w * (s - c0));
          }
        } else {
          for (let s = Math.max(0, c0); s < Math.min(n, c0 + hop); ++s) out[s] += a * (1 - (s - c0) / hop) * Math.cos(ph + w * (s - c0));
        }
      }
    }
  }
  return [L, R];
}
