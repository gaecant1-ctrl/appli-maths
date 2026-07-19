/* ==============================================
   Fiche.js — overlay "Fiche papier" pour le jeu d'appariement
   ----------------------------------------------
   Genere DEUX series de 10 exercices, affichees cote a cote, chacune sous
   forme de tableau a deux colonnes :
     - colonne gauche  : la duree ecrite "en heures" (fraction ou decimal)
     - colonne droite  : la meme duree ecrite "en heures et minutes"
   Sur CHAQUE ligne, une seule colonne est remplie (tiree au hasard) ;
   l'eleve doit completer l'autre. Aucune duree (en minutes) n'apparait
   deux fois dans toute la fiche (20 exercices), pour eviter toute
   redondance d'exercice.

   La generation reutilise Paire(niveau) (memes objets que le jeu), avec un
   compteur de tentatives independant de la partie en cours, et pioche parmi
   TOUS les niveaux du jeu (1 a niveauMax).

   API publique :
     const fiche = new FicheAppariement(() => grille.niveauMax);
     fiche.installerBouton(conteneurDuBandeau);
     fiche.ouvrir();
================================================== */

import { Paire } from "./Paire.js";

export class FicheAppariement {
  /**
   * @param {() => number} getNiveauMax - callback renvoyant le niveau maximal
   *   du jeu (ex: grille.niveauMax). Chaque ligne tire un niveau au hasard
   *   entre 1 et cette valeur, pour produire une fiche qui couvre TOUS les
   *   niveaux plutôt que le seul niveau de la partie en cours.
   */
  constructor(getNiveauMax, opts = {}) {
    this.getNiveauMax = (typeof getNiveauMax === "function") ? getNiveauMax : () => 3;
    this.nbColonnes = opts.nbColonnes || 2;
    this.nbParColonne = opts.nbParColonne || 10;
    this.nbLignes = this.nbColonnes * this.nbParColonne; // 20, deux séries de 10 côte à côte
    this.titre = opts.titre || "Fiche d'exercices — Écritures d'un nombre";
    this.sousTitre = opts.sousTitre || "Écris la fraction simplifiée qui correspond à chaque nombre.";

    this.overlay = null;
    this.tableWrap = null;
    this._derniereSerie = null;

    this._installerCSS();
    this._construireOverlay();
  }

  /* ---------------- Bouton declencheur ---------------- */

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

  /* ---------------- Generation de la serie (sans DOM) ---------------- */

  _genererSerie() {
    const niveauMax = this.getNiveauMax();
    const valeursDejaVues = new Set();
    const lignes = [];
    const tentativesMax = 200; // limite avant de considérer une ligne infaisable

    for (let i = 0; i < this.nbLignes; i++) {

      const niveau = (i % niveauMax) + 1;

      let paireValide = null;

      for (let t = 0; t < tentativesMax; t++) {
        const paire = new Paire(niveau);
        if (!valeursDejaVues.has(paire.signature)) {
          paireValide = paire;
          break;
        }
      }

      if (!paireValide) break; // plus aucune valeur disponible : on arrête là

      valeursDejaVues.add(paireValide.signature);

      // La fraction simplifiée est toujours la réponse attendue : on montre
      // une autre écriture au hasard parmi celles disponibles, jamais la
      // fraction simplifiée elle-même.
      const autresEcritures = paireValide.pool.filter(e => e.mode !== "fractionSimple");
      const autre = autresEcritures[Math.floor(Math.random() * autresEcritures.length)];
      const ficheAutre = `\\(${autre.nombre.toLatex({ nombreAff: autre.mode })}\\)`;

      lignes.push({
        index: lignes.length + 1,
        gauche: ficheAutre,
        droite: ""
      });
    }

    return lignes;
  }

