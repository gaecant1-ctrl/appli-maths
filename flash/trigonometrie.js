// =====================================================
// TRIGONOMÉTRIE — triangle rectangle (3e)
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function nomTriangle() {
  const triangles = ["ABC", "DEF", "GHI", "MNP", "RST", "UVW", "XYZ"];
  const lettres = triangles[randInt(0, triangles.length - 1)].split("");
  for (let i = lettres.length - 1; i > 0; i--) {
    const j = randInt(0, i);
    [lettres[i], lettres[j]] = [lettres[j], lettres[i]];
  }
  return lettres; // [sommetAngleDroit, sommetB, sommetC]
}

// Nom d'un côté par ses deux sommets ; l'autre ordre (ex: "BA" pour "AB")
// est toujours accepté comme réponse équivalente (un segment n'est pas orienté).
function cote(x, y) {
  return `${x}${y}`;
}

function inverser(nomCote) {
  return nomCote.split("").reverse().join("");
}

// Un nom de côté et son ordre inversé (EB = BE).
function variantesCote(nomCote) {
  return [nomCote, inverser(nomCote)];
}

// Parse "AB/BC" (deux côtés, chacun 2 lettres) → { num, den } | null.
function parserRatioCotes(saisie) {
  const norm = String(saisie).trim().toUpperCase().replace(/\s+/g, "");
  const m = norm.match(/^([A-Z]{2})\/([A-Z]{2})$/);
  if (!m) return null;
  return { num: m[1], den: m[2] };
}

// Vérifie un rapport de deux côtés nommés (numérateur/dénominateur) — le
// rendu LaTeX de la saisie de l'élève est une vraie fraction (\dfrac),
// jamais du texte brut.
function verifierRatioCotes(numAttendu, denAttendu, saisie) {
  const attenduTex = `\\dfrac{${numAttendu}}{${denAttendu}}`;
  const parse = parserRatioCotes(saisie);
  if (!parse) return { ok: false, invalide: true, attendu: attenduTex };

  const egal = (a, b) => a === b || a === inverser(b);
  const ok = egal(parse.num, numAttendu) && egal(parse.den, denAttendu);

  return { ok, attendu: attenduTex, saisieLatex: `\\dfrac{${parse.num}}{${parse.den}}` };
}

function verifierScalaire(nombre, input) {
  return reponse.verifier("grandeur", new Grandeur(nombre, {}), input);
}

function dfrac(nombre) {
  return nombre.toLatex({ nombreAff: "fraction" });
}

// ---------------------------------------------------
// Triplets pythagoriciens (pour un rapport trigonométrique exact, en fraction)
// ---------------------------------------------------
const TRIPLETS = [[3, 4, 5], [5, 12, 13], [8, 15, 17], [7, 24, 25], [20, 21, 29], [9, 12, 15], [12, 16, 20]];

// Analyse une expression du type "10 × cos(30)" (ou "cos(30) × 10",
// "10 : cos(30)") — jamais évaluée côté élève, seulement écrite : c'est le
// calcul lui-même qui est l'automatisme testé, pas sa valeur décimale
// (qui demanderait une calculatrice).
function parserExpressionTrig(saisie) {
  const norm = String(saisie).trim().toLowerCase().replace(/\s+/g, "")
    .replace(/×/g, "*").replace(/x/g, "*").replace(/[:÷]/g, "/").replace(/°/g, "")
    .replace(/cm/g, "");

  const num = `(\\d+(?:[.,]\\d+)?)`;
  const fn = `(cos|sin|tan)\\(?${num}\\)?`;

  let m = norm.match(new RegExp(`^${num}\\*${fn}$`));
  if (m) return { valeur: parseFloat(m[1].replace(",", ".")), fonction: m[2], angle: parseFloat(m[3].replace(",", ".")), op: "*" };

  m = norm.match(new RegExp(`^${fn}\\*${num}$`));
  if (m) return { valeur: parseFloat(m[3].replace(",", ".")), fonction: m[1], angle: parseFloat(m[2].replace(",", ".")), op: "*" };

  m = norm.match(new RegExp(`^${num}\\/${fn}$`));
  if (m) return { valeur: parseFloat(m[1].replace(",", ".")), fonction: m[2], angle: parseFloat(m[3].replace(",", ".")), op: "/" };

  return null;
}

