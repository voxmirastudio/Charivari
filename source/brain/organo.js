// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — MUTATIONS GÉNÉTIQUES : l'instrument lui-même change
//  Le son mesuré est lu comme un instrument réel : une SOURCE (le joueur : souffle, lèvres,
//  archet, frappe — les amplitudes des partiels rapportées au corps, la vie, le souffle), un CORPS
//  (l'enveloppe spectrale : les résonances du tube, de la caisse, du pavillon), un RAYONNEMENT
//  (d'où le son sort, dans quelle direction), un MODE DE JEU (attaques, tenues, articulation).
//  Un enfant est le même son joué par un instrument dont un gène a muté : trois fois plus grand,
//  deux pavillons, une sourdine, un joueur qui chuchote, un tube fermé, un corps de verre, une
//  section de cinq joueurs… Chaque mutation suit la physique de sa cause (un corps agrandi abaisse
//  ses résonances et résonne plus longtemps ; une sourdine est un filtre et une résonance ; un
//  chuchotement fait passer l'énergie des partiels dans le souffle, bande par bande), et toutes ses
//  valeurs viennent du son (formant principal mesuré, échelle du tuning, vibrato, grille).
//  Les filtres (sourdines) sont les réponses du SVF Simper/TPT de Balance Stain, appliquées
//  exactement : aux partiels (gain à leur fréquence) et aux bandes du souffle (gain à leur centre).
// ============================================================================================
import { TimeMap, bodyAt, bodyGain } from './render.js';
import { H } from './synth.js';
import { hzOf, centsOf } from './microtonal.js';
import { BANDS } from './souffle.js';
import { spring } from './genes.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const db20 = x => 20 * Math.log10(Math.max(1e-6, x));
const qH = x => Math.round(x / H) * H;
const wrapFn = (S, key, f) => { const g = S[key]; S[key] = g ? (...a) => f(g(...a), ...a) : (...a) => f(a[2], ...a); };
const wrapNoise = (S, f) => { const g = S.noiseDb; S.noiseDb = g ? (b, fb, tau, jq) => g(b, fb, tau, jq) + f(b, fb, tau, jq) : f; };
const wrapGate = (S, key, f) => { const g = S[key]; S[key] = g ? (...a) => g(...a) * f(...a) : f; };

// réponses (prototype analogique du SVF de Balance Stain) : x = f/fc
const svf = {
  lp: (f, fc, Q) => { const x = f / fc; return 1 / Math.sqrt((1 - x * x) ** 2 + (x / Q) ** 2); },
  hp: (f, fc, Q) => { const x = f / fc; return x * x / Math.sqrt((1 - x * x) ** 2 + (x / Q) ** 2); },
  bp: (f, fc, Q) => { const x = f / fc; return (x / Q) / Math.sqrt((1 - x * x) ** 2 + (x / Q) ** 2); }
};

/** formants du parent : pics de l'enveloppe moyenne des partiels (300 Hz – 6 kHz) */
export function formantsOf (M) {
  const nb = BANDS.length, acc = new Float64Array(nb);
  for (let b = 0; b < nb; ++b) { const pb = M.partBands[b]; let s = 0; for (const x of pb) s += x * x; acc[b] = Math.sqrt(s / pb.length); }
  // lissage 1/3 d'octave
  const sm = acc.map((_, b) => { let s = 0, w = 0; for (let k = -2; k <= 2; ++k) { const i = b + k; if (i >= 0 && i < nb) { const ww = 1 - Math.abs(k) / 3; s += ww * acc[i]; w += ww; } } return s / w; });
  const peaks = [];
  for (let b = 1; b < nb - 1; ++b) if (sm[b] > sm[b - 1] && sm[b] >= sm[b + 1] && BANDS[b] > 250 && BANDS[b] < 6500) peaks.push([BANDS[b], sm[b]]);
  peaks.sort((a, b) => b[1] - a[1]);
  return peaks.length ? peaks.slice(0, 3).map(p => p[0]) : [1200];
}

