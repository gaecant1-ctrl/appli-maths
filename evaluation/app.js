let questionCount = 0;
let score = 0;
let piocheEnCours = [];
let etatJeu = 'atelier';   // 'atelier' | 'quiz' — atelier : rien n'est compté, questions illimitées.
let quizDemarre = false;   // true une fois qu'on a cliqué "Commencer le Quiz"

// ============================================================
// GABARITS (5e / 4e / 3e) — cumulatifs : chaque niveau reprend la banque du
// niveau précédent (révision) et y ajoute les nouveaux types de la classe.
//
// Un gabarit est une expression écrite avec des LETTRES GÉNÉRIQUES (a, b, c...),
// toujours reliées par "+" (jamais de "-" explicite : le signe vient de la
// valeur du coefficient, et calcul-mv.js sait déjà afficher "x - 2y" au lieu
// de "x + -2y"). Les parenthèses du gabarit sont GARDÉES à l'affichage quand
// reduire=false (l'élève doit alors respecter la priorité opératoire) ; sinon
// (reduire=true) l'expression est présentée sous sa forme réduite canonique.
//
// À la génération, chaque lettre du gabarit est attribuée à un rôle :
//   - un sous-ensemble (au moins une, jamais toutes) devient la variable X
//   - un autre sous-ensemble (si "2 lettres") devient la variable Y
//   - les lettres restantes deviennent des nombres (coefficients)
// Plusieurs lettres différentes peuvent devenir la MÊME variable (ex: a et b
// deviennent toutes les deux x dans "ab+c" → "x²+c") : les puissances
// n'ont donc pas besoin d'être écrites explicitement dans le gabarit.
//
// Trois catégories de lettres, pour donner un contrôle plus fin sur la forme
// d'un gabarit :
//   - e, f  : toujours des VARIABLES (jamais des nombres) — utile pour
//     garantir qu'une parenthèse contient bien une vraie variable, plutôt
//     que de risquer une parenthèse purement numérique (ex: dans
//     "a(b+c)+d(e+f)", e et f garantissent que la seconde parenthèse ne
//     sera jamais réduite à un simple nombre).
//   - g, h  : toujours des NOMBRES (jamais des variables).
//   - a, b, c, d : quelconques, comme avant (rôle tiré aléatoirement).
// ============================================================

const LETTRES_POSSIBLES = ['x', 'y', 'z', 'a', 'b', 'n'];
const LETTRES_VARIABLES_FORCEES = ['e', 'f'];
const LETTRES_NOMBRES_FORCES = ['g', 'h'];

const GABARITS_5E = [
    { motif: 'ge+hf' },  // ex: x+5
    { motif: 'ee+hef+f' }, // ex: 3x+5, x²+5
    { motif: '-he+gf' },
    { motif: 'a(ge+hf)' }, 
    { motif: 'a(e+c)+f' }
];
const GABARITS_4E_AJOUTS = [
    { motif: 'gee+hef+f' }, 
    { motif: 'a(b+c)+d(ge+f)' },  
    { motif: '(ge+f)(he+f)' }, 
    
];
const GABARITS_3E_AJOUTS = [
    { motif: '-ee+ef+f' }, 
    { motif: 'a(ge+f)+b(he+f)' }, 
    { motif: '(ge+f)^2' },
    { motif: '(ge-f)^2' },
    { motif: 'ggee - hhff' }    
];

const NIVEAUX = {
    "5": GABARITS_5E,
    "4": GABARITS_5E.concat(GABARITS_4E_AJOUTS),
    "3": GABARITS_5E.concat(GABARITS_4E_AJOUTS, GABARITS_3E_AJOUTS),
};

// On remplace le niveau unique par un Set de multi-sélection
const niveauxActifs = new Set(["5"]); 
let BANQUE_DE_TYPES = [...GABARITS_5E];

const nbLettresActifs = new Set([1]); // au moins un toujours actif ; les deux possibles à la fois

