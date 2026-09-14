// ============================================================
// Expression.js — classe de base + Atome / Duree / Prix
// ============================================================
// Contrat minimal de toute Expression :
//   - evaluer(opts)   -> réduit l'arbre à un Atome (ou sous-classe) final
//   - toString(opts)  -> représentation texte
//   - toLatex(opts)   -> représentation LaTeX
//   - isAtome()       -> true si feuille terminale (valeur+unité)
//   - getNature()     -> "Duree" | "Prix" | "Longueur" | ... | "Composée" | "Inconnue"
//   - checkEqual(other) -> égalité structurelle stricte (même forme d'arbre)
// ============================================================

class Expression {
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

class Atome extends Expression {
  /**
   * Factory : construit le bon type concret (Duree, Prix, Atome) à partir
   * d'une chaîne ("3h", "12€", "5m") ou d'une Grandeur déjà construite.
   */
  static from(input, opts = {}) {
    let grandeur;
    if (input instanceof Grandeur) {
      grandeur = input;
    } else if (typeof input === "string") {
      grandeur = Atome.parser(input.trim())[0];
    } else {
      throw new Error("Input doit être une string ou une instance de Grandeur.");
    }

    // Validation systématique des unités (lève UniteInvalideError si besoin)
    Grandeur.validerUniteDict(grandeur.uniteDict, { throwOnError: true });

    switch (grandeur.nature) {
      case "Duree": return new Duree(grandeur, opts);
      case "Prix":
      case "Monnaie": return new Prix(grandeur, opts);
      default: return new Atome(grandeur, opts);
    }
  }

  constructor(input, base = {}) {
    super();

    if (typeof input === "string") {
      this.texte = input.trim();
      const pars = Atome.parser(this.texte);
      this.grandeur = pars[0];
      this.nombre   = pars[1];
      this.unite    = pars[2];
    } else if (input instanceof Grandeur) {
      this.grandeur = input;
      this.texte = input.toString(base).trim();
      const pars = Atome.parser(this.texte);
      this.nombre = pars[1];
      this.unite  = pars[2];
    } else {
      throw new Error("Atome doit être construit avec une string ou une instance de Grandeur.");
    }

    if (base.strictUnits ?? true) {
      Grandeur.validerUniteDict(this.grandeur.uniteDict, { throwOnError: true });
    }

    this.instanceOptions = {
      affiche: base.affiche ?? true,
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null
    };
    this.nature = this.grandeur.nature;
  }

  static parser(str) {
    str = str.trim();
    str = str.replace(/^([+-]?\d+(?:[.,]\d+)?(?:\/\d+)?)([a-zA-Z€])/u, '$1 $2');

    const [nombreStrRaw, ...unitePartsRaw] = str.split(/\s+/);
    const nombreStr = nombreStrRaw.trim();
    const uniteParts = unitePartsRaw.map(u => u.trim());
    const nombre = new Nombre(nombreStr);

    if (uniteParts.length === 0) {
      return [new Grandeur(nombre, {}), nombre, null];
    } else {
      const unite = uniteParts.join(' ');
      const dict = Atome.parseUniteTexte(unite);
      return [new Grandeur(nombre, dict), nombre, unite];
    }
  }

  static parseUniteTexte(uniteStr) {
    if (typeof uniteStr !== "string") throw new Error("Unité attendue sous forme de chaîne");

    uniteStr = uniteStr.replace(/\s+/g, '');
    if (uniteStr.includes('/')) {
      const [num, den] = uniteStr.split('/');
      uniteStr = num + '·' + den.split('·').map(u => u.includes('^') ? u.replace(/\^(\d+)/, '^-$1') : `${u}^-1`).join('·');
    }

    const dict = {};
    uniteStr.split('·').filter(Boolean).forEach(u => {
      const [sym, expStr] = u.split('^');
      const exp = expStr ? parseInt(expStr, 10) : 1;
      if (!sym || isNaN(exp)) return;
      dict[sym] = (dict[sym] || 0) + exp;
    });

    return dict;
  }

