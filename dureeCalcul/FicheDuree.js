/* ==============================================
   FicheDuree.js — overlay "Fiche papier" pour EnonceDuree
   ----------------------------------------------
   Adaptation de FicheGrandeur.js (calculExpression) au cas EnonceDuree :
   une seule "famille" (durée), donc on mélange directement les 4
   SOUS_TYPES_DUREE (Fisher-Yates) au lieu de paires famille/sous-type.

   API publique :
     const fiche = new FicheDuree({ sharedOptions, nbExercices, titre, sousTitre });
     fiche.installerBouton(conteneurDuBandeau);
     fiche.ouvrir();
================================================== */

class FicheDuree {
  /**
   * @param {Object} opts
   * @param {Object}   [opts.sharedOptions]  - options partagées passées à EnonceDuree
   * @param {number}   [opts.nbExercices]    - défaut : nombre de sous-types (une fiche couvre chacun une fois)
   * @param {string}   [opts.titre]
   * @param {string}   [opts.sousTitre]
   * @param {string[]} [opts.sousTypes]      - sous-ensemble des sous-types à utiliser (défaut : tous)
   */
  constructor(opts = {}) {
    this.sharedOptionsBase = opts.sharedOptions || {};
    this.titre = opts.titre || "Calcul de durées";
    this.sousTitre = opts.sousTitre || "Calcule le résultat.";

    this.sousTypes = opts.sousTypes?.length ? opts.sousTypes : SOUS_TYPES_DUREE;
    this.nbExercices = Math.max(1, Number(opts.nbExercices || this.sousTypes.length));

    this.overlay = null;
    this.tableWrap = null;
    this._lastVariants = null;
    this._seedActuel = null;

    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton dans le bandeau ---------------- */

  installerBouton(conteneur) {
    if (!conteneur) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnFichePapier';
    btn.className = 'btn-fiche-papier';
    btn.textContent = '📄 Fiche papier';
    btn.addEventListener('click', () => this.ouvrir());
    conteneur.appendChild(btn);
    return btn;
  }

  /* ---------------- Génération des exercices (sans DOM) ---------------- */

  _sousTypesSansRepetition(nbVoulu, seed) {
    const rng = new RNG(seed);
    const sousTypes = [...this.sousTypes];
    for (let i = sousTypes.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [sousTypes[i], sousTypes[j]] = [sousTypes[j], sousTypes[i]];
    }
    const out = [];
    for (let i = 0; i < nbVoulu; i++) out.push(sousTypes[i % sousTypes.length]);
    return out;
  }

  _genererSerie(seed) {
    const sousTypesSeries = this._sousTypesSansRepetition(this.nbExercices, `${seed}-types`);

    const liste = [];
    for (let i = 1; i <= this.nbExercices; i++) {
      const sousType = sousTypesSeries[i - 1];
      const opts = {
        seed: `${seed}-q${i}`,
        sharedOptions: { ...this.sharedOptionsBase, affichageAvecLettre: null, sousTypeForce: sousType }
      };
      const enonce = new EnonceDuree(opts);
      const variant = enonce.genVariant(i);
      const data = enonce.toQuestionData(variant, i);
      liste.push({
        index: i,
        sousType,
        question: data.question || '',
        expressionInitiale: data.expressionInitiale || '',
        options: data.options || {}
      });
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

    const espace1 = document.createElement('div');
    espace1.className = 'espace-fiche';

    const identite = document.createElement('div');
    identite.className = 'ligne-identite';
    identite.innerHTML = `
      <span>Nom et prénom : <span class="trait"></span></span>
      <span>Note : <span class="trait court"></span> / 20</span>
    `;

    const espace2 = document.createElement('div');
    espace2.className = 'espace-fiche';

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'sous-titre';
    sousTitre.textContent = this.sousTitre;

    const espace3 = document.createElement('div');
    espace3.className = 'espace-fiche';

    const tableWrap = document.createElement('div');
    tableWrap.id = 'ficheTableWrap';

    carte.append(
      btnFermer,
      actions,
      note,
      espace1,
      identite,
      espace2,
      h2,
      sousTitre,
      espace3,
      tableWrap
    );
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
    this.tableWrap = tableWrap;
  }

  _rendreTableau(liste) {
    this.tableWrap.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'fiche-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr><th>N°</th><th>Énoncé</th><th>Réponse</th></tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    liste.forEach(item => {
      const tr = document.createElement('tr');

      const tdNum = document.createElement('td');
      tdNum.className = 'col-num';
      tdNum.textContent = item.index;

      const tdQ = document.createElement('td');
      tdQ.className = 'col-enonce';
      tdQ.innerHTML = `$${item.expressionInitialeLatex || item.expressionInitiale}$`;

      const tdR = document.createElement('td');
      tdR.className = 'col-reponse';
      tdR.innerHTML = '<span class="ligne-reponse"></span>';

      tr.append(tdNum, tdQ, tdR);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    this.tableWrap.appendChild(table);

    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.tableWrap]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.tableWrap]);
    } catch (e) { /* silencieux */ }
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    if (!this._lastVariants) this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  _regenerer() {
    this._seedActuel = `fiche-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    this._lastVariants = this._genererSerie(this._seedActuel).map(item => {
      let latex = item.expressionInitiale;
      try {
        const o = new ObjetString(item.expressionInitiale, item.options || {});
        if (o.isValid()) latex = o.arbre.toLatex(item.options?.affichageInitial ?? {});
      } catch (e) { /* on garde le texte brut en repli */ }
      return { ...item, expressionInitialeLatex: latex };
    });
    this._rendreTableau(this._lastVariants);
  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  _genererLatex() {
    const liste = this._lastVariants || [];
    const ESPACE_REPONSE_CM = 1.3;

    const lignesTex = liste.map((item) => {
      const enonceTex = item.expressionInitialeLatex || item.expressionInitiale;
      return `${item.index} & $${enonceTex}$ & \\rule{0pt}{${ESPACE_REPONSE_CM}cm} \\\\ \\hline`;
    }).join('\n');

    return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1cm,right=1cm]{geometry}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{longtable}
\\usepackage{ragged2e}
\\renewcommand{\\arraystretch}{1}
\\pagestyle{empty}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,20

\\vspace{0.5cm}

\\begin{center}
{\\Large \\textbf{TITRE_PLACEHOLDER}}\\\\[0.3em]
{\\large SOUSTITRE_PLACEHOLDER}
\\end{center}

\\vspace{1cm}

\\begin{longtable}{|>{\\centering\\arraybackslash}p{0.5cm}|>{\\RaggedRight\\arraybackslash}p{13.2cm}|>{\\RaggedRight\\arraybackslash}p{4cm}|}
\\hline
\\textbf{N°} & \\textbf{Énoncé} & \\textbf{Réponse} \\\\ \\hline
\\endhead
LIGNES_PLACEHOLDER
\\end{longtable}

\\end{document}
`.replace('TITRE_PLACEHOLDER', this._texEscape(this.titre))
 .replace('SOUSTITRE_PLACEHOLDER', this._texEscape(this.sousTitre))
 .replace('LIGNES_PLACEHOLDER', lignesTex);
  }

  _telechargerLatex() {
    if (!this._lastVariants) this._regenerer();
    const tex = this._genererLatex();
    const blob = new Blob([tex], { type: 'application/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiche-durees.tex';
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
      .btn-fiche-papier{
        display:inline-flex;
        align-items:center;
        justify-content:center;
        height:34px;
        padding:0 14px;
        border:0.5px solid var(--header-bordure, #e0bcdd);
        border-radius:var(--rayon-petit, 8px);
        background:transparent;
        color:var(--header-texte, #5c2a56);
        font-size:0.82rem;
        line-height:1.2;
        font-weight:500;
        cursor:pointer;
        white-space:nowrap;
        transition:border-color .12s, color .12s, background-color .12s;
      }
      .btn-fiche-papier:hover{ border-color:var(--primary, #8E4585); color:var(--header-texte-hover, #3d1a3a); }

      #overlayFiche{
        display:none;
        position:fixed;
        top:0; right:0; bottom:0; left:0;
        background:rgba(0,0,10,0.75);
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
        color:#111;
        max-width:900px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        border-radius:12px;
        padding:28px 32px;
        box-shadow:0 20px 60px rgba(0,0,0,0.5);
      }

      #btnFermerFiche{
        position:absolute;
        top:10px; right:14px;
        background:none;
        border:none;
        font-size:28px;
        line-height:1;
        cursor:pointer;
        color:#555;
      }
      #btnFermerFiche:hover{ color:#000; }

      .fiche-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        justify-content:center;
      }
      .fiche-actions button{
        padding:10px 18px;
        border:none;
        border-radius:8px;
        background:#1e293b;
        color:#fff;
        font-size:14px;
        font-weight:600;
        cursor:pointer;
      }
      .fiche-actions button:hover{ background:#334155; }

      .note-impression{
        text-align:center;
        font-size:12.5px;
        color:#666;
        margin:10px 0 0;
      }

      .espace-fiche{ height:22px; }

      .ligne-identite{
        display:flex;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:16px;
        font-size:15px;
      }
      .trait{
        display:inline-block;
        min-width:220px;
        border-bottom:1px solid #444;
        margin-left:6px;
      }
      .trait.court{ min-width:70px; }

      #ficheCarte h2{
        text-align:center;
        margin:0;
        font-size:1.4em;
      }
      .sous-titre{
        text-align:center;
        color:#555;
        margin:6px 0 0;
        font-size:0.95em;
      }

      .fiche-table{
        width:100%;
        border-collapse:collapse;
        margin-top:6px;
      }
      .fiche-table th, .fiche-table td{
        border:1px solid #ccc;
        padding:10px;
        vertical-align:top;
        font-size:14px;
      }
      .fiche-table thead th{
        background:#f1f5f9;
        text-align:left;
      }
      .col-num{ width:24px; text-align:center; font-weight:700; padding-left:6px; padding-right:6px; }
      .col-enonce{ width:70%; line-height:1.5; }
      .col-reponse{ width:18%; }
      .ligne-reponse{
        display:block;
        min-height:32px;
        border-bottom:1px solid #999;
      }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: 0.8cm; }
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
          padding:0;
        }
        #btnFermerFiche, .fiche-actions, .note-impression{ display:none !important; }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FicheDuree = FicheDuree;
