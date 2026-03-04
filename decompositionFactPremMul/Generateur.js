function grandeurQCM(){

  const grandeursUnites = {
    "Longueur": ["m", "km", "cm", "mm", "dm"],
    "Aire": ["m^2", "km^2", "cm^2", "mm^2", "dm^2"],
    "Volume": ["m^3", "L", "dm^3", "cm^3", "mm^3"],
    "Masse": ["kg", "g", "mg", "t"],
    "Durée": ["s", "min", "h", "ms", "jour"],
    // "Température": ["K", "°C"],
    "Vitesse": ["m/s", "km/h"]
    // "Énergie": ["J", "kJ", "Wh", "cal"],
    // "Puissance": ["W", "kW"],
    // "Pression": ["Pa", "bar", "mmHg", "atm"]
  };


    
    const grandeurs = Object.keys(grandeursUnites);
    const grandeur = grandeurs[Math.floor(Math.random() * grandeurs.length)];
    const unitesCorrectes = grandeursUnites[grandeur];
    const uniteBonne = unitesCorrectes[Math.floor(Math.random() * unitesCorrectes.length)];

    // Exclure la grandeur correcte pour générer les mauvaises
    let autresGrandeurs = grandeurs.filter(g => g !== grandeur);
    let mauvaisesGrandeurs = [];
    while (mauvaisesGrandeurs.length < 3) {
      const mauvaise = autresGrandeurs[Math.floor(Math.random() *autresGrandeurs.length)];
      if (
        !mauvaisesGrandeurs.includes(mauvaise) &&
        !grandeursUnites[mauvaise].includes(uniteBonne)
      ) {
        mauvaisesGrandeurs.push(mauvaise);
      }
    }

    // Mélanger la bonne réponse parmi les mauvaises
    const propositions = [...mauvaisesGrandeurs];
    const indexBonne = Math.floor(Math.random() * 4);
    propositions.splice(indexBonne, 0, grandeur);

    const questionData = {
      question: `Quelle grandeur est mesurée <br> dans l'unité <b>\\(${uniteBonne}\\)</b> ?`,
      choix: propositions,
      indexBonneReponse: indexBonne,
      bonneReponse: grandeur,
      unite: uniteBonne,
      type : "Grandeur QCM"
    };
    return questionData;

}


function droiteQCM() {
  // Générer trois lettres distinctes
  const lettres = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  for (let i = lettres.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [lettres[i], lettres[j]] = [lettres[j], lettres[i]];
  }
  const [A, B, C] = lettres.slice(0, 3);

  // Liste des types de questions
  const types = [
    {
      question: `Dans un triangle ${A}${B}${C}, comment appelle-t-on la droite perpendiculaire à (${A}${B}) passant par ${C} ?`,
      choix: [
        `la médiane issue de ${C}`,
        `la hauteur issue de ${C}`,
        `la médiatrice de [${B}${C}]`
      ],
      indexBonneReponse: 1
    },
    {
      question: `Dans un triangle ${A}${B}${C}, comment appelle-t-on la droite passant par ${C} et coupant [${A}${B}] en son milieu ?`,
      choix: [
        `la médiane issue de ${C}`,
        `la hauteur issue de ${C}`,
        `la médiatrice de [${B}${C}]`
      ],
      indexBonneReponse: 0
    },
    {
      question: `Dans un triangle ${A}${B}${C}, comment appelle-t-on la droite perpendiculaire à [${B}${C}] passant par son milieu ?`,
      choix: [
        `la médiane issue de ${C}`,
        `la hauteur issue de ${C}`,
        `la médiatrice de [${B}${C}]`
      ],
      indexBonneReponse: 2
    }
  ];

  // Choisir un type de question aléatoirement
  const idxType = Math.floor(Math.random() * types.length);
  const base = types[idxType];

  // Mélanger les choix et retrouver le nouvel index de la bonne réponse
  const indices = [0, 1, 2];
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  const choixMelanges = indices.map(i => base.choix[i]);
  const nouvelIndexBonneReponse = indices.indexOf(base.indexBonneReponse);

  return {
    question: base.question,
    choix: choixMelanges,
    indexBonneReponse: nouvelIndexBonneReponse,
    type : "Droites remarquables QCM"
  };
}

