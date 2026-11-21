/* ============================================================
   VÉRIFICATION LOGIQUE D'UNE DÉMONSTRATION
   Indépendant de Blockly et de GeoGebra (testable seul avec node).

   Un "fait" : { type, a, b }
     perp        a ⊥ b                      a = droite, b = droite ou segment
     para        a // b                     a, b = droites
     egal        a = b                      a, b = longueurs ("MA", "MB")
     surCercle   a ∈ b                                a = point, b = cercle (son nom : "c")
     surMed      a appartient à la médiatrice de b    a = point, b = segment
     mediatrice  a est la médiatrice de b             a = droite, b = segment
     milieu      a passe par le milieu de b           a = droite, b = segment
     appartient  a ∈ b                                a = point, b = droite
     longueur    a = b                                a = longueur ("AB"), b = mesure ("4,2 cm")
                 (aucune propriété ne s'en sert : c'est une donnée inutile)
   Noms : droite "d1" ou "AC", cercle "c", segment "[AB]", point "A", longueur "AB".
   Une appartenance s'écrit toujours avec le nom de la droite ou du cercle : A ∈ (d), A ∈ (c).

   Une étape : { f1, f2, prop, concl }   (chaque champ peut être null)
   ============================================================ */

const PROPRIETES = {
    // --- Parallèles et perpendiculaires (partie V du cours), dans le même ordre ---
    P1: {
        lignes: [
            "Si deux droites sont perpendiculaires à une même droite,",
            "alors elles sont parallèles entre elles."
        ]
    },
    P2: {
        lignes: [
            "Si deux droites sont parallèles entre elles",
            "et si une troisième est perpendiculaire à l'une,",
            "alors elle est aussi perpendiculaire à l'autre."
        ]
    },
    P3: {
        lignes: [
            "Si deux droites sont parallèles à une même droite,",
            "alors elles sont parallèles entre elles."
        ]
    },
    // --- Distances : cercle et médiatrice ---
    // nb : nombre d'informations « On a » utilisées (2 si absent).
    C1: {
        titre: "Définition du cercle",
        lignes: [
            "Si deux points sont sur un même cercle,",
            "alors ils sont à la même distance de son centre."
        ]
    },
    M1: {
        titre: "Définition de la médiatrice",
        nb: [1],
        lignes: [
            "Si une droite est la médiatrice d'un segment,",
            "alors elle est perpendiculaire à ce segment",
            "et elle passe par son milieu."
        ]
    },
    M2: {
        titre: "Définition de la médiatrice",
        lignes: [
            "Si une droite est perpendiculaire à un segment",
            "et passe par son milieu,",
            "alors c'est la médiatrice de ce segment."
        ]
    },
    M3: {
        titre: "Propriété de la médiatrice",
        nb: [1, 2],
        lignes: [
            "Si un point est sur la médiatrice d'un segment,",
            "alors il est à égale distance",
            "des extrémités de ce segment."
        ]
    },
    M4: {
        titre: "Propriété de la médiatrice",
        nb: [1],
        lignes: [
            "Si un point est à égale distance",
            "des extrémités d'un segment,",
            "alors il est sur la médiatrice de ce segment."
        ]
    },
    M5: {
        titre: "Propriété des droites",
        lignes: [
            "Il existe une seule droite",
            "passant par deux points distincts."
        ]
    }
};

