// --- CONFIGURATION ---
const BANQUE_DE_TYPES = [
    { id: "Simple", pattern: 'ax+b=c' },
    { id: "Variable2Cotes", pattern: 'ax+b=cx+d' },
    { id: "Parentheses", pattern: 'a(bx+c)=d' }
];

// --- CLASSE EQUATION ---
// Garde la même interface qu'avant (lhs/rhs en texte, getSolution(), etc.)
// mais s'appuie désormais sur le module calcul-litteral (Polynome/ObjetString)
// pour le parsing et le calcul, au lieu de math.js. Plus besoin d'insérer les
// "*" manuellement : ObjetString gère déjà la multiplication implicite (2x,
// 3(x+1), etc.) nativement.
class Equation {
    constructor(lhs, rhs) {
        // On garde le texte brut tel que tapé (pas de réécriture), exactement
        // comme avant : la vérification "x = nombre" dans validate() dépend
        // du texte exact saisi par l'élève.
        this.lhs = (lhs === undefined || lhs === null || lhs === "") ? "0" : lhs.toString();
        this.rhs = (rhs === undefined || rhs === null || rhs === "") ? "0" : rhs.toString();
    }

    /** Parse lhs et rhs en Polynome via le module calcul-litteral. Lève une erreur si invalide. */
    _parsePolynomes() {
        const osLhs = new ObjetString(this.lhs, {});
        const osRhs = new ObjetString(this.rhs, {});
        if (!osLhs.isValid()) throw new Error(osLhs.erreur || "Membre gauche invalide.");
        if (!osRhs.isValid()) throw new Error(osRhs.erreur || "Membre droit invalide.");
        const polyLhs = osLhs.calculer().resultat.polynome;
        const polyRhs = osRhs.calculer().resultat.polynome;
        return { polyLhs, polyRhs };
    }

    /**
     * Calcule la solution exacte pour x (sous forme de Nombre), ou null si :
     *  - l'un des membres ne parse pas,
     *  - l'équation n'est pas du premier degré (lhs - rhs non affine),
     *  - le coefficient de x est nul (pas de solution unique).
     */
    getSolution() {
        try {
            const { polyLhs, polyRhs } = this._parsePolynomes();
            const diff = polyLhs.sub(polyRhs); // lhs - rhs = 0
            return diff.getSolution(); // Nombre exact, ou null si non affine / a=0
        } catch (e) {
            return null;
        }
    }

    /** Polynome représentant (lhs - rhs), pour comparer deux équations exactement. */
    getDiffPolynome() {
        const { polyLhs, polyRhs } = this._parsePolynomes();
        return polyLhs.sub(polyRhs);
    }

    /**
     * Diagnostic précis de l'état de l'équation, utilisé par validate() pour
     * donner un feedback différencié plutôt qu'un unique "Calcul faux".
     * Renvoie un objet { statut, solution } où statut est l'un de :
     *   - "invalide"   : l'expression ne parse pas (syntaxe, format).
     *   - "nonAffine"  : parse, mais pas du premier degré (x^2 apparu...).
     *   - "xDisparu"   : parse, affine, mais coefficient de x nul (0=5, 0=0...).
     *   - "ok"         : parse, affine, coefficient de x non nul -> solution exacte.
     */
    diagnostiquer() {
        let diff;
        try {
            diff = this.getDiffPolynome();
        } catch (e) {
            return { statut: "invalide", solution: null };
        }

        if (!diff.estAffine()) {
            return { statut: "nonAffine", solution: null };
        }

        const { a } = diff.getCoeffAffine();
        const zero = Nombre.fromParts(0, 1, "entier");
        if (a.equal(zero)) {
            return { statut: "xDisparu", solution: null };
        }

        return { statut: "ok", solution: diff.getSolution() };
    }
}

