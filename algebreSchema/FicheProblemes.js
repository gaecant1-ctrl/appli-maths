/* ==============================================
   FicheProblemes.js — overlay "Fiche papier" pour l'appli Problèmes &
   schémas en barres. Même pattern que algebreSimple/Fiche.js : un
   overlay imprimable, une série d'exercices dont le premier reprend
   celui actuellement affiché dans l'atelier. Chaque exercice réutilise
   directement rendreSchema() (app.js) pour dessiner le schéma en barres
   — pas de second moteur de rendu à maintenir.
   L'export LaTeX (il faudrait du TikZ pour les barres) n'est pas encore
   fait — étape suivante, une fois cet overlay imprimable validé.
================================================== */

class FicheProblemes {
  constructor(opts = {}) {
    this.nbExercices = opts.nbExercices || 4;
    this.titre = opts.titre || "Fiche d'exercices — Problèmes & schémas en barres";
    this.sousTitre = opts.sousTitre || 'Trouve x dans chaque cas.';

    this.overlay = null;
    this.grilleWrap = null;
    this._derniereSerie = null;

    this._installerCSS();
    this._construireOverlay();
  }

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

  /** Respecte exactement les réglages courants de l'atelier (voir
   *  demarrerQuestion, app.js) : Taille, Complexité (plusieurs cochées à
   *  la fois possibles), et surtout Forme/Contexte — s'ils sont figés
   *  (Suivant, pas Aléatoire), la fiche reprend la MÊME forme/contexte
   *  pour tous les exercices (juste avec des nombres différents), au
   *  lieu d'un tirage totalement indépendant. */
  _genererProblemesAleatoires(combien) {
    const taille = (typeof tailleActuelle === 'string') ? tailleActuelle : 'moyen';
    const niveau = (typeof NIVEAUX_SCHEMA !== 'undefined')
      ? (NIVEAUX_SCHEMA[taille] || NIVEAUX_SCHEMA.moyen)
      : { min: 5, max: 60 };
    const complexites = (typeof complexitesActuelles !== 'undefined' && complexitesActuelles.size)
      ? complexitesActuelles
      : new Set(['facile']);

    const liste = [];
    for (let i = 0; i < combien; i++) {
      let forme = (typeof formeActuelle !== 'undefined') ? formeActuelle : null;
      if (typeof formeAleatoireActif === 'undefined' || formeAleatoireActif || !forme) {
        forme = choisirAleatoire(formesPourComplexites(complexites));
      }
      const naturesValides = naturesPourForme(forme);
      let nature = (typeof natureActuelle !== 'undefined') ? natureActuelle : null;
      if (typeof natureAleatoireActif === 'undefined' || natureAleatoireActif || !naturesValides.includes(nature)) {
        nature = choisirAleatoire(naturesValides);
      }
      liste.push(genererProblemeDepuis(forme, nature, niveau));
    }
    return liste;
  }

  /** Série utilisée à l'OUVERTURE de la fiche : le premier exercice
   *  reprend le problème actuellement affiché dans l'atelier, s'il y en
   *  a un. Les suivants sont tirés au hasard. */
  _genererSerieDepuisAtelier() {
    const problemes = [];
    if (typeof problemeActuel !== 'undefined' && problemeActuel) problemes.push(problemeActuel);
    problemes.push(...this._genererProblemesAleatoires(this.nbExercices - problemes.length));
    return problemes.map((probleme, i) => ({ index: i + 1, probleme }));
  }

  /** "Régénérer une nouvelle série" : tout est retiré au hasard, y
   *  compris le premier exercice. */
  _genererSerieComplete() {
    return this._genererProblemesAleatoires(this.nbExercices).map((probleme, i) => ({ index: i + 1, probleme }));
  }

  _construireOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlayFicheProblemes';

    const carte = document.createElement('div');
    carte.id = 'ficheProblemesCarte';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerFicheProblemes';
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

