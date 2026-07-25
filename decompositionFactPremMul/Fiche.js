/* ==============================================
   Fiche.js — overlay "Fiche papier" (LaTeX + PDF)
   ----------------------------------------------
   Version QCM : contrairement aux autres applis (moteur EnonceXxx /
   genVariant), ici les questions viennent directement d'une fonction
   génératrice (ex: diviseurDecFullQCM) qui renvoie {question, choix,
   bonnesReponses}. La fiche imprime chaque question suivie de ses choix
   avec une case à cocher vide (☐) — pas de correction imprimée, l'élève
   coche à la main.

   API publique :
     const fiche = new FichePapier({ genererQuestion, nbExercices, titre });
     fiche.installerBouton(conteneurDuBandeau);
     fiche.ouvrir();
================================================== */

class FichePapier {
  /**
   * @param {Object} opts
   * @param {Function} opts.genererQuestion - fonction sans argument renvoyant {question, choix}
   * @param {number}   [opts.nbExercices=8]
   * @param {string}   [opts.titre]
   * @param {string}   [opts.sousTitre]
   */
  constructor(opts = {}) {
    this.genererQuestion = opts.genererQuestion;
    if (typeof this.genererQuestion !== 'function') {
      throw new Error("FichePapier: 'genererQuestion' est requis.");
    }
    this.nbExercices = Math.max(1, Number(opts.nbExercices || 8));
    this.titre = opts.titre || "Exercices";
    this.sousTitre = opts.sousTitre || ``;

    this.overlay = null;
    this.listeWrap = null;
    this._lastQuestions = null;
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
    btn.className = 'btn-header';
    btn.textContent = 'Fiche papier';
    btn.addEventListener('click', () => this.ouvrir());
    conteneur.appendChild(btn);
    return btn;
  }

  /* ---------------- Génération des exercices (sans DOM) ---------------- */

