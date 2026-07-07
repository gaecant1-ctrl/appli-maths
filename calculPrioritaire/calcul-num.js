/* ================================================================
   calcul-num.js — Évaluation d'expressions numériques exactes (Nombre)
   Dépend de Nombre.js (fractions exactes a/b), à charger AVANT ce fichier.

   API principale :
     evalNum(text)            → Nombre | null
     parseNum(text)           → ObjetStringNum (arbre + valeur)
     
   Alias de compatibilité descendants :
     evalMV(text)             → Nombre | null
     parseMV(text)            → ObjetStringNum
================================================================ */

'use strict';

const ZERO = Nombre.fromParts(0, 1, "entier");
const UN = Nombre.fromParts(1, 1, "entier");

function _versNombre(v) {
  if (v instanceof Nombre) return v;
  if (typeof v === "number") return Nombre.fromParts(v, 1, Number.isInteger(v) ? "entier" : "fraction");
  return new Nombre(String(v));
}

function _pourAffichage(n) {
  if (n.typeEcriture === 'entier' || n.typeEcriture === 'dec') return n;
  return n.simplify();
}

// ── Nœuds de l'arbre d'expression numérique ───────────────────

class _AtomeNum {
  constructor(raw) {
    this.instanceOptions = { parenthese: false };
    if (raw instanceof Nombre) {
      this._valeur = raw;
      this.raw = raw.toString();
    } else {
      this.raw = String(raw).trim();
      this._valeur = new Nombre(this.raw);
    }
  }

  evaluer() { return this._valeur; }

  toLatex(options = {}) {
    if (options.brut) {
      let inner = this.raw;
      if (inner.startsWith('(') && inner.endsWith(')')) inner = inner.slice(1, -1);
      return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
    }
    // Pas de parenthèse "auto" basée sur l'écriture source ici : un négatif
    // en tête d'expression (ou juste après une "(" réelle qui groupe déjà)
    // n'a besoin d'aucune parenthèse ("-5 + 3", jamais "(-5) + 3"). C'est au
    // parent (Somme/Produit/Différence/Quotient) de décider, selon la
    // POSITION du terme, s'il faut parenthéser un résultat négatif.
    const c = _pourAffichage(this._valeur);
    return c.toLatex();
  }
}

class _SommeNum {
  constructor(termes) {
    this.termes = termes;
    this.instanceOptions = { parenthese: false };
  }
  evaluer() {
    const [h, ...t] = this.termes.map(x => x.evaluer());
    return t.reduce((acc, v) => acc.add(v), h);
  }
  toLatex(options = {}) {
    if (this.termes.length === 0) return '0';
    let result = this.termes[0].toLatex(options);
    for (let i = 1; i < this.termes.length; i++) {
      const tex = this.termes[i].toLatex(options);
      if (options.brut) {
        result += ` + ${tex}`;
        continue;
      }
      const dejaParenthese = tex.startsWith('\\left(') && tex.endsWith('\\right)');
      const interieur = dejaParenthese ? tex.slice(6, -7) : tex;
      const estNegatif = interieur.startsWith('-');

      if (estNegatif && options.simplifie) {
        result += ` - ${interieur.slice(1)}`;
      } else if (estNegatif) {
        result += ` + \\left(${interieur}\\right)`;
      } else {
        result += ` + ${tex}`;
      }
    }
    return this.instanceOptions?.parenthese ? `\\left(${result}\\right)` : result;
  }
}

