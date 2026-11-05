// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI V6.3 — CRISTALLISATIONS À L'ÉCHELLE DU SON (les partiels pour voix)
//  Mat : « la carte des partiels doit servir au maximum des transformations possibles ; inventorier dans jgcompose quelles
//  transformations de cristallisation seraient intéressantes à l'échelle du sample ».
//  jgcompose cristallise une PARTITION : chaque voix est tirée vers une forme pure (_CRYST_FORMS, 24 formes), sous une
//  enveloppe en S (montée, tenue, retour : _cryst_ramp_fn) ; quand la cible est une catégorie, un tramage déterministe
//  (_cryst_dither) fait basculer les notes une à une, la PROPORTION de notes basculées suivant la dose sans palier.
//  Ici la partition, c'est le son : chaque PARTIEL (rang k de la note, à sa fréquence vraie relevée trame à trame — la
//  carte des partiels) est une voix ; sa hauteur, son enveloppe, son instant d'attaque sont ses notes. Le banc des
//  cristaux (td.js) rend chaque partiel déplacé (r), pesé (g) ou relu ailleurs dans son enveloppe (sh), dans sa phase.
//  Douze formes retenues (quatre gènes, trois variantes chacun) :
//    CRISTAL        v0 gravitation (les partiels tombent sur les degrés-pivots), v1 bande (l'ambitus des partiels se
//                   resserre autour de leur centre), v2 liquéfaction (chaque partiel fond vers sa place dans la note suivante)
//    HORLOGE        v0 mécanisme (chaque partiel son pouls isochrone propre), v1 strates (les octaves de partiels en densités
//                   ×2 du noyau, sur la grille groovée), v2 martelé (la classe dominante martelée, le reste tenu)
//    CONSTELLATION  v0 parenthèses (Cage : chaque partiel sa fenêtre dans la note), v1 effritement (Momi : les partiels qui
//                   tiennent deviennent résonance fragile, ceux qui meurent vite s'émiettent), v2 ma (les partiels se
//                   taisent tôt, l'aigu d'abord : le souffle reste seul)
//    BATTEMENT      v0 battement (chaque partiel tremble entre lui et son pôle voisin attesté), v1 homorythmie (les attaques
//                   des partiels alignées sur celle de la note — ou, si le sujet les a déjà alignées, leur hétérophonie),
//                   v2 escalier (Shepard-Risset des partiels : la lumière monte sans fin d'un rang à l'autre)
//  Écartées (déjà là ou sans objet à cette échelle) : khoomei = le chant diphonique (GESTES.chant), kotekan = le hoquet
//  spectral (GESTES.hoquet), micropolyphonie = micropoly, canon = l'éclosion (les bandes de rangs entrent tour à tour),
//  hétérophonie cyclique et homorythmie fondues dans BATTEMENT v1 ; drone = la gravitation dont le seul pivot serait la
//  fondamentale (la gravitation la garde toujours parmi ses pivots ; la pédale la tient déjà sous le son) ; unisson : à cette échelle tous les partiels sur une même
//  hauteur (le son détruit) ou sur la série exacte (écart mesuré 2 à 15 c sur 8 sujets : inaudible seul) ; ostinato, seuil,
//  sam, tihai : des formes de PHRASE (cellule, cycle, fin), sans équivalent dans la vie d'un partiel ; turbulence : un
//  bruit fractal (pas de tirage ici) — sa version relevée sur le son est la vie amplifiée (GESTES.vie).
//  Aucun tirage : les ordres viennent du son (distances, déclins, retards relevés) ou de la suite du nombre d'or.
// ============================================================================================
import { centsOf, hzOf, scaleClasses } from './microtonal.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const PHI = 0.6180339887498949;
const frac = x => x - Math.floor(x);
const db20 = x => 20 * Math.log10(Math.max(1e-6, x));
const smooth = u => { const x = clamp(u, 0, 1); return x * x * (3 - 2 * x); };
export const CRISTAUX = {};
export const CRISTAUX_LIST = ['cristal', 'horloge', 'constellation', 'battement'];

