import { Nombre } from "./Nombre.js";
import { Ecriture } from "./Ecriture.js";
import { genererConsigne } from "./Consigne.js";

/* ==============================================
   FicheFlash.js — overlay "Fiche papier" (HTML + impression + LaTeX)
   ----------------------------------------------
   Génère une fiche imprimable de N exercices avec le même
   moteur que le mode Flash (Nombre / Ecriture / Consigne),
   sans jamais toucher au quiz en cours.

   API publique :
     const fiche = new FicheFlash({ nbExercices, titre, sousTitre });
     fiche.installerBouton(conteneur);   // ajoute le bouton déclencheur
     fiche.ouvrir();                     // ouvre l'overlay
================================================== */

export class FicheFlash {

  constructor(opts = {}) {

    this.nbExercices = Math.max(1, Number(opts.nbExercices || 10));
    this.titre = opts.titre || "Écritures d'un nombre";
    this.sousTitre = opts.sousTitre || "Complète la colonne Réponse";

    this.overlay = null;
    this.tableWrap = null;
    this._lastListe = null;
    this._seedActuel = null;

    this._installerCSS();
    this._construireOverlay();

  }

  /* ---------------- Bouton déclencheur ---------------- */

  installerBouton(conteneur) {

    if (!conteneur) return null;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnFicheFlash';
    btn.className = 'btn-fiche-papier';
    btn.textContent = 'Fiche papier';
    btn.addEventListener('click', () => this.ouvrir());

    conteneur.appendChild(btn);

    return btn;

  }

  /* ---------------- RNG seedé (déterministe) ---------------- */

  _rng(seed) {

    let h = 1779033703 ^ String(seed).length;

    for (let i = 0; i < String(seed).length; i++) {
      h = Math.imul(h ^ String(seed).charCodeAt(i), 3432918353);
      h = (h << 13) | (h >>> 19);
    }

    return () => {
      h = Math.imul(h ^ (h >>> 16), 2246822507);
      h = Math.imul(h ^ (h >>> 13), 3266489909);
      h ^= h >>> 16;
      return (h >>> 0) / 4294967296;
    };

  }

  _randSeeded(rand, a, b) {
    return Math.floor(rand() * (b - a + 1)) + a;
  }

  /* ---------------- Génération des exercices (sans DOM) ---------------- */

  _genererUnExercice(rand) {

    let a, b;

    b = this._randSeeded(rand, 2, 11);
    a = this._randSeeded(rand, 1, b);

    if (rand() < 0.5) {
      const entier = this._randSeeded(rand, 1, 3);
      a = a + entier * b;
    }

    const nombre = Nombre.fromParts(a, b);

    const precisions = [1, 2, 3];
    const alea = precisions[this._randSeeded(rand, 0, precisions.length - 1)];

    const optionsExercice = {
      forceApprox: false,
      precisionDec: alea,
      precisionFracDec: precisions[this._randSeeded(rand, 0, precisions.length - 1)],
      precisionPourc: this._randSeeded(rand, 1, alea),
      kDenom: this._randSeeded(rand, 2, 5)
    };

    const ecritures = Ecriture.genererTout(nombre, optionsExercice);

    const donneeEcriture = ecritures.find(e => e.forme === "decimal" && e.statut === "exact")
      ?? ecritures.find(e => e.forme === "fractionSimp");

    if (!donneeEcriture) return null;

    const candidates = ecritures.filter(e => e !== donneeEcriture && e.string !== donneeEcriture.string);

    if (candidates.length === 0) return null;

    const ecritureDemandee = candidates[this._randSeeded(rand, 0, candidates.length - 1)];

    return { donneeEcriture, ecritureDemandee };

  }

  _genererSerie(seed) {

    const rand = this._rng(seed);

    const liste = [];
    let index = 1;
    let garde = 0; // sécurité anti-boucle infinie

    while (liste.length < this.nbExercices && garde < this.nbExercices * 20) {

      garde++;

      const ex = this._genererUnExercice(rand);

      if (!ex) continue;

      liste.push({
        index,
        consigne: genererConsigne(ex.ecritureDemandee, ex.donneeEcriture.latex),
        reponseLatex: ex.ecritureDemandee.latex,
        reponseString: ex.ecritureDemandee.string
      });

      index++;

    }

    return liste;

  }

