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

  _render() {
    throw new Error("_render() doit être implémentée dans la sous-classe.");
  }

  _setupEvents() {}
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

class ExerciceExpression extends Exercice {
  constructor(container, questionData) {
    super(container);
    this.questionData = questionData;
    this.policies = normalizePolicies(this.questionData?.options?.policies || (window.REGLES?.strict || {}));
    this._lastVerdict = null;

    this.question = questionData.question;
    this.expressionInitiale = questionData.expressionInitiale;
    try {
      this.objetInitial = new ObjetString(
        this.expressionInitiale,
        this.questionData.options.modeCorrection
      );
    } catch (e) { console.error("Erreur ObjetString :", e); }

    this.status = null;
    this._render();
    this._genererQuestion();
  }

  // --------- helpers ---------
_getLHSLetter() {
  const raw = this.questionData?.options?.affichageAvecLettre;
  return (typeof raw === 'string' && raw.trim() !== '') ? raw.trim() : null;
}


  _getReferenceObjetForGrading() {
    const mc   = this.questionData?.options?.modeCorrection || {};
    const corr = mc.correction || {};
    const exprStr = (typeof corr.expression === 'string' && corr.expression.trim()) ? corr.expression : null;
    if (exprStr) {
      try { return new ObjetString(exprStr, mc); } catch {}
    }
    return this.objetInitial;
  }

  // --------- render ---------
_render() {
  this.container.innerHTML = '';

  // Question
  this.questionDiv = document.createElement('div');
  this.questionDiv.className = 'question';
  this.container.appendChild(this.questionDiv);

  // Énoncé initial
  this.initialDiv = document.createElement('div');
  this.initialDiv.className = 'initial-zone';
  this.container.appendChild(this.initialDiv);

  // Zone réponses (wrappers)
  this.reponseDiv = document.createElement('div');
  this.reponseDiv.className = 'reponse';
  this.container.appendChild(this.reponseDiv);

  // Bouton correction
  this.actionsDiv = document.createElement('div');
  this.actionsDiv.className = 'bouton-correction';
  this.container.appendChild(this.actionsDiv);

  this.btnCorrection = document.createElement('button');
  this.btnCorrection.textContent = 'Correction';
  this.btnCorrection.className = 'btn-correction';
  this.btnCorrection.addEventListener('click', () => {
    if (this.inputWrapper) this.inputWrapper.disable();
    this._correction();  // supprime le bouton + affiche avec animation
    if (!this.status) this._finish('incorrect', { status: 'forced_by_correction' });
  });
  this.actionsDiv.appendChild(this.btnCorrection);

  // Conteneur unique de correction (vide au départ, donc masqué par :empty)
  this.correctionDiv = document.createElement('div');
  this.correctionDiv.className = 'correction-content';
  // S'assure qu'il n'est pas en état ouvert au départ
  this.correctionDiv.classList.remove('is-open');
  this.container.appendChild(this.correctionDiv);

  // Écoutes internes
  this.reponseDiv.addEventListener('wrapperRemoved', () => this._updateEqualSigns());
  this.reponseDiv.addEventListener('equalSignsMaybeUpdate', () => this._updateEqualSigns());
  this.reponseDiv.addEventListener('gradeResult', (e) => this._onGradeResult(e));
}



_genererQuestion() {
  this.questionDiv.textContent = this.questionData?.question || '';

  this.initialDiv.innerHTML = '';
  const lhs = (typeof this._getLHSLetter === 'function') ? this._getLHSLetter() : null;

  if (this.questionData?.options?.affichage?.initial?.expression === true ||
      this.questionData?.options?.affichageInitial?.expressionInitiale === true) {

    const wrap = document.createElement('div');
    wrap.className = 'initial-wrapper';

    const left = document.createElement('div');
    left.className = 'left-part';
    wrap.appendChild(left);

    // Lettre (optionnelle)
    if (lhs) {
      const letter = document.createElement('span');
      letter.className = 'lhs-letter';
      letter.textContent = lhs;
      letter.style.display = 'inline-block';
      letter.style.minWidth = '1ch';
      letter.style.marginRight = '.35rem';
      left.appendChild(letter);
    }

    // Signe "="
    const eq = document.createElement('span');
    eq.textContent = '=';
    eq.classList.add('equal-sign');
    eq.style.display = 'inline-block';
    eq.style.minWidth = '1ch';
    eq.style.textAlign = 'center';
    eq.style.marginRight = '.35rem';
    if (!lhs) eq.classList.add('ghost-equal'); // "=" fantôme si pas de lettre
    left.appendChild(eq);

    const expr = document.createElement('div');
    expr.className = 'latex-formula';
    left.appendChild(expr);

    this.initialDiv.appendChild(wrap);

    try {
      const affInit = this.questionData?.options?.affichageInitial
                   ?? this.questionData?.options?.affichage?.initial
                   ?? {};
      const latex = this.objetInitial?.arbre?.toLatex?.(affInit) || '';
      expr.innerHTML = latex ? `$${latex}$` : '';
      if (window.MathJax?.typeset) MathJax.typeset([expr]);
    } catch (e) {
      console.error('Erreur LaTeX :', e);
    }
  }

  this.reponseDiv.innerHTML = '';
  this._createInputWrapper();
  this._updateEqualSigns(); // aligne le 1er "=" selon l'énoncé/lettre
}


_updateEqualSigns() {
  const showInitial =
    this.questionData?.options?.affichageInitial?.expressionInitiale === true;
  const lhs = (typeof this._getLHSLetter === 'function') ? this._getLHSLetter() : null;

  const wrappers = Array.from(this.reponseDiv.querySelectorAll('.input-wrapper'));
  wrappers.forEach((w, i) => {
    const eq = w.querySelector('.equal-sign');
    if (!eq) return;
    const isGhost = (i === 0 && !showInitial && !lhs);
    eq.classList.toggle('ghost-equal', isGhost);
    eq.setAttribute('aria-hidden', isGhost ? 'true' : 'false');
  });
}


