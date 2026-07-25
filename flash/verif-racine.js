// Vérification de réponses en "k√n" — ex: racine carrée non triviale
// (Pythagore hors triplet, diagonale d'un carré...).
//
// Contrairement à π (verif-pi.js, qui accepte n'importe quelle expression
// littérale équivalente via calcul-litteral.js), on n'a pas besoin ici
// d'un moteur d'expression : on compare directement les CARRÉS (k²·n, un
// entier exact) — pas besoin de manipuler l'irrationnel lui-même. La forme
// non simplifiée est acceptée (ex: √153 pour 3√17) : seule la valeur
// compte, pas la simplification du radicande.

// Parse "3√5", "3sqrt(5)", "sqrt(5)*3", "√5", "sqrt5", "racine(5)"...
// → { coeff, radicande } | null si non reconnu.
function parserRacine(saisie) {
  let s = String(saisie).trim().toLowerCase()
    .replace(/\s+/g, "")
    .replace(/racine/g, "sqrt")
    .replace(/√/g, "sqrt")
    .replace(/sqrt\((\d+)\)/, "sqrt$1"); // sqrt(5) → sqrt5, une seule forme à matcher

  // Radicande = 1 (le résultat est en fait un entier) : pas de √ à écrire,
  // juste le nombre — cas normal, pas une erreur de saisie.
  if (/^\d+$/.test(s)) return { coeff: parseInt(s, 10), radicande: 1 };

  // k avant, k après, ou pas de coefficient (k=1 implicite).
  let m = s.match(/^(\d+)?\*?sqrt(\d+)$/);
  if (m) return { coeff: m[1] ? parseInt(m[1], 10) : 1, radicande: parseInt(m[2], 10) };

  m = s.match(/^sqrt(\d+)\*?(\d+)?$/);
  if (m) return { coeff: m[2] ? parseInt(m[2], 10) : 1, radicande: parseInt(m[1], 10) };

  return null;
}

// Rendu LaTeX de k√n — juste "k" si n=1 (résultat entier), "√n" si k=1,
// "k√n" sinon.
function texRacine(coeff, radicande) {
  if (radicande === 1) return `${coeff}`;
  return coeff === 1 ? `\\sqrt{${radicande}}` : `${coeff}\\sqrt{${radicande}}`;
}

// coeffAttendu/radicandeAttendu : n'importe quelle forme (l'appelant peut
// passer la version simplifiée ou non, seul k²·n compte pour comparer).
export function verifierRacine(coeffAttendu, radicandeAttendu, uniteLatex, uniteSuffixNorm, input) {
  const attendu = `${texRacine(coeffAttendu, radicandeAttendu)}\\,${uniteLatex}`;

  const norm = String(input).trim().toLowerCase().replace(/\s+/g, "");
  const uniteEchappee = uniteSuffixNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const uniteRe = new RegExp(uniteEchappee + "$");
  if (!uniteRe.test(norm)) return { ok: false, invalide: true, attendu };
  const sansUnite = norm.replace(uniteRe, "");

  const parse = parserRacine(sansUnite);
  if (!parse) return { ok: false, invalide: true, attendu };

  const carreAttendu = coeffAttendu * coeffAttendu * radicandeAttendu;
  const carreSaisi = parse.coeff * parse.coeff * parse.radicande;

  const saisieLatex = `${texRacine(parse.coeff, parse.radicande)}\\,${uniteLatex}`;
  return { ok: carreAttendu === carreSaisi, attendu, saisieLatex };
}
