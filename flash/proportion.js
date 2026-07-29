// =====================================================
// PROPORTION — "quelle est la proportion de ... ?" (groupes garçons/filles)
// Port des cas 18 à 21 de appli-maths/nombreProportionnalite/Enonce.js
// (EnonceProportionnalite.genVariant) au format flash (gen()/verifier()).
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

// a/b irréductible, 0 < a < b (proportion strictement entre 0 et 1).
function ratioIrreductible(bMin, bMax) {
  let a, b;
  do {
    b = randInt(bMin, bMax);
    a = randInt(1, b - 1);
  } while (gcd(a, b) !== 1);
  return { a, b };
}

function verifierFraction(a, b, input) {
  return reponse.verifier("grandeur", new Grandeur(Nombre.fromParts(a, b), {}), input);
}

function verifierPourcentage(pct, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(`${pct}%`), {}), input);
}

function verifierEntier(valeur, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeur)), {}), input);
}

// Un groupe scindé en deux (garçons/filles), formulé de trois façons
// différentes — jamais toujours la même, comme dans la source.
function situationGroupe(sousCas, g, f, cible, autreCible, numCible, numAutre, tot) {
  if (sousCas === 1) {
    return `\\text{Dans un groupe, il y a } ${g} \\text{ garçons et } ${f} \\text{ filles.}`;
  }
  if (sousCas === 2) {
    return `\\text{Dans un groupe de } ${tot} \\text{ élèves, } ${numCible} \\text{ sont des ${cible} et les autres sont des ${autreCible}.}`;
  }
  return `\\text{Dans un groupe de } ${tot} \\text{ élèves, } ${numAutre} \\text{ sont des ${autreCible} et les autres sont des ${cible}.}`;
}

