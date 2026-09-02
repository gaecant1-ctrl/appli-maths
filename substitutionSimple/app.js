'use strict';

// Mode "1 inconnue" (γ) : chaque motif est écrit avec la lettre générique "g".
const PATTERNS_1 = [
  { label: 'Base', expressions: ['g+2', 'g-2', '2g', 'g/2', '-g', '-2g', 'g^2'] },
  { label: '(γ+1)²', expressions: ['g^2', '2g+1', '(g+1)^2'] },
  { label: '(γ-1)²', expressions: ['2g-1', 'g^2', '(g-1)^2'] },
  { label: 'γ²-1', expressions: ['g-1', 'g+1', 'g^2-1'] },
  { label: '(γ+3)²', expressions: ['6g+1', 'g^2', '(g+3)^2'] }
];

// Mode "2 inconnues" (a et b).
const PATTERNS_2 = [
  { label: 'Base', expressions: ['a+b', 'a-b', 'a*b', 'a:b', 'a^2b'] },
  { label: '(a+b)²', expressions: ['a^2', '2ab', 'b^2', '(a+b)^2'] },
  { label: '(a-b)²', expressions: ['a^2', '2ab', 'b^2', '(a-b)^2'] },
  { label: '(a-b)(a+b)', expressions: ['a^2', 'b^2', '(a-b)(a+b)'] }
];

// Mode "3 inconnues" (a, b et c). Une expression peut s'écrire "G = D" (deux
// écritures équivalentes, ex. associativité) : la valeur est calculée à
// partir de G, l'en-tête affiche les deux écritures séparées par "=".
const PATTERNS_3 = [
  { label: 'Base', expressions: ['a+b+c', 'abc'] },
  { label: 'Autre 1', expressions: ['a+b', 'b-c', '(a+b)-c', 'a+(b-c)'] },
  { label: 'Autre 2', expressions: ['b+c', 'a-(b+c)', '(a-b)-c'] },
  { label: 'Autre 3', expressions: ['b+c', 'ab', 'ac', 'a(b+c)'] }
];

// Lettre(s) substituée(s) selon le mode, et son remplacement d'affichage LaTeX
// (γ n'existe pas comme lettre pour le moteur : "g" sert de nom de variable
// interne, remplacé à l'affichage ; a, b, c sont déjà les symboles voulus).
const VARIABLES_PAR_MODE = {
  1: { lettres: ['g'], affichage: { g: '\\gamma ' } },
  2: { lettres: ['a', 'b'], affichage: {} },
  3: { lettres: ['a', 'b', 'c'], affichage: {} }
};

let NB_LIGNES = 5;

let modeVariables = 1; // 1, 2 ou 3
let modeRemplissage = 'ligne'; // 'ligne', 'colonne' ou 'aleatoire'
let modeRetry = true; // true : une réponse fausse propose Réessayer/Abandon ; false : correction directe
let etatJeu = 'atelier'; // 'atelier' (paramètres libres) ou 'quiz' (paramètres verrouillés, retry désactivé)

// Suivi du quiz : quizDemarre = quiz en cours ; questionCount/score comptent
// les cases traitées/réussies depuis "Commencer le Quiz", jusqu'à quizLongueur()
// (le nombre total de cases de la grille).
let quizDemarre = false;
let quizTermine = false;
let questionCount = 0;
let score = 0;

function quizLongueur() {
  return NB_LIGNES * expressions.length;
}

// Motifs actifs (sélection exclusive, un seul actif) : indices dans le tableau du mode courant.
const patternsActifs = new Set([0]);

let expressions = [];
let lignesVars = []; // lignesVars[i] = { g: valeur } ou { a: valeur, b: valeur }
let valeurs = [];      // valeurs[ligne][colonne] -> Nombre
let caseCachee = null; // { ligne, colonne }
let casesFaites = new Set();    // clés "i-j" déjà proposées dans la grille courante
let casesReussies = new Set();  // clés "i-j" trouvées juste du premier coup (fond vert)
let casesEchouees = new Set();  // clés "i-j" fausses (fond rouge) ou abandonnées
let reponsesDonnees = new Map(); // clé "i-j" -> Nombre tapé par l'élève (affiché à la place de la valeur exacte)

