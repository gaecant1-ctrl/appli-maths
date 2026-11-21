/* ============================================================
   BLOCS : Démonstration / Étape / Informations / Propriétés
   Blocs « maison » en HTML (sans Blockly) : l'élève clique sur une case et
   choisit dans une fenêtre posée sur la zone des blocs.
   ============================================================ */

// L'exercice affiché : ses droites, points, segments et cercles alimentent la fenêtre
// où l'élève construit ses phrases (tenu à jour par app.js).
let figureCourante = null;

// La démonstration en cours : une liste d'étapes.
//   f1, f2 : informations « On a » ; prop : clé de la propriété (« Or ») ; concl : « Donc »
//   valide : étape validée (elle ne se modifie plus) ; erreur : message affiché dans l'étape
//   repliee : étape validée réduite à sa conclusion (un clic sur son titre la déplie)
let etapes = [];

const zoneBlocs = document.getElementById('blocs');
const CASES = ['f1', 'f2', 'prop', 'concl'];
const TITRES = { f1: 'On a :', f2: 'et', prop: 'Or :', concl: 'Donc :' };

function nouvelleEtape() {
    return { f1: null, f2: null, prop: null, concl: null, valide: false, erreur: null };
}

function lireEtapes() {
    return etapes;
}

/* ---------- Travail de l'élève (gardé quand on change d'exercice) ---------- */

function sauverTravail() {
    return JSON.parse(JSON.stringify(etapes));
}

function chargerTravail(travail) {
    etapes = JSON.parse(JSON.stringify(travail));
    afficherEtapes();
}

// Point de départ d'un exercice : une étape vide.
function travailInitial() {
    etapes = [nouvelleEtape()];
    afficherEtapes();
}

function viderBlocs() {
    etapes = [];
    zoneBlocs.innerHTML = '';
}

/* ---------- Modifier la démonstration ---------- */

function ajouterEtape() {
    const etape = nouvelleEtape();
    etapes.push(etape);
    afficherEtapes();
    return etape;
}

function supprimerEtape(etape) {
    etapes = etapes.filter(e => e !== etape);
    if (!etapes.length) etapes.push(nouvelleEtape());
    afficherEtapes();
}

// Remplit (ou vide, avec null) une case de l'étape. Les messages d'erreur disparaissent
// dès que l'élève change quelque chose.
function poser(etape, nom, valeur) {
    etape[nom] = valeur;
    etapes.forEach(e => { e.erreur = null; });
    afficherEtapes();
}

function validerBloc(etape) {
    etape.valide = true;
    etape.repliee = true; // il ne reste que sa conclusion : c'est ce qu'on sait maintenant
    etape.erreur = null;
    afficherEtapes();
}

function signalerErreur(etape, message) {
    etapes.forEach(e => { e.erreur = null; });
    etape.erreur = message;
    afficherEtapes();
}

/* ---------- Dessin des blocs ---------- */

function creer(balise, classe, html) {
    const el = document.createElement(balise);
    if (classe) el.className = classe;
    if (html !== undefined) el.innerHTML = html;
    return el;
}

function htmlPropriete(cle) {
    const prop = PROPRIETES[cle];
    const titre = prop.titre ? `<b class="titre-propriete">${prop.titre}</b>` : '';
    return titre + prop.lignes.join('<br>');
}

// Une case de l'étape : vide (« clique ici ») ou remplie. Un clic ouvre ses choix.
function creerCase(etape, nom) {
    const valeur = etape[nom];
    const btn = creer('button', 'bd-case');
    btn.type = 'button';
    if (!valeur) {
        btn.classList.add('vide');
        btn.textContent = nom !== 'prop' ? 'clique ici'
            : CHAP.nom === 'droites' ? 'clique ici pour choisir la propriété'
                : 'clique ici pour choisir la définition ou la propriété';
    } else if (nom === 'prop') {
        btn.classList.add('propriete');
        btn.innerHTML = htmlPropriete(valeur);
    } else {
        // Mêmes couleurs que les codages de la figure : vert pour ce qu'on a, rouge pour ce qu'on conclut.
        btn.classList.add(nom === 'concl' ? 'donc' : 'on-a');
        btn.innerHTML = versHtml(texteFait(valeur));
    }
    btn.disabled = etape.valide;
    btn.onclick = () => choixPourEntree(etape, nom);
    return btn;
}

function creerLigne(mot, ...elements) {
    const ligne = creer('div', 'bd-ligne');
    ligne.appendChild(creer('span', 'bd-mot', mot));
    elements.forEach(el => ligne.appendChild(el));
    return ligne;
}

