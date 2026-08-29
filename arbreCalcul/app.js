// app.js — Calcule l'arbre
//
// Variante inversée de compteEstBonSimple : ici l'arbre de calcul (jetons +
// opérations, y compris − et ÷) est entièrement DONNÉ et affiché en lecture
// seule ; l'élève doit trouver le résultat final et le taper dans un champ
// texte, sous n'importe quelle écriture reconnue par le moteur Nombre
// (entière, décimale, fractionnaire, mixte). Deux cas à la validation :
//   - valeur fausse : erreur classique (compte comme une faute en quiz).
//   - valeur juste mais pas en écriture décimale : on le signale et on laisse
//     l'élève retaper, sans compter de faute ni changer de question (voir
//     validerReponse ci-dessous).

// ==================== CONFIGURATION ====================
const NB_QUESTIONS = 10;

const MODES = {
  2: { jetons: 3, label: "2 " },
  3: { jetons: 4, label: "3 " },
  4: { jetons: 5, label: "4 " },
};

const OP_SYMBOLES = { "+": "+", "-": "−", "*": "×", ":": "÷" };
const NB_EXERCICES_FICHE = 10;

// ==================== ÉTAT ====================
let etatJeu = "atelier";        // 'atelier' | 'quiz'
let modeActuel = 2;             // clé de MODES : nombre d'opérations
let niveauActuel = "simple";    // clé de NIVEAUX_JETONS_ARBRE : plage des jetons
// 'parenthese' : chaque opération est explicitement parenthésée, sans jamais
// s'appuyer sur les priorités opératoires (+/− avant ×/÷ pas encore au
// programme en sixième). 'priorites' : parenthésage minimal usuel.
let modeEcriture = "parenthese";
// 'sans' : chaque soustraction (donc aussi le résultat final) reste
// strictement positive, comme dans compteEstBonSimple — les nombres
// relatifs ne sont pas encore au programme en sixième. 'avec' : les
// résultats intermédiaires et finaux peuvent être négatifs. Contrairement à
// modeEcriture, ceci contraint la GÉNÉRATION (voir Arbre.js) : change de
// valeur ⇒ nouvel arbre (relancer()).
let modeRelatifs = "sans";
// 'sans' : une division ne peut laisser qu'un résultat à écriture décimale
// exacte (Nombre.isDecimal()) à chaque nœud — comme pour modeRelatifs, ceci
// contraint la GÉNÉRATION (voir Arbre.js) : change de valeur ⇒ nouvel arbre
// (relancer()). 'avec' : une division peut légitimement laisser une vraie
// fraction (ex: 10÷3) ; la réponse finale n'est alors plus tenue à
// l'écriture décimale mais à l'écriture "canonique" (décimale si possible,
// sinon fraction simplifiée — voir traiterReponseFinale).
let modeFraction = "sans";
// Deux bascules INDÉPENDANTES (pas un choix exclusif) : chacune peut être
// active ou non, les deux peuvent l'être en même temps, mais jamais aucune
// des deux — voir construireBoutonsAffichage, qui refuse le clic qui
// désactiverait la dernière restante.
let voirArbre = true;
let voirExpression = false;
// 'sans' (défaut) : l'arbre reste en lecture seule. 'avec' : cliquer sur une
// opération dont les deux branches sont déjà des feuilles (jeton ou valeur
// déjà calculée) propose de la remplacer par son résultat — voir
// rendreArbre/ouvrirPopupCalcul. Affichage seulement, pas de génération :
// pas besoin de relancer() en changeant de valeur.
let modeCalculArbre = "sans";
let noeudPopupOuvert = null; // référence directe au nœud dont le popup "Calculer" est ouvert

let questionIndex = 0;
let score = 0;
let game = null;
let phase = "saisie"; // 'saisie' | 'next' | 'fin'
let ligneCourante = null; // la LigneEtape actuellement ouverte (input non encore validé)
let estPremiereLigne = true; // vrai tant qu'aucune capsule de réponse n'a encore été figée sur cette question
let expressionPersoOuvert = false; // replié par défaut : le menu "Exercice personnalisé" ne montre le champ qu'une fois déplié

// latexOp est partagé par toutes les conversions vers LaTeX de ce fichier :
// l'arbre donné (arbreVersLatex), les étapes tapées par l'élève
// (expressionEtapeVersLatex), et la fiche papier / l'export .tex
// (arbreVersLatexPourFiche).
function latexOp(op) {
  return op === "*" ? "\\times " : op === ":" ? "\\div " : op;
}

