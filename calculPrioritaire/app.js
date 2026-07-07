let questionCount = 0;
let score = 0;
let etatJeu = 'atelier';   // 'atelier' | 'quiz' — atelier : rien n'est compté, questions illimitées.
let quizDemarre = false;   // true une fois qu'on a cliqué "Commencer le Quiz"

// ============================================================
// GABARITS — un gabarit est une expression écrite avec des LETTRES
// GÉNÉRIQUES (a, b, c...), toujours remplacées par un nombre à la
// génération (aucune variable ne survit jusqu'à l'élève) : l'exercice
// devient un calcul purement numérique où l'élève doit respecter les
// priorités opératoires (d'où "calcul prioritaire").
//
// Moteur : celui de calcul-pri (calcul-num.js), avec sa syntaxe
// "[niveaux,types] motif | directives" — un seul banc plat de lignes,
// filtré par niveau/type actifs (voir ligneEligible()), au lieu de
// l'ancien double tableau GABARITS_PAR_NIVEAU[niveau][type].
//
// Deux catégories de lettres pour les gabarits SANS générateur explicite
// (5e/4e/3e, hérités de l'ancien moteur) :
//   - e, f, g, h : reçoivent un nombre du TYPE DE NOMBRES sélectionné dans
//     le panneau latéral (entier, décimal ou fraction).
//   - a, b, c, d (et toute autre lettre) : reçoivent toujours un entier
//     "coefficient" (voir tirerCoefficient()), quel que soit le type choisi.
// Les gabarits 6e (écrits avec intervalle()/parmiDiviseur() explicites sur
// CHAQUE lettre) ne passent jamais par ce repli.
// ============================================================

const LETTRES_TYPE_SELECTIONNE = ['e', 'f', 'g', 'h'];
// Plus de bouton "3e" séparé : son contenu ([3e,...] dans BANQUE_GABARITS)
// reste tagué tel quel, mais le bouton "4e" couvre maintenant les deux
// niveaux à la fois (voir niveauxActifsListe()).
const ORDRE_NIVEAUX = ["6", "5", "4"];

// Un seul niveau actif à la fois (les gabarits sont maintenant tagués
// [niveau,types] et gérés en un seul banc plat — plus besoin de pouvoir
// combiner plusieurs niveaux, ça évite aussi de mélanger des difficultés
// très différentes dans une même série).
let niveauActif = "5";

// ==================== TYPE DE NOMBRES (entier / décimal / fraction) ====================
// Réglage indépendant du niveau : porte sur le type des lettres e,f,g,h
// (voir LETTRES_TYPE_SELECTIONNE) ET sur le type tagué des gabarits 6e.
// Multi-sélection comme les autres réglages : si plusieurs types sont
// actifs, un seul est tiré au hasard par exercice (parmi ceux tagués sur
// la ligne piochée, intersectés avec les types actifs).
const TYPES_NOMBRES_POSSIBLES = ["entier", "decimal", "fraction"];
const typesNombresActifs = new Set(["entier"]);

// ==================== ÉCRITURE SIMPLIFIÉE ====================
// Contrôle la fusion "+ (-x)" → "- x" dans l'affichage d'une somme (voir
// _SommeNum.toLatex dans calcul-num.js). Ne concerne QUE ce cas précis :
// "- (-x)" (soustraction d'un négatif) n'est jamais fusionné en "+ x", quel
// que soit ce réglage — ça reste toujours écrit littéralement.
let ecritureSimplifiee = false;

const DEBUG = false; // Passe à true pour tracer la génération dans la console

function logger(action, data = "") {
    if (!DEBUG) return;
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    console.log(`%c[${timestamp}] %c${action.toUpperCase()}`, "color: gray", "color: #E67E22; font-weight: bold", data);
}

// ============================================================
// RÉGLAGES DE FOURCHETTE — à éditer ici directement, aucun réglage
// utilisateur dans l'UI pour ceci. Utilisés par le repli par défaut des
// lettres SANS générateur explicite (voir tirerValeurPourLettre()).
//   - Les 3 premières constantes pilotent tirerValeur*() : les nombres tirés
//     pour les lettres e,f,g,h, selon le type actif (Entiers / Décimaux /
//     Fractions) dans le panneau latéral.
//   - Les 3 suivantes pilotent tirerCoefficient() : les nombres tirés pour
//     toutes les autres lettres (a,b,c,d...), toujours entiers.
// ============================================================
const ENTIER_BORNE_MAX = 6;       // entiers tirés dans [-ENTIER_BORNE_MAX, ENTIER_BORNE_MAX], 0 exclu
const DECIMAL_DIXIEME_MAX = 9;    // dixièmes tirés dans [1, DECIMAL_DIXIEME_MAX] → 0.1 à 0.9 par défaut
const FRACTIONS_SIMPLES = ["1/2", "-1/2", "1/3", "-1/3", "2/3", "-2/3"]; // fractions autorisées (éditer la liste pour en changer)
const FRACTIONS_SIMPLES_POSITIVES = FRACTIONS_SIMPLES.filter(f => !f.startsWith('-'));

const COEFFICIENT_PROBA_REMARQUABLE = 0.5; // probabilité de tirer un remarquable plutôt qu'un coefficient quelconque
// Coefficients plus petits quand les lettres e,f,g,h sont décimales/fractionnaires :
// un gros coefficient combiné à une fraction rend le calcul très pénible pour l'élève.
const COEFFICIENT_REMARQUABLES_ENTIER = [2, -2, 3, -3, 4, -4, 5, -5, 10, -10];
const COEFFICIENT_BORNE_MAX_ENTIER = 9;
const COEFFICIENT_REMARQUABLES_FRACTIONNAIRE = [2, -2, 3, -3, 4, -4];
const COEFFICIENT_BORNE_MAX_FRACTIONNAIRE = 5;

/** Entier relatif non nul entre -ENTIER_BORNE_MAX et ENTIER_BORNE_MAX (varie les signes sans trivialiser avec 0). */
function tirerValeur(nonNegatif = false) {
    if (nonNegatif) return Math.floor(Math.random() * ENTIER_BORNE_MAX) + 1; // 1..ENTIER_BORNE_MAX
    let n;
    do { n = Math.floor(Math.random() * (2 * ENTIER_BORNE_MAX + 1)) - ENTIER_BORNE_MAX; } while (n === 0);
    return n;
}

/**
 * Décimal simple : un dixième non nul, strictement inférieur à 1 en valeur
 * absolue (0.1 à 0.DECIMAL_DIXIEME_MAX) — pas de partie entière ni d'autre
 * dénominateur, pour rester simple. Rendu directement en texte décimal
 * (ex: "0.4", "-0.7") pour que le moteur l'affiche tel quel (typeEcriture 'dec').
 */
function tirerValeurDecimale(nonNegatif = false) {
    const dixieme = 1 + Math.floor(Math.random() * DECIMAL_DIXIEME_MAX);
    const signe = (nonNegatif || Math.random() < 0.5) ? 1 : -1;
    return `${signe < 0 ? '-' : ''}0.${dixieme}`;
}

/**
 * Fraction simple usuelle, tirée parmi FRACTIONS_SIMPLES (signe déjà inclus),
 * rendue en texte "a/b" : c'est le moteur (calcul-num.js) qui la réduit et
 * l'affiche en \frac{}{}, exactement comme une division tapée par l'élève.
 */
function tirerValeurFraction(nonNegatif = false) {
    const options = nonNegatif ? FRACTIONS_SIMPLES_POSITIVES : FRACTIONS_SIMPLES;
    return options[Math.floor(Math.random() * options.length)];
}

/** Tire une valeur du type demandé ("entier" | "decimal" | "fraction"). */
function tirerValeurSelonType(type, nonNegatif = false) {
    if (type === 'decimal') return tirerValeurDecimale(nonNegatif);
    if (type === 'fraction') return tirerValeurFraction(nonNegatif);
    return tirerValeur(nonNegatif);
}

/**
 * Coefficient non nul, avec une probabilité dédiée pour 1 et -1 (comme pour
 * les valeurs). Fourchette réduite quand le type de nombres actif pour cet
 * exercice est décimal ou fractionnaire (voir COEFFICIENT_*_FRACTIONNAIRE).
 * nonNegatif=true : ne tire jamais de coefficient négatif.
 */
function tirerCoefficient(type = 'entier', nonNegatif = false) {
    const fractionnaire = (type === 'decimal' || type === 'fraction');
    const remarquablesTous = fractionnaire ? COEFFICIENT_REMARQUABLES_FRACTIONNAIRE : COEFFICIENT_REMARQUABLES_ENTIER;
    const remarquables = nonNegatif ? remarquablesTous.filter(c => c > 0) : remarquablesTous;
    const borneMax = fractionnaire ? COEFFICIENT_BORNE_MAX_FRACTIONNAIRE : COEFFICIENT_BORNE_MAX_ENTIER;

    const interdis = [0, 1, -1];
    let coeff = 0;

    while (interdis.includes(coeff)) {
        if (Math.random() < COEFFICIENT_PROBA_REMARQUABLE) {
            coeff = remarquables[Math.floor(Math.random() * remarquables.length)];
        } else {
            coeff = nonNegatif
                ? 1 + Math.floor(Math.random() * borneMax)
                : -borneMax + Math.floor(Math.random() * (2 * borneMax + 1));
        }
    }

    return coeff;
}

// ============================================================
// MOTEUR DE GABARITS TAGUÉS (porté de calcul-pri/calcul-num.js) — syntaxe
// "[niveaux,types] motif | directives". Voir calcul-pri/index.html pour la
// documentation complète de cette syntaxe (générateurs, règles, $).
// ============================================================

const NIVEAUX_CONNUS = ['6e', '5e', '4e', '3e'];
const TYPES_CONNUS = TYPES_NOMBRES_POSSIBLES;
const NOMBRE_AFF_PAR_TYPE = { decimal: 'dec', fraction: 'fractionSimple' }; // entier: pas de forçage nécessaire

