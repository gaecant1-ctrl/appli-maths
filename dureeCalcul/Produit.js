// ============================================================
// Produit.js — Produit et Quotient, version blindée
// ============================================================
// Plus de logique "pas à pas" / distribution / aplatissement :
// evaluer() réduit directement à un Atome final.
// ============================================================

class Produit extends Expression {
  constructor(facteurs = [], base = {}) {
    super();
    this.facteurs = facteurs;
    this.instanceOptions = {
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null,
      affiche: base.affiche ?? true
    };
    this.nature = this.deduireNature();
  }

  static simplifierSiUnFacteur(facteurs, opts = {}) {
    if (facteurs.length === 1) return facteurs[0];
    return new Produit(facteurs, opts);
  }

  deduireNature() {
    try {
      const valeur = this.evaluer({});
      return valeur?.nature || null;
    } catch (e) {
      return null;
    }
  }

  toString(opts = {}) {
    const str = this.facteurs.map(t => {
      t.instanceOptions.parentheseObligatoire = "produit";
      return t.toString(opts);
    }).join(" × ");

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese;
    if (["quotientDen"].includes(parentheseObligatoire) || parenthese === true) {
      return `(${str})`;
    }
    return str;
  }

  toLatex(opts = {}) {
    const latex = this.facteurs.map(t => {
      t.instanceOptions.parentheseObligatoire = "produit";
      return t.toLatex(opts);
    }).join(" × ");

    const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
    const parenthese = this.instanceOptions.parenthese;
    if (["quotientDen"].includes(parentheseObligatoire) || parenthese === true) {
      return `(${latex})`;
    }
    return latex;
  }

  evaluer(opts = {}) {
    const valeurs = this.facteurs.map(f => f.evaluer(opts));
    if (!valeurs.every(v => v.isAtome?.())) {
      throw new Error("evaluer: tous les facteurs doivent être des atomes");
    }
    return valeurs.reduce((acc, val) => acc.mul(val, opts));
  }

  isFacteurSimple() {
    return this.facteurs.every(f => typeof f.isAtome === "function" && f.isAtome());
  }

  checkEqual(other) {
    if (!(other instanceof Produit)) return false;
    if (this.facteurs.length !== other.facteurs.length) return false;

    for (let i = 0; i < this.facteurs.length; i++) {
      const f1 = this.facteurs[i];
      const f2 = other.facteurs[i];
      if (typeof f1.checkEqual !== "function" || typeof f2.checkEqual !== "function") return false;
      if (!f1.checkEqual(f2)) return false;
    }
    return true;
  }

  getNature() { return this.nature; }

  toJSON() {
    return {
      type: "Produit",
      nature: this.getNature(),
      facteurs: this.facteurs.map(f => f.toJSON())
    };
  }
}

// ===== Quotient =====

class Quotient extends Expression {
  // Compat : ([num, den], base) OU (num, den, base)
  constructor(arg1 = [], arg2 = {}, arg3) {
    super();

    let termes, base;
    if (Array.isArray(arg1)) {
      termes = arg1;
      base = arg2 || {};
    } else {
      const numerateur = arg1;
      const denominateur = arg2;
      base = arg3 || {};
      termes = [numerateur, denominateur];
    }

    if (!Array.isArray(termes) || termes.length !== 2) {
      throw new Error("Quotient: il faut exactement deux termes [numerateur, denominateur].");
    }
    if (!termes[0] || !termes[1]) {
      throw new Error("Quotient: numérateur et dénominateur doivent être définis.");
    }

    this.termes = termes; // [num, den]

    this.instanceOptions = {
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null,
      affiche: base.affiche ?? true
    };

    this.nature = this.deduireNature();
  }

  static simplifierSiTrivial(num, den, opts = {}) {
    if (den?.isAtome?.() && den.isUn?.() === true) return num;
    if (num?.isAtome?.() && num.isZero?.() === true) return num;
    return new Quotient([num, den], opts);
  }

  isTermeSimple() {
    return this.termes.every(t => typeof t.isAtome === "function" && t.isAtome());
  }

  deduireNature() {
    try {
      const v = this.evaluer({});
      return v?.nature || null;
    } catch (_e) {
      return null;
    }
  }

  getNature() { return this.nature; }

