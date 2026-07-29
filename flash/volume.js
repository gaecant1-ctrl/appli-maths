// =====================================================
// VOLUMES — collège
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";
import { verifierMultipleDePi } from "./verif-pi.js";

// outil : entier aléatoire [min, max]
function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// L'unité fait partie de la réponse (volume en cm³) : elle n'est jamais
// optionnelle, même si elle est déjà visible dans l'énoncé.
function verifierVolume(valeurCm3, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeurCm3)), { cm: 3 }), input);
}

const volume = [

  // ---------------------------------------------------
  // Volume d’un pavé droit
  // ---------------------------------------------------
  {
    id: "volume_pave",
    theme: "volume",
    niveau: "6",
    negatif: "non",
    gen() {
      const a = randInt(2, 12);
      const b = randInt(2, 12);
      const c = randInt(2, 12);

      return {
        latex: `
        \\text{Calculer le volume d’un pavé droit de dimensions :}\\\\
        ${a}\\,\\text{cm} \\text{, } ${b}\\,\\text{cm} \\text{ et } ${c}\\,\\text{cm}.
        `,
        correction: `
        V = ${a}\\,\\text{cm} \\times ${b}\\,\\text{cm} \\times ${c}\\,\\text{cm}
        = ${a * b * c}\\,\\text{cm}^{\\text{3}}
        `,
        verifier(input) { return verifierVolume(a * b * c, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Volume d’un cylindre
  // ---------------------------------------------------
  {
    id: "volume_cylindre",
    theme: "volume",
    niveau: "5",
    negatif: "non",
    gen() {
      const r = randInt(2, 8);
      const h = randInt(2, 10);
      const coeff = r * r * h;

      return {
        latex: `
        \\text{Calculer le volume d’un cylindre de rayon } ${r}\\,\\text{cm}
        \\text{ et de hauteur } ${h}\\,\\text{cm}.
        `,
        correction: `
        V = \\pi \\times (${r}\\,\\text{cm})^2 \\times ${h}\\,\\text{cm}
        = ${coeff}\\pi\\,\\text{cm}^{\\text{3}}
        `,
        verifier(input) { return verifierMultipleDePi(coeff, "\\text{cm}^{\\text{3}}", "cm3", input); }
      };
    }
  },

  // ---------------------------------------------------
  // Volume d’un cône
  // ---------------------------------------------------
  {
    id: "volume_cone",
    theme: "volume",
    niveau: "4",
    negatif: "non",
    gen() {
      const r = randInt(2, 6);

      // h choisi pour que r²×h soit multiple de 3 : coefficient entier
      // après division par 3, pas de fraction dans la réponse.
      let h;
      do {
        h = randInt(2, 9);
      } while ((r * r * h) % 3 !== 0);

      const coeff = (r * r * h) / 3;

      return {
        latex: `
        \\text{Calculer le volume d’un cône de rayon } ${r}\\,\\text{cm}
        \\text{ et de hauteur } ${h}\\,\\text{cm}.
        `,
        correction: `
        V = \\dfrac{1}{3} \\times \\pi \\times (${r}\\,\\text{cm})^2 \\times ${h}\\,\\text{cm}
        = ${coeff}\\pi\\,\\text{cm}^{\\text{3}}
        `,
        verifier(input) { return verifierMultipleDePi(coeff, "\\text{cm}^{\\text{3}}", "cm3", input); }
      };
    }
  },

  // ---------------------------------------------------
  // Volume d’une boule
  // ---------------------------------------------------
  {
    id: "volume_boule",
    theme: "volume",
    niveau: "3",
    negatif: "non",
    gen() {
      // r multiple de 3, pour que 4×r³ soit multiple de 3 : coefficient
      // entier après division par 3, pas de fraction dans la réponse.
      const r = 3 * randInt(1, 3); // 3, 6 ou 9
      const coeff = (4 * r * r * r) / 3;

      return {
        latex: `
        \\text{Calculer le volume d’une boule de rayon } ${r}\\,\\text{cm}.
        `,
        correction: `
        V = \\dfrac{4}{3} \\times \\pi \\times (${r}\\,\\text{cm})^3
        = ${coeff}\\pi\\,\\text{cm}^{\\text{3}}
        `,
        verifier(input) { return verifierMultipleDePi(coeff, "\\text{cm}^{\\text{3}}", "cm3", input); }
      };
    }
  }

];

export default volume;
