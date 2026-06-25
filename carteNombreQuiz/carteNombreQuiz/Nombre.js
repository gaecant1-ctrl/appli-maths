import { gcd, abs, lcm } from "./Utils.js";

const FORMATS = {

/* =========================
FRACTION
========================= */

fraction(nombre,opts){

const {precisionDec,forceApprox} = opts
const {a,b} = nombre.valeurNum

if(forceApprox){

const dec = nombre.decimalApproche(precisionDec)
const r = decimalToFraction(dec)

return {
format:"fraction",
a:r.a,
b:r.b,
statut:"approx"
}

}

return {
format:"fraction",
a,
b,
statut:"exact"
}

},

/* =========================
FRACTION SIMPLIFIÉE
========================= */

fractionSimp(nombre,opts){

const {precisionDec,forceApprox} = opts

if(forceApprox){

const dec = nombre.decimalApproche(precisionDec)
const r = decimalToFraction(dec)

const simp = Nombre.fromParts(r.a,r.b).simplify().valeurNum

return {
format:"fraction",
a:simp.a,
b:simp.b,
statut:"approx"
}

}

const simp = nombre.simplify().valeurNum

return {
format:"fraction",
a:simp.a,
b:simp.b,
statut:"exact"
}

},

/* =========================
QUOTIENT
========================= */

quotient(nombre,opts){

const {precisionDec,forceApprox} = opts
const {a,b} = nombre.valeurNum

if(forceApprox){

const dec = nombre.decimalApproche(precisionDec)
const r = decimalToFraction(dec)

return {
format:"quotient",
a:r.a,
b:r.b,
statut:"approx"
}

}

return {
format:"quotient",
a,
b,
statut:"exact"
}

},

/* =========================
DECIMAL
========================= */

decimal(nombre,opts){

const {precisionDec,maxDecExact,forceApprox} = opts

if(forceApprox){

return {
format:"decimal",
value:nombre.decimalApproche(precisionDec),
precision:precisionDec,
statut:"approx"
}

}

if(nombre.isDecimal()){

return {
format:"decimal",
value:nombre.getValDec(maxDecExact,false),
statut:"exact"
}

}

return {
format:"decimal",
value:nombre.decimalApproche(precisionDec),
precision:precisionDec,
statut:"approx"
}

},

/* =========================
FRACTION DECIMALE
========================= */

fractionDecimale(nombre,opts){

const {precisionFracDec,forceApprox} = opts

if(forceApprox){

const dec = nombre.decimalApproche(precisionFracDec)
const r = decimalToFraction(dec)

return {
format:"fraction",
a:r.a,
b:r.b,
statut:"approx"
}

}

if(nombre.isDecimal()){

const dec = nombre.getValDec(12,false)
const r = decimalToFraction(dec)

return {
format:"fraction",
a:r.a,
b:r.b,
statut:"exact"
}

}

const dec = nombre.decimalApproche(precisionFracDec)
const r = decimalToFraction(dec)

return {
format:"fraction",
a:r.a,
b:r.b,
statut:"approx"
}

},

/* =========================
FRACTION MIXTE
========================= */

fractionMixte(nombre,opts){

const {precisionDec,forceApprox} = opts

let a,b

if(forceApprox){

const dec = nombre.decimalApproche(precisionDec)
const r = decimalToFraction(dec)

a=r.a
b=r.b

}else{

const simp = nombre.simplify().valeurNum
a=simp.a
b=simp.b

}

const entier = Math.trunc(a/b)
const reste = Math.abs(a % b)

if(entier===0){

return {
format:"fraction",
a:reste,
b,
statut: forceApprox ? "approx":"exact"
}

}

return {
format:"fractionMixte",
entier,
reste,
b,
statut: forceApprox ? "approx":"exact"
}

},

/* =========================
COMPLEXE
========================= */

complexe(nombre,opts){

const {denom,precisionDec,forceApprox} = opts

let a,b

if(forceApprox){

const dec = nombre.decimalApproche(precisionDec)
const r = decimalToFraction(dec)

a=r.a
b=r.b

}else{

const simp = nombre.simplify().valeurNum
a=simp.a
b=simp.b

}

if(!denom || denom % b !== 0){

return {
format:"fraction",
a,
b,
statut: forceApprox ? "approx":"exact"
}

}

const k = denom/b

return {
format:"fraction",
a:a*k,
b:denom,
statut: forceApprox ? "approx":"exact"
}

},

/* =========================
POURCENTAGE
========================= */

pourcentage(nombre,opts){

const {precisionPourc,forceApprox} = opts
const MAX = 8

if(forceApprox){

const dec = nombre.decimalApproche(precisionPourc)
const r = decimalToFraction(dec)

return {
format:"pourcentage",
value:(r.a*100)/r.b,
precision:precisionPourc,
statut:"approx"
}

}

const {a,b} = nombre.valeurNum

const n = Nombre.fromParts(a*100,b).simplify()

if(n.isDecimal()){

return {
format:"pourcentage",
value:n.getValDec(MAX,false),
statut:"exact"
}

}

const dec = nombre.decimalApproche(precisionPourc)
const r = decimalToFraction(dec)

return {
format:"pourcentage",
value:(r.a*100)/r.b,
precision:precisionPourc,
statut:"approx"
}

}

}

