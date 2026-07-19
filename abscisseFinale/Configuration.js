class Point {
  constructor(idx, val) {
    this.idx = idx;
    this.val = val;
    this.lettre = Point.lettres[idx];
  }
}

Point.lettres = "ABCDEFGHIJK".split("");

function choisirPoint(listePoints) {
  const index = Math.floor(Math.random() * listePoints.length);
  return listePoints[index];
}

function conserveAvecValEntier(listePoints) {
  return listePoints.filter(point => point.val.isEntier());
}

function conserveAvecValNonEntier(listePoints) {
  return listePoints.filter(point => !point.val.isEntier());
}

function creerListePoints(ref0, pas) {
  const liste = [];
  for (let i = 0; i <= 10; i++) {
    liste.push(new Point(i, ref0.add(Nombre.fromParts(i).mul(pas))));
  }
  return liste;
}

function choisirDeuxPoints(listePoints) {
  if (listePoints.length < 2) {
    throw new Error("Liste trop courte pour satisfaire l'écart minimal");
  }

  const i1 = Math.floor(Math.random() * (listePoints.length-1));
  const i2 = i1 + 1+ Math.floor(Math.random() * (listePoints.length - i1-1));
  const p1 = listePoints[i1];
  const p2 = listePoints[i2];
  return [p1, p2];
}

function choisirPointHors(liste, exclusion) {
  const filtrés = liste.filter(p => !exclusion.includes(p));
  return random(filtrés);
}

/**
 * Fraction rendue en SVG plutôt qu'en HTML/CSS (span + flex) : le centrage
 * flex de "+" sur la barre de fraction dépendait de la hauteur totale de la
 * boîte, pas de la position réelle de la barre à l'intérieur — imprécis de
 * quelques pixels. En SVG, chaque texte est ancré explicitement à une
 * coordonnée y avec dominant-baseline="central", qui centre le glyphe SUR
 * cette coordonnée peu importe sa police ; le "+", le numérateur/barre/
 * dénominateur et l'entier partagent ou dérivent tous de la même valeur de
 * référence (midY), donc l'alignement est garanti par construction, plus
 * question de tâtonner une marge en em. fill="currentColor" hérite la
 * couleur posée sur le <span> englobant (.point-value), une seule source
 * de vérité pour la couleur.
 */
function _svgFraction(n, d, largeurCar = 13) {
  const w = Math.max(String(n).length, String(d).length) * largeurCar + 10;
  const h = 46, midY = h / 2;
  return `<svg width="${(w / 20).toFixed(2)}em" height="${(h / 20).toFixed(2)}em" viewBox="0 0 ${w} ${h}" style="vertical-align:middle;">` +
    `<text x="${w / 2}" y="${h * 0.27}" text-anchor="middle" dominant-baseline="central" font-size="19" fill="currentColor">${n}</text>` +
    `<line x1="3" y1="${midY}" x2="${w - 3}" y2="${midY}" stroke="currentColor" stroke-width="1.6"/>` +
    `<text x="${w / 2}" y="${h * 0.73}" text-anchor="middle" dominant-baseline="central" font-size="19" fill="currentColor">${d}</text>` +
    `</svg>`;
}

function _svgMixte(ent, n, d) {
  const entW = String(ent).length * 15 + 6;
  const plusW = 16;
  const fracW = Math.max(String(n).length, String(d).length) * 13 + 10;
  const w = entW + plusW + fracW;
  const h = 46, midY = h / 2;
  const entX = entW / 2, plusX = entW + plusW / 2, fracX = entW + plusW + fracW / 2;
  return `<svg width="${(w / 20).toFixed(2)}em" height="${(h / 20).toFixed(2)}em" viewBox="0 0 ${w} ${h}" style="vertical-align:middle;">` +
    `<text x="${entX}" y="${midY-2}" text-anchor="middle" dominant-baseline="central" font-size="20" fill="currentColor">${ent}</text>` +
    `<text x="${plusX}" y="${midY-2}" text-anchor="middle" dominant-baseline="central" font-size="20" fill="currentColor">+</text>` +
    `<text x="${fracX}" y="${h * 0.27}" text-anchor="middle" dominant-baseline="central" font-size="20" fill="currentColor">${n}</text>` +
    `<line x1="${entW + plusW + 3}" y1="${midY}" x2="${w - 3}" y2="${midY}" stroke="currentColor" stroke-width="1.6"/>` +
    `<text x="${fracX}" y="${h * 0.73}" text-anchor="middle" dominant-baseline="central" font-size="19" fill="currentColor">${d}</text>` +
    `</svg>`;
}

