// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — les GESTES de mutation (échelle microscopique)
//  Le principe de jgcompose — une matière, des voix, des opérations d'écriture — appliqué à
//  l'intérieur d'UN son : les voix sont ses partiels, son souffle, ses attaques ; son rythme est
//  celui de ses attaques et de ses micro-fluctuations ; sa mélodie est l'ordre de ses rangs ;
//  sa forme est la succession de ses phases. Chaque geste est un PROCESSUS dans le temps
//  (éclosion, canon, hoquet, bascule, criblage…) dont les mouvements suivent des lois de corps
//  vivants (ressort amorti, décroissance, croissance harmonique) — jamais une rampe linéaire.
//  Toutes les valeurs viennent du son (grille du pouls, échelle du tuning, rangs, durées) ;
//  aucun tirage : une même entrée donne toujours les mêmes enfants.
// ============================================================================================
import { TimeMap, bodyAt, bodyGain } from './render.js';
import { H } from './synth.js';
import { hzOf, centsOf } from './microtonal.js';

// ---------------- outils ----------------
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const qH = x => Math.round(x / H) * H;                                     // placement à la trame (phase verrouillable)
/** ressort amorti de 0 à 1 (dépassement puis repos) : t en s, T = période propre, z = amortissement */
export function spring (t, T, z = 0.35) {
  if (t <= 0) return 0;
  const w = 2 * Math.PI / T, wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * t) * (Math.cos(wd * t) + z / Math.sqrt(1 - z * z) * Math.sin(wd * t));
}
const wrapFn = (S, key, f) => { const g = S[key]; S[key] = g ? (...a) => f(g(...a), ...a) : (...a) => f(a[2], ...a); };

/** la grille du parent : pouls s'il existe, sinon l'unité propre du son */
export function gridOf (M) {
  const sr = M.sr;
  if (M.tempo) {
    const beat = M.tempo.period * sr, phase = ((M.tempo.phase * sr) % beat + beat) % beat;
    return { has: true, beat, unit: beat / 4, bar: 4 * beat, phase, snap: t => phase + Math.round((t - phase) / (beat / 4)) * (beat / 4) };
  }
  // unité propre : écart médian entre attaques ; sinon deux périodes de vibrato ; sinon 1/8 de la durée active
  const ons = M.onsets.map(o => o.s).sort((a, b) => a - b), ioi = [];
  for (let i = 1; i < ons.length; ++i) if (ons[i] - ons[i - 1] > 0.06 * sr) ioi.push(ons[i] - ons[i - 1]);
  ioi.sort((a, b) => a - b);
  let unit = ioi.length >= 3 ? ioi[ioi.length >> 1] / 2 : (M.traits.vibRate > 2 ? 2 * sr / M.traits.vibRate : (M.traits.activeEnd - M.traits.activeStart) * sr / 8);
  unit = clamp(unit, 0.06 * sr, 0.6 * sr);
  return { has: false, beat: unit * 2, unit, bar: unit * 8, phase: 0, snap: t => Math.round(t / unit) * unit };
}

/** degrés du tuning (tous, sur toute la tessiture) et degrés de la gamme, en cents absolus */
export function degreesOf (M) {
  const t = M.tuning, root = M.fundamentalCents;
  if (!t || root === null) return { all: [], scale: [] };
  const p = t.period, all = [], scale = [], act = new Set(t.activeDegrees);
  for (let k = -12; k <= 12; ++k) t.degrees.forEach((d, i) => { const c = root + k * p + (((d % p) + p) % p); if (c > 2000 && c < 13000) { all.push(c); if (act.has(i)) scale.push(c); } });
  all.sort((a, b) => a - b); scale.sort((a, b) => a - b);
  return { all, scale };
}
const nearest = (arr, c) => { let lo = 0, hi = arr.length - 1; if (!arr.length) return c; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (arr[m] < c) lo = m; else hi = m; } return Math.abs(arr[lo] - c) <= Math.abs(arr[hi] - c) ? arr[lo] : arr[hi]; };

/** voix principales (énergie ≥ −50 dB de la plus forte) et rangs */
function principal (M) {
  const emax = Math.max(...M.voices.map(v => v.energy), 1e-30);
  return M.voices.filter(v => v.energy >= emax * 1e-5);
}
const meanCents = v => { let s = 0, w = 0; for (let q = 0; q < v.m; ++q) { const a = Math.pow(10, v.db[q] / 20); s += a * v.cents[q]; w += a; } return w ? s / w : v.cents[0]; };

// référence de hauteur par trame (fondamentale mesurée, sinon fondamentale dominante)
function f0CentsAt (M, jq) { const j = Math.round(jq * M.hop / 256); const f = M.f0.f0[j]; return f > 0 ? centsOf(f) : M.fundamentalCents; }

export function baseStratum (M) { return { map: TimeMap.identity(M.n), resid: { gain: 1 } }; }

// ============================================================================================
//  LES GESTES — chacun : (M, ctx, ι ∈ [0,1], variante) → { apply(strata, D) → { strata, D }, desc }
//  ctx = { grid, deg, ladder, axis }
// ============================================================================================
export const GESTES = {};

