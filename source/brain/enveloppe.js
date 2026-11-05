// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — ENVELOPPE ET MORPHOLOGIE (v5.8)
//  Mat : « sur des matériaux non percussifs, les coups sont beaucoup trop abrupts … un son percussif peut avoir des coupes
//  brutales, mais sur une trame sonore cela paraît non musical » ; « quand il y a des réorganisations de morphologie, il faut
//  le faire avec sens : pense à la morphologie d'un son acoustique ».
//
//  1. PROFIL D'ENVELOPPE du sujet, mesuré sur son enveloppe de 10 ms et sur ses notes (partition.js) : temps d'attaque,
//     pente de décroissance, temps d'extinction (−30 dB) des notes et de la fin, PERCUSSIVITÉ (0 : trame tenue, 1 : frappe).
//  2. GARDE D'ENVELOPPE, appliquée à toute strate de tout enfant, quel que soit le gène :
//     — les gains des gènes (portes, trous, coupes, accents) ne montent et ne descendent pas plus vite que le sujet ne le
//       fait lui-même (vitesse en dB/s tirée de son attaque et de son extinction) ;
//     — une entrée après un silence de la carte du temps, ailleurs que sur une attaque du sujet, s'ouvre en son temps
//       d'attaque ; une sortie vers un silence, le son encore vivant, s'éteint en son temps d'extinction ;
//     — un raccord (la lecture saute ailleurs dans la source) garde la continuité du niveau sur un temps d'attaque, sauf
//       sur une matière percussive qui retombe sur une vraie attaque (là, la frappe est naturelle) ;
//     — la PERCUSSIVITÉ règle tout : à 1, les temps tombent à quelques millisecondes et les coupes nettes restent nettes.
//  3. EXTINCTION FINALE : un enfant qui finit le son encore vivant ne coupe plus — sa dernière lecture se prolonge (tenue des
//     dernières 120 ms) le temps de l'extinction finale mesurée du sujet, en décroissance linéaire en dB.
// ============================================================================================
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const median = a => { if (!a.length) return 0; const s = a.slice().sort((x, y) => x - y); return s[s.length >> 1]; };
const lerp = (a, b, u) => a + (b - a) * u;

