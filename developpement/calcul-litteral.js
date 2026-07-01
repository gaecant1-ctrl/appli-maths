// Utils

function abs(n) {
  return n < 0 ? -n : n;
}

function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b) { let t = b; b = a % b; a = t; }
  return a;
}

function lcm(a, b) {
  return abs(a * b) / gcd(a, b);
}

function trunc(n) {
  // Retire la partie décimale sans appel à Math
  return n >= 0 ? n - (n % 1) : n - (n % 1);
}

function round(n) {
  const entier = trunc(n);
  const fraction = n - entier;
  return fraction >= 0.5 ? entier + 1 : entier;
}

function debugArbre(expr, depth = 0) {
  const indent = '  '.repeat(depth);
  if (!expr) {
    console.log(`${indent}[null ou undefined]`);
    return;
  }

  const type = expr.constructor?.name ?? '???';
  const nature = expr.getNature?.() ?? '??';
  const isAtome = expr.isAtome?.() ? '✓' : '✗';
  const str = expr.toString?.() ?? '[pas de toString]';

  let evalResult;
  let evalType = '';
  try {
    evalResult = expr.evaluer?.();
    evalType = evalResult?.constructor?.name ?? '???';
  } catch (e) {
    evalResult = `[ERREUR: ${e.message}]`;
    evalType = '⚠️';
  }

  console.log(`${indent}${type} | nature: ${nature} | Atome: ${isAtome} | ${str}`);
  console.log(`${indent}↳ evaluer → ${evalType} | ${evalResult?.toString?.() ?? evalResult}`);

  // Explorons les enfants
  if (Array.isArray(expr.termes)) {
    expr.termes.forEach(t => debugArbre(t, depth + 1));
  }
  if (Array.isArray(expr.facteurs)) {
    expr.facteurs.forEach(f => debugArbre(f, depth + 1));
  }
}



function avecMethodesListe(arr) {
  arr.ajouter = function (...valeurs) {
    for (const val of valeurs.flat()) {
      if (!this.includes(val)) this.push(val);
    }
    return this;
  };

  arr.enlever = function (...valeurs) {
    for (const val of valeurs.flat()) {
      let i;
      while ((i = this.indexOf(val)) >= 0) {
        this.splice(i, 1);
      }
    }
    return this;
  };

  arr.vider = function () {
    this.length = 0;
    return this;
  };

  return arr;
}

function avecMethodesDict(obj = {}) {
  obj.ajouter = function (cle, valeur) {
    this[cle] = valeur;
    return this;
  };

  obj.enlever = function (...cles) {
    for (const cle of cles.flat()) {
      delete this[cle];
    }
    return this;
  };

  obj.vider = function () {
    for (const cle in this) {
      if (Object.prototype.hasOwnProperty.call(this, cle)) {
        delete this[cle];
      }
    }
    return this;
  };
  
obj.estVide = function () {
  return Object.entries(this)
    .filter(([_, v]) => typeof v !== "function")
    .length === 0;
};

  return obj;
}

function estDans(valeur, liste1 = [], liste2 = []) {
  return liste1.includes(valeur) && liste2.includes(valeur);
}

// Erreur dédiée : permet d'identifier clairement une unité invalide
class UniteInvalideError extends Error {
  constructor(invalidUnits = [], message = "") {
    super(message || `Unités inconnues: ${invalidUnits.join(", ")}`);
    this.name = "UniteInvalideError";
    this.code = "UNITE_INVALIDE";
    this.invalidUnits = invalidUnits; // ex: ["xm", "s2"]
  }
}

function makeSeed(base, niveau, type, index) {
  // base est ta graine "globale"
  // niveau = "facile" | "moyen" | "difficile"
  // type = ex: "euclide", "somme", "produit"...
  // index = numéro de la question
  return `${base}:${niveau}:${type}:q${index}`;
}

class Nombre {
  constructor(s) {
    // Règle décidée : On transforme la virgule en point dès l'entrée
    this.initial = s.replace(/,/g, '.').replace(/\s+/g, ' ').trim();
    this.typeEcriture = ""; 
    this.valeurNum = this.parse(this.initial);

  }