// Une seule application, plusieurs chapitres : l'élève choisit dans le menu de l'entête.
const CHAPITRES = {
    droites: {
        nom: 'droites',
        titre: 'parallèles et perpendiculaires',
        diplome: 'Parallèles et perpendiculaires',
        fichiers: 'exercice',            // exercice1.txt, exercice2.txt, ...
        cle: 'demonstration',            // préfixe des notes gardées dans le navigateur
        proprietes: ['P1', 'P2', 'P3']
    },
    distance: {
        nom: 'distance',
        titre: 'distances, cercle et médiatrice',
        diplome: 'Cercle et médiatrice',
        fichiers: 'distance',            // distance1.txt, distance2.txt, ...
        cle: 'demonstration.distance',
        proprietes: ['C1', 'M1', 'M2', 'M3', 'M4', 'M5']
    }
};
// Le chapitre affiché : celui de l'adresse (?chapitre=distance), sinon le dernier choisi
// dans ce navigateur, sinon le premier. Changer de chapitre recharge la page.
const CLE_CHAPITRE = 'demonstration.chapitre';
function chapitreChoisi() {
    if (typeof CHAPITRE !== 'undefined') return CHAPITRE; // tests avec node
    if (typeof location === 'undefined') return null;
    const demande = new URLSearchParams(location.search).get('chapitre');
    if (demande) return demande;
    try { return localStorage.getItem(CLE_CHAPITRE); } catch (e) { return null; }
}
const CHAP = CHAPITRES[chapitreChoisi()] || CHAPITRES.droites;

const nbFaits = prop => (PROPRIETES[prop] && PROPRIETES[prop].nb) || [2];

// "d1" -> "(d1)" ; un segment "[AB]" reste tel quel. Pas d'indices Unicode (₁) : illisibles
// car trop petits. Dans la page, versHtml() les remplace par un vrai indice <sub>.
function nomAffiche(nom) {
    return nom.startsWith('[') ? nom : '(' + nom + ')';
}

// "(d1) // (d2)" -> "(d<sub>1</sub>) // (d<sub>2</sub>)" (textes générés par l'appli uniquement).
function versHtml(texte) {
    return texte.replace(/\(([A-Za-z]+)(\d+)\)/g, '($1<sub>$2</sub>)');
}

// ⊥ et // ne s'écrivent qu'entre droites : un segment [AB] y est remplacé par sa droite (AB).
function nomDroite(nom) {
    return nom.startsWith('[') ? '(' + nom.slice(1, -1) + ')' : nomAffiche(nom);
}

function texteFait(f) {
    switch (f.type) {
        case 'perp': return `${nomDroite(f.a)} ⊥ ${nomDroite(f.b)}`;
        case 'para': return `${nomAffiche(f.a)} // ${nomAffiche(f.b)}`;
        case 'egal': case 'longueur': return `${f.a} = ${f.b}`;
        case 'surCercle': return `${f.a} ∈ ${nomAffiche(f.b)}`;
        case 'surMed': return `${f.a} appartient à la médiatrice de ${f.b}`;
        // deux informations « surMed » écrites en une phrase (seulement dans les blocs)
        case 'surMed2': return `${f.a} et ${f.c} appartiennent à la médiatrice de ${f.b}`;
        case 'mediatrice': return `${nomAffiche(f.a)} est la médiatrice de ${f.b}`;
        case 'milieu': return `${nomAffiche(f.a)} passe par le milieu de ${f.b}`;
        case 'appartient': return `${f.a} ∈ ${nomAffiche(f.b)}`;
    }
    return '?';
}

// Ce que dit un fait, sans nommer les objets (pour les messages d'erreur).
const DESCRIPTIONS = {
    perp: 'des droites sont perpendiculaires',
    para: 'des droites sont parallèles',
    egal: 'deux longueurs sont égales',
    longueur: 'une longueur est connue',
    surCercle: 'un point appartient à un cercle',
    surMed: 'un point appartient à une médiatrice',
    mediatrice: 'une droite est une médiatrice',
    milieu: "une droite passe par le milieu d'un segment",
    appartient: 'un point appartient à une droite'
};

