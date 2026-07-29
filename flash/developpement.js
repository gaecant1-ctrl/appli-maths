/* ================================================================
   developpement.js — développement et réduction d'expressions littérales

   Remplace l'ancien calculLit.js (un seul exercice écrit à la main) par
   les 27 gabarits de appli-maths/developpement/app.js (voir
   gabarits-litteral.js), niveau par niveau (5e : distributivité simple,
   4e : double distributivité, 3e : identités remarquables).
================================================================ */

import * as reponse from "./reponse.js";
import { genererDeveloppement, listeGabaritsDeveloppement } from "./gabarits-litteral.js";

function exoDeveloppement(id, niveau) {
  return {
    id: `developpement-${id}`,
    theme: "developpement",
    niveau,
    negatif: "non",
    gen() {
      const { expression, attenduPoly } = genererDeveloppement(id);

      return {
        latex: `
        \\text{Développer et réduire :}
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${attenduPoly.toLatex()}
        `,
        verifier(input) {
          return reponse.verifier("litteral", attenduPoly, input);
        }
      };
    }
  };
}

const developpement = listeGabaritsDeveloppement().map(g => exoDeveloppement(g.id, g.niveau));

export default developpement;
