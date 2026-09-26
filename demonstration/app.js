/* ============================================================
   APPLICATION : exercices, vérification, messages
   ============================================================ */

let indexExercice = -1;
const exercicesReussis = new Set();
// Travail de l'élève gardé par exercice (on peut changer d'exercice et revenir).
const travaux = {};
// Noms des droites mélangés à la 1re ouverture de chaque exercice, puis gardés
// pendant la séance (le travail sauvegardé utilise ces noms). « Recommencer » en tire d'autres.
const permutations = {};
let exerciceCourant = null;

const CONSIGNE = "Démontre la propriété demandée en assemblant les blocs.";

function afficherConsigne() {
    const c = document.getElementById('messageContainer');
    document.getElementById('messageAlerte').innerText = CONSIGNE;
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
        btn.classList.toggle('reussi', exercicesReussis.has(i));
    });
}

/* ---------- Affichage d'un exercice ---------- */

function afficherEnonce(ex) {
    const liste = document.getElementById('listeDonnees');
    liste.innerHTML = '';
    ex.donnees.forEach(f => {
        const li = document.createElement('li');
        li.innerHTML = versHtml(texteFait(f));
        liste.appendChild(li);
    });
    if (ex.codages.length) {
        const li = document.createElement('li');
        li.className = 'donnee-codage';
        li.textContent = ex.donnees.length ? '+ les codages de la figure' : 'Lis les codages sur la figure';
        liste.appendChild(li);
    }
    document.getElementById('texteMontrer').innerHTML = versHtml(texteFait(ex.montrer));
}

function afficherExercice(i) {
    if (indexExercice >= 0) travaux[indexExercice] = Blockly.serialization.workspaces.save(workspace);
    indexExercice = i;
    mettreAJourBoutonsExercices();

    if (EXERCICES[i].erreur) {
        exerciceCourant = null;
        viderFigure();
        alerte(EXERCICES[i].erreur, 'erreur');
        return;
    }
    if (!permutations[i]) permutations[i] = tirerPermutation(EXERCICES[i].droites);
    const ex = exerciceCourant = renommerExercice(EXERCICES[i], permutations[i]);

    droitesCourantes = ex.droites;
    rafraichirPalette();
    dessinerExercice(ex);
    if (exercicesReussis.has(i)) coderConclusion(ex);
    afficherEnonce(ex);

    if (travaux[i]) {
        workspace.clear();
        Blockly.serialization.workspaces.load(travaux[i], workspace);
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
        if (!exercicesReussis.has(indexExercice)) coderConclusion(ex);
        exercicesReussis.add(indexExercice);
        mettreAJourBoutonsExercices();
        alerte(resultat.message, 'succes');
        return;
    }

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
    const i = indexExercice;
    indexExercice = -1; // pas de sauvegarde du travail qu'on abandonne
    afficherExercice(i);
}

document.getElementById('btnVerifier').onclick = verifier;
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

    btn.onclick = () => {
        const w = window.open(window.location.href, '_blank', 'noopener');
        if (!w) repli.style.display = 'inline';
    };

    conteneur.append(btn, repli);
}

installerBoutonNouvelOnglet();
new GuideAppli().installerBouton(document.getElementById('topButtonsBar'));

/* ---------- Démarrage GeoGebra ---------- */

async function demarrer() {
    await chargerExercices();
    construireBoutonsExercices();
    if (EXERCICES.length) afficherExercice(0);
    else alerte("Aucun fichier exercice1.txt trouvé.", 'erreur');
    document.getElementById('btnVerifier').disabled = false;
    document.getElementById('btnRecommencer').disabled = false;
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
    appletOnLoad: () => {
        ggbApplet = window.ggbApplet;
        demarrer();
    }
}, true).inject('ggb-element');
