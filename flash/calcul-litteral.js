/* ================================================================
   calcul-litteral.js — calcul littéral exact sur des polynômes à une
   variable (x), coefficients exacts (Nombre).

   Port depuis evaluation/calcul-litteral.js — logique inchangée,
   uniquement adapté en module ES (import/export) pour le projet flash.
   Dépend de nombre.js (chargé via import).
================================================================ */

'use strict';

import { Nombre } from './nombre.js';

// ============================================================
// Polynome.js — calcul littéral exact sur des polynômes à une variable (x)
// ============================================================
// Stockage interne : this.coeffs = [c0, c1, c2, ...] où chaque ci est un
// Nombre, et le terme de degré i vaut ci * x^i. Le tableau ne contient
// jamais de zéros de tête superflus (sauf le polynôme nul, représenté par
// un tableau à un seul élément [0]).
//
// Degré maximum autorisé : DEGRE_MAX (6). Toute opération qui produirait
// un polynôme de degré supérieur lève une erreur explicite.
// ============================================================

export class Polynome {
  static DEGRE_MAX = 6;

  /**
   * @param {Array<Nombre|string|number>} coeffs - coefficients par degré croissant.
   *   Les éléments qui ne sont pas déjà des Nombre sont convertis via `new Nombre(String(v))`.
   */
  constructor(coeffs = [Nombre.fromParts(0, 1)]) {
    if (!Array.isArray(coeffs) || coeffs.length === 0) {
      throw new Error("Polynome : il faut au moins un coefficient (le terme constant).");
    }

    this.coeffs = coeffs.map(c => Polynome._versNombre(c));
    this._nettoyer();
    this._verifierDegreMax();
  }

  // ———————————————————
  // CONSTRUCTION
  // ———————————————————

  /** Convertit une valeur quelconque (Nombre, string, number) en Nombre. */
  static _versNombre(v) {
    if (v instanceof Nombre) return v;
    if (typeof v === "number") return Nombre.fromParts(v, 1, Number.isInteger(v) ? "entier" : "fraction");
    return new Nombre(String(v));
  }

  /** Le polynôme nul. */
  static zero() {
    return new Polynome([Nombre.fromParts(0, 1, "entier")]);
  }

  /** Polynôme constant (degré 0). */
  static fromConstant(nombre) {
    return new Polynome([Polynome._versNombre(nombre)]);
  }

  /** Polynôme à un seul terme : nombre * x^degre. */
  static fromMonome(nombre, degre = 1) {
    if (!Number.isInteger(degre) || degre < 0) {
      throw new Error("Polynome.fromMonome : le degré doit être un entier >= 0.");
    }
    if (degre > Polynome.DEGRE_MAX) {
      throw new Error(`Polynome.fromMonome : degré ${degre} > DEGRE_MAX (${Polynome.DEGRE_MAX}).`);
    }
    const coeffs = [];
    for (let i = 0; i < degre; i++) coeffs.push(Nombre.fromParts(0, 1, "entier"));
    coeffs.push(Polynome._versNombre(nombre));
    return new Polynome(coeffs);
  }

  /** Raccourci : polynôme affine a*x + b à partir de deux Nombre (ou équivalents). */
  static fromAffine(a, b) {
    return new Polynome([Polynome._versNombre(b), Polynome._versNombre(a)]);
  }

  // ———————————————————
  // NETTOYAGE / VALIDATION INTERNE
  // ———————————————————

  /** Retire les coefficients de tête nuls, sans jamais réduire en dessous de longueur 1. */
  _nettoyer() {
    const zero = Nombre.fromParts(0, 1, "entier");
    while (this.coeffs.length > 1 && this.coeffs[this.coeffs.length - 1].equal(zero)) {
      this.coeffs.pop();
    }
  }

  _verifierDegreMax() {
    if (this.degre() > Polynome.DEGRE_MAX) {
      throw new Error(`Polynome : degré ${this.degre()} dépasse DEGRE_MAX (${Polynome.DEGRE_MAX}).`);
    }
  }

  // ———————————————————
  // DIAGNOSTICS
  // ———————————————————

  /** Degré réel du polynôme. Convention : -1 pour le polynôme nul. */
  degre() {
    const zero = Nombre.fromParts(0, 1, "entier");
    for (let i = this.coeffs.length - 1; i >= 0; i--) {
      if (!this.coeffs[i].equal(zero)) return i;
    }
    return -1;
  }

  estNul() {
    return this.degre() === -1;
  }

  estConstant() {
    return this.degre() <= 0;
  }

  estAffine() {
    return this.degre() <= 1;
  }

  /** Coefficient du degré i (Nombre 0 si i dépasse le degré réel ou est négatif). */
  coeff(i) {
    if (i < 0 || i >= this.coeffs.length) return Nombre.fromParts(0, 1, "entier");
    return this.coeffs[i];
  }

  /**
   * Si le polynôme est affine (degré <= 1), renvoie {a, b} (Nombre).
   * Sinon renvoie null.
   */
  getCoeffAffine() {
    if (!this.estAffine()) return null;
    return { a: this.coeff(1), b: this.coeff(0) };
  }

