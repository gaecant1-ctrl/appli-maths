/* ============================================================
   MOTEUR GÉOMÉTRIQUE : GeoGebra
   ============================================================ */

let ggbApplet = null;
let executionEnCours = false;
let dernierObjet = null;
let objetsConstruits = [];
let objetsAuxiliaires = [];
let target = null;

let etiquettes = { A: 'A', B: 'B', C: 'C' };
const registre = { droites: {}, segments: {}, cercles: {}, demiDroites: {} };

// Points de base (utilisés par défaut si une figure ne définit pas sa propre ligne
// d'en-tête "% Nom(x,y) ..."). Chaque figure peut redéfinir/ajouter des points via
// cette ligne d'en-tête.
const POINTS_BASE_DEFAUT = { A: [-3, 1], B: [3, 2], C: [1, -3] };
const COULEUR_POINTS_BASE = [102, 126, 234]; // bleu, identique pour tous les points initiaux
let pointsBase = {};

// Crée/repositionne les points nécessaires à la figure en cours, et supprime ceux
// qui ne sont plus utilisés (sauf s'ils font partie du nouveau jeu de points).
function appliquerPointsBase(nouveauxPoints) {
    Object.keys(pointsBase).forEach(nom => {
        if (!nouveauxPoints[nom] && ggbApplet.exists(nom)) ggbApplet.deleteObject(nom);
    });

    Object.entries(nouveauxPoints).forEach(([nom, coords]) => {
        const [x, y] = coords;
        if (ggbApplet.exists(nom)) {
            // setCoords n'a aucun effet sur un point déjà figé : on le défige le temps
            // du repositionnement, puis on le refige.
            ggbApplet.setFixed(nom, false);
            ggbApplet.setCoords(nom, x, y);
            ggbApplet.setFixed(nom, true);
        } else {
            ggbApplet.evalCommand(`${nom}=(${x},${y})`);
            ggbApplet.setFixed(nom, true);
            ggbApplet.setLabelVisible(nom, true);
            ggbApplet.setLabelStyle(nom, 0);
            ggbApplet.setColor(nom, ...COULEUR_POINTS_BASE);
            // Reprend le style de point actuellement sélectionné (bouton "Points"), pas
            // une taille fixe : sinon un point créé après le premier réglage du bouton
            // n'était jamais branché sur ce réglage.
            STYLES_POINTS[indexStylePoints].appliquer(nom);
        }
    });

    pointsBase = nouveauxPoints;
    etiquettes = Object.keys(pointsBase).reduce((acc, n) => { acc[n] = n; return acc; }, {});
}

// Lit une éventuelle ligne d'en-tête "% Nom(x,y) Nom(x,y) ..." dans un fichier figure*.txt.
function parseEnteteFigureTexte(texte) {
    const ligneEntete = texte.split('\n').find(l => l.trim().startsWith('%'));
    if (!ligneEntete) return null;
    const points = {};
    const re = /([A-Za-z]\w*)\(\s*(-?[\d.]+)\s*,\s*(-?[\d.]+)\s*\)/g;
    let m;
    while ((m = re.exec(ligneEntete))) {
        points[m[1]] = [parseFloat(m[2]), parseFloat(m[3])];
    }
    return Object.keys(points).length ? points : null;
}

// Un nom n'est valable pour l'élève (ou pour la figure fantôme) que s'il a été créé/nommé
// dans CE contexte-là — jamais un objet interne d'un autre contexte (ex: un nom
// auto-généré par GeoGebra pour la figure fantôme, qui existe globalement mais ne doit
// jamais être accessible à l'élève juste parce que le nom "colle" par hasard).
function estNomAccessible(nom) {
    if (Object.values(etiquettes).includes(nom)) return true;
    if (objetsConstruits.includes(nom)) return true;
    if (objetsAuxiliaires.includes(nom)) return true;
    if (Object.values(registre.droites).includes(nom)) return true;
    if (Object.values(registre.segments).includes(nom)) return true;
    if (Object.values(registre.cercles).includes(nom)) return true;
    if (Object.values(registre.demiDroites).includes(nom)) return true;
    return false;
}

function resoudre(nomOuEtiquette) {
    const reel = etiquettes[nomOuEtiquette] || nomOuEtiquette;
    // Point de passage unique pour toute résolution de nom : on vérifie ici que
    // l'objet visé est bien accessible, pour donner un retour clair à l'élève plutôt
    // qu'un plantage ou un échec silencieux plus loin dans une commande GeoGebra.
    if (!estNomAccessible(reel)) {
        throw new Error(`"${nomOuEtiquette}" n'existe pas — vérifie le nom du point ou de l'objet`);
    }
    return reel;
}

function attendre(ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            if (!executionEnCours) return;
            resolve();
        }, ms);
    });
}

/* ---------- Exécution pas à pas (mode Blocs ET mode Texte) ----------
   Pas de bouton séparé : c'est "Exécuter" lui-même qui sert à avancer d'un cran
   (voir runCode ci-dessous). Chaque étape s'exécute IMMÉDIATEMENT au clic (on voit
   tout de suite son effet à l'écran), puis on se met en pause jusqu'au clic suivant. */

let modeExecution = 'continu'; // 'continu' | 'pas-a-pas'
let resolveEtape = null;
let executionDejaCommencee = false; // pour Blockly : ne pas mettre en pause avant le tout premier bloc

function attendreEtapeSuivante() {
    return new Promise(resolve => {
        resolveEtape = resolve;
        mettreAJourBoutonExecuter();
    });
}

function mettreAJourBoutonExecuter() {
    document.getElementById('button').innerText = resolveEtape ? 'Étape suivante' : 'Exécuter';
}

