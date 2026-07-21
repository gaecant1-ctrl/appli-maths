class Quiz {
  constructor({ mount, nbQuestions = 30, buildExercise, texts = {} }) {
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
      btnStartQuiz: 'Commencer le Quiz',
      btnAbandon: 'Abandon',
      btnNext: 'Nouvel exercice',
      btnBilan: 'Bilan',
      ready: 'Choisissez le niveau puis cliquez sur Commencer',
      ok: n => `Exercice ${n} réussi`,
      ko: n => `Vous avez échoué l’exercice ${n}`,
      readyImage: null,
      ...texts,
    };

    // Délai (ms) avant d'enchaîner automatiquement sur un nouvel exercice
    // après un abandon ou un échec, le temps de voir la correction affichée.
    this.DELAI_RELANCE_APRES_ECHEC = 1500;

    // État initial : 'atelier' (illimité, rien n'est compté) ou 'quiz' (compté, bilan final)
    this.etatJeu = 'atelier';
    this.quizDemarre = false;
    this.total = 0;
    this.bonnes = 0;
    this.rejetsCumules = 0; // La caisse commune des erreurs
    this.hasStarted = false;
    this.questionValidee = false;
    this.exercice = null;

    this._onNextClick = this._onNextClick.bind(this);
    this._buildUi();
    this.start();
  }

  // --------- API publique ---------
  start() {
    this._resetState();
    this.hasStarted = false;
    this.quizDemarre = false;
    this._annulerRelanceAutomatique();
    this._clearMessage();
    this.zone.innerHTML = '';
    this._buildPanel();
    this._updateScore();
    this._showReadyScreen();
    this._setNextLabel(this.etatJeu === 'quiz' ? this.texts.btnStartQuiz : this.texts.btnStart);
    this.nextButton.disabled = false;
    this.nextButton.focus();
  }