// 1 — ÉCLOSION : les partiels entrent tour à tour, en suivant la série harmonique (espacement en
//     log2 du rang : l'octave, puis la quinte, la quarte… s'ouvrent comme une fleur), calés sur la grille.
//     Chaque bande entre avec SA propre attaque et joue sa vie entière.
GESTES.eclosion = {
  cat: 'delay', profile: [0.1, 0.5, 0.7, 0.4, 0.6, 0.1, 0.1, 0.1],
  relevance: T => T.tonal * (0.4 + 0.6 * Math.min(1, T.nVoices / 12)),
  make (M, ctx, iota, variant) {
    const P = principal(M), K = Math.min(12, Math.max(3, Math.round(4 + 8 * iota)));
    const keyed = P.map(v => [v, v.harm || 0, meanCents(v)]);
    const cs = keyed.map(k => k[2]).sort((a, b) => a - b), lo = cs[0], hi = cs[cs.length - 1];
    // bande = rang harmonique (s'il existe) sinon position en cents, ramenée à K bandes
    const band = ([v, h, c]) => h ? Math.min(K - 1, Math.floor(Math.log2(h) * (K - 1) / Math.log2(Math.max(2, 32)))) : Math.min(K - 1, Math.floor((c - lo) / Math.max(1, hi - lo) * K));
    const order = b => variant === 1 ? K - 1 - b : variant === 2 ? Math.abs(b - (K - 1) / 2) * 2 : b;
    const span = Math.max(ctx.grid.unit * 4, ctx.grid.snap(iota * 1.4 * (M.traits.activeEnd - M.traits.activeStart) * M.sr));
    const bandOf = new Map(keyed.map(k => [k[0].id, band(k)]));
    const entry = b => qH(ctx.grid.snap(span * Math.log2(1 + order(b)) / Math.log2(1 + (K - 1)))) ;
    return { desc: `éclosion ${['montante', 'descendante', 'du centre'][variant % 3]} en ${K} bandes sur ${(span / M.sr).toFixed(2)} s`,
      apply (strata, D) {
        for (const S of strata) wrapFn(S, 'delay', (d, v) => (d || 0) + (bandOf.has(v.id) ? entry(bandOf.get(v.id)) : entry(K - 1)));
        return { strata, D: D + span };
      } };
  }
};

// 2 — CANON DE PROPORTION : le son contre lui-même, en augmentation (3/2, 2, 3) — les voix lentes
//     plus graves, posées sur les degrés de la gamme ; la vie reste à sa vitesse naturelle.
GESTES.canon = {
  cat: 'multiply', profile: [0.6, 0.7, 0.3, 0.6, 0.8, 0.2, 0.3, 0.3],
  relevance: T => 0.55 + 0.25 * Math.min(1, T.onsets / 6) + 0.2 * T.tonal,
  make (M, ctx, iota, variant) {
    // rapports de mensuration (durées ≤ ×2 : l'enfant reste jouable)
    const sets = [[1, 2 / 3, 1 / 2], [1, 3 / 4, 2 / 3, 1 / 2], [1, 4 / 5, 2 / 3, 1 / 2]];
    const rs0 = sets[variant % 3], N = clamp(2 + Math.round(iota * (rs0.length - 2)), 2, rs0.length), rs = rs0.slice(0, N);
    const lad = ctx.ladder || [0, 700, 1200, 1900];
    const down = i => { if (!i) return 0; const P = M.tuning ? M.tuning.period : 1200; const k = lad.length > 2 * i ? lad[2 * i] : 700 * i; return -(Math.ceil(k / P) * P - k) - (i > 1 ? P * Math.floor((i - 1) / 2) : 0); };
    const entryStep = ctx.grid.has ? ctx.grid.beat * (variant === 2 ? 2 : 1) : ctx.grid.unit * 2;
    return { desc: `canon de proportion ${rs.map(r => (1 / r).toFixed(2)).join(':')}, voix lentes aux degrés ${rs.map((_, i) => Math.round(down(i))).join('/')} c`,
      apply (strata, D) {
        const out = []; let D2 = D;
        rs.forEach((r, i) => {
          const off = qH(i * entryStep), shift = down(i), ratio = Math.pow(2, shift / 1200);
          for (const S0 of strata) {
            const S = { ...S0, gain: (S0.gain ?? 1) * Math.pow(10, -3 * i / 20) };
            const segs = S0.map.segs.map(s => ({ ...s, a: off + (s.a) / r, b: off + (s.b) / r }));
            S.map = new TimeMap(segs);
            if (shift) wrapFn(S, 'cents', c => c + shift);
            if (S.resid) S.resid = { ...S.resid, ratio: (S.resid.ratio ?? 1) * ratio, gain: (S.resid.gain ?? 1) * (i ? 0.7 : 1), map: S.resid.map ? new TimeMap(S.resid.map.segs.map(s => ({ ...s, a: off + s.a / r, b: off + s.b / r }))) : undefined };
            out.push(S);
          }
          D2 = Math.max(D2, off + D / r);
        });
        return { strata: out, D: Math.ceil(D2) };
      } };
  }
};

