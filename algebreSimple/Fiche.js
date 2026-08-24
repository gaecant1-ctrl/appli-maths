/* ==============================================
   Fiche.js — overlay "Fiche papier" pour l'appli Algèbre (deux pesées).
   Reprend la mise en page du gabarit LaTeX de référence (\peseeExo) :
   par exercice, un encadré "Exercice : Algèbre" avec, sur la gauche, la
   note d'énoncé + un tableau à deux colonnes (une par pesée, ligne
   "Illustration" puis ligne "Masse"), la consigne "Calculer a et/ou b.",
   et sur la droite un grand espace blanc pour la résolution — un exercice
   par ligne, pleine largeur, comme dans le .tex (pas une grille compacte).
================================================== */

class FichePapier {
  constructor(opts = {}) {
    this.nbExercices = opts.nbExercices || 3;
    this.titre = opts.titre || "Fiche d'exercices — Algèbre : deux pesées";
    this.sousTitre = opts.sousTitre || "Calculer a et b dans chaque cas.";

    this.overlay = null;
    this.grilleWrap = null;
    this._derniereSerie = null;
    this._themeId = 'masse'; // thème figé au moment de la génération (voir _genererPeseesAleatoires) : la fiche affichée/exportée reste cohérente même si l'atelier change de thème ensuite.

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

  _genererPeseesAleatoires(combien) {
    const niveau = (typeof niveauActuel === 'string') ? niveauActuel : 'moyen';
    this._themeId = (typeof themeActuel === 'string') ? themeActuel : 'masse';
    const banque = THEMES[this._themeId].banque;
    const liste = [];
    for (let i = 0; i < combien; i++) liste.push(genererPesee(niveau, banque));
    return liste;
  }

  /**
   * Série utilisée à l'OUVERTURE de la fiche : le premier exercice reprend
   * la pesée actuellement affichée dans l'atelier, s'il y en a une —
   * essentiel pour une pesée personnalisée (le professeur veut la retrouver
   * sur la fiche imprimée), mais vaut aussi pour une pesée aléatoire en
   * cours. Les suivants sont tirés au hasard.
   */
  _genererSerieDepuisAtelier() {
    const pesees = [];
    if (typeof peseeActuelle !== 'undefined' && peseeActuelle) pesees.push(peseeActuelle);
    pesees.push(...this._genererPeseesAleatoires(this.nbExercices - pesees.length));
    return pesees.map((pesee, i) => ({ index: i + 1, pesee }));
  }

  /** Série utilisée par "Régénérer une nouvelle série" : tout est retiré au
   *  hasard, y compris le premier exercice (on ne garde plus la pesée de
   *  l'atelier une fois que l'élève a explicitement demandé à tout changer). */
  _genererSerieComplete() {
    return this._genererPeseesAleatoires(this.nbExercices).map((pesee, i) => ({ index: i + 1, pesee }));
  }

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
    grilleWrap.id = 'ficheGrilleWrap';

    carte.append(btnFermer, actions, note, identite, h2, sousTitre, grilleWrap);
    overlay.appendChild(carte);
    document.body.appendChild(overlay);

    overlay.addEventListener('click', (e) => { if (e.target === overlay) this.fermer(); });
    this._onKeydown = (e) => { if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer(); };
    document.addEventListener('keydown', this._onKeydown);

    this.overlay = overlay;
    this.grilleWrap = grilleWrap;
  }

