/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'appli Rectiformes
   ----------------------------------------------
   Pas de modules ES : script global, instancié dans script.js.

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
      <p>Entraîne-toi à exprimer l'<b>aire</b> ou le <b>périmètre</b> d'une figure composée de rectangles, à l'aide des longueurs <b>a</b>, <b>b</b> et <b>c</b> repérées par leur couleur sur la figure (vert, bleu, rouge).</p>

      <h3>Type</h3>
      <p>Active <b>Aire</b> et/ou <b>Périmètre</b> : un seul actif limite les questions à ce type, les deux actifs les mélangent au hasard.</p>

      <h3>Mode</h3>
      <p>Active <b>Numérique</b> et/ou <b>Littéral</b> : ce que tu dois répondre. En numérique, calcule la valeur avec les nombres de a, b, c (ex : <code>195*115+85^2</code>). En littéral, écris la formule en fonction des lettres (ex : <code>a*b + c^2</code>). Les deux actifs acceptent l'une ou l'autre forme.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : entraînement libre, questions illimitées. <b>Quiz</b> : clique sur « 🎯 Commencer le Quiz » pour répondre à <b>10 questions</b> notées ; le score s'affiche à la fin. En Quiz, Type et Mode sont bloqués le temps de la série.</p>

      <h3>Répondre</h3>
      <p>Saisis ta réponse et valide avec « Valider » ou la touche Entrée. L'écriture n'a pas besoin d'être développée ou réduite : toute expression équivalente à la réponse attendue est acceptée (multiplication implicite comme <code>5ac</code> comprise). Si c'est correct, le bouton devient « Suivant » pour passer à la question suivante. Sinon, utilise « Abandonner » pour passer sans compter de point.</p>

      <h3>Afficher / masquer les valeurs</h3>
      <p>Le bouton 👁️ cache ou révèle les valeurs numériques de a, b et c, pour s'entraîner à raisonner uniquement sur la figure.</p>

      <h3>Retirage</h3>
      <p>Le bouton 🎲 tire de nouvelles valeurs pour a, b et c sur la <b>même figure</b>, sans changer de question.</p>
    `;

    carte.append(btnFermer, h2, contenu);
    overlay.appendChild(carte);
    // Attaché à <body> : l'overlay couvre toute la page.
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
      #overlayGuide{
        display:none;
        position:fixed;
        inset:0;
        background:rgba(37,99,235,0.15);
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
        border:2px solid #2563eb;
        box-shadow:0 20px 60px rgba(37,99,235,0.2);
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
        background:rgba(37,99,235,0.08);
        border:1px solid rgba(37,99,235,0.3);
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
        color:#2563eb;
      }

      #guideContenu h3{
        color:#2563eb;
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
      #guideContenu code{
        background:#eff6ff;
        border-radius:4px;
        padding:1px 5px;
        font-size:0.92em;
      }

    `;
    document.head.appendChild(style);
  }
}

window.GuideAppli = GuideAppli;
