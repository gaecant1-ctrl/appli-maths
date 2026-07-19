class DroiteGraduee {
  constructor(containerId) {
    this.containerId = containerId;

    this.exercice = null;
    this.typeExo = "placer";
    this.modeAffichage = "boucle";
    this.dragging = false;
    this.curseur = null; // le curseur sera instancié dans setup
    this.cliqueur = null;
    this.opts = {};

    // --- Atelier / Quiz ---
    this.etatJeu = 'atelier';   // 'atelier' | 'quiz' — atelier : rien n'est compté, questions illimitées.
    this.quizDemarre = false;   // true une fois qu'on a cliqué "Commencer le Quiz"
    this.questionCount = 0;
    this.score = 0;
    this._enterListener = (e) => {
      if (e.key === "Enter") {
          const active = document.activeElement;
          const id = active?.id;
          console.log("actif",id);
          const tag = active?.tagName;
          const isCanvas = tag === "CANVAS";

      // Valide si focus sur champ texte, bouton, ou canevas (en mode placer)
      if (id === "reponse" || id === "validation" || (isCanvas && this.typeExo === "placer")) {
        e.preventDefault();
        this.verifier();
      }
    }
};


    document.addEventListener("keydown", this._enterListener);


    this.sketch = (p) => {
      this.p = p;

      p.setup = () => {



        this.updateDimensions();

        this.canvas = p.createCanvas(this.canvasWidth, this.canvasHeight);
        this.canvas.parent(this.containerId);
        this.canvas.elt.setAttribute("tabindex", "-1");
        p.textAlign(p.CENTER, p.CENTER);

        // Overlay HTML superposé au canvas, pour le rendu LaTeX (MathJax) des
        // étiquettes de points — voir mettreAJourOverlayPoints() dans Configuration.js.
        const conteneur = document.getElementById(this.containerId);
        conteneur.style.position = "relative";
        this.overlay = document.createElement("div");
        this.overlay.className = "points-overlay";
        conteneur.appendChild(this.overlay);
        this._positionOverlay();

        this.initie();
      };

      p.draw = () => {
        // Recalé à chaque frame (pas seulement au resize) : toute mise en
        // page qui décale légèrement le canvas sans déclencher l'événement
        // "resize" (rendu MathJax, apparition d'une scrollbar...) finissait
        // par désynchroniser l'overlay des étiquettes, d'où l'impression de
        // décalage progressif.
        this._positionOverlay();

        p.background(255);
        this.drawGraduation();

if (this.modeAffichage === "boucle") {
   if (this.exercice) this.exercice.draw(this, this.opts);
   if (this.curseur.visible){this.curseur.draw();}else{this.cliqueur.draw();}

}

 else if (this.modeAffichage === "final" && this.exercice?.config) {
          this.exercice.config.drawPoints(this,{
            afficheCiblePoint: true,
            afficheCibleValeur: true,
            mode: "correction"
          }, this.opts);
          if (this.curseur.visible){this.curseur.draw();}else{this.cliqueur.draw();}
        }
      };

      p.windowResized = () => this.updateDimensions();

p.mousePressed = () => this._handlePointerDown(p.mouseX, p.mouseY);

      p.mouseDragged = () => {
        if(!this.curseur.visible) return;
        if (this.modeAffichage !== "boucle") return;
        if (this.dragging) {
        this.curseur.moveTo(p.mouseX);}
      };

      p.mouseReleased = () => {
        if (this.modeAffichage !== "boucle") return;
        if (this.curseur.visible){this.dragging = false;}
        this._validerCible();
      };




 p.touchStarted = () => this._handlePointerDown(p.mouseX, p.mouseY);

      p.touchMoved = () => {
       if(!this.curseur.visible) return;
        if (this.modeAffichage !== "boucle") return;
        if (this.dragging) {
        this.curseur.moveTo(p.mouseX);}
      };

     p.touchEnded = () => {
      if (this.modeAffichage !== "boucle" ) return false;
    
      this.dragging = false;
    
    const idx = this.curseur.getIndex();
    const cibleX = this.scaleStart + idx * this.step;
    const distance = this.p.dist(this.curseur.x, this.canvasHeight / 2, cibleX, this.canvasHeight / 2);
    
 if (Number.isFinite(idx) && idx >= 0 && idx <= 10 && distance < this.dotSize * 0.6) {
  this.exercice.enregistreReponse(idx);
}

    
      return false;
    };
    
    }

    this.p5instance = new p5(this.sketch);

    // Niveau / Type : on relance un exercice avec le nouveau réglage.
    document.getElementById("niveau-select").addEventListener("change", () => this.initie());
    document.getElementById("type-select").addEventListener("change", () => this.initie());

    // Curseur : on garde l'exercice en cours, on bascule juste l'affichage.
    document.getElementById("curseur-checkbox").addEventListener("change", (e) => {
      this.basculerCurseur(e.target.checked);
    });
  }

  /** Bascule curseur mobile / clic direct SANS relancer d'exercice.
   *  Chacun garde son propre état (position du curseur, dernier clic du
   *  cliqueur) : pas de report automatique de l'un vers l'autre, pour que
   *  l'ancien marqueur disparaisse bien quand on décoche/coche la case. */
  basculerCurseur(curseurVisible) {
    if (!this.curseur || !this.cliqueur) return;

    this.curseur.visible = curseurVisible;
    this.cliqueur.visible = !curseurVisible;

    // En mode "final" (après validation), la boucle p5 est arrêtée
    // (this.p.noLoop()) : sans redraw() explicite, le canvas ne se
    // rafraîchit pas et l'ancien curseur/cliqueur reste affiché à l'écran.
    if (this.modeAffichage === "final") this.p.redraw();
  }


_handlePointerDown(x, y) {
  if (this.modeAffichage !== "boucle") return;
  if (this.curseur.visible && this.curseur.isHovered(x, y)) {
    this.dragging = true;
  } else if (this.cliqueur.visible) {
    this.cliqueur.tentativeSet(x, y);
  }
}

_validerCible() {
  if (this.curseur.visible) {
    const idx = this.curseur.getIdx();
    if (Number.isFinite(idx) && idx >= 0 && idx <= 10) {
      this.exercice.enregistreReponse(idx);
    }
  }
  if (this.cliqueur.visible) {
    const idx = this.cliqueur.getIdx();
    if (Number.isFinite(idx) && idx >= 0 && idx <= 10) {
      this.exercice.enregistreReponse(idx);
    }
  }
}



  updateDimensions() {
    this.canvasHeight = 140;
    this.canvasWidth = Math.min(window.innerWidth - 40, 800);
    this.scaleStart = 50;
    this.scaleEnd = this.canvasWidth - 50;
    this.step = Math.floor((this.scaleEnd - this.scaleStart) / 10);
    this.dotSize = this.canvasWidth / 30;
    if(this.curseur) this.curseur.radius = this.dotSize*1.5;
    if(this.cliqueur) this.cliqueur.radius = this.dotSize*1.5;
    this.textTaille = this.canvasWidth / 50;
    if (this.p?.resizeCanvas) this.p.resizeCanvas(this.canvasWidth, this.canvasHeight);
    if (this.curseur?.visible) this.curseur.snapToGrid();
    if (this.cliqueur?.visible && this.cliqueur.clique) this.cliqueur.snapToGrid();
    this._positionOverlay();

  }

  /** Aligne l'overlay HTML (étiquettes LaTeX) exactement sur le canvas p5.js.
   *  Appelé à chaque frame pour rattraper tout décalage (reflow MathJax,
   *  apparition/disparition de scrollbar...) qui ne déclenche pas
   *  "resize" ; on n'écrit le style que si la position a changé, pour ne
   *  pas forcer un reflow inutile 60 fois par seconde. */
  _positionOverlay() {
    if (!this.overlay || !this.canvas) return;
    const elt = this.canvas.elt;
    const left = elt.offsetLeft + elt.clientLeft;
    const top = elt.offsetTop + elt.clientTop;

    if (left === this._overlayLeft && top === this._overlayTop
        && this.canvasWidth === this._overlayWidth && this.canvasHeight === this._overlayHeight) {
      return;
    }

    this._overlayLeft = left;
    this._overlayTop = top;
    this._overlayWidth = this.canvasWidth;
    this._overlayHeight = this.canvasHeight;

    this.overlay.style.left = left + "px";
    this.overlay.style.top = top + "px";
    this.overlay.style.width = this.canvasWidth + "px";
    this.overlay.style.height = this.canvasHeight + "px";
  }

  drawGraduation() {
    const p = this.p;
    p.stroke(0);
    p.line(this.scaleStart/2, this.canvasHeight / 2, this.scaleEnd + 25, this.canvasHeight / 2);
    for (let i = 0; i <= 10; i++) {
      let x = this.scaleStart + i * this.step;
      p.line(x, this.canvasHeight / 2 - 5, x, this.canvasHeight / 2 + 5);
    }
  }

initie() {
  if (this.etatJeu === 'quiz' && !this.quizDemarre) return;
  if (this.etatJeu === 'quiz' && this.questionCount >= 10) { this.terminerQuiz(); return; }

  this.debloquerValidation();
  this.p.frameCount = 0;
  document.getElementById("reponse").disabled = false;
  document.getElementById("validation").disabled = false;
  
  const emojisFantasy = ["👻", "🐲","😄","🐙","🐸","🐵","🏀"]; 
  const emojiMagique = this.p.random(emojisFantasy);
  this.curseur = new Curseur(this, emojiMagique);
  this.cliqueur = new Cliqueur(this, emojiMagique);

  const niveau = parseInt(document.getElementById("niveau-select").value);
  const typeChoisi = document.getElementById("type-select").value;
  this.curseur.visible = document.getElementById("curseur-checkbox").checked;
  this.cliqueur.visible = !this.curseur.visible;
  console.log(this.curseur, this.cliqueur);
  
  const typeFinal = typeChoisi === "mixte" ? this.p.random(["placer", "lire"]) : typeChoisi;

  // --- Choix de l’affichage (rendu en LaTeX via MathJax, voir Configuration.js) ---
  this.opts = { nombreAff: this.p.random(["auto", "fraction", "fractionMixte"]) };

  this.nouvelleQuestion(niveau, typeFinal);
  
  if (this.curseur) {
    if (this.typeExo == "placer") {
      this.curseur.x = this.scaleStart / 2; // revient à gauche
    } else {
      this.curseur.moveToByIdx(this.exercice.config.getCible().idx, true);
    }
  }

  if (this.etatJeu === 'quiz') {
    this.questionCount++;
    this.mettreAJourScoreAffichage();
  }
}

mettreAJourScoreAffichage() {
  const progressElem = document.getElementById("question-progress");
  if (progressElem) progressElem.textContent = `Question ${this.questionCount}/10`;
  const scoreElem = document.getElementById("score");
  if (scoreElem) scoreElem.textContent = `Score : ${this.score}`;
}

terminerQuiz() {
  this.p.noLoop();
  document.getElementById("consigne").style.display = "none";
  document.getElementById("zone-canvas").style.display = "none";
  document.getElementById("zone-reponse").style.display = "none";
  document.getElementById("feedback").textContent = "";

  const fin = document.getElementById("quizFin");
  fin.style.display = "block";
  document.getElementById("quizFinScore").textContent =
    `Ton score final est de : ${this.score} / ${this.questionCount}`;

  if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}


  nouvelleQuestion(niveau = 1, type = "placer") {
    this.typeExo = type;
    const config = creerConfigurationExoNiveau(niveau, this.opts);


// Déplacement ici : après mise à jour de typeExo
    if (this.typeExo === "lire") {
      document.getElementById("reponse")?.focus();
      
    } else {
      this.canvas?.elt?.focus();
    }

    if (type === "lire") {
      this.exercice = new ExoLireAbscisse(config);
      document.getElementById("cible").textContent = `Lire l'abscisse du point ${config.pointCible.lettre}`;
      document.getElementById("zone-reponse").style.display = "block";
      document.getElementById("reponse").style.display = "inline-block";
    } else {
      this.exercice = new ExoPlacerPoint(config);
      const cibleEl = document.getElementById("cible");
      cibleEl.innerHTML = `Placer le point d'abscisse \\(${config.getValeurCible().toLatex(this.opts)}\\)`;
      if (window.MathJax?.typesetPromise) MathJax.typesetPromise([cibleEl]);
      document.getElementById("reponse").style.display = "none";
      document.getElementById("zone-reponse").style.display = "block";
    }

    document.getElementById("feedback").textContent = "";
    document.getElementById("reponse").value = "";
  }

  verifier() {
    console.log(this.curseur);
    if (this.modeAffichage !== "boucle") return;

    const champ = document.getElementById("reponse");
    const rep = champ.value.trim().replace(",", ".");

    const feedbackEl = document.getElementById("feedback");
    const afficherReponseAttendue = (prefixe) => {
      feedbackEl.innerHTML = `${prefixe} \\(${this.exercice.config.getValeurCible().toLatex()}\\)`;
      if (window.MathJax?.typesetPromise) MathJax.typesetPromise([feedbackEl]);
    };

    if (this.typeExo === "lire") {
      if (rep === "") {
        afficherReponseAttendue("❌ Aucune réponse donnée. La bonne réponse était");
        this.bloquerValidation();
        return;
      }

      try {
        const repNb = new Nombre(rep);
        const correct = this.exercice.verifier(repNb);
        if (correct) {
          feedbackEl.textContent = "✅ Bravo !";
        } else {
          afficherReponseAttendue("❌ Non, la bonne réponse était");
        }
        this._enregistrerResultatQuiz(correct);
        this.bloquerValidation();
      } catch (e) {
        feedbackEl.textContent = "⛔ Format invalide";
      }

    } else if (this.typeExo === "placer") {
      const correct = this.exercice.verifier();
      document.getElementById("feedback").textContent = correct
        ? "✅ Bien placé !"
        : `❌ Mauvais emplacement. Cible : ${this.exercice.config.getLettreCible()}`;
      this._enregistrerResultatQuiz(correct);
      this.bloquerValidation();
    }
  }

  _enregistrerResultatQuiz(correct) {
    if (this.etatJeu !== 'quiz') return;
    if (correct) this.score++;
    this.mettreAJourScoreAffichage();
  }

bloquerValidation() {
  document.getElementById("reponse").disabled = true;
  document.getElementById("validation").disabled = true;
  this.modeAffichage = "final";
  this.p.noLoop();
  document.getElementById("suivant")?.focus();

}


debloquerValidation() {
  document.getElementById("reponse").disabled = false;
  document.getElementById("validation").disabled = false;
  this.modeAffichage = "boucle";
  this.p.loop();

  // Nettoyage de tout ancien listener
}

}

