class InputWrapper {
constructor(expressionObj, container, options) {
  this.expressionObj = expressionObj;
  this.container = container;
  this.options = options || {};
  this.policies = normalizePolicies(this.options.policies || (window.REGLES?.strict || {}));

  this.wrapper = document.createElement('div');
  this.wrapper.classList.add('input-wrapper');

  // === gauche: lettre + signe + (input/latex) ===
  this.left = document.createElement('div');
  this.left.classList.add('left-part');
  this.wrapper.appendChild(this.left);

  // Lettre (optionnelle)
  const lhsLetter = (typeof this.options.affichageAvecLettre === 'string' && this.options.affichageAvecLettre.trim() !== '')
    ? this.options.affichageAvecLettre.trim()
    : '';
  this.lhsLetterStr = lhsLetter;

  if (lhsLetter) {
    this.lhs = document.createElement('span');
    this.lhs.className = 'lhs-letter';
    this.lhs.textContent = lhsLetter;
    // évite le wrap vertical au-dessus du "="
    this.lhs.style.display = 'inline-block';
    this.lhs.style.minWidth = '1ch';
    this.lhs.style.marginRight = '.35rem';
    this.left.appendChild(this.lhs);
  }

  // Signe "=" (toujours présent)
  this.equalSign = document.createElement('span');
  this.equalSign.className = 'equal-sign';
  this.equalSign.textContent = '=';
  // largeur fixe pour aligner verticalement tous les "="
  this.equalSign.style.display = 'inline-block';
  this.equalSign.style.minWidth = '1ch';
  this.equalSign.style.textAlign = 'center';
  this.equalSign.style.marginRight = '.35rem';
  this.left.appendChild(this.equalSign);

  // Champ de saisie
  this.input = document.createElement('input');
  this.input.type = "text";
  this.input.placeholder = "Écris ta réponse ici";
  this.input.classList.add('input-wrapper-input');
  this.left.appendChild(this.input);

  // === droite: commentaire ===
  this.comment = document.createElement('div');
  this.comment.classList.add('comment');
  this.comment.setAttribute('role', 'status');
  this.comment.setAttribute('aria-live', 'polite');
  this.wrapper.appendChild(this.comment);

  this.container.appendChild(this.wrapper);

  // debug / état
  this.answer = null;
  this.lastIsAtom = false;
  this._composing = false;
  this._disabled = false;

  // Handlers
  this._keydownHandler = (e) => this.handleKeydown(e);
  this._inputHandler = () => this.input?.classList.remove('input-error');
  this._compositionStart = () => { this._composing = true; };
  this._compositionEnd = () => { this._composing = false; };

  // Events
  this.input.addEventListener("keydown", this._keydownHandler);
  this.input.addEventListener("input", this._inputHandler);
  this.input.addEventListener("compositionstart", this._compositionStart);
  this.input.addEventListener("compositionend", this._compositionEnd);

  this.input.focus();
}


  // ---------- utils visuels ----------
  _setPrefixSymbol(sym) {
    const letter = this.lhsLetterStr || '';
    this.prefix.textContent = letter ? `${letter} ${sym}` : sym;
  }

setEqualState(state) {
  const sym =
    (state === 'invalide' || state === 'invalid_parse') ? '?' :
    (state === 'correct' || state === 'ok') ? '=' :
    '≠';

  this.equalSign.textContent = sym;

  this.equalSign.classList.remove('state-correct','state-ok','state-incorrect','state-invalid');
  if (sym === '?') {
    this.equalSign.classList.add('state-invalid');
    this.equalSign.setAttribute('aria-label', 'Réponse invalide');
  } else if (sym === '=') {
    this.equalSign.classList.add(state === 'ok' ? 'state-ok' : 'state-correct');
    this.equalSign.setAttribute('aria-label', state === 'ok' ? 'Format non conforme' : 'Réponse correcte');
  } else {
    this.equalSign.classList.add('state-incorrect');
    this.equalSign.setAttribute('aria-label', 'Réponse incorrecte');
  }
}