// Nombre de cases « On a » de l'étape : c'est l'exercice qui le fixe (ligne « cases … » de
// son fichier, une valeur par étape, la dernière servant pour les étapes suivantes).
// Sans cette ligne : deux cases pour les parallèles et perpendiculaires, une seule sinon.
function casesOnA(etape) {
    const prevu = figureCourante && figureCourante.cases;
    if (!prevu) return CHAP.nom === 'droites' ? 2 : 1;
    const i = Math.max(etapes.indexOf(etape), 0);
    return prevu[Math.min(i, prevu.length - 1)];
}

// Exercice en une seule étape, avec une seule étape écrite : pas besoin du titre « Étape 1 ».
function etapeSeule() {
    const ex = figureCourante;
    if (!ex || etapes.length !== 1) return false;
    if (ex.nbEtapes === undefined) ex.nbEtapes = analyserExercice(ex).etapes;
    return ex.nbEtapes === 1;
}

function creerEtape(etape, i) {
    const bloc = creer('div', 'bd-etape' + (etape.valide ? ' validee' : '') + (etape.erreur ? ' fautive' : ''));

    // Titre dessiné comme un bouton : étape en cours → menu (Supprimer) ;
    // étape validée → ✓, et un clic la replie (conclusion seule) ou la déplie.
    const marque = etape.valide ? `✓ <i>${etape.repliee ? '▸' : '▾'}</i>` : '▾';
    const seule = etapeSeule();
    const titre = creer('button', 'bd-titre', `${seule ? '' : `Étape ${i + 1} `}<span>${marque}</span>`);
    titre.type = 'button';
    if (etape.valide) {
        titre.title = etape.repliee ? 'Revoir toute cette étape' : 'Ne garder que la conclusion';
        titre.onclick = () => { etape.repliee = !etape.repliee; afficherEtapes(); };
    } else {
        titre.disabled = etapes.length < 2;
        titre.onclick = () => choixPourEtape(etape);
    }
    // Seule étape, pas encore validée : on écrit directement « On a / Or / Donc ».
    if (!seule || etape.valide) bloc.appendChild(titre);

    // Étape repliée : son titre et sa conclusion, sur une ligne.
    if (etape.valide && etape.repliee) {
        bloc.classList.add('repliee');
        bloc.appendChild(creerCase(etape, 'concl'));
        return bloc;
    }

    // « On a » : les informations (une ou deux selon l'exercice) sur la même ligne.
    const ligne = creerLigne('On a :', creerCase(etape, 'f1'));
    if (casesOnA(etape) === 2) ligne.append(creer('span', 'bd-et', 'et'), creerCase(etape, 'f2'));
    bloc.appendChild(ligne);
    bloc.appendChild(creerLigne('Or :', creerCase(etape, 'prop')));
    bloc.appendChild(creerLigne('Donc :', creerCase(etape, 'concl')));
    if (etape.erreur) bloc.appendChild(creer('div', 'bd-erreur', '⚠ ' + versHtml(etape.erreur)));
    return bloc;
}

// Redessine toute la démonstration : un chapeau, les étapes emboîtées, un pied.
function afficherEtapes() {
    const haut = zoneBlocs.firstChild ? zoneBlocs.firstChild.scrollTop : 0;
    const defile = creer('div', 'bd-defile');
    const demo = creer('div', 'bd-demo');
    demo.appendChild(creer('div', 'bd-chapeau', 'Démonstration'));
    const corps = creer('div', 'bd-corps');
    etapes.forEach((e, i) => corps.appendChild(creerEtape(e, i)));
    demo.append(corps, creer('div', 'bd-pied'));
    defile.appendChild(demo);
    zoneBlocs.replaceChildren(defile);
    defile.scrollTop = haut;
    // L'étape en cours (ou fautive) reste visible.
    const cible = defile.querySelector('.bd-etape.fautive') || defile.querySelector('.bd-etape:not(.validee)');
    if (cible) cible.scrollIntoView({ block: 'nearest' });
}

/* ---------- Fenêtre de choix ---------- */

const overlayChoix = document.createElement('div');
overlayChoix.className = 'overlay-fond overlay-workspace';
overlayChoix.innerHTML = `
    <div class="overlay-carte carte-choix">
        <button type="button" class="overlay-fermer" aria-label="Fermer">×</button>
        <h2></h2>
        <div class="choix-contenu"></div>
    </div>`;
