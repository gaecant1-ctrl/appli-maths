export const dicoIm = {
  fruit: { b:["banane","🍌","yellow"], f:["fraise","🍓","red"], c:["citron","🍋","gold"], o:["orange","🍊","orange"] },
  legume:{ c:["champignon","🍄","green"], t:["tomate","🍅","red"], m:["maïs","🌽","gold"], a:["aubergine","🍆","magenta"] },
  animal:{ p:["poule","🐔","red"], l:["lion","🦁","gold"], c:["cochon","🐷","pink"], s:["singe","🐵","blue"] },
  marin: { d:["tortue","🐢","green"], b:["baleine","🐳","blue"], c:["crabe","🦀","red"], p:["pieuvre","🐙","magenta"] },
  fantasy:{ d:["dragon","🐲","green"], l:["licorne","🦄","magenta"], p:["papillon","🦋","blue"], f:["fee","🧚","yellow"] }
};

const rotationByTheme = {};

export function creerDico(theme = "fruit", mode = "image") {

  if (theme === "hasard") {
    const themes = Object.keys(dicoIm);
    theme = themes[Math.floor(Math.random() * themes.length)];
  }

  const base = dicoIm[theme];
  const lettres = ["a", "b", "c", "d"];
  const clefs = Object.keys(base);

  if (!(theme in rotationByTheme)) {
    rotationByTheme[theme] = 0;
  }

  const offset = rotationByTheme[theme] % clefs.length;

  const dico = {};

  for (let i = 0; i < lettres.length; i++) {
    const k = clefs[(i + offset) % clefs.length];
    dico[lettres[i]] = base[k];
  }

  rotationByTheme[theme]++;

  // 🔒 mode toujours présent
  dico.mode = mode;

  return dico;
}