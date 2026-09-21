let questionCount = 0;
let score = 0;
let piocheEnCours = [];
let etatJeu = 'atelier';   // 'atelier' | 'quiz' — atelier : rien n'est compté, questions illimitées.
let quizDemarre = false;   // true une fois qu'on a cliqué "Commencer le Quiz"

// ============================================================
// NIVEAUX (5e / 4e / 3e) — cumulatifs : chaque niveau reprend la banque du
// niveau précédent (révision) et y ajoute les nouveaux types de la classe.
// ============================================================

const BANQUE_5E = [
    { id: "Simple",  pattern: 'ux?w?vx?t', constants: ['u', 'v', 'w', 't'], forced: [] },
    { id: "Distrib", pattern: 'u(vx?w)', constants: ['u', 'v', 'w'], forced: ['u'] },
    { id: "Moins",   pattern: 'ux-(vx?w)', constants: ['u', 'v', 'w'], forced: [] },
    { id: "Prio",    pattern: 'w+u(vx?s)', constants: ['u', 'v', 'w', 's'], forced: ['u'] },
    { id: "Double1", pattern: 'u(vx?w)+r(tx?s)', constants: ['u', 'v', 'r', 't', 'w', 's'], forced: ['u', 'r'] },
    { id: "Double2", pattern: 'ux(vx?w)+rx(tx?s)', constants: ['u', 'v', 'r', 't', 'w', 's'], forced: ['u', 'r'] },
    { id: "Mixte",   pattern: 'ux(vx?w)?(tx?s)', constants: ['u', 'v', 't', 'w', 's'], forced: ['u'] }
];

// 4e : double distributivité — produit de deux binômes (ux±v)(wx±t).
// "?" pris séparément pour chaque parenthèse : les 4 combinaisons de signes
// (++, +-, -+, --) apparaissent toutes au fil des tirages.
//
// Double1 (5e) est le seul type à avoir DEUX parenthèses à coefficient
// (u(vx+w)+r(tx+s)) : on reprend exactement cette structure en remplaçant
// l'une, l'autre, ou les deux par une double distributivité — plus le signe
// EXTÉRIEUR entre les deux termes, fixe en 5e ("+"), devient random ici.
const BANQUE_4E_AJOUTS = [
    { id: "DoubleDistrib",     pattern: '(ux?v)(wx?t)',   constants: ['u', 'v', 'w', 't'], forced: ['u', 'w'] },
    { id: "DoubleDistribPrio", pattern: 's+(ux?v)(wx?t)', constants: ['s', 'u', 'v', 'w', 't'], forced: ['u', 'w'] },

    // Double1 où seule la PREMIÈRE parenthèse devient double, la seconde reste simple.
    { id: "Double1_1erDouble", pattern: '(ux?v)(wx?t)?r(sx?q)', constants: ['u', 'v', 'w', 't', 'r', 's', 'q'], forced: ['u', 'w', 'r'] },
    // Double1 où seule la SECONDE parenthèse devient double, la première reste simple.
    { id: "Double1_2ndDouble", pattern: 'u(vx?w)?(rx?s)(tx?q)', constants: ['u', 'v', 'w', 'r', 's', 't', 'q'], forced: ['u', 'r', 't'] },
    // Double1 où LES DEUX parenthèses deviennent doubles.
    { id: "Double1_2Doubles",  pattern: '(ux?v)(wx?t)?(rx?s)(qx?p)', constants: ['u', 'v', 'w', 't', 'r', 's', 'q', 'p'], forced: ['u', 'w', 'r', 'q'] }
];

