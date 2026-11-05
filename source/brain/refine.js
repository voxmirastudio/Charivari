// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — raffinement hétérodyne des partiels (l'enveloppe complexe EXACTE de chaque partiel)
//
//  La fenêtre d'analyse (85 ms) moyenne ce qui bouge : vibrato, trémolo, attaques. Une fois la
//  trajectoire grossière θ(t) d'un partiel connue, on démodule le son par elle :
//        z(t) = x(t)·e^{−iθ(t)}   →   passe-bas à phase nulle (Butterworth 4, aller-retour)
//  ce qui reste, b(t), EST l'écart du partiel à sa trajectoire (amplitude et phase, échantillon
//  par échantillon, jusqu'à la bande fc). Le partiel exact vaut 2·Re(b·e^{iθ}).
//  • fc = écart au voisin / 3 (borné 12–80 Hz) : le voisin ne passe jamais dans la bande.
//  • Extraction successive, du plus fort au plus faible : chaque partiel est retiré du signal de
//    travail avant d'estimer le suivant (un fort ne biaise plus ses voisins faibles).
//  • Le filtre redémarre à chaque attaque raide (aucun étalement à travers une attaque).
//  • Ces micro-fluctuations mesurées (vibrato, trémolo, battements, dérives) sont la matière
//    vivante des mutations : ce sont les micro-rythmes propres du son.
// ============================================================================================
import { wrap } from './sines.js';

// Butterworth passe-bas d'ordre 4 (deux biquads), transformée bilinéaire avec pré-distorsion
function butter4 (fc, sr) {
  const K = Math.tan(Math.PI * fc / sr), out = [];
  for (const q of [0.5411961001461969, 1.3065629648763766]) {       // 1/(2 cos(π/8)), 1/(2 cos(3π/8))
    const n = 1 / (1 + K / q + K * K);
    out.push({ b0: K * K * n, b1: 2 * K * K * n, b2: K * K * n, a1: 2 * (K * K - 1) * n, a2: (1 - K / q + K * K) * n });
  }
  return out;
}
function biquadRun (x, c) {
  let z1 = 0, z2 = 0;
  // état initial = régime permanent pour la première valeur (pas de transitoire de démarrage)
  const g = (c.b0 + c.b1 + c.b2) / (1 + c.a1 + c.a2), x0 = x[0], y0 = g * x0;
  z1 = y0 - c.b0 * x0; z2 = c.b2 * x0 - c.a2 * y0;
  for (let i = 0; i < x.length; ++i) {
    const v = x[i], y = c.b0 * v + z1;
    z1 = c.b1 * v - c.a1 * y + z2; z2 = c.b2 * v - c.a2 * y; x[i] = y;
  }
}
// filtrage aller-retour (phase nulle) avec prolongement MIROIR aux bords : le signal démodulé
// oscille (image à −2f, autres partiels) ; un prolongement impair (2·x0 − x) y injecterait un
// échelon de 2·x0 que le passe-bas garderait (erreur mesurée : +3 dB d'énergie fantôme)
function filtfilt (x, sos, pad) {
  const n = x.length, P = Math.min(pad, n - 1);
  const e = new Float64Array(n + 2 * P);
  for (let i = 0; i < P; ++i) e[i] = x[P - i];
  e.set(x, P);
  for (let i = 0; i < P; ++i) e[P + n + i] = x[n - 2 - i];
  for (const c of sos) biquadRun(e, c);
  e.reverse();
  for (const c of sos) biquadRun(e, c);
  e.reverse();
  return e.subarray(P, P + n);
}

