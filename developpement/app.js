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

function formatToLatex(exprText) {
    try {
        let node = math.parse(exprText);
        const transformed = node.transform(function (node) {
            if (node.isOperatorNode && node.op === '*') {
                if (node.args[0].isConstantNode && node.args[0].value === 1) return node.args[1];
                if (node.args[0].isConstantNode && node.args[0].value === -1) {
                    return new math.OperatorNode('-', 'unaryMinus', [node.args[1]]);
                }
            }
            return node;
        });
        let latex = transformed.toTex({ parenthesis: 'keep', implicit: 'hide' });
        return latex.replace(/\\cdot/g, '');
    } catch (e) { return exprText; }
}

class Expression {
    constructor(expr) { this.expr = this.autoInsertMultiplication(expr); }
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

        if (isQuestion) { this.renderStatic(this.expressionObj.expr); } 
        else {
            this.input = document.createElement('input');
            this.input.type = "text"; this.input.style.width = "250px";
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

// Remplace toute la méthode validate() dans ta classe InputWrapper par celle-ci :

validate() {
    const isEval = this.userAnswer.evaluated();
    const isEqual = this.expressionObj.checkEqual(this.userAnswer);
    const isDevStatus = this.checkDev();
    this.freeze();

    if (isEval && isEqual && isDevStatus === true) {
        // ÉTAT : VALIDE (Réponse finale)
        this.symbolSpan.textContent = '=';
        this.symbolSpan.style.color = '#4A90E2'; // Bleu
        this.comment.innerHTML = `<span style="color:green; font-weight:bold; margin-left:10px;">✅ Bravo !</span>`;
        this.status = 'done';
        createNextBtn(this.container);
    } else {
        // ÉTAT : ERREUR OU ÉTAPE
        let msg = "";
        
        if (!isEval) {
            // Cas du ? (Saisie invalide)
            this.symbolSpan.textContent = '?';
            this.symbolSpan.style.color = '#95a5a6'; // Gris
            msg = "Invalide";
        } else if (!isEqual) {
            // Cas du ≠ (Calcul faux)
            this.symbolSpan.textContent = '≠';
            this.symbolSpan.style.color = '#e74c3c'; // Rouge
            msg = "Pas égal";
        } else {
            // Cas du = (Égal mais pas fini)
            this.symbolSpan.textContent = '=';
            this.symbolSpan.style.color = '#4A90E2'; // Bleu
            msg = (isDevStatus === 'nondev') ? "Non développé" : "Non réduit";
        }

        this.comment.innerHTML = `<span style="color:#e67e22; margin-left:10px; font-weight:bold;">${msg}</span>`;
        
        // Ajout du bouton ❌ pour effacer la ligne
        const btnX = document.createElement('button');
        btnX.style.border = "none"; 
        btnX.style.background = "none"; 
        btnX.style.cursor = "pointer";
        btnX.style.fontSize = "16px";
        btnX.innerHTML = '❌'; 
        btnX.onclick = () => this.wrapper.remove();
        this.comment.appendChild(btnX);
        
        this.status = 'processed';
        // On crée le nouvel input pour continuer
        new InputWrapper(this.expressionObj, this.container);
    }
}

    freeze() { if (this.input) { this.renderStatic(this.userAnswer.expr); } }

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
    setupSkipButton();
}

function setupSkipButton() {
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) {
        skipBtn.style.display = "block";
        skipBtn.onclick = () => { if (questionCount >= 10) showScore(); else startQuiz(); };
    }
}

function createNextBtn(cont) {
    const div = document.createElement('div');
    div.className = 'center-button';
    const b = document.createElement('button');
    b.textContent = "Suivant (Entrée)";
    b.onclick = () => { score++; if (questionCount >= 10) showScore(); else startQuiz(); };
    div.appendChild(b);
    cont.appendChild(div);
    if (document.getElementById("skipButton")) document.getElementById("skipButton").style.display = "none";
}

function updateScoreDisplay() {
    const sElem = document.getElementById("score");
    if (sElem) sElem.textContent = `Score : ${score}/${questionCount}`;
}

function showScore() {
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) skipBtn.style.display = "none";
    
    document.getElementById("inputContainer").innerHTML = `
        <div style="text-align:center; padding:50px; font-family: 'Outfit', sans-serif;">
            <h2 style="color: #2c3e50; font-size: 2rem; margin-bottom: 10px;">🎯 Quiz Terminé !</h2>
            <div style="font-size: 80px; color: #4CAF50; font-weight: bold; margin: 20px 0;">
                ${score} <span style="font-size: 30px; color: #bdc3c7;">/ 10</span>
            </div>
            <p style="color: #7f8c8d; font-size: 1.2rem; margin-bottom: 20px;">
                ${score >= 8 ? "Excellent !" : (score >= 5 ? "Pas mal !" : "Continue tes efforts !")}
            </p>
            <button onclick="location.reload()" class="restart-btn">
                Recommencer le défi
            </button>
        </div>`;
}

// ÉCOUTEUR GLOBAL POUR LA TOUCHE ENTREE SUR LE BOUTON SUIVANT
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