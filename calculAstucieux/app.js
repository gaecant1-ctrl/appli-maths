// app.js — Calcul astucieux, sur le modèle de arbreCalcul/app.js MAIS SANS
// ARBRE : l'énoncé donné est directement une expression (+ − × ÷,
// parenthésée pour préserver le regroupement qui porte l'astuce — voir
// CalculAstucieux.js), affichée en tête de la zone de réponse comme
// capsule d'énoncé. L'élève doit trouver le résultat final, éventuellement
// en passant par des étapes intermédiaires tapées une à une — exactement le
// même mécanisme de capsules chaînées que arbreCalcul (LigneEtape), avec la
// même comparaison purement NUMÉRIQUE à la cible (game.cible, un Nombre) :
// aucune vérification que l'élève a bien utilisé l'astuce visée, comme dans
// arbreCalcul où seul le résultat final de l'arbre compte.

// ==================== CONFIGURATION ====================
const NB_QUESTIONS = 10;
const NB_EXERCICES_FICHE = 10; // 5 lignes de 2 colonnes
const NB_COLONNES_FICHE = 2;
const NB_LIGNES_VIDES_FICHE = 3; // pas de "nb d'opérations" fixe ici (pas de jetons/arbre)

const OP_SYMBOLES = { "+": "+", "-": "−", "*": "×", ":": "÷" };

// ==================== ÉTAT ====================
let etatJeu = "atelier";        // 'atelier' | 'quiz'
// Deux bascules INDÉPENDANTES (pas un choix exclusif) : Sommes et Produits
// peuvent être actives ensemble (= "tous"), mais jamais toutes les deux
// inactives — voir construireBoutonsFamille, qui refuse le clic qui
// désactiverait la dernière restante.
let familleSommes = true;
let familleProduits = false;
let modeDecimaux = "sans";      // 'avec' : compléments décimaux dans les sommes ; 'sans' : tout entier
// 'sans' (défaut) : priorités opératoires pas encore supposées connues
// (comme en sixième) — un produit inséré dans une somme est TOUJOURS
// parenthésé (ex: "(6×2,8)+17"), jamais laissé nu même quand la priorité
// usuelle le permettrait. 'avec' : parenthésage minimal usuel (× ÷
// prioritaires sur + −). N'affecte que l'ÉCRITURE (énoncé + fiche papier),
// jamais la génération : pas besoin de relancer() en changeant de valeur,
// juste de réafficher l'énoncé en cours (voir synchroniserEnonce).
let modeEcriture = "sans";

let questionIndex = 0;
let score = 0;
let game = null;                // { texte, arbre, cible }
let phase = "saisie";           // 'saisie' | 'next' | 'fin'
let ligneCourante = null;
let estPremiereLigne = true;
let expressionPersoOuvert = false;

function latexOp(op) {
  return op === "*" ? "\\times " : op === ":" ? "\\div " : op;
}

// ==================== PARSEUR D'EXPRESSION (donné ET étapes tapées) ====================
// Un seul et même parseur sert à la fois à lire l'expression GÉNÉRÉE (voir
// genererQuestion) et les étapes tapées par l'élève — contrairement à
// arbreCalcul où l'arbre donné et les étapes tapées avaient deux
// représentations différentes (feuilles 'jeton' vs 'NUM'), il n'y a ici
// qu'une seule forme (pas d'arbre visuel à distinguer).
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
      // Marque le nœud comme explicitement parenthésé dans le texte source
      // — c'est ce qui permet à expressionEtapeVersLatex/Texte de savoir
      // qu'il doit réafficher ces parenthèses même quand les priorités
      // opératoires ne l'exigeraient pas (ex: "(a+c)+(b+d)" : le
      // regroupement EST l'astuce à montrer, pas un détail de priorité).
      if (inner.type === "op") inner.explicitParens = true;
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

// Écriture LaTeX/texte : selon modeEcriture, parenthésage minimal usuel
// (mode 'avec' : × ÷ prioritaires sur + −, donc "6×2,8+17" ne montre pas de
// parenthèses autour du produit) ou parenthésage systématique de tout
// changement d'opération (mode 'sans' : "(6×2,8)+17", sans jamais supposer
// connue la règle de priorité). Dans les deux cas, un nœud explicitement
// parenthésé dans le texte source (voir explicitParens ci-dessus) garde
// toujours ses parenthèses — ce ne sont pas des parenthèses de priorité
// mais le REGROUPEMENT qui porte l'astuce (ex: "(a+c)+(b+d)" doit rester
// visible tel quel, jamais réduit en "a+c+b+d").
function prioriteOp(op) {
  return (op === "*" || op === ":") ? 2 : 1;
}

