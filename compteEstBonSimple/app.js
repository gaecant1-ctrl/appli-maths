// app.js — Compte est bon (simple)
//
// Jeu "compte est bon" classique : les jetons sont des nombres tirés au
// hasard (voir Jetons.js), pas dérivés de l'écriture en lettres de la cible
// (voir appli-maths/nombreMot pour cette variante-là). Deux façons de
// répondre, au choix (bascule "Réponse" dans le panneau latéral) :
//   - "expression" : on tape une expression avec les jetons en CHIFFRES
//     (comme le compte-est-bon classique), + − × ÷ et parenthèses.
//   - "arbre" : on construit visuellement l'arbre de calcul, avec les 4
//     opérations classiques (voir nombreMotArbre).
// Les deux modes partagent la même cible, les mêmes jetons, et le même
// moteur de réduction/LaTeX — seule la façon de construire la réponse change.

// ==================== CONFIGURATION ====================
const NB_QUESTIONS = 10;

const MODES = {
  1: { jetons: 2, label: "1", libelle: "1 opération" },
  2: { jetons: 3, label: "2", libelle: "2 opérations" },
  3: { jetons: 4, label: "3", libelle: "3 opérations" },
  4: { jetons: 5, label: "4", libelle: "4 opérations" },
};

// Les 4 opérations classiques, disponibles aussi bien en mode expression
// qu'en mode arbre (repris de nombreMotArbre).
const OPS_EXPRESSION = ["+", "-", "*", ":"];
const OPS_ARBRE = ["+", "-", "*", ":"];
const OP_SYMBOLES = { "+": "+", "-": "−", "*": "×", ":": "÷" };
const NB_EXERCICES_FICHE = 10;

// ==================== ÉTAT ====================
let etatJeu = "atelier";        // 'atelier' | 'quiz'
let modeActuel = 2;             // clé de MODES : nombre d'opérations
let modeReponse = "expression"; // 'expression' | 'arbre'
let niveauActuel = "simple";    // clé de NIVEAUX_JETONS : plage des jetons
// 'parenthese' : chaque sous-expression est parenthésée, sans jamais
// s'appuyer sur les priorités opératoires (×/÷ avant +/−) — pas au
// programme de sixième. 'priorite' : parenthèses minimales, comme
// d'habitude en mathématiques (celles qu'un niveau plus avancé sait lire).
let modeParenthese = "parenthese";

let questionIndex = 0;
let score = 0;
let game = null;
let phase = "saisie"; // 'saisie' | 'next' | 'fin'
let peutReessayer = false; // true après une réponse fausse (pas après une réussite) : affiche "Je réessaye"

// ---- Mode expression : suivi des jetons insérés dans le texte ----
let pileInsertions = [];

// ---- Mode arbre : arbre en cours de construction ----
let arbreRoot = null;           // noeud racine de l'arbre visuel
let jetonsUtilises = new Set(); // indices (dans game.jetons) déjà placés en feuille
let noeudSelectionneId = null;
let idCounter = 0;
function nouvelId() { return "n" + (idCounter++); }

function nouveauPlaceholder(parent) {
  return { id: nouvelId(), type: "placeholder", parent: parent || null };
}

// ==================== CALCUL (basé sur Nombre) ====================
function applyOp(nombreA, op, nombreB) {
  switch (op) {
    case "+": return nombreA.add(nombreB);
    case "-": return nombreA.sub(nombreB);
    case "*": return nombreA.mul(nombreB);
    case ":":
      if (nombreB.valeurNum.a === 0) return null;
      return nombreA.div(nombreB);
  }
}

// ==================== ARBRE DE CALCUL (réduction + LaTeX) ====================
// Représentation obtenue en parsant le texte saisi :
// {type:'NUM',nombre} / {type:'BINOP',op,gauche,droite}.
function opposeNombre(nb) {
  return Nombre.fromParts(-nb.valeurNum.a, nb.valeurNum.b, nb.typeEcriture);
}

function simplifierSigneNoeud(noeud) {
  if (noeud.droite.type !== "NUM") return null;
  if (noeud.droite.nombre.valeurNum.a >= 0) return null;
  if (noeud.op !== "+" && noeud.op !== "-") return null;

  const opInverse = noeud.op === "-" ? "+" : "-";
  const droiteOpposee = { type: "NUM", nombre: opposeNombre(noeud.droite.nombre), opts: noeud.droite.opts };

  return { type: "BINOP", op: opInverse, gauche: noeud.gauche, droite: droiteOpposee };
}

function evaluerEtReduireArbre(noeud, estDerniereGlobale, optsFinal) {
  if (noeud.type === "NUM") {
    return { nombre: noeud.nombre, arbreReduit: noeud, etapes: [] };
  }
  const g = evaluerEtReduireArbre(noeud.gauche, false, optsFinal);
  if (!g) return null;
  const d = evaluerEtReduireArbre(noeud.droite, false, optsFinal);
  if (!d) return null;

  const resultat = applyOp(g.nombre, noeud.op, d.nombre);
  if (!resultat) return null;

  const etapes = [];
  g.etapes.forEach(etapeG => {
    etapes.push({ type: "BINOP", op: noeud.op, gauche: etapeG, droite: noeud.droite });
  });
  d.etapes.forEach(etapeD => {
    etapes.push({ type: "BINOP", op: noeud.op, gauche: g.arbreReduit, droite: etapeD });
  });

  const noeudEntierementReduit = { type: "BINOP", op: noeud.op, gauche: g.arbreReduit, droite: d.arbreReduit };
  const noeudSimplifie = simplifierSigneNoeud(noeudEntierementReduit);
  if (noeudSimplifie) {
    etapes.push(noeudSimplifie);
  }

  const optsCeNoeud = estDerniereGlobale ? optsFinal : { nombreAff: 'fractionSimple' };
  const arbreReduit = { type: "NUM", nombre: resultat, opts: optsCeNoeud };
  etapes.push(arbreReduit);

  return { nombre: resultat, arbreReduit, etapes };
}

function latexOp(op) {
  return op === "*" ? "\\times " : op === ":" ? "\\div " : op;
}

