/* ============================================================
   EXERCICES : lecture des fichiers exerciceN.txt + figure GeoGebra

   Format d'un fichier (une instruction par ligne, "%" = commentaire) :
     droite (d3) passant par (-3,-2) et (3,1)
     droite (d1) perpendiculaire à (d3) passant par (-1,1)
     droite (d2) parallèle à (d1) passant par (2,1)
     donnée (d1) ⊥ (d3)      -> codée en vert sur la figure (sert à la vérification)
     codage (d2) ⊥ (d3)      -> seulement codée en vert sur la figure
     montrer (d1) // (d2)    -> but de la démonstration, codé en rouge une fois démontré
     points 3                -> barème de l'exercice (2 points si la ligne est absente)
     cases 2                 -> nombre de cases « On a » de chaque étape (1 ou 2)
     cases 2 1               -> 2 cases à l'étape 1, puis 1 case aux étapes suivantes
                                (sans cette ligne : 2 cases ici, 1 case dans le chapitre « distance »)
   Codages : angle droit pour ⊥, connecteur  <--- // --->  entre les deux droites pour //.
   Symboles acceptés : ⊥ ou perp, // ou ∥ ou para.

   Chapitre « distance » (fichiers distanceN.txt, choisi dans le menu de l'entête) : la figure a aussi des points.
     point A (-2,-1)
     segment [AB]
     cercle (c) de centre O passant par A      (le cercle a un nom, comme une droite)
   Les étiquettes des droites et des cercles sont en minuscules : (d), (c). Les majuscules
   sont réservées aux points ; seule une droite passant par deux points s'écrit (EF).
     droite (AC) passant par A et C
     droite (d) médiatrice de [AB]
     droite (d) médiatrice de [AB] non tracée   (nommée dans l'énoncé, pas dessinée)
   Informations (après donnée / codage / montrer) :
     OA = OB                    longueurs égales (codées par des petits traits)
     AB = 4,2 cm                longueur connue, écrite le long du segment (donnée inutile :
                                aucune propriété ne s'en sert)
     (d) ⊥ [AB]                 (d) perpendiculaire à la droite (AB) qui porte [AB] (angle droit) ;
                                l'élève le lit et l'écrit « (d) ⊥ (AB) » : ⊥ seulement entre droites
     (d) milieu [AB]            (d) passe par le milieu de [AB] (petits traits)
     (d) médiatrice [AB]        (d) est la médiatrice de [AB]
     M ∈ (d)                    M appartient à la droite (d)
     M ∈ (c)                    M appartient au cercle (c)
     M appartient à la médiatrice de [AB]
   Notation (un nom donné à un objet, affiché à part de « On sait que ») :
     notation (d) médiatrice [AB]   -> (d) est le nom de la médiatrice de [AB] : « M ∈ (d) » et
                                       « M appartient à la médiatrice de [AB] » se valent alors.
   Une appartenance s'écrit toujours avec le nom de la droite ou du cercle.
   Règle de rédaction des exercices : au plus UNE donnée inutile (distracteur) dans
   « On sait que », en plus des relations codées sur la figure.
   Dans ce chapitre, « donnée » est écrite dans « On sait que » (et codée si elle a un
   codage), « codage » n'est visible que sur la figure.
   ============================================================ */

let ggbApplet = null;
const EXERCICES = [];

const RE_FAIT = /^\((\w+)\)\s*(⊥|perp|\/\/|∥|para)\s*\((\w+)\)$/i;
const RE_POINT = '\\(\\s*(-?[\\d.]+)\\s*,\\s*(-?[\\d.]+)\\s*\\)';

