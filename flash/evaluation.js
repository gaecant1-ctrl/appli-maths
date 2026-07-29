// =====================================================
// ÉVALUATION — substituer des valeurs numériques dans une expression
// littérale et calculer le résultat.
// Port de appli-maths/evaluation/app.js (gabarits GABARITS_5E/4E_AJOUTS/
// 3E_AJOUTS + genererDepuisGabarit/choisirValeursSures) vers le format
// flash (gen()/verifier()). S'appuie sur calcul-mv.js, déjà porté dans
// flash (Monome/PolynomeMV/evaluerAvecControle/reduireConstantes...),
// exactement le même moteur que la source.
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";
import { evalMV, parseMV, reduireConstantes, evaluerAvecControle } from "./calcul-mv.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

const LETTRES_POSSIBLES = ["x", "y", "z", "a", "b", "n"];
const LETTRES_VARIABLES_FORCEES = ["e", "f"];
const LETTRES_NOMBRES_FORCES = ["g", "h"];

const ENTIER_BORNE_MAX = 6;

const COEFFICIENT_PROBA_REMARQUABLE = 0.5;
const COEFFICIENT_REMARQUABLES_ENTIER = [2, -2, 3, -3, 4, -4, 5, -5, 10, -10];
const COEFFICIENT_BORNE_MAX_ENTIER = 9;

// Type de nombre substitué toujours "entier" ici (comme le réglage par
// défaut de la source, typesNombresActifs = {"entier"}) : la source
// prend aussi en charge décimaux/fractions (tirerValeurDecimale/Fraction),
// mais ce n'est pas exposé par un panneau dans flash — on reste sur le
// comportement par défaut plutôt que d'improviser un dosage arbitraire.
function tirerValeur(nonNegatif = false) {
  if (nonNegatif) return randInt(1, ENTIER_BORNE_MAX);
  let n;
  do { n = randInt(-ENTIER_BORNE_MAX, ENTIER_BORNE_MAX); } while (n === 0);
  return n;
}

function tirerCoefficient() {
  const interdits = [0, 1, -1];
  let coeff = 0;
  while (interdits.includes(coeff)) {
    coeff = Math.random() < COEFFICIENT_PROBA_REMARQUABLE
      ? pick(COEFFICIENT_REMARQUABLES_ENTIER)
      : randInt(-COEFFICIENT_BORNE_MAX_ENTIER, COEFFICIENT_BORNE_MAX_ENTIER);
  }
  return coeff;
}

function extraireLettres(motif) {
  return [...new Set(motif.match(/[a-z]/g) || [])];
}

function choisirSousEnsemble(lettres, tailleMax) {
  const melange = [...lettres].sort(() => Math.random() - 0.5);
  const taille = randInt(1, Math.min(tailleMax, melange.length));
  return new Set(melange.slice(0, taille));
}

// Attribue un rôle (variable X, variable Y, ou nombre) à chaque lettre
// générique du gabarit, puis construit le texte concret — voir
// appli-maths/evaluation/app.js → genererDepuisGabarit() pour le détail
// de chaque règle (portée à l'identique).
function genererDepuisGabarit(motif, nbLettres) {
  const lettresTemplate = extraireLettres(motif);
  const forceesVariables = lettresTemplate.filter(l =>
    LETTRES_VARIABLES_FORCEES.includes(l) && l !== "e" && l !== "f"
  );
  const libres = lettresTemplate.filter(l =>
    !LETTRES_VARIABLES_FORCEES.includes(l) && !LETTRES_NOMBRES_FORCES.includes(l) && l !== "e" && l !== "f"
  );

  const sX = new Set(), sY = new Set();
  if (lettresTemplate.includes("e")) sX.add("e");
  if (lettresTemplate.includes("f") && nbLettres === 2) sY.add("f");

  const forceesMelangees = [...forceesVariables].sort(() => Math.random() - 0.5);
  if (nbLettres === 2 && forceesMelangees.length > 1) {
    const coupure = randInt(1, forceesMelangees.length - 1);
    forceesMelangees.slice(0, coupure).forEach(l => sX.add(l));
    forceesMelangees.slice(coupure).forEach(l => sY.add(l));
  } else {
    forceesMelangees.forEach(l => (nbLettres === 2 && Math.random() < 0.5 ? sY : sX).add(l));
  }

  if (libres.length > 0) {
    const sXLibres = choisirSousEnsemble(libres, Math.max(libres.length - 1, 1));
    sXLibres.forEach(l => sX.add(l));
    const resteApresX = libres.filter(l => !sXLibres.has(l));
    if (nbLettres === 2 && resteApresX.length > 0) {
      choisirSousEnsemble(resteApresX, resteApresX.length).forEach(l => sY.add(l));
    }
  }

  const dispo = [...LETTRES_POSSIBLES].sort(() => Math.random() - 0.5);
  const lettreX = dispo[0];
  const lettreY = nbLettres === 2 ? dispo[1] : null;

  let expr = motif;
  lettresTemplate.forEach(l => { expr = expr.split(l).join(`@@${l}@@`); });
  lettresTemplate.forEach(l => {
    let val;
    if (sX.has(l)) val = lettreX;
    else if (sY.has(l)) val = lettreY;
    else val = `(${tirerCoefficient()})`;
    expr = expr.split(`@@${l}@@`).join(val);
  });

  const lettresVariables = nbLettres === 2 ? [lettreX, lettreY] : [lettreX];
  return { expr, lettresVariables };
}

// Substitue chaque lettre par sa valeur puis confie le texte purement
// numérique à evalMV() : le PolynomeMV obtenu est nécessairement constant.
function polynomeDeReference(exprText, valeurs) {
  let texte = exprText;
  Object.entries(valeurs).forEach(([lettre, val]) => {
    texte = texte.replace(new RegExp(lettre, "g"), `(${val})`);
  });
  return evalMV(texte);
}

