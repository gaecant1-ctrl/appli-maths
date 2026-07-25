import { Nombre } from "./nombre.js";
import * as reponse from "./reponse.js";

function comparer(a, b) {
  if (a < b) return "<";
  if (a > b) return ">";
  return "=";
}

function verifierSigne(signe, input) {
  return reponse.verifier("texte", signe, input, { mode: "identique" });
}

// \tfrac (pas \frac) : dans un bloc \[...\] (mode display), \frac s'affiche
// en grand par défaut — trop haut pour la hauteur de ligne fixe.
function dfrac(nombre) {
  return nombre.toLatex({ nombreAff: "fraction" });
}

// Parenthèses autour d'une valeur négative substituée, pour éviter les
// doubles signes ambigus ("3 ... -5" au lieu de "3 ... (-5)").
function tex(v) {
  return v < 0 ? `(${v})` : `${v}`;
}

const comparaison = [

  /* =========================================
     ENTIERS
     ========================================= */

  {
    id: "comparer_entiers",
    theme: "comparaison",
    niveau: "6",
    negatif: "non",
    gen() {
      const a = 1 + Math.floor(Math.random() * 999);
      const b = 1 + Math.floor(Math.random() * 999);
      const signe = comparer(a, b);

      const expression = `${a} \\, \\ldots \\, ${b}`;
      const resultat = `${a} ${signe} ${b}`;

      return {
        latex: `
        \\text{Comparer : }
        \\,\\,${expression}
        `,
        correction: `
        ${resultat}
        `,
        verifier(input) {
          return verifierSigne(signe, input);
        }
      };
    }
  },

  /* =========================================
     NOMBRES DÉCIMAUX
     ========================================= */

  {
    id: "comparer_decimaux",
    theme: "comparaison",
    niveau: "6",
    negatif: "non",
    gen() {
      const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

      const genDecimal = () => {
        const entier = rand(0, 15);
        const nbDec = rand(1, 2);
        let dec = "";
        for (let i = 0; i < nbDec; i++) dec += rand(0, 9);
        return Number(`${entier}.${dec}`);
      };

      const a = genDecimal();
      const b = genDecimal();
      const signe = comparer(a, b);

      const expression = `${a} \\, \\ldots \\, ${b}`;
      const resultat = `${a} ${signe} ${b}`;

      return {
        latex: `
        \\text{Comparer : }
        \\,\\,${expression}
        `,
        correction: `
        ${resultat}
        `,
        verifier(input) {
          return verifierSigne(signe, input);
        }
      };
    }
  },

  /* =========================================
     FRACTIONS
     Comparaison par produit en croix.
     ========================================= */

  {
    id: "comparer_fractions",
    theme: "comparaison",
    niveau: "6",
    negatif: "non",
    gen() {
      const a = 1 + Math.floor(Math.random() * 5);
      const b = 2 + Math.floor(Math.random() * 7);
      const c = 1 + Math.floor(Math.random() * 5);
      const d = 2 + Math.floor(Math.random() * 7);

      const gauche = Nombre.fromParts(a, b, "fraction");
      const droite = Nombre.fromParts(c, d, "fraction");

      const signe = comparer(a * d, c * b);

      const expression = `${dfrac(gauche)} \\, \\ldots \\, ${dfrac(droite)}`;
      const resultat = `${dfrac(gauche)} ${signe} ${dfrac(droite)}`;

      return {
        latex: `
        \\text{Comparer : }
        \\,\\,${expression}
        `,
        correction: `
        ${resultat}
        `,
        verifier(input) {
          return verifierSigne(signe, input);
        }
      };
    }
  },

  /* =========================================
     ENTIERS RELATIFS
     ========================================= */

  {
    id: "comparer_entiers_relatifs",
    theme: "comparaison",
    niveau: "6",
    negatif: "oui",
    gen() {
      const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
      const a = rand(-999, 999);
      const b = rand(-999, 999);
      const signe = comparer(a, b);

      const expression = `${tex(a)} \\, \\ldots \\, ${tex(b)}`;
      const resultat = `${tex(a)} ${signe} ${tex(b)}`;

      return {
        latex: `
        \\text{Comparer : }
        \\,\\,${expression}
        `,
        correction: `
        ${resultat}
        `,
        verifier(input) {
          return verifierSigne(signe, input);
        }
      };
    }
  },

  /* =========================================
     NOMBRES DÉCIMAUX RELATIFS
     ========================================= */

  {
    id: "comparer_decimaux_relatifs",
    theme: "comparaison",
    niveau: "6",
    negatif: "oui",
    gen() {
      const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

      const genDecimal = () => {
        const signeAlea = Math.random() < 0.5 ? -1 : 1;
        const entier = rand(0, 15);
        const nbDec = rand(1, 2);
        let dec = "";
        for (let i = 0; i < nbDec; i++) dec += rand(0, 9);
        return signeAlea * Number(`${entier}.${dec}`);
      };

      const a = genDecimal();
      const b = genDecimal();
      const signe = comparer(a, b);

      const expression = `${tex(a)} \\, \\ldots \\, ${tex(b)}`;
      const resultat = `${tex(a)} ${signe} ${tex(b)}`;

      return {
        latex: `
        \\text{Comparer : }
        \\,\\,${expression}
        `,
        correction: `
        ${resultat}
        `,
        verifier(input) {
          return verifierSigne(signe, input);
        }
      };
    }
  },

  /* =========================================
     FRACTIONS RELATIVES
     Comparaison par produit en croix (valable quel que soit le signe des
     numérateurs, tant que les dénominateurs restent positifs).
     ========================================= */

  {
    id: "comparer_fractions_relatifs",
    theme: "comparaison",
    niveau: "6",
    negatif: "oui",
    gen() {
      const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
      const signeAlea = () => (Math.random() < 0.5 ? -1 : 1);

      const a = signeAlea() * rand(1, 5);
      const b = rand(2, 8);
      const c = signeAlea() * rand(1, 5);
      const d = rand(2, 8);

      const gauche = Nombre.fromParts(a, b, "fraction");
      const droite = Nombre.fromParts(c, d, "fraction");

      const signe = comparer(a * d, c * b);

      const expression = `${dfrac(gauche)} \\, \\ldots \\, ${dfrac(droite)}`;
      const resultat = `${dfrac(gauche)} ${signe} ${dfrac(droite)}`;

      return {
        latex: `
        \\text{Comparer : }
        \\,\\,${expression}
        `,
        correction: `
        ${resultat}
        `,
        verifier(input) {
          return verifierSigne(signe, input);
        }
      };
    }
  }

];

export default comparaison;
