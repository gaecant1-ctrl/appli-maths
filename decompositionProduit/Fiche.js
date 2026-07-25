/* ==============================================
   Fiche.js — overlay "Fiche papier" (LaTeX + PDF)
   ----------------------------------------------
   Génère une fiche imprimable de N exercices avec
   le même moteur que le quiz (EnonceProportionnalite),
   sans jamais toucher à la partie en cours.

   API publique :
     const fiche = new FichePapier({ EnonceClass, sharedOptions, nbExercices });
     fiche.installerBouton(conteneurDuBandeau);   // ajoute le bouton dans le bandeau
     fiche.ouvrir();                              // ouvre l'overlay
================================================== */

/* ==============================================
   RÉGLAGES DE MISE EN PAGE — seul endroit à éditer pour ajuster la fiche
   imprimée (HTML/PDF ET export LaTeX partagent ces mêmes valeurs, plutôt
   que d'avoir des cm/px éparpillés et recalculés à la main à chaque fois).

   Le principe qui garantit "une seule page" : on ne fixe JAMAIS une hauteur
   de ligne en dur. On calcule plutôt la hauteur disponible sur la page
   (hauteur de page − marges − en-tête réservé) et on la DIVISE par le
   nombre de lignes du tableau. Que ça reste 10 exercices ou qu'on en mette
   14 demain, ça continue de tenir sur une page — la valeur s'adapte, elle
   n'est plus à retrouver/recalculer.
================================================== */
const FICHE_LAYOUT = {
  nbColonnes: 2,
  margePageCm: 0.8,        // doit correspondre à @page{margin} (CSS) ET geometry (LaTeX)
  hauteurPageCm: 29.7,      // hauteur d'une page A4
  hauteurEnTeteCm: 5.4,     // espace réservé pour identité + titre + sous-titre, AU-DESSUS de la grille
  largeurCelluleCm: 8.3,    // largeur d'une cellule pour l'export LaTeX (2 colonnes + marges de page)
  paddingHautCelluleCm: 0.25, // espace entre le haut de la cellule (LaTeX) et le texte — équivalent du padding CSS
};