function motifsDuMode() {
  if (modeVariables === 1) return PATTERNS_1;
  if (modeVariables === 2) return PATTERNS_2;
  return PATTERNS_3;
}

function variablesDuMode() {
  return VARIABLES_PAR_MODE[modeVariables].lettres;
}

const elGrille = document.getElementById('grille');
const elMessage = document.getElementById('message');
const elInput = document.getElementById('inputReponse');
const elBouton = document.getElementById('btnValider');
const elBoutonAbandon = document.getElementById('btnAbandon');

// 'saisie' : le bouton vérifie la saisie.
// 'suivant' : réponse juste (ou fausse corrigée) — le bouton passe à la case suivante.
// 'reessai' : réponse fausse, mode correction désactivé — le bouton relance un essai
//             sur la même case ; le bouton Abandon est aussi affiché.
let etatValidation = 'saisie';

function melanger(tab) {
  const copie = [...tab];
  for (let i = copie.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copie[i], copie[j]] = [copie[j], copie[i]];
  }
  return copie;
}

/** n entiers distincts entre -10 et 10. */
function tirerEntiers(n) {
  const pool = [];
  for (let v = -10; v <= 10; v++) pool.push(v);
  return melanger(pool).slice(0, n);
}

/** n lignes de valeurs pour les lettres du mode courant (ex : [{g:v}] ou [{a:v1,b:v2}]).
 *  Un diviseur (b en mode 2) ne prend jamais 0. Les lignes sont distinctes. */
function tirerLignesValeurs(n) {
  const lettres = variablesDuMode();
  const lignes = [];
  const vues = new Set();
  let tentatives = 0;
  while (lignes.length < n && tentatives < n * 50) {
    tentatives++;
    const ligne = {};
    lettres.forEach((lettre, i) => {
      const estDiviseur = lettre === 'b'; // seule lettre utilisée comme diviseur dans les motifs actuels
      let v;
      do { v = -10 + Math.floor(Math.random() * 21); } while (estDiviseur && v === 0);
      ligne[lettre] = v;
    });
    const cle = lettres.map(l => ligne[l]).join(',');
    if (vues.has(cle)) continue;
    vues.add(cle);
    lignes.push(ligne);
  }
  return lignes;
}

/** Une expression peut s'écrire "G = D" (deux écritures équivalentes, ex.
 *  associativité) : on ne garde que l'écriture de gauche pour le calcul. */
function ecrituresEquivalentes(expr) {
  return expr.split('=').map(s => s.trim());
}

/** Substitue chaque lettre par sa valeur (entre parenthèses) et confie le texte au moteur calcul-mv. */
function calculerValeur(expr, valeursLettres) {
  const [exprCalcul] = ecrituresEquivalentes(expr);
  let texte = exprCalcul;
  Object.entries(valeursLettres).forEach(([lettre, v]) => {
    texte = texte.replace(new RegExp(lettre, 'g'), `(${v})`);
  });
  const poly = evalMV(texte);
  if (!poly) return null;
  return poly.monomes.length ? poly.monomes[0].coeff : Nombre.fromParts(0, 1, 'entier');
}

/** LaTeX d'une seule écriture (sans "="). */
function latexEcriture(expr) {
  let latex = parseMV(expr).toLatex();
  const affichage = VARIABLES_PAR_MODE[modeVariables].affichage;
  Object.entries(affichage).forEach(([lettre, remplacement]) => {
    // Pas de lookbehind (?<!...) : non supporté par les anciennes versions de
    // Safari (< 16.4). On capture le caractère précédent (ou le début de
    // chaîne) et on le réinjecte, seul le lookahead (?!...) reste utilisé.
    const re = new RegExp(`(^|[^a-zA-Z])${lettre}(?![a-zA-Z])`, 'g');
    latex = latex.replace(re, (m, avant) => avant + remplacement);
  });
  return latex;
}

