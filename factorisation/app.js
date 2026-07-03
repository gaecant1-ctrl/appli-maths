// ==========================================
// ⚙️ CONFIGURATION & TYPES
// ==========================================
let questionCount = 0;
let score = 0;
let etatJeu = 'atelier';   // 'atelier' | 'quiz' — atelier : rien n'est compté, questions illimitées.
let quizDemarre = false;   // true une fois qu'on a cliqué "Commencer le Quiz"

// Types actifs (au moins un toujours sélectionné)
const typesActifs = new Set(['simple']);

// Faut-il exiger l'extraction d'un facteur scalaire entier pur (ex: 2a+4b → 2(a+2b)) ?
// Par défaut non : un facteur scalaire seul (sans variable commune) n'est pas
// considéré comme une factorisation indispensable.
let exigerFacteurScalaire = false;

const TYPES_SELECTEUR = [
    { type: 'simple',      label: 'Facteur simple' },
    { type: 'complexe',    label: 'Facteur complexe' },
    { type: 'remarquable', label: 'Identité remarquable' },
];

/** Construit le sélecteur de type (multi-actif) pour le panneau latéral. */
function construireSelecteurType(disabled = false) {
    const wrap = document.createElement('div');
    wrap.id = 'typeSelector';
    wrap.className = 'panel-type-list';

    TYPES_SELECTEUR.forEach(({ type, label }) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'type-btn panel-btn' + (typesActifs.has(type) ? ' active' : '');
        btn.textContent = label;
        btn.dataset.type = type;
        btn.disabled = disabled;
        btn.addEventListener('click', () => {
            if (typesActifs.has(type)) {
                if (typesActifs.size > 1) { // garder au moins un actif
                    typesActifs.delete(type);
                    btn.classList.remove('active');
                }
            } else {
                typesActifs.add(type);
                btn.classList.add('active');
            }
        });
        wrap.appendChild(btn);
    });

    return wrap;
}

// ── Niveau 1 : facteur commun simple ───────────────────────────

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

function generateNiveau1() {
    const type = TYPES_FACTORISATION[Math.floor(Math.random() * TYPES_FACTORISATION.length)];
    const vars = ['x', 'y', 'z', 'a', 'b', 'c'].sort(() => 0.5 - Math.random());
    const map  = { a: vars[0], b: vars[1], c: vars[2] };
    let expr = type.pattern.replace(/[abc]/g, char => map[char]);
    type.constants.forEach(c => {
        const val = Math.random() < 0.4 ? 1 : Math.floor(Math.random() * 8) + 2;
        expr = expr.replace(new RegExp(c, 'g'), val);
    });
    if (Math.random() < 0.5) expr = expr.replace(/\+/g, '-');
    return new Expression(expr);
}

// ── Niveau 2 : facteur commun binôme A(ax+b) ± B(ax+b) ────────

/** Formate un binôme (ax+b) ou (ax-b) en chaîne propre.
 *  Omet le coefficient 1 devant x : (x+3) et non (1x+3). */
function _binome(a, b) {
    const coefX = a === 1 ? '' : String(a);
    return b >= 0 ? `(${coefX}x+${b})` : `(${coefX}x${b})`;
}

/** Construit un terme : A × fc, avec permutation si A est un binôme. */
function _terme(A, fc) {
    if (A === null) {
        // A = fc lui-même → fc^2
        return `${fc}^2`;
    }
    const estBinome = A.startsWith('(');
    // Scalaire : toujours devant. Binôme : ordre aléatoire.
    if (estBinome && Math.random() < 0.5) return `${fc}${A}`;
    return `${A}${fc}`;
}

/** Choisit A (ou B) parmi { scalaire, fc, autre binôme }. */
function _facteur(a, b) {
    const type = Math.floor(Math.random() * 3);
    if (type === 0) return String(Math.floor(Math.random() * 8) + 2); // scalaire 2-9
    if (type === 1) return null;  // null = fc lui-même → fc^2
    const e = Math.floor(Math.random() * 4) + 1;
    const f = (Math.floor(Math.random() * 9) + 1) * (Math.random() < 0.3 ? -1 : 1);
    return _binome(e, f);
}

function generateNiveau2() {
    // Facteur commun (ax+b) avec a ∈ 1-4, b ∈ ±1-9
    const a = Math.floor(Math.random() * 4) + 1;
    const b = (Math.floor(Math.random() * 9) + 1) * (Math.random() < 0.3 ? -1 : 1);
    const fc = _binome(a, b);

    // A et B distincts (évite A=B=null qui donnerait fc^2 - fc^2 = 0)
    let A, B;
    do {
        A = _facteur(a, b);
        B = _facteur(a, b);
    } while (A === null && B === null);

    const signe = Math.random() < 0.5 ? '+' : '-';
    const expr  = `${_terme(A, fc)}${signe}${_terme(B, fc)}`;
    return new Expression(expr);
}

// ── Identité remarquable : A² - B² ─────────────────────────────
// A et B choisis parmi : entier (n), monôme (ax), binôme (ax+b).
// A contient toujours x. B peut être entier, monôme ou binôme.
// Les monomials sont affichés développés (2x → 4x²),
// les binômes gardent la notation carré ((x+3) → (x+3)²).