/** rang harmonique d'une voix à une trame (étiquette, sinon f / f0 mesurée) */
function rankAt (M, v, jq, c) {
  if (v.harm) return v.harm;
  const j = Math.round(jq * M.hop / 256), f0 = M.f0.f0[j] > 0 ? M.f0.f0[j] : M.fundamentalHz;
  if (!(f0 > 0)) return 0;
  const r = hzOf(c) / f0, h = Math.round(r);
  return h >= 1 && Math.abs(1200 * Math.log2(r / h)) < 35 ? h : 0;
}
// décalage de hauteur posé sur la gamme : le degré du tuning le plus proche de `c` cents (signé)
function onScale (ctx, c) {
  const lad = ctx.ladder, P = ctx.period || 1200;
  if (!lad || !lad.length) return c;
  const oct = Math.floor(c / P), r = c - oct * P;
  let best = 0, bd = 1e9; for (const d of [...lad.map(x => x % P), P]) if (Math.abs(d - r) < bd) { bd = Math.abs(d - r); best = d; }
  return oct * P + best;
}

export const ORGANO = {};

// ---------------------------------------------------------------------------------------------
// TAILLE — l'instrument grandit (ou rapetisse). Corps relu en f·k (ses résonances descendent d'un
// facteur k), hauteur jouée abaissée de k^γ (posée sur un degré de la gamme), inertie ×k
// (attaques plus lentes, résonances plus longues), souffle relu dans le même corps agrandi.
// ---------------------------------------------------------------------------------------------
ORGANO.taille = {
  dims: { corps: 1, hauteur: 0.6, matiere: 0.2, souffle: 0.2 },
  relevance: T => 0.9,
  make (M, ctx, iota, variant) {
    const big = variant !== 1, k = big ? 1 + 2 * iota : 1 / (1 + 1.5 * iota);
    const gamma = variant === 2 ? 0 : 0.62;
    const shift = gamma ? onScale(ctx, -1200 * gamma * Math.log2(k)) : 0;
    const kc = 1200 * Math.log2(k), sr = M.sr;
    const att = big ? 1 + 6 * (k - 1) : 1, rel = big ? 1 + 40 * (k - 1) : 1;
    return { desc: `${big ? 'géant' : 'nain'} ×${k.toFixed(2)} (corps ${kc > 0 ? '−' : '+'}${Math.abs(Math.round(kc))} c${shift ? `, jeu ${Math.round(shift)} c` : ', même note'}, résonance ×${big ? (1 + 40 * (k - 1)).toFixed(0) : 1})`,
      apply (strata, D) {
        for (const S of strata) {
          if (shift) wrapFn(S, 'cents', c => c + shift);
          wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => d + bodyGain(bodyAt(M, jq), c, c2 + kc, 1));
          const ni = S.noiseShift; S.noiseShift = tau => (ni ? ni(tau) : 1) * k;
          const i0 = S.inertia; S.inertia = v => { const a = i0 ? i0(v) : { att: 1, rel: 1 }; return { att: a.att * att, rel: a.rel * rel }; };
          if (big) S.life = { ...(S.life || {}), rate: (S.life?.rate ?? 1) / Math.sqrt(k) };
        }
        return { strata, D: D + Math.round((big ? 0.25 * (k - 1) : 0) * sr) };
      } };
  }
};

