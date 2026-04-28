/**
 * CLASSE EXPRESSION : Moteur de calcul et de comparaison
 */
class Expression {
    constructor(rawInput) {
        this.raw = rawInput.trim().replace(/\s+/g, '');
        this.maxLength = 7; // Augmenté légèrement pour plus de souplesse

        this.isValid = false;
        this.isReduced = false;
        this.error = null;

        this.coeffX = 0;
        this.const = 0;
   
        this.parse();
    }

parse() {
    if (!this.raw) {
        this.error = "Vide";
        return;
    }

    try {
        // 1. VALIDATIONS DE STRUCTURE (SANS LONGUEUR POUR L'INSTANT)
        if (!/^[0-9x+\-]+$/.test(this.raw)) { 
            this.error = "Caractères interdits"; 
            throw 0; 
        }
        
        // Signes consécutifs, finit par un signe, ou x suivi d'un chiffre
        if (/[\+\-]{2,}/.test(this.raw) || /[\+\-]$/.test(this.raw) || /x[0-9]/.test(this.raw)) {
            this.error = "Syntaxe";
            throw 0;
        }
        
        // Doit contenir au moins un chiffre ou un x
        if (!/[0-9x]/.test(this.raw)) { 
            this.error = "Syntaxe"; 
            throw 0; 
        }

        // 2. EXTRACTION DES TERMES ET CALCUL DES COEFFICIENTS
        const termRegex = /([+\-]?[0-9]*x?)/g;
        const matches = this.raw.match(termRegex).filter(m => m !== "");

        let tempCoeffX = 0;
        let tempConst = 0;

        for (let term of matches) {
            if (term === "x" || term === "+x") {
                tempCoeffX += 1;
            } else if (term === "-x") {
                tempCoeffX -= 1;
            } else if (term.includes("x")) {
                const numPart = term.replace("x", "");
                const val = parseInt(numPart);
                if (isNaN(val)) { this.error = "Syntaxe"; throw 0; }
                tempCoeffX += val;
            } else {
                const val = parseInt(term);
                if (isNaN(val)) { this.error = "Syntaxe"; throw 0; }
                tempConst += val;
            }
        }

        // Attribution des valeurs calculées
        this.coeffX = tempCoeffX;
        this.const = tempConst;
        this.isValid = true;
        this.error = null;

        // 3. VÉRIFICATION DE LA RÉDUCTION
        this.isReduced = this.checkReduced();

        // 4. PROTECTION INTELLIGENTE DE LA LONGUEUR
        // On ne bloque par la longueur QUE SI l'expression n'est pas réduite.
        // Si c'est réduit (ex: "150x-200"), on laisse passer même si c'est long.
        if (!this.isReduced && this.raw.length > this.maxLength) {
            this.error = "Trop long";
            this.isValid = false; // On invalide pour forcer l'élève à réduire
            throw 0;
        }

    } catch (e) {
        this.isValid = false;
        if (!this.error) this.error = "Syntaxe";
        this.coeffX = 0;
        this.const = 0;
    }
}

    checkReduced() {
        if (!this.isValid) return false;

        // On sépare proprement pour compter les blocs
        const normalized = this.raw.replace(/-/g, "+-");
        const terms = normalized.split("+").filter(Boolean);

        let xBlocks = 0;
        let constBlocks = 0;

        for (let t of terms) {
            if (t.includes("x")) xBlocks++;
            else constBlocks++;
        }

        // Réduit ssi max 1 bloc de chaque type (ex: x+1 est réduit, x+x+1 non)
        return xBlocks <= 1 && constBlocks <= 1;
    }

    getFeedback() {
        // Cas 1 : L'entrée est vide
        if (this.error === "Vide") {
            return { msg: "Remplis le champ.", type: "neutral" };
        }

        // Cas 2 : Erreurs de validation
        if (!this.isValid) {
            switch (this.error) {
                case "Trop long":
                    return { msg: "Expression trop longue.", type: "error" };
                case "Caractères interdits":
                    return { msg: "Caractères non autorisés.", type: "error" };
                default:
                    return { msg: "Syntaxe incorrecte.", type: "error" };
            }
        }

        // Cas 3 : Non réduit (ex: x+x ou 2+3)
        if (!this.isReduced) {
            return { msg: "L'expression n'est pas réduite.", type: "error" };
        }

        // Cas 4 : Tout est OK
        return { msg: "Expression correcte.", type: "success" };
    }

