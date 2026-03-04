/* ===== Jeu (global) — orchestrateur ===== */
class Jeu {
  constructor({ rows, cols, bounds, emojiRatio, halo, rule, ui }) {
    this.rows = rows; this.cols = cols;
    this.bounds = bounds;
    this.emojiRatio = emojiRatio;
    this.halo = halo;
    this.rule = rule;

    this.grid = new Grille(rows, cols);
    this.renderer = new Renderer({ gridEl: ui.gridEl, messageEl: ui.messageEl, rows, cols });

    this.debug = { fillYellow: false, showShortcuts: false, showCorridor: false };

    this.solutionPath = [];
    this.start = null; this.end = null;

    this.userPath = [];       // chemin cliqué par l’utilisateur (liste [r,c])
    this.inputLocked = false; // bloque la construction pendant/après validation
    this.hasValidated = false;
  }

  /* ===== génération d’une partie ===== */
  newGame(){
    this.inputLocked = false;
    this.hasValidated = false;

    this.grid = new Grille(this.rows, this.cols);
    this.renderer.mount();

    // 1) emojis décor
    this.grid.makeEmojiMask({ ratio: this.emojiRatio, halo: this.halo });

    // 2) composante libre + labyrinthe
    const { inBest } = this.grid.largestFreeComponent();
    const adj = this.grid.generateMaze(inBest);

    // 3) plus long chemin
    const { path, start, end } = this.grid.longestPath(adj, inBest);
    this.solutionPath = path; this.start = start; this.end = end;

    // 4) nombres
    this.grid.assignPathNumbersWithRule(path, this.rule);

    // 5) distracteurs + 6) neutres
    this.grid.placeDistractorsRecursiveWithRule(path, this.rule, { ratio: 0.5 });
    this.grid.fillNeutralsWithRule(this.rule);

    // 7) marquage & rendu
    this.grid.markPathFlags(path);
    this.renderer.renderGrid(this.grid, { debugFillYellow: this.debug.fillYellow });

    // 8) init tracé utilisateur : Start seul (vert)
    this.userPath = [this.start];
    this._updateUserPathVisuals();
    this.renderer.setMessage("");
  }

  /* ===== interactions ===== */
bindUI(args = {}) {
  // On accepte que rien ne soit passé : on va chercher par défaut dans le DOM
  const regenEl      = args.btnRegen      || document.getElementById('regen') || document.getElementById('newGame');
  const validateEl   = args.btnValidate   || document.getElementById('validate');
  const correctionEl = args.btnCorrection || document.getElementById('btnCorrection') || document.getElementById('correction');

  if (regenEl)      regenEl.addEventListener("click", () => this.newGame());
  if (validateEl)   validateEl.addEventListener("click", () => this.validate());
  if (correctionEl) correctionEl.addEventListener("click", () => this.showCorrection());

  // Écoute centralisée des clics cellules (toujours active)
  this.renderer.onCellClick((r, c, el) => {
    if (this.inputLocked) return;            // pas de construction pendant/après validation
    const cell = this.grid.get(r, c);
    if (cell.isEmoji) return;                // décor non cliquable

    // Re-clic sur une cellule déjà dans le chemin -> tronquer et repartir ici
    const idxIn = this.userPath.findIndex(([rr, cc]) => rr === r && cc === c);
    if (idxIn !== -1) {
      // Dernière (bleue) = undo 1 pas ; sinon tronque jusqu’à la cellule cliquée
      this.userPath = (idxIn === this.userPath.length - 1 && this.userPath.length > 1)
        ? this.userPath.slice(0, -1)
        : this.userPath.slice(0, idxIn + 1);
      this._updateUserPathVisuals();
      return;
    }

    // Nouveau clic : voisin 4-connexe obligatoire
    const [lr, lc] = this.userPath[this.userPath.length - 1];
    if (Math.abs(lr - r) + Math.abs(lc - c) !== 1) return;

    // Aucune vérif de règle ici (on laisse se tromper) ; on construit le chemin
    this.userPath.push([r, c]);
    this._updateUserPathVisuals();
  });
}


  /* ===== validation animée ===== */
  async validate(){
    if (this.userPath.length < 2) {
      this.renderer.setMessage("Chemin trop court.", "#ffb300");
      return;
    }

    this.inputLocked = true; // on fige la construction

    let delay = 700;     // ms
    const stepDec = 30;  // accélération
    const minDelay = 120;

    let foundError = false;

    // On part de la 2ᵉ case (index 1)
    for (let i = 1; i < this.userPath.length; i++) {
      await this._sleep(delay);

      const [pr,pc] = this.userPath[i-1];
      const [r,c]   = this.userPath[i];

      const a = this.grid.get(pr,pc).value;
      const b = this.grid.get(r,c).value;
 
      

    const ok = this.rule.isValidStep(a,b);
    this._setCellEmoji(r, c, ok ? "😀" : "😠", ok);   // ← 4e arg: true/false
    
    if (!ok) {
      foundError = true;
      // remplit rapidement le reste en 😠 + fond rouge
      for (let j = i+1; j < this.userPath.length; j++) {
        const [rr,cc] = this.userPath[j];
        this._setCellEmoji(rr, cc, "😠", false);
      }
      break;
    }



      delay = Math.max(minDelay, delay - stepDec);
    }

    // Message final
    const [er,ec] = this.userPath[this.userPath.length-1];
    if (foundError) {
      this.renderer.setMessage("Chemin invalide.", "#ff5252");
    } else if (er !== this.end[0] || ec !== this.end[1]) {
      this.renderer.setMessage("Le chemin n'atteint pas la sortie.", "#ffb300");
    } else {
      this.renderer.setMessage("Bravo, chemin valide !", "#00e676");
    }

    this.hasValidated = true;
  }

