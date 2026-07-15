/* ==============================================
   header.js — barre d'en-tête (titre + actions)
   ----------------------------------------------
   Boutons : Nouvel onglet, Guide, Fiche papier.
   Repris du pattern utilisé dans appli-maths/equation/app.js.
================================================== */

function setupBoutonNouvelOnglet() {
    const conteneur = document.getElementById("topButtonsBar");
    if (!conteneur) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnNouvelOnglet';
    btn.className = 'btn-header';
    btn.textContent = 'Nouvel onglet';

    const repli = document.createElement('span');
    repli.id = 'repliNouvelOnglet';
    repli.style.display = 'none';
    repli.style.fontSize = '0.8em';
    repli.style.marginLeft = '8px';
    repli.innerHTML = `Bloqué ici — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

    btn.onclick = () => {
        const nouvelOnglet = window.open(window.location.href, "_blank", "noopener");
        if (!nouvelOnglet) {
            repli.style.display = 'inline';
        }
    };

    conteneur.appendChild(btn);
    conteneur.appendChild(repli);
}

function setupBoutonGuide() {
    const conteneur = document.getElementById("topButtonsBar");
    if (!conteneur) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnGuide';
    btn.className = 'btn-header';
    btn.textContent = 'Guide';
    btn.onclick = () => document.getElementById("guideOverlay")?.classList.add("open");

    conteneur.appendChild(btn);

    const overlay = document.createElement('div');
    overlay.id = 'guideOverlay';
    overlay.className = 'params-overlay';
    overlay.innerHTML = `
        <div class="params-modal">
            <button id="guideClose" class="params-close" aria-label="Fermer">✕</button>
            <h2 class="params-title">Comment ça marche</h2>
            <p><strong>Règle de la pyramide :</strong> chaque case est la somme des deux cases juste en dessous.</p>
            <ol>
                <li><strong>Pyramide à compléter</strong> : observe les valeurs numériques connues et repère l'inconnue <b>x</b>.</li>
                <li><strong>Modélisation (x)</strong> : clique sur chaque case et exprime son contenu en fonction de <b>x</b>, en remontant depuis la base.</li>
                <li><strong>Équation et résolution</strong> : une fois la pyramide littérale complète, traduis la contrainte du sommet (= valeur numérique du sommet) en équation, puis résous-la étape par étape.</li>
                <li>Reviens enfin dans la <strong>pyramide à compléter</strong> pour vérifier ta valeur de x en calculant toutes les cases numériques.</li>
            </ol>
        </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('#guideClose').onclick = () => overlay.classList.remove("open");
    overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove("open");
    });
}

/**
 * FichePyramide — overlay imprimable de plusieurs pyramides à compléter.
 * Réutilise App.getPattern()/App.buildGrid() (purs, sans DOM) pour générer
 * des grilles avec les mêmes réglages (relatifs/grands) que l'exercice en cours.
 */
class FichePyramide {
    constructor(app, opts = {}) {
        this.app = app;
        this.nbPyramides = opts.nbPyramides || 5;
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
        btn.id = 'btnFichePapier';
        btn.className = 'btn-header';
        btn.textContent = 'Fiche papier';
        btn.addEventListener('click', () => this.ouvrir());
        conteneur.appendChild(btn);
        return btn;
    }

    /**
     * Génère une série de pyramides dont la BASE ne contient que des "x"
     * (inconnue) ou des nombres connus ("*") — jamais de "?" — car la fiche
     * papier fige les données : le "?" n'a de sens qu'en version interactive
     * (case à calculer et vérifier en ligne), pas sur une feuille imprimée.
     */
    _genererSerie() {
        const liste = [];
        for (let i = 0; i < this.nbPyramides; i++) {
            let grid;
            let tentatives = 0;
            do {
                const pattern = this.app.getPattern();
                const xSecret = this.app.randomNumber(
                    this.app.settings.grands ? 10 : 1,
                    this.app.settings.grands ? 50 : 10,
                    this.app.settings.relatifs
                );
                grid = this.app.buildGrid(pattern, xSecret);
                tentatives++;
            } while (grid[0].some(c => c.motif === '?') && tentatives < 50);
            liste.push(grid);
        }
        return liste;
    }

    /* ---------------- Export LaTeX (3 colonnes : x / équation / vérification) ---------------- */

