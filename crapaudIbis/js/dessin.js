// ============================================================
//  Le crapaud, Ulysse et la chouette : une odyssée ! — LE DESSIN
//  Le style des vases grecs à figures noires : silhouettes noir lustré, détails « incisés » couleur terre cuite,
//  touches de pourpre et de blanc. Monde : 240 × 180 (y vers le bas) ; le canevas est à la résolution de l'écran.
// ============================================================
const L = 240, H = 180;
const NOIR = "#1b130e", TERRE = "#c8642c", TERRE_C = "#e08a4c", TERRE_F = "#8f3f17", CREME = "#f4e6c6", POURPRE = "#7c2418", OCRE = "#d99a3a", BLANC = "#fbf3e2";
const cv = document.getElementById("jeu");
let ctx = cv.getContext("2d");
let echelle = 1;
const degrade = (y1, y2, ...c) => { const g = ctx.createLinearGradient(0, y1, 0, y2); c.forEach((x, k) => g.addColorStop(k / (c.length - 1), x)); return g; };
const rond = (x, y, r) => { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); };
const ovale = (x, y, rx, ry, a = 0) => { ctx.beginPath(); ctx.ellipse(x, y, Math.max(.01, rx), Math.max(.01, ry), a, 0, Math.PI * 2); ctx.fill(); };
const bruit = k => { const s = Math.sin(k * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };
const trait = (pts, couleur, ep = .5) => { ctx.strokeStyle = couleur; ctx.lineWidth = ep; ctx.lineCap = "round"; ctx.lineJoin = "round"; ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); };
const poly = (pts, couleur) => { ctx.fillStyle = couleur; ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.fill(); };
function texte(s, x, y, { taille = 5, couleur = NOIR, gras = true, align = "center", police = "Georgia, serif", contour = null } = {}) {
  ctx.font = `${gras ? "bold " : ""}${taille}px ${police}`; ctx.textAlign = align; ctx.textBaseline = "middle";
  if (contour) { ctx.strokeStyle = contour; ctx.lineWidth = taille * .28; ctx.lineJoin = "round"; ctx.strokeText(s, x, y); }
  ctx.fillStyle = couleur; ctx.fillText(s, x, y);
}

// ---------- La frise de méandres (la « grecque »), en bas d'un sol ou d'un mur ----------
function meandre(x0, x1, y, h, couleur = NOIR, fond = null) {
  if (fond) { ctx.fillStyle = fond; ctx.fillRect(x0, y, x1 - x0, h); }
  const u = h / 6; ctx.strokeStyle = couleur; ctx.lineWidth = u * .9; ctx.lineCap = "square";
  ctx.beginPath();
  for (let x = x0; x < x1; x += 6 * u) {
    ctx.moveTo(x, y + 5 * u); ctx.lineTo(x + 4 * u, y + 5 * u); ctx.lineTo(x + 4 * u, y + u); ctx.lineTo(x + u, y + u); ctx.lineTo(x + u, y + 3.2 * u); ctx.lineTo(x + 2.6 * u, y + 3.2 * u);
  }
  ctx.stroke();
}
// une bande de motifs : des « oves » ou des points, comme sur les vases
function frisePoints(x0, x1, y, couleur, pas = 4) { ctx.fillStyle = couleur; for (let x = x0 + pas / 2; x < x1; x += pas) rond(x, y, pas * .22); }