// Posée sur la zone des blocs seulement : la figure reste visible pendant le choix.
document.getElementById('prog').appendChild(overlayChoix);
overlayChoix.querySelector('.overlay-fermer').onclick = fermerChoix;
overlayChoix.addEventListener('click', e => { if (e.target === overlayChoix) fermerChoix(); });
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlayChoix.classList.contains('visible')) fermerChoix();
});

function fermerChoix() {
    overlayChoix.classList.remove('visible');
}

function boutonChoix(html, classe, action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-choix ' + classe;
    btn.innerHTML = html;
    btn.onclick = () => { fermerChoix(); action(); };
    return btn;
}

function ouvrirChoix(titre, elements) {
    overlayChoix.querySelector('h2').textContent = titre;
    const zone = overlayChoix.querySelector('.choix-contenu');
    zone.innerHTML = '';
    elements.forEach(el => zone.appendChild(el));
    overlayChoix.classList.add('visible');
}

/* ---------- Construction d'une phrase mathématique ----------
   L'élève n'a pas de liste de phrases toutes faites : il choisit une relation par son
   symbole ( = , ∈ , // , ⊥ ) puis complète la phrase avec les objets de la figure. */

// symbole : la relation, par laquelle l'élève choisit sa phrase ; cases : nature des deux
// objets à choisir ; mots : ce qui s'écrit avant, entre et après.
const MODELES = {
    // « = » sert aux longueurs égales (MA = MB) et aux longueurs connues (AB = 4,2 cm).
    egal: { symbole: '=', cases: ['longueur', 'longueurOuMesure'], mots: ['', ' = ', ''] },
    // Un point appartient à une droite ou à un cercle, désignés par leur nom : une seule
    // relation pour l'élève, deux types d'information (appartient, surCercle).
    appartenance: { symbole: '∈', cases: ['point', 'ensemble'], mots: ['', ' ∈ ', ''] },
    para: { symbole: '//', cases: ['droite', 'droite'], mots: ['', ' // ', ''] },
    // ⊥ entre deux droites : une droite de la figure, ou la droite (AB) qui porte un segment [AB].
    perp: { symbole: '⊥', cases: ['droiteOuSegment', 'droiteOuSegment'], mots: ['', ' ⊥ ', ''] },
    // Pas de symbole pour ces relations : elles s'écrivent en toutes lettres.
    // Deux points dans une seule phrase (seulement dans « On a ») : c'est deux informations « surMed ».
    surMed2: { symbole: '… et … appartiennent à la médiatrice de', enMots: true, seulementOnA: true, cases: ['point', 'point', 'segment'], mots: ['', ' et ', ' appartiennent à la médiatrice de ', ''] },
    surMed: { symbole: 'appartient à la médiatrice de', enMots: true, cases: ['point', 'segment'], mots: ['', ' appartient à la médiatrice de ', ''] },
    mediatrice: { symbole: 'est la médiatrice de', enMots: true, cases: ['droite', 'segment'], mots: ['', ' est la médiatrice de ', ''] },
    milieu: { symbole: 'passe par le milieu de', enMots: true, cases: ['droite', 'segment'], mots: ['', ' passe par le milieu de ', ''] }
};
const MODELES_CHAPITRE = CHAP.nom === 'droites'
    ? ['para', 'perp']
    : ['egal', 'appartenance', 'para', 'perp', 'surMed', 'surMed2', 'mediatrice', 'milieu'];

const mesuresConnues = () => [...new Set(figureCourante.hypotheses.filter(f => f.type === 'longueur').map(f => f.b))];

// Les objets de la figure qu'on peut mettre dans une case de cette nature.
function objetsDe(nature) {
    const ex = figureCourante;
    switch (nature) {
        case 'point': return ex.pts.map(p => p.nom);
        case 'droite': return ex.droites;
        case 'segment': return ex.segments;
        // les segments sont proposés sous la forme de leur droite (AB), sans doublon avec une droite
        // déjà tracée par les mêmes points
        case 'droiteOuSegment': return [...ex.droites, ...ex.segments.filter(sg =>
            !ex.droites.some(d => (ex.sur[d] || []).length === 2 && [...sg.slice(1, -1)].every(n => ex.sur[d].includes(n))))];
        case 'longueur': return ex.segments.map(s => s.slice(1, -1));
        case 'longueurOuMesure': return [...ex.segments.map(s => s.slice(1, -1)), ...mesuresConnues()];
        // ce à quoi un point peut appartenir : une droite "appartient|d" ou un cercle "surCercle|c"
        case 'ensemble': return [
            ...ex.droites.map(d => 'appartient|' + d),
            ...ex.cercles.map(c => 'surCercle|' + c.nom)];
    }
    return [];
}

