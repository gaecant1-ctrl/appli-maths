// ============================================================
//  Le crapaud, Ulysse et la chouette — LE KIT DE DÉCOR MÉDITERRANÉEN
//  Une seule direction artistique pour tous les plateaux (comme la jungle du crapaud et le jaguar) :
//  calcaire doré, oliviers argentés, pins, cyprès, mer turquoise dans la brume, lumière de fin d'après-midi.
//  Les fonds ne bougent pas : on les peint une fois, à la résolution de l'écran, et on les recopie à chaque image.
// ============================================================
const fondsPeints = {};
function fondPeint(cle, peindre) {
  let f = fondsPeints[cle];
  if (!f || f.echelle !== echelle) {
    const c = document.createElement("canvas");
    c.width = Math.ceil(L * echelle); c.height = Math.ceil(H * echelle);
    const g = c.getContext("2d"); g.setTransform(echelle, 0, 0, echelle, 0, 0);
    const ecran = ctx; ctx = g;
    try { peindre(); } finally { ctx = ecran; }
    f = fondsPeints[cle] = { c, echelle };
  }
  return f.c;
}
const arrondi = (x, y, w, h, r) => { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); };
const melange = (a, b, u) => { const p = s => s.match(/\w\w/g).map(h => parseInt(h, 16)); const A = p(a), B = p(b); return `rgb(${A.map((v, k) => Math.round(v + (B[k] - v) * u)).join(",")})`; };

// ---------- Le ciel et le lointain ----------
function cielMediterranee(y0, y1, haut = "#9ec4d8", bas = "#f6e2b8") {
  ctx.fillStyle = degrade(y0, y1, haut, "#cfe0dc", bas); ctx.fillRect(0, y0, L, y1 - y0);
}
function soleilVoile(x, y, r) {
  const g = ctx.createRadialGradient(x, y, 1, x, y, r); g.addColorStop(0, "rgba(255,250,225,.95)"); g.addColorStop(.18, "rgba(255,240,200,.6)"); g.addColorStop(1, "rgba(255,236,190,0)");
  ctx.fillStyle = g; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
}
// des îles lointaines, bleutées par la distance (perspective aérienne)
function ilesLointaines(y, couleur, graine) {
  ctx.fillStyle = couleur;
  for (let k = 0; k < 5; k++) {
    const x = bruit(graine + k) * L, w = 26 + bruit(graine + k + 9) * 50, h = 3 + bruit(graine + k + 3) * 7;
    ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w / 3, y - h * .8, x - w / 8, y - h, x, y - h * .95); ctx.bezierCurveTo(x + w / 5, y - h * .9, x + w / 3, y - h * .4, x + w / 2, y); ctx.closePath(); ctx.fill();
  }
}
// la mer au loin : un dégradé turquoise, des reflets en traits fins qui se resserrent vers l'horizon
function merLointaine(y0, y1, graine) {
  ctx.fillStyle = degrade(y0, y1, "#8fc4cc", "#3f8fa6", "#2a6f8c"); ctx.fillRect(0, y0, L, y1 - y0);
  for (let k = 0; k < 40; k++) { const u = bruit(graine + k), y = y0 + (y1 - y0) * u * u, l = 2 + u * 9; ctx.fillStyle = `rgba(255,250,230,${.25 + .35 * (1 - u)})`; ctx.fillRect(bruit(graine + k + 50) * L, y, l, .35 + u * .3); }
}
function brumeHorizontale(y, h, a, couleur = "246,236,214") {
  const g = ctx.createLinearGradient(0, y - h / 2, 0, y + h / 2); g.addColorStop(0, `rgba(${couleur},0)`); g.addColorStop(.5, `rgba(${couleur},${a})`); g.addColorStop(1, `rgba(${couleur},0)`);
  ctx.fillStyle = g; ctx.fillRect(0, y - h / 2, L, h);
}

