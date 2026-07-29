/* ================================================================
   gabarits-factorisation.js — générateurs pour factorisation.js

   Port de appli-maths/factorisation/app.js (generateNiveau1/
   generateNiveau2/generateIdentiteRemarquable), sur le moteur multivarié
   déjà présent dans flash (calcul-mv.js, port direct de la référence).

   Trois familles :
     - "simple"      : facteur commun monôme (ux+vx, ab^2+ua^2b, ...).
                       La forme factorisée attendue est dérivée directement
                       du polynôme développé via PolynomeMV.facteurCommun()
                       — jamais reconstruite "à la main" en parallèle, donc
                       toujours cohérente avec attenduPoly.
     - "complexe"    : facteur commun binôme A(ax+b) ± B(ax+b). Ici la
                       forme factorisée n'est PAS dérivable génériquement
                       (facteurCommun() ne sait extraire qu'un facteur
                       monôme) : on la construit en parallèle de l'énoncé,
                       par construction (comme la référence).
     - "remarquable" : différence de deux carrés A²−B², idem (construite
                       en parallèle : (A−B)(A+B)).
================================================================ */

'use strict';

import { evalMV, Monome, PolynomeMV } from "./calcul-mv.js";

/* ================================================================
   "simple" — facteur commun monôme
================================================================ */

const TYPES_FACTORISATION_SIMPLE = [
  { pattern: 'ab^2 + ua^2b', constants: ['u'] },
  { pattern: 'ab^2 + ucab', constants: ['u'] },
  { pattern: 'ux^2 + vx', constants: ['u', 'v'] },
  { pattern: 'ux + vx', constants: ['u', 'v'] },
  { pattern: 'uabc + vac', constants: ['u', 'v'] },
  { pattern: 'uab + vca', constants: ['u', 'v'] },
  { pattern: 'uac + vbac', constants: ['u', 'v'] },
  { pattern: 'ux + vx^2', constants: ['u', 'v'] },
  { pattern: 'ux^2 + vx^2', constants: ['u', 'v'] },
  { pattern: 'ux^3 + vx^2', constants: ['u', 'v'] },
  { pattern: 'uabc + vcba', constants: ['u', 'v'] }
];

/** Forme factorisée canonique dérivée du polynôme développé (jamais reconstruite à la main). */
function correctionSimple(poly) {
  const fc = poly.facteurCommun();
  if (!fc) return poly.toLatex(); // rien à extraire (ex: "ux+vx" retombé sur un seul monôme) : déjà réduit au maximum

  const communLatex = new Monome(fc.coeff, fc.degres).toLatex();

  const resteMonomes = poly.monomes.map(m => {
    const degres = {};
    for (const v of Object.keys(m.degres)) {
      const d = m.degres[v] - (fc.degres[v] || 0);
      if (d > 0) degres[v] = d;
    }
    return new Monome(m.coeff.valeurNum.a / fc.coeff, degres);
  });
  const reste = new PolynomeMV(resteMonomes);

  return `${communLatex}\\left(${reste.toLatex()}\\right)`;
}

function construireSimple() {
  const gabarit = TYPES_FACTORISATION_SIMPLE[Math.floor(Math.random() * TYPES_FACTORISATION_SIMPLE.length)];
  const vars = ['x', 'y', 'z', 'a', 'b', 'c'].sort(() => 0.5 - Math.random());
  const map = { a: vars[0], b: vars[1], c: vars[2] };

  let expr = gabarit.pattern.replace(/[abc]/g, ch => map[ch]);
  gabarit.constants.forEach(c => {
    const val = Math.random() < 0.4 ? 1 : Math.floor(Math.random() * 8) + 2;
    expr = expr.replace(new RegExp(c, 'g'), val);
  });
  if (Math.random() < 0.5) expr = expr.replace(/\+/g, '-');

  // Coefficient 1 devant une variable (ou un monôme "abc") jamais affiché
  // tel quel : "1x" -> "x", "1abc" -> "abc". Ne mange que le "1", pas les
  // lettres qui suivent (contrairement à developpement.js, un monôme ici
  // peut porter plusieurs lettres collées : "abc", "a^2b"...).
  expr = expr.replace(/(^|[^0-9])1([a-zA-Z])/g, '$1$2');

  const poly = evalMV(expr);
  if (!poly) throw new Error("Expression 'simple' invalide.");

  return { expression: expr, correction: correctionSimple(poly) };
}

/* ================================================================
   "complexe" — facteur commun binôme A(ax+b) ± B(ax+b)
================================================================ */

/** Binôme (ax+b) ou (ax-b), coefficient 1 omis devant x. */
function _binome(a, b) {
  const coefX = a === 1 ? '' : String(a);
  return b >= 0 ? `(${coefX}x+${b})` : `(${coefX}x${b})`;
}