  // ———————————————————
  // PARSING : Définit le "Certificat de Naissance" (typeEcriture)
  // ———————————————————
parse(s) {
    if (!s) throw new Error("Entrée vide");
    s = s.trim();

    // 1. ENTIER (ex: "5")
    if (/^[+-]?\d+$/.test(s)) {
        this.typeEcriture = 'entier';
        return { a: parseInt(s, 10), b: 1 };
    }

    // 2. DÉCIMAL (ex: "1.5")
    if (/^[+-]?\d*[.,]\d+$/.test(s)) { // Support virgule et point
        this.typeEcriture = 'dec';
        const normalized = s.replace(',', '.');
        const precision = normalized.split('.')[1].length;
        const denom = Math.pow(10, precision);
        const numer = Math.round(parseFloat(normalized) * denom);
        return { a: numer, b: denom };
    }

    // 3. FRACTION (ex: "1/2")
    if (/^[+-]?\d+\/[+-]?\d+$/.test(s)) {
        let [a, b] = s.split('/').map(Number);
        if (b === 0) throw new Error("Dénominateur nul");
        if (b < 0) { a = -a; b = -b; }

        this.typeEcriture = 'fraction';
        // Check si simple (irréductible)
        if (this._estIrreductible(a, b)) {
            this.typeEcriture = 'fractionSimple';
        }
        return { a, b };
    }

    // 4. MIXTE (ex: "1+1/2")
    const mixteRegex = /^([+-]?\d+)\s*(?:\+|\s+)\s*(\d+)\/(\d+)$/;
    if (mixteRegex.test(s)) {
        const [, entStr, numStr, denStr] = s.match(mixteRegex);
        const ent = parseInt(entStr, 10);
        const num = parseInt(numStr, 10);
        const den = parseInt(denStr, 10);

        if (num >= den) return null; // Invalide structurellement pour un mixte

        this.typeEcriture = 'mixte';
        // Check si mixteSimple (partie fractionnaire irréductible)
        if (this._estIrreductible(num, den)) {
            this.typeEcriture = 'mixteSimple';
        }

        const signe = ent < 0 ? -1 : 1;
        const a = ent * den + (signe * num);
        return { a, b: den };
    }

    // 5. Né d'un POURCENTAGE (ex: "15%", "12.5%")
// On accepte entier ou décimal suivi du symbole %
if (/^[+-]?\d*(?:[.,]\d+)?\s*%$/.test(s)) {
    this.typeEcriture = 'pourcentage';

    const valeurStr = s.replace('%', '').replace(',', '.').trim();

    const num = parseFloat(valeurStr);

    const puissanceDix = valeurStr.includes('.')
        ? Math.pow(10, valeurStr.split('.')[1].length)
        : 1;

    let a = Math.round(num * puissanceDix);
    let b = 100 * puissanceDix;

    // normalisation immédiate (IMPORTANT)
    const g = this._estIrreductible ? 1 : gcd(a, b);
    a /= g;
    b /= g;

    return { a, b };
}

    throw new Error("Format non reconnu");
}

// Utilitaire pour le PGCD (GCD)
_estIrreductible(a, b) {
    const gcd = (x, y) => (y === 0 ? Math.abs(x) : gcd(y, x % y));
    return gcd(a, b) === 1;
}

  // ———————————————————
  // DIAGNOSTICS : Ce que le nombre EST
  // ———————————————————
  isEntier() {
    return (this.valeurNum.a % this.valeurNum.b === 0);
  }

  isDecimal() {
    const d = gcd(this.valeurNum.a, this.valeurNum.b);
    let den = this.valeurNum.b / d;
    while (den % 2 === 0) den /= 2;
    while (den % 5 === 0) den /= 5;
    return den === 1;
  }

   isFractionMixte() {
    const { a, b } = this.simplify().valeurNum;
    return b !== 1 && abs(a) > b;
  }

  isSimp() {
    return gcd(this.valeurNum.a, this.valeurNum.b) === 1;
  }

  isEcritureSimple() {
  const { a, b } = this.valeurNum;

  // Cas entier mathématique
  if (a % b === 0) {
    return this.typeEcriture === 'entier';
  }

  // Cas fraction
  if (this.typeEcriture === 'fraction') {
    return this._estIrreductible(a, b);
  }

  // Cas fractionSimple déjà supposée simplifiée
  if (this.typeEcriture === 'fractionSimple') {
    return true;
  }

  // Cas mixte : simple si fraction irréductible + cohérence interne
  if (this.typeEcriture === 'mixte' || this.typeEcriture === 'mixteSimple') {
    const ent = Math.floor(a / b);
    const reste = Math.abs(a - ent * b);
    return reste === 0 || this._estIrreductible(reste, b);
  }

    // POURCENTAGE : toujours simple (forme terminale)
  if (this.typeEcriture === 'pourcentage') {
    return true}

  return true;
}

simplify() {
    // 1. On récupère les valeurs actuelles (a/b)
    const a = this.valeurNum.a;
    const b = this.valeurNum.b;

    // 2. Calcul du PGCD (assure-toi que ta fonction pgcd est accessible)
    const common = gcd(a, b);

    // 3. On produit un NOUVEAU nombre simplifié via fromParts
    // C'est ici qu'on s'assure de ne pas perdre l'instance "Nombre"
    const simplifie = Nombre.fromParts(a / common, b / common);

    // 4. On conserve ou on adapte le type d'écriture si besoin
    if (this.typeEcriture === 'mixte') {
        simplifie.typeEcriture = 'mixteSimple';
    }

    return simplifie;
}