  _genererSerie() {
    const liste = [];
    for (let i = 1; i <= this.nbExercices; i++) {
      liste.push({ index: i, data: this.genererQuestion() });
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
    btnImprimer.addEventListener('click', () => this._imprimer());
    this.btnImprimer = btnImprimer;

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
      <span>Note : <span class="trait court"></span> / ${this.nbExercices}</span>
    `;

    const espace2 = document.createElement('div');
    espace2.className = 'espace-fiche';
    espace2.style.height = '1cm';

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'sous-titre';
    sousTitre.textContent = this.sousTitre;

    const espace3 = document.createElement('div');
    espace3.className = 'espace-fiche';
    espace3.style.height = '1cm';

    const listeWrap = document.createElement('div');
    listeWrap.id = 'ficheTableWrap';

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
      listeWrap
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
    this.listeWrap = listeWrap;
  }

  /** Une question par bloc, calquée sur la mise en page de l'export LaTeX :
   *  énoncé (numéro + question) sur sa ligne, puis les choix centrés sur la
   *  ligne suivante, chacun précédé d'une grande case à cocher vide
   *  (l'élève coche à la main, pas de correction imprimée). */
  _rendreListe(liste) {
    this.listeWrap.innerHTML = '';
    const conteneur = document.createElement('div');
    conteneur.className = 'fiche-qcm-liste';

    liste.forEach(item => {
      const bloc = document.createElement('div');
      bloc.className = 'fiche-qcm-bloc';

      const choixHtml = item.data.choix.map(c =>
        `<span class="fiche-qcm-choix"><span class="fiche-qcm-case"></span>${c}</span>`
      ).join('');

      // Décomposition et question sur la même ligne (comme en LaTeX) : on
      // remplace le <br> du texte source (utile pour l'affichage à l'écran
      // pendant le quiz, où la question est seule et plus large) par " . ".
      const enonce = String(item.data.question).replace(/<br\s*\/?>\s*/gi, ' . ');

      bloc.innerHTML = `
        <div class="fiche-qcm-enonce"><b>${item.index}.</b> ${enonce}</div>
        <div class="fiche-qcm-choixListe">${choixHtml}</div>
      `;
      conteneur.appendChild(bloc);
    });

    this.listeWrap.appendChild(conteneur);

    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.listeWrap]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.listeWrap]);
    } catch (e) { /* silencieux */ }
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    if (!this._lastQuestions) this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  _regenerer() {
    this._lastQuestions = this._genererSerie();
    this._rendreListe(this._lastQuestions);
  }

  /* ---------------- Export LaTeX ---------------- */

  _genererLatex() {
    const liste = this._lastQuestions || [];

    const blocsTex = liste.map(item => {
      const enonce = this._latexifierEnonce(item.data.question);
      const choixTex = item.data.choix
        .map(c => `\\caseChoix{${this._texEscape(String(c))}}`)
        .join(' \\qquad ');
      return `\\textbf{${item.index}.} ${enonce}\\\\[0.4cm]\n\\begin{center} ${choixTex}\\end{center}\n\n\\vspace{0.8cm}`;
    });

    return `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1cm,bottom=1cm,left=1.5cm,right=1.5cm]{geometry}
\\usepackage{amsmath}
\\usepackage{amssymb}
\\usepackage{tikz}
\\pagestyle{empty}

% Case + nombre dans UNE SEULE macro/picture : la case est positionnée à
% partir de l'ancre .west du noeud qui contient le nombre lui-même (pas
% d'une valeur de baseline devinée à l'oeil) — son centre vertical est donc
% TOUJOURS celui du nombre affiché à côté, quels que soient sa taille ou son
% nombre de chiffres. baseline=(nb.base) aligne ensuite tout le groupe sur
% la ligne de texte comme n'importe quel autre mot.
\\newcommand{\\caseChoix}[1]{%
  \\tikz[baseline=(nb.base)]{
    \\node (nb) {#1};
    \\node[draw, line width=0.9pt, minimum width=0.32cm, minimum height=0.32cm, anchor=east, xshift=-0.12cm] at (nb.west) {};
  }%
}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,${this.nbExercices}

\\vspace{1cm}

\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{1cm}

${blocsTex.join('\n\n')}
\\end{document}
`;
  }

  /** Les questions contiennent déjà du LaTeX inline (\\( ... \\)) et parfois
   *  un <br> : on garde le LaTeX tel quel et on remplace le <br> par
   *  " . " pour rester sur une seule ligne (le reste du texte HTML est
   *  simple, sans balises). */
  _latexifierEnonce(questionHtml) {
    return String(questionHtml).replace(/<br\s*\/?>\s*/gi, ' . ');
  }

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  _imprimer() {
    const dansIframe = (() => {
      try { return window.self !== window.top; } catch (e) { return true; }
    })();

    if (dansIframe) {
      this._afficherAvertissementImpression();
    }

    try {
      window.print();
    } catch (e) {
      this._afficherAvertissementImpression();
    }
  }

  _afficherAvertissementImpression() {
    if (this._avertissementImpression) return;
    const div = document.createElement('div');
    div.className = 'avertissement-impression';
    div.innerHTML = `
      ⚠️ L'impression est bloquée car cette page est intégrée dans un cadre restreint
      (par ex. Google Sites).
      <a href="${window.location.href}" target="_blank" rel="noopener">
        Ouvrir la fiche dans un nouvel onglet
      </a> pour pouvoir imprimer.
    `;
    this.overlay.querySelector('.fiche-actions')?.insertAdjacentElement('afterend', div);
    this._avertissementImpression = div;
  }

  _telechargerLatex() {
    if (!this._lastQuestions) this._regenerer();
    const tex = this._genererLatex();
    const blob = new Blob([tex], { type: 'application/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiche-exercices.tex';
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
        scrollbar-width:none;
        -ms-overflow-style:none;
        border-radius:12px;
        padding:28px 32px;
        box-shadow:0 20px 60px rgba(0,0,0,0.5);
      }
      #ficheCarte::-webkit-scrollbar{ display:none; }

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

      .avertissement-impression{
        margin:12px 0 0;
        padding:12px 14px;
        background:#fff3cd;
        border:1px solid #ffe69c;
        border-radius:8px;
        color:#664d03;
        font-size:13.5px;
        text-align:center;
        line-height:1.5;
      }
      .avertissement-impression a{
        display:inline-block;
        margin-left:6px;
        font-weight:700;
        color:#664d03;
        text-decoration:underline;
      }
      .avertissement-impression a:hover{ color:#000; }

      .espace-fiche{ height:10px; }

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

      .fiche-qcm-liste{
        display:flex;
        flex-direction:column;
        gap:0.8cm;
        margin-top:6px;
      }
      .fiche-qcm-bloc{
        break-inside:avoid;
      }
      .fiche-qcm-enonce{
        font-size:16px;
        margin-bottom:20px;
        text-align:left;
      }
      .fiche-qcm-choixListe{
        display:flex;
        flex-wrap:wrap;
        justify-content:center;
        gap:10px 40px;
      }
      .fiche-qcm-choix{
        display:inline-flex;
        align-items:center;
        gap:8px;
        font-size:16px;
        white-space:nowrap;
      }
      .fiche-qcm-case{
        display:inline-block;
        width:20px;
        height:20px;
        border:1.6px solid #333;
        border-radius:4px;
        flex:0 0 auto;
      }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: 1cm; }
        /* visibility:hidden ne retire PAS les éléments du flux : le reste de
           la page (header, #appBody avec le quiz/panneau latéral) gardait sa
           hauteur normale, invisible mais toujours comptée — d'où une 2e
           page blanche dès que ce contenu caché dépassait une page. On les
           sort complètement du flux avec display:none à la place. */
        body > *:not(#overlayFiche){ display:none !important; }
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
        #btnFermerFiche, .fiche-actions, .note-impression, .avertissement-impression{ display:none !important; }

        /* Réglé pour occuper la page en une seule fois, sans déborder sur
           une 2e page ni laisser un grand vide en bas (mesuré à ~850px de
           contenu pour ~1047px utiles sur une A4, marge de sécurité incluse
           pour l'écart de rendu entre navigateurs). */
        .espace-fiche{ height:16px; }
        #ficheCarte h2{ font-size:1.5em; }
        .fiche-qcm-liste{ gap:1cm; margin-top:2px; }
        .fiche-qcm-enonce{ margin-bottom:20px; font-size:16px; }
        .fiche-qcm-choix{ font-size:16px; }
        .fiche-qcm-choixListe{ gap:14px 40px; }
        .fiche-qcm-case{ width:20px; height:20px; }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FichePapier = FichePapier;