/**
 * Valeur numérique d'un argument de règle. Deux cas :
 * - une lettre seule ("a") → valeur brute du dictionnaire, telle quelle ;
 * - une expression entre lettres ("a*b", "c*d") → substitution des valeurs
 *   puis évaluation via evalMV, ce qui permet des règles comme
 *   isSuperieurOuEgal(a*b, c*d) sans se limiter à des lettres isolées.
 */
function valeurArgRegle(arg, dictionnaire) {
    if (Object.prototype.hasOwnProperty.call(dictionnaire, arg)) {
        return dictionnaire[arg];
    }
    let expr = arg;
    Object.keys(dictionnaire)
        .sort((a, b) => b.length - a.length)
        .forEach(l => {
            const val = String(dictionnaire[l]);
            const valFormatee = val.startsWith('-') ? `(${val})` : val;
            expr = expr.replace(new RegExp(l, 'g'), valFormatee);
        });
    const res = evalMV(expr);
    if (!res) throw new Error(`Expression de règle invalide : "${arg}"`);
    return parseFloat(res.toString());
}

const ReglesValidation = {
    isEntier: function(lettres, dictionnaire) {
        return lettres.every(l => Number.isInteger(parseFloat(valeurArgRegle(l, dictionnaire))));
    },
    isPositif: function(lettres, dictionnaire) {
        return lettres.every(l => parseFloat(valeurArgRegle(l, dictionnaire)) > 0);
    },
    // isSuperieurOuEgal(a,b) : a >= b — garantit qu'une soustraction "a-b" ne
    // devient jamais négative. a et b peuvent être des lettres seules ou des
    // expressions ("a*b").
    isSuperieurOuEgal: function(lettres, dictionnaire) {
        if (lettres.length < 2) return true;
        return valeurArgRegle(lettres[0], dictionnaire) >= valeurArgRegle(lettres[1], dictionnaire);
    },
    isPrimeEntre: function(lettres, dictionnaire) {
        if (lettres.length < 2) return true;
        const gcd = (x, y) => {
            x = Math.abs(x); y = Math.abs(y);
            while (y) { const t = y; y = x % y; x = t; }
            return x;
        };
        const val1 = parseFloat(valeurArgRegle(lettres[0], dictionnaire));
        const val2 = parseFloat(valeurArgRegle(lettres[1], dictionnaire));
        return Number.isInteger(val1) && Number.isInteger(val2) && gcd(val1, val2) === 1;
    },
    isDifferent: function(lettres, dictionnaire) {
        const valeurs = lettres.map(l => parseFloat(valeurArgRegle(l, dictionnaire)));
        return new Set(valeurs).size === valeurs.length;
    }
};

// Noms de fonctions traités comme des GÉNÉRATEURS (une plage par lettre,
// appliqués AVANT le tirage) plutôt que comme des règles de validation.
const NOMS_GENERATEURS = ['intervalle', 'parmi', 'parmiDiviseur'];

// Noms de directives "post-hoc" : appliquées APRÈS génération complète de
// l'expression, sur l'arbre entier (pas sur des lettres isolées). Héritée de
// l'ancien moteur (evaluerAvecControle) pour les gabarits 5e sans générateurs
// explicites, où interdire juste "un produit de deux négatifs" ne se traduit
// pas simplement en règles par-lettre.
const NOMS_POST_HOC = ['sansProduitNegatifs'];

function niveauxActifsListe() {
    return [niveauActif + 'e'];
}
function typesActifsListe() {
    return [...typesNombresActifs];
}

// Découpe une liste "func(args), func2(args)" en segments, en respectant
// les parenthèses (une virgule DANS des parenthèses ne coupe pas).
function decouperDirectives(chaine) {
    if (!chaine || !chaine.trim()) return [];
    return chaine.split(/,(?![^\(]*\))/).map(s => s.trim()).filter(Boolean);
}

/** Extrait le préfixe optionnel "[tag1,tag2,...]" en tête de ligne. */
function parseTagsEtReste(ligne) {
    const m = ligne.match(/^\[([^\]]*)\]\s*(.*)$/);
    if (!m) return { niveaux: [], types: [], reste: ligne.trim() };
    const tags = m[1].split(',').map(t => t.trim()).filter(Boolean);
    return {
        niveaux: tags.filter(t => NIVEAUX_CONNUS.includes(t)),
        types: tags.filter(t => TYPES_CONNUS.includes(t)),
        reste: m[2].trim()
    };
}

/** Une ligne sans tag niveau/type est toujours éligible ; sinon il faut une intersection avec l'actif. */
function ligneEligible(ligne, niveauxAct, typesAct) {
    const { niveaux, types } = parseTagsEtReste(ligne);
    const okNiveau = niveaux.length === 0 || niveaux.some(n => niveauxAct.includes(n));
    const okType = types.length === 0 || types.some(t => typesAct.includes(t));
    return okNiveau && okType;
}

/**
 * Sépare un type d'expression "[tags] gabarit | directives" en
 * { motif, generateurs, regles, sansProduitNegatifs, niveaux, types }.
 */
function parseTypeExpression(typeStrRaw) {
    const { niveaux, types, reste } = parseTagsEtReste(typeStrRaw.trim());

    const sepIdx = reste.indexOf('|');
    const motif = (sepIdx === -1 ? reste : reste.slice(0, sepIdx)).trim();
    const directivesStr = sepIdx === -1 ? '' : reste.slice(sepIdx + 1).trim();

    if (!motif) throw new Error("Gabarit vide.");

    const generateurs = {};
    const regles = [];
    let sansProduitNegatifs = false;

    for (const seg of decouperDirectives(directivesStr)) {
        const match = seg.match(/^([a-zA-Z]+)\(([^)]*)\)$/);
        if (!match) throw new Error(`Format de directive invalide : "${seg}"`);

        const [, nomFonction, argumentsStr] = match;

        if (NOMS_POST_HOC.includes(nomFonction)) {
            if (nomFonction === 'sansProduitNegatifs') sansProduitNegatifs = true;
            continue;
        }

        const args = argumentsStr.split(',').map(a => a.trim());

        if (NOMS_GENERATEURS.includes(nomFonction)) {
            const lettre = args[0];
            if (nomFonction === 'intervalle') {
                const min = parseInt(args[1], 10), max = parseInt(args[2], 10);
                if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
                    throw new Error(`intervalle(${args.join(',')}) invalide.`);
                }
                generateurs[lettre] = { mode: 'intervalle', min, max };
            } else if (nomFonction === 'parmi') {
                const valeurs = args.slice(1).map(v => parseInt(v, 10));
                if (!valeurs.length || valeurs.some(v => !Number.isFinite(v))) {
                    throw new Error(`parmi(${args.join(',')}) invalide.`);
                }
                generateurs[lettre] = { mode: 'parmi', valeurs };
            } else if (nomFonction === 'parmiDiviseur') {
                const expr = args[1];
                if (!expr) throw new Error(`parmiDiviseur(${args.join(',')}) invalide : expression manquante.`);
                generateurs[lettre] = { mode: 'parmiDiviseur', expr };
            }
            continue;
        }

        if (!ReglesValidation[nomFonction]) {
            throw new Error(`La règle/générateur/post-hoc "${nomFonction}" n'existe pas.`);
        }
        regles.push({ lettres: args, test: ReglesValidation[nomFonction] });
    }

    return { motif, generateurs, regles, sansProduitNegatifs, niveaux, types };
}

/** Diviseurs entiers de n, strictement supérieurs à 1 (exclut le trivial "diviser par 1"). */
function diviseursDe(n) {
    const out = [];
    for (let d = 2; d <= n; d++) {
        if (n % d === 0) out.push(d);
    }
    return out;
}

/** Lettres dont dépend un générateur donné (seul parmiDiviseur référence d'autres lettres). */
function lettresDontDepend(gen) {
    if (gen && gen.mode === 'parmiDiviseur') {
        return gen.expr.match(/[a-zA-Z]/g) || [];
    }
    return [];
}

/**
 * Ordonne les lettres à tirer pour que toute lettre utilisée dans
 * l'expression d'un générateur (ex : parmiDiviseur(c, a*b)) soit tirée
 * avant la lettre qui en dépend.
 */
function ordonnerLettresSelonDependances(lettresUniques, generateurs) {
    const ordre = [];
    const visitees = new Set();

    function visiter(lettre, pile) {
        if (visitees.has(lettre)) return;
        if (pile.has(lettre)) throw new Error(`Dépendance circulaire sur la lettre "${lettre}".`);
        pile.add(lettre);
        const deps = lettresDontDepend(generateurs[lettre]).filter(l => l !== lettre && lettresUniques.includes(l));
        deps.forEach(d => visiter(d, pile));
        pile.delete(lettre);
        visitees.add(lettre);
        ordre.push(lettre);
    }

    lettresUniques.forEach(l => visiter(l, new Set()));
    return ordre;
}

/**
 * Tire une valeur pour "lettre" : générateur dédié (intervalle/parmi/
 * parmiDiviseur) en priorité ; sinon repli hérité de l'ancien moteur — les
 * lettres e,f,g,h reçoivent le type de nombres choisi pour cet exercice, les
 * autres reçoivent toujours un coefficient entier (voir tirerCoefficient()).
 */
