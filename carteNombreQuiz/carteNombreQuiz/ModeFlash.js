import { Nombre } from "./Nombre.js";
import { Ecriture } from "./Ecriture.js";
import { genererConsigne } from "./Consigne.js";

/* =========================================================
   MODE FLASH — une écriture à la fois
========================================================= */

export class ModeFlash {

  constructor({ donneeZone, consigneZone, feedback, input, exerciceZone, scoreZone, mainBtn }) {

    this.donneeZone = donneeZone;
    this.consigneZone = consigneZone;
    this.feedback = feedback;
    this.input = input;
    this.exerciceZone = exerciceZone;
    this.scoreZone = scoreZone;
    this.mainBtn = mainBtn;

    this.MAX_QUESTIONS = 10;

    this.score = 0;
    this.total = 0;
    this.questionCourante = null;
    this.modeBouton = "valider";
    this.etat = "attente";

    this._onClick = () => {
      if (this.modeBouton === "valider") {
        this.valider();
      } else {
        this.nouvelleQuestion();
      }
    };

    this._onKeydown = e => {
      if (e.key === "Enter") {
        e.preventDefault();
        this._onClick();
      }
    };

  }

  /* =========================
  CYCLE DE VIE
  ========================= */

  init() {

    this.score = 0;
    this.total = 0;

    this.mainBtn.disabled = false;
    this.input.disabled = false;
    this.input.style.display = "";

    this.mainBtn.addEventListener("click", this._onClick);
    this.input.addEventListener("keydown", this._onKeydown);

    this.majScore();
    this.nouvelleQuestion();

  }

  destroy() {

    this.mainBtn.removeEventListener("click", this._onClick);
    this.input.removeEventListener("keydown", this._onKeydown);

  }

  /* =========================
  OUTILS
  ========================= */

  majBouton(mode) {
    this.modeBouton = mode;
    this.mainBtn.textContent = mode === "valider" ? "Valider" : "Question suivante";
    this.mainBtn.classList.toggle("is-suivant", mode === "suivant");
  }

  majScore() {
    this.scoreZone.textContent = `Score : ${this.score} / ${this.total}`;
  }

  majEntete() {
    this.exerciceZone.textContent = `Question ${this.total + 1}`;
  }

  genererNombre() {

    let a, b;

    b = rand(2, 11);
    a = rand(1, b);

    if (Math.random() < 0.5) {
      const entier = rand(1, 3);
      a = a + entier * b;
    }

    return Nombre.fromParts(a, b);

  }

  /* =========================
  NOUVELLE QUESTION
  ========================= */

  nouvelleQuestion() {

    if (this.total >= this.MAX_QUESTIONS) {

      this.consigneZone.textContent = `Quiz terminé ! Score final : ${this.score} / ${this.total}`;
      this.donneeZone.innerHTML = "";
      this.feedback.textContent = "";
      this.input.style.display = "none";
      this.mainBtn.disabled = true;

      return;

    }

    this.majEntete();
    this.majBouton("valider");

    this.etat = "attente";
    this.feedback.textContent = "";
    this.feedback.className = "flash-feedback";
    this.input.value = "";
    this.input.disabled = false;
    this.input.classList.remove("correct", "incorrect");

    const precisions = [1, 2, 3];
    const alea = precisions[rand(0, precisions.length - 1)];

    const optionsExercice = {
      forceApprox: false,
      precisionDec: alea,
      precisionFracDec: precisions[rand(0, precisions.length - 1)],
      precisionPourc: rand(1, alea),
      kDenom: rand(2, 5)
    };

    const nombre = this.genererNombre();

    const ecritures = Ecriture.genererTout(nombre, optionsExercice);

    const donneeEcriture = ecritures.find(e => e.forme === "decimal" && e.statut === "exact")
      ?? ecritures.find(e => e.forme === "fractionSimp");

    const candidates = ecritures.filter(e => e !== donneeEcriture && e.string !== donneeEcriture.string);

    if (candidates.length === 0) {
      this.nouvelleQuestion();
      return;
    }

    const ecritureDemandee = candidates[rand(0, candidates.length - 1)];

    this.questionCourante = { nombre, ecritureDemandee };

    this.donneeZone.innerHTML = `$$${donneeEcriture.latex}$$`;

    this.consigneZone.innerHTML = genererConsigne(ecritureDemandee, donneeEcriture.latex);

    if (window.MathJax) {
      MathJax.typesetPromise([this.donneeZone, this.consigneZone]);
    }

    this.input.focus();

  }

  /* =========================
  VALIDATION
  ========================= */

  valider() {

    if (this.etat !== "attente") return;

    const txt = this.input.value.trim().replace(",", ".");

    if (txt === "") return;

    const nb = new Nombre(txt);

    if (nb.statut !== "valide") {

      this.feedback.textContent = "❓ Écriture incorrecte";
      this.feedback.className = "flash-feedback incorrect";
      this.input.classList.add("incorrect");

      return;

    }

    const { ecritureDemandee } = this.questionCourante;

    const ok = ecritureDemandee.nombre.equalAff(nb, ecritureDemandee.format, ecritureDemandee.opts);

    this.total++;

    if (ok) {

      this.etat = "correct";
      this.score++;

      this.feedback.textContent = "✅ Correct";
      this.feedback.className = "flash-feedback correct";
      this.input.classList.add("correct");

    } else {

      this.etat = "incorrect";

      this.feedback.innerHTML = `❌ Faux — réponse attendue : $${ecritureDemandee.latex}$`;
      this.feedback.className = "flash-feedback incorrect";
      this.input.classList.add("incorrect");

      if (window.MathJax) {
        MathJax.typesetPromise([this.feedback]);
      }

    }

    this.input.disabled = true;
    this.majScore();
    this.majBouton("suivant");

  }

}

/* =========================
OUTILS
========================= */

function rand(a, b) {
  return Math.floor(Math.random() * (b - a + 1)) + a;
}
