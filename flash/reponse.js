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
     "texte"     — attendu : string ou string[] selon le mode.
                   mode "identique" : égalité stricte après normalisation.
                   mode "in"        : la saisie doit correspondre à l'une
                                      des formes de la liste attendu.
                   mode "has"       : la saisie doit contenir l'un des
                                      mots-clés de attendu.
================================================================ */

'use strict';

import { ObjetString, estFormeReduite } from './calcul-litteral.js';
import { Grandeur } from './calcul-grandeur.js';
import { evalGrandeurExpr } from './calcul-grandeur-expr.js';

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

function verifierTexte(attendu, saisie, mode = "identique") {
  const s = normaliserTexte(saisie);
  const saisieLatex = _latexTexte(saisie);

  if (mode === "in") {
    const liste = Array.isArray(attendu) ? attendu : [attendu];
    const ok = liste.some(a => normaliserTexte(a) === s);
    return { ok, attendu: liste[0], saisieLatex };
  }

  if (mode === "has") {
    const motsCles = Array.isArray(attendu) ? attendu : [attendu];
    const ok = motsCles.some(m => s.includes(normaliserTexte(m)));
    return { ok, attendu: motsCles[0], saisieLatex };
  }

  // "identique" par défaut
  const ok = s === normaliserTexte(attendu);
  return { ok, attendu: String(attendu), saisieLatex };
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

/* ---------- dispatch commun ---------- */

export function verifier(type, attendu, saisie, opts = {}) {
  switch (type) {
    case "grandeur":
      return verifierGrandeur(attendu, saisie);
    case "litteral":
      return verifierLitteral(attendu, saisie);
    case "texte":
      return verifierTexte(attendu, saisie, opts.mode);
    default:
      throw new Error(`reponse.verifier : type inconnu "${type}"`);
  }
}
