// =====================================================
// PÉRIMÈTRES — collège
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";
import { verifierMultipleDePi, verifierPiPlusConstante } from "./verif-pi.js";

// outil : entier aléatoire [min, max]
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// L'unité fait partie de la réponse (périmètre en cm) : elle n'est jamais
// optionnelle, même si elle est déjà visible dans l'énoncé.
function verifierLongueur(valeurCm, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeurCm)), { cm: 1 }), input);
}

const perimetre = [

  // ---------------------------------------------------
  // Périmètre d’un carré
  // ---------------------------------------------------
  {
    id: "perimetre_carre",
    theme: "perimetre",
    niveau: "6",
    gen() {
      const a = randInt(2, 20);

      return {
        latex: `
        \\text{Calculer le périmètre d’un carré de côté } ${a}\\,\\text{cm}.
        `,
        correction: `
        P = 4 \\times ${a}\\,\\text{cm} = ${4 * a}\\,\\text{cm}
        `,
        verifier(input) { return verifierLongueur(4 * a, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Périmètre d’un disque (rayon OU diamètre)
  // ---------------------------------------------------
  {
    id: "perimetre_disque",
    theme: "perimetre",
    niveau: "6",
    gen() {
      const modeRayon = Math.random() < 0.5;

      if (modeRayon) {
        const r = randInt(3, 10);

        return {
          latex: `
          \\text{Calculer le périmètre d’un disque de rayon } ${r}\\,\\text{cm}.
          `,
          correction: `
          P = 2 \\times \\pi \\times ${r}\\,\\text{cm}
          = ${2 * r}\\pi\\,\\text{cm}
          `,
          verifier(input) { return verifierMultipleDePi(2 * r, "\\text{cm}", "cm", input); }
        };
      } else {
        const d = randInt(3, 10);

        return {
          latex: `
          \\text{Calculer le périmètre d’un disque de diamètre } ${d}\\,\\text{cm}.
          `,
          correction: `
          P = \\pi \\times ${d}\\,\\text{cm}
          = ${d}\\pi\\,\\text{cm}
          `,
          verifier(input) { return verifierMultipleDePi(d, "\\text{cm}", "cm", input); }
        };
      }
    }
  },

  // ---------------------------------------------------
  // Périmètre d’un rectangle
  // ---------------------------------------------------
  {
    id: "perimetre_rectangle",
    theme: "perimetre",
    niveau: "6",
    gen() {
      const a = randInt(3, 10);
      const b = randInt(3, 10);

      return {
        latex: `
        \\text{Calculer le périmètre d’un rectangle de dimensions }
        ${a}\\,\\text{cm} \\text{ et } ${b}\\,\\text{cm}.
        `,
        correction: `
        P = 2 \\times (${a}\\,\\text{cm} + ${b}\\,\\text{cm})
        = ${2 * (a + b)}\\,\\text{cm}
        `,
        verifier(input) { return verifierLongueur(2 * (a + b), input); }
      };
    }
  },

  // ---------------------------------------------------
  // Périmètre d’un demi-disque (rayon OU diamètre)
  // ---------------------------------------------------
  {
    id: "perimetre_demi_disque",
    theme: "perimetre",
    niveau: "6",
    gen() {
      const modeRayon = Math.random() < 0.5;

      if (modeRayon) {
        const r = randInt(3, 10);

        return {
          latex: `
          \\text{Calculer le périmètre d’un demi-disque de rayon } ${r}\\,\\text{cm}.
          `,
          correction: `
          P = \\pi \\times ${r}\\,\\text{cm} + 2 \\times ${r}\\,\\text{cm}
          = ${r}\\pi\\,\\text{cm} + ${2 * r}\\,\\text{cm}
          `,
          verifier(input) { return verifierPiPlusConstante(r, 2 * r, "\\text{cm}", "cm", input); }
        };
      } else {
        const d = randInt(4, 10);

        return {
          latex: `
          \\text{Calculer le périmètre d’un demi-disque de diamètre } ${d}\\,\\text{cm}.
          `,
          correction: `
          P = \\dfrac{\\pi \\times ${d}\\,\\text{cm}}{2} + ${d}\\,\\text{cm}
          = ${d / 2}\\pi\\,\\text{cm} + ${d}\\,\\text{cm}
          `,
          verifier(input) { return verifierPiPlusConstante(d / 2, d, "\\text{cm}", "cm", input); }
        };
      }
    }
  }

];

export default perimetre;