function polygoneNameQCM() {
  // Dictionnaire des polygones et leur nombre de côtés
  const polygones = {
    "triangle": 3,
    "quadrilatère": 4,
    "pentagone": 5,
    "hexagone": 6,
    "heptagone": 7,
    "octogone": 8,
    "nonagone": 9,
    "décagone": 10,
    "dodécagone": 12
  };

  const noms = Object.keys(polygones);
  const nombres = Object.values(polygones);

  // Choix du type de question (1/2 chance)
  const inverse = Math.random() < 0.5;

  if (!inverse) {
    // Type classique : "Un ... a combien de côtés ?"
    const polygoneChoisi = noms[Math.floor(Math.random() * noms.length)];
    const bonneReponse = polygones[polygoneChoisi];

    // Distracteurs
    const distracteurs = nombres.filter(n => n !== bonneReponse);
    for (let i = distracteurs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [distracteurs[i], distracteurs[j]] = [distracteurs[j], distracteurs[i]];
    }
    const selectedDistractors = distracteurs.slice(0, 3);

    // Mélange des choix
    const rawChoices = [...selectedDistractors, bonneReponse];
    for (let i = rawChoices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rawChoices[i], rawChoices[j]] = [rawChoices[j], rawChoices[i]];
    }
    const indexBonneReponse = rawChoices.indexOf(bonneReponse);

    return {
      question: `Un ${polygoneChoisi} a combien de côtés ?`,
      choix: rawChoices,
      indexBonneReponse: indexBonneReponse,
      type : "Polygones QCM"
    };
  } else {
    // Type inverse : "Un polygone à ... côtés s'appelle ?"
    const nombreChoisi = nombres[Math.floor(Math.random() * nombres.length)];
    const bonneReponse = noms[nombres.indexOf(nombreChoisi)];

    // Distracteurs
    const distracteurs = noms.filter(nom => nom !== bonneReponse);
    for (let i = distracteurs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [distracteurs[i], distracteurs[j]] = [distracteurs[j], distracteurs[i]];
    }
    const selectedDistractors = distracteurs.slice(0, 3);

    // Mélange des choix
    const rawChoices = [...selectedDistractors, bonneReponse];
    for (let i = rawChoices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rawChoices[i], rawChoices[j]] = [rawChoices[j], rawChoices[i]];
    }
    const indexBonneReponse = rawChoices.indexOf(bonneReponse);

    return {
      question: `Un polygone à ${nombreChoisi} côtés s'appelle ?`,
      choix: rawChoices,
      indexBonneReponse: indexBonneReponse,
      type : "Polygones QCM"
    };
  }
}

function echelleQCM() {
  const valeurs = [2, 3, 4, 10];
  const n = valeurs[Math.floor(Math.random() * valeurs.length)];

  // Définition des types et de la logique de réponse
  const types = [
    {
      label: "longueur",
      pluriel: "les longueurs",
      bonneReponse: n
    },
    {
      label: "aire",
      pluriel: "les aires",
      bonneReponse: n ** 2
    },
    {
      label: "volume",
      pluriel: "les volumes",
      bonneReponse: n ** 3
    },
    {
      label: "angle",
      pluriel: "les angles",
      bonneReponse: 1
    }
  ];

  // Sélection aléatoire du type de grandeur
  const type = types[Math.floor(Math.random() * types.length)];

  // Génération des choix selon le type, en évitant les doublons
  let choixSet;
  if (type.label === "angle") {
    // Pour les angles, seule la réponse 1 est correcte, on complète avec des valeurs fausses
    choixSet = new Set([1, n, n ** 2, n ** 3]);
  } else {
    choixSet = new Set([n, 2 * n, n ** 2, n ** 3]);
  }
  // Convertir en tableau
  let choix = Array.from(choixSet);

  // Si on a moins de 4 choix (cas où il y a eu des doublons), on complète avec des distracteurs supplémentaires
  // Pour éviter d'avoir la bonne réponse deux fois, on cherche dans un intervalle large
  while (choix.length < 4) {
    let distracteur = Math.floor(Math.random() * 20) + 2; // évite 0 et 1
    if (!choix.includes(distracteur)) {
      choix.push(distracteur);
    }
  }

  // Mélange aléatoire des choix
  for (let i = choix.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choix[i], choix[j]] = [choix[j], choix[i]];
  }

  // Index de la bonne réponse
  const indexBonneReponse = choix.indexOf(type.bonneReponse);

  return {
    question: `À l'échelle ${n}, ${type.pluriel} sont multipliées par :`,
    choix: choix,
    indexBonneReponse: indexBonneReponse,
    type : "Echelle QCM"
  };
}


