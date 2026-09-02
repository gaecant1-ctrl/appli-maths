/* ================================================================
   calcul-mv.js — Polynômes multivariés à coefficients exacts (Nombre)
   Dépend de Nombre.js (fractions exactes a/b), à charger AVANT ce fichier.

   API principale :
     evalMV(text)             → PolynomeMV | null
     parseMV(text)            → ObjetStringMV (arbre + poly)
     estProduit(arbre)        → boolean   (racine = produit ou atome)
     facteursSommes(arbre)    → _SommeMV[]  (sommes directement dans le produit)
     p1.equal(p2)             → boolean (égalité algébrique exacte)
     p.facteurCommun()        → { coeff, degres } | null (coefficients entiers uniquement)
================================================================ */

'use strict';

// ── Utilitaire ─────────────────────────────────────────────────

function _gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { const t = b; b = a % b; a = t; }
  return a === 0 ? 1 : a;
}

// Constantes réutilisées pour les comparaisons de coefficients (Nombre exact).
const ZERO = Nombre.fromParts(0, 1, "entier");
const UN = Nombre.fromParts(1, 1, "entier");
const MOINS_UN = Nombre.fromParts(-1, 1, "entier");

/** Convertit une valeur quelconque (Nombre, string, number) en Nombre. */
function _versNombreMV(v) {
  if (v instanceof Nombre) return v;
  if (typeof v === "number") return Nombre.fromParts(v, 1, Number.isInteger(v) ? "entier" : "fraction");
  return new Nombre(String(v));
}

/**
 * Réduit une fraction non simplifiée (ex: 6/4) avant affichage, sans jamais
 * toucher un entier ou un décimal (déjà sous forme canonique unique) : ".dec"
 * doit rester "1.5" à l'écran, pas devenir "3/2".
 */
function _pourAffichage(n) {
  if (n.typeEcriture === 'entier' || n.typeEcriture === 'dec') return n;
  return n.simplify();
}

// ── Monome ─────────────────────────────────────────────────────

class Monome {
  constructor(coeff, degres = {}) {
    this.coeff = _versNombreMV(coeff);
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
    return new Monome(this.coeff.mul(other.coeff), d);
  }

  neg()    { return new Monome(this.coeff.neg(), { ...this.degres }); }
  scale(k) { return new Monome(this.coeff.mul(_versNombreMV(k)), { ...this.degres }); }

  /** LaTeX de la valeur absolue (le signe est géré par PolynomeMV.toLatex). */
  toLatex() {
    const cAbs = _pourAffichage(this.coeff.abs());
    const vars = Object.keys(this.degres).sort()
      .map(v => this.degres[v] === 1 ? v : `${v}^{${this.degres[v]}}`)
      .join('');
    if (!vars)          return cAbs.toLatex();
    if (cAbs.equal(UN)) return vars;
    return `${cAbs.toLatex()}${vars}`;
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
      if (m.coeff.valeurNum.a === 0) continue;
      const sig = m.signature();
      if (map.has(sig)) {
        const c = map.get(sig).coeff.add(m.coeff);
        if (c.valeurNum.a !== 0) map.set(sig, new Monome(c, m.degres));
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

  /** Division exacte par un scalaire (Nombre, string ou number) — toujours licite sauf division par zéro. */
  divScalaire(k) {
    const kN = _versNombreMV(k);
    return new PolynomeMV(this.monomes.map(m => new Monome(m.coeff.div(kN), m.degres)));
  }

  pow(n) {
    if (!Number.isInteger(n) || n < 0) throw new Error("Exposant invalide");
    let res = new PolynomeMV([new Monome(UN, {})]);
    for (let i = 0; i < n; i++) res = res.mul(this);
    return res;
  }

  equal(other) { return this.sub(other).estNul(); }

  /**
   * Facteur commun non trivial d'une somme.
   * Renvoie { coeff, degres } ou null si rien à extraire.
   * Uniquement défini quand tous les coefficients sont des entiers (b === 1) —
   * factoriser une fraction n'a pas de sens pédagogique dans les usages actuels.
   */
  facteurCommun() {
    if (this.monomes.length < 2) return null;
    if (!this.monomes.every(m => m.coeff.valeurNum.b === 1)) return null;

    let g = Math.abs(this.monomes[0].coeff.valeurNum.a);
    for (let i = 1; i < this.monomes.length; i++)
      g = _gcd(g, Math.abs(this.monomes[i].coeff.valeurNum.a));
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
      const negatif = m.coeff.valeurNum.a < 0;
      tex += tex === ''
        ? (negatif ? `-${body}` : body)
        : (negatif ? ` - ${body}` : ` + ${body}`);
    }
    return tex;
  }

  toString() { return this.toLatex(); }
}

// ── Nœuds de l'arbre d'expression ─────────────────────────────

class _AtomeMV {
  /**
   * Construit un atome soit depuis une chaîne tapée (parsing complet, avec
   * conservation de la chaîne brute pour le mode "brut"), soit directement
   * depuis un Monome déjà calculé (utilisé par le moteur de réduction interne
   * — reduireConstantes() — pour ne jamais reconstruire un texte qui devrait
   * ensuite être re-tokenisé : dangereux dès qu'un coefficient est une
   * fraction, ex. "1/2x" serait retokenisé en 3 tokens à cause du "/").
   */
  constructor(raw) {
    this.instanceOptions = { parenthese: false };
    if (raw instanceof Monome) {
      this._poly = new PolynomeMV([raw]);
      this.raw = _AtomeMV._texteDepuisMonome(raw);
    } else {
      this.raw = String(raw).trim(); // On sauvegarde la chaîne brute tapée
      this._poly = this._parse(this.raw);
    }
  }

