// ============================================================
// Pesee.js — génération d'un exercice "deux pesées" : deux égalités
// linéaires indépendantes en (a, b), à partir d'objets illustrés par des
// emoji (équivalent du \peseeExo du LaTeX de référence).
// a et b désignent les valeurs (entiers) des deux objets — une masse en
// grammes (thème "Masse"), ou un score sans unité (thème "Point").
// ============================================================

const FRUITS = [
  { id: 'orange', emoji: '🍊', nom: 'orange' },
  { id: 'pasteque', emoji: '🍉', nom: 'pastèque' },
  { id: 'pomme', emoji: '🍎', nom: 'pomme' },
  { id: 'banane', emoji: '🍌', nom: 'banane' },
  { id: 'raisin', emoji: '🍇', nom: 'grappe de raisin' },
  { id: 'cerise', emoji: '🍒', nom: 'cerise' },
  { id: 'ananas', emoji: '🍍', nom: 'ananas' },
  { id: 'fraise', emoji: '🍓', nom: 'fraise' },
];

// Banque du thème "Point" : objets de jeu vidéo, tous masculins (accord
// "un X" uniforme dans les textes, comme FRUITS utilise "une X" partout).
const JEUX = [
  { id: 'alien', emoji: '👾', nom: 'alien' },
  { id: 'joystick', emoji: '🎮', nom: 'joystick' },
  { id: 'trophee', emoji: '🏆', nom: 'trophée' },
  { id: 'diamant', emoji: '💎', nom: 'diamant' },
  { id: 'bonus', emoji: '⭐', nom: 'bonus' },
  { id: 'champignon', emoji: '🍄', nom: 'champignon' },
  { id: 'eclair', emoji: '⚡', nom: 'éclair' },
  { id: 'bouclier', emoji: '🛡️', nom: 'bouclier' },
];

/**
 * Deux thèmes habillant le même moteur de génération : seuls la banque
 * d'illustrations, l'unité et le vocabulaire changent — jamais le calcul
 * (voir genererPesee/construirePesee, identiques pour les deux).
 * "point" : sans unité (comparerAtomes/pretraiterMembre avec unite=null,
 * même mécanisme que le mode "sans unité" de l'appli algebre/).
 */
const THEMES = {
  masse: {
    id: 'masse',
    label: 'Masse',
    banque: FRUITS,
    unite: true,
    suffixeAffichage: '',
    nomExercice: (n) => `Pesée ${n}`,
    nomExerciceMin: 'pesée',
    titreConstruction: 'Construis ta pesée',
    libelleTotal: 'Masse totale',
    exempleValeur: '550g ou 500g+50g',
    article: 'une',
    articleUn: 'un',
    nomItemUnique: 'fruit',
    zonePhrase: 'sur le plateau',
    libelleTotalMin: 'masse',
    adjectifBon: 'bonne',
    verbeValoir: 'pèse',
    labelNouvelExercice: 'Nouvelle pesée (Entrée)',
    labelATrouver: 'Masses à trouver',
    btnCreer: 'Créer cette pesée',
    introTexte: (a, b) => `À partir des pesées ci-dessous, trouve la masse d'une ${a.emoji} <b>${a.nom}</b> ` +
      `et d'une ${b.emoji} <b>${b.nom}</b>.`,
    persoIntro: (a, b) => `Choisis la masse d'une ${a.emoji} ${a.nom} et d'une ${b.emoji} ${b.nom}, ` +
      `puis la composition des deux pesées.`,
    champValeurLabel: (f) => `Masse d'une ${f.emoji} ${f.nom} (en g)`,
    msgValeursPositives: 'Les deux masses doivent être strictement positives.',
  },
  point: {
    id: 'point',
    label: 'Point',
    banque: JEUX,
    unite: false,
    suffixeAffichage: ' pts',
    nomExercice: (n) => `Manche ${n}`,
    nomExerciceMin: 'manche',
    titreConstruction: 'Compose ta manche',
    libelleTotal: 'Score total',
    exempleValeur: '550 ou 500+50',
    article: 'un',
    articleUn: 'un',
    nomItemUnique: 'objet',
    zonePhrase: 'dans ta manche',
    libelleTotalMin: 'score',
    adjectifBon: 'bon',
    verbeValoir: 'vaut',
    labelNouvelExercice: 'Nouvelle manche (Entrée)',
    labelATrouver: 'Scores à trouver',
    btnCreer: 'Créer cette manche',
    introTexte: (a, b) => `À partir des manches ci-dessous, trouve le score d'un ${a.emoji} <b>${a.nom}</b> ` +
      `et d'un ${b.emoji} <b>${b.nom}</b>.`,
    persoIntro: (a, b) => `Choisis le score d'un ${a.emoji} ${a.nom} et d'un ${b.emoji} ${b.nom}, ` +
      `puis la composition des deux manches.`,
    champValeurLabel: (f) => `Score d'un ${f.emoji} ${f.nom} (en pts)`,
    msgValeursPositives: 'Les deux scores doivent être strictement positifs.',
  },
};