// trajectoire de phase θ(s) (rad) et pulsation ω(s) (rad/éch) d'une piste grossière sur [S0,S1)
function coarsePhase (t, S0, S1, hop, sr, ref) {
  const n = S1 - S0, th = new Float64Array(n), om = new Float64Array(n), P = ref ? t.pR : t.pL;
  const m = t.f.length, w2s = 2 * Math.PI / sr;
  const tq = new Float64Array(m); tq[0] = P[0];
  const c0 = t.j[0] * hop, cE = t.j[m - 1] * hop;
  for (let s = S0; s < Math.min(S1, c0); ++s) { th[s - S0] = P[0] - t.f[0] * w2s * (c0 - s); om[s - S0] = t.f[0] * w2s; }
  for (let q = 0; q + 1 < m; ++q) {
    const a = t.j[q] * hop, T = (t.j[q + 1] - t.j[q]) * hop, w0 = t.f[q] * w2s, w1 = t.f[q + 1] * w2s;
    const pred = tq[q] + (w0 + w1) * T / 2;
    tq[q + 1] = t.free && t.free[q + 1] ? pred : P[q + 1] + 2 * Math.PI * Math.round((pred - P[q + 1]) / (2 * Math.PI));
    const e = tq[q + 1] - tq[q] - w0 * T, dw = w1 - w0;
    const al = 3 * e / (T * T) - dw / T, be = -2 * e / (T * T * T) + dw / (T * T);
    for (let s = Math.max(S0, a); s < Math.min(S1, a + T); ++s) {
      const u = s - a; th[s - S0] = tq[q] + u * (w0 + u * (al + u * be)); om[s - S0] = w0 + u * (2 * al + 3 * u * be);
    }
  }
  for (let s = Math.max(S0, cE); s < S1; ++s) { th[s - S0] = tq[m - 1] + t.f[m - 1] * w2s * (s - cE); om[s - S0] = t.f[m - 1] * w2s; }
  return { th, om };
}

/**
 * @param tracks  pistes grossières (sines.trackPartials), hop d'analyse `hop`
 * @returns { tracks: pistes raffinées au pas hop2, order }  (les pistes gardent startAt/endAt)
 */
