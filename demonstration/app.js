/* ============================================================
   APPLICATION : exercices, vérification, messages
   ============================================================ */

let indexExercice = -1;
// Travail de l'élève gardé par exercice (on peut changer d'exercice et revenir).
const travaux = {};
// Noms des droites mélangés à la 1re ouverture de chaque exercice, puis gardés
// pendant la séance (le travail sauvegardé utilise ces noms). « Recommencer » en tire d'autres.
const permutations = {};
let exerciceCourant = null;


function afficherConsigne() {
    const c = document.getElementById('messageContainer');
    document.getElementById('messageAlerte').innerText = '';
    c.className = 'consigne';
}

function alerte(texte, type) {
    const c = document.getElementById('messageContainer');
    document.getElementById('messageAlerte').innerHTML = versHtml(texte);
    c.className = type; // 'erreur' | 'succes' | 'info'
}

function fermerAlerte() {
    afficherConsigne();
}

/* ---------- Boutons d'exercices (entête) ---------- */

function construireBoutonsExercices() {
    const conteneur = document.getElementById('choixExercices');
    conteneur.innerHTML = '';
    EXERCICES.forEach((_, i) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn-exercice';
        btn.textContent = i + 1;
        btn.title = `Exercice ${i + 1}`;
        btn.onclick = () => afficherExercice(i);
        conteneur.appendChild(btn);
    });
}

function mettreAJourBoutonsExercices() {
    document.querySelectorAll('#choixExercices .btn-exercice').forEach((btn, i) => {
        btn.classList.toggle('actuel', i === indexExercice);
        btn.classList.toggle('reussi', exerciceReussi(i));
    });
}

/* ---------- Affichage d'un exercice ---------- */

// Exercices en plusieurs étapes : on annonce la conclusion finale attendue.
// Chapitre « distance » : l'énoncé complet (« On sait que », « À démontrer ») est écrit
// au-dessus des blocs.
function afficherButFinal(ex) {
    const but = document.getElementById('butFinal');
    const enonce = document.getElementById('enonce');
    const n = ex ? analyserExercice(ex).etapes : null;
    if (CHAP.nom === 'droites') {
        but.hidden = !n || n < 2;
        if (!but.hidden) but.innerHTML = `À démontrer en ${n} étapes : ` + versHtml(texteFait(ex.montrer));
        return;
    }
    but.hidden = true;
    enonce.hidden = !ex;
    if (!ex) return;
    // Les noms donnés aux objets ne sont pas des données : ils sont présentés à part.
    const noms = [...ex.cercles.map(c => `${nomAffiche(c.nom)} est un cercle de centre ${c.centre}`),
        ...ex.notations.map(n => `${nomAffiche(n.droite)} est la médiatrice de ${n.segment}`)].map(versHtml).join(' ; ');
    const sait = ex.donnees.map(texteFait).map(versHtml).join(' ; ');
    const lus = ex.codages.length ? (sait ? ' On lit aussi les codages de la figure.' : 'Les données sont codées sur la figure.') : '';
    enonce.innerHTML =
        (noms ? `<div class="notations"><b>Notation :</b> ${noms}.</div>` : '') +
        (sait || lus ? `<div class="on-sait">${sait ? '<b>On sait que :</b> ' + sait + '.' : ''}${lus}</div>` : '') +
        `<div class="a-demontrer">À démontrer${n > 1 ? ` en ${n} étapes` : ''} : ${versHtml(texteFait(ex.montrer))}</div>`;
}

/* ---------- Mode « phrases proposées » : les listes ---------- */

const RUBRIQUES = [
    ['perp', 'Perpendicularité'],
    ['para', 'Parallélisme'],
    ['egal', 'Égalité de longueurs'],
    ['surCercle', 'Appartenance à un cercle'],
    ['appartient', 'Appartenance à une droite'],
    ['surMed', 'Appartenance à une médiatrice'],
    ['mediatrice', 'Médiatrice'],
    ['milieu', 'Milieu']
];

