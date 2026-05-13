// ==========================================
// ⚙️ CONFIGURATION & GÉNÉRATEUR
// ==========================================
let questionCount = 0;
let score = 0;

const TYPES_FACTORISATION = [
    { pattern: 'ab^2 + ua^2b', constants: ['u'] },
    { pattern: 'ab^2 + ucab', constants: ['u'] },
    { pattern: 'ux^2 + vx', constants: ['u', 'v'] },
    { pattern: 'ux + vx', constants: ['u', 'v'] },
    { pattern: 'uabc + vac', constants: ['u', 'v'] },
    { pattern: 'uab + vca', constants: ['u', 'v'] },
    { pattern: 'uac + vbac', constants: ['u', 'v'] },
    { pattern: 'ux + vx^2', constants: ['u', 'v'] },
    { pattern: 'ux^2 + vx^2', constants: ['u', 'v'] },
    { pattern: 'ux^3 + vx^2', constants: ['u', 'v'] },
    { pattern: 'uabc + vcba', constants: ['u', 'v'] },
];

function cleanQuestionExpression(expr) {
    if (!expr) return "";
    return expr
        .replace(/\b1(?=[a-z])/g, '')    // 1x -> x 
        .replace(/^\s*1(?=[a-z])/g, '')  // 1x en début
        .replace(/\(1(?=[a-z])/g, '(')   // (1x -> (x
        .replace(/\*/g, ' \\times ')     // * -> \times pour l'énoncé
        .replace(/\s+/g, ' ');           // Nettoyage espaces
}

// ==========================================
// 🧠 LOGIQUE MATHS (Validation uniquement)
// ==========================================
class Expression {
    constructor(expr) {
        this.raw = expr; 
        this.expr = this.autoInsertMultiplication(expr); 
    }

    autoInsertMultiplication(e) {
        if (!e || e.trim() === "" || e.trim() === "0") return "0";
        let cleaned = e.replace(/\s+/g, '');
        cleaned = cleaned.replace(/([0-9])([a-z])/g, '$1*$2');
        while (/([a-z])([a-z])/.test(cleaned)) {
            cleaned = cleaned.replace(/([a-z])([a-z])/g, '$1*$2');
        }
        cleaned = cleaned.replace(/([0-9a-z\)])\(/g, '$1*(');
        cleaned = cleaned.replace(/\)([0-9a-z])/g, ')*$1');
        return cleaned;
    }

    evaluated() {
        try {
            const scope = { x: 1, y: 1, z: 1, a: 1, b: 1, c: 1, u: 1, v: 1 };
            math.evaluate(this.expr, scope);
            return true;
        } catch (e) { return false; }
    }

    checkEqual(other) {
        try {
            const scope = { x: 2.1, y: 3.4, z: 1.2, a: 0.5, b: 2.7, c: 1.8, u: 1.1, v: 1.3 };
            const v1 = math.evaluate(this.expr, scope);
            const v2 = math.evaluate(other.expr, scope);
            return Math.abs(v1 - v2) < 1e-6;
        } catch (e) { return false; }
    }
}

// ==========================================
// 🖥️ INTERFACE & RENDU
// ==========================================
class InputWrapper {
    constructor(expressionObj, container, isQuestion = false) {
        this.status = isQuestion ? 'done' : null;
        this.expressionObj = expressionObj;
        this.container = container;

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'expression capsule-wrapper'; 
        this.wrapper.style.display = "flex";
        this.wrapper.style.alignItems = "center";
        this.wrapper.style.marginBottom = "10px";

        this.symbolSpan = document.createElement('span');
        this.symbolSpan.className = 'symbol-zone';
        this.symbolSpan.style.minWidth = "30px";
        this.symbolSpan.textContent = isQuestion ? '' : '='; 

        this.inputPart = document.createElement('div');
        this.inputPart.className = 'input-part';
        
        this.comment = document.createElement('div');
        this.comment.className = 'feedback-zone';
        this.comment.style.marginLeft = "auto"; 

        this.wrapper.appendChild(this.symbolSpan);
        this.wrapper.appendChild(this.inputPart);
        this.wrapper.appendChild(this.comment);
        this.container.appendChild(this.wrapper);

        if (isQuestion) {
            this.renderStatic(this.expressionObj.raw, true);
        } else {
            this.input = document.createElement('input');
            this.input.type = "text";
            this.input.placeholder = "Factorise au maximum";
            this.input.style.width = "250px";
            this.inputPart.appendChild(this.input);
            this.input.focus();
            this.input.addEventListener("keydown", (e) => this.handleInput(e));
        }
    }

    renderStatic(exprText, isQuestion = false) {
        // MIROIR + Remplacement visuel du * par \times
        let display = isQuestion ? cleanQuestionExpression(exprText) : exprText.replace(/\*/g, ' \\times ');
        
        this.inputPart.innerHTML = `<div style="font-size:24px;">\\(${display}\\)</div>`;
        if (window.MathJax) {
            MathJax.typesetPromise([this.inputPart]);
        }
    }