  /* ===== correction : affiche la solution ===== */
showCorrection() {
  // On fige la construction
  this.inputLocked = true;

  // 0) Nettoyage visuel : enlève anciens highlights et remet bordures de grille
  for (let r = 0; r < this.rows; r++) {
    for (let c = 0; c < this.cols; c++) {
      const el = this.renderer.cellEl(r, c);
      this.renderer.setAllBorders(r, c, this.renderer.GRID_BORDER);
      if (el) {
        el.classList.remove('debug-path', 'ok-step', 'bad-step', 'last', 'path');
      }
    }
  }

  // 1) Fond "correction" via CSS debug-path
  for (const [r, c] of this.solutionPath) {
    const el = this.renderer.cellEl(r, c);
    if (el) el.classList.add('debug-path');
  }

  // 2) Bordure ROUGE du corridor (comme un vrai couloir)
  for (const [r, c] of this.solutionPath) {
    this.renderer.setAllBorders(r, c, this.renderer.PATH_BORDER);
  }
  for (let i = 0; i < this.solutionPath.length - 1; i++) {
    const [r1, c1] = this.solutionPath[i];
    const [r2, c2] = this.solutionPath[i + 1];
    this.renderer.removeSharedBorder(r1, c1, r2, c2);
  }

  this.renderer.setMessage("Correction affichée (corridor + fond).");
}



  /* ===== helpers visuels ===== */
_updateUserPathVisuals(){
  // 1) reset : bordures de grille + enlève .path/.last partout
  for (let r = 0; r < this.rows; r++) {
    for (let c = 0; c < this.cols; c++) {
      this.renderer.setAllBorders(r, c, this.renderer.GRID_BORDER);
      const el = this.renderer.cellEl(r,c);
      if (el) el.classList.remove('path','last','debug-path','ok-step','bad-step');
    }
  }

  // 🔴 2) END TOUJOURS EN ROUGE (cadre fixe), même si pas encore atteint
  if (this.end) {
    const [er,ec] = this.end;
    this.renderer.setAllBorders(er, ec, this.renderer.PATH_BORDER);
  }

  if (this.userPath.length === 0) return;

  // 3) reconstruit le couloir rouge du chemin utilisateur + couleurs
  for (let i = 0; i < this.userPath.length; i++) {
    const [r,c] = this.userPath[i];
    const el = this.renderer.cellEl(r,c);

    // Start (index 0) reste vert => pas de .path/.last sur Start
    if (i > 0 && el) el.classList.add('path');

    // cadre rouge sur chaque cellule du chemin
    this.renderer.setAllBorders(r, c, this.renderer.PATH_BORDER);

    // enlève la frontière commune entre paires consécutives
    if (i > 0) {
      const [pr,pc] = this.userPath[i-1];
      this.renderer.removeSharedBorder(pr, pc, r, c);
    }
  }

  // 4) dernière en bleu, sauf si c’est Start
  if (this.userPath.length > 1) {
    const [lr,lc] = this.userPath[this.userPath.length - 1];
    const lastEl = this.renderer.cellEl(lr,lc);
    if (lastEl) lastEl.classList.add('last');
  }
}


  _sleep(ms){ return new Promise(res => setTimeout(res, ms)); }

  // Smileys + toggle (smiley <-> valeur)
 // smiley + fond (vert si ok, rouge sinon) + toggle emoji/valeur
_setCellEmoji(r, c, emoji, isOk){
  const el = this.renderer.cellEl(r,c);
  if (!el) return;

  if (!el.dataset.orig) el.dataset.orig = el.textContent;
  el.dataset.emoji = emoji;
  el.dataset.state = "emoji";
  el.textContent = emoji;

  // retire l’éventuel “last” bleu pour laisser voir le fond vert/rouge
  el.classList.remove('last');
  // applique le fond de résultat
  el.classList.toggle('ok-step',  !!isOk);
  el.classList.toggle('bad-step', !isOk);

  // toggle sur clic (conserve le fond vert/rouge)
  if (!el.dataset.toggleBound) {
    el.addEventListener("click", (e)=>{
      e.stopPropagation();
      if (el.dataset.state === "emoji") {
        el.textContent = el.dataset.orig ?? "";
        el.dataset.state = "value";
      } else {
        el.textContent = el.dataset.emoji || "😀";
        el.dataset.state = "emoji";
      }
    });
    el.dataset.toggleBound = "1";
  }
}

}

window.Jeu = Jeu;