  equal(other) {
    if (!(other instanceof Nombre)) return false;
    const a1 = this.simplify().valeurNum;
    const a2 = other.simplify().valeurNum;
    return a1.a === a2.a && a1.b === a2.b;
  }

isFormat(type) {
  const te = this.typeEcriture; 
  const { a, b } = this.valeurNum;
  const isMathEntier = (a % b === 0);
  const simplifie = this.isSimp();
  const isInférieurA1 = Math.abs(a) < b;

  switch (type) {
    case 'entier':
      return te === 'entier';

    case 'dec':
    case 'decimal':
      return te === 'entier' || te === 'dec';

    case 'fraction':
      return te === 'entier' || te === 'fraction';

    case 'fractionSimple':
      if (te === 'entier') return true;
      return te === 'fractionSimple'

    case 'mixte':
      if (te === 'entier') return true;
      if (te === 'mixte') return true;
      if (te === 'mixteSimple') return true;
      // Une fraction n'est acceptée que si elle est strictement inférieure à 1
      return te === 'fraction' && isInférieurA1;

    case 'mixteSimple':
      if (te === 'entier') return true;
      // Mixte simplifié ou fraction < 1 simplifiée
      if (te === 'mixteSimple') return true;
      if (te === 'fractionSimple') return isInférieurA1;
      return false;

    case 'pourcentage':
      return this.typeEcriture === 'pourcentage';

    case 'canonique':
      if (te === 'entier') return true;
      if (te === 'dec') return true;
      if (te === 'mixteSimple') return true;
      if (te === 'fractionSimple') return true;
      return false;

    case 'canoniqueMixte':
      if (te === 'entier') return true;
      if (te === 'dec') return true;
      if (te === 'mixteSimple') return true;
      if (te === 'fractionSimple') return isInférieurA1;
      return false;
    


    default:
      return true;
  }
}
  // ———————————————————
  // LOGIQUE DE RENDU (Basée sur tes 7 modes)



  // ———————————————————

_formaterMilliers(v) {
    v = String(v);

    const signe = v.startsWith('-') ? '-' : '';
    if (signe) v = v.slice(1);

    let [entier, dec] = v.split('.');

    entier = entier.replace(
        /\B(?=(\d{3})+(?!\d))/g,
        '¤'
    );

    return signe + entier + (dec ? '.' + dec : '');
}

  _getRendu(mode = 'brut', precision = 2) {
    const { a, b } = this.valeurNum;

    // Règle d'or : Un entier mathématique est toujours affiché comme un entier (sauf mode brut)
    if (this.isEntier() && mode !== 'brut') {
      return {
    type:'simple',
    v:this._formaterMilliers(a / b)
};
    }

    switch (mode) {
case 'entier':
    return {
        type:'simple',
        v:this._formaterMilliers(a)
    };

case 'dec':
    return {
        type:'simple',
        v:this._formaterMilliers(
            this.getValDec(10)
        )
    };

case 'fraction':
    return {
        type:'frac',
        n:this._formaterMilliers(a),
        d:this._formaterMilliers(b)
    };

case 'fractionSimple': {
    const d = gcd(a,b);
    return {
        type:'frac',
        n:this._formaterMilliers(a/d),
        d:this._formaterMilliers(b/d)
    };
}

case 'mixte':
case 'mixteSimple': {
    const ent = a >= 0
        ? Math.floor(a/b)
        : -Math.ceil(Math.abs(a)/b);

    let n=Math.abs(a-ent*b);
    let den=b;

    if(mode==='mixteSimple'){
        const c=gcd(n,den);
        n/=c;
        den/=c;
    }

    return {
        type:'mixte',
        ent:this._formaterMilliers(ent),
        n:this._formaterMilliers(n),
        d:this._formaterMilliers(den)
    };
}

case 'decApprox':
    return {
        type:'simple',
        v:this._formaterMilliers(
            this.getValDec(
                this.isDecimal() ? 10 : precision
            )
        )
    };

case 'pourcentage':
  return {
    type: 'simple',
    v: this._formaterMilliers((this.valeurNum.a / this.valeurNum.b) * 100) + '%'
  };

case 'canonique':
    if (this.isDecimal()) {
        return this._getRendu('dec');
    }
    return this._getRendu('fractionSimple');

case 'canoniqueMixte':
    if (this.isDecimal()) {
        return this._getRendu('dec');
    }
    return this._getRendu('mixteSimple');

 case 'brut':
    return this._getRendu(this.typeEcriture);

default:
    return this._getRendu(this.typeEcriture);
    }
  }

