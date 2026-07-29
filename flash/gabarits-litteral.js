/* ================================================================
   gabarits-litteral.js — moteur de gabarits pour développement/réduction

   Port du moteur de patterns-chaînes de appli-maths/developpement/app.js
   (genererDepuisType/genererExpressionBrute) : dans un gabarit, "x" est la
   variable (toujours "x" ici — voir plus bas), toute autre lettre minuscule
   est un coefficient tiré au hasard, "?" un signe "+"/"-" tiré
   indépendamment à chaque occurrence, et "forced" liste les coefficients
   qui ne tirent jamais 1 (pour ne pas produire une distribution triviale
   "1(x+2)").

   Différence avec la référence : la référence choisit une lettre
   d'exercice aléatoire (x/y/z/a/b) et la convertit en "x" en interne avant
   de confier le texte au moteur (qui ne connaît que "x"). Ici, la saisie de
   l'élève est parsée SANS cette conversion (reponse.js → verifierLitteral
   fait `new ObjetString(saisie)` directement) : on génère donc toujours
   avec "x" comme variable, jamais une autre lettre.
================================================================ */

'use strict';

import { ObjetString } from "./calcul-litteral.js";

/* ================================================================
   BANQUE — transcription fidèle de BANQUE_5E / BANQUE_4E_AJOUTS /
   BANQUE_3E_AJOUTS (appli-maths/developpement/app.js), niveau flash tagué
   selon la classe où le gabarit apparaît dans la référence.
================================================================ */

const BANQUE = [
  // ---- 5e : distributivité simple ----
  { id: "simple",  niveau: "5", pattern: 'ux?w?vx?t',            constants: ['u', 'v', 'w', 't'],                forced: [] },
  { id: "distrib", niveau: "5", pattern: 'u(vx?w)',              constants: ['u', 'v', 'w'],                     forced: ['u'] },
  { id: "moins",   niveau: "5", pattern: 'ux-(vx?w)',            constants: ['u', 'v', 'w'],                     forced: [] },
  { id: "prio",    niveau: "5", pattern: 'w+u(vx?s)',            constants: ['u', 'v', 'w', 's'],               forced: ['u'] },
  { id: "double1", niveau: "5", pattern: 'u(vx?w)+r(tx?s)',      constants: ['u', 'v', 'r', 't', 'w', 's'],     forced: ['u', 'r'] },
  { id: "double2", niveau: "5", pattern: 'ux(vx?w)+rx(tx?s)',    constants: ['u', 'v', 'r', 't', 'w', 's'],     forced: ['u', 'r'] },
  { id: "mixte",   niveau: "5", pattern: 'ux(vx?w)?(tx?s)',      constants: ['u', 'v', 't', 'w', 's'],          forced: ['u'] },

  // ---- 4e : double distributivité (produit de deux binômes) ----
  { id: "double-distrib",      niveau: "4", pattern: '(ux?v)(wx?t)',           constants: ['u', 'v', 'w', 't'],                    forced: ['u', 'w'] },
  { id: "double-distrib-prio", niveau: "4", pattern: 's+(ux?v)(wx?t)',         constants: ['s', 'u', 'v', 'w', 't'],               forced: ['u', 'w'] },
  { id: "double1-1er-double",  niveau: "4", pattern: '(ux?v)(wx?t)?r(sx?q)',   constants: ['u', 'v', 'w', 't', 'r', 's', 'q'],     forced: ['u', 'w', 'r'] },
  { id: "double1-2nd-double",  niveau: "4", pattern: 'u(vx?w)?(rx?s)(tx?q)',   constants: ['u', 'v', 'w', 'r', 's', 't', 'q'],     forced: ['u', 'r', 't'] },
  { id: "double1-2-doubles",   niveau: "4", pattern: '(ux?v)(wx?t)?(rx?s)(qx?p)', constants: ['u', 'v', 'w', 't', 'r', 's', 'q', 'p'], forced: ['u', 'w', 'r', 'q'] },

  // ---- 3e : identités remarquables ----
  { id: "ir-carre-somme",  niveau: "3", pattern: '(ux+v)^2',     constants: ['u', 'v'], forced: ['u'] },
  { id: "ir-carre-diff",   niveau: "3", pattern: '(ux-v)^2',     constants: ['u', 'v'], forced: ['u'] },
  { id: "ir-conjugue",     niveau: "3", pattern: '(ux+v)(ux-v)', constants: ['u', 'v'], forced: ['u'] },

  { id: "prio-carre-somme", niveau: "3", pattern: 's+(ux+v)^2',     constants: ['s', 'u', 'v'], forced: ['u'] },
  { id: "prio-carre-diff",  niveau: "3", pattern: 's+(ux-v)^2',     constants: ['s', 'u', 'v'], forced: ['u'] },
  { id: "prio-conjugue",    niveau: "3", pattern: 's+(ux+v)(ux-v)', constants: ['s', 'u', 'v'], forced: ['u'] },

  { id: "double1-carre-somme-puis-simple", niveau: "3", pattern: '(ux+v)^2?r(sx?q)',     constants: ['u', 'v', 'r', 's', 'q'], forced: ['u', 'r'] },
  { id: "double1-carre-diff-puis-simple",  niveau: "3", pattern: '(ux-v)^2?r(sx?q)',     constants: ['u', 'v', 'r', 's', 'q'], forced: ['u', 'r'] },
  { id: "double1-conjugue-puis-simple",    niveau: "3", pattern: '(ux+v)(ux-v)?r(sx?q)', constants: ['u', 'v', 'r', 's', 'q'], forced: ['u', 'r'] },

  { id: "double1-simple-puis-carre-somme", niveau: "3", pattern: 'u(vx?w)?(rx+s)^2',     constants: ['u', 'v', 'w', 'r', 's'], forced: ['u', 'r'] },
  { id: "double1-simple-puis-carre-diff",  niveau: "3", pattern: 'u(vx?w)?(rx-s)^2',     constants: ['u', 'v', 'w', 'r', 's'], forced: ['u', 'r'] },
  { id: "double1-simple-puis-conjugue",    niveau: "3", pattern: 'u(vx?w)?(rx+s)(rx-s)', constants: ['u', 'v', 'w', 'r', 's'], forced: ['u', 'r'] },

  { id: "double1-deux-carres-somme", niveau: "3", pattern: '(ux+v)^2?(rx+s)^2',         constants: ['u', 'v', 'r', 's'], forced: ['u', 'r'] },
  { id: "double1-deux-carres-diff",  niveau: "3", pattern: '(ux-v)^2?(rx-s)^2',         constants: ['u', 'v', 'r', 's'], forced: ['u', 'r'] },
  { id: "double1-deux-conjugues",    niveau: "3", pattern: '(ux+v)(ux-v)?(rx+s)(rx-s)', constants: ['u', 'v', 'r', 's'], forced: ['u', 'r'] }
];