    evaluate(x) {
        return this.isValid ? this.coeffX * x + this.const : NaN;
    }

    static sontEquivalentes(expC, expA, expB) {
        if (!expC?.isValid || !expA?.isValid || !expB?.isValid) return false;
        return (
            expC.coeffX === expA.coeffX + expB.coeffX &&
            expC.const === expA.const + expB.const
        );
    }
}

/**
 * CLASSE CASE : Gestion de l'unité brique (DOM et État)
 */
class Case {
constructor(id, dom, ui = {}) {
    this.id = id;
    this.dom = dom;
    this.ui = ui;


    this.feedback = (msg, type = "neutral") => {
        if (this.ui?.feedback) {
            this.ui.feedback(msg, type, "Case");
        }
    };
    
    // Contenu et données mathématiques
    this.content = "";
    this.aff="";
    this.affMode=true;
    this.expression = null;
    this.variable = null; 
    this.lastInput = "";

    // États de validation
    this.status = "vide";     // "vide", "reduit", "a-reduire", "erreur"
    this.isEditing = false;

    // États structurels (Pilotés par la Pyramide / updateLogic)
    this.isLocked = false;            // Fixé au départ (briques de base)
    this.isPermanentlyLocked = false; // Verrouillé car l'exercice est fini/réussi
    this.isScelled = false;           // Bloqué mathématiquement (ne peut plus changer)
    this.isAbsolute = false;          // Cas particulier de valeur ou de calcul
}

    activerSaisie(pyramide) {

        if (this.isLocked || this.isPermanentlyLocked) return;

        this.feedback("Complète les briques", "neutral");

        this.isEditing = true;
this.render(); 
        
const input = this.dom.querySelector('input');
if (!input) return;

setTimeout(() => input.focus(), 0);

const tenterValidation = (isBlur = false) => {
    if (!this.isEditing) return;

    const saisie = input.value.trim();

    if (saisie === "") {
        this.resetCell(pyramide);
        return;
    }

    const exp = new Expression(saisie);

    // CAS SYNTAXE INVALIDE
    if (!exp.isValid) {
        if (isBlur) {
            this.resetCell(pyramide, true); 
        } else {
            this.status = "erreur";
            console.log("CASE FEEDBACK CALL", exp.getFeedback().msg, this.ui);
            this.feedback(exp.getFeedback().msg, "error");
            this.render();
        }
        return;
    }

    // CAS VALIDE MAIS NON RÉDUIT
    if (!exp.isReduced) {
        this.content = saisie;
        this.expression = exp;
        this.status = "a-reduire";
        this.isEditing = false; 

        const feedback = exp.getFeedback();

        this.cloreSaisie(pyramide, false); 

        setTimeout(() => {
            this.feedback(feedback.msg, "error");
        }, 0);

        return; // 🔥 IMPORTANT
    }

    // CAS VALIDE ET RÉDUIT
    this.content = saisie;
    this.expression = exp;
    this.status = "reduit";
    this.isEditing = false;

    this.cloreSaisie(pyramide, true);
};

        input.onkeydown = (e) => {
            if (e.key === "Enter") tenterValidation(false);
            if (e.key === "Escape") {
    this.isEditing = false;
    this.render();
}
        };

        input.onblur = () => {
            tenterValidation(true);
        };
    }

resetCell(pyramide, silent = false) {
    this.content = "";
    this.expression = null;
    this.status = "vide";
    this.isEditing = false;
    this.cloreSaisie(pyramide, !silent);
}

cloreSaisie(pyramide, nettoyerFeedback = true) {
    if (nettoyerFeedback) {
        this.feedback("Complète les briques", "neutral");
    }
    
    pyramide.setSelectedBrique(null);
    pyramide.updateLogic(); // C'est ici que render() est appelé pour chaque case

}

render() {
    // 1. PROTECTION : Si l'utilisateur est en train de taper dans un input, 
    // on ne redessine rien pour ne pas perdre le focus ou le texte.
    if (this.isEditing && this.dom.querySelector('input')) {
        return;
    }


    // 2. ÉTATS VISUELS (CSS)
    // On garde la classe de base
    this.dom.classList.add("brique");

    // On synchronise les classes CSS avec les propriétés de l'objet
    this.dom.classList.toggle('active-focus', this.isEditing);
    this.dom.classList.toggle('scellee', this.isScelled);      // Réintroduit
    this.dom.classList.toggle('etat-absolu', this.isAbsolute); // Réintroduit
    this.dom.classList.toggle('termine', this.isPermanentlyLocked);
    // On gère les statuts de validation (nettoyage des anciens, ajout du nouveau)
    const statutsPossibles = ["vide", "reduit", "a-reduire", "erreur"];
    statutsPossibles.forEach(s => this.dom.classList.remove(s));
    if (this.status) {
        this.dom.classList.add(this.status);
    }

    // 3. CONTENU (DOM)
    if(!this.affMode){this.dom.innerHTML = "";}else{katex.render(this.aff, this.dom, {
                    throwOnError: false
                });}

    if (this.isEditing) {
        // Mode Saisie : on génère l'input
        const input = document.createElement("input");
        input.value = this.content;
        this.dom.innerHTML="";
        this.dom.appendChild(input);
        // Note : le .focus() est géré par activerSaisie juste après l'appel au render
    } else {
        // Mode Affichage : KaTeX ou Vide
        if (this.expression && this.expression.isValid) {
            try {
                katex.render(this.expression.raw, this.dom, {
                    throwOnError: false
                });
            } catch (e) {
                this.dom.textContent = this.expression.raw;
            }
        }
    }
}
}

