/* ==============================================
   theme-question-overlay.js — choix direct du thème d'UNE question
   ----------------------------------------------
   Contrairement à themes-overlay.js (filtre global du tirage, plusieurs
   thèmes cochables, "Tous" par défaut), cet overlay est à sélection UNIQUE
   (boutons radio), démarre toujours à vide, et agit sur une seule question
   à la fois : cocher un thème relance immédiatement CETTE question sur un
   exercice au hasard de ce thème, puis referme l'overlay.

   API publique :
     const selecteur = new SelecteurThemeQuestion(engine);
     selecteur.installerDansEngine(); // branche l'ouverture sur le bouton 🗂️ de chaque question
   ================================================== */

import { TAXONOMIE } from "./themes-overlay.js";

class SelecteurThemeQuestion {
  constructor(engine) {
    this.engine = engine;
    this.question = null;
    this.overlay = null;
    this.liste = null;
    this._installerCSS();
    this._construireOverlay();
  }

  /** Enregistre cet overlay comme gestionnaire du bouton 🗂️ (voir engine.js → ouvrirSelecteurThemeQuestion). */
  installerDansEngine() {
    this.engine.definirOuvreurSelecteurThemeQuestion((q) => this.ouvrirPour(q));
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "overlayThemeQuestion";

    const carte = document.createElement("div");
    carte.id = "themeQuestionCarte";

    const btnFermer = document.createElement("button");
    btnFermer.id = "btnFermerThemeQuestion";
    btnFermer.type = "button";
    btnFermer.setAttribute("aria-label", "Fermer");
    btnFermer.textContent = "×";
    btnFermer.addEventListener("click", () => this.fermer());

    const h2 = document.createElement("h2");
    h2.textContent = "Choisir un thème";

    const p = document.createElement("p");
    p.id = "themeQuestionIntro";
    p.textContent = "Choisis un thème pour cette question — un seul, appliqué immédiatement.";

    const liste = document.createElement("div");
    liste.id = "themeQuestionListe";
    liste.addEventListener("change", (e) => {
      const input = e.target.closest("input[type=radio]");
      if (!input || !this.question) return;
      this.engine.choisirThemePourQuestion(this.question, input.dataset.theme);
      // Laisse le temps de voir la coche cochée avant de refermer, plutôt
      // qu'une fermeture instantanée.
      setTimeout(() => this.fermer(), 1000);
    });

    carte.append(btnFermer, h2, p, liste);
    overlay.appendChild(carte);
    // Attaché à <body> avec position:fixed (comme themes-overlay.js) : pas à
    // #flash, dont la hauteur est plafonnée à 5 questions avec défilement
    // interne — un overlay absolute y aurait été rogné à cette hauteur.
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.fermer();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && overlay.classList.contains("visible")) this.fermer();
    });

    this.overlay = overlay;
    this.liste = liste;
  }

  // Même arborescence à 3 colonnes que themes-overlay.js (TAXONOMIE
  // importée) : sélection unique (radio) au lieu de cases à cocher, et les
  // items "avenir" (pas encore de thème réel) sont simplement ignorés —
  // rien à choisir pour cette question tant qu'ils n'existent pas.
  _rendreListe() {
    const disponibles = this.engine.getThemesDisponibles();
    const parId = Object.fromEntries(disponibles.map(it => [it.theme, it]));

    const itemHtml = (entree) => {
      if (entree.avenir) return "";
      const it = parId[entree.theme];
      if (!it) return ""; // thème pas accessible aux niveaux/filtres actifs
      return `
        <label class="theme-item">
          <input type="radio" name="themeQuestion" data-theme="${it.theme}">
          <span>${it.label}</span>
        </label>
      `;
    };

    const groupeHtml = (groupe) => {
      if (groupe.avenir) return ""; // rien de sélectionnable dans ce groupe
      const itemsHtml = groupe.items.map(itemHtml).filter(Boolean).join("");
      if (!itemsHtml) return "";
      return `
        <div class="theme-groupe">
          <div class="theme-groupe-titre">${groupe.titre}</div>
          ${itemsHtml}
        </div>
      `;
    };

    this.liste.innerHTML = TAXONOMIE.map(colonne => `
      <div class="theme-colonne">
        ${colonne.map(groupeHtml).join("")}
      </div>
    `).join("");
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrirPour(q) {
    this.question = q;
    this._rendreListe();
    this.overlay.classList.add("visible");
  }

  fermer() {
    this.overlay.classList.remove("visible");
    this.question = null;
  }

  /* ---------------- CSS ---------------- */

  _installerCSS() {
    if (document.getElementById("theme-question-flash-css")) return;
    const style = document.createElement("style");
    style.id = "theme-question-flash-css";
    style.textContent = `
      #overlayThemeQuestion{
        display:none;
        position:fixed;
        inset:0;
        background:rgba(30,42,69,0.35);
        backdrop-filter: blur(2px);
        z-index:1000;
        align-items:flex-start;
        justify-content:center;
        padding:24px;
        overflow-y:auto;
      }
      #overlayThemeQuestion.visible{ display:flex; }

      #themeQuestionCarte{
        position:relative;
        background:#fff;
        color:var(--text, #222);
        max-width:820px;
        width:100%;
        max-height:85vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:16px;
        border:2px solid var(--accent, #8E4585);
        box-shadow:0 20px 60px rgba(142,69,133,0.2);
        padding:28px 32px;
      }
      #themeQuestionCarte::-webkit-scrollbar{ display:none; }

      #btnFermerThemeQuestion{
        position:absolute;
        top:14px; right:18px;
        width:32px; height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(142,69,133,0.08);
        border:1px solid rgba(142,69,133,0.3);
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        color:var(--muted, #555);
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerThemeQuestion:hover{ background:rgba(220,38,38,0.12); color:#dc2626; }

      #themeQuestionCarte h2{
        text-align:center;
        margin:0 0 8px;
        font-size:1.3em;
        color:var(--accent-strong, #8E4585);
      }

      #themeQuestionIntro{
        margin:0 0 16px;
        font-size:0.9em;
        line-height:1.4;
        color:var(--muted, #333);
        text-align:center;
      }

      #themeQuestionListe{
        display:flex;
        flex-wrap:wrap;
        gap:24px;
        align-items:flex-start;
      }

      #themeQuestionListe .theme-colonne{
        flex:1 1 220px;
        min-width:200px;
        display:flex;
        flex-direction:column;
        gap:16px;
      }

      #themeQuestionListe .theme-groupe{
        display:flex;
        flex-direction:column;
        gap:8px;
      }

      #themeQuestionListe .theme-groupe-titre{
        font-size:0.75em;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:0.06em;
        color:var(--muted, #555);
        margin-bottom:2px;
      }

      #themeQuestionListe .theme-item{
        display:flex;
        align-items:center;
        gap:10px;
        padding:8px 10px;
        border:1px solid rgba(142,69,133,0.2);
        border-radius:10px;
        cursor:pointer;
        font-size:0.95em;
        color:var(--text, #222);
        user-select:none;
      }
      #themeQuestionListe .theme-item:hover{ border-color:var(--accent, #8E4585); }
      #themeQuestionListe .theme-item input{ accent-color:var(--accent-strong, #8E4585); width:16px; height:16px; }
    `;
    document.head.appendChild(style);
  }
}

export default SelecteurThemeQuestion;
