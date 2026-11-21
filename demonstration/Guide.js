/* ==============================================
   Guide.js — overlay "Mode d'emploi" du module de démonstration
   (même fonctionnement que le Guide de geometrieBase)

   API publique :
     const guide = new GuideAppli();
     guide.installerBouton(conteneur);   // ajoute le filet + le bouton déclencheur
     guide.ouvrir();
================================================== */

const GUIDE_DISTANCE = `
    <h3>Objectif</h3>
    <p>Chaque exercice donne une figure et des <b>données</b> (ce que l'on sait).<br>
    Ton travail : tenir un <b>raisonnement valide</b> à partir de ces données, en utilisant les <b>définitions</b> et les <b>propriétés</b> du cours sur les distances (cercle, médiatrice), pour arriver à ce qui est <b style="color:#c0392b">à démontrer</b>.</p>

    <h3>Lire l'énoncé et la figure</h3>
    <p>Les données sont écrites en <b style="color:#2f9e44">vert</b> au-dessus des blocs (« On sait que ») ou <b>codées en vert</b> sur la figure : un angle droit, des petits traits sur deux longueurs égales (ou sur les deux moitiés d'un segment coupé en son milieu).<br>
    Le codage <b style="color:#c0392b">rouge</b> apparaît quand tu as démontré ce qui était demandé.</p>

    <h3>Écrire une étape</h3>
    <p>Clique sur une case de l'étape pour la remplir :<br>
    Pour une information, tu construis toi-même la phrase : choisis la relation par son symbole ( = , ∈ , // , ⊥ ), puis complète-la avec les objets de la figure. (Si la séance est réglée sur <b>📋 Phrases proposées</b>, tu les choisis dans une liste.)<br>
    <b>On a :</b> … : ce que tu sais déjà. Seules les données et ce que tu as déjà démontré sont acceptés ;<br>
    <b>Or :</b> la définition ou la propriété du cours que tu utilises ;<br>
    <b>Donc :</b> ce qu'elle permet de conclure.<br>
    Selon l'exercice, l'étape a une ou deux cases « On a ».<br>
    Clique sur une case déjà remplie pour la changer ou la retirer.</p>

    <h3>Valider l'étape</h3>
    <p>Le bouton <b>Valider l'étape</b> contrôle l'étape en cours. Si elle est juste, elle passe en vert (✓), se replie pour ne montrer que sa conclusion (clique sur son titre pour la revoir en entier) et ne se modifie plus : sa conclusion <b>rejoint ce que tu sais</b> et elle est codée en rouge sur la figure quand c'est possible. S'il y a une erreur, un message explique ce qui ne va pas.</p>

    <h3>Plusieurs étapes</h3>
    <p>Parfois une seule étape ne suffit pas. Quand ton étape est validée, le bouton <b>+ Étape</b> en ajoute une en dessous : tu peux y utiliser ce que tu viens de démontrer. On ne peut pas commencer une étape tant que la précédente n'est pas validée.</p>

    <h3>Note et diplôme</h3>
    <p>Chaque exercice rapporte des points : tous les points si toutes tes étapes sont justes du premier coup. Chaque étape fausse que tu valides divise les points par deux, et à la troisième l'exercice ne rapporte plus rien (tu peux quand même le finir). <b>Recommencer</b> te redonne une chance d'avoir tous les points. Le bouton <b>🎓 Diplôme</b> affiche ton diplôme à imprimer.</p>

    <h3>Exercices</h3>
    <p><b>Recommencer</b> efface ta démonstration.<br>
    Les boutons numérotés en haut permettent de choisir l'exercice ; un exercice réussi passe en vert.</p>
`;

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
        contenu.innerHTML = CHAP.nom === 'distance' ? GUIDE_DISTANCE : `
            <h3>Objectif</h3>
            <p>Chaque exercice donne une figure avec des droites et des codages : ce sont les <b>données</b> (ce que l'on sait).<br>
            Ton travail : tenir un <b>raisonnement valide</b> à partir de ces données codées, en utilisant les propriétés du cours, afin d'obtenir un <b>nouveau renseignement</b> sur la figure.</p>

            <h3>Lire la figure</h3>
            <p>Les codages <b style="color:#2f9e44">verts</b> sont les données : un angle droit pour deux droites perpendiculaires, une double flèche avec <b>//</b> entouré pour deux droites parallèles.<br>
            Le codage <b style="color:#c0392b">rouge</b> apparaît quand tu as obtenu le nouveau renseignement.</p>

            <h3>Écrire une étape</h3>
            <p>Clique sur une case de l'étape pour la remplir :<br>
            Pour une information, tu construis toi-même la phrase : choisis la relation par son symbole ( // ou ⊥ ), puis complète-la avec les droites de la figure. (Si la séance est réglée sur <b>📋 Phrases proposées</b>, tu les choisis dans une liste.)<br>
            <b>On a :</b> … <b>et</b> … : deux informations que tu connais. Seules les données et ce que tu as déjà démontré sont acceptés ;<br>
            <b>Or :</b> la propriété du cours que tu utilises ;<br>
            <b>Donc :</b> ce que la propriété permet de conclure.<br>
            Clique sur une case déjà remplie pour la changer ou la retirer.</p>

            <h3>Valider l'étape</h3>
            <p>Le bouton <b>Valider l'étape</b> contrôle l'étape en cours. Si elle est juste, elle passe en vert (✓), se replie pour ne montrer que sa conclusion (clique sur son titre pour la revoir en entier) et ne se modifie plus : sa conclusion <b>rejoint ce que tu sais</b> et elle est codée en rouge sur la figure. S'il y a une erreur, un message explique ce qui ne va pas.</p>

            <h3>Plusieurs étapes</h3>
            <p>Parfois une seule étape ne suffit pas. Quand ton étape est validée, le bouton <b>+ Étape</b> en ajoute une en dessous : tu peux y utiliser ce que tu viens de démontrer. On ne peut pas commencer une étape tant que la précédente n'est pas validée.</p>

            <h3>Note et diplôme</h3>
            <p>Chaque exercice rapporte des points : tous les points si toutes tes étapes sont justes du premier coup. Chaque étape fausse que tu valides divise les points par deux, et à la troisième l'exercice ne rapporte plus rien (tu peux quand même le finir). <b>Recommencer</b> te redonne une chance d'avoir tous les points. Le bouton <b>🎓 Diplôme</b> affiche ton diplôme à imprimer.</p>

            <h3>Exercices</h3>
            <p><b>Recommencer</b> efface ta démonstration et change le nom des droites.<br>
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