  createCloseButton() {
    const closeButton = document.createElement('span');
    closeButton.innerHTML = `
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
      </svg>`;
    closeButton.setAttribute('aria-label', 'Fermer');
    closeButton.setAttribute('title', 'Fermer');
    closeButton.setAttribute('role', 'button');
    closeButton.tabIndex = 0;
    closeButton.classList.add('close-button');

    const remove = () => {
      this.wrapper.remove();
      this.container.dispatchEvent(new CustomEvent('wrapperRemoved', { bubbles: true, composed: true }));
    };

    closeButton.addEventListener('click', remove);
    closeButton.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        remove();
      }
    });

    return closeButton;
  }

  disable() {
    this._disabled = true;
    if (this.input) {
      this.input.disabled = true;
      this.input.setAttribute('aria-disabled', 'true');
      this.input.classList.add('is-disabled');
      this.input.removeEventListener("keydown", this._keydownHandler);
      this.input.removeEventListener("input", this._inputHandler);
      this.input.removeEventListener("compositionstart", this._compositionStart);
      this.input.removeEventListener("compositionend", this._compositionEnd);
    }
  }

  // ---------- saisie ----------
  handleKeydown(event) {
    if (this._disabled) return;
    if (this._composing) return;

    const isEnter = (event.key === "Enter");
    const isCtrlEnter = (event.key === "Enter" && (event.ctrlKey || event.metaKey));
    if (!isEnter && !isCtrlEnter) return;

    event.preventDefault();
    const raw = (this.input?.value ?? '').trim();
    if (!raw) return;

    let answer = null;
    try {
      const baseOpts = (this.expressionObj && this.expressionObj.options) || {};
      const opts = Object.assign({}, baseOpts, this.options?.modeCorrection || {});
      answer = new ObjetString(raw, opts);
    } catch {}

    this.answer = answer;

    try {
      const maybePromise = window.verifier(this.expressionObj, answer, this.policies);
      if (maybePromise && typeof maybePromise.then === 'function') {
        maybePromise.then((v) => this.processVerdict(v))
                    .catch((err) => this.processVerdict({ status: 'invalid_parse', message: err?.message || 'Erreur' }));
      } else {
        this.processVerdict(maybePromise);
      }
    } catch (err) {
      this.processVerdict({ status: 'invalid_parse', message: err?.message || 'Erreur' });
    }
  }

  processVerdict(verdict) {
    const status = verdict?.status || 'invalid_parse';
    const statusForSign =
      (status === 'invalid_parse') ? 'invalide' :
      (status === 'wrong_nature' || status === 'unequal') ? 'incorrect' :
      (status === 'ok') ? 'ok' :
      'correct';

    this.setEqualState(statusForSign);

    // Remplacement input -> LaTeX si la réponse est valide
    if (this.answer?.valid === true) {
      try {
        let latex = this.answer?.arbre?.toLatex?.(this.options?.modeCorrection || {}) || '';
        latex = latex.replace(/\\cdot\s*(?=\{?\d)/g, '\\times').replace(/\\cdot/g, '');
        const latexDiv = document.createElement('div');
        latexDiv.className = 'latex-formula';
        // sécurité : pas d'innerHTML direct
        latexDiv.textContent = `$${latex}$`;

        if (this.input && this.input.parentNode) {
          this.left.insertBefore(latexDiv, this.input);
          this.input.remove();
          this.input = null;
        }
        if (window.MathJax?.typesetPromise) MathJax.typesetPromise([latexDiv]);
        else if (window.MathJax?.typeset)   MathJax.typeset([latexDiv]);
      } catch (e) {
        console.error("Erreur de rendu LaTeX :", e.message);
      }
    } else {
      if (this.input) {
        this.input.focus();
        this.input.select();
        this.input.classList.add('input-error');
      }
    }

    this.displayComment(status, verdict);

    // events
    this.container.dispatchEvent(new CustomEvent('gradeResult',  { detail: verdict, bubbles: true, composed: true }));
    this.container.dispatchEvent(new CustomEvent('equalSignsMaybeUpdate', { bubbles: true, composed: true }));
  }

  displayComment(status, verdict) {
    const meta = verdict?.meta || {};
    const reason = meta.reason;

    const className =
      (status === 'correct') ? 'success' :
      (status === 'ok')      ? 'info' :
                               'error';

    let txt = '';
    if (status === 'invalid_parse') {
      txt = verdict?.message || "Réponse invalide.";
    } else if (status === 'wrong_nature') {
      const attendu = meta.attendu ?? '—';
      const obtenu  = meta.obtenu  ?? '—';
      txt = `Nature incorrecte (attendu : ${attendu}, obtenu : ${obtenu}).`;
    } else if (status === 'unequal') {
      txt = "Valeur incorrecte.";
    } else if (status === 'ok') {
      switch (reason) {
        case 'need_expression_raw':     txt = "Donne une expression (avec opérations), pas une valeur seule."; break;
        case 'need_atom_raw':           txt = "Donne un atome simple (pas une opération)."; break;
        case 'number_format_mismatch':  txt = "Format du nombre non conforme."; break;
        case 'wrong_unit':              txt = "Unité attendue non respectée."; break;
        case 'need_atom_to_check_unit': txt = "Impossible de vérifier l’unité sans atome."; break;
        case 'different_atoms':         txt = "Relire la question"; break;
        case 'different_ops':           txt = "Relire la question"; break;
        default:                        txt = "Bonne valeur, mais format non conforme.";
      }
    } else if (status === 'correct') {
      txt = "✅ Bravo !";
    }

    this.comment.innerHTML = '';
    this.comment.className = "comment " + className;

    if (status !== 'correct') {
      const closeButton = this.createCloseButton();
      this.comment.appendChild(closeButton);
    }

    const feedbackSpan = document.createElement('span');
    feedbackSpan.textContent = txt;
    this.comment.appendChild(feedbackSpan);

    if (reason === 'wrong_unit' && (meta.suggestionLatex || meta.suggestionText)) {
      const sug = document.createElement('div');
      sug.style.marginTop = '4px';
      if (meta.suggestionLatex) {
        sug.textContent = `$${meta.suggestionLatex}$`;
        this.comment.appendChild(sug);
        if (window.MathJax?.typesetPromise) MathJax.typesetPromise([sug]);
        else if (window.MathJax?.typeset)   MathJax.typeset([sug]);
      } else {
        sug.textContent = meta.suggestionText;
        this.comment.appendChild(sug);
      }
    }
  }
}
