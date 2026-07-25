/* ==============================================
   guide.js — overlay "Mode d'emploi" pour flash
   ----------------------------------------------
   API publique :
     const guide = new GuideAppli();
     guide.installerBouton(btn);   // branche le clic sur le bouton existant
     guide.ouvrir();
================================================== */

class GuideAppli {
  constructor() {
    this.overlay = null;
    this._installerCSS();
    this._construireOverlay();
  }

  installerBouton(btn) {
    if (!btn) return;
    btn.addEventListener("click", () => this.ouvrir());
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "overlayGuide";

    const carte = document.createElement("div");
    carte.id = "guideCarte";

    const btnFermer = document.createElement("button");
    btnFermer.id = "btnFermerGuide";
    btnFermer.type = "button";
    btnFermer.setAttribute("aria-label", "Fermer");
    btnFermer.textContent = "×";
    btnFermer.addEventListener("click", () => this.fermer());

    const h2 = document.createElement("h2");
    h2.textContent = "Mode d'emploi";

    const contenu = document.createElement("div");
    contenu.id = "guideContenu";
    contenu.innerHTML = `
      <h3>Objectif</h3>
      <p>Entraîne-toi sur des automatismes de calcul de collège : fractions, calcul numérique/littéral, aires, périmètres, volumes, durées, conversions, arrondis, comparaisons...</p>

      <h3>Niveau</h3>
      <p>Panneau de gauche : plusieurs niveaux (<b>6e</b>, <b>5e</b>, <b>4e</b>, <b>3e</b>) peuvent être actifs à la fois — les questions piochées correspondent à L'UN d'eux, au hasard.</p>

      <h3>Type</h3>
      <p>Le bouton <b>« Avec relatifs »</b> inclut les exercices de calcul faisant intervenir des valeurs négatives. Désactivé par défaut.</p>

      <h3>Atelier / Quiz</h3>
      <p><b>Atelier</b> : entraînement libre, questions illimitées, sans score, régénérables à volonté.<br>
      <b>Quiz</b> : choisis un nombre de questions puis clique sur « Commencer le Quiz » ; réponds en ligne à chaque question, le score s'affiche à la fin.</p>

      <h3>Boutons de chaque question</h3>
      <p>🔀 régénère toutes les questions &nbsp;·&nbsp; 🎯 tout du même thème &nbsp;·&nbsp; + ajoute une question &nbsp;·&nbsp; − retire une question &nbsp;·&nbsp; ✓ affiche/masque la correction &nbsp;·&nbsp; ✏️ active la saisie en ligne (réponse à vérifier directement dans l'atelier).<br>
      Sur chaque question : 🔁 nouvelles valeurs &nbsp;·&nbsp; 🎲 autre question du même thème &nbsp;·&nbsp; 🧩 passe au thème suivant &nbsp;·&nbsp; ⬆ remonte la question en haut de la liste.</p>

      <h3>⚡ FLASH (mode compact)</h3>
      <p>Masque les boutons de régénération de chaque question, remplacés par un simple bouton de correction individuelle — pratique pour un passage rapide en classe.</p>

      <h3>Nouvel onglet</h3>
      <p>Ouvre une copie indépendante de la page dans un nouvel onglet (utile pour garder une série de questions ouverte pendant qu'on en régénère une autre).</p>

      <h3>Fiche papier</h3>
      <p>Reprend exactement les questions actuellement affichées dans l'atelier — jamais de génération séparée — sous forme de tableau imprimable (N°/Consigne/Réponse), avec un bouton d'impression/export PDF et un bouton de téléchargement au format LaTeX.</p>
    `;

    carte.append(btnFermer, h2, contenu);
    overlay.appendChild(carte);
    // Attaché à <main> (pas à body) : l'overlay ne couvre que la zone de
    // contenu, le header et le panneau latéral restent visibles et utilisables.
    (document.querySelector("main") || document.body).appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.fermer();
    });
    this._onKeydown = (e) => {
      if (e.key === "Escape" && overlay.classList.contains("visible")) this.fermer();
    };
    document.addEventListener("keydown", this._onKeydown);

    this.overlay = overlay;
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    this.overlay.classList.add("visible");
  }

  fermer() {
    this.overlay.classList.remove("visible");
  }

  /* ---------------- CSS ---------------- */

  _installerCSS() {
    if (document.getElementById("guide-flash-css")) return;
    const style = document.createElement("style");
    style.id = "guide-flash-css";
    style.textContent = `
      #overlayGuide{
        display:none;
        position:absolute;
        inset:0;
        background:rgba(30,42,69,0.35);
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
        color:var(--text, #222);
        max-width:640px;
        width:100%;
        max-height:85vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:16px;
        border:2px solid var(--accent, #2563eb);
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
        color:var(--muted, #555);
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerGuide:hover{ background:rgba(220,38,38,0.12); color:#dc2626; }

      #guideCarte h2{
        text-align:center;
        margin:0 0 20px;
        font-size:1.3em;
        color:var(--accent-strong, #1d4ed8);
      }

      #guideContenu h3{
        color:var(--accent-strong, #1d4ed8);
        font-size:1em;
        margin:18px 0 6px;
      }
      #guideContenu h3:first-child{ margin-top:0; }
      #guideContenu p{
        margin:0 0 4px;
        line-height:1.5;
        font-size:0.95em;
        color:var(--muted, #333);
      }
    `;
    document.head.appendChild(style);
  }
}

export default GuideAppli;
