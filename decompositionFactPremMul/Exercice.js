// Classe mère abstraite, sans rendu spécifique
class Exercice {
  constructor(container) {
    if (new.target === Exercice) throw new Error("Classe abstraite !");
    this.container = container;
    this.status = null;
    this.reponseCorrecte = null;
    this.feedback = {
      "correct": "✅ Bonne réponse !",
      "incorrect": "❌ Mauvaise réponse.",
      "invalide": "⛔ Format invalide."
    };

    

  }

  _render() {
    // À implémenter dans chaque sous-classe
    throw new Error("_render() doit être implémentée dans la sous-classe.");
  }

  _setupEvents() {
    // À implémenter dans chaque sous-classe
  }

  _genererQuestion() {
    throw new Error("_genererQuestion() doit être implémentée dans la sous-classe.");
  }

  valider() {
    throw new Error("valider() doit être implémentée dans la sous-classe.");
  }

  points() {
    return this.status === "correct" ? 1 : 0;
  }

  test(reponse) {
    throw new Error("test() doit être implémentée dans la sous-classe.");
  }
  
_emitValidation() {
  // Émet un événement "reponseValidee" sur le container
  const event = new CustomEvent("reponseValidee", {
    detail: {
      status: this.status,
      points: this.points ? this.points() : 0,
      exercice: this
    }
  });
  this.container.dispatchEvent(event);
}

}

// Sous-classe pour input texte
class ExerciceInput extends Exercice {
  
    constructor(container, questionData) {
    super(container);
    this.reponseCorrecte = questionData.bonneReponse;
    this.question = questionData.question;
    this.questionData=questionData;
    this._render();
    this._setupEvents();
    this._genererQuestion();
  }
  
  _render() {
    this.container.innerHTML = `
      <div class="question"></div>
      <label for="reponse" style="position:absolute;left:-9999px;">Réponse</label>
      <div class="zoneReponse">
        <input type="text" id="reponse" placeholder="Tapez votre réponse" autocomplete="off" autocorrect="off" spellcheck="false"/>
      </div>
      <div class="resultat"></div>
    `;
    this.questionDiv = this.container.querySelector(".question");
    this.input = this.container.querySelector("#reponse");
    this.resultatDiv = this.container.querySelector(".resultat");
  }

  _setupEvents() {
    this.input.onkeydown = (e) => {
      if (e.key === "Enter" && (this.status === null || this.status === "invalide")) {
        this.valider();
      }
    };
    this.input.oninput = () => {
      if (this.status !== null) {
        this.status = null;
        this.resultatDiv.textContent = "";
        this.resultatDiv.className = "resultat";
      }
    };
  }

  _genererQuestion() {
    this.questionDiv.innerHTML=this.question;
    if (window.MathJax && typeof MathJax.typeset === "function") {
      MathJax.typeset([this.questionDiv]);
    }
  }
  
  valider() {
    const reponse = this.input.value.trim();
    this.resultatDiv.className = "resultat";
  
    if (!reponse) {
      this.status = null;
      this.resultatDiv.textContent = "";
      return this.status;
    }
  
    let result;
    try {
      result = this.test(reponse);
    } catch (e) {
      // Gestion du cas où test() lève une erreur (ex : format invalide)
      this.status = "invalide";
      this.resultatDiv.innerHTML = this.feedback['invalide'] || "";
      this.resultatDiv.className = "resultat invalide";
      return this.status;
    }
  
  
    // Si le test retourne juste un statut, on l'encapsule
    if (typeof result === "string") {
      result = { status: result, feedbackHtml: this.feedback[result] };
    }
  
    this.status = result.status;
  
    // Afficher le feedback seulement si feedbackHtml est fourni
    if (result.feedbackHtml) {
      if (this.status==="incorrect" && this.reponseCorrecte){
        result.feedbackHtml += "<br>La réponse correcte est "+this.reponseCorrecte;}
      this.resultatDiv.innerHTML = result.feedbackHtml;
      // MathJax si besoin
      if (result.feedbackHtml.includes("\\(") && window.MathJax && typeof MathJax.typeset === "function") {
        MathJax.typeset([this.resultatDiv]);
      }
    }
  
    this.resultatDiv.className = "resultat " + this.status;
  
    if (this.status === "invalide") return this.status;
  
    this.input.disabled = true;
    this._emitValidation();
    return this.status;
  }


}

