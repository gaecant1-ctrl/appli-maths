/* ================================================================
   calcul-mv.js — Polynômes multivariés à coefficients entiers
   Autonome (aucune dépendance externe).

   API principale :
     evalMV(text)             → PolynomeMV | null
     parseMV(text)            → ObjetStringMV (arbre + poly)
     estProduit(arbre)        → boolean   (racine = produit ou atome)
     facteursSommes(arbre)    → _SommeMV[]  (sommes directement dans le produit)
     p1.equal(p2)             → boolean (égalité algébrique exacte)
     p.facteurCommun()        → { coeff, degres } | null
================================================================ */

'use strict';

// ── Utilitaire ─────────────────────────────────────────────────

function _gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a === 0 ? 1 : a;
}

// ── Monome ─────────────────────────────────────────────────────

class Monome {
  constructor(coeff, degres = {}) {
    this.coeff = Math.trunc(coeff);
    this.degres = Object.fromEntries(
      Object.entries(degres).filter(([, d]) => Number.isInteger(d) && d > 0)
    );
  }

  signature() {
    return Object.keys(this.degres).sort()
      .map(v => this.degres[v] === 1 ? v : `${v}^${this.degres[v]}`)
      .join('');
  }

  mul(other) {
    const d = { ...this.degres };
    for (const [v, n] of Object.entries(other.degres))
      d[v] = (d[v] || 0) + n;
    return new Monome(this.coeff * other.coeff, d);
  }

  neg()    { return new Monome(-this.coeff, { ...this.degres }); }
  scale(k) { return new Monome(this.coeff * k, { ...this.degres }); }

  /** LaTeX de la valeur absolue (le signe est géré par PolynomeMV.toLatex). */
  toLatex() {
    const c    = Math.abs(this.coeff);
    const vars = Object.keys(this.degres).sort()
      .map(v => this.degres[v] === 1 ? v : `${v}^{${this.degres[v]}}`)
      .join('');
    if (!vars)   return String(c);
    if (c === 1) return vars;
    return `${c}${vars}`;
  }
}

// ── PolynomeMV ─────────────────────────────────────────────────

class PolynomeMV {
  constructor(monomes = []) {
    this.monomes = PolynomeMV._reduire(monomes);
  }

  static _reduire(monomes) {
    const map = new Map();
    for (const m of monomes) {
      if (m.coeff === 0) continue;
      const sig = m.signature();
      if (map.has(sig)) {
        const c = map.get(sig).coeff + m.coeff;
        if (c !== 0) map.set(sig, new Monome(c, m.degres));
        else         map.delete(sig);
      } else {
        map.set(sig, m);
      }
    }
    return [...map.values()];
  }

  estNul()      { return this.monomes.length === 0; }
  estConstant() { return this.monomes.every(m => Object.keys(m.degres).length === 0); }

  add(other)  { return new PolynomeMV([...this.monomes, ...other.monomes]); }
  sub(other)  { return new PolynomeMV([...this.monomes, ...other.monomes.map(m => m.neg())]); }
  neg()       { return new PolynomeMV(this.monomes.map(m => m.neg())); }

  mul(other) {
    const res = [];
    for (const m1 of this.monomes)
      for (const m2 of other.monomes)
        res.push(m1.mul(m2));
    return new PolynomeMV(res);
  }

  divScalaire(k) {
    if (k === 0) throw new Error("Division par zéro");
    if (this.monomes.some(m => m.coeff % k !== 0))
      throw new Error("Division non entière");
    return new PolynomeMV(this.monomes.map(m => new Monome(m.coeff / k, m.degres)));
  }

  pow(n) {
    if (!Number.isInteger(n) || n < 0) throw new Error("Exposant invalide");
    let res = new PolynomeMV([new Monome(1, {})]);
    for (let i = 0; i < n; i++) res = res.mul(this);
    return res;
  }

  equal(other) { return this.sub(other).estNul(); }

