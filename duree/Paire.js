import { FractionHeure } from "./FractionHeure.js";
import { DureeHM } from "./DureeHM.js";
import { pgcd } from "./Utils.js";

export class Paire {
  constructor(niveau) {
    this.objets = [];
    this.generer(niveau);
  }

generer(niveau) {

  const denominateursBase = [2,3,4,5,6,10];
  let denominateurs = [...denominateursBase];

  let typeGeneration;

  if (niveau === 1) {
    typeGeneration = "fractionSimple";
  }
  else if (niveau === 2) {
    typeGeneration = "fractionImpropre";
  }
  else if (niveau === 3) {
    typeGeneration = "decimal";
    denominateurs = [2,4,5,10]; // pas 3 ni 6
  }
  else {
    // niveau 4+
    const types = ["fractionSimple","fractionImpropre","decimal"];
    typeGeneration = types[Math.floor(Math.random()*types.length)];
    if (typeGeneration === "decimal") {
      denominateurs = [2,4,5,10];
    }
  }

  const d = denominateurs[Math.floor(Math.random() * denominateurs.length)];

  let m;

  if (typeGeneration === "fractionSimple") {
    m = Math.floor(Math.random() * (d - 1)) + 1;
  }

  else if (typeGeneration === "fractionImpropre") {
    const partieEntiere = Math.floor(Math.random() * 3) + 1; // max 3
    m = partieEntiere * d + Math.floor(Math.random() * d);
  }

  else if (typeGeneration === "decimal") {
    m = Math.floor(Math.random() * (d - 1)) + 1;
  }

  // fraction irréductible
  while (pgcd(m, d) !== 1) {
    m++;
  }

  const minutes = (m * 60) / d;

  let objetFraction;

if (typeGeneration === "decimal") {

  const valeurDecimale = m / d;

  const formatFrancais = (n) => {
    return n
      .toFixed(2)              // max 2 décimales
      .replace(/\.?0+$/,"")    // enlève zéros inutiles
      .replace(".", ",");      // virgule française
  };

  objetFraction = {
    type: "fraction",
    m,
    d,
    toMinutes: () => minutes,
    fiche: () => `\\(${formatFrancais(valeurDecimale)}\\,\\mathrm{h}\\)`  };
} else {

    objetFraction = new FractionHeure(m, d);
  }

  this.objets = [
    objetFraction,
    new DureeHM(minutes)
  ];
}
}