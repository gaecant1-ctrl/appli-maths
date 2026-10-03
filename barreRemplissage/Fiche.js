/* ==============================================
   Fiche.js — overlay "Fiche papier" de l'appli « barre de remplissage »
   ----------------------------------------------
   Fiche imprimable de 8 exercices (grille 4 lignes x 2 colonnes).
   Chaque cellule : la barre de 0 à 3 avec le niveau à atteindre, les deux
   sortes de barres à l'échelle, puis le nombre de barres de chaque sorte.

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
    this.titre = "Fiche d'exercices — Barre de remplissage";
    this.sousTitre = "Combien de barres de chaque sorte faut-il pour remplir exactement jusqu'au niveau ?";

    this.overlay = null;
    this.grilleWrap = null;
    this.h2 = null;
    this._derniereSerie = null; // [{ p, q, T }, ...]

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

  _fr(x) {
    return x.d === 1 ? `${x.n}` : `<span class="fr"><span>${x.n}</span><span>${x.d}</span></span>`;
  }
  _mixte(x) {
    const e = Math.floor(x.n / x.d), r = x.n % x.d;
    if (r === 0) return `${e}`;
    const f = `<span class="fr"><span>${r}</span><span>${x.d}</span></span>`;
    return e === 0 ? f : `${e} + ${f}`;
  }

  _rendreGrille(liste) {
    this.grilleWrap.innerHTML = '';
    const grille = document.createElement('div');
    grille.className = 'fiche-grille';
    const U = 110; // px par unité dans l'aperçu

    liste.forEach((q, i) => {
      const xT = q.T.n / q.T.d * U;
      const lp = q.p.n / q.p.d * U, lq = q.q.n / q.q.d * U;
      const cellule = document.createElement('div');
      cellule.className = 'fiche-cellule';
      cellule.innerHTML = `
        <div class="cellule-numero">${i + 1})</div>
        <div class="fiche-barre-zone" style="width:${3 * U}px">
          <div class="fiche-barre"></div>
          ${[0, 1, 2, 3].map(k => `<div class="fiche-grad" style="left:${k * U}px"><span>${k}</span></div>`).join('')}
          <div class="fiche-repere" style="left:${xT}px"><span>${this._mixte(q.T)}</span></div>
        </div>
        <div class="fiche-pieces">
          <span class="fiche-piece p0" style="width:${lp}px">${this._fr(q.p)}</span>
          <span class="fiche-piece p1" style="width:${lq}px">${this._fr(q.q)}</span>
        </div>
        <div class="cellule-resolution"></div>
        <div class="cellule-somme">Barres de ${this._fr(q.p)} : <span class="trait court"></span>
          &nbsp;&nbsp; Barres de ${this._fr(q.q)} : <span class="trait court"></span></div>
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

  _texFr(x) { return x.d === 1 ? `${x.n}` : `\\frac{${x.n}}{${x.d}}`; }
  _texMixte(x) {
    const e = Math.floor(x.n / x.d), r = x.n % x.d;
    if (r === 0) return `${e}`;
    return e === 0 ? `\\frac{${r}}{${x.d}}` : `${e}+\\frac{${r}}{${x.d}}`;
  }

  _genererLatex() {
    const liste = this._derniereSerie || [];
    const HAUTEUR_CELLULE_CM = 5.3;
    const nb = x => (x.n / x.d).toFixed(4);

    const cellulesTex = liste.map((q, i) => {
      const lp = q.p.n / q.p.d, lq = q.q.n / q.q.d;
      const dessin = `\\begin{tikzpicture}[x=2.5cm,y=1cm]
\\draw[thick,fill=black!3] (0,0) rectangle (3,0.6);
\\foreach \\k in {0,...,3} {\\draw[thick] (\\k,0) -- (\\k,-0.15) node[below]{\\small \\k};}
\\draw[red!70!black,very thick] (${nb(q.T)},-0.2) -- (${nb(q.T)},0.85) node[above]{$\\displaystyle ${this._texMixte(q.T)}$};
\\draw[thick,fill=orange!25] (0,-1.75) rectangle (${lp.toFixed(4)},-1.05);
\\node at (${(lp / 2).toFixed(4)},-1.4) {\\footnotesize $${this._texFr(q.p)}$};
\\draw[thick,fill=blue!15] (${(lp + 0.3).toFixed(4)},-1.75) rectangle (${(lp + 0.3 + lq).toFixed(4)},-1.05);
\\node at (${(lp + 0.3 + lq / 2).toFixed(4)},-1.4) {\\footnotesize $${this._texFr(q.q)}$};
\\end{tikzpicture}`;
      return `\\parbox[t][${HAUTEUR_CELLULE_CM}cm][t]{\\largeurcell}{\\vspace{0.25cm}`
        + `\\textbf{${i + 1})}\\par\\vspace{1mm}{\\centering ${dessin}\\par}`
        + `\\vfill Barres de $${this._texFr(q.p)}$ : \\dots\\dots \\hfill Barres de $${this._texFr(q.q)}$ : \\dots\\dots\\par\\vspace{0.3cm}}`;
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

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,${this.nbExercices}

\\vspace{0.5cm}

\\begin{center}
{\\Large \\textbf{Barre de remplissage (${this.nomNiveau()})}}\\\\[0.3em]
{\\large ${this.sousTitre}}
\\end{center}

\\vspace{0.3cm}

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
    a.download = 'fiche-barre-remplissage.tex';
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
      .fiche-barre-zone{ position:relative; margin:34px auto 26px; }
      .fiche-barre{ height:26px; border:2px solid #333; border-radius:3px; }
      .fiche-grad{ position:absolute; top:26px; width:2px; height:7px; background:#333; transform:translateX(-1px); }
      .fiche-grad span{ position:absolute; top:7px; left:50%; transform:translateX(-50%); font-size:13px; font-weight:700; }
      .fiche-repere{ position:absolute; top:-8px; height:44px; width:3px; background:#c0392b; transform:translateX(-1.5px); }
      .fiche-repere span{ position:absolute; bottom:100%; left:50%; transform:translateX(-50%); color:#c0392b; font-weight:700; white-space:nowrap; font-size:14px; }
      .fiche-pieces{ display:flex; gap:24px; justify-content:center; margin-top:4px; }
      .fiche-piece{ height:26px; border:2px solid #333; border-radius:3px; display:inline-flex; align-items:center; justify-content:center; font-size:12px; font-weight:700; -webkit-print-color-adjust:exact; print-color-adjust:exact; }
      .fiche-piece.p0{ background:#fde9b8; }
      .fiche-piece.p1{ background:#dce8fa; }
      #ficheCarte .fr{ display:inline-flex; flex-direction:column; align-items:center; vertical-align:middle; line-height:1.05; }
      #ficheCarte .fr>span:first-child{ border-bottom:1.5px solid currentColor; padding:0 2px; }
      .cellule-resolution{ flex:1 1 auto; min-height:40px; }
      .cellule-somme{ font-size:16px; }
      .cellule-somme .trait{ min-width:50px !important; }

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
