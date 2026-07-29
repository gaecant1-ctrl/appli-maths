import fractions from "./fractions.js";
import comparaison from "./comparaison.js";
import calculNum from "./calculNum.js";
import developpement from "./developpement.js";
import factorisation from "./factorisation.js";
import arithmetique from "./arithmetique.js";
import aires from "./aires.js";
import perimetre from "./perimetre.js";
import volume from "./volume.js";
import angle from "./angle.js";
import pythagore from "./pythagore.js";
import durees from "./durees.js";
import conversions from "./conversions.js";
import arrondis from "./arrondis.js";
import geometrieBase from "./geometrieBase.js";
import trigonometrie from "./trigonometrie.js";
import thales from "./thales.js";
import proportion from "./proportion.js";
import tauxEvolution from "./tauxEvolution.js";
import echelle from "./echelle.js";
import proportionnalite from "./proportionnalite.js";
import evaluation from "./evaluation.js";
import equation from "./equation.js";
import probabilite from "./probabilite.js";
import statistiques from "./statistiques.js";

/* =========================
   Banque d’exercices
   ========================= */

const banqueFlash = [
  ...fractions,
  ...comparaison,
  ...calculNum,
  ...developpement,
  ...factorisation,
  ...arithmetique,
  ...aires,
  ...perimetre,
  ...volume,
  ...angle,
  ...pythagore,
  ...durees,
  ...conversions,
  ...arrondis,
  ...geometrieBase,
  ...trigonometrie,
  ...thales,
  ...proportion,
  ...tauxEvolution,
  ...echelle,
  ...proportionnalite,
  ...evaluation,
  ...equation,
  ...probabilite,
  ...statistiques
];

const banqueById = Object.fromEntries(
  banqueFlash.map(exo => [exo.id, exo])
);

banqueFlash.forEach(exo => {
  if (!exo.theme) console.warn("Exercice sans thème :", exo.id);
  if (!exo.niveau) console.warn("Exercice sans niveau :", exo.id);
});

/* =========================
   Banque par thème, filtrée par niveau actif
   ========================= */

// Un bouton = un code de niveau ("6", "5", "4", "3"). Plusieurs niveaux
// peuvent être actifs à la fois (niveauxActifs = Set).
function niveauEligible(niveauExo, niveauxActifs) {
  return niveauxActifs.has(niveauExo);
}

// exo.negatif ("oui"/"non") : un exercice de calcul qui fait intervenir des
// valeurs négatives dans l'énoncé. Absent (undefined) ou "non" → toujours
// éligible, jamais filtré par ce bouton — seuls les exercices tagués
// explicitement "oui" dépendent de avecNegatifs.
function negatifEligible(exo, avecNegatifs) {
  return exo.negatif !== "oui" || avecNegatifs;
}

// exo.cours ("oui"/absent) : question de cours plutôt qu'exercice
// d'entraînement classique. Piloté par le panneau "Cours" (trois boutons
// exclusifs) :
//   - "aucun"    (défaut) : seuls les exos SANS cours:"oui" sont éligibles.
//   - "tous"     : seuls les exos AVEC cours:"oui" sont éligibles.
//   - "melanger" : tous éligibles, cours et exercices classiques mélangés.
function coursEligible(exo, modeCours) {
  const estCours = exo.cours === "oui";
  if (modeCours === "tous") return estCours;
  if (modeCours === "melanger") return true;
  return !estCours; // "aucun"
}

// Recalculées à chaque changement de sélection (cf. toggleNiveau,
// toggleNegatifs) : seules les questions d'un niveau actif, et respectant
// le filtre "relatifs", peuvent être piochées.
let banqueParTheme = {};
let themes = [];

// Noms affichés dans l'overlay de paramétrage des thèmes (panneau "Thème").
// Un thème absent de cette table est affiché tel quel (slug brut).
const THEME_LABELS = {
  "fractions": "Fractions",
  "comparaison": "Comparaison",
  "calcul-num": "Calcul numérique",
  "developpement": "Développement",
  "factorisation": "Factorisation",
  "arithmetique": "Arithmétique",
  "aires": "Aires",
  "perimetre": "Périmètres",
  "volume": "Volumes",
  "angle": "Angles",
  "pythagore": "Pythagore",
  "durees": "Durées",
  "conversion": "Conversions",
  "arrondis": "Arrondis",
  "geometrieBase": "Géométrie",
  "trigonometrie": "Trigonométrie",
  "thales": "Thalès",
  "proportion": "Proportion",
  "tauxEvolution": "Taux d'évolution",
  "echelle": "Échelle",
  "proportionnalite": "Proportionnalité",
  "evaluation": "Évaluation",
  "equation": "Équations",
  "probabilite": "Probabilité",
  "statistiques": "Statistiques"
};

