/* ==============================================
   FicheDisque.js — fiche papier « Sens des opérations (masse) »
   ----------------------------------------------
   Même présentation que la fiche LaTeX du professeur :
   tableau « Masse donnée | Masse cherchée | Expression et calcul ».
   - aperçu A4 + impression / PDF (avec corrigé en page 2, si coché)
   - export LaTeX (macros \pizzeq / \pizzq de la fiche, préambule modeleb)

   API :
     const fiche = new FicheDisque({ niveauCourant: () => niveau });
     fiche.installerBouton(conteneur);
================================================== */

const FICHE_DISQUE_CSS = `
#overlayFicheDisque{position:fixed;inset:0;background:rgba(31,36,48,.55);display:none;align-items:flex-start;justify-content:center;overflow:auto;z-index:3000;padding:24px;}
#overlayFicheDisque.ouverte{display:flex;}
#ficheDisqueCarte{position:relative;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.3);padding:18px 20px 24px;width:min(230mm,100%);box-sizing:border-box;}
#btnFermerFicheDisque{position:absolute;top:8px;right:12px;border:none;background:none;font-size:28px;line-height:1;cursor:pointer;color:#555;}
#overlayFicheDisque .fd-reglages{display:flex;flex-wrap:wrap;gap:10px 16px;align-items:center;margin:0 30px 8px 0;font-size:.95rem;}
#overlayFicheDisque .fd-reglages select{font:inherit;padding:4px 6px;border-radius:6px;border:1px solid #c9d6cf;}
#overlayFicheDisque .fd-actions{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:6px;}
#overlayFicheDisque .fd-actions button{border:1px solid #c9d6cf;background:#f1f8f3;border-radius:8px;padding:7px 12px;font:inherit;font-size:.92rem;cursor:pointer;}
#overlayFicheDisque .fd-actions button.principal{background:#2f9e44;border-color:#2f9e44;color:#fff;}
#overlayFicheDisque .note-impression{font-size:.82rem;color:#6b6f7a;margin:0 0 4mm;}
#overlayFicheDisque .fd-apercu{display:flex;flex-direction:column;gap:6mm;align-items:center;background:#e9ece9;padding:5mm;border-radius:8px;}
#overlayFicheDisque .fd-page{width:210mm;min-height:297mm;box-sizing:border-box;padding:12mm 12mm;background:#fff;color:#1f2430;font-family:"Latin Modern Roman","Computer Modern",Georgia,serif;font-size:11pt;box-shadow:0 2px 8px rgba(0,0,0,.15);}
#overlayFicheDisque .fd-entete{display:flex;justify-content:space-between;font-size:10.5pt;margin-bottom:6mm;}
#overlayFicheDisque .fd-cadre{border:1px solid #444;padding:3mm 4mm 4mm;}
#overlayFicheDisque .fd-titre{font-weight:bold;margin:0 0 2mm;}
#overlayFicheDisque .fd-consigne{margin:0 0 3mm;line-height:1.5;}
#overlayFicheDisque table{width:100%;border-collapse:collapse;table-layout:fixed;}
#overlayFicheDisque th,#overlayFicheDisque td{border:1px solid #444;text-align:center;vertical-align:top;padding:2mm;}
#overlayFicheDisque th{font-weight:normal;padding:2.5mm 2mm;}
#overlayFicheDisque th:nth-child(1),#overlayFicheDisque td:nth-child(1){width:33%;}
#overlayFicheDisque th:nth-child(2),#overlayFicheDisque td:nth-child(2){width:34%;}
#overlayFicheDisque .fd-dessins{display:flex;flex-wrap:wrap;justify-content:center;gap:1.5mm;margin:1mm 0 2mm;}
#overlayFicheDisque .fd-dessins svg{width:11mm;height:11mm;}
#overlayFicheDisque td.fd-calcul{height:30mm;}
#overlayFicheDisque .fd-corrige td.fd-calcul{height:auto;text-align:left;font-size:10.5pt;line-height:1.7;}
#overlayFicheDisque .fd-etapes{display:grid;grid-template-columns:auto 1fr;column-gap:1.2mm;}
#overlayFicheDisque .fd-etapes span:nth-child(odd){text-align:right;}
body.fiche-disque-ouverte{overflow:hidden;}
@media print{
  @page{size:A4 portrait;margin:0;}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body.fiche-disque-ouverte > :not(#overlayFicheDisque){display:none !important;}
  body.fiche-disque-ouverte{background:#fff !important;}
  #overlayFicheDisque{position:static;background:#fff;padding:0;display:block !important;overflow:visible;}
  #ficheDisqueCarte{box-shadow:none;width:auto;padding:0;border-radius:0;}
  #btnFermerFicheDisque,#overlayFicheDisque .fd-reglages,#overlayFicheDisque .fd-actions,#overlayFicheDisque .note-impression{display:none !important;}
  #overlayFicheDisque .fd-apercu{display:block;background:none;padding:0;}
  #overlayFicheDisque .fd-page{box-shadow:none;break-after:page;transform:none !important;margin:0 !important;}
  #overlayFicheDisque .fd-page:last-child{break-after:auto;}
}`;