// ==================== TYPE DE NOMBRES (entier / décimal / fraction) ====================
// Réglage indépendant du niveau et du nombre de lettres : porte sur le TYPE des
// valeurs substituées aux lettres (x = ..., y = ...), pas sur les coefficients
// du gabarit (qui restent toujours entiers). Multi-sélection comme les autres
// réglages : si plusieurs types sont actifs, un seul est tiré au hasard par
// exercice (tous les lettres de CET exercice partagent alors le même type).
const TYPES_NOMBRES_POSSIBLES = ["entier", "decimal", "fraction"];
const typesNombresActifs = new Set(["entier"]);

/** Tire le type de nombre pour UNE question, parmi les options actives. */
function choisirTypeNombrePourExercice() {
    const options = [...typesNombresActifs];
    return options[Math.floor(Math.random() * options.length)];
}

/** Tire le nombre de lettres pour UNE question, parmi les options actives. */
function choisirNbLettresPourExercice() {
    const options = [...nbLettresActifs];
    return options[Math.floor(Math.random() * options.length)];
}

const DEBUG = false; // Passe à true pour tracer la génération dans la console

function logger(action, data = "") {
    if (!DEBUG) return;
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    console.log(`%c[${timestamp}] %c${action.toUpperCase()}`, "color: gray", "color: #E67E22; font-weight: bold", data);
}

// ============================================================
// RÉGLAGES DE FOURCHETTE — à éditer ici directement, aucun réglage
// utilisateur dans l'UI pour ceci.
//   - Les 3 premières constantes pilotent tirerValeur*() : les VALEURS
//     substituées aux lettres (x = ..., y = ...), selon le type actif
//     (Entiers / Décimaux / Fractions) dans le panneau latéral.
//   - Les 3 suivantes pilotent tirerCoefficient() : les COEFFICIENTS DU
//     GABARIT lui-même (ex: le "5" dans "5x+3"), toujours entiers, quel
//     que soit le type de nombres sélectionné pour les valeurs substituées.
// ============================================================
const ENTIER_BORNE_MAX = 6;       // entiers tirés dans [-ENTIER_BORNE_MAX, ENTIER_BORNE_MAX], 0 exclu
const DECIMAL_DIXIEME_MAX = 9;    // dixièmes tirés dans [1, DECIMAL_DIXIEME_MAX] → 0.1 à 0.9 par défaut
const FRACTIONS_SIMPLES = ["1/2", "-1/2", "1/3", "-1/3", "2/3", "-2/3"]; // fractions autorisées (éditer la liste pour en changer)
const FRACTIONS_SIMPLES_POSITIVES = FRACTIONS_SIMPLES.filter(f => !f.startsWith('-'));

const COEFFICIENT_PROBA_REMARQUABLE = 0.5; // probabilité de tirer un remarquable plutôt qu'un coefficient quelconque
// Coefficients plus petits quand les valeurs substituées sont décimales/fractionnaires :
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
 * rendue en texte "a/b" : c'est le moteur (calcul-mv.js, via _QuotientMV) qui
 * la réduit et l'affiche en \frac{}{}, exactement comme une division tapée
 * par l'élève.
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
 */
function tirerCoefficient(type = 'entier') {
    const fractionnaire = (type === 'decimal' || type === 'fraction');
    const remarquables = fractionnaire ? COEFFICIENT_REMARQUABLES_FRACTIONNAIRE : COEFFICIENT_REMARQUABLES_ENTIER;
    const borneMax = fractionnaire ? COEFFICIENT_BORNE_MAX_FRACTIONNAIRE : COEFFICIENT_BORNE_MAX_ENTIER;

    const interdis = [0, 1, -1];
    let coeff = 0;

    while (interdis.includes(coeff)) {
        if (Math.random() < COEFFICIENT_PROBA_REMARQUABLE) {
            coeff = remarquables[Math.floor(Math.random() * remarquables.length)];
        } else {
            coeff = -borneMax + Math.floor(Math.random() * (2 * borneMax + 1));
        }
    }

    return coeff;
}