class Curseur {
  constructor(app, emoji = "😄") {
    this.app = app;
    this.x = app.scaleStart / 2;
    this.y = app.canvasHeight / 2;
    this.radius = app.dotSize * 1.5;
    this.visible = false;

    this.emoji = emoji;
    this.useEmoji = !navigator.platform.includes("Win"); // Emoji jolis sur Mac/Linux

    // Animation
    this.targetX = this.x;
    this.speed = 5*this.app.step / 60; // 20 px/s à 60 FPS ≈ 0.33 px/frame
    this.moving = false;
  }

  draw() {
    
    if (!this.visible) return;

    if(this.moving){this.updatePosition();}else{this.snapToGrid();}

    const p = this.app.p;

    if (this.useEmoji) {
      const color = (this.app.modeAffichage === "boucle") ? [255, 0, 0, 180] : [255, 0, 0];
      p.fill(...color);
      p.textSize(this.radius);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(this.emoji, this.x, this.y);
    } else {
      // Fallback graphique : double disque rouge
      p.fill(255, 0, 0, 80);
      p.ellipse(this.x, this.y, this.radius, this.radius);
      p.fill(255, 0, 0);
      p.ellipse(this.x, this.y, this.radius / 2, this.radius / 2);
    }
  }

  updatePosition() {
    if (this.moving && this.visible) {
      const dx = this.targetX - this.x;
      if (Math.abs(dx) <= this.speed) {
        this.x = this.targetX;
        this.moving = false;
      } else {
        this.x += dx > 0 ? this.speed : -this.speed;
      }
    }
  }

