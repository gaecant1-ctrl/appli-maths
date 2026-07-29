// =====================================================
// TAUX D'ÉVOLUTION — augmentation / diminution en pourcentage
// Pas de source directe dans nombreProportionnalite (aucun cas dédié
// trouvé dans Enonce.js) : exercices écrits sur le même modèle que
// proportion.js/thales.js, avec Nombre/Grandeur/reponse.js.
// =====================================================

import { Nombre, gcd } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

const POURCENTAGES = [5, 10, 12, 15, 20, 24, 25, 30, 40, 50, 60, 75, 80];

// Coefficient multiplicateur associé à une évolution de p % (augmentation ou
// diminution), sous forme de fraction irréductible num/den : (100±p)/100
// réduite. Comme 100 = 2²×5², le dénominateur ne garde que des facteurs
// 2/5 → l'écriture décimale correspondante est toujours exacte (finie).
function coefficientFraction(p, sens) {
  const num = sens === "augmentation" ? 100 + p : 100 - p;
  const d = gcd(num, 100);
  return { num: num / d, den: 100 / d };
}

function verifierMontantEuro(valeur, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeur)), { "€": 1 }), input);
}

function verifierPourcentageSigne(pct, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(`${pct}%`), {}), input);
}

function verifierCoefficient(num, den, input) {
  return reponse.verifier("grandeur", new Grandeur(Nombre.fromParts(num, den, "dec"), {}), input);
}

const tauxEvolution = [

  // ---------------------------------------------------
  // Valeur finale, connaissant la valeur initiale et le taux d'évolution
  // ---------------------------------------------------
  {
    id: "evolution_valeur_finale",
    theme: "tauxEvolution",
    niveau: "4",
    negatif: "non",
    gen() {
      const sens = pick(["augmentation", "diminution"]);
      const p = pick(POURCENTAGES);
      const { num, den } = coefficientFraction(p, sens);
      const k = randInt(2, 9);
      const V0 = den * k, V1 = num * k;
      const verbe = sens === "augmentation" ? "augmente" : "diminue";

      return {
        latex: `
        \\text{Un article coûte } ${V0}\\,\\text{€}\\text{. Son prix ${verbe} de } ${p}\\,\\%.\\\\
        \\text{Quel est son nouveau prix ?}
        `,
        correction: `${V0} \\times \\dfrac{${num}}{${den}} = ${V1}\\,\\text{€}`,
        verifier(input) { return verifierMontantEuro(V1, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Taux d'évolution (pourcentage signé), connaissant les deux valeurs
  // ---------------------------------------------------
  {
    id: "evolution_taux_depuis_valeurs",
    theme: "tauxEvolution",
    niveau: "4",
    negatif: "non",
    gen() {
      const sens = pick(["augmentation", "diminution"]);
      const p = pick(POURCENTAGES);
      const { num, den } = coefficientFraction(p, sens);
      const k = randInt(2, 9);
      const V0 = den * k, V1 = num * k;
      const pctSigne = sens === "augmentation" ? p : -p;

      return {
        latex: `
        \\text{Le prix d'un article passe de } ${V0}\\,\\text{€} \\text{ à } ${V1}\\,\\text{€}.\\\\
        \\text{Quel est le taux d'évolution de ce prix ?}
        `,
        correction: `\\dfrac{${V1} - ${V0}}{${V0}} = ${pctSigne}\\,\\%`,
        verifier(input) { return verifierPourcentageSigne(pctSigne, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Coefficient multiplicateur, connaissant le taux d'évolution
  // ---------------------------------------------------
  {
    id: "evolution_coefficient_multiplicateur",
    theme: "tauxEvolution",
    niveau: "4",
    negatif: "non",
    gen() {
      const sens = pick(["augmentation", "diminution"]);
      const p = pick(POURCENTAGES);
      const { num, den } = coefficientFraction(p, sens);
      const coeffLatex = Nombre.fromParts(num, den, "dec").toLatex();
      const verbe = sens === "augmentation" ? "augmentation" : "diminution";

      return {
        latex: `
        \\text{On applique une ${verbe} de } ${p}\\,\\%\\text{ à une quantité.}\\\\
        \\text{Quel est le coefficient multiplicateur associé à cette évolution ?}
        `,
        correction: `${coeffLatex}`,
        verifier(input) { return verifierCoefficient(num, den, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Taux d'évolution (pourcentage signé), connaissant le coefficient
  // multiplicateur — sens inverse du cas précédent
  // ---------------------------------------------------
  {
    id: "evolution_taux_depuis_coefficient",
    theme: "tauxEvolution",
    niveau: "4",
    negatif: "non",
    gen() {
      const sens = pick(["augmentation", "diminution"]);
      const p = pick(POURCENTAGES);
      const { num, den } = coefficientFraction(p, sens);
      const coeffLatex = Nombre.fromParts(num, den, "dec").toLatex();
      const pctSigne = sens === "augmentation" ? p : -p;

      return {
        latex: `
        \\text{Le coefficient multiplicateur associé à une évolution est } ${coeffLatex}.\\\\
        \\text{Quel est le taux d'évolution correspondant (en pourcentage) ?}
        `,
        correction: `${coeffLatex} - 1 = ${pctSigne / 100} = ${pctSigne}\\,\\%`,
        verifier(input) { return verifierPourcentageSigne(pctSigne, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Valeur initiale, connaissant la valeur finale et le taux d'évolution
  // ---------------------------------------------------
  {
    id: "evolution_valeur_initiale",
    theme: "tauxEvolution",
    niveau: "3",
    negatif: "non",
    gen() {
      const sens = pick(["augmentation", "diminution"]);
      const p = pick(POURCENTAGES);
      const { num, den } = coefficientFraction(p, sens);
      const k = randInt(2, 9);
      const V0 = den * k, V1 = num * k;
      const verbe = sens === "augmentation" ? "augmenté" : "diminué";

      return {
        latex: `
        \\text{Après avoir ${verbe} de } ${p}\\,\\%\\text{, le prix d'un article est de } ${V1}\\,\\text{€}.\\\\
        \\text{Quel était son prix initial ?}
        `,
        correction: `${V1} \\div \\dfrac{${num}}{${den}} = ${V0}\\,\\text{€}`,
        verifier(input) { return verifierMontantEuro(V0, input); }
      };
    }
  }

];

export default tauxEvolution;
