
class Grille {
    constructor(divId) {
        this.rows = 5;
        this.cols = 5;
        this.cellSize = 50;
        this.generation = 0; // incrémenté par vider() : une chute en cours est alors abandonnée
        this.divId = divId;
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.phantomGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.montrerErreurs = false; // après une mission ratée : jetons faux et manquants entourés
        this.injectCSS();

        this.container = document.getElementById(divId);
        
        this.container.style.position = "relative";
        this.container.style.width = `${this.cols * this.cellSize}px`;
        this.container.style.height = `${this.rows * this.cellSize + 40}px`;
        this.container.style.margin = "10px auto 0";

        this.tokensCanvas = document.createElement("canvas");
        this.gridCanvas = document.createElement("canvas");

        this.tokensCanvas.width = this.gridCanvas.width = this.cols * this.cellSize;
        this.tokensCanvas.height = this.gridCanvas.height = this.rows * this.cellSize + 40;

        this.container.appendChild(this.tokensCanvas);
        this.container.appendChild(this.gridCanvas);

        this.tokensCtx = this.tokensCanvas.getContext("2d");
        this.gridCtx = this.gridCanvas.getContext("2d");

        this.drawGrid();
    }

    injectCSS() {
        const style = document.createElement("style");
        style.innerHTML = `
            #${this.divId} canvas { position: absolute; top: 0; left: 0; border-radius: 20px;} /* Arrondi des bords */

        `;
        document.head.appendChild(style);
    }

drawGrid() {
    const ctx = this.gridCtx;
    ctx.clearRect(0, 0, this.gridCanvas.width, this.gridCanvas.height);
    
    // 🔵 Fond de la grille
    ctx.fillStyle = "#457b9d"; 
    ctx.fillRect(0, 0, this.cols * this.cellSize, this.rows * this.cellSize);

    // 🕳️ Contours des trous pour plus de relief
    ctx.globalCompositeOperation = "destination-out";
    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            const x = c * this.cellSize + this.cellSize / 2;
            const y = r * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize / 2.5;

            // Trou (effacement)
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    ctx.globalCompositeOperation = "source-over";

    // 🔘 Ajout du contour des trous
    ctx.strokeStyle = "rgba(0, 0, 0, 0.3)"; // Gris foncé semi-transparent
    ctx.lineWidth = 3;
    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            const x = c * this.cellSize + this.cellSize / 2;
            const y = r * this.cellSize + this.cellSize / 2;
            const radius = this.cellSize / 2.5;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.stroke();
        }
    }

    // 🔸 Base numérotée
    ctx.fillStyle = "#f4a261"; 
    ctx.fillRect(0, this.rows * this.cellSize, this.cols * this.cellSize, 40);

    ctx.fillStyle = "#264653"; 
    ctx.font = "bold 20px Arial";
    ctx.textAlign = "center";
    for (let c = 0; c < this.cols; c++) {
        ctx.fillText(c + 1, c * this.cellSize + this.cellSize / 2, this.rows * this.cellSize + 25);
    }
}


