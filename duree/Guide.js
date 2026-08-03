/* ==============================================
   Guide.js — overlay "Mode d'emploi" pour le jeu d'appariement
   ----------------------------------------------
   Meme pattern que Fiche.js : CSS injecte une seule fois, overlay
   construit en DOM, ouverture/fermeture par clic sur le fond, la
   croix, ou la touche Echap.
================================================== */

export class GuideAppli {

  constructor() {
    this.overlay = null;
    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton declencheur ---------------- */

  installerBouton(conteneur) {
    if (!conteneur) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnGuideAppariement';
    btn.className = 'btn-header';
    btn.textContent = 'Guide';
    btn.addEventListener('click', () => this.ouvrir());
    conteneur.appendChild(btn);
    return btn;
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlayGuideAppariement';

    const carte = document.createElement('div');
    carte.id = 'guideAppCarte';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerGuideApp';
    btnFermer.type = 'button';
    btnFermer.setAttribute('aria-label', 'Fermer');
    btnFermer.textContent = '×';
    btnFermer.addEventListener('click', () => this.fermer());

    const h2 = document.createElement('h2');
    h2.textContent = "Mode d'emploi";

    const contenu = document.createElement('div');
    contenu.innerHTML = `
      <h3>Objectif</h3>
      <p>
        Retrouve les paires : chaque jeton rose affiche une durée en heures
        (fraction ou nombre décimal), chaque jeton bleu affiche la même durée
        en heures et minutes. Clique sur deux jetons pour les comparer — s'ils
        correspondent, ils disparaissent.
      </p>

      <h3>Les vies</h3>
      <p>
        Les trois ronds en haut à gauche représentent tes vies pour le niveau
        en cours. Une erreur en fait perdre un. À la 3ᵉ erreur, la grille se
        retourne et se remélange — tu repars avec trois vies fraîches, mais
        les ronds deviennent argentés pour te rappeler que la grille a déjà
        été relancée.
      </p>

      <h3>Les étoiles</h3>
      <p>
        Les étoiles à droite récompensent chaque niveau terminé. Termine un
        niveau sans jamais faire d'erreur pour gagner une étoile <b>dorée</b>.
        Si la grille a dû être relancée mais que tu termines sans nouvelle
        erreur depuis, tu gagnes quand même une étoile <b>argentée</b>.
      </p>

      <h3>Niveaux</h3>
      <p>
        Le jeu comporte plusieurs niveaux, de plus en plus difficiles
        (fractions simples, fractions impropres, écritures décimales).
        Termine tous les niveaux pour voir l'écran de victoire.
      </p>
    `;

    carte.append(btnFermer, h2, contenu);
    overlay.appendChild(carte);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.fermer();
    });
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer();
    };
    document.addEventListener('keydown', this._onKeydown);

    this.overlay = overlay;
  }

  ouvrir() {
    this.overlay.classList.add('visible');
    document.body.classList.add('guide-app-ouvert');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('guide-app-ouvert');
  }

  /* ---------------- CSS (overlay) ---------------- */

  _installerCSS() {
    if (document.getElementById('guide-appariement-css')) return;
    const style = document.createElement('style');
    style.id = 'guide-appariement-css';
    style.textContent = `
      #overlayGuideAppariement{
        display:none;
        position:fixed;
        top:0; right:0; bottom:0; left:0;
        background:rgba(15,23,42,0.7);
        backdrop-filter: blur(2px);
        z-index:1000000;
        align-items:center;
        justify-content:center;
        padding:24px;
        overflow-y:auto;
      }
      #overlayGuideAppariement.visible{ display:flex; }

      #guideAppCarte{
        position:relative;
        background:#0f172a;
        color:#f8fafc;
        max-width:700px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:16px;
        border:2px solid #facc15;
        box-shadow:0 20px 60px rgba(0,0,0,0.5);
        padding:28px 32px;
      }
      #guideAppCarte::-webkit-scrollbar{ display:none; }

      #btnFermerGuideApp{
        position:absolute;
        top:14px; right:18px;
        width:32px; height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(255,255,255,0.06);
        border:1px solid rgba(255,255,255,0.15);
        border-radius:50%;
        font-size:20px;
        line-height:1;
        cursor:pointer;
        color:#cbd5e1;
        transition: background 0.15s ease, color 0.15s ease;
      }
      #btnFermerGuideApp:hover{ background:rgba(255,77,109,0.18); color:#ff4d6d; }

      #guideAppCarte h2{
        text-align:center;
        margin:0 0 20px;
        font-size:1.3em;
        color:#facc15;
      }
      #guideAppCarte h3{
        color:#facc15;
        margin:20px 0 4px;
        font-size:1.02em;
      }
      #guideAppCarte h3:first-of-type{ margin-top:0; }
      #guideAppCarte p{
        margin:0 0 4px;
        line-height:1.55;
        color:#e2e8f0;
        font-size:0.95em;
      }

      body.guide-app-ouvert{ overflow:hidden; }
    `;
    document.head.appendChild(style);
  }
}

window.GuideAppli = GuideAppli;