/** Lettres génériques distinctes présentes dans un gabarit, dans l'ordre d'apparition. */
function extraireLettres(motif) {
    return [...new Set(motif.match(/[a-z]/g) || [])];
}

/** Sous-ensemble non vide, de taille aléatoire entre 1 et tailleMax, tiré parmi "lettres". */
function choisirSousEnsemble(lettres, tailleMax) {
    const melange = [...lettres].sort(() => Math.random() - 0.5);
    const taille = 1 + Math.floor(Math.random() * Math.min(tailleMax, melange.length));
    return new Set(melange.slice(0, taille));
}

/**
 * Substitue chaque lettre par sa valeur (entre parenthèses, pour gérer les
 * signes négatifs correctement : "3a" avec a=-4 → "3(-4)"), puis confie le
 * texte à evalMV() (calcul-mv.js). Comme il ne reste plus aucune lettre,
 * le PolynomeMV obtenu est nécessairement CONSTANT : c'est le résultat de
 * référence, sous la même forme que celle utilisée pour valider la réponse
 * de l'élève — un simple polynôme constant, comparé via .equal().
 */
function polynomeDeReference(exprText, valeurs) {
    let texte = exprText;
    Object.entries(valeurs).forEach(([lettre, val]) => {
        texte = texte.replace(new RegExp(lettre, 'g'), `(${val})`);
    });
    return evalMV(texte); // PolynomeMV constant, ou null si échec de parsing.
}

// evaluerAvecControle() et evaluerPolynomeAvecControle() vivent maintenant
// dans calcul-mv.js (fonctionnalités génériques du moteur, pas un bricolage
// local à cette appli).

/**
 * Choisit les valeurs des variables. Au niveau 5e uniquement, vérifie qu'aucun
 * produit de deux négatifs n'apparaît DANS LE CALCUL QUE L'ÉLÈVE VOIT :
 *   - gabarit "reduire" (forme réduite affichée) : contrôle sur le polynôme
 *     déjà réduit (evaluerPolynomeAvecControle), pas sur l'arbre brut, dont
 *     certains produits de coefficients sont déjà résolus à la génération.
 *   - gabarit "parenthèse gardée" : contrôle pas à pas sur l'arbre réel
 *     (evaluerAvecControle), puisque c'est exactement l'ordre de calcul que
 *     l'élève doit suivre.
 * Sinon retire de nouvelles valeurs (~30 essais), puis se rabat sur des
 * valeurs toutes positives (filet ultime, toujours sûr : avec des
 * coefficients de magnitude fixe et un seul facteur signé par
 * multiplication, ça ne peut jamais produire un produit de deux négatifs).
 */
function choisirValeursSures({ arbre, poly, reduire }, lettresVariables, exigerSansProduitNegatif, type) {
    for (let tentative = 0; tentative < 30; tentative++) {
        const valeurs = {};
        lettresVariables.forEach(l => { valeurs[l] = tirerValeurSelonType(type); });
        if (!exigerSansProduitNegatif) return valeurs;
        const controle = evaluerAvecControle(arbre, valeurs);
        if (controle.ok) return valeurs;
    }
    const valeurs = {};
    lettresVariables.forEach(l => { valeurs[l] = tirerValeurSelonType(type, true); });
    return valeurs;
}

/** Nombre de lettres (parmi "lettres") réellement présentes dans le polynôme réduit. */
function compterLettresPresentes(poly, lettres) {
    const utilisees = new Set();
    poly.monomes.forEach(m => Object.keys(m.degres).forEach(l => utilisees.add(l)));
    return lettres.filter(l => utilisees.has(l)).length;
}

