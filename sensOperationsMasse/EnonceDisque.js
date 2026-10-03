/*
 * EnonceDisque.js — « Sens des opérations (masse) »
 *
 * Des disques (plaques de métal identiques) entiers ou partagés en parts égales.
 * Colonne « Masse donnée » : dessin + « Masse : … g ».
 * Colonne « Masse cherchée » : dessin + « M = ? ».
 * L'élève écrit d'abord l'expression du calcul, puis calcule ligne à ligne
 * (moteur ObjetString / MathGrader repris de nombreProportionnalite).
 *
 * Niveaux (DISQUE_NIVEAUX), selon le nombre d'opérations du calcul le plus court :
 *   0. Échauffement — une seule opération :
 *      E1. k disques (k × m)   E2. 1/q (m : q)   E3. 1/q donné → 1 disque   E4. k disques donnés → 1 disque
 *   1. On connaît 1 disque — 2 opérations :
 *      A. p/q (p ≥ 2)                 (m : q) × p   ou   m − (m : q) s'il manque une part
 *      B. 1 + 1/q                     m + (m : q)
 *      C. 2 + 1/q (q ≤ 5)             (m : q) × (2q + 1)   (on compte les parts)
 *   2. On connaît 1 disque — 3 opérations :
 *      D. 1 + p/q (p ≥ 2)             m + ((m : q) × p)   ou   (2 × m) − (m : q)
 *      F. 2 ou 3 + (q−1)/q            (4 × m) − (m : q)
 *      G. 1/q1 + 1/q2                 (m : q1) + (m : q2)
 *   3. On cherche 1 disque :
 *      4. k + p/q donnés  (T : n) × q      5. p/q donné  (T : p) × q
 *   4. Mixte : niveaux 1, 2 et 3, à parts égales
 */

const DISQUE_NIVEAUX = {
  0: { nom: 'Échauffement', aide: 'une opération', types: ['E1', 'E2', 'E3', 'E4'] },
  1: { nom: 'Niveau 1', aide: 'on connaît 1 disque · 2 opérations', types: ['A', 'B', 'C'] },
  2: { nom: 'Niveau 2', aide: 'on connaît 1 disque · 3 opérations', types: ['D', 'F', 'G'] },
  3: { nom: 'Niveau 3', aide: 'on cherche 1 disque', types: [4, 5] },
  4: { nom: 'Mixte', aide: 'niveaux 1, 2 et 3 mélangés', melange: [1, 2, 3] }
};

/** Types d'un niveau (pour « Mixte » : réunion des niveaux mélangés) */
function typesDuNiveau(niveau) {
  const def = DISQUE_NIVEAUX[niveau];
  return def.melange ? def.melange.flatMap(n => DISQUE_NIVEAUX[n].types) : def.types;
}
const DISQUE_DENOMS = [2, 3, 4, 5, 6, 8, 10];
// Masses d'une part « rondes » : les calculs restent faciles
const DISQUE_PARTS_RONDES = [5, 10, 15, 20, 25, 30, 40, 50, 60, 75, 100, 150];

function disquePgcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }
function disquePpcm(a, b) { return a / disquePgcd(a, b) * b; }

/** Dessin SVG d'un disque : n parts grisées sur d (n = d = 1 → disque entier). */
function disqueSVG(n, d, r = 36) {
  const c = r + 2, taille = 2 * c;
  const gris = 'var(--disque-couleur, #f59f00)';
  let s = `<svg class="disque" viewBox="0 0 ${taille} ${taille}" width="${taille}" height="${taille}" aria-hidden="true">`;
  if (d === 1) {
    s += `<circle cx="${c}" cy="${c}" r="${r}" style="fill:${gris}" stroke="#222" stroke-width="1.5"/>`;
    return s + '</svg>';
  }
  s += `<circle cx="${c}" cy="${c}" r="${r}" fill="#fff" stroke="none"/>`;
  // Parts grisées : de l'angle 0 (à droite) dans le sens inverse des aiguilles d'une montre
  const pt = (k) => {
    const a = 2 * Math.PI * k / d;
    return [(c + r * Math.cos(a)).toFixed(2), (c - r * Math.sin(a)).toFixed(2)];
  };
  if (n >= d) {
    s += `<circle cx="${c}" cy="${c}" r="${r}" style="fill:${gris}"/>`;
  } else if (n > 0) {
    const [x0, y0] = pt(0), [x1, y1] = pt(n);
    const grandArc = (n / d) > 0.5 ? 1 : 0;
    s += `<path d="M ${c} ${c} L ${x0} ${y0} A ${r} ${r} 0 ${grandArc} 0 ${x1} ${y1} Z" style="fill:${gris}"/>`;
  }
  for (let k = 0; k < d; k++) {
    const [x, y] = pt(k);
    s += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#222" stroke-width="1.5"/>`;
  }
  s += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#222" stroke-width="1.5"/>`;
  return s + '</svg>';
}