  evaluer(opts) {
    return this;
  }

  toString(opts = {}) {
    const valeur = this.grandeur?.valeur;
    if (!(valeur instanceof Nombre)) throw new Error("Valeur non définie dans l'atome.");

    const uniteStr = this.unite?.toString?.(opts) ?? '';
    if (valeur.valeurNum.a < 0) return `(${valeur.toString(opts)}${uniteStr})`;

    return `${this.nombre.toString(opts)}${uniteStr}`.trim();
  }

  toLatex(opts = {}) {
    const { parentheseObligatoire = null } = opts;
    const valeur = this.grandeur?.valeur;
    const uniteDict = this.grandeur?.uniteDict;

    if (!(valeur instanceof Nombre)) {
      throw new Error("Valeur non définie dans l'atome.");
    }

    const uniteStr = uniteDictToLatexInline(uniteDict);
    const val = valeur.toLatex(opts);

    if (val.includes("+")) {
      const [entier, fraction] = valeur.scinderMixte();
      const g1 = new Grandeur(entier, uniteDict);
      const g2 = new Grandeur(fraction, uniteDict);
      const s = `${g1.toLatex(opts)} + ${g2.toLatex(opts)}`;
      const encadrer = ["produit", "quotient", "quotientDen", "quotientNum", "difference"].includes(parentheseObligatoire);
      return encadrer ? `\\left(${s}\\right)` : s;
    }
    if (valeur.valeurNum.a < 0) return `\\left(${val}\\,${uniteStr}\\right)`;
    return `${val}\\,${uniteStr}`;
  }

  checkEqual(other) {
    return (
      other instanceof Atome &&
      this.grandeur.valeur.equal(other.grandeur.valeur) &&
      Grandeur.unitesEgales(this.grandeur.uniteDict, other.grandeur.uniteDict)
    );
  }

  equals(other) {
    if (!(other instanceof Atome)) return false;
    const n1 = this.getNature?.();
    const n2 = other.getNature?.();
    if (n1 !== n2) return false;
    return this.grandeur?.equals?.(other.grandeur) === true;
  }

  convertirEn(uniteTexte) {
    const dictCible = Atome.parseUniteTexte(uniteTexte);
    if (!Grandeur.unitesEgales(this.grandeur.uniteDict, dictCible)) {
      const grandeurConvertie = this.grandeur.convertirEn(dictCible);
      return new this.constructor(grandeurConvertie, {});
    }
    return this;
  }

  convertirSelonNature(dico) {
    const cible = dico[this.nature];
    if (cible) {
      return this.convertirEn(cible);
    }
    return this;
  }

  isAtome() { return true; }

  getNature() { return this.nature || "Inconnue"; }

  isScalaire() {
    return Grandeur.unitesEgales(this.grandeur?.uniteDict ?? {}, {});
  }

  add(other) {
    if (!(other instanceof Atome)) throw new Error("Addition uniquement entre atomes.");
    const g = this.grandeur.add(other.grandeur);
    return new Atome(g, {});
  }

  sub(other) {
    if (!(other instanceof Atome)) throw new Error("Soustraction uniquement entre atomes.");
    const g = this.grandeur.sub(other.grandeur);
    return new Atome(g, {});
  }

  mul(other) {
    if (!(other instanceof Atome)) throw new Error("Multiplication uniquement entre atomes.");

    const produit = this.grandeur.mul(other.grandeur);
    const isThisScalaire = Grandeur.unitesEgales(this.grandeur.uniteDict, {});
    const isOtherScalaire = Grandeur.unitesEgales(other.grandeur.uniteDict, {});

    if (isThisScalaire && other instanceof Duree) return new Duree(produit, {});
    if (isOtherScalaire && this instanceof Duree) return new Duree(produit, {});

    return new Atome(produit, {});
  }

  div(other) {
    if (!(other instanceof Atome)) throw new Error("Division uniquement entre atomes.");
    const quotient = this.grandeur.div(other.grandeur);
    return new Atome(quotient, {});
  }

