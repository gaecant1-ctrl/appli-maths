// Jetons.js — génération de la cible et des jetons pour le compte-est-bon
// "simple" (jetons tirés au hasard, PAS dérivés d'une écriture en lettres —
// voir appli-maths/nombreMot/Mots.js pour la variante par les mots).
//
// Principe : on tire nbJetons nombres au hasard (selon le niveau choisi, voir
// NIVEAUX_JETONS ci-dessous), on construit une expression binaire aléatoire
// (forme d'arbre + opérateurs) qui les combine tous, et si chaque étape
// intermédiaire (et le résultat final) est un entier positif, la cible du
// jeu est ce résultat et les jetons sont ceux tirés. On retire tant qu'on
// n'a pas trouvé de combinaison valide.

const OPS_GENERATION = ["+", "-", "*", ":"];

function randEntre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function melanger(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Un seul jeton "minoritaire" (dans [minMino, maxMino]), les autres dans
// [minMajo, maxMajo] — ordre mélangé pour ne pas trahir sa position.
function genererJetonsMixte(nbJetons, minMajo, maxMajo, minMino, maxMino) {
  const jetons = [];
  for (let i = 0; i < nbJetons - 1; i++) jetons.push(randEntre(minMajo, maxMajo));
  jetons.push(randEntre(minMino, maxMino));
  return melanger(jetons);
}

// Trois niveaux de difficulté, selon la plage des jetons tirés.
const NIVEAUX_JETONS = {
  simple: {
    label: "1",
    genererJetons: (nbJetons) => Array.from({ length: nbJetons }, () => randEntre(0, 10)),
  },
  moyen: {
    label: "2",
    genererJetons: (nbJetons) => genererJetonsMixte(nbJetons, 1, 10, 10, 20),
  },
  complexe: {
    label: "3",
    genererJetons: (nbJetons) => genererJetonsMixte(nbJetons, 10, 20, 1, 10),
  },
};

// Applique op à deux entiers positifs ; renvoie null si le résultat ne
// respecte pas les contraintes du jeu (entier positif, division exacte).
function appliquerOp(a, op, b) {
  switch (op) {
    case "+": return a + b;
    case "-": {
      const r = a - b;
      return r > 0 ? r : null;
    }
    case "*": return a * b;
    case ":":
      return (b !== 0 && a % b === 0) ? a / b : null;
  }
}

// Construit récursivement une expression sur la tranche jetons[debut..fin[,
// avec une coupure aléatoire à chaque étape (forme d'arbre aléatoire) et un
// opérateur aléatoire à chaque noeud. Renvoie {valeur, expr} ou null si une
// contrainte (soustraction négative, division non exacte) est violée.
function construireExpressionAleatoire(jetons, debut, fin) {
  if (fin - debut === 1) {
    return { valeur: jetons[debut], expr: String(jetons[debut]) };
  }

  const coupure = debut + 1 + Math.floor(Math.random() * (fin - debut - 1));
  const gauche = construireExpressionAleatoire(jetons, debut, coupure);
  if (!gauche) return null;
  const droite = construireExpressionAleatoire(jetons, coupure, fin);
  if (!droite) return null;

  const op = OPS_GENERATION[Math.floor(Math.random() * OPS_GENERATION.length)];
  const valeur = appliquerOp(gauche.valeur, op, droite.valeur);
  if (valeur === null) return null;

  // On ne construit pas d'arbre canonique respectant les priorités
  // usuelles (×/÷ avant +/−) : chaque sous-expression à plus d'un jeton est
  // donc systématiquement parenthésée pour que le texte reste sans
  // ambiguïté, quitte à avoir des parenthèses parfois redondantes.
  const texteGauche = (coupure - debut > 1) ? `(${gauche.expr})` : gauche.expr;
  const texteDroite = (fin - coupure > 1) ? `(${droite.expr})` : droite.expr;
  return { valeur, expr: `${texteGauche}${op}${texteDroite}` };
}

// Tire nbJetons jetons (selon niveauCle, voir NIVEAUX_JETONS) et une
// expression valide qui les combine tous. essaisMax : nombre de tirages de
// jetons/formes d'arbre avant abandon.
function tirerJetonsEtCible(nbJetons, niveauCle, essaisMax = 500) {
  const niveau = NIVEAUX_JETONS[niveauCle] || NIVEAUX_JETONS.simple;
  for (let essai = 0; essai < essaisMax; essai++) {
    const jetons = niveau.genererJetons(nbJetons);
    const resultat = construireExpressionAleatoire(jetons, 0, jetons.length);
    if (resultat && resultat.valeur > 0) {
      return { n: resultat.valeur, jetons, expr: resultat.expr };
    }
  }
  return null;
}

window.NIVEAUX_JETONS = NIVEAUX_JETONS;
window.tirerJetonsEtCible = tirerJetonsEtCible;
