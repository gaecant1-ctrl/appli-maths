/* ==============================================
   Fiche.js — overlay "Fiche papier" pour le jeu de factorisation
   ----------------------------------------------
   Génère 18 expressions à factoriser (3 colonnes de 6 lignes), dans un overlay
   imprimable. Réutilise generateRandomExpression() et cleanQuestionExpression()
   déjà définis dans app.js (chargé après).

   Pas de modules ES : script global, instancié dans window.onload.

   API publique :
     const fiche = new FicheFactorisation();
     fiche.installerBouton(conteneur);
     fiche.ouvrir();
================================================== */

class FicheFactorisation {
  constructor(opts = {}) {
    this.nbColonnes   = opts.nbColonnes   || 3;   // 3 factorisations par ligne
    this.nbLignes     = opts.nbLignes     || 6;   // 6 lignes → 18 exercices
    this.nbExercices  = this.nbColonnes * this.nbLignes;
    this.titre        = opts.titre    || "Fiche d'exercices — Factorisation";
    this.sousTitre    = opts.sousTitre || "Factorise chaque expression au maximum.";

    this.overlay     = null;
    this.grilleWrap  = null;
    this._derniereSerie = null;

    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton déclencheur ---------------- */

  installerBouton(conteneur) {
    if (!conteneur) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-header';
    btn.textContent = 'Fiche papier';
    btn.addEventListener('click', () => this.ouvrir());
    conteneur.appendChild(btn);
    return btn;
  }

  /* ---------------- Génération de la série ---------------- */

  _genererSerie() {
    const lignes = [];
    for (let i = 0; i < this.nbExercices; i++) {
      const expr = generateRandomExpression();
      const os   = parseMV(expr.raw);
      lignes.push({
        expression: os.isValid() ? os.toLatex() : expr.raw,
        raw:        expr.raw
      });
    }
    return lignes;
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlayFicheFacto';

    const carte = document.createElement('div');
    carte.id = 'ficheFactoCarte';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerFicheFacto';
    btnFermer.type = 'button';
    btnFermer.setAttribute('aria-label', 'Fermer');
    btnFermer.textContent = '×';
    btnFermer.addEventListener('click', () => this.fermer());

    const actions = document.createElement('div');
    actions.className = 'fiche-facto-actions';

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

    const identite = document.createElement('div');
    identite.className = 'fiche-facto-identite';
    identite.innerHTML = `
      <span>Nom et prénom : <span class="trait"></span></span>
      <span>Note : <span class="trait court"></span> / ${this.nbExercices}</span>
    `;

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'fiche-facto-sous-titre';
    sousTitre.textContent = this.sousTitre;

    const grilleWrap = document.createElement('div');
    grilleWrap.id = 'ficheFactoGrilleWrap';

    carte.append(btnFermer, actions, identite, h2, sousTitre, grilleWrap);
    overlay.appendChild(carte);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.fermer();
    });
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer();
    };
    document.addEventListener('keydown', this._onKeydown);

    this.overlay = overlay;
    this.grilleWrap = grilleWrap;
  }

  _rendreGrille(lignes) {
    // Capsules en grille CSS (comme les cellules de l'appli équation) :
    // énoncé en haut, espace vide en dessous — pas de lignes tracées.
    const cellule = (l) => `
      <div class="facto-cellule">
        <div class="facto-enonce">\\(${l.expression}\\)</div>
        <div class="facto-resolution"></div>
      </div>`;

    this.grilleWrap.innerHTML = `
      <div class="facto-grille" style="grid-template-columns: repeat(${this.nbColonnes}, 1fr);">
        ${lignes.map(cellule).join('')}
      </div>`;

    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.grilleWrap]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.grilleWrap]);
    } catch (e) { /* silencieux */ }
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    // Toujours régénérer à l'ouverture : les réglages (types de factorisation
    // actifs) ont pu changer depuis la dernière série générée.
    this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-facto-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-facto-ouverte');
  }

  _regenerer() {
    this._derniereSerie = this._genererSerie();
    this._rendreGrille(this._derniereSerie);
  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  /** Convertit l'expression brute (raw) en LaTeX pour le document .tex.
   *  On utilise le rendu de l'arbre (parseMV) qui produit directement du
   *  LaTeX valide avec \left\right, ^{}, etc. */
  _versTexMath(raw) {
    try {
      const os = typeof parseMV === 'function' ? parseMV(raw) : null;
      if (os && os.isValid()) return os.toLatex();
    } catch (e) { /* silencieux */ }
    // Repli : baliser les exposants manuellement
    return String(raw || '').replace(/\^(\d+)/g, '^{$1}');
  }

  _genererTabularColonne(col) {
    // Non utilisée directement, conservée pour compatibilité
  }

  _genererLatex() {
    const lignes = this._derniereSerie || [];
    const C = this.nbColonnes;   // 3
    const L = this.nbLignes;     // 6

    // ── Marges de page : réglables indépendamment pour que la fiche
    //    (3 colonnes × 6 lignes) tienne sur une seule page A4. ──────────
    const MARGE_HAUT    = '1cm';
    const MARGE_BAS     = '1.2cm';
    const MARGE_GAUCHE  = '2cm';
    const MARGE_DROITE  = '2cm';

    // ── Espacements internes : réglables pour ajuster la respiration
    //    autour de l'énoncé et entre les lignes de la grille. ───────────
    const ESPACE_APRES_IDENTITE = '0.5cm'; // sous la ligne "Nom / Note"
    const ESPACE_APRES_TITRE    = '0.5cm'; // sous le titre/sous-titre
    const ESPACE_HAUT_CELLULE   = '0.2cm'; // avant l'énoncé, dans chaque case
    const TABCOLSEP             = '3pt';   // marge intérieure gauche/droite des colonnes

    const HAUTEUR = '3.6cm';     // hauteur fixe par cellule : 6 lignes × 3.6cm tient sur une page A4
    const LARGEUR = '5.4cm';     // largeur colonne : (17cm - tabcolsep) / 3 ≈ 5.4cm

    // Groupe les exercices par lignes de C
    const rows = [];
    for (let r = 0; r < L; r++) {
      rows.push(lignes.slice(r * C, (r + 1) * C));
    }

    const lignesTex = rows.map(row => {
      const cells = row.map(l => {
        const tex = this._versTexMath(l.raw || l.expression);
        // Juste l'énoncé : l'espace vide en dessous vient de la hauteur du
        // parbox, sans ligne tracée (comme les capsules de l'appli équation).
        return `\\parbox[t][${HAUTEUR}][t]{${LARGEUR}}{\\centering\\vspace{${ESPACE_HAUT_CELLULE}}$${tex}$}`;
      });
      // Compléter si la dernière ligne est incomplète
      while (cells.length < C) cells.push(`\\parbox[t][${HAUTEUR}][t]{${LARGEUR}}{}`);
      return cells.join(' & ') + ' \\\\\n\\hline';
    }).join('\n');

    const colSpec = Array(C).fill(`>{\\centering\\arraybackslash}p{${LARGEUR}}`).join('|');

    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[a4paper,top=${MARGE_HAUT},bottom=${MARGE_BAS},left=${MARGE_GAUCHE},right=${MARGE_DROITE}]{geometry}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french,provide=*]{babel}
\\usepackage{amsmath}
\\usepackage{array}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\tabcolsep}{${TABCOLSEP}}

