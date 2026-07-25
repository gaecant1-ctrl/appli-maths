import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

const calculNum = [

  /* =========================================
     PRIORITÉS + RELATIFS (transition / fin)
     Forme : a ± b*c ± d:c
     ========================================= */

  {
    id: "priorites-positifs",
    theme: "calcul-num",
    niveau: "5",
    negatif: "non",
    gen() {
      const c = 2 + Math.floor(Math.random() * 7);
      const b = 1 + Math.floor(Math.random() * 9);
      const k = 1 + Math.floor(Math.random() * 6);
      const d = c * k;
      const a = 5 + Math.floor(Math.random() * 20);

      const s1 = Math.random() < 0.5 ? "+" : "-";
      const s2 = Math.random() < 0.5 ? "+" : "-";

      const valeur =
        a +
        (s1 === "+" ? 1 : -1) * (b * c) +
        (s2 === "+" ? 1 : -1) * (d / c);

      const expression = `${a} ${s1} ${b} \\times ${c} ${s2} ${d} : ${c}`;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${valeur}
        `,
        verifier(input) {
          const attendu = new Grandeur(Nombre.fromParts(valeur, 1), {});
          return reponse.verifier("grandeur", attendu, input);
        }
      };
    }
  },



  {
    id: "somme-de-produits",
    theme: "calcul-num",
    niveau: "6",
    negatif: "non",
    gen() {
      const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
      const a = rand(2, 9);
      const b = rand(2, 9);
      const c = rand(2, 9);
      const d = rand(2, 9);

      const expression = `${a} \\times ${b} + ${c} \\times ${d}`;
      const valeur = a * b + c * d;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${valeur}
        `,
        verifier(input) {
          const attendu = new Grandeur(Nombre.fromParts(valeur, 1), {});
          return reponse.verifier("grandeur", attendu, input);
        }
      };
    }
  },

  /* =========================================
     DIVISION D'UNE EXPRESSION PRIORITAIRE
     Forme : (a + b*c) : d, avec d diviseur exact de a + b*c
     ========================================= */

  {
    id: "division-de-somme",
    theme: "calcul-num",
    niveau: "6",
    negatif: "non",
    gen() {
      const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));

      const diviseurs = n => {
        const abs = Math.abs(n);
        const divs = [];
        for (let i = 2; i <= abs; i++) {
          if (abs % i === 0) divs.push(i);
        }
        return divs;
      };

      const a = rand(2, 9);
      const b = rand(2, 9);
      const c = rand(2, 9);
      const somme = a + b * c;

      const divs = diviseurs(somme);
      if (divs.length === 0) return this.gen(); // relance : aucun diviseur > 1

      const d = divs[Math.floor(Math.random() * divs.length)];
      const valeur = somme / d;

      const expression = `(${a} + ${b} \\times ${c}) : ${d}`;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${somme} : ${d} = ${valeur}
        `,
        verifier(input) {
          const attendu = new Grandeur(Nombre.fromParts(valeur, 1), {});
          return reponse.verifier("grandeur", attendu, input);
        }
      };
    }
  },

  /* =========================================
     CHAÎNE AVEC RELATIFS
     Forme : a - b + c, a/b/c non nuls, éventuellement négatifs
     ========================================= */

  {
    id: "chaine-relatifs",
    theme: "calcul-num",
    niveau: "6",
    negatif: "oui",
    gen() {
      const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
      const nonNul = () => {
        let v;
        do { v = rand(-9, 9); } while (v === 0);
        return v;
      };

      const a = nonNul();
      const b = nonNul();
      const c = nonNul();

      // Parenthèses autour d'une valeur négative substituée, pour éviter
      // les doubles signes ambigus ("3 - -5" au lieu de "3 - (-5)").
      const tex = v => v < 0 ? `(${v})` : `${v}`;

      const expression = `${tex(a)} - ${tex(b)} + ${tex(c)}`;
      const valeur = a - b + c;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${valeur}
        `,
        verifier(input) {
          const attendu = new Grandeur(Nombre.fromParts(valeur, 1), {});
          return reponse.verifier("grandeur", attendu, input);
        }
      };
    }
  }

];

export default calculNum;