class FichePapier {
  /**
   * @param {Object} opts
   * @param {Function} opts.EnonceClass      - classe Enonce à instancier (ex: EnonceProportionnalite)
   * @param {Object}   [opts.sharedOptions]  - options partagées passées à l'Enonce (sans affichageAvecLettre)
   * @param {number}   [opts.nbExercices=10]
   * @param {string}   [opts.titre]
   * @param {string}   [opts.sousTitre]
   */
  constructor(opts = {}) {
    this.EnonceClass = opts.EnonceClass;
    if (typeof this.EnonceClass !== 'function') {
      throw new Error("FichePapier: 'EnonceClass' est requis (ex: EnonceProportionnalite).");
    }
    this.sharedOptionsBase = opts.sharedOptions || {};
    this.nbExercices = Math.max(1, Number(opts.nbExercices || 10));
    this.titre = opts.titre || "Le compte est juste";
    this.sousTitre = opts.sousTitre || ``;
    this.nbLignes = Math.ceil(this.nbExercices / FICHE_LAYOUT.nbColonnes);

    this.overlay = null;
    this.tableWrap = null;
    this._lastVariants = null; // [{sit, quest, question, expr}] de la série courante
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

  /**
   * Une entrée par exercice : lettre (A, B, C… cycle via _letterByIndex) et
   * expression rendue en LaTeX — format compact "A = expr" affiché en
   * grille, sans énoncé long ni numéro (voir _rendreTableau). Le patron
   * "Complexe" affiche un produit/une somme (pas juste un nombre), d'où le
   * rendu LaTeX plutôt qu'un simple nombre brut.
   */
  _genererSerie(seed) {
    const liste = [];
    for (let i = 1; i <= this.nbExercices; i++) {
      const opts = {
        seed: `${seed}-q${i}`,
        sharedOptions: { ...this.sharedOptionsBase }
      };
      const enonce = new this.EnonceClass(opts);
      const variant = enonce.genVariant(i);
      const lettre = enonce._letterByIndex(i);

      let latex = String(variant.exprStr);
      try {
        const obj = new ObjetString(variant.exprStr, {});
        latex = obj.arbre.toLatex({});
      } catch (e) { /* repli : texte brut si le rendu LaTeX échoue */ }

      // toLatex() écrit le "×" en unicode brut (OK pour MathJax en HTML, mais
      // pdflatex + inputenc utf8 ne le compile pas sans package dédié) : on le
      // remplace par la commande \times, valide dans les deux usages (écran
      // ET export .tex).
      latex = latex.replace(/×/g, '\\times ');

      liste.push({ index: i, lettre, latex });
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
      <span>Note : <span class="trait court"></span> / 20</span>
    `;

    const espace2 = document.createElement('div');
    espace2.className = 'espace-fiche';
    espace2.style.height = '0.8cm'; // espace après "Nom et prénom / Note"

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'sous-titre';
    sousTitre.textContent = this.sousTitre;

    const espace3 = document.createElement('div');
    espace3.className = 'espace-fiche';
    espace3.style.height = '0.8cm'; // espace après le titre

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
    this.tableWrap = tableWrap;
  }

  /** Grille CSS (FICHE_LAYOUT.nbColonnes colonnes) : "lettre = expr  par b"
   *  suivi de vide pour la réécriture de l'élève — pas de numéro, pas de
   *  colonne "Réponse" séparée.
   *  Une grille CSS (pas un <table>) : en impression, sa hauteur totale et
   *  ses lignes en 1fr (voir _installerCSS) se partagent MÉCANIQUEMENT la
   *  hauteur de page disponible — donc toujours calé et sur une page,
   *  sans dépendre d'un min-height deviné à la main. */
  _rendreTableau(liste) {
    this.tableWrap.innerHTML = '';
    const grille = document.createElement('div');
    grille.className = 'fiche-grille';
    grille.style.setProperty('--fiche-nb-colonnes', FICHE_LAYOUT.nbColonnes);
    grille.style.setProperty('--fiche-nb-lignes', this.nbLignes);

    liste.forEach(item => {
      const cellule = document.createElement('div');
      cellule.className = 'fiche-cellule';
      // Toute la ligne en UNE seule expression MathJax (lettre, "=", expression) —
      // pas de mélange police HTML / police MathJax en plein milieu de la
      // ligne (qui donnait un rendu disparate).
      cellule.innerHTML = `
        <div class="fiche-enonce">$${item.lettre} = ${item.latex}$</div>
        <div class="fiche-espace-reponse"></div>
      `;
      grille.appendChild(cellule);
    });

    this.tableWrap.appendChild(grille);

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
    this._lastVariants = this._genererSerie(this._seedActuel);
    this._rendreTableau(this._lastVariants);
  }

  /* ---------------- Export LaTeX ---------------- */

  _genererLatex() {
    const liste = this._lastVariants || [];
    const { nbColonnes, largeurCelluleCm, hauteurEnTeteCm, margePageCm, paddingHautCelluleCm } = FICHE_LAYOUT;

    // Chaque cellule appelle juste \celluleFiche{...} : la mise en forme
    // (hauteur fixe, alignement en haut, padding) est définie UNE SEULE FOIS
    // dans le préambule (macro \celluleFiche ci-dessous), pas répétée à
    // chaque appel.
    const celluleTex = (item) => item
      ? `\\celluleFiche{${item.lettre} = $${item.latex}$}`
      : '\\celluleFiche{}';

    const lignesTex = [];
    for (let i = 0; i < liste.length; i += nbColonnes) {
      const cellules = [];
      for (let c = 0; c < nbColonnes; c++) cellules.push(celluleTex(liste[i + c]));
      lignesTex.push(`${cellules.join(' & ')} \\\\ \\hline`);
    }

    const colonnesTex = Array(nbColonnes).fill('p{\\largeurCelluleFiche}').join('|');

    return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=${margePageCm}cm,bottom=${margePageCm}cm,left=1cm,right=1cm]{geometry}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{longtable}
\\usepackage{ragged2e}
\\renewcommand{\\arraystretch}{1}
\\pagestyle{empty}

% ===== Dimensions de la grille (voir FICHE_LAYOUT dans Fiche.js) =====
\\newlength{\\largeurCelluleFiche}
\\setlength{\\largeurCelluleFiche}{${largeurCelluleCm}cm}
\\newlength{\\padHautCelluleFiche}
\\setlength{\\padHautCelluleFiche}{${paddingHautCelluleCm}cm}
% Hauteur de cellule calculée à partir de la hauteur RÉELLE de page
% (\\textheight), moins l'en-tête réservé, divisée par le nombre de lignes :
% la fiche tient sur une page quel que soit le nombre d'exercices, sans
% valeur cm à retrouver/recalculer à la main à chaque changement de mise en
% page.
\\newlength{\\hauteurEnTeteFiche}
\\setlength{\\hauteurEnTeteFiche}{${hauteurEnTeteCm}cm}
\\newlength{\\hauteurCelluleFiche}
\\setlength{\\hauteurCelluleFiche}{\\dimexpr(\\textheight-\\hauteurEnTeteFiche)/${this.nbLignes}\\relax}

% ===== Cellule d'exercice : hauteur fixe, contenu ancré en haut, avec un
% espace (\\padHautCelluleFiche) entre le bord de la cellule et le texte.
% \\vspace* (et non \\vspace) : la version étoilée seule survit en tout début
% de boîte — TeX supprime silencieusement la colle verticale ordinaire
% placée en tête d'un vbox/parbox (piège classique). =====
\\newcommand{\\celluleFiche}[1]{%
  \\parbox[t][\\hauteurCelluleFiche][t]{\\largeurCelluleFiche}{%
    \\vspace*{\\padHautCelluleFiche}#1%
  }%
}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,20

\\vspace{0.8cm}

\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{0.8cm}

\\begin{longtable}{|${colonnesTex}|}
\\hline
${lignesTex.join('\n')}
\\end{longtable}

\\end{document}
`;
  }

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  _imprimer() {
    // Sur certaines plateformes (ex: Google Sites), la page est chargée dans une
    // iframe sandboxée sans 'allow-modals' : window.print() est alors silencieusement
    // ignoré par le navigateur (aucune erreur JS, juste un warning console), donc rien
    // ne se passe visuellement. On détecte ce cas et on propose une issue de secours :
    // ouvrir la page actuelle dans un nouvel onglet, hors du sandbox, où print() fonctionne.
    const dansIframe = (() => {
      try { return window.self !== window.top; } catch (e) { return true; } // cross-origin => on suppose iframe
    })();

    if (dansIframe) {
      this._afficherAvertissementImpression();
    }

    // On tente quand même l'appel : si le sandbox autorise les modales, ça marchera.
    try {
      window.print();
    } catch (e) {
      this._afficherAvertissementImpression();
    }
  }

  _afficherAvertissementImpression() {
    if (this._avertissementImpression) return; // déjà affiché, pas de doublon
    const div = document.createElement('div');
    div.className = 'avertissement-impression';
    div.innerHTML = `
      ⚠️ L'impression est bloquée car cette page est intégrée dans un cadre restreint
      (par ex. Google Sites).
      <a href="${window.location.href}" target="_blank" rel="noopener">
        Ouvrir la fiche dans un nouvel onglet
      </a> pour pouvoir imprimer.
    `;
    // On insère juste après le bandeau d'actions pour rester visible.
    this.overlay.querySelector('.fiche-actions')?.insertAdjacentElement('afterend', div);
    this._avertissementImpression = div;
  }


  _telechargerLatex() {
    if (!this._lastVariants) this._regenerer();
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

    // Hauteur totale de la grille EN IMPRESSION : hauteur de page moins les
    // deux marges (@page) moins l'en-tête réservé. Ses lignes sont en 1fr
    // (voir .fiche-grille ci-dessous) donc se partagent CETTE hauteur à
    // parts égales — la fiche tient sur une page par construction, pas par
    // un min-height deviné.
    const hauteurGrilleImpressionCm =
      FICHE_LAYOUT.hauteurPageCm - 2 * FICHE_LAYOUT.margePageCm - FICHE_LAYOUT.hauteurEnTeteCm;

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

      /* La carte elle-même est bornée (max-height) et scrolle EN INTERNE
         (scrollbar cachée) : le bouton "Fermer"/actions restent tout en haut
         de la carte donc toujours visibles, jamais coupés par le centrage de
         l'overlay — pas besoin d'y toucher (voir calculPrioritaire/Fiche.js,
         qui utilise déjà ce schéma). */
      #ficheCarte{
        position:relative;
        background:#fff;
        color:#111;
        max-width:900px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        scrollbar-width:none;      /* Firefox : scroll toujours possible, barre invisible */
        -ms-overflow-style:none;   /* Edge/IE historique, idem */
        border-radius:12px;
        padding:28px 32px;
        box-shadow:0 20px 60px rgba(0,0,0,0.5);
      }
      #ficheCarte::-webkit-scrollbar{ display:none; } /* Chrome/Safari/Edge Chromium */

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

      /* Grille : gap+background simule des lignes "collapse" (pas de bordure
         double aux jonctions, contrairement à un <table> classique). */
      /* Bordures en "vraies" bordures CSS (pas gap+background) : un fond de
         grille imite le quadrillage à l'écran mais la plupart des
         navigateurs suppriment les fonds/couleurs à l'impression par défaut
         (case "graphiques d'arrière-plan" décochée) — la grille imprimée
         perdait alors tout son quadrillage. border-top/left sur le
         conteneur + border-right/bottom sur chaque cellule = quadrillage
         complet sans double-épaisseur aux jonctions, et ça imprime toujours. */
      .fiche-grille{
        display:grid;
        grid-template-columns: repeat(var(--fiche-nb-colonnes), 1fr);
        grid-auto-rows: minmax(150px, auto);  /* écran : hauteur confortable, on scrolle si besoin */
        border-top:1px solid #ccc;
        border-left:1px solid #ccc;
        margin-top:6px;
      }
      .fiche-cellule{
        background:#fff;
        padding:6px 10px;
        display:flex;
        flex-direction:column;
        border-right:1px solid #ccc;
        border-bottom:1px solid #ccc;
      }
      .fiche-enonce{
        font-size:15px;
        font-weight:600;
        flex:0 0 auto;
      }
      .fiche-espace-reponse{
        flex:1 1 auto;
      }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: ${FICHE_LAYOUT.margePageCm}cm; }
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

        /* Hauteur calculée (voir hauteurGrilleImpressionCm ci-dessus) + lignes
           en 1fr : la grille se cale EXACTEMENT sur la place restante de la
           page, donc une seule page, quel que soit le nombre de lignes. */
        .fiche-grille{
          height:${hauteurGrilleImpressionCm}cm;
          grid-template-rows: repeat(var(--fiche-nb-lignes), 1fr);
        }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FichePapier = FichePapier;
