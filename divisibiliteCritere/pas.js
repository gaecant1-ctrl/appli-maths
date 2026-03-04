//----------------------------------------------------------
// PARAMÈTRE DU QUIZ
//----------------------------------------------------------
const NB_QUESTIONS = 10;   // ← change ici : 5, 10, 15…

//----------------------------------------------------------
// DOM
//----------------------------------------------------------

const qNum      = document.querySelector(".q-num");
const qEnonce   = document.querySelector(".q-enonce");
const feedback  = document.querySelector(".feedback");

const btnValider = document.querySelector(".btn-valider");
const btnNext    = document.querySelector(".btn-next");

const boutons    = [...document.querySelectorAll(".critere")];
const scoreAff   = document.querySelector(".score-haut");

const finalPanel = document.querySelector(".final-panel");
const finalScore = document.querySelector(".final-score");
const btnRestart = document.querySelector(".btn-restart");

let nombre = null;
let score = 0;
let totalQuestions = 0;
let modeCorrection = false;


//----------------------------------------------------------
// OUTILS
//----------------------------------------------------------

const tirerNombre   = () => Math.floor(Math.random() * 10000);
const bonsDiviseurs = n => [2,3,4,5,9,10].filter(d => n % d === 0);

const resetBoutons = () =>
  boutons.forEach(b => b.className = "critere");


//----------------------------------------------------------
// BLOQUER / DÉBLOQUER — sans disabled
//----------------------------------------------------------

function bloquerChoix() {
  boutons.forEach(b => b.classList.add("noclick"));
  btnValider.classList.add("noclick");
}

function debloquerChoix() {
  boutons.forEach(b => b.classList.remove("noclick"));
  btnValider.classList.remove("noclick");
}


//----------------------------------------------------------
// AFFICHER ÉCRAN FINAL PROPRE
//----------------------------------------------------------

function afficherEcranFinal() {

  // Cacher tout le contenu normal
  document.querySelector(".q-num").style.display = "none";
  document.querySelector(".q-enonce").style.display = "none";
  document.querySelector(".boutons-rep").style.display = "none";
  document.querySelector(".feedback").style.display = "none";
  btnValider.style.display = "none";
  btnNext.style.display = "none";

  // Préparer le panneau final
  finalScore.textContent = `Score final : ${score} / ${NB_QUESTIONS}`;

  finalPanel.style.display = "block";

  // Bouton recommencer
  btnRestart.onclick = () => {
    score = 0;
    totalQuestions = 0;
    scoreAff.textContent = "0/0";

    // Réafficher tout
    document.querySelector(".q-num").style.display = "";
    document.querySelector(".q-enonce").style.display = "";
    document.querySelector(".boutons-rep").style.display = "";
    document.querySelector(".feedback").style.display = "";
    btnValider.style.display = "";
    btnNext.style.display = "";

    finalPanel.style.display = "none";

    nouvelleQuestion();
  };
}


//----------------------------------------------------------
// NOUVELLE QUESTION (NE CHANGE PAS LE SCORE)
//----------------------------------------------------------

function nouvelleQuestion() {

  if (totalQuestions >= NB_QUESTIONS) {
    afficherEcranFinal();
    return;
  }

  modeCorrection = false;
  btnNext.disabled = true;
  feedback.textContent = "";

  resetBoutons();
  debloquerChoix();

  nombre = tirerNombre();

  qNum.textContent = `Question ${totalQuestions + 1}`;
  qEnonce.textContent = `Le nombre ${nombre} est divisible par :`;

  boutons[0].focus();
}


//----------------------------------------------------------
// SÉLECTION AVANT VALIDATION
//----------------------------------------------------------

boutons.forEach(b =>
  b.addEventListener("click", () => {
    if (!modeCorrection) b.classList.toggle("selected");
  })
);


//----------------------------------------------------------
// VALIDATION
//----------------------------------------------------------

btnValider.addEventListener("click", () => {
  if (modeCorrection) return;

  const choix = boutons
    .filter(b => b.classList.contains("selected"))
    .map(b => +b.dataset.div);

  const bons = bonsDiviseurs(nombre);

  // Correction visuelle
  boutons.forEach(b => {
    const d = +b.dataset.div;
    const choisi = choix.includes(d);
    const correct = bons.includes(d);

    b.classList.remove("selected");

    if (choisi && correct)       b.classList.add("vert");
    else if (!choisi && correct) b.classList.add("orange");
    else if (choisi && !correct) b.classList.add("rouge");
  });

  // Vérification
  const réussite =
    choix.length === bons.length &&
    choix.every(x => bons.includes(x));

  if (réussite) {
    score++;
    feedback.textContent = "✔ Bravo !";
    feedback.style.color = "#2dff5d";
  } else {
    feedback.textContent = "✘ Erreur";
    feedback.style.color = "#ff304f";
  }

  // Comptabilisation
  totalQuestions++;
  scoreAff.textContent = `${score}/${totalQuestions}`;

  // 🔥 Si quiz terminé → bloquer immédiatement et attendre "Voir résultat final"
  if (totalQuestions >= NB_QUESTIONS) {

    bloquerChoix();
    btnValider.classList.add("noclick");

    btnNext.disabled = false;
    btnNext.textContent = "Voir résultat final ✨";
    btnNext.onclick = afficherEcranFinal;

    return;
  }

  // Sinon question suivante
  bloquerChoix();
  modeCorrection = true;

  btnNext.disabled = false;
  btnNext.textContent = "Nouvelle question";
  btnNext.onclick = nouvelleQuestion;

  btnNext.focus();
});


//----------------------------------------------------------
// ENTER = valider ou passer
//----------------------------------------------------------

document.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    if (!modeCorrection) btnValider.click();
    else btnNext.click();
  }
});


//----------------------------------------------------------
// LANCEMENT
//----------------------------------------------------------

nouvelleQuestion();
