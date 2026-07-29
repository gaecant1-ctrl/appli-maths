// =====================================================
// STATISTIQUES — moyenne (simple et pondérée), étendue, médiane, effectif/
// fréquence, mode.
// Pas de dossier de référence dans appli-maths (aucun app "statistique[s]") :
// écrit directement dans le style flash (comme probabilite.js/echelle.js),
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

function shuffle(arr) {
  return [...arr].sort(() => Math.random() - 0.5);
}

// Effectif total dont les seuls facteurs premiers sont 2 et 5 : garantit
// une moyenne à écriture décimale exacte (finie), jamais une fraction du
// type 1/3 — cohérent avec le reste de flash (aucune valeur arrondie).
function denomPropre() {
  return pick([4, 5, 8, 10]);
}

function verifierEntier(valeur, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeur)), {}), input);
}

function verifierNombre(nombre, input) {
  return reponse.verifier("grandeur", new Grandeur(nombre, {}), input);
}

function verifierFraction(favorable, total, input) {
  const d = gcd(favorable, total);
  return reponse.verifier("grandeur", new Grandeur(Nombre.fromParts(favorable / d, total / d), {}), input);
}

// "\dfrac{favorable}{total}", suivi de "= \dfrac{a}{b}" seulement si la
// fraction n'est pas déjà irréductible.
function correctionFraction(favorable, total) {
  const d = gcd(favorable, total);
  const a = favorable / d, b = total / d;
  return d === 1 ? `\\dfrac{${favorable}}{${total}}` : `\\dfrac{${favorable}}{${total}} = \\dfrac{${a}}{${b}}`;
}

