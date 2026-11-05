// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI V6.4 — LA TENUE GRANULAIRE (relevé du cerveau ; moteur : DSP, part3 « GRAINS »)
//  Mat : « en mode hold les boucles sont encore trop pauvres : il faudrait les allier avec de la granulaire pour avoir une
//  texture intéressante, et baisser le son de la boucle face à la granulaire. La granulaire doit être au plus près du timbre
//  d'origine, donc l'analyse doit informer sur la taille de la fenêtre de granulation, le nombre de grains, leur enveloppe ».
//  Pendant la tenue, le DSP joue, sous la boucle (−9 dB), un nuage de grains lus dans la ZONE TENUE de l'enfant (autour de
//  l'instant de tenue, tant qu'il reste à 6 dB de son niveau là — niveau sur 30 ms — et sur la même note, ±2 s : la tenue
//  garde son niveau et sa hauteur).
//  Ce que l'analyse en fixe, et pourquoi :
//   • TAILLE DU GRAIN — un grain doit porter la hauteur et le timbre : au moins 4 périodes (un grain plus court qu'une
//     poignée de périodes élargit chaque partiel et change le timbre), au moins 30 ms ; et pas plus long que le temps
//     pendant lequel le son reste lui-même (STATIONNARITÉ : l'écart au-delà duquel les tiers d'octave de la zone changent de
//     2 dB de plus qu'entre deux trames voisines) — sinon un grain mêle deux états du son ; 25 à 150 ms ;
//   • NOMBRE DE GRAINS (recouvrement) — un son à hauteur : 3 grains à la fois, posés sur la grille de SA période (départs et
//     positions lues à un nombre entier de périodes : les grains s'additionnent en phase, comme les marques d'un PSOLA —
//     aucun effet de chœur, le timbre reste) ; un son sans hauteur : 4 grains, décalés, pour un bruit sans grain ;
//   • ENVELOPPE — celle de la ZONE, pas celle du sujet entier : une zone tenue (aucune attaque dedans) : Hann symétrique
//     (montée = descente = moitié) ; une zone faite de frappes (au moins 2 attaques par seconde, + 9 dB en 15 ms) : montée sur
//     le quart du grain, descente sur le reste (la forme d'une résonance qui s'éteint) — jamais une montée sèche : un grain
//     lu au milieu d'une tenue n'a pas d'attaque à donner (V6.4 : la percussivité du sujet entier donnait au violoncelle et à
//     la voix des grains à 3 ms de montée — un hachis mesuré : variation d'une trame à l'autre ×2, timbre à 4–7 dB de la zone) ;
//   • VIE — chaque grain désaccordé de la vie de hauteur du sujet (lifeCents, ≤ 12 c), son niveau de sa vie d'amplitude
//     (lifeDb, ≤ 3 dB), placé dans la largeur stéréo de la zone (1 − corrélation gauche / droite) ; écarts par suites de
//     Weyl (aucun tirage) : le nuage ne se répète jamais à l'identique ;
//   • OÙ LIRE — un curseur parcourt la zone en aller-retour, quatre fois plus lentement que le son (il part de l'instant de
//     tenue : les premiers grains disent ce que la boucle dit) ; chaque grain est lu autour du curseur, à moins de la moitié
//     du temps où le son reste lui-même (deux grains voisins portent le même état du son : ils s'additionnent sans battre).
//     (V6.4, mesuré : des grains pris n'importe où dans la zone battaient entre eux sur un son à vibrato — le violoncelle
//     « la cour » : variation de 2,6 à 5,1 dB d'une trame de 10 ms à l'autre) ;
//   • NIVEAU — le nuage est joué ici comme le DSP le jouera et comparé à la zone : la boucle à −9 dB et le nuage à −0,6 dB
//     gardent ensemble le niveau de la tenue.
// ============================================================================================
import { fft } from './fft.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const GRAN_MAGIC = 0x4752414E;        // 'GRAN'

