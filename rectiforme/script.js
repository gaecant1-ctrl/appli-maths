const canvas = document.getElementById("figureCanvas");
const ctx = canvas.getContext("2d");
const feedback = document.getElementById("feedback");
const input = document.getElementById("expressionInput");
const inputHighlight = document.getElementById("inputHighlight");
const latexPreview = document.getElementById("latexPreview");
const validateBtn = document.getElementById("validateBtn");
const skipButton = document.getElementById("skipButton");
const btnAire = document.getElementById("btnAire");
const btnPeri = document.getElementById("btnPeri");
const btnNumerique = document.getElementById("btnNumerique");
const btnLitteral = document.getElementById("btnLitteral");
const questionType = document.getElementById("questionType");
const quizPanel = document.getElementById("quizPanel");
const quizGroup = document.getElementById("quizGroup");
const quizFilet = document.getElementById("quizFilet");
const btnAtelier = document.getElementById("btnAtelier");
const btnQuiz = document.getElementById("btnQuiz");
const valA = document.getElementById("valA");
const valB = document.getElementById("valB");
const valC = document.getElementById("valC");
const eqA = document.getElementById("eqA");
const eqB = document.getElementById("eqB");
const eqC = document.getElementById("eqC");

let gameMode = null;  // "aire", "peri", "mixte" — déduit des toggles aireActive/periActive (Type)
let aireActive = false;
let periActive = false;
let answerFormat = null;  // "num", "lit", "both" — déduit des toggles numeriqueActive/litteralActive (Mode)
let numeriqueActive = false;
let litteralActive = false;
let mode = "aire"; // ou "peri"
let etatJeu = "atelier";  // "atelier" (libre, illimité) | "quiz" (10 questions notées)
let quizDemarre = false;  // true une fois "Commencer le Quiz" cliqué
let maxQuestions = Infinity; // par défaut mode libre
let hasAnswered = false;
let currentRecti;
let score = 0;
let questionIndex = 0;  // numéro de la question courante
let controlQueue = [];
let bestScore = 0;
let key = 23;
let keyMax = 24;
let showValues = true;
let validateBtnMode = "valider"; // "valider" | "suivant" | "reessayer"
/* =========================
   LOGIQUE EXERCICE
========================= */

function showFeedback(message, color) {
  feedback.textContent = message;
  feedback.style.color = color;
  feedback.style.visibility = "visible";
}

function hideFeedback() {
  feedback.textContent = "";
  feedback.style.visibility = "hidden";
}

/** Recolore à la volée les lettres a/b/c dans le calque affiché sous l'input. */
function updateInputHighlight() {
  const escaped = input.value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  inputHighlight.innerHTML = escaped.replace(/[abc]/g, (lettre) => {
    const classe = lettre === "a" ? "a-color" : lettre === "b" ? "b-color" : "c-color";
    return `<span class="${classe}">${lettre}</span>`;
  });

  inputHighlight.scrollLeft = input.scrollLeft;
}

input.addEventListener("scroll", () => {
  inputHighlight.scrollLeft = input.scrollLeft;
});

/** Rendu LaTeX de l'expression soumise, affiché sous l'input après un clic sur "Valider"
 *  (pas de mise à jour à la volée pendant la frappe). */
function updateLatexPreview(texte) {
  if (!texte) {
    latexPreview.innerHTML = "";
    return;
  }

  const objet = parseMV(texte);
  const brut = objet.isValid() ? objet.toLatex() : texte;

  const colore = brut.replace(/[abc]/g, (lettre) => {
    const couleur = lettre === "a" ? "green" : lettre === "b" ? "blue" : "red";
    return `\\color{${couleur}}{${lettre}}`;
  });

latexPreview.innerHTML = '\\(\\mathcal{A} = ' + colore + '\\)';

  if (window.MathJax && window.MathJax.typesetPromise) {
    window.MathJax.typesetPromise([latexPreview]).catch(() => {});
  }
}

/** Le bouton Valider devient Suivant (correct) ou Réessayer (faux) selon l'issue de la validation. */
function setValidateBtnMode(m) {
  validateBtnMode = m;
  validateBtn.textContent =
    m === "suivant" ? "Suivant" :
    m === "reessayer" ? "Réessayer" :
    "Valider";
}

function onValidateBtnClick() {
  if (validateBtnMode === "suivant") {
    loadNextQuestion();
  } else if (validateBtnMode === "reessayer") {
    hideFeedback();
    updateLatexPreview();
    setValidateBtnMode("valider");
    input.focus();
    input.select();
  } else {
    validateAnswer();
  }
}

/* =========================
   ATELIER / QUIZ
========================= */