  /**
   * Facteur commun non trivial d'une somme.
   * Renvoie { coeff, degres } ou null si rien à extraire.
   */
  facteurCommun() {
    if (this.monomes.length < 2) return null;
    let g = Math.abs(this.monomes[0].coeff);
    for (let i = 1; i < this.monomes.length; i++)
      g = _gcd(g, Math.abs(this.monomes[i].coeff));
    const allVars = new Set(this.monomes.flatMap(m => Object.keys(m.degres)));
    const minDeg  = {};
    for (const v of allVars) {
      const min = Math.min(...this.monomes.map(m => m.degres[v] || 0));
      if (min > 0) minDeg[v] = min;
    }
    const trivial = g === 1 && Object.keys(minDeg).length === 0;
    return trivial ? null : { coeff: g, degres: minDeg };
  }

  /** LaTeX de la forme développée canonique. */
  toLatex() {
    if (this.monomes.length === 0) return '0';
    const sorted = [...this.monomes].sort((a, b) => {
      const da = Object.values(a.degres).reduce((s, v) => s + v, 0);
      const db = Object.values(b.degres).reduce((s, v) => s + v, 0);
      return db - da || a.signature().localeCompare(b.signature());
    });
    let tex = '';
    for (const m of sorted) {
      const body = m.toLatex();
      tex += tex === ''
        ? (m.coeff < 0 ? `-${body}` : body)
        : (m.coeff < 0 ? ` - ${body}` : ` + ${body}`);
    }
    return tex;
  }

  toString() { return this.toLatex(); }
}

// ── Nœuds de l'arbre d'expression ─────────────────────────────
// Chaque nœud implémente :
//   evaluer()  → PolynomeMV  (évalue algébriquement)
//   toLatex()  → string      (préserve la forme écrite)

class _AtomeMV {
  constructor(raw) {
    this.raw = String(raw);
    this.instanceOptions = { parenthese: false };
    this._poly = this._parse(this.raw);
  }

  _parse(raw) {
    let s = raw.trim();
    if (!s) throw new Error("Atome vide");
    let sign = 1;
    if (s[0] === '-') { sign = -1; s = s.slice(1); }
    else if (s[0] === '+') { s = s.slice(1); }
    let coeff = 1, rest = s;
    const numMatch = s.match(/^(\d+)(.*)/);
    if (numMatch) { coeff = parseInt(numMatch[1]); rest = numMatch[2]; }
    coeff *= sign;
    const degres = {};
    const re = /([a-zA-Z])(?:\^(-?\d+))?/g;
    let m;
    while ((m = re.exec(rest)) !== null)
      degres[m[1]] = (degres[m[1]] || 0) + (m[2] ? parseInt(m[2]) : 1);
    return new PolynomeMV([new Monome(coeff, degres)]);
  }

  evaluer() { return this._poly; }

  toLatex() {
    // On rend via le monôme parsé (gère "1abc" → "abc", "-1x" → "-x")
    const mono = this._poly.monomes[0];
    if (!mono) return '0';
    const c    = mono.coeff;
    const vars = Object.keys(mono.degres).sort()
      .map(v => mono.degres[v] === 1 ? v : `${v}^{${mono.degres[v]}}`)
      .join('');
    if (!vars) return String(c);
    if (c ===  1) return vars;
    if (c === -1) return `-${vars}`;
    return `${c}${vars}`;
  }

  isAtome() { return true; }
}

class _SommeMV {
  constructor(termes) {
    this.termes = termes;
    this.instanceOptions = { parenthese: false };
  }
  evaluer() {
    const [h, ...t] = this.termes.map(x => x.evaluer());
    return t.reduce((acc, v) => acc.add(v), h);
  }
  toLatex() {
    let result = '';
    for (let i = 0; i < this.termes.length; i++) {
      const tex = this.termes[i].toLatex();
      if (i === 0) {
        result = tex;
      } else if (tex.startsWith('-')) {
        result += ` - ${tex.slice(1)}`; // "3a - 2b" plutôt que "3a -2b"
      } else {
        result += ` + ${tex}`;
      }
    }
    return this.instanceOptions?.parenthese ? `\\left(${result}\\right)` : result;
  }
}

class _DifferenceMV {
  constructor(termes) {
    this.termes = termes;
    this.instanceOptions = { parenthese: false };
  }
  evaluer() { return this.termes[0].evaluer().sub(this.termes[1].evaluer()); }
  toLatex() {
    const l = this.termes[0].toLatex();
    const r = this.termes[1].toLatex();
    // Si r commence par '-', on écrit "l + |r|" pour éviter "l - -2b"
    const inner = r.startsWith('-') ? `${l} + ${r.slice(1)}` : `${l} - ${r}`;
    return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
  }
}