// 3 — HOQUET SPECTRAL : les partiels voisins se répondent (rangs pairs/impairs, ou trois familles) ;
//     chaque famille « parle » à son tour comme une résonance frappée (attaque 3 ms, déclin naturel),
//     les autres ne s'éteignent jamais tout à fait. Le souffle répond aux graves.
GESTES.hoquet = {
  cat: 'gate', profile: [0.1, 0.2, 0.7, 0.9, 0.3, 0.2, 0.3, 0.2],
  relevance: T => T.tonal * (0.6 + 0.4 * Math.min(1, T.nVoices / 10)),
  make (M, ctx, iota, variant) {
    const G = variant % 2 ? 3 : 2;
    const P = principal(M).map(v => [v, meanCents(v)]).sort((a, b) => a[1] - b[1]);
    const grp = new Map(P.map(([v], i) => [v.id, variant >= 2 ? Math.min(G - 1, Math.floor(i * G / P.length)) : i % G]));
    const step = ctx.grid.unit * (iota < 0.5 ? 2 : 1), floorDb = -(12 + 24 * iota), sr = M.sr;
    const tauD = step * (0.35 + 0.5 * (1 - iota)) / sr;
    const env = (tau, g) => {
      const k = Math.floor((tau - ctx.grid.phase) / step), t = (tau - ctx.grid.phase - k * step) / sr;
      if (((k % G) + G) % G !== g) return Math.pow(10, floorDb / 20);
      const att = Math.min(1, t / 0.003), dec = Math.exp(-t / tauD);
      return Math.pow(10, floorDb / 20) + (1 - Math.pow(10, floorDb / 20)) * att * (0.35 + 0.65 * dec);
    };
    return { desc: `hoquet en ${G} familles ${variant >= 2 ? 'de registre' : 'alternées'}, pas ${(step / sr * 1000).toFixed(0)} ms`,
      apply (strata, D) {
        for (const S of strata) {
          wrapFn(S, 'gate', (g, v, tau) => (g ?? 1) * env(tau, grp.get(v.id) ?? (v.id % G)));
          if (S.resid) { const g0 = S.resid.gate; S.resid = { ...S.resid, gate: tau => (g0 ? g0(tau) : 1) * env(tau, 0) }; }
        }
        return { strata, D };
      } };
  }
};

// 4 — CHANT DIPHONIQUE : une mélodie d'harmoniques — à chaque pas, le rang le plus proche d'un
//     degré de la gamme est mis en lumière (+dB) et les autres s'effacent, avec des glissements de
//     formant ; la mélodie suit le contour des notes du parent (ou une arche).
GESTES.chant = {
  cat: 'db', profile: [0.6, 0.2, 0.9, 0.5, 0.3, 0.2, 0.1, 0.1],
  relevance: T => Math.min(1, T.nHarm / 8) * T.tonal,
  make (M, ctx, iota, variant) {
    const harm = principal(M).filter(v => v.harm >= 3 && v.harm <= 24);
    const hs = [...new Set(harm.map(v => v.harm))].sort((a, b) => a - b);
    const scale = ctx.deg.scale;
    // candidats : rangs dont la hauteur (h·f0) tombe près d'un degré de la gamme
    const f0c = M.fundamentalCents ?? 6000;
    const cand = hs.filter(h => !scale.length || Math.abs(nearest(scale, f0c + 1200 * Math.log2(h)) - (f0c + 1200 * Math.log2(h))) < 45);
    const C = cand.length >= 3 ? cand : hs;
    // contour : notes du parent (rang de leur hauteur) sinon arche
    let contour = M.notes.length >= 3 ? M.notes.map(n => n.f0) : null;
    const L = Math.max(6, Math.min(16, C.length * 2));
    const seq = [];
    for (let k = 0; k < L; ++k) {
      let u;
      if (contour) { const c = contour[k % contour.length], mn = Math.min(...contour), mx = Math.max(...contour); u = mx > mn ? (c - mn) / (mx - mn) : 0.5; }
      else u = 1 - Math.abs(2 * k / (L - 1) - 1);
      if (variant === 1) u = 1 - u;
      seq.push(C[Math.round(u * (C.length - 1))]);
    }
    const step = ctx.grid.has ? ctx.grid.unit * 2 : Math.max(ctx.grid.unit, 0.12 * M.sr), glide = 0.25;
    const target = tau => { const x = tau / step, k = Math.floor(x), u = x - k; const a = seq[((k % L) + L) % L], b = seq[(((k + 1) % L) + L) % L]; const w = u < 1 - glide ? 0 : 0.5 - 0.5 * Math.cos(Math.PI * (u - (1 - glide)) / glide); return Math.log2(a) * (1 - w) + Math.log2(b) * w; };
    const boost = 6 + 12 * iota, cut = 6 + 18 * iota;
    return { desc: `chant diphonique sur les rangs ${seq.join('-')} (pas ${(step / M.sr * 1000).toFixed(0)} ms)`,
      apply (strata, D) {
        for (const S of strata) {
          wrapFn(S, 'db', (d, v, tau) => {
            if (!v.harm) return d - cut * 0.7;
            if (v.harm <= 2) return d - 6;
            const w = Math.exp(-0.5 * ((Math.log2(v.harm) - target(tau)) / 0.09) ** 2);
            return d + boost * w - cut * (1 - w);
          });
          if (S.resid) S.resid = { ...S.resid, gain: (S.resid.gain ?? 1) * 0.5 };
        }
        return { strata, D: Math.max(D, Math.ceil(L * step)) };
      } };
  }
};