// ---------- La mer et le ciel ----------
function ciel(haut, bas, y1 = 0, y2 = H) { ctx.fillStyle = degrade(y1, y2, haut, bas); ctx.fillRect(0, y1, L, y2 - y1); }
function etoiles(t, n = 40, hMax = 90) {
  for (let k = 0; k < n; k++) { const a = .35 + .35 * Math.sin(t / 20 + k * 1.7); ctx.fillStyle = `rgba(255,245,215,${a})`; ctx.fillRect(bruit(k) * L, bruit(k + 50) * hMax, .7, .7); }
}
// la mer : un aplat, des vagues stylisées (les spirales des vases), qui bougent
function mer(y, t, { x0 = 0, x1 = L, couleur = "#1d4f7a", fonce = "#123552", vague = "rgba(244,230,198,.55)", amp = 1.2 } = {}) {
  ctx.fillStyle = degrade(y, H, couleur, fonce); ctx.fillRect(x0, y, x1 - x0, H - y);
  ctx.strokeStyle = vague; ctx.lineWidth = .6; ctx.lineCap = "round";
  for (let r = 0; r < 4; r++) {
    const yy = y + 4 + r * 7, d = (t * (.3 + r * .1) + r * 9) % 18;
    ctx.beginPath();
    for (let x = x0 - 18 + d; x < x1; x += 18) { ctx.moveTo(x, yy); ctx.quadraticCurveTo(x + 4.5, yy - amp * 2, x + 9, yy); ctx.quadraticCurveTo(x + 11, yy + amp, x + 12.5, yy - amp * .5); }
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x0, y, x1 - x0, .6);
}
function nuage(x, y, w, couleur = "rgba(255,248,232,.9)") {
  ctx.fillStyle = couleur;
  ovale(x, y, w * .5, w * .16); ovale(x - w * .18, y - w * .1, w * .2, w * .16); ovale(x + w * .12, y - w * .14, w * .24, w * .2);
}
// une montagne, une île au loin
function ile(x, y, w, h, couleur) { ctx.fillStyle = couleur; ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.bezierCurveTo(x - w * .3, y - h * .6, x - w * .15, y - h, x, y - h); ctx.bezierCurveTo(x + w * .2, y - h, x + w * .32, y - h * .5, x + w / 2, y); ctx.closePath(); ctx.fill(); }
function olivier(x, base, s, couleur = "#3e4a24", feuille = "#6f8a3c") {
  ctx.strokeStyle = "#4a3320"; ctx.lineWidth = 1.6 * s; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(x, base); ctx.bezierCurveTo(x - 2 * s, base - 6 * s, x + 2 * s, base - 9 * s, x, base - 13 * s); ctx.stroke();
  ctx.fillStyle = couleur; for (const [dx, dy, r] of [[-5, -15, 5], [4, -16, 5.5], [0, -20, 5], [-1, -13, 4]]) ovale(x + dx * s, base + dy * s, r * s, r * .7 * s);
  ctx.fillStyle = feuille; for (let k = 0; k < 14; k++) ovale(x + (bruit(k + x) - .5) * 16 * s, base - (12 + bruit(k * 3 + x) * 10) * s, .9 * s, .4 * s, bruit(k) * 3);
}
// une colonne dorique
function colonne(x, base, h, w = 6, couleur = "#e8d6b0", ombre = "#b89a6a") {
  ctx.fillStyle = couleur; ctx.fillRect(x - w / 2, base - h, w, h);
  ctx.fillStyle = ombre; ctx.fillRect(x + w / 2 - w * .3, base - h, w * .3, h);
  ctx.strokeStyle = "rgba(120,90,50,.45)"; ctx.lineWidth = .3;
  for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + k * w / 4, base - h); ctx.lineTo(x - w / 2 + k * w / 4, base); ctx.stroke(); }
  ctx.fillStyle = couleur; ctx.fillRect(x - w * .8, base - h - 2, w * 1.6, 2); ctx.fillRect(x - w * .7, base - 1.5, w * 1.4, 1.5);
}

