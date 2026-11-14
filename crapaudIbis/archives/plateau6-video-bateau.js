// Archive : « À bord, vers la cible » — une vidéo vue depuis la proue d'un bateau, la distance à la cible et un timecode,
// pour mesurer une vitesse. Retiré du crapaud et l'ibis (2026-11-14) : à reprendre dans un exercice indépendant.
// Dépend des outils du jeu (ctx, L, H, degrade, poly, palmier, soleilVoile, brumeHorizontale, fondPeint, messageTemple…).

// ============================================================
//  PLATEAU 6 — À BORD, VERS LA CIBLE (à hauteur de crapaud)
//  On regarde, depuis la proue d'un bateau, une « vidéo » du trajet : la cible (temple, obélisque, village) grandit,
//  les palmiers des rives défilent. À l'écran : la distance à la cible, qui diminue, et un timecode. On met en pause à
//  deux moments, on note les valeurs, et on calcule la vitesse du bateau (coudées par seconde). Trois trajets.
//  Les deux affichages changent ensemble, seconde par seconde : la réponse tombe toujours juste.
// ============================================================
const VUE = { x: 120, y: 92, f: 400, oeil: 5, rive: 70 };          // horizon, focale ; l'œil à 5 coudées au-dessus de l'eau
const CIBLES = [{ nom: "le temple", a: "au temple", sorte: "temple" }, { nom: "l'obélisque", a: "à l'obélisque", sorte: "obelisque" }, { nom: "le village", a: "au village", sorte: "village" }];
function genererTrajet(k) {
  const h = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
  const v = h(4, 12), T = h(55, 80);
  return { k, v, T, D0: v * T + h(1, 4) * 10, ...CIBLES[k] };
}
const ecran = (X, Y, z) => [VUE.x + X * VUE.f / z, VUE.y + Y * VUE.f / z];
// le ciel, le désert lointain, l'horizon : fixes
function peindreHorizon() {
  ctx.fillStyle = degrade(0, VUE.y, "#7ab8d6", "#c8e0dc", "#f4dcaa"); ctx.fillRect(0, 0, L, VUE.y + 1);
  soleilVoile(186, 22, 70);
  ctx.fillStyle = "#e6cfa2"; ctx.beginPath(); ctx.moveTo(0, VUE.y); ctx.lineTo(30, VUE.y - 7); ctx.lineTo(70, VUE.y - 4); ctx.lineTo(96, VUE.y); ctx.fill();
  ctx.beginPath(); ctx.moveTo(150, VUE.y); ctx.lineTo(190, VUE.y - 8); ctx.lineTo(240, VUE.y - 6); ctx.lineTo(240, VUE.y); ctx.fill();
  brumeHorizontale(VUE.y - 3, 8, .55);
}
// la cible, au bout du fleuve, à la distance d (en coudées) : elle grandit quand on approche
function cibleVue(sorte, d) {
  const z = Math.max(30, d), [x, y] = ecran(0, VUE.oeil - 1, z), e = VUE.f / z;
  ctx.save(); ctx.translate(x, y); ctx.scale(e, e);
  if (sorte === "temple") {
    ctx.fillStyle = "#d8b47a"; poly([[-22, 0], [-18, -30], [-4, -30], [-4, 0]], "#d8b47a"); poly([[4, 0], [4, -30], [18, -30], [22, 0]], "#d8b47a");
    ctx.fillStyle = "#c49a64"; ctx.fillRect(-4, -20, 8, 20); ctx.fillStyle = "#3a2414"; ctx.fillRect(-2.6, -14, 5.2, 14);
    ctx.fillStyle = "#1f4e8c"; ctx.fillRect(-19, -31, 15, 1.4); ctx.fillRect(4, -31, 15, 1.4); ctx.fillStyle = "#c83a24"; rond(0, -24, 1.6);
    ctx.fillStyle = "rgba(90,60,30,.35)"; for (let k = 0; k < 4; k++) { ctx.fillRect(-16 + k * 3, -26, 1, 20); ctx.fillRect(7 + k * 3, -26, 1, 20); }
  } else if (sorte === "obelisque") {
    ctx.fillStyle = "#e0c8a0"; poly([[-3, 0], [-2.2, -42], [0, -46], [2.2, -42], [3, 0]], "#e0c8a0"); ctx.fillStyle = "#e8c050"; poly([[-2.2, -42], [0, -46], [2.2, -42]], "#e8c050");
    ctx.fillStyle = "rgba(90,60,30,.4)"; for (let k = 0; k < 8; k++) ctx.fillRect(-.6, -38 + k * 4.4, 1.2, 2);
    ctx.fillStyle = "#c49a64"; ctx.fillRect(-5, -1.6, 10, 1.6);
  } else {
    for (const [cx, w, hh, c] of [[-14, 9, 8, "#c8a070"], [-4, 10, 11, "#b89060"], [8, 9, 7, "#d0aa78"], [16, 7, 9, "#c49a64"]]) { ctx.fillStyle = c; ctx.fillRect(cx - w / 2, -hh, w, hh); ctx.fillStyle = "rgba(40,20,10,.5)"; ctx.fillRect(cx - 1, -hh * .55, 2, hh * .55); }
    ctx.fillStyle = "#e0c8a0"; poly([[22, 0], [23, -16], [27, -16], [28, 0]], "#e0c8a0"); ctx.fillStyle = "#3a2414"; for (let k = 0; k < 3; k++) rond(25, -13 + k * 4, .5);   // le pigeonnier
    for (const [px, hh] of [[-24, 18], [32, 15]]) { trait([[px, 0], [px + 1, -hh]], "#6a5034", 1.2); for (let a = 0; a < 7; a++) { const an = -Math.PI / 2 + (a - 3) * .45; trait([[px + 1, -hh], [px + 1 + Math.cos(an) * 6, -hh + Math.sin(an) * 6 + 2]], "#4e7a2a", 1); } }
  }
  ctx.restore();
}
// un palmier de la rive, à la profondeur z
function palmierVue(X, z, graine) {
  const [x, y] = ecran(X, VUE.oeil, z), e = VUE.f / z, h = (18 + bruit(graine) * 10) * e;
  if (x < -30 || x > L + 30) return;
  palmier(x, y, h, graine, (bruit(graine + 1) - .5) * .5, Math.max(0, Math.min(.6, (z - 300) / 1200)));
}
function decorVideo(P, t) {
  ctx.drawImage(fondPeint("horizon", peindreHorizon), 0, 0, L, H);
  const T = P.trajets[Math.min(P.tour, 2)], d = distanceAffichee(P);
  // les rives, qui fuient vers l'horizon, et le fleuve entre elles
  const zLoin = 4000, zPres = 8;
  for (const c of [-1, 1]) {
    poly([ecran(c * VUE.rive, VUE.oeil, zLoin), ecran(c * 2000, VUE.oeil, zLoin), ecran(c * 2000, VUE.oeil, zPres), ecran(c * VUE.rive, VUE.oeil, zPres)], c < 0 ? "#6a8a3a" : "#74923e");
  }
  const ge = ctx.createLinearGradient(0, VUE.y, 0, H); ge.addColorStop(0, "#a8d0cc"); ge.addColorStop(.4, "#5a9a96"); ge.addColorStop(1, "#2f6a6a");
  ctx.fillStyle = ge; poly([ecran(-VUE.rive, VUE.oeil, zLoin), ecran(VUE.rive, VUE.oeil, zLoin), ecran(VUE.rive, VUE.oeil, zPres), ecran(-VUE.rive, VUE.oeil, zPres)], ge);
  // les reflets sur l'eau : ils viennent vers nous
  const av = P.parcouru;
  for (let k = 0; k < 60; k++) { const z = 20 + ((bruit(k + 300) * 1500 - av) % 1500 + 1500) % 1500, X = (bruit(k + 301) - .5) * 2 * VUE.rive * .9, [x, y] = ecran(X, VUE.oeil, z), e = VUE.f / z; ctx.fillStyle = `rgba(255,250,230,${Math.min(.5, .1 + e * .3)})`; ctx.fillRect(x - e * 3, y, e * 6, Math.max(.3, e * .4)); }
  // la cible, au bout du fleuve
  cibleVue(T.sorte, d);
  // les palmiers des deux rives, des plus lointains aux plus proches : ils défilent
  const palmes = [];
  for (let k = 0; k < 44; k++) { const c = k % 2 ? 1 : -1, z = 20 + ((bruit(k + 400) * 1600 - av) % 1600 + 1600) % 1600; palmes.push([c * (VUE.rive + 6 + bruit(k + 401) * 40), z, 500 + k * 3]); }
  palmes.sort((a, b) => b[1] - a[1]).forEach(([X, z, g]) => palmierVue(X, z, g));
  // la proue de notre bateau, au premier plan, avec son ombelle de papyrus
  const roulis = Math.sin(t / 18) * 1.2;
  ctx.save(); ctx.translate(120, H + 6 + roulis);
  ctx.fillStyle = "#6a4a2a"; ctx.beginPath(); ctx.moveTo(-60, 0); ctx.quadraticCurveTo(-18, -26, 0, -60); ctx.quadraticCurveTo(18, -26, 60, 0); ctx.fill();
  ctx.fillStyle = "#8a6a3a"; ctx.beginPath(); ctx.moveTo(-44, 0); ctx.quadraticCurveTo(-12, -22, 0, -50); ctx.quadraticCurveTo(12, -22, 44, 0); ctx.fill();
  ctx.strokeStyle = "rgba(40,20,10,.4)"; ctx.lineWidth = .6; for (let k = 1; k < 5; k++) { ctx.beginPath(); ctx.moveTo(-60 + k * 6, 0); ctx.quadraticCurveTo(-14 + k * 1.6, -20, 0, -58 + k * 2); ctx.stroke(); }
  ctx.fillStyle = "#3a8a6a"; poly([[0, -60], [-7, -72], [7, -72]], "#3a8a6a"); ctx.fillStyle = "#d4a535"; ctx.fillRect(-1.4, -62, 2.8, 4); ctx.fillStyle = "#1f4e8c"; ctx.fillRect(-7, -73, 14, 1.4);
  ctx.restore();
  // l'écume de part et d'autre de la proue, quand on avance
  if (P.lecture) for (let k = 0; k < 8; k++) { const u = ((t * .05 + k / 8) % 1); ctx.fillStyle = `rgba(255,255,255,${.5 * (1 - u)})`; rond(120 - 30 - u * 40, H - 18 + u * 10, 1); rond(120 + 30 + u * 40, H - 18 + u * 10, 1); }
  hudVideo(P, T, d, t);
}
// l'incrustation, comme sur une vidéo : la distance à la cible, en haut à gauche ; le timecode, en haut à droite
const tc = s => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
function hudVideo(P, T, d, t) {
  ctx.font = "bold 7px Georgia, serif"; ctx.textBaseline = "middle";
  const plaque = (x, y, w, txt, coul) => { ctx.fillStyle = "rgba(20,12,6,.72)"; arrondi(x, y, w, 12, 3); ctx.fill(); ctx.strokeStyle = "#d4a535"; ctx.lineWidth = .5; ctx.stroke(); ctx.fillStyle = coul; ctx.textAlign = "center"; ctx.fillText(txt, x + w / 2, y + 6.4); ctx.textAlign = "left"; };
  plaque(6, 6, 104, `◎ ${T.nom} : ${d.toLocaleString("fr-FR")} coudées`, "#f6dc90");
  const sec = P.seconde; plaque(L - 64, 6, 58, `${P.lecture ? (Math.floor(t / 15) % 2 ? "●" : "○") : "❚❚"} ${tc(sec)}`, P.lecture ? "#ff9a8a" : "#f6dc90");
  ctx.textBaseline = "alphabetic";
}
const distanceAffichee = P => { const T = P.trajets[Math.min(P.tour, 2)]; return Math.max(0, T.D0 - T.v * P.seconde); };
// --- le panneau : la consigne, les commandes de la vidéo, les relevés, la réponse
function panneauVideo(P) {
  const T = P.trajets[P.tour];
  if (P.phase === "suivant") return `<div class="programme"><div class="prog-intro">Trajet suivant…</div></div>`;
  const notes = P.notes.length ? `<table class="releves"><tr><th>Timecode</th><th>Distance ${T.a}</th></tr>${P.notes.map(n => `<tr><td>${tc(n.s)}</td><td>${n.d.toLocaleString("fr-FR")} coudées</td></tr>`).join("")}</table>` : "";
  return `<div class="programme"><div class="prog-intro"><b>Trajet ${P.tour + 1} sur 3.</b> Tu es à bord : le bateau avance vers ${T.nom}. À l'écran, la distance ${T.a} et le timecode. Mets la vidéo en pause à deux moments, note les valeurs, et calcule la vitesse du bateau.</div>
    <div class="prog-actions"><button type="button" data-vd="lecture">${P.lecture ? "⏸ Pause" : "▶ Lecture"}</button><button type="button" data-vd="noter"${P.lecture ? " disabled" : ""}>📌 Noter ce moment</button><button type="button" data-vd="revoir">⏮ Revoir</button></div>
    ${notes}
    <div class="prog-actions"><input id="repVitesse" class="champ-bateau" inputmode="decimal" autocomplete="off" placeholder="vitesse, en coudées par seconde"><button type="button" data-vd="valider">Valider</button></div></div>`;
}
function validerVideo(P) {
  const el = document.getElementById("repVitesse"); if (!el) return;
  const v = parseFloat(el.value.replace(",", ".")); if (isNaN(v)) { messageTemple("Écris un nombre.", false); return; }
  const T = P.trajets[P.tour];
  if (v === T.v) { compterReponse(true); son("bravo"); gardien.justes++; majCompteur(); P.lecture = false; P.phase = "suivant"; P.attente = 60; messageTemple(`Oui : le bateau parcourt ${T.v} coudées par seconde.`, true); }
  else {
    compterReponse(false); son("croc");
    const [a, b] = P.notes; const aide = a && b && b.s !== a.s ? ` Avec tes relevés : ${Math.abs(a.d - b.d)} coudées en ${Math.abs(b.s - a.s)} secondes, soit ${Math.abs(a.d - b.d)} ÷ ${Math.abs(b.s - a.s)} = ${T.v} coudées par seconde.` : " Relève la distance et le timecode à deux moments.";
    messageTemple("Non." + aide, false);
  }
  afficherQuestion();
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-vd]"); if (!b || b.disabled || !niv || niv.sorte !== "bateau" || gardien.etat === "fini" || P.phase !== "video") return;
  const c = b.dataset.vd;
  if (c === "lecture") { if (distanceAffichee(P) <= 0) { P.seconde = 0; P.parcouru = 0; P.image = 0; } P.lecture = !P.lecture; }
  else if (c === "noter") { const n = { s: P.seconde, d: distanceAffichee(P) }; if (!P.notes.some(m => m.s === n.s)) { P.notes.push(n); if (P.notes.length > 4) P.notes.shift(); } son("bois"); }
  else if (c === "revoir") { Object.assign(P, { seconde: 0, parcouru: 0, image: 0, lecture: false }); }
  else if (c === "valider") { validerVideo(P); return; }
  afficherQuestion();
});
document.addEventListener("keydown", e => { if (e.key === "Enter" && e.target && e.target.id === "repVitesse" && niv && niv.sorte === "bateau") { e.preventDefault(); validerVideo(P); } });
function bougerVideo(P) {
  const T = P.trajets[Math.min(P.tour, 2)];
  if (P.lecture) {
    P.image++; P.parcouru += T.v / 30;
    if (P.image % 30 === 0) { P.seconde++; if (distanceAffichee(P) <= 0) { P.lecture = false; messageTemple(`Le bateau est arrivé devant ${T.nom}. Tu peux revoir la vidéo.`, true); afficherQuestion(); } }
  }
  if (P.phase === "suivant" && --P.attente <= 0) {
    if (gardien.justes >= 3) { gardien.etat = "fini"; P.sortie = 1; P.phase = "fini"; }
    else { P.tour++; Object.assign(P, { phase: "video", lecture: false, seconde: 0, parcouru: 0, image: 0, notes: [] }); }
    afficherQuestion();
  }
  if (P.sortie && ++P.sortie === 80) plateauFranchi();
}