  static _texteDepuisMonome(m) {
    const vars = Object.keys(m.degres).sort()
      .map(v => m.degres[v] === 1 ? v : `${v}^${m.degres[v]}`).join('');
    return `${m.coeff.toString()}${vars}`;
  }

  _parse(raw) {
    let s = raw;
    if (!s) throw new Error("Atome vide");
    let sign = 1;
    if (s[0] === '-') { sign = -1; s = s.slice(1); }
    else if (s[0] === '+') { s = s.slice(1); }
    let coeff = UN, rest = s;
    const numMatch = s.match(/^(\d+(?:[.,]\d+)?)(.*)/);
    if (numMatch) { coeff = new Nombre(numMatch[1]); rest = numMatch[2]; }
    if (sign < 0) coeff = coeff.neg();
    const degres = {};
    const re = /([a-zA-Z])(?:\^(-?\d+))?/g;
    let m;
    while ((m = re.exec(rest)) !== null)
      degres[m[1]] = (degres[m[1]] || 0) + (m[2] ? parseInt(m[2]) : 1);
    return new PolynomeMV([new Monome(coeff, degres)]);
  }

  evaluer() { return this._poly; }

toLatex(options = {}) {
    if (options.brut) {
      // On nettoie la chaîne brute si elle contient déjà des parenthèses textuelles, ex: "(-4)" -> "-4"
      let inner = this.raw;
      if (inner.startsWith('(') && inner.endsWith(')')) {
        inner = inner.slice(1, -1);
      }
      return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
    }

    // Mode normal
    const mono = this._poly.monomes[0];
    if (!mono) return '0';
    const c    = _pourAffichage(mono.coeff);
    const vars = Object.keys(mono.degres).sort()
      .map(v => mono.degres[v] === 1 ? v : `${v}^{${mono.degres[v]}}`)
      .join('');
    if (!vars) return c.toLatex();
    if (c.equal(UN)) return vars;
    if (c.equal(MOINS_UN)) return `-${vars}`;
    return `${c.toLatex()}${vars}`;
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
  toLatex(options = {}) {
    if (this.termes.length === 0) return '0';
    let result = this.termes[0].toLatex(options);

    for (let i = 1; i < this.termes.length; i++) {
      const tex = this.termes[i].toLatex(options);
      const texADejaDesParentheses = tex.startsWith('\\left(') && tex.endsWith('\\right)');

      if (options.brut) {
        result += ` + ${tex}`;
      } else {
        if (tex.startsWith('-')) {
          // Si le terme commence par un moins mais a déjà ses propres parenthèses, on l'ajoute directement
          if (texADejaDesParentheses) {
            result += ` + ${tex}`;
          } else {
            result += ` - ${tex.slice(1)}`;
          }
        } else {
          result += ` + ${tex}`;
        }
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

toLatex(options = {}) {
    const l = this.termes[0].toLatex(options);

    // On demande le texte du membre de droite
    let r = this.termes[1].toLatex(options);

    if (options.brut) {
      // Si le terme de droite a généré des doubles parenthèses invisibles, on le nettoie
      if (r.startsWith('\\left(') && r.endsWith('\\right)')) {
        r = r.slice(6, -7);
      }
      // On applique la parenthèse unique et propre si l'élève l'avait tapée
      if (this.termes[1].instanceOptions?.parenthese || this.termes[1].raw?.startsWith('(')) {
        r = `\\left(${r}\\right)`;
      }
    } else {
      const rADeja = r.startsWith('\\left(') && r.endsWith('\\right)');
      // "L - (-X)" doit s'afficher "L + X", jamais "L - -X" (deux signes
      // moins à la suite) : ce cas survient dès que le terme de droite est
      // lui-même négatif (ex: un produit dont le premier facteur est négatif).
      if (!rADeja && r.startsWith('-')) {
        const inner = `${l} + ${r.slice(1)}`;
        return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
      }
      // Sinon, protection standard des sommes/différences
      if (!rADeja && (this.termes[1] instanceof _SommeMV || this.termes[1] instanceof _DifferenceMV)) {
        r = `\\left(${r}\\right)`;
      }
    }

    const inner = `${l} - ${r}`;
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
toLatex(options = {}) {
    const sep = this.instanceOptions.implicite ? '' : ' \\times ';
    let textes = this.termes.map(t => t.toLatex(options));

    // SI MODE BRUT : On respecte la saisie de l'élève
    if (options.brut) {
      // CORRECTIF : Si c'est un produit implicite (unaire) et que le premier terme est "-1"
      // mais que l'élève n'a pas tapé le "1" (on vérifie via la propriété .raw de l'atome),
      // alors on remplace "-1" par un simple "-" pour afficher -(-5) au lieu de -1(-5)
      if (this.instanceOptions.implicite && this.termes[0] instanceof _AtomeMV) {
        if (this.termes[0].raw === '-1' && !textes[0].includes('1')) {
          // Si l'élève avait tapé un "1", on le garde, sinon on ne laisse que le moins
        } else if (this.termes[0].raw === '-1') {
          // Si l'atome a été généré par le parseur (qui n'a pas de '1' dans la chaîne d'origine si c'est juste un moins)
          // On peut vérifier si l'atome d'origine dans le jeton était juste "-"
          textes[0] = '-';
        }
      }

      const inner = textes.join(sep);
      return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
    }

    // MODE NORMAL (Pour les énoncés système)
    if (this.instanceOptions.implicite && textes.length > 1 && this.termes[0] instanceof _AtomeMV) {
      const mono = this.termes[0]._poly.monomes[0];
      if (mono && mono.coeff.equal(MOINS_UN) && Object.keys(mono.degres).length === 0) {
        textes[0] = '-';
      }
    }

    for (let i = 1; i < textes.length; i++) {
      // Sécurité anti-doublon : si le facteur a déjà ses parenthèses, on passe au suivant
      if (textes[i].startsWith('\\left(') && textes[i].endsWith('\\right)')) continue;

      // Un "-" isolé (issu du collapse -1 → "-" juste au-dessus) n'est pas un
      // risque de juxtaposition : "-5" se lit sans ambiguïté comme moins cinq,
      // ce n'est pas comme "3" suivi de "5" collés sans opérateur visible.
      const precedentEstSigneMoins = textes[i - 1] === '-';
      const risqueJuxtaposition = !precedentEstSigneMoins && this.instanceOptions.implicite && /^[0-9]/.test(textes[i]);
      if (risqueJuxtaposition || textes[i].startsWith('-')) {
        textes[i] = `\\left(${textes[i]}\\right)`;
      }
    }

    const inner = textes.join(sep);
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
toLatex(options = {}) {
  // Si le numérateur est un atome négatif ÉCRIT TEL QUEL (pas individuellement
  // parenthésé dans la source — sinon "(-1)" garde ses propres parenthèses et
  // reste tel quel dans le numérateur), on sort le signe "-" devant la
  // fraction plutôt que de l'écrire dedans : "-\frac{1}{2}" plutôt que
  // "\frac{-1}{2}" (convention d'écriture usuelle).
  let numTex = this.termes[0].toLatex(options);
  let signe = '';
  if (this.termes[0] instanceof _AtomeMV && !this.termes[0].instanceOptions?.parenthese) {
    const mono = this.termes[0]._poly.monomes[0];
    if (mono && mono.coeff.valeurNum.a < 0 && numTex.startsWith('-')) {
      signe = '-';
      numTex = numTex.slice(1);
    }
  }
  const inner = `${signe}\\frac{${numTex}}{${this.termes[1].toLatex(options)}}`;
  return this.instanceOptions?.parenthese ? `\\left(${inner}\\right)` : inner;
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
    const expNombre = exp.monomes[0]?.coeff ?? ZERO;
    if (!expNombre.isEntier()) throw new Error("Exposant invalide : doit être entier");
    const n = Math.trunc(expNombre.valeurNum.a / expNombre.valeurNum.b);
    return base.pow(n);
  }
toLatex(options = {}) {
    const base = this.termes[0];
    const exp  = this.termes[1];
    const baseTexRaw = base.toLatex(options);

    // On regarde si la chaîne de la base est DEJA enveloppée par des parenthèses LaTeX
    const aDejaDesParentheses = baseTexRaw.startsWith('\\left(') && baseTexRaw.endsWith('\\right)');

    // On n'a besoin de parenthèses QUE si elle n'en a pas déjà ET (qu'elle est forcée OU qu'elle est complexe/négative)
    const aBesoinDeParentheses = !aDejaDesParentheses && (
      base.instanceOptions?.parenthese ||
      (!(base instanceof _AtomeMV) || baseTexRaw.startsWith('-'))
    );

    const baseTex = aBesoinDeParentheses ? `\\left(${baseTexRaw}\\right)` : baseTexRaw;
    return `${baseTex}^{${exp.toLatex(options)}}`;
  }
}

// ── Fonctions d'inspection de l'arbre ─────────────────────────

function estProduit(noeud) {
  if (!noeud) return false;
  if (noeud instanceof _SommeMV)     return false;
  if (noeud instanceof _DifferenceMV) return false;
  return true;
}

function facteursSommes(noeud) {
  if (!noeud) return [];
  if (noeud instanceof _AtomeMV) return [];
  if (noeud instanceof _ProduitMV)
    return noeud.termes.flatMap(t => facteursSommes(t));
  if (noeud instanceof _PuissanceMV)
    return facteursSommes(noeud.termes[0]);
  if (noeud instanceof _SommeMV || noeud instanceof _DifferenceMV)
    return [noeud];
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

toLatex() {
    // Si l'expression est invalide, on INTERDIT formellement la génération de l'arbre.
    // On renvoie la chaîne de caractères brute d'origine pour éviter tout rendu LaTeX cassé.
    if (!this.isValid() || !this.arbre) {
      return this.expression;
    }

    return this.arbre.toLatex();
  }

_tokeniser(expr) {
    const s   = String(expr);
    const out = [];
    const isSpace   = c => /\s/.test(c);
    const isParen   = c => c === '(' || c === ')';
    const isOp      = c => c === '+' || c === '-' || c === '*' || c === ':' || c === '/';
    const isAtomChar = c => /[0-9a-zA-Z.,%]/.test(c);

    let i = 0, prev = 'start';

    while (i < s.length) {
      // 1. On passe les espaces
      while (i < s.length && isSpace(s[i])) i++;
      if (i >= s.length) break;
      const c = s[i];

      // 2. Gestion des parenthèses
      if (isParen(c)) {
        out.push(c);
        prev = c === '(' ? 'parenL' : 'parenR';
        i++;
        continue;
      }

      // 3. --- SIGNES UNAIRES : PLUS DE FUSION AU NIVEAU CARACTÈRE ---
      // Le signe reste TOUJOURS un token opérateur séparé, même en tête de
      // flux ou juste après "(" — c'est le parseur (parseExpr, via
      // negerNoeud()) qui décide APRÈS avoir résolu une éventuelle division
      // ("/") ce que le signe doit envelopper. Fusionner "-5" en un seul
      // token ici, avant de savoir si "5" fait partie d'une fraction,
      // provoquait un mauvais regroupement d'affichage (ex: "3*(-1)/2"
      // aurait tout mis sous la même barre de fraction).

      // 4. Gestion des opérateurs standards
      if (isOp(c)) {
        out.push(c === '/' ? ':' : c);
        prev = 'op';
        i++;
        continue;
      }

      // 5. Gestion des puissances
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

      // 6. Gestion des atomes classiques (lettres ou nombres positifs)
      if (isAtomChar(c)) {
        let k = i + 1;
        while (k < s.length && isAtomChar(s[k])) k++;
        out.push(s.slice(i, k));
        prev = 'atom';
        i = k;
        continue;
      }

      // Cas de secours pour éviter les boucles infinies sur caractère inconnu
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
    const peek        = () => idx < tokens.length ? tokens[idx] : null;
    const estDebut   = () => {
      const t = peek();
      return !!t && t !== ')' && !isOpToken(t);
    };

    const parseAtome = () => {
      if (idx >= tokens.length) throw new Error("Expression incomplète");
      const t = tokens[idx++];

      // 1. Si c'est une parenthèse, on ouvre un sous-contexte complet
      if (t === '(') {
        const expr = parseExpr();
        if (tokens[idx++] !== ')') throw new Error("Parenthèse non fermée");
        if (expr.instanceOptions) expr.instanceOptions.parenthese = true;
        return expr;
      }

      // 2. BLOCAGE : Si on tombe sur un symbole opérateur alors qu'on attend un Atome,
      // c'est qu'il y a une succession interdite (ex: 8 * -5). On coupe direct !
      if (isOpToken(t) || t === ')') {
        throw new Error(`Erreur de syntaxe : symbole "${t}" inattendu.`);
      }

      // 3. Cas normal : c'est un atome propre (ex: "8", "x", "-5" si capturé au start)
      return new _AtomeMV(t);
    };

    const parsePow = () => {
      const base = parseAtome(); // Va direct à l'atome sans tolérer de signe isolé
      if (peek() === '^') {
        idx++;
        return new _PuissanceMV([base, parsePow()]);
      }
      return base;
    };

    // Un "facteur" = une puissance, éventuellement suivie d'une ou plusieurs
    // divisions immédiates (ex: "8:2" dans "3*8:2" ne concerne QUE le "8",
    // pas tout le produit accumulé avant lui) : ":" se lie à son terme de
    // gauche IMMÉDIAT, jamais au produit entier construit jusqu'ici — sinon
    // "3*(-1):2" s'afficherait comme "\frac{3 \times (-1)}{2}" (tout sous la
    // même barre de fraction) au lieu de "3 \times \frac{-1}{2}" (résultat
    // numériquement identique par associativité, mais visuellement différent
    // et c'est bien la présentation attendue ici).
    const parseFacteurDiv = () => {
      let f = parsePow();
      while (idx < tokens.length && peek() === ':') {
        idx++;
        f = new _QuotientMV([f, parsePow()]);
      }
      return f;
    };

    const parseMulDiv = () => {
      let left = parseFacteurDiv();
      while (idx < tokens.length) {
        const t = peek();
        if (t === '*') {
          idx++;
          left = new _ProduitMV([left, parseFacteurDiv()], { implicite: false });
        } else if (estDebut()) {
          left = new _ProduitMV([left, parseFacteurDiv()], { implicite: true });
        } else break;
      }
      return left;
    };

    // Applique un signe "-" à un nœud déjà entièrement résolu (division
    // comprise, puisqu'on est appelé APRÈS parseMulDiv()) : un simple atome
    // devient un atome négatif propre (pas de produit-artefact) ; toute
    // autre forme (fraction, somme parenthésée...) est enveloppée via le
    // même mécanisme "-1 × ..." qui sait déjà s'afficher comme un simple "-".
    const negerNoeud = (noeud) => {
      if (noeud instanceof _AtomeMV) {
        const mono = noeud._poly.monomes[0];
        const coeff = mono ? mono.coeff.neg() : ZERO;
        const degres = mono ? mono.degres : {};
        return new _AtomeMV(new Monome(coeff, degres));
      }
      return new _ProduitMV([new _AtomeMV("-1"), noeud], { implicite: true });
    };

    const parseExpr = () => {
      // Le SEUL endroit de la grammaire où un signe unaire est toléré,
      // c'est tout au début du flux global ou au début d'une parenthèse.
      // Le signe s'applique APRÈS parseMulDiv() : la division ("/") est donc
      // toujours résolue avant que le signe ne l'enveloppe (voir negerNoeud).
      let left;
      if (peek() === '-') {
        idx++;
        left = negerNoeud(parseMulDiv());
      } else if (peek() === '+') {
        idx++;
        left = parseMulDiv();
      } else {
        left = parseMulDiv();
      }

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

// ── Réduction partielle (constantes uniquement) ────────────────

function _sansLettre(poly) {
  if (!poly || poly.monomes.length === 0) return true;
  return poly.monomes.every(m => Object.keys(m.degres || {}).length === 0);
}

function _construireAtomeDepuisMonome(coeff, degres) {
  return new _AtomeMV(new Monome(coeff, degres));
}

function _combinerAtomesSemblables(atomes, signes) {
  const ordre = [];
  const groupes = new Map();

  atomes.forEach((atome, i) => {
    const mono = atome._poly.monomes[0];
    const sig  = mono ? mono.signature() : '';
    const signe = signes ? signes[i] : 1;
    const coeff = mono ? (signe < 0 ? mono.coeff.neg() : mono.coeff) : ZERO;

    if (groupes.has(sig)) {
      groupes.get(sig).coeff = groupes.get(sig).coeff.add(coeff);
    } else {
      groupes.set(sig, { coeff, degres: mono ? mono.degres : {} });
      ordre.push(sig);
    }
  });

  const resultat = [];
  for (const sig of ordre) {
    const g = groupes.get(sig);
    if (g.coeff.valeurNum.a === 0) continue;
    resultat.push(_construireAtomeDepuisMonome(g.coeff, g.degres));
  }

  if (resultat.length === 0) {
    return [new _AtomeMV('0')];
  }
  return resultat;
}

function reduireConstantes(noeud) {
  if (!noeud) return noeud;
  if (noeud instanceof _AtomeMV) return noeud;

  if (noeud instanceof _SommeMV || noeud instanceof _DifferenceMV ||
      noeud instanceof _ProduitMV || noeud instanceof _PuissanceMV) {

    const parentheseAvant = !!noeud.instanceOptions?.parenthese;
    let poly;
    try { poly = noeud.evaluer(); } catch (e) { poly = null; }

    // RÈGLE GLOBALE : Si le sous-arbre complet est purement numérique,
    // on le réduit immédiatement en un unique atome constant.
    if (poly && _sansLettre(poly)) {
      const c = poly.monomes[0]?.coeff ?? ZERO;
      const atome = new _AtomeMV(new Monome(c, {}));
      atome.instanceOptions = { parenthese: parentheseAvant };
      return atome;
    }

    // Réduction récursive préalable de tous les enfants
    const termesReduits = noeud.termes.map(reduireConstantes);
    let nouveau;

    if (noeud instanceof _SommeMV) {
      // RÈGLE : Si la somme ne contient que des atomes (ex: 3x + 2x), on combine
      if (termesReduits.every(t => t instanceof _AtomeMV)) {
        const comb = _combinerAtomesSemblables(termesReduits);
        nouveau = comb.length === 1 ? comb[0] : new _SommeMV(comb);
      } else {
        nouveau = new _SommeMV(termesReduits);
      }
    }
    else if (noeud instanceof _DifferenceMV) {
      // RÈGLE : Si la différence ne contient que des atomes (ex: 5x - 2x), on combine via les signes [1, -1]
      if (termesReduits.every(t => t instanceof _AtomeMV)) {
        const comb = _combinerAtomesSemblables(termesReduits, [1, -1]);
        nouveau = comb.length === 1 ? comb[0] : new _SommeMV(comb);
      } else {
        nouveau = new _DifferenceMV(termesReduits);
      }
    }
    else if (noeud instanceof _ProduitMV) {
      // 1. Si tous les facteurs du produit sont des atomes simples
      const tousAtomes = termesReduits.every(t => t instanceof _AtomeMV);

      if (tousAtomes) {
        let polyResultat;
        try { polyResultat = noeud.evaluer(); } catch (e) { polyResultat = null; }

        if (polyResultat && polyResultat.monomes.length > 0) {
          const m = polyResultat.monomes[0];
          nouveau = _construireAtomeDepuisMonome(m.coeff, m.degres);
        } else {
          nouveau = new _AtomeMV('0');
        }
      }
      else {
        // 2. Cas mixte : présence de blocs complexes parenthésés (ex: 1 * (x + 3) ou b * 1 * (y - 1))
        const atomesBruts = [];
        const blocsComplexes = [];

        for (const t of termesReduits) {
          if (t instanceof _AtomeMV) atomesBruts.push(t);
          else blocsComplexes.push(t);
        }

        // Fusion de la partie atomique
        let atomeFusionne = null;
        if (atomesBruts.length > 0) {
          let coeffGlobal = UN;
          const degresGlobaux = {};
          for (const atome of atomesBruts) {
            const mono = atome._poly.monomes[0];
            if (mono) {
              coeffGlobal = coeffGlobal.mul(mono.coeff);
              for (const [v, d] of Object.entries(mono.degres || {})) {
                degresGlobaux[v] = (degresGlobaux[v] || 0) + d;
              }
            } else {
              coeffGlobal = ZERO;
            }
          }
          atomeFusionne = _construireAtomeDepuisMonome(coeffGlobal, degresGlobaux);
        }

        // Assemblage final et application des règles d'annulation (0 et 1)
        let facteursFinal = [];
        if (atomeFusionne) {
          const c = atomeFusionne._poly.monomes[0]?.coeff ?? ZERO;
          const aDesLettres = Object.keys(atomeFusionne._poly.monomes[0]?.degres || {}).length > 0;

          if (c.valeurNum.a === 0) {
            facteursFinal = [new _AtomeMV('0')]; // Tout s'annule par 0
          } else if (c.equal(UN) && !aDesLettres) {
            // RÈGLE : L'atome vaut exactement le nombre constant 1.
            // On l'ignore (élément neutre) pour ne pas afficher "1(x+3)"
            facteursFinal = blocsComplexes;
          } else {
            // L'atome vaut autre chose (ex: 2b² ou -1), on le garde en tête
            facteursFinal = [atomeFusionne, ...blocsComplexes];
          }
        } else {
          facteursFinal = blocsComplexes;
        }

        // Sécurité si tous les blocs se font nettoyer ou s'il n'en reste qu'un
        if (facteursFinal.length === 0) {
          nouveau = new _AtomeMV('1');
        } else if (facteursFinal.length === 1) {
          nouveau = facteursFinal[0];
        } else {
          nouveau = new _ProduitMV(facteursFinal, {
            parenthese: parentheseAvant,
            implicite: !!noeud.instanceOptions?.implicite
          });
        }
      }
    }
    else {
      // Traitement par défaut pour les puissances complexes
      nouveau = new _PuissanceMV(termesReduits);
    }

    // Ré-injection propre des métadonnées d'affichage sur le nœud parent s'il n'est pas devenu un atome
    if (!(nouveau instanceof _AtomeMV)) {
      nouveau.instanceOptions = nouveau.instanceOptions || {};
      nouveau.instanceOptions.parenthese = parentheseAvant;
    }
    return nouveau;
  }

  return noeud;
}

// ── Contrôle "pas de produit de deux négatifs" (niveau 5e) ─────
// Ces deux fonctions renvoient un `.valeur` en Nombre exact (et non en number
// brut) : fonctionnalité générique du moteur, réutilisable ailleurs qu'ici —
// seul `.ok` est consommé par l'appli evaluation aujourd'hui.

function evaluerAvecControle(noeud, valeurs) {
  if (noeud instanceof _AtomeMV) {
    const mono = noeud._poly.monomes[0];
    if (!mono) return { valeur: ZERO, ok: true };
    let v = mono.coeff;
    for (const [lettre, exp] of Object.entries(mono.degres)) {
      for (let i = 0; i < exp; i++) {
        const facteur = _versNombreMV(valeurs[lettre]);
        if (v.valeurNum.a < 0 && facteur.valeurNum.a < 0) return { valeur: null, ok: false };
        v = v.mul(facteur);
      }
    }
    return { valeur: v, ok: true };
  }
  if (noeud instanceof _SommeMV) {
    let total = ZERO;
    for (const terme of noeud.termes) {
      const r = evaluerAvecControle(terme, valeurs);
      if (!r.ok) return r;
      total = total.add(r.valeur);
    }
    return { valeur: total, ok: true };
  }
  if (noeud instanceof _DifferenceMV) {
    const g = evaluerAvecControle(noeud.termes[0], valeurs);
    if (!g.ok) return g;
    const d = evaluerAvecControle(noeud.termes[1], valeurs);
    if (!d.ok) return d;
    return { valeur: g.valeur.sub(d.valeur), ok: true };
  }
  if (noeud instanceof _ProduitMV) {
    let total = null;
    for (const terme of noeud.termes) {
      const r = evaluerAvecControle(terme, valeurs);
      if (!r.ok) return r;
      if (total === null) { total = r.valeur; continue; }
      if (total.valeurNum.a < 0 && r.valeur.valeurNum.a < 0) return { valeur: null, ok: false };
      total = total.mul(r.valeur);
    }
    return { valeur: total, ok: true };
  }
  if (noeud instanceof _PuissanceMV) {
    const base = evaluerAvecControle(noeud.termes[0], valeurs);
    if (!base.ok) return base;
    const exp = noeud.termes[1].evaluer().monomes[0]?.coeff ?? ZERO;
    const n = exp.valeurNum.a;
    let total = UN;
    for (let i = 0; i < n; i++) {
      if (total.valeurNum.a < 0 && base.valeur.valeurNum.a < 0) return { valeur: null, ok: false };
      total = total.mul(base.valeur);
    }
    return { valeur: total, ok: true };
  }
  return { valeur: null, ok: false };
}

function evaluerPolynomeAvecControle(poly, valeurs) {
  let total = ZERO;
  for (const m of poly.monomes) {
    let v = m.coeff;
    let nbNegatifs = v.valeurNum.a < 0 ? 1 : 0;
    for (const [lettre, exp] of Object.entries(m.degres)) {
      for (let i = 0; i < exp; i++) {
        const facteur = _versNombreMV(valeurs[lettre]);
        if (facteur.valeurNum.a < 0) nbNegatifs++;
        v = v.mul(facteur);
      }
    }
    if (nbNegatifs >= 2) return { valeur: null, ok: false };
    total = total.add(v);
  }
  return { valeur: total, ok: true };
}

// ── Fonctions utilitaires ──────────────────────────────────────

function evalMV(text) {
  try {
    const os = new ObjetStringMV(String(text).trim());
    if (!os.isValid()) return null;
    return os.calculer().resultat;
  } catch (e) { return null; }
}

function parseMV(text) {
  return new ObjetStringMV(String(text).trim());
}