class InputWrapper {
    constructor(equationObj, container, isQuestion = false) {
        this.equationObj = equationObj;
        this.container = container;

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'capsule-wrapper';

        // Zone d'équivalence (⟺ avec l'étape précédente), à gauche de toute la ligne.
        // Vide sur la ligne d'énoncé (pas de "précédente" à ce stade).
        this.equivZone = document.createElement('div');
        this.equivZone.className = 'equiv-zone';

        // Bloc équation : sous-conteneur qui garde gauche/=/droite alignés
        // sur leur propre pivot, tout en restant centré comme un seul bloc.
        this.equationZone = document.createElement('div');
        this.equationZone.className = 'equation-zone';

        this.leftPart = document.createElement('div');
        this.leftPart.className = 'side-left';

        this.symbolPart = document.createElement('div');
        this.symbolPart.className = 'symbol-zone';
        this.symbolPart.textContent = '=';

        this.rightPart = document.createElement('div');
        this.rightPart.className = 'side-right';

        this.equationZone.append(this.leftPart, this.symbolPart, this.rightPart);

        this.commentPart = document.createElement('div');
        this.commentPart.className = 'feedback-zone';

        this.wrapper.append(this.equivZone, this.equationZone, this.commentPart);
        this.container.appendChild(this.wrapper);

        if (isQuestion) {
            this.renderStatic(this.equationObj);
        } else {
            this.renderInput();
        }
    }

    renderInput() {
        this.input = document.createElement('input');
        this.input.className = 'input-full';
        this.input.placeholder = "Ex: 2x = 10  (division : utiliser ':' , ex 6:2)";
        
        // Cache les zones statiques pendant la saisie
        this.leftPart.style.gridColumn = "1 / span 3";
        this.symbolPart.style.display = "none";
        this.rightPart.style.display = "none";
        
        this.leftPart.appendChild(this.input);
        this.input.focus();
        this.input.addEventListener("keydown", (e) => {
            if (e.key === "Enter" && this.input.value.includes('=')) {
                this.validate();
            }
        });
    }

    renderStatic(eq) {
        if (this.input) this.input.remove();
        this.leftPart.style.gridColumn = "1";
        this.symbolPart.style.display = "block";
        this.rightPart.style.display = "block";

        this.leftPart.innerHTML = `\\(${formatToLatex(eq.lhs)}\\)`;
        this.rightPart.innerHTML = `\\(${formatToLatex(eq.rhs)}\\)`;
        if (window.MathJax) MathJax.typesetPromise();
    }

    /** Affiche le symbole ⟺ dans la zone d'équivalence (étape reconnue équivalente à la précédente / à l'origine). */
    afficherEquivalent() {
        this.equivZone.classList.remove('non-equiv');
        this.equivZone.innerHTML = '\\(\\Leftrightarrow\\)';
        if (window.MathJax) MathJax.typesetPromise([this.equivZone]);
    }

 validate() {
    const val = this.input.value;
    const parts = val.split('=');
    const userEq = new Equation(parts[0], parts[1]);

    // Diagnostic différencié de la réponse de l'élève : distingue une vraie
    // erreur de calcul d'une expression invalide, d'un degré trop élevé, ou
    // d'une équation dégénérée (x disparu). La cible, elle, est générée par
    // le programme donc toujours valide : on se contente de sa solution.
    const diagUser = userEq.diagnostiquer();
    const targetSol = this.equationObj.getSolution();

    const isEquivalent = (
        diagUser.statut === "ok" &&
        targetSol !== null &&
        diagUser.solution !== null &&
        targetSol.equal(diagUser.solution)
    );

    // Vérification si l'équation est résolue (x = nombre ou nombre = x)
    const left = parts[0].trim();
    const right = parts[1].trim();
    const isSolved = (left === 'x' && !isNaN(right)) || (right === 'x' && !isNaN(left));

    this.renderStatic(userEq);

    if (isEquivalent && isSolved) {
        // --- VICTOIRE ---
        this.wrapper.classList.add('capsule-wrapper-final');
        this.afficherEquivalent();
        this.commentPart.innerHTML = "<span style='color:var(--succes); font-weight:bold;'>✅ Résolu !</span>";
        createNextBtn(this.container); 
    } else if (isEquivalent) {
        // --- ÉTAPE VALIDE : équivalente à la précédente (donc à l'origine,
        // puisqu'aucune étape non équivalente n'a jamais pu être validée) ---
        this.afficherEquivalent();
        this.commentPart.innerHTML = "Étape valide";
        new InputWrapper(this.equationObj, this.container, false);
    } else {
        // --- NON ÉQUIVALENTE : message différencié selon la cause.
        // Bloquant par construction : aucune nouvelle ligne n'est créée ici,
        // seul le clic sur ❌ permet de retaper (cf plus bas).
        const messages = {
            invalide: "Expression invalide",
            nonAffine: "Ce n'est plus une équation du premier degré",
            xDisparu: "Plus de x dans l'équation",
            ok: "Pas équivalente" // statut "ok" mais solution différente de la cible
        };
        const msg = messages[diagUser.statut] || "Pas équivalente";

        this.equivZone.classList.add('non-equiv');

        this.commentPart.innerHTML = msg;
        
        const btnX = document.createElement('button');
        btnX.className = "delete-button";
        btnX.innerHTML = "❌";
        btnX.onclick = () => { 
            this.wrapper.remove(); 
            new InputWrapper(this.equationObj, this.container, false); 
        };
        this.commentPart.appendChild(btnX);
    }
}
}

