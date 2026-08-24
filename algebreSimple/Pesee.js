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
    suffixeAffichage: '',
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
    champValeurLabel: (f) => `Score d'un ${f.emoji} ${f.nom}`,
    msgValeursPositives: 'Les deux scores doivent être strictement positifs.',
  },
};

// Le niveau règle la MÉTHODE nécessaire pour combiner les deux pesées, pas
// la taille des nombres : masses et coefficients restent dans les mêmes
// plages à tous les niveaux.
const MASSE_MIN = 10, MASSE_MAX = 200;
const N_MIN = 1, N_MAX = 9;
const FACTEUR_MIN = 2, FACTEUR_MAX = 3; // niveau "moyen" : multiplicateur d'une seule pesée
const PRODUIT_MAX = 18; // niveau "moyen" : plafond du coefficient obtenu par multiplication (base × facteur)
const NIVEAUX_PESEE = ['tresfacile', 'facile', 'moyen', 'difficile'];

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

/** true si x et y sont des entiers strictement positifs distincts avec l'un multiple exact de l'autre. */
function estMultipleExact(x, y) {
  if (x === y) return false;
  const [petit, grand] = x < y ? [x, y] : [y, x];
  return grand % petit === 0;
}

/**
 * Tire (n1a,n1b,n2a,n2b) pour un niveau donné, où le niveau fixe la MÉTHODE
 * requise pour combiner les deux pesées (indépendamment de la taille des
 * nombres, tirés dans les mêmes plages N_MIN..N_MAX à tous les niveaux) :
 *  - tresfacile : lecture directe — une pesée isole déjà a ou b (n=1, 0).
 *  - facile     : soustraction directe — même coefficient pour a (ou b)
 *                 dans les deux pesées, donc on soustrait sans rien
 *                 multiplier.
 *  - moyen      : il faut multiplier UNE seule pesée par un entier pour
 *                 aligner les coefficients d'une variable, puis soustraire.
 *  - difficile  : cas général — aucune variable n'a de coefficients égaux
 *                 ni multiples, il faut multiplier les DEUX pesées
 *                 (combinaison croisée).
 */
function tirerCoefficients(niveauId) {
  if (niveauId === 'tresfacile') {
    const n1a = entierAleatoire(N_MIN, N_MAX);
    const n1b = entierAleatoire(N_MIN, N_MAX);
    const [n2a, n2b] = Math.random() < 0.5 ? [1, 0] : [0, 1];
    return { n1a, n1b, n2a, n2b };
  }

  if (niveauId === 'facile') {
    let n1a, n1b, n2a, n2b;
    do {
      const surA = Math.random() < 0.5;
      const commun = entierAleatoire(N_MIN, N_MAX);
      const autre1 = entierAleatoire(N_MIN, N_MAX);
      const autre2 = entierAleatoire(N_MIN, N_MAX);
      if (surA) { n1a = commun; n2a = commun; n1b = autre1; n2b = autre2; }
      else { n1b = commun; n2b = commun; n1a = autre1; n2a = autre2; }
    } while (n1b === n2b && n1a === n2a); // pesées identiques : à retirer
    return { n1a, n1b, n2a, n2b };
  }

  if (niveauId === 'moyen') {
    let n1a, n1b, n2a, n2b, autre1, autre2;
    do {
      const surA = Math.random() < 0.5;
      const facteur = entierAleatoire(FACTEUR_MIN, FACTEUR_MAX);
      const base = entierAleatoire(N_MIN, Math.min(N_MAX, Math.floor(PRODUIT_MAX / facteur)));
      autre1 = entierAleatoire(N_MIN, N_MAX);
      autre2 = entierAleatoire(N_MIN, N_MAX);
      if (surA) { n1a = base; n2a = base * facteur; n1b = autre1; n2b = autre2; }
      else { n1b = base; n2b = base * facteur; n1a = autre1; n2a = autre2; }
    } while (
      !determinantValide(n1a, n1b, n2a, n2b) ||
      autre1 === autre2 // sinon l'autre variable serait, elle aussi, résoluble par simple soustraction (niveau "facile")
    );
    return { n1a, n1b, n2a, n2b };
  }

  // difficile : cas général, ni égalité ni multiple exact sur aucune variable.
  let n1a, n1b, n2a, n2b;
  do {
    n1a = entierAleatoire(N_MIN, N_MAX);
    n1b = entierAleatoire(N_MIN, N_MAX);
    n2a = entierAleatoire(N_MIN, N_MAX);
    n2b = entierAleatoire(N_MIN, N_MAX);
  } while (
    !determinantValide(n1a, n1b, n2a, n2b) ||
    n1a === n2a || n1b === n2b ||
    estMultipleExact(n1a, n2a) || estMultipleExact(n1b, n2b)
  );
  return { n1a, n1b, n2a, n2b };
}

function genererPesee(niveauId = 'moyen', banque = FRUITS) {
  if (!NIVEAUX_PESEE.includes(niveauId)) niveauId = 'moyen';

  const { n1a, n1b, n2a, n2b } = tirerCoefficients(niveauId);
  const aGrammes = entierAleatoire(MASSE_MIN, MASSE_MAX);
  const bGrammes = entierAleatoire(MASSE_MIN, MASSE_MAX);
  const [fruitA, fruitB] = tirerFruits(banque);

  return construirePesee({ fruitA, fruitB, n1a, n1b, n2a, n2b, aGrammes, bGrammes });
}
