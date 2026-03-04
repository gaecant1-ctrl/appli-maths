// Quiz.js — version claire, mêmes IDs/classes que l'original + support texts.readyImage
class Quiz {
  /**
   * @param {Object} options
   * @param {HTMLElement|string} options.mount              Conteneur (élément ou sélecteur)
   * @param {number} [options.nbQuestions=10]              Nombre total d'exercices
   * @param {(zone:HTMLElement, index:number)=>any} options.buildExercise
   * @param {Object} [options.texts]                       Libellés et options d'affichage
   *   - score: (bonnes,total)=>string
   *   - btnStart, btnNext, btnBilan, ready, ok(n), ko(n)
   *   - header: (n)=>string
   *   - readyImage: string|null (URL d'image pour la page d'accueil)
   */
  constructor({ mount, nbQuestions = 10, buildExercise, texts = {} }) {
    if (!mount) throw new Error("Quiz: l'option 'mount' est requise.");
    if (typeof buildExercise !== 'function') {
      throw new Error("Quiz: 'buildExercise(zone, index)' est requis.");
    }

    this.mount = (typeof mount === 'string') ? document.querySelector(mount) : mount;
    if (!this.mount) throw new Error("Quiz: élément 'mount' introuvable.");

    this.nbQuestions = nbQuestions;
    this.buildExercise = buildExercise;

    // Libellés (avec surcharges possibles)
    this.texts = {
      score: (b, t) => `Score : ${b}/${t}`,
      btnStart: 'Commencer',
      btnNext: 'Nouvel exercice',
      btnBilan: 'Bilan',
      header: n => `Exercice ${n}`,
      ready: 'Choisissez le niveau puis cliquez sur Commencer',
      ok: n => `Exercice ${n} réussi`,
      ko: n => `Vous avez échoué l’exercice ${n}`,
      readyImage: null, // ex: 'assets/accueil.png'
      ...texts,
    };

    // État
    this.total = 0;
    this.bonnes = 0;
    this.hasStarted = false;
    this.questionValidee = false;
    this.exercice = null;

    // UI & events
    this._onNextClick = this._onNextClick.bind(this);
    this._buildUi();
  }

  // --------- API publique ---------
start() {
  this._resetState();
  this._updateScore();
  this.hasStarted = false;

  // UI clean + réouverture des contrôles
  this._unlockLevelUI();
  this._clearMessage();
  this.zone.innerHTML = '';
  this.nextButton.style.display = '';     // <-- ré-affiche le bouton si caché
  this._showReadyScreen();

  this._setNextLabel(this.texts.btnStart);
  this.nextButton.disabled = false;
}


  destroy() {
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
  }

  /** Renvoie le slot <div id="niveau-slot"> pour y monter ton sélecteur de niveau */
  getLevelSlot() { return this.levelSlot; }
    _lockLevelUI() {
    try {
      const sel = this.levelSlot && this.levelSlot.querySelector('select');
      if (sel) sel.disabled = true;
      this.levelSlot?.classList.add('is-locked');
    } catch (_) {}
  }
  _unlockLevelUI() {
    try {
      const sel = this.levelSlot && this.levelSlot.querySelector('select');
      if (sel) sel.disabled = false;
      this.levelSlot?.classList.remove('is-locked');
    } catch (_) {}
  }

  // --------- UI ---------
  _buildUi() {
    // Racine
    this.root = document.createElement('div');
    this.root.id = 'container';

    // En-tête
    this.header = document.createElement('div');
    this.header.id = 'titre';

    this.scoreEl = document.createElement('div');
    this.scoreEl.id = 'score';
    this.scoreEl.textContent = this.texts.score(0, 0);

    this.levelSlot = document.createElement('div');
    this.levelSlot.id = 'niveau-slot';

    this.nextButton = document.createElement('button');
    this.nextButton.id = 'nextButton';
    this.nextButton.type = 'button';
    this.nextButton.textContent = this.texts.btnStart;
    this.nextButton.addEventListener('click', this._onNextClick);

    this.header.appendChild(this.scoreEl);
    this.header.appendChild(this.levelSlot);
    this.header.appendChild(this.nextButton);

    // Zone résultat
    this.resultEl = document.createElement('div');
    this.resultEl.id = 'resultat';
    this.resultEl.className = 'resultat';
    this.resultEl.style.display = 'none';

    // Zone exercice
    this.zone = document.createElement('div');
    this.zone.id = 'exercice-container';

    // Injection
    this.root.appendChild(this.header);
    this.root.appendChild(this.resultEl);
    this.root.appendChild(this.zone);
    this.mount.appendChild(this.root);
  }

