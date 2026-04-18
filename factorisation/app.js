// ==========================================
// ⚙️ CONFIGURATION & GÉNÉRATEUR
// ==========================================
let questionCount = 0;
let score = 0;

const TYPES_FACTORISATION = [
    { pattern: 'ab^2 + ua^2b', constants: ['u'], minReduc: 'ab(b+ua)' },
    { pattern: 'ab^2 + ucab', constants: ['u'], minReduc: 'ab(b+uc)' },
    { pattern: 'ux^2 + vx', constants: ['u', 'v'], minReduc: 'x(ux+v)' },
    { pattern: 'ux + vx', constants: ['u', 'v'], minReduc: '(u+v)x' },
    { pattern: 'uabc + vac', constants: ['u', 'v'], minReduc: '(ub+v)ac' },
    { pattern: 'uab + vca', constants: ['u', 'v'], minReduc: '(ub+vc)a' },
    { pattern: 'uac + vbac', constants: ['u', 'v'], minReduc: '(u+vb)ac' },
    { pattern: 'ux + vx^2', constants: ['u', 'v'], minReduc: 'x(u+vx)' },
    { pattern: 'ux^2 + vx^2', constants: ['u', 'v'], minReduc: '(u+v)x^2' },
    { pattern: 'ux^3 + vx^2', constants: ['u', 'v'], minReduc: 'x^2(ux+v)' },
    { pattern: 'uabc + vcba', constants: ['u', 'v'], minReduc: 'abc(u+v)' },
];


function formatToLatex(exprText) {
    //console.log("--- DEBUG AFFICHAGE ---");
    //console.log("1. Reçu brut :", exprText);
    
    try {
        let node = math.parse(exprText);
        
        // On transforme l'arbre pour virer les 1
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
        
        // Le "mouchard" final avant l'envoi à l'écran
        //console.log("2. LaTeX généré :", latex);
        
        return latex.replace(/\\cdot/g, '');
    } catch (e) {
        //console.log("3. ERREUR :", e.message);
        return exprText;
    }
}

class Expression {
    constructor(expr) {
        this.expr = this.autoInsertMultiplication(expr);
    }

    autoInsertMultiplication(e) {
        if (!e || e.trim() === "0") return "0";
        
        let cleaned = e.replace(/\s+/g, ''); // 1. Supprime les espaces

        // 2. Insère les étoiles entre les chiffres et les lettres (ex: 2x -> 2*x)
        cleaned = cleaned.replace(/([0-9])([a-z])/g, '$1*$2');

        // 3. Insère les étoiles ENTRE les lettres (ex: abc -> a*b*c)
        // On le fait deux fois pour attraper les groupes de 3 lettres ou plus
        cleaned = cleaned.replace(/([a-z])([a-z])/g, '$1*$2');
        cleaned = cleaned.replace(/([a-z])([a-z])/g, '$1*$2');

        // 4. Gère les parenthèses (ex: x( -> x*( et )x -> )*x)
        cleaned = cleaned.replace(/([0-9a-z\)])\(/g, '$1*(');
        cleaned = cleaned.replace(/\)([0-9a-z])/g, ')*$1');

