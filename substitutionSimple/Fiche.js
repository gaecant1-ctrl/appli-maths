/* ==============================================
   Fiche.js — overlay "Fiche papier" pour l'appli de substitution
   ----------------------------------------------
   Génère une fiche imprimable reprenant la MÊME forme que le tableau à
   l'écran : une ligne par jeu de valeurs (γ, ou a et b selon le mode), une
   expression par colonne, toutes les cases vides pour que l'élève y écrive
   sa réponse.

   Le motif d'expressions est tiré avec tirerMotif() (app.js), parmi les
   motifs actuellement actifs dans le panneau latéral — sans jamais toucher
   à la grille en cours.

   API publique :
     const fiche = new FichePapier();
     fiche.installerBouton(conteneurDuBandeau);   // ajoute le bouton déclencheur
     fiche.ouvrir();                              // ouvre l'overlay
================================================== */

class FichePapier {
  constructor(opts = {}) {
    // Nombre de lignes de la fiche : par défaut, celui actuellement choisi
    // dans le panneau (NB_LIGNES, app.js), pas une valeur figée à la création.
    this.nbLignesOverride = opts.nbLignes || null;
    this.titre = opts.titre || "Fiche d'exercices — Substitution";
    // Sous-titre : si non fourni, recalculé selon le mode (1 ou 2 inconnues) à chaque génération.
    this.sousTitreParamOverride = opts.sousTitre || null;

    this.overlay = null;
    this.grilleWrap = null;
    this.sousTitreEl = null; // <p> du sous-titre, mis à jour à chaque génération
    this.noteDenominateur = null; // <span> "/ N" mis à jour à chaque génération
    this._derniereSerie = null; // { expressions, lignesVars } de la série actuellement affichée

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

  /* ---------------- Génération d'une série {expressions, lignesVars} (sans DOM) ---------------- */

  /** Nombre de lignes de la fiche : celui du panneau (NB_LIGNES), sauf override explicite. */
  _nbLignes() {
    if (this.nbLignesOverride) return this.nbLignesOverride;
    return typeof NB_LIGNES !== 'undefined' ? NB_LIGNES : 8;
  }

  _genererSerie() {
    // Réutilise tirerMotif() et tirerLignesValeurs() (app.js) : même tirage
    // que dans la grille à l'écran, respectant le motif, le mode (1, 2 ou 3
    // inconnues) et le nombre de lignes actuellement actifs.
    if (typeof tirerMotif !== 'function' || typeof tirerLignesValeurs !== 'function') {
      return { expressions: [], lignesVars: [] };
    }
    return {
      expressions: tirerMotif(),
      lignesVars: tirerLignesValeurs(this._nbLignes())
    };
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
      <span>Note : <span class="trait court"></span> / <span class="note-denominateur"></span></span>
    `;
    this.noteDenominateur = identite.querySelector('.note-denominateur');

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'sous-titre';
    this.sousTitreEl = sousTitre;

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

  _rendreGrille(serie) {
    const { expressions, lignesVars } = serie;
    this.grilleWrap.innerHTML = '';

    if (this.noteDenominateur) {
      this.noteDenominateur.textContent = expressions.length * lignesVars.length;
    }

    const lettres = variablesDuMode();

    const table = document.createElement('table');
    table.className = 'fiche-table';

    const thead = document.createElement('thead');
    const trEnTetes = document.createElement('tr');
    trEnTetes.innerHTML =
      lettres.map(l => `<th>\\(${labelVariable(l)}\\)</th>`).join('') +
      expressions.map(e => `<th>\\(${latexEnTete(e)}\\)</th>`).join('');
    thead.appendChild(trEnTetes);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    lignesVars.forEach(v => {
      const tr = document.createElement('tr');
      tr.innerHTML =
        lettres.map(l => `<th>\\(${v[l]}\\)</th>`).join('') +
        expressions.map(() => `<td></td>`).join('');
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);

    this.grilleWrap.appendChild(table);

    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.grilleWrap]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.grilleWrap]);
    } catch (e) { /* silencieux */ }
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    // Toujours régénérer à l'ouverture : les réglages (niveau actif) ont pu
    // changer depuis la dernière série générée.
    this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  /** Sous-titre par défaut, dépendant du mode (1 ou 2 inconnues) actuel. */
  _sousTitreParDefaut() {
    if (typeof variablesDuMode !== 'function' || typeof modeVariables === 'undefined' || modeVariables === 1) {
      return 'Calcule la valeur de chaque expression pour la valeur de γ indiquée.';
    }
    const lettres = variablesDuMode();
    const liste = lettres.slice(0, -1).join(', ') + ' et ' + lettres[lettres.length - 1];
    return `Calcule la valeur de chaque expression pour les valeurs de ${liste} indiquées.`;
  }

  _regenerer() {
    if (this.sousTitreEl) {
      this.sousTitreEl.textContent = this.sousTitreParamOverride || this._sousTitreParDefaut();
    }
    this._derniereSerie = this._genererSerie();
    this._rendreGrille(this._derniereSerie);
  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  _genererLatex() {
    const { expressions, lignesVars } = this._derniereSerie || { expressions: [], lignesVars: [] };
    const lettres = variablesDuMode();
    const nbExercices = expressions.length * lignesVars.length;

    // adjustbox (max width) : rétrécit une formule plus large que sa colonne
    // (ex. "(a-b)(a+b)"), sans agrandir les formules courtes — même logique
    // que la mise à l'échelle JS du tableau à l'écran (ajusterTaillesLatex).
    const celMath = latex => `\\adjustbox{max width=\\linewidth}{$${latex}$}`;

    const enTetesTex =
      lettres.map(l => celMath(labelVariable(l))).join(' & ') + ' & ' +
      expressions.map(e => celMath(latexEnTete(e))).join(' & ');
    const lignesTex = lignesVars.map(v => {
      const cellulesVars = lettres.map(l => `$${v[l]}$`).join(' & ');
      const cellulesVides = expressions.map(() => '').join(' & ');
      return `${cellulesVars} & ${cellulesVides} \\\\ \\hline`;
    });

    // Colonnes de largeur fixe et identique (sinon "a" et "(a-b)(a+b)" ne
    // donnent pas des cellules de la même taille) : on répartit la largeur
    // utile de la page (a4paper moins les marges de 1.5cm) entre les colonnes,
    // avec un plafond pour qu'une grille à peu de colonnes ne produise pas des
    // cases démesurément larges (le tableau est alors centré, pas étiré).
    // Il faut retrancher le \tabcolsep (2pt de chaque côté de colonne, réduit
    // ci-dessous) et les traits verticaux, sinon la somme des colonnes p{...}
    // dépasse réellement les 18cm au moment de la compilation et déborde.
    const nbColonnes = lettres.length + expressions.length;
    const TABCOLSEP_CM = 2 / 28.35; // \tabcolsep réduit à 2pt (cf. \setlength ci-dessous), converti en cm
    const REGLE_CM = 0.04; // épaisseur approximative d'un trait vertical "|"
    const largeurUtile = 18 - nbColonnes * (2 * TABCOLSEP_CM + REGLE_CM) - REGLE_CM;
    const largeurColonne = Math.min(3, Math.max(1.2, largeurUtile / nbColonnes)).toFixed(2);
    const colonne = `>{\\centering\\arraybackslash}p{${largeurColonne}cm}`;
    const specColonnes = Array(nbColonnes).fill(colonne).join('|');

    return `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm]{geometry}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{adjustbox}
\\setlength{\\tabcolsep}{2pt}
\\renewcommand{\\arraystretch}{2.5}
\\pagestyle{empty}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,${nbExercices}

\\vspace{0.9cm}

\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitreParamOverride || this._sousTitreParDefaut()).replace(/γ/g, '$\\gamma$')}}
\\end{center}