    const btnRegen = document.createElement('button');
    btnRegen.type = 'button';
    btnRegen.textContent = '🔀 Régénérer une nouvelle série';
    btnRegen.addEventListener('click', () => this._regenerer());

    const btnTex = document.createElement('button');
    btnTex.type = 'button';
    btnTex.textContent = '⬇️ Télécharger le LaTeX';
    btnTex.addEventListener('click', () => this._telechargerLatex());

    actions.append(btnImprimer, btnRegen, btnTex);

    const note = document.createElement('p');
    note.className = 'note-impression';
    note.innerHTML = "💡 Dans la fenêtre d'impression, pense à décocher <strong>« En-têtes et pieds de page »</strong> pour un rendu propre.";

    const identite = document.createElement('div');
    identite.className = 'ligne-identite';
    identite.innerHTML = `
      <span>Nom et prénom : <span class="trait"></span></span>
      <span>Note : <span class="trait court"></span> / <span class="trait court"></span></span>
    `;

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'sous-titre';
    sousTitre.textContent = this.sousTitre;

    const grilleWrap = document.createElement('div');
    grilleWrap.id = 'ficheProblemesGrilleWrap';

    carte.append(btnFermer, actions, note, identite, h2, grilleWrap);
    overlay.appendChild(carte);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.fermer(); });
    this._onKeydown = (e) => { if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer(); };
    document.addEventListener('keydown', this._onKeydown);

    this.overlay = overlay;
    this.grilleWrap = grilleWrap;
  }

  /** Un exercice : à gauche (moitié de la largeur) l'énoncé puis le
   *  schéma en barres (rendreSchema, réutilisé tel quel) puis la
   *  consigne ; à droite (l'autre moitié) l'espace blanc où l'élève
   *  écrit sa résolution. */
  _construireExercice(probleme) {
    const exo = document.createElement('div');
    exo.className = 'fiche-exercice';

    const titre = document.createElement('div');
    titre.className = 'exo-titre';
    titre.textContent = 'Exercice : Problème';
    exo.appendChild(titre);

    const corps = document.createElement('div');
    corps.className = 'exo-corps';

    const gauche = document.createElement('div');
    gauche.className = 'exo-gauche';

    // La fiche respecte les mêmes réglages d'affichage que l'atelier
    // (boutons "Énoncé"/"Diagramme") : si l'élève/le professeur a
    // désactivé l'un des deux, on ne l'imprime pas non plus — la place
    // reste simplement vide, on ne la comble pas avec autre chose.
    if (typeof afficherEnonce === 'undefined' || afficherEnonce) {
      const enonce = document.createElement('div');
      enonce.className = 'exo-enonce';
      enonce.textContent = `${probleme.enonce} On note x ${probleme.xDescription}.`;
      gauche.appendChild(enonce);
    }

    if (typeof afficherDiagramme === 'undefined' || afficherDiagramme) {
      const schemaWrap = document.createElement('div');
      schemaWrap.className = 'exo-schema';
      schemaWrap.appendChild(rendreSchema(probleme));
      gauche.appendChild(schemaWrap);
    }

    const droite = document.createElement('div');
    droite.className = 'exo-droite';

    const consigne = document.createElement('div');
    consigne.className = 'exo-consigne';
    consigne.textContent = "Écris l'expression qui donne x, puis calcule sa valeur.";
    droite.appendChild(consigne);

    corps.append(gauche, droite);
    exo.appendChild(corps);

    return exo;
  }

  _rendreGrille(liste) {
    this.grilleWrap.innerHTML = '';
    const grille = document.createElement('div');
    grille.className = 'fiche-grille';

    liste.forEach(item => {
      grille.appendChild(this._construireExercice(item.probleme));
    });

    this.grilleWrap.appendChild(grille);
    typesetMathJax([this.grilleWrap]);
  }

  ouvrir() {
    // Toujours resynchroniser à l'ouverture : le premier exercice doit
    // refléter le problème actuellement affiché dans l'atelier À CET
    // INSTANT (il a pu changer depuis la dernière ouverture de la fiche).
    this._derniereSerie = this._genererSerieDepuisAtelier();
    this._rendreGrille(this._derniereSerie);
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  _regenerer() {
    this._derniereSerie = this._genererSerieComplete();
    this._rendreGrille(this._derniereSerie);
  }

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  /** Couleur TikZ (définie dans le préambule, voir _genererLatex) pour un
   *  hex de segment donné — les mêmes 4 constantes que le schéma HTML
   *  (COULEUR_ROUGE/BLEU/VERT/JAUNE, ProblemeSchema.js). Pas de couleur
   *  reconnue -> blanc, comme le fond neutre de la barre "total". */
  _couleurTex(hex) {
    const table = {
      [COULEUR_ROUGE]: 'segRouge',
      [COULEUR_BLEU]: 'segBleu',
      [COULEUR_VERT]: 'segVert',
      [COULEUR_JAUNE]: 'segJaune',
    };
    return table[hex] || 'white';
  }

  /** Dessine le schéma en barres d'un problème en TikZ : des cases
   *  ÉGALES pour les "parts" (même principe que le CSS flex:1 1 0), une
   *  barre pleine largeur pour le total. Un "..." affiche juste son
   *  compte au-dessus (pas de flèche double — simplification volontaire
   *  par rapport au rendu HTML, pour un premier passage). */
  _schemaTikz(probleme) {
    const { total, parts } = probleme.schema;
    const largeur = 8; // cm, arbitraire mais cohérent d'un exercice à l'autre
    const hauteur = 0.9;
    const n = parts.length;
    const w = largeur / n;

    const lignes = ['\\begin{tikzpicture}[y=1cm,x=1cm]'];
    parts.forEach((seg, i) => {
      const x0 = (i * w).toFixed(2);
      const x1 = ((i + 1) * w).toFixed(2);
      lignes.push(`  \\draw[fill=${this._couleurTex(seg.couleur)}] (${x0},1) rectangle (${x1},${(1 + hauteur).toFixed(2)});`);
      lignes.push(`  \\node at (${((i + 0.5) * w).toFixed(2)},${(1 + hauteur / 2).toFixed(2)}) {$${seg.toLatex()}$};`);
    });
    lignes.push(`  \\draw[fill=white] (0,0) rectangle (${largeur.toFixed(2)},${hauteur.toFixed(2)});`);
    lignes.push(`  \\node at (${(largeur / 2).toFixed(2)},${(hauteur / 2).toFixed(2)}) {$${total.toLatex()}$};`);

    const indexEllipsis = parts.findIndex(p => p.ellipsis);
    if (indexEllipsis !== -1) {
      const couleurGroupe = parts[indexEllipsis].couleur;
      let tailleGroupe = 0;
      while (tailleGroupe < parts.length && parts[tailleGroupe].couleur === couleurGroupe) tailleGroupe++;
      lignes.push(`  \\node at (${((tailleGroupe * w) / 2).toFixed(2)},${(1 + hauteur + 0.3).toFixed(2)}) {\\scriptsize $\\times ${parts[indexEllipsis].compteLatex()}$};`);
    }

    lignes.push('\\end{tikzpicture}');
    return lignes.join('\n');
  }

  /**
   * Génère un document LaTeX complet — même structure que
   * algebreSimple/Fiche.js (\fexo{numéro}{titre}{corps} dans un \fbox non
   * indenté), mais le schéma en barres se dessine en TikZ (_schemaTikz)
   * au lieu d'une illustration emoji : ici les segments ont des largeurs
   * ÉGALES (comme le CSS), pas proportionnelles aux valeurs. Respecte les
   * mêmes réglages d'affichage (afficherEnonce/afficherDiagramme) que la
   * fiche imprimée — une partie désactivée n'apparaît pas dans le .tex
   * non plus.
   */
  _genererLatex() {
    const liste = this._derniereSerie || [];

    // Mise en page deux colonnes via tabular : gauche pour énoncé+schéma,
    // droite pour résolution de l'élève.
    const largeurGauche = '9cm';
    const largeurDroite = '8cm';

    const exosTex = liste.map((item, i) => {
      const p = item.probleme;
      const morceaux = [];
      if (typeof afficherEnonce === 'undefined' || afficherEnonce) {
        const enonceTex = `${p.enonce} On note $x$ ${p.xDescription}.`.replace(/\\\(/g, '$').replace(/\\\)/g, '$');
        morceaux.push(enonceTex);
      }
      if (typeof afficherDiagramme === 'undefined' || afficherDiagramme) {
        morceaux.push(this._schemaTikz(p));
      }
      const gauche = `\\begin{minipage}{${largeurGauche}}\n${morceaux.join('\\\\[0.4em]\n')}\n\\end{minipage}`;
      const droite = `\\begin{minipage}{${largeurDroite}}\nÉcris l'expression qui donne $x$, puis calcule sa valeur.\\\\[0.4em]\n\\vspace*{3cm}\n\\end{minipage}`;
      const corps = `\\begin{tabular}{c|c}\n${gauche}&\n${droite}\n\\end{tabular}`;
      return `\\fexo{${i + 1}}{Problème}{\n${corps}\n}`;
    }).join('\n\n\\vspace{0.5cm}\n\n');

    const lignes = [
      '% !TeX program = lualatex',
      '\\documentclass[a4paper,11pt]{article}',
      '\\usepackage[margin=15mm]{geometry}',
      '\\usepackage{fontspec}',
      '\\usepackage{amsmath}',
      '\\usepackage{tikz}',
      '\\usepackage{xcolor}',
      '',
      '\\definecolor{segRouge}{HTML}{f6d9d5}',
      '\\definecolor{segBleu}{HTML}{d7e6f2}',
      '\\definecolor{segVert}{HTML}{d7f0e1}',
      '\\definecolor{segJaune}{HTML}{faf0c2}',
      '',
      '% \\fexo{numéro}{titre}{corps} : encadré d\'exercice numéroté. \\noindent',
      '% est indispensable : sans lui, les exercices après le premier',
      '% démarrent avec une marge de gauche en trop.',
      '\\newcommand{\\fexo}[3]{',
      '\t\\noindent\\fbox{',
      '\t\t\\begin{minipage}{\\textwidth}',
      '\t\t\t\\vspace*{0.3cm}',
      '\t\t\t\\textbf{Exercice #1 : #2}\\\\[0.4em]',
      '\t\t\t#3',
      '  \\end{minipage}',
      '}',
      '\t\t\t',
      '}',
      '',
      '\\begin{document}',
      '\\pagestyle{empty}',
      '\\noindent',
      'Nom et prénom : \\underline{\\hspace{6cm}} \\hfill Note : \\underline{\\hspace{1cm}} / \\underline{\\hspace{1cm}}',
            '',
      `\\section*{${this._texEscape(this.titre)}}`,
      '\\vspace*{0.5cm}',
      '',
      '',
      exosTex,
      '',
      '\\end{document}',
      '',
    ];

    return lignes.join('\n');
  }

  _telechargerLatex() {
    if (!this._derniereSerie) this._regenerer();
    const tex = this._genererLatex();
    const blob = new Blob([tex], { type: 'application/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiche-problemes.tex';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  _installerCSS() {
    if (document.getElementById('fiche-problemes-css')) return;
    const style = document.createElement('style');
    style.id = 'fiche-problemes-css';
    style.textContent = `
      #overlayFicheProblemes{
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
      #overlayFicheProblemes.visible{ display:flex; }

      #ficheProblemesCarte{
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

      #btnFermerFicheProblemes{
        position:absolute;
        top:10px; right:14px;
        background:none;
        border:none;
        font-size:24px;
        line-height:1;
        cursor:pointer;
        color:var(--encre-douce, #555);
      }
      #btnFermerFicheProblemes:hover{ color:var(--erreur, #c44336); }

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
        margin-top: 20px;

      }
      .trait{
        display:inline-block;
        min-width:220px;
        border-bottom:1px solid var(--grille-forte, #444);
        margin-left:6px;
      }
      .trait.court{ min-width:70px; }

      #ficheProblemesCarte h2{
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
        display:flex;
        flex-direction:column;
        gap: 22px;
        margin-top: 40px;
      }

      .fiche-exercice{
        border: 1px solid var(--grille-forte, #2c2226);
        border-radius: 4px;
        padding: 14px 18px;
      }

      .exo-titre{
        font-weight: 700;
        margin-bottom: 20px;
      }

      .exo-corps{
        display:flex;
        gap: 24px;
        align-items:flex-start;
      }

      /* Moitié/moitié : schéma (avec son énoncé) à gauche, espace de
         résolution de l'élève à droite. */
      .exo-gauche{
        flex: 0 0 50%;
        max-width: 50%;
      }
      .exo-droite{
        flex: 1 1 auto;
        min-height: 220px;
        border-left: 1px dashed var(--grille, #ccc);
        padding-left: 24px;
      }

      .exo-enonce{
        font-size: 14px;
        margin-bottom: 12px;
        line-height: 1.5;
      }

      .exo-schema{ margin-bottom: 12px; }
      .exo-schema .schema-carte{ margin-bottom: 0; max-height: 90%; }

      .exo-consigne{
        font-size: 14px;
        margin-bottom: 10px;
      }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: 0.8cm; size: A4; }
        body *{ visibility:hidden; }
        #overlayFicheProblemes, #overlayFicheProblemes *{ visibility:visible; }
        #overlayFicheProblemes{
          position:absolute;
          inset:0;
          background:#fff;
          padding:0;
          display:flex !important;
          align-items:flex-start;
          justify-content:flex-start;
        }
        #ficheProblemesCarte{
          box-shadow:none;
          max-height:none;
          max-width:none;
          width:100%;
          border-radius:0;
          padding:0.5cm;
          overflow: visible;
        }
        #btnFermerFicheProblemes, .fiche-actions, .note-impression{ display:none !important; }
        .fiche-exercice{ break-inside: avoid; }

        /* Rationalise l'espace pour que les 4 exercices tiennent sur une
           page A4 : les marges/hauteurs pensées pour l'écran (h2, espace
           de résolution, barres du schéma...) sont bien plus généreuses
           que nécessaire à l'impression. */
        #ficheProblemesCarte h2{ margin-top: 20px; font-size: 1.15em; }
        .sous-titre{ margin: 4px 0 0; }
        .ligne-identite{ margin-top: 20px;margin-bottom: 20px; font-size: 13px; }
        .fiche-grille{ margin-top: 12px; gap: 8px; }
        .fiche-exercice{ padding: 8px 12px; }
        .exo-titre{ margin-bottom: 10px; font-size: 0.95em; }
        .exo-corps{ gap: 16px; }
        .exo-enonce{ font-size: 11px; margin-bottom: 15px; }
        .exo-consigne{ font-size: 11px; margin-bottom: 15px; }
        .exo-droite{ min-height: 110px; padding-left: 16px; }

        #overlayFicheProblemes .exo-schema{ margin-bottom: 6px; }
        #overlayFicheProblemes .exo-schema .schema-carte{
          padding: 6px 10px 6px;
          margin-bottom: 0;
          border-width: 1px;
        }
        #overlayFicheProblemes .schema-carte-label{ font-size: 9px; margin-bottom: 3px; }
        #overlayFicheProblemes .schema-parts,
        #overlayFicheProblemes .schema-total{ height: 26px; margin-bottom: 3px; }
        #overlayFicheProblemes .schema-parts .schema-segment,
        #overlayFicheProblemes .schema-total .schema-segment{ font-size: 11px; }
        #overlayFicheProblemes .schema-repet-badge{ font-size: 10px; margin-bottom: 1px; }
        #overlayFicheProblemes .schema-repet-fleche{ height: 6px; margin-bottom: 1px; }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FicheProblemes = FicheProblemes;