  /** Élève l'atome à la puissance entière donnée par l'atome `other` (doit être un scalaire entier). */
  pow(other) {
    if (!(other instanceof Atome)) throw new Error("Exposant invalide : doit être un nombre.");
    if (!other.isScalaire()) throw new Error("Exposant invalide : l'exposant ne peut pas avoir d'unité.");

    const expNombre = other.nombre;
    if (!expNombre.isEntier()) throw new Error("Exposant invalide : seuls les exposants entiers sont supportés.");

    const n = Math.trunc(expNombre.valeurNum.a / expNombre.valeurNum.b);
    const resultat = this.grandeur.pow(n);
    return Atome.from(resultat);
  }

  toJSON() {
    return {
      type: "Atome",
      nature: this.getNature(),
      texte: this.texte,
      valeur: this.nombre?.toString(),
      unite: this.unite || this.grandeur?.uniteDict || null
    };
  }
}

// ===== Duree =====

class Duree extends Atome {
  constructor(input, base = {}) {
    super(input, base);
    this.instanceOptions = {
      affichage: base.affichage ?? "standard",
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? false
    };
    this.nature = "Duree";
  }

  formaterDureeParUnites(unites = ["h", "min", "s"]) {
    const conv = Grandeur.conversionTable.Duree.conversion;

    const enSecondes = this.convertirEn("s");
    let reste = enSecondes.grandeur.valeur;

    const unitesTriees = [...unites].sort((a, b) => conv[b] - conv[a]);
    const result = [];

    for (let i = 0; i < unitesTriees.length; i++) {
      const u = unitesTriees[i];
      const facteur = conv[u];
      if (!facteur) throw new Error(`Unité inconnue : ${u}`);

      const nbUnit = reste.div(Nombre.fromParts(facteur));
      let valeurFinale;

      if (i < unitesTriees.length - 1) {
        const { a, b } = nbUnit.simplify().valeurNum;
        const entier = trunc(a / b);
        valeurFinale = Nombre.fromParts(entier, 1);
        reste = reste.sub(valeurFinale.mul(Nombre.fromParts(facteur)));
      } else {
        valeurFinale = nbUnit.simplify();
      }

      result.push({ unite: u, valeur: valeurFinale });
    }

    return result;
  }

  doitAfficherMixte(unites = ["h", "min", "s"]) {
    const composants = this.formaterDureeParUnites(unites);
    const visibles = composants.filter(c => !c.valeur.equal(Nombre.fromParts(0, 1)));
    return visibles.length > 0;
  }

  toString(opts = {}) {
    const affichage = opts.affichage ?? this.instanceOptions.affichage;
    const affichageClasse = (opts.affichageMixte ?? this.instanceOptions.affichageMixte ?? {})["Duree"];

    if (affichage === "mixte") {
      const unitesAffichage = affichageClasse ?? ["h", "min", "s"];
      const composants = this.formaterDureeParUnites(unitesAffichage);

      const morceaux = composants
        .filter(c => !c.valeur.equal(Nombre.fromParts(0, 1)))
        .map(c => `${c.valeur.toString(opts)}${c.unite}`);

      const str = morceaux.join("+");

      const parentheseObligatoire = this.instanceOptions.parentheseObligatoire;
      const doitEncadrer = ["produit", "quotient", "quotientDen", "quotientNum", "differenceD"].includes(parentheseObligatoire);

      return doitEncadrer ? `(${str})` : str;
    }

    return super.toString(opts);
  }

  toLatex(opts = {}) {
    const modeAffichage = opts.affichage ?? this.instanceOptions.affichage;
    const mixteMap = opts.affichageMixte ?? this.instanceOptions.affichageMixte ?? {};
    const unitesCibles = mixteMap["Duree"] ?? ["h", "min", "s"];

    if (modeAffichage === "mixte") {
      const composants = this.formaterDureeParUnites(unitesCibles);

      const morceaux = composants
        .filter(c => {
          if (typeof c.valeur.isZero === 'function') return !c.valeur.isZero();
          return c.valeur != 0;
        })
        .map(c => {
          const valStr = typeof c.valeur.toLatex === 'function' ? c.valeur.toLatex(opts) : c.valeur;
          return `${valStr}\\,\\text{${c.unite}}`;
        });

      if (morceaux.length === 0) return `0\\,\\text{s}`;

      const str = morceaux.join("+");

      const p = opts.parentheseObligatoire ?? this.instanceOptions.parentheseObligatoire;
      const doitEncadrer = ["produit", "quotient", "difference"].includes(p);

      return doitEncadrer ? `\\left(${str}\\right)` : str;
    }

    return super.toLatex(opts);
  }

