


class Fraction {

  // ================= CONSTRUCTION =================
  constructor(num, den) {
    if (den === 0) throw new Error("Dénominateur nul");

    // fraction brute (trace du calcul)
    this.nb = num;
    this.db = den;

    // normalisation du signe
    if (this.db < 0) {
      this.nb = -this.nb;
      this.db = -this.db;
    }

    // fraction canonique (simplifiée)
    const g = Fraction.gcd(Math.abs(this.nb), Math.abs(this.db));
    this.n = this.nb / g;
    this.d = this.db / g;

    // statut déterministe
    this.statut = this.computeStatut();
  }

  // ================= OUTILS MATH =================
  static gcd(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return a;
  }

  isEntier() {
    return this.d === 1;
  }

  valeurAbsolue() {
    return Math.abs(this.n / this.d);
  }

  estDecimaleExacte() {
    let d = this.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return d === 1;
  }

  // ================= STATUT (SANS HASARD) =================
  computeStatut() {

    // ENTIER
    if (this.isEntier()) {
      return "entier";
    }

    // FRACTION STRICTE (< 1)
    if (Math.abs(this.n) < Math.abs(this.d)) {
      if (this.estDecimaleExacte()) {
        return "decimal";
      }
      return "simplifie";
    }

    // FRACTION IMPROPRE (>= 1)
    if (this.estDecimaleExacte()) {
      return "decimal";
    }

    return "mixte_simplifie";
  }

  // ================= AFFICHAGES TEXTE =================
  toString() {
    switch (this.statut) {

      case "entier":
        return `${this.n}`;

      case "simplifie":
        return `${this.n}/${this.d}`;

      case "mixte_simplifie":
        return this.mixedString(this.n, this.d);

      case "decimal":
        return (this.n / this.d).toString();

      default:
        throw new Error("Statut inconnu : " + this.statut);
    }
  }

  mixedString(num, den) {
    const e = Math.trunc(num / den);
    const r = Math.abs(num - e * den);
    return `${e}+${r}/${den}`;
  }

  // ================= ÉGALITÉ MATH =================
  equals(other) {
    return this.n === other.n && this.d === other.d;
  }

  // ================= AFFICHAGES LaTeX =================
  toLatex(statutImpose = null){
    const statut = statutImpose || this.statut;

    switch(statut){

      case "entier":
        return `${this.n}`;

      case "simplifie":
        return `\\dfrac{${this.n}}{${this.d}}`;

      case "mixte_simplifie":
        return this.latexMixte(this.n, this.d);

      case "decimal":
        return (this.n / this.d).toString().replace(".", ",");

      default:
        throw new Error("Statut LaTeX inconnu : " + statut);
    }
  }

  latexMixte(num, den){
    const e = Math.trunc(num / den);
    const r = Math.abs(num - e * den);
    return `${e}+\\dfrac{${r}}{${den}}`;
  }
}


// ======================
// STRUCTURE DE NIVEAU
// ======================

class Niveau {

  /**
   * @param {Object} ctx
   * ctx = {
   *   op: "+|-|*|:",
   *   gauche: { valeur, type },
   *   droite: { valeur, type }
   * }
   */
  autoriseOperation(ctx){
    throw new Error("autoriseOperation doit être implémentée");
  }
}

// ======================
// NIVEAU 6e
// ======================

class Niveau6 extends Niveau {

  autoriseOperation(ctx){
    const { op, gauche, droite } = ctx;

    // ❌ fraction interdite comme diviseur
    if(op === ":" && droite.type === "fraction"){
      return false;
    }

    // ❌ négatif interdit comme diviseur
    if(op === ":" && droite.valeur < 0){
      return false;
    }

    // ❌ pas de résultat négatif
    if(op === "-" && gauche.valeur < droite.valeur){
      return false;
    }

    return true;
  }
}

// ======================
// NIVEAU 5e
// ======================

class Niveau5 extends Niveau {

  autoriseOperation(ctx){
    const { op, gauche, droite } = ctx;

    // ❌ fraction interdite comme diviseur
    if(op === ":" && droite.type === "fraction"){
      return false;
    }

    // ❌ négatif interdit comme diviseur
    if(op === ":" && droite.valeur < 0){
      return false;
    }

    // ✔️ négatifs autorisés ailleurs
    return true;
  }
}

