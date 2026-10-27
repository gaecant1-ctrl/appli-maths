class Grille {
    constructor(containerId, width = 300, height = 300) {
        this.container = document.getElementById(containerId);
        this.width = width;
        this.height = height;
        this.pas = 20;  // Pas pour les déplacements et le quadrillage
        this.generation = 0; // incrémenté par effacer() : une animation en cours est alors abandonnée
        this.container.style.position = "relative";
        this.container.style.width = `${this.width}px`;
        this.container.style.height = `${this.height}px`;

        // Les canevas, du fond vers le dessus : quadrillage, modèle, tracé de l'élève, erreurs, tortue
        const canevas = () => {
            const c = document.createElement("canvas");
            c.width = this.width;
            c.height = this.height;
            c.style.position = "absolute";
            c.style.top = "0";
            c.style.left = "0";
            this.container.appendChild(c);
            return c;
        };
        this.canvasQuadrillage = canevas();
        this.ctxQuadrillage = this.canvasQuadrillage.getContext("2d");
        this.canvasFantome = canevas();
        this.ctxFantome = this.canvasFantome.getContext("2d");
        this.canvasFond = canevas();
        this.ctxFond = this.canvasFond.getContext("2d");
        this.canvasErreurs = canevas();
        this.ctxErreurs = this.canvasErreurs.getContext("2d");
        this.canvasTortue = canevas();
        this.ctxTortue = this.canvasTortue.getContext("2d");

        // Position et orientation initiale de la tortue
        this.xd = width / 2;  // Position de départ X
        this.yd = height / 2; // Position de départ Y
        this.angleDeDepart = 0; // Angle de départ
        this.x = this.xd;     // Position courante X
        this.y = this.yd;     // Position courante Y
        this.angle = this.angleDeDepart; // L'angle initial

        // Stylo activé/désactivé
        this.penDown = true;

        // Traits du modèle et de l'élève, découpés en morceaux d'une unité (pour comparer les tracés)
        this.traitsFantome = new Map();
        this.traitsTrace = new Map();

        // Chargement de l'image de la tortue
        this.imgTortue = new Image();
        this.imgTortue.src = 'assets/tortue.png';
        this.imgTortue.onload = () => {
            this.dessinerTortue();
        };

        this.dessinerQuadrillage();

        // Canevas actif (par défaut, celui de l'élève)
        this.canvasActif = this.canvasFond;
        this.ctxActif = this.ctxFond;
    }

    definirCanevasActif(canevas) {
        this.canvasActif = canevas;
        this.ctxActif = canevas.getContext("2d");
    }

    dessinerQuadrillage() {
        this.ctxQuadrillage.clearRect(0, 0, this.width, this.height);
        this.ctxQuadrillage.strokeStyle = 'lightgray';
        this.ctxQuadrillage.lineWidth = 1;
        for (let i = 0; i <= this.width; i += this.pas) {
            this.ctxQuadrillage.beginPath();
            this.ctxQuadrillage.moveTo(i, 0);
            this.ctxQuadrillage.lineTo(i, this.height);
            this.ctxQuadrillage.stroke();
        }
        for (let i = 0; i <= this.height; i += this.pas) {
            this.ctxQuadrillage.beginPath();
            this.ctxQuadrillage.moveTo(0, i);
            this.ctxQuadrillage.lineTo(this.width, i);
            this.ctxQuadrillage.stroke();
        }
    }

    tracerLigne(x1, y1, x2, y2, couleur = "black") {
        this.ctxActif.strokeStyle = couleur;
        this.ctxActif.lineWidth = 2;
        this.ctxActif.lineCap = "round";
        this.ctxActif.beginPath();
        this.ctxActif.moveTo(x1, y1);
        this.ctxActif.lineTo(x2, y2);
        this.ctxActif.stroke();
    }

    dessinerTortue() {
        this.ctxTortue.clearRect(0, 0, this.width, this.height);
        this.ctxTortue.save();
        this.ctxTortue.translate(this.x, this.y);
        this.ctxTortue.rotate((-this.angle * Math.PI) / 180);
        this.ctxTortue.drawImage(this.imgTortue, -15, -15, 30, 30);
        this.ctxTortue.restore();
        // petit cercle : le stylo est baissé
        if (this.penDown) {
            this.ctxTortue.beginPath();
            this.ctxTortue.arc(this.x, this.y, 3, 0, 2 * Math.PI);
            this.ctxTortue.fillStyle = 'black';
            this.ctxTortue.fill();
        }
    }

    // Découpe un trait en morceaux d'une unité, repérés par leurs extrémités (dans n'importe quel ordre) :
    // un trait repassé ou tracé à l'envers donne les mêmes morceaux
    noterTraits(x1, y1, x2, y2, traits) {
        const long = Math.hypot(x2 - x1, y2 - y1) / this.pas;
        if (long < 1e-6) return;
        const ux = (x2 - x1) / long, uy = (y2 - y1) / long;
        const arrondi = v => Math.round(v * 10) / 10;
        for (let k = 0; k < long - 1e-6; k++) {
            const t = Math.min(k + 1, long);
            const a = [arrondi(x1 + ux * k), arrondi(y1 + uy * k)], b = [arrondi(x1 + ux * t), arrondi(y1 + uy * t)];
            const [p, q] = a[0] < b[0] || (a[0] === b[0] && a[1] <= b[1]) ? [a, b] : [b, a];
            traits.set(p.join(",") + "|" + q.join(","), [...p, ...q]);
        }
    }

    // Avance d'un coup (tracé du modèle)
    avancer(distance) {
        distance *= this.pas;
        const rad = (this.angle * Math.PI) / 180;
        const newX = this.x + distance * Math.cos(rad);
        const newY = this.y - distance * Math.sin(rad);
        if (this.penDown) {
            const fantome = this.canvasActif === this.canvasFantome;
            this.tracerLigne(this.x, this.y, newX, newY, fantome ? "blue" : "black");
            this.noterTraits(this.x, this.y, newX, newY, fantome ? this.traitsFantome : this.traitsTrace);
        }
        this.x = newX;
        this.y = newY;
        this.dessinerTortue();
    }

    tourner(angle) {
        this.angle = (this.angle + angle) % 360;
        this.dessinerTortue();
    }

    // Les messages qui commencent par 💥 s'affichent tels quels à l'élève
    verifierNombre(v, quoi) {
        if (typeof v !== "number" || Number.isNaN(v)) {
            throw new Error(`💥 ${quoi} n’est pas un nombre : as-tu donné une valeur à n ?`);
        }
    }

    // La tortue avance en glissant pendant « duree » millisecondes ; la promesse est tenue à l'arrivée
    deplacer(distance, duree) {
        this.verifierNombre(distance, "La distance");
        const generation = this.generation;
        const x0 = this.x, y0 = this.y, rad = (this.angle * Math.PI) / 180;
        const dx = distance * this.pas * Math.cos(rad), dy = -distance * this.pas * Math.sin(rad);
        const debut = performance.now();
        let px = x0, py = y0;
        return new Promise(resolve => {
            const etape = maintenant => {
                if (generation !== this.generation) return; // dessin effacé pendant le trajet
                const f = Math.min(1, (maintenant - debut) / duree);
                const nx = x0 + dx * f, ny = y0 + dy * f;
                if (this.penDown) this.tracerLigne(px, py, nx, ny, "black");
                px = nx; py = ny;
                this.x = nx; this.y = ny;
                this.dessinerTortue();
                if (f < 1) { requestAnimationFrame(etape); return; }
                if (this.penDown) this.noterTraits(x0, y0, x0 + dx, y0 + dy, this.traitsTrace);
                resolve();
            };
            requestAnimationFrame(etape);
        });
    }

    // La tortue pivote en douceur
    pivoter(angle, duree) {
        this.verifierNombre(angle, "L’angle");
        const generation = this.generation;
        const a0 = this.angle, debut = performance.now();
        return new Promise(resolve => {
            const etape = maintenant => {
                if (generation !== this.generation) return;
                const f = Math.min(1, (maintenant - debut) / duree);
                this.angle = a0 + angle * f;
                this.dessinerTortue();
                if (f < 1) { requestAnimationFrame(etape); return; }
                this.angle = (a0 + angle) % 360;
                resolve();
            };
            requestAnimationFrame(etape);
        });
    }

    // Efface le dessin de l'élève et remet la tortue au départ
    effacer() {
        this.ctxActif.clearRect(0, 0, this.width, this.height);
        if (this.canvasActif === this.canvasFond) {
            this.generation++;
            this.traitsTrace = new Map();
            this.ctxErreurs.clearRect(0, 0, this.width, this.height);
            this.x = this.xd;
            this.y = this.yd;
            this.angle = this.angleDeDepart;
            this.penDown = true;
            this.dessinerTortue();
        }
    }

    // Trace le modèle en pointillés bleus
    tracerFantome(trajet) {
        this.ctxFantome.clearRect(0, 0, this.width, this.height);
        this.traitsFantome = new Map();
        const tempX = this.x, tempY = this.y, tempAngle = this.angle, tempPenDown = this.penDown;
        this.x = this.xd;
        this.y = this.yd;
        this.angle = this.angleDeDepart;
        this.penDown = true;
        this.definirCanevasActif(this.canvasFantome);
        this.ctxActif.setLineDash([5, 5]);
        trajet.call(this);
        this.x = tempX;
        this.y = tempY;
        this.angle = tempAngle;
        this.penDown = tempPenDown;
        this.ctxActif.setLineDash([]);
        this.definirCanevasActif(this.canvasFond);
        this.reinitialiser();
    }

    // Comparaison avec le modèle : morceaux d'une unité manquants, et morceaux tracés en trop
    comparer() {
        const manquants = [...this.traitsFantome.keys()].filter(k => !this.traitsTrace.has(k));
        const enTrop = [...this.traitsTrace.keys()].filter(k => !this.traitsFantome.has(k));
        return { manquants, enTrop };
    }

    // Montre les erreurs : en orange ce qui manque, en rouge ce qui est en trop
    montrerErreurs({ manquants, enTrop }) {
        const ctx = this.ctxErreurs;
        ctx.clearRect(0, 0, this.width, this.height);
        ctx.lineWidth = 5;
        ctx.lineCap = "round";
        const dessiner = (cles, traits, couleur) => {
            ctx.strokeStyle = couleur;
            for (const k of cles) {
                const [x1, y1, x2, y2] = traits.get(k);
                ctx.beginPath();
                ctx.moveTo(x1, y1);
                ctx.lineTo(x2, y2);
                ctx.stroke();
            }
        };
        dessiner(manquants, this.traitsFantome, "rgba(255, 140, 0, .85)");
        dessiner(enTrop, this.traitsTrace, "rgba(220, 38, 38, .85)");
    }

    leverStylo() {
        this.penDown = false;
        this.dessinerTortue();
    }

    baisserStylo() {
        this.penDown = true;
        this.dessinerTortue();
    }

    // Réinitialiser la tortue à sa position de départ
    reinitialiser() {
        this.x = this.xd;
        this.y = this.yd;
        this.angle = this.angleDeDepart;
        this.dessinerTortue();
    }

    setPosition(newX, newY) {
        this.x = newX;
        this.y = newY;
        this.xd = newX;
        this.yd = newY;
        this.dessinerTortue();
    }

    setOrientation(newAngle) {
        this.angle = newAngle % 360;
        this.angleDeDepart = this.angle;
        this.dessinerTortue();
    }
}