  add(other, opts = {}) {
    if (!(other instanceof Duree)) throw new Error("Addition uniquement entre durées.");
    const somme = this.grandeur.add(other.grandeur);
    return new Duree(somme, opts);
  }

  sub(other, opts = {}) {
    if (!(other instanceof Duree)) throw new Error("Soustraction uniquement entre durées.");
    const diff = this.grandeur.sub(other.grandeur);
    return new Duree(diff, opts);
  }

  mul(other) {
    if (!(other instanceof Atome)) throw new Error("Multiplication uniquement entre atomes.");
    const produit = this.grandeur.mul(other.grandeur);
    const isScalaire = Grandeur.unitesEgales(other.grandeur.uniteDict, {});
    return isScalaire ? new Duree(produit, {}) : new Atome(produit, {});
  }

  div(other) {
    if (!(other instanceof Atome)) throw new Error("Division uniquement entre atomes.");
    const quotient = this.grandeur.div(other.grandeur);
    const isScalaire = Grandeur.unitesEgales(other.grandeur.uniteDict, {});
    return isScalaire ? new Duree(quotient, {}) : new Atome(quotient, {});
  }
}

// ===== Prix =====

class Prix extends Atome {
  constructor(input, base = {}) {
    super(input, base);
    this.instanceOptions = {
      affichage: base.affichage ?? "standard",
      parenthese: base.parenthese ?? false,
      parentheseObligatoire: base.parentheseObligatoire ?? null
    };
    this.nature = "Prix";
  }

  add(other, opts = {}) {
    if (!(other instanceof Prix)) throw new Error("Addition uniquement entre Prix.");
    const somme = this.grandeur.add(other.grandeur);
    return new Prix(somme, opts);
  }

  sub(other, opts = {}) {
    if (!(other instanceof Prix)) throw new Error("Soustraction uniquement entre Prix.");
    const diff = this.grandeur.sub(other.grandeur);
    return new Prix(diff, opts);
  }

  mul(other, opts = {}) {
    if (!(other instanceof Atome)) throw new Error("Multiplication uniquement avec un Atome.");
    const isScalaire = Grandeur.unitesEgales(other.grandeur.uniteDict, {});
    if (!isScalaire) throw new Error("Multiplication uniquement par un scalaire.");
    const produit = this.grandeur.mul(other.grandeur);
    return new Prix(produit, opts);
  }

  div(other, opts = {}) {
    if (!(other instanceof Atome)) throw new Error("Division uniquement avec un Atome.");
    const isScalaire = Grandeur.unitesEgales(other.grandeur.uniteDict, {});
    if (!isScalaire) throw new Error("Division uniquement par un scalaire.");
    const quotient = this.grandeur.div(other.grandeur);
    return new Prix(quotient, opts);
  }

  toLatex(opts = {}) {
    const valeurLatex = this.grandeur.valeur.toLatex(opts);
    const uniteLatex = uniteDictToLatexInline(this.grandeur.uniteDict) || '\\text{€}';
    return `${valeurLatex}\\,${uniteLatex}`;
  }

  toString(opts = {}) {
    const uniteTxt = afficheUnitesCollegien(this.grandeur.uniteDict) || '€';
    return `${this.grandeur.valeur.toString(opts)}${uniteTxt}`.trim();
  }

  static estPrix(grandeur) {
    if (!grandeur || !grandeur.uniteDict) return false;
    const unites = Object.keys(grandeur.uniteDict);
    return unites.length === 1 && unites[0] === "€";
  }
}