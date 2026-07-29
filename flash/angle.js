// =====================================================
// ANGLES — collège
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// "°" nu en dehors d'un \text{} n'est pas un symbole mathématique valide
// pour MathJax — ça casse le rendu (et tout ce qui suit) au lieu de
// simplement s'afficher. Toujours l'envelopper, comme les autres unités
// (\text{cm}, \text{h}...).
function deg(v) {
  return `${v}\\text{°}`;
}

// L'unité fait partie de la réponse (angle en degrés) : elle n'est jamais
// optionnelle, même si elle est déjà visible dans l'énoncé.
function verifierAngle(valeurDeg, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeurDeg)), { "°": 1 }), input);
}

// Question de cours : vocabulaire des angles (aigu/droit/obtus/plat) — un
// des 4 énoncés à trou tiré au hasard à chaque génération.
const vocabulaireAngles = [
  { debut: `\\text{Un angle compris entre } ${deg(0)} \\text{ et } ${deg(90)} \\text{ est dit}`, reponse: "aigu" },
  { debut: `\\text{Un angle de } ${deg(90)} \\text{ est dit}`, reponse: "droit" },
  { debut: `\\text{Un angle compris entre } ${deg(90)} \\text{ et } ${deg(180)} \\text{ est dit}`, reponse: "obtus" },
  { debut: `\\text{Un angle de } ${deg(180)} \\text{ est dit}`, reponse: "plat" }
];

const angle = [

  // ---------------------------------------------------
  // Cours : vocabulaire des angles
  // ---------------------------------------------------
  {
    id: "vocabulaire_angles",
    theme: "angle",
    niveau: "6",
    negatif: "non",
    cours: "oui",
    gen() {
      const choix = vocabulaireAngles[randInt(0, vocabulaireAngles.length - 1)];

      return {
        latex: `${choix.debut} \\text{.............}`,
        correction: `${choix.debut} \\text{ ${choix.reponse}.}`,
        verifier(input) {
          return reponse.verifier("texte", choix.reponse, input);
        }
      };
    }
  },

  // ---------------------------------------------------
  // Troisième angle d'un triangle (somme = 180°)
  // ---------------------------------------------------
  {
    id: "troisieme_angle_triangle",
    theme: "angle",
    niveau: "6",
    negatif: "non",
    gen() {
      const a = randInt(20, 100);
      const b = randInt(20, 130 - a); // garantit a + b < 180, troisième angle >= 10°
      const c = 180 - a - b;

      return {
        latex: `
        \\text{Un triangle a deux angles respectivement de } ${deg(a)} \\text{ et } ${deg(b)}\\text{.}\\\\
        \\text{Quelle est la mesure du troisième ?}
        `,
        correction: `${deg(180)}-(${deg(a)} + ${deg(b)}) = ${deg(c)}`,
        verifier(input) { return verifierAngle(c, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Triangle rectangle : angles aigus complémentaires (somme = 90°)
  // Lettres et position (angle droit / angle donné) tirées au hasard.
  // ---------------------------------------------------
  {
    id: "angle_triangle_rectangle",
    theme: "angle",
    niveau: "6",
    negatif: "non",
    gen() {
      const triangles = ["ABC", "DEF", "GHI", "MNP", "RST", "UVW", "XYZ"];
      const lettres = triangles[randInt(0, triangles.length - 1)].split("");

      // Mélange des 3 lettres : la première devient le sommet de l'angle
      // droit, la deuxième celui de l'angle donné, la troisième celui
      // demandé — position différente à chaque génération.
      for (let i = lettres.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [lettres[i], lettres[j]] = [lettres[j], lettres[i]];
      }
      const [sommetDroit, sommetDonne, sommetCherche] = lettres;
      const nomTriangle = lettres.join("");

      const donne = randInt(10, 80);
      const cherche = 90 - donne;

      return {
        latex: `
        \\text{Dans un triangle } ${nomTriangle} \\text{ rectangle en } ${sommetDroit}\\text{, on a :}\\,\\,
        \\widehat{${sommetDonne}} = ${deg(donne)}\\\\
        \\text{Quelle est la mesure de } \\widehat{${sommetCherche}}\\text{ ?}
        `,
        correction: `\\widehat{${sommetCherche}} = ${deg(90)}-${deg(donne)} = ${deg(cherche)}`,
        verifier(input) { return verifierAngle(cherche, input); }
      };
    }
  },
    {
    id: "angle_triangle_isocele_princ",
    theme: "angle",
    niveau: "6",
    negatif: "non",
    gen() {
      const triangles = ["ABC", "DEF", "GHI", "MNP", "RST", "UVW", "XYZ"];
      const lettres = triangles[randInt(0, triangles.length - 1)].split("");

      // Mélange des 3 lettres : la première devient le sommet de l'angle
      // droit, la deuxième celui de l'angle donné, la troisième celui
      // demandé — position différente à chaque génération.
      for (let i = lettres.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [lettres[i], lettres[j]] = [lettres[j], lettres[i]];
      }
      const [sommetDroit, sommetDonne, sommetCherche] = lettres;
      const nomTriangle = lettres.join("");

      const donne = 2*randInt(10, 80);
      const cherche = (180 - donne)/2;

      return {
        latex: `
        \\text{Dans un triangle } ${nomTriangle} \\text{ isocèle en } ${sommetDroit}\\text{, on a :}\\,\\,
        \\widehat{${sommetDroit}} = ${deg(donne)}\\\\
        \\text{Quelle est la mesure de } \\widehat{${sommetCherche}}\\text{ ?}
        `,
        correction: `\\widehat{${sommetCherche}} = (${deg(180)}-${deg(donne)}):2 = ${deg(cherche)}`,
        verifier(input) { return verifierAngle(cherche, input); }
      };
    }
  },
      {
    id: "angle_triangle_isocele_base",
    theme: "angle",
    niveau: "6",
    negatif: "non",
    gen() {
      const triangles = ["ABC", "DEF", "GHI", "MNP", "RST", "UVW", "XYZ"];
      const lettres = triangles[randInt(0, triangles.length - 1)].split("");

      // Mélange des 3 lettres : la première devient le sommet de l'angle
      // droit, la deuxième celui de l'angle donné, la troisième celui
      // demandé — position différente à chaque génération.
      for (let i = lettres.length - 1; i > 0; i--) {
        const j = randInt(0, i);
        [lettres[i], lettres[j]] = [lettres[j], lettres[i]];
      }
      const [sommetDroit, sommetDonne, sommetCherche] = lettres;
      const nomTriangle = lettres.join("");

      const donne = 2*randInt(10, 80);
      const cherche = 180 - 2*donne;

      return {
        latex: `
        \\text{Dans un triangle } ${nomTriangle} \\text{ isocèle en } ${sommetDroit}\\text{, on a :}\\,\\,
        \\widehat{${sommetDonne}} = ${deg(donne)}\\\\
        \\text{Quelle est la mesure de } \\widehat{${sommetDroit}}\\text{ ?}
        `,
        correction: `\\widehat{${sommetDroit}} = ${deg(180)}-2\\times${deg(donne)} = ${deg(cherche)}`,
        verifier(input) { return verifierAngle(cherche, input); }
      };
    }
  }

];

export default angle;