const statistiques = [

  // ---------------------------------------------------
  // Moyenne d'une série de valeurs
  // ---------------------------------------------------
  {
    id: "statistiques_moyenne",
    theme: "statistiques",
    niveau: "4",
    negatif: "non",
    gen() {
      const n = pick([4, 5, 10]);
      const valeurs = Array.from({ length: n }, () => randInt(0, 20));
      const somme = valeurs.reduce((s, v) => s + v, 0);
      const moyenne = Nombre.fromParts(somme, n);

      return {
        latex: `
        \\text{Voici une série de valeurs : } ${valeurs.join(" ; ")}.\\\\
        \\text{Calculer la moyenne de cette série.}
        `,
        correction: `\\dfrac{${valeurs.join(" + ")}}{${n}} = ${moyenne.toLatex({ nombreAff: "dec" })}`,
        verifier(input) { return verifierNombre(moyenne, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Moyenne pondérée (valeurs affectées d'un effectif)
  // ---------------------------------------------------
  {
    id: "statistiques_moyenne_ponderee",
    theme: "statistiques",
    niveau: "4",
    negatif: "non",
    gen() {
      const total = denomPropre();
      // Répartit `total` en 3 effectifs positifs (au moins 1 chacun).
      const e1 = randInt(1, total - 2);
      const e2 = randInt(1, total - e1 - 1);
      const e3 = total - e1 - e2;
      const effectifs = [e1, e2, e3];
      const valeurs = Array.from({ length: 3 }, () => randInt(0, 20));

      const sommePonderee = valeurs.reduce((s, v, i) => s + v * effectifs[i], 0);
      const moyenne = Nombre.fromParts(sommePonderee, total);

      const description = valeurs.map((v, i) => `${v} \\text{ (effectif } ${effectifs[i]}\\text{)}`).join(", \\ ");
      const numLatex = valeurs.map((v, i) => `${v} \\times ${effectifs[i]}`).join(" + ");

      return {
        latex: `
        \\text{Voici une série de valeurs, avec leur effectif : } ${description}.\\\\
        \\text{Calculer la moyenne pondérée de cette série.}
        `,
        correction: `\\dfrac{${numLatex}}{${total}} = ${moyenne.toLatex({ nombreAff: "dec" })}`,
        verifier(input) { return verifierNombre(moyenne, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Étendue d'une série (max - min)
  // ---------------------------------------------------
  {
    id: "statistiques_etendue",
    theme: "statistiques",
    niveau: "4",
    negatif: "non",
    gen() {
      const n = randInt(5, 8);
      const valeurs = Array.from({ length: n }, () => randInt(0, 30));
      const max = Math.max(...valeurs);
      const min = Math.min(...valeurs);

      return {
        latex: `
        \\text{Voici une série de valeurs : } ${valeurs.join(" ; ")}.\\\\
        \\text{Calculer l'étendue de cette série.}
        `,
        correction: `${max} - ${min} = ${max - min}`,
        verifier(input) { return verifierEntier(max - min, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Médiane d'une série (effectif impair ou pair)
  // ---------------------------------------------------
  {
    id: "statistiques_mediane",
    theme: "statistiques",
    niveau: "4",
    negatif: "non",
    gen() {
      const impair = Math.random() < 0.5;
      const n = impair ? pick([5, 7, 9]) : pick([4, 6, 8]);
      const valeurs = Array.from({ length: n }, () => randInt(0, 30));
      const triees = [...valeurs].sort((a, b) => a - b);

      let mediane, explication;
      if (impair) {
        const i = (n - 1) / 2;
        mediane = Nombre.fromParts(triees[i], 1, "entier");
        explication = `\\text{Valeur du milieu (série triée) : } ${triees.join(" ; ")} \\Rightarrow ${triees[i]}`;
      } else {
        const i1 = n / 2 - 1, i2 = n / 2;
        const somme = triees[i1] + triees[i2];
        mediane = Nombre.fromParts(somme, 2);
        explication = `
        \\text{Deux valeurs du milieu (série triée) : } ${triees.join(" ; ")} \\Rightarrow ${triees[i1]}\\text{ et }${triees[i2]}\\\\
        \\dfrac{${triees[i1]} + ${triees[i2]}}{2} = ${mediane.toLatex({ nombreAff: "dec" })}
        `;
      }

      return {
        latex: `
        \\text{Voici une série de valeurs : } ${valeurs.join(" ; ")}.\\\\
        \\text{Calculer la médiane de cette série.}
        `,
        correction: explication,
        verifier(input) { return verifierNombre(mediane, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Effectif total / fréquence d'une sous-catégorie
  // ---------------------------------------------------
  {
    id: "statistiques_frequence",
    theme: "statistiques",
    niveau: "5",
    negatif: "non",
    gen() {
      // Toujours 3 modalités (pas plus) : au-delà, la ligne de détail prend
      // trop de place à l'écran.
      const categories = [
        { sujet: "genre de livre préféré", noms: ["romantique", "BD", "policier"] },
        { sujet: "sport préféré", noms: ["foot", "basket", "natation"] },
        { sujet: "animal préféré", noms: ["chien", "chat", "poisson"] }
      ];
      const categorie = pick(categories);
      const noms = shuffle(categorie.noms);
      const effectifs = noms.map(() => randInt(2, 10));
      const total = effectifs.reduce((s, e) => s + e, 0);

      const indexCible = randInt(0, noms.length - 1);
      const favorable = effectifs[indexCible];

      // Un SEUL bloc \text{...} pour toute la ligne de détail (pas un par
      // item) : imbriquer \text{...} à l'intérieur d'un autre \text{...}
      // n'est pas interprété par MathJax — la commande interne apparaît
      // telle quelle au lieu d'être exécutée.
      const detail = noms.map((nom, i) => `${nom} (effectif : ${effectifs[i]})`).join(", ");

      return {
        latex: `
        \\text{On a interrogé des élèves sur leur ${categorie.sujet}.}\\\\
        \\text{${detail}.}\\\\
        \\text{Quelle est la fréquence des élèves ayant répondu "${noms[indexCible]}" ?}
        `,
        correction: correctionFraction(favorable, total),
        verifier(input) { return verifierFraction(favorable, total, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Mode d'une série (valeur la plus fréquente)
  // ---------------------------------------------------
  {
    id: "statistiques_mode",
    theme: "statistiques",
    niveau: "5",
    negatif: "non",
    gen() {
      const valeursDistinctes = shuffle(Array.from({ length: 6 }, () => randInt(1, 20)).filter((v, i, arr) => arr.indexOf(v) === i)).slice(0, 4);
      const modeVal = valeursDistinctes[0];

      // Le mode apparaît strictement plus souvent que chaque autre valeur.
      const occurrencesMode = randInt(3, 5);
      const liste = Array(occurrencesMode).fill(modeVal);
      valeursDistinctes.slice(1).forEach(v => {
        const occ = randInt(1, occurrencesMode - 1);
        for (let i = 0; i < occ; i++) liste.push(v);
      });

      return {
        latex: `
        \\text{Voici une série de valeurs : } ${shuffle(liste).join(" ; ")}.\\\\
        \\text{Quel est le mode de cette série ?}
        `,
        correction: `${modeVal}`,
        verifier(input) { return verifierEntier(modeVal, input); }
      };
    }
  }

];

export default statistiques;
