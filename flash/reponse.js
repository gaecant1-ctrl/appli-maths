/* ================================================================
   reponse.js — analyse de réponse commune pour le mode saisie

   Point d'entrée UNIQUE utilisé par les fonctions verifier() des fichiers
   d'exercices (fractions.js, calculNum.js, durees.js, ...). Chaque exercice
   déclare son type de réponse attendue et sa valeur canonique ; ce module
   fait le travail de parsing/comparaison/formatage, pour éviter de
   dupliquer cette logique dans chaque fichier.

   API :
     verifier(type, attendu, saisie, opts)
       → { ok: boolean, attendu: string, invalide?: boolean, saisieLatex?: string }

     `invalide: true` signifie que la saisie n'a même pas pu être reconnue
     comme une réponse dans le format attendu (donc pas "fausse" au sens
     mathématique — juste incompréhensible). engine.js s'en sert pour NE
     PAS verrouiller/rendre la réponse en LaTeX dans ce cas : l'élève doit
     pouvoir corriger sa saisie librement.

     `saisieLatex` (présent seulement si !invalide) est le rendu LaTeX de
     la saisie tel que produit par le moteur qui l'a reconnue (Nombre,
     Grandeur, Polynome...) — PAS une reconstruction approximative côté
     engine.js. Ex: la saisie "3/4" devient une vraie fraction \frac{3}{4},
     "4x+36" un polynôme canonique, via les .toLatex() des objets déjà
     parsés pour la comparaison.

   Types reconnus :
     "grandeur"  — attendu : instance Grandeur. Parse la saisie via
                   calcul-grandeur-expr.js (expressions "3m + 25cm",
                   unités à exposant "9cm^2", unités composées "10m/s"...).
                   Si aucune unité n'est présente, la comparaison retombe
                   sur le nombre pur (le même parseur gère les deux cas).
     "litteral"  — attendu : instance Polynome (calcul-litteral, variable x).
                   Parse la saisie via ObjetString ; accepte toute forme
                   algébriquement égale (réduite ou non, ordre libre).
     "factorisation" — attendu : instance PolynomeMV (calcul-mv, forme
                   développée d'origine). Parse la saisie via ObjetStringMV ;
                   exige une égalité algébrique exacte ET une forme
                   effectivement/complètement factorisée sur l'arbre brut
                   (racine = produit, aucun facteur commun ni monôme en
                   double ne subsiste dans une somme-facteur) — sinon
                   `invalide` (juste mais pas fini, l'élève peut continuer).
     "texte"     — attendu : string ou string[] selon le mode. opts.mode :
                   "identique" (défaut) : égalité stricte (après
                                normalisation, voir plus bas).
                   "in"        : la saisie doit correspondre à l'une des
                                formes de la liste attendu.
                   "has"       : la saisie doit contenir l'un des mots-clés
                                de attendu.
                   Trois passes systématiques, dans cet ordre :
                     1. exact, SANS normalisation — rien à signaler.
                     2. exact seulement APRÈS normalisation (accents/casse/
                        espaces) — PAS validé (invalide:true), signalé
                        (malEcrit:true) : correct sur le fond mais mal
                        écrit, l'élève corrige avant que ce soit compté.
                     3. opts.presqueJuste (string[] d'erreurs fréquentes
                        identifiées à l'avance, ex: confondre deux notations
                        proches) — jamais verrouillé (invalide:true), avec
                        presque:true pour un message dédié plutôt que
                        "format inattendu".
================================================================ */

'use strict';

import { ObjetString, estFormeReduite } from './calcul-litteral.js';
import { Grandeur } from './calcul-grandeur.js';
import { evalGrandeurExpr } from './calcul-grandeur-expr.js';
import { parseMV, estProduit, facteursSommes } from './calcul-mv.js';

/* ---------- texte : normalisation ---------- */

