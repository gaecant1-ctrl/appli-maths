/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'appli Algèbre (deux pesées, facile)
   ----------------------------------------------
   Pas de modules ES : script global, instancié dans window.onload.
   Même schéma que Fiche.js (overlay + carte + CSS injectée une fois),
   avec le thème "papier" (CSS vars) plutôt que des couleurs figées.

   API publique :
     const guide = new GuideAppli();
     guide.installerBouton(conteneur);   // ajoute le bouton déclencheur
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

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-header';
    btn.textContent = 'Guide';
    btn.addEventListener('click', () => this.ouvrir());

    conteneur.appendChild(btn);
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
      <p>Deux pesées de fruits te donnent chacune une masse totale. En combinant les deux, retrouve la masse
      d'un fruit puis de l'autre.</p>

      <h3>Construis ta pesée</h3>
      <p>Utilise les boutons <b>+</b> / <b>−</b> pour choisir combien de fruits de chaque sorte tu mets sur le
      plateau, puis tape la masse totale correspondante (un nombre, ou un calcul comme <b>500g+50g</b>) et valide
      avec « Valider » ou la touche Entrée. Le bouton « Init » remet le plateau à zéro.</p>
      <p>Mettre <b>1 seul fruit</b> d'une sorte (aucun de l'autre) et la bonne masse permet de le marquer comme
      trouvé.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : entraînement libre, exercices illimités, sans score. Le bouton « Renoncer » du panneau
      passe directement à une nouvelle pesée aléatoire.<br>
      <b>Quiz</b> : clique sur « Commencer le Quiz » pour répondre à une série de questions ; le score s'affiche à
      la fin.</p>

      <h3>Réglages du panneau</h3>
      <p><b>Thème</b> : « Masse » (fruits, en grammes) ou « Point » (objets de jeu vidéo, sans unité — la masse
      devient un score en points). Change aussi l'exercice en cours.<br>
      <b>Niveau</b> : ajuste la difficulté des pesées générées.<br>
      <b>Calcul</b> : « Avec calcul » affiche la masse totale déjà calculée, « Sans calcul » affiche le détail
      (ex : 500g+50g) à additionner soi-même.<br>
      <b>Expression obligatoire</b> : impose de combiner les masses des pesées 1 et 2 plutôt que de taper un
      nombre libre.<br>
      « Pesée personnalisée » permet de choisir soi-même l'exercice en cours (atelier uniquement).</p>

      <h3>Fiche papier</h3>
      <p>Génère une fiche imprimable d'exercices (à imprimer ou à exporter en LaTeX).</p>
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
        background:rgba(44,34,38,0.35);
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
        background:var(--papier-encart, #fff);
        color:var(--encre, #222);
        max-width:640px;
        width:100%;
        max-height:85vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:var(--rayon, 8px);
        border:1px solid var(--grille-forte, #2c2226);
        box-shadow:0 20px 60px rgba(44,34,38,0.2);
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
        background:var(--accent-clair, rgba(125,51,88,0.08));
        border:1px solid var(--grille, rgba(125,51,88,0.3));
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        color:var(--encre-douce, #555);
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerGuide:hover{ background:rgba(196,67,54,0.12); color:var(--erreur, #c44336); }

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
        color:var(--encre, #333);
      }
    `;
    document.head.appendChild(style);
  }
}

window.GuideAppli = GuideAppli;