  moveTo(x) {
    if (!this.visible) return;
    this.moving = false;
    this.x = this.app.p.constrain(x, this.app.scaleStart, this.app.scaleEnd);
  }

  moveToByIdx(idx, animated = false) {
    if (!this.visible) return;
    const target = this.app.scaleStart + idx * this.app.step;

    if (animated) {
      this.targetX = this.app.p.constrain(target, this.app.scaleStart, this.app.scaleEnd);
      this.moving = true;
    } else {
      this.moveTo(target);
    }
  }

  snapToGrid() {
    if (!this.visible) return;
    if (this.x < this.app.scaleStart) return;
    const idx = Math.round((this.x - this.app.scaleStart) / this.app.step);
    this.x = this.app.scaleStart + idx * this.app.step;
  }

  getIdx() {
    if (!this.visible) return;
    return Math.round((this.x - this.app.scaleStart) / this.app.step);
  }

  isHovered(mx, my) {if (!this.visible) return;
    return this.app.p.dist(mx, my, this.x, this.y) < this.radius;
  }
}

class Cliqueur {
  constructor(app, emoji = "😄") {
    this.app = app;
    this.x = null;
    this.y = null;
    this.radius = app.dotSize * 1;
    this.visible = false;
    this.clique = false;
    this.emoji = emoji;
    this.useEmoji = !navigator.platform.includes("Win"); // Emoji jolis sur Mac/Linux

  }
  