// Médiatrices nommées par une notation de l'exercice : { d: '[AB]' }. Quand (d) est le nom
// de la médiatrice de [AB], « M ∈ (d) » et « M appartient à la médiatrice de [AB] » sont
// deux écritures de la même information.
let mediatricesNommees = {};
function fixerNotations(ex) {
    mediatricesNommees = Object.fromEntries(((ex && ex.notations) || []).map(n => [n.droite, n.segment]));
}
// Une droite démontrée médiatrice (étape validée) devient elle aussi un nom de cette médiatrice.
function nommerMediatrice(droite, segment) {
    mediatricesNommees[droite] = segment;
}
// Écriture de référence d'une information (pour comparer deux écritures équivalentes).
function ecritureReference(f) {
    if (f && f.type === 'appartient' && mediatricesNommees[f.b]) return { type: 'surMed', a: f.a, b: mediatricesNommees[f.b] };
    return f;
}

const lettresTriees = s => [...s].sort().join('');
// [BA] et [AB] sont le même segment.
function cleNom(nom) {
    return nom.startsWith('[') ? '[' + lettresTriees(nom.slice(1, -1)) + ']' : nom;
}

// Clé indépendante de l'ordre : (d1) ⊥ (d3) et (d3) ⊥ (d1) sont la même information,
// comme MA = MB et BM = AM.
function cleFait(f) {
    f = ecritureReference(f);
    let a = cleNom(f.a), b = cleNom(f.b);
    if (f.type === 'egal') { a = lettresTriees(f.a); b = lettresTriees(f.b); }
    if (f.type === 'longueur') a = lettresTriees(f.a);
    if (['perp', 'para', 'egal'].includes(f.type)) [a, b] = [a, b].sort();
    return `${f.type}:${a}|${b}`;
}

function droiteCommune(f1, f2) {
    return [f1.a, f1.b].find(n => n === f2.a || n === f2.b) || null;
}

function autreDroite(f, nom) {
    return f.a === nom ? f.b : f.a;
}

// Le segment [XY] tel qu'il est écrit dans l'exercice ([BD] plutôt que [DB]).
function segmentDe(x, y, ex) {
    const cle = '[' + lettresTriees(x + y) + ']';
    return ((ex && ex.segments) || []).find(s => cleNom(s) === cle) || cle;
}