/** pieces : [{n, d}] → suite de dessins */
function disquesSVG(pieces) {
  return pieces.map(p => disqueSVG(p.n, p.d)).join('');
}

class EnonceDisque extends Enonce {
  constructor(opts = {}) {
    super(opts);
    this.baseOptions = {
      affichageReponse: 'brut',
      modeCorrection: { nombreAff: 'auto', correction: { result: true, etapes: false } },
      policies: {
        memeType: true,
        egalite: { mode: 'numerique', unite: 'convertible', epsilon: 1e-6 },
        format: { nombre: 'dec', exigerAtome: true, exigerExpression: false },
        suite: {
          continuerSiInvalide: true,
          continuerSiInegale: true,
          continuerSiMauvaiseNature: true,
          continuerSiFormatIncorrect: true
        }
      }
    };
  }

  _fractionIrreductible(denoms = DISQUE_DENOMS, pMin = 1) {
    const q = this.rng.pick(denoms);
    const ps = [];
    for (let p = pMin; p < q; p++) if (disquePgcd(p, q) === 1) ps.push(p);
    if (!ps.length) return this._fractionIrreductible(denoms.filter(x => x !== q), pMin);
    return { n: this.rng.pick(ps), d: q };
  }

  /** Masse d'un disque, choisie pour des calculs simples (on travaille le sens, pas le calcul) :
   *  - sans part : multiple de 10, de 60 g à 250 g ;
   *  - une sorte de part (q) : la masse d'une part est un nombre rond (DISQUE_PARTS_RONDES) ;
   *  - deux sortes de parts : chaque part est un multiple de 5.
   *  Toujours entre 60 g et 300 g. */
  _masseDisque(denoms) {
    const choix = [];
    if (denoms.length === 0) {
      for (let m = 60; m <= 250; m += 10) choix.push(m);
    } else if (denoms.length === 1) {
      const q = denoms[0];
      for (const u of DISQUE_PARTS_RONDES) if (u * q >= 60 && u * q <= 300) choix.push(u * q);
    } else {
      const L = denoms.reduce((acc, q) => disquePpcm(acc, 5 * q), 1);
      for (let m = L; m <= 300; m += L) if (m >= 60) choix.push(m);
    }
    return this.rng.pick(choix.length ? choix : [60]);
  }

  /** « (m g : q) × p » (ou « m g : q » si p = 1), en syntaxe du moteur.
   *  Programme de 6e : tout est parenthésé, pas de priorités opératoires. */
  _partDe(m, f) {
    return f.n === 1 ? `${m}g:${f.d}` : `(${m}g:${f.d})*${f.n}`;
  }

  /** Même chose, entourée de parenthèses pour servir de terme d'une somme */
  _terme(m, f) {
    return `(${this._partDe(m, f)})`;
  }

