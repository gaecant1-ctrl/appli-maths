/* =========================================================
   IMPORTS
========================================================= */

import { ExerciseRegistry } from "./ExerciseRegistry.js";
import { ExerciseEngine } from "./ExerciseEngine.js";
import { SvgRenderer } from "./SvgRenderer.js";
import { AppController } from "./AppController.js";
import { registerAllTypes } from "./types.js";
import { creerDico } from "./Dico.js";
import { ToggleButton,SegmentedToggle } from "./ToggleButton.js";
import { setNumberPolicy } from "./Random.js";

/* =========================================================
   INITIALISATION DU MOTEUR
========================================================= */

const registry = new ExerciseRegistry();
registerAllTypes(registry);

const engine = new ExerciseEngine(registry);
const renderer = new SvgRenderer();

const svg = document.getElementById("equationContainer");
const dicoInitial = creerDico("fruit", "image");


const app = new AppController({
  engine,
  renderer,
  svg,
  dico: dicoInitial,
  retry: true,   // 🔥 valeur initiale simple
  onRequestNew: refreshExercise
});






/* =========================================================
   OUTILS UI
========================================================= */

function getMinMaxParNiveauNombre(nombre, relatifs) {

  let min, max;

  switch (nombre) {
    case "petit": min = 0; max = 10; break;
    case "moyen": min = 5; max = 15; break;
    case "grand": min = 20; max = 50; break;
    default: min = 1; max = 50;
  }


  return [min, max];
}

function applyNumberPolicy(state) {
  setNumberPolicy({
    allowNegativeN: state.relatifs === "on"
  });
}

function getUIState() {
  let categorie = categorieToggle.getValue();
  let niveau = niveauToggle.getValue();
  const nombre = nombreToggle.getValue();
  const relatifs = relatifToggle.getValue();
  const mode = modeToggle.getValue();
  const theme = themeToggle.getValue();

  if (categorie === "mixte") {
    const cats = ["arithmetique", "algebrique"];
    categorie = cats[Math.floor(Math.random() * cats.length)];
  }

  if (niveau === "mixte") {
    niveau = Math.floor(Math.random() * 4) + 1;
  } else {
    niveau = Number(niveau);
  }

  const [min, max] = getMinMaxParNiveauNombre(nombre, relatifs);

 return { categorie, niveau, min, max, mode, theme, relatifs };
}


function refreshExercise() {
  const state = getUIState();

  const dico = creerDico(
    state.theme,
    state.mode
  );

  app.updateDico(dico);

  applyNumberPolicy(state);

  app.newExercise({
    categorie: state.categorie,
    niveau: state.niveau,
    min: state.min,
    max: state.max
  });
}

function refreshNumbersOnly() {
  const state = getUIState();

  applyNumberPolicy(state);

  app.regenerateNumbers(state.min, state.max);
}

function refreshThemeOnly() {
  const state = getUIState();

  const dico = creerDico(
    state.theme,
    state.mode
  );

  app.updateDico(dico);
}

function refreshModeOnly() {
  const state = getUIState();

  const dico = creerDico(
    state.theme,
    state.mode
  );

  app.updateDico(dico);
}

function refreshRenderOnly() {
  const state = getUIState();

  const dico = creerDico(
    state.theme,
    state.mode
  );

  app.updateDico(dico);
}
/* =========================================================
   BRANCHEMENT DES MENUS
========================================================= */



document
  .getElementById("answerInput")
  .addEventListener("requestNewExercise", refreshExercise);

const categorieToggle = new SegmentedToggle({
  container: document.getElementById("categorieToggle"),
  initialValue: "arithmetique",
onChange: refreshExercise

});

const nombreToggle = new SegmentedToggle({
  container: document.getElementById("nombreToggle"),
  initialValue: "petit",
onChange: refreshNumbersOnly

});

const relatifToggle = new SegmentedToggle({
  container: document.getElementById("relatifToggle"),
  initialValue: "off",
  onChange: refreshNumbersOnly
});

const niveauToggle = new SegmentedToggle({
  container: document.getElementById("niveauToggle"),
  initialValue: "1",
onChange: refreshExercise

});


const retryToggle = new ToggleButton({
  element: document.getElementById("retryToggle"),
  initialState: true,
  contentOn: "Retry ON",
  contentOff: "Retry OFF",
  onChange: (value) => {
    app.setRetryMode(value);
  }
});

const modeToggle = new SegmentedToggle({
  container: document.getElementById("modeToggle"),
  initialValue: "image",
onChange: refreshModeOnly

});

const themeToggle = new SegmentedToggle({
  container: document.getElementById("themeToggle"),
  initialValue: "fruit",
  onChange: refreshThemeOnly
});


const debugInput = document.getElementById("debugIdInput");
const debugBtn = document.getElementById("debugForceBtn");

debugBtn.addEventListener("click", () => {
console.log("DEBUG CLICK");
  const id = debugInput.value.trim();
  console.log("ID saisi :", id);

  console.log("IDs disponibles :", Object.keys(app.engine.registry.types));
  if (!id) return;

  app.newExerciseById(Number(id));

});

const quizBtn = document.getElementById("quizToggle");

quizBtn.addEventListener("click", () => {
  app.startQuiz(10);
});

const toggle = document.getElementById("bilanToggle");
const overlay = document.getElementById("bilanOverlay");
const closeBtn = document.getElementById("closeBilan");

toggle.addEventListener("click", () => {
  overlay.classList.add("active");
});

closeBtn.addEventListener("click", () => {
  overlay.classList.remove("active");
});

/* =========================================================
   DÉMARRAGE
========================================================= */

refreshExercise();