  equals(other) {
    if (!(other instanceof Polynome)) return false;
    const n = Math.max(this.coeffs.length, other.coeffs.length);
    for (let i = 0; i < n; i++) {
      if (!this.coeff(i).equal(other.coeff(i))) return false;
    }
    return true;
  }

  // ———————————————————
  // OPÉRATIONS — toujours licites entre deux Polynome
  // ———————————————————

  add(other) {
    if (!(other instanceof Polynome)) throw new Error("Polynome.add : argument invalide.");
    const n = Math.max(this.coeffs.length, other.coeffs.length);
    const res = [];
    for (let i = 0; i < n; i++) res.push(this.coeff(i).add(other.coeff(i)));
    return new Polynome(res);
  }

  sub(other) {
    if (!(other instanceof Polynome)) throw new Error("Polynome.sub : argument invalide.");
    const n = Math.max(this.coeffs.length, other.coeffs.length);
    const res = [];
    for (let i = 0; i < n; i++) res.push(this.coeff(i).sub(other.coeff(i)));
    return new Polynome(res);
  }

  /** Produit de convolution standard. Lève une erreur si le degré dépasse DEGRE_MAX. */
  mul(other) {
    if (!(other instanceof Polynome)) throw new Error("Polynome.mul : argument invalide.");

    if (this.estNul() || other.estNul()) return Polynome.zero();

    const degreResultat = this.degre() + other.degre();
    if (degreResultat > Polynome.DEGRE_MAX) {
      throw new Error(
        `Polynome.mul : le produit aurait un degré ${degreResultat}, supérieur à DEGRE_MAX (${Polynome.DEGRE_MAX}).`
      );
    }

    const res = [];
    for (let i = 0; i <= degreResultat; i++) res.push(Nombre.fromParts(0, 1, "entier"));

    for (let i = 0; i < this.coeffs.length; i++) {
      for (let j = 0; j < other.coeffs.length; j++) {
        res[i + j] = res[i + j].add(this.coeff(i).mul(other.coeff(j)));
      }
    }
    return new Polynome(res);
  }

  /** Élève le polynôme à la puissance entière n >= 0. Lève une erreur si le degré final dépasse DEGRE_MAX. */
  pow(n) {
    if (!Number.isInteger(n) || n < 0) {
      throw new Error("Polynome.pow : l'exposant doit être un entier >= 0.");
    }
    if (n === 0) return Polynome.fromConstant(Nombre.fromParts(1, 1, "entier"));

    let resultat = this;
    for (let i = 1; i < n; i++) resultat = resultat.mul(this); // mul() vérifie déjà DEGRE_MAX à chaque étape
    return resultat;
  }

  // ———————————————————
  // OPÉRATIONS — uniquement par un scalaire (Nombre), jamais par un Polynome
  // ———————————————————

  mulScalaire(nombre) {
    const k = Polynome._versNombre(nombre);
    return new Polynome(this.coeffs.map(c => c.mul(k)));
  }

  divScalaire(nombre) {
    const k = Polynome._versNombre(nombre);
    // Nombre.div lève déjà une erreur explicite si k vaut 0 ("Division par zéro").
    return new Polynome(this.coeffs.map(c => c.div(k)));
  }

  addScalaire(nombre) {
    return this.add(Polynome.fromConstant(nombre));
  }

  subScalaire(nombre) {
    return this.sub(Polynome.fromConstant(nombre));
  }

  // ———————————————————
  // ÉVALUATION ET RÉSOLUTION (premier degré)
  // ———————————————————

  /** Évalue le polynôme en x = xNombre (Horner), de façon exacte. Retourne un Nombre. */
  evaluer(xNombre) {
    const x = Polynome._versNombre(xNombre);
    let resultat = Nombre.fromParts(0, 1, "entier");
    for (let i = this.coeffs.length - 1; i >= 0; i--) {
      resultat = resultat.mul(x).add(this.coeffs[i]);
    }
    return resultat;
  }

  /**
   * Solution de l'équation polynome(x) = 0, UNIQUEMENT si le polynôme est affine
   * (degré <= 1) et a != 0. Renvoie un Nombre exact, ou null sinon
   * (non affine, ou constante non nulle / nulle -> pas de solution unique).
   */
  getSolution() {
    const affine = this.getCoeffAffine();
    if (!affine) return null;
    const zero = Nombre.fromParts(0, 1, "entier");
    if (affine.a.equal(zero)) return null; // pas de x : pas de solution unique (0=0 ou 0=b)
    return zero.sub(affine.b).div(affine.a); // -b/a
  }

  // ———————————————————
  // AFFICHAGE
  // ———————————————————

  /**
   * Construit la liste des termes non nuls à afficher, du degré le plus haut
   * au plus bas, sous la forme { signe: '+'|'-', valeurAbs: Nombre, degre: i }.
   * valeurAbs est la valeur absolue du coefficient (un Nombre toujours positif).
   */
  _termesAffichables() {
    const zero = Nombre.fromParts(0, 1, "entier");
    const termes = [];
    for (let i = this.coeffs.length - 1; i >= 0; i--) {
      const c = this.coeffs[i];
      if (c.equal(zero)) continue;
      const negatif = c.valeurNum.a < 0;
      const valeurAbs = negatif ? Nombre.fromParts(-c.valeurNum.a, c.valeurNum.b, c.typeEcriture) : c;
      termes.push({ signe: negatif ? '-' : '+', valeurAbs, degre: i });
    }
    return termes;
  }