function normaliserTexte(s) {
  return String(s ?? "")
    .normalize("NFD").replace(/[̀-ͯ]/g, "") // retire les accents
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

// Texte libre : pas de moteur de calcul derrière, donc rendu LaTeX = la
// saisie telle quelle dans \text{...} (échappement HTML + LaTeX, seul cas
// où la saisie brute de l'élève est réinjectée directement).
function _echapperHtml(s) {
  return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function _echapperLatex(s) {
  return String(s).replace(/[\\{}$%#_&^]/g, c => `\\${c}`);
}
function _latexTexte(saisie) {
  return `\\text{${_echapperHtml(_echapperLatex(String(saisie).trim()))}}`;
}

// Trois passes, dans l'ordre :
//   1. Exact, SANS normalisation — rien à signaler, réponse impeccable.
//   2. Exact seulement APRÈS normalisation (accents/casse/espaces) — juste
//      sur le fond mais mal écrit : PAS validé (invalide:true, comme un
//      format non reconnu) — on le signale (malEcrit:true) et l'élève
//      corrige, sans que ce soit verrouillé comme correct ou faux.
//   3. "Presque juste" (opts.presqueJuste, liste d'erreurs fréquentes et
//      identifiées à l'avance, ex: confondre deux notations proches) —
//      jamais verrouillé (invalide:true, comme un format non reconnu),
//      l'élève peut se corriger ; signalé via presque:true pour un message
//      dédié plutôt que le "format inattendu" générique.
// Sinon : faux, verrouillé.
function verifierTexte(attendu, saisie, opts = {}) {
  const mode = opts.mode || "identique";
  const presqueJuste = opts.presqueJuste || [];
  const liste = Array.isArray(attendu) ? attendu : [attendu];
  const brut = String(saisie ?? "");
  const saisieLatex = _latexTexte(saisie);

  const correspond = (candidats, texteBrut, texteNormalise) => {
    if (mode === "has") {
      return {
        exact: candidats.some(c => texteBrut.includes(c)),
        normalise: candidats.some(c => texteNormalise.includes(normaliserTexte(c)))
      };
    }
    return {
      exact: candidats.some(c => texteBrut === String(c)),
      normalise: candidats.some(c => normaliserTexte(c) === texteNormalise)
    };
  };

  const s = normaliserTexte(saisie);
  const { exact, normalise } = correspond(liste, brut, s);

  if (exact) return { ok: true, attendu: liste[0], saisieLatex };
  if (normalise) return { ok: false, invalide: true, malEcrit: true, attendu: liste[0], saisieLatex };

  const estPresqueJuste = presqueJuste.some(p => normaliserTexte(p) === s);
  if (estPresqueJuste) {
    return { ok: false, invalide: true, presque: true, attendu: liste[0], saisieLatex };
  }

  return { ok: false, attendu: liste[0], saisieLatex };
}

/* ---------- grandeur : parsing "nombre + unité" (ou expression complète) ---------- */

// Une fraction doit être donnée sous forme irréductible ("1/2", pas "2/4"),
// même si elle est mathématiquement égale — comme la forme réduite pour le
// littéral. Un entier, un décimal ou un pourcentage n'a pas cette notion.
function _estFormeIrreductible(nombre) {
  const t = nombre.typeEcriture;
  if (t === "entier" || t === "dec" || t === "pourcentage") return true;
  return nombre.isSimp();
}

function verifierGrandeur(attendu, saisie) {
  const attenduLatex = attendu.toLatex();
  const invalide = { ok: false, invalide: true, attendu: attenduLatex };

  const resultat = evalGrandeurExpr(saisie); // Grandeur | null
  if (!resultat) return invalide;

  const uniteAttendueVide = Object.keys(attendu.uniteDict).length === 0;
  const uniteSaisieVide = Object.keys(resultat.uniteDict).length === 0;

  // Les deux doivent être scalaires, ou les deux porter une unité — sinon
  // il manque (ou il y a en trop) une information : format invalide.
  // L'unité fait partie de la réponse quand l'exercice la déclare dans
  // `attendu` (ex: aires.js) — elle n'est jamais optionnelle dans ce cas.
  if (uniteAttendueVide !== uniteSaisieVide) return invalide;

  // Fraction reconnue, valeur juste, mais pas irréductible : pas verrouillé
  // (l'élève peut retenter et simplifier), contrairement à une valeur
  // carrément fausse qui reste verrouillée.
  const reduit = _estFormeIrreductible(resultat.valeur);

  if (uniteAttendueVide) {
    const correct = attendu.valeur.equal(resultat.valeur);
    if (correct && !reduit) return invalide;
    return {
      ok: correct,
      attendu: attenduLatex,
      saisieLatex: resultat.toLatex()
    };
  }

  try {
    const correct = attendu.equals(resultat);
    if (correct && !reduit) return invalide;
    return { ok: correct, attendu: attenduLatex, saisieLatex: resultat.toLatex() };
  } catch (e) {
    return invalide;
  }
}

/* ---------- littéral (variable x) ---------- */

function verifierLitteral(attendu, saisie) {
  const attenduLatex = attendu.toLatex();
  const invalide = { ok: false, invalide: true, attendu: attenduLatex };

  const os = new ObjetString(saisie);
  if (!os.isValid()) return invalide;

  let res;
  try { res = os.calculer().resultat; }
  catch (e) { return invalide; }

  // Pas écrite sous forme réduite ("3x+2x", "2(x+3)"...) : pas verrouillé,
  // même traitement qu'un format non reconnu — l'élève réduit et retape.
  if (!estFormeReduite(os.arbre)) return invalide;

  return {
    ok: res.polynome.equals(attendu),
    attendu: attenduLatex,
    saisieLatex: res.toLatex()
  };
}

/* ---------- factorisation (multivarié, calcul-mv.js) ---------- */

// Porte getConclusionStatus (appli-maths/factorisation/app.js) : une somme
// directement facteur d'un produit ne doit plus avoir de facteur commun
// extractible (facteurCommun()), ni de monômes de même signature encore à
// regrouper (ex: "x^2+x^2" au lieu de "2x^2"). "exigerFacteurScalaire" reste
// à false ici (pas de réglage exposé côté flash) : un facteur purement
// numérique (sans variable commune) n'est pas jugé indispensable.
function _statutFactorisation(arbre) {
  const sommes = facteursSommes(arbre);
  for (const sommeNode of sommes) {
    const poly = sommeNode.evaluer();
    const fc = poly.facteurCommun();
    if (fc !== null && Object.keys(fc.degres).length > 0) return "CAN_FACTORIZE";

    const sigs = poly.monomes.map(m => m.signature());
    if (sigs.some((s, i) => sigs.indexOf(s) !== i)) return "CAN_SIMPLIFY";
  }
  return "OK";
}

function verifierFactorisation(attenduPoly, saisie) {
  const attenduLatex = attenduPoly.toLatex();
  const invalide = { ok: false, invalide: true, attendu: attenduLatex };

  const os = parseMV(saisie);
  if (!os.isValid()) return invalide;

  let polyUser;
  try { polyUser = os.calculer().resultat; }
  catch (e) { return invalide; }

  const saisieLatex = os.toLatex(); // forme telle qu'écrite, préserve la factorisation
  const egal = attenduPoly.equal(polyUser);
  if (!egal) return { ok: false, attendu: attenduLatex, saisieLatex };

  // Juste algébriquement, mais pas (encore) complètement factorisé : pas
  // verrouillé, l'élève doit continuer — même philosophie que
  // estFormeReduite pour "litteral".
  if (!estProduit(os.arbre) || _statutFactorisation(os.arbre) !== "OK") return invalide;

  return { ok: true, attendu: attenduLatex, saisieLatex };
}

/* ---------- dispatch commun ---------- */

export function verifier(type, attendu, saisie, opts = {}) {
  switch (type) {
    case "grandeur":
      return verifierGrandeur(attendu, saisie);
    case "litteral":
      return verifierLitteral(attendu, saisie);
    case "factorisation":
      return verifierFactorisation(attendu, saisie);
    case "texte":
      return verifierTexte(attendu, saisie, opts);
    default:
      throw new Error(`reponse.verifier : type inconnu "${type}"`);
  }
}