function parserFait(texte) {
    const t = texte.trim();
    let m = t.match(RE_FAIT);
    if (m) {
        const type = /⊥|perp/i.test(m[2]) ? 'perp' : 'para';
        return { type, a: m[1], b: m[3] };
    }
    if ((m = t.match(/^\((\w+)\)\s*(?:⊥|perp)\s*(\[[A-Z]{2}\])$/i))) return { type: 'perp', a: m[1], b: m[2] };
    if ((m = t.match(/^([A-Z]{2})\s*=\s*([A-Z]{2})$/))) return { type: 'egal', a: m[1], b: m[2] };
    if ((m = t.match(/^([A-Z]{2})\s*=\s*(\d+(?:[.,]\d+)?\s*(?:mm|cm|m))$/))) return { type: 'longueur', a: m[1], b: m[2] };
    if ((m = t.match(/^\((\w+)\)\s+milieu\s+(?:de\s+)?(\[[A-Z]{2}\])$/i))) return { type: 'milieu', a: m[1], b: m[2] };
    if ((m = t.match(/^\((\w+)\)\s+m[ée]diatrice\s+(?:de\s+)?(\[[A-Z]{2}\])$/i))) return { type: 'mediatrice', a: m[1], b: m[2] };
    if ((m = t.match(/^([A-Z])\s+(?:appartient\s+[àa]|sur|∈)\s+(?:la\s+)?m[ée]diatrice\s+(?:de\s+)?(\[[A-Z]{2}\])$/i))) return { type: 'surMed', a: m[1], b: m[2] };
    if ((m = t.match(/^([A-Z])\s*(?:∈|sur)\s*\((\w+)\)$/))) return { type: 'appartient', a: m[1], b: m[2] };
    return null;
}

// Nature attendue de chaque nom, selon le type d'information.
const NATURES = {
    perp: ['droite', 'droiteOuSegment'], para: ['droite', 'droite'], egal: ['longueur', 'longueur'],
    milieu: ['droite', 'segment'], mediatrice: ['droite', 'segment'], surMed: ['point', 'segment'],
    surCercle: ['point', 'cercle'], appartient: ['point', 'droite'], longueur: ['longueur', 'mesure']
};

function verifierNoms(ex, fait, ligne) {
    const estPoint = n => ex.points.some(p => p.nom === n);
    const tests = {
        droite: n => ex.droites.includes(n) || `la droite (${n}) n'est pas définie`,
        segment: n => ex.segments.some(s => cleNom(s) === cleNom(n)) || `le segment ${n} n'est pas défini`,
        droiteOuSegment: n => (n.startsWith('[') ? tests.segment(n) : tests.droite(n)),
        longueur: n => ex.segments.some(s => cleNom(s) === cleNom('[' + n + ']')) || `le segment [${n}] n'est pas défini`,
        point: n => estPoint(n) || `le point ${n} n'est pas défini`,
        cercle: n => ex.cercles.some(c => c.nom === n) || `le cercle (${n}) n'est pas défini`,
        mesure: () => true
    };
    NATURES[fait.type].forEach((nature, k) => {
        const r = tests[nature](k ? fait.b : fait.a);
        if (r !== true) throw new Error(`${r} : "${ligne}"`);
    });
}

