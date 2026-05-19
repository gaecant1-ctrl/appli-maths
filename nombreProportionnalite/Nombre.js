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

    // 1. Priorité absolue à l'entier mathématique
    if (a % b === 0) {
      n.typeEcriture = 'entier';
      n.initial = String(a / b);
      return n;
    }

    // 2. Sinon, on applique l'héritage
    n.typeEcriture = typeHerite;

    if (typeHerite === 'dec') {
      // On génère la chaîne décimale pour le brut
      n.initial = n.getValDec(10); 
    } 
    else if (typeHerite === 'mixte') {
      // On génère la chaîne mixte "Entier+Num/Den" pour le brut
      const ent = a >= 0 ? Math.floor(a / b) : -Math.ceil(Math.abs(a) / b);
      const num = Math.abs(a - ent * b);
      n.initial = `${ent}+${num}/${b}`;
    } 
    else {
      // Par défaut : forme fractionnaire
      n.initial = `${a}/${b}`;
    }

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

}