// ---------------------------------------------------------------------------------------------
// PAVILLONS — deux ou trois pavillons pour un seul joueur : même source, corps de tailles voisines
// (rapports pris dans la gamme), chacun rayonne de sa place ; les chemins diffèrent de quelques
// millisecondes → interférences réelles entre pavillons (peigne fixe), image éclatée.
// ---------------------------------------------------------------------------------------------
ORGANO.pavillons = {
  dims: { espace: 1, corps: 0.6, matiere: 0.1 },
  relevance: T => 0.85,
  make (M, ctx, iota, variant) {
    const n = variant === 1 ? 3 : 2, lad = ctx.ladder || [0, 200, 400];
    const sizes = [1, Math.pow(2, (lad[Math.min(lad.length - 1, 2 + Math.round(3 * iota))] % 1200) / 1200), Math.pow(2, -(lad[Math.min(lad.length - 1, 1 + Math.round(2 * iota))] % 1200) / 1200)].slice(0, n);
    const pans = n === 2 ? [0.12, 0.88] : [0.08, 0.5, 0.92];
    const dels = [0, 1 + Math.round(2 * iota), 3 + Math.round(3 * iota)].slice(0, n).map(x => x * H);
    const muteSecond = variant === 2;
    const F = ctx.formants[0];
    return { desc: `${n} pavillons (corps ×${sizes.map(k => k.toFixed(2)).join(' / ')}, écarts ${dels.map(d => (d / M.sr * 1000).toFixed(1)).join('/')} ms${muteSecond ? ', le second bouché' : ''})`,
      apply (strata, D) {
        const out = [];
        for (const S0 of strata) sizes.forEach((k, i) => {
          const S = { ...S0, gain: (S0.gain ?? 1) / Math.sqrt(n) }, kc = 1200 * Math.log2(k), pan = pans[i];
          const d0 = S0.delay; S.delay = v => (d0 ? d0(v) : 0) + dels[i];
          if (S.resid) S.resid = { ...S0.resid, map: new TimeMap((S0.resid.map || S0.map).segs.map(s => ({ ...s, a: s.a + dels[i], b: s.b + dels[i] }))) };
          S.map = S0.map;
          if (kc) wrapFn(S, 'db', (d, v, tau, d0_, jq, c, c2) => d + bodyGain(bodyAt(M, jq), c2, c2 + kc, 1));
          if (muteSecond && i === 1) {
            wrapFn(S, 'db', (d, v, tau, d0_, jq, c, c2) => d + db20(svf.lp(hzOf(c2), 0.9 * F, 1.4) * (1 + 1.5 * svf.bp(hzOf(c2), 0.6 * F, 3))));
            wrapNoise(S, (b, fb) => db20(svf.lp(fb, 0.9 * F, 1.4) * (1 + 1.5 * svf.bp(fb, 0.6 * F, 3))));
          }
          wrapFn(S, 'pan', p => 0.3 * p + 0.7 * pan);
          if (kc) { const ni = S.noiseShift; S.noiseShift = tau => (ni ? ni(tau) : 1) * k; }
          S.noisePan = () => [Math.SQRT2 * Math.cos(pan * Math.PI / 2), Math.SQRT2 * Math.sin(pan * Math.PI / 2)];
          out.push(S);
        });
        return { strata: out, D: D + dels[n - 1] };
      } };
  }
};

// ---------------------------------------------------------------------------------------------
// SOURDINE — un filtre et une résonance posés dans le pavillon, calés sur le formant principal
// mesuré du parent. sèche (passe-haut + résonance), wah (résonance étroite dont la tige bouge au
// rythme de la grille), plunger (la main ouvre et ferme : passe-bas qui respire sur la grille).
// La sourdine ENTRE (ressort) : on l'entend passer.
// ---------------------------------------------------------------------------------------------
ORGANO.sourdine = {
  dims: { corps: 0.8, articulation: 0.3, souffle: 0.2 },
  relevance: T => 0.3 + 0.7 * T.tonal,
  make (M, ctx, iota, variant) {
    const F = clamp(ctx.formants[0], 700, 3500), sr = M.sr, step = ctx.grid.has ? ctx.grid.beat : ctx.grid.unit * 2;
    const T0 = 0.15 * M.n / sr, Tsp = 0.6;
    const amt = tau => (0.55 + 0.45 * iota) * spring(tau / sr - T0, Tsp);
    let resp, name;
    if (variant === 0) { name = 'sèche'; resp = () => f => svf.hp(f, 0.75 * F, 0.9) * (0.5 + 2.2 * svf.bp(f, 1.5 * F, 4)); }
    else if (variant === 1) { name = 'wah (tige au rythme)'; resp = tau => { const ph = ((tau - ctx.grid.phase) / step) % 1; const fw = F * (1.1 + 1.1 * (0.5 - 0.5 * Math.cos(2 * Math.PI * ph))); return f => svf.hp(f, 0.9 * F, 0.8) * (0.25 + 4 * svf.bp(f, fw, 7)); }; }
    else { name = 'plunger (main qui respire)'; resp = tau => { const ph = ((tau - ctx.grid.phase) / (2 * step)) % 1; const open = 0.5 - 0.5 * Math.cos(2 * Math.PI * ph); const fc = 350 * Math.pow(18, open); return f => svf.lp(f, fc, 1.6) * (0.8 + 0.6 * svf.bp(f, 0.7 * F, 3)); }; }
    return { desc: `sourdine ${name}, calée sur le formant ${Math.round(F)} Hz`,
      apply (strata, D) {
        for (const S of strata) {
          wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => d + amt(tau) * db20(resp(tau)(hzOf(c2))));
          wrapNoise(S, (b, fb, tau) => amt(tau) * db20(resp(tau)(fb)));
        }
        return { strata, D };
      } };
  }
};