function parserExercice(texte) {
    const ex = {
        droites: [], constructions: [], hypotheses: [], donnees: [], codages: [], montrer: null, points: 2,
        // chapitre « distance » : points nommés, segments, cercles, et points situés sur chaque droite
        pts: [], segments: [], cercles: [], sur: {}, cachees: [], parPoints: [],
        notations: [], // médiatrices nommées : { droite, segment }
        cases: null // nombre de cases « On a » par étape, si le fichier le fixe
    };
    // ex.points est le barème (« points 3 ») : les points de la figure sont dans ex.pts.
    const lignes = texte.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%'));
    const reDeux = new RegExp(`^droite \\((\\w+)\\) passant par ${RE_POINT} et ${RE_POINT}$`, 'i');
    const reRel = new RegExp(`^droite \\((\\w+)\\) (perpendiculaire|parall[èe]le) [àa] \\((\\w+)\\) passant par ${RE_POINT}$`, 'i');
    const rePoint = new RegExp(`^point ([A-Z]) ${RE_POINT}$`);
    const vue = { points: ex.pts, droites: ex.droites, segments: ex.segments, cercles: ex.cercles };
    const exigerPoint = (n, ligne) => {
        if (!ex.pts.some(p => p.nom === n)) throw new Error(`le point ${n} n'est pas encore défini : "${ligne}"`);
    };

    // Étiquette d'une droite ou d'un cercle : en minuscules (les majuscules sont des points).
    const exigerMinuscule = (nom, ligne) => {
        if (!/^[a-z]/.test(nom)) throw new Error(`l'étiquette (${nom}) doit être en minuscules, comme (d) ou (c) : "${ligne}"`);
    };

    for (const ligne of lignes) {
        let m;
        if ((m = ligne.match(reDeux))) {
            exigerMinuscule(m[1], ligne);
            ex.droites.push(m[1]);
            ex.constructions.push({ nom: m[1], cmd: `Line((${m[2]},${m[3]}),(${m[4]},${m[5]}))` });
        } else if ((m = ligne.match(reRel))) {
            if (!ex.droites.includes(m[3])) throw new Error(`la droite (${m[3]}) n'est pas encore définie : "${ligne}"`);
            exigerMinuscule(m[1], ligne);
            const ref = nomGgb(m[3]);
            const cmd = /^perp/i.test(m[2])
                ? `PerpendicularLine((${m[4]},${m[5]}),${ref})`
                : `Line((${m[4]},${m[5]}),${ref})`;
            ex.droites.push(m[1]);
            ex.constructions.push({ nom: m[1], cmd });
        } else if ((m = ligne.match(rePoint))) {
            ex.pts.push({ nom: m[1], x: parseFloat(m[2]), y: parseFloat(m[3]) });
        } else if ((m = ligne.match(/^segment \[([A-Z])([A-Z])\]$/))) {
            exigerPoint(m[1], ligne); exigerPoint(m[2], ligne);
            ex.segments.push(`[${m[1]}${m[2]}]`);
        } else if ((m = ligne.match(/^cercle \((\w+)\) de centre ([A-Z]) passant par ([A-Z])$/i))) {
            exigerPoint(m[2], ligne); exigerPoint(m[3], ligne);
            exigerMinuscule(m[1], ligne);
            ex.cercles.push({ nom: m[1], centre: m[2], par: m[3] });
        } else if ((m = ligne.match(/^droite \((\w+)\) passant par ([A-Z]) et ([A-Z])$/))) {
            exigerPoint(m[2], ligne); exigerPoint(m[3], ligne);
            ex.droites.push(m[1]);
            ex.sur[m[1]] = [m[2], m[3]];
            ex.parPoints.push(m[1]);
            ex.constructions.push({ nom: m[1], cmd: `Line(${nomPoint(m[2])},${nomPoint(m[3])})` });
        } else if ((m = ligne.match(/^droite \((\w+)\) m[ée]diatrice de \[([A-Z])([A-Z])\]( non trac[ée]e)?$/i))) {
            exigerPoint(m[2], ligne); exigerPoint(m[3], ligne);
            ex.droites.push(m[1]);
            exigerMinuscule(m[1], ligne);
            if (m[4]) ex.cachees.push(m[1]);
            ex.constructions.push({ nom: m[1], cmd: `PerpendicularBisector(${nomPoint(m[2])},${nomPoint(m[3])})` });
        } else if ((m = ligne.match(/^cases((?:\s+[12])+)$/i))) {
            ex.cases = m[1].trim().split(/\s+/).map(Number);
        } else if ((m = ligne.match(/^points\s+(\d+(?:[.,]5)?)$/i))) {
            ex.points = parseFloat(m[1].replace(',', '.'));
        } else if ((m = ligne.match(/^notation\s+(.+)$/i))) {
            const fait = parserFait(m[1]);
            if (!fait || fait.type !== 'mediatrice') throw new Error(`notation illisible (attendu : notation (d) médiatrice [AB]) : "${ligne}"`);
            verifierNoms(vue, fait, ligne);
            ex.notations.push({ droite: fait.a, segment: fait.b });
            ex.hypotheses.push(fait); // on le sait, mais c'est affiché dans « Notation »
        } else if ((m = ligne.match(/^(donn[ée]e|codage|montrer)\s+(.+)$/i))) {
            const fait = parserFait(m[2]);
            if (!fait) throw new Error(`information illisible : "${ligne}"`);
            // A ∈ (C) : appartenance à un cercle si (C) est le nom d'un cercle
            if (fait.type === 'appartient' && ex.cercles.some(c => c.nom === fait.b)) fait.type = 'surCercle';
            verifierNoms(vue, fait, ligne);
            const mot = m[1].toLowerCase();
            if (mot === 'montrer') ex.montrer = fait;
            else {
                ex.hypotheses.push(fait);
                if (mot === 'codage') ex.codages.push(fait);
                else ex.donnees.push(fait);
                if (fait.type === 'appartient') (ex.sur[fait.b] = ex.sur[fait.b] || []).push(fait.a);
            }
        } else {
            throw new Error(`ligne non reconnue : "${ligne}"`);
        }
    }
    if (!ex.montrer) throw new Error('il manque la ligne « montrer … »');
    return ex;
}