/* ---------- Mise en forme des expressions (moteur → texte, moteur → LaTeX) ---------- */

/** « (2*180g)+(180g:4) » → « (2 × 180 g) + (180 g : 4) » */
function ficheDisqueTexte(expr) {
  return String(expr)
    .replace(/\d+/g, n => Number(n).toLocaleString('fr-FR'))
    .replace(/g/g, ' g')
    .replace(/\*/g, ' × ')
    .replace(/:/g, ' : ')
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' − ');
}

/** Nombre LaTeX : 1200 → 1\,200 */
function ficheDisqueNombreTex(n) {
  return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\\,');
}

/** « (2*180g)+(180g:4) » → « (2\times180\,\text{g})+(180\,\text{g}:4) » */
function ficheDisqueTex(expr) {
  return String(expr)
    .replace(/\d+/g, n => ficheDisqueNombreTex(n))
    .replace(/g/g, '\\,\\text{g}')
    .replace(/\*/g, '\\times ')
    .replace(/:/g, ' : ')
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' - ');
}

/* ---------- Macros de la fiche LaTeX du professeur ---------- */
const FICHE_DISQUE_MACROS_TEX = String.raw`\newcommand\pizzq[2]{%
	\hspace*{0.1cm}%
	\def\rax{0.5}%
	\def\pix{3.14}%
	\FPeval{\tax}{\rax}%
	\psset{unit=\tax cm,xunit=\tax cm, yunit=\tax cm,algebraic=true,dimen=middle,dotstyle=o,dotsize=5pt 0,linewidth=0.8pt,arrowsize=3pt 2,arrowinset=0.25,linewidth=1.pt}%
	\begin{pspicture*}(-1.1,-1.1)(1.1,1.1)%
		\pscircle(0.,0.){1}%
		\multido{\i=0+1}{#2}{%
			\FPeval{\m}{1*cos(2*\i*\pix/#2)}%
			\FPeval{\n}{1*sin(2*\i*\pix/#2)}%
			\psline(0,0)(\m,\n)}%
		\FPeval{\r}{\pix*2/#2*#1}%
		\pscustom[linewidth=1.pt,linecolor=black,fillcolor=zzttqq,fillstyle=solid,opacity=0.3]{\parametricplot{0.0}{\r}{cos(t)|sin(t)}\lineto(0,0)\closepath}%
	\end{pspicture*}%
	\hspace*{0.1cm}%
}

\newcommand\pizzeq[2]{%
	\hspace*{0.1cm}%
	\def\rax{0.5}%
	\FPeval{\tax}{\rax}%
	\psset{unit=\tax cm,xunit=\tax cm, yunit=\tax cm,algebraic=true,dimen=middle,dotstyle=o,dotsize=5pt 0,linewidth=0.8pt,arrowsize=3pt 2,arrowinset=0.25}%
	\begin{pspicture*}(-1.1,-1.1)(1.1,1.1)%
		\pscircle[linewidth=0.8pt,linecolor=black,fillcolor=zzttqq,fillstyle=solid,opacity=0.3](0.,0.){1}%
	\end{pspicture*}%
	\hspace*{0.1cm}%
}

\newcommand\donnee[1]{\par\rule{0pt}{0.5cm}Masse : #1}
\newcommand\cherche{\par\rule{0pt}{0.5cm}$M = \,?$}`;

