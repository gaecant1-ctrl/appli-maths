// Correction des exercices à trou : ce qui a été complété apparaît en rouge.

export function rouge(latex) {
  return `\\textcolor{red}{${latex}}`;
}

export function rougeTexte(texte) {
  return rouge(`\\text{${texte}}`);
}
