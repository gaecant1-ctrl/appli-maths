/* ============================================================
   BOT : s'assure que chaque exercice a une solution.

   Lancer depuis le dossier de l'appli :   node outils/bot-solutions.js
   (ajouter --detail pour voir la démonstration trouvée, étape par étape)

   Pour chaque chapitre et chaque fichier d'exercice, le bot :
     1. lit le fichier comme le fait l'appli (erreurs de format signalées) ;
     2. cherche une démonstration avec les propriétés du chapitre ;
     3. la fait valider étape par étape par la vraie vérification de l'appli ;
     4. contrôle que le nombre de cases « On a » prévu (ligne « cases ») suffit,
        que le nombre d'étapes annoncé à l'élève est le bon,
        et qu'il y a au plus une donnée inutile dans « On sait que ».
   Il ne teste pas l'écran (clics, affichage) : seulement la logique des exercices.
   ============================================================ */

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dossier = path.join(__dirname, '..');
const detail = process.argv.includes('--detail');
const lire = f => fs.readFileSync(path.join(dossier, f), 'utf8');

// Charge la logique de l'appli (sans écran) pour un chapitre.
function charger(chapitre) {
    const ctx = { console, CHAPITRE: chapitre };
    vm.createContext(ctx);
    vm.runInContext(lire('verification.js') + '\n' + lire('figure.js') +
        '\n;this.API = { CHAP, PROPRIETES, nbFaits, parserExercice, appliquerPropriete, verifierDemonstration,' +
        ' analyserExercice, cleFait, texteFait, fixerNotations };', ctx);
    return ctx.API;
}

// Cherche une démonstration : on ajoute tout ce qu'une étape permet de conclure, tour après
// tour, en retenant pour chaque information comment on l'a obtenue ; puis on remonte du but.
function chercherSolution(api, ex) {
    api.fixerNotations(ex);
    const cle = api.cleFait;
    const connus = new Map(ex.hypotheses.map(f => [cle(f), { fait: f }]));
    const essayer = (prop, premisses, ajouts) => {
        const r = api.appliquerPropriete(prop, premisses[0], premisses[1] || null, ex);
        (r.conclusions || []).forEach(c => {
            if (c.a === c.b || connus.has(cle(c)) || ajouts.has(cle(c))) return;
            ajouts.set(cle(c), { fait: c, prop, premisses });
        });
    };
    for (let tour = 0; tour < 8 && !connus.has(cle(ex.montrer)); tour++) {
        const faits = [...connus.values()].map(x => x.fait);
        const ajouts = new Map();
        // d'abord les étapes à une seule information (elles demandent moins de cases)
        api.CHAP.proprietes.forEach(p => {
            if (api.nbFaits(p).includes(1)) faits.forEach(f => essayer(p, [f], ajouts));
        });
        api.CHAP.proprietes.forEach(p => {
            if (api.nbFaits(p).includes(2)) faits.forEach((f1, i) => faits.forEach((f2, j) => { if (i < j) essayer(p, [f1, f2], ajouts); }));
        });
        if (!ajouts.size) break;
        ajouts.forEach((v, k) => connus.set(k, v));
    }
    if (!connus.has(cle(ex.montrer))) return null;
    const etapes = [], faites = new Set();
    const ecrire = fait => {
        const x = connus.get(cle(fait));
        if (!x.prop || faites.has(cle(fait))) return; // une donnée, ou déjà écrite
        x.premisses.forEach(ecrire);
        faites.add(cle(fait));
        etapes.push({ f1: x.premisses[0], f2: x.premisses[1] || null, prop: x.prop, concl: x.fait });
    };
    ecrire(ex.montrer);
    return etapes;
}

function controler(api, fichier) {
    const soucis = [];
    let ex;
    try { ex = api.parserExercice(lire(fichier)); } catch (e) { return { soucis: ['fichier illisible : ' + e.message] }; }
    const etapes = chercherSolution(api, ex);
    if (!etapes) return { ex, soucis: ['AUCUNE SOLUTION trouvée avec les propriétés du chapitre'] };

    // Validation étape par étape, comme le bouton « Valider l'étape ».
    etapes.forEach((_, i) => {
        const r = api.verifierDemonstration(ex, etapes.slice(0, i + 1));
        if (r.etape !== null) soucis.push(`étape ${i + 1} refusée par l'appli : ${r.message}`);
        if (i === etapes.length - 1 && !r.ok) soucis.push("la dernière étape n'est pas reconnue comme la conclusion");
    });

    // Nombre d'étapes annoncé à l'élève.
    const annonce = api.analyserExercice(ex).etapes;
    if (annonce !== etapes.length) soucis.push(`l'appli annonce ${annonce} étape(s), le bot en a besoin de ${etapes.length}`);

    // Cases « On a » : deux points d'une médiatrice s'écrivent en une seule phrase.
    etapes.forEach((e, i) => {
        const prevu = ex.cases ? ex.cases[Math.min(i, ex.cases.length - 1)] : (api.CHAP.nom === 'droites' ? 2 : 1);
        const unePhrase = e.f2 && e.f1.type === 'surMed' && e.f2.type === 'surMed' && api.CHAP.nom !== 'droites';
        const besoin = e.f2 && !unePhrase ? 2 : 1;
        if (besoin > prevu) soucis.push(`étape ${i + 1} : il faut ${besoin} cases « On a », l'exercice n'en prévoit que ${prevu} (ligne « cases »)`);
    });

    // Au plus une donnée inutile écrite dans « On sait que ».
    const utiles = new Set(etapes.flatMap(e => [e.f1, e.f2].filter(Boolean)).map(api.cleFait));
    const inutiles = ex.donnees.filter(f => !utiles.has(api.cleFait(f)));
    if (inutiles.length > 1) soucis.push(`${inutiles.length} données inutiles dans « On sait que » (${inutiles.map(api.texteFait).join(' ; ')}) : la règle est une seule`);

    return { ex, etapes, soucis, inutiles };
}

let total = 0, mauvais = 0;
['droites', 'distance'].forEach(chapitre => {
    const api = charger(chapitre);
    console.log(`\n=== ${api.CHAP.titre} ===`);
    for (let n = 1; n <= 50; n++) {
        const fichier = `${api.CHAP.fichiers}${n}.txt`;
        if (!fs.existsSync(path.join(dossier, fichier))) break;
        const r = controler(api, fichier);
        total++;
        if (r.soucis.length) mauvais++;
        const resume = r.etapes ? `${r.etapes.length} étape(s), ${r.ex.points} pt(s)` : '';
        console.log(`${r.soucis.length ? '✗' : '✓'} ${fichier.padEnd(15)} ${resume}`);
        r.soucis.forEach(s => console.log('      ⚠ ' + s));
        if (detail && r.etapes) {
            r.etapes.forEach((e, i) => console.log(`      ${i + 1}. On a : ${[e.f1, e.f2].filter(Boolean).map(api.texteFait).join(' et ')}` +
                `  |  Or : ${api.PROPRIETES[e.prop].lignes.join(' ')}  |  Donc : ${api.texteFait(e.concl)}`));
            if (r.inutiles.length) console.log(`      donnée inutile : ${r.inutiles.map(api.texteFait).join(' ; ')}`);
        }
    }
});
console.log(`\n${total - mauvais} exercice(s) sur ${total} ont une solution validée par l'appli.` + (mauvais ? ` ${mauvais} à revoir.` : ''));
process.exit(mauvais ? 1 : 0);