  toString(opts = {}) {
    const termes = this._termesAffichables();
    if (termes.length === 0) return "0";

    return termes.map((t, idx) => {
      const coeffEstUn = t.valeurAbs.equal(Nombre.fromParts(1, 1, "entier"));
      let monome;
      if (t.degre === 0) {
        monome = t.valeurAbs.toString(opts);
      } else if (t.degre === 1) {
        monome = coeffEstUn ? "x" : `${t.valeurAbs.toString(opts)}x`;
      } else {
        monome = coeffEstUn ? `x^${t.degre}` : `${t.valeurAbs.toString(opts)}x^${t.degre}`;
      }

      if (idx === 0) return t.signe === '-' ? `-${monome}` : monome;
      return ` ${t.signe} ${monome}`;
    }).join("");
  }

  toLatex(opts = {}) {
    const termes = this._termesAffichables();
    if (termes.length === 0) return "0";

    return termes.map((t, idx) => {
      const coeffEstUn = t.valeurAbs.equal(Nombre.fromParts(1, 1, "entier"));
      let monome;
      if (t.degre === 0) {
        monome = t.valeurAbs.toLatex(opts);
      } else if (t.degre === 1) {
        monome = coeffEstUn ? "x" : `${t.valeurAbs.toLatex(opts)}x`;
      } else {
        monome = coeffEstUn ? `x^{${t.degre}}` : `${t.valeurAbs.toLatex(opts)}x^{${t.degre}}`;
      }

      if (idx === 0) return t.signe === '-' ? `-${monome}` : monome;
      return ` ${t.signe} ${monome}`;
    }).join("");
  }

  toJSON() {
    return {
      type: "Polynome",
      degre: this.degre(),
      coeffs: this.coeffs.map(c => c.toString())
    };
  }
}
// ============================================================
// Expression.js — classe de base + Atome (version calcul littéral)
// ============================================================
// Contrat minimal de toute Expression (inchangé) :
//   - evaluer(opts)   -> réduit l'arbre à un Atome final
//   - toString(opts)  -> représentation texte
//   - toLatex(opts)   -> représentation LaTeX
//   - isAtome()       -> true si feuille terminale
//   - getNature()     -> "Polynome" | "Composée" | "Inconnue"
//   - checkEqual(other) -> égalité structurelle stricte (même forme d'arbre)
// ============================================================

export class Expression {
  evaluer(opts = {}) { return this; }
  toString(opts = {}) { return ''; }
  toLatex(opts = {}) { return ''; }
  isAtome() { return false; }
  getNature() { return "Inconnue"; }
  checkEqual(other) { return false; }

  toJSON() {
    return {
      type: this.constructor.name,
      nature: this.getNature(),
      valeur: this.toString()
    };
  }
}

// ===== Atome =====

export class Atome extends Expression {
  /**
   * Construit un Atome à partir :
   *  - d'un Polynome déjà construit,
   *  - d'une chaîne représentant un nombre seul ("5", "1/2", "0.3"),
   *  - d'une chaîne représentant x ou x^n ("x", "x^2", "-x", "3x", "3x^2").
   *
   * Note : ce parsing minimal sert pour des tokens ATOMIQUES déjà isolés
   * par ObjetString.tokeniser(). La reconnaissance de termes complexes
   * (sommes, produits) est gérée par les classes Somme/Produit/etc.,
   * pas ici.
   */
  constructor(input, base = {}) {
    super();

    if (input instanceof Polynome) {
      this.polynome = input;
      this.texte = input.toString(base);
    } else if (typeof input === "string") {
      this.texte = input.trim();
      this.polynome = Atome._parserToken(this.texte);
    } else {
      throw new Error("Atome doit être construit avec une string ou une instance de Polynome.");
    }

    this.instanceOptions = {
      affiche: base.affiche ?? true,
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null
    };
    this.nature = "Polynome";
  }

  /** Parse un token isolé : nombre seul, ou nombre*x^n (avec x/x^n sans coefficient explicite = 1). */
  static _parserToken(tok) {
    let s = tok.trim();

    // Cas "x" ou "x^n" ou "-x" ou "-x^n", sans coefficient numérique explicite devant.
    const seulRegex = /^([+-])?x(?:\^(\d+))?$/;
    const mSeul = s.match(seulRegex);
    if (mSeul) {
      const signe = mSeul[1] === '-' ? -1 : 1;
      const degre = mSeul[2] ? parseInt(mSeul[2], 10) : 1;
      return Polynome.fromMonome(Nombre.fromParts(signe, 1, "entier"), degre);
    }

    // Cas "kx" ou "kx^n" : un nombre collé à x (avec ou sans exposant).
    const avecCoeffRegex = /^([+-]?\d+(?:[.,]\d+)?(?:\/\d+)?)x(?:\^(\d+))?$/;
    const mCoeff = s.match(avecCoeffRegex);
    if (mCoeff) {
      const degre = mCoeff[2] ? parseInt(mCoeff[2], 10) : 1;
      return Polynome.fromMonome(new Nombre(mCoeff[1]), degre);
    }

    // Sinon : nombre seul (laisse Nombre lever l'erreur si le format est invalide).
    return Polynome.fromConstant(new Nombre(s));
  }