function majBoutonsEtat() {
  btnAtelier.className = "btn-header" + (etatJeu === "atelier" ? " active" : "");
  btnQuiz.className = "btn-header" + (etatJeu === "quiz" ? " active" : "");

  const enQuiz = etatJeu === "quiz";
  quizGroup.style.display = enQuiz ? "flex" : "none";
  quizFilet.style.display = enQuiz ? "block" : "none";
}

/** En mode Quiz, les boutons Type/Mode sont bloqués (lecture seule). */
function majVerrouMode() {
  const verrou = (etatJeu === "quiz");
  btnAire.disabled = verrou;
  btnPeri.disabled = verrou;
  btnNumerique.disabled = verrou;
  btnLitteral.disabled = verrou;
}

function majBoutonsMode() {
  btnAire.classList.toggle("active", aireActive);
  btnPeri.classList.toggle("active", periActive);
}

function majBoutonsFormat() {
  btnNumerique.classList.toggle("active", numeriqueActive);
  btnLitteral.classList.toggle("active", litteralActive);
}

/** Construit le contenu du panneau Quiz : bouton "Commencer", ou question + score en cours. */
function renderQuizPanel() {
  quizPanel.innerHTML = "";
  if (etatJeu !== "quiz") return;

  if (!quizDemarre) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.id = "startQuizBtn";
    btn.textContent = "🎯 Commencer le Quiz";
    btn.addEventListener("click", startQuiz);
    quizPanel.appendChild(btn);
    return;
  }

  const progression = document.createElement("div");
  progression.id = "quizProgress";
  progression.textContent = `Question ${questionIndex}/${maxQuestions}`;

  const scoreDiv = document.createElement("div");
  scoreDiv.id = "quizScore";
  scoreDiv.textContent = `Score : ${score}`;

  quizPanel.append(progression, scoreDiv);
}

function setEtatJeu(nouvelEtat) {
  if (etatJeu === nouvelEtat) return;

  etatJeu = nouvelEtat;
  quizDemarre = false;
  score = 0;
  questionIndex = 0;
  maxQuestions = Infinity;

  majBoutonsEtat();
  majVerrouMode();
  hideFeedback();

  if (!gameMode || !answerFormat) {
    renderQuizPanel();
    return;
  }

  if (etatJeu === "atelier") {
    activateGame();
    renderQuizPanel();
    loadNextQuestion();
  } else {
    attendreDemarrageQuiz();
  }
}

/** Verrouille la zone de jeu en attendant le clic sur "Commencer le Quiz". */
function attendreDemarrageQuiz() {
  document.querySelector(".figure-section").classList.add("section-disabled");
  document.querySelector(".interaction-section").classList.add("section-disabled");
  input.disabled = true;
  validateBtn.disabled = true;
  setValidateBtnMode("valider");
  questionType.classList.remove("hidden");
  questionType.textContent = "Clique sur « Commencer le Quiz ».";
  skipButton.style.display = "none";
  updateLatexPreview();
  renderQuizPanel();
}

/** Affiche le bouton "Abandonner" : passe à la question suivante sans valider ni compter de point. */
function setupSkipButton() {
  skipButton.style.display = "block";
  skipButton.onclick = (e) => {
    e.preventDefault();
    loadNextQuestion();
  };
}

function startQuiz() {
  if (!gameMode || !answerFormat) {
    showFeedback("Choisir un type et un mode.", "orange");
    return;
  }

  quizDemarre = true;
  maxQuestions = 10;
  score = 0;
  questionIndex = 0;

  // Mélange sans doublon
  const keys = [...Array(keyMax).keys()];
  for (let i = keys.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [keys[i], keys[j]] = [keys[j], keys[i]];
  }
  controlQueue = keys.slice(0, maxQuestions);

  activateGame();
  renderQuizPanel();
  loadNextQuestion();
}

/* =========================
   FLUX DE JEU
========================= */

function init() {
  aireActive = true;
  periActive = false;
  gameMode = "aire";

  litteralActive = true;
  numeriqueActive = false;
  answerFormat = "lit";

  quizDemarre = false;
  maxQuestions = Infinity;

  majBoutonsMode();
  majBoutonsFormat();
  majVerrouMode();

  activateGame();
  renderQuizPanel();
  loadNextQuestion();
}


function activateGame() {
  document.querySelector(".figure-section")
    .classList.remove("section-disabled");

  document.querySelector(".interaction-section")
    .classList.remove("section-disabled");

  input.disabled = false;
  validateBtn.disabled = false;
  setValidateBtnMode("valider");
}



/* =========================
   FLUX DE JEU (CORRIGÉ)
========================= */