export function holdGrains (P, ctx, child, holdAt, loop = null) {
  const sr = P.sr, L = child.L, R = child.R, n = L.length, Bz = Math.round(0.01 * sr);
  const M = new Float64Array(n); for (let i = 0; i < n; ++i) M[i] = 0.5 * (L[i] + R[i]);
  const lv = x => { let q = 0; const a = Math.max(0, x - Bz), b = Math.min(n, x + 2 * Bz); for (let i = a; i < b; ++i) q += M[i] * M[i]; return 10 * Math.log10(q / Math.max(1, b - a) + 1e-20); };
  const T0 = clamp(Math.round(holdAt), 0, n - 1), ref = lv(T0);
  // période à l'instant de tenue (autocorrélation sur 60 ms, 50 Hz – 1 kHz)
  const W = Math.round(0.03 * sr), lo = Math.round(sr / 1000), hi = Math.round(sr / 50), c = clamp(T0, W, Math.max(W, n - W - hi - 1));
  let best = 0, bl = 0;
  if (c - W >= 0 && c + W + hi < n) { let e0 = 0; for (let i = c - W; i < c + W; ++i) e0 += M[i] * M[i]; for (let l = lo; l <= hi; ++l) { let sxy = 0, syy = 0; for (let i = c - W; i < c + W; ++i) { sxy += M[i] * M[i + l]; syy += M[i + l] * M[i + l]; } const r = sxy / Math.sqrt(e0 * syy + 1e-30); if (r > best) { best = r; bl = l; } } }
  const period = best > 0.6 ? bl : 0;
  // la note tenue : la même période (à ±3 %) se retrouve dans la trame (autocorrélation ≥ 0,5) — une zone qui passerait à
  // d'autres notes ferait jouer aux grains une autre note que la boucle (V6.4, mesuré : une broderie de trompette, zone de
  // 3,4 s, grains à 4,4 dB du timbre de la zone contre 1,3 dB pour la boucle)
  const samePitch = x => {
    if (!(period > 0)) return true;
    const a = x - W, b = x + W; if (a < 0 || b + Math.ceil(1.03 * period) >= n) return false;
    let e0 = 0; for (let i = a; i < b; ++i) e0 += M[i] * M[i]; if (!(e0 > 0)) return false;
    let r = 0; for (let l = Math.floor(0.97 * period); l <= Math.ceil(1.03 * period); ++l) { let sxy = 0, syy = 0; for (let i = a; i < b; ++i) { sxy += M[i] * M[i + l]; syy += M[i + l] * M[i + l]; } r = Math.max(r, sxy / Math.sqrt(e0 * syy + 1e-30)); }
    return r >= 0.5;
  };
  let zs = T0, ze = T0;
  while (zs - Bz > 0 && T0 - zs < 2 * sr && lv(zs - Bz) >= ref - 6 && samePitch(zs - Bz)) zs -= Bz;
  while (ze + Bz < n - 1 && ze - T0 < 2 * sr && lv(ze + Bz) >= ref - 6 && samePitch(ze + Bz)) ze += Bz;
  if (ze - zs < 0.12 * sr) { zs = Math.max(0, T0 - Math.round(0.06 * sr)); ze = Math.min(n - 1, T0 + Math.round(0.06 * sr)); }
  // stationnarité : énergies en tiers d'octave (150 Hz – 12 kHz) de trames de 21 ms tous les 10 ms dans la zone ; l'écart
  // moyen (dB, bandes à moins de 40 dB du maximum) d'une trame à celle qui la suit de « lag » ; le son reste lui-même tant que
  // cet écart ne dépasse pas de plus de 2 dB celui à 10 ms (ce plancher : le bruit de la mesure, le grain du son lui-même)
  const N = 1024, w = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N)), S = [], ed = [];
  for (let x = 150; x < 12000; x *= Math.pow(2, 1 / 3)) ed.push(x);
  for (let s = zs; s + N <= ze && S.length < 400; s += Bz) {
    const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < N; ++i) re[i] = M[s + i] * w[i]; fft(re, im);
    const v = new Float64Array(ed.length - 1); for (let q = 0; q + 1 < ed.length; ++q) { let e = 0; for (let k = Math.floor(ed[q] * N / sr); k < Math.ceil(ed[q + 1] * N / sr); ++k) e += re[k] * re[k] + im[k] * im[k]; v[q] = 10 * Math.log10(e + 1e-20); }
    S.push(v);
  }
  let stat = 0.15 * sr, floor = NaN;
  if (S.length >= 4) {
    let mx = -300; for (const v of S) for (const x of v) mx = Math.max(mx, x);
    const dist = lag => { let a = 0, m = 0; for (let j = 0; j + lag < S.length; ++j) for (let q = 0; q < S[j].length; ++q) { if (Math.max(S[j][q], S[j + lag][q]) < mx - 40) continue; a += Math.abs(S[j][q] - S[j + lag][q]); m++; } return a / Math.max(1, m); };
    floor = dist(1);
    for (let lag = 2; lag < Math.min(16, S.length); ++lag) if (dist(lag) > floor + 2) { stat = (lag - 1) * Bz; break; }
  }
  // le grain dure le temps où le son reste lui-même (il en porte un seul état), jamais moins de 4 périodes ni de 30 ms
  const lenS = period > 0 ? clamp(Math.max(stat, 4 * period, 0.03 * sr), 0.025 * sr, 0.12 * sr) : clamp(stat, 0.03 * sr, 0.15 * sr);
  // une zone au moins deux fois plus longue que le grain (sinon tous les grains lisent le même endroit) : élargie autour de
  // l'instant de tenue
  if (ze - zs < 2 * lenS + 0.02 * sr) { const h = Math.round(lenS + 0.01 * sr); zs = Math.max(0, Math.min(zs, T0 - h)); ze = Math.min(n - 1, Math.max(ze, T0 + h)); }
  const ov = period > 0 ? 3 : 4;
  // attaques dans la zone : enveloppe en 5 ms, montée de 9 dB en 15 ms au plus (une par 50 ms au plus)
  const B5 = Math.round(0.005 * sr), nb5 = Math.floor((ze - zs) / B5), e5 = new Float64Array(nb5);
  for (let b = 0; b < nb5; ++b) { let q = 0; for (let i = zs + b * B5; i < zs + (b + 1) * B5; ++i) q += M[i] * M[i]; e5[b] = 10 * Math.log10(q / B5 + 1e-20); }
  let nAtk = 0; for (let b = 3; b < nb5; ++b) if (e5[b] - Math.min(e5[b - 1], e5[b - 2], e5[b - 3]) >= 9 && e5[b] > ref - 30) { nAtk++; b += 9; }
  const atkRate = nAtk / Math.max(1e-3, (ze - zs) / sr), perc = atkRate >= 2 ? 1 : 0, att = perc ? 0.25 : 0.5, dec = perc ? 0.75 : 0.5;
  const jitC = clamp((P.traits && P.traits.lifeCents) || 0, 0, 12), jitDb = clamp((P.traits && P.traits.lifeDb) || 0, 0, 3);
  let sl = 0, sr2 = 0, slr = 0; for (let i = zs; i < ze; ++i) { sl += L[i] * L[i]; sr2 += R[i] * R[i]; slr += L[i] * R[i]; }
  const width = clamp(1 - slr / Math.sqrt(sl * sr2 + 1e-30), 0.1, 0.8);
  const spread = Math.round(clamp(0.5 * stat, 0.5 * lenS, 0.25 * (ze - zs)));
  const g = { zs, ze, len: Math.round(lenS), refDb: ref, ov, att, dec, period, jitC, jitDb, width, loopDb: -9, grainDb: -0.6, stat: stat / sr, floorDb: floor, perc, atkRate,
    scanAt: T0 - zs, scanSpd: 0.25, spread };
  // le niveau du nuage : joué ici comme le DSP le jouera (même moteur, mêmes suites), comparé au niveau de la zone — le DSP
  // suppose les grains en phase sur la grille de la période ; ce qui reste de la hauteur qui bouge dans la zone les déphase,
  // la correction le rattrape (la boucle à −9 dB et le nuage à −0,6 dB : leur somme garde le niveau de la tenue)
  // la référence : la boucle elle-même quand on l'a (c'est elle qui sonne pendant la tenue), sinon la zone
  let zp = 0;
  if (loop && loop.len > 0) { for (let i = 0; i < loop.len; ++i) zp += loop.L[i] * loop.L[i] + loop.R[i] * loop.R[i]; zp /= loop.len; }
  else { for (let i = zs; i < ze; ++i) zp += L[i] * L[i] + R[i] * R[i]; zp /= Math.max(1, ze - zs); }
  // (V6.5) la tenue entière : la boucle à −9 dB PLUS le nuage, joués ensemble comme le DSP — les grains à hauteur s'alignent
  // en phase sur la boucle (part3 grAlign), leurs amplitudes s'ajoutent ; un nuage sans hauteur s'ajoute en puissance. Le gain
  // G du nuage est celui qui rend à la tenue la puissance de la boucle : a²·Pll + 2·a·G·Plc + G²·Pcc = Pll (a = −9 dB) ; six
  // courts passages (0,4 s), le curseur posé à six endroits également répartis dans la zone
  const a = Math.pow(10, g.loopDb / 20), pll = zp; let pcc = 0, plc = 0, nseg = 0;
  for (let sgi = 0; sgi < 6; ++sgi) {
    const span = Math.max(0, (ze - zs) - g.len - 6), gs = { ...g, scanAt: 2 + (sgi + 0.5) / 6 * span };
    const lp0 = loop && loop.len > 0 ? Math.floor((sgi + 0.5) / 6 * loop.len) : 0;
    const cl = grainCloud(L, R, gs, Math.round(0.4 * sr) + g.len, 3 + 37 * sgi, loop, lp0);
    let cc = 0, lc = 0, m = 0;
    for (let i = g.len; i < cl.L.length; ++i) {
      let lL = 0, lR = 0; if (loop && loop.len > 0) { const j = (lp0 + i) % loop.len; lL = loop.L[j]; lR = loop.R[j]; }
      cc += cl.L[i] * cl.L[i] + cl.R[i] * cl.R[i]; lc += cl.L[i] * lL + cl.R[i] * lR; m++;
    }
    pcc += cc / Math.max(1, m); plc += lc / Math.max(1, m); nseg++;
  }
  pcc /= nseg; plc /= nseg;
  let G = 1; if (pcc > 0 && pll > 0) { const B = 2 * a * plc, C = (a * a - 1) * pll, disc = B * B - 4 * pcc * C; G = disc > 0 ? Math.max(1e-3, (-B + Math.sqrt(disc)) / (2 * pcc)) : Math.sqrt(Math.max(1e-6, (1 - a * a) * pll / pcc)); }
  g.grainDb = clamp(20 * Math.log10(G), -40, 12); g.corrDb = g.grainDb + 0.6; g.coh = pll > 0 && pcc > 0 ? plc / Math.sqrt(pll * pcc) : 0;
  g.desc = `hold grains: ${(lenS / sr * 1000).toFixed(0)} ms (${period > 0 ? `${(lenS / period).toFixed(1)} periods, in phase with the loop` : 'no pitch'}; the sound stays itself for ${(stat / sr * 1000).toFixed(0)} ms), ${ov} at a time, ${att === 0.5 ? 'Hann envelope' : `decaying envelope (the zone is struck ${atkRate.toFixed(1)} times a second)`}, ${period > 0 ? '' : `±${jitC.toFixed(1)} c, `}±${jitDb.toFixed(1)} dB of slow life, read around a cursor crossing the ${((ze - zs) / sr).toFixed(2)} s held zone four times slower than the sound (±${(spread / sr * 1000).toFixed(0)} ms); the loop 9 dB under them, the cloud at ${g.grainDb.toFixed(1)} dB`;
  return g;
}
/** ce que le DSP fait de ces mots (part2 readLacquer) : longueur bornée, pas entre départs, normalisation ; (V6.5) une zone
 *  TENUE (montée = descente) à hauteur : flancs d'un pas exactement, longueur d'un nombre entier de pas (≥ 2) — les fenêtres
 *  somment à (recouvrement − 1) partout */
