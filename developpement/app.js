let questionCount = 0;
let score = 0;
let piocheEnCours = [];

const BANQUE_DE_TYPES = [
    { id: "Simple", pattern: 'ux?w?vx?t', constants: ['u', 'v', 'w', 't'], forced: [] },
    { id: "Distrib", pattern: 'u(vx?w)', constants: ['u', 'v', 'w'], forced: ['u'] }, 
    { id: "Moins", pattern: 'ux-(vx?w)', constants: ['u', 'v', 'w'], forced: [] },
    { id: "Prio", pattern: 'w+u(vx?s)', constants: ['u', 'v', 'w', 's'], forced: ['u'] },
    { id: "Double1", pattern: 'u(vx?w)+r(tx?s)', constants: ['u', 'v', 'r', 't', 'w', 's'], forced: ['u', 'r'] },
    { id: "Double2", pattern: 'ux(vx?w)+rx(tx?s)', constants: ['u', 'v', 'r', 't', 'w', 's'], forced: ['u', 'r'] },
    { id: "Mixte", pattern: 'ux(vx?w)?(tx?s)', constants: ['u', 'v', 't', 'w', 's'], forced: ['u'] }
];

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


function prepareForMathJS(expr) {
    if (!expr) return "";

    return expr.toLowerCase()
        // 1. LA LIGNE CRUCIALE : Ajoute * entre deux lettres (yy -> y*y, ab -> a*b)
        // On cherche une lettre suivie d'une autre lettre
        .replace(/([a-z])(?=[a-z])/g, '$1*') 
        
        // 2. Ajoute * entre un chiffre et une lettre (3x -> 3*x)
        .replace(/([0-9])([a-z])/g, '$1*$2')
        
        // 3. Gère les parenthèses (2(x) -> 2*(x))
        .replace(/([0-9a-z])(\()/g, '$1*$2')
        .replace(/(\))([0-9a-z])/g, '$1*$2')
        
        // 4. Nettoyage final
        .trim();
}

class Expression {
    constructor(expr) { 
        this.expr = expr; 
    }

    // Vérifie si l'expression est mathématiquement correcte (syntaxe)
evaluated() {
    try {
        const scope = { x: 2, y: 2, z: 2, a: 2, b: 2 };
        // On prépare l'expression avant de demander à math.js si elle est valide
        const prepared = prepareForMathJS(this.expr);
        const result = math.evaluate(prepared, scope);
        return isFinite(result);
    } catch (e) { 
        return false; 
    }
}

    // Compare la valeur numérique avec des variables aléatoires (évite les collisions)
checkEqual(other) {
    try {
        const scope = { x: 2.12, y: 3.45, z: 1.67, a: 0.89, b: 2.34 };
        
        // On normalise les deux chaînes pour math.js
        const exprInitial = prepareForMathJS(this.expr);
        const exprUser = prepareForMathJS(other.expr);

        const val1 = math.evaluate(exprInitial, scope);
        const val2 = math.evaluate(exprUser, scope);

        // Log de secours pour voir ce que math.js a réellement calculé
        logger("Comparaison Interne", {
            calc_initial: `${exprInitial} = ${val1}`,
            calc_user: `${exprUser} = ${val2}`
        });

        return Math.abs(val1 - val2) < 1e-6;
    } catch (e) {
        logger("Erreur fatale math.js", e.message);
        return false;
    }
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
                this.userAnswer = new Expression(this.input.value);
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
        btnX.className = 'delete-btn'; // On ne met rien dedans, le CSS s'en charge
        btnX.onclick = () => this.wrapper.remove();
        this.comment.appendChild(btnX);
        
        this.status = 'processed';
        new InputWrapper(this.expressionObj, this.container);
    }
}

    validate() {
        const isEval = this.userAnswer.evaluated();
        const isEqual = this.expressionObj.checkEqual(this.userAnswer);
        const devStatus = this.checkDevStatus();
        
        this.freeze();

        if (!isEval) return this.updateUI('neutral', "Invalide");
        if (!isEqual) return this.updateUI('error', "Pas égal");

        // À partir d'ici, c'est forcément égal, donc forcément VERT (success)
        if (devStatus === true) {
            this.updateUI('success', "✅ Bravo !");
            this.status = 'done';
            createNextBtn(this.container);
        } else {
            const msg = (devStatus === 'nondev') ? "Non développé" : "Non réduit";
            this.updateUI('success', msg);
        }
    }

    freeze() { 
        if (this.input) { 
            this.renderStatic(this.input.value); 
        } 
    }

    checkDevStatus() {
        const s = this.userAnswer.expr;
        if (s.includes('(')) return 'nondev';
        const termes = s.replace(/\s+/g, '').split(/(?=[+-])/).filter(t => t.length > 0);
        const degresVus = new Set();
        const vMatch = this.expressionObj.expr.match(/[a-z]/);
        const v = vMatch ? vMatch[0] : 'x';

        for (let t of termes) {
            if (t.includes('*')) return 'nonred';
            // Détection du 1b (non réduit)
            if (new RegExp(`\\b1${v}\\b`).test(t)) return 'nonred';

            let d = 0;
            const powM = t.match(new RegExp(`${v}\\^(\\d+)`));
            if (powM) d = parseInt(powM[1]);
            else if (t.includes(v)) d = 1;
            else d = 0;

            if (degresVus.has(d)) return 'nonred';
            degresVus.add(d);
        }
        return true;
    }
}

// --- Fonctions de gestion du Quiz (inchangées mais nettoyées) ---

function generateRandomExpression() {
    if (piocheEnCours.length === 0) { piocheEnCours = [...BANQUE_DE_TYPES].sort(() => Math.random() - 0.5); }
    const type = piocheEnCours.pop();
    let expr = type.pattern;
    const v = ['x', 'y', 'z', 'a', 'b'][Math.floor(Math.random() * 5)];
    expr = expr.replace(/x/g, v);
    const vals = {};
    type.constants.forEach(c => {
        let n = (Math.random() < 0.5) ? 1 : Math.floor(Math.random() * 8) + 2;
        vals[c] = type.forced.includes(c) ? n + 1 : n;
    });
    expr = expr.replace(/[a-z]/g, (char) => (char === v ? char : (vals[char] || char)));
    expr = expr.replace(/\?/g, () => (Math.random() < 0.5 ? '+' : '-'));

    // On supprime les "1" devant les lettres (ex: 1x -> x)
// La regex \b1([a-z])\b cible le chiffre 1 uniquement s'il est devant une lettre
expr = expr.replace(/\b1([a-z])\b/g, '$1');

// On nettoie aussi les doubles signes qui pourraient apparaître (+-)
expr = expr.replace(/\+\-/g, '-').replace(/\-\+/g, '-').replace(/\-\-/g, '+');

logger("Génération propre", expr);
    return new Expression(expr);
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

window.onload = startQuiz;