// Sous-classe pour QCM
class ExerciceQcm extends Exercice {
  constructor(container, questionData) {
    super(container);
    this.questionData = questionData;
    this._render();
    this._setupEvents();
    this.afficherQuestionEtChoix();
  }

  _render() {
    this.container.innerHTML = `
      <div class="question"></div>
      <div class="qcm-choix"></div>
      <div class="resultat"></div>
    `;
    this.questionDiv = this.container.querySelector(".question");
    this.choixDiv = this.container.querySelector(".qcm-choix");
    this.resultatDiv = this.container.querySelector(".resultat");
    this.input = { value: null };
  }

  _setupEvents() {
    // Les événements sont gérés lors de l'affichage des choix
  }

  afficherQuestionEtChoix() {
    if (typeof this.questionData.indexBonneReponse === "number") {
      this.reponseCorrecte = this.questionData.choix[this.questionData.indexBonneReponse];
    } else if (this.questionData.bonneReponse) {
      this.reponseCorrecte = this.questionData.bonneReponse;
    }

    // Génération HTML des choix sans <br> pour affichage en ligne
    this.choixDiv.innerHTML = this.questionData.choix.map((choix, i) =>
      `<label for="qcm_${i}" style="margin-right:1.5em;">
        <input type="radio" id="qcm_${i}" name="qcm" value="${i}">
        ${choix}
      </label>`
    ).join('');
    this.resultatDiv.textContent = "";
    this.status = null;

    // Affichage de la question
    this.questionDiv.innerHTML = this.questionData.question;
    if (window.MathJax && typeof MathJax.typeset === "function") {
      MathJax.typeset([this.questionDiv]);
    }

    // Gestion des clics radio
    const radios = this.choixDiv.querySelectorAll('input[type="radio"]');
    radios.forEach(radio => {
      radio.onchange = () => {
        this.input.value = radio.value;
        this.valider();
      };
    });
  }

  valider() {
    const reponse = this.input.value;
    this.resultatDiv.className = "resultat";

    let result;
    try {
      result = this.test(reponse);
    } catch (e) {
      this.status = "invalide";
      this.resultatDiv.innerHTML = this.feedback["invalide"] || "";
      this.resultatDiv.className = "resultat invalide";
      return this.status;
    }

    if (typeof result === "string") {
      result = { status: result, feedbackHtml: this.feedback[result] };
    }

    this.status = result.status;

    if (result.feedbackHtml) {
      if (this.status === "incorrect" && this.reponseCorrecte !== null && this.questionData) {
        result.feedbackHtml += `<br>La bonne réponse était : <b>${this.reponseCorrecte}</b>`;
      }
      this.resultatDiv.innerHTML = result.feedbackHtml;
      if (result.feedbackHtml.includes("\\(") && window.MathJax && typeof MathJax.typeset === "function") {
        MathJax.typeset([this.resultatDiv]);
      }
    }

    this.resultatDiv.className = "resultat " + this.status;

    // Désactive les radios après validation correcte/incorrecte
    if (this.status === "correct" || this.status === "incorrect") {
      const radios = this.choixDiv.querySelectorAll('input[type="radio"]');
      radios.forEach(radio => radio.disabled = true);
      this._emitValidation();
    }
    return this.status;
  }

  test(reponse) {
    const indexChoisi = parseInt(reponse, 10);
    if (
      isNaN(indexChoisi) ||
      indexChoisi < 0 ||
      !this.questionData ||
      indexChoisi >= this.questionData.choix.length
    ) {
      return { status: "invalide", feedbackHtml: "⛔ Veuillez sélectionner une réponse." };
    }
    if (indexChoisi === this.questionData.indexBonneReponse) {
      return "correct";
    } else {
      return "incorrect";
    }
  }
}