const proportion = [

  // ---------------------------------------------------
  // Proportion (fraction) d'un groupe dans un autre
  // ---------------------------------------------------
  {
    id: "proportion_fraction_groupe",
    theme: "proportion",
    niveau: "6",
    negatif: "non",
    gen() {
      const { a, b } = ratioIrreductible(2, 6);
      const k = randInt(2, 6);
      const tot = b * k, g = a * k, f = tot - g;

      const cible = pick(["garçons", "filles"]);
      const autreCible = cible === "garçons" ? "filles" : "garçons";
      const numCible = cible === "garçons" ? g : f;
      const numAutre = cible === "garçons" ? f : g;

      const sousCas = randInt(1, 3);
      const sit = situationGroupe(sousCas, g, f, cible, autreCible, numCible, numAutre, tot);

      const etape = k > 1
        ? `\\dfrac{${numCible}}{${tot}} = \\dfrac{${a}}{${b}}`
        : `\\dfrac{${numCible}}{${tot}}`;

      return {
        latex: `${sit}\\\\ \\text{Quelle est la proportion de ${cible} dans le groupe ?}`,
        correction: `${etape}`,
        verifier(input) { return verifierFraction(a, b, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Proportion (pourcentage) d'un groupe dans un autre
  // ---------------------------------------------------
  {
    id: "proportion_pourcentage_groupe",
    theme: "proportion",
    niveau: "6",
    negatif: "non",
    gen() {
      const pct = pick([10, 20, 25, 30, 40, 50, 60, 75]);
      const d = gcd(pct, 100);
      const a = pct / d, b = 100 / d;
      const k = randInt(1, 5);
      const tot = b * k, g = a * k, f = tot - g;

      const cible = pick(["garçons", "filles"]);
      const autreCible = cible === "garçons" ? "filles" : "garçons";
      const numCible = cible === "garçons" ? g : f;
      const numAutre = cible === "garçons" ? f : g;
      const pctCible = cible === "garçons" ? pct : 100 - pct;

      const sousCas = randInt(1, 3);
      const sit = situationGroupe(sousCas, g, f, cible, autreCible, numCible, numAutre, tot);

      return {
        latex: `${sit}\\\\ \\text{Quel est le pourcentage de ${cible} dans le groupe ?}`,
        correction: `\\dfrac{${numCible}}{${tot}} = ${pctCible}\\,\\%`,
        verifier(input) { return verifierPourcentage(pctCible, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Effectif d'un groupe, connaissant le pourcentage de l'autre
  // ---------------------------------------------------
  {
    id: "proportion_effectif_depuis_pourcentage",
    theme: "proportion",
    niveau: "5",
    negatif: "non",
    gen() {
      const pctBase = pick([10, 20, 25, 30, 40, 50, 60, 75]);
      const d = gcd(pctBase, 100);
      const a = pctBase / d, b = 100 / d;
      const k = randInt(2, 6);
      const tot = b * k, g = a * k, f = tot - g;

      const groupePct = pick(["garçons", "filles"]);
      const pctDonne = groupePct === "garçons" ? pctBase : 100 - pctBase;
      const qDonne = groupePct === "garçons" ? g : f;

      const cibleQuestion = pick(["garçons", "filles"]);
      const reponseAttendue = cibleQuestion === groupePct ? qDonne : tot - qDonne;

      const correction = cibleQuestion === groupePct
        ? `${tot} \\times ${pctDonne}\\,\\% = ${reponseAttendue}`
        : `${tot} \\times ${pctDonne}\\,\\% = ${qDonne}\\quad\\text{puis}\\quad ${tot} - ${qDonne} = ${reponseAttendue}`;

      return {
        latex: `
        \\text{Dans un groupe de } ${tot} \\text{ personnes, il y a } ${pctDonne}\\,\\%\\text{ de ${groupePct}.}\\\\
        \\text{Quel est le nombre de ${cibleQuestion} dans ce groupe ?}
        `,
        correction,
        verifier(input) { return verifierEntier(reponseAttendue, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Total (ou effectif complémentaire), connaissant un pourcentage et un effectif
  // ---------------------------------------------------
  {
    id: "proportion_total_depuis_pourcentage",
    theme: "proportion",
    niveau: "5",
    negatif: "non",
    gen() {
      const pctBase = pick([10, 20, 25, 30, 40, 50, 60, 75]);
      const d = gcd(pctBase, 100);
      const a = pctBase / d, b = 100 / d;
      const k = randInt(2, 6);
      const tot = b * k;

      const nomA = pick(["garçons", "filles"]);
      const nomB = nomA === "garçons" ? "filles" : "garçons";
      const pctA = pctBase, valA = a * k;
      const pctB = 100 - pctBase, valB = tot - valA;

      const sousCas = randInt(1, 4);
      let latex, correction, reponse_;

      if (sousCas === 1) {
        latex = `
        \\text{Dans un groupe, il y a } ${pctA}\\,\\%\\text{ de ${nomA}, ce qui correspond à } ${valA} \\text{ ${nomA}.}\\\\
        \\text{Quel est le nombre total de personnes dans ce groupe ?}
        `;
        correction = `${valA} \\div ${pctA}\\,\\% = ${tot}`;
        reponse_ = tot;
      } else if (sousCas === 2) {
        latex = `
        \\text{Dans un groupe, il y a } ${pctA}\\,\\%\\text{ de ${nomA}. On y compte également } ${valB} \\text{ ${nomB}.}\\\\
        \\text{Quel est le nombre total de personnes dans ce groupe ?}
        `;
        correction = `${valB} \\div ${pctB}\\,\\% = ${tot}`;
        reponse_ = tot;
      } else if (sousCas === 3) {
        latex = `
        \\text{Dans un groupe, il y a } ${pctA}\\,\\%\\text{ de ${nomA}, ce qui correspond à } ${valA} \\text{ ${nomA}.}\\\\
        \\text{Quel est le nombre de ${nomB} dans ce groupe ?}
        `;
        correction = `${valA} \\div ${pctA}\\,\\% = ${tot}\\quad\\text{puis}\\quad ${tot} - ${valA} = ${valB}`;
        reponse_ = valB;
      } else {
        latex = `
        \\text{Dans un groupe, il y a } ${pctA}\\,\\%\\text{ de ${nomA}. On y compte également } ${valB} \\text{ ${nomB}.}\\\\
        \\text{Quel est le nombre de ${nomA} dans ce groupe ?}
        `;
        correction = `${valB} \\div ${pctB}\\,\\% = ${tot}\\quad\\text{puis}\\quad ${tot} - ${valB} = ${valA}`;
        reponse_ = valA;
      }

      return {
        latex,
        correction,
        verifier(input) { return verifierEntier(reponse_, input); }
      };
    }
  }

];

export default proportion;
