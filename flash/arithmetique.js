// =====================================================
// ARITHMÉTIQUE — nombres premiers / factorisation / multiples
// =====================================================

import * as reponse from "./reponse.js";

// Listes non ordonnées (décomposition en facteurs, multiples d'un
// intervalle) : pas un cas couvert par reponse.js, comparaison locale
// par multi-ensemble triée, tokens séparés par ×, x, *, virgule ou espace.
function verifierListeNombres(attendusArr, saisie, separateurAffichage) {
  const attendu = [...attendusArr].sort((x, y) => x - y).join(separateurAffichage);
  const tokens = String(saisie)
    .split(/[×xX*,;\s]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(Number);

  if (tokens.length === 0 || tokens.some(n => !Number.isInteger(n))) {
    return { ok: false, invalide: true, attendu };
  }

  const a = [...tokens].sort((x, y) => x - y);
  const b = [...attendusArr].sort((x, y) => x - y);
  const ok = a.length === b.length && a.every((v, i) => v === b[i]);
  // Rendu LaTeX reconstruit depuis les nombres reconnus (pas le texte brut).
  const saisieLatex = a.join(separateurAffichage);
  return { ok, attendu, saisieLatex };
}

const grandsPremiers = [11, 13];
const petitsPremiers = [2, 3, 5, 7];

// outil : tirage dans un tableau
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// =====================================================
// Construction d’un nombre composé contrôlé
// (pour la décomposition)
// =====================================================
function construitNombreCompose() {
  let nombre, facteurs;

  do {
    // choix exclusif : 2 OU 5
    const facteurBase = Math.random() < 0.5 ? 2 : 5;

    // autres facteurs premiers autorisés (sans l'autre de {2,5})
    const autresPremiers =
      facteurBase === 2
        ? [2, 3, 7]
        : [5, 3, 7];

    // nombre total de facteurs premiers (1 à 4)
    const nbFacteurs = 1 + Math.floor(Math.random() * 4);

    facteurs = [];
    for (let i = 0; i < nbFacteurs; i++) {
      facteurs.push(pick(autresPremiers));
    }

    // on force la présence de 2 ou 5
    facteurs[0] = facteurBase;

    // construction du nombre de base
    nombre = facteurs.reduce((a, b) => a * b, 1);

    // multiplication optionnelle par 10 ou 100
    const facteur10 = Math.random() < 0.5 ? 1 : pick([10, 100]);
    nombre *= facteur10;

  } while (nombre >= 999);

  return { nombre, facteurs };
}


// =====================================================
// Test de primalité
// =====================================================
function estPremier(n) {
  if (n < 2) return false;
  for (let i = 2; i * i <= n; i++) {
    if (n % i === 0) return false;
  }
  return true;
}

// =====================================================
// Construction exercice "multiples"
// =====================================================
function construitMultiples() {
  const a = 3 + Math.floor(Math.random() * 18); // 3 à 20
  const nbMultiples = 5 + Math.floor(Math.random() * 6); // 5 à 10

  const kMin = 2 + Math.floor(Math.random() * 3);
  const kMax = kMin + nbMultiples - 1;

  const multiples = [];
  for (let k = kMin; k <= kMax; k++) {
    multiples.push(a * k);
  }

  const c = multiples[0] - Math.floor(Math.random() * (a - 1) + 1);
  const d = multiples[multiples.length - 1] + Math.floor(Math.random() * (a - 1) + 1);

  return {
    a,
    c,
    d,
    multiples
  };
}

// =====================================================
// BANQUE
// =====================================================

const arithmetique = [

  // ---------------------------------------------------
  // EXERCICE 1 — Est-il premier ? (2 à 100)
  // ---------------------------------------------------
  {
    id: "est_il_premier",
    theme: "arithmetique",
    niveau: "5",
    gen() {
      const nombre = 2 + Math.floor(Math.random() * 99);

      return {
        latex: `
        \\text{Le nombre } ${nombre} \\text{ est-il premier ?}
        `,
        correction: estPremier(nombre)
          ? `${nombre} \\text{ est un nombre premier.}`
          : `${nombre} \\text{ n'est pas un nombre premier.}`,
        verifier(input) {
          const formes = estPremier(nombre)
            ? ["premier", "oui", "vrai", "est premier"]
            : ["non premier", "non", "faux", "n'est pas premier", "pas premier"];
          return reponse.verifier("texte", formes, input, { mode: "in" });
        }
      };
    }
  },

  // ---------------------------------------------------
  // EXERCICE 2 — Décomposition en facteurs premiers
  // ---------------------------------------------------
  {
    id: "decomposition_facteurs_premiers",
    theme: "arithmetique",
    niveau: "5",
    gen() {
      const { nombre, facteurs } = construitNombreCompose();

      const decomposition = facteurs
        .sort((a, b) => a - b)
        .join(" \\times ");

      return {
        latex: `
        \\text{Décomposer } ${nombre} \\text{ en produit de facteurs premiers.}
        `,
        correction: `
        ${nombre} = ${decomposition}
        `,
        verifier(input) {
          return verifierListeNombres(facteurs, input, " \\times ");
        }
      };
    }
  },

  // ---------------------------------------------------
  // EXERCICE 3 — Multiples dans un intervalle
  // ---------------------------------------------------
  {
    id: "multiples_dans_intervalle",
    theme: "arithmetique",
    niveau: "5",
    gen() {
      const { a, c, d, multiples } = construitMultiples();

      return {
        latex: `
        \\text{Donner les multiples de } ${a}
        \\text{ compris entre } ${c} \\text{ et } ${d}.
        `,
        correction: `
 ${multiples.join(" \\; ; \\; ")}
        `,
        verifier(input) {
          return verifierListeNombres(multiples, input, " ; ");
        }
      };
    }
  },
{
  id: "diviseur_multiple_tables",
  theme: "arithmetique",
  niveau: "5",
  gen() {
    // diviseur de base (tables)
    const d = 2 + Math.floor(Math.random() * 9); // 2 à 10

    // coefficient multiplicateur
    const k = 2 + Math.floor(Math.random() * 9); // 2 à 10

    const produit = d * k;

    // tirage aléatoire du sens
    const sens = Math.random() < 0.5;

    let a, b, mot;

    if (sens) {
      // a est diviseur de b
      a = d;
      b = produit;
      mot = "diviseur";
    } else {
      // a est multiple de b
      a = produit;
      b = d;
      mot = "multiple";
    }

    const expression = `${a} \\text{ est un } \\dots\\dots \\text{ de } ${b}`;
    const correction = `${a} \\text{ est un ${mot} de } ${b}`;

    return {
      latex: `
      ${expression}
      `,
      correction: `
      ${correction}
      `,
      verifier(input) {
        const formes = mot === "diviseur" ? ["diviseur", "diviseurs"] : ["multiple", "multiples"];
        return reponse.verifier("texte", formes, input, { mode: "in" });
      }
    };
  }
}


  


];

export default arithmetique;
