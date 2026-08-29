// Arbre.js — génération d'un arbre de calcul déjà complet (jetons + opérations
// aux nœuds), que l'élève doit ÉVALUER pour trouver le résultat final. Cette
// application est l'inverse de compteEstBonSimple : là-bas l'élève CONSTRUIT
// un arbre pour atteindre une cible donnée ; ici l'arbre est donné et c'est
// le résultat qui est à trouver.
//
// Contrainte de génération (réglable, voir avecFraction dans
// construireArbreValeur) : par défaut, le résultat de CHAQUE nœud (donc en
// particulier le résultat final) doit avoir une écriture décimale exacte
// (Nombre.isDecimal()), puisque c'est la forme attendue de la réponse de
// l'élève. On retire tant qu'on n'a pas trouvé une combinaison
// jetons/opérations qui le garantit — sauf si avecFraction est activé, où
// une division peut légitimement laisser une fraction non décimale.

const OPS_ARBRE_CALCUL = ["+", "-", "*", ":"];
const MAGNITUDE_MAX = 1000000;

function randEntreArbre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function melangerArbre(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function genererJetonsMixteArbre(nbJetons, minMajo, maxMajo, minMino, maxMino) {
  const jetons = [];
  for (let i = 0; i < nbJetons - 1; i++) jetons.push(randEntreArbre(minMajo, maxMajo));
  jetons.push(randEntreArbre(minMino, maxMino));
  return melangerArbre(jetons);
}

// Jetons toujours strictement positifs (jamais 0) : évite les divisions par
// zéro et les multiplications triviales par 0.
const NIVEAUX_JETONS_ARBRE = {
  simple: {
    label: "1",
    genererJetons: (nbJetons) => Array.from({ length: nbJetons }, () => randEntreArbre(1, 10)),
  },
  moyen: {
    label: "2",
    genererJetons: (nbJetons) => genererJetonsMixteArbre(nbJetons, 1, 10, 10, 20),
  },
  complexe: {
    label: "3",
    genererJetons: (nbJetons) => genererJetonsMixteArbre(nbJetons, 10, 20, 1, 10),
  },
};

// Construit récursivement un arbre binaire sur jetons[debut..fin[, avec une
// coupure et un opérateur aléatoires à chaque nœud. Chaque nœud porte déjà sa
// valeur calculée (Nombre) : l'arbre généré est figé, jamais modifié ensuite.
// Renvoie null si une contrainte est violée (division par zéro, écriture
// décimale impossible quand avecFraction est faux, magnitude excessive, ou
// soustraction négative quand avecRelatifs est faux) — on retire alors une
// autre forme.
//
// avecRelatifs contrôle uniquement le signe : seule une soustraction peut
// rendre un nœud (ou le résultat final) négatif, les jetons et les autres
// opérations restant toujours positifs. Sans relatifs, chaque soustraction
// doit donc rester strictement positive, comme dans compteEstBonSimple.
//
// avecFraction contrôle si une division peut laisser un résultat qui n'a pas
// d'écriture décimale exacte (ex: 10÷3) — sans fraction, comme pour
// avecRelatifs, on retire une autre forme tant que ce n'est pas le cas.
function construireArbreValeur(jetons, debut, fin, avecRelatifs, avecFraction) {
  if (fin - debut === 1) {
    const idx = debut;
    return { type: "jeton", jetonIndex: idx, nombre: Nombre.fromParts(jetons[idx], 1, "entier") };
  }

  const coupure = debut + 1 + Math.floor(Math.random() * (fin - debut - 1));
  const gauche = construireArbreValeur(jetons, debut, coupure, avecRelatifs, avecFraction);
  if (!gauche) return null;
  const droite = construireArbreValeur(jetons, coupure, fin, avecRelatifs, avecFraction);
  if (!droite) return null;

  const op = OPS_ARBRE_CALCUL[Math.floor(Math.random() * OPS_ARBRE_CALCUL.length)];

  let nombre;
  switch (op) {
    case "+": nombre = gauche.nombre.add(droite.nombre); break;
    case "-":
      nombre = gauche.nombre.sub(droite.nombre);
      if (!avecRelatifs && nombre.valeurNum.a <= 0) return null;
      break;
    case "*": nombre = gauche.nombre.mul(droite.nombre); break;
    case ":":
      if (droite.nombre.valeurNum.a === 0) return null;
      nombre = gauche.nombre.div(droite.nombre);
      break;
  }

  if (!avecFraction && !nombre.isDecimal()) return null;
  const simplifie = nombre.simplify().valeurNum;
  if (Math.abs(simplifie.a) > MAGNITUDE_MAX || simplifie.b > MAGNITUDE_MAX) return null;

  return { type: "op", op, gauche, droite, nombre };
}

// Tire nbJetons jetons (selon niveauCle) et une forme d'arbre valide.
// Renvoie {jetons, arbre, cible} où cible est le Nombre résultat final.
function tirerArbreEtCible(nbJetons, niveauCle, avecRelatifs, avecFraction, essaisMax = 800) {
  const niveau = NIVEAUX_JETONS_ARBRE[niveauCle] || NIVEAUX_JETONS_ARBRE.simple;
  for (let essai = 0; essai < essaisMax; essai++) {
    const jetons = niveau.genererJetons(nbJetons);
    const arbre = construireArbreValeur(jetons, 0, jetons.length, avecRelatifs, avecFraction);
    if (arbre) return { jetons, arbre, cible: arbre.nombre };
  }
  return null;
}

window.NIVEAUX_JETONS_ARBRE = NIVEAUX_JETONS_ARBRE;
window.tirerArbreEtCible = tirerArbreEtCible;