/** Formatte une valeur (Nombre) pour l'overlay : texte brut pour un nombre
 *  simple, SVG pour une fraction ou un nombre mixte (voir _svgFraction/
 *  _svgMixte ci-dessus). */
function formaterValeurHtml(nombre, opts) {
  const r = nombre._getRendu(opts.nombreAff, opts.precision);
  const nettoyer = (v) => String(v).replace(/¤/g, '');

  if (r.type === 'frac') {
    return _svgFraction(nettoyer(r.n), nettoyer(r.d));
  }
  if (r.type === 'mixte') {
    return _svgMixte(nettoyer(r.ent), nettoyer(r.n), nettoyer(r.d));
  }
  return nettoyer(r.v);
}

/**
 * Rend les étiquettes des points (lettre + valeur) dans l'overlay HTML
 * superposé au canvas (app.overlay) — le canvas p5.js ne sait dessiner que
 * des pixels, jamais du texte mis en forme. Ne touche au DOM que si le
 * contenu a réellement changé (évite un reflow à 60fps).
 */
function mettreAJourOverlayPoints(app, labelPoints, opts) {
  if (!app.overlay) return;

  let html = '';
  for (const { point, x, txtColor, showValue } of labelPoints) {
    const couleur = `rgb(${txtColor[0]},${txtColor[1]},${txtColor[2]})`;
    html += `<span class="point-letter" style="left:${x}px; top:${app.canvasHeight / 4}px; font-size:${app.dotSize * 0.8}px; color:${couleur};">${point.lettre}</span>`;
    if (showValue) {
      html += `<span class="point-value" style="left:${x}px; top:${app.canvasHeight * 0.78}px; font-size:${app.dotSize * 0.6}px; color:${couleur};">${formaterValeurHtml(point.val, opts)}</span>`;
    }
  }

  if (html === app._lastOverlayHtml) return;
  app._lastOverlayHtml = html;
  app.overlay.innerHTML = html;
}

class Configuration {
  constructor(ref0, pas) {
    this.ref0 = ref0;
    this.pas = pas;
    this.points = this.creerPoints();
  }

  creerPoints() {
    const liste = [];
    for (let i = 0; i <= 10; i++) {
      const val = this.ref0.add(Nombre.fromParts(i).mul(this.pas));
      liste.push(new Point(i, val));
    }
    return liste;
  }

drawPoints(app) {
  for (let r of this.points) {
    const x = app.scaleStart + r.idx * app.step;

    app.p.fill("black");
    app.p.ellipse(x, 100, 12, 12);
    app.p.noStroke();
    app.p.text(r.lettre, x, app.canvasHeight / 2 - 20);
    app.p.text(r.val.toString(), x, app.canvasHeight / 2 + 20);
  }
}

}