class FicheDisque {
  constructor({ niveauCourant = () => 1, nbExercices = 6 } = {}) {
    this.niveauCourant = niveauCourant;
    this.nbExercices = nbExercices;
    this.niveau = 1;
    this.avecCorrige = true;
    this.serie = [];
    this.overlay = null;
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

  /* ---------- Tirage d'une série (types variés, pas de doublon) ---------- */
  _genererSerie() {
    const graine = 'fiche-' + Date.now() + '-' + Math.random();
    const rng = new RNG(graine);
    const def = DISQUE_NIVEAUX[this.niveau];
    const types = [];
    while (types.length < this.nbExercices) {
      const tour = def.melange
        ? def.melange.map(n => rng.pick(DISQUE_NIVEAUX[n].types))
        : def.types.slice();
      types.push(...rng.shuffle(tour));
    }
    const vus = new Set();
    this.serie = [];
    for (let i = 0; i < this.nbExercices; i++) {
      let v, essai = 0;
      do {
        v = new EnonceDisque({ seed: `${graine}-${i}-${essai++}`, sharedOptions: { niveau: this.niveau, typeForce: types[i] } }).genVariant(i + 1);
      } while (vus.has(v.etapes[0]) && essai < 20);
      vus.add(v.etapes[0]);
      this.serie.push(v);
    }
  }

  /* ---------- Aperçu HTML ---------- */
  _titre() {
    return `Sens des opérations (masse) — ${DISQUE_NIVEAUX[this.niveau].nom}`;
  }

  _page(corrige) {
    const lignes = this.serie.map(v => {
      const calcul = corrige
        ? `<div class="fd-etapes">${v.etapes.map((e, i) => `<span>${i === 0 ? 'M =' : '='}</span><span>${ficheDisqueTexte(e)}</span>`).join('')}</div>`
        : '';
      return `<tr>
        <td><div class="fd-dessins">${disquesSVG(v.donne)}</div>Masse : ${ficheDisqueTexte(v.masseDonnee + 'g')}</td>
        <td><div class="fd-dessins">${disquesSVG(v.cherche)}</div><i>M</i> = ?</td>
        <td class="fd-calcul">${calcul}</td>
      </tr>`;
    }).join('');
    return `<div class="fd-page${corrige ? ' fd-corrige' : ''}">
      <div class="fd-entete">${corrige ? '<b>Corrigé</b>' : 'Nom : ……………………………… Prénom : ……………………………'}<span>Classe : ………</span></div>
      <div class="fd-cadre">
        <p class="fd-titre">Exercice : ${this._titre()}</p>
        <p class="fd-consigne">Dans chaque cas, les disques représentent des plaques de métal identiques.<br>
        Exprimez puis calculez la masse <i>M</i> cherchée.</p>
        <table>
          <thead><tr><th>Masse donnée</th><th>Masse cherchée</th><th>Expression et calcul</th></tr></thead>
          <tbody>${lignes}</tbody>
        </table>
      </div>
    </div>`;
  }

  _rendre() {
    const apercu = this.overlay.querySelector('.fd-apercu');
    apercu.innerHTML = this._page(false) + (this.avecCorrige ? this._page(true) : '');
    // Pages A4 réduites pour tenir dans la fenêtre
    const place = apercu.clientWidth - 20;
    apercu.querySelectorAll('.fd-page').forEach(p => {
      const w = p.getBoundingClientRect().width;
      const e = Math.min(1, place / w);
      p.style.transformOrigin = 'top center';
      p.style.transform = `scale(${e})`;
      p.style.marginBottom = -(1 - e) * p.getBoundingClientRect().height / e + 'px';
    });
  }

  /* ---------- Export LaTeX ---------- */
  _tableauTex(corrige) {
    const dessins = pieces => pieces.map(p => p.d === 1 ? '\\pizzeq{1}{1}' : `\\pizzq{${p.n}}{${p.d}}`).join('');
    const lignes = this.serie.map(v => {
      const calcul = corrige
        ? `$\\begin{aligned}[t] M &= ${v.etapes.map(ficheDisqueTex).join(' \\\\ &= ')}\\end{aligned}$`
        : '\\rule[-1.9cm]{0pt}{0pt}';
      return `\t\t\\vspace*{0.1cm}${dessins(v.donne)}\\donnee{${ficheDisqueNombreTex(v.masseDonnee)} g}&\\vspace*{0.1cm}${dessins(v.cherche)}\\cherche&${calcul}\\\\\\hline`;
    }).join('\n');
    return `\t\\begin{tabular}{|C{6.2}|C{6}|${corrige ? 'L{5.2}' : 'C{5.2}'}|}
\t\t\\hline
\t\tMasse donnée&Masse cherchée&Expression et calcul\\\\\\hline
${lignes}
\t\\end{tabular}`;
  }

  _latex() {
    const exo = corrige => `\\fexo{${corrige ? 'Corrigé -- ' : ''}${this._titre().replace('—', '--')}}{
\tDans chaque cas, les disques représentent des plaques de métal identiques.\\\\
\tExprimez puis calculez la masse $M$ cherchée.\\\\

\t\\def\\rax{0.6}
${this._tableauTex(corrige)}}`;
    return `% Fiche générée par l'appli « Sens des opérations (masse) »
\\documentclass[10pt]{article}

\\input modeleb
\\usepackage{cellspace}
\\usepackage{makecell}
\\newcolumntype{L}[1]{>{\\raggedright\\arraybackslash}p{#1cm}}

${FICHE_DISQUE_MACROS_TEX}

\\begin{document}

\\vspace*{-1cm}
${exo(false)}
${this.avecCorrige ? `\n\\newpage\n\n\\vspace*{-1cm}\n${exo(true)}\n` : ''}
\\end{document}
`;
  }

  _telechargerLatex() {
    const blob = new Blob([this._latex()], { type: 'application/x-tex;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sens-operations-masse-${DISQUE_NIVEAUX[this.niveau].nom.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.tex`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
  }

  /* ---------- Overlay ---------- */
  _construire() {
    const st = document.createElement('style');
    st.textContent = FICHE_DISQUE_CSS;
    document.head.append(st);
    const ov = document.createElement('div');
    ov.id = 'overlayFicheDisque';
    const options = Object.entries(DISQUE_NIVEAUX)
      .map(([k, d]) => `<option value="${k}">${d.nom}</option>`).join('');
    ov.innerHTML = `<div id="ficheDisqueCarte">
      <button id="btnFermerFicheDisque" type="button" aria-label="Fermer">×</button>
      <div class="fd-reglages">
        <label>Niveau <select class="fd-niveau">${options}</select></label>
        <label>Exercices <select class="fd-nb">${[4, 5, 6, 7, 8].map(n => `<option>${n}</option>`).join('')}</select></label>
        <label><input type="checkbox" class="fd-corrige-case" checked> Avec corrigé</label>
      </div>
      <div class="fd-actions">
        <button type="button" class="fd-nouvelle">🎲 Nouvelle série</button>
        <button type="button" class="principal fd-imprimer">🖨️ Imprimer / PDF</button>
        <button type="button" class="fd-latex">⬇️ Télécharger le LaTeX</button>
      </div>
      <p class="note-impression">💡 À l'impression : décoche « En-têtes et pieds de page », coche « Graphiques d'arrière-plan ». Le LaTeX utilise <b>modeleb</b> et les macros <b>\\pizzeq</b> / <b>\\pizzq</b> de la fiche.</p>
      <div class="fd-apercu"></div>
    </div>`;
    document.body.append(ov);
    this.overlay = ov;

    const nb = ov.querySelector('.fd-nb');
    const niv = ov.querySelector('.fd-niveau');
    nb.value = String(this.nbExercices);
    niv.onchange = () => { this.niveau = Number(niv.value); this._genererSerie(); this._rendre(); };
    nb.onchange = () => { this.nbExercices = Number(nb.value); this._genererSerie(); this._rendre(); };
    ov.querySelector('.fd-corrige-case').onchange = e => { this.avecCorrige = e.target.checked; this._rendre(); };
    ov.querySelector('.fd-nouvelle').onclick = () => { this._genererSerie(); this._rendre(); };
    ov.querySelector('.fd-imprimer').onclick = () => window.print();
    ov.querySelector('.fd-latex').onclick = () => this._telechargerLatex();
    ov.querySelector('#btnFermerFicheDisque').onclick = () => this.fermer();
    ov.addEventListener('click', e => { if (e.target === ov) this.fermer(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && ov.classList.contains('ouverte')) this.fermer(); });
  }

  ouvrir() {
    if (!this.overlay) this._construire();
    // La fiche part du niveau choisi dans l'appli
    this.niveau = this.niveauCourant();
    this.overlay.querySelector('.fd-niveau').value = String(this.niveau);
    this.overlay.classList.add('ouverte');
    document.body.classList.add('fiche-disque-ouverte');
    this._genererSerie();
    this._rendre();
  }

  fermer() {
    this.overlay.classList.remove('ouverte');
    document.body.classList.remove('fiche-disque-ouverte');
  }
}

window.FicheDisque = FicheDisque;
