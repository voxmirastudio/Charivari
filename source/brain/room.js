// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// CHARIVARI — L'ESPACE DU SUJET (V6.2, refait en V6.4) : ce que le son garde de la pièce où il a été pris, et ce qu'un mummer en fait.
// V6.4 — Mat : « l'effet Room n'est pas du tout naturel ; l'analyse doit être beaucoup plus proche du timbre de l'espace
// d'origine ; l'espace est beaucoup trop exagéré sur son decay et son spectre ». Mesuré : la v6.3 prenait pour la pièce
// les résonances de l'instrument après un arrêt (la trompette : T60 8,0 / 2,47 / 2,09 s en grave / médium / aigu, le
// violoncelle 8,0 s au grave, la boucle de percussions 2,08 s), puis l'exagérait encore ×1,5 à ×3 dans un réseau de
// retards générique, amorti d'un seul pôle : 3,7 à 7,4 s de réverbération sur une trompette prise dans une pièce sèche.
// Mesures (roomOf, une fois par sujet) :
//   • T60 PAR OCTAVE (63 Hz à 16 kHz), à l'aveugle : la pièce borne la vitesse à laquelle l'énergie peut tomber — on relève
//     la pente de toutes les descentes libres (≥ 12 dB, ≥ 60 ms, au-dessus du plancher de bruit) et l'on garde, par bande,
//     les plus raides (10e centile ; Ratnam et al. 2003, estimation aveugle du temps de réverbération) ; bande sans
//     descente : interpolée de ses voisines ; puis ce qu'une pièce fait toujours : au-dessus de 2 kHz l'air et les parois
//     amortissent (T60 non croissant), le grave au plus 1,6 fois le médium ;
//   • la COHÉRENCE gauche / droite du sujet par octave (une prise mono garde une pièce mono) ;
//   • les PLANS : pour chaque attaque, l'énergie des 50 ms qui la suivent (le son direct) contre celle de 80 à 400 ms —
//     au-dessus de la médiane + 3 dB l'événement est proche, au-dessous de la médiane − 3 dB, lointain.
// Traitements (roomProcess, après le mixage des strates d'un enfant) :
//   • la pièce : une réponse impulsionnelle de BRUIT (suite de Weyl, rien de tiré au hasard) qui s'éteint, octave par
//     octave, au T60 mesuré — le modèle de la réverbération tardive (Jot) : son timbre est celui de la pièce relevée, pas
//     celui d'un réseau de retards ; les 80 premières ms sont clairsemées (réflexions isolées, densité 300 → 3 000 /s),
//     la gauche et la droite gardent la cohérence du sujet ; convolution par blocs (FFT) ;
//   • déréverbérer : soustraction spectrale de la réverbération tardive prédite par le T60 mesuré par octave (Lebart) ;
//   • inverser les plans : les événements proches partent au loin, les lointains se rapprochent.
import { fft } from './fft.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const OCT = [63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];