/**
 * CLASSE PYRAMIDE : Moteur de propagation et de validation
 */
class Pyramide {
    constructor(n, containerId, type="numeric", ui = {}) {
        this.n = n;
        this.containerId = containerId;
        this.grid = [];
        this.type=type;
        this.ui = ui;
        this.initDOM();
        // 🔥 CALLBACK EXTERNE
            

    this.feedback = (msg, type = "neutral") => {
        if (this.ui?.feedback) {
            this.ui.feedback(msg, type, "Pyramide");
        }
    };
        this.onComplete = null;
      

    }

    initDOM() {
        const container = document.getElementById(this.containerId);
        if (!container) return;
        container.innerHTML = "";
        for (let i = 0; i < this.n; i++) {
            this.grid[i] = [];
            const ligneDiv = document.createElement("div");
            ligneDiv.className = "ligne";
            for (let j = 0; j < this.n - i; j++) {
                const div = document.createElement("div");
                const c = new Case(
    `${this.containerId}-${i}-${j}`,
    div,
    this.ui
);

                div.onmousedown = (e) => {
    // Empêche des comportements bizarres de sélection de texte
    // e.preventDefault(); 
    
    this.feedback("", "neutral");
    c.activerSaisie(this);
};


                


                this.grid[i][j] = c;
                ligneDiv.appendChild(div);
            }
            container.prepend(ligneDiv);
        }
    }



updateLogic() {
    // 1. ANALYSE DE LA COHÉRENCE DE LA BASE (Variables identiques)
    const baseBriques = this.grid[0];
    const variableMap = {};
    const variablesIncoherentes = new Set();
    let feedbackMsg = null;
    let feedbackType = null;

    baseBriques.forEach(c => {
        if (c.variable && c.expression && c.expression.isValid) {
            const val = c.expression.raw;
            if (variableMap[c.variable] !== undefined && variableMap[c.variable] !== val) {
                variablesIncoherentes.add(c.variable);
            } else {
                variableMap[c.variable] = val;
            }
        }
    });

    // =========================
    // RESET isAbsolute dynamique
    // =========================
    this.grid.forEach(ligne => {
        ligne.forEach(c => {
            c._newAbsolute = false;
        });
    });

    // =========================
    // 2. PARCOURS GRILLE (logique existante + ABS)
    // =========================
    this.grid.forEach((ligne, i) => {
        ligne.forEach((c, j) => {
            const exp = c.expression;
            const estValideEtReduit = exp && exp.isValid && exp.isReduced;

            // -------------------------
            // ÉTAGE 0 (BASE)
            // -------------------------
            if (i === 0) {
                const estCoherent = !c.variable || !variablesIncoherentes.has(c.variable);

                c.isScelled = estValideEtReduit && estCoherent;

                if (!exp) {
                    c.status = "vide";
                } else if (!exp.isValid) {
                    c.status = "erreur";
                } else if (!estCoherent) {
                    c.status = "erreur";
                    feedbackMsg = `Les cases ${c.variable} doivent avoir la même valeur.`;
                    feedbackType = "error";
                } else {
                    c.status = estValideEtReduit ? "reduit" : "a-reduire";
                }
            }

            // -------------------------
            // AUTRES ÉTAGES
            // -------------------------
            else {
                const a = this.grid[i - 1][j];
                const b = this.grid[i - 1][j + 1];

                const fondationsScellees = a.isScelled && b.isScelled;

                if (!estValideEtReduit) {
                    c.isScelled = false;
                    if (!c.isLocked) c.isAbsolute = false;
                } else {

                    const mathOK = Expression.sontEquivalentes(
                        c.expression,
                        a.expression,
                        b.expression
                    );

                    if (mathOK) {

                        c.isScelled = fondationsScellees;

                        // =========================
                        // RÈGLE ABSOLUE (TA LOGIQUE)
                        // =========================
                        const absCount =
                            (a.isAbsolute ? 1 : 0) +
                            (b.isAbsolute ? 1 : 0) +
                            (c.isAbsolute ? 1 : 0);

                        if (absCount >= 2) {
                            a.isAbsolute = true;
                            b.isAbsolute = true;
                            c.isAbsolute = true;
                            a.render();b.render();
                        }

                    } 
                    else {
                        c.isScelled = false;

                        if (!c.isLocked) c.isAbsolute = false;

                        if (
                            !c.isLocked &&
                            a.status == "reduit" &&
                            b.status == "reduit"
                        ) {
                            c.status = "erreur";
                        }
                    }

                }
            }
            c.render();
        });
    });



    // =========================
    // FIN
    // =========================
    if (this.estPyramideComplete()) {
        this.finaliser("Pyramide complète !");

        if (typeof this.onComplete === "function") {
            this.onComplete(this.type);
        }
    }

    if (feedbackMsg) {
        this.feedback(feedbackMsg, feedbackType);
    }
}

setBrique(i, j, content, isLocked = false, variable = null,aff="",affMode=true) {
    const c = this.grid[i][j];
    if (!c) return;
    c.affMode=affMode;
    c.aff=aff;
    c.content = content;
    c.variable = variable;
    c.isLocked = isLocked;
    
    // RÈGLE : isAbsolute ne bouge plus, c'est le marqueur de l'énoncé
    c.isAbsolute = isLocked; 
    
    // RÈGLE : isScelled est géré par updateLogic (sauf pour la base locked)
    c.isScelled = (i === 0 && isLocked); 
    
    c.isPermanentlyLocked = false; 

    if (content !== "") {
        c.expression = new Expression(content);
        c.status = isLocked ? "reduit" : "a-reduire";
    } else {
        c.expression = null;
        c.status = "vide";
    }

    c.render();
}

setSelectedBrique(briqueActive) {
    // reset visuel global
    this.grid.flat().forEach(c => {
        c.dom.classList.remove("brique-selected");
    });

    this.selectedBrique = briqueActive || null;

    if (briqueActive) {
        briqueActive.dom.classList.add("brique-selected");
    }
}

estPyramideComplete() {
    // On parcourt chaque brique de la grille
    for (let i = 0; i < this.n; i++) {
        for (let j = 0; j < this.n - i; j++) {
            const brique = this.grid[i][j];

            // RÈGLE SIMPLE : 
            // Si une brique n'est pas scellée, la pyramide n'est pas finie.
            // Cela couvre : les briques vides, les erreurs et les non-réduits.
            if (!brique.isScelled) {
                return false; 
            }
        }
    }

    // Si on arrive ici, c'est qu'on a scanné TOUTES les briques 
    // et qu'elles sont TOUTES isScelled.
    return true;
}

/**
 * Finalise la pyramide en figeant tout l'état visuel et mathématique.
 * @param {string} messageSucces - Le message à afficher dans le feedback.
 */
finaliser(messageSucces) {
    this.grid.flat().forEach(c => {
        c.isAbsolute = true;
        c.isScelled = true;
        c.isPermanentlyLocked = true;
        c.status = "reduit";
        c.render();
    });

    // 🔥 FEEDBACK FINAL GLOBAL

        this.feedback(messageSucces, "success", this.containerId);
}



