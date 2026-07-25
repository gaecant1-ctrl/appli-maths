import fractions from "./fractions.js";
import comparaison from "./comparaison.js";
import calculNum from "./calculNum.js";
import calculLit from "./calculLit.js";
import arithmetique from "./arithmetique.js";
import aires from "./aires.js";
import perimetre from "./perimetre.js";
import volume from "./volume.js";
import angle from "./angle.js";
import pythagore from "./pythagore.js";
import durees from "./durees.js";
import conversions from "./conversions.js";
import arrondis from "./arrondis.js";

/* =========================
   Banque d’exercices
   ========================= */

const banqueFlash = [
  ...fractions,
  ...comparaison,
  ...calculNum,
  ...calculLit,
  ...arithmetique,
  ...aires,
  ...perimetre,
  ...volume,
  ...angle,
  ...pythagore,
  ...durees,
  ...conversions,
  ...arrondis
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

// Recalculées à chaque changement de sélection (cf. toggleNiveau,
// toggleNegatifs) : seules les questions d'un niveau actif, et respectant
// le filtre "relatifs", peuvent être piochées.
let banqueParTheme = {};
let themes = [];

function recalculerBanqueEligible(niveauxActifs, avecNegatifs) {
  banqueParTheme = {};
  banqueFlash.forEach(exo => {
    if (!exo.theme || !niveauEligible(exo.niveau, niveauxActifs)) return;
    if (!negatifEligible(exo, avecNegatifs)) return;
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
        <button class="type" title="Autre question (même thème)">🎲</button>
        <button class="theme" title="Changer de thème">🧩</button>
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
      this.controlsDiv.innerHTML = `<span class="feedback-invalide">format inattendu</span>`;
      return;
    }

    if (!this.saisieVerrouillee) {
      this.controlsDiv.innerHTML = "";
      return;
    }

    const classe = this.saisieOk ? "ok" : "ko";
    this.controlsDiv.innerHTML = `
      <span class="statut ${classe}">${this.saisieOk ? "réponse correcte" : "mauvaise réponse"}</span>
    `;
  }

  verifierReponse() {
    if (typeof this.data.verifier !== "function") return;
    const input = this.saisieDiv.querySelector(".reponse-input");
    const saisie = input ? input.value : "";
    const { ok, invalide, saisieLatex } = this.data.verifier(saisie);

    if (invalide) {
      // Format non reconnu : pas de verrouillage, l'élève corrige librement.
      this.saisieVerrouillee = false;
      this.saisieInvalide = true;
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

  recalculerBanqueEligible(niveauxActifs, avecNegatifs);

  function getNiveaux() {
    return [...niveauxActifs];
  }

  function getAvecNegatifs() {
    return avecNegatifs;
  }

  // Vide la liste et repioche `nb` questions neuves (thème/type au hasard,
  // parmi les niveaux actifs). Utilisé au changement de niveau et par le
  // quiz (nombre de questions choisi par l'utilisateur).
  function relancer(nb) {
    questions.forEach(q => q.destroy());
    questions.length = 0;

    if (themes.length === 0) {
      console.warn(`Aucun exercice disponible pour les niveaux "${[...niveauxActifs].join(', ')}".`);
      return;
    }

    for (let i = 0; i < nb; i++) addQuestion();

    // Contrairement à addQuestion() seul (bouton "+" de l'atelier, qui se
    // cale en bas sur la dernière question ajoutée), relancer() reconstruit
    // toute la liste d'un coup (reset atelier, lancement du quiz) : on
    // repart du haut, sur la question 1.
    parent.scrollTop = 0;
  }

  function relancerSelonFiltres() {
    recalculerBanqueEligible(niveauxActifs, avecNegatifs);
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
    if (themes.length === 0) return null;
    let t;
    do {
      t = themes[Math.floor(Math.random() * themes.length)];
    } while (t === exclude && themes.length > 1);
    return t;
  }

  function randomTypeInTheme(theme, exclude = null) {
    const ids = banqueParTheme[theme].filter(id => id !== exclude);
    return ids[Math.floor(Math.random() * ids.length)];
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
    if (themes.length === 0) return null;
    const i = themes.indexOf(themeActuel);
    if (i === -1) return themes[0];
    return themes[(i + 1) % themes.length];
  }

  function changeTheme(q) {
    const oldTheme = banqueById[q.params.typeId].theme;
    const newTheme = nextTheme(oldTheme);
    q.params.typeId = randomTypeInTheme(newTheme);
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

    let nouveauxThemes;
    let essais = 0;

    do {
      essais++;
      nouveauxThemes = Array.from({ length: n }, (_, i) => {
        const possibles = themes.filter(
          t => t !== anciensThemes[i]
        );
        return possibles[Math.floor(Math.random() * possibles.length)];
      });
    } while (
      essais < 50 &&
      nouveauxThemes.some((t, i) => i > 0 && t === nouveauxThemes[i - 1])
    );

    questions.forEach(q => q.destroy());
    questions.length = 0;

    nouveauxThemes.forEach((theme, i) => {
      const typeId = randomTypeInTheme(theme);
      const q = new QuestionDiv(parent, { numero: i + 1, typeId });
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

  function init(nb = 3) {
    for (let i = 0; i < nb; i++) addQuestion();
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
    relancer,
    getScore,
    getQuestionsData,
    onReponse
  };


})();

export default engine;