    _texEscape(s) {
        return String(s == null ? '' : s).replace(/([%&#_{}])/g, '\\$1');
    }

    /** \equapyr avec la base en x (nombres connus + "x"), sommet vide (à trouver par le calcul littéral). */
    _equapyrEnX(grid) {
        const base = grid[0].map(c => c.motif === 'x' ? '$x$' : `$${this._texEscape(c.value)}$`);
        return `\\equapyr{${base[0]}}{${base[1]}}{${base[2]}}{${base[3]}}{}`;
    }

    /** \equapyrNum de vérification : base vide là où était x (à réécrire avec la valeur trouvée), sommet = cible connue. */
    _equapyrVerification(grid) {
        const base = grid[0].map(c => c.motif === 'x' ? '' : `$${this._texEscape(c.value)}$`);
        const sommet = grid[grid.length - 1][0].value;
        return `\\equapyrNum{${base[0]}}{${base[1]}}{${base[2]}}{${base[3]}}{$${this._texEscape(sommet)}$}`;
    }

    _genererLatex() {
        const liste = this._derniereSerie || [];

        const lignesTex = liste.map(grid => {
            const col1 = this._equapyrEnX(grid);
            const col3 = this._equapyrVerification(grid);
            return `${col1} & \\ficheEquation & ${col3} \\\\\\hline`;
        });

        return `\\documentclass[10pt]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[a4paper,top=1.5cm,bottom=1.5cm,left=1cm,right=1cm]{geometry}
\\usepackage{tikz}
\\usepackage{array}

% Case vide (colonne 2) : ne sert qu'à réserver la hauteur d'une ligne
% (même hauteur que les pyramides) pour que l'élève ait la place d'écrire
% son équation et sa résolution à la main. Aucun contenu imprimé.
\\newcommand{\\ficheEquation}{%
\\begin{minipage}[c][4cm][c]{6cm}
\\mbox{}
\\end{minipage}%
}

% Pyramide à 4 cases de base (#1..#4) et un sommet (#5) — cases intermédiaires
% toujours vides (à calculer). Version TikZ (compatible pdflatex direct,
% contrairement à pstricks qui nécessite latex+dvips+ps2pdf).
% baseline=(current bounding box.center) recentre verticalement la figure
% sur la ligne du tableau principal (sinon elle reste "collée" en haut).
% #6 = largeur d'une case de base, en cm (nombre seul, sans unité).
\\newcommand{\\equapyrML}[6]{%
\\begin{tikzpicture}[baseline=(current bounding box.center),x=#6cm/2,y=1cm,brique/.style={draw,minimum width=#6cm,minimum height=1cm,inner sep=0pt}]
\\path[use as bounding box] (0,-0.3) rectangle (8,4.3);
\\node[brique] (b1) at (1,0.5)  {#1};
\\node[brique] (b2) at (3,0.5)  {#2};
\\node[brique] (b3) at (5,0.5)  {#3};
\\node[brique] (b4) at (7,0.5)  {#4};
\\node[brique] (m1) at (2,1.5)  {};
\\node[brique] (m2) at (4,1.5)  {};
\\node[brique] (m3) at (6,1.5)  {};
\\node[brique] (h1) at (3,2.5)  {};
\\node[brique] (h2) at (5,2.5)  {};
\\node[brique] (s)  at (4,3.5)  {#5};
\\end{tikzpicture}%
}

% Colonne 1 (littérale, en x) : cases de 1.8cm.
\\newcommand{\\equapyr}[5]{\\equapyrML{#1}{#2}{#3}{#4}{#5}{1.8}}

% Colonne 3 (numérique / vérification) : cases plus étroites (1.2cm), pour
% laisser la place à la case équation à côté.
\\newcommand{\\equapyrNum}[5]{\\equapyrML{#1}{#2}{#3}{#4}{#5}{1.2}}

\\pagestyle{empty}

\\begin{document}

\\noindent Nom et prénom : \\hrulefill \\hspace{1cm} Note : \\hrulefill\\,/\\,20

\\vspace{0.6cm}

\\begin{center}
{\\Large \\textbf{Fiche d'exercices --- Pyramides et équations}}
\\end{center}

\\vspace{0.5cm}

\\renewcommand{\\arraystretch}{2}
\\noindent\\begin{tabular}{|c|c|c|}
\\hline
Pyramide à compléter (en $x$) & Équation et résolution & Pyramide de vérification \\\\
\\hline
${lignesTex.join('\n')}
\\end{tabular}

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
        a.download = 'fiche-pyramides.tex';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    /**
     * Construit le DOM d'une mini-pyramide à 4 niveaux, miroir visuel de la
     * macro LaTeX \equapyr : 4 cases de base (baseTexts), puis 3, puis 2
     * cases toujours vides (à calculer), puis le sommet (sommetText).
     */
    /** Rend le contenu d'une case en KaTeX (ex: "x" en italique mathématique) plutôt qu'en texte brut. */
    _rendreBriqueMath(brique, contenu) {
        if (contenu === '' || contenu == null) return;
        if (window.katex) {
            katex.render(String(contenu), brique, { throwOnError: false });
        } else {
            brique.textContent = contenu;
        }
    }

    /**
     * @param {string[]} baseTexts
     * @param {string} sommetText
     * @param {number} largeurCase - en px, miroir du #6 (cm) passé à \equapyrML
     *   côté LaTeX : 1.8cm pour la littérale (\equapyr), 1.5cm pour la
     *   vérification numérique (\equapyrNum).
     */
    _construirePyramideDOM(baseTexts, sommetText, largeurCase = 46) {
        const pyr = document.createElement('div');
        pyr.className = 'fiche-pyramide';
        pyr.style.setProperty('--largeur-case', largeurCase + 'px');

        const sommetLigne = document.createElement('div');
        sommetLigne.className = 'fiche-ligne-pyramide';
        const sommetBrique = document.createElement('div');
        sommetBrique.className = 'fiche-brique';
        this._rendreBriqueMath(sommetBrique, sommetText);
        sommetLigne.appendChild(sommetBrique);
        pyr.appendChild(sommetLigne);

        for (const nb of [2, 3]) {
            const ligne = document.createElement('div');
            ligne.className = 'fiche-ligne-pyramide';
            for (let k = 0; k < nb; k++) {
                const brique = document.createElement('div');
                brique.className = 'fiche-brique';
                ligne.appendChild(brique);
            }
            pyr.appendChild(ligne);
        }

        const ligneBase = document.createElement('div');
        ligneBase.className = 'fiche-ligne-pyramide';
        baseTexts.forEach(txt => {
            const brique = document.createElement('div');
            brique.className = 'fiche-brique';
            this._rendreBriqueMath(brique, txt);
            ligneBase.appendChild(brique);
        });
        pyr.appendChild(ligneBase);

        return pyr;
    }

    _rendreGrille(liste) {
        this.grilleWrap.innerHTML = '';

        const table = document.createElement('div');
        table.className = 'fiche-table-pyramides';

        const entete = document.createElement('div');
        entete.className = 'fiche-ligne-entete';
        ["Pyramide à compléter (en x)", "Équation et résolution", "Pyramide de vérification"]
            .forEach(txt => {
                const th = document.createElement('div');
                th.className = 'fiche-colonne-titre';
                th.textContent = txt;
                entete.appendChild(th);
            });
        table.appendChild(entete);

        liste.forEach(grid => {
            const ligneExo = document.createElement('div');
            ligneExo.className = 'fiche-ligne-exercice';

            const baseEnX = grid[0].map(c => c.motif === 'x' ? 'x' : c.value);
            const sommet = grid[grid.length - 1][0].value;
            const baseVerif = grid[0].map(c => c.motif === 'x' ? '' : c.value);

            const colPyramideX = document.createElement('div');
            colPyramideX.className = 'fiche-colonne';
            colPyramideX.appendChild(this._construirePyramideDOM(baseEnX, '', 62));

            // Miroir de \ficheEquation : une case totalement vide, qui ne sert
            // qu'à réserver la hauteur de la ligne pour que l'élève écrive
            // son équation et sa résolution à la main.
            const colEquation = document.createElement('div');
            colEquation.className = 'fiche-colonne fiche-colonne-equation';

            const colVerif = document.createElement('div');
            colVerif.className = 'fiche-colonne';
            colVerif.appendChild(this._construirePyramideDOM(baseVerif, sommet, 42));

            ligneExo.append(colPyramideX, colEquation, colVerif);
            table.appendChild(ligneExo);
        });

        this.grilleWrap.appendChild(table);
    }

    _construireOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'overlayFichePyramide';

        const carte = document.createElement('div');
        carte.id = 'ficheCartePyramide';

        const btnFermer = document.createElement('button');
        btnFermer.id = 'btnFermerFichePyramide';
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

        const identite = document.createElement('div');
        identite.className = 'ligne-identite';
        identite.innerHTML = `
            <span>Nom et prénom : <span class="trait"></span></span>
            <span>Note : <span class="trait court"></span> / 20</span>
        `;

        const h2 = document.createElement('h2');
        h2.textContent = "Fiche d'exercices — Pyramides";

        const grilleWrap = document.createElement('div');
        grilleWrap.id = 'ficheGrilleWrapPyramide';

        carte.append(btnFermer, actions, identite, h2, grilleWrap);
        overlay.appendChild(carte);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.fermer();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer();
        });

        this.overlay = overlay;
        this.grilleWrap = grilleWrap;
    }

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

    _installerCSS() {
        if (document.getElementById('fiche-pyramide-css')) return;
        const style = document.createElement('style');
        style.id = 'fiche-pyramide-css';
        style.textContent = `
            #overlayFichePyramide{
                display:none;
                position:fixed;
                inset:0;
                background:rgba(44,62,80,0.55);
                z-index:1000000;
                align-items:center;
                justify-content:center;
                padding:24px;
                overflow-y:auto;
            }
            #overlayFichePyramide.visible{ display:flex; }

            #ficheCartePyramide{
                position:relative;
                background:#fff;
                color:#2c3e50;
                max-width:950px;
                width:100%;
                max-height:90vh;
                overflow-y:auto;
                border-radius:8px;
                border:1px solid #2c3e50;
                padding:28px 32px;
                scrollbar-width: none;      /* Firefox */
                -ms-overflow-style: none;   /* anciens Edge/IE */
            }
            #ficheCartePyramide::-webkit-scrollbar{ display:none; } /* Chrome/Safari */

            #btnFermerFichePyramide{
                position:absolute;
                top:10px; right:14px;
                background:none;
                border:none;
                font-size:24px;
                cursor:pointer;
                color:#555;
            }

            .fiche-actions{
                display:flex;
                flex-wrap:wrap;
                gap:10px;
                justify-content:center;
                margin-top: 4px;
            }
            .fiche-actions button{
                flex: 0 1 auto;
                padding:9px 16px;
                border:none;
                border-radius:6px;
                background:#2563eb;
                color:#fff;
                font-size:0.85rem;
                font-weight:600;
                cursor:pointer;
                transition: background-color 0.15s ease;
            }
            .fiche-actions button:hover{ background:#1d4ed8; }

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
                border-bottom:1px solid #444;
                margin-left:6px;
            }
            .trait.court{ min-width:70px; }

            #ficheCartePyramide h2{
                text-align:center;
                margin:30px 0 0;
                font-size:1.3em;
                color:#2196F3;
            }

