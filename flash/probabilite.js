// =====================================================
// PROBABILITÉ — issues équiprobables, calcul de probabilité (fraction
// irréductible), événement contraire, événements certain/impossible.
// Pas de port direct : appli-maths/proba/main.js est un simulateur
// (tirages répétés, fréquences observées — dés, urne multicolore, marche
// aléatoire, pièces), pas une banque de questions gen()/verifier(). Écrit
// directement dans le style flash (comme proportion.js/echelle.js),
// s'appuyant sur Nombre/Grandeur/reponse.js déjà en place.
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

function ratioReduit(favorable, total) {
  const d = gcd(favorable, total);
  return { a: favorable / d, b: total / d };
}

function verifierFraction(favorable, total, input) {
  const { a, b } = ratioReduit(favorable, total);
  return reponse.verifier("grandeur", new Grandeur(Nombre.fromParts(a, b), {}), input);
}

function verifierEntier(valeur, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeur)), {}), input);
}

function correctionFraction(favorable, total) {
  const { a, b } = ratioReduit(favorable, total);
  return (a === favorable && b === total)
    ? `\\dfrac{${favorable}}{${total}}`
    : `\\dfrac{${favorable}}{${total}} = \\dfrac{${a}}{${b}}`;
}

const probabilite = [

  // ---------------------------------------------------
  // Urne multicolore : boules indiscernables au toucher
  // ---------------------------------------------------
  {
    id: "probabilite_urne_couleurs",
    theme: "probabilite",
    niveau: "4",
    negatif: "non",
    gen() {
      const palette = ["rouges", "bleues", "vertes", "jaunes", "noires", "blanches"];
      const nCouleurs = pick([2, 2, 3]);
      const couleurs = [...palette].sort(() => Math.random() - 0.5).slice(0, nCouleurs);
      const effectifs = couleurs.map(() => randInt(1, 8));
      const total = effectifs.reduce((s, n) => s + n, 0);

      const indexCible = randInt(0, nCouleurs - 1);
      const favorable = effectifs[indexCible];
      const couleurCible = couleurs[indexCible];

      const description = couleurs.map((c, i) => `${effectifs[i]} boule${effectifs[i] > 1 ? "s" : ""} ${c}`).join(", ");

      return {
        latex: `
        \\text{Une urne contient ${description}, indiscernables au toucher.}\\\\
        \\text{On tire une boule au hasard. Quelle est la probabilité de tirer une boule ${couleurCible} ?}
        `,
        correction: correctionFraction(favorable, total),
        verifier(input) { return verifierFraction(favorable, total, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Dé cubique à 6 faces
  // ---------------------------------------------------
  {
    id: "probabilite_de",
    theme: "probabilite",
    niveau: "4",
    negatif: "non",
    gen() {
      const evenements = [
        { texte: "un multiple de 3", favorables: [3, 6] },
        { texte: "un nombre pair", favorables: [2, 4, 6] },
        { texte: "un nombre impair", favorables: [1, 3, 5] },
        { texte: "un diviseur de 6", favorables: [1, 2, 3, 6] },
        { texte: "un nombre supérieur ou égal à 4", favorables: [4, 5, 6] },
        { texte: "un nombre strictement inférieur à 3", favorables: [1, 2] },
        { texte: "le nombre 5", favorables: [5] }
      ];
      const evt = pick(evenements);
      const favorable = evt.favorables.length;

      return {
        latex: `
        \\text{On lance un dé cubique équilibré, numéroté de 1 à 6.}\\\\
        \\text{Quelle est la probabilité d'obtenir ${evt.texte} ?}
        `,
        correction: correctionFraction(favorable, 6),
        verifier(input) { return verifierFraction(favorable, 6, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Événement contraire : P(non A) = 1 - P(A)
  // ---------------------------------------------------
  {
    id: "probabilite_complementaire",
    theme: "probabilite",
    niveau: "4",
    negatif: "non",
    gen() {
      let denom, num;
      do {
        denom = randInt(3, 10);
        num = randInt(1, denom - 1);
      } while (gcd(num, denom) !== 1);

      return {
        latex: `
        \\text{Un événement A a pour probabilité } P(A) = \\dfrac{${num}}{${denom}}.\\\\
        \\text{Quelle est la probabilité de l'événement contraire (non A) ?}
        `,
        correction: `1 - \\dfrac{${num}}{${denom}} = \\dfrac{${denom - num}}{${denom}}`,
        verifier(input) { return verifierFraction(denom - num, denom, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Événement certain / impossible (vocabulaire de base)
  // ---------------------------------------------------
  {
    id: "probabilite_certain_impossible",
    theme: "probabilite",
    niveau: "5",
    negatif: "non",
    gen() {
      const scenarios = [
        { texte: "\\text{On lance un dé à 6 faces, numéroté de 1 à 6. Quelle est la probabilité d'obtenir 7 ?}", valeur: 0 },
        { texte: "\\text{On lance un dé à 6 faces, numéroté de 1 à 6. Quelle est la probabilité d'obtenir un nombre compris entre 1 et 6 ?}", valeur: 1 },
        { texte: "\\text{Une urne ne contient que des boules rouges. Quelle est la probabilité de tirer une boule bleue ?}", valeur: 0 },
        { texte: "\\text{Une urne ne contient que des boules rouges. Quelle est la probabilité de tirer une boule rouge ?}", valeur: 1 },
        { texte: "\\text{On lance une pièce équilibrée. Quelle est la probabilité d'obtenir pile ou face ?}", valeur: 1 }
      ];
      const s = pick(scenarios);

      return {
        latex: s.texte,
        correction: `${s.valeur}`,
        verifier(input) { return verifierEntier(s.valeur, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Jeu de 32 cartes
  // ---------------------------------------------------
  {
    id: "probabilite_carte_32",
    theme: "probabilite",
    niveau: "4",
    negatif: "non",
    gen() {
      const evenements = [
        { texte: "un as", favorable: 4 },
        { texte: "une figure (valet, dame ou roi)", favorable: 12 },
        { texte: "un cœur", favorable: 8 },
        { texte: "un roi ou une dame", favorable: 8 },
        { texte: "un 7", favorable: 4 },
        { texte: "un roi de cœur", favorable: 1 }
      ];
      const evt = pick(evenements);

      return {
        latex: `
        \\text{On tire au hasard une carte d'un jeu de 32 cartes.}\\\\
        \\text{Quelle est la probabilité d'obtenir ${evt.texte} ?}
        `,
        correction: correctionFraction(evt.favorable, 32),
        verifier(input) { return verifierFraction(evt.favorable, 32, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Roue divisée en secteurs identiques
  // ---------------------------------------------------
  {
    id: "probabilite_roue",
    theme: "probabilite",
    niveau: "5",
    negatif: "non",
    gen() {
      const n = pick([8, 10, 12, 16, 20]);
      const evenements = [
        { texte: "un numéro pair", favorable: n / 2 },
        { texte: "un numéro impair", favorable: n / 2 },
        { texte: "un numéro supérieur à la moitié des secteurs", favorable: n / 2 },
        { texte: "le numéro 1", favorable: 1 }
      ];
      const evt = pick(evenements);

      return {
        latex: `
        \\text{Une roue est divisée en } ${n} \\text{ secteurs identiques, numérotés de 1 à } ${n}.\\\\
        \\text{On fait tourner la roue. Quelle est la probabilité d'obtenir ${evt.texte} ?}
        `,
        correction: correctionFraction(evt.favorable, n),
        verifier(input) { return verifierFraction(evt.favorable, n, input); }
      };
    }
  }

];

export default probabilite;
