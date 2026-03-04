class AnimationFinale {
  /**
   * @param {Object} options - { score, total, nbQuestions, resultat, onRestart, scoreSender, identifiant }
   * resultat : div DOM obligatoire pour afficher le bilan
   */
  constructor(options) {
    this.score = options.score;
    this.total = options.total;
    this.nbQuestions = options.nbQuestions;
    this.resultat = options.resultat; // <--- div DOM OBLIGATOIRE
    if (!this.resultat) throw new Error("Le div resultat doit être fourni à AnimationFinale !");
    this.onRestart = options.onRestart;
    this.scoreSender = options.scoreSender; // optionnel
    this.identifiant = options.identifiant; // optionnel
  }

  afficher() {
    const ratio = this.score / this.nbQuestions;
    let message, emoji, color, bg, nbSalves, interval;

    if (ratio === 1) {
      emoji = "🏆";
      message = "Score parfait !";
      color = "#27ae60";
      bg = "#eafaf1";
      nbSalves = 7; interval = 250;
    } else if (ratio >= 0.8) {
      emoji = "🎉";
      message = "Excellent !";
      color = "#2980b9";
      bg = "#eaf6ff";
      nbSalves = 4; interval = 300;
    } else if (ratio >= 0.5) {
      emoji = "👍";
      message = "Pas mal !";
      color = "#f39c12";
      bg = "#fffbe6";
      nbSalves = 2; interval = 400;
    } else {
      emoji = "💡";
      message = "Entraîne-toi encore !";
      color = "#e74c3c";
      bg = "#fff3f3";
      nbSalves = 0;
    }

    // Affichage du bilan
    this.resultat.className = "";
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
        padding: 22px 12px 22px 12px;
        text-align: center;
        box-shadow: 0 4px 16px rgba(52,152,219,0.10);
      ">
        <div style="font-size:2em;line-height:1">${emoji}</div>
        ${message}<br>
        <span style="font-size:1em;">Score final : ${this.score} / ${this.nbQuestions}</span>
      </div>
      <div style="width:100%;display:flex;justify-content:center;">
        <button id="restartButton" style="
          margin-top: 0.5em;
          padding: 12px 28px;
          font-size: 1.1em;
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

    if (window.MathJax) MathJax.typeset();

    // Animation CSS si pas déjà présente
    if (!document.getElementById("popfin-keyframes")) {
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

    // Confettis si besoin
    if (nbSalves > 0) this.confettiSalves(nbSalves, interval);

    // Envoi du score si demandé
    if (this.scoreSender) {
      this.scoreSender.send(
        `${this.score}/${this.nbQuestions}`,
        this.identifiant || "anonyme",
        { date: new Date().toISOString() }
      );
    }

    // Bouton restart
    document.getElementById("restartButton").onclick = () => {
      if (typeof this.onRestart === "function") this.onRestart();
      // NE PAS vider ici : la fonction de redémarrage gère le nettoyage
    };
  }

  // Méthode d’animation confetti
  confettiSalves(nbSalves, interval = 350) {
    for (let i = 0; i < nbSalves; i++) {
      setTimeout(() => {
        confetti({
          particleCount: 60 + Math.floor(40 * Math.random()),
          spread: 70 + 60 * Math.random(),
          origin: { y: 0.5 + 0.2 * Math.random() }
        });
      }, 400 + i * interval);
    }
  }
}
