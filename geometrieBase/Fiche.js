/* ==============================================
   Fiche.js — overlay "Fiche papier" pour l'exercice de construction géométrique
   ----------------------------------------------
   Tire 2 figures au hasard parmi FIGURES (moteur-construction.js), capture une
   image PNG de chacune via l'applet GeoGebra (sans perturber la construction en
   cours de l'élève, restaurée automatiquement après capture), et affiche pour
   chacune une case "programme" vide à gauche et l'image à droite, avec une note
   sur 5 par figure (10 au total).

   Pas de modules ES : script global, instancié dans app.js. S'appuie sur le CSS
   partagé (.overlay-fond / .overlay-carte / .fiche-* / .btn-header ...) défini
   dans style.css.

   API publique :
     const fiche = new FichePapier();
     fiche.installerBouton(conteneurDuBandeau);   // ajoute le bouton déclencheur
     fiche.ouvrir();                              // ouvre l'overlay
================================================== */

class FichePapier {
    constructor() {
        this.overlay = null;
        this.grilleWrap = null;
        this._derniereSerie = null; // [{ texte, dataUrl }, ...]
        this._construireOverlay();
    }

    /* ---------------- Bouton déclencheur ---------------- */

    installerBouton(conteneur) {
        if (!conteneur) return null;

        const filet = document.createElement('div');
        filet.className = 'filet-header';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.id = 'btnFicheHeader';
        btn.className = 'btn-header';
        btn.textContent = 'Fiche';
        btn.disabled = true; // dépend de ggbApplet (capture d'image) : activé depuis app.js
        btn.addEventListener('click', () => this.ouvrir());

        conteneur.append(filet, btn);
        return btn;
    }

    /* ---------------- Tirage et capture des figures ---------------- */

    _tirerDeuxFigures() {
        if (FIGURES.length === 0) return [];
        if (FIGURES.length === 1) return [FIGURES[0], FIGURES[0]];
        const i1 = Math.floor(Math.random() * FIGURES.length);
        let i2 = Math.floor(Math.random() * (FIGURES.length - 1));
        if (i2 >= i1) i2++;
        return [FIGURES[i1], FIGURES[i2]];
    }

    async _capturerImages() {
        const textes = this._tirerDeuxFigures();
        const resultats = [];
        for (const texte of textes) {
            await afficherFigureTemporairement(texte);
            const base64 = ggbApplet.getPNGBase64(2, true, 300);
            resultats.push({ texte, dataUrl: `data:image/png;base64,${base64}` });
        }
        restaurerFigureActuelle();
        return resultats;
    }

    /* ---------------- Construction de l'overlay (DOM) ---------------- */

    _construireOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'overlayFiche';
        overlay.className = 'overlay-fond';

        const carte = document.createElement('div');
        carte.className = 'overlay-carte';

        const btnFermer = document.createElement('button');
        btnFermer.type = 'button';
        btnFermer.className = 'overlay-fermer';
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
        btnRegen.textContent = '🔀 Régénérer';
        btnRegen.addEventListener('click', () => this._regenerer());

        actions.append(btnImprimer, btnRegen);

        const identite = document.createElement('div');
        identite.className = 'fiche-identite';
        identite.innerHTML = `
            <span>Nom et prénom : <span class="trait"></span></span>
            <span>Note totale : <span class="trait court"></span> / 10</span>
        `;

        const h2 = document.createElement('h2');
        h2.textContent = "Fiche d'exercices — Construction géométrique";

        const sousTitre = document.createElement('p');
        sousTitre.style.textAlign = 'center';
        sousTitre.textContent = "Ecris, dans la case de gauche, le programme de construction de la figure fantôme affichée à droite, qu'on pourra repasser au fur et à mesure.";

        const grilleWrap = document.createElement('div');

        carte.append(btnFermer, actions, identite, h2, sousTitre, grilleWrap);
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

    _rendreGrille(serie) {
        this.grilleWrap.innerHTML = '';
        serie.forEach((item, i) => {
            const exercice = document.createElement('div');
            exercice.className = 'fiche-exercice';

            const entete = document.createElement('div');
            entete.className = 'fiche-exercice-entete';
            entete.innerHTML = `<span>Figure ${i + 1}</span><span>Note : <span class="trait court"></span> / 5</span>`;

            const corps = document.createElement('div');
            corps.className = 'fiche-exercice-corps';

            const colProg = document.createElement('div');
            colProg.className = 'fiche-colonne-programme';

            const colFig = document.createElement('div');
            colFig.className = 'fiche-colonne-figure';
            colFig.innerHTML = `<img src="${item.dataUrl}" alt="Figure ${i + 1}">`;

            corps.append(colProg, colFig);
            exercice.append(entete, corps);
            this.grilleWrap.appendChild(exercice);
        });
    }

    /* ---------------- Actions publiques ---------------- */

    async ouvrir() {
        this.overlay.classList.add('visible');
        document.body.classList.add('fiche-ouverte');
        await this._regenerer();
    }

    fermer() {
        this.overlay.classList.remove('visible');
        document.body.classList.remove('fiche-ouverte');
    }

    async _regenerer() {
        this._derniereSerie = await this._capturerImages();
        this._rendreGrille(this._derniereSerie);
    }
}

window.FichePapier = FichePapier;
