// =====================================================
// ÉQUATION — résoudre une équation du premier degré (une inconnue x).
// Port des 3 gabarits de appli-maths/equation/app.js (BANQUE_DE_TYPES :
// "Simple" ax+b=c, "Variable2Cotes" ax+b=cx+d, "Parentheses" a(bx+c)=d)
// vers le format flash (gen()/verifier()) — la solution exacte (-b/a) est
// calculée directement en arithmétique de Nombre plutôt que via la classe
// Polynome (équation toujours construite déjà réduite, degré 1 garanti par
// construction), et la résolution est pas à pas guidée de l'appli
// d'origine n'est pas reprise (hors de portée du modèle question/
// correction de flash : une seule réponse finale, comme les autres thèmes).
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

// Coefficient non nul et non trivial (jamais 1 ou -1, pour que le "ax"
// reste un vrai coefficient à l'écran plutôt qu'un simple "x").
function tirerCoefficient(min = -9, max = 9) {
  let n;
  do { n = randInt(min, max); } while (n === 0 || n === 1 || n === -1);
  return n;
}

// "3x - 5", "-2x + 4", "5x" (b=0) — jamais de signe "+ -5" recollé.
function termeAffineLatex(a, b) {
  const coeffX = a === 1 ? "x" : a === -1 ? "-x" : `${a}x`;
  if (b === 0) return coeffX;
  return b > 0 ? `${coeffX} + ${b}` : `${coeffX} - ${Math.abs(b)}`;
}

function solutionLatex(nombre) {
  return nombre.toLatex({ nombreAff: "fractionSimple" });
}

// Deux solutions attendues (v1, v2 : entiers) — un seul champ de saisie
// dans flash (pas deux) : on accepte les deux valeurs séparées par "et",
// "ou", "," ou ";", dans n'importe quel ordre, avec ou sans le préfixe "x=".
function verifierDeuxValeurs(v1, v2, input) {
  const attendu = `x = ${v1} \\text{ ou } x = ${v2}`;
  const morceaux = String(input ?? "")
    .split(/;|,|\bet\b|\bou\b/i)
    .map(s => s.trim().replace(/^x\s*=\s*/i, ""))
    .filter(Boolean);

  if (morceaux.length !== 2) return { ok: false, invalide: true, attendu };

  let valeurs;
  try {
    valeurs = morceaux.map(m => new Nombre(m));
  } catch (e) {
    return { ok: false, invalide: true, attendu };
  }

  const cible1 = Nombre.fromParts(v1, 1, "entier");
  const cible2 = Nombre.fromParts(v2, 1, "entier");
  const ok = (valeurs[0].equal(cible1) && valeurs[1].equal(cible2)) ||
             (valeurs[0].equal(cible2) && valeurs[1].equal(cible1));

  const saisieLatex = valeurs.map(v => v.toLatex()).join(" \\text{ ou } ");
  return { ok, attendu, saisieLatex };
}

// "x - 3", "x + 4", "x" (a=0) — pour un facteur (x - a) du type produit nul.
function facteurLatex(a) {
  if (a === 0) return "x";
  return a > 0 ? `x - ${a}` : `x + ${Math.abs(a)}`;
}

// Un facteur réduit à "x" seul (a=0) n'a pas besoin de parenthèses dans un
// produit ("x(x+2)", pas "(x)(x+2)") — contrairement à "x - 3"/"x + 4",
// qui en ont besoin pour marquer la somme. Pas de mécanisme équivalent à
// instanceOptions.parenthese (calcul-litteral.js/calcul-mv.js) ici : ces
// équations sont construites à la main, pas parsées, donc gérées à la main.
function facteurAvecParentheses(a) {
  return a === 0 ? facteurLatex(a) : `(${facteurLatex(a)})`;
}

