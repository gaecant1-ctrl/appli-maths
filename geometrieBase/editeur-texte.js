/* ============================================================
   MODE TEXTE (ÉLÈVE) : exécution d'une ligne via construire.*
   ============================================================ */

// (AB)/(BC)... -> droite de référence ; [AB]/[BC]... -> segment de référence ;
// (nom)/[nom]/nom -> point ou objet déjà nommé par l'élève (résolu par construire.*).
function resoudreArgumentEleve(texte) {
    texte = texte.trim();
    let m;
    if ((m = texte.match(/^\(([A-Za-z])([A-Za-z])\)$/))) return construire.refDroite(m[1], m[2]);
    if ((m = texte.match(/^\[([A-Za-z])([A-Za-z])\]$/))) return construire.refSegment(m[1], m[2]);
    // Doit être vérifié AVANT le motif générique ci-dessous : "[BI)" ressemble à un nom
    // local unique entre crochets/parenthèses, mais désigne bien la demi-droite [BI).
    if ((m = texte.match(/^\[([A-Za-z])([A-Za-z])\)$/))) return obtenirDemiDroite(resoudre(m[1]), resoudre(m[2]));
    if ((m = texte.match(/^[\(\[]([A-Za-z]\w*)[\)\]]$/))) return m[1];
    return texte;
}