// 5 — MIROIR SPECTRAL : le spectre se retourne autour de la fondamentale (série harmonique →
//     série d'harmoniques inférieurs) ; chaque partiel bascule avec un ressort amorti, les aigus
//     plus tard ; le corps (enveloppe spectrale) reste en place : la voix change de squelette.
GESTES.miroir = {
  cat: 'pitch', profile: [1.0, 0.1, 0.8, 0.0, 0.2, 0.2, 0.1, 0.1],
  relevance: T => T.tonal,
  make (M, ctx, iota, variant) {
    const axis = variant === 1 && ctx.ladder ? M.fundamentalCents + ctx.ladder[Math.min(ctx.ladder.length - 1, 4)] : M.fundamentalCents ?? 6000;
    const sr = M.sr, T0 = variant === 2 ? 0 : 0.08 * M.n / sr, Tsp = 0.25 + 0.6 * (1 - iota);
    const P = principal(M), cs = P.map(meanCents), lo = Math.min(...cs), hi = Math.max(...cs);
    const lam = (v, tau) => variant === 2 ? 1 : spring(tau / sr - T0 - 0.35 * (meanCents(v) - lo) / Math.max(1, hi - lo) * M.n / sr * iota, Tsp);
    const amount = 0.5 + 0.5 * iota;
    const cmin = centsOf(28), cmax = centsOf(16000);
    return { desc: `miroir spectral autour de ${Math.round(axis)} c${variant === 2 ? ' (immédiat)' : ''}, corps conservé`,
      apply (strata, D) {
        const cache = new Map(); const mc = v => { if (!cache.has(v.id)) cache.set(v.id, meanCents(v)); return cache.get(v.id); };
        for (const S of strata) {
          wrapFn(S, 'cents', (c, v, tau) => { const l = variant === 2 ? 1 : spring(tau / sr - T0 - 0.35 * (mc(v) - lo) / Math.max(1, hi - lo) * M.n / sr * iota, Tsp); return c + amount * l * (2 * axis - 2 * c); });
          wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => { const B = bodyAt(M, jq); let o = d + bodyGain(B, c, c2, 0.8); if (c2 < cmin || c2 > cmax) o -= 60; return o; });
          if (S.resid) S.resid = { ...S.resid, gain: (S.resid.gain ?? 1) * 0.7 };
        }
        void lam;
        return { strata, D };
      } };
  }
};

// 6 — CRIBLE : le timbre s'accorde sur la gamme déduite — chaque partiel est attiré vers le degré
//     le plus proche (ressort), ceux qui tombent entre deux degrés s'effacent ; la vie se calme.
GESTES.crible = {
  cat: 'pitch', profile: [0.8, 0.1, 0.6, 0.0, 0.1, 0.4, 0.2, 0.0],
  relevance: T => T.tonal * 0.9,
  make (M, ctx, iota, variant) {
    const sc = variant === 1 ? ctx.deg.all : ctx.deg.scale;
    if (!sc.length) return null;
    const sr = M.sr, Tsp = 0.3 + 0.5 * (1 - iota), pull = Math.min(1, 0.45 + 0.55 * iota);
    const P = principal(M), cs = P.map(meanCents), lo = Math.min(...cs), hi = Math.max(...cs);
    const stepC = sc.length > 1 ? (sc[sc.length - 1] - sc[0]) / (sc.length - 1) : 100;
    const cache = new Map(); const mc = v => { if (!cache.has(v.id)) cache.set(v.id, meanCents(v)); return cache.get(v.id); };
    const lam = (v, tau) => spring(tau / sr - 0.05 - 0.5 * (mc(v) - lo) / Math.max(1, hi - lo) * Math.min(1.5, M.n / sr * 0.4), Tsp);
    return { desc: `crible sur ${variant === 1 ? 'le tuning entier' : 'la gamme'} (${M.tuning?.name}), attraction ${Math.round(pull * 100)} %`,
      apply (strata, D) {
        for (const S of strata) {
          S.life = { ...(S.life || {}), cents: (S.life?.cents ?? 1) * (1 - 0.6 * iota) };
          wrapFn(S, 'cents', (c, v, tau) => { const t = nearest(sc, c); return c + pull * lam(v, tau) * (t - c); });
          wrapFn(S, 'db', (d, v, tau, d0, jq, c) => { const dist = Math.abs(nearest(sc, c) - c); return d - (6 + 18 * iota) * lam(v, tau) * clamp((dist / stepC - 0.2) / 0.3, 0, 1); });
          if (S.resid) S.resid = { ...S.resid, gain: (S.resid.gain ?? 1) * (1 - 0.5 * iota) };
        }
        return { strata, D };
      } };
  }
};

// 7 — ÉTIREMENT : la série harmonique se dilate (cloche) ou se contracte (gong grave) : f_h = f1·h^(1+s) ;
//     les modes aigus s'éteignent plus vite, comme dans un corps de métal.
GESTES.etirement = {
  cat: 'pitch', profile: [0.7, 0.2, 0.8, 0.0, 0.1, 0.2, 0.0, 0.0],
  relevance: T => T.tonal * (0.5 + 0.5 * Math.min(1, T.nHarm / 6)),
  make (M, ctx, iota, variant) {
    const s = (variant === 1 ? -1 : 1) * (0.04 + 0.22 * iota), sr = M.sr, axis = M.fundamentalCents ?? 6000;
    const start = new Map(M.voices.map(v => [v.id, (v.startAt ?? v.j0 * M.hop)]));
    return { desc: `étirement ${s > 0 ? 'en cloche' : 'en gong'} (exposant ${(1 + s).toFixed(3)}), décroissance des modes aigus`,
      apply (strata, D) {
        for (const S of strata) {
          wrapFn(S, 'cents', (c, v, tau, c0, jq) => { const ref = v.harm ? f0CentsAt(M, jq) : axis; return ref + (c - ref) * (1 + s); });
          wrapFn(S, 'db', (d, v, tau, d0, jq, c) => { const t = Math.max(0, (jq * M.hop - start.get(v.id)) / sr); return d - 9 * iota * t * Math.max(0, (c - axis) / 1200); });
        }
        return { strata, D };
      } };
  }
};

