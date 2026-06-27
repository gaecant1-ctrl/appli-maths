/* ==============================================
   Fiche.js — overlay "Fiche papier" pour le quiz d'équations
   ----------------------------------------------
   Génère une fiche imprimable de 6 équations (grille 3 lignes x 2 colonnes),
   chaque cellule contenant l'énoncé en haut et un espace vide dessous pour
   que l'élève écrive sa résolution étape par étape.

   Les 6 équations sont générées avec les MÊMES paramètres que ceux
   actuellement sélectionnés dans le panneau du quiz (lireParametresGeneration()),
   sans jamais toucher à la partie de quiz en cours.

   API publique :
     const fiche = new FichePapier();
     fiche.installerBouton(conteneurDuBandeau);   // ajoute le bouton déclencheur
     fiche.ouvrir();                              // ouvre l'overlay
================================================== */

class FichePapier {
  constructor(opts = {}) {
    this.nbLignes = 4;
    this.nbColonnes = 2;
    this.nbExercices = this.nbLignes * this.nbColonnes; // 8, fixe par construction de la grille
    this.titre = opts.titre || "Fiche d'exercices — Résolution d'équations";
    this.sousTitre = opts.sousTitre || "";

    this.overlay = null;
    this.grilleWrap = null;
    this._derniereSerie = null; // [{lhs, rhs}, ...] de la série actuellement affichée

    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton déclencheur ---------------- */

  installerBouton(conteneur) {
    if (!conteneur) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnFichePapier';
    btn.className = 'btn-header';
    btn.textContent = 'Fiche papier';
    btn.addEventListener('click', () => this.ouvrir());
    conteneur.appendChild(btn);
    return btn;
  }

  /* ---------------- Génération des 6 équations (sans DOM) ---------------- */

  _genererSerie() {
    // Réutilise les paramètres actuellement sélectionnés dans le panneau du quiz
    // (lireParametresGeneration() est défini dans app.js). Si jamais absent
    // (page sans le panneau), on retombe sur un shuffle complet.
    const params = (typeof lireParametresGeneration === 'function')
      ? lireParametresGeneration()
      : {};

    const liste = [];
    for (let i = 0; i < this.nbExercices; i++) {
      const gen = genererEquation(params);
      liste.push({ index: i + 1, lhs: gen.lhs, rhs: gen.rhs });
    }
    return liste;
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlayFiche';

    const carte = document.createElement('div');
    carte.id = 'ficheCarte';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerFiche';
    btnFermer.type = 'button';
    btnFermer.setAttribute('aria-label', 'Fermer');
    btnFermer.textContent = '×';
    btnFermer.addEventListener('click', () => this.fermer());

    const actions = document.createElement('div');
    actions.className = 'fiche-actions';

    const btnImprimer = document.createElement('button');
    btnImprimer.type = 'button';
    btnImprimer.textContent = '🖨️ Imprimer / Enregistrer en PDF';
    btnImprimer.addEventListener('click', () => window.print());

    const btnTex = document.createElement('button');
    btnTex.type = 'button';
    btnTex.textContent = '⬇️ Télécharger le LaTeX';
    btnTex.addEventListener('click', () => this._telechargerLatex());

    const btnRegen = document.createElement('button');
    btnRegen.type = 'button';
    btnRegen.textContent = '🔀 Régénérer une nouvelle série';
    btnRegen.addEventListener('click', () => this._regenerer());

    actions.append(btnImprimer, btnTex, btnRegen);

    const note = document.createElement('p');
    note.className = 'note-impression';
    note.innerHTML = "💡 Dans la fenêtre d'impression, pense à décocher <strong>« En-têtes et pieds de page »</strong> pour un rendu propre.";

    const identite = document.createElement('div');
    identite.className = 'ligne-identite';
    identite.innerHTML = `
      <span>Nom et prénom : <span class="trait"></span></span>
      <span>Note : <span class="trait court"></span> / 20</span>
    `;

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'sous-titre';
    sousTitre.textContent = this.sousTitre;

    const grilleWrap = document.createElement('div');
    grilleWrap.id = 'ficheGrilleWrap';

    carte.append(
      btnFermer,
      actions,
      note,
      identite,
      h2,
      sousTitre,
      grilleWrap
    );
    overlay.appendChild(carte);
    document.body.appendChild(overlay);

    // Fermer en cliquant en dehors de la carte
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.fermer();
    });
    // Fermer avec Échap
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer();
    };
    document.addEventListener('keydown', this._onKeydown);

    this.overlay = overlay;
    this.grilleWrap = grilleWrap;
  }

  _rendreGrille(liste) {
    this.grilleWrap.innerHTML = '';
    const grille = document.createElement('div');
    grille.className = 'fiche-grille';

    liste.forEach(item => {
      const cellule = document.createElement('div');
      cellule.className = 'fiche-cellule';

      const enonce = document.createElement('div');
      enonce.className = 'cellule-enonce';
      const lhsLatex = (typeof formatToLatex === 'function') ? formatToLatex(item.lhs) : item.lhs;
      const rhsLatex = (typeof formatToLatex === 'function') ? formatToLatex(item.rhs) : item.rhs;
      enonce.innerHTML = `\\(${lhsLatex} = ${rhsLatex}\\)`;

      const zoneResolution = document.createElement('div');
      zoneResolution.className = 'cellule-resolution';

      cellule.append(enonce, zoneResolution);
      grille.appendChild(cellule);
    });

    this.grilleWrap.appendChild(grille);

    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.grilleWrap]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.grilleWrap]);
    } catch (e) { /* silencieux */ }
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    if (!this._derniereSerie) this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  _regenerer() {
    this._derniereSerie = this._genererSerie();
    this._rendreGrille(this._derniereSerie);
  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  _genererLatex() {
    const liste = this._derniereSerie || [];

    // Hauteur de chaque cellule, choisie pour que les 4 lignes (8 équations)
    // occupent bien la page A4 disponible sans déborder (vérifié par compilation réelle).
    const HAUTEUR_CELLULE_CM = 4.9;
    const ESPACE_HAUT_CM = 0.4; // évite que l'énoncé soit collé au bord supérieur de la cellule

    const cellulesTex = liste.map(item => {
      // formatToLatex() (définie dans app.js) produit déjà du LaTeX valide
      // (ex: "\frac{9}{4}x" pour des fractions) — c'est le même rendu que celui
      // affiché dans l'overlay HTML. On ne le passe donc PAS dans _texEscape(),
      // qui casserait les accolades de \frac{}{} en les échappant comme du texte.
      const lhsTex = (typeof formatToLatex === 'function') ? formatToLatex(item.lhs) : this._texEscape(item.lhs);
      const rhsTex = (typeof formatToLatex === 'function') ? formatToLatex(item.rhs) : this._texEscape(item.rhs);
      const enonceTex = `$${lhsTex} = ${rhsTex}$`;
      // parbox[t][H][t] : positionné en haut ET contenu aligné en haut, sinon
      // une cellule plus "vide" que ses voisines se voit son contenu centré
      // verticalement par défaut (incohérent visuellement entre les cellules).
      // \vspace force un petit espace avant l'énoncé (sinon collé au bord supérieur).
      // \centering à l'intérieur centre horizontalement sans affecter l'alignement vertical en haut.
      return `\\parbox[t][${HAUTEUR_CELLULE_CM}cm][t]{\\largeurcell}{\\centering\\vspace{${ESPACE_HAUT_CM}cm}${enonceTex}}`;
    });

    // Regroupement par ligne de 2 colonnes.
    const lignesTex = [];
    for (let i = 0; i < cellulesTex.length; i += 2) {
      const gauche = cellulesTex[i] || '';
      const droite = cellulesTex[i + 1] || '';
      lignesTex.push(`${gauche} & ${droite} \\\\ \\hline`);
    }

    return `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1cm,right=1cm]{geometry}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{ragged2e}
\\renewcommand{\\arraystretch}{1}
\\pagestyle{empty}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,20

\\vspace{0.9cm}

\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{0.9cm}

\\newlength{\\largeurcell}
\\setlength{\\largeurcell}{0.49\\textwidth}

\\noindent\\begin{tabular}{|>{\\RaggedRight\\arraybackslash}p{\\largeurcell}|>{\\RaggedRight\\arraybackslash}p{\\largeurcell}|}
\\hline
${lignesTex.join('\n')}
\\end{tabular}

\\end{document}
`;
  }

  _telechargerLatex() {
    if (!this._derniereSerie) this._regenerer();
    const tex = this._genererLatex();
    const blob = new Blob([tex], { type: 'application/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiche-equations.tex';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- CSS (overlay + impression) ---------------- */

  _installerCSS() {
    if (document.getElementById('fiche-papier-css')) return;
    const style = document.createElement('style');
    style.id = 'fiche-papier-css';
    style.textContent = `
      #overlayFiche{
        display:none;
        position:fixed;
        top:0; right:0; bottom:0; left:0;
        background:rgba(44,34,38,0.55);
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
        background:var(--papier-encart, #fff);
        color:var(--encre, #111);
        max-width:950px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        border-radius:8px;
        border:1px solid var(--grille-forte, #2c2226);
        padding:28px 32px;
      }

      #btnFermerFiche{
        position:absolute;
        top:10px; right:14px;
        background:none;
        border:none;
        font-size:24px;
        line-height:1;
        cursor:pointer;
        color:var(--encre-douce, #555);
      }
      #btnFermerFiche:hover{ color:var(--erreur, #c44336); }

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
        background:var(--craie, #7d3358);
        color:#fff;
        font-size:13.5px;
        font-weight:600;
        cursor:pointer;
        transition: background-color 0.15s ease;
      }
      .fiche-actions button:hover{ background:var(--craie-hover, #5f2742); }

      .note-impression{
        text-align:center;
        font-size:12.5px;
        color:var(--encre-douce, #666);
        margin:10px 0 0;
      }

      .ligne-identite{
        display:flex;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:16px;
        font-size:15px;
        margin-top: 20px;
      }
      .trait{
        display:inline-block;
        min-width:220px;
        border-bottom:1px solid var(--grille-forte, #444);
        margin-left:6px;
      }
      .trait.court{ min-width:70px; }

      #ficheCarte h2{
        text-align:center;
        margin:60px 0 0;
        font-size:1.3em;
        color: var(--craie, #7d3358);
      }
      .sous-titre{
        text-align:center;
        color:var(--encre-douce, #555);
        margin:6px 0 0;
        font-size:0.95em;
      }

      .fiche-grille{
        display:grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: repeat(4, 1fr);
        gap: 16px;
        margin-top: 60px;
      }

      .fiche-cellule{
        border: 1px solid var(--grille, #ccc);
        border-radius: 4px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        min-height: 180px;
        position: relative;
      }

      .cellule-enonce{
        font-size: 17px;
        margin-bottom: 10px;
        text-align: center;
      }

      .cellule-resolution{
        flex: 1 1 auto;
        border-top: 1px dashed var(--grille, #ccc);
        min-height: 110px;
      }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: 0.8cm; size: A4; }
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
        }
        #ficheCarte{
          box-shadow:none;
          max-height:none;
          max-width:none;
          width:100%;
          border-radius:0;
          padding:0.5cm;
        }
        #btnFermerFiche, .fiche-actions, .note-impression{ display:none !important; }
        .fiche-grille{
          height: 22cm; /* force les 4 lignes à se répartir sur la hauteur restante d'une page A4 */
        }
        .fiche-cellule{
          min-height: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FichePapier = FichePapier;