// Cherche exercice1.txt, exercice2.txt, ... (ou distance1.txt, ...) jusqu'au premier fichier manquant.
async function chargerExercices() {
    for (let n = 1; n <= 50; n++) {
        try {
            const reponse = await fetch(`${CHAP.fichiers}${n}.txt`, { cache: 'no-store' });
            if (!reponse.ok) break;
            const texte = await reponse.text();
            try {
                EXERCICES.push(parserExercice(texte));
            } catch (e) {
                EXERCICES.push({ erreur: `Erreur dans ${CHAP.fichiers}${n}.txt : ${e.message}` });
            }
        } catch (e) {
            break;
        }
    }
}

/* ---------- Mélange des noms de droites ---------- */

// Permutation aléatoire des noms (jamais l'identité quand c'est possible).
function tirerPermutation(noms) {
    const melange = [...noms];
    do {
        for (let i = melange.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [melange[i], melange[j]] = [melange[j], melange[i]];
        }
    } while (noms.length > 1 && melange.every((n, i) => n === noms[i]));
    return Object.fromEntries(noms.map((n, i) => [n, melange[i]]));
}

// Copie de l'exercice où chaque droite est renommée selon la permutation.
function renommerExercice(ex, perm) {
    if (ex.pts.length) return ex; // figure avec des points nommés : les noms ne sont pas mélangés
    const f = fait => ({ ...fait, a: perm[fait.a], b: perm[fait.b] });
    return {
        ...ex,
        droites: ex.droites.map(n => perm[n]).sort(),
        constructions: ex.constructions.map(({ nom, cmd }) => ({
            nom: perm[nom],
            cmd: cmd.replace(/dr_(\w+)/g, (_, n) => nomGgb(perm[n]))
        })),
        hypotheses: ex.hypotheses.map(f),
        donnees: ex.donnees.map(f),
        codages: ex.codages.map(f),
        montrer: f(ex.montrer),
        points: ex.points
    };
}

// Nom GeoGebra d'une droite ("d1" -> dr_d1) ou d'un segment ("[BA]" -> sg_AB).
function nomGgb(nom) {
    return nom.startsWith('[') ? 'sg_' + lettresTriees(nom.slice(1, -1)) : 'dr_' + nom;
}

function nomPoint(nom) {
    return 'Pt' + nom; // majuscule obligatoire : un nom en minuscule serait un vecteur pour GeoGebra
}

/* ---------- Dessin ---------- */

const COULEUR_DROITE = [35, 48, 42];
const COULEUR_DONNEE = [47, 158, 68];   // vert : ce qu'on sait
const COULEUR_BUT = [192, 57, 43];      // rouge : ce qu'il faut démontrer
const BORD = 3.5;                       // les codages restent dans [-BORD, BORD]²

function viderFigure() {
    ggbApplet.newConstruction();
    ggbApplet.setAxesVisible(false, false);
    ggbApplet.setGridVisible(false);
    ggbApplet.setCoordSystem(-5, 5, -5, 5);
}

function styliserCodage(nom, couleur) {
    ggbApplet.setLabelVisible(nom, false);
    ggbApplet.setColor(nom, ...couleur);
    ggbApplet.setLineThickness(nom, 5);
    ggbApplet.setFixed(nom, true);
}

function marquerAngleDroit(d1, d2, couleur) {
    const t = 0.3;
    const inter = ggbApplet.evalCommandGetLabels(`Intersect(${d1},${d2})`);
    ggbApplet.setVisible(inter, false);
    const noms = ggbApplet.evalCommandGetLabels(
        `Polygon(${inter},${inter}+UnitVector(${d1})*${t},` +
        `${inter}+UnitVector(${d1})*${t}+UnitVector(${d2})*${t},` +
        `${inter}+UnitVector(${d2})*${t})`
    ).split(',');
    noms.forEach(n => styliserCodage(n, couleur));
    ggbApplet.setFilling(noms[0], 0);
}