function texExpressionTrig({ valeur, fonction, angle, op }) {
  const fnTex = `\\${fonction}(${angle}\\text{°})`;
  return op === "*" ? `${valeur} \\times ${fnTex}` : `${valeur} \\div ${fnTex}`;
}

// Vérifie que l'élève a écrit LE calcul attendu (bonne valeur, bonne
// fonction, bon angle, bon opérateur) — sans jamais le faire évaluer.
function verifierExpressionTrig(attendu, saisie) {
  const attenduTex = texExpressionTrig(attendu);
  const parse = parserExpressionTrig(saisie);
  if (!parse) return { ok: false, invalide: true, attendu: attenduTex };

  const ok = parse.valeur === attendu.valeur && parse.fonction === attendu.fonction &&
    parse.angle === attendu.angle && parse.op === attendu.op;

  return { ok, attendu: attenduTex, saisieLatex: texExpressionTrig(parse) };
}

// Analyse un calcul du type "acos(7/12)" (ou "arccos(7/12)", "cos^-1(7/12)")
// — jamais évalué : c'est la reconnaissance de la bonne fonction réciproque
// et de la bonne fraction qui est l'automatisme, pas l'angle en degrés
// (qui demanderait une calculatrice).
const INVERSE_LATEX = { acos: "\\cos^{-1}", asin: "\\sin^{-1}", atan: "\\tan^{-1}" };

function parserInverseTrig(saisie) {
  const norm = String(saisie).trim().toLowerCase().replace(/\s+/g, "")
    .replace(/°/g, "").replace(/cm/g, "")
    .replace(/arc(cos|sin|tan)/g, "a$1")
    .replace(/(cos|sin|tan)\^?-1/g, "a$1");

  const m = norm.match(/^(acos|asin|atan)\(?(\d+(?:[.,]\d+)?)\/(\d+(?:[.,]\d+)?)\)?$/);
  if (!m) return null;
  return { fonction: m[1], a: parseFloat(m[2].replace(",", ".")), b: parseFloat(m[3].replace(",", ".")) };
}

function texInverseTrig({ fonction, a, b }) {
  return `${INVERSE_LATEX[fonction]}\\left(\\dfrac{${a}}{${b}}\\right)`;
}

function verifierInverseTrig(attendu, saisie) {
  const attenduTex = texInverseTrig(attendu);
  const parse = parserInverseTrig(saisie);
  if (!parse) return { ok: false, invalide: true, attendu: attenduTex };

  const ok = parse.fonction === attendu.fonction && parse.a === attendu.a && parse.b === attendu.b;

  return { ok, attendu: attenduTex, saisieLatex: texInverseTrig(parse) };
}