/**
 * Applique un gabarit : attribue un rôle (variable x, variable y, ou nombre)
 * à chaque lettre générique, puis construit le texte concret. Les nombres
 * sont toujours écrits entre parenthèses : ça évite toute ambiguïté quand
 * deux nombres se retrouvent côte à côte dans un même monôme (ex: "35" serait
 * lu comme le nombre trente-cinq, "-3-5" comme une soustraction — alors que
 * "(3)(5)" et "(-3)(-5)" sont sans ambiguïté, correctement lus comme des
 * produits). Les lettres génériques sont d'abord remplacées par des
 * marqueurs uniques avant d'écrire les valeurs définitives, pour éviter
 * qu'une lettre choisie comme variable n'écrase une substitution déjà faite.
 */
function genererDepuisGabarit(gabarit, nbLettres, type = 'entier') {
    const lettresTemplate = extraireLettres(gabarit.motif);
    
    // On exclut 'e' et 'f' des tableaux génériques car ils ont maintenant un comportement fixe
    const forceesVariables = lettresTemplate.filter(l => 
        LETTRES_VARIABLES_FORCEES.includes(l) && l !== 'e' && l !== 'f'
    );
    const libres = lettresTemplate.filter(l =>
        !LETTRES_VARIABLES_FORCEES.includes(l) && !LETTRES_NOMBRES_FORCES.includes(l) && l !== 'e' && l !== 'f'
    );

    const sX = new Set();
    const sY = new Set();

    // RÈGLE FIXE INITIALE POUR 'e' ET 'f'
    if (lettresTemplate.includes('e')) {
        sX.add('e'); // 'e' est TOUJOURS la première lettre (lettreX)
    }
    if (lettresTemplate.includes('f')) {
        if (nbLettres === 2) {
            sY.add('f'); // 'f' est FORCÉMENT la deuxième lettre (lettreY) si 2 lettres
        }
        // Si nbLettres === 1, 'f' n'est ajouté ni à sX ni à sY, il deviendra donc automatiquement un nombre
    }

    // Mélange et répartition du RESTE des variables forcées (s'il y en a d'autres que e et f)
    const forceesMelangees = [...forceesVariables].sort(() => Math.random() - 0.5);
    if (nbLettres === 2 && forceesMelangees.length > 1) {
        const coupure = 1 + Math.floor(Math.random() * (forceesMelangees.length - 1));
        forceesMelangees.slice(0, coupure).forEach(l => sX.add(l));
        forceesMelangees.slice(coupure).forEach(l => sY.add(l));
    } else {
        forceesMelangees.forEach(l => (nbLettres === 2 && Math.random() < 0.5 ? sY : sX).add(l));
    }

    // Répartition des lettres libres (a, b, c, d)
    if (libres.length > 0) {
        const sXLibres = choisirSousEnsemble(libres, Math.max(libres.length - 1, 1));
        sXLibres.forEach(l => sX.add(l));
        const resteApresX = libres.filter(l => !sXLibres.has(l));
        if (nbLettres === 2 && resteApresX.length > 0) {
            choisirSousEnsemble(resteApresX, resteApresX.length).forEach(l => sY.add(l));
        }
    }

    // Attribution des vraies lettres de l'énoncé (ex: x et y, ou a et b...)
    const dispo = [...LETTRES_POSSIBLES].sort(() => Math.random() - 0.5);
    const lettreX = dispo[0];
    const lettreY = nbLettres === 2 ? dispo[1] : null;

    let expr = gabarit.motif;
    lettresTemplate.forEach(l => { expr = expr.split(l).join(`@@${l}@@`); });
    lettresTemplate.forEach(l => {
        let val;
        if (sX.has(l)) val = lettreX;
        else if (sY.has(l)) val = lettreY;
        else val = `(${tirerCoefficient(type)})`;
        expr = expr.split(`@@${l}@@`).join(val);
    });

    const lettresVariables = nbLettres === 2 ? [lettreX, lettreY] : [lettreX];


    return { expr, lettresVariables };
}

// ============================================================
// ExerciceEvaluation — une expression + les valeurs à y substituer.
// ============================================================
class ExerciceEvaluation {
    constructor(expr, valeurs) {
        this.expr = expr;
        this.valeurs = valeurs;
        this.resultatPoly = polynomeDeReference(expr, valeurs);
    }

