import { Nombre } from "./Nombre.js";

export class Carte {

constructor(ecriture){

this.data = ecriture;

this.state = "idle";

this.x = 0;
this.y = 0;

this.el = document.createElement("div");

this.el.className =
"carte " +
ecriture.type + " " +
ecriture.statut;

}


/* ===============================
RENDER
=============================== */

render(mode="simple"){

this.mode = mode;

this.el.classList.remove("domino","simple");

if(mode === "domino" || mode === "dominoInput"){
this.el.classList.add("domino");
}
else{
this.el.classList.add("simple");
}


if(mode === "dominoInput"){

this.el.innerHTML = `
<div class="domino-desc">${this.data.description}</div>
<input class="domino-input-field" type="text">
`;

}

else if(mode === "domino"){

this.el.innerHTML = `
<div class="domino-desc">${this.data.description}</div>
<div class="domino-math">$$${this.data.latex}$$</div>
`;

}

else{

this.el.innerHTML =
`<div class="math">$$${this.data.latex}$$</div>`;

}

}


/* ===============================
INPUT / CORRECTION
=============================== */

renderInput(feedbackDiv){

this.state="input";

const input = this.el.querySelector(".domino-input-field");
if(!input) return;

const attendu = this.data.nombre;

const valider = ()=>{

if(this.state === "true") return;

const txt = input.value.trim().replace(",",".");
const nb = new Nombre(txt);

console.log("txt",nb.toString("decimal"));
console.log("format",this.data.format);
console.log("opts",this.data.opts);
console.log("attendu",attendu.toString("decimal"));
console.log("nb",nb);


if(nb.statut !== "valide"){

feedbackDiv.textContent = "❓ Écriture incorrecte";
input.classList.add("incorrect");
return;

}

if(attendu.equalAff(nb,this.data.format,this.data.opts)){

this.state="true";

feedbackDiv.textContent = "✅ Correct";

const span = document.createElement("span");
span.className="domino-result";

span.innerHTML =
`\\(${nb.toLatex(this.data.format,this.data.opts)}\\)`;

input.replaceWith(span);

if(window.MathJax){
MathJax.typesetPromise([span]);
}

const next=document.querySelector(".domino-input-field");
if(next) next.focus();

}

else{

this.state="false";

feedbackDiv.textContent = "❌ Faux";
input.classList.add("incorrect");

}

};


/* reset visuel */

input.addEventListener("input",()=>{

this.state="input";

feedbackDiv.textContent="";
input.classList.remove("correct","incorrect");

});


/* validation Enter */

input.addEventListener("keydown",e=>{

if(e.key==="Enter"){
e.preventDefault();
valider();
}

});


/* validation sortie */

input.addEventListener("blur",()=>{

if(this.state==="input" && input.value.trim()!==""){
valider();
}

});

}


/* ===============================
INSERTION DOM
=============================== */

renderInto(container,mode="simple"){

container.appendChild(this.el);

this.render(mode);

}


/* ===============================
POSITION
=============================== */

setPosition(x,y){

this.x = x;
this.y = y;

this.el.style.left = x + "px";
this.el.style.top  = y + "px";
this.el.style.transform = "translate(-50%,-50%)";

}

}