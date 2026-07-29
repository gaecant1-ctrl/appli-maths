// =====================================================
// THALÈS — configuration triangle (4e/3e)
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// I et O exclus (confusion avec 1 et 0), comme dans geometrieBase.js.
const LETTRES = "ABCDEFGHJKLMNPQRSTUVWXYZ".split("");

// 5 lettres distinctes tirées au hasard : sommet (A), point proche/loin sur
// chaque droite sécante (B/E et C/F) — jamais toujours A, B, C, E, F.
function nomThales() {
  const pool = [...LETTRES];
  const pick = () => pool.splice(randInt(0, pool.length - 1), 1)[0];
  return { sommet: pick(), b: pick(), e: pick(), c: pick(), f: pick() };
}

function verifierLongueurCm(valeurCm, input) {
  return reponse.verifier("grandeur", new Grandeur(new Nombre(String(valeurCm)), { cm: 1 }), input);
}

function inverser(nomCote) {
  return nomCote.split("").reverse().join("");
}

// Parse "AB/AE" (deux côtés, chacun 2 lettres) → { num, den } | null.
function parserRatioCotes(saisie) {
  const norm = String(saisie).trim().toUpperCase().replace(/\s+/g, "");
  const m = norm.match(/^([A-Z]{2})\/([A-Z]{2})$/);
  if (!m) return null;
  return { num: m[1], den: m[2] };
}

// Vérifie un rapport de deux côtés nommés (numérateur/dénominateur) — le
// rendu LaTeX de la saisie de l'élève est une vraie fraction (\dfrac),
// jamais du texte brut. Un segment n'est pas orienté (EB = BE) : chaque
// côté est accepté dans les deux ordres.
function verifierRatioCotes(numAttendu, denAttendu, saisie) {
  const attenduTex = `\\dfrac{${numAttendu}}{${denAttendu}}`;
  const parse = parserRatioCotes(saisie);
  if (!parse) return { ok: false, invalide: true, attendu: attenduTex };

  const egal = (a, b) => a === b || a === inverser(b);
  const ok = egal(parse.num, numAttendu) && egal(parse.den, denAttendu);

  return { ok, attendu: attenduTex, saisieLatex: `\\dfrac{${parse.num}}{${parse.den}}` };
}