// Regroupement des thèmes en deux colonnes dans l'overlay de paramétrage
// (voir themes-overlay.js) : géométrie vs calcul. Un thème absent de cette
// table tombe par défaut dans "calcul".
const THEME_CATEGORIES = {
  "aires": "geometrie",
  "perimetre": "geometrie",
  "volume": "geometrie",
  "angle": "geometrie",
  "pythagore": "geometrie",
  "geometrieBase": "geometrie",
  "trigonometrie": "geometrie",
  "thales": "geometrie",
  "echelle": "geometrie"
};

function recalculerBanqueEligible(niveauxActifs, avecNegatifs, modeCours) {
  banqueParTheme = {};
  banqueFlash.forEach(exo => {
    if (!exo.theme || !niveauEligible(exo.niveau, niveauxActifs)) return;
    if (!negatifEligible(exo, avecNegatifs)) return;
    if (!coursEligible(exo, modeCours)) return;
    if (!banqueParTheme[exo.theme]) banqueParTheme[exo.theme] = [];
    banqueParTheme[exo.theme].push(exo.id);
  });
  themes = Object.keys(banqueParTheme);
}

let modeCorrection = false;

// Mode compact (bouton "⚡ FLASH") : masque les boutons de régénération de
// chaque question, remplacés par un simple bouton de correction
// individuelle — indépendant du mode saisie (qui a déjà son propre bouton
// dans .saisie une fois verrouillé).
let modeCompact = false;

// Rappel optionnel déclenché à chaque réponse verrouillée (ok ou faux, pas
// "invalide") — utilisé par le quiz pour tenir le score à jour, sans que
// QuestionDiv ait besoin de connaître son existence.
let onReponseCallback = null;

/* =========================
   QuestionDiv
   ========================= */

class QuestionDiv {
  constructor(parent, params) {
    this.parent = parent;
    this.params = params; // { numero, typeId }
    this.data = null;
    this.mode = "question"; // ou "correction"


    this.container = document.createElement("div");
    this.container.className = "question";

    this._buildDOM();
    parent.appendChild(this.container);   // ⬅️ IMPORTANT : AVANT MathJax

    this.generate();
    this.render();
  }

  // Trois zones, chacune son div, chacune son propre contenu remplacé selon
  // l'état (comme .enonce entre question et correction) :
  //   .enonce   — consigne OU correction
  //   .saisie   — champ + bouton "Vérifier" (jamais de texte de feedback ici)
  //   .controls — boutons de régénération (mode classe) OU statut/bascule
  //               de correction individuelle (mode saisie)
  _buildDOM() {
    this.container.innerHTML = `
      <div class="numero">${this.params.numero})</div>
      <div class="enonce"></div>
      <div class="saisie" hidden></div>
      <div class="controls"></div>
    `;

    this.numeroDiv = this.container.querySelector(".numero");
    this.enonceDiv = this.container.querySelector(".enonce");
    this.saisieDiv = this.container.querySelector(".saisie");
    this.controlsDiv = this.container.querySelector(".controls");

    // Délégation d'événements : le contenu de .saisie et .controls est
    // remplacé (innerHTML) à chaque changement d'état ; on ne réattache
    // donc jamais d'écouteur directement sur leurs enfants.
    this.saisieDiv.addEventListener("click", (e) => {
      if (e.target.closest(".check")) this.verifierReponse();
      if (e.target.closest(".toggle-correction")) this.toggleCorrectionIndividuelle();
    });

    this.saisieDiv.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.classList.contains("reponse-input")) {
        this.verifierReponse();
      }
    });

    this.controlsDiv.addEventListener("click", (e) => {
      if (e.target.closest(".valeur")) engine.regenerate(this);
      if (e.target.closest(".type")) engine.changeTypeSameTheme(this);
      if (e.target.closest(".theme")) engine.changeTheme(this);
      if (e.target.closest(".up")) engine.moveUp(this);
      if (e.target.closest(".choix-theme")) engine.ouvrirSelecteurThemeQuestion(this);
      if (e.target.closest(".cours")) engine.regenererCours(this);
      if (e.target.closest(".toggle-correction")) this.toggleCorrectionIndividuelle();
    });
  }

  setNumero(n) {
    this.params.numero = n;
    this.numeroDiv.textContent = `${n})`;
  }

  /* ---------- données ---------- */

  generate() {
    const exo = banqueById[this.params.typeId];
    this.data = exo.gen();
    // Nouvel exercice : la réponse (le cas échéant) redevient modifiable.
    this.saisieVerrouillee = false;
    this.saisieOk = null;
    this.saisieInvalide = false;
    this.saisieBrouillon = "";
    this.saisieMalEcrit = false;
    this.saisiePresque = false;
  }

  /* ---------- rendu UNIQUE ---------- */