// « Donc » : toutes les phrases d'une même sorte qu'on peut écrire avec les objets de la
// figure (seulement les sortes utiles à l'exercice : celles des données et de ce qu'on en déduit).
function rubriquesPossibles() {
    const ex = exerciceCourant;
    const types = analyserExercice(ex).types;
    const points = ex.pts.map(p => p.nom);
    const extremites = s => [...s.slice(1, -1)];
    // un segment porté par la droite n'a rien à faire avec elle (⊥, milieu, médiatrice)
    const porte = (d, s) => extremites(s).every(n => (ex.sur[d] || []).includes(n));
    const droiteSegment = type => ex.droites.flatMap(d =>
        ex.segments.filter(s => !porte(d, s)).map(s => ({ type, a: d, b: s })));
    const paires = type => ex.droites.flatMap((a, i) => ex.droites.slice(i + 1).map(b => ({ type, a, b })));
    const liste = {
        surCercle: () => ex.cercles.flatMap(c => points.filter(n => n !== c.centre).map(n => ({ type: 'surCercle', a: n, b: c.nom }))),
        appartient: () => ex.droites.flatMap(d => points.map(n => ({ type: 'appartient', a: n, b: d }))),
        // deux segments tracés qui partent d'un même point : MA = MB
        egal: () => points.flatMap(n => {
            const depuis = ex.segments.filter(s => extremites(s).includes(n)).map(s => n + extremites(s).find(x => x !== n));
            return depuis.flatMap((a, i) => depuis.slice(i + 1).map(b => ({ type: 'egal', a, b })));
        }),
        surMed: () => ex.segments.flatMap(s => points.filter(n => !extremites(s).includes(n)).map(n => ({ type: 'surMed', a: n, b: s }))),
        mediatrice: () => droiteSegment('mediatrice'),
        perp: () => [...droiteSegment('perp'), ...paires('perp')],
        milieu: () => droiteSegment('milieu'),
        para: () => paires('para')
    };
    // Parallèles et perpendiculaires : toujours les deux sortes de phrases.
    const utiles = CHAP.nom === 'droites' ? new Set(['perp', 'para']) : types;
    return RUBRIQUES.filter(([type]) => utiles.has(type))
        .map(([type, titre]) => ({ titre, faits: liste[type]() }))
        .filter(r => r.faits.length);
}

// « On a » : ce qu'on sait (les données, puis les conclusions des étapes validées).
function rubriquesConnues() {
    const ex = exerciceCourant;
    const vus = new Set(ex.hypotheses.map(cleFait));
    const demontres = [];
    etapesValidees().forEach(e => {
        if (vus.has(cleFait(e.concl))) return;
        vus.add(cleFait(e.concl));
        demontres.push(e.concl);
    });
    return [
        { titre: CHAP.nom === 'droites' ? 'Les données (codages de la figure)' : 'Les données (énoncé et codages de la figure)', faits: ex.hypotheses },
        { titre: 'Ce que tu as déjà démontré', faits: demontres }
    ].filter(r => r.faits.length);
}

/* ---------- Réglages de la séance ----------
   Le chapitre et le mode se choisissent sur l'écran d'accueil (diplome.js), avant de
   commencer. Ensuite ils sont seulement affichés dans l'entête : l'élève ne peut plus les
   changer sans recharger la page (et repasser par l'accueil). */

const CLE_MODE = 'demonstration.mode';
try { modePropositions = localStorage.getItem(CLE_MODE) === 'propositions'; } catch (e) {}

const etiquetteMode = document.createElement('span');
etiquetteMode.className = 'reglage-affiche';
function afficherMode() {
    etiquetteMode.textContent = modePropositions ? '📋 Phrases proposées' : '✏️ Phrases à construire';
    etiquetteMode.title = modePropositions
        ? "Réglage de la séance : l'élève choisit ses phrases dans une liste."
        : "Réglage de la séance : l'élève construit ses phrases lui-même.";
}

function fixerMode(propositions) {
    modePropositions = propositions;
    try { localStorage.setItem(CLE_MODE, propositions ? 'propositions' : 'construire'); } catch (e) {}
    afficherMode();
    if (exerciceCourant) afficherEtapes(); // le nombre de cases « On a » peut dépendre du mode
}

// Changer de chapitre recharge la page sur l'autre chapitre (ses exercices, ses propriétés, sa note).
function changerChapitre(nom) {
    try { localStorage.setItem(CLE_CHAPITRE, nom); } catch (e) {}
    // Une adresse avec ?chapitre=… l'emporterait sur le choix : on la met à jour.
    const adresse = new URL(window.location.href);
    if (adresse.searchParams.has('chapitre')) {
        adresse.searchParams.set('chapitre', nom);
        window.location.href = adresse.href;
    } else {
        window.location.reload();
    }
}

function installerReglages(conteneur) {
    document.getElementById('nomChapitre').textContent = CHAP.titre;
    document.title = 'Démonstration - ' + CHAP.diplome;
    afficherMode();
    conteneur.append(etiquetteMode);
}

function afficherExercice(i) {
    if (indexExercice >= 0 && exerciceCourant) travaux[indexExercice] = sauverTravail();
    indexExercice = i;
    fermerChoix();
    mettreAJourBoutonsExercices();

    if (EXERCICES[i].erreur) {
        exerciceCourant = null;
        viderBlocs();
        afficherButFinal(null);
        viderFigure();
        alerte(EXERCICES[i].erreur, 'erreur');
        return;
    }
    if (!permutations[i]) permutations[i] = tirerPermutation(EXERCICES[i].droites);
    const ex = exerciceCourant = renommerExercice(EXERCICES[i], permutations[i]);

    figureCourante = ex;
    fixerNotations(ex);
    afficherButFinal(ex);
    dessinerExercice(ex);
    codesRouges.clear();

    if (travaux[i]) chargerTravail(travaux[i]);
    else travailInitial();
    // Seul ce que la démonstration affichée a déjà démontré est codé en rouge sur la figure
    // (un exercice réussi puis recommencé repart d'une figure sans sa conclusion).
    etapesValidees().forEach(e => coderDemontre(e.concl));
    afficherConsigne();
}

