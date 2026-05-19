// Classe Prefixe — centralise l’affichage lettre + signe (=, ≠, ?) + ghost + a11y
class Prefixe {
  constructor(container, options = {}) {
    if (!container) throw new Error('Prefixe: container requis');
    this.container = container;

    const {
      zone = 'response',
      index = 0,
      lettre = null,
      phase = 'attente',
      statut = 'pending',
    } = options;

    this.options = { zone, index, lettre, phase, statut };
    this.root = null;
    this.letterEl = null;
    this.signEl = null;
  }

  _symbolForStatut(s) {
    if (s === 'incorrect') return '≠';
    if (s === 'invalide')  return '?';
    return '=';
  }

  _stateClassForStatut(s) {
    if (s === 'incorrect') return 'state-incorrect';
    if (s === 'invalide')  return 'state-invalid';
    if (s === 'ok')        return 'state-ok';
    if (s === 'correct')   return 'state-correct';
    return null;
  }

  _ariaLabelForStatut(s) {
    if (s === 'incorrect') return 'Réponse incorrecte';
    if (s === 'invalide')  return 'Réponse invalide';
    if (s === 'ok')        return 'Format non conforme';
    if (s === 'correct')   return 'Réponse correcte';
    return null;
  }

  _shouldGhost(index, hasLetter) {
    return index === 0 && !hasLetter;
  }

  mount() {
    this.destroy();

    const { zone, index } = this.options;
    const rawLetter = (typeof this.options.lettre === 'string') ? this.options.lettre.trim() : null;
    const hasLetter = !!rawLetter;

    const root = document.createElement('span');
    root.className = 'prefix';
    root.classList.add(`prefix-${zone}`);
    root.style.display = 'inline-flex';
    root.style.alignItems = 'baseline';

    if (hasLetter) {
      const letterEl = document.createElement('span');
      letterEl.className = 'lhs-letter';
      letterEl.textContent = rawLetter;
      letterEl.style.display = 'inline-block';
      letterEl.style.minWidth = '1ch';
      letterEl.style.marginRight = '.35rem';
      root.appendChild(letterEl);
      this.letterEl = letterEl;
    }

    const signEl = document.createElement('span');
    signEl.className = 'equal-sign';
    signEl.style.display = 'inline-block';
    signEl.style.minWidth = '1ch';
    signEl.style.textAlign = 'center';
    signEl.style.marginRight = '.35rem';
    signEl.textContent = this._symbolForStatut(this.options.statut);

    const stateClass = this._stateClassForStatut(this.options.statut);
    if (stateClass) signEl.classList.add(stateClass);

    const aria = this._ariaLabelForStatut(this.options.statut);
    if (aria) signEl.setAttribute('aria-label', aria);

    const makeGhost = this._shouldGhost(index, hasLetter);
    if (makeGhost) {
      signEl.classList.add('ghost-equal');
      signEl.setAttribute('aria-hidden', 'true');
    } else {
      signEl.setAttribute('aria-hidden', 'false');
    }

    root.appendChild(signEl);
    this.container.insertBefore(root, this.container.firstChild || null);

    this.root = root;
    this.signEl = signEl;
  }

  destroy() {
    if (this.root && this.root.parentNode) {
      try { this.root.parentNode.removeChild(this.root); } catch (_) {}
    }
    this.root = null;
    this.letterEl = null;
    this.signEl = null;
  }
}

