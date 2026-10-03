/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'appli « somme en nombre mixte »
   ----------------------------------------------
   Pas de modules ES : script global, instancié au chargement.

   API publique :
     const guide = new GuideAppli();
     guide.installerBouton(conteneur);   // ajoute le filet + le bouton déclencheur
     guide.ouvrir();
================================================== */

class GuideAppli {
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
      <p>Calcule la somme de tous les jetons. Écris-la en nombre mixte : un entier + une fraction plus petite que 1.</p>

      <h3>Répondre</h3>
      <p>Écris la somme dans le cadre de droite, par exemple <b>5+2/3</b>, puis Valider (ou Entrée).</p>

      <h3>Regrouper</h3>
      <p>Pour t'aider, choisis des jetons puis « Regrouper ». Écris ce qu'ils font, par exemple <b>2+1/3</b>.<br>
      Juste : les jetons sont remplacés par le résultat.<br>
      Faux : tout est désélectionné, recommence.</p>

      <h3>Niveau</h3>
      <p><b>Facile</b> : demis, tiers, quarts.<br>
      <b>Moyen</b> : tous les dénominateurs.<br>
      <b>Difficile</b> : des dénominateurs différents.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : questions illimitées, sans score.<br>
      <b>Quiz</b> : « Commencer le Quiz », 10 questions, score à la fin.<br>
      « Renoncer » passe à la question suivante sans point.</p>

      <h3>Fiche papier</h3>
      <p>Fiche de 8 exercices du niveau choisi, à imprimer ou à exporter en LaTeX.</p>
    `;

    carte.append(btnFermer, h2, contenu);
    overlay.appendChild(carte);
    // Attaché à <main> : le header et le panneau latéral restent utilisables.
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
    if (document.getElementById('guide-appli-css')) return;
    const style = document.createElement('style');
    style.id = 'guide-appli-css';
    style.textContent = `
      main{ position:relative; }
      #overlayGuide{
        display:none;
        position:absolute;
        inset:0;
        background:rgba(47,158,68,0.12);
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
        border:2px solid #2f9e44;
        box-shadow:0 20px 60px rgba(47,158,68,0.2);
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
        background:rgba(47,158,68,0.08);
        border:1px solid rgba(47,158,68,0.3);
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        color:#555;
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerGuide:hover{ background:rgba(231,76,60,0.12); color:#e74c3c; }

      #guideCarte h2{
        text-align:center;
        margin:0 0 20px;
        font-size:1.3em;
        color:#2f9e44;
      }

      #guideContenu h3{
        color:#2f9e44;
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

window.GuideAppli = GuideAppli;