  toString(opts = {}) {
    const [num, den] = this.termes;
    if (num?.instanceOptions) num.instanceOptions.parentheseObligatoire = "quotientNum";
    if (den?.instanceOptions) den.instanceOptions.parentheseObligatoire = "quotientDen";

    const s = `${num.toString?.(opts)} ÷ ${den.toString?.(opts)}`;

    const pObl = this.instanceOptions.parentheseObligatoire;
    const pForc = this.instanceOptions.parenthese === true;
    const doitEncadrer = pForc || pObl === "quotientDen";

    return doitEncadrer ? `(${s})` : s;
  }

  toLatex(opts = {}) {
    const [num, den] = this.termes;
    if (num?.instanceOptions) num.instanceOptions.parentheseObligatoire = "quotientNum";
    if (den?.instanceOptions) den.instanceOptions.parentheseObligatoire = "quotientDen";

    const s = `${num.toLatex?.(opts)} \\div ${den.toLatex?.(opts)}`;

    const pObl = this.instanceOptions.parentheseObligatoire;
    const pForc = this.instanceOptions.parenthese === true;
    const doitEncadrer = pForc || pObl === "quotientDen";

    return doitEncadrer ? `\\left(${s}\\right)` : s;
  }

  evaluer(opts = {}) {
    const [n, d] = this.termes.map(t => t.evaluer?.(opts));
    if (!(n?.isAtome?.()) || !(d?.isAtome?.())) {
      throw new Error("evaluer: numérateur et dénominateur doivent être des atomes");
    }
    return n.div(d, opts);
  }

  checkEqual(other) {
    if (!(other instanceof Quotient)) return false;
    if (!Array.isArray(other.termes) || other.termes.length !== 2) return false;
    return this.termes.every((t, i) => t?.checkEqual?.(other.termes[i]));
  }

  toJSON() {
    return {
      type: "Quotient",
      nature: this.getNature(),
      termes: this.termes.map(t => t?.toJSON?.())
    };
  }
}

// ===== Puissance =====
// base^exposant — l'exposant doit s'évaluer à un atome scalaire entier.
// L'unité de la base est élevée à cette puissance (ex: m^2 -> exposant unité ×2).

class Puissance extends Expression {
  constructor(termes = [], base = {}) {
    super();
    if (!Array.isArray(termes) || termes.length !== 2) {
      throw new Error("Puissance: il faut exactement deux termes [base, exposant].");
    }
    this.termes = termes; // [base, exposant]
    this.instanceOptions = {
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null,
      affiche: base.affiche ?? true
    };
    this.nature = this.deduireNature();
  }

  deduireNature() {
    try {
      const v = this.evaluer({});
      return v?.nature || null;
    } catch (_e) {
      return null;
    }
  }

  getNature() { return this.nature; }

  isTermeSimple() {
    return this.termes.every(t => typeof t.isAtome === "function" && t.isAtome());
  }

  toString(opts = {}) {
    const [base, exp] = this.termes;
    if (base?.instanceOptions) base.instanceOptions.parentheseObligatoire = "puissanceBase";
    if (exp?.instanceOptions) exp.instanceOptions.parentheseObligatoire = "puissanceExposant";

    const s = `${base.toString?.(opts)}^${exp.toString?.(opts)}`;

    const pObl = this.instanceOptions.parentheseObligatoire;
    const pForc = this.instanceOptions.parenthese === true;
    const doitEncadrer = pForc || ["quotientDen"].includes(pObl);

    return doitEncadrer ? `(${s})` : s;
  }

  toLatex(opts = {}) {
    const [base, exp] = this.termes;
    if (base?.instanceOptions) base.instanceOptions.parentheseObligatoire = "puissanceBase";
    if (exp?.instanceOptions) exp.instanceOptions.parentheseObligatoire = "puissanceExposant";

    const s = `${base.toLatex?.(opts)}^{${exp.toLatex?.(opts)}}`;

    const pObl = this.instanceOptions.parentheseObligatoire;
    const pForc = this.instanceOptions.parenthese === true;
    const doitEncadrer = pForc || ["quotientDen"].includes(pObl);

    return doitEncadrer ? `\\left(${s}\\right)` : s;
  }

  evaluer(opts = {}) {
    const [base, exp] = this.termes.map(t => t.evaluer?.(opts));
    if (!(base?.isAtome?.()) || !(exp?.isAtome?.())) {
      throw new Error("evaluer: base et exposant doivent être des atomes");
    }
    return base.pow(exp);
  }

  checkEqual(other) {
    if (!(other instanceof Puissance)) return false;
    return this.termes.every((t, i) => t?.checkEqual?.(other.termes[i]));
  }

  toJSON() {
    return {
      type: "Puissance",
      nature: this.getNature(),
      termes: this.termes.map(t => t?.toJSON?.())
    };
  }
}
