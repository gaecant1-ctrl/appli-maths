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
      <p>Entraîne-toi à calculer une expression purement numérique en respectant les <b>priorités opératoires</b> (parenthèses, puis multiplication/division, puis addition/soustraction).</p>

      <h3>Niveau</h3>
      <p>Choisis un seul niveau dans le panneau de gauche : <b>6e</b> (priorités simples, toujours sans nombre négatif), <b>5e</b> (introduit les nombres relatifs), <b>4e/3e</b> (carrés, parenthèses et formes combinées plus complexes).</p>

      <h3>Type de nombres</h3>
      <p>Choisis le type des nombres qui apparaissent dans l'expression : <b>Entiers</b>, <b>Décimaux</b> (ex : 0.4) ou <b>Fractions</b> (ex : -3/4). Plusieurs types peuvent être actifs à la fois : le type est alors tiré au hasard à chaque question.</p>

      <h3>Écriture simplifiée</h3>
      <p><b>Non</b> (par défaut) : un nombre ajouté qui est négatif reste écrit tel quel, ex : 5 + (-3). <b>Oui</b> : cette écriture est simplifiée en 5 - 3. Dans tous les cas, une soustraction d'un nombre négatif (ex : 5 - (-3)) reste toujours écrite telle quelle.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : entraînement libre, questions illimitées, sans score.<br>
      <b>Quiz</b> : clique sur « Commencer le Quiz » pour répondre à 10 questions ; le score s'affiche à la fin.</p>

      <h3>Répondre</h3>
      <p>Calcule l'expression affichée en respectant les priorités opératoires, puis saisis le résultat et valide avec la touche Entrée. N'importe quelle écriture numérique équivalente est acceptée (ex : 7 ou 1+2×3). En cas d'erreur, corrige et réessaie. Le bouton « Renoncer » passe à la question suivante sans compter de point.</p>

      <h3>Fiche papier</h3>
      <p>Génère une fiche imprimable de 8 exercices (à imprimer ou à exporter en LaTeX) avec le niveau et le type de nombres actuellement sélectionnés.</p>
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