// ------------------------------------------------------------------------------------------ outils communs
// ENVELOPPE EN S (jgcompose _cryst_ramp_fn, adoucissement « ease-out » : départ immédiat, pose en douceur) sur la durée de la
// strate : montée 30 %, cible tenue 45 %, retour 25 % (aller-retour A-B-A) quand le sujet a au moins trois notes — il a une
// forme où revenir ; sinon montée 45 % puis tenue (la note cristallise et le reste). Dose pleine : min(1, 1,6·ι) — à dose
// faible le cristal suit la dose (à Mockery 0, seize ressemblances : V6.1) ; toutes les profondeurs passent par la dose.
function rampOf (P, D, iota) {
  const amount = clamp(1.6 * iota, 0, 1), round = (P.notes ? P.notes.length : 0) >= 3;
  const up = (round ? 0.3 : 0.45) * D, hold = round ? 0.45 * D : Infinity, down = 0.25 * D;
  const easeOut = u => 1 - (1 - u) * (1 - u);
  const dose = t => { if (t <= 0) return 0; if (t < up) return amount * easeOut(t / up); if (t < up + hold) return amount; const v = (t - up - hold) / down; return v >= 1 ? 0 : amount * (1 - easeOut(v)); };
  return { dose, amount, round, desc: round ? `S-ramp up ${Math.round(up / P.sr * 1000)} ms, held, back over the last quarter` : `S-ramp up ${Math.round(up / P.sr * 1000)} ms, then held` };
}
// TRAMAGE (jgcompose _cryst_dither) : le partiel d'ordre θ ∈ [0, 1) entre quand la dose le dépasse, en 25 % de dose ; la part
// des partiels déjà cristallisés suit la dose continûment
const part = (theta, d) => clamp((1.25 * d - theta) / 0.25, 0, 1);
// notes du sujet en échantillons source ; noteAt(s) → indice ou −1
function notesOf (P) {
  if (P.__xnotes) return P.__xnotes;
  const sr = P.sr, ns = (P.notes || []).map(q => ({ a: Math.round(q.t0 * sr), b: Math.round(q.t1 * sr), f0: q.f0 }));
  if (!ns.length) ns.push({ a: Math.round((P.traits?.activeStart || 0) * sr), b: Math.round((P.traits?.activeEnd || P.n / sr) * sr), f0: P.f0med || 0 });
  const at = s => { if (s === null || s === undefined) return -1; let lo = 0, hi = ns.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (ns[m].a <= s) { r = m; lo = m + 1; } else hi = m - 1; } return r >= 0 && s < ns[r].b ? r : -1; };
  return (P.__xnotes = { ns, at });
}
// RELEVÉ PAR RANG (rangs 1 à 24, sur les trames voisées) : niveau médian (dB sous le pic de la trame), déclin médian dans
// les notes (dB/s, depuis le maximum), retard d'attaque médian (ms : premier instant à moins de 10 dB du maximum des 400
// premières ms de la note) — la vie de chaque partiel, telle que la carte des partiels la donne
function rankFeatures (P) {
  if (P.__rankF) return P.__rankF;
  const H = 24, nf = P.frames.length, hop = P.hopF, sr = P.sr, A = Array.from({ length: H }, () => new Float64Array(nf).fill(-120));
  for (let j = 0; j < nf; ++j) {
    const F = P.voiced[j]; if (!(F > 0)) continue;
    let mx = 0; for (const p of P.frames[j].peaks) mx = Math.max(mx, p.a);
    for (const p of P.frames[j].peaks) { const r = p.f / F, k = Math.round(r); if (k >= 1 && k <= H && Math.abs(1200 * Math.log2(r / k)) < 35) A[k - 1][j] = Math.max(A[k - 1][j], db20(p.a / (mx || 1))); }
  }
  const med = a => { if (!a.length) return NaN; const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
  const out = [];
  for (let k = 0; k < H; ++k) {
    const a = A[k], lv = [], dec = [], lag = [];
    for (let j = 0; j < nf; ++j) if (a[j] > -60) lv.push(a[j]);
    for (const q of P.notes || []) {
      let jm = q.j0, vm = -1e9; for (let j = q.j0; j < Math.min(q.j1, q.j0 + Math.round(0.4 * sr / hop)); ++j) if (a[j] > vm) { vm = a[j]; jm = j; }
      if (vm < -60) continue;
      let j0 = q.j0; while (j0 < jm && a[j0] < vm - 10) j0++; lag.push((j0 - q.j0) * hop / sr * 1000);
      if (q.j1 - jm >= 6) { let sx = 0, sy = 0, sxx = 0, sxy = 0, c = 0; for (let j = jm; j < q.j1; ++j) if (a[j] > -80) { const x = (j - jm) * hop / sr; sx += x; sy += a[j]; sxx += x * x; sxy += x * a[j]; c++; } if (c >= 4) dec.push((c * sxy - sx * sy) / (c * sxx - sx * sx + 1e-12)); }
    }
    out.push({ k: k + 1, level: lv.length ? med(lv) : -80, decay: dec.length ? med(dec) : 0, lag: lag.length ? med(lag) : 0, n: lv.length });
  }
  return (P.__rankF = out);
}
// grille groovée : l'instant de la grille droite que le micro-groove amène en t (comme grooveNew)
const unwarpOf = grid => (grid.has ? (t => { let x = t; for (let i = 0; i < 4; ++i) x = t - (grid.warp(x) - x); return x; }) : (t => t));
// impulsion : attaque de 4 ms, chute exponentielle (τ), au-dessus d'un plancher
const tick = (ph, tau, fl, sr) => fl + (1 - fl) * Math.min(1, ph / (0.004 * sr)) * Math.exp(-ph / Math.max(1, tau));
// le cristal se pose sur chaque strate (copie de sa liste : les strates clonées par d'autres gènes partagent la leur)
function addXb (layers, fn) { for (const S of layers) S.xb = [...(S.xb || []), fn]; return layers; }

// ============================================================================================ CRISTAL (hauteur des partiels)
CRISTAUX.cristal = {
  kind: 'xb', profile: [0.9, 0.1, 0.7, 0.0, 0.3, 0.3, 0.0, 0.0],
  relevance: T => T.tonal * Math.min(1, T.nHarm / 6),
  make (P, ctx, iota, variant) {
    const v = variant % 3, sr = P.sr, root = P.fundamentalCents ?? centsOf(P.f0med || 220);
    if (v === 0) {
      // GRAVITATION (jgcompose _cf_gravitation : les notes gravitent vers les DEGRÉS-PIVOTS attestés, les plus tenus) — les
      // classes de hauteur les plus tenues par les notes du sujet (repliées sur la gamme) ; chaque partiel tombe sur le pivot
      // le plus proche (toutes octaves), ceux qui en sont loin deviennent passage et s'effacent ; deux partiels sur le même
      // point : le plus proche le garde, l'autre s'efface (pas de battement de deux copies)
      const per = ctx.period || 1200, cls = P.tuning ? scaleClasses(P.tuning).cls : null, w = new Map();
      const snapC = c => { const r = ((c - root) % per + per) % per; if (!cls || !cls.length) return Math.round(r / 10) * 10 % per; let b = cls[0], bd = 1e9; for (const x of [...cls, per]) { const d = Math.abs(x - r); if (d < bd) { bd = d; b = x % per; } } return b; };
      for (const q of P.notes || []) { const c = snapC(centsOf(q.f0)); w.set(c, (w.get(c) || 0) + (q.t1 - q.t0)); }
      let piv = [...w.entries()].sort((a, b) => b[1] - a[1]).map(e => e[0]);
      piv = piv.slice(0, piv.length >= 4 ? 3 : 2);
      if (!piv.includes(0)) piv.push(0);                                   // la fondamentale attestée reste un pivot
      if (piv.length < 2) piv.push(snapC(root + 1902));                    // son d'une seule note : le 3e partiel (la douzième)
      piv = [...new Set(piv)].sort((a, b) => a - b);
      const lat = []; for (let o = -6; o <= 10; ++o) for (const p of piv) { const c = root + o * per + p; if (c > centsOf(25) && c < centsOf(18000)) lat.push(c); }
      lat.sort((a, b) => a - b);
      const gap = per / piv.length, depth = 6 + 18 * iota, cache = new Map();
      const near = c => { let lo = 0, hi = lat.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (lat[m] < c) lo = m; else hi = m; } return Math.abs(lat[lo] - c) <= Math.abs(lat[hi] - c) ? lat[lo] : lat[hi]; };
      const plan = F => {
        const key = Math.round(centsOf(F)); let e = cache.get(key); if (e) return e;
        const cF = centsOf(F), K = Math.min(128, Math.floor(16000 / F)), rows = [], owner = new Map();
        for (let k = 1; k <= K; ++k) { const c = cF + 1200 * Math.log2(k), tg = near(c), d = Math.abs(tg - c); rows.push({ c, tg, d, pass: clamp((d / gap - 0.2) / 0.2, 0, 1), dup: false }); const o = owner.get(tg); if (o === undefined || rows[o].d > d) owner.set(tg, k - 1); }
        rows.forEach((r, i) => { r.dup = owner.get(r.tg) !== i; });
        if (cache.size > 4000) cache.clear(); cache.set(key, rows); return rows;
      };
      return { desc: `gravitation of the partials onto the pivot classes ${piv.map(p => Math.round(p)).join('/')} c above the fundamental (passing partials −${depth.toFixed(0)} dB)`,
        apply (layers, D) {
          const R = rampOf(P, D, iota);
          addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const x = part(frac(h * PHI), d); if (x <= 0) return; const e = plan(F)[h - 1]; if (!e) return;
            o.r *= Math.pow(2, x * (e.tg - e.c) / 1200); o.g -= x * (depth * e.pass + (e.dup ? 12 : 0)); });
          return { layers, D };
        } };
    }
    if (v === 1) {
      // BANDE (jgcompose _cf_bande, Atmosphères : l'ambitus se resserre autour du centre attesté, le registre ne bouge pas) —
      // le centre : la moyenne (en octaves) des rangs présents (niveau relevé > −45 dB : chaque partiel compte comme une note
      // de la voix, quel que soit son niveau — le centre d'une clarinette pondéré par l'énergie tombait sur le rang 1,1) ;
      // chaque partiel s'en rapproche de
      // a = 0,3 + 0,55·ι de sa distance, les plus éloignés d'abord (l'ambitus se ferme par les bords)
      const RF = rankFeatures(P), pres = RF.filter(f => f.n > 0 && f.level > -45), cl = pres.length ? pres.reduce((a, f) => a + Math.log2(f.k), 0) / pres.length : 1, a = 0.3 + 0.55 * iota; let md = 1e-9; for (let k = 1; k <= 64; ++k) md = Math.max(md, Math.abs(Math.log2(k) - cl));
      return { desc: `band: the partials close in on their centre (rank ${Math.pow(2, cl).toFixed(1)}) by ${Math.round(a * 100)} % of their distance, outer partials first`,
        apply (layers, D) {
          const R = rampOf(P, D, iota);
          addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const dx = cl - Math.log2(h), x = part(clamp(1 - Math.abs(dx) / md, 0, 0.99), d); if (x > 0) o.r *= Math.pow(2, x * a * dx); });
          return { layers, D };
        } };
    }
    // LIQUÉFACTION (jgcompose _cf_liquefaction, Romitelli : les hauteurs fondent en glissandos vers la hauteur attestée
    // suivante) — dans la fin de chaque note (une part 0,25 + 0,6·ι de sa durée, dosée), chaque partiel glisse vers sa place
    // dans la note suivante (même rang) ; chacun part à son heure (fraction du nombre d'or) : un métal visqueux. Aucune note
    // suivante (dernière note, ou silence de plus de 0,25 s) : rien ne fond.
    const N = notesOf(P), ns = N.ns, lam = 0.25 + 0.6 * iota;
    const nextR = ns.map((q, i) => (i + 1 < ns.length && ns[i + 1].a - q.b < 0.25 * sr && q.f0 > 0 && ns[i + 1].f0 > 0 ? ns[i + 1].f0 / q.f0 : 0));
    if (!nextR.some(x => x > 0)) return null;
    return { desc: `liquefaction: in the last ${Math.round(lam * 100)} % of each note every partial melts towards its place in the next note`,
      apply (layers, D) {
        const R = rampOf(P, D, iota);
        addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const i = N.at(s); if (i < 0 || !nextR[i]) return; const q = ns[i], u = (s - q.a) / Math.max(1, q.b - q.a);
          const L = lam * (0.45 + 0.55 * frac(h * PHI)) * d; if (L <= 0) return; const gp = smooth((u - (1 - L)) / L); if (gp > 0) o.r *= Math.pow(nextR[i], gp * d); });
        return { layers, D };
      } };
  }
};

