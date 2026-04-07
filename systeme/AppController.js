import { History } from "./History.js";
import { QuizSession } from "./QuizSession.js";

export class AppController {

  constructor({ engine, renderer, svg, dico, retry = true, onRequestNew }) {


    this.history = new History();
    this.currentQuiz = null;
    this.questionAttempts = 0;

    this.engine = engine;
    this.renderer = renderer;
    this.svg = svg;
    this.dico = dico;

    this.retry = retry;
    this.onRequestNew = onRequestNew;

    this.state = "idle"; // idle | enCours | faux | correct
    this.currentExercise = null;

    this.dom = {
      input: document.getElementById("answerInput"),
      button: document.getElementById("mainButton"),
      feedback: document.getElementById("feedback")
    };

    this._bindEvents();
  }

  /* ========================================================= */

  _bindEvents() {

    this.dom.button.addEventListener("click", () => {
      this._handleAction();
    });

    this.dom.input.addEventListener("focus", () => {

      if (this.state === "faux") {

        this.state = "enCours";

        this._setFeedback("", "");
        this._updateButton();

        // 🔥 Sélectionne tout le contenu
        this.dom.input.select();
      }
    });

    this.dom.input.addEventListener("keypress", (e) => {

      const allowed = /[0-9\-]/;

      if (!allowed.test(e.key) && e.key !== "Enter") {
        e.preventDefault();
      }
    });
    
    document.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        this._handleAction();
      }
    });
  }

  /* =========================================================
     NOUVEL EXERCICE (change le type)
  ========================================================= */

  newExercise(params) {
    this.lastParams = params;
    
    this.currentExercise = this.engine.create(params);
    if (!this.currentExercise) return;

    this._startExercise();
  }
  
  /* =========================================================
   NOUVEL EXERCICE PAR ID (DEBUG)
========================================================= */

newExerciseById(id) {

  console.log("AppController newExerciseById :", id);

  const min = this.lastParams?.min ?? 1;
  const max = this.lastParams?.max ?? 10;

  this.currentExercise = this.engine.createById(id, min, max);

  if (!this.currentExercise) {
    console.warn("Exercice non généré");
    return;
  }

  this._startExercise();
}

  /* =========================================================
     RÉGÉNÉRATION DES NOMBRES (garde le type)
  ========================================================= */

  regenerateNumbers(min, max) {

    this.currentExercise = this.engine.regenerate(min, max);
    if (!this.currentExercise) return;

    this._startExercise();
  }

  /* =========================================================
     INITIALISATION COMMUNE D’UN EXERCICE
  ========================================================= */

  _startExercise() {

    this.questionAttempts = 0;

    this.state = "enCours";

    this.dom.input.disabled = false;
    this.dom.input.value = "";
    this.dom.feedback.textContent = "";

    this._updateButton();

    this.renderer.render(this.currentExercise, this.svg, this.dico);

    // 🔥 IMPORTANT : mise à jour immédiate du score
    this.updateScoreDisplay();

    this.dom.input.focus();
  }
  /* ========================================================= */

  _handleAction() {

    // ✔️ Question validée
    if (this.state === "correct") {

      const quizFinished =
        this._finalizeCurrentQuestion("vrai");

      if (!quizFinished && this.onRequestNew) {
        this.onRequestNew();
      }

      return;
    }

    // ❌ Abandon
    if (this.state === "faux") {

      const quizFinished =
        this._finalizeCurrentQuestion("abandon");

      if (!quizFinished && this.onRequestNew) {
        this.onRequestNew();
      }

      return;
    }

    // Sinon validation
    this._validate();
  }

  /* ========================================================= */

  _validate() {

    const value = this.dom.input.value.trim();
    if (!value) return;
    
    const ok = this.engine.check(value);

    this.questionAttempts++;
    this.updateScoreDisplay();
    if (ok) {
      // 🎯 MODE QUIZ

      // 🟢 MODE NORMAL
      this.state = "correct";
      this.dom.input.disabled = true;

      this._setFeedback("✅ Bravo !", "success");
      this._updateButton();
      this.updateScoreDisplay();
      return;
    }

    // ❌ Mauvaise réponse

    if (this.retry) {

      this.state = "faux";

      this._setFeedback("❌ Faux. Vous pouvez réessayer ou passer.", "error");
      this._updateButton();

      this.dom.button.focus();   // 🔥 ICI
       this.updateScoreDisplay();
    }else {

      this.state = "correct";
      this.dom.input.disabled = true;

      this._setFeedback(
        "❌ Faux — Réponse : " + this.currentExercise.rep,
        "error"
      );
      this._finalizeCurrentQuestion("faux");
      this._updateButton();
       this.updateScoreDisplay();
    }

   

  }


  /* ========================================================= */

  _resetAfterFail() {

    this.state = "enCours";

    this.dom.input.disabled = false;
    this.dom.input.value = "";

    this._setFeedback("", "");
    this._updateButton();

    this.dom.input.focus();
  }

  /* ========================================================= */

  _updateButton() {

    switch (this.state) {

      case "enCours":
        this.dom.button.textContent = "Valider";
        break;

      case "faux":
        this.dom.button.textContent = "Nouvelle question";
        break;

      case "correct":
        this.dom.button.textContent = "Nouvelle question";
        break;
    }
  }

  /* ========================================================= */
 
  _setFeedback(text = "", type = "") {

    this.dom.feedback.textContent = text;

    this.dom.feedback.classList.remove("success", "error");

    if (type) {
      this.dom.feedback.classList.add(type);
    }
  }

  /* ========================================================= */