function proportionQCM() {
  // Générer n et m
  const n = Math.floor(Math.random() * 21) + 5; // 5 à 25
  const m = Math.floor(Math.random() * 21) + 5; // 5 à 25
  const total = n + m;

  // Choisir au hasard le sujet de la question
  const sujet = Math.random() < 0.5 ? "filles" : "garçons";
  const cible = sujet === "filles" ? n : m;

  // Calcul du pourcentage arrondi à 1%
  const pourcent = Math.round((cible / total) * 100);

  // Générer une réponse proche (+/-1 à 5%)
  let proche;
  let deltaProche = Math.floor(Math.random() * 2) + 1; // 1 ou 2
  if (pourcent === 100) {
    proche = pourcent - deltaProche;
  } else if (pourcent === 0) {
    proche = pourcent + deltaProche;
  } else {
    proche = Math.random() < 0.5 ? pourcent - deltaProche : pourcent + deltaProche;
  }
  proche = Math.max(0, Math.min(100, proche));

  // Générer une réponse éloignée (+/-10 à 25%)
  let deltaEloigne = Math.floor(Math.random() * 16) + 10; // 10 à 25
  let eloignee;
  if (pourcent + deltaEloigne <= 100 && pourcent - deltaEloigne >= 0) {
    eloignee = Math.random() < 0.5 ? pourcent + deltaEloigne : pourcent - deltaEloigne;
  } else if (pourcent + deltaEloigne <= 100) {
    eloignee = pourcent + deltaEloigne;
  } else {
    eloignee = pourcent - deltaEloigne;
  }
  eloignee = Math.max(0, Math.min(100, eloignee));

  // Générer un distracteur proche de l'éloigné (+/-1 à 5%)
  let deltaAutourEloigne = Math.floor(Math.random() * 5) + 1; // 1 à 3
  let autourEloigne;
  if (eloignee + deltaAutourEloigne <= 100 && eloignee - deltaAutourEloigne >= 0) {
    autourEloigne = Math.random() < 0.5 ? eloignee + deltaAutourEloigne : eloignee - deltaAutourEloigne;
  } else if (eloignee + deltaAutourEloigne <= 100) {
    autourEloigne = eloignee + deltaAutourEloigne;
  } else {
    autourEloigne = eloignee - deltaAutourEloigne;
  }
  autourEloigne = Math.max(0, Math.min(100, autourEloigne));

  // S'assurer qu'il n'y a pas de doublons
  let choixSet = new Set([pourcent, proche, eloignee, autourEloigne]);
  let choix = Array.from(choixSet);
  while (choix.length < 4) {
    let rand = Math.floor(Math.random() * 101);
    if (!choix.includes(rand)) choix.push(rand);
  }

  // Mélanger les choix
  for (let i = choix.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choix[i], choix[j]] = [choix[j], choix[i]];
  }

  // Index de la bonne réponse
  const indexBonneReponse = choix.indexOf(pourcent);

  return {
    question: `Dans une classe il y a ${n} filles et ${m} garçons. Quel est le pourcentage de ${sujet} à 1% près ?`,
    choix: choix.map(val => `${val} %`),
    indexBonneReponse: indexBonneReponse,
    type : "Proportion QCM"
  };
}


