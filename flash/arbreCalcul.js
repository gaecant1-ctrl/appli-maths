/* ================================================================
   arbreCalcul.js — génération d'arbres de calcul entièrement parenthésés

   Port de appli-maths/arbreCalcul/Arbre.js pour flash (module ES, Nombre
   importé au lieu du global window.Nombre) : un arbre de calcul est
   construit par SUBSTITUTION DE FEUILLE (une opération à la fois), toujours
   en entiers positifs — pas de relatifs, cf. le mode "sixième" de la
   référence, où les priorités opératoires ne sont pas encore au programme :
   chaque opération DOIT rester parenthésée explicitement pour ne jamais
   s'appuyer dessus (voir toLatexParenthese ci-dessous, qui ne porte que la
   branche modeEcriture === "parenthese" de arbreVersLatex).

   avecFraction (bouton "Avec fraction", voir engine.js) : par défaut
   (false), chaque substitution PRÉSERVE EXACTEMENT la valeur de la feuille
   remplacée (÷ construit le dividende comme un vrai fait de table, jamais
   cherché après coup) — le résultat final reste donc toujours entier. Avec
   avecFraction=true, rien n'est plus préservé : une décomposition tire
   simplement deux feuilles fraîches, sans se soucier du résultat exact —
   d'où recalculer(), qui repropage les valeurs de bas en haut une fois
   l'arbre construit, seule façon d'obtenir le résultat final dans ce mode.

   API :
     NIVEAUX_JETONS_ARBRE                        → plages de tirage des feuilles
     tirerArbreEtCible(nbJetons, niveauCle, avecFraction) → { jetons, arbre, cible }
     toLatexParenthese(noeud)                    → LaTeX, chaque sous-calcul parenthésé
================================================================ */

import { Nombre } from './nombre.js';

const OPS_ARBRE_CALCUL = ["+", "-", "*", ":"];
const MAGNITUDE_MAX = 1000000;

export const NIVEAUX_JETONS_ARBRE = {
  simple: { label: "1", rangeDefaut: [1, 10], rangeSpecial: null },
  moyen: { label: "2", rangeDefaut: [1, 10], rangeSpecial: [10, 20] },
  complexe: { label: "3", rangeDefaut: [10, 20], rangeSpecial: [1, 10] },
};