function tirerValeurPourLettre(lettre, generateurs, typeChoisi, dictionnaire) {
    const gen = generateurs[lettre];
    if (gen) {
        if (gen.mode === 'intervalle') {
            return Math.floor(Math.random() * (gen.max - gen.min + 1)) + gen.min;
        }
        if (gen.mode === 'parmi') {
            return gen.valeurs[Math.floor(Math.random() * gen.valeurs.length)];
        }
        if (gen.mode === 'parmiDiviseur') {
            const n = Math.round(valeurArgRegle(gen.expr, dictionnaire));
            const diviseurs = diviseursDe(Math.abs(n));
            if (!diviseurs.length) throw new Error(`Aucun diviseur (>1) trouvé pour "${gen.expr}" = ${n}.`);
            return diviseurs[Math.floor(Math.random() * diviseurs.length)];
        }
    }
    if (LETTRES_TYPE_SELECTIONNE.includes(lettre)) {
        return tirerValeurSelonType(typeChoisi || 'entier', false);
    }
    return tirerCoefficient('entier', false);
}

// Résout récursivement les opérations $ prioritaires de calcul immédiat.
// PRIORITÉ : $*, $: et $/ sont TOUJOURS résolus avant $+ et $-, même si un
// "$+" apparaît plus tôt dans le texte — sinon "10$+6$*8" se calculait
// (10+6)*8 au lieu de 10+(6*8). $ reste juste un "flag caché" posé sur une
// opération ; il ne doit pas changer l'ordre mathématique des calculs.
function resoudreOperationsDollar(expr, typeChoisi) {
    // Un NUM est un cœur (parenthésé "(-7)" ou nu "7"/"1.5") suivi d'un
    // "/dénominateur" OPTIONNEL — le "/10" peut suivre un cœur parenthésé
    // ("(-7)/10", cas d'une lettre négative substituée devant "/10" du
    // gabarit) sans être capturé à tort comme juste "10" (ce qui cassait la
    // priorité : "(-7)/10$*3" ne doit jamais résoudre juste "10$*3").
    // Le "-" n'est autorisé QUE dans le cœur parenthésé : un cœur nu ne doit
    // jamais commencer par "-", sinon il avale ambigument un "-" qui est en
    // réalité l'opérateur de soustraction juste avant (ex: "...10-7/10$*9"
    // capturait à tort "-7/10" au lieu de laisser le "-" comme séparateur).
    const NUM_CORE = `(?:\\(-?\\d+(?:\\.\\d+)?\\)|\\d+(?:\\.\\d+)?)`;
    const NUM = `(${NUM_CORE}(?:/\\d+)?)`;
    const regexMult = new RegExp(`${NUM}\\s*\\$([*:/])\\s*${NUM}`);
    const regexAdd  = new RegExp(`${NUM}\\s*\\$([+\\-])\\s*${NUM}`);
    const modeAffichage = NOMBRE_AFF_PAR_TYPE[typeChoisi];

    const resoudreUnMatch = (regex) => {
        expr = expr.replace(regex, (match, gauche, op, droite) => {
            const sousExpr = `${gauche}${op}${droite}`;
            const evalResultat = evalMV(sousExpr);
            if (!evalResultat) {
                throw new Error("Calcul intermédiaire impossible : " + sousExpr);
            }
            const valeurStr = modeAffichage
                ? evalResultat.toString({ nombreAff: modeAffichage })
                : evalResultat.toString();
            return valeurStr.startsWith('-') ? `(${valeurStr})` : valeurStr;
        });
    };

    let boucleSecurite = 0;
    while ((regexMult.test(expr) || regexAdd.test(expr)) && boucleSecurite < 40) {
        resoudreUnMatch(regexMult.test(expr) ? regexMult : regexAdd);
        boucleSecurite++;
    }
    return expr;
}

/**
 * Vérifie récursivement qu'aucun produit de deux facteurs négatifs n'apparaît
 * dans l'arbre (porté de l'ancien evaluerAvecControle de calcul-mv.js, adapté
 * aux classes _Num de calcul-num.js — pas de valeurs à substituer ici, tout
 * est déjà numérique). Renvoie { valeur, ok }.
 */
function evaluerAvecControle(noeud) {
    if (noeud instanceof _AtomeNum) {
        return { valeur: noeud.evaluer(), ok: true };
    }
    if (noeud instanceof _SommeNum) {
        let total = ZERO;
        for (const terme of noeud.termes) {
            const r = evaluerAvecControle(terme);
            if (!r.ok) return r;
            total = total.add(r.valeur);
        }
        return { valeur: total, ok: true };
    }
    if (noeud instanceof _DifferenceNum) {
        const g = evaluerAvecControle(noeud.termes[0]);
        if (!g.ok) return g;
        const d = evaluerAvecControle(noeud.termes[1]);
        if (!d.ok) return d;
        return { valeur: g.valeur.sub(d.valeur), ok: true };
    }
    if (noeud instanceof _ProduitNum) {
        let total = null;
        for (const terme of noeud.termes) {
            const r = evaluerAvecControle(terme);
            if (!r.ok) return r;
            if (total === null) { total = r.valeur; continue; }
            if (total.valeurNum.a < 0 && r.valeur.valeurNum.a < 0) return { valeur: null, ok: false };
            total = total.mul(r.valeur);
        }
        return { valeur: total, ok: true };
    }
    if (noeud instanceof _QuotientNum) {
        const g = evaluerAvecControle(noeud.termes[0]);
        if (!g.ok) return g;
        const d = evaluerAvecControle(noeud.termes[1]);
        if (!d.ok) return d;
        if (g.valeur.valeurNum.a < 0 && d.valeur.valeurNum.a < 0) return { valeur: null, ok: false };
        if (d.valeur.equal(ZERO)) return { valeur: null, ok: false };
        return { valeur: g.valeur.div(d.valeur), ok: true };
    }
    if (noeud instanceof _PuissanceNum) {
        const base = evaluerAvecControle(noeud.termes[0]);
        if (!base.ok) return base;
        const exp = noeud.termes[1].evaluer();
        const n = exp.valeurNum.a;
        let total = UN;
        for (let i = 0; i < n; i++) {
            if (total.valeurNum.a < 0 && base.valeur.valeurNum.a < 0) return { valeur: null, ok: false };
            total = total.mul(base.valeur);
        }
        return { valeur: total, ok: true };
    }
    return { valeur: null, ok: false };
}

/**
 * Pipeline complet, en UNE seule boucle de retry (jusqu'à 500 essais) :
 * tirage des lettres → règles → résolution des "$" → analyse syntaxique →
 * contrôle post-hoc (sansProduitNegatifs) → évaluation finale. N'importe quel
 * échec à n'importe quelle étape relance un tirage complet.
 *
 * typesActifsPourChoix : types actuellement actifs dans le panneau — sert à
 * restreindre le choix si la ligne est taguée avec plusieurs types.
 *
 * Renvoie { dictionnaire, exprIntermediaire, exprFinale, exerciceParse, resExact, typeChoisi }
 * ou lève une Error si les 500 essais échouent tous.
 */
function genererExpressionDepuisType(typeStr, typesActifsPourChoix) {
    const { motif, generateurs, regles, sansProduitNegatifs, types } = parseTypeExpression(typeStr);

    const matches = motif.match(/[a-zA-Z]/g);
    if (!matches) throw new Error("Le gabarit doit contenir des variables (lettres).");
    const lettresUniques = [...new Set(matches)];

    const typesEligibles = types.length
        ? types.filter(t => !typesActifsPourChoix || typesActifsPourChoix.includes(t))
        : [];
    const typeChoisi = typesEligibles.length
        ? typesEligibles[Math.floor(Math.random() * typesEligibles.length)]
        : null;

    const ordreTirage = ordonnerLettresSelonDependances(lettresUniques, generateurs);

    for (let tirs = 1; tirs <= 500; tirs++) {
        const dictionnaire = {};
        try {
            ordreTirage.forEach(lettre => {
                dictionnaire[lettre] = tirerValeurPourLettre(lettre, generateurs, typeChoisi, dictionnaire);
            });
        } catch (e) {
            continue;
        }

        const reglesOk = regles.every(regle => {
            const lettresUtilisees = regle.lettres.flatMap(arg => arg.match(/[a-zA-Z]/g) || []);
            const presentes = lettresUtilisees.every(l => lettresUniques.includes(l));
            if (!presentes) return true;
            return regle.test(regle.lettres, dictionnaire);
        });
        if (!reglesOk) continue;

        let exprIntermediaire = motif;
        [...lettresUniques].sort((a, b) => b.length - a.length).forEach(lettre => {
            const val = dictionnaire[lettre];
            const valFormatee = String(val).startsWith('-') ? `(${val})` : String(val);
            exprIntermediaire = exprIntermediaire.replace(new RegExp(lettre, 'g'), valFormatee);
        });

        let exprFinale;
        try {
            exprFinale = resoudreOperationsDollar(exprIntermediaire, typeChoisi);
        } catch (e) {
            continue;
        }

        const exerciceParse = parseMV(exprFinale);
        if (!exerciceParse || !exerciceParse.isValid()) continue;

        if (sansProduitNegatifs) {
            const controle = evaluerAvecControle(exerciceParse.arbre);
            if (!controle.ok) continue;
        }

        let resExact;
        try {
            resExact = exerciceParse.calculer().resultat;
        } catch (e) {
            continue;
        }

        return { dictionnaire, exprIntermediaire, exprFinale, exerciceParse, resExact, typeChoisi };
    }

    throw new Error("Impossible de générer une expression valide après 500 essais (règles trop strictes, ou gabarit invalide).");
}

