/**
 * CLASSE EQUATION : Moteur de vérification par conservation de la solution
 */
class Equation {
    constructor(lhs, rhs) {
        this.lhs = this.preparer(lhs);
        this.rhs = this.preparer(rhs);
    }

    preparer(e) {
        if (!e) return "0";
        return e.toString()
            .trim()
            // Ajoute des * entre un chiffre et une lettre (4x -> 4*x)
            .replace(/([0-9])([a-z])/gi, '$1*$2')
            // Ajoute des * entre deux parenthèses ou chiffre/parenthèse
            .replace(/([0-9a-z)])\s*\(/gi, '$1*(')
            .replace(/\)\s*([0-9a-z])/gi, ')*$1');
    }

getSolution() {
    try {
        const expr = `(${this.lhs}) - (${this.rhs})`;
        const y0 = math.evaluate(expr, { x: 0 });
        const y1 = math.evaluate(expr, { x: 1 });
        
        const pente = y1 - y0;

        // CAS : La pente est nulle (x a disparu)
        if (Math.abs(pente) < 1e-9) {
            // Si y0 est aussi 0, alors 0x + 0 = 0 -> Toujours vrai
            if (Math.abs(y0) < 1e-9) {
                // Ici, "Tout est solution", donc notre xSecret est AUSSI une solution.
                // On retourne xSecret pour que le solveur valide l'étape.
                return this.solutionCible; 
            } else {
                // Si y0 n'est pas 0 (ex: 38 = 40), c'est impossible.
                return null;
            }
        }

        // CAS NORMAL : Équation linéaire classique
        const sol = -y0 / pente;
        return sol;
    } catch (e) { 
        return null; 
    }
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

        const ok =
            sol !== null &&
            Math.abs(sol - this.solutionCible) < 1e-6;

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

        const toTex = (s) => {
            try {
                return math.parse(
                    s.replace(/([0-9])x/g, '$1*x')
                ).toTex({ implicit: 'hide' })
                 .replace(/\\cdot/g, '');
            } catch {
                return s;
            }
        };

        const left = this.wrapper.querySelector('.side-left');
        const right = this.wrapper.querySelector('.side-right');

        if (window.katex) {
            katex.render(toTex(lhs), left, { throwOnError: false });
            katex.render(toTex(rhs), right, { throwOnError: false });
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