  snapToGrid() {
    if (!this.visible) return;
    if (this.x < this.app.scaleStart) return;
    const idx = Math.round((this.x - this.app.scaleStart) / this.app.step);
    this.x = this.app.scaleStart + idx * this.app.step;
  }

  draw() {
    
    if (!this.visible || !this.clique) return;
    this.snapToGrid();
    const p = this.app.p;

    if (this.useEmoji) {
      const color = (this.app.modeAffichage === "boucle") ? [255, 0, 0, 180] : [255, 0, 0];
      p.fill(...color);
      p.textSize(this.radius);
      p.textAlign(p.CENTER, p.CENTER);
      p.text(this.emoji, this.x, this.y);
    } else {
      // Fallback graphique : double disque rouge
      p.fill(255, 0, 0, 80);
      p.ellipse(this.x, this.y, this.radius, this.radius);
      p.fill(255, 0, 0);
      p.ellipse(this.x, this.y, this.radius / 2, this.radius / 2);
    }
  }

tentativeSet(x, y) {
  if (!this.visible) return;

  const idx = Math.round((x - this.app.scaleStart) / this.app.step);
  const newX = this.app.scaleStart + idx * this.app.step;
  const newY = this.app.canvasHeight/2;

  const distance = this.app.p.dist(newX, newY, x ?? 0, y ?? 0);
  const distanceAnc = this.app.p.dist(newX, newY, this.x ?? 0, this.y ?? 0);

  if (distance < this.radius) {
    if(this.clique && distanceAnc < this.radius){
    this.clique = false;
  } else {
    this.x = newX;
    this.y = newY;
    this.clique = true;
  }
}
  console.log("cliqueur",this);
}


  getIdx() {
    if (!this.visible) return;
    return Math.round((this.x - this.app.scaleStart) / this.app.step);
  }


}



console.log("Droitegraduee chargée");