// ============================================================
// BANQUE DE GABARITS — un seul banc plat, tagué par niveau et type. Le 6e
// est la série finalisée avec le nouveau moteur (zéro négatif garanti, via
// intervalle()/isSuperieurOuEgal()/parmiDiviseur()). Le 5e/4e/3e sont repris
// tels quels de l'ancien GABARITS_PAR_NIVEAU (mêmes motifs, juste avec "*"
// explicite entre lettres — le nouveau moteur n'insère plus de multiplication
// implicite lui-même), tagués pour les 3 types (le nombre substitué à e,f,g,h
// dépend du type actif, pas du gabarit).
// ============================================================
const BANQUE_GABARITS = `
[6e,entier,A] a$+b$+c-b+c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,entier,A] a$+b$+c-(b+c) | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,entier,B] a$*b$*c:b*c | intervalle(a,2,3), intervalle(b,2,3),intervalle(c,2,9)
[6e,entier,B] a$*b$*c:(b*c) | intervalle(a,2,3), intervalle(b,2,3),intervalle(c,2,9)
[6e,entier,C] a+b*c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,entier,C] a*b+c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),
[6e,entier,C] a*b-c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),isSuperieurOuEgal(a*b,c)
[6e,entier,C] b$*c$+a-b*c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,entier,D] a*b+c*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),intervalle(d,2,9)
[6e,entier,D] a*b-c*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),intervalle(d,2,9),isSuperieurOuEgal(a*b,c*d)
[6e,entier,E] a+b$*c:c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,entier,E] a$+b-b$*c:c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,entier,E] b$*c:c+a | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,entier,E] (b$+a)$*c:c-a | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)

[6e,entier,F] (a+b*c):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[6e,entier,F] (b*c+a):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[6e,entier,F] (a$*b:b-c)*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a,c)
[6e,entier,F] a*(b+c$*d:d) | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),intervalle(d,2,9)
[6e,entier,G] (a-b)*c+d | intervalle(a,4,9), intervalle(b,2,8), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a,b)
[6e,entier,H] a*b+e+c$*d:d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9),intervalle(e,2,9)
[6e,entier,H] a*b-c$*d:d +e | intervalle(a,4,9), intervalle(b,2,8), intervalle(c,2,9), intervalle(d,2,9),intervalle(e,2,9), isSuperieurOuEgal(a*b,c)

[6e,decimal,A] a/10$+b/10$+c/10-b/10+c/10 | intervalle(a,2,30), intervalle(b,2,30), intervalle(c,2,50)
[6e,decimal,A] a/10$+b/10-b/10+c/100 | intervalle(a,2,30), intervalle(b,2,30), intervalle(c,2,20)
[6e,decimal,B] a/10$*b$*c:b*c | intervalle(a,2,3), intervalle(b,2,3),intervalle(c,2,9)
[6e,decimal,B] a/10$*b$*c:(b*c) | intervalle(a,2,3), intervalle(b,2,3),intervalle(c,2,9)
[6e,decimal,B] a/100$*b$*c:b*c | intervalle(a,2,3), intervalle(b,2,3),intervalle(c,2,9)
[6e,decimal,B] a/100$*b$*c:(b*c) | intervalle(a,2,3), intervalle(b,2,3),intervalle(c,2,9)
[6e,decimal,C] a/10+b/10*c | intervalle(a,2,9), intervalle(b,2,15), intervalle(c,2,3)
[6e,decimal,C] a/10+b/100*c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,decimal,C] a*b/10+c/10 | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,70),
[6e,decimal,C] a*b/10-c/10 | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),isSuperieurOuEgal(a*b,c)
[6e,decimal,C] b/10$*c/10$+a/10-b/10*c/10 | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6e,decimal,D] a*b/10+c*d/10 | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),intervalle(d,2,9)
[6e,decimal,D] a*b/10+c/10*d/10 | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),intervalle(d,2,9)
[6e,decimal,D] a/10*b/10+c/10*d/10 | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),intervalle(d,2,9)
[6e,decimal,D] a/10*b/10+c/10*d/10 | intervalle(a,2,20), intervalle(b,2,3), intervalle(c,2,3),intervalle(d,2,20)
[6e,decimal,D] a*b/10-c*d/10 | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),intervalle(d,2,9),isSuperieurOuEgal(a*b,c*d)
[6e,decimal,E] a/10+b/10$*c:c | intervalle(a,2,30), intervalle(b,2,9), intervalle(c,2,9)
[6e,decimal,E] a/10$+b/10-b/10$*c:c | intervalle(a,2,40), intervalle(b,2,9), intervalle(c,2,9)
[6e,decimal,E] b/100$*c:c+a/10 | intervalle(a,2,30), intervalle(b,2,9), intervalle(c,2,9)
[6e,decimal,E] (b$+a)$*c:c-a | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)

[6e,decimal,F] (a/100+b/10*c/10):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[6e,decimal,F] (a/10+b*c/10):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[6e,decimal,F] (a/10+b/10*c):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[6e,decimal,F] (b*c/100+a/100):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[6e,decimal,F] (a/10$*b:b-c/10)*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a,c)
[6e,decimal,F] a*(b/100+c/10$*d:d) | intervalle(a,2,3), intervalle(b,2,3), intervalle(c,2,9),intervalle(d,2,9)
[6e,decimal,G] (a/10-b/10)*c/10+d/10 | intervalle(a,4,9), intervalle(b,2,8), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a,b)
[6e,decimal,H] a/10*b+e/10+c/10$*d:d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9),intervalle(e,2,9)
[6e,decimal,H] a*b/10-c/10$*d:d +e/100 | intervalle(a,4,9), intervalle(b,2,8), intervalle(c,2,9), intervalle(d,2,9),intervalle(e,2,9), isSuperieurOuEgal(a*b,c)

[6e,fraction,A] a/e$+b/e-b/e+c/e | intervalle(a,1,20), intervalle(b,1,20), intervalle(c,1,20), intervalle(e,2,10)
[6e,fraction,B] a$:(e$*d)-b/e+c/e | intervalle(a,1,9), intervalle(b,1,9), intervalle(c,1,9), intervalle(d,2,5), intervalle(e,2,10),isSuperieurOuEgal(a,d*b),isPrimeEntre(a,e*d)
[6e,fraction,A] a/e$+b/e-b/e+c/e | intervalle(a,1,20), intervalle(b,1,20), intervalle(c,1,20), intervalle(e,2,10)
[6e,fraction,C] a/e+b/f+c/g | intervalle(a,1,9), intervalle(b,1,9), intervalle(c,1,9), intervalle(e,2,5), intervalle(f,2,5),intervalle(g,2,5)
[6e,fraction,D] a/e+b/e*c | intervalle(a,1,20), intervalle(b,1,9), intervalle(c,1,9), intervalle(e,2,10)
[6e,fraction,D] (a$+b$*c)$:e-b/e*c | intervalle(a,1,20), intervalle(b,1,9), intervalle(c,1,9), intervalle(e,2,10)
[6e,fraction,D] a/e*c+b/e | intervalle(a,1,20), intervalle(b,1,9), intervalle(c,1,9), intervalle(e,2,10)
[6e,fraction,B] (a$+b)$:e*c-b/e | intervalle(a,1,20), intervalle(b,1,9), intervalle(c,1,9), intervalle(e,2,10)
[6e,fraction,E] (a$*b)$:e:b+c/e | intervalle(a,1,9), intervalle(b,1,9), intervalle(c,1,9), intervalle(e,2,10),isPrimeEntre(a,e)
[6e,fraction,F] (a$+b):e-b/e | intervalle(a,1,9), intervalle(b,1,9), intervalle(c,1,9), intervalle(e,2,10)
[6e,fraction,F] (a$+b)$:e-b:e | intervalle(a,1,9), intervalle(b,1,9), intervalle(c,1,9), intervalle(e,2,10)

[5e,entier,A] a-b+c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[5e,entier,A] a-(b+c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[5e,entier,B] a$*b$*c:b*c | intervalle(a,-9,9), intervalle(b,2,3),intervalle(c,2,9)
[5e,entier,B] a$*b$*c:(b*c) | intervalle(a,-9,9), intervalle(b,2,3),intervalle(c,2,9)
[5e,entier,C] a+b*c | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9)
[5e,entier,C] a*b+c | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9)
[5e,entier,C] a-b*c | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9)
[5e,entier,C] a*b-c | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9)
[5e,entier,D] a*b+c*d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9),intervalle(d,2,9)
[5e,entier,D] a*b-c*d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9),intervalle(d,2,9)
[5e,entier,E] a+b$*c:c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9)
[5e,entier,E] a-b$*c:c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9)
[5e,entier,E] b$*c:c+a | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9)
[5e,entier,E] b$*c:c-a | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9)

[5e,entier,F] (a+b*c):d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[5e,entier,F] (b*c+a):d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[5e,entier,F] (a-b*c):d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9),parmiDiviseur(d,a-b*c)
[5e,entier,F] (b*c-a):d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9),parmiDiviseur(d,b*c-a)
[5e,entier,F] (a$*b:b+c)*d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9)
[5e,entier,F] a*(b-c$*d:d) | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,2,9)
[5e,entier,G] (a+b)*c-d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5e,entier,G] (a-b)*c+d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5e,entier,G] d-(a+b)*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5e,entier,G] d-(a-b)*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5e,entier,G] d+(a-b*c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5e,entier,G] d-(a+b*c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5e,entier,H] a*b-e+c$*d:d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9),intervalle(e,2,9)
[5e,entier,H] a*b-c$*d:d -e | intervalle(a,-9,9), intervalle(b,2,8), intervalle(c,9,9), intervalle(d,2,9),intervalle(e,2,9)

[5e,decimal,A] a/10+b/10+c/10 | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50)
[5e,decimal,A] a/10-b/10+c/10 | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50)
[5e,decimal,A] a/10-b/10-c/10 | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50)
[5e,decimal,A] a/d-b/e+c/f | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), parmi(d,1,10,100), parmi(e,1,10,100), parmi(f,1,10,100)
[5e,decimal,B] a/10$*b$*c:b*c | intervalle(a,-3,3), intervalle(b,2,3),intervalle(c,2,9)
[5e,decimal,B] a/10$*b$*c:(b*c) | intervalle(a,-3,3), intervalle(b,2,3),intervalle(c,2,9)
[5e,decimal,B] a/100$*b$*c:b*c | intervalle(a,-3,3), intervalle(b,2,3),intervalle(c,2,9)
[5e,decimal,B] a/100$*b$*c:(b*c) | intervalle(a,-3,3), intervalle(b,2,3),intervalle(c,2,9)
[5e,decimal,C] a/10+b/10*c | intervalle(a,-9,9), intervalle(b,-15,15), intervalle(c,2,3)
[5e,decimal,C] a/10+b/100*c | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,2,9)
[5e,decimal,C] a*b/10+c/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-70,70),
[5e,decimal,C] a*b/10-c/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9)
[5e,decimal,C] b/10$*c/10$+a/10-b/10*c/10 | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[5e,decimal,D] a*b/10+c*d/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,2,9),intervalle(d,-9,9)
[5e,decimal,D] a*b/10-c*d/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,2,9),intervalle(d,-9,9)
[5e,decimal,D] a*b/10+c/10*d/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,2,9),intervalle(d,2,9)
[5e,decimal,D] a*b/10-c/10*d/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,2,9),intervalle(d,2,9)
[5e,decimal,D] a/10*b/10-c/10*d/10 | intervalle(a,2,20), intervalle(b,2,3), intervalle(c,2,3),intervalle(d,2,20)
[5e,decimal,E] a/10+b/10$*c:c | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,2,9)
[5e,decimal,E] a/10-b/10$*c:c | intervalle(a,2,40), intervalle(b,-9,9), intervalle(c,2,9)
[5e,decimal,E] b/100$*c:c+a/10 | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,2,9)
[5e,decimal,E] b/100$*c:c-a/10 | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,2,9)

[5e,decimal,F] (a/100+b/10*c/10):d | intervalle(a,-20,20), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c)
[5e,decimal,F] (a/100-b/10*c/10):d | intervalle(a,-20,20), intervalle(b,2,9), intervalle(c,2,9),parmiDiviseur(d,a-b*c)
[5e,decimal,F] (a/e+b*c/e):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,2,9),parmiDiviseur(d,a+b*c),parmi(e,10,100)
[5e,decimal,F] (a/e-b/e*c):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,2,9),parmiDiviseur(d,a-b*c),parmi(e,10,100)
[5e,decimal,F] a*(b/100+(c/10)$*d:d) | intervalle(a,2,3), intervalle(b,-3,3), intervalle(c,-9,9),intervalle(d,2,9)
[5e,decimal,G] (a/10-b/10)*c/10+d/10 | intervalle(a,-9,9), intervalle(b,-8,8), intervalle(c,2,9), intervalle(d,-9,9)
[5e,decimal,H] a/10*b+e/10+c/10$*d:d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9),intervalle(e,-20,20)
[5e,decimal,H] a*b/10-c/10$*d:d +e/100 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9),intervalle(e,-30,30)

[5e,fraction,A] a/e+b/e+c/e | intervalle(a,-20,20), intervalle(b,-20,20), intervalle(c,-20,20), intervalle(e,2,10)
[5e,fraction,A] a/e-b/e+c/e | intervalle(a,-20,20), intervalle(b,-20,20), intervalle(c,-20,20), intervalle(e,2,10)
[5e,fraction,A] a/e-b/e-c/e | intervalle(a,-20,20), intervalle(b,-20,20), intervalle(c,-20,20), intervalle(e,2,10)
[5e,fraction,B] a$:(e$*d)+b/e+c/e | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,5), intervalle(e,2,10),isPrimeEntre(a,e*d)
[5e,fraction,B] b/e-a$:(e$*d)+c/e | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,5), intervalle(e,2,10),isPrimeEntre(a,e*d)
[5e,fraction,B] b/e-c/e-a$:(e$*d) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,5), intervalle(e,2,10),isPrimeEntre(a,e*d)
[5e,fraction,C] a/e+b/f+c/g | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(e,2,5), intervalle(f,2,5),intervalle(g,2,5)
[5e,fraction,D] a/e+b/e*c | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,1,9), intervalle(e,2,10)
[5e,fraction,D] a/e-b/e*c | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,1,9), intervalle(e,2,10)
[5e,fraction,D] b/e*c+a/e | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,1,9), intervalle(e,2,10)
[5e,fraction,D] b/e*c-a/e | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,1,9), intervalle(e,2,10)
[5e,fraction,E] (a$*b)$:e:b+c/e | intervalle(a,-9,9), intervalle(b,1,9), intervalle(c,-9,9), intervalle(e,2,10),isPrimeEntre(a,e)
[5e,fraction,E] (a$*b)$:e:b-c/e | intervalle(a,-9,9), intervalle(b,1,9), intervalle(c,-9,9), intervalle(e,2,10),isPrimeEntre(a,e)
[5e,fraction,E] c/e+(a$*b)$:e:b| intervalle(a,-9,9), intervalle(b,1,9), intervalle(c,-9,9), intervalle(e,2,10),isPrimeEntre(a,e)
[5e,fraction,E] c/e-(a$*b)$:e:b| intervalle(a,-9,9), intervalle(b,1,9), intervalle(c,-9,9), intervalle(e,2,10),isPrimeEntre(a,e)

[4e,entier,A] a-b+c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,A] a-(b+c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,B] a$*b$*c:b*c | intervalle(a,-9,9), intervalle(b,2,3),intervalle(c,-9,9)
[4e,entier,B] a$*b$*c:(b*c) | intervalle(a,-9,9), intervalle(b,2,3),intervalle(c,-9,9)
[4e,entier,C] a+b*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,C] a*b+c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,C] a-b*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,C] a*b-c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,D] a*b+c*d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,-9,9)
[4e,entier,D] a*b-c*d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,-9,9)
[4e,entier,E] a+b$*c:c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,E] a-b$*c:c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,E] b$*c:c+a | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,entier,E] b$*c:c-a | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)

[4e,entier,F] (a+b*c):d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9),parmiDiviseur(d,a+b*c)
[4e,entier,F] (b*c+a):d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9),parmiDiviseur(d,a+b*c)
[4e,entier,F] (a-b*c):d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9),parmiDiviseur(d,a-b*c)
[4e,entier,F] (b*c-a):d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9),parmiDiviseur(d,b*c-a)
[4e,entier,F] (a$*b:b+c)*d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9)
[4e,entier,F] a*(b-c$*d:d) | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,2,9)
[4e,entier,G] (a+b)*c-d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4e,entier,G] (a-b)*c+d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4e,entier,G] d-(a+b)*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4e,entier,G] d-(a-b)*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4e,entier,G] d+(a-b*c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4e,entier,G] d-(a+b*c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4e,entier,H] a*b-e+c$*d:d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9),intervalle(e,2,9)
[4e,entier,H] a*b-c$*d:d -e | intervalle(a,-9,9), intervalle(b,2,8), intervalle(c,9,9), intervalle(d,2,9),intervalle(e,2,9)

[4e,decimal,A] a/10+b/10+c/10 | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50)
[4e,decimal,A] a/10-b/10+c/10 | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50)
[4e,decimal,A] a/10-b/10-c/10 | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50)
[4e,decimal,A] a/d-b/e+c/f | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), parmi(d,1,10,100), parmi(e,1,10,100), parmi(f,1,10,100)
[4e,decimal,B] a/10$*b$*c:b*c | intervalle(a,-3,3), intervalle(b,2,3),intervalle(c,-9,9)
[4e,decimal,B] a/10$*b$*c:(b*c) | intervalle(a,-3,3), intervalle(b,2,3),intervalle(c,-9,9)
[4e,decimal,B] a/100$*b$*c:b*c | intervalle(a,-3,3), intervalle(b,2,3),intervalle(c,-9,9)
[4e,decimal,B] a/100$*b$*c:(b*c) | intervalle(a,-3,3), intervalle(b,2,3),intervalle(c,-9,9)
[4e,decimal,C] a/10+b/10*c | intervalle(a,-9,9), intervalle(b,-15,15), intervalle(c,-3,3)
[4e,decimal,C] a/10+b/100*c | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,decimal,C] a*b/10+c/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-70,70),
[4e,decimal,C] a*b/10-c/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,decimal,D] a*b/10+c*d/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,-9,9)
[4e,decimal,D] a*b/10-c*d/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,-9,9)
[4e,decimal,D] a*b/10+c/10*d/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,-9,9)
[4e,decimal,D] a*b/10-c/10*d/10 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,-9,9)
[4e,decimal,D] a/10*b/10-c/10*d/10 | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9),intervalle(d,-9,9)
[4e,decimal,E] a/10+b/10$*c:c | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,decimal,E] a/10-b/10$*c:c | intervalle(a,2,40), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,decimal,E] b/100$*c:c+a/10 | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,-9,9)
[4e,decimal,E] b/100$*c:c-a/10 | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,-9,9)

[4e,decimal,F] (a/100+b/10*c/10):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9),parmiDiviseur(d,a+b*c)
[4e,decimal,F] (a/100-b/10*c/10):d | intervalle(a,-20,20), intervalle(b,2,9), intervalle(c,-9,9),parmiDiviseur(d,a-b*c)
[4e,decimal,F] (a/e+b*c/e):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9),parmiDiviseur(d,a+b*c),parmi(e,10,100)
[4e,decimal,F] (a/e-b/e*c):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9),parmiDiviseur(d,a-b*c),parmi(e,10,100)
[4e,decimal,F] a*(b/100+(c/10)$*d:d) | intervalle(a,2,3), intervalle(b,-3,3), intervalle(c,-9,9),intervalle(d,2,9)
[4e,decimal,G] (a/10-b/10)*c/10+d/10 | intervalle(a,-9,9), intervalle(b,-8,8), intervalle(c,-9,9), intervalle(d,-9,9)
[4e,decimal,H] a/10*b+e/10+c/10$*d:d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9),intervalle(e,-20,20)
[4e,decimal,H] a*b/10-c/10$*d:d +e/100 | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9),intervalle(e,-30,30)

[4e,fraction,A] a/e+b/e+c/e | intervalle(a,-20,20), intervalle(b,-20,20), intervalle(c,-20,20), intervalle(e,2,10)
[4e,fraction,A] a/e-b/e+c/e | intervalle(a,-20,20), intervalle(b,-20,20), intervalle(c,-20,20), intervalle(e,2,10)
[4e,fraction,A] a/e-b/e-c/e | intervalle(a,-20,20), intervalle(b,-20,20), intervalle(c,-20,20), intervalle(e,2,10)
[4e,fraction,B] a$:(e$*d)+b/e+c/e | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,5), intervalle(e,2,10),isPrimeEntre(a,e*d)
[4e,fraction,B] b/e-a$:(e$*d)+c/e | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,5), intervalle(e,2,10),isPrimeEntre(a,e*d)
[4e,fraction,B] b/e-c/e-a$:(e$*d) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,5), intervalle(e,2,10),isPrimeEntre(a,e*d)
[4e,fraction,F] a/e+b/f+c/g | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(e,2,5), intervalle(f,2,5),intervalle(g,2,5)
[4e,fraction,C] a/e+b/e*c | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(e,2,10)
[4e,fraction,C] a/e-b/e*c | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(e,2,10)
[4e,fraction,C] b/e*c+a/e | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(e,2,10)
[4e,fraction,C] b/e*c-a/e | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(e,2,10)
[4e,fraction,D] a/e + b/e*c/d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9) , intervalle(e,2,9)
[4e,fraction,D] a/e - b/e*c/d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9) , intervalle(e,2,9)
[4e,fraction,D] b/e*c/d+a/e | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9) , intervalle(e,2,9)
[4e,fraction,D] b/e*c/d-a/e | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9) , intervalle(e,2,9)
[4e,fraction,E] a/e + b/e:c/d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9) , intervalle(e,2,9)
[4e,fraction,E] a/e - b/e:c/d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9) , intervalle(e,2,9)
[4e,fraction,E] b/e:c/d+a/e | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9) , intervalle(e,2,9)
[4e,fraction,E] b/e:c/d-a/e | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9) , intervalle(e,2,9)
[4e,fraction,F] (a+b/e)*(c+d/f) | intervalle(a,-5,5), intervalle(b,-9,9), intervalle(c,-5,-5), intervalle(d,-9,9) , intervalle(e,2,9),intervalle(e,2,9),isPrimeEntre(b,e),isPrimeEntre(d,f)
[4e,fraction,G] (a+b/e):(c+d/f) | intervalle(a,-5,5), intervalle(b,-9,9), intervalle(c,-5,-5), intervalle(d,-9,9) , intervalle(e,2,9),intervalle(e,2,9),isPrimeEntre(b,e),isPrimeEntre(d,f)
[4e,fraction,H] b:e*a+d:f*c  | intervalle(a,-5,5), intervalle(b,-9,9), intervalle(c,-5,-5), intervalle(d,-9,9) , intervalle(e,2,9),intervalle(e,2,9),isPrimeEntre(b,e),isPrimeEntre(d,f)
[4e,fraction,H] b:e*a-d:f*c  | intervalle(a,-5,5), intervalle(b,-9,9), intervalle(c,-5,-5), intervalle(d,-9,9) , intervalle(e,2,9),intervalle(e,2,9),isPrimeEntre(b,e),isPrimeEntre(d,f)
[4e,fraction,H] b:e:a-d:f:c  | intervalle(a,-5,5), intervalle(b,-9,9), intervalle(c,-5,-5), intervalle(d,-9,9) , intervalle(e,2,9),intervalle(e,2,9),isPrimeEntre(b,e),isPrimeEntre(d,f)
[4e,fraction,H] b:e:a+d:f:c  | intervalle(a,-5,5), intervalle(b,-9,9), intervalle(c,-5,-5), intervalle(d,-9,9) , intervalle(e,2,9),intervalle(e,2,9),isPrimeEntre(b,e),isPrimeEntre(d,f)
[4e,fraction,H] b/e:a+d/f:c  | intervalle(a,-5,5), intervalle(b,-9,9), intervalle(c,-5,-5), intervalle(d,-9,9) , intervalle(e,2,9),intervalle(e,2,9),isPrimeEntre(b,e),isPrimeEntre(d,f)
[4e,fraction,H] b/e:a-d/f:c  | intervalle(a,-5,5), intervalle(b,-9,9), intervalle(c,-5,-5), intervalle(d,-9,9) , intervalle(e,2,9),intervalle(e,2,9),isPrimeEntre(b,e),isPrimeEntre(d,f)


`.trim();