// 8 — VIE AMPLIFIÉE : la caricature du vivant — vibrato, trémolo, micro-dérives du son multipliés,
//     leur vitesse changée ; le trémolo gagne la hauteur (le son tremble dans son propre rythme) ;
//     le geste peut s'étirer pendant que la vie garde sa vitesse naturelle.
GESTES.vie = {
  cat: 'life', profile: [0.5, 0.4, 0.2, 0.2, 0.2, 1.0, 0.1, 0.1],
  relevance: T => 0.3 + 0.7 * Math.min(1, T.lifeCents / 6 + T.lifeDb / 2.5) * T.tonal,
  make (M, ctx, iota, variant) {
    const rate = [0.5, 1.6, 0.75][variant % 3], kc = 1 + 7 * iota, kd = 1 + 2 * iota, cross = 6 * iota;
    return { desc: `vie ×${kc.toFixed(1)} (hauteur) ×${kd.toFixed(1)} (dynamique), cadence ×${rate}, trémolo→hauteur ${cross.toFixed(1)} c/dB`,
      apply (strata, D) {
        for (const S of strata) {
          S.life = { cents: (S.life?.cents ?? 1) * kc, db: (S.life?.db ?? 1) * kd, rate };
          wrapFn(S, 'cents', (c, v, tau, c0, jq, dLife) => c + cross * (dLife || 0));
        }
        return { strata, D };
      } };
  }
};

// 9 — CORPS CARICATURÉ : les formants du son sont creusés/gonflés (contraste ×k autour de la pente
//     générale) et le corps glisse (géant ou minuscule) sans que la hauteur bouge.
GESTES.corps = {
  cat: 'db', profile: [0.0, 0.0, 1.0, 0.0, 0.0, 0.1, 0.2, 0.0],
  relevance: T => T.tonal * Math.min(1, T.nVoices / 8),
  make (M, ctx, iota, variant) {
    const k = 1 + 2.5 * iota, shift = (variant === 1 ? 1 : -1) * (200 + 900 * iota);
    return { desc: `corps caricaturé : contraste ×${k.toFixed(2)}, corps ${shift > 0 ? 'minuscule' : 'géant'} (${Math.round(shift)} c)`,
      apply (strata, D) {
        for (const S of strata) wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => { const B = bodyAt(M, jq); const t = B.tilt(c2); let o = t + (d - t) * k; o += bodyGain(B, c2, c2 - shift); return Math.max(d - 30, Math.min(o, d + 15)); });
        return { strata, D };
      } };
  }
};

// 10 — RÉTROGRADE DES VIES : chaque partiel garde sa hauteur mais vit son enveloppe à rebours (les
//      déclins deviennent des gonflements) ; le souffle de chaque intervalle entre attaques est joué
//      à l'envers, si bien que chaque coup est ASPIRÉ jusqu'à l'attaque suivante, sur la grille.
GESTES.retro = {
  cat: 'map', profile: [0.1, 0.6, 0.4, 0.5, 0.6, 0.3, 0.7, 0.1],
  relevance: T => 0.45 + 0.35 * Math.min(1, T.sharpOnsets / 4) + 0.2 * (1 - T.tonal),
  make (M, ctx, iota, variant) {
    const ons = [0, ...M.onsets.filter(o => o.sharp || variant === 1).map(o => o.s), M.n].sort((a, b) => a - b);
    const bnd = ons.filter((x, i) => !i || x - ons[i - 1] > 0.05 * M.sr);
    const segs = []; for (let i = 0; i + 1 < bnd.length; ++i) segs.push({ a: bnd[i], b: bnd[i + 1], sa: bnd[i + 1], sb: bnd[i], sharpB: true });
    return { desc: `rétrograde des vies (${segs.length} intervalles aspirés)`,
      apply (strata, D) {
        for (const S of strata) {
          wrapFn(S, 'db', (d, v, tau, d0, jq) => { const q = Math.round(jq - v.j0); const qr = clamp(v.m - 1 - q, 0, v.m - 1); const mix = 0.5 + 0.5 * iota; return d + mix * (v.dbTrend[qr] - v.dbTrend[clamp(q, 0, v.m - 1)]); });
          if (S.resid) S.resid = { ...S.resid, map: new TimeMap(segs) };
        }
        return { strata, D };
      } };
  }
};

// 11 — AKSAK : la mesure boite — les croches sont regroupées en valeurs inégales (3+3+2, 2+2+3…),
//      la carte du temps se plie continûment (aucune coupure), la vie garde sa cadence.
GESTES.aksak = {
  cat: 'map', profile: [0.0, 0.7, 0.0, 1.0, 0.4, 0.1, 0.3, 0.0],
  relevance: T => (T.tempoBpm ? 0.9 : 0.35) * (0.5 + 0.5 * Math.min(1, T.onsets / 6)),
  make (M, ctx, iota, variant) {
    const pats = [[3, 3, 2], [2, 2, 3], [3, 2, 2, 3, 2]];
    const pat = pats[variant % 3], u = ctx.grid.beat / 2, a = 0.12 + 0.3 * iota;
    // durées de sortie des croches : les groupes longs s'étirent, les courts se serrent (mesure conservée)
    const w = []; for (const g of pat) for (let k = 0; k < g; ++k) w.push(g >= 3 ? (k === 0 ? 1 + a : 1 - a * 0.25) : (k === 0 ? 1 + a * 0.5 : 1 - a * 0.5));
    const sum = w.reduce((x, y) => x + y, 0); for (let i = 0; i < w.length; ++i) w[i] *= w.length / sum;
    const segs = []; let t = 0, s = 0, i = 0;
    const ph = ctx.grid.phase % u;
    if (ph > 0) { segs.push({ a: 0, b: ph, sa: 0, sb: ph }); t = ph; s = ph; }
    while (s < M.n) { const len = u * w[i % w.length]; segs.push({ a: t, b: t + len, sa: s, sb: s + u }); t += len; s += u; i += 1; }
    return { desc: `aksak ${pat.join('+')} (écart ${Math.round(a * 100)} %)`,
      apply (strata, D) {
        for (const S of strata) S.map = new TimeMap(segs);
        return { strata, D: Math.ceil(t) };
      } };
  }
};