export function envelopeProfile (P, ms) {
  const sr = P.sr, Bk = Math.round(0.01 * sr), env = P.env, nb = env.length, ev = (ms && ms.events) || [];
  const at = s => env[clamp(Math.floor(s / Bk), 0, nb - 1)];
  const atts = [], decs = [], rels = [], percs = [], sustains = [];
  let relFinal = 0;
  ev.forEach((e, q) => {
    const end = q + 1 < ev.length ? ev[q + 1].s0 : Math.min(P.n, Math.round(P.traits.activeEnd * sr) + Math.round(0.5 * sr));
    const b0 = Math.floor(e.s0 / Bk), b1 = Math.min(nb - 1, Math.floor(end / Bk)), bA = Math.min(b1, b0 + 50);
    if (b1 - b0 < 2) return;
    let pb = b0; for (let b = b0; b <= bA; ++b) if (env[b] > env[pb]) pb = b;
    const pk = env[pb]; if (pk < P.peakDb - 50) return;
    // attaque : du début de l'événement au premier bloc à 3 dB de sa crête
    let ab = b0; while (ab < pb && env[ab] < pk - 3) ab++;
    const att = (ab - b0 + 0.5) * 10; atts.push(att);
    // décroissance : pente (régression) de la crête à la fin de l'événement, blocs au-dessus de crête − 50 dB
    let sx = 0, sy = 0, sxx = 0, sxy = 0, m = 0;
    for (let b = pb; b <= b1; ++b) { if (env[b] < pk - 50) break; const x = (b - pb) * 0.01; sx += x; sy += env[b]; sxx += x * x; sxy += x * env[b]; m++; }
    const slope = m >= 3 ? (m * sxy - sx * sy) / Math.max(1e-9, m * sxx - sx * sx) : 0, dec = Math.max(0, -slope); decs.push(dec);
    // extinction : du dernier bloc à 6 dB de la crête au premier à 36 dB sous elle, avant l'attaque suivante
    let lb = pb; for (let b = pb; b <= b1; ++b) if (env[b] >= pk - 6) lb = b;
    let zb = -1; for (let b = lb; b <= b1; ++b) if (env[b] <= pk - 36) { zb = b; break; }
    if (zb > 0) { const r = (zb - lb) * 10; rels.push(r); if (q === ev.length - 1) relFinal = r; }
    else if (q === ev.length - 1) { const tail = env.slice(lb, nb), mn = Math.min(...tail); relFinal = Math.max(10, (nb - lb) * 10 * clamp(30 / Math.max(1, pk - mn), 0.2, 3)); }
    // percussivité de la note (notes d'au moins 120 ms) : crête aussitôt suivie de la décroissance — part du temps passée à
    // moins de 6 dB de la crête après elle, rapportée à la note ; un son tenu y reste (> 35 %), un son frappé la quitte
    // — et une frappe a sa crête tôt (moins de 150 ms après l'attaque : un crescendo de clarinette ne frappe pas) et s'éteint
    // SANS se relancer (part des pas de 10 ms qui ne remontent pas de plus de 1 dB : une voix qui parle remonte sans cesse)
    if ((b1 - b0) >= 12) {
      let sus = 0, mono = 0, steps = 0; for (let b = pb; b <= b1; ++b) { if (env[b] >= pk - 6) sus++; if (b > pb && env[b] > pk - 50) { steps++; if (env[b] - env[b - 1] <= 1) mono++; } }
      const sf = sus / (b1 - b0 + 1), mf = steps ? mono / steps : 1, tPk = (pb - b0) * 10; sustains.push(sf);
      percs.push(clamp((0.35 - sf) / 0.3, 0, 1) * clamp((150 - tPk) / 100, 0, 1) * clamp((mf - 0.6) / 0.3, 0, 1));
    }
  });
  // percussivité d'ensemble (sur la zone active) : part des blocs de 10 ms à moins de 10 dB du maximum des 300 ms
  // précédentes — une trame (moteur, voix, souffle) y reste même quand elle est faite de petits événements ; des frappes
  // qui s'éteignent entre elles en sortent
  const a0 = Math.floor(P.traits.activeStart * 100), a1 = Math.min(nb - 1, Math.floor(P.traits.activeEnd * 100));
  let inK = 0, tot = 0; for (let b = a0; b <= a1; ++b) { if (env[b] < P.peakDb - 50) continue; let mx = -1e9; for (let c = Math.max(a0, b - 30); c <= b; ++c) mx = Math.max(mx, env[c]); tot++; if (env[b] >= mx - 10) inK++; }
  const share = tot ? inK / tot : 1, macro = clamp((0.9 - share) / 0.4, 0, 1);
  // VITESSES PROPRES du sujet : 95e centile des chutes et des montées de son enveloppe d'un bloc de 10 ms au suivant, là où
  // il sonne (crête − 40 dB) — un enfant ne coupe pas plus vite que le sujet ne s'éteint, n'entre pas plus vite qu'il
  // n'attaque
  const falls = [], rises = [];
  for (let b = a0; b < a1; ++b) { if (env[b] < P.peakDb - 40 && env[b + 1] < P.peakDb - 40) continue; const d = env[b + 1] - env[b]; if (d < 0) falls.push(-d); else if (d > 0) rises.push(d); }
  const q95 = a => { if (!a.length) return 0; const z = a.slice().sort((x, y) => x - y); return z[Math.floor(0.95 * (z.length - 1))]; };
  const fallRate = q95(falls) * 100, riseRate = q95(rises) * 100;
  // sans notes lisibles : l'enveloppe entière (attaque de la crête globale, extinction de la fin)
  if (!atts.length) { atts.push(20); decs.push(0); }
  const attMs = clamp(median(atts), 2, 500), relMs = rels.length ? clamp(median(rels), 5, 3000) : clamp(relFinal || 200, 5, 3000);
  // la percussivité retenue est celle de l'ensemble (mesurée note par note, elle se trompait sur une batterie dense : la
  // ride tient le niveau entre les frappes) ; la mesure par note reste indicative
  const notePerc = percs.length ? median(percs) : 0;
  return { attMs, relMs, relFinalMs: clamp(relFinal || relMs, 10, 4000), decayDbS: median(decs), perc: clamp(macro, 0, 1), notePerc, macroPerc: macro, keepShare: share, sustain: median(sustains), fallRate, riseRate, n: atts.length, nLong: percs.length };
}