class _ProduitMV {
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
  toLatex() {
    // Multipliciation implicite : juxtaposition sans séparateur
    // Multiplication explicite (* saisi) : \times
    const sep = this.instanceOptions.implicite ? '' : ' \\times ';
    const inner = this.termes.map(t => t.toLatex()).join(sep);
    return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
  }
}

class _QuotientMV {
  constructor(termes) {
    this.termes = termes;
    this.instanceOptions = { parenthese: false };
  }
  evaluer() {
    const num = this.termes[0].evaluer();
    const den = this.termes[1].evaluer();
    if (!den.estConstant() || den.estNul())
      throw new Error("Diviseur invalide");
    const k = den.monomes[0]?.coeff;
    if (k === undefined) throw new Error("Dénominateur nul");
    return num.divScalaire(k);
  }
  toLatex() {
    return `\\frac{${this.termes[0].toLatex()}}{${this.termes[1].toLatex()}}`;
  }
}

class _PuissanceMV {
  constructor(termes) {
    this.termes = termes;
    this.instanceOptions = { parenthese: false };
  }
  evaluer() {
    const base = this.termes[0].evaluer();
    const exp  = this.termes[1].evaluer();
    if (!exp.estConstant()) throw new Error("Exposant non constant");
    return base.pow(exp.monomes[0]?.coeff ?? 0);
  }
  toLatex() {
    const base = this.termes[0];
    const exp  = this.termes[1];
    // Met la base entre parenthèses si ce n'est pas un atome simple
    const baseTex = (base instanceof _AtomeMV || base.instanceOptions?.parenthese)
      ? base.toLatex()
      : `\\left(${base.toLatex()}\\right)`;
    return `${baseTex}^{${exp.toLatex()}}`;
  }
}

// ── Fonctions d'inspection de l'arbre ─────────────────────────

/**
 * La racine de l'arbre est-elle un produit (ou un atome) ?
 * → true  : l'expression est factorisée (pas une somme à la racine)
 * → false : il reste une somme/différence non encadrée
 */
function estProduit(noeud) {
  if (!noeud) return false;
  if (noeud instanceof _SommeMV)     return false;
  if (noeud instanceof _DifferenceMV) return false;
  // _AtomeMV, _ProduitMV, _PuissanceMV, _QuotientMV → ok
  return true;
}

/**
 * Collecte les nœuds-sommes qui sont des facteurs DIRECTS dans le produit.
 * Ce sont les candidats à vérifier avec facteurCommun().
 *
 * Ex: "3a(b + 2c)" → [_SommeMV([b, 2c])]
 *     "3a(b+c)(x+y)" → [_SommeMV([b,c]), _SommeMV([x,y])]
 *     "3ab" → []
 */
function facteursSommes(noeud) {
  if (!noeud) return [];
  if (noeud instanceof _AtomeMV) return [];
  if (noeud instanceof _ProduitMV)
    return noeud.termes.flatMap(t => facteursSommes(t));
  if (noeud instanceof _PuissanceMV)
    return facteursSommes(noeud.termes[0]);
  if (noeud instanceof _SommeMV || noeud instanceof _DifferenceMV)
    return [noeud]; // ce nœud EST une somme facteur
  return [];
}

// ── Parseur ObjetStringMV ──────────────────────────────────────

class ObjetStringMV {
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

  /** LaTeX qui préserve la forme écrite (non développée). */
  toLatex() {
    return this.arbre ? this.arbre.toLatex() : this.expression;
  }