export function roomOf (P) {
  if (P.__room) return P.__room;
  const sr = P.sr, n = P.n, N = 2048, hop = Math.round(0.005 * sr), nf = Math.max(1, Math.floor((n - N) / hop) + 1);
  const w = new Float64Array(N); for (let i = 0; i < N; ++i) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  const nbO = OCT.length, E = OCT.map(() => new Float64Array(nf)), Eall = new Float64Array(nf), cS = new Float64Array(nbO), lS = new Float64Array(nbO), rS = new Float64Array(nbO);
  const kb = OCT.map(fc => [Math.max(1, Math.round(fc / Math.SQRT2 * N / sr)), Math.min(N / 2, Math.round(fc * Math.SQRT2 * N / sr))]);
  const rL = new Float64Array(N), iL = new Float64Array(N), rR = new Float64Array(N), iR = new Float64Array(N);
  for (let j = 0; j < nf; ++j) {
    for (let i = 0; i < N; ++i) { rL[i] = P.L[j * hop + i] * w[i]; iL[i] = 0; rR[i] = P.R[j * hop + i] * w[i]; iR[i] = 0; }
    fft(rL, iL); fft(rR, iR);
    let tot = 0; kb.forEach(([a, b], q) => { let el = 0, er = 0, cr = 0; for (let k = a; k < b; ++k) { el += rL[k] * rL[k] + iL[k] * iL[k]; er += rR[k] * rR[k] + iR[k] * iR[k]; cr += rL[k] * rR[k] + iL[k] * iR[k]; } E[q][j] = 0.5 * (el + er); tot += E[q][j]; cS[q] += cr; lS[q] += el; rS[q] += er; });
    Eall[j] = tot;
  }
  const dB = x => 10 * Math.log10(x + 1e-20);
  // T60 aveugle par octave : les descentes libres les plus raides
  const raw = OCT.map((_, q) => {
    const e = Array.from(E[q], dB), srt = e.slice().sort((a, b) => a - b), floor = srt[Math.floor(0.05 * srt.length)], sl = [];
    for (let j = 0; j < nf - 12;) {
      let k = j; while (k + 1 < nf && e[k + 1] <= e[k] + 0.5) k++;
      if (k - j >= 12 && e[j] - e[k] >= 12 && e[j] > floor + 20) {
        const xs = [], ys = []; for (let q2 = j; q2 <= k; ++q2) if (e[q2] <= e[j] - 3 && e[q2] >= floor + 8) { xs.push(q2 * hop / sr); ys.push(e[q2]); }
        if (xs.length >= 8) { const mx = xs.reduce((a, b) => a + b, 0) / xs.length, my = ys.reduce((a, b) => a + b, 0) / ys.length; let num = 0, den = 0; xs.forEach((x, i) => { num += (x - mx) * (ys[i] - my); den += (x - mx) ** 2; }); if (den > 0 && num / den < -3) sl.push(num / den); }
      }
      j = Math.max(k, j + 1);
    }
    if (sl.length < 3) return { t60: NaN, n: sl.length };
    sl.sort((a, b) => a - b); return { t60: clamp(-60 / sl[Math.floor(0.1 * sl.length)], 0.1, 3), n: sl.length };
  });
  const known = raw.map(r => r.t60), valid = known.filter(Number.isFinite).length;
  let t60o = known.slice();
  if (!valid) t60o = OCT.map(f => 0.4 * (f <= 250 ? 1.3 : f >= 4000 ? 0.75 : 1));     // pièce non mesurée : 0,4 s, forme courante
  else for (let q = 0; q < nbO; ++q) if (!Number.isFinite(t60o[q])) {       // bande sans descente : ses voisines mesurées (log f)
    let a = q - 1; while (a >= 0 && !Number.isFinite(known[a])) a--; let b = q + 1; while (b < nbO && !Number.isFinite(known[b])) b++;
    t60o[q] = a < 0 ? known[b] : b >= nbO ? known[a] : known[a] + (known[b] - known[a]) * (q - a) / (b - a);
  }
  // ce qu'une pièce fait toujours : l'aigu s'amortit (non croissant au-dessus de 2 kHz), le grave au plus 1,6 × le médium
  const mid = [t60o[3], t60o[4], t60o[5]].sort((a, b) => a - b)[1];
  for (let q = 6; q < nbO; ++q) t60o[q] = Math.min(t60o[q], t60o[q - 1]);
  for (let q = 0; q < 3; ++q) t60o[q] = Math.min(t60o[q], 1.6 * mid);
  const coh = OCT.map((_, q) => clamp(cS[q] / Math.sqrt(lS[q] * rS[q] + 1e-30), 0, 1));
  // les QUEUES (arrêts rapides, comme en v6.2) : leur nombre et leur niveau 50 ms après l'arrêt (affichage)
  let pkAll = -1e9; for (let j = 0; j < nf; ++j) pkAll = Math.max(pkAll, dB(Eall[j]));
  const tails = [];
  for (let j = 0; j + 12 < nf; ++j) {
    const a = dB(Eall[j]); if (a < pkAll - 30) continue;
    let k = 0; for (let q = 1; q <= 10; ++q) if (dB(Eall[j + q]) <= a - 10) { k = q; break; }
    if (!k) continue;
    let e = j + k; while (e + 6 < nf && dB(Eall[e + 6]) < dB(Eall[e]) + 3) e += 1;
    if (e - j >= 30) { tails.push([j, j + k, e, a]); j = e; }
  }
  const tailDb = tails.length ? tails.map(([j0, , je]) => dB(Eall[Math.min(je, j0 + 10)]) - dB(Eall[j0])).sort((a, b) => a - b)[tails.length >> 1] : null;
  const H10 = Math.round(0.01 * sr / hop);
  const ons = (P.onsetsAll || []).map(o => Math.floor(o.s / hop)).filter(j => j >= 0 && j < nf).sort((a, b) => a - b);
  // plans : direct (0–50 ms) / pièce (80–400 ms), quand rien n'attaque entre-temps
  const events = [];
  for (let i = 0; i < ons.length; ++i) {
    const j0 = ons[i], jn = i + 1 < ons.length ? ons[i + 1] : nf; if (jn - j0 < 40 * H10) continue;
    let ed = 0, er = 0; for (let j = j0; j < j0 + 5 * H10 && j < nf; ++j) ed += Eall[j]; const j2 = Math.min(jn, j0 + 40 * H10, nf); for (let j = j0 + 8 * H10; j < j2; ++j) er += Eall[j];
    if (ed > 0 && er > 0) events.push({ s: j0 * hop, drr: dB(ed / (5 * H10)) - dB(er / Math.max(1, j2 - j0 - 8 * H10)) });
  }
  const dr = events.map(e => e.drr).sort((a, b) => a - b), med = dr.length ? dr[dr.length >> 1] : 0;
  events.forEach(e => { e.plane = e.drr >= med + 3 ? 'near' : e.drr <= med - 3 ? 'far' : 'mid'; });
  const avg = qs => qs.reduce((a, q) => a + t60o[q], 0) / qs.length;
  return (P.__room = { t60o, coh, t60: [avg([0, 1, 2]), avg([3, 4, 5]), avg([6, 7, 8])], t60m: mid, measured: valid >= 2, nBands: valid, decays: raw.map(r => r.n), tails: tails.length, tailDb, drrMed: med, events, nNear: events.filter(e => e.plane === 'near').length, nFar: events.filter(e => e.plane === 'far').length });
}

// T60 à la fréquence f (interpolé en log f entre les octaves)
function t60At (room, f) {
  const t = room.t60o; if (f <= OCT[0]) return t[0]; if (f >= OCT[OCT.length - 1]) return t[OCT.length - 1];
  const x = Math.log2(f / OCT[0]), q = Math.floor(x), u = x - q; return t[q] * (1 - u) + t[q + 1] * u;
}