// ===== Classe abstraite mère =====
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

  _render() { throw new Error("_render() doit être implémentée dans la sous-classe."); }
  _setupEvents() {}
  _genererQuestion() { throw new Error("_genererQuestion() doit être implémentée dans la sous-classe."); }
  valider() { throw new Error("valider() doit être implémentée dans la sous-classe."); }
  test(reponse) { throw new Error("test() doit être implémentée dans la sous-classe."); }

  points() { return this.status === "correct" ? 1 : 0; }

  _emitValidation() {
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

// ===== ExerciceExpression =====
class ExerciceExpression extends Exercice {
  constructor(container, questionData, onRejetCallback = null) {
    super(container);
    this.questionData = questionData;
    //console.log(questionData);
    this.onRejet = onRejetCallback; // Callback vers le Quiz
    
    this.policies = normalizePolicies(this.questionData?.options?.policies || (window.REGLES?.strict || {}));
    this._prefixLetter = null;
    this.tentativesEchouees = 0; 

    // 2. ON INSTANCIE LE MOTEUR ICI
    this.grader = new MathGrader(this.policies);

    this.question = questionData.question;
    this.expressionInitiale = questionData.expressionInitiale;
    //console.log("creation de l'exercice");
    try {
      if (this.expressionInitiale) {
        this.objetInitial = new ObjetString(
          this.expressionInitiale,
          this.questionData.options
        );
        //console.log("creation objet",this.objetInitial);
      }
    } catch (e) {
      //console.log("creation objet impossible");
      //console.error("Erreur ObjetString :", e);
    }

    this.status = null;
    this._render();
    this._genererQuestion();
  }

  _correction() {
      if (this.btnCorrection) this.btnCorrection.remove();
      if (this.actionsDiv) this.actionsDiv.remove();
      
      const host = this.correctionDiv;
      host.style.display = 'block';
      host.style.padding = '14px';
      host.innerHTML = '';

      const mc = this.questionData?.options?.modeCorrection || {};
      const corr = mc.correction || {};
      // On cherche l'expression de référence
      const exprStr = (typeof corr.expression === 'string' && corr.expression.trim()) 
          ? corr.expression.trim() 
          : this.expressionInitiale;

      let refObj;
      try { 
          refObj = new ObjetString(exprStr, mc); 
      } catch { 
          refObj = this.objetInitial; 
      }

      const addLine = (latex, showEqual) => {
        const tex = String(latex || '').trim();
        if (!tex) return;
        const line = document.createElement('div');
        line.className = 'etape';
        const prefix = document.createElement('span');
        prefix.className = 'etape-egal equal-sign';
        // Gère l'affichage de "A =" ou juste "="
        prefix.textContent = this._prefixLetter ? `${this._prefixLetter}\u00A0=` : '='; 
        if (!this._prefixLetter && !showEqual) prefix.classList.add('is-hidden');
        line.appendChild(prefix);
        const expr = document.createElement('span');
        expr.className = 'etape-expr';
        expr.innerHTML = `\\(${tex}\\)`;
        line.appendChild(expr);
        host.appendChild(line);
      };

      // Génération des étapes de calcul
      if (corr.etapes !== false) {
        let etapes = [];
        try { 
            etapes = refObj.calculerLatex().etapes; 
        } catch { 
            etapes = [refObj?.arbre?.toLatex?.(mc) || '']; 
        }
        etapes.forEach((l, idx) => addLine(l, idx !== 0));
      }

      // Résultat final
      if (corr.result !== false) {
        let res = '';
        try { 
            res = refObj.calculer().resultat?.toLatex?.(mc) || ''; 
        } catch {}
        if (res) addLine(res, true);
      }

      if (window.MathJax?.typeset) MathJax.typeset([host]);
    }

  _getLHSLetter() {
    const raw = this.questionData?.options?.affichageAvecLettre;
    return (typeof raw === 'string' && raw.trim() !== '') ? raw.trim() : null;
  }

  _getReferenceObjetForGrading() {
    const mc = this.questionData?.options?.modeCorrection || {};
    const corr = mc.correction || {};
    const exprStr = (typeof corr.expression === 'string' && corr.expression.trim())
      ? corr.expression
      : this.expressionInitiale;

    if (exprStr) {
      try { return new ObjetString(exprStr, mc); } catch {}
    }
    return this.objetInitial;
  }

_render() {
    this.container.innerHTML = '';

    this.questionDiv = document.createElement('div');
    this.questionDiv.className = 'question';
    this.container.appendChild(this.questionDiv);

    this.initialDiv = document.createElement('div');
    this.initialDiv.className = 'initial-zone';
    this.container.appendChild(this.initialDiv);

    this.reponseDiv = document.createElement('div');
    this.reponseDiv.className = 'reponse';
    this.container.appendChild(this.reponseDiv);

    this.actionsDiv = document.createElement('div');
    this.actionsDiv.className = 'bouton-correction';
    this.container.appendChild(this.actionsDiv);

    this.btnCorrection = document.createElement('button');
    this.btnCorrection.textContent = 'Abandon';
    this.btnCorrection.className = 'btn-correction';
    this.btnCorrection.addEventListener('click', () => {
        this._correction();
        if (this.status !== 'correct') {
            this._finish('incorrect', { status: 'forced_by_correction' });
        }
    });
    this.actionsDiv.appendChild(this.btnCorrection);

    this.correctionDiv = document.createElement('div');
    this.correctionDiv.className = 'correction-content';
    this.container.appendChild(this.correctionDiv);

    // === LE SEUL ÉCOUTEUR QUI SURVIT À TOUT ===
// DANS ExerciceExpression.js (méthode _render)
this.reponseDiv.addEventListener('proposer-reponse', (e) => {
    e.stopPropagation();
    const { answer } = e.detail;

    // ON SUPPRIME LA CONDITION answer.isValid() ICI.
    // On laisse le Grader décider de tout.
    const verdict = this.grader.evaluer(this.objetInitial, answer);

    this.inputWrapper.appliquerVerdict(verdict);
    this._onGradeResult({ detail: verdict });
});


}

_genererQuestion() {
    this.questionDiv.innerHTML = this.questionData?.question || ''; 
    this.initialDiv.innerHTML = '';
    this.reponseDiv.innerHTML = '';

    this._prefixLetter = this._getLHSLetter();

    if (this.expressionInitiale && (this.questionData?.options?.affichageInitial?.expressionInitiale === true)) {
      const wrap = document.createElement('div');
      wrap.className = 'initial-wrapper';
      const left = document.createElement('div');
      left.className = 'left-part';
      wrap.appendChild(left);

      new Prefixe(left, {
        zone: 'initial', index: 0, lettre: this._prefixLetter, phase: 'attente', statut: 'pending',
      }).mount();

      const expr = document.createElement('div');
      expr.className = 'latex-formula';
      left.appendChild(expr);
      this.initialDiv.appendChild(wrap);

      try {
        const affInit = this.questionData?.options?.affichageInitial ?? {};
        const latex = this.objetInitial?.arbre?.toLatex?.(affInit) || '';
        expr.innerHTML = latex ? `$${latex}$` : '';
        if (window.MathJax?.typeset) MathJax.typeset([expr]);
      } catch (e) { console.error('Erreur LaTeX :', e); }
      this.initialWrapper = { index: 0 };
    }

    if (window.MathJax?.typeset) MathJax.typeset([this.questionDiv]);
    this._createInputWrapper();
  }

_createInputWrapper() {
    if (this.inputWrapper) this.inputWrapper.disable();
    
    // On crée l'input, il va "buller" vers reponseDiv qui écoute déjà (voir _render)
    this.inputWrapper = new InputWrapper(
        this._getReferenceObjetForGrading(), 
        this.reponseDiv, 
        this.questionData.options
    );

    this.inputWrapper._prefixLetter = this._prefixLetter;
    this._reindexPrefixes();
}

_reindexPrefixes() {
    let base = 0;
    if (this.initialWrapper) { base = 1; }
    const wrappers = Array.from(this.reponseDiv?.querySelectorAll('.input-wrapper') || []);
    wrappers.forEach((w, i) => {
      const inst = w.instance;
      if (!inst) return;
      inst.index = base + i;
      if (typeof inst._buildPrefixe === 'function') inst._buildPrefixe();
    });
  }

_onGradeResult(e) {
    const verdict = e.detail || {};
    const status = verdict.status || 'invalid_parse';

    if (status === 'correct') {
        this._finish('correct', verdict);
        return;
    }

    // Si ce n'est pas un simple problème de format ('ok'), on compte une erreur
    if (status !== 'ok') {
        this.tentativesEchouees++; 
        if (typeof this.onRejet === 'function') this.onRejet(verdict);
    }

    // On décide de la suite
    if (this._shouldContinue(status)) {
        this._createInputWrapper();
    } else {
        this._finish('incorrect', verdict);
    }
}

  _finish(s, v) {
  this.status = s;
  if (this.inputWrapper) this.inputWrapper.disable();
  
  const detail = { 
    status: s, 
    points: (s === 'correct' ? 1 : 0), 
    exercice: this, 
    verdict: v 
  };

  // On l'envoie sur le container
  this.container.dispatchEvent(new CustomEvent("reponseValidee", {
    detail: detail,
    bubbles: true,      // Permet de remonter les parents
    composed: true      // Traverse le Shadow DOM si besoin
  }));

  // SÉCURITÉ : On l'envoie aussi sur la zone d'exercice spécifique
  // au cas où le Quiz écoute l'élément parent direct.
  if (this.container.parentNode) {
      this.container.parentNode.dispatchEvent(new CustomEvent("reponseValidee", {
          detail: detail,
          bubbles: true
      }));
  }
}

_shouldContinue(status) {
    const s = this.policies?.suite || {};
    
    // Si c'est juste, on s'arrête toujours
    if (status === 'correct') return false;

    // Mapping des comportements selon les règles métier
    const rules = {
        'invalid_parse': s.continuerSiInvalide,
        'wrong_nature':  s.continuerSiMauvaiseNature,
        'unequal':       s.continuerSiInegale,
        'ok':            true // En général, si c'est 'ok' (presque bon), on laisse corriger
    };

    return rules[status] ?? !!s.continuerSiFormatIncorrect;
}


}



class InputWrapper {
  constructor(expressionObj, container, options, onRejet = null) {
    this.expressionObj = expressionObj;
    this.container = container;
    this.options = options || {};
   // console.log("optionswrapper",this.options);
    this.policies = normalizePolicies(this.options.policies || (window.REGLES?.strict || {}));

    this.wrapper = document.createElement('div');
    this.wrapper.classList.add('input-wrapper');
    this.wrapper.instance = this;

    this.left = document.createElement('div');
    this.left.classList.add('left-part');
    this.wrapper.appendChild(this.left);

    this.index = null;
    this._buildPrefixe();
    
    this.input = document.createElement('input');
    this.input.type = "text";
    this.input.placeholder = "Écris ta réponse ici";
    this.input.classList.add('input-wrapper-input');
    this.left.appendChild(this.input);

    this.comment = document.createElement('div');
    this.comment.classList.add('comment');
    this.wrapper.appendChild(this.comment);

    this.container.appendChild(this.wrapper);

    this._disabled = false;
    this.input.addEventListener("keydown", (e) => this.handleKeydown(e));
    this.input.addEventListener("keyup", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
    }
});
    this.input.focus();
  }

  _buildPrefixe() {
    const wantedStatut = (this.prefix?.options?.statut) || 'pending';
    if (this.prefix) this.prefix.destroy();
    this.prefix = new Prefixe(this.left, {
      zone: 'response',
      index: (this.index || 0),
      lettre: this._prefixLetter || null,
      phase: wantedStatut === 'pending' ? 'attente' : 'evaluation',
      statut: wantedStatut,
    });
    this.prefix.mount();
  }