    handleInput(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (this.status === null && this.input.value.trim() !== "") {
                this.userAnswer = new Expression(this.input.value);
                this.validate();
            }
        }
    }

    validate() {
        try {
            const rawInput = this.input.value.trim().replace(/\s+/g, '');
            
            if (!this.userAnswer.evaluated()) {
                this.freeze();
                this.showError("Écriture invalide", "?");
                this.retry();
                return;
            }

            const isEqual = this.expressionObj.checkEqual(this.userAnswer);
            this.freeze();

            if (!isEqual) {
                this.showError("Pas égal", "≠");
                this.retry();
                return;
            }

            const outsideParen = rawInput.replace(/\([^)]+\)/g, '');
            const isProduct = !/[+\-]/.test(outsideParen);
            const conclusionStatus = this.getConclusionStatus(rawInput);

            if (isProduct && conclusionStatus === "OK") {
                this.symbolSpan.textContent = '=';
                this.symbolSpan.style.color = '#4A90E2';
                this.comment.innerHTML = `<span style="color:green; font-weight:bold;">✅ Bravo !</span>`;
                this.status = 'done';
                createNextBtn(this.container);
            } else {
                let msg = "";
                if (!isProduct) msg = "Pas factorisé (somme)";
                else if (conclusionStatus === "CAN_FACTORIZE") msg = "On peut encore factoriser";
                else msg = "On peut encore simplifier l'écriture";
                
                this.comment.innerHTML = `<span style="color:#e67e22; font-weight:bold;">${msg}</span>`;
                this.retry();
            }
        } catch (e) {
            console.error("Erreur critique:", e);
        }
    }

    getConclusionStatus(input) {
        const parenMatches = input.match(/\(([^)]+)\)/g);
        if (!parenMatches) return "OK"; 

        for (let match of parenMatches) {
            const content = match.slice(1, -1);
            const terms = content.split(/(?=[+\-])/).filter(t => t.trim() !== "");

            if (terms.length >= 2) {
                const varsPerTerm = terms.map(t => {
                    const m = t.match(/[a-z]/g);
                    return m ? new Set(m) : new Set();
                });
                const commonVars = [...varsPerTerm[0]].filter(v => varsPerTerm.every(set => set.has(v)));
                if (commonVars.length > 0) return "CAN_FACTORIZE";
            }

            if (/(\d+[\+\-\*\/]\d+)/.test(content)) return "CAN_SIMPLIFY"; 
            const signatures = terms.map(t => (t.match(/[a-z]/g) || []).sort().join(''));
            if (signatures.some((s, i) => signatures.indexOf(s) !== i)) return "CAN_SIMPLIFY"; 
        }
        return "OK";
    }

    showError(msg, symbol) {
        this.symbolSpan.textContent = symbol;
        this.symbolSpan.style.color = 'red';
        this.comment.innerHTML = `<span style="color:red; font-weight:bold;">${msg}</span>`;
    }

    retry() {
        this.status = 'processed';
        const btnX = document.createElement('button');
        btnX.innerHTML = '❌';
        btnX.style = "border:none; background:none; padding:0; cursor:pointer; margin-left:10px; font-size:18px;";
        btnX.onclick = () => this.wrapper.remove();
        this.comment.appendChild(btnX);
        new InputWrapper(this.expressionObj, this.container, false);
    }

    freeze() { 
        if (this.input) {
            const val = this.input.value;
            this.input.remove();
            this.renderStatic(val, false); 
        }
    }
}

// ==========================================
// 🚀 LOGIQUE QUIZ
// ==========================================
function startQuiz() {
    const cont = document.getElementById("inputContainer");
    if (cont) cont.innerHTML = "";
    
    if (questionCount < 10) {
        const obj = generateRandomExpression();
        new InputWrapper(obj, cont, true);  
        new InputWrapper(obj, cont, false); 
        questionCount++;
        updateScoreDisplay(); 
        setupSkipButton(); 
    } else { 
        showScore(); 
    }
}

function generateRandomExpression() {
    const type = TYPES_FACTORISATION[Math.floor(Math.random() * TYPES_FACTORISATION.length)];
    const vars = ['x', 'y', 'z', 'a', 'b', 'c'].sort(() => 0.5 - Math.random());
    const map = {a:vars[0], b:vars[1], c:vars[2]};
    let expr = type.pattern.replace(/[abc]/g, char => map[char]);
    type.constants.forEach(c => {
        const val = Math.random() < 0.4 ? 1 : Math.floor(Math.random() * 8) + 2;
        expr = expr.replace(new RegExp(c, 'g'), val);
    });
    if (Math.random() < 0.5) expr = expr.replace(/\+/g, '-');
    return new Expression(expr);
}

function updateScoreDisplay() {
    const sElem = document.getElementById("score");
    if (sElem) sElem.textContent = `Score : ${score}/${questionCount}`;
}

function setupSkipButton() {
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) {
        skipBtn.style.display = "block";
        skipBtn.onclick = (e) => { e.preventDefault(); startQuiz(); };
    }
}

function createNextBtn(cont) {
    const d = document.createElement('div'); d.className = "center-button";
    const b = document.createElement('button'); b.textContent = "Suivant (Entrée)";
    b.onclick = () => { score++; updateScoreDisplay(); startQuiz(); };
    d.appendChild(b); cont.appendChild(d);
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) skipBtn.style.display = "none";
    if (typeof confetti !== 'undefined') confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
}

function showScore() {
    if (document.getElementById("skipButton")) document.getElementById("skipButton").style.display = "none";
    document.getElementById("inputContainer").innerHTML = `<div style="text-align:center; margin-top:50px;">
        <h2>🎯 Quiz Terminé !</h2>
        <p style="font-size:24px;">Ton score final est de : <strong>${score} / 10</strong></p>
    </div>`;
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        if (e.target.tagName === "INPUT") return;
        const nextBtn = document.querySelector(".center-button button");
        if (nextBtn) { e.preventDefault(); nextBtn.click(); }
    }
});

window.onload = startQuiz;