// ============================================================================================ HORLOGE (le temps des partiels)
CRISTAUX.horloge = {
  kind: 'xb', profile: [0.1, 0.4, 0.5, 0.9, 0.3, 0.4, 0.0, 0.1],
  relevance: T => T.tonal * Math.min(1, T.nHarm / 4) * (T.activeEnd - T.activeStart >= 0.5 ? 1 : 0.4),
  make (P, ctx, iota, variant) {
    const v = variant % 3, sr = P.sr, U = clamp(ctx.grid.unit, 0.07 * sr, 0.4 * sr), unwarp = unwarpOf(ctx.grid);
    if (v === 0) {
      // MÉCANISME (jgcompose _cf_mecanisme ; Ligeti, Poème symphonique : chaque voix un pouls isochrone propre, décalage
      // permanent, sans rubato) — le partiel k bat à la période U·(1 + 0,75·{k·φ}) (U : l'unité du sujet), tous ensemble au
      // départ puis de plus en plus déphasés ; hors de la grille groovée exprès
      const fl = Math.pow(10, -(9 + 21 * iota) / 20);
      return { desc: `mechanism: every partial ticks at its own steady period, ${(U / sr * 1000).toFixed(0)} to ${(1.75 * U / sr * 1000).toFixed(0)} ms, drifting apart`,
        apply (layers, D) {
          const R = rampOf(P, D, iota);
          addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const x = part(frac(h * PHI), d); if (x <= 0) return; const Pk = U * (1 + 0.75 * frac(h * PHI * PHI)), ph = t % Pk;
            o.g += x * db20(tick(ph, (0.12 + 0.3 * (1 - iota)) * Pk, fl, sr)); });
          return { layers, D };
        } };
    }
    if (v === 1) {
      // STRATES (jgcompose _cf_strates, colotomie du gamelan : densités multiples du NOYAU, la voix la plus lente) — les
      // octaves de partiels (rang 1 ; 2–3 ; 4–7 ; 8–15 ; 16–31 ; 32 et plus) frappent à la mesure, la demi-mesure, le
      // quart… (au moins 60 ms), sur la grille groovée du sujet ; le rang 1 tient le cycle (le gong)
      const core = ctx.grid.has ? ctx.grid.bar : 8 * U, phase = ctx.grid.phase || 0, fl = Math.pow(10, -(9 + 21 * iota) / 20);
      return { desc: `strata: octaves of partials struck at 1, 2, 4, 8, 16× the cycle (${(core / sr).toFixed(2)} s) on the grooved grid`,
        apply (layers, D) {
          const R = rampOf(P, D, iota);
          addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const b = Math.min(5, Math.floor(Math.log2(h))), x = part(b / 6, d); if (x <= 0) return;
            const Pb = Math.max(0.06 * sr, core / Math.pow(2, b)), tu = unwarp(t), ph = ((tu - phase) % Pb + Pb) % Pb;
            o.g += x * db20(tick(ph, (0.15 + 0.35 * (1 - iota)) * Pb, fl, sr)); });
          return { layers, D };
        } };
    }
    // MARTELÉ (jgcompose _cf_martele, Mâni : une seule classe martelée sur un pouls quasi isochrone, toute la variation dans
    // l'agogique) — le partiel le plus fort relevé (et ses octaves : la même classe) frappé à l'unité du sujet, sur sa grille
    // groovée ; les autres partiels tiennent
    const RF = rankFeatures(P).slice(0, 16); let kd = 1; for (const f of RF) if (f.level > RF[kd - 1].level) kd = f.k;
    const set = new Set(); for (let k = kd; k <= 128; k *= 2) set.add(k);
    const pulse = ctx.grid.has ? Math.max(0.07 * sr, ctx.grid.unit) : U, phase = ctx.grid.phase || 0, fl = Math.pow(10, -(12 + 24 * iota) / 20);
    return { desc: `hammered: partial ${kd} and its octaves struck every ${(pulse / sr * 1000).toFixed(0)} ms on the grooved grid, the rest held`,
      apply (layers, D) {
        const R = rampOf(P, D, iota);
        addXb(layers, (h, t, F, s, o) => { if (!set.has(h)) return; const d = R.dose(t); if (d <= 0) return; const x = d; const tu = unwarp(t), ph = ((tu - phase) % pulse + pulse) % pulse;
          o.g += x * db20(tick(ph, 0.25 * pulse, fl, sr)); });
        return { layers, D };
      } };
  }
};

