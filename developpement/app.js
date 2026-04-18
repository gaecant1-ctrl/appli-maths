// ==========================================
// ⚙️ CONFIGURATION & GÉNÉRATEUR
// ==========================================
let questionCount = 0;
let score = 0;
let piocheEnCours = [];

const BANQUE_DE_TYPES = [
    { id: "Simple", pattern: 'ux?w?vx?t', constants: ['u', 'v', 'w', 't'], forced: [] },
    { id: "Distrib", pattern: 'u(vx?w)', constants: ['u', 'v', 'w'], forced: ['u'] }, 
    { id: "Moins", pattern: 'ux-(vx?w)', constants: ['u', 'v', 'w'], forced: [] },
    { id: "Prio", pattern: 'w?u(vx?s)', constants: ['u', 'v', 'w', 's'], forced: ['u'] },
    { id: "Double1", pattern: 'u(vx?w)+r(tx?s)', constants: ['u', 'v', 'r', 't', 'w', 's'], forced: ['u', 'r'] },
    { id: "Double2", pattern: 'ux(vx?w)+rx(tx?s)', constants: ['u', 'v', 'r', 't', 'w', 's'], forced: ['u', 'r'] },
    { id: "Mixte", pattern: 'ux(vx?w)?(tx?s)', constants: ['u', 'v', 't', 'w', 's'], forced: ['u'] }
];

class Expression {
    constructor(expr) {
        this.expr = this.autoInsertMultiplication(expr);
    }
    autoInsertMultiplication(e) {
        if (!e) return "";
        return e.replace(/([0-9a-zA-Z\)])\s*\(/g, '$1*(')
                .replace(/([0-9])\s*([a-zA-Z])/g, '$1*$2')
                .replace(/\)\s*([a-zA-Z0-9])/g, ')*$1');
    }
    evaluated() {
        try {
            const vars = Array.from(new Set(this.expr.match(/[a-z]/g))) || [];
            const scope = {}; vars.forEach(v => scope[v] = 2);
            return isFinite(math.evaluate(this.expr, scope));
        } catch (e) { return false; }
    }
    checkEqual(other) {
        try {
            const scope = { x: 2.1, y: 3.4, z: 1.2, a: 0.5, b: 2.7 };
            return Math.abs(math.evaluate(this.expr, scope) - math.evaluate(other.expr, scope)) < 1e-6;
        } catch (e) { return false; }
    }
}