  /** Construit un exercice, calqué sur \peseeExo : fbox > (note d'énoncé +
   *  tableau Illustration/Masse + consigne) à gauche, espace blanc à droite. */
  _construireExercice(pesee) {
    const { fruitA, fruitB, n1a, n1b, mass1, n2a, n2b, mass2 } = pesee;
    const t = THEMES[this._themeId] || THEMES.masse;
    const uniteDict = t.unite ? { g: 1 } : {};
    const afficherValeur = (n) => new Grandeur(new Nombre(String(n)), uniteDict).toString() + t.suffixeAffichage;

    const exo = document.createElement('div');
    exo.className = 'fiche-exercice';

    const titre = document.createElement('div');
    titre.className = 'exo-titre';
    titre.textContent = 'Exercice : Algèbre';
    exo.appendChild(titre);

    const corps = document.createElement('div');
    corps.className = 'exo-corps';

    const gauche = document.createElement('div');
    gauche.className = 'exo-gauche';

    const intro = document.createElement('div');
    intro.className = 'exo-intro';
    intro.innerHTML = `On note <b>${colorerLettres('a')}</b> ${t.libelleTotalMin === 'masse' ? 'la masse' : 'le score'} d'${t.article === 'une' ? 'une' : 'un'} ${fruitA.emoji} ${fruitA.nom},<br>` +
      `et <b>${colorerLettres('b')}</b> ${t.libelleTotalMin === 'masse' ? 'la masse' : 'le score'} d'${t.article === 'une' ? 'une' : 'un'} ${fruitB.emoji} ${fruitB.nom}.`;

    // Comme sur les cartes de l'atelier (.pesee-fruits) : les deux fruits
    // d'une pesée sont regroupés sur une seule ligne qui s'enroule si
    // besoin, plutôt que d'être figés chacun sur leur propre rangée.
    const fruits1 = [n1a > 0 ? fruitA.emoji.repeat(n1a) : '', n1b > 0 ? fruitB.emoji.repeat(n1b) : ''].filter(Boolean).join(' ');
    const fruits2 = [n2a > 0 ? fruitA.emoji.repeat(n2a) : '', n2b > 0 ? fruitB.emoji.repeat(n2b) : ''].filter(Boolean).join(' ');

    const table = document.createElement('table');
    table.className = 'fiche-table';
    table.innerHTML = `
      <tr>
        <td>Illustration</td>
        <td class="fiche-table-fruits">${fruits1}</td>
        <td class="fiche-table-fruits">${fruits2}</td>
      </tr>
      <tr>
        <td>${t.libelleTotal}</td>
        <td>${afficherValeur(mass1)}</td>
        <td>${afficherValeur(mass2)}</td>
      </tr>
    `;

    const consigne = document.createElement('div');
    consigne.className = 'exo-consigne';
    consigne.innerHTML = `Calculer ${colorerLettres('a')} et/ou ${colorerLettres('b')}.`;

    gauche.append(intro, table, consigne);

    const droite = document.createElement('div');
    droite.className = 'exo-droite';

    corps.append(gauche, droite);
    exo.appendChild(corps);

    return exo;
  }

  _rendreGrille(liste) {
    this.grilleWrap.innerHTML = '';
    const grille = document.createElement('div');
    grille.className = 'fiche-grille';

    liste.forEach(item => {
      grille.appendChild(this._construireExercice(item.pesee));
    });

    this.grilleWrap.appendChild(grille);
  }