// déréverbération : gains par trame et par raie, phases gardées ; amount(t) ∈ [0, 1] (0 : rien, 1 : toute la force demandée)
function dereverb (X, sr, room, beta, floorDb, amount) {
  const n = X.length, N = 2048, H = N / 4, nf = Math.ceil(n / H) + 4, out = new Float64Array(n), wsum = new Float64Array(n);
  const w = new Float64Array(N); for (let i = 0; i < N; ++i) w[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N);
  // (la réverbération TARDIVE seulement : 80 ms ; T60 plafonné à 2,5 s — sur un son tenu, le modèle prend aussi le son direct
  // pour de la pièce, et plus le T60 est long plus il en retire)
  const Tl = Math.max(1, Math.round(0.08 * sr / H)), K = N / 2 + 1, gmin = Math.pow(10, floorDb / 20);
  const decay = new Float64Array(K); for (let k = 0; k < K; ++k) { const d = 3 * Math.log(10) / clamp(t60At(room, Math.max(20, k * sr / N)), 0.05, 2.5); decay[k] = Math.exp(-2 * d * Tl * H / sr); }
  const hist = []; const Ps = new Float64Array(K), Gs = new Float64Array(K).fill(1), re = new Float64Array(N), im = new Float64Array(N);
  for (let j = 0; j < nf; ++j) {
    const c = j * H - N / 2;
    for (let i = 0; i < N; ++i) { const s = c + i; re[i] = s >= 0 && s < n ? X[s] * w[i] : 0; im[i] = 0; }
    fft(re, im);
    const pw = new Float64Array(K); for (let k = 0; k < K; ++k) { const p = re[k] * re[k] + im[k] * im[k]; Ps[k] = 0.7 * Ps[k] + 0.3 * p; pw[k] = Ps[k]; }
    hist.push(pw); const old = hist.length > Tl ? hist[hist.length - 1 - Tl] : null;
    const a = clamp(amount(Math.max(0, j * H)), 0, 1);
    for (let k = 0; k < K; ++k) {
      let g = 1;
      if (old && a > 0) { const late = decay[k] * old[k]; g = Math.max(gmin, 1 - beta * a * late / (pw[k] + 1e-20)); g = Math.pow(g, 0.5); }
      Gs[k] = g < Gs[k] ? g : 0.6 * Gs[k] + 0.4 * g;          // le gain descend vite et remonte doucement (pas de musique d'artefacts)
      const gg = 1 - a + a * Gs[k];
      re[k] *= gg; im[k] *= gg; if (k > 0 && k < N / 2) { re[N - k] *= gg; im[N - k] *= gg; }
    }
    // synthèse (FFT inverse par conjugaison)
    for (let i = 0; i < N; ++i) im[i] = -im[i];
    fft(re, im);
    for (let i = 0; i < N; ++i) { const s = c + i; if (s < 0 || s >= n) continue; out[s] += re[i] / N * w[i]; wsum[s] += w[i] * w[i]; }
    if (hist.length > Tl + 2) hist.shift();
  }
  for (let i = 0; i < n; ++i) out[i] = wsum[i] > 1e-9 ? out[i] / wsum[i] : 0;
  return out;
}

