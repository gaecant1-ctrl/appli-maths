import { Nombre } from "./Nombre.js";
import { Ecriture } from "./Ecriture.js";
import { Carte } from "./Carte.js";
import { Nuage } from "./Nuage.js";
import { ToggleButton,SegmentedToggle } from "./ToggleButton.js";

/* =================================
DOM
================================= */

const input = document.getElementById("input");
const zone = document.getElementById("zoneAffichage");
const modeContainer = document.getElementById("modeToggle");
const modeToggle = new SegmentedToggle({

  container: modeContainer,

  initialValue: "table",

  onChange: (value)=>{

    mode = value;

    analyser();

  }

});

/* =================================
ETAT
================================= */

let mode = "table";
let dernierNombre = null;
let dernieresEcritures = null;

/* =================================
AFFICHAGE TABLEAU
================================= */

function afficherTableau(ecritures){

  zone.innerHTML = `
    <div class="resultats">

      <div class="col rationnel">
        <h2>Rationnel</h2>
        <div class="zone-cartes rationnel-zone"></div>
      </div>

      <div class="col decimal">
        <h2>Décimal</h2>
        <div class="zone-cartes decimal-zone"></div>
      </div>

    </div>
  `;

  const rationnelZone = zone.querySelector(".rationnel-zone");
  const decimalZone = zone.querySelector(".decimal-zone");

  ecritures.forEach(e => {

    const carte = new Carte(e);

    const target =
      e.type === "rationnel"
        ? rationnelZone
        : decimalZone;

    carte.renderInto(target,"domino");

  });

  MathJax.typesetPromise();

}


function afficherTableauInput(ecritures){

  zone.innerHTML = `
    <div class="resultats">

      <div class="col rationnel">
        <h2>Rationnel</h2>
        <div class="zone-cartes rationnel-zone"></div>
      </div>

      <div class="col decimal">
        <h2>Décimal</h2>
        <div class="zone-cartes decimal-zone"></div>
      </div>

    </div>
  `;

  const rationnelZone = zone.querySelector(".rationnel-zone");
  const decimalZone = zone.querySelector(".decimal-zone");

  const feedback = document.getElementById("feedback");

  ecritures.forEach(e => {

    const carte = new Carte(e);

    const target =
      e.type === "rationnel"
        ? rationnelZone
        : decimalZone;

    carte.renderInto(target,"dominoInput");

    carte.renderInput(feedback);

  });

  MathJax.typesetPromise();

}



/* =================================
AFFICHAGE NUAGE
================================= */

function afficherNuage(ecritures){

  zone.innerHTML = `<div class="nuage"></div>`;

  const container = zone.querySelector(".nuage");

  const nuage = new Nuage(container);

  ecritures.forEach(e => {

    const carte = new Carte(e);

    carte.render("simple");

    nuage.ajouterCarte(carte);

  });

  nuage.demarrer();

  MathJax.typesetPromise();

}

/* =================================
AFFICHAGE GLOBAL
================================= */

function afficher(ecritures){

  if(mode === "nuage"){

    afficherNuage(ecritures);

  }
  else if(mode === "tableInput"){

    afficherTableauInput(ecritures);

  }
  else{

    afficherTableau(ecritures);

  }

}

/* =================================
ANALYSE
================================= */

function analyser(){

  const texte = input.value.trim();

  if(!texte){
    zone.innerHTML = "";
    return;
  }

  const nombre = new Nombre(texte);

  dernierNombre = nombre;

  dernieresEcritures = Ecriture.genererTout(nombre);

  afficher(dernieresEcritures);

}

/* =================================
EVENTS
================================= */

window.analyser = analyser;

input.addEventListener("keydown",e=>{

  if(e.key === "Enter"){

    e.preventDefault();

    analyser();

  }

});

