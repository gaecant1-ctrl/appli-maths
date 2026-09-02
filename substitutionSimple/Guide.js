/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'appli d'évaluation numérique
   ----------------------------------------------
   Pas de modules ES : script global, instancié dans window.onload.

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
      <p>Le tableau a une valeur de \\(\\gamma\\) par ligne et une expression par colonne. Calcule la valeur de l'expression surlignée en vert pour le \\(\\gamma\\) de sa ligne.</p>

      <h3>Inconnues</h3>
      <p>Choisis dans le panneau de gauche <b>1 inconnue</b> (γ), <b>2 inconnues</b> (a et b) ou <b>3 inconnues</b> (a, b et c).</p>

      <h3>Motifs</h3>
      <p>Choisis le motif d'expressions à travailler. En mode 1 inconnue : <b>Base</b> (expressions simples : \\(2\\gamma\\), \\(\\gamma^2\\), \\(-\\gamma\\)…) ou l'un des motifs autour des identités remarquables (\\((\\gamma+1)^2\\), \\(\\gamma^2-1\\)…). Un seul motif est actif à la fois.</p>

      <h3>Répondre</h3>
      <p>Calcule la valeur attendue, saisis-la dans le champ sous le tableau (nombre décimal comme <code>1.5</code>, ou fraction comme <code>-3/4</code>) et valide avec le bouton ou la touche Entrée. Si la réponse est correcte, elle reste affichée dans le tableau et le bouton devient « Suivant » : clique dessus (ou Entrée) pour passer à une autre case.</p>

      <h3>Mode retry</h3>
      <p><b>Activé</b> (par défaut) : une réponse fausse laisse la case jaune et vide, et affiche « Réessayer » (avec le focus) pour retenter la même case, ou « Abandon » pour révéler la bonne réponse et passer à la suite. <b>Désactivé</b> : une réponse fausse affiche directement ta réponse dans la case (fond rouge) et passe à « Suivant ».</p>

      <h3>Couleur des cases</h3>
      <p>Une fois une case quittée, elle affiche la valeur que tu as tapée (pas forcément sous la même écriture que la valeur exacte) : <b>vert</b> si c'était juste, <b>rouge</b> si c'était faux. En cas d'abandon, la case reste <b>rouge et vide</b> (aucune valeur n'a été validée).</p>

      <h3>Nouvelle grille</h3>
      <p>Tire de nouvelles valeurs de \\(\\gamma\\) et un nouveau motif d'expressions. Une nouvelle grille est aussi proposée automatiquement une fois toutes les cases de la grille courante travaillées.</p>

      <h3>Fiche papier</h3>
      <p>Génère un tableau imprimable (γ en lignes, expressions en colonnes, toutes les cases vides), à imprimer ou à exporter en LaTeX, avec un motif tiré parmi ceux actuellement actifs.</p>
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
    if (window.MathJax && MathJax.typesetPromise) MathJax.typesetPromise([this.overlay]);
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
        position:absolute;
        inset:0;
        background:rgba(230,126,34,0.15);
        backdrop-filter: blur(2px);
        z-index:1000;
        /* flex-start (pas center) : si la carte est plus haute que la zone
           visible, son début reste atteignable en faisant défiler l'overlay,
           au lieu d'être centrée hors-champ et inaccessible. */
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
        border:2px solid #E67E22;
        box-shadow:0 20px 60px rgba(230,126,34,0.2);
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
        background:rgba(230,126,34,0.08);
        border:1px solid rgba(230,126,34,0.3);
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
        color:#E67E22;
      }

      #guideContenu h3{
        color:#E67E22;
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
