// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — ÉCRITURES : les opérations de jgcompose portées à l'échelle micro / mezzo d'un échantillon
//  Chacune lit la PARTITION MICRO (partition.js) — événements, voix (vraies voix, familles de partiels ou bandes), phrases —
//  et ne développe que ce qui y est attesté (sa pertinence en dépend). Rendu : rien n'est resynthétisé, les strates relisent
//  l'original (carte du temps, rapport de hauteur par note, masques de voix).
//
//  Lot 1 (01.10.2026) — 8 gènes, 20 opérations de jgcompose :
//   ÉVÉNEMENTS  inflexion (inflexion · glisser du doigt · rebond de corde) — contour (pas et centre · inversion mélodique ·
//               lissage) — marche (marche du degré : montante, descendante, par deux degrés) — troué (thème troué) —
//               accumulation
//   VOIX        stimmtausch (échange · rotation · imitation entre voix) — micropolyphonie (une vitesse par voix · phasing ·
//               pyramide)
//   FORME       multidirigé (temps multidirigé · acte de négation · retour)
//  Aucun aléatoire : chaque choix est une mesure (la plus faible, la plus proche, la médiane…).
// ============================================================================================
const S_CURVE = u => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u));   // courbe en S (jgcompose courbe_bend)
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };

// événement qui contient la position source s (les événements sont contigus : [s0, sN))
function finder (events) {
  const st = events.map(e => e.s0);
  return s => { if (s === null || s === undefined || !events.length || s < st[0]) return null; let lo = 0, hi = st.length - 1; while (lo < hi) { const m = (lo + hi + 1) >> 1; if (st[m] <= s) lo = m; else hi = m - 1; } return s < events[lo].sN ? events[lo] : null; };
}
// la gamme : degrés absolus (cents) ; sans gamme, demi-tons
function scaleOf (ctx) { const sc = ctx.deg && (ctx.deg.scale.length ? ctx.deg.scale : ctx.deg.all); return sc && sc.length >= 3 ? sc : null; }
function snapTo (sc, c) { if (!sc) return Math.round(c / 100) * 100; let lo = 0, hi = sc.length - 1; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (sc[m] < c) lo = m; else hi = m; } return Math.abs(sc[lo] - c) <= Math.abs(sc[hi] - c) ? sc[lo] : sc[hi]; }
function degIndex (sc, c) { let bi = 0, bd = 1e9; sc.forEach((x, i) => { const d = Math.abs(x - c); if (d < bd) { bd = d; bi = i; } }); return bi; }
// rapport de hauteur borné : jamais plus de deux octaves, fondamentale de sortie entre 30 Hz et 2,5 kHz
function safeRatio (f0, cents) { let c = clamp(cents, -2400, 2400); while (f0 * Math.pow(2, c / 1200) > 2500) c -= 1200; while (f0 * Math.pow(2, c / 1200) < 30) c += 1200; return Math.pow(2, c / 1200); }

export const ECRITURES = {};