// ============================================================================================ CONSTELLATION (la vie des partiels)
CRISTAUX.constellation = {
  kind: 'xb', profile: [0.1, 0.3, 0.8, 0.3, 0.5, 0.6, 0.2, 0.1],
  relevance: T => T.tonal * Math.min(1, T.nHarm / 6),
  make (P, ctx, iota, variant) {
    const v = variant % 3, sr = P.sr, N = notesOf(P), ns = N.ns;
    if (v === 0) {
      // PARENTHÈSES (jgcompose _cf_brackets, Cage, Number Pieces : chaque son flotte dans une très large parenthèse, sa durée
      // devient indéterminée) — dans chaque note, chaque partiel ne sonne que dans SA fenêtre : largeur 1 − 0,85·dose de la
      // note, place {k·φ + i·φ²} (note i) ; bords en cosinus de 12 % de note ; dehors −(12 + 36·ι) dB. Le timbre devient une constellation
      // qui change à chaque note
      const fl = Math.pow(10, -(12 + 36 * iota) / 20);
      return { desc: `time brackets: every partial sounds only in its own window of each note, the windows shrinking with the dose`,
        apply (layers, D) {
          const R = rampOf(P, D, iota);
          addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const i = N.at(s); if (i < 0) return; const q = ns[i], u = (s - q.a) / Math.max(1, q.b - q.a);
            const w = 1 - 0.85 * d, c = w / 2 + (1 - w) * frac(h * PHI + i * PHI * PHI), dx = Math.abs(u - c) - w / 2;
            const win = dx <= 0 ? 1 : dx >= 0.12 ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * dx / 0.12); o.g += db20(fl + (1 - fl) * win); });
          return { layers, D };
        } };
    }
    if (v === 1) {
      // EFFRITEMENT (jgcompose _cf_effritement, Momi : la matière se POLARISE — ce qui est déjà long s'étire en résonance
      // fragile, ce qui est bref s'émiette en grain vers le pianissimo) — selon le déclin relevé de chaque rang : la moitié
      // qui tient compense son déclin (jusqu'à +12 dB, −3 dB de fragilité) ; l'autre (et les rangs au-delà du 24e) s'émiette :
      // grains d'un tiers de période (période ½ unité, 30–150 ms), chaque partiel décalé ({k·φ}), −(6 + 14·ι) dB
      const RF = rankFeatures(P), decs = RF.filter(f => f.n > 0).map(f => f.decay).sort((a, b) => a - b), mdec = decs.length ? decs[decs.length >> 1] : 0;
      const hold = new Set(RF.filter(f => f.n > 0 && f.decay >= mdec).map(f => f.k)), Pg = clamp(ctx.grid.unit / 2, 0.03 * sr, 0.15 * sr), fl = Math.pow(10, -30 / 20);
      return { desc: `crumbling: ${hold.size} holding partials stretched into fragile resonance, the others crumble into ${(Pg / sr * 1000).toFixed(0)} ms grains`,
        apply (layers, D) {
          const R = rampOf(P, D, iota);
          addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const x = d, i = N.at(s); if (i < 0) return; const tn = (s - ns[i].a) / sr;
            if (hold.has(h)) { const f = RF[h - 1]; o.g += x * (Math.min(12, Math.max(0, -f.decay * tn * 0.8)) - 3); return; }
            const ph = ((t + frac(h * PHI) * Pg) % Pg) / Pg, win = ph < 0.35 ? Math.sin(Math.PI * ph / 0.35) : 0;
            o.g += x * (db20(fl + (1 - fl) * win) - (6 + 14 * iota)); });
          return { layers, D };
        } };
    }
    // MA (jgcompose _cf_ma, shakuhachi : la phrase se tasse vers son début, le silence qui suit devient matière) — dans
    // chaque note les partiels se taisent tôt, l'aigu d'abord (le rang k s'éteint à 1 − x·(0,35 + 0,55·log₂k/5) de la note,
    // en 10 % de note) : le souffle, le bruit d'archet restent seuls jusqu'à la note suivante
    return { desc: `ma: in every note the partials fall silent early, the highest first, leaving the breath alone`,
      apply (layers, D) {
        const R = rampOf(P, D, iota);
        addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const rk = clamp(Math.log2(h) / 5, 0, 1), x = part(0.5 * (1 - rk), d); if (x <= 0) return; const i = N.at(s); if (i < 0) return; const q = ns[i], u = (s - q.a) / Math.max(1, q.b - q.a);
          const uk = 1 - x * (0.35 + 0.55 * rk); o.g -= 40 * smooth((u - uk) / 0.1); });
        return { layers, D };
      } };
  }
};