  // Détermine quel type l'emporte pour le formatage du résultat
  _getTypeHerite(autre) {
    const t1 = this.typeEcriture;
    const t2 = autre.typeEcriture;

    if (t1 === t2) return t1;
    
    // L'entier est "neutre" : il adopte le type de l'autre
    if (t1 === 'entier') return t2;
    if (t2 === 'entier') return t1;



// sinon le pourcentage ne survit jamais
if (t1 === 'pourcentage') return t2;
if (t2 === 'pourcentage') return t1;

// fallback existant
return 'fraction';
    return 'fraction';
  }

  // ———————————————————
  // SORTIES TEXTE & LATEX
  // ———————————————————
toString(opts={}) {
    const r=this._getRendu(
        opts.nombreAff,
        opts.precision
    );

    const cl=(v)=>
        String(v).replace(/¤/g,'');

    if(r.type==='simple')
        return cl(r.v);

    if(r.type==='frac')
        return `${cl(r.n)}/${cl(r.d)}`;

    if(r.type==='mixte')
        return `${cl(r.ent)}+${cl(r.n)}/${cl(r.d)}`;
}

  toLatex(opts = {}) {
    const r = this._getRendu(
        opts.nombreAff,
        opts.precision
    );

    const cl=(v)=>
        String(v)
            .replace(/¤/g,'\\,')
            .replace(/%/g,'\\%');

    if(r.type==='simple')
        return cl(r.v);

    if(r.type==='frac')
        return `\\frac{${cl(r.n)}}{${cl(r.d)}}`;

    if(r.type==='mixte')
        return `${cl(r.ent)}+\\frac{${cl(r.n)}}{${cl(r.d)}}`;
}

  // ———————————————————
  // OUTILS (Calcul décimal, Statique, Arithmétique)
  // ———————————————————
  getValDec(p = 10) {
    let { a, b } = this.valeurNum;
    const s = a < 0 ? -1 : 1;
    let n = Math.abs(a), d = Math.abs(b);
    const ent = Math.floor(n / d);
    let r = n % d;
    if (r === 0) return String(s * ent);
    let dec = "";
    for (let i = 0; i < p && r !== 0; i++) { r *= 10; dec += Math.floor(r / d); r %= d; }
    dec = dec.replace(/0+$/, '');
    return `${s < 0 ? '-' : ''}${ent}${dec ? '.' + dec : ''}`;
  }

  scinderMixte() {
    const { a, b } = this.simplify().valeurNum;
    // partie entière vers 0 si positif, vers 0 si négatif ? On veut: a = ent*b + reste, avec 0 <= reste < b
    // Choix: ent = floor(a/b) pour a>=0, et ent = -ceil(|a|/b) pour a<0 (ex: -7/3 -> ent=-3, reste=2)
    const ent = a >= 0 ? Math.floor(a / b) : -Math.ceil(Math.abs(a) / b);
    const reste = Math.abs(a - ent * b); // 0 <= reste < b
    return [
      Nombre.fromParts(ent, 1),
      Nombre.fromParts(reste, b)
    ];
  }

static fromParts(a, b = 1, typeHerite = 'fraction') {
    if (b < 0) { a = -a; b = -b; }
    const n = Object.create(Nombre.prototype);
    n.valeurNum = { a, b };

    // Garde-fou : 'entier' ne peut être hérité que si la valeur l'est VRAIMENT.
    // Sans ça, deux entiers dont le quotient/produit n'est pas entier (ex: 10÷4)
    // se verraient étiquetés 'entier' et affichés en ignorant le dénominateur.
    const estReellementEntier = (b !== 0) && (a % b === 0);
    if (typeHerite === 'entier' && !estReellementEntier) {
      typeHerite = 'fraction';
    }

    n.typeEcriture = typeHerite;

    // Par défaut : forme fractionnaire
    n.initial = `${a}/${b}`;

    return n;
  }

add(o) { 
    const a = this.valeurNum.a * o.valeurNum.b + o.valeurNum.a * this.valeurNum.b;
    const b = this.valeurNum.b * o.valeurNum.b;
    return Nombre.fromParts(a, b, this._getTypeHerite(o)); 
  }

