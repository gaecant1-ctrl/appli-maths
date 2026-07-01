let questionCount = 0;
let score = 0;
let piocheEnCours = [];

const BANQUE_DE_TYPES = [
    { id: "Simple",  pattern: 'ux?w?vx?t', constants: ['u', 'v', 'w', 't'], forced: [] },
    { id: "Distrib", pattern: 'u(vx?w)', constants: ['u', 'v', 'w'], forced: ['u'] },
    { id: "Moins",   pattern: 'ux-(vx?w)', constants: ['u', 'v', 'w'], forced: [] },
    { id: "Prio",    pattern: 'w+u(vx?s)', constants: ['u', 'v', 'w', 's'], forced: ['u'] },
    { id: "Double1", pattern: 'u(vx?w)+r(tx?s)', constants: ['u', 'v', 'r', 't', 'w', 's'], forced: ['u', 'r'] },
    { id: "Double2", pattern: 'ux(vx?w)+rx(tx?s)', constants: ['u', 'v', 'r', 't', 'w', 's'], forced: ['u', 'r'] },
    { id: "Mixte",   pattern: 'ux(vx?w)?(tx?s)', constants: ['u', 'v', 't', 'w', 's'], forced: ['u'] }
];

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
        const latex = formatToLatex(exprText);
        this.inputPart.innerHTML = `<div style="font-size:24px;">\\(${latex}\\)</div>`;
        if (window.MathJax) MathJax.typesetPromise();
    }

    handleInput(e) {
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

// --- Header (boutons "classiques" communs aux projets) ---

/**
 * Installe les boutons standards du bandeau haut :
 * - "Nouvel onglet" : fonctionnel dès maintenant.
 * - Fiche papier : PAS encore implémenté ici — le bouton s'installera tout
 *   seul dès que Fiche.js (avec sa classe FichePapier, comme dans le projet
 *   équations) sera ajouté au projet. Rien à retoucher dans cette fonction
 *   quand ce jour viendra.
 */
function construireHeader() {
    const bandeau = document.getElementById('topButtonsBar');
    if (!bandeau) return;

    const btnNouvelOnglet = document.createElement('button');
    btnNouvelOnglet.type = 'button';
    btnNouvelOnglet.id = 'btnNouvelOnglet';
    btnNouvelOnglet.className = 'btn-header';
    btnNouvelOnglet.textContent = 'Nouvel onglet';
    btnNouvelOnglet.addEventListener('click', () => {
        window.open(window.location.href, '_blank', 'noopener');
    });
    bandeau.appendChild(btnNouvelOnglet);

    if (typeof FichePapier === 'function') {
        const fiche = new FichePapier();
        fiche.installerBouton(bandeau);
    }
}

// --- Fonctions de gestion du Quiz ---

function genererExpressionBrute() {
    if (piocheEnCours.length === 0) { piocheEnCours = [...BANQUE_DE_TYPES].sort(() => Math.random() - 0.5); }
    const type = piocheEnCours.pop();
    let expr = type.pattern;
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

function startQuiz() {
    const cont = document.getElementById("inputContainer");
    if (cont) cont.innerHTML = "";
    if (questionCount >= 10) { showScore(); return; }
    const obj = generateRandomExpression();
    new InputWrapper(obj, cont, true);
    new InputWrapper(obj, cont, false);
    questionCount++;
    updateScoreDisplay();
}

function createNextBtn(cont) {
    const div = document.createElement('div');
    div.className = 'center-button';
    const b = document.createElement('button');
    b.textContent = "Suivant (Entrée)";
    b.onclick = () => { score++; if (questionCount >= 10) showScore(); else startQuiz(); };
    div.appendChild(b);
    cont.appendChild(div);
}

function updateScoreDisplay() {
    const sElem = document.getElementById("score");
    if (sElem) sElem.textContent = `Score : ${score}/${questionCount}`;
}

function showScore() {
    document.getElementById("inputContainer").innerHTML = `
        <div style="text-align:center; padding:50px;">
            <h2>🎯 Quiz Terminé !</h2>
            <div style="font-size: 80px; color: #4CAF50; font-weight: bold;">${score} / 10</div>
            <button onclick="location.reload()" style="margin-top:20px;">Recommencer</button>
        </div>`;
}

// Gestion du bouton Renoncer
document.getElementById("skipButton").addEventListener("click", () => {
    // On ne compte pas de point (score ne bouge pas)
    // Mais on passe à la question suivante
    if (questionCount >= 10) {
        showScore();
    } else {
        startQuiz();
    }
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const nextBtn = document.querySelector(".center-button button");
        if (nextBtn && e.target.tagName !== "INPUT") {
            e.preventDefault();
            nextBtn.click();
        }
    }
});

window.onload = () => {
    construireHeader();
    startQuiz();
};
