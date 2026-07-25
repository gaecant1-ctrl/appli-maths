import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function pgcd(a, b) {
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

function verifierScalaire(nombre, input) {
  return reponse.verifier("grandeur", new Grandeur(nombre, {}), input);
}

// Raccourci pour éviter de répéter { nombreAff: "fraction" } à chaque
// appel (nombre.js gère déjà \tfrac vs \frac).
function dfrac(nombre, opts = {}) {
  return nombre.toLatex({ nombreAff: "fraction", ...opts });
}

const fractions = [

  /* =========================================
     LES QUATRE OPÉRATIONS — dénominateurs quelconques, résultat
     toujours affiché/vérifié en fraction simple (jamais en écriture
     mixte : dfrac() force nombreAff:"fraction").
     ========================================= */

  {
    id: "somme_fractions",
    theme: "fractions",
    niveau: "6",
    negatif: "non",
    gen() {
      const denoms = [2, 3, 4, 5, 6, 8, 9, 10];
      const den = () => denoms[Math.floor(Math.random() * denoms.length)];
      // Un multiple du dénominateur (num % denom === 0) donne une fraction
      // affichée qui est en fait un entier déguisé (ex: 4/2, 6/3) — permis
      // sur UN SEUL des deux termes, jamais les deux à la fois.
      const num = (denom, interditEntier) => {
        let n;
        do {
          n = 1 + Math.floor(Math.random() * (2 * denom));
        } while (interditEntier && n % denom === 0);
        return n;
      };

      const b = den(), d = den();
      const a = num(b, false);
      const c = num(d, a % b === 0);

      const f1 = Nombre.fromParts(a, b, "fraction");
      const f2 = Nombre.fromParts(c, d, "fraction");
      const somme = f1.add(f2).simplify();

      const expression = `${dfrac(f1)} + ${dfrac(f2)}`;
      const resultat = dfrac(somme);

      return {
        latex: `
        \\text{Calculer : }
        ${expression}
        `,
        correction: `
        ${expression} = ${resultat}
        `,
        verifier(input) {
          return verifierScalaire(somme, input);
        }
      };
    }
  },

  {
    id: "difference_fractions",
    theme: "fractions",
    niveau: "6",
    negatif: "non",
    gen() {
      const denoms = [2, 3, 4, 5, 6, 8, 9, 10];
      const den = () => denoms[Math.floor(Math.random() * denoms.length)];
      // Un multiple du dénominateur (num % denom === 0) donne une fraction
      // affichée qui est en fait un entier déguisé (ex: 4/2, 6/3) — permis
      // sur UN SEUL des deux termes, jamais les deux à la fois.
      const num = (denom, interditEntier) => {
        let n;
        do {
          n = 1 + Math.floor(Math.random() * (2 * denom));
        } while (interditEntier && n % denom === 0);
        return n;
      };

      const b = den(), d = den();
      const a = num(b, false);
      const c = num(d, a % b === 0);

      let f1 = Nombre.fromParts(a, b, "fraction");
      let f2 = Nombre.fromParts(c, d, "fraction");

      // Toujours le plus grand moins le plus petit (negatif: "non") : on
      // échange les deux fractions plutôt que de relancer le tirage.
      if (a * d < c * b) [f1, f2] = [f2, f1];

      const difference = f1.sub(f2).simplify();

      const expression = `${dfrac(f1)} - ${dfrac(f2)}`;
      const resultat = dfrac(difference);

      return {
        latex: `
        \\text{Calculer : }
        ${expression}
        `,
        correction: `
        ${expression} = ${resultat}
        `,
        verifier(input) {
          return verifierScalaire(difference, input);
        }
      };
    }
  },

  {
    id: "produit_fractions",
    theme: "fractions",
    niveau: "4",
    negatif: "non",
    gen() {
      const denoms = [2, 3, 4, 5, 6];
      const den = () => denoms[Math.floor(Math.random() * denoms.length)];
      const num = (denom) => 1 + Math.floor(Math.random() * (denom - 1));

      const b = den(), d = den();
      const a = num(b), c = num(d);

      const f1 = Nombre.fromParts(a, b, "fraction");
      const f2 = Nombre.fromParts(c, d, "fraction");
      const produit = f1.mul(f2).simplify();

      const expression = `${dfrac(f1)} \\times ${dfrac(f2)}`;
      const resultat = dfrac(produit);

      return {
        latex: `
        \\text{Calculer : }
        ${expression}
        `,
        correction: `
        ${expression} = ${resultat}
        `,
        verifier(input) {
          return verifierScalaire(produit, input);
        }
      };
    }
  },

  {
    id: "quotient_fractions",
    theme: "fractions",
    niveau: "4",
    negatif: "non",
    gen() {
      const denoms = [2, 3, 4, 5, 6];
      const den = () => denoms[Math.floor(Math.random() * denoms.length)];
      const num = (denom) => 1 + Math.floor(Math.random() * (denom - 1));

      const b = den(), d = den();
      const a = num(b), c = num(d);

      const f1 = Nombre.fromParts(a, b, "fraction");
      const f2 = Nombre.fromParts(c, d, "fraction");
      const quotient = f1.div(f2).simplify();

      const expression = `${dfrac(f1)} : ${dfrac(f2)}`;
      const resultat = dfrac(quotient);

      return {
        latex: `
        \\text{Calculer : }
        ${expression}
        `,
        correction: `
        ${expression} = ${resultat}
        `,
        verifier(input) {
          return verifierScalaire(quotient, input);
        }
      };
    }
  },

  {
    id: "simplifier",
    theme: "fractions",
    niveau: "6",
    negatif: "non",
    gen() {
      const k = 2 + Math.floor(Math.random() * 5);
      const a0 = 2 + Math.floor(Math.random() * 4);
      const b0 = 3 + Math.floor(Math.random() * 4);

      const a = k * a0;
      const b = k * b0;

      // simplify() calcule le PGCD réel de a/b — le résultat est donc
      // toujours la forme réduite au maximum, même si a0/b0 ne sont pas
      // eux-mêmes premiers entre eux.
      const fraction = Nombre.fromParts(a, b, "fraction");
      const simplifiee = fraction.simplify();

      const expression = dfrac(fraction);
      const resultat = dfrac(simplifiee);

      return {
        latex: `
        \\text{Simplifier, au maximum : }
        ${expression}
        `,
        correction: `
        ${expression} = ${resultat}
        `,
        verifier(input) {
          return verifierScalaire(simplifiee, input);
        }
      };
    }
  },

  {
    id: "fraction_d_un_nombre",
    theme: "fractions",
    niveau: "6",
    negatif: "non",
    gen() {
      // fraction simplifiée de base (a0/b0 premiers entre eux)
      const b0 = 2 + Math.floor(Math.random() * 9); // 2..10
      let a0;
      do {
        a0 = 1 + Math.floor(Math.random() * (b0 - 1));
      } while (pgcd(a0, b0) !== 1);

      // facteur de complication éventuel (a0/b0 affiché non réduit)
      const facteurs = [1, 2, 3, 5];
      const kComp = facteurs[Math.floor(Math.random() * facteurs.length)];

      const a = a0 * kComp;
      const b = b0 * kComp;

      // c multiple du dénominateur simplifié, pour un résultat entier
      const k = 2 + Math.floor(Math.random() * 6);
      const c = b0 * k;

      const fractionAffichee = Nombre.fromParts(a, b, "fraction");
      const fractionSimplifiee = Nombre.fromParts(a0, b0, "fraction");
      const produit = fractionAffichee.mul(Nombre.fromParts(c, 1, "entier")).simplify();

      const exprAffichee = `${dfrac(fractionAffichee)} \\times ${c}`;
      const exprSimple = `${dfrac(fractionSimplifiee)} \\times ${c}`;
      const resultat = dfrac(produit);

      const correction =
        kComp === 1
          ? `${exprAffichee} = ${resultat}`
          : `${exprAffichee} = ${exprSimple} = ${resultat}`;

      return {
        latex: `
        \\text{Calculer : }
        ${exprAffichee}
        `,
        correction: `
        ${correction}
        `,
        verifier(input) {
          return verifierScalaire(produit, input);
        }
      };
    }
  },

  /* =========================================
     CALCUL PRIORITAIRE FRACTIONNAIRE
     Forme : a/b × c/d + e/f  (produit avant somme, ordre variable)
     ========================================= */

  {
    id: "priorite_produit_somme",
    theme: "fractions",
    niveau: "5",
    negatif: "non",
    gen() {
      const denoms = [2, 3, 4, 5, 6];
      const den = () => denoms[Math.floor(Math.random() * denoms.length)];
      const b = den(), d = den(), f = den();
      const num = (denom) => 1 + Math.floor(Math.random() * (denom - 1));
      const a = num(b), c = num(d), e = num(f);

      const f1 = Nombre.fromParts(a, b, "fraction");
      const f2 = Nombre.fromParts(c, d, "fraction");
      const f3 = Nombre.fromParts(e, f, "fraction");

      const produit = f1.mul(f2);
      const somme = produit.add(f3).simplify();

      // Position du produit avant ou après le terme isolé : la priorité
      // (produit avant somme) doit être respectée quel que soit l'ordre.
      const produitAvant = Math.random() < 0.5;
      const expression = produitAvant
        ? `${dfrac(f1)} \\times ${dfrac(f2)} + ${dfrac(f3)}`
        : `${dfrac(f3)} + ${dfrac(f1)} \\times ${dfrac(f2)}`;

      return {
        latex: `
        \\text{Calculer, en donnant le résultat sous forme de fraction irréductible : }
        ${expression}
        `,
        correction: `
        ${expression} = ${dfrac(produit)} + ${dfrac(f3)} = ${dfrac(somme)}
        `,
        verifier(input) {
          return verifierScalaire(somme, input);
        }
      };
    }
  },

  /* =========================================
     CALCUL PRIORITAIRE FRACTIONNAIRE
     Forme : a/b × c/d - e/f  (produit avant différence, ordre variable)
     ========================================= */

  {
    id: "priorite_produit_difference",
    theme: "fractions",
    niveau: "5",
    negatif: "non",
    gen() {
      const denoms = [2, 3, 4, 5, 6];
      const den = () => denoms[Math.floor(Math.random() * denoms.length)];
      const b = den(), d = den(), f = den();
      const num = (denom) => 1 + Math.floor(Math.random() * (denom - 1));
      const a = num(b), c = num(d), e = num(f);

      const f1 = Nombre.fromParts(a, b, "fraction");
      const f2 = Nombre.fromParts(c, d, "fraction");
      const f3 = Nombre.fromParts(e, f, "fraction");

      const produit = f1.mul(f2);

      // Terme isolé toujours soustrait au produit, jamais l'inverse — on
      // resterait sinon sur des relatifs, hors de portée de cet exercice
      // qui se limite volontairement aux fractions positives (negatif:
      // "non"). Si le produit est plus petit que e/f, on retire.
      if (produit.valeurNum.a * f3.valeurNum.b < f3.valeurNum.a * produit.valeurNum.b) {
        return this.gen();
      }
      const difference = produit.sub(f3).simplify();

      const expression = `${dfrac(f1)} \\times ${dfrac(f2)} - ${dfrac(f3)}`;

      return {
        latex: `
        \\text{Calculer, en donnant le résultat sous forme de fraction irréductible : }
        ${expression}
        `,
        correction: `
        ${expression} = ${dfrac(produit)} - ${dfrac(f3)} = ${dfrac(difference)}
        `,
        verifier(input) {
          return verifierScalaire(difference, input);
        }
      };
    }
  }

];

export default fractions;