    reset() {
        this.grid.flat().forEach(c => {
            c.content = ""; c.expression = null; c.variable = null;
            c.isLocked = false; c.isAbsolute = false; c.isScelled = false;
            c.isPermanentlyLocked = false;
            c.status = "vide"; c.render();
        });
    }
}






// Initialisation
/**
 * FONCTION GLOBALE : Génère un niveau selon la difficulté
 * On la sort du onload pour qu'elle soit visible par le HTML
 */
// Fonction pour changer l'état visuel et le texte des boutons

class App {
constructor(n,ui = {}) {
    this.n = n;
    this.state = "INIT";

    this.ui = ui;

    this.feedback = (msg, type = "neutral") => {
        if (this.ui?.feedback) {
            this.ui.feedback(msg, type, "App");
        }
    };

    this.settings = {
        relatifs: false,
        grands: false
    };

    this.progress = {
    litteral: false,
    solveur: false,
    numerique: false
};

    this.init();
}

    init() {
        // Injection contrôlée des composants
    this.pyrEq = new Pyramide(
        this.n,
        "container-equation",
        "litteral",
        this.ui
    );

    this.pyrVerif = new Pyramide(
        this.n,
        "container-verif",
        "numeric",
        this.ui
    );


    this.solveur = new Solveur("solveur-espace", this.ui);


    this.solveur.onComplete = () => {
        this.progress.solveur = true;
        
        // On active visuellement la dernière zone si ce n'est pas déjà fait
        document.getElementById("container-verif-zone")?.classList.add("actif");

        this.feedback(`L'équation est résolue ! Maintenant, vérifie ta valeur dans la pyramide numérique.`, "success");
        
        // On vérifie si par hasard tout est fini (peu probable ici)
        this.checkFin();
    };

    this.pyrVerif.onComplete = (type) => {
        // Note : Ton code avait un test "if type !== litteral", c'est correct
        this.progress.numerique = true;
        this.feedback("Vérification numérique terminée !", "success");
        this.checkFin();
    };


    this.pyrEq.onComplete = (type) => {
        if (type !== "litteral") return;

        this.progress.litteral = true;

        document.getElementById("solveur-espace")
            ?.classList.add("actif");

        this.feedback(
            "Pyramide validée → résoudre l'équation",
            "success"
        );
    };


        this.newLevel();
    }

