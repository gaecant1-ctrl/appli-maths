import { Nombre } from "./Nombre.js";
import { Carte } from "./Carte.js";
import { Nuage } from "./Nuage.js";

/* =================================
DOM
================================= */

const input = document.getElementById("input");


const zone = document.getElementById("zoneAffichage");

const modeBtn = document.getElementById("modeBtn");


/* =================================
ETAT
================================= */

let mode = "table";


/* =================================
OUTILS
================================= */

function parseNombre(texte){

  texte = texte.trim();

  if(texte.includes("/")){

    const [a,b] = texte.split("/").map(Number);

    return {a,b};

  }

  const p = texte.split(".");

  let d = 1;

  for(let i=0;i<(p[1]||"").length;i++) d *= 10;

  const a = Number(p.join(""));
  const b = d;

  return {a,b};

}


/* =================================
AFFICHAGE TABLEAU
================================= */

function afficherTableau(nombre){

  let rationnelHTML = "";
  let decimalHTML = "";

  nombre.ecritures.forEach(e => {

    const carte = new Carte(e,"domino");

    const html = carte.el.outerHTML;

    if(e.type === "rationnel"){
      rationnelHTML += html;
    }
    else{
      decimalHTML += html;
    }

  });

  zoneAffichage.innerHTML = `
    <div class="resultats">

      <div class="col rationnel">
        <h2>Rationnel </h2>
        <div class="zone-cartes">
          ${rationnelHTML}
        </div>
      </div>

      <div class="col decimal">
        <h2>Décimal</h2>
        <div class="zone-cartes">
          ${decimalHTML}
        </div>
      </div>

    </div>
  `;

  MathJax.typesetPromise();

}


/* =================================
AFFICHAGE NUAGE
================================= */

function afficherNuage(nombre){

  zoneAffichage.innerHTML = `

    <div class="nuage"></div>
  `;

  const container = zoneAffichage.querySelector(".nuage");
  const layoutBtn = zoneAffichage.querySelector("#layoutBtn");

  const nuage = new Nuage(container);

  nombre.ecritures.forEach(e => {

    const carte = new Carte(e,"simple");


    nuage.ajouterCarte(carte);

  });

  nuage.demarrer();



  MathJax.typesetPromise();



}

/* =================================
AFFICHAGE GLOBAL
================================= */

function afficher(nombre){

  if(mode === "nuage"){

    afficherNuage(nombre);

  }
  else{

    afficherTableau(nombre);

  }

}


/* =================================
ANALYSE
================================= */

function analyser(){

  const texte = input.value;

  if(!texte) return;

  const {a,b} = parseNombre(texte);

  const nombre = new Nombre(a,b);

  afficher(nombre);

}


/* =================================
EVENTS
================================= */

window.analyser = analyser;


/* entrée clavier */

input.addEventListener("keydown",e=>{

  if(e.key==="Enter"){

    e.preventDefault();

    analyser();

  }

});


/* changement de mode */

modeBtn.addEventListener("click",()=>{

  mode = mode==="table" ? "nuage" : "table";

  modeBtn.textContent =
    mode==="table"
      ? "Nuage"
      : "Tableau";

  analyser();

});