// ============================================================================================ BATTEMENT (les pôles des partiels)
CRISTAUX.battement = {
  kind: 'xb', profile: [0.5, 0.3, 0.6, 0.3, 0.3, 0.7, 0.0, 0.1],
  relevance: T => T.tonal * Math.min(1, T.nHarm / 5),
  make (P, ctx, iota, variant, tools) {
    const v = variant % 3, sr = P.sr, N = notesOf(P), ns = N.ns;
    if (v === 0) {
      // BATTEMENT (jgcompose _cf_battement, spectre instable / multiphonique : la voix oscille entre DEUX PÔLES VOISINS
      // ATTESTÉS) — le pôle voisin d'un partiel : la raie la plus proche de la carte des partiels du sujet (25 à 150 c, au moins
      // 5 % de la plus forte), sinon le degré voisin de la gamme ; chaque partiel trille entre lui et ce pôle au rythme du
      // vibrato relevé (sinon de l'unité, 3 à 9 Hz), chacun à sa phase ({k·φ})
      const pm = (tools && tools.partialMap ? tools.partialMap(P) : []), wmax = pm.length ? pm[0].w : 0;
      const map = pm.filter(p => p.w >= 0.05 * wmax).map(p => centsOf(p.hz)).sort((a, b) => a - b), sc = ctx.deg.scale || [];
      const rate = clamp(P.traits.vibRate > 2 ? P.traits.vibRate : sr / ctx.grid.unit, 3, 9), cache = new Map();
      const pole = c => {
        const key = Math.round(c / 2); if (cache.has(key)) return cache.get(key);
        let best = 0, bd = 1e9; for (const m of map) { const d = Math.abs(m - c); if (d >= 25 && d <= 150 && d < bd) { bd = d; best = m - c; } }
        if (!best && sc.length) { for (const m of sc) { const d = Math.abs(m - c); if (d >= 25 && d <= 250 && d < bd) { bd = d; best = m - c; } } }
        if (cache.size > 8000) cache.clear(); cache.set(key, best); return best;
      };
      return { desc: `beating: every partial trills at ${rate.toFixed(1)} Hz between itself and its nearest attested neighbour (${map.length} lines on the partial map)`,
        apply (layers, D) {
          const R = rampOf(P, D, iota);
          addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const x = part(frac(h * PHI), d); if (x <= 0) return; const dc = pole(centsOf(h * F)); if (!dc) return;
            const q = 0.5 + 0.5 * Math.tanh(3 * Math.sin(2 * Math.PI * (rate * t / sr + frac(h * PHI * PHI)))); o.r *= Math.pow(2, x * q * dc / 1200); });
          return { layers, D };
        } };
    }
    if (v === 1) {
      // HOMORYTHMIE (jgcompose _cf_homorythmie : les attaques tirées vers celles de la référence) — la référence, c'est
      // l'attaque de la note : le retard relevé de chaque partiel (rangs 1–24) est rattrapé (son enveloppe relue plus loin,
      // le rattrapage s'effaçant sur trois fois ce retard), les plus en retard d'abord. Si le sujet attaque déjà tous ses
      // partiels ensemble (retards ≤ 40 ms), sa forme sœur : l'HÉTÉROPHONIE — les partiels entrent l'un après l'autre,
      // (20 + 100·ι) ms du grave à l'aigu
      const RF = rankFeatures(P), maxLag = Math.max(0, ...RF.filter(f => f.n > 0).map(f => f.lag)), homo = maxLag > 40;
      const lagOf = h => (h <= 24 ? RF[h - 1].lag : 0) * sr / 1000, spread = (20 + 100 * iota) * sr / 1000, top = Math.log2(Math.min(64, Math.floor(16000 / Math.max(30, P.f0med || 200))) || 2);
      return { desc: homo ? `homorhythm: the partials' attack delays (up to ${maxLag.toFixed(0)} ms) caught up, every partial starting with the note` : `heterophony: the partials enter one after another, ${Math.round(spread / sr * 1000)} ms from bottom to top`,
        apply (layers, D) {
          const R = rampOf(P, D, iota);
          addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const i = N.at(s); if (i < 0) return; const tn = s - ns[i].a;
            if (homo) { const L = lagOf(h); if (L < 1) return; const x = part(1 - L / (maxLag * sr / 1000), d); if (x > 0) o.sh += x * L * Math.max(0, 1 - tn / (3 * L)); return; }
            const L = spread * clamp(Math.log2(h) / top, 0, 1); if (L < 1) return; const x = d; o.sh -= x * L * Math.max(0, 1 - tn / (3 * L)); });
          return { layers, D };
        } };
    }
    // ESCALIER (jgcompose _cf_escalier, l'escalier du diable : montée continue repliée par octaves, illusion de Shepard ; le
    // sens est celui de la pente attestée) — la lumière (une cloche large d'un tiers de l'étendue, en octaves de rang) monte
    // à travers les partiels d'une octave par cycle (la mesure, sinon 8 unités) et revient par le bas ; dehors −(12 + 18·ι) dB
    const lo = Math.max(1, Math.min(64, Math.floor(16000 / Math.max(30, P.f0med || 200)))), Lam = Math.max(2, Math.log2(lo)), W = Math.max(1, Lam / 3);
    let dir = 1; { const q = (P.notes || []).filter(n => n.f0 > 0); if (q.length >= 2) { let sx = 0, sy = 0, sxx = 0, sxy = 0; for (const n of q) { const x = n.t0, y = centsOf(n.f0); sx += x; sy += y; sxx += x * x; sxy += x * y; } const m = q.length, sl = (m * sxy - sx * sy) / (m * sxx - sx * sx + 1e-12); dir = sl < 0 ? -1 : 1; } }
    const Tc = ctx.grid.has ? ctx.grid.bar : clamp(8 * ctx.grid.unit, 1.2 * sr, 4 * sr), unwarp = unwarpOf(ctx.grid), fl = Math.pow(10, -(12 + 18 * iota) / 20);
    return { desc: `staircase: the light ${dir > 0 ? 'climbs' : 'falls'} endlessly through the partials, one octave every ${(Tc / sr).toFixed(2)} s`,
      apply (layers, D) {
        const R = rampOf(P, D, iota);
        addXb(layers, (h, t, F, s, o) => { const d = R.dose(t); if (d <= 0) return; const x = d, pos = frac(dir * unwarp(t) / Tc / Lam) * Lam;
          let dx = Math.abs(frac((Math.log2(h) - pos) / Lam + 0.5) - 0.5) * Lam; const bell = dx >= W ? 0 : Math.cos(0.5 * Math.PI * dx / W) ** 2;
          o.g += x * db20(fl + (1 - fl) * bell); });
        return { layers, D };
      } };
  }
};