// --- FONCTIONS DE JEU ---

/** Lit l'état courant des boutons de paramètres et le renvoie sous la forme attendue par genererEquation(). */
function lireParametresGeneration() {
    const lireFamille = (id) => {
        const conteneur = document.getElementById(id);
        if (!conteneur) return [];
        return [...conteneur.querySelectorAll(".param-btn.active")].map(b => b.dataset.value);
    };

    return {
        typesEquation: lireFamille("grpTypeEquation"),
        typesNombre: lireFamille("grpTypeNombre"),
        typesSolution: lireFamille("grpTypeSolution"),
        coefficientsNegatifs: !!document.getElementById("toggleCoefNeg")?.checked,
        solutionNegative: !!document.getElementById("toggleSolNeg")?.checked
    };
}

function generateRandomExpression() {
    const params = lireParametresGeneration();
    const gen = genererEquation(params);
    return new Equation(gen.lhs, gen.rhs);
}

/**
 * Démarre une question en mode "équation personnalisée" : affiche un petit
 * formulaire de saisie (ex: "2x+3=7") à la place de la génération aléatoire.
 * Une fois validée, lance la résolution normalement selon le mode courant.
 */
function demarrerSaisiePersonnalisee() {
    const cont = document.getElementById("inputContainer");
    if (!cont) return;
    cont.innerHTML = "";

    const bloc = document.createElement('div');
    bloc.className = 'perso-saisie';

    const label = document.createElement('div');
    label.className = 'perso-label';
    label.textContent = "Équation à donner à l'élève :";

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'perso-input';
    input.placeholder = "Ex: 2x+3=7";

    const btn = document.createElement('button');
    btn.className = 'panel-btn accent';
    btn.style.width = 'auto';
    btn.textContent = "Lancer";

    const valider = () => {
        const val = input.value;
        if (!val.includes('=')) return;
        const [lhs, rhs] = val.split('=');
        const eq = new Equation(lhs, rhs);
        if (eq.getSolution() === null) {
            label.textContent = "Équation invalide ou sans solution unique — réessaie.";
            label.classList.add('perso-erreur');
            return;
        }
        lancerResolution(eq);
    };

    input.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider(); });
    btn.onclick = valider;

    bloc.append(label, input, btn);
    cont.appendChild(bloc);
    input.focus();
}

/** Lance la résolution d'une équation donnée (perso ou générée), selon le mode de résolution courant. */
function lancerResolution(eq) {
    const cont = document.getElementById("inputContainer");
    if (!cont) return;
    cont.innerHTML = "";

    if (modeActuel === 'guide') {
        const osLhs = new ObjetString(eq.lhs, {});
        const osRhs = new ObjetString(eq.rhs, {});
        const polyLhs = osLhs.calculer().resultat.polynome;
        const polyRhs = osRhs.calculer().resultat.polynome;
        new OperationRow(polyLhs, polyRhs, eq, cont, null);
    } else {
        new InputWrapper(eq, cont, true);
        new InputWrapper(eq, cont, false);
    }
}

function startQuiz() {
    const eq = generateRandomExpression();
    lancerResolution(eq);

    if (etatJeu === 'quiz') {
        questionCount++;
        updateScoreDisplay();
    }
}

