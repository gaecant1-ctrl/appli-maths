/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'appli Sens des opérations (masse)
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
      <p>Les disques sont des plaques de métal identiques. Trouve la masse cherchée <b>M</b>.</p>

      <h3>Répondre</h3>
      <p>1) Écris l'expression avec les unités : <b>(2*180g)+(180g:4)</b><br>
      Mets des parenthèses : pas de priorités entre les opérations.<br>
      2) Valide avec Entrée, puis calcule ligne par ligne jusqu'au résultat : <b>405g</b>.</p>
      <p><b>*</b> pour multiplier, <b>:</b> pour diviser.</p>

      <h3>Niveaux</h3>
      <p><b>Échauffement</b> : une seule opération.<br>
      <b>Niveau 1</b> : on connaît 1 disque, 2 opérations.<br>
      <b>Niveau 2</b> : on connaît 1 disque, 3 opérations.<br>
      <b>Niveau 3</b> : on cherche la masse d'1 disque.<br>
      <b>Mixte</b> : niveaux 1, 2 et 3 mélangés.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : entraînement libre. Si tu abandonnes, la correction s'affiche.<br>
      <b>Quiz</b> : 10 exercices, sans correction. Le niveau ne change plus une fois lancé.</p>

      <h3>🎓 Diplôme</h3>
      <p>Avant le quiz, écris ton prénom et l'initiale de ton nom.<br>
      À la fin, clique sur <b>Mon diplôme</b> : il porte ton nom, ton niveau, ta note et une mention.<br>
      Tu peux l'imprimer ou l'enregistrer en PDF.</p>
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
        background:rgba(47,158,68,0.12);
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