// 3e : identités remarquables. Même lettre réutilisée aux deux occurrences
// (ex: "u" et "v" dans les deux facteurs) : la substitution par lettre étant
// globale sur tout le motif, la MÊME valeur y est injectée aux deux endroits
// — exactement ce que l'identité exige. Le signe interne d'une IR fait
// PARTIE de son identité (+v pour un carré de somme, -v pour un carré de
// différence...) : il n'est donc jamais randomisé par "?", contrairement au
// signe EXTÉRIEUR entre deux termes, qui lui reste random comme en 4e.
//
// Même logique que pour 4e : on reprend les structures à parenthèse(s) et on
// remplace la double distributivité par une IR — l'une des deux parenthèses
// seulement, ou les deux (au même type d'IR des deux côtés, pour rester
// lisible plutôt que de multiplier les combinaisons croisées).
const BANQUE_3E_AJOUTS = [
    // IR seules (remplace directement une simple distributivité "u(vx+w)").
    { id: "IdentiteCarreSomme", pattern: '(ux+v)^2',     constants: ['u', 'v'], forced: ['u'] },
    { id: "IdentiteCarreDiff",  pattern: '(ux-v)^2',     constants: ['u', 'v'], forced: ['u'] },
    { id: "IdentiteConjugue",   pattern: '(ux+v)(ux-v)', constants: ['u', 'v'], forced: ['u'] },

    // IR à la place de la double dans "Prio" (w+u(vx+s) -> s+IR).
    { id: "PrioCarreSomme", pattern: 's+(ux+v)^2',     constants: ['s', 'u', 'v'], forced: ['u'] },
    { id: "PrioCarreDiff",  pattern: 's+(ux-v)^2',     constants: ['s', 'u', 'v'], forced: ['u'] },
    { id: "PrioConjugue",   pattern: 's+(ux+v)(ux-v)', constants: ['s', 'u', 'v'], forced: ['u'] },

    // Double1 : IR en PREMIÈRE position, parenthèse simple en seconde.
    { id: "Double1_CarreSommePuisSimple", pattern: '(ux+v)^2?r(sx?q)',     constants: ['u', 'v', 'r', 's', 'q'], forced: ['u', 'r'] },
    { id: "Double1_CarreDiffPuisSimple",  pattern: '(ux-v)^2?r(sx?q)',     constants: ['u', 'v', 'r', 's', 'q'], forced: ['u', 'r'] },
    { id: "Double1_ConjuguePuisSimple",   pattern: '(ux+v)(ux-v)?r(sx?q)', constants: ['u', 'v', 'r', 's', 'q'], forced: ['u', 'r'] },

    // Double1 : parenthèse simple en première position, IR en seconde.
    { id: "Double1_SimplePuisCarreSomme", pattern: 'u(vx?w)?(rx+s)^2',     constants: ['u', 'v', 'w', 'r', 's'], forced: ['u', 'r'] },
    { id: "Double1_SimplePuisCarreDiff",  pattern: 'u(vx?w)?(rx-s)^2',     constants: ['u', 'v', 'w', 'r', 's'], forced: ['u', 'r'] },
    { id: "Double1_SimplePuisConjugue",   pattern: 'u(vx?w)?(rx+s)(rx-s)', constants: ['u', 'v', 'w', 'r', 's'], forced: ['u', 'r'] },

    // Double1 : IR (même type) des DEUX côtés.
    { id: "Double1_DeuxCarresSomme", pattern: '(ux+v)^2?(rx+s)^2',     constants: ['u', 'v', 'r', 's'], forced: ['u', 'r'] },
    { id: "Double1_DeuxCarresDiff",  pattern: '(ux-v)^2?(rx-s)^2',     constants: ['u', 'v', 'r', 's'], forced: ['u', 'r'] },
    { id: "Double1_DeuxConjugues",   pattern: '(ux+v)(ux-v)?(rx+s)(rx-s)', constants: ['u', 'v', 'r', 's'], forced: ['u', 'r'] }
];

const NIVEAUX_DISPONIBLES = {
    "5": BANQUE_5E,
    "4": BANQUE_5E.concat(BANQUE_4E_AJOUTS),
    "3": BANQUE_5E.concat(BANQUE_4E_AJOUTS, BANQUE_3E_AJOUTS)
};

// ============================================================
// SÉLECTION PAR FORME — alternative au choix par niveau.
// Deux critères croisés (sélection multiple, au moins un bouton actif par groupe) :
//   - distributivité : simple (k(ax+b)), double ((ax+b)(cx+d)) ou identités
//     remarquables (chaque produit double devient (ax±b)² ou (ax+b)(ax−b)) ;
//   - forme de l'expression : produit seul, somme/différence produit ± terme
//     simple, somme/différence de deux produits.
// Pour les formes à deux produits, "double" = au moins un des deux produits
// est une double distributivité.
// Le "terme simple" est tantôt une constante, tantôt un monôme (ex: 5x).
// Le signe EXTÉRIEUR (+ / -) est fixé par la forme ; les signes internes aux
// parenthèses restent aléatoires ("?").
// ============================================================

/** Raccourci : les constantes sont déduites du motif (toutes les lettres sauf x). */
function typeForme(distrib, forme, pattern, forced) {
    const constants = [...new Set(pattern.match(/[a-wyz]/g) || [])];
    return { id: `${forme}_${distrib}_${pattern}`, distrib, forme, pattern, constants, forced };
}