// La fiche du plateau, telle qu'elle était dans NIVEAUX :
/*
  {
    titre: "Plateau 6", nom: "À bord, vers la cible", court: "Le bateau", sorte: "bateau",
    fixe: true, attendre: true, depart: [8, 140], blocs: [],
    bonnes: 3, compteur: "Trajets :",
    touches: "La touche espace met la vidéo en lecture ou en pause.",
    init: () => ({ trajets: [0, 1, 2].map(genererTrajet), tour: 0, phase: "video", lecture: false, seconde: 0, parcouru: 0, image: 0, notes: [], attente: 0, sortie: 0 }),
    maj: bougerVideo,
    touche: (e, P) => { if (e.key === " " && P.phase === "video" && !(e.target && e.target.id === "repVitesse")) { if (distanceAffichee(P) <= 0) { P.seconde = 0; P.parcouru = 0; P.image = 0; } P.lecture = !P.lecture; afficherQuestion(); return true; } return false; },
    passer: P => { Object.assign(P, { phase: "fini", sortie: 1 }); },
    attente: P => gardien.etat === "fini" ? "Trois trajets, trois vitesses : tu sais mesurer la vitesse d'un bateau !" : panneauVideo(P),
    lexique: [["Le Nil", "le plus long fleuve d'Afrique : en Égypte, on voyageait surtout en bateau, en descendant le courant vers le nord ou en remontant grâce au vent.", "bateau"], ["Les temples du fleuve", "beaucoup de temples, comme celui de Kom Ombo, étaient bâtis au bord du Nil : on y arrivait en bateau.", "temple"], ["L'obélisque", "une haute aiguille de granit taillée d'un seul bloc, la pointe couverte d'or ; on la transportait sur le Nil, sur d'immenses barges.", "obélisque"], ["La coudée", "l'unité de longueur des Égyptiens : du coude au bout des doigts, environ 52 cm.", "coudées"]],
    aide: "La vidéo montre le trajet du bateau vers la cible. Mets-la en pause à deux moments et note la distance à la cible et le timecode (📌). La différence des distances, c'est le chemin parcouru ; la différence des timecodes, c'est la durée. La vitesse, en coudées par seconde, c'est le chemin parcouru en une seconde.",
    transition: "Le bateau accoste : le voyage continue…"
  },
*/