function latexEnTete(expr) {
  return ecrituresEquivalentes(expr).map(latexEcriture).join(' = ');
}

function cleCase(i, j) {
  return `${i}-${j}`;
}

/** Choisit au hasard une case pas encore proposée dans la grille courante. */
/** Toutes les cases de la grille, ordonnées selon le mode de remplissage (ligne ou colonne). */
function casesEnOrdre() {
  const cases = [];
  if (modeRemplissage === 'colonne') {
    for (let j = 0; j < expressions.length; j++) {
      for (let i = 0; i < NB_LIGNES; i++) cases.push({ ligne: i, colonne: j });
    }
  } else {
    for (let i = 0; i < NB_LIGNES; i++) {
      for (let j = 0; j < expressions.length; j++) cases.push({ ligne: i, colonne: j });
    }
  }
  return cases;
}

function choisirNouvelleCase() {
  if (modeRemplissage === 'aleatoire') {
    const disponibles = [];
    for (let i = 0; i < NB_LIGNES; i++) {
      for (let j = 0; j < expressions.length; j++) {
        if (!casesFaites.has(cleCase(i, j))) disponibles.push({ ligne: i, colonne: j });
      }
    }
    caseCachee = disponibles[Math.floor(Math.random() * disponibles.length)];
  } else {
    caseCachee = casesEnOrdre().find(c => !casesFaites.has(cleCase(c.ligne, c.colonne)));
  }
}

/** Tire un motif au hasard parmi ceux actifs (du mode courant). */
function tirerMotif() {
  const actifs = [...patternsActifs];
  return motifsDuMode()[actifs[Math.floor(Math.random() * actifs.length)]].expressions;
}

function genererGrille() {
  expressions = tirerMotif();
  lignesVars = tirerLignesValeurs(NB_LIGNES);
  valeurs = lignesVars.map(v => expressions.map(e => calculerValeur(e, v)));
  casesFaites = new Set();
  casesReussies = new Set();
  casesEchouees = new Set();
  reponsesDonnees = new Map();
  choisirNouvelleCase();
  afficherGrille();
}

/** Passe à une nouvelle case après une validation (juste ou fausse) ; nouvelle grille si toutes les cases sont épuisées. */
function passerCaseSuivante() {
  const cle = cleCase(caseCachee.ligne, caseCachee.colonne);
  casesFaites.add(cle);

  if (etatJeu === 'quiz' && quizDemarre) {
    questionCount++;
    if (casesReussies.has(cle)) score++;
    if (questionCount >= quizLongueur()) {
      quizDemarre = false;
      quizTermine = true;
      renderPanneauLateral();
      afficherGrille(); // remet l'affichage à zéro et verrouille la saisie (quiz terminé)
      return;
    }
  }

  if (casesFaites.size >= NB_LIGNES * expressions.length) {
    genererGrille();
  } else {
    choisirNouvelleCase();
    afficherGrille();
  }

  if (etatJeu === 'quiz' && quizDemarre) renderPanneauLateral(); // met à jour "Question x/N" et le score
}

/** Enveloppe un fragment LaTeX dans un span qu'on pourra mettre à l'échelle, centré dans sa cellule. */
function latexFit(latex) {
  return `<div class="cellule-centre"><span class="latex-fit">\\(${latex}\\)</span></div>`;
}

/**
 * Typeset les éléments donnés puis ajuste leur taille, en attendant que
 * MathJax (chargé en async) soit disponible si ce n'est pas encore le cas.
 */
function typesetPuisAjuster(elements) {
  if (window.MathJax && MathJax.typesetPromise) {
    MathJax.typesetPromise(elements).then(() => elements.forEach(ajusterTaillesLatex));
  } else {
    setTimeout(() => typesetPuisAjuster(elements), 50);
  }
}