function dureeQCM() {
  // Générer n (entre 0.1 et 6.0, un chiffre après la virgule, parfois un entier)
  let n;
  if (Math.random() < 0.3) {
    n = Math.floor(Math.random() * 6) + 1; // entier 1 à 6
  } else {
    n = Math.round((Math.random() * 5.9 + 0.1) * 10) / 10; // décimal 0.1 à 6.0
    if (Number.isInteger(n)) n += 0.1; // éviter entier exact ici
  }

  const heures = Math.floor(n);
  const minutes = Math.round((n - heures) * 60);
  const totalMinutes = Math.round(n * 60);

  // Formatters
  function formatHM(h, m) {
    if (m < 0) m = 0;
    if (m > 59) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }

  function formatErreurClassique(n) {
    const h = Math.floor(n);
    let m = Math.round((n - h) * 100);
    if (m >= 60) m = 59;
    if (h === 0) return `${m} min`;
    if (m === 0) return `${h} h`;
    return `${h} h ${m} min`;
  }

  // Pour comparer deux formats, convertir en minutes
  function toMinutes(str) {
    let m = 0;
    let match = str.match(/(\d+)\s*h\s*(\d+)?\s*min/);
    if (match) {
      m += parseInt(match[1]) * 60;
      if (match[2]) m += parseInt(match[2]);
      return m;
    }
    match = str.match(/(\d+)\s*h/);
    if (match) return parseInt(match[1]) * 60;
    match = str.match(/(\d+)\s*min/);
    if (match) return parseInt(match[1]);
    return NaN;
  }

  // Pour vérifier unicité réelle (pas de 3h/180min)
  function isEquivalent(val, arr) {
    let min = toMinutes(val);
    return arr.some(x => toMinutes(x) === min);
  }

  // Générer la bonne réponse
  let bonneReponse;
  let formatEnMinutes = false;

  if (Number.isInteger(n)) {
    bonneReponse = `${totalMinutes} min`;
    formatEnMinutes = true;
  } else {
    if (Math.random() < 0.2) {
      bonneReponse = `${totalMinutes} min`;
      formatEnMinutes = true;
    } else {
      bonneReponse = formatHM(heures, minutes);
    }
  }

  // Distracteur classique "erreur"
  let erreurClassique = formatErreurClassique(n);

  // Distracteur proche
  let proche;
  if (formatEnMinutes) {
    let procheMin = totalMinutes + (Math.random() < 0.5 ? -5 : 5);
    procheMin = Math.max(1, procheMin);
    proche = `${procheMin} min`;
  } else {
    let minProche = minutes + (Math.random() < 0.5 ? -5 : 5);
    if (minProche < 0) minProche = minutes + 5;
    if (minProche > 59) minProche = minutes - 5;
    proche = formatHM(heures, minProche);
  }

  // Distracteur éloigné
  let eloigne;
  if (formatEnMinutes) {
    let eloigneMin = totalMinutes + (Math.random() < 0.5 ? -40 : 40);
    eloigneMin = Math.max(1, eloigneMin);
    eloigne = `${eloigneMin} min`;
  } else {
    let minEloigne = minutes + (Math.random() < 0.5 ? -40 : 40);
    let hEloigne = heures;
    if (minEloigne < 0) {
      hEloigne = Math.max(0, heures - 1);
      minEloigne = 60 + minEloigne;
    }
    if (minEloigne > 59) {
      hEloigne = heures + 1;
      minEloigne = minEloigne - 60;
    }
    eloigne = formatHM(hEloigne, minEloigne);
  }

  // Construire la liste des choix en évitant les équivalents
  let choix = [bonneReponse];
  let minutesChoix = new Set([toMinutes(bonneReponse)]);
  function ajouterDistracteur(val) {
    let min = toMinutes(val);
    if (!minutesChoix.has(min)) {
      choix.push(val);
      minutesChoix.add(min);
      return true;
    }
    return false;
  }
  ajouterDistracteur(proche);
  ajouterDistracteur(erreurClassique);
  ajouterDistracteur(eloigne);

  // Compléter avec des distracteurs aléatoires si besoin
  let essais = 0;
  while (choix.length < 4 && essais < 20) {
    essais++;
    let randMin = Math.floor(Math.random() * 60) + 1;
    let randH = Math.floor(Math.random() * 6);
    let distracteur = formatEnMinutes
      ? `${Math.floor(Math.random() * 360) + 1} min`
      : randH > 0 ? `${randH} h ${randMin} min` : `${randMin} min`;
    ajouterDistracteur(distracteur);
  }

  // Mélanger
  for (let i = choix.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choix[i], choix[j]] = [choix[j], choix[i]];
  }

  return {
    question: `Quelle durée est égale à ${n} h ?`,
    choix: choix,
    indexBonneReponse: choix.indexOf(bonneReponse),
    type : "Durée QCM"
  };
}

