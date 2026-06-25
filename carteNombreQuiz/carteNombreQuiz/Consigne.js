import { textePrecision } from "./Utils.js";

/* =======================================================
   GENERATEUR DE CONSIGNES
   À partir d'une Ecriture (voir Ecriture.js), produit la
   phrase de consigne à afficher au format flashcard.
======================================================= */

function texteArrondiPourcentage(precisionPourc) {
  // Logique alignée sur Ecriture.js : step = 10^(2 - precisionPourc)
  const step = 10 ** (2 - precisionPourc);
  if (step >= 10) return `à ${step}% près`;
  if (step === 1) return "au pourcent près";
  if (step === 0.1) return "au dixième de pourcent près";
  if (step === 0.01) return "au centième de pourcent près";
  return `à ${step}% près`;
}

export function genererConsigne(ecriture, donneeLatex) {

  const { forme, opts, format } = ecriture;

  switch (forme) {

    case "decimal": {
      if (ecriture.statut === "exact") {
        return `Écris $${donneeLatex}$ sous forme décimale.`;
      }
      const mot = textePrecision(opts.precisionDec) || `${opts.precisionDec}-ième`;
      return `Donne l'arrondi de $${donneeLatex}$ au ${mot}.`;
    }

    case "fractionSimp":
      return `Écris $${donneeLatex}$ sous forme de fraction irréductible.`;

    case "fractionMixte":
      return `Écris $${donneeLatex}$ sous forme d'écriture mixte (entier + fraction).`;

    case "fractionDenominateur":
      return `Écris $${donneeLatex}$ comme une fraction de dénominateur ${opts.denom}.`;

    case "fractionDecimale": {
      if (ecriture.statut === "exact") {
        return `Écris $${donneeLatex}$ sous forme de fraction décimale.`;
      }
      const denom = 10 ** opts.precisionFracDec;
      return `Écris $${donneeLatex}$ comme une fraction décimale de dénominateur ${denom}.`;
    }

    case "pourcentage": {
      if (ecriture.statut === "exact") {
        return `Écris $${donneeLatex}$ sous forme de pourcentage.`;
      }
      const precision = texteArrondiPourcentage(opts.precisionPourc);
      return `Donne l'arrondi de $${donneeLatex}$ en pourcentage, ${precision}.`;
    }

    default:
      return `Donne une autre écriture de $${donneeLatex}$.`;
  }

}