  /* ---------------- Construction de l'overlay (DOM) ---------------- */

  _construireOverlay() {

    const overlay = document.createElement('div');
    overlay.id = 'overlayFicheFlash';

    const carte = document.createElement('div');
    carte.id = 'ficheFlashCarte';

    const btnFermer = document.createElement('button');
    btnFermer.id = 'btnFermerFicheFlash';
    btnFermer.type = 'button';
    btnFermer.setAttribute('aria-label', 'Fermer');
    btnFermer.textContent = '×';
    btnFermer.addEventListener('click', () => this.fermer());

    const actions = document.createElement('div');
    actions.className = 'fiche-actions';

    const btnImprimer = document.createElement('button');
    btnImprimer.type = 'button';
    btnImprimer.textContent = 'Imprimer / Enregistrer en PDF';
    btnImprimer.addEventListener('click', () => window.print());

    const btnTex = document.createElement('button');
    btnTex.type = 'button';
    btnTex.textContent = 'Télécharger le LaTeX';
    btnTex.addEventListener('click', () => this._telechargerLatex());

    const btnRegen = document.createElement('button');
    btnRegen.type = 'button';
    btnRegen.textContent = 'Régénérer une nouvelle série';
    btnRegen.addEventListener('click', () => this._regenerer());

    actions.append(btnImprimer, btnTex, btnRegen);

    const note = document.createElement('p');
    note.className = 'note-impression';
    note.innerHTML = "Dans la fenêtre d'impression, pense à décocher <strong>« En-têtes et pieds de page »</strong> pour un rendu propre.";

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
    tableWrap.id = 'ficheFlashTableWrap';

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
    thead.innerHTML = `<tr><th>N°</th><th>Consigne</th><th>Réponse</th></tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    liste.forEach(item => {

      const tr = document.createElement('tr');

      const tdNum = document.createElement('td');
      tdNum.className = 'col-num';
      tdNum.textContent = item.index;

      const tdQ = document.createElement('td');
      tdQ.className = 'col-enonce';
      tdQ.innerHTML = item.consigne;

      const tdR = document.createElement('td');
      tdR.className = 'col-reponse';
      tdR.innerHTML = `<span class="ligne-reponse"></span>`;

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

    if (!this._lastListe) this._regenerer();

    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');

  }

  fermer() {

    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');

  }

  _regenerer() {

    this._seedActuel = `fiche-flash-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    this._lastListe = this._genererSerie(this._seedActuel);

    this._rendreTableau(this._lastListe);

  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscapeHtmlBits(html) {

    let s = String(html || '')
      .replace(/<br\s*\/?>/gi, ' \\newline ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/\n/g, ' ')
      .replace(/<\/?strong>/gi, '')
      .replace(/<\/?em>/gi, '');

    const segments = s.split(/(\$[^$]*\$)/g);

    return segments
      .map((seg, i) => (i % 2 === 1 ? seg : this._texEscape(seg)))
      .join('');

  }

  _genererLatex() {

    const liste = this._lastListe || [];

    const ESPACE_REPONSE_CM = 1.6;

    const lignesTex = liste.map((item) => {

      const consigneTex = this._texEscapeHtmlBits(item.consigne);

      return `${item.index} & ${consigneTex} & \\rule{0pt}{${ESPACE_REPONSE_CM}cm} \\\\ \\hline`;

    }).join('\n');

    return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1cm,right=1cm]{geometry}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{longtable}
\\usepackage{ragged2e}
\\renewcommand{\\arraystretch}{1.5}
\\pagestyle{empty}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,20

\\vspace{0.5cm}

\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{1cm}

\\begin{longtable}{|>{\\centering\\arraybackslash}m{0.5cm}|>{\\RaggedRight\\arraybackslash}m{13.2cm}|>{\\centering\\arraybackslash}m{4cm}|}
\\hline
\\textbf{N°} & \\textbf{Consigne} & \\textbf{Réponse} \\\\ \\hline
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

    if (!this._lastListe) this._regenerer();

    const tex = this._genererLatex();
    const blob = new Blob([tex], { type: 'application/x-tex;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'fiche-flash-exercices.tex';
    document.body.appendChild(a);
    a.click();
    a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);

  }

  /* ---------------- CSS (overlay + impression) ---------------- */

  _installerCSS() {

    if (document.getElementById('fiche-flash-css')) return;

    const style = document.createElement('style');
    style.id = 'fiche-flash-css';
    style.textContent = `
      .btn-fiche-papier{
        padding:10px 18px;
        border:none;
        border-radius:10px;
        background:#5b6cf5;
        color:#fff;
        font-size:14px;
        font-weight:600;
        cursor:pointer;
        transition:background .18s ease, transform .12s ease, box-shadow .18s ease;
        box-shadow:0 4px 14px rgba(91,108,245,0.3);
      }
      .btn-fiche-papier:hover{
        background:#4a5ce0;
        transform:translateY(-1px);
        box-shadow:0 6px 18px rgba(91,108,245,0.4);
      }

      #overlayFicheFlash{
        display:none;
        position:fixed;
        top:0; right:0; bottom:0; left:0;
        background:rgba(20,22,35,0.7);
        z-index:1000000;
        align-items:center;
        justify-content:center;
        padding:24px;
        overflow-y:auto;
      }
      #overlayFicheFlash.visible{ display:flex; }

      #ficheFlashCarte{
        position:relative;
        background:#fff;
        color:#111;
        max-width:900px;
        width:100%;
        max-height:90vh;
        overflow-y:auto;
        border-radius:14px;
        padding:28px 32px;
        box-shadow:0 20px 60px rgba(0,0,0,0.45);
      }

      #btnFermerFicheFlash{
        position:absolute;
        top:10px; right:14px;
        background:none;
        border:none;
        font-size:28px;
        line-height:1;
        cursor:pointer;
        color:#888;
      }
      #btnFermerFicheFlash:hover{ color:#222; }

      #ficheFlashCarte .fiche-actions{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        justify-content:center;
      }
      #ficheFlashCarte .fiche-actions button{
        padding:10px 16px;
        border:none;
        border-radius:8px;
        background:#2c3550;
        color:#fff;
        font-size:13.5px;
        font-weight:600;
        cursor:pointer;
        transition:background .15s ease;
      }
      #ficheFlashCarte .fiche-actions button:hover{ background:#3c4768; }

      #ficheFlashCarte .note-impression{
        text-align:center;
        font-size:12.5px;
        color:#777;
        margin:10px 0 0;
      }

      #ficheFlashCarte .espace-fiche{ height:22px; }

      #ficheFlashCarte .ligne-identite{
        display:flex;
        justify-content:space-between;
        flex-wrap:wrap;
        gap:16px;
        font-size:15px;
      }
      #ficheFlashCarte .trait{
        display:inline-block;
        min-width:220px;
        border-bottom:1px solid #444;
        margin-left:6px;
      }
      #ficheFlashCarte .trait.court{ min-width:70px; }

      #ficheFlashCarte h2{
        text-align:center;
        margin:0;
        font-size:1.4em;
      }
      #ficheFlashCarte .sous-titre{
        text-align:center;
        color:#666;
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
        background:#eef0f7;
        text-align:left;
      }
      .col-num{ width:24px; text-align:center; font-weight:700; padding-left:6px; padding-right:6px; }
      .col-enonce{ width:62%; line-height:1.5; }
      .col-reponse{ width:28%; }
      .ligne-reponse{
        display:block;
        min-height:34px;
        border-bottom:1px solid #999;
        position:relative;
      }

      body.fiche-ouverte{ overflow:hidden; }

      @media print{
        @page{ margin: 0.8cm; }
        body *{ visibility:hidden; }
        #overlayFicheFlash, #overlayFicheFlash *{ visibility:visible; }
        #overlayFicheFlash{
          position:absolute;
          inset:0;
          background:#fff;
          padding:0;
          display:flex !important;
          align-items:flex-start;
          justify-content:flex-start;
        }
        #ficheFlashCarte{
          box-shadow:none;
          max-height:none;
          max-width:none;
          width:100%;
          border-radius:0;
          padding:0;
        }
        #btnFermerFicheFlash, .fiche-actions, .note-impression{ display:none !important; }
      }
    `;

    document.head.appendChild(style);

  }

}
