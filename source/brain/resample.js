// Charivari 1.0 — Copyright (C) 2026 Matthieu Guillin, Vox Mira Studio — free software under the GNU GPL, version 3 or later (LICENSE)
// ============================================================================================
//  CHARIVARI — RÉÉCHANTILLONNAGE ET LECTURE FRACTIONNAIRE DE HAUTE QUALITÉ (V6.5)
//  Conçu sur les objectifs de r8brain-free-src (Aleksey Vaneev, Voxengo, licence MIT) : bande passante plate jusqu'à
//  ~20 kHz, réjection ≥ 120 dB, aucun repli sous 20 kHz. Ce n'est pas une traduction de son code (ses étages FFT servent
//  un rapport fixe) : ici un sinus cardinal fenêtré de Kaiser TABULÉ (4 096 phases par échantillon, interpolation linéaire
//  entre phases : erreur de table ≤ −140 dB par prise), de longueur calculée par la formule de Kaiser pour la transition
//  demandée, utilisable à toute position fractionnaire et à toute vitesse de lecture.
//
//  Lecture d'un son à 48 kHz à la position p (fractionnaire), vitesse q (pas de lecture par échantillon de sortie) :
//   • q ≥ 0,833 — noyau A : coupure à Nyquist, transition 20 → 28 kHz, 120 dB, 48 prises. Les images de ce qui est
//     sous 20 kHz tombent au-delà de 28 kHz (rejetées) ; seules celles de 20–24 kHz restent partielles et retombent au-dessus
//     de 20 kHz après lecture. Accéléré (q > 1), le noyau est ÉTIRÉ par q (48·q prises) : coupure à Nyquist/q, transition
//     20/q → 28/q kHz — tout ce qui se replierait sous 20 kHz est rejeté de 120 dB ;
//   • q < 0,833 — noyau B : coupure 22 kHz, transition 20 → 24 kHz, 120 dB, 94 prises. Lue lentement, une image laissée
//     entre 24 et 28 kHz redescendrait dans l'audible (×q : 12–14 kHz à l'octave grave) : ici aucune image ne passe ;
//   • l'ancien lecteur (16 prises, Kaiser β 8,6) laissait l'aigu tomber dès 16 kHz (−6 dB à 24 kHz) et ses images
//     passaient à −20…−40 dB.
// ============================================================================================

const I0 = x => { let s = 1, t = 1; for (let k = 1; k < 60; ++k) { t *= (x / (2 * k)) ** 2; s += t; if (t < 1e-17 * s) break; } return s; };
export const kaiserBeta = A => (A > 50 ? 0.1102 * (A - 8.7) : A >= 21 ? 0.5842 * Math.pow(A - 21, 0.4) + 0.07886 * (A - 21) : 0);
/** longueur (prises) d'un filtre de Kaiser : atténuation A dB, transition dw (fraction de la fréquence d'échantillonnage) */
export const kaiserTaps = (A, dw) => Math.ceil((A - 7.95) / (14.36 * dw)) + 1;

/** noyau tabulé h(t) = c·sinc(c·t)·kaiser(t / W), t ≥ 0 en échantillons ; c = 2·fc / fs */
export function makeKernel (c, W, beta, SUB = 4096) {
  const n = W * SUB + 2, tab = new Float64Array(n), i0b = I0(beta);
  for (let i = 0; i < n; ++i) {
    const t = i / SUB, u = t / W;
    if (u >= 1) { tab[i] = 0; continue; }
    const a = Math.PI * c * t, sinc = t === 0 ? 1 : Math.sin(a) / a;
    tab[i] = c * sinc * I0(beta * Math.sqrt(1 - u * u)) / i0b;
  }
  return { tab, W, SUB, lim: W * SUB, c };
}

const SR = 48000;
// noyau A : coupure à Nyquist (c = 1), transition 8 kHz, 120 dB
const KA = (() => { const W = Math.ceil(kaiserTaps(120, 8000 / SR) / 2); return makeKernel(1, W, kaiserBeta(120)); })();
// noyau B : coupure 22 kHz, transition 20 → 24 kHz, 120 dB
const KB = (() => { const W = Math.ceil(kaiserTaps(120, 4000 / SR) / 2); return makeKernel(2 * 22000 / SR, W, kaiserBeta(120)); })();
export const READ_KERNELS = { A: { W: KA.W, c: KA.c }, B: { W: KB.W, c: KB.c } };
const Q_SLOW = 0.833;