        return cleaned;
    }

    evaluated() {
        try {
            // On vérifie juste si l'expression est syntaxiquement correcte
            const scope = { x: 1, y: 1, z: 1, a: 1, b: 1, c: 1, u: 1, v: 1 };
            math.evaluate(this.expr, scope);
            return true;
        } catch (e) { return false; }
    }

    checkEqual(other) {
        try {
            // Scope complet pour éviter le "Undefined symbol"
            const scope = { x: 2.1, y: 3.4, z: 1.2, a: 0.5, b: 2.7, c: 1.8, u: 1.1, v: 1.3 };
            
            const v1 = math.evaluate(this.expr, scope);
            const v2 = math.evaluate(other.expr, scope);

            // LOG DE DÉBOGAGE pour vérifier en temps réel
            //console.log(`Comparaison : [${this.expr}] (${v1}) VS [${other.expr}] (${v2})`);

            return Math.abs(v1 - v2) < 1e-6;
        } catch (e) { 
            //console.error("Erreur comparaison :", e.message);
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
            this.renderStatic(this.expressionObj.expr);
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

renderStatic(exprText) {
    const latex = formatToLatex(this.expressionObj.autoInsertMultiplication(exprText));
    this.inputPart.innerHTML = `<div style="font-size:24px;">\\(${latex}\\)</div>`;
    if (window.MathJax) MathJax.typesetPromise([this.inputPart]);
}

handleInput(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            e.stopPropagation(); // Évite que l'événement remonte au document
            if (this.status === null && this.input.value.trim() !== "") {
                this.userAnswer = new Expression(this.input.value);
                this.validate();
            }
        }
    }

validate() {
    try {
        const rawInput = this.input.value.trim().replace(/\s+/g, '');
        
        // On teste d'abord si c'est mathématiquement correct (syntaxe)
        if (!this.userAnswer.evaluated()) {
            this.freeze();
            this.symbolSpan.textContent = '?';
            this.symbolSpan.style.color = 'red';
            this.comment.innerHTML = `<span style="color:red; font-weight:bold;">Écriture invalide</span>`;
            this.retry();
            return;
        }

        // On teste ensuite si c'est égal
        const isEqual = this.expressionObj.checkEqual(this.userAnswer);
        this.freeze();

        if (!isEqual) {
            this.symbolSpan.textContent = '≠';
            this.symbolSpan.style.color = 'red';
            this.comment.innerHTML = `<span style="color:red; font-weight:bold;">Pas égal</span>`;
            this.retry();
            return;
        }

        // Si c'est égal, on juge la forme
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

        // --- PRIORITÉ 1 : FACTORISATION (Lettre commune) ---
        // Exemple : (x^2 - 3x) -> x est commun aux deux termes
        if (terms.length >= 2) {
            const varsPerTerm = terms.map(t => {
                const m = t.match(/[a-z]/g);
                return m ? new Set(m) : new Set();
            });
            // On cherche si une lettre est présente dans CHAQUE terme
            const commonVars = [...varsPerTerm[0]].filter(v => varsPerTerm.every(set => set.has(v)));
            
            if (commonVars.length > 0) return "CAN_FACTORIZE";
        }

        // --- PRIORITÉ 2 : SIMPLIFICATION (Calculs ou x + x) ---
        if (/(\d+[\+\-\*\/]\d+)/.test(content)) return "CAN_SIMPLIFY"; // Ex: 6+1
        
        const signatures = terms.map(t => (t.match(/[a-z]/g) || []).sort().join(''));
        if (signatures.some((s, i) => signatures.indexOf(s) !== i)) return "CAN_SIMPLIFY"; // Ex: x + 2x
    }
    return "OK";
}

    checkIsConcluded(input) {
        const parenMatches = input.match(/\(([^)]+)\)/g);
        if (!parenMatches) return true; 

        for (let match of parenMatches) {
            const content = match.slice(1, -1);
            if (/(\d+[\+\-\*\/]\d+)/.test(content)) return false; 
            const terms = content.split(/(?=[+\-])/).filter(t => t.trim() !== "");
            if (terms.length < 2) continue;
            const signatures = terms.map(t => (t.match(/[a-z]/g) || []).sort().join(''));
            if (signatures.some((s, i) => signatures.indexOf(s) !== i)) return false; 
            const varsPerTerm = terms.map(t => {
                const m = t.match(/[a-z]/g);
                return m ? new Set(m) : new Set();
            });
            const commonVars = [...varsPerTerm[0]].filter(v => varsPerTerm.every(set => set.has(v)));
            if (commonVars.length > 0) return false; 
        }
        return true;
    }

retry() {
    this.status = 'processed';
    
    const btnX = document.createElement('button');
    btnX.innerHTML = '❌';

    // --- RESET DU STYLE ---
    btnX.style.border = "none";       // Enlève le cadre
    btnX.style.background = "none";   // Enlève le fond gris
    btnX.style.padding = "0";         // Enlève les marges internes
    btnX.style.cursor = "pointer";    // Garde la main au survol
    btnX.style.marginLeft = "10px";   // Garde l'espace avec le texte
    btnX.style.fontSize = "18px";     // Ajuste la taille si besoin
    
    btnX.onclick = () => this.wrapper.remove();
    
    this.comment.appendChild(btnX);
    new InputWrapper(this.expressionObj, this.container, false);
}

    freeze() { 
        if (this.input) {
            const val = this.input.value;
            this.input.remove();
            this.renderStatic(val); 
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
        
        // On crée l'affichage
        new InputWrapper(obj, cont, true);  // Énoncé
        new InputWrapper(obj, cont, false); // Champ de saisie
        
        questionCount++;
        
        // --- LA RÉPARATION EST ICI ---
        updateScoreDisplay(); // Met à jour le compteur (ex: 0/1)
        setupSkipButton();    // Initialise le bouton Renoncer pour cette question
        // ------------------------------

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

function setupSkipButton() {
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) {
        skipBtn.style.display = "block";
        skipBtn.innerHTML = "Renoncer";
        // On réinitialise proprement l'événement
        skipBtn.onclick = (e) => { 
            e.preventDefault();
            startQuiz(); // Relance une nouvelle question
        };
    }
}

function createNextBtn(cont) {
    const d = document.createElement('div'); d.className = "center-button";
    const b = document.createElement('button'); b.textContent = "Suivant (Entrée)";
    b.onclick = () => { score++; updateScoreDisplay(); startQuiz(); };
    d.appendChild(b); cont.appendChild(d);
    
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) skipBtn.style.display = "none";
    showConfetti();
}

function updateScoreDisplay() {
    const sElem = document.getElementById("score");
    if (sElem) sElem.textContent = `Score : ${score}/${questionCount}`;
}

function showScore() {
    if (document.getElementById("skipButton")) document.getElementById("skipButton").style.display = "none";
    document.getElementById("inputContainer").innerHTML = `<div style="text-align:center; margin-top:50px;">
        <h2>🎯 Quiz Terminé !</h2>
        <p style="font-size:24px;">Ton score final est de : <strong>${score} / 10</strong></p>
    </div>`;
}

function showConfetti() {
    if (typeof confetti !== 'undefined') {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } });
    }
}

// ÉCOUTEUR GLOBAL - UN SEUL LIEU POUR TOUTE LA PAGE
document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        // Si l'utilisateur est en train de taper dans un input, on ne fait rien ici
        // car handleInput de la classe s'en occupe déjà
        if (e.target.tagName === "INPUT") return;

        const nextBtn = document.querySelector(".center-button button");
        if (nextBtn) {
            e.preventDefault();
            nextBtn.click();
        }
    }
});

window.onload = startQuiz;