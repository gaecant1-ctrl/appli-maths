import { Nombre } from "./Nombre.js";
import { Ecriture } from "./Ecriture.js";
import { Carte } from "./Carte.js";



/* =========================
DOM
========================= */

const zone = document.getElementById("zoneAffichage");
const feedback = document.getElementById("feedback");

/* =========================
ETAT GLOBAL
========================= */
const MAX_EXERCICES = 2;

let nombre;
let ecritures;
let ecrituresDemandees;
let donnee;

let cartes = [];

let score = 0;
let total = 0;
let exerciceValide = false;
let modeBouton = "correction";


/* =========================
BOUTON PRINCIPAL
========================= */

function majBouton(mode){

const btn = document.getElementById("mainBtn");
if(!btn) return;

modeBouton = mode;

if(mode==="correction"){
btn.textContent="Correction";
}

if(mode==="suivant"){
btn.textContent="Exercice suivant";
}

}

function majScore(){

const zone=document.getElementById("scoreZone");
if(!zone) return;

zone.textContent=`Score : ${score} / ${total}`;

}

/* =========================
NOUVEL EXERCICE
========================= */


function nouvelExercice(){

/* =========================
FIN DU QUIZ
========================= */

if(total >= MAX_EXERCICES){

feedback.textContent =
`Quiz terminé ! Score final : ${score} / ${total}`;

const btn = document.getElementById("mainBtn");
btn.disabled = true;

return;

}

/* =========================
RESET BOUTON
========================= */

majBouton("correction");

/* =========================
RESET EXERCICE
========================= */

exerciceValide = false;
feedback.textContent = "";
zone.innerHTML = "";
cartes = [];

const exoZone = document.getElementById("exerciceZone");

if(exoZone){
  exoZone.textContent = `Exercice ${total + 1} :`;
}





/* =========================
génération nombre
========================= */

let a,b;

b = rand(2,11);          // dénominateur

a = rand(1,b);           // numérateur ≤ dénominateur

/* probabilité 1/2 d'ajouter un entier */

if(Math.random() < 0.5){

  const entier = rand(1,3);

  a = a + entier*b;

}

nombre = Nombre.fromParts(a,b);


/* =========================
écritures possibles
========================= */

const precisions = [1,2,3];

const alea = precisions[rand(0, precisions.length-1)];

const optionsExercice = {
  forceApprox:false,

  precisionDec: alea,

  precisionFracDec: precisions[rand(0, precisions.length-1)],

  precisionPourc: rand(1, alea),

  kDenom: rand(2,5)

};

ecritures = Ecriture.genererTout(nombre, optionsExercice);
/* =========================
choisir écriture donnée
========================= */

donnee =
ecritures[
Math.floor(Math.random()*ecritures.length)
];

if(donnee.type==="decimal"){

const rationnelles =
ecritures.filter(e=>e.type==="rationnel");

donnee =
rationnelles[
Math.floor(Math.random()*rationnelles.length)
];

}

/* =========================
écritures demandées
========================= */

ecrituresDemandees =
ecritures.filter(e=>e!==donnee);

/* =========================
construction interface
========================= */

let titreDecimal;

if(nombre.isDecimal()){

  titreDecimal = "Décimal";

}
else{


 titreDecimal = `Non décimal — Valeurs arrondies`;

}

zone.innerHTML = `
<div class="resultats">

<div class="col rationnel">
<h2>Rationnel</h2>
<div class="zone-cartes rationnel-zone"></div>
</div>

<div class="col decimal">
<h2>${titreDecimal}</h2>
<div class="zone-cartes decimal-zone"></div>
</div>

</div>
`;

const rationnelZone =
zone.querySelector(".rationnel-zone");

const decimalZone =
zone.querySelector(".decimal-zone");



/* =========================
carte donnée
========================= */

const carteDonnee = new Carte(donnee);

const zoneDonnee =
donnee.type==="rationnel"
? rationnelZone
: decimalZone;

carteDonnee.renderInto(zoneDonnee,"domino");

cartes.push(carteDonnee);

/* =========================
cartes input
========================= */

ecrituresDemandees.forEach(e=>{

const carte = new Carte(e);

const target =
e.type==="rationnel"
? rationnelZone
: decimalZone;

carte.renderInto(target,"dominoInput");
carte.renderInput(feedback);

cartes.push(carte);

});





/* =========================
focus premier input
========================= */

const firstInput =
document.querySelector(".domino-input-field");

if(firstInput) firstInput.focus();

MathJax.typesetPromise();

}

/* =========================
EXERCICE REUSSI ?
========================= */

function exerciceReussi(){

const inputs = cartes.filter(c=>c.state==="input" || c.state==="true");

return inputs.every(c=>c.state==="true");

}

/* =========================
SURVEILLANCE AUTO
========================= */

function verifierExercice(){

if(exerciceValide) return;

const reussi =exerciceReussi();

if(reussi){

exerciceValide=true;
score++;
total++;

feedback.textContent="🎉 Exercice réussi !";

majBouton("suivant");

majScore();

}

}




setInterval(verifierExercice,200);

/* =========================
CORRECTION
========================= */

function corriger(){
  if(!exerciceValide){
  total++;
  majScore();
  exerciceValide = true;
}


cartes.forEach(c=>{

if(c.state==="input" || c.state==="false"){

const container = c.el.querySelector(".domino-input-field");

if(!container) return;

const attendu = new Nombre(c.data.string);

const span = document.createElement("span");

span.className="domino-result";

span.innerHTML=`\\(${attendu.toLatex(c.data.format, c.data.opts)}\\)`;

container.replaceWith(span);

if(window.MathJax){
MathJax.typesetPromise([span]);
}

c.state="true";

}

});

feedback.textContent="✔ Correction affichée";

}

/* =========================
OUTILS
========================= */

function rand(a,b){
return Math.floor(Math.random()*(b-a+1))+a;
}

/* =========================
START
========================= */

nouvelExercice();

document
.getElementById("mainBtn")
.addEventListener("click",()=>{

if(modeBouton==="correction"){

corriger();
majBouton("suivant");

}

else if(modeBouton==="suivant"){

nouvelExercice();

}

});