const DISTRIBS_DISPONIBLES = [
    { code: 'simple', label: 'Simple' },
    { code: 'double', label: 'Double' },
    { code: 'ir',     label: 'Identités remarquables' }
];

const FORMES_DISPONIBLES = [
    { code: 'produit',        label: 'Produit' },
    { code: 'sommeSimple',    label: 'Produit + terme simple' },
    { code: 'sommeProduits',  label: 'Somme de deux produits' },
    { code: 'diffSimple',     label: 'Produit − terme simple' },
    { code: 'diffProduits',   label: 'Différence de deux produits' }
];

const BANQUE_FORMES = [
    // --- Produit ---
    typeForme('simple', 'produit', 'u(vx?w)',      ['u']),
    typeForme('simple', 'produit', 'ux(vx?w)',     ['u']),
    typeForme('double', 'produit', '(ux?v)(wx?t)', ['u', 'w']),

    // --- Somme d'un produit et d'un terme simple ---
    typeForme('simple', 'sommeSimple', 'w+u(vx?s)',        ['u']),
    typeForme('simple', 'sommeSimple', 'u(vx?w)+s',        ['u']),
    typeForme('simple', 'sommeSimple', 'wx+u(vx?s)',       ['u']),
    typeForme('simple', 'sommeSimple', 'ux(vx?w)+s',       ['u']),
    typeForme('double', 'sommeSimple', 's+(ux?v)(wx?t)',   ['u', 'w']),
    typeForme('double', 'sommeSimple', '(ux?v)(wx?t)+s',   ['u', 'w']),
    typeForme('double', 'sommeSimple', 'sx+(ux?v)(wx?t)',  ['u', 'w']),
    typeForme('double', 'sommeSimple', '(ux?v)(wx?t)+sx',  ['u', 'w']),

    // --- Somme de deux produits ---
    typeForme('simple', 'sommeProduits', 'u(vx?w)+r(tx?s)',            ['u', 'r']),
    typeForme('simple', 'sommeProduits', 'ux(vx?w)+rx(tx?s)',          ['u', 'r']),
    typeForme('simple', 'sommeProduits', 'u(vx?w)+rx(tx?s)',           ['u', 'r']),
    typeForme('double', 'sommeProduits', '(ux?v)(wx?t)+r(sx?q)',       ['u', 'w', 'r']),
    typeForme('double', 'sommeProduits', 'u(vx?w)+(rx?s)(tx?q)',       ['u', 'r', 't']),
    typeForme('double', 'sommeProduits', '(ux?v)(wx?t)+(rx?s)(qx?p)',  ['u', 'w', 'r', 'q']),

    // --- Différence entre un produit et un terme simple (dans les deux sens) ---
    typeForme('simple', 'diffSimple', 'w-u(vx?s)',        ['u']),
    typeForme('simple', 'diffSimple', 'u(vx?w)-s',        ['u']),
    typeForme('simple', 'diffSimple', 'wx-u(vx?s)',       ['u']),
    typeForme('simple', 'diffSimple', 'ux-(vx?w)',        []),
    typeForme('double', 'diffSimple', 's-(ux?v)(wx?t)',   ['u', 'w']),
    typeForme('double', 'diffSimple', '(ux?v)(wx?t)-s',   ['u', 'w']),
    typeForme('double', 'diffSimple', 'sx-(ux?v)(wx?t)',  ['u', 'w']),
    typeForme('double', 'diffSimple', '(ux?v)(wx?t)-sx',  ['u', 'w']),

    // --- Différence de deux produits ---
    typeForme('simple', 'diffProduits', 'u(vx?w)-r(tx?s)',            ['u', 'r']),
    typeForme('simple', 'diffProduits', 'ux(vx?w)-rx(tx?s)',          ['u', 'r']),
    typeForme('simple', 'diffProduits', 'u(vx?w)-rx(tx?s)',           ['u', 'r']),
    typeForme('double', 'diffProduits', '(ux?v)(wx?t)-r(sx?q)',       ['u', 'w', 'r']),
    typeForme('double', 'diffProduits', 'u(vx?w)-(rx?s)(tx?q)',       ['u', 'r', 't']),
    typeForme('double', 'diffProduits', '(ux?v)(wx?t)-(rx?s)(qx?p)',  ['u', 'w', 'r', 'q'])
];

// "Identités remarquables" : mêmes structures que la double distributivité,
// mais CHAQUE produit (ax±b)(cx±d) y devient une IR au moment du tirage
// (voir transformerEnIdentites).
BANQUE_FORMES.push(...BANQUE_FORMES
    .filter(t => t.distrib === 'double')
    .map(t => ({ ...t, id: t.id.replace('_double_', '_ir_'), distrib: 'ir' })));