// Appelée APRÈS chaque instruction (ligne de texte) : en mode pas à pas, met en
// pause jusqu'au prochain clic sur "Exécuter" (qui devient alors "Étape suivante") ;
// en mode continu, garde juste une petite pause pour laisser voir le surlignage passer.
async function pauseEtape() {
    if (modeExecution === 'pas-a-pas') {
        await attendreEtapeSuivante();
    } else {
        await attendre(300);
    }
}

document.getElementById('btnModeExecution').onclick = function () {
    modeExecution = (modeExecution === 'continu') ? 'pas-a-pas' : 'continu';
    this.innerText = 'Mode : ' + (modeExecution === 'continu' ? 'Continu' : 'Pas à pas');
};

// Appelée par Blockly (via STATEMENT_PREFIX, voir blockly-blocs.js) juste AVANT
// chaque bloc — mais comme cet appel précède systématiquement TOUS les blocs, on
// ne met en pause qu'à partir du deuxième (le premier s'exécute tout de suite au
// clic qui a lancé le programme, la pause a alors lieu juste après, avant le
// bloc suivant, ce qui revient au même que "pauser après chaque bloc").
async function avantBlocPasAPas(blockId) {
    if (modeExecution === 'pas-a-pas' && executionDejaCommencee) {
        await attendreEtapeSuivante();
    }
    executionDejaCommencee = true;
    workspace.highlightBlock(blockId);
    if (modeExecution !== 'pas-a-pas') {
        await attendre(300);
    }
}

function cleSymetrique(p1, p2) { return [p1, p2].slice().sort().join('_'); }
function cleOrdonnee(p1, p2) { return p1 + '_' + p2; }

function creerBrut(commande) {
    return ggbApplet.evalCommandGetLabels(commande);
}

let contexteMarquage = 'eleve';

function autoMarquer(commande, nom) {
    // Les codages (angle droit, longueurs égales) ne concernent QUE la figure fantôme :
    // les déclencher aussi pendant l'exécution du code de l'élève crée des lignes/points
    // auxiliaires supplémentaires (Intersect, Midpoint...) qui ont été source de bugs.
    if (contexteMarquage !== 'cible') return;
    const cmd = commande.replace(/^\w+\s*=\s*/, '').trim();
    let m;
    if ((m = cmd.match(/^PerpendicularLine\(([^,]+),([^)]+)\)$/))) {
        marquerAngleDroit(m[2].trim(), nom);
    } else if ((m = cmd.match(/^LineBisector\(([^)]+)\)$/))) {
        marquerAngleDroit(m[1].trim(), nom);
    }
    // Les longueurs égales ne sont plus codées automatiquement (via placer le milieu /
    // tracer la médiatrice) : ça empêchait de coder d'autres égalités de longueurs.
    // Elles se codent désormais explicitement avec la directive "% coder AB=BC".
}

function creer(commande) {
    console.log(`%c[MOTEUR] ➡️ Commande envoyée : "${commande}" (Contexte : ${contexteMarquage})`, "color: #1e90ff; font-weight: bold;");
    
    const brut = ggbApplet.evalCommandGetLabels(commande);
    console.log(`%c[GEOGEBRA] ⬅️ Retour brut de labels : "${brut}"`, "color: #2ed573;");

    const noms = brut.split(',').map(n => n.trim()).filter(n => n.length > 0);
    let nomRetenu = noms[0]; 

    const commandePure = commande.includes('=') ? commande.split('=')[1].toLowerCase() : commande.toLowerCase();

    if (noms.length > 1 && commandePure.includes("intersect")) {
        console.log(`[MOTEUR] 🔍 Intersection multiple détectée. Analyse des positions...`);
        try {
            // Récupération ultra-fiable des limites de l'écran GeoGebra
            const X_MIN = ggbApplet.getValue("x(Corner(1))");
            const Y_MIN = ggbApplet.getValue("y(Corner(1))");
            const X_MAX = ggbApplet.getValue("x(Corner(3))");
            const Y_MAX = ggbApplet.getValue("y(Corner(3))");
            
            console.log(`[MOTEUR] Cadre visible réel : X[${X_MIN.toFixed(2)} à ${X_MAX.toFixed(2)}], Y[${Y_MIN.toFixed(2)} à ${Y_MAX.toFixed(2)}]`);

            for (const nom of noms) {
                if (ggbApplet.exists(nom) && ggbApplet.getObjectType(nom) === 'point') {
                    const x = ggbApplet.getXcoord(nom);
                    const y = ggbApplet.getYcoord(nom);
                    
                    // Vérification avec une petite marge de sécurité de 0.1
                    const dansLeCadre = (x >= X_MIN - 0.1 && x <= X_MAX + 0.1 && y >= Y_MIN - 0.1 && y <= Y_MAX + 0.1);
                    console.log(`   📍 Point "${nom}" trouvé en (${x.toFixed(2)}, ${y.toFixed(2)}) -> Dans le cadre ? ${dansLeCadre ? '✅ OUI' : '❌ NON'}`);

                    if (dansLeCadre) {
                        nomRetenu = nom;
                        console.log(`   🎯 Point retenu : "${nomRetenu}"`);

                        // On ne supprime JAMAIS l'autre point : G et H (par ex.) partagent le
                        // même algorithme sous-jacent (Intersect à solutions multiples), donc
                        // supprimer l'un détruit l'algorithme et casse aussi l'autre (perte de
                        // définition). On se contente de le cacher.
                        noms.forEach(autre => {
                            if (autre !== nomRetenu && ggbApplet.exists(autre)) {
                                ggbApplet.setVisible(autre, false);
                                listeAuxiliaires().push(autre);
                            }
                        });
                        break;
                    }
                }
            }
        } catch (e) {
            console.error(`[MOTEUR 🚨] Erreur lors du calcul du cadre :`, e);
            nomRetenu = noms[0];
        }
    }

    console.log(`%c[MOTEUR] 🏁 Fin de création. Objet retourné : "${nomRetenu}"`, "color: #ffa500; font-weight: bold;");
    console.log("----------------------------------------");

    autoMarquer(commande, nomRetenu);
    return nomRetenu;
}

