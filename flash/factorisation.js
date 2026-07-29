/* ================================================================
   factorisation.js — factorisation d'expressions littérales

   Trois familles portées de appli-maths/factorisation/app.js (voir
   gabarits-factorisation.js) : facteur commun simple (monôme), facteur
   commun complexe (binôme), identité remarquable (différence de deux
   carrés). Vérification via reponse.js → "factorisation" (égalité
   algébrique exacte + forme réellement/complètement factorisée).
================================================================ */

import * as reponse from "./reponse.js";
import { genererFactorisation } from "./gabarits-factorisation.js";

function exoFactorisation(famille, niveau, negatif) {
  return {
    id: `factorisation-${famille}`,
    theme: "factorisation",
    niveau,
    negatif,
    gen() {
      const { expression, correction, attenduPoly } = genererFactorisation(famille);

      return {
        latex: `
        \\text{Factoriser :}
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${correction}
        `,
        verifier(input) {
          return reponse.verifier("factorisation", attenduPoly, input);
        }
      };
    }
  };
}

// negatif "non" partout : comme dans developpement.js, les "-" qui
// apparaissent (ex: "(2x-5)") sont des signes d'écriture, pas le sens du
// tag "Avec relatifs" (qui bascule un exercice dédié aux relatifs, pas la
// présence incidente d'un signe) — sinon les familles "complexe" et
// "remarquable" restent invisibles tant que ce bouton n'est pas activé.
const factorisation = [
  exoFactorisation("simple", "5", "non"),
  exoFactorisation("complexe", "4", "non"),
  exoFactorisation("remarquable", "3", "non")
];

export default factorisation;