        getConfig() {
        return {
            n: this.n,
            range: this.settings.grands ? 50 : 10,
            min: this.settings.grands ? 10 : 1,
            relatifs: this.settings.relatifs
        };
    }

    // =========================
    // 🔁 CYCLE DE JEU
    // =========================

    newLevel() {

    // =========================
    // RESET UI GLOBAL
    // =========================
    document.querySelectorAll(".zone-jeu").forEach(z => {
        z.classList.remove("gold", "actif", "complete");
    });

    // =========================
    // PATTERN + SECRET
    // =========================
    const pattern = this.getPattern();

    const xSecret = this.randomNumber(
        this.settings.grands ? 10 : 1,
        this.settings.grands ? 50 : 10,
        this.settings.relatifs
    );

    // =========================
    // BUILD LEVEL
    // =========================
    this.applyPattern(pattern, xSecret);
}





getPattern() {
    const classicPatterns = [
        [["x","*","*","*"], ["?","?","?"], ["?","?"], ["S"]],
        [["*","x","*","*"], ["?","?","?"], ["?","?"], ["S"]],
        [["x","x","*","*"], ["?","?","?"], ["?","?"], ["S"]],
        [["x","*","x","*"], ["?","?","?"], ["?","?"], ["S"]],
        [["x","*","*","x"], ["?","?","?"], ["?","?"], ["S"]],
        [["*","x","x","*"], ["?","?","?"], ["?","?"], ["S"]],
        [["x","x","x","*"], ["?","?","?"], ["?","?"], ["S"]],
        [["x","x","*","x"], ["?","?","?"], ["?","?"], ["S"]],
        [["x","x","x","x"], ["?","?","?"], ["?","?"], ["S"]]
    ];

    const patterns = [
        [["x", "?", "?", "x"], ["*", "?", "*"], ["?", "?"], ["S"]],
        [["x", "x", "?", "x"], ["?", "?", "?"], ["*", "?"], ["S"]],
        [["x", "x", "?", "*"], ["?", "?", "?"], ["*", "?"], ["S"]],
        [["x", "*", "?", "*"], ["?", "?", "?"], ["*", "?"], ["S"]],
        [["*", "x", "?", "*"], ["?", "?", "?"], ["*", "?"], ["S"]],
        [["*", "x", "?", "x"], ["?", "?", "?"], ["*", "?"], ["S"]],
        [["x", "*", "?", "x"], ["?", "?", "?"], ["*", "?"], ["S"]],
        [["x", "?", "x", "x"], ["?", "*", "?"], ["?", "?"], ["S"]],
        [["*", "?", "x", "*"], ["?", "*", "?"], ["?", "?"], ["S"]],
        [["x", "?", "x", "*"], ["?", "*", "?"], ["?", "?"], ["S"]],
        [["*", "?", "x", "x"], ["?", "*", "?"], ["?", "?"], ["S"]],
    ];

    // Sélection aléatoire initiale
    let selected;
    if (Math.random() < 0.5) {
        selected = classicPatterns[Math.floor(Math.random() * classicPatterns.length)];
    } else {
        selected = patterns[Math.floor(Math.random() * patterns.length)];
    }

    // 50% de chance d'appliquer la symétrie
    if (Math.random() < 0.5) {
        // La fonction map() crée un nouveau tableau pour éviter de modifier les constantes
        return selected.map(row => [...row].reverse());
    }

    return selected;
}

buildGrid(pattern, xSecret) {

    const grid = [];

    for (let i = 0; i < pattern.length; i++) {

        const row = pattern[i];
        const builtRow = [];

        for (let j = 0; j < row.length; j++) {

            const role = row[j];

            if (role === "x") {
                builtRow.push({
                    motif: "x",
                    value: xSecret
                });
            }

            else if (role === "*") {
                builtRow.push({
                    motif: "*",
                    value: this.randomNumber(
                        this.settings.grands ? 10 : 1,
                        this.settings.grands ? 50 : 10,
                        this.settings.relatifs
                    )
                });
            }

            else if (role === "?") {
                builtRow.push({
                    motif: "?",
                    value: this.randomNumber(
                        this.settings.grands ? 10 : 1,
                        this.settings.grands ? 50 : 10,
                        this.settings.relatifs
                    )
                });
            }

            else if (role === "S") {
                builtRow.push({
                    motif: "S",
                    value: null
                });
            }

            else {
                builtRow.push({
                    motif: role,
                    value: null
                });
            }
        }

        grid.push(builtRow);
    }

    // =========================
    // calcul des valeurs des étages
    // =========================
    for (let i = 1; i < grid.length; i++) {

        for (let j = 0; j < grid[i].length; j++) {

            const a = grid[i - 1][j];
            const b = grid[i - 1][j + 1];

            grid[i][j].value = a.value + b.value;
        }
    }

    return grid;
}



applyPattern(pattern, xSecret) {

    this.xSecret = xSecret;

    this.pyrEq.reset();
    this.pyrVerif.reset();

    const grid = this.buildGrid(pattern, xSecret);



    const rows = grid.length;

    // =========================
    // PARCOURS COMPLET GRILLE
    // =========================
    for (let i = 0; i < rows; i++) {

        const row = grid[i];
        const cols = row.length;

        for (let j = 0; j < cols; j++) {

            const cell = row[j];

            // =========================
            // LITTÉRAL
            // =========================
            let litContent;

            if (cell.motif === "x") litContent = "x";
            else if (cell.motif === "*") litContent = String(cell.value);
            else if (cell.motif === "?") litContent = "";
            else if (cell.motif === "S") litContent = "";
            else litContent = "";

            this.pyrEq.setBrique(
                i,
                j,
                litContent,
                cell.motif === "*" || cell.motif === "x",
                cell.motif === "x" ? "x" : null,
                "",
                false
            );

            // =========================
            // NUMÉRIQUE
            // =========================
            let numContent;

            if (cell.motif === "*") numContent = String(cell.value);
            else if (cell.motif === "x") numContent = "";
            else if (cell.motif === "?") numContent = "";
            else if (cell.motif === "S") numContent = String(cell.value);
            else numContent = "";

            this.pyrVerif.setBrique(
                i,
                j,
                numContent,
                cell.motif === "*"|| cell.motif === "S",
                cell.motif === "x" ? "x" : null,
                cell.motif,
                true
            );
        }
    }

    this.solveur.init(xSecret);
}    // =========================
    // 🎲 GÉNÉRATION PURE
    // =========================

generateConfig() {
    const cfg = this.getConfig();

    let base = Array.from({ length: this.n }, () => {
        if (Math.random() < 0.5) return 'x';

        return this.randomNumber(
            cfg.min,
            cfg.range,
            cfg.relatifs
        );
    });

    // 🔥 GARANTIE : au moins 1 x
    if (!base.includes('x')) {
        const index = Math.floor(Math.random() * this.n);
        base[index] = 'x';
    }

    const xSecret = this.randomNumber(
        cfg.min,
        cfg.range,
        cfg.relatifs
    );

    return { base, xSecret };
}