/** Met à l'échelle chaque .latex-fit pour qu'il tienne dans sa cellule, sans jamais l'agrandir. */
function ajusterTaillesLatex(racine) {
  const marge = 8;
  racine.querySelectorAll('.latex-fit').forEach(span => {
    const cellule = span.closest('th, td');
    if (!cellule) return;
    span.style.transform = 'scale(1)';
    const maxW = cellule.clientWidth - marge * 2;
    const maxH = cellule.clientHeight - marge * 2;
    const w = span.scrollWidth;
    const h = span.scrollHeight;
    const echelle = Math.min(1, maxW / w, maxH / h);
    span.style.transform = `scale(${echelle})`;
  });
}

/** Étiquette d'en-tête d'une lettre (γ pour "g", a/b tels quels). */
function labelVariable(lettre) {
  const affichage = VARIABLES_PAR_MODE[modeVariables].affichage;
  return (affichage[lettre] || lettre).trim();
}

function afficherGrille() {
  const lettres = variablesDuMode();
  const enTetesVars = lettres.map(l => `<th>${latexFit(labelVariable(l))}</th>`).join('');
  const enTetesExpr = expressions.map(e => `<th>${latexFit(latexEnTete(e))}</th>`).join('');
  const lignes = lignesVars.map((v, i) => {
    const cases = expressions.map((e, j) => {
      // Priorité aux cases déjà résolues (vert/rouge) : caseCachee peut encore
      // pointer sur la dernière case traitée (ex. juste avant la fin d'un quiz).
      // On affiche la valeur TAPÉE par l'élève (reponsesDonnees), pas la valeur
      // exacte — sauf en cas d'abandon, où rien n'a été tapé : la case reste rouge et vide.
      if (casesReussies.has(cleCase(i, j))) {
        const n = reponsesDonnees.get(cleCase(i, j));
        return `<td class="case-correcte">${n ? latexFit(n.toLatex({ nombreAff: 'canonique' })) : ''}</td>`;
      }
      if (casesEchouees.has(cleCase(i, j))) {
        const n = reponsesDonnees.get(cleCase(i, j));
        return `<td class="case-echouee">${n ? latexFit(n.toLatex({ nombreAff: 'canonique' })) : ''}</td>`;
      }
      if (i === caseCachee.ligne && j === caseCachee.colonne) {
        return `<td class="case-a-completer"></td>`;
      }
      return `<td></td>`;
    }).join('');
    const casesVars = lettres.map(l => `<th>${latexFit(v[l])}</th>`).join('');
    return `<tr>${casesVars}${cases}</tr>`;
  }).join('');

  elGrille.innerHTML = `<thead><tr>${enTetesVars}${enTetesExpr}</tr></thead><tbody>${lignes}</tbody>`;
  // table-layout:fixed ne respecte les largeurs de colonnes que si la table a
  // une largeur explicite (sinon les navigateurs la rétrécissent au contenu).
  elGrille.style.width = `${(lettres.length + expressions.length) * 90}px`;

  elMessage.textContent = '';
  elMessage.className = '';

  typesetPuisAjuster([elGrille]);

  elMessage.className = '';

  // En quiz, tant que "Commencer le Quiz" n'a pas été cliqué (ou une fois
  // toutes les cases traitées), la case cible reste visible mais la saisie
  // est verrouillée.
  const quizVerrouille = etatJeu === 'quiz' && !quizDemarre;

  elInput.value = '';
  elInput.disabled = quizVerrouille;
  elBouton.disabled = quizVerrouille;
  if (!quizVerrouille) elInput.focus();

  if (quizTermine) {
    elMessage.textContent = `Quiz terminé : ${score}/${quizLongueur()}.`;
    elMessage.className = 'ok';
  } else {
    elMessage.textContent = '';
  }

  etatValidation = 'saisie';
  elBouton.textContent = 'Vérifier';
  elBoutonAbandon.style.display = 'none';
}