    /** Nombre (fraction exacte) du résultat, ou null si la génération a échoué. */
    get resultat() {
        if (!this.resultatPoly || this.resultatPoly.monomes.length === 0) return ZERO;
        return this.resultatPoly.monomes[0].coeff;
    }

    /**
     * LaTeX de l'énoncé : forme réduite canonique (reduire=true), ou forme
     * écrite avec parenthèses gardées (reduire=false) — dans ce dernier cas,
     * les sous-parties SANS AUCUNE lettre sont tout de même réduites à un
     * seul nombre via reduireConstantes() (ex: "x(-3+2)" → "x(-1)") : ça
     * n'a jamais de sens de présenter un calcul purement numérique comme
     * une parenthèse à part entière dans l'énoncé de base.
     */
enonceLatex() {
        const os = parseMV(this.expr);
        if (!os.isValid()) return this.expr;
        // On réduit uniquement les constantes et les monômes collés, sans jamais forcer le développement des parenthèses
        return reduireConstantes(os.arbre).toLatex();
    }

    /** "pour x = 3" ou "pour x = 3 et y = -2" (ordre d'apparition des lettres). */
    texteValeurs() {
        const lettres = Object.keys(this.valeurs);
        const morceaux = lettres.map(l => `${l} = ${this.valeurs[l]}`);
        if (morceaux.length === 1) return `pour ${morceaux[0]}`;
        return `pour ${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}`;
    }

