import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";
import { verifierRacine } from "./verif-racine.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Extrait le plus grand facteur carré parfait : 45 → {coeff:3, radicande:5}
// (45 = 9×5, √45 = 3√5). Si n est déjà un carré parfait, radicande = 1.
function simplifierRacine(n) {
  let coeff = 1, radicande = n;
  for (let i = 2; i * i <= radicande; i++) {
    while (radicande % (i * i) === 0) {
      radicande /= (i * i);
      coeff *= i;
    }
  }
  return { coeff, radicande };
}

function texLongueurParCarre(n) {
  const { coeff, radicande } = simplifierRacine(n);
  if (radicande === 1) return `${coeff}`;
  return coeff === 1 ? `\\sqrt{${radicande}}` : `${coeff}\\sqrt{${radicande}}`;
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

// Deux formules équiprobables pour générer les CARRÉS des trois côtés
// (u=XY², v=XZ², w=YZ², toujours u+v=w) :
//   w = a² + b²         → u,v toujours carrés parfaits, w parfois pas
//   v = c² − a², c > a  → u,w toujours carrés parfaits, v parfois pas
// Le côté radical n'est donc pas systématiquement l'hypoténuse.
function genererTriangle() {
  if (Math.random() < 0.5) {
    const a = randInt(2, 13);
    const b = randInt(2, 13);
    return { u: a * a, v: b * b, w: a * a + b * b };
  }
  const a = randInt(2, 12);
  const c = randInt(a + 1, 13);
  return { u: a * a, v: c * c - a * a, w: c * c };
}

const pythagore = [

  // ---------------------------------------------------
  // Longueur inconnue : hypoténuse OU côté de l'angle droit — les trois
  // côtés (a,b,c) sont dérivés de (u,v,w) via texLongueurParCarre, puis
  // on choisit indépendamment lequel des deux est demandé.
  // ---------------------------------------------------
  {
    id: "pythagore_longueur",
    theme: "pythagore",
    niveau: "4",
    negatif: "non",
    gen() {
      const [X, Y, Z] = nomTriangle();
      const { u, v, w } = genererTriangle();
      const a = texLongueurParCarre(u);
      const b = texLongueurParCarre(v);
      const c = texLongueurParCarre(w);

      if (Math.random() < 0.5) {
        const { coeff, radicande } = simplifierRacine(w);

        return {
          latex: `
          \\text{Dans un triangle } ${X}${Y}${Z} \\text{ rectangle en } ${X}\\text{, on a :}\\\\
          ${X}${Y} = ${a}\\,\\text{cm} \\text{ et } ${X}${Z} = ${b}\\,\\text{cm}.\\,
          \\text{Calculer } ${Y}${Z}\\text{.}
          `,
          correction: `
          ${Y}${Z}^2 = ${X}${Y}^2 + ${X}${Z}^2 = ${u}\\,\\text{cm}^2 + ${v}\\,\\text{cm}^2 = ${w}\\,\\text{cm}^2\\\\
          ${Y}${Z} = ${c}\\,\\text{cm}
          `,
          verifier(input) { return verifierRacine(coeff, radicande, "\\text{cm}", "cm", input); }
        };
      }

      const { coeff, radicande } = simplifierRacine(v);
      return {
        latex: `
        \\text{Dans un triangle } ${X}${Y}${Z} \\text{ rectangle en } ${X}\\text{, on a :}\\\\
        ${X}${Y} = ${a}\\,\\text{cm} \\text{ et } ${Y}${Z} = ${c}\\,\\text{cm}.\\,
        \\text{Calculer } ${X}${Z}\\text{.}
        `,
        correction: `
        ${X}${Z}^2 = ${Y}${Z}^2 - ${X}${Y}^2 = ${w}\\,\\text{cm}^2 - ${u}\\,\\text{cm}^2 = ${v}\\,\\text{cm}^2\\\\
        ${X}${Z} = ${b}\\,\\text{cm}
        `,
        verifier(input) { return verifierRacine(coeff, radicande, "\\text{cm}", "cm", input); }
      };
    }
  },

  // ---------------------------------------------------
  // Réciproque : même principe (u,v,w = carrés des trois côtés). Pour le
  // cas "non rectangle", on modifie juste ±1 sur le côté a (via son carré
  // u), sans se compliquer avec l'inégalité triangulaire.
  // ---------------------------------------------------
  {
    id: "pythagore_est_rectangle",
    theme: "pythagore",
    niveau: "4",
    negatif: "non",
    gen() {
      const [X, Y, Z] = nomTriangle();
      let { u, v, w } = genererTriangle();

      if (Math.random() < 0.5) {
        const aActuel = Math.round(Math.sqrt(u));
        const nouveauA = aActuel + (Math.random() < 0.5 ? 1 : -1);
        u = nouveauA * nouveauA;
      }

      const a = texLongueurParCarre(u);
      const b = texLongueurParCarre(v);
      const c = texLongueurParCarre(w);
      const reponseTexte = (u + v === w) ? "oui" : "non";

      return {
        latex: `
        \\text{Le triangle } ${X}${Y}${Z} \\text{ est tel que :}\\\\
        ${X}${Y} = ${a}\\,\\text{cm}\\text{, } ${X}${Z} = ${b}\\,\\text{cm} \\text{ et } ${Y}${Z} = ${c}\\,\\text{cm}.\\,
        \\text{Ce triangle est-il rectangle ?}
        `,
        correction: `
        ${Y}${Z}^2 = ${w}\\,\\text{cm}^2 \\quad ${X}${Y}^2 + ${X}${Z}^2 = ${u}\\,\\text{cm}^2 + ${v}\\,\\text{cm}^2 = ${u + v}\\,\\text{cm}^2\\\\
        \\text{Donc le triangle ${reponseTexte === "oui" ? "est" : "n'est pas"} rectangle}
        `,
        verifier(input) { return reponse.verifier("texte", reponseTexte, input, { mode: "identique" }); }
      };
    }
  }

];

export default pythagore;