// RÉPONSE DE LA PIÈCE (V6.4) : bruit clairsemé puis dense (« velvet noise » : une impulsion ±1 par intervalle, positions et
// signes par suites de Weyl — aucun tirage), densité 300 → 3 000 /s sur les 80 premières ms, chaque intervalle d'énergie
// égale ; façonné par trames (TFCT 1 024 / 256) : chaque raie s'éteint à exp(−6,91 t / T60(f)) — le T60 mesuré par octave ×
// scale ; la droite = c·gauche + √(1 − c²)·autre bruit, c la cohérence gauche / droite du sujet dans cette octave ; 6 ms
// avant la première réflexion. Énergie 1 par voie.
function lateIR (room, scale, sr, gOct = null) {
  const tmax = Math.max(...room.t60o) * scale, len = Math.min(Math.round(4 * sr), Math.round((1.15 * tmax + 0.01) * sr)), pd = Math.round(0.006 * sr);
  // positions et signes : suites de Weyl QUADRATIQUES (frac(α·n²)) — une suite linéaire donne des signes quasi périodiques, sans grave
  // (mesuré : 125–250 Hz s'éteignaient en 0,3 à 0,65 s pour une cible de 1 s)
  const velvet = (a0, b0) => { const x = new Float64Array(len); let t = pd, u = 0, du = a0, v = 0, dv = b0; while (t < len) { const ts = (t - pd) / sr, dens = Math.min(3000, 300 + 2700 * ts / 0.08), Td = sr / dens; u += du; u -= Math.floor(u); du += 2 * a0; du -= Math.floor(du); v += dv; v -= Math.floor(v); dv += 2 * b0; dv -= Math.floor(dv); const p = Math.min(len - 1, Math.round(t + u * Td)); x[p] += (v < 0.5 ? -1 : 1) / Math.sqrt(dens); t += Td; } return x; };
  const n1 = velvet(0.6180339887498949, 0.4142135623730951), n2 = velvet(0.7320508075688772, 0.2360679774997897);
  const N = 1024, H = 256, K = N / 2 + 1, w = new Float64Array(N).map((_, i) => 0.5 - 0.5 * Math.cos(2 * Math.PI * i / N));
  const dk = new Float64Array(K), ck = new Float64Array(K);
  const gk = new Float64Array(K).fill(1);
  if (gOct) for (let k = 0; k < K; ++k) { const f = Math.max(OCT[0], Math.min(OCT[OCT.length - 1], k * sr / N)), x = Math.log2(f / OCT[0]), q = Math.min(OCT.length - 2, Math.floor(x)), u = x - q; gk[k] = gOct[q] * (1 - u) + gOct[q + 1] * u; }
  for (let k = 0; k < K; ++k) { const f = Math.max(20, k * sr / N); dk[k] = 6.907755 / (t60At(room, f) * scale); const x = Math.log2(f / OCT[0]), q = Math.max(0, Math.min(OCT.length - 2, Math.floor(x))), u = Math.max(0, Math.min(1, x - q)); ck[k] = clamp(room.coh[q] * (1 - u) + room.coh[q + 1] * u, 0.05, 1); }
  const oL = new Float64Array(len + N), oR = new Float64Array(len + N), ws = new Float64Array(len + N);
  const a1 = new Float64Array(N), b1 = new Float64Array(N), a2 = new Float64Array(N), b2 = new Float64Array(N);
  for (let c = -N / 2; c < len; c += H) {
    for (let i = 0; i < N; ++i) { const s2 = c + i; a1[i] = s2 >= 0 && s2 < len ? n1[s2] * w[i] : 0; b1[i] = 0; a2[i] = s2 >= 0 && s2 < len ? n2[s2] * w[i] : 0; b2[i] = 0; }
    fft(a1, b1); fft(a2, b2);
    const tc = Math.max(0, c + N / 2 - pd) / sr;
    for (let k = 0; k < K; ++k) {
      const g = gk[k] * Math.exp(-dk[k] * tc), cc = ck[k], ss = Math.sqrt(1 - cc * cc);
      const lr = a1[k] * g, li = b1[k] * g, rr = (cc * a1[k] + ss * a2[k]) * g, ri = (cc * b1[k] + ss * b2[k]) * g;
      a1[k] = lr; b1[k] = li; a2[k] = rr; b2[k] = ri;
      if (k > 0 && k < N / 2) { a1[N - k] = lr; b1[N - k] = -li; a2[N - k] = rr; b2[N - k] = -ri; }
    }
    for (let i = 0; i < N; ++i) { b1[i] = -b1[i]; b2[i] = -b2[i]; }
    fft(a1, b1); fft(a2, b2);
    for (let i = 0; i < N; ++i) { const s2 = c + i; if (s2 < 0) continue; oL[s2] += a1[i] / N * w[i]; oR[s2] += a2[i] / N * w[i]; ws[s2] += w[i] * w[i]; }
  }
  const irL = new Float64Array(len), irR = new Float64Array(len); let eL = 0, eR = 0;
  for (let i = 0; i < len; ++i) { const d = ws[i] > 1e-9 ? ws[i] : 1; irL[i] = oL[i] / d; irR[i] = oR[i] / d; eL += irL[i] * irL[i]; eR += irR[i] * irR[i]; }
  if (gOct) return [irL, irR];
  const gL = 1 / Math.sqrt(eL || 1), gR = 1 / Math.sqrt(eR || 1); for (let i = 0; i < len; ++i) { irL[i] *= gL; irR[i] *= gR; }
  return [irL, irR];
}