class _DifferenceNum {
  constructor(termes) {
    this.termes = termes;
    this.instanceOptions = { parenthese: false };
  }
  evaluer() { return this.termes[0].evaluer().sub(this.termes[1].evaluer()); }
  toLatex(options = {}) {
    const l = this.termes[0].toLatex(options);
    let r = this.termes[1].toLatex(options);

    if (options.brut) {
      if (r.startsWith('\\left(') && r.endsWith('\\right)')) r = r.slice(6, -7);
      if (this.termes[1].instanceOptions?.parenthese || this.termes[1].raw?.startsWith('(')) {
        r = `\\left(${r}\\right)`;
      }
    } else {
      const dejaParenthese = r.startsWith('\\left(') && r.endsWith('\\right)');
      if (!dejaParenthese && (r.startsWith('-') || this.termes[1] instanceof _SommeNum || this.termes[1] instanceof _DifferenceNum)) {
        r = `\\left(${r}\\right)`;
      }
    }
    const inner = `${l} - ${r}`;
    return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
  }
}

class _ProduitNum {
  constructor(termes, opts = {}) {
    this.termes = termes;
    this.instanceOptions = {
      parenthese: opts.parenthese ?? false,
      implicite:  opts.implicite  ?? false
    };
  }
  evaluer() {
    const [h, ...t] = this.termes.map(x => x.evaluer());
    return t.reduce((acc, v) => acc.mul(v), h);
  }
  toLatex(options = {}) {
    const sep = this.instanceOptions.implicite ? '' : ' \\times ';
    let textes = this.termes.map(t => t.toLatex(options));

    if (options.brut) {
      if (this.instanceOptions.implicite && this.termes[0] instanceof _AtomeNum && this.termes[0].raw === '-1') {
        textes[0] = '-';
      }
      const inner = textes.join(sep);
      return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
    }

    for (let i = 1; i < textes.length; i++) {
      if (textes[i].startsWith('\\left(') && textes[i].endsWith('\\right)')) continue;
      const risqueJuxtaposition = (textes[i - 1] !== '-') && this.instanceOptions.implicite && /^[0-9]/.test(textes[i]);
      if (risqueJuxtaposition || textes[i].startsWith('-')) {
        textes[i] = `\\left(${textes[i]}\\right)`;
      }
    }
    const inner = textes.join(sep);
    return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
  }
}

class _QuotientNum {
  constructor(termes, op = ':') {
    this.termes = termes;
    this.op = op;
    this.instanceOptions = { parenthese: false };
  }
  evaluer() {
    const num = this.termes[0].evaluer();
    const den = this.termes[1].evaluer();
    if (den.equal(ZERO)) throw new Error("Dénominateur nul");
    return num.div(den);
  }

  _denominateurEstPuissanceDeDix() {
    const den = this.termes[1].evaluer();
    if (!den.isEntier()) return false;
    let n = Math.abs(den.valeurNum.a / den.valeurNum.b);
    if (n < 1) return false;
    while (n > 1 && n % 10 === 0) n /= 10;
    return n === 1;
  }

  toLatex(options = {}) {
    if (this.op === '/' && !options.brut && options.nombreAff === 'dec' && this._denominateurEstPuissanceDeDix()) {
      const texVal = _pourAffichage(this.evaluer()).toLatex({ nombreAff: 'dec' });
      return this.instanceOptions?.parenthese ? `\\left(${texVal}\\right)` : texVal;
    }

    if (this.op === '/' && !options.brut && options.nombreAff === 'fractionSimple') {
      const val = this.evaluer();
      const negatif = val.valeurNum.a < 0;
      const texAbs = (negatif ? val.abs() : val).toLatex({ nombreAff: 'fractionSimple' });
      const texVal = negatif ? `-${texAbs}` : texAbs;
      return this.instanceOptions?.parenthese ? `\\left(${texVal}\\right)` : texVal;
    }

    let l = this.termes[0].toLatex(options);
    let r = this.termes[1].toLatex(options);

    if (this.op === '/') {
      let numTex = l;
      let signe = '';
      if (this.termes[0] instanceof _AtomeNum && !this.termes[0].instanceOptions?.parenthese) {
        if (this.termes[0].evaluer().valeurNum.a < 0 && numTex.startsWith('-')) {
          signe = '-';
          numTex = numTex.slice(1);
        }
      }
      const innerFrac = `${signe}\\frac{${numTex}}{${r}}`;
      return this.instanceOptions?.parenthese ? `\\left(${innerFrac}\\right)` : innerFrac;
    }

    if (this.termes[0] instanceof _SommeNum || this.termes[0] instanceof _DifferenceNum) {
      if (!(l.startsWith('\\left(') && l.endsWith('\\right)'))) {
        l = `\\left(${l}\\right)`;
      }
    }
    
    if (this.termes[1] instanceof _SommeNum || this.termes[1] instanceof _DifferenceNum || this.termes[1].raw?.startsWith('-')) {
      if (!(r.startsWith('\\left(') && r.endsWith('\\right)'))) {
        r = `\\left(${r}\\right)`;
      }
    }

    const innerDiv = `${l} : ${r}`;
    return this.instanceOptions?.parenthese ? `\\left(${innerDiv}\\right)` : innerDiv;
  }
}

