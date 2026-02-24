// =====================================
// latex.js — Génération TikZ 3D complète
// (macro Cube STRICTEMENT conservée)
// =====================================

// -------------------------------------
// Récupération des données du tableau
// -------------------------------------

function getGridData() {

  const data = [];

  for (let r = 0; r < ROWS; r++) {
    const row = [];
    for (let c = 0; c < COLS; c++) {
      const raw = ws.getValueFromCoords(c, r);
      row.push(parseInt(raw) || 0);
    }
    data.push(row);
  }

  return data;
}

// -------------------------------------
// Génération des \Cube{x}{y}{z}
// Ordre : fond → devant, droite → gauche
// -------------------------------------

function generateCubes(data) {

  let tex = "";

  const rows = data.length;
  const cols = data[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = cols - 1; c >= 0; c--) {

      const h = data[r][c];

      for (let z = 0; z < h; z++) {
        tex += `\\Cube{${c}}{${r}}{${z}}\n`;
      }
    }
  }

  return tex;
}

// -------------------------------------
// Document complet
// -------------------------------------

function generateFullLatexDocument() {

  const data = getGridData();
  const size = data.length;

  let tex = "";

  // ----- Préambule -----

  tex += "\\documentclass[11pt]{article}\n";
  tex += "\\usepackage[T1]{fontenc}\n";
  tex += "\\usepackage[utf8]{inputenc}\n";
  tex += "\\usepackage[french]{babel}\n";
  tex += "\\usepackage{tikz}\n";
  tex += "\\usepackage{array}\n";
  tex += "\\usepackage{geometry}\n";
  tex += "\\geometry{margin=2cm}\n\n";

  // ----- TA macro Cube (non modifiée) -----

  tex += `
\\newcommand{\\Cube}[3]{

  % Face gauche
  \\filldraw[fill=gray!45]
    (#1,#2,#3) --
    (#1,#2+1,#3) --
    (#1,#2+1,#3+1) --
    (#1,#2,#3+1) -- cycle;

  % Face avant
  \\filldraw[fill=gray!30]
    (#1,#2+1,#3) --
    (#1,#2+1,#3+1) --
    (#1+1,#2+1,#3+1) --
    (#1+1,#2+1,#3) -- cycle;

  % Face supérieure
  \\filldraw[fill=gray!20]
    (#1,#2,#3+1) --
    (#1+1,#2,#3+1) --
    (#1+1,#2+1,#3+1) --
    (#1,#2+1,#3+1) -- cycle;
}
`;

  // ----- Macro Grille vide -----

  tex += `
\\newcommand{\\GrilleCinq}{
\\begin{tikzpicture}[scale=1]
\\def\\cell{1}
\\pgfmathsetmacro{\\size}{5*\\cell}
\\draw[line width=0.8pt] (0,0) rectangle (\\size,\\size);
\\draw[line width=0.4pt] (0,0) grid (\\size,\\size);
\\end{tikzpicture}
}
`;

  tex += "\\begin{document}\n\n";
  tex += "\\begin{center}\\Large \\textbf{Représentation 3D et tableau des hauteurs}\\end{center}\n";
  tex += "\\vspace*{1cm}\n";

  // ---- Perspective + tableau ----

  tex += "\\begin{center}\n";
  tex += "\\begin{tabular}{m{0.55\\textwidth} m{0.35\\textwidth}}\n";

  tex += "\\centering\n";
  tex += "\\begin{tikzpicture}[\n";
  tex += "x={(1cm,0cm)},\n";
  tex += "y={(0.4cm,-0.3cm)},\n";
  tex += "z={(0cm,1cm)}]\n";

  tex += `
\\filldraw[fill=gray!10]
  (0,0,0) --
  (5,0,0) --
  (5,5,0) --
  (0,5,0) -- cycle;
`;

  tex += generateCubes(data);

  tex += "\\end{tikzpicture}\n";
  tex += " & \n";

  tex += "\\centering\n";
  tex += "\\begin{tikzpicture}[scale=1,every node/.style={anchor=center}]\n";
  tex += "\\def\\cell{1}\n";
  tex += "\\pgfmathsetmacro{\\size}{5*\\cell}\n";
  tex += "\\draw[line width=0.8pt] (0,0) rectangle (\\size,\\size);\n";
  tex += "\\draw (0,0) grid (\\size,\\size);\n";

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {

      const value = data[r][c];
      const x = c + 0.5;
      const y = size - r - 0.5;

      tex += `\\node at (${x}*\\cell,${y}*\\cell) {${value}};\n`;
    }
  }

  tex += "\\end{tikzpicture}\n";
  tex += "\\end{tabular}\n";
  tex += "\\end{center}\n\n";

  // ---- Trois vues ----

  tex += "\\vspace*{1cm}\n";
  tex += "\\begin{center}\n";
  tex += "\\begin{tabular}{m{0.3\\textwidth} m{0.3\\textwidth} m{0.3\\textwidth}}\n";
  tex += "\\textbf{Vue de face} & \\textbf{Vue de gauche} & \\textbf{Vue de dessus} \\\\[0.5em]\n";
  tex += "\\GrilleCinq & \\GrilleCinq & \\GrilleCinq \\\\\n";
  tex += "\\end{tabular}\n";
  tex += "\\end{center}\n";

  tex += "\\end{document}";

  return tex;
}

// -------------------------------------
// Bouton export (TA FIN ORIGINALE)
// -------------------------------------

document.getElementById("saveLatexBtn")
  .addEventListener("click", () => {

    const content = generateFullLatexDocument();

    const blob = new Blob([content], { type: "text/plain" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = "piles3D.tex";
    link.click();
});