  _createInputWrapper() {
    if (this.inputWrapper) this.inputWrapper.disable();
    const refObj = this._getReferenceObjetForGrading();
    this.inputWrapper = new InputWrapper(refObj, this.reponseDiv, this.questionData.options);
    this._updateEqualSigns();
  }

  // --------- correction ---------
// Dans class ExerciceExpression
// Dans class ExerciceExpression
_correction() {
  // 1) Retirer le bouton/ligne pour libérer l’espace
  if (this.btnCorrection) { try { this.btnCorrection.remove(); } catch {} this.btnCorrection = null; }
  if (this.actionsDiv && this.actionsDiv.parentNode) {
    this.actionsDiv.parentNode.removeChild(this.actionsDiv);
  }
  this.actionsDiv = null;

  // 2) Conteneur unique de correction (créé si besoin)
  const host = this.correctionDiv || (() => {
    const d = document.createElement('div');
    d.className = 'correction-content';
    this.container.appendChild(d);
    this.correctionDiv = d;
    return d;
  })();

  // >>> Désactive toute animation/transition et force l’affichage complet
  host.classList.remove('is-open');      // au cas où
  host.style.transition = 'none';
  host.style.animation = 'none';
  host.style.maxHeight = 'none';
  host.style.opacity = '1';
  host.style.transform = 'none';
  host.style.display = 'block';          // visible même si :empty retiré
  host.style.padding = '14px';           // padding normal
  host.innerHTML = '';

  // 3) Options
  const mc   = this.questionData?.options?.modeCorrection || {};
  const corr = mc.correction || {};

  const hasExpr = (typeof corr.expression === 'string' && corr.expression.trim().length > 0);
  const exprStr = hasExpr ? corr.expression.trim() : this.expressionInitiale;

  // Fallback : si AUCUNE des 3 clés n’est fournie → (etapes:true, result:true)
  const hasEtapes = Object.prototype.hasOwnProperty.call(corr, 'etapes');
  const hasResult = Object.prototype.hasOwnProperty.call(corr, 'result');
  const noCustom  = !hasExpr && !hasEtapes && !hasResult;

  const showSteps = noCustom ? true : !!corr.etapes;
  const showRes   = noCustom ? true : !!corr.result;

  const labels = {
    steps:  corr.labelEtapes   || 'Correction étape par étape',
    result: corr.labelResultat || corr.labelReponse || 'Réponse'
  };

  // 4) Objet de référence
  let refObj;
  try { refObj = new ObjetString(exprStr, mc); }
  catch { refObj = this.objetInitial; }

  // 5) Helpers (écrivent directement dans host)
  const addH3 = (txt) => {
    const h = document.createElement('h3');
    h.textContent = txt;
    h.style.margin = '6px 0 8px';
    h.style.textAlign = 'center';
    host.appendChild(h);
  };

  const lhs =
    (typeof this._getLHSLetter === 'function')
      ? this._getLHSLetter()
      : ((t => (typeof t === 'string' && t.trim() !== '') ? t.trim() : null)
          (this.questionData?.options?.affichageAvecLettre));

  // Une ligne = préfixe ("A =" ou "=") + expression
  const addLine = (latex, showEqual) => {
    const tex = String(latex || '').trim();
    if (!tex) return;

    const line = document.createElement('div');
    line.className = 'etape';

    const prefix = document.createElement('span');
    prefix.className = 'etape-egal equal-sign';
    const show = lhs ? true : !!showEqual;          // avec lettre → toujours visible
    prefix.textContent = lhs ? `${lhs}\u00A0=` : '='; // espace insécable
    if (!show) prefix.classList.add('is-hidden');
    line.appendChild(prefix);

    const expr = document.createElement('span');
    expr.className = 'etape-expr';
    expr.innerHTML = `\\(${tex}\\)`;
    line.appendChild(expr);

    host.appendChild(line);
  };

  // 6) Remplissage
  let somethingAdded = false;

  if (showSteps) {
    addH3(labels.steps);
    let etapesLatex = [];
    try {
      const out = refObj.calculerLatex();
      etapesLatex = Array.isArray(out?.etapes) ? out.etapes : [];
    } catch {
      etapesLatex = [ refObj?.arbre?.toLatex?.(mc) || '' ];
      const warn = document.createElement('div');
      warn.className = 'resultat invalide';
      warn.textContent = '(Étapes indisponibles)';
      host.appendChild(warn);
    }
    etapesLatex.forEach((latex, idx) => { addLine(latex, idx !== 0); somethingAdded = true; });
  }

  if (showRes) {
    addH3(labels.result);
    let finalLatex = '';
    try { finalLatex = refObj.calculer().resultat?.toLatex?.(mc) || ''; } catch {}
    if (!finalLatex) finalLatex = refObj?.arbre?.toLatex?.(mc) || '';
    addLine(finalLatex, !!showSteps);
    somethingAdded = true;
  }

  if (!somethingAdded) {
    addH3(labels.result);
    const initLatex = refObj?.arbre?.toLatex?.(mc) || '';
    addLine(initLatex, false);
  }

  // 7) Typeset (sans animation, sans reflow spécial)
  try {
    if (window.MathJax?.typesetPromise) MathJax.typesetPromise([host]).catch(()=>{});
    else if (window.MathJax?.typeset)   MathJax.typeset([host]);
  } catch {}
}