// (V6.5) RÉPONSE DE LA PIÈCE : ses PREMIÈRES RÉFLEXIONS viennent d'une pièce physique, la queue reste le modèle statistique
// ci-dessus. Les 80 premières ms étaient des impulsions de bruit clairsemées (300 → 3 000 /s) placées sans géométrie : un
// départ « crépitant », le même dans toute pièce. Maintenant (Allen & Berkley, sources images) :
//   • une pièce parallélépipédique 1 : 1,4 : 1,9 dont la taille vient du T60 mesuré à 1 kHz (Eyring, absorption moyenne
//     0,25 à 1 kHz : 0,4 s → 3,2 × 4,5 × 6,1 m, 1,5 s → 12 × 17 × 23 m) ; l'absorption de ses parois octave par octave est
//     celle qui donne le T60 mesuré dans cette octave (Eyring inversée), chaque réflexion filtrée par β(f)^(nombre de parois) ;
//   • une source un peu décentrée, un couple ORTF (17 cm, cardioïdes à ±55°) à quelques mètres et au-dessus d'elle : les réflexions arrivent à
//     gauche et à droite à leurs temps et niveaux vrais ; la largeur est ramenée à la cohérence gauche/droite du sujet à 1 kHz ;
//   • une pièce réelle diffuse : chaque réflexion garde (1 − 0,3)^parois de son énergie spéculaire (coefficient de diffusion
//     0,3), le reste rejoint la part diffuse — la queue statistique, qui monte dès la première réflexion selon l'ordre moyen
//     des réflexions à cet instant (c·t·S / 4V) ; et chaque source image est déplacée de ±4 cm (suite de Weyl, méthode des
//     images randomisée de De Sena) : ni écho glissant ni flottement entre parois parallèles ;
//   • calcul exact dans le domaine des fréquences (retards fractionnaires sans approximation), son direct exclu (c'est le son
//     lui-même) ; jusqu'au temps de mélange (2·√V ms, de 20 à 90 ms), puis fondu de 20 ms vers la queue, dont le niveau
//     est accordé octave par octave sur l'énergie des réflexions dans la fenêtre du fondu
function earlyIR (room, scale, sr) {
  const T1k = t60At(room, 1000) * scale, s = clamp(8.01 * T1k, 2, 25), Lx = 1.4 * s, Ly = 1.9 * s, Lz = s, V = Lx * Ly * Lz, S = 2 * (Lx * Ly + Lx * Lz + Ly * Lz), Ky = 0.161 * V / S, c = 343;
  const t1 = clamp(0.002 * Math.sqrt(V), 0.02, 0.09), t2 = t1 + 0.02, SC = 0.3, lnS = 0.5 * Math.log(1 - SC);
  let wi = 0; const jit = () => { wi += 1; const u = (0.7548776662466927 * wi) % 1, v = (0.5698402909980532 * wi) % 1, w = (0.4142135623730951 * wi * wi) % 1; return [0.08 * (u - 0.5), 0.08 * (v - 0.5), 0.08 * (w - 0.5)]; };
  // réflexion des parois (pression) par octave : T60 = K / −ln(1 − α) ; le SOL est absorbant (public, tapis : 0,5 à 125 Hz,
  // 0,9 dès 1 kHz) et les autres parois portent le reste de l'absorption moyenne — un sol dur ajouterait à 3–5 ms une
  // réflexion forte que le sujet porte déjà de sa propre pièce : un filtre en peigne
  const Sf = Lx * Ly, aF = f => Math.min(0.9, Math.max(0.5, 0.5 + 0.15 * Math.log2(f / 125)));
  const aAvg = f => { const T = Math.max(0.05, t60At(room, f) * scale); return clamp(1 - Math.exp(-Ky / T), 0.005, 0.98); };
  const lnB = OCT.map(f => { const a = aAvg(f), af = Math.max(a, aF(f)), ar = clamp((S * a - Sf * af) / (S - Sf), 0.005, 0.98); return 0.5 * Math.log(1 - ar); });
  const lnBf = OCT.map(f => 0.5 * Math.log(1 - Math.max(aAvg(f), aF(f))));
  // la source à 1,2 m, le couple au-dessus d'elle (comme une prise d'ensemble) : assez haut pour que les réflexions du sol
  // et du plafond arrivent ~5 ms après le son direct — le sujet porte déjà celles de la pièce où il a été pris ; plus tôt
  // elles ne feraient qu'un filtre en peigne
  const hs = Math.min(1.2, 0.35 * Lz), Dh = clamp(0.25 * Ly, 1.5, 6), hm = clamp(0.9 * Dh / hs, 1.6, 0.7 * Lz);
  const src = [0.39 * Lx, 0.3 * Ly, hs], rc = [0.5 * Lx, src[1] + Dh, hm];
  const toS = [src[0] - rc[0], src[1] - rc[1], 0], nS = Math.hypot(toS[0], toS[1]), ax0 = [toS[0] / nS, toS[1] / nS];
  const rot = (v, ang) => [v[0] * Math.cos(ang) - v[1] * Math.sin(ang), v[0] * Math.sin(ang) + v[1] * Math.cos(ang)];
  // le couple face à la source : à gauche (perpendiculaire +90°) le micro gauche, tourné de +55°
  const perp = [-ax0[1], ax0[0]];
  const mics = [{ p: [rc[0] + 0.085 * perp[0], rc[1] + 0.085 * perp[1], rc[2]], ax: rot(ax0, 55 * Math.PI / 180) }, { p: [rc[0] - 0.085 * perp[0], rc[1] - 0.085 * perp[1], rc[2]], ax: rot(ax0, -55 * Math.PI / 180) }];
  const tEnd = t2 + 0.005; let N = 1; while (N < (tEnd + 0.02) * sr) N *= 2; const K = N / 2 + 1;
  // β(f)^h par case, h = 0 … hMax
  const hMax = 60, lnBk = new Float64Array(K), lnBfk = new Float64Array(K);
  for (let k = 0; k < K; ++k) { const f = Math.max(OCT[0], Math.min(OCT[OCT.length - 1], k * sr / N)), x = Math.log2(f / OCT[0]), q = Math.min(OCT.length - 2, Math.floor(x)), u = x - q; lnBk[k] = lnB[q] * (1 - u) + lnB[q + 1] * u; lnBfk[k] = lnBf[q] * (1 - u) + lnBf[q + 1] * u; }
  const roll = new Float64Array(K); for (let k = 0; k < K; ++k) { const f = k * sr / N; roll[k] = f <= 20000 ? 1 : f >= 0.5 * sr ? 0 : 0.5 + 0.5 * Math.cos(Math.PI * (f - 20000) / (0.5 * sr - 20000)); }
  const out = mics.map(m => {
    const d0 = Math.hypot(src[0] - m.p[0], src[1] - m.p[1], src[2] - m.p[2]), Hr = new Float64Array(K), Hi = new Float64Array(K), byH = new Map();
    const reach = c * tEnd + d0, nx = Math.ceil(reach / (2 * Lx)) + 1, ny = Math.ceil(reach / (2 * Ly)) + 1, nz = Math.ceil(reach / (2 * Lz)) + 1;
    for (let qx = -nx; qx <= nx; ++qx) for (let px = 0; px < 2; ++px) for (let qy = -ny; qy <= ny; ++qy) for (let py = 0; py < 2; ++py) for (let qz = -nz; qz <= nz; ++qz) for (let pz = 0; pz < 2; ++pz) {
      const hits = Math.abs(2 * qx - px) + Math.abs(2 * qy - py) + Math.abs(2 * qz - pz); if (!hits || hits > hMax) continue;
      const jj = jit(), ix = (1 - 2 * px) * src[0] + 2 * qx * Lx + jj[0], iy = (1 - 2 * py) * src[1] + 2 * qy * Ly + jj[1], iz = (1 - 2 * pz) * src[2] + 2 * qz * Lz + jj[2];
      const dx = ix - m.p[0], dy = iy - m.p[1], dz = iz - m.p[2], d = Math.hypot(dx, dy, dz), tau = (d - d0) / c;
      if (tau <= 0 || tau > tEnd) continue;
      const cosT = (dx * m.ax[0] + dy * m.ax[1]) / d, g = 0.5 * (1 + cosT);       // cardioïde dans le plan horizontal
      const amp = g / d * Math.exp(hits * lnS); if (amp < 1e-7) continue;
      const hf = Math.abs(qz - pz), key = (hits - hf) * 64 + hf;
      let L = byH.get(key); if (!L) byH.set(key, L = []); L.push(amp, tau);
    }
    for (const [key, L] of byH) {
      const h = Math.floor(key / 64), hf = key % 64, Bh = new Float64Array(K); for (let k = 0; k < K; ++k) Bh[k] = Math.exp(h * lnBk[k] + hf * lnBfk[k]) * roll[k];
      for (let q = 0; q < L.length; q += 2) {
        const amp = L[q], w = -2 * Math.PI * L[q + 1] * sr / N, cw = Math.cos(w), sw = Math.sin(w);
        let cr = amp, ci = 0;
        for (let k = 0; k < K; ++k) { Hr[k] += cr * Bh[k]; Hi[k] += ci * Bh[k]; const nr = cr * cw - ci * sw; ci = cr * sw + ci * cw; cr = nr; }
      }
    }
    const re = new Float64Array(N), im = new Float64Array(N);
    for (let k = 0; k < K; ++k) { re[k] = Hr[k]; im[k] = Hi[k]; if (k > 0 && k < N / 2) { re[N - k] = Hr[k]; im[N - k] = -Hi[k]; } }
    for (let k = 0; k < N; ++k) im[k] = -im[k]; fft(re, im);
    return Float64Array.from({ length: Math.round(tEnd * sr) }, (_, i) => re[i] / N);
  });
  return { L: out[0], R: out[1], t1, t2, dims: [Lx, Ly, Lz], diffuseAt: t => 1 - Math.pow(1 - SC, Math.max(0, c * t * S / (4 * V))), t0: Math.max(0.001, (Math.min(Lx, Ly, Lz) * 0.5) / c) };
}
function octEnergy (x, a, b, sr) {
  let N = 1; while (N < b - a) N *= 2; const re = new Float64Array(N), im = new Float64Array(N);
  for (let i = a; i < b; ++i) re[i - a] = x[i] || 0; fft(re, im);
  return OCT.map(fc => { const k0 = Math.max(1, Math.round(fc / Math.SQRT2 * N / sr)), k1 = Math.min(N / 2, Math.round(fc * Math.SQRT2 * N / sr)); let e = 0; for (let k = k0; k < k1; ++k) e += re[k] ** 2 + im[k] ** 2; return e; });
}
function roomIR (room, scale, sr) {
  const E = earlyIR(room, scale, sr), n1 = Math.round(E.t1 * sr), n2 = Math.round(E.t2 * sr);
  // largeur des réflexions : la cohérence gauche/droite du sujet à 1 kHz
  { let em = 0, es = 0; for (let i = 0; i < E.L.length; ++i) { const m = 0.5 * (E.L[i] + E.R[i]), d = 0.5 * (E.L[i] - E.R[i]); em += m * m; es += d * d; }
    const cT = clamp(room.coh[4], 0, 0.999), gam = es > 0 ? Math.min(2, Math.sqrt(em * (1 - cT) / (es * (1 + cT)))) : 1;
    for (let i = 0; i < E.L.length; ++i) { const m = 0.5 * (E.L[i] + E.R[i]), d = 0.5 * (E.L[i] - E.R[i]) * gam; E.L[i] = m + d; E.R[i] = m - d; } }
  const [lL, lR] = lateIR(room, scale, sr, OCT.map(() => 1));
  // niveau de la queue, octave par octave : l'énergie des réflexions dans la fenêtre du fondu
  const eE = octEnergy(E.L, n1, n2, sr).map((v, q) => v + octEnergy(E.R, n1, n2, sr)[q]), eT = octEnergy(lL, n1, n2, sr).map((v, q) => v + octEnergy(lR, n1, n2, sr)[q]);
  // (les réflexions spéculaires n'y portent plus que (1 − part diffuse) de l'énergie de la pièce)
  const spec = Math.max(0.05, 1 - E.diffuseAt(0.5 * (E.t1 + E.t2)));
  const gq = eE.map((v, q) => eT[q] > 0 ? Math.sqrt(v / spec / eT[q]) : 0), gs = gq.slice().sort((a, b) => a - b), gm = gs[gs.length >> 1];
  const gOct = gq.map(g => clamp(g, gm / 2, gm * 2));
  const [tL, tR] = lateIR(room, scale, sr, gOct), len = Math.max(tL.length, n2), irL = new Float64Array(len), irR = new Float64Array(len);
  for (let i = 0; i < len; ++i) {
    // avant le temps de mélange : réflexions spéculaires + la part diffuse (en énergie) de l'ordre moyen atteint ; puis fondu
    const u = i <= n1 ? 0 : i >= n2 ? 1 : (i - n1) / (n2 - n1), we = Math.cos(0.5 * Math.PI * u) ** 2, wd = Math.sqrt(E.diffuseAt(i / sr)), wl = 1 - we + we * wd;
    irL[i] = (i < E.L.length ? we * E.L[i] : 0) + (i < tL.length ? wl * tL[i] : 0);
    irR[i] = (i < E.R.length ? we * E.R[i] : 0) + (i < tR.length ? wl * tR[i] : 0);
  }
  let eL = 0, eR = 0; for (let i = 0; i < len; ++i) { eL += irL[i] * irL[i]; eR += irR[i] * irR[i]; }
  const gL = 1 / Math.sqrt(eL || 1), gR = 1 / Math.sqrt(eR || 1); for (let i = 0; i < len; ++i) { irL[i] *= gL; irR[i] *= gR; }
  return [irL, irR];
}
// convolution par blocs (partitions uniformes de 2 048, FFT 4 096) ; sortie de la longueur de x
function convolve (x, ir) {
  const n = x.length, B = 2048, N = 2 * B, Pn = Math.ceil(ir.length / B), y = new Float64Array(n);
  const Hr = [], Hi = [];
  for (let p = 0; p < Pn; ++p) { const re = new Float64Array(N), im = new Float64Array(N); for (let i = 0; i < B && p * B + i < ir.length; ++i) re[i] = ir[p * B + i]; fft(re, im); Hr.push(re); Hi.push(im); }
  const nb = Math.ceil(n / B), Xr = [], Xi = [], acc = new Float64Array(N), aci = new Float64Array(N);
  for (let m = 0; m < nb + Pn; ++m) {
    const re = new Float64Array(N), im = new Float64Array(N); if (m < nb) for (let i = 0; i < B && m * B + i < n; ++i) re[i] = x[m * B + i]; fft(re, im); Xr.unshift(re); Xi.unshift(im); if (Xr.length > Pn) { Xr.pop(); Xi.pop(); }
    acc.fill(0); aci.fill(0);
    for (let p = 0; p < Xr.length; ++p) { const ar = Xr[p], ai = Xi[p], hr = Hr[p], hi = Hi[p]; for (let k = 0; k < N; ++k) { acc[k] += ar[k] * hr[k] - ai[k] * hi[k]; aci[k] += ar[k] * hi[k] + ai[k] * hr[k]; } }
    for (let k = 0; k < N; ++k) aci[k] = -aci[k];
    fft(acc, aci);
    for (let i = 0; i < N; ++i) { const t = m * B + i; if (t < n) y[t] += acc[i] / N; }
  }
  return y;
}
// la pièce sur (L, R) : la somme des deux voies (envoi send(t)) dans la réponse stéréo ; renvoie [wetL, wetR]
function reverb (L, R, sr, room, scale, send) {
  const [irL, irR] = roomIR(room, scale, sr), n = L.length, x = new Float64Array(n);
  for (let i = 0; i < n; ++i) x[i] = 0.5 * (L[i] + R[i]) * send(i);
  return [convolve(x, irL), convolve(x, irR)];
}

