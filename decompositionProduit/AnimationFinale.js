class AnimationFinale {
  /**
   * @param {Object} options - { score, total, nbQuestions, resultat, onRestart, scoreSender, identifiant }
   * resultat : div DOM obligatoire pour afficher le bilan
   */
  constructor(options) {
    this.score = Number(options.score || 0);
    this.total = Number(options.total || 0);          // optionnel (non utilisé pour le ratio)
    this.nbQuestions = Math.max(0, Number(options.nbQuestions || 0));
    this.resultat = options.resultat;                 // <--- div DOM OBLIGATOIRE
    if (!this.resultat) throw new Error("Le div resultat doit être fourni à AnimationFinale !");
    this.onRestart = options.onRestart;
    this.scoreSender = options.scoreSender;           // optionnel (doit exposer .send(value, id, meta))
    this.identifiant = options.identifiant || "anonyme";

    this._timeouts = [];                              // pour annuler les confettis si besoin
  }

  _installKeyframesOnce() {
    if (document.getElementById("popfin-keyframes")) return;
    const style = document.createElement('style');
    style.id = "popfin-keyframes";
    style.innerHTML = `
      @keyframes popfin {
        0% { transform: scale(0.7); opacity: 0; }
        70% { transform: scale(1.15); opacity: 1; }
        100% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);
  }

  _clearTimers() {
    for (const id of this._timeouts) clearTimeout(id);
    this._timeouts.length = 0;
  }

  _schedule(fn, delay) {
    const id = setTimeout(fn, delay);
    this._timeouts.push(id);
  }

  _confettiSalves(nbSalves, interval = 350) {
    // confetti() peut ne pas exister — on garde un no-op propre
    if (typeof window.confetti !== "function") return;
    for (let i = 0; i < nbSalves; i++) {
      this._schedule(() => {
        // on varie un peu l’origine pour un effet plus vivant
        const left = Math.random() < 0.5;
        window.confetti({
          particleCount: 60 + Math.floor(40 * Math.random()),
          spread: 70 + 60 * Math.random(),
          origin: {
            x: left ? (0.15 + 0.2 * Math.random()) : (0.65 + 0.2 * Math.random()),
            y: 0.4 + 0.25 * Math.random()
          }
        });
      }, 400 + i * interval);
    }
  }

  teardown() {
    this._clearTimers();
    // pas de listener global, juste le bouton qui est régénéré à chaque affichage
  }

  afficher() {
    this._clearTimers();
    this._installKeyframesOnce();

    const denom = this.nbQuestions > 0 ? this.nbQuestions : 1;
    const ratio = Math.max(0, Math.min(1, this.score / denom));
    const pct   = Math.round(ratio * 100);

    let message, emoji, color, bg, nbSalves = 0, interval = 350;
    if (ratio === 1) {
      emoji = "🏆";
      message = "Score parfait !";
      color = "#27ae60"; bg = "#eafaf1"; nbSalves = 7; interval = 250;
    } else if (ratio >= 0.8) {
      emoji = "🎉";
      message = "Excellent !";
      color = "#2980b9"; bg = "#eaf6ff"; nbSalves = 4; interval = 300;
    } else if (ratio >= 0.5) {
      emoji = "👍";
      message = "Pas mal !";
      color = "#f39c12"; bg = "#fffbe6"; nbSalves = 2; interval = 400;
    } else {
      emoji = "💡";
      message = "Entraîne-toi encore !";
      color = "#e74c3c"; bg = "#fff3f3"; nbSalves = 0;
    }

    // Accessibilité : live region
    this.resultat.className = "";
    this.resultat.setAttribute("role", "status");
    this.resultat.setAttribute("aria-live", "polite");

    this.resultat.innerHTML = `
      <div id="finJeu" style="
        animation: popfin 0.6s cubic-bezier(.68,-0.55,.27,1.55) both;
        font-size: 2em;
        color: ${color};
        background: ${bg};
        margin-top: 0.5em;
        margin-bottom: 0.5em;
        font-weight: bold;
        border-radius: 18px;
        padding: 22px 12px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(52,152,219,0.10);
      ">
        <div style="font-size:2em;line-height:1">${emoji}</div>
        ${message}<br>
        <span style="font-size:0.9em;color:#333;">
          Score final : ${this.score} / ${this.nbQuestions} (${pct}%)
        </span>
      </div>
      <div style="width:100%;display:flex;justify-content:center;">
        <button id="restartButton" style="
          margin-top: 0.5em;
          padding: 12px 28px;
          font-size: 1.05em;
          border-radius: 30px;
          background: linear-gradient(90deg, #27ae60 60%, #6dd5fa 100%);
          color: white;
          border: none;
          cursor: pointer;
          transition: transform 0.2s;
          font-weight: 600;
        ">Recommencer</button>
      </div>
    `;

    // Typeset si MathJax est chargé
    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([this.resultat]);
      else if (window.MathJax?.typeset) window.MathJax.typeset([this.resultat]);
    } catch {}

    // Confettis (si dispo)
    if (nbSalves > 0) this._confettiSalves(nbSalves, interval);

    // Envoi du score si demandé
    if (this.scoreSender && typeof this.scoreSender.send === "function") {
      try {
        this.scoreSender.send(
          `${this.score}/${this.nbQuestions}`,
          this.identifiant,
          { date: new Date().toISOString(), percent: pct }
        );
      } catch (e) { /* silencieux */ }
    }

    // Bouton restart
    const btn = document.getElementById("restartButton");
    if (btn) {
      btn.onclick = () => {
        this._clearTimers();
        if (typeof this.onRestart === "function") this.onRestart();
      };
      // focus pour UX clavier
      setTimeout(() => { try { btn.focus(); } catch {} }, 0);
      btn.onkeydown = (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          btn.click();
        }
      };
      btn.onpointerdown = () => { btn.style.transform = "scale(0.98)"; };
      btn.onpointerup = () => { btn.style.transform = "scale(1)"; };
      btn.onpointerleave = () => { btn.style.transform = "scale(1)"; };
    }
  }
}