const thales = [

  // ---------------------------------------------------
  // Cours : égalité des rapports dans la configuration de Thalès
  // ---------------------------------------------------
  {
    id: "thales_vocabulaire",
    theme: "thales",
    niveau: "4",
    negatif: "non",
    cours: "oui",
    gen() {
      const { sommet, b, e, c, f } = nomThales();

      // Trois rapports égaux (Thalès) : les deux "longueurs sur les
      // droites sécantes" (AB/AE, AC/AF) et celui des parallèles (BC/EF).
      // Le trou porte tantôt sur le rapport des parallèles, tantôt sur un
      // des deux autres — jamais toujours le même.
      const paires = [
        [`${sommet}${b}`, `${sommet}${e}`],
        [`${sommet}${c}`, `${sommet}${f}`],
        [`${b}${c}`, `${e}${f}`]
      ];
      const indexBlanc = randInt(0, paires.length - 1);
      const [numBlanc, denBlanc] = paires[indexBlanc];

      const chaineTrou = paires
        .map(([num, den], i) => i === indexBlanc ? "\\dfrac{\\text{....}}{\\text{....}}" : `\\dfrac{${num}}{${den}}`)
        .join(" = ");
      const chaineComplete = paires.map(([num, den]) => `\\dfrac{${num}}{${den}}`).join(" = ");

      return {
        latex: `
        \\text{(${b}${e}) et (${c}${f}) sont sécantes en ${sommet}, et (${b}${c})//(${e}${f}).}\\\\
        \\text{D'après le théorème de Thalès, on a  :}\\,
        ${chaineTrou}
        `,
        correction: `
        ${chaineComplete}
        `,
        verifier(input) { return verifierRatioCotes(numBlanc, denBlanc, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Calcul d'une longueur (configuration triangle, droites parallèles données)
  // A, B, E alignés dans cet ordre et A, C, F alignés dans cet ordre ;
  // (BC) parallèle à (EF).
  // ---------------------------------------------------
  {
    id: "thales_longueur",
    theme: "thales",
    niveau: "4",
    negatif: "non",
    gen() {
      const { sommet, b, e, c, f } = nomThales();
      const nomAB = `${sommet}${b}`, nomAE = `${sommet}${e}`;
      const nomAC = `${sommet}${c}`, nomAF = `${sommet}${f}`;
      const nomBC = `${b}${c}`, nomEF = `${e}${f}`;

      // Rapport p/q (p < q, non triviaux) appliqué de façon cohérente aux deux
      // côtés (AB,AE) et (AC,AF) — garantit un résultat entier, jamais un
      // arrondi (cohérent avec les exercices de géométrie exacte du même
      // niveau, ex: aires.js/perimetre.js).
      const p = randInt(2, 6);
      let q;
      do { q = randInt(2, 8); } while (q <= p);

      const u = randInt(1, 4);
      const v = randInt(2, 6);

      const AE = q * u;
      const AB = p * u;
      const AF = q * v;
      const AC = p * v;

      // Second couple (EF, BC) avec le même rapport, pour varier la question
      // posée (chercher AC via AF, ou BC via EF).
      const w = randInt(2, 7);
      const EF = q * w;
      const BC = p * w;

      const chercheBC = Math.random() < 0.5;

      const enonceBase = `
      \\text{(${b}${e}) et (${c}${f}) sont sécantes en ${sommet}, et (${b}${c})//(${e}${f}).}\\\\
      \\text{On donne : } ${nomAB} = ${AB}\\,\\text{cm}\\text{, } ${nomAE} = ${AE}\\,\\text{cm}\\text{, } ${nomAC} = ${AC}\\,\\text{cm}
      `;

      if (chercheBC) {
        return {
          latex: `
          ${enonceBase}\\text{, } ${nomEF} = ${EF}\\,\\text{cm}.\\\\
          \\text{Calculer } ${nomBC}.
          `,
          correction: `
          \\dfrac{${nomAB}}{${nomAE}} = \\dfrac{${nomBC}}{${nomEF}} \\Rightarrow ${nomBC} = \\dfrac{${nomAB} \\times ${nomEF}}{${nomAE}} = ${BC}\\,\\text{cm}
          `,
          verifier(input) { return verifierLongueurCm(BC, input); }
        };
      }

      return {
        latex: `
        ${enonceBase}.\\\\
        \\text{Calculer } ${nomAF}.
        `,
        correction: `
        \\dfrac{${nomAB}}{${nomAE}} = \\dfrac{${nomAC}}{${nomAF}} \\Rightarrow ${nomAF} = \\dfrac{${nomAC} \\times ${nomAE}}{${nomAB}} = ${AF}\\,\\text{cm}
        `,
        verifier(input) { return verifierLongueurCm(AF, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Réciproque du théorème de Thalès : (BC) et (EF) sont-elles parallèles ?
  // A, B, E alignés dans cet ordre et A, C, F alignés dans cet ordre.
  // ---------------------------------------------------
  {
    id: "thales_reciproque",
    theme: "thales",
    niveau: "3",
    negatif: "non",
    gen() {
      const { sommet, b, e, c, f } = nomThales();
      const nomAB = `${sommet}${b}`, nomAE = `${sommet}${e}`;
      const nomAC = `${sommet}${c}`, nomAF = `${sommet}${f}`;
      const nomBC = `${b}${c}`, nomEF = `${e}${f}`;

      const parallele = Math.random() < 0.5;

      let AB, AE, AC, AF;

      if (parallele) {
        const p = randInt(2, 6);
        let q;
        do { q = randInt(2, 8); } while (q <= p);
        const u = randInt(1, 4);
        const v = randInt(2, 6);
        AE = q * u; AB = p * u; AF = q * v; AC = p * v;
      } else {
        AE = randInt(6, 20);
        AB = randInt(2, AE - 1);
        AF = randInt(6, 20);
        AC = randInt(2, AF - 1);
        if (AB * AF === AC * AE) AC = AC === AF - 1 ? AC - 1 : AC + 1;
      }

      const produitGauche = AB * AF;
      const produitDroit = AC * AE;
      const sontParalleles = produitGauche === produitDroit;

      return {
        latex: `
        \\text{Les points ${sommet}, ${b}, ${e} et les points ${sommet}, ${c}, ${f} sont}\\,
        \\text{alignés dans cet ordre.}\\\\
        \\text{On donne : } ${nomAB} = ${AB}\\,\\text{cm}\\text{, } ${nomAE} = ${AE}\\,\\text{cm}\\text{, }
        ${nomAC} = ${AC}\\,\\text{cm}\\text{, } ${nomAF} = ${AF}\\,\\text{cm}.\\\\
        \\text{Les droites (${nomBC}) et (${nomEF}) sont-elles parallèles ?}
        `,
        correction: `
        ${nomAB} \\times ${nomAF} = ${AB} \\times ${AF} = ${produitGauche}
        \\quad\\text{et}\\quad
        ${nomAC} \\times ${nomAE} = ${AC} \\times ${AE} = ${produitDroit}\\\\
        \\text{Les produits sont ${sontParalleles ? "égaux" : "différents"}, donc (${nomBC}) et (${nomEF}) ${sontParalleles ? "sont" : "ne sont pas"} parallèles.}
        `,
        verifier(input) {
          const formes = sontParalleles ? ["oui", "parallèles"] : ["non", "pas parallèles", "non parallèles"];
          return reponse.verifier("texte", formes, input, { mode: "in" });
        }
      };
    }
  }

];

export default thales;