// --------------------------------------------------------------------------------------------- ÉVÉNEMENTS
// INFLEXION — chaque note fléchit vers la suivante (v0) ; le doigt glisse dans la note depuis la précédente (v1, glisser du
// doigt) ; la corde rebondit après l'attaque, oscillation amortie (v2). Hauteur seule : le corps ne bouge pas.
ECRITURES.inflexion = {
  kind: 'melody', profile: [0.8, 0.1, 0.0, 0.2, 0.1, 0.6, 0.0, 0.0],
  relevance: T => { const m = T.ms; if (!m || m.nPitched < 3) return 0; return m.pitchedShare * Math.min(1, m.nPitched / 6) * (0.5 + 0.5 * m.movingShare); },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, sr = P.sr, at = finder(ev), pe = ev.filter(e => e.f0 > 0);
    if (pe.length < 3) return null;
    const v = variant % 3, bend = new Map();
    for (let i = 0; i < pe.length; ++i) {
      const e = pe[i], n = pe[i + 1], p = pe[i - 1];
      if (v === 0 && n && n.s0 - e.sN < 0.4 * sr && Math.abs(n.cents - e.cents) >= 20) { const phi = 0.3 + 0.4 * iota, st = e.sN - phi * (e.sN - e.s0); bend.set(e.i, s => (n.cents - e.cents) * (0.35 + 0.5 * iota) * S_CURVE((s - st) / (e.sN - st))); }
      if (v === 1 && p && e.s0 - p.sN < 0.4 * sr && Math.abs(p.cents - e.cents) >= 20) { const g = (0.04 + 0.14 * iota) * sr; bend.set(e.i, s => (p.cents - e.cents) * (1 - S_CURVE((s - e.s0) / g))); }
      if (v === 2) { const A = 25 + 110 * iota; bend.set(e.i, s => { const u = (s - e.s0) / sr; return u < 0 ? 0 : A * Math.exp(-u / 0.12) * Math.sin(2 * Math.PI * 7 * u); }); }
    }
    if (!bend.size) return null;
    const name = ['inflexion: every note bends towards the next', 'finger slide: every note is reached from the previous one', 'string rebound: a damped pitch swing after every attack'][v];
    return { desc: `${name} (${bend.size} notes)`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); const b = e && bend.get(e.i); return b ? Math.pow(2, b(s) / 1200) : 1; }); return { layers, D }; } };
  }
};

// CONTOUR — la ligne des notes autour de sa hauteur médiane : intervalles élargis et centre déplacé de deux degrés (v0, pas et
// centre), ligne renversée (v1, inversion mélodique), intervalles resserrés (v2, lissage) ; chaque note retombe sur un degré
// de la gamme déduite et garde la moitié de son écart propre (sa justesse vivante).
ECRITURES.contour = {
  kind: 'melody', profile: [1.0, 0.0, 0.0, 0.1, 0.3, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; if (!m || m.nPitched < 4 || m.rangeCents < 150) return 0; return m.pitchedShare * Math.min(1, m.rangeCents / 700); },
  make (P, ctx, iota, variant) {
    const ev = ctx.ms.events, at = finder(ev), pe = ev.filter(e => e.f0 > 0), sc = scaleOf(ctx);
    if (pe.length < 4) return null;
    const v = variant % 3, centre = median(pe.map(e => e.cents));
    const step = sc ? median(sc.slice(1).map((x, i) => x - sc[i])) : 100;
    const k = v === 0 ? 1 + 0.9 * iota : v === 1 ? -1 : 1 - 0.7 * iota, shift = v === 0 ? 2 * step : 0;
    const ratio = new Map();
    for (const e of pe) { const tgt = snapTo(sc, centre + shift + k * (e.cents - centre)) + 0.5 * (e.lifeDev || 0); ratio.set(e.i, safeRatio(e.f0, tgt - e.cents)); }
    const name = [`steps and centre: intervals ×${k.toFixed(2)}, centre up two degrees`, 'melodic inversion around its median pitch', `smoothing: intervals ×${k.toFixed(2)}`][v];
    return { desc: `${name} (${pe.length} notes on the scale)`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); return (e && ratio.get(e.i)) || 1; }); return { layers, D }; } };
  }
};