// Pioche unique (shuffle-bag), remélangée une fois épuisée — filtrée par
// niveaux/types actifs avant tirage (voir ligneEligible()).
let piocheBanque = [];

// ============================================================
// ExerciceEvaluation — un calcul purement numérique (plus aucune lettre).
// ============================================================
class ExerciceEvaluation {
    constructor(expr, typeChoisi = null) {
        this.expr = expr;
        this.typeChoisi = typeChoisi;
        this.resultatPoly = evalMV(expr);
        this.historiqueRef = null; // <- Le lien direct vers l'objet d'historique
    }

    get resultat() {
        return this.resultatPoly || ZERO;
    }

    enonceLatex() {
        const os = parseMV(this.expr);
        if (!os.isValid()) return this.expr;
        const modeAffichage = NOMBRE_AFF_PAR_TYPE[this.typeChoisi];
        return os.arbre.toLatex({
            ...(modeAffichage ? { nombreAff: modeAffichage } : {}),
            simplifie: ecritureSimplifiee
        });
    }
}

// ============================================================
// 🖥️ INTERFACE
// ============================================================
class InputWrapper {
    constructor(exercice, container, isQuestion = false) {
        this.status = isQuestion ? 'done' : null;
        this.exercice = exercice;
        this.container = container;
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'expression capsule-wrapper';
        this.wrapper.style.display = "flex";
        this.wrapper.style.alignItems = "center";

        this.symbolSpan = document.createElement('span');
        this.symbolSpan.className = 'symbol-zone';
        this.symbolSpan.textContent = isQuestion ? '' : '=';

        this.inputPart = document.createElement('div');
        this.inputPart.className = 'input-part';

        this.comment = document.createElement('div');
        this.comment.className = 'feedback-zone';
        this.comment.style.marginLeft = "auto";
        this.comment.style.display = "flex";
        this.comment.style.alignItems = "center";

        this.wrapper.appendChild(this.symbolSpan);
        this.wrapper.appendChild(this.inputPart);
        this.wrapper.appendChild(this.comment);
        this.container.appendChild(this.wrapper);

        if (isQuestion) {
            this.renderQuestion();
        } else {
            this.input = document.createElement('input');
            this.input.type = "text";
            this.input.placeholder = "Résultat";
            this.input.style.width = "300px";
            this.inputPart.appendChild(this.input);
            this.input.focus();
            this.input.addEventListener("keydown", (e) => this.handleInput(e));
        }
    }