drawTokens() {
    const ctx = this.tokensCtx;
    ctx.clearRect(0, 0, this.tokensCanvas.width, this.tokensCanvas.height);

    // 🔹 Dessiner la situation fantôme avec opacité réduite
    ctx.globalAlpha = 0.3; // Réduire l'opacité
    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            if (this.phantomGrid && this.phantomGrid[r][c]) {
                ctx.fillStyle = this.getModernColor(this.phantomGrid[r][c]); // 🎨 Couleurs modernes
                ctx.beginPath();
                ctx.arc(c * this.cellSize + this.cellSize / 2, r * this.cellSize + this.cellSize / 2, this.cellSize / 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // 🔹 Dessiner les jetons réels par-dessus (opacité normale)
    ctx.globalAlpha = 1.0;
    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            if (this.grid[r][c]) {
                ctx.fillStyle = this.getModernColor(this.grid[r][c]); // 🎨 Couleurs modernes
                ctx.beginPath();
                ctx.arc(c * this.cellSize + this.cellSize / 2, r * this.cellSize + this.cellSize / 2, this.cellSize / 2.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // 🔹 Erreurs : cercle en pointillés dans chaque case différente du modèle
    // (dans le trou : la grille bleue est dessinée par-dessus les jetons)
    if (this.montrerErreurs) {
        ctx.save();
        ctx.strokeStyle = "#ffd60a";
        ctx.lineWidth = 4;
        ctx.setLineDash([5, 4]);
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== this.phantomGrid[r][c]) {
                    ctx.beginPath();
                    ctx.arc(c * this.cellSize + this.cellSize / 2, r * this.cellSize + this.cellSize / 2, this.cellSize / 2.5 - 4, 0, Math.PI * 2);
                    ctx.stroke();
                }
            }
        }
        ctx.restore();
    }
}

// Nombre de jetons au mauvais endroit (couleur fausse ou en trop) et de jetons manquants
compterErreurs() {
    let faux = 0, manquants = 0;
    for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < this.cols; c++) {
            const g = this.grid[r][c], p = this.phantomGrid[r][c];
            if (g && g !== p) faux++;
            else if (!g && p) manquants++;
        }
    }
    return { faux, manquants };
}


    initPhantom(phantomColumns) {
        this.phantomGrid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        for (let c = 0; c < this.cols; c++) {
            let col = phantomColumns[c];
            if (!Array.isArray(col)) continue;

            for (let r = 0; r < col.length; r++) {
                let color = col[r] === "r" ? "red" : col[r] === "g" ? "green" : null;
                if (color) {
                    this.phantomGrid[this.rows - 1 - r][c] = color;
                }
            }
        }
        this.drawTokens();
    }

estColonnePleine(n) {
    n = n - 1; // Ajuster l'index
    if (n < 0 || n >= this.cols) return true; // Si la colonne est invalide, la considérer comme pleine
    return this.grid[0][n] !== null; // Si la première ligne est occupée, la colonne est pleine
}


// Renvoie une promesse résolue quand le jeton a fini de tomber
ajouter(coul, n) {
    // Les messages qui commencent par 💥 s'affichent tels quels à l'élève
    if (typeof n !== "number" || Number.isNaN(n)) {
      throw new Error("💥 Le numéro de colonne n’est pas un nombre : as-tu donné une valeur à n ?");
    }
    if (coul !== "red" && coul !== "green") {
      throw new Error("💥 La couleur du jeton n’est pas choisie : as-tu donné une valeur à c ?");
    }
    n = n-1;
    if (n < 0 || n >= this.cols){
      throw new Error(`💥 La colonne ${n + 1} n’existe pas : les colonnes vont de 1 à ${this.cols}.`);
    } 
         // Vérifier si la colonne est pleine
    if (this.estColonnePleine(n + 1)) {
        throw new Error(`💥 La colonne ${n + 1} est pleine !`);
    }
    let r = this.rows - 1;
    while (r >= 0 && this.grid[r][n] !== null) r--;
    if (r < 0) return Promise.resolve();
    const generation = this.generation;

    let y = 0;
    const targetY = r * this.cellSize;
    const color = this.getModernColor(coul); // 🎨 Assure que la couleur est correcte

    return new Promise(resolve => {
    const animate = () => {
        if (generation !== this.generation) return; // grille vidée pendant la chute
        this.tokensCtx.clearRect(0, 0, this.tokensCanvas.width, this.tokensCanvas.height);
        this.drawTokens();
        
        // 🟢🔴 Dessin du jeton en animation avec la couleur correcte
        this.tokensCtx.fillStyle = color;
        this.tokensCtx.beginPath();
        this.tokensCtx.arc(n * this.cellSize + this.cellSize / 2, y + this.cellSize / 2, this.cellSize / 2.5, 0, Math.PI * 2);
        this.tokensCtx.fill();

        if (y < targetY) {
            y = Math.min(y + this.cellSize / 4, targetY);
            requestAnimationFrame(animate);
        } else {
            this.grid[r][n] = coul;
            this.drawTokens();
            resolve();
        }
    };

    animate();
    });
}




    vider() {
        this.generation++;
        this.montrerErreurs = false;
        this.grid = Array.from({ length: this.rows }, () => Array(this.cols).fill(null));
        this.drawTokens();
        
    }

    verifier(){

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.grid[r][c] !== this.phantomGrid[r][c]) {
                    return false;
                }
            }
        }
        return true;
    }
    
    getModernColor(color) {
const colorMap = {
    "red": "#D72638",   // Rouge framboise
    "green": "#3A7D44"  // Vert sapin
};

    return colorMap[color] || color; // Retourne la couleur modernisée ou la couleur d'origine
}
}