class ExerciceFullQcm extends Exercice {
  constructor(container, questionData) {
    super(container);
    this.questionData = questionData;
    this.selected = new Set();
    this._render();
    this._setupEvents();
    this.afficherQuestionEtChoix();
  }

  _render() {
    this.container.innerHTML = `
      <div class="question"></div>
      <div class="qcm-choix"></div>
      <div class="resultat"></div>
    `;
    this.questionDiv = this.container.querySelector(".question");
    this.choixDiv = this.container.querySelector(".qcm-choix");
    this.resultatDiv = this.container.querySelector(".resultat");
  }

  _setupEvents() {
    // Les événements sont attachés dans afficherQuestionEtChoix()
  }

  afficherQuestionEtChoix() {
    this.questionDiv.innerHTML = this.questionData.question;


    this.choixDiv.innerHTML = this.questionData.choix.map((choix, i) =>
      `<label style="margin-right:1.5em; cursor: pointer;">
        <input type="checkbox" data-index="${i}">
        ${choix}
      </label>`
    ).join(' ') + `<button class="ex-qcm-valider" style="margin-left:1em;">Valider</button>`;

    this.resultatDiv.textContent = "";
    this.status = null;
    this.selected.clear();

    // Gestion des changements sur les cases à cocher
    this.choixDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.style.pointerEvents = "auto";  // Réactive interaction en cas de réaffichage
      cb.checked = false;                // Reset
      cb.style.outline = "";
      cb.style.backgroundColor = "";
      cb.style.borderRadius = "";
      cb.classList.remove("ex-qcm-correct", "ex-qcm-mauvais", "ex-qcm-oublie");

      cb.onchange = () => {
        const idx = parseInt(cb.dataset.index);
        if (cb.checked) this.selected.add(idx);
        else this.selected.delete(idx);
      };
    });

    // Gestion du bouton valider
    this.choixDiv.querySelector('.ex-qcm-valider').onclick = () => this.valider();
    
    if (window.MathJax && typeof MathJax.typeset === "function") {
      MathJax.typeset([this.questionDiv, this.choixDiv]);
    }

  }

  valider() {
    const bonnes = new Set(this.questionData.bonnesReponses);
    let ok = true;

    // Réinitialiser styles et interactions
    this.choixDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      cb.classList.remove("ex-qcm-correct", "ex-qcm-mauvais", "ex-qcm-oublie");
      cb.style.pointerEvents = "none"; // Bloque interaction sans désactiver
    });

    // Appliquer styles selon correction
    this.choixDiv.querySelectorAll('input[type="checkbox"]').forEach(cb => {
      const idx = parseInt(cb.dataset.index);
      if (this.selected.has(idx) && bonnes.has(idx)) {
        cb.classList.add("ex-qcm-correct");
      } else if (this.selected.has(idx) && !bonnes.has(idx)) {
        cb.classList.add("ex-qcm-mauvais");
        ok = false;
      } else if (!this.selected.has(idx) && bonnes.has(idx)) {
        cb.classList.add("ex-qcm-oublie");
        ok = false;
      }
    });

    this.status = ok ? "correct" : "incorrect";
    this.resultatDiv.textContent = this.feedback[this.status];
    this._emitValidation();
  }

  test(reponse) {
    if (!Array.isArray(reponse)) return false;
    const bonnes = new Set(this.questionData.bonnesReponses);
    const selectedSet = new Set(reponse);
    if (selectedSet.size !== bonnes.size) return false;
    for (let idx of selectedSet) {
      if (!bonnes.has(idx)) return false;
    }
    return true;
  }
}





// Export global pour utilisation dans le reste de l'application
window.Exercice = Exercice;
window.ExerciceInput = ExerciceInput;
window.ExerciceQcm = ExerciceQcm;

