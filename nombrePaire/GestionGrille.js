import { Paire } from "./Paire.js";
import { shuffle, correspond } from "./Utils.js";
import { afficherEcranFinal } from "./image.js";

// Retire le balisage LaTeX pour estimer la longueur visible du texte rendu.
function estTropLong(ficheLatex) {
  const nettoye = ficheLatex.replace(/\\[a-zA-Z]+/g, "").replace(/[{}\\()]/g, "");
  return nettoye.length > 6;
}

export class GestionGrille {

  constructor(cols, rows, container, niveau = 1) {
    this.cols = cols;
    this.rows = rows;
    this.container = container;
    this.niveau = niveau;
    this.niveauMax = 3;
    this.jeuTermine = false;
    this.errors = 0;
    this.vies = 3;
    this.erreursDepuisReset = 0;
    this.resetNiveau = false;
    this.etoiles = new Array(this.niveauMax).fill(null); // null | "or" | "argent"

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

this.mettreAJourVies();
this.mettreAJourEtoile();

    const nbPaires = (this.cols * this.rows) / 2;
    let tas = [];
    let dejaVus = new Set();

    while (tas.length < this.cols * this.rows) {
      const paire = new Paire(this.niveau);

      if (!dejaVus.has(paire.signature)) {
        dejaVus.add(paire.signature);
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

        // écriture longue (ex: mixte "2+9/10", pourcentage "87,5%") :
        // texte plus large, on réduit la police pour qu'il tienne dans
        // le jeton au lieu de déborder.
        if (estTropLong(objet.fiche())) {
          el.classList.add("long");
        }

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

    if (this.selected.some(s => s.el === el)) {
      el.classList.remove("selected");
      this.selected = this.selected.filter(s => s.el !== el);
      return;
    }

    if (this.selected.length === 2) return;

    el.classList.add("selected");
    this.selected.push({ objet, el });

    if (this.selected.length === 2) {
      setTimeout(() => this.tester(), 300);
    }
  }

tester() {

  const [a, b] = this.selected;

if (!correspond(a.objet, b.objet)) {

  this.ajouterErreur();

  a.el.classList.add("error");
  b.el.classList.add("error");

  setTimeout(() => {

    if (this.vies <= 0) {
      this.resetNiveau = true;
      this.retournerGrille(() => {
        this.vies = 3;
        this.erreursDepuisReset = 0;
        this.init();
      });
      return;
    }

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

  const index = this.boules.findIndex(b => b.el === el);
  if (index === -1) return;

  // suppression logique
  this.boules.splice(index, 1);

  // suppression DOM
  el.remove();
}

verifierFin() {
  return this.boules.length === 0;
}


ajouterErreur() {

  this.vies = Math.max(0, this.vies - 1);
  this.erreursDepuisReset++;
  this.mettreAJourVies();
}

mettreAJourVies() {

  const container = document.getElementById("vies");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < 3; i++) {

    const rond = document.createElement("span");
    rond.classList.add("rond");

    if (i < this.vies) {
      rond.classList.add(this.resetNiveau ? "argent" : "gagne");
    } else {
      rond.classList.add("vide");
    }

    container.appendChild(rond);
  }
}

mettreAJourEtoile() {

  const container = document.getElementById("stars");
  if (!container) return;

  container.innerHTML = "";

  for (let i = 0; i < this.niveauMax; i++) {

    const etoile = document.createElement("span");
    etoile.textContent = "★";
    etoile.classList.add("etoile");

    if (this.etoiles[i] === "or") etoile.classList.add("gagne");
    else if (this.etoiles[i] === "argent") etoile.classList.add("argent");
    else etoile.classList.add("vide");

    container.appendChild(etoile);
  }
}

niveauSuivant() {

  if (this.niveau >= this.niveauMax) {
    this.finDuJeu();
    return;
  }

  this.niveau++;

  this.transitionNiveau(() => {
    this.vies = 3;
    this.erreursDepuisReset = 0;
    this.resetNiveau = false;
    this.init();
  });
}

finDuJeu() {
  afficherEcranFinal(this.container);
}


retournerGrille(callback) {

  const cells = this.container.querySelectorAll(".cell");
  cells.forEach(c => c.classList.add("flip-out"));

  setTimeout(() => {

    callback();

    const nouvellesCells = this.container.querySelectorAll(".cell");
    nouvellesCells.forEach(c => c.classList.add("flip-in"));

    setTimeout(() => {
      nouvellesCells.forEach(c => c.classList.remove("flip-in"));
    }, 300);

  }, 300);
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
      .filter(b => b.col === col)
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

  if (this.erreursDepuisReset === 0) {
    this.etoiles[this.niveau - 1] = this.resetNiveau ? "argent" : "or";
  }

  this.mettreAJourEtoile();
  setTimeout(() => this.niveauSuivant(), 200);
}
}
}