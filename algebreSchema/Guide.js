/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'appli Algèbre — problèmes &
   schémas en barres.
   ----------------------------------------------
   Pas de modules ES : script global, instancié dans window.onload.
   Même pattern que les autres Guide.js de appli-maths (ex:
   tuilesAlgebriques/Guide.js) : overlay attaché à <main>, header/panneau
   latéral restent utilisables pendant la consultation.

   API publique :
     const guide = new GuideAlgebreSchema();
     guide.installerBouton(conteneur);   // ajoute le filet + le bouton déclencheur
     guide.ouvrir();
================================================== */

class GuideAlgebreSchema {
  constructor() {
    this.overlay = null;
    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton déclencheur ---------------- */

  installerBouton(conteneur) {
    if (!conteneur) return null;

    const filet = document.createElement('span');
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
      <p>Chaque problème illustre une situation par un schéma en barres, où l'inconnue est notée <i>x</i>. Le but est de retrouver <i>x</i> en deux temps : d'abord l'expression qui le calcule, puis sa valeur.</p>

      <h3>Lire un problème</h3>
      <p><b>Énoncé</b> : le texte de la situation. <b>Schéma</b> : une barre "total" et une ou plusieurs "parts" au-dessus — les cases connues affichent leur valeur, l'inconnue affiche <i>x</i>. <b>Résolution</b> : la zone où tu réponds.</p>

      <h3>Répondre en deux temps</h3>
      <p>Étape 1 : écris l'expression qui donne <i>x</i> (ex : <code>88+20</code>). Étape 2 : calcule sa valeur — tu peux détailler en plusieurs étapes (ex : <code>(61-4):3</code> puis <code>45:3</code>), seule la dernière valeur (un seul nombre) est vérifiée. Valide avec le bouton ou la touche Entrée.</p>

      <h3>Réglages du panneau</h3>
      <p><b>Taille des nombres</b> et <b>Complexité</b> (plusieurs niveaux peuvent être cochés à la fois) contrôlent l'ampleur des nombres et les catégories de problèmes tirées. <b>Forme</b> et <b>Contexte</b> (ex : "Somme", "Prix") se pilotent avec "Suivant" (fige une valeur) et "Aléatoire" (en retire une nouvelle à chaque question, mode actif par défaut). <b>Affichage</b> permet de masquer l'énoncé ou le diagramme, et d'activer le mode Construction.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : entraînement libre, questions illimitées, un bouton "Renoncer" passe à la suivante. <b>Quiz</b> : 10 questions chronométrées par le score, affiché à la fin.</p>

      <h3>Fiche papier</h3>
      <p>Le bouton "Fiche papier" (en-tête) ouvre une série d'exercices imprimable ou exportable en LaTeX, reprenant le problème en cours puis d'autres tirés au hasard.</p>

      <h3>Mode Construction</h3>
      <p>Activé depuis "Affichage", ce mode remplace le diagramme par un atelier où c'est à toi de le reconstruire. Une tuile existe pour chaque valeur connue de l'énoncé, une pour <i>x</i>, et un "..." si un groupe se répète.</p>
      <p><b>Glisser-déposer</b> : dépose une tuile dans la barre "parts" ou "total" ; un repère indique où elle s'insérera. Une tuile posée se redéplace (drag) — la sortir des deux barres la retire. Les tuiles sont réutilisables à volonté.</p>
      <p><b>Le "..."</b> : double-clique dessus une fois posé pour saisir le nombre total de répétitions (tuiles extrêmes comprises) — un badge "×n" apparaît au-dessus du groupe.</p>
      <p><b>Couleurs</b> : sélectionne une couleur dans la palette, puis dépose ou clique une tuile posée pour la teindre ; la sélection revient ensuite sur "Aucune".</p>
      <p>Le bouton "Valider" vérifie que chaque tuile a servi et que la somme des parts égale le total. Une fois correct, le vrai diagramme apparaît et la zone de réponse se débloque.</p>
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
    if (document.getElementById('guide-algebre-schema-css')) return;
    const style = document.createElement('style');
    style.id = 'guide-algebre-schema-css';
    style.textContent = `
      #overlayGuide{
        display:none;
        position:absolute;
        inset:0;
        background:rgba(44,34,38,0.15);
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
        background:var(--papier-encart, #fff);
        color:var(--encre, #2c2226);
        max-width:640px;
        width:100%;
        max-height:85vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:var(--rayon, 6px);
        border:2px solid var(--craie, #7d3358);
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
        background:var(--accent-clair, #f3e6ed);
        border:1px solid var(--craie, #7d3358);
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        color:var(--encre-douce, #6b5b62);
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerGuide:hover{ background:var(--erreur, #c44336); color:#fff; }

      #guideCarte h2{
        text-align:center;
        margin:0 0 20px;
        font-size:1.3em;
        color:var(--craie, #7d3358);
      }

      #guideContenu h3{
        color:var(--craie, #7d3358);
        font-size:1em;
        margin:18px 0 6px;
      }
      #guideContenu h3:first-child{ margin-top:0; }
      #guideContenu p{
        margin:0 0 4px;
        line-height:1.5;
        font-size:0.95em;
        color:var(--encre, #2c2226);
      }
      #guideContenu code{
        font-family:'JetBrains Mono', monospace;
        background:var(--papier-panel, #f7f2f5);
        padding:1px 5px;
        border-radius:4px;
      }
    `;
    document.head.appendChild(style);
  }
}

window.GuideAlgebreSchema = GuideAlgebreSchema;