// 12 — SPIRALE : glissando relayé (Shepard-Risset) sur les partiels du son lui-même — tout monte
//      (ou descend) sans fin d'un degré de la gamme par cycle de grille ; le corps reste, la hauteur spirale.
GESTES.spirale = {
  cat: 'multiply', profile: [0.9, 0.2, 0.5, 0.3, 0.3, 0.3, 0.0, 0.2],
  relevance: T => T.tonal,
  make (M, ctx, iota, variant) {
    const lad = ctx.ladder || [0, 200, 400, 700];
    const I0 = variant === 2 ? 1200 : (lad.find(x => x >= (iota > 0.6 ? 350 : 80)) || 200);
    const I = (variant === 1 ? -1 : 1) * I0;
    const T = ctx.grid.has ? ctx.grid.bar / (iota > 0.7 ? 2 : 1) : Math.max(0.8 * M.sr, ctx.grid.unit * 8);
    const phi = tau => ((tau / T) % 1 + 1) % 1;
    return { desc: `spirale ${I > 0 ? 'ascendante' : 'descendante'} de ${Math.round(Math.abs(I))} c par cycle de ${(T / M.sr).toFixed(2)} s`,
      apply (strata, D) {
        const out = [];
        for (const S0 of strata) {
          const A = { ...S0 }, B = { ...S0, resid: null };
          wrapFn(A, 'cents', (c, v, tau) => c + phi(tau) * I);
          wrapFn(B, 'cents', (c, v, tau) => c + (phi(tau) - 1) * I);
          wrapFn(A, 'gate', (g, v, tau) => (g ?? 1) * Math.cos(Math.PI / 2 * phi(tau)));
          wrapFn(B, 'gate', (g, v, tau) => (g ?? 1) * Math.sin(Math.PI / 2 * phi(tau)));
          for (const X of [A, B]) wrapFn(X, 'db', (d, v, tau, d0, jq, c, c2) => { const Bd = bodyAt(M, jq); return d + bodyGain(Bd, c, c2, 0.7); });
          out.push(A, B);
        }
        return { strata: out, D };
      } };
  }
};

// 13 — ÉCHO SPECTRAL : le son se répète sur la grille, chaque écho monté d'un degré de la gamme
//      (spirale d'échos) et assombri comme par l'air — les aigus meurent d'écho en écho.
GESTES.echo = {
  cat: 'multiply', profile: [0.5, 0.5, 0.4, 0.6, 0.6, 0.1, 0.3, 0.6],
  relevance: T => 0.55 + 0.3 * Math.min(1, T.onsets / 5) + 0.15 * T.tonal,
  make (M, ctx, iota, variant) {
    const K = 2 + Math.round(2 * iota), lad = ctx.ladder || [0, 200, 400, 500, 700, 900];
    const dl = qH(ctx.grid.has ? ctx.grid.unit * (variant === 1 ? 2 : 3) : ctx.grid.unit * 3);
    const axis = M.fundamentalCents ?? 6000, stepDeg = variant === 2 ? -1 : 1;
    return { desc: `écho spectral ×${K}, ${(dl / M.sr * 1000).toFixed(0)} ms, ${stepDeg > 0 ? 'montant' : 'descendant'} d'un degré par écho`,
      apply (strata, D) {
        const out = [...strata];
        for (let k = 1; k <= K; ++k) {
          const sh = stepDeg > 0 ? lad[Math.min(lad.length - 1, k)] : -(1200 - lad[Math.max(0, lad.length - k) % lad.length]) - 1200 * Math.floor((k - 1) / Math.max(1, lad.length));
          for (const S0 of strata) {
            const S = { ...S0, gain: (S0.gain ?? 1) * Math.pow(10, -(4 + 2 * k) / 20) };
            S.delay = S0.delay ? (v) => S0.delay(v) + k * dl : () => k * dl;
            wrapFn(S, 'cents', c => c + sh);
            wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => d - k * 4 * Math.max(0, (c2 - axis) / 1200));
            if (S.resid) {
              const r0 = S0.resid, map0 = r0.map || S0.map;
              S.resid = { ...r0, ratio: (r0.ratio ?? 1) * Math.pow(2, sh / 1200), gain: (r0.gain ?? 1) * Math.pow(0.5, k), map: new TimeMap(map0.segs.map(s => ({ ...s, a: s.a + k * dl, b: s.b + k * dl }))) };
            }
            out.push(S);
          }
        }
        return { strata: out, D: D + K * dl };
      } };
  }
};

