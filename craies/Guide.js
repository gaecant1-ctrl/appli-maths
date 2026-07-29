/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'appli de réduction d'expressions
   ----------------------------------------------
   Pas de modules ES : script global, instancié dans window.onload.

   API publique :
     const guide = new GuideCraies();
     guide.installerBouton(conteneur);   // ajoute le filet + le bouton déclencheur
     guide.ouvrir();
================================================== */

class GuideCraies {
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
      <p>Entraîne-toi à réduire une somme de termes répétés (ex : 2×(x+8)+(x−5)) en une seule expression simplifiée.</p>

      <h3>Mode d'affichage</h3>
      <p>Dans le panneau de gauche, choisis <b>Lettres (x)</b> pour réduire une expression littérale (ex : 2x+3), ou <b>Nombres (100)</b> pour voir la même situation avec x remplacé par 100 — utile pour comprendre le sens du calcul avant de passer aux lettres.</p>

      <h3>Situation visuelle</h3>
      <p>Active ce bouton pour afficher les termes sous forme de boîtes numérotées (une boîte par terme répété), une aide visuelle avant de passer à l'écriture symbolique.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : entraînement libre, questions illimitées, sans score.<br>
      <b>Quiz</b> : clique sur « Commencer le Quiz » dans le panneau pour répondre à 10 questions ; le score s'affiche à la fin.</p>

      <h3>Répondre</h3>
      <p>Écris la forme réduite de l'expression (ex : 2x-1), puis valide avec « Vérifier » ou la touche Entrée. Toute écriture équivalente réduite est acceptée. Le bouton « Renoncer » passe à la question suivante sans compter de point.</p>
    `;

    carte.append(btnFermer, h2, contenu);
    overlay.appendChild(carte);
    // Attaché à <main> (pas à body) : l'overlay ne couvre que la zone
    // d'exercice, le header et le panneau latéral restent visibles et utilisables.
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
    if (document.getElementById('guide-craies-css')) return;
    const style = document.createElement('style');
    style.id = 'guide-craies-css';
    style.textContent = `
      #overlayGuide{
        display:none;
        position:absolute;
        inset:0;
        background:rgba(25,118,210,0.15);
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
        border:2px solid #1976d2;
        box-shadow:0 20px 60px rgba(25,118,210,0.2);
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
        background:rgba(25,118,210,0.08);
        border:1px solid rgba(25,118,210,0.3);
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        color:#555;
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerGuide:hover{ background:rgba(198,40,40,0.12); color:#c62828; }

      #guideCarte h2{
        text-align:center;
        margin:0 0 20px;
        font-size:1.3em;
        color:#1976d2;
      }

      #guideContenu h3{
        color:#1976d2;
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

window.GuideCraies = GuideCraies;
