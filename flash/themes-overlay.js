/* ==============================================
   themes-overlay.js — panneau "Thème" (Tous / Paramétrer) pour flash
   ----------------------------------------------
   API publique :
     const selecteur = new SelecteurThemes(engine);
     selecteur.installerBoutons(btnTous, btnParametrer);
     selecteur.rafraichirBoutons(); // à rappeler après tout autre changement
                                    // de niveau/relatifs susceptible d'avoir
                                    // fait retomber le moteur sur "tous"
   ================================================== */

// Arborescence d'affichage de l'overlay "Paramétrer" : 3 colonnes, chacune
// une pile de groupes nommés. Un groupe "avenir" (Statistiques,
// Probabilité) n'a pas encore de contenu — affiché grisé, sans case à
// cocher. Un item "avenir" dans un groupe existant (Évaluation, Équations)
// annonce un thème prévu mais pas encore codé, mélangé aux thèmes réels
// dans l'ordre pédagogique voulu.
// Exportée : theme-question-overlay.js (sélecteur de thème d'UNE question)
// réutilise la même arborescence, pour une présentation identique.
export const TAXONOMIE = [
  // Colonne 1 — Géométrie
  [
    { titre: "Géométrie", items: [
      { theme: "aires" }, { theme: "perimetre" }, { theme: "volume" },
      { theme: "angle" }, { theme: "geometrieBase" }
    ] },
    { titre: "Triangle rectangle", items: [
      { theme: "pythagore" }, { theme: "trigonometrie" }
    ] },
    { titre: "Agrandissement/réduction", items: [
      { theme: "thales" }, { theme: "echelle" }
    ] }
  ],
  // Colonne 2 — Calcul
  [
    { titre: "Calcul", items: [
      { theme: "calcul-num" }, { theme: "fractions" }, { theme: "comparaison" },
      { theme: "arithmetique" }, { theme: "durees" }, { theme: "conversion" },
      { theme: "arrondis" }
    ] },
    { titre: "Calcul littéral", items: [
      { theme: "evaluation" },
      { theme: "developpement" },
      { theme: "factorisation" },
      { theme: "equation" }
    ] }
  ],
  // Colonne 3 — Proportionnalité / statistiques / probabilités
  [
    { titre: "Proportionnalité", items: [
      { theme: "proportionnalite" }, { theme: "proportion" }, { theme: "tauxEvolution" }
    ] },
    { titre: "Statistiques", items: [
      { theme: "statistiques" }
    ] },
    { titre: "Probabilité", items: [
      { theme: "probabilite" }
    ] }
  ]
];

class SelecteurThemes {
  constructor(engine) {
    this.engine = engine;
    this.overlay = null;
    this.liste = null;
    this.btnTous = null;
    this.btnParametrer = null;
    this._installerCSS();
    this._construireOverlay();
  }

  installerBoutons(btnTous, btnParametrer) {
    this.btnTous = btnTous;
    this.btnParametrer = btnParametrer;

    btnTous.addEventListener("click", () => {
      this.engine.setFiltreThemeTous();
      this.rafraichirBoutons();
    });

    btnParametrer.addEventListener("click", () => {
      this.engine.activerParametrageTheme();
      this.rafraichirBoutons();
      this._rendreListe();
      this.ouvrir();
    });

    this.rafraichirBoutons();
  }