let modeSelection = 'niveau';   // 'niveau' | 'forme'
let niveauActuel = "5";
const distribsActives = new Set(['simple']);
const formesActives = new Set(FORMES_DISPONIBLES.map(f => f.code));

function calculerBanque() {
    if (modeSelection === 'niveau') return NIVEAUX_DISPONIBLES[niveauActuel];
    return BANQUE_FORMES.filter(t => distribsActives.has(t.distrib) && formesActives.has(t.forme));
}

let BANQUE_DE_TYPES = calculerBanque();

const LETTRES_POSSIBLES = ['x', 'y', 'z', 'a', 'b'];

/**
 * Rendu LaTeX "Miroir" : ce que l'élève tape est ce qu'il voit.
 * On remplace seulement l'astérisque par le symbole de multiplication.
 */

const DEBUG = false; // Passe à false en production

function logger(action, data = "") {
    if (!DEBUG) return;
    const timestamp = new Date().toLocaleTimeString('fr-FR', { hour12: false });
    console.log(`%c[${timestamp}] %c${action.toUpperCase()}`, "color: gray", "color: #4A90E2; font-weight: bold", data);
}

function formatToLatex(exprText) {
    if (!exprText) return "";
    let rendered = exprText
        .replace(/\*/g, ' \\times ')
        .replace(/\s+/g, ' ');
    return rendered;
}

// ============================================================
// ExpressionLitterale — remplace l'ancienne classe Expression (math.js)
// ============================================================
// Le moteur exact (calcul-litteral.js : Nombre/Polynome/Atome/Expression/
// Somme/Difference/Produit/Quotient/Puissance/ObjetString) ne connaît que
// la variable "x". Ici, chaque exercice utilise une lettre choisie
// aléatoirement (x, y, z, a, b) : on la substitue par "x" avant de confier
// le texte au moteur, uniquement pour le calcul interne — l'affichage à
// l'élève garde toujours sa lettre d'origine (formatToLatex sur le texte brut).
//
// Si l'élève utilise une AUTRE lettre que celle de l'énoncé, la substitution
// ne la remplace pas : le moteur la voit comme un symbole inconnu et rejette
// l'expression (Invalide) — comportement plus rigoureux que l'ancienne
// vérification numérique, qui aurait pu (en théorie) accepter une mauvaise
// lettre par coïncidence de valeurs.
// ============================================================

class ExpressionLitterale {
    constructor(expr, lettre) {
        this.expr = expr;
        this.lettre = lettre || (expr.match(/[a-z]/)?.[0] ?? 'x');
        this._objetString = null;
        this._resultat = null; // Atome final si le calcul a réussi (cache)
        this._construire();
    }

    /** Remplace UNIQUEMENT la lettre-variable de cet exercice par "x" (seule lettre connue du moteur). */
    _versFormeX(texte) {
        if (this.lettre === 'x') return texte;
        return texte.replace(new RegExp(this.lettre, 'g'), 'x');
    }

    _construire() {
        if (!this._lettresCoherentes(this.expr)) { this._objetString = null; return; }
        try {
            this._objetString = new ObjetString(this._versFormeX(this.expr), {});
        } catch (e) {
            this._objetString = null;
        }
    }

    /**
     * Vérifie qu'aucune lettre AUTRE que celle de l'exercice n'apparaît dans le texte.
     * Sans ce garde-fou, un élève qui écrit "x" par réflexe alors que l'exercice
     * porte sur "y" passerait quand même : "x" est justement le symbole interne
     * du moteur, donc _versFormeX ne le toucherait pas et il serait accepté à tort.
     */
    _lettresCoherentes(texte) {
        const lettres = texte.match(/[a-zA-Z]/g) || [];
        return lettres.every(l => l.toLowerCase() === this.lettre);
    }

    /** Valide si le texte se parse ET se calcule exactement, sans erreur (degré trop grand, ÷ par x, etc.). */
    isValid() {
        if (!this._objetString || !this._objetString.isValid()) return false;
        if (this._resultat) return true;
        try {
            this._resultat = this._objetString.calculer().resultat;
            return true;
        } catch {
            return false;
        }
    }

    /** Égalité EXACTE (comparaison de polynômes à coefficients rationnels), jamais d'approximation numérique. */
    checkEqual(other) {
        if (!this.isValid() || !other.isValid()) return false;
        return this._resultat.equals(other._resultat);
    }