handleKeydown(event) {
    if (event.key !== "Enter") return;

    event.preventDefault(); 
    event.stopPropagation();

    const raw = this.input.value.trim();
    if (!raw) return;

    const answer = new ObjetString(raw, this.options);

    this.currentAnswer = answer;

    // IMPORTANT :
    // même invalide, on envoie au pipeline principal
    this.container.dispatchEvent(new CustomEvent('proposer-reponse', {
        detail: { answer },
        bubbles: true
    }));
}

appliquerVerdict(verdict) {
    const { status, message } = verdict;

    // 1. Icone du préfixe
    const map = { 'correct': 'correct', 'ok': 'ok', 'invalid_parse': 'invalide' };
    this.prefix.options.statut = map[status] || 'incorrect';
    this._buildPrefixe();

    // 2. Rendu LaTeX (inchangé)
    if (this.currentAnswer?.isValid() && status !== 'invalid_parse') {
        try {
            let latex = this.currentAnswer.arbre.toLatex({nombreAff :this.options.affichageReponse});
            const latexDiv = document.createElement('div');
            latexDiv.className = 'latex-formula';
            latexDiv.innerHTML = `\\(${latex}\\)`;
            if (this.input) {
                this.input.style.display = 'none';
                this.left.appendChild(latexDiv);
            }
            if (window.MathJax?.typeset) MathJax.typeset([latexDiv]);
        } catch (e) { console.error(e); }
    }

    // 3. Affichage du message préparé par le Grader
    this.displayComment(status, message);
}

displayComment(status, message) {
    const className = (status === 'correct') ? 'success' : (status === 'ok') ? 'info' : 'error';
    this.comment.className = "comment " + className;
    this.comment.innerHTML = `<span>${message}</span>`;
    
    if (status !== 'correct') {
        const btn = document.createElement('span');
        btn.innerHTML = '✖';
        btn.className = 'close-button';
        
        btn.onclick = () => { 
            // AU LIEU DE : this.comment.style.display = 'none';
            // ON FAIT :
            this.wrapper.remove(); // Supprime tout le bloc (Input + Prefix + Comment)
        };
        
        this.comment.prepend(btn);
    }
    this.comment.style.display = 'block';
}

  disable() {
    this._disabled = true;
    if (this.input) this.input.disabled = true;
  }
}