            .fiche-table-pyramides{
                margin-top: 30px;
                border: 1px solid #2c3e50;
                border-radius: 4px;
                overflow: hidden;
            }

            .fiche-ligne-entete, .fiche-ligne-exercice{
                display: grid;
                grid-template-columns: 1.4fr 0.7fr 1fr;
            }

            .fiche-ligne-entete{
                background: #2c3e50;
                color: #fff;
            }

            .fiche-ligne-exercice + .fiche-ligne-exercice,
            .fiche-ligne-entete + .fiche-ligne-exercice{
                border-top: 1px solid #cbd5e1;
            }

            .fiche-colonne-titre{
                padding: 8px 10px;
                text-align: center;
                font-size: 0.85em;
                font-weight: 600;
                border-left: 1px solid rgba(255,255,255,0.25);
            }
            .fiche-colonne-titre:first-child{ border-left: none; }

            .fiche-colonne{
                padding: 14px 10px;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                border-left: 1px solid #cbd5e1;
            }
            .fiche-colonne:first-child{ border-left: none; }

            .fiche-pyramide{
                display: flex;
                flex-direction: column;
                align-items: center;
            }

            .fiche-ligne-pyramide{
                display:flex;
                justify-content:center;
            }

            .fiche-brique{
                width: var(--largeur-case, 46px);
                height: 32px;
                border: 1px solid #94a3b8;
                display:flex;
                align-items:center;
                justify-content:center;
                font-size: 0.8em;
                font-weight: 600;
                margin: -1px;
            }