// Comment s'écrit un objet : (d1), [AB], A, AB, 4 cm.
function ecrireObjet(nature, valeur) {
    if (nature === 'ensemble') {
        return versHtml(nomAffiche(valeur.split('|')[1]));
    }
    if (nature === 'droiteOuSegment') return versHtml(nomDroite(valeur));
    return nature === 'droite' ? versHtml(nomAffiche(valeur)) : valeur;
}

// Une case pas encore remplie : (…) pour une droite, […] pour un segment, … sinon.
function caseVide(nature) {
    if (nature === 'droite' || nature === 'ensemble') return '(…)';
    if (nature === 'segment') return '[…]';
    if (nature === 'droiteOuSegment') return '(…)';
    return '…';
}

// Un modèle n'est proposé que si la figure a de quoi le compléter (pas de « cercle »
// sans cercle, pas de « // » avec une seule droite).
function modeleDisponible(type) {
    const natures = MODELES[type].cases;
    if (natures.some(n => !objetsDe(n).length)) return false;
    const o0 = objetsDe(natures[0]), o1 = objetsDe(natures[1]);
    return o1.some(y => o0.some(x => x !== y));
}

function boutonSimple(html, classe, action) {
    const btn = creer('button', 'btn-choix ' + classe, html);
    btn.type = 'button';
    btn.onclick = action;
    return btn;
}

// 1re fenêtre : quelle relation ? L'élève choisit par le symbole ( = , ∈ , // , ⊥ ).
function choisirModele(etape, nom) {
    const classe = nom === 'concl' ? 'donc' : 'on-a';
    const symboles = creer('div', 'choix-symboles');
    const mots = creer('div', 'choix-relations-mots');
    MODELES_CHAPITRE.filter(modeleDisponible).forEach(type => {
        const m = MODELES[type];
        if (m.seulementOnA && nom === 'concl') return;
        (m.enMots ? mots : symboles).appendChild(boutonSimple(m.symbole, classe + (m.enMots ? '' : ' symbole'),
            () => construirePhrase(etape, nom, type, m.cases.map(() => null))));
    });
    const consigne = creer('p', 'consigne-choix', 'Quelle relation veux-tu écrire ?');
    ouvrirChoix(TITRES[nom], [consigne, symboles, mots]);
}

// MA = BM s'écrit MA = MB : le point commun en premier.
function ordonnerEgalite(a, b) {
    const commun = [...a].find(l => b.includes(l));
    if (!commun || a === b) return [a, b];
    const autre = s => [...s].find(l => l !== commun);
    return [commun + autre(a), commun + autre(b)];
}

// 2e fenêtre : la phrase avec ses cases (deux, parfois trois), et les objets de la figure
// pour les remplir.
function construirePhrase(etape, nom, type, valeurs) {
    const m = MODELES[type];
    const classe = nom === 'concl' ? 'donc' : 'on-a';
    const prochaineVide = () => valeurs.indexOf(null);
    let active = Math.max(prochaineVide(), 0);
    const phrase = creer('div', 'phrase ' + classe);
    const objets = creer('div', 'objets-phrase');
    const refus = creer('div', 'refus-phrase');
    const ecrire = boutonSimple('Écrire cette phrase ✓', 'ecrire', () => {
        let [a, b] = valeurs;
        let fait = { type, a, b };
        if (type === 'appartenance') fait = { type: b.split('|')[0], a, b: b.split('|')[1] };
        else if (type === 'surMed2') fait = { type, a, c: b, b: valeurs[2] };
        else if (type === 'egal' && mesuresConnues().includes(b)) fait = { type: 'longueur', a, b };
        else if (type === 'egal') { [a, b] = ordonnerEgalite(a, b); fait = { type, a, b }; }
        // « On a » : seulement ce qu'on sait déjà (app.js dit pourquoi c'est refusé).
        const motif = nom === 'concl' ? null : refusOnA(fait);
        if (motif) { refus.innerHTML = '⚠ ' + versHtml(motif); return; }
        fermerChoix();
        poser(etape, nom, fait);
    });

    const dessiner = () => {
        phrase.innerHTML = '';
        refus.innerHTML = '';
        m.cases.forEach((nature, k) => {
            if (m.mots[k]) phrase.appendChild(creer('span', '', m.mots[k]));
            const c = creer('button', 'case-phrase' + (k === active ? ' active' : '') + (valeurs[k] === null ? ' vide' : ''),
                valeurs[k] === null ? caseVide(nature) : ecrireObjet(nature, valeurs[k]));
            c.type = 'button';
            c.onclick = () => { active = k; dessiner(); };
            phrase.appendChild(c);
        });
        const fin = m.mots[m.cases.length];
        if (fin) phrase.appendChild(creer('span', '', fin));

        objets.innerHTML = '';
        objetsDe(m.cases[active]).forEach(v => {
            const b = creer('button', 'objet' + (valeurs[active] === v ? ' choisi' : ''), ecrireObjet(m.cases[active], v));
            b.type = 'button';
            b.disabled = valeurs.some((x, j) => j !== active && x === v); // pas deux fois le même objet
            b.onclick = () => {
                valeurs[active] = v;
                if (prochaineVide() >= 0) active = prochaineVide();
                dessiner();
            };
            objets.appendChild(b);
        });
        ecrire.disabled = valeurs.includes(null);
    };
    dessiner();

    const actions = creer('div', 'actions-phrase');
    actions.appendChild(boutonSimple('← Autre relation', 'autre', () => choisirModele(etape, nom)));
    if (etape[nom]) actions.appendChild(boutonSimple('Retirer', 'retirer', () => { fermerChoix(); poser(etape, nom, null); }));
    actions.appendChild(ecrire);
    const consigne = creer('p', 'consigne-choix', 'Clique sur une case de la phrase, puis sur ce que tu veux y écrire.');
    ouvrirChoix(TITRES[nom], [consigne, phrase, objets, refus, actions]);
}