_updateScore(rejetsActuels = 0) {
  if (!this.scoreEl) return;

  if (this.etatJeu !== 'quiz' || !this.quizDemarre) {
    this.scoreEl.innerHTML = '';
    return;
  }

  const diviseur = Math.max(this.total, 1);
  const moyenne = (this.rejetsCumules / diviseur).toFixed(1);
  const indexAffiche = Math.min(this.total + 1, this.nbQuestions);

  this.scoreEl.innerHTML = `
  <div id="question-progress">Exercice ${indexAffiche}/${this.nbQuestions}</div>

  <div id="score">
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
    this._annulerRelanceAutomatique();
    this.questionValidee = false;
    this.zone.innerHTML = '';
    const index = this.total + 1;
    this._clearMessage();

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

            // Le bouton "Abandon" du panneau ne s'applique plus une fois la question terminée.
            this.nextButton.disabled = true;

            const quizTermine = this.etatJeu === 'quiz' && this.total >= this.nbQuestions;

            if (status === 'correct') {
                // Réussite : bouton "Nouvel exercice" (ou "Bilan") dans la zone d'exercice elle-même.
                this._afficherBoutonContinuer(
                    quizTermine ? this.texts.btnBilan : this.texts.btnNext,
                    () => { if (quizTermine) this._finQuiz(); else this._nouvelleQuestion(); }
                );
            } else {
                // Abandon / échec : la correction est déjà affichée par l'exercice ;
                // on enchaîne automatiquement, sans bouton à cliquer.
                this._relanceAuto = setTimeout(() => {
                    this._relanceAuto = null;
                    if (quizTermine) this._finQuiz(); else this._nouvelleQuestion();
                }, this.DELAI_RELANCE_APRES_ECHEC);
            }
        }
    };

    this._currentHandler = handler;
    this.zone.addEventListener('reponseValidee', handler);
    this._updateScore(0);
    this._setNextLabel(this.texts.btnAbandon);
    this.nextButton.disabled = false;
}

  /** Bouton affiché DANS la zone d'exercice (à la place de l'ancien "Abandon"),
   *  uniquement en cas de réussite. */
  _afficherBoutonContinuer(label, onClick) {
    const div = document.createElement('div');
    div.className = 'bouton-correction';
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-correction';
    btn.textContent = label;
    btn.addEventListener('click', onClick);
    div.appendChild(btn);
    this.zone.appendChild(div);
    btn.focus();
  }

  _annulerRelanceAutomatique() {
    if (this._relanceAuto) {
      clearTimeout(this._relanceAuto);
      this._relanceAuto = null;
    }
  }

  _resetState() {
    this.total = 0;
    this.bonnes = 0;
    this.rejetsCumules = 0;
    this.questionValidee = false;
    this.exercice = null;
  }

  // --------- Structure (header-actions + panneau latéral + main) ---------
  _buildUi() {
    this.topButtonsBar = document.getElementById('topButtonsBar');
    this.panneau = document.getElementById('panneauLateral');
    if (!this.panneau) throw new Error("Quiz: #panneauLateral introuvable.");

    this.resultEl = document.createElement('div');
    this.resultEl.id = 'resultat';
    this.mount.appendChild(this.resultEl);

    this.zone = document.createElement('div');
    this.zone.id = 'exercice-container';
    this.mount.appendChild(this.zone);

    this._setupEtatToggle();
  }

  /** Panneau latéral : label (Atelier/Quiz) + zone de score (quiz uniquement) + bouton d'action. */
  _buildPanel() {
    this.panneau.innerHTML = '';

    this.labelEl = document.createElement('div');
    this.labelEl.className = 'panel-groupe-label';
    this.labelEl.textContent = this.etatJeu === 'atelier' ? 'Atelier' : 'Quiz';
    this.panneau.appendChild(this.labelEl);

    this.scoreEl = document.createElement('div');
    this.scoreEl.id = 'score-container';
    this.panneau.appendChild(this.scoreEl);

    this.nextButton = document.createElement('button');
    this.nextButton.id = 'nextButton';
    this.nextButton.className = 'panel-btn active';
    this.nextButton.addEventListener('click', this._onNextClick);
    this.panneau.appendChild(this.nextButton);
  }

  /** Boutons "Atelier" / "Quiz" installés dans le header, pour basculer de mode. */
  _setupEtatToggle() {
    this.btnAtelier = document.createElement('button');
    this.btnAtelier.type = 'button';
    this.btnAtelier.textContent = 'Atelier';
    this.btnAtelier.addEventListener('click', () => this._basculerEtat('atelier'));

    this.btnQuiz = document.createElement('button');
    this.btnQuiz.type = 'button';
    this.btnQuiz.textContent = 'Quiz';
    this.btnQuiz.addEventListener('click', () => this._basculerEtat('quiz'));

    this._majToggleClasses();

    const filet = document.createElement('div');
    filet.className = 'filet-header';

    if (this.topButtonsBar) this.topButtonsBar.append(this.btnAtelier, this.btnQuiz, filet);
  }

  _majToggleClasses() {
    this.btnAtelier.className = 'btn-header' + (this.etatJeu === 'atelier' ? ' active' : '');
    this.btnQuiz.className = 'btn-header' + (this.etatJeu === 'quiz' ? ' active' : '');
  }

  _basculerEtat(nouvelEtat) {
    if (this.etatJeu === nouvelEtat) return;
    this.etatJeu = nouvelEtat;
    this._majToggleClasses();
    this.start();
  }

  _onNextClick() {
    try {
      if (!this.hasStarted) {
        this.hasStarted = true;
        if (this.etatJeu === 'quiz') this.quizDemarre = true;
        this._nouvelleQuestion();
        return;
      }
      if (!this.questionValidee) {
        // Tant que la question n'est pas terminée, ce bouton sert à abandonner
        // l'exercice en cours (affiche la correction puis enchaîne automatiquement).
        if (this.exercice && typeof this.exercice.abandonner === 'function') {
          try {
            this.exercice.abandonner();
          } catch (e) {
            console.warn('Quiz: exercice.abandonner() a levé une exception (ignorée) :', e);
          }
        }
        return;
      }
      // Une fois la question terminée, ce bouton n'a plus d'action : on avance
      // via le bouton "Nouvel exercice"/"Bilan" (réussite) ou automatiquement (échec).
    } catch (e) {
      // Filet de sécurité : une exception ici ne doit jamais laisser le bouton
      // "mort" sans aucun retour visible. On la log et on tente de réactiver le bouton.
      console.error('Quiz: erreur dans _onNextClick :', e);
      this.nextButton.disabled = false;
    }
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
    this.panneau.style.display = 'none';
    this.resultEl.style.display = 'none';
    this.mount.setAttribute('style', 'position:fixed;inset:0;background:#002;display:flex;align-items:center;justify-content:center;z-index:1;');
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
          this.mount.removeAttribute('style'); // On nettoie les styles inline
          this.zone.removeAttribute('style');
          this.panneau.style.display = '';
          this.start();
      }
    }).afficher();

  }
}
window.Quiz = Quiz;
