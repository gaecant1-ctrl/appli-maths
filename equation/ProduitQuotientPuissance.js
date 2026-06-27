// ============================================================
// ProduitQuotientPuissance.js — Produit, Quotient, Puissance
// ============================================================
// Mêmes conventions que Somme/Difference : termes est un tableau
// d'Expression (au moins 2 pour Produit/Quotient), evaluer() réduit
// à un Atome final via les opérations Atome.mul/div/pow.
// ============================================================

class Produit extends Expression {
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

class Quotient extends Expression {
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

class Puissance extends Expression {
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