// ---------- ULYSSE : un guerrier à figure noire (casque à cimier pourpre, bouclier rond, lance) ----------
const HW = 12, HH = 10;                              // le crapaud d'or (Ulysse, lui, est dessiné plus grand)
function dessinerUlysse(h, t, { arc = false, attache = false } = {}) {
  const cx = h.x, bas = h.y, enVol = !h.auSol;
  if (!enVol && !h.nage) { ctx.fillStyle = "rgba(0,0,0,.3)"; ovale(cx, bas + .3, 5, .9); }
  ctx.save(); ctx.translate(cx, bas); ctx.scale(h.dir || 1, 1);
  // un léger halo doré : le héros se détache, même sur un fond sombre (Athéna veille sur lui)
  ctx.shadowColor = "rgba(255,226,160,.85)"; ctx.shadowBlur = 2.2 * echelle;
  const m = h.auSol && Math.abs(h.vx) > .3 ? Math.sin(h.pas || 0) : 0, saut = enVol ? 1 : 0;
  // les jambes (avec les cnémides, les jambières de bronze)
  const jambe = (s, fonce) => {
    const kx = s * 1.6 + saut * (s > 0 ? 1.5 : -1), ky = -4 + saut * 1, px = s * 2.8 + saut * (s > 0 ? 2.5 : -2), py = saut * -1.5;
    trait([[0, -8], [kx, ky], [px, py]], fonce ? "#2e2018" : NOIR, 1.7);
    trait([[kx * .9, ky + .8], [px * .95, py - .8]], OCRE, .45);
    trait([[px, py], [px + 1.4, py]], NOIR, 1);
  };
  jambe(-m, true); jambe(m, false);
  // la tunique courte et la cape pourpre
  poly([[-2.8, -6.5], [3, -6.5], [2.6, -12.4], [-2.4, -12.4]], NOIR);
  poly([[-2.4, -12.2], [-5, -6 + Math.sin(t / 8) * .5], [-3.2, -6.4]], POURPRE);
  trait([[-2.6, -8.2], [2.8, -8.2]], TERRE, .4);                         // la ceinture incisée
  trait([[-1.8, -6.8], [-1.6, -8]], TERRE, .3); trait([[.4, -6.8], [.4, -8]], TERRE, .3); trait([[2, -6.8], [2, -8]], TERRE, .3);
  // la tête, la barbe, l'œil
  ctx.fillStyle = NOIR; rond(.6, -14.4, 2.3);
  poly([[1.2, -13.3], [3.1, -13.6], [2.4, -11.6], [.6, -12.2]], NOIR);
  ctx.fillStyle = BLANC; rond(1.9, -14.8, .45); ctx.fillStyle = NOIR; rond(2.05, -14.8, .22);
  // le casque corinthien et son cimier
  poly([[-1.8, -14.2], [-1.4, -16.6], [1.2, -17.2], [2.9, -15.8], [2.8, -15.2], [-.2, -15.6], [-.6, -14]], NOIR);
  trait([[-1.6, -15.2], [2.4, -15.9]], TERRE, .35);
  ctx.fillStyle = POURPRE; ctx.beginPath(); ctx.moveTo(-.8, -17); ctx.bezierCurveTo(-1, -20.5, 2.6, -21, 3.2, -18.6); ctx.bezierCurveTo(2.2, -19.6, 0, -19.6, -2.8, -16.2); ctx.closePath(); ctx.fill();
  if (arc) {
    // l'arc tendu (épreuve finale)
    ctx.strokeStyle = "#5a3a1c"; ctx.lineWidth = .9; ctx.beginPath(); ctx.arc(4.2, -11, 5.2, -1.25, 1.25); ctx.stroke();
    trait([[4.2 + 5.2 * Math.cos(-1.25), -11 + 5.2 * Math.sin(-1.25)], [0, -11], [4.2 + 5.2 * Math.cos(1.25), -11 + 5.2 * Math.sin(1.25)]], BLANC, .25);
    trait([[0, -11], [3.8, -11.5]], NOIR, 1.1);
  } else {
    // la lance, derrière ; le bouclier rond, devant (bord crème, emblème : la chouette d'Athéna, un simple œil)
    trait([[-2.6, -1], [3.2, -21]], "#3a2616", .5); poly([[3.2, -21], [2.7, -19.4], [3.6, -19.6]], NOIR);
    if (!attache) {
      ctx.fillStyle = NOIR; rond(2.1, -9.6, 3.5);
      ctx.strokeStyle = CREME; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(2.1, -9.6, 3.1, 0, Math.PI * 2); ctx.stroke();
      ctx.fillStyle = CREME; rond(1.4, -10, .55); rond(2.8, -10, .55); ctx.fillStyle = NOIR; rond(1.4, -10, .25); rond(2.8, -10, .25);
    }
  }
  ctx.restore();
}