// Applique la propriété aux informations "On a" (f2 = null s'il n'y en a qu'une).
// ex : l'exercice (utile pour retrouver une droite passant par deux points).
// Retourne { conclusions: [fait, ...], conclusion: la première } ou { erreur }.
function appliquerPropriete(prop, f1, f2, ex) {
    f1 = ecritureReference(f1);
    f2 = ecritureReference(f2);
    const donc = (...faits) => ({ conclusions: faits, conclusion: faits[0] });
    const les = [f1, f2].filter(Boolean);
    const de = type => les.find(f => f.type === type);

    if (prop === 'P1' || prop === 'P3') {
        const type = prop === 'P1' ? 'perp' : 'para';
        const symbole = type === 'perp' ? '⊥' : '//';
        const mot = type === 'perp' ? 'perpendiculaires' : 'parallèles';
        if (les.length < 2 || f1.type !== type || f2.type !== type) {
            return { erreur: `cette propriété parle de deux droites ${mot} à une même droite : il faut deux informations « ${symbole} ».` };
        }
        const c = droiteCommune(f1, f2);
        if (!c) {
            return { erreur: `les deux droites doivent être ${mot} à une MÊME droite, or tes deux informations n'ont aucune droite en commun.` };
        }
        return donc({ type: 'para', a: autreDroite(f1, c), b: autreDroite(f2, c) });
    }

    if (prop === 'P2') {
        const para = de('para'), perp = de('perp');
        if (!para || !perp) {
            return { erreur: "cette propriété a besoin d'une information « // » (les deux parallèles) et d'une information « ⊥ » (la troisième droite)." };
        }
        const c = droiteCommune(para, perp);
        if (!c) {
            return { erreur: "la troisième droite doit être perpendiculaire à l'UNE des deux parallèles, or tes deux informations n'ont aucune droite en commun." };
        }
        return donc({ type: 'perp', a: autreDroite(perp, c), b: autreDroite(para, c) });
    }

    if (prop === 'C1') {
        if (les.length < 2 || f1.type !== 'surCercle' || f2.type !== 'surCercle') {
            return { erreur: "cette définition parle de deux points d'un même cercle : il faut deux appartenances à un cercle, comme A ∈ (c)." };
        }
        if (f1.b !== f2.b) return { erreur: "les deux points doivent être sur le MÊME cercle, or tes deux informations parlent de deux cercles différents." };
        const cercle = ((ex && ex.cercles) || []).find(c => c.nom === f1.b);
        if (!cercle) return { erreur: `le cercle (${f1.b}) n'est pas sur la figure.` };
        if ([f1.a, f2.a].includes(cercle.centre)) return { erreur: `${cercle.centre} est le centre du cercle : il n'est pas sur le cercle.` };
        return donc({ type: 'egal', a: cercle.centre + f1.a, b: cercle.centre + f2.a });
    }

    if (prop === 'M1') {
        const m = de('mediatrice');
        if (!m || les.length !== 1) {
            return { erreur: "cette définition part d'une seule information : « … est la médiatrice de … »." };
        }
        return donc({ type: 'perp', a: m.a, b: m.b }, { type: 'milieu', a: m.a, b: m.b });
    }

    if (prop === 'M2') {
        const perp = de('perp'), milieu = de('milieu');
        if (!perp || !milieu) {
            return { erreur: "cette définition a besoin d'une information « ⊥ » et d'une information « … passe par le milieu de … »." };
        }
        const memes = [cleNom(perp.a), cleNom(perp.b)].sort().join() === [cleNom(milieu.a), cleNom(milieu.b)].sort().join();
        if (!memes) {
            return { erreur: "la droite doit être perpendiculaire au segment ET passer par le milieu du MÊME segment : tes deux informations ne parlent pas de la même droite et du même segment." };
        }
        return donc({ type: 'mediatrice', a: milieu.a, b: milieu.b });
    }

    if (prop === 'M3') {
        // Le point est sur la médiatrice : soit « M appartient à la médiatrice de [AB] »,
        // soit « M ∈ (d) » avec « (d) est la médiatrice de [AB] ».
        const besoin = "cette propriété part d'un point qui est sur la médiatrice : soit une information « … appartient à la médiatrice de … », soit les deux informations « … ∈ (…) » et « (…) est la médiatrice de … ».";
        let point, segment;
        const sm = de('surMed');
        if (sm) {
            // la deuxième information, s'il y en a une, ne peut être que « (d) est la médiatrice de ce segment »
            const autre = les.find(f => f !== sm);
            if (autre && !(autre.type === 'mediatrice' && cleNom(autre.b) === cleNom(sm.b))) {
                return { erreur: "une seule information suffit ici : le point qui est sur la médiatrice. Retire l'autre." };
            }
            point = sm.a; segment = sm.b;
        } else {
            const app = de('appartient'), med = de('mediatrice');
            if (!app || !med) return { erreur: besoin };
            if (app.b !== med.a) return { erreur: "le point doit être sur LA médiatrice, or tes deux informations ne parlent pas de la même droite." };
            point = app.a; segment = med.b;
        }
        const [x, y] = segment.slice(1, -1);
        if (point === x || point === y) return { erreur: `${point} est une extrémité du segment ${segment} : il ne peut pas être sur sa médiatrice.` };
        return donc({ type: 'egal', a: point + x, b: point + y });
    }

    if (prop === 'M4') {
        const e = de('egal');
        if (!e || les.length !== 1) {
            return { erreur: "cette propriété part d'une seule information : une égalité de deux longueurs, comme MA = MB." };
        }
        const commun = [...e.a].find(l => e.b.includes(l));
        const x = [...e.a].find(l => l !== commun), y = [...e.b].find(l => l !== commun);
        if (!commun || !x || !y || x === y) {
            return { erreur: "les deux longueurs doivent partir d'un MÊME point (comme MA et MB) : c'est ce point qui est à égale distance des deux autres." };
        }
        return donc({ type: 'surMed', a: commun, b: segmentDe(x, y, ex) });
    }

    if (prop === 'M5') {
        // Deux points de la médiatrice : la droite qui passe par eux est donc cette médiatrice.
        if (les.length < 2 || f1.type !== 'surMed' || f2.type !== 'surMed') {
            return { erreur: "ici, cette propriété sert à reconnaître une médiatrice : il faut deux informations « … appartient à la médiatrice de … »." };
        }
        if (cleNom(f1.b) !== cleNom(f2.b)) return { erreur: "les deux points doivent appartenir à la médiatrice du MÊME segment." };
        if (f1.a === f2.a) return { erreur: "il faut deux points distincts." };
        const sur = (ex && ex.sur) || {};
        const droite = Object.keys(sur).find(d => sur[d].includes(f1.a) && sur[d].includes(f2.a));
        if (!droite) return { erreur: `aucune droite tracée ne passe par ${f1.a} et par ${f2.a}.` };
        return donc({ type: 'mediatrice', a: droite, b: f1.b });
    }

    return { erreur: "propriété inconnue." };
}

