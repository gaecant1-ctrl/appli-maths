/* ==============================================
   FicheConversion.js — overlay "Fiche papier" pour les exercices de conversion
   ----------------------------------------------
   Génère une fiche imprimable de 8 exercices (grille 4 lignes x 2 colonnes),
   chaque cellule contenant l'énoncé en haut et un espace vide dessous pour
   que l'élève écrive sa conversion étape par étape.

   Les 8 exercices sont générés avec les MÊMES types de conversion que ceux
   actuellement sélectionnés dans l'onglet Paramètres (lireParametresGeneration()),
   sans jamais toucher au quiz en cours.

   Le CSS de cet overlay vit dans style.css (pas injecté en JS), pour rester
   cohérent avec le reste du thème et faciliter sa maintenance.

   API publique :
     const fiche = new FicheConversion();
     fiche.installerBouton(conteneurDuBandeau);   // ajoute le bouton déclencheur
     fiche.ouvrir();                              // ouvre l'overlay
================================================== */

class FicheConversion {
  constructor(opts = {}) {
    this.nbExercices = opts.nbExercices || 20;
    this.titre = opts.titre || "Fiche d'exercices — Conversions";
    this.sousTitre = opts.sousTitre || "Longueur, aire, volume";

    this.overlay = null;
    this.grilleWrap = null;
    this._derniereSerie = null; // liste d'exercices actuellement affichée

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

  /* ---------------- Génération de la série (sans DOM) ---------------- */

  // Évite les doublons d'énoncé sur toute la fiche (même type + mêmes unités + même valeur).
  _genererSerie() {
    const types = (typeof lireParametresGeneration === 'function')
      ? lireParametresGeneration()
      : [];

    const liste = [];
    const vus = new Set();
    let essaisRestants = this.nbExercices * 30; // garde-fou anti-boucle infinie

    while (liste.length < this.nbExercices && essaisRestants > 0) {
      essaisRestants--;
      const ex = genererExerciceConversion(types);
      const cle = `${ex.typeExercice}|${ex.unite1}|${ex.unite2}|${ex.bonneReponse.en(ex.unite2)}`;
      if (vus.has(cle)) continue;
      vus.add(cle);
      liste.push({ index: liste.length + 1, ...ex });
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
    btnImprimer.addEventListener('click', () => this._imprimerDansNouvelOnglet());

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
      <span>Note : <span class="trait court"></span> / 20</span>
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

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) this.fermer();
    });
    this._onKeydown = (e) => {
      if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer();
    };
    document.addEventListener('keydown', this._onKeydown);

