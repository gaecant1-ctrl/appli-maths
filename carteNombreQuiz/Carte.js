import { Nombre } from "./Nombre.js";

export class Carte {

  constructor(ecriture){

    this.data = ecriture;

    this.x = 0;
    this.y = 0;

    this.el = document.createElement("div");

    this.el.className =
      "carte " +
      ecriture.type + " " +
      ecriture.statut;

  }


  /* ===============================
     RENDU
  =============================== */

  render(mode="simple"){

    this.mode = mode;

    this.el.classList.remove("domino","simple");

    if(mode === "domino" || mode === "dominoInput"){
      this.el.classList.add("domino");
    } else {
      this.el.classList.add("simple");
    }


    if(mode === "dominoInput"){

      this.el.innerHTML = `
        <div class="domino-desc">${this.data.description}</div>
        <input class="domino-input-field" type="text">
      `;

    }

    else if (mode === "domino") {

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

    const input = this.el.querySelector(".domino-input-field");

    if(!input) return;

    const attendu = new Nombre(this.data.string);


    input.addEventListener("input", ()=>{

      feedbackDiv.textContent = "";
      input.classList.remove("correct","incorrect");

    });

    input.addEventListener("keydown", e=>{


      if(e.key !== "Enter") return;
      console.log("attendu",attendu);

      const txt = input.value.trim().replace(",",".");
      const nb = new Nombre(txt);

      if(nb.statut !== "valide" ){

        feedbackDiv.textContent = "❓ Écriture incorrecte";
        input.classList.add("incorrect");
        return;

      }

      
      console.log("nb",nb);

if(attendu.equalExact(nb) && attendu.equalForme(nb)){

  feedbackDiv.textContent = "✅ Correct";

const span = document.createElement("span");
span.className = "domino-result";

span.innerHTML = `\\(${nb.toLatex(this.data.format)}\\)`;

  input.replaceWith(span);

  if(window.MathJax){
    MathJax.typesetPromise([span]);
  }

}
else{

  feedbackDiv.textContent = "❌ Faux";

  input.classList.add("incorrect");
  input.classList.remove("correct");

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