/* ---------- Une étape à la fois ---------- */

// Les étapes telles que la vérification les lit : une phrase à deux points
// (« E et F appartiennent à la médiatrice de [AB] ») compte pour deux informations.
function etapesLues(liste) {
    return liste.map(e => {
        const f = e.f1;
        if (!f || f.type !== 'surMed2') return e;
        return { ...e, f1: { type: 'surMed', a: f.a, b: f.b }, f2: { type: 'surMed', a: f.c, b: f.b } };
    });
}

// Informations déjà codées en rouge sur la figure affichée (pour ne pas coder deux fois).
const codesRouges = new Set();

function coderDemontre(f) {
    const cle = cleFait(f);
    if (codesRouges.has(cle) || exerciceCourant.hypotheses.some(h => cleFait(h) === cle)) return;
    codesRouges.add(cle);
    coder(f, COULEUR_BUT);
}

function etapesValidees() {
    return lireEtapes().filter(e => e.valide);
}

// « On a » n'accepte que ce qu'on sait : les données et les conclusions des étapes validées.
// Retourne null si la phrase est connue, sinon le message qui explique le refus.
function refusOnA(f) {
    // « E et F appartiennent à la médiatrice de [AB] » : les deux doivent être connus.
    if (f.type === 'surMed2') return refusOnA({ type: 'surMed', a: f.a, b: f.b }) || refusOnA({ type: 'surMed', a: f.c, b: f.b });
    const ex = exerciceCourant;
    // Les noms de médiatrices : les notations de l'énoncé, et les droites déjà démontrées médiatrices.
    fixerNotations(ex);
    etapesValidees().forEach(e => { if (e.concl.type === 'mediatrice') nommerMediatrice(e.concl.a, e.concl.b); });
    const cle = cleFait(f);
    if (ex.hypotheses.some(h => cleFait(h) === cle)) return null;
    if (etapesValidees().some(e => cleFait(e.concl) === cle)) return null;
    // Un seul message, sans dire si la phrase est vraie ou fausse : les deux questions
    // sont posées à chaque fois, c'est à l'élève d'y répondre.
    return `« ${texteFait(f)} » n'est pas une donnée de l'énoncé. Est-ce vrai ? L'as-tu démontré ?`;
}

// Valide l'étape en cours (la seule qui n'est pas encore validée). Sa conclusion rejoint
// alors ce qu'on sait, et on peut ajouter l'étape suivante.
function validerEtape() {
    const ex = exerciceCourant;
    if (!ex) return;
    const validees = lireEtapes().filter(e => e.valide);
    const courante = lireEtapes().find(e => !e.valide);
    if (!courante) {
        const fini = verifierDemonstration(ex, etapesLues(validees)).ok;
        alerte(fini ? `Ta démonstration est terminée : tu as démontré que ${texteFait(ex.montrer)}.`
            : 'Toutes tes étapes sont validées. Clique sur « + Étape » pour continuer.', fini ? 'succes' : 'info');
        return;
    }
    const resultat = verifierDemonstration(ex, etapesLues([...validees, courante]));
    // Une seule étape, sans titre : le message ne commence pas par « Étape 1 : ».
    if (etapeSeule() && resultat.etape !== null) {
        const texte = resultat.message.replace(/^Étape 1 : /, '');
        resultat.message = texte.charAt(0).toUpperCase() + texte.slice(1);
    }
    if (resultat.etape !== null) {
        // Seule une étape remplie mais fausse coûte des points (pas une case vide).
        let message = resultat.message;
        if (courante.f1 || courante.f2) if (courante.prop && courante.concl) {
            noterEchec(indexExercice);
            const n = echecs[indexExercice], max = ptsMax(indexExercice);
            message += n >= 3
                ? ' Cet exercice ne rapporte plus de points : tu peux le finir, puis le recommencer.'
                : ` (Il vaut maintenant ${fmt(max * coefficient(n))} point${max * coefficient(n) >= 2 ? 's' : ''} au lieu de ${fmt(max)}.)`;
        }
        signalerErreur(courante, resultat.message);
        alerte(message, 'erreur');
        return;
    }
    validerBloc(courante);
    coderDemontre(courante.concl);
    if (resultat.ok) {
        const p = noterReussite(indexExercice), max = ptsMax(indexExercice);
        let message = `${resultat.message} ⭐ ${fmt(p)} / ${fmt(max)}`;
        if (p < max) message += ` (Recommencer pour viser ${fmt(max)})`;
        alerte(message, 'succes');
        return;
    }
    alerte(`Étape ${validees.length + 1} validée : maintenant tu sais que ${texteFait(courante.concl)}. ` +
        'Clique sur « + Étape » pour continuer.', 'succes');
}