/**
 * Rend une expression texte (lhs ou rhs d'une Equation) en LaTeX, via le
 * module calcul-litteral. Affiche la forme BRUTE telle que tapée (arbre non
 * évalué) — pas la version développée/réduite — pour que l'élève voie
 * fidèlement ce qu'il a écrit (ex: "2(x+3)" reste "2(x+3)", pas "2x+6").
 * Si l'expression ne parse pas (saisie en cours, invalide), on retombe sur
 * le texte brut, comme le faisait l'ancienne version en cas d'exception.
 */
function formatToLatex(exprText) {
    try {
        const os = new ObjetString(exprText, {});
        if (!os.isValid() || !os.arbre) return exprText;
        return os.arbre.toLatex();
    } catch (e) {
        return exprText;
    }
}

function createNextBtn(cont) {
    // Supprimer un bouton existant s'il y en a un
    const oldBtn = document.querySelector(".center-button");
    if (oldBtn) oldBtn.remove();

    const div = document.createElement('div');
    div.className = 'center-button';
    
    const b = document.createElement('button');
    b.textContent = "Suivant (Entrée)";
    
    b.onclick = () => { 
        if (etatJeu === 'quiz') {
            score++;
            updateScoreDisplay();
        }
        if (etatJeu === 'quiz' && questionCount >= 10) { 
            showScore(); 
        } else { 
            demarrerQuestion();
        } 
    };

    div.appendChild(b);
    cont.appendChild(div);
    
    // On cache le bouton "Passer" puisqu'on a fini
    if (document.getElementById("skipButton")) {
        document.getElementById("skipButton").style.display = "none";
    }
}


function updateScoreDisplay() {
    const progressElem = document.getElementById("question-progress");
    if (progressElem) {
        progressElem.textContent = `Question ${questionCount}/10`;
    }
    const sElem = document.getElementById("score");
    if (sElem) {
        sElem.textContent = `Score : ${score}`;
    }
}

/** Écran de fin de quiz : affiche le score final et propose de recommencer. */
function showScore() {
    const cont = document.getElementById("inputContainer");
    if (!cont) return;
    cont.innerHTML = "";

    const bloc = document.createElement('div');
    bloc.className = 'fin-quiz';

    const titre = document.createElement('h2');
    titre.className = 'fin-quiz-titre';
    titre.textContent = 'Quiz terminé';

    const scoreFinal = document.createElement('div');
    scoreFinal.className = 'fin-quiz-score';
    scoreFinal.textContent = `${score} / ${questionCount}`;

    const btn = document.createElement('button');
    btn.className = 'restart-btn';
    btn.textContent = 'Quitter';
    btn.onclick = () => location.reload();

    bloc.append(titre, scoreFinal, btn);
    cont.appendChild(bloc);
}

function setupSkipButton() {
    const skipBtn = document.getElementById("skipButton");
    if (skipBtn) {
        skipBtn.style.display = "block";
        skipBtn.onclick = () => { 
            // On ne gagne pas de point, on passe juste à la suivante
            if (etatJeu === 'quiz' && questionCount >= 10) showScore(); 
            else demarrerQuestion();
        };
    }
}

// --- PANNEAU DE PARAMÈTRES ---

/** Construit les boutons d'une famille à partir d'un référentiel [{id, label}, ...]. preselection : ids à activer par défaut. */
function construireBoutonsFamille(conteneurId, referentiel, preselection = []) {
    const conteneur = document.getElementById(conteneurId);
    if (!conteneur) return;

    referentiel.forEach(item => {
        const btn = document.createElement('button');
        btn.type = "button";
        btn.className = "param-btn";
        btn.textContent = item.label;
        btn.dataset.value = item.id;
        if (preselection.includes(item.id)) btn.classList.add("active");
        btn.onclick = () => btn.classList.toggle("active");
        conteneur.appendChild(btn);
    });
}

