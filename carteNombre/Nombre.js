export class Nombre {

  constructor(a, b = 1) {

    this.a0 = a;
    this.b0 = b;

    const g = Nombre.pgcd(a, b);

    this.a = a / g;
    this.b = b / g;

    this.valeur = this.a / this.b;

    this.ecritures = [];

    this.genererEcritures();


  }

  /* ===============================
     OUTILS
  =============================== */

  static pgcd(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return Math.abs(a);
  }

  static fracLatex(a, b) {
    if (b === 1) return `${a}`;
    return `\\dfrac{${a}}{${b}}`;
  }

  static partEntLatex(a, b) {
    if (b === 1) return `${a}`;
    if (a < b) return Nombre.fracLatex(a, b);
    return `${Math.floor(a/b)} + \\dfrac{${a%b}}{${b}}`;
  }
  
  static decimalMixte(num, base){

  const entier = Math.floor(num/base);
  const reste = num % base;

  if(reste === 0) return `${entier}`;

  return `${entier} + \\dfrac{${reste}}{${base}}`;

}

  static base25(n) {
    while (n % 2 === 0) n /= 2;
    while (n % 5 === 0) n /= 5;
    return n === 1;
  }

  ajouter(description, statut, latex, type) {

    if (!latex) return;

    if (this.ecritures.some(e => e.latex === latex)) return;

    this.ecritures.push({
      description,
      statut,
      latex,
      type
    });

  }

  static nomFraction(b){

    const noms = {
      1: "une fois",
      2: "la moitié de ",
      3: "le tiers de ",
      4: "le quart de ",
      5: "le cinquième de",
      6: "le sixième de",
      7: "le septième de",
      8: "le huitième de",
      9: "le neuvième de",
      10:"le dixième de",
      100:"le centième de"
    };

    if(noms[b]) return noms[b];

    return `${b}ième de `;
  }

  static nomFractionBis(b){

    const noms = {
      1: "unité",
      2: "demi",
      3: "tiers",
      4: "quart",
      5: "cinquième",
      6: "sixième",
      7: "septième",
      8: "huitième",
      9: "neuvième",
      10:"dixième",
      100:"centième"
    };

    if(noms[b]) return noms[b];

    return `${b}ième`;
  }

  /* ===============================
     GENERATION DES ECRITURES
  =============================== */

  genererEcritures() {

    const estDecimal = Nombre.base25(this.b);

    const symb = estDecimal ? "" : "\\approx ";

    /* écriture décimale */

    const decExact = this.valeur;
    const decApprox = Math.round(this.valeur * 100) / 100;

    const decTex = estDecimal
      ? decExact.toString().replace(".", "{,}")
      : decApprox.toString().replace(".", "{,}");

    /* ===============================
       FRACTION DECIMALE
    =============================== */

    let numDec;
    let base;

    if(estDecimal){

      let k = 0;
      let den = this.b;

      while (den % 2 === 0) {
        den /= 2;
        k++;
      }

      while (den % 5 === 0) {
        den /= 5;
        k++;
      }

      base = Math.pow(10, k);

      numDec = Math.round(this.valeur * base);

    }
    else{

      base = 100;
      numDec = Math.round(this.valeur * 100);

    }

    /* ===============================
       POURCENTAGE
    =============================== */

    const pourcent = estDecimal
      ? Math.round(this.valeur * 100)
      : Math.round(this.valeur * 100);

    /* ===============================
       RATIONNEL
    =============================== */


    this.ajouter(
      "Fraction simplifiée",
      "exact",
      Nombre.fracLatex(this.a, this.b),
      "rationnel"
    );

    this.ajouter(
      "Écriture mixte",
      "exact",
      Nombre.partEntLatex(this.a, this.b),
      "rationnel"
    );

    this.ajouter(
      `Quotient de ${this.a}  par ${this.b}`,
      "exact",
      `${this.a}:${this.b}`,
      "rationnel"
    );

    const nom = Nombre.nomFraction(this.b);
    const nomBis = Nombre.nomFractionBis(this.b);

    this.ajouter(
      `${nom} ${this.a}`,
      "exact",
      `${Nombre.fracLatex(1,this.b)} \\times ${this.a}`,
      "rationnel"
    );

    this.ajouter(
      `${this.a} ${nomBis}${this.a>1 && this.b!=3 ? "s" : ""}`,
      "exact",
      `${this.a} \\times ${Nombre.fracLatex(1,this.b)}`,
      "rationnel"
    );

    /* ===============================
       DECIMAL
    =============================== */

    this.ajouter(
      "Écriture décimale",
      estDecimal ? "exact" : "approche",
      symb + decTex,
      "decimal"
    );
    
 this.ajouter(
  "Écriture décimale mixte",
  estDecimal ? "exact" : "approche",
  symb + Nombre.decimalMixte(numDec, base),
  "decimal"
);

    this.ajouter(
      "Fraction décimale",
      estDecimal ? "exact" : "approche",
      symb + `\\dfrac{${numDec}}{${base}}`,
      "decimal"
    );

    this.ajouter(
      "Pourcentage",
      estDecimal ? "exact" : "approche",
      symb + `${pourcent}\\%`,
      "decimal"
    );
    
    this.ajouter(
      "Fraction initiale",
      "exact",
      Nombre.fracLatex(this.a0, this.b0),
      "rationnel"
    );


  }

  /* ===============================
     FILTRES
  =============================== */

  getRationnels() {
    return this.ecritures.filter(e => e.type === "rationnel");
  }

  getDecimaux() {
    return this.ecritures.filter(e => e.type === "decimal");
  }

}