const STRATEGIES = {

canonique(nombre){

const {a,b} = nombre.simplify().valeurNum

if(b===1){

return "fractionSimp"

}

if(nombre.isDecimal()){

return "decimal"

}

return "fractionSimp"

}

};

export class Nombre {
constructor(s){

if(typeof s !== 'string') s = String(s)

this.initial = s

const r = this.parse(s)

if(!r){
  this.statut = "invalid"
  return
}

this.statut = r.statut

if(r.statut === "invalid") return

this.forme = r.forme

this.valeurNum = {
  a: r.a,
  b: r.b
}

this.valeur = s

this.typeEcriture = s.includes('/') ? 'frac' : 'dec'

this.feedback = null

}
  // ———————————————————
  // Construction & normalisation


  // ———————————————————

_appliquerArrondi(x, precision, mode) {

const f = 10 ** precision

if(mode === "none") return x

if(mode === "round") return Math.round(x*f)/f

if(mode === "floor") return Math.floor(x*f)/f

if(mode === "ceil") return Math.ceil(x*f)/f

if(mode === "trunc") return Math.trunc(x*f)/f

return x

}

static fromParts(a, b = 1) {

  if (!Number.isFinite(a) || !Number.isFinite(b)) {
    throw new Error("Paramètres non finis");
  }

  if (b === 0) throw new Error("Dénominateur nul");

  if (b < 0) {
    a = -a;
    b = -b;
  }

  const n = Object.create(Nombre.prototype);

  n.initial = `${a}/${b}`;

  n.statut = "valide";

  n.valeurNum = { a, b };

  n.valeur = n.initial;

  n.typeEcriture = "frac";

  n.feedback = null;

  /* -------- forme par défaut -------- */

  if (b === 1) {
    n.forme = "unitaire-entier";
  } else if (gcd(a, b) === 1) {
    n.forme = "unitaire-fraction";
  } else {
    n.forme = "unitaire-fraction-non";
  }

  return n;
}

parse(s){

s = s.replace(/,/g,'.').replace(/\s+/g,'').trim()

if(s==="") return {statut:"invalid"}

/* =========================
opérateurs consécutifs
========================= */

if(/[+\-*:]{2,}/.test(s)){
return {statut:"invalid"}
}

/* =========================
opérateur au début
========================= */

if(/^[+*:]/.test(s)){
return {statut:"invalid"}
}

/* =========================
opérateur en fin
========================= */

if(/[+\-*:]$/.test(s)){
return {statut:"invalid"}
}

/* =========================
compter opérations
========================= */

const ops = (s.match(/[+\-*:]/g) || []).length

if(ops > 2){
return {statut:"invalid"}
}

/* =========================
quotient  a:b
========================= */

let m = s.match(/^(-?\d+):(-?\d+)$/)

if(m){

let a = parseInt(m[1])
let b = parseInt(m[2])

if(b===0) return {statut:"invalid"}

return {
statut:"valide",
forme:["quotient"],
a,
b
}

}

/* =========================
somme mixte  a + b/c
========================= */

m = s.match(/^(-?\d+)\+(\d+)\/(\d+)$/)

if(m){

let a = parseInt(m[1])
let b = parseInt(m[2])
let c = parseInt(m[3])

if(c===0) return {statut:"invalid"}

let num = a>=0 ? a*c + b : a*c - b

let forme = b<c
? ["fractionMixte","simp"]
: ["fractionMixte","nonSimp"]

return {statut:"valide",forme,a:num,b:c}

}

/* =========================
somme mixte  b/c + a
========================= */

m = s.match(/^(\d+)\/(\d+)\+(-?\d+)$/)

if(m){

let b = parseInt(m[1])
let c = parseInt(m[2])
let a = parseInt(m[3])

if(c===0) return {statut:"invalid"}

let num = a>=0 ? a*c + b : a*c - b

let forme = b<c
? ["fractionMixte","simp"]
: ["fractionMixte","nonSimp"]

return {statut:"valide",forme,a:num,b:c}

}

/* =========================
produit fraction  a * 1/b
========================= */

m = s.match(/^(-?\d+)\*1\/(\d+)$/)

if(m){

let a = parseInt(m[1])
let b = parseInt(m[2])

if(b===0) return {statut:"invalid"}

return {
statut:"valide",
forme:["produitMixteGauche"],
a,
b
}

}

/* =========================
produit fraction 1/b * a
========================= */

m = s.match(/^1\/(\d+)\*(-?\d+)$/)

if(m){

let b = parseInt(m[1])
let a = parseInt(m[2])

if(b===0) return {statut:"invalid"}

return {
statut:"valide",
forme:["produitMixteDroit"],
a,
b
}

}

/* =========================
fraction
========================= */

m = s.match(/^(-?\d+)\/(\d+)$/)

if(m){

let a = parseInt(m[1])
let b = parseInt(m[2])

if(b===0) return {statut:"invalid"}

let forme =
gcd(a,b)===1
? ["unitaire","fraction","simp"]
: ["unitaire","fraction","nonSimp"]

return {statut:"valide",forme,a,b}

}

/* =========================
decimal
========================= */

m = s.match(/^(-?\d*\.\d+)$/)

if(m){

let sign = s[0]==='-' ? -1 : 1
let abs = s.replace(/^-/,'')

let parts = abs.split('.')

let denom = 10**parts[1].length

let num =
(parseInt(parts[0]||0)*denom +
parseInt(parts[1]))*sign

return {
statut:"valide",
forme:["unitaire","decimal"],
a:num,
b:denom
}

}

/* =========================
pourcentage
========================= */

m = s.match(/^(-?\d+(?:\.\d+)?)\s*%$/)

if(m){

  const val = m[1]

  if(val.includes(".")){

    const parts = val.split(".")

    const denom = 10 ** parts[1].length

    const num =
      parseInt(parts[0]) * denom +
      parseInt(parts[1])

    return {
      statut:"valide",
      forme:["unitaire","pourcentage"],
      a:num,
      b:100 * denom
    }

  }

  const n = parseInt(val)

  return {
    statut:"valide",
    forme:["unitaire","pourcentage"],
    a:n,
    b:100
  }

}

/* =========================
entier
========================= */

if(/^(-?\d+)$/.test(s)){

return {
statut:"valide",
forme:["unitaire","entier"],
a:parseInt(s),
b:1
}

}

/* =========================
décomposition facteurs premiers
========================= */

m = s.match(/^\d+(\*\d+)+$/)

if(m){

let facteurs = s.split('*').map(Number)

for(let f of facteurs){
if(!isPrime(f)) return {statut:"invalid"}
}

let produit = 1
for(let f of facteurs) produit*=f

let forme = ["produit","decompPrem"]

if(facteurs.length===2){
forme.push("decompEuclid")
}

return {
statut:"valide",
forme,
a:produit,
b:1,
facteurs
}

}

/* =========================
décomposition euclidienne
========================= */

m = s.match(/^(\d+)\*(\d+)\+(\d+)$/)

if(m){

let a = parseInt(m[1])
let b = parseInt(m[2])
let c = parseInt(m[3])

if(b>=2 && c<b){

return {
statut:"valide",
forme:["produit","decompEuclid"],
base:b,
a:a*b+c,
b:1
}

}

}

/* =========================
c + a*b
========================= */

m = s.match(/^(\d+)\+(\d+)\*(\d+)$/)

if(m){

let c = parseInt(m[1])
let a = parseInt(m[2])
let b = parseInt(m[3])

if(b>=2 && c<b){

return {
statut:"valide",
forme:["produit","decompEuclid"],
base:b,
a:a*b+c,
b:1
}

}

}

/* =========================
expression non atomique
========================= */

if(ops===1){
return {statut:"nonAtomique"}
}

/* =========================
invalid
========================= */

return {statut:"invalid"}

}