updateDico(newDico) {
  if (newDico) {
    this.dico = newDico;
  }

  // Sécurité : s'assurer que mode existe toujours
  if (!this.dico.mode) {
    this.dico.mode = "image";
  }

  if (this.currentExercise) {
    this.renderer.render(this.currentExercise, this.svg, this.dico);
  }
}

  setRetryMode(value) {
    console.log("retry",value);
    this.retry = Boolean(value);
  }


  /* ========================================================= */

  /* =========================================================
     QUIZ MODE PROPRE
  ========================================================= */

  startQuiz(nbQuestions = 10) {

    document.body.classList.add("quiz-active");

    this.currentQuiz = new QuizSession(nbQuestions);

    if (this.onRequestNew) {
      this.onRequestNew();
    }
  }


  /* ========================================================= */

  _finalizeCurrentQuestion(result) {

    const current = this.engine.getCurrent();

    const questionData = {
      quizId: this.currentQuiz ? this.currentQuiz.quizId : null,
      exerciseId: current.id,
      categorie: current.categorie,
      niveau: current.niveau,
      min: current.min,
      max: current.max,
      result,
      attempts: this.questionAttempts,
      retry: this.retry
    };

    this.history.addQuestion(questionData);

    if (this.currentQuiz) {

      this.currentQuiz.registerQuestion(result, this.questionAttempts);

      if (this.currentQuiz.isFinished()) {

        this.history.addQuizSummary(
          this.currentQuiz.getSummary()
        );

        this.currentQuiz = null;

        document.body.classList.remove("quiz-active");

        this._setFeedback("Quiz terminé !", "success");
        this.updateScoreDisplay()
        this.renderHistory();
        return true; // indique fin du quiz
      }
    }
    this.updateScoreDisplay()
    this.renderHistory();
    return false;
  }
  