// 14 — ROTATION : les phrases du son (entre ses attaques) sont permutées — rotation, rétrograde de
//      l'ordre, entrelacement — chaque fragment lu à l'endroit, posé sur un degré qui monte.
GESTES.rotation = {
  cat: 'map', profile: [0.3, 0.4, 0.1, 0.7, 1.0, 0.0, 0.4, 0.0],
  relevance: T => Math.min(1, Math.max(T.sharpOnsets, T.notes, T.onsets / 2) / 4),
  make (M, ctx, iota, variant) {
    // coupes : attaques raides (≥ 3), sinon débuts de notes (≥ 3), sinon toutes les attaques ;
    // seule une coupe sur attaque raide démarre net, les autres sont enchaînées (13 ms)
    const sharpSet = new Set(M.onsets.filter(o => o.sharp).map(o => o.s));
    let cut = [...sharpSet];
    if (cut.length < 3 && M.notes.length >= 3) cut = M.notes.map(q => Math.round(q.t0 * M.sr));
    if (cut.length < 3) cut = M.onsets.map(o => o.s);
    // seulement la zone active ; chaque fragment perd sa queue morte (au-delà de 80 ms sous −40 dB du
    // pic) et un fragment muet disparaît — sinon le silence final du parent devenait un long silence
    // AVANT le son (mesuré : 4,0 s de silence initial sur 5 enfants de synth plant)
    const a0 = Math.round(M.traits.activeStart * M.sr), a1 = Math.round(M.traits.activeEnd * M.sr);
    cut = [a0, ...cut.filter(x => x > a0 + 0.03 * M.sr && x < a1 - 0.03 * M.sr), a1].sort((a, b) => a - b).filter((x, i, a) => !i || x - a[i - 1] > 0.04 * M.sr);
    const alive = s => { const b = Math.floor(s / (0.01 * M.sr)); return b < M.env.length && M.env[b] >= M.peakDb - 40; };
    const segs = [];
    for (let i = 0; i + 1 < cut.length; ++i) {
      let e = cut[i + 1], last = -1;
      for (let s = cut[i]; s < e; s += Math.round(0.01 * M.sr)) if (alive(s)) last = s;
      if (last < 0) continue;
      e = Math.min(e, last + Math.round(0.09 * M.sr));
      if (e - cut[i] > 0.04 * M.sr) segs.push([cut[i], e]);
    }
    const K = segs.length; if (K < 3) return null;
    let order;
    if (variant === 0) { const r = Math.ceil(K / 3); order = segs.map((_, i) => (i + r) % K); }
    else if (variant === 1) order = segs.map((_, i) => K - 1 - i);
    else { order = []; for (let i = 0; i < Math.ceil(K / 2); ++i) { order.push(i); if (K - 1 - i !== i) order.push(K - 1 - i); } }
    const lad = ctx.ladder || [0, 200, 400, 500, 700];
    const out = []; let t = 0;
    order.forEach((k, i) => { const [a, b] = segs[k]; out.push({ a: t, b: t + (b - a), sa: a, sb: b, sharpA: sharpSet.has(a), deg: iota > 0.45 ? lad[Math.min(lad.length - 1, i)] % 1300 : 0 }); t += b - a; });
    const map = new TimeMap(out);
    return { desc: `rotation des ${K} fragments (${['décalage', 'rétrograde de l\'ordre', 'entrelacement'][variant % 3]})${iota > 0.45 ? ', montée par degrés' : ''}`,
      apply (strata, D) {
        for (const S of strata) {
          S.map = map;
          if (iota > 0.45) wrapFn(S, 'cents', (c, v, tau) => { const i = map.seg(tau); return c + (i >= 0 ? map.segs[i].deg : 0); });
        }
        return { strata, D: Math.ceil(t) };
      } };
  }
};

// 15 — STASE VIVANTE : au moment le plus riche, le geste s'arrête presque (il rampe) et le son RESPIRE
//      — vibrato, battements, souffle continuent à leur vitesse — puis repart.
GESTES.stase = {
  cat: 'map', profile: [0.1, 0.9, 0.3, 0.3, 0.7, 0.6, 0.4, 0.1],
  relevance: T => T.tonal * 0.7 + 0.3,
  make (M, ctx, iota, variant) {
    // instant le plus riche : nombre de partiels × énergie, dans les 70 % premiers de la zone active
    const hop = M.hop, nf = Math.ceil(M.n / hop), rich = new Float64Array(nf);
    for (const v of M.voices) for (let q = 0; q < v.m; ++q) rich[v.j0 + q] += Math.pow(10, v.db[q] / 20);
    const a0 = Math.floor(M.traits.activeStart * M.sr / hop), a1 = Math.floor((M.traits.activeStart + 0.7 * (M.traits.activeEnd - M.traits.activeStart)) * M.sr / hop);
    let best = a0; for (let j = a0; j <= a1; ++j) if (rich[j] > rich[best]) best = j;
    const ts = qH(best * hop), eps = 0.03, Tf = qH(ctx.grid.has ? ctx.grid.bar * (1 + Math.round(2 * iota)) : (1 + 3 * iota) * M.sr);
    const segs = [{ a: 0, b: ts, sa: 0, sb: ts }, { a: ts, b: ts + Tf, sa: ts, sb: ts + eps * Tf }, { a: ts + Tf, b: ts + Tf + (M.n - ts - eps * Tf), sa: ts + eps * Tf, sb: M.n }];
    return { desc: `stase vivante à ${(ts / M.sr).toFixed(2)} s pendant ${(Tf / M.sr).toFixed(2)} s`,
      apply (strata, D) {
        for (const S of strata) S.map = new TimeMap(segs);
        return { strata, D: Math.ceil(segs[2].b) };
      } };
  }
};