function rendreCote(noeud, prioParent, cote, rendreNoeud) {
  const texte = rendreNoeud(noeud);
  if (noeud.type !== "op") return texte;
  const prioEnfant = prioriteOp(noeud.op);
  const besoinParens = noeud.explicitParens
    || (modeEcriture === "avec"
      ? prioEnfant < prioParent
      : prioEnfant !== prioParent)
    || (cote === "droite" && prioEnfant === prioParent);
  return besoinParens ? `(${texte})` : texte;
}

function expressionEtapeVersLatex(noeud) {
  if (noeud.type === "NUM") return noeud.nombre.toLatex({ nombreAff: "canonique" });
  const prio = prioriteOp(noeud.op);
  const txtGauche = rendreCote(noeud.gauche, prio, "gauche", expressionEtapeVersLatex);
  const txtDroite = rendreCote(noeud.droite, prio, "droite", expressionEtapeVersLatex);
  return `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
}

function expressionEtapeVersTexte(noeud) {
  // toString() (contrairement à toLatex()) ne convertit pas le point en
  // virgule décimale — nécessaire ici pour la fiche imprimable en texte
  // brut, qui doit rester en convention française comme le reste de
  // l'appli.
  if (noeud.type === "NUM") return noeud.nombre.toString({ nombreAff: "canonique" }).replace(".", ",");
  const prio = prioriteOp(noeud.op);
  const txtGauche = rendreCote(noeud.gauche, prio, "gauche", expressionEtapeVersTexte);
  const txtDroite = rendreCote(noeud.droite, prio, "droite", expressionEtapeVersTexte);
  return `${txtGauche}${OP_SYMBOLES[noeud.op]}${txtDroite}`;
}

// ==================== RÉFÉRENCES DOM ====================
const consigneWrap = document.getElementById("consigne-wrap");
const panelReponse = document.getElementById("panelReponse");
const etapesContainer = document.getElementById("etapesContainer");
const btnNext = document.getElementById("btnNext");
const message = document.getElementById("message");
const panel = document.getElementById("panel");
const zoneFin = document.getElementById("zoneFin");
const ecranFin = document.getElementById("ecranFin");

// ==================== BANDEAU SCORE ====================
function majBandeau() {
  if (etatJeu !== "quiz") return;
  const progressElem = document.getElementById("question-progress");
  if (progressElem) progressElem.textContent = `Question ${questionIndex}/${NB_QUESTIONS}`;
  const scoreElem = document.getElementById("score");
  if (scoreElem) scoreElem.textContent = `Score : ${score}/${Math.max(0, questionIndex - (phase === "saisie" ? 1 : 0))}`;
}

function definirMessage(html, type) {
  message.innerHTML = html;
  message.className = type || "";
}

// ==================== GÉNÉRATION ====================
// Construit {texte, arbre, cible} à partir d'un texte d'expression déjà
// valide (générée par CalculAstucieux.js, ou tapée dans l'exercice
// personnalisé) — voir construireExercicePersonnalise pour la variante qui
// valide un texte arbitraire.
function construireQuestionDepuisTexte(texte) {
  const lex = tokeniserExpressionEtape(texte);
  if (lex.erreur) return null;
  const parsed = construireArbreExpressionEtape(lex.tokens);
  if (parsed.erreur) return null;
  const cible = evaluerExpressionEtape(parsed.arbre);
  if (!cible) return null;
  return { texte, arbre: parsed.arbre, cible };
}

function famillesActives() {
  const actives = [];
  if (familleSommes) actives.push("sommes");
  if (familleProduits) actives.push("produits");
  return actives;
}

function libelleFamillesActives() {
  return famillesActives().map(cle => FAMILLES_ASTUCE[cle].label).join(" + ");
}

// vMax : borne le nombre de répétitions des sommes alternées (m=3,4,8) —
// laissé à sa valeur par défaut (7) en jeu, mais réduit pour la fiche
// papier (voir genererSerieFiche) où une longue suite répétée type
// "31+19+31+19+..." est peu agréable à l'impression.
function genererQuestion(vMax = 7) {
  const texte = genererCalculAstucieux(famillesActives(), modeDecimaux === "avec", vMax);
  const d = construireQuestionDepuisTexte(texte);
  if (!d) throw new Error("Expression générée invalide : " + texte);
  return d;
}

function formatFinalRequis() {
  return "dec";
}

// Capsule de tête, en lecture seule : l'expression donnée, dans la même
// forme visuelle que les capsules d'étape mais sans "=" — voir
// arbreCalcul/app.js (capsuleEnonce), dont ce mécanisme reprend le
// fonctionnement, sans jamais de colonne d'arbre à côté puisqu'il n'y a pas
// d'arbre ici : l'énoncé vit uniquement dans cette capsule.
function capsuleEnonce(container) {
  const wrapper = document.createElement("div");
  wrapper.className = "capsule-etape capsule-enonce";

  const symbole = document.createElement("span");
  symbole.className = "capsule-symbole";

  const zone = document.createElement("div");
  zone.className = "capsule-saisie";
  zone.innerHTML = `<div class="capsule-figee">\\(${expressionEtapeVersLatex(game.arbre)}\\)</div>`;

  wrapper.append(symbole, zone);
  container.appendChild(wrapper);
  MathJax.typesetPromise([zone]);
}

// Réécrit l'énoncé déjà affiché avec le modeEcriture courant, sans changer
// la question ni rien d'autre — appelé quand on bascule "Règle de
// priorités" (voir construireBoutonsEcriture) : contrairement aux autres
// réglages, celui-ci n'affecte que l'AFFICHAGE, jamais la génération.
function synchroniserEnonce() {
  if (!game) return;
  const zone = document.querySelector(".capsule-enonce .capsule-saisie");
  if (!zone) return;
  zone.innerHTML = `<div class="capsule-figee">\\(${expressionEtapeVersLatex(game.arbre)}\\)</div>`;
  MathJax.typesetPromise([zone]);
}

// ==================== CAPSULE DE SAISIE (une par étape tapée) ====================
class LigneEtape {
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
    estPremiereLigne = false;

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
      this.marquer("succes", "Écris-le en écriture décimale");
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
    btnNext.style.display = "none";
    if (skipBtn) skipBtn.disabled = false;
  }
}

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

function demarrerQuestionAvec(d) {
  game = { texte: d.texte, arbre: d.arbre, cible: d.cible };

  phase = "saisie";
  majBandeau();
  definirMessage("", "");

  etapesContainer.innerHTML = "";
  estPremiereLigne = true;
  ligneCourante = new LigneEtape(etapesContainer, "");
  capsuleEnonce(etapesContainer);
  etapesContainer.prepend(etapesContainer.lastElementChild);
  if (estPremiereLigne && ligneCourante) ligneCourante.symbole.textContent = "=";

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

  const cible = evaluerExpressionEtape(parsed.arbre);
  if (!cible) {
    return { erreur: "Cette expression contient une division par zéro." };
  }

  return { texte: texte.trim(), arbre: parsed.arbre, cible };
}

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
  panelReponse.style.display = "none";
  panel.style.display = "none";
  message.textContent = "";
  message.className = "";

  const pourcentage = Math.round(100 * score / NB_QUESTIONS);
  let commentaire;
  if (pourcentage === 100) commentaire = "Parfait ! Tous les calculs sont bien menés. 🎯";
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
  panelReponse.style.display = "";
  panel.style.display = "flex";
  zoneFin.style.display = "none";
  ecranFin.innerHTML = "";
  ecranFin.className = "";

  renderPanneauLateral();
  nouvelleQuestion();
}

// ==================== PANNEAU LATÉRAL ====================
// Sommes et Produits sont deux bascules indépendantes, activables ensemble
// (= "tous") — un clic qui désactiverait la dernière restante est ignoré.
function construireBoutonsFamille() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";

  const btnSommes = document.createElement("button");
  btnSommes.type = "button";
  btnSommes.className = "param-btn" + (familleSommes ? " active" : "");
  btnSommes.textContent = FAMILLES_ASTUCE.sommes.label;
  btnSommes.onclick = () => {
    if (familleSommes && !familleProduits) return;
    familleSommes = !familleSommes;
    relancer();
  };

  const btnProduits = document.createElement("button");
  btnProduits.type = "button";
  btnProduits.className = "param-btn" + (familleProduits ? " active" : "");
  btnProduits.textContent = FAMILLES_ASTUCE.produits.label;
  btnProduits.onclick = () => {
    if (familleProduits && !familleSommes) return;
    familleProduits = !familleProduits;
    relancer();
  };

  conteneur.append(btnSommes, btnProduits);
  return conteneur;
}

function construireBoutonsDecimaux() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";
  const options = [
    { valeur: "sans", label: "Sans" },
    { valeur: "avec", label: "Avec" },
  ];
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "param-btn" + (modeDecimaux === opt.valeur ? " active" : "");
    btn.textContent = opt.label;
    btn.onclick = () => {
      if (modeDecimaux === opt.valeur) return;
      modeDecimaux = opt.valeur;
      relancer();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

// Bascule EXCLUSIVE : affichage seulement (voir rendreCote) — jamais la
// génération, pas besoin de relancer() en changeant de valeur, juste de
// réafficher l'énoncé en cours (voir synchroniserEnonce).
function construireBoutonsEcriture() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";
  const options = [
    { valeur: "sans", label: "Sans" },
    { valeur: "avec", label: "Avec" },
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
      synchroniserEnonce();
    };
    conteneur.appendChild(btn);
  });
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

  ajouterGroupe("Famille d'astuces", construireBoutonsFamille());
  ajouterFilet();
  ajouterGroupe("Décimaux", construireBoutonsDecimaux());
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
    inputPerso.placeholder = "Ex : (2,3+7,7)+1";
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

const V_MAX_FICHE = 3;

function genererSerieFiche(nb) {
  const exercices = [];
  for (let i = 0; i < nb; i++) exercices.push(genererQuestion(V_MAX_FICHE));
  return exercices;
}

function rendreTableauFiche(exercices) {
  const wrap = document.getElementById("ficheTableWrap");
  const lignesVides = `<div class="fiche-ligne-vide"></div>`.repeat(NB_LIGNES_VIDES_FICHE);

  const cellules = exercices.map(ex => `
      <div class="fiche-cellule">
        <div class="fiche-expression">${expressionEtapeVersTexte(ex.arbre)}</div>
        ${lignesVides}
      </div>
    `).join("");

  wrap.innerHTML = `<div class="fiche-grille">${cellules}</div>`;
}

function ouvrirFiche() {
  serieFicheActuelle = genererSerieFiche(NB_EXERCICES_FICHE);
  const sousTitre = document.getElementById("ficheSousTitre");
  if (sousTitre) sousTitre.textContent = `Famille : ${libelleFamillesActives()} — ${modeDecimaux === "avec" ? "avec" : "sans"} décimaux`;
  document.getElementById("overlayFiche").classList.add("ouvert");
  rendreTableauFiche(serieFicheActuelle);
}

function fermerFiche() {
  document.getElementById("overlayFiche").classList.remove("ouvert");
}

// ---------- Export LaTeX ----------
function genererLatexFiche(exercices) {
  const lignesVidesMacro = "\\ligneVide".repeat(NB_LIGNES_VIDES_FICHE);
  const celluleLatex = (ex) => `\\exercice{$${expressionEtapeVersLatex(ex.arbre)}$}`;

  const lignesTableau = [];
  for (let i = 0; i < exercices.length; i += NB_COLONNES_FICHE) {
    const cellules = exercices.slice(i, i + NB_COLONNES_FICHE).map(celluleLatex);
    while (cellules.length < NB_COLONNES_FICHE) cellules.push("");
    lignesTableau.push(cellules.join(" & ") + " \\\\[6pt] \\hline");
  }

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

\\newcommand{\\ligneVide}{\\\\[22pt]}
\\newcommand{\\exercice}[1]{\\makecell[tc]{#1${lignesVidesMacro}}}

\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\tabcolsep}{6pt}
\\setlength{\\doublerulesep}{0.8pt}
\\renewcommand{\\arraystretch}{1.6}

\\begin{document}
\\noindent
Nom et prénom~: \\hrulefill \\hspace{1.2cm} Note~: \\hrulefill\\,/ \\hrulefill
\\vspace{30pt}
\\begin{center}
  {\\Huge\\bfseries\\color{ardoise} Calcul astucieux}\\\\[20pt]
  {\\large\\color{grisbrun} Calcule astucieusement chaque expression.}
\\end{center}

\\vspace{10pt}
{\\small\\color{grisbrun}
Famille~: ${libelleFamillesActives()}. ${modeDecimaux === "avec" ? "Avec" : "Sans"} décimaux.
}
\\vspace{10pt}
\\begin{center}
\\begin{tabular}{|*{${NB_COLONNES_FICHE}}{p{8cm}|}}
\\hline
${lignesTableau.join("\n")}
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
  a.download = "fiche-calcul-astucieux.tex";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== ÉVÉNEMENTS ====================
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
