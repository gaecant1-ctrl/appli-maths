import { Nombre } from "./Nombre.js";
import { isPowerOf10 } from "./Utils.js";

export class Ecriture {

  constructor({nombre, forme, format,opts, description, string, latex, statut, type}) {

    this.nombre = nombre;
    this.forme = forme;
    this.format = format;
    this.opts = opts;

    this.description = description;

    this.string = string;
    this.latex = latex;

    this.statut = statut; // exact | approche
    this.type = type;     // rationnel | decimal

  }


  /* ===============================
     GENERATEUR
  =============================== */

 static generer(nombre, forme, optionsExercice = {}){

  const fn = FORMES[forme];
  if(!fn) return null;

  const data = fn(nombre, optionsExercice);
  if(!data) return null;

  const {format} = data;

  let opts = {
    ...optionsExercice,
    ...(data.opts || {})
  };

  if(format==="decimal"){

    opts = {
      ...opts,
      precisionDec: optionsExercice.precisionDec,
      arrondi:"round"
    };

  }

  if(format){

    data.string = nombre.toString(format, opts);
    data.latex  = nombre.toLatex(format, opts);

  }

  data.opts = opts;

  return new Ecriture({
    nombre,
    forme,
    ...data
  });

}
static genererTout(nombre,opts={}){

    const ecritures = [];
    const deja = new Set();

    for(const forme of ORDRE_FORMES){

      const ecriture = Ecriture.generer(nombre,forme,opts);

      if(!ecriture) continue;
      if(!ecriture.string) continue;

if(deja.has(ecriture.string)) continue;
deja.add(ecriture.string);

      ecritures.push(ecriture);

    }
    console.log(ecritures);
    return ecritures;

  }


  /* ===============================
     OUTILS LINGUISTIQUES
  =============================== */

  static nomFraction(b){

    const noms = {
      1:"une fois",
      2:"la moitié de ",
      3:"le tiers de ",
      4:"le quart de ",
      5:"le cinquième de ",
      6:"le sixième de ",
      7:"le septième de ",
      8:"le huitième de ",
      9:"le neuvième de ",
      10:"le dixième de ",
      100:"le centième de "
    };

    return noms[b] ?? `${b}ième de `;

  }


  static nomFractionBis(b){

    const noms = {
      1:"unité",
      2:"demi",
      3:"tiers",
      4:"quart",
      5:"cinquième",
      6:"sixième",
      7:"septième",
      8:"huitième",
      9:"neuvième",
      10:"dixième",
      100:"centième"
    };

    return noms[b] ?? `${b}ième`;

  }

}


/* =======================================================
   CATALOGUE DES FORMES
======================================================= */

const FORMES = {

decimal(nombre, options){

if(nombre.isDecimal()){

return {
format:"decimal",
description:"Décimal",
statut:"exact",
type:"decimal"
};

}

const prec = 10 ** -options.precisionDec;

return {
format:"decimal",
description:`Valeur décimale arrondie à ${prec}`,
statut:"approche",
type:"decimal"
};

},



fractionSimp(){

return {
format:"fractionSimp",
description:"Fraction simplifiée",
statut:"exact",
type:"rationnel"
};

},



fractionMixte(){

return {
format:"fractionMixte",
description:"Écriture mixte",
statut:"exact",
type:"rationnel"
};

},



fractionDecimale(nombre, options){

if(nombre.isDecimal()){

return {
format:"fractionDecimale",
description:"Fraction décimale",
statut:"exact",
type:"decimal"
};

}

const denom = 10 ** options.precisionFracDec;

return {
format:"fractionDecimale",
description:`Fraction de dénominateur ${denom}`,
statut:"approche",
type:"decimal"
};

},



fractionDenominateur(nombre, options){

const {b} = nombre.valeurNum;

const denom = b * options.kDenom;

return {

format:"complexe",

opts:{denom},

description:`Fraction de dénominateur ${denom}`,

statut:"exact",
type:"rationnel"

};

},



pourcentage(nombre, options){

if(nombre.isDecimal()){

return {
format:"pourcentage",
description:"Pourcentage",
statut:"exact",
type:"decimal"
};

}

const step = 10 ** (2-options.precisionPourc);

return {
format:"pourcentage",
description:`Pourcentage à ${step}%`,
statut:"approche",
type:"decimal"
};

}

};


const ORDRE_FORMES = [
"decimal",
"fractionSimp",
"fractionMixte",
"fractionDenominateur",
"fractionDecimale",
"pourcentage"
]