    randomNumber(min, max, relatifs) {
        let v = Math.floor(Math.random() * (max - min + 1)) + min;

        if (relatifs && Math.random() > 0.5) {
            v *= -1;
        }

        return v === 0 ? 1 : v;
    }





    // =========================
    // ⚙️ SETTINGS (pilotés par UI)
    // =========================

    setRelatifs(value) {
        this.settings.relatifs = value;
    }

    setGrands(value) {
        this.settings.grands = value;
    }


checkFin() {
    // On ne finit QUE si les trois piliers sont à true
    const estFini = this.progress.litteral && 
                    this.progress.solveur && 
                    this.progress.numerique;

    if (estFini) {
        this.finPartie();
    }
}

finPartie() {
    this.feedback("Exercice terminé 🎉", "success");


    document.querySelectorAll(".zone-jeu")
        .forEach(z => z.classList.add("gold"));
}

}


window.settings = {
    relatifs: false,
    grands: false
};


window.toggleState = function(btn) {
    const active = btn.getAttribute('data-active') === 'true';
    const newState = !active;
    btn.setAttribute('data-active', newState);

    if (window.instanceApp) {
        if (btn.id === 'toggle-relatifs') {
            window.instanceApp.setRelatifs(newState);
            btn.textContent = newState ? "Nombres : Relatifs" : "Nombres : Positifs";
        }

        if (btn.id === 'toggle-grands') {
            window.instanceApp.setGrands(newState);
            btn.textContent = newState ? "Taille : Grands" : "Taille : Petits";
        }
    }
};

window.nouvelExercice = function() {
    window.instanceApp.newLevel();
};



/**
 * INITIALISATION AU CHARGEMENT
 */
// Dans ton window.onload
window.onload = () => {
    // Une seule instance globale pour tout l'exercice
    window.instanceApp = new App(4, {
    feedback: window.updateGlobalFeedback
});
};


window.updateGlobalFeedback = function(msg, type = "neutral", source = "unknown") {
    if (!msg) return;

    const fb = document.getElementById("feedback");
    if (!fb) return;

    fb.textContent = msg;
    fb.className = `feedback-${type}`;

    fb.style.animation = 'none';
    fb.offsetHeight;
    fb.style.animation = 'pulseText 0.4s ease';

};