/** lit L et R à la position p avec la vitesse q ; hors du son : 0. out reçoit [gauche, droite] */
export function readStereo (L, R, n, p, q, out) {
  const K = q < Q_SLOW ? KB : KA, qq = Math.max(1, q);
  if (K === KA && qq === 1) {
    const ip = Math.round(p);
    if (Math.abs(p - ip) < 1e-9) { if (ip >= 0 && ip < n) { out[0] = L[ip]; out[1] = R[ip]; } else { out[0] = 0; out[1] = 0; } return; }
  }
  const half = K.W * qq, i0 = Math.max(0, Math.ceil(p - half)), i1 = Math.min(n - 1, Math.floor(p + half));
  const T = K.tab, S = K.SUB / qq, lim = K.lim;
  let a = 0, b = 0;
  for (let i = i0; i <= i1; ++i) {
    const x = Math.abs(p - i) * S, j = x | 0; if (j >= lim) continue;
    const w = T[j] + (T[j + 1] - T[j]) * (x - j); a += w * L[i]; b += w * R[i];
  }
  out[0] = a / qq; out[1] = b / qq;
}
/** même lecture, une voie */
export function readMono (X, n, p, q) {
  const K = q < Q_SLOW ? KB : KA, qq = Math.max(1, q);
  if (K === KA && qq === 1) { const ip = Math.round(p); if (Math.abs(p - ip) < 1e-9) return ip >= 0 && ip < n ? X[ip] : 0; }
  const half = K.W * qq, i0 = Math.max(0, Math.ceil(p - half)), i1 = Math.min(n - 1, Math.floor(p + half));
  const T = K.tab, S = K.SUB / qq, lim = K.lim;
  let a = 0;
  for (let i = i0; i <= i1; ++i) { const x = Math.abs(p - i) * S, j = x | 0; if (j >= lim) continue; a += (T[j] + (T[j + 1] - T[j]) * (x - j)) * X[i]; }
  return a / qq;
}

/** CONVERSION DE FRÉQUENCE D'ÉCHANTILLONNAGE d'un fichier (srIn → srOut), rapport fixe.
 *  Bande passante plate jusqu'à 95,5 % de la plus petite des deux fréquences de Nyquist (21,06 kHz depuis 44,1 kHz),
 *  bande coupée dès cette fréquence de Nyquist, A dB (140 par défaut : sous le bruit d'un 24 bits). Pour un rapport
 *  rationnel (44,1 → 48 kHz : 160/147), les filtres de chaque phase sont calculés EXACTEMENT (160 phases × 410 prises),
 *  sans table ; sinon le noyau tabulé est lu à chaque position. */
const gcd = (a, b) => { a = Math.round(a); b = Math.round(b); while (b) [a, b] = [b, a % b]; return a; };
export function resampleTo (ch, srIn, srOut = 48000, A = 140) {
  if (srIn === srOut) return ch.map(c => Float64Array.from(c));
  const ratio = srOut / srIn, nyq = 0.5 * Math.min(srIn, srOut), pass = 0.955 * nyq, fc = 0.5 * (pass + nyq);
  const c = 2 * fc / srIn, W = Math.ceil(kaiserTaps(A, (nyq - pass) / srIn) / 2), beta = kaiserBeta(A), n = Math.floor(ch[0].length * ratio);
  const g = Number.isInteger(srIn) && Number.isInteger(srOut) ? gcd(srIn, srOut) : 0, up = g ? srOut / g : 0, down = g ? srIn / g : 0;
  if (g && up <= 4096) {
    // phase φ : position d'entrée t = ⌊i·down/up⌋ + φ/up ; prises k = ⌊t⌋ − W + 1 … ⌊t⌋ + W
    const L2 = 2 * W, coef = new Float64Array(up * L2), i0b = I0(beta);
    for (let ph = 0; ph < up; ++ph) for (let j = 0; j < L2; ++j) {
      const d = ph / up + (W - 1 - j), u = Math.abs(d) / W; if (u >= 1) continue;
      const a = Math.PI * c * d; coef[ph * L2 + j] = c * (d === 0 ? 1 : Math.sin(a) / a) * I0(beta * Math.sqrt(1 - u * u)) / i0b;
    }
    return ch.map(x => {
      const y = new Float64Array(n), m = x.length;
      for (let i = 0; i < n; ++i) {
        const num = i * down, cI = Math.floor(num / up), ph = num - cI * up, k0 = cI - W + 1, o = ph * L2;
        let s = 0;
        if (k0 >= 0 && k0 + L2 <= m) for (let j = 0; j < L2; ++j) s += coef[o + j] * x[k0 + j];
        else for (let j = 0; j < L2; ++j) { const k = k0 + j; if (k >= 0 && k < m) s += coef[o + j] * x[k]; }
        y[i] = s;
      }
      return y;
    });
  }
  const K = makeKernel(c, W, beta, 2048), T = K.tab, S = K.SUB, lim = K.lim;
  return ch.map(x => {
    const y = new Float64Array(n), m = x.length;
    for (let i = 0; i < n; ++i) {
      const t = i / ratio, k0 = Math.max(0, Math.ceil(t - W)), k1 = Math.min(m - 1, Math.floor(t + W));
      let s = 0;
      for (let k = k0; k <= k1; ++k) { const xx = Math.abs(t - k) * S, j = xx | 0; if (j >= lim) continue; s += (T[j] + (T[j + 1] - T[j]) * (xx - j)) * x[k]; }
      y[i] = s;
    }
    return y;
  });
}