    /** "Pour \(x = 3\) :" — label affiché à part, au-dessus des cartouches, en LaTeX.
     *  Passe chaque valeur par Nombre (réduite comme les résultats calculés,
     *  via _pourAffichage) pour un rendu propre (fractions en \frac{}{} déjà simplifiées). */
    texteValeursLabel() {
        const lettres = Object.keys(this.valeurs);
        const morceaux = lettres.map(l => `\\(${l} = ${_pourAffichage(new Nombre(String(this.valeurs[l]))).toLatex()}\\)`);
        const corps = morceaux.length === 1
            ? morceaux[0]
            : `${morceaux.slice(0, -1).join(', ')} et ${morceaux[morceaux.length - 1]}`;
        return `Pour ${corps} :`;
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

    /** Énoncé : uniquement l'expression en LaTeX (le "Pour x = ..." est un label à part, hors cartouche). */
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
     * calcul-mv.js comme le reste de l'appli, puis comparée au polynôme
     * constant de référence via .equal() — une égalité "sur atome", jamais
     * une comparaison de texte. Tant que la saisie n'est pas réduite à un
     * atome unique (ex: "1+2*3", correct mais pas encore calculé jusqu'au
     * bout), on l'accepte comme juste mais on redemande de calculer.
     */
validate() {
        const texte = this.input.value.trim().replace(/\s+/g, '');

        // 🛑 SÉCURITÉ STRANGELET : On interdit formellement la présence de lettres (a-z ou A-Z)
        // dans la réponse de l'élève. Le calcul doit être purement numérique.
        if (/[a-zA-Z]/.test(texte)) {
            this.freeze(texte);
            return this.updateUI('neutral', "Invalide (pas de lettres)");
        }

        const os = parseMV(texte);
        const polySaisi = os.isValid() ? os.arbre.evaluer() : null;

        this.freeze(texte);

        if (!polySaisi) return this.updateUI('neutral', "Invalide");
        if (!this.exercice.resultatPoly || !polySaisi.equal(this.exercice.resultatPoly)) {
            return this.updateUI('error', "Pas égal");
        }

        // Une fraction simple "a/b" (numérateur et dénominateur bruts, sans
        // aucun autre calcul) compte comme une forme finale au même titre
        // qu'un atome seul — sinon aucune réponse fractionnaire ne pourrait
        // jamais aboutir à "Bravo" (a/b est structurellement un _QuotientMV,
        // jamais un _AtomeMV, même une fois complètement réduit).
        const estFractionSimple = os.arbre instanceof _QuotientMV &&
            os.arbre.termes[0] instanceof _AtomeMV &&
            os.arbre.termes[1] instanceof _AtomeMV;

        if (!(os.arbre instanceof _AtomeMV) && !estFractionSimple) {
            return this.updateUI('success', "À calculer");
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

// ==================== SÉLECTEUR DE NIVEAU (5e / 4e / 3e) ====================
// Ajouter un niveau plus tard revient à ajouter une entrée dans NIVEAUX :
// aucune autre logique à toucher.

/** Construit le sélecteur de niveau (sélection unique) pour le panneau latéral. */
/** Construit le sélecteur de niveau (sélection unique) pour le panneau latéral. */
/** Construit le sélecteur de niveau (multi-sélection / toggles) pour le panneau latéral. */
function construireSelecteurNiveau(disabled = false) {
    const wrap = document.createElement('div');
    wrap.id = 'selecteurNiveau';
    wrap.className = 'panel-type-list';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Choix des niveaux');

    const ordreScolaire = ["5", "4", "3"];

    ordreScolaire.forEach(code => {
        if (!NIVEAUX[code]) return;

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn' + (niveauxActifs.has(code) ? ' active' : '');
        btn.textContent = `${code}e`;
        btn.disabled = disabled;
        
        btn.addEventListener('click', () => {
            if (niveauxActifs.has(code)) {
                // RÈGLE : On garde au moins un niveau actif
                if (niveauxActifs.size > 1) {
                    niveauxActifs.delete(code);
                    btn.classList.remove('active');
                    mettreAJourBanque();
                }
            } else {
                niveauxActifs.add(code);
                btn.classList.add('active');
                mettreAJourBanque();
            }
        });
        
        wrap.appendChild(btn);
    });

    return wrap;
}

function mettreAJourBanque() {
    let nouvelleBanque = [];
    
    // On accumule uniquement les gabarits des niveaux sélectionnés
    niveauxActifs.forEach(code => {
        if (code === "5") {
            nouvelleBanque = nouvelleBanque.concat(GABARITS_5E);
        } else if (code === "4") {
            nouvelleBanque = nouvelleBanque.concat(GABARITS_4E_AJOUTS);
        } else if (code === "3") {
            nouvelleBanque = nouvelleBanque.concat(GABARITS_3E_AJOUTS);
        }
    });

    BANQUE_DE_TYPES = nouvelleBanque;
    piocheEnCours = []; // On vide la pioche actuelle pour re-mélanger tout de suite
}

function choisirNiveau(code) {
    if (!NIVEAUX[code] || code === niveauActuel) return;
    niveauActuel = code;
    BANQUE_DE_TYPES = NIVEAUX[niveauActuel];
    piocheEnCours = []; // pioche fraîche, cohérente avec la nouvelle banque

    renderPanneauLateral();
    document.getElementById("inputContainer").innerHTML = '';
    demarrerQuestion();
}

/**
 * Construit le sélecteur "1 lettre" / "2 lettres" (réglage indépendant du
 * niveau), en multi-sélection comme le type de factorisation : les deux
 * peuvent être actifs à la fois, auquel cas le nombre de lettres est tiré
 * au hasard pour chaque question (voir choisirNbLettresPourExercice()).
 */
function construireSelecteurNbLettres(disabled = false) {
    const wrap = document.createElement('div');
    wrap.className = 'panel-groupe-paire';

    [1, 2].forEach(n => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn panel-btn-half' + (nbLettresActifs.has(n) ? ' active' : '');
        btn.textContent = n === 1 ? '1 lettre' : '2 lettres';
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (nbLettresActifs.has(n)) {
                if (nbLettresActifs.size > 1) { // garder au moins un actif
                    nbLettresActifs.delete(n);
                    btn.classList.remove('active');
                }
            } else {
                nbLettresActifs.add(n);
                btn.classList.add('active');
            }
            piocheEnCours = [];
        });
        wrap.appendChild(btn);
    });

    return wrap;
}

/**
 * Construit le sélecteur "Entiers" / "Décimaux" / "Fractions" (réglage
 * indépendant du niveau et du nombre de lettres), en multi-sélection comme
 * les autres réglages : plusieurs types actifs à la fois → le type est tiré
 * au hasard pour chaque question (voir choisirTypeNombrePourExercice()).
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
            piocheEnCours = [];
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
    if (choisirNbLettresPourExercice() === 2) {
        const [l1, l2] = LETTRES_POSSIBLES;
        return new ExerciceEvaluation(`${l1}+${l2}`, { [l1]: 3, [l2]: 2 });
    }
    const [l1] = LETTRES_POSSIBLES;
    return new ExerciceEvaluation(`${l1}+2`, { [l1]: 3 });
}

/** Essaie de générer un exercice valide à partir d'un gabarit ; renvoie null si ça ne convient pas. */
function tenterGeneration(gabarit) {
    const nbLettres = choisirNbLettresPourExercice();
    const type = choisirTypeNombrePourExercice();
    const { expr, lettresVariables } = genererDepuisGabarit(gabarit, nbLettres, type);

    const poly = evalMV(expr);
    if (!poly) { 
        logger("Génération rejetée (parsing)", expr); 
        return null; 
    }

    if (compterLettresPresentes(poly, lettresVariables) !== lettresVariables.length) {
        logger("Génération rejetée (variable disparue)", expr);
        return null;
    }

    const arbre = parseMV(expr).arbre;
    // La sécurité ne se déclenche QUE si le niveau 5e est sélectionné TOUT SEUL
const exigerSansProduitNegatif = (niveauxActifs.size === 1 && niveauxActifs.has("5"));
    
    // Le premier argument ne contient plus la propriété "reduire" devenue obsolète
    const valeurs = choisirValeursSures({ arbre, poly }, lettresVariables, exigerSansProduitNegatif, type);

    // Instanciation simplifiée de ExerciceEvaluation (sans le paramètre reduire)
    const exercice = new ExerciceEvaluation(expr, valeurs);
    
    if (!exercice.resultatPoly) return null;
    return exercice;
}

/** Génère un exercice valide (retire en pratique quasi jamais, filet de sécurité). */
function generateRandomExpression() {
    for (let tentative = 0; tentative < 20; tentative++) {
        if (piocheEnCours.length === 0) { piocheEnCours = [...BANQUE_DE_TYPES].sort(() => Math.random() - 0.5); }
        const gabarit = piocheEnCours[0];
        const exercice = tenterGeneration(gabarit);
        if (exercice) {
            piocheEnCours.shift();
            logger("Génération propre", `${exercice.expr} ${exercice.texteValeurs()} = ${exercice.resultat}`);
            return exercice;
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

    const label = document.createElement('div');
    label.className = 'valeurs-label';
    label.innerHTML = obj.texteValeursLabel();
    cont.appendChild(label);
    if (window.MathJax) MathJax.typesetPromise([label]);

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

    const groupeLettres = document.createElement('div');
    groupeLettres.className = 'panel-groupe';
    const labelLettres = document.createElement('div');
    labelLettres.className = 'panel-groupe-label';
    labelLettres.textContent = 'Nombre de lettres';
    groupeLettres.appendChild(labelLettres);
    groupeLettres.appendChild(construireSelecteurNbLettres(verrouille));
    panneau.appendChild(groupeLettres);
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

    if (etatJeu === 'atelier') {
        const groupeAtelier = document.createElement('div');
        groupeAtelier.className = 'panel-groupe';
        const labelAtelier = document.createElement('div');
        labelAtelier.className = 'panel-groupe-label';
        labelAtelier.textContent = 'Question en cours :';
        groupeAtelier.appendChild(labelAtelier);
        panneau.appendChild(groupeAtelier);

        const skipBtn = document.createElement('button');
        skipBtn.id = 'skipButton';
        skipBtn.className = 'panel-btn';
        skipBtn.textContent = 'Renoncer';
        groupeAtelier.appendChild(skipBtn);
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