function setupParamsPanel() {
    // Présélection par défaut : le cas le plus simple (ax+b=d, coefficients entiers, solution entière).
    // L'utilisateur peut décocher/recocher librement ensuite ; case vide = shuffle, comme pour le reste.
    construireBoutonsFamille("grpTypeEquation", TYPES_EQUATION, ["Simple"]);
    construireBoutonsFamille("grpTypeNombre", TYPES_NOMBRE, ["Entiers"]);
    construireBoutonsFamille("grpTypeSolution", [
        { id: "entier", label: "Entier" },
        { id: "fraction", label: "Fraction" }
    ], ["entier"]);

    const overlay = document.getElementById("paramsOverlay");
    const modal = document.getElementById("paramsModal");
    const toggleBtn = document.getElementById("paramsToggle");
    const closeBtn = document.getElementById("paramsClose");

    if (overlay && toggleBtn) {
        toggleBtn.onclick = () => overlay.classList.add("open");
    }
    if (overlay && closeBtn) {
        closeBtn.onclick = () => overlay.classList.remove("open");
    }
    if (overlay && modal) {
        // Clic en dehors de la modale (sur le fond sombre) -> fermeture.
        overlay.addEventListener("click", (e) => {
            if (e.target === overlay) overlay.classList.remove("open");
        });
    }
}

document.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        const nextBtn = document.querySelector(".center-button button");
        // Si le bouton suivant existe et qu'on n'est pas en train de taper dans un input
        if (nextBtn && e.target.tagName !== "INPUT") {
            e.preventDefault();
            nextBtn.click();
        }
    }
});


let questionCount = 0;
let score = 0;
let piocheEnCours = [];
let modeActuel = 'libre'; // 'libre' | 'guide' — mode de RÉSOLUTION (orthogonal à l'état atelier/quiz)
let etatJeu = 'atelier'; // 'atelier' | 'quiz' — atelier : rien n'est figé, pas de comptage.
let quizDemarre = false; // true une fois qu'on a cliqué "Commencer le Quiz"
let equationPersonnaliseeActive = false; // toggle indépendant : source de l'équation (atelier uniquement)

/**
 * Point d'aiguillage central. Tient compte de trois dimensions indépendantes :
 *   - etatJeu ('atelier' | 'quiz') : si quiz et pas encore démarré, ne lance rien.
 *   - equationPersonnaliseeActive : en atelier seulement, remplace la génération
 *     aléatoire par un petit formulaire de saisie.
 *   - modeActuel ('libre' | 'guide') : mécanique de résolution une fois l'équation choisie.
 */