\\begin{document}

\\noindent Nom et prénom~: \\hrulefill \\hspace{1.2cm} Note~: \\hrulefill\\,/ ${this.nbExercices}

\\vspace{${ESPACE_APRES_IDENTITE}}

\\begin{center}
{\\Large\\bfseries ${this._texEscape(this.titre)}}\\\\[10pt]
{\\normalsize ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{${ESPACE_APRES_TITRE}}

\\noindent\\begin{tabular}{|${colSpec}|}
\\hline
${lignesTex}
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
    a.download = 'fiche-factorisation.tex';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- CSS ---------------- */

  _installerCSS() {
    if (document.getElementById('fiche-facto-css')) return;
    const style = document.createElement('style');
    style.id = 'fiche-facto-css';
    style.textContent = `
      #overlayFicheFacto{
        display:none;
        position:fixed;
        top:0; right:0; bottom:0; left:0;
        background:rgba(74,144,226,0.15);
        backdrop-filter: blur(2px);
        z-index:1000000;
        align-items:center;
        justify-content:center;
        padding:24px;
        overflow-y:auto;
      }
      #overlayFicheFacto.visible{ display:flex; }

      #ficheFactoCarte{
        position:relative;
        background:#fff;
        color:#222;
        max-width:1100px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:16px;
        border:2px solid #4A90E2;
        box-shadow:0 20px 60px rgba(74,144,226,0.2);
        padding:28px 32px;
      }
      #ficheFactoCarte::-webkit-scrollbar{ display:none; }

      #btnFermerFicheFacto{
        position:absolute;
        top:14px; right:18px;
        width:32px; height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(74,144,226,0.08);
        border:1px solid rgba(74,144,226,0.3);
        border-radius:50%;
        font-size:20px;
        cursor:pointer;
        color:#555;
        transition: background 0.15s, color 0.15s;
      }
      #btnFermerFicheFacto:hover{ background:rgba(231,76,60,0.12); color:#e74c3c; }

      .fiche-facto-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        justify-content:center;
        margin-top:6px;
      }
      .fiche-facto-actions button{
        padding:9px 16px;
        border:none;
        border-radius:50px;
        background:#4A90E2;
        color:#fff;
        font-size:13.5px;
        font-weight:700;
        cursor:pointer;
        transition: transform 0.15s, background 0.15s;
      }
      .fiche-facto-actions button:hover{ background:#357abd; transform:scale(1.04); }

      .fiche-facto-identite{
        display:flex;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:16px;
        font-size:15px;
        margin-top:28px;
      }
      .fiche-facto-identite .trait{
        display:inline-block;
        min-width:220px;
        border-bottom:1px solid #aaa;
        margin-left:6px;
      }
      .fiche-facto-identite .trait.court{ min-width:70px; }

      #ficheFactoCarte h2{
        text-align:center;
        margin:44px 0 0;
        font-size:1.3em;
        color:#4A90E2;
      }
      .fiche-facto-sous-titre{
        text-align:center;
        color:#666;
        margin:10px 0 0;
        font-size:0.95em;
      }

      .facto-grille{
        display:grid;
        gap:18px;
        margin-top:40px;
      }
      .facto-cellule{
        border:1px solid #cbd5e1;
        border-radius:8px;
        padding:16px 14px;
        display:flex;
        flex-direction:column;
        min-height:170px;
      }
      .facto-enonce{
        font-size:18px;
        margin-bottom:10px;
        text-align:center;
      }
      .facto-resolution{
        flex:1 1 auto;
        min-height:110px;
      }

      body.fiche-facto-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin:1.2cm; size:A4; }
        body *{ visibility:hidden; }
        #overlayFicheFacto, #overlayFicheFacto *{ visibility:visible; }
        #overlayFicheFacto{
          position:absolute; inset:0;
          background:#fff; padding:0;
          display:flex !important;
          align-items:flex-start; justify-content:flex-start;
        }
        #ficheFactoCarte{
          box-shadow:none; max-height:none; max-width:none;
          width:100%; border-radius:0; border:none;
          background:#fff; color:#000; padding:0.5cm;
        }
        #btnFermerFicheFacto, .fiche-facto-actions{ display:none !important; }
        #ficheFactoCarte, #ficheFactoCarte *{
          font-weight:400 !important;
          font-synthesis:none !important;
          font-family: Arial, Helvetica, sans-serif !important;
        }
        #ficheFactoCarte h2{ color:#000; font-weight:600 !important; }
        .fiche-facto-sous-titre{ color:#333; }
        .fiche-facto-identite .trait{ border-bottom:1px solid #000; }
        .facto-cellule{ border:0.6pt solid #999; padding:10px 8px; min-height:0; }
        .facto-enonce{ font-size:15px; margin-bottom:10px; }
      }
    `;
    document.head.appendChild(style);
  }
}