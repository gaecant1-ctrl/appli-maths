// =====================================================
// GEOMETRIE BASE — vocabulaire/notations de géométrie (collège)
// =====================================================

import * as reponse from "./reponse.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// I et O exclus (confusion avec 1 et 0).
const LETTRES = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

function deuxLettres() {
  const i = randInt(0, LETTRES.length - 1);
  let j;
  do { j = randInt(0, LETTRES.length - 1); } while (j === i);
  return [LETTRES[i], LETTRES[j]];
}

// Chaque entrée porte son énoncé COMPLET (avant le trou) — pas d'intro
// partagée en dur dans gen() : certaines entrées (ex: "∈") n'ont rien à
// voir avec deux points A/B, donc pas de "Soient deux points..." commun.
// `reponse` peut renvoyer une chaîne (comparaison exacte) ou un tableau de
// variantes acceptées (comparaison "in").
// `presqueJuste` : erreur fréquente et identifiée à l'avance — ici,
// confondre la notation demandée avec une des 3 autres notations de points
// (jamais verrouillé, l'élève est invité à se relire), ou confondre "∈"
// avec "=" pour la dernière entrée. Voir reponse.js → verifierTexte.
const notations = [
  {
    avant: (a, b) => `
      \\text{Soient deux points } ${a} \\text{ et } ${b} \\text{ distincts.}\\\\
      \\text{La demi-droite d'origine } ${a} \\text{ passant par } ${b} \\text{ est notée}
    `,
    reponse: (a, b) => `[${a}${b})`,
    presqueJuste: (a, b) => [`(${a}${b})`, `[${a}${b}]`, `${a}${b}`]
  },
  {
    avant: (a, b) => `
      \\text{Soient deux points } ${a} \\text{ et } ${b} \\text{ distincts.}\\\\
      \\text{La droite passant par } ${a} \\text{ et } ${b} \\text{ est notée}
    `,
    reponse: (a, b) => `(${a}${b})`,
    presqueJuste: (a, b) => [`[${a}${b})`, `[${a}${b}]`, `${a}${b}`]
  },
  {
    avant: (a, b) => `
      \\text{Soient deux points } ${a} \\text{ et } ${b} \\text{ distincts.}\\\\
      \\text{Le segment d'extrémités } ${a} \\text{ et } ${b} \\text{ est noté}
    `,
    reponse: (a, b) => `[${a}${b}]`,
    presqueJuste: (a, b) => [`[${a}${b})`, `(${a}${b})`, `${a}${b}`]
  },
  {
    avant: (a, b) => `
      \\text{Soient deux points } ${a} \\text{ et } ${b} \\text{ distincts.}\\\\
      \\text{La distance entre } ${a} \\text{ et } ${b} \\text{ est notée}
    `,
    reponse: (a, b) => `${a}${b}`,
    presqueJuste: (a, b) => [`[${a}${b})`, `(${a}${b})`, `[${a}${b}]`]
  },
  {
    avant: () => `\\text{Le symbole } \\in \\text{ se lit}`,
    reponse: () => "appartient à",
    presqueJuste: () => ["appartient"]
  }
];

const geometrieBase = [

  // ---------------------------------------------------
  // Cours : notations demi-droite / droite / segment / distance / ∈
  // ---------------------------------------------------
  {
    id: "vocabulaire_notations_geometriques",
    theme: "geometrieBase",
    niveau: "6",
    negatif: "non",
    cours: "oui",
    gen() {
      const [a, b] = deuxLettres();
      const choix = notations[randInt(0, notations.length - 1)];
      const avant = choix.avant(a, b);
      const rep = choix.reponse(a, b);
      const presqueJuste = choix.presqueJuste(a, b);
      const repAffichee = Array.isArray(rep) ? rep[0] : rep;

      return {
        latex: `${avant} \\text{ .............}`,
        correction: `${avant} \\text{ ${repAffichee}}`,
        verifier(input) {
          return reponse.verifier("texte", rep, input, {
            mode: Array.isArray(rep) ? "in" : "identique",
            presqueJuste
          });
        }
      };
    }
  }

];

export default geometrieBase;
