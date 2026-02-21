/* ================= VARIABLES ================= */

let vitesse = 0;
let tempsObjectif = 0;

let tempsSimule = 0;
let dernierTemps = 0;
let facteurTemps = 1; // 1 = normal, >1 = accélération

let animationId = null;

let nbSecteurs = 6;

const listeSecteurs = [4, 6, 8, 9, 12];


let saisieFermee = false;
let validationFaite = false;

/* ================= ELEMENTS ================= */

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

const startBtn = document.getElementById("startBtn");
const nouvelleBtn = document.getElementById("nouvelleBtn");
const validerBtn = document.getElementById("validerBtn");
const inputReponse = document.getElementById("reponse");
const feedback = document.getElementById("feedback");
const chronoSpan = document.getElementById("chrono");

/* ================= OUTIL ================= */

function degToRad(d){
  return d * Math.PI / 180;
}

/* ================= MODELE UNIQUE ================= */

function angle(t){
  return vitesse * t%360; // TOUJOURS POSITIF
}

/* ================= DESSIN ================= */

function dessinerRoue(anglePositif){

  ctx.clearRect(0,0,canvas.width,canvas.height);

  const cx = canvas.width/2;
  const cy = canvas.height/2;
  const r = Math.min(canvas.width, canvas.height) * 0.4;

  const alpha = 360/nbSecteurs;
  const offset = -90 - alpha/2;

  ctx.save();
  ctx.translate(cx,cy);

  // signe géré UNIQUEMENT ici
  ctx.rotate(degToRad(-anglePositif + offset));

  for(let i=0;i<nbSecteurs;i++){

    ctx.beginPath();
    ctx.moveTo(0,0);

    ctx.fillStyle = `hsl(${(360/nbSecteurs)*i},70%,${i%2?55:65}%)`;

    ctx.arc(0,0,r,
      degToRad(i*alpha),
      degToRad((i+1)*alpha)
    );

    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.rotate(degToRad((i+0.5)*alpha));
    ctx.translate(r*0.7,0);
    ctx.rotate(degToRad(90));
    ctx.textAlign="center";
    ctx.textBaseline="middle";
    ctx.font="18px Arial";
    ctx.fillStyle="black";
    ctx.fillText(i+1,0,0);
    ctx.restore();
  }

  ctx.restore();

  // flèche
  ctx.beginPath();
  ctx.moveTo(cx,cy-r-10);
  ctx.lineTo(cx-12,cy-r-30);
  ctx.lineTo(cx+12,cy-r-30);
  ctx.closePath();
  ctx.fill();
}

/* ================= BOUCLE UNIQUE ================= */

function boucle(now){

  const delta = (now - dernierTemps)/1000;
  dernierTemps = now;

  tempsSimule += delta * facteurTemps;
  
  // 🔒 fermeture automatique à 75% du temps
if(!saisieFermee && !validationFaite && tempsSimule >= 0.75 * tempsObjectif){

  saisieFermee = true;

  inputReponse.disabled = true;
  validerBtn.disabled = true;

  feedback.innerText = "⏳ Trop tard, attendons l'issue…";
}

  // 🔒 arrêt naturel si on dépasse le temps cible
 if(tempsSimule >= tempsObjectif){

  tempsSimule = tempsObjectif;
  facteurTemps = 0;

  dessinerRoue(angle(tempsSimule));

  const total = Math.floor(tempsSimule);
  const m = Math.floor(total/60);
  const s = total%60;

  chronoSpan.innerText =
    m + "min " + (s<10?"0"+s:s) + "s";

  cancelAnimationFrame(animationId);
  animationId = null;

  // 🎯 CAS : temps écoulé sans validation
  if(!validationFaite){

    const bonneReponse = calculerSecteur();

    feedback.innerText =
      "⏰ Temps écoulé. La réponse était : " + bonneReponse;

    inputReponse.disabled = true;
    validerBtn.disabled = true;
  }

  return;
}

  dessinerRoue(angle(tempsSimule));

  const total = Math.floor(tempsSimule);
  const m = Math.floor(total/60);
  const s = total%60;

  chronoSpan.innerText =
    m + "min " + (s<10?"0"+s:s) + "s";

  animationId = requestAnimationFrame(boucle);
}

/* ================= CONTROLES ================= */

function animer(){

  cancelAnimationFrame(animationId);

  tempsSimule = 0;
  facteurTemps = 1;
  dernierTemps = performance.now();

  animationId = requestAnimationFrame(boucle);

  startBtn.disabled = true;
  inputReponse.disabled = false;
  validerBtn.disabled = false;
}

function accelerationFinale(){
  facteurTemps = 20; // accélération simple

  function verifierArret(){

    if(tempsSimule >= tempsObjectif){
      tempsSimule = tempsObjectif;  // verrouillage exact
      facteurTemps = 0;             // on arrête le temps
      return;
    }

    requestAnimationFrame(verifierArret);
  }

  requestAnimationFrame(verifierArret);
}


function calculerSecteur(){


  // angle mathématique final exact
  let theta = angle(tempsObjectif);

  const indice = Math.floor(theta*nbSecteurs/180);
  if(indice%2===0){
  return 1+indice/2;}
  else{
   return 1+(indice+1)/2; 
  }
}



function verifier(){
  
  validationFaite = true;

  accelerationFinale();

  const bonneReponse = calculerSecteur();
  const rep = parseInt(inputReponse.value);

  if(rep === bonneReponse){
    feedback.innerText = "✔ Correct !";
  }else{
    feedback.innerText = "✘ Faux. Réponse : " + bonneReponse;
  }

  inputReponse.disabled = true;
  validerBtn.disabled = true;
}





function nouvelleQuestion(){
  saisieFermee = false;
  validationFaite = false;
saisieFermee = false;
  cancelAnimationFrame(animationId);
  
  nbSecteurs = listeSecteurs[
  Math.floor(Math.random() * listeSecteurs.length)
];
 // 6

  vitesse = 10 + Math.floor(Math.random()*6)*10;

  const minutes = 1 + Math.floor(Math.random()*4);
  const secondes = Math.floor(Math.random()*60);

  tempsObjectif = minutes*60 + secondes;

  tempsSimule = 0;
  facteurTemps = 1;

  dessinerRoue(0);

  chronoSpan.innerText = "0min 00s";
  inputReponse.value = "";
  feedback.innerText = "";

  startBtn.disabled = false;
  inputReponse.disabled = true;
  validerBtn.disabled = true;

  document.getElementById("vitesseInfo").innerText =
    "Vitesse : " + vitesse + "°/s";

  document.getElementById("tempsInfo").innerText =
    "Temps : " + minutes + " min " +
    (secondes<10?"0"+secondes:secondes) + " s";
}

/* ================= EVENTS ================= */

startBtn.addEventListener("click", animer);
nouvelleBtn.addEventListener("click", nouvelleQuestion);
validerBtn.addEventListener("click", verifier);

document.addEventListener("keydown", e=>{
  if(e.key==="Enter" && !inputReponse.disabled){
    verifier();
  }
});

/* ================= INIT ================= */

dessinerRoue(0);
nouvelleQuestion();