function verifier() {
  const brut = elInput.value.trim();
  const attendu = valeurs[caseCachee.ligne][caseCachee.colonne];
  const td = elGrille.querySelector('.case-a-completer');

  if (!brut) return;

  let saisie;
  try {
    saisie = new Nombre(brut);
  } catch (e) {
    elMessage.textContent = 'Format non reconnu : utilise un nombre décimal (1.5) ou une fraction (a/b).';
    elMessage.className = 'ko';
    // La case reste jaune et vide : ce n'est pas encore un essai comptabilisé.
    return;
  }

  const correct = saisie.equal(attendu);
  const cle = cleCase(caseCachee.ligne, caseCachee.colonne);
  elInput.disabled = true;

  if (correct) {
    elMessage.textContent = 'Bravo, c\'est correct !';
    elMessage.className = 'ok';
    casesReussies.add(cle);
    reponsesDonnees.set(cle, saisie);
    td.className = 'case-correcte';
    td.innerHTML = latexFit(saisie.toLatex({ nombreAff: 'canonique' }));
    typesetPuisAjuster([td]);
    passerEnAttenteSuivant();
  } else if (modeRetry) {
    elMessage.textContent = 'Ce n\'était pas la bonne valeur.';
    elMessage.className = 'ko';
    // La case reste jaune et vide pendant qu'on réessaie (pas de rouge tant
    // que ce n'est pas définitif).
    etatValidation = 'reessai';
    elBouton.textContent = 'Réessayer';
    elBoutonAbandon.style.display = '';
    elBouton.focus();
  } else {
    elMessage.textContent = `La réponse est fausse. La réponse était ${attendu.toString()}.`;
    elMessage.className = 'ko';
    casesEchouees.add(cle);
    reponsesDonnees.set(cle, saisie);
    td.className = 'case-echouee';
    td.innerHTML = latexFit(saisie.toLatex({ nombreAff: 'canonique' }));
    typesetPuisAjuster([td]);
    passerEnAttenteSuivant();
  }
}

/** Passe le bouton en mode "Suivant" et lui donne le focus (Entrée l'active nativement). */
function passerEnAttenteSuivant() {
  etatValidation = 'suivant';
  elBouton.textContent = 'Suivant';
  elBoutonAbandon.style.display = 'none';
  elBouton.focus();
}

/** Relance un essai sur la même case (mode "réessai") : réinitialise la saisie, garde la case en erreur. */
function reessayer() {
  elMessage.textContent = '';
  elMessage.className = '';
  elInput.value = '';
  elInput.disabled = false;
  elBoutonAbandon.style.display = 'none';
  etatValidation = 'saisie';
  elBouton.textContent = 'Vérifier';
  elInput.focus();
}

/** Abandonne la case courante : révèle la bonne réponse et passe directement à la suivante. */
function abandonner() {
  const td = elGrille.querySelector('.case-a-completer');
  td.className = 'case-echouee'; // rouge mais vide (rien n'a été validé) : pas de valeur affichée
  casesEchouees.add(cleCase(caseCachee.ligne, caseCachee.colonne));
  passerCaseSuivante();
}

function gererClicPrincipal() {
  if (etatValidation === 'suivant') {
    passerCaseSuivante();
  } else if (etatValidation === 'reessai') {
    reessayer();
  } else {
    verifier();
  }
}

// Dans le champ de saisie, Entrée n'a pas d'effet natif : on la relie
// explicitement à la même action que le bouton (gererClicPrincipal).
// Sur "keyup" (pas "keydown") : verifier() déplace le focus sur le bouton,
// qui active nativement au "keydown" d'Entrée — sur "keydown", la même
// touche encore enfoncée réactiverait aussitôt ce bouton fraîchement
// focalisé (double déclenchement invisible : le feedback est écrasé avant
// d'être vu). Sur "keyup" la touche est déjà relâchée quand le focus bouge.
elInput.addEventListener('keyup', (ev) => {
  if (ev.key === 'Enter') gererClicPrincipal();
});

elBouton.addEventListener('click', gererClicPrincipal);
elBoutonAbandon.addEventListener('click', abandonner);