function choixPourEntree(etape, nom) {
    if (etape.valide) return;
    if (nom === 'prop') {
        const liste = creer('div', 'choix-proprietes');
        CHAP.proprietes.forEach(cle => {
            liste.appendChild(boutonChoix(htmlPropriete(cle), 'propriete', () => poser(etape, nom, cle)));
        });
        const elements = [liste];
        if (etape[nom]) elements.push(boutonChoix('Retirer', 'retirer', () => poser(etape, nom, null)));
        ouvrirChoix(TITRES[nom], elements);
        return;
    }
    if (modePropositions) { choisirDansListe(etape, nom); return; }
    // Case déjà remplie : on rouvre sa phrase pour la corriger.
    const f = etape[nom];
    if (!f) choisirModele(etape, nom);
    else if (['appartient', 'surCercle'].includes(f.type)) construirePhrase(etape, nom, 'appartenance', [f.a, f.type + '|' + f.b]);
    else if (f.type === 'surMed2') construirePhrase(etape, nom, 'surMed2', [f.a, f.c, f.b]);
    else construirePhrase(etape, nom, f.type === 'longueur' ? 'egal' : f.type, [f.a, f.b]);
}

/* ---------- Mode « phrases proposées » ----------
   Autre mode (bouton de l'entête) : l'élève choisit sa phrase dans une liste.
   « On a » : ce qu'on sait. « Donc » : les phrases qu'on peut écrire sur la figure. */

let modePropositions = false;

function choisirDansListe(etape, nom) {
    const classe = nom === 'concl' ? 'donc' : 'on-a';
    const elements = [];
    const rubriques = nom === 'concl' ? rubriquesPossibles() : rubriquesConnues();
    if (nom !== 'concl') {
        // Deux points connus sur la même médiatrice peuvent s'écrire en une seule phrase.
        const sur = rubriques.flatMap(r => r.faits).filter(f => f.type === 'surMed');
        const paires = sur.flatMap((f, i) => sur.slice(i + 1).filter(g => cleNom(g.b) === cleNom(f.b))
            .map(g => ({ type: 'surMed2', a: f.a, c: g.a, b: f.b })));
        if (paires.length) rubriques.push({ titre: 'Deux points à la fois', faits: paires });
    }
    rubriques.forEach(({ titre, faits }) => {
        const grille = creer('div', 'rubrique-faits');
        faits.forEach(f => grille.appendChild(boutonChoix(versHtml(texteFait(f)), classe,
            () => poser(etape, nom, { ...f }))));
        const h = creer('h3', 'titre-rubrique');
        h.textContent = titre;
        elements.push(h, grille);
    });
    if (etape[nom]) elements.push(boutonChoix('Retirer', 'retirer', () => poser(etape, nom, null)));
    ouvrirChoix(TITRES[nom], elements);
}

// Une seule étape en cours à la fois : on peut seulement la supprimer.
function choixPourEtape(etape) {
    if (etape.valide || etapes.length < 2) return;
    ouvrirChoix(`Étape ${etapes.indexOf(etape) + 1}`,
        [boutonChoix('Supprimer cette étape', 'retirer', () => supprimerEtape(etape))]);
}