// Écriture LaTeX de l'arbre DONNÉ (feuilles = jetons, nœuds = 'op'),
// respectant modeEcriture — affichée en tête de la zone de réponse (voir
// capsuleEnonce), au-dessus de la première capsule de saisie.
function arbreVersLatex(noeud, prioriteParent = 0, estEnTete = true) {
  if (noeud.type === "jeton") {
    return noeud.nombre.toLatex({ nombreAff: "entier" });
  }
  // Nœud déjà calculé via le mode CalculArbre (voir ouvrirPopupCalcul) : une
  // feuille comme les autres, mais dont la valeur n'est pas forcément un
  // entier — d'où 'canonique' plutôt que 'entier'.
  if (noeud.type === "valeur") {
    return noeud.nombre.toLatex({ nombreAff: "canonique" });
  }

  if (modeEcriture === "parenthese") {
    const txtGauche = arbreVersLatex(noeud.gauche, 0, false);
    const txtDroite = arbreVersLatex(noeud.droite, 0, false);
    const txt = `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
    return estEnTete ? txt : `(${txt})`;
  }

  const prio = (noeud.op === "*" || noeud.op === ":") ? 2 : 1;
  const txtGauche = arbreVersLatex(noeud.gauche, prio, estEnTete);
  const txtDroite = arbreVersLatex(noeud.droite, prio + 1, false);
  const txt = `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
  return prioriteParent > prio ? `(${txt})` : txt;
}

// Écriture LaTeX de l'arbre issu du parseur d'ÉTAPE (feuilles = 'NUM'
// avec un Nombre déjà évalué, nœuds = 'op') — c'est la structure que
// construireArbreExpressionEtape produit à partir du texte tapé par
// l'élève.
function expressionEtapeVersLatex(noeud, prioriteParent = 0, estEnTete = true) {
  if (noeud.type === "NUM") {
    return noeud.nombre.toLatex({ nombreAff: "entier" });
  }

  if (modeEcriture === "parenthese") {
    const txtGauche = expressionEtapeVersLatex(noeud.gauche, 0, false);
    const txtDroite = expressionEtapeVersLatex(noeud.droite, 0, false);
    const txt = `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
    return estEnTete ? txt : `(${txt})`;
  }

  const prio = (noeud.op === "*" || noeud.op === ":") ? 2 : 1;
  const txtGauche = expressionEtapeVersLatex(noeud.gauche, prio, estEnTete);
  const txtDroite = expressionEtapeVersLatex(noeud.droite, prio + 1, false);
  const txt = `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
  return prioriteParent > prio ? `(${txt})` : txt;
}

// ==================== CALCUL ÉTAPE PAR ÉTAPE ====================
// La réponse ne se limite pas au résultat final : l'élève peut taper une
// expression intermédiaire (ex. "6+2×3" puis "6+6") pour montrer son calcul.
// Chaque étape est comparée à la cible (game.cible), pas à l'étape
// précédente — c'est ce qui définit "ça colle" : l'étape doit rester égale
// au résultat de l'arbre, comme dans une vraie suite d'égalités
// "E = E1 = E2 = ... = résultat". Tokenizer + parser minimal, indépendant du
// parseur littéral de Nombre (qui ne gère pas les opérateurs) — toute
// l'arithmétique reste déléguée à Nombre.add/sub/mul/div.
function tokeniserExpressionEtape(expr) {
  const tokens = [];
  let i = 0;
  const n = expr.length;

  while (i < n) {
    const c = expr[i];

    if (c === "(" || c === ")") {
      tokens.push({ type: c === "(" ? "LPAREN" : "RPAREN" });
      i++;
      continue;
    }

    // Alias acceptés en plus des symboles ASCII "+-*:" (convention interne
    // du projet, voir OP_SYMBOLES) : "/" et "÷" pour la division, "×" pour
    // la multiplication, "−" (moins Unicode) pour la soustraction — utile
    // dès qu'un élève copie un symbole affiché ailleurs dans l'appli
    // plutôt que de taper au clavier.
    const ALIAS_OP = { "/": ":", "÷": ":", "×": "*", "−": "-" };
    const cOp = ALIAS_OP[c] || c;
    if ("+-*:".includes(cOp)) {
      const precedent = tokens[tokens.length - 1];
      const estDebutOperande = !precedent || precedent.type === "LPAREN" || precedent.type === "OP";

      if (cOp === "-" && estDebutOperande) {
        if (precedent && precedent.type === "OP") return { erreur: "signe_apres_operateur" };
        let j = i + 1;
        if (j < n && /\d/.test(expr[j])) {
          let num = "-";
          let vuSeparateur = false;
          while (j < n && (/\d/.test(expr[j]) || (!vuSeparateur && (expr[j] === "." || expr[j] === ",")))) {
            if (expr[j] === "." || expr[j] === ",") vuSeparateur = true;
            num += expr[j];
            j++;
          }
          tokens.push({ type: "NUM", value: num });
          i = j;
          continue;
        }
        return { erreur: "signe_sans_chiffre" };
      }

      if (precedent && precedent.type === "OP") return { erreur: "deux_operateurs_consecutifs" };
      tokens.push({ type: "OP", value: cOp });
      i++;
      continue;
    }

    if (/\d/.test(c) || c === "." || c === ",") {
      let num = "";
      let j = i;
      let vuSeparateur = false;
      while (j < n && (/\d/.test(expr[j]) || (!vuSeparateur && (expr[j] === "." || expr[j] === ",")))) {
        if (expr[j] === "." || expr[j] === ",") vuSeparateur = true;
        num += expr[j];
        j++;
      }
      tokens.push({ type: "NUM", value: num });
      i = j;
      continue;
    }

    return { erreur: "caractere_invalide" };
  }

  return { tokens };
}

function construireArbreExpressionEtape(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const avance = () => tokens[pos++];

  function parseAdditif() {
    let gauche = parseMultiplicatif();
    if (gauche.erreur) return gauche;
    while (peek() && peek().type === "OP" && (peek().value === "+" || peek().value === "-")) {
      const op = avance().value;
      const droite = parseMultiplicatif();
      if (droite.erreur) return droite;
      gauche = { type: "op", op, gauche, droite };
    }
    return gauche;
  }

  function parseMultiplicatif() {
    let gauche = parseFacteur();
    if (gauche.erreur) return gauche;
    while (peek() && peek().type === "OP" && (peek().value === "*" || peek().value === ":")) {
      const op = avance().value;
      const droite = parseFacteur();
      if (droite.erreur) return droite;
      gauche = { type: "op", op, gauche, droite };
    }
    return gauche;
  }

  function parseFacteur() {
    const t = peek();
    if (!t) return { erreur: "expression_incomplete" };
    if (t.type === "NUM") {
      avance();
      let nombre;
      try { nombre = new Nombre(t.value); } catch (e) { return { erreur: "nombre_invalide" }; }
      return { type: "NUM", nombre };
    }
    if (t.type === "LPAREN") {
      avance();
      const inner = parseAdditif();
      if (inner.erreur) return inner;
      if (!peek() || peek().type !== "RPAREN") return { erreur: "parenthese_fermante_manquante" };
      avance();
      return inner;
    }
    return { erreur: "facteur_attendu" };
  }

  const arbre = parseAdditif();
  if (arbre.erreur) return arbre;
  if (pos !== tokens.length) return { erreur: "tokens_restants" };
  return { arbre };
}

function evaluerExpressionEtape(noeud) {
  if (noeud.type === "NUM") return noeud.nombre;
  const g = evaluerExpressionEtape(noeud.gauche);
  if (!g) return null;
  const d = evaluerExpressionEtape(noeud.droite);
  if (!d) return null;
  switch (noeud.op) {
    case "+": return g.add(d);
    case "-": return g.sub(d);
    case "*": return g.mul(d);
    case ":": return d.valeurNum.a === 0 ? null : g.div(d);
  }
}

// Analyse un texte tapé par l'élève comme une étape de calcul : renvoie
// {nombre, estAtomique} si évaluable, ou {erreur, detail} sinon.
// estAtomique = true pour un nombre isolé écrit dans une des notations de
// Nombre (entier, décimal, fraction "3/2", mixte, pourcentage) — testé EN
// PREMIER pour que ces écritures restent reconnues telles quelles (une
// fraction isolée doit déclencher le message "pas en écriture décimale" de
// traiterReponseFinale, pas être lue comme une division-étape). Seul un
// texte que Nombre ne sait pas lire directement retombe sur le parseur
// d'expression composée ci-dessus (+ − × ÷, parenthèses).
function analyserEtapeReponse(texte) {
  try {
    return { nombre: new Nombre(texte), estAtomique: true };
  } catch (e) { /* pas une écriture Nombre isolée : peut-être une expression composée */ }

  const lex = tokeniserExpressionEtape(texte);
  if (lex.erreur) {
    return { erreur: true, detail: "Cette expression n'est pas reconnue. Utilise + − × ÷ et des parenthèses si besoin." };
  }
  const parsed = construireArbreExpressionEtape(lex.tokens);
  if (parsed.erreur) {
    return { erreur: true, detail: "Cette expression n'est pas reconnue. Utilise + − × ÷ et des parenthèses si besoin." };
  }
  const nombre = evaluerExpressionEtape(parsed.arbre);
  if (!nombre) {
    return { erreur: true, detail: "Cette expression contient une division par zéro." };
  }
  return { nombre, estAtomique: parsed.arbre.type === "NUM", arbre: parsed.arbre };
}

// ==================== RÉFÉRENCES DOM ====================
const consigneWrap = document.getElementById("consigne-wrap");
const consigneLabel = document.getElementById("consigne-label");
const reponseLabel = document.getElementById("reponse-label");
const zoneReponseArbre = document.getElementById("zoneReponseArbre");
const arbreWrap = document.getElementById("arbre-wrap");
const arbreInner = document.getElementById("arbre-inner");
const arbreSvg = document.getElementById("arbre-svg");
const arbreNoeuds = document.getElementById("arbre-noeuds");
const arbrePopup = document.getElementById("arbre-popup");
const panelReponse = document.getElementById("panelReponse");
const etapesContainer = document.getElementById("etapesContainer");
const btnNext = document.getElementById("btnNext");
const message = document.getElementById("message");
const panel = document.getElementById("panel");
const zoneFin = document.getElementById("zoneFin");
const ecranFin = document.getElementById("ecranFin");

// ==================== BANDEAU SCORE (panneau latéral) ====================
function majBandeau() {
  if (etatJeu !== "quiz") return;
  const progressElem = document.getElementById("question-progress");
  if (progressElem) progressElem.textContent = `Question ${questionIndex}/${NB_QUESTIONS}`;
  const scoreElem = document.getElementById("score");
  if (scoreElem) scoreElem.textContent = `Score : ${score}/${Math.max(0, questionIndex - (phase === "saisie" ? 1 : 0))}`;
}

// ==================== MESSAGE ====================
function definirMessage(html, type) {
  message.innerHTML = html;
  message.className = type || "";
}

// ==================== GÉNÉRATION ====================
function genererQuestion() {
  const nbJetons = MODES[modeActuel].jetons;
  const d = tirerArbreEtCible(nbJetons, niveauActuel, modeRelatifs === "avec", modeFraction === "avec");
  if (!d) throw new Error("Aucun arbre trouvé pour ce mode (" + nbJetons + " jetons)");
  return d;
}

// ==================== RENDU DE L'ARBRE (lecture seule, ou calculable
// nœud par nœud si modeCalculArbre === "avec") ====================
const NODE_H = 48, X_SPACING = 110, Y_SPACING = 92, PADDING = 60;

function layoutArbre(racine) {
  let feuilleIndex = 0;
  let profondeurMax = 0;

  function assigner(noeud, profondeur) {
    noeud._depth = profondeur;
    profondeurMax = Math.max(profondeurMax, profondeur);
    if (noeud.type === "op") {
      assigner(noeud.gauche, profondeur + 1);
      assigner(noeud.droite, profondeur + 1);
      noeud._x = (noeud.gauche._x + noeud.droite._x) / 2;
    } else {
      noeud._x = feuilleIndex;
      feuilleIndex++;
    }
  }
  assigner(racine, 0);

  function versPixels(noeud) {
    noeud.px = noeud._x * X_SPACING + PADDING;
    noeud.py = noeud._depth * Y_SPACING + PADDING;
    if (noeud.type === "op") {
      versPixels(noeud.gauche);
      versPixels(noeud.droite);
    }
  }
  versPixels(racine);

  const largeur = Math.max(feuilleIndex - 1, 0) * X_SPACING + 2 * PADDING;
  const hauteur = profondeurMax * Y_SPACING + 2 * PADDING + NODE_H;
  return { largeur, hauteur };
}

function libelleNoeud(noeud) {
  if (noeud.type === "jeton") return String(game.jetons[noeud.jetonIndex]);
  if (noeud.type === "valeur") return noeud.nombre.toString({ nombreAff: "canonique" });
  return OP_SYMBOLES[noeud.op];
}

// Une feuille au sens du mode CalculArbre : un jeton donné au départ, ou une
// opération déjà remplacée par son résultat (voir ouvrirPopupCalcul) — dans
// les deux cas, plus rien à calculer en dessous.
function estAtomique(noeud) {
  return noeud.type === "jeton" || noeud.type === "valeur";
}

function rendreArbre() {
  const { largeur, hauteur } = layoutArbre(game.arbre);
  arbreInner.style.width = largeur + "px";
  arbreInner.style.height = hauteur + "px";
  arbreSvg.setAttribute("width", largeur);
  arbreSvg.setAttribute("height", hauteur);
  arbreSvg.innerHTML = "";
  arbreNoeuds.innerHTML = "";

  function dessiner(noeud) {
    if (noeud.type === "op") {
      [noeud.gauche, noeud.droite].forEach(enfant => {
        const ligne = document.createElementNS("http://www.w3.org/2000/svg", "line");
        ligne.setAttribute("x1", noeud.px);
        ligne.setAttribute("y1", noeud.py + NODE_H);
        ligne.setAttribute("x2", enfant.px);
        ligne.setAttribute("y2", enfant.py);
        ligne.setAttribute("class", "arbre-trait");
        arbreSvg.appendChild(ligne);
      });
    }

    const div = document.createElement("div");
    div.className = "arbre-noeud " + noeud.type;
    div.style.left = noeud.px + "px";
    div.style.top = noeud.py + "px";
    div.textContent = libelleNoeud(noeud);

    const calculable = modeCalculArbre === "avec" && noeud.type === "op" &&
      estAtomique(noeud.gauche) && estAtomique(noeud.droite);
    if (calculable) {
      div.classList.add("calculable");
      if (noeud === noeudPopupOuvert) div.classList.add("selectionne");
      div.addEventListener("click", e => {
        e.stopPropagation();
        ouvrirPopupCalcul(noeud, div);
      });
    }

    arbreNoeuds.appendChild(div);

    if (noeud.type === "op") {
      dessiner(noeud.gauche);
      dessiner(noeud.droite);
    }
  }
  dessiner(game.arbre);

  if (noeudPopupOuvert) positionnerPopupCalcul();
}

// Ouvre le petit menu "Calculer" sous le nœud cliqué (une opération dont les
// deux branches sont déjà des feuilles).
function ouvrirPopupCalcul(noeud, div) {
  noeudPopupOuvert = noeud;
  rendreArbre();

  arbrePopup.innerHTML = "";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "popup-calculer-btn";
  btn.textContent = "Calculer";
  btn.onclick = () => {
    // noeud.nombre est déjà connu depuis la génération de l'arbre (voir
    // Arbre.js) : "calculer" ne fait que révéler ce résultat et remplacer
    // le nœud par une feuille, sans rien recalculer.
    noeud.type = "valeur";
    delete noeud.op;
    delete noeud.gauche;
    delete noeud.droite;
    fermerPopupCalcul();
    rendreArbre();
    if (voirExpression) synchroniserEnonce();
  };
  arbrePopup.appendChild(btn);
  arbrePopup.classList.add("visible");
  positionnerPopupCalcul();
}

function positionnerPopupCalcul() {
  const div = [...arbreNoeuds.children].find(d => d.classList.contains("selectionne"));
  if (!div) return;
  const rect = div.getBoundingClientRect();
  const rectZone = arbreWrap.getBoundingClientRect();
  arbrePopup.style.left = (rect.left - rectZone.left + arbreWrap.scrollLeft) + "px";
  arbrePopup.style.top = (rect.bottom - rectZone.top + arbreWrap.scrollTop + 8) + "px";
}

function fermerPopupCalcul() {
  noeudPopupOuvert = null;
  arbrePopup.classList.remove("visible");
  arbrePopup.innerHTML = "";
}

arbreWrap.addEventListener("click", () => {
  if (noeudPopupOuvert) {
    fermerPopupCalcul();
    rendreArbre();
  }
});

// L'expression n'est montrée (capsule d'énoncé) que si l'affichage choisi
// l'inclut — sinon c'est l'arbre visuel seul qui fait office d'énoncé, à
// droite.
function afficheExpression() {
  return voirExpression;
}

// Écriture exigée pour la réponse finale (voir Nombre.isFormat) : 'dec'
// (entier ou décimal) sans fraction, ou 'canonique' (entier, décimal, ou
// fraction/mixte déjà simplifiée) avec fraction — puisqu'alors la cible peut
// tout à fait ne pas avoir d'écriture décimale exacte.
function formatFinalRequis() {
  return modeFraction === "avec" ? "canonique" : "dec";
}

// Affiche l'arbre à droite selon voirArbre — sans jamais régénérer la
// question (c'est juste une autre vue du même arbre donné). L'expression,
// elle, ne vit plus qu'à un seul endroit : la capsule d'énoncé à gauche (voir
// synchroniserEnonce) — jamais dupliquée dans la colonne de droite.
function appliquerModeAffichage() {
  zoneReponseArbre.style.display = voirArbre ? "flex" : "none";

  // Une fois l'expression donnée en toutes lettres (capsule d'énoncé), "Ta
  // réponse" au-dessus du champ devient superflu — l'énoncé qui la précède
  // suffit à situer ce qu'on tape.
  consigneLabel.textContent = afficheExpression() ? "Calcule l'expression" : "Calcule l'arbre";
  reponseLabel.style.display = afficheExpression() ? "none" : "";
}

// Capsule de tête, en lecture seule : l'arbre donné écrit en expression,
// dans la même forme visuelle que les capsules d'étape mais sans "=" (rien
// à comparer, c'est l'énoncé lui-même) — voir InputWrapper(isQuestion=true)
// dans calculPrioritaire/app.js.
function capsuleEnonce(container) {
  const wrapper = document.createElement("div");
  wrapper.className = "capsule-etape capsule-enonce";

  const symbole = document.createElement("span");
  symbole.className = "capsule-symbole";

  const zone = document.createElement("div");
  zone.className = "capsule-saisie";
  zone.innerHTML = `<div class="capsule-figee">\\(${arbreVersLatex(game.arbre, 0, true)}\\)</div>`;

  wrapper.append(symbole, zone);
  container.appendChild(wrapper);
  MathJax.typesetPromise([zone]);
}

// Ajoute, retire ou réécrit (modeEcriture a changé) la capsule d'énoncé en
// tête de etapesContainer, selon afficheExpression() — appelé à la création
// de la question et à chaque bascule Affichage/Écriture. Si la toute
// première capsule de réponse est encore ouverte (rien figé avant elle), son
// symbole "=" n'a de sens que s'il y a désormais une capsule d'énoncé à
// comparer : on l'ajuste en direct.
function synchroniserEnonce() {
  const existante = etapesContainer.querySelector(".capsule-enonce");
  if (existante) existante.remove();
  if (afficheExpression()) {
    capsuleEnonce(etapesContainer);
    etapesContainer.prepend(etapesContainer.lastElementChild);
  }
  if (estPremiereLigne && ligneCourante) {
    ligneCourante.symbole.textContent = afficheExpression() ? "=" : "";
  }
}

// ==================== CAPSULE DE SAISIE (une par étape tapée) ====================
// Chaque étape tapée obtient sa PROPRE capsule, qui reste visible une fois
// figée (LaTeX, lecture seule) — pas un unique champ réutilisé. Juste ou
// fausse, une capsule figée ouvre TOUJOURS une nouvelle capsule vierge en
// dessous : rien ne bloque jamais la progression, sauf la réussite finale
// (résultat atomique, égal à la cible, en écriture décimale) ou l'abandon
// ("Je renonce"). Voir appli-maths/calculPrioritaire/app.js (InputWrapper),
// dont ce mécanisme reprend le fonctionnement.
class LigneEtape {
  // symboleInitial : "=" par défaut, sauf pour la toute première capsule de
  // la question quand aucune capsule d'énoncé ne la précède (rien à
  // "continuer") — voir synchroniserEnonce et nouvelleQuestion.
  constructor(container, symboleInitial = "=") {
    this.container = container;
    this.wrapper = document.createElement("div");
    this.wrapper.className = "capsule-etape";

    this.symbole = document.createElement("span");
    this.symbole.className = "capsule-symbole";
    this.symbole.textContent = symboleInitial;

    this.zoneSaisie = document.createElement("div");
    this.zoneSaisie.className = "capsule-saisie";

    this.feedback = document.createElement("div");
    this.feedback.className = "capsule-feedback";

    this.wrapper.append(this.symbole, this.zoneSaisie, this.feedback);
    container.appendChild(this.wrapper);

    this.input = document.createElement("input");
    this.input.type = "text";
    this.input.placeholder = "Résultat, ou une étape de calcul";
    this.input.autocomplete = "off";
    this.input.autocorrect = "off";
    this.input.autocapitalize = "off";
    this.input.spellcheck = false;
    this.zoneSaisie.appendChild(this.input);
    this.input.focus();

    this.input.addEventListener("keydown", e => {
      if (e.key !== "Enter") return;
      e.preventDefault();
      if (this.input.value.trim() !== "") this.valider();
    });
  }

  // Remplace le champ par le rendu LaTeX figé de ce qui a été tapé (ou par
  // le texte brut tel quel si ce n'était pas une expression valide) — cette
  // capsule ne redevient jamais éditable ensuite.
  figer(texte, etape) {
    this.input.remove();
    const latex = etape
      ? (etape.estAtomique ? etape.nombre.toLatex({ nombreAff: "canonique" }) : expressionEtapeVersLatex(etape.arbre))
      : null;
    this.zoneSaisie.innerHTML = `<div class="capsule-figee">\\(${latex || texte}\\)</div>`;
    MathJax.typesetPromise([this.zoneSaisie]);
  }

  marquer(etat, texte) {
    this.wrapper.classList.add(etat === "succes" ? "etape-succes" : "etape-erreur");
    this.symbole.textContent = etat === "succes" ? "=" : "≠";
    this.feedback.innerHTML = `<span>${texte}</span>`;

    const btnSuppr = document.createElement("button");
    btnSuppr.type = "button";
    btnSuppr.className = "capsule-suppr";
    btnSuppr.textContent = "×";
    btnSuppr.setAttribute("aria-label", "Retirer cette étape");
    btnSuppr.onclick = () => this.wrapper.remove();
    this.feedback.appendChild(btnSuppr);
  }

  valider() {
    // Dès qu'une capsule est figée, la suivante a toujours quelque chose à
    // "continuer" au-dessus d'elle (celle-ci) : son "=" initial redevient
    // pertinent, qu'il y ait ou non une capsule d'énoncé.
    estPremiereLigne = false;

    // Un élève qui recopie l'habitude papier "= ..." en tête de ligne ne
    // doit pas se le voir reproché : on l'ignore plutôt que de le traiter
    // comme un caractère invalide.
    const texte = this.input.value.trim().replace(/^=\s*/, "");
    const etape = analyserEtapeReponse(texte);

    if (etape.erreur) {
      this.figer(texte, null);
      this.marquer("erreur", etape.detail);
      ligneCourante = new LigneEtape(this.container);
      return;
    }

    this.figer(texte, etape);

    if (!etape.nombre.equal(game.cible)) {
      this.marquer("erreur", "Ce n'est pas le bon résultat.");
      ligneCourante = new LigneEtape(this.container);
      return;
    }

    if (!etape.estAtomique) {
      this.marquer("succes", "Continue le calcul");
      ligneCourante = new LigneEtape(this.container);
      return;
    }

    if (!etape.nombre.isFormat(formatFinalRequis())) {
      this.marquer("succes", modeFraction === "avec"
        ? "Écris-le en écriture décimale, ou en fraction déjà simplifiée"
        : "Écris-le en écriture décimale");
      ligneCourante = new LigneEtape(this.container);
      return;
    }

    this.marquer("succes", "Bravo, c'est exact !");
    ligneCourante = null;
    if (etatJeu === "quiz") score++;
    finQuestion();
    majBandeau();
    renderPanneauLateral();
  }
}

// ==================== DÉROULÉ DU JEU ====================
function finQuestion() {
  phase = "next";
  if (ligneCourante) ligneCourante.input.disabled = true;
  const skipBtn = document.getElementById("skipButton");

  if (etatJeu === "quiz") {
    btnNext.style.display = "inline-flex";
    if (skipBtn) skipBtn.disabled = true;
  } else {
    // Atelier : pas de bouton "Question suivante" séparé — c'est "Je
    // renonce" lui-même qui fait avancer vers un nouvel arbre.
    btnNext.style.display = "none";
    if (skipBtn) skipBtn.disabled = false;
  }
}

// En quiz : abandon volontaire, compte comme une réponse fausse (sans
// pénalité), puis attend "Question suivante".
// En atelier : ce même bouton "Je renonce" sert juste à passer directement à
// un nouvel arbre, à tout moment.
function renoncer() {
  if (etatJeu === "atelier") {
    nouvelleQuestion();
    return;
  }

  if (phase !== "saisie") return;

  finQuestion();

  definirMessage("Pas de souci, on passe à la suite. 🙂", "erreur");

  majBandeau();
}

// Met en place {jetons, arbre, cible} comme question courante et réinitialise
// toute la zone de réponse — que cet arbre vienne du générateur aléatoire
// (nouvelleQuestion) ou d'une expression tapée par l'utilisateur
// (demarrerExercicePersonnalise).
function demarrerQuestionAvec(d) {
  game = { jetons: d.jetons, arbre: d.arbre, cible: d.cible };

  phase = "saisie";
  majBandeau();

  definirMessage("", "");

  fermerPopupCalcul();
  rendreArbre();
  appliquerModeAffichage();

  etapesContainer.innerHTML = "";
  estPremiereLigne = true;
  ligneCourante = new LigneEtape(etapesContainer, afficheExpression() ? "=" : "");
  synchroniserEnonce();

  btnNext.style.display = "none";
  renderPanneauLateral();
}

function nouvelleQuestion() {
  if (etatJeu === "quiz" && questionIndex >= NB_QUESTIONS) {
    afficherFin();
    return;
  }

  questionIndex++;
  demarrerQuestionAvec(genererQuestion());
}

// ==================== EXERCICE PERSONNALISÉ ====================
// Convertit l'arbre issu du parseur d'ÉTAPE (feuilles 'NUM' portant un
// Nombre déjà évalué) vers la forme de l'arbre DONNÉ (feuilles 'jeton'
// indexant game.jetons) — c'est cette dernière forme qu'attendent
// rendreArbre/arbreVersLatex. jetons est rempli dans l'ordre de lecture
// gauche→droite des feuilles.
function construireArbreDepuisEtape(noeud, jetons) {
  if (noeud.type === "NUM") {
    const jetonIndex = jetons.length;
    jetons.push(noeud.nombre.valeurNum.a);
    // .nombre est requis par arbreVersLatex (comme pour les feuilles
    // générées aléatoirement dans Arbre.js) — l'oublier ici fait planter le
    // rendu de la capsule d'énoncé dès qu'elle essaie de lire une feuille.
    return { type: "jeton", jetonIndex, nombre: noeud.nombre };
  }
  return {
    type: "op",
    op: noeud.op,
    gauche: construireArbreDepuisEtape(noeud.gauche, jetons),
    droite: construireArbreDepuisEtape(noeud.droite, jetons),
  };
}

// Comme les jetons générés aléatoirement (voir Arbre.js), les feuilles d'un
// arbre personnalisé doivent être des entiers strictement positifs — sans
// quoi rendreArbre afficherait des feuilles fractionnaires/négatives que
// rien dans l'interface n'a jamais prévu de montrer proprement.
function feuillesEntieresPositives(noeud) {
  if (noeud.type === "NUM") {
    const { a, b } = noeud.nombre.valeurNum;
    return b === 1 && a > 0;
  }
  return feuillesEntieresPositives(noeud.gauche) && feuillesEntieresPositives(noeud.droite);
}

// Analyse le texte tapé par l'utilisateur comme un arbre de calcul complet
// (pas une étape isolée) : renvoie {jetons, arbre, cible} — la même forme
// que tirerArbreEtCible — ou {erreur}.
function construireExercicePersonnalise(texte) {
  const lex = tokeniserExpressionEtape(texte.trim());
  if (lex.erreur) {
    return { erreur: "Cette expression n'est pas reconnue. Utilise + − × ÷ et des parenthèses si besoin." };
  }
  const parsed = construireArbreExpressionEtape(lex.tokens);
  if (parsed.erreur) {
    return { erreur: "Cette expression n'est pas reconnue. Utilise + − × ÷ et des parenthèses si besoin." };
  }
  if (parsed.arbre.type === "NUM") {
    return { erreur: "Il faut au moins une opération : un nombre seul n'est pas un exercice." };
  }
  if (!feuillesEntieresPositives(parsed.arbre)) {
    return { erreur: "N'utilise que des nombres entiers strictement positifs comme feuilles (les opérations, elles, peuvent donner un résultat négatif ou décimal)." };
  }

  const cible = evaluerExpressionEtape(parsed.arbre);
  if (!cible) {
    return { erreur: "Cette expression contient une division par zéro." };
  }

  const jetons = [];
  const arbre = construireArbreDepuisEtape(parsed.arbre, jetons);
  return { jetons, arbre, cible };
}

// Démarre directement un exercice à partir de l'expression tapée dans le
// panneau latéral (atelier uniquement — voir renderPanneauLateral) : ne
// touche ni questionIndex ni le générateur aléatoire, c'est un exercice à
// part, hors série.
function demarrerExercicePersonnalise() {
  const input = document.getElementById("expressionPersoInput");
  const erreurDiv = document.getElementById("expressionPersoErreur");
  if (!input) return;

  const resultat = construireExercicePersonnalise(input.value);
  if (resultat.erreur) {
    if (erreurDiv) erreurDiv.textContent = resultat.erreur;
    return;
  }

  if (erreurDiv) erreurDiv.textContent = "";
  demarrerQuestionAvec(resultat);
}

function afficherFin() {
  phase = "fin";

  consigneWrap.style.display = "none";
  zoneReponseArbre.style.display = "none";
  panelReponse.style.display = "none";
  panel.style.display = "none";
  message.textContent = "";
  message.className = "";

  const pourcentage = Math.round(100 * score / NB_QUESTIONS);
  let commentaire;
  if (pourcentage === 100) commentaire = "Parfait ! Tous les arbres sont bien calculés. 🎯";
  else if (pourcentage >= 80) commentaire = "Très bon travail, tu maîtrises bien ! 👍";
  else if (pourcentage >= 60) commentaire = "C'est correct, encore un peu d'entraînement et ce sera parfait. 🙂";
  else commentaire = "Pas de souci, recommence : c'est en s'entraînant qu'on progresse. 💪";

  ecranFin.innerHTML = "";
  const titre = document.createElement("h2");
  titre.className = "fin-quiz-titre";
  titre.textContent = "Quiz terminé";

  const scoreFinalDiv = document.createElement("div");
  scoreFinalDiv.className = "fin-quiz-score";
  scoreFinalDiv.textContent = `${score} / ${NB_QUESTIONS}`;

  const commentaireDiv = document.createElement("div");
  commentaireDiv.className = "fin-quiz-commentaire";
  commentaireDiv.textContent = commentaire;

  const btnRejouer = document.createElement("button");
  btnRejouer.type = "button";
  btnRejouer.className = "restart-btn";
  btnRejouer.textContent = "Rejouer";
  btnRejouer.onclick = relancer;

  ecranFin.className = "fin-quiz";
  ecranFin.append(titre, scoreFinalDiv, commentaireDiv, btnRejouer);

  zoneFin.style.display = "flex";
  renderPanneauLateral();
}

function relancer() {
  questionIndex = 0;
  score = 0;

  consigneWrap.style.display = "flex";
  appliquerModeAffichage();
  panelReponse.style.display = "";
  panel.style.display = "flex";
  zoneFin.style.display = "none";
  ecranFin.innerHTML = "";
  ecranFin.className = "";

  renderPanneauLateral();
  nouvelleQuestion();
}

// ==================== PANNEAU LATÉRAL ====================
function construireBoutonsMode(disabled) {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";
  Object.keys(MODES).forEach(cle => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "param-btn" + (Number(cle) === modeActuel ? " active" : "");
    btn.disabled = disabled;
    btn.textContent = MODES[cle].label;
    btn.onclick = () => {
      if (Number(cle) === modeActuel) return;
      modeActuel = Number(cle);
      relancer();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

function construireBoutonsNiveau() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";
  Object.keys(NIVEAUX_JETONS_ARBRE).forEach(cle => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "param-btn" + (cle === niveauActuel ? " active" : "");
    btn.textContent = NIVEAUX_JETONS_ARBRE[cle].label;
    btn.onclick = () => {
      if (cle === niveauActuel) return;
      niveauActuel = cle;
      relancer();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

// Bascule EXCLUSIVE : n'affecte que l'écriture des arbres — la capsule
// d'énoncé (si affichée) et les étapes PAS ENCORE tapées, sur la fiche
// papier et dans l'export LaTeX (arbreVersTexte / arbreVersLatexPourFiche)
// —, jamais les valeurs elles-mêmes. Les capsules déjà figées ne sont pas
// rétroactivement reformatées (comme dans calculPrioritaire) : pas besoin de
// relancer() une nouvelle question, juste de réécrire l'énoncé donné.
function construireBoutonsEcriture() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";
  const options = [
    { valeur: "parenthese", label: "Sans" },
    { valeur: "priorites", label: "Avec" },
  ];
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "param-btn" + (modeEcriture === opt.valeur ? " active" : "");
    btn.textContent = opt.label;
    btn.onclick = () => {
      if (modeEcriture === opt.valeur) return;
      modeEcriture = opt.valeur;
      renderPanneauLateral();
      if (game) synchroniserEnonce();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

// Deux bascules INDÉPENDANTES (pas un choix exclusif) : Arbre et Expression
// peuvent être actives ensemble, mais jamais toutes les deux inactives — un
// clic qui désactiverait la dernière restante est ignoré. Change seulement
// ce qui est montré (arbre à droite, capsule d'énoncé à gauche), jamais la
// question elle-même.
function construireBoutonsAffichage() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";

  const btnArbre = document.createElement("button");
  btnArbre.type = "button";
  btnArbre.className = "param-btn" + (voirArbre ? " active" : "");
  btnArbre.textContent = "Arbre";
  btnArbre.onclick = () => {
    if (voirArbre && !voirExpression) return;
    voirArbre = !voirArbre;
    appliquerModeAffichage();
    if (game) synchroniserEnonce();
    renderPanneauLateral();
  };

  const btnExpression = document.createElement("button");
  btnExpression.type = "button";
  btnExpression.className = "param-btn" + (voirExpression ? " active" : "");
  btnExpression.textContent = "Expression";
  btnExpression.onclick = () => {
    if (voirExpression && !voirArbre) return;
    voirExpression = !voirExpression;
    appliquerModeAffichage();
    if (game) synchroniserEnonce();
    renderPanneauLateral();
  };

  conteneur.append(btnArbre, btnExpression);
  return conteneur;
}

// Bascule EXCLUSIVE : affichage/interaction seulement (voir rendreArbre),
// jamais la génération — pas besoin de relancer() en changeant de valeur.
function construireBoutonsCalculArbre() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";
  const options = [
    { valeur: "sans", label: "Sans" },
    { valeur: "avec", label: "Avec" },
  ];
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "param-btn" + (modeCalculArbre === opt.valeur ? " active" : "");
    btn.textContent = opt.label;
    btn.onclick = () => {
      if (modeCalculArbre === opt.valeur) return;
      modeCalculArbre = opt.valeur;
      fermerPopupCalcul();
      if (game) rendreArbre();
      renderPanneauLateral();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

// Deux bascules INDÉPENDANTES (comme Affichage, mais sans contrainte
// "au moins une active" : les deux peuvent être désactivées à la fois, ce
// qui correspond simplement aux entiers positifs — le cas de base). Chacune
// contraint la génération (voir Arbre.js), donc change de valeur ⇒
// relancer() une nouvelle question.
function construireBoutonsTypesNombres() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";

  const btnFraction = document.createElement("button");
  btnFraction.type = "button";
  btnFraction.className = "param-btn" + (modeFraction === "avec" ? " active" : "");
  btnFraction.textContent = "Fraction";
  btnFraction.onclick = () => {
    modeFraction = modeFraction === "avec" ? "sans" : "avec";
    relancer();
  };

  const btnRelatifs = document.createElement("button");
  btnRelatifs.type = "button";
  btnRelatifs.className = "param-btn" + (modeRelatifs === "avec" ? " active" : "");
  btnRelatifs.textContent = "Relatifs";
  btnRelatifs.onclick = () => {
    modeRelatifs = modeRelatifs === "avec" ? "sans" : "avec";
    relancer();
  };

  conteneur.append(btnFraction, btnRelatifs);
  return conteneur;
}

function renderPanneauLateral() {
  const panneau = document.getElementById("panneauLateral");
  if (!panneau) return;
  panneau.innerHTML = "";

  const ajouterFilet = () => {
    const f = document.createElement("div");
    f.className = "panel-filet";
    panneau.appendChild(f);
  };

  const ajouterGroupe = (label, contenu) => {
    const groupe = document.createElement("div");
    groupe.className = "panel-groupe";
    const lbl = document.createElement("div");
    lbl.className = "panel-groupe-label";
    lbl.textContent = label;
    groupe.appendChild(lbl);
    groupe.appendChild(contenu);
    panneau.appendChild(groupe);
  };

  if (etatJeu === "quiz") {
    const enCoursDePartie = phase !== "fin" && questionIndex >= 1 && questionIndex <= NB_QUESTIONS;

    const labelQuiz = document.createElement("div");
    labelQuiz.className = "panel-groupe-label";
    labelQuiz.textContent = "Quiz";
    panneau.appendChild(labelQuiz);

    const scoreContainer = document.createElement("div");
    scoreContainer.id = "score-container";

    const progressDiv = document.createElement("div");
    progressDiv.id = "question-progress";

    const scoreDiv = document.createElement("div");
    scoreDiv.id = "score";

    const skipBtn = document.createElement("button");
    skipBtn.id = "skipButton";
    skipBtn.className = "panel-btn";
    skipBtn.textContent = "Je renonce";
    skipBtn.disabled = !enCoursDePartie;
    skipBtn.onclick = renoncer;

    scoreContainer.append(progressDiv, scoreDiv);
    scoreContainer.appendChild(skipBtn);
    panneau.appendChild(scoreContainer);
  } else {
    const labelAtelier = document.createElement("div");
    labelAtelier.className = "panel-groupe-label";
    labelAtelier.textContent = "Entraînement libre";
    panneau.appendChild(labelAtelier);

    // Une fois la bonne réponse trouvée (phase !== 'saisie' : les étapes
    // fausses ne bloquent plus rien, voir LigneEtape), ce bouton ne
    // "renonce" plus à rien : il fait juste avancer, comme renoncer() le
    // fait déjà en atelier — seul le libellé change.
    const reponseCorrecte = phase !== "saisie";

    const skipBtn = document.createElement("button");
    skipBtn.id = "skipButton";
    skipBtn.className = "panel-btn accent";
    skipBtn.textContent = reponseCorrecte ? "Exercice suivant" : "Je renonce";
    skipBtn.disabled = false;
    skipBtn.onclick = renoncer;
    panneau.appendChild(skipBtn);
  }
  ajouterFilet();

  ajouterGroupe("Mode : nb. d'opérations", construireBoutonsMode(false));
  ajouterFilet();
  ajouterGroupe("Niveau", construireBoutonsNiveau());
  ajouterFilet();
  ajouterGroupe("Types de nombres", construireBoutonsTypesNombres());
  ajouterFilet();
  ajouterGroupe("Affichage", construireBoutonsAffichage());
  ajouterFilet();
  ajouterGroupe("CalculArbre", construireBoutonsCalculArbre());
  ajouterFilet();
  ajouterGroupe("Règle de priorités", construireBoutonsEcriture());

  if (etatJeu === "atelier") {
    ajouterFilet();
    const groupePerso = document.createElement("div");
    groupePerso.className = "panel-groupe";
    groupePerso.appendChild(construireMenuExercicePersonnalise());
    panneau.appendChild(groupePerso);
  }

  majBandeau();
}

// Repliée par défaut (voir expressionPersoOuvert) : cliquer sur le libellé
// révèle le champ et le bouton "Créer l'exercice", pour ne pas alourdir le
// panneau latéral avec un formulaire toujours visible mais rarement utilisé.
function construireMenuExercicePersonnalise() {
  const conteneur = document.createElement("div");

  const entete = document.createElement("div");
  entete.className = "panel-groupe-label panel-groupe-label-repliable";
  entete.textContent = (expressionPersoOuvert ? "▾ " : "▸ ") + "Exercice personnalisé";
  entete.onclick = () => {
    expressionPersoOuvert = !expressionPersoOuvert;
    renderPanneauLateral();
  };
  conteneur.appendChild(entete);

  if (expressionPersoOuvert) {
    const contenu = document.createElement("div");
    contenu.className = "choix-nombre";

    const inputPerso = document.createElement("input");
    inputPerso.type = "text";
    inputPerso.id = "expressionPersoInput";
    inputPerso.className = "input-nombre-perso";
    inputPerso.placeholder = "Ex : (6+2)×3";
    inputPerso.autocomplete = "off";
    inputPerso.addEventListener("keydown", e => {
      if (e.key === "Enter") { e.preventDefault(); demarrerExercicePersonnalise(); }
    });

    const btnPerso = document.createElement("button");
    btnPerso.type = "button";
    btnPerso.className = "panel-btn";
    btnPerso.textContent = "Créer l'exercice";
    btnPerso.onclick = demarrerExercicePersonnalise;

    const erreurPerso = document.createElement("div");
    erreurPerso.id = "expressionPersoErreur";
    erreurPerso.className = "capsule-feedback-erreur";

    contenu.append(inputPerso, btnPerso, erreurPerso);
    conteneur.appendChild(contenu);

    // Le champ ne peut recevoir le focus qu'une fois inséré dans le DOM.
    setTimeout(() => inputPerso.focus(), 0);
  }

  return conteneur;
}

function choisirEtatJeu(etat) {
  if (etat === etatJeu) return;
  etatJeu = etat;

  document.querySelectorAll(".btn-header[data-etat]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.etat === etat);
  });

  questionIndex = 0;
  score = 0;
  relancer();
}

// ==================== ENTÊTE ====================
function setupBoutonsEtatJeu() {
  const conteneur = document.getElementById("topButtonsBar");
  if (!conteneur) return;

  const btnAtelier = document.createElement("button");
  btnAtelier.type = "button";
  btnAtelier.className = "btn-header" + (etatJeu === "atelier" ? " active" : "");
  btnAtelier.dataset.etat = "atelier";
  btnAtelier.textContent = "Atelier";
  btnAtelier.onclick = () => choisirEtatJeu("atelier");

  const btnQuiz = document.createElement("button");
  btnQuiz.type = "button";
  btnQuiz.className = "btn-header" + (etatJeu === "quiz" ? " active" : "");
  btnQuiz.dataset.etat = "quiz";
  btnQuiz.textContent = "Quiz";
  btnQuiz.onclick = () => choisirEtatJeu("quiz");

  const filet = document.createElement("div");
  filet.className = "filet-header";

  conteneur.append(btnAtelier, btnQuiz, filet);
}

function setupBoutonGuide() {
  const conteneur = document.getElementById("topButtonsBar");
  if (!conteneur) return;

  const filet = document.createElement("div");
  filet.className = "filet-header";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-header";
  btn.textContent = "Guide";
  btn.onclick = ouvrirGuide;

  conteneur.append(filet, btn);
}

function setupBoutonFiche() {
  const conteneur = document.getElementById("topButtonsBar");
  if (!conteneur) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-header";
  btn.textContent = "Fiche papier";
  btn.onclick = ouvrirFiche;
  conteneur.appendChild(btn);
}

function setupBoutonNouvelOnglet() {
  const conteneur = document.getElementById("topButtonsBar");
  if (!conteneur) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn-header";
  btn.textContent = "Nouvel onglet";
  btn.onclick = () => window.open(window.location.href, "_blank", "noopener");
  conteneur.appendChild(btn);
}

// ==================== GUIDE ====================
function ouvrirGuide() {
  document.getElementById("overlayGuide").classList.add("ouvert");
}
function fermerGuide() {
  document.getElementById("overlayGuide").classList.remove("ouvert");
}

// ==================== FICHE PAPIER ====================
let serieFicheActuelle = [];

function genererSerieFiche(nb) {
  const nbJetons = MODES[modeActuel].jetons;
  const exercices = [];
  for (let i = 0; i < nb; i++) {
    const d = tirerArbreEtCible(nbJetons, niveauActuel, modeRelatifs === "avec", modeFraction === "avec");
    exercices.push(d);
  }
  return exercices;
}

// Écriture texte (pas LaTeX) de l'arbre pour la fiche imprimable : évite de
// dépendre du rendu asynchrone de MathJax dans une page destinée à
// l'impression immédiate.
function arbreVersTexte(noeud, jetons, prioriteParent = 0, estEnTete = true) {
  if (noeud.type === "jeton") return String(jetons[noeud.jetonIndex]);

  if (modeEcriture === "parenthese") {
    const txtGauche = arbreVersTexte(noeud.gauche, jetons, 0, false);
    const txtDroite = arbreVersTexte(noeud.droite, jetons, 0, false);
    const txt = `${txtGauche}${OP_SYMBOLES[noeud.op]}${txtDroite}`;
    return estEnTete ? txt : `(${txt})`;
  }

  const prio = (noeud.op === "*" || noeud.op === ":") ? 2 : 1;
  const txtGauche = arbreVersTexte(noeud.gauche, jetons, prio, estEnTete);
  const txtDroite = arbreVersTexte(noeud.droite, jetons, prio + 1, false);
  const txt = `${txtGauche}${OP_SYMBOLES[noeud.op]}${txtDroite}`;
  return prioriteParent > prio ? `(${txt})` : txt;
}

function rendreTableauFiche(exercices) {
  const wrap = document.getElementById("ficheTableWrap");

  const lignes = exercices.map((ex, i) => `
    <tr>
      <td>${i + 1}</td>
      <td class="col-cible">${arbreVersTexte(ex.arbre, ex.jetons)}</td>
      <td class="col-expression"></td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <table>
      <colgroup>
        <col style="width:8%">
        <col style="width:52%">
        <col style="width:40%">
      </colgroup>
      <thead>
        <tr>
          <th>N°</th>
          <th class="col-cible-th">Arbre (écrit en expression)</th>
          <th>Résultat</th>
        </tr>
      </thead>
      <tbody>${lignes}</tbody>
    </table>
  `;
}

// Variante de arbreVersLatex utilisable hors contexte "game" (fiche : chaque
// exercice a son propre arbre, ses propres jetons déjà portés par les
// nœuds).
function arbreVersLatexPourFiche(noeud, prioriteParent = 0, estEnTete = true) {
  if (noeud.type === "jeton") {
    return noeud.nombre.toLatex({ nombreAff: "entier" });
  }

  if (modeEcriture === "parenthese") {
    const txtGauche = arbreVersLatexPourFiche(noeud.gauche, 0, false);
    const txtDroite = arbreVersLatexPourFiche(noeud.droite, 0, false);
    const txt = `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
    return estEnTete ? txt : `(${txt})`;
  }

  const prio = (noeud.op === "*" || noeud.op === ":") ? 2 : 1;
  const txtGauche = arbreVersLatexPourFiche(noeud.gauche, prio, estEnTete);
  const txtDroite = arbreVersLatexPourFiche(noeud.droite, prio + 1, false);
  const txt = `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
  return prioriteParent > prio ? `(${txt})` : txt;
}

function ouvrirFiche() {
  serieFicheActuelle = genererSerieFiche(NB_EXERCICES_FICHE);
  const sousTitre = document.getElementById("ficheSousTitre");
  if (sousTitre) sousTitre.textContent = `Mode : ${MODES[modeActuel].label} (${MODES[modeActuel].jetons} jetons par arbre) — Niveau : ${NIVEAUX_JETONS_ARBRE[niveauActuel].label} — ${modeRelatifs === "avec" ? "avec" : "sans"} relatifs — ${modeFraction === "avec" ? "avec" : "sans"} fraction`;
  document.getElementById("overlayFiche").classList.add("ouvert");
  rendreTableauFiche(serieFicheActuelle);
}

function fermerFiche() {
  document.getElementById("overlayFiche").classList.remove("ouvert");
}

// ---------- Export LaTeX (même structure que compteEstBonSimple/generer_tex.js) ----------
function genererLatexFiche(exercices) {
  const REF = "\\vphantom{\\dfrac{0}{0}}";

  const specColonnes = "|>{\\columncolor{grisFondN}\\centering\\arraybackslash}p{1.0cm}||" +
    ">{\\centering\\arraybackslash}p{9cm}||>{\\color{ligne}}p{4cm}|";

  const lignes = exercices.map((ex, i) => {
    return `$${REF}${i + 1}$ & $${REF}${arbreVersLatexPourFiche(ex.arbre)}$ & \\\\\n\\hline`;
  }).join("\n");

  return `\\documentclass[11pt,a4paper]{article}
\\usepackage[a4paper,margin=2cm]{geometry}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french,provide=*]{babel}
\\usepackage{amsmath}
\\usepackage[table]{xcolor}
\\usepackage{array}
\\usepackage{makecell}
\\definecolor{ardoise}{HTML}{2C2226}
\\definecolor{grisbrun}{HTML}{6B5B62}
\\definecolor{ligne}{HTML}{B9AF9C}
\\definecolor{grisFondN}{HTML}{E9E6DF}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\extrarowheight}{4pt}
\\renewcommand{\\arraystretch}{2}
\\setlength{\\tabcolsep}{4pt}
\\setlength{\\doublerulesep}{0.8pt}
\\begin{document}
\\noindent
Nom et prénom~: \\hrulefill \\hspace{1.2cm} Note~: \\hrulefill\\,/ \\hrulefill
\\vspace{30pt}
\\begin{center}
  {\\Huge\\bfseries\\color{ardoise} Calcule l'arbre}\\\\[20pt]
  {\\large\\color{grisbrun} Calcule le résultat de chaque arbre, écrit ici sous forme d'expression.}
\\end{center}

\\vspace{10pt}
{\\small\\color{grisbrun}
Opérations~: $+$, $-$, $\\times$, $\\div$.
Mode~: ${MODES[modeActuel].label} (${MODES[modeActuel].jetons} jetons par arbre). Niveau~: ${NIVEAUX_JETONS_ARBRE[niveauActuel].label}. ${modeRelatifs === "avec" ? "Avec" : "Sans"} nombres relatifs. ${modeFraction === "avec" ? "Avec" : "Sans"} fractions.
}
\\vspace{10pt}
\\begin{center}
\\begin{tabular}{${specColonnes}}
\\hline
\\multicolumn{1}{|c||}{\\bfseries N°} &
\\multicolumn{1}{c||}{\\bfseries Arbre} &
\\multicolumn{1}{c|}{\\bfseries Résultat} \\\\
\\hline
${lignes}
\\hline

\\end{tabular}
\\end{center}
\\end{document}
`;
}

function telechargerTex() {
  const tex = genererLatexFiche(serieFicheActuelle);
  const blob = new Blob([tex], { type: "text/x-tex;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fiche-arbre-calcul.tex";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== ÉVÉNEMENTS ====================
// Valider une étape se fait désormais via la touche Entrée directement sur
// l'input de la capsule ouverte (voir LigneEtape) ; ce raccourci global ne
// gère plus que l'avancée en quiz une fois la question terminée.
btnNext.onclick = nouvelleQuestion;

document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  if (phase === "next" && etatJeu === "quiz") {
    e.preventDefault();
    nouvelleQuestion();
  }
});

document.getElementById("btnFermerFiche").onclick = fermerFiche;
document.getElementById("btnRegenererFiche").onclick = ouvrirFiche;
document.getElementById("btnTelechargerTex").onclick = telechargerTex;
document.getElementById("btnImprimerFiche").onclick = () => window.print();
document.getElementById("overlayFiche").addEventListener("click", e => {
  if (e.target.id === "overlayFiche") fermerFiche();
});

document.getElementById("btnFermerGuide").onclick = fermerGuide;
document.getElementById("overlayGuide").addEventListener("click", e => {
  if (e.target.id === "overlayGuide") fermerGuide();
});

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (document.getElementById("overlayFiche").classList.contains("ouvert")) fermerFiche();
  if (document.getElementById("overlayGuide").classList.contains("ouvert")) fermerGuide();
});

// ==================== INIT ====================
setupBoutonsEtatJeu();
setupBoutonNouvelOnglet();
setupBoutonFiche();
setupBoutonGuide();
renderPanneauLateral();
nouvelleQuestion();