/* ========================================================= */


  renderHistory() {

    const container = document.getElementById("bilanContent");
    if (!container) return;

    const stats = this.history.getSummaryStats();

    let quizHtml = "";

    if (stats.totalQuizzes > 0) {

      quizHtml += `<div class="bilan-divider"></div>`;
      quizHtml += `<div class="bilan-section-title">Quiz réalisés</div>`;

      stats.quizzes.forEach((quiz, index) => {

        const rate = ((quiz.score / quiz.total) * 100).toFixed(0);

        quizHtml += `
          <button class="bilan-quiz-btn" data-quiz="${quiz.quizId}">
            <span>Quiz ${index + 1}</span>
            <div class="quiz-score">
              <strong>${quiz.score}/${quiz.total}</strong>
              <span class="quiz-rate">${rate}%</span>
            </div>
          </button>
        `;
      });
    }

    container.innerHTML = `
      <div class="bilan-grid">

        <div class="bilan-card">
          <span>Questions</span>
          <strong>${stats.totalQuestions}</strong>
        </div>

        <div class="bilan-card">
          <span>Réussite</span>
          <strong>${stats.successRate}%</strong>
        </div>

        <div class="bilan-card">
          <span>Bonnes réponses</span>
          <strong>${stats.totalCorrect}</strong>
        </div>

        <div class="bilan-card">
          <span>Niveau moyen</span>
          <strong>${stats.averageLevel}</strong>
        </div>

        <div class="bilan-card">
          <span>Moy. tentatives</span>
          <strong>${stats.averageAttempts}</strong>
        </div>

        <div class="bilan-card">
          <span>Quiz</span>
          <strong>${stats.totalQuizzes}</strong>
        </div>

      </div>

      ${quizHtml}
    `;

    // Brancher les boutons quiz
    document.querySelectorAll(".bilan-quiz-btn")
      .forEach(btn => {
        btn.addEventListener("click", () => {
          this.openQuizDetail(btn.dataset.quiz);
        });
      });
  }

  /* ========================================================= */



  openQuizDetail(quizId) {

    const container = document.getElementById("bilanContent");
    const title = document.getElementById("bilanTitle");

    const questions = this.history.getAll()
      .filter(e => e.type === "question" && e.quizId === quizId);

    title.textContent = "Détail du quiz";

    let html = `
      <button id="backToSummary" style="margin-bottom:15px">
        ← Retour
      </button>
    `;

    questions.forEach((q, index) => {

      html += `
        <div class="quiz-detail-row">
          Question ${index + 1}
          | ${q.result}
          | tentatives : ${q.attempts}
          | niveau : ${q.niveau}
        </div>
      `;
    });

    container.innerHTML = html;

    document
      .getElementById("backToSummary")
      .addEventListener("click", () => {
        this.renderHistory();
        title.textContent = "Bilan de la séance";
      });
  }



/* ========================================================= */

  updateScoreDisplay() {

    const el = document.getElementById("scoreZone");
    if (!el) return;

    const stats = this.history.getGlobalStats();

    // Toujours un exercice affiché → +1
    const totalDisplayed = stats.totalExercises + 1;

    let text =
      `Exercices: ${totalDisplayed}  |  ` +
      `✔ ${stats.totalCorrect}  |  ` +
      `❌ ${stats.totalFaux}  |  ` +
      `🚪 ${stats.totalAbandon}`;

    // 🔥 Tentatives visibles tant que l'exercice n'est pas terminé
    if (this.retry && this.state !== "correct") {
      text += `  |  Tentatives: ${this.questionAttempts}`;
    }

    el.textContent = text;
     this.updateQuizScoreDisplay();
  }
  /* ========================================================= */


updateQuizScoreDisplay() {

  const el = document.getElementById("quizScoreZone");
  if (!el) return;

  if (!this.currentQuiz) {
    el.style.display = "none";
    el.textContent = "";
    return;
  }

  el.style.display = "block";

  const q = this.currentQuiz;

  const total = q.total ?? 0;
  const score = q.score ?? 0;
  const done = q.done ?? 0;

  // question en cours = done + 1 (mais pas dépasser total)
  const current = Math.min(done + 1, total);

  const percent = done > 0
    ? Math.round((score / done) * 100)
    : 0;

  el.textContent =
    `Question ${current}/${total}  |  ` +
    `✔ ${score}  |  ${percent}%`;
}

}