export function grainPlan (g) {
  const zl = g.ze - g.zs, len = Math.min(g.len, zl - 8), ov = clamp(g.ov, 1, 8), pe = clamp(g.period, 0, 4800);
  let att = clamp(g.att, 0.02, 0.98), dec = clamp(g.dec, 0.02, 0.98); if (att + dec > 1) { const s = 1 / (att + dec); att *= s; dec *= s; }
  let hop = len / ov; if (pe > 1) hop = Math.max(1, Math.floor(hop / pe + 0.5)) * pe; hop = Math.max(16, hop);
  const ovr = len / hop, ad = att + dec;
  let norm = pe > 1 ? 1 / Math.max(1, ovr * (1 - 0.5 * ad)) : 1 / Math.sqrt(Math.max(1, ovr * (1 - 0.625 * ad)));
  const held = Math.abs(att - dec) < 0.05;
  let lc = len, ac = att, dc = dec;
  if (held && pe > 1) {
    let ovI = Math.max(2, Math.floor(ovr + 0.5)); lc = ovI * hop;
    if (lc > zl - 8) { ovI = Math.max(2, Math.floor((zl - 8) / hop)); lc = ovI * hop; }
    ac = 1 / ovI; dc = 1 / ovI; norm = 1 / Math.max(1, ovI - 1);
  }
  return { zl, len, ov, pe, att, dec, hop, ovr, norm, held, lc, ac, dc };
}
/** le nuage seul, exactement comme le DSP (part3 grainsSample, V6.5), gain des grains 1 (normalisation comprise) ; loop : la
 *  boucle qui sonne dessous (les grains à hauteur s'y alignent en phase), lp0 : sa position au premier échantillon */
