// =====================================================
// GEOMETRIE BASE — vocabulaire/notations de géométrie (collège)
// =====================================================

import * as reponse from "./reponse.js";
import { construireQcm } from "./qcm.js";

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
  },
  {
    avant: () => `\\text{Le symbole } \\notin \\text{ se lit}`,
    reponse: () => ["n'appartient pas à", "n’appartient pas à"],
    presqueJuste: () => ["appartient à", "n'appartient pas", "n’appartient pas"]
  }
];

// Vocabulaire du cours (définitions, éléments d'une figure) : énoncé à
// trou, un mot attendu. `presqueJuste` optionnel (accord singulier/pluriel).
const definitions = [
  {
    debut: `\\text{Le point d'un segment situé à égale distance de ses extrémités est son}`,
    reponse: "milieu"
  },
  {
    debut: `\\text{La droite perpendiculaire à un segment et passant par son milieu}\\\\
            \\text{est la ............. de ce segment.}`,
    reponse: "médiatrice"
  },
  {
    debut: `\\text{L'ensemble des points situés à une même distance d'un point est un}`,
    reponse: "cercle"
  },
  {
    debut: `\\text{Tous les points d'un cercle sont à la même distance d'un point}\\\\
            \\text{appelé le}`,
    reponse: "centre"
  },
  {
    debut: `\\text{La distance entre le centre d'un cercle et n'importe quel point}\\\\
            \\text{du cercle est appelée le}`,
    reponse: "rayon"
  },
  {
    debut: `\\text{Des points qui appartiennent à une même droite sont dits}`,
    reponse: "alignés",
    presqueJuste: ["aligné", "alignes"]
  },
  {
    debut: `\\text{Un point où deux lignes se coupent est un point d'}`,
    reponse: "intersection"
  },
  {
    debut: (a, b) => `\\text{Les points } ${a} \\text{ et } ${b} \\text{ sont les ............. du segment } [${a}${b}]\\text{.}`,
    reponse: "extrémités",
    presqueJuste: ["extrémité"]
  },
  {
    debut: (a, b) => `\\text{Le point } ${a} \\text{ est l'............. de la demi-droite } [${a}${b})\\text{.}`,
    reponse: "origine"
  }
];

// Positions relatives de deux droites : vocabulaire et symboles.
// Symbole "parallèle" rendu en deux traits obliques, comme dans le cours.
const PARALLELE = `\\mathbin{/\\!\\!/}`;
const positionsRelatives = [
  {
    debut: `\\text{Deux droites qui se coupent en un point sont dites}`,
    reponse: "sécantes",
    presqueJuste: ["sécante"]
  },
  {
    debut: `\\text{Deux droites sécantes qui forment un angle droit sont dites}`,
    reponse: "perpendiculaires",
    presqueJuste: ["perpendiculaire"]
  },
  {
    debut: `\\text{Deux droites qui ne sont pas sécantes sont dites}`,
    reponse: "parallèles",
    presqueJuste: ["parallèle"]
  },
  {
    debut: `(d) \\perp (d') \\text{ se lit : } (d) \\text{ est}`,
    reponse: ["perpendiculaire à (d')", "perpendiculaire à"],
    presqueJuste: ["parallèle à (d')", "parallèle à"]
  },
  {
    debut: `(d) ${PARALLELE} (d') \\text{ se lit : } (d) \\text{ est}`,
    reponse: ["parallèle à (d')", "parallèle à"],
    presqueJuste: ["perpendiculaire à (d')", "perpendiculaire à"]
  }
];

// Propriétés droites parallèles / perpendiculaires (3 du cours).
const proprietes = [
  {
    debut: `\\text{Si deux droites sont perpendiculaires à une même droite,}\\\\
            \\text{alors elles sont ............. entre elles.}`,
    reponse: "parallèles",
    presqueJuste: ["parallèle"]
  },
  {
    debut: `\\text{Si deux droites sont parallèles entre elles et si une troisième}\\\\
            \\text{est perpendiculaire à l'une, alors elle est ............. à l'autre.}`,
    reponse: "perpendiculaire",
    presqueJuste: ["perpendiculaires"]
  },
  {
    debut: `\\text{Si deux droites sont parallèles à une même droite,}\\\\
            \\text{alors elles sont ............. entre elles.}`,
    reponse: "parallèles",
    presqueJuste: ["parallèle"]
  }
];

