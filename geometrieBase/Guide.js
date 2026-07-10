/* ==============================================
   Guide.js — overlay "Mode d'emploi" de l'exercice de construction géométrique
   ----------------------------------------------
   Pas de modules ES : script global, instancié dans app.js.
   S'appuie sur le CSS partagé (.overlay-fond / .overlay-carte / .btn-header ...)
   défini dans style.css.

   API publique :
     const guide = new GuideAppli();
     guide.installerBouton(conteneur);   // ajoute le filet + le bouton déclencheur
     guide.ouvrir();
================================================== */

class GuideAppli {
    constructor() {
        this.overlay = null;
        this._construireOverlay();
    }

    /* ---------------- Bouton déclencheur ---------------- */

    installerBouton(conteneur) {
        if (!conteneur) return null;

        const filet = document.createElement('div');
        filet.className = 'filet-header';

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-header';
        btn.textContent = 'Guide';
        btn.addEventListener('click', () => this.ouvrir());

        conteneur.append(filet, btn);
        return btn;
    }

    /* ---------------- Construction de l'overlay (DOM) ---------------- */

    _construireOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'overlayGuide';
        overlay.className = 'overlay-fond';

        const carte = document.createElement('div');
        carte.className = 'overlay-carte';

        const btnFermer = document.createElement('button');
        btnFermer.type = 'button';
        btnFermer.className = 'overlay-fermer';
        btnFermer.setAttribute('aria-label', 'Fermer');
        btnFermer.textContent = '×';
        btnFermer.addEventListener('click', () => this.fermer());

        const h2 = document.createElement('h2');
        h2.textContent = "Mode d'emploi";

        const contenu = document.createElement('div');
        contenu.innerHTML = `
            <h3>Objectif</h3>
            <p>Une figure fantôme (en pointillés gris) est affichée sur le canevas GeoGebra. Ton travail est d'écrire un <b>programme de construction</b> qui reproduit exactement cette figure, en utilisant les points A, B, C (et éventuellement d'autres points nommés) déjà présents.</p>

            <h3>Deux façons d'écrire le programme</h3>
            <p>Le bouton <b>Mode : Blocs / Texte</b> permet de basculer entre deux façons d'écrire le même programme :</p>
            <p><b>Blocs</b> : on assemble des blocs Blockly (tracer une droite, un segment, un cercle, placer un milieu, une intersection, nommer un objet...) comme des pièces de puzzle.<br>
            <b>Texte</b> : on écrit directement des phrases en français ("tracer la droite passant par A et B", "placer le milieu de [AB]", "nommer M"...), avec coloration syntaxique en direct et autocomplétion.</p>

            <h3>Les trois niveaux d'aide (mode Texte)</h3>
            <p><b>1. Apprentissage</b> : les suggestions de mots possibles s'affichent automatiquement à chaque étape, pour découvrir le vocabulaire.<br>
            <b>2. Évaluation</b> : les suggestions n'apparaissent qu'après avoir commencé à taper un mot soi-même.<br>
            <b>3. Sans Aide</b> : aucune suggestion n'est proposée, seule la coloration syntaxique reste active pour repérer les erreurs.</p>

            <h3>Exécuter et vérifier</h3>
            <p>Le bouton <b>Exécuter</b> lance ton programme et compare automatiquement le résultat à la figure fantôme. Le bouton <b>Réinitialiser</b> efface ta construction (sans toucher au programme écrit) et <b>Nouvelle figure</b> tire une nouvelle figure fantôme au hasard.</p>
        `;

        carte.append(btnFermer, h2, contenu);
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
    }

    /* ---------------- Actions publiques ---------------- */

    ouvrir() {
        this.overlay.classList.add('visible');
    }

    fermer() {
        this.overlay.classList.remove('visible');
    }
}

window.GuideAppli = GuideAppli;