// MARCHE DU DEGRÉ — chaque énoncé (phrase ; à défaut des tiers égaux de la suite d'événements) démarre un degré plus loin :
// montant (v0), descendant (v1), par deux degrés (v2). Transposition MODALE : chaque note avance du même nombre de degrés de
// la gamme ; un événement sans hauteur suit l'énoncé (rapport de sa première note).
ECRITURES.marche = {
  kind: 'melody', profile: [0.8, 0.0, 0.0, 0.0, 0.7, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; if (!m || m.nPitched < 3 || (m.nPhrases < 2 && m.nEvents < 6)) return 0; return m.pitchedShare * (m.nPhrases >= 2 ? 1 : 0.7); },
  make (P, ctx, iota, variant) {
    const M = ctx.ms, ev = M.events, at = finder(ev), sc = scaleOf(ctx) || Array.from({ length: 120 }, (_, i) => 100 * i);
    let groups = M.phrases.map(p => [p.a, p.b]);
    if (groups.length < 2) { const g = ev.length >= 9 ? 3 : 2, n = ev.length; groups = Array.from({ length: g }, (_, q) => [Math.floor(q * n / g), Math.floor((q + 1) * n / g) - 1]); }
    // (V6.4) la quantité réglée à la main : le pas de la marche en degrés (×, arrondi ; 0 : rien ne bouge)
    const v = variant % 3, ratio = new Map(), stepAmt = Math.max(0, ctx.amt ?? 1); let moved = 0;
    groups.forEach(([a, b], q) => {
      const x = (v === 0 ? 1 : v === 1 ? -1 : 2) * stepAmt * q, d = Math.sign(x) * Math.round(Math.abs(x) - 1e-6); if (!d) return;
      let first = 1;
      for (let i = a; i <= b; ++i) { const e = ev[i]; if (!(e.f0 > 0)) continue; const j = clamp(degIndex(sc, e.cents) + d, 0, sc.length - 1), r = safeRatio(e.f0, sc[j] + 0.5 * (e.lifeDev || 0) - e.cents); ratio.set(e.i, r); if (first === 1) first = r; moved++; }
      for (let i = a; i <= b; ++i) if (!ratio.has(ev[i].i)) ratio.set(ev[i].i, first);
    });
    if (!moved) return null;
    return { desc: `sequence: ${groups.length} statements, each ${['one degree higher', 'one degree lower', 'two degrees higher'][v]}`,
      apply (layers, D) { for (const S of layers) S.r.push((t, s) => { const e = at(s); return (e && ratio.get(e.i)) || 1; }); return { layers, D }; } };
  }
};

// THÈME TROUÉ — les événements les plus faibles sont retirés (jamais le premier, jamais deux de suite) et la note d'avant
// est allongée par-dessus le trou : sa seconde moitié s'étire jusqu'à l'événement suivant. Durée totale inchangée : avec un
// pouls, tout reste sur la grille.
ECRITURES.troue = {
  kind: 'map', profile: [0.0, 0.6, 0.0, 0.8, 0.6, 0.2, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 5 ? 0.8 * Math.min(1, m.nEvents / 10) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, n = ev.length, sr = P.sr; if (n < 5) return null;
    const want = Math.max(1, Math.round(n * (0.12 + 0.18 * iota))), gone = new Set();
    const order = ev.slice(1).sort((a, b) => a.loud - b.loud || a.i - b.i);
    for (const e of order) { if (gone.size >= want) break; if (gone.has(e.i - 1) || gone.has(e.i + 1)) continue; if (ev[e.i - 1].sN - ev[e.i - 1].s0 < 0.04 * sr) continue; gone.add(e.i); }
    if (!gone.size) return null;
    const segs = []; let t = 0;
    if (ev[0].s0 > 0) { segs.push({ a: 0, b: ev[0].s0, sa: 0, sb: ev[0].s0 }); t = ev[0].s0; }
    for (let i = 0; i < n; ++i) {
      if (gone.has(i)) continue;
      const e = ev[i]; let extra = 0; for (let j = i + 1; j < n && gone.has(j); ++j) extra += ev[j].sN - ev[j].s0;
      if (!extra) { segs.push({ a: t, b: t + (e.sN - e.s0), sa: e.s0, sb: e.sN }); t += e.sN - e.s0; continue; }
      const hA = Math.min(e.sN - 0.01 * sr, e.s0 + Math.max(0.03 * sr, 0.5 * (Math.min(e.s1, e.sN) - e.s0)));
      segs.push({ a: t, b: t + (hA - e.s0), sa: e.s0, sb: hA }); t += hA - e.s0;
      segs.push({ a: t, b: t + (e.sN - hA) + extra, sa: hA, sb: e.sN }); t += (e.sN - hA) + extra;
    }
    const last = ev[n - 1].sN; if (last < P.n) { segs.push({ a: t, b: t + (P.n - last), sa: last, sb: P.n }); t += P.n - last; }
    const map = new H.TimeMap(segs);
    return { desc: `holed theme: ${gone.size} of ${n} events removed, the note before each hole held over it`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Math.ceil(t) }; } };
  }
};