    /** Énoncé : uniquement l'expression en LaTeX. */
    renderQuestion() {
        this.inputPart.innerHTML = `<div style="font-size:24px;">\\(${this.exercice.enonceLatex()}\\)</div>`;
        if (window.MathJax) MathJax.typesetPromise();
    }

    handleInput(e) {
        if (e.key === "Enter") {
            e.stopPropagation();
            if (this.status === null && this.input.value.trim() !== "") {
                this.validate();
            }
        }
    }

    updateUI(type, msg) {
        const symbols = { 'success': '=', 'error': '≠', 'neutral': '?' };
        this.wrapper.className = `expression capsule-wrapper state-${type}`;
        this.symbolSpan.textContent = symbols[type];
        this.comment.innerHTML = `<span>${msg}</span>`;

        if (msg !== "✅ Bravo !") {
            const btnX = document.createElement('button');
            btnX.className = 'delete-btn';
            btnX.onclick = () => this.wrapper.remove();
            this.comment.appendChild(btnX);

            this.status = 'processed';
            new InputWrapper(this.exercice, this.container);
        }
    }

    /**
     * N'importe quelle expression numérique égale au résultat est acceptée
     * (pas seulement un entier littéral) : la saisie est parsée par
     * calcul-num.js comme le reste de l'appli, puis comparée au résultat de
     * référence via .equal() — une égalité "sur atome", jamais une
     * comparaison de texte. Tant que la saisie n'est pas réduite à un atome
     * unique (ex: "1+2*3", correct mais pas encore calculé jusqu'au bout),
     * on l'accepte comme juste mais on redemande de calculer.
     */
validate() {
        const texte = this.input.value.trim().replace(/\s+/g, '');

        if (/[a-zA-Z]/.test(texte)) {
            this.freeze(texte);
            return this.updateUI('neutral', "Invalide (pas de lettres)");
        }

        const os = parseMV(texte);
        const polySaisi = os.isValid() ? os.arbre.evaluer() : null;

        this.freeze(texte);

        if (!polySaisi) return this.updateUI('neutral', "Invalide");
        
        // On récupère la référence directe de l'historique portée par l'exercice
        const hist = this.exercice.historiqueRef;

        if (!this.exercice.resultatPoly || !polySaisi.equal(this.exercice.resultatPoly)) {
            // S'il se trompe et que le statut n'avait pas encore été tagué, c'est un échec pour cet exercice
            if (hist && hist.statut === null) {
                hist.statut = 'echoue';
            }
            return this.updateUI('error', "Pas égal");
        }

        const estAtome = os.arbre instanceof _AtomeNum;
        const estFractionSimple = os.arbre instanceof _QuotientNum &&
            os.arbre.termes[0] instanceof _AtomeNum &&
            os.arbre.termes[1] instanceof _AtomeNum;

        if (!estAtome && !estFractionSimple) {
            return this.updateUI('success', "À calculer");
        }

        const type = this.exercice.typeChoisi;

        if (type === 'decimal' && !estAtome) {
            return this.updateUI('success', "Écris le résultat en écriture décimale");
        }

        if (type === 'fraction' && estFractionSimple) {
            const numAtome = os.arbre.termes[0].evaluer().valeurNum.a;
            const denAtome = os.arbre.termes[1].evaluer().valeurNum.a;
            const pgcd = (x, y) => {
                x = Math.abs(x); y = Math.abs(y);
                while (y) { const t = y; y = x % y; x = t; }
                return x;
            };
            if (pgcd(numAtome, denAtome) !== 1) {
                return this.updateUI('success', "Simplifie la fraction");
            }
        }

        // Si on arrive ici, l'exercice est validé et fini. 
        // Si le statut est resté à null, c'est qu'il a réussi du premier coup sans passer par 'echoue' !
        if (hist && hist.statut === null) {
            hist.statut = 'reussi';
        }

        this.updateUI('success', "✅ Bravo !");
        this.status = 'done';
        createNextBtn(this.container);
    }

freeze(texte) {
        if (this.input) {
            this.input.remove();
            const os = parseMV(texte);

            // Si c'est valide, on demande le rendu brut propre de l'arbre.
            // Si c'est invalide, on affiche le texte tapé mot pour mot, sans fioritures MathJax.
            const display = os.isValid() ? os.arbre.toLatex({ brut: true }) : texte;

            this.inputPart.innerHTML = `<div style="font-size:24px;">\\(${display}\\)</div>`;
            if (window.MathJax) MathJax.typesetPromise();
        }
    }
}

