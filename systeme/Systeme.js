export class Equation {
  constructor(texte) {
    this.text = texte;
  }

  render(svg, dico, y, fontSize, spacing, width,rep="?") {
    const svgNS = "http://www.w3.org/2000/svg";
    const group = document.createElementNS(svgNS, "g");
    svg.appendChild(group);

    const tokens = this.text.match(/[a-d]|\d+|\+|\-|\*|÷|:|=|\(|\)|\?/g);

    // 1) créer les <text> invisibles pour mesurer
    const texts = tokens.map(token => {
      const text = document.createElementNS(svgNS, "text");
      text.setAttribute("y", y);
      text.setAttribute("font-size", fontSize);
      text.setAttribute("visibility", "hidden");

      if (["a", "b", "c", "d"].includes(token)) {
  if (dico["mode"] === "image") {
    text.textContent = dico[token][1];
    text.setAttribute("fill", "black");
  }

  else if (dico["mode"] === "texte") {
    text.textContent = dico[token][0].at(0);
    text.setAttribute("fill", dico[token][2]);
  }

  else if (dico["mode"] === "points") {
    text.textContent = "...";
    text.setAttribute("fill", dico[token][2]);
  }

  else {
    text.textContent = token;
    text.setAttribute("fill", "black");
  }

      } else if (token === "*") {
        text.textContent = "×";
      } else if (token === "?") {
        text.textContent = rep;
      } else {
        text.textContent = token;
      }

      group.appendChild(text);
      return text;
    });

    // 2) mesurer la largeur totale
    let totalWidth = 0;
    const widths = texts.map(t => {
      const w = t.getComputedTextLength();
      totalWidth += w + spacing;
      return w;
    });

    // 3) offset pour centrer la ligne
    let x = (width - totalWidth) / 2;

    // 4) placer réellement
    texts.forEach((t, i) => {
      const w = widths[i];
      t.setAttribute("x", x + w / 2);
      t.setAttribute("text-anchor", "middle");
      t.setAttribute("dominant-baseline", "middle");
      t.setAttribute("visibility", "visible");
      x += w + spacing;
    });
  }
}

export class Systeme {
  constructor(texteEquations, rep, niveau = "facile") {
    this.equations = texteEquations.map(eq => new Equation(eq));
    this.rep = rep;
    this.niveau = niveau;
  }

render(svg, dico, modeRep = false) {

  let rep = modeRep ? this.rep : "?";

  svg.innerHTML = "";

  const width = svg.clientWidth;
  const height = svg.clientHeight;

  const svgNS = "http://www.w3.org/2000/svg";

  // === FOND ===
const background = document.createElementNS(svgNS, "rect");
background.setAttribute("x", 0);
background.setAttribute("y", 0);
background.setAttribute("width", width);
background.setAttribute("height", height);
background.setAttribute("rx", 24);
background.setAttribute("fill", "#f8fafc"); // gris très léger
  svg.appendChild(background);

  // === SUITE NORMALE ===
  const maxTokens = Math.max(...this.equations.map(eq =>
    eq.text.match(/[a-d]|\d+|\+|\-|\*|÷|:|=|\(|\)|\?/g).length
  ));

  const nbEquation = this.equations.length;

  const lineW = width / maxTokens;
  const lineH = height / (nbEquation + 1);
  const line = Math.min(lineW, lineH);

  const fontSize = line * 0.8;
  const spacing = line * 0.2;

  const totalHeight = nbEquation * lineH;
  const bord = (height - totalHeight) / 2 + 0.5 * lineH;

  this.equations.forEach((eq, row) => {
    const y = bord + row * lineH;
    eq.render(svg, dico, y, fontSize, spacing, width, rep);
  });
}
}