  _tokeniser(expr) {
    const s   = String(expr);
    const out = [];
    const isSpace     = c => /\s/.test(c);
    const isParen     = c => c === '(' || c === ')';
    const isOp        = c => c === '+' || c === '-' || c === '*' || c === ':' || c === '/';
    const isAtomStart = c => /[0-9a-zA-Z]/.test(c);
    const isAtomChar  = c => /[0-9a-zA-Z.,%]/.test(c); // '/' retiré → opérateur

    let i = 0, prev = 'start';

    while (i < s.length) {
      while (i < s.length && isSpace(s[i])) i++;
      if (i >= s.length) break;
      const c = s[i];

      if (isParen(c)) {
        out.push(c);
        prev = c === '(' ? 'parenL' : 'parenR';
        i++;
        continue;
      }

      if (isOp(c)) {
        const unary = prev === 'start' || prev === 'op' || prev === 'parenL';
        if (c === '-' && unary) {
          let j = i + 1;
          while (j < s.length && isSpace(s[j])) j++;
          if (j < s.length && isAtomStart(s[j])) {
            let k = j + 1;
            while (k < s.length && isAtomChar(s[k])) k++;
            out.push('-' + s.slice(j, k));
            i = k; prev = 'atom';
            continue;
          }
        }
        out.push(c === '/' ? ':' : c); // normalise / en :
        prev = 'op';
        i++;
        continue;
      }

      if (c === '^') {
        const prec = out.length ? out[out.length - 1] : '';
        if (prev === 'atom' && /[a-zA-Z]$/.test(prec)) {
          let k = i + 1;
          let frag = '^';
          if (k < s.length && (s[k] === '-' || s[k] === '+')) { frag += s[k]; k++; }
          const sd = k;
          while (k < s.length && /[0-9]/.test(s[k])) k++;
          if (k > sd) {
            out[out.length - 1] = prec + frag + s.slice(sd, k);
            i = k; prev = 'atom';
            continue;
          }
        }
        out.push('^');
        prev = 'op';
        i++;
        continue;
      }

      if (isAtomChar(c)) {
        let k = i + 1;
        while (k < s.length && isAtomChar(s[k])) k++;
        out.push(s.slice(i, k));
        prev = 'atom';
        i = k;
        continue;
      }

      out.push(s[i++]);
      prev = 'op';
    }
    return out;
  }

  _construireArbre() {
    const tokens = this.tokens;
    let idx = 0;

    const isOpToken  = t => ['+', '-', '*', ':', '^'].includes(t);
    const isParen    = t => t === '(' || t === ')';
    const peek       = () => idx < tokens.length ? tokens[idx] : null;
    const estDebut   = () => {
      const t = peek();
      return !!t && t !== ')' && !isOpToken(t);
    };

    const parseAtome = () => {
      if (idx >= tokens.length) throw new Error("Expression incomplète");
      const t = tokens[idx++];
      if (t === '(') {
        const expr = parseExpr();
        if (tokens[idx++] !== ')') throw new Error("Parenthèse non fermée");
        if (expr.instanceOptions) expr.instanceOptions.parenthese = true;
        return expr;
      }
      if (!isOpToken(t) && !isParen(t)) return new _AtomeMV(t);
      throw new Error(`Token inattendu : "${t}"`);
    };

    const parsePow = () => {
      const base = parseAtome();
      if (peek() === '^') { idx++; return new _PuissanceMV([base, parsePow()]); }
      return base;
    };

    const parseMulDiv = () => {
      let left = parsePow();
      while (idx < tokens.length) {
        const t = peek();
        if (t === '*') {
          idx++;
          left = new _ProduitMV([left, parsePow()], { implicite: false });
        } else if (t === ':') {
          idx++;
          left = new _QuotientMV([left, parsePow()]);
        } else if (estDebut()) {
          left = new _ProduitMV([left, parsePow()], { implicite: true });
        } else break;
      }
      return left;
    };

    const parseExpr = () => {
      let left = parseMulDiv();
      while (idx < tokens.length && (peek() === '+' || peek() === '-')) {
        const op = tokens[idx++];
        const right = parseMulDiv();
        if (op === '+') {
          left = (left instanceof _SommeMV && !left.instanceOptions?.parenthese)
            ? new _SommeMV([...left.termes, right])
            : new _SommeMV([left, right]);
        } else {
          left = new _DifferenceMV([left, right]);
        }
      }
      return left;
    };

    const arbre = parseExpr();
    if (idx < tokens.length)
      throw new Error(`Tokens non parsés à partir de "${tokens[idx]}"`);
    return arbre;
  }
}

// ── Fonctions utilitaires ──────────────────────────────────────

/** Parse et évalue → PolynomeMV | null. */
function evalMV(text) {
  try {
    const os = new ObjetStringMV(String(text).trim());
    if (!os.isValid()) return null;
    return os.calculer().resultat;
  } catch (e) { return null; }
}

/** Parse et retourne l'ObjetStringMV complet (arbre + poly + toLatex). */
function parseMV(text) {
  return new ObjetStringMV(String(text).trim());
}