// Exécute une ligne tapée par l'élève (async, comme le code généré par Blockly).
// Lève une erreur explicite si la ligne n'est reconnue par aucun modèle.
async function executerLigneEleve(ligneBrute) {
    const { nomInline, nomInlineComplet, ligne: ligneSansNom } = extraireNomInline(ligneBrute.trim());
    const ligne = ligneSansNom;
    const ref = (t) => resoudreArgumentEleve(t);
    let m;

    if ((m = ligne.match(/^tracer la droite passant par (\S+) et (\S+)$/i))) {
        await construire.tracerDroite(ref(m[1]), ref(m[2]));
    } else if ((m = ligne.match(/^tracer \(([A-Za-z])([A-Za-z])\)$/i))) {
        // Raccourci : "tracer (AB)" équivaut à "tracer la droite passant par A et B".
        await construire.tracerDroite(m[1], m[2]);
    } else if ((m = ligne.match(/^tracer le segment(?:\s+d'extr[ée]mit[ée]s (\S+) et (\S+)|\s*\[([A-Za-z])([A-Za-z])\])$/i))) {
        await construire.tracerSegment(ref(m[1] || m[3]), ref(m[2] || m[4]));
    } else if ((m = ligne.match(/^tracer \[([A-Za-z])([A-Za-z])\]$/i))) {
        // Raccourci : "tracer [AB]" équivaut à "tracer le segment d'extrémités A et B".
        await construire.tracerSegment(m[1], m[2]);
    } else if ((m = ligne.match(/^tracer la demi-droite d'origine (\S+) passant par (\S+)$/i))) {
        await construire.tracerDemiDroite(ref(m[1]), ref(m[2]));
    } else if ((m = ligne.match(/^tracer \[([A-Za-z])([A-Za-z])\)$/i))) {
        // Raccourci : "tracer [AB)" équivaut à "tracer la demi-droite d'origine A passant par B".
        await construire.tracerDemiDroite(m[1], m[2]);
    } else if ((m = ligne.match(/^tracer le cercle de centre (\S+) passant par (\S+)$/i))) {
        await construire.tracerCercle(ref(m[1]), ref(m[2]));
    } else if ((m = ligne.match(/^tracer la droite parall[èe]le [àa] (\S+) passant par (\S+)$/i))) {
        await construire.tracerParallele(ref(m[1]), ref(m[2]));
    } else if ((m = ligne.match(/^tracer la droite perpendiculaire [àa] (\S+) passant par (\S+)$/i))) {
        await construire.tracerPerpendiculaire(ref(m[1]), ref(m[2]));
    } else if ((m = ligne.match(/^tracer la m[ée]diatrice de (\S+)$/i))) {
        await construire.tracerMediatrice(ref(m[1]));
    } else if ((m = ligne.match(/^placer le milieu d[ue](?:\s+segment)?\s+(\S+)$/i))) {
        await construire.placerMilieu(ref(m[1]));
    } else if ((m = ligne.match(/^placer le point d'intersection visible entre (\S+) et (\S+)$/i))) {
        await construire.placerIntersection(ref(m[1]), ref(m[2]));
    } else if ((m = ligne.match(/^tracer le polygone ([A-Za-z]+)$/i))) {
        await construire.tracerPolygone(m[1].split(''));
    } else if ((m = ligne.match(/^nommer\s+(.+)$/i))) {
        const texteComplet = m[1].trim();
        const nomInterne = texteComplet.replace(/^[\(\[]|[\)\]]$/g, '');
        await construire.nommer(nomInterne, texteComplet);
    } else if ((m = ligne.match(/^coder\s+(.+)$/i))) {
        // Codage pédagogique sur SA PROPRE construction, purement visuel — n'entre pas
        // en compte dans la validation (tout va dans objetsAuxiliaires, jamais
        // objetsConstruits) :
        //   "coder AI=CI"        -> longueurs égales (autant de segments que voulu)
        //   "coder (AB)perp(CD)" -> angle droit entre deux droites/segments
        const contenu = m[1].trim();
        let mp;
        if ((mp = contenu.match(/^([\(\[][A-Za-z]\w*[\)\]])\s*perp\s*([\(\[][A-Za-z]\w*[\)\]])$/i))) {
            // (AB)/[AB] : paire de points -> refDroite/refSegment renvoie déjà le vrai nom
            // GeoGebra. (m)/[m] : nom donné par l'élève (ex: via "tracer (m) la droite...")
            // -> resoudreArgumentEleve renvoie juste le label brut, donc on le résout ici
            // (comme le font tracerPerpendiculaire/tracerParallele en interne).
            const ref1 = resoudre(resoudreArgumentEleve(mp[1]));
            const ref2 = resoudre(resoudreArgumentEleve(mp[2]));
            marquerAngleDroit(ref1, ref2);
        } else {
            const noms = contenu.split('=').map(s => s.trim());
            if (noms.length < 2 || noms.some(nom => !/^[A-Za-z]{2}$/.test(nom))) {
                throw new Error(`syntaxe de codage invalide : "${ligne}" (attendu : "coder AB=CD" ou "coder (AB)perp(CD)")`);
            }
            compteurCodageEleve++;
            const segments = noms.map(nom => construire.refSegment(nom[0], nom[1]));
            marquerSegmentsEgaux(segments, compteurCodageEleve);
        }
    } else {
        throw new Error(`instruction non reconnue : "${ligne}"`);
    }

    if (nomInline) {
        await construire.nommer(nomInline, nomInlineComplet);
    }
}

/* ============================================================
   EDITEUR AVANCÉ : 3 MODES & COLORATION SYNTAXIQUE EN TEMPS RÉEL
   ============================================================ */

let modePedagogique = 'apprentissage'; // 'apprentissage', 'evaluation', 'expert'

const GRAMMAIRE_PREDICTION = {
    "tracer": ["la", "le"], "placer": ["le"], "nommer": [], "coder": [],
    "la": ["droite", "demi-droite", "médiatrice"],
    "le": ["segment", "cercle", "milieu", "point", "polygone"],
    "droite": ["passant", "parallèle", "perpendiculaire"],
    "demi-droite": ["d'origine"], "segment": ["d'extrémités"],
    "cercle": ["de"], "milieu": ["du", "de"], "médiatrice": ["de"], "polygone": [],
    "point": ["d'intersection"], "d'intersection": ["visible"], "visible": ["entre"],
    "passant": ["par"], "parallèle": ["à"], "perpendiculaire": ["à"],
    // "de" est un noeud partagé par "cercle de" (-> centre) et "milieu de"/"médiatrice de"
    // (-> rien de plus, on attend directement une référence). Sans contexte on ne peut pas
    // deviner lequel : "de" seul ne propose donc rien, et "GRAMMAIRE_PREDICTION_COMPOSEE"
    // ci-dessous précise le cas "cercle de" en priorité (voir predictionSuivante).
    "d'origine": [], "d'extrémités": ["et"], "de": [], "du": ["segment"], "centre": [], "par": [], "à": [], "entre": ["et"]
};

// Prédictions à 2 mots, prioritaires sur GRAMMAIRE_PREDICTION quand le mot précédent
// désambiguïse un noeud partagé (ex: "de" après "cercle" vs après "milieu"/"médiatrice").
const GRAMMAIRE_PREDICTION_COMPOSEE = {
    "cercle de": ["centre"]
};

// Renvoie la liste des mots attendus après "mot", en tenant compte du mot D'AVANT "mot"
// quand ça change la réponse (voir GRAMMAIRE_PREDICTION_COMPOSEE).
function predictionSuivante(mot, motAvant) {
    const motMin = mot.toLowerCase();
    if (motAvant) {
        const cle = `${motAvant.toLowerCase()} ${motMin}`;
        if (GRAMMAIRE_PREDICTION_COMPOSEE[cle]) return GRAMMAIRE_PREDICTION_COMPOSEE[cle];
    }
    return GRAMMAIRE_PREDICTION[motMin] || [];
}

const MOTS_DEPART = ["tracer", "placer", "nommer", "coder"];
let indexSuggestionActive = 0;

// Synchronise le défilement du textarea avec le miroir de couleur derrière
const textarea = document.getElementById('ligneInput');
const miroir = document.getElementById('editeurMiroir');
textarea.addEventListener('scroll', () => { miroir.scrollTop = textarea.scrollTop; });

function obtenirTokenEnCours() {
    const positionCurseur = textarea.selectionStart;
    const texte = textarea.value;
    const texteAvantCurseur = texte.substring(0, positionCurseur);
    const lignes = texteAvantCurseur.split('\n');
    const ligneCourante = lignes[lignes.length - 1];

    const finiParEspace = /\s$/.test(texteAvantCurseur);
    const mots = ligneCourante.trim().split(/\s+/).filter(m => m.length > 0);

    const motActuel = (finiParEspace || mots.length === 0) ? "" : mots[mots.length - 1];
    const indexMotPrecedent = finiParEspace ? mots.length - 1 : mots.length - 2;
    const motPrecedent = mots[indexMotPrecedent];
    const motAvantPrecedent = mots[indexMotPrecedent - 1];

    return { textenettement: texte, positionCurseur, motActuel, motPrecedent, motAvantPrecedent, finiParEspace, motsLigne: mots };
}

// Analyse la ligne pour savoir si chaque mot respecte la grammaire
function analyserSyntaxeLigne(ligne, motEnCoursDeFrappe) {
    const mots = ligne.split(/\s+/).filter(m => m.length > 0);
    let htmlTokens = [];
    let attendu = MOTS_DEPART;
    let auMoinsUneErreur = false;

    mots.forEach((mot, idx) => {
        // Candidats de préfixe pour le mot en cours de frappe (dernier mot de la ligne,
        // pas encore terminé) : liste des mots-clés attendus qui commencent par ce préfixe.
        const estDernierMotEnFrappe = motEnCoursDeFrappe && idx === mots.length - 1;
        const candidatsPossibles = estDernierMotEnFrappe
            ? (attendu.length > 0 ? attendu : Object.keys(GRAMMAIRE_PREDICTION))
                .filter(candidat => candidat.toLowerCase().startsWith(mot.toLowerCase()))
            : [];

        // Un mot-clé de la grammaire tapé avec une majuscule (ex: "Placer" en début de
        // phrase, réflexe naturel) ne doit jamais être pris pour une variable — y compris
        // encore incomplet pendant la frappe (ex: "Pl", "Plac"...).
        const estMotCleConnu = MOTS_DEPART.includes(mot.toLowerCase()) ||
            Object.prototype.hasOwnProperty.call(GRAMMAIRE_PREDICTION, mot.toLowerCase()) ||
            candidatsPossibles.length > 0;

        // Détection des variables (Points ou Objets géométriques comme [AB], (d), A)
        const estVariable = !estMotCleConnu &&
            (mot[0] === mot[0].toUpperCase() && mot[0] !== mot[0].toLowerCase() || /^[\[\(\]].*[\]\)]$/.test(mot));

        // Nom inline ("tracer nom la droite...") : un mot juste après tracer/placer qui
        // n'est ni "la"/"le" ni déjà reconnu comme variable (ex: nom en minuscules sans
        // parenthèses). L'attente reste inchangée pour que le mot suivant (la/le) soit
        // toujours validé normalement.
        const motPrecedent = mots[idx - 1];
        const estNomInline = motPrecedent && !estVariable &&
            ['tracer', 'placer'].includes(motPrecedent.toLowerCase()) &&
            !['la', 'le'].includes(mot.toLowerCase());

        if (estNomInline) {
            htmlTokens.push(`<span style="color: var(--col-nom-inline); font-weight: bold;">${mot}</span>`);
            // attendu ne change pas : on garde ce qui était prévu après tracer/placer (la/le)
        } else if (estVariable) {
            htmlTokens.push(`<span style="color: var(--col-variable); font-weight: bold;">${mot}</span>`);
            // Après une variable, on réinitialise l'attente sur les suites possibles du mot précédent
            const motAvantVar = mots[idx - 1];
            attendu = motAvantVar ? predictionSuivante(motAvantVar, mots[idx - 2]) : [];
        } else if (attendu.includes(mot.toLowerCase()) || attendu.length === 0 && GRAMMAIRE_PREDICTION[mot.toLowerCase()]) {
            // Mot-clé valide
            htmlTokens.push(`<span style="color: var(--col-mot-cle);">${mot}</span>`);
            attendu = predictionSuivante(mot, mots[idx - 1]);
        } else if (estDernierMotEnFrappe && candidatsPossibles.length > 0) {
            // Mot encore incomplet mais préfixe valide d'au moins un mot-clé attendu.
            if (candidatsPossibles.length === 1) {
                // Un seul mot-clé possible : plus la peine d'attendre la fin du mot pour le
                // colorer en valide (ex: "pl" ne peut déjà plus être que "placer").
                htmlTokens.push(`<span style="color: var(--col-mot-cle);">${mot}</span>`);
            } else {
                // Encore ambigu entre plusieurs mots-clés : ni valide ni erreur pour l'instant.
                htmlTokens.push(`<span style="color: var(--editeur-fg); opacity: 0.6;">${mot}</span>`);
            }
            // On ne touche pas à "attendu" : le mot n'est pas encore validé
        } else {
            // Erreur de syntaxe ou mot inattendu
            htmlTokens.push(`<span style="text-decoration: underline wavy var(--col-erreur); color: var(--col-erreur);">${mot}</span>`);
            auMoinsUneErreur = true;
            attendu = []; // On bloque la suite du pattern sur cette erreur
        }
    });

    return { html: htmlTokens.join(' '), aUneErreur: auMoinsUneErreur };
}

function colorerEditeur() {
    const texte = textarea.value;
    const lignes = texte.split('\n');

    // Détecte la ligne/le mot en cours de frappe (curseur juste après, sans espace derrière)
    // pour ne pas le marquer en erreur tant qu'il n'est pas terminé.
    const texteAvantCurseur = texte.substring(0, textarea.selectionStart);
    const lignesAvantCurseur = texteAvantCurseur.split('\n');
    const ligneActiveIndex = lignesAvantCurseur.length - 1;
    const colonneCurseur = lignesAvantCurseur[lignesAvantCurseur.length - 1].length;

    // Chaque ligne est un <div> distinct (repéré par data-idx) plutôt que du texte
    // séparé par des "\n" : ça permet de surligner une ligne précise pendant
    // l'exécution pas à pas, sans rien changer à l'alignement avec la textarea
    // (chaque div occupe naturellement une ligne, comme un retour à la ligne).
    const lignesColorees = lignes.map((ligne, i) => {
        const motEnCoursDeFrappe = i === ligneActiveIndex && colonneCurseur === ligne.length && ligne.length > 0 && !/\s$/.test(ligne);
        const html = analyserSyntaxeLigne(ligne, motEnCoursDeFrappe).html;
        return `<div class="ligne-editeur" data-idx="${i}">${html || '&nbsp;'}</div>`;
    });
    miroir.innerHTML = lignesColorees.join('');
}

// Surligne la ligne d'index donné (index de ligne "brut", tel que dans la textarea)
// pendant l'exécution, et retire tout surlignage si index < 0.
function surlignerLigneEditeur(index) {
    miroir.querySelectorAll('.ligne-editeur.ligne-active').forEach(div => div.classList.remove('ligne-active'));
    if (index < 0) return;
    const cible = miroir.querySelector(`.ligne-editeur[data-idx="${index}"]`);
    if (cible) {
        cible.classList.add('ligne-active');
        cible.scrollIntoView({ block: 'nearest' });
    }
}

function rafraichirSuggestions() {
    colorerEditeur();
    const liste = document.getElementById('suggestionsListe');

    // Mode Expert : Jamais d'autocomplétion
    if (modePedagogique === 'expert') {
        liste.style.display = 'none';
        return;
    }

    const { motActuel, motPrecedent, motAvantPrecedent, finiParEspace, motsLigne } = obtenirTokenEnCours();
    liste.innerHTML = '';
    let suggestions = [];

    // Ignorer si l'élève tape un point (Majuscule) — sauf si ça reste un préfixe valide
    // d'un mot-clé de la grammaire (ex: "Placer" tapé avec une majuscule en début de phrase).
    const estPrefixeMotCle = motActuel && [...MOTS_DEPART, ...Object.keys(GRAMMAIRE_PREDICTION)]
        .some(mc => mc.toLowerCase().startsWith(motActuel.toLowerCase()));
    if (motActuel && motActuel[0] === motActuel[0].toUpperCase() && motActuel[0] !== motActuel[0].toLowerCase() && !estPrefixeMotCle) {
        liste.style.display = 'none';
        return;
    }

    // Détermination des suggestions de base selon l'arbre (en tenant compte du mot
    // d'avant pour désambiguïser les noeuds partagés comme "de", voir predictionSuivante).
    if (finiParEspace) {
        if (motPrecedent) suggestions = predictionSuivante(motPrecedent, motAvantPrecedent);
        else suggestions = MOTS_DEPART;
    } else {
        let baseMots = MOTS_DEPART;
        if (motPrecedent) baseMots = predictionSuivante(motPrecedent, motAvantPrecedent);
        suggestions = baseMots.filter(mot => mot.startsWith(motActuel));
    }

    // Gestion spécifique du Mode Évaluation : on ne montre que si l'élève a tapé la première lettre
    if (modePedagogique === 'evaluation' && finiParEspace) {
        suggestions = [];
    }

    if (suggestions.length === 0) {
        liste.style.display = 'none';
        indexSuggestionActive = -1;
        return;
    }

    suggestions.forEach((suggestion, index) => {
        const div = document.createElement('div');
        div.textContent = suggestion;
        div.onclick = () => validerAutocompletion(suggestion);
        liste.appendChild(div);
    });

    liste.style.display = 'block';
    indexSuggestionActive = 0;
    majSelectionVisuelle();
}

function majSelectionVisuelle() {
    const liste = document.getElementById('suggestionsListe');
    const divs = liste.getElementsByTagName('div');
    for (let i = 0; i < divs.length; i++) {
        if (i === indexSuggestionActive) {
            divs[i].style.background = 'var(--editeur-suggestion-hover)'; divs[i].style.fontWeight = 'bold';
            divs[i].scrollIntoView({ block: 'nearest' });
        } else {
            divs[i].style.background = 'var(--editeur-bg)'; divs[i].style.fontWeight = 'normal';
        }
    }
}

function validerAutocompletion(motChoisi) {
    const { textenettement, positionCurseur, motActuel, finiParEspace } = obtenirTokenEnCours();
    let debut = finiParEspace ? textenettement.substring(0, positionCurseur) : textenettement.substring(0, positionCurseur - motActuel.length);
    let fin = textenettement.substring(positionCurseur);

    textarea.value = debut + motChoisi + " " + fin;
    document.getElementById('suggestionsListe').style.display = 'none';
    textarea.focus();

    const nouvellePosition = debut.length + motChoisi.length + 1;
    textarea.setSelectionRange(nouvellePosition, nouvellePosition);

    rafraichirSuggestions();
}

/* ============================================================
   ÉCOUTEURS ET ACTIONS CLAVIER / CONFIGURATION
   ============================================================ */

// Sauvegarde/restauration : protège contre une suppression massive accidentelle
// (ex: Ctrl+A puis Suppr) qui viderait tout le programme tapé d'un coup.
let sauvegardeCode = null;
let dernierTexteConnu = textarea.value;

textarea.addEventListener('input', () => {
    const nouveauTexte = textarea.value;
    if (dernierTexteConnu.trim().length > 10 && nouveauTexte.trim().length === 0) {
        sauvegardeCode = dernierTexteConnu;
        document.getElementById('boutonRestaurerCode').style.display = 'inline-block';
    }
    dernierTexteConnu = nouveauTexte;
    rafraichirSuggestions();
});

document.getElementById('boutonRestaurerCode').onclick = () => {
    if (sauvegardeCode) {
        textarea.value = sauvegardeCode;
        dernierTexteConnu = sauvegardeCode;
        colorerEditeur();
    }
    document.getElementById('boutonRestaurerCode').style.display = 'none';
};

textarea.addEventListener('keydown', (e) => {
    const liste = document.getElementById('suggestionsListe');
    const divs = liste.getElementsByTagName('div');
    const estVisible = liste.style.display === 'block';

    if (estVisible && divs.length > 0) {
        if (e.key === 'ArrowDown') {
            e.preventDefault(); indexSuggestionActive = (indexSuggestionActive + 1) % divs.length;
            majSelectionVisuelle(); return;
        }
        if (e.key === 'ArrowUp') {
            e.preventDefault(); indexSuggestionActive = (indexSuggestionActive - 1 + divs.length) % divs.length;
            majSelectionVisuelle(); return;
        }
        if (e.key === 'Tab' || e.key === 'Enter') {
            e.preventDefault();
            if (indexSuggestionActive >= 0 && indexSuggestionActive < divs.length) {
                validerAutocompletion(divs[indexSuggestionActive].textContent);
            }
            return;
        }
        if (e.key === 'Escape') {
            liste.style.display = 'none'; indexSuggestionActive = -1; return;
        }
    }
});

// Gestion globale du clic à côté pour masquer la boîte
document.addEventListener('click', (e) => {
    if (!document.getElementById('suggestionsWrapper').contains(e.target)) {
        document.getElementById('suggestionsListe').style.display = 'none';
    }
});

// Changement dynamique des modes via l'interface bouton
function basculerBoutonMode(actifId, mode) {
    modePedagogique = mode;
    ['btnModeApprentissage', 'btnModeEvaluation', 'btnModeExpert'].forEach(id => {
        document.getElementById(id).classList.toggle('actif', id === actifId);
    });
    textarea.focus();
    rafraichirSuggestions();
}

document.getElementById('btnModeApprentissage').onclick = () => basculerBoutonMode('btnModeApprentissage', 'apprentissage');
document.getElementById('btnModeEvaluation').onclick = () => basculerBoutonMode('btnModeEvaluation', 'evaluation');
document.getElementById('btnModeExpert').onclick = () => basculerBoutonMode('btnModeExpert', 'expert');

// Execution centralisée appelée par runCode() principal
let compteurCodageEleve = 0; // distingue les groupes "coder ..." successifs (nombre de traits)

async function executerToutLeCodeTexte() {
    compteurCodageEleve = 0;
    // On garde l'index de ligne "brut" (avant filtrage des lignes vides) pour pouvoir
    // surligner la bonne ligne dans l'éditeur pendant l'exécution.
    const lignes = textarea.value.split('\n')
        .map((ligne, index) => ({ ligne: ligne.trim(), index }))
        .filter(l => l.ligne.length > 0);
    nettoyerDessin();
    contexteMarquage = 'eleve';
    executionEnCours = true;

    try {
        for (const { ligne, index } of lignes) {
            const analyse = analyserSyntaxeLigne(ligne);
            if (analyse.aUneErreur) {
                throw new Error(`Structure de phrase incorrecte sur la ligne : "${ligne}"`);
            }
            // On surligne puis on exécute TOUT DE SUITE (visible dès ce clic) ;
            // la pause a lieu APRÈS, en attendant le clic suivant sur "Exécuter".
            surlignerLigneEditeur(index);
            await executerLigneEleve(ligne);
            await pauseEtape();
        }
        if (verifierReussite()) alerte("Réussi ! La construction correspond à la figure fantôme.");
        else alerte("Ce n'est pas encore la bonne construction, modifiez votre code et réessayez.");
    } catch (e) {
        alerte("Erreur : " + e.message);
    } finally {
        surlignerLigneEditeur(-1);
        mettreAJourBoutonExecuter();
    }
}

let modeSaisie = 'blocs';
document.getElementById("modeSaisieButton").onclick = function () {
    modeSaisie = (modeSaisie === 'blocs') ? 'texte' : 'blocs';
    document.getElementById("blocklyDiv").style.display = (modeSaisie === 'blocs') ? 'block' : 'none';
    document.getElementById("texteInterface").style.display = (modeSaisie === 'texte') ? 'flex' : 'none';
    document.getElementById("modeTexteOptions").style.display = (modeSaisie === 'texte') ? 'flex' : 'none';
    document.getElementById("modeSaisieButton").innerText = "Mode : " + (modeSaisie === 'blocs' ? "Blocs" : "Texte");
    if (modeSaisie === 'texte') document.getElementById('ligneInput').focus();
};
