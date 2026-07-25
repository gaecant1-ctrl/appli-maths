import { Nombre } from "./nombre.js";
import { Grandeur, uniteDictToLatexInline } from "./calcul-grandeur.js";
import { parseUniteTexte } from "./calcul-grandeur-expr.js";
import * as reponse from "./reponse.js";

// Génère un exercice de conversion à partir d'une table {from, to, k} et
// d'un intervalle de valeurs. Les deux côtés (départ et arrivée) sont de
// vraies instances de Grandeur — l'énoncé et la correction utilisent leur
// propre rendu LaTeX (uniteDictToLatexInline / Grandeur.toLatex), au lieu
// de reconstruire des chaînes "${v}\\,${unite}" à la main.
function genConversion(types, vMin, vMax) {
  const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const t = types[rand(0, types.length - 1)];
  const v = rand(vMin, vMax);

  const uniteDepart = parseUniteTexte(t.from);
  const uniteArrivee = parseUniteTexte(t.to);

  const depart = new Grandeur(new Nombre(String(v)), uniteDepart);
  const valeurArrivee = new Nombre(String(v)).mul(new Nombre(String(t.k)));
  const arrivee = new Grandeur(valeurArrivee, uniteArrivee);

  return {
    latex: `
    \\text{Convertir } ${depart.toLatex()} \\text{ en } ${uniteDictToLatexInline(uniteArrivee)}.
    `,
    correction: `
    ${depart.toLatex()} = ${arrivee.toLatex()}
    `,
    verifier(input) {
      return reponse.verifier("grandeur", arrivee, input);
    }
  };
}

const conversion = [

  /* =========================================
     LONGUEURS
     mm ↔ cm ↔ m ↔ km
     ========================================= */

  {
    id: "conversion-longueur",
    theme: "conversion",
    niveau: "6",
    gen() {
      return genConversion([
        { from: "mm", to: "cm", k: 0.1 },
        { from: "cm", to: "mm", k: 10 },
        { from: "cm", to: "m",  k: 0.01 },
        { from: "m",  to: "cm", k: 100 },
        { from: "m",  to: "km", k: 0.001 },
        { from: "km", to: "m",  k: 1000 }
      ], 2, 90);
    }
  },

  /* =========================================
     AIRES
     cm² ↔ m²
     ========================================= */

  {
    id: "conversion-aire",
    theme: "conversion",
    niveau: "6",
    gen() {
      return genConversion([
        { from: "mm^2", to: "cm^2", k: 0.01 },
        { from: "cm^2", to: "mm^2", k: 100 },

        { from: "cm^2", to: "dm^2", k: 0.01 },
        { from: "dm^2", to: "cm^2", k: 100 },

        { from: "dm^2", to: "m^2", k: 0.01 },
        { from: "m^2",  to: "dm^2", k: 100 }
      ], 2, 90);
    }
  },

  /* =========================================
     VOLUMES
     cm³ ↔ m³ ↔ L
     ========================================= */

  {
    id: "conversion-volume",
    theme: "conversion",
    niveau: "6",
    gen() {
      return genConversion([
        { from: "mm^3", to: "cm^3", k: 0.001 },
        { from: "cm^3", to: "mm^3", k: 1000 },

        { from: "cm^3", to: "dm^3", k: 0.001 },
        { from: "dm^3", to: "cm^3", k: 1000 },

        { from: "dm^3", to: "L", k: 1 },
        { from: "L",    to: "dm^3", k: 1 },

        { from: "m^3", to: "L", k: 1000 },
        { from: "L",   to: "m^3", k: 0.001 }
      ], 2, 30);
    }
  }

];

export default conversion;
