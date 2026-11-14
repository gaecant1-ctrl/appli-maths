// ============================================================
//  Le crapaud et l'ibis — LES PLATEAUX   (blocs : [x, y, largeur, hauteur] ; le crapaud fait 12 × 10)
//  Une seule direction artistique : le Nil vert et bleu, les papyrus, les palmiers, le grès peint des temples,
//  la lumière dorée ; les fonds sont peints une fois (fondPeint), comme dans « Le crapaud et le jaguar ».
// ============================================================
const anime = (v, cible, vitesse = .04) => v < cible ? Math.min(cible, v + vitesse) : Math.max(cible, v - vitesse);
function eclats(x, y, t, n = 10, r = 8) {
  for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2 + t / 20, d = r * (.6 + .4 * Math.sin(t / 5 + k)); ctx.fillStyle = `rgba(255,236,170,${.5 + .5 * Math.sin(t / 4 + k)})`; rond(x + Math.cos(a) * d, y + Math.sin(a) * d, .7); }
}

// ============================================================
//  LA VÉGÉTATION DU NIL
// ============================================================
// un palmier dattier : un stipe courbe et annelé, une couronne de palmes, des régimes de dattes
function palmier(x, base, h, graine, penche = 0, voile = 0) {
  const tx = x + penche * h * .25, ty = base - h;
  ctx.strokeStyle = melange("6a5034", "c4b8a0", voile); ctx.lineCap = "round"; ctx.lineWidth = 2.6 + h * .012;
  ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + penche * h * .05, base - h * .5, tx, ty); ctx.stroke();
  ctx.strokeStyle = melange("4a3824", "b8ac94", voile); ctx.lineWidth = .4;                                     // les anneaux du stipe
  for (let u = .06; u < .97; u += .045) { const px = x + (tx - x) * u * u, py = base - h * u; ctx.beginPath(); ctx.moveTo(px - 1.4, py); ctx.lineTo(px + 1.4, py + .5); ctx.stroke(); }
  ctx.fillStyle = melange("c8641e", "dcc0a0", voile); for (let k = 0; k < 4; k++) ovale(tx + (k - 1.5) * 1.6, ty + 3, 1, 2.2);       // les dattes
  for (let f = 0; f < 11; f++) {                                                                                 // les palmes
    const a = -Math.PI / 2 + (f - 5) * .32 + (bruit(graine + f) - .5) * .2, l = h * (.2 + bruit(graine + f + 9) * .07), retombe = Math.abs(Math.cos(a)) * l * .55;
    const ex = tx + Math.cos(a) * l, ey = ty + Math.sin(a) * l * .55 + retombe;
    ctx.strokeStyle = melange("4a6a2a", "b4bea0", voile); ctx.lineWidth = .7;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * l * .55, ty + Math.sin(a) * l * .55 - 3, ex, ey); ctx.stroke();
    for (let k = 1; k < 9; k++) {                                                                              // les folioles
      const u = k / 9, px = tx + (ex - tx) * u, py = ty + (ey - ty) * u - Math.sin(u * Math.PI) * 3, n = 3.4 * (1 - u * .5);
      ctx.strokeStyle = melange(k % 2 ? "5e8432" : "3e6022", "c0c8aa", voile); ctx.lineWidth = .5;
      ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px - Math.sin(a) * n + 1, py + n); ctx.moveTo(px, py); ctx.lineTo(px + Math.sin(a) * n + 1, py + n * .9); ctx.stroke();
    }
  }
}
// une touffe de papyrus : de longues tiges vertes, chacune coiffée d'une ombelle en étoile
function papyrus(x, base, n, h, graine, voile = 0, vent = 0) {
  for (let k = 0; k < n; k++) {
    const dx = (bruit(graine + k) - .5) * n * 3, hk = h * (.7 + bruit(graine + k + 11) * .45), pl = (bruit(graine + k + 5) - .5) * .35 + vent;
    const tx = x + dx + pl * hk, ty = base - hk;
    ctx.strokeStyle = melange(k % 2 ? "4e7a2a" : "5f8c34", "c2caa8", voile); ctx.lineWidth = .7; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(x + dx * .4, base); ctx.quadraticCurveTo(x + dx, base - hk * .5, tx, ty); ctx.stroke();
    ctx.strokeStyle = melange("8ab048", "d4dcc0", voile); ctx.lineWidth = .3;                                  // l'ombelle : des rayons fins en éventail
    for (let r = 0; r < 16; r++) { const a = -Math.PI / 2 + (r / 15 - .5) * 2.6 + pl, l = 4 + bruit(graine + k * 7 + r) * 2.4; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.quadraticCurveTo(tx + Math.cos(a) * l * .6, ty + Math.sin(a) * l * .6 - 1, tx + Math.cos(a) * l, ty + Math.sin(a) * l + .6); ctx.stroke(); }
    ctx.fillStyle = melange("6a8a30", "c8d0b0", voile); rond(tx, ty, .7);
  }
}
// des roseaux et des herbes au bord de l'eau
function roseaux(x0, x1, base, graine, haut = 8, voile = 0) {
  for (let x = x0, k = 0; x < x1; x += 1.3, k++) {
    const h = haut * (.4 + bruit(graine + k) * .8), a = (bruit(graine + k + 9) - .5) * .4;
    ctx.strokeStyle = melange(["5a7a2a", "7a8f3a", "4a6a22", "8a9a48"][k % 4], "c4caa8", voile); ctx.lineWidth = .45;
    ctx.beginPath(); ctx.moveTo(x, base); ctx.quadraticCurveTo(x + a * h * .5, base - h * .6, x + a * h, base - h); ctx.stroke();
  }
}
// un lotus bleu : la feuille ronde échancrée, la fleur aux pétales pointus
function lotus(x, y, s, fleur = true, t = 0, k = 0) {
  ctx.save(); ctx.translate(x, y + Math.sin(t / 25 + k) * .3); ctx.scale(s, s);
  ctx.fillStyle = "#3f7a3a"; ctx.beginPath(); ctx.ellipse(0, 0, 7, 2.4, 0, .25, Math.PI * 2 - .05); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#5a9a4a"; ovale(-1, -.5, 5, 1.4);
  ctx.strokeStyle = "rgba(30,60,30,.5)"; ctx.lineWidth = .2; for (let r = 0; r < 6; r++) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(r) * 6, Math.sin(r) * 2); ctx.stroke(); }
  if (fleur) for (let p = 0; p < 7; p++) { const a = -Math.PI / 2 + (p - 3) * .32; ctx.fillStyle = p % 2 ? "#7a8ad8" : "#9aa8ee"; ctx.beginPath(); ctx.moveTo(1, -1); ctx.quadraticCurveTo(1 + Math.cos(a) * 2.4 - 1, -1 + Math.sin(a) * 2.4, 1 + Math.cos(a) * 4.2, -1 + Math.sin(a) * 4.2); ctx.quadraticCurveTo(1 + Math.cos(a) * 2.4 + 1, -1 + Math.sin(a) * 2.4, 1, -1); ctx.fill(); }
  if (fleur) { ctx.fillStyle = "#f2d060"; rond(1, -2, .6); }
  ctx.restore();
}
// un ibis sacré : corps blanc, tête et cou nus et noirs, long bec courbe ; il pique du bec dans l'eau
function ibis(x, y, s, t, k = 0, dir = 1) {
  const pique = Math.max(0, Math.sin(t / 30 + k * 2)) ** 3;
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  trait([[-.6, 0], [-.4, 5]], "#2a2420", .45); trait([[.8, 0], [1, 5]], "#2a2420", .45);
  ctx.fillStyle = "#f4f0e6"; ovale(0, -1.4, 4, 2.4, -.15);
  ctx.fillStyle = "#1e1a18"; poly([[-3.4, -1.6], [-6.2, -.4], [-3.2, -.2]], "#1e1a18");                          // la queue noire
  const cx = 3.4, cy = -2.4, hx = cx + 1.2 + pique * 1.8, hy = cy - 3.4 + pique * 6.4;
  trait([[cx, cy], [cx + 1.6, cy - 2], [hx, hy]], "#1e1a18", .9);                                                    // le cou
  ctx.fillStyle = "#1e1a18"; rond(hx, hy, .9);
  ctx.strokeStyle = "#1e1a18"; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(hx + .5, hy); ctx.quadraticCurveTo(hx + 3, hy + .2 + pique, hx + 3.6, hy + 2.2 + pique * .5); ctx.stroke();
  ctx.restore();
}
// une libellule, qui file au ras de l'eau
function libellule(x, y, t, k) {
  const b = Math.sin(t * 1.3 + k) * .8;
  ctx.fillStyle = "rgba(200,230,255,.55)"; ovale(x - 1, y - .6 + b * .2, 1.6, .5, -.3); ovale(x + 1, y - .6 - b * .2, 1.6, .5, .3);
  trait([[x - 2.4, y], [x + 1.8, y]], "#2a6aa8", .45); ctx.fillStyle = "#1a4a80"; rond(x + 2, y, .45);
}

// ============================================================
//  L'ÉGYPTE DES PHARAONS : pyramides, temples de grès peint, hiéroglyphes
// ============================================================
function pyramide(x, base, w, h, voile) {
  ctx.fillStyle = melange("e2c48e", "efe2c8", voile); poly([[x - w / 2, base], [x, base - h], [x + w * .12, base]], melange("e2c48e", "efe2c8", voile));
  poly([[x + w * .12, base], [x, base - h], [x + w / 2, base]], melange("b89664", "dccfb4", voile));
  ctx.strokeStyle = `rgba(150,120,80,${.2 * (1 - voile)})`; ctx.lineWidth = .3; for (let k = 1; k < 8; k++) { const y = base - h * k / 8; ctx.beginPath(); ctx.moveTo(x - w / 2 * (1 - k / 8), y); ctx.lineTo(x + w / 2 * (1 - k / 8), y); ctx.stroke(); }
}
// une felouque, sa voile triangulaire, au loin
function felouque(x, y, s, voile) {
  ctx.fillStyle = melange("6a4a30", "c8bcaa", voile); ctx.beginPath(); ctx.moveTo(x - 6 * s, y); ctx.quadraticCurveTo(x, y + 2 * s, x + 6 * s, y - .6 * s); ctx.lineTo(x - 6 * s, y); ctx.fill();
  trait([[x - 1 * s, y], [x + 1.5 * s, y - 13 * s]], melange("4a3624", "c0b4a0", voile), .4);
  ctx.fillStyle = melange("f6efe0", "f8f4ec", voile); poly([[x + 1.5 * s, y - 13 * s], [x - 5 * s, y - 1 * s], [x + 2 * s, y - 2 * s]], melange("f6efe0", "f8f4ec", voile));
}
// quelques hiéroglyphes, peints en colonne (l'œil, l'oiseau, l'eau, la plume, le soleil, l'ankh…)
function hieroglyphe(x, y, s, k, couleur) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = couleur; ctx.fillStyle = couleur; ctx.lineWidth = .5; ctx.lineCap = "round";
  switch (k % 9) {
    case 0: ctx.beginPath(); ctx.ellipse(0, 0, 2, 1, 0, 0, 7); ctx.stroke(); rond(0, 0, .5); trait([[-1, 1], [-1.4, 2.2]], couleur, .4); break;   // l'œil
    case 1: ovale(0, 0, 1.6, 1.1); rond(1.4, -1, .7); trait([[1.9, -1], [2.8, -.8]], couleur, .4); trait([[-.4, 1], [-.4, 2]], couleur, .3); break;  // l'oiseau
    case 2: ctx.beginPath(); for (let i = 0; i < 4; i++) { ctx.moveTo(-2 + i, 0); ctx.lineTo(-1.5 + i, -.6); ctx.lineTo(-1 + i, 0); } ctx.stroke(); break;   // l'eau
    case 3: ctx.beginPath(); ctx.moveTo(0, 2); ctx.quadraticCurveTo(1.2, 0, 0, -2); ctx.quadraticCurveTo(-.6, 0, 0, 2); ctx.fill(); break;   // la plume
    case 4: ctx.beginPath(); ctx.arc(0, 0, 1.3, 0, 7); ctx.stroke(); rond(0, 0, .35); break;      // le soleil
    case 5: ctx.beginPath(); ctx.ellipse(0, -1.2, .8, 1, 0, 0, 7); ctx.stroke(); trait([[0, -.2], [0, 2.2]], couleur, .5); trait([[-1.2, .4], [1.2, .4]], couleur, .5); break;   // l'ankh
    case 6: trait([[-2, 1], [2, 1]], couleur, .5); ctx.beginPath(); ctx.arc(0, 1, 1.6, Math.PI, 0); ctx.stroke(); break;  // le pain
    case 7: ctx.beginPath(); ctx.moveTo(-1.8, 1); ctx.quadraticCurveTo(0, -2.6, 1.8, 1); ctx.stroke(); trait([[-1.8, 1], [1.8, 1]], couleur, .4); break;  // la corbeille
    default: trait([[-1.4, -1.6], [1, 1.8]], couleur, .5); trait([[-.6, -1.8], [-1.6, -.6]], couleur, .4);   // le roseau
  }
  ctx.restore();
}
// une colonne papyriforme : le fût en faisceau, des bandes peintes, le chapiteau en fleur ouverte
function colonneEgypte(x, base, h, w) {
  ctx.fillStyle = degrade(base - h, base, "#ead2a0", "#c8a46e"); ctx.fillRect(x - w / 2, base - h, w, h);
  ctx.fillStyle = "rgba(255,248,230,.35)"; ctx.fillRect(x - w / 2, base - h, w * .25, h);
  ctx.fillStyle = "rgba(90,60,30,.25)"; ctx.fillRect(x + w * .2, base - h, w * .3, h);
  ctx.strokeStyle = "rgba(120,80,40,.3)"; ctx.lineWidth = .3; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(x - w / 2 + k * w / 4, base - h * .82); ctx.lineTo(x - w / 2 + k * w / 4, base); ctx.stroke(); }
  for (const [y, c] of [[.86, "#1f4e8c"], [.89, "#b5402a"], [.92, "#3a9a7a"]]) { ctx.fillStyle = c; ctx.fillRect(x - w / 2, base - h * y, w, h * .025); }
  // les hiéroglyphes du fût : gravés ton sur ton, fondus dans la pierre (une matière, pas un texte à lire)
  for (let k = 0; k < 4; k++) { const y = base - h * (.2 + k * .15), e = w / 7, n = k * 2 + Math.round(x);
    hieroglyphe(x + .35, y + .35, e, n, "rgba(255,244,220,.22)"); hieroglyphe(x, y, e, n, "rgba(110,76,40,.22)"); }
  const cy = base - h;                                                                                           // le chapiteau
  ctx.fillStyle = "#3a8a6a"; ctx.beginPath(); ctx.moveTo(x - w * .5, cy); ctx.quadraticCurveTo(x - w * 1.2, cy - w * .6, x - w * 1.1, cy - w * 1.2); ctx.lineTo(x + w * 1.1, cy - w * 1.2); ctx.quadraticCurveTo(x + w * 1.2, cy - w * .6, x + w * .5, cy); ctx.fill();
  ctx.strokeStyle = "#1f4e8c"; ctx.lineWidth = .4; for (let k = -3; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(x + k * w * .12, cy); ctx.lineTo(x + k * w * .32, cy - w * 1.15); ctx.stroke(); }
  ctx.fillStyle = "#d4a535"; ctx.fillRect(x - w * 1.1, cy - w * 1.35, w * 2.2, w * .2);
}
// le temple, sur la rive droite : le pylône, sa corniche à gorge, le disque ailé, les colonnes, les reliefs peints
function temple(x0, base) {
  const xm = (x0 + L) / 2;
  // le pylône
  ctx.fillStyle = degrade(28, base, "#e8cc96", "#b89060"); ctx.beginPath(); ctx.moveTo(x0, base); ctx.lineTo(x0 + 4, 34); ctx.lineTo(L, 30); ctx.lineTo(L, base); ctx.fill();
  ctx.strokeStyle = "rgba(110,80,46,.3)"; ctx.lineWidth = .35;
  for (let y = 38; y < base; y += 5) { ctx.beginPath(); ctx.moveTo(x0 + 4 - (y - 34) * .06, y); ctx.lineTo(L, y); ctx.stroke(); for (let x = x0 + 6 + (y % 10 ? 0 : 6); x < L; x += 12) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 5); ctx.stroke(); } }
  // la corniche à gorge et le tore
  ctx.fillStyle = "#d8b47a"; ctx.beginPath(); ctx.moveTo(x0 + 2, 34); ctx.quadraticCurveTo(x0 + 2, 26, x0 - 2, 24); ctx.lineTo(L, 22); ctx.lineTo(L, 30); ctx.lineTo(x0 + 4, 34); ctx.fill();
  for (let x = x0, k = 0; x < L; x += 3, k++) { ctx.fillStyle = ["#1f4e8c", "#b5402a", "#3a9a7a"][k % 3]; ctx.fillRect(x, 26 - (x - x0) * .03, 1.8, 5); }
  ctx.fillStyle = "#e8d4a8"; ctx.fillRect(x0 + 2, 33, L - x0, 1.4);
  // le disque solaire ailé, au-dessus de la porte
  ctx.fillStyle = "#c83a24"; rond(xm, 40, 2.4); ctx.strokeStyle = "#d4a535"; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(xm, 40, 2.4, 0, 7); ctx.stroke();
  for (const c of [-1, 1]) for (let k = 0; k < 4; k++) { ctx.fillStyle = ["#1f4e8c", "#3a9a7a", "#d4a535", "#b5402a"][k]; ctx.beginPath(); ctx.moveTo(xm + c * 2.4, 39 + k * .7); ctx.quadraticCurveTo(xm + c * 10, 37 + k * 1.2, xm + c * 17, 39.4 + k * .9); ctx.lineTo(xm + c * 17, 40 + k * .9); ctx.quadraticCurveTo(xm + c * 10, 38.4 + k * 1.2, xm + c * 2.4, 40 + k * .7); ctx.fill(); }
  // les reliefs peints : un pharaon qui fait une offrande, des colonnes de hiéroglyphes
  const pharaon = (x, y, s, dir) => {
    ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
    ctx.fillStyle = "#a8582e"; rond(0, -15, 1.8); ctx.fillRect(-1.6, -13, 3.2, 6);
    ctx.fillStyle = "#f2ead8"; poly([[-2.2, -7], [2.4, -7], [3, -2], [-2, -2]], "#f2ead8");
    ctx.fillStyle = "#a8582e"; trait([[-1, -2], [-1.6, 3]], "#a8582e", 1); trait([[1, -2], [2.4, 3]], "#a8582e", 1);
    ctx.fillStyle = "#1f4e8c"; poly([[-2, -16.6], [2.2, -16], [1.6, -13], [-2.4, -12]], "#1f4e8c");          // la coiffe
    ctx.fillStyle = "#d4a535"; ctx.fillRect(-2, -16.8, 4.2, .6);
    trait([[1.4, -11], [4, -11.6], [5.4, -12.6]], "#a8582e", .8); ctx.fillStyle = "#d4a535"; rond(5.6, -13, .8);   // l'offrande
    ctx.restore();
  };
  pharaon(x0 + 12, 74, 1.2, 1); pharaon(L - 10, 74, 1.2, -1);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 6; r++) hieroglyphe(x0 + 8 + c * 5 + (c > 1 ? 18 : 0), 48 + r * 4.4, .9, c * 7 + r * 3, ["#1f4e8c", "#b5402a", "#2a2018"][(c + r) % 3]);
  // la porte du temple, en haut des marches
  ctx.fillStyle = "#3a2414"; ctx.fillRect(xm - 6, 82, 12, 24); ctx.fillStyle = "#6a4426"; ctx.fillRect(xm - 6, 82, 12, 1.5);
  // les deux colonnes du portique
  colonneEgypte(x0 + 4, base, 66, 4.2); colonneEgypte(L - 3, base - 20, 46, 4.2);     // celle de gauche descend jusqu'au quai
}

// ============================================================
//  LES CHIFFRES ÉGYPTIENS, écrits à l'encre sur le papyrus
// ============================================================
function signeEgyptien(v, x, y, s, couleur) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = couleur; ctx.fillStyle = couleur; ctx.lineWidth = .9; ctx.lineCap = "round"; ctx.lineJoin = "round";
  if (v === 1) { ctx.beginPath(); ctx.moveTo(0, -3); ctx.lineTo(0, 3); ctx.stroke(); }                                                       // le bâton
  else if (v === 10) { ctx.beginPath(); ctx.moveTo(-2, 3); ctx.lineTo(-2, -.5); ctx.quadraticCurveTo(-2, -3, 0, -3); ctx.quadraticCurveTo(2, -3, 2, -.5); ctx.lineTo(2, 3); ctx.stroke(); }  // l'anse
  else if (v === 100) { ctx.beginPath(); for (let a = 0; a < Math.PI * 4.2; a += .2) { const r = .3 + a * .17; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r - .4); } ctx.lineTo(1.8, 3); ctx.stroke(); }   // la corde enroulée
  else if (v === 1000) {                                                                                                                        // la fleur de lotus, sur sa tige
    ctx.beginPath(); ctx.moveTo(-1.6, 3.2); ctx.lineTo(1.6, 3.2); ctx.moveTo(0, 3.2); ctx.quadraticCurveTo(.4, 0, 0, -1.4); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -1.4); ctx.quadraticCurveTo(-2.2, -2, -1.6, -3.6); ctx.quadraticCurveTo(-.6, -2.6, 0, -3.8); ctx.quadraticCurveTo(.6, -2.6, 1.6, -3.6); ctx.quadraticCurveTo(2.2, -2, 0, -1.4); ctx.fill();
    ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(.2, 1); ctx.quadraticCurveTo(1.8, .6, 2, -.6); ctx.stroke();
  } else {                                                                                                                                      // le doigt
    ctx.beginPath(); ctx.moveTo(-.6, 3); ctx.lineTo(-.6, -2.4); ctx.quadraticCurveTo(-.4, -3.4, .6, -3); ctx.lineTo(1.2, -2); ctx.stroke();
  }
  ctx.restore();
}
// un nombre en chiffres égyptiens : les groupes du plus grand au plus petit, chacun sur deux rangées au plus
function nombreEgyptien(n, x, y, s, couleur) {
  const largeur = { 10000: 3, 1000: 5, 100: 5, 10: 5, 1: 2.4 };
  const groupes = SIGNES_EG.map(([v], k) => [v, chiffresDe(n)[k]]).filter(([, c]) => c);
  const lg = ([v, c]) => Math.ceil(c / (c > 4 ? 2 : 1)) * largeur[v] * s + 2.4 * s;
  let total = groupes.reduce((a, g) => a + lg(g), 0), cx = x - total / 2;
  for (const [v, c] of groupes) {
    const rangs = c > 4 ? 2 : 1, parRang = Math.ceil(c / rangs);
    for (let i = 0; i < c; i++) { const r = Math.floor(i / parRang), j = i % parRang; signeEgyptien(v, cx + (j + .5) * largeur[v] * s, y + (rangs === 2 ? (r - .5) * 8 * s : 0), s, couleur); }
    cx += lg([v, c]);
  }
}
// le papyrus que déroule le scribe : on y lit le nombre de la question
function papyrusDeroule(n, u, t) {
  if (u <= 0) return;
  const cx = 120, cy = 40, wMax = 150, w = wMax * u, h = 46;
  ctx.save();
  ctx.fillStyle = "rgba(30,20,10,.35)"; ctx.fillRect(cx - w / 2 + 2, cy - h / 2 + 3, w, h);
  const g = ctx.createLinearGradient(0, cy - h / 2, 0, cy + h / 2); g.addColorStop(0, "#efdcae"); g.addColorStop(.5, "#f6e8c4"); g.addColorStop(1, "#e2c890");
  ctx.fillStyle = g; ctx.fillRect(cx - w / 2, cy - h / 2, w, h);
  ctx.strokeStyle = "rgba(150,120,70,.18)"; ctx.lineWidth = .3;                                                   // les fibres du papyrus
  for (let y = cy - h / 2 + 1; y < cy + h / 2; y += 1.3) { ctx.beginPath(); ctx.moveTo(cx - w / 2, y); ctx.lineTo(cx + w / 2, y); ctx.stroke(); }
  for (let x = cx - w / 2 + 2; x < cx + w / 2; x += 9) { ctx.strokeStyle = "rgba(150,120,70,.12)"; ctx.beginPath(); ctx.moveTo(x, cy - h / 2); ctx.lineTo(x, cy + h / 2); ctx.stroke(); }
  ctx.fillStyle = "#b5402a"; ctx.fillRect(cx - w / 2 + 3, cy - h / 2 + 3, w - 6, .8); ctx.fillRect(cx - w / 2 + 3, cy + h / 2 - 3.8, w - 6, .8);   // les filets rouges
  if (u >= 1 && n != null) nombreEgyptien(n, cx, cy + 1, 1.25, "#2a1a0e");
  for (const c of [-1, 1]) {                                                                                     // les rouleaux, aux deux bouts
    const rx = cx + c * w / 2; ctx.fillStyle = degrade(cy - h / 2 - 3, cy + h / 2 + 3, "#e6cc94", "#b89458"); arrondi(rx - 2.6, cy - h / 2 - 3, 5.2, h + 6, 2.4); ctx.fill();
    ctx.fillStyle = "#6a4426"; ctx.fillRect(rx - 1, cy - h / 2 - 5, 2, 2.4); ctx.fillRect(rx - 1, cy + h / 2 + 2.6, 2, 2.4);
  }
  ctx.restore();
}

// ============================================================
//  LE SCRIBE, assis en tailleur sur les marches du temple, sa palette sur les genoux
// ============================================================
function scribe(x, base, t, parle) {
  ctx.save(); ctx.translate(x, base);
  const peau = "#a8582e", b = parle ? Math.sin(t / 6) * .3 : 0;
  ctx.fillStyle = "rgba(40,24,12,.3)"; ovale(0, .5, 8, 1.4);
  ctx.fillStyle = "#f4ecd8"; ovale(0, -2.4, 7, 3);                                    // le pagne blanc, les jambes croisées
  ctx.fillStyle = "#e2d8c0"; ovale(1, -1.6, 5, 1.6);
  ctx.fillStyle = peau; ctx.beginPath(); ctx.moveTo(-3, -4.5); ctx.lineTo(3, -4.5); ctx.lineTo(2.4, -12); ctx.lineTo(-2.4, -12); ctx.fill();   // le buste
  trait([[2.2, -10.6], [4.4, -7], [3.6, -4.6]], peau, 1.4); trait([[-2, -10.6], [-3.4, -7], [-1.6, -4.8]], peau, 1.4);
  ctx.fillStyle = "#f6efe0"; ctx.fillRect(-3.4, -5.8, 7.4, 1.6); hieroglyphe(.4, -5, .45, 3, "#1f4e8c");          // le papyrus sur les genoux
  trait([[3.6, -4.6], [5.6, -7.6 + b]], "#3a2a1a", .4);                                                              // le calame
  ctx.fillStyle = peau; rond(.2, -14.4, 2.4);                                                                        // la tête
  ctx.fillStyle = "#1a1410"; ctx.beginPath(); ctx.moveTo(-2.6, -13); ctx.quadraticCurveTo(-2.8, -17.6, .6, -17); ctx.quadraticCurveTo(2.8, -16.6, 2.4, -14.6); ctx.lineTo(1, -15.4); ctx.lineTo(-1.4, -11.2); ctx.closePath(); ctx.fill();   // la perruque
  ctx.fillStyle = "#f6efe0"; rond(1.6, -14.6, .5); ctx.fillStyle = NOIR; rond(1.8, -14.6, .25); trait([[2.1, -14.6], [3, -14.8]], NOIR, .3);   // l'œil, souligné de khôl
  ctx.fillStyle = "#d4a535"; ctx.fillRect(-2.6, -11.6, 5.4, .7);                                                    // le collier
  ctx.restore();
}

// ============================================================
//  LE CROCODILE (vue de côté) : il se repose au bord de l'eau ; son dos porte le crapaud
// ============================================================
const CROCO_L = 34;
const gueuleOuverte = C => (C.t % 150) > 112;
function crocodile(C, t) {
  const dir = Math.sign(C.vx) || 1, ouv = gueuleOuverte(C) ? Math.min(1, ((C.t % 150) - 112) / 6) * (1 - Math.max(0, ((C.t % 150) - 144) / 6)) : 0;
  ctx.save(); ctx.translate(C.x + CROCO_L / 2, C.y); ctx.scale(dir, 1);
  const vert = "#4e6a34", clair = "#7a8f4a", ventre = "#c8c08a";
  // la queue qui ondule
  const o = Math.sin(t / 7 + C.x * .1) * 1.2;
  ctx.fillStyle = vert; ctx.beginPath(); ctx.moveTo(-8, -1.8); ctx.quadraticCurveTo(-14, -1 + o, -19, .4 + o * 1.4); ctx.lineTo(-8, 1.6); ctx.fill();
  // le corps
  ctx.fillStyle = vert; ovale(0, 0, 10, 2.8);
  ctx.fillStyle = clair; ovale(-1, -1.2, 8, 1.2);
  ctx.fillStyle = "#3a5226"; for (let k = -7; k <= 7; k += 2.4) poly([[k - .9, -2.2], [k, -3.4], [k + .9, -2.2]], "#3a5226");     // les écailles du dos
  for (let k = -16; k <= -9; k += 2.2) poly([[k - .6, -1 + o * (k + 9) / -10], [k, -2 + o * (k + 9) / -10], [k + .6, -1 + o * (k + 9) / -10]], "#3a5226");
  ctx.fillStyle = "rgba(255,255,220,.25)"; for (let k = -6; k <= 6; k += 2.4) rond(k + 1.2, -1.4, .35);
  // les pattes qui pagaient
  const p = Math.sin(t / 5 + C.x * .2);
  trait([[5, 1.6], [7 + p, 3.4]], "#3a5226", 1); trait([[-5, 1.6], [-7 - p, 3.4]], "#3a5226", 1);
  // la tête : la mâchoire du bas, la mâchoire du haut qui s'ouvre, les dents, l'œil sur une bosse
  ctx.fillStyle = ventre; ctx.beginPath(); ctx.moveTo(9, 1); ctx.lineTo(18, 1.4); ctx.lineTo(18, 2.2); ctx.lineTo(9, 2.6); ctx.fill();
  ctx.save(); ctx.translate(10, 0); ctx.rotate(-ouv * .55);
  ctx.fillStyle = vert; ctx.beginPath(); ctx.moveTo(-1, -2.2); ctx.lineTo(8.5, -.8); ctx.quadraticCurveTo(9.4, .6, 8, 1); ctx.lineTo(-1, 1.2); ctx.fill();
  ctx.fillStyle = "#f2ead0"; for (let k = 1; k < 8; k += 1.3) poly([[k, 1], [k + .4, 2], [k + .8, 1]], "#f2ead0");
  ctx.fillStyle = "#2a3a1a"; rond(7.6, -.8, .35);
  ctx.restore();
  if (ouv > 0) { ctx.fillStyle = `rgba(200,60,50,${ouv * .8})`; ovale(14, 1, 4 * ouv, 1 * ouv); }
  ctx.fillStyle = vert; rond(9.6, -2.4, 1.4); ctx.fillStyle = "#e8c040"; rond(10, -2.6, .7); ctx.fillStyle = "#1a1a0a"; ovale(10.1, -2.6, .18, .6);
  ctx.restore();
}

// ============================================================
//  PLATEAU 1 — LES RIVES DU NIL
// ============================================================
const EAU_NIL = 139;
const LOTUS_PF = { x: 113, y: 136, w: 14, h: 3 };
const NIL = { gauche: [0, 130, 52, 50], droite: [188, 126, 52, 54], marche: [204, 116, 36, 10], parvis: [218, 106, 22, 10] };
function peindreNil() {
  // le ciel du matin, le soleil
  ctx.fillStyle = degrade(0, 82, "#8ec2d6", "#cfe2d8", "#f4dcaa"); ctx.fillRect(0, 0, L, 82);
  soleilVoile(34, 16, 70);
  // les falaises du désert, au loin, et les pyramides dans la brume
  ctx.fillStyle = "#e6cfa2"; ctx.beginPath(); ctx.moveTo(120, 78); ctx.lineTo(132, 66); ctx.lineTo(160, 63); ctx.lineTo(190, 58); ctx.lineTo(240, 56); ctx.lineTo(240, 80); ctx.fill();
  pyramide(64, 78, 34, 22, .55); pyramide(92, 78, 22, 14, .65); pyramide(44, 78, 16, 9, .72);
  brumeHorizontale(76, 12, .7);
  // la rive d'en face : une palmeraie dans la brume
  ctx.fillStyle = "#b8c49a"; ctx.fillRect(0, 78, L, 6);
  for (let k = 0; k < 16; k++) palmier(6 + k * 15 + bruit(k) * 8, 84, 16 + bruit(k + 3) * 10, 300 + k * 7, (bruit(k + 5) - .5) * .8, .62);
  papyrus(30, 86, 6, 7, 40, .55); papyrus(150, 86, 7, 7, 50, .55);
  // le fleuve au loin, ses reflets ; une felouque
  ctx.fillStyle = degrade(84, 140, "#9cc8c0", "#5a9a96", "#3f7a7a"); ctx.fillRect(0, 84, L, 56);
  for (let k = 0; k < 60; k++) { const u = bruit(k + 900); ctx.fillStyle = `rgba(255,248,226,${.2 + .3 * (1 - u)})`; ctx.fillRect(bruit(k + 950) * L, 85 + u * u * 50, 2 + u * 8, .35 + u * .3); }
  felouque(150, 96, 1, .3);
  brumeHorizontale(86, 8, .45);
  // la rive gauche : la terre noire et fertile, les palmiers, un grand fourré de papyrus
  palmier(10, 132, 108, 11, .25); palmier(40, 132, 84, 23, -.2);
  papyrus(30, 132, 18, 54, 70); papyrus(8, 134, 12, 40, 80);
  ctx.fillStyle = degrade(128, 180, "#5a4632", "#2e2218"); ctx.beginPath(); ctx.moveTo(0, 130); ctx.lineTo(50, 130); ctx.quadraticCurveTo(56, 150, 54, 180); ctx.lineTo(0, 180); ctx.fill();
  ctx.fillStyle = "#6a8a34"; ctx.fillRect(0, 128.8, 51, 2.2);
  roseaux(0, 52, 130, 90, 7);
  // la rive droite : le quai de grès, les marches, le temple
  temple(190, 126);
  ctx.fillStyle = degrade(126, 180, "#d8b478", "#8a6640"); ctx.fillRect(188, 126, 52, 54);
  ctx.strokeStyle = "rgba(90,60,30,.35)"; ctx.lineWidth = .35; for (let y = 130; y < 180; y += 5) { ctx.beginPath(); ctx.moveTo(188, y); ctx.lineTo(L, y); ctx.stroke(); for (let x = 190 + (y % 10 ? 0 : 5); x < L; x += 10) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 5); ctx.stroke(); } }
  for (const [x, y, w, h] of [NIL.marche, NIL.parvis]) { ctx.fillStyle = degrade(y, y + h, "#efd8a8", "#c49a64"); ctx.fillRect(x, y, w, h); ctx.fillStyle = "#f8e8c4"; ctx.fillRect(x, y, w, 1.2); ctx.fillStyle = "rgba(60,40,20,.25)"; ctx.fillRect(x, y + h - 1.2, w, 1.2); }
  ctx.fillStyle = "#f4e2b8"; ctx.fillRect(188, 125.4, 52, 1.2);
  roseaux(186, 196, 138, 120, 9);
}
function decorNil(P, t) {
  ctx.drawImage(fondPeint("nil", peindreNil), 0, 0, L, H);
  if (P.vue !== "cote") { decorNilDessus(P, t); return; }
  // le Nil, devant : l'eau verte et bleue, les rides, les éclats de soleil — seulement dans le lit du fleuve, derrière les rives
  ctx.save(); ctx.beginPath(); ctx.moveTo(51, EAU_NIL - 3); ctx.quadraticCurveTo(57, 152, 55, H); ctx.lineTo(188, H); ctx.lineTo(188, EAU_NIL - 3); ctx.closePath(); ctx.clip();
  ctx.fillStyle = degrade(EAU_NIL - 6, H, "#4f8f88", "#2f6668", "#1e4a50"); ctx.fillRect(52, EAU_NIL - 3, 136, H - EAU_NIL + 3);
  ctx.strokeStyle = "rgba(220,240,230,.35)"; ctx.lineWidth = .4;
  for (let r = 0; r < 8; r++) { const y = EAU_NIL + 2 + r * 5, d = (t * (.2 + r * .05) + r * 9) % 16; ctx.beginPath(); for (let x = 52 - 16 + d; x < 188; x += 16) { ctx.moveTo(Math.max(52, x), y); ctx.quadraticCurveTo(x + 4, y - .8, x + 8, y); } ctx.stroke(); }
  for (let k = 0; k < 10; k++) { const a = .3 + .4 * Math.sin(t / 8 + k * 2); ctx.fillStyle = `rgba(255,250,220,${a})`; ctx.fillRect(56 + bruit(k + 40) * 128, EAU_NIL + 1 + bruit(k + 41) * 30, 3 + bruit(k) * 4, .4); }
  // les lotus en fleur, pour le décor ; la grande feuille de lotus, au milieu (on peut y sauter)
  for (const [x, y, s, f] of [[70, 160, .8, true], [160, 168, .9, false], [96, 172, .7, true], [176, 150, .6, true], [140, 155, .6, false]]) lotus(x, y, s, f, t, x);
  lotus(LOTUS_PF.x + 7, LOTUS_PF.y + 1.6, 1.25, true, t, 1);
  // les crocodiles, à moitié dans l'eau
  for (const C of P.crocs) crocodile(C, t);
  ctx.fillStyle = "rgba(47,102,104,.42)"; ctx.fillRect(52, EAU_NIL - .4, 136, 4);                   // l'eau qui les recouvre à moitié
  ctx.fillStyle = "rgba(230,245,240,.4)"; ctx.fillRect(52, EAU_NIL - .6, 136, .4);
  ctx.restore();
  // l'ibis, sur la rive d'en face ; les libellules
  ibis(74, 99, 1.4, t, 0, -1); ibis(164, 101, 1.2, t, 1, 1);
  for (let k = 0; k < 3; k++) libellule(80 + k * 30 + Math.sin(t / 23 + k * 2) * 18, 126 + Math.sin(t / 13 + k) * 5, t, k);
  if (P.relais) dessinerRelais(P, t);
  else { const G = P.gerb; gerboiseCote(G.x, (P.compagnon ? 126 : 130) - Math.abs(Math.sin(G.bond * Math.PI / 9)) * 3, t, G.dir); }
  // la porte du temple s'illumine quand les énigmes sont résolues
  if (gardien.etat === "fini") { const g = ctx.createRadialGradient(215, 94, 1, 215, 94, 16); g.addColorStop(0, "rgba(255,226,140,.7)"); g.addColorStop(1, "rgba(255,226,140,0)"); ctx.fillStyle = g; ctx.fillRect(199, 78, 32, 32); }
}
function devantNil(P, t) {
  if (P.bascule) { const a2 = 1 - Math.abs(P.bascule.t - 20) / 20; ctx.fillStyle = `rgba(10,24,28,${a2})`; ctx.fillRect(0, 0, L, H); }
  // le papyrus du scribe, déroulé au-dessus de la scène, avec le nombre écrit en chiffres égyptiens
  const q = question || (suiteEnAttente ? questionCorrigee : null);
  P.rouleau = anime(P.rouleau, q && q.papyrus != null ? 1 : 0, .06);
  if (q && q.papyrus != null) P.nombre = q.papyrus;
  papyrusDeroule(P.nombre, P.rouleau, t);
  if (P.happe) { ctx.fillStyle = `rgba(200,40,30,${.3 * (1 - P.happe / 40)})`; ctx.fillRect(0, 0, L, H); }
  // au premier plan : des palmes qui entrent dans le cadre, des papyrus en bas à droite
  palmeCadre(-6, -4, 70, .5, 3); palmeCadre(L + 6, -6, 60, Math.PI - .55, 9);
  papyrus(232, 182, 8, 22, 130, 0, Math.sin(t / 50) * .04);
  ambianceMediterranee(t, { soleil: [14, 0] });
}
// ============================================================
//  LA SORTIE DU TEMPLE : le décor du plateau 1, en miroir. Le crapaud ressort du temple (à gauche), descend les marches
//  jusqu'au quai ; le Nil devant, l'autre rive à droite. (Logique provisoire : une felouque attend au quai.)
// ============================================================
const NIL_M = { quai: [0, 126, 52, 54], marche: [0, 116, 36, 10], parvis: [0, 106, 22, 10], rive: [188, 130, 52, 50] };
const FELOUQUE_M = { x: 75, deck: EAU_NIL - 4, x0: 58, x1: 92 };
const miroir = dessin => { ctx.save(); ctx.translate(L, 0); ctx.scale(-1, 1); dessin(); ctx.restore(); };
// le voyage : la felouque avance, le décor glisse (parallaxe) ; la rive d'en face devient peu à peu les champs
const VOYAGE = { arret: 100, vitesse: 1.4, champs: 380, ponton: 840 };     // en pixels de défilement
const voyageEtat = P => { const f = P.parti || 0, bx = 75 + Math.min(VOYAGE.arret - 75, f * .7), s = Math.max(0, f * .7 - (VOYAGE.arret - 75)) * VOYAGE.vitesse / .7; return { bx, s: Math.min(s, VOYAGE.ponton - VOYAGE.arret - 22) }; };   // la proue s'arrête contre le ponton
function paysanChamp(x, base, t, k) {
  const p = Math.sin(t / 12 + k) * .8;
  ctx.fillStyle = "#8a4a26"; rond(x, base - 7.6, 1.1); ctx.fillStyle = "#f2ead8"; ctx.fillRect(x - 1.2, base - 6.6, 2.4, 3.4); trait([[x - .5, base - 3.2], [x - .8, base]], "#8a4a26", .7); trait([[x + .5, base - 3.2], [x + .9, base]], "#8a4a26", .7);
  trait([[x + .8, base - 6], [x + 3 + p, base - 3 + p]], "#6a4a2a", .5);                     // la houe
}
function decorVoyage(P, t) {
  const { bx, s } = voyageEtat(P);
  // le ciel, fixe
  ctx.fillStyle = degrade(0, 82, "#8ec2d6", "#cfe2d8", "#f4dcaa"); ctx.fillRect(0, 0, L, 86);
  soleilVoile(L - 34, 16, 70);
  // au loin : le désert et les pyramides (ils glissent lentement)
  const sl = s * .25;
  ctx.fillStyle = "#e6cfa2"; ctx.beginPath(); ctx.moveTo(0, 79); for (let x = 0; x <= L; x += 6) ctx.lineTo(x, 74 - 4 * Math.sin((x + sl) * .02) - 2 * Math.sin((x + sl) * .053)); ctx.lineTo(L, 80); ctx.fill();
  for (let k = 0; k < 6; k++) { const x = k * 180 + 60 - sl; if (x > -40 && x < L + 40) { pyramide(x, 78, 26, 17, .6); pyramide(x + 24, 78, 16, 10, .68); } }
  brumeHorizontale(76, 10, .6);
  // la rive d'en face : la palmeraie, puis les champs verts, les canaux, les paysans (elle glisse à mi-vitesse)
  const sm = s * .55;
  ctx.fillStyle = "#b8c49a"; ctx.fillRect(0, 78, L, 8);
  for (let k = 0; k < 80; k++) {
    const xw = k * 16, x = xw - sm; if (x < -20 || x > L + 20) continue;
    const champ = xw > VOYAGE.champs * .55 + 40;
    if (champ && k % 3 !== 0) { ctx.fillStyle = k % 2 ? "#7aa844" : "#6a9a3a"; ctx.fillRect(x - 8, 80, 16, 5); ctx.fillStyle = "rgba(255,255,255,.25)"; ctx.fillRect(x - 8, 80, 16, .5); if (k % 5 === 0) paysanChamp(x, 85, t, k); }
    else palmier(x + bruit(k + 700) * 6, 86, 12 + bruit(k + 701) * 9, 700 + k, (bruit(k + 702) - .5) * .7, .45);
  }
  // le fleuve : l'eau, ses rides et ses reflets glissent à pleine vitesse
  ctx.fillStyle = degrade(86, H, "#9cc8c0", "#5a9a96", "#3f7a7a"); ctx.fillRect(0, 86, L, H - 86);
  for (let k = 0; k < 70; k++) { const u = bruit(k + 170), y = 88 + u * u * 90, x = ((bruit(k + 171) * 600 - s * (.6 + u)) % 600 + 600) % 600 - 60; ctx.fillStyle = `rgba(255,248,226,${.2 + .3 * (1 - u)})`; ctx.fillRect(x, y, 2 + u * 10, .35 + u * .4); }
  for (let k = 0; k < 8; k++) { const x = ((k * 97 - s * 1.2) % 700 + 700) % 700 - 60, y = 150 + bruit(k + 60) * 24; lotus(x, y, .7 + bruit(k + 61) * .3, k % 2 === 0, t, k); }
  // le temple, qu'on quitte : le tableau du départ s'éloigne vers la gauche
  if (s < L + 20) { ctx.save(); ctx.translate(-s, 0); ctx.beginPath(); ctx.rect(0, 0, 60, H); ctx.clip(); miroir(() => ctx.drawImage(fondPeint("nil", peindreNil), 0, 0, L, H)); ctx.restore(); }
  // l'arrivée : la rive des champs, avec son ponton de bois
  const xr = VOYAGE.ponton - s;
  if (xr < L + 10) {
    ctx.fillStyle = degrade(118, H, "#5a4632", "#2e2218"); ctx.beginPath(); ctx.moveTo(xr + 20, 124); ctx.quadraticCurveTo(xr + 14, 150, xr + 18, H); ctx.lineTo(L + 400, H); ctx.lineTo(L + 400, 124); ctx.fill();
    ctx.fillStyle = "#7aa844"; ctx.fillRect(xr + 20, 120, L + 400, 5);
    for (let x = xr + 24; x < L; x += 3) trait([[x, 121], [x + 1, 113 - bruit(Math.round(x)) * 4]], "#6a9a3a", .8);
    palmier(xr + 70, 122, 58, 951, -.15); paysanChamp(xr + 44, 121, t, 3);
    ctx.fillStyle = "#8a6a3a"; ctx.fillRect(xr - 4, 128, 28, 3); for (const px of [xr - 2, xr + 10]) ctx.fillRect(px, 128, 2, 16);   // le ponton
    // un crapaud compagnon, vert-de-gris, qui attend sur le ponton, tourné vers le fleuve
    ctx.save(); ctx.filter = "hue-rotate(70deg) saturate(.8)"; dessinerCrapaud({ x: xr + 8, y: 128 - HH, auSol: true, dir: -1, vx: 0, vy: 0 }, t); ctx.restore();
    if (gardien.etat === "questions" || P.question) { ctx.fillStyle = "rgba(255,250,235,.95)"; arrondi(xr + 6, 106, 14, 10, 4); ctx.fill(); poly([[xr + 10, 116], [xr + 14, 116], [xr + 12, 119]], "rgba(255,250,235,.95)"); ctx.fillStyle = "#3a2410"; ctx.font = "bold 8px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText("?", xr + 13, 114); ctx.textAlign = "left"; }
  }
  // la felouque et ses passagers
  felouque(bx, FELOUQUE_M.deck + Math.sin(t / 20) * .4, 3, 0);
}
function decorSortie(P, t) {
  if (P.parti) return decorVoyage(P, t);
  miroir(() => {
    ctx.drawImage(fondPeint("nil", peindreNil), 0, 0, L, H);
    ctx.save(); ctx.beginPath(); ctx.moveTo(51, EAU_NIL - 3); ctx.quadraticCurveTo(57, 152, 55, H); ctx.lineTo(188, H); ctx.lineTo(188, EAU_NIL - 3); ctx.closePath(); ctx.clip();
    ctx.fillStyle = degrade(EAU_NIL - 6, H, "#4f8f88", "#2f6668", "#1e4a50"); ctx.fillRect(52, EAU_NIL - 3, 136, H - EAU_NIL + 3);
    ctx.strokeStyle = "rgba(220,240,230,.35)"; ctx.lineWidth = .4;
    for (let r = 0; r < 8; r++) { const y = EAU_NIL + 2 + r * 5, d = (t * (.2 + r * .05) + r * 9) % 16; ctx.beginPath(); for (let x = 52 - 16 + d; x < 188; x += 16) { ctx.moveTo(Math.max(52, x), y); ctx.lineTo(Math.min(188, x + 7), y); } ctx.stroke(); }
    for (let k = 0; k < 10; k++) { const a = .3 + .4 * Math.sin(t / 8 + k * 2); ctx.fillStyle = `rgba(255,250,220,${a})`; ctx.fillRect(56 + bruit(k + 40) * 128, EAU_NIL + 1 + bruit(k + 41) * 30, 3, .5); }
    for (const [x, y, s, f] of [[70, 160, .8, true], [160, 168, .9, false], [96, 172, .7, true], [176, 150, .6, true], [140, 155, .6, false]]) lotus(x, y, s, f, t, x);
    ctx.restore();
    ibis(74, 99, 1.4, t, 0, -1); ibis(164, 101, 1.2, t, 1, 1);
    for (let k = 0; k < 3; k++) libellule(80 + k * 30 + Math.sin(t / 23 + k * 2) * 18, 126 + Math.sin(t / 13 + k) * 5, t, k);
  });
  // la felouque, amarrée au quai du temple
  felouque(FELOUQUE_M.x, FELOUQUE_M.deck + Math.sin(t / 20) * .4, 3, 0);
  trait([[FELOUQUE_M.x0 + 2, FELOUQUE_M.deck], [50, NIL_M.quai[1] + 1]], "#c8a46e", .5);   // l'amarre
}
function devantSortie(P, t) {
  if (P.parti) {                                   // pendant le voyage : des papyrus du premier plan défilent vite
    const { s } = voyageEtat(P);
    for (let k = 0; k < 6; k++) { const x = ((k * 160 + 40 - s * 1.7) % 960 + 960) % 960 - 60; papyrus(x, 186, 8, 26, 400 + k, 0, Math.sin(t / 40 + k) * .05); }
    if (s < 60) ctx.globalAlpha = 1 - s / 60;
    if (s < 60) { palmeCadre(L + 6, -4, 70, Math.PI - .5, 3); } ctx.globalAlpha = 1;
    ambianceMediterranee(t, { soleil: [L - 14, 0] }); return;
  }
  miroir(() => { palmeCadre(-6, -4, 70, .5, 3); palmeCadre(L + 6, -6, 60, Math.PI - .55, 9); papyrus(232, 182, 8, 22, 130, 0, Math.sin(t / 50) * .04); });
  ambianceMediterranee(t, { soleil: [L - 14, 0] });
}
// une palme qui entre dans le cadre (premier plan)
function palmeCadre(x, y, l, a, graine) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(a + Math.sin(partie.image / 60 + graine) * .02);
  ctx.strokeStyle = "#3e5a22"; ctx.lineWidth = 1.2; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(l * .5, -4, l, 6); ctx.stroke();
  for (let k = 1; k < 22; k++) {
    const u = k / 22, px = l * u, py = -4 * Math.sin(u * Math.PI) + u * u * 10, n = 9 * (1 - u * .6);
    ctx.strokeStyle = k % 2 ? "#4e7428" : "#3a5a1e"; ctx.lineWidth = .8;
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + 2, py + n); ctx.moveTo(px, py); ctx.lineTo(px + 3, py - n * .5); ctx.stroke();
  }
  ctx.restore();
}
// les crocodiles nagent, portent le crapaud ; leur gueule ouverte le happe (il retourne au dernier endroit sûr)
// vue de côté : les crocodiles se reposent au bord de l'eau (ils ne bougent pas, ne mordent pas)
function bougerNil(P) {}
// l'accueil : le Nil, un crocodile, le crapaud sur sa feuille de lotus
const CROCO_ACCUEIL = { x: 70, y: EAU_NIL - 1.4, vx: .3, t: 0 };
function vignetteAccueil(t) {
  ctx.drawImage(fondPeint("nil", peindreNil), 0, 0, L, H);
  ctx.fillStyle = degrade(EAU_NIL - 6, H, "#4f8f88", "#2f6668", "#1e4a50"); ctx.fillRect(52, EAU_NIL - 3, 136, H - EAU_NIL + 3);
  lotus(LOTUS_PF.x + 7, LOTUS_PF.y + 1.6, 1.25, true, t, 1);
  CROCO_ACCUEIL.t = t; CROCO_ACCUEIL.x = 66 + Math.sin(t / 120) * 10; CROCO_ACCUEIL.vx = Math.cos(t / 120) || .1; crocodile(CROCO_ACCUEIL, t);
  ctx.fillStyle = "rgba(47,102,104,.42)"; ctx.fillRect(52, EAU_NIL - .4, 136, 4);
  ibis(74, 99, 1.4, t, 0, -1); gerboiseCote(36, 130, t, 1);
  dessinerCrapaud({ x: LOTUS_PF.x + 1, y: LOTUS_PF.y - HH, auSol: true, dir: 1, vx: 0, vy: 0 }, t);
  palmeCadre(-6, -4, 70, .5, 3); palmeCadre(L + 6, -6, 60, Math.PI - .55, 9);
  ambianceMediterranee(t, { soleil: [14, 0] });
}

// ============================================================
//  PLATEAU 2 — LE TEMPLE DE LA PESÉE (à hauteur de crapaud)
//  Un grand tableau fixe : le crapaud lève les yeux vers une immense balance. Le babouin de Thot, compagnon de passage,
//  trône en haut du pilier. Au-dessus de chaque plateau, une jarre verse du sable, chacune à son débit.
//  Le crapaud donne au babouin deux instructions : le temps de versement à gauche et à droite (ses clepsydres ne mesurent
//  que 10 secondes). La balance s'équilibre quand les deux plateaux ont reçu autant de sable : un multiple commun des deux
//  débits ; le plus petit (le PPCM) est le plus rapide. Trois pesées : à chacune, la porte du sanctuaire se lève d'un tiers.
// ============================================================
const PES = { x: 120, pivot: 60, bras: 56, corde: 34, jarreY: 40, porte: { x0: 98, x1: 142, haut: 106, sol: 168 } };   // la balance est posée sur le linteau de la porte
const SEC_IMG = 18;                                                     // une seconde de clepsydre = 18 images
function dieuPeint(x, y, s, tete, dir) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s * dir, s);
  ctx.fillStyle = "#9a4a26"; ctx.fillRect(-1.4, -12, 2.8, 6); trait([[-.6, -6], [-1, 2]], "#9a4a26", 1.1); trait([[.6, -6], [1.8, 2]], "#9a4a26", 1.1);
  ctx.fillStyle = "#f0e6cc"; poly([[-2, -6.6], [2.2, -6.6], [2.6, -1.6], [-1.8, -1.6]], "#f0e6cc");
  ctx.fillStyle = "#1f4e8c"; ctx.fillRect(-1.6, -12.2, 3.2, 1.4);
  trait([[1, -10.6], [3.6, -9.6], [5, -10.6]], "#9a4a26", .8);
  if (tete === "ibis") { ctx.fillStyle = "#1a1410"; rond(.4, -14, 1.8); ctx.strokeStyle = "#1a1410"; ctx.lineWidth = .7; ctx.beginPath(); ctx.moveTo(1.6, -14); ctx.quadraticCurveTo(4.6, -13.6, 5.6, -11.2); ctx.stroke(); ctx.fillStyle = "#1f4e8c"; poly([[-1.6, -14.4], [-.8, -12], [-2.4, -11.6]], "#1f4e8c"); }
  else { ctx.fillStyle = "#1a1410"; ovale(.6, -14, 2, 1.6); poly([[1.6, -14.6], [4.6, -13.4], [1.6, -12.8]], "#1a1410"); poly([[-.6, -15.4], [.2, -18.6], [.8, -15.4]], "#1a1410"); poly([[.6, -15.2], [1.6, -18.4], [1.8, -15]], "#1a1410"); ctx.fillStyle = "#d4a535"; rond(1.2, -14.4, .35); }
  trait([[-.2, -2], [-.2, 2]], "#d4a535", .4); ctx.strokeStyle = "#d4a535"; ctx.lineWidth = .45; ctx.beginPath(); ctx.ellipse(-.2, -3, .6, .8, 0, 0, 7); ctx.stroke();   // l'ankh qu'il tient
  ctx.restore();
}
// un grand vase de terre cuite, peint, avec son bec ; le sable qui reste dedans (n de 0 à 1)
function vaseSable(x, y, n) {
  ctx.fillStyle = "#b8642e"; ctx.beginPath(); ctx.moveTo(x - 4, y - 18); ctx.quadraticCurveTo(x - 10, y - 12, x - 8, y - 3); ctx.quadraticCurveTo(x - 6, y + 1, x, y + 1); ctx.quadraticCurveTo(x + 6, y + 1, x + 8, y - 3); ctx.quadraticCurveTo(x + 10, y - 12, x + 4, y - 18); ctx.closePath(); ctx.fill();
  ctx.fillStyle = "#1f4e8c"; ctx.fillRect(x - 8.6, y - 10, 17.2, 1.6); ctx.fillStyle = "#d4a535"; ctx.fillRect(x - 8.4, y - 7.6, 16.8, .8);
  hieroglyphe(x - 3, y - 4.6, .7, 5, "#1a1008"); hieroglyphe(x + 3, y - 4.6, .7, 1, "#1a1008");
  ctx.fillStyle = "rgba(255,240,210,.25)"; ovale(x - 4, y - 10, 1.6, 5);
  ctx.fillStyle = "#8a4a22"; ctx.fillRect(x - 4.6, y - 20, 9.2, 2.4); ctx.fillStyle = "#e2c07a"; ovale(x, y - 19, 3.4, .9 * n + .1);
  trait([[x + 7, y - 6], [x + 12, y - 7]], "#8a4a22", 1.4);                       // le bec
}
// le sable qui coule : un filet de grains dorés, de (x0, y0) à (x1, y1)
function filetSable(x0, y0, x1, y1, t, epais = 1, dense = 1) {
  ctx.strokeStyle = "rgba(226,192,122,.55)"; ctx.lineWidth = epais; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  for (let k = 0; k < 18 * dense; k++) { const u = ((t * .9 + k * 7) % 30) / 30; ctx.fillStyle = k % 3 ? "#e8c880" : "#c8a058"; rond(x0 + (x1 - x0) * u + (bruit(k) - .5) * epais, y0 + (y1 - y0) * u, .45); }
}

// le temple, vu d'en bas : les murs peints, le plafond étoilé, deux colonnes au premier plan, la porte du sanctuaire au fond
function peindrePesee() {
  ctx.fillStyle = degrade(0, 180, "#7a5634", "#3a2616"); ctx.fillRect(0, 0, L, H);
  ctx.strokeStyle = "rgba(20,10,4,.4)"; ctx.lineWidth = .5;
  for (let y = 18, r = 0; y < 168; y += 14, r++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(L, y); ctx.stroke(); for (let x = (r % 2) * 18; x < L; x += 36) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 14); ctx.stroke(); } }
  for (let k = 0; k < 50; k++) { ctx.fillStyle = `rgba(${bruit(k) > .5 ? "255,220,160" : "20,10,4"},.05)`; ovale(bruit(k + 3) * L, 20 + bruit(k + 5) * 140, 10 + bruit(k + 7) * 22, 4 + bruit(k + 9) * 7); }
  // le plafond : la nuit de lapis semée d'étoiles d'or
  ctx.fillStyle = degrade(0, 16, "#122a52", "#1f4e8c"); ctx.fillRect(0, 0, L, 16);
  for (let k = 0; k < 30; k++) { const x = 4 + k * 8 + (bruit(k) - .5) * 3, y = 3 + bruit(k + 2) * 9; ctx.fillStyle = "#e8c050"; ctx.beginPath(); for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + a * Math.PI * 2 / 5; ctx.lineTo(x + Math.cos(an) * 1.8, y + Math.sin(an) * 1.8); ctx.lineTo(x + Math.cos(an + Math.PI / 5) * .7, y + Math.sin(an + Math.PI / 5) * .7); } ctx.fill(); }
  for (let x = 0, k = 0; x < L; x += 4, k++) { ctx.fillStyle = ["#1f4e8c", "#b5402a", "#3a9a7a", "#d4a535"][k % 4]; ctx.fillRect(x + .4, 16, 3.2, 3.6); }
  // tout le mur est couvert de colonnes de hiéroglyphes gravés dans le grès, ton sur ton : une matière régulière,
  // que l'œil ne cherche pas à lire ; la couleur est réservée à la balance, au babouin, aux jarres et à la porte
  for (let c = 0, x = 4; x < L; x += 7, c++) {
    ctx.fillStyle = "rgba(30,16,6,.18)"; ctx.fillRect(x + 3.2, 22, .4, 144);                           // le filet entre deux colonnes de texte
    for (let r = 0, y = 27; y < 164; y += 7, r++) {
      const k = Math.floor(bruit(c * 31 + r * 7 + 3) * 9);
      hieroglyphe(x + .4, y + .4, 1.05, k, "rgba(255,226,170,.09)");                                  // l'arête éclairée de la gravure
      hieroglyphe(x, y, 1.05, k, "rgba(40,22,8,.26)");
    }
  }
  ctx.fillStyle = "rgba(30,16,6,.25)"; ctx.fillRect(0, 21, L, 1); ctx.fillRect(0, 165, L, 1);
  // la porte du sanctuaire, au fond : un encadrement de grès, la lumière derrière
  const D = PES.porte;
  const lum = ctx.createLinearGradient(0, D.haut, 0, D.sol); lum.addColorStop(0, "#fff2c8"); lum.addColorStop(1, "#e8b860");
  ctx.fillStyle = lum; ctx.fillRect(D.x0, D.haut, D.x1 - D.x0, D.sol - D.haut);
  ctx.fillStyle = degrade(D.haut - 14, D.sol, "#c8a46e", "#8a6a44"); ctx.fillRect(D.x0 - 8, D.haut - 12, 8, D.sol - D.haut + 12); ctx.fillRect(D.x1, D.haut - 12, 8, D.sol - D.haut + 12); ctx.fillRect(D.x0 - 10, D.haut - 16, D.x1 - D.x0 + 20, 6);
  ctx.fillStyle = "#d4a535"; ctx.fillRect(D.x0 - 10, D.haut - 16, D.x1 - D.x0 + 20, 1.2);
  // le disque ailé, au-dessus de la porte
  ctx.fillStyle = "#c8402a"; rond(PES.x, D.haut - 13, 2); for (const c of [-1, 1]) { ctx.fillStyle = "#1f4e8c"; poly([[PES.x + c * 2, D.haut - 14], [PES.x + c * 14, D.haut - 15.4], [PES.x + c * 12, D.haut - 12], [PES.x + c * 2, D.haut - 12]], "#1f4e8c"); }
  // le sol, tout proche : on est à hauteur de crapaud
  ctx.fillStyle = degrade(168, 180, "#9a7a50", "#5a4028"); ctx.fillRect(0, 168, L, 12);
  ctx.strokeStyle = "rgba(20,10,4,.35)"; ctx.lineWidth = .4; for (let x = -60; x < L + 60; x += 20) { ctx.beginPath(); ctx.moveTo(PES.x + (x - PES.x) * .7, 168); ctx.lineTo(x, 180); ctx.stroke(); }
  ctx.fillStyle = "#c8a46e"; ctx.fillRect(0, 167.6, L, .8);
  // deux colonnes au premier plan, qui encadrent la scène
  colonneEgypte(10, 180, 150, 14); colonneEgypte(230, 180, 150, 14);
  ctx.fillStyle = "rgba(10,5,2,.18)"; ctx.fillRect(0, 0, L, H);
}
// ce que contient chaque plateau à l'instant (en deben), et depuis combien de temps chaque jarre coule
function chargesPesee(P) {
  const E = P.pesee, Q = P.pb[P.etape] || P.pb[2];
  if (!E) return { cg: 0, cd: 0, sg: 0, sd: 0 };
  const s = E.t / SEC_IMG, sg = Math.min(s, E.tg), sd = Math.min(s, E.td);
  return { cg: Q.g * sg, cd: Q.d * sd, sg, sd };
}
function anglePesee(P) {
  const E = P.pesee;
  if (!E) return 0;
  if (E.vide) return E.angle * Math.max(0, 1 - E.vide / 34);
  const { cg, cd } = chargesPesee(P);
  return .28 * Math.tanh((cd - cg) / 6);                                  // le plateau le plus lourd descend
}
function decorTemple(P, t) {
  ctx.drawImage(fondPeint("pesee", peindrePesee), 0, 0, L, H);
  const D = PES.porte, x = PES.x, Q = P.pb[Math.min(P.etape, 2)], E = P.pesee, a = anglePesee(P), C = chargesPesee(P);
  // la dalle de la porte, qui se lève d'un tiers à chaque pesée réussie
  const yd = D.haut - (D.sol - D.haut) * P.porte;
  ctx.save(); ctx.beginPath(); ctx.rect(D.x0, D.haut, D.x1 - D.x0, D.sol - D.haut); ctx.clip();
  ctx.fillStyle = degrade(yd, yd + D.sol - D.haut, "#c8a46e", "#8a6a44"); ctx.fillRect(D.x0, yd, D.x1 - D.x0, D.sol - D.haut);
  ctx.strokeStyle = "rgba(40,24,12,.5)"; ctx.lineWidth = .5; ctx.strokeRect(D.x0 + 2, yd + 2, D.x1 - D.x0 - 4, D.sol - D.haut - 4);
  for (let k = 0; k < 3; k++) { ctx.fillStyle = k < P.etape ? "#e8c050" : "#5a3a1e"; rond(D.x0 + 10 + k * 12, yd + 40, 2.4); }        // les trois sceaux
  hieroglyphe(x, yd + 22, 3, 5, "#5a3a1e");
  ctx.restore();
  if (P.porte > 0) { const g = ctx.createRadialGradient(x, D.sol, 4, x, D.sol, 70); g.addColorStop(0, `rgba(255,230,160,${.35 * P.porte})`); g.addColorStop(1, "rgba(255,230,160,0)"); ctx.fillStyle = g; ctx.fillRect(0, 60, L, 120); }
  // le pilier de la balance, son socle, son chapiteau
  const pied = D.haut - 16;                                                // le dessus du linteau
  ctx.fillStyle = degrade(pied - 6, pied, "#d8b47a", "#8a6a44"); ctx.fillRect(x - 11, pied - 5, 22, 5); ctx.fillStyle = "#d4a535"; ctx.fillRect(x - 11, pied - 5, 22, .8);
  const gp = ctx.createLinearGradient(x - 4, 0, x + 4, 0); gp.addColorStop(0, "#8a6a2a"); gp.addColorStop(.4, "#f0cc6a"); gp.addColorStop(1, "#7a5a20"); ctx.fillStyle = gp; ctx.fillRect(x - 3, PES.pivot, 6, pied - 5 - PES.pivot);
  for (let y = PES.pivot + 8; y < pied - 8; y += 8) { ctx.fillStyle = "#1f4e8c"; ctx.fillRect(x - 3, y, 6, 1.4); ctx.fillStyle = "#b5402a"; ctx.fillRect(x - 3, y + 1.4, 6, .7); }
  // le fléau, et ce qui pend à ses deux bouts
  const bouts = [-1, 1].map(c => [x + c * PES.bras * Math.cos(a), PES.pivot + c * PES.bras * Math.sin(a)]);
  ctx.lineCap = "round"; trait([bouts[0], bouts[1]], "#8a5a1a", 3.4); trait([bouts[0], bouts[1]], "#e0b04a", 2);
  for (const [bx, by] of bouts) { ctx.fillStyle = "#d4a535"; rond(bx, by, 2); }
  // les jarres et leur sable
  const verse = [E && !E.vide && !E.fin && E.t / SEC_IMG < E.tg, E && !E.vide && !E.fin && E.t / SEC_IMG < E.td];
  [-1, 1].forEach((c, i) => {
    const jx = x + c * PES.bras, by = bouts[i][1] + PES.corde;
    for (const [x0, w] of [[jx - 15, 12], [jx + 3, 12]]) { ctx.fillStyle = "#8a6a44"; ctx.fillRect(x0, PES.jarreY + 1, w, 2.4); ctx.fillStyle = "#4a3420"; ctx.fillRect(x0, PES.jarreY + 3.2, w, .8); }
    trait([[jx + c * 15, PES.jarreY + 3], [jx + c * 21, PES.jarreY - 6]], "#6a4a2e", 1.2);
    ctx.save(); ctx.translate(jx, PES.jarreY); ctx.scale(1.5, 1.5); vaseSable(0, 0, verse[i] ? .5 : 1); ctx.restore();
    ctx.fillStyle = "#8a6a2a"; ctx.fillRect(jx - 1.4, PES.jarreY + 1, 2.8, 3); ctx.fillStyle = "#d4a535"; ctx.fillRect(jx - 3, PES.jarreY + 2.2, 6, 1);
    // le débit, sur une plaque d'or accrochée à la jarre
    const d = i ? Q.d : Q.g;
    const px0 = jx + c * 32;
    if (P.montre) {
    ctx.fillStyle = "rgba(26,16,8,.82)"; arrondi(px0 - 15, PES.jarreY - 14, 30, 15, 2.4); ctx.fill(); ctx.strokeStyle = "#d4a535"; ctx.lineWidth = .5; ctx.stroke();
    ctx.fillStyle = "#f6dc90"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.font = "bold 8px Georgia, serif"; ctx.fillText(`${d} deben`, px0, PES.jarreY - 9.6); ctx.font = "5px Georgia, serif"; ctx.fillText("par seconde", px0, PES.jarreY - 3.6);
    }
    ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
    if (verse[i]) filetSable(jx, PES.jarreY + 4, bouts[i][0], by - 2, t, 1.8, 1.6);
  });
  // les plateaux : quatre cordes, une coupe de bronze, le tas de sable et son poids
  [[bouts[0], C.cg], [bouts[1], C.cd]].forEach(([[px, py], charge]) => {
    const fy = py + PES.corde;
    for (const c of [-14, -5, 5, 14]) trait([[px, py], [px + c, fy]], "#c8a46e", .45);
    if (charge > 0) { const h = Math.min(10, 1.5 + charge / 6); ctx.fillStyle = "#e2c07a"; ctx.beginPath(); ctx.moveTo(px - 13, fy); ctx.quadraticCurveTo(px, fy - h * 2, px + 13, fy); ctx.fill(); }
    const gc = ctx.createLinearGradient(0, fy, 0, fy + 6); gc.addColorStop(0, "#f0c860"); gc.addColorStop(1, "#7a5a20"); ctx.fillStyle = gc;
    ctx.beginPath(); ctx.moveTo(px - 15, fy); ctx.lineTo(px + 15, fy); ctx.quadraticCurveTo(px, fy + 9, px - 15, fy); ctx.fill();
    if (E) { ctx.fillStyle = "rgba(26,16,8,.8)"; arrondi(px - 15, fy + 8, 30, 8, 2); ctx.fill(); ctx.fillStyle = "#f6dc90"; ctx.font = "bold 5.6px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(`${Math.round(charge)} deben`, px, fy + 12.2); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic"; }
  });
  // les deux clepsydres du babouin, au pied du pilier
  if (P.montre) for (const [c, sec] of [[-1, C.sg], [1, C.sd]]) { ctx.save(); ctx.translate(x + c * 31, 168); ctx.scale(1.7, 1.7); clepsydre(0, 0, sec, t); ctx.restore(); }
  // le babouin de Thot, sur le chapiteau : la star
  babouinThot(x, PES.pivot - 2, t, P, 2.1);
  // le crapaud, au premier plan, de dos : il lève les yeux
}
// une clepsydre : un vase d'albâtre gradué d'une marque par seconde, jusqu'à 10 ; l'eau baisse pendant que le sable coule
const CLEPSYDRE_MAX = 10;
function clepsydre(x, base, sec, t, max = CLEPSYDRE_MAX) {
  const h = 16, haut = base - h, lv = Math.min(1, sec / max);
  const bord = y => 4.4 - 1.8 * (y - haut) / h;
  ctx.save(); ctx.beginPath(); ctx.moveTo(x - bord(haut), haut); ctx.lineTo(x + bord(haut), haut); ctx.lineTo(x + bord(base), base); ctx.lineTo(x - bord(base), base); ctx.closePath();
  ctx.fillStyle = "#efe4cc"; ctx.fill(); ctx.clip();
  const ye = haut + 1 + (h - 1) * lv; ctx.fillStyle = degrade(ye, base, "#5aa6b8", "#2a6a80"); ctx.fillRect(x - 6, ye, 12, base - ye);
  ctx.fillStyle = "rgba(255,255,255,.5)"; ctx.fillRect(x - 6, ye, 12, .4);
  ctx.restore();
  for (let s2 = 0; s2 <= max; s2++) { const y = haut + 1 + (h - 1) * s2 / max, w = s2 % 5 ? 1 : 2; ctx.fillStyle = "#5a3a1e"; ctx.fillRect(x - bord(y), y - .15, w, .3); }
  ctx.strokeStyle = "#8a6a44"; ctx.lineWidth = .4; ctx.beginPath(); ctx.moveTo(x - bord(haut), haut); ctx.lineTo(x - bord(base), base); ctx.lineTo(x + bord(base), base); ctx.lineTo(x + bord(haut), haut); ctx.stroke();
  ctx.fillStyle = "rgba(26,16,8,.8)"; arrondi(x - 6, haut - 7, 12, 5.6, 1.6); ctx.fill();
  ctx.fillStyle = "#f0d890"; ctx.font = "bold 4.2px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  ctx.fillText(`${formatSec(sec)} s`, x, haut - 4.1); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}
const formatSec = s => (Math.floor(s * 10 + 1e-6) / 10).toFixed(1).replace(".", ",");
// LE BABOUIN DE THOT : un hamadryas assis, de face, crinière d'argent, visage rose au long museau, yeux d'ambre.
// Il attend (il se gratte, il cligne), il verse (il lève le bras vers la jarre qui coule), il exulte, il se désole.
function babouinThot(x, base, t, P, ech = 2.5) {
  const E = P.pesee, C = chargesPesee(P);
  const versG = E && !E.vide && !E.fin && C.sg < E.tg, versD = E && !E.vide && !E.fin && C.sd < E.td;
  const joie = E && E.fin, tristesse = E && E.vide;
  ctx.save(); ctx.translate(x, base + (joie ? -Math.abs(Math.sin(t / 3)) * 2 : 0)); ctx.scale(ech, ech);
  const argent = "#cfcfc0", gris = "#9e9e8e", fonce = "#6a6a5c", rose = "#e09a8a", roseF = "#b86a5e";
  // l'auréole : le disque lunaire de Thot, qui s'allume quand il travaille
  const halo = versG || versD || joie ? 1 : .35 + .1 * Math.sin(t / 20);
  const gh = ctx.createRadialGradient(0, -20, .5, 0, -20, 9); gh.addColorStop(0, `rgba(255,230,150,${.5 * halo})`); gh.addColorStop(1, "rgba(255,230,150,0)"); ctx.fillStyle = gh; ctx.fillRect(-10, -30, 20, 20);
  ctx.fillStyle = `rgba(232,192,80,${.6 + .4 * halo})`; rond(0, -22.6, 2.6); ctx.fillStyle = "rgba(255,248,220,.6)"; rond(-.6, -23.2, 1);
  ctx.strokeStyle = "#e8c050"; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(0, -21.4, 3.4, Math.PI * .15, Math.PI * .85); ctx.stroke();   // le croissant
  // la queue, qui pend du chapiteau et se balance
  ctx.strokeStyle = gris; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(3, -1); ctx.quadraticCurveTo(7, 3, 6 + Math.sin(t / 25) * 1.5, 9); ctx.stroke();
  // le corps et les jambes repliées
  ctx.fillStyle = gris; ctx.beginPath(); ctx.ellipse(0, -6, 5.2, 6.4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fonce; for (const c of [-1, 1]) { ctx.beginPath(); ctx.ellipse(c * 3.4, -2, 2.6, 2.2, c * .3, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = roseF; ovale(c * 3.8, .2, 1.6, .7); ctx.fillStyle = fonce; }
  // la cape de crinière argentée sur les épaules
  ctx.fillStyle = argent; ctx.beginPath(); ctx.moveTo(-7, -6); ctx.quadraticCurveTo(-7.4, -13, -3, -15.4); ctx.lineTo(3, -15.4); ctx.quadraticCurveTo(7.4, -13, 7, -6); ctx.quadraticCurveTo(3, -9, 0, -8.4); ctx.quadraticCurveTo(-3, -9, -7, -6); ctx.fill();
  ctx.strokeStyle = "rgba(120,120,105,.6)"; ctx.lineWidth = .2; for (let k = -6; k <= 6; k += 1.5) { ctx.beginPath(); ctx.moveTo(k * .5, -14.6); ctx.quadraticCurveTo(k * .9, -11, k * 1.05, -7.4); ctx.stroke(); }
  // les bras : au repos sur les genoux, levé vers la jarre qui coule, levés de joie, ou la main sur la tête
  const bras = (c, pose) => {
    const ep = [c * 5, -11];
    const pts = { repos: [[c * 5.6, -6], [c * 3.6, -2.6]], verse: [[c * 8, -14], [c * 10, -18]], joie: [[c * 7.6, -15], [c * 6.4, -20 + Math.sin(t / 3) * .8]], tete: [[c * 6, -15], [c * 2.4, -18.4]] }[pose];
    ctx.strokeStyle = gris; ctx.lineWidth = 1.5; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(...ep); ctx.lineTo(...pts[0]); ctx.lineTo(...pts[1]); ctx.stroke();
    ctx.fillStyle = fonce; rond(pts[1][0], pts[1][1], .9);
  };
  const pose = c => joie ? "joie" : tristesse ? (c > 0 ? "tete" : "repos") : (c < 0 ? versG : versD) ? "verse" : (c > 0 && Math.sin(t / 90) > .92 ? "tete" : "repos");
  bras(-1, pose(-1)); bras(1, pose(1));
  // la tête : la crinière, le visage rose, le long museau
  const regard = versG && !versD ? -.8 : versD && !versG ? .8 : 0;
  ctx.fillStyle = argent; ctx.beginPath(); ctx.ellipse(0, -16.6, 4.6, 4, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = rose; ctx.beginPath(); ctx.ellipse(regard * .4, -16, 2.8, 3.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = roseF; ctx.beginPath(); ctx.ellipse(regard * .6, -13.8, 1.7, 2.2, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = "#3a1a14"; rond(regard * .6 - .5, -12.6, .28); rond(regard * .6 + .5, -12.6, .28);
  trait([[regard * .6 - .9, -12], [regard * .6, -11.6 + (joie ? .4 : tristesse ? -.3 : 0)], [regard * .6 + .9, -12]], "#6a2a20", .25);
  trait([[-2.2 + regard * .3, -17.6], [2.2 + regard * .3, -17.6]], "#8a5a50", .5);             // l'arcade
  const cligne = Math.sin(t / 47) > .97;
  for (const c of [-1, 1]) { const ex = c * 1.1 + regard * .5; if (cligne) trait([[ex - .45, -16.6], [ex + .45, -16.6]], "#3a1a14", .25); else { ctx.fillStyle = "#e8a838"; rond(ex, -16.6, .55); ctx.fillStyle = "#1a0e08"; rond(ex + regard * .15, -16.6, .28); } }
  ctx.restore();
}
// le crapaud, de dos, au premier plan : on regarde la scène avec lui
function crapaudDeDos(x, base, t, P) {
  const E = P.pesee, saut = E && E.fin ? Math.abs(Math.sin(t / 4)) * 3 : 0, r = Math.sin(t / 30) * .6;
  ctx.save(); ctx.translate(x, base - saut);
  ctx.fillStyle = "rgba(0,0,0,.3)"; ovale(0, 0, 20, 3);
  const g = ctx.createRadialGradient(-5, -16, 2, 0, -8, 22); g.addColorStop(0, "#f6d870"); g.addColorStop(.6, "#d4a535"); g.addColorStop(1, "#8a6a1a");
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, -8, 19, 12 + r, 0, Math.PI, 0); ctx.lineTo(19, 0); ctx.lineTo(-19, 0); ctx.fill();
  for (const c of [-1, 1]) { ctx.fillStyle = g; rond(c * 9, -18 - r, 5.4); ctx.fillStyle = "rgba(255,248,210,.5)"; rond(c * 9 - 1.4, -20 - r, 1.6); }
  ctx.fillStyle = "rgba(120,80,20,.4)"; for (let k = 0; k < 9; k++) rond(-12 + bruit(k) * 24, -10 + bruit(k + 3) * 8, .8 + bruit(k + 5) * .8);
  ctx.restore();
}
// les trois pesées : deux débits plus grands que 10, avec un diviseur commun (pgcd > 1) ; les temps de la solution
// la plus rapide (PPCM ÷ débit) restent sous 10 s, et s'allongent d'une pesée à l'autre (≤ 4 s, puis 5 à 7 s, puis 8 à 10 s)
function problemesTemple() {
  const h = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), bornes = [[2, 4], [5, 7], [8, 10]];
  return bornes.map(([t0, t1]) => {
    for (let essai = 0; essai < 2000; essai++) {
      const g = h(11, 40), d = h(11, 40), p = pgcd(g, d);
      if (g === d || p === 1) continue;
      const tg = d / p, td = g / p, tmax = Math.max(tg, td);           // tg × g = td × d = ppcm(g, d)
      if (Math.min(tg, td) < 2 || tmax < t0 || tmax > t1) continue;
      return { g, d };
    }
    return [{ g: 12, d: 18 }, { g: 21, d: 35 }, { g: 24, d: 27 }][bornes.indexOf(bornes.find(B => B[0] === t0))];
  });
}
const ppcm = (a, b) => a * b / pgcd(a, b);
function messageTemple(texte, ok) {
  const r = $("retour"); r.className = ok ? "ok" : "aide"; r.innerHTML = texte;
  setTimeout(() => { if (r.innerHTML === texte) r.className = "vide"; }, 9000);
}
// le panneau des deux instructions du babouin
function panneauBalance(P) {
  const Q = P.pb[P.etape], enCours = !!P.pesee;
  if (!P.montre) return `<div class="programme">
    <div class="prog-intro"><b>Pesée ${P.etape + 1} sur 3.</b> Le babouin de Thot va ouvrir les deux jarres ; chacune verse du sable dans son plateau, à son propre rythme. La porte du sanctuaire ne se lève que si la balance est <b>à l'équilibre</b> : il faut autant de sable des deux côtés.</div>
    <div class="prog-actions"><button type="button" data-bal="montrer">✎ Donner les instructions</button></div>
  </div>`;
  const b = (cle, texte, off) => `<button type="button" data-bal="${cle}"${enCours || off ? " disabled" : ""}>${texte}</button>`;
  return `<div class="programme">
    <ol class="prog-liste">
      <li>Verser à gauche pendant ${b("g-", "−", P.tg <= 0)} <b>${P.tg} s</b> ${b("g+", "+", P.tg >= 10)}</li>
      <li>Verser à droite pendant ${b("d-", "−", P.td <= 0)} <b>${P.td} s</b> ${b("d+", "+", P.td >= 10)}</li>
    </ol>
    <div class="prog-actions">${b("lancer", "▶ Donner les instructions au babouin", !P.tg || !P.td)}</div>
  </div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-bal]");
  if (!b || b.disabled || !niv || niv.sorte !== "temple" || P.pesee || gardien.etat === "fini") return;
  const c = b.dataset.bal;
  if (c === "g-") P.tg = Math.max(0, P.tg - 1); else if (c === "g+") P.tg = Math.min(10, P.tg + 1);
  else if (c === "d-") P.td = Math.max(0, P.td - 1); else if (c === "d+") P.td = Math.min(10, P.td + 1);
  else if (c === "montrer") P.montre = true;
  else if (c === "lancer") { P.pesee = { tg: P.tg, td: P.td, t: 0 }; $("retour").className = "vide"; son("sable"); }
  afficherQuestion();
});
// la pesée : les jarres versent, chacune pendant son temps ; puis le verdict
function bougerTemple(P) {
  if (P.sortie) { if (++P.sortie === 70) plateauFranchi(); return; }
  const E = P.pesee;
  if (!E) return;
  const Q = P.pb[P.etape];
  if (E.vide) { if (++E.vide >= 40) { P.pesee = null; afficherQuestion(); } return; }
  if (E.fin) {
    P.porte = Math.min((P.etape + 1) / 3, P.porte + 1 / 120);
    if (++E.fin >= 60) {
      P.pesee = null; gardien.justes++; P.etape++; P.tg = P.td = 0; P.montre = false; majCompteur();
      if (gardien.justes >= 3) { gardien.etat = "fini"; P.sortie = 1; }
      afficherQuestion();
    }
    return;
  }
  E.t++;
  if (E.t % SEC_IMG === 0 && E.t / SEC_IMG <= Math.max(E.tg, E.td)) son("bois");
  if (E.t < (Math.max(E.tg, E.td) + .8) * SEC_IMG) return;
  const cg = Q.g * E.tg, cd = Q.d * E.td, m = ppcm(Q.g, Q.d);
  const calc = `À gauche : ${Q.g} × ${E.tg} = <b>${cg} deben</b> ; à droite : ${Q.d} × ${E.td} = <b>${cd} deben</b>.`;
  if (cg === cd) {
    E.fin = 1; compterReponse(true); son("bravo");
    messageTemple(`${calc} La balance est à l'équilibre : le babouin exulte, la porte se lève !${cg === m ? ` ${m} est le <b>plus petit multiple commun</b> de ${Q.g} et ${Q.d} : c'est le plus rapide.` : ` (Plus rapide encore : ${m} deben, le plus petit multiple commun de ${Q.g} et ${Q.d}.)`}`, true);
  } else {
    E.vide = 1; E.angle = anglePesee(P); compterReponse(false); son("croc");
    messageTemple(`${calc} La balance penche ${cg > cd ? "à gauche" : "à droite"} ! Le babouin vide les plateaux : recommence.`, false);
  }
  afficherQuestion();
}
function devantTemple(P, t) {
  // la poussière dorée dans la lumière ; les coins sombres
  for (let k = 0; k < 24; k++) { const x = (bruit(k + 3) * L + Math.sin(t / 70 + k) * 6), y = 20 + bruit(k + 7) * 140 + Math.cos(t / 55 + k * 2) * 4; ctx.fillStyle = `rgba(255,210,140,${.15 + .15 * Math.sin(t / 15 + k * 3)})`; rond(x, y, .5); }
  const v = ctx.createRadialGradient(L / 2, H / 2, 80, L / 2, H / 2, 170); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.5)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, L, H);
}
// ============================================================
//  PLATEAU 3 — LA SALLE DE THOT (à hauteur de crapaud)
//  Thot, le dieu à tête d'ibis, dieu du calcul et de l'écriture, trône dans sa bibliothèque. Il déroule un papyrus
//  et interroge le crapaud : la somme de deux fractions de dénominateurs différents, à donner irréductible.
//  Le babouin, son animal, est assis à ses pieds.
// ============================================================
// les quatre questions : un dénominateur multiple de l'autre ; premiers entre eux ; un diviseur commun ; un résultat à simplifier
function sommeFractions(k) {
  const h = n => Math.floor(Math.random() * n), choix = L0 => L0[h(L0.length)];
  const num = d => { const ok = []; for (let a = 1; a < d; a++) if (pgcd(a, d) === 1) ok.push(a); return choix(ok); };
  for (let essai = 0; essai < 400; essai++) {
    let b, d;
    if (k === 0) { b = choix([2, 3, 4, 5]); d = b * choix([2, 3]); }
    else if (k === 1) [b, d] = choix([[2, 3], [3, 4], [2, 5], [3, 5], [4, 5], [3, 7], [5, 6], [4, 7]]);
    else [b, d] = choix([[4, 6], [6, 8], [6, 9], [4, 10], [6, 10], [8, 12], [10, 12], [9, 12], [6, 15]]);
    if (h(2)) [b, d] = [d, b];
    const a = num(b), c = num(d), Lc = ppcm(b, d), n = a * Lc / b + c * Lc / d, g = pgcd(n, Lc);
    if (k === 3 && g === 1) continue;                    // la dernière : il faut simplifier à la fin
    if (k < 3 && g !== 1 && essai < 300) continue;       // les autres : le résultat est déjà irréductible
    return { a, b, c, d, Lc, n, g, rn: n / g, rd: Lc / g };
  }
}
const fracHTML = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
function qThot(k, P) {
  const F = sommeFractions(k);
  P.cour = F; P.res = false;
  const etapes = `Dénominateur commun : ${F.Lc} (c'est un multiple de ${F.b} et de ${F.d}). ${F.a}/${F.b} = ${F.a * F.Lc / F.b}/${F.Lc} et ${F.c}/${F.d} = ${F.c * F.Lc / F.d}/${F.Lc}, donc la somme vaut ${F.n}/${F.Lc}` + (F.g > 1 ? `, qu'on simplifie par ${F.g} : ${F.rn}/${F.rd}.` : ", et elle est déjà irréductible.");
  return qMaths(`Thot pointe son calame sur le papyrus : donne le résultat sous forme de <b>fraction irréductible</b>.`,
    F.rn / F.rd, etapes, { lire: lireFraction, a: F.rn, b: F.rd, irreductible: true, placeholder: "ta fraction" });
}
// la bibliothèque de Thot : des niches pleines de rouleaux, le plafond étoilé, deux colonnes au premier plan
function peindreThot() {
  ctx.fillStyle = degrade(0, 180, "#6a4a2e", "#2e1e10"); ctx.fillRect(0, 0, L, H);
  ctx.fillStyle = degrade(0, 16, "#122a52", "#1f4e8c"); ctx.fillRect(0, 0, L, 16);
  for (let k = 0; k < 30; k++) { const x = 4 + k * 8 + (bruit(k + 40) - .5) * 3, y = 3 + bruit(k + 42) * 9; ctx.fillStyle = "#e8c050"; ctx.beginPath(); for (let a = 0; a < 5; a++) { const an = -Math.PI / 2 + a * Math.PI * 2 / 5; ctx.lineTo(x + Math.cos(an) * 1.8, y + Math.sin(an) * 1.8); ctx.lineTo(x + Math.cos(an + Math.PI / 5) * .7, y + Math.sin(an + Math.PI / 5) * .7); } ctx.fill(); }
  for (let x = 0, k = 0; x < L; x += 4, k++) { ctx.fillStyle = ["#1f4e8c", "#b5402a", "#3a9a7a", "#d4a535"][k % 4]; ctx.fillRect(x + .4, 16, 3.2, 3.6); }
  // les niches de la bibliothèque, pleines de rouleaux de papyrus
  for (let r = 0; r < 4; r++) for (let c = 0; c < 9; c++) {
    const x = 24 + c * 22, y = 28 + r * 30;
    ctx.fillStyle = "#1e120a"; ctx.fillRect(x, y, 18, 22); ctx.fillStyle = "rgba(255,220,160,.06)"; ctx.fillRect(x, y, 18, 3);
    for (let k = 0; k < 6; k++) { const n = bruit(r * 40 + c * 6 + k); if (n < .2) continue; const ry = y + 21 - (k % 3) * 3.4 - 1.7, rx = x + 2 + Math.floor(k / 3) * 8 + bruit(k + c) * 1.5; ctx.fillStyle = n > .6 ? "#e8d4a0" : "#d4ba80"; ctx.fillRect(rx, ry - 1.5, 7, 3); ctx.fillStyle = "#a88a50"; ovale(rx + 7, ry, .8, 1.5); ctx.fillStyle = "#b5402a"; ctx.fillRect(rx + 3, ry - 1.5, .7, 3); }
  }
  for (const y of [25, 146]) { for (let x = 0, k = 0; x < L; x += 7, k++) { ctx.fillStyle = k % 2 ? "rgba(212,165,53,.55)" : "rgba(31,78,140,.55)"; ctx.fillRect(x, y, 6, 2); } }
  // le sol, tout proche, et l'estrade du trône
  ctx.fillStyle = degrade(160, 180, "#9a7a50", "#5a4028"); ctx.fillRect(0, 160, L, 20);
  ctx.strokeStyle = "rgba(20,10,4,.35)"; ctx.lineWidth = .4; for (let x = -60; x < L + 60; x += 20) { ctx.beginPath(); ctx.moveTo(120 + (x - 120) * .7, 160); ctx.lineTo(x, 180); ctx.stroke(); }
  ctx.fillStyle = degrade(156, 168, "#d8b47a", "#8a6a44"); ctx.fillRect(130, 158, 90, 10); ctx.fillStyle = "#d4a535"; ctx.fillRect(130, 158, 90, 1);
  for (let x = 134, k = 0; x < 216; x += 8, k++) { ctx.fillStyle = ["#1f4e8c", "#b5402a", "#3a9a7a"][k % 3]; ctx.fillRect(x, 162, 5, 3); }
  // le trône : un bloc décoré de plumes, au dossier bas
  ctx.fillStyle = degrade(112, 158, "#e0c48a", "#a8845a"); ctx.fillRect(160, 114, 40, 44); ctx.fillRect(196, 96, 6, 62);
  ctx.strokeStyle = "rgba(60,36,16,.5)"; ctx.lineWidth = .5; ctx.strokeRect(162, 116, 36, 40);
  for (let k = 0; k < 7; k++) { ctx.fillStyle = k % 2 ? "#1f4e8c" : "#3a9a7a"; poly([[164 + k * 5, 156], [166.5 + k * 5, 140], [169 + k * 5, 156]], k % 2 ? "#1f4e8c" : "#3a9a7a"); }
  ctx.fillStyle = "#d4a535"; ctx.fillRect(160, 113, 40, 1.6);
  colonneEgypte(8, 180, 160, 12); colonneEgypte(232, 180, 160, 12);
  ctx.fillStyle = "rgba(10,5,2,.15)"; ctx.fillRect(0, 0, L, H);
}
// THOT, assis de profil sur son trône, tourné vers le crapaud : tête d'ibis noire au long bec courbe, perruque bleue
// rayée d'or, disque lunaire et croissant, large collier, pagne blanc ; il tient sa palette de scribe et son calame.
function thot(P, t) {
  const hoche = P.nod ? Math.sin((40 - P.nod) / 40 * Math.PI * 3) * .12 : 0, secoue = P.secoue ? Math.sin(P.secoue / 2.2) * .12 : 0;
  const peau = "#8a4222", peauC = "#a85a32", bleu = "#1f4e8c", or = "#d4a535";
  // les jambes, les pieds
  ctx.fillStyle = peau; ctx.fillRect(140, 124, 6, 34); ovale(137, 158, 7, 2.2);
  // le pagne blanc sur les cuisses
  ctx.fillStyle = "#f2ead8"; poly([[186, 110], [142, 112], [140, 127], [186, 128]], "#f2ead8");
  ctx.strokeStyle = "rgba(150,130,100,.6)"; ctx.lineWidth = .35; for (let k = 0; k < 8; k++) { ctx.beginPath(); ctx.moveTo(150 + k * 4.5, 112); ctx.lineTo(146 + k * 5, 127); ctx.stroke(); }
  ctx.fillStyle = or; ctx.fillRect(143, 110.5, 43, 1.6);
  // le torse
  ctx.fillStyle = peau; poly([[163, 70], [182, 70], [186, 111], [160, 111]], peau);
  ctx.fillStyle = "rgba(255,200,150,.18)"; poly([[163, 70], [168, 70], [165, 110], [160, 110]], "rgba(255,200,150,.18)");
  // le bras arrière tient la palette de scribe ; le bras avant tient le calame et montre le papyrus
  const cal = P.res ? 0 : Math.sin(t / 9) * 1.4;
  trait([[178, 76], [182, 96], [158, 100]], peau, 5); ctx.fillStyle = "#e8d8a8"; ctx.save(); ctx.translate(150, 99); ctx.rotate(-.08); ctx.fillRect(-12, -2.6, 20, 5); ctx.fillStyle = "#1a1008"; rond(-9, 0, 1); ctx.fillStyle = "#b5402a"; rond(-6, 0, 1); ctx.fillStyle = "#c8a46e"; ctx.fillRect(-2, -1, 9, 2); ctx.restore();
  trait([[166, 76], [156, 92], [138, 84 + cal]], peauC, 4.4); ctx.fillStyle = peauC; rond(137, 84 + cal, 2.4);
  trait([[136, 86 + cal], [126, 74 + cal]], "#c8a46e", 1);                                        // le calame
  // le large collier ousekh
  for (let k = 0; k < 4; k++) { ctx.strokeStyle = [or, bleu, "#b5402a", "#3a9a7a"][k]; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.ellipse(172, 70, 10 + k * 1.7, 6 + k * 1.5, 0, 0, Math.PI); ctx.stroke(); }
  // la tête : on la fait pivoter autour du cou pour hocher (oui) ou secouer (non)
  ctx.save(); ctx.translate(172, 64); ctx.rotate(hoche + secoue); ctx.translate(-172, -64);
  // la perruque tripartite, bleue rayée d'or
  ctx.fillStyle = bleu; poly([[164, 42], [182, 42], [186, 74], [176, 76], [175, 58], [166, 58]], bleu);
  ctx.strokeStyle = or; ctx.lineWidth = .5; for (let y = 46; y < 75; y += 3) { ctx.beginPath(); ctx.moveTo(175, y); ctx.lineTo(186, y + 1); ctx.stroke(); }
  ctx.fillStyle = bleu; ctx.fillRect(166, 56, 5, 22); ctx.strokeStyle = or; for (let y = 58; y < 78; y += 3) { ctx.beginPath(); ctx.moveTo(166, y); ctx.lineTo(171, y); ctx.stroke(); }
  // la tête d'ibis, noire, et son grand bec courbe qui descend vers le papyrus
  ctx.fillStyle = "#1a1410"; ctx.beginPath(); ctx.ellipse(170, 48, 7, 6.4, -.2, 0, Math.PI * 2); ctx.fill();
  const bec = P.parle ? Math.sin(t / 2) * .6 : 0;
  ctx.strokeStyle = "#1a1410"; ctx.lineCap = "round"; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(164, 49); ctx.quadraticCurveTo(150, 48, 138, 64); ctx.stroke();
  ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(164, 51 + bec); ctx.quadraticCurveTo(151, 51 + bec, 139, 65); ctx.stroke();
  ctx.fillStyle = "#f0e6cc"; rond(167.6, 46.4, 1.3); ctx.fillStyle = "#1a1008"; const cligne = Math.sin(t / 53) > .97; if (cligne) trait([[166.4, 46.4], [168.8, 46.4]], "#1a1008", .4); else rond(167.4, 46.4, .6);
  // le disque lunaire et son croissant
  const gl = ctx.createRadialGradient(173, 30, 1, 173, 30, 16); gl.addColorStop(0, `rgba(255,236,170,${P.nod ? .6 : .3})`); gl.addColorStop(1, "rgba(255,236,170,0)"); ctx.fillStyle = gl; ctx.fillRect(155, 12, 36, 36);
  ctx.fillStyle = "#f0d070"; rond(173, 30, 7); ctx.fillStyle = "rgba(255,250,225,.6)"; rond(171, 28, 2.4);
  ctx.strokeStyle = or; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.arc(173, 31, 9, Math.PI * .15, Math.PI * .85); ctx.stroke();
  ctx.restore();
}
// le papyrus que Thot déroule : la somme à calculer, écrite en grand
function papyrusThot(P, t) {
  const F = P.cour; if (!F) return;
  const x0 = 18, y0 = 30, w = 104, h = 52;
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(x0 + 2, y0 + 3, w, h);
  ctx.fillStyle = degrade(y0, y0 + h, "#f2e2b4", "#dcc58e"); ctx.fillRect(x0, y0, w, h);
  ctx.strokeStyle = "rgba(140,110,60,.25)"; ctx.lineWidth = .3; for (let x = x0 + 4; x < x0 + w; x += 5) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y0 + h); ctx.stroke(); }
  for (const x of [x0 - 2, x0 + w - 2]) { ctx.fillStyle = degrade(y0 - 3, y0 + h + 3, "#e8d4a0", "#a88a50"); ctx.fillRect(x, y0 - 3, 4, h + 6); }
  ctx.fillStyle = "#b5402a"; ctx.fillRect(x0 + 6, y0 + 4, w - 12, .8); ctx.fillRect(x0 + 6, y0 + h - 5, w - 12, .8);
  const frac = (x, a, b, couleur = "#1a1008") => {
    ctx.fillStyle = couleur; ctx.font = "bold 13px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "alphabetic";
    ctx.fillText(String(a), x, y0 + 24); ctx.fillText(String(b), x, y0 + 41); ctx.fillRect(x - 7, y0 + 27.6, 14, 1.4);
  };
  const avecRes = P.res, xs = avecRes ? [x0 + 14, x0 + 40, x0 + 82] : [x0 + 22, x0 + 54, x0 + 86];
  frac(xs[0], F.a, F.b); ctx.font = "bold 13px Georgia, serif"; ctx.fillText("+", (xs[0] + xs[1]) / 2, y0 + 32); frac(xs[1], F.c, F.d);
  ctx.fillText("=", (xs[1] + xs[2]) / 2 + (avecRes ? -4 : 0), y0 + 32);
  if (avecRes) frac(xs[2] - 4, F.rn, F.rd, "#2a7a3a"); else { ctx.fillStyle = "#b5402a"; ctx.fillText("?", xs[2], y0 + 33 + Math.sin(t / 8)); }
  ctx.textAlign = "left";
}
function decorThot(P, t) {
  ctx.drawImage(fondPeint("thot", peindreThot), 0, 0, L, H);
  // la lumière qui tombe sur le trône
  const g = ctx.createRadialGradient(170, 70, 6, 170, 80, 90); g.addColorStop(0, "rgba(255,226,160,.22)"); g.addColorStop(1, "rgba(255,226,160,0)"); ctx.fillStyle = g; ctx.fillRect(60, 0, 180, 170);
  papyrusThot(P, t);
  thot(P, t);
  // le babouin, assis aux pieds de son maître : il applaudit quand c'est juste
  ctx.save(); ctx.translate(112, 166); ctx.scale(.5, .5); babouinThot(0, 0, t, { pb: [{ g: 0, d: 0 }], etape: 0, pesee: P.nod ? { fin: 1 } : P.secoue ? { vide: 1 } : null }); ctx.restore();
}
function devantThot(P, t) {
  for (let k = 0; k < 22; k++) { const x = (bruit(k + 13) * L + Math.sin(t / 70 + k) * 6), y = 20 + bruit(k + 17) * 140 + Math.cos(t / 55 + k * 2) * 4; ctx.fillStyle = `rgba(255,210,140,${.12 + .14 * Math.sin(t / 15 + k * 3)})`; rond(x, y, .5); }
  const v = ctx.createRadialGradient(L / 2, H / 2, 80, L / 2, H / 2, 170); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.5)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, L, H);
}
// ============================================================
//  PLATEAU 4 — LE SANCTUAIRE DU SOLEIL (vu de dessus)
//  Un rayon de Rê entre par une fente du mur : on le voit en permanence, il rebondit sur les miroirs de bronze.
//  Le scarabée de Khépri, compagnon de passage, vole de miroir en miroir et les tourne selon les instructions du
//  crapaud : un sens (gauche ou droite) et un angle, de 5° en 5°. Le rayon doit atteindre la statue du pharaon.
//  La symétrie axiale : le rayon renvoyé est le symétrique du rayon qui arrive, par rapport à la perpendiculaire au miroir.
//  Chaque salle n'a qu'une seule solution (vérifié pour toutes les rotations de -90° à 90°).
// ============================================================
const CASE = 12;
const versAngle = a => [Math.cos(a * Math.PI / 180), -Math.sin(a * Math.PI / 180)];      // les angles en degrés, comptés vers la gauche
const SANCT = { x0: 12, y0: 12, x1: 228, y1: 168 }, DEMI_MIROIR = 7, R_PILIER = 5.6, R_STATUE = 6.5;
// le rayon part toujours du même point A, vers le haut (0°, comme dans Scratch) : c'est la référence. Le trajet A B (C) jusqu'au pharaon est
// donné sur la figure avec ses angles (ABC, puis BCD). On donne au scarabée l'orientation de chaque miroir, comme dans Scratch.
const FENTE = [114, 168];                                           // en bas, au milieu : le rayon entre vers le haut (0°)
// chaque partie tire ses trois salles : un miroir B au-dessus de A, un angle ABC (droit, puis obtus, puis aigu), un virage à
// gauche ou à droite, le pharaon au bout du rayon renvoyé ; on vérifie qu'une seule
// orientation (à l'opposée près) envoie le rayon sur la statue
const ANGLES_SALLE = [[90], [100, 110, 120, 130, 140], [40, 50, 60, 70, 80]];
function genererSalle(k) {
  const h = (a, b) => a + Math.random() * (b - a), choix = L0 => L0[Math.floor(Math.random() * L0.length)];
  const prochesDe = (P0, A0, B0, r) => { const [px, py] = P0, [ax, ay] = A0, [bx, by] = B0, dx = bx - ax, dy = by - ay, u = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy))); return Math.hypot(ax + u * dx - px, ay + u * dy - py) < r; };
  for (let essai = 0; essai < 500; essai++) {
    const ABC = choix(ANGLES_SALLE[k]), theta = (180 - ABC) / 2, tour = Math.random() < .5 ? -1 : 1, sortie = tour * 2 * theta;
    const B = [FENTE[0], Math.round(h(40, 110))], dist = h(60, 120), D = [B[0] + Math.sin(sortie * Math.PI / 180) * dist, B[1] - Math.cos(sortie * Math.PI / 180) * dist];
    if (D[0] < 26 || D[0] > 214 || D[1] < 24 || D[1] > 150 || Math.hypot(D[0] - 26, D[1] - 26) < 24) continue;
    const piliers = [];                                                // pas de piliers : la salle reste dégagée
    let init = theta; while (init === theta) init = 5 * Math.round(h(3, 15));
    const S = { fente: FENTE, dir: 90, miroirs: [B], tours: [tour], sol: [theta], init: [init], statue: D, piliers };
    const bonnes = []; for (let o = 0; o < 180; o += 5) if (tracerRayon(S, [depuisScratch(o)]).ok) bonnes.push(o);
    if (bonnes.length === 1 && !tracerRayon(S, orientationsMiroirs(S, S.init)).ok) return S;
  }
  return { fente: FENTE, dir: 90, miroirs: [[114, 54]], tours: [1], sol: [45], init: [30], statue: [162, 54], piliers: [] };
}
// un seul miroir par salle ; la perpendiculaire au miroir est la bissectrice de l'angle ABC.
function tracerRayon(S, ang) {
  let [px, py] = S.fente, [dx, dy] = versAngle(S.dir); const pts = [[px, py]];
  const cercle = ([cx, cy], r) => { const fx = px - cx, fy = py - cy, b = fx * dx + fy * dy, c = fx * fx + fy * fy - r * r, D = b * b - c; if (D < 0) return Infinity; const t = -b - Math.sqrt(D); return t > .01 ? t : Infinity; };
  for (let n = 0; n < 12; n++) {
    let best = Infinity, quoi = null, k0 = -1;
    S.miroirs.forEach(([mx, my], k) => {
      const [ux, uy] = versAngle(ang[k]), den = dx * uy - dy * ux; if (Math.abs(den) < 1e-9) return;
      const t = ((mx - px) * uy - (my - py) * ux) / den, sm = ((mx - px) * dy - (my - py) * dx) / den;
      if (t > .01 && Math.abs(sm) <= DEMI_MIROIR && t < best) { best = t; quoi = "miroir"; k0 = k; }
    });
    for (const Pq of S.piliers) { const t = cercle(Pq, R_PILIER); if (t < best) { best = t; quoi = "pilier"; } }
    { const t = cercle(S.statue, R_STATUE); if (t < best) { best = t; quoi = "statue"; } }
    const tm = Math.min(dx > 1e-9 ? (SANCT.x1 - px) / dx : dx < -1e-9 ? (SANCT.x0 - px) / dx : Infinity, dy > 1e-9 ? (SANCT.y1 - py) / dy : dy < -1e-9 ? (SANCT.y0 - py) / dy : Infinity);
    if (tm < best) { best = tm; quoi = "mur"; }
    px += dx * best; py += dy * best; pts.push([px, py]);
    if (quoi !== "miroir") return { pts, ok: quoi === "statue" };
    const [ux, uy] = versAngle(ang[k0]), q = dx * ux + dy * uy; [dx, dy] = [2 * q * ux - dx, 2 * q * uy - dy];   // le symétrique, par rapport à la perpendiculaire
  }
  return { pts, ok: false };
}
// les directions du trajet prévu (en degrés, 0° vers le haut, 90° vers la droite) ; un miroir qui fait l'angle t avec le
// rayon qui arrive (direction a) est orienté selon a ± t, du côté où le trajet tourne
function directionsPrevues(S) { const d = [0]; S.sol.forEach((t, k) => d.push(d[k] + S.tours[k] * 2 * t)); return d; }
function orientationsMiroirs(S, angles) { const d = directionsPrevues(S); return angles.map((t, k) => 90 - (d[k] + S.tours[k] * t)); }
// l'orientation « à la Scratch » d'un miroir : là où pointe son ombelle ; 0° vers le haut, 90° vers la droite, de -175° à 180°
const versScratch = a => { const v = ((90 - Math.round(a)) % 360 + 360) % 360; return v > 180 ? v - 360 : v; }, depuisScratch = o => 90 - o;
function nouvelleSalle(S) { const or = orientationsMiroirs(S, S.init); return { or, ins: or.map(versScratch) }; }
// le sanctuaire vu d'en haut : dalles de grès, murs épais gravés ton sur ton, la fente lumineuse, la niche de la statue
function peindreSanctuaire() {
  ctx.fillStyle = "#2a1a0e"; ctx.fillRect(0, 0, L, H);
  ctx.fillStyle = degrade(12, 168, "#d2b07a", "#c09a64"); ctx.fillRect(CASE, CASE, L - 2 * CASE, H - 2 * CASE);       // un sol de grès uni
  for (let k = 0; k < 70; k++) { ctx.fillStyle = `rgba(${bruit(k + 70) > .5 ? "255,236,200" : "90,60,30"},.06)`; ovale(CASE + bruit(k + 71) * (L - 2 * CASE), CASE + bruit(k + 72) * (H - 2 * CASE), 6 + bruit(k + 73) * 14, 3 + bruit(k + 74) * 6); }
  // les murs, gravés ton sur ton
  ctx.fillStyle = degrade(0, 180, "#8a6a44", "#6a4a2e");
  ctx.fillRect(0, 0, L, CASE); ctx.fillRect(0, H - CASE * 1, L, CASE); ctx.fillRect(0, 0, CASE, H); ctx.fillRect(L - CASE, 0, CASE, H);
  for (let x = 3; x < L; x += 7) for (const y of [6, H - 6]) hieroglyphe(x, y, .9, Math.floor(bruit(x + y) * 9), "rgba(40,22,8,.22)");
  for (let y = 18; y < H - 12; y += 7) for (const x of [6, L - 6]) hieroglyphe(x, y, .9, Math.floor(bruit(x * 3 + y) * 9), "rgba(40,22,8,.22)");
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(CASE, CASE, L - 2 * CASE, 2); ctx.fillRect(CASE, CASE, 2, H - 2 * CASE);
}
function piliersDessus(S) {
  for (const [x, y] of S.piliers) {
    ctx.fillStyle = "rgba(0,0,0,.3)"; rond(x + 2, y + 2, 5.6);
    ctx.fillStyle = "#3a8a6a"; rond(x, y, 5.6); ctx.fillStyle = "#e0c48a"; rond(x, y, 4.4);
    ctx.strokeStyle = "#1f4e8c"; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(x, y, 3.2, 0, 7); ctx.stroke(); ctx.fillStyle = "#d4a535"; rond(x, y, 1.2);
  }
}
// la statue du pharaon, vue d'en haut : coiffe némès rayée bleu et or, épaules dorées
// le médaillon d'or du pharaon : un disque solaire rouge cerclé de lapis, entre deux ailes ; il s'embrase dans la lumière
function medaillon(x, y, r, lumiere, t) {
  if (lumiere) { const g = ctx.createRadialGradient(x, y, .5, x, y, r * 6); g.addColorStop(0, `rgba(255,244,190,${.9 + .1 * Math.sin(t / 4)})`); g.addColorStop(1, "rgba(255,236,170,0)"); ctx.fillStyle = g; ctx.fillRect(x - r * 6, y - r * 6, r * 12, r * 12); }
  for (const c of [-1, 1]) poly([[x + c * r * .8, y - r * .2], [x + c * r * 2.2, y - r * .7], [x + c * r * 2, y + r * .1], [x + c * r * .8, y + r * .4]], lumiere ? "#2a6ac8" : "#1f4e8c");   // les ailes
  ctx.fillStyle = lumiere ? "#ffe680" : "#c8a046"; rond(x, y, r);
  ctx.fillStyle = "#1f4e8c"; rond(x, y, r * .72); ctx.fillStyle = lumiere ? "#ff5a3a" : "#b5402a"; rond(x, y, r * .5);
  ctx.fillStyle = "rgba(255,255,255,.6)"; rond(x - r * .25, y - r * .25, r * .18);
  if (lumiere) { ctx.strokeStyle = `rgba(255,250,220,${.6 + .3 * Math.sin(t / 3)})`; ctx.lineWidth = .4; for (let a = 0; a < 8; a++) { const an = a * Math.PI / 4 + t / 40; ctx.beginPath(); ctx.moveTo(x + Math.cos(an) * r * 1.4, y + Math.sin(an) * r * 1.4); ctx.lineTo(x + Math.cos(an) * r * (a % 2 ? 2.6 : 3.6), y + Math.sin(an) * r * (a % 2 ? 2.6 : 3.6)); ctx.stroke(); } }
}
// la statue, vue d'en haut, tournée face au miroir d'où vient la lumière (angle « face ») ; son médaillon est sur ses genoux
function statueDessus([x, y], eclairee, t, face = Math.PI / 2) {
  if (eclairee) { const g = ctx.createRadialGradient(x, y, 2, x, y, 30); g.addColorStop(0, `rgba(255,236,160,${.6 + .1 * Math.sin(t / 5)})`); g.addColorStop(1, "rgba(255,236,160,0)"); ctx.fillStyle = g; ctx.fillRect(x - 30, y - 30, 60, 60); }
  ctx.save(); ctx.translate(x, y); ctx.rotate(face - Math.PI / 2);
  ctx.fillStyle = "rgba(0,0,0,.3)"; ctx.fillRect(-6, -5, 14, 13);
  ctx.fillStyle = "#8a6a44"; ctx.fillRect(-7, -6, 14, 12);
  const or = eclairee ? "#f6d870" : "#c8a046";
  ctx.fillStyle = or; ovale(0, 1, 5.4, 3.4);                                         // les épaules
  ctx.fillStyle = eclairee ? "#2a6ac8" : "#1f4e8c"; rond(0, -1, 3.4);                  // le némès
  ctx.strokeStyle = or; ctx.lineWidth = .5; for (let a = 0; a < 8; a++) { ctx.beginPath(); ctx.moveTo(0, -1); ctx.lineTo(Math.cos(a * .785) * 3.4, -1 + Math.sin(a * .785) * 3.4); ctx.stroke(); }
  ctx.fillStyle = or; rond(0, -1, 1.2);
  medaillon(0, 3.6, 1.3, eclairee, t);                                                  // sur les genoux, du côté du miroir
  ctx.restore();
}
// un miroir de bronze sur son socle, avec son numéro
// le miroir de bronze, vu d'en haut : une lame polie, et à un bout l'ombelle de papyrus de son manche ; l'ombelle montre
// vers où le miroir est orienté (comme la flèche d'un lutin Scratch)
function miroirDessus(x, y, ang) {
  const [ux, uy] = versAngle(ang), D = DEMI_MIROIR;
  ctx.fillStyle = "rgba(0,0,0,.3)"; rond(x + 1.5, y + 1.5, 4.4); ctx.fillStyle = "#5a3a1e"; rond(x, y, 4.4);
  ctx.lineCap = "round"; trait([[x - ux * D, y - uy * D], [x + ux * D, y + uy * D]], "#7a5a1a", 2.6); trait([[x - ux * (D - .4), y - uy * (D - .4)], [x + ux * (D - .4), y + uy * (D - .4)]], "#f0d070", 1.4);
  const hx = x + ux * (D + 1.2), hy = y + uy * (D + 1.2);                                        // l'ombelle de papyrus, au bout qui « pointe »
  poly([[hx - ux * 1.6, hy - uy * 1.6], [hx + ux * 2.8 - uy * 2.6, hy + uy * 2.8 + ux * 2.6], [hx + ux * 2.8 + uy * 2.6, hy + uy * 2.8 - ux * 2.6]], "#3a9a6a");
  ctx.fillStyle = "#d4a535"; rond(hx - ux * 1.2, hy - uy * 1.2, .9);
}
// le scarabée de Khépri, vu d'en haut : élytres bleu-vert métallique, tête dentée ; il vole (ailes ouvertes) ou marche
function scarabee(x, y, ang, t, vole) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(.9, .9);
  ctx.fillStyle = "rgba(0,0,0,.25)"; ovale(1.5, 2, 4.4, 3.2);
  if (vole) { const b = Math.sin(t * 1.6) * .6; ctx.fillStyle = "rgba(220,235,255,.45)"; for (const c of [-1, 1]) { ctx.save(); ctx.rotate(c * (.9 + b)); ovale(-3, c * 3, 4.6, 1.6); ctx.restore(); } }
  else { ctx.strokeStyle = "#1a2a2a"; ctx.lineWidth = .5; for (const c of [-1, 1]) for (let k = -1; k <= 1; k++) { const p = Math.sin(t / 3 + k + c) * .6; ctx.beginPath(); ctx.moveTo(k * 1.6, c * 1.6); ctx.lineTo(k * 1.8 + p, c * 4.2); ctx.stroke(); } }
  const g = ctx.createLinearGradient(-3, -3, 3, 3); g.addColorStop(0, "#5ad0b0"); g.addColorStop(.5, "#1f6a7a"); g.addColorStop(1, "#103a4a");
  ctx.fillStyle = g; ovale(-.6, 0, 3.6, 2.8);
  trait([[-3.8, 0], [2.4, 0]], "rgba(10,30,30,.7)", .3);
  ctx.fillStyle = "#1a3a3a"; ovale(3.2, 0, 1.6, 2); ctx.fillStyle = "#2a5a5a"; for (let k = -1; k <= 1; k++) rond(4.6, k * .9, .45);   // la tête dentée
  ctx.fillStyle = "rgba(255,255,255,.4)"; ovale(-1.4, -1, 1.4, .6);
  ctx.restore();
}
// L'ENTRÉE DU SANCTUAIRE, à hauteur de crapaud : au fond, la statue colossale du pharaon, assise, dans l'ombre ;
// le rayon de Rê entre par la fente du mur, à l'horizontale ; un miroir de bronze le renvoie sur le médaillon du pharaon. On comprend la salle
// avant de la voir d'en haut.
function pharaonColosse(x) {
  const pierre = "#d8b47a", ombre = "#a8845a", bleu = "#1f4e8c", or = "#d4a535";
  // le trône
  ctx.fillStyle = degrade(92, 162, ombre, "#7a5a3a"); ctx.fillRect(x - 38, 92, 76, 70);
  ctx.strokeStyle = "rgba(60,36,16,.4)"; ctx.lineWidth = .5; ctx.strokeRect(x - 35, 95, 70, 64);
  for (let r = 0; r < 7; r++) for (const c of [-30, 30]) hieroglyphe(x + c, 102 + r * 8, 1.2, r * 3 + (c > 0 ? 1 : 0), "rgba(60,36,16,.25)");
  // les jambes et les pieds
  ctx.fillStyle = degrade(120, 160, pierre, ombre); ctx.fillRect(x - 18, 122, 12, 36); ctx.fillRect(x + 6, 122, 12, 36);
  ctx.fillStyle = pierre; ctx.fillRect(x - 20, 156, 15, 6); ctx.fillRect(x + 5, 156, 15, 6);
  // le pagne plissé et sa ceinture d'or
  poly([[x - 20, 98], [x + 20, 98], [x + 25, 124], [x - 25, 124]], "#efe2c0");
  ctx.strokeStyle = "rgba(150,120,80,.5)"; ctx.lineWidth = .4; for (let k = -4; k <= 4; k++) { ctx.beginPath(); ctx.moveTo(x + k * 4, 101); ctx.lineTo(x + k * 5.2, 124); ctx.stroke(); }
  poly([[x - 4, 101], [x + 4, 101], [x + 6, 124], [x - 6, 124]], or);
  ctx.fillStyle = or; ctx.fillRect(x - 21, 96, 42, 4);
  // le torse, les bras posés sur les genoux
  ctx.fillStyle = degrade(62, 100, pierre, ombre); poly([[x - 28, 64], [x + 28, 64], [x + 20, 99], [x - 20, 99]], pierre);
  ctx.fillStyle = "rgba(90,60,30,.15)"; poly([[x + 6, 64], [x + 28, 64], [x + 20, 99], [x + 4, 99]], "rgba(90,60,30,.15)");
  ctx.lineCap = "round"; trait([[x - 27, 68], [x - 30, 96], [x - 14, 120]], pierre, 8); trait([[x + 27, 68], [x + 30, 96], [x + 14, 120]], ombre, 8);
  ctx.fillStyle = pierre; ovale(x - 12, 121, 5, 3.4); ctx.fillStyle = ombre; ovale(x + 12, 121, 5, 3.4);
  // le grand collier
  for (let k = 0; k < 4; k++) { ctx.strokeStyle = [or, bleu, "#b5402a", "#3a9a7a"][k]; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(x, 62, 12 + k * 2.4, 7 + k * 2.2, 0, 0, Math.PI); ctx.stroke(); }
  // la tête : le némès rayé bleu et or, le visage, la barbe postiche, le cobra sur le front
  poly([[x - 13, 30], [x + 13, 30], [x + 17, 44], [x + 14, 74], [x + 8, 74], [x + 8, 54], [x - 8, 54], [x - 8, 74], [x - 14, 74], [x - 17, 44]], bleu);
  ctx.strokeStyle = or; ctx.lineWidth = 1.1; for (let y = 34; y < 74; y += 3.4) { ctx.beginPath(); ctx.moveTo(x - 17, y); ctx.lineTo(x - 8, y); ctx.moveTo(x + 8, y); ctx.lineTo(x + 17, y); ctx.stroke(); }
  ctx.fillStyle = pierre; ctx.beginPath(); ctx.ellipse(x, 46, 8, 10, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = or; ctx.fillRect(x - 9, 34, 18, 2);
  ctx.fillStyle = "#1a1008"; for (const c of [-1, 1]) { ctx.beginPath(); ctx.ellipse(x + c * 3.4, 44, 2, 1, 0, 0, Math.PI * 2); ctx.fill(); trait([[x + c * 5.4, 44], [x + c * 7.4, 45]], "#1a1008", .6); }
  trait([[x, 45], [x, 50]], ombre, .8); trait([[x - 2.4, 53], [x + 2.4, 53]], "#7a4a2a", .8);
  ctx.fillStyle = bleu; ctx.fillRect(x - 2.4, 56, 4.8, 11); ctx.strokeStyle = or; ctx.lineWidth = .4; for (let y = 58; y < 67; y += 2) { ctx.beginPath(); ctx.moveTo(x - 2.4, y); ctx.lineTo(x + 2.4, y); ctx.stroke(); }
  ctx.fillStyle = or; ovale(x, 32, 1.6, 2.6); ctx.fillStyle = "#b5402a"; rond(x, 30.6, .8);
}
function miroirSurPied(x, y, sol = 162, e = 1) {
  ctx.save(); ctx.translate(x, sol); ctx.scale(e, e); ctx.translate(-x, -sol); y = sol - (sol - y) / 1;
  trait([[x, y + 8], [x, sol]], "#8a6a2a", 1.6); ctx.fillStyle = "#3a8a6a"; poly([[x - 4, y + 8], [x + 4, y + 8], [x, y + 14]], "#3a8a6a");   // le manche en ombelle de papyrus
  ctx.fillStyle = "#6a4a1e"; ovale(x, sol + 1, 6, 1.6);
  const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 8); g.addColorStop(0, "#fff0b0"); g.addColorStop(.5, "#e0b04a"); g.addColorStop(1, "#8a5a1a");
  ctx.fillStyle = g; ovale(x, y, 6.4, 7.6);
  ctx.restore();
}
// l'entrée du sanctuaire, en perspective à un point de fuite : un point du monde (X, Y) à la profondeur z s'affiche en
// (fuite.x + X / z, fuite.y + Y / z). Murs en X = ±110, sol en Y = 40 (on est à hauteur de crapaud), plafond en Y = -140 ; le fond en z = 1/0.36.
const FUITE = { x: 120, y: 140 }, SALLE3D = { mur: 110, sol: 40, plafond: -140, fond: .36 };      // les yeux du crapaud : tout près du sol
const proj = (X, Y, s) => [FUITE.x + X * s, FUITE.y + Y * s];       // s = 1 / profondeur
const NICHE = (() => { const f = SALLE3D.fond; const [x0, y0] = proj(-SALLE3D.mur, SALLE3D.plafond, f), [x1, y1] = proj(SALLE3D.mur, SALLE3D.sol, f); return { x0, y0, x1, y1 }; })();
function peindreSanctuaireFace() {
  const N = NICHE, M = SALLE3D, sp = 1.25;                       // sp : un peu devant l'écran, pour que tout déborde du cadre
  ctx.fillStyle = "#1a1008"; ctx.fillRect(0, 0, L, H);
  // le plafond : la nuit de lapis semée d'étoiles
  ctx.fillStyle = degrade(0, N.y0, "#1f4e8c", "#0c1a30"); poly([proj(-M.mur, M.plafond, sp), proj(M.mur, M.plafond, sp), [N.x1, N.y0], [N.x0, N.y0]], ctx.fillStyle);
  for (let k = 0; k < 50; k++) { const sv = M.fond + (sp - M.fond) * bruit(k + 300) ** .6, [x, y] = proj(-M.mur + 2 * M.mur * bruit(k + 301), M.plafond, sv), r = 1.8 * sv;
    ctx.fillStyle = "#e8c050"; ctx.beginPath(); for (let a2 = 0; a2 < 5; a2++) { const an = -Math.PI / 2 + a2 * Math.PI * 2 / 5; ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.lineTo(x + Math.cos(an + Math.PI / 5) * r * .4, y + Math.sin(an + Math.PI / 5) * r * .4); } ctx.fill(); }
  // les deux murs, gravés ton sur ton : registres et joints, tous vers le point de fuite
  for (const c of [-1, 1]) {
    const X = c * M.mur, g = ctx.createLinearGradient(c < 0 ? 0 : L, 0, c < 0 ? N.x0 : N.x1, 0); g.addColorStop(0, "#5a3e24"); g.addColorStop(1, "#8a6844");
    ctx.fillStyle = g; poly([proj(X, M.plafond, sp), proj(X, M.plafond, M.fond), proj(X, M.sol, M.fond), proj(X, M.sol, sp)], g);
    ctx.strokeStyle = "rgba(30,16,6,.35)"; ctx.lineWidth = .5;
    for (let Y = M.plafond + 14; Y < M.sol; Y += 15) { ctx.beginPath(); ctx.moveTo(...proj(X, Y, sp)); ctx.lineTo(...proj(X, Y, M.fond)); ctx.stroke(); }
    for (let z = 1 / sp; z < 1 / M.fond; z += .18) { ctx.beginPath(); ctx.moveTo(...proj(X, M.plafond + 14, 1 / z)); ctx.lineTo(...proj(X, M.sol, 1 / z)); ctx.stroke(); }
    for (let k = 0; k < 130; k++) { const sv = M.fond + (sp - M.fond) * bruit(k + 400 + (c > 0 ? 200 : 0)), Y = M.plafond + 20 + (M.sol - M.plafond - 24) * bruit(k + 401 + (c > 0 ? 200 : 0)), [x, y] = proj(X, Y, sv); hieroglyphe(x, y, 1.2 * sv, k, "rgba(30,16,6,.28)"); }
  }
  // le sol de grès : joints vers le point de fuite, et rangées de dalles de plus en plus serrées
  const gs = ctx.createLinearGradient(0, N.y1, 0, H); gs.addColorStop(0, "#5a4028"); gs.addColorStop(1, "#a8845a");
  poly([proj(-M.mur, M.sol, sp), proj(-M.mur, M.sol, M.fond), proj(M.mur, M.sol, M.fond), proj(M.mur, M.sol, sp)], gs);
  ctx.strokeStyle = "rgba(30,16,6,.25)"; ctx.lineWidth = .4;
  for (let X = -M.mur; X <= M.mur + .1; X += M.mur / 5) { ctx.beginPath(); ctx.moveTo(...proj(X, M.sol, M.fond)); ctx.lineTo(...proj(X, M.sol, sp)); ctx.stroke(); }
  for (let z = 1 / sp; z < 1 / M.fond; z += .25) { ctx.beginPath(); ctx.moveTo(...proj(-M.mur, M.sol, 1 / z)); ctx.lineTo(...proj(M.mur, M.sol, 1 / z)); ctx.stroke(); }
  // le fond : la niche et le pharaon colossal, dans la pénombre
  ctx.fillStyle = degrade(N.y0, N.y1, "#3a2616", "#2a1a0e"); ctx.fillRect(N.x0, N.y0, N.x1 - N.x0, N.y1 - N.y0);
  const ech = (N.y1 - N.y0) * .92 / 132;
  ctx.save(); ctx.translate(120, N.y1); ctx.scale(ech, ech); ctx.translate(-120, -162); pharaonColosse(120); ctx.restore();
  ctx.fillStyle = "rgba(14,8,3,.38)"; ctx.fillRect(N.x0, N.y0, N.x1 - N.x0, N.y1 - N.y0);                  // il attend la lumière, dans la pénombre
  ctx.fillStyle = "#c8a46e"; ctx.fillRect(N.x0, N.y0, N.x1 - N.x0, 3); ctx.fillStyle = "#d4a535"; ctx.fillRect(N.x0, N.y0 + 2.4, N.x1 - N.x0, .6);
  // les rangées de colonnes, de la plus lointaine à la plus proche (X = ±92, du sol jusque sous le plafond)
  for (const sv of [.44, .58, .78, 1.05]) for (const c of [-1, 1]) {
    const [x, base] = proj(c * 92, M.sol, sv), h = (M.sol - M.plafond - 14) * sv, w = 14 * sv;
    colonneEgypte(x, base, h, w);
    ctx.fillStyle = `rgba(12,6,2,${.5 * (1 - sv)})`; ctx.fillRect(x - w * 1.2, base - h - w * 1.4, w * 2.4, h + w * 1.4);
  }
  const v = ctx.createRadialGradient(120, 100, 30, 120, 100, 170); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(8,4,0,.55)"); ctx.fillStyle = v; ctx.fillRect(0, 0, L, H);
}
function decorSoleilFace(P, t) {
  ctx.drawImage(fondPeint("sanctuaireFace", peindreSanctuaireFace), 0, 0, L, H);
  // le rayon de Rê entre par une fente du mur de gauche, à l'horizontale, à hauteur de poitrine du pharaon, jusqu'au miroir ;
  // le miroir le renvoie, toujours à l'horizontale, en biais vers le fond, sur le médaillon au centre du torse
  const ech = (NICHE.y1 - NICHE.y0) * .92 / 132, med = [120, NICHE.y1 - (162 - 86) * ech];       // le médaillon, au centre du torse
  const Yp = (med[1] - FUITE.y) / SALLE3D.fond, sM = .86, m1 = proj(-66, Yp, sM);                  // la hauteur de la poitrine, et le miroir à cette hauteur
  const fente = proj(-SALLE3D.mur, Yp, sM);
  const g = ctx.createRadialGradient(...fente, 1, ...fente, 26); g.addColorStop(0, "rgba(255,236,170,.85)"); g.addColorStop(1, "rgba(255,236,170,0)"); ctx.fillStyle = g; ctx.fillRect(fente[0] - 26, fente[1] - 26, 52, 52);
  for (const [ep, coul] of [[7, "rgba(255,220,120,.2)"], [2.6, "rgba(255,236,170,.75)"], [1, "#fffaf0"]]) { ctx.strokeStyle = coul; ctx.lineWidth = ep; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(0, m1[1]); ctx.lineTo(m1[0] - 6, m1[1]); ctx.stroke(); }
  for (let k = 0; k < 14; k++) { const u = ((t * .008 + bruit(k)) % 1); ctx.fillStyle = "rgba(255,236,190,.55)"; rond((m1[0] - 6) * u, m1[1] + Math.sin(t / 17 + k * 2) * 2.6, .5); }
  // le rayon réfléchi : il s'éloigne, s'affine, et descend vers l'horizon puisqu'il passe au-dessus de nos yeux
  const dep = [m1[0] + 4, m1[1] + 1];
  for (const [e0, e1, coul] of [[6, 2.4, "rgba(255,220,120,.2)"], [2.6, 1, "rgba(255,236,170,.75)"], [1, .4, "#fffaf0"]]) {
    const dx = med[0] - dep[0], dy = med[1] - dep[1], l = Math.hypot(dx, dy), nx = -dy / l, ny = dx / l;
    poly([[dep[0] + nx * e0 / 2, dep[1] + ny * e0 / 2], [med[0] + nx * e1 / 2, med[1] + ny * e1 / 2], [med[0] - nx * e1 / 2, med[1] - ny * e1 / 2], [dep[0] - nx * e0 / 2, dep[1] - ny * e0 / 2]], coul);
  }
  const gf = ctx.createRadialGradient(...med, 1, ...med, 22); gf.addColorStop(0, `rgba(255,236,170,${.55 + .1 * Math.sin(t / 5)})`); gf.addColorStop(1, "rgba(255,236,170,0)"); ctx.fillStyle = gf; ctx.fillRect(med[0] - 22, med[1] - 22, 44, 44);
  medaillon(...med, 2.8, true, t);
  miroirSurPied(...m1, proj(-66, SALLE3D.sol, sM)[1]);
  const gm = ctx.createRadialGradient(m1[0], m1[1], 1, m1[0], m1[1], 16); gm.addColorStop(0, `rgba(255,244,200,${.7 + .1 * Math.sin(t / 6)})`); gm.addColorStop(1, "rgba(255,244,200,0)"); ctx.fillStyle = gm; ctx.fillRect(m1[0] - 16, m1[1] - 16, 32, 32);
  // une lueur sur le visage du pharaon, au fond, qui attend la lumière
  const yv = NICHE.y1 - (162 - 46) * (NICHE.y1 - NICHE.y0) * .92 / 132, gp = ctx.createRadialGradient(120, yv, 1, 120, yv, 14); gp.addColorStop(0, `rgba(255,220,150,${.22 + .06 * Math.sin(t / 30)})`); gp.addColorStop(1, "rgba(255,220,150,0)"); ctx.fillStyle = gp; ctx.fillRect(100, yv - 20, 40, 40);
  // le scarabée, qui vole devant nous
  scarabee(196 + Math.cos(t / 22) * 10, 140 + Math.sin(t / 22) * 5, t / 22 + Math.PI / 2, t, true);
}
// la figure : le trajet A B (C) jusqu'au pharaon, en pointillés, avec les lettres et les arcs des angles donnés
function figureTrajet(S) {
  const pts = [S.fente, ...S.miroirs, S.statue], dirs = directionsPrevues(S), noms = "ABCD";
  const vers = d => [Math.sin(d * Math.PI / 180), -Math.cos(d * Math.PI / 180)];
  for (let i = 0; i < pts.length - 1; i++) {
    const [x0, y0] = pts[i], [x1, y1] = pts[i + 1], long = Math.hypot(x1 - x0, y1 - y0), [ux, uy] = vers(dirs[i]);
    ctx.setLineDash([2, 1.6]); trait([[x0 + ux * 4, y0 + uy * 4], [x0 + ux * (long - 7), y0 + uy * (long - 7)]], "rgba(255,248,220,.9)", .6); ctx.setLineDash([]);
    const xb = x0 + ux * (long - 7), yb = y0 + uy * (long - 7); poly([[xb + ux * 2.4, yb + uy * 2.4], [xb - uy * 1.4, yb + ux * 1.4], [xb + uy * 1.4, yb - ux * 1.4]], "rgba(255,248,220,.95)");
  }
  // les arcs : en chaque miroir, l'angle entre le rayon qui arrive (vers le point d'avant) et le rayon qui repart
  S.miroirs.forEach(([x, y], k) => {
    const dAvant = dirs[k] + 180, dApres = dirs[k + 1], v = 180 - 2 * S.sol[k];
    const p1 = (dAvant - 90) * Math.PI / 180, p2 = (dApres - 90) * Math.PI / 180;
    let delta = ((p2 - p1) % (2 * Math.PI) + 3 * Math.PI) % (2 * Math.PI) - Math.PI;              // le plus petit des deux angles
    ctx.strokeStyle = "#8fd0ff"; ctx.lineWidth = .8; ctx.beginPath(); ctx.arc(x, y, 12, p1, p1 + delta, delta < 0); ctx.stroke();
    const pm = p1 + delta / 2, lx = x + Math.cos(pm) * 21, ly = y + Math.sin(pm) * 21, t = `${v}°`;
    ctx.font = "bold 5px Georgia, serif"; const w = ctx.measureText(t).width + 4;
    ctx.fillStyle = "rgba(16,30,48,.88)"; arrondi(lx - w / 2, ly - 3.8, w, 7.6, 2); ctx.fill();
    ctx.fillStyle = "#d8eeff"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(t, lx, ly + .2); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  });
  // les lettres
  pts.forEach(([x, y], i) => {
    const d = i < dirs.length ? dirs[i] : dirs[i - 1] + 180, [ux, uy] = vers(d), lx = x - ux * 8 + uy * 6, ly = y - uy * 8 - ux * 6;
    ctx.fillStyle = "rgba(255,248,220,.95)"; rond(lx, ly, 4); ctx.fillStyle = "#1a1008"; ctx.font = "bold 5.4px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(noms[i], lx, ly + .3); ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
  });
}
// la rose des directions, comme dans Scratch : 0° en haut, 90° à droite, 180° en bas, -90° à gauche
function roseScratch(x, y) {
  ctx.fillStyle = "rgba(26,16,8,.75)"; rond(x, y, 11); ctx.strokeStyle = "#d4a535"; ctx.lineWidth = .5; ctx.beginPath(); ctx.arc(x, y, 8, 0, 7); ctx.stroke();
  for (let a = 0; a < 360; a += 45) { const r = a % 90 ? 6.6 : 5.6, [ux, uy] = [Math.sin(a * Math.PI / 180), -Math.cos(a * Math.PI / 180)]; trait([[x + ux * r, y + uy * r], [x + ux * 8, y + uy * 8]], "#d4a535", a % 90 ? .3 : .6); }
  trait([[x, y], [x, y - 6]], "#f6dc90", .9); ctx.fillStyle = "#f6dc90"; poly([[x - 1.4, y - 5], [x + 1.4, y - 5], [x, y - 7.2]], "#f6dc90");
  ctx.font = "bold 3.4px Georgia, serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (const [t0, dx, dy] of [["0°", 0, -10.4], ["90°", 10.6, 0], ["180°", 0, 10.4], ["-90°", -10.8, 0]]) { ctx.fillStyle = "#f6dc90"; ctx.fillText(t0, x + dx, y + dy); }
  ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";
}
function decorSoleil(P, t) {
  if (P.vue === "face") return decorSoleilFace(P, t);
  const S = P.salles[Math.min(P.salle, 2)], E = P.exec;
  ctx.drawImage(fondPeint("sanctuaire", peindreSanctuaire), 0, 0, L, H);
  // la fente du mur, et le soleil du dehors
  const [fx, fy] = S.fente, [dx, dy] = versAngle(S.dir);
  const g = ctx.createRadialGradient(fx, fy, 1, fx, fy, 20); g.addColorStop(0, "rgba(255,236,170,.95)"); g.addColorStop(1, "rgba(255,236,170,0)"); ctx.fillStyle = g; ctx.fillRect(fx - 20, fy - 20, 40, 40);
  ctx.fillStyle = "#fff4d2"; ctx.save(); ctx.translate(fx, fy); ctx.rotate(Math.atan2(dy, dx)); ctx.fillRect(-6, -2.4, 12, 4.8); ctx.restore();
  piliersDessus(S);
  // le rayon de Rê, toujours visible : il suit les miroirs tels qu'ils sont
  const T = tracerRayon(S, P.or);
  ctx.save(); ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const [ep, coul] of [[5, "rgba(255,220,120,.22)"], [2.2, "rgba(255,236,170,.75)"], [.9, "#fffaf0"]]) { ctx.strokeStyle = coul; ctx.lineWidth = ep; ctx.beginPath(); T.pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
  ctx.restore();
  if (!T.ok) { const [x, y] = T.pts[T.pts.length - 1]; ctx.fillStyle = `rgba(255,236,170,${.5 + .2 * Math.sin(t / 4)})`; rond(x, y, 1.8); }
  statueDessus(S.statue, T.ok, t, Math.atan2(S.miroirs[0][1] - S.statue[1], S.miroirs[0][0] - S.statue[0]));
  S.miroirs.forEach(([x, y], k) => miroirDessus(x, y, P.or[k], k + 1));
  if (P.montre) figureTrajet(S);
  roseScratch(26, 26);
  const Sc = P.scara; scarabee(Sc.x, Sc.y, Sc.ang, t, Sc.vole);
}
function devantSoleil(P, t) {
  if (P.bascule) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(P.bascule.t - 20) / 20})`; ctx.fillRect(0, 0, L, H); }
  const v = ctx.createRadialGradient(L / 2, H / 2, 80, L / 2, H / 2, 170); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.45)");
  ctx.fillStyle = v; ctx.fillRect(0, 0, L, H);
}
// la roue d'orientation, comme celle de Scratch : on clique ou on fait glisser la flèche (par pas de 5°)
function roueScratch(o, k, off) {
  const g = Array.from({ length: 24 }, (_, i) => { const a = i * 15 * Math.PI / 180, r = i % 6 ? 21 : 18.5; return `<line x1="${30 + Math.sin(a) * r}" y1="${30 - Math.cos(a) * r}" x2="${30 + Math.sin(a) * 23}" y2="${30 - Math.cos(a) * 23}"${i % 6 ? "" : ' class="fort"'}/>`; }).join("");
  // le miroir, comme dans la salle : la lame de bronze et l'ombelle de papyrus au bout qui pointe
  const miroir = `<g transform="rotate(${o} 30 30)"><line x1="30" y1="44" x2="30" y2="16" class="lame-dos"/><line x1="30" y1="43.5" x2="30" y2="16.5" class="lame"/>
    <polygon points="30,15 25.6,8.4 34.4,8.4" class="ombelle"/><circle cx="30" cy="14.6" r="1.5" class="bouton"/><circle cx="30" cy="30" r="3.4" class="socle"/></g>`;
  return `<svg class="roue${off ? " inactive" : ""}" data-roue="${k}" viewBox="0 0 60 60" width="60" height="60" role="slider" aria-label="Orientation du miroir ${"BC"[k]}" aria-valuemin="-175" aria-valuemax="180" aria-valuenow="${o}">
    <circle cx="30" cy="30" r="29" class="fond"/><circle cx="30" cy="30" r="23" class="anneau"/><g class="grad">${g}</g>
    <text x="30" y="5.6">0°</text><text x="55.6" y="31.4">90°</text><text x="30" y="58.4">180°</text><text x="4.6" y="31.4">-90°</text>${miroir}</svg>`;
}
function orienterRoue(e) {
  const el = e.target.closest("[data-roue]"); if (!el || el.classList.contains("inactive") || !niv || niv.sorte !== "soleil" || P.exec) return;
  const k = +el.dataset.roue, R = el.getBoundingClientRect(), dx = e.clientX - R.left - R.width / 2, dy = e.clientY - R.top - R.height / 2;
  let o = Math.round(Math.atan2(dx, -dy) * 180 / Math.PI / 5) * 5; if (o <= -180) o += 360;      // comme Scratch : de -175° à 180°
  if (o === P.ins[k]) return;
  P.ins[k] = o; el.outerHTML; const neuf = document.createElement("div"); neuf.innerHTML = roueScratch(o, k, false);
  el.replaceWith(neuf.firstElementChild); const v = document.querySelector(`[data-val="${k}"]`); if (v) v.textContent = `${o}°`;
}
let roueTenue = false;
document.addEventListener("pointerdown", e => { if (e.target.closest("[data-roue]")) { roueTenue = true; e.preventDefault(); orienterRoue(e); } });
document.addEventListener("pointermove", e => { if (roueTenue) { const el = document.elementFromPoint(e.clientX, e.clientY); if (el && el.closest("[data-roue]")) orienterRoue({ target: el, clientX: e.clientX, clientY: e.clientY }); } });
document.addEventListener("pointerup", () => { roueTenue = false; });
// le panneau : d'abord la consigne et le bouton ; puis seulement les instructions, une roue par miroir
function panneauSoleil(P) {
  const S = P.salles[P.salle], enCours = !!P.exec;
  if (P.vue === "face") return `<div class="programme">
    <div class="prog-intro">Au fond du sanctuaire, le médaillon du pharaon attend la lumière de Rê. Un miroir de bronze peut renvoyer le rayon jusqu'à lui. Le scarabée de Khépri orientera les miroirs pour toi. Pour voir toute la salle, regarde-la d'en haut.</div>
    <div class="prog-actions"><button type="button" data-sol="monter"${P.bascule ? " disabled" : ""}>⬆ Voir la salle d'en haut</button></div>
  </div>`;
  if (!P.montre) return `<div class="programme">
    <div class="prog-intro"><b>Salle ${P.salle + 1} sur 3.</b> Le rayon de Rê part toujours de A, vers le haut (0°). Pour atteindre le pharaon, il doit suivre le trajet de la figure : le scarabée de Khépri orientera les miroirs pour toi.</div>
    <div class="prog-actions"><button type="button" data-sol="montrer">✎ Donner les instructions</button></div>
  </div>`;
  const off = enCours ? " disabled" : "";
  const ligne = (o, k) => `<div class="soleil-miroir">${roueScratch(o, k, enCours)}<div class="soleil-reglage"><span class="soleil-texte">orienter <span class="soleil-nom">Miroir ${"BC"[k]}</span> à</span>
      <span class="soleil-angle"><button type="button" data-sol="m${k}"${off}>−</button><b data-val="${k}">${o}°</b><button type="button" data-sol="p${k}"${off}>+</button></span></div></div>`;
  return `<div class="programme">${P.ins.map(ligne).join("")}
    <div class="prog-actions"><button type="button" data-sol="lancer"${off}>▶ Donner les instructions au scarabée</button></div>
  </div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-sol]");
  if (!b || b.disabled || !niv || niv.sorte !== "soleil" || P.exec || gardien.etat === "fini") return;
  const c = b.dataset.sol, k = +c.slice(1);
  if (c === "monter") { P.bascule = { t: 0 }; son("allume"); }
  else if (c === "montrer") P.montre = true;
  else if (c === "lancer") { P.exec = { phase: "vol", i: 0, t: 0 }; $("retour").className = "vide"; son("allume"); }
  else if (c[0] === "m") P.ins[k] = versScratch(depuisScratch(P.ins[k] - 5)); else if (c[0] === "p") P.ins[k] = versScratch(depuisScratch(P.ins[k] + 5));
  afficherQuestion();
});
// l'exécution : le scarabée vole jusqu'à chaque miroir et le fait pivoter (le rayon suit) ; puis le verdict
function bougerSoleil(P) {
  const Sc = P.scara;
  if (P.bascule) { if (++P.bascule.t === 20) { P.vue = "dessus"; afficherQuestion(); } if (P.bascule.t >= 40) P.bascule = null; return; }
  if (P.vue === "face") return;
  if (P.sortie) { if (++P.sortie === 80) plateauFranchi(); return; }
  if (P.attente) { if (--P.attente === 0) { P.salle++; Object.assign(P, nouvelleSalle(P.salles[P.salle]), { montre: false }); afficherQuestion(); } return; }
  const E = P.exec;
  if (!E) { Sc.vole = false; Sc.x += (196 - Sc.x) * .05; Sc.y += (158 - Sc.y) * .05; return; }
  const S = P.salles[P.salle];
  if (E.phase === "vol") {
    if (E.i >= S.miroirs.length) { E.phase = "verdict"; E.t = 0; return; }
    if (!E.cibles) E.cibles = P.ins.map(depuisScratch);
    if (Math.abs(((E.cibles[E.i] - P.or[E.i]) % 360 + 540) % 360 - 180) < .01) { E.i++; return; }
    const [mx, my] = S.miroirs[E.i], tx = mx, ty = my, d = Math.hypot(tx - Sc.x, ty - Sc.y);           // il vole se poser sur le miroir
    Sc.vole = true;
    if (d > 1.5) { Sc.ang = Math.atan2(ty - Sc.y, tx - Sc.x); Sc.x += (tx - Sc.x) / d * Math.min(d, 2.4); Sc.y += (ty - Sc.y) / d * Math.min(d, 2.4); }
    else { E.phase = "tourne"; E.t = 0; E.de = P.or[E.i]; Sc.vole = false; }
    return;
  }
  if (E.phase === "tourne") {
    const r = ((E.cibles[E.i] - E.de) % 360 + 540) % 360 - 180, n = Math.max(12, Math.abs(r) * .5);
    E.t++; P.or[E.i] = E.de + r * Math.min(1, E.t / n);
    { const [ux, uy] = versAngle(P.or[E.i]); Sc.x = S.miroirs[E.i][0]; Sc.y = S.miroirs[E.i][1]; Sc.ang = Math.atan2(uy, ux); }   // posé sur le miroir, il le fait tourner
    if (E.t >= n) { son("bois"); E.i++; E.phase = "vol"; }
    return;
  }
  if (E.phase === "verdict") {
    if (++E.t < 20) return;
    const ok = tracerRayon(S, P.or).ok;
    E.phase = ok ? "fin" : "rate"; E.t = 0;
    if (ok) { compterReponse(true); son("bravo"); gardien.justes++; majCompteur(); messageTemple("Le rayon de Rê frappe la statue : le sanctuaire s'illumine !", true); }
    else { compterReponse(false); son("croc"); messageTemple("Le rayon n'atteint pas la statue… Le scarabée remet les miroirs comme avant : corrige tes instructions.", false); }
    afficherQuestion(); return;
  }
  if (E.phase === "fin") { if (++E.t >= 70) { P.exec = null; if (gardien.justes >= 3) { gardien.etat = "fini"; P.sortie = 1; } else P.attente = 40; afficherQuestion(); } return; }
  if (E.phase === "rate") { if (++E.t >= 70) { P.exec = null; P.or = orientationsMiroirs(S, S.init); afficherQuestion(); } }
}
// ============================================================
//  PLATEAU 5 — LES CHAMPS APRÈS LA CRUE (dehors !)
//  Le Nil s'est retiré : les bornes des champs ont disparu sous le limon. Comme les arpenteurs égyptiens, on retrace les
//  champs avec une corde à nœuds. L'oie du Nil, compagne de passage, tire la corde selon un programme façon Scratch :
//  « avancer de … coudées », « tourner à droite / à gauche de 90° ». Trois champs : les dimensions données, puis l'aire
//  et le côté le long du canal, puis le périmètre et ce côté. Les nombres changent à chaque partie.
// ============================================================
const CH = { x: 24, y: 18, c: 12, ni: 16, nj: 12 };                // la grille, en coudées : 16 × 12, une coudée = 12 px
const caseCh = (i, j) => [CH.x + i * CH.c, CH.y + j * CH.c];
const NOMS_CHAMPS = ["Néfer", "Ipi", "Méryt", "Kha", "Sénet", "Hori", "Tiyi", "Ramosé"];
function genererChamp(k) {
  const h = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  for (let essai = 0; essai < 200; essai++) {
    let a, b;
    if (k === 1) { a = h(4, 8); b = h(2, 6); } else { a = h(3, 7); b = h(3, 8); }
    if (a === b) continue;
    const e1 = h(1, 2), e2 = h(1, 2), zw = b + e2, zh = a + e1, sens = Math.random() < .5 ? 1 : -1;
    if (zw + 1 > CH.ni - 2 || zh > CH.nj - 1) continue;
    const zj = h(1, CH.nj - zh), base = h(1, CH.ni - zw - 2);
    const canal = sens > 0 ? { x0: base, x1: base + 1 } : { x0: base + zw, x1: base + zw + 1 };
    const zone = sens > 0 ? { x0: base + 1, x1: base + 1 + zw, y0: zj, y1: zj + zh } : { x0: base, x1: base + zw, y0: zj, y1: zj + zh };
    const borne = sens > 0 ? [zone.x0, zone.y1] : [zone.x1, zone.y1];
    const nom = NOMS_CHAMPS[Math.floor(Math.random() * NOMS_CHAMPS.length)];
    return { k, a, b, A: a * b, Pm: 2 * (a + b), sens, zone, canal, borne, nom, id: Math.random().toString(36).slice(2) };
  }
  return { k, a: 4, b: 6, A: 24, Pm: 20, sens: 1, zone: { x0: 4, x1: 11, y0: 3, y1: 9 }, canal: { x0: 3, x1: 4 }, borne: [4, 9], nom: "Néfer", id: "repli" + k };
}
const enonceChamp = C => [`Le champ de ${C.nom} est un rectangle : <b>${C.a} coudées</b> le long du canal, et <b>${C.b} coudées</b> de large.`,
  `Le champ de ${C.nom} est un rectangle d'<b>aire ${C.A} coudées carrées</b>. Son côté le long du canal mesure <b>${C.a} coudées</b>.`,
  `Le champ de ${C.nom} est un rectangle de <b>périmètre ${C.Pm} coudées</b>. Son côté le long du canal mesure <b>${C.a} coudées</b>.`][C.k];
const donneesChamp = C => [`${C.nom} : ${C.a} coudées le long du canal, ${C.b} de large.`, `${C.nom} : aire ${C.A} coudées carrées ; le long du canal, ${C.a} coudées.`, `${C.nom} : périmètre ${C.Pm} coudées ; le long du canal, ${C.a} coudées.`][C.k];

// --- l'accroche : la vallée après la crue, en perspective (le point de fuite sur l'horizon, le sol à 80 sous les yeux)
const HORIZ = { x: 120, y: 76, sol: 80 };
const projSol = (X, s) => [HORIZ.x + X * s, HORIZ.y + HORIZ.sol * s];
function arpenteur(x, base, h, dir, graine) {
  ctx.save(); ctx.translate(x, base); ctx.scale(dir * h / 14, h / 14);
  ctx.fillStyle = "#8a4a26"; rond(0, -12.6, 1.5); ctx.fillStyle = "#1a1410"; ovale(-.3, -13.4, 1.6, 1.1);
  ctx.fillStyle = "#8a4a26"; ctx.fillRect(-1.2, -11, 2.4, 5); ctx.fillStyle = "#f2ead8"; poly([[-1.6, -6.4], [1.8, -6.4], [2.4, -1.6], [-2, -1.6]], "#f2ead8");
  trait([[-.6, -1.6], [-1, 0]], "#8a4a26", .9); trait([[.8, -1.6], [1.6, 0]], "#8a4a26", .9);
  trait([[.6, -10], [3.4, -8.6]], "#8a4a26", .8);
  ctx.restore();
}
function oieCote(x, base, sc, t) {
  ctx.save(); ctx.translate(x, base); ctx.scale(sc, sc);
  const b = Math.sin(t / 9) * .4;
  trait([[-1, -2], [-1.6, 0]], "#e08a6a", .7); trait([[1, -2], [1.2, 0]], "#e08a6a", .7);                    // les pattes roses
  ctx.fillStyle = "#c8b490"; ovale(0, -4.4, 5.4, 3); ctx.fillStyle = "#8a6a4a"; ovale(-.8, -4.8, 3.8, 1.8);    // le corps, l'aile
  ctx.fillStyle = "#f2ead8"; ovale(-1.6, -5.6, 2, .8); ctx.fillStyle = "#3a6a5a"; ovale(-3.6, -4.6, 1.6, .7);  // le blanc et le vert de l'aile
  ctx.strokeStyle = "#c8b490"; ctx.lineWidth = 1.6; ctx.lineCap = "round"; ctx.beginPath(); ctx.moveTo(3.6, -5.4); ctx.quadraticCurveTo(5.8, -8, 4.6 + b, -10.6); ctx.stroke();
  ctx.fillStyle = "#d8c8a8"; rond(4.8 + b, -11.2, 1.4); ctx.fillStyle = "#7a3a1e"; ovale(5.2 + b, -11.3, .8, .7);  // la tête, le masque brun
  ctx.fillStyle = "#e88a6a"; poly([[6 + b, -11.4], [8 + b, -10.9], [6 + b, -10.5]], "#e88a6a");                     // le bec rose
  ctx.restore();
}
function peindreCrue() {
  // le ciel du matin, le soleil, les pyramides et le désert au loin
  ctx.fillStyle = degrade(0, HORIZ.y + 4, "#8ec2d6", "#cfe2d8", "#f4dcaa"); ctx.fillRect(0, 0, L, HORIZ.y + 4);
  soleilVoile(196, 20, 70);
  ctx.fillStyle = "#e6cfa2"; ctx.beginPath(); ctx.moveTo(0, HORIZ.y); ctx.lineTo(30, HORIZ.y - 6); ctx.lineTo(70, HORIZ.y - 8); ctx.lineTo(100, HORIZ.y - 4); ctx.lineTo(100, HORIZ.y + 1); ctx.lineTo(0, HORIZ.y + 1); ctx.fill();
  pyramide(152, HORIZ.y, 26, 17, .55); pyramide(176, HORIZ.y, 16, 10, .65); pyramide(136, HORIZ.y, 12, 7, .72);
  brumeHorizontale(HORIZ.y - 2, 10, .6);
  // le Nil qui se retire, au loin, et la palmeraie de l'autre rive
  for (let k = 0; k < 18; k++) palmier(4 + k * 14 + bruit(k + 60) * 6, HORIZ.y + 1, 7 + bruit(k + 61) * 5, 600 + k * 7, (bruit(k + 62) - .5) * .8, .66);
  ctx.fillStyle = degrade(HORIZ.y + 1, HORIZ.y + 5, "#a8d0cc", "#7ab0ac"); ctx.fillRect(0, HORIZ.y + 1, L, 4);
  for (let k = 0; k < 30; k++) { ctx.fillStyle = "rgba(255,248,226,.5)"; ctx.fillRect(bruit(k + 70) * L, HORIZ.y + 1.5 + bruit(k + 71) * 3, 1 + bruit(k + 72) * 4, .3); }
  // les champs, en perspective : du blé vert, du limon noir encore luisant, des flaques qui reflètent le ciel
  const S = [.07, .1, .14, .2, .28, .4, .58, .82, 1.2], X = []; for (let x = -600; x <= 600; x += 60) X.push(x);
  ctx.fillStyle = "#3a2a1e"; poly([[0, HORIZ.y + 5], [L, HORIZ.y + 5], [L, H], [0, H]], "#3a2a1e");
  for (let j = 0; j < S.length - 1; j++) for (let i = 0; i < X.length - 1; i++) {
    const n = bruit(i * 13 + j * 7 + 500), pts = [projSol(X[i], S[j]), projSol(X[i + 1], S[j]), projSol(X[i + 1], S[j + 1]), projSol(X[i], S[j + 1])];
    if (n < .38) { poly(pts, n < .2 ? "#6a9a3a" : "#7aa844"); ctx.strokeStyle = "rgba(40,70,20,.35)"; ctx.lineWidth = .3; for (let u = .2; u < 1; u += .2) { const [xa, ya] = projSol(X[i] + (X[i + 1] - X[i]) * u, S[j]), [xb, yb] = projSol(X[i] + (X[i + 1] - X[i]) * u, S[j + 1]); ctx.beginPath(); ctx.moveTo(xa, ya); ctx.lineTo(xb, yb); ctx.stroke(); } }
    else if (n < .55) { poly(pts, "#2e2016"); const [cx, cy] = projSol((X[i] + X[i + 1]) / 2, (S[j] + S[j + 1]) / 2); ctx.fillStyle = "rgba(200,226,232,.55)"; ovale(cx, cy, 14 * S[j + 1], 3.4 * S[j + 1]); }
    else poly(pts, n < .8 ? "#3a2a1e" : "#44321f");
  }
  // les diguettes qui séparent les champs : toutes filent vers le point de fuite
  ctx.strokeStyle = "rgba(170,140,100,.55)"; ctx.lineWidth = .6;
  for (const x of X) { ctx.beginPath(); ctx.moveTo(...projSol(x, S[0])); ctx.lineTo(...projSol(x, S[S.length - 1])); ctx.stroke(); }
  for (const sv of S) { ctx.beginPath(); ctx.moveTo(...projSol(-600, sv)); ctx.lineTo(...projSol(600, sv)); ctx.stroke(); }
  // le canal d'irrigation, qui file lui aussi vers le fond
  poly([projSol(-34, S[0]), projSol(-14, S[0]), projSol(-14, 1.3), projSol(-34, 1.3)], "#5a9aa8");
  ctx.fillStyle = "rgba(255,250,235,.35)"; for (let k = 0; k < 20; k++) { const sv = .1 + bruit(k + 80) * 1.1, [x, y] = projSol(-24 + (bruit(k + 81) - .5) * 14, sv); ctx.fillRect(x, y, 3 * sv + .5, .4); }
  // au milieu, les arpenteurs tendent leur corde à nœuds
  const [ax, ay] = projSol(60, .32), [bx, by] = projSol(150, .32);
  arpenteur(ax, ay, 14 * .32 * 2.4, 1, 1); arpenteur(bx, by, 14 * .32 * 2.4, -1, 2);
  trait([[ax + 3, ay - 7], [bx - 3, by - 7]], "#c8a46e", .4); ctx.fillStyle = "#8a6a44"; for (let u = 0; u <= 1; u += 1 / 12) rond(ax + 3 + (bx - ax - 6) * u, ay - 7, .45);
  // au premier plan : des papyrus, un palmier, la borne renversée à moitié enfouie dans le limon
  palmier(228, 186, 120, 31, -.25); papyrus(8, 182, 14, 46, 90);
  ctx.save(); ctx.translate(46, 170); ctx.rotate(-.5); ctx.fillStyle = "#d8ccb0"; arrondi(-5, -14, 10, 16, 4); ctx.fill(); ctx.strokeStyle = "rgba(90,60,30,.5)"; ctx.lineWidth = .4; ctx.stroke(); hieroglyphe(0, -9, 1, 4, "rgba(90,60,30,.5)"); hieroglyphe(0, -4, 1, 7, "rgba(90,60,30,.5)"); ctx.restore();
  ctx.fillStyle = "#2e2016"; ovale(48, 172, 12, 3);
  const v = ctx.createRadialGradient(L / 2, H / 2, 90, L / 2, H / 2, 170); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(30,20,10,.3)"); ctx.fillStyle = v; ctx.fillRect(0, 0, L, H);
}

// --- la vue de dessus : le limon noir, les champs de blé des voisins, le canal, la borne
function peindreChamp(C) {
  ctx.fillStyle = "#4a3a22"; ctx.fillRect(0, 0, L, H);
  const [gx0, gy0] = caseCh(0, 0), [gx1, gy1] = caseCh(CH.ni, CH.nj);
  // le blé des voisins, partout autour, en parcelles séparées par des diguettes
  for (let j = 0; j < CH.nj; j += 3) for (let i = 0; i < CH.ni; i += 4) {
    const [x, y] = caseCh(i, j), n = bruit(i * 5 + j * 3 + 900);
    ctx.fillStyle = n < .5 ? "#6a9a3a" : "#7aa844"; ctx.fillRect(x, y, CH.c * 4, CH.c * 3);
    ctx.strokeStyle = "rgba(40,70,20,.35)"; ctx.lineWidth = .5; for (let r = 2; r < CH.c * (n < .5 ? 4 : 3); r += 3) { ctx.beginPath(); if (n < .5) { ctx.moveTo(x + r, y); ctx.lineTo(x + r, y + CH.c * 3); } else { ctx.moveTo(x, y + r); ctx.lineTo(x + CH.c * 4, y + r); } ctx.stroke(); }
  }
  ctx.strokeStyle = "#a88a5a"; ctx.lineWidth = 1.2; for (let j = 0; j <= CH.nj; j += 3) { ctx.beginPath(); ctx.moveTo(gx0, CH.y + j * CH.c); ctx.lineTo(gx1, CH.y + j * CH.c); ctx.stroke(); } for (let i = 0; i <= CH.ni; i += 4) { ctx.beginPath(); ctx.moveTo(CH.x + i * CH.c, gy0); ctx.lineTo(CH.x + i * CH.c, gy1); ctx.stroke(); }
  // le canal, sur toute la hauteur
  const [cx0] = caseCh(C.canal.x0, 0), [cx1] = caseCh(C.canal.x1, 0);
  ctx.fillStyle = degrade(0, H, "#6aaab8", "#4a8a9a"); ctx.fillRect(cx0, 0, cx1 - cx0, H);
  ctx.fillStyle = "rgba(255,250,235,.4)"; for (let k = 0; k < 26; k++) ctx.fillRect(cx0 + 1 + bruit(k + 40) * (cx1 - cx0 - 4), bruit(k + 41) * H, 2.5, .4);
  ctx.fillStyle = "#3a7a3a"; for (let k = 0; k < 18; k++) { const y = bruit(k + 50) * H, x = bruit(k + 51) < .5 ? cx0 : cx1; for (let a = 0; a < 6; a++) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 3.4, y + Math.sin(a) * 3.4); ctx.strokeStyle = "#4a8a3a"; ctx.lineWidth = .4; ctx.stroke(); } }
  // la parcelle à retracer : du limon noir et luisant, quelques flaques ; ses bords se sont effacés
  const [zx0, zy0] = caseCh(C.zone.x0, C.zone.y0), [zx1, zy1] = caseCh(C.zone.x1, C.zone.y1);
  ctx.fillStyle = "#2e2016"; ctx.fillRect(zx0, zy0, zx1 - zx0, zy1 - zy0);
  for (let k = 0; k < 14; k++) { ctx.fillStyle = `rgba(${bruit(k + 20) < .5 ? "200,226,232,.35" : "90,70,50,.35"})`; ovale(zx0 + bruit(k + 21) * (zx1 - zx0), zy0 + bruit(k + 22) * (zy1 - zy0), 3 + bruit(k + 23) * 6, 2 + bruit(k + 24) * 3); }
  // la bordure du dehors : un chemin et des palmiers vus d'en haut
  ctx.fillStyle = "#b89a6a"; ctx.fillRect(0, 0, L, CH.y - 2); ctx.fillRect(0, gy1 + 2, L, H - gy1); ctx.fillRect(0, 0, CH.x - 2, H); ctx.fillRect(gx1 + 2, 0, L - gx1, H);
  ctx.fillStyle = degrade(0, H, "#6aaab8", "#4a8a9a"); ctx.fillRect(cx0, 0, cx1 - cx0, CH.y - 2); ctx.fillRect(cx0, gy1 + 2, cx1 - cx0, H - gy1);
  for (const [x, y] of [[8, 10], [232, 12], [10, 168], [230, 170], [120, 6]]) { ctx.fillStyle = "rgba(0,0,0,.3)"; rond(x + 3, y + 3, 9); for (let a = 0; a < 9; a++) { const an = a / 9 * Math.PI * 2; trait([[x, y], [x + Math.cos(an) * 9, y + Math.sin(an) * 9]], "#3e6022", 1.6); } ctx.fillStyle = "#6a5034"; rond(x, y, 1.4); }
  // la corde à nœuds, en légende : une coudée entre deux nœuds
  const ry = H - 6.5; trait([[CH.x + 70, ry], [CH.x + 70 + 5 * CH.c, ry]], "#6a4a22", .8); ctx.fillStyle = "#3a2410"; for (let n = 0; n <= 5; n++) rond(CH.x + 70 + n * CH.c, ry, .9);
  ctx.fillStyle = "#2a1a0e"; ctx.font = "bold 4.4px Georgia, serif"; ctx.fillText("une coudée entre deux nœuds", CH.x + 70 + 5 * CH.c + 4, ry + 1.6);
}
function borneDessus(x, y) { ctx.fillStyle = "rgba(0,0,0,.35)"; ctx.fillRect(x - 2, y - 2, 6, 6); ctx.fillStyle = "#efe6d0"; ctx.fillRect(x - 3, y - 3, 6, 6); ctx.fillStyle = "#c8b890"; ctx.fillRect(x - 3, y + 1.6, 6, 1.4); }
// l'oie du Nil, vue d'en haut : elle marche dans la direction « ang » (angle du dessin)
function oieDessus(x, y, ang, t, marche) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(.85, .85);
  const p = marche ? Math.sin(t / 2.4) : 0;
  ctx.fillStyle = "rgba(0,0,0,.25)"; ovale(1, 1.5, 5.6, 3.4);
  ctx.fillStyle = "#e08a6a"; ovale(-1 + p, 2.4, 1, .6); ovale(-1 - p, -2.4, 1, .6);
  ctx.fillStyle = "#c8b490"; ovale(0, 0, 5.4, 3.4);
  ctx.fillStyle = "#8a6a4a"; ovale(-1, -1.6, 3.6, 1.2); ovale(-1, 1.6, 3.6, 1.2);
  ctx.fillStyle = "#f2ead8"; ovale(.4, -1.8, 1.6, .7); ovale(.4, 1.8, 1.6, .7);
  ctx.fillStyle = "#c8b490"; ctx.fillRect(4, -.8, 3, 1.6);
  ctx.fillStyle = "#d8c8a8"; rond(7.6, 0, 1.6); ctx.fillStyle = "#7a3a1e"; ovale(7.6, -.9, .8, .5); ovale(7.6, .9, .8, .5);
  ctx.fillStyle = "#e88a6a"; poly([[8.8, -.6], [10.8, 0], [8.8, .6]], "#e88a6a");
  ctx.restore();
}
function decorCrueFace(P, t) {
  ctx.drawImage(fondPeint("crue", peindreCrue), 0, 0, L, H);
  oieCote(176, 166, 2.2, t);
  // le reflet du soleil qui scintille sur les flaques
  for (let k = 0; k < 10; k++) { const sv = .2 + bruit(k + 700) * .9, [x, y] = projSol((bruit(k + 701) - .5) * 300, sv); ctx.fillStyle = `rgba(255,252,236,${.3 + .3 * Math.sin(t / 7 + k * 2)})`; rond(x, y, .5 + sv * .5); }
}
function decorCrue(P, t) {
  if (P.vue === "face") return decorCrueFace(P, t);
  const C = P.champs[Math.min(P.salle, 2)], E = P.exec;
  ctx.drawImage(fondPeint("champ" + C.id, () => peindreChamp(C)), 0, 0, L, H);
  // le champ retracé : le blé y pousse
  if (P.pousse) {
    const R = P.pousse, [x0, y0] = caseCh(R.x0, R.y0), [x1, y1] = caseCh(R.x1, R.y1), u = Math.min(1, R.t / 50);
    ctx.fillStyle = `rgba(122,168,68,${u})`; ctx.fillRect(x0, y0, x1 - x0, y1 - y0);
    ctx.strokeStyle = `rgba(40,70,20,${.4 * u})`; ctx.lineWidth = .5; for (let x = x0 + 2; x < x1; x += 3) { ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke(); }
  }
  // la corde tirée par l'oie, avec ses nœuds : un par coudée
  const trace = E ? E.trace.map(([i, j]) => caseCh(i, j)) : [], pos = E ? E.px : caseCh(...C.borne);
  if (trace.length) {
    const pts = [...trace, pos];
    trait(pts, "#6a4a22", 1.1); trait(pts, "#c8a46e", .5);
    ctx.fillStyle = "#3a2410"; for (const [i, j] of E.noeuds) rond(...caseCh(i, j), .9);
  }
  const [bx, by] = caseCh(...C.borne); borneDessus(bx, by);
  const ang = E ? E.ang : -Math.PI / 2;
  oieDessus(pos[0], pos[1], ang, t, E && E.phase === "marche");
}
function devantCrue(P, t) {
  if (P.bascule) { ctx.fillStyle = `rgba(0,0,0,${1 - Math.abs(P.bascule.t - 20) / 20})`; ctx.fillRect(0, 0, L, H); }
}
// --- le panneau : la consigne et le bouton, puis l'éditeur du programme de l'oie
const texteCh = I => I.t === "av" ? `avancer de ${I.n} coudée${I.n > 1 ? "s" : ""}` : I.t === "d" ? "tourner à droite de 90°" : "tourner à gauche de 90°";
function panneauCrue(P) {
  if (P.vue === "face") return `<div class="programme">
    <div class="prog-intro">Le Nil s'est retiré : il a laissé un limon noir et fertile, mais les bornes des champs ont disparu sous la boue. Comme les arpenteurs, il faut retracer les champs avec la corde à nœuds. L'oie du Nil tirera la corde pour toi.</div>
    <div class="prog-actions"><button type="button" data-cr="monter"${P.bascule ? " disabled" : ""}>⬆ Voir les champs d'en haut</button></div></div>`;
  const C = P.champs[P.salle], enCours = !!P.exec;
  if (!P.montre) return `<div class="programme">
    <div class="prog-intro"><b>Champ ${P.salle + 1} sur 3.</b> ${enonceChamp(C)} Une borne a résisté à la crue : elle marque un coin du champ. L'oie part de la borne, tournée vers le haut.</div>
    <div class="prog-actions"><button type="button" data-cr="montrer">✎ Donner les instructions</button></div></div>`;
  majFlottant(`<div class="programme bloc-editeur${enCours ? " en-cours" : ""}">
    <div class="prog-intro">${donneesChamp(C)}</div>
    <div class="be-zones">
      <div class="be-palette">
        <div class="be-titre">Blocs</div>
        ${blocCh({ t: "av", n: P.n }, "pal")}${blocCh({ t: "d" }, "pal")}${blocCh({ t: "g" }, "pal")}${blocRepeter({ t: "rep", n: P.nRep || 2, corps: [] }, "palrep", blocCh)}
        <div class="be-poubelle" data-be="poubelle">🗑 glisse ici pour supprimer</div>
      </div>
      <div class="be-programme" data-be="prog" data-chemin="">
        <div class="be-chapeau">quand l'oie part de la borne</div>
        ${blocsHTML(P.prog, "", blocCh, enCours ? cheminActifCh(P) : null)}
        ${P.prog.length ? "" : `<div class="be-vide">glisse les blocs ici</div>`}
      </div>
    </div>
    <div class="prog-actions"><button type="button" data-cr="effacer"${enCours ? " disabled" : ""}>Tout effacer</button><button type="button" data-cr="lancer"${enCours || !P.prog.length ? " disabled" : ""}>▶ Donner les instructions à l'oie</button></div>
  </div>`);
  return `<div class="programme"><div class="prog-intro">${donneesChamp(C)}</div><div class="prog-intro">Compose le programme de l'oie dans la fenêtre « Programme » : tu peux la déplacer en tirant sa barre de titre.</div>
    <div class="prog-actions"><button type="button" data-fl="ouvrir">▣ Afficher la fenêtre du programme</button></div></div>`;
}
// --- la fenêtre flottante : posée sur le jeu, déplaçable par sa barre de titre, repliable ; elle garde sa place
let flottantPos = null; try { flottantPos = JSON.parse(localStorage.getItem("crapaudIbis.flottant") || "null"); } catch (e) { flottantPos = null; }
function fenetreFlottante() {
  let f = document.getElementById("flottant");
  if (f) return f;
  f = document.createElement("div"); f.id = "flottant"; f.className = "flottant"; f.hidden = true;
  f.innerHTML = `<div class="fl-barre" data-fl="barre"><span class="fl-poignee">⠿</span><span class="fl-titre">Programme de l'oie</span><button type="button" data-fl="replier" title="Replier">–</button></div><div class="fl-corps"></div><div class="fl-taille" data-fl="taille" title="Agrandir ou réduire"></div>`;
  document.body.appendChild(f);
  placerFlottant(f);
  return f;
}
function placerFlottant(f) {
  const w = Math.max(240, Math.min(flottantPos && flottantPos.w || 380, innerWidth - 8)), x = flottantPos && flottantPos.x != null ? flottantPos.x : innerWidth - w - 12, y = flottantPos && flottantPos.y != null ? flottantPos.y : 70;
  if (flottantPos && flottantPos.h) f.style.height = Math.max(120, Math.min(flottantPos.h, innerHeight - 8)) + "px"; else f.style.height = "";
  const h = f.hidden ? 0 : f.offsetHeight;
  f.style.width = w + "px"; f.style.left = Math.max(4, Math.min(innerWidth - w - 4, x)) + "px"; f.style.top = Math.max(4, Math.min(innerHeight - Math.max(40, h) - 4, y)) + "px";
}
function majFlottant(html, titre = "Programme de l'oie") { const f = fenetreFlottante(); f.querySelector(".fl-titre").textContent = titre; f.querySelector(".fl-corps").innerHTML = html; f.hidden = false; placerFlottant(f); }
function cacherFlottant() { const f = document.getElementById("flottant"); if (f) f.hidden = true; }
setInterval(() => { if (!editeurActif() || partie.fin || (niv.sorte === "crue" && gardien.etat === "fini")) cacherFlottant(); }, 300);
let flTenu = null;
document.addEventListener("pointerdown", e => {
  const f = document.getElementById("flottant"); if (!f) return;
  const R = f.getBoundingClientRect();
  if (e.target.closest('[data-fl="taille"]')) { flTenu = { taille: true, w0: R.width, h0: R.height, x0: e.clientX, y0: e.clientY }; e.preventDefault(); return; }
  const barre = e.target.closest('[data-fl="barre"]'); if (!barre || e.target.closest("button")) return;
  flTenu = { dx: e.clientX - R.left, dy: e.clientY - R.top }; e.preventDefault();
});
document.addEventListener("pointermove", e => {
  if (!flTenu) return; const f = document.getElementById("flottant"), R = f.getBoundingClientRect();
  if (flTenu.taille) flottantPos = { x: R.left, y: R.top, w: Math.max(240, flTenu.w0 + e.clientX - flTenu.x0), h: Math.max(120, flTenu.h0 + e.clientY - flTenu.y0) };
  else flottantPos = { ...(flottantPos || {}), x: e.clientX - flTenu.dx, y: e.clientY - flTenu.dy };
  placerFlottant(f);
});
document.addEventListener("pointerup", () => { if (flTenu) { flTenu = null; try { localStorage.setItem("crapaudIbis.flottant", JSON.stringify(flottantPos)); } catch (e) { } } });
addEventListener("resize", () => { const f = document.getElementById("flottant"); if (f) placerFlottant(f); });
document.addEventListener("click", e => {
  const b = e.target.closest("[data-fl]"); if (!b) return;
  const f = fenetreFlottante();
  if (b.dataset.fl === "replier") { f.classList.toggle("replie"); b.textContent = f.classList.contains("replie") ? "▢" : "–"; }
  else if (b.dataset.fl === "ouvrir") { f.hidden = false; f.classList.remove("replie"); f.querySelector('[data-fl="replier"]').textContent = "–"; flottantPos = null; placerFlottant(f); }
});
// un bloc, dans la palette (k = "pal") ou dans le programme (k = son rang)
function blocCh(I, k, actif) {
  const nombre = I.t === "av" ? `<span class="be-nombre"><button type="button" data-be-n="${k}" data-d="-1">−</button><b>${I.n}</b><button type="button" data-be-n="${k}" data-d="1">+</button></span>` : "";
  const texte = I.t === "av" ? `avancer de ${nombre} coudée${I.n > 1 ? "s" : ""}` : I.t === "d" ? "tourner ↻ de 90°" : "tourner ↺ de 90°";
  return `<div class="be-bloc be-${I.t}${actif ? " actif" : ""}" data-be-bloc="${k}" data-t="${I.t}">${texte}</div>`;
}
const cheminActifCh = P => P.exec && P.exec.plat && P.exec.plat[P.exec.i - 1] ? P.exec.plat[P.exec.i - 1].chemin : null;
document.addEventListener("click", e => {
  const b = e.target.closest("[data-cr]");
  if (!b || b.disabled || !niv || niv.sorte !== "crue" || P.exec || gardien.etat === "fini") return;
  const c = b.dataset.cr;
  if (c === "monter") { P.bascule = { t: 0 }; son("allume"); }
  else if (c === "montrer") P.montre = true;
  else if (c === "effacer") P.prog = [];
  else if (c === "lancer") { const C = P.champs[P.salle]; P.exec = { plat: aplatir(P.prog), i: 0, phase: "pause", t: 0, pos: [...C.borne], dir: 0, ang: -Math.PI / 2, trace: [[...C.borne]], noeuds: [[...C.borne]], px: caseCh(...C.borne) }; $("retour").className = "vide"; son("allume"); }
  afficherQuestion();
});
// --- les programmes peuvent contenir des « répéter … fois » : un bloc est repéré par son chemin (« 3 », « 3/1 »…)
const estRep = I => I && I.t === "rep";
function trouverListe(prog, chemin) {
  const parts = String(chemin).split("/").map(Number); let liste = prog;
  for (let k = 0; k < parts.length - 1; k++) liste = liste[parts[k]].corps;
  return { liste, rang: parts[parts.length - 1] };
}
const blocDe = (prog, chemin) => { const { liste, rang } = trouverListe(prog, chemin); return liste[rang]; };
const listeDeZone = (prog, chemin) => chemin === "" ? prog : blocDe(prog, chemin).corps;
const compterBlocs = L => L.reduce((n, I) => n + 1 + (estRep(I) ? compterBlocs(I.corps) : 0), 0);
function aplatir(L, prefixe = "") {
  const r = [];
  L.forEach((I, i) => { const ch = prefixe === "" ? String(i) : prefixe + "/" + i; if (estRep(I)) { for (let n = 0; n < I.n; n++) r.push(...aplatir(I.corps, ch)); } else r.push({ I, chemin: ch }); });
  return r;
}
const nombreBloc = (ch, v) => `<span class="be-nombre"><button type="button" data-be-n="${ch}" data-d="-1">−</button><b>${v}</b><button type="button" data-be-n="${ch}" data-d="1">+</button></span>`;
function blocsHTML(L, prefixe, rendre, actif) {
  return L.map((I, i) => { const ch = prefixe === "" ? String(i) : prefixe + "/" + i; return estRep(I) ? blocRepeter(I, ch, rendre, actif) : rendre(I, ch, actif === ch); }).join("");
}
// le bloc « répéter », en forme de C : on glisse d'autres blocs à l'intérieur
function blocRepeter(I, ch, rendre, actif) {
  const pal = ch === "palrep", dedans = actif && String(actif).startsWith(ch + "/");
  return `<div class="be-bloc be-rep${dedans ? " actif-rep" : ""}" data-be-bloc="${ch}" data-t="rep"><div class="be-rep-tete">répéter ${nombreBloc(ch, I.n)} fois</div>
    <div class="be-corps${pal ? " be-corps-pal" : ""}"${pal ? "" : ` data-be="corps" data-chemin="${ch}"`}>${pal ? "" : blocsHTML(I.corps, ch, rendre, actif) + (I.corps.length ? "" : `<div class="be-vide">glisse des blocs ici</div>`)}</div><div class="be-rep-pied"></div></div>`;
}
// --- l'éditeur à blocs, commun à la gerboise (plateau 1) et à l'oie (plateau 5) : chaque plateau décrit son programme
function editeurActif() {
  if (!niv || !P) return null;
  const repeter = () => ({ t: "rep", type: "rep", n: P.nRep || 2, corps: [] });
  const reglerRep = (k, d) => { if (k === "palrep") { P.nRep = Math.max(2, Math.min(10, (P.nRep || 2) + d)); return true; } const I = k.startsWith("pal") ? null : blocDe(P.prog, k); if (estRep(I)) { I.n = Math.max(2, Math.min(10, I.n + d)); return true; } return false; };
  if (niv.sorte === "crue" && P.montre && P.vue !== "face" && P.champs) return {
    prog: P.prog, verrou: !!P.exec, max: 16,
    nouveau: t => t === "rep" ? repeter() : t === "av" ? { t: "av", n: P.n } : { t },
    regler: (k, d) => { if (reglerRep(k, d)) return; if (k === "pal") P.n = Math.max(1, Math.min(12, P.n + d)); else { const I = blocDe(P.prog, k); I.n = Math.max(1, Math.min(12, I.n + d)); } }
  };
  if (niv.sorte === "barque" && P.montre && !P.aube && P.fleuves) return {
    prog: P.prog, verrou: !!P.exec, max: P.fleuves[P.salle].max,
    nouveau: t => t === "rep" ? repeter() : t === "av" ? { t: "av", n: P.n } : { t },
    regler: (k, d) => { if (reglerRep(k, d)) return; if (k === "pal") P.n = Math.max(1, Math.min(12, P.n + d)); else { const I = blocDe(P.prog, k); I.n = Math.max(1, Math.min(12, I.n + d)); } }
  };
  if (niv.sorte === "nil" && P.td && (P.td.phase === "script" || P.td.phase === "execution")) return {
    prog: P.prog, verrou: P.td.phase !== "script", max: 16,
    nouveau: t => t === "rep" ? repeter() : t === "sauter" ? { type: "sauter" } : { type: "tourner", sens: t === "g" ? "gauche" : "droite", deg: P.degPal || 30 },
    regler: (k, d) => { if (reglerRep(k, d)) return; if (k === "pal") P.degPal = Math.max(30, Math.min(90, (P.degPal || 30) + 30 * d)); else { const I = blocDe(P.prog, k); I.deg = Math.max(30, Math.min(90, I.deg + 30 * d)); } }
  };
  return null;
}
// --- l'éditeur à blocs : glisser depuis la palette pour accrocher, glisser dans le programme pour déplacer,
// glisser hors du programme (ou sur la poubelle) pour décrocher ; un simple clic sur un bloc de la palette l'ajoute à la fin
document.addEventListener("click", e => {
  const b = e.target.closest("[data-be-n]"), Ed = editeurActif();
  if (!b || !Ed || Ed.verrou) return;
  Ed.regler(b.dataset.beN, +b.dataset.d);
  afficherQuestion();
});
let glisse = null;
function programmeVise(x, y) {
  const zones = [...document.querySelectorAll('[data-be="prog"], [data-be="corps"]')].filter(z => !(glisse && glisse.el.contains(z)) && z.offsetParent);
  let zone = null;
  for (const z of zones) { const R = z.getBoundingClientRect(), haut = z.dataset.be === "prog"; if (x >= R.left - (haut ? 10 : 0) && x <= R.right + (haut ? 10 : 0) && y >= R.top - (haut ? 10 : 2) && y <= R.bottom + (haut ? 30 : 2) && (!zone || zone.contains(z))) zone = z; }
  if (!zone) return null;
  const blocs = [...zone.children].filter(el => el.matches("[data-be-bloc]") && el !== (glisse && glisse.el));
  let rang = blocs.length; for (let k = 0; k < blocs.length; k++) { const r = blocs[k].getBoundingClientRect(); if (y < r.top + Math.min(r.height / 2, 12)) { rang = k; break; } }
  return { zone, chemin: zone.dataset.chemin || "", blocs, rang };
}
function marquerInsertion(V) {
  document.querySelectorAll(".be-insert").forEach(el => el.remove());
  if (!V) return;
  const barre = document.createElement("div"); barre.className = "be-insert";
  if (V.rang < V.blocs.length) V.blocs[V.rang].before(barre);
  else if (V.blocs.length) V.blocs[V.blocs.length - 1].after(barre);
  else { const ch = V.zone.querySelector(":scope > .be-chapeau"); if (ch) ch.after(barre); else V.zone.prepend(barre); }
}
document.addEventListener("pointerdown", e => {
  const el = e.target.closest("[data-be-bloc]");
  const Ed = editeurActif();
  if (!el || e.target.closest("button") || !Ed || Ed.verrou) return;
  e.preventDefault();
  const R = el.getBoundingClientRect();
  glisse = { el, source: el.dataset.beBloc, t: el.dataset.t, x0: e.clientX, y0: e.clientY, dx: e.clientX - R.left, dy: e.clientY - R.top, bouge: false, fantome: null };
});
document.addEventListener("pointermove", e => {
  if (!glisse) return;
  if (!glisse.bouge && Math.hypot(e.clientX - glisse.x0, e.clientY - glisse.y0) < 5) return;
  if (!glisse.bouge) {
    glisse.bouge = true;
    const f = glisse.el.cloneNode(true); f.classList.add("be-fantome"); f.style.width = glisse.el.getBoundingClientRect().width + "px"; document.body.appendChild(f); glisse.fantome = f;
    if (!glisse.source.startsWith("pal")) glisse.el.classList.add("be-parti");
  }
  glisse.fantome.style.left = (e.clientX - glisse.dx) + "px"; glisse.fantome.style.top = (e.clientY - glisse.dy) + "px";
  const V = programmeVise(e.clientX, e.clientY), poub = document.querySelector('[data-be="poubelle"]'), Rp = poub && poub.getBoundingClientRect();
  const surPoubelle = Rp && e.clientX >= Rp.left && e.clientX <= Rp.right && e.clientY >= Rp.top && e.clientY <= Rp.bottom;
  const dePalette = glisse.source.startsWith("pal");
  glisse.fantome.classList.toggle("be-supprime", !dePalette && (!V || surPoubelle));
  if (poub) poub.classList.toggle("vise", !!surPoubelle && !dePalette);
  marquerInsertion(surPoubelle ? null : V); glisse.cible = surPoubelle ? null : V;
});
document.addEventListener("pointerup", e => {
  if (!glisse) return;
  const G = glisse; glisse = null;
  if (G.fantome) G.fantome.remove(); marquerInsertion(null);
  const Ed = editeurActif(); if (!Ed) return;
  const dePalette = G.source.startsWith("pal");
  if (!G.bouge) { if (dePalette && compterBlocs(Ed.prog) < Ed.max) { Ed.prog.push(Ed.nouveau(G.t)); son("bois"); afficherQuestion(); } return; }
  const V = G.cible, cible = V ? listeDeZone(Ed.prog, V.chemin) : null;        // la liste visée, repérée avant de décrocher le bloc
  if (dePalette) { if (cible && compterBlocs(Ed.prog) < Ed.max) { cible.splice(V.rang, 0, Ed.nouveau(G.t)); son("bois"); } }
  else { const { liste, rang } = trouverListe(Ed.prog, G.source), [I] = liste.splice(rang, 1); if (cible) cible.splice(V.rang, 0, I); else son("croc"); }
  afficherQuestion();
});
// --- l'exécution : l'oie suit le programme, coudée par coudée ; puis on vérifie le champ tracé
const DIRS_CH = [[0, -1], [1, 0], [0, 1], [-1, 0]];        // 0 : vers le haut, puis dans le sens des aiguilles d'une montre
function verdictChamp(C, E) {
  const [b0, b1] = C.borne, fin = E.pos;
  if (fin[0] !== b0 || fin[1] !== b1) return { ok: false, msg: "L'oie n'est pas revenue à la borne : le champ n'est pas fermé. Il faut faire tout le tour !" };
  const xs = E.trace.map(p => p[0]), ys = E.trace.map(p => p[1]), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys), w = x1 - x0, h = y1 - y0;
  let long = 0; for (let k = 1; k < E.trace.length; k++) long += Math.abs(E.trace[k][0] - E.trace[k - 1][0]) + Math.abs(E.trace[k][1] - E.trace[k - 1][1]);
  const surBord = E.trace.every(([i, j]) => i === x0 || i === x1 || j === y0 || j === y1);
  if (!w || !h || !surBord || long !== 2 * (w + h)) return { ok: false, msg: "La corde ne dessine pas un rectangle bien fermé : vérifie l'ordre des instructions." };
  if (h !== C.a || w !== C.b) return { ok: false, msg: `Le champ tracé mesure ${h} coudées le long du canal et ${w} de large : ce n'est pas le champ de ${C.nom}.` };
  return { ok: true, rect: { x0, x1, y0, y1 } };
}
function bougerCrue(P) {
  if (P.bascule) { if (++P.bascule.t === 20) { P.vue = "dessus"; afficherQuestion(); } if (P.bascule.t >= 40) P.bascule = null; return; }
  if (P.vue === "face") return;
  if (P.pousse) P.pousse.t++;
  if (P.sortie) { if (++P.sortie === 90) plateauFranchi(); return; }
  if (P.attente) { if (--P.attente === 0) { P.salle++; Object.assign(P, { montre: false, prog: [], pousse: null }); afficherQuestion(); } return; }
  const E = P.exec; if (!E) return;
  const C = P.champs[P.salle];
  if (E.phase === "pause") { if (++E.t < 8) return; E.t = 0;
    if (E.i >= E.plat.length) { const V = verdictChamp(C, E); E.phase = V.ok ? "fin" : "rate"; E.t = 0;
      if (V.ok) { compterReponse(true); son("bravo"); gardien.justes++; majCompteur(); P.pousse = { ...V.rect, t: 0 }; messageTemple(`Le champ de ${C.nom} est retracé : le blé peut pousser !`, true); }
      else { compterReponse(false); son("croc"); messageTemple(V.msg, false); }
      afficherQuestion(); return; }
    const I = E.plat[E.i++].I; afficherQuestion();
    if (I.t === "av") { E.phase = "marche"; E.reste = I.n; E.t = 0; E.de = caseCh(...E.pos); }
    else { E.phase = "tourne"; E.t = 0; E.angDe = E.ang; E.dir = (E.dir + (I.t === "d" ? 1 : 3)) % 4; E.angA = E.angDe + (I.t === "d" ? 1 : -1) * Math.PI / 2; }
    return; }
  if (E.phase === "tourne") { E.t++; E.ang = E.angDe + (E.angA - E.angDe) * Math.min(1, E.t / 10); if (E.t >= 10) { E.phase = "pause"; E.t = 0; } return; }
  if (E.phase === "marche") {
    const [dx, dy] = DIRS_CH[E.dir], suiv = [E.pos[0] + dx, E.pos[1] + dy];
    if (E.t === 0 && (suiv[0] < C.zone.x0 || suiv[0] > C.zone.x1 || suiv[1] < C.zone.y0 || suiv[1] > C.zone.y1)) {
      const dansCanal = suiv[0] < C.zone.x0 ? C.sens > 0 : suiv[0] > C.zone.x1 ? C.sens < 0 : false;
      E.phase = "rate"; E.t = 0; compterReponse(false); son(dansCanal ? "plouf" : "croc");
      messageTemple(dansCanal ? "Plouf ! L'oie est entrée dans le canal. Le champ est de l'autre côté de la borne : corrige le programme." : "Oh non ! L'oie piétine le blé du voisin : le champ ne va pas jusque-là. Corrige le programme.", false);
      afficherQuestion(); return; }
    E.t++; const [x0, y0] = caseCh(...E.pos), [x1, y1] = caseCh(...suiv), u = Math.min(1, E.t / 8);
    E.px = [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
    if (E.t >= 8) { E.pos = suiv; E.t = 0; E.trace.push([...suiv]); E.noeuds.push([...suiv]); if (--E.reste <= 0) { E.phase = "pause"; } }
    return; }
  if (E.phase === "fin") { if (++E.t >= 70) { P.exec = null; if (gardien.justes >= 3) { gardien.etat = "fini"; P.sortie = 1; } else P.attente = 40; afficherQuestion(); } return; }
  if (E.phase === "rate") { if (++E.t >= 60) { P.exec = null; afficherQuestion(); } }
}
// ============================================================
//  PLATEAU 6 — LE PUITS ET LA DALLE DE GRANIT (calcul astucieux, chronométré par le sable)
//  Le crapaud glisse au fond d'un puits : il est enfermé. Le sable coule de la gueule d'une tête de lion sculptée, et
//  (par un mécanisme qu'on ne voit pas) une dalle de granit descend dans ses rainures : elle risque de l'écraser. À droite, un
//  tunnel est bouché par cinq pierres en file : chaque calcul juste en fait s'effondrer une (la 5, puis la 4…), la 1 libère le passage.
//  Si la dalle arrive en bas, elle remonte un peu… mais une pierre retombe dans le passage.
// ============================================================
const SAL = { sol: 152, mg: 58, md: 182, haut: -10, ech: 1.5, lion: [58, 66], porte: { x: 182, y: 128, w: 58, h: 24 } };   // le puits entre x = 58 et 182
SAL.hb = 42; SAL.bas = SAL.sol - HH * SAL.ech - SAL.hb - 1;            // la dalle fait 42 de haut ; en bas, elle touche le crapaud
const NB_PIERRES = 5;                                                    // cinq pierres en file dans le tunnel ; elles s'effondrent de la 5 (la plus loin) à la 1
// --- les calculs astucieux
function qAstucieux(k) {
  const h = (a, b) => a + Math.floor(Math.random() * (b - a + 1)), sep = n => n.toLocaleString("fr-FR");
  for (let essai = 0; essai < 50; essai++) {
    let html, r, corr;
    if ((k + h(0, 1)) % 2 === 0) {                                  // regrouper les facteurs pour faire 10, 100 ou 1 000
      const [a, b, p] = [[2, 5, 10], [5, 2, 10], [4, 25, 100], [25, 4, 100], [20, 5, 100], [50, 2, 100], [8, 125, 1000], [125, 8, 1000]][h(0, k < 2 ? 3 : 7)];
      const m = h(11, 99); r = m * p;
      html = `${a} × ${m} × ${b}`; corr = `${a} × ${b} = ${sep(p)}, donc ${a} × ${m} × ${b} = ${m} × ${sep(p)} = ${sep(r)}.`;
    } else {                                                         // partir d'un nombre presque rond
      const forme = h(0, 3);
      if (forme === 0) { const n = [99, 101, 999, 98][h(0, k < 3 ? 1 : 3)], m = h(3, 9), rond = n > 500 ? 1000 : 100, ec = n - rond; r = n * m; html = `${n} × ${m}`; corr = `${n} = ${rond} ${ec < 0 ? "−" : "+"} ${Math.abs(ec)}, donc ${n} × ${m} = ${sep(rond * m)} ${ec < 0 ? "−" : "+"} ${Math.abs(ec * m)} = ${sep(r)}.`; }
      else if (forme === 1) { const n = [99, 199, 98, 298][h(0, 3)], m = h(13, 87), rond = Math.round(n / 100) * 100, ec = rond - n; r = n + m; html = `${n} + ${m}`; corr = `${n} + ${m} = ${rond} + ${m} − ${ec} = ${sep(r)}.`; }
      else if (forme === 2) { const n = [49, 51, 19, 21][h(0, 3)], m = h(3, 9), rond = Math.round(n / 10) * 10, ec = n - rond; r = n * m; html = `${m} × ${n}`; corr = `${n} = ${rond} ${ec < 0 ? "−" : "+"} ${Math.abs(ec)}, donc ${m} × ${n} = ${m * rond} ${ec < 0 ? "−" : "+"} ${Math.abs(ec * m)} = ${sep(r)}.`; }
      else { const m = h(120, 480), n = [99, 98, 199][h(0, 2)], rond = Math.round(n / 100) * 100, ec = rond - n; r = m - n; html = `${m} − ${n}`; corr = `${m} − ${n} = ${m} − ${rond} + ${ec} = ${sep(r)}.`; }
    }
    if (dejaPosees.has(html)) continue; dejaPosees.add(html);
    return qMaths(`Calcule astucieusement :<div class="gros">${html}</div>`, r, corr, { placeholder: "ton résultat" });
  }
  return qMaths(`Calcule astucieusement :<div class="gros">25 × 17 × 4</div>`, 1700, "25 × 4 = 100, donc 25 × 17 × 4 = 1 700.");
}
// --- le décor fixe : le puits en coupe, ses grands blocs, sa frise effacée, ses rainures ; le tunnel voûté, à droite
function blocsAppareil(x0, x1, y0, y1, graine, clair, sombre) {         // un mur de grands blocs de taille inégale, chacun nuancé
  for (let y = y0, r = 0; y < y1; y += 16, r++) {
    let x = x0 - bruit(graine + r) * 20;
    while (x < x1) {
      const w = 18 + bruit(graine + r * 7 + x) * 22, n = bruit(graine + x * 3 + r);
      ctx.fillStyle = melange(clair, sombre, .25 + n * .45); ctx.fillRect(x, y, w, 16);
      ctx.fillStyle = "rgba(255,240,210,.08)"; ctx.fillRect(x, y, w, 1.4);
      ctx.fillStyle = "rgba(20,10,4,.25)"; ctx.fillRect(x, y + 14.8, w, 1.2); ctx.fillRect(x + w - 1, y, 1, 16);
      for (let k = 0; k < 4; k++) { ctx.fillStyle = `rgba(${bruit(k + x) > .5 ? "255,240,210" : "40,20,8"},.06)`; ovale(x + bruit(k + x + 1) * w, y + bruit(k + x + 2) * 16, 2 + bruit(k + x + 3) * 5, 1 + bruit(k + x + 4) * 2); }
      x += w;
    }
  }
}
function peindreSalleBloc() {
  ctx.fillStyle = "#2a1a0e"; ctx.fillRect(0, 0, L, H);
  // le fond du puits
  blocsAppareil(SAL.mg, SAL.md, 0, SAL.sol, 11, "b8945e", "6a4a2e");
  for (let c = 0, x = SAL.mg + 4; x < SAL.md; x += 8, c++) for (let r = 0, y = 70; y < SAL.sol - 6; y += 8, r++) hieroglyphe(x, y, 1.1, Math.floor(bruit(c * 37 + r * 13) * 9), "rgba(40,22,8,.2)");
  // une frise peinte, à moitié effacée par le temps
  for (let x = SAL.mg, k = 0; x < SAL.md; x += 5, k++) { if (bruit(k + 70) < .3) continue; ctx.fillStyle = ["rgba(31,78,140,.55)", "rgba(181,64,42,.55)", "rgba(58,154,122,.5)", "rgba(212,165,53,.6)"][k % 4]; ctx.fillRect(x, 56, 4, 3); }
  ctx.fillStyle = "rgba(212,165,53,.35)"; ctx.fillRect(SAL.mg, 54.6, SAL.md - SAL.mg, .8); ctx.fillRect(SAL.mg, 59.6, SAL.md - SAL.mg, .8);
  // l'ombre du haut du puits : plus on monte, plus il fait sombre… sauf le rai de lumière
  const go = ctx.createLinearGradient(0, 0, 0, SAL.sol); go.addColorStop(0, "rgba(10,5,2,.65)"); go.addColorStop(.5, "rgba(10,5,2,.2)"); go.addColorStop(1, "rgba(10,5,2,.35)"); ctx.fillStyle = go; ctx.fillRect(SAL.mg, 0, SAL.md - SAL.mg, SAL.sol);
  // les deux murs coupés : plus clairs (on est devant), avec la rainure sombre où glisse la dalle
  for (const [x0, x1, g] of [[0, SAL.mg, 31], [SAL.md, L, 47]]) {
    blocsAppareil(x0, x1, 0, H, g, "c8a46e", "8a6a44");
    const bord = x0 === 0 ? x1 : x0, sens = x0 === 0 ? -1 : 1;
    const gr = ctx.createLinearGradient(bord, 0, bord + sens * 10, 0); gr.addColorStop(0, "rgba(10,5,2,.55)"); gr.addColorStop(1, "rgba(10,5,2,0)"); ctx.fillStyle = gr; ctx.fillRect(Math.min(bord, bord + sens * 10), 0, 10, H);
    ctx.fillStyle = "#140a04"; ctx.fillRect(bord + (sens < 0 ? -3 : 0), 0, 3, SAL.sol);       // la rainure
  }
  // le sol : de grandes dalles, un peu de sable
  ctx.fillStyle = degrade(SAL.sol, H, "#a8845a", "#5a4028"); ctx.fillRect(SAL.mg, SAL.sol, SAL.md - SAL.mg, H - SAL.sol);
  ctx.fillStyle = "#d8b47a"; ctx.fillRect(SAL.mg, SAL.sol - .6, SAL.md - SAL.mg, 1.2);
  ctx.strokeStyle = "rgba(30,16,6,.35)"; ctx.lineWidth = .5; for (let x = SAL.mg + 20; x < SAL.md; x += 26) { ctx.beginPath(); ctx.moveTo(x, SAL.sol); ctx.lineTo(x - 4, H); ctx.stroke(); }
  // le tunnel voûté, à droite, à hauteur du crapaud : au bout, la lumière du dehors
  const D = SAL.porte;
  ctx.fillStyle = "#1a0e06"; ctx.beginPath(); ctx.moveTo(D.x - 2, D.y + D.h); ctx.lineTo(D.x - 2, D.y + 6); ctx.quadraticCurveTo(D.x - 2, D.y - 4, D.x + 10, D.y - 4); ctx.lineTo(L, D.y - 4); ctx.lineTo(L, D.y + D.h); ctx.fill();
  const gl = ctx.createLinearGradient(D.x, 0, L, 0); gl.addColorStop(0, "rgba(255,236,170,0)"); gl.addColorStop(1, "rgba(255,244,210,.95)"); ctx.fillStyle = gl; ctx.fillRect(D.x, D.y - 3, L - D.x, D.h + 3);
  ctx.strokeStyle = "#d8b47a"; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(D.x - 3, D.y + D.h); ctx.lineTo(D.x - 3, D.y + 6); ctx.quadraticCurveTo(D.x - 3, D.y - 5, D.x + 10, D.y - 5); ctx.lineTo(L, D.y - 5); ctx.stroke();
}
// la tête de lion, sculptée dans le mur gauche, tournée vers le puits, la gueule grande ouverte
function teteLion(lx, ly) {
  ctx.save(); ctx.translate(lx, ly);
  ctx.fillStyle = "rgba(0,0,0,.35)"; ovale(8, 3, 15, 14);
  // la grande crinière ronde, en mèches rayonnantes
  for (let k = 0; k < 18; k++) { const an = k / 18 * Math.PI * 2, r0 = 6, r1 = 13 + (k % 2) * 1.6; ctx.fillStyle = k % 2 ? "#a87e4c" : "#b88e58";
    ctx.beginPath(); ctx.moveTo(5 + Math.cos(an - .18) * r0, Math.sin(an - .18) * r0); ctx.lineTo(5 + Math.cos(an) * r1, Math.sin(an) * r1); ctx.lineTo(5 + Math.cos(an + .18) * r0, Math.sin(an + .18) * r0); ctx.fill(); }
  ctx.fillStyle = "#c8a068"; rond(5, 0, 9);
  // la face ronde, les oreilles, le museau large et court
  const g = ctx.createRadialGradient(4, -3, 1, 6, 0, 10); g.addColorStop(0, "#f0d8a8"); g.addColorStop(1, "#c09868"); ctx.fillStyle = g; rond(7, 0, 7.4);
  ctx.fillStyle = "#b88e58"; rond(3, -7, 2); rond(10, -7.4, 2); ctx.fillStyle = "#8a6440"; rond(3, -7, .9); rond(10, -7.4, .9);
  ctx.fillStyle = "#e8cc96"; ctx.beginPath(); ctx.ellipse(12, 1.4, 5, 3.6, 0, 0, Math.PI * 2); ctx.fill();               // le museau, vers le puits
  ctx.fillStyle = "#6a4426"; ctx.beginPath(); ctx.moveTo(14.6, -1.2); ctx.lineTo(17, -.4); ctx.lineTo(15, 1); ctx.fill();   // le nez
  ctx.fillStyle = "#2a1408"; ctx.beginPath(); ctx.ellipse(13.4, 4.4, 3.6, 2.4, 0, 0, Math.PI * 2); ctx.fill();            // la gueule grande ouverte
  ctx.fillStyle = "#f2ead8"; poly([[11.4, 2.4], [12, 4], [12.6, 2.4]], "#f2ead8"); poly([[14.6, 2.6], [15.2, 4.2], [15.8, 2.6]], "#f2ead8");   // les crocs
  ctx.fillStyle = "#3a2410"; ovale(8.4, -2.6, 1.6, 1.1); ovale(12.6, -2.8, 1.3, 1); ctx.fillStyle = "#e8b040"; rond(8.6, -2.6, .55); rond(12.8, -2.8, .45);   // les yeux
  ctx.strokeStyle = "rgba(90,60,30,.5)"; ctx.lineWidth = .45; ctx.beginPath(); ctx.moveTo(6.4, -4.6); ctx.quadraticCurveTo(9, -5.4, 10.4, -4.4); ctx.stroke();
  ctx.restore();
}
// une des cinq pierres taillées qui bouchent le tunnel
function pierreMur(x, y, w, h, n) {
  ctx.fillStyle = degrade(y, y + h, "#d8b47a", "#9a7444"); ctx.fillRect(x, y, w, h);
  ctx.fillStyle = "rgba(255,244,220,.3)"; ctx.fillRect(x, y, w, 1.4); ctx.fillStyle = "rgba(40,20,8,.45)"; ctx.fillRect(x + w - 1.2, y, 1.2, h); ctx.fillRect(x, y + h - 1, w, 1);
  ctx.strokeStyle = "rgba(90,60,30,.35)"; ctx.lineWidth = .3; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(x + 2 + k * 3, y + 3); ctx.lineTo(x + 1 + k * 3, y + h - 4); ctx.stroke(); }   // les traces du ciseau
  ctx.fillStyle = "rgba(70,40,16,.75)"; ctx.font = "bold 5.6px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(String(n), x + w / 2, y + h / 2 + 2); ctx.textAlign = "left";
}
const descenteBloc = P => SAL.haut + (SAL.bas - SAL.haut) * Math.min(1, P.bloc);
function decorBloc(P, t) {
  ctx.drawImage(fondPeint("salleBloc2", peindreSalleBloc), 0, 0, L, H);
  const D = SAL.porte, pw = (L - D.x) / NB_PIERRES, [lx, ly] = SAL.lion;
  // le rai de soleil qui tombe de l'ouverture du puits, en biais, et la poussière qui y danse
  ctx.save(); ctx.globalCompositeOperation = "lighter";
  const gr = ctx.createLinearGradient(150, 0, 96, SAL.sol); gr.addColorStop(0, "rgba(255,226,150,.28)"); gr.addColorStop(1, "rgba(255,226,150,.04)");
  ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(132, 0); ctx.lineTo(172, 0); ctx.lineTo(130, SAL.sol); ctx.lineTo(84, SAL.sol); ctx.fill();
  ctx.restore();
  for (let k = 0; k < 18; k++) { const u = bruit(k + 80), y = (bruit(k + 81) * SAL.sol + t * (.1 + u * .1)) % SAL.sol, x = 150 - y * .32 + (u - .5) * 30 + Math.sin(t / 25 + k) * 2; ctx.fillStyle = `rgba(255,236,190,${.25 + .25 * Math.sin(t / 10 + k)})`; rond(x, y, .5); }
  // la torche, au-dessus du tunnel
  { const x = D.x - 8, y = D.y - 22, f = Math.sin(t / 3) * .6 + Math.sin(t / 1.7) * .4, g = ctx.createRadialGradient(x, y, 1, x, y, 38); g.addColorStop(0, "rgba(255,170,80,.4)"); g.addColorStop(1, "rgba(255,140,60,0)"); ctx.fillStyle = g; ctx.fillRect(x - 38, y - 38, 76, 76);
    ctx.fillStyle = "#5a3a1e"; ctx.fillRect(x - .8, y + 2, 1.6, 8); ctx.fillStyle = "rgba(255,120,40,.95)"; ovale(x, y - 1 - f * .4, 2.2, 3.4 + f); ctx.fillStyle = "rgba(255,226,130,.95)"; ovale(x, y, 1, 1.8); }
  // les cinq pierres du tunnel, de 1 (contre le puits) à 5 (au bout) ; elles s'effondrent de la 5 à la 1
  for (let i = 0; i < NB_PIERRES; i++) {
    const rang = NB_PIERRES - 1 - i, x = D.x + i * pw;
    if (rang >= P.otees) pierreMur(x, D.y - 2, pw, D.h + 2, i + 1);
    else if (P.chute && P.chute.k === rang) {
      const u = Math.min(1, P.chute.t / 24);
      for (let e = 0; e < 9; e++) { const ex = x + pw * bruit(e + i * 7), ey = D.y + D.h * bruit(e + i * 7 + 3) * (1 - u) + u * u * D.h; ctx.fillStyle = `rgba(200,164,110,${1 - u * .7})`; ctx.fillRect(ex, Math.min(D.y + D.h - 2, ey), 2.6, 2.2); }
      ctx.fillStyle = `rgba(232,210,170,${.5 * (1 - u)})`; ovale(x + pw / 2, D.y + D.h - 4, pw * (.6 + u), 4 + u * 6);          // le nuage de poussière
    }
  }
  // la dalle de granit rose d'Assouan, qui descend dans ses rainures (elle passe à côté de la tête de lion)
  const yb = descenteBloc(P), xb = SAL.mg + 24, bw = SAL.md - xb + 3, hb = SAL.hb;
  ctx.fillStyle = `rgba(0,0,0,${.12 + .4 * P.bloc})`; ovale(xb + bw / 2, SAL.sol + 1, bw / 2 * (.55 + .45 * P.bloc), 2.4);
  const gd = ctx.createLinearGradient(0, yb, 0, yb + hb); gd.addColorStop(0, "#c49a8a"); gd.addColorStop(.6, "#9a7068"); gd.addColorStop(1, "#6a4a46"); ctx.fillStyle = gd; ctx.fillRect(xb, yb, bw, hb);
  for (let k = 0; k < 140; k++) { const n = bruit(k + 200); ctx.fillStyle = n < .4 ? "rgba(30,20,20,.55)" : n < .7 ? "rgba(255,240,235,.5)" : "rgba(200,110,100,.6)"; ctx.fillRect(xb + bruit(k + 201) * bw, yb + bruit(k + 202) * hb, .8 + bruit(k + 203), .8); }
  ctx.fillStyle = "rgba(255,240,230,.3)"; ctx.fillRect(xb, yb, bw, 1.6); ctx.fillStyle = "rgba(20,10,10,.45)"; ctx.fillRect(xb, yb + hb - 2, bw, 2);
  // le disque ailé gravé au milieu de la dalle, avec des restes d'or
  { const cx = xb + bw / 2, cy = yb + hb / 2; ctx.fillStyle = "rgba(212,165,53,.55)"; rond(cx, cy, 3.4); ctx.strokeStyle = "rgba(60,30,24,.55)"; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(cx, cy, 3.4, 0, 7); ctx.stroke();
    for (const c of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + c * 4, cy - 1); ctx.quadraticCurveTo(cx + c * 14, cy - 5, cx + c * 26, cy - 3); ctx.quadraticCurveTo(cx + c * 14, cy + 1, cx + c * 4, cy + 2); ctx.stroke(); for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(cx + c * (4 + k * 5), cy - 2.4 - k * .3); ctx.lineTo(cx + c * (4 + k * 5), cy + 1.4); ctx.stroke(); } } }
  // la poussière qui tombe des bords de la dalle quand elle bouge
  const bouge = question && !suiteEnAttente && !P.ecrase && P.otees < NB_PIERRES && !P.glisse;
  if (bouge) for (let k = 0; k < 6; k++) { const u = ((t * .04 + k / 6) % 1); ctx.fillStyle = `rgba(220,200,170,${.5 * (1 - u)})`; rond(k % 2 ? xb + 1 : xb + bw - 1, yb + hb + u * 30, .5); }
  // la tête de lion et le sable qui jaillit de sa gueule, en arc, et s'entasse
  teteLion(lx, ly);
  if (bouge) { ctx.strokeStyle = "rgba(226,192,122,.55)"; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(lx + 14, ly + 5); ctx.quadraticCurveTo(lx + 21, ly + 8, lx + 22, SAL.sol); ctx.stroke();
    for (let k = 0; k < 26; k++) { const u = ((t * .03 + k / 26) % 1), x = lx + 14 + 8 * Math.sqrt(u) + (bruit(k) - .5) * 1.6, y = ly + 5 + (SAL.sol - ly - 5) * u * u; ctx.fillStyle = k % 4 ? "#e8c880" : "#fff0c0"; rond(x, y, .5); } }
  const tas = Math.min(1, P.bloc + P.tas);
  ctx.fillStyle = degrade(SAL.sol - 16, SAL.sol, "#e2c07a", "#b8904a"); ctx.beginPath(); ctx.moveTo(SAL.mg, SAL.sol); ctx.quadraticCurveTo(lx + 22, SAL.sol - 3 - 16 * tas, lx + 40 + 34 * tas, SAL.sol); ctx.fill();
  ctx.fillStyle = "rgba(255,244,210,.5)"; for (let k = 0; k < 8; k++) rond(SAL.mg + 6 + bruit(k + 90) * (24 + 30 * tas), SAL.sol - 1 - bruit(k + 91) * 8 * tas, .4);
  // le crapaud, plus grand ; écrasé, il s'aplatit un instant ; libéré, il file dans le tunnel
  const ex = P.sortie ? Math.min(L + 10, 104 + P.sortie * 1.6) : 104;
  const yGl = P.glisse ? -30 + (SAL.sol + 30) * Math.min(1, (P.glisse / 30) ** 2) : SAL.sol;
  ctx.save(); ctx.translate(ex, yGl); ctx.scale(SAL.ech, SAL.ech);
  if (P.ecrase) { const e = Math.max(.35, 1 - P.ecrase / 10); ctx.scale(1 + (1 - e) * .8, e); }
  dessinerCrapaud({ x: -HW / 2, y: -HH, auSol: !P.glisse, dir: 1, vx: P.sortie ? 1 : 0, vy: P.glisse ? 2 : 0 }, t); ctx.restore();
  // la jauge du danger : la place qui reste sous la dalle
  if (!P.sortie && !P.glisse) { const reste = 1 - Math.min(1, P.bloc); ctx.fillStyle = "rgba(20,12,6,.65)"; arrondi(8, 8, 46, 6, 2); ctx.fill(); ctx.fillStyle = reste > .3 ? "#7aa844" : "#d8503a"; ctx.fillRect(9, 9, 44 * reste, 4); }
  // le cadre sombre, pour l'ambiance
  const v = ctx.createRadialGradient(L / 2, H / 2, 70, L / 2, H / 2, 160); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.5)"); ctx.fillStyle = v; ctx.fillRect(0, 0, L, H);
}
function bougerBloc(P) {
  if (P.glisse) { if (++P.glisse >= 40) { P.glisse = 0; son("plouf"); afficherQuestion(); } return; }
  if (P.chute && ++P.chute.t >= 26) P.chute = null;
  if (P.sortie) { if (++P.sortie === 80) plateauFranchi(); return; }
  if (P.ecrase) { if (++P.ecrase >= 40) { P.ecrase = 0; P.bloc = .2; } return; }
  // le sable coule et le bloc descend, sauf quand on lit une correction ou entre deux questions
  if (!question || suiteEnAttente || gardien.etat !== "questions") return;
  P.bloc += 1 / (75 * 30) * (1 + P.otees * .1);
  if (P.bloc >= 1) {
    P.ecrase = 1; son("croc"); compterReponse(false);
    if (P.otees > 0) { P.otees--; gardien.justes = Math.max(0, gardien.justes - 1); majCompteur(); }
    messageTemple("La dalle est arrivée en bas : le crapaud s'est aplati de justesse ! Elle remonte un peu… mais une pierre est retombée dans le passage.", false);
  }
}
// ============================================================
//  LA PROMENADE DANS LES CHAMPS (vue de côté) : du ponton jusqu'à l'oie du Nil. Le crapaud du ponton guide ; il faut
//  sauter les canaux d'irrigation et grimper sur les diguettes. Pas de calcul : on marche, on saute, on regarde.
// ============================================================
// La promenade défile : le crapaud marche, le décor glisse (les champs au loin plus lentement que le chemin).
// P.dist : le chemin parcouru ; l'oie attend au bout, à PROM.fin.
const PROM = { sol: 140, fin: 420, ecran: 100, paroles: [10, 150, 290] };
const PROM_BLOCS = [[-20, 140, 280, 40]];
const modL = (v, p = L) => ((v % p) + p) % p;
function peindreCielPromenade() {
  ctx.fillStyle = "#7f9a4c"; ctx.fillRect(0, 0, L, H);   // tout le fond est peint : rien ne reste d'une image à l'autre
  ctx.fillStyle = degrade(0, 84, "#8ec2d6", "#cfe2d8", "#f4dcaa"); ctx.fillRect(0, 0, L, 86);
  soleilVoile(200, 18, 66);
  ctx.fillStyle = "#e6cfa2"; ctx.beginPath(); ctx.moveTo(0, 80); ctx.lineTo(60, 72); ctx.lineTo(120, 76); ctx.lineTo(180, 70); ctx.lineTo(240, 74); ctx.lineTo(240, 82); ctx.lineTo(0, 82); ctx.fill();
  pyramide(150, 80, 24, 16, .6); pyramide(174, 80, 14, 9, .68);
  brumeHorizontale(78, 8, .55);
}
// les champs et la palmeraie, en bande qui se raccorde (période L)
function peindreChampsPromenade() {
  for (let k = 0; k < 16; k++) { const x = k * 15 + bruit(k + 990) * 6; for (const dx of [0, -L, L]) palmier(x + dx, 86, 10 + bruit(k + 991) * 7, 990 + k, (bruit(k + 992) - .5) * .7, .5); }
  for (let r = 0; r < 5; r++) {
    const y0 = 86 + r * 10, h = r === 4 ? 16 : 10, ws = []; for (let k = 0; k < 8; k++) ws.push(26 + bruit(r * 9 + k) * 20);
    const f = L / ws.reduce((a, b) => a + b); let x = 0;
    ws.forEach((w0, k) => {
      const w = w0 * f, n = bruit(r * 13 + k * 3 + 1);
      ctx.fillStyle = n < .7 ? (n < .35 ? "#7aa844" : "#8ab450") : n < .85 ? "#7a6a48" : "#a4aa5a"; ctx.fillRect(x, y0, w + .3, h);
      if (n < .7) { ctx.strokeStyle = "rgba(40,70,20,.3)"; ctx.lineWidth = .3; for (let yy = y0 + 2; yy < y0 + h; yy += 2.5) { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + w, yy); ctx.stroke(); } }
      ctx.fillStyle = "rgba(170,140,100,.5)"; ctx.fillRect(x, y0, w, .6); ctx.fillRect(x, y0, .6, h);
      x += w;
    });
    ctx.fillStyle = `rgba(244,236,214,${.35 - r * .07})`; ctx.fillRect(0, y0, L, h);                 // la brume, plus forte au loin
  }
}
// le chemin de terre noire, bordé d'herbe (période L)
function peindreSolPromenade() {
  ctx.fillStyle = degrade(PROM.sol, H, "#5a4632", "#2e2218"); ctx.fillRect(0, PROM.sol, L, H - PROM.sol);
  for (const [y, a, k] of [[150, .18, 3], [160, .14, 5], [170, .12, 4]]) { ctx.fillStyle = `rgba(160,120,70,${a})`; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= L; x += 4) ctx.lineTo(x, y + Math.sin(x * k * 2 * Math.PI / L) * 1.4); ctx.lineTo(L, y + 3); ctx.lineTo(0, y + 3); ctx.fill(); }
  ctx.fillStyle = "#6a8a34"; for (let x = 0; x < L; x += 3) ctx.fillRect(x, PROM.sol - 1.2, 2, 2 + bruit(x + 5) * 1.6);
  for (let k = 0; k < 6; k++) papyrus(20 + k * 40 + bruit(k + 70) * 14, PROM.sol + 1, 3, 8 + bruit(k + 71) * 5, k * 7, 0);
}
function decorPromenade(P, t) {
  const d = P.dist, bande = (cle, fn, v) => { const img = fondPeint(cle, fn), o = -modL(d * v); ctx.drawImage(img, o, 0, L + .6, H); ctx.drawImage(img, o + L - .3, 0, L + .3, H); };   // un léger recouvrement : pas de fente au raccord
  ctx.drawImage(fondPeint("promCiel", peindreCielPromenade), 0, 0, L, H);
  bande("promChamps", peindreChampsPromenade, .35);
  // les paysans qui piochent, dans les champs (ils glissent avec eux)
  [[40, 106, 1], [110, 116, 2], [176, 126, 3]].forEach(([x, y, k]) => paysanChamp(modL(x - d * (.25 + y / 400), L + 40) - 20, y, t, k));
  bande("promSol", peindreSolPromenade, 1);
  // au départ, le bout du ponton et le Nil, qui s'éloignent
  if (d < 30) { ctx.fillStyle = "#5a9aa8"; ctx.fillRect(-d, PROM.sol + 1, 8, H); ctx.fillStyle = "#8a6a3a"; ctx.fillRect(-d, PROM.sol - 2, 14, 3); }
  // l'ibis picore au loin, dans les champs… jusqu'à la scène de la fin
  if (!P.scene && !peurEnCours(P)) { const [x, y] = ibisFond(P); ibis(x, y + Math.abs(Math.sin(t / 30)), 1, t, 0, 1); }
  else if (P.scene) sceneIbis(P, t);
  // le crapaud du ponton, qui marche avec toi
  const G = P.guide;
  ctx.save(); ctx.filter = "hue-rotate(70deg) saturate(.8)"; dessinerCrapaud({ x: G.x, y: G.y, auSol: true, dir: 1, vx: G.vx, vy: 0 }, t); ctx.restore();
  // sa bulle : « ? » pendant sa question, Dory (🐠) quand on s'est trompé
  const bravo = P.bravoT && performance.now() - P.bravoT < 2500, coucou = P.scene && P.scene.s > SCENE_IBIS.envol - .6;
  if (gardien.etat === "questions" || bravo || coucou) {
    const txt = coucou ? "👋" : gardien.etat !== "questions" ? "👑" : suiteEnAttente ? "🐠" : "?";
    ctx.font = txt === "?" ? "bold 8px Georgia, serif" : "7px sans-serif"; const w = Math.max(12, ctx.measureText(txt).width + 8), bx = Math.max(2, Math.min(L - w - 2, G.x + 4));
    ctx.fillStyle = "rgba(255,250,235,.95)"; arrondi(bx, G.y - 15, w, 10, 4); ctx.fill(); poly([[G.x + 7, G.y - 5], [G.x + 11, G.y - 5], [G.x + 9, G.y - 2]], "rgba(255,250,235,.95)");
    ctx.fillStyle = "#3a2410"; ctx.textAlign = "center"; ctx.fillText(txt, bx + w / 2, G.y - 7); ctx.textAlign = "left";
  }
}
// le portrait de celui qui parle (le crapaud guide ou l'ibis), dessiné une fois pour toutes
const portraits = {};
function portrait(qui) {
  if (portraits[qui]) return portraits[qui];
  const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d"); g.setTransform(6, 0, 0, 6, 0, 0);
  const ecran = ctx; ctx = g;
  ctx.fillStyle = degrade(0, 16, "#bcd9de", "#e8dcb4"); ctx.fillRect(0, 0, 16, 16);   // un fond de ciel, pour que l'ibis blanc se détache
  try {
    if (qui === "guide" || qui === "crapaud") { if (qui === "guide") ctx.filter = "hue-rotate(70deg) saturate(.8)"; dessinerCrapaud({ x: 2, y: 4, auSol: true, dir: 1, vx: 0, vy: 0 }, 0); }
    else if (qui === "sobek") ctx.drawImage(IMG_SOBEK, 836, 96, 140, 140, 0, 0, 16, 16);
    else if (qui === "chacal") { ctx.fillStyle = degrade(0, 16, "#1c2244", "#3a3058"); ctx.fillRect(0, 0, 16, 16); ctx.translate(-4, 0); ctx.scale(1.25, 1.25); chacal(4, 14, 0, false); }
    else if (qui === "croco") { ctx.fillStyle = degrade(0, 16, "#6a4a78", "#e0905a"); ctx.fillRect(0, 0, 16, 16); crocoMarche(-9, 12.5, 0, false); }
    else ibis(7.5, 9.5, .95, 0, 0, 1);
  } finally { ctx = ecran; }
  return (portraits[qui] = c.toDataURL());
}
// les questions du crapaud compagnon : du vocabulaire de géométrie qu'il a « oublié »
const OUBLIS = [
  ["la droite perpendiculaire à un segment, qui passe par son milieu", ["la médiatrice", "la bissectrice", "la diagonale", "la hauteur"], "La médiatrice d'un segment est la droite perpendiculaire à ce segment qui passe par son milieu."],
  ["la demi-droite qui partage un angle en deux angles de même mesure", ["la bissectrice", "la médiatrice", "la hauteur", "la diagonale"], "La bissectrice d'un angle le partage en deux angles de même mesure."],
  ["un segment qui joint le centre d'un cercle à un point du cercle", ["un rayon", "un diamètre", "une corde", "un arc"], "Un rayon joint le centre du cercle à un point du cercle."],
  ["un segment qui joint deux points d'un cercle en passant par son centre", ["un diamètre", "un rayon", "une corde", "un arc"], "Un diamètre joint deux points du cercle en passant par le centre : il mesure deux rayons."],
  ["un triangle qui a deux côtés de même longueur", ["un triangle isocèle", "un triangle équilatéral", "un triangle rectangle", "un triangle quelconque"], "Un triangle isocèle a deux côtés de même longueur."],
  ["un triangle qui a ses trois côtés de même longueur", ["un triangle équilatéral", "un triangle isocèle", "un triangle rectangle", "un triangle quelconque"], "Un triangle équilatéral a ses trois côtés de même longueur."],
  ["un quadrilatère qui a ses quatre côtés de même longueur", ["un losange", "un rectangle", "un trapèze", "un parallélogramme"], "Un losange a ses quatre côtés de même longueur."],
  ["un angle plus grand qu'un angle droit, mais plus petit qu'un angle plat", ["un angle obtus", "un angle aigu", "un angle droit", "un angle plat"], "Un angle obtus mesure entre 90° et 180°."],
  ["deux droites qui ne se coupent jamais", ["des droites parallèles", "des droites perpendiculaires", "des droites sécantes", "des droites concourantes"], "Deux droites parallèles ne se coupent jamais."],
  ["deux droites qui se coupent en formant un angle droit", ["des droites perpendiculaires", "des droites parallèles", "des droites confondues", "des droites symétriques"], "Deux droites perpendiculaires se coupent en formant un angle droit."]
];
function qOubli() {
  const libres = OUBLIS.filter(o => !dejaPosees.has(o[0])), [def, choix] = libres.length ? libres[Math.floor(Math.random() * libres.length)] : OUBLIS[0];
  dejaPosees.add(def);
  // ce qu'on peut lui répondre : des répliques, toutes sur le même ton
  const ton = [["« Ça ? C'est %s ! »", "« Ça ? Ce sont %s ! »"], ["« Facile : c'est %s. »", "« Facile : ce sont %s. »"], ["« Voyons… c'est %s. »", "« Voyons… ce sont %s. »"]][Math.floor(Math.random() * 3)],
        dire = c => ton[c.startsWith("des ") ? 1 : 0].replace("%s", c);
  return qChoix("maths", `<div class="replique"><img src="${portrait("guide")}" alt=""><span>« Bonjour, moi c'est Dory. <b>C'est quoi, déjà, ${def} ?</b> »</span></div><i>Que lui réponds-tu ?</i>`, choix.map(dire), "", { repliques: [[portrait("guide"), "« Toi aussi, on t'appelle Dory ? »"]] });
}
// La fin du plateau : l'ibis se pose devant vous. Dory se présente (« Bonjour, moi c'est Dory ! »),
// l'ibis soupire (« tu me l'as dit ce matin »), puis il t'emporte voir l'oie. Le temps de la scène est en secondes.
const SCENE_IBIS = { pose: 1.2, dory: 1.4, ibis1: 3.6, ibis2: 6, saisit: 10, envol: 10.6, fin: 13.4 };   // l'ibis vole jusqu'à vous, se pose devant, puis t'emporte
function bulleBoulet(ix, iy) {
  const w = 16, bx = Math.max(2, Math.min(L - w - 2, ix - w / 2)), by = iy - 37;
  ctx.fillStyle = "rgba(255,250,235,.95)"; arrondi(bx, by, w, 11, 4); ctx.fill(); poly([[ix - 2, iy - 26], [ix + 2, iy - 26], [ix, iy - 22]], "rgba(255,250,235,.95)");
  const ox = bx + 10.5, oy = by + 6.2;
  ctx.fillStyle = "#2a2622"; rond(ox, oy, 3.2); ctx.fillStyle = "rgba(255,255,255,.55)"; rond(ox - 1.1, oy - 1.2, .8);
  ctx.strokeStyle = "#5a554e"; ctx.lineWidth = .55;
  for (const [mx, my] of [[ox - 4.4, oy - 1.8], [ox - 6.2, oy - 2.6]]) { ctx.beginPath(); ctx.ellipse(mx, my, 1, .6, -.4, 0, Math.PI * 2); ctx.stroke(); }
  ctx.lineWidth = .7; ctx.beginPath(); ctx.ellipse(bx + 3, oy - 3.4, 1.4, 1.1, 0, 0, Math.PI * 2); ctx.stroke();
}
const ibisFond = P => [modL(140 - P.dist * .45, L + 40) - 20, 104];   // l'ibis, au loin dans les champs
function sceneIbis(P, t) {
  const S = P.scene, T = SCENE_IBIS, s = S.s, lisse = u => { u = Math.max(0, Math.min(1, u)); return u * u * (3 - 2 * u); };
  const ailes = (x, y) => { const b = Math.sin(t / 2) * 4; poly([[x - 1, y], [x - 9, y - 3 - b], [x - 5, y + 1]], "#f4efe4"); poly([[x + 1, y], [x + 9, y - 3 - b], [x + 5, y + 1]], "#f4efe4"); };
  const posee = [heros.x + 34, 136];
  let x, y, sc = 1.4, dir = -1, vol = false;
  if (s < T.pose) { const e = lisse(s / T.pose); x = S.x0 + (posee[0] - S.x0) * e; y = S.y0 + (posee[1] - S.y0) * e - Math.sin(Math.PI * e) * 22; sc = 1 + .4 * e; dir = posee[0] < S.x0 ? -1 : 1; vol = true; }   // il vole jusqu'à vous
  else if (s < T.saisit) { [x, y] = posee; }                                                                  // posé devant les deux crapauds
  else if (s < T.envol) { const e = lisse((s - T.saisit) / (T.envol - T.saisit)); x = posee[0] + (heros.x + 10 - posee[0]) * e; y = posee[1]; }
  else { const e = lisse((s - T.envol) / (T.fin - T.envol - .4)); x = heros.x + 10 + e * 170; y = posee[1] - 4 - e * (S.lourd ? 95 : 140) + (S.lourd ? Math.sin(t / 3) * 2.5 : 0); dir = 1; vol = true;
    dessinerCrapaud({ x: x - 6, y: y + 2, auSol: false, dir: 1, vx: 0, vy: 1 }, t); }   // le vrai crapaud, dans les pattes de l'ibis
  if (vol) ailes(x, y - 3);
  ibis(x, y, sc, s > T.pose && s < T.saisit ? 0 : t, 0, dir);
}
// l'aparté comique : en gros plan, l'ibis s'arrache les plumes — « Ils me font peur, les deux ! »
// Elle s'ouvre après une mauvaise réponse : l'ibis quitte son champ, au loin, et apparaît en gros plan (sans bulle).
const peurEnCours = P => { if (!P.peurT || P.scene) return false; const sec = (performance.now() - P.peurT) / 1000 - .5; return sec >= 0 && sec <= 3; };
function apartéIbis(P, t) {
  if (!peurEnCours(P)) return;
  const sec = (performance.now() - P.peurT) / 1000 - .5;
  const v = Math.min(1, sec / .3, (3 - sec) / .3);
  ctx.save(); ctx.globalAlpha = v;
  // une petite vignette dans le ciel, du côté opposé à l'ibis : on voit toujours les deux crapauds en dessous
  const [ix] = ibisFond(P), k = .5, vx = Math.max(4, Math.min(L - 78, ix - 37)), vy = 4;   // à l'aplomb de l'endroit où il picorait
  ctx.translate(vx - 46 * k, vy - 16 * k); ctx.scale(k, k);
  ctx.fillStyle = degrade(22, 158, "#f6e7c4", "#e8cf9c"); arrondi(46, 16, 148, 146, 8); ctx.fill();
  ctx.strokeStyle = "#8f3f17"; ctx.lineWidth = 1.4; arrondi(46, 16, 148, 146, 8); ctx.stroke();
  for (let k = 0; k < 14; k++) { const a = k / 14 * Math.PI * 2; trait([[120 + Math.cos(a) * 34, 74 + Math.sin(a) * 30], [120 + Math.cos(a) * 60, 74 + Math.sin(a) * 52]], "rgba(200,140,60,.25)", 2.2); }   // les rayons de bande dessinée
  ctx.save(); ctx.beginPath(); ctx.rect(46, 16, 148, 146); ctx.clip();
  const tr = Math.sin(t * 1.7) * 1.2;   // il tremble
  ctx.translate(120 + tr, 106);
  // les pattes
  trait([[-4, 20], [-6, 46]], "#2a2420", 2); trait([[5, 20], [7, 46]], "#2a2420", 2);
  trait([[-6, 46], [-13, 48]], "#2a2420", 1.6); trait([[7, 46], [14, 48]], "#2a2420", 1.6);
  // le corps et la queue noire
  ctx.fillStyle = "#f8f4ea"; ovale(0, 8, 20, 15, 0); poly([[-14, 14], [-30, 24], [-12, 22]], "#1e1a18");
  // le cou noir qui monte, la tête, le long bec courbe
  trait([[6, -2], [8, -16], [4, -30]], "#1e1a18", 5);
  ctx.fillStyle = "#1e1a18"; ovale(3, -36, 8, 7, 0);
  ctx.strokeStyle = "#1e1a18"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(10, -36); ctx.quadraticCurveTo(30, -34, 34, -16); ctx.stroke();
  // les yeux exorbités
  ctx.fillStyle = "#fff"; ovale(1, -39, 3.4, 3.8, 0); ovale(7, -39, 3, 3.6, 0); ctx.fillStyle = "#1e1a18"; rond(1.6 + tr * .4, -38.5, 1.1); rond(7.4 - tr * .4, -38.5, 1);
  // une goutte de sueur
  ctx.fillStyle = "#7ec4e8"; ctx.beginPath(); ctx.moveTo(-8, -46); ctx.quadraticCurveTo(-12, -38, -8, -37); ctx.quadraticCurveTo(-4, -38, -8, -46); ctx.fill();
  // les ailes levées jusqu'à la tête : il s'arrache les plumes (le bout des ailes est noir)
  for (const c of [-1, 1]) {
    const tir = Math.sin(t * 1.3 + c) * 2;
    ctx.fillStyle = "#f8f4ea"; ctx.beginPath(); ctx.moveTo(c * 8, 0); ctx.quadraticCurveTo(c * 34, -6, c * 18 + tir, -40); ctx.quadraticCurveTo(c * 14, -22, c * 4, 6); ctx.fill();
    ctx.fillStyle = "#1e1a18"; ctx.beginPath(); ctx.moveTo(c * 17 + tir, -34); ctx.lineTo(c * 18 + tir, -42); ctx.lineTo(c * 11 + tir, -40); ctx.fill();
  }
  // les plumes arrachées qui volent et retombent
  for (let k = 0; k < 9; k++) {
    const age = (sec * .9 + bruit(k + 300)) % 1, ang = (bruit(k + 301) - .5) * 2.6 - Math.PI / 2;
    const px = Math.cos(ang) * (14 + age * 52), py = -40 + Math.sin(ang) * (10 + age * 30) + age * age * 70;
    ctx.save(); ctx.translate(px, py); ctx.rotate(age * 6 + k); ctx.globalAlpha = v * (1 - age * .6);
    ctx.fillStyle = "#fffaf0"; ovale(0, 0, 4.5, 1.6, 0); trait([[-5, 0], [5, 0]], "#c8bca8", .5); ctx.restore();
  }
  ctx.restore();
  // la légende
  ctx.fillStyle = "#3a2410"; ctx.font = "bold 11px Georgia, serif"; ctx.textAlign = "center";
  ctx.fillText("« Ils me font peur,", 120, 33); ctx.fillText("les deux ! »", 120, 46); ctx.textAlign = "left";
  ctx.restore();
}
// ta réponse à l'ibis ; il réagit, puis t'emporte (plus péniblement si tu es un boulet)
function repondreIbis(oui) {
  const S = P && P.scene; if (!S || S.repondu) return;
  S.repondu = true; S.attente = false; S.lourd = oui;
  const r = $("retour"), c = r.querySelector(".replique-choix"); if (c) c.remove();
  r.insertAdjacentHTML("beforeend", `<div class="replique"><img src="${portrait("crapaud")}" alt=""><span>${oui ? "« Oui. »" : "« Non. »"}</span></div>`
    + `<div class="replique" style="animation:repliqueApres .4s .8s both"><img src="${portrait("ibis")}" alt=""><span>${oui ? "« Ça va faire lourd… »" : "« Ça fera plus léger ! »"}</span></div>`);
  S.s = SCENE_IBIS.saisit - 2.6; S.t0 = performance.now() - S.s * 1000;
}
// le guide marche avec toi, un peu derrière
function bougerPromenade(P) {
  if (P.scene) {
    const S = P.scene, T = SCENE_IBIS;
    if (S.attente) S.t0 = performance.now() - S.s * 1000;   // la scène attend ta réponse
    else S.s = (performance.now() - S.t0) / 1000;
    heros.vx = 0; P.guide.vx = 0;
    // « T'es pas un boulet, toi ? » : à toi de répondre, oui ou non
    if (!S.repondu && !S.attente && S.s > T.ibis2 + .8) {
      S.attente = true;
      $("retour").insertAdjacentHTML("beforeend", `<div class="replique-choix"><button type="button" onclick="repondreIbis(true)">« Oui. »</button><button type="button" onclick="repondreIbis(false)">« Non. »</button></div>`);
    }
    if (S.s > T.fin && !partie.fin) plateauFranchi();
    return;
  }
  const G = P.guide, cible = heros.x - 18, dx = Math.max(-1.6, Math.min(1.6, cible - G.x));
  const avance = Math.abs(cible - G.x) > 1.5; if (avance) G.x += dx; G.vx = avance || P.glisse > .2 ? 1 : 0; G.y = PROM.sol - HH;
}
// ============================================================
//  LA TRAVERSÉE VUE DE DESSUS : des couloirs de crocodiles qui nagent dans le sens du courant ;
//  les flèches ← → font tourner le crapaud (l'angle du saut), l'espace le fait sauter.
// ============================================================
const TD = { gauche: 44, droite: 184, couloirs: [72, 110, 148], saut: 44, crocL: 36 };     // trois crocodiles, posés à la main ; un saut fait 44
// Les crocodiles ne bougent pas et ne mordent pas : on cherche son chemin, en tournant.
// Le bon chemin : un crocodile par couloir, décalé ; le saut tout droit tombe dans l'eau, il faut viser en biais
// (le biais décale de ~11 vers le haut ou vers le bas). Deux crocodiles pièges sont là où mène le saut tout droit :
// ce sont des impasses (on vérifie qu'aucun chemin ne repart d'eux).
// Chaque traversée est différente : on tire d'abord un trajet au hasard (un point de départ sur la rive, puis 4 sauts,
// avec des directions de -60° à 60°), et on pose les crocodiles exactement là où ce trajet fait atterrir, zone verte au centre.
// Le trajet doit tourner au moins deux fois : le saut tout droit ne suffit jamais.
function tracerTrajet() {
  for (let essai = 0; essai < 500; essai++) {
    const y0 = 40 + Math.round(Math.random() * 100), caps = [], pts = [];
    let x = 34, y = y0, cap = [-2, -1, 1, 2][Math.floor(Math.random() * 4)], ok = true;
    for (let k = 0; k < 4 && ok; k++) {
      if (k) cap = Math.max(-2, Math.min(2, cap + [-2, -1, 0, 0, 1, 2][Math.floor(Math.random() * 6)]));
      caps.push(cap); x += Math.cos(cap * Math.PI / 6) * TD.saut; y += Math.sin(cap * Math.PI / 6) * TD.saut; pts.push([x, y]);
      ok = k < 3 ? x > 58 && x < 172 && y > 26 && y < 154 : x >= TD.droite + 4 && y > 10 && y < H - 10;
    }
    const virages = caps.filter((c, k) => k && c !== caps[k - 1]).length + (caps[0] !== 0 ? 1 : 0);
    if (ok && virages >= 2) return { y0, caps, pts };
  }
  return { y0: 90, caps: [1, -1, -1, -1], pts: [[72, 112], [110, 90], [148, 68], [186, 46]] };
}
function nouvelleTraversee() {
  const T = tracerTrajet();
  const crocs = T.pts.slice(0, 3).map(([x, y], k) => ({ x, y: y - TD.crocL / 2, dir: Math.random() < .5 ? 1 : -1, t: k * 30 }));
  return { x: 34, y: 90, ang: 0, saut: null, sur: "gauche", chute: 0, crocs, trajet: T, phase: "crapaud", comp: nouvelleGrenouille(), fin: 0, suiveur: { x: 22, y: 112, ang: 0 }, depart: null };
}
const gueuleOuverteD = () => false;
const teteCroc = C => C.dir > 0 ? C.y + TD.crocL : C.y;
const ZONE_VERTE = 7;                      // la demi-hauteur de la zone verte, au milieu du dos
const mordu = s => typeof s === "string" && s[0] === "m";
function surQuoiDessus(D, x, y) {
  if (x <= TD.gauche) return "gauche";
  if (x >= TD.droite) return "droite";
  for (let i = 0; i < D.crocs.length; i++) {
    const C = D.crocs[i], milieu = C.y + TD.crocL / 2;
    if (Math.abs(x - C.x) <= 6.5 && y >= C.y - 3 && y <= C.y + TD.crocL + 3) return Math.abs(x - C.x) <= 4.5 && Math.abs(y - milieu) <= ZONE_VERTE ? i : "m" + i;   // la zone verte du dos, ou une morsure
  }
  return null;
}
// un saut (12 images) ou un petit pas, en avant ou en arrière (6 images), dans la direction où l'on regarde
const PAS_MARCHE = 4;
function mouvement(Q, d, marche) {
  const x1 = Math.max(4, Math.min(L - 4, Q.x + Math.cos(Q.ang) * d)), y1 = Math.max(6, Math.min(H - 6, Q.y + Math.sin(Q.ang) * d));
  return { x0: Q.x, y0: Q.y, x1, y1, t: 0, n: marche ? 6 : 12, marche };
}
const hauteurSaut = S => S && !S.marche ? Math.sin(Math.PI * S.t / S.n) : 0;
function toucheDessus(e, P) {
  const D = P.td;
  if (!D || D.phase !== "crapaud" || D.saut || D.chute || P.bascule || suiteEnAttente || partie.chouette) return false;
  if (e.key === "ArrowLeft") { D.ang -= Math.PI / 6; afficherQuestion(); return true; }
  if (e.key === "ArrowRight") { D.ang += Math.PI / 6; afficherQuestion(); return true; }
  if (e.key === " " || e.key === "Spacebar") { if (D.sur === "gauche") { D.depart = { x: D.x, y: D.y, ang: D.ang }; D.suiveur.retard = RETARD_GERBOISE; } D.saut = mouvement(D, TD.saut, false); D.sur = null; son("saut"); return true; }
  if (e.key === "ArrowUp" || e.key === "ArrowDown") { if (D.sur === "gauche") D.saut = mouvement(D, e.key === "ArrowUp" ? PAS_MARCHE : -PAS_MARCHE, true); return true; }
  return false;
}
function bougerDessus(P) {
  const D = P.td;
  for (const C of D.crocs) { C.t++; if (C.mord) C.mord--; }
  if (D.phase !== "crapaud") { if (D.phase !== "script") bougerGrenouille(P); return; }
  suivreCrapaud(D);
  if (D.chute) { if (++D.chute >= 34) Object.assign(D, { x: 34, y: 90, saut: null, sur: "gauche", chute: 0 }); return; }
  if (!D.saut) return;
  const S = D.saut; S.t++;
  D.x = S.x0 + (S.x1 - S.x0) * S.t / S.n; D.y = S.y0 + (S.y1 - S.y0) * S.t / S.n;
  if (S.t < S.n) return;
  D.saut = null; D.sur = surQuoiDessus(D, D.x, D.y);
  if (S.marche && (D.sur === "gauche" || typeof D.sur === "number")) return;          // un pas sur la rive, ou sur la zone verte : rien de plus
  if (D.sur === null) { tombeDessus(D, "Plouf ! Tu es tombé dans le Nil : tu repars de la rive."); return; }
  if (mordu(D.sur)) { D.crocs[+D.sur.slice(1)].mord = 26; son("croc"); tombeDessus(D, S.marche ? "Tu as quitté la zone verte : le crocodile t'a mordu ! Tu repars de la rive." : "Le crocodile t'a mordu ! Il faut atterrir sur la zone verte de son dos. Tu repars de la rive."); return; }
  if (D.sur === "droite") { D.phase = "script"; D.comp = nouvelleGrenouille(D.depart); son("allume"); afficherQuestion(); return; }   // la gerboise attend son programme
  if (typeof D.sur === "number") { const C = D.crocs[D.sur]; D.x = C.x; D.y = C.y + TD.crocL / 2; son("bois"); }
}
function tombeDessus(D, texte) {
  D.chute = 1; D.sur = null; son("plouf");
  const r = $("retour"); r.className = "aide"; r.textContent = texte;
  setTimeout(() => { if (r.textContent === texte) r.className = "vide"; }, 3500);
}
// le décor fixe, vu d'en haut
function peindreNilDessus() {
  // l'eau : plus profonde au milieu
  const g = ctx.createLinearGradient(TD.gauche, 0, TD.droite, 0); g.addColorStop(0, "#5f9e92"); g.addColorStop(.5, "#2a6468"); g.addColorStop(1, "#4f8f88");
  ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
  for (let k = 0; k < 18; k++) { ctx.fillStyle = `rgba(10,40,44,${.1 + bruit(k) * .12})`; ovale(TD.gauche + bruit(k * 3) * 150, bruit(k * 7) * H, 6 + bruit(k + 1) * 14, 14 + bruit(k + 2) * 24); }
  // la rive gauche : la terre noire, l'herbe, les papyrus et un palmier vus d'en haut
  ctx.fillStyle = "#5a4632"; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(TD.gauche - 2, 0); for (let y = 0; y <= H; y += 10) ctx.lineTo(TD.gauche - 2 + Math.sin(y * .1) * 2.4, y); ctx.lineTo(0, H); ctx.fill();
  ctx.strokeStyle = "rgba(230,245,235,.45)"; ctx.lineWidth = .8; ctx.beginPath(); for (let y = 0; y <= H; y += 10) ctx.lineTo(TD.gauche - 1 + Math.sin(y * .1) * 2.4, y); ctx.stroke();
  ctx.fillStyle = "#6a8a34"; for (let k = 0; k < 40; k++) ovale(bruit(k + 5) * (TD.gauche - 6), bruit(k + 9) * H, 1.4, .8, bruit(k));
  const touffe = (x, y, r) => { ctx.fillStyle = "rgba(0,0,0,.25)"; rond(x + 2, y + 2, r); for (let a = 0; a < 18; a++) { const an = a / 18 * Math.PI * 2; ctx.strokeStyle = a % 2 ? "#6a9a34" : "#4e7a24"; ctx.lineWidth = .5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(an) * r, y + Math.sin(an) * r); ctx.stroke(); } ctx.fillStyle = "#8ab048"; rond(x, y, 1); };
  for (const [x, y, r] of [[12, 22, 7], [30, 40, 6], [10, 140, 8], [32, 160, 6], [20, 118, 5]]) touffe(x, y, r);
  const palme = (x, y, r) => { ctx.fillStyle = "rgba(0,0,0,.3)"; rond(x + 4, y + 4, r); for (let a = 0; a < 9; a++) { const an = a / 9 * Math.PI * 2; ctx.strokeStyle = "#3e6022"; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(an) * r * .6, y + Math.sin(an) * r * .6, x + Math.cos(an + .2) * r, y + Math.sin(an + .2) * r); ctx.stroke(); } ctx.fillStyle = "#6a5034"; rond(x, y, 1.4); };
  palme(18, 70, 14);
  // la rive droite : le quai de grès, les marches, le coin du temple
  ctx.fillStyle = degrade(0, H, "#d8b478", "#b8945e"); ctx.fillRect(TD.droite + 2, 0, L - TD.droite, H);
  ctx.strokeStyle = "rgba(90,60,30,.35)"; ctx.lineWidth = .35; for (let y = 0; y < H; y += 8) { ctx.beginPath(); ctx.moveTo(TD.droite + 2, y); ctx.lineTo(L, y); ctx.stroke(); for (let x = TD.droite + 4 + (y % 16 ? 0 : 6); x < L; x += 12) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 8); ctx.stroke(); } }
  ctx.fillStyle = "#f2e2bc"; ctx.fillRect(TD.droite + 1, 0, 1.6, H);
  ctx.fillStyle = degrade(0, 60, "#e8cc96", "#c8a46e"); ctx.fillRect(214, 40, 26, 100);                          // le temple, vu d'en haut
  for (let x = 214, k = 0; x < L; x += 3, k++) { ctx.fillStyle = ["#1f4e8c", "#b5402a", "#3a9a7a"][k % 3]; ctx.fillRect(x, 40, 2, 3); ctx.fillRect(x, 137, 2, 3); }
  ctx.fillStyle = "rgba(0,0,0,.25)"; ctx.fillRect(210, 44, 4, 96);
  for (let k = 0; k < 4; k++) { ctx.fillStyle = k % 2 ? "#e2c48a" : "#d4b47a"; ctx.fillRect(TD.droite + 6 + k * 3, 78, 3, 24); }
}
// un crocodile vu de dessus : le corps cuirassé, la queue qui ondule doucement, les pattes écartées
function crocDessus(C, t) {
  const dir = C.dir, ouv = C.mord ? Math.min(1, (26 - C.mord) / 5) * Math.min(1, C.mord / 6) : 0;
  ctx.save(); ctx.translate(C.x, C.y + TD.crocL / 2); ctx.scale(1, dir);
  const vert = "#4e6a34", clair = "#6f8a44";
  ctx.fillStyle = "rgba(0,0,0,.25)"; ovale(2, 2, 5, 18);
  const o = Math.sin(t / 14 + C.x + C.y) * 1.2;                                                             // la queue, qui ondule doucement
  ctx.fillStyle = vert; ctx.beginPath(); ctx.moveTo(-3, -8); ctx.quadraticCurveTo(o, -16, -o * .6, -22); ctx.quadraticCurveTo(o * .3, -16, 3, -8); ctx.fill();
  const p = 0;                                                                                              // les pattes, immobiles
  for (const [py, s] of [[-4, 1], [6, -1]]) for (const c of [-1, 1]) trait([[c * 3.6, py], [c * 7, py + s * 2 + p * c], [c * 8, py + s * 4 + p * c]], "#3e5626", 1.3);
  ctx.fillStyle = vert; ovale(0, 0, 4.4, 10);                                                               // le corps
  ctx.fillStyle = clair; ovale(0, -1, 2.6, 8);
  ctx.fillStyle = "#3a5226"; for (let y = -8; y <= 8; y += 2.4) for (const c of [-1.4, 1.4]) rond(c, y, .55);   // les écailles du dos
  // la zone verte, au milieu du dos : c'est là qu'on peut atterrir sans se faire mordre
  { const p = .55 + .35 * Math.sin(t / 10 + C.x), z = ZONE_VERTE;
    ctx.fillStyle = `rgba(190,255,130,${.22 * p})`; arrondi(-4.6, -z - 1.4, 9.2, 2 * z + 2.8, 3); ctx.fill();
    ctx.fillStyle = "#8ccf3e"; arrondi(-3.2, -z, 6.4, 2 * z, 2.4); ctx.fill();
    ctx.fillStyle = "#a8e45a"; arrondi(-2.2, -z + 1, 3, 2 * z - 2, 1.4); ctx.fill();
    ctx.fillStyle = "#5e9a2a"; for (let y = -z + 2; y <= z - 2; y += 2.4) for (const c of [-1.2, 1.2]) rond(c, y, .45);
    ctx.strokeStyle = `rgba(230,255,190,${.6 + .3 * p})`; ctx.lineWidth = .45; arrondi(-3.2, -z, 6.4, 2 * z, 2.4); ctx.stroke(); }
  // la tête, les yeux, les mâchoires
  ctx.save(); ctx.translate(0, 9);
  for (const c of [-1, 1]) { ctx.save(); ctx.rotate(c * ouv * .35); ctx.fillStyle = vert; ctx.beginPath(); ctx.moveTo(c * 3.2, 0); ctx.quadraticCurveTo(c * 3, 6, c * .6, 11); ctx.lineTo(0, 11); ctx.lineTo(0, 0); ctx.closePath(); ctx.fill();
    if (ouv > .2) { ctx.fillStyle = "#f2ead0"; for (let y = 2; y < 10; y += 1.6) poly([[c * .3, y], [c * 1.1, y + .6], [c * .3, y + 1.2]], "#f2ead0"); }
    ctx.restore(); }
  if (ouv > .2) { ctx.fillStyle = `rgba(190,50,40,${ouv * .8})`; ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(-ouv * 3, 10); ctx.lineTo(ouv * 3, 10); ctx.fill(); }
  for (const c of [-1, 1]) { ctx.fillStyle = vert; rond(c * 2, 1.4, 1.3); ctx.fillStyle = "#e8c040"; rond(c * 2, 1.6, .7); ctx.fillStyle = "#1a1a0a"; ovale(c * 2, 1.6, .2, .55); }
  ctx.restore();
  ctx.restore();
}
// le crapaud vu de dessus (le même que dans « Le crapaud et le dragon », sans sa sapèque)
function crapaudDessus(x, y, angle, s, alpha) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(angle); ctx.scale(s, s);
  const patte = "#8a7130";
  ctx.strokeStyle = patte; ctx.lineCap = "round"; ctx.lineJoin = "round";
  for (const k of [-1, 1]) {
    ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-3, k * 2.5); ctx.lineTo(-6.5, k * 5.5); ctx.lineTo(-2.5, k * 6.8); ctx.stroke();
    ctx.fillStyle = patte; for (const a of [-.5, 0, .5]) { ctx.beginPath(); ctx.ellipse(-1.6 + Math.cos(a) * 1.4, k * 6.9 + Math.sin(a) * 1.2, 1, .45, a, 0, Math.PI * 2); ctx.fill(); }
    ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(2.5, k * 2.6); ctx.lineTo(4.6, k * 4.6); ctx.stroke();
    ctx.fillStyle = patte; rond(5, k * 4.9, .8);
  }
  const g = ctx.createRadialGradient(-.5, -1.2, .5, 0, 0, 7); g.addColorStop(0, "#d4b45a"); g.addColorStop(.6, "#9a7f34"); g.addColorStop(1, "#5b4b1f");
  ctx.fillStyle = g; ovale(0, 0, 5.8, 4.6);
  ctx.fillStyle = "#a88a3a"; ovale(4.3, 0, 3, 3.2);
  ctx.fillStyle = "rgba(60,45,15,.55)"; for (const [wx, wy, r] of [[-2.5, -1.6, .55], [-1, 1.8, .5], [-3.5, 1, .45], [.8, -2.4, .45], [1.6, 1.2, .4], [-.8, -.2, .4]]) rond(wx, wy, r);
  for (const k of [-1, 1]) { ctx.fillStyle = "#8a7130"; rond(4.6, k * 2.2, 1.35); ctx.fillStyle = "#e6b84a"; rond(4.9, k * 2.2, 1); ctx.fillStyle = "#120d05"; ovale(5.1, k * 2.2, .55, .22); }
  ctx.restore();
}
function decorNilDessus(P, t) {
  const D = P.td;
  ctx.drawImage(fondPeint("nilDessus", peindreNilDessus), 0, 0, L, H);
  // le courant : des rides qui descendent le fleuve, des éclats de soleil
  ctx.save(); ctx.beginPath(); ctx.rect(TD.gauche, 0, TD.droite - TD.gauche + 2, H); ctx.clip();
  ctx.strokeStyle = "rgba(220,240,232,.28)"; ctx.lineWidth = .5;
  for (let k = 0; k < 34; k++) { const x = TD.gauche + 4 + bruit(k + 3) * 146, y = ((bruit(k + 7) * H + t * (.35 + bruit(k) * .3)) % (H + 20)) - 10, l = 5 + bruit(k + 9) * 6; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 1.2, y + l / 2, x, y + l); ctx.stroke(); }
  for (let k = 0; k < 12; k++) { ctx.fillStyle = `rgba(255,250,220,${.3 + .4 * Math.sin(t / 8 + k * 2)})`; ctx.fillRect(TD.gauche + 6 + bruit(k + 40) * 140, (bruit(k + 41) * H + t * .3) % H, .5, 2.5); }
  for (const [x, y] of [[54, 30], [176, 142], [56, 156], [176, 18]]) lotusDessus(x, y, t);
  ctx.restore();
  for (const C of D.crocs) crocDessus(C, t);
  // la visée : la trajectoire du saut et le point d'arrivée
  if (D.phase === "crapaud" && !D.saut && !D.chute && !P.bascule && !suiteEnAttente) {
    const x1 = D.x + Math.cos(D.ang) * TD.saut, y1 = D.y + Math.sin(D.ang) * TD.saut, cible = surQuoiDessus(D, x1, y1);
    ctx.strokeStyle = cible === null ? "rgba(255,130,120,.9)" : mordu(cible) ? "rgba(255,170,60,.95)" : "rgba(170,240,120,.95)"; ctx.lineWidth = .7; ctx.setLineDash([1.6, 1.6]);
    ctx.beginPath(); ctx.moveTo(D.x + Math.cos(D.ang) * 7, D.y + Math.sin(D.ang) * 7); ctx.lineTo(x1, y1); ctx.stroke(); ctx.setLineDash([]);
    ctx.beginPath(); ctx.arc(x1, y1, 4 + Math.sin(t / 6) * .5, 0, Math.PI * 2); ctx.stroke();
  }
  // la gerboise, la compagne du crapaud : elle attend sur la rive, puis suit son programme
  { const G = D.comp, enJeu = D.phase !== "crapaud";
    const gx = enJeu ? G.x : D.suiveur.x, gy = enJeu ? G.y : D.suiveur.y, gh = hauteurSaut(G.saut);
    if (G.chute) { const u = Math.min(1, G.chute / 24); ctx.strokeStyle = `rgba(220,240,250,${.7 * (1 - u)})`; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(gx, gy, 3 + u * 10, 0, Math.PI * 2); ctx.stroke(); gerboiseDessus(gx, gy, G.ang, .95 * (1 - .6 * u), 1 - u, false, t); }
    else { ctx.fillStyle = "rgba(0,0,0,.25)"; ovale(gx + 1 + gh * 4, gy + 1.4 + gh * 5, 4, 3.2); gerboiseDessus(gx, gy - gh * 3, enJeu ? G.ang : D.suiveur.ang, .95 + .3 * gh, 1, D.phase === "script", t); } }
  // le crapaud : il grandit pendant le saut (il monte vers nous) ; dans l'eau, il s'enfonce dans des ronds
  let haut = hauteurSaut(D.saut);
  if (D.chute) { const u = Math.min(1, D.chute / 24); ctx.strokeStyle = `rgba(220,240,250,${.7 * (1 - u)})`; ctx.lineWidth = .6; for (const f of [1, 1.7]) { ctx.beginPath(); ctx.arc(D.x, D.y, 3 + u * 10 * f, 0, Math.PI * 2); ctx.stroke(); } crapaudDessus(D.x, D.y, D.ang, .9 * (1 - .6 * u), 1 - u); }
  else { ctx.fillStyle = `rgba(0,0,0,${.3 - .12 * haut})`; ovale(D.x + 1 + haut * 4, D.y + 1.5 + haut * 5, 5 * (1 - .2 * haut), 4 * (1 - .2 * haut)); crapaudDessus(D.x, D.y - haut * 3, D.ang, .9 + .3 * haut, 1); }
}
function lotusDessus(x, y, t) {
  ctx.fillStyle = "#3f7a3a"; ctx.beginPath(); ctx.arc(x, y, 5, .3, Math.PI * 2 - .1); ctx.lineTo(x, y); ctx.fill();
  ctx.fillStyle = "#5a9a4a"; rond(x - .6, y - .6, 3.4);
  for (let p = 0; p < 8; p++) { const a = p / 8 * Math.PI * 2 + t / 300; ctx.fillStyle = p % 2 ? "#8a98e2" : "#a8b4f0"; ovale(x + 1.5 + Math.cos(a) * 1.6, y - 1 + Math.sin(a) * 1.6, 1.6, .7, a); }
  ctx.fillStyle = "#f2d060"; rond(x + 1.5, y - 1, .7);
}

// ============================================================
//  LA COMPAGNE : une gerboise (un petit rongeur sauteur du désert, qui ne sait pas nager), restée sur la rive. Une fois de l'autre côté, le crapaud la guide
//  par un petit programme (sauter, tourner à gauche ou à droite de 30° ou de 60°), qu'elle exécute pas à pas.
// ============================================================
const DEG = Math.PI / 180;
// avant son programme, la gerboise suit le crapaud comme une compagne, mais seulement sur la terre ferme, et avec un temps de retard :
// sur la rive, elle refait le chemin du crapaud quelques instants après lui ; quand il saute, elle hésite, puis va se poster
// à l'endroit d'où il s'est élancé et se tourne dans la direction de son saut. C'est de là qu'elle partira pour son programme.
const RETARD_GERBOISE = 18;
function suivreCrapaud(D) {
  const S = D.suiveur, surRive = D.sur === "gauche" && !D.chute && !D.saut;
  D.trace = D.trace || [];
  if (surRive) { D.trace.push({ x: D.x, y: D.y }); if (D.trace.length > RETARD_GERBOISE) D.trace.shift(); }
  else D.trace.length = 0;
  if (S.retard > 0) { S.retard--; return; }
  let cx, cy, versDepart = false;
  if (surRive) {
    if (Math.hypot(D.x - S.x, D.y - S.y) < 10 || D.trace.length < RETARD_GERBOISE) return;   // elle garde ses distances
    cx = D.trace[0].x; cy = D.trace[0].y;
  } else if (D.depart) { cx = D.depart.x; cy = D.depart.y; versDepart = true; }
  else return;
  cx = Math.max(6, Math.min(TD.gauche - 4, cx)); cy = Math.max(8, Math.min(H - 8, cy));
  const dx = cx - S.x, dy = cy - S.y, d = Math.hypot(dx, dy);
  if (d > .6) { const v = Math.min(d, 1.3); S.x += dx / d * v; S.y += dy / d * v; S.ang = Math.atan2(dy, dx); }
  else if (versDepart) { S.x = cx; S.y = cy; S.ang += (D.depart.ang - S.ang) * .15; }   // arrivée : elle regarde où le crapaud a sauté
}
const nouvelleGrenouille = (p = { x: 34, y: 90, ang: 0 }) => ({ x: p.x, y: p.y, ang: p.ang, saut: null, tourne: null, sur: "gauche", chute: 0, i: 0, pause: 0 });
const texteInstruction = I => I.type === "sauter" ? "Sauter" : `Tourner à ${I.sens} de ${I.deg}°`;
function bougerGrenouille(P) {
  const D = P.td, G = D.comp;
  if (D.phase === "arrivee") { if (++D.fin === 50) P.bascule = { t: 0, vers: "cote" }; return; }
  if (G.chute) {
    if (++G.chute >= 34) { P.td = nouvelleTraversee(); P.prog = []; afficherQuestion(); }
    return;
  }
  if (G.tourne) { const T = G.tourne; T.t++; G.ang = T.de + (T.a - T.de) * Math.min(1, T.t / 10); if (T.t >= 10) { G.tourne = null; G.pause = 8; } return; }
  if (G.saut) {
    const S = G.saut; S.t++;
    G.x = S.x0 + (S.x1 - S.x0) * S.t / S.n; G.y = S.y0 + (S.y1 - S.y0) * S.t / S.n;
    if (S.t < S.n) return;
    G.saut = null; G.sur = surQuoiDessus(D, G.x, G.y); G.pause = 10;
    if (S.marche && (G.sur === "gauche" || typeof G.sur === "number")) return;
    if (G.sur === null) { G.chute = 1; son("plouf"); messageGrenouille(`Plouf ! À l'instruction ${G.i}, la gerboise est tombée dans le Nil (elle ne sait pas nager, il faut la repêcher !). Tout recommence : le crapaud retourne sur la rive, et les crocodiles ont changé de place.`); return; }
    if (G.sur === "droite") { D.phase = "arrivee"; D.fin = 0; compterReponse(true); son("bravo"); messageGrenouille("Bravo ! Ton programme a guidé la gerboise jusqu'au temple."); afficherQuestion(); return; }
    if (mordu(G.sur)) { D.crocs[+G.sur.slice(1)].mord = 26; G.chute = 1; son("croc"); messageGrenouille(`Aïe ! À l'instruction ${G.i}, la gerboise n'est pas tombée sur la zone verte : le crocodile a voulu la mordre ! Tout recommence : le crapaud retourne sur la rive, et les crocodiles ont changé de place.`); return; }
    if (typeof G.sur === "number") { const C = D.crocs[G.sur]; G.x = C.x; G.y = C.y + TD.crocL / 2; son("bois"); }
    return;
  }
  if (G.pause > 0) { G.pause--; return; }
  // l'instruction suivante
  if (G.i >= (P.progPlat || []).length) {
    G.chute = 0; messageGrenouille("Le programme est terminé… mais la gerboise n'est pas arrivée sur la rive du temple. Complète-le !");
    Object.assign(D.comp, nouvelleGrenouille(D.depart)); D.phase = "script"; afficherQuestion(); return;
  }
  const I = P.progPlat[G.i++];
  if (I.type === "sauter") { G.saut = mouvement(G, TD.saut, false); son("saut"); }
  else G.tourne = { de: G.ang, a: G.ang + (I.sens === "gauche" ? -1 : 1) * I.deg * DEG, t: 0 };
  afficherQuestion();
}
function messageGrenouille(texte) {
  const r = $("retour"); r.className = texte.startsWith("Bravo") ? "ok" : "aide"; r.textContent = texte;
  setTimeout(() => { if (r.textContent === texte) r.className = "vide"; }, 6000);
}
// l'éditeur du programme de la gerboise : un éditeur à blocs, dans la fenêtre flottante
function blocGerboise(I, k, actif) {
  const deg = k === "pal" ? (P.degPal || 30) : I.deg, t = I.type === "sauter" ? "sauter" : I.sens === "gauche" ? "g" : "d";
  const nombre = `<span class="be-nombre"><button type="button" data-be-n="${k}" data-d="-1">−</button><b>${deg}</b><button type="button" data-be-n="${k}" data-d="1">+</button></span>`;
  const texte = t === "sauter" ? "⤴ sauter" : `tourner ${t === "g" ? "↺" : "↻"} de ${nombre} °`;
  return `<div class="be-bloc be-${t === "sauter" ? "sauter" : t}${actif ? " actif" : ""}" data-be-bloc="${k}" data-t="${t}">${texte}</div>`;
}
function panneauProgramme(P) {
  const D = P.td, enCours = D.phase !== "script", G = D.comp;
  const off = enCours ? " disabled" : "";
  majFlottant(`<div class="programme bloc-editeur${enCours ? " en-cours" : ""}">
    <div class="be-zones">
      <div class="be-palette">
        <div class="be-titre">Blocs</div>
        ${blocGerboise({ type: "sauter" }, "pal")}${blocGerboise({ type: "tourner", sens: "gauche" }, "pal")}${blocGerboise({ type: "tourner", sens: "droite" }, "pal")}${blocRepeter({ t: "rep", n: P.nRep || 2, corps: [] }, "palrep", blocGerboise)}
        <div class="be-poubelle" data-be="poubelle">🗑 glisse ici pour supprimer</div>
      </div>
      <div class="be-programme" data-be="prog" data-chemin="">
        <div class="be-chapeau">quand la gerboise part</div>
        ${blocsHTML(P.prog, "", blocGerboise, enCours ? (P.progChemins || [])[G.i - 1] : null)}
        ${P.prog.length ? "" : `<div class="be-vide">glisse les blocs ici</div>`}
      </div>
    </div>
    <div class="prog-actions"><button type="button" data-prog="effacer"${off}>Tout effacer</button><button type="button" data-prog="lancer"${off || (P.prog.length ? "" : " disabled")}>▶ Lancer</button></div>
  </div>`, "Programme de la gerboise");
  return `<div class="programme"><div class="prog-intro">La gerboise, ta compagne, est restée sur l'autre rive ! Elle saute très bien… mais elle ne sait pas nager. Elle part d'où tu t'es élancé, tournée dans la direction de ton saut. Compose son programme dans la fenêtre « Programme de la gerboise » : tu peux la déplacer et l'agrandir.</div>
    <div class="prog-actions"><button type="button" data-fl="ouvrir">▣ Afficher la fenêtre du programme</button></div></div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-prog]");
  if (!b || b.disabled || !niv || niv.sorte !== "nil" || !P.td || P.td.phase !== "script") return;
  const k = b.dataset.prog;
  if (k === "sauter") P.prog.push({ type: "sauter" });
  else if (/^[gd](30|60)$/.test(k)) P.prog.push({ type: "tourner", sens: k[0] === "g" ? "gauche" : "droite", deg: +k.slice(1) });
  else if (k === "retirer") P.prog.pop();
  else if (k === "effacer") P.prog = [];
  else if (k === "lancer" && P.prog.length) { const plat = aplatir(P.prog); P.progPlat = plat.map(x => x.I); P.progChemins = plat.map(x => x.chemin); Object.assign(P.td.comp, nouvelleGrenouille(P.td.depart)); P.td.phase = "execution"; $("retour").className = "vide"; }
  if (P.prog.length > 16) P.prog.length = 16;
  son("bois"); afficherQuestion();
});
// la gerboise vue de dessus : un petit corps couleur de sable, une grosse tête aux grandes oreilles, de très longues pattes
// arrière, une queue interminable terminée par une touffe noire et blanche ; une flèche montre où elle regarde
function gerboiseDessus(x, y, angle, s, alpha, fleche, t = 0) {
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x, y); ctx.rotate(angle); ctx.scale(s, s);
  const q = Math.sin(t / 12) * 1.2;
  ctx.strokeStyle = "#c8a46e"; ctx.lineWidth = .7; ctx.lineCap = "round";                       // la queue
  ctx.beginPath(); ctx.moveTo(-3.6, 0); ctx.bezierCurveTo(-8, q, -11, -q, -15, q * .6); ctx.stroke();
  ctx.fillStyle = "#1a1410"; ovale(-15.6, q * .6, 1.6, 1.1); ctx.fillStyle = "#f6efe0"; ovale(-17, q * .6, 1.2, .9);
  ctx.strokeStyle = "#b08a58"; ctx.lineWidth = 1;                                                // les longues pattes arrière, repliées
  for (const k of [-1, 1]) { ctx.beginPath(); ctx.moveTo(-2, k * 1.6); ctx.lineTo(-5.4, k * 3.4); ctx.lineTo(-1.6, k * 3.8); ctx.stroke(); }
  const g = ctx.createRadialGradient(-.4, -.6, .3, 0, 0, 4); g.addColorStop(0, "#f0d8a8"); g.addColorStop(1, "#c09460");
  ctx.fillStyle = g; ovale(-.6, 0, 3.4, 2.4);                                                    // le corps
  ctx.fillStyle = "#e0c08c"; rond(2.8, 0, 2);                                                    // la tête
  ctx.fillStyle = "#d8a880"; for (const k of [-1, 1]) { ovale(1.8, k * 2.4, 1.6, 1, k * .5); } ctx.fillStyle = "#f2c8b0"; for (const k of [-1, 1]) ovale(1.8, k * 2.4, .9, .5, k * .5);   // les grandes oreilles
  ctx.fillStyle = "#120d05"; for (const k of [-1, 1]) rond(3.6, k * 1, .45);                     // les yeux
  ctx.fillStyle = "#c08070"; rond(4.7, 0, .35);                                                  // le museau
  if (fleche) { ctx.fillStyle = "rgba(255,236,170,.9)"; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(6.6, -1.6); ctx.lineTo(6.6, 1.6); ctx.fill(); }
  ctx.restore();
}
// la gerboise de profil, assise sur ses longues pattes (sur le quai, à côté du crapaud)
// vue de côté : la gerboise est là dès le début ; elle suit le crapaud avec un temps de retard, sans jamais quitter la terre ferme
function suivreCote(P) {
  const G = P.gerb, [x0, x1] = P.compagnon ? [190, 202] : [2, 44], cx = heros.x + HW / 2;
  const surRive = heros.auSol && heros.etat === "libre" && cx >= x0 - 4 && cx <= x1 + 12;
  if (surRive) { G.trace.push(cx); if (G.trace.length > RETARD_GERBOISE) G.trace.shift(); } else G.trace.length = 0;
  let cible = G.x;
  if (surRive && G.trace.length >= RETARD_GERBOISE && Math.abs(cx - G.x) > 11) cible = G.trace[0] - Math.sign(cx - G.x) * 11;
  else if (!surRive && !P.compagnon && cx > x1) cible = x1;                       // le crapaud est sur l'eau : elle l'attend au bord de la rive
  cible = Math.max(x0, Math.min(x1, cible));
  const d = cible - G.x;
  if (Math.abs(d) > .5) { G.x += Math.sign(d) * Math.min(Math.abs(d), 1.8); G.dir = Math.sign(d); G.bond = (G.bond + 1) % 9; }
  else { G.bond = 0; if (Math.abs(cx - G.x) > 2) G.dir = Math.sign(cx - G.x); }
}
// LE PASSAGE DE RELAIS, au pied du temple : le babouin de Thot paraît sur le parvis et descend une marche ;
// la gerboise bondit à sa rencontre, ils se touchent la main (une gerbe d'étincelles d'or), puis elle repart
// en bondissant vers les papyrus et disparaît ; le babouin remonte attendre le crapaud à la porte.
const RELAIS = { parait: 30, descend: 40, rencontre: 84, separe: 118, part: 176, fin: 196 };
function dessinerRelais(P, t) {
  const r = P.relais, R = RELAIS, lisse = u => u <= 0 ? 0 : u >= 1 ? 1 : u * u * (3 - 2 * u);
  // le babouin : en haut (226, 106), en bas (212, 116)
  const descente = lisse((r - R.descend) / 16) - lisse((r - R.part) / 16), saut = Math.sin(Math.PI * Math.min(1, Math.max(0, ((r - R.descend) % 1000) / 16))) * (r < R.descend + 16 ? 5 : 0) + Math.sin(Math.PI * Math.min(1, Math.max(0, (r - R.part) / 16))) * (r > R.part ? 5 : 0);
  const bx = 228 - 6 * descente, bb = 106 - saut * .6;
  const ensemble = r >= R.rencontre && r < R.separe;
  ctx.save(); ctx.globalAlpha = Math.min(1, r / R.parait);
  ctx.translate(bx, bb); ctx.scale(.36, .36); babouinThot(0, 0, t, { pb: [{ g: 0, d: 0 }], etape: 0, pesee: ensemble ? { fin: 1 } : null }); ctx.restore();
  // la gerboise : du quai jusqu'au pied de la marche, puis elle repart vers la gauche et s'efface
  const G = P.gerb, va = lisse((r - (R.rencontre - 24)) / 24), revient = lisse((r - R.separe) / (R.part - R.separe));
  const gx = G.x + (212 - G.x) * va - (212 - 186) * revient, gb = 126 - 10 * va + 10 * Math.min(1, revient * 3), bond = r > R.separe && r < R.part ? Math.abs(Math.sin(r * Math.PI / 9)) * 3 : r > R.rencontre - 24 && r < R.rencontre ? Math.abs(Math.sin(r * Math.PI / 8)) * 3 : 0;
  if (r < R.part + 10) { ctx.save(); ctx.globalAlpha = 1 - lisse((r - (R.part - 30)) / 40); gerboiseCote(gx, gb - bond, t, r > R.separe ? -1 : 1); ctx.restore(); }
  // la main dans la main : des étincelles d'or
  if (ensemble) eclats(217, 104, t, 12, 7 + Math.sin(t / 3) * 2);
}
function gerboiseCote(x, base, t, dir = 1) {
  ctx.save(); ctx.translate(x, base); ctx.scale(dir, 1);
  const q = Math.sin(t / 14) * .8;
  ctx.strokeStyle = "#c8a46e"; ctx.lineWidth = .6; ctx.beginPath(); ctx.moveTo(-3, -2); ctx.bezierCurveTo(-8, -1, -11, 1 + q, -14, -1 + q); ctx.stroke();
  ctx.fillStyle = "#1a1410"; ovale(-14.6, -1 + q, 1.4, .9); ctx.fillStyle = "#f6efe0"; ovale(-15.8, -1.2 + q, 1, .7);
  trait([[-1.6, -1.6], [-1, 0], [1.4, 0]], "#b08a58", .9);                                         // la longue patte arrière
  ctx.fillStyle = "#d8b884"; ovale(0, -3.6, 3, 2.6); ctx.fillStyle = "#f4e6c8"; ovale(.8, -2.6, 1.8, 1.4);
  ctx.fillStyle = "#e0c08c"; rond(2.4, -6.4, 1.8);
  ctx.fillStyle = "#d8a880"; ovale(1.6, -8.8, .8, 1.8, -.2); ctx.fillStyle = "#f2c8b0"; ovale(1.7, -8.8, .4, 1.1, -.2);
  ctx.fillStyle = "#120d05"; rond(3, -6.8, .4); ctx.fillStyle = "#c08070"; rond(4.1, -6.2, .3);
  trait([[2.2, -4], [2.8, -2.6]], "#b08a58", .5);
  ctx.restore();
}

// ============================================================
//  LES PLATEAUX
// ============================================================
// ============================================================
//  PLATEAU 8 — LE BASSIN DE SOBEK (vu à hauteur de crapaud, dehors)
//  Sobek, le dieu à tête de crocodile, émerge de son bassin. Sur une stèle, un rectangle partagé en parts égales,
//  certaines coloriées : quelle fraction du rectangle est coloriée ? Faux : le crocodile dévore (les mâchoires se referment).
//  Une fraction égale est acceptée (6/8 comme 3/4).
// ============================================================
const SOBEK = { horizon: 92, stele: { x: 6, y: 64, w: 82, h: 92 }, zone: { x: 14, y: 82, w: 66, h: 54 } };
// les partages : des carrés, des carrés coupés par une diagonale (2 triangles), ou par les deux diagonales (4 triangles)
const PARTAGES = [
  [["carres", 4, 1], ["carres", 3, 2], ["carres", 4, 2], ["croix", 1, 1], ["diag", 2, 1]],
  [["diag", 2, 1], ["diag", 3, 1], ["diag", 2, 2], ["croix", 2, 1], ["carres", 3, 3]],
  [["diag", 3, 2], ["diag", 4, 2], ["croix", 2, 2], ["croix", 3, 1], ["carres", 4, 3]]
];
const PAR_CASE = { carres: 1, diag: 2, croix: 4 };
function grilleSobek(k) {
  const [type, c, r] = choisir(PARTAGES[Math.min(k, 2)]), n = c * r * PAR_CASE[type];
  const possibles = [...Array(n - 1).keys()].map(i => i + 1), simplifiables = possibles.filter(i => pgcd(i, n) > 1);
  const nb = k === 2 && simplifiables.length ? choisir(simplifiables) : choisir(possibles);   // la dernière se simplifie
  const cases = new Set(melanger([...Array(n).keys()]).slice(0, nb));
  return { type, c, r, n, nb, cases, sens: hasard(2) };
}
// les parts d'une case carrée (x, y, côté a) : des polygones
function partsCase(type, x, y, a, sens) {
  const A = [x, y], B = [x + a, y], C = [x + a, y + a], D = [x, y + a], O = [x + a / 2, y + a / 2];
  if (type === "carres") return [[A, B, C, D]];
  if (type === "diag") return sens ? [[A, B, D], [B, C, D]] : [[A, B, C], [A, C, D]];
  return [[A, B, O], [B, C, O], [C, D, O], [D, A, O]];
}
function qSobek(k, P) {
  const G = P.grille = grilleSobek(k), g = pgcd(G.nb, G.n);
  return qMaths(`<b>Quelle fraction du rectangle est coloriée ?</b> Donne-la sous forme <b>irréductible</b>.`, G.nb / G.n,
    `Le rectangle est partagé en ${G.n} parts égales${G.type === "carres" ? "" : " (des triangles)"}, et ${G.nb} ${G.nb > 1 ? "sont coloriées" : "est coloriée"} : ${G.nb}/${G.n}` + (g > 1 ? `, c'est-à-dire ${G.nb / g}/${G.n / g}.` : "."),
    { lire: lireFraction, a: G.nb / g, b: G.n / g, irreductible: true, placeholder: "ta fraction" });
}
// au crépuscule, au bord du Nil : pyramides et felouques au loin, le pylône d'un temple à droite
// la stèle, dressée sur des rochers au bord de l'eau, à gauche du dieu ; dessinée une fois (fond transparent), puis posée
function formeStele(S, m = 0) {
  ctx.beginPath(); ctx.moveTo(S.x + m, S.y + S.h - m); ctx.lineTo(S.x + m, S.y + 12 + m * .6); ctx.quadraticCurveTo(S.x + S.w / 2, S.y - 8 + m * 1.6, S.x + S.w - m, S.y + 12 + m * .6); ctx.lineTo(S.x + S.w - m, S.y + S.h - m); ctx.closePath();
}
// une texture de calcaire, calculée pixel par pixel (une fois) : un bruit fractal pour les nuances, de fines strates,
// des grains, et de petites piqûres creusées dont le bord du bas accroche la lumière
function texturePierre(w, h, res = 5) {
  const c = document.createElement("canvas"); c.width = Math.round(w * res); c.height = Math.round(h * res);
  const g = c.getContext("2d"), img = g.createImageData(c.width, c.height), D = img.data;
  const hache = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const lisse = u => u * u * (3 - 2 * u);
  const bruitV = (x, y) => { const i = Math.floor(x), j = Math.floor(y), u = lisse(x - i), v = lisse(y - j);
    return (hache(i, j) * (1 - u) + hache(i + 1, j) * u) * (1 - v) + (hache(i, j + 1) * (1 - u) + hache(i + 1, j + 1) * u) * v; };
  const fbm = (x, y) => { let s = 0, a = .5, f = 1; for (let o = 0; o < 5; o++) { s += a * bruitV(x * f, y * f); a /= 2; f *= 2.1; } return s; };
  const base = [226, 208, 170], clair = [244, 232, 204], sombre = [176, 150, 112];
  for (let py = 0; py < c.height; py++) for (let px = 0; px < c.width; px++) {
    const x = px / res, y = py / res;
    let n = fbm(x / 9, y / 9);
    n += Math.sin(y * .9 + fbm(x / 14, y / 5) * 6) * .05;                       // de fines strates, un peu ondulées
    const grain = (hache(px, py) - .5) * .09;
    const pique = bruitV(x * 1.3 + 40, y * 1.3), piqueH = bruitV(x * 1.3 + 40, (y - .35) * 1.3);
    let v = n + grain, k = 4 * (py * c.width + px);
    let col = v < .5 ? base.map((b, i) => b + (sombre[i] - b) * (.5 - v) * 2.2) : base.map((b, i) => b + (clair[i] - b) * (v - .5) * 2.2);
    if (pique > .86) col = col.map(q => q * .72);                                  // une piqûre
    else if (piqueH > .86) col = col.map(q => Math.min(255, q * 1.08));           // son bord éclairé
    D[k] = col[0]; D[k + 1] = col[1]; D[k + 2] = col[2]; D[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  return c;
}
function peindreStele() {
  const S = SOBEK.stele, bas = S.y + S.h;
  // son reflet dans l'eau, brisé par les rides
  for (let y = bas + 4, k = 0; y < H; y += 2.2, k++) { const d = Math.sin(k * 1.7) * 2; ctx.fillStyle = `rgba(214,190,150,${.22 - k * .012})`; ctx.fillRect(S.x + 6 + d, y, S.w - 12, 1.1); }
  // les rochers où elle est plantée
  for (const [x, y, rx, ry, c] of [[S.x + 8, bas + 2, 16, 7, "#4a3e34"], [S.x + S.w - 6, bas + 3, 18, 6, "#3e342c"], [S.x + S.w / 2, bas + 5, 30, 6, "#544638"]]) { ctx.fillStyle = c; ovale(x, y, rx, ry, 0); ctx.fillStyle = "rgba(255,190,130,.22)"; ovale(x - rx * .3, y - ry * .5, rx * .5, ry * .3, 0); }
  // l'épaisseur de la pierre, sur la droite, dans l'ombre
  ctx.fillStyle = "#7a5e44"; ctx.beginPath(); ctx.moveTo(S.x + S.w, S.y + 12); ctx.lineTo(S.x + S.w + 5, S.y + 15); ctx.lineTo(S.x + S.w + 5, bas + 1); ctx.lineTo(S.x + S.w, bas); ctx.fill();
  // la face : un calcaire chaud, plus sombre en bas et vers la droite
  formeStele(S); ctx.save(); ctx.clip();
  ctx.drawImage(texturePierre(S.w, S.h + 12), S.x, S.y - 10, S.w, S.h + 12);
  ctx.fillStyle = degrade(S.y, bas, "rgba(255,240,210,.12)", "rgba(0,0,0,0)", "rgba(60,40,24,.28)"); ctx.fillRect(S.x, S.y - 10, S.w, S.h + 12);
  const gx = ctx.createLinearGradient(S.x, 0, S.x + S.w, 0); gx.addColorStop(0, "rgba(255,200,140,.16)"); gx.addColorStop(1, "rgba(50,34,24,.26)"); ctx.fillStyle = gx; ctx.fillRect(S.x, S.y - 10, S.w, S.h + 12);
  // des fissures et des éclats
  for (const pts of [[[S.x + 8, S.y + 30], [S.x + 12, S.y + 36], [S.x + 10, S.y + 42]], [[S.x + S.w - 10, bas - 4], [S.x + S.w - 14, bas - 12], [S.x + S.w - 12, bas - 18]], [[S.x + 40, S.y + 2], [S.x + 43, S.y + 8]]]) trait(pts, "rgba(70,48,30,.55)", .45);
  ctx.restore();
  // un cadre gravé (une ombre, puis un trait de lumière juste à côté) : le creux de la pierre
  ctx.lineWidth = .8; formeStele(S, 3.5); ctx.strokeStyle = "rgba(80,56,34,.55)"; ctx.stroke();
  ctx.save(); ctx.translate(.6, .6); formeStele(S, 3.5); ctx.strokeStyle = "rgba(255,236,200,.5)"; ctx.stroke(); ctx.restore();
  // le cintre : un crocodile en relief, ton sur ton, couché au-dessus du panneau
  ctx.save(); ctx.translate(S.x + S.w / 2, S.y + 10);
  const croco = () => { ctx.beginPath(); ctx.moveTo(-24, 1); ctx.quadraticCurveTo(-18, -3, -8, -3); ctx.lineTo(12, -3); ctx.quadraticCurveTo(18, -4, 22, -1); ctx.lineTo(26, 0); ctx.lineTo(22, 1.6); ctx.lineTo(10, 2); ctx.lineTo(-8, 2); ctx.quadraticCurveTo(-18, 2.6, -24, 1); ctx.fill(); };
  ctx.fillStyle = "rgba(255,236,200,.45)"; ctx.translate(-.6, -.6); croco(); ctx.translate(.6, .6); ctx.fillStyle = "rgba(90,64,40,.5)"; croco();
  for (const x of [-12, -4, 6, 14]) { ctx.fillStyle = "rgba(90,64,40,.5)"; ctx.fillRect(x, 2, 1.4, 2.6); }
  ctx.restore();
  // le panneau creusé où est tracé le rectangle
  const Z = SOBEK.zone, px = Z.x - 3, py = Z.y - 3, pw = Z.w + 6, ph = Z.h + 6;
  ctx.fillStyle = "rgba(120,90,60,.22)"; ctx.fillRect(px, py, pw, ph);
  ctx.fillStyle = "rgba(60,40,24,.35)"; ctx.fillRect(px, py, pw, 1.2); ctx.fillRect(px, py, 1.2, ph);
  ctx.fillStyle = "rgba(255,236,200,.45)"; ctx.fillRect(px, py + ph - 1, pw, 1); ctx.fillRect(px + pw - 1, py, 1, ph);
  // la lumière du couchant sur le bord gauche et le cintre, puis le trait d'encre, comme dans l'illustration
  ctx.save(); formeStele(S); ctx.clip(); ctx.strokeStyle = "rgba(255,196,120,.7)"; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(S.x, bas); ctx.lineTo(S.x, S.y + 12); ctx.quadraticCurveTo(S.x + S.w / 2, S.y - 8, S.x + S.w, S.y + 12); ctx.stroke(); ctx.restore();
  ctx.strokeStyle = "#2e2016"; ctx.lineWidth = 1.1; formeStele(S); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(S.x + S.w, S.y + 12); ctx.lineTo(S.x + S.w + 5, S.y + 15); ctx.lineTo(S.x + S.w + 5, bas + 1); ctx.stroke();
  // des roseaux au pied de la pierre
  for (let k = 0; k < 9; k++) { const x = S.x - 4 + bruit(k + 580) * 16 + (k > 4 ? S.w - 6 : 0), h = 10 + bruit(k + 581) * 14, p = (bruit(k + 582) - .5) * 8;
    ctx.fillStyle = k % 2 ? "#2a4020" : "#3a5a2a"; ctx.beginPath(); ctx.moveTo(x - 1.2, bas + 6); ctx.quadraticCurveTo(x + p * .4, bas + 6 - h * .6, x + p, bas + 6 - h); ctx.quadraticCurveTo(x + p * .4 + 1, bas + 6 - h * .5, x + 1.2, bas + 6); ctx.fill(); }
}
function steleSobek() { ctx.drawImage(fondPeint("steleSobek", peindreStele), 0, 0, L, H); }
// le fond du plateau : l'illustration de Sobek au bord du Nil (1408 × 768), recadrée en 4/3 autour du dieu
// Sobek détouré (sceptre, ankh et queue compris), placé à (605, 0) dans l'illustration : on le redessine par-dessus ce qui passe derrière lui
const IMG_SOBEK_D = Object.assign(new Image(), { src: "images/sobek-detoure.png" }), DETOURE_SOBEK = [605, 0];
const IMG_SOBEK = Object.assign(new Image(), { src: "images/sobek.jpg" }), CADRE_SOBEK = { x: 120, y: 0, w: 1024, h: 768 };
const TETE_SOBEK = [176, 42];   // la tête du dieu, sur l'écran : c'est vers elle qu'on est happé quand il dévore
function decorSobek(P, t) {
  ctx.save(); ctx.translate(0, monteeSobek(P)); decorSobekScene(P, t); ctx.restore();
}
function decorSobekScene(P, t) {
  const lunge = P.devore ? Math.sin(Math.min(1, P.devore / 14) * Math.PI / 2) * (P.devore < 34 ? 1 : Math.max(0, 1 - (P.devore - 34) / 10)) : 0;
  if (IMG_SOBEK.complete && IMG_SOBEK.naturalWidth) {
    const C = CADRE_SOBEK, z = 1 + lunge * .35, [hx, hy] = TETE_SOBEK;
    ctx.save(); ctx.translate(hx, hy); ctx.scale(z, z); ctx.translate(-hx, -hy);
    // en vue de crapaud, en contre-plongée : l'image est tracée par bandes, de plus en plus larges vers le bas,
    // si bien que les verticales se resserrent en montant — on lève les yeux vers le dieu
    const N = 60, cx = 168, bandes = (img, ox, oy, iw, ih) => {
      for (let j = 0; j < N; j++) {
        const v = j / N, k = 1 + .55 * Math.pow(v, 1.3), sy = C.y + C.h * v - oy, sh = C.h / N + .6;
        if (sy + sh <= 0 || sy >= ih) continue;
        const y0 = Math.max(0, sy), y1 = Math.min(ih, sy + sh), dy = H * v + (y0 - sy) / C.h * H;
        ctx.drawImage(img, 0, y0, iw, y1 - y0, cx - cx * k + (ox - C.x) / C.w * L * k, dy, iw / C.w * L * k, (y1 - y0) / C.h * H + .4);
      }
    };
    bandes(IMG_SOBEK, 0, 0, 1408, 768);
    // des ibis qui volent au loin, en file, dans le ciel du couchant… et qui passent derrière le dieu (redessiné détouré par-dessus)
    for (let k = 0; k < 4; k++) {
      const per = 900, c = ((t + k * 26 + 300) % per) / per, x = L + 20 - c * (L + 60) - k * 7, y = 30 + k * 3 + Math.sin(t / 50 + k) * 1.5 + (k % 2) * 2;
      if (x > -10 && x < L + 10) ibisVol(x, y, .8, t + k * 7);
    }
    if (IMG_SOBEK_D.complete && IMG_SOBEK_D.naturalWidth) bandes(IMG_SOBEK_D, DETOURE_SOBEK[0], DETOURE_SOBEK[1], IMG_SOBEK_D.naturalWidth, IMG_SOBEK_D.naturalHeight);
    ctx.restore();
  } else { ctx.fillStyle = "#3a3466"; ctx.fillRect(0, 0, L, H); }
  steleSobek();
  // la grille de la stèle : des parts égales, gravées ; les parts coloriées en bleu égyptien
  const Z = SOBEK.zone, G = P.grille;
  if (G) {
    // des cases carrées, centrées dans la zone gravée
    const a = Math.min(Z.w / G.c, Z.h / G.r), x0 = Z.x + (Z.w - a * G.c) / 2, y0 = Z.y + (Z.h - a * G.r) / 2, parts = [];
    for (let j = 0; j < G.r; j++) for (let i = 0; i < G.c; i++) parts.push(...partsCase(G.type, x0 + i * a, y0 + j * a, a, G.sens));
    parts.forEach((pts, k) => poly(pts, G.cases.has(k) ? "#2c58a0" : "#efe2c2"));
    ctx.save(); ctx.beginPath(); ctx.rect(x0, y0, a * G.c, a * G.r); ctx.clip();   // le grain de la pierre, par-dessus la peinture
    for (let k = 0; k < 70; k++) { ctx.fillStyle = `rgba(${bruit(k + 590) < .5 ? "40,30,20" : "255,245,220"},${.06 + bruit(k + 591) * .07})`; rond(x0 + bruit(k + 592) * a * G.c, y0 + bruit(k + 593) * a * G.r, .3 + bruit(k + 594) * .7); }
    ctx.restore();
    ctx.strokeStyle = "#5a3a1e"; ctx.lineWidth = .7; ctx.lineJoin = "round";
    parts.forEach(pts => { ctx.beginPath(); pts.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.closePath(); ctx.stroke(); });
    ctx.lineWidth = 1.3; ctx.strokeRect(x0, y0, a * G.c, a * G.r);
    if (!P.sala || P.sala.grille !== G) P.sala = { grille: G, graphe: grapheSillons(parts) };
    salamandre(P, t);
  }
}
// les mâchoires qui se referment sur l'écran : le crocodile dévore
// Comme le serpent du « Crapaud et le jaguar » : une salamandre se promène au hasard le long des sillons du partage
// (les côtés des parts, diagonales comprises). À chaque croisement, elle prend une direction au hasard, sans faire demi-tour.
// La tête laisse une trace ; le corps la suit exactement.
function grapheSillons(parts) {
  const cle = ([x, y]) => `${Math.round(x * 10)},${Math.round(y * 10)}`, pts = {}, voisins = {};
  const ajoute = (A, B) => { const a = cle(A), b = cle(B); pts[a] = A; pts[b] = B; (voisins[a] = voisins[a] || new Set()).add(b); (voisins[b] = voisins[b] || new Set()).add(a); };
  parts.forEach(P => P.forEach((A, k) => ajoute(A, P[(k + 1) % P.length])));
  return { pts, voisins: Object.fromEntries(Object.entries(voisins).map(([k, v]) => [k, [...v]])) };
}
function avancerSalamandre(P) {
  const S = P.sala; if (!S || !S.graphe) return;
  const Gr = S.graphe;
  if (!S.de) { const cles = Object.keys(Gr.pts); S.de = cles[0]; S.vers = Gr.voisins[S.de][0]; S.u = 0; S.trace = []; }
  const A = Gr.pts[S.de], B = Gr.pts[S.vers], long = Math.hypot(B[0] - A[0], B[1] - A[1]) || 1;
  S.u += .32 / long;
  if (S.u >= 1) {
    S.u = 0; const venu = S.de; S.de = S.vers;
    const v = Gr.voisins[S.de], possibles = v.filter(k => k !== venu);
    S.vers = choisir(possibles.length ? possibles : v);
  }
  const C = Gr.pts[S.de], D = Gr.pts[S.vers];
  S.trace.unshift([C[0] + (D[0] - C[0]) * S.u, C[1] + (D[1] - C[1]) * S.u]);
  if (S.trace.length > 90) S.trace.length = 90;
}
// la salamandre tachetée : noire à taches jaunes, quatre pattes qui alternent, une longue queue
function salamandre(P, t) {
  const S = P.sala; if (!S || !S.trace || S.trace.length < 3) return;
  const T = S.trace, point = s => {
    let reste = s;
    for (let k = 1; k < T.length; k++) { const d = Math.hypot(T[k][0] - T[k - 1][0], T[k][1] - T[k - 1][1]) || 1e-6; if (reste <= d) return [T[k - 1][0] + (T[k][0] - T[k - 1][0]) * reste / d, T[k - 1][1] + (T[k][1] - T[k - 1][1]) * reste / d]; reste -= d; }
    return T[T.length - 1];
  };
  const K = 1.45, longueur = 13 * K, n = 30, larg0 = s => s < 1.8 ? .55 + s * .35 : s < 2.6 ? 1 : s < 6.5 ? 1.15 : Math.max(.12, 1.15 * (1 - (s - 6.5) / 6.5)), larg = s => larg0(s / K) * K;
  const axe = [], gauche = [], droite = [];
  for (let k = 0; k <= n; k++) {
    const s = k / n * longueur, [x, y] = point(s), [x2, y2] = point(s + .3), a = Math.atan2(y - y2, x - x2), w = larg(s) * .75;
    axe.push([x, y, a]); gauche.push([x - Math.sin(a) * w, y + Math.cos(a) * w]); droite.push([x + Math.sin(a) * w, y - Math.cos(a) * w]);
  }
  const pas = Math.sin(t / 3);
  // les pattes : devant (s ≈ 3) et derrière (s ≈ 6), en diagonale l'une de l'autre
  for (const [s0, ph] of [[3, 1], [6.2, -1]]) { const s = s0 * K;
    const [x, y, a] = axe[Math.round(s / longueur * n)];
    for (const c of [-1, 1]) { const b = pas * ph * c * .6, ang = a + c * (Math.PI / 2 - .5) + b;
      const genou = [x + Math.cos(ang) * 1.5 * K, y + Math.sin(ang) * 1.5 * K], pied = [genou[0] + Math.cos(ang - c * .9) * 1.1 * K, genou[1] + Math.sin(ang - c * .9) * 1.1 * K];
      trait([[x, y], genou, pied], "#14110e", .55 * K); }
  }
  ctx.fillStyle = "#14110e"; ctx.beginPath(); gauche.forEach(([x, y], k) => k ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); for (let k = droite.length - 1; k >= 0; k--) ctx.lineTo(...droite[k]); ctx.closePath(); ctx.fill();
  // les taches jaunes, de part et d'autre
  ctx.fillStyle = "#f2c42a"; for (const [s0, c] of [[1.2, 1], [2.9, -1], [4.3, 1], [5.6, -1], [7.4, 1], [9.2, -1]]) { const s = s0 * K, [x, y, a] = axe[Math.round(s / longueur * n)], w = larg(s) * .38; ovale(x - Math.sin(a) * w * c, y + Math.cos(a) * w * c, .42 * K, .32 * K, a); }
  // les yeux, ronds et brillants
  const [hx, hy, ha] = axe[1]; ctx.fillStyle = "#3a3020"; for (const c of [-1, 1]) rond(hx - Math.sin(ha) * .55 * K * c, hy + Math.cos(ha) * .55 * K * c, .3 * K);
}
// de petites animations sur l'illustration : la pierre rouge de la coiffe qui scintille, des éclats sur le Nil
const PIERRE_SOBEK = [184.3, 23.7], OEIL_SOBEK = [180.7, 35.6];
function etincelle(x, y, r, a) {
  ctx.save(); ctx.translate(x, y); ctx.globalAlpha = a;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.6); g.addColorStop(0, "rgba(255,250,220,.9)"); g.addColorStop(1, "rgba(255,200,120,0)"); ctx.fillStyle = g; ctx.fillRect(-r * 1.6, -r * 1.6, r * 3.2, r * 3.2);
  ctx.fillStyle = "#fffbe8"; for (const [w, h] of [[r, .22], [.22, r]]) { ctx.beginPath(); ctx.moveTo(-w, 0); ctx.lineTo(0, -h); ctx.lineTo(w, 0); ctx.lineTo(0, h); ctx.fill(); }
  ctx.restore();
}
// une libellule vue de dessus et de biais : de grands yeux, le thorax, un long abdomen annelé, quatre ailes qui vibrent
function libelluleVol(x, y, ang, t, couleur, sc = 1.7) {
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang); ctx.scale(sc, sc);
  const v = Math.sin(t * 2.7) * .5 + .5;
  for (const [dx, sy, a] of [[.3, 1, .45 + v * .25], [-.6, 1, .35 + (1 - v) * .25]]) for (const c of [-1, 1]) {
    ctx.fillStyle = `rgba(220,240,255,${a})`; ovale(dx, c * 2.1 * sy, .7, 2.2, c * .25);
    ctx.strokeStyle = "rgba(255,255,255,.35)"; ctx.lineWidth = .12; ctx.beginPath(); ctx.ellipse(dx, c * 2.1 * sy, .7, 2.2, c * .25, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.fillStyle = couleur; ovale(.2, 0, .9, .55, 0);                                           // le thorax
  for (let k = 0; k < 6; k++) { ctx.fillStyle = k % 2 ? couleur : "#1a1a22"; ovale(-1 - k * .75, 0, .45, .28 - k * .02, 0); }   // l'abdomen annelé
  ctx.fillStyle = "#1a1a22"; ovale(1.25, -.32, .38, .34, 0); ovale(1.25, .32, .38, .34, 0);       // les gros yeux
  ctx.restore();
}
// trois libellules, chacune dans son coin : elles font du surplace en tremblant, puis filent d'un coup ailleurs
function libellulesSobek(t) {
  const zones = [[95, 96, 40, 22, "#2ab0c0"], [20, 142, 70, 22, "#c8402a"], [188, 118, 42, 30, "#2a62c0"]];
  zones.forEach(([zx, zy, zw, zh, coul], k) => {
    const T = t + k * 17, n = Math.floor(T / 45), loc = T - n * 45;
    const p = m => [zx + bruit(k * 100 + m * 2) * zw, zy + bruit(k * 100 + m * 2 + 1) * zh];
    const [x0, y0] = p(n - 1), [x1, y1] = p(n), e = Math.min(1, loc / 7), u = e * e * (3 - 2 * e);
    const x = x0 + (x1 - x0) * u + Math.sin(t / 3 + k) * .4, y = y0 + (y1 - y0) * u + Math.sin(t / 2.3 + k * 2) * .5;
    libelluleVol(x, y, Math.atan2(y1 - y0, x1 - x0), t, coul);
  });
}
// un ibis en vol, en ombre chinoise, vers la gauche : le cou tendu, le bec courbe, les pattes qui traînent, les ailes qui battent
function ibisVol(x, y, s, t) {
  const b = Math.sin(t / 4), c = "rgba(34,24,40,.85)";
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  ctx.fillStyle = c; ovale(0, 0, 3, 1.1, 0);
  trait([[-2.4, 0], [-5, -.4]], c, .7); ctx.strokeStyle = c; ctx.lineWidth = .45; ctx.beginPath(); ctx.moveTo(-5, -.4); ctx.quadraticCurveTo(-7, -.2, -7.6, 1.2); ctx.stroke();
  trait([[2.6, .2], [6.4, .9]], c, .35);
  poly([[-1, -.3], [1.4, -.3], [.6 - b * .6, -4.2 * b]], c);
  ctx.restore();
}
function animerSobek(P, t) {
  // la même déformation que l'image : on suit la tête quand le dieu se jette en avant
  const lunge = P.devore ? Math.sin(Math.min(1, P.devore / 14) * Math.PI / 2) * (P.devore < 34 ? 1 : Math.max(0, 1 - (P.devore - 34) / 10)) : 0;
  const z = 1 + lunge * .35, [hx, hy] = TETE_SOBEK;
  ctx.save(); ctx.translate(hx, hy); ctx.scale(z, z); ctx.translate(-hx, -hy);
  // l'œil : la pupille fendue regarde la stèle, puis toi ; la paupière cligne de temps en temps ; il se plisse quand il croque
  const [ox, oy] = OEIL_SOBEK, cyc2 = (t % 140) / 140, regard = cyc2 < .45 ? -1 : cyc2 < .5 ? -1 + (cyc2 - .45) / .05 * 1.4 : .4;
  const cligne = (t % 120) < 6 ? Math.sin((t % 120) / 6 * Math.PI) : 0, plisse = lunge * .55, ferme = Math.max(cligne, plisse);
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(-.18);
  ctx.beginPath(); ctx.ellipse(0, 0, 1.55, .85, 0, 0, Math.PI * 2); ctx.clip();
  const gi = ctx.createRadialGradient(0, 0, .1, 0, 0, 1.6); gi.addColorStop(0, "#f2dc84"); gi.addColorStop(1, "#b89a3a"); ctx.fillStyle = gi; ctx.fillRect(-2, -1.2, 4, 2.4);
  ctx.fillStyle = "#16120a"; ovale(regard * .55, 0, .26, .8, 0);                                   // la pupille fendue
  ctx.fillStyle = "rgba(255,255,240,.8)"; rond(regard * .55 + .35, -.3, .14);                     // un point de lumière
  if (ferme > 0) { ctx.fillStyle = "#5c7646"; ctx.fillRect(-2, -1.2, 4, 2.4 * ferme); ctx.fillStyle = "#3a4c2c"; ctx.fillRect(-2, -1.2 + 2.4 * ferme - .2, 4, .25); }   // la paupière
  ctx.restore();
  ctx.save(); ctx.translate(ox, oy); ctx.rotate(-.18); ctx.strokeStyle = "#2a2a1c"; ctx.lineWidth = .3; ctx.beginPath(); ctx.ellipse(0, 0, 1.55, .85, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  // la pierre rouge : une lueur qui respire, et un reflet qui passe en travers, toutes les deux secondes et demie
  const [px, py] = PIERRE_SOBEK, r = 2.7, cyc = (t % 75) / 75;
  const g = ctx.createRadialGradient(px, py, 0, px, py, 5); g.addColorStop(0, `rgba(255,120,90,${.2 + .12 * Math.sin(t / 8)})`); g.addColorStop(1, "rgba(255,80,60,0)"); ctx.fillStyle = g; ctx.fillRect(px - 5, py - 5, 10, 10);
  if (cyc < .4) {
    const u = cyc / .4, d = -r * 1.6 + u * r * 3.2;   // la bande de lumière traverse la pierre, en biais
    ctx.save(); ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2); ctx.clip();
    ctx.translate(px + d, py); ctx.rotate(.6);
    const b = ctx.createLinearGradient(-1.4, 0, 1.4, 0); b.addColorStop(0, "rgba(255,240,220,0)"); b.addColorStop(.5, `rgba(255,248,232,${.85 * Math.sin(u * Math.PI)})`); b.addColorStop(1, "rgba(255,240,220,0)");
    ctx.fillStyle = b; ctx.fillRect(-1.4, -r * 2, 2.8, r * 4);
    ctx.restore();
  }
  ctx.restore();
  // des éclats de lumière sur le fleuve, à droite de la stèle
  for (let k = 0; k < 6; k++) { const c = ((t + k * 23) % 60) / 60; if (c < .3) etincelle(92 + bruit(k + 950 + Math.floor((t + k * 23) / 60)) * 40, 96 + bruit(k + 960 + Math.floor((t + k * 23) / 60)) * 14, 1.2, Math.sin(c / .3 * Math.PI) * .8); }
}
// La fin du plateau : la nuit tombe sur le bord du Nil, les étoiles s'allument. Un ibis quitte sa file, vole droit
// sur nous, nous attrape… et nous emporte : on monte dans la nuit, le bord du Nil s'éloigne vers le bas.
const RELAIS_SOBEK = { nuit: 100, sobek: 50, ibisVient: 110, ibisParle: 140, saisit: 200, fin: 330 };
const monteeSobek = P => P.sortie > RELAIS_SOBEK.saisit ? Math.pow((P.sortie - RELAIS_SOBEK.saisit) / 130, 1.6) * 190 : 0;
function nuitSobek(P, t) {   // le voile de la nuit et les étoiles, sur l'image
  if (!P.sortie) return;
  const nuit = Math.min(1, P.sortie / RELAIS_SOBEK.nuit);
  ctx.fillStyle = `rgba(10,12,34,${nuit * .55})`; ctx.fillRect(0, -200, L, H + 200);
  for (let k = 0; k < 40; k++) { const y = bruit(k + 970) ** 1.5 * 70, a = Math.max(0, nuit - bruit(k + 971) * .6) * (.6 + .4 * Math.sin(t / 9 + k)); ctx.fillStyle = `rgba(255,250,230,${a})`; rond(bruit(k + 972) * L, y, .3 + bruit(k + 973) * .4); }
}
// un ibis vu de face, qui vient droit sur nous : les grandes ailes blanches au bout noir qui battent, le corps,
// la tête et le cou noirs, le long bec courbe qui pointe vers nous, les pattes qui pendent, prêtes à saisir
function ibisDeFace(x, y, sc, t) {
  const b = Math.sin(t / 2.2);
  ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
  for (const c of [-1, 1]) {
    const bout = [c * 11, -2 - b * 5], milieu = [c * 6, -1.6 - b * 2.4];
    ctx.fillStyle = "#f4efe4"; ctx.beginPath(); ctx.moveTo(c * 1.2, -1.2); ctx.quadraticCurveTo(milieu[0], milieu[1] - 1.6, bout[0], bout[1]); ctx.quadraticCurveTo(milieu[0] + c * .6, milieu[1] + 1.8, c * 1.2, 1); ctx.fill();
    ctx.fillStyle = "#1e1a18"; ctx.beginPath(); ctx.moveTo(bout[0], bout[1]); ctx.lineTo(bout[0] - c * 2.6, bout[1] + .2 + b * .4); ctx.lineTo(bout[0] - c * 1.6, bout[1] + 1.4); ctx.fill();   // le bout noir
    ctx.strokeStyle = "rgba(160,150,140,.5)"; ctx.lineWidth = .12; for (let k = 1; k < 4; k++) { ctx.beginPath(); ctx.moveTo(c * (1.2 + k * 2.2), -1 - b * k * .9); ctx.lineTo(c * (1.6 + k * 2.2), .6 - b * k * .5); ctx.stroke(); }   // les plumes
  }
  ctx.fillStyle = "#f4efe4"; ovale(0, .6, 1.5, 2.2, 0);                       // le corps
  trait([[-.5, 2.4], [-.8, 5]], "#2a2420", .3); trait([[.5, 2.4], [.8, 5]], "#2a2420", .3);   // les pattes
  ctx.fillStyle = "#1e1a18"; ovale(0, -1.6, .55, 1.2, 0); rond(0, -2.8, .75);   // le cou et la tête noirs
  ctx.strokeStyle = "#1e1a18"; ctx.lineWidth = .35; ctx.beginPath(); ctx.moveTo(0, -2.4); ctx.quadraticCurveTo(.5, -.8, .1, .6); ctx.stroke();   // le bec, qui pointe vers nous
  ctx.fillStyle = "#e8d8a0"; rond(-.3, -3, .16); rond(.3, -3, .16);
  ctx.restore();
}
function ibisQuiArrive(P, t) {   // l'ibis qui fond sur nous, de plus en plus grand, ailes battantes
  const R = RELAIS_SOBEK, f = P.sortie; if (!f || f < R.ibisVient || f > R.saisit + 8) return;
  const e = Math.min(1, (f - R.ibisVient) / (R.saisit - R.ibisVient)), u = e * e * e, sc = .9 + u * 9, x = 150 - u * 30, y = 36 + u * 40;
  ibisDeFace(x, y, sc, t);
}
function porteParIbis(P, t) {   // emportés : la nuit au-dessus, les pattes de l'ibis qui nous tiennent, ses ailes qui battent en haut
  const m = monteeSobek(P); if (!m) return;
  ctx.fillStyle = degrade(-10, m + 4, "#060818", "#141a3a"); ctx.fillRect(0, 0, L, m + 2);
  for (let k = 0; k < 30; k++) { const y = bruit(k + 990) * (m + 4); if (y < m) { ctx.fillStyle = `rgba(255,250,230,${.4 + bruit(k + 991) * .5})`; rond(bruit(k + 992) * L, y, .3 + bruit(k + 993) * .4); } }
  trait([[108, -4], [112, 14], [116, 22]], "#1e1a18", 1.6); trait([[132, -4], [128, 14], [124, 22]], "#1e1a18", 1.6);   // les pattes, qui serrent
  for (const [x, c] of [[116, 1], [124, -1]]) for (const d of [-2, 0, 2]) trait([[x, 22], [x + c * 2 + d, 26]], "#1e1a18", .7);
  const b = Math.sin(t / 2.2) * 12; for (const c of [-1, 1]) { ctx.fillStyle = "#f4efe4"; ctx.beginPath(); ctx.moveTo(120 + c * 6, -6); ctx.quadraticCurveTo(120 + c * 50, -20 + b, 120 + c * 90, 6 + b); ctx.quadraticCurveTo(120 + c * 50, 4 + b * .5, 120 + c * 6, 6); ctx.fill(); }
}
function devantSobek(P, t) {
  ctx.save(); ctx.translate(0, monteeSobek(P)); ctx.filter = "blur(1.2px)";
  for (let k = 0; k < 16; k++) {   // à gauche, les herbes restent sous la stèle
    const gauche = k < 8, x = gauche ? -6 + k * 7 + bruit(k + 700) * 5 : 186 + (k - 8) * 8 + bruit(k + 700) * 5, h = gauche ? 12 + bruit(k + 701) * 14 : 40 + bruit(k + 701) * 50, pen = (bruit(k + 702) - .5) * 24 + Math.sin(t / 40 + k) * 2;
    ctx.fillStyle = k % 3 ? "#1e3218" : "#2c4a22"; ctx.beginPath(); ctx.moveTo(x - 3, H + 2); ctx.quadraticCurveTo(x + pen * .3, H - h * .6, x + pen, H - h); ctx.quadraticCurveTo(x + pen * .3 + 2, H - h * .5, x + 4, H + 2); ctx.fill();
  }
  ctx.restore();
  const v = ctx.createRadialGradient(L / 2, H / 2, 90, L / 2, H / 2, 170); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,.35)"); ctx.fillStyle = v; ctx.fillRect(0, 0, L, H);
  const m = monteeSobek(P);
  ctx.save(); ctx.translate(0, m); nuitSobek(P, t); animerSobek(P, t); ctx.restore();
  ibisQuiArrive(P, t); porteParIbis(P, t);
  if (!P.devore || P.devore < 12) return;
  const f = P.devore - 12, u = f < 8 ? f / 8 : f < 22 ? 1 : Math.max(0, 1 - (f - 22) / 8), ferme = u * u * (3 - 2 * u), haut = ferme * (H / 2 + 6);
  const sec = f > 6 && f < 22 ? (bruit(f) - .5) * 4 : 0;
  ctx.save(); ctx.translate(sec, sec * .5);
  for (const [sens, bord] of [[1, haut - 10], [-1, H - haut + 10]]) {
    ctx.fillStyle = sens > 0 ? degrade(bord - 120, bord, "#2e4a20", "#4f7a3a") : degrade(bord, bord + 120, "#4f7a3a", "#2e4a20");
    ctx.fillRect(-10, sens > 0 ? bord - 200 : bord, L + 20, 200);
    ctx.fillStyle = "#7a2a20"; ctx.fillRect(-10, sens > 0 ? bord - 4 : bord, L + 20, 4);
    for (let x = -6; x < L + 10; x += 12) poly([[x, bord], [x + 9, bord], [x + 4.5, bord + sens * 13]], "#f6f0dc");
  }
  ctx.restore();
}
// ============================================================
//  LES BALADES VERS LE MONDE OBSCUR (vue de côté, le décor défile)
//  Plateau 8 : au crépuscule, un crocodile de Sobek mène le crapaud le long du Nil jusqu'au temple de son maître.
//  Plateau 10 : la nuit, un chacal noir, Oupouaout « l'ouvreur des chemins », le mène jusqu'aux pyramides.
//  Trois fois, le compagnon demande un mot (numération pour le crocodile, calcul pour le chacal).
//  Juste : +1 point, et le chemin s'éclaire ; faux : −3 points, l'obscurité se resserre.
// ============================================================
const BALADE = { sol: 140, fin: 440, ecran: 96, paroles: [20, 160, 300] };
const MOTS_NUMERATION = [
  ["le chiffre placé juste après la virgule", ["le chiffre des dixièmes", "le chiffre des centièmes", "le chiffre des unités", "le chiffre des dizaines"]],
  ["le deuxième chiffre après la virgule", ["le chiffre des centièmes", "le chiffre des dixièmes", "le chiffre des millièmes", "le chiffre des dizaines"]],
  ["le chiffre placé juste avant la virgule", ["le chiffre des unités", "le chiffre des dizaines", "le chiffre des dixièmes", "le chiffre des centaines"]],
  ["la partie d'un nombre décimal placée avant la virgule", ["la partie entière", "la partie décimale", "la dizaine", "la centaine"]],
  ["la partie d'un nombre décimal placée après la virgule", ["la partie décimale", "la partie entière", "la dizaine", "la centaine"]],
  ["un groupe de dix unités", ["une dizaine", "une centaine", "un millier", "un dixième"]],
  ["un groupe de cent unités", ["une centaine", "une dizaine", "un millier", "un centième"]],
  ["un groupe de mille unités", ["un millier", "une centaine", "une dizaine", "un millième"]],
  ["une des dix parts égales d'une unité", ["un dixième", "un centième", "une dizaine", "un millième"]],
  ["une des cent parts égales d'une unité", ["un centième", "un dixième", "une centaine", "un millième"]],
  ["le signe qui sépare la partie entière de la partie décimale", ["la virgule", "la barre de fraction", "la parenthèse", "la flèche"]]
];
const MOTS_NOMBRES = [
  ["le résultat d'une multiplication", ["le produit", "la somme", "le quotient", "la différence"]],
  ["le résultat d'une addition", ["la somme", "le produit", "la différence", "le quotient"]],
  ["le résultat d'une soustraction", ["la différence", "la somme", "le produit", "le reste"]],
  ["le résultat d'une division", ["le quotient", "le produit", "la différence", "le dividende"]],
  ["le nombre qui reste à la fin d'une division euclidienne", ["le reste", "le quotient", "le diviseur", "le produit"]],
  ["le nombre que l'on partage, dans une division", ["le dividende", "le diviseur", "le quotient", "le reste"]],
  ["le nombre du haut, dans une fraction", ["le numérateur", "le dénominateur", "le quotient", "le diviseur"]],
  ["le nombre du bas, dans une fraction", ["le dénominateur", "le numérateur", "le dividende", "le reste"]],
  ["un nombre qui divise un autre nombre sans reste", ["un diviseur", "un multiple", "un quotient", "un produit"]],
  ["un nombre que l'on obtient en multipliant un nombre entier par un autre", ["un multiple", "un diviseur", "un reste", "un dénominateur"]],
  ["une fraction dont le dénominateur est 10, 100, 1 000…", ["une fraction décimale", "une fraction irréductible", "une fraction égale", "une fraction inverse"]],
  ["une fraction qu'on ne peut plus simplifier", ["une fraction irréductible", "une fraction décimale", "une fraction égale", "une fraction inverse"]]
];
// ce que disent les compagnons
const COMPAGNONS = {
  croco: { mots: MOTS_NUMERATION, intro: "Je suis un crocodile de Sobek. Mon maître t'attend au bout du fleuve. Réponds-moi en chemin. ", bien: "« Bien, petit crapaud. Sobek sera content. »", faux: "« Grrr… Sobek n'aimerait pas ça. »" },
  chacal: { mots: MOTS_NOMBRES, intro: "Pour avancer dans la nuit, réponds-moi. ", bien: "« Bien. Le chemin s'ouvre. »", faux: "« Non… La nuit se referme sur toi. »" }
};
// Plateau 8 : le crocodile s'arrête devant une borne gravée d'un nombre décimal (6 chiffres tous différents)
// et demande un chiffre (dixièmes, centièmes, unités…) ou un nombre (de dizaines, de centaines).
function nombreBorne() {
  const ch = melanger([1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, 6), e = +ch.slice(0, 4).join(""), d = ch.slice(4).join("");
  return { e, d, ch, texte: `${Math.floor(e / 1000)} ${String(e % 1000).padStart(3, "0")},${d}` };
}
function qBorne(k, P) {
  const N = P.nombres[k], C = COMPAGNONS.croco, intro = k === 0 ? C.intro : "";
  const [m, c, dz, u, di, ce] = N.ch, autres = x => melanger(N.ch.filter(v => v !== x)).slice(0, 3);
  let q, bonne, choix, expl;
  if (k === 0 || (k === 1 && Math.random() < .3)) {
    const [nom, v, ou] = choisir([["des dixièmes", di, "le premier chiffre après la virgule"], ["des centièmes", ce, "le deuxième chiffre après la virgule"]]);
    q = `quel est le chiffre ${nom} ?`; bonne = v; choix = [v, ...autres(v)]; expl = `Le chiffre ${nom}, c'est ${ou} : ${v}.`;
  } else if (k === 1) {
    const [nom, v, ou] = choisir([["des unités", u, "juste avant la virgule"], ["des dizaines", dz, "deux rangs avant la virgule"], ["des centaines", c, "trois rangs avant la virgule"], ["des milliers", m, "quatre rangs avant la virgule"]]);
    q = `quel est le chiffre ${nom} ?`; bonne = v; choix = [v, ...autres(v)]; expl = `Le chiffre ${nom} est ${ou} : ${v}.`;
  } else {
    const [nom, div] = choisir([["de dizaines", 10], ["de centaines", 100]]), v = Math.floor(N.e / div);
    const pieges = [div === 100 ? c : dz, Math.floor(N.e / (div * 10)), Math.floor(N.e / (div / 10))].filter((x, i, t) => x !== v && t.indexOf(x) === i);
    while (pieges.length < 3) pieges.push(v + pieges.length + 1);
    q = `combien y a-t-il ${nom} dans ce nombre ?`; bonne = v; choix = [v, ...pieges.slice(0, 3)];
    expl = `${N.e} = ${v} × ${div} + ${N.e % div} : il y a ${v} ${nom.slice(3)}. (Le chiffre ${nom.replace("de ", "des ")} n'est que ${div === 100 ? c : dz}.)`;
  }
  return qChoix("maths", `<div class="replique"><img src="${portrait("croco")}" alt=""><span>« ${intro}Regarde la borne : <b>${N.texte}</b>. ${q.charAt(0).toUpperCase() + q.slice(1)} »</span></div><i>Que lui réponds-tu ?</i>`,
    choix.map(x => `« C'est ${x}. »`), "", { repliques: [[portrait("croco"), C.faux], [portrait("croco"), expl]] });
}
function qBalade(k, qui) {
  if (qui === "croco") return qBorne(k, P);
  const C = COMPAGNONS[qui], libres = C.mots.filter(o => !dejaPosees.has(o[0])), [def, choix] = libres.length ? choisir(libres) : C.mots[0];
  dejaPosees.add(def);
  const steles = qui === "chacal";
  return qChoix("maths", `<div class="replique"><img src="${portrait(qui)}" alt=""><span>« ${k === 0 ? C.intro : ""}<b>Comment nomme-t-on ${def} ?</b> »</span></div><i>${steles ? "Les réponses sont gravées sur les stèles, plus loin dans le noir : va toucher la bonne et appuie sur ↓." : "Que lui réponds-tu ?"}</i>`,
    choix.map(c => `« C'est ${c}. »`), "", { repliques: [[portrait(qui), C.faux]], steles });
}
// le chacal noir d'Anubis, de profil : oreilles dressées, long museau, queue tombante, collier d'or ; ses yeux luisent
function chacal(x, base, t, marche, dir = 1) {
  const p = marche ? Math.sin(t / 3) : 0;
  ctx.save(); ctx.translate(x, base); ctx.scale(dir, 1);
  const noir = "#15121a";
  trait([[-5, -6], [-6 - p * 1.5, 0]], noir, 1.4); trait([[-3, -6], [-2 + p * 1.5, 0]], noir, 1.4); trait([[4, -6], [5 + p * 1.5, 0]], noir, 1.4); trait([[6, -6], [7 - p * 1.5, 0]], noir, 1.4);
  ctx.fillStyle = noir; ovale(0, -8, 8, 3.4, 0);
  ctx.beginPath(); ctx.moveTo(-7, -9); ctx.quadraticCurveTo(-12, -6, -11, 0); ctx.quadraticCurveTo(-9, -5, -6, -7); ctx.fill();
  ctx.beginPath(); ctx.moveTo(5, -10); ctx.lineTo(8, -16); ctx.lineTo(11, -15); ctx.lineTo(9, -9); ctx.fill();
  ovale(10, -16, 3, 2.2, 0); poly([[11, -17.5], [17, -15.6], [11, -14.4]], noir);
  poly([[8.6, -17], [9, -22], [10.6, -17.6]], noir); poly([[10, -17.4], [11.2, -21.6], [11.8, -17.2]], noir);
  ctx.fillStyle = "#d9a62e"; ctx.fillRect(7.4, -12.4, 3.2, 1.2);
  ctx.fillStyle = `rgba(255,200,90,${.7 + .3 * Math.sin(t / 7)})`; rond(11.4, -16.6, .7);
  ctx.restore();
}
// un crocodile du Nil qui marche, de profil (vers la droite) : un corps bas et massif sur des pattes écartées,
// une longue queue à crête qui ondule, la tête plate au sourire plein de dents, l'œil sur une bosse.
// Il appartient à Sobek : un bracelet et une boucle d'or. Unités : le sol est à 0, la tête vers x positif.
function crocoMarche(x, base, t, marche, dir = 1) {
  const ph = marche ? t / 3.5 : 0, ond = u => marche ? Math.sin(t / 6 - u * .18) : Math.sin(t / 30 - u * .1) * .3;
  // le profil : la ligne du milieu et l'épaisseur, de la pointe de la queue (-34) au museau (24)
  const milieu = u => u < -8 ? -2 + (u + 34) / 26 * -3.2 + ond(u) * (-8 - u) / 26 * 1.6 : u < 11 ? -5.4 + Math.sin((u + 8) / 19 * Math.PI) * -.3 : -5.6 + (u - 11) / 13 * 1.2;
  const demi = u => u < -8 ? .4 + (u + 34) / 26 * 2.8 : u < 8 ? 3.2 : u < 11 ? 3.2 - (u - 8) / 3 * .6 : u < 15 ? 2.6 : 2.6 - (u - 15) / 9 * 1.6;
  const haut = u => milieu(u) - demi(u) - (u > 12 && u < 14.6 ? Math.sin((u - 12) / 2.6 * Math.PI) * 1.1 : 0) - (u > 21.6 && u < 23.4 ? Math.sin((u - 21.6) / 1.8 * Math.PI) * .5 : 0);
  const bas = u => milieu(u) + demi(u);
  const vert = "#3e5a2c", fonce = "#25381a", ventre = "#bdb47c";
  ctx.save(); ctx.translate(x, base); ctx.scale(dir, 1);
  // une patte : la cuisse sort du corps, le coude plié, le pied à plat avec ses doigts griffus
  const patte = (px, pas, loin) => {
    const c = loin ? fonce : vert, a = Math.sin(pas), lev = Math.max(0, Math.cos(pas)) * 1.2;
    const hanche = [px, -4], genou = [px + 1.6 + a * 1.4, -2.2 - lev * .6], pied = [px + .8 + a * 2.6, -lev];
    trait([hanche, genou], c, 1.8); trait([genou, pied], c, 1.3);
    for (const d of [-1, 0, 1]) trait([pied, [pied[0] + 1.5, pied[1] + .05 + d * .35]], c, .5);
  };
  patte(-6, ph + Math.PI, true); patte(6, ph, true);                       // les pattes du côté caché, plus sombres
  // le corps entier, d'un seul contour
  ctx.beginPath(); for (let u = -34; u <= 24; u += .5) ctx.lineTo(u, haut(u)); for (let u = 24; u >= -34; u -= .5) ctx.lineTo(u, bas(u)); ctx.closePath();
  ctx.fillStyle = degrade(-9.5, -1.5, fonce, vert, "#6a8240", ventre); ctx.fill();
  ctx.save(); ctx.clip();
  for (let u = -30; u < 12; u += 1.7) trait([[u, haut(u) + .3], [u + .2, bas(u) - .2]], "rgba(20,32,12,.28)", .3);          // les bandes d'écailles
  for (let k = 0; k < 14; k++) { const u = -28 + bruit(k + 900) * 38; ctx.fillStyle = "rgba(20,30,10,.3)"; ovale(u, milieu(u) - demi(u) * .3, .9 + bruit(k + 901) * 1.2, .5, 0); }   // des taches
  ctx.fillStyle = "rgba(255,250,220,.12)"; for (let u = -20; u < 22; u += 1.2) rond(u, haut(u) + .9, .35);                  // la lumière du couchant sur le dos
  ctx.restore();
  // les écailles du dos : une double crête, plus haute sur la queue
  for (let u = -31; u < 10; u += 1.5) { const h = u < -8 ? 1.1 : .7, y = haut(u); poly([[u - .6, y + .2], [u, y - h], [u + .6, y + .2]], fonce); }
  // la gueule : la ligne qui remonte vers l'œil, les dents qui dépassent en haut et en bas
  const bouche = u => -4.5 - (u < 15 ? (15 - u) * .25 : 0) + (u - 15) * .06;
  trait([...Array(14).keys()].map(k => [11.5 + k, bouche(11.5 + k)]), "#1a1208", .4);
  for (let u = 13; u < 23.5; u += 1.3) { poly([[u, bouche(u)], [u + .5, bouche(u)], [u + .25, bouche(u) + .9]], "#f4eed8"); poly([[u + .6, bouche(u + .6)], [u + 1.1, bouche(u + .6)], [u + .85, bouche(u + .6) - .8]], "#f4eed8"); }
  // l'œil jaune à pupille fendue, sur sa bosse ; la narine au bout du museau
  ctx.fillStyle = "#e8c040"; ovale(13.4, -8.3, .95, .7, 0); ctx.fillStyle = "#14100a"; ovale(13.5, -8.3, .22, .62, 0); trait([[12.2, -8.9], [14.4, -9]], fonce, .35);
  ctx.fillStyle = "#14100a"; rond(22.6, -6.1, .3);
  // les pattes du côté visible, et le bracelet d'or de Sobek
  patte(-6, ph, false); patte(6, ph + Math.PI, false);
  ctx.fillStyle = "#e0b040"; const a = Math.sin(ph + Math.PI); ctx.fillRect(6.9 + a * .6, -2.9, 1.6, .7);
  ctx.restore();
}
// --- les décors : une bande de ciel, deux bandes qui défilent (lointaine, proche) et le chemin ---
function peindreCielCrepuscule() {
  ctx.fillStyle = degrade(0, 110, "#2a2a58", "#6a4a78", "#d0704a", "#f0a85a"); ctx.fillRect(0, 0, L, H);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = `rgba(${k < 3 ? "60,46,90" : "190,96,70"},.45)`; ovale(bruit(k + 860) * L, 14 + bruit(k + 861) * 50, 18 + bruit(k + 862) * 26, 2 + bruit(k + 863) * 2, 0); }
}
function peindreCielJour() {   // la fin d'après-midi, au départ de la balade
  ctx.fillStyle = degrade(0, 110, "#5a96c8", "#9cc4dc", "#efd6a4"); ctx.fillRect(0, 0, L, H);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = "rgba(255,255,255,.4)"; ovale(bruit(k + 860) * L, 14 + bruit(k + 861) * 50, 18 + bruit(k + 862) * 26, 2 + bruit(k + 863) * 2, 0); }
}
function peindreLoinCrepuscule() {   // l'autre rive, ses palmiers, en ombres chinoises
  ctx.fillStyle = "#3a2a40"; ctx.fillRect(0, 100, L, 6);
  for (let k = 0; k < 20; k++) for (const dx of [0, -L, L]) palmier(k * 12 + bruit(k + 870) * 6 + dx, 102, 7 + bruit(k + 871) * 6, 870 + k, (bruit(k + 872) - .5) * .6, 0);
  ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = "#3a2a40"; ctx.fillRect(0, 0, L, H); ctx.globalCompositeOperation = "source-over";   // des ombres chinoises
}
function peindrePresCrepuscule() {   // le Nil qui reflète le couchant, des roseaux sombres le long de la berge
  for (let k = 0; k < 14; k++) papyrus(k * 18 + bruit(k + 884) * 8, 141, 3, 12 + bruit(k + 885) * 10, 884 + k, 0, 0);
  ctx.globalCompositeOperation = "source-atop"; ctx.fillStyle = "rgba(34,30,40,.78)"; ctx.fillRect(0, 0, L, H);
  ctx.globalCompositeOperation = "destination-over";
  for (let k = 0; k < 40; k++) { ctx.fillStyle = `rgba(255,214,150,${.15 + bruit(k + 880) * .25})`; ctx.fillRect(bruit(k + 881) * L, 106 + bruit(k + 882) * 32, 3 + bruit(k + 883) * 8, .5); }
  ctx.fillStyle = degrade(104, 140, "#b07a62", "#4e4a6a"); ctx.fillRect(0, 104, L, 36);
  ctx.globalCompositeOperation = "source-over";
}
function peindreSolCrepuscule() {
  ctx.fillStyle = degrade(BALADE.sol, H, "#4a3a2a", "#1e1610"); ctx.fillRect(0, BALADE.sol, L, H - BALADE.sol);
  for (let k = 0; k < 50; k++) { ctx.fillStyle = `rgba(180,150,110,${.08 + bruit(k + 890) * .1})`; ovale(bruit(k + 891) * L, BALADE.sol + 3 + bruit(k + 892) * 34, .6 + bruit(k + 893) * 1.4, .4, 0); }
  ctx.fillStyle = "#3e5a2a"; for (let x = 0; x < L; x += 3) ctx.fillRect(x, BALADE.sol - 1, 2, 1.6 + bruit(x + 894) * 1.4);
}
function peindreCielNuit() {
  ctx.fillStyle = degrade(0, 100, "#070a1c", "#151a38", "#2c2446"); ctx.fillRect(0, 0, L, H);
  for (let k = 0; k < 90; k++) { const y = bruit(k + 800) ** 1.4 * 90; ctx.fillStyle = `rgba(255,250,230,${.3 + bruit(k + 801) * .6})`; rond(bruit(k + 802) * L, y, .25 + bruit(k + 803) * .5); }
  ctx.fillStyle = "#f4ecd2"; ctx.beginPath(); ctx.arc(196, 26, 7, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = "#151a38"; ctx.beginPath(); ctx.arc(199, 24, 6.4, 0, Math.PI * 2); ctx.fill();
}
function peindreLoinNuit() {   // le désert à perte de vue, et les pyramides sous la lune
  ctx.fillStyle = "#3a3450"; ctx.beginPath(); ctx.moveTo(0, 106);
  for (let x = 0; x <= L; x += 6) ctx.lineTo(x, 100 + Math.sin(x * 2 * Math.PI / L * 3) * 1.6 + Math.sin(x * 2 * Math.PI / L * 7) * .8); ctx.lineTo(L, 108); ctx.lineTo(0, 108); ctx.fill();
  for (const [x, w, h, c] of [[40, 50, 34, "#2c2846"], [100, 38, 26, "#28243f"], [170, 60, 40, "#302b4c"], [214, 24, 16, "#28243f"]]) { poly([[x - w / 2, 102], [x, 102 - h], [x + w / 2, 102]], c); poly([[x, 102 - h], [x + w / 2, 102], [x + w * .1, 102]], "rgba(170,165,210,.2)"); }
}
function peindrePresNuit() {   // des dunes de sable, éclairées par la lune, avec leurs rides de vent
  const dune = (y0, amp, ph, c1, c2) => {
    ctx.fillStyle = degrade(y0 - amp, 141, c1, c2); ctx.beginPath(); ctx.moveTo(0, 141);
    for (let x = 0; x <= L; x += 4) ctx.lineTo(x, y0 - Math.max(0, Math.sin(x * 2 * Math.PI / L * 2 + ph)) * amp - Math.sin(x * 2 * Math.PI / L * 5 + ph) * amp * .15);
    ctx.lineTo(L, 141); ctx.fill();
  };
  dune(118, 14, 0, "#6a6080", "#3e3650");
  dune(130, 10, 2.1, "#7a6e8a", "#4a4058");
  ctx.strokeStyle = "rgba(200,190,220,.16)"; ctx.lineWidth = .4;
  for (let k = 0; k < 26; k++) { const x = bruit(k + 820) * L, y = 116 + bruit(k + 821) * 22; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 1.2, x + 9, y); ctx.stroke(); }   // les rides du sable
  for (let k = 0; k < 5; k++) { const x = 20 + k * 50 + bruit(k + 830) * 20; trait([[x, 140], [x - 2, 135], [x - 3, 133]], "#2a2436", .5); trait([[x, 140], [x + 2, 136], [x + 4, 134]], "#2a2436", .5); }   // des touffes sèches
}
function peindreSolNuit() {   // la piste de sable, des cailloux
  ctx.fillStyle = degrade(BALADE.sol, H, "#5a5068", "#221c28"); ctx.fillRect(0, BALADE.sol, L, H - BALADE.sol);
  ctx.strokeStyle = "rgba(210,200,230,.12)"; ctx.lineWidth = .4;
  for (let k = 0; k < 24; k++) { const x = bruit(k + 845) * L, y = BALADE.sol + 4 + bruit(k + 846) * 30; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 5, y - 1, x + 11, y); ctx.stroke(); }
  for (let k = 0; k < 30; k++) { ctx.fillStyle = `rgba(30,24,36,${.3 + bruit(k + 840) * .3})`; ovale(bruit(k + 841) * L, BALADE.sol + 3 + bruit(k + 842) * 34, .6 + bruit(k + 843) * 1.2, .4 + bruit(k + 844) * .5, 0); }
  ctx.fillStyle = "rgba(220,210,240,.2)"; ctx.fillRect(0, BALADE.sol, L, .8);
}
const DECORS_BALADE = {
  crepuscule: { ciel: peindreCielCrepuscule, loin: peindreLoinCrepuscule, pres: peindrePresCrepuscule, sol: peindreSolCrepuscule, nuit: [0, .15] },
  nuit: { ciel: peindreCielNuit, loin: peindreLoinNuit, pres: peindrePresNuit, sol: peindreSolNuit, nuit: [.6, .62] }
};
// au bout du chemin : le pylône du temple de Sobek, ou l'entrée de la grande pyramide ; deux braseros devant
function arriveeBalade(xp, t, theme) {
  if (theme === "crepuscule") {
    ctx.fillStyle = "#6a5040"; poly([[xp - 30, 140], [xp - 26, 80], [xp + 34, 80], [xp + 38, 140]], "#6a5040"); ctx.fillStyle = "#7a5e4a"; ctx.fillRect(xp - 28, 76, 64, 5);
    for (let y = 86; y < 136; y += 7) for (let x = xp - 24 + (y % 14 ? 4 : 0); x < xp + 32; x += 8) { ctx.fillStyle = "rgba(40,24,16,.18)"; ctx.fillRect(x, y, 5, 4); }
  } else {
    poly([[xp - 70, 140], [xp + 4, 34], [xp + 78, 140]], "#3a3450"); poly([[xp + 4, 34], [xp + 78, 140], [xp + 20, 140]], "rgba(140,140,190,.16)");
    for (let y = 44; y < 140; y += 6) { const w = (y - 34) / 106 * 74; ctx.fillStyle = "rgba(10,8,20,.25)"; ctx.fillRect(xp + 4 - w, y, w * 2, .5); }
  }
  ctx.fillStyle = "#050308"; ctx.fillRect(xp - 6, 112, 18, 28);
  for (const bx of [xp - 18, xp + 24]) { trait([[bx, 140], [bx, 128]], "#5a4a3a", 1.4); ctx.fillStyle = "#6a5440"; ctx.fillRect(bx - 3, 126, 6, 2.5);
    for (let k = 0; k < 3; k++) { ctx.fillStyle = ["#ffe08a", "#ff9a3a", "#d24a1a"][k]; const f = Math.sin(t / 3 + k + bx) * .8; ovale(bx + f * .5, 122 + k * 1.2, 2.4 - k * .5, 4 - k * .8, 0); } }
}
// une borne de pierre, au bord du chemin, gravée d'un nombre
function borne(x, sol, texte) {
  ctx.fillStyle = "rgba(0,0,0,.25)"; ovale(x, sol + .5, 18, 2, 0);
  ctx.fillStyle = degrade(sol - 24, sol, "#d8c8a4", "#9c8662"); ctx.beginPath(); ctx.moveTo(x - 17, sol); ctx.lineTo(x - 17, sol - 18); ctx.quadraticCurveTo(x, sol - 27, x + 17, sol - 18); ctx.lineTo(x + 17, sol); ctx.fill();
  ctx.strokeStyle = "#3e2c1e"; ctx.lineWidth = .6; ctx.stroke();
  ctx.fillStyle = "#3a2410"; ctx.font = "bold 6.5px Georgia, serif"; ctx.textAlign = "center"; ctx.fillText(texte, x, sol - 9); ctx.textAlign = "left";
}
// Plateau 10 : les quatre réponses gravées sur quatre stèles le long de la piste, dans le noir ; on va toucher la bonne (↓)
function stelesNuit(P, t) {
  const q = question || questionCorrigee; if (!q || !q.choix) return;
  P.steles.W.forEach((W, j) => {
    const x = W - P.dist; if (x < -20 || x > L + 20) return;
    const bonne = suiteEnAttente && j === q.bonne, mauvaise = suiteEnAttente && j === choixFait && j !== q.bonne;
    if (bonne || mauvaise) { const g = ctx.createRadialGradient(x, 122, 2, x, 122, 24); g.addColorStop(0, bonne ? "rgba(140,230,140,.55)" : "rgba(240,90,70,.5)"); g.addColorStop(1, "rgba(0,0,0,0)"); ctx.fillStyle = g; ctx.fillRect(x - 24, 98, 48, 48); }
    ctx.fillStyle = degrade(100, 140, "#8a7e98", "#4a4258"); ctx.beginPath(); ctx.moveTo(x - 13, 140); ctx.lineTo(x - 13, 108); ctx.quadraticCurveTo(x, 98, x + 13, 108); ctx.lineTo(x + 13, 140); ctx.fill();
    ctx.strokeStyle = "#1a1622"; ctx.lineWidth = .6; ctx.stroke();
    const mots = q.choix[j].replace(/^« C'est /, "").replace(/\\. »$/, "").replace(/\. »$/, "").split(" ");
    const lignes = []; mots.forEach(m => { const l = lignes[lignes.length - 1]; if (l && (l + " " + m).length <= 9) lignes[lignes.length - 1] = l + " " + m; else lignes.push(m); });
    ctx.fillStyle = "#f0d890"; ctx.font = "bold 5px Georgia, serif"; ctx.textAlign = "center";
    lignes.forEach((l, i) => ctx.fillText(l, x, 116 + i * 6 - (lignes.length - 1) * 2)); ctx.textAlign = "left";
  });
}
function decorBalade(P, t) {
  const B = niv.balade, D = DECORS_BALADE[B.theme], d = P.dist;
  const bande = (cle, fn, v) => { const img = fondPeint(cle, fn), o = -modL(d * v); ctx.drawImage(img, o, 0, L + .6, H); ctx.drawImage(img, o + L - .3, 0, L + .3, H); };
  const u = Math.min(1, d / BALADE.fin);
  if (B.theme === "crepuscule") {
    // le jour baisse pendant la balade : le ciel passe de l'après-midi au couchant, puis à la nuit ; le soleil descend et se couche
    ctx.drawImage(fondPeint("jourCiel", peindreCielJour), 0, 0, L, H);
    ctx.globalAlpha = u; ctx.drawImage(fondPeint("crepusculeCiel", D.ciel), 0, 0, L, H); ctx.globalAlpha = 1;   // pas plus sombre que le couchant de Sobek
    const sy = 34 + u * 66, sx = 60, rr = 8 + u * 3;
    const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 50); g.addColorStop(0, `rgba(255,${230 - u * 70},${170 - u * 90},.75)`); g.addColorStop(1, "rgba(255,160,80,0)"); ctx.fillStyle = g; ctx.fillRect(sx - 50, sy - 50, 100, 100);
    ctx.fillStyle = melange("fff4c8", "ff8a40", u); rond(sx, sy, rr);
  } else ctx.drawImage(fondPeint(B.theme + "Ciel", D.ciel), 0, 0, L, H);
  bande(B.theme + "Loin", D.loin, .12); bande(B.theme + "Pres", D.pres, .4); bande(B.theme + "Sol", D.sol, 1);
  if (B.theme === "crepuscule") { ctx.fillStyle = `rgba(22,18,44,${u * .25})`; ctx.fillRect(0, 98, L, H - 98); }   // la terre et l'eau s'assombrissent
  const xp = 200 + BALADE.fin - d; if (xp < L + 80) arriveeBalade(xp, t, B.theme);
  dessinerDepose(P, t);
  if (P.nombres) BALADE.paroles.forEach((w, k) => { const x = 150 + w - d; if (x > -30 && x < L + 30) borne(x, BALADE.sol, P.nombres[k].texte); });
  if (P.steles) stelesNuit(P, t);
  if (B.compagnon === "croco") { ctx.save(); ctx.translate(P.guide.x, BALADE.sol); ctx.scale(1.3, 1.3); crocoMarche(0, 0, t, P.guide.vx > 0); ctx.restore();
    if (B.porte) dessinerCrapaud({ x: P.guide.x - 6, y: BALADE.sol - 9.6 - HH + (P.guide.vx ? Math.abs(Math.sin(t / 3.5)) * .6 : 0), auSol: true, dir: 1, vx: 0, vy: 0 }, t); }
  else chacal(P.guide.x, BALADE.sol, t, P.guide.vx > 0, P.intro ? -1 : 1);   // pendant l'arrivée, il regarde le crapaud
}
// l'obscurité qui gagne : on ne voit bien qu'autour du crapaud et des braseros ; elle se resserre quand on se trompe
function devantBalade(P, t) {
  const B = niv.balade, [n0, n1] = DECORS_BALADE[B.theme].nuit, xp = 200 + BALADE.fin - P.dist;
  const peur = P.ombreT ? Math.max(0, 1 - (performance.now() - P.ombreT) / 2500) : 0, noir = n0 + (n1 - n0) * Math.min(1, P.dist / BALADE.fin);
  const r = 80 + P.lumiere * 16 - peur * 30 + Math.sin(t / 9) * 1.5, cx = heros.x + HW / 2, cy = heros.y + HH / 2;
  const c = devantBalade.c || (devantBalade.c = document.createElement("canvas")); c.width = L; c.height = H;
  const g = c.getContext("2d"); g.fillStyle = `rgba(4,4,12,${noir + peur * .25})`; g.fillRect(0, 0, L, H); g.globalCompositeOperation = "destination-out";
  const halo = (x, y, rr) => { const h = g.createRadialGradient(x, y, rr * .2, x, y, rr); h.addColorStop(0, "rgba(0,0,0,1)"); h.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = h; g.fillRect(x - rr, y - rr, rr * 2, rr * 2); };
  halo(cx, cy, r); if (xp < L + 40) { halo(xp - 18, 122, 40); halo(xp + 24, 122, 40); }
  if (B.theme === "nuit") halo(L / 2, 0, 90);
  ctx.drawImage(c, 0, 0, L, H);
}
// le crocodile porte le crapaud sur son dos : le crapaud ne bouge pas, le crocodile avance tout seul
// (il s'arrête le temps de chaque question) ; au bout, il marche jusqu'à la porte du temple
function porterBalade(P) {
  const G = P.guide, parle = gardien.etat === "questions" || suiteEnAttente, v = parle ? 0 : .9;
  heros.etat = "fige"; heros.vx = heros.vy = 0;
  if (P.dist < BALADE.fin) { P.dist = Math.min(BALADE.fin, P.dist + v); G.vx = v ? 1 : 0; }
  else if (gardien.etat === "fini") { const xp = 200 + BALADE.fin - P.dist; G.vx = G.x < xp - 4 ? 1 : 0; if (G.vx) G.x += .8; else if (!P.entre) { P.entre = 1; apres(30, plateauFranchi); } }
  // le crapaud, sur son dos (la boîte du héros suit, pour la lumière)
  heros.x = G.x - 6; heros.y = BALADE.sol - 9.6 - HH;
  if (gardien.etat === "attend" && P.dits < 3 && !suiteEnAttente && P.dist > BALADE.paroles[P.dits]) { $("retour").className = "vide"; gardien.etat = "questions"; poserQuestion(); }
}
const DEPOSE = { pose: 70, lache: 76, ibisParle: 40, chacalParle: 110, fin: 170, x: 40 };
function ibisPorteur(x, y, t, porte) {   // l'ibis de profil, ailes battantes, le crapaud dans les pattes
  const b = Math.sin(t / 2.2) * 5;
  if (porte) dessinerCrapaud({ x: x - 7, y: y + 1, auSol: false, dir: 1, vx: 0, vy: 1 }, t);
  poly([[x - 1, y - 3], [x - 10, y - 7 - b], [x - 5, y - 2]], "#f4efe4"); poly([[x + 1, y - 3], [x + 10, y - 7 - b], [x + 5, y - 2]], "#f4efe4");
  ibis(x, y, 1.4, t, 0, 1);
}
function introDepose(P) {
  const D = DEPOSE, f = ++P.intro, ligne = (qui, txt) => $("retour").insertAdjacentHTML("beforeend", `<div class="replique" style="animation:repliqueApres .4s both"><img src="${portrait(qui)}" alt=""><span>${txt}</span></div>`);
  heros.etat = "fige"; heros.vx = heros.vy = 0;
  if (f <= D.lache) { heros.x = D.x; heros.y = BALADE.sol - HH; }
  if (f === D.ibisParle) { const r = $("retour"); r.className = "ok"; r.innerHTML = ""; ligne("ibis", "« Voilà, petit crapaud, tu es arrivé. Oupouaout va te guider. Bonne route ! »"); }
  if (f === D.chacalParle) ligne("chacal", "« Je suis Oupouaout, l'ouvreur des chemins. Suis-moi, et réponds-moi en chemin. »");
  if (f >= D.fin) { P.intro = 0; heros.etat = "libre"; afficherQuestion(); }
}
function dessinerDepose(P, t) {
  const D = DEPOSE, f = P.intro; if (!f) return;
  if (f < D.lache) { const e = Math.min(1, f / D.pose), u = 1 - (1 - e) * (1 - e); ibisPorteur(-20 + (D.x + 7 + 20) * u, 14 + (BALADE.sol - 12 - 14) * u, t, true); }
  else { const e = (f - D.lache) / (D.fin - D.lache); ibisPorteur(D.x + 7 + e * 230, BALADE.sol - 12 - e * e * 150, t, false); }
}
// L'entrée des souterrains : en entrant dans la pyramide, l'illustration du portail gardé par Sobek et Anubis
// apparaît en fondu ; la vue avance lentement vers la porte lumineuse, dans la brume, puis tout devient noir.
const IMG_PORTAIL = Object.assign(new Image(), { src: "images/portail.jpg" }), PORTAIL = { x: 203, y: 0, w: 1024, h: 768, porte: [120, 96], fin: 230 };
function dessinerPortail(P, t) {
  const f = P.portail; if (!f) return;
  const a = Math.min(1, f / 40), z = 1 + Math.pow(Math.max(0, (f - 40) / 170), 1.5) * 1.8, [px, py] = PORTAIL.porte;
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = "#0a0814"; ctx.fillRect(0, 0, L, H);
  if (IMG_PORTAIL.complete && IMG_PORTAIL.naturalWidth) {
    ctx.save(); ctx.translate(px, py); ctx.scale(z, z); ctx.translate(-px, -py);
    ctx.drawImage(IMG_PORTAIL, PORTAIL.x, PORTAIL.y, PORTAIL.w, PORTAIL.h, 0, 0, L, H);
    ctx.restore();
  }
  for (let k = 0; k < 7; k++) { const x = modL(bruit(k + 1000) * L + t * (.2 + bruit(k + 1001) * .3), L + 80) - 40, y = 40 + bruit(k + 1002) * 110; ctx.fillStyle = `rgba(210,190,240,${.08 + .05 * Math.sin(t / 20 + k)})`; ovale(x, y, 40 + bruit(k + 1003) * 30, 8 + bruit(k + 1004) * 6, 0); }   // la brume qui dérive
  const g = ctx.createRadialGradient(px, py, 2, px, py, 30 * z); g.addColorStop(0, `rgba(255,236,190,${.25 + .1 * Math.sin(t / 6)})`); g.addColorStop(1, "rgba(255,220,160,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);   // la lumière de la porte
  if (f > 180) { ctx.globalAlpha = 1; ctx.fillStyle = `rgba(0,0,0,${Math.min(1, (f - 180) / 40)})`; ctx.fillRect(0, 0, L, H); }
  ctx.restore();
}
function bougerBalade(P) {
  const G = P.guide, xp = 200 + BALADE.fin - P.dist, cible = Math.min(heros.x + 28, xp - 30), dx = Math.max(-1.5, Math.min(1.5, cible - G.x));
  const avance = Math.abs(cible - G.x) > 1.5; if (avance) G.x += dx; G.vx = avance || P.glisse > .2 ? 1 : 0;   // à l'arrêt, il cesse de marcher
}
// la fiche commune des deux balades
function fBalade(qui, theme, extra) {
  const C = COMPAGNONS[qui];
  return Object.assign({
    sorte: "balade", balade: { compagnon: qui, theme, porte: !!extra.porte },
    depart: [24, 140 - HH], blocs: [[-20, 140, 280, 40]],
    attendre: true, sansEnchainer: true, bonnes: 3, points: [1, 3],
    init: () => ({ guide: { x: extra.porte ? 90 : extra.depose ? 84 : 50, vx: 0 }, dist: 0, dits: 0, glisse: 0, lumiere: 0, intro: extra.depose ? 1 : 0, nombres: qui === "croco" ? [0, 1, 2].map(nombreBorne) : null }),
    maj: extra.porte ? porterBalade : P => {
      if (P.portail) { if (++P.portail === PORTAIL.fin) plateauFranchi(); return; }
      if (P.intro) introDepose(P); else bougerBalade(P);
      // devant une stèle, ↓ : c'est la réponse choisie
      if (P.steles && question && !suiteEnAttente && touches.bas) {
        const cx = P.dist + heros.x + HW / 2, j = P.steles.W.findIndex(W => Math.abs(cx - W) < 10);
        if (j >= 0) { touches.bas = false; choisirReponse(j); }
      }
    },
    cacher: P => !!extra.porte || (P.intro > 0 && P.intro < DEPOSE.lache),
    question: k => qBalade(k, qui),
    effetBon: P => {
      P.dits++; P.lumiere++; gardien.justes = P.dits; gardien.etat = P.dits >= 3 ? "fini" : "attend"; son("allume");
      const r = $("retour"); r.className = "ok"; r.innerHTML = `<div class="replique"><img src="${portrait(qui)}" alt=""><span>${C.bien}</span></div>`;
      attendreSuite(() => { P.steles = null; });
    },
    effetFaux: P => { P.ombreT = performance.now(); },
    apresFaux: P => { P.steles = null; P.dits++; gardien.justes = P.dits; gardien.etat = P.dits >= 3 ? "fini" : "attend"; },
    apresMouvement: P => {
      if (extra.porte || P.intro) return;
      let limite = gardien.etat === "fini" ? BALADE.fin : BALADE.fin - 70;
      if (P.steles) limite = Math.min(limite, P.steles.W[3] - 112);   // on ne dépasse pas les stèles
      P.glisse = 0;
      if (heros.x > BALADE.ecran && P.dist < limite) { const g = Math.min(heros.x - BALADE.ecran, limite - P.dist); P.dist += g; heros.x -= g; P.glisse = g; }
      heros.x = Math.max(2, Math.min(heros.x, P.dist >= BALADE.fin ? 206 : BALADE.ecran + 30));
      if (gardien.etat === "attend" && P.dits < 3 && !suiteEnAttente && P.dist > BALADE.paroles[P.dits]) {
        $("retour").className = "vide"; gardien.etat = "questions";
        if (extra.steles) P.steles = { W: [0, 1, 2, 3].map(j => P.dist + 150 + j * 34) };
        poserQuestion();
      }
      if (gardien.etat === "fini" && P.dist >= BALADE.fin && heros.x > 198 && !P.entre) { P.entre = 1; heros.etat = "fige"; if (extra.portail) { P.portail = 1; afficherQuestion(); } else apres(20, plateauFranchi); }
    },
    dessinerDevant: (P, t) => { devantBalade(P, t); dessinerPortail(P, t); }
  }, extra);
}
// ============================================================
//  PLATEAU 12 — LA BARQUE DU SOLEIL (vue de dessus, dans les souterrains)
//  Chaque nuit, la barque de Rê traverse le fleuve souterrain et ressort à l'aube. Le crapaud y monte avec l'ibis,
//  à la proue. On programme la barque en blocs (avancer de … cases, tourner ↻ / ↺ de 90°, répéter) pour la mener,
//  section après section, jusqu'à la porte de l'aube. La 3e section est un escalier : 6 blocs seulement, il faut « répéter ».
//  Puis le lever du soleil sur le Nil : tous les compagnons du voyage sont là, l'ibis se pose près du crapaud.
// ============================================================
const FL = { x: 24, y: 18, c: 12, ni: 16, nj: 12 };
const caseFl = (i, j) => [FL.x + i * FL.c + FL.c / 2, FL.y + j * FL.c + FL.c / 2];
// une section du fleuve : un chemin d'eau (suite d'« avancer » et de virages) et quelques bras morts pour se tromper
function genererFleuve(k) {
  const h = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  for (let essai = 0; essai < 400; essai++) {
    let segs;
    if (k === 0) segs = [h(4, 7), "v", h(2, 4), "w", h(4, 7)];
    else if (k === 1) segs = [h(3, 4), "v", h(2, 3), "w", h(3, 4), "w", h(2, 3), "v", h(3, 4)];
    else { const a = h(2, 3), b = h(2, 3); segs = []; for (let r = 0; r < 3; r++) segs.push(a, "v", b, "w"); }
    // « v » et « w » : un virage dans un sens puis dans l'autre ; on tire au sort lequel est ↻
    const v = Math.random() < .5 ? "d" : "g", w = v === "d" ? "g" : "d";
    const prog = segs.map(x => x === "v" ? v : x === "w" ? w : x);
    const depart = [0, h(1, FL.nj - 2)]; let pos = [...depart], dir = 1; const eau = [[...pos]], cle = p => p[0] + "," + p[1], vus = new Set([cle(pos)]); let ok = true;
    for (const x of prog) {
      if (x === "d" || x === "g") { dir = (dir + (x === "d" ? 1 : 3)) % 4; continue; }
      for (let n = 0; n < x && ok; n++) { pos = [pos[0] + DIRS_CH[dir][0], pos[1] + DIRS_CH[dir][1]]; if (pos[0] < 0 || pos[0] >= FL.ni || pos[1] < 0 || pos[1] >= FL.nj || vus.has(cle(pos))) ok = false; else { vus.add(cle(pos)); eau.push([...pos]); } }
      if (!ok) break;
    }
    if (!ok || pos[0] < [8, 7, 6][k]) continue;                                        // la porte de l'aube est vers la droite
    // des bras morts : de petites impasses accrochées au chemin, sans toucher le reste
    const bras = [];
    for (let b = 0; b < 3; b++) {
      const [ax, ay] = eau[h(1, eau.length - 2)], d = DIRS_CH[h(0, 3)], L0 = h(1, 3), cases = [];
      for (let n = 1; n <= L0; n++) { const c = [ax + d[0] * n, ay + d[1] * n]; if (c[0] < 0 || c[0] >= FL.ni || c[1] < 0 || c[1] >= FL.nj || vus.has(cle(c))) break;
        const voisins = DIRS_CH.filter(([dx, dy]) => vus.has(cle([c[0] + dx, c[1] + dy]))).length; if (voisins > 1) break; cases.push(c); }
      cases.forEach(c => { vus.add(cle(c)); bras.push(c); });
    }
    return { k, depart, but: pos, eau: [...eau, ...bras], chemin: eau, vus, max: [12, 14, 6][k], prog };
  }
  // repli (très improbable) : un fleuve droit
  const eau = [...Array(12).keys()].map(i => [i, 6]);
  return { k, depart: [0, 6], but: [11, 6], eau, chemin: eau, vus: new Set(eau.map(c => c[0] + "," + c[1])), max: [12, 14, 6][k], prog: [11] };
}
// --- le dessin : la caverne, l'eau, le quai, la porte de l'aube, la barque
function peindreCaverne() {
  ctx.fillStyle = degrade(0, H, "#1c1626", "#100c16"); ctx.fillRect(0, 0, L, H);
  for (let k = 0; k < 160; k++) { ctx.fillStyle = `rgba(${bruit(k + 1100) < .5 ? "60,50,80" : "8,6,12"},${.2 + bruit(k + 1101) * .3})`; ovale(bruit(k + 1102) * L, bruit(k + 1103) * H, 1 + bruit(k + 1104) * 4, .6 + bruit(k + 1105) * 2.4, bruit(k + 1106) * 3); }
}
function barqueRe(x, y, ang, t) {   // la barque de Rê, vue de dessus : coque de papyrus aux bouts relevés, le disque du soleil, l'ibis à la proue
  ctx.save(); ctx.translate(x, y); ctx.rotate(ang);
  const g = ctx.createRadialGradient(0, 0, 2, 0, 0, 26); g.addColorStop(0, "rgba(255,190,90,.35)"); g.addColorStop(1, "rgba(255,160,60,0)"); ctx.fillStyle = g; ctx.fillRect(-26, -26, 52, 52);
  ctx.fillStyle = "#c89a4a"; ctx.beginPath(); ctx.moveTo(-9, 0); ctx.quadraticCurveTo(-7, -3.6, 0, -3.4); ctx.quadraticCurveTo(7, -3.6, 9, 0); ctx.quadraticCurveTo(7, 3.6, 0, 3.4); ctx.quadraticCurveTo(-7, 3.6, -9, 0); ctx.fill();
  ctx.strokeStyle = "#7a5a24"; ctx.lineWidth = .4; for (let k = -6; k <= 6; k += 2) { ctx.beginPath(); ctx.moveTo(k, -3); ctx.lineTo(k, 3); ctx.stroke(); }
  ctx.fillStyle = "#e0b860"; rond(-9.4, 0, 1.2); rond(9.4, 0, 1.2);
  ctx.fillStyle = "#e85a24"; rond(-1.4, 0, 2.4); ctx.strokeStyle = "#f6d070"; ctx.lineWidth = .6; ctx.beginPath(); ctx.arc(-1.4, 0, 2.4, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = "#f4efe4"; ovale(5.4, 0, 1.4, 1, 0); ctx.fillStyle = "#1e1a18"; rond(6.8, 0, .6); trait([[7.2, 0], [8.6, .7]], "#1e1a18", .3);   // l'ibis, à la proue
  ctx.restore();
}
function decorBarque(P, t) {
  if (P.aube) { decorAube(P, t); return; }
  ctx.drawImage(fondPeint("caverne", peindreCaverne), 0, 0, L, H);
  const F = P.fleuves[Math.min(P.salle, 2)], E = P.exec;
  // l'eau, case par case, et ses reflets
  for (const [i, j] of F.eau) { const x = FL.x + i * FL.c, y = FL.y + j * FL.c; ctx.fillStyle = "#1c3a4a"; ctx.fillRect(x - .3, y - .3, FL.c + .6, FL.c + .6); }
  for (const [i, j] of F.eau) { const x = FL.x + i * FL.c, y = FL.y + j * FL.c; for (let k = 0; k < 2; k++) { ctx.fillStyle = `rgba(160,210,230,${.12 + .1 * Math.sin(t / 10 + i + j * 2 + k)})`; ctx.fillRect(x + 2 + ((t * .15 + k * 5 + i * 3) % 7), y + 3 + k * 5, 3, .4); } }
  // les rives : un liseré clair au bord de l'eau
  ctx.strokeStyle = "rgba(170,150,190,.35)"; ctx.lineWidth = .6;
  for (const [i, j] of F.eau) DIRS_CH.forEach(([dx, dy]) => { if (F.vus.has((i + dx) + "," + (j + dy))) return; const [cx, cy] = [FL.x + i * FL.c + FL.c / 2, FL.y + j * FL.c + FL.c / 2], hc = FL.c / 2; ctx.beginPath(); if (dx) { ctx.moveTo(cx + dx * hc, cy - hc); ctx.lineTo(cx + dx * hc, cy + hc); } else { ctx.moveTo(cx - hc, cy + dy * hc); ctx.lineTo(cx + hc, cy + dy * hc); } ctx.stroke(); });
  // le quai de départ, et la porte de l'aube, qui luit
  const [qx, qy] = caseFl(...F.depart); ctx.fillStyle = "#6a5a48"; ctx.fillRect(qx - 18, qy - 6, 12, 12);
  const [px, py] = caseFl(...F.but), g = ctx.createRadialGradient(px, py, 1, px, py, 22); g.addColorStop(0, `rgba(255,220,140,${.7 + .2 * Math.sin(t / 8)})`); g.addColorStop(1, "rgba(255,190,90,0)"); ctx.fillStyle = g; ctx.fillRect(px - 22, py - 22, 44, 44);
  ctx.fillStyle = "#f6e0a0"; ctx.fillRect(px - 2, py - 5, 4, 10);
  // le trajet déjà parcouru, et la barque
  if (E && E.trace.length > 1) { ctx.strokeStyle = "rgba(255,210,130,.5)"; ctx.lineWidth = .8; ctx.setLineDash([2, 2]); ctx.beginPath(); E.trace.forEach((c, k) => { const [x, y] = caseFl(...c); k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]); }
  const pos = E ? E.px : caseFl(...F.depart), ang = E ? E.ang : 0;
  barqueRe(pos[0], pos[1] + Math.sin(t / 12) * .3, ang, t);
  if (E && E.phase === "rate") { ctx.fillStyle = `rgba(200,60,40,${.25 * Math.sin(E.t / 4) ** 2})`; ctx.fillRect(0, 0, L, H); }
}
function blocBa(I, k, actif) {
  const nombre = I.t === "av" ? `<span class="be-nombre"><button type="button" data-be-n="${k}" data-d="-1">−</button><b>${I.n}</b><button type="button" data-be-n="${k}" data-d="1">+</button></span>` : "";
  const texte = I.t === "av" ? `avancer de ${nombre} case${I.n > 1 ? "s" : ""}` : I.t === "d" ? "tourner ↻ de 90°" : "tourner ↺ de 90°";
  return `<div class="be-bloc be-${I.t}${actif ? " actif" : ""}" data-be-bloc="${k}" data-t="${I.t}">${texte}</div>`;
}
const cheminActifBa = P => P.exec && P.exec.plat && P.exec.plat[P.exec.i - 1] ? P.exec.plat[P.exec.i - 1].chemin : null;
function panneauBarque(P) {
  const F = P.fleuves[P.salle], enCours = !!P.exec, consigne = `<b>Section ${P.salle + 1} sur 3.</b> La barque part du quai, tournée vers la droite. Mène-la jusqu'à la porte de l'aube, qui luit au bout du fleuve.${F.max <= 6 ? ` <b>Attention : ${F.max} blocs seulement</b> — pense à « répéter ».` : ""}`;
  if (!P.montre) return `<div class="programme"><div class="prog-intro">${consigne}</div><div class="prog-actions"><button type="button" data-ba="montrer">✎ Donner les instructions</button></div></div>`;
  majFlottant(`<div class="programme bloc-editeur${enCours ? " en-cours" : ""}">
    <div class="prog-intro">Section ${P.salle + 1} : ${compterBlocs(P.prog)} bloc${compterBlocs(P.prog) > 1 ? "s" : ""} sur ${F.max}.</div>
    <div class="be-zones">
      <div class="be-palette">
        <div class="be-titre">Blocs</div>
        ${blocBa({ t: "av", n: P.n }, "pal")}${blocBa({ t: "d" }, "pal")}${blocBa({ t: "g" }, "pal")}${blocRepeter({ t: "rep", n: P.nRep || 2, corps: [] }, "palrep", blocBa)}
        <div class="be-poubelle" data-be="poubelle">🗑 glisse ici pour supprimer</div>
      </div>
      <div class="be-programme" data-be="prog" data-chemin="">
        <div class="be-chapeau">quand la barque quitte le quai</div>
        ${blocsHTML(P.prog, "", blocBa, enCours ? cheminActifBa(P) : null)}
        ${P.prog.length ? "" : `<div class="be-vide">glisse les blocs ici</div>`}
      </div>
    </div>
    <div class="prog-actions"><button type="button" data-ba="effacer"${enCours ? " disabled" : ""}>Tout effacer</button><button type="button" data-ba="lancer"${enCours || !P.prog.length ? " disabled" : ""}>▶ Larguer les amarres</button></div>
  </div>`, "Programme de la barque");
  return `<div class="programme"><div class="prog-intro">${consigne}</div><div class="prog-intro">Compose le programme dans la fenêtre « Programme de la barque ».</div>
    <div class="prog-actions"><button type="button" data-fl="ouvrir">▣ Afficher la fenêtre du programme</button></div></div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-ba]");
  if (!b || b.disabled || !niv || niv.sorte !== "barque" || P.exec || gardien.etat === "fini") return;
  const c = b.dataset.ba, F = P.fleuves[P.salle];
  if (c === "montrer") P.montre = true;
  else if (c === "effacer") P.prog = [];
  else if (c === "lancer") { P.exec = { plat: aplatir(P.prog), i: 0, phase: "pause", t: 0, pos: [...F.depart], dir: 1, ang: 0, trace: [[...F.depart]], px: caseFl(...F.depart) }; $("retour").className = "vide"; son("allume"); }
  afficherQuestion();
});
function bougerBarque(P) {
  if (P.aube) { bougerAube(P); return; }
  if (P.attente) { if (--P.attente === 0) { P.salle++; Object.assign(P, { montre: false, prog: [] }); afficherQuestion(); } return; }
  const E = P.exec; if (!E) return;
  const F = P.fleuves[P.salle];
  if (E.phase === "pause") { if (++E.t < 8) return; E.t = 0;
    if (E.i >= E.plat.length) {
      const ok = E.pos[0] === F.but[0] && E.pos[1] === F.but[1];
      E.phase = ok ? "fin" : "rate"; E.t = 0;
      if (ok) { compterReponse(true); son("bravo"); gardien.justes++; majCompteur(); messageTemple("La barque passe la porte : la section est franchie !", true); }
      else { compterReponse(false); son("croc"); messageTemple("La barque s'arrête avant la porte de l'aube. Corrige le programme pour aller jusqu'au bout.", false); }
      afficherQuestion(); return; }
    const I = E.plat[E.i++].I; afficherQuestion();
    if (I.t === "av") { E.phase = "marche"; E.reste = I.n; E.t = 0; }
    else { E.phase = "tourne"; E.t = 0; E.angDe = E.ang; E.dir = (E.dir + (I.t === "d" ? 1 : 3)) % 4; E.angA = E.angDe + (I.t === "d" ? 1 : -1) * Math.PI / 2; }
    return; }
  if (E.phase === "tourne") { E.t++; E.ang = E.angDe + (E.angA - E.angDe) * Math.min(1, E.t / 10); if (E.t >= 10) { E.phase = "pause"; E.t = 0; } return; }
  if (E.phase === "marche") {
    const [dx, dy] = DIRS_CH[E.dir], suiv = [E.pos[0] + dx, E.pos[1] + dy];
    if (E.t === 0 && !F.vus.has(suiv[0] + "," + suiv[1])) { E.phase = "rate"; E.t = 0; compterReponse(false); son("croc"); messageTemple("Bong ! La barque heurte la rive. Corrige le programme.", false); afficherQuestion(); return; }
    E.t++; const [x0, y0] = caseFl(...E.pos), [x1, y1] = caseFl(...suiv), u = Math.min(1, E.t / 8);
    E.px = [x0 + (x1 - x0) * u, y0 + (y1 - y0) * u];
    if (E.t >= 8) { E.pos = suiv; E.t = 0; E.trace.push([...suiv]); if (--E.reste <= 0) E.phase = "pause"; }
    return; }
  if (E.phase === "fin") { if (++E.t >= 60) { P.exec = null; if (gardien.justes >= 3) { gardien.etat = "fini"; P.aube = 1; } else P.attente = 30; afficherQuestion(); } return; }
  if (E.phase === "rate") { if (++E.t >= 60) { P.exec = null; afficherQuestion(); } }
}
// --- le lever du soleil : une scène symétrique et solennelle. Deux obélisques encadrent le Nil ; le soleil se lève au centre,
// poussé par Khépri, et lance ses rayons. Au milieu, sur la pierre benben (la butte d'où le soleil est né), le crapaud se
// change en or. Les compagnons arrivent de part et d'autre et s'inclinent ; une file d'ibis passe ; l'ibis se pose près
// du crapaud, ailes ouvertes. Pour finir, en lettres d'or : « Crapaud d'or ».
const AUBE = { fondu: 50, arrivees: 80, ibis: 300, ibisParle: 380, titre: 440, fin: 640 };
const COMPAGNONS_AUBE = [   // [ordre d'arrivée, place sur la rive, côté d'où il vient, dessin]
  [0, 38, -1, (x, t) => gerboiseCote(x, 150, t, 1)],
  [1, 54, -1, (x, t) => { ctx.save(); ctx.translate(x, 151); ctx.scale(.42, .42); babouinThot(0, 0, t, { pb: [{ g: 0, d: 0 }], etape: 0, pesee: null }); ctx.restore(); }],
  [2, 80, -1, (x, t) => { ctx.save(); ctx.filter = "hue-rotate(70deg) saturate(.8)"; dessinerCrapaud({ x: x - 6, y: 150 - HH, auSol: true, dir: 1, vx: 0, vy: 0 }, t); ctx.restore(); }],
  [3, 160, 1, (x, t) => { ctx.save(); ctx.translate(x, 150); ctx.scale(-1, 1); oieCote(0, 0, 1.3, t); ctx.restore(); }],
  [4, 186, 1, (x, t) => { ctx.save(); ctx.translate(x, 150); ctx.scale(-.8, .8); crocoMarche(0, 0, t, false); ctx.restore(); }],
  [5, 208, 1, (x, t) => chacal(x, 150, t, false, -1)]
];
function obelisque(x, base, h, lumiere) {
  const w = h * .09;
  ctx.fillStyle = "#4a3428"; ctx.beginPath(); ctx.moveTo(x - w, base); ctx.lineTo(x - w * .72, base - h); ctx.lineTo(x + w * .72, base - h); ctx.lineTo(x + w, base); ctx.fill();
  ctx.fillStyle = `rgba(255,200,120,${.18 * lumiere})`; ctx.beginPath(); ctx.moveTo(x, base); ctx.lineTo(x, base - h); ctx.lineTo(x + w * .72, base - h); ctx.lineTo(x + w, base); ctx.fill();
  ctx.fillStyle = melange("8a6a3a", "ffe08a", lumiere); poly([[x - w * .72, base - h], [x, base - h - w * 1.6], [x + w * .72, base - h]], ctx.fillStyle);   // le pyramidion d'or, qui attrape la lumière
}
function decorAube(P, t) {
  const f = P.aube, u = Math.min(1, f / 300), z = 1 + Math.min(1, f / AUBE.fin) * .1;
  ctx.save(); ctx.translate(120, 132); ctx.scale(z, z); ctx.translate(-120, -132);
  // le ciel s'éclaire ; le soleil monte au centre et lance ses rayons, qui tournent lentement
  ctx.fillStyle = degrade(0, 112, melange("1a1a44", "6aa8d8", u), melange("6a4a78", "f2cc90", u), melange("d8803a", "fff2cc", u)); ctx.fillRect(-20, -20, L + 40, 134);
  const sy = 116 - u * 64, sx = 120;
  ctx.save(); ctx.translate(sx, sy); ctx.rotate(t / 400);
  for (let k = 0; k < 14; k++) { ctx.rotate(Math.PI * 2 / 14); ctx.fillStyle = `rgba(255,236,170,${.09 * u})`; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-7, -170); ctx.lineTo(7, -170); ctx.fill(); }
  ctx.restore();
  const g = ctx.createRadialGradient(sx, sy, 2, sx, sy, 80); g.addColorStop(0, "rgba(255,244,200,.95)"); g.addColorStop(1, "rgba(255,200,120,0)"); ctx.fillStyle = g; ctx.fillRect(sx - 80, sy - 80, 160, 160);
  ctx.fillStyle = "#ffe8a8"; rond(sx, sy, 11);
  scarabee(sx, sy + 14, -Math.PI / 2, t, false);   // Khépri, le scarabée du matin, qui pousse le soleil
  // une file d'ibis traverse le ciel, en V
  const c = ((f - 60) / 260); if (c > 0 && c < 1) for (let k = 0; k < 7; k++) { const r = Math.abs(k - 3); ibisVol(L + 30 - c * (L + 90) + r * 9, 30 + r * 5 + Math.sin(t / 30 + k) * .6, .7, t + k * 5); }
  // l'autre rive, le Nil et son chemin de lumière
  for (let k = 0; k < 16; k++) palmier(6 + k * 15 + bruit(k + 1200) * 5, 110, 7 + bruit(k + 1201) * 5, 1200 + k, (bruit(k + 1202) - .5) * .6, .3);
  ctx.fillStyle = degrade(110, 146, melange("a87858", "f0c888", u), melange("3a3a5a", "6a7a98", u)); ctx.fillRect(-20, 110, L + 40, 36);
  for (let k = 0; k < 34; k++) { const v = bruit(k + 1210), w = 3 + (1 - v) * 16; ctx.fillStyle = `rgba(255,236,180,${(.3 + .3 * Math.sin(t / 9 + k)) * u})`; ctx.fillRect(sx - w / 2 + (bruit(k + 1211) - .5) * (8 + v * 40), 112 + v * 33, w, .7); }
  // les deux obélisques qui encadrent la scène
  obelisque(24, 150, 112, u); obelisque(216, 150, 112, u);
  ctx.fillStyle = degrade(146, H, "#7a5a3a", "#3a2818"); ctx.fillRect(-20, 146, L + 40, H - 146);
  ctx.fillStyle = "#6a8a34"; for (let x = -20; x < L + 20; x += 3) ctx.fillRect(x, 145, 2, 2 + bruit(x + 1240) * 2);
  // les compagnons arrivent de part et d'autre, puis s'inclinent
  for (const [n, place, cote, dessin] of COMPAGNONS_AUBE) {
    const e = Math.min(1, Math.max(0, (f - AUBE.arrivees - n * 26) / 40)); if (e <= 0) continue;
    const v = e * e * (3 - 2 * e), x = place + cote * (1 - v) * 150, salut = f > AUBE.ibisParle ? Math.max(0, Math.sin((f - AUBE.ibisParle) / 18)) * 1.5 : 0;
    ctx.save(); ctx.translate(0, salut); dessin(x, t); ctx.restore();
  }
  // la pierre benben, au centre, et le crapaud qui se change en or
  ctx.fillStyle = "#8a7458"; poly([[106, 150], [110, 138], [130, 138], [134, 150]], "#8a7458"); ctx.fillStyle = "#b09a78"; poly([[110, 138], [130, 138], [127, 135], [113, 135]], "#b09a78");
  ctx.fillStyle = melange("8a7a5a", "f0c850", u); poly([[113, 135], [127, 135], [120, 131]], ctx.fillStyle);
  const or = Math.min(1, Math.max(0, (f - 150) / 150));
  const lueur = ctx.createRadialGradient(120, 126, 2, 120, 126, 26); lueur.addColorStop(0, `rgba(255,226,120,${.35 + .45 * or})`); lueur.addColorStop(1, "rgba(255,226,120,0)"); ctx.fillStyle = lueur; ctx.fillRect(94, 100, 52, 52);
  ctx.save(); ctx.filter = `sepia(${or}) saturate(${1 + 2.2 * or}) brightness(${1 + .25 * or})`; dessinerCrapaud({ x: 114, y: 131 - HH, auSol: true, dir: 1, vx: 0, vy: 0 }, t); ctx.restore();
  for (let k = 0; k < 10; k++) { const a = t / 25 + k * Math.PI / 5, r = 12 + Math.sin(t / 11 + k) * 2; ctx.fillStyle = `rgba(255,240,180,${or * (.5 + .5 * Math.sin(t / 6 + k))})`; rond(120 + Math.cos(a) * r, 126 + Math.sin(a) * r * .6, .6); }
  // l'ibis descend du ciel et se pose sur la pierre, ailes ouvertes
  if (f > AUBE.ibis - 80) { const e = Math.min(1, (f - AUBE.ibis + 80) / 80), v = 1 - (1 - e) * (1 - e), ix = 240 - v * 104, iy = 20 + v * 111;
    const b = e < 1 ? Math.sin(t / 2.2) * 5 : 2; poly([[ix - 1, iy - 6], [ix - 12, iy - 13 - b], [ix - 5, iy - 5]], "#f4efe4"); poly([[ix + 1, iy - 6], [ix + 12, iy - 13 - b], [ix + 5, iy - 5]], "#f4efe4");
    ibis(ix, iy - 4, 1.4, t, 0, -1); }
  ctx.restore();
  // en lettres d'or : « Crapaud d'or »
  if (f > AUBE.titre) { const a = Math.min(1, (f - AUBE.titre) / 50);
    ctx.save(); ctx.globalAlpha = a; ctx.textAlign = "center"; ctx.font = "bold 18px Cinzel, Georgia, serif"; ctx.shadowColor = "rgba(255,200,80,.9)"; ctx.shadowBlur = 8;
    ctx.fillStyle = "#fff0b0"; ctx.fillText("Crapaud d'or", 120, 26);
    const nom = typeof prenom === "function" ? prenom() : ""; if (nom) { ctx.font = "italic 9px Georgia, serif"; ctx.shadowBlur = 4; ctx.fillText(nom, 120, 38); }
    ctx.restore(); }
  if (f < AUBE.fondu) { ctx.fillStyle = `rgba(16,12,22,${1 - f / AUBE.fondu})`; ctx.fillRect(0, 0, L, H); }
}
function bougerAube(P) {
  const f = ++P.aube, ligne = (qui, txt) => $("retour").insertAdjacentHTML("beforeend", `<div class="replique" style="animation:repliqueApres .4s both"><img src="${portrait(qui)}" alt=""><span>${txt}</span></div>`);
  if (f === 2) { const r = $("retour"); r.className = "ok"; r.innerHTML = ""; afficherQuestion(); }
  if (f === AUBE.ibisParle) ligne("ibis", "« Tu as traversé la nuit, petit crapaud. Le soleil se lève, et tous tes compagnons sont là : te voilà crapaud d'or ! »");
  if (f === AUBE.fin) plateauFranchi();
}
// Acheter le passage d'un plateau difficile : on paie des points, et le plateau s'ouvre (il faut en garder au moins 1)
function boutonAchat(prix, quoi) {
  const peut = parcours.points > prix;
  return `<div class="prog-actions achat"><button type="button" data-achat="${prix}"${peut ? "" : " disabled"} title="${peut ? `Passer ${quoi} contre ${prix} points` : `Il faut plus de ${prix} points`}">🪙 Acheter le passage (${prix} points)</button></div>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-achat]");
  if (!b || b.disabled || !niv || partie.fin || gardien.etat === "fini" || (P && P.exec)) return;
  const prix = +b.dataset.achat; if (parcours.points <= prix) return;
  parcours.points -= prix; eleve.points = parcours.points; sauverEleve(); majPoints(-prix); son("allume");
  question = null; annulerSuite();
  gardien.justes = niv.bonnes; gardien.etat = "fini";
  if (niv.passer) niv.passer(P);
  if (niv.finir) niv.finir(P);
  messageTemple(`Tu as acheté le passage : −${prix} points.`, true);
  afficherQuestion();
});
const NIVEAUX = [
  {
    titre: "Plateau 1", nom: "Les rives du Nil", court: "Le Nil", sorte: "nil",
    depart: [8, 120], blocs: [NIL.gauche, NIL.droite, NIL.marche, NIL.parvis],
    eau: { x0: 52, x1: 188, y: EAU_NIL },
    attendre: true,
    sortie: { cx: 229, sol: 106, r: 7 },
    sortieOuverte: P => P.relais >= RELAIS.fin,
    bonnes: 1, compteur: "Traversée :",
    init: () => ({
      crocs: [{ id: "croc0", x: 58, y: EAU_NIL - 1.4, vx: .01, min: 58, max: 58, t: 0 }, { id: "croc1", x: 146, y: EAU_NIL - 1.4, vx: -.01, min: 146, max: 146, t: 0 }],
      reprise: [8, 120], happe: 0, rouleau: 0, nombre: null, vue: "cote", bascule: null, td: null, prog: [], compagnon: false, gerb: { x: 2, dir: 1, trace: [], bond: 0 }
    }),
    obstacles: (P, o) => {
      const C = P.crocs[0], dir = Math.sign(C.vx) || 1; o.push({ x: dir > 0 ? C.x + 1 : C.x + 10, y: C.y - 3, w: CROCO_L - 11, h: 3, id: C.id });
    },
    maj: P => {
      if (P.bascule) {
        // le fondu : on passe de la vue de côté à la vue de dessus (et inversement)
        const B = P.bascule; B.t++;
        if (B.t === 20) {
          if (B.vers === "dessus") { P.vue = "dessus"; for (const k in touches) touches[k] = false; P.td = nouvelleTraversee(); }
          else { P.vue = "cote"; for (const k in touches) touches[k] = false; Object.assign(heros, { x: 194, y: 126 - HH, vx: 0, vy: 0, etat: "libre", auSol: true }); P.reprise = [194, 126 - HH]; P.compagnon = true; P.relais = 1; gardien.justes = 1; gardien.etat = "fini"; majCompteur(); Object.assign(P.gerb, { x: 190, dir: 1, trace: [], bond: 0 }); }
          $("aideTouches").textContent = P.vue === "dessus" ? "Clavier : ← → tourner de 30°, ↑ ↓ avancer ou reculer d'un pas (sur la rive), espace : sauter." : "Clavier : ← → pour marcher, espace ou ↑ pour sauter (flèche + espace : saut en avançant).";
          afficherQuestion();
        }
        if (B.t >= 40) P.bascule = null;
        return;
      }
      if (P.vue === "dessus") { bougerDessus(P); heros.etat = "porte"; return; }
      bougerNil(P);
      if (P.relais) { if (P.relais < RELAIS.fin) P.relais++; if (P.relais === RELAIS.rencontre) son("allume"); if (P.relais === RELAIS.fin - 1) afficherQuestion(); }
      else suivreCote(P);
    },
    touche: (e, P) => P.vue === "dessus" ? toucheDessus(e, P) : false,
    cacher: P => P.vue !== "cote",
    apresMouvement: P => {
      if (!heros.auSol || heros.etat !== "libre") return;
      if (heros.sur === "croc0" && P.vue === "cote" && !P.bascule && heros.x < 150) { P.bascule = { t: 0, vers: "dessus" }; heros.etat = "porte"; son("allume"); return; }
      if (heros.sur === "lotus") P.reprise = [LOTUS_PF.x + 1, LOTUS_PF.y - HH];
      else if (heros.sur == null && heros.x > 186) P.reprise = [192, 126 - HH];
    },
    apresPlouf: P => { const [x, y] = P.reprise; Object.assign(heros, { x, y, vx: 0, vy: 0 }); },
    dessinerDevant: devantNil,
    attente: P => {
      if (P.vue === "dessus" && P.td && P.td.phase !== "crapaud") return P.td.phase === "arrivee" ? "La gerboise t'a rejoint : vous montez ensemble vers le temple…" : panneauProgramme(P);
      if (P.vue === "dessus" && P.td) { const deg = Math.round(((P.td.ang / DEG) % 360 + 540) % 360 - 180); return `Angle du saut : <b>${Math.abs(deg)}°</b> ${deg < 0 ? "vers le haut" : deg > 0 ? "vers le bas" : "(tout droit)"}. <b>← →</b> : tourner de 30° ; sur la rive, <b>↑</b> : avancer d'un pas, <b>↓</b> : reculer d'un pas, pour choisir ton point de départ ; <b>espace</b> : sauter. Atterris sur la <b>zone verte</b> du dos des crocodiles (visée verte) : ailleurs, ils mordent (visée orange) ; rouge, c'est l'eau.`; }
      if (P.vue === "dessus") return "Tu vois le Nil d'en haut. Les flèches <b>← →</b> font tourner le crapaud (la visée montre où il va atterrir : jaune, c'est bon ; rouge, c'est l'eau) ; <b>espace</b> : il saute. Trouve un chemin de crocodile en crocodile jusqu'à la rive du temple, à droite. Certains crocodiles mènent à une impasse !";
      if (gardien.etat === "fini") return P.relais < RELAIS.fin ? "Vous avez traversé le Nil, la gerboise et toi ! Mais une gerboise n'entre pas dans un temple… Le babouin de Thot descend du parvis : elle lui passe le relais." : "La gerboise est repartie vers ses dunes. Le babouin de Thot t'attend à la porte du temple : monte les marches et entre dans la lumière.";
      return "Le temple est sur l'autre rive. Saute sur le dos du crocodile, au bord de l'eau : tu verras le Nil d'en haut…";
    },
    lexique: [["Le Nil", "les Égyptiens appelaient leur pays Kémet, « la terre noire », à cause du limon laissé par la crue du Nil.", "nil"], ["Le crocodile", "les Égyptiens vénéraient Sobek, le dieu à tête de crocodile, maître des eaux du Nil.", "crocodile"], ["Le temple", "on y entre par le pylône, une immense porte entre deux tours couvertes de hiéroglyphes.", "temple"], ["Le babouin de Thot", "avec l'ibis, l'animal sacré de Thot, le dieu de l'écriture et du calcul.", "babouin"]],
    aide: "← → pour marcher, espace ou ↑ pour sauter : saute sur le dos du crocodile, au bord de l'eau. La vue passe alors au-dessus du Nil : ← → font tourner le crapaud de 30°, sur la rive, ↑ le fait avancer d'un pas et ↓ reculer d'un pas pour choisir son point de départ, espace le fait sauter sur le crocodile visé. Les crocodiles ne bougent pas : atterris sur la zone verte de leur dos (la visée est verte si c'est bon, orange s'il va mordre, rouge si c'est l'eau). Si tu tombes à l'eau, tu repars de la rive. Une fois de l'autre côté, écris le programme de la gerboise : si elle tombe ou se fait mordre, tout recommence avec de nouveaux crocodiles. Quand elle arrive, la porte du temple s'ouvre.",
    transition: "La porte du temple s'ouvre sur la salle de la pesée… Un babouin argenté t'y attend, assis sur une immense balance."
  },
  {
    titre: "Plateau 2", nom: "Le temple de la pesée", court: "Le temple", sorte: "temple",
    fixe: true, attendre: true, depart: [8, 140], blocs: [],
    bonnes: 3, compteur: "Pesées :",
    touches: "À hauteur de crapaud : règle les deux temps dans le panneau, puis donne les instructions au babouin.",
    init: () => ({ etape: 0, pb: problemesTemple(), tg: 0, td: 0, pesee: null, porte: 0, sortie: 0, montre: false }),
    maj: bougerTemple,
    dessinerDevant: devantTemple,
    passer: P => { Object.assign(P, { etape: 3, pesee: null, porte: 1, sortie: 1 }); },
    attente: P => {
      if (gardien.etat === "fini") return "Les trois pesées sont justes : la porte du sanctuaire est ouverte. Le crapaud et le babouin entrent dans la lumière…";
      const E = P.pesee;
      if (E && E.fin) return "La balance est à l'équilibre ! Le babouin exulte, la porte se lève…";
      if (E && E.vide) return "La balance penche… Le babouin vide les plateaux.";
      return panneauBalance(P);
    },
    lexique: [["Le babouin de Thot", "avec l'ibis, l'animal sacré de Thot ; on le représente assis sur la balance.", "babouin"], ["Le deben", "l'unité de poids des Égyptiens, environ 91 grammes.", "deben"], ["La pesée du cœur", "Anubis pèse le cœur du défunt contre la plume de Maât ; Thot note le résultat.", "pesée"], ["La clepsydre", "une horloge à eau ; la plus ancienne qu'on ait retrouvée vient d'un temple égyptien, à Karnak.", "clepsydre"]],
    aide: "Clique sur « Donner les instructions », puis règle les deux temps : combien de secondes le babouin laisse couler la jarre de gauche, et celle de droite (ses clepsydres ne mesurent que 10 secondes). La porte ne se lève que si la balance est à l'équilibre. Trois pesées justes ouvrent le sanctuaire.",
    transition: "Derrière la porte du sanctuaire, dans sa bibliothèque, Thot t'attend sur son trône…"
  },
  {
    titre: "Plateau 3", nom: "La salle de Thot", court: "Thot", sorte: "thot",
    fixe: true, depart: [8, 140], blocs: [],
    bonnes: 4, compteur: "Papyrus :", delai: 50,
    touches: "À hauteur de crapaud : Thot t'interroge. Écris ta réponse dans le panneau.",
    init: () => ({ cour: null, res: false, nod: 0, secoue: 0, parle: 0, sortie: 0 }),
    demarrer: () => apres(40, poserQuestion),
    question: (k, P) => { P.parle = 40; return qThot(k, P); },
    effetBon: P => { P.nod = 40; P.res = true; son("bravo"); },
    effetFaux: P => { P.secoue = 30; },
    finir: P => { P.sortie = 1; },
    passer: P => { P.sortie = 1; },
    maj: P => {
      if (P.nod) P.nod--; if (P.secoue) P.secoue--; if (P.parle) P.parle--;
      if (P.sortie && ++P.sortie === 110) plateauFranchi();
    },
    dessinerDevant: devantThot,
    attente: P => P.sortie ? "Thot range son papyrus et hoche sa tête d'ibis : « Tu sais additionner les fractions, petit crapaud. » Le babouin applaudit…" : "Thot lève les yeux de son papyrus…",
    lexique: [["Thot", "le dieu à tête d'ibis, inventeur de l'écriture et maître du calcul.", "thot"], ["Le calame", "un roseau taillé qui sert de plume, trempé dans l'encre noire ou rouge.", "calame"], ["Le papyrus", "on y écrivait aussi les mathématiques : le papyrus Rhind, copié par le scribe Ahmès il y a plus de 3 500 ans, est rempli de fractions.", "papyrus"], ["Le scribe", "celui qui sait lire, écrire et compter : un métier rare et respecté.", "scribe"]],
    aide: "Thot déroule son papyrus et t'interroge : écris ta réponse dans le panneau, sous forme de fraction irréductible. Quatre réponses justes, et le dieu des scribes te laisse passer.",
    transition: "Thot referme son papyrus. Le babouin reste auprès de son maître ; au sanctuaire du soleil, un scarabée de Khépri t'attend…"
  },
  {
    titre: "Plateau 4", nom: "Le sanctuaire du soleil", court: "Le soleil", sorte: "soleil",
    fixe: true, attendre: true, depart: [8, 140], blocs: [],
    bonnes: 3, compteur: "Salles :",
    touches: "Vu de dessus : prépare les instructions dans le panneau, puis donne-les au scarabée.",
    init: () => { const salles = [0, 1, 2].map(genererSalle); return Object.assign({ salles, vue: "face", bascule: null, salle: 0, montre: false, exec: null, attente: 0, sortie: 0, scara: { x: 196, y: 158, ang: Math.PI, vole: false } }, nouvelleSalle(salles[0])); },
    maj: bougerSoleil,
    dessinerDevant: devantSoleil,
    passer: P => { Object.assign(P, { exec: null, sortie: 1, vue: "dessus" }); },
    attente: P => {
      if (gardien.etat === "fini") return "Les trois statues sont éclairées : le sanctuaire du soleil s'ouvre devant toi…";
      const E = P.exec;
      if (E && E.phase === "fin") return "Le rayon de Rê frappe la statue !";
      if (E && E.phase === "rate") return "Le rayon s'arrête contre la pierre…";
      if (P.attente) return "Salle suivante…";
      return panneauSoleil(P) + boutonAchat(8, "les salles de Rê");
    },
    lexique: [["Rê", "le dieu du soleil, le plus grand des dieux égyptiens ; chaque jour, il traversait le ciel dans sa barque.", "rê"], ["Khépri", "le soleil du matin, à tête de scarabée : comme le bousier roule sa boule, il pousse le soleil dans le ciel.", "scarabée"], ["Les miroirs", "les miroirs égyptiens étaient des disques de bronze ou de cuivre, polis jusqu'à briller.", "miroirs"], ["Abou Simbel", "deux fois par an, le soleil levant traverse ce temple de Ramsès II et vient éclairer les statues du fond.", "statue"]],
    aide: "Si c'est trop difficile, tu peux acheter le passage des salles contre 8 points. Le rayon part toujours de A, vers le haut (0°). Clique sur « Donner les instructions » : la figure montre le trajet qu'il doit suivre jusqu'au pharaon, avec l'angle en B. Donne au scarabée l'orientation du miroir, comme dans Scratch : 0° vers le haut, 90° vers la droite (la rose des directions est dans le coin de la salle).",
    transition: "La lumière de Rê remplit le sanctuaire… Le crapaud ressort du temple, au bord du Nil."
  },
  {
    titre: "Plateau 5", nom: "La sortie du temple", court: "La sortie", sorte: "sortie",
    depart: [4, 106 - HH], blocs: [NIL_M.quai, NIL_M.marche, NIL_M.parvis, NIL_M.rive, [FELOUQUE_M.x0, FELOUQUE_M.deck, FELOUQUE_M.x1 - FELOUQUE_M.x0, 3]],
    eau: { x0: 52, x1: 188, y: EAU_NIL },
    attendre: true, bonnes: 1, compteur: "Vitesse :",
    init: () => ({ parti: 0, v: 5 + Math.floor(Math.random() * 8), sec: 0, T: 0, fin: 0 }),
    question: (k, P) => qMaths(`Sur le ponton, un crapaud t'attend. Il te demande : <b>« Elle va à quelle vitesse, ta felouque ? »</b><div class="gros">${P.v * P.T} coudées en ${P.T} secondes</div>Réponds en <b>coudées par minute</b>.`,
      P.v * 60, `En ${P.T} secondes, la felouque a parcouru ${P.v * P.T} coudées : en 1 seconde, ${P.v * P.T} ÷ ${P.T} = ${P.v} coudées ; en 1 minute (60 secondes), ${P.v} × 60 = ${P.v * 60} coudées.`, { placeholder: "en coudées par minute" }),
    finir: P => { P.fin = 1; },
    // une mauvaise réponse : la première fois, le crapaud du ponton réagit avec son bon sens (sans donner la solution) ;
    // la deuxième fois, il explique le calcul
    effetFaux: P => {
      P.essais = (P.essais || 0) + 1;
      if (P.essais >= 2) { P.essais = 0; return; }
      const rep = parseFloat(($("champReponse").value || "").replace(",", ".").replace(/\s/g, "")), juste = P.v * 60;
      const dit = rep === P.v ? "« Ça, c'est en une seconde… mais moi, je t'ai demandé en une minute ! »"
        : rep < juste ? "« Hum… ça me paraît bien lent : je t'ai vu arriver, ta felouque filait plus vite que ça ! »" : "« Hum… ça me paraît bien rapide : je t'ai vu arriver, ta felouque n'est pas un faucon ! »";
      $("retour").textContent = "❌ Le crapaud du ponton fronce les yeux : " + dit + " Essaie encore.";
    },
    apresMouvement: P => {
      if (P.parti || !heros.auSol || heros.etat !== "libre") return;
      const cx = heros.x + HW / 2;
      if (cx > FELOUQUE_M.x0 && cx < FELOUQUE_M.x1 && Math.abs(heros.y + HH - FELOUQUE_M.deck) < 2) { P.parti = 1; heros.etat = "porte"; son("allume"); afficherQuestion(); }
    },
    maj: P => {
      if (!P.parti) return;
      P.parti++; const { bx, s } = voyageEtat(P);
      heros.x = bx - HW / 2 - 2; heros.y = FELOUQUE_M.deck - HH + Math.sin(partie.image / 20) * .4;
      if (P.fin) { if (++P.fin === 50) plateauFranchi(); return; }
      if (s >= VOYAGE.ponton - VOYAGE.arret - 22) {                      // on accoste : le temps s'arrête, le crapaud du ponton pose sa question
        P.accoste = (P.accoste || 0) + 1;
        if (P.accoste === 1) { son("bois"); P.T = P.sec; afficherQuestion(); }
        if (P.accoste === 30) { gardien.etat = "questions"; poserQuestion(); }
      } else { const sec = Math.floor(P.parti / 30); if (sec !== P.sec) { P.sec = sec; afficherQuestion(); } }
    },
    apresPlouf: P => { Object.assign(heros, { x: 4, y: 106 - HH, vx: 0, vy: 0 }); },
    dessinerDevant: devantSortie,
    attente: P => {
      if (P.fin) return `« Waouh ! ${P.v * 60} coudées par minute… le vent souffle fort ! » dit le crapaud du ponton. « Viens, je vais te montrer les champs. »`;
      if (P.parti) { const d = P.v * (P.accoste ? P.T : P.sec); return `<div class="voyage-mesures"><span>⏱ Temps : <b>${P.accoste ? P.T : P.sec} s</b></span><span>⛵ Distance parcourue : <b>${d} coudées</b></span></div>${P.accoste ? "La felouque accoste au bord des champs." : "La felouque glisse sur le Nil… le temple s'éloigne, et sur la rive, les champs apparaissent."}`; }
      return "Le crapaud ressort du temple, au bord du Nil. Descends les marches jusqu'au quai : une felouque t'attend.";
    },
    lexique: [["Le quai du temple", "les grands temples, comme celui de Karnak, avaient un quai au bord de l'eau : on y arrivait en bateau, et un escalier montait jusqu'à la porte.", "quai"], ["La felouque", "le bateau du Nil, à grande voile triangulaire : il descend le fleuve avec le courant et le remonte grâce au vent du nord.", "felouque"]],
    aide: "← → pour marcher, espace ou ↑ pour sauter. Descends les marches du temple jusqu'au quai, et saute dans la felouque amarrée. Pendant la traversée, le panneau affiche le temps et la distance parcourue : à l'arrivée, on te demandera la vitesse de la felouque, en coudées par minute.",
    transition: "Le crapaud du ponton t'emmène à travers les champs…"
  },
  {
    titre: "Plateau 6", nom: "Au milieu des champs", court: "Les champs", sorte: "promenade",
    depart: [24, 140 - HH], blocs: PROM_BLOCS,
    cacher: P => P.scene && P.scene.s > SCENE_IBIS.envol,
    dessinerDevant: apartéIbis,
    // une conversation en marchant : trois répliques à choisir ; juste +1 point, faux −3 points, et on continue
    attendre: true, sansEnchainer: true, bonnes: 3, points: [1, 3],
    init: () => ({ guide: { x: 4, y: 140 - HH, vx: 0 }, dist: 0, dits: 0, glisse: 0 }),
    maj: bougerPromenade,
    question: () => qOubli(),
    effetBon: P => {
      P.dernierFaux = false; P.dits++; gardien.justes = P.dits; gardien.etat = P.dits >= 3 ? "fini" : "attend"; son("allume");
      // le guide est épaté : sa réplique dans le panneau, une couronne dans sa bulle
      P.bravoT = performance.now(); const r = $("retour"); r.className = "ok"; r.innerHTML = `<div class="replique"><img src="${portrait("guide")}" alt=""><span>« Waouh, t'es un maître ! »</span></div>`;
      attendreSuite(() => {});   // juste ou faux, on clique sur « Continuer »
    },
    effetFaux: P => { P.peurT = performance.now(); },
    apresFaux: P => { P.dernierFaux = true; P.dits++; gardien.justes = P.dits; gardien.etat = P.dits >= 3 ? "fini" : "attend"; },
    apresMouvement: P => {
      // le crapaud reste vers le milieu de l'écran : c'est le décor qui défile
      if (P.scene) return;
      const limite = PROM.fin;
      P.glisse = 0;
      if (heros.x > PROM.ecran && P.dist < limite) { const g = Math.min(heros.x - PROM.ecran, limite - P.dist); P.dist += g; heros.x -= g; P.glisse = g; }
      heros.x = Math.min(heros.x, PROM.ecran + 30);
      // la dernière conversation finie, encore quelques pas : l'ibis arrive
      if (gardien.etat === "fini" && !suiteEnAttente && P.dist > PROM.fin - 40 && heros.auSol) {
        heros.etat = "fige"; heros.vx = 0;
        P.scene = { t0: performance.now(), s: 0, x0: Math.max(30, Math.min(L - 24, ibisFond(P)[0])), y0: 104 };   // l'ibis, bien visible dans son champ
        const T = SCENE_IBIS, ligne = (qui, txt, sec) => `<div class="replique" style="animation:repliqueApres .4s ${sec}s both"><img src="${portrait(qui)}" alt=""><span>${txt}</span></div>`;
        const r = $("retour"); r.className = "ok";
        r.innerHTML = ligne("guide", "« Bonjour, moi c'est Dory ! »", T.dory) + ligne("ibis", "« Je sais… tu me l'as dit ce matin. »", T.ibis1)
          + ligne("ibis", "Puis, à toi : « Allez, je t'emmène voir l'oie : on a du travail pour toi. T'es pas un boulet, toi ? »", T.ibis2);
        afficherQuestion();
      }
      heros.x = Math.max(2, heros.x);
      // le guide engage la conversation à trois endroits du chemin
      if (gardien.etat === "attend" && P.dits < 3 && !suiteEnAttente && P.dist > PROM.paroles[P.dits]) { $("retour").className = "vide"; gardien.etat = "questions"; poserQuestion(); }
    },
    attente: P => gardien.etat === "fini" ? (P.scene ? "L'ibis s'est posé devant vous." : "Dory marche toujours avec toi. Avance encore un peu…") : "Le crapaud du ponton t'accompagne à travers les champs. Il a envie de bavarder… Avance !",
    lexique: [["Kémet", "« la terre noire » : le nom de l'Égypte, à cause du limon fertile laissé par la crue.", "champs"], ["L'oie du Nil", "l'oie d'Égypte, au masque brun autour de l'œil, était l'oiseau de Geb, le dieu de la Terre.", "oie"]],
    aide: "← → pour marcher, espace ou ↑ pour sauter. En chemin, ton guide te parle : choisis ce que tu lui réponds (juste : +1 point ; faux : −3 points). Au bout du chemin, quelqu'un viendra te chercher…",
    transition: "L'oie du Nil te montre la parcelle : les bornes ont disparu sous le limon…"
  },
  {
    titre: "Plateau 7", nom: "Les champs après la crue", court: "La crue", sorte: "crue",
    fixe: true, attendre: true, depart: [8, 140], blocs: [],
    bonnes: 3, compteur: "Champs :",
    touches: "Prépare le programme de l'oie dans le panneau, puis donne-le-lui.",
    init: () => ({ champs: (() => { const noms = [...NOMS_CHAMPS].sort(() => Math.random() - .5); return [0, 1, 2].map(k => Object.assign(genererChamp(k), { nom: noms[k] })); })(), vue: "face", bascule: null, salle: 0, montre: false, prog: [], n: 4, exec: null, pousse: null, attente: 0, sortie: 0 }),
    maj: bougerCrue,
    dessinerDevant: devantCrue,
    passer: P => { Object.assign(P, { exec: null, sortie: 1, vue: "dessus" }); },
    attente: P => {
      if (gardien.etat === "fini") return "Les trois champs sont retracés : la vallée verdit, la récolte sera belle…";
      const E = P.exec;
      if (E && E.phase === "fin") return "Le champ est retracé : le blé pousse !";
      if (E && E.phase === "rate") return "L'oie revient à la borne…";
      if (P.attente) return "Champ suivant…";
      return panneauCrue(P);
    },
    lexique: [["La crue", "chaque été, le Nil débordait et recouvrait la vallée ; en se retirant, il laissait le limon noir qui rendait la terre fertile.", "crue"], ["Les arpenteurs", "les « tendeurs de corde » retraçaient les champs après la crue ; le mot géométrie veut dire « mesure de la terre ».", "arpenteurs"], ["La coudée", "l'unité de longueur des Égyptiens : du coude au bout des doigts, environ 52 cm.", "coudée"], ["L'oie du Nil", "l'oie d'Égypte, au masque brun autour de l'œil, était l'oiseau de Geb, le dieu de la Terre.", "oie"]],
    aide: "L'oie part de la borne, tournée vers le haut. Compose son programme avec les blocs « avancer de … coudées » et « tourner à droite / à gauche de 90° » : la corde qu'elle tire doit faire le tour exact du champ et revenir à la borne. Elle ne doit ni entrer dans le canal, ni piétiner le blé des voisins.",
    transition: "Les champs sont retracés. Au bord du Nil, un crocodile sort des roseaux : « Suis-moi. »"
  },
  fBalade("croco", "crepuscule", {
    titre: "Plateau 8", nom: "Le long du fleuve", court: "Le fleuve", porte: true,
    touches: "Le crocodile te porte sur son dos : réponds à ses questions dans le panneau.",
    attente: P => gardien.etat === "fini" ? "Le crocodile t'amène jusqu'à la porte du temple de son maître…" : "Le soleil se couche sur le Nil. Un crocodile te porte sur son dos, le long du fleuve…",
    lexique: [["Les crocodiles sacrés", "dans les temples de Sobek, on nourrissait des crocodiles parés de bracelets d'or ; à leur mort, on les momifiait.", "crocodile"], ["Le Nil", "le seul grand fleuve d'Égypte : toute la vie du pays se tenait sur ses rives.", "fleuve"]],
    aide: "Le crocodile te porte sur son dos jusqu'au temple de Sobek. Il s'arrête devant des bornes gravées d'un nombre et te demande un chiffre (dixièmes, centièmes, unités…) ou un nombre de dizaines ou de centaines : choisis ta réponse (juste : +1 point ; faux : −3 points).",
    transition: "Le crocodile plonge dans le bassin sacré… Son maître t'attend."
  }),
  {
    titre: "Plateau 9", nom: "Le bassin de Sobek", court: "Sobek", sorte: "sobek",
    fixe: true, depart: [8, 140], blocs: [],
    bonnes: 3, compteur: "Stèles :", delai: 50,
    touches: "Au bord du Nil, Sobek t'interroge : écris la fraction coloriée, irréductible, dans le panneau.",
    init: () => ({ grille: null, fond: 0, nod: 0, devore: 0, parle: 0, sortie: 0 }),
    demarrer: () => apres(40, poserQuestion),
    question: (k, P) => { P.parle = 40; return qSobek(k, P); },
    effetBon: P => { P.nod = 30; son("bravo"); },
    finir: P => { P.sortie = 1; },
    passer: P => { P.sortie = 1; },
    maj: P => {
      if (P.nod) P.nod--; if (P.parle) P.parle--; avancerSalamandre(P);
      if (P.sortie) {
        P.sortie++;
        const R = RELAIS_SOBEK, ligne = (qui, txt) => $("retour").insertAdjacentHTML("beforeend", `<div class="replique" style="animation:repliqueApres .4s both"><img src="${portrait(qui)}" alt=""><span>${txt}</span></div>`);
        if (P.sortie === R.sobek) { const r = $("retour"); r.className = "ok"; r.innerHTML = ""; ligne("sobek", "« Tu sais lire les fractions, petit crapaud. La nuit tombe : ma route s'arrête ici. »"); }
        if (P.sortie === R.ibisParle) ligne("ibis", "« Ah, te voilà ! Accroche-toi, je t'emmène jusqu'aux pyramides. Un chacal t'y attend. »");
        if (P.sortie === R.fin) plateauFranchi();
      }
    },
    dessinerDevant: devantSobek,
    attente: P => P.sortie ? "La nuit tombe sur le Nil… L'ibis revient te chercher." : "Au bord du Nil, au coucher du soleil, Sobek t'attend devant sa stèle.",
    lexique: [["Sobek", "le dieu à tête de crocodile, maître des eaux du Nil. Dans ses temples, on élevait des crocodiles sacrés, parés de bijoux.", "sobek"], ["La stèle", "une grande pierre dressée, gravée de textes ou d'images.", "stèle"]],
    aide: "Sobek montre un rectangle partagé en parts égales sur sa stèle : écris la fraction coloriée, sous forme irréductible, dans le panneau. Trois bonnes réponses, et il te laisse passer. Une erreur te coûte des points.",
    transition: "L'ibis te dépose sur la route des pyramides. Un chacal noir t'y attend…"
  },
  fBalade("chacal", "nuit", {
    titre: "Plateau 10", nom: "La route des pyramides", court: "La nuit", depose: true, portail: true, steles: true,
    attente: P => P.portail ? "Au fond de la pyramide, entre Sobek et Anubis, le portail des souterrains s'ouvre…" : gardien.etat === "fini" ? "Le chacal s'arrête devant l'entrée de la grande pyramide, entre les braseros. Entre." : P.intro ? "L'ibis te dépose sur la route des pyramides…" : "La nuit est tombée sur le désert. Le chacal noir marche devant toi, vers les pyramides…",
    lexique: [["Oupouaout", "« celui qui ouvre les chemins » : un dieu chacal qui guide les morts dans la nuit.", "chacal"], ["La Douat", "le monde de la nuit et des morts, que le soleil traverse chaque nuit avant de renaître le matin.", "nuit"]],
    aide: "← → pour marcher. Le chacal te pose des questions sur les mots du calcul ; les réponses sont gravées sur quatre stèles le long de la piste, dans le noir : va devant la bonne et appuie sur ↓ (juste : +1 point ; faux : −3 points). Au bout du chemin, entre dans la pyramide.",
    transition: "Tu franchis le portail. Dans les souterrains, le sol se dérobe… un trou !"
  }),
  {
    titre: "Plateau 11", nom: "Le puits", court: "Le puits", sorte: "bloc",
    fixe: true, depart: [8, 140], blocs: [],
    bonnes: NB_PIERRES, compteur: "Pierres :", delai: 40,
    touches: "Calcule vite et juste : chaque bonne réponse fait s'effondrer une pierre du tunnel.",
    init: () => ({ otees: 0, chute: null, bloc: 0, tas: 0, ecrase: 0, sortie: 0, glisse: 1 }),
    demarrer: () => apres(60, poserQuestion),
    question: k => qAstucieux(k),
    effetBon: P => { P.chute = { k: P.otees, t: 0 }; P.otees++; son("sable"); },
    finir: P => { P.sortie = 1; son("victoire"); },
    passer: P => { Object.assign(P, { otees: NB_PIERRES, sortie: 1 }); },
    maj: bougerBloc,
    attente: P => P.sortie ? "La dernière pierre est tombée : le passage est libre ! Le crapaud file vers la lumière." : P.glisse ? "Oups ! Le crapaud glisse au fond d'un puits…" : question ? "" : "Une pierre roule hors du passage…",
    lexique: [["La gargouille", "sur les toits des temples, l'eau de pluie s'écoulait par des gargouilles en forme de tête de lion.", "lion"], ["La herse de granit", "dans la pyramide de Khéops, de lourdes dalles de granit descendaient dans des rainures pour fermer l'accès à la chambre du roi.", "dalle"], ["Le sable", "les Égyptiens se servaient de sable pour monter, descendre et caler les lourds blocs de pierre.", "sable"]],
    aide: "Tu es enfermé au fond d'un puits. Tant que le sable coule de la gueule du lion, la dalle de granit descend. Chaque calcul juste fait s'effondrer une des cinq pierres qui bouchent le tunnel, à droite : la 5, puis la 4… quand la 1 tombe, le passage est libre. Si la dalle arrive en bas, une pierre retombe. Calcule astucieusement pour aller vite.",
    transition: "Au fond du tunnel, un fleuve coule sous la terre… La barque du soleil t'attend, l'ibis à la proue."
  },
  {
    titre: "Plateau 12", nom: "La barque du soleil", court: "La barque", sorte: "barque",
    fixe: true, attendre: true, depart: [8, 140], blocs: [],
    bonnes: 3, compteur: "Sections :",
    touches: "Vu de dessus : prépare le programme de la barque, puis largue les amarres.",
    init: () => ({ fleuves: [0, 1, 2].map(genererFleuve), salle: 0, montre: false, prog: [], n: 2, exec: null, attente: 0, aube: 0 }),
    maj: bougerBarque,
    passer: P => { Object.assign(P, { exec: null, aube: 1 }); },
    attente: P => {
      if (P.aube) return "Le soleil se lève sur le Nil…";
      const E = P.exec;
      if (E && E.phase === "fin") return "La barque passe la porte de l'aube !";
      if (E && E.phase === "rate") return "La barque revient au quai…";
      if (P.attente) return "Section suivante…";
      return panneauBarque(P);
    },
    lexique: [["La barque de Rê", "les Égyptiens racontaient que, chaque nuit, le soleil voyageait sur une barque à travers le monde souterrain, pour renaître à l'aube.", "barque"], ["L'aube", "pour les Égyptiens, chaque lever du soleil était une renaissance : la victoire de la lumière sur la nuit.", "aube"]],
    aide: "Vu de dessus, la barque part du quai, tournée vers la droite. Compose son programme avec « avancer de … cases », « tourner ↻ / ↺ de 90° » et « répéter » : elle doit suivre le fleuve sans heurter la rive et s'arrêter sur la porte de l'aube. Trois sections ; la dernière ne permet que 6 blocs.",
    transition: ""
  },
];
NIVEAUX.forEach(n => { n.dessiner = (P, t) => ({ nil: decorNil, temple: decorTemple, thot: decorThot, soleil: decorSoleil, crue: decorCrue, bloc: decorBloc, sortie: decorSortie, promenade: decorPromenade, sobek: decorSobek, balade: decorBalade, barque: decorBarque })[n.sorte](P, t); });