function arbreVersLatex(noeud, prioriteParent, estEnTete, estRacine = true) {
  if (noeud.type === "NUM") {
    const opts = noeud.opts || { nombreAff: 'fractionSimple' };
    const txt = noeud.nombre.toLatex(opts);
    const estNegatif = noeud.nombre.valeurNum.a < 0;
    return (estNegatif && !estEnTete) ? `(${txt})` : txt;
  }
  const prio = (noeud.op === "*" || noeud.op === ":") ? 2 : 1;
  const txtGauche = arbreVersLatex(noeud.gauche, prio, estEnTete, false);
  const txtDroite = arbreVersLatex(noeud.droite, prio + 1, false, false);
  const txt = `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
  if (modeParenthese === "parenthese") return estRacine ? txt : `(${txt})`;
  return prioriteParent > prio ? `(${txt})` : txt;
}

function latexSteps(arbreInitial, etapes) {
  let lines = [];
  const pushUnique = (texte) => {
    if (lines.length === 0 || lines[lines.length - 1] !== texte) {
      lines.push(texte);
    }
  };

  pushUnique(arbreVersLatex(arbreInitial, 0, true));
  etapes.forEach(etapeArbre => {
    pushUnique(arbreVersLatex(etapeArbre, 0, true));
  });

  return `
\\[
\\begin{array}{l}
&${lines[0]} \\\\
${lines.slice(1).map(l => `=& ${l}`).join(" \\\\ ")}
\\end{array}
\\]
`;
}

// ==================== PARSER STRICT ====================
// Tokenizer + parser récursif descendant pour l'expression tapée par
// l'élève, sans gestion des jetons relatifs (les jetons de départ sont
// toujours positifs — seul le signe "-" tapé en cours d'expression peut
// introduire un nombre négatif).
function tokenizeExpression(expr) {
  const tokens = [];
  let i = 0;
  const n = expr.length;

  while (i < n) {
    const c = expr[i];

    if (c === "(" || c === ")") {
      tokens.push({ type: c === "(" ? "LPAREN" : "RPAREN", value: c });
      i++;
      continue;
    }

    if ("+-*:".includes(c)) {
      const precedent = tokens[tokens.length - 1];
      const estDebutOperande = !precedent || precedent.type === "LPAREN" || precedent.type === "OP";

      if (c === "-" && estDebutOperande) {
        if (precedent && precedent.type === "OP") {
          return { erreur: "signe_apres_operateur" };
        }
        let j = i + 1;
        if (j < n && /\d/.test(expr[j])) {
          let num = "-";
          while (j < n && /\d/.test(expr[j])) { num += expr[j]; j++; }
          tokens.push({ type: "NUM", value: num });
          i = j;
          continue;
        }
        return { erreur: "signe_sans_chiffre" };
      }

      if (precedent && precedent.type === "OP") {
        return { erreur: "deux_operateurs_consecutifs" };
      }
      tokens.push({ type: "OP", value: c });
      i++;
      continue;
    }

    if (/\d/.test(c)) {
      let num = "";
      let j = i;
      while (j < n && /\d/.test(expr[j])) { num += expr[j]; j++; }
      tokens.push({ type: "NUM", value: num });
      i = j;
      continue;
    }

    return { erreur: "caractere_invalide" };
  }

  return { tokens };
}

function construireArbreExpression(tokens) {
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
      gauche = { type: "BINOP", op, gauche, droite };
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
      gauche = { type: "BINOP", op, gauche, droite };
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

function compterNombresArbre(noeud) {
  if (noeud.type === "NUM") return 1;
  return compterNombresArbre(noeud.gauche) + compterNombresArbre(noeud.droite);
}

function compterOperationsArbre(noeud) {
  if (noeud.type === "NUM") return 0;
  return 1 + compterOperationsArbre(noeud.gauche) + compterOperationsArbre(noeud.droite);
}

function extraireNombresArbre(noeud, acc = []) {
  if (noeud.type === "NUM") { acc.push(noeud.nombre.valeurNum.a.toString()); return acc; }
  extraireNombresArbre(noeud.gauche, acc);
  extraireNombresArbre(noeud.droite, acc);
  return acc;
}

// nbJetonsRequis : nombre exact de jetons (donc nbJetonsRequis-1 opérations)
// attendu pour le mode en cours.
function parseExpressionStrict(expr, jetonsDisponibles, nbJetonsRequis) {
  expr = expr.replace(/\s+/g, "");
  if (expr === "") return null;

  const lex = tokenizeExpression(expr);
  if (lex.erreur) return null;

  const parsed = construireArbreExpression(lex.tokens);
  if (parsed.erreur) return null;

  const nbNombres = compterNombresArbre(parsed.arbre);
  const nbOperations = compterOperationsArbre(parsed.arbre);
  if (nbNombres !== nbJetonsRequis || nbOperations !== nbJetonsRequis - 1) return null;

  const numsDisponibles = jetonsDisponibles.map(String);
  const numsUtilises = extraireNombresArbre(parsed.arbre);
  if (!checkJetons(numsUtilises, numsDisponibles)) return null;

  const evalu = evaluerEtReduireArbre(parsed.arbre, true, { nombreAff: 'fractionSimple' });
  if (!evalu) return null;

  return {
    arbre: parsed.arbre,
    resultat: evalu.nombre,
    etapes: evalu.etapes,
    initialLatex: arbreVersLatex(parsed.arbre, 0, true)
  };
}

// ==================== JETONS (texte) ====================
function extractNumbers(expr) {
  const numbers = [];
  let i = 0;
  const n = expr.length;
  let positionValidePourSigne = true;

  while (i < n) {
    const c = expr[i];

    if (c === "(") { positionValidePourSigne = true; i++; continue; }
    if (c === ")") { positionValidePourSigne = false; i++; continue; }
    if ("+-*:".includes(c)) {
      if (c === "-" && positionValidePourSigne && /\d/.test(expr[i + 1] || "")) {
        let j = i + 1;
        let num = "-";
        while (j < n && /\d/.test(expr[j])) { num += expr[j]; j++; }
        numbers.push(num);
        i = j;
        positionValidePourSigne = false;
        continue;
      }
      positionValidePourSigne = true;
      i++;
      continue;
    }
    if (/\d/.test(c)) {
      let num = "";
      let j = i;
      while (j < n && /\d/.test(expr[j])) { num += expr[j]; j++; }
      numbers.push(num);
      i = j;
      positionValidePourSigne = false;
      continue;
    }
    i++;
  }

  return numbers;
}

function countOccurrences(arr) {
  const c = {};
  arr.forEach(x => c[x] = (c[x] || 0) + 1);
  return c;
}

function checkJetons(used, available) {
  return used.slice().sort().join(",") === available.slice().sort().join(",");
}

// ==================== GÉNÉRATION ====================
function genererQuestion() {
  const nbJetons = MODES[modeActuel].jetons;
  const d = tirerJetonsEtCible(nbJetons, niveauActuel);
  if (!d) throw new Error("Aucune combinaison trouvée pour ce mode (" + nbJetons + " jetons)");
  return d;
}

// ==================== RÉFÉRENCES DOM ====================
const colonneReponse = document.getElementById("colonneReponse");
const colonneVerif = document.getElementById("colonneVerif");
const consigneWrap = document.getElementById("consigne-wrap");
const consigne = document.getElementById("consigne");
const grille = document.getElementById("grille");
const zoneReponseExpression = document.getElementById("zoneReponseExpression");
const zoneReponseArbre = document.getElementById("zoneReponseArbre");
const operateursZone = document.getElementById("operateurs");
const expr = document.getElementById("expr");
const arbreWrap = document.getElementById("arbre-wrap");
const arbreInner = document.getElementById("arbre-inner");
const arbreSvg = document.getElementById("arbre-svg");
const arbreNoeuds = document.getElementById("arbre-noeuds");
const arbrePopup = document.getElementById("arbre-popup");
const btnValider = document.getElementById("btnValider");
const btnNext = document.getElementById("btnNext");
const message = document.getElementById("message");
const zoneVerification = document.getElementById("zoneVerification");
const zoneVerificationContenu = document.getElementById("zoneVerification-contenu");
const panel = document.getElementById("panel");
const zoneFin = document.getElementById("zoneFin");
const ecranFin = document.getElementById("ecranFin");

// ==================== AFFICHAGE DE LA CIBLE ====================
// Insère un séparateur tous les 3 chiffres (ex: 1234567 -> "1 234 567").
// N'est utilisé QUE pour l'affichage en lecture seule (cible) — jamais pour
// les jetons cliquables, dont le texte doit rester des chiffres bruts pour
// correspondre exactement à ce qui est inséré/comparé dans le champ de
// saisie (voir extractNumbers/checkJetons).
function formaterMilliers(n, separateur = " ") {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, separateur);
}

function rendreConsigne() {
  consigne.innerHTML = `<div class="consigne-valeur">${formaterMilliers(game.n)}</div>`;
}

// ==================== BANDEAU SCORE (panneau latéral) ====================
function majBandeau() {
  if (etatJeu !== "quiz") return;
  const progressElem = document.getElementById("question-progress");
  if (progressElem) progressElem.textContent = `Question ${questionIndex}/${NB_QUESTIONS}`;
  const scoreElem = document.getElementById("score");
  if (scoreElem) scoreElem.textContent = `Score : ${score}/${Math.max(0, questionIndex - (phase === "saisie" ? 1 : 0))}`;
}

// ==================== MESSAGE / VÉRIFICATION ====================
function definirMessage(html, type) {
  message.innerHTML = html;
  message.className = type || "";
}

function tableauComparatifVide() {
  return `
    <table class="tableau-comparatif">
      <thead><tr><th>Ton expression calculée</th><th>Cible</th></tr></thead>
      <tbody><tr><td class="col-user">&nbsp;</td><td class="col-cible">&nbsp;</td></tr></tbody>
    </table>
  `;
}

function tableauComparatif(latexEtapesUser) {
  const cibleLatex = `\\[${game.target.toLatex({ nombreAff: 'entier' })}\\]`;
  return `
    <table class="tableau-comparatif">
      <thead><tr><th>Ton expression calculée</th><th>Cible</th></tr></thead>
      <tbody>
        <tr>
          <td class="col-user">${latexEtapesUser}</td>
          <td class="col-cible">${cibleLatex}</td>
        </tr>
      </tbody>
    </table>
  `;
}

function afficherVerification(html) {
  zoneVerificationContenu.innerHTML = html || tableauComparatifVide();
}

// ==================== RÉSERVE DE JETONS ====================
// Mode expression : jetons cliquables (insèrent dans le champ).
// Mode arbre : jetons en lecture seule (le choix se fait dans le popup
// d'une case de l'arbre) — leur état "utilisé" suit jetonsUtilises.
function construireGrille() {
  grille.innerHTML = "";

  if (modeReponse === "expression") {
    game.jetons.forEach((n, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jeton";
      btn.textContent = n;
      btn.dataset.jetonId = idx;
      btn.setAttribute("aria-label", "Insérer le nombre " + n);
      btn.onclick = () => inserer(String(n), btn);
      grille.appendChild(btn);
    });
  } else {
    game.jetons.forEach((n, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "jeton readonly";
      btn.textContent = n;
      btn.dataset.jetonId = idx;
      btn.tabIndex = -1;
      grille.appendChild(btn);
    });
  }
}

function majGrilleEtat() {
  grille.querySelectorAll(".jeton").forEach(btn => {
    const idx = Number(btn.dataset.jetonId);
    btn.classList.toggle("utilise", jetonsUtilises.has(idx));
  });
}

// ==================== INSERTION JETONS / OPÉRATEURS ====================
function inserer(texte, jetonEl) {
  if (phase !== "saisie") return;

  if (jetonEl) {
    if (jetonEl.disabled) return;
    jetonEl.disabled = true;
    jetonEl.classList.add("utilise");
  }

  const start = expr.selectionStart ?? expr.value.length;
  const end = expr.selectionEnd ?? expr.value.length;

  let texteAInserer = texte;
  if (/^-\d+$/.test(texte)) {
    const caracterePrecedent = expr.value[start - 1];
    if (caracterePrecedent && "+-*:".includes(caracterePrecedent)) {
      texteAInserer = `(${texte})`;
    }
  }

  expr.value = expr.value.slice(0, start) + texteAInserer + expr.value.slice(end);
  const pos = start + texteAInserer.length;
  expr.setSelectionRange(pos, pos);
  expr.focus();

  if (jetonEl) {
    pileInsertions.push({ pos: start, longueur: texteAInserer.length, jetonEl });
  }

  verifierJetonsEnDirect();
}

function effacerCaractere() {
  if (phase !== "saisie") return;
  const start = expr.selectionStart ?? expr.value.length;
  const end = expr.selectionEnd ?? expr.value.length;

  if (start === end && start > 0) {
    const idx = pileInsertions.findIndex(p => start > p.pos && start <= p.pos + p.longueur);
    if (idx !== -1) {
      const { jetonEl } = pileInsertions[idx];
      jetonEl.disabled = false;
      jetonEl.classList.remove("utilise");
      pileInsertions.splice(idx, 1);
    }
    expr.value = expr.value.slice(0, start - 1) + expr.value.slice(start);
    expr.setSelectionRange(start - 1, start - 1);
  } else {
    expr.value = expr.value.slice(0, start) + expr.value.slice(end);
    expr.setSelectionRange(start, start);
  }
  expr.focus();
  verifierJetonsEnDirect();
}

function resynchroniserJetonsDepuisTexte() {
  pileInsertions = [];

  const used = extractNumbers(expr.value);
  const restant = countOccurrences(used);

  document.querySelectorAll(".jeton").forEach(j => {
    const n = j.textContent;
    if (restant[n] && restant[n] > 0) {
      j.classList.add("utilise");
      j.disabled = true;
      restant[n]--;
    } else {
      j.classList.remove("utilise");
      j.disabled = false;
    }
  });
}

function detecterErreurJetons(usedNums, availableNums) {
  const dispoRestants = countOccurrences(availableNums);
  let erreurAvérée = false;

  usedNums.forEach(n => {
    if (dispoRestants[n] && dispoRestants[n] > 0) {
      dispoRestants[n]--;
    } else {
      erreurAvérée = true;
    }
  });

  if (usedNums.length > availableNums.length) {
    erreurAvérée = true;
  }

  return erreurAvérée;
}

function afficherAlerteJetons(usedNums, availableNums, detailPersonnalise) {
  const usedCount = countOccurrences(usedNums);
  const remaining = { ...usedCount };

  document.querySelectorAll(".jeton").forEach(j => {
    const n = j.textContent;
    if (remaining[n] && remaining[n] > 0) {
      j.classList.add("vert");
      j.classList.remove("faux");
      remaining[n]--;
    } else {
      j.classList.add("faux");
      j.classList.remove("vert");
    }
  });

  let detail = detailPersonnalise;
  if (!detail) {
    detail = (usedNums.length > availableNums.length)
      ? "Tu utilises trop de nombres : chaque jeton ne sert qu'une seule fois."
      : "Un nombre saisi ne correspond à aucun jeton disponible, ou est utilisé en double.";
  }

  definirMessage(
    "Tu dois utiliser chaque jeton exactement une fois." +
    `<span class="detail">${detail}</span>`,
    "erreur"
  );
}

function effacerAlerteJetons() {
  document.querySelectorAll(".jeton").forEach(j => j.classList.remove("vert", "faux"));
  message.innerHTML = "";
  message.className = "";
}

function verifierJetonsEnDirect() {
  if (phase !== "saisie") return;

  const usedNums = extractNumbers(expr.value);
  const availableNums = game.jetons.map(String);

  if (detecterErreurJetons(usedNums, availableNums)) {
    afficherAlerteJetons(usedNums, availableNums);
  } else {
    effacerAlerteJetons();
  }
}

function expliquerStructureInvalide(value) {
  const nbJetonsRequis = game.jetons.length;

  if (value.trim() === "") {
    return "Écris une expression avec les jetons, par exemple en cliquant sur les jetons puis sur un opérateur.";
  }
  if (!/[+\-*:]/.test(value)) {
    return "Il manque au moins une opération (+, −, ×, ÷) entre les nombres.";
  }

  const lex = tokenizeExpression(value.replace(/\s+/g, ""));

  if (lex.erreur === "signe_apres_operateur") {
    return "Un signe « − » ne peut pas suivre directement un opérateur. Pour un nombre négatif après une opération, entoure-le de parenthèses, par exemple 8+(−3).";
  }
  if (lex.erreur === "deux_operateurs_consecutifs") {
    return "Deux opérateurs ne peuvent pas se suivre directement.";
  }
  if (lex.erreur === "signe_sans_chiffre") {
    return "Un signe « − » doit être immédiatement suivi d'un chiffre.";
  }
  if (lex.erreur === "caractere_invalide") {
    return "Cette expression contient un caractère qui n'est pas reconnu.";
  }

  if ((value.match(/\(/g) || []).length !== (value.match(/\)/g) || []).length) {
    return "Les parenthèses ne sont pas équilibrées : vérifie qu'il y a bien une ouverture pour chaque fermeture.";
  }

  if (!lex.erreur) {
    const parsed = construireArbreExpression(lex.tokens);
    if (!parsed.erreur) {
      const nbNombres = compterNombresArbre(parsed.arbre);
      const nbOperations = compterOperationsArbre(parsed.arbre);
      if (nbNombres !== nbJetonsRequis || nbOperations !== nbJetonsRequis - 1) {
        return `Utilise exactement les ${nbJetonsRequis} jetons avec ${nbJetonsRequis - 1} opérations au total.`;
      }
    }
  }

  return "Cette structure n'est pas reconnue. Utilise éventuellement des parenthèses, par exemple (3+9)×7 ou 3+9×7.";
}

// ==================== MODE ARBRE — CONSTRUCTION VISUELLE ====================
// NODE_H doit rester fixe (hauteur CSS de .arbre-noeud) ; la largeur, elle,
// varie avec la longueur du nombre affiché — px/py représentent donc le
// CENTRE horizontal de chaque noeud, jamais son bord gauche (voir
// layoutArbre et le CSS transform:translateX(-50%) associé à .arbre-noeud).
const NODE_H = 48, X_SPACING = 110, Y_SPACING = 92, PADDING = 60;

// Convertit l'arbre visuel (noeuds placeholder/jeton/op, op pouvant avoir
// plus de deux enfants — une somme ou un produit de plus de deux termes)
// en arbre de calcul strictement binaire, en associant les termes d'un même
// noeud n-aire de gauche à droite. Renvoie null si l'arbre contient encore
// au moins un placeholder (donc pas encore complet).
function construireArbreCalcul(noeud) {
  if (noeud.type === "placeholder") return null;
  if (noeud.type === "jeton") {
    const valeur = game.jetons[noeud.jetonIndex];
    return { type: "NUM", nombre: Nombre.fromParts(valeur, 1, "entier") };
  }
  let acc = null;
  for (const enfant of noeud.enfants) {
    const calc = construireArbreCalcul(enfant);
    if (!calc) return null;
    acc = acc === null ? calc : { type: "BINOP", op: noeud.op, gauche: acc, droite: calc };
  }
  return acc;
}

function libererIndicesSousArbre(noeud) {
  if (noeud.type === "jeton") {
    jetonsUtilises.delete(noeud.jetonIndex);
  } else if (noeud.type === "op") {
    noeud.enfants.forEach(libererIndicesSousArbre);
  }
}

function reinitialiserNoeud(noeud) {
  noeud.type = "placeholder";
  delete noeud.jetonIndex;
  delete noeud.op;
  delete noeud.enfants;
}

function indicesDisponibles() {
  return game.jetons.map((_, i) => i).filter(i => !jetonsUtilises.has(i));
}

// Retire noeud des enfants de son parent (utilisé pour supprimer un terme
// d'une somme/produit à plus de deux termes sans effacer les termes
// voisins) et libère les jetons éventuellement utilisés dans son sous-arbre.
function supprimerTerme(noeud) {
  libererIndicesSousArbre(noeud);
  const parent = noeud.parent;
  parent.enfants = parent.enfants.filter(e => e.id !== noeud.id);
}

function layoutArbre() {
  let feuilleIndex = 0;
  let profondeurMax = 0;

  function assigner(noeud, profondeur) {
    noeud._depth = profondeur;
    profondeurMax = Math.max(profondeurMax, profondeur);
    if (noeud.type === "op") {
      noeud.enfants.forEach(enfant => assigner(enfant, profondeur + 1));
      const xs = noeud.enfants.map(e => e._x);
      noeud._x = (Math.min(...xs) + Math.max(...xs)) / 2;
    } else {
      noeud._x = feuilleIndex;
      feuilleIndex++;
    }
  }
  assigner(arbreRoot, 0);

  function versPixels(noeud) {
    noeud.px = noeud._x * X_SPACING + PADDING;
    noeud.py = noeud._depth * Y_SPACING + PADDING;
    if (noeud.type === "op") {
      noeud.enfants.forEach(versPixels);
    }
  }
  versPixels(arbreRoot);

  const largeur = Math.max(feuilleIndex - 1, 0) * X_SPACING + 2 * PADDING;
  const hauteur = profondeurMax * Y_SPACING + 2 * PADDING + NODE_H;
  return { largeur, hauteur };
}

function libelleNoeud(noeud) {
  if (noeud.type === "placeholder") return "?";
  if (noeud.type === "jeton") return String(game.jetons[noeud.jetonIndex]);
  return OP_SYMBOLES[noeud.op];
}

function rendreArbre() {
  majGrilleEtat();

  const { largeur, hauteur } = layoutArbre();
  arbreInner.style.width = largeur + "px";
  arbreInner.style.height = hauteur + "px";
  arbreSvg.setAttribute("width", largeur);
  arbreSvg.setAttribute("height", hauteur);
  arbreSvg.innerHTML = "";
  arbreNoeuds.innerHTML = "";

  function dessiner(noeud) {
    if (noeud.type === "op") {
      noeud.enfants.forEach(enfant => {
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
    div.dataset.id = noeud.id;
    if (noeud.id === noeudSelectionneId) div.classList.add("selectionne");
    div.textContent = libelleNoeud(noeud);
    div.addEventListener("click", (e) => {
      e.stopPropagation();
      if (phase !== "saisie") return;
      ouvrirPopupNoeud(noeud);
    });
    arbreNoeuds.appendChild(div);

    if (noeud.type === "op") {
      noeud.enfants.forEach(dessiner);
    }
  }
  dessiner(arbreRoot);
}

function fermerPopup() {
  arbrePopup.classList.remove("visible");
  arbrePopup.innerHTML = "";
  noeudSelectionneId = null;
  rendreArbre();
}

function ouvrirPopupNoeud(noeud) {
  noeudSelectionneId = noeud.id;
  rendreArbre();

  arbrePopup.innerHTML = "";
  arbrePopup.classList.add("visible");

  // On requête le noeud fraîchement redessiné : rendreArbre() vient de
  // remplacer tous les éléments, une référence prise avant serait périmée.
  const divFrais = arbreNoeuds.querySelector('.arbre-noeud[data-id="' + noeud.id + '"]');
  const rect = divFrais.getBoundingClientRect();
  const rectZone = arbreWrap.getBoundingClientRect();
  arbrePopup.style.left = (rect.left - rectZone.left + arbreWrap.scrollLeft) + "px";
  arbrePopup.style.top = (rect.bottom - rectZone.top + arbreWrap.scrollTop + 8) + "px";

  if (noeud.type === "placeholder") {
    construireMenuPlaceholder(noeud);
  } else if (noeud.type === "jeton") {
    construireMenuJeton(noeud);
  } else {
    construireMenuOp(noeud);
  }
}

function construireMenuPlaceholder(noeud) {
  const conteneur = document.createElement("div");
  conteneur.className = "popup-colonnes";

  const colJetons = document.createElement("div");
  colJetons.className = "popup-colonne";
  const titreJetons = document.createElement("div");
  titreJetons.className = "popup-colonne-titre";
  titreJetons.textContent = "Jetons";
  colJetons.appendChild(titreJetons);

  const dispo = indicesDisponibles();
  if (dispo.length > 0) {
    dispo.forEach(idx => {
      const b = document.createElement("button");
      b.className = "popup-jeton-btn";
      b.textContent = String(game.jetons[idx]);
      b.addEventListener("click", () => {
        noeud.type = "jeton";
        noeud.jetonIndex = idx;
        jetonsUtilises.add(idx);
        fermerPopup();
      });
      colJetons.appendChild(b);
    });
  } else {
    const info = document.createElement("div");
    info.className = "popup-info";
    info.textContent = "Tous les jetons sont déjà placés.";
    colJetons.appendChild(info);
  }

  const colOps = document.createElement("div");
  colOps.className = "popup-colonne";
  const titreOps = document.createElement("div");
  titreOps.className = "popup-colonne-titre";
  titreOps.textContent = "Opérations";
  colOps.appendChild(titreOps);
  OPS_ARBRE.forEach(op => {
    const b = document.createElement("button");
    b.className = "popup-op-btn";
    b.textContent = OP_SYMBOLES[op];
    b.addEventListener("click", () => {
      noeud.type = "op";
      noeud.op = op;
      noeud.enfants = [nouveauPlaceholder(noeud), nouveauPlaceholder(noeud)];
      fermerPopup();
    });
    colOps.appendChild(b);
  });

  conteneur.append(colJetons, colOps);
  arbrePopup.appendChild(conteneur);

  ajouterBoutonSupprimerTerme(noeud);
}

// Une case (vide, jeton ou opération) qui est l'un des termes/facteurs d'un
// noeud + ou × à PLUS de deux enfants peut être retirée individuellement,
// sans effacer les autres — contrairement à "Supprimer" qui vide juste la
// case en la laissant à sa place.
function ajouterBoutonSupprimerTerme(noeud) {
  if (!noeud.parent || noeud.parent.enfants.length <= 2) return;
  const ligne = document.createElement("div");
  ligne.className = "popup-ligne";
  const delBtn = document.createElement("button");
  delBtn.className = "popup-danger-btn";
  delBtn.textContent = "Supprimer ce terme";
  delBtn.addEventListener("click", () => {
    supprimerTerme(noeud);
    fermerPopup();
  });
  ligne.appendChild(delBtn);
  arbrePopup.appendChild(ligne);
}

function construireMenuJeton(noeud) {
  const ligne = document.createElement("div");
  ligne.className = "popup-ligne";
  const delBtn = document.createElement("button");
  delBtn.className = "popup-danger-btn";
  delBtn.textContent = "Supprimer";
  delBtn.addEventListener("click", () => {
    jetonsUtilises.delete(noeud.jetonIndex);
    reinitialiserNoeud(noeud);
    fermerPopup();
  });
  ligne.appendChild(delBtn);
  arbrePopup.appendChild(ligne);

  ajouterBoutonSupprimerTerme(noeud);
}

function construireMenuOp(noeud) {
  const ligneOps = document.createElement("div");
  ligneOps.className = "popup-ligne";
  OPS_ARBRE.forEach(op => {
    const b = document.createElement("button");
    b.className = "popup-op-btn" + (op === noeud.op ? " actif" : "");
    b.textContent = OP_SYMBOLES[op];
    b.addEventListener("click", () => {
      noeud.op = op;
      fermerPopup();
    });
    ligneOps.appendChild(b);
  });
  arbrePopup.appendChild(ligneOps);

  const ligneAjout = document.createElement("div");
  ligneAjout.className = "popup-ligne";
  const ajoutBtn = document.createElement("button");
  ajoutBtn.className = "popup-ajout-btn";
  ajoutBtn.textContent = (noeud.op === "+" || noeud.op === "-") ? "+ Ajouter un terme" : "+ Ajouter un facteur";
  ajoutBtn.addEventListener("click", () => {
    noeud.enfants.push(nouveauPlaceholder(noeud));
    fermerPopup();
  });
  ligneAjout.appendChild(ajoutBtn);
  arbrePopup.appendChild(ligneAjout);

  const ligneDel = document.createElement("div");
  ligneDel.className = "popup-ligne";
  const delBtn = document.createElement("button");
  delBtn.className = "popup-danger-btn";
  delBtn.textContent = "Supprimer (avec les enfants)";
  delBtn.addEventListener("click", () => {
    libererIndicesSousArbre(noeud);
    reinitialiserNoeud(noeud);
    fermerPopup();
  });
  ligneDel.appendChild(delBtn);
  arbrePopup.appendChild(ligneDel);

  ajouterBoutonSupprimerTerme(noeud);
}

arbreWrap.addEventListener("click", () => {
  if (arbrePopup.classList.contains("visible")) fermerPopup();
});

// ==================== DÉROULÉ DU JEU ====================
function finQuestion() {
  phase = "next";
  if (modeReponse === "expression") {
    expr.disabled = true;
  } else {
    fermerPopup();
  }
  const skipBtn = document.getElementById("skipButton");

  if (etatJeu === "quiz") {
    btnValider.style.display = "none";
    btnNext.style.display = "inline-flex";
    if (skipBtn) skipBtn.disabled = true;
  } else {
    // Atelier : pas de bouton "Question suivante" séparé — c'est "Je
    // renonce" lui-même qui fait avancer vers un nouveau nombre.
    btnValider.style.display = "none";
    btnNext.style.display = "none";
    if (skipBtn) skipBtn.disabled = false;
  }
}

// Reprend la MÊME question (mêmes jetons, même cible) après une réponse
// fausse : remet la saisie à zéro sans en tirer une nouvelle.
function reessayer() {
  if (!peutReessayer) return;
  peutReessayer = false;
  phase = "saisie";

  definirMessage("", "");
  afficherVerification(null);

  construireGrille();

  if (modeReponse === "expression") {
    pileInsertions = [];
    expr.value = "";
    expr.disabled = false;
  } else {
    jetonsUtilises = new Set();
    noeudSelectionneId = null;
    arbreRoot = nouveauPlaceholder();
    fermerPopup();
    rendreArbre();
  }

  btnValider.style.display = "inline-flex";
  btnValider.disabled = false;
  btnNext.style.display = "none";

  renderPanneauLateral();

  if (modeReponse === "expression") expr.focus();
}

// En quiz : abandon volontaire, révèle une solution possible, compte comme
// une réponse fausse (sans pénalité), puis attend "Question suivante".
// En atelier : ce même bouton "Je renonce" sert juste à passer directement à
// un nouveau nombre, à tout moment.
function renoncer() {
  if (etatJeu === "atelier") {
    nouvelleQuestion();
    return;
  }

  if (phase !== "saisie") return;

  finQuestion();

  if (modeReponse === "expression") {
    document.querySelectorAll(".jeton").forEach(j => {
      j.classList.remove("vert", "faux");
      j.disabled = true;
    });
  }

  definirMessage("Pas de souci, on passe à la suite. 🙂", "erreur");
  afficherVerification(tableauComparatif(`\\[${game.solutionExprLatex}\\]`));
  MathJax.typesetPromise([zoneVerificationContenu]);

  majBandeau();
}

function validerExpression() {
  const nbJetonsRequis = game.jetons.length;
  const usedNums = extractNumbers(expr.value);
  const availableNums = game.jetons.map(String);

  document.querySelectorAll(".jeton").forEach(j => j.classList.remove("vert", "faux"));

  const bonsJetons = checkJetons(usedNums, availableNums);
  const parsed = parseExpressionStrict(expr.value, game.jetons, nbJetonsRequis);

  if (!bonsJetons) {
    let detail;
    if (usedNums.length === 0) {
      detail = "Utilise les jetons : " + availableNums.join(", ") + ".";
    } else if (usedNums.length < availableNums.length) {
      detail = "Il manque au moins un jeton parmi : " + availableNums.join(", ") + ".";
    } else if (usedNums.length > availableNums.length) {
      detail = "Tu utilises trop de nombres : chaque jeton ne sert qu'une seule fois.";
    } else {
      detail = "Les nombres utilisés ne correspondent pas exactement aux jetons proposés.";
    }
    afficherAlerteJetons(usedNums, availableNums, detail);
    expr.focus();
    return;
  }

  if (!parsed) {
    definirMessage(
      "L'expression n'est pas calculable telle quelle." +
      `<span class="detail">${expliquerStructureInvalide(expr.value)}</span>`,
      "erreur"
    );
    afficherVerification(null);
    document.querySelectorAll(".jeton").forEach(j => j.classList.add("vert"));
    expr.focus();
    return;
  }

  const evalFinal = evaluerEtReduireArbre(parsed.arbre, true, { nombreAff: 'fractionSimple' });
  const latex = latexSteps(parsed.arbre, evalFinal.etapes);
  const tableau = tableauComparatif(latex);

  if (parsed.resultat.equal(game.target)) {
    if (etatJeu === "quiz") score++;
    finQuestion();
    document.querySelectorAll(".jeton").forEach(j => j.classList.add("vert"));
    definirMessage("Bravo, c'est exact !", "ok");
    afficherVerification(tableau);
    majBandeau();
    MathJax.typesetPromise([message, zoneVerificationContenu]);
    return;
  }

  peutReessayer = true;
  finQuestion();
  document.querySelectorAll(".jeton").forEach(j => j.classList.add("vert"));
  definirMessage("Ton expression désigne un nombre différent de la cible.", "erreur");
  afficherVerification(tableau);
  majBandeau();
  renderPanneauLateral();
  MathJax.typesetPromise([message, zoneVerificationContenu]);
}

function validerArbre() {
  const calcArbre = construireArbreCalcul(arbreRoot);
  if (!calcArbre) {
    definirMessage(
      "L'arbre n'est pas encore complet." +
      "<span class=\"detail\">Complète toutes les cases en pointillés avant de valider.</span>",
      "erreur"
    );
    return;
  }

  if (jetonsUtilises.size !== game.jetons.length) {
    definirMessage(
      "Il faut utiliser chaque jeton exactement une fois." +
      "<span class=\"detail\">Il reste des jetons dans la réserve qui ne sont pas encore placés dans l'arbre.</span>",
      "erreur"
    );
    return;
  }

  const evalFinal = evaluerEtReduireArbre(calcArbre, true, { nombreAff: 'fractionSimple' });
  if (!evalFinal) {
    definirMessage(
      "Cet arbre n'est pas calculable tel quel." +
      "<span class=\"detail\">Vérifie qu'aucune division par zéro n'apparaît.</span>",
      "erreur"
    );
    afficherVerification(null);
    return;
  }

  const latex = latexSteps(calcArbre, evalFinal.etapes);
  const tableau = tableauComparatif(latex);

  if (evalFinal.nombre.equal(game.target)) {
    if (etatJeu === "quiz") score++;
    finQuestion();
    definirMessage("Bravo, c'est exact !", "ok");
    afficherVerification(tableau);
    majBandeau();
    MathJax.typesetPromise([message, zoneVerificationContenu]);
    return;
  }

  peutReessayer = true;
  finQuestion();
  definirMessage("Ton arbre désigne un nombre différent de la cible.", "erreur");
  afficherVerification(tableau);
  majBandeau();
  renderPanneauLateral();
  MathJax.typesetPromise([message, zoneVerificationContenu]);
}

function valider() {
  if (phase !== "saisie") return;
  if (modeReponse === "expression") validerExpression();
  else validerArbre();
}

// Affiche la zone de réponse correspondant à modeReponse (et masque
// l'autre), et répartit les blocs entre les deux colonnes différemment
// selon le mode :
//   - expression : colonne de gauche = consigne + saisie + valider ;
//     colonne de droite = vérification seule (la saisie texte est compacte,
//     pas besoin de plus de place).
//   - arbre : colonne de gauche = consigne + vérification, regroupées ;
//     colonne de droite = l'arbre seul (il a besoin de place pour grandir).
//     colonneReponse contient toujours l'arbre (elle est la plus large),
//     donc on inverse simplement leur ORDRE visuel plutôt que d'échanger
//     leur contenu.
function appliquerModeReponse() {
  zoneReponseExpression.style.display = modeReponse === "expression" ? "flex" : "none";
  zoneReponseArbre.style.display = modeReponse === "arbre" ? "flex" : "none";
  colonneReponse.style.order = modeReponse === "arbre" ? "2" : "1";
  colonneVerif.style.order = modeReponse === "arbre" ? "1" : "2";

  if (modeReponse === "expression") {
    colonneReponse.appendChild(consigneWrap);
    colonneReponse.appendChild(zoneReponseExpression);
    colonneReponse.appendChild(panel);
    colonneVerif.appendChild(message);
    colonneVerif.appendChild(zoneVerification);
  } else {
    colonneReponse.appendChild(zoneReponseArbre);
    colonneReponse.appendChild(panel);
    colonneVerif.appendChild(consigneWrap);
    colonneVerif.appendChild(message);
    colonneVerif.appendChild(zoneVerification);
  }
}

function nouvelleQuestion() {
  if (etatJeu === "quiz" && questionIndex >= NB_QUESTIONS) {
    afficherFin();
    return;
  }

  peutReessayer = false;
  questionIndex++;

  const d = genererQuestion();
  game = {
    n: d.n,
    jetons: d.jetons,
    solutionExpr: d.expr,
    solutionExprLatex: d.expr.replace(/\*/g, "\\times ").replace(/:/g, "\\div "),
    target: Nombre.fromParts(d.n, 1, 'entier'),
  };

  phase = "saisie";
  majBandeau();

  definirMessage("", "");
  afficherVerification(null);

  rendreConsigne();
  construireGrille();

  if (modeReponse === "expression") {
    pileInsertions = [];
    expr.value = "";
    expr.disabled = false;
  } else {
    jetonsUtilises = new Set();
    noeudSelectionneId = null;
    arbreRoot = nouveauPlaceholder();
    fermerPopup();
    rendreArbre();
  }

  btnValider.style.display = "inline-flex";
  btnValider.disabled = false;
  btnNext.style.display = "none";
  const skipBtn = document.getElementById("skipButton");
  if (skipBtn) skipBtn.disabled = false;

  if (modeReponse === "expression") expr.focus();
}

function afficherFin() {
  phase = "fin";

  consigneWrap.style.display = "none";
  grille.innerHTML = "";
  zoneReponseExpression.style.display = "none";
  zoneReponseArbre.style.display = "none";
  panel.style.display = "none";
  message.textContent = "";
  message.className = "";
  zoneVerification.style.display = "none";

  const pourcentage = Math.round(100 * score / NB_QUESTIONS);
  let commentaire;
  if (pourcentage === 100) commentaire = "Parfait ! Toutes les expressions sont justes. 🎯";
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
  appliquerModeReponse();
  panel.style.display = "flex";
  zoneVerification.style.display = "block";
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
  Object.keys(NIVEAUX_JETONS).forEach(cle => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "param-btn" + (cle === niveauActuel ? " active" : "");
    btn.textContent = NIVEAUX_JETONS[cle].label;
    btn.onclick = () => {
      if (cle === niveauActuel) return;
      niveauActuel = cle;
      relancer();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

// Bascule EXCLUSIVE (un seul mode de réponse actif à la fois).
// Bascule EXCLUSIVE : comment afficher l'expression calculée dans la
// vérification (voir arbreVersLatex). N'affecte que les prochaines
// validations, pas celle déjà affichée à l'écran.
function construireBoutonsParenthese() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";
  const options = [
    { valeur: "parenthese", label: "Parenthésée" },
    { valeur: "priorite", label: "Avec priorités" },
  ];
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "param-btn" + (modeParenthese === opt.valeur ? " active" : "");
    btn.textContent = opt.label;
    btn.onclick = () => {
      if (modeParenthese === opt.valeur) return;
      modeParenthese = opt.valeur;
      renderPanneauLateral();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

function construireBoutonsReponse() {
  const conteneur = document.createElement("div");
  conteneur.className = "param-buttons";
  const options = [
    { valeur: "expression", label: "Expression" },
    { valeur: "arbre", label: "Arbre" },
  ];
  options.forEach(opt => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "param-btn" + (modeReponse === opt.valeur ? " active" : "");
    btn.textContent = opt.label;
    btn.onclick = () => {
      if (modeReponse === opt.valeur) return;
      modeReponse = opt.valeur;
      relancer();
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

  ajouterGroupe("Mode : nb. d'opérations", construireBoutonsMode(false));
  ajouterFilet();
  ajouterGroupe("Niveau", construireBoutonsNiveau());
  ajouterFilet();
  ajouterGroupe("Réponse", construireBoutonsReponse());
  ajouterFilet();
  ajouterGroupe("Expression calculée", construireBoutonsParenthese());
  ajouterFilet();

  const creerBoutonReessayer = () => {
    const btn = document.createElement("button");
    btn.id = "retryButton";
    btn.type = "button";
    btn.className = "panel-btn accent";
    btn.textContent = "Je réessaye";
    btn.onclick = reessayer;
    return btn;
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
    if (peutReessayer) scoreContainer.appendChild(creerBoutonReessayer());
    scoreContainer.appendChild(skipBtn);
    panneau.appendChild(scoreContainer);
  } else {
    const labelAtelier = document.createElement("div");
    labelAtelier.className = "panel-groupe-label";
    labelAtelier.textContent = "Entraînement libre";
    panneau.appendChild(labelAtelier);

    if (peutReessayer) panneau.appendChild(creerBoutonReessayer());

    const skipBtn = document.createElement("button");
    skipBtn.id = "skipButton";
    skipBtn.className = "panel-btn accent";
    skipBtn.textContent = "Je renonce";
    skipBtn.disabled = false;
    skipBtn.onclick = renoncer;
    panneau.appendChild(skipBtn);
  }

  majBandeau();
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
    const d = tirerJetonsEtCible(nbJetons, niveauActuel);
    exercices.push(d);
  }
  return exercices;
}

function formaterCibleHTML(ex) {
  return `<span class="nb">${formaterMilliers(ex.n)}</span>`;
}

function rendreTableauFiche(exercices) {
  const wrap = document.getElementById("ficheTableWrap");
  const nbJetons = MODES[modeActuel].jetons;

  const colsJetons = Array.from({ length: nbJetons }, () => `<col style="width:${44 / nbJetons}%">`).join("");

  const lignes = exercices.map((ex, i) => `
    <tr>
      <td>${i + 1}</td>
      ${ex.jetons.map(j => `<td>${j}</td>`).join("")}
      <td class="col-cible">${formaterCibleHTML(ex)}</td>
      <td class="col-expression"></td>
    </tr>
  `).join("");

  wrap.innerHTML = `
    <table>
      <colgroup>
        <col style="width:8%">
        ${colsJetons}
        <col style="width:17%">
        <col style="width:35%">
      </colgroup>
      <thead>
        <tr>
          <th>N°</th>
          <th colspan="${nbJetons}">Jetons</th>
          <th class="col-cible-th">Cible</th>
          <th>Expression</th>
        </tr>
      </thead>
      <tbody>${lignes}</tbody>
    </table>
  `;
}

function ouvrirFiche() {
  serieFicheActuelle = genererSerieFiche(NB_EXERCICES_FICHE);
  const sousTitre = document.getElementById("ficheSousTitre");
  if (sousTitre) sousTitre.textContent = `Mode : ${MODES[modeActuel].libelle} (${MODES[modeActuel].jetons} jetons par nombre) — Niveau : ${NIVEAUX_JETONS[niveauActuel].label}`;
  document.getElementById("overlayFiche").classList.add("ouvert");
  rendreTableauFiche(serieFicheActuelle);
}

function fermerFiche() {
  document.getElementById("overlayFiche").classList.remove("ouvert");
}

// ---------- Export LaTeX (même structure que compteEstBon/generer_tex.js) ----------
// Contrairement à compteEstBon (qui peut cibler des fractions), les cibles
// ici sont toujours entières (voir Jetons.js) : pas besoin du vphantom sur
// \dfrac{0}{0} que ce dernier utilise pour uniformiser la hauteur des
// lignes avec d'éventuelles fractions — \arraystretch/\extrarowheight
// suffisent seuls à donner des lignes assez hautes pour écrire à la main.
function genererLatexFiche(exercices) {
  const nbJetons = MODES[modeActuel].jetons;

  // Largeurs choisies pour ne jamais déborder de la page en A4 (marges
  // 2cm, donc ~17cm utiles) même au pire cas (mode 4 = 5 colonnes jetons) :
  // vérifié par compilation réelle jusqu'à 5 jetons sans "Overfull \hbox".
  const specColonnes = "|>{\\columncolor{grisFondN}\\centering\\arraybackslash}p{1.0cm}||" +
    Array.from({ length: nbJetons }, () => ">{\\centering\\arraybackslash}p{1.3cm}|").join("") +
    "|>{\\centering\\arraybackslash}p{1.8cm}||>{\\color{ligne}}p{4cm}|";

  const lignes = exercices.map((ex, i) => {
    const cellulesJetons = ex.jetons.map(j => `$${j}$`).join(" & ");
    return `$${i + 1}$ & ${cellulesJetons} & $${formaterMilliers(ex.n, "\\,")}$ & \\\\\n\\hline`;
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
  {\\Huge\\bfseries\\color{ardoise} Le compte est bon}\\\\[20pt]
  {\\large\\color{grisbrun} Avec les jetons, retrouve une expression qui donne le nombre indiqué.}
\\end{center}

\\vspace{10pt}
{\\small\\color{grisbrun}
Opérations autorisées~: $+$, $-$, $\\times$, $\\div$, avec parenthèses si besoin.
Chaque~jeton~doit~être~utilisé~exactement~une~fois.
Mode~: ${MODES[modeActuel].libelle} (${nbJetons} jetons par nombre). Niveau~: ${NIVEAUX_JETONS[niveauActuel].label}.
}
\\vspace{10pt}
\\begin{center}
\\begin{tabular}{${specColonnes}}
\\hline
\\multicolumn{1}{|c||}{\\bfseries N°} &
\\multicolumn{${nbJetons}}{c||}{\\bfseries Jetons} &
\\multicolumn{1}{c||}{\\bfseries Cible} &
\\multicolumn{1}{c|}{\\bfseries Expression} \\\\
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
  a.download = "fiche-compte-est-bon.tex";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==================== ÉVÉNEMENTS ====================
operateursZone.querySelectorAll(".op-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.id === "btnEffacer") { effacerCaractere(); return; }
    inserer(btn.dataset.op);
  });
});

expr.addEventListener("input", () => {
  resynchroniserJetonsDepuisTexte();
  verifierJetonsEnDirect();
});

btnValider.onclick = valider;
btnNext.onclick = nouvelleQuestion;

document.addEventListener("keydown", e => {
  if (e.key !== "Enter") return;
  e.preventDefault();
  if (phase === "saisie") valider();
  else if (phase === "next" && etatJeu === "quiz") nouvelleQuestion();
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
appliquerModeReponse();
renderPanneauLateral();
nouvelleQuestion();