// Cache tous les candidats sauf celui choisi (jamais supprimés : ils partagent le
// même algorithme sous-jacent qu'un Intersect à solutions multiples, cf. bug
// "G et H perdent leur définition" si on les supprime).
function cacherAutresCandidats(noms, choisi) {
    noms.forEach(autre => {
        if (autre !== choisi && ggbApplet.exists(autre)) {
            ggbApplet.setVisible(autre, false);
            listeAuxiliaires().push(autre);
        }
    });
}

// "placer le point d'intersection entre X et Y" (sans "visible") : pas de
// désambiguïsation, on garde simplement le premier point renvoyé par GeoGebra.
function creerIntersectionPremiere(commande) {
    const brut = creerBrut(commande);
    const noms = brut.split(',').map(n => n.trim()).filter(n => n.length > 0 && ggbApplet.exists(n));
    const choisi = noms[0];
    cacherAutresCandidats(noms, choisi);
    autoMarquer(commande, choisi);
    return choisi;
}

// "placer le point d'intersection autre que Z entre X et Y" : garde le point qui
// n'est PAS égal à Z (utile quand il y a deux solutions et qu'on veut explicitement
// "l'autre" que celle déjà connue).
function creerIntersectionAutreQue(commande, refExclue) {
    const brut = creerBrut(commande);
    const noms = brut.split(',').map(n => n.trim()).filter(n => n.length > 0 && ggbApplet.exists(n));
    let choisi = noms.find(nom => {
        if (ggbApplet.getObjectType(nom) !== 'point') return false;
        ggbApplet.evalCommand(`verifRes=AreEqual(${nom},${refExclue})`);
        const identique = ggbApplet.getValue('verifRes') === 1;
        if (ggbApplet.exists('verifRes')) ggbApplet.deleteObject('verifRes');
        return !identique;
    });
    if (!choisi) choisi = noms[0];
    cacherAutresCandidats(noms, choisi);
    autoMarquer(commande, choisi);
    return choisi;
}

function obtenirDroite(p1, p2) {
    const cle = cleSymetrique(p1, p2);
    let nom = registre.droites[cle];
    if (!nom) {
        nom = creer(`Line(${p1},${p2})`);
        ggbApplet.setVisible(nom, false);
        registre.droites[cle] = nom;
    }
    return nom;
}

function obtenirSegment(p1, p2) {
    const cle = cleSymetrique(p1, p2);
    let nom = registre.segments[cle];
    if (!nom) {
        nom = creer(`Segment(${p1},${p2})`);
        ggbApplet.setVisible(nom, false);
        registre.segments[cle] = nom;
    }
    return nom;
}

function obtenirCercle(centre, par) {
    const cle = cleOrdonnee(centre, par);
    let nom = registre.cercles[cle];
    if (!nom) {
        nom = creer(`Circle(${centre},${par})`);
        ggbApplet.setVisible(nom, false);
        registre.cercles[cle] = nom;
    }
    return nom;
}

function obtenirDemiDroite(origine, par) {
    const cle = cleOrdonnee(origine, par); // pas symétrique : [AB) != [BA)
    let nom = registre.demiDroites[cle];
    if (!nom) {
        nom = creer(`Ray(${origine},${par})`);
        ggbApplet.setVisible(nom, false);
        registre.demiDroites[cle] = nom;
    }
    return nom;
}

function afficherSansEtiquette(nom) {
    ggbApplet.setVisible(nom, true);
    ggbApplet.setLabelVisible(nom, false);
    if (ggbApplet.getObjectType(nom) === 'point') {
        // Les nouveaux points (milieu, intersection...) reprennent la même couleur bleue
        // que les points de base (la couleur noire par défaut de GeoGebra n'est pas assez
        // visible), et le style actuellement sélectionné via le bouton "Points" — sinon
        // un point créé après le premier réglage du bouton n'y était jamais branché.
        ggbApplet.setColor(nom, ...COULEUR_POINTS_BASE);
        STYLES_POINTS[indexStylePoints].appliquer(nom);
    } else if (ggbApplet.getObjectType(nom) === 'circle') {
        // Les cercles tracés par l'élève sont mauves, pour les distinguer des
        // droites/segments (couleur par défaut de GeoGebra) dans sa construction.
        ggbApplet.setColor(nom, 155, 89, 182);
    }
}

function extrairePointsDeSegment(nomSegment) {
    const def = ggbApplet.getCommandString(nomSegment);
    const m = def.match(/\(([^,]+),\s*([^)]+)\)/);
    return m ? [m[1].trim(), m[2].trim()] : [null, null];
}

const COULEUR_MARQUAGE_ELEVE = [51, 51, 51];
const COULEUR_MARQUAGE_CIBLE = [150, 150, 150];

function listeAuxiliaires() {
    return contexteMarquage === 'cible' ? ciblesAuxiliaires : objetsAuxiliaires;
}

function couleurMarquage() {
    return contexteMarquage === 'cible' ? COULEUR_MARQUAGE_CIBLE : COULEUR_MARQUAGE_ELEVE;
}

function marquerAngleDroit(droite1, droite2) {
    const tailleMarque = 0.15;
    const inter = creerBrut(`Intersect(${droite1},${droite2})`);
    ggbApplet.setVisible(inter, false);
    listeAuxiliaires().push(inter);

    // Correction ici : suppression des "..." qui cassaient la chaîne GeoGebra
    const noms = creerBrut(
        `Polygon(${inter},${inter}+UnitVector(${droite1})*${tailleMarque},` +
        `${inter}+UnitVector(${droite1})*${tailleMarque}+UnitVector(${droite2})*${tailleMarque},` +
        `${inter}+UnitVector(${droite2})*${tailleMarque})`
    ).split(',');
    const carre = noms[0];
    ggbApplet.setFilling(carre, 0);
    ggbApplet.setLabelVisible(carre, false);
    ggbApplet.setColor(carre, ...couleurMarquage());
    listeAuxiliaires().push(...noms);
    return carre;
}

