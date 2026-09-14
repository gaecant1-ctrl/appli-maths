import * as reponse from "./reponse.js";
import { Grandeur } from "./calcul-grandeur.js";
import { tirerArbreEtCible, toLatexParenthese } from "./arbreCalcul.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

// Le "sens des opérations" (vocabulaire comme calcul) n'est pas propre à un
// niveau : accessible en 6e comme en 5e/4e/3e (révision) — d'où une entrée
// par niveau pour chaque exercice, comme calculNum.js le fait déjà pour
// calcul-num. dupliquerPourNiveaux() évite de réécrire 4 fois chaque objet.
const NIVEAUX_SENS_OPERATIONS = ["6", "5", "4", "3"];

function dupliquerPourNiveaux(baseId, exoSansNiveau) {
  return NIVEAUX_SENS_OPERATIONS.map(niveau => ({
    ...exoSansNiveau,
    id: `${baseId}_${niveau}`,
    niveau
  }));
}

// Question de cours : nom du résultat de chaque opération — un des 4
// énoncés à trou tiré au hasard à chaque génération.
const vocabulaireResultats = [
  { debut: `\\text{Comment appelle-t-on le résultat d'une addition ?}`, reponse: "somme" },
  { debut: `\\text{Comment appelle-t-on le résultat d'une soustraction ?}`, reponse: "différence" },
  { debut: `\\text{Comment appelle-t-on le résultat d'une multiplication ?}`, reponse: "produit" },
  { debut: `\\text{Comment appelle-t-on le résultat d'une division ?}`, reponse: "quotient" }
];

// Question de cours : nom des éléments (les nombres) de chaque opération.
const vocabulaireElements = [
  { debut: `\\text{Comment appelle-t-on les éléments d'une somme ?}`, reponse: "termes" },
  { debut: `\\text{Comment appelle-t-on les éléments d'un produit ?}`, reponse: "facteurs" }
];

// Question de cours : propriétés de l'addition et de la multiplication
// (commutativité, associativité).
const vocabulaireProprietes = [
  { debut: `a+b = b+a \\text{. On dit que l'addition est}`, reponse: "commutative" },
  { debut: `(a+b)+c = a+(b+c) \\text{. On dit que l'addition est}`, reponse: "associative" },
  { debut: `a \\times b = b \\times a \\text{. On dit que la multiplication est}`, reponse: "commutative" },
  { debut: `(a \\times b) \\times c = a \\times (b \\times c) \\text{. On dit que la multiplication est}`, reponse: "associative" }
];

// Calcul d'un arbre d'opérations, systématiquement parenthésé (priorités
// opératoires hors programme en sixième — voir arbreCalcul.js, port de
// appli-maths/arbreCalcul/Arbre.js). nbJetons = nbOperations + 1. Un seul id
// par nombre d'opérations pour chaque mode (niveau de jetons "simple"/"moyen"
// tiré au hasard à chaque génération, plutôt que des ids séparés) : le
// bouton 🎲, qui cycle dans l'ordre des ids du thème (voir
// engine.js:nextTypeInTheme), change ainsi toujours de nombre d'opérations
// d'un clic à l'autre. avecFraction (bouton "Avec fraction") active le mode
// du même nom dans arbreCalcul.js : le résultat n'est alors plus forcément
// entier — d'où "canonique" (décimal si exact, sinon fraction simplifiée)
// au lieu de "entier" pour l'affichage de la correction.
function exoArbreCalcul(nbOperations, avecFraction) {
  return {
    theme: "sensOperation",
    negatif: "non",
    fraction: avecFraction ? "oui" : "non",
    gen() {
      const niveauJetons = Math.random() < 0.5 ? "simple" : "moyen";
      const d = tirerArbreEtCible(nbOperations + 1, niveauJetons, avecFraction);
      const expression = toLatexParenthese(d.arbre);
      const attendu = new Grandeur(d.cible, {});
      const resultatLatex = d.cible.toLatex({ nombreAff: "canonique" });

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${resultatLatex}
        `,
        verifier(input) {
          return reponse.verifier("grandeur", attendu, input);
        }
      };
    }
  };
}

const sensOperation = [

  // ---------------------------------------------------
  // Cours : nom du résultat d'une opération
  // ---------------------------------------------------
  ...dupliquerPourNiveaux("vocabulaire_resultat_operation", {
    theme: "sensOperation",
    negatif: "non",
    cours: "oui",
    gen() {
      const choix = vocabulaireResultats[randInt(0, vocabulaireResultats.length - 1)];

      return {
        latex: choix.debut,
        correction: `\\text{${choix.reponse}.}`,
        verifier(input) {
          return reponse.verifier("texte", choix.reponse, input);
        }
      };
    }
  }),

  // ---------------------------------------------------
  // Cours : nom des éléments d'une opération
  // ---------------------------------------------------
  ...dupliquerPourNiveaux("vocabulaire_elements_operation", {
    theme: "sensOperation",
    negatif: "non",
    cours: "oui",
    gen() {
      const choix = vocabulaireElements[randInt(0, vocabulaireElements.length - 1)];

      return {
        latex: choix.debut,
        correction: `\\text{${choix.reponse}.}`,
        verifier(input) {
          return reponse.verifier("texte", choix.reponse, input);
        }
      };
    }
  }),

  // ---------------------------------------------------
  // Cours : propriétés de l'addition et de la multiplication
  // ---------------------------------------------------
  ...dupliquerPourNiveaux("vocabulaire_proprietes_operation", {
    theme: "sensOperation",
    negatif: "non",
    cours: "oui",
    gen() {
      const choix = vocabulaireProprietes[randInt(0, vocabulaireProprietes.length - 1)];

      return {
        latex: `${choix.debut} \\text{...}`,
        correction: `\\text{${choix.reponse}.}`,
        verifier(input) {
          return reponse.verifier("texte", choix.reponse, input);
        }
      };
    }
  }),

  // ---------------------------------------------------
  // Calcul d'un arbre d'opérations (toujours parenthésé)
  // ---------------------------------------------------
  ...dupliquerPourNiveaux("calcul_arbre_1op", exoArbreCalcul(1, false)),
  ...dupliquerPourNiveaux("calcul_arbre_1op_fraction", exoArbreCalcul(1, true)),
  ...dupliquerPourNiveaux("calcul_arbre_2op", exoArbreCalcul(2, false)),
  ...dupliquerPourNiveaux("calcul_arbre_2op_fraction", exoArbreCalcul(2, true)),
  ...dupliquerPourNiveaux("calcul_arbre_3op", exoArbreCalcul(3, false)),
  ...dupliquerPourNiveaux("calcul_arbre_3op_fraction", exoArbreCalcul(3, true)),
  ...dupliquerPourNiveaux("calcul_arbre_4op", exoArbreCalcul(4, false)),
  ...dupliquerPourNiveaux("calcul_arbre_4op_fraction", exoArbreCalcul(4, true))

];

export default sensOperation;