// ACCUMULATION — la figure d'ouverture (ses premiers événements, ≥ 0,25 s) revient de plus en plus souvent : insérée à des
// attaques de plus en plus rapprochées (à la moitié, aux deux tiers, aux trois quarts… de la durée) ; deux retours qui
// tombent sur la même attaque se suivent. Avec un pouls, la figure dure un nombre entier de tatums.
ECRITURES.accumulation = {
  kind: 'map', profile: [0.0, 0.5, 0.0, 0.9, 0.9, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && m.nEvents >= 4 ? 0.75 * Math.min(1, m.nEvents / 8) : 0; },
  make (P, ctx, iota, variant, H) {
    const ev = ctx.ms.events, sr = P.sr, n = ev.length; if (n < 4) return null;
    const A0 = ev[0].s0, A1 = ev[n - 1].sN;
    let k = 0; while (k + 1 < n && (ev[k].sN - A0 < 0.25 * sr || k < 1) && k < 3) k++;
    let f0 = A0, f1 = ev[k].sN; if (f1 - f0 > 0.4 * (A1 - A0)) { k = 0; f1 = ev[0].sN; if (f1 - f0 > 0.4 * (A1 - A0)) return null; }
    if (ctx.grid.has) { const q = ctx.grid.tatum; f1 = f0 + Math.max(1, Math.round((f1 - f0) / q)) * q; }
    const K = 2 + Math.round(4 * iota), cuts = new Map();
    for (let j = 0; j < K; ++j) {
      const tau = A0 + (A1 - A0) * (1 - 1 / (j + 2)); let bi = -1, bd = Infinity;
      for (let i = k + 1; i < n; ++i) { const d = Math.abs(ev[i].s0 - tau); if (d < bd) { bd = d; bi = i; } }
      if (bi > 0) cuts.set(ev[bi].s0, (cuts.get(ev[bi].s0) || 0) + 1);
    }
    if (!cuts.size) return null;
    const segs = []; let t = 0, s = 0;
    for (const x of [...cuts.keys()].sort((a, b) => a - b)) {
      segs.push({ a: t, b: t + (x - s), sa: s, sb: x }); t += x - s; s = x;
      for (let c = 0; c < cuts.get(x); ++c) { segs.push({ a: t, b: t + (f1 - f0), sa: f0, sb: f1 }); t += f1 - f0; }
    }
    segs.push({ a: t, b: t + (P.n - s), sa: s, sb: P.n }); t += P.n - s;
    const map = new H.TimeMap(segs), total = [...cuts.values()].reduce((a, b) => a + b, 0);
    return { desc: `accumulation: the opening figure (${((f1 - f0) / sr).toFixed(2)} s) comes back ${total} times, ever closer`,
      apply (layers, D) { for (const S of layers) S.map = map; return { layers, D: Math.ceil(t) }; } };
  }
};