class ConfigurationExo extends Configuration {
  constructor(ref0, pas, pointsConnus = [], pointCible = null) {
    super(ref0, pas);
    this.pointsConnus = pointsConnus;
    this.pointCible = pointCible;
    console.log(this);
  }

drawPoints(app, {
  afficheCibleValeur = true,
  afficheCiblePoint = true,
  mode = "standard"
} = {}, opts = { nombreAff: "auto" }) {

  const labelPoints = [];

  for (let point of this.points) {
    const x = app.scaleStart + point.idx * app.step;
    const estCible = point === this.pointCible;
    const estConnu = this.pointsConnus.includes(point);

    let txtColor = [0, 0, 0];
    if (estCible && (mode === "correction" || afficheCiblePoint)) txtColor = [255, 0, 0];
    else if (estConnu) txtColor = [0, 0, 255];

    labelPoints.push({ point, x, txtColor, showValue: mode === "correction" || estConnu });

   if (estCible && (mode === "correction"||  afficheCiblePoint)){
    app.p.fill(txtColor);
    app.p.noStroke();
    app.p.ellipse(x,app.canvasHeight / 2,app.dotSize*0.7,app.dotSize*0.7);
    // Utiliser sin(frameCount) pour faire varier la taille ou la couleur
    if(app.p.frameCount<80){
    let puls = 10 + app.p.sin(app.p.frameCount * 0.3) * 10;
    app.p.ellipse(x, app.canvasHeight / 2, puls, puls);}

   }
  }

  // Les lettres/valeurs sont rendues en LaTeX dans l'overlay HTML (voir
  // mettreAJourOverlayPoints), pas sur le canvas : MathJax ne peut typeset
  // que du DOM, jamais des pixels.
  mettreAJourOverlayPoints(app, labelPoints, opts);
}

  enregistreReponse(idx) {

    if (idx >= 0 && idx <= 10) {
    this.reponseIdx = idx;
  }
  }
  
  getCible(){
    return this.pointCible;
  }
  getValeurCible() {
    return this.pointCible.val;
  }

  getLettreCible() {
    return this.pointCible.lettre;
  }
}

class ExoLireAbscisse {
  constructor(config, opts) {
    this.config = config;
  }

  draw(app,opts) {
    this.config.drawPoints(app,{ afficheCiblePoint: true, afficheCibleValeur: false }, opts);
  }

  verifier(nbr) {
    return nbr.equal(this.config.getValeurCible());
  }
  
    enregistreReponse(idx) {
return ;
  }
}

class ExoPlacerPoint {
  constructor(config, opts) {
    this.config = config;
    this.reponseIdx = null;
    this.locked = false;
  }

  draw(app,opts) {
    this.config.drawPoints(app,{ afficheCibleValeur: false, afficheCiblePoint: false }, opts);
  }

  enregistreReponse(idx) {
    console.log("idx",idx)
    if (idx >= 0 && idx <= 10) {
    this.reponseIdx = idx;
  }
}


  verifier() {
    if (this.reponseIdx === null) return false;
    console.log("Idx", this.reponseIdx);
    const cible = this.config.getLettreCible();
    return Point.lettres[this.reponseIdx] === cible;
  }

  getReponseLettre() {
    return this.reponseIdx !== null ? Point.lettres[this.reponseIdx] : "?";
  }

  reset() {
    this.reponseIdx = null;
    this.locked = false;
  }
}

const pasEntiersNiveau1 = [1, 2, 3, 4, 5, 7, 8, 9, 10];
const pasEntiersNiveau2 = [10, 15, 20, 25, 30, 35];
const pasFractions = [
  [1, 2], [1, 3], [2, 3], [1, 4], [3, 4],
  [1, 5], [2, 5], [3, 5], [1, 10], [3, 10]
];