// constantes de la garde, tirées du profil
export function guardOf (prof) {
  // vitesses propres du sujet (bornées : une trame s'éteint en 0,4 s au plus — un instrumentiste qui cesse de jouer, pas
  // toute une réverbération, qui rendrait les portes rythmiques inaudibles — et une frappe n'est pas plus rapide que 10 ms)
  // une matière percussive garde plus de liberté (Mat : « un son percussif peut avoir des coupes brutales ») : vitesses × (1 + 2 × percussivité)
  const k = 1 + 2 * (prof.perc || 0), down = clamp((prof.fallRate || 150) * k, 150, 6000), up = clamp((prof.riseRate || 300) * k, 300, 10000);
  return { up, down, tin: clamp(40 / up, 0.003, 0.3), tout: clamp(60 / down, 0.005, 0.3), perc: prof.perc };
}

// est-ce une vraie attaque du sujet ? (une attaque à moins de 20 ms après s, ou s dans les 5 ms qui la précèdent)
// (les attaques détectées et les débuts de notes de la partition micro)
function attackNear (P, s) {
  const sr = P.sr, lo = s - 0.005 * sr, hi = s + 0.02 * sr;
  if (P.onsetsAll) for (const o of P.onsetsAll) if (o.s >= lo && o.s <= hi) return true;
  if (P.micro) for (const e of P.micro.events) if (e.s0 >= lo && e.s0 <= hi) return true;
  return false;
}
const S_ = u => (u <= 0 ? 0 : u >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * u));

/** fonctions de gain (dB, en temps de sortie de la strate) qui gardent l'enveloppe : raccords et sorties de la carte du temps,
 *  et lissage des gains des gènes. Rend { junction(t), slew(fn) } ; slew(fn) précalcule fn sur une grille de 128 échantillons
 *  et la rend vitesse-limitée. */
