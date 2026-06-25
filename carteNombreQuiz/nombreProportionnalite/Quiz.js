class Quiz {
  constructor({ mount, nbQuestions = 10, buildExercise, texts = {} }) {
    if (!mount) throw new Error("Quiz: l'option 'mount' est requise.");
    if (typeof buildExercise !== 'function') {
      throw new Error("Quiz: 'buildExercise(zone, index)' est requis.");
    }

    this.mount = (typeof mount === 'string') ? document.querySelector(mount) : mount;
    if (!this.mount) throw new Error("Quiz: élément 'mount' introuvable.");

    this.nbQuestions = nbQuestions;
    this.buildExercise = buildExercise;

    this.texts = {
      score: (b, t) => `Score : ${b}/${t}`,
      btnStart: 'Commencer',
      btnNext: 'Nouvel exercice',
      btnBilan: 'Bilan',
      header: n => `Exercice ${n}`,
      ready: 'Choisissez le niveau puis cliquez sur Commencer',
      ok: n => `Exercice ${n} réussi`,
      ko: n => `Vous avez échoué l’exercice ${n}`,
      readyImage: null,
      ...texts,
    };

    // État initial
    this.total = 0;
    this.bonnes = 0;
    this.rejetsCumules = 0; // La caisse commune des erreurs
    this.hasStarted = false;
    this.questionValidee = false;
    this.exercice = null;

    this._onNextClick = this._onNextClick.bind(this);
    this._buildUi();
  }

  // --------- API publique ---------
  start() {
    this._resetState();
    this._updateScore();
    this.hasStarted = false;
    this._unlockLevelUI();
    this._clearMessage();
    this.zone.innerHTML = '';
    this.nextButton.style.display = '';
    this._showReadyScreen();
    this._setNextLabel(this.texts.btnStart);
    this.nextButton.disabled = false;
    this.nextButton.focus();
  }

_updateScore(rejetsActuels = 0) {
  if (!this.scoreEl) return;

  const diviseur = Math.max(this.total, 1);
  const moyenne = (this.rejetsCumules / diviseur).toFixed(1);

  // On utilise des templates fixes. 
  // L'astuce est de laisser la div d'erreur vide mais présente si rejetsActuels === 0
this.scoreEl.innerHTML = `
  <div class="score-main">
    ${this.texts.score(this.bonnes, this.nbQuestions)}
  </div>

  <div class="score-average">
    Moyenne erreur : <strong>${moyenne}</strong> / ex
  </div>

  <div class="score-local">
    ${
      rejetsActuels > 0
        ? `<span class="score-local-error">
             ⚠️ ${rejetsActuels} erreur${rejetsActuels > 1 ? 's' : ''} ici
           </span>`
        : ''
    }
  </div>
`;

}

_nouvelleQuestion() {
    this.questionValidee = false;
    this.zone.innerHTML = '';
    const index = this.total + 1;
    this._showMessage(this.texts.header(index));

    const onRejetAction = (v) => {
        this.rejetsCumules++;
        // On récupère le nombre de tentatives de l'exercice actuel
        this._updateScore(this.exercice ? this.exercice.tentativesEchouees : 0);
    };

    // Sécurité : On retire un éventuel ancien écouteur résiduel sur la zone
    if (this._currentHandler) {
        this.zone.removeEventListener('reponseValidee', this._currentHandler);
        this._currentHandler = null;
    }

    this.exercice = this.buildExercise(this.zone, index, onRejetAction);

    const handler = (e) => {
        const { status, points } = e.detail || {};

        if (status === 'correct' || status === 'incorrect') {
            // Désactivation immédiate de l'écouteur pour éviter les doubles déclenchements
            this.zone.removeEventListener('reponseValidee', handler);
            this._currentHandler = null;
            
            if (status === 'correct') {
                this._showMessage(this.texts.ok(index), 'correct');
                this.bonnes += (typeof points === 'number') ? points : 1;
            } else {
                this._showMessage(this.texts.ko(index), 'incorrect');
            }

            this.total++;
            this.questionValidee = true;
            this._updateScore(this.exercice ? this.exercice.tentativesEchouees : 0);
            
            this._setNextLabel(this.total === this.nbQuestions ? this.texts.btnBilan : this.texts.btnNext);
            this.nextButton.disabled = false;
            this.nextButton.focus();
        }
    };

    this._currentHandler = handler;
    this.zone.addEventListener('reponseValidee', handler);
    this._updateScore(0);
    this.nextButton.disabled = true;
}

  _resetState() {
    this.total = 0;
    this.bonnes = 0;
    this.rejetsCumules = 0;
    this.questionValidee = false;
    this.exercice = null;
  }

  // --- Garde le reste de tes méthodes (UI, FinQuiz) identiques ---
  _buildUi() {
    this.root = document.createElement('div');
    this.root.id = 'container';
    this.header = document.createElement('div');
    this.header.id = 'titre';

    this.left = document.createElement('div');
    this.left.className = 'header-left';
    this.scoreEl = document.createElement('div');
    this.scoreEl.id = 'score';

    Object.assign(this.scoreEl.style, {
        minHeight: '85px',     // On réserve l'espace pour 3 lignes d'office
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        lineHeight: '1.4'
    });
    this.left.appendChild(this.scoreEl);

    this.center = document.createElement('div');
    this.center.className = 'header-center';
    this.resultEl = document.createElement('div');
    this.resultEl.id = 'resultat';
    this.center.appendChild(this.resultEl);

    this.right = document.createElement('div');
    this.right.className = 'header-right';
    this.nextButton = document.createElement('button');
    this.nextButton.id = 'nextButton';
    this.nextButton.addEventListener('click', this._onNextClick);
    this.right.appendChild(this.nextButton);

    // Slot dédié pour des boutons annexes (ex: Fiche papier), greffé dans 'right'
    // sans perturber le bouton principal nextButton.
    this.ficheSlot = document.createElement('div');
    this.ficheSlot.className = 'header-fiche-slot';
    this.right.appendChild(this.ficheSlot);

    this.header.append(this.left, this.center, this.right);
    this.exerciceZone = document.createElement('div');
    this.exerciceZone.id = 'exercice-zone';

    this.zone = document.createElement('div');
    this.zone.id = 'exercice-container';
    this.exerciceZone.append(this.zone);
    this.root.append(this.header, this.exerciceZone);
    this.mount.appendChild(this.root);
    this._updateScore();
  }

  _onNextClick() {
    try {
      if (!this.hasStarted) {
        this.hasStarted = true;
        this._lockLevelUI();
        this._nouvelleQuestion();
        return;
      }
      if (!this.questionValidee) {
        // NB: ExerciceExpression n'implémente pas valider() (méthode abstraite de la
        // classe Exercice) ; ce bouton sert uniquement à valider via Entrée dans l'input.
        // On protège l'appel pour ne jamais bloquer silencieusement le bouton si une
        // exception est levée ici.
        if (this.exercice && typeof this.exercice.valider === 'function') {
          try {
            this.exercice.valider();
          } catch (e) {
            console.warn('Quiz: exercice.valider() a levé une exception (ignorée) :', e);
          }
        }
        return;
      }
      if (this.total < this.nbQuestions) {
        this._nouvelleQuestion();
      } else {
        this._finQuiz();
      }
    } catch (e) {
      // Filet de sécurité : une exception ici ne doit jamais laisser le bouton
      // "mort" sans aucun retour visible. On la log et on tente de réactiver le bouton.
      console.error('Quiz: erreur dans _onNextClick :', e);
      this.nextButton.disabled = false;
    }
  }



  _lockLevelUI() {
    const sel = this.levelSlot?.querySelector('select');
    if (sel) sel.disabled = true;
  }

  _unlockLevelUI() {
    const sel = this.levelSlot?.querySelector('select');
    if (sel) sel.disabled = false;
  }

  _clearMessage() {
    this.resultEl.style.display = 'none';
    this.resultEl.textContent = '';
  }

  _showMessage(msg, css = '') {
    this.resultEl.textContent = msg;
this.resultEl.className = 'resultat show ' + css;
    this.resultEl.style.display = 'flex';
  }

  _showReadyScreen() {
    if (this.texts.readyContent) {
      const wrap = document.createElement('div');
      wrap.style.textAlign = 'center';
      wrap.innerHTML = this.texts.readyContent;
      this.zone.appendChild(wrap);
    }
    this.resultEl.textContent = this.texts.ready || '';
    this.resultEl.style.display = 'flex';
  }

  _setNextLabel(l) { this.nextButton.textContent = l; }

  _finQuiz() {
    this.header.style.display = 'none';
    this.resultEl.style.display = 'none';
    this.nextButton.style.display = 'none';
    this.exerciceZone.setAttribute('style', 'position:fixed;inset:0;background:#002;display:flex;align-items:center;justify-content:center;z-index:1;');
    this.zone.setAttribute('style', 'max-width:min(720px,92vw);color:#fff;border:none;background:#002;');
    this.zone.innerHTML = '';
    const efficacite = this.rejetsCumules === 0 ? 100 : Math.max(0, 100 - (this.rejetsCumules * 5));

    new AnimationFinale({
      score: this.bonnes,
      total: this.total,
      rejets: this.rejetsCumules,
      efficacite: efficacite,
      nbQuestions: this.nbQuestions,
      resultat: this.zone,
      onRestart: () => {
          this.exerciceZone.removeAttribute('style'); // On nettoie les styles inline
          this.zone.removeAttribute('style');
          this.header.style.display = '';
          this.nextButton.style.display = '';
          this.start();
      }
    }).afficher();

  }
}
window.Quiz = Quiz;