// ---------- LE CRAPAUD D'OR (le même que dans « Le crapaud et le dragon ») ----------
function dessinerCrapaud(c, t) {
  const cx = c.x + HW / 2, bas = c.y + HH, enVol = !c.auSol;
  if (!enVol && !c.nage) { ctx.fillStyle = "rgba(0,0,0,.35)"; ovale(cx, bas + .3, 6.4, 1.1); }
  ctx.save();
  ctx.translate(cx, bas);
  // un léger halo doré : le crapaud se détache, même sur un fond sombre
  ctx.shadowColor = "rgba(255,226,160,.8)"; ctx.shadowBlur = 2 * echelle;
  ctx.scale(c.dir, 1);
  const respire = enVol ? 0 : Math.sin(t / 9) * .2;
  const peauSombre = "#a2863a";
  const lat = enVol ? Math.min(1, Math.abs(c.vx) / 1.5) : 0;
  if (enVol) { const k = Math.max(-1, Math.min(1, c.vy / 5)); ctx.translate(0, -4); ctx.rotate(k * .28 * lat); ctx.translate(0, 4); }
  ctx.fillStyle = peauSombre;
  const pli = enVol ? Math.max(0, Math.min(1, (c.vy + 2) / 5)) : 0;
  const patte = (dx, dy, couleur, ep) => {
    const m = (a, b) => a + (b - a) * pli, p = (bond, place) => place + (bond - place) * lat;
    const hx = -3.6 + dx, hy = -2.4 + dy;
    const gx = p(m(-7.4, -6.6), m(-6.4, -6.6)) + dx, gy = p(m(.4, .2), m(1, .2)) + dy;
    const cx2 = p(m(-12, -3.8), m(-5.4, -3.8)) + dx, cy2 = p(m(1.2, 1.2), m(4.4, 1.2)) + dy;
    const angle = p(m(Math.PI, 0), m(Math.PI / 2, 0));
    ctx.strokeStyle = couleur; ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = 3 * ep; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(gx, gy); ctx.stroke();
    ctx.lineWidth = 1.7 * ep; ctx.beginPath(); ctx.moveTo(gx, gy); ctx.lineTo(cx2, cy2); ctx.stroke();
    ctx.strokeStyle = `rgba(255,230,160,${.55 * ep})`; ctx.lineWidth = .45;
    ctx.beginPath(); ctx.moveTo(hx, hy - 1.2 * ep); ctx.lineTo(gx, gy - 1.3 * ep); ctx.lineTo(cx2, cy2 - .7 * ep); ctx.stroke();
    ctx.fillStyle = couleur; ctx.beginPath(); ctx.moveTo(cx2, cy2);
    for (const a of [-.5, 0, .5]) ctx.lineTo(cx2 + 2.8 * Math.cos(angle + a), cy2 + 2.8 * Math.sin(angle + a));
    ctx.closePath(); ctx.fill();
  };
  if (enVol) { patte(1.2, -.5, "#7d6830", .85); patte(0, 0, peauSombre, 1); }
  else { ovale(-4.2, -1.6, 3.4, 1.9, -.15); ovale(-5.6, -.3, 2.4, .8); }
  const g = ctx.createRadialGradient(-1, -6.4, .5, 0, -3.6, 8);
  g.addColorStop(0, "#d4b45a"); g.addColorStop(.55, "#9a7f34"); g.addColorStop(1, "#5b4b1f");
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.moveTo(-6.4, -1.2);
  ctx.bezierCurveTo(-6.8, -5.6 - respire, -2.6, -8 - respire, 1.6, -7.6 - respire);
  ctx.bezierCurveTo(4.6, -7.3, 6.8, -5.4, 6.9, -3);
  ctx.bezierCurveTo(7, -1.4, 5.6, -.6, 3.6, -.5);
  ctx.lineTo(-5, -.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "rgba(225,205,150,.55)"; ovale(2.6, -1.4, 3.2, 1);
  ctx.fillStyle = "rgba(60,45,15,.55)";
  for (const [wx, wy, r] of [[-3.6, -4.6, .55], [-1.6, -6, .5], [-4.6, -2.8, .45], [.4, -5, .45], [-2.4, -3.2, .4], [2.2, -6.3, .35]]) rond(wx, wy, r);
  ctx.strokeStyle = "rgba(255,228,160,.55)"; ctx.lineWidth = .35;
  ctx.beginPath(); ctx.moveTo(-5.6, -4); ctx.bezierCurveTo(-4.4, -6.6 - respire, -1.2, -7.8 - respire, 1.8, -7.5 - respire); ctx.stroke();
  ctx.fillStyle = peauSombre;
  if (enVol) {
    ctx.strokeStyle = peauSombre; ctx.lineCap = "round"; ctx.lineWidth = 1.3;
    for (const [x0, x1, x2] of [[2.8, 6, 3.6], [1, 4, 1.6]]) { ctx.beginPath(); ctx.moveTo(x0, -1.8); ctx.lineTo(x2 + (x1 - x2) * lat, .2 + (1 - lat) * 1.4 - (1 - pli) * 1.2 * lat); ctx.stroke(); }
  } else { ovale(3.2, -.6, 1.1, .7); ovale(1, -.5, 1, .6); }
  ctx.strokeStyle = "#3b2f12"; ctx.lineWidth = .35; ctx.lineCap = "round";
  ctx.beginPath(); ctx.moveTo(6.6, -2.9); ctx.quadraticCurveTo(4.4, -2.5, 2.2, -3.1); ctx.stroke();
  ctx.fillStyle = "#8a7130"; ovale(3.4, -6.9, 2.1, 1.7);
  const iris = ctx.createRadialGradient(3.6, -7.1, .2, 3.6, -7.1, 1.4);
  iris.addColorStop(0, "#f6d36a"); iris.addColorStop(1, "#b5801f");
  ctx.fillStyle = iris; rond(3.7, -7, 1.3);
  ctx.fillStyle = "#120d05"; ovale(3.8, -7, .85, .32);
  ctx.fillStyle = "rgba(255,255,255,.75)"; rond(3.3, -7.5, .22);
  ctx.strokeStyle = "#4e401a"; ctx.lineWidth = .45;
  ctx.beginPath(); ctx.arc(3.7, -7, 1.4, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  ctx.fillStyle = "rgba(70,55,20,.6)"; ovale(.9, -6.6, 1.2, .5, -.2);
  ctx.restore();
}

// ---------- Les autres personnages (figures noires) ----------
// o : { robe (longue robe), barbe, cheveux (longs), couronne, bras ("leve", "tend", "bas"), couleur (de la robe), echelle }
function figure(x, base, o = {}) {
  const s = o.echelle || 1, d = o.dir || 1, t = o.t || 0;
  ctx.save(); ctx.translate(x, base); ctx.scale(s * d, s);
  const robe = o.couleur || NOIR;
  if (o.robe) {
    poly([[-3.4, 0], [3.6, 0], [2.4, -12.4], [-2.2, -12.4]], robe);
    for (let k = -2; k <= 2; k++) trait([[k * 1.1, -1], [k * .7, -10]], o.couleur ? "rgba(0,0,0,.25)" : TERRE, .3);
    if (o.couleur) { ctx.fillStyle = "rgba(255,255,255,.12)"; poly([[-3.4, 0], [-1, 0], [-1.2, -12], [-2.2, -12.4]], "rgba(255,255,255,.12)"); }
    frisePoints(-3.2, 3.4, -1.2, o.couleur ? "rgba(255,240,200,.6)" : TERRE, 1.4);
  } else {
    trait([[0, -8], [-1.4, -4], [-2.4, 0]], NOIR, 1.7); trait([[0, -8], [1.6, -4], [2.6, 0]], NOIR, 1.7);
    poly([[-2.8, -6.5], [3, -6.5], [2.6, -12.4], [-2.4, -12.4]], robe);
    trait([[-2.6, -8.2], [2.8, -8.2]], TERRE, .4);
  }
  // les bras
  const bras = o.bras || "bas";
  if (bras === "leve") trait([[1.8, -11.6], [4, -14], [4.6, -17]], o.peau || NOIR, 1.2);
  else if (bras === "tend") trait([[1.8, -11.6], [4.5, -11], [7, -11.4]], o.peau || NOIR, 1.2);
  else trait([[1.8, -11.6], [3, -8.5], [3.2, -6.6]], o.peau || NOIR, 1.2);
  // la tête
  ctx.fillStyle = o.peau || NOIR; rond(.4, -14.4, 2.3);
  if (o.cheveux) { ctx.fillStyle = o.cheveuxCouleur || NOIR; ctx.beginPath(); ctx.moveTo(-1.8, -16); ctx.bezierCurveTo(-4, -14, -3.6, -10, -2.2, -8.6); ctx.lineTo(-.6, -12.4); ctx.closePath(); ctx.fill(); rond(-.4, -15.4, 2.1); }
  if (o.barbe) poly([[.9, -13.3], [3, -13.6], [2.1, -11], [.3, -12]], NOIR);
  ctx.fillStyle = BLANC; rond(1.7, -14.8, .45); ctx.fillStyle = NOIR; rond(1.85, -14.8, .22);
  if (o.couronne) { ctx.fillStyle = OCRE; for (const [dx, dy] of [[-1.4, -16.6], [0, -17.2], [1.4, -16.8], [2.4, -16]]) ovale(dx, dy, .7, .4, .6); }
  if (o.bandeau) trait([[-1.8, -15.6], [2.4, -16.1]], o.bandeau, .6);
  ctx.restore();
}
// une galère grecque : coque noire en croissant, œil à la proue, rames, mât et voile (y = ligne de flottaison)
function galere(x, y, s, t, o = {}) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * (o.dir || 1), s);
  const roulis = Math.sin(t / 14) * .03; ctx.rotate(roulis);
  // le mât et la voile
  if (o.voile !== false) {
    trait([[0, 0], [0, -30]], "#3a2616", 1);
    trait([[-11, -27], [11, -27]], "#3a2616", .8);
    const g = o.gonfle ?? 1;
    ctx.fillStyle = o.voileCouleur || CREME; ctx.beginPath(); ctx.moveTo(-11, -27); ctx.quadraticCurveTo(0, -27 + 2 * g, 11, -27); ctx.lineTo(10, -10); ctx.quadraticCurveTo(0, -10 + 4 * g, -10, -10); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = "rgba(124,36,24,.6)"; ctx.lineWidth = .5; for (let k = -6; k <= 6; k += 4) { ctx.beginPath(); ctx.moveTo(k, -27); ctx.lineTo(k * .95, -10 + Math.abs(k) * -.1 + 3 * g); ctx.stroke(); }
  }
  // les rames
  for (let k = 0; k < (o.rames ?? 7); k++) { const rx = -14 + k * 4.3, a = Math.sin(t / 7 + k * .2) * 1.5; trait([[rx, -1], [rx - 3 + a, 6]], NOIR, .5); }
  // la coque
  ctx.fillStyle = NOIR; ctx.beginPath();
  ctx.moveTo(-22, -9); ctx.quadraticCurveTo(-20, -2, -16, 0); ctx.lineTo(16, 0); ctx.quadraticCurveTo(21, -1, 25, -4); ctx.lineTo(23, -2.2); ctx.quadraticCurveTo(21, -4, 20, -4.5);
  ctx.lineTo(-17, -4.5); ctx.quadraticCurveTo(-20, -5, -21, -9.5); ctx.closePath(); ctx.fill();
  trait([[-17, -2.6], [19, -2.6]], TERRE, .35);
  // l'œil apotropaïque, à la proue
  ctx.fillStyle = BLANC; ovale(17, -2.6, 1.6, 1); ctx.fillStyle = NOIR; rond(17.4, -2.6, .55);
  // la poupe recourbée
  trait([[-21, -9.5], [-22.5, -12], [-21, -13]], NOIR, 1);
  ctx.restore();
}
// un mouton (le troupeau du Cyclope) : toison crème, tête et pattes noires
function mouton(x, y, s, t, k = 0, belier = false) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const b = Math.sin(t / 10 + k) * .25;
  trait([[-2, 0], [-2.2, 2.6]], NOIR, .7); trait([[2, 0], [2.2, 2.6]], NOIR, .7);
  ctx.fillStyle = CREME; ovale(0, -.6, 3.6, 2.4); ovale(-1.6, -1.8 + b * .2, 1.6, 1.4); ovale(1.2, -2 + b * .2, 1.8, 1.4);
  ctx.fillStyle = NOIR; ovale(3.6, -1.6 + b, 1.2, 1.5, .4);
  if (belier) { ctx.strokeStyle = TERRE_F; ctx.lineWidth = .7; ctx.beginPath(); ctx.arc(3.3, -2.4 + b, 1.1, Math.PI * .9, Math.PI * 2.4); ctx.stroke(); }
  ctx.restore();
}
function cochon(x, y, s, t, k = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const b = Math.sin(t / 7 + k) * .3;
  trait([[-2, 0], [-2, 2]], NOIR, .8); trait([[2, 0], [2, 2]], NOIR, .8);
  ctx.fillStyle = "#d98a7a"; ovale(0, -.6, 3.8, 2.3); ovale(3.5, -1.2 + b, 1.6, 1.5);
  ctx.fillStyle = "#b86a5a"; ovale(4.9, -1 + b, .6, .7); ctx.fillStyle = NOIR; rond(3.9, -1.8 + b, .3);
  poly([[2.6, -2.4 + b], [3.4, -3.6 + b], [3.8, -2.4 + b]], "#b86a5a");
  trait([[-3.8, -1], [-4.6, -1.8], [-4.2, -2.4]], "#b86a5a", .4);
  ctx.restore();
}
// la chouette d'Athéna (d'après les drachmes d'Athènes) ; ailes : 0 (repliées) à 1 (déployées)
function chouette(x, y, s, t, ailes = 0) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  const bat = ailes > 0 ? Math.sin(t / 2) * ailes : 0;
  ctx.fillStyle = "#6b5440";
  if (ailes > 0) { for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(sg * 2.5, -4); ctx.quadraticCurveTo(sg * (7 + 2 * bat), -8 - 5 * bat, sg * (11 + bat), -2 - 4 * bat); ctx.quadraticCurveTo(sg * 6, 0, sg * 2.5, 0); ctx.closePath(); ctx.fill(); } }
  ctx.fillStyle = "#8a7050"; ovale(0, -3, 3.6, 4.6);
  ctx.fillStyle = "#c9b48c"; ovale(0, -1.8, 2.4, 3);
  ctx.strokeStyle = "#8a7050"; ctx.lineWidth = .3; for (let k = 0; k < 4; k++) { ctx.beginPath(); ctx.arc(0, -3.5 + k * 1.2, 1.4, .3, Math.PI - .3); ctx.stroke(); }
  ctx.fillStyle = "#8a7050"; rond(0, -8, 3.2); poly([[-2.6, -10], [-2.2, -12], [-1, -10.6]], "#6b5440"); poly([[2.6, -10], [2.2, -12], [1, -10.6]], "#6b5440");
  ctx.fillStyle = "#f6e9c8"; rond(-1.3, -8.2, 1.3); rond(1.3, -8.2, 1.3);
  const cl = (t % 140) < 5 ? .15 : 1;
  ctx.fillStyle = "#e9a21f"; ovale(-1.3, -8.2, .85, .85 * cl); ovale(1.3, -8.2, .85, .85 * cl);
  ctx.fillStyle = NOIR; ovale(-1.3, -8.2, .4, .4 * cl); ovale(1.3, -8.2, .4, .4 * cl);
  poly([[-.4, -7.4], [.4, -7.4], [0, -6.2]], "#d9a441");
  trait([[-1, 1.5], [-1, 2.4]], "#d9a441", .4); trait([[1, 1.5], [1, 2.4]], "#d9a441", .4);
  ctx.restore();
}
// la sortie : une colonne de lumière dorée posée au sol ; fermée, on la devine à peine
function dessinerSortie(t) {
  const S = niv.sortie; if (!S) return;
  const ouvert = sortieOuverte(), a = ouvert ? .75 + .25 * Math.sin(t / 10) : .22;
  const g = ctx.createLinearGradient(0, S.sol - 46, 0, S.sol);
  g.addColorStop(0, "rgba(255,236,170,0)"); g.addColorStop(1, `rgba(255,226,140,${.55 * a})`);
  ctx.fillStyle = g; ctx.fillRect(S.cx - S.r, S.sol - 46, 2 * S.r, 46);
  ctx.fillStyle = `rgba(255,232,160,${.6 * a})`; ovale(S.cx, S.sol, S.r, S.r * .28);
  if (ouvert) for (let k = 0; k < 6; k++) { const u = ((t * .6 + k * 9) % 46) / 46; ctx.fillStyle = `rgba(255,245,200,${1 - u})`; rond(S.cx + (bruit(k) - .5) * S.r * 1.5, S.sol - u * 46, .6); }
}