export function envelopeGuard (P, map, D) {
  const prof = P.envelope; if (!prof) return null;
  const G = guardOf(prof), sr = P.sr, Bk = Math.round(0.01 * sr), env = P.env, nb = env.length;
  const lvl = s => env[clamp(Math.floor(s / Bk), 0, nb - 1)];
  const alive = s => lvl(s) >= P.peakDb - 40;
  // une source « éteinte » l'est encore 50 ms plus loin (le début d'une attaque, lui, se rallume aussitôt)
  const dead = s => { for (let k = 0; k <= 5; ++k) if (lvl(s + k * Bk) >= P.peakDb - 40) return false; return true; };
  const segs = map.segs, marks = [];          // [t0, t1, kind, extra]
  const Rel = clamp(2 * prof.relMs, 60, 600) / 1000 * sr;
  for (let k = 0; k < segs.length; ++k) {
    const g = segs[k], pv = k ? segs[k - 1] : null, len = g.b - g.a;
    // (V6.4) traîne de relâchement (releaseTails) : elle s'éteint de 60 dB sur toute sa longueur, rien d'autre
    // (la traîne s'éteint à la vitesse du sujet — 60 dB en 2 × son temps d'extinction —, coupée par la lecture suivante si elle
    // arrive avant)
    if (g.tail) { marks.push([g.a, g.b, 'tail', Math.max(g.b - g.a, Rel)]); continue; }
    // (V6.4) la lecture qui suit une traîne commence sur une source éteinte : la traîne continue de s'éteindre jusqu'à ce que
    // la source se rallume —
    // la traîne ne s'éteint que dans le gain de sortie, la résonance du corps (inertie du banc harmonique) continuait de sonner
    // ce qu'elle relisait et reparaissait à plein niveau dès la fin de la traîne (mesuré : violoncelle « la cour », mummer 16,
    // une bouffée à −12 dB de 130 ms puis une coupe de 47 dB en 1 ms)
    if (pv && pv.tail && !alive(g.sa)) {
      const rate = (g.sb - g.sa) / Math.max(1, g.b - g.a); let t = 0;
      while (t < g.b - g.a && !alive(g.sa + rate * t)) t += Bk;
      marks.push([g.a, g.a + t, 'tail', Math.max(pv.b - pv.a, Rel), pv.a]);         // la traîne continue de s'éteindre
      if (t < g.b - g.a) marks.push([g.a + t, g.a + t + Math.min(G.tin * sr, 0.5 * (g.b - g.a - t)), 'in']);
    }
    // (un coup de détaché repart de son attaque à son propre niveau, posé par le gène : pas d'ajustement de raccord)
    const gapBefore = !pv ? g.a > 1 : g.a - pv.b > 1, jump = pv && !pv.tail && !g.stroke && !gapBefore && Math.abs(g.sa - pv.sb) > 0.002 * sr;
    if (gapBefore || (!pv && g.a <= 1 && g.sa > 0.002 * sr)) {
      // entrée : ouverte en temps d'attaque, sauf sur une vraie attaque ou depuis le quasi-silence de la source
      if (alive(g.sa) && !attackNear(P, g.sa)) marks.push([g.a, g.a + Math.min(G.tin * sr, 0.5 * len), 'in']);
      // (V6.3) sur une attaque, l'entrée s'ouvre quand même en 1,5 ms (comme les barrières de la v6.1) : ouverte d'un coup depuis
      // le silence vrai (−90 dB), elle laissait paraître en un bloc ce qui sonnait déjà là — la résonance tenue par l'inertie du
      // corps, la queue d'un grain (mesuré : clics au début des segments de rétrograde + taille, 0,759 s sur la voix)
      else if (alive(g.sa)) marks.push([g.a, g.a + Math.min(0.0015 * sr, 0.5 * len), 'in']);
    } else if (jump) {
      const natural = attackNear(P, g.sa) && G.perc >= 0.5;
      // (V6.4) un saut vers une source bien plus faible (15 dB et plus) est traité comme une sortie : la lecture d'avant s'éteint
      // aux vitesses du sujet (ci-dessous), la nouvelle entre à son propre niveau — mesuré : une accumulation, une rotation qui
      // enchaînaient le milieu d'une note tenue sur le silence d'avant la première attaque tombaient de 25 dB en 15 ms
      if (!natural && !dead(g.sa) && !(lvl(g.sa) < lvl(pv.sb - 1) - 15)) { const d = clamp(lvl(pv.sb - 1) - lvl(g.sa), -18, 9); if (Math.abs(d) > 1) marks.push([g.a, g.a + Math.min(G.tin * sr, 0.5 * len), 'jump', d]); }
    }
    // la lecture saute vers une source éteinte (mesuré : une reprise de détaché enchaînée sur la fin muette du sujet tombait
    // de 40 dB d'un bloc à l'autre) : c'est une sortie
    if (segs[k + 1] && segs[k + 1].tail) continue;
    const nx = segs[k + 1], gapAfter = nx ? (nx.a - g.b > 1 || dead(nx.sa) || (Math.abs(nx.sa - g.sb) > 0.002 * sr && lvl(nx.sa) < lvl(g.sb - 1) - 15 && !(attackNear(P, nx.sa) && G.perc >= 0.5))) : g.b < D - 1;
    if (gapAfter && alive(g.sb - 1)) marks.push([g.b - Math.min(G.tout * sr, 0.5 * len), g.b, 'out']);
  }
  marks.sort((x, y) => x[0] - y[0]);
  // dans un silence de la carte, le silence vrai : le moteur y laissait passer la queue d'un grain (mesuré : un bloc de 10 ms à
  // −15 dB juste après une extinction à −68 dB)
  const hasGap = segs.length && (segs[0].a > 1 || segs.some((g, k) => k && g.a - segs[k - 1].b > 1) || segs[segs.length - 1].b < D - 1);
  // (V6.5) les marques en tableaux plats, parcourues par index : la déstructuration « for (const [a, b, …] of marks) » a échoué
  // dans le JavaScriptCore d'AMORPH (« undefined is not a function (near '...[S,_,O,b,y]...') », mummer 13 jamais né) — une
  // marque y avait perdu son itérateur dans le code compilé à chaud ; l'index ne demande rien à l'itérateur, et il est plus rapide
  const nm = marks.length, MA = new Float64Array(nm), MB = new Float64Array(nm), MK = new Uint8Array(nm), MD = new Float64Array(nm), MO = new Float64Array(nm);
  for (let i = 0; i < nm; ++i) {
    const m = marks[i];
    MA[i] = m[0]; MB[i] = m[1]; MK[i] = m[2] === 'in' ? 0 : m[2] === 'out' ? 1 : m[2] === 'tail' ? 2 : 3;
    MD[i] = m[3] ?? 0; MO[i] = m[4] ?? m[0];
  }
  const junction = t => {
    if (hasGap && map.seg(t) < 0) return -90;
    let v = 0;
    for (let i = 0; i < nm; ++i) {
      const a = MA[i], b = MB[i];
      if (a > t) break; if (t >= b) continue;
      const u = (t - a) / Math.max(1, b - a), kind = MK[i];
      if (kind === 0) v += 20 * Math.log10(Math.max(1e-4, S_(u)));
      else if (kind === 1) v += -60 * u;          // extinction linéaire en dB : la décroissance naturelle d'un son
      else if (kind === 2) v += Math.max(-90, -60 * (t - MO[i]) / MD[i]);
      else v += MD[i] * (1 - S_(u));
    }
    return v;
  };
  const slew = fn => {
    const H = 128, K = Math.ceil(D / H) + 2, y = new Float32Array(K), dUp = G.up * H / sr, dDn = G.down * H / sr;
    let prev = null;
    for (let k = 0; k < K; ++k) {
      let x = fn(Math.min(D - 1, k * H)); if (!Number.isFinite(x)) x = 0; x = Math.max(-60, x);
      if (prev === null) prev = x; else prev = x > prev ? Math.min(x, prev + dUp) : Math.max(x, prev - dDn);
      y[k] = prev;
    }
    return t => { const x = t / H, k = Math.floor(x), w = x - k; if (k < 0) return y[0] <= -59.9 ? -90 : y[0]; if (k >= K - 1) return y[K - 1] <= -59.9 ? -90 : y[K - 1]; const v = y[k] * (1 - w) + y[k + 1] * w; return v <= -59.9 ? -90 : v; };
  };
  return { junction, slew, marks: marks.length + (hasGap ? 1 : 0), G };
}