  // --------- verdict / suite ---------
  _shouldContinue(verdictStatus) {
    const s = this.policies?.suite || {};
    const contFmt = (typeof s.continuerSiFormatIncorrect === 'boolean')
      ? s.continuerSiFormatIncorrect
      : true;

    if (verdictStatus === 'correct')       return false;
    if (verdictStatus === 'invalid_parse') return !!s.continuerSiInvalide;
    if (verdictStatus === 'wrong_nature')  return !!s.continuerSiMauvaiseNature;
    if (verdictStatus === 'unequal')       return !!s.continuerSiInegale;
    if (verdictStatus === 'ok')            return contFmt;
    return false;
  }

  _finish(finalStatus, verdict) {
    this.status = finalStatus;
    this.inputWrapper?.disable();
    this._emitValidationWithVerdict(verdict);
  }

  _emitValidationWithVerdict(verdict) {
    const event = new CustomEvent("reponseValidee", {
      detail: {
        status: this.status,
        points: this.points ? this.points() : 0,
        exercice: this,
        verdict: verdict || null
      },
      bubbles: true,
      composed: true
    });
    this.container.dispatchEvent(event);
  }

  _onGradeResult(e) {
    const verdict = e.detail || {};
    const status  = verdict.status || 'invalid_parse';

    if (status === 'correct') {
      this._finish('correct', verdict);
      return;
    }

    const continuer = this._shouldContinue(status);
    if (continuer) {
      this._createInputWrapper();
    } else {
      this._finish('incorrect', verdict);
    }
  }
}