    /**
     * Analyse la forme de l'expression TELLE QU'ÉCRITE (avant tout calcul) :
     * - developpe : aucune parenthèse restante ;
     * - reduit    : en plus, chaque terme additif est un monôme unique déjà
     *   fusionné (pas de produit non calculé type "2*3x"), sans coefficient
     *   "1" explicite, et deux termes de même degré ne coexistent pas
     *   (ex: "6x+15+12x-8" a deux termes de degré 1 -> non réduit).
     */
    analyserForme() {
        if (!this.isValid()) return { developpe: false, reduit: false };
        if (this.expr.includes('(')) return { developpe: false, reduit: false };

        const termes = ExpressionLitterale._extraireTermes(this._objetString.arbre);
        const degresVus = new Set();

        for (const terme of termes) {
            if (!(terme instanceof Atome)) return { developpe: true, reduit: false };
            if (/^[+-]?1[a-zA-Z]/.test(terme.texte)) return { developpe: true, reduit: false };
            if (/\^1$/.test(terme.texte)) return { developpe: true, reduit: false };

            const degre = terme.polynome.degre();
            if (degresVus.has(degre)) return { developpe: true, reduit: false };
            degresVus.add(degre);
        }
        return { developpe: true, reduit: true };
    }

    /** Éclate récursivement un arbre en ses termes additifs de plus haut niveau (Somme/Difference), sans tenir compte du signe. */
    static _extraireTermes(node) {
        if (node instanceof Somme || node instanceof Difference) {
            return node.termes.flatMap(ExpressionLitterale._extraireTermes);
        }
        return [node];
    }
}

class InputWrapper {
    constructor(expressionObj, container, isQuestion = false) {
        this.status = isQuestion ? 'done' : null;
        this.expressionObj = expressionObj;
        this.container = container;
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'expression capsule-wrapper';
        this.wrapper.style.display = "flex";
        this.wrapper.style.alignItems = "center";
        this.wrapper.style.width = "800px";

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

        this.isQuestion = isQuestion;
        if (isQuestion) {
            this.renderStatic(this.expressionObj.expr);
        } else {
            this.input = document.createElement('input');
            this.input.type = "text";
            this.input.style.width = "250px";
            this.inputPart.appendChild(this.input);
            this.input.focus();
            this.input.addEventListener("keydown", (e) => this.handleInput(e));
        }
    }

    renderStatic(exprText) {
        // L'énoncé suit le réglage d'affichage des carrés ; les saisies de l'élève restent telles quelles.
        const latex = formatToLatex(this.isQuestion ? appliquerAffichageCarre(exprText) : exprText);
        this.inputPart.innerHTML = `<div style="font-size:24px;">\\(${latex}\\)</div>`;
        if (window.MathJax) MathJax.typesetPromise();
    }

    /** Place un texte dans le seul champ encore modifiable du conteneur, curseur en fin. */
    static remplirChampActif(container, texte) {
        const champ = container.querySelector('input');
        if (!champ) return;
        champ.value = texte;
        champ.focus();
        champ.setSelectionRange(texte.length, texte.length);
    }

    handleInput(e) {
        // Flèche haut : raccourci pour recopier la dernière saisie (champ vide uniquement).
        if (e.key === "ArrowUp" && this.input.value === "") {
            const precedents = [...this.container.querySelectorAll('.recopier-btn')];
            if (precedents.length) { e.preventDefault(); precedents[precedents.length - 1].click(); }
            return;
        }
        if (e.key === "Enter") {
            e.stopPropagation();
            if (this.status === null && this.input.value.trim() !== "") {
                this.userAnswer = new ExpressionLitterale(this.input.value, this.expressionObj.lettre);
                this.validate();
            }
        }
    }

    // CENTRALISATION TOTALE DE L'AFFICHAGE
    updateUI(type, msg) {
        const symbols = { 'success': '=', 'error': '≠', 'neutral': '?' };
        this.wrapper.className = `expression capsule-wrapper state-${type}`;
        this.symbolSpan.textContent = symbols[type];
        this.comment.innerHTML = `<span>${msg}</span>`;

        if (msg !== "✅ Bravo !") {
            // Recopie cette saisie dans le champ actif : l'élève corrige son
            // erreur sans tout retaper.
            if (this.input) {
                const btnCopie = document.createElement('button');
                btnCopie.type = 'button';
                btnCopie.className = 'recopier-btn';
                btnCopie.title = 'Recopier cette saisie dans le champ';
                btnCopie.setAttribute('aria-label', btnCopie.title);
                btnCopie.textContent = '↻';
                btnCopie.onclick = () => InputWrapper.remplirChampActif(this.container, this.input.value);
                this.comment.appendChild(btnCopie);
            }

            const btnX = document.createElement('button');
            btnX.className = 'delete-btn';
            btnX.onclick = () => this.wrapper.remove();
            this.comment.appendChild(btnX);

            this.status = 'processed';
            new InputWrapper(this.expressionObj, this.container);
        }
    }