function echelleMasseQCM() {
  // Générer n (masse initiale) et k (échelle)
  const n = Math.floor(Math.random() * 900) + 100; // 100 à 999 g
  const kList = [2, 3, 4, 5,10];
  const k = kList[Math.floor(Math.random() * kList.length)];

  // Masse agrandie
  const masse = n * Math.pow(k, 3);

  // Bonne réponse (arrondie si besoin)
  const bonneReponse = Math.round(masse * 100) / 100 + " g";

  // Distracteur proche (+/- 10%)
  let procheVal = masse * (Math.random() < 0.5 ? 0.9 : 1.1);
  procheVal = Math.round(procheVal) + " g";

  // Distracteur "classique" : erreur d'exposant (k² au lieu de k³)
  let classiqueVal = n * k;
  classiqueVal = Math.round(classiqueVal) + " g";

  // Distracteur éloigné (+/- 30 à 50%)
  let eloigneVal = masse * (Math.random() < 0.5 ? 0.7 : 1.5);
  eloigneVal = Math.round(eloigneVal) + " g";

  // S'assurer de l'unicité des choix
  let choixSet = new Set([bonneReponse, procheVal, classiqueVal, eloigneVal]);
  let essais = 0;
  while (choixSet.size < 4 && essais < 10) {
    essais++;
    let rand = Math.round((masse * (Math.random() * 1.5 + 0.5)) * 100) / 100 + " g";
    choixSet.add(rand);
  }

  // Mélanger les choix
  let choix = Array.from(choixSet);
  for (let i = choix.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choix[i], choix[j]] = [choix[j], choix[i]];
  }

  return {
    question: `Un cube pèse ${n} g. Quelle est la masse de son agrandissement à l'échelle ${k} ?`,
    choix: choix,
    indexBonneReponse: choix.indexOf(bonneReponse),
    type : "Echelle et masse QCM"
  };
}

function vocabulaireOperationQCM() {
  // Dictionnaire des opérations
  const dico = [
    { operation: "addition", resultat: "somme" },
    { operation: "soustraction", resultat: "différence" },
    { operation: "multiplication", resultat: "produit" },
    { operation: "division", resultat: "quotient" }
  ];

  // Choisir une opération au hasard
  const op = dico[Math.floor(Math.random() * dico.length)];

  // Choisir le type de question au hasard
  const surOperation = Math.random() < 0.5;

  let question, bonneReponse, distracteurs;
  if (surOperation) {
    question = `On appelle ${op.resultat} le résultat d'une :`;
    bonneReponse = op.operation;
    distracteurs = dico.filter(x => x.operation !== op.operation).map(x => x.operation);
  } else {
    question = `Le résultat d'une "${op.operation}" est appelé :`;
    bonneReponse = op.resultat;
    distracteurs = dico.filter(x => x.resultat !== op.resultat).map(x => x.resultat);
  }

  // Mélanger les distracteurs et en prendre 3
  for (let i = distracteurs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [distracteurs[i], distracteurs[j]] = [distracteurs[j], distracteurs[i]];
  }
  distracteurs = distracteurs.slice(0, 3);

  // Mélanger la bonne réponse parmi les choix
  let choix = [bonneReponse, ...distracteurs];
  for (let i = choix.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [choix[i], choix[j]] = [choix[j], choix[i]];
  }
  const indexBonneReponse = choix.indexOf(bonneReponse);

  return {
    question: question,
    choix: choix,
    indexBonneReponse: indexBonneReponse,
    type: "Opérations et vocabulaire QCM"
  };
}


function diviseurFullQCM() {
  // Choix fixes
  const choix = [2, 3, 4, 5, 6, 9, 10];

  // Générer un n aléatoire entre 20 et 200 (pour avoir des diviseurs variés)
  let n;
  let bonnesReponses;
  do {
    n = Math.floor(Math.random() * 181) + 20; // 20 à 200
    // Trouver les indices des bons diviseurs
    bonnesReponses = choix
      .map((val, idx) => n % val === 0 ? idx : -1)
      .filter(idx => idx !== -1);
  } while (bonnesReponses.length < 2 || bonnesReponses.length > 5); // Pour éviter les cas trop triviaux

  return {
    question: `Parmi ces nombres, quels sont ceux qui divisent ${n} ?`,
    choix: choix.map(String),
    bonnesReponses: bonnesReponses,
    type : "Diviseurs FullQCM"
  };
}


function randomFactors(pool, k) {
  // On répète les premiers indices pour augmenter leur probabilité
  const weighted = [];
  for (let i = 0; i < pool.length; i++) {
    for (let j = 0; j < pool.length - i; j++) { // plus l'index est petit, plus il y a de répétitions
      weighted.push(pool[i]);
    }
  }
  let res = [];
  for (let i = 0; i < k; i++) {
    res.push(weighted[Math.floor(Math.random() * weighted.length)]);
  }
  return res;
}