/** EXTINCTION FINALE — chaque strate dont la lecture va jusqu'au bout de l'enfant, le son encore vivant, se prolonge de
 *  l'extinction finale du sujet (tenue de ses dernières 120 ms de source, décroissance linéaire de 60 dB) ; hardEnd : la
 *  durée qu'on ne dépasse jamais (place de l'emplacement). Rend la nouvelle durée. */
export function finalRelease (P, layers, D, hardEnd) {
  const prof = P.envelope; if (!prof) return D;
  const sr = P.sr, Bk = Math.round(0.01 * sr), env = P.env, nb = env.length, lvl = s => env[clamp(Math.floor(s / Bk), 0, nb - 1)];
  const Rel = clamp(2 * prof.relFinalMs, 80, 3000) / 1000 * sr;
  // la position source là où la strate s'arrête (une boucle peut dépasser la fin : c'est là qu'on la coupe qui compte)
  const endPos = (S, Dl) => { const segs = S.map.segs, g = segs[segs.length - 1]; if (!g || g.b < Dl - 1) return null; const s = S.map.at(Math.min(Dl, g.b) - 1); return s === null ? null : clamp(s, 0, P.n - 1); };
  let need = 0;
  for (const S of layers) { const s = endPos(S, D - S.delay); if (s !== null && lvl(s) >= P.peakDb - 40) need = 1; }
  if (!need) return D;
  const D2 = Math.round(Math.min(hardEnd, D + Rel)), ext = D2 - D, fadeLen = ext > 0.05 * sr ? ext : Math.min(Rel, 0.3 * D);
  for (const S of layers) {
    const segs = S.map.segs, g = segs[segs.length - 1]; if (!g) continue;
    const Dl = D - S.delay, sEnd = endPos(S, Dl); if (sEnd === null || !(lvl(sEnd) >= P.peakDb - 40)) continue;
    // la lecture s'arrête à Dl (la carte a pu aller au-delà : elle est coupée là) et se prolonge en tenue
    const kept = []; let cut = sEnd, back = false;
    for (const x of segs) { if (x.a >= Dl) break; back = x.sb < x.sa; if (x.b > Dl) { cut = x.sa + (x.sb - x.sa) * (Dl - x.a) / Math.max(1, x.b - x.a); kept.push({ ...x, b: Dl, sb: cut }); } else kept.push(x); }
    // la tenue relit, ralenties, les 120 dernières ms LUES, dans le sens de la lecture (une lecture à rebours — rétrograde —
    // se tient sur ce qu'elle vient de lire, pas sur le silence qui précède l'attaque)
    // (V6.4) jamais plus loin en arrière que ce que la dernière lecture a lu : une dernière lecture de 23 ms après une attaque
    // faisait relire la tenue depuis le silence d'avant l'attaque — l'attaque repassait, ralentie, au milieu de l'extinction
    // (mesuré : isopériodicité du violoncelle, un creux de 26 dB en 10 ms à la fin)
    const lastRead = kept.length ? Math.abs(kept[kept.length - 1].sb - kept[kept.length - 1].sa) : 0.12 * sr;
    if (ext > 0.05 * sr) { const H = Math.max(0.005 * sr, Math.min(0.12 * sr, lastRead)); kept.push(back ? { a: Dl, b: Dl + ext, sa: Math.min(P.n - 1, cut + H), sb: cut } : { a: Dl, b: Dl + ext, sa: Math.max(0, cut - H), sb: Math.max(1, cut) }); }
    S.map = new S.map.constructor(kept);
    const f0 = (ext > 0.05 * sr ? Dl : Dl - fadeLen), f1 = f0 + fadeLen;
    S.gainDb.push(t => (t <= f0 ? 0 : t >= f1 ? -90 : -60 * (t - f0) / (f1 - f0)));
  }
  return D2;
}