// 16 — SYNTHÈSE INVERSÉE : le souffle chante — l'énergie du résidu, bande par bande autour de chaque
//      degré de la gamme, devient des voix tenues (un chœur fait de sa respiration) ; les partiels,
//      eux, se retirent.
GESTES.inversee = {
  cat: 'multiply', profile: [0.4, 0.1, 0.8, 0.1, 0.2, 0.3, 1.0, 0.2],
  relevance: T => 0.25 + 0.75 * (1 - T.tonal),
  make (M, ctx, iota, variant) {
    const sc = ctx.deg.scale.length ? ctx.deg.scale : ctx.deg.all;
    if (!sc.length) return null;
    const voices = breathVoices(M, sc.filter(c => c > centsOf(60) && c < centsOf(9000)));
    if (!voices.length) return null;
    return { desc: `synthèse inversée : ${voices.length} voix chantées par le souffle, partiels −${Math.round(12 * iota)} dB`,
      apply (strata, D) {
        for (const S of strata) { S.gain = (S.gain ?? 1) * Math.pow(10, -12 * iota / 20); if (S.resid) S.resid = { ...S.resid, gain: (S.resid.gain ?? 1) * (1 - 0.6 * iota) / Math.pow(10, -12 * iota / 20) }; }
        const B = { map: strata[0].map, voicesOverride: voices, resid: null, gain: 0.5 + 0.5 * iota };
        return { strata: [...strata, B], D };
      } };
  }
};

// voix « chantées » par le résidu : énergie par bande (±½ degré) autour de chaque degré, trame 128
import { fft } from './fft.js';
function breathVoices (M, degs) {
  const N = 2048, hop = M.hop, [RL, RR] = M.resid, sr = M.sr, n = M.n;
  const w = new Float64Array(N); for (let i = 0; i < N; ++i) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const nf = Math.ceil(n / hop), bands = degs.map((c, i) => { const lo = i ? (c + degs[i - 1]) / 2 : c - 50, hi = i + 1 < degs.length ? (c + degs[i + 1]) / 2 : c + 50; return [Math.max(1, Math.floor(hzOf(lo) / sr * N)), Math.ceil(hzOf(hi) / sr * N)]; });
  const EL = degs.map(() => new Float64Array(nf)), ER = degs.map(() => new Float64Array(nf));
  const re = new Float64Array(N), im = new Float64Array(N), re2 = new Float64Array(N), im2 = new Float64Array(N);
  for (let j = 0; j < nf; ++j) {
    const c = j * hop;
    for (let i = 0; i < N; ++i) { const s = c - N / 2 + i; const ok = s >= 0 && s < n; re[i] = ok ? RL[s] * w[i] : 0; im[i] = 0; re2[i] = ok ? RR[s] * w[i] : 0; im2[i] = 0; }
    fft(re, im); fft(re2, im2);
    bands.forEach(([a, b], k) => { let eL = 0, eR = 0; for (let q = a; q <= Math.min(b, N / 2); ++q) { eL += re[q] * re[q] + im[q] * im[q]; eR += re2[q] * re2[q] + im2[q] * im2[q]; } EL[k][j] = Math.sqrt(eL) * 2 / (N / 2); ER[k][j] = Math.sqrt(eR) * 2 / (N / 2); });
  }
  const out = [];
  degs.forEach((c, k) => {
    let mx = 0; for (let j = 0; j < nf; ++j) mx = Math.max(mx, EL[k][j], ER[k][j]);
    if (mx < 1e-5) return;
    const m = nf, cents = new Float64Array(m).fill(c), db = new Float64Array(m), pan = new Float64Array(m), aL = new Float64Array(m), aR = new Float64Array(m);
    for (let j = 0; j < m; ++j) { const a = Math.hypot(EL[k][j], ER[k][j]); db[j] = 20 * Math.log10(a + 1e-9); pan[j] = Math.atan2(ER[k][j], EL[k][j]) / (Math.PI / 2); aL[j] = EL[k][j]; aR[j] = ER[k][j]; }
    // la vie de la voix = la fluctuation de sa bande (lissée à 20 Hz pour rester une voix)
    const sm = new Float64Array(m); let acc = db[0]; const al = Math.exp(-2 * Math.PI * 20 / (sr / hop));
    for (let j = 0; j < m; ++j) { acc = al * acc + (1 - al) * db[j]; sm[j] = acc; }
    for (let j = m - 1, a2 = sm[m - 1]; j >= 0; --j) { a2 = al * a2 + (1 - al) * sm[j]; sm[j] = a2; }
    out.push({ id: 100000 + k, j0: 0, m, f: cents.map(hzOf), aL, aR, pL: null, ipd: new Float64Array(m), adv: null, cents, db: sm, pan, centsTrend: cents, dbTrend: sm, harm: 0, synthetic: true, energy: 0 });
  });
  return out;
}

// ---------------- ESPACE (geste secondaire) : échange des voix — les registres traversent la scène ----------------
GESTES.espace = {
  cat: 'pan', profile: [0.0, 0.1, 0.1, 0.2, 0.1, 0.1, 0.0, 1.0],
  relevance: () => 0.5,
  make (M, ctx, iota, variant) {
    const T = ctx.grid.has ? ctx.grid.bar : 2 * M.sr, P = principal(M), cs = P.map(meanCents), lo = Math.min(...cs), hi = Math.max(...cs);
    const cache = new Map(P.map((v, i) => [v.id, (cs[i] - lo) / Math.max(1, hi - lo)]));
    return { desc: `espace : les registres traversent la scène (cycle ${(T / M.sr).toFixed(2)} s)`,
      apply (strata, D) {
        for (const S of strata) wrapFn(S, 'pan', (p, v, tau) => { const r = cache.get(v.id) ?? 0.5; const ph = 2 * Math.PI * (tau / T + (variant ? r : r * 0.5)); return clamp(0.5 + (p - 0.5) * (1 - iota) + 0.45 * iota * Math.sin(ph), 0, 1); });
        return { strata, D };
      } };
  }
};

export const DIMENSIONS = ['hauteur', 'temps', 'spectre', 'rythme', 'forme', 'vie', 'souffle', 'espace'];