// Code un groupe de segments (2 ou plus) comme étant de longueurs égales (petits traits
// perpendiculaires au milieu de chacun). Appelée uniquement via la directive explicite
// "% coder AB=BC" (ou "% coder AB=BC=DE" pour plus de deux), jamais automatiquement,
// pour pouvoir coder autant d'égalités que nécessaire. "nombreTraits" distingue
// visuellement plusieurs groupes d'égalités différents dans une même figure.
function marquerSegmentsEgaux(segments, nombreTraits = 1) {
    segments.forEach(segment => {
        const [p1, p2] = extrairePointsDeSegment(segment);
        if (!p1 || !p2) return;

        const milieu = creerBrut(`Midpoint(${p1},${p2})`);
        ggbApplet.setVisible(milieu, false);
        listeAuxiliaires().push(milieu);

        for (let i = 0; i < nombreTraits; i++) {
            const decalage = (i - (nombreTraits - 1) / 2) * 0.06;
            const centre = creerBrut(`${milieu}+UnitVector(${segment})*${decalage}`);
            ggbApplet.setVisible(centre, false);
            listeAuxiliaires().push(centre);

            const tick = creerBrut(`Segment(${centre}-UnitPerpendicularVector(${segment})*0.15,${centre}+UnitPerpendicularVector(${segment})*0.15)`);
            ggbApplet.setLabelVisible(tick, false);
            ggbApplet.setColor(tick, ...couleurMarquage());
            listeAuxiliaires().push(tick);
        }
    });
}

