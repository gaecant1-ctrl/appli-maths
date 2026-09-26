/* ==============================================
   Guide.js — overlay "Mode d'emploi" du module de démonstration
   (même fonctionnement que le Guide de geometrieBase)

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
            <p>Chaque exercice donne une figure avec des droites, des <b>données</b> (ce que l'on sait) et une phrase <b>à démontrer</b>. Ton travail : écrire la démonstration en assemblant les blocs, en utilisant les propriétés du cours.</p>

            <h3>Lire la figure</h3>
            <p>Les codages <b style="color:#2f9e44">verts</b> sont les données : un angle droit pour deux droites perpendiculaires, une double flèche avec <b>//</b> entouré pour deux droites parallèles.<br>
            Certaines données ne sont écrites nulle part : il faut les lire sur les codages de la figure.<br>
            Le codage <b style="color:#c0392b">rouge</b> apparaît quand tu as démontré ce qui était demandé.</p>

            <h3>Écrire une étape</h3>
            <p>Accroche un bloc <b>Étape</b> dans le bloc <b>Démonstration</b>, puis remplis-le :<br>
            <b>On a :</b> … <b>et</b> … : deux informations que tu connais (données, ou conclusions d'étapes précédentes) ;<br>
            <b>Or :</b> la propriété du cours que tu utilises ;<br>
            <b>Donc :</b> ce que la propriété permet de conclure.</p>

            <h3>Plusieurs étapes</h3>
            <p>Parfois une seule étape ne suffit pas : ajoute une deuxième étape en dessous de la première. La conclusion d'une étape peut servir d'information dans les étapes suivantes.</p>

            <h3>Vérifier</h3>
            <p>Le bouton <b>Vérifier</b> contrôle chaque étape. S'il y a une erreur, un message explique ce qui ne va pas et l'étape concernée est signalée. <b>Recommencer</b> efface ta démonstration et change le nom des droites.<br>
            Les boutons numérotés en haut permettent de choisir l'exercice ; un exercice réussi passe en vert.</p>
        `;

        carte.append(btnFermer, h2, contenu);
        overlay.appendChild(carte);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) this.fermer();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlay.classList.contains('visible')) this.fermer();
        });

        this.overlay = overlay;
    }

    ouvrir() {
        this.overlay.classList.add('visible');
    }

    fermer() {
        this.overlay.classList.remove('visible');
    }
}

window.GuideAppli = GuideAppli;