// Géométrie d'une droite GeoGebra : un point p et un vecteur directeur unitaire u.
function geometrieDroite(g) {
    const p = ggbApplet.evalCommandGetLabels(`ClosestPoint(${g},(0,0))`);
    const u = ggbApplet.evalCommandGetLabels(`UnitVector(${g})`);
    const ux = ggbApplet.getXcoord(u), uy = ggbApplet.getYcoord(u);
    const res = { p: [ggbApplet.getXcoord(p), ggbApplet.getYcoord(p)], u: [ux, uy], occupes: [] };
    ggbApplet.deleteObject(p);
    ggbApplet.deleteObject(u);
    return res;
}

function pointSur(d, t) {
    return [d.p[0] + t * d.u[0], d.p[1] + t * d.u[1]];
}

// Paramètre t du point d'intersection de d avec e (null si parallèles).
function intersectionT(d, e) {
    const det = d.u[0] * (-e.u[1]) - d.u[1] * (-e.u[0]);
    if (Math.abs(det) < 1e-9) return null;
    const dx = e.p[0] - d.p[0], dy = e.p[1] - d.p[1];
    return (dx * (-e.u[1]) - dy * (-e.u[0])) / det;
}

function projeter(d, [x, y]) {
    const t = (x - d.p[0]) * d.u[0] + (y - d.p[1]) * d.u[1];
    return { t, pt: pointSur(d, t) };
}

function dansLeCadre([x, y]) {
    return Math.abs(x) <= BORD && Math.abs(y) <= BORD;
}

// Connecteur  <--- (//) --->  entre deux droites parallèles : un segment perpendiculaire
// aux deux droites, placé là où il gêne le moins (loin des intersections et des autres
// codages), avec « // » entouré d'un cercle au milieu et une flèche vers chaque droite.
function dessinerConnecteur(da, db, couleur, toutes) {
    let meilleur = null, score = -Infinity;
    for (let t = -7; t <= 7; t += 0.1) {
        const P = pointSur(da, t);
        const { t: tb, pt: Q } = projeter(db, P);
        if (!dansLeCadre(P) || !dansLeCadre(Q)) continue;
        const dist = [...da.occupes.map(o => Math.abs(t - o)), ...db.occupes.map(o => Math.abs(tb - o))];
        const sc = Math.min(dist.length ? Math.min(...dist) : 10, 2.5) - Math.abs(t) * 0.01;
        if (sc > score) { score = sc; meilleur = { t, tb, P, Q }; }
    }
    if (!meilleur) return;
    const { t, tb, P, Q } = meilleur;
    da.occupes.push(t);
    db.occupes.push(tb);

    const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
    const w = [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L];
    // Si d'autres droites passent entre les deux parallèles, « // » se place au
    // milieu du plus grand intervalle libre du connecteur (jamais sur une droite).
    const coupures = [0, L];
    toutes.forEach(d => {
        if (d === da || d === db) return;
        const tc = intersectionT({ p: P, u: w }, d);
        if (tc !== null && tc > 0 && tc < L) coupures.push(tc);
    });
    coupures.sort((x, y) => x - y);
    let centre = L / 2, largeur = 0;
    for (let i = 0; i + 1 < coupures.length; i++) {
        if (coupures[i + 1] - coupures[i] > largeur) {
            largeur = coupures[i + 1] - coupures[i];
            centre = (coupures[i] + coupures[i + 1]) / 2;
        }
    }
    const M = [P[0] + centre * w[0], P[1] + centre * w[1]];
    const trou = Math.min(0.48, largeur / 3); // rayon du cercle autour de « // »
    const depuis = sg => `(${M[0] + sg * trou * w[0]},${M[1] + sg * trou * w[1]})`;
    [[-1, P], [1, Q]].forEach(([sg, fin]) => {
        const v = ggbApplet.evalCommandGetLabels(`Vector(${depuis(sg)},(${fin[0]},${fin[1]}))`);
        styliserCodage(v, couleur);
        ggbApplet.setLineThickness(v, 4);
    });
    const cercle = ggbApplet.evalCommandGetLabels(`Circle((${M[0]},${M[1]}),${trou})`);
    styliserCodage(cercle, couleur);
    ggbApplet.setLineThickness(cercle, 4);
    ggbApplet.setFilling(cercle, 0);
    // « // » dessiné avec deux petits traits obliques (un texte GeoGebra se centre mal) :
    // symétriques par rapport au centre du cercle.
    const h = trou * 0.8, ecart = trou * 0.2;
    const v = [Math.cos(Math.PI * 65 / 180), Math.sin(Math.PI * 65 / 180)];
    [-1, 1].forEach(sg => {
        const c = [M[0] + sg * ecart, M[1]];
        const trait = ggbApplet.evalCommandGetLabels(
            `Segment((${c[0] - h / 2 * v[0]},${c[1] - h / 2 * v[1]}),(${c[0] + h / 2 * v[0]},${c[1] + h / 2 * v[1]}))`);
        styliserCodage(trait, couleur);
        ggbApplet.setLineThickness(trait, 4);
    });
}