const construire = {
    refDroite(p1, p2) { return obtenirDroite(resoudre(p1), resoudre(p2)); },
    refSegment(p1, p2) { return obtenirSegment(resoudre(p1), resoudre(p2)); },
    refCercle(centre, par) { return obtenirCercle(resoudre(centre), resoudre(par)); },

    async tracerDroite(p1, p2) {
        const nom = obtenirDroite(resoudre(p1), resoudre(p2));
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async tracerSegment(p1, p2) {
        const nom = obtenirSegment(resoudre(p1), resoudre(p2));
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async tracerDemiDroite(origine, par) {
        const nom = creer(`Ray(${resoudre(origine)},${resoudre(par)})`);
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async tracerCercle(centre, par) {
        const nom = obtenirCercle(resoudre(centre), resoudre(par));
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async tracerParallele(droite, point) {
        const nom = creer(`Line(${resoudre(point)},${resoudre(droite)})`);
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async tracerPerpendiculaire(droite, point) {
        droite = resoudre(droite);
        const nom = creer(`PerpendicularLine(${resoudre(point)},${droite})`);
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async tracerMediatrice(segment) {
        segment = resoudre(segment);
        const nom = creer(`LineBisector(${segment})`);
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async placerMilieu(segment) {
        segment = resoudre(segment);
        const nom = creer(`Midpoint(${segment})`);
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async placerIntersection(obj1, obj2) {
        const nom = creer(`Intersect(${resoudre(obj1)},${resoudre(obj2)})`);
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    // "placer le point d'intersection entre X et Y" (sans "visible") : pas de
    // désambiguïsation, on garde le premier point renvoyé par GeoGebra.
    async placerIntersectionPremiere(obj1, obj2) {
        const nom = creerIntersectionPremiere(`Intersect(${resoudre(obj1)},${resoudre(obj2)})`);
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    // "placer le point d'intersection autre que Z entre X et Y" : garde le point
    // qui n'est PAS égal à Z.
    async placerIntersectionAutre(refExclue, obj1, obj2) {
        const nom = creerIntersectionAutreQue(`Intersect(${resoudre(obj1)},${resoudre(obj2)})`, resoudre(refExclue));
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    async tracerPolygone(points) {
        if (points.length < 3) {
            throw new Error("un polygone nécessite au moins 3 sommets");
        }
        const resolus = points.map(p => {
            const nom = resoudre(p);
            if (!ggbApplet.exists(nom)) throw new Error(`le point "${p}" n'existe pas`);
            if (ggbApplet.getObjectType(nom) !== 'point') throw new Error(`"${p}" n'est pas un point`);
            return nom;
        });
        const noms = ggbApplet.evalCommandGetLabels(`Polygon(${resolus.join(',')})`).split(',');
        const nom = noms[0];
        afficherSansEtiquette(nom);
        dernierObjet = nom;
        objetsConstruits.push(nom);
        await attendre(400);
    },
    // "label" est le nom interne (sans parenthèses/crochets, utilisé pour résoudre les
    // références). "texteAffiche" est ce qui doit apparaître à l'écran (ex: "(d)") : si
    // absent, on retombe sur "label".
    async nommer(label, texteAffiche) {
        if (dernierObjet) {
            if (etiquettes[label] && etiquettes[label] !== dernierObjet) {
                throw new Error(`le nom "${label}" est déjà utilisé par un autre objet, choisis-en un autre`);
            }
            etiquettes[label] = dernierObjet;
            ggbApplet.setCaption(dernierObjet, texteAffiche || label);
            ggbApplet.setLabelStyle(dernierObjet, 3);
            ggbApplet.setLabelVisible(dernierObjet, true);
            // Si la figure fantôme utilise ce même nom (ex: "M"), on ne cache son étiquette
            // que si c'est vraiment le même point/objet (sinon les deux libellés identiques
            // se superposeraient sans que ça n'ait de sens) ; sinon on prévient l'élève.
            const cibleMemeNom = etiquettesCible[label];
            if (cibleMemeNom && ggbApplet.exists(cibleMemeNom)) {
                ggbApplet.evalCommand(`verifRes=AreEqual(${dernierObjet},${cibleMemeNom})`);
                const identique = ggbApplet.getValue('verifRes') === 1;
                if (ggbApplet.exists('verifRes')) ggbApplet.deleteObject('verifRes');
                if (identique) {
                    ggbApplet.setLabelVisible(cibleMemeNom, false);
                } else {
                    throw new Error(`le nom "${label}" est déjà utilisé sur la figure fantôme, mais ne désigne pas le même point ici`);
                }
            }
        }
        await attendre(200);
    }
};

// Détecte une syntaxe compacte "tracer d la droite ..." / "placer I le milieu de ..." :
// un nom directement après le verbe, équivalent à la même instruction suivie de
// "nommer ...". Coexiste avec la syntaxe en 2 lignes. Retourne { nomInline, ligne }
// (ligne réécrite sans le nom, prête pour les motifs habituels). Utilisée à la fois par
// l'exécution du code élève (editeur-texte.js) et par l'interprète de figure fantôme
// (executerFigureTexte ci-dessous).
function extraireNomInline(ligne) {
    const m = ligne.match(/^(tracer|placer)\s+(\(?[A-Za-z]\w*\)?|\[[A-Za-z]\w*\]?)\s+(\S.*)$/i);
    if (!m) return { nomInline: null, nomInlineComplet: null, ligne };
    const contenu = m[2].replace(/[()[\]]/g, '');
    // Un nom fait UNE lettre/mot ; une référence-raccourci comme (AB)/[AB] en fait DEUX
    // (les deux points) : dans ce cas ce n'est pas un nom, on ne touche à rien.
    if (/^[A-Za-z]{2}$/.test(contenu)) return { nomInline: null, nomInlineComplet: null, ligne };
    // nomInline : nom interne (sans parenthèses/crochets, pour résoudre les références) ;
    // nomInlineComplet : texte tel quel (ex: "(d)"), pour garder les parenthèses à l'affichage.
    return { nomInline: contenu, nomInlineComplet: m[2], ligne: `${m[1]} ${m[3]}` };
}

// Vérifie si un des objets construits par l'élève correspond à la cible.
function verifierReussite() {
    for (const nom of objetsConstruits) {
        ggbApplet.evalCommand(`verifRes=AreEqual(${nom},cible)`);
        const ok = ggbApplet.getValue('verifRes') === 1;
        if (ggbApplet.exists('verifRes')) ggbApplet.deleteObject('verifRes');
        if (ok) return true;
    }
    return false;
}

/* ---------- Génération de la figure fantôme (cible) ---------- */

function styliserCible(nom) {
    ggbApplet.setColor(nom, 150, 150, 150);
    ggbApplet.setLineStyle(nom, 1);
    ggbApplet.setLineThickness(nom, 3);
    ggbApplet.setFilling(nom, 0);
    ggbApplet.setLayer(nom, 0);
    ggbApplet.setLabelVisible(nom, false);
    // Les points de la figure fantôme suivent eux aussi le style actuellement
    // sélectionné via le bouton "Points" (sinon ils gardent le style par défaut
    // de GeoGebra tant qu'on ne reclique pas sur le bouton).
    if (ggbApplet.getObjectType(nom) === 'point') {
        STYLES_POINTS[indexStylePoints].appliquer(nom);
    }
}

function etiqueterCible(nom, label) {
    ggbApplet.setCaption(nom, label);
    ggbApplet.setLabelStyle(nom, 3);
    ggbApplet.setLabelVisible(nom, true);
}

let ciblesAuxiliaires = [];
// Nom (sans parenthèses/crochets) -> objet fantôme correspondant, pour pouvoir
// masquer l'étiquette fantôme si l'élève reprend exactement le même nom (sinon
// les deux étiquettes identiques se superposent à l'écran).
let etiquettesCible = {};

function resoudreReferenceTexte(texte, etiquettesLocales) {
    texte = texte.trim();
    let m;
    // Résout un point qui peut être soit un point de base (A/B/C...), soit un nom
    // donné localement dans la figure via "nommer" (ex: "I").
    const r = (lettre) => etiquettesLocales[lettre] || resoudre(lettre);
    // IMPORTANT : ne jamais passer par obtenirDroite/obtenirSegment ici — ces fonctions
    // alimentent le "registre" partagé avec l'élève, qui est vidé à chaque Exécuter/
    // Réinitialiser. Si un objet de la cible y était rangé, il serait supprimé (et tout
    // ce qui en dépend avec lui). On crée donc des objets dédiés à la cible, suivis
    // uniquement dans ciblesAuxiliaires.
    if ((m = texte.match(/^\(([A-Za-z])([A-Za-z])\)$/))) {
        const nom = creerBrut(`Line(${r(m[1])},${r(m[2])})`);
        ggbApplet.setVisible(nom, false);
        ciblesAuxiliaires.push(nom);
        return nom;
    }
    if ((m = texte.match(/^\[([A-Za-z])([A-Za-z])\]$/))) {
        const nom = creerBrut(`Segment(${r(m[1])},${r(m[2])})`);
        ggbApplet.setVisible(nom, false);
        ciblesAuxiliaires.push(nom);
        return nom;
    }
    if ((m = texte.match(/^\[([A-Za-z])([A-Za-z])\)$/))) {
        const nom = creerBrut(`Ray(${r(m[1])},${r(m[2])})`);
        ggbApplet.setVisible(nom, false);
        ciblesAuxiliaires.push(nom);
        return nom;
    }
    if ((m = texte.match(/^[\(\[]([A-Za-z]\w*)[\)\]]$/))) return etiquettesLocales[m[1]] || resoudre(m[1]);
    return etiquettesLocales[texte] || resoudre(texte);
}

function executerFigureTexte(texte) {
    const etiquettesLocales = {};
    let dernier = null;
    const toutesLignes = texte.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    // Directives "% coder AB=BC" : codage explicite de longueurs égales, indépendant
    // de toute construction (on peut en écrire autant qu'on veut dans une figure).
    const lignesCodage = toutesLignes.filter(l => /^%\s*coder\s+/i.test(l));
    const lignes = toutesLignes.filter(l => !l.startsWith('%'));
    let indexDerniereConstruction = -1;
    lignes.forEach((ligne, i) => { if (!/^nommer\s/i.test(ligne)) indexDerniereConstruction = i; });

    const ref = (t) => resoudreReferenceTexte(t, etiquettesLocales);

    lignes.forEach((ligneBrute, i) => {
        const prefixe = (i === indexDerniereConstruction) ? 'cible=' : '';
        const extrait = extraireNomInline(ligneBrute);
        const nomInline = extrait.nomInline;
        const nomInlineComplet = extrait.nomInlineComplet;
        const ligne = extrait.ligne;
        let m;
        if ((m = ligne.match(/^tracer le polygone ([A-Z]+)$/i))) {
    // We use "ref" instead of "resoudre" to find points mapped locally in the target
    const pts = m[1].split('').map(lettre => ref(lettre)); // ✅ Utilise ref() !
    const noms = creerBrut(`${prefixe}Polygon(${pts.join(',')})`).split(',');
    dernier = noms[0]; 
    ciblesAuxiliaires.push(...noms); 
    styliserCible(dernier);
} else if ((m = ligne.match(/^tracer la droite passant par (\S+) et (\S+)$/i))) {
            dernier = creer(`${prefixe}Line(${ref(m[1])},${ref(m[2])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer \(([A-Za-z])([A-Za-z])\)$/i))) {
            // Raccourci : "tracer (AB)" équivaut à "tracer la droite passant par A et B".
            dernier = creer(`${prefixe}Line(${ref(m[1])},${ref(m[2])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer le segment(?:\s+d'extr[ée]mit[ée]s (\S+) et (\S+)|\s*\[([A-Z])([A-Z])\])$/i))) {
            dernier = creer(`${prefixe}Segment(${ref(m[1] || m[3])},${ref(m[2] || m[4])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer \[([A-Za-z])([A-Za-z])\]$/i))) {
            // Raccourci : "tracer [AB]" équivaut à "tracer le segment d'extrémités A et B".
            dernier = creer(`${prefixe}Segment(${ref(m[1])},${ref(m[2])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer la demi-droite d'origine (\S+) passant par (\S+)$/i))) {
            dernier = creer(`${prefixe}Ray(${ref(m[1])},${ref(m[2])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer \[([A-Za-z])([A-Za-z])\)$/i))) {
            // Raccourci : "tracer [AB)" équivaut à "tracer la demi-droite d'origine A passant par B".
            dernier = creer(`${prefixe}Ray(${ref(m[1])},${ref(m[2])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer le cercle de centre (\S+) passant par (\S+)$/i))) {
            dernier = creer(`${prefixe}Circle(${ref(m[1])},${ref(m[2])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer la droite parall[èe]le [àa] (\S+) passant par (\S+)$/i))) {
            dernier = creer(`${prefixe}Line(${ref(m[2])},${ref(m[1])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer la droite perpendiculaire [àa] (\S+) passant par (\S+)$/i))) {
            dernier = creer(`${prefixe}PerpendicularLine(${ref(m[2])},${ref(m[1])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^tracer la m[ée]diatrice de (\S+)$/i))) {
            dernier = creer(`${prefixe}LineBisector(${ref(m[1])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^placer le milieu d[ue](?:\s+segment)?\s+(\S+)$/i))) {
            dernier = creer(`${prefixe}Midpoint(${ref(m[1])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^placer le point d'intersection visible entre (\S+) et (\S+)$/i))) {
            dernier = creer(`${prefixe}Intersect(${ref(m[1])},${ref(m[2])})`); ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^placer le point d'intersection autre que (\S+) entre (\S+) et (\S+)$/i))) {
            const refExclue = etiquettesLocales[m[1]] || resoudre(m[1]);
            dernier = creerIntersectionAutreQue(`${prefixe}Intersect(${ref(m[2])},${ref(m[3])})`, refExclue);
            ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^placer le point d'intersection entre (\S+) et (\S+)$/i))) {
            dernier = creerIntersectionPremiere(`${prefixe}Intersect(${ref(m[1])},${ref(m[2])})`);
            ciblesAuxiliaires.push(dernier); styliserCible(dernier);
        } else if ((m = ligne.match(/^nommer\s+(.+)$/i))) {
            const texteComplet = m[1].trim();
            const nomInterne = texteComplet.replace(/^[\(\[]|[\)\]]$/g, '');
            etiquettesLocales[nomInterne] = dernier; etiqueterCible(dernier, texteComplet);
            etiquettesCible[nomInterne] = dernier;
        } else {
            // Avant, une ligne non reconnue dans un figure*.txt était silencieusement
            // ignorée (contrairement au mode texte élève, qui lève déjà une erreur claire) :
            // une simple faute de frappe (ex: "visible" oublié) passait inaperçue.
            throw new Error(`ligne non reconnue dans la figure fantôme : "${ligneBrute}"`);
        }

        if (nomInline && dernier) {
            etiquettesLocales[nomInline] = dernier;
            etiqueterCible(dernier, nomInlineComplet);
            etiquettesCible[nomInline] = dernier;
        }
    });

    // Chaque ligne "% coder ..." forme un groupe distinct : "AB=BC" (2 segments) ou
    // "AI=IB=EF" (autant que voulu). Le nombre de traits augmente à chaque nouveau
    // groupe rencontré dans la figure pour les distinguer visuellement les uns des autres.
    lignesCodage.forEach((ligneCodage, index) => {
        const m = ligneCodage.match(/^%\s*coder\s+(.+)$/i);
        if (!m) return;
        const noms = m[1].split('=').map(s => s.trim());
        if (noms.length < 2 || noms.some(nom => !/^[A-Za-z]{2}$/.test(nom))) return;
        const segments = noms.map(nom => ref(`[${nom}]`));
        marquerSegmentsEgaux(segments, index + 1);
    });
}

const FIGURES = [];
// Cherche figure1.txt, figure2.txt, ... et s'arrête au premier fichier manquant (404)
// ou à la première erreur réseau. Ajouter un fichier figureN.txt ne nécessite donc
// jamais de toucher au code : il suffit de respecter la numérotation continue.
async function chargerFiguresTexte(prefixe, tableauCible) {
    const MAX_FICHIERS = 50; // garde-fou pour éviter une boucle infinie
    let n = 9;
    while (n <= MAX_FICHIERS) {
        const fichier = `${prefixe}${n}.txt`;
        try {
            const url =new URL(fichier, document.baseURI).href;
            const reponse = await fetch(url);
            if (!reponse.ok) break;
            const texte = await reponse.text();
            tableauCible.push(texte);
        } catch (e) {
            break;
        }
        n++;
    }
}

let indexDerniereFigure = -1;
let texteFigureActuelle = null; // pour pouvoir restaurer l'exercice après capture d'images (Fiche)

function genererCible() {
    if (ggbApplet.exists('cible')) ggbApplet.deleteObject('cible');
    ciblesAuxiliaires.forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.deleteObject(nom); });
    ciblesAuxiliaires = [];
    etiquettesCible = {};
    contexteMarquage = 'cible';

    // Dans l'ordre et en boucle (figure1, figure2, ..., puis on recommence à figure1).
    const index = (indexDerniereFigure + 1) % FIGURES.length;
    indexDerniereFigure = index;

    const texte = FIGURES[index];
    texteFigureActuelle = texte;
    appliquerPointsBase(parseEnteteFigureTexte(texte) || POINTS_BASE_DEFAUT);
    try {
        executerFigureTexte(texte);
    } catch (e) {
        alerte(`Erreur dans figure${index + 1}.txt : ${e.message}`);
    }
    appliquerEtiquettesFantome(indexEtiquettesFantome);
    contexteMarquage = 'eleve';
}

// Affiche temporairement une figure donnée (pour capturer son image dans la Fiche),
// sans toucher à la construction en cours de l'élève, puis restaure l'exercice affiché.
async function afficherFigureTemporairement(texte) {
    if (ggbApplet.exists('cible')) ggbApplet.deleteObject('cible');
    ciblesAuxiliaires.forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.deleteObject(nom); });
    ciblesAuxiliaires = [];
    etiquettesCible = {};
    contexteMarquage = 'cible';
    appliquerPointsBase(parseEnteteFigureTexte(texte) || POINTS_BASE_DEFAUT);
    try {
        executerFigureTexte(texte);
    } catch (e) {
        alerte(`Erreur dans une figure : ${e.message}`);
    }
    appliquerEtiquettesFantome(indexEtiquettesFantome);
    contexteMarquage = 'eleve';
    await new Promise(resolve => setTimeout(resolve, 150)); // laisse le temps au rendu de se stabiliser
}

function restaurerFigureActuelle() {
    if (texteFigureActuelle) afficherFigureTemporairement(texteFigureActuelle);
}

async function runCode() {
    // Une exécution pas à pas est en pause, en attente : ce clic sert juste à
    // avancer d'un cran (on ne relance rien depuis le début).
    if (resolveEtape) {
        const r = resolveEtape;
        resolveEtape = null;
        mettreAJourBoutonExecuter();
        r();
        return;
    }

    executionDejaCommencee = false;

    // Si l'élève est en mode texte, on redirige vers l'exécution du texte
    if (modeSaisie === 'texte') {
        await executerToutLeCodeTexte();
        return;
    }

    // Sinon, on exécute le code des blocs Blockly habituel
    Blockly.JavaScript.init(workspace);
    let startBlock = workspace.getTopBlocks().find(b => b.type === "programme");
    if (!startBlock) { alerte("Erreur : ajoute un bloc Programme !"); return; }

    nettoyerDessin();
    contexteMarquage = 'eleve';
    executionEnCours = true;

    try {
        const code = Blockly.JavaScript.statementToCode(startBlock, 'DO');
        const fonction = new Function("attendre", "construire", `return (async function() { ${code} })();`);
        await fonction(attendre, construire);

        let reussite = false;
        for (const nom of objetsConstruits) {
            ggbApplet.evalCommand(`verifRes=AreEqual(${nom},cible)`);
            const ok = ggbApplet.getValue('verifRes') === 1;
            if (ggbApplet.exists('verifRes')) ggbApplet.deleteObject('verifRes');
            if (ok) { reussite = true; break; }
        }
        alerte(reussite ? "Réussi ! La construction correspond à la figure fantôme." : "Ce n'est pas encore la bonne construction, réessaie.");
    } catch (e) {
        alerte("Erreur dans le programme : " + e.message);
    } finally {
        workspace.highlightBlock(null);
        mettreAJourBoutonExecuter();
    }
}

const CONSIGNE = "Ecrire le programme de construction de la figure";

// La zone de feedback n'est jamais vide : elle affiche la consigne tant qu'aucun
// message réel (erreur/réussite/info) n'est en cours.
function afficherConsigne() {
    const container = document.getElementById("messageContainer");
    const label = document.getElementById("messageAlerte");
    label.innerText = CONSIGNE;
    container.classList.remove("erreur", "succes", "info");
    container.classList.add("consigne");
}

function alerte(t) {
    const container = document.getElementById("messageContainer");
    const label = document.getElementById("messageAlerte");
    label.innerText = t;
    container.classList.remove("consigne", "erreur", "succes", "info");
    if (t.toLowerCase().includes("erreur") || t.toLowerCase().includes("pas encore")) {
        container.classList.add("erreur");
    } else if (t.toLowerCase().includes("réussi")) {
        container.classList.add("succes");
    } else {
        container.classList.add("info");
    }
}

function fermerAlerte() {
    afficherConsigne();
}

afficherConsigne(); // affichée dès le chargement, avant même que GeoGebra soit prêt

document.getElementById("button").onclick = runCode;

// Nettoie uniquement le plateau de dessin GeoGebra
function nettoyerDessin() {
    executionEnCours = false;
    fermerAlerte();
    [...objetsConstruits].forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.deleteObject(nom); });
    [...objetsAuxiliaires].forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.deleteObject(nom); });
    Object.values(registre.droites).forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.deleteObject(nom); });
    Object.values(registre.segments).forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.deleteObject(nom); });
    Object.values(registre.cercles).forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.deleteObject(nom); });
    Object.values(registre.demiDroites).forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.deleteObject(nom); });
    registre.droites = {}; registre.segments = {}; registre.cercles = {}; registre.demiDroites = {};
    etiquettes = Object.keys(pointsBase).reduce((acc, n) => { acc[n] = n; return acc; }, {});
    objetsConstruits = []; objetsAuxiliaires = []; dernierObjet = null;
    document.getElementById('suggestionsListe').style.display = 'none';
    // La construction de l'élève (qui pouvait masquer une étiquette fantôme en
    // reprenant le même nom) vient d'être effacée : on réaffiche ces étiquettes.
    Object.values(etiquettesCible).forEach(nom => { if (ggbApplet.exists(nom)) ggbApplet.setLabelVisible(nom, true); });
    // Coupe proprement une éventuelle pause "pas à pas" en cours.
    resolveEtape = null;
    executionDejaCommencee = false;
    mettreAJourBoutonExecuter();
    workspace.highlightBlock(null);
    surlignerLigneEditeur(-1);
}

// Fonction de réinitialisation complète (Liée au bouton) : Ne vide plus le Textarea !
function reinitialiser() {
    nettoyerDessin();
}

document.getElementById("resetButton").onclick = reinitialiser;

document.getElementById("nouvelleFigureButton").onclick = function () {
    nettoyerDessin();
    genererCible();
};

// Cycle en boucle : petit point -> point normal -> croix -> petit point ...
const STYLES_POINTS = [
    { label: "Points : ·", appliquer: (nom) => { ggbApplet.setPointStyle(nom, 0); ggbApplet.setPointSize(nom, 1); } },
    { label: "Points : ●", appliquer: (nom) => { ggbApplet.setPointStyle(nom, 0); ggbApplet.setPointSize(nom, 4); } },
    { label: "Points : +", appliquer: (nom) => { ggbApplet.setPointStyle(nom, 1); ggbApplet.setPointSize(nom, 3); } }
];
let indexStylePoints = 0;

// Applique l'état d'index donné (sans avancer le cycle) : utilisé au clic ET au
// démarrage, pour que le texte du bouton corresponde toujours au style réellement
// affiché (sinon le premier clic ne semblait "rien faire" quand le libellé HTML
// codé en dur coïncidait par hasard avec un autre état que l'index 0 réel).
function appliquerStylePoints(index) {
    indexStylePoints = index;
    const etat = STYLES_POINTS[indexStylePoints];
    ggbApplet.getAllObjectNames().forEach(nom => {
        if (ggbApplet.getObjectType(nom) !== 'point') return;
        // Les points de codage (angle droit, longueurs égales) sont toujours créés
        // masqués (setVisible(false)) : on ne les touche jamais depuis ce bouton.
        if (!ggbApplet.getVisible(nom)) return;
        etat.appliquer(nom);
    });
    document.getElementById("stylePointsButton").innerText = etat.label;
}

document.getElementById("stylePointsButton").onclick = function () {
    appliquerStylePoints((indexStylePoints + 1) % STYLES_POINTS.length);
};

// Cycle en boucle : toutes les étiquettes -> seulement les points -> aucune -> ...
// Ne concerne QUE la figure fantôme (ciblesAuxiliaires), jamais la construction de l'élève.
const ETATS_ETIQUETTES_FANTOME = [
    { label: "Étiquettes fantôme : Toutes", appliquer: (nom) => ggbApplet.setLabelVisible(nom, true) },
    { label: "Étiquettes fantôme : Points", appliquer: (nom) => ggbApplet.setLabelVisible(nom, ggbApplet.getObjectType(nom) === 'point') },
    { label: "Étiquettes fantôme : Aucune", appliquer: (nom) => ggbApplet.setLabelVisible(nom, false) }
];
let indexEtiquettesFantome = 0;

// Applique l'état d'index donné (sans avancer le cycle) : utilisé au clic ET à chaque
// nouvelle figure générée, pour que le réglage choisi reste actif d'une figure à l'autre.
function appliquerEtiquettesFantome(index) {
    indexEtiquettesFantome = index;
    const etat = ETATS_ETIQUETTES_FANTOME[indexEtiquettesFantome];
    // Uniquement les objets explicitement nommés dans le figure*.txt (via "nommer"
    // ou le nommage inline) — pas tous les objets de ciblesAuxiliaires, qui contient
    // aussi les constructions intermédiaires jamais nommées par l'auteur de la figure
    // (elles ne doivent jamais se retrouver avec une étiquette qu'on ne leur a pas donnée).
    Object.values(etiquettesCible).forEach(nom => {
        if (!ggbApplet.exists(nom) || !ggbApplet.getVisible(nom)) return;
        etat.appliquer(nom);
    });
    document.getElementById("btnEtiquettesFantome").innerText = etat.label;
}

document.getElementById("btnEtiquettesFantome").onclick = function () {
    appliquerEtiquettesFantome((indexEtiquettesFantome + 1) % ETATS_ETIQUETTES_FANTOME.length);
};