const trigonometrie = [

  // ---------------------------------------------------
  // Cours : formules cos / sin / tan, appliquées à un triangle nommé
  // (jamais "adjacent"/"opposé" : le côté à trouver se désigne par ses
  // deux sommets, comme dans l'énoncé).
  // ---------------------------------------------------
  {
    id: "trigonometrie_vocabulaire",
    theme: "trigonometrie",
    niveau: "3",
    negatif: "non",
    cours: "oui",
    gen() {
      const [sommetDroit, s1, s2] = nomTriangle();
      const angleSommet = Math.random() < 0.5 ? s1 : s2;
      const autreSommet = angleSommet === s1 ? s2 : s1;
      const nomTri = [sommetDroit, s1, s2].join("");

      const adjacentName = cote(sommetDroit, angleSommet);
      const oppositeName = cote(sommetDroit, autreSommet);
      const hypName = cote(s1, s2);

      const rapports = ["cos", "sin", "tan"];
      const rapport = rapports[randInt(0, rapports.length - 1)];

      let nomFonction, numName, denName;
      if (rapport === "cos") { nomFonction = "\\cos"; numName = adjacentName; denName = hypName; }
      else if (rapport === "sin") { nomFonction = "\\sin"; numName = oppositeName; denName = hypName; }
      else { nomFonction = "\\tan"; numName = oppositeName; denName = adjacentName; }

      // Deux cas : soit tout le rapport est à trouver (fraction complète),
      // soit un seul côté manque (l'autre déjà donné dans l'énoncé).
      const rapportEntier = Math.random() < 0.5;

      if (rapportEntier) {
        const enonce = `
        \\text{Dans un triangle ${nomTri} rectangle en ${sommetDroit}, on a :}\\,\\,
        ${nomFonction}(\\widehat{${angleSommet}}) = \\dfrac{\\text{....}}{\\text{....}}
        `;

        return {
          latex: enonce,
          correction: enonce.replace("\\dfrac{\\text{....}}{\\text{....}}", `\\dfrac{${numName}}{${denName}}`),
          verifier(input) { return verifierRatioCotes(numName, denName, input); }
        };
      }

      const blancEstNum = rapport !== "tan";
      const reponseAttendue = blancEstNum ? numName : denName;
      const autresCotes = [oppositeName, adjacentName, hypName].filter(c => c !== reponseAttendue);
      const num = blancEstNum ? "...." : numName;
      const den = blancEstNum ? denName : "....";

      const enonce = `
      \\text{Dans un triangle ${nomTri} rectangle en ${sommetDroit}, on a :}\\,\\,
      ${nomFonction}(\\widehat{${angleSommet}}) = \\dfrac{${num}}{${den}}
      `;

      return {
        latex: enonce,
        correction: enonce.replace("....", reponseAttendue),
        verifier(input) {
          return reponse.verifier("texte", variantesCote(reponseAttendue), input, {
            mode: "in",
            presqueJuste: autresCotes.flatMap(variantesCote)
          });
        }
      };
    }
  },

  // ---------------------------------------------------
  // Calcul d'un rapport trigonométrique (fraction exacte, triplet pythagoricien)
  // ---------------------------------------------------
  {
    id: "trigonometrie_rapport",
    theme: "trigonometrie",
    niveau: "3",
    negatif: "non",
    gen() {
      const triplet = TRIPLETS[randInt(0, TRIPLETS.length - 1)];
      const k = randInt(1, 3);
      let [x, y, hyp] = triplet.map(v => v * k);
      if (Math.random() < 0.5) [x, y] = [y, x];

      const [sommetDroit, s1, s2] = nomTriangle();
      const angleSommet = Math.random() < 0.5 ? s1 : s2;
      const nomTri = [sommetDroit, s1, s2].join("");

      // côté attaché à s1 = x, côté attaché à s2 = y (longueurs depuis sommetDroit)
      const adjacent = angleSommet === s1 ? x : y;
      const oppose = angleSommet === s1 ? y : x;

      const rapports = ["cos", "sin", "tan"];
      const rapport = rapports[randInt(0, rapports.length - 1)];

      let num, den, nomFonction;
      if (rapport === "cos") { num = adjacent; den = hyp; nomFonction = "\\cos"; }
      else if (rapport === "sin") { num = oppose; den = hyp; nomFonction = "\\sin"; }
      else { num = oppose; den = adjacent; nomFonction = "\\tan"; }

      const valeur = Nombre.fromParts(num, den, "fraction").simplify();

      return {
        latex: `
        \\text{Un triangle ${nomTri} est rectangle en ${sommetDroit}.}\\\\
        \\text{On donne : }\\,\\,
        ${sommetDroit}${s1} = ${x}\\,\\text{cm} \\text{, }
        ${sommetDroit}${s2} = ${y}\\,\\text{cm} \\text{, }
        ${s1}${s2} = ${hyp}\\,\\text{cm}.\\\\
        \\text{Calculer } ${nomFonction}(\\widehat{${angleSommet}}).
        `,
        correction: `
        ${nomFonction}(\\widehat{${angleSommet}}) = \\dfrac{${num}}{${den}} = ${dfrac(valeur)}
        `,
        verifier(input) { return verifierScalaire(valeur, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Longueur manquante : on demande le CALCUL qui la donne (valeur ×/÷
  // fonction(angle)), jamais sa valeur décimale — trouver cette valeur
  // demanderait une calculatrice, hors de portée d'un automatisme.
  // ---------------------------------------------------
  {
    id: "trigonometrie_longueur",
    theme: "trigonometrie",
    niveau: "3",
    negatif: "non",
    gen() {
      const [sommetDroit, autreSommet, angleSommet] = nomTriangle();
      const nomTri = [sommetDroit, autreSommet, angleSommet].join("");

      const adjacentName = cote(sommetDroit, angleSommet);
      const oppositeName = cote(sommetDroit, autreSommet);
      const hypName = cote(autreSommet, angleSommet);

      const angleDeg = randInt(20, 70);
      const rapports = ["cos", "sin", "tan"];
      const rapport = rapports[randInt(0, rapports.length - 1)];
      const connuEstLePremier = Math.random() < 0.5;
      const op = connuEstLePremier ? "*" : "/";

      let connuName, chercheName, valeurConnue;

      if (rapport === "cos") {
        connuName = connuEstLePremier ? hypName : adjacentName;
        chercheName = connuEstLePremier ? adjacentName : hypName;
      } else if (rapport === "sin") {
        connuName = connuEstLePremier ? hypName : oppositeName;
        chercheName = connuEstLePremier ? oppositeName : hypName;
      } else {
        connuName = connuEstLePremier ? adjacentName : oppositeName;
        chercheName = connuEstLePremier ? oppositeName : adjacentName;
      }
      valeurConnue = connuEstLePremier ? randInt(6, 20) : randInt(5, 15);

      const attendu = { valeur: valeurConnue, fonction: rapport, angle: angleDeg, op };

      return {
        latex: `
        \\text{Un triangle ${nomTri} est rectangle en ${sommetDroit}. }\\\\
        \\text{On donne : } \\widehat{${angleSommet}} = ${angleDeg}\\text{° et }\\text{${connuName} = } ${valeurConnue}\\,\\text{cm.}\\\\
        \\text{Quel calcul donne } ${chercheName}\\text{ ?}
        `,
        correction: `
        ${chercheName} = ${texExpressionTrig(attendu)}
        `,
        verifier(input) { return verifierExpressionTrig(attendu, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Angle manquant : on demande l'ÉGALITÉ qui permet de le trouver
  // (fonction(angle) = fraction), jamais l'angle résolu — le résoudre
  // demanderait une calculatrice (cos⁻¹, sin⁻¹, tan⁻¹).
  // ---------------------------------------------------
  {
    id: "trigonometrie_angle",
    theme: "trigonometrie",
    niveau: "3",
    negatif: "non",
    gen() {
      const [sommetDroit, autreSommet, angleSommet] = nomTriangle();
      const nomTri = [sommetDroit, autreSommet, angleSommet].join("");

      const adjacentName = cote(sommetDroit, angleSommet);
      const oppositeName = cote(sommetDroit, autreSommet);
      const hypName = cote(autreSommet, angleSommet);

      const rapports = ["cos", "sin", "tan"];
      const rapport = rapports[randInt(0, rapports.length - 1)];

      let nomA, nomB, a, b;

      if (rapport === "cos") {
        nomA = adjacentName; nomB = hypName;
        a = randInt(5, 15); b = a + randInt(3, 20);
      } else if (rapport === "sin") {
        nomA = oppositeName; nomB = hypName;
        a = randInt(5, 15); b = a + randInt(3, 20);
      } else {
        nomA = oppositeName; nomB = adjacentName;
        a = randInt(5, 15); b = randInt(5, 15);
      }

      const attendu = { fonction: `a${rapport}`, a, b };

      return {
        latex: `
        \\text{Un triangle ${nomTri} est rectangle en ${sommetDroit}.}\\\\
        \\text{On donne :} \\, ${nomA} \\text{ = } ${a}\\,\\text{cm} \\text{ et } ${nomB} \\text{ = } ${b}\\,\\text{cm}.\\\\
        \\text{Quel calcul donne } \\widehat{${angleSommet}}\\text{ ? }
        `,
        correction: `
        \\widehat{${angleSommet}} = ${texInverseTrig(attendu)}
        `,
        verifier(input) { return verifierInverseTrig(attendu, input); }
      };
    }
  }

];

export default trigonometrie;