// --------------------------------------------------------------------------------------------- VOIX
// STIMMTAUSCH — deux voix échangent leur conduite : la famille de partiels A prend l'enveloppe dans le temps de la famille B
// (et réciproquement), chacune gardant son niveau propre (v0, échange) ; trois familles tournent A←B←C←A (v1, rotation) ;
// A imite B avec 120 ms de retard (v2, imitation : un canon à l'intérieur du son). Lu sur les relevés de partition.js.
ECRITURES.stimmtausch = {
  kind: 'voice', profile: [0.2, 0.0, 0.9, 0.0, 0.2, 0.5, 0.0, 0.1],
  relevance: T => { const m = T.ms; return m && m.kind === 'partials' && m.strata >= 2 ? clamp(0.25 + 0.25 * m.separation, 0, 1) : 0; },
  make (P, ctx, iota, variant) {
    const st = ctx.ms.strata; if (st.kind !== 'partials' || st.list.length < 2) return null;
    const L = st.list, hop = P.hopF, nf = P.frames.length, v = variant % 3;
    // forme de chaque enveloppe : écart à sa moyenne (trames voisées), lissé sur 3 trames
    const shape = L.map(f => { const e = f.env, vals = []; for (let j = 0; j < nf; ++j) if (P.voiced[j] > 0 && e[j] > -80) vals.push(e[j]); const m = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0; const out = new Float64Array(nf); for (let j = 0; j < nf; ++j) { let s = 0, c = 0; for (let q = j - 1; q <= j + 1; ++q) if (q >= 0 && q < nf && e[q] > -80) { s += e[q] - m; c++; } out[j] = c ? s / c : 0; } return out; });
    const n = L.length, src = L.map((_, i) => (v === 1 && n >= 3 ? (i + 1) % n : i === 0 ? n - 1 : i === n - 1 ? 0 : i));
    const lag = v === 2 ? Math.round(0.12 * P.sr / hop) : 0, amt = 0.5 + 0.5 * iota;
    const famOf = h => L.findIndex(f => f.hasRank(h));
    const off = (fi, s) => { if (fi < 0 || s === null) return 0; const j = clamp(Math.round(s / hop), 0, nf - 1), g = v === 2 ? (fi === 0 ? n - 1 : -1) : src[fi]; if (g < 0 || g === fi) return 0; const jj = clamp(j - (v === 2 ? lag : 0), 0, nf - 1); return clamp(amt * (shape[g][jj] - shape[fi][j]), -24, 18); };
    const what = v === 0 ? `${L[0].name} and ${L[n - 1].name} exchange their conduct` : v === 1 && n >= 3 ? `the ${n} partial families pass their conduct round` : v === 1 ? `${L[0].name} and ${L[n - 1].name} exchange their conduct` : `${L[0].name} imitate ${L[n - 1].name} 120 ms later`;
    return { desc: `voice exchange (${st.basis}): ${what}`,
      apply (layers, D) { for (const S of layers) S.partial.push((h, f, d, t, F, s) => [f, d + off(famOf(h), s)]); return { layers, D }; } };
  }
};

// MICROPOLYPHONIE — la même matière, une vitesse par voix : chaque voix (famille de partiels, voix réelle ou bande) devient
// une strate qui lit le son à son propre pas — 1, 0,84, 0,7 (v0) ; phasing, 1, 1,012, 1,024 : les voix se décalent peu à
// peu (v1) ; pyramide, 1, 2 (deux passages), 1/2 : des tempos en rapports entiers (v2).
ECRITURES.micropoly = {
  kind: 'mult', layers: 3, profile: [0.1, 0.8, 0.4, 0.7, 0.4, 0.1, 0.0, 0.3],
  relevance: T => { const m = T.ms; if (!m || m.strata < 2) return 0; return clamp(0.3 + 0.2 * m.separation, 0, 1) * Math.min(1, m.meanDur / 0.15); },
  make (P, ctx, iota, variant, H) {
    const st = ctx.ms.strata, L = st.list.slice(0, 3); if (L.length < 2) return null;
    // (V6.4) la quantité réglée à la main : l'écart des vitesses (×) — 0 : les voix ensemble ; la pyramide (×2, ×½) par octaves
    const v = variant % 3, A = Math.max(0, ctx.amt ?? 1), rates = [[1, 0.84, 0.7], [1, 1.012, 1.024], [1, 2, 0.5]][v].map(r => (v === 2 ? Math.pow(r, Math.min(1, A)) : Math.max(0.2, 1 + (r - 1) * A))), n = P.n;
    const maps = rates.map(r => {
      if (r === 2) return new H.TimeMap([{ a: 0, b: n / 2, sa: 0, sb: n }, { a: n / 2, b: n, sa: 0, sb: n }]);
      if (r > 1 && v === 2) { const L = n / r; return new H.TimeMap(Array.from({ length: Math.ceil(r) }, (_, q) => ({ a: q * L, b: Math.min(n, (q + 1) * L), sa: 0, sb: Math.min(n, (q + 1) * L) - q * L >= L ? n : (Math.min(n, (q + 1) * L) - q * L) * r }))); }
      return new H.TimeMap([{ a: 0, b: n / r, sa: 0, sb: n }]);
    });
    const Dm = Math.ceil(Math.max(...rates.map(r => (r === 2 ? n : n / r))));
    return { desc: `micropolyphony (${st.kind === 'partials' ? st.basis + ' families' : st.kind}): ${L.map((f, i) => f.name + ' ×' + +rates[i].toFixed(3)).join(', ')}${v === 1 ? ' — phasing' : v === 2 ? ' — tempo pyramid' : ''}`,
      apply (layers, D) {
        const out = [];
        for (const S0 of layers) L.forEach((fam, i) => {
          const S = H.cloneLayer(S0); S.map = maps[i]; S.name = (S0.name || '') + ' ' + fam.name;
          const inF = (f, s) => fam.has(f, s, s !== null ? P.f0At(s) : 0);
          if (st.kind === 'partials') { S.partial.push((h, f, d) => (fam.hasRank(h) ? [f, d] : null)); S.free.push((f, d, t, s) => (inF(f, s) ? [f, d] : null)); S.envNoise.push((f, t, s) => (inF(f, s) ? 0 : -60)); }
          else S.env.push((f, t, s) => (inF(f, s) ? 0 : -60));
          out.push(S);
        });
        return { layers: out, D: Math.max(D, Dm) };
      } };
  }
};