  evaluer(opts) {
    return this;
  }

  toString(opts = {}) {
    const str = this.polynome.toString(opts);
    if (this._termesMultiples()) {
      const encadrer = ["produit", "quotient", "quotientDen", "quotientNum", "difference"]
        .includes(opts.parentheseObligatoire ?? this.instanceOptions.parentheseObligatoire);
      return encadrer ? `(${str})` : str;
    }
    return str;
  }

  toLatex(opts = {}) {
    const str = this.polynome.toLatex(opts);
    if (this._termesMultiples()) {
      const encadrer = ["produit", "quotient", "quotientDen", "quotientNum", "difference"]
        .includes(opts.parentheseObligatoire ?? this.instanceOptions.parentheseObligatoire);
      return encadrer ? `\\left(${str}\\right)` : str;
    }
    return str;
  }

  /** Vrai si le polynôme interne a plus d'un terme non nul (donc nécessite des parenthèses si encadré). */
  _termesMultiples() {
    const zero = Nombre.fromParts(0, 1, "entier");
    let count = 0;
    for (const c of this.polynome.coeffs) {
      if (!c.equal(zero)) count++;
    }
    return count > 1;
  }

  checkEqual(other) {
    return other instanceof Atome && this.polynome.equals(other.polynome);
  }

  equals(other) {
    return this.checkEqual(other);
  }

  isAtome() { return true; }

  getNature() { return this.nature; }

  isScalaire() {
    return this.polynome.estConstant();
  }

  add(other) {
    if (!(other instanceof Atome)) throw new Error("Addition uniquement entre atomes.");
    return new Atome(this.polynome.add(other.polynome));
  }

  sub(other) {
    if (!(other instanceof Atome)) throw new Error("Soustraction uniquement entre atomes.");
    return new Atome(this.polynome.sub(other.polynome));
  }

  mul(other) {
    if (!(other instanceof Atome)) throw new Error("Multiplication uniquement entre atomes.");
    return new Atome(this.polynome.mul(other.polynome));
  }

  div(other) {
    if (!(other instanceof Atome)) throw new Error("Division uniquement entre atomes.");
    if (!other.polynome.estConstant()) {
      throw new Error("Division impossible : le diviseur ne peut pas contenir x.");
    }
    const k = other.polynome.coeff(0);
    return new Atome(this.polynome.divScalaire(k));
  }

  pow(other) {
    if (!(other instanceof Atome)) throw new Error("Exposant invalide : doit être un nombre.");
    if (!other.polynome.estConstant()) throw new Error("Exposant invalide : ne peut pas contenir x.");

    const expNombre = other.polynome.coeff(0);
    if (!expNombre.isEntier()) throw new Error("Exposant invalide : seuls les exposants entiers sont supportés.");

    const n = Math.trunc(expNombre.valeurNum.a / expNombre.valeurNum.b);
    return new Atome(this.polynome.pow(n));
  }

  toJSON() {
    return {
      type: "Atome",
      nature: this.getNature(),
      texte: this.texte,
      polynome: this.polynome.toString()
    };
  }
}
// ============================================================
// Somme.js — Somme et Difference, version blindée
// ============================================================
// Plus de logique "pas à pas" : evaluer() réduit directement
// à un Atome final. C'est ObjetString.calculer() qui appelle
// evaluer() une seule fois pour obtenir le résultat.
// ============================================================

export class Somme extends Expression {
  constructor(termes = [], base = {}) {
    super();
    this.termes = termes;
    this.instanceOptions = {
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null,
      affiche: base.affiche ?? true
    };
    this.nature = this.deduireNature();
  }

  static simplifierSiUnTerme(termes, opts) {
    if (termes.length === 1) return termes[0];
    return new Somme(termes, opts);
  }

  deduireNature() {
    const natures = this.termes
      .map(t => (typeof t.getNature === "function") ? t.getNature() : null)
      .filter(Boolean);

    if (natures.length === 0) return null;

    const unique = new Set(natures);
    return (unique.size === 1) ? natures[0] : "Composée";
  }

  toString(opts = {}) {
    const str = this.termes.map(t => {
      t.instanceOptions.parentheseObligatoire = "somme";
      return t.toString(opts);
    }).join(" + ");

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese;
    if (["produit", "quotient", "quotientNum", "quotientDen", "regroupement", "differenceD"].includes(parentheseObligatoire) || parenthese === true) {
      return `(${str})`;
    }
    return str;
  }

  toLatex(opts = {}) {
    const str = this.termes.map(t => {
      t.instanceOptions.parentheseObligatoire = "somme";
      return t.toLatex(opts);
    }).join(" + ");

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese;
    if (["produit", "quotient", "quotientNum", "quotientDen", "differenceD"].includes(parentheseObligatoire) || parenthese === true) {
      return `\\left(${str}\\right)`;
    }
    return str;
  }

