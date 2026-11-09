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

    /**
     * Toutes les solutions (tableau de Nombre) : [] si l'équation est impossible,
     * null si elle est invalide, toujours vraie, ou de racines non rationnelles.
     */
    getSolutions() {
        try {
            const diff = this.getDiffPolynome();
            if (diff.estConstant()) return diff.coeff(0).equal(new Nombre("0")) ? null : [];
            if (diff.degre() === 1) return [diff.getSolution()];
            if (diff.degre() === 2) return racinesRationnelles(diff);
            return null;
        } catch (e) {
            return null;
        }
    }

    /** Vrai si l'équation s'écrit x = nombre (ou nombre = x), nombre sous forme irréductible. */
    estResolue() {
        try {
            const { polyLhs, polyRhs } = this._parsePolynomes();
            const estX = (p) => p.degre() === 1
                && p.coeff(1).equal(new Nombre("1"))
                && p.coeff(0).equal(new Nombre("0"));
            const lhsEstX = estX(polyLhs);
            if (!(lhsEstX && polyRhs.estConstant()) && !(estX(polyRhs) && polyLhs.estConstant())) return false;

            const te = new Nombre((lhsEstX ? this.rhs : this.lhs).trim()).typeEcriture;
            return te === 'entier' || te === 'fractionSimple';
        } catch (e) {
            return false;
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
        this.input.placeholder = "équation";
        
        // Cache les zones statiques pendant la saisie
        this.leftPart.style.gridColumn = "1 / span 3";
        this.leftPart.classList.add('ligne-entiere');
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
        this.leftPart.classList.remove('ligne-entiere');
        this.symbolPart.style.display = "block";
        this.rightPart.style.display = "block";

        this.leftPart.innerHTML = `\\(${formatToLatex(eq.lhs, { preserverEcriture: true })}\\)`;
        this.rightPart.innerHTML = `\\(${formatToLatex(eq.rhs, { preserverEcriture: true })}\\)`;
        if (window.MathJax) MathJax.typesetPromise();
    }

    /** Affiche le symbole ⟺ dans la zone d'équivalence (étape reconnue équivalente à la précédente / à l'origine). */
    afficherEquivalent() {
        this.equivZone.classList.remove('non-equiv');
        this.equivZone.innerHTML = '\\(\\Leftrightarrow\\)';
        if (window.MathJax) MathJax.typesetPromise([this.equivZone]);
    }

    /** Équation à plusieurs solutions : la ligne peut enchaîner « A=B ou C=D ». */
    validerAlternatives(val, cibles) {
        const textes = val.split(/\bou\b/i).map(s => s.trim());
        const alternatives = textes.map(t => {
            const morceaux = t.split('=');
            // Le parseur refuse un moins devant une parenthèse : -(x+5) devient -1(x+5).
            const opposes = morceaux.map(m => m.replace(/^\s*-\s*\(/, '-1('));
            return opposes.length === 2 ? new Equation(opposes[0], opposes[1]) : null;
        });

        const listes = alternatives.map(eq => eq ? eq.getSolutions() : null);
        const lisible = listes.every(l => l !== null);
        const trouvees = lisible ? listes.flat() : [];
        const dans = (s, liste) => liste.some(c => c.equal(s));
        const equivalente = lisible
            && trouvees.every(s => dans(s, cibles))
            && cibles.every(c => dans(c, trouvees));
        const formeFinale = lisible && alternatives.every(eq => eq.estResolue());
        const resolue = equivalente && formeFinale;

        if (this.input) this.input.remove();
        this.leftPart.innerHTML = lisible
            ? `\\(${alternatives.map(eq => `${formatToLatex(eq.lhs)} = ${formatToLatex(eq.rhs)}`).join(' \\text{ ou } ')}\\)`
            : '';
        if (!lisible) this.leftPart.textContent = val;
        if (window.MathJax) MathJax.typesetPromise();

        if (resolue) {
            this.wrapper.classList.add('capsule-wrapper-final');
            this.afficherEquivalent();
            this.commentPart.innerHTML = "<span style='color:var(--succes); font-weight:bold;'>✅ Résolu !</span>";
            afficherVerification(this.container, this.equationObj, trouvees);
            createNextBtn(this.container);
        } else if (equivalente) {
            this.afficherEquivalent();
            this.commentPart.innerHTML = "Étape valide";
            new InputWrapper(this.equationObj, this.container, false);
        } else {
            this.signalerNonEquivalente(lisible ? "Pas équivalente" : "Expression invalide", val);
            if (formeFinale) this.verification = afficherVerification(this.container, this.equationObj, trouvees);
        }
    }

    signalerNonEquivalente(msg, saisie) {
        this.equivZone.classList.add('non-equiv');
        this.commentPart.innerHTML = msg;

        // Faute de frappe : on rouvre la saisie avec le texte de l'élève.
        const btnRecopier = document.createElement('button');
        btnRecopier.className = "recopier-button";
        btnRecopier.textContent = "Modifier";
        btnRecopier.title = "Remettre cette ligne dans le champ pour la corriger";
        btnRecopier.onclick = () => {
            this.verification?.remove();
            this.wrapper.remove();
            const ligne = new InputWrapper(this.equationObj, this.container, false);
            ligne.input.value = saisie;
            ligne.input.focus();
        };
        this.commentPart.appendChild(btnRecopier);

        const btnX = document.createElement('button');
        btnX.className = "delete-button";
        btnX.innerHTML = "❌";
        btnX.onclick = () => {
            this.verification?.remove();
            this.wrapper.remove();
            new InputWrapper(this.equationObj, this.container, false);
        };
        this.commentPart.appendChild(btnX);
    }

 validate() {
    const val = this.input.value;

    const cibles = this.equationObj.getSolutions();
    if (cibles && cibles.length > 1) {
        this.validerAlternatives(val, cibles);
        return;
    }

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

    // Vérification si l'équation est résolue (x = constante ou constante = x).
    // Conditions :
    //   1. Forme polynomiale : "x seul" d'un côté, constante de l'autre.
    //   2. La constante écrite est déjà en forme irréductible :
    //      typeEcriture 'entier' ou 'fractionSimple' — jamais 'fraction' non
    //      réduite (ex: 72/9 ou 30/3 sont refusés, l'élève doit simplifier).
    const isSolved = isEquivalent && userEq.estResolue();

    this.renderStatic(userEq);

    if (isEquivalent && isSolved) {
        // --- VICTOIRE ---
        this.wrapper.classList.add('capsule-wrapper-final');
        this.afficherEquivalent();
        this.commentPart.innerHTML = "<span style='color:var(--succes); font-weight:bold;'>✅ Résolu !</span>";
        afficherVerification(this.container, this.equationObj, [diagUser.solution]);
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

        this.signalerNonEquivalente(msg, val);
        if (diagUser.statut === "ok" && userEq.estResolue()) {
            this.verification = afficherVerification(this.container, this.equationObj, [diagUser.solution]);
        }
    }
}
}

// --- VÉRIFICATION ÉCRITE ---

/** Valeur d'un membre (texte de l'énoncé) pour x = valeur. */
function evaluerMembre(texte, valeur) {
    const poly = polynomeDe(texte);
    let somme = new Nombre("0");
    let puissance = new Nombre("1");
    for (let d = 0; d <= poly.degre(); d++) {
        somme = somme.add(poly.coeff(d).mul(puissance));
        puissance = puissance.mul(valeur);
    }
    return somme.simplify();
}

/** LaTeX d'un nombre, avec le signe devant la fraction. */
function nombreLatex(nombre) {
    const n = nombre.simplify();
    if (n.valeurNum.a >= 0) return n.toLatex();
    return '-' + Nombre.fromParts(-n.valeurNum.a, n.valeurNum.b, n.typeEcriture).toLatex();
}

/** Remplace x par la valeur dans une écriture LaTeX, en ajoutant les × et parenthèses nécessaires. */
function remplacerX(latex, valeur) {
    const v = valeur.simplify();
    const texteValeur = nombreLatex(v);

    return latex.replace(/(?<![a-zA-Z\\])x(?![a-zA-Z])/g, (x, position) => {
        const avant = latex.slice(0, position).trimEnd().slice(-1);
        const apres = latex.slice(position + 1).trimStart();
        const puissance = apres.startsWith('^');
        const entreParentheses = texteValeur.startsWith('-') || (puissance && !v.isEntier());

        const corps = entreParentheses ? `\\left(${texteValeur}\\right)` : texteValeur;
        const foisAvant = /[0-9})]/.test(avant) ? '\\times ' : '';
        const foisApres = /^(\(|\\left)/.test(apres) ? ' \\times ' : '';
        return foisAvant + corps + foisApres;
    });
}