// ---------- La roche calcaire ----------
// une masse de falaise (un polygone) : un dégradé chaud, des strates, des taches, des fissures, des arêtes éclairées
function falaise(pts, { clair = "#e2cba4", sombre = "#a3825e", graine = 1, strates = true, lumiere = -1 } = {}) {
  const ys = pts.map(p => p[1]), y0 = Math.min(...ys), y1 = Math.max(...ys), xs = pts.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
  ctx.save();
  ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath();
  ctx.fillStyle = degrade(y0, y1, clair, sombre); ctx.fill(); ctx.clip();
  // grandes taches de couleur (ocre, gris, rosé), très douces
  for (let k = 0; k < 26; k++) { ctx.fillStyle = ["rgba(196,140,90,.16)", "rgba(120,110,100,.13)", "rgba(240,214,180,.18)", "rgba(150,96,62,.12)"][k % 4]; ovale(x0 + bruit(graine + k) * (x1 - x0), y0 + bruit(graine + k + 30) * (y1 - y0), 8 + bruit(graine + k + 60) * 22, 4 + bruit(graine + k + 90) * 9, (bruit(graine + k + 7) - .5) * .5); }
  // les strates : des bancs de roche, l'arête du haut éclairée, le dessous dans l'ombre
  if (strates) for (let k = 0, y = y0 + 4; y < y1; k++, y += 7 + bruit(graine + k) * 7) {
    const ond = x => y + Math.sin(x * .045 + graine + k) * 1.6 + (bruit(graine + k * 13 + Math.floor(x / 9)) - .5) * 1.2;
    ctx.beginPath(); for (let x = x0 - 2; x <= x1 + 2; x += 4) x === x0 - 2 ? ctx.moveTo(x, ond(x)) : ctx.lineTo(x, ond(x));
    ctx.strokeStyle = "rgba(90,62,38,.32)"; ctx.lineWidth = .7; ctx.stroke();
    ctx.save(); ctx.translate(0, .9); ctx.strokeStyle = "rgba(255,244,220,.32)"; ctx.lineWidth = .5; ctx.stroke(); ctx.restore();
    ctx.fillStyle = "rgba(90,62,38,.08)"; ctx.fillRect(x0, y - 4, x1 - x0, 4);
  }
  // les fissures verticales
  ctx.strokeStyle = "rgba(70,46,28,.45)"; ctx.lineWidth = .45;
  for (let k = 0; k < (x1 - x0) * (y1 - y0) / 900; k++) { let x = x0 + bruit(graine + k * 3) * (x1 - x0), y = y0 + bruit(graine + k * 5) * (y1 - y0); ctx.beginPath(); ctx.moveTo(x, y); for (let s = 0; s < 4; s++) { x += (bruit(graine + k + s) - .5) * 3; y += 2.5 + bruit(graine + k * s) * 3; ctx.lineTo(x, y); } ctx.stroke(); }
  // le relief : la lumière vient du côté du soleil
  const g = ctx.createLinearGradient(lumiere < 0 ? x0 : x1, 0, lumiere < 0 ? x1 : x0, 0); g.addColorStop(0, "rgba(255,240,205,.18)"); g.addColorStop(1, "rgba(60,36,20,.16)");
  ctx.fillStyle = g; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
  ctx.restore();
  // l'arête du haut, éclairée
  ctx.strokeStyle = "rgba(255,246,222,.55)"; ctx.lineWidth = .7; ctx.beginPath(); pts.slice(0, Math.ceil(pts.length / 2) + 1).forEach(([x, y], k) => k ? ctx.lineTo(x, y + .5) : ctx.moveTo(x, y + .5)); ctx.stroke();
}
// un contrefort de roche : un pilier bombé, éclairé à gauche, dans l'ombre à droite, avec ses bancs de roche
function contrefort(x, y0, y1, w, graine, { clair = "#d8bc92", sombre = "#6e5038" } = {}) {
  ctx.save();
  ctx.beginPath(); ctx.moveTo(x - w / 2, y1); for (let y = y1; y >= y0; y -= 6) ctx.lineTo(x - w / 2 + (bruit(graine + y) - .5) * 3, y); ctx.quadraticCurveTo(x, y0 - 6, x + w / 2, y0);
  for (let y = y0; y <= y1; y += 6) ctx.lineTo(x + w / 2 + (bruit(graine + y + 7) - .5) * 3, y); ctx.closePath();
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0); g.addColorStop(0, "rgba(232,206,166,.55)"); g.addColorStop(.5, "rgba(190,150,108,.15)"); g.addColorStop(1, "rgba(70,46,28,.45)");
  ctx.fillStyle = g; ctx.fill(); ctx.clip();
  for (let y = y0 + 6, k = 0; y < y1; y += 8 + bruit(graine + k) * 9, k++) { ctx.strokeStyle = "rgba(60,38,22,.16)"; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.quadraticCurveTo(x, y + .8 + bruit(graine + k * 3) * 1.4, x + w / 2, y + (bruit(graine + k) - .5) * 2); ctx.stroke(); ctx.strokeStyle = "rgba(255,240,210,.12)"; ctx.lineWidth = .4; ctx.beginPath(); ctx.moveTo(x - w / 2, y + .8); ctx.quadraticCurveTo(x - w / 4, y + 1.6, x, y + 1.8); ctx.stroke(); }
  ctx.restore();
}
// un buisson du maquis (lentisque, chêne kermès) : des boules vert sombre, éclairées par le haut
function maquis(x, y, r, graine, sombre = "#4c6234", clair = "#7a8f4a") {
  const n = 6 + Math.floor(bruit(graine) * 4), b = Array.from({ length: n }, (_, i) => [x + (bruit(graine + i) - .5) * r * 1.9, y + (bruit(graine + i + 40) - .5) * r * .7, r * (.38 + bruit(graine + i + 80) * .3)]);
  ctx.fillStyle = "rgba(40,30,18,.25)"; for (const [bx, by, br] of b) ovale(bx + 1, by + br * .6, br, br * .5);
  ctx.fillStyle = sombre; for (const [bx, by, br] of b) rond(bx, by, br);
  ctx.fillStyle = clair; for (const [bx, by, br] of b) rond(bx - br * .2, by - br * .35, br * .55);
}
// un pin d'Alep accroché à la roche : tronc tordu, couronne en nappes
function pinAccroche(x, y, s, graine, penche = -1) {
  ctx.strokeStyle = "#5a4230"; ctx.lineWidth = 1.4 * s; ctx.lineCap = "round";
  const tx = x + penche * 10 * s, ty = y - 16 * s;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + penche * 2 * s, y - 6 * s, tx - penche * 4 * s, ty + 6 * s, tx, ty); ctx.stroke();
  ctx.lineWidth = .7 * s; ctx.beginPath(); ctx.moveTo(tx - penche * 3 * s, ty + 4 * s); ctx.lineTo(tx + penche * 6 * s, ty + 1 * s); ctx.stroke();
  for (const [dx, dy, r] of [[0, 0, 7], [penche * 6, 2, 5], [-penche * 5, 1, 5], [penche * 2, -3, 5]]) {
    ctx.fillStyle = "#3e5a3a"; ovale(tx + dx * s, ty + dy * s, r * s, r * .42 * s);
    ctx.fillStyle = "#5f7d4e"; ovale(tx + dx * s - .6 * s, ty + dy * s - 1 * s, r * .75 * s, r * .25 * s);
  }
}
// un cyprès : un fuseau sombre, des écailles plus claires
function cypres(x, base, h, graine, voile = 0) {
  const w = h * .16;
  ctx.fillStyle = melange("2f4a2c", "a8b8a4", voile); ctx.beginPath(); ctx.moveTo(x, base - h); ctx.bezierCurveTo(x + w, base - h * .7, x + w * 1.1, base - h * .2, x + w * .4, base); ctx.lineTo(x - w * .4, base); ctx.bezierCurveTo(x - w * 1.1, base - h * .2, x - w, base - h * .7, x, base - h); ctx.fill();
  ctx.fillStyle = melange("4a6a3c", "c0ccb8", voile); for (let k = 0; k < 7; k++) ovale(x - w * .2 + (bruit(graine + k) - .5) * w, base - h * (.15 + k * .11), w * .3, h * .05, .3);
}
// un olivier : tronc noueux et creux, feuillage argenté en touffes
function olivierPeint(x, base, s, graine, voile = 0) {
  ctx.strokeStyle = melange("5a4634", "b8b0a0", voile); ctx.lineCap = "round";
  ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(x, base); ctx.bezierCurveTo(x - 3 * s, base - 5 * s, x + 4 * s, base - 9 * s, x - 1 * s, base - 14 * s); ctx.stroke();
  ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(x - 1 * s, base - 13 * s); ctx.quadraticCurveTo(x - 8 * s, base - 16 * s, x - 11 * s, base - 20 * s); ctx.moveTo(x, base - 13 * s); ctx.quadraticCurveTo(x + 7 * s, base - 16 * s, x + 10 * s, base - 21 * s); ctx.stroke();
  for (let k = 0; k < 12; k++) {
    const bx = x + (bruit(graine + k) - .5) * 26 * s, by = base - (17 + bruit(graine + k + 20) * 9) * s, r = (3.5 + bruit(graine + k + 40) * 3) * s;
    ctx.fillStyle = melange("5f6e4a", "b4bcae", voile); rond(bx, by, r);
    ctx.fillStyle = melange("98a688", "d4d8cc", voile); rond(bx - r * .25, by - r * .35, r * .55);
  }
}
// au premier plan : thym, lavande, coquelicots, herbes sèches
function herbesSeches(x0, x1, base, graine, haut = 7) {
  for (let x = x0, k = 0; x < x1; x += 1.6, k++) {
    const h = haut * (.4 + bruit(graine + k) * .8), a = (bruit(graine + k + 9) - .5) * .5;
    ctx.strokeStyle = ["#9a8a4a", "#b8a660", "#7a8440", "#c4b070"][k % 4]; ctx.lineWidth = .45;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + a * h * .5, base - h * .6, x + a * h, base - h); ctx.stroke();
  }
  for (let k = 0; k < (x1 - x0) / 9; k++) {
    const x = x0 + bruit(graine + k * 3) * (x1 - x0), y = base - 2 - bruit(graine + k * 5) * haut * .9, c = k % 3;
    if (c === 0) { ctx.fillStyle = "#c83a2a"; rond(x, y, 1.3); ctx.fillStyle = "#3a1a10"; rond(x, y, .4); }                                  // un coquelicot
    else if (c === 1) { ctx.fillStyle = "#8a78b8"; for (let j = 0; j < 4; j++) ovale(x, y - j * 1.1, .55, .7); }                              // la lavande
    else { ctx.fillStyle = "#e8d8f0"; for (let j = 0; j < 5; j++) rond(x + (bruit(k + j) - .5) * 2.4, y + (bruit(k + j + 3) - .5) * 1.6, .45); } // le thym en fleur
  }
}
// une branche d'olivier qui entre dans le cadre (premier plan)
function brancheOlivier(x, y, l, a, graine, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.strokeStyle = "#4a3a2a"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * .5, 3, l, 1); ctx.stroke();
  for (let k = 0; k < l / 3.2; k++) {
    const u = k / (l / 3.2), px = u * l, py = Math.sin(u * Math.PI) * 2.2, cote = k % 2 ? 1 : -1, an = cote * (.55 + bruit(graine + k) * .4);
    ctx.save(); ctx.translate(px, py); ctx.rotate(an);
    ctx.fillStyle = k % 3 ? "#5c6e46" : "#7d8c62"; ovale(4.4, 0, 4.6, 1.15);
    ctx.fillStyle = "rgba(220,226,208,.45)"; ovale(4, -.35, 3.4, .4);
    ctx.restore();
    if (k % 5 === 2) { ctx.fillStyle = "#3a4a2a"; ovale(px + 1, py + 3.5, 1.3, 1.7); ctx.fillStyle = "rgba(255,255,255,.35)"; rond(px + .6, py + 2.9, .4); }    // une olive
  }
  ctx.restore();
}
// une colonne dorique brisée (ruine), en marbre patiné
function colonneBrisee(x, base, h, w, graine) {
  ctx.fillStyle = degrade(base - h, base, "#efe6d4", "#bfb096"); ctx.fillRect(x - w / 2, base - h, w, h);
  ctx.fillStyle = "rgba(120,100,70,.25)"; for (let k = 1; k < 5; k++) ctx.fillRect(x - w / 2 + k * w / 5 - .25, base - h, .5, h);    // les cannelures
  ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(x - w / 2, base - h, w * .22, h);
  ctx.fillStyle = "rgba(90,70,50,.2)"; ctx.fillRect(x + w * .25, base - h, w * .25, h);
  ctx.fillStyle = "#e4d8c0"; ctx.beginPath(); ctx.moveTo(x - w / 2, base - h); for (let k = 0; k <= 5; k++) ctx.lineTo(x - w / 2 + k * w / 5, base - h - (bruit(graine + k) * 3)); ctx.lineTo(x + w / 2, base - h); ctx.fill();   // la cassure
  ctx.fillStyle = "#cdbfa0"; ctx.fillRect(x - w * .7, base - 2, w * 1.4, 2);
}