// ---------------------------------------------------------------------------------------------
// SOUFFLE DU JOUEUR — il chuchote : l'énergie de chaque partiel passe dans le souffle de SA bande
// (le corps garde ses formants, la hauteur devient une ombre), le souffle est celui du son lui-même.
// variante rauque : le souffle bat au rythme d'un grognement ; sifflé : un seul partiel par bande reste.
// ---------------------------------------------------------------------------------------------
ORGANO.souffle = {
  dims: { souffle: 1, source: 0.8, hauteur: 0.2 },
  relevance: T => 0.4 + 0.6 * T.tonal,
  make (M, ctx, iota, variant) {
    const sr = M.sr, w = 0.55 + 0.45 * iota, T0 = 0.05 * M.n / sr, Tsp = 0.9;
    const lam = tau => w * spring(tau / sr - T0, Tsp);
    const PB = M.partBands, Z = M.souffle, growl = variant === 1 ? clamp(2 * (M.traits.vibRate || 6), 9, 28) : 0;
    const keepOne = variant === 2;
    const lin = (a, x) => { const i = Math.floor(x); if (i < 0) return a[0]; if (i >= a.length - 1) return a[a.length - 1]; return a[i] + (a[i + 1] - a[i]) * (x - i); };
    return { desc: `souffle du joueur : ${variant === 1 ? 'chuchoté rauque (' + growl.toFixed(0) + ' Hz)' : variant === 2 ? 'sifflé (un partiel par bande)' : 'chuchoté'}, ${Math.round(100 * w)} % de l'énergie des partiels passe au souffle`,
      apply (strata, D) {
        for (const S of strata) {
          wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => {
            const l = lam(tau);
            if (keepOne) { const b = Math.round(6 * Math.log2(hzOf(c2) / BANDS[0])); const pb = PB[Math.max(0, Math.min(PB.length - 1, b))]; const mx = pb ? lin(pb, jq) : 0; return Math.pow(10, d / 20) >= 0.7 * mx ? d + 4 * l : d - 40 * l; }
            return d - 30 * l;
          });
          wrapNoise(S, (b, fb, tau, jq) => {
            const l = lam(tau); if (l <= 0) return 0;
            const e = 0.5 * (lin(Z.env[0][b], jq) + lin(Z.env[1][b], jq)) + 1e-7, p = lin(PB[b], jq);
            let g = (e + (keepOne ? 0.25 : 1.1) * l * p) / e;
            if (growl) g *= 1 - 0.7 * l * (0.5 + 0.5 * Math.cos(2 * Math.PI * growl * tau / sr));
            return db20(g);
          });
        }
        return { strata, D };
      } };
  }
};