const BANQUE_PAR_ID = Object.fromEntries(BANQUE.map(g => [g.id, g]));

/** Porte genererDepuisType() de la référence, variable toujours "x" (voir en-tête). */
function construireExpression(gabarit) {
  let expr = gabarit.pattern;

  const vals = {};
  gabarit.constants.forEach(c => {
    let n = Math.random() < 0.5 ? 1 : Math.floor(Math.random() * 8) + 2;
    vals[c] = gabarit.forced.includes(c) ? n + 1 : n;
  });

  expr = expr.replace(/[a-z]/g, (char) => (char === 'x' ? char : (vals[char] ?? char)));
  expr = expr.replace(/\?/g, () => (Math.random() < 0.5 ? '+' : '-'));

  // "1x" -> "x" (coefficient 1 devant la variable, jamais affiché tel quel).
  expr = expr.replace(/\b1([a-z])\b/g, '$1');

  // Nettoyage des doubles signes qui pourraient apparaître (+-, -+, --).
  expr = expr.replace(/\+-/g, '-').replace(/-\+/g, '-').replace(/--/g, '+');

  return expr;
}

/**
 * Génère un exercice pour un gabarit donné (id de BANQUE) : construit
 * l'expression, la fait évaluer par le moteur exact (calcul-litteral.js)
 * pour obtenir le polynôme réduit attendu — jamais de recalcul séparé,
 * l'auto-vérification garantit que expression et attenduPoly restent
 * cohérents (même principe que generateRandomExpression côté référence).
 */
export function genererDeveloppement(id) {
  const gabarit = BANQUE_PAR_ID[id];
  if (!gabarit) throw new Error(`Gabarit développement inconnu : "${id}"`);

  for (let tentative = 0; tentative < 20; tentative++) {
    const expression = construireExpression(gabarit);
    const os = new ObjetString(expression);
    if (!os.isValid()) continue;

    let resultat;
    try { resultat = os.calculer().resultat; }
    catch (e) { continue; }

    return { expression, attenduPoly: resultat.polynome };
  }

  throw new Error(`Impossible de générer une expression valide pour "${id}" après 20 tentatives.`);
}

/** Liste des gabarits (id + niveau) — pour construire les exos dans developpement.js. */
export function listeGabaritsDeveloppement() {
  return BANQUE.map(g => ({ id: g.id, niveau: g.niveau }));
}