function _ir_tirerEntier(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

/** Valeur de A ou B (avant mise au carré). */
function _ir_genValeur(type) {
    if (type === 'int')  return { val: String(_ir_tirerEntier(2, 9)), type };
    if (type === 'mono') {
        const a = _ir_tirerEntier(1, 5);
        return { val: a === 1 ? 'x' : `${a}x`, type, a };
    }
    // binom
    const a = _ir_tirerEntier(1, 5);
    const b = _ir_tirerEntier(1, 9) * (Math.random() < 0.35 ? -1 : 1);
    return { val: _binome(a, b), type };
}

/**
 * Transforme une valeur V en son carré pour l'affichage :
 *   "4"    → "16"     (entier : on calcule n²)
 *   "2x"   → "4x^2"  (monôme : on développe (ax)² = a²x²)
 *   "(x+3)"→ "(x+3)^2" (binôme : on garde la notation)
 */
function _ir_carre(v) {
    const { val, type, a } = v;
    if (type === 'int')  return String(parseInt(val) ** 2);
    if (type === 'mono') return (a === 1) ? 'x^2' : `${a * a}x^2`;
    return `${val}^2`; // binôme
}

function generateIdentiteRemarquable() {
    // A : monôme ou binôme (toujours avec x)
    // B : entier, monôme ou binôme (progression de complexité)
    let A, B, dA, dB;
    let tentatives = 0;
    do {
        const typeA = Math.random() < 0.5 ? 'mono' : 'binom';
        // Si A est un monôme, B est entier (pas de mono+mono peu intéressant)
        // Si A est un binôme, B peut être int, mono ou binom
        const typesB = typeA === 'mono'  ? ['int'] :
                       typeA === 'binom' ? ['int', 'mono', 'binom'] : ['int'];
        const typeB  = typesB[Math.floor(Math.random() * typesB.length)];
        A  = _ir_genValeur(typeA);
        B  = _ir_genValeur(typeB);
        dA = _ir_carre(A);
        dB = _ir_carre(B);
        tentatives++;
    } while (dA === dB && tentatives < 30); // évite A² = B² → expression nulle

    return new Expression(`${dA}-${dB}`);
}

function generateRandomExpression() {
    const types = [...typesActifs];
    const type  = types[Math.floor(Math.random() * types.length)];
    if (type === 'complexe')     return generateNiveau2();
    if (type === 'remarquable')  return generateIdentiteRemarquable();
    return generateNiveau1(); // 'simple' ou fallback
}

// ==========================================
// 🧠 LOGIQUE MATHS (utilise calcul-mv.js)
// ==========================================
class Expression {
    constructor(expr) {
        this.raw  = expr;
        // On normalise les * pour faciliter le parsing par ObjetStringMV
        this.expr = expr;
    }

    /** Vérifie que l'expression est syntaxiquement valide. */
    evaluated() {
        return evalMV(this.expr) !== null;
    }

    /** Égalité algébrique exacte via PolynomeMV. */
    checkEqual(other) {
        const p1 = evalMV(this.expr);
        const p2 = evalMV(other.expr);
        if (!p1 || !p2) return false;
        return p1.equal(p2);
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
        // Pour les questions ET les réponses figées : on passe par l'arbre
        // qui préserve la forme écrite (pas de développement) et produit
        // un LaTeX propre (exposants, parenthèses, signe unaire...).
        const os      = parseMV(String(exprText));
        const display = os.isValid() ? os.toLatex() : String(exprText);
        this.inputPart.innerHTML = `<div style="font-size:24px;">\\(${display}\\)</div>`;
        if (window.MathJax) MathJax.typesetPromise([this.inputPart]);
    }

    handleInput(e) {
        if (e.key === "Enter") {
            e.preventDefault();
            if (this.status === null && this.input.value.trim() !== "") {
                this.validate();
            }
        }
    }

    validate() {
        try {
            const rawInput = this.input.value.trim().replace(/\s+/g, '');

            // Parse la réponse de l'élève en arbre
            const osUser = parseMV(rawInput);
            if (!osUser.isValid()) {
                this.freeze();
                this.showError("Écriture invalide", "?");
                this.retry();
                return;
            }

            const polyUser = osUser.calculer().resultat;
            const polyRef  = evalMV(this.expressionObj.raw);

            const isEqual = polyRef && polyRef.equal(polyUser);
            this.freeze(rawInput);

            if (!isEqual) {
                this.showError("Pas égal", "≠");
                this.retry();
                return;
            }

            // Inspection structurelle de l'arbre :
            // 1. La racine doit être un produit (pas une somme)
            const isProd = estProduit(osUser.arbre);

            // 2. Chaque facteur-somme ne doit plus avoir de facteur commun
            const conclusionStatus = this.getConclusionStatus(osUser.arbre);

            if (isProd && conclusionStatus === "OK") {
                this.symbolSpan.textContent = '=';
                this.symbolSpan.style.color = '#4A90E2';
                this.comment.innerHTML = `<span style="color:green; font-weight:bold;">✅ Bravo !</span>`;
                this.status = 'done';
                createNextBtn(this.container);
            } else {
                let msg = "";
                if (!isProd) msg = "Pas factorisé (somme)";
                else if (conclusionStatus === "CAN_FACTORIZE") msg = "On peut encore factoriser";
                else msg = "On peut encore simplifier l'écriture";

                this.comment.innerHTML = `<span style="color:#e67e22; font-weight:bold;">${msg}</span>`;
                this.retry();
            }
        } catch (e) {
            console.error("Erreur critique:", e);
        }
    }

    getConclusionStatus(arbre) {
        // Récupère tous les facteurs-sommes directs dans le produit
        const sommes = facteursSommes(arbre);
        for (const sommeNode of sommes) {
            const poly = sommeNode.evaluer();
            const fc = poly.facteurCommun();
            if (fc !== null) {
                // Un facteur purement scalaire (pas de variable commune) n'est
                // signalé que si le réglage "exiger le facteur scalaire" est actif.
                const estUniquementScalaire = Object.keys(fc.degres).length === 0;
                if (!estUniquementScalaire || exigerFacteurScalaire) return "CAN_FACTORIZE";
            }
            // Détecte les termes de même signature (ex: x² + x² → 2x²)
            const sigs = poly.monomes.map(m => m.signature());
            if (sigs.some((s, i) => sigs.indexOf(s) !== i)) return "CAN_SIMPLIFY";
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

    freeze(latexOverride = null) { 
        if (this.input) {
            const val = latexOverride || this.input.value;
            this.input.remove();
            this.renderStatic(val, false); 
        }
    }
}

// ==========================================
// 🚀 LOGIQUE QUIZ
// ==========================================

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
    const d = document.createElement('div'); d.className = "center-button";
    const b = document.createElement('button'); b.textContent = "Suivant (Entrée)";
    b.onclick = () => {
        if (etatJeu === 'quiz') { score++; updateScoreDisplay(); }
        demarrerQuestion();
    };
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
        <button class="restart-btn" onclick="location.reload()">Recommencer</button>
    </div>`;
}

/** Construit la paire Oui/Non "exiger le facteur scalaire entier" pour le panneau latéral. */
function construireToggleScalaire(disabled = false) {
    const groupe = document.createElement('div');
    groupe.className = 'panel-groupe';

    const label = document.createElement('div');
    label.className = 'panel-groupe-label';
    label.textContent = 'Facteur scalaire entier';
    groupe.appendChild(label);

    const ligne = document.createElement('div');
    ligne.className = 'panel-groupe-paire';

    const btnOui = document.createElement('button');
    btnOui.type = 'button';
    btnOui.className = 'panel-btn panel-btn-half' + (exigerFacteurScalaire ? ' active' : '');
    btnOui.textContent = 'Oui';
    btnOui.disabled = disabled;

    const btnNon = document.createElement('button');
    btnNon.type = 'button';
    btnNon.className = 'panel-btn panel-btn-half' + (!exigerFacteurScalaire ? ' active' : '');
    btnNon.textContent = 'Non';
    btnNon.disabled = disabled;

    btnOui.onclick = () => { exigerFacteurScalaire = true; renderPanneauLateral(); };
    btnNon.onclick = () => { exigerFacteurScalaire = false; renderPanneauLateral(); };

    ligne.append(btnOui, btnNon);
    groupe.appendChild(ligne);

    return groupe;
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

    const groupe = document.createElement('div');
    groupe.className = 'panel-groupe';
    const label = document.createElement('div');
    label.className = 'panel-groupe-label';
    label.textContent = 'Type de factorisation';
    groupe.appendChild(label);
    groupe.appendChild(construireSelecteurType(etatJeu === 'quiz' && quizDemarre));
    panneau.appendChild(groupe);

    panneau.appendChild(construireToggleScalaire(etatJeu === 'quiz' && quizDemarre));
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

/** Label rappelant qu'on est en mode Quiz (avant ou pendant), comme dans l'appli équation. */
function construireLabelQuiz() {
    const label = document.createElement('div');
    label.className = 'panel-groupe-label';
    label.textContent = 'Quiz';
    return label;
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

/** Installe le bouton "Nouvel onglet" dans le bandeau.
 *  Repli si window.open() est bloqué (iframe sandbox) : affiche un lien
 *  cliquable à côté du bouton. */
function setupBoutonNouvelOnglet() {
    const conteneur = document.getElementById("topButtonsBar");
    if (!conteneur) return;

    const btn = document.createElement('button');
    btn.type = 'button';
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

window.onload = () => {
    setupEtatToggle();
    renderPanneauLateral();
    setupBoutonNouvelOnglet();
    if (typeof FicheFactorisation !== 'undefined') {
        const fiche = new FicheFactorisation();
        fiche.installerBouton(document.getElementById("topButtonsBar"));
    }
    if (typeof GuideAppli !== 'undefined') {
        const guide = new GuideAppli();
        guide.installerBouton(document.getElementById("topButtonsBar"));
    }
    demarrerQuestion();
};