/**
 * Écrit sous la résolution le calcul des deux membres de l'énoncé pour chaque
 * valeur, et conclut si elle est solution. Renvoie le bloc affiché.
 */
function afficherVerification(container, equation, valeurs) {
    const bloc = document.createElement('div');
    bloc.className = 'verification';

    const ligneMembre = (libelle, texte, valeur) => {
        const latex = formatToLatex(texte, { preserverEcriture: true });
        const resultat = nombreLatex(evaluerMembre(texte, valeur));
        const calcul = /x/.test(texte) ? `${latex} = ${remplacerX(latex, valeur)} = ${resultat}` : resultat;
        return `<div>${libelle} : \\(${calcul}\\)</div>`;
    };

    bloc.innerHTML = valeurs.map(valeurBrute => {
        const valeur = valeurBrute.simplify();
        const juste = evaluerMembre(equation.lhs, valeur).equal(evaluerMembre(equation.rhs, valeur));
        const conclusion = juste
            ? `Les deux membres sont égaux : \\(${nombreLatex(valeur)}\\) est solution.`
            : `Les deux membres sont différents : \\(${nombreLatex(valeur)}\\) n'est pas solution.`;

        return `<div class="verification-cas ${juste ? 'juste' : 'faux'}">`
            + `<div class="verification-titre">Vérification pour \\(x = ${nombreLatex(valeur)}\\)</div>`
            + ligneMembre('À gauche', equation.lhs, valeur)
            + ligneMembre('À droite', equation.rhs, valeur)
            + `<div class="verification-conclusion">${conclusion}</div>`
            + `</div>`;
    }).join('');

    container.appendChild(bloc);
    if (window.MathJax) MathJax.typesetPromise([bloc]);
    return bloc;
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
    equationAffichee = null;
    cont.innerHTML = "";

    const bloc = document.createElement('div');
    bloc.className = 'perso-saisie';

    const label = document.createElement('div');
    label.className = 'perso-label';
    label.textContent = "Équation à donner à l'élève :";

    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'perso-input';
    input.placeholder = "équation";

    const btn = document.createElement('button');
    btn.className = 'panel-btn accent';
    btn.style.width = 'auto';
    btn.textContent = "Lancer";

    const valider = () => {
        const val = input.value;
        if (!val.includes('=')) return;
        const [lhs, rhs] = val.split('=');
        const eq = new Equation(lhs, rhs);
        if (!(eq.getSolutions() || []).length) {
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

let equationAffichee = null; // équation en cours, reprise au changement de mode

/** Après un changement de mode : reprend l'équation en cours depuis le début, sans en tirer une autre. */
function reprendreEquation() {
    if (!equationAffichee) {
        demarrerQuestion();
        return;
    }
    fermerOutils();
    setupSkipButton();
    lancerResolution(equationAffichee);
}

/** Lance la résolution d'une équation donnée (perso ou générée), selon le mode de résolution courant. */
function lancerResolution(eq) {
    const cont = document.getElementById("inputContainer");
    if (!cont) return;
    equationAffichee = eq;
    cont.innerHTML = "";

    if (modeActuel !== 'libre') {
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
/**
 * Rend une expression texte en LaTeX via le module calcul-litteral.
 * Affiche la forme BRUTE telle que tapée (arbre non évalué).
 *
 * Option : preserverEcriture (défaut false)
 *   Quand true, remplace "/" par ":" avant parsing, de sorte que "30/3"
 *   reste affiché \frac{30}{3} (Quotient brut) plutôt que simplifié en 10.
 *   À utiliser en mode libre où l'élève écrit lui-même l'équation.
 *   En mode guidé, Polynome.toLatex() est utilisé directement, donc cette
 *   option n'a aucun effet sur ce mode.
 */
function formatToLatex(exprText, opts = {}) {
    // "3/4x" devient "3:4x" une fois réécrit, ce que le parseur refuse (division
    // par x) : dans ce cas on retombe sur l'écriture d'origine.
    if (opts.preserverEcriture && String(exprText).includes('/')) {
        const reecrit = String(exprText).replace(/\//g, ':');
        const rendu = formatToLatex(reecrit);
        return rendu === reecrit ? formatToLatex(exprText) : rendu;
    }
    try {
        const texte = opts.preserverEcriture
            ? String(exprText).replace(/\//g, ':')
            : exprText;
        const os = new ObjetString(texte, {});
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
    fermerOutils();
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
    // Présélection par défaut : tous les types d'équation, coefficients entiers, solution entière.
    // L'utilisateur peut décocher/recocher librement ensuite ; case vide = shuffle, comme pour le reste.
    construireBoutonsFamille("grpTypeEquation", TYPES_EQUATION, TYPES_EQUATION.map(t => t.id));
    construireBoutonsFamille("grpTypeNombre", TYPES_NOMBRE, ["Entiers"]);
    construireBoutonsFamille("grpTypeSolution", [
        { id: "entier", label: "Entier" },
        { id: "fraction", label: "Fraction" }
    ], ["entier"]);

    // Cocher un type à la main peut changer le niveau affiché à gauche.
    document.getElementById("grpTypeEquation")?.addEventListener("click", renderPanneauLateral);

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
let modeActuel = 'guide'; // 'libre' | 'accompagnee' | 'guide' — mode de RÉSOLUTION (orthogonal à l'état atelier/quiz)
let etatJeu = 'atelier'; // 'atelier' | 'quiz' — atelier : rien n'est figé, pas de comptage.
let quizDemarre = false; // true une fois qu'on a cliqué "Commencer le Quiz"
let equationPersonnaliseeActive = false; // toggle indépendant : source de l'équation (atelier uniquement)

/**
 * Point d'aiguillage central. Tient compte de trois dimensions indépendantes :
 *   - etatJeu ('atelier' | 'quiz') : si quiz et pas encore démarré, ne lance rien.
 *   - equationPersonnaliseeActive : en atelier seulement, remplace la génération
 *     aléatoire par un petit formulaire de saisie.
 *   - modeActuel ('libre' | 'accompagnee' | 'guide') : mécanique de résolution une fois l'équation choisie.
 */
function demarrerQuestion() {
    fermerOutils();
    if (etatJeu === 'quiz' && !quizDemarre) return; // rien à afficher avant le clic "Commencer"
    if (etatJeu === 'quiz' && questionCount >= 10) { showScore(); return; }

    // Le bouton Renoncer est caché par createNextBtn() une fois une équation
    // résolue ; il doit réapparaître à chaque nouvelle question.
    setupSkipButton();

    if (etatJeu === 'atelier' && equationPersonnaliseeActive) {
        demarrerSaisiePersonnalisee();
        return;
    }

    if (modeActuel !== 'libre') {
        startQuizOperationGuidee();
    } else {
        startQuiz();
    }
}

/** Installe le bouton "Nouvel onglet" dans le header : rouvre la page courante
 *  (même URL) dans un nouvel onglet, sans transmettre l'état de la partie en
 *  cours — la nouvelle page démarre sa propre question au chargement, comme
 *  dans le jeu "Le compte est bon".
 *
 *  Repli si window.open() est bloqué (ex: page intégrée dans une iframe
 *  "sandbox" sans allow-popups, comme certains exports Trinket) : window.open
 *  renvoie alors null sans lever d'erreur. On affiche dans ce cas un vrai
 *  lien <a target="_blank">, qu'un clic direct de l'utilisateur peut ouvrir
 *  même quand l'appel JS programmatique, lui, est bloqué. */
function setupBoutonNouvelOnglet() {
    const conteneur = document.getElementById("topButtonsBar");
    if (!conteneur) return;

    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btnNouvelOnglet';
    btn.className = 'btn-header';
    btn.textContent = 'Nouvel onglet';

    const repli = document.createElement('span');
    repli.id = 'repliNouvelOnglet';
    repli.style.display = 'none';
    repli.style.fontSize = '0.8em';
    repli.style.marginLeft = '8px';
    repli.innerHTML = `Bloqué ici — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

    btn.onclick = () => {
        const nouvelOnglet = window.open(window.location.href, "_blank", "noopener");
        if (!nouvelOnglet) {
            // Ouverture refusée (sandbox, bloqueur de popups...) : on affiche
            // le lien de repli plutôt que de laisser le bouton sembler ne
            // rien faire.
            repli.style.display = 'inline';
        }
    };

    conteneur.appendChild(btn);
    conteneur.appendChild(repli);
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

        panneau.appendChild(creerGroupeNiveau(equationPersonnaliseeActive));
        ajouterFilet();

        panneau.appendChild(creerGroupeMode(reprendreEquation));
        ajouterFilet();

        const skipAtelier = document.createElement('button');
        skipAtelier.id = 'skipButton';
        skipAtelier.className = 'panel-btn';
        skipAtelier.textContent = 'Renoncer';
        panneau.appendChild(skipAtelier);
        setupSkipButton();

    } else if (etatJeu === 'quiz' && !quizDemarre) {
        panneau.appendChild(creerGroupeNiveau(false));
        ajouterFilet();

        panneau.appendChild(creerGroupeMode(() => {}));
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
        panneau.appendChild(creerGroupeMode(() => {}, true));
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

/** Boutons des types d'équation dans les paramètres : ils restent la seule source de vérité. */
function boutonsTypesEquation() {
    return [...document.querySelectorAll("#grpTypeEquation .param-btn")];
}

/** Niveau correspondant exactement aux types cochés, ou null si la sélection est personnalisée. */
function niveauCourant() {
    const coches = boutonsTypesEquation().filter(b => b.classList.contains("active")).map(b => b.dataset.value);
    return NIVEAUX.find(n => n.types.length === coches.length && n.types.every(t => coches.includes(t))) || null;
}

/** Groupe « Niveau » du panneau de gauche : un clic coche les types du niveau et relance une question. */
/** Choix du mode de résolution. apresChoix est appelé quand l'élève change de mode. */
function creerGroupeMode(apresChoix, disabled = false) {
    const wrap = document.createElement('div');
    wrap.className = 'panel-groupe';

    const label = document.createElement('div');
    label.className = 'panel-groupe-label';
    label.textContent = 'Mode de résolution';

    const liste = document.createElement('div');
    liste.className = 'panel-groupe-modes';

    const modes = [['libre', 'Par saisie'], ['accompagnee', 'Saisie accompagnée'], ['guide', 'Par opération']];
    const boutons = modes.map(([mode, texte]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn' + (mode === modeActuel ? ' accent' : '');
        btn.textContent = texte;
        btn.disabled = disabled;
        btn.onclick = () => {
            if (mode === modeActuel) return;
            modeActuel = mode;
            boutons.forEach(b => b.classList.toggle('accent', b === btn));
            apresChoix();
        };
        return btn;
    });

    liste.append(...boutons);
    wrap.append(label, liste);
    return wrap;
}

function creerGroupeNiveau(disabled) {
    const wrap = document.createElement('div');
    wrap.className = 'panel-groupe';

    const label = document.createElement('div');
    label.className = 'panel-groupe-label';
    label.textContent = 'Niveau';

    const grille = document.createElement('div');
    grille.className = 'panel-groupe-niveaux';

    const actuel = niveauCourant();
    NIVEAUX.forEach(niveau => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn panel-btn-half' + (niveau === actuel ? ' accent' : '');
        btn.textContent = niveau.label;
        btn.disabled = disabled;
        btn.onclick = () => {
            boutonsTypesEquation().forEach(b => b.classList.toggle("active", niveau.types.includes(b.dataset.value)));
            renderPanneauLateral();
            demarrerQuestion();
        };
        grille.appendChild(btn);
    });

    wrap.append(label, grille);
    return wrap;
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
    setupBoutonNouvelOnglet();
    demarrerQuestion();
};