/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'appli de conversion
   ----------------------------------------------
   Pas de modules ES : script global, instancié dans window.onload.

   API publique :
     const guide = new GuideConversion();
     guide.installerBouton(conteneur);   // ajoute le filet + le bouton déclencheur
     guide.ouvrir();
================================================== */

class GuideConversion {
  constructor() {
    this.overlay = null;
    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton déclencheur ---------------- */

  installerBouton(conteneur) {
    if (!conteneur) return null;

    const filet = document.createElement('span');
    filet.className = 'header-filet';

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-header';
    btn.textContent = 'Guide';
    btn.addEventListener('click', () => this.ouvrir());

    conteneur.append(filet, btn);
    return btn;
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlayGuide';

    const carte = document.createElement('div');
    carte.id = 'guideCarte';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerGuide';
    btnFermer.type = 'button';
    btnFermer.setAttribute('aria-label', 'Fermer');
    btnFermer.textContent = '×';
    btnFermer.addEventListener('click', () => this.fermer());

    const h2 = document.createElement('h2');
    h2.textContent = "Mode d'emploi";

    const contenu = document.createElement('div');
    contenu.id = 'guideContenu';
    contenu.innerHTML = `
      <h3>Objectif</h3>
      <p>Entraîne-toi à convertir une longueur, une aire, un volume ou une capacité d'une unité vers une autre.</p>

      <h3>Type de conversion</h3>
      <p>Dans le panneau de gauche, coche <b>Longueur</b>, <b>Aire</b>, <b>Volume</b> et/ou <b>Capacité</b> pour restreindre le tirage à ces types. Si rien n'est coché, les quatre types sont mélangés au hasard.</p>
      <p><b>Capacité</b> convertit toujours entre une unité de contenance (L, dL, cL, mL, daL, hL, kL) et une unité de volume (mm³ à km³), par exemple 1 dm³ = 1 L ou 1 cm³ = 1 mL.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : entraînement libre, questions illimitées, sans score.<br>
      <b>Quiz</b> : clique sur « Commencer le Quiz » dans le panneau pour répondre à 10 questions ; le score s'affiche à la fin.</p>

      <h3>Répondre</h3>
      <p>Saisis la valeur convertie avec son unité (ex : 3.5 m ou 350 cm), puis valide avec la touche Entrée. En cas d'erreur, la bonne réponse s'affiche et tu passes à la question suivante. Le bouton « Abandonner » passe à l'exercice suivant sans compter de point.</p>

      <h3>Fiche papier</h3>
      <p>Génère une fiche imprimable d'exercices de conversion avec les types actuellement sélectionnés (à imprimer ou exporter).</p>
    `;

    carte.append(btnFermer, h2, contenu);
    overlay.appendChild(carte);
    // Attaché à <main> (pas à body) : l'overlay ne couvre que la zone de
    // réponse, le header et le panneau latéral restent visibles et utilisables.
    (document.querySelector('main') || document.body).appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.fermer();
    });
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer();
    };
    document.addEventListener('keydown', this._onKeydown);

    this.overlay = overlay;
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    this.overlay.classList.add('visible');
  }

  fermer() {
    this.overlay.classList.remove('visible');
  }

  /* ---------------- CSS ---------------- */

  _installerCSS() {
    if (document.getElementById('guide-conversion-css')) return;
    const style = document.createElement('style');
    style.id = 'guide-conversion-css';
    style.textContent = `
      #overlayGuide{
        display:none;
        position:absolute;
        inset:0;
        background:rgba(125,51,88,0.15);
        backdrop-filter: blur(2px);
        z-index:1000;
        align-items:flex-start;
        justify-content:center;
        padding:24px;
        overflow-y:auto;
      }
      #overlayGuide.visible{ display:flex; }

      #guideCarte{
        position:relative;
        background:#fff;
        color:#222;
        max-width:640px;
        width:100%;
        max-height:85vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:16px;
        border:2px solid #7d3358;
        box-shadow:0 20px 60px rgba(125,51,88,0.2);
        padding:28px 32px;
      }
      #guideCarte::-webkit-scrollbar{ display:none; }

      #btnFermerGuide{
        position:absolute;
        top:14px; right:18px;
        width:32px; height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(125,51,88,0.08);
        border:1px solid rgba(125,51,88,0.3);
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        color:#555;
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerGuide:hover{ background:rgba(196,67,54,0.12); color:#c44336; }

      #guideCarte h2{
        text-align:center;
        margin:0 0 20px;
        font-size:1.3em;
        color:#7d3358;
      }

      #guideContenu h3{
        color:#7d3358;
        font-size:1em;
        margin:18px 0 6px;
      }
      #guideContenu h3:first-child{ margin-top:0; }
      #guideContenu p{
        margin:0 0 4px;
        line-height:1.5;
        font-size:0.95em;
        color:#333;
      }

    `;
    document.head.appendChild(style);
  }
}

window.GuideConversion = GuideConversion;