class _PuissanceNum {
  constructor(termes) {
    this.termes = termes;
    this.instanceOptions = { parenthese: false };
  }
  evaluer() {
    const base = this.termes[0].evaluer();
    const exp = this.termes[1].evaluer();
    if (!exp.isEntier()) throw new Error("Exposant doit être un entier");
    return base.pow(exp.valeurNum.a / exp.valeurNum.b);
  }
  toLatex(options = {}) {
    const base = this.termes[0];
    const baseTexRaw = base.toLatex(options);
    const aDejaDesParentheses = baseTexRaw.startsWith('\\left(') && baseTexRaw.endsWith('\\right)');
    const aBesoinDeParentheses = !aDejaDesParentheses && (
      base.instanceOptions?.parenthese ||
      (!(base instanceof _AtomeNum) || baseTexRaw.startsWith('-'))
    );
    const baseTex = aBesoinDeParentheses ? `\\left(${baseTexRaw}\\right)` : baseTexRaw;
    return `${baseTex}^{${this.termes[1].toLatex(options)}}`;
  }
}

// ── Parseur ObjetStringNum ─────────────────────────────────────

class ObjetStringNum {
  constructor(expression) {
    this.expression = expression;
    this.erreur     = null;
    this.tokens     = this._tokeniser(expression);
    try {
      this.arbre = this._construireArbre();
    } catch (e) {
      this.arbre  = null;
      this.erreur = e.message;
    }
    this.valid = !this.erreur && !!this.arbre;
  }

  isValid() { return !!this.valid; }

  calculer() {
    if (!this.arbre) throw new Error(this.erreur || "Arbre invalide");
    return { resultat: this.arbre.evaluer() };
  }

  toLatex(options = {}) {
    if (!this.isValid() || !this.arbre) return this.expression;
    return this.arbre.toLatex(options);
  }

  _tokeniser(expr) {
    const s = String(expr);
    const out = [];
    const isSpace = c => /\s/.test(c);
    const isParen = c => c === '(' || c === ')';
    const isOp    = c => c === '+' || c === '-' || c === '*' || c === ':' || c === '/';
    const isAtomChar = c => /[0-9.,%]/.test(c);

    let i = 0;
    while (i < s.length) {
      while (i < s.length && isSpace(s[i])) i++;
      if (i >= s.length) break;
      const c = s[i];

      if (isParen(c)) {
        out.push(c);
        i++;
        continue;
      }
      if (isOp(c)) {
        out.push(c);
        i++;
        continue;
      }
      if (c === '^') {
        out.push('^');
        i++;
        continue;
      }
      if (isAtomChar(c)) {
        let k = i + 1;
        while (k < s.length && isAtomChar(s[k])) k++;
        out.push(s.slice(i, k));
        i = k;
        continue;
      }
      out.push(s[i++]);
    }
    return out;
  }