const equation = [

  // ---------------------------------------------------
  // ax + b = c
  // ---------------------------------------------------
  {
    id: "equation_simple",
    theme: "equation",
    niveau: "4",
    negatif: "non",
    gen() {
      const a = tirerCoefficient();
      const b = randInt(-10, 10);
      const x0 = randInt(-8, 8);
      const c = a * x0 + b;

      const solution = Nombre.fromParts(c - b, a);

      return {
        latex: `\\text{Résoudre l'équation :}\\quad ${termeAffineLatex(a, b)} = ${c}`,
        correction: `${termeAffineLatex(a, b)} = ${c} \\Leftrightarrow x = ${solutionLatex(solution)}`,
        verifier(input) { return reponse.verifier("grandeur", new Grandeur(solution, {}), input); }
      };
    }
  },

  // ---------------------------------------------------
  // ax + b = cx + d (l'inconnue des deux côtés)
  // ---------------------------------------------------
  {
    id: "equation_variable_deux_cotes",
    theme: "equation",
    niveau: "4",
    negatif: "non",
    gen() {
      let a, c;
      do { a = tirerCoefficient(); c = tirerCoefficient(); } while (a === c);
      const b = randInt(-10, 10);
      const x0 = randInt(-8, 8);
      const d = (a - c) * x0 + b;

      const coeffRes = a - c;
      const constRes = d - b;
      const solution = Nombre.fromParts(constRes, coeffRes);

      return {
        latex: `\\text{Résoudre l'équation :}\\quad ${termeAffineLatex(a, b)} = ${termeAffineLatex(c, d)}`,
        correction: `${termeAffineLatex(a, b)} = ${termeAffineLatex(c, d)} \\Leftrightarrow x = ${solutionLatex(solution)}`,
        verifier(input) { return reponse.verifier("grandeur", new Grandeur(solution, {}), input); }
      };
    }
  },

  // ---------------------------------------------------
  // a(bx + c) = d
  // ---------------------------------------------------
  {
    id: "equation_parentheses",
    theme: "equation",
    niveau: "3",
    negatif: "non",
    gen() {
      const a = pick([2, 3, 4, -2, -3, -4]);
      const b = tirerCoefficient();
      const c = randInt(-6, 6);
      const x0 = randInt(-6, 6);
      const d = a * (b * x0 + c);

      const coeffRes = a * b;
      const constRes = a * c;
      const solution = Nombre.fromParts(d - constRes, coeffRes);

      return {
        latex: `\\text{Résoudre l'équation :}\\quad ${a}(${termeAffineLatex(b, c)}) = ${d}`,
        correction: `${a}(${termeAffineLatex(b, c)}) = ${d} \\Leftrightarrow x = ${solutionLatex(solution)}`,
        verifier(input) { return reponse.verifier("grandeur", new Grandeur(solution, {}), input); }
      };
    }
  },

  // ---------------------------------------------------
  // x² = a — deux solutions opposées si a > 0, une seule si a = 0, aucune
  // si a < 0 (un carré ne peut pas être négatif).
  // ---------------------------------------------------
  {
    id: "equation_carre",
    theme: "equation",
    niveau: "3",
    negatif: "non",
    gen() {
      const cas = pick(["positif", "positif", "positif", "zero", "negatif"]);

      if (cas === "zero") {
        return {
          latex: `\\text{Résoudre l'équation :}\\quad x^2 = 0`,
          correction: `x^2 = 0 \\Leftrightarrow x = 0`,
          verifier(input) { return reponse.verifier("grandeur", new Grandeur(Nombre.fromParts(0, 1, "entier"), {}), input); }
        };
      }

      if (cas === "negatif") {
        const a = randInt(1, 20);
        return {
          latex: `\\text{Résoudre l'équation :}\\quad x^2 = -${a}`,
          correction: `x^2 = -${a} \\, \\text{ n' a pas de solution réelle}`,
          verifier(input) {
            return reponse.verifier("texte", ["pas de solution", "aucune solution","aucune"], input, { mode: "in" });
          }
        };
      }

      const n = randInt(2, 12);
      const a = n * n;
      return {
        latex: `\\text{Résoudre l'équation :}\\quad x^2 = ${a}`,
        correction: `x^2 = ${a} \\Leftrightarrow x = ${n} \\text{ ou } x = -${n}`,
        verifier(input) { return verifierDeuxValeurs(n, -n, input); }
      };
    }
  },

  // ---------------------------------------------------
  // (x - a)(x - b) = 0 — produit nul : x = a ou x = b.
  // ---------------------------------------------------
  {
    id: "equation_produit_nul",
    theme: "equation",
    niveau: "3",
    negatif: "non",
    gen() {
      let a, b;
      do { a = randInt(-9, 9); b = randInt(-9, 9); } while (a === b);

      return {
        latex: `\\text{Résoudre l'équation :}\\quad ${facteurAvecParentheses(a)}${facteurAvecParentheses(b)} = 0`,
        correction: `${facteurAvecParentheses(a)}${facteurAvecParentheses(b)} = 0 \\Leftrightarrow x = ${a} \\text{ ou } x = ${b}`,
        verifier(input) { return verifierDeuxValeurs(a, b, input); }
      };
    }
  }

];

export default equation;
