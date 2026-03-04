export class Carte {

constructor(ecriture, mode="simple") {

  this.data = ecriture;
  this.mode = mode;
  this.x = 0;
  this.y = 0;
  this.vx = 0;
  this.vy = 0;

  this.el = document.createElement("div");

  this.el.className =
    "carte " +
    ecriture.type + " " +
    ecriture.statut;

  if(mode === "domino"){
    this.el.classList.add("domino");
  }

  this.render();

}


  /* ===============================
     RENDU
  =============================== */

  render() {

    if (this.mode === "domino") {

      this.el.classList.add("domino");

      this.el.innerHTML = `
        <div class="domino-desc">${this.data.description}</div>
        <div class="domino-math">$$${this.data.latex}$$</div>
      `;

    } else {

      this.el.innerHTML =
        `<div class="math">$$${this.data.latex}$$</div>`;

    }

  }


  /* ===============================
     INSERTION DOM
  =============================== */

  renderInto(container) {

    container.appendChild(this.el);

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