// ---------------------------------------------------------------------------------------------
// MODE DE JEU — l'articulation du joueur change, note par note (notes mesurées, sinon attaques) :
// portato (chaque note ré-attaquée en douceur et détachée), staccato (courte, la résonance du corps
// finit la note), flatterzunge (la langue roule : souffle et son battent ensemble).
// ---------------------------------------------------------------------------------------------
ORGANO.jeu = {
  dims: { articulation: 1, rythme: 0.5, souffle: 0.2 },
  relevance: T => 0.35 + 0.65 * Math.min(1, Math.max(T.notes, T.onsets / 2) / 4),
  make (M, ctx, iota, variant) {
    const sr = M.sr;
    let cuts = M.notes.length >= 2 ? M.notes.map(q => Math.round(q.t0 * sr)) : M.onsets.map(o => o.s);
    if (cuts.length < 2) { cuts = []; for (let t = ctx.grid.phase; t < M.n; t += ctx.grid.beat) cuts.push(Math.round(t)); }
    cuts = [...new Set(cuts)].sort((a, b) => a - b);
    const segOf = t => { let lo = 0, hi = cuts.length - 1, r = -1; while (lo <= hi) { const m = (lo + hi) >> 1; if (cuts[m] <= t) { r = m; lo = m + 1; } else hi = m - 1; } return r; };
    const flat = clamp(4 * (M.traits.vibRate || 6), 16, 32);
    const env = t => {
      const i = segOf(t); if (i < 0) return 1;
      const a = cuts[i], b = i + 1 < cuts.length ? cuts[i + 1] : M.n, L = b - a, x = (t - a) / L, ts = (t - a) / sr;
      if (variant === 0) { const at = Math.min(0.3 * L, 0.12 * sr) / sr, sw = ts < at ? 0.25 + 0.75 * (0.5 - 0.5 * Math.cos(Math.PI * ts / at)) : 1; const rel = x > 0.8 ? Math.pow(10, -35 * (x - 0.8) / 0.2 / 20) : 1; return sw * (x > 0.3 ? 0.8 : 1) * rel; }
      if (variant === 1) { return x < 0.35 ? 1 : Math.exp(-(ts - 0.35 * L / sr) / 0.045); }
      return 1 - 0.85 * (0.5 + 0.5 * Math.cos(2 * Math.PI * flat * ts));
    };
    const depth = 0.6 + 0.4 * iota;
    const g = t => 1 - depth + depth * env(t);
    return { desc: `mode de jeu : ${['portato', 'staccato (le corps finit la note)', `flatterzunge ${flat.toFixed(0)} Hz`][variant % 3]} sur ${cuts.length} notes`,
      apply (strata, D) {
        for (const S of strata) {
          // l'articulation suit le temps SOURCE (la note du joueur), pas l'horloge de l'enfant
          wrapGate(S, 'gate', (v, tau) => { const s = S.map.at(tau); return s === null ? 1 : g(s); });
          wrapGate(S, 'noiseGate', tau => { const s = S.map.at(tau); return s === null ? 1 : (variant === 2 ? 0.4 + 0.9 * env(s) : g(s)); });
          if (variant === 1) { const i0 = S.inertia; S.inertia = v => { const a = i0 ? i0(v) : { att: 1, rel: 1 }; return { att: a.att, rel: Math.max(a.rel, 18) }; }; }
        }
        return { strata, D };
      } };
  }
};

// ---------------------------------------------------------------------------------------------
// MATIÈRE — le corps change de matériau. verre : partiels étirés (raideur), faibles effacés,
// résonances longues ; bois : les aigus s'amortissent d'autant plus vite qu'ils sont aigus ;
// peau : les rangs glissent vers les modes d'une membrane (zéros de Bessel), déclin rapide.
// ---------------------------------------------------------------------------------------------
const MEMBRANE = [1, 1.594, 2.136, 2.296, 2.653, 2.918, 3.156, 3.501, 3.600, 3.652, 4.060, 4.154, 4.601, 4.832, 4.903, 5.131];
ORGANO.matiere = {
  dims: { matiere: 1, hauteur: 0.4, corps: 0.4 },
  relevance: T => 0.5 + 0.5 * T.tonal,
  make (M, ctx, iota, variant) {
    const sr = M.sr, T0 = 0.1 * M.n / sr, lam = tau => spring(tau / sr - T0, 0.8) * (0.5 + 0.5 * iota);
    const axis = M.fundamentalCents ?? 6000;
    const start = new Map(M.voices.map(v => [v.id, v.startAt ?? v.j0 * M.hop]));
    const name = ['verre', 'bois', 'peau'][variant % 3];
    return { desc: `matière : ${name}`,
      apply (strata, D) {
        for (const S of strata) {
          if (variant === 0) {
            wrapFn(S, 'cents', (c, v, tau, c0, jq) => { const h = rankAt(M, v, jq, c); if (!h) return c; const B = 0.0025 * lam(tau); return c + 600 * Math.log2(1 + B * h * h); });
            wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => { const B = bodyAt(M, jq); const rel = d - B.at(c); return d + (rel < -18 ? -20 * lam(tau) : 3 * lam(tau)); });
            const i0 = S.inertia; S.inertia = v => { const a = i0 ? i0(v) : { att: 1, rel: 1 }; return { att: a.att, rel: a.rel + 60 * (0.5 + 0.5 * iota) }; };
          } else if (variant === 1) {
            wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => { const t = Math.max(0, (jq * M.hop - start.get(v.id)) / sr); return d - lam(tau) * (14 * t + 6) * Math.max(0, (c2 - axis) / 1200); });
            wrapNoise(S, (b, fb, tau) => -lam(tau) * 8 * Math.max(0, Math.log2(fb / hzOf(axis))));
          } else {
            wrapFn(S, 'cents', (c, v, tau, c0, jq) => { const h = rankAt(M, v, jq, c); if (!h || h > MEMBRANE.length) return c; const ref = c - 1200 * Math.log2(h); return c + lam(tau) * (ref + 1200 * Math.log2(MEMBRANE[h - 1]) - c); });
            wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => { const t = Math.max(0, (jq * M.hop - start.get(v.id)) / sr); return d - lam(tau) * 30 * t; });
          }
        }
        return { strata, D };
      } };
  }
};