/** Terme A × fc pour l'ÉNONCÉ (ordre parfois permuté si A est un binôme). */
function _terme(A, fc) {
  if (A === null) return `${fc}^2`; // A = fc lui-même
  const estBinome = A.startsWith('(');
  if (estBinome && Math.random() < 0.5) return `${fc}${A}`;
  return `${A}${fc}`;
}

function _facteur() {
  const type = Math.floor(Math.random() * 3);
  if (type === 0) return String(Math.floor(Math.random() * 8) + 2); // scalaire 2-9
  if (type === 1) return null; // fc lui-même -> fc^2
  const e = Math.floor(Math.random() * 4) + 1;
  const f = (Math.floor(Math.random() * 9) + 1) * (Math.random() < 0.3 ? -1 : 1);
  return _binome(e, f);
}

function construireComplexe() {
  const a = Math.floor(Math.random() * 4) + 1;
  const b = (Math.floor(Math.random() * 9) + 1) * (Math.random() < 0.3 ? -1 : 1);
  const fc = _binome(a, b);

  // A et B distincts (évite A=B=null qui donnerait fc^2 - fc^2 = 0).
  let A, B;
  do {
    A = _facteur();
    B = _facteur();
  } while (A === null && B === null);

  const signe = Math.random() < 0.5 ? '+' : '-';
  const expression = `${_terme(A, fc)}${signe}${_terme(B, fc)}`;

  // Reste de chaque terme une fois fc extrait : A lui-même (scalaire ou
  // binôme), ou fc si ce terme valait fc^2 — même principe que _terme mais
  // sans la mise au carré/permutation d'affichage.
  const resteA = A === null ? fc : A;
  const resteB = B === null ? fc : B;
  const correction = `${fc}\\left(${resteA}${signe}${resteB}\\right)`;

  return { expression, correction };
}

/* ================================================================
   "remarquable" — différence de deux carrés A²−B²
================================================================ */

function _ir_tirerEntier(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Valeur de A ou B avant mise au carré : entier, monôme (ax) ou binôme (ax+b). */
function _ir_genValeur(type) {
  if (type === 'int') return { val: String(_ir_tirerEntier(2, 9)), type };
  if (type === 'mono') {
    const a = _ir_tirerEntier(1, 5);
    return { val: a === 1 ? 'x' : `${a}x`, type, a };
  }
  const a = _ir_tirerEntier(1, 5);
  const b = _ir_tirerEntier(1, 9) * (Math.random() < 0.35 ? -1 : 1);
  return { val: _binome(a, b), type };
}

/** Carré d'une valeur, pour l'ÉNONCÉ : entier -> n² calculé, monôme -> développé, binôme -> notation ^2. */
function _ir_carre(v) {
  const { val, type, a } = v;
  if (type === 'int') return String(parseInt(val, 10) ** 2);
  if (type === 'mono') return (a === 1) ? 'x^2' : `${a * a}x^2`;
  return `${val}^2`;
}

function construireRemarquable() {
  let A, B, dA, dB, tentatives = 0;
  do {
    const typeA = Math.random() < 0.5 ? 'mono' : 'binom';
    // Si A est un monôme, B est entier (mono+mono peu intéressant).
    const typesB = typeA === 'mono' ? ['int'] : ['int', 'mono', 'binom'];
    const typeB = typesB[Math.floor(Math.random() * typesB.length)];
    A = _ir_genValeur(typeA);
    B = _ir_genValeur(typeB);
    dA = _ir_carre(A);
    dB = _ir_carre(B);
    tentatives++;
  } while (dA === dB && tentatives < 30); // évite A² = B² -> expression nulle

  const expression = `${dA}-${dB}`;
  const correction = `\\left(${A.val}-${B.val}\\right)\\left(${A.val}+${B.val}\\right)`;

  return { expression, correction };
}

/* ================================================================
   Point d'entrée
================================================================ */

const CONSTRUCTEURS = {
  simple: construireSimple,
  complexe: construireComplexe,
  remarquable: construireRemarquable
};

/**
 * Génère un exercice de factorisation pour la famille donnée
 * ("simple" | "complexe" | "remarquable"). Renvoie
 * { expression, correction, attenduPoly } — attenduPoly (PolynomeMV) est
 * la forme développée d'origine, utilisée par reponse.verifier("factorisation", ...).
 */
export function genererFactorisation(famille) {
  const construire = CONSTRUCTEURS[famille];
  if (!construire) throw new Error(`Famille de factorisation inconnue : "${famille}"`);

  for (let tentative = 0; tentative < 20; tentative++) {
    try {
      const { expression, correction } = construire();
      const attenduPoly = evalMV(expression);
      if (!attenduPoly) continue;
      return { expression, correction, attenduPoly };
    } catch (e) { continue; }
  }

  throw new Error(`Impossible de générer une factorisation valide pour "${famille}" après 20 tentatives.`);
}