  genVariant(index) {
    const so = this.sharedOptions || {};
    const niveau = DISQUE_NIVEAUX[so.niveau] !== undefined ? so.niveau : 1;
    const type = so.typeForce || this.rng.pick(typesDuNiveau(niveau));
    const UN = { n: 1, d: 1 };
    let donne, cherche, masseDonnee, reponse, etapes;

    switch (type) {
      case 'E1': { // k disques entiers
        const k = this.rng.int(2, 4);
        const m = this._masseDisque([]);
        donne = [UN]; cherche = Array(k).fill(UN);
        masseDonnee = m;
        reponse = k * m;
        etapes = [`${k}*${m}g`, `${reponse}g`];
        break;
      }
      case 'E2': { // 1/q de disque
        const q = this.rng.pick(DISQUE_DENOMS);
        const m = this._masseDisque([q]);
        donne = [UN]; cherche = [{ n: 1, d: q }];
        masseDonnee = m;
        reponse = m / q;
        etapes = [`${m}g:${q}`, `${reponse}g`];
        break;
      }
      case 'E3': { // 1/q donné → 1 disque
        const q = this.rng.pick(DISQUE_DENOMS);
        const m = this._masseDisque([q]);
        donne = [{ n: 1, d: q }]; cherche = [UN];
        masseDonnee = m / q;
        reponse = m;
        etapes = [`${m / q}g*${q}`, `${m}g`];
        break;
      }
      case 'E4': { // k disques donnés → 1 disque
        const k = this.rng.int(2, 4);
        const m = this._masseDisque([]);
        donne = Array(k).fill(UN); cherche = [UN];
        masseDonnee = k * m;
        reponse = m;
        etapes = [`${k * m}g:${k}`, `${m}g`];
        break;
      }
      case 'B': case 'C': case 'D': case 'F': { // k disques + p/q
        const grands = DISQUE_DENOMS.filter(q => q > 2);
        let k, f;
        if (type === 'B') { k = 1; f = { n: 1, d: this.rng.pick(DISQUE_DENOMS) }; }
        else if (type === 'C') { k = 2; f = { n: 1, d: this.rng.pick([2, 3, 4, 5]) }; } // × 5, 7, 9 ou 11
        else if (type === 'D') { k = 1; f = this._fractionIrreductible(grands, 2); }
        else { k = this.rng.int(2, 3); const d = this.rng.pick(grands); f = { n: d - 1, d }; }
        const m = this._masseDisque([f.d]);
        donne = [UN]; cherche = [...Array(k).fill(UN), f];
        masseDonnee = m;
        const part = m / f.d * f.n;
        reponse = k * m + part;
        if (type === 'C') {
          // 2 disques + 1 part : on compte les parts (2 opérations)
          const nb = k * f.d + 1;
          etapes = [`(${m}g:${f.d})*${nb}`, `${m / f.d}g*${nb}`, `${reponse}g`];
        } else if (f.d > 2 && f.n === f.d - 1) {
          // Il manque une part : un disque de plus, moins une part (2 opérations)
          etapes = [`(${k + 1}*${m}g)-(${m}g:${f.d})`, `${(k + 1) * m}g-${m / f.d}g`, `${reponse}g`];
        } else {
          const entiers = k === 1 ? `${m}g` : `(${k}*${m}g)`;
          etapes = [`${entiers}+${this._terme(m, f)}`];
          if (f.n > 1) etapes.push(`${k * m}g+(${m / f.d}g*${f.n})`);
          etapes.push(`${k * m}g+${part}g`);
          etapes.push(`${reponse}g`);
        }
        break;
      }
      case 'G': { // 1/q1 + 1/q2
        const f1 = { n: 1, d: this.rng.pick(DISQUE_DENOMS) };
        let f2;
        do { f2 = { n: 1, d: this.rng.pick(DISQUE_DENOMS) }; } while (f2.d === f1.d);
        const m = this._masseDisque([f1.d, f2.d]);
        donne = [UN]; cherche = [f1, f2];
        masseDonnee = m;
        const a = m / f1.d * f1.n, b = m / f2.d * f2.n;
        reponse = a + b;
        const unePart = (f, val) => f.n === 1 ? `${val}g` : `(${m / f.d}g*${f.n})`;
        etapes = [`${this._terme(m, f1)}+${this._terme(m, f2)}`];
        if (f1.n > 1 || f2.n > 1) etapes.push(`${unePart(f1, a)}+${unePart(f2, b)}`);
        etapes.push(`${a}g+${b}g`, `${reponse}g`);
        break;
      }
      case 'A': { // p/q avec p ≥ 2
        const f = this._fractionIrreductible(DISQUE_DENOMS.filter(q => q > 2), 2);
        const m = this._masseDisque([f.d]);
        donne = [UN]; cherche = [f];
        masseDonnee = m;
        reponse = m / f.d * f.n;
        etapes = (f.n === f.d - 1)
          // Il manque une part : le disque moins une part
          ? [`${m}g-(${m}g:${f.d})`, `${m}g-${m / f.d}g`, `${reponse}g`]
          : [this._partDe(m, f), `${m / f.d}g*${f.n}`, `${reponse}g`];
        break;
      }
      case 4: { // k + p/q donnés → 1 disque
        // On divise par le nombre total de parts : il doit rester ≤ 10
        let k, f;
        do {
          k = this.rng.int(1, 2);
          f = this._fractionIrreductible();
        } while (k * f.d + f.n > 10);
        const m = this._masseDisque([f.d]);
        const nbParts = k * f.d + f.n;
        const T = m / f.d * nbParts;
        donne = [...Array(k).fill(UN), f]; cherche = [UN];
        masseDonnee = T;
        reponse = m;
        etapes = [`(${T}g:${nbParts})*${f.d}`, `${T / nbParts}g*${f.d}`, `${m}g`];
        break;
      }
      case 5: { // p/q donné → 1 disque
        const f = this._fractionIrreductible(DISQUE_DENOMS.filter(q => q > 2), 2);
        const m = this._masseDisque([f.d]);
        const T = m / f.d * f.n;
        donne = [f]; cherche = [UN];
        masseDonnee = T;
        reponse = m;
        etapes = [`(${T}g:${f.n})*${f.d}`, `${T / f.n}g*${f.d}`, `${m}g`];
        break;
      }
    }
    return { type, donne, cherche, masseDonnee, reponse, etapes };
  }