  /** Remet les classes "active" des deux boutons en phase avec le moteur —
      utile après un changement de niveau/relatifs qui peut avoir fait
      retomber silencieusement le mode sur "tous" (plus rien d'accessible
      parmi les thèmes cochés). */
  rafraichirBoutons() {
    if (!this.btnTous || !this.btnParametrer) return;
    const mode = this.engine.getFiltreThemeMode();
    this.btnTous.classList.toggle("active", mode === "tous");
    this.btnParametrer.classList.toggle("active", mode === "parametrer");
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement("div");
    overlay.id = "overlayThemes";

    const carte = document.createElement("div");
    carte.id = "themesCarte";

    const btnFermer = document.createElement("button");
    btnFermer.id = "btnFermerThemes";
    btnFermer.type = "button";
    btnFermer.setAttribute("aria-label", "Fermer");
    btnFermer.textContent = "×";
    btnFermer.addEventListener("click", () => this.fermer());

    const entete = document.createElement("div");
    entete.id = "themesEntete";

    const h2 = document.createElement("h2");
    h2.textContent = "Thèmes";

    const p = document.createElement("p");
    p.id = "themesIntro";
    p.textContent = "Thèmes accessibles pour les niveaux choisis — décoche ceux à exclure du tirage.";

    const actions = document.createElement("div");
    actions.id = "themesActions";

    const btnTousCocher = document.createElement("button");
    btnTousCocher.type = "button";
    btnTousCocher.className = "theme-action-btn";
    btnTousCocher.textContent = "Tous";
    btnTousCocher.addEventListener("click", () => {
      this.engine.cocherTousLesThemes();
      this._rendreListe();
    });

    const btnAucun = document.createElement("button");
    btnAucun.type = "button";
    btnAucun.className = "theme-action-btn";
    btnAucun.textContent = "Aucun";
    btnAucun.addEventListener("click", () => {
      this.engine.decocherTousLesThemes();
      this._rendreListe();
    });

    actions.append(btnTousCocher, btnAucun);
    entete.append(h2, actions);

    const liste = document.createElement("div");
    liste.id = "themesListe";
    liste.addEventListener("change", (e) => {
      const input = e.target.closest("input[type=checkbox]");
      if (!input) return;
      this.engine.toggleThemeCoche(input.dataset.theme);
      this._rendreListe();
    });

    carte.append(btnFermer, entete, p, liste);
    overlay.appendChild(carte);
    // Attaché à <body> avec position:fixed (pas à #flash, dont la hauteur
    // est plafonnée à 5 questions avec défilement interne — un overlay
    // absolute y aurait été rogné à cette même hauteur) : couvre bien toute
    // l'appli, panneau latéral compris.
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

  // Trois colonnes, chacune une pile de groupes nommés (voir TAXONOMIE
  // ci-dessous) — remplace l'ancien classement plat par THEME_CATEGORIES
  // dès qu'il y a une dizaine de thèmes à ranger.
  _rendreListe() {
    const disponibles = this.engine.getThemesDisponibles();
    const parId = Object.fromEntries(disponibles.map(it => [it.theme, it]));

    const itemHtml = (entree) => {
      if (entree.avenir) {
        return `<div class="theme-item avenir"><span>${entree.label} (à venir)</span></div>`;
      }
      const it = parId[entree.theme];
      if (!it) return ""; // thème pas accessible aux niveaux/filtres actifs
      return `
        <label class="theme-item">
          <input type="checkbox" data-theme="${it.theme}" ${it.coche ? "checked" : ""}>
          <span>${it.label}</span>
        </label>
      `;
    };

    const groupeHtml = (groupe) => {
      if (groupe.avenir) {
        return `<div class="theme-groupe"><div class="theme-groupe-titre avenir">${groupe.titre} (à venir)</div></div>`;
      }
      const itemsHtml = groupe.items.map(itemHtml).filter(Boolean).join("");
      if (!itemsHtml) return ""; // aucun item accessible ni "à venir" dans ce groupe
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

  ouvrir() {
    this._rendreListe();
    this.overlay.classList.add("visible");
  }

  fermer() {
    this.overlay.classList.remove("visible");
  }

  /* ---------------- CSS ---------------- */

  _installerCSS() {
    if (document.getElementById("themes-flash-css")) return;
    const style = document.createElement("style");
    style.id = "themes-flash-css";
    style.textContent = `
      #overlayThemes{
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
      #overlayThemes.visible{ display:flex; }

      #themesCarte{
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
      #themesCarte::-webkit-scrollbar{ display:none; }

      #btnFermerThemes{
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
      #btnFermerThemes:hover{ background:rgba(220,38,38,0.12); color:#dc2626; }

      #themesEntete{
        display:flex;
        align-items:center;
        justify-content:center;
        gap:14px;
        margin:0 0 8px;
      }

      #themesCarte h2{
        margin:0;
        font-size:1.3em;
        color:var(--accent-strong, #8E4585);
      }

      #themesIntro{
        margin:0 0 16px;
        font-size:0.9em;
        line-height:1.4;
        color:var(--muted, #333);
        text-align:center;
      }

      #themesActions{
        display:flex;
        gap:10px;
      }
      .theme-action-btn{
        padding:6px 16px;
        border-radius:999px;
        border:1px solid var(--accent, #8E4585);
        background:#fff;
        color:var(--accent-strong, #8E4585);
        font-size:0.85em;
        font-weight:600;
        cursor:pointer;
        transition: background 0.15s, color 0.15s;
      }
      .theme-action-btn:hover{
        background:var(--accent-strong, #8E4585);
        color:#fff;
      }

      #themesListe{
        display:flex;
        flex-wrap:wrap;
        gap:24px;
        align-items:flex-start;
      }

      .theme-colonne{
        flex:1 1 220px;
        min-width:200px;
        display:flex;
        flex-direction:column;
        gap:16px;
      }

      .theme-groupe{
        display:flex;
        flex-direction:column;
        gap:8px;
      }

      .theme-colonne-titre,
      .theme-groupe-titre{
        font-size:0.75em;
        font-weight:700;
        text-transform:uppercase;
        letter-spacing:0.06em;
        color:var(--muted, #555);
        margin-bottom:2px;
      }

      .theme-groupe-titre.avenir{
        color:var(--muted, #999);
        opacity:0.65;
      }

      .theme-item{
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
      .theme-item:hover{ border-color:var(--accent, #8E4585); }
      .theme-item input{ accent-color:var(--accent-strong, #8E4585); width:16px; height:16px; }

      .theme-item.avenir{
        cursor:default;
        opacity:0.55;
        font-style:italic;
        border-style:dashed;
      }
      .theme-item.avenir:hover{ border-color:rgba(142,69,133,0.2); }
    `;
    document.head.appendChild(style);
  }
}

export default SelecteurThemes;