render() {
  const contenu =
    this.mode === "question"
      ? this.data.latex
      : (this.data.correction ?? "\\text{(pas de correction)}");

  this.enonceDiv.innerHTML = QuestionDiv._latexEnLignes(contenu);
  MathJax.typesetClear([this.enonceDiv]);
  MathJax.typesetPromise([this.enonceDiv]);

  this._renderSaisie();
  this._renderControls();
}

// \\[Npt] (saut de ligne display-math) n'est pas fiable tel quel dans le
// rendu HTML — MathJax ne le traduit pas toujours en vrai retour à la
// ligne visible. On scinde plutôt le contenu en plusieurs blocs \[...\]
// distincts, séparés par un <br> HTML réel — enveloppés dans un <div>
// unique, sinon .enonce (display:flex) place chaque bloc comme un item
// flex côte à côte et ignore le <br>.
static _latexEnLignes(contenu) {
  const lignes = contenu.split(/\\\\(?:\[[^\]]*\])?/);
  return `<div>${lignes.map(l => `\\[${l}\\]`).join("<br>")}</div>`;
}

setMode(mode) {
  this.mode = mode;
  this.render();
}

  /* ---------- réponse en ligne (option, indépendante du mode collectif) ----------
     Même principe que .enonce : un seul conteneur (.saisie) dont le contenu
     HTML est remplacé selon l'état, plutôt que plusieurs éléments qu'on
     cache/affiche individuellement.

     Une fois la réponse verrouillée, on ne réaffiche plus jamais "réponse : X"
     à côté du champ : pour voir la correction, le bouton (devenu bascule)
     remplace le CONTENU DE L'ÉNONCÉ par la correction — exactement le même
     mécanisme que le bouton ✓ global (this.mode), mais appliqué à cette
     seule question. */

  // Échappe les caractères HTML avant injection via innerHTML (sécurité :
  // la saisie vient de l'utilisateur).
  static _echapperHtml(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // .saisie : uniquement le champ + son bouton "Vérifier" (avant réponse),
  // ou la réponse verrouillée rendue en LaTeX (après). Jamais de texte de
  // feedback ici — ça, c'est le rôle de .controls (cf. _renderControls).
  _renderSaisie() {
    if (typeof this.data.verifier !== "function" || !engine.isSaisieMode()) {
      this.saisieDiv.hidden = true;
      return;
    }

    if (this.saisieVerrouillee) {
      // Réponse déjà donnée : toujours visible (question ou correction).
      this.saisieDiv.hidden = false;
      const classe = this.saisieOk ? "ok" : "ko";
      const actif = this.mode === "correction" ? "actif" : "";
      this.saisieDiv.innerHTML = `
        <span class="reponse-rendue ${classe}">$${this.saisieLatex}$</span>
        <button class="toggle-correction ${actif}" title="Voir / masquer la correction">✓</button>
      `;
    } else {
      // Pas encore répondu (ou réponse "invalide", non reconnue) :
      // uniquement visible sur l'énoncé, jamais sur la correction.
      this.saisieDiv.hidden = this.mode !== "question";
      if (this.saisieDiv.hidden) return;

      const valeur = QuestionDiv._echapperHtml(this.saisieBrouillon);
      this.saisieDiv.innerHTML = `
        <input type="text" class="reponse-input" placeholder="réponse" autocomplete="off" spellcheck="false" value="${valeur}">
        <button class="check" title="Vérifier">✓</button>
      `;

      if (this.saisieInvalide) {
        const inputEl = this.saisieDiv.querySelector(".reponse-input");
        inputEl.focus();
        inputEl.select();
      }
    }

    MathJax.typesetClear([this.saisieDiv]);
    MathJax.typesetPromise([this.saisieDiv]);
  }

  // .controls : les 4 boutons de régénération (mode classe), OU le
  // feedback de réponse + bascule de correction individuelle (mode saisie).
  // Jamais les deux : en mode saisie on ne peut pas esquiver une question.
  _renderControls() {
    if (!engine.isSaisieMode()) {
      if (engine.isCompactMode()) {
        // Mode compact : un seul bouton de correction individuelle, à la
        // place des 4 boutons de régénération.
        this.controlsDiv.classList.add("feedback");
        const actif = this.mode === "correction" ? "actif" : "";
        this.controlsDiv.innerHTML = `
          <button class="toggle-correction ${actif}" title="Voir / masquer la correction">✓</button>
        `;
        return;
      }
      this.controlsDiv.classList.remove("feedback");
      this.controlsDiv.innerHTML = `
        <button class="valeur" title="Nouvelles valeurs">🔁</button>
        <button class="theme" title="Changer de thème">🧩</button>
        <button class="cours" title="Cours">📖</button>

        <button class="type" title="Autre question (même thème)">🎲</button>
        <button class="choix-theme" title="Choisir le thème">🗂️</button>
        <button class="up" title="Remonter">⬆</button>
        
      `;
      return;
    }

    this.controlsDiv.classList.add("feedback");

    if (typeof this.data.verifier !== "function") {
      this.controlsDiv.innerHTML = "";
      return;
    }

    if (this.saisieInvalide) {
      const msg = this.saisieMalEcrit
        ? "correct mais mal écrit"
        : (this.saisiePresque ? "presque ! relis bien" : "format inattendu");
      this.controlsDiv.innerHTML = `<span class="feedback-invalide">${msg}</span>`;
      return;
    }

    if (!this.saisieVerrouillee) {
      this.controlsDiv.innerHTML = "";
      return;
    }

    const classe = this.saisieOk ? "ok" : "ko";
    const label = this.saisieOk ? "réponse correcte" : "mauvaise réponse";
    this.controlsDiv.innerHTML = `
      <span class="statut ${classe}">${label}</span>
    `;
  }

  verifierReponse() {
    if (typeof this.data.verifier !== "function") return;
    const input = this.saisieDiv.querySelector(".reponse-input");
    const saisie = input ? input.value : "";
    const { ok, invalide, saisieLatex, malEcrit, presque } = this.data.verifier(saisie);

    if (invalide) {
      // Format non reconnu, "mal écrit" ou "presque juste" (voir
      // reponse.js) : pas de verrouillage, l'élève corrige librement.
      this.saisieVerrouillee = false;
      this.saisieInvalide = true;
      this.saisieMalEcrit = !!malEcrit;
      this.saisiePresque = !!presque;
      this.saisieBrouillon = saisie;
    } else {
      // Une fois vérifiée, la réponse est figée : on ne peut plus la modifier.
      // Rendu LaTeX fourni par le moteur qui a reconnu le type de réponse
      // (reponse.js ou le vérificateur local) — pas une reconstruction
      // approximative ici.
      this.saisieVerrouillee = true;
      this.saisieInvalide = false;
      this.saisieOk = ok;
      this.saisieLatex = saisieLatex;
      if (onReponseCallback) onReponseCallback();
    }

    this._renderSaisie();
    this._renderControls();
  }

  // Bascule énoncé / correction pour cette seule question (même mécanisme
  // que le bouton ✓ global, appliqué localement).
  toggleCorrectionIndividuelle() {
    this.mode = this.mode === "correction" ? "question" : "correction";
    this.render();
  }

  destroy() {
    this.container.remove();
  }
}

