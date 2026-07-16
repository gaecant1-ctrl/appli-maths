/**
 * CLASSE EQUATION : Moteur de vérification par conservation de la solution
 * S'appuie sur le module calcul-litteral (ObjetString/Polynome/Nombre) pour
 * un calcul exact (fractions, pas d'arrondi flottant), au lieu de math.js.
 */
class Equation {
    constructor(lhs, rhs) {
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

    /** Polynome représentant (lhs - rhs), pour comparer deux équations exactement. */
    getDiffPolynome() {
        const { polyLhs, polyRhs } = this._parsePolynomes();
        return polyLhs.sub(polyRhs);
    }

    /**
     * Calcule la solution exacte pour x (sous forme de Nombre), ou null si :
     *  - l'un des membres ne parse pas,
     *  - l'équation n'est pas du premier degré (lhs - rhs non affine),
     *  - le coefficient de x est nul (pas de solution unique, ex: "x disparu").
     */
    getSolution() {
        try {
            const diff = this.getDiffPolynome(); // lhs - rhs = 0
            return diff.getSolution(); // Nombre exact, ou null si non affine / a=0
        } catch (e) {
            return null;
        }
    }
}

/**
 * Rend une expression texte en LaTeX via le module calcul-litteral (forme
 * brute telle que tapée, arbre non évalué) — remplace l'ancien math.parse().toTex().
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
/**
 * CLASSE INPUTWRAPPER : Gère l'affichage d'une ligne (Saisie ou KaTeX)
 */
class InputWrapper {
    constructor(solutionCible, container, ui = {}, isFirst = false, solveur = null) {
        this.solutionCible = solutionCible;
        this.container = container;

        this.ui = ui;
        this.solveur = solveur;
        this.isFinal = false;
        

        this.wrapper = document.createElement('div');
        this.wrapper.className = 'capsule-wrapper';

        this.wrapper.innerHTML = `
            <div class="empty-zone"></div>
            <div class="side-left"></div>
            <div class="symbol-zone">=</div>
            <div class="side-right"></div>
            <div class="feedback-zone"></div>
        `;

        this.container.appendChild(this.wrapper);
        this.renderInput(isFirst);
    }

    renderInput(isFirst) {
        this.wrapper.classList.add('mode-saisie');

        this.input = document.createElement('input');
        this.input.className = 'input-full';
        this.input.placeholder = isFirst
            ? "Écris l'équation ici..."
            : "Étape suivante...";

        this.wrapper.querySelector('.side-left')
            .appendChild(this.input);

        if (!isFirst) {
            setTimeout(() => this.input.focus(), 50);
        }

        this.input.addEventListener('keydown', (e) => {
            if (e.key === "Enter") {
                const saisie = this.input.value.trim();
                if (!saisie.includes('=')) return;
                this.valider();
            }
        });
    }

    valider() {
        const [lhs, rhs] = this.input.value.split('=');

        const eq = new Equation(lhs, rhs);
        const sol = eq.getSolution();

        const cible = Nombre.fromParts(this.solutionCible, 1, "entier");
        const ok = sol !== null && sol.equal(cible);

        if (!ok) {
            this.figer(lhs, rhs);
            this.wrapper.classList.add('capsule-error');

            const btnDelete = document.createElement('span');
            btnDelete.innerHTML = "❌";
            btnDelete.className = "btn-supprimer";

            btnDelete.onclick = () => {
                this.wrapper.remove();
                this.solveur?.afficherFeedback("reprend");

                if (!this.container.querySelector('input')) {
                    new InputWrapper(
                        this.solutionCible,
                        this.container,
                        this.ui,
                        true,
                        this.solveur
                    );
                }
            };

            this.wrapper.querySelector('.feedback-zone')
                .appendChild(btnDelete);

            this.solveur?.afficherFeedback("ko");
            return;
        }

        this.figer(lhs, rhs);

        const fini =
            lhs.trim().toLowerCase() === 'x' ||
            rhs.trim().toLowerCase() === 'x';

        if (!fini) {
            this.wrapper.querySelector('.feedback-zone').innerHTML = "✅";

            this.solveur?.afficherFeedback("continue");

            new InputWrapper(
                this.solutionCible,
                this.container,
                this.ui,
                false,
                this.solveur
            );
        } else {
            this.solveur?.setFinalState?.(true);
this.solveur?.afficherFeedback("ok");
this.solveur?.onComplete?.();

           
        }
    }

    figer(lhs, rhs) {
        this.wrapper.classList.remove('mode-saisie');
        this.input?.remove();

        const left = this.wrapper.querySelector('.side-left');
        const right = this.wrapper.querySelector('.side-right');

        if (window.katex) {
            katex.render(formatToLatex(lhs), left, { throwOnError: false });
            katex.render(formatToLatex(rhs), right, { throwOnError: false });
        } else {
            left.textContent = lhs;
            right.textContent = rhs;
        }
    }
}

/**
 * CLASSE SOLVEUR : Point d'entrée pour pas.js
 */
class Solveur {
    constructor(containerId, ui = {}) {
        this.container = document.getElementById(containerId);
        this.xSecret = null;

        // UI optionnelle
        this.ui = ui;
            this.feedback = (msg, type = "neutral") => {
        if (this.ui?.feedback) {
            this.ui.feedback(msg, type, "Solveur");
        }
    };
        this.onComplete = null;
        this.isFirstStep = true;
    }

init(xSecret) {
    this.xSecret = xSecret;
    this.container.innerHTML = "";

    this.isFirstStep = true;

    new InputWrapper(
        this.xSecret,
        this.container,
        this.ui,
        true,
        this
    );

    this.container.classList.remove("actif");
}

afficherFeedback(type) {
    const fb = this.feedback;
    if (!fb) return;

    if (type === "continue") {
        if (this.isFirstStep) {
            fb("✔ L'équation est bonne.", "success");
            this.isFirstStep = false;
        } else {
            fb("✔ L'égalité est conservée. Continue.", "success");
        }
    }

    if (type === "reprend") {
        if (this.isFirstStep) {
        fb("Donne la bonne équation. ", "neutral");
        }
        else{
        fb("Continue ! ", "neutral");
        }

    }

    if (type === "ok") {
        fb("🎉 Bravo ! L'égalité est conservée jusqu'au bout.", "success");
    }

    if (type === "ko") {
        fb("❌ L'égalité n'est pas correcte pour notre valeur de x.", "error");
    }
}

    reset() {
        const input = this.container.querySelector('input');
        if (input) input.value = "";
    }

    setFinalState(value) {
    if (!value) return;

    const wrappers = this.container.querySelectorAll('.capsule-wrapper');

    wrappers.forEach(w => {
        w.classList.add('capsule-final');
        const fb = w.querySelector('.feedback-zone');
        if (fb) fb.innerHTML = "✨";
    });
}
}

window.Solveur = Solveur;