function loadNextQuestion() {
  if (!gameMode || !answerFormat) return;
  if (etatJeu === "quiz" && !quizDemarre) return; 

  // 🎯 CAS 1 : quiz actif et terminé
  if (etatJeu === "quiz" && questionIndex >= maxQuestions) {
    endGame();
    return;
  }

  if (etatJeu === "quiz") {
    questionIndex++;
  }

  hideFeedback();
  input.classList.remove("invalid", "wrong");
  hasAnswered = false;
  input.disabled = false;
  validateBtn.disabled = false;
  setValidateBtnMode("valider");

  if (etatJeu === "quiz") {
    currentRecti = initRectis(controlQueue[questionIndex - 1]);
  } else {
    key = Math.floor(1 + Math.random() * keyMax);
    currentRecti = initRectis(key);
  }

  // Correction de la cohérence visuelle des masques "?"
  const placeholder = showValues ? currentRecti.a : "?";
  valA.textContent = showValues ? currentRecti.a : "?";
  valB.textContent = showValues ? currentRecti.b : "?";
  valC.textContent = showValues ? currentRecti.c : "?";
  
  eqA.style.visibility = showValues ? "visible" : "hidden";
  eqB.style.visibility = showValues ? "visible" : "hidden";
  eqC.style.visibility = showValues ? "visible" : "hidden";

  mode = (gameMode === "mixte")
    ? (Math.random() < 0.5 ? "aire" : "peri")
    : gameMode;

  questionType.classList.remove("hidden");
  questionType.textContent = (mode === "aire" ? "Exprimer l'aire" : "Exprimer le périmètre");

  input.value = "";
  updateInputHighlight();
  updateLatexPreview();
  input.focus();

  setupSkipButton();
  renderQuizPanel();

  const turtle = new Turtle(ctx);
  currentRecti.draw(turtle);
}




function reRollValues() {
  if (!gameMode || !currentRecti) return;

  hideFeedback();
  input.classList.remove("invalid", "wrong");
  hasAnswered = false;
  input.disabled = false;
  validateBtn.disabled = false;
  setValidateBtnMode("valider");
  input.value = "";
  updateInputHighlight();
  updateLatexPreview();
  input.focus();

  currentRecti = initRectis(key);

  valA.textContent = showValues ? currentRecti.a : "?";
  valB.textContent = showValues ? currentRecti.b : "?";
  valC.textContent = showValues ? currentRecti.c : "?";
  eqA.style.visibility = showValues ? "visible" : "hidden";
  eqB.style.visibility = showValues ? "visible" : "hidden";
  eqC.style.visibility = showValues ? "visible" : "hidden";

  const turtle = new Turtle(ctx);
  currentRecti.draw(turtle);
}

function endGame() {

  if (score > bestScore) {
    bestScore = score;
  }

  showFeedback(
    `🎯 Quiz terminé !\n
Score : ${score} / ${maxQuestions}\n
🏆 Meilleur score : ${bestScore} / ${maxQuestions}`,
    "purple"
  );

  quizDemarre = false;
  maxQuestions = Infinity;
  attendreDemarrageQuiz();
}


function validateAnswer() {
  // Évite les validations doublonnées si l'utilisateur a déjà répondu correctement
  if (!currentRecti || hasAnswered) return;

  validateBtn.disabled = true;
  const userInput = input.value; // On garde la valeur brute pour le rendu LaTeX
  const userInputTrimmed = userInput.trim();

  // =========================
  // 🌟 EASTER EGG : Score
  // =========================
  if (userInputTrimmed.toLowerCase() === "score") {
    showFeedback(`🏆 Meilleur score : ${bestScore} / 10`, "blue");
    validateBtn.disabled = false;
    input.focus();
    input.select();
    return;
  }

  // 1️⃣ ON FORCE LE RENDU LATEX EN PREMIER (avant de bloquer quoi que ce soit)
  updateLatexPreview(userInput);

  // Évaluation de l'expression via le moteur de l'exercice
  const result = currentRecti.evalExpression(userInputTrimmed, mode, answerFormat);

  // =========================
  // ❌ EXPRESSION SYNTAXIQUEMENT INVALIDE
  // =========================
  if (result.status === "invalid") {
    showFeedback("Expression non valide (erreur de syntaxe).", "orange");
    input.classList.add("invalid");
    validateBtn.disabled = false;
    input.focus();
    input.select();
    return;
  }

  // =========================
  //  EXPRESSION SYNTAXIQUEMENT VALIDE
  // =========================
  input.classList.remove("invalid");
  hasAnswered = true; 

  if (result.status === "correct") {
    // --- RÉPONSE CORRECTE ---
    input.classList.remove("wrong");
    input.disabled = true; // Désactivation après le rendu LaTeX
    showFeedback("Bravo ! 🎉", "green");
    
    score++;
    setValidateBtnMode("suivant");
    skipButton.style.display = "none";
    validateBtn.disabled = false;
    validateBtn.focus(); // Focus direct pour enchaîner à l'Entrée
  } else {
    // --- RÉPONSE FAUSSE ---
    input.classList.add("wrong");
    showFeedback("Incorrect. Réessaie, ou clique sur « Renoncer ».", "red");
    setValidateBtnMode("reessayer");
    validateBtn.disabled = false;
    
    hasAnswered = false; 
    input.focus();
    input.select();
  }

  // Met à jour les compteurs du bandeau Quiz
  renderQuizPanel();
}




