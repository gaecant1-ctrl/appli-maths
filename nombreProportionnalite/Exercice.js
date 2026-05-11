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
    console.log(questionData);
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
    this.btnCorrection.textContent = 'Correction';
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
    this.reponseDiv.addEventListener('proposer-reponse', (e) => {
    e.stopPropagation();

    const { answer } = e.detail;

    const verdict = answer.isValid()
        ? this.grader.evaluer(this.objetInitial, answer)
        : {
            status: 'invalid_parse',
            message: answer.erreur || "Entrée invalide"
        };

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

    // --- LA LOGIQUE DE L'ERREUR ---
    // Si c'est 'ok', on ne compte pas d'erreur, on recrée juste un champ 
    // ou on attend que l'élève corrige son format.
    if (status !== 'ok') {
        this.tentativesEchouees++; 
        if (typeof this.onRejet === 'function') {
            this.onRejet(verdict);
        }
    }

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
    console.log("optionswrapper",this.options);
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
    const status = verdict?.status || 'invalid_parse';
    const answer = this.currentAnswer;

    // 1. Mise à jour du préfixe (=, ≠, ?)
    // On mappe les états techniques vers les états visuels du Prefixe
    let prefixStatus = 'incorrect';
    if (status === 'correct') prefixStatus = 'correct';
    if (status === 'ok')      prefixStatus = 'ok';
    if (status === 'invalid_parse') prefixStatus = 'invalide';

    this.prefix.options.statut = prefixStatus;
    this._buildPrefixe();

    // 2. Rendu LaTeX (si la réponse est mathématiquement exploitable)
    if (answer && answer.isValid() && status !== 'invalid_parse') {
        try {
            // On utilise les options de rendu si présentes
            const renderOptions = this.options.affichageReponse;
            console.log("renderOptions",renderOptions);
            let latex = answer.arbre.toLatex(renderOptions);
            
            const latexDiv = document.createElement('div');
            latexDiv.className = 'latex-formula';
            latexDiv.innerHTML = `\\(${latex}\\)`;

            if (this.input && this.input.parentNode) {
                this.input.style.display = 'none';
                this.left.appendChild(latexDiv);
            }
            if (window.MathJax?.typeset) MathJax.typeset([latexDiv]);
        } catch (e) {
            console.error("Erreur rendu LaTeX :", e);
        }
    }

    // 3. Affichage du commentaire
    this.displayComment(status, verdict);
}

displayComment(status, verdict) {
    // --- ZONE DE LOGS ---
    console.log("--- DEBUG FEEDBACK ---");
    console.log("STATUS :", status);
    console.log("VERDICT :", verdict);
    console.log("REASON :", verdict?.meta?.reason);
    console.log("----------------------");

    const meta = verdict?.meta || {};
    const className = (status === 'correct') ? 'success' : (status === 'ok') ? 'info' : 'error';
    this.comment.className = "comment " + className;
    
    let txt = "";

    // Test large pour capturer la "nature"
    const isWrongNature = (status === 'wrong_nature' || meta.reason === 'wrong_nature');

    if (status === 'correct') {
        txt = "✅ Bravo !";
    } else if (status === 'ok') {
        switch (meta.reason) {
            case 'need_expression_raw':   txt = "Valeur correcte, mais relis l'énoncé."; break;
            case 'number_format_mismatch': txt = "Format du nombre non conforme."; break;
            case 'wrong_unit':            txt = "L'unité n'est pas celle attendue."; break;
            case 'different_atoms':       txt = "OK, continue"; break;
            default:                      txt = "Valeur correcte (format à revoir).";
        }
    } else if (isWrongNature) {
        const attendu = meta.attendu || "unité";
        const obtenu = meta.obtenu || "nombre seul";
        txt = `Nature incorrecte (attendu : ${attendu}, obtenu : ${obtenu})`;
    } else if (status === 'invalid_parse') {
        txt = verdict?.message || "Format invalide.";
    } else {
        // Backup : si message n'existe pas, on cherche dans l'erreur ou on met un texte par défaut
        txt = verdict?.message || verdict?.error?.message || "Valeur incorrecte.";
    }

    // On force l'affichage même si txt est vide pour voir le bug
    this.comment.innerHTML = `<span>${txt || "ERREUR CRITIQUE : Texte vide"}</span>`;
    
    if (status !== 'correct') {
        const btn = document.createElement('span');
        btn.innerHTML = '✖';
        btn.className = 'close-button';
        btn.onclick = () => { this.wrapper.remove(); };
        this.comment.prepend(btn);
    }
}

  disable() {
    this._disabled = true;
    if (this.input) this.input.disabled = true;
  }
}



