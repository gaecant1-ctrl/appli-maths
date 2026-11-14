// ============================================================
//  Le crapaud et l'ibis — LE MOTEUR
//  Même fonctionnement que « Le crapaud et le dragon » : un monde de 240 × 180, 30 images par seconde ;
//  le décor pose les questions, on répond dans le panneau de droite. Les escales sont dans escales.js.
// ============================================================
const SAUT = -6;                                     // environ 36 de haut

// ---------- Élève ----------
const CLE_ELEVE = "crapaudIbis.eleve";
const POINTS_DEPART = 10, POINT_BON = 1, POINT_FAUX = 2;
let eleve = { nom: "", plateaux: 0, record: 0, reponses: 0, bonnes: 0, points: POINTS_DEPART };
let enregistre = null;
function empreinte(e) {
  const m = e.meilleur;
  const t = "ibis✦" + [e.nom, e.plateaux, e.record, e.reponses, e.bonnes, e.points].join("✦") + (m ? "✦" + [m.points, m.reponses, m.bonnes].join("✦") : "");
  let h = 2166136261;
  for (let k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; }
  return h.toString(36);
}
try {
  const e = JSON.parse(localStorage.getItem(CLE_ELEVE));
  if (e && typeof e.nom === "string" && e.cle === empreinte(e))
    enregistre = { nom: e.nom, plateaux: e.plateaux | 0, record: e.record | 0, reponses: e.reponses | 0, bonnes: e.bonnes | 0, points: e.points | 0, meilleur: e.meilleur || null };
} catch (e) {}
const sauverEleve = () => { try { localStorage.setItem(CLE_ELEVE, JSON.stringify({ ...eleve, cle: empreinte(eleve) })); } catch (e) {} };
const prenom = () => eleve.nom.split(" ")[0];

// ---------- État de la partie ----------
let niv, heros, gardien, P = {}, partie = { image: 0, fin: null, niveau: 0, minuteurs: [] }, question = null, questionCorrigee = null, choixFait = -1;
let parcours = { reponses: 0, bonnes: 0, points: POINTS_DEPART };
let suiteEnAttente = null;
// un minuteur, compté en images de jeu (il s'arrête quand le jeu est en pause)
const apres = (n, fn) => partie.minuteurs.push({ n, fn });

function compterReponse(ok) {
  eleve.reponses++; parcours.reponses++;
  if (ok) { eleve.bonnes++; parcours.bonnes++; }
  const avant = parcours.points;
  const [pb, pf] = (niv && niv.points) || [POINT_BON, POINT_FAUX];   // un plateau peut avoir son propre barème
  parcours.points = Math.max(0, parcours.points + (ok ? pb : -pf));
  eleve.points = parcours.points;
  sauverEleve();
  majPoints(parcours.points - avant);
}
function majPoints(delta) {
  $("points").textContent = parcours.points;
  majDanger();
  const d = $("deltaPoints");
  if (!delta) { d.className = ""; d.textContent = ""; return; }
  d.textContent = delta > 0 ? `+${delta}` : `−${-delta}`;
  d.className = ""; void d.offsetWidth; d.className = delta > 0 ? "gain" : "perte";
}