            /* Miroir de \\ficheEquation : case vide, ne sert qu'à réserver la
               hauteur de la ligne (même hauteur que les pyramides). Un léger
               cadre en pointillés matérialise l'espace d'écriture, sinon la
               colonne a l'air d'un vide anormal à côté des pyramides. */
            .fiche-colonne-equation{
                width: 100%;
                min-height: 128px;
            }

            body.fiche-ouverte{ overflow:hidden; }

            @media print{
                @page{ margin: 0.6cm; size: A4; }
                /* display:none (pas visibility:hidden) : le reste de la page est
                   retiré du flux, sinon sa hauteur reste comptée et pousse le
                   contenu de la fiche sur une 2e page (vide). */
                body > *:not(#overlayFichePyramide){ display:none !important; }
                /* body a display:flex + align-items:center + padding:20px pour
                   l'appli à l'écran (voir style.css). Sans ce reset, l'overlay
                   (qui n'a pas de largeur explicite) se réduit à son contenu et
                   se retrouve centré par ce flex — ce qui ressemble à d'énormes
                   marges gauche/droite à l'impression alors que ce n'en est pas. */
                body{ display:block !important; padding:0 !important; margin:0 !important; }
                #overlayFichePyramide{
                    position:static !important; display:block !important;
                    width:100%; background:#fff; padding:0; inset:auto;
                }
                #ficheCartePyramide{
                    position:static; max-height:none; max-width:none; width:100%;
                    border:none; border-radius:0; padding:0; margin:0; overflow:visible;
                }
                #btnFermerFichePyramide, .fiche-actions{ display:none !important; }
            }
        `;
        document.head.appendChild(style);
    }
}

window.setupBoutonNouvelOnglet = setupBoutonNouvelOnglet;
window.setupBoutonGuide = setupBoutonGuide;
window.FichePyramide = FichePyramide;
