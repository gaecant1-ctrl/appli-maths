/* ==============================================
   Fiche.js — overlay "Fiche papier" de l'appli « somme en nombre mixte »
   ----------------------------------------------
   Fiche imprimable de 8 tirages de jetons (grille 4 lignes x 2 colonnes).
   Chaque cellule : les jetons, puis « Somme : ... » à compléter.

   Les tirages viennent de la fonction passée en option (tirage() de
   index.html, au niveau courant) — sans toucher à la partie en cours.

   API publique :
     const fiche = new FichePapier({ generer, nomNiveau });
     fiche.installerBouton(conteneurDuBandeau);
     fiche.ouvrir();
================================================== */

class FichePapier {
  constructor(opts = {}) {
    this.nbLignes = 4;
    this.nbColonnes = 2;
    this.nbExercices = this.nbLignes * this.nbColonnes;
    this.generer = opts.generer || (() => []);
    this.nomNiveau = opts.nomNiveau || (() => '');
    this.titre = "Fiche d'exercices — Somme en nombre mixte";
    this.sousTitre = "Calcule la somme de tous les jetons. Écris-la en nombre mixte.";

    this.overlay = null;
    this.grilleWrap = null;
    this.h2 = null;
    this._derniereSerie = null; // [[{a, b}, ...], ...]

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
      <span>Note : <span class="trait court"></span> / ${this.nbExercices}</span>
    `;

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'sous-titre';
    sousTitre.textContent = this.sousTitre;

    const grilleWrap = document.createElement('div');
    grilleWrap.id = 'ficheGrilleWrap';

    carte.append(btnFermer, actions, note, identite, h2, sousTitre, grilleWrap);
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
    this.h2 = h2;
  }

  _jetonHTML(j) {
    if (j.b === 1) return `<span class="fiche-jeton entier">${j.a}</span>`;
    return `<span class="fiche-jeton frac"><span class="fr"><span>${j.a}</span><span>${j.b}</span></span></span>`;
  }

  _rendreGrille(liste) {
    this.grilleWrap.innerHTML = '';
    const grille = document.createElement('div');
    grille.className = 'fiche-grille';

    liste.forEach((jetons, i) => {
      const cellule = document.createElement('div');
      cellule.className = 'fiche-cellule';
      cellule.innerHTML = `
        <div class="cellule-numero">${i + 1})</div>
        <div class="cellule-jetons">${jetons.map(j => this._jetonHTML(j)).join('')}</div>
        <div class="cellule-resolution"></div>
        <div class="cellule-somme">Somme : <span class="trait"></span></div>
      `;
      grille.appendChild(cellule);
    });

    this.grilleWrap.appendChild(grille);
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    // Toujours régénérer : le niveau a pu changer depuis la dernière série.
    this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  _regenerer() {
    const serie = [];
    for (let i = 0; i < this.nbExercices; i++) serie.push(this.generer());
    this._derniereSerie = serie;
    this.h2.textContent = `${this.titre} (${this.nomNiveau()})`;
    this._rendreGrille(serie);
  }

  /* ---------------- Export LaTeX ---------------- */

  _genererLatex() {
    const liste = this._derniereSerie || [];
    const HAUTEUR_CELLULE_CM = 4.9;

    const cellulesTex = liste.map((jetons, i) => {
      const jetonsTex = jetons
        .map(j => (j.b === 1 ? `\\jetonE{${j.a}}` : `\\jetonF{${j.a}}{${j.b}}`))
        .join('\\hspace{2mm}');
      return `\\parbox[t][${HAUTEUR_CELLULE_CM}cm][t]{\\largeurcell}{\\vspace{0.25cm}`
        + `\\textbf{${i + 1})}\\par\\vspace{2mm}{\\centering ${jetonsTex}\\par}`
        + `\\vfill Somme : \\dotfill\\par\\vspace{0.3cm}}`;
    });

    const lignesTex = [];
    for (let i = 0; i < cellulesTex.length; i += 2) {
      lignesTex.push(`${cellulesTex[i] || ''} & ${cellulesTex[i + 1] || ''} \\\\ \\hline`);
    }

    return `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french]{babel}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1cm,right=1cm]{geometry}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{tikz}
