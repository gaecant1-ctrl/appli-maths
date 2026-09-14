// ============================================================
// Somme.js — Somme et Difference, version blindée
// ============================================================
// Plus de logique "pas à pas" : evaluer() réduit directement
// à un Atome final. C'est ObjetString.calculer() qui appelle
// evaluer() une seule fois pour obtenir le résultat.
// ============================================================

class Somme extends Expression {
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

class Difference extends Expression {
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