// ==================== SÉLECTEUR DE NIVEAU (6e / 5e / 4e / 3e) ====================
// Ajouter un niveau plus tard revient à ajouter des lignes taguées dans
// BANQUE_GABARITS : aucune autre logique à toucher.

/** Construit le sélecteur de niveau (sélection unique, comme des boutons radio) pour le panneau latéral. */
function construireSelecteurNiveau(disabled = false) {
    const wrap = document.createElement('div');
    wrap.id = 'selecteurNiveau';
    wrap.className = 'panel-type-list';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Choix des niveaux');

    ORDRE_NIVEAUX.forEach(code => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn' + (niveauActif === code ? ' active' : '');
        btn.textContent = code === '4' ? '4e/3e' : `${code}e`;
        btn.disabled = disabled;

        btn.addEventListener('click', () => {
            if (niveauActif === code) return; // déjà actif, rien à faire
            niveauActif = code;
            wrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            piocheBanque = [];
        });

        wrap.appendChild(btn);
    });

    return wrap;
}

/**
 * Construit le sélecteur "Entiers" / "Décimaux" / "Fractions" (réglage
 * indépendant du niveau), en multi-sélection comme les autres réglages.
 */
function construireSelecteurTypeNombres(disabled = false) {
    const wrap = document.createElement('div');
    wrap.className = 'panel-groupe-paire';

    const labels = { entier: 'Entiers', decimal: 'Décimaux', fraction: 'Fractions' };

    TYPES_NOMBRES_POSSIBLES.forEach(type => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn panel-btn-half' + (typesNombresActifs.has(type) ? ' active' : '');
        btn.textContent = labels[type];
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (typesNombresActifs.has(type)) {
                if (typesNombresActifs.size > 1) { // garder au moins un actif
                    typesNombresActifs.delete(type);
                    btn.classList.remove('active');
                }
            } else {
                typesNombresActifs.add(type);
                btn.classList.add('active');
            }
            piocheBanque = [];
        });
        wrap.appendChild(btn);
    });

    return wrap;
}

/**
 * Construit le sélecteur "Oui" / "Non" pour l'écriture simplifiée (sélection
 * unique, comme le niveau) : n'affecte que le rendu (voir enonceLatex()), pas
 * la génération — pas besoin de vider la pioche au changement.
 */
function construireSelecteurEcritureSimplifiee(disabled = false) {
    const wrap = document.createElement('div');
    wrap.className = 'panel-groupe-paire';

    [{ val: true, label: 'Oui' }, { val: false, label: 'Non' }].forEach(opt => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn panel-btn-half' + (ecritureSimplifiee === opt.val ? ' active' : '');
        btn.textContent = opt.label;
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (ecritureSimplifiee === opt.val) return;
            ecritureSimplifiee = opt.val;
            wrap.querySelectorAll('button').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
        wrap.appendChild(btn);
    });

    return wrap;
}

/** Installe le bouton "Nouvel onglet" dans le bandeau.
 *  Repli si window.open() est bloqué (iframe sandbox) : affiche un lien
 *  cliquable à côté du bouton. */