\\renewcommand{\\arraystretch}{1}
\\pagestyle{empty}

% jetons : entier (grisé) et fraction (blanc)
\\newcommand{\\jetonE}[1]{\\tikz[baseline=(j.base)]\\node[circle,draw,thick,fill=black!12,minimum size=1.25cm,inner sep=0pt](j){\\large #1};}
\\newcommand{\\jetonF}[2]{\\tikz[baseline=(j.base)]\\node[circle,draw,thick,minimum size=1.25cm,inner sep=0pt](j){$\\dfrac{#1}{#2}$};}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,${this.nbExercices}

\\vspace{0.9cm}

\\begin{center}
{\\Large \\textbf{Somme en nombre mixte (${this.nomNiveau()})}}\\\\[0.3em]
{\\large ${this.sousTitre}}
\\end{center}

\\vspace{0.6cm}

\\newlength{\\largeurcell}
\\setlength{\\largeurcell}{0.47\\textwidth}

\\noindent\\begin{tabular}{|p{\\largeurcell}|p{\\largeurcell}|}
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
    a.download = 'fiche-somme-mixte.tex';
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
        inset:0;
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
        color:var(--encre, #222);
        max-width:950px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:8px;
        border:1px solid var(--grille-forte, #d5dbe4);
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
        color:var(--encre-douce, #555);
      }
      #btnFermerFiche:hover{ color:var(--erreur, #c44336); }

      .fiche-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        justify-content:center;
        margin-top:6px;
      }
      .fiche-actions button{
        padding:9px 16px;
        border:none;
        border-radius:4px;
        background:var(--accent, #2f9e44);
        color:#fff;
        font-size:13.5px;
        font-weight:600;
        cursor:pointer;
        transition: background-color 0.15s ease;
      }
      .fiche-actions button:hover{ background:var(--accent-hover, #237a35); }

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
        margin-top:20px;
      }
      #ficheCarte .trait{
        display:inline-block;
        min-width:220px;
        border-bottom:1px solid var(--grille-forte, #999);
        margin-left:6px;
      }
      #ficheCarte .trait.court{ min-width:70px; }

      #ficheCarte h2{
        text-align:center;
        margin:40px 0 0;
        font-size:1.3em;
        color:var(--accent, #2f9e44);
      }
      .sous-titre{
        text-align:center;
        color:var(--encre-douce, #555);
        margin:0;
        font-size:0.95em;
      }

      .fiche-grille{
        display:grid;
        grid-template-columns:1fr 1fr;
        grid-template-rows:repeat(4, 1fr);
        gap:16px;
        margin-top:20px;
      }
      .fiche-cellule{
        border:1px solid var(--grille, #ccc);
        border-radius:4px;
        padding:12px 16px;
        display:flex;
        flex-direction:column;
        min-height:190px;
      }
      .cellule-numero{ font-weight:700; }
      .cellule-jetons{
        display:flex;
        flex-wrap:wrap;
        gap:8px;
        justify-content:center;
        margin:6px 0 4px;
      }
      .fiche-jeton{
        width:46px; height:46px;
        border-radius:50%;
        border:2px solid #333;
        display:inline-flex;
        align-items:center;
        justify-content:center;
        font-weight:700;
        font-size:17px;
        -webkit-print-color-adjust:exact;
        print-color-adjust:exact;
      }
      .fiche-jeton.entier{ background:#e6e6e6; }
      .fiche-jeton.frac{ background:#fff; }
      .fiche-jeton .fr{ font-size:15px; }
      .cellule-resolution{ flex:1 1 auto; min-height:40px; }
      .cellule-somme{ font-size:16px; }
      .cellule-somme .trait{ min-width:160px !important; }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin:0.8cm; size:A4; }
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
          border:none;
          border-radius:0;
          padding:0.5cm;
        }
        #btnFermerFiche, .fiche-actions, .note-impression{ display:none !important; }
        .fiche-grille{ height:22cm; }
        .fiche-cellule{ min-height:0; }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FichePapier = FichePapier;
