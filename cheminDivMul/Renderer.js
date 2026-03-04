/* ===== Renderer (global) — DOM only ===== */
class Renderer {
  constructor({ gridEl, messageEl, rows, cols }) {
    this.gridEl = gridEl;
    this.messageEl = messageEl;
    this.rows = rows;
    this.cols = cols;

    // borders (CSS variables)
    this.PATH_BORDER    = `6px solid var(--path-border-color)`;
    this.PASSAGE_BORDER = `3px dashed var(--path-border-color)`;
    this.GRID_BORDER    = `1px solid var(--grid-border-color)`;
    this.NO_BORDER      = "none";
  }

  mount() {
    this.gridEl.innerHTML = "";
    this.gridEl.style.gridTemplateColumns = `repeat(${this.cols}, 40px)`;
    this.gridEl.style.gridTemplateRows = `repeat(${this.rows}, 40px)`;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const d = document.createElement("div");
        d.className = "cell";
        d.dataset.r = r;
        d.dataset.c = c;
        this.gridEl.appendChild(d);
      }
    }
  }

  /* ---- DOM helpers ---- */
  cellEl(r,c){ return this.gridEl.querySelector(`.cell[data-r="${r}"][data-c="${c}"]`); }

  setAllBorders(r,c,val){
    const el=this.cellEl(r,c);
    el.style.borderTop=val; el.style.borderRight=val; el.style.borderBottom=val; el.style.borderLeft=val;
  }

  // Ouvre le “couloir” entre deux cases en supprimant la bordure partagée
  removeSharedBorder(r1,c1,r2,c2){
    if(r1===r2 && c2===c1+1){ this.cellEl(r1,c1).style.borderRight=this.NO_BORDER; this.cellEl(r2,c2).style.borderLeft =this.NO_BORDER; }
    if(r1===r2 && c2===c1-1){ this.cellEl(r1,c1).style.borderLeft =this.NO_BORDER; this.cellEl(r2,c2).style.borderRight=this.NO_BORDER; }
    if(c1===c2 && r2===r1+1){ this.cellEl(r1,c1).style.borderBottom=this.NO_BORDER; this.cellEl(r2,c2).style.borderTop   =this.NO_BORDER; }
    if(c1===c2 && r2===r1-1){ this.cellEl(r1,c1).style.borderTop   =this.NO_BORDER; this.cellEl(r2,c2).style.borderBottom=this.NO_BORDER; }
  }

  // ⚠️ Ajout : restaure la bordure partagée en ROUGE (PATH_BORDER)
  restoreSharedBorder(r1,c1,r2,c2){
    if(r1===r2 && c2===c1+1){ this.cellEl(r1,c1).style.borderRight=this.PATH_BORDER; this.cellEl(r2,c2).style.borderLeft =this.PATH_BORDER; }
    if(r1===r2 && c2===c1-1){ this.cellEl(r1,c1).style.borderLeft =this.PATH_BORDER; this.cellEl(r2,c2).style.borderRight=this.PATH_BORDER; }
    if(c1===c2 && r2===r1+1){ this.cellEl(r1,c1).style.borderBottom=this.PATH_BORDER; this.cellEl(r2,c2).style.borderTop   =this.PATH_BORDER; }
    if(c1===c2 && r2===r1-1){ this.cellEl(r1,c1).style.borderTop   =this.PATH_BORDER; this.cellEl(r2,c2).style.borderBottom=this.PATH_BORDER; }
  }

  // ⚠️ Ajout : pose la bordure ROUGE autour d’une case (utilisé pour chaque case du chemin)
  setCellPathBorder(r,c){ this.setAllBorders(r,c, this.PATH_BORDER); }

  // ⚠️ Ajout : remet la bordure de GRILLE standard autour d’une case (quand on annule)
  setCellGridBorder(r,c){ this.setAllBorders(r,c, this.GRID_BORDER); }

  setSharedBorderDashed(r1,c1,r2,c2){
    if(r1===r2 && c2===c1+1){ this.cellEl(r1,c1).style.borderRight=this.PASSAGE_BORDER; this.cellEl(r2,c2).style.borderLeft =this.PASSAGE_BORDER; }
    if(r1===r2 && c2===c1-1){ this.cellEl(r1,c1).style.borderLeft =this.PASSAGE_BORDER; this.cellEl(r2,c2).style.borderRight=this.PASSAGE_BORDER; }
    if(c1===c2 && r2===r1+1){ this.cellEl(r1,c1).style.borderBottom=this.PASSAGE_BORDER; this.cellEl(r2,c2).style.borderTop   =this.PASSAGE_BORDER; }
    if(c1===c2 && r2===r1-1){ this.cellEl(r1,c1).style.borderTop   =this.PASSAGE_BORDER; this.cellEl(r2,c2).style.borderBottom=this.PASSAGE_BORDER; }
  }

  /* ---- Render contenu + classes ---- */
renderGrid(grille, { debugFillYellow = false } = {}) {
  for (let r = 0; r < grille.rows; r++) {
    for (let c = 0; c < grille.cols; c++) {
      const cell = grille.get(r, c);
      const el   = this.cellEl(r, c);

      el.className = "cell";
      // bordures de grille par défaut
      el.style.borderTop    = this.GRID_BORDER;
      el.style.borderRight  = this.GRID_BORDER;
      el.style.borderBottom = this.GRID_BORDER;
      el.style.borderLeft   = this.GRID_BORDER;

      // contenu & classes
      if (cell.isEmoji) { el.classList.add("decor"); el.textContent = cell.value; }
      else { el.textContent = (cell.value ?? ""); }
      if (cell.isStart) el.classList.add("start");
      if (cell.isEnd)   el.classList.add("end");

      // ⚠️ arrivée : bordure rouge dès l’affichage (sans overlay CSS)
      if (cell.isEnd) {
        el.style.borderTop    = this.PATH_BORDER;
        el.style.borderRight  = this.PATH_BORDER;
        el.style.borderBottom = this.PATH_BORDER;
        el.style.borderLeft   = this.PATH_BORDER;
      }

      if (debugFillYellow && cell.inPath) el.classList.add("debug-path");
    }
  }
}


  /* ---- corridor solution (non utilisé en mode exercice) ---- */
  drawCorridor(path){
    for(const [r,c] of path) this.setAllBorders(r,c, this.PATH_BORDER);
    for(let i=0;i<path.length-1;i++){
      const [r1,c1]=path[i], [r2,c2]=path[i+1];
      this.removeSharedBorder(r1,c1,r2,c2);
    }
  }

  drawShortcuts(pairs){
    for(const {a,b} of pairs){
      const [r1,c1]=a, [r2,c2]=b;
      this.setSharedBorderDashed(r1,c1,r2,c2);
    }
  }

  setMessage(text, color="#fff"){
    if(this.messageEl){ this.messageEl.textContent = text; this.messageEl.style.color = color; }
  }

  /* ---- écoute clics cellule ---- */
  onCellClick(handler){
    this.gridEl.addEventListener("click", e=>{
      const el = e.target.closest(".cell"); if(!el) return;
      const r = parseInt(el.dataset.r,10), c=parseInt(el.dataset.c,10);
      handler(r,c, el);
    });
  }
}
window.Renderer = Renderer;