  toQuestionData(v) {
    const options = JSON.parse(JSON.stringify(this.baseOptions));
    options.policies.format.uniteCible = { g: 1 };
    const question = `
      <div class="disque-consigne">Exprime puis calcule la masse $M$.</div>
      <div class="disque-tableau">
        <div class="disque-case">
          <div class="disque-titre">Masse donnée</div>
          <div class="disque-dessins">${disquesSVG(v.donne)}</div>
          <div class="disque-legende">Masse : $${v.masseDonnee}\\,\\text{g}$</div>
        </div>
        <div class="disque-case">
          <div class="disque-titre">Masse cherchée</div>
          <div class="disque-dessins">${disquesSVG(v.cherche)}</div>
          <div class="disque-legende">$M = \\,?$</div>
        </div>
      </div>`;
    return {
      question,
      expressionInitiale: `${v.reponse}g`,
      etapes: v.etapes,
      options
    };
  }

  buildExercise(zone, index, onRejet = null) {
    const variant = this.genVariant(index);
    const questionData = this.toQuestionData(variant, index);
    questionData.options.affichageAvecLettre = 'M';
    return new ExerciceDisque(zone, questionData, onRejet);
  }
}

/* ------------------------------------------------------------------
 * Saisie : accepte × x ÷ en plus de * et :
 * ------------------------------------------------------------------ */