function creerConfigurationExoNiveau(niveau) {
  if (niveau === 7) {
    niveau = random([1, 2, 3, 4, 5]);
  }

  let pas, ref0, config, entiers, nonEntiers, pointsConnus = [], pointCible;

  if (niveau === 1) {
    pas = Nombre.fromParts(random(pasEntiersNiveau1), 1);
    ref0 = Nombre.fromParts(random([0, 1, 2, 3, 4, 5, 6, 7, 8]), 1);
    config = new ConfigurationExo(ref0, pas);
    entiers = conserveAvecValEntier(config.points);
    pointsConnus = choisirDeuxPoints(entiers);
    pointCible = choisirPointHors(config.points, pointsConnus);
  }

  else if (niveau === 2) {
    pas = Nombre.fromParts(random(pasEntiersNiveau2), 1);
    ref0 = Nombre.fromParts(random([0, 1, 2, 3, 4, 5, 6, 7, 8]), 1);
    config = new ConfigurationExo(ref0, pas);
    entiers = conserveAvecValEntier(config.points);
    pointsConnus = choisirDeuxPoints(entiers);
    pointCible = choisirPointHors(config.points, pointsConnus);
  }

  else if (niveau === 3) {
    const u = Math.floor(Math.random() * 8);
    const v = u + 1 + Math.floor(Math.random() * (10 - u));
    pas = Nombre.fromParts(1, v - u);
    const entier = u+Math.floor(Math.random() * 10);
    ref0 = Nombre.fromParts(entier, 1).sub(pas.mul(Nombre.fromParts(u),1));
    config = new ConfigurationExo(ref0, pas);

    entiers = conserveAvecValEntier(config.points);
    nonEntiers = conserveAvecValNonEntier(config.points);

    const candidats = [];
    for (let i = 0; i < entiers.length - 1; i++) {
      const v1 = entiers[i].val;
      const v2 = entiers[i + 1].val;
      if (v2.sub(v1).equal(Nombre.fromParts(1, 1))) {
        candidats.push([entiers[i], entiers[i + 1]]);
      }
    }

    pointsConnus = candidats.length > 0
      ? random(candidats)
      : choisirDeuxPoints(entiers);

    pointCible = nonEntiers.length > 0
      ? choisirPointHors(nonEntiers, pointsConnus)
      : choisirPointHors(config.points, pointsConnus);
  }

  else if (niveau === 4) {
    const u = Math.floor(Math.random() * 8);
    const v = u + 1 + Math.floor(Math.random() * (10 - u));
    const w=1+Math.floor(Math.random()*(v-u));
    pas = Nombre.fromParts(w, v - u);
    const entier = u*w+Math.floor(Math.random() * 10);
    ref0 = Nombre.fromParts(entier, 1).sub(pas.mul(Nombre.fromParts(u),1));
    config = new ConfigurationExo(ref0, pas);

    entiers = conserveAvecValEntier(config.points);
    nonEntiers = conserveAvecValNonEntier(config.points);

    const candidats = [];
    for (let i = 0; i < entiers.length - 1; i++) {
      const v1 = entiers[i].val;
      const v2 = entiers[i + 1].val;
      if (v2.sub(v1).equal(Nombre.fromParts(1, 1))) {
        candidats.push([entiers[i], entiers[i + 1]]);
      }
    }

    pointsConnus = candidats.length > 0
      ? random(candidats)
      : choisirDeuxPoints(entiers);

    pointCible = nonEntiers.length > 0
      ? choisirPointHors(nonEntiers, pointsConnus)
      : choisirPointHors(config.points, pointsConnus);
 
  }

  else if (niveau === 5) {
    const [num, den] = random(pasFractions);
    pas = Nombre.fromParts(num, den);
    const entier = random([1, 2, 3, 4, 5]);
    ref0 = Nombre.fromParts(entier, 1).sub(pas);
    config = new ConfigurationExo(ref0, pas);

    const tous = config.points;
    pointsConnus = choisirDeuxPoints(tous);
    pointCible = choisirPointHors(tous, pointsConnus);
  }
  
else if (niveau === 6) { // niveau décimal
  const candidatsPas = [
    [1,10],[2,10],[3,10],[5,10],
    [1,100],[2,100],[3,100],[5,100],
    [25,100]
  ];
  const [num, den] = random(candidatsPas);
  const pas = Nombre.fromParts(num, den);

  let ref0;
  if (num === 25 && den === 100) {
    // cas spécial : 25/100 = 0,25 → ref0 doit être un entier
    ref0 = Nombre.fromParts(random([0,1,2,3,4,5,6,7,8,9]), 1);
  } else {
    // ref0 = un nombre décimal à un chiffre après la virgule
    const entier = random([0,1,2,3,4,5,6,7,8,9]);
    const dixieme = random([0,1,2,3,4,5,6,7,8,9]);
    ref0 = Nombre.fromParts(entier*10 + dixieme, 10);
  }

  const config = new ConfigurationExo(ref0, pas);

  const tous = config.points;
  const pointsConnus = choisirDeuxPoints(tous);
  const pointCible = choisirPointHors(tous, pointsConnus);

  config.pointsConnus = pointsConnus;
  config.pointCible = pointCible;
  return config;
}



  config.pointsConnus = pointsConnus;
  config.pointCible = pointCible;
  return config;
}
