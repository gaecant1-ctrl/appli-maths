/* ==============================================
   GuideAbscisse.js — overlay "Mode d'emploi" de l'appli Droite graduée
   ----------------------------------------------
   Pas de modules ES : script global, instancié dans window.onload.

   API publique :
     const guide = new GuideAbscisse();
     guide.installerBouton(conteneur);   // ajoute le filet + le bouton déclencheur
     guide.ouvrir();
================================================== */

class GuideAbscisse {
  constructor() {
    this.overlay = null;
    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton déclencheur ---------------- */

  installerBouton(conteneur) {
    if (!conteneur) return null;

    const filet = document.createElement('div');
    filet.className = 'filet-header';

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
    overlay.id = 'overlayGuideAbscisse';

    const carte = document.createElement('div');
    carte.id = 'guideCarteAbscisse';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerGuideAbscisse';
    btnFermer.type = 'button';
    btnFermer.setAttribute('aria-label', 'Fermer');
    btnFermer.textContent = '×';
    btnFermer.addEventListener('click', () => this.fermer());

    const h2 = document.createElement('h2');
    h2.textContent = "Mode d'emploi";

    const contenu = document.createElement('div');
    contenu.id = 'guideContenuAbscisse';
    contenu.innerHTML = `
      <h3>Objectif</h3>
      <p>Entraîne-toi à placer ou à lire l'abscisse d'un point sur une droite graduée.</p>

      <h3>Niveau</h3>
      <p>Choisis un niveau dans le panneau de gauche : niveaux 1 et 2 (pas entiers), niveaux 3 et 4 (pas fractionnaires simples ou composés), niveau 5 (fractions), niveau 6 (décimaux), ou <b>Mixte</b> pour un niveau tiré au hasard à chaque question.</p>

      <h3>Type</h3>
      <p><b>Placer</b> : place le point à l'abscisse demandée. <b>Lire</b> : indique l'abscisse du point affiché. <b>Mixte</b> : le type est tiré au hasard à chaque question.</p>

      <h3>Curseur</h3>
      <p>Coche la case pour déplacer un curseur mobile par glisser-déposer ; décoche-la pour placer le point en cliquant directement sur la position voulue.</p>

      <h3>Répondre</h3>
      <p>Valide avec le bouton « Valider » ou la touche Entrée. Clique sur « Suivant » pour passer à la question suivante.</p>
    `;

    carte.append(btnFermer, h2, contenu);
    overlay.appendChild(carte);
    // Attaché à <main> (pas à body) : l'overlay ne couvre que la zone de
    // l'exercice, le header et le panneau latéral restent visibles et utilisables.
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
    if (document.getElementById('guide-abscisse-css')) return;
    const style = document.createElement('style');
    style.id = 'guide-abscisse-css';
    style.textContent = `
      #overlayGuideAbscisse{
        display:none;
        position:absolute;
        inset:0;
        background:rgba(0,122,204,0.15);
        backdrop-filter: blur(2px);
        z-index:1000;
        align-items:flex-start;
        justify-content:center;
        padding:24px;
        overflow-y:auto;
      }
      #overlayGuideAbscisse.visible{ display:flex; }

      #guideCarteAbscisse{
        position:relative;
        background:#fff;
        color:#222;
        max-width:640px;
        width:100%;
        max-height:85vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:16px;
        border:2px solid #007acc;
        box-shadow:0 20px 60px rgba(0,122,204,0.2);
        padding:28px 32px;
      }
      #guideCarteAbscisse::-webkit-scrollbar{ display:none; }

      #btnFermerGuideAbscisse{
        position:absolute;
        top:14px; right:18px;
        width:32px; height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(0,122,204,0.08);
        border:1px solid rgba(0,122,204,0.3);
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        color:#555;
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerGuideAbscisse:hover{ background:rgba(231,76,60,0.12); color:#e74c3c; }

      #guideCarteAbscisse h2{
        text-align:center;
        margin:0 0 20px;
        font-size:1.3em;
        color:#007acc;
      }

      #guideContenuAbscisse h3{
        color:#007acc;
        font-size:1em;
        margin:18px 0 6px;
      }
      #guideContenuAbscisse h3:first-child{ margin-top:0; }
      #guideContenuAbscisse p{
        margin:0 0 4px;
        line-height:1.5;
        font-size:0.95em;
        color:#333;
      }
    `;
    document.head.appendChild(style);
  }
}

window.GuideAbscisse = GuideAbscisse;