// ---------- Les corniches de pierre (plates-formes), mises en cache comme les murs du jaguar ----------
const cacheCorniches = new Map();
function cornicheCalcaire(x, y, w, h) {
  const m = 6, cle = [x, y, w, h, echelle].join(",");
  let c = cacheCorniches.get(cle);
  if (!c) {
    if (cacheCorniches.size > 60) cacheCorniches.clear();
    c = document.createElement("canvas");
    c.width = Math.ceil((w + 2 * m) * echelle); c.height = Math.ceil((h + 2 * m + 8) * echelle);
    const g = c.getContext("2d"); g.setTransform(echelle, 0, 0, echelle, (m - x) * echelle, (m - y) * echelle);
    const ecran = ctx; ctx = g;
    try { peindreCorniche(x, y, w, h); } finally { ctx = ecran; }
    cacheCorniches.set(cle, c);
  }
  ctx.drawImage(c, x - m, y - m, c.width / echelle, c.height / echelle);
}
function peindreCorniche(x, y, w, h) {
  const graine = x * 3 + y * 7;
  // le dessous : la roche qui s'amincit, dans l'ombre
  ctx.fillStyle = "#6e5640"; ctx.beginPath(); ctx.moveTo(x + 1, y + h); ctx.lineTo(x + w - 1, y + h);
  for (let k = 8; k >= 0; k--) ctx.lineTo(x + w * k / 8, y + h + 2 + bruit(graine + k) * 5 * Math.sin(Math.PI * k / 8));
  ctx.closePath(); ctx.fill();
  // la face : des blocs de calcaire appareillés (assises, joints, bombé, arêtes éclairées)
  ctx.save(); arrondi(x, y, w, h, 1.2); ctx.clip();
  ctx.fillStyle = "#5a4634"; ctx.fillRect(x, y, w, h);
  for (let r = 0, yy = y; yy < y + h; r++, yy += 3.6) {
    for (let xx = x - (r % 2) * 4, k = 0; xx < x + w; k++) {
      const bw = 6 + bruit(graine + r * 17 + k) * 7, v = (bruit(graine + r * 7 + k * 3) - .5) * 26;
      const c = b => Math.round(b + v);
      ctx.fillStyle = degrade(yy, yy + 3.6, `rgb(${c(232)},${c(212)},${c(172)})`, `rgb(${c(184)},${c(156)},${c(118)})`);
      arrondi(xx + .25, yy + .25, bw - .5, 3.1, .6); ctx.fill();
      ctx.fillStyle = "rgba(255,248,226,.35)"; ctx.fillRect(xx + .5, yy + .35, bw - 1, .45);
      xx += bw;
    }
  }
  ctx.restore();
  // le dessus : une bande éclairée, de l'herbe sèche, du thym, quelques fleurs
  ctx.fillStyle = "#f2e2bc"; arrondi(x - .4, y - .6, w + .8, 1.8, .8); ctx.fill();
  herbesSeches(x + 1, x + w - 1, y + .4, graine, 4.5);
  for (let k = 0; k < w / 14; k++) maquis(x + 5 + bruit(graine + k) * (w - 10), y - 1, 2.2 + bruit(graine + k + 5) * 1.4, graine + k * 11);
  // des racines et des touffes qui pendent dessous
  ctx.strokeStyle = "rgba(70,60,36,.8)"; ctx.lineWidth = .35;
  for (let k = 0; k < w / 8; k++) { const rx = x + 3 + bruit(graine + k * 2) * (w - 6), l = 2 + bruit(graine + k) * 6; ctx.beginPath(); ctx.moveTo(rx, y + h + 1); ctx.quadraticCurveTo(rx + 1, y + h + l / 2, rx + .4, y + h + l); ctx.stroke(); }
}