function randEntreArbre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function melangerArbre(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function depasseMax(nombre) {
  const s = nombre.simplify().valeurNum;
  return Math.abs(s.a) > MAGNITUDE_MAX || s.b > MAGNITUDE_MAX;
}

function feuille(valeur) {
  return { type: "jeton", nombre: Nombre.fromParts(valeur, 1, "entier") };
}

function noeudOp(op, gauche, droite) {
  let nombre;
  switch (op) {
    case "+": nombre = gauche.nombre.add(droite.nombre).simplify(); break;
    case "-": nombre = gauche.nombre.sub(droite.nombre).simplify(); break;
    case "*": nombre = gauche.nombre.mul(droite.nombre).simplify(); break;
    case ":": nombre = gauche.nombre.div(droite.nombre).simplify(); break;
  }
  return { type: "op", op, gauche, droite, nombre };
}

function diviseursDe(n) {
  const diviseurs = [];
  for (let d = 1; d <= n; d++) {
    if (n % d === 0) diviseurs.push(d);
  }
  return diviseurs;
}

function tirerPlageFeuille(niveau) {
  if (niveau.rangeSpecial && Math.random() < 0.2) return niveau.rangeSpecial;
  return niveau.rangeDefaut;
}

function decomposer(valeur, op, niveau, avecFraction) {
  if (avecFraction) {
    const [minA, maxA] = tirerPlageFeuille(niveau);
    const [minB, maxB] = tirerPlageFeuille(niveau);
    if (op === "-") {
      for (let essai = 0; essai < 5; essai++) {
        let a = randEntreArbre(minA, maxA);
        let b = randEntreArbre(minB, maxB);
        if (a < b) [a, b] = [b, a]; // résultat toujours positif (pas de relatifs pour l'arbre)
        if (a === b) continue; // égalité stricte : on retire un autre couple
        return { gauche: feuille(a), droite: feuille(b) };
      }
      return null;
    }
    return { gauche: feuille(randEntreArbre(minA, maxA)), droite: feuille(randEntreArbre(minB, maxB)) };
  }

  const [min, max] = tirerPlageFeuille(niveau);

  if (op === "+") {
    const bMin = Math.max(1, min);
    const bMax = Math.min(max, valeur - 1);
    if (bMin > bMax) return null;
    const membre = randEntreArbre(bMin, bMax);
    return { gauche: feuille(valeur - membre), droite: feuille(membre) };
  }

  if (op === "-") {
    const bMin = Math.max(1, min);
    if (bMin > max) return null;
    const membre = randEntreArbre(bMin, max);
    return { gauche: feuille(valeur + membre), droite: feuille(membre) };
  }

  if (op === "*") {
    const candidats = melangerArbre(
      diviseursDe(valeur).filter(d => d !== 1 && d !== valeur && d >= min && d <= max)
    );
    if (candidats.length === 0) return null;
    const d = candidats[0];
    return { gauche: feuille(valeur / d), droite: feuille(d) };
  }

  // ":" — valeur devient le quotient imposé (jamais si valeur === 1, cf. estEligible).
  const bMin = Math.max(2, min);
  if (bMin > max) return null;
  const diviseur = randEntreArbre(bMin, max);
  return { gauche: feuille(valeur * diviseur), droite: feuille(diviseur) };
}

function dansPlageNiveau(valeur, niveau) {
  const [dMin, dMax] = niveau.rangeDefaut;
  if (valeur >= dMin && valeur <= dMax) return true;
  if (!niveau.rangeSpecial) return false;
  const [sMin, sMax] = niveau.rangeSpecial;
  return valeur >= sMin && valeur <= sMax;
}

function estEligible(valeur, op, niveau, avecFraction) {
  if (avecFraction) return true; // rien à préserver : toute feuille convient
  if (op === ":") return valeur !== 1 && dansPlageNiveau(valeur, niveau);
  if (op === "*") return diviseursDe(valeur).some(d => d !== 1 && d !== valeur);
  return true; // + / - : toujours possible
}

function collecterFeuilles(racine) {
  const feuilles = [];
  (function marcher(n) {
    if (n.type === "jeton") { feuilles.push(n); return; }
    marcher(n.gauche);
    marcher(n.droite);
  })(racine);
  return feuilles;
}

function construireNiveau1(niveau, avecFraction) {
  for (const op of melangerArbre(OPS_ARBRE_CALCUL)) {
    const [minA, maxA] = tirerPlageFeuille(niveau);
    const [minB, maxB] = tirerPlageFeuille(niveau);

    if (op === "+") {
      return noeudOp("+", feuille(randEntreArbre(minA, maxA)), feuille(randEntreArbre(minB, maxB)));
    }
    if (op === "*") {
      return noeudOp("*", feuille(randEntreArbre(minA, maxA)), feuille(randEntreArbre(minB, maxB)));
    }
    if (op === "-") {
      let a = randEntreArbre(minA, maxA);
      let b = randEntreArbre(minB, maxB);
      if (a < b) [a, b] = [b, a];
      if (a === b) continue; // égalité stricte : résultat nul, on retire cette opération
      return noeudOp("-", feuille(a), feuille(b));
    }
    // ":"
    if (avecFraction) {
      return noeudOp(":", feuille(randEntreArbre(minA, maxA)), feuille(randEntreArbre(minB, maxB)));
    }
    const diviseur = randEntreArbre(Math.max(2, minB), maxB); // fait de table direct, diviseur ≠ 1
    const quotient = randEntreArbre(Math.max(1, minA), maxA);
    return noeudOp(":", feuille(diviseur * quotient), feuille(diviseur));
  }
  return null;
}

function agrandir(racine, niveau, avecFraction) {
  for (const op of melangerArbre(OPS_ARBRE_CALCUL)) {
    const candidates = melangerArbre(
      collecterFeuilles(racine).filter(f => estEligible(f.nombre.valeurNum.a, op, niveau, avecFraction))
    );
    for (const f of candidates) {
      const decomposition = decomposer(f.nombre.valeurNum.a, op, niveau, avecFraction);
      if (!decomposition) continue;
      f.type = "op";
      f.op = op;
      f.gauche = decomposition.gauche;
      f.droite = decomposition.droite;
      return true;
    }
  }
  return false;
}

// Recalcule le résultat de chaque nœud "op" de bas en haut — nécessaire en
// mode fraction, où decomposer() ne préserve pas la valeur de la feuille
// remplacée (voir agrandir) ; sans effet en mode entier, où noeud.nombre
// était déjà exact partout depuis construireNiveau1/agrandir.
function recalculer(noeud) {
  if (noeud.type === "jeton") return noeud.nombre;
  const g = recalculer(noeud.gauche);
  const d = recalculer(noeud.droite);
  switch (noeud.op) {
    case "+": noeud.nombre = g.add(d).simplify(); break;
    case "-": noeud.nombre = g.sub(d).simplify(); break;
    case "*": noeud.nombre = g.mul(d).simplify(); break;
    case ":": noeud.nombre = g.div(d).simplify(); break;
  }
  return noeud.nombre;
}

function finaliserArbre(structure, cible) {
  const jetons = [];
  (function indexer(noeud) {
    if (noeud.type === "jeton") {
      noeud.jetonIndex = jetons.length;
      jetons.push(noeud.nombre.valeurNum.a);
      return;
    }
    indexer(noeud.gauche);
    indexer(noeud.droite);
  })(structure);
  return { jetons, arbre: structure, cible };
}

/** Tire nbJetons jetons (selon niveauCle) et une forme d'arbre valide. */
export function tirerArbreEtCible(nbJetons, niveauCle, avecFraction = false, essaisMax = 800) {
  const niveau = NIVEAUX_JETONS_ARBRE[niveauCle] || NIVEAUX_JETONS_ARBRE.simple;
  const nbOperations = nbJetons - 1;
  essaiArbre:
  for (let essai = 0; essai < essaisMax; essai++) {
    const racine = construireNiveau1(niveau, avecFraction);
    if (!racine) continue;
    for (let k = 1; k < nbOperations; k++) {
      if (!agrandir(racine, niveau, avecFraction)) continue essaiArbre;
    }
    const cible = avecFraction ? recalculer(racine) : racine.nombre;
    if (depasseMax(cible)) continue;
    return finaliserArbre(racine, cible);
  }
  return null;
}

/** Écriture LaTeX systématiquement parenthésée (règle "sixième" : jamais
    appuyée sur les priorités opératoires) — seule la racine reste nue. */
export function toLatexParenthese(noeud, estEnTete = true) {
  if (noeud.type === "jeton") {
    return noeud.nombre.toLatex({ nombreAff: "entier" });
  }
  const opLatex = noeud.op === "*" ? "\\times " : noeud.op === ":" ? "\\div " : noeud.op;
  const txt = `${toLatexParenthese(noeud.gauche, false)}${opLatex}${toLatexParenthese(noeud.droite, false)}`;
  return estEnTete ? txt : `(${txt})`;
}