/** Bascule 1 inconnue (γ) / 2 inconnues (a, b) : réinitialise motif actif + grille. */
function basculerMode(nouveauMode) {
  if (modeVariables === nouveauMode) return;
  modeVariables = nouveauMode;
  patternsActifs.clear();
  patternsActifs.add(0);
  renderPanneauLateral();
  genererGrille();
}

/** Construit le groupe "Inconnues" (sélection exclusive 1/2, comme une paire de boutons). */
function construireSelecteurMode(disabled) {
  const wrap = document.createElement('div');
  wrap.className = 'panel-groupe-paire';

  [1, 2, 3].forEach(n => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn panel-btn-half' + (modeVariables === n ? ' active' : '');
    btn.textContent = String(n);
    btn.disabled = disabled;
    btn.addEventListener('click', () => basculerMode(n));
    wrap.appendChild(btn);
  });

  return wrap;
}

/** Construit l'input (1 à 10) pour le nombre de lignes de la grille. */
function construireSelecteurNbLignes(disabled) {
  const input = document.createElement('input');
  input.type = 'number';
  input.id = 'inputNbLignes';
  input.min = '1';
  input.max = '10';
  input.value = String(NB_LIGNES);
  input.disabled = disabled;
  input.addEventListener('change', () => {
    let n = parseInt(input.value, 10);
    if (!Number.isInteger(n)) n = NB_LIGNES;
    n = Math.min(10, Math.max(1, n));
    input.value = String(n);
    if (n === NB_LIGNES) return;
    NB_LIGNES = n;
    genererGrille();
  });
  return input;
}

/** Construit le sélecteur du mode de remplissage (ligne / colonne / aléatoire), sélection exclusive. */
function construireSelecteurRemplissage(disabled) {
  const wrap = document.createElement('div');
  wrap.className = 'panel-groupe-paire';

  const options = [
    { valeur: 'ligne', label: 'Ligne' },
    { valeur: 'colonne', label: 'Colonne' },
    { valeur: 'aleatoire', label: 'Aléa' }
  ];

  options.forEach(({ valeur, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn panel-btn-half' + (modeRemplissage === valeur ? ' active' : '');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      if (modeRemplissage === valeur) return;
      modeRemplissage = valeur;
      renderPanneauLateral();
      genererGrille();
    });
    wrap.appendChild(btn);
  });

  return wrap;
}

/** Construit le sélecteur "Mode retry" (activé/désactivé), sélection exclusive. */
function construireSelecteurRetry(disabled) {
  const wrap = document.createElement('div');
  wrap.className = 'panel-groupe-paire';

  [{ valeur: false, label: 'Désactivé' }, { valeur: true, label: 'Activé' }].forEach(({ valeur, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn panel-btn-half' + (modeRetry === valeur ? ' active' : '');
    btn.textContent = label;
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      if (modeRetry === valeur) return;
      modeRetry = valeur;
      renderPanneauLateral();
    });
    wrap.appendChild(btn);
  });

  return wrap;
}

