
// === FONCTIONS UTILITAIRES POUR AVOID P5.JS CONFLITS ===
function util_abs(n) {
  return n < 0 ? -n : n;
}

function util_gcd(a, b) {
  a = util_abs(a); b = util_abs(b);
  while (b) { let t = b; b = a % b; a = t; }
  return a;
}

function util_lcm(a, b) {
  return util_abs(a * b) / util_gcd(a, b);
}

function util_trunc(n) {
  return n >= 0 ? n - (n % 1) : n - (n % 1);
}

function util_round(n) {
  const entier = util_trunc(n);
  const fraction = n - entier;
  return fraction >= 0.5 ? entier + 1 : entier;
}


function random(arg1, arg2) {
  if (Array.isArray(arg1)) {
    // random([a, b, c]) → choisi un élément
    const index = Math.floor(Math.random() * arg1.length);
    return arg1[index];
  }

  if (typeof arg1 === 'number' && typeof arg2 === 'number') {
    // random(min, max) → flottant entre les deux
    return Math.random() * (arg2 - arg1) + arg1;
  }

  if (typeof arg1 === 'number') {
    // random(max) → entre 0 et max
    return Math.random() * arg1;
  }

  throw new Error("Invalid arguments for random()");
}

function randomInt(min, max) {
  if (typeof min !== "number" || typeof max !== "number") {
    throw new Error("randomInt requires two numbers");
  }

  min = Math.ceil(min);
  max = Math.floor(max);

  // Retourne un entier dans [min, max] inclus
  return Math.floor(Math.random() * (max - min + 1)) + min;
}


class Nombre {
  constructor(s) {
    this.initial = s;
    this.valeurNum = this.parse(s);
    this.valeur = s;

    // Type d'écriture (décimal ou fraction)
    if (s.includes('/')) {
      this.typeEcriture = 'frac';
    } else {
      this.typeEcriture = 'dec';
    }
  }

  static fromParts(a, b = 1) {
    const n = new Nombre("0");
    n.valeurNum = { a, b };
    n.typeEcriture = 'frac';
    return n;
  }

  parse(s) {
    s = s.replace(/,/g, '.').replace(/\s+/g, ' ').trim();
    if (/^[+-]?\d+$/.test(s)) return { a: parseInt(s), b: 1 };

    if (/^[+-]?\d*\.\d+$/.test(s)) {
      const [intPart, decPart] = s.split('.');
      const denom = 10 ** decPart.length;
      const numer = parseInt(intPart || '0') * denom + parseInt(decPart);
      return { a: numer, b: denom };
    }

    if (/^[+-]?\d+\/[+-]?\d+$/.test(s)) {
      const [a, b] = s.split('/').map(Number);
      if (b === 0) throw new Error("Dénominateur nul");
      return { a, b };
    }

    const mixte = /^([+-]?\d+)\s*[+]?\s*([+-]?\d+)\/([+-]?\d+)$/;
    if (mixte.test(s)) {
      const [, ent, num, den] = s.match(mixte);
      if (den === '0') throw new Error("Dénominateur nul");
      const signe = parseInt(ent) < 0 ? -1 : 1;
      const a = parseInt(ent) * parseInt(den) + signe * parseInt(num);
      return { a, b: parseInt(den) };
    }

    throw new Error("Format invalide : " + s);
  }

  isSimp() {
    if (this.typeEcriture === "dec") return true;
    const { a, b } = this.valeurNum;
    return util_gcd(a, b) === 1;
  }

  isDecimal() {
    const { a, b } = this.valeurNum;
    let den = b / util_gcd(a, b);
    while (den % 2 === 0) den /= 2;
    while (den % 5 === 0) den /= 5;
    return den === 1;
  }

  isEntier() {
    const { a, b } = this.simplify().valeurNum;
    return b === 1;
  }

  isFractionMixte() {
    const { a, b } = this.simplify().valeurNum;
    return b !== 1 && util_abs(a) > b;
  }

  scinderMixte() {
    const simp = this.simplify().valeurNum;
    const entier = util_trunc(simp.a / simp.b);
    const reste = util_abs(simp.a % simp.b);
    const fraction = Nombre.fromParts(reste, simp.b);
    return [Nombre.fromParts(entier, 1), fraction];
  }

  getValDec(precisionMax = 10, arrondi = false) {
    const { a, b } = this.valeurNum;

    if (b === 1) return a.toString();

    const entier = util_trunc(a / b);
    let reste = util_abs(a % b);
    const absB = util_abs(b);

    if (arrondi) {
      if (reste === 0) return entier.toString();

      let numer = reste * (10 ** precisionMax);
      let arrondiNum = util_round(numer / absB);

      if (arrondiNum >= 10 ** precisionMax) {
        return (entier + 1).toString();
      }

      let decimalStr = arrondiNum.toString().padStart(precisionMax, '0');
      decimalStr = decimalStr.replace(/0+$/, '');

      return decimalStr.length === 0
        ? entier.toString()
        : `${entier}.${decimalStr}`;
    }

    let decimals = "";
    for (let i = 0; i < precisionMax && reste !== 0; i++) {
      reste *= 10;
      const chiffre = util_trunc(reste / absB);
      decimals += chiffre.toString();
      reste = reste % absB;
    }

    return decimals.length === 0
      ? entier.toString()
      : `${entier}.${decimals}`;
  }