/** TRAÎNES DE RELÂCHEMENT (V6.4) — Mat : « encore pas mal de coups nets sans sens musical ». Quand la lecture d'une strate
 *  s'interrompt (silence de la carte ensuite) alors que la source sonne encore et ne s'arrête pas d'elle-même dans les 50 ms,
 *  le son ne se coupe plus : il s'éteint comme le sujet s'éteint — une tenue relit lentement ses 120 dernières ms (comme
 *  l'extinction finale), décroissant de 60 dB en deux fois le temps d'extinction du sujet (relMs : 30 dB), dans la place
 *  que laisse le silence (jusqu'à 5 ms avant la lecture suivante). Rend une nouvelle carte, ou null. */
export function releaseTails (P, map, D) {
  const prof = P.envelope; if (!prof || !map || !map.segs) return null;
  const sr = P.sr, Bk = Math.round(0.01 * sr), env = P.env, nb = env.length, lvl = s => env[clamp(Math.floor(s / Bk), 0, nb - 1)];
  const Rel = clamp(2 * prof.relMs, 60, 600) / 1000 * sr, out = []; let added = 0;
  // une lecture qui ne lit que du silence (la source à 40 dB sous sa crête d'un bout à l'autre) ne sonne pas : retirée, elle
  // laisse la place à la traîne de ce qui la précède (mesuré : isopériodicité du violoncelle, des cellules prises dans le
  // silence final du fichier coupaient net la traîne de la cellule d'avant, de −2 à −90 dB)
  const deadSeg = g => { const n = Math.max(1, Math.ceil(Math.abs(g.sb - g.sa) / Bk)); for (let q = 0; q <= n; ++q) if (lvl(g.sa + (g.sb - g.sa) * q / n) >= P.peakDb - 40) return false; return true; };
  // (seulement derrière une lecture qui sonne encore à sa fin : ailleurs, le silence lu reste — mesuré : des lectures de
  // −60 à −70 dB enchaînées, retirées, laissaient des trous à −90 dB)
  const all = map.segs.map(g => ({ ...g })), segs = [];
  for (const g of all) { const pk = segs.length ? segs[segs.length - 1] : null; if (!g.tail && pk && !pk.tail && lvl(pk.sb - Math.sign(pk.sb - pk.sa || 1)) >= P.peakDb - 40 && deadSeg(g)) { added++; continue; } segs.push(g); }
  for (let k = 0; k < segs.length; ++k) {
    const g = segs[k]; out.push(g); if (g.tail) continue;
    const nx = segs[k + 1]; let room = (nx ? nx.a : D) - g.b;
    const se = g.sb - Math.sign(g.sb - g.sa || 1);
    if (g.b - g.a < 0.02 * sr || !(lvl(se) >= P.peakDb - 40)) continue;        // trop court, ou la source ne sonnait plus
    const fwd = g.sb >= g.sa, after = fwd ? g.sb + 5 * Bk : g.sb - 5 * Bk;
    if (lvl(after) < lvl(se) - 20) continue;                                     // elle s'arrête d'elle-même : rien à prolonger
    // la lecture suivante enchaîne sans silence sur une source bien plus faible : la traîne prend la place de son début MUET
    // (40 dB sous la crête du sujet, 15 dB sous ce qui s'éteint) — la lecture suivante commence plus tard, au même endroit du
    // son ; un début doux mais audible (le crescendo d'un archet) n'est jamais retranché
    let lead = 0;
    if (nx && !nx.tail && room < 0.015 * sr && lvl(nx.sa) < lvl(se) - 15) {
      const rate = (nx.sb - nx.sa) / Math.max(1, nx.b - nx.a);
      // (V6.4) retranché tant que la traîne le couvre : la traîne s'éteint de 60 dB en Rel ; le début de la lecture suivante
      // reste caché 6 dB sous elle (un crescendo d'archet qui sort de la traîne est gardé dès qu'il s'entend) — la v6.4 ne
      // retranchait que sous −40 dB de la crête : une accumulation qui relançait la figure du violoncelle depuis le silence
      // d'avant son attaque (−62 à −50 dB) coupait net la figure précédente à −29 dB, deux fois
      while (lead < nx.b - nx.a - 0.02 * sr && lead < Rel) { const s2 = nx.sa + rate * (lead + Bk), tl = lvl(se) - 60 * (lead + Bk) / Rel; if (lvl(s2) >= Math.min(lvl(se) - 15, Math.max(tl - 6, P.peakDb - 40))) break; lead += Bk; }
      room += lead;
    }
    if (room < 0.015 * sr) continue;
    // (V6.4) la traîne va jusqu'à la lecture suivante, sans le silence de 5 ms qui la séparait : ce silence était coupé net
    // (−90 dB) sur une traîne qui n'avait pas fini de s'éteindre (mesuré : isopériodicité sur le violoncelle, un arrêt imposé
    // à chaque fin de cellule) ; avant la fin de la pièce, 5 ms de marge
    const H = Math.min(0.12 * sr, Math.abs(g.sb - g.sa)), ext = Math.min(nx ? room : room - 0.005 * sr, Rel);
    if (ext < 0.01 * sr) continue;
    if (lead > 0) { const rate = (nx.sb - nx.sa) / Math.max(1, nx.b - nx.a), cut = Math.max(0, g.b + ext - nx.a); nx.a += cut; nx.sa += rate * cut; }
    out.push({ a: g.b, b: g.b + ext, sa: fwd ? g.sb - H : g.sb + H, sb: g.sb, tail: true }); added++;
  }
  return added ? new map.constructor(out) : null;
}