  /** Découpe la série à plat en nbColonnes paquets de nbParColonne lignes. */
  _decouperEnColonnes(lignes) {
    const colonnes = [];
    for (let c = 0; c < this.nbColonnes; c++) {
      colonnes.push(lignes.slice(c * this.nbParColonne, (c + 1) * this.nbParColonne));
    }
    return colonnes;
  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'overlayFicheAppariement';

    const carte = document.createElement('div');
    carte.id = 'ficheAppCarte';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerFicheApp';
    btnFermer.type = 'button';
    btnFermer.setAttribute('aria-label', 'Fermer');
    btnFermer.textContent = '×';
    btnFermer.addEventListener('click', () => this.fermer());

    const actions = document.createElement('div');
    actions.className = 'fiche-app-actions';

    const btnImprimer = document.createElement('button');
    btnImprimer.type = 'button';
    btnImprimer.textContent = '🖨️ Imprimer / Enregistrer en PDF';
    btnImprimer.addEventListener('click', () => window.print());

    const btnRegen = document.createElement('button');
    btnRegen.type = 'button';
    btnRegen.textContent = '🔀 Regenerer une nouvelle serie';
    btnRegen.addEventListener('click', () => this._regenerer());

    const btnTex = document.createElement('button');
    btnTex.type = 'button';
    btnTex.textContent = '⬇️ Télécharger le LaTeX';
    btnTex.addEventListener('click', () => this._telechargerLatex());

    actions.append(btnImprimer, btnRegen, btnTex);

    const identite = document.createElement('div');
    identite.className = 'fiche-app-identite';
    identite.innerHTML = `
      <span>Nom et prenom : <span class="trait"></span></span>
      <span>Note : <span class="trait court"></span> / 20</span>
    `;

    const h2 = document.createElement('h2');
    h2.textContent = this.titre;

    const sousTitre = document.createElement('p');
    sousTitre.className = 'fiche-app-sous-titre';
    sousTitre.textContent = this.sousTitre;

    const tableWrap = document.createElement('div');
    tableWrap.id = 'ficheAppTableWrap';

    carte.append(btnFermer, actions, identite, h2, sousTitre, tableWrap);
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

  _rendreTableau(lignes) {
    const colonnes = this._decouperEnColonnes(lignes);

    const tablesHtml = colonnes.map(colonne => {
      const corps = colonne.map(l => `
        <tr>
          <td class="col-num">${l.index}</td>
          <td class="col-valeur">${l.gauche}</td>
          <td class="col-valeur">${l.droite}</td>
        </tr>
      `).join("");

      return `
        <table class="table-fiche-app">
          <thead>
            <tr>
              <th class="col-num">N°</th>
              <th>Écriture</th>
              <th>Fraction simplifiée</th>
            </tr>
          </thead>
          <tbody>${corps}</tbody>
        </table>
      `;
    }).join("");

    this.tableWrap.innerHTML = `<div class="fiche-app-colonnes">${tablesHtml}</div>`;

    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.tableWrap]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.tableWrap]);
    } catch (e) { /* silencieux */ }
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    if (!this._derniereSerie) this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-app-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-app-ouverte');
  }

  _regenerer() {
    this._derniereSerie = this._genererSerie();
    this._rendreTableau(this._derniereSerie);
  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  /**
   * Convertit une chaîne produite par fiche() — toujours de la forme
   * "\(...\)" — en mode mathématique LaTeX "$...$", réutilisable tel quel
   * dans un document .tex (sans dépendre de MathJax).
   */
  _versTexMath(ficheStr) {
    if (!ficheStr) return null;
    const interieur = ficheStr.replace(/^\\\(/, '').replace(/\\\)$/, '');
    return `$${interieur}$`;
  }

  /** Construit le corps \begin{tabular}...\end{tabular} pour une seule colonne de lignes. */
  _genererTabularColonne(colonne) {
    const lignesTex = colonne.map(l => {
      const gauche = this._versTexMath(l.gauche) || '\\vphantom{X}';
      const droite = this._versTexMath(l.droite) || '\\vphantom{X}';
      return `${l.index} & ${gauche} & ${droite} \\\\\n\\hline`;
    }).join('\n');

    return `\\begin{tabular}{|>{\\centering\\arraybackslash}p{0.6cm}|>{\\centering\\arraybackslash}p{2.6cm}|>{\\centering\\arraybackslash}p{2.6cm}|}
\\hline
\\multicolumn{1}{|c|}{\\bfseries N°} &
\\multicolumn{1}{c|}{\\bfseries Écriture} &
\\multicolumn{1}{c|}{\\bfseries Fraction simplifiée} \\\\
\\hline
${lignesTex}
\\end{tabular}`;
  }

  _genererLatex(lignes) {
    const colonnes = this._decouperEnColonnes(lignes);

    // Une minipage par colonne, placées côte à côte avec \hfill entre elles —
    // équivalent visuel des deux tableaux affichés côte à côte dans l'overlay.
    const minipages = colonnes.map(colonne =>
      `\\begin{minipage}[t]{0.47\\textwidth}\n${this._genererTabularColonne(colonne)}\n\\end{minipage}`
    ).join('\n\\hfill\n');

    return `\\documentclass[12pt,a4paper]{article}
\\usepackage[a4paper,margin=2cm]{geometry}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[french,provide=*]{babel}
\\usepackage{amsmath}
\\usepackage{array}
\\pagestyle{empty}
\\setlength{\\parindent}{0pt}
\\setlength{\\tabcolsep}{3pt}
\\renewcommand{\\arraystretch}{3.5}

\\begin{document}

\\noindent Nom et prénom~: \\hrulefill \\hspace{1.2cm} Note~: \\hrulefill\\,/ 20

\\vspace{1cm}

\\begin{center}
{\\Large\\bfseries ${this._texEscape(this.titre)}}\\\\[10pt]
{\\normalsize ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{1cm}

\\noindent
${minipages}

\\end{document}
`;
  }

  _telechargerLatex() {
    if (!this._derniereSerie) this._regenerer();
    const tex = this._genererLatex(this._derniereSerie);
    const blob = new Blob([tex], { type: 'application/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiche-ecritures-nombres.tex';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- CSS (overlay + impression) ---------------- */

  _installerCSS() {
    if (document.getElementById('fiche-appariement-css')) return;
    const style = document.createElement('style');
    style.id = 'fiche-appariement-css';
    style.textContent = `
      #overlayFicheAppariement{
        display:none;
        position:fixed;
        top:0; right:0; bottom:0; left:0;
        background:rgba(148,163,184,0.4);
        backdrop-filter: blur(2px);
        z-index:1000000;
        align-items:center;
        justify-content:center;
        padding:24px;
        overflow-y:auto;
      }
      #overlayFicheAppariement.visible{ display:flex; }

      #ficheAppCarte{
        position:relative;
        background:#ffffff;
        color:#1e293b;
        max-width:1100px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        scrollbar-width:none;
        border-radius:16px;
        border:2px solid #b45309;
        box-shadow:0 20px 60px rgba(0,0,0,0.2);
        padding:28px 32px;
      }
      #ficheAppCarte::-webkit-scrollbar{ display:none; }

      #btnFermerFicheApp{
        position:absolute;
        top:14px; right:18px;
        width:32px; height:32px;
        display:flex;
        align-items:center;
        justify-content:center;
        background:rgba(0,0,0,0.04);
        border:1px solid rgba(0,0,0,0.1);
        border-radius:50%;
        font-size:20px;
        line-height:1;
        cursor:pointer;
        color:#475569;
        transition: background 0.15s ease, color 0.15s ease;
      }
      #btnFermerFicheApp:hover{ background:rgba(225,29,72,0.12); color:#e11d48; }

      .fiche-app-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        justify-content:center;
        margin-top:6px;
      }
      .fiche-app-actions button{
        padding:9px 16px;
        border:none;
        border-radius:20px;
        background:#b45309;
        color:#ffffff;
        font-size:13.5px;
        font-weight:700;
        cursor:pointer;
        transition: transform 0.15s ease;
      }
      .fiche-app-actions button:hover{ transform: scale(1.05); }

      .fiche-app-identite{
        display:flex;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:16px;
        font-size:15px;
        margin-top:24px;
        margin-bottom:8px;
      }
      .fiche-app-identite .trait{
        display:inline-block;
        min-width:220px;
        border-bottom:1px solid #94a3b8;
        margin-left:6px;
      }
      .fiche-app-identite .trait.court{ min-width:70px; }

      #ficheAppCarte h2{
        text-align:center;
        margin:44px 0 0;
        font-size:1.3em;
        color:#b45309;
      }
      .fiche-app-sous-titre{
        text-align:center;
        color:#475569;
        margin:10px 0 0;
        font-size:0.95em;
      }

      .fiche-app-colonnes{
        display:flex;
        gap:28px;
        margin-top:40px;
      }
      .fiche-app-colonnes .table-fiche-app{
        flex:1 1 0;
        margin-top:0;
      }

      .table-fiche-app{
        width:100%;
        border-collapse:collapse;
        margin-top:24px;
        font-size:16px;
      }
      .table-fiche-app th, .table-fiche-app td{
        border:1px solid #94a3b8;
        padding:14px 10px;
        text-align:center;
      }
      .table-fiche-app th{
        background:rgba(180,83,9,0.1);
        color:#b45309;
        font-weight:700;
      }
      .table-fiche-app .col-num{
        width:48px;
        color:#64748b;
        font-weight:700;
      }
      .table-fiche-app .col-valeur{
        min-height:32px;
        height:48px;
      }

      body.fiche-app-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: 1.2cm; size: A4; }
        body *{ visibility:hidden; }
        #overlayFicheAppariement, #overlayFicheAppariement *{ visibility:visible; }
        #overlayFicheAppariement{
          position:absolute;
          inset:0;
          background:#fff;
          padding:0;
          display:flex !important;
          align-items:flex-start;
          justify-content:flex-start;
        }
        #ficheAppCarte{
          box-shadow:none;
          max-height:none;
          max-width:none;
          width:100%;
          border-radius:0;
          border:none;
          background:#fff;
          color:#000;
          padding:0.5cm;
        }
        #btnFermerFicheApp, .fiche-app-actions{ display:none !important; }

        /* Verrouille une graisse normale sur TOUT le contenu de la fiche —
           certains navigateurs synthétisent une graisse plus épaisse à
           l'impression si le poids n'est pas explicitement fixé partout.
           Les exceptions (titre, en-têtes) sont remontées juste après avec
           une sélectivité plus forte (#ficheAppCarte + classe/élément). */
        #ficheAppCarte, #ficheAppCarte *{
          font-weight:400 !important;
          font-synthesis:none !important;
          font-family: Arial, Helvetica, sans-serif !important;
          -webkit-font-smoothing:antialiased;
          text-shadow:none !important;
        }

        #ficheAppCarte h2{ color:#000; font-weight:600 !important; }
        .fiche-app-sous-titre{ color:#333; }
        .fiche-app-identite .trait{ border-bottom:1px solid #000; }
        #ficheAppCarte .table-fiche-app th{ background:none; color:#000; font-weight:600 !important; border-bottom:1.2pt solid #333; }
        .table-fiche-app th, .table-fiche-app td{ border:0.6pt solid #999; }
        .table-fiche-app .col-num{ color:#000; }
        .fiche-app-colonnes{ flex-direction:row; gap:18px; }
        .table-fiche-app th, .table-fiche-app td{ padding:8px 6px; font-size:14px; }
      }
    `;
    document.head.appendChild(style);
  }
}

window.FicheAppariement = FicheAppariement;