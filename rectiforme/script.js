const canvas = document.getElementById("figureCanvas");
const ctx = canvas.getContext("2d");
const scoreDisplay = document.getElementById("score");
const feedback = document.getElementById("feedback");
const input = document.getElementById("expressionInput");
const validateBtn = document.getElementById("validateBtn");
const nextBtn = document.getElementById("nextBtn");
const modeSelect = document.getElementById("modeSelect");
const startControlBtn = document.getElementById("startControlBtn");
const questionType = document.getElementById("questionType");
const valA = document.getElementById("valA");
const valB = document.getElementById("valB");
const valC = document.getElementById("valC");

let gameMode = null;  // "aire", "peri", "mixte"
let mode = "aire"; // ou "peri"
let isControlMode = false;
let maxQuestions = Infinity; // par défaut mode libre
let hasAnswered = false;
let currentRecti;
let score = 0;
let questionIndex = 0;  // numéro de la question courante
let controlQueue = [];
let isControlFinished = false;
let bestScore = 0;
let key=23;
let keyMax=24;
let showValues = true;
/* =========================
   LOGIQUE EXERCICE
========================= */

function showFeedback(message, color) {
  feedback.textContent = message;
  feedback.style.color = color;
  feedback.style.visibility = "visible";
}

function hideFeedback() {
  console.log("hideFeedback appelé");
  feedback.textContent = "";
  feedback.style.visibility = "hidden";
}

//document.getElementById("questionType").classList.add("hidden");

function init() {
  gameMode = null;
  isControlMode=false;
  updateControlButton();

  document.querySelector(".figure-section")
    .classList.add("section-disabled");

  document.querySelector(".interaction-section")
    .classList.add("section-disabled");
  questionType.textContent="Choisir un mode.";
  
  modeSelect.disabled=false;
  input.disabled = true;
  validateBtn.disabled = true;
  nextBtn.disabled = true;
  startControlBtn.disabled=false;

  
}


function activateGame() {
  document.querySelector(".figure-section")
    .classList.remove("section-disabled");

  document.querySelector(".interaction-section")
    .classList.remove("section-disabled");

  input.disabled = false;
  validateBtn.disabled = false;
  nextBtn.disabled = false;
}



function loadNextQuestion() {
  if (!gameMode) return;

  // 🎯 CAS 1 : contrôle actif et terminé
  if (isControlMode && questionIndex >= maxQuestions) {
    endGame();
    return;
  }

  if (isControlMode) {
    questionIndex++; // reset compteur
  }

  hideFeedback();
  input.classList.remove("invalid");
  hasAnswered = false;
  input.disabled = false;
  validateBtn.disabled = false;

  if (isControlMode) {
    currentRecti = initRectis(controlQueue[questionIndex - 1]);
  } else {
    
    key = Math.floor(1+Math.random() * keyMax);
    
    currentRecti = initRectis(key);
  }

valA.textContent = showValues ? currentRecti.a : "?";
valB.textContent = showValues ? currentRecti.b : "?";
valC.textContent = showValues ? currentRecti.c : "?";

  mode = (gameMode === "mixte")
    ? (Math.random() < 0.5 ? "aire" : "peri")
    : gameMode;

  const questionTitle = document.getElementById("questionType");
  questionTitle.classList.remove("hidden");
questionTitle.textContent =
  (mode === "aire"
    ? "Exprimer l'aire"
    : "Exprimer le périmètre");
/*+ ` — Figure ${key}`;*/

  input.value = "";
  input.focus();

  updateControlButton();

  const turtle = new Turtle(ctx);
  currentRecti.draw(turtle);
}


function endGame() {

  if (score > bestScore) {
    bestScore = score;
  }

  showFeedback(
    `🎯 Contrôle terminé !\n
Score : ${score} / ${maxQuestions}\n
🏆 Meilleur score : ${bestScore} / ${maxQuestions}`,
    "purple"
  );

  init();
}

function updateControlButton() {

  

  if (!isControlMode) {
    startControlBtn.textContent = "🎯 Contrôle";
    startControlBtn.classList.remove("control-active");
    return;
  }

  startControlBtn.textContent = `🎯 ${score} / ${questionIndex}`;
  startControlBtn.classList.add("control-active");
}




function validateAnswer() {
  hasAnswered = true;

  if (!currentRecti) return;
  
  validateBtn.disabled = true;

  const result = currentRecti.evalExpression(input.value, mode);

  // =========================
  // EXPRESSION NON VALIDE
  // =========================
  if (result.status === "invalid") {
      // ===== Easter egg : afficher meilleur score =====
  if (input.value.trim().toLowerCase() === "score") {

    showFeedback(
      `🏆 Score : ${bestScore} / 10`,
      "blue"
    );



  }else{

    showFeedback("Expression non valide.", "orange");}

    input.classList.add("invalid");
    validateBtn.disabled = false;
    input.focus();
    input.select();

    return;
  }

  // =========================
  // EXPRESSION VALIDE
  // =========================
  input.classList.remove("invalid");

  if (result.status === "correct") {
    showFeedback("Bravo !", "green");
    score++;
  } else {
    showFeedback("Incorrect.", "red");
  }

  input.disabled = true;
  validateBtn.disabled = true;

  updateControlButton();



  nextBtn.focus();
}




//// LISTENERS


// === Validation ===
validateBtn.addEventListener("click", validateAnswer);


// === Question suivante ===
nextBtn.addEventListener("click", () => {



  loadNextQuestion();
});

// === Sélection du mode ===
modeSelect.addEventListener("change", (e) => {

  gameMode = e.target.value;

  activateGame();

  score = 0;
  questionIndex = 0;
  isControlMode = false;
  maxQuestions = Infinity;

  updateControlButton();

  loadNextQuestion();
});


// === Démarrer contrôle ===
startControlBtn.addEventListener("click", () => {

  if (!gameMode) {
    showFeedback("Choisir un mode.", "orange");
    return;
  }

  isControlMode = true;
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

  startControlBtn.disabled = true;
  modeSelect.disabled = true;

  loadNextQuestion();
});


// === Input : effacer feedback si on retape ===
input.addEventListener("input", () => {

    hideFeedback();
  
});


// === Touche Entrée ===
input.addEventListener("keydown", (e) => {

  if (e.key !== "Enter") return;

  e.preventDefault();

  if (!input.disabled) {
    validateAnswer();
  } else {
    loadNextQuestion();
  }

});


const toggleValuesBtn = document.getElementById("toggleValuesBtn");

toggleValuesBtn.addEventListener("click", () => {

  showValues = !showValues;

  toggleValuesBtn.textContent = showValues
    ? "👁️"
    : "🙈";

  if (!currentRecti) return;

  valA.textContent = showValues ? currentRecti.a : "";
  valB.textContent = showValues ? currentRecti.b : "";
  valC.textContent = showValues ? currentRecti.c : "";
});

init();