\\vspace{0.9cm}

\\begin{center}
\\begin{tabular}{|${specColonnes}|}
\\hline
${enTetesTex} \\\\ \\hline
${lignesTex.join('\n')}
\\end{tabular}
\\end{center}

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
    a.download = 'fiche-substitution.tex';
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
        background:var(--papier-encart, #fff);
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
        margin-top: 6px;
      }
      .fiche-actions button{
        padding:9px 16px;
        border:none;
        border-radius:4px;
        background:var(--accent, #E67E22);
        color:#fff;
        font-size:13.5px;
        font-weight:600;
        cursor:pointer;
        transition: background-color 0.15s ease;
      }
      .fiche-actions button:hover{ background:var(--accent-hover, #C8690F); }

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
        border-bottom:1px solid var(--grille-forte, #999);
        margin-left:6px;
      }
      .trait.court{ min-width:70px; }

      #ficheCarte h2{
        text-align:center;
        margin:40px 0 0;
        font-size:1.3em;
        color: var(--accent, #E67E22);
      }
      .sous-titre{
        text-align:center;
        color:var(--encre-douce, #555);
        margin:0px 0 0;
        font-size:0.95em;
      }

      #ficheGrilleWrap{
        margin-top: 20px;
        overflow-x: auto;
      }

      .fiche-table{
        width: 100%;
        border-collapse: collapse;
        table-layout: fixed;
      }

      .fiche-table th,
      .fiche-table td{
        border: 1px solid var(--grille, #f5dcc0);
        text-align: center;
        vertical-align: middle;
      }

      .fiche-table thead th,
      .fiche-table tbody th{
        background: var(--accent-clair, #fcead9);
        color: var(--header-texte, #7a4a15);
        font-weight: 700;
      }

      .fiche-table thead th{
        padding: 10px 8px;
        font-size: 17px;
      }

      .fiche-table tbody th{
        padding: 8px;
        white-space: nowrap;
        font-size: 17px;
      }

      .fiche-table tbody td{
        height: 56px;
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
      }
    `;
    document.head.appendChild(style);
  }
}

window.FichePapier = FichePapier;