// ==========================================
// 📥 CLASSE : INPUTWRAPPER
// ==========================================
class InputWrapper {
    constructor(expressionObj, container, isQuestion = false) {
        this.status = isQuestion ? 'done' : null;
        this.expressionObj = expressionObj;
        this.container = container;

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'expression capsule-wrapper'; 
        
        // Structure de la capsule
        this.wrapper.style.display = "flex";
        this.wrapper.style.alignItems = "center";
        this.wrapper.style.width = "800px"; 
        this.wrapper.style.boxSizing = "border-box";

        // 1. Zone du symbole
        this.symbolSpan = document.createElement('span');
        this.symbolSpan.className = 'symbol-zone';
        this.symbolSpan.textContent = isQuestion ? '' : '='; 

        // 2. Zone de contenu
        this.inputPart = document.createElement('div');
        this.inputPart.className = 'input-part';
        
        // 3. Zone de feedback (Alignée à droite)
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

    // ✅ Ajout de la méthode manquante
    renderStatic(exprText) {
        try {
            let node = math.parse(exprText);
            // Utilisation de 'hide' pour l'énoncé pour un rendu plus compact
            let latex = node.toTex({ implicit: 'hide' }).replace(/\\cdot/g, '');
            this.inputPart.innerHTML = `<div style="font-size:24px;">\\(${latex}\\)</div>`;
            MathJax.typesetPromise();
        } catch (e) {
            this.inputPart.textContent = exprText;
        }
    }

    handleInput(e) {
        if (e.key === "Enter") {
            e.stopPropagation(); 
            const nextBtn = document.querySelector(".center-button button");
            if (nextBtn) { nextBtn.click(); return; }
            if (this.status === null) {
                this.userAnswer = new Expression(this.input.value);
                this.validate();
            }
        }
    }

validate() {
        const isEval = this.userAnswer.evaluated();
        const isEqual = this.expressionObj.checkEqual(this.userAnswer);
        const isDevStatus = this.checkDev();

        this.freeze();

        if (isEval && isEqual && isDevStatus === true) {
            // ÉTAT : VALIDE
            this.symbolSpan.textContent = '=';
            this.symbolSpan.style.color = '#4A90E2'; // Bleu normal
            this.comment.innerHTML = `<span style="color:green; font-weight:bold; margin-left:10px;">✅ Bravo !</span>`;
            this.status = 'done';
            createNextBtn(this.container);
        } else {
            // ÉTAT : ERREUR
            if (!isEval) {
                // Saisie incompréhensible
                this.symbolSpan.textContent = '?';
                this.symbolSpan.style.color = '#95a5a6'; // Gris (incertitude)
            } else if (!isEqual) {
                // Calcul faux
                this.symbolSpan.textContent = '≠';
                this.symbolSpan.style.color = '#e74c3c'; // Rouge
            } else {
                // Égal mais non développé/réduit
                this.symbolSpan.textContent = '=';
                this.symbolSpan.style.color = '#4A90E2';
            }

            let msg = !isEval ? "Invalide" : (!isEqual ? "Pas égal" : (isDevStatus === 'nondev' ? "Non développé" : "Non réduit"));
            this.comment.innerHTML = `<span style="color:#e67e22; margin-left:10px;">${msg}</span>`;
            
            const btnX = document.createElement('button');
            btnX.className = 'delete-button'; 
            btnX.innerHTML = '❌';
            btnX.onclick = () => this.wrapper.remove();
            this.comment.appendChild(btnX);
            
            this.status = 'processed';
            new InputWrapper(this.expressionObj, this.container);
        }
    }

    freeze() {
        if (this.input) {
            // On réutilise renderStatic pour geler l'input proprement
            this.renderStatic(this.userAnswer.expr);
        }
    }

    checkDev() {
        const e = this.userAnswer.expr;
        if (e.includes('(')) return 'nondev';
        try {
            const node = math.parse(e);
            const varMatch = this.expressionObj.expr.match(/[a-z]/);
            const vName = varMatch ? varMatch[0] : 'x';
            const terms = []; this.flat(node, terms);
            const degs = {};
            for (let t of terms) {
                let d = this.deg(t, vName);
                degs[d] = (degs[d] || 0) + 1;
                if (degs[d] > 1) return 'nonred';
            }
            return true;
        } catch (err) { return 'nonred'; }
    }

    flat(n, t) {
        if (n.isOperatorNode && (n.op === '+' || (n.op === '-' && n.args.length === 2))) {
            n.args.forEach(a => this.flat(a, t));
        } else { t.push(n); }
    }

    deg(n, v) {
        const s = math.simplify(n);
        if (s.isSymbolNode && s.name === v) return 1;
        if (s.isConstantNode) return 0;
        if (s.isOperatorNode && s.op === '^') return parseInt(s.args[1].value);
        if (s.isOperatorNode && s.op === '*') return s.args.reduce((a, b) => a + this.deg(b, v), 0);
        if (s.isOperatorNode && s.fn === 'unaryMinus') return this.deg(s.args[0], v);
        return 0;
    }
}

// ==========================================
// 🚀 LOGIQUE QUIZ
// ==========================================
function generateRandomExpression() {
    if (piocheEnCours.length === 0) {
        piocheEnCours = [...BANQUE_DE_TYPES].sort(() => Math.random() - 0.5);
    }
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
    expr = expr.replace(/\b1(?=[a-z\(])/g, '').replace(/-1(?=[a-z\(])/g, '-');
    expr = expr.replace(/\+\s*-/g, '-').replace(/\-\s*-/g, '+').replace(/\-\s*\+/g, '-');
    return new Expression(expr);
}

function startQuiz() {
    const cont = document.getElementById("inputContainer");
    // On vide aussi l'ancien div expression si tu l'as gardé
    const oldDisplay = document.getElementById("expression");
    if (oldDisplay) oldDisplay.style.display = "none"; 

    cont.innerHTML = "";
    
    if (questionCount < 10) {
        const obj = generateRandomExpression();
        
        // 1. On crée la capsule de l'énoncé (isQuestion = true)
        new InputWrapper(obj, cont, true);
        
        // 2. On crée la première capsule de réponse (isQuestion = false)
        new InputWrapper(obj, cont, false);
        
        questionCount++;
    } else { 
        showScore(); 
    }
}

function createNextBtn(cont) {
    const d = document.createElement('div'); d.className = "center-button";
    const b = document.createElement('button'); b.textContent = "Suivant (Entrée)";
    b.onclick = () => { score++; updateScoreDisplay(); startQuiz(); };
    d.appendChild(b); cont.appendChild(d);
    if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

function updateScoreDisplay() {
    document.getElementById("score").textContent = `Score : ${score}/${questionCount}`;
}

document.getElementById('skipButton').addEventListener('click', () => {
    updateScoreDisplay(); startQuiz();
});

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.tagName !== "INPUT") {
        const nextBtn = document.querySelector(".center-button button");
        if (nextBtn) nextBtn.click();
    }
});

window.onload = startQuiz;