// ---------- L'ambiance, par-dessus tout : rais de lumière, embruns et pollens, vignettage chaud ----------
const GRAINS_AIR = Array.from({ length: 22 }, (_, k) => [bruit(k + 13) * L, 10 + bruit(k + 17) * 150, bruit(k + 21) * 6]);
function ambianceMediterranee(t, { rais = true, soleil = [30, 0] } = {}) {
  if (rais) {
    ctx.save(); ctx.globalCompositeOperation = "lighter";
    for (const [dx, l, ph] of [[0, 16, 0], [26, 10, 2], [54, 13, 4], [90, 9, 1]]) {
      const a = .045 + .025 * Math.sin(t / 55 + ph), x0 = soleil[0] + dx;
      const g = ctx.createLinearGradient(x0, soleil[1], x0 + 70, 175); g.addColorStop(0, `rgba(255,236,190,${a})`); g.addColorStop(1, "rgba(255,236,190,0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, soleil[1]); ctx.lineTo(x0 + l, soleil[1]); ctx.lineTo(x0 + l + 80, 180); ctx.lineTo(x0 + 80, 180); ctx.fill();
    }
    ctx.restore();
  }
  for (const [x0, y0, ph] of GRAINS_AIR) {
    const x = (x0 + t * .08 + Math.sin(t / 60 + ph) * 6) % L, y = y0 + Math.cos(t / 47 + ph * 2) * 4, a = .25 + .2 * Math.sin(t / 15 + ph * 3);
    ctx.fillStyle = `rgba(255,250,232,${a})`; rond(x, y, .45);
  }
  const v = ctx.createRadialGradient(L / 2, H / 2, 85, L / 2, H / 2, 165);
  v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(70,40,20,.28)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, L, H);
}