// Tout ce qu'une seule étape permet de conclure à partir des faits connus :
// liste de { fait, premisses } (les informations « On a » utilisées).
function consequences(faits, ex) {
    const nouveaux = [];
    const garder = (r, premisses) => (r.conclusions || []).forEach(c => {
        if (c.a !== c.b) nouveaux.push({ fait: c, premisses });
    });
    CHAP.proprietes.forEach(p => {
        const nb = nbFaits(p);
        if (nb.includes(1)) faits.forEach(f => garder(appliquerPropriete(p, f, null, ex), [f]));
        if (nb.includes(2)) faits.forEach((f1, i) => faits.forEach((f2, j) => {
            if (i !== j) garder(appliquerPropriete(p, f1, f2, ex), [f1, f2]);
        }));
    });
    return nouveaux;
}

// Nombre minimal d'étapes pour obtenir la conclusion à partir des informations de départ :
// pour chaque fait démontrable, on garde le plus petit ensemble de conclusions à écrire.
// Retourne aussi les types des faits rencontrés en chemin (ils alimentent les choix proposés).
function analyserExercice(ex) {
    fixerNotations(ex);
    const cleBut = cleFait(ex.montrer);
    // clé -> { fait, etapes : clés des conclusions à démontrer pour l'obtenir }
    const connus = new Map(ex.hypotheses.map(f => [cleFait(f), { fait: f, etapes: new Set() }]));
    const types = new Set([...ex.hypotheses, ex.montrer].map(f => f.type));
    for (let tour = 1; tour <= 6; tour++) {
        let change = false;
        const butConnu = connus.has(cleBut);
        consequences([...connus.values()].map(c => c.fait), ex).forEach(({ fait, premisses }) => {
            const cle = cleFait(fait);
            const etapes = new Set([cle]);
            premisses.forEach(p => connus.get(cleFait(p)).etapes.forEach(k => etapes.add(k)));
            const deja = connus.get(cle);
            if (deja && deja.etapes.size <= etapes.size) return;
            connus.set(cle, { fait, etapes });
            // Au-delà du but, les faits ne servent plus à choisir ce qu'on propose à l'élève.
            if (!butConnu) types.add(fait.type);
            change = true;
        });
        if (!change) break;
    }
    const but = connus.get(cleBut);
    return { etapes: but ? but.etapes.size : null, types };
}