  evaluer(opts = {}) {
    const valeurs = this.termes.map(t => t.evaluer(opts));
    let base = valeurs[0];
    for (let i = 1; i < valeurs.length; i++) {
      base = base.add(valeurs[i], opts);
    }
    return base;
  }

  isTermeSimple() {
    return this.termes.every(t => typeof t.isAtome === "function" && t.isAtome());
  }

  checkEqual(other) {
    if (!(other instanceof Somme)) return false;
    if (this.termes.length !== other.termes.length) return false;

    for (let i = 0; i < this.termes.length; i++) {
      const a = this.termes[i];
      const b = other.termes[i];
      if (typeof a.checkEqual === "function" && typeof b.checkEqual === "function") {
        if (!a.checkEqual(b)) return false;
      } else {
        if (a.toString?.() !== b.toString?.()) return false;
      }
    }
    return true;
  }

  getNature() { return this.nature; }

  toJSON() {
    return {
      type: "Somme",
      nature: this.getNature(),
      termes: this.termes.map(t => t.toJSON())
    };
  }
}

// ===== Difference =====

export class Difference extends Expression {
  constructor(termes = [], base = {}) {
    super();
    this.termes = termes;
    this.instanceOptions = {
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null,
      affiche: base.affiche ?? true
    };
    this.nature = this.deduireNature();
  }

  static simplifierSiUnTerme(termes, opts) {
    if (termes.length === 1) return termes[0];
    return new Difference(termes, opts);
  }

  deduireNature() {
    const natures = this.termes
      .map(t => (typeof t.getNature === "function") ? t.getNature() : null)
      .filter(Boolean);

    if (natures.length === 0) return null;

    const unique = new Set(natures);
    return (unique.size === 1) ? natures[0] : "Composée";
  }

  toString(opts = {}) {
    const parts = this.termes.map((t, i) => {
      t.instanceOptions.parentheseObligatoire = null;
      if (i >= 1 && (t instanceof Somme || t instanceof Difference)) {
        t.instanceOptions.parentheseObligatoire = "differenceD";
      }
      return t.toString(opts);
    });

    const str = parts.join(" - ");

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese === true;
    if (["produit", "quotient", "quotientNum", "quotientDen", "regroupement", "differenceD"].includes(parentheseObligatoire) || parenthese) {
      return `(${str})`;
    }
    return str;
  }

  toLatex(opts = {}) {
    const parts = this.termes.map((t, i) => {
      t.instanceOptions.parentheseObligatoire = null;
      if (i >= 1 && (t instanceof Somme || t instanceof Difference)) {
        t.instanceOptions.parentheseObligatoire = "differenceD";
      }
      return t.toLatex(opts);
    });
    const str = parts.join(" - ");

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese === true;
    if (["produit", "quotient", "quotientNum", "quotientDen", "regroupement", "differenceD"].includes(parentheseObligatoire) || parenthese) {
      return `\\left(${str}\\right)`;
    }
    return str;
  }

  evaluer(opts = {}) {
    const valeurs = this.termes.map(t => t.evaluer(opts));
    let base = valeurs[0];
    for (let i = 1; i < valeurs.length; i++) {
      base = base.sub(valeurs[i], opts);
    }
    return base;
  }

  isTermeSimple() {
    return this.termes.every(t => typeof t.isAtome === "function" && t.isAtome());
  }

  checkEqual(other) {
    if (!(other instanceof Difference)) return false;
    if (this.termes.length !== other.termes.length) return false;
    return this.termes.every((t, i) => t.checkEqual?.(other.termes[i]));
  }

  getNature() { return this.nature; }

  toJSON() {
    return {
      type: "Difference",
      nature: this.getNature(),
      termes: this.termes.map(t => t.toJSON())
    };
  }
}
// ============================================================
// ProduitQuotientPuissance.js — Produit, Quotient, Puissance
// ============================================================
// Mêmes conventions que Somme/Difference : termes est un tableau
// d'Expression (au moins 2 pour Produit/Quotient), evaluer() réduit
// à un Atome final via les opérations Atome.mul/div/pow.
// ============================================================

export class Produit extends Expression {
  constructor(termes = [], base = {}) {
    super();
    this.termes = termes;
    this.instanceOptions = {
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null,
      affiche: base.affiche ?? true,
      implicite: base.implicite ?? false
    };
    this.nature = this.deduireNature();
  }

  deduireNature() {
    const natures = this.termes
      .map(t => (typeof t.getNature === "function") ? t.getNature() : null)
      .filter(Boolean);
    if (natures.length === 0) return null;
    const unique = new Set(natures);
    return (unique.size === 1) ? natures[0] : "Composée";
  }

  toString(opts = {}) {
    const str = this.termes.map(t => {
      t.instanceOptions.parentheseObligatoire = "produit";
      return t.toString(opts);
    }).join("*");

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese;
    if (["quotient", "quotientNum", "quotientDen", "puissance"].includes(parentheseObligatoire) || parenthese === true) {
      return `(${str})`;
    }
    return str;
  }

