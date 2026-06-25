import { ModeCartes } from "./ModeCartes.js";
import { ModeFlash } from "./ModeFlash.js";
import { FicheFlash } from "./FicheFlash.js";
import { SegmentedToggle } from "./ToggleButton.js";

/* =========================================================
   REFERENCES DOM
========================================================= */

const vueCartes = document.getElementById("vueCartes");
const vueFlash = document.getElementById("vueFlash");

const exerciceZone = document.getElementById("exerciceZone");
const scoreZone = document.getElementById("scoreZone");

/* =========================================================
   INSTANCES DES DEUX MODES
========================================================= */

const modeCartes = new ModeCartes({
  zone: document.getElementById("zoneAffichage"),
  feedback: document.getElementById("feedbackCartes"),
  exerciceZone,
  scoreZone,
  mainBtn: document.getElementById("mainBtnCartes")
});

const modeFlash = new ModeFlash({
  donneeZone: document.getElementById("donneeZone"),
  consigneZone: document.getElementById("consigneZone"),
  feedback: document.getElementById("feedbackFlash"),
  input: document.getElementById("reponseInput"),
  exerciceZone,
  scoreZone,
  mainBtn: document.getElementById("mainBtnFlash")
});

/* =========================================================
   FICHE PAPIER (mode Flash uniquement)
========================================================= */

const ficheFlash = new FicheFlash({
  nbExercices: 10,
  titre: "Écritures d'un nombre",
  sousTitre: "Complète la colonne Réponse"
});

ficheFlash.installerBouton(document.getElementById("ficheFlashZone"));

let modeActif = null;

/* =========================================================
   BASCULE ENTRE LES MODES
========================================================= */

function activerMode(nom) {

  if (modeActif === nom) return;

  // arrêt du mode précédent

  if (modeActif === "cartes") modeCartes.destroy();
  if (modeActif === "flash") modeFlash.destroy();

  modeActif = nom;

  if (nom === "cartes") {

    vueCartes.style.display = "";
    vueFlash.style.display = "none";

    modeCartes.init();

  } else {

    vueCartes.style.display = "none";
    vueFlash.style.display = "";

    modeFlash.init();

  }

}

/* =========================================================
   TOGGLE (SegmentedToggle réutilisé depuis ToggleButton.js)
========================================================= */

new SegmentedToggle({
  container: document.getElementById("modeSelector"),
  initialValue: "cartes",
  onChange: valeur => activerMode(valeur)
});

/* =========================================================
   DEMARRAGE
========================================================= */

activerMode("cartes");