// --------------------------------------------------------------------------------------------- FORME
// TEMPS MULTIDIRIGÉ — le geste d'ouverture (la première phrase si elle tient dans 30 % de la durée, sinon les premiers
// événements jusqu'à 30 %) est
// replacé à la fin (v0) ; ACTE DE NÉGATION : après le geste, ne reste que sa résonance, étirée et qui s'éteint (−6 dB/s) (v1) ;
// RETOUR : le geste d'ouverture revient à la fin, da capo (v2).
ECRITURES.multidirige = {
  kind: 'map', profile: [0.0, 0.3, 0.0, 0.3, 1.0, 0.0, 0.0, 0.0],
  relevance: T => { const m = T.ms; return m && (m.nPhrases >= 2 || m.nEvents >= 4) ? 0.7 : 0; },
  make (P, ctx, iota, variant, H) {
    const M = ctx.ms, ev = M.events, sr = P.sr, n = ev.length; if (n < 2) return null;
    const A0 = ev[0].s0, A1 = ev[n - 1].sN, dur = A1 - A0;
    // (V6.4) la quantité réglée à la main : la part du sujet qui forme le geste déplacé (0,3 à la valeur calculée)
    const frac = clamp(0.3 * (ctx.amt ?? 1), 0.05, 0.7);
    let k = M.phrases.length >= 2 && (M.phrases[0].s1 - A0) <= frac * dur && (ctx.amt ?? 1) === 1 ? M.phrases[0].b : 0;
    if (k === 0) { while (k + 1 < n - 1 && ev[k + 1].sN - A0 <= frac * dur) k++; }
    const g1 = ev[k].sN, v = variant % 3;
    if (g1 >= A1) return null;
    const segs = []; let t = 0;
    const put = (sa, sb) => { if (sb > sa) { segs.push({ a: t, b: t + (sb - sa), sa, sb }); t += sb - sa; } };
    let fadeFrom = -1;
    // (v5.8, morphologie) le geste déplacé à la fin n'est plus suivi de la fin muette du fichier : coupé là où l'événement
    // suivant le relayait, il s'éteint de l'extinction finale du sujet (enveloppe.js) ; le retour suit la fin du dernier
    // événement, sans le silence de fin de fichier
    if (v === 0) { put(0, A0); put(g1, A1); put(A0, g1); }
    else if (v === 1) {
      const hA = Math.max(A0, g1 - Math.round(0.15 * sr)), rest = P.n - g1;
      put(0, hA);
      fadeFrom = t; segs.push({ a: t, b: t + (g1 - hA) + rest, sa: hA, sb: g1 }); t += (g1 - hA) + rest;
    }
    else { put(0, A1); put(A0, g1); }
    const map = new H.TimeMap(segs);
    const name = ['multi-directed time: the opening gesture is moved to the end', 'act of negation: after the gesture, only its resonance remains', 'return: the opening gesture comes back at the end'][v];
    return { desc: `${name} (${((g1 - A0) / sr).toFixed(2)} s gesture)`,
      apply (layers, D) { for (const S of layers) { S.map = map; if (fadeFrom >= 0) S.gainDb.push(t2 => -6 * Math.max(0, t2 - fadeFrom) / sr); } return { layers, D: Math.ceil(t) }; } };
  }
};