export function refineTracks (tracks, L, R, sr, bounds, opts = {}) {
  const hop = opts.hop ?? 256, hop2 = opts.hop2 ?? 128, n = L.length;
  const fcMin = opts.fcMin ?? 12, fcMax = opts.fcMax ?? 80, margin = opts.margin ?? 256;
  const WL = opts.inPlace ? L : Float64Array.from(L), WR = opts.inPlace ? R : Float64Array.from(R);
  // présence par trame d'analyse → écart au voisin
  const byFrame = new Map();
  tracks.forEach((t, i) => { for (let q = 0; q < t.j.length; ++q) { let l = byFrame.get(t.j[q]); if (!l) byFrame.set(t.j[q], l = []); l.push([t.f[q], i]); } });
  // partiels déjà extraits (passes précédentes, au pas `oh`) : ils comptent comme voisins
  for (const o of opts.others || []) {
    const r = hop / (opts.otherHop ?? hop);
    for (let q = 0; q < o.j.length; ++q) { if (o.j[q] % r) continue; const jj = o.j[q] / r; let l = byFrame.get(jj); if (!l) byFrame.set(jj, l = []); l.push([o.f[q], -1]); }
  }
  const info = tracks.map((t, i) => {
    const sp = [];
    for (let q = 0; q < t.j.length; ++q) { let d = 1e9; for (const [f, k] of byFrame.get(t.j[q])) if (k !== i) d = Math.min(d, Math.abs(f - t.f[q])); sp.push(d); }
    sp.sort((a, b) => a - b);
    let en = 0; for (let q = 0; q < t.j.length; ++q) en += t.aL[q] ** 2 + t.aR[q] ** 2;
    return { i, spacing: sp[Math.floor(sp.length * 0.1)], en };
  });
  info.sort((a, b) => b.en - a.en);
  const out = [];
  for (const { i, spacing } of info) {
    const t = tracks[i], m = t.j.length;
    const fc = Math.max(fcMin, Math.min(fcMax, (t.spacing ?? spacing) / 3));
    const sos = butter4(fc, sr), pad = Math.round(3 * sr / fc);
    const S0 = Math.max(0, t.startAt ?? (t.j[0] * hop - hop - margin));
    const S1 = Math.min(n, t.endAt ?? (t.j[m - 1] * hop + hop + margin));
    if (S1 - S0 < 64) continue;
    let mL = 0, mR = 0; for (let q = 0; q < m; ++q) { mL += t.aL[q]; mR += t.aR[q]; }
    const ref = mR > mL ? 1 : 0;
    const { th, om } = coarsePhase(t, S0, S1, hop, sr, ref);
    const N = S1 - S0, co = new Float64Array(N), si = new Float64Array(N);
    const trig = () => { for (let s = 0; s < N; ++s) { co[s] = Math.cos(th[s]); si[s] = Math.sin(th[s]); } };
    trig();
    // segments entre attaques raides
    const cuts = [S0, ...bounds.filter(b => b > S0 && b < S1), S1];
    const bre = [new Float64Array(N), new Float64Array(N)], bim = [new Float64Array(N), new Float64Array(N)];
    const demod = () => {
      for (let side = 0; side < 2; ++side) {
        const W = side ? WR : WL;
        for (let g = 0; g + 1 < cuts.length; ++g) {
          const u = cuts[g], v = cuts[g + 1], len = v - u;
          if (len < 4) continue;
          const zr = new Float64Array(len), zi = new Float64Array(len);
          for (let s = 0; s < len; ++s) { const x = W[u + s], k = u - S0 + s; zr[s] = x * co[k]; zi[s] = -x * si[k]; }
          bre[side].set(filtfilt(zr, sos, pad), u - S0); bim[side].set(filtfilt(zi, sos, pad), u - S0);
        }
      }
    };
    // VERROUILLAGE DE PHASE : la phase de b est l'écart de la trajectoire au partiel ; on l'ajoute à θ
    // et on recommence. À chaque tour le reste de modulation rétrécit : un vibrato profond, qui
    // débordait de la bande fc, finit entièrement dans la trajectoire (mesuré : ±50 c).
    const iters = opts.iters ?? 3;
    for (let it = 0; it < iters; ++it) {
      demod();
      if (it === iters - 1) break;
      const rr0 = bre[ref], ri0 = bim[ref];
      let bm = 0; for (let k = 0; k < N; ++k) bm = Math.max(bm, rr0[k] * rr0[k] + ri0[k] * ri0[k]);
      const thr = bm * 0.0025;                                      // |b| < 5 % du max : phase non fiable, gelée
      const cutSet = new Set(cuts.map(c => c - S0));
      let acc = 0, prev = Math.atan2(ri0[0], rr0[0]);
      const dphi = new Float64Array(N);
      for (let k = 1; k < N; ++k) {
        const ph = Math.atan2(ri0[k], rr0[k]);
        if (!cutSet.has(k) && rr0[k] * rr0[k] + ri0[k] * ri0[k] > thr && rr0[k - 1] * rr0[k - 1] + ri0[k - 1] * ri0[k - 1] > thr) acc += wrap(ph - prev);
        prev = ph; dphi[k] = acc;
      }
      for (let k = 0; k < N; ++k) th[k] += dphi[k];
      for (let k = 0; k < N; ++k) { const k0 = Math.max(0, k - 8), k1 = Math.min(N - 1, k + 8); om[k] += (dphi[k1] - dphi[k0]) / Math.max(1, k1 - k0); }
      trig();
    }
    // PORTE D'ÉMERGENCE (pistes harmoniques) : le bruit est mesuré à mi-chemin des harmoniques
    // voisins, par la même démodulation ; le partiel n'est gardé que là où il dépasse ce bruit
    // (0 sous +3 dB, 1 au-dessus de +9 dB, lissé sur 10 ms) — règle d'émergence de la carte des partiels
    if (t.gate) {
      const pn = new Float64Array(N);
      for (const r of t.gate) {
        const c2 = new Float64Array(N), s2 = new Float64Array(N);
        for (let k = 0; k < N; ++k) { c2[k] = Math.cos(th[k] * r); s2[k] = Math.sin(th[k] * r); }
        for (let side = 0; side < 2; ++side) {
          const W = side ? WR : WL;
          for (let g = 0; g + 1 < cuts.length; ++g) {
            const u = cuts[g], v = cuts[g + 1], len = v - u; if (len < 4) continue;
            const zr = new Float64Array(len), zi = new Float64Array(len);
            for (let q = 0; q < len; ++q) { const x = W[u + q], k = u - S0 + q; zr[q] = x * c2[k]; zi[q] = -x * s2[k]; }
            const fr = filtfilt(zr, sos, pad), fi = filtfilt(zi, sos, pad);
            for (let q = 0; q < len; ++q) pn[u - S0 + q] += (fr[q] * fr[q] + fi[q] * fi[q]) / t.gate.length;
          }
        }
      }
      const g = new Float64Array(N);
      for (let k = 0; k < N; ++k) {
        const ps = bre[0][k] ** 2 + bim[0][k] ** 2 + bre[1][k] ** 2 + bim[1][k] ** 2;
        const d = 10 * Math.log10((ps + 1e-30) / (pn[k] + 1e-30));
        g[k] = Math.max(0, Math.min(1, (d - 3) / 6));
      }
      const Wn = Math.round(0.005 * sr); let acc = 0; const gs = new Float64Array(N);
      for (let k = 0; k < N + Wn; ++k) { if (k < N) acc += g[k]; if (k - 2 * Wn - 1 >= 0) acc -= g[k - 2 * Wn - 1]; const c = k - Wn; if (c >= 0 && c < N) gs[c] = acc / (Math.min(N - 1, k) - Math.max(0, k - 2 * Wn) + 1); }
      let kept = 0; for (let k = 0; k < N; ++k) { kept += gs[k]; for (let side = 0; side < 2; ++side) { bre[side][k] *= gs[k]; bim[side][k] *= gs[k]; } }
      if (kept < 0.05 * N) continue;                                // n'émerge (presque) jamais : pas un partiel
    }
    // retrait du partiel du signal de travail
    for (let side = 0; side < 2; ++side) { const W = side ? WR : WL; for (let k = 0; k < N; ++k) W[S0 + k] -= 2 * (bre[side][k] * co[k] - bim[side][k] * si[k]); }
    // échantillonnage au pas hop2
    const J = [], F = [], AL = [], AR = [], PL = [], PR = [];
    const jA = Math.ceil(S0 / hop2), jB = Math.floor((S1 - 1) / hop2);
    const rr = bre[ref], ri = bim[ref];
    for (let jj = jA; jj <= jB; ++jj) {
      const k = jj * hop2 - S0;
      // fréquence = avance de phase moyenne sur ±½ pas (cohérente avec la phase : l'intégrer
      // redonne la phase mesurée ; une dérivée sur ±8 éch. était bruitée de 0,06 rad par pas)
      const k0 = Math.max(0, k - (hop2 >> 1)), k1 = Math.min(N - 1, k + (hop2 >> 1));
      const dph = wrap(Math.atan2(ri[k1], rr[k1]) - Math.atan2(ri[k0], rr[k0]));
      J.push(jj); F.push(((th[k1] - th[k0]) + dph) / Math.max(1, k1 - k0) * sr / (2 * Math.PI));
      AL.push(2 * Math.hypot(bre[0][k], bim[0][k])); AR.push(2 * Math.hypot(bre[1][k], bim[1][k]));
      PL.push(wrap(th[k] + Math.atan2(bim[0][k], bre[0][k]))); PR.push(wrap(th[k] + Math.atan2(bim[1][k], bre[1][k])));
    }
    // bornes : on retire les trames de bord où le partiel n'existe pas (< −60 dB de son maximum)
    let amax = 0; for (let q = 0; q < J.length; ++q) amax = Math.max(amax, AL[q] + AR[q]);
    let q0 = 0, q1 = J.length - 1;
    if (t.startAt === undefined) while (q0 < q1 && AL[q0] + AR[q0] < amax * 1e-3) q0 += 1;
    if (t.endAt === undefined) while (q1 > q0 && AL[q1] + AR[q1] < amax * 1e-3) q1 -= 1;
    if (q1 - q0 < 2) continue;
    const sl = a => Float64Array.from(a.slice(q0, q1 + 1));
    const r = { j: Int32Array.from(J.slice(q0, q1 + 1)), f: sl(F), aL: sl(AL), aR: sl(AR), pL: sl(PL), pR: sl(PR), fc, src: i, emerg: t.emerg, perr: t.perr };
    if (t.harm) { r.harm = t.harm; r.seg = t.seg; r.cents = t.cents; }
    // un partiel né sur une attaque commence exactement sur elle
    if (t.startAt !== undefined) r.startAt = t.startAt;
    if (t.endAt !== undefined) r.endAt = t.endAt;
    out.push(r);
  }
  return { tracks: out, hop: hop2, work: [WL, WR] };
}