  ouvrir() {
    // Toujours resynchroniser à l'ouverture : le premier exercice doit
    // refléter la pesée actuellement affichée dans l'atelier À CET INSTANT
    // (elle a pu changer depuis la dernière ouverture de la fiche).
    this._derniereSerie = this._genererSerieDepuisAtelier();
    this._rendreGrille(this._derniereSerie);
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  /** "Régénérer une nouvelle série" : demande explicite de tout retirer au
   *  hasard — y compris le premier exercice, qui ne reste donc plus figé
   *  sur la pesée de l'atelier une fois ce bouton cliqué. */
  _regenerer() {
    this._derniereSerie = this._genererSerieComplete();
    this._rendreGrille(this._derniereSerie);
  }

  /** Sépare les milliers par "\,", comme "3\,380" dans le .tex de référence. */
  _formaterMilliersTex(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
  }

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  /**
   * Génère un document LaTeX complet — structure validée en aller-retour
   * direct avec l'utilisateur (voir historique) : \fexo{numéro}{titre}{corps}
   * enferme chaque exercice dans un \fbox non indenté (\noindent, sinon les
   * exercices après le premier héritent de l'indentation de paragraphe
   * normale) ; \peseeExo{...} (8 arguments, comme le fichier de référence)
   * construit le tableau "Pesée 1 / Pesée 2", chaque illustration dans une
   * minipage de largeur fixe \largeurillus (même largeur pour les deux
   * pesées) ; \repeatemoji insère un \hspace{0pt plus 1pt} après chaque
   * icône pour créer un point de coupure valide (sans glue, la séquence
   * d'emoji est insécable et ne revient jamais à la ligne).
   */
  _genererLatex() {
    const liste = this._derniereSerie || [];
    const t = THEMES[this._themeId] || THEMES.masse;

    // Fait le lien entre l'id d'objet de l'appli (fruit ou item de jeu) et
    // le nom reconnu par le paquet LaTeX "emoji" (noms CLDR en kebab-case,
    // repris tel quel du \fruitFR de référence pour les fruits).
    const NOM_EMOJI_TEX = {
      orange: 'tangerine',
      pasteque: 'watermelon',
      pomme: 'red-apple',
      banane: 'banana',
      raisin: 'grapes',
      cerise: 'cherries',
      ananas: 'pineapple',
      fraise: 'strawberry',
      alien: 'alien-monster',
      joystick: 'video-game',
      trophee: 'trophy',
      diamant: 'gem-stone',
      bonus: 'star',
      champignon: 'mushroom',
      eclair: 'high-voltage',
      bouclier: 'shield',
    };

    // Construit \objetFR (la traduction "nom emoji → label FR") à partir de
    // la seule banque du thème utilisé pour cette série : une chaîne
    // \ifstrequal imbriquée générée récursivement, plutôt que le comptage
    // manuel d'accolades du gabarit d'origine (fragile dès qu'on change le
    // nombre d'entrées).
    const construireObjetFR = (banque) => {
      let expr = '#1';
      for (let i = banque.length - 1; i >= 0; i--) {
        const idTex = NOM_EMOJI_TEX[banque[i].id] || banque[i].id;
        expr = `\\ifstrequal{#1}{${idTex}}{${banque[i].nom}}{${expr}}`;
      }
      return expr;
    };

    // Vocabulaire du thème, injecté dans \peseeExo (une seule définition,
    // valable pour toute la série puisqu'elle est générée pour un seul
    // thème à la fois — voir _themeId).
    const article = t.article === 'une' ? 'une' : 'un';
    const labelValeur = t.libelleTotalMin.charAt(0).toUpperCase() + t.libelleTotalMin.slice(1); // "Masse" / "Score"
    const suffixeTex = t.unite ? '~g' : '';
    const nomExercice1 = t.nomExercice(1); // "Pesée 1" / "Manche 1"
    const nomExercice2 = t.nomExercice(2);

    const exosTex = liste.map((item, i) => {
      const { fruitA, fruitB, n1a, n1b, mass1, n2a, n2b, mass2 } = item.pesee;
      const idA = NOM_EMOJI_TEX[fruitA.id] || fruitA.id;
      const idB = NOM_EMOJI_TEX[fruitB.id] || fruitB.id;
      const peseeExo = `\\peseeExo{${n1a}}{${n1b}}{${this._formaterMilliersTex(mass1)}}{${n2a}}{${n2b}}{${this._formaterMilliersTex(mass2)}}{${idA}}{${idB}}`;
      return `\\fexo{${i + 1}}{Algèbre}{\n${peseeExo}\n}`;
    }).join('\n\n\\vspace{0.6cm}\n\n');

    const lignes = [
      '% !TeX program = lualatex',
      '\\documentclass[a4paper,11pt]{article}',
      '\\usepackage[margin=15mm]{geometry}',
      '\\usepackage{fontspec}',
      '\\usepackage{emoji}',
      '\\setemojifont{Apple Color Emoji}[Renderer=Harfbuzz]',
      '\\usepackage{xcolor}',
      '\\usepackage{etoolbox}',
      '\\definecolor{orangefonce}{HTML}{F15929}',
      '',
      `% traduction du nom emoji (package emoji) vers le nom français de l'objet (thème "${t.label}")`,
      `\\newcommand{\\fruitFR}[1]{${construireObjetFR(t.banque)}}`,
      '',
      "% répète l'emoji #2 #1 fois (récursion e-TeX) ; le \\hspace, de largeur",
      "% nulle mais élastique, crée un point de coupure valide entre les",
      '% icônes — sans lui, la séquence est insécable et ne revient jamais',
      '% à la ligne, même dans une minipage de largeur fixe.',
      '\\newcommand{\\repeatemoji}[2]{%',
      '\t\\ifnum#1>0',
      '\t\\emoji{#2}\\hspace{0pt plus 1pt}%',
      '\t\\expandafter\\repeatemoji\\expandafter{\\the\\numexpr#1-1\\relax}{#2}%',
      '\t\\fi',
      '}',
      '',
      '% \\fexo{numéro}{titre}{corps} : encadré d\'exercice numéroté. \\noindent',
      '% est indispensable : \\section* supprime l\'indentation du premier',
      '% paragraphe qui suit, mais pas des suivants — sans lui, les exercices',
      '% après le premier démarrent avec une marge de gauche en trop.',
      '\\newcommand{\\fexo}[3]{',
      '\t\\noindent\\fbox{',
      '\t\t\\begin{minipage}{\\textwidth}',
      '\t\t\t\\vspace*{0.3cm}',
      '\t\t\t\\textbf{Exercice #1 : #2}\\\\',
      '\t\t\t',
      '\t\t\t#3',
      '  \\end{minipage}',
      '}',
      '\t\t\t',
      '}',
      '% \\peseeExo{n1a}{n1b}{masse1}{n2a}{n2b}{masse2}{fruitA}{fruitB}',
      '% n1a/n1b : nombres de fruitA/fruitB dans la pesée 1 ; masse1 : sa masse totale',
      '% n2a/n2b : nombres de fruitA/fruitB dans la pesée 2 ; masse2 : sa masse totale',
      '% fruitA/fruitB : noms emoji (package emoji), ex. tangerine, watermelon',
      '\\newcommand{\\largeurillus}{3cm}',
      '',
      '\\newcommand{\\peseeExo}[8]{%',
      '    \\begin{tabular}{l|l}',
      '      \\begin{minipage}[t]{0.55\\textwidth}',
      `        On note $a$ ${article === 'une' ? 'la' : 'le'} ${labelValeur.toLowerCase()} d'${article} \\fruitFR{#7}\\\\`,
      `        et $b$ ${article === 'une' ? 'la' : 'le'} ${labelValeur.toLowerCase()} d'${article} \\fruitFR{#8}.\\\\[0.8em]`,
      '        \\renewcommand{\\arraystretch}{1.8}',
      '        \\begin{tabular}{|c|c|}',
      '          \\hline',
      `          ${nomExercice1}&${nomExercice2}\\\\\\hline`,
      '          \\begin{minipage}{\\largeurillus} \\vspace*{0.2cm} \\centering\\repeatemoji{#1}{#7}\\repeatemoji{#2}{#8}\\\\ \\vspace*{0.2cm}\\end{minipage} &',
      '          \\begin{minipage}{\\largeurillus}\\centering\\repeatemoji{#4}{#7}\\repeatemoji{#5}{#8}\\end{minipage} \\\\',
      '          \\hline',
      `          ${labelValeur} :  #3${suffixeTex} & ${labelValeur} :  #6${suffixeTex} \\\\\\hline`,
      '        \\end{tabular}\\\\[1em]',
      '',
      '        Calculer $a$ et/ou $b$.\\\\',
      '      \\end{minipage}',
      '      &',
      '      \\begin{minipage}[t]{0.36\\textwidth}',
      '        \\vspace*{5cm}',
      '      \\end{minipage}',
      '    \\end{tabular}',
      '',
      '}',
      '',
      '\\begin{document}',
      '',
      `\\section*{${this._texEscape(this.titre)}}`,
      '',
      // Même ligne d'identité que l'aperçu HTML (_construireOverlay) : nom
      // et prénom à droite, note sur deux traits (pas de "/20" figé — voir
      // le même choix côté HTML).
      '\\noindent Nom et prénom : \\makebox[6cm]{\\hrulefill} \\hfill Note : \\makebox[1.5cm]{\\hrulefill} / \\makebox[1.5cm]{\\hrulefill}\\\\[0.8em]',
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
    a.download = 'fiche-algebre.tex';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

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
        display:flex;
        flex-direction:column;
        gap: 18px;
        margin-top: 40px;
      }

      /* Un exercice = l'équivalent du \\fbox{...} de \\peseeExo */
      .fiche-exercice{
        border: 1px solid var(--grille-forte, #2c2226);
        border-radius: 4px;
        padding: 14px 18px;
      }

      .exo-titre{
        font-weight: 700;
        margin-bottom: 10px;
      }

      .exo-corps{
        display:flex;
        gap: 24px;
        align-items:flex-start;
      }

      /* Proportions ~0.45 / ~0.36 du gabarit LaTeX (note+tableau à gauche,
         espace de résolution à droite). */
      .exo-gauche{
        flex: 0 0 55%;
        max-width: 55%;
      }
      .exo-droite{
        flex: 1 1 auto;
        min-height: 160px;
        border-left: 1px dashed var(--grille, #ccc);
        padding-left: 24px;
      }

      .exo-intro{
        font-size: 14px;
        margin-bottom: 10px;
        line-height: 1.5;
      }

      .fiche-table{
        border-collapse: collapse;
        width: 100%;
        margin-bottom: 10px;
      }
      .fiche-table td{
        border: 1px solid var(--grille-forte, #444);
        text-align: center;
        vertical-align: middle;
        padding: 8px 10px;
        height: 35px;
        box-sizing: border-box;
        font-size: 19px;
      }
      .fiche-table td:first-child{
        font-size: 12.5px;
        font-weight: 600;
        color: var(--encre-douce, #555);
        white-space: nowrap;
      }
      .fiche-table-fruits{
        line-height: 1.5;
        letter-spacing: 1px;
        word-break: break-all;
      }

      .exo-consigne{
        font-size: 14px;
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
          overflow: visible;
        }
        #btnFermerFiche, .fiche-actions, .note-impression{ display:none !important; }
        .fiche-exercice{ break-inside: avoid; }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FichePapier = FichePapier;
