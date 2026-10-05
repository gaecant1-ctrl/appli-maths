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

// Nombre minimal d'étapes pour obtenir la conclusion à partir des informations de départ
// (chaque étape ajoute tout ce qu'on peut conclure avec deux informations connues).
function nbEtapesMin(ex) {
    const cleBut = cleFait(ex.montrer);
    const connus = new Map(ex.hypotheses.map(f => [cleFait(f), f]));
    for (let n = 1; n <= 5; n++) {
        const faits = [...connus.values()];
        const nouveaux = [];
        faits.forEach((f1, i) => faits.forEach((f2, j) => {
            if (i === j) return;
            Object.keys(PROPRIETES).forEach(p => {
                const r = appliquerPropriete(p, f1, f2);
                if (r.conclusion && r.conclusion.a !== r.conclusion.b) nouveaux.push(r.conclusion);
            });
        }));
        if (nouveaux.some(f => cleFait(f) === cleBut)) return n;
        nouveaux.forEach(f => connus.set(cleFait(f), f));
    }
    return null;
}

// Exercices en plusieurs étapes : on annonce la conclusion finale attendue.
function afficherButFinal(ex) {
    const but = document.getElementById('butFinal');
    const n = ex ? nbEtapesMin(ex) : null;
    but.hidden = !n || n < 2;
    if (!but.hidden) but.innerHTML = `À démontrer en ${n} étapes : ` + versHtml(texteFait(ex.montrer));
}

function afficherExercice(i) {
    if (indexExercice >= 0) travaux[indexExercice] = Blockly.serialization.workspaces.save(workspace);
    indexExercice = i;
    mettreAJourBoutonsExercices();

    if (EXERCICES[i].erreur) {
        exerciceCourant = null;
        afficherButFinal(null);
        viderFigure();
        alerte(EXERCICES[i].erreur, 'erreur');
        return;
    }
    if (!permutations[i]) permutations[i] = tirerPermutation(EXERCICES[i].droites);
    const ex = exerciceCourant = renommerExercice(EXERCICES[i], permutations[i]);

    droitesCourantes = ex.droites;
    afficherButFinal(ex);
    dessinerExercice(ex);
    if (exerciceReussi(i)) coderConclusion(ex);

    if (travaux[i]) {
        workspace.clear();
        Blockly.serialization.workspaces.load(travaux[i], workspace);
        workspace.getAllBlocks(false).forEach(figer); // le menu contextuel n'est pas sauvegardé
    } else {
        espaceDeTravailInitial();
    }
    afficherConsigne();
}

/* ---------- Vérification ---------- */

function verifier() {
    const ex = exerciceCourant;
    if (!ex) return;
    workspace.getAllBlocks(false).forEach(b => b.setWarningText(null));

    const etapes = lireEtapes();
    const resultat = verifierDemonstration(ex, etapes);

    if (resultat.ok) {
        if (!exerciceReussi(indexExercice)) coderConclusion(ex);
        const p = noterReussite(indexExercice), max = ptsMax(indexExercice);
        let message = `${resultat.message} ⭐ ${fmt(p)} / ${fmt(max)}`;
        if (p < max) message += ` (Recommencer pour viser ${fmt(max)})`;
        alerte(message, 'succes');
        return;
    }
    // Seule une étape remplie mais fausse coûte des points (pas une case vide,
    // ni une démonstration juste qui n'est pas encore allée jusqu'au bout).
    const e = resultat.etape !== null ? etapes[resultat.etape] : null;
    if (e && e.f1 && e.f2 && e.prop && e.concl) noterEchec(indexExercice);

    const libres = workspace.getAllBlocks(false).filter(b => b.type === 'etape' && !etapes.some(e => e.bloc === b));
    let message = resultat.message;
    if (libres.length && resultat.etape === null) {
        message += " Attention : un bloc Étape n'est pas accroché au bloc Démonstration.";
    }
    if (resultat.etape !== null) {
        const bloc = etapes[resultat.etape].bloc;
        bloc.setWarningText(resultat.message);
        bloc.select();
    }
    alerte(message, 'erreur');
}

function recommencer() {
    delete travaux[indexExercice];
    delete permutations[indexExercice];
    oublierEchecs(indexExercice);
    const i = indexExercice;
    indexExercice = -1; // pas de sauvegarde du travail qu'on abandonne
    afficherExercice(i);
}

document.getElementById('btnVerifier').onclick = verifier;
document.getElementById('btnAjouterEtape').onclick = ajouterEtape;
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
installerBoutonNouvelOnglet();
new GuideAppli().installerBouton(document.getElementById('topButtonsBar'));

/* ---------- Démarrage GeoGebra ---------- */

async function demarrer() {
    await chargerExercices();
    construireBoutonsExercices();
    if (!EXERCICES.length) { alerte("Aucun fichier exercice1.txt trouvé.", 'erreur'); return; }
    afficherExercice(0);
    demanderNom(() => afficherExercice(indexExercice));
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