/** Construit le panneau latéral : mode (1/2 inconnues) + motifs (sélection exclusive) du mode courant. */
function renderPanneauLateral() {
  const panneau = document.getElementById('panneauLateral');
  if (!panneau) return;
  panneau.innerHTML = '';

  const verrouille = etatJeu === 'quiz' && quizDemarre;

  if (etatJeu === 'quiz') {
    panneau.appendChild(construireSuiviQuiz());
  } else {
    const btnNouvelleGrille = document.createElement('button');
    btnNouvelleGrille.type = 'button';
    btnNouvelleGrille.className = 'panel-btn';
    btnNouvelleGrille.textContent = '🔀 Nouvelle grille';
    btnNouvelleGrille.addEventListener('click', genererGrille);
    panneau.appendChild(btnNouvelleGrille);
  }

  const filetGrille = document.createElement('div');
  filetGrille.className = 'panel-filet';
  panneau.appendChild(filetGrille);

  const groupeMode = document.createElement('div');
  groupeMode.className = 'panel-groupe';
  const labelMode = document.createElement('div');
  labelMode.className = 'panel-groupe-label';
  labelMode.textContent = 'Inconnues';
  groupeMode.appendChild(labelMode);
  groupeMode.appendChild(construireSelecteurMode(verrouille));
  panneau.appendChild(groupeMode);

  const filetMode = document.createElement('div');
  filetMode.className = 'panel-filet';
  panneau.appendChild(filetMode);

  const groupeLignes = document.createElement('div');
  groupeLignes.className = 'panel-groupe';
  const labelLignes = document.createElement('div');
  labelLignes.className = 'panel-groupe-label';
  labelLignes.textContent = 'Nombre de lignes';
  groupeLignes.appendChild(labelLignes);
  groupeLignes.appendChild(construireSelecteurNbLignes(verrouille));
  panneau.appendChild(groupeLignes);

  const filetLignes = document.createElement('div');
  filetLignes.className = 'panel-filet';
  panneau.appendChild(filetLignes);

  const groupeRemplissage = document.createElement('div');
  groupeRemplissage.className = 'panel-groupe';
  const labelRemplissage = document.createElement('div');
  labelRemplissage.className = 'panel-groupe-label';
  labelRemplissage.textContent = 'Remplissage';
  groupeRemplissage.appendChild(labelRemplissage);
  groupeRemplissage.appendChild(construireSelecteurRemplissage(verrouille));
  panneau.appendChild(groupeRemplissage);

  const filetRemplissage = document.createElement('div');
  filetRemplissage.className = 'panel-filet';
  panneau.appendChild(filetRemplissage);

  const groupeCorrection = document.createElement('div');
  groupeCorrection.className = 'panel-groupe';
  const labelCorrection = document.createElement('div');
  labelCorrection.className = 'panel-groupe-label';
  labelCorrection.textContent = 'Mode retry';
  groupeCorrection.appendChild(labelCorrection);
  groupeCorrection.appendChild(construireSelecteurRetry(verrouille));
  panneau.appendChild(groupeCorrection);

  const filet = document.createElement('div');
  filet.className = 'panel-filet';
  panneau.appendChild(filet);

  const groupe = document.createElement('div');
  groupe.className = 'panel-groupe';

  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = 'Motifs';
  groupe.appendChild(label);

  const liste = document.createElement('div');
  liste.className = 'panel-type-list';
  const boutons = [];

  motifsDuMode().forEach((motif, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn' + (patternsActifs.has(i) ? ' active' : '');
    btn.textContent = motif.label;
    btn.title = motif.expressions.join(', ').replace(/g/g, 'γ');
    btn.disabled = verrouille;
    btn.addEventListener('click', () => {
      if (patternsActifs.has(i)) return; // déjà le seul motif actif
      patternsActifs.clear();
      patternsActifs.add(i);
      boutons.forEach((b, k) => b.classList.toggle('active', k === i));
      genererGrille();
    });
    boutons.push(btn);
    liste.appendChild(btn);
  });

  groupe.appendChild(liste);
  panneau.appendChild(groupe);
}

/** Construit le groupe "Suivi" du quiz : bouton de démarrage, ou progression + score une fois lancé. */
function construireSuiviQuiz() {
  const groupe = document.createElement('div');
  groupe.className = 'panel-groupe';

  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = 'Suivi';
  groupe.appendChild(label);

  if (!quizDemarre) {
    const btnCommencer = document.createElement('button');
    btnCommencer.type = 'button';
    btnCommencer.className = 'panel-btn active';
    btnCommencer.textContent = quizTermine ? 'Recommencer le Quiz' : 'Commencer le Quiz';
    btnCommencer.addEventListener('click', commencerQuiz);
    groupe.appendChild(btnCommencer);

    if (quizTermine) {
      const resultat = document.createElement('div');
      resultat.id = 'score';
      resultat.textContent = `Score final : ${score}/${quizLongueur()}`;
      groupe.appendChild(resultat);
    }
  } else {
    const progression = document.createElement('div');
    progression.id = 'question-progress';
    progression.textContent = `Question ${questionCount}/${quizLongueur()}`;
    groupe.appendChild(progression);

    const scoreDiv = document.createElement('div');
    scoreDiv.id = 'score';
    scoreDiv.textContent = `Score : ${score}`;
    groupe.appendChild(scoreDiv);

    const btnRenoncer = document.createElement('button');
    btnRenoncer.type = 'button';
    btnRenoncer.id = 'skipButton';
    btnRenoncer.className = 'panel-btn';
    btnRenoncer.textContent = 'Renoncer';
    btnRenoncer.addEventListener('click', abandonner);
    groupe.appendChild(btnRenoncer);
  }

  return groupe;
}

