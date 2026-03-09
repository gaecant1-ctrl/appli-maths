import { Nombre } from "./Nombre.js";

export class Ecriture {

  constructor({nombre, forme, format, description, string, latex, statut, type}) {

    this.nombre = nombre;
    this.forme = forme;
    this.format = format;

    this.description = description;

    this.string = string;
    this.latex = latex;

    this.statut = statut; // exact | approche
    this.type = type;     // rationnel | decimal

  }


  /* ===============================
     GENERATEUR
  =============================== */

  static generer(nombre, forme){

    const fn = FORMES[forme];
    if(!fn) return null;

    const data = fn(nombre);
    if(!data) return null;

    const {format, opts} = data;

    if(format){

      data.string = nombre.toString(format, opts);
      data.latex  = nombre.toLatex(format, opts);

    }

    return new Ecriture({
      nombre,
      forme,
      ...data
    });

  }


  static genererTout(nombre){

    const ecritures = [];
    const deja = new Set();

    for(const forme of Object.keys(FORMES)){

      const ecriture = Ecriture.generer(nombre,forme);

      if(!ecriture) continue;
      if(!ecriture.latex) continue;

      if(deja.has(ecriture.latex)) continue;

      deja.add(ecriture.latex);

      ecritures.push(ecriture);

    }

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

  fractionSimple(nombre){

    return {
      format:"fractionSimp",
      description:"Fraction simplifiée",
      statut:"exact",
      type:"rationnel"
    };

  },


  fractionMixte(nombre){

    return {
      format:"mixte",
      description:"Écriture mixte",
      statut:"exact",
      type:"rationnel"
    };

  },




  fractionInitiale(nombre){

    return {
      format:"fraction",
      description:"Fraction initiale",
      statut:"exact",
      type:"rationnel"
    };

  },


  quotient(nombre){

    const {a,b} = nombre.valeurNum;

    return {
      format:"quotient",
      description:`Quotient de ${a} par ${b}`,
      string:`${a}:${b}`,
      latex:`${a}:${b}`,
      statut:"exact",
      type:"rationnel"
    };

  },


  fractionDe(nombre){

    const {a,b} = nombre.valeurNum;

    const nom = Ecriture.nomFraction(b);

    return {
      format:"produitMixteDroit",
      description:`${nom}${a}`,
      string:`1/${b}*${a}`,
      latex:`\\dfrac{1}{${b}} \\times ${a}`,
      statut:"exact",
      type:"rationnel"
    };

  },


  deFraction(nombre){

    const {a,b} = nombre.valeurNum;

    const nomBis = Ecriture.nomFractionBis(b);

    return {
      format:"produitMixteGauche",
      description:`${a} ${nomBis}${a>1 && b!=3 ? "s" : ""}`,
      string:`${a}*1/${b}`,
      latex:`${a} \\times \\dfrac{1}{${b}}`,
      statut:"exact",
      type:"rationnel"
    };

  },


  decimal(nombre){

    const exact = nombre.isDecimal();

    return {
      format:"decimal",
      opts: exact
        ? {precision:10}
        : {precision:2, arrondi:"round"},
      description:"Écriture décimale",
      statut: exact ? "exact" : "approche",
      type:"decimal"
    };

  },


  fractionDecimal(nombre){

    const exact = nombre.isDecimal();

    return {
      format:"fractionDecimal",
      description:"Fraction décimale",
      statut: exact ? "exact" : "approche",
      type:"decimal"
    };

  },


  pourcentage(nombre){

    const exact = nombre.isDecimal();

    return {
      format:"pourcentage",
      opts:{precisionPct:0},
      description:"Pourcentage",
      statut: exact ? "exact" : "approche",
      type:"decimal"
    };

  }

};