const NIVEAUX_PESEE = {
  tresfacile: { masseMin: 5, masseMax: 20, nMin: 1, nMax: 4 },
  facile: { masseMin: 10, masseMax: 60, nMin: 1, nMax: 4 },
  moyen: { masseMin: 20, masseMax: 150, nMin: 1, nMax: 6 },
  difficile: { masseMin: 30, masseMax: 400, nMin: 1, nMax: 9 },
};

function entierAleatoire(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Tire deux objets distincts au hasard dans une banque (FRUITS ou JEUX). */
function tirerFruits(banque = FRUITS) {
  const indices = [...Array(banque.length).keys()];
  const iA = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
  const iB = indices.splice(Math.floor(Math.random() * indices.length), 1)[0];
  return [banque[iA], banque[iB]];
}

/** Le système (n1a,n1b / n2a,n2b) a-t-il une solution (a,b) unique ? */
function determinantValide(n1a, n1b, n2a, n2b) {
  return (n1a * n2b - n1b * n2a) !== 0;
}

/**
 * Si une des deux pesées affiche un seul fruit en quantité 1 (ex: "a = 7g"),
 * elle donne directement la valeur de cette masse : ce n'est plus quelque
 * chose que l'élève doit "trouver", juste lire. Renvoie 'a', 'b', ou null.
 */
function detecterVariableDonnee({ n1a, n1b, n2a, n2b }) {
  const estDonneeA = (na, nb) => na === 1 && nb === 0;
  const estDonneeB = (na, nb) => na === 0 && nb === 1;
  if (estDonneeA(n1a, n1b) || estDonneeA(n2a, n2b)) return 'a';
  if (estDonneeB(n1a, n1b) || estDonneeB(n2a, n2b)) return 'b';
  return null;
}

/** Construit l'objet "pesée" complet (masses dérivées de a, b — jamais l'inverse). */
function construirePesee({ fruitA, fruitB, n1a, n1b, n2a, n2b, aGrammes, bGrammes }) {
  const mass1 = n1a * aGrammes + n1b * bGrammes;
  const mass2 = n2a * aGrammes + n2b * bGrammes;
  const donnee = detecterVariableDonnee({ n1a, n1b, n2a, n2b });
  return { fruitA, fruitB, n1a, n1b, mass1, n2a, n2b, mass2, aGrammes, bGrammes, donnee };
}

function genererPesee(niveauId = 'moyen', banque = FRUITS) {
  const niveau = NIVEAUX_PESEE[niveauId] || NIVEAUX_PESEE.moyen;

  let n1a, n1b, n2a, n2b;
  if (niveauId === 'tresfacile') {
    // Pesée 1 : un mélange normal des deux fruits (ex: 3a+2b=400g).
    // Pesée 2 : un seul fruit, en quantité 1 — elle donne directement la
    // valeur d'une des deux masses (ex: b=50g), pas besoin de combiner les
    // deux pesées : une simple substitution suffit.
    n1a = entierAleatoire(niveau.nMin, niveau.nMax);
    n1b = entierAleatoire(niveau.nMin, niveau.nMax);
    if (Math.random() < 0.5) { n2a = 1; n2b = 0; } else { n2a = 0; n2b = 1; }
  } else {
    do {
      n1a = entierAleatoire(niveau.nMin, niveau.nMax);
      n1b = entierAleatoire(niveau.nMin, niveau.nMax);
      n2a = entierAleatoire(niveau.nMin, niveau.nMax);
      n2b = entierAleatoire(niveau.nMin, niveau.nMax);
    } while (
      !determinantValide(n1a, n1b, n2a, n2b) ||
      (n1a === n2a && n1b === n2b)
    );
  }

  const aGrammes = entierAleatoire(niveau.masseMin, niveau.masseMax);
  const bGrammes = entierAleatoire(niveau.masseMin, niveau.masseMax);
  const [fruitA, fruitB] = tirerFruits(banque);

  return construirePesee({ fruitA, fruitB, n1a, n1b, n2a, n2b, aGrammes, bGrammes });
}
