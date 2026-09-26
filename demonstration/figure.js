/* ============================================================
   EXERCICES : lecture des fichiers exerciceN.txt + figure GeoGebra

   Format d'un fichier (une instruction par ligne, "%" = commentaire) :
     droite (d3) passant par (-3,-2) et (3,1)
     droite (d1) perpendiculaire à (d3) passant par (-1,1)
     droite (d2) parallèle à (d1) passant par (2,1)
     donnée (d1) ⊥ (d3)      -> écrite dans « Données » et codée en vert
     codage (d2) ⊥ (d3)      -> seulement codée en vert sur la figure
     montrer (d1) // (d2)    -> écrite dans « À démontrer », codée en rouge une fois démontrée
   Codages : angle droit pour ⊥, connecteur  <--- // --->  entre les deux droites pour //.
   Symboles acceptés : ⊥ ou perp, // ou ∥ ou para.
   ============================================================ */

let ggbApplet = null;
const EXERCICES = [];

const RE_FAIT = /^\((\w+)\)\s*(⊥|perp|\/\/|∥|para)\s*\((\w+)\)$/i;
const RE_POINT = '\\(\\s*(-?[\\d.]+)\\s*,\\s*(-?[\\d.]+)\\s*\\)';

function parserFait(texte) {
    const m = texte.trim().match(RE_FAIT);
    if (!m) return null;
    const type = /⊥|perp/i.test(m[2]) ? 'perp' : 'para';
    return { type, a: m[1], b: m[3] };
}

function parserExercice(texte) {
    const ex = { droites: [], constructions: [], hypotheses: [], donnees: [], codages: [], montrer: null };
    const lignes = texte.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('%'));
    const reDeux = new RegExp(`^droite \\((\\w+)\\) passant par ${RE_POINT} et ${RE_POINT}$`, 'i');
    const reRel = new RegExp(`^droite \\((\\w+)\\) (perpendiculaire|parall[èe]le) [àa] \\((\\w+)\\) passant par ${RE_POINT}$`, 'i');

    for (const ligne of lignes) {
        let m;
        if ((m = ligne.match(reDeux))) {
            ex.droites.push(m[1]);
            ex.constructions.push({ nom: m[1], cmd: `Line((${m[2]},${m[3]}),(${m[4]},${m[5]}))` });
        } else if ((m = ligne.match(reRel))) {
            if (!ex.droites.includes(m[3])) throw new Error(`la droite (${m[3]}) n'est pas encore définie : "${ligne}"`);
            const ref = nomGgb(m[3]);
            const cmd = /^perp/i.test(m[2])
                ? `PerpendicularLine((${m[4]},${m[5]}),${ref})`
                : `Line((${m[4]},${m[5]}),${ref})`;
            ex.droites.push(m[1]);
            ex.constructions.push({ nom: m[1], cmd });
        } else if ((m = ligne.match(/^(donn[ée]e|codage|montrer)\s+(.+)$/i))) {
            const fait = parserFait(m[2]);
            if (!fait) throw new Error(`information illisible : "${ligne}"`);
            [fait.a, fait.b].forEach(n => {
                if (!ex.droites.includes(n)) throw new Error(`la droite (${n}) n'est pas définie : "${ligne}"`);
            });
            const mot = m[1].toLowerCase();
            if (mot === 'montrer') ex.montrer = fait;
            else {
                ex.hypotheses.push(fait);
                if (mot === 'codage') ex.codages.push(fait);
                else ex.donnees.push(fait);
            }
        } else {
            throw new Error(`ligne non reconnue : "${ligne}"`);
        }
    }
    if (!ex.montrer) throw new Error('il manque la ligne « montrer … »');
    return ex;
}

// Cherche exercice1.txt, exercice2.txt, ... jusqu'au premier fichier manquant.
async function chargerExercices() {
    for (let n = 1; n <= 50; n++) {
        try {
            const reponse = await fetch(`exercice${n}.txt`, { cache: 'no-store' });
            if (!reponse.ok) break;
            const texte = await reponse.text();
            try {
                EXERCICES.push(parserExercice(texte));
            } catch (e) {
                EXERCICES.push({ erreur: `Erreur dans exercice${n}.txt : ${e.message}` });
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
    const f = fait => ({ ...fait, a: perm[fait.a], b: perm[fait.b] });
    return {
        droites: ex.droites.map(n => perm[n]).sort(),
        constructions: ex.constructions.map(({ nom, cmd }) => ({
            nom: perm[nom],
            cmd: cmd.replace(/dr_(\w+)/g, (_, n) => nomGgb(perm[n]))
        })),
        hypotheses: ex.hypotheses.map(f),
        donnees: ex.donnees.map(f),
        codages: ex.codages.map(f),
        montrer: f(ex.montrer)
    };
}

function nomGgb(nom) {
    return 'dr_' + nom;
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

function dessinerExercice(ex) {
    viderFigure();
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
    });

    const geo = {};
    ex.droites.forEach(n => { geo[n] = geometrieDroite(nomGgb(n)); });
    // Les intersections sont à éviter pour les connecteurs.
    ex.droites.forEach(a => ex.droites.forEach(b => {
        if (a === b) return;
        const t = intersectionT(geo[a], geo[b]);
        if (t !== null) geo[a].occupes.push(t);
    }));

    geometrieCourante = geo;
    ex.hypotheses.forEach(f => coder(f, COULEUR_DONNEE));
}

let geometrieCourante = {};

function coder(f, couleur) {
    const geo = geometrieCourante;
    if (f.type === 'perp') marquerAngleDroit(nomGgb(f.a), nomGgb(f.b), couleur);
    else dessinerConnecteur(geo[f.a], geo[f.b], couleur, Object.values(geo));
}

// La conclusion n'est codée (en rouge) qu'une fois démontrée.
function coderConclusion(ex) {
    coder(ex.montrer, COULEUR_BUT);
}