// ---------------------------------------------------------------------------------------------
// PERCE — la forme du tube change. fermé (clarinette : les rangs pairs s'éteignent), anche double
// (hautbois : un formant nasal, les graves amincis), conique large (saxophone : graves nourris,
// plus de souffle).
// ---------------------------------------------------------------------------------------------
ORGANO.perce = {
  dims: { corps: 0.7, source: 0.6, hauteur: 0.1 },
  relevance: T => Math.min(1, T.nHarm / 6) * T.tonal,
  make (M, ctx, iota, variant) {
    const sr = M.sr, lam = tau => spring(tau / sr - 0.08 * M.n / sr, 0.7) * (0.5 + 0.5 * iota), F = ctx.formants[0];
    const name = ['fermé (rangs pairs éteints)', 'anche double (formant nasal)', 'conique large (graves nourris)'][variant % 3];
    return { desc: `perce : ${name}`,
      apply (strata, D) {
        for (const S of strata) {
          if (variant === 0) wrapFn(S, 'db', (d, v, tau, d0, jq, c) => { const h = rankAt(M, v, jq, c); return h && h % 2 === 0 ? d - 32 * lam(tau) : d; });
          else if (variant === 1) { wrapFn(S, 'db', (d, v, tau, d0, jq, c, c2) => d + lam(tau) * db20(svf.hp(hzOf(c2), 0.45 * F, 0.7) * (0.6 + 3 * svf.bp(hzOf(c2), 1.25 * F, 5)))); wrapNoise(S, (b, fb, tau) => lam(tau) * db20(0.6 + 3 * svf.bp(fb, 1.25 * F, 5))); }
          else { wrapFn(S, 'db', (d, v, tau, d0, jq, c) => { const h = rankAt(M, v, jq, c); return h ? d + lam(tau) * (8 - 3 * Math.log2(h)) : d; }); wrapNoise(S, (b, fb, tau) => 6 * lam(tau)); }
        }
        return { strata, D };
      } };
  }
};

// ---------------------------------------------------------------------------------------------
// SECTION — plusieurs joueurs : chacun joue le même son, un peu décalé (quelques millisecondes),
// un peu désaccordé (quelques cents, symétrique), avec SA vie (le même vibrato lu à un autre moment
// — jamais un oscillateur ajouté), à sa place.
// ---------------------------------------------------------------------------------------------
ORGANO.section = {
  dims: { espace: 0.8, source: 0.5, vie: 0.5 },
  relevance: T => 0.8,
  make (M, ctx, iota, variant) {
    const n = [3, 5, 2][variant % 3], spread = 4 + 12 * iota;
    const det = Array.from({ length: n }, (_, i) => n === 1 ? 0 : (i / (n - 1) - 0.5) * 2 * spread * (i % 2 ? 1 : -1) * (i ? 1 : 0));
    const dels = [0, 2, 5, 9, 14].slice(0, n).map(x => x * H), offs = [0, 37, 71, 113, 151].slice(0, n);
    const pans = n === 2 ? [0.3, 0.7] : n === 3 ? [0.5, 0.15, 0.85] : [0.5, 0.25, 0.75, 0.05, 0.95];
    return { desc: `section de ${n} joueurs (désaccords ${det.map(x => (x >= 0 ? '+' : '') + x.toFixed(1)).join('/')} c, retards jusqu'à ${(dels[n - 1] / M.sr * 1000).toFixed(0)} ms)`,
      apply (strata, D) {
        const out = [];
        for (const S0 of strata) for (let i = 0; i < n; ++i) {
          const S = { ...S0, gain: (S0.gain ?? 1) / Math.sqrt(n), lifeOffset: (S0.lifeOffset || 0) + offs[i] };
          const d0 = S0.delay; S.delay = v => (d0 ? d0(v) : 0) + dels[i];
          if (S.resid) S.resid = { ...S0.resid, map: new TimeMap((S0.resid.map || S0.map).segs.map(s => ({ ...s, a: s.a + dels[i], b: s.b + dels[i] }))) };
          if (det[i]) wrapFn(S, 'cents', c => c + det[i]);
          wrapFn(S, 'pan', p => 0.4 * p + 0.6 * pans[i]);
          S.noisePan = () => [Math.SQRT2 * Math.cos(pans[i] * Math.PI / 2), Math.SQRT2 * Math.sin(pans[i] * Math.PI / 2)];
          out.push(S);
        }
        return { strata: out, D: D + dels[n - 1] };
      } };
  }
};