/* =========================
   Engine global FLASH
   ========================= */

const engine = (() => {

  const parent = document.getElementById("flash");
  const questions = [];
  const MIN = 1;

  // Niveaux actifs (panneau latéral, boutons "6e"/"5e"/"4e/3e") : plusieurs
  // peuvent être sélectionnés à la fois — seules les questions dont
  // exo.niveau correspond à L'UN d'eux peuvent être piochées. Par défaut
  // seul "6" est actif : c'est le seul niveau actuellement renseigné sur
  // les exercices (les autres seront tagués ensuite) — démarrer avec un
  // autre niveau actif afficherait une liste vide.
  const niveauxActifs = new Set(["6"]);

  // Bouton "Avec relatifs" (panneau latéral) : inclut ou non les exercices
  // de calcul tagués negatif:"oui". Désactivé par défaut, comme
  // niveauxActifs démarre sur "6" seul.
  let avecNegatifs = false;

  // Panneau "Thème" : "tous" (défaut) pioche parmi tous les thèmes
  // accessibles pour les niveaux actifs ; "parametrer" restreint le tirage
  // aux thèmes cochés dans l'overlay (voir themes-overlay.js).
  let filtreThemeMode = "tous";
  const themesCoches = new Set();

  // Panneau "Cours" (trois boutons exclusifs) : "aucun" par défaut, voir
  // coursEligible() ci-dessus.
  let modeCours = "aucun";

  recalculerBanqueEligible(niveauxActifs, avecNegatifs, modeCours);

  function getNiveaux() {
    return [...niveauxActifs];
  }

  function getAvecNegatifs() {
    return avecNegatifs;
  }

  // Pool réellement utilisé pour le tirage (randomTheme/nextTheme/shuffleAll) :
  // en mode "tous", exactement `themes` (tous les thèmes accessibles au
  // niveau actif) ; en mode "parametrer", l'intersection avec les thèmes
  // cochés — jamais vide en pratique (voir relancerSelonFiltres, qui
  // retombe sur "tous" si l'intersection serait vide).
  function themesActifsPourPioche() {
    if (filtreThemeMode === "tous") return themes;
    const actifs = themes.filter(t => themesCoches.has(t));
    return actifs.length ? actifs : themes;
  }

  function getFiltreThemeMode() {
    return filtreThemeMode;
  }

  // Liste des thèmes accessibles pour les niveaux/négatifs actifs, avec
  // leur état coché courant — sert à peupler l'overlay de paramétrage.
  function getThemesDisponibles() {
    return themes.map(t => ({
      theme: t,
      label: THEME_LABELS[t] || t,
      categorie: THEME_CATEGORIES[t] || "calcul",
      coche: filtreThemeMode === "tous" || themesCoches.has(t)
    }));
  }

  function setFiltreThemeTous() {
    filtreThemeMode = "tous";
    relancerSelonFiltres();
  }

  // Bascule vers le mode "parametrer" : la première fois (ou après un
  // retour à "tous"), la sélection démarre sur TOUS les thèmes actuellement
  // accessibles — l'utilisateur décoche ensuite ce qu'il veut exclure.
  function activerParametrageTheme() {
    if (filtreThemeMode !== "parametrer") {
      themesCoches.clear();
      themes.forEach(t => themesCoches.add(t));
      filtreThemeMode = "parametrer";
      relancerSelonFiltres();
    }
  }

  // Coche/décoche un thème (mode "parametrer" uniquement) ; toujours au
  // moins un thème coché, même principe que toggleNiveau.
  function toggleThemeCoche(theme) {
    if (themesCoches.has(theme)) {
      if (themesCoches.size === 1) return;
      themesCoches.delete(theme);
    } else {
      themesCoches.add(theme);
    }
    relancerSelonFiltres();
  }

  // Actions groupées de l'overlay ("Tous"/"Aucun" au-dessus de la liste) :
  // contrairement à toggleThemeCoche, pas de garde "au moins un" ici — c'est
  // une action délibérée (repartir de zéro pour cocher juste quelques
  // thèmes, ou tout réactiver d'un coup). themesActifsPourPioche() retombe
  // de toute façon sur `themes` si la sélection cochée est vide.
  function cocherTousLesThemes() {
    themes.forEach(t => themesCoches.add(t));
    relancerSelonFiltres();
  }

  function decocherTousLesThemes() {
    themesCoches.clear();
    relancerSelonFiltres();
  }

  // ---- Choix direct du thème d'UNE question (bouton 🗂️ par question) ----
  // L'overlay lui-même (radio, démarre à vide, un seul choix possible) vit
  // hors d'engine.js (voir theme-question-overlay.js) : engine ne fait que
  // déléguer l'ouverture au callback enregistré, et applique le résultat.
  let onOuvrirSelecteurThemeQuestion = null;

  function definirOuvreurSelecteurThemeQuestion(callback) {
    onOuvrirSelecteurThemeQuestion = callback;
  }

  function ouvrirSelecteurThemeQuestion(q) {
    if (onOuvrirSelecteurThemeQuestion) onOuvrirSelecteurThemeQuestion(q);
  }

  // Relance CETTE SEULE question sur un exercice au hasard du thème choisi
  // (parmi les niveaux/relatifs actifs — mêmes ids que dans banqueParTheme).
  function choisirThemePourQuestion(q, theme) {
    if (!banqueParTheme[theme] || banqueParTheme[theme].length === 0) return;
    q.params.typeId = randomTypeInTheme(theme);
    q.generate();
    q.render();
  }

  // Vide la liste et repioche `nb` questions neuves (thème/type au hasard,
  // parmi les niveaux actifs). Utilisé au changement de niveau et par le
  // quiz (nombre de questions choisi par l'utilisateur).
  function relancer(nb) {
    questions.forEach(q => q.destroy());
    questions.length = 0;

    if (themesActifsPourPioche().length === 0) {
      console.warn(`Aucun exercice disponible pour les niveaux "${[...niveauxActifs].join(', ')}".`);
      return;
    }

    // Lot construit d'un coup (pas addQuestion() en boucle) : permet
    // d'éviter, tant que c'est possible, qu'un même exercice apparaisse
    // deux fois dans la même série — utile aussi bien pour le reset de
    // l'atelier que pour le tirage du quiz.
    const themesChoisis = tirerThemesSansRepetitionAdjacente(nb);
    const idsChoisis = assignerIdsSansDoublon(themesChoisis);
    themesChoisis.forEach((theme, i) => {
      const q = new QuestionDiv(parent, { numero: i + 1, typeId: idsChoisis[i] });
      questions.push(q);
    });

    // Contrairement à addQuestion() seul (bouton "+" de l'atelier, qui se
    // cale en bas sur la dernière question ajoutée), relancer() reconstruit
    // toute la liste d'un coup (reset atelier, lancement du quiz) : on
    // repart du haut, sur la question 1.
    parent.scrollTop = 0;
  }

  function relancerSelonFiltres() {
    recalculerBanqueEligible(niveauxActifs, avecNegatifs, modeCours);

    // Un changement de niveau peut rendre inaccessibles des thèmes cochés
    // dans l'overlay : on les retire. On NE force PAS un retour à "tous" si
    // plus rien ne reste coché — c'est aussi l'état attendu juste après
    // "Aucun" (l'utilisateur va cocher un par un) ; themesActifsPourPioche()
    // retombe de toute façon sur `themes` tant que rien n'est coché, donc le
    // tirage continue de fonctionner sans liste vide.
    if (filtreThemeMode === "parametrer") {
      [...themesCoches].forEach(t => { if (!themes.includes(t)) themesCoches.delete(t); });
    }

    // Changer les niveaux ou le filtre "relatifs" relance le choix des
    // questions : on ne réutilise pas les questions précédentes
    // (thème/type qui peuvent ne plus exister dans la sélection), on
    // repart d'une sélection neuve.
    relancer(Math.max(questions.length, MIN));
  }

  /* ---------- quiz : score et suivi de réponse ---------- */

  function getScore() {
    const total = questions.length;
    const repondues = questions.filter(q => q.saisieVerrouillee).length;
    const correct = questions.filter(q => q.saisieOk === true).length;
    return { total, repondues, correct };
  }

  // Instantané des questions actuellement affichées dans l'atelier (mêmes
  // énoncés/corrections que ceux à l'écran) — utilisé par la fiche papier,
  // qui n'en génère jamais de nouvelles de son côté.
  function getQuestionsData() {
    return questions.map(q => ({
      numero: q.params.numero,
      latex: q.data.latex,
      correction: q.data.correction
    }));
  }

  function onReponse(callback) {
    onReponseCallback = callback;
  }

  // Bascule un niveau dans/hors de la sélection. Toujours au moins un
  // niveau actif : un clic qui viderait la sélection est ignoré.
  function toggleNiveau(code) {
    if (niveauxActifs.has(code)) {
      if (niveauxActifs.size === 1) return;
      niveauxActifs.delete(code);
    } else {
      niveauxActifs.add(code);
    }
    relancerSelonFiltres();
  }

  // Bascule le filtre "Avec relatifs" (simple booléen, pas un Set : un
  // seul bouton, pas de multi-sélection à gérer).
  function toggleNegatifs() {
    avecNegatifs = !avecNegatifs;
    relancerSelonFiltres();
  }

  function getModeCours() {
    return modeCours;
  }

  // Panneau "Cours" : trois boutons exclusifs ("aucun"/"tous"/"melanger"),
  // même principe que le panneau "Thème" (Tous/Paramétrer) — un seul actif
  // à la fois, jamais de multi-sélection.
  function setModeCours(mode) {
    if (!["aucun", "tous", "melanger"].includes(mode) || mode === modeCours) return;
    modeCours = mode;
    relancerSelonFiltres();
  }

  // Mode réponse en ligne : option indépendante du mode collectif/interro
  // (modeCorrection). Par défaut désactivé : on garde le fonctionnement
  // actuel (affichage collectif, correction au bandeau) tel quel.
  let modeSaisie = false;

  function isSaisieMode() {
    return modeSaisie;
  }

  function toggleSaisie() {
    modeSaisie = !modeSaisie;
    questions.forEach(q => q.render());
  }

  function isCompactMode() {
    return modeCompact;
  }

  function toggleCompact() {
    modeCompact = !modeCompact;
    questions.forEach(q => q.render());
  }

  /* ---------- util ---------- */

  function randomTheme(exclude = null) {
    const pool = themesActifsPourPioche();
    if (pool.length === 0) return null;
    let t;
    do {
      t = pool[Math.floor(Math.random() * pool.length)];
    } while (t === exclude && pool.length > 1);
    return t;
  }

  function randomTypeInTheme(theme, exclude = null) {
    const ids = banqueParTheme[theme].filter(id => id !== exclude);
    return ids[Math.floor(Math.random() * ids.length)];
  }

  // Comme randomTypeInTheme, mais exclut tout un ENSEMBLE d'ids déjà
  // utilisés (pas qu'un seul) — utilisé par shuffleAll() pour éviter, tant
  // que c'est possible, qu'un même exercice se retrouve deux fois dans le
  // même coup de dé. Repli sur tous les ids du thème si celui-ci n'en a pas
  // d'autre à offrir (doublon alors inévitable).
  function randomTypeInThemeExcluant(theme, dejaUtilises) {
    const ids = banqueParTheme[theme];
    const possibles = ids.filter(id => !dejaUtilises.has(id));
    const pool = possibles.length ? possibles : ids;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  // Tire `nb` thèmes (au hasard dans le pool actif), en essayant d'éviter
  // deux thèmes identiques consécutifs. `themeInterditParIndex(i)`, si
  // fourni, exclut en plus un thème précis à cette position (ex: l'ancien
  // thème de la question i, pour shuffleAll — garantit qu'elle change
  // vraiment). Utilisé par relancer() et shuffleAll().
  function tirerThemesSansRepetitionAdjacente(nb, themeInterditParIndex = null) {
    const pool = themesActifsPourPioche();
    if (pool.length === 0 || nb === 0) return [];

    let choisis;
    let essais = 0;
    do {
      essais++;
      choisis = Array.from({ length: nb }, (_, i) => {
        const interdit = themeInterditParIndex ? themeInterditParIndex(i) : null;
        const possibles = interdit ? pool.filter(t => t !== interdit) : pool;
        const options = possibles.length ? possibles : pool;
        return options[Math.floor(Math.random() * options.length)];
      });
    } while (
      essais < 50 &&
      choisis.some((t, i) => i > 0 && t === choisis[i - 1])
    );

    return choisis;
  }

  // Associe à chaque thème d'un lot un id d'exercice, en essayant de ne
  // jamais réutiliser un id déjà distribué ailleurs dans le MÊME lot (voir
  // randomTypeInThemeExcluant) — doublon accepté seulement si un thème n'a
  // plus rien d'inédit à offrir. Utilisé par relancer() et shuffleAll().
  function assignerIdsSansDoublon(themesChoisis) {
    const idsUtilises = new Set();
    return themesChoisis.map(theme => {
      const typeId = randomTypeInThemeExcluant(theme, idsUtilises);
      idsUtilises.add(typeId);
      return typeId;
    });
  }

  function renumeroter() {
    questions.forEach((q, i) => q.setNumero(i + 1));
  }

  /* ---------- création ---------- */

  function addQuestion() {
    const theme = randomTheme();
    if (!theme) {
      console.warn(`Aucun exercice disponible pour le niveau "${niveauActif}".`);
      return;
    }
    const typeId = randomTypeInTheme(theme);
    const numero = questions.length + 1;

    const q = new QuestionDiv(parent, { numero, typeId });
    questions.push(q);

    // #flash défile sur son propre axe (voir style.css) : on se cale sur
    // la dernière question ajoutée plutôt que de rester en haut.
    parent.scrollTop = parent.scrollHeight;
  }

  function removeQuestion() {
    if (questions.length <= MIN) return;
    const q = questions.pop();
    q.destroy();
    renumeroter();
  }

  /* ---------- actions locales ---------- */

  function regenerate(q) {
    q.generate();
    q.render();
  }
  
  function toggleCorrection() {
  modeCorrection = !modeCorrection;
  const mode = modeCorrection ? "correction" : "question";
  questions.forEach(q => q.setMode(mode));
}

  function isCorrectionMode() {
    return modeCorrection;
  }


  // Id suivant dans l'ordre de banqueParTheme[theme] (cycle), pas un id
  // aléatoire — un clic répété sur 🎲 parcourt tous les types du thème
  // dans le même ordre plutôt que de retomber au hasard sur un déjà vu.
  function nextTypeInTheme(theme, idActuel) {
    const ids = banqueParTheme[theme];
    if (!ids || ids.length === 0) return null;
    const i = ids.indexOf(idActuel);
    if (i === -1) return ids[0];
    return ids[(i + 1) % ids.length];
  }

  function changeTypeSameTheme(q) {
    const theme = banqueById[q.params.typeId].theme;
    q.params.typeId = nextTypeInTheme(theme, q.params.typeId);
    q.generate();
    q.render();
  }

  // Thème suivant dans l'ordre de `themes` (cycle), pas un thème
  // aléatoire — un clic répété sur 🧩 parcourt tous les thèmes dans le
  // même ordre plutôt que de retomber au hasard sur un déjà vu.
  function nextTheme(themeActuel) {
    const pool = themesActifsPourPioche();
    if (pool.length === 0) return null;
    const i = pool.indexOf(themeActuel);
    if (i === -1) return pool[0];
    return pool[(i + 1) % pool.length];
  }

  function changeTheme(q) {
    const oldTheme = banqueById[q.params.typeId].theme;
    const newTheme = nextTheme(oldTheme);
    q.params.typeId = randomTypeInTheme(newTheme);
    q.generate();
    q.render();
  }

  // Bouton 📖 (par question) : bascule cette question sur la question de
  // cours du même thème, aux niveaux actifs — indépendant du panneau
  // "Cours" (qui filtre le tirage global, pas une question précise).
  // Sans effet si le thème n'a pas de question de cours à ces niveaux.
  function regenererCours(q) {
    const theme = banqueById[q.params.typeId].theme;
    const idCours = banqueFlash.find(
      exo => exo.theme === theme && exo.cours === "oui" && niveauxActifs.has(exo.niveau)
    )?.id;
    if (!idCours) return;
    q.params.typeId = idCours;
    q.generate();
    q.render();
  }

  /* ---------- déplacement ---------- */

function moveUp(q) {
  const i = questions.indexOf(q);
  if (i <= 0) return; // déjà en haut ou introuvable

  // retirer la question
  questions.splice(i, 1);

  // la mettre en première position
  questions.unshift(q);

  // DOM : insérer tout en haut
  parent.insertBefore(q.container, parent.firstChild);

  // renumérotation
  renumeroter();
}


  /* ---------- shuffle global ---------- */

  function shuffleAll() {
    const n = questions.length;
    if (n === 0) return;

    const anciensThemes = questions.map(
      q => banqueById[q.params.typeId].theme
    );
    const nouveauxThemes = tirerThemesSansRepetitionAdjacente(n, i => anciensThemes[i]);
    const idsChoisis = assignerIdsSansDoublon(nouveauxThemes);

    questions.forEach(q => q.destroy());
    questions.length = 0;

    nouveauxThemes.forEach((theme, i) => {
      const q = new QuestionDiv(parent, { numero: i + 1, typeId: idsChoisis[i] });
      questions.push(q);
    });
  }


function shuffleOneTheme() {
  if (questions.length === 0) return;

  // thème de référence = question 1
  const theme = banqueById[questions[0].params.typeId].theme;

  // tous les types possibles pour ce thème
  const allTypeIds = [...banqueParTheme[theme]];

  // shuffle utilitaire
  const shuffle = arr => arr.sort(() => Math.random() - 0.5);

  // on mélange les types
  shuffle(allTypeIds);

  questions.forEach((q, i) => {
    let typeId;

    if (i < allTypeIds.length) {
      // pas de doublon tant que possible
      typeId = allTypeIds[i];
    } else {
      // plus de types disponibles → doublon autorisé
      typeId = allTypeIds[Math.floor(Math.random() * allTypeIds.length)];
    }

    q.params.typeId = typeId;
    q.generate();
    q.setMode(modeCorrection ? "correction" : "question");
  });
}


  /* ---------- init ---------- */

  function init(nb = 5) {
    for (let i = 0; i < nb; i++) addQuestion();
    // Chaque addQuestion() cale la vue sur la dernière question ajoutée
    // (parent.scrollTop = scrollHeight) : sur le chargement initial, ça
    // masquait la question 1 dès que #flash est plus bas que le contenu
    // (5 lignes maxi désormais, voir style.css) — comme relancer(), on
    // repart explicitement du haut une fois la série construite.
    parent.scrollTop = 0;
  }

  return {
    init,
    addQuestion,
    removeQuestion,
    shuffleAll,
    shuffleOneTheme,   // ⬅️ AJOUT
    regenerate,
    changeTypeSameTheme,
    changeTheme,
    regenererCours,
    moveUp,
    toggleCorrection,
    isCorrectionMode,
    isSaisieMode,
    toggleSaisie,
    isCompactMode,
    toggleCompact,
    getNiveaux,
    toggleNiveau,
    getAvecNegatifs,
    toggleNegatifs,
    getModeCours,
    setModeCours,
    getFiltreThemeMode,
    getThemesDisponibles,
    setFiltreThemeTous,
    activerParametrageTheme,
    toggleThemeCoche,
    cocherTousLesThemes,
    decocherTousLesThemes,
    definirOuvreurSelecteurThemeQuestion,
    ouvrirSelecteurThemeQuestion,
    choisirThemePourQuestion,
    relancer,
    getScore,
    getQuestionsData,
    onReponse
  };


})();

export default engine;