  simplify() {
    const { a, b } = this.valeurNum;
    const d = util_gcd(a, b);
    return Nombre.fromParts(a / d, b / d);
  }

  inverse() {
    const { a, b } = this.valeurNum;
    if (a === 0) throw new Error("Impossible d'inverser zéro");
    return Nombre.fromParts(b, a);
  }

  equal(other) {
    if (!(other instanceof Nombre)) return false;
    const a1 = this.simplify().valeurNum;
    const a2 = other.simplify().valeurNum;
    return a1.a === a2.a && a1.b === a2.b;
  }

  static determineResultType(t1, t2, isDecimal) {
    return (t1 === 'dec' && t2 === 'dec' && isDecimal) ? 'dec' : 'frac';
  }

  add(other) {
    const { a: a1, b: b1 } = this.valeurNum;
    const { a: a2, b: b2 } = other.valeurNum;
    const denom = util_lcm(b1, b2);
    const num = a1 * (denom / b1) + a2 * (denom / b2);
    const isDec = Nombre.fromParts(num, denom).isDecimal();
    const type = Nombre.determineResultType(this.typeEcriture, other.typeEcriture, isDec);
    return Nombre.fromParts(num, denom).setTypeEcriture(type);
  }

  sub(other) {
    const { a: a1, b: b1 } = this.valeurNum;
    const { a: a2, b: b2 } = other.valeurNum;
    const denom = util_lcm(b1, b2);
    const num = a1 * (denom / b1) - a2 * (denom / b2);
    const isDec = Nombre.fromParts(num, denom).isDecimal();
    const type = Nombre.determineResultType(this.typeEcriture, other.typeEcriture, isDec);
    return Nombre.fromParts(num, denom).setTypeEcriture(type);
  }

  mul(other) {
    const { a: a1, b: b1 } = this.valeurNum;
    const { a: a2, b: b2 } = other.valeurNum;
    const num = a1 * a2, denom = b1 * b2;
    const isDec = Nombre.fromParts(num, denom).isDecimal();
    const type = Nombre.determineResultType(this.typeEcriture, other.typeEcriture, isDec);
    return Nombre.fromParts(num, denom).setTypeEcriture(type);
  }

  div(other) {
    const { a: a1, b: b1 } = this.valeurNum;
    const { a: a2, b: b2 } = other.valeurNum;
    if (a2 === 0) throw new Error("Division par zéro");
    const num = a1 * b2, denom = b1 * a2;
    const isDec = Nombre.fromParts(num, denom).isDecimal();
    const type = Nombre.determineResultType(this.typeEcriture, other.typeEcriture, isDec);
    return Nombre.fromParts(num, denom).setTypeEcriture(type);
  }

  pow(exposant) {
    if (!Number.isInteger(exposant)) throw new Error("Exposant non entier");
    if (exposant === 0) return new Nombre("1");
    let result = Nombre.fromParts(this.valeurNum.a, this.valeurNum.b);

    const positive = util_abs(exposant);
    for (let i = 1; i < positive; i++) {
      result = result.mul(this);
    }
    return exposant > 0 ? result : new Nombre("1").div(result);
  }

  setTypeEcriture(type) {
    this.typeEcriture = type;
    return this;
  }

  toString(opts = {}) {
    let str;
    const { a, b } = this.valeurNum;
    const simp = this.simplify().valeurNum;
    const { nombreAff = "auto", precision = 10 } = opts;
    if (simp.b === 1) return simp.a.toString();
    if (nombreAff === "fraction") return `${a}/${b}`;
    if (nombreAff === "fractionSimple") return simp.b === 1 ? simp.a.toString() : `${simp.a}/${simp.b}`;
    if (nombreAff === "fractionMixte") {
    
      const entier = util_trunc(a / b);
      const reste = util_abs(a % b);
      return reste === 0 ? entier.toString() : `${entier} + ${reste}/${b}`;
    }
    if (nombreAff === "decimal") return this.getValDec(precision, opts.arrondi).toString();
    if (nombreAff === "auto") {
      if(this.isDecimal()) str = this.getValDec(precision).toString();
      else str = `${simp.a}/${simp.b}`;
    return str;
    }
    
  
    return `${simp.a}/${simp.b}`;
  }

  toLatex(opts = {}) {
    const { a, b } = this.valeurNum;
    const simp = this.simplify().valeurNum;

    const {
      nombreAff = "auto",
      precision = 10,
      arrondi = false
    } = opts;

    let latexStr;

    if (nombreAff === "decimal") latexStr = this.getValDec(precision, arrondi).toString();
    else if (nombreAff === "fraction") latexStr = `\\frac{${a}}{${b}}`;
    else if (nombreAff === "fractionSimple") {
      latexStr = simp.b === 1 ? simp.a.toString() : `\\frac{${simp.a}}{${simp.b}}`;
    }
    else if (nombreAff === "fractionMixte") {
      const entier = util_trunc(a / b);
      const reste = util_abs(a % b);
      latexStr = reste === 0
        ? entier.toString()
        : `\\left(${entier} + \\frac{${reste}}{${b}}\\right)`;
    }
    else if (nombreAff === "auto") {
      if (simp.b === 1) latexStr = simp.a.toString();
      else if (this.typeEcriture === "dec") latexStr = this.getValDec(precision).toString();
      else latexStr = `\\frac{${simp.a}}{${simp.b}}`;
    } else {
      latexStr = this.getValDec(precision).toString();
    }

    return latexStr;
  }
}