function demarrerQuestion() {
    if (etatJeu === 'quiz' && !quizDemarre) return; // rien à afficher avant le clic "Commencer"
    if (etatJeu === 'quiz' && questionCount >= 10) { showScore(); return; }

    // Le bouton Renoncer est caché par createNextBtn() une fois une équation
    // résolue ; il doit réapparaître à chaque nouvelle question.
    setupSkipButton();

    if (etatJeu === 'atelier' && equationPersonnaliseeActive) {
        demarrerSaisiePersonnalisee();
        return;
    }

    if (modeActuel === 'guide') {
        startQuizOperationGuidee();
    } else {
        startQuiz();
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
        btnAtelier.className = 'btn-header' + (etatJeu === 'atelier' ? ' accent' : '');
        btnQuiz.className = 'btn-header' + (etatJeu === 'quiz' ? ' accent' : '');
    };
    majClasses();

    const basculer = (nouvelEtat) => {
        if (etatJeu === nouvelEtat) return; // déjà dans cet état, rien à faire
        etatJeu = nouvelEtat;
        quizDemarre = false;
        questionCount = 0;
        score = 0;
        updateScoreDisplay();
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

    const btnParams = document.createElement('button');
    btnParams.type = 'button';
    btnParams.className = 'panel-btn';
    btnParams.textContent = 'Paramètres';
    btnParams.onclick = () => document.getElementById("paramsOverlay")?.classList.add("open");
    panneau.appendChild(btnParams);
    ajouterFilet();

    if (etatJeu === 'atelier') {
        btnParams.disabled = equationPersonnaliseeActive;

        panneau.appendChild(creerGroupePaire(
            'Équation personnalisée',
            'Oui', 'Non',
            () => equationPersonnaliseeActive,
            () => { equationPersonnaliseeActive = true; renderPanneauLateral(); demarrerQuestion(); },
            () => { equationPersonnaliseeActive = false; renderPanneauLateral(); demarrerQuestion(); }
        ));
        ajouterFilet();

        panneau.appendChild(creerGroupePaire(
            'Mode de résolution',
            'Par saisie', 'Par opération',
            () => modeActuel === 'libre',
            () => { modeActuel = 'libre'; demarrerQuestion(); },
            () => { modeActuel = 'guide'; demarrerQuestion(); }
        ));
        ajouterFilet();

        const skipAtelier = document.createElement('button');
        skipAtelier.id = 'skipButton';
        skipAtelier.className = 'panel-btn';
        skipAtelier.textContent = 'Renoncer';
        panneau.appendChild(skipAtelier);
        setupSkipButton();

    } else if (etatJeu === 'quiz' && !quizDemarre) {
        panneau.appendChild(creerGroupePaire(
            'Mode de résolution',
            'Par saisie', 'Par opération',
            () => modeActuel === 'libre',
            () => { modeActuel = 'libre'; },
            () => { modeActuel = 'guide'; }
        ));
        ajouterFilet();

        const btnCommencer = document.createElement('button');
        btnCommencer.type = 'button';
        btnCommencer.className = 'panel-btn accent';
        btnCommencer.textContent = 'Commencer le Quiz';
        btnCommencer.onclick = () => {
            quizDemarre = true;
            questionCount = 0;
            score = 0;
            renderPanneauLateral();
            demarrerQuestion();
        };
        panneau.appendChild(btnCommencer);

    } else if (etatJeu === 'quiz' && quizDemarre) {
        btnParams.disabled = true;
        panneau.appendChild(creerGroupePaire(
            'Mode de résolution',
            'Par saisie', 'Par opération',
            () => modeActuel === 'libre',
            () => {}, () => {},
            true
        ));
        ajouterFilet();

        const labelQuiz = document.createElement('div');
        labelQuiz.className = 'panel-groupe-label';
        labelQuiz.textContent = 'Quiz';
        panneau.appendChild(labelQuiz);

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

/**
 * Construit un groupe label + deux boutons côte à côte, où exactement un des
 * deux est actif à la fois (état binaire, comme Atelier/Quiz dans le header).
 * @param {string} label - texte affiché au-dessus du groupe
 * @param {string} labelA - texte du premier bouton
 * @param {string} labelB - texte du second bouton
 * @param {() => boolean} estA - renvoie true si l'option A est actuellement active
 * @param {() => void} choisirA - callback quand on clique sur A
 * @param {() => void} choisirB - callback quand on clique sur B
 * @param {boolean} disabled
 */
function creerGroupePaire(label, labelA, labelB, estA, choisirA, choisirB, disabled = false) {
    const wrap = document.createElement('div');
    wrap.className = 'panel-groupe';

    const labelDiv = document.createElement('div');
    labelDiv.className = 'panel-groupe-label';
    labelDiv.textContent = label;

    const ligne = document.createElement('div');
    ligne.className = 'panel-groupe-paire';

    const btnA = document.createElement('button');
    btnA.type = 'button';
    btnA.className = 'panel-btn panel-btn-half' + (estA() ? ' accent' : '');
    btnA.textContent = labelA;
    btnA.disabled = disabled;

    const btnB = document.createElement('button');
    btnB.type = 'button';
    btnB.className = 'panel-btn panel-btn-half' + (!estA() ? ' accent' : '');
    btnB.textContent = labelB;
    btnB.disabled = disabled;

    btnA.onclick = () => { choisirA(); btnA.classList.add('accent'); btnB.classList.remove('accent'); };
    btnB.onclick = () => { choisirB(); btnB.classList.add('accent'); btnA.classList.remove('accent'); };

    ligne.append(btnA, btnB);
    wrap.append(labelDiv, ligne);
    return wrap;
}

// Cette ligne lance le quiz automatiquement au chargement
window.onload = () => {
    setupParamsPanel();
    setupEtatToggle();
    renderPanneauLateral();
    if (typeof FichePapier === 'function') {
        const fiche = new FichePapier();
        fiche.installerBouton(document.getElementById("topButtonsBar"));
    }
    demarrerQuestion();
};