  _construireArbre() {
    const tokens = this.tokens;
    let idx = 0;

    const isOpToken = t => ['+', '-', '*', ':', '/', '^'].includes(t);
    const peek      = () => idx < tokens.length ? tokens[idx] : null;
    const estDebut  = () => {
      const t = peek();
      return !!t && t !== ')' && !isOpToken(t);
    };

    // NIVEAU 6 : Les Atomes et Parenthèses (Priorité maximale)
    const parseAtome = () => {
      if (idx >= tokens.length) throw new Error("Expression incomplète");
      const t = tokens[idx++];

      if (t === '(') {
        const expr = parseExpr();
        if (tokens[idx++] !== ')') throw new Error("Parenthèse non fermée");
        if (expr.instanceOptions) expr.instanceOptions.parenthese = true;
        return expr;
      }

      if (isOpToken(t) || t === ')') {
        throw new Error(`Erreur de syntaxe : symbole "${t}" inattendu.`);
      }

      return new _AtomeNum(t);
    };

    // NIVEAU 5 : Les Puissances (^) et Signes Unaires (-, +)
    const parsePow = () => {
      if (peek() === '-') {
        idx++;
        return negerNoeud(parsePow());
      }
      if (peek() === '+') {
        idx++;
        return parsePow();
      }

      const base = parseAtome();
      if (peek() === '^') {
        idx++;
        return new _PuissanceNum([base, parsePow()]);
      }
      return base;
    };

    // NIVEAU 4 : Les Fractions (/) - Priorité absolue sur le ":"
    const parseFraction = () => {
      let f = parsePow();
      while (idx < tokens.length && peek() === '/') {
        const op = tokens[idx++];
        f = new _QuotientNum([f, parsePow()], op);
      }
      return f;
    };

    // NIVEAU 3 : Les Divisions classiques (:)
    const parseFacteurDiv = () => {
      let f = parseFraction();
      while (idx < tokens.length && peek() === ':') {
        const op = tokens[idx++];
        f = new _QuotientNum([f, parseFraction()], op);
      }
      return f;
    };

    // NIVEAU 2 : Les Multiplications (* et implicites)
    const parseMulDiv = () => {
      let left = parseFacteurDiv();
      while (idx < tokens.length) {
        const t = peek();
        if (t === '*') {
          idx++;
          left = new _ProduitNum([left, parseFacteurDiv()], { implicite: false });
        } else if (estDebut()) {
          left = new _ProduitNum([left, parseFacteurDiv()], { implicite: true });
        } else break;
      }
      return left;
    };

    // NIVEAU 1 : Les Additions et Soustractions (+, -)
    const parseExpr = () => {
      let left = parseMulDiv();
      while (idx < tokens.length && (peek() === '+' || peek() === '-')) {
        const op = tokens[idx++];
        const right = parseMulDiv();
        if (op === '+') {
          left = (left instanceof _SommeNum && !left.instanceOptions?.parenthese)
            ? new _SommeNum([...left.termes, right])
            : new _SommeNum([left, right]);
        } else {
          left = new _DifferenceNum([left, right]);
        }
      }
      return left;
    };

    const negerNoeud = (noeud) => {
      if (noeud instanceof _AtomeNum) {
        return new _AtomeNum(noeud.evaluer().neg());
      }
      return new _ProduitNum([new _AtomeNum("-1"), noeud], { implicite: true });
    };

    const arbre = parseExpr();
    if (idx < tokens.length)
      throw new Error(`Tokens non parsés à partir de "${tokens[idx]}"`);
    return arbre;
  }
}

// ── Fonctions globales de confort & Alias de compatibilité ───

function evalNum(text) {
  try {
    const os = new ObjetStringNum(String(text).trim());
    if (!os.isValid()) return null;
    return os.calculer().resultat;
  } catch (e) { return null; }
}

function parseNum(text) {
  return new ObjetStringNum(String(text).trim());
}

function evalMV(text) {
  return evalNum(text);
}

function parseMV(text) {
  return parseNum(text);
}

// Sécurité pour l'exposition globale des APIs
if (typeof window !== 'undefined') {
  window.evalNum = evalNum;
  window.parseNum = parseNum;
  window.evalMV = evalMV;
  window.parseMV = parseMV;
}