// mode 0 : la pièce exagérée ; 1 : déréverbération ; 2 : plans inversés. iota : la dose. srcAt(t) : position source de
// l'instant t de l'enfant (null hors carte) — pour retrouver les plans des événements du sujet
export function roomProcess (P, L, R, spec, srcAt) {
  const room = roomOf(P), sr = P.sr, n = L.length, iota = spec.iota, mode = spec.mode;
  const energy = (A, B) => { let e = 0; for (let i = 0; i < A.length; ++i) e += A[i] * A[i] + B[i] * B[i]; return e; };
  const eDry = energy(L, R), fmt = sc => `${(room.t60o[4] * sc).toFixed(2)} s at 1 kHz, ${(room.t60o[1] * sc).toFixed(2)} s at 125 Hz, ${(room.t60o[7] * sc).toFixed(2)} s at 8 kHz`;
  const src = room.measured ? `the subject's room, measured in ${room.nBands} octaves` : 'a room of 0.4 s (the subject\'s could not be measured)';
  // (V6.4) la pièce agrandie au plus de moitié (la v6.3 : ×1,5 à ×3) et sous le son de 14 à 6 dB (v6.3 : 12 à 0 dB)
  if (mode === 0) {
    const sc = 1 + 0.5 * iota, lev = -14 + 8 * iota, [wL, wR] = reverb(L, R, sr, room, sc, () => 1);
    const eW = energy(wL, wR), g = eW > 0 ? Math.sqrt(eDry / eW * Math.pow(10, lev / 10)) : 0;
    for (let i = 0; i < n; ++i) { L[i] += g * wL[i]; R[i] += g * wR[i]; }
    return `the room enlarged: ${src} × ${sc.toFixed(2)} (${fmt(sc)}), ${lev.toFixed(0)} dB under the sound`;
  }
  const evs = room.events, planeAt = t => { const s = srcAt(t); if (s === null || s === undefined || !evs.length) return 'mid'; let lo = 0, hi = evs.length - 1; if (s < evs[0].s) return evs[0].plane; while (hi - lo > 1) { const m = (lo + hi) >> 1; if (evs[m].s <= s) lo = m; else hi = m; } return evs[s >= evs[hi].s ? hi : lo].plane; };
  const beta = 0.4 + 0.5 * iota, fl = -(6 + 10 * iota);
  if (mode === 1) {
    const dl = dereverb(L, sr, room, beta, fl, () => 1), dr = dereverb(R, sr, room, beta, fl, () => 1);
    for (let i = 0; i < n; ++i) { L[i] = dl[i]; R[i] = dr[i]; }
    return `dereverberated: the late reverberation predicted by ${src} (${fmt(1)}) removed, down to ${fl.toFixed(0)} dB`;
  }
  if (mode === 3) {
    // sans plans mesurables : la PROFONDEUR PAR REGISTRE — le grave (sous 350 Hz, deux pôles) part au loin dans la pièce, le
    // reste se rapproche (déréverbéré)
    const a1 = Math.exp(-2 * Math.PI * 350 / sr), split = X => { const lo = new Float64Array(n); let y1 = 0, y2 = 0; for (let i = 0; i < n; ++i) { y1 = (1 - a1) * X[i] + a1 * y1; y2 = (1 - a1) * y1 + a1 * y2; lo[i] = y2; } return lo; };
    const lL = split(L), lR = split(R), hL = Float64Array.from(L, (x, i) => x - lL[i]), hR = Float64Array.from(R, (x, i) => x - lR[i]);
    const dL = dereverb(hL, sr, room, beta, fl, () => 1), dR = dereverb(hR, sr, room, beta, fl, () => 1);
    const sc = 1 + 0.4 * iota, lev = -10 + 6 * iota, [wL, wR] = reverb(lL, lR, sr, room, sc, () => 1);
    const eW = energy(wL, wR), eLo = energy(lL, lR), g = eW > 0 ? Math.sqrt(eLo / eW * Math.pow(10, lev / 10)) : 0;
    for (let i = 0; i < n; ++i) { L[i] = dL[i] + lL[i] * (1 - 0.3 * iota) + g * wL[i]; R[i] = dR[i] + lR[i] * (1 - 0.3 * iota) + g * wR[i]; }
    return `depth by register: the low register (under 350 Hz) sent into ${src} × ${sc.toFixed(2)}, ${lev.toFixed(0)} dB under it, the rest brought near (dereverberated)`;
  }
  // plans inversés : 1 = proche (part au loin), 0 = lointain (se rapproche) ; lissé sur 80 ms
  const Bk = Math.round(0.01 * sr), nb = Math.ceil(n / Bk), wNear = new Float64Array(nb);
  for (let b = 0; b < nb; ++b) { const p = planeAt(b * Bk); wNear[b] = p === 'near' ? 1 : p === 'far' ? 0 : 0.5; }
  for (let b = 1; b < nb; ++b) wNear[b] = wNear[b - 1] + (wNear[b] - wNear[b - 1]) * 0.12;
  const wAt = t => wNear[Math.min(nb - 1, Math.floor(t / Bk))];
  const dl = dereverb(L, sr, room, beta, fl, t => 1 - wAt(t)), dr = dereverb(R, sr, room, beta, fl, t => 1 - wAt(t));
  const sc = 1 + 0.3 * iota, lev = -12 + 8 * iota, [wL, wR] = reverb(L, R, sr, room, sc, t => wAt(t));
  const eW = energy(wL, wR), g = eW > 0 ? Math.sqrt(eDry / eW * Math.pow(10, lev / 10)) : 0;
  for (let i = 0; i < n; ++i) { const a = wAt(i); L[i] = dl[i] * (1 - 0.4 * a) + g * wL[i]; R[i] = dr[i] * (1 - 0.4 * a) + g * wR[i]; }
  return `planes inverted: the ${room.nNear} near events sent into ${src} × ${sc.toFixed(2)}, the ${room.nFar} far ones brought near (dereverberated)`;
}
// (V6.4) ce que la déréverbération retirerait du sujet à pleine dose (dB) : une pièce sèche n'a presque rien à rendre
export function dereverbDb (P) {
  if (P.__derevDb !== undefined) return P.__derevDb;
  const room = roomOf(P), M = Float64Array.from(P.L, (v, i) => 0.5 * (v + P.R[i])), d = dereverb(M, P.sr, room, 0.9, -16, () => 1);
  let a = 0, b = 0; for (let i = 0; i < M.length; ++i) { a += M[i] * M[i]; b += d[i] * d[i]; }
  return (P.__derevDb = 10 * Math.log10((b + 1e-30) / (a + 1e-30)));
}
export function __roomIR (room, scale, sr) { return roomIR(room, scale, sr); }
export function __lateIR (room, scale, sr) { return lateIR(room, scale, sr); }
export function __earlyIR (room, scale, sr) { return earlyIR(room, scale, sr); }
