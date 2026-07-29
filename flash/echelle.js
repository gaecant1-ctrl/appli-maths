// =====================================================
// ÉCHELLE — plan/réel et effets d'un agrandissement
// Port des cas 6 (Échelle) et 15 (Agrandissement et Prix, pizza) de
// appli-maths/nombreProportionnalite/Enonce.js au format flash.
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function grandeur(valeur, unite) {
  return new Grandeur(Nombre.fromParts(valeur, 1), unite ? { [unite]: 1 } : {});
}

const echelle = [

  // ---------------------------------------------------
  // Distance réelle <-> distance sur le plan, échelle donnée
  // ("1 cm représente k km")
  // ---------------------------------------------------
  {
    id: "echelle_distance_reelle",
    theme: "echelle",
    niveau: "5",
    negatif: "non",
    gen() {
      const k = pick([2, 3, 4, 5, 10, 25, 50]);
      const m = randInt(2, 12);
      const coeffEchelle = new Grandeur(Nombre.fromParts(k, 1), { km: 1, cm: -1 });

      if (Math.random() < 0.5) {
        const dPlan = grandeur(m, "cm");
        const dReelle = dPlan.mul(coeffEchelle).convertirEn({ km: 1 });

        return {
          latex: `
          \\text{Sur un plan, une longueur de } 1\\,\\text{cm} \\text{ représente une distance réelle de } ${k}\\,\\text{km}.\\\\
          \\text{Une distance sur le plan mesure } ${m}\\,\\text{cm}.\\\\
          \\text{Quelle distance réelle représente-t-elle ?}
          `,
          correction: `${m} \\times ${k} = ${m * k}\\,\\text{km}`,
          verifier(input) { return reponse.verifier("grandeur", dReelle, input); }
        };
      }

      const dReelle = grandeur(m * k, "km");
      const dPlanAttendu = dReelle.div(coeffEchelle).convertirEn({ cm: 1 });

      return {
        latex: `
        \\text{Sur un plan, une longueur de } 1\\,\\text{cm} \\text{ représente une distance réelle de } ${k}\\,\\text{km}.\\\\
        \\text{Une distance réelle mesure } ${m * k}\\,\\text{km}.\\\\
        \\text{Quelle distance sur le plan la représente ?}
        `,
        correction: `${m * k} \\div ${k} = ${m}\\,\\text{cm}`,
        verifier(input) { return reponse.verifier("grandeur", dPlanAttendu, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Détermination de l'échelle (distance réelle pour 1 cm sur le plan),
  // connaissant une distance réelle et sa représentation sur le plan
  // ---------------------------------------------------
  {
    id: "echelle_valeur_echelle",
    theme: "echelle",
    niveau: "4",
    negatif: "non",
    gen() {
      const k = pick([2, 3, 4, 5, 10, 20, 25, 50, 100]);
      const m = randInt(1, 8);
      const echelleAttendue = grandeur(k, "km");

      return {
        latex: `
        \\text{Sur un plan, une distance de } ${m}\\,\\text{cm} \\text{ représente une distance réelle de } ${m * k}\\,\\text{km}.\\\\
        \\text{Quelle distance réelle représente } 1\\,\\text{cm} \\text{ sur ce plan ?}
        `,
        correction: `${m * k} \\div ${m} = ${k}\\,\\text{km}`,
        verifier(input) { return reponse.verifier("grandeur", echelleAttendue, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Effet d'un agrandissement de rapport k sur un prix proportionnel à
  // une aire (l'aire, donc le prix, est multiplié par k²)
  // ---------------------------------------------------
  {
    id: "echelle_agrandissement_prix",
    theme: "echelle",
    niveau: "4",
    negatif: "non",
    gen() {
      const d1 = pick([20, 24, 25, 30]);
      const k = pick([2, 3]);
      const d2 = d1 * k;
      const p1 = randInt(6, 12);
      const p2 = p1 * k * k;

      return {
        latex: `
        \\text{Une pizza de } ${d1}\\,\\text{cm de diamètre coûte } ${p1}\\,\\text{€}.\\\\
        \\text{Combien devrait coûter une pizza de } ${d2}\\,\\text{cm de diamètre, si le prix est proportionnel à l'aire ?}
        `,
        correction: `${p1} \\times ${k}^2 = ${p2}\\,\\text{€}`,
        verifier(input) { return reponse.verifier("grandeur", grandeur(p2, "€"), input); }
      };
    }
  }

];

export default echelle;