  _clearMessage() {
    this.resultEl.className = 'resultat';
    this.resultEl.textContent = '';
    this.resultEl.classList.remove('show');
    this.resultEl.style.display = 'none';
  }

  _showMessage(msg, css = '') {
    this.resultEl.className = 'resultat ' + css;
    this.resultEl.innerHTML = '';                // reset avant injection
    this.resultEl.textContent = msg || '';
    this.resultEl.style.display = 'flex';
    // si ton CSS utilise .show pour l'animation/affichage
    this.resultEl.classList.add('show');
  }

 _showReadyScreen() {
  this._clearMessage();
  this.resultEl.style.display = 'flex';
  this.resultEl.classList.add('show');

  // Toujours partir d'une zone vide
  this.zone.innerHTML = '';

  if (this.texts.readyImage) {
    const wrap = document.createElement('div');
    wrap.style.textAlign = 'center';
    wrap.style.width = '100%';

    const img = document.createElement('img');
    img.src = this.texts.readyImage;
    img.alt = 'Accueil';
    img.style.maxWidth = '180px';
    img.style.display = 'block';
    img.style.margin = '0 auto 1rem';

    wrap.appendChild(img);
    this.resultEl.textContent = this.texts.ready || '';
    this.zone.appendChild(wrap);
  } else {
    this.resultEl.textContent = this.texts.ready || '';
  }
}


  _updateScore() {
    this.scoreEl.textContent = this.texts.score(this.bonnes, this.total);
  }

  _setNextLabel(label) {
    this.nextButton.textContent = label;
  }

  // --------- Flux ---------
  _resetState() {
    this.total = 0;
    this.bonnes = 0;
    this.questionValidee = false;
    this.exercice = null;
  }

  _onNextClick() {
    if (!this.hasStarted) {
      this.hasStarted = true;
      this._lockLevelUI();  
      this._nouvelleQuestion();
      return;
    }

    if (!this.questionValidee) {
      if (this.exercice && typeof this.exercice.valider === 'function') {
        this.exercice.valider();
      }
      return;
    }

    if (this.total < this.nbQuestions) {
      this._nouvelleQuestion();
    } else {
      this._finQuiz();
    }
  }

  _nouvelleQuestion() {
    this.questionValidee = false;
    this.zone.innerHTML = '';

    const index = this.total + 1;
    this._showMessage(this.texts.header(index));

    // Le builder ne reçoit PAS le niveau : il le capture de l'extérieur si nécessaire
    this.exercice = this.buildExercise(this.zone, index);

    this.nextButton.disabled = true;

    const handler = (e) => {
      const { status, points } = e.detail || {};
      const correct = status === 'correct';

      this._showMessage(
        correct ? this.texts.ok(index) : this.texts.ko(index),
        correct ? 'correct' : 'incorrect'
      );

      this.total++;
      this.bonnes += (typeof points === 'number') ? points : (correct ? 1 : 0);
      this._updateScore();

      this.questionValidee = true;
      this._setNextLabel(this.total === this.nbQuestions ? this.texts.btnBilan : this.texts.btnNext);
      this.nextButton.disabled = false;

      this.zone.removeEventListener('reponseValidee', handler);
    };

    this.zone.addEventListener('reponseValidee', handler);
  }

_finQuiz() {
  this.nextButton.style.display = 'none';
  this.zone.innerHTML = '';
  this._showMessage(`Quiz terminé — ${this.texts.score(this.bonnes, this.total)}`);

  const anim = new AnimationFinale({
    score: this.bonnes,
    total: this.total,
    nbQuestions: this.nbQuestions,
    resultat: this.zone,
    // ⚠️ on passe une fonction qui rappelle start() sur CETTE instance
    onRestart: () => {
      this.nextButton.style.display = '';
      this.start();
    }
  });
  anim.afficher();
}

}

// Exposer globalement
window.Quiz = Quiz;