function decompositionPremiersFromList(factors) {
  let decomp = {};
  for (let f of factors) {
    decomp[f] = (decomp[f] || 0) + 1;
  }
  return decomp;
}

function formatDecompositionLatex(obj) {
  return Object.entries(obj)
    .map(([p, e]) => e > 1 ? `${p}^{${e}}` : `${p}`)
    .join(' \\times ');
}

// Génère tous les produits de deux facteurs parmi la liste (répétition autorisée)
function vraisDiviseursFromList(factors, n) {
  let divs = new Set();
  // Produits de deux facteurs (indices différents)
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      let prod2 = factors[i] * factors[j];
      if (prod2 !== n && n % prod2 === 0) divs.add(prod2);
    }
  }
  // Produits de trois facteurs (indices tous différents, tous < 7)
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      for (let k = j + 1; k < factors.length; k++) {
        const f1 = factors[i], f2 = factors[j], f3 = factors[k];
        if (f1 < 7 && f2 < 7 && f3 < 7) {
          let prod3 = f1 * f2 * f3;
          if (prod3 !== n && n % prod3 === 0) divs.add(prod3);
        }
      }
    }
  }
  return Array.from(divs);
}



// Génère des distracteurs qui ne sont pas dans la liste des bons diviseurs
function distracteurs(decomp, n, combien, exclus) {
  const facteurs = Object.keys(decomp).map(Number);
  const petitsPremiers = [2, 3, 5, 7, 11, 13];
  let dist = new Set();
  while (dist.size < combien) {
    let a = petitsPremiers[Math.floor(Math.random() * petitsPremiers.length)];
    let b = petitsPremiers[Math.floor(Math.random() * petitsPremiers.length)];
    if (a === b) continue;
    let prod = a * b;
    // au plus un facteur dans decomp, prod < n, et ce n'est pas déjà un vrai diviseur
    let inCount = (facteurs.includes(a) ? 1 : 0) + (facteurs.includes(b) ? 1 : 0);
    if (prod >= n || inCount > 1 || exclus.has(prod)) continue;
    dist.add(prod);
  }
  return Array.from(dist);
}

function diviseurDecFullQCM() {
  const pool = [2, 3, 5, 7, 11, 13];
  let n, decomp, factors, divs, vrais, dist, choix, bonnesReponses;
  let essais = 0;
  while (true) {
    essais++;
    if (essais > 50) throw new Error("Impossible de générer un QCM correct après 50 essais.");
    const nbFacteurs = Math.floor(Math.random() * 2) + 4; // 3 , 4 ou 5
    factors = randomFactors(pool, nbFacteurs);
    n = factors.reduce((a, b) => a * b, 1);
    decomp = decompositionPremiersFromList(factors);

    divs = vraisDiviseursFromList(factors, n);
    // On retire les doublons et n lui-même, et on ne garde que les diviseurs strictement inférieurs à n
    divs = Array.from(new Set(divs)).filter(x => x < n);
    if (divs.length >= 2) break;
  }

  // Sélectionne jusqu'à 3 vrais diviseurs
  let nbDiv = Math.min(3, divs.length);
  vrais = [];
  let tempDivs = divs.slice();
  for (let i = 0; i < nbDiv; i++) {
    let idx = Math.floor(Math.random() * tempDivs.length);
    vrais.push(tempDivs[idx]);
    tempDivs.splice(idx, 1);
  }

  // Ajoute des distracteurs pour avoir 6 choix au total, en évitant toute collision
  let exclus = new Set(vrais);
  dist = distracteurs(decomp, n, 6 - nbDiv, exclus);

  choix = vrais.concat(dist);
  // Mélange
  choix = choix.sort(() => Math.random() - 0.5);
  // Indices des bonnes réponses
  bonnesReponses = choix.map((x, i) => vrais.includes(x) ? i : -1).filter(i => i !== -1);

  return {
    question: `\\(${n}= ${formatDecompositionLatex(decomp)}\\)<br> Parmi ces nombres, lesquels divisent ${n} ?`,
    choix: choix,
    bonnesReponses: bonnesReponses,
    type: "Diviseurs FullQCM"
  };
}