    this.overlay = overlay;
    this.grilleWrap = grilleWrap;
  }

  _enonceLatex(item) {
    let exposant = '';
    if (item.typeExercice === 'aire') exposant = `\\mathrm{${item.unite2.slice(0, -1)}}^2`;
    else if (item.typeExercice === 'volume') exposant = `\\mathrm{${item.unite2.slice(0, -1)}}^3`;
    else exposant = `\\mathrm{${item.unite2}}`;
    return `\\(${item.question.latex()}\\) en \\(${exposant}\\)`;
  }

  _construireTable(liste) {
    const table = document.createElement('table');
    table.className = 'fiche-table';

    const thead = document.createElement('thead');
    thead.innerHTML = `<tr><th>#</th><th>Conversion à effectuer</th><th>Réponse</th></tr>`;
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    liste.forEach(item => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="numero">${item.index}</td>
        <td class="enonce">${this._enonceLatex(item)}</td>
        <td class="reponse"></td>
      `;
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    return table;
  }

  _rendreGrille(liste) {
    this.grilleWrap.innerHTML = '';
    this.grilleWrap.appendChild(this._construireTable(liste));

    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.grilleWrap]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.grilleWrap]);
    } catch (e) { /* silencieux */ }
  }

  /* ---------------- Actions publiques ---------------- */

  ouvrir() {
    if (!this._derniereSerie) this._regenerer();
    this.overlay.classList.add('visible');
    document.body.classList.add('fiche-ouverte');
  }

  fermer() {
    this.overlay.classList.remove('visible');
    document.body.classList.remove('fiche-ouverte');
  }

  _regenerer() {
    this._derniereSerie = this._genererSerie();
    this._rendreGrille(this._derniereSerie);
  }

  /* ---------------- Export LaTeX ---------------- */

  _texEscape(s) {
    return String(s || '').replace(/([%&#_{}])/g, '\\$1');
  }

  // Reprend le LaTeX déjà produit par item.question.latex() (valide, ex: "\frac{...}" ou "3.4\ \mathrm{cm}")
  // et l'exposant unité — on ne passe PAS ça dans _texEscape() qui casserait les \mathrm{}.
  _enonceTex(item) {
    let exposant = '';
    if (item.typeExercice === 'aire') exposant = `\\mathrm{${item.unite2.slice(0, -1)}}^2`;
    else if (item.typeExercice === 'volume') exposant = `\\mathrm{${item.unite2.slice(0, -1)}}^3`;
    else exposant = `\\mathrm{${item.unite2}}`;
    return `$${item.question.latex()}$ en $${exposant}$`;
  }

  _genererLatex() {
    const liste = this._derniereSerie || [];
    const lignesTex = liste.map(item =>
      `${item.index} & ${this._enonceTex(item)} & \\\\ \\hline`
    );

    const tableau = `\\begin{tabular}{|>{\\raggedleft}p{0.8cm}|>{\\raggedright\\arraybackslash}p{9cm}|p{5cm}|}
\\hline
\\textbf{\\#} & \\textbf{Conversion à effectuer} & \\textbf{Réponse} \\\\ \\hline
${lignesTex.join('\n')}
\\end{tabular}`;

    return `\\documentclass[11pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1.5cm,right=1.5cm]{geometry}
\\usepackage{amsmath}
\\usepackage{array}
\\usepackage{ragged2e}
\\renewcommand{\\arraystretch}{2.2}
\\pagestyle{empty}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,20

\\vspace{0.9cm}

\\begin{center}
{\\Large \\textbf{${this._texEscape(this.titre)}}}\\\\[0.3em]
{\\large ${this._texEscape(this.sousTitre)}}
\\end{center}

\\vspace{0.9cm}

\\noindent
${tableau}

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
    a.download = 'fiche-conversions.tex';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ---------------- Impression dans un nouvel onglet ---------------- */

  // Ouvre un document HTML totalement autonome (pas l'overlay de l'appli)
  // dans un nouvel onglet, et lance l'impression une fois MathJax rendu.
  // Plus robuste que window.print() sur l'overlay : pas de bagarre avec les
  // styles "visibility" de la page principale, marges/zoom propres à l'onglet.
  _imprimerDansNouvelOnglet() {
    if (!this._derniereSerie) this._regenerer();
    const liste = this._derniereSerie;

    const ligneHTML = (item) => `
      <tr>
        <td class="numero">${item.index}</td>
        <td class="enonce">${this._enonceLatex(item)}</td>
        <td class="reponse"></td>
      </tr>`;

    const tableHTML = `
      <table class="fiche-table">
        <thead><tr><th>#</th><th>Conversion à effectuer</th><th>Réponse</th></tr></thead>
        <tbody>${liste.map(ligneHTML).join('')}</tbody>
      </table>`;

    const html = `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>${this._texEscape(this.titre)}</title>
<script>
  window.MathJax = {
    startup: {
      ready: () => {
        MathJax.startup.defaultReady();
        MathJax.startup.promise.then(() => setTimeout(() => window.print(), 150));
      }
    }
  };
</script>
<script id="MathJax-script" src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>
<style>
  @page { margin: 1cm; size: A4; }
  * { box-sizing: border-box; }
  body { font-family: Arial, sans-serif; color: #111; margin: 0; padding: 0.6cm; }
  h2 { text-align: center; margin: 18px 0 4px; font-size: 1.3em; color: #7d3358; }
  .sous-titre { text-align: center; color: #555; margin: 0 0 16px; font-size: .95em; }
  .ligne-identite { display: flex; justify-content: space-between; gap: 16px; font-size: 15px; margin-bottom: 16px; }
  .trait { display: inline-block; min-width: 220px; border-bottom: 1px solid #444; margin-left: 6px; }
  .trait.court { min-width: 70px; }
  .fiche-table { width: 100%; border-collapse: collapse; font-size: 14px; }
  .fiche-table th { text-align: left; font-size: 11.5px; text-transform: uppercase; letter-spacing: .04em; color: #555; border-bottom: 1px solid #2c2226; padding: 5px 8px 7px; }
  .fiche-table td { border-bottom: 1px solid #ccc; padding: 17px 8px; }
  .fiche-table td.numero { color: #555; font-size: 12px; text-align: right; padding-right: 10px; width: 22px; }
  .fiche-table td.enonce { white-space: nowrap; }
  .fiche-table td.reponse { border-bottom: 1px solid #2c2226; }
</style>
</head>
<body>
  <div class="ligne-identite">
    <span>Nom et prénom : <span class="trait"></span></span>
    <span>Note : <span class="trait court"></span> / 20</span>
  </div>
  <h2>${this._texEscape(this.titre)}</h2>
  <p class="sous-titre">${this._texEscape(this.sousTitre)}</p>
  ${tableHTML}
</body>
</html>`;

    const fenetre = window.open('', '_blank');
    if (!fenetre) {
      alert("Le navigateur a bloqué l'ouverture du nouvel onglet. Autorise les popups pour ce site et réessaie.");
      return;
    }
    fenetre.document.open();
    fenetre.document.write(html);
    fenetre.document.close();
  }
}

window.FicheConversion = FicheConversion;
