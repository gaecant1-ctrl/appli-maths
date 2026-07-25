import { Nombre } from "./nombre.js";
import { Polynome } from "./calcul-litteral.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

const calcul = [


  /* =========================================
     FACTORISATION / CALCUL ASTUCIEUX
     Forme : a*b + c*a + d*e
     ========================================= */

{
  id: "factorisation-astucieuse",
  theme: "calcul-astucieux",
  niveau: "6",
  gen() {
    // a entre 12 et 19
    const a = 12 + Math.floor(Math.random() * 8); // 12..19

    // somme cible pour a + d
    const sommeAD = Math.random() < 0.5 ? 20 : 30;
    const d = sommeAD - a;

    // b et c non multiples de 10
    let b, c;
    do {
      b = 1 + Math.floor(Math.random() * 19);
    } while (b % 10 === 0);

    do {
      c = 1 + Math.floor(Math.random() * 19);
    } while (c % 10 === 0);

    // e = b + c (et donc non multiple de 10 aussi)
    const e = b + c;

    // sécurité : éviter e multiple de 10
    if (e % 10 === 0) {
      return this.gen(); // on relance proprement
    }

    // mélange d’ordre
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);

    let termes = [
      [a, b],
      [c, a],
      [d, e]
    ];

    termes = termes.map(t => shuffle(t));
    termes = shuffle(termes);

    const expression = termes
      .map(([x, y]) => `${x} \\times ${y}`)
      .join(" + ");

    const valeur = a * b + c * a + d * e;

    return {
      latex: `
      \\text{Calculer :}\\\\[4pt]
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
  id: "Développement-astucieux",
  theme: "calcul-astucieux",
  niveau: "6",
  gen() {
    // a entre 12 et 19
    const a = 12 + Math.floor(Math.random() * 8); // 12..19

    // somme cible pour a + d
    const sommeAD = Math.random() < 0.5 ? 20 : 30;
    const d = sommeAD - a;

    // b et c non multiples de 10
    let b, c;
    do {
      b = 1 + Math.floor(Math.random() * 19);
    } while (b % 10 === 0);

    do {
      c = 1 + Math.floor(Math.random() * 19);
    } while (c % 10 === 0);

    // e = b + c (et donc non multiple de 10 aussi)
    const e = b + c;

    // sécurité : éviter e multiple de 10
    if (e % 10 === 0) {
      return this.gen(); // on relance proprement
    }

    // mélange d’ordre
    const shuffle = arr => arr.sort(() => Math.random() - 0.5);

    let termes = [
      [a, b],
      [c, a],
      [d, e]
    ];

    termes = termes.map(t => shuffle(t));
    termes = shuffle(termes);

    const expression = termes
      .map(([x, y]) => `${x} \\times ${y}`)
      .join(" + ");

    const valeur = a * b + c * a + d * e;

    return {
      latex: `
      \\text{Calculer :}\\\\[4pt]
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

export default calcul;