function setupBoutonNouvelOnglet() {
    const conteneur = document.getElementById("topButtonsBar");
    if (!conteneur) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnNouvelOnglet';
    btn.className = 'btn-header';
    btn.textContent = 'Nouvel onglet';

    const repli = document.createElement('span');
    repli.style.cssText = 'display:none; font-size:0.8em; margin-left:8px;';
    repli.innerHTML = `Bloqué — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

    btn.onclick = () => {
        const w = window.open(window.location.href, "_blank", "noopener");
        if (!w) repli.style.display = 'inline';
    };

    conteneur.appendChild(btn);
    conteneur.appendChild(repli);
}

// --- Fonctions de génération ---

/** Une expression connue sûre (jamais dégénérée, jamais de produit de deux négatifs). */
function genererExerciceDeSecours() {
    logger("Filet ultime déclenché");
    return new ExerciceEvaluation("3+2*4");
}

/**
 * Génère un exercice valide en piochant dans BANQUE_GABARITS (filtrée par
 * niveaux/types actifs), sans répétition jusqu'à épuisement (shuffle-bag).
 * Si une ligne échoue entièrement (500 tirages internes épuisés), on essaie
 * la suivante ; après 20 lignes infructueuses, filet de sécurité.
 */
// Variable globale à placer juste au-dessus de la fonction dans app.js
let dernierGroupeTire = null;
let historiqueSession = [];

function generateRandomExpression() {
    const lignes = BANQUE_GABARITS.split('\n').map(l => l.trim()).filter(Boolean);
    const niveauxAct = niveauxActifsListe(); // ex: ["6e"]
    const typesAct = typesActifsListe();     // Éléments UNIQUEMENT cochés par l'utilisateur (ex: ["entier", "decimal"])
    
    // 1. Filtrer toutes les lignes éligibles pour le niveau actif ET les types cochés
    const eligibles = lignes.filter(l => ligneEligible(l, niveauxAct, typesAct));

    if (!eligibles.length) {
        logger("Aucune ligne éligible pour ces niveaux/types");
        return genererExerciceDeSecours();
    }

    // 📊 ANALYSE DE L'HISTORIQUE PAR RAPPORT AUX RÉGLAGES ACTIFS
    const historiqueNiveau = historiqueSession.filter(h => h.niveau === (niveauActif + 'e'));
    
    // On initialise les compteurs de types UNIQUEMENT pour les types cochés par l'utilisateur
    const compteTypes = {};
    typesAct.forEach(t => compteTypes[t] = 0);
    
    // On ne compte dans l'historique que ce qui correspond aux réglages actuels
    historiqueNiveau.forEach(h => {
        if (compteTypes[h.typeNombre] !== undefined) {
            compteTypes[h.typeNombre]++;
        }
    });

    // Détermination du type le en retard parmi ceux cochés
    let typeMoinsJoue = typesAct[0];
    let minTiragesType = compteTypes[typeMoinsJoue];
    
    typesAct.forEach(t => {
        if (compteTypes[t] < minTiragesType) {
            minTiragesType = compteTypes[t];
            typeMoinsJoue = t;
        }
    });

    // Égalisation : s'il y a des ex-æquo sur le minimum, on tire au sort parmi eux
    const typesMinima = typesAct.filter(t => compteTypes[t] === minTiragesType);
    const typeChoisiFinal = typesMinima[Math.floor(Math.random() * typesMinima.length)];

    logger("Régulation Type (Filtre actif)", `Compteurs configurés: ${JSON.stringify(compteTypes)} -> Choix forcé: ${typeChoisiFinal}`);

    // 2. Filtrer les gabarits éligibles uniquement pour CE type choisi
    const lignesPourType = eligibles.filter(l => {
        const { types } = parseTagsEtReste(l);
        return types.length === 0 || types.includes(typeChoisiFinal);
    });

    // 3. Regrouper ces lignes par Groupe (A, B, C...)
    const groupes = {};
    lignesPourType.forEach(ligne => {
        const m = ligne.match(/^\[([^\]]*)\]/);
        const tags = m ? m[1].split(',').map(t => t.trim()) : [];
        const categorie = tags.find(t => !NIVEAUX_CONNUS.includes(t) && !TYPES_CONNUS.includes(t)) || 'general';
        
        if (!groupes[categorie]) groupes[categorie] = [];
        groupes[categorie].push(ligne);
    });

    const categoriesDisponibles = Object.keys(groupes);

    // 📊 ANALYSE DES LETTRES (TAGS) POUR CE TYPE DE NOMBRE PARTICULIER
    const compteGroupes = {};
    categoriesDisponibles.forEach(c => compteGroupes[c] = 0);
    
    historiqueNiveau
        .filter(h => h.typeNombre === typeChoisiFinal)
        .forEach(h => {
            if (compteGroupes[h.groupe] !== undefined) compteGroupes[h.groupe]++;
        });

    // Trouver le nombre maximum de tirages actuel parmi les groupes de ce type
    let maxTiragesGroupe = -1;
    categoriesDisponibles.forEach(c => {
        if (compteGroupes[c] > maxTiragesGroupe) maxTiragesGroupe = compteGroupes[c];
    });

    // Stratégie d'évitement : on prend d'abord ceux qui ont MOINS de tirages que le maximum
    let categoriesFiltrees = categoriesDisponibles.filter(c => compteGroupes[c] < maxTiragesGroupe);
    if (categoriesFiltrees.length === 0) {
        categoriesFiltrees = categoriesDisponibles; // Si tous sont à égalité, on les autorise tous
    }

    logger("Régulation Groupes", `Compteurs pour ${typeChoisiFinal}: ${JSON.stringify(compteGroupes)} -> Autorisés: ${categoriesFiltrees}`);

    // 4. Boucle de génération finale
    categoriesFiltrees.sort(() => Math.random() - 0.5);

    for (const groupeCandidat of categoriesFiltrees) {
        const lignesDuGroupe = [...groupes[groupeCandidat]].sort(() => Math.random() - 0.5);

        for (const ligne of lignesDuGroupe) {
            try {
                // On passe le typeChoisiFinal dans un tableau pour contraindre le générateur
                const res = genererExpressionDepuisType(ligne, [typeChoisiFinal]);
                
                const nouvelEntreeHistorique = {
                    id: Date.now() + Math.random().toString(36).substr(2, 5),
                    niveau: niveauActif + 'e',
                    typeNombre: res.typeChoisi,
                    groupe: groupeCandidat,
                    gabaritOrigine: ligne,
                    exprFinale: res.exprFinale,
                    resExact: res.resExact.toString(),
                    statut: null
                };
                
                historiqueSession.push(nouvelEntreeHistorique);
                
                const exerciceInstance = new ExerciceEvaluation(res.exprFinale, res.typeChoisi);
                exerciceInstance.historiqueRef = nouvelEntreeHistorique;

                return exerciceInstance;
            } catch (e) {
                logger("Génération rejetée", `${ligne} → ${e.message}`);
            }
        }
    }

    return genererExerciceDeSecours();
}

/**
 * Point d'aiguillage central :
 *   - etatJeu === 'quiz' && !quizDemarre  → rien à afficher avant "Commencer le Quiz".
 *   - etatJeu === 'quiz' && questionCount >= 10 → écran de fin.
 *   - sinon → nouvelle question (atelier : illimité, sans comptage).
 */
function demarrerQuestion() {
    if (etatJeu === 'quiz' && !quizDemarre) return;
    if (etatJeu === 'quiz' && questionCount >= 10) { showScore(); return; }

    const cont = document.getElementById("inputContainer");
    if (cont) cont.innerHTML = "";

    const obj = generateRandomExpression();

    new InputWrapper(obj, cont, true);
    new InputWrapper(obj, cont, false);

    if (etatJeu === 'quiz') {
        questionCount++;
        updateScoreDisplay();
    }
    setupSkipButton();
}

function updateScoreDisplay() {
    const progressElem = document.getElementById("question-progress");
    if (progressElem) progressElem.textContent = `Question ${questionCount}/10`;
    const sElem = document.getElementById("score");
    if (sElem) sElem.textContent = `Score : ${score}`;
}

function setupSkipButton() {
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) {
        skipBtn.style.display = "block";
        skipBtn.onclick = (e) => { e.preventDefault(); demarrerQuestion(); };
    }
}

function createNextBtn(cont) {
    const div = document.createElement('div');
    div.className = 'center-button';
    const b = document.createElement('button');
    b.textContent = "Suivant (Entrée)";
    b.onclick = () => {
        if (etatJeu === 'quiz') { score++; updateScoreDisplay(); }
        demarrerQuestion();
    };
    div.appendChild(b);
    cont.appendChild(div);
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) skipBtn.style.display = "none";
}

function showScore() {
    if (document.getElementById("skipButton")) document.getElementById("skipButton").style.display = "none";
    document.getElementById("inputContainer").innerHTML = `<div style="text-align:center; margin-top:50px;">
        <h2>🎯 Quiz Terminé !</h2>
        <p style="font-size:24px;">Ton score final est de : <strong>${score} / ${questionCount}</strong></p>
        <button class="restart-btn" onclick="location.reload()">Recommencer</button>
    </div>`;
    if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

/** Label rappelant qu'on est en mode Quiz (avant ou pendant). */
function construireLabelQuiz() {
    const label = document.createElement('div');
    label.className = 'panel-groupe-label';
    label.textContent = 'Quiz';
    return label;
}

/** Construit le contenu du panneau latéral selon l'état courant (atelier / quiz avant ou après lancement). */
function renderPanneauLateral() {
    const panneau = document.getElementById("panneauLateral");
    if (!panneau) return;
    panneau.innerHTML = '';

    const ajouterFilet = () => {
        const f = document.createElement('div');
        f.className = 'panel-filet';
        panneau.appendChild(f);
    };

    const verrouille = etatJeu === 'quiz' && quizDemarre;

    const groupeNiveau = document.createElement('div');
    groupeNiveau.className = 'panel-groupe';
    const labelNiveau = document.createElement('div');
    labelNiveau.className = 'panel-groupe-label';
    labelNiveau.textContent = 'Niveau';
    groupeNiveau.appendChild(labelNiveau);
    groupeNiveau.appendChild(construireSelecteurNiveau(verrouille));
    panneau.appendChild(groupeNiveau);
    ajouterFilet();

    const groupeTypeNombres = document.createElement('div');
    groupeTypeNombres.className = 'panel-groupe';
    const labelTypeNombres = document.createElement('div');
    labelTypeNombres.className = 'panel-groupe-label';
    labelTypeNombres.textContent = 'Type de nombres';
    groupeTypeNombres.appendChild(labelTypeNombres);
    groupeTypeNombres.appendChild(construireSelecteurTypeNombres(verrouille));
    panneau.appendChild(groupeTypeNombres);
    ajouterFilet();

    const groupeEcriture = document.createElement('div');
    groupeEcriture.className = 'panel-groupe';
    const labelEcriture = document.createElement('div');
    labelEcriture.className = 'panel-groupe-label';
    labelEcriture.textContent = 'Écriture simplifiée';
    groupeEcriture.appendChild(labelEcriture);
    groupeEcriture.appendChild(construireSelecteurEcritureSimplifiee(verrouille));
    panneau.appendChild(groupeEcriture);
    ajouterFilet();

    if (etatJeu === 'atelier') {
        const skipBtn = document.createElement('button');
        skipBtn.id = 'skipButton';
        skipBtn.className = 'panel-btn';
        skipBtn.textContent = 'Renoncer';
        panneau.appendChild(skipBtn);
        setupSkipButton();

    } else if (etatJeu === 'quiz' && !quizDemarre) {
        panneau.appendChild(construireLabelQuiz());

        const btnCommencer = document.createElement('button');
        btnCommencer.type = 'button';
        btnCommencer.className = 'panel-btn active';
        btnCommencer.textContent = 'Commencer le Quiz';
        btnCommencer.onclick = () => {
            quizDemarre = true;
            questionCount = 0;
            score = 0;
            renderPanneauLateral();
            demarrerQuestion();
        };
        panneau.appendChild(btnCommencer);

    } else { // quiz && quizDemarre
        panneau.appendChild(construireLabelQuiz());

        const scoreContainer = document.createElement('div');
        scoreContainer.id = 'score-container';

        const progressDiv = document.createElement('div');
        progressDiv.id = 'question-progress';
        progressDiv.textContent = `Question ${questionCount}/10`;

        const scoreDiv = document.createElement('div');
        scoreDiv.id = 'score';
        scoreDiv.textContent = `Score : ${score}`;

        const skipBtn = document.createElement('button');
        skipBtn.id = 'skipButton';
        skipBtn.className = 'panel-btn';
        skipBtn.textContent = 'Renoncer';

        scoreContainer.append(progressDiv, scoreDiv, skipBtn);
        panneau.appendChild(scoreContainer);
        setupSkipButton();
    }
}

/** Installe le bouton de bascule Atelier/Quiz dans le header. */
function setupEtatToggle() {
    const conteneur = document.getElementById("topButtonsBar");
    if (!conteneur) return;

    const btnAtelier = document.createElement('button');
    btnAtelier.type = 'button';
    btnAtelier.id = 'btnAtelier';
    btnAtelier.textContent = 'Atelier';

    const btnQuiz = document.createElement('button');
    btnQuiz.type = 'button';
    btnQuiz.id = 'btnQuiz';
    btnQuiz.textContent = 'Quiz';

    const majClasses = () => {
        btnAtelier.className = 'btn-header' + (etatJeu === 'atelier' ? ' active' : '');
        btnQuiz.className = 'btn-header' + (etatJeu === 'quiz' ? ' active' : '');
    };
    majClasses();

    const basculer = (nouvelEtat) => {
        if (etatJeu === nouvelEtat) return; // déjà dans cet état, rien à faire
        etatJeu = nouvelEtat;
        quizDemarre = false;
        questionCount = 0;
        score = 0;
        document.getElementById("inputContainer").innerHTML = '';
        majClasses();
        renderPanneauLateral();
        demarrerQuestion();
    };

    btnAtelier.onclick = () => basculer('atelier');
    btnQuiz.onclick = () => basculer('quiz');

    const filet = document.createElement('div');
    filet.className = 'filet-header';

    conteneur.append(btnAtelier, btnQuiz, filet);
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (e.target.tagName === "INPUT") return;
        const nextBtn = document.querySelector(".center-button button");
        if (nextBtn) { e.preventDefault(); nextBtn.click(); }
    }
});

window.onload = () => {
    setupEtatToggle();
    renderPanneauLateral();
    setupBoutonNouvelOnglet();
    if (typeof FichePapier !== 'undefined') {
        const fiche = new FichePapier();
        fiche.installerBouton(document.getElementById("topButtonsBar"));
    }
    if (typeof GuideAppli !== 'undefined') {
        const guide = new GuideAppli();
        guide.installerBouton(document.getElementById("topButtonsBar"));
    }
    demarrerQuestion();
};
