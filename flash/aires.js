// =====================================================
// AIRES — collège
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";
import { verifierMultipleDePi } from "./verif-pi.js";

// outil : entier aléatoire [min, max]
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// L'unité fait partie de la réponse (aire en cm²) : elle n'est jamais
// optionnelle, même si elle est déjà visible dans l'énoncé.
function verifierAire(valeurCm2, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeurCm2)), { cm: 2 }), input);
}

const aires = [

  // ---------------------------------------------------
  // Aire d’un carré
  // ---------------------------------------------------
  {
    id: "aire_carre",
    theme: "aires",
    niveau: "6",
    gen() {
      const a = randInt(2, 20);

      return {
        latex: `
        \\text{Calculer l’aire d’un carré de côté } ${a}\\,\\text{cm}.
        `,
        correction: `
        A = ${a}\\,\\text{cm} \\times ${a}\\,\\text{cm}
        = ${a * a}\\,\\text{cm}^{\\text{2}}
        `,
        verifier(input) { return verifierAire(a * a, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Aire d’un disque (rayon OU diamètre)
  // ---------------------------------------------------
  {
    id: "aire_disque",
    theme: "aires",
    niveau: "5",
    gen() {
      const modeRayon = Math.random() < 0.5;

      if (modeRayon) {
        const r = randInt(3, 10);

        return {
          latex: `
          \\text{Calculer l’aire d’un disque de rayon } ${r}\\,\\text{cm}.
          `,
          correction: `
          A = \\pi \\times (${r}\\,\\text{cm})^2
          = ${r * r}\\pi\\,\\text{cm}^{\\text{2}}
          `,
          verifier(input) { return verifierMultipleDePi(r * r, "\\text{cm}^{\\text{2}}", "cm2", input); }
        };
      } else {
        const d = 2 * randInt(2, 5);
        const r = d / 2;

        return {
          latex: `
          \\text{Calculer l’aire d’un disque de diamètre } ${d}\\,\\text{cm}.
          `,
          correction: `
          A = \\pi \\times (${r}\\,\\text{cm})^2
          = ${r * r}\\pi\\,\\text{cm}^{\\text{2}}
          `,
          verifier(input) { return verifierMultipleDePi(r * r, "\\text{cm}^{\\text{2}}", "cm2", input); }
        };
      }
    }
  },

  // ---------------------------------------------------
  // Aire d’un rectangle
  // ---------------------------------------------------
  {
    id: "aire_rectangle",
    theme: "aires",
    niveau: "6",
    gen() {
      const a = randInt(3, 20);
      const b = randInt(3, 20);

      return {
        latex: `
        \\text{Calculer l’aire d’un rectangle de dimensions : }\\\\
        ${a}\\,\\text{cm} \\text{ et } ${b}\\,\\text{cm}.
        `,
        correction: `
        A = ${a}\\,\\text{cm} \\times ${b}\\,\\text{cm}
        = ${a * b}\\,\\text{cm}^{\\text{2}}
        `,
        verifier(input) { return verifierAire(a * b, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Aire d’un demi-disque (rayon OU diamètre)
  // ---------------------------------------------------
  {
    id: "aire_demi_disque",
    theme: "aires",
    niveau: "5",
    gen() {
      const modeRayon = Math.random() < 0.5;

      if (modeRayon) {
        const r = randInt(3, 10);

        return {
          latex: `
          \\text{Calculer l’aire d’un demi-disque de rayon } ${r}\\,\\text{cm}.
          `,
          correction: `
          A = \\dfrac{1}{2} \\times \\pi \\times (${r}\\,\\text{cm})^2
          = ${r * r / 2}\\pi\\,\\text{cm}^{\\text{2}}
          `,
          verifier(input) { return verifierMultipleDePi(r * r / 2, "\\text{cm}^{\\text{2}}", "cm2", input); }
        };
      } else {
        const d = 2 * randInt(2, 5);
        const r = d / 2;

        return {
          latex: `
          \\text{Calculer l’aire d’un demi-disque de diamètre } ${d}\\,\\text{cm}.
          `,
          correction: `
          A = \\dfrac{1}{2} \\times \\pi \\times (${r}\\,\\text{cm})^2
          = ${r * r / 2}\\pi\\,\\text{cm}^{\\text{2}}
          `,
          verifier(input) { return verifierMultipleDePi(r * r / 2, "\\text{cm}^{\\text{2}}", "cm2", input); }
        };
      }
    }
  }

];

export default aires;