  toLatex(opts = {}) {
    const separateur = this.instanceOptions.implicite ? "" : " \\times ";
    const str = this.termes.map(t => {
      t.instanceOptions.parentheseObligatoire = "produit";
      return t.toLatex(opts);
    }).join(separateur);

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese;
    if (["quotient", "quotientNum", "quotientDen", "puissance"].includes(parentheseObligatoire) || parenthese === true) {
      return `\\left(${str}\\right)`;
    }
    return str;
  }

  evaluer(opts = {}) {
    const valeurs = this.termes.map(t => t.evaluer(opts));
    let base = valeurs[0];
    for (let i = 1; i < valeurs.length; i++) {
      base = base.mul(valeurs[i], opts);
    }
    return base;
  }

  isTermeSimple() {
    return this.termes.every(t => typeof t.isAtome === "function" && t.isAtome());
  }

  checkEqual(other) {
    if (!(other instanceof Produit)) return false;
    if (this.termes.length !== other.termes.length) return false;
    return this.termes.every((t, i) => t.checkEqual?.(other.termes[i]));
  }

  getNature() { return this.nature; }

  toJSON() {
    return {
      type: "Produit",
      nature: this.getNature(),
      termes: this.termes.map(t => t.toJSON())
    };
  }
}

// ===== Quotient =====

export class Quotient extends Expression {
  constructor(termes = [], base = {}) {
    super();
    this.termes = termes; // [numerateur, denominateur]
    this.instanceOptions = {
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null,
      affiche: base.affiche ?? true
    };
    this.nature = this.deduireNature();
  }

  deduireNature() {
    const natures = this.termes
      .map(t => (typeof t.getNature === "function") ? t.getNature() : null)
      .filter(Boolean);
    if (natures.length === 0) return null;
    const unique = new Set(natures);
    return (unique.size === 1) ? natures[0] : "Composée";
  }

  toString(opts = {}) {
    const [num, den] = this.termes;
    num.instanceOptions.parentheseObligatoire = "quotientNum";
    den.instanceOptions.parentheseObligatoire = "quotientDen";
    const str = `${num.toString(opts)}:${den.toString(opts)}`;

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese;
    if (["quotient", "quotientNum", "quotientDen", "puissance"].includes(parentheseObligatoire) || parenthese === true) {
      return `(${str})`;
    }
    return str;
  }

  toLatex(opts = {}) {
    const [num, den] = this.termes;
    num.instanceOptions.parentheseObligatoire = null;
    den.instanceOptions.parentheseObligatoire = null;
    return `\\frac{${num.toLatex(opts)}}{${den.toLatex(opts)}}`;
  }

  evaluer(opts = {}) {
    const [num, den] = this.termes;
    return num.evaluer(opts).div(den.evaluer(opts), opts);
  }

  isTermeSimple() {
    return this.termes.every(t => typeof t.isAtome === "function" && t.isAtome());
  }

  checkEqual(other) {
    if (!(other instanceof Quotient)) return false;
    if (this.termes.length !== other.termes.length) return false;
    return this.termes.every((t, i) => t.checkEqual?.(other.termes[i]));
  }

  getNature() { return this.nature; }

  toJSON() {
    return {
      type: "Quotient",
      nature: this.getNature(),
      termes: this.termes.map(t => t.toJSON())
    };
  }
}

// ===== Puissance =====

export class Puissance extends Expression {
  constructor(termes = [], base = {}) {
    super();
    this.termes = termes; // [base, exposant]
    this.instanceOptions = {
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null,
      affiche: base.affiche ?? true
    };
    this.nature = this.deduireNature();
  }

  deduireNature() {
    const natures = this.termes
      .map(t => (typeof t.getNature === "function") ? t.getNature() : null)
      .filter(Boolean);
    if (natures.length === 0) return null;
    const unique = new Set(natures);
    return (unique.size === 1) ? natures[0] : "Composée";
  }

  toString(opts = {}) {
    const [base, exp] = this.termes;
    base.instanceOptions.parentheseObligatoire = "puissance";
    const str = `${base.toString(opts)}^${exp.toString(opts)}`;

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese;
    if (["quotient", "quotientNum", "quotientDen", "puissance"].includes(parentheseObligatoire) || parenthese === true) {
      return `(${str})`;
    }
    return str;
  }

  toLatex(opts = {}) {
    const [base, exp] = this.termes;
    base.instanceOptions.parentheseObligatoire = "puissance";
    return `${base.toLatex(opts)}^{${exp.toLatex(opts)}}`;
  }

  evaluer(opts = {}) {
    const [base, exp] = this.termes;
    return base.evaluer(opts).pow(exp.evaluer(opts), opts);
  }

  isTermeSimple() {
    return this.termes.every(t => typeof t.isAtome === "function" && t.isAtome());
  }

  checkEqual(other) {
    if (!(other instanceof Puissance)) return false;
    if (this.termes.length !== other.termes.length) return false;
    return this.termes.every((t, i) => t.checkEqual?.(other.termes[i]));
  }

  getNature() { return this.nature; }