    validate() {
        const isEval = this.userAnswer.isValid();
        const isEqual = isEval && this.expressionObj.checkEqual(this.userAnswer);
        const forme = isEval ? this.userAnswer.analyserForme() : { developpe: false, reduit: false };

        this.freeze();

        if (!isEval) return this.updateUI('neutral', "Invalide");
        if (!isEqual) return this.updateUI('error', "Pas égal");

        // À partir d'ici, c'est forcément égal (exactement, pas approximativement), donc forcément VERT (success)
        if (forme.reduit) {
            this.updateUI('success', "✅ Bravo !");
            this.status = 'done';
            createNextBtn(this.container);
        } else {
            const msg = !forme.developpe ? "Non développé" : "Non réduit";
            this.updateUI('success', msg);
        }
    }

    freeze() {
        if (this.input) {
            this.renderStatic(this.input.value);
        }
    }
}

// ==================== SÉLECTEUR DE NIVEAU (5e / 4e / 3e) ====================
// Ajouter un niveau plus tard revient à ajouter une entrée dans
// NIVEAUX_DISPONIBLES : aucune autre logique à toucher.

/** Construit le sélecteur de niveau (sélection unique) pour le panneau latéral. */
function construireSelecteurNiveau(disabled = false) {
    const wrap = document.createElement('div');
    wrap.id = 'selecteurNiveau';
    wrap.className = 'panel-type-list';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', 'Choix du niveau');

    Object.keys(NIVEAUX_DISPONIBLES).forEach(code => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn' + (code === niveauActuel ? ' active' : '');
        btn.dataset.niveau = code;
        btn.textContent = `${code}e`;
        btn.disabled = disabled;
        btn.addEventListener('click', () => choisirNiveau(code));
        wrap.appendChild(btn);
    });

    return wrap;
}

function choisirNiveau(code) {
    if (!NIVEAUX_DISPONIBLES[code] || code === niveauActuel) return;
    niveauActuel = code;
    appliquerNouvelleBanque();
}

/** Recalcule la banque, vide la pioche et relance une question. */
function appliquerNouvelleBanque() {
    BANQUE_DE_TYPES = calculerBanque();
    piocheEnCours = []; // pioche fraîche, cohérente avec la nouvelle banque

    renderPanneauLateral();
    document.getElementById("inputContainer").innerHTML = '';
    demarrerQuestion();
}

// ==================== SÉLECTEUR PAR FORME ====================

/** Bascule "Par niveau" / "Par forme" (deux demi-boutons côte à côte). */
function construireSelecteurMode(disabled = false) {
    const wrap = document.createElement('div');
    wrap.className = 'panel-groupe-paire';
    [['niveau', 'Par niveau'], ['forme', 'Par forme']].forEach(([code, texte]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn panel-btn-half' + (code === modeSelection ? ' active' : '');
        btn.textContent = texte;
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (code === modeSelection) return;
            modeSelection = code;
            appliquerNouvelleBanque();
        });
        wrap.appendChild(btn);
    });
    return wrap;
}

/** Interrupteur d'écriture des carrés : activé -> (a+b)², désactivé -> (a+b)(a+b). */
function construireSelecteurCarre(disabled = false) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-toggle';
    btn.setAttribute('role', 'switch');
    btn.setAttribute('aria-checked', afficherCarre);
    btn.disabled = disabled;
    btn.innerHTML = `<span class="panel-toggle-piste"><span class="panel-toggle-bouton"></span></span>
        <span class="panel-toggle-texte">${afficherCarre ? '(a+b)²' : '(a+b)(a+b)'}</span>`;
    btn.addEventListener('click', () => {
        // Affichage seulement : l'énoncé en cours reste le même, il est juste réécrit.
        afficherCarre = !afficherCarre;
        renderPanneauLateral();
        if (questionAffichee) questionAffichee.renderStatic(questionAffichee.expressionObj.expr);
    });
    return btn;
}

/**
 * Liste de boutons à sélection multiple : un clic active/désactive l'option,
 * mais le dernier bouton actif ne peut pas être désactivé (banque jamais vide).
 */