// ---------- Le danger : Anubis vient en aide ----------
// À 1 ou 2 points, un halo rouge entoure le jeu et le bouton « Appeler Anubis » apparaît (une fois par plateau).
// Anubis pose une énigme (le jeu est en pause) : juste, +3 points ; faux, −2 points.
// (Le code garde ses anciens noms, « chouette », hérités du jeu d'Ulysse.)
let enigme = null, questionSauvee = null;
const enDanger = () => !partie.fin && parcours.points > 0 && parcours.points < 3;
function majDanger() {
  const d = enDanger();
  $("cadreJeu").classList.toggle("danger", d);
  $("badgePoints").classList.toggle("danger", d);
  $("btnChouette").hidden = !d || !!partie.chouetteUtilisee || !!partie.chouette || !!suiteEnAttente;
}
function appelerChouette(test) {
  if (partie.fin || partie.chouette || suiteEnAttente || (!test && (!enDanger() || partie.chouetteUtilisee))) return;
  partie.chouetteUtilisee = true;
  for (const k in touches) touches[k] = false;
  enigme = nouvelleEnigme();
  questionSauvee = question; question = null;
  partie.chouette = { t: 0, phase: "arrive", x: L + 20, y: 20 };
  majDanger(); panneauChouette("arrive"); son("chouette");
}
function panneauChouette(etape) {
  $("titreQuestions").textContent = "Anubis"; $("btnAide").hidden = true; montrerAide(false); $("lexique").hidden = true; $("compteur").hidden = true; $("bulle").hidden = true;
  $("choix").hidden = true; $("btnAction").hidden = true;
  const zone = $("calcul"), champ = $("champReponse");
  $("retour").className = "vide";
  if (etape === "arrive") { zone.className = "calcul attente chouette"; zone.innerHTML = "Anubis, le dieu à tête de chacal, sort de l'ombre…"; $("formReponse").style.display = "none"; champ.disabled = true; return; }
  zone.className = "calcul chouette";
  zone.innerHTML = fr(`<div class="chouette-panneau"><span class="sceau-chouette" aria-hidden="true"></span><span>« Petit crapaud, je suis Anubis. Résous mon énigme : <b>+3 points</b>. Si tu te trompes, tu en perdras 2. »</span></div><div class="enigme">« ${enigme.texte} »</div>`);
  $("formReponse").style.display = ""; champ.placeholder = "Ta réponse"; champ.disabled = false; $("btnValider").disabled = false; champ.value = ""; champ.focus();
}
function repondreChouette() {
  const t = $("champReponse").value.replace(/\s/g, ""), r = $("retour");
  if (!/^\d+$/.test(t)) { r.className = "aide"; r.textContent = "Écris un nombre entier."; $("champReponse").focus(); return; }
  const ok = +t === enigme.r;
  compterReponse(ok);
  if (ok) { parcours.points += 2; eleve.points = parcours.points; sauverEleve(); majPoints(3); son("bravo"); }
  else son("faux");
  if (partie.chouette) { partie.chouette.phase = ok ? "benit" : "part"; partie.chouette.tp = 0; partie.chouette.rate = !ok; }
  r.className = ok ? "ok" : "ko";
  r.textContent = fr(ok ? "Juste ! Anubis hoche la tête : +3 points." : lignes("❌ " + enigme.correction + " — Anubis retourne dans l'ombre : −2 points."));
  enigme = null;
  $("formReponse").style.display = "none"; $("champReponse").disabled = true;
  suiteEnAttente = () => { if (partie.chouette) { partie.chouette.phase = "part"; partie.chouette.tp = 0; } question = questionSauvee; questionSauvee = null; majPanneau(); };
  const b = $("btnSuiteCorrection"); b.textContent = parcours.points <= 0 ? "Tu n'as plus de points… →" : "Continuer →"; b.hidden = false; b.focus();
  majDanger();
}
$("btnChouette").onclick = () => appelerChouette();
// le sceau rond d'Anubis (bouton et panneau) : son portrait, dessiné une fois
function sceauAnubis() {
  const c = document.createElement("canvas"); c.width = c.height = 96; const g = c.getContext("2d");
  if (IMG_TETE_ANUBIS.complete && IMG_TETE_ANUBIS.naturalWidth) { g.fillStyle = "#1b1530"; g.fillRect(0, 0, 96, 96); g.drawImage(IMG_TETE_ANUBIS, 96, 170, 270, 270, 0, 0, 96, 96); }
  else { const ecran = ctx; ctx = g; try { ctx.fillStyle = "#2a2018"; ctx.fillRect(0, 0, 96, 96); ctx.setTransform(1.05, 0, 0, 1.05, 0, 0); anubis(60, 236, 1.5, 0, true); } finally { ctx = ecran; } }
  document.documentElement.style.setProperty("--sceau-anubis", `url(${c.toDataURL()})`);
}
setTimeout(() => { sceauAnubis(); IMG_TETE_ANUBIS.onload = sceauAnubis; });   // une fois tout le fichier lu
$("btnTestChouette").onclick = () => appelerChouette(true);
// le vol de la chouette : elle arrive de la droite, se pose en haut de l'écran ; « benit » : une pluie de lumière
function bougerChouette() {
  const C = partie.chouette; if (!C) return;
  C.t++; C.tp = (C.tp || 0) + 1;
  const perche = [L - 34, 30];
  if (C.phase === "arrive") { C.x += (perche[0] - C.x) * .07; C.y = perche[1] - 14 * Math.sin(Math.min(1, C.t / 50) * Math.PI); if (C.t > 50) { C.phase = "pose"; panneauChouette("enigme"); } }
  else if (C.phase === "part") { C.x -= 2.6; C.y -= 1.4; if (C.tp > 90) { partie.chouette = null; majDanger(); } }
  else { C.x = perche[0]; C.y = perche[1]; }
}
// Anubis : la scène s'assombrit, il monte de l'ombre, à droite, auréolé d'or ; ses yeux s'allument quand il parle.
const lisse = u => u * u * (3 - 2 * u);
const IMG_ANUBIS = Object.assign(new Image(), { src: "images/anubis-detoure.png" }), YEUX_ANUBIS = [[172, 312], [290, 312]];   // dans l'image de la tête   // les yeux, dans l'image détourée
const IMG_ANUBIS_FOND = Object.assign(new Image(), { src: "images/anubis.jpg" });
// la tête d'Anubis (l'illustration en buste, détourée) : on la pose telle quelle, son collier fait le bas
const IMG_TETE_ANUBIS = Object.assign(new Image(), { src: "images/anubis-tete.png" });
const TETE_ANUBIS = { x: 0, y: 0, w: 463, h: 715 };
let teteAnubisCache = null;
function teteAnubis() {
  if (teteAnubisCache) return teteAnubisCache;
  if (!IMG_TETE_ANUBIS.complete || !IMG_TETE_ANUBIS.naturalWidth) return null;
  const T = TETE_ANUBIS, c = document.createElement("canvas"); c.width = T.w; c.height = T.h; const g = c.getContext("2d");
  g.drawImage(IMG_TETE_ANUBIS, 0, 0);
  return (teteAnubisCache = c);
}
function dessinerChouetteVol(t) {
  const C = partie.chouette; if (!C) return;
  const e = C.phase === "arrive" ? lisse(Math.min(1, C.t / 45)) : C.phase === "part" ? 1 - lisse(Math.min(1, C.tp / 45)) : 1;
  if (e <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(8,8,16,${.66 * e})`; ctx.fillRect(0, 0, L, H);
  const cx = L * .74, g = ctx.createRadialGradient(cx, 70, 4, cx, 70, 110); g.addColorStop(0, `rgba(255,206,110,${.38 * e})`); g.addColorStop(1, "rgba(255,190,90,0)"); ctx.fillStyle = g; ctx.fillRect(0, 0, L, H);
  ctx.globalAlpha = e;
  const parle = C.phase === "pose" || C.phase === "benit", bas = H + 4 + (1 - e) * 40 + Math.sin(t / 25);
  const tete = teteAnubis();
  if (tete) {
    // seulement la tête d'Anubis (prise dans l'illustration détourée), en grand, qui se fond vers le bas ; ses yeux s'allument quand il parle
    const T = TETE_ANUBIS, sc = H * .9 / T.h, w = T.w * sc, x0 = cx - w / 2, y0 = 10 + (1 - e) * 30 + Math.sin(t / 25);
    ctx.drawImage(tete, x0, y0, w, T.h * sc);
    if (parle) for (const [u0, v0] of YEUX_ANUBIS) { const u = u0 - T.x, v = v0 - T.y, ex = x0 + u * sc, ey = y0 + v * sc, gg = ctx.createRadialGradient(ex, ey, 0, ex, ey, 3.5); gg.addColorStop(0, `rgba(255,210,90,${.5 + .3 * Math.sin(t / 8)})`); gg.addColorStop(1, "rgba(255,170,50,0)"); ctx.fillStyle = gg; rond(ex, ey, 3.5); }
  } else anubis(cx, bas, .95, t, parle);
  ctx.globalAlpha = 1;
  if (C.phase === "benit") for (let k = 0; k < 50; k++) { const u = ((t * (.9 + bruit(k) * .8) + bruit(k + 40) * 70) % 70) / 70, x = L * (.15 + .7 * bruit(k + 80)), y = 10 + (H - 16) * u; ctx.fillStyle = `rgba(255,236,170,${(1 - u) * .8})`; rond(x + Math.sin(k + t / 7) * 3, y, 1.2 * (1 - u) + .4); }
  ctx.restore();
}
// Anubis en buste, de profil vers la gauche (à l'égyptienne) : tête de chacal noire, hautes oreilles, perruque rayée, grand collier
function anubis(x, base, s, t, parle) {
  ctx.save(); ctx.translate(x, base); ctx.scale(s, s);
  const noir = "#16131c";
  ctx.fillStyle = noir; ctx.beginPath(); ctx.moveTo(-36, 0); ctx.quadraticCurveTo(-38, -60, -26, -72); ctx.lineTo(26, -72); ctx.quadraticCurveTo(38, -60, 36, 0); ctx.fill();   // le torse
  ctx.fillStyle = "rgba(255,220,160,.08)"; ovale(-12, -46, 10, 14, 0);
  for (let k = 0; k < 6; k++) { ctx.fillStyle = ["#2a4a9a", "#d9a62e"][k % 2]; ctx.fillRect(4, -108 + k * 7.4, 14, 7.4); }       // la perruque, rayée de bleu et d'or
  ["#d9a62e", "#2a4a9a", "#c84a2a", "#3a9a7a", "#d9a62e", "#2a4a9a"].forEach((c, k) => { ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, -72, 14 + k * 3, 6 + k * 2.6, 0, .05 * Math.PI, .95 * Math.PI); ctx.stroke(); });   // le grand collier
  ctx.fillStyle = noir; ctx.fillRect(-7, -94, 14, 24);                                                                 // le cou
  ctx.fillStyle = "#d9a62e"; ctx.fillRect(-7.5, -82, 15, 3);                                                             // un ruban d'or
  ovale(0, -104, 13, 11, 0);                                                                                            // la tête
  ctx.fillStyle = noir; ovale(0, -104, 12.5, 10.5, 0);
  ctx.beginPath(); ctx.moveTo(-8, -110); ctx.lineTo(-36, -101); ctx.quadraticCurveTo(-38, -98, -35, -96); ctx.lineTo(-6, -93); ctx.fill();   // le long museau
  rond(-36.5, -99, 1.4);
  poly([[-4, -112], [0, -146], [7, -110]], noir); poly([[4, -111], [10, -142], [14, -106]], noir);                        // les oreilles dressées
  trait([[-1, -116], [0, -138]], "#d9a62e", .8); trait([[7, -115], [9.6, -136]], "#d9a62e", .8);
  trait([[-30, -97.5], [-14, -96]], "#3a3040", .6);                                                                     // la gueule
  const lueur = parle ? .55 + .35 * Math.sin(t / 8) : .25;
  const gg = ctx.createRadialGradient(-9, -106, 0, -9, -106, 7); gg.addColorStop(0, `rgba(255,200,80,${lueur})`); gg.addColorStop(1, "rgba(255,170,50,0)"); ctx.fillStyle = gg; rond(-9, -106, 7);
  ctx.strokeStyle = "#d9a62e"; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(-9, -106, 3.6, 1.8, -.1, 0, Math.PI * 2); ctx.stroke(); trait([[-12.6, -106], [-18, -104.6]], "#d9a62e", .8);   // l'œil fardé
  ctx.fillStyle = "#f4e6b0"; rond(-9.6, -106, 1);
  ctx.restore();
}
// ---------- Charger une escale ----------
function chargerNiveau(n, recommence = false) {
  partie.niveau = n;
  if (n === 0 && !recommence) { parcours = { reponses: 0, bonnes: 0, points: POINTS_DEPART }; eleve.points = POINTS_DEPART; dejaPosees.clear(); }
  partie.fin = null; partie.chouetteUtilisee = recommence && !!partie.chouetteUtilisee; partie.chouette = null; partie.minuteurs = [];
  enigme = null; questionSauvee = null; question = null; questionCorrigee = null;
  niv = NIVEAUX[n];
  const [x, y] = niv.depart || [0, 0];
  heros = { x, y, vx: 0, vy: 0, auSol: false, dir: 1, etat: "libre", pas: 0 };
  gardien = { etat: niv.zone || niv.attendre ? "attend" : "questions", justes: 0 };
  P = niv.init ? niv.init() : {};
  annulerSuite(); fermerEcran();
  $("retour").className = "vide";
  arreterMusique();
  majPoints(0); majPanneau(); afficherQuestion(); majDanger();
  if (niv.demarrer) niv.demarrer(P);
}

// ---------- Contrôles : clavier ----------
const touches = { gauche: false, droite: false, saut: false, bas: false };
const CLAVIER = { ArrowLeft: "gauche", ArrowRight: "droite", ArrowUp: "saut", " ": "saut", Spacebar: "saut", ArrowDown: "bas" };
const guideOuvert = () => $("overlayGuide").classList.contains("visible");
addEventListener("keydown", e => {
  if (e.target.tagName === "INPUT") return;
  if (guideOuvert() || document.body.classList.contains("sans-nom")) return;
  // Entrée : « Continuer » après une correction, ou le bouton d'action de l'escale
  if (e.key === "Enter") {
    if (suiteEnAttente && !$("btnSuiteCorrection").hidden) { lancerSuite(); e.preventDefault(); return; }
    if (!$("btnAction").hidden) { $("btnAction").click(); e.preventDefault(); return; }
  }
  // 1, 2, 3, 4 : choisir une réponse
  if (/^[1-4]$/.test(e.key) && question && question.choix && !suiteEnAttente && !enigme) { const i = +e.key - 1; if (i < question.choix.length) choisirReponse(i); e.preventDefault(); return; }
  // une escale qui a ses propres commandes (le gué d'Éole, vu de dessus)
  if (niv && niv.touche && !partie.fin && niv.touche(e, P)) { e.preventDefault(); return; }
  const t = CLAVIER[e.key];
  if (t) { touches[t] = true; e.preventDefault(); }
});
addEventListener("keyup", e => { const t = CLAVIER[e.key]; if (t) touches[t] = false; });
document.addEventListener("click", e => { const b = e.target.closest("header button, aside button"); if (b) b.blur(); });

// ---------- Collisions ----------
const recouvre = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const boiteHeros = () => ({ x: heros.x, y: heros.y, w: HW, h: HH });
function obstacles() {
  const o = (niv.blocs || []).map(([x, y, w, h]) => ({ x, y, w, h }));
  if (niv.obstacles) niv.obstacles(P, o);
  return o;
}
const sortieOuverte = () => gardien.etat === "fini" && (!niv.sortieOuverte || niv.sortieOuverte(P));

// ---------- Une image de jeu (1/30 s) ----------
function pas() {
  partie.image++;
  // les minuteurs
  const m = partie.minuteurs; partie.minuteurs = [];
  for (const x of m) { if (--x.n <= 0) x.fn(); else partie.minuteurs.push(x); }
  if (partie.fin) return;
  if (niv.maj) niv.maj(P);
  if (niv.fixe || partie.fin) return;
  const c = heros;
  // il entre dans la lumière : l'escale est franchie
  if (c.etat === "entre") {
    const S = niv.sortie;
    c.x += (S.cx - HW / 2 - c.x) * .25; c.y += (S.sol - HH - c.y) * .25; c.auSol = true; c.vx = 0;
    if (++c.entre === 12) son("allume");
    if (c.entre >= 40) plateauFranchi();
    return;
  }
  // tombé à l'eau : il s'enfonce, puis revient au départ
  if (c.etat === "plouf") {
    c.y = Math.min(c.y + 1, niv.eau.y + 6); c.nage = true;
    if (++c.plouf > 36 && !suiteEnAttente) { const [x, y] = niv.depart; Object.assign(c, { x, y, vx: 0, vy: 0, etat: "libre", nage: false }); if (niv.apresPlouf) niv.apresPlouf(P); afficherQuestion(); }
    return;
  }
  if (c.etat === "porte") return;                            // porté par quelque chose (le radeau) : l'escale le déplace
  const libre = c.etat === "libre" && !suiteEnAttente, vMarche = c.auSol ? 2.6 : 1.9;
  if (libre) {
    if (touches.saut && c.auSol) { c.vy = SAUT; c.auSol = false; son("saut"); }
    if (touches.gauche) { c.vx = -vMarche; c.dir = -1; }
    else if (touches.droite) { c.vx = vMarche; c.dir = 1; }
    else c.vx *= c.auSol ? .55 : .8;
  } else c.vx *= .5;
  c.vy = Math.min(c.vy + .5, 7);
  if (c.auSol) c.pas += Math.abs(c.vx) * .32;
  const obs = obstacles();
  // horizontal : repoussé hors des obstacles ; une petite marche (4 au plus) se monte toute seule
  const xAvant = c.x;
  c.x += c.vx;
  for (const o of obs) if (!o.traversable && recouvre(boiteHeros(), o)) {
    if (recouvre({ x: xAvant, y: c.y, w: HW, h: HH }, o)) continue;
    const marche = c.y + HH - o.y, haut = { x: c.x, y: o.y - HH, w: HW, h: HH };
    if (c.auSol && marche > 0 && marche <= 4 && !obs.some(p => p !== o && recouvre(haut, p))) { c.y = o.y - HH; continue; }
    const aGauche = Math.abs(c.vx) > .05 ? c.vx > 0 : c.x + HW / 2 < o.x + o.w / 2;
    c.x = aGauche ? o.x - HW : o.x + o.w; c.vx = 0;
  }
  if (c.x < 0) c.x = 0;
  if (c.x > L - HW) c.x = L - HW;
  // vertical
  const basAvant = c.y + HH;
  c.y += c.vy;
  c.auSol = false; c.sur = null;
  for (const o of obs) if (recouvre(boiteHeros(), o)) {
    if (c.vy >= 0 && basAvant <= o.y + 4) {
      c.y = o.y - HH; c.vy = 0; c.auSol = true;
      // à cheval sur deux appuis : c'est celui qui est sous le milieu du crapaud qui compte
      if (o.id != null) { const d = Math.abs(o.x + o.w / 2 - (c.x + HW / 2)); if (!c.sur || d < c.dSur) { c.sur = o.id; c.dSur = d; } }
    }
    else if (c.vy < 0 && !o.traversable) { c.y = o.y + o.h; c.vy = 0; }
  }
  if (niv.apresMouvement) niv.apresMouvement(P);
  if (c.etat !== "libre") return;
  // à l'eau
  const E = niv.eau, cx = c.x + HW / 2;
  if (E && cx > E.x0 && cx < E.x1 && c.y + HH > E.y + 3) { c.etat = "plouf"; c.plouf = 0; c.vx = 0; c.vy = .5; son("plouf"); if (niv.plouf) niv.plouf(P); return; }
  if (c.y > H) { const [x, y] = niv.depart; Object.assign(c, { x, y, vx: 0, vy: 0 }); }
  // toucher le personnage de l'escale : ses questions commencent
  if (niv.zone && gardien.etat === "attend" && !question && !suiteEnAttente && c.auSol && recouvre(boiteHeros(), niv.zone) && (!niv.zonePrete || niv.zonePrete(P))) {
    gardien.etat = "questions"; if (niv.toucher) niv.toucher(P); poserQuestion();
  }
  // la sortie ouverte
  const S = niv.sortie;
  if (S && sortieOuverte() && c.auSol && Math.abs(c.y + HH - S.sol) < 1.5 && Math.abs(cx - S.cx) < S.r) { c.etat = "entre"; c.entre = 0; c.vx = c.vy = 0; }
}

// ---------- Escale franchie ----------
function afficherTransition(texte) {
  const r = $("retour");
  r.className = "aide"; r.textContent = texte;
  setTimeout(() => { if (r.textContent === texte) { r.className = "vide"; r.textContent = ""; } }, 8000);
}
function plateauFranchi() {
  if (partie.fin) return;
  partie.fin = "franchi"; majDanger();
  if (!niv.final) son("victoire");
  eleve.plateaux++;
  const atteint = partie.niveau + 1, m = eleve.meilleur;
  if (!m || atteint > eleve.record || (atteint === eleve.record && parcours.points >= m.points))
    eleve.meilleur = { points: parcours.points, reponses: parcours.reponses, bonnes: parcours.bonnes };
  eleve.record = Math.max(eleve.record, atteint);
  sauverEleve(); majEntete();
  const n = partie.niveau;
  setTimeout(() => {
    if (partie.fin !== "franchi" || partie.niveau !== n) return;
    if (n + 1 >= NIVEAUX.length) { montrerEcran("fin"); return; }
    const texte = niv.transition;
    chargerNiveau(n + 1);
    if (texte) afficherTransition(fr(texte));
  }, 300);
}

// ---------- Les questions ----------
function poserQuestion() {
  if (partie.fin || gardien.etat !== "questions") return;
  question = niv.question(gardien.justes, P);
  // de temps en temps, une question mixte (maths + français) remplace une question de français
  if (question.matiere === "francais" && niv.mixte !== false && Math.random() < .25) question = qMixte() || question;
  choixFait = -1;
  afficherQuestion();
}
function majBulle() {
  const q = question || (suiteEnAttente && questionCorrigee);
  const qui = niv.qui && niv.qui(P, q);
  $("bulle").hidden = !(q && qui && !enigme);
  if (!$("bulle").hidden) { document.querySelector(".bulle-qui").textContent = qui; $("bulleTexte").textContent = fr(q.bulle || (q.matiere === "maths" ? "J'ai un problème pour toi…" : "J'ai une question pour toi…")); }
}
function afficherQuestion() {
  if (enigme) return;
  const zone = $("calcul"), champ = $("champReponse"), choix = $("choix");
  majCompteur(); majBulle();
  // le bouton d'action de l'escale (« Lever l'ancre », « Mon navire est ici »…)
  const a = !suiteEnAttente && niv.bouton ? niv.bouton(P) : null;
  $("btnAction").hidden = !a; if (a) { $("btnAction").textContent = a.texte; $("btnAction").onclick = a.fn; }
  const q = question || (suiteEnAttente ? questionCorrigee : null);
  if (!q) {
    zone.className = "calcul attente"; zone.innerHTML = fr(suiteEnAttente && !niv.garderTexte ? "Lis bien la correction, puis clique sur « Continuer »." : (niv.attente ? niv.attente(P) : ""));
    $("formReponse").style.display = "none"; choix.hidden = true;
    champ.disabled = true; $("btnValider").disabled = true; champ.value = ""; champ.blur();
    return;
  }
  const etiquette = q.matiere ? `<div><span class="matiere ${q.matiere}">${{ maths: "Maths", francais: "Français", mixte: "Maths + Français" }[q.matiere]}</span></div>` : "";
  zone.className = "calcul" + (q.choix && !q.court ? " carte" : ""); zone.innerHTML = etiquette + fr(q.html);
  if (q.choix) {
    // les réponses à choisir ; après une erreur, la bonne en vert et celle qu'on a choisie en rouge
    $("formReponse").style.display = "none"; champ.disabled = true; champ.blur();
    choix.hidden = !!(q.steles && !suiteEnAttente);   // au plateau 10, on répond en allant toucher une stèle
    choix.innerHTML = q.choix.map((c, i) => `<button type="button" data-i="${i}"${suiteEnAttente ? " disabled" : ""} class="${suiteEnAttente ? (i === q.bonne ? "bonne" : i === choixFait ? "mauvaise" : "") : ""}"><span class="lettre">${niv.lettres ? "ABCD"[i] : i + 1}</span><span>${fr(esc(c))}</span></button>`).join("");
    return;
  }
  choix.hidden = true;
  if (q.placer) { $("formReponse").style.display = "none"; champ.disabled = true; champ.blur(); return; }
  $("formReponse").style.display = suiteEnAttente ? "none" : "";
  champ.placeholder = q.placeholder || "Ta réponse";
  champ.disabled = !!suiteEnAttente; $("btnValider").disabled = !!suiteEnAttente;
  if (!suiteEnAttente) { champ.value = ""; champ.focus(); }
}
$("choix").addEventListener("click", e => { const b = e.target.closest("button[data-i]"); if (b && !b.disabled) choisirReponse(+b.dataset.i); });
function choisirReponse(i) {
  const q = question; if (!q || !q.choix || partie.fin || suiteEnAttente) return;
  choixFait = i;
  traiterReponse(i === q.bonne, q);
}
$("formReponse").addEventListener("submit", ev => {
  ev.preventDefault();
  if (enigme && !partie.fin) { repondreChouette(); return; }
  const q = question;
  if (!q || partie.fin || !q.lire) return;
  const lu = q.lire($("champReponse").value, q), r = $("retour");
  if (!lu || lu.aide) { r.className = "aide"; r.textContent = fr(lu && lu.aide || "Écris ta réponse."); $("champReponse").focus(); return; }
  traiterReponse(lu.ok, q, lu.presque);
});
// juste : l'escale réagit (une marche, un tronc…) et la question suivante vient ; faux : la correction, puis une autre question
function traiterReponse(ok, q, presque) {
  if (!q || partie.fin) return;
  compterReponse(ok);
  question = null; questionCorrigee = q;
  const r = $("retour");
  if (ok) {
    r.className = "vide"; son("bon");
    gardien.justes++;
    if (niv.effetBon) niv.effetBon(P, gardien.justes, q);
    if (gardien.justes >= niv.bonnes) { gardien.etat = "fini"; if (niv.finir) niv.finir(P); }
    else if (!niv.sansEnchainer) apres(niv.delai ?? 40, () => { if (!question && !suiteEnAttente && gardien.etat === "questions") poserQuestion(); });
    afficherQuestion(); return;
  }
  son("faux");
  const bonneRep = q.annonce ? q.annonce + "\n" : q.choix ? `La bonne réponse : « ${q.bonneRep || q.choix[q.bonne]} ». ` : "";
  // une correction en dialogue : le portrait de celui qui parle, et sa phrase à côté
  if (q.repliques) { r.className = "ko"; r.innerHTML = q.repliques.map(([img, t]) => `<div class="replique"><img src="${img}" alt=""><span>${esc(fr(t))}</span></div>`).join(""); }
  else r.className = "ko", r.textContent = fr(lignes("❌ " + (q.reaction ? q.reaction + "\n" : "") + (presque ? presque + " " : "") + bonneRep + q.correction + (q.suite ? " — " + q.suite : "")));
  if (niv.effetFaux) niv.effetFaux(P, q);
  attendreSuite(() => { if (niv.apresFaux) niv.apresFaux(P, q); else poserQuestion(); });
}
// ---------- Après une erreur : la correction reste affichée, le jeu attend « Continuer » ----------
function attendreSuite(fn) {
  suiteEnAttente = fn;
  for (const k in touches) touches[k] = false;
  afficherQuestion();
  const b = $("btnSuiteCorrection"); b.textContent = parcours.points <= 0 ? "Tu n'as plus de points… →" : "Continuer →"; b.hidden = false; b.focus();
  majDanger();
}
function lancerSuite() {
  const fn = suiteEnAttente; if (!fn) return;
  suiteEnAttente = null; questionCorrigee = null;
  $("btnSuiteCorrection").hidden = true; $("retour").className = "vide";
  if (parcours.points <= 0) { finDePartie(); return; }
  fn();
  afficherQuestion(); majDanger();
}
function finDePartie() { partie.fin = "perdu"; question = null; majDanger(); son("perdu"); afficherQuestion(); montrerEcran("perdu"); }
$("btnSuiteCorrection").onclick = lancerSuite;
function annulerSuite() { suiteEnAttente = null; $("btnSuiteCorrection").hidden = true; }

// Mode test (adresse avec ?test) : l'escale s'ouvre d'un coup
$("btnPasser").onclick = () => {
  if (partie.fin || gardien.etat === "fini") return;
  $("retour").className = "vide"; question = null; annulerSuite();
  gardien.justes = niv.bonnes; gardien.etat = "fini";
  if (niv.passer) niv.passer(P);
  if (niv.finir) niv.finir(P);
  afficherQuestion();
};

function majCompteur() {
  const commence = gardien && (gardien.etat !== "attend" || gardien.justes > 0);
  $("compteur").hidden = !commence || !niv.compteur;
  $("compteur").replaceChildren(document.createTextNode(niv.compteur || ""),
    ...Array.from({ length: niv.bonnes }, (_, k) => { const s = document.createElement("span"); if (k < gardien.justes) s.className = "juste"; return s; }));
}
function majPanneau() {
  $("titreQuestions").textContent = niv.nom;
  $("chrono").hidden = true;
  $("aidePlateau").textContent = fr(niv.aide || ""); montrerAide(false);
  $("btnAide").hidden = !niv.aide;
  majLexique(true);
  $("aideTouches").textContent = niv.touches || "Clavier : ← → pour marcher, espace ou ↑ pour sauter (flèche + espace : saut en avançant).";
  majCompteur();
  $("plateaux").innerHTML = NIVEAUX.map((n, k) => `<span data-k="${k}" class="${k < partie.niveau ? "fait" : k === partie.niveau ? "actuel" : ""}" title="${n.titre} : ${n.nom}">${k + 1}</span>`).join("");
}
function montrerAide(ouverte) { $("aidePlateau").hidden = !ouverte; $("btnAide").setAttribute("aria-expanded", ouverte); }
// « Le saviez-vous ? » : on explique le mot égyptien qui vient d'apparaître dans le texte du panneau (le calame quand
// Thot pointe son calame, le deben quand les débits s'affichent…) ; chaque mot n'est expliqué qu'une fois par plateau
let lexiqueVus = new Set(), lexiqueCourant = null;
function majLexique(nouveau) {
  const Lx = niv && niv.lexique, el = $("lexique");
  if (nouveau) { lexiqueVus = new Set(); lexiqueCourant = null; }
  if (!Lx || (partie && partie.chouette)) { el.hidden = true; return; }
  const texte = ($("calcul").innerText + " " + $("retour").innerText).toLowerCase();
  const presents = Lx.filter(e => texte.includes(e[2]));
  const neuf = presents.find(e => !lexiqueVus.has(e[0]));
  if (neuf) { lexiqueCourant = neuf; lexiqueVus.add(neuf[0]); }
  el.hidden = !lexiqueCourant;
  if (lexiqueCourant) el.innerHTML = `<span class="titre">Le saviez-vous ?</span><b>${lexiqueCourant[0]}</b> : ${fr(lexiqueCourant[1])}`;
}
new MutationObserver(() => majLexique()).observe($("calcul"), { childList: true, subtree: true, characterData: true });
$("btnAide").onclick = () => montrerAide($("aidePlateau").hidden);
$("plateaux").addEventListener("click", e => { const p = e.target.closest("[data-k]"); if (p && document.body.classList.contains("mode-test")) chargerNiveau(+p.dataset.k); });

// ---------- Écrans (par-dessus le jeu) ----------
function montrerEcran(sorte) {
  const c = $("carteJeu");
  if (sorte === "perdu") {
    c.innerHTML = `<h3 class="titre-grec">Plus de points !</h3><p>Le voyage s'arrête là pour cette fois.</p>
      <p>Tu repars du premier plateau avec 10 points.</p>
      <p>Réponses justes : <b>${parcours.bonnes}</b> sur ${parcours.reponses}.</p>
      <p><button class="suite" id="btnSuite">↺ Recommencer</button></p>`;
    $("btnSuite").onclick = () => chargerNiveau(0);
  } else {
    const qui = prenom() ? `, ${esc(prenom())}` : "";
    c.innerHTML = `<h3 class="titre-grec">Bravo${qui} !</h3><p>Tu as traversé l'Égypte des pharaons, petit crapaud d'or !</p>
      <p>Réponses justes : <b>${parcours.bonnes}</b> sur ${parcours.reponses}.</p>
      <p>Points : <b>${parcours.points}</b>.</p>
      <p><button class="suite" id="btnSuite">↺ Rejouer</button> <button class="suite" id="btnFinDiplome">🎓 Diplôme</button></p>`;
    $("btnSuite").onclick = () => chargerNiveau(0);
    $("btnFinDiplome").onclick = ouvrirDiplome;
  }
  $("ecranJeu").classList.toggle("final", sorte === "fin");
  $("ecranJeu").classList.add("visible");
  setTimeout(() => { const b = c.querySelector("button"); if (b) b.focus(); }, 0);
}
function fermerEcran() { $("ecranJeu").classList.remove("visible"); }

// ---------- Dessin d'une image ----------
function dessiner() {
  ctx.setTransform(echelle, 0, 0, echelle, 0, 0);
  const t = partie.image;
  niv.dessiner(P, t);
  if (!niv.fixe && !(niv.cacher && niv.cacher(P))) {
    dessinerSortie(t);
    if (heros.etat === "entre") ctx.globalAlpha = Math.max(0, 1 - heros.entre / 36);
    if (heros.etat === "plouf") { ctx.save(); ctx.beginPath(); ctx.rect(0, 0, L, niv.eau.y + 1); ctx.clip(); }
    dessinerCrapaud(heros, t);
    if (heros.etat === "plouf") { ctx.restore(); if (heros.plouf < 20) { ctx.fillStyle = "rgba(240,248,255,.8)"; for (let k = 0; k < 6; k++) rond(heros.x + HW / 2 + Math.cos(k) * heros.plouf * .5, niv.eau.y - Math.sin(k * 1.3) * (6 - heros.plouf * .25), .8); } }
    ctx.globalAlpha = 1;
  }
  if (niv.dessinerDevant) niv.dessinerDevant(P, t);
  dessinerChouetteVol(t);
}
function dessinerVignette() {
  const v = $("vignette"); if (!v) return;
  const dpr = window.devicePixelRatio || 1, w = Math.round(v.clientWidth * dpr);
  if (!w) return;
  if (v.width !== w) { v.width = w; v.height = Math.round(w * H / L); }
  const ecran = ctx; ctx = v.getContext("2d"); echelle = v.width / L;
  try { ctx.setTransform(echelle, 0, 0, echelle, 0, 0); vignetteAccueil(partie.image); } finally { ctx = ecran; }
}

// ---------- Boucle : 30 images par seconde ----------
let dernier = performance.now(), cumul = 0;
function boucle(maintenant) {
  cumul += Math.min(200, maintenant - dernier);
  dernier = maintenant;
  const accueil = document.body.classList.contains("sans-nom");
  while (cumul >= 1000 / 30) {
    if (partie.chouette) bougerChouette();
    const enPause = guideOuvert() || !!partie.chouette;
    if (accueil || enPause) partie.image++; else pas();
    cumul -= 1000 / 30;
  }
  try { if (accueil) dessinerVignette(); else dessiner(); } catch (e) { console.error(e); }
  requestAnimationFrame(boucle);
}
new ResizeObserver(() => {
  const r = $("cadreJeu").getBoundingClientRect();
  const e = Math.max(1, Math.min(r.width / L, r.height / H));
  const w = Math.floor(L * e), h = Math.floor(H * e), dpr = window.devicePixelRatio || 1;
  cv.style.width = w + "px"; cv.style.height = h + "px";
  cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
  echelle = cv.width / L;
}).observe($("cadreJeu"));

// ============================================================
//  SONS : des bips composés par le navigateur (gamme grecque : mode dorien)
// ============================================================
let sonActif = true, audio = null;
function contexteAudio() {
  if (audio) return audio;
  try { audio = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  return audio;
}
function bip(freq, duree, type = "square", fin = freq, volume = .06, retard = 0) {
  if (!sonActif || !contexteAudio()) return;
  try {
    const o = audio.createOscillator(), g = audio.createGain(), t0 = audio.currentTime + retard;
    o.type = type; o.frequency.setValueAtTime(freq, t0); o.frequency.exponentialRampToValueAtTime(fin, t0 + duree);
    g.gain.setValueAtTime(volume, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + duree);
    o.connect(g); g.connect(audio.destination); o.start(t0); o.stop(t0 + duree);
  } catch (e) {}
}
// une lyre : une corde pincée (triangle + harmoniques qui s'éteignent vite)
function lyre(f, retard = 0, v = .07, d = .9) { bip(f, d, "triangle", f * .998, v, retard); bip(f * 2, d * .5, "sine", f * 2, v * .3, retard); }
const DORIEN = [293.66, 329.63, 349.23, 392, 440, 493.88, 523.25, 587.33];
let musiqueFinale = null;
function arreterMusique() { if (musiqueFinale) { clearInterval(musiqueFinale); musiqueFinale = null; } }
function lancerMusiqueFinale() {
  arreterMusique();
  const air = [0, 2, 4, 7, 4, 5, 4, 2, 3, 2, 1, 0, 1, 2, 4, 2];
  let k = 0;
  const jouer = () => { if (!sonActif) return; for (let i = 0; i < 4; i++, k++) { const n = air[k % air.length]; lyre(DORIEN[n], i * .28, .06); if (i === 0) lyre(DORIEN[n] / 2, 0, .05, 1.2); } };
  jouer(); musiqueFinale = setInterval(jouer, 1120);
  setTimeout(arreterMusique, 30000);
}
function son(s) {
  if (s === "saut") bip(300, .14, "square", 640, .04);
  if (s === "bon") { lyre(587.33, 0, .08, .4); lyre(783.99, .1, .08, .6); }
  if (s === "faux") bip(200, .25, "sawtooth", 120);
  if (s === "plouf") { bip(420, .18, "sine", 90, .07); bip(250, .25, "triangle", 60, .04, .05); }
  if (s === "bois") { bip(180, .08, "square", 120, .05); bip(140, .1, "triangle", 90, .05, .07); }
  if (s === "rocher") { bip(70, .6, "sawtooth", 40, .05); bip(55, .7, "triangle", 35, .06, .05); }
  if (s === "grogne") { bip(65, .9, "sawtooth", 48, .07); bip(98, .7, "sawtooth", 70, .04, .08); bip(52, 1.1, "square", 40, .03, .15); }
  if (s === "croc") { bip(160, .12, "square", 90, .07); bip(120, .14, "square", 70, .06, .08); }
  if (s === "sable") { for (let k = 0; k < 6; k++) bip(1800 + k * 300, .12, "sawtooth", 900, .008, k * .05); bip(200, .5, "triangle", 120, .02); }
  if (s === "vent") bip(500, .8, "sine", 200, .02);
  if (s === "magie") [0, .08, .16, .24, .32].forEach((r, k) => bip(900 + k * 160, .2, "sine", 1400 + k * 200, .025, r));
  if (s === "chouette") { bip(520, .25, "sine", 470, .06); bip(470, .45, "sine", 400, .06, .35); }
  if (s === "chant") [0, .15, .3].forEach((r, k) => bip(660 + k * 120, .35, "sine", 520 + k * 100, .04, r));
  if (s === "fleche") bip(1400, .25, "sine", 300, .04);
  if (s === "allume") lyre(880, 0, .05, .7);
  if (s === "bravo") [0, 2, 4, 7].forEach((n, k) => lyre(DORIEN[n] * 2, k * .12, .06, .5));
  if (s === "perdu") [7, 4, 2, 0].forEach((n, k) => lyre(DORIEN[n], k * .22, .07, .5));
  if (s === "victoire") [0, 2, 4, 5, 7].forEach((n, k) => lyre(DORIEN[n] * 2, k * .13, .06, .5));
}
$("btnSon").onclick = () => { sonActif = !sonActif; if (!sonActif) arreterMusique(); $("btnSon").textContent = sonActif ? "🔊" : "🔇"; };
addEventListener("pointerdown", () => { if (contexteAudio() && audio.state === "suspended") audio.resume(); });
addEventListener("keydown", () => { if (contexteAudio() && audio.state === "suspended") audio.resume(); }, { once: true });

// ============================================================
//  EN-TÊTE, ACCUEIL, GUIDE, RÉINITIALISATION
// ============================================================
function majEntete() {
  $("eleveInfo").textContent = eleve.nom ? eleve.nom + " · " + eleve.record + " plateau" + (eleve.record > 1 ? "x" : "") + " franchi" + (eleve.record > 1 ? "s" : "") : "";
}
function choisirEleve(nom) {
  if (nom !== eleve.nom) {
    eleve = enregistre && enregistre.nom === nom ? enregistre : { nom, plateaux: 0, record: 0, reponses: 0, bonnes: 0, points: POINTS_DEPART };
    enregistre = eleve; sauverEleve();
  }
  document.body.classList.remove("sans-nom");
  majEntete();
}
function commencer() {
  const champ = $("champNom"), nom = champ.value.trim().replace(/\s+/g, " ");
  if (nom.length < 2) { $("erreurNom").textContent = "Écris ton prénom et ton nom."; champ.focus(); return; }
  choisirEleve(nom); champ.blur();
  chargerNiveau(0);
}
$("btnCommencer").onclick = commencer;
$("champNom").addEventListener("keydown", e => { if (e.key === "Enter") commencer(); });
$("btnRecommencer").onclick = () => parcours.points <= 0 ? chargerNiveau(0) : chargerNiveau(partie.niveau, true);
const ouvrirGuide = ouvert => { $("overlayGuide").classList.toggle("visible", ouvert); $("btnGuide").classList.toggle("actif", ouvert); if (ouvert) for (const k in touches) touches[k] = false; };
$("btnGuide").onclick = () => ouvrirGuide(!guideOuvert());
$("btnFermerGuide").onclick = () => ouvrirGuide(false);
$("overlayGuide").addEventListener("click", e => { if (e.target.id === "overlayGuide") ouvrirGuide(false); });
addEventListener("keydown", e => { if (e.key === "Escape" && guideOuvert()) ouvrirGuide(false); });
const fermerConfirm = () => { $("voileConfirm").hidden = true; };
$("btnReinitialiser").onclick = () => { $("voileConfirm").hidden = false; $("btnAnnulerReinit").focus(); };
$("btnAnnulerReinit").onclick = fermerConfirm;
$("voileConfirm").addEventListener("click", e => { if (e.target === $("voileConfirm")) fermerConfirm(); });
addEventListener("keydown", e => { if (e.key === "Escape" && !$("voileConfirm").hidden) fermerConfirm(); });
$("btnOuiReinit").onclick = () => {
  fermerConfirm();
  Object.assign(eleve, { plateaux: 0, record: 0, reponses: 0, bonnes: 0, points: POINTS_DEPART, meilleur: null });
  sauverEleve(); majEntete(); chargerNiveau(0);
};

// ============================================================
//  LE DIPLÔME (terre cuite et noir, frise de méandres)
// ============================================================
const FICHE_CSS = `#overlayFiche{position:fixed;inset:0;background:rgba(20,14,10,.55);display:none;align-items:flex-start;justify-content:center;overflow:auto;z-index:2000;padding:24px;}
#overlayFiche.ouverte{display:flex;}
#ficheCarte{position:relative;background:#fff;color:#1b130e;width:min(297mm,100%);border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.3);padding:12mm 12mm 14mm;font-size:12pt;}
#btnFermerFiche{position:absolute;top:8px;right:12px;border:none;background:none;font-size:28px;cursor:pointer;color:#6b6158;}
#overlayFiche .fiche-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;}
#overlayFiche .fiche-actions button{border:1px solid #8f3f17;background:#8f3f17;color:#fff;border-radius:6px;padding:8px 14px;font:inherit;font-size:.95rem;cursor:pointer;}
#overlayFiche .note-impression{font-size:.85rem;color:#6b6158;margin:0 0 10mm;}
#overlayFiche .diplome{width:277mm;height:190mm;flex:none;transform-origin:0 0;background:radial-gradient(ellipse at center,#fff8ea 0%,#f2e1c0 100%);color:#1b130e;padding:4mm;border-radius:2mm;box-shadow:inset 0 0 0 1.5mm #1b130e;font-family:Georgia,"Times New Roman",serif;}
#overlayFiche .d-cadre{position:relative;height:100%;border:.8mm solid #c8642c;padding:12mm 16mm 6mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;}
#overlayFiche .d-frise{position:absolute;left:0;right:0;height:7mm;background:var(--meandre-d) repeat-x;background-size:14mm 7mm;}
#overlayFiche .d-frise.haut{top:1.5mm;} #overlayFiche .d-frise.bas{bottom:1.5mm;transform:scaleY(-1);}
#overlayFiche .d-sceau{position:absolute;top:12mm;width:22mm;height:22mm;border-radius:50%;background:#c8642c;color:#1b130e;display:flex;align-items:center;justify-content:center;font-family:"Cinzel",serif;font-weight:800;font-size:14mm;box-shadow:inset 0 0 0 1mm #1b130e;}
#overlayFiche .d-sceau.g{left:14mm;} #overlayFiche .d-sceau.d{right:14mm;font-size:12mm;}
#overlayFiche .d-athena{position:absolute;left:50%;top:34mm;width:100mm;transform:translateX(-50%);opacity:.14;mix-blend-mode:multiply;pointer-events:none;}
#overlayFiche .d-cadre > :not(.d-athena):not(.d-frise):not(.d-sceau){position:relative;}
#overlayFiche .d-titre{font-family:"Cinzel",Georgia,serif;font-size:46pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#8f3f17;line-height:1.05;margin-top:4mm;}
#overlayFiche .d-sous{font-size:14pt;color:#6b4a2e;letter-spacing:.04em;margin-top:1mm;}
#overlayFiche .d-sous b{color:#8f3f17;}
#overlayFiche .d-texte{text-align:center;}
#overlayFiche .d-decerne{font-style:italic;font-size:15pt;color:#6b4a2e;}
#overlayFiche .d-nom{font-family:"Dancing Script","Brush Script MT",cursive;font-size:42pt;font-weight:700;color:#8f3f17;margin:1mm auto;padding:0 10mm 1mm;border-bottom:.4mm solid #c8642c;display:inline-block;min-width:120mm;}
#overlayFiche .d-pour{font-size:12.5pt;font-style:italic;color:#4a4a4a;margin-top:2mm;}
#overlayFiche .d-points{font-size:14pt;color:#6b4a2e;margin-top:2mm;}
#overlayFiche .d-points b{font-size:20pt;color:#8f3f17;font-family:"Cinzel",Georgia,serif;}
#overlayFiche .d-mention{font-size:18pt;font-weight:700;color:#1d4f7a;margin-top:3mm;letter-spacing:.03em;}
#overlayFiche .d-meds{display:flex;gap:2.5mm;justify-content:center;flex-wrap:wrap;}
#overlayFiche .d-med{border:.4mm solid #d9c08a;border-radius:3mm;padding:2.5mm 3mm;min-width:28mm;text-align:center;background:rgba(255,255,255,.6);}
#overlayFiche .d-med.complete{border-color:#1b130e;background:#f4c9a6;}
#overlayFiche .d-med-nom{font-size:9pt;color:#6b4a2e;text-transform:uppercase;letter-spacing:.04em;}
#overlayFiche .d-med-pts{font-size:15pt;font-weight:700;color:#8f3f17;}
#overlayFiche .d-bas{display:flex;justify-content:space-between;align-items:flex-end;width:100%;padding:0 6mm 6mm;font-size:12pt;}
#overlayFiche .d-signature{min-width:70mm;border-top:.3mm solid #1b130e;padding-top:1mm;text-align:center;margin-top:10mm;color:#4a4a4a;}
body.fiche-ouverte{overflow:hidden;}
@media print{
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body.fiche-ouverte{height:auto !important;min-height:0 !important;display:block !important;background:#fff !important;}
  body.fiche-ouverte > :not(#overlayFiche){display:none !important;}
  #overlayFiche{position:static;background:#fff;padding:0;display:block !important;overflow:visible;}
  #ficheCarte{box-shadow:none;width:100%;border-radius:0;padding:0;}
  #btnFermerFiche,#overlayFiche .fiche-actions,#overlayFiche .note-impression{display:none !important;}
  #overlayFiche .diplome{transform:none !important;margin:0 auto !important;break-inside:avoid;}
}`;
function ouvrirOverlay(contenu) {
  let ov = $("overlayFiche");
  if (!ov) {
    const st = document.createElement("style");
    const m = getComputedStyle(document.documentElement).getPropertyValue("--meandre").replace("%23c8642c", "%231b130e");
    st.textContent = FICHE_CSS.replace(/var\(--meandre-d\)/g, m) + "@media print{@page{size:A4 landscape;margin:10mm;}}";
    document.head.append(st);
    ov = document.createElement("div"); ov.id = "overlayFiche";
    ov.addEventListener("click", e => { if (e.target === ov) fermerOverlay(); });
    document.body.append(ov);
  }
  ov.innerHTML = `<div id="ficheCarte">
    <button id="btnFermerFiche" type="button" aria-label="Fermer">×</button>
    <div class="fiche-actions"><button type="button" id="btnImprimerFiche">🖨️ Imprimer / Enregistrer en PDF</button></div>
    <p class="note-impression">💡 Dans la fenêtre d'impression, décoche <strong>« En-têtes et pieds de page »</strong>.</p>
    ${contenu}
  </div>`;
  $("btnFermerFiche").onclick = fermerOverlay;
  $("btnImprimerFiche").onclick = () => window.print();
  ov.classList.add("ouverte");
  document.body.classList.add("fiche-ouverte");
  return ov;
}
function fermerOverlay() { const ov = $("overlayFiche"); if (ov) ov.classList.remove("ouverte"); document.body.classList.remove("fiche-ouverte"); }
function ouvrirDiplome() {
  if (!eleve.nom) { document.body.classList.add("sans-nom"); return; }
  const n = eleve.record, date = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });
  const medailles = NIVEAUX.map((niveau, k) => `<div class="d-med${n > k ? " complete" : ""}"><div class="d-med-nom">${niveau.court || niveau.nom}</div><div class="d-med-pts">${n > k ? "✓" : "—"}</div></div>`).join("");
  const Q = eleve.meilleur || parcours;
  const taux = Q.reponses ? Math.round(100 * Q.bonnes / Q.reponses) : 0;
  const ov = ouvrirOverlay(`<div class="diplome"><div class="d-cadre">
    <div class="d-frise haut"></div><div class="d-frise bas"></div>
    <img class="d-athena" src="images/anubis-tete.png" alt="">
    <div class="d-sceau g">☥</div><div class="d-sceau d" style="background:#1b130e var(--sceau-anubis) center/cover"></div>
    <div class="d-titre">Diplôme</div>
    <div class="d-sous">du voyage en Égypte · <b>Le crapaud et l'ibis</b></div>
    <div class="d-texte">
      <div class="d-decerne">Ce diplôme est décerné à</div>
      <div class="d-nom">${esc(eleve.nom)}</div>
      <div class="d-pour">pour avoir guidé le crapaud d'or le long du Nil, au pays des pharaons.</div>
      <div class="d-pour"><b>${Q.reponses}</b> réponse${Q.reponses > 1 ? "s" : ""}, dont <b>${Q.bonnes}</b> juste${Q.bonnes > 1 ? "s" : ""}${Q.reponses ? ` (${taux} %)` : ""} · <b>${n}</b> plateau${n > 1 ? "x" : ""} franchi${n > 1 ? "s" : ""} sur ${NIVEAUX.length}.</div>
      <div class="d-points">Points : <b>${Q.points}</b></div>
      <div class="d-mention">${["Continue tes efforts", "Bien", "Très bien", "Félicitations !"][Math.round(3 * n / NIVEAUX.length)]}</div>
    </div>
    <div class="d-meds">${medailles}</div>
    <div class="d-bas"><div>Fait le ${date}</div><div class="d-signature">Signature du professeur</div></div>
  </div></div>`);
  const d = ov.querySelector(".diplome"), carte = getComputedStyle(d.parentElement);
  const place = d.parentElement.clientWidth - parseFloat(carte.paddingLeft) - parseFloat(carte.paddingRight);
  const r = d.getBoundingClientRect(), e = Math.min(1, place / r.width);
  d.style.transform = "scale(" + e + ")";
  d.style.marginBottom = -(1 - e) * r.height + "px";
  d.style.marginRight = -(1 - e) * r.width + "px";
}
$("btnDiplome").onclick = ouvrirDiplome;
$("btnOnglet").onclick = () => { const url = new URL(location.href); if (eleve.nom) url.searchParams.set("nom", eleve.nom); window.open(url.toString(), "_blank"); };

// ---------- Démarrage ----------
const params = new URLSearchParams(location.search);
if (params.has("test")) document.body.classList.add("mode-test");
chargerNiveau(0);
if (params.get("nom")) choisirEleve(params.get("nom"));
if (!eleve.nom) { document.body.classList.add("sans-nom"); setTimeout(() => $("champNom").focus(), 0); }
requestAnimationFrame(boucle);
