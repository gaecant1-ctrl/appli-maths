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
    btn.className = 'btn-fiche-papier';
    btn.textContent = '📄 Fiche papier';
    btn.addEventListener('click', () => this.ouvrir());
    conteneur.appendChild(btn);
    return btn;
  }

  /* ---------------- Génération des exercices (sans DOM) ---------------- */

  /**
   * Mélange Fisher-Yates déterministe (basé sur un RNG seedé local, indépendant
   * du RNG interne de l'Enonce) pour garantir une série de types SANS répétition,
   * comme le fait index.html pour le quiz principal (listeCombinaisons).
   * Sans ça, un tirage indépendant à chaque question (rng.int(1,25) x10) produit
   * souvent des doublons par pur hasard (paradoxe des anniversaires) — visible
   * dans la fiche papier sous forme de 3-4 exercices du même type sur 10.
   */
  _typesSansRepetition(nbTypes, nbVoulu, seed) {
    const rng = new RNG(seed);
    const types = Array.from({ length: nbTypes }, (_, i) => i + 1);
    for (let i = types.length - 1; i > 0; i--) {
      const j = rng.int(0, i);
      [types[i], types[j]] = [types[j], types[i]];
    }
    // Si on demande plus d'exercices que de types disponibles, on boucle sur le paquet mélangé.
    const out = [];
    for (let i = 0; i < nbVoulu; i++) out.push(types[i % types.length]);
    return out;
  }

  _genererSerie(seed) {
    // 1. On tire une série de types distincts (sans répétition tant qu'il y a assez de types).
    const typesSeries = this._typesSansRepetition(25, this.nbExercices, `${seed}-types`);

    const liste = [];
    for (let i = 1; i <= this.nbExercices; i++) {
      // 2. Chaque exercice a son propre seed (dérivé) + son type forcé via sharedOptions,
      //    pour éviter qu'une instance partagée d'Enonce ne "tire" un type au hasard
      //    qui viendrait écraser notre tirage sans répétition.
      const opts = {
        seed: `${seed}-q${i}`,
        sharedOptions: { ...this.sharedOptionsBase, affichageAvecLettre: null, typeForce: typesSeries[i - 1] }
      };
      const enonce = new this.EnonceClass(opts);
      const variant = enonce.genVariant(i);
      const data = enonce.toQuestionData(variant, i);
      liste.push({
        index: i,
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
      tdQ.innerHTML = item.question;

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
    this._lastVariants = this._genererSerie(this._seedActuel);
    this._rendreTableau(this._lastVariants);
  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscapeHtmlBits(html) {
    // L'énoncé contient du HTML léger (<br>) mélangé à du LaTeX ($...$).
    // 1) On normalise d'abord les bits HTML restants.
    //    NB: dans une cellule de tableau, on utilise \newline et non \\
    //    (qui terminerait la ligne du tableau au lieu de faire un saut de ligne).
    let s = String(html || '')
      .replace(/<br\s*\/?>/gi, ' \\newline ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\n/g, ' ')
      .replace(/<\/?strong>/gi, '')
      .replace(/<\/?em>/gi, '');

    // 2) On échappe les caractères spéciaux LaTeX uniquement dans les segments
    //    de texte HORS des zones $...$ (sinon le % d'un "30%" coupe la ligne,
    //    et un _ ou & dans le texte casse la compilation).
    const segments = s.split(/(\$[^$]*\$)/g); // garde les $...$ comme délimiteurs dans le résultat
    return segments
      .map((seg, i) => (i % 2 === 1 ? seg : this._texEscape(seg)))
      .join('');
  }

  _genererLatex() {
    const liste = this._lastVariants || [];

    // La colonne Réponse ne contient qu'un résultat (calcul fait de tête, pas de brouillon
    // écrit) : pas besoin d'un grand espace. Mais un peu plus que le strict minimum pour que
    // la fiche respire visuellement — sans gonfler artificiellement comme avant.
    const ESPACE_REPONSE_CM = 1.3;

    const lignesTex = liste.map((item) => {
      const enonceTex = this._texEscapeHtmlBits(item.question);
      // \rule{0pt}{Hcm} (et non \vspace, sans effet en fin de cellule de tableau) crée
      // une boîte invisible qui impose une hauteur minimale à la ligne, sans la forcer
      // au-delà de ce que le texte de l'énoncé impose déjà naturellement.
      return `${item.index} & ${enonceTex} & \\rule{0pt}{${ESPACE_REPONSE_CM}cm} \\\\ \\hline`;
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
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{1cm}

\\begin{longtable}{|>{\\centering\\arraybackslash}p{0.5cm}|>{\\RaggedRight\\arraybackslash}p{13.2cm}|>{\\RaggedRight\\arraybackslash}p{4cm}|}
\\hline
\\textbf{N°} & \\textbf{Énoncé} & \\textbf{Réponse} \\\\ \\hline
\\endhead
${lignesTex}
\\end{longtable}

\\end{document}
`;
  }

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
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
    const style = document.createElement('style');
    style.id = 'fiche-papier-css';
    style.textContent = `
      .btn-fiche-papier{
        display:flex;
        align-items:center;
        justify-content:center;
        align-self:stretch;
        flex:1 1 auto;
        min-width:0;
        height:100%;
        width:100%;
        margin-left:8px;
        padding:4px 10px;
        border:1px solid var(--panel-border, #334155);
        border-radius:8px;
        background:var(--muted, #334155);
        color:var(--text, #f1f5f9);
        font-size:13px;
        line-height:1.2;
        font-weight:600;
        cursor:pointer;
        white-space:normal;
        word-break:keep-all;
        overflow-wrap:break-word;
        text-align:center;
      }
      .btn-fiche-papier:hover{ background:var(--accent, #818cf8); }

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

window.FichePapier = FichePapier;