import { Paire } from "./Paire.js";
import { shuffle, correspond } from "./Utils.js";
import { afficherEcranFinal } from "./image.js";

export class GestionGrille {

  constructor(cols, rows, container, niveau = 1) {
    this.cols = cols;
    this.rows = rows;
    this.container = container;
    this.niveau = niveau;
    this.niveauMax = 1;
    this.jeuTermine = false;
    this.errors = 0;

    this.boules = [];     // liste des objets DOM mobiles
    this.selected = [];

    this.container.style.display = "grid";
    this.container.style.gridTemplateColumns = `repeat(${cols}, 90px)`;
    this.container.style.gridTemplateRows = `repeat(${rows}, 90px)`;
    this.container.style.gap = "12px";

    this.init();
  }

  init() {

    this.container.innerHTML = "";
    this.boules = [];
    this.selected = [];
    this.errors = 0;
    this.mettreAJourEtoile();

    const nbPaires = (this.cols * this.rows) / 2;
    let tas = [];
    let dejaVus = new Set();

    while (tas.length < this.cols * this.rows) {
      const paire = new Paire(this.niveau);
      const fraction = paire.objets[0];
      const signature = `${fraction.m}/${fraction.d}`;

      if (!dejaVus.has(signature)) {
        dejaVus.add(signature);
        tas.push(...paire.objets);
      }
    }

    tas = shuffle(tas);

    let index = 0;

    for (let col = 0; col < this.cols; col++) {
      for (let row = 0; row < this.rows; row++) {

        const objet = tas[index++];

        const el = document.createElement("div");
        el.className = "cell";
        el.textContent = objet.fiche();

        // couleur selon type

        el.classList.add(objet.type);

        el.style.gridColumn = col + 1;
        el.style.gridRow = this.rows - row;

        el.addEventListener("click", () => {
          this.selectionner(objet, el);
        });

        this.container.appendChild(el);

        this.boules.push({
          objet,
          col,
          row,
          el
        });
      }
    }
    
    if (window.MathJax) {
  MathJax.typesetPromise([this.container]);
}
  }

  selectionner(objet, el) {

    if (this.selected.length === 2) return;

    if (this.selected.some(s => s.el === el)) return;

    el.classList.add("selected");
    this.selected.push({ objet, el });

    if (this.selected.length === 2) {
      setTimeout(() => this.tester(), 300);
    }
  }

tester() {

  const [a, b] = this.selected;

if (!correspond(a.objet, b.objet)) {

  this.errors++;
  this.mettreAJourEtoile();

  a.el.classList.add("error");
  b.el.classList.add("error");

  setTimeout(() => {
    a.el.classList.remove("error");
    b.el.classList.remove("error");

    a.el.classList.remove("selected");
    b.el.classList.remove("selected");

    this.selected = [];
  }, 350);

  return;
}

  let animationsTerminees = 0;

  const finAnimation = (el) => {

    el.removeEventListener("animationend", handler);
    animationsTerminees++;

    if (animationsTerminees === 2) {
      this.supprimer(a.el);
      this.supprimer(b.el);
      setTimeout(() => this.appliquerGravite(), 80);
    }
  };

  const handler = function () {
    finAnimation(this);
  };

  a.el.addEventListener("animationend", handler);
  b.el.addEventListener("animationend", handler);

  a.el.classList.add("disappearing");
  b.el.classList.add("disappearing");

  this.selected = [];
}

supprimer(el) {

  const boule = this.boules.find(b => b.el === el);
  if (!boule) return;

  boule.row = null;

  // on retire proprement du DOM
  el.remove();
}

verifierFin() {
  const restantes = this.boules.filter(b => b.row !== null);
  return restantes.length === 0;
}

mettreAJourEtoile() {

  const star = document.getElementById("levelStar");

  star.classList.remove("level-0","level-1","level-2","level-3");

  let level = Math.min(this.errors, 3);

  star.classList.add("level-" + level);
}

niveauSuivant() {

  if (this.niveau >= this.niveauMax) {
    this.finDuJeu();
    return;
  }

  this.niveau++;

  const display = document.getElementById("niveauDisplay");
  display.textContent = "Niveau " + this.niveau;

  this.transitionNiveau(() => {
    this.init();
  });
}

finDuJeu() {
  afficherEcranFinal(this.container);
}


transitionNiveau(callback) {

  this.container.style.opacity = "0";
  this.container.style.transform = "scale(0.9)";

  setTimeout(() => {
    callback();
    this.container.style.opacity = "1";
    this.container.style.transform = "scale(1)";
  }, 400);
}

appliquerGravite() {

  const positionsAvant = new Map();

  // 1️⃣ mémoriser positions avant
  this.boules.forEach(boule => {
    if (boule.row !== null) {
      const rect = boule.el.getBoundingClientRect();
      positionsAvant.set(boule, rect.top);
    }
  });

  // 2️⃣ appliquer gravité logique
  for (let col = 0; col < this.cols; col++) {

    const colonne = this.boules
      .filter(b => b.col === col && b.row !== null)
      .sort((a, b) => a.row - b.row);

    for (let i = 0; i < colonne.length; i++) {
      colonne[i].row = i;
      colonne[i].el.style.gridRow = this.rows - i;
    }
  }

  // 3️⃣ attendre le reflow
  requestAnimationFrame(() => {

    this.boules.forEach(boule => {

      if (boule.row !== null && positionsAvant.has(boule)) {

        const rectApres = boule.el.getBoundingClientRect();
        const delta = positionsAvant.get(boule) - rectApres.top;

        if (delta !== 0) {

          boule.el.style.transition = "none";
          boule.el.style.transform = `translateY(${delta}px)`;

          requestAnimationFrame(() => {
            boule.el.style.transition = "transform 0.45s cubic-bezier(.25,.8,.25,1)";
            boule.el.style.transform = "translateY(0)";
          });
        }
      }
    });
  });
if (this.verifierFin()) {
  this.mettreAJourEtoile();
  setTimeout(() => this.niveauSuivant(), 1000);
}
}
}