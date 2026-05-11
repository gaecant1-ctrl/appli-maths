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
    this.enonceButton.style.display = 'none';
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
    <div style="font-size: 1.1em; font-weight: bold; color: #2c3e50;">
        ${this.texts.score(this.bonnes, this.nbQuestions)}
    </div>
    <div style="font-size: 0.85em; color: #666; margin-top: 2px; padding-top: 2px; border-top: 1px solid #eee;">
        Moyenne erreur : <strong>${moyenne}</strong> / ex
    </div>
    <div style="height: 18px; margin-top: 2px;"> 
        ${rejetsActuels > 0 ? `
            <span style="font-size: 0.75em; color: #e74c3c; font-weight: bold;">
                ⚠️ ${rejetsActuels} erreur${rejetsActuels > 1 ? 's' : ''} ici
            </span>` : ''}
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

    this.exercice = this.buildExercise(this.zone, index, onRejetAction);

    const handler = (e) => {
        const { status, points } = e.detail || {};

        if (status === 'correct' || status === 'incorrect') {
            // Désactivation immédiate de l'écouteur pour éviter les doubles déclenchements
            this.zone.removeEventListener('reponseValidee', handler);
            
            if (status === 'correct') {
                this._showMessage(this.texts.ok(index), 'correct');
                this.bonnes += (typeof points === 'number') ? points : 1;
            } else {
                this._showMessage(this.texts.ko(index), 'incorrect');
            }

            this.total++;
            this.questionValidee = true;
            this._updateScore(0); // On remet à 0 les erreurs "locales" affichées
            
            this._setNextLabel(this.total === this.nbQuestions ? this.texts.btnBilan : this.texts.btnNext);
            this.nextButton.disabled = false;
            this.nextButton.focus();
        }
    };

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

  // --- Garde le reste de tes méthodes (UI, Enonce, FinQuiz) identiques ---
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
    this.enonceButton = document.createElement('button');
    this.enonceButton.id = 'btnEnonce';
    this.enonceButton.textContent = 'Énoncé';
    this.enonceButton.style.display = 'none';
    this.enonceButton.addEventListener('click', () => this._relireEnonce());
    this.center.appendChild(this.enonceButton);

    this.right = document.createElement('div');
    this.right.className = 'header-right';
    this.nextButton = document.createElement('button');
    this.nextButton.id = 'nextButton';
    this.nextButton.addEventListener('click', this._onNextClick);
    this.right.appendChild(this.nextButton);

    this.header.append(this.left, this.center, this.right);
    this.exerciceZone = document.createElement('div');
    this.exerciceZone.id = 'exercice-zone';
    this.resultEl = document.createElement('div');
    this.resultEl.id = 'resultat';
    this.zone = document.createElement('div');
    this.zone.id = 'exercice-container';
    this.exerciceZone.append(this.resultEl, this.zone);
    this.root.append(this.header, this.exerciceZone);
    this.mount.appendChild(this.root);
    this._buildEnonceOverlay();
    this._updateScore();
  }

  _onNextClick() {
    if (!this.hasStarted) {
      this.hasStarted = true;
      this._lockLevelUI();
      this._nouvelleQuestion();
      this.enonceButton.style.display = '';
      return;
    }
    if (!this.questionValidee) {
      if (this.exercice && this.exercice.valider) this.exercice.valider();
      return;
    }
    if (this.total < this.nbQuestions) {
      this._nouvelleQuestion();
    } else {
      this._finQuiz();
    }
  }

  // ... (Conserve tes méthodes _finQuiz, _showReadyScreen, etc. telles quelles) ...
  _buildEnonceOverlay() {
    this.enonceOverlay = document.createElement('div');
    this.enonceOverlay.id = 'enonce-overlay';
    this.enonceOverlay.className = 'enonce-overlay hidden';
    const inner = document.createElement('div');
    inner.className = 'enonce-inner';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'enonce-close';
    closeBtn.textContent = '✖';
    closeBtn.onclick = () => this.enonceOverlay.classList.add('hidden');
    this.enonceContent = document.createElement('div');
    inner.append(closeBtn, this.enonceContent);
    this.enonceOverlay.appendChild(inner);
    this.root.appendChild(this.enonceOverlay);
  }

  _relireEnonce() {
    if (this.texts.readyContent) {
      this.enonceContent.innerHTML = this.texts.readyContent;
      this.enonceOverlay.classList.remove('hidden');
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
    this.resultEl.className = 'resultat ' + css;
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