// ---------------------------------------------------------------------------------------------
// RÉSONANCES SYMPATHIQUES — l'instrument reçoit des cordes sympathiques accordées sur la gamme
// déduite : chaque corde s'éveille quand un partiel du son passe près d'elle (±40 c, ou d'un de ses
// harmoniques), puis continue de sonner seule (τ de 0,8 à 3 s) — un halo accordé né du son.
// ---------------------------------------------------------------------------------------------
ORGANO.sympathique = {
  dims: { corps: 0.5, hauteur: 0.5, espace: 0.3, matiere: 0.4 },
  relevance: T => 0.3 + 0.7 * T.tonal,
  make (M, ctx, iota, variant) {
    const sc = (ctx.deg.scale.length ? ctx.deg.scale : ctx.deg.all).filter(c => c > centsOf(80) && c < centsOf(5000));
    if (!sc.length) return null;
    const hop = M.hop, nf = Math.ceil(M.n / hop) + 1, tauS = 0.8 + 2.2 * iota, a = Math.exp(-hop / M.sr / tauS);
    const drive = sc.map(() => new Float64Array(nf));
    for (const v of M.voices) for (let q = 0; q < v.m; ++q) {
      const c = v.cents[q], e = Math.pow(10, v.db[q] / 20);
      sc.forEach((d, k) => { for (let h = 1; h <= 3; ++h) { if (Math.abs(c - (d + 1200 * Math.log2(h))) < 40) drive[k][v.j0 + q] += e / h; } });
    }
    const extraT = Math.round(3 * tauS * M.sr / hop);
    const voices = [];
    sc.forEach((d, k) => {
      const m = nf + extraT, amp = new Float64Array(m);
      let s = 0; for (let j = 0; j < m; ++j) { const x = j < nf ? drive[k][j] : 0; s = a * s + (1 - a) * x * 0.35; amp[j] = s; }
      let mx = 0; for (const x of amp) mx = Math.max(mx, x); if (mx < 1e-5) return;
      const cents = new Float64Array(m).fill(d), db = amp.map(x => 20 * Math.log10(x + 1e-9));
      const pan = new Float64Array(m).fill(0.15 + 0.7 * ((k * 0.618) % 1));
      voices.push({ id: 200000 + k, j0: 0, m, f: cents.map(hzOf), aL: amp, aR: amp, pL: null, ipd: new Float64Array(m), adv: null, cents, db, pan, centsTrend: cents, dbTrend: db, harm: 0, synthetic: true, energy: 0 });
    });
    if (!voices.length) return null;
    const g = Math.pow(10, (-10 + 10 * iota) / 20);
    return { desc: `${voices.length} cordes sympathiques accordées sur la gamme (${M.tuning?.name}), résonance ${tauS.toFixed(1)} s`,
      apply (strata, D) {
        const ext = Math.round(3 * tauS * M.sr);
        const B = { map: new TimeMap(strata[0].map.segs.concat([])), voicesOverride: voices, resid: null, gain: g };
        // les cordes suivent le temps du parent ; au-delà de la fin, elles continuent de résonner
        const last = B.map.segs[B.map.segs.length - 1];
        B.map = new TimeMap([...B.map.segs, { a: last.b, b: last.b + ext, sa: last.sb, sb: last.sb + ext * Math.sign(last.sb - last.sa || 1) }]);
        return { strata: [...strata, B], D: D + Math.round(1.5 * tauS * M.sr) };
      } };
  }
};

export const ORGANO_DIMS = ['corps', 'hauteur', 'matiere', 'souffle', 'espace', 'articulation', 'rythme', 'source', 'vie'];