// Une nouvelle étape seulement quand la précédente est validée.
function demanderEtape() {
    if (exerciceCourant) {
        if (lireEtapes().some(e => !e.valide)) {
            alerte("Valide d'abord l'étape en cours avec « Valider l'étape ».", 'info');
            return;
        }
        if (verifierDemonstration(exerciceCourant, etapesLues(lireEtapes())).ok) {
            alerte(`Ta démonstration est terminée : tu as démontré que ${texteFait(exerciceCourant.montrer)}.`, 'succes');
            return;
        }
    }
    ajouterEtape();
}

function recommencer() {
    delete travaux[indexExercice];
    delete permutations[indexExercice];
    oublierEchecs(indexExercice);
    const i = indexExercice;
    indexExercice = -1; // pas de sauvegarde du travail qu'on abandonne
    afficherExercice(i);
}

document.getElementById('btnVerifier').onclick = validerEtape;
document.getElementById('btnAjouterEtape').onclick = demanderEtape;
document.getElementById('btnRecommencer').onclick = recommencer;
document.getElementById('closeAlert').onclick = fermerAlerte;
afficherConsigne();

/* ---------- Entête : Nouvel onglet + Guide ---------- */

function installerBoutonNouvelOnglet() {
    const conteneur = document.getElementById('topButtonsBar');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-header';
    btn.textContent = 'Nouvel onglet';

    const repli = document.createElement('span');
    repli.style.cssText = 'display:none; font-size:0.8em; margin-left:8px;';
    repli.innerHTML = `Bloqué — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

    // L'élève garde son nom dans le nouvel onglet (voir diplome.js).
    btn.onclick = () => {
        if (!ouvrirNouvelOnglet()) repli.style.display = 'inline';
    };

    conteneur.append(btn, repli);
}

installerEntete(document.getElementById('topButtonsBar'));
installerReglages(document.getElementById('topButtonsBar'));
installerBoutonNouvelOnglet();
new GuideAppli().installerBouton(document.getElementById('topButtonsBar'));

/* ---------- Démarrage GeoGebra ---------- */

/* ---------- Démonstration « élève qui clique au hasard » (probabilités) ----------
   Lancée depuis l'écran d'accueil ou par « &demo » dans l'adresse ; le code est dans
   outils/bot-hasard.js, chargé seulement à ce moment-là. */

// Exercices en une seule étape : les seuls qu'un tirage au hasard peut réussir.
function exercicesPourDemo() {
    return EXERCICES.map((ex, i) => i).filter(i => !EXERCICES[i].erreur && analyserExercice(EXERCICES[i]).etapes === 1);
}

function lancerDemo(exercice) {
    if (window.botDemo) { botDemo({ exercice }); return; }
    const script = document.createElement('script');
    script.src = 'outils/bot-hasard.js';
    script.onload = () => botDemo({ exercice });
    script.onerror = () => alerte("La démonstration n'a pas pu se charger : le dossier « outils » manque à côté de l'appli.", 'erreur');
    document.head.append(script);
}

async function demarrer() {
    await chargerExercices();
    construireBoutonsExercices();
    if (!EXERCICES.length) { alerte(`Aucun fichier ${CHAP.fichiers}1.txt trouvé.`, 'erreur'); return; }
    afficherExercice(0);
    demanderNom(() => afficherExercice(indexExercice));
    // « &demo » dans l'adresse : démonstration d'un élève qui clique au hasard.
    const parametres = new URLSearchParams(window.location.search);
    if (parametres.has('demo')) lancerDemo(parseInt(parametres.get('exercice'), 10) || 1);
    document.getElementById('btnVerifier').disabled = false;
    document.getElementById('btnRecommencer').disabled = false;
    document.getElementById('btnAjouterEtape').disabled = false;
}

new GGBApplet({
    appName: 'classic',
    perspective: 'G',
    width: 400,
    height: 400,
    showToolBar: false,
    showAlgebraInput: false,
    showMenuBar: false,
    showResetIcon: false,
    enableLabelDrags: true,
    enableShiftDragZoom: false,
    enableRightClick: false,
    errorDialogsActive: false,
    // Suit la taille du cadre (en rem), y compris en agrandissant.
    scaleContainerClass: 'ggb-cadre',
    allowUpscale: true,
    appletOnLoad: () => {
        ggbApplet = window.ggbApplet;
        demarrer();
    }
}, true).inject('ggb-element');