// Petits traits de codage (n traits) au milieu de [P, Q] : longueurs égales.
function dessinerTraits(P, Q, n, couleur) {
    const L = Math.hypot(Q[0] - P[0], Q[1] - P[1]);
    if (!L) return;
    const u = [(Q[0] - P[0]) / L, (Q[1] - P[1]) / L], w = [-u[1], u[0]];
    for (let k = 0; k < n; k++) {
        const dec = (k - (n - 1) / 2) * 0.16;
        const c = [(P[0] + Q[0]) / 2 + dec * u[0], (P[1] + Q[1]) / 2 + dec * u[1]];
        const trait = ggbApplet.evalCommandGetLabels(
            `Segment((${c[0] - 0.2 * w[0]},${c[1] - 0.2 * w[1]}),(${c[0] + 0.2 * w[0]},${c[1] + 0.2 * w[1]}))`);
        styliserCodage(trait, couleur);
        ggbApplet.setLineThickness(trait, 4);
    }
}

function styliserTrait(g) {
    ggbApplet.setColor(g, ...COULEUR_DROITE);
    ggbApplet.setLineThickness(g, 5);
    ggbApplet.setLabelVisible(g, false);
    ggbApplet.setFixed(g, true);
}

// Points, segments et cercles (chapitre « distance »). Comme dans le cours : une croix pour
// un point isolé, un petit trait qui coupe pour un point posé sur un seul trait, rien pour
// un point à l'intersection de deux traits.
function dessinerPoints(ex, geo) {
    coordonnees = Object.fromEntries(ex.pts.map(p => [p.nom, [p.x, p.y]]));
    // Directions des traits qui passent par chaque point.
    const traits = Object.fromEntries(ex.pts.map(p => [p.nom, []]));
    // Angles (en radians) des demi-traits qui partent de chaque point : le nom se place à l'écart.
    const occupes = Object.fromEntries(ex.pts.map(p => [p.nom, []]));
    // sens : 1 = le trait part seulement dans la direction u, 2 = il traverse le point
    const ajouter = (nom, u, sens) => {
        const n = Math.hypot(u[0], u[1]);
        if (!n) return;
        const v = [u[0] / n, u[1] / n];
        if (!traits[nom].some(t => Math.abs(t[0] * v[1] - t[1] * v[0]) < 0.02)) traits[nom].push(v);
        occupes[nom].push(Math.atan2(v[1], v[0]));
        if (sens === 2) occupes[nom].push(Math.atan2(-v[1], -v[0]));
    };
    const vers = (a, b) => [coordonnees[b][0] - coordonnees[a][0], coordonnees[b][1] - coordonnees[a][1]];
    ex.segments.forEach(s => {
        const [a, b] = s.slice(1, -1);
        ajouter(a, vers(a, b), 1); ajouter(b, vers(b, a), 1);
    });
    ex.droites.filter(d => !ex.cachees.includes(d)).forEach(d => ex.pts.forEach(p => {
        // point sur la droite (annoncé dans le fichier, ou simplement posé dessus)
        const ecart = Math.abs((p.x - geo[d].p[0]) * geo[d].u[1] - (p.y - geo[d].p[1]) * geo[d].u[0]);
        if ((ex.sur[d] || []).includes(p.nom) || ecart < 0.03) ajouter(p.nom, geo[d].u, 2);
    }));
    const surCercle = ex.cercles.map(c => [c.par, c.centre])
        .concat(ex.hypotheses.filter(f => f.type === 'surCercle')
            .map(f => [f.a, ex.cercles.find(c => c.nom === f.b).centre]));
    surCercle.forEach(([m, o]) => {
        // la tangente au cercle en M est perpendiculaire au rayon [OM]
        const r = vers(o, m);
        ajouter(m, [-r[1], r[0]], 2);
    });
    // Nom du point : dans la direction la plus éloignée des traits (en haut à droite s'il est isolé).
    const ecartAngle = (x, y) => Math.abs(Math.atan2(Math.sin(x - y), Math.cos(x - y)));
    const angleNom = nom => {
        let meilleur = Math.PI / 4, score = -1;
        for (let k = 0; k < 24; k++) {
            const a = Math.PI / 4 + k * Math.PI / 12;
            const sc = Math.min(4, ...occupes[nom].map(o => ecartAngle(a, o)));
            if (sc > score + 1e-9) { score = sc; meilleur = a; }
        }
        return meilleur;
    };

    ex.pts.forEach(p => {
        const g = nomPoint(p.nom);
        ggbApplet.evalCommand(`${g}=(${p.x},${p.y})`);
        ggbApplet.setColor(g, ...COULEUR_DROITE);
        ggbApplet.setLabelVisible(g, false);
        ggbApplet.setFixed(g, true);
        // Le nom est un texte centré, placé à l'écart des traits (l'étiquette automatique
        // de GeoGebra se pose souvent sur un segment).
        const a = angleNom(p.nom);
        const texte = ggbApplet.evalCommandGetLabels(
            `Text("\\large ${p.nom}",(${p.x + 0.45 * Math.cos(a)},${p.y + 0.45 * Math.sin(a)}),false,true,0,0)`);
        ggbApplet.setColor(texte, ...COULEUR_DROITE);
        ggbApplet.setFixed(texte, true, false);
        const t = traits[p.nom];
        if (!t.length) {
            ggbApplet.setPointStyle(g, 1); // croix
            ggbApplet.setPointSize(g, 5);
        } else {
            ggbApplet.setPointStyle(g, 0);
            ggbApplet.setPointSize(g, 1);  // caché sous le trait : seul le nom se voit
            if (t.length === 1) {
                const w = [-t[0][1], t[0][0]];
                const coupe = ggbApplet.evalCommandGetLabels(
                    `Segment((${p.x - 0.17 * w[0]},${p.y - 0.17 * w[1]}),(${p.x + 0.17 * w[0]},${p.y + 0.17 * w[1]}))`);
                styliserTrait(coupe);
                ggbApplet.setLineThickness(coupe, 4);
            }
        }
    });
    ex.segments.forEach(s => {
        const [a, b] = s.slice(1, -1);
        ggbApplet.evalCommand(`${nomGgb(s)}=Segment(${nomPoint(a)},${nomPoint(b)})`);
        styliserTrait(nomGgb(s));
    });
    ex.cercles.forEach(c => {
        const g = 'ce_' + c.nom;
        ggbApplet.evalCommand(`${g}=Circle(${nomPoint(c.centre)},${nomPoint(c.par)})`);
        styliserTrait(g);
        ggbApplet.setFilling(g, 0);
        // Le cercle porte son nom, comme une droite : écrit à l'extérieur, loin des points du cercle.
        const O = coordonnees[c.centre], r = Math.hypot(coordonnees[c.par][0] - O[0], coordonnees[c.par][1] - O[1]);
        const pris = surCercle.filter(([, o]) => o === c.centre).map(([m]) => Math.atan2(coordonnees[m][1] - O[1], coordonnees[m][0] - O[0]));
        let angle = Math.PI * 3 / 4, score = -1;
        for (let k = 0; k < 24; k++) {
            const a = Math.PI * 3 / 4 + k * Math.PI / 12;
            const P = [O[0] + (r + 0.5) * Math.cos(a), O[1] + (r + 0.5) * Math.sin(a)];
            if (Math.abs(P[0]) > 4.5 || Math.abs(P[1]) > 4.5) continue; // hors de la vue
            const sc = Math.min(4, ...pris.map(o => ecartAngle(a, o)));
            if (sc > score + 1e-9) { score = sc; angle = a; }
        }
        const nom = ggbApplet.evalCommandGetLabels(
            `Text("(${c.nom.replace(/(\d+)/, '_{$1}')})",(${O[0] + (r + 0.5) * Math.cos(angle)},${O[1] + (r + 0.5) * Math.sin(angle)}),false,true,0,0)`);
        ggbApplet.setColor(nom, ...COULEUR_DROITE);
        ggbApplet.setFixed(nom, true, false);
    });
}