  sub(o) { 
    const a = this.valeurNum.a * o.valeurNum.b - o.valeurNum.a * this.valeurNum.b;
    const b = this.valeurNum.b * o.valeurNum.b;
    return Nombre.fromParts(a, b, this._getTypeHerite(o)); 
  }

  mul(o) { 
    const a = this.valeurNum.a * o.valeurNum.a;
    const b = this.valeurNum.b * o.valeurNum.b;
    return Nombre.fromParts(a, b, this._getTypeHerite(o)); 
  }

  div(o) { 
    if (o.valeurNum.a === 0) throw new Error("Division par zéro");
    const a = this.valeurNum.a * o.valeurNum.b;
    const b = this.valeurNum.b * o.valeurNum.a;
    return Nombre.fromParts(a, b, this._getTypeHerite(o)); 
  }

pow(n) {
  // n doit être un entier pour cette implémentation
  let { a, b } = this.valeurNum;

  if (n === 0) {
    return Nombre.fromParts(1, 1); // Toujours 1
  }

  // Gestion de l'exposant négatif : on inverse la fraction
  if (n < 0) {
    [a, b] = [b, a];
    n = Math.abs(n);
  }

  // Calcul manuel des puissances
  let resA = 1;
  let resB = 1;
  for (let i = 0; i < n; i++) {
    resA *= a;
    resB *= b;
  }

  // On produit un nouveau Nombre via fromParts
  // Cela garantit qu'on passe par ton circuit de création officiel
  const nouveauNombre = Nombre.fromParts(resA, resB);

  // On peut forcer un typeEcriture par défaut selon le résultat
  if (resB === 1) {
    nouveauNombre.typeEcriture = 'entier';
  } else {
    // Si c'était une fraction à la base, ça reste une fraction
    nouveauNombre.typeEcriture = 'fraction';
  }

  return nouveauNombre;
}

}// ============================================================
// Polynome.js — calcul littéral exact sur des polynômes à une variable (x)
// ============================================================
// Remplace Grandeur dans l'architecture (Atome.grandeur -> Atome.polynome,
// par exemple), mais ne gère aucune unité physique : uniquement des
// coefficients exacts (instances de Nombre), indexés par degré croissant.
//
// Stockage interne : this.coeffs = [c0, c1, c2, ...] où chaque ci est un
// Nombre, et le terme de degré i vaut ci * x^i. Le tableau ne contient
// jamais de zéros de tête superflus (sauf le polynôme nul, représenté par
// un tableau à un seul élément [0]).
//
// Degré maximum autorisé : DEGRE_MAX (6). Toute opération qui produirait
// un polynôme de degré supérieur lève une erreur explicite.
// ============================================================

class Polynome {
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
// Variante de Expression.js adaptée au calcul littéral sur x :
// Grandeur (valeur + unité physique) est remplacée par Polynome
// (coefficients exacts en Nombre, indexés par degré de x).
//
// Contrat minimal de toute Expression (inchangé) :
//   - evaluer(opts)   -> réduit l'arbre à un Atome final
//   - toString(opts)  -> représentation texte
//   - toLatex(opts)   -> représentation LaTeX
//   - isAtome()       -> true si feuille terminale
//   - getNature()     -> "Polynome" | "Composée" | "Inconnue"
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
// ============================================================
// ObjetString.js — parse une expression texte en arbre Expression (calcul littéral)
// ============================================================
// Variante de ObjetString.js adaptée à l'algèbre sur x : le tokeniser est
// repris à l'identique (il gère déjà "x", "2x", "x^2", "(x+1)^2", etc. sans
// modification — la distinction "exposant collé à une lettre" vs "opérateur
// de puissance séparé" fonctionne pour x comme elle fonctionnait pour les
// unités physiques). Seul analyserTokens change : on construit des Atome
// algébriques (new Atome(...)) au lieu de passer par Atome.from() + Grandeur,
// et il n'y a plus de notion d'"unité invalide" à détecter.
//
// calculer() évalue l'arbre UNE fois et renvoie un Atome dont .polynome
// porte le résultat exact (coefficients en Nombre).
// ============================================================

class ObjetString {
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
        if (typeof Atome === "undefined") {
          throw new ReferenceError("Atome n'est pas défini : Expression.js n'est pas chargé.");
        }
        const atome = new Atome(raw, {});
        out.push({ token: raw, nature: atome.getNature(), objet: atome });
      } catch (e) {
        if (e instanceof ReferenceError) throw e; // ne jamais masquer un bug d'environnement
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