function normaliserSaisieDisque(s) {
  return String(s)
    .replace(/[×·]/g, '*')
    .replace(/(\d)\s*[xX]\s*(?=[\d(])/g, '$1*')
    .replace(/\)\s*[xX]\s*(?=[\d(])/g, ')*')
    .replace(/g\s*[xX]\s*(?=[\d(])/g, 'g*')
    .replace(/÷/g, ':');
}

/* ------------------------------------------------------------------
 * Programme de 6e : pas de priorités opératoires, tout est parenthésé.
 * Dans chaque niveau de parenthèses : une seule opération, ou une suite
 * de + (ou de ×) seulement. « 180g:4*3 » ou « 2*180g+45g » sont refusés.
 * ------------------------------------------------------------------ */
function parenthesageComplet(tokens) {
  const groupeOk = (ops) => ops.length <= 1
    || (ops.every(o => o === ops[0]) && (ops[0] === '+' || ops[0] === '*'));
  const pile = [[]];
  for (const t of tokens || []) {
    if (t === '(') pile.push([]);
    else if (t === ')') {
      if (pile.length < 2 || !groupeOk(pile.pop())) return false;
    }
    else if (t === '+' || t === '-' || t === '*' || t === ':') pile[pile.length - 1].push(t);
  }
  return pile.length === 1 && groupeOk(pile[0]);
}

class InputWrapperDisque extends InputWrapper {
  constructor(...args) {
    super(...args);
    this.input.placeholder = "Écris l'expression ici";
  }
  appliquerVerdict(verdict) {
    // « Écris d'abord l'expression » : la masse est juste → « = » et non « ? » ni « ≠ »
    if (verdict.status === 'need_expression') {
      return super.appliquerVerdict({ ...verdict, status: 'ok' });
    }
    super.appliquerVerdict(verdict);
    // Ligne acceptée : pas de croix pour l'effacer
    if (verdict.status === 'ok') this.comment.querySelector('.close-button')?.remove();
  }

  handleKeydown(event) {
    if (event.key === 'Enter' && this.input) {
      this.input.value = normaliserSaisieDisque(this.input.value);
      if (typeof evalCount !== 'undefined') evalCount = 0;
    }
    super.handleKeydown(event);
  }
}

/* ------------------------------------------------------------------
 * Exercice : 1re ligne = une expression (pas directement le résultat),
 * messages courts, correction en plusieurs étapes.
 * ------------------------------------------------------------------ */
class ExerciceDisque extends ExerciceExpression {
  constructor(container, questionData, onRejet) {
    super(container, questionData, onRejet);
    const base = this.grader;
    this.grader = { evaluer: (ini, ans) => this._evaluerDisque(base, ini, ans) };
  }

  _evaluerDisque(base, ini, ans) {
    // Le moteur bloque tout au-delà de 10 000 évaluations depuis le chargement
    // de la page (garde-fou anti-boucle) : on remet le compteur à zéro à chaque saisie.
    if (typeof evalCount !== 'undefined') evalCount = 0;
    if (ans?.isValid?.() && !parenthesageComplet(ans.tokens)) {
      return { status: 'invalid_parse', meta: {}, message: 'Mets des parenthèses.' };
    }
    let v;
    try {
      v = base.evaluer(ini, ans);
    } catch (e) {
      // ex. « 180g+180:4 » : le moteur refuse d'additionner g et nombre
      return { status: 'wrong_nature', meta: {}, message: 'Mets g à chaque masse.' };
    }
    const nbOk = this._lignesOk || 0;

    if (v.status === 'correct' && nbOk === 0 && ans.arbre?.isAtome?.()) {
      // Valeur juste mais pas d'expression : signe « = » (c'est bien égal), ligne non retenue
      return { status: 'need_expression', meta: {}, message: "Écris d'abord l'expression." };
    }
    if (v.status === 'ok' || v.status === 'correct') {
      this._lignesOk = nbOk + 1;
      if (v.status === 'ok') v.message = "C'est la bonne expression.";
      return v;
    }
    if (v.status === 'wrong_nature') v.message = 'Mets l\u2019unité : g.';
    else if (v.status === 'unequal') v.message = "Ce n'est pas la masse cherchée.";
    else if (v.status === 'invalid_parse') v.message = 'Écriture non reconnue.';
    return v;
  }

  _createInputWrapper() {
    if (this.inputWrapper) this.inputWrapper.disable();
    this.inputWrapper = new InputWrapperDisque(
      this._getReferenceObjetForGrading(),
      this.reponseDiv,
      this.questionData.options
    );
    // « M = » réécrit à chaque ligne
    this.inputWrapper._prefixLetter = this._prefixLetter;
    this.inputWrapper.input.placeholder = (this._lignesOk || 0) === 0
      ? "Écris l'expression ici"
      : 'Continue le calcul';
    this._reindexPrefixes();
  }

  _reindexPrefixes() {
    const wrappers = Array.from(this.reponseDiv?.querySelectorAll('.input-wrapper') || []);
    wrappers.forEach((w, i) => {
      const inst = w.instance;
      if (!inst) return;
      inst.index = i + 1; // jamais de « = » fantôme
      if (typeof inst._buildPrefixe === 'function') inst._buildPrefixe();
    });
  }

  /** Abandon : correction affichée en Atelier, pas en Quiz */
  abandonner({ sansCorrection = false } = {}) {
    // On retire la ligne de saisie vide restée ouverte
    if (this.inputWrapper && !this.inputWrapper.currentAnswer) this.inputWrapper.wrapper.remove();
    if (!sansCorrection) this._correction();
    if (this.status !== 'correct') {
      this._finish('incorrect', { status: 'forced_by_correction' });
    }
  }

  _correction() {
    const host = this.correctionDiv;
    host.style.display = 'block';
    host.style.padding = '14px';
    host.innerHTML = '';
    (this.questionData.etapes || []).forEach((e, i) => {
      let tex = '';
      try { tex = new ObjetString(e, {}).arbre.toLatex({}); } catch { tex = e; }
      const line = document.createElement('div');
      line.className = 'etape';
      const prefix = document.createElement('span');
      prefix.className = 'etape-egal equal-sign';
      prefix.textContent = 'M\u00A0=';
      const expr = document.createElement('span');
      expr.className = 'etape-expr';
      expr.innerHTML = `\\(${tex}\\)`;
      line.append(prefix, expr);
      host.appendChild(line);
    });
    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([host]);
    } catch (e) { console.error(e); }
  }
}

window.EnonceDisque = EnonceDisque;