function dessinerExercice(ex) {
    viderFigure();
    nbEgalites = 0;
    // Les points d'abord : certaines droites passent par eux.
    ex.pts.forEach(p => ggbApplet.evalCommand(`${nomPoint(p.nom)}=(${p.x},${p.y})`));
    ex.constructions.forEach(({ nom, cmd }) => {
        const g = nomGgb(nom);
        ggbApplet.evalCommand(`${g}=${cmd}`);
        ggbApplet.setColor(g, ...COULEUR_DROITE);
        ggbApplet.setLineThickness(g, 5);
        // Légende en LaTeX, en grand : "d1" -> (d₁) avec un indice lisible.
        ggbApplet.setCaption(g, '$\\large (' + nom.replace(/(\d+)/, '_{$1}') + ')$');
        ggbApplet.setLabelStyle(g, 3);
        ggbApplet.setLabelVisible(g, true);
        ggbApplet.setFixed(g, true);
        // Droite passant par deux points nommés, comme (EF) : ses points suffisent à la nommer.
        if (ex.parPoints.includes(nom)) ggbApplet.setLabelVisible(g, false);
        // Droite seulement nommée dans l'énoncé : elle existe (pour les codages) mais ne se voit pas.
        if (ex.cachees.includes(nom)) ggbApplet.setVisible(g, false);
    });

    const geo = {};
    ex.droites.forEach(n => { geo[n] = geometrieDroite(nomGgb(n)); });
    // Les intersections sont à éviter pour les connecteurs.
    ex.droites.forEach(a => ex.droites.forEach(b => {
        if (a === b) return;
        const t = intersectionT(geo[a], geo[b]);
        if (t !== null) geo[a].occupes.push(t);
    }));
    if (ex.pts.length) dessinerPoints(ex, geo);

    geometrieCourante = geo;
    ex.hypotheses.forEach(f => coder(f, COULEUR_DONNEE));
}