export function grainCloud (L, R, g, n, idx0 = 1, loop = null, lp0 = 0) {
  const p = grainPlan(g), sr = 48000, childLen = L.length, FS = 48000;
  const at = (X, i) => (i < 0 || i >= childLen) ? 0 : X[i];
  const rc = (X, q) => { const i = Math.floor(q), t = q - i, xm1 = at(X, i - 1), x0 = at(X, i), x1 = at(X, i + 1), x2 = at(X, i + 2), c = (x1 - xm1) * 0.5, v = x0 - x1, w = c + v, a = w + v + (x2 - x0) * 0.5, b = w + a; return (((a * t) - b) * t + c) * t + x0; };
  const win = u => { if (u < p.ac) { const x = Math.sin(0.5 * Math.PI * u / p.ac); return x * x; } if (u > 1 - p.dc) { const x = Math.sin(0.5 * Math.PI * (1 - u) / p.dc); return x * x; } return 1; };
  const fr = x => x - Math.floor(x), oL = new Float32Array(n), oR = new Float32Array(n);
  const NS = 10, gP = new Float64Array(NS), gI = new Float64Array(NS), gA = new Float64Array(NS), gL = new Float64Array(NS), gG = new Float64Array(NS), gPn = new Float64Array(NS);
  const life = (t, f1, f2, ph) => 0.6 * Math.sin(2 * Math.PI * (f1 * t + ph)) + 0.4 * Math.sin(2 * Math.PI * (f2 * t + ph * 1.618034));
  const ll = loop && loop.len > 0 ? loop.len : 0, lpM = i => { if (!ll) return 0; const j = ((i % ll) + ll) % ll; return loop.L[j] + loop.R[j]; }, chM = i => at(L, i) + at(R, i);
  // en phase avec la boucle (part3 grAlign) : une période (≤ 384, 48 points) de la boucle contre la zone, ± une demi-période
  const align = (p0, lpos, pe, cLo, cHi) => {
    if (!ll) return p0;
    const W = Math.floor(Math.min(pe, 384)), ws = Math.max(1, Math.floor(W / 48)), D = Math.floor(Math.min(0.5 * pe, 480)), ds = Math.max(1, Math.floor(D / 48));
    const base = Math.floor(p0), l0 = Math.floor(lpos); let best = -1e30, bd = 0;
    const cor = d => { let c = 0; for (let i = 0; i < W; i += ws) c += lpM(l0 + i) * chM(base + d + i); return c; };
    for (let d = -D; d <= D; d += ds) { const c = cor(d); if (c > best) { best = c; bd = d; } }
    const d0 = bd; for (let d = d0 - ds + 1; d < d0 + ds; ++d) { if (d === d0) continue; const c = cor(d); if (c > best) { best = c; bd = d; } }
    return clamp(base + bd + (p0 - base), cLo, cHi);
  };
  let next = 0, cnt = idx0, t = 0; const ph = fr(idx0 * 0.618034), pitched = p.pe > 1;
  const cLo = g.zs + 2, cHi = Math.max(cLo, g.zs + p.zl - Math.floor(p.lc) - 4); let cur = clamp(g.zs + (g.scanAt || 0), cLo, cHi), dir = 1, cmin = cur, cmax = cur;
  for (let i = 0; i < n; ++i) {
    cur += dir * (g.scanSpd || 0); if (cur > cHi) { cur = 2 * cHi - cur; dir = -1; } if (cur < cLo) { cur = 2 * cLo - cur; dir = 1; } cur = clamp(cur, cLo, cHi); if (cur < cmin) cmin = cur; if (cur > cmax) cmax = cur;
    t += 1 / FS;
    next -= 1;
    if (next <= 0) {
      let s = -1; for (let q = 0; q < NS; ++q) if (s < 0 && gL[q] <= 0) s = q;
      if (s >= 0) {
        const nn = cnt++, w0 = fr(nn * 0.618034), w1 = fr(nn * 0.754878);
        let p0 = clamp(cur + (2 * w0 - 1) * (g.spread || 0), cLo, cHi);
        if (pitched) { p0 = cLo + Math.round((p0 - cLo) / p.pe) * p.pe; while (p0 > cHi && p0 - p.pe >= cLo) p0 -= p.pe; p0 = align(p0, lp0 + i, p.pe, cLo, cHi); }
        const age = -next;
        const lcents = pitched ? 0 : g.jitC * (life(t, 0.37, 0.83, ph) + 0.25 * (2 * w1 - 1));
        const ldb = g.jitDb * life(t, 0.29, 0.71, ph + 0.31);
        let pn = g.width * Math.sin(2 * Math.PI * (0.11 * t + ph + 0.5));
        if (!pitched) pn = g.width * (nn % 2 === 0 ? 1 : -1) * (0.6 + 0.4 * life(t, 0.13, 0.31, ph + 0.7));
        gP[s] = p0 + age; gI[s] = Math.pow(2, lcents / 1200); gA[s] = age; gL[s] = p.lc;
        gG[s] = Math.pow(10, ldb * 0.05); gPn[s] = clamp(pn, -0.9, 0.9);
      }
      let h = p.hop; if (!pitched) h *= 0.85 + 0.3 * fr(cnt * 0.267949);
      next += h;
    }
    let yL = 0, yR = 0, sw2 = 0;
    for (let q = 0; q < NS; ++q) if (gL[q] > 0) { const u = gA[q] / gL[q]; if (u >= 1) gL[q] = 0; else { const w = win(u), e = w * gG[q]; yL += rc(L, gP[q]) * Math.sqrt(1 - gPn[q]) * e; yR += rc(R, gP[q]) * Math.sqrt(1 + gPn[q]) * e; sw2 += w * w; gP[q] += gI[q]; gA[q] += 1; } }
    const nm = p.held && !pitched ? 1 / Math.sqrt(Math.max(sw2, 0.0025)) : p.norm;
    oL[i] = yL * nm; oR[i] = yR * nm;
  }
  return { L: oL, R: oR, plan: p, cmin, cmax, lo: cLo, hi: cHi };
}
/** les 32 mots du bloc GRAN (fin du bloc LACQ) ; [14] départ du curseur dans la zone, [15] sa vitesse ×1000, [16] l'écart autour de lui (images) */
export function granWords (g, out, off) {
  out[off] = GRAN_MAGIC; out[off + 1] = 1; out[off + 2] = g.zs; out[off + 3] = g.ze - g.zs; out[off + 4] = g.len; out[off + 5] = Math.round(g.ov * 100);
  out[off + 6] = Math.round(g.att * 1000); out[off + 7] = Math.round(g.dec * 1000); out[off + 8] = Math.round(g.period * 100);
  out[off + 9] = Math.round(g.jitC * 100); out[off + 10] = Math.round(g.jitDb * 100); out[off + 11] = Math.round(g.width * 1000);
  out[off + 12] = Math.round(g.loopDb * 100); out[off + 13] = Math.round(g.grainDb * 100);
  out[off + 14] = Math.round(g.scanAt || 0); out[off + 15] = Math.round((g.scanSpd || 0) * 1000); out[off + 16] = Math.round(g.spread || 0);
}