/** Bouton "Nouvel onglet" : ouvre l'appli dans un nouvel onglet (utile pour imprimer
 *  hors d'un cadre restreint). Repli si window.open() est bloqué. */
function setupBoutonNouvelOnglet() {
  const conteneur = document.getElementById('topButtonsBar');
  if (!conteneur) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btnNouvelOnglet';
  btn.className = 'btn-header';
  btn.textContent = 'Nouvel onglet';

  const repli = document.createElement('span');
  repli.style.cssText = 'display:none; font-size:0.8em; margin-left:8px;';
  repli.innerHTML = `Bloqué — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

  btn.onclick = () => {
    const w = window.open(window.location.href, '_blank', 'noopener');
    if (!w) repli.style.display = 'inline';
  };

  conteneur.appendChild(btn);
  conteneur.appendChild(repli);
}

/** Met à jour l'état visuel (.active) des boutons Atelier/Quiz du header. */
function majClassesEtat() {
  const btnAtelier = document.getElementById('btnAtelier');
  const btnQuiz = document.getElementById('btnQuiz');
  if (!btnAtelier || !btnQuiz) return;
  btnAtelier.className = 'btn-header' + (etatJeu === 'atelier' ? ' active' : '');
  btnQuiz.className = 'btn-header' + (etatJeu === 'quiz' ? ' active' : '');
}

/** Bascule Atelier/Quiz : le quiz verrouille les paramètres du panneau et désactive le mode retry. */
function basculerEtat(nouvelEtat) {
  if (etatJeu === nouvelEtat) return;
  etatJeu = nouvelEtat;
  quizDemarre = false;
  quizTermine = false;
  questionCount = 0;
  score = 0;
  majClassesEtat();
  renderPanneauLateral();
  genererGrille();
}

/** Démarre le quiz : réinitialise le score et débloque la saisie. */
function commencerQuiz() {
  quizDemarre = true;
  quizTermine = false;
  questionCount = 0;
  score = 0;
  modeRetry = false;
  renderPanneauLateral();
  genererGrille();
}

/** Installe le bouton de bascule Atelier/Quiz dans le header. */
function setupEtatToggle() {
  const conteneur = document.getElementById('topButtonsBar');
  if (!conteneur) return;

  const btnAtelier = document.createElement('button');
  btnAtelier.type = 'button';
  btnAtelier.id = 'btnAtelier';
  btnAtelier.textContent = 'Atelier';

  const btnQuiz = document.createElement('button');
  btnQuiz.type = 'button';
  btnQuiz.id = 'btnQuiz';
  btnQuiz.textContent = 'Quiz';

  btnAtelier.addEventListener('click', () => basculerEtat('atelier'));
  btnQuiz.addEventListener('click', () => basculerEtat('quiz'));

  const filet = document.createElement('div');
  filet.className = 'filet-header';

  conteneur.append(btnAtelier, btnQuiz, filet);
  majClassesEtat();
}

window.onload = () => {
  setupEtatToggle();
  renderPanneauLateral();
  setupBoutonNouvelOnglet();

  if (typeof FichePapier !== 'undefined') {
    const fiche = new FichePapier();
    fiche.installerBouton(document.getElementById('topButtonsBar'));
  }
  if (typeof GuideAppli !== 'undefined') {
    const guide = new GuideAppli();
    guide.installerBouton(document.getElementById('topButtonsBar'));
  }
};

genererGrille();