let geometrieCourante = {};
let coordonnees = {};   // nom du point -> [x, y]
let nbEgalites = 0;     // chaque égalité codée a un trait de plus que la précédente

// Codages : angle droit (⊥), connecteur (//), petits traits (longueurs égales, milieu).
// Les autres informations se lisent sur la figure ou dans « On sait que ».
function coder(f, couleur) {
    const geo = geometrieCourante;
    if (f.type === 'perp') marquerAngleDroit(nomGgb(f.a), nomGgb(f.b), couleur);
    else if (f.type === 'para') dessinerConnecteur(geo[f.a], geo[f.b], couleur, Object.values(geo));
    else if (f.type === 'egal') {
        nbEgalites++;
        [f.a, f.b].forEach(l => dessinerTraits(coordonnees[l[0]], coordonnees[l[1]], nbEgalites, couleur));
    } else if (f.type === 'longueur') {
        // La mesure est écrite le long du segment, du côté extérieur de la figure.
        const A = coordonnees[f.a[0]], B = coordonnees[f.a[1]];
        const L = Math.hypot(B[0] - A[0], B[1] - A[1]);
        const w = [-(B[1] - A[1]) / L, (B[0] - A[0]) / L];
        const M = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        const pts = Object.values(coordonnees);
        const G = [pts.reduce((t, p) => t + p[0], 0) / pts.length, pts.reduce((t, p) => t + p[1], 0) / pts.length];
        const cote = (M[0] - G[0]) * w[0] + (M[1] - G[1]) * w[1] >= 0 ? 1 : -1;
        const texte = ggbApplet.evalCommandGetLabels(
            `Text("${f.b}",(${M[0] + cote * 0.4 * w[0]},${M[1] + cote * 0.4 * w[1]}),false,false,0,0)`);
        ggbApplet.setColor(texte, ...couleur);
        ggbApplet.setFixed(texte, true, false);
    } else if (f.type === 'milieu') {
        nbEgalites++;
        const [a, b] = f.b.slice(1, -1);
        const A = coordonnees[a], B = coordonnees[b], I = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2];
        dessinerTraits(A, I, nbEgalites, couleur);
        dessinerTraits(I, B, nbEgalites, couleur);
    }
}

// La conclusion n'est codée (en rouge) qu'une fois démontrée.
function coderConclusion(ex) {
    coder(ex.montrer, COULEUR_BUT);
}
