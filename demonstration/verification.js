/* ============================================================
   VÉRIFICATION LOGIQUE D'UNE DÉMONSTRATION
   Indépendant de Blockly et de GeoGebra (testable seul avec node).

   Un "fait" : { type: 'perp' | 'para', a: 'd1', b: 'd3' }  (a, b = noms de droites)
   Une étape : { f1, f2, prop: 'P1' | 'P2' | 'P3', concl }   (chaque champ peut être null)
   ============================================================ */

// Les 3 propriétés du cours (partie V), dans le même ordre.
const PROPRIETES = {
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
    }
};

// "d1" -> "(d1)". Pas d'indices Unicode (₁) : illisibles car trop petits. Dans la page,
// versHtml() les remplace par un vrai indice <sub>.
function nomAffiche(nom) {
    return '(' + nom + ')';
}

// "(d1) // (d2)" -> "(d<sub>1</sub>) // (d<sub>2</sub>)" (textes générés par l'appli uniquement).
function versHtml(texte) {
    return texte.replace(/\(([A-Za-z]+)(\d+)\)/g, '($1<sub>$2</sub>)');
}

function texteFait(f) {
    return `${nomAffiche(f.a)} ${f.type === 'perp' ? '⊥' : '//'} ${nomAffiche(f.b)}`;
}

// Clé indépendante de l'ordre : (d1) ⊥ (d3) et (d3) ⊥ (d1) sont la même information.
function cleFait(f) {
    const [x, y] = [f.a, f.b].sort();
    return `${f.type}:${x}|${y}`;
}

function droiteCommune(f1, f2) {
    return [f1.a, f1.b].find(n => n === f2.a || n === f2.b) || null;
}

function autreDroite(f, nom) {
    return f.a === nom ? f.b : f.a;
}

// Applique la propriété aux deux informations "On a".
// Retourne { conclusion } ou { erreur }.
function appliquerPropriete(prop, f1, f2) {
    if (prop === 'P1' || prop === 'P3') {
        const type = prop === 'P1' ? 'perp' : 'para';
        const symbole = type === 'perp' ? '⊥' : '//';
        const mot = type === 'perp' ? 'perpendiculaires' : 'parallèles';
        if (f1.type !== type || f2.type !== type) {
            return { erreur: `cette propriété parle de deux droites ${mot} à une même droite : il faut deux informations « ${symbole} ».` };
        }
        const c = droiteCommune(f1, f2);
        if (!c) {
            return { erreur: `les deux droites doivent être ${mot} à une MÊME droite, or tes deux informations n'ont aucune droite en commun.` };
        }
        return { conclusion: { type: 'para', a: autreDroite(f1, c), b: autreDroite(f2, c) } };
    }

    if (prop === 'P2') {
        const para = [f1, f2].find(f => f.type === 'para');
        const perp = [f1, f2].find(f => f.type === 'perp');
        if (!para || !perp) {
            return { erreur: "cette propriété a besoin d'une information « // » (les deux parallèles) et d'une information « ⊥ » (la troisième droite)." };
        }
        const c = droiteCommune(para, perp);
        if (!c) {
            return { erreur: "la troisième droite doit être perpendiculaire à l'UNE des deux parallèles, or tes deux informations n'ont aucune droite en commun." };
        }
        return { conclusion: { type: 'perp', a: autreDroite(perp, c), b: autreDroite(para, c) } };
    }

    return { erreur: "propriété inconnue." };
}

// exercice : { hypotheses: [fait], montrer: fait }
// Retourne { ok, message, etape } (etape = index de l'étape fautive, ou null).
function verifierDemonstration(exercice, etapes) {
    const cleBut = cleFait(exercice.montrer);
    // clé -> 'donnee' | 'demontre'
    const connus = new Map(exercice.hypotheses.map(h => [cleFait(h), 'donnee']));

    if (etapes.length === 0) {
        return { ok: false, etape: null, message: "Accroche au moins une étape dans le bloc Démonstration." };
    }

    for (let i = 0; i < etapes.length; i++) {
        const e = etapes[i];
        const num = `Étape ${i + 1}`;
        const echec = (message) => ({ ok: false, etape: i, message: `${num} : ${message}` });

        if (!e.f1 || !e.f2) return echec("complète les deux informations « On a ».");
        if (!e.prop) return echec("choisis la propriété utilisée.");
        if (!e.concl) return echec("complète la conclusion « Donc ».");

        for (const f of [e.f1, e.f2, e.concl]) {
            if (f.a === f.b) return echec(`dans « ${texteFait(f)} », choisis deux droites différentes.`);
        }

        for (const f of [e.f1, e.f2]) {
            const cle = cleFait(f);
            if (connus.has(cle)) continue;
            if (cle === cleBut) return echec(`tu utilises « ${texteFait(f)} », mais c'est justement ce qu'il faut démontrer.`);
            return echec(`« ${texteFait(f)} » n'est pas une donnée de l'exercice, ni une conclusion d'une étape précédente.`);
        }

        if (cleFait(e.f1) === cleFait(e.f2)) return echec("tu as écrit deux fois la même information.");

        const r = appliquerPropriete(e.prop, e.f1, e.f2);
        if (r.erreur) return echec(r.erreur);

        if (cleFait(e.concl) !== cleFait(r.conclusion)) {
            if (e.concl.type !== r.conclusion.type) {
                const mot = r.conclusion.type === 'para' ? 'parallèles' : 'perpendiculaires';
                return echec(`avec cette propriété, on conclut que des droites sont ${mot}. Relis la partie « alors ».`);
            }
            return echec("la conclusion ne porte pas sur les bonnes droites. Relis la partie « alors » de la propriété.");
        }

        connus.set(cleFait(e.concl), connus.get(cleFait(e.concl)) || 'demontre');
    }

    if (connus.get(cleBut) === 'demontre') {
        return { ok: true, etape: null, message: `Bravo ! Tu as démontré que ${texteFait(exercice.montrer)}.` };
    }
    return {
        ok: false,
        etape: null,
        message: `Tes étapes sont justes, mais tu n'as pas encore démontré que ${texteFait(exercice.montrer)}. Ajoute une étape.`
    };
}

if (typeof module !== 'undefined') {
    module.exports = { PROPRIETES, nomAffiche, versHtml, texteFait, cleFait, appliquerPropriete, verifierDemonstration };
}