//// LISTENERS


// === Validation / Suivant (bouton unique) ===
validateBtn.addEventListener("click", onValidateBtnClick);


// === Sélection du Type (toggles Aire / Périmètre) ===
// === Sélection du Mode (toggles Numérique / Littéral) ===
function majEtatSelection() {
  score = 0;
  questionIndex = 0;
  quizDemarre = false;
  maxQuestions = Infinity;

  if (!gameMode || !answerFormat) {
    document.querySelector(".figure-section").classList.add("section-disabled");
    document.querySelector(".interaction-section").classList.add("section-disabled");
    questionType.textContent = "Choisir un mode.";
    input.disabled = true;
    validateBtn.disabled = true;
    setValidateBtnMode("valider");
    skipButton.style.display = "none";
    renderQuizPanel();
    return;
  }

  activateGame();
  renderQuizPanel();
  loadNextQuestion();
}

btnAire.addEventListener("click", () => {
  aireActive = !aireActive;
  majBoutonsMode();
  gameMode = (aireActive && periActive) ? "mixte"
    : aireActive ? "aire"
    : periActive ? "peri"
    : null;
  majEtatSelection();
});

btnPeri.addEventListener("click", () => {
  periActive = !periActive;
  majBoutonsMode();
  gameMode = (aireActive && periActive) ? "mixte"
    : aireActive ? "aire"
    : periActive ? "peri"
    : null;
  majEtatSelection();
});

btnNumerique.addEventListener("click", () => {
  numeriqueActive = !numeriqueActive;
  majBoutonsFormat();
  answerFormat = (numeriqueActive && litteralActive) ? "both"
    : numeriqueActive ? "num"
    : litteralActive ? "lit"
    : null;
  majEtatSelection();
});

btnLitteral.addEventListener("click", () => {
  litteralActive = !litteralActive;
  majBoutonsFormat();
  answerFormat = (numeriqueActive && litteralActive) ? "both"
    : numeriqueActive ? "num"
    : litteralActive ? "lit"
    : null;
  majEtatSelection();
});


// === Bascule Atelier / Quiz ===
btnAtelier.addEventListener("click", () => setEtatJeu("atelier"));
btnQuiz.addEventListener("click", () => setEtatJeu("quiz"));


// === Input : effacer feedback si on retape ===
input.addEventListener("input", () => {

    hideFeedback();
    input.classList.remove("invalid", "wrong");
    updateInputHighlight();
});





const reRollBtn = document.getElementById("reRollBtn");

reRollBtn.addEventListener("click", reRollValues);


//  À GARDER ET METTRE À JOUR (en bas du script)
const toggleValuesBtn = document.getElementById("toggleValuesBtn");

toggleValuesBtn.addEventListener("click", () => {
  showValues = !showValues;

  toggleValuesBtn.textContent = showValues ? "👁️" : "🙈";

  if (!currentRecti) return;

  // Utilisation cohérente des "?" quand les valeurs sont masquées
  valA.textContent = showValues ? currentRecti.a : "?";
  valB.textContent = showValues ? currentRecti.b : "?";
  valC.textContent = showValues ? currentRecti.c : "?";
  
  eqA.style.visibility = showValues ? "visible" : "hidden";
  eqB.style.visibility = showValues ? "visible" : "hidden";
  eqC.style.visibility = showValues ? "visible" : "hidden";
});

/** Installe le bouton "Nouvel onglet" dans le bandeau.
 *  Repli si window.open() est bloqué (iframe sandbox) : affiche un lien
 *  cliquable à côté du bouton. */
function setupBoutonNouvelOnglet() {
  const conteneur = document.getElementById("topButtonsBar");
  if (!conteneur) return;

  const filet = document.createElement('div');
  filet.className = 'filet-header';

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'btnNouvelOnglet';
  btn.className = 'btn-header';
  btn.textContent = 'Nouvel onglet';

  const repli = document.createElement('span');
  repli.style.cssText = 'display:none; font-size:0.8em; margin-left:8px;';
  repli.innerHTML = `Bloqué — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

  btn.onclick = () => {
    const w = window.open(window.location.href, "_blank", "noopener");
    if (!w) repli.style.display = 'inline';
  };

  conteneur.append(filet, btn, repli);
}

majBoutonsEtat();
setupBoutonNouvelOnglet();
// Fiche laissée de côté pour l'instant.
if (typeof GuideAppli !== 'undefined') {
  const guide = new GuideAppli();
  guide.installerBouton(document.getElementById("topButtonsBar"));
}

init();