// exercice : { hypotheses: [fait], montrer: fait }
// Retourne { ok, message, etape } (etape = index de l'étape fautive, ou null).
function verifierDemonstration(exercice, etapes) {
    fixerNotations(exercice);
    // Ce qu'on sait, dans l'ordre : les données puis les conclusions validées. Les clés sont
    // recalculées quand une droite est reconnue comme médiatrice (deux écritures se valent alors).
    const sus = exercice.hypotheses.map(h => ({ fait: h, statut: 'donnee' }));
    const cles = () => {
        const m = new Map(); // clé -> 'donnee' | 'demontre'
        sus.forEach(x => { if (!m.has(cleFait(x.fait))) m.set(cleFait(x.fait), x.statut); });
        return m;
    };
    let connus = cles();
    // Dans ce chapitre, certaines propriétés partent-elles d'une seule information ?
    const uneSuffit = CHAP.proprietes.some(p => nbFaits(p).includes(1));

    if (etapes.length === 0) {
        return { ok: false, etape: null, message: "Accroche au moins une étape dans le bloc Démonstration." };
    }

    for (let i = 0; i < etapes.length; i++) {
        const e = etapes[i];
        const num = `Étape ${i + 1}`;
        const echec = (message) => ({ ok: false, etape: i, message: `${num} : ${message}` });

        const faits = [e.f1, e.f2].filter(Boolean);
        const nb = e.prop ? nbFaits(e.prop) : (uneSuffit ? [1, 2] : [2]);
        if (faits.length < Math.min(...nb)) {
            if (Math.min(...nb) === 2) {
                return echec("complète les deux informations « On a ».");
            }
            return echec("complète l'information « On a ».");
        }
        if (!e.prop) return echec("choisis la propriété utilisée.");
        if (!e.concl) return echec("complète la conclusion « Donc ».");
        if (faits.length > Math.max(...nb)) {
            return echec("cette propriété part d'une seule information : retire celle qui ne sert pas.");
        }

        for (const f of [...faits, e.concl]) {
            if (f.a === f.b) return echec(`dans « ${texteFait(f)} », choisis deux droites différentes.`);
        }

        for (const f of faits) {
            const cle = cleFait(f);
            if (connus.has(cle)) continue;
            if (cle === cleFait(exercice.montrer)) return echec(`tu utilises « ${texteFait(f)} », mais c'est justement ce qu'il faut démontrer.`);
            return echec(`« ${texteFait(f)} » n'est pas une donnée de l'exercice, ni une conclusion d'une étape précédente.`);
        }

        if (faits.length === 2 && cleFait(faits[0]) === cleFait(faits[1])) return echec("tu as écrit deux fois la même information.");

        const r = appliquerPropriete(e.prop, faits[0], faits[1] || null, exercice);
        if (r.erreur) return echec(r.erreur);

        if (!r.conclusions.some(c => cleFait(c) === cleFait(e.concl))) {
            if (!r.conclusions.some(c => c.type === e.concl.type)) {
                const que = d => (/^[aeiou]/.test(d) ? "qu'" : 'que ') + d;
                const dit = [...new Set(r.conclusions.map(c => que(DESCRIPTIONS[c.type])))].join(', ou ');
                return echec(`avec cette propriété, on conclut ${dit}. Relis la partie « alors ».`);
            }
            const quoi = CHAP.nom === 'droites' ? 'les bonnes droites' : 'les bons points ou la bonne droite';
            return echec(`la conclusion ne porte pas sur ${quoi}. Relis la partie « alors » de la propriété.`);
        }

        sus.push({ fait: e.concl, statut: 'demontre' });
        if (e.concl.type === 'mediatrice') nommerMediatrice(e.concl.a, e.concl.b);
        connus = cles();
    }

    if (connus.get(cleFait(exercice.montrer)) === 'demontre') {
        return { ok: true, etape: null, message: `Bravo ! Tu as démontré que ${texteFait(exercice.montrer)}.` };
    }
    return {
        ok: false,
        etape: null,
        message: `Tes étapes sont justes, mais tu n'as pas encore démontré que ${texteFait(exercice.montrer)}. Ajoute une étape.`
    };
}

if (typeof module !== 'undefined') {
    module.exports = { fixerNotations, nommerMediatrice, PROPRIETES, CHAPITRES, nomAffiche, versHtml, texteFait, cleFait, appliquerPropriete, analyserExercice, verifierDemonstration };
}