function construireListeMultiple(options, actives, ariaLabel, disabled = false) {
    const wrap = document.createElement('div');
    wrap.className = 'panel-type-list';
    wrap.setAttribute('role', 'group');
    wrap.setAttribute('aria-label', ariaLabel);

    options.forEach(({ code, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn' + (actives.has(code) ? ' active' : '');
        btn.setAttribute('aria-pressed', actives.has(code));
        btn.textContent = label;
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (actives.has(code)) {
                if (actives.size === 1) return;
                actives.delete(code);
            } else {
                actives.add(code);
            }
            appliquerNouvelleBanque();
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

// --- Fonctions de gestion du Quiz ---

/** Applique la substitution lettres/signes d'UN type donné (indépendant du tirage aléatoire du type lui-même) — réutilisable pour tester chaque type explicitement. */
// ==================== IDENTITÉS REMARQUABLES (mode "Par forme") ====================
// Pour les types "ir", chaque produit (ax±b)(cx±d) du motif est remplacé par
// une identité remarquable tirée au hasard (carré d'une somme, d'une
// différence, ou produit de conjugués). Les lettres du 1er facteur sont
// réutilisées dans les deux facteurs : la substitution par lettre étant
// globale, la même valeur y est injectée — exactement ce que l'IR exige.
const MOTIF_DOUBLE = /\(([a-wyz])x\?([a-wyz])\)\(([a-wyz])x\?([a-wyz])\)/g;

// Réglage d'AFFICHAGE uniquement : l'énoncé est toujours stocké avec "^2" ;
// seul son rendu (question à l'écran, fiche papier) l'écrit (2x+3)(2x+3).
let afficherCarre = true; // true : (2x+3)^2 ; false : (2x+3)(2x+3)
let questionAffichee = null; // InputWrapper de l'énoncé en cours (pour le ré-afficher)

/** Remplace chaque produit double du motif par une IR (type tiré au hasard pour chacun). */
function transformerEnIdentites(pattern) {
    return pattern.replace(MOTIF_DOUBLE, (tout, a, b) => {
        const ir = [`(${a}x+${b})^2`, `(${a}x-${b})^2`, `(${a}x+${b})(${a}x-${b})`];
        return ir[Math.floor(Math.random() * ir.length)];
    });
}

/** Écrit chaque carré (A)^2 sous la forme (A)(A) si l'affichage "carré" est désactivé. */
function appliquerAffichageCarre(expr) {
    return afficherCarre ? expr : expr.replace(/\(([^()]*)\)\^2/g, '($1)($1)');
}

function genererDepuisType(type) {
    let expr = type.distrib === 'ir' ? transformerEnIdentites(type.pattern) : type.pattern;
    const v = LETTRES_POSSIBLES[Math.floor(Math.random() * LETTRES_POSSIBLES.length)];
    expr = expr.replace(/x/g, v);
    const vals = {};
    type.constants.forEach(c => {
        let n = (Math.random() < 0.5) ? 1 : Math.floor(Math.random() * 8) + 2;
        vals[c] = type.forced.includes(c) ? n + 1 : n;
    });
    expr = expr.replace(/[a-z]/g, (char) => (char === v ? char : (vals[char] || char)));
    expr = expr.replace(/\?/g, () => (Math.random() < 0.5 ? '+' : '-'));

    // On supprime les "1" devant les lettres (ex: 1x -> x)
    expr = expr.replace(/\b1([a-z])\b/g, '$1');

    // On nettoie aussi les doubles signes qui pourraient apparaître (+-)
    expr = expr.replace(/\+\-/g, '-').replace(/\-\+/g, '-').replace(/\-\-/g, '+');

    return { expr, lettre: v };
}

function genererExpressionBrute() {
    if (piocheEnCours.length === 0) { piocheEnCours = [...BANQUE_DE_TYPES].sort(() => Math.random() - 0.5); }
    const type = piocheEnCours.pop();
    return genererDepuisType(type);
}

/** Génère une expression valide pour le moteur exact (retire en pratique quasi jamais, filet de sécurité). */
function generateRandomExpression() {
    for (let tentative = 0; tentative < 20; tentative++) {
        const { expr, lettre } = genererExpressionBrute();
        const candidat = new ExpressionLitterale(expr, lettre);
        if (candidat.isValid()) {
            logger("Génération propre", expr);
            return candidat;
        }
        logger("Génération rejetée (invalide), nouvelle tentative", expr);
    }
    throw new Error("Impossible de générer une expression valide après 20 tentatives.");
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

    afficherEnonce(generateRandomExpression());

    if (etatJeu === 'quiz') {
        questionCount++;
        updateScoreDisplay();
    }
    setupSkipButton();
}

/** Affiche un énoncé (ExpressionLitterale) et son premier champ de réponse. */
function afficherEnonce(obj) {
    const cont = document.getElementById("inputContainer");
    if (cont) cont.innerHTML = "";
    questionAffichee = new InputWrapper(obj, cont, true);
    new InputWrapper(obj, cont, false);
}

// ==================== ÉNONCÉ PERSONNALISÉ (atelier) ====================
// Le professeur (ou l'élève) tape sa propre expression ; elle remplace la
// question en cours. "Suivant" / "Renoncer" reprennent ensuite le tirage
// aléatoire selon les réglages du panneau.

/** Harmonise les caractères qu'on tape souvent au clavier ou qu'on colle (², ×, −, espaces...). */
function normaliserSaisieEnonce(texte) {
    return texte
        .replace(/\s+/g, '')
        .replace(/²/g, '^2')
        .replace(/[×·]/g, '*')
        .replace(/[−–]/g, '-')
        .toLowerCase();
}

/** Vérifie l'énoncé personnalisé ; renvoie { obj } si utilisable, sinon { erreur }. */
function analyserEnoncePerso(texteBrut) {
    const texte = normaliserSaisieEnonce(texteBrut);
    if (!texte) return { erreur: "Tape une expression." };

    const lettres = [...new Set(texte.match(/[a-z]/g) || [])];
    if (lettres.length === 0) return { erreur: "Il faut une lettre (ex : x)." };
    if (lettres.length > 1) return { erreur: "Une seule lettre possible." };

    const obj = new ExpressionLitterale(texte, lettres[0]);
    if (!obj.isValid()) return { erreur: "Expression invalide." };
    if (obj.analyserForme().reduit) return { erreur: "Déjà développée et réduite." };
    return { obj };
}

/** Champ + bouton du panneau latéral pour saisir un énoncé personnalisé. */
function construireEnoncePerso() {
    const wrap = document.createElement('div');
    wrap.className = 'panel-type-list';

    const champ = document.createElement('input');
    champ.type = 'text';
    champ.className = 'panel-input';
    champ.placeholder = 'ex : 3(2x-5)+(x+1)^2';
    champ.setAttribute('aria-label', 'Énoncé personnalisé');

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn';
    btn.textContent = 'Utiliser cet énoncé';

    const erreur = document.createElement('div');
    erreur.className = 'panel-erreur';

    const valider = () => {
        const { obj, erreur: msg } = analyserEnoncePerso(champ.value);
        erreur.textContent = msg || '';
        if (!obj) { champ.focus(); return; }
        champ.value = '';
        afficherEnonce(obj);
    };
    btn.addEventListener('click', valider);
    champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); valider(); } });
    champ.addEventListener('input', () => { erreur.textContent = ''; });

    wrap.append(champ, btn, erreur);
    return wrap;
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
    if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

function showScore() {
    if (document.getElementById("skipButton")) document.getElementById("skipButton").style.display = "none";
    document.getElementById("inputContainer").innerHTML = `<div style="text-align:center; margin-top:50px;">
        <h2>🎯 Quiz Terminé !</h2>
        <p style="font-size:24px;">Ton score final est de : <strong>${score} / ${questionCount}</strong></p>
        <button class="restart-btn" onclick="location.reload()">Recommencer</button>
    </div>`;
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
    const ajouterGroupe = (titre, contenu) => {
        const groupe = document.createElement('div');
        groupe.className = 'panel-groupe';
        const label = document.createElement('div');
        label.className = 'panel-groupe-label';
        label.textContent = titre;
        groupe.append(label, contenu);
        panneau.appendChild(groupe);
    };

    panneau.appendChild(construireSelecteurMode(verrouille));
    if (modeSelection === 'niveau') {
        ajouterGroupe('Niveau', construireSelecteurNiveau(verrouille));
    } else {
        ajouterGroupe('Distributivité', construireListeMultiple(DISTRIBS_DISPONIBLES, distribsActives, 'Type de distributivité', verrouille));
        ajouterGroupe('Forme', construireListeMultiple(FORMES_DISPONIBLES, formesActives, "Forme de l'expression", verrouille));
    }
    ajouterGroupe('Affichage des carrés', construireSelecteurCarre());
    ajouterFilet();

    if (etatJeu === 'atelier') {
        ajouterGroupe('Énoncé personnalisé', construireEnoncePerso());
        ajouterFilet();

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
