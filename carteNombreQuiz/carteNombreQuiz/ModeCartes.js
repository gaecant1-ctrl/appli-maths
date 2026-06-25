import { Nombre } from "./Nombre.js";
import { Ecriture } from "./Ecriture.js";
import { Carte } from "./Carte.js";

/* =========================================================
   MODE CARTES — nuage de dominos à compléter
   (logique identique à l'ancien main.js, encapsulée)
========================================================= */

export class ModeCartes {

  constructor({ zone, feedback, exerciceZone, scoreZone, mainBtn }) {

    this.zone = zone;
    this.feedback = feedback;
    this.exerciceZone = exerciceZone;
    this.scoreZone = scoreZone;
    this.mainBtn = mainBtn;

    this.MAX_EXERCICES = 10;

    this.nombre = null;
    this.ecritures = null;
    this.ecrituresDemandees = null;
    this.donnee = null;

    this.cartes = [];

    this.score = 0;
    this.total = 0;
    this.exerciceValide = false;
    this.modeBouton = "correction";

    this.intervalId = null;

    this._onClick = () => this._handleClick();
  }

  /* =========================
  FEEDBACK
  ========================= */

  setFeedback(texte, type = "") {

    this.feedback.textContent = texte;
    this.feedback.className = "cartes-feedback" + (type ? ` ${type}` : "");

  }

  /* =========================
  CYCLE DE VIE
  ========================= */

  init() {

    this.score = 0;
    this.total = 0;

    this.mainBtn.disabled = false;
    this.mainBtn.addEventListener("click", this._onClick);

    this.intervalId = setInterval(() => this.verifierExercice(), 200);

    this.majScore();
    this.nouvelExercice();

  }

  destroy() {

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.mainBtn.removeEventListener("click", this._onClick);

  }

  _handleClick() {

    if (this.modeBouton === "correction") {

      this.corriger();
      this.majBouton("suivant");

    } else if (this.modeBouton === "suivant") {

      this.nouvelExercice();

    }

  }

  /* =========================
  BOUTON PRINCIPAL
  ========================= */

  majBouton(mode) {

    this.modeBouton = mode;

    if (mode === "correction") {
      this.mainBtn.textContent = "Correction";
      this.mainBtn.classList.remove("is-suivant");
    }

    if (mode === "suivant") {
      this.mainBtn.textContent = "Exercice suivant";
      this.mainBtn.classList.add("is-suivant");
    }

  }

  majScore() {

    this.scoreZone.textContent = `Score : ${this.score} / ${this.total}`;

  }

  /* =========================
  NOUVEL EXERCICE
  ========================= */

  nouvelExercice() {

    if (this.total >= this.MAX_EXERCICES) {

      this.setFeedback(`Quiz terminé ! Score final : ${this.score} / ${this.total}`, "info");

      this.mainBtn.disabled = true;

      return;

    }

    this.majBouton("correction");

    this.exerciceValide = false;
    this.setFeedback("");
    this.zone.innerHTML = "";
    this.cartes = [];

    if (this.exerciceZone) {
      this.exerciceZone.textContent = `Exercice ${this.total + 1} :`;
    }

    /* génération nombre */

    let a, b;

    b = rand(2, 11);
    a = rand(1, b);

    if (Math.random() < 0.5) {
      const entier = rand(1, 3);
      a = a + entier * b;
    }

    this.nombre = Nombre.fromParts(a, b);

    /* écritures possibles */

    const precisions = [1, 2, 3];
    const alea = precisions[rand(0, precisions.length - 1)];

    const optionsExercice = {
      forceApprox: false,
      precisionDec: alea,
      precisionFracDec: precisions[rand(0, precisions.length - 1)],
      precisionPourc: rand(1, alea),
      kDenom: rand(2, 5)
    };

    this.ecritures = Ecriture.genererTout(this.nombre, optionsExercice);

    /* choisir écriture donnée */

    this.donnee =
      this.ecritures[Math.floor(Math.random() * this.ecritures.length)];

    if (this.donnee.type === "decimal") {

      const rationnelles = this.ecritures.filter(e => e.type === "rationnel");

      this.donnee =
        rationnelles[Math.floor(Math.random() * rationnelles.length)];

    }

    /* écritures demandées */

    this.ecrituresDemandees =
      this.ecritures.filter(e => e !== this.donnee);

    /* construction interface */

    let titreDecimal;

    if (this.nombre.isDecimal()) {
      titreDecimal = "Décimal";
    } else {
      titreDecimal = `Non décimal — Valeurs arrondies`;
    }

    this.zone.innerHTML = `
<div class="resultats">

<div class="col rationnel">
<h2>Rationnel</h2>
<div class="zone-cartes rationnel-zone"></div>
</div>

<div class="col decimal">
<h2>${titreDecimal}</h2>
<div class="zone-cartes decimal-zone"></div>
</div>

</div>
`;

    const rationnelZone = this.zone.querySelector(".rationnel-zone");
    const decimalZone = this.zone.querySelector(".decimal-zone");

    /* carte donnée */

    const carteDonnee = new Carte(this.donnee);

    const zoneDonnee =
      this.donnee.type === "rationnel" ? rationnelZone : decimalZone;

    carteDonnee.renderInto(zoneDonnee, "domino");

    this.cartes.push(carteDonnee);

    /* cartes input */

    this.ecrituresDemandees.forEach(e => {

      const carte = new Carte(e);

      const target = e.type === "rationnel" ? rationnelZone : decimalZone;

      carte.renderInto(target, "dominoInput");
      carte.renderInput(this.feedback);

      this.cartes.push(carte);

    });

    /* focus premier input */

    const firstInput = this.zone.querySelector(".domino-input-field");

    if (firstInput) firstInput.focus();

    if (window.MathJax) {
      MathJax.typesetPromise();
    }

  }

  /* =========================
  EXERCICE REUSSI ?
  ========================= */

  exerciceReussi() {

    const inputs = this.cartes.filter(c => c.state === "input" || c.state === "true");

    return inputs.every(c => c.state === "true");

  }

  /* =========================
  SURVEILLANCE AUTO
  ========================= */

  verifierExercice() {

    if (this.exerciceValide) return;

    const reussi = this.exerciceReussi();

    if (reussi) {

      this.exerciceValide = true;
      this.score++;
      this.total++;

      this.setFeedback("Exercice réussi !", "success");

      this.majBouton("suivant");

      this.majScore();

    }

  }

  /* =========================
  CORRECTION
  ========================= */

  corriger() {

    if (!this.exerciceValide) {
      this.total++;
      this.majScore();
      this.exerciceValide = true;
    }

    this.cartes.forEach(c => {

      if (c.state === "input" || c.state === "false") {

        const container = c.el.querySelector(".domino-input-field");

        if (!container) return;

        const attendu = new Nombre(c.data.string);

        const span = document.createElement("span");

        span.className = "domino-result";

        span.innerHTML = `\\(${attendu.toLatex(c.data.format, c.data.opts)}\\)`;

        container.replaceWith(span);

        if (window.MathJax) {
          MathJax.typesetPromise([span]);
        }

        c.state = "true";

      }

    });

    this.setFeedback("Correction affichée", "info");

  }

}

/* =========================
OUTILS
========================= */

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