// Énoncé à trou générique : si `debut` contient déjà le trou (trou au
// milieu de la phrase), on le garde ; sinon on ajoute le trou en fin.
// Correction : le trou est remplacé par la réponse.
function questionTrou(entree, a, b) {
  const debut = typeof entree.debut === "function" ? entree.debut(a, b) : entree.debut;
  const rep = entree.reponse;
  const repAffichee = Array.isArray(rep) ? rep[0] : rep;
  const trouAuMilieu = debut.includes(".............");
  const latex = trouAuMilieu ? debut : `${debut} \\text{ .............}`;
  const correction = trouAuMilieu
    ? debut.replace(".............", repAffichee)
    : `${debut} \\text{ ${repAffichee}.}`;
  return {
    latex,
    correction,
    verifier(input) {
      return reponse.verifier("texte", rep, input, {
        mode: Array.isArray(rep) ? "in" : "identique",
        presqueJuste: entree.presqueJuste || []
      });
    }
  };
}

// ---------------------------------------------------
// Déduction parallèles / perpendiculaires (3 propriétés du cours)
// ---------------------------------------------------
// Les droites s'appellent (d_1), (d_2), (d_3) mais les numéros sont
// mélangés à chaque tirage, ainsi que l'ordre des deux hypothèses et le
// sens d'écriture de chacune ((d_1)⊥(d_3) ou (d_3)⊥(d_1)).
function melanger(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const PERP = `\\perp`;
const SYMBOLE = { para: PARALLELE, perp: PERP };

// Relation entre deux droites (numéros x, y), écrite dans un sens au hasard.
function relationLatex(rel, x, y) {
  const [u, v] = Math.random() < 0.5 ? [x, y] : [y, x];
  return `(d_${u}) ${SYMBOLE[rel]} (d_${v})`;
}

// a, b, c = numéros mélangés. Chaque cas : 2 hypothèses, 1 conclusion
// (relation + paire de droites), et la propriété utilisée.
const deductions = [
  {
    hypotheses: (a, b, c) => [["perp", a, c], ["perp", b, c]],
    conclusion: (a, b) => ["para", a, b],
    propriete: `\\text{Si deux droites sont perpendiculaires à une même droite,}\\\\
                \\text{alors elles sont parallèles entre elles.}`
  },
  {
    hypotheses: (a, b, c) => [["para", a, b], ["perp", c, a]],
    conclusion: (a, b, c) => ["perp", c, b],
    propriete: `\\text{Si deux droites sont parallèles entre elles et si une troisième}\\\\
                \\text{est perpendiculaire à l'une, alors elle est perpendiculaire à l'autre.}`
  },
  {
    hypotheses: (a, b, c) => [["para", a, c], ["para", b, c]],
    conclusion: (a, b) => ["para", a, b],
    propriete: `\\text{Si deux droites sont parallèles à une même droite,}\\\\
                \\text{alors elles sont parallèles entre elles.}`
  }
];

// Réponse en QCM (menu déroulant) : taper ⊥ au clavier n'est pas ce
// qu'on évalue. Distracteurs, tous faux : la relation contraire sur la
// bonne paire, la relation contraire sur une paire des hypothèses (qui
// contredit donc l'énoncé), et « On ne peut rien déduire » (toujours
// faux ici : deux hypothèses sur 3 droites suffisent à conclure).
const INDICE = { 1: "₁", 2: "₂", 3: "₃" };
const SYMBOLE_TEXTE = { para: "//", perp: "⊥" };
const CONTRAIRE = { para: "perp", perp: "para" };

function choixRelation(rel, x, y) {
  return {
    texte: `(d${INDICE[x]}) ${SYMBOLE_TEXTE[rel]} (d${INDICE[y]})`,
    latex: `(d_${x}) ${SYMBOLE[rel]} (d_${y})`
  };
}

function qcmDeduction(hypotheses, [rel, x, y]) {
  const [hRel, hx, hy] = hypotheses[randInt(0, hypotheses.length - 1)];
  const propositions = melanger([
    { bonne: true, ...choixRelation(rel, x, y) },
    choixRelation(CONTRAIRE[rel], x, y),
    choixRelation(CONTRAIRE[hRel], hx, hy)
  ]);
  propositions.push({ texte: "On ne peut rien déduire", latex: `\\text{On ne peut rien déduire}` });
  return construireQcm(propositions, propositions.findIndex(p => p.bonne));
}

function coursTrou(id, liste) {
  return {
    id,
    theme: "geometrieBase",
    niveau: "6",
    negatif: "non",
    cours: "oui",
    gen() {
      const [a, b] = deuxLettres();
      return questionTrou(liste[randInt(0, liste.length - 1)], a, b);
    }
  };
}

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
  },

  // ---------------------------------------------------
  // Cours : définitions (milieu, médiatrice, cercle, alignés...)
  // ---------------------------------------------------
  coursTrou("vocabulaire_definitions_geometrie", definitions),

  // ---------------------------------------------------
  // Cours : positions relatives de deux droites
  // ---------------------------------------------------
  coursTrou("positions_relatives_droites", positionsRelatives),

  // ---------------------------------------------------
  // Cours : propriétés droites parallèles / perpendiculaires
  // ---------------------------------------------------
  coursTrou("proprietes_paralleles_perpendiculaires", proprietes),

  // ---------------------------------------------------
  // Cours : notation du cercle C_{A,B} (centre A, passant par B)
  // ---------------------------------------------------
  {
    id: "notation_cercle",
    theme: "geometrieBase",
    niveau: "6",
    negatif: "non",
    cours: "oui",
    gen() {
      const [a, b] = deuxLettres();
      const demandeCentre = Math.random() < 0.5;
      const debut = demandeCentre
        ? `\\text{Le centre du cercle } \\mathcal{C}_{${a},${b}} \\text{ est le point}`
        : `\\text{Le cercle } \\mathcal{C}_{${a},${b}} \\text{ passe par le point}`;
      const rep = demandeCentre ? a : b;
      const autre = demandeCentre ? b : a;
      return {
        latex: `${debut} \\text{ .............}`,
        correction: `${debut} \\text{ ${rep}.}`,
        verifier(input) {
          return reponse.verifier("texte", rep, input, { presqueJuste: [autre] });
        }
      };
    }
  },

  // ---------------------------------------------------
  // Exercice : que peut-on déduire ? (droites parallèles / perpendiculaires)
  // ---------------------------------------------------
  {
    id: "deduction_paralleles_perpendiculaires",
    theme: "geometrieBase",
    niveau: "6",
    negatif: "non",
    gen() {
      const [a, b, c] = melanger([1, 2, 3]);
      const cas = deductions[randInt(0, deductions.length - 1)];
      const hypotheses = cas.hypotheses(a, b, c);
      const hyp = melanger(hypotheses)
        .map(([rel, x, y]) => relationLatex(rel, x, y));
      const concl = cas.conclusion(a, b, c);
      const [rel, x, y] = concl;
      const enonce = `
        \\text{On sait que } ${hyp[0]} \\text{ et } ${hyp[1]}\\text{.}\\\\
        \\text{Que peut-on en déduire ?}
      `;

      return {
        latex: enonce,
        correction: `
          ${cas.propriete}\\\\
          \\text{Donc } (d_${x}) ${SYMBOLE[rel]} (d_${y})\\text{.}
        `,
        ...qcmDeduction(hypotheses, concl)
      };
    }
  }

];

export default geometrieBase;