function compterLettresPresentes(poly, lettres) {
  const utilisees = new Set();
  poly.monomes.forEach(m => Object.keys(m.degres).forEach(l => utilisees.add(l)));
  return lettres.filter(l => utilisees.has(l)).length;
}

// Niveau 5e uniquement : évite qu'un produit de deux négatifs apparaisse
// dans le calcul que l'élève doit suivre (evaluerAvecControle, sur
// l'arbre réel) — retire jusqu'à 30 fois, puis se rabat sur des valeurs
// toutes positives (toujours sûr).
function choisirValeursSures(arbre, lettresVariables, exigerSansProduitNegatif) {
  for (let tentative = 0; tentative < 30; tentative++) {
    const valeurs = {};
    lettresVariables.forEach(l => { valeurs[l] = tirerValeur(); });
    if (!exigerSansProduitNegatif) return valeurs;
    const controle = evaluerAvecControle(arbre, valeurs);
    if (controle.ok) return valeurs;
  }
  const valeurs = {};
  lettresVariables.forEach(l => { valeurs[l] = tirerValeur(true); });
  return valeurs;
}

// Génère un exercice valide à partir d'un motif (retire en pratique quasi
// jamais) ; filet de sécurité ultime sinon.
function genererExercice(motif, exigerSansProduitNegatif) {
  for (let tentative = 0; tentative < 20; tentative++) {
    const nbLettres = pick([1, 2]);
    const { expr, lettresVariables } = genererDepuisGabarit(motif, nbLettres);

    const poly = evalMV(expr);
    if (!poly) continue;
    if (compterLettresPresentes(poly, lettresVariables) !== lettresVariables.length) continue;

    const arbre = parseMV(expr).arbre;
    const valeurs = choisirValeursSures(arbre, lettresVariables, exigerSansProduitNegatif);
    const resultatPoly = polynomeDeReference(expr, valeurs);
    if (!resultatPoly) continue;

    return { expr, arbre, valeurs, resultatPoly };
  }

  const lettre = pick(LETTRES_POSSIBLES);
  return {
    expr: `${lettre}+2`,
    arbre: parseMV(`${lettre}+2`).arbre,
    valeurs: { [lettre]: 3 },
    resultatPoly: evalMV("(3)+2")
  };
}

function resultatNombre(resultatPoly) {
  if (!resultatPoly || resultatPoly.monomes.length === 0) return Nombre.fromParts(0, 1, "entier");
  return resultatPoly.monomes[0].coeff;
}

// "a = 3" ou "a = 3 et b = -2"
function corpsValeurs(valeurs) {
  const lettres = Object.keys(valeurs);
  const morceaux = lettres.map(l => `${l} = ${new Nombre(String(valeurs[l])).toLatex()}`);
  return morceaux.length === 1
    ? morceaux[0]
    : `${morceaux.slice(0, -1).join(", ")} \\text{ et } ${morceaux[morceaux.length - 1]}`;
}

// "Calculer : a(a+1) , pour a = 1" — tout sur une seule ligne.
function texteQuestion(valeurs, enonceExpr) {
  return `\\text{Calculer :}\\, ${enonceExpr} \\,\\text{, pour } ${corpsValeurs(valeurs)}`;
}

// "Pour a = 1 , a(a+1) = 2"
function texteCorrection(valeurs, enonceExpr, resultatLatex) {
  return `\\text{Pour } ${corpsValeurs(valeurs)} \\, , \\, ${enonceExpr} = ${resultatLatex}`;
}

function exerciceEvaluation(motif, exigerSansProduitNegatif) {
  return () => {
    const { expr, arbre, valeurs, resultatPoly } = genererExercice(motif, exigerSansProduitNegatif);
    const enonce = reduireConstantes(arbre).toLatex();
    const resultat = resultatNombre(resultatPoly);
    const attendu = new Grandeur(resultat, {});

    return {
      latex: texteQuestion(valeurs, enonce),
      correction: texteCorrection(valeurs, enonce, resultat.toLatex()),
      verifier(input) { return reponse.verifier("grandeur", attendu, input); }
    };
  };
}

// ---------------------------------------------------
// Gabarits — cumulatifs par niveau, comme dans la source (5e < 4e < 3e).
// Le contrôle "pas de produit de deux négatifs" (choisirValeursSures) ne
// s'applique qu'aux gabarits 5e : à partir de la 4e, le produit de deux
// négatifs fait partie du programme.
// ---------------------------------------------------

const GABARITS_5E = ["ge+hf", "ee+hef+f", "-he+gf", "a(ge+hf)", "a(e+c)+f"];
const GABARITS_4E = ["gee+hef+f", "a(b+c)+d(ge+f)", "(ge+f)(he+f)"];
const GABARITS_3E = ["-ee+ef+f", "a(ge+f)+b(he+f)", "(ge+f)^2", "(ge-f)^2", "ggee - hhff"];

const evaluation = [
  ...GABARITS_5E.map((motif, i) => ({
    id: `evaluation_5e_${i + 1}`,
    theme: "evaluation",
    niveau: "5",
    negatif: "non",
    gen: exerciceEvaluation(motif, true)
  })),
  ...GABARITS_4E.map((motif, i) => ({
    id: `evaluation_4e_${i + 1}`,
    theme: "evaluation",
    niveau: "4",
    negatif: "non",
    gen: exerciceEvaluation(motif, false)
  })),
  ...GABARITS_3E.map((motif, i) => ({
    id: `evaluation_3e_${i + 1}`,
    theme: "evaluation",
    niveau: "3",
    negatif: "non",
    gen: exerciceEvaluation(motif, false)
  }))
];

export default evaluation;