  toJSON() {
    return {
      type: "Puissance",
      nature: this.getNature(),
      termes: this.termes.map(t => t.toJSON())
    };
  }
}
// ============================================================
// ObjetString.js — parse une expression texte en arbre Expression (calcul littéral)
// ============================================================
// Le tokeniser gère "x", "2x", "x^2", "(x+1)^2", etc. — la distinction
// "exposant collé à une lettre" vs "opérateur de puissance séparé"
// fonctionne pour x comme pour une unité physique. analyserTokens construit
// des Atome algébriques (new Atome(...)), sans notion d'"unité invalide".
//
// calculer() évalue l'arbre UNE fois et renvoie un Atome dont .polynome
// porte le résultat exact (coefficients en Nombre).
// ============================================================

export class ObjetString {
  constructor(expression, options) {
    this.expression = expression;
    this.options = options || {};
    this.erreur = null;
    this.tokens = this.tokeniser(expression);
    try {
      this.arbre = this.construireArbre();
    } catch (e) {
      this.arbre = null;
      this.erreur = e.message;
    }

    this.valid = (this.erreur === null && !!this.arbre);
  }

  isValid() {
    return !!this.valid;
  }

  tokeniser(expr) {
    const s = String(expr);
    const out = [];

    const isSpace     = c => /\s/.test(c);
    const isParen     = c => c === '(' || c === ')';
    const isOp        = c => c === '+' || c === '-' || c === '*' || c === ':';
    const isAtomStart = c => /[0-9a-zA-Z]/.test(c);
    // ^ n'est PAS inclus ici : il est traité séparément (voir plus bas) pour
    // distinguer "x^2" (exposant collé à la variable, fait partie de l'atome)
    // de "(x+1)^2" (opérateur de puissance mathématique, token séparé).
    const isAtomChar  = c => /[0-9a-zA-Z.,/%]/.test(c);
    const isLetter    = c => /[a-zA-Z]/.test(c);

    let i = 0;
    let prev = 'start'; // 'start' | 'atom' | 'op' | 'parenL' | 'parenR'

    while (i < s.length) {
      while (i < s.length && isSpace(s[i])) i++;
      if (i >= s.length) break;

      const c = s[i];

      if (isParen(c)) {
        out.push(c);
        prev = (c === '(') ? 'parenL' : 'parenR';
        i++;
        continue;
      }

      if (isOp(c)) {
        const unaryContext = (prev === 'start' || prev === 'op' || prev === 'parenL');

        // Le signe moins se fusionne avec le nombre s'il est en position unaire.
        // Le plus reste toujours binaire (pour ne pas casser "9+4.5").
        if (c === '-' && unaryContext) {
          let j = i + 1;
          while (j < s.length && isSpace(s[j])) j++;
          if (j < s.length && isAtomStart(s[j])) {
            const sign = c;
            let k = j + 1;
            while (k < s.length && isAtomChar(s[k])) k++;
            out.push(sign + s.slice(j, k));
            i = k;
            prev = 'atom';
            continue;
          }
        }

        out.push(c);
        prev = 'op';
        i++;
        continue;
      }

      // ^ : exposant collé à x ("x^2") si juste après une lettre dans CE token,
      // sinon opérateur de puissance mathématique séparé ("(x+1)^2", "5^2").
      if (c === '^') {
        const precedent = out.length ? out[out.length - 1] : '';
        const colleAUneLettre = (prev === 'atom') && /[a-zA-Z]$/.test(precedent);
        if (colleAUneLettre) {
          // Absorbe "^", le signe optionnel, et les chiffres dans le token en cours.
          let k = i + 1;
          let frag = '^';
          if (k < s.length && (s[k] === '-' || s[k] === '+')) { frag += s[k]; k++; }
          const startDigits = k;
          while (k < s.length && /[0-9]/.test(s[k])) k++;
          if (k === startDigits) {
            // Pas de chiffre après ^ : pas un exposant valide collé, on retombe
            // sur le comportement opérateur ci-dessous.
          } else {
            out[out.length - 1] = precedent + frag + s.slice(startDigits, k);
            i = k;
            prev = 'atom';
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

  analyserTokens() {
    const tokens = this.tokens || [];

    const isOp = (t) => t === '+' || t === '-' || t === '*' || t === ':' || t === '^';
    const isParen = (t) => t === '(' || t === ')';

    const out = [];

    for (const raw of tokens) {
      if (isParen(raw)) {
        out.push({ token: raw, nature: 'parenthèse', paren: raw });
        continue;
      }

      if (isOp(raw)) {
        out.push({ token: raw, nature: 'opération', op: raw });
        continue;
      }

      try {
        const atome = new Atome(raw, {});
        out.push({ token: raw, nature: atome.getNature(), objet: atome });
      } catch (e) {
        out.push({
          token: raw,
          nature: 'inconnu',
          erreur: e?.message || 'inconnu'
        });
      }
    }

    return out;
  }

  construireArbre() {
    const tokensAnalyses = this.analyserTokens();

    // Erreurs de token (format non reconnu par Nombre, lettre autre que x, ...)
    const erreurs = tokensAnalyses.filter(t => t.nature === "inconnu");
    if (erreurs.length > 0) {
      const e = new Error("PARSE_ERROR");
      e.code = "PARSE_ERROR";
      throw e;
    }

    // Parsing récursif descendant :
    //    Somme/Difference > Produit/Quotient (dont mult. implicite) > Puissance > Atome
    let index = 0;

    const parseExpression = () => parseAddSub();

    const peek = () => (index < tokensAnalyses.length ? tokensAnalyses[index] : null);

    const parseAtom = () => {
      if (index >= tokensAnalyses.length) throw new Error("Réponse invalide.");

      const token = tokensAnalyses[index++];

      if (token.token === '(') {
        const expr = parseExpression();
        if (index >= tokensAnalyses.length || tokensAnalyses[index++].token !== ')') {
          throw new Error("Réponse invalide.");
        }
        expr.instanceOptions = { ...(expr.instanceOptions || {}), parenthese: true };
        return expr;
      }

      if (token.objet) return token.objet;
      throw new Error("Réponse invalide.");
    };

    // Puissance : associative à droite (2^3^2 = 2^(3^2)).
    const parsePow = () => {
      const base = parseAtom();
      if (index < tokensAnalyses.length && peek().token === '^') {
        index++;
        const exposant = parsePow();
        return new Puissance([base, exposant], {});
      }
      return base;
    };

    // Un nouveau facteur commence sans opérateur explicite : "(" ou un atome.
    // C'est la multiplication implicite ("3(5+2)", "2(3+1)(4-1)").
    const debuteUnNouveauFacteur = () => {
      const t = peek();
      if (!t) return false;
      return t.token === '(' || !!t.objet;
    };

    const parseMulDiv = () => {
      let left = parsePow();
      while (index < tokensAnalyses.length) {
        const t = peek();
        if (t.token === '*' || t.token === ':') {
          const op = tokensAnalyses[index++].token;
          const right = parsePow();
          left = (op === '*') ? new Produit([left, right], {}) : new Quotient([left, right], {});
        } else if (debuteUnNouveauFacteur()) {
          // Multiplication implicite : pas de token opérateur, on en insère une.
          // On marque ce Produit comme "implicite" pour que son rendu LaTeX
          // colle les facteurs (2(x+3)) plutôt que d'afficher \times.
          const right = parsePow();
          left = new Produit([left, right], { implicite: true });
        } else {
          break;
        }
      }
      return left;
    };

    const parseAddSub = () => {
      let left = parseMulDiv();
      while (index < tokensAnalyses.length && ['+', '-'].includes(tokensAnalyses[index].token)) {
        const op = tokensAnalyses[index++].token;
        const right = parseMulDiv();
        if (op === '+') {
          left = (left instanceof Somme && !left.instanceOptions?.parenthese)
            ? new Somme([...left.termes, right], {})
            : new Somme([left, right], {});
        } else {
          left = new Difference([left, right], {});
        }
      }
      if (left instanceof Somme && left.termes.length === 1) return left.termes[0];
      return left;
    };

    const arbre = parseExpression();
    if (index < tokensAnalyses.length) throw new Error("Réponse invalide.");
    return arbre;
  }

  /**
   * Évalue l'arbre et renvoie l'Atome final.
   * Lève une exception si l'arbre est invalide ou si l'évaluation échoue
   * (degré > DEGRE_MAX, division par x, division par zéro...).
   */
  calculer() {
    if (!this.arbre) throw new Error(this.erreur || "Arbre invalide.");
    const resultat = this.arbre.evaluer(this.options);
    return { resultat };
  }

  /** Représentation LaTeX du résultat final (sans étapes intermédiaires). */
  calculerLatex() {
    const { resultat } = this.calculer();
    return { resultat, latex: resultat.toLatex(this.options) };
  }

  checkEqual(other) {
    try {
      const r1 = this.calculer().resultat;
      const r2 = other.calculer().resultat;
      return r1.equals(r2);
    } catch (e) {
      this.erreur = e.message;
      return false;
    }
  }

  result() {
    try {
      return this.calculer().resultat;
    } catch {
      return null;
    }
  }
}

/**
 * Vérifie que l'ARBRE BRUT (avant évaluation) d'une expression est déjà
 * sous forme réduite : au plus un terme par degré, et chaque terme est un
 * atome direct (ou un simple produit coefficient×monôme, ex: "4*x") — pas
 * une somme/produit qui nécessiterait encore d'être développé ou combiné
 * ("3x + 2x", "2(x+3)", "(x+1)^2"...).
 *
 * Contrairement à checkEqual/equals (égalité mathématique, indifférente à
 * la forme), sert à imposer que l'élève ait effectivement réduit son
 * expression, pas seulement produit une expression équivalente.
 */
export function estFormeReduite(arbre) {
  if (!arbre) return false;

  function aplatir(node) {
    if (node instanceof Somme || node instanceof Difference) {
      return node.termes.flatMap(aplatir);
    }
    return [node];
  }

  function degreDuTerme(node) {
    if (node instanceof Atome) return node.polynome.degre();
    if (node instanceof Produit && node.termes.length === 2 &&
        node.termes.every(t => t instanceof Atome)) {
      try { return node.evaluer().polynome.degre(); }
      catch (e) { return null; }
    }
    return null;
  }

  const degres = aplatir(arbre).map(degreDuTerme);
  if (degres.some(d => d === null)) return false;
  return new Set(degres).size === degres.length;
}