  // ———————————————————
  // Propriétés Fondamentales
  // ———————————————————
  isSimp() {
    if (this.typeEcriture === "dec") return true;
    const { a, b } = this.valeurNum;
    return gcd(a, b) === 1;
  }

  isDecimal() {
    const { a, b } = this.valeurNum;
    let den = b / gcd(a, b);
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
    return b !== 1 && abs(a) > b;
  }


  /* =========================================================
     FORMES CANONIQUES
     (structure mathématique)
  ========================================================= */
nature(){

let {a,b}=this.simplify().valeurNum

if(b===1) return "entier"

let d=b

while(d%2===0) d/=2
while(d%5===0) d/=5

return d===1 ? "decimal" : "rationnel"

}

simplify(){

let {a,b}=this.valeurNum

let g=gcd(a,b)

a/=g
b/=g

if(b<0){
a=-a
b=-b
}

return Nombre.fromParts(a,b)

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

 /* =========================================================
     ÉCRITURES NUMÉRIQUES
     (décimal, fraction, mixte)
  ========================================================= */
  getValDec(precisionMax = 10, arrondi = false) {
    let { a, b } = this.valeurNum;
    const sign = a < 0 ? -1 : 1;
    a = Math.abs(a);
    b = Math.abs(b);

    if (b === 1) return (sign * a).toString();

    const entierAbs = Math.trunc(a / b);
    let reste = a % b;

    if (arrondi) {
      if (reste === 0) return (sign * entierAbs).toString();
      const numer = reste * (10 ** precisionMax);
      let arrondiNum = Math.round(numer / b);
      let ent = entierAbs;

      if (arrondiNum >= 10 ** precisionMax) {
        ent += 1;
        arrondiNum = 0;
      }

      let decStr = arrondiNum.toString().padStart(precisionMax, '0').replace(/0+$/, '');
      const entStr = (sign < 0 ? '-' : '') + String(ent);
      return decStr.length === 0 ? entStr : `${entStr}.${decStr}`;
    }

    // Sans arrondi : division longue
    let decimals = "";
    for (let i = 0; i < precisionMax && reste !== 0; i++) {
      reste *= 10;
      const chiffre = Math.trunc(reste / b);
      decimals += String(chiffre);
      reste = reste % b;
    }
    const entStr = (sign < 0 ? '-' : '') + String(entierAbs);
    return decimals.length === 0 ? entStr : `${entStr}.${decimals}`;
  }


  decimalApproche(precision=2){

let {a,b}=this.valeurNum

let x=a/b

return x.toFixed(precision)

}

fractionSimplifiee(){

const {a,b} = this.simplify().valeurNum

return `${a}/${b}`

}






 /* =========================================================
  SORTIES : string et latex
  ========================================================= */



getRepresentation(format, opts = {}){

const defaults = {
precisionDec:2,
precisionFracDec:2,
precisionPourc:2,
forceApprox:false,
denom:undefined,
maxDecExact:8,
fracCmd:"\\dfrac"
}
opts = {...defaults, ...opts}

/* stratégie */

if(STRATEGIES[format]){
format = STRATEGIES[format](this,opts)
}



const fn = FORMATS[format]

if(!fn) throw new Error("format inconnu : "+format)

return fn(this,opts)

}

toString(format="canonique",opts={}){

if(!this.valeurNum) return ""

if(format==="initial") return this.initial

const r = this.getRepresentation(format,opts)

switch(r.format){

case "fraction":
return r.b===1 ? `${r.a}` : `${r.a}/${r.b}`

case "quotient":
return `${r.a}:${r.b}`

case "decimal":
return `${r.value}`

case "pourcentage":
return `${r.value}%`

case "fractionPourcentage":
return `${r.a}/${r.b}%`

case "fractionMixte":

if(r.reste===0) return `${r.entier}`

if(r.entier===0) return `${r.reste}/${r.b}`

return `${r.entier}+${r.reste}/${r.b}`

}

}

toLatex(format="canonique", opts={}){

const r = this.getRepresentation(format,opts)

const frac = opts.fracCmd || "\\dfrac"

switch(r.format){

case "fraction":

if(r.b===1) return `${r.a}`

return `${frac}{${r.a}}{${r.b}}`


case "fractionMixte":

if(r.reste===0) return `${r.entier}`

if(r.entier===0) return `${frac}{${r.reste}}{${r.b}}`

return `${r.entier}+${frac}{${r.reste}}{${r.b}}`


case "decimal":
return `${r.value}`


case "pourcentage":
return `${r.value}\\%`

}



}
  /* =========================================================
     PROPRIÉTÉS ARITHMÉTIQUES
  ========================================================= */

  inverse() {
    const { a, b } = this.valeurNum;
    if (a === 0) throw new Error("Impossible d'inverser zéro");
    return Nombre.fromParts(b, a);
  }



  /* =========================================================
     COMPARAISONS
  ========================================================= */


equalExact(other){

if(!(other instanceof Nombre)) return false

return this.valeurNum.a * other.valeurNum.b
=== other.valeurNum.a * this.valeurNum.b

}

equalCanonique(other){

if(!(other instanceof Nombre)) return false

const s1 = this.simplify().valeurNum
const s2 = other.simplify().valeurNum

return s1.a === s2.a && s1.b === s2.b

}

equalForme(other){

if(!(other instanceof Nombre)) return false

if(!Array.isArray(this.forme) || !Array.isArray(other.forme)) return false

for(const f of this.forme){

if(!other.forme.includes(f)) return false

}

return true

}


equalAff(nb, format, opts={}){

if(!(nb instanceof Nombre)) return false;

const s1 = this.toString(format,opts);
const s2 = nb.toString(format,opts);

return s1 === s2;

}

  /* =========================================================
     Opérations
  ========================================================= */
  add(other) {
    const { a: a1, b: b1 } = this.valeurNum;
    const { a: a2, b: b2 } = other.valeurNum;
    const denom = lcm(b1, b2);
    const num = a1 * (denom / b1) + a2 * (denom / b2);
    const isDec = Nombre.fromParts(num, denom).isDecimal();
    const type = Nombre.determineResultType(this.typeEcriture, other.typeEcriture, isDec);
    return Nombre.fromParts(num, denom).setTypeEcriture(type);
  }

  sub(other) {
    const { a: a1, b: b1 } = this.valeurNum;
    const { a: a2, b: b2 } = other.valeurNum;
    const denom = lcm(b1, b2);
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

  pow(e) {
    if (!Number.isInteger(e)) throw new Error("Exposant non entier");
    if (e === 0) return new Nombre("1");
    let base = this;
    let exp = Math.abs(e);
    let res = Nombre.fromParts(1, 1);
    while (exp > 0) {
      if (exp & 1) res = res.mul(base);
      base = base.mul(base);
      exp >>= 1;
    }
    return e > 0 ? res : Nombre.fromParts(1, 1).div(res);
  }


    /* =========================================================
     Feedback
  ========================================================= */

setTypeEcriture(type) {

if(this.valeurNum.b === 1){
this.typeEcriture = "entier"
return this
}

this.typeEcriture = type === "dec" ? "dec" : "frac"

return this

}

setFeedback(code){

this.feedback = code
return null

}

clearFeedback(){

this.feedback = null

}

    /* =========================================================
     OUTILS PÉDAGOGIQUES
  ========================================================= */


    /* =========================================================
     Diviseurs
  ========================================================= */

diviseurs(){

this.clearFeedback()

if(!this.isEntier()){
return this.setFeedback("diviseurs-non-entier")
}

const facteurs = this.decompFacteursPremiers()

if(!facteurs) return null

let divs=[1]

for(let p in facteurs){

let exp = facteurs[p]

let nouveaux=[]

for(let d of divs){

let val=1

for(let i=0;i<exp;i++){

val*=p

nouveaux.push(d*val)

}

}

divs = divs.concat(nouveaux)

}

return divs.sort((a,b)=>a-b)

}

    /* =========================================================
     Facteurs premiers
  ========================================================= */

decompFacteursPremiers(){

this.clearFeedback()

if(!this.isEntier()){

return this.setFeedback("facteurs-premiers-non-entier")

}

const {a}=this.simplify().valeurNum

let n=Math.abs(a)

if(n===0) return {0:1}

if(n===1) return {1:1}

let facteurs={}

let d=2

while(d*d<=n){

while(n%d===0){

facteurs[d]=(facteurs[d]||0)+1

n/=d

}

d++

}

if(n>1){
facteurs[n]=(facteurs[n]||0)+1
}

if(a<0){
facteurs[-1]=1
}

return facteurs

}

divisionEuclidienne(base){

this.clearFeedback()

if(!this.isEntier()){
return this.setFeedback("division-euclidienne-non-entier")
}

if(!Number.isInteger(base) || base < 2){
return this.setFeedback("division-euclidienne-base-invalide")
}

const {a} = this.simplify().valeurNum

const q = Math.floor(a / base)
const r = a - q * base

return {
quotient: q,
reste: r
}

}

}


function decimalToFraction(dec){

let sign = 1

if(dec.startsWith("-")){
sign = -1
dec = dec.slice(1)
}

if(!dec.includes(".")){
return {
a: parseInt(dec,10)*sign,
b: 1
}
}

const parts = dec.split(".")

const entier = parseInt(parts[0],10)
const frac = parts[1]

const denom = 10 ** frac.length
const num = sign*(entier*denom + parseInt(frac,10))

return {a:num,b:denom}

}
