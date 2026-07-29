/* ================================================================
   calculNum.js — calcul-num (priorités opératoires), entiers + décimaux

   Généré via le moteur de gabarits porté de calcul-prioritaire
   (voir expr-num.js et gabarits-num.js) : arithmétique exacte (classe
   Nombre), vraie grammaire à priorités, banque de gabarits niveau par
   niveau — au lieu des 4 exercices écrits à la main précédemment (calcul
   flottant natif, peu de variété). Pas de fraction affichée : la
   référence (calcul-prioritaire) en a une, flash s'arrête aux décimaux.
================================================================ */

import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";
import { genererCalculNum } from "./gabarits-num.js";

function exoCalculNum(niveau, type) {
  return {
    id: `calcul-num-${niveau}-${type}`,
    theme: "calcul-num",
    niveau: String(niveau),
    // Les gabarits de niveau 6 ne tirent jamais de valeur négative ; ceux
    // de 5e/4e en tirent systématiquement (cf. gabarits-num.js) — mêmes
    // tags que les autres modules d'exercices (voir chaine-relatifs,
    // aujourd'hui remplacé par cette banque générique).
    negatif: String(niveau) === "6" ? "non" : "oui",
    gen() {
      const { exerciceParse, resExact } = genererCalculNum(niveau, type);
      const expression = exerciceParse.toLatex();

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${resExact.toLatex()}
        `,
        verifier(input) {
          const attendu = new Grandeur(resExact, {});
          return reponse.verifier("grandeur", attendu, input);
        }
      };
    }
  };
}

const calculNum = [
  exoCalculNum(6, "entier"),
  exoCalculNum(6, "decimal"),
  exoCalculNum(5, "entier"),
  exoCalculNum(5, "decimal"),
  exoCalculNum(4, "entier"),
  exoCalculNum(4, "decimal")
];

export default calculNum;
