/* ==============================================
   FicheAbscisse.js — overlay "Fiche papier" pour l'appli Droite graduée
   ----------------------------------------------
   Génère une fiche imprimable de 5 droites graduées (type "Lire l'abscisse"
   uniquement : un point cible est affiché sans sa valeur, l'élève la
   calcule et l'écrit sur la ligne de réponse).

   Chaque droite est dessinée en SVG (ligne + graduations + lettres, en
   <text> natif, sans souci de centrage). Les VALEURS des points connus sont
   en revanche posées en HTML par-dessus (comme sur le canvas interactif),
   via formaterValeurHtml() (Configuration.js) : on réutilise exactement le
   même rendu de fraction fait main, déjà éprouvé, plutôt que d'écrire un
   second moteur de fraction en SVG.

   API publique :
     const fiche = new FicheAbscisse();
     fiche.installerBouton(conteneurDuBandeau);
     fiche.ouvrir();
================================================== */

class FicheAbscisse {
  constructor(opts = {}) {
    this.nbExercices = 5;
    this.titre = opts.titre || "Fiche d'exercices — Lire une abscisse";
    this.sousTitre = opts.sousTitre || "Lis l'abscisse du point indiqué en rouge sur chaque droite graduée.";

    this.overlay = null;
    this.listeWrap = null;
    this._derniereSerie = null; // [{index, config, opts}, ...]

    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton déclencheur ---------------- */

  installerBouton(conteneur) {
    if (!conteneur) return null;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnFicheAbscisse';
    btn.className = 'btn-header';
    btn.textContent = 'Fiche';
    btn.addEventListener('click', () => this.ouvrir());
    conteneur.appendChild(btn);
    return btn;
  }

  /* ---------------- Génération des exercices (sans DOM) ---------------- */

  _niveauActuel() {
    const el = document.getElementById('niveau-select');
    return el ? parseInt(el.value, 10) : 5;
  }

  _genererSerie() {
    if (typeof creerConfigurationExoNiveau !== 'function') return [];

    const niveau = this._niveauActuel();
    const liste = [];
    for (let i = 0; i < this.nbExercices; i++) {
      const opts = { nombreAff: random(["auto", "fraction", "fractionMixte"]) };
      const config = creerConfigurationExoNiveau(niveau, opts);
      liste.push({ index: i + 1, config, opts });
    }
    return liste;
  }

  /* ---------------- Construction d'une droite graduée (SVG + overlay) ---------------- */

  _construireSvgDroite(config) {
    const largeur = 860, hauteur = 110;
    const marge = 40;
    const scaleStart = marge, scaleEnd = largeur - marge;
    const step = (scaleEnd - scaleStart) / 10;
    const y = hauteur / 2 + 4;

    let svg = `<svg viewBox="0 0 ${largeur} ${hauteur}" class="fiche-droite-svg" xmlns="http://www.w3.org/2000/svg">`;
    svg += `<line x1="${scaleStart - 15}" y1="${y}" x2="${scaleEnd + 15}" y2="${y}" stroke="#17324a" stroke-width="1.5"/>`;

    const labelValeurs = [];

    config.points.forEach(point => {
      const x = scaleStart + point.idx * step;
      const estCible = point === config.pointCible;
      const estConnu = config.pointsConnus.includes(point);
      const couleur = estCible ? '#e74c3c' : (estConnu ? '#007acc' : '#17324a');

      svg += `<line x1="${x}" y1="${y - 7}" x2="${x}" y2="${y + 7}" stroke="#17324a" stroke-width="1.5"/>`;
      svg += `<text x="${x}" y="${y - 30}" text-anchor="middle" font-size="17" font-weight="bold" fill="${couleur}">${point.lettre}</text>`;

      if (estConnu) {
        labelValeurs.push({ xPct: (x / largeur) * 100, yPct: ((y + 34) / hauteur) * 100, couleur, val: point.val });
      }
    });

    svg += `</svg>`;
    return { svg, labelValeurs };
  }

  _rendreExercice(item) {
    const { svg, labelValeurs } = this._construireSvgDroite(item.config);

    let overlayHtml = '';
    labelValeurs.forEach(lv => {
      overlayHtml += `<span class="fiche-valeur" style="left:${lv.xPct}%; top:${lv.yPct}%; color:${lv.couleur};">${formaterValeurHtml(lv.val, item.opts)}</span>`;
    });

    const div = document.createElement('div');
    div.className = 'fiche-exercice';
    div.innerHTML = `
      <div class="fiche-exercice-consigne">
        <span class="fiche-exercice-num">${item.index}.</span>
        Lire l'abscisse du point <strong style="color:#e74c3c;">${item.config.pointCible.lettre}</strong> :
      </div>
      <div class="fiche-droite-wrap">
        ${svg}
        <div class="fiche-droite-overlay">${overlayHtml}</div>
      </div>
    `;
    return div;
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlayFicheAbscisse';

    const carte = document.createElement('div');
    carte.id = 'ficheAbscisseCarte';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerFicheAbscisse';
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

    const listeWrap = document.createElement('div');
    listeWrap.id = 'ficheAbscisseListeWrap';

    carte.append(btnFermer, actions, note, identite, h2, sousTitre, listeWrap);
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

  _rendreListe(liste) {
    this.listeWrap.innerHTML = '';
    liste.forEach(item => this.listeWrap.appendChild(this._rendreExercice(item)));
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  _regenerer() {
    this._derniereSerie = this._genererSerie();
    this._rendreListe(this._derniereSerie);
  }

  /* ---------------- Export LaTeX (TikZ) ---------------- */

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  /* Macros LaTeX : chaque droite est un \DroiteGraduee{...} rempli de
     \PointDG (lettre) et \ValeurDG (valeur), et chaque exercice un
     \ExoLireAbscisse{numéro}{cible}{...droite...}. But : rendre le .tex
     lisible et modifiable à la main (changer une lettre, une valeur, ou la
     cible d'un énoncé) sans avoir à retoucher des \node répétés. */
  _preambuleMacrosTikz() {
    return `% ---- Macros pour une droite graduée -------------------------------------
% \\PointDG{position}{couleur}{lettre}         -> étiquette au-dessus
% \\ValeurDG{position}{couleur}{valeur}        -> valeur en dessous (mode maths, sans $)
% \\DroiteGraduee{contenu}                     -> la droite (0 à 10), avec \\PointDG/\\ValeurDG dedans
% \\ExoLireAbscisse{numéro}{cible}{contenu}    -> un exercice complet, numéroté
\\newcommand{\\PointDG}[3]{\\node[#2] at (#1,0.35) {\\textbf{#3}};}
\\newcommand{\\ValeurDG}[3]{\\node[#2] at (#1,-0.35) {$#3$};}
\\newcommand{\\DroiteGraduee}[1]{%
  \\begin{tikzpicture}[scale=1.6]
    \\draw[thick] (-0.3,0) -- (10.3,0);
    \\foreach \\x in {0,...,10} \\draw (\\x,-0.08) -- (\\x,0.08);
    #1
  \\end{tikzpicture}%
}
\\newcommand{\\ExoLireAbscisse}[3]{%
  \\textbf{#1.} Lire l'abscisse du point #2~:

  \\vspace{20pt}

  \\DroiteGraduee{#3}

  \\vspace{30pt}
}`;
  }

  _genererLatex() {
    const liste = this._derniereSerie || [];

    const exercicesTex = liste.map(item => {
      const config = item.config;

      const lignes = config.points.map(point => {
        const estCible = point === config.pointCible;
        const estConnu = config.pointsConnus.includes(point);
        const couleur = estCible ? 'red' : (estConnu ? 'blue' : 'black');

        let ligne = `    \\PointDG{${point.idx}}{${couleur}}{${point.lettre}}`;
        if (estConnu) {
          ligne += `\n    \\ValeurDG{${point.idx}}{${couleur}}{${point.val.toLatex(item.opts)}}`;
        }
        return ligne;
      });

      return `\\ExoLireAbscisse{${item.index}}{${this._texEscape(config.pointCible.lettre)}}{%\n${lignes.join('\n')}\n}`;
    });

    return `\\documentclass[12pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm]{geometry}
\\usepackage{amsmath}
\\usepackage{tikz}
\\usepackage{xcolor}
\\pagestyle{empty}

${this._preambuleMacrosTikz()}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,${this.nbExercices}

\\vspace{1.5cm}

\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{1.5cm}

${exercicesTex.join('\n\n')}

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
    a.download = 'fiche-droite-graduee.tex';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- CSS (overlay + impression) ---------------- */

  _installerCSS() {
    if (document.getElementById('fiche-abscisse-css')) return;
    const style = document.createElement('style');
    style.id = 'fiche-abscisse-css';
    style.textContent = `
      #overlayFicheAbscisse{
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
      #overlayFicheAbscisse.visible{ display:flex; }

      #ficheAbscisseCarte{
        position:relative;
        background:var(--papier-encart, #fff);
        color:var(--encre, #222);
        max-width:900px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:8px;
        border:1px solid var(--grille-forte, #007acc);
        padding:28px 32px;
      }
      #ficheAbscisseCarte::-webkit-scrollbar{ display:none; }

      #btnFermerFicheAbscisse{
        position:absolute;
        top:10px; right:14px;
        background:none;
        border:none;
        font-size:24px;
        line-height:1;
        cursor:pointer;
        color:var(--encre-douce, #555);
        padding: 0;
        margin: 0;
      }
      #btnFermerFicheAbscisse:hover{ color:var(--erreur, #e74c3c); background:none; }

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
        background:var(--accent, #007acc);
        color:#fff;
        font-size:13.5px;
        font-weight:600;
        cursor:pointer;
        margin-top: 0;
        transition: background-color 0.15s ease;
      }
      .fiche-actions button:hover{ background:var(--accent-hover, #005e99); }

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

      #ficheAbscisseCarte h2{
        text-align:center;
        margin:40px 0 0;
        font-size:1.3em;
        color: var(--accent, #007acc);
      }
      .sous-titre{
        text-align:center;
        color:var(--encre-douce, #555);
        margin:0px 0 0;
        font-size:0.95em;
      }

      #ficheAbscisseListeWrap{
        display:flex;
        flex-direction:column;
        gap: 34px;
        margin-top: 24px;
      }

      .fiche-exercice{
        border: 1px solid var(--grille, #ccc);
        border-radius: 6px;
        padding: 16px 18px 24px;
      }

      .fiche-exercice-consigne{
        font-size: 15.5px;
        font-weight: 600;
        display: flex;
        align-items: baseline;
        gap: 6px;
        margin-bottom: 16px;
      }

      .fiche-exercice-num{ color: var(--accent, #007acc); }

      .fiche-droite-wrap{
        position: relative;
        width: 100%;
      }

      .fiche-droite-svg{
        display: block;
        width: 100%;
        height: auto;
      }

      .fiche-droite-overlay{
        position: absolute;
        inset: 0;
        pointer-events: none;
      }

      .fiche-valeur{
        position: absolute;
        transform: translate(-50%, -50%);
        font-size: 13px;
        font-weight: 600;
        white-space: nowrap;
      }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: 1cm; size: A4; }
        body *{ visibility:hidden; }
        #overlayFicheAbscisse, #overlayFicheAbscisse *{ visibility:visible; }
        #overlayFicheAbscisse{
          position:absolute;
          inset:0;
          background:#fff;
          padding:0;
          display:flex !important;
          align-items:flex-start;
          justify-content:flex-start;
        }
        #ficheAbscisseCarte{
          box-shadow:none;
          max-height:none;
          max-width:none;
          width:100%;
          border-radius:0;
          border: none;
          padding:0.3cm;
        }
        #btnFermerFicheAbscisse, .fiche-actions, .note-impression{ display:none !important; }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FicheAbscisse = FicheAbscisse;
