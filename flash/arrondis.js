/* =====================================================
   OUTILS COMMUNS
   ===================================================== */

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function cleanNumber(x, digits = 6) {
  return Number(x.toFixed(digits));
}

function verifierScalaire(valeur, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeur)), {}), input);
}

function rand(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/**
 * Génère un nombre décimal tel que :
 * - l’arrondi demandé est à la précision k
 * - le chiffre décisif (rang k+1) existe et est ≠ 0
 */
function genDecimalAvecChiffreDecisif(k) {
  const entier = rand(10, 999);

  // chiffres jusqu’à la précision demandée
  let dec = "";
  for (let i = 0; i < k; i++) {
    dec += rand(0, 9);
  }

  // chiffre décisif NON nul
  const decisif = rand(1, 9);

  // décimale supplémentaire éventuelle (facultative)
  const suite = Math.random() < 0.5 ? rand(0, 9).toString() : "";

  return Number(`${entier}.${dec}${decisif}${suite}`);
}

/* =====================================================
   BANQUE : ARRONDIS
   ===================================================== */

const arrondis = [

  /* =========================================
     ARRONDIS DÉCIMAUX
     unité / dixième / centième
     (chiffre décisif garanti)
     ========================================= */

  {
    id: "arrondis-decimaux",
    theme: "arrondis",
    niveau: "6",
    gen() {
      const types = [
        { label: "à l’unité", k: 0 },
        { label: "au dixième", k: 1 },
        { label: "au centième", k: 2 }
      ];

      const t = types[rand(0, types.length - 1)];

      const n = genDecimalAvecChiffreDecisif(t.k);
      const res = cleanNumber(n, t.k);

      return {
        latex: `
        \\text{Donner l’arrondi ${t.label} de }
        \\,\\,${n}
        `,
        correction: `
        ${n} \\approx ${res}
        `,
        verifier(input) { return verifierScalaire(res, input); }
      };
    }
  },

  /* =========================================
     ARRONDIS SUR LES ENTIERS
     dizaine / centaine
     ========================================= */

  {
    id: "arrondis-entiers",
    theme: "arrondis",
    niveau: "6",
    gen() {
      const types = [
        { label: "à la dizaine", base: 10 },
        { label: "à la centaine", base: 100 }
      ];

      const t = types[rand(0, types.length - 1)];

      // on force un chiffre décisif non trivial
      const n =
        t.base === 10
          ? rand(42, 987)
          : rand(142, 987);

      const res = Math.round(n / t.base) * t.base;

      return {
        latex: `
        \\text{Donner l’arrondi ${t.label} de }
        \\,\\,${n}
        `,
        correction: `
        ${n} \\approx ${res}
        `,
        verifier(input) { return verifierScalaire(res, input); }
      };
    }
  }

];

export default arrondis;
