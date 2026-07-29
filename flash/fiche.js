/* ==============================================
   fiche.js — overlay "Fiche papier" pour flash
   ----------------------------------------------
   Contrairement à la fiche de calcul prioritaire (qui génère sa propre
   série d'exercices indépendante), celle-ci reprend telles quelles les
   questions actuellement affichées dans l'Atelier (engine.getQuestionsData()) :
   un instantané, jamais une génération séparée.
================================================== */

class FichePapier {
  constructor(engine, opts = {}) {
    this.engine = engine;
    this.titre = opts.titre || "Fiche d'exercices — Automatismes";
    this.sousTitre = opts.sousTitre || "Donner la réponse sans détailler.";

    this.overlay = null;
    this.grilleWrap = null;

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
    overlay.id = "overlayFiche";

    const carte = document.createElement("div");
    carte.id = "ficheCarte";

    const btnFermer = document.createElement("button");
    btnFermer.id = "btnFermerFiche";
    btnFermer.type = "button";
    btnFermer.setAttribute("aria-label", "Fermer");
    btnFermer.textContent = "×";
    btnFermer.addEventListener("click", () => this.fermer());

    const actions = document.createElement("div");
    actions.className = "fiche-actions";

    const btnImprimer = document.createElement("button");
    btnImprimer.type = "button";
    btnImprimer.textContent = "🖨️ Imprimer / Enregistrer en PDF";
    btnImprimer.addEventListener("click", () => window.print());

    const btnTex = document.createElement("button");
    btnTex.type = "button";
    btnTex.textContent = "⬇️ Télécharger le LaTeX";
    btnTex.addEventListener("click", () => this._telechargerLatex());

    actions.append(btnImprimer, btnTex);

    const note = document.createElement("p");
    note.className = "note-impression";
    note.innerHTML = "💡 Dans la fenêtre d'impression, pense à décocher <strong>« En-têtes et pieds de page »</strong> pour un rendu propre.";

    const identite = document.createElement("div");
    identite.className = "ligne-identite";
    identite.innerHTML = `
      <span>Nom et prénom : <span class="trait"></span></span>
      <span>Note : <span class="trait court"></span></span>
    `;

    const h2 = document.createElement("h2");
    h2.textContent = this.titre;

    const sousTitre = document.createElement("p");
    sousTitre.className = "sous-titre";
    sousTitre.textContent = this.sousTitre;

    const grilleWrap = document.createElement("div");
    grilleWrap.id = "ficheGrilleWrap";

    carte.append(btnFermer, actions, note, identite, h2, grilleWrap);
    overlay.appendChild(carte);
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.fermer();
    });
    this._onKeydown = (e) => {
      if (e.key === "Escape" && overlay.classList.contains("visible")) this.fermer();
    };
    document.addEventListener("keydown", this._onKeydown);

    this.overlay = overlay;
    this.grilleWrap = grilleWrap;
  }

  // \\[Npt] (saut de ligne display-math) n'est pas fiable tel quel dans le
  // rendu HTML — MathJax ne le traduit pas toujours en vrai retour à la
  // ligne visible. On scinde plutôt le contenu en plusieurs blocs \[...\]
  // distincts, séparés par un <br> HTML réel — enveloppés dans un <div>
  // unique, sinon .consigne-inner (display:flex) place chaque bloc comme
  // un item flex côte à côte et ignore le <br> (même logique que
  // QuestionDiv._latexEnLignes dans engine.js).
  _latexEnLignes(contenu) {
    const lignes = contenu.split(/\\\\(?:\[[^\]]*\])?/);
    return `<div>${lignes.map(l => `\\[${l}\\]`).join("<br>")}</div>`;
  }

  _rendreGrille(liste) {
    this._derniereSerie = liste;
    this.grilleWrap.innerHTML = "";

    if (!liste.length) {
      this.grilleWrap.innerHTML = `<p style="text-align:center;">Aucune question dans l'atelier pour le moment.</p>`;
      return;
    }

    // Même limite que l'export LaTeX (_genererLatex) : au-delà de 10
    // questions, nouvelle page/nouveau tableau (avec son propre en-tête)
    // plutôt qu'un tableau qui déborde sur plusieurs pages à l'impression.
    const PAR_PAGE = 10;
    for (let i = 0; i < liste.length; i += PAR_PAGE) {
      const page = liste.slice(i, i + PAR_PAGE);

      const table = document.createElement("table");
      table.className = "fiche-table";
      if (i > 0) table.classList.add("fiche-nouvelle-page");
      table.innerHTML = `
        <thead>
          <tr><th class="col-numero">N°</th><th class="col-consigne">Consigne</th><th class="col-reponse">Réponse</th></tr>
        </thead>
        <tbody>
          ${page.map(item => `
            <tr>
              <td class="col-numero">${item.numero}</td>
              <td class="col-consigne"><div class="consigne-inner">${this._latexEnLignes(item.latex)}</div></td>
              <td class="col-reponse"></td>
            </tr>
          `).join("")}
        </tbody>
      `;

      this.grilleWrap.appendChild(table);
    }

    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.grilleWrap]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.grilleWrap]);
    } catch (e) { /* silencieux */ }
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    // L'overlay doit être visible AVANT le typeset MathJax : mesurer un
    // texte à largeur héritée (mtextInheritFont) dans un conteneur encore
    // display:none donne une largeur fausse (chevauchement avec le token
    // suivant) — contrairement à l'atelier, toujours visible au typeset.
    this.overlay.classList.add("visible");
    document.body.classList.add("fiche-ouverte");
    this._actualiser();
  }

  fermer() {
    this.overlay.classList.remove("visible");
    document.body.classList.remove("fiche-ouverte");
  }

  _actualiser() {
    this._rendreGrille(this.engine.getQuestionsData());
  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscape(s) {
    return String(s || "").replace(/([%&#_{}])/g, "\\$1");
  }

  // \\[4pt] est un saut de ligne display-math, invalide brut dans $...$.
  // \par ne fonctionne PAS à l'intérieur d'un seul groupe $...$ — il faut
  // fermer le premier groupe math, mettre \par, puis en rouvrir un second :
  // "$ligne1$ \par $ligne2$", jamais "$ligne1 \par ligne2$".
  _consigneTex(latex) {
    const lignes = latex
      .split(/\\\\(?:\[[^\]]*\])?/)
      .map(l => l.replace(/\s+/g, " ").trim())
      .filter(Boolean);
    return lignes.map(l => `$${l}$`).join(" \\par ");
  }

  // La hauteur de ligne visible venait de l'espacement \\[1.5cm] APRÈS la
  // ligne, pas d'une vraie hauteur de cellule — rien pour un m{...} de se
  // centrer par rapport à. On force donc une hauteur de cellule explicite
  // via \parbox[c][H][c]{...}, qui centre son contenu verticalement dans
  // cette hauteur fixe, que l'énoncé fasse une ou deux lignes.
  // \renewcommand{\baselinestretch}{1.3}\selectfont : un peu plus d'espace
  // entre les lignes du \par qu'avec l'interligne par défaut (scope local
  // au \parbox, ne fuit pas sur le reste du document).
  _tableauTex(page) {
    const HAUTEUR_CELLULE_CM = 2;
    const HAUTEUR_ENTETE_CM = 1;

    const lignesTex = page.map(item => {
      const consigne = `\\parbox[c][${HAUTEUR_CELLULE_CM}cm][c]{\\linewidth}{\\renewcommand{\\baselinestretch}{1.3}\\selectfont\\RaggedRight ${this._consigneTex(item.latex)}}`;
      return `${item.numero} & ${consigne} & \\\\ \\hline`;
    });

    const entete = `\\parbox[c][${HAUTEUR_ENTETE_CM}cm][c]{1.5cm}{\\centering\\textbf{N°}} & \\parbox[c][${HAUTEUR_ENTETE_CM}cm][c]{\\linewidth}{\\centering\\textbf{Consigne}} & \\parbox[c][${HAUTEUR_ENTETE_CM}cm][c]{3cm}{\\centering\\textbf{Réponse}} \\\\ \\hline`;

    return `\\noindent\\begin{tabular}{|c|>{\\RaggedRight\\arraybackslash}p{14cm}|>{\\RaggedRight\\arraybackslash}p{3cm}|}
\\hline
${entete}
${lignesTex.join("\n")}
\\end{tabular}`;
  }

  _genererLatex() {
    const liste = this._derniereSerie || [];
    const PAR_PAGE = 10;

    const pages = [];
    for (let i = 0; i < liste.length; i += PAR_PAGE) {
      pages.push(liste.slice(i, i + PAR_PAGE));
    }
    if (pages.length === 0) pages.push([]);

    const pagesTex = pages.map((page, i) => i === 0
      ? `\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{0.9cm}

${this._tableauTex(page)}`
      : `\\newpage
\\vspace*{1.5cm}
\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}} \\normalsize (suite)}
\\end{center}

\\vspace{0.9cm}

${this._tableauTex(page)}`
    ).join("\n\n");

    return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm]{geometry}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{ragged2e}
% Latin Modern : sans lui, les chiffres/symboles en mode math (Computer
% Modern par défaut) paraissent visuellement plus gros que le texte
% autour, même à taille de police identique.
\\usepackage{lmodern}
\\pagestyle{empty}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill

\\vspace{0.9cm}

${pagesTex}

\\end{document}
`;
  }

  _telechargerLatex() {
    if (!this._derniereSerie) this._actualiser();
    const tex = this._genererLatex();
    const blob = new Blob([tex], { type: "application/x-tex;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fiche-flash.tex";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- CSS (overlay + impression) ---------------- */

  _installerCSS() {
    if (document.getElementById("fiche-papier-css")) return;
    const style = document.createElement("style");
    style.id = "fiche-papier-css";
    style.textContent = `
      #overlayFiche{
        display:none;
        position:fixed;
        top:0; right:0; bottom:0; left:0;
        background:rgba(20,30,45,0.55);
        backdrop-filter: blur(2px);
        z-index:1000000;
        align-items:center;
        justify-content:center;
        padding:24px;
        overflow-y:auto;
      }
      #overlayFiche.visible{ display:flex; }

      #ficheCarte{
        position:relative;
        background:#fff;
        color:var(--text, #222);
        max-width:950px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:8px;
        padding:28px 32px;
      }
      #ficheCarte::-webkit-scrollbar{ display:none; }

      #btnFermerFiche{
        position:absolute;
        top:10px; right:14px;
        background:none;
        border:none;
        font-size:24px;
        line-height:1;
        cursor:pointer;
        color:var(--muted, #555);
      }
      #btnFermerFiche:hover{ color:#c44336; }

      .fiche-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        justify-content:center;
        margin-top: 6px;
      }
      .fiche-actions button{
        padding:9px 16px;
        border:none;
        border-radius:4px;
        background:var(--accent, #2563eb);
        color:#fff;
        font-size:13.5px;
        font-weight:600;
        cursor:pointer;
        transition: background-color 0.15s ease;
      }
      .fiche-actions button:hover{ background:var(--accent-strong, #1d4ed8); }

      .note-impression{
        text-align:center;
        font-size:12.5px;
        color:var(--muted, #666);
        margin:10px 0 0;
      }

      .ligne-identite{
        display:flex;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:16px;
        font-size:15px;
        margin-top: 10px;
        margin-bottom: 30px;
      }
      .trait{
        display:inline-block;
        min-width:220px;
        border-bottom:1px solid var(--card-border, #999);
        margin-left:6px;
      }
      .trait.court{ min-width:70px; }

      #ficheCarte h2{
        text-align:center;
        margin:20px 0 0;
        font-size:1.3em;
        color: var(--accent, #2563eb);
      }
      .sous-titre{
        text-align:center;
        color:var(--muted, #555);
        margin:20px 0 0;
        font-size:0.95em;
      }

      .fiche-table{
        width: 100%;
        border-collapse: collapse;
        margin-top: 20px;
        font-size: 14px;
      }

      .fiche-table th,
      .fiche-table td{
        border: 1px solid var(--card-border, #ccc);
        padding: 4px 12px;
        text-align: left;
        vertical-align: middle;
      }

      .fiche-table th{
        font-size: 13px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        color: var(--muted, #555);
      }

      .fiche-table .col-numero{
        width: 40px;
        text-align: center;
      }

      /* Pas de marge par défaut, pas de centrage horizontal. Hauteur fixe
         (même valeur que le \parbox de l'export LaTeX) + centrage vertical
         réel dans cette hauteur, plutôt que de compter sur un
         vertical-align:middle qui n'a rien à centrer sans hauteur imposée
         — utile dès qu'un énoncé fait deux lignes. Taille de police plus
         modeste que dans l'atelier : 10 lignes par page à l'impression. */
      .fiche-table .col-consigne{
        font-size: 1em;
        line-height: 1.3;
      }
      .fiche-table .col-consigne .consigne-inner{
        height: 2.2cm;
        overflow: hidden;
        display: flex;
        align-items: center;
      }
      /* Le <br> entre les blocs \[...\] (voir _latexEnLignes) hérite sinon
         du line-height 1.3 ci-dessus, bien plus grand que les blocs MathJax
         qu'il sépare (line-height:1 sur mjx-container ci-dessous) — même
         correctif que .question .enonce > div dans style.css. */
      .fiche-table .col-consigne .consigne-inner > div{
        line-height: 0.5;
      }
      .fiche-table .col-consigne mjx-container{
        margin: 0 !important;
        padding: 0.02em 0;
        line-height: 1;
      }
      .fiche-table .col-consigne mjx-container[display="true"]{
        text-align: left;
        margin: 0;
      }

      .fiche-table .col-reponse{
        width: 200px;
      }

      .fiche-table + .fiche-table{
        margin-top: 10px;
      }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: 0.5cm; size: A4; }
        body *{ visibility:hidden; }
        #overlayFiche, #overlayFiche *{ visibility:visible; }
        #overlayFiche{
          position:absolute;
          inset:0;
          background:#fff;
          padding:0;
          display:flex !important;
          align-items:flex-start;
          justify-content:flex-start;
          overflow:visible !important;
        }
        #ficheCarte{
          box-shadow:none;
          max-height:none !important;
          max-width:none;
          width:100%;
          border-radius:0;
          padding:0.5cm;
          overflow:visible !important;
        }
        #btnFermerFiche, .fiche-actions, .note-impression{ display:none !important; }
        .fiche-nouvelle-page{
          break-before: page;
          page-break-before: always; /* repli navigateurs plus anciens */
        }
      }
    `;
    document.head.appendChild(style);
  }
}

export default FichePapier;
