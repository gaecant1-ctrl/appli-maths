/* ==============================================
   app.js — quiz de conversion à l'écran
   ----------------------------------------------
   S'appuie sur conversions.js pour la logique de génération,
   construit le header (Paramètres + Fiche papier) et gère
   l'overlay de paramètres (type de conversion, "rien coché = aléatoire").
================================================== */

let bonneReponseActuelle = null;
let questionActuelle = null;
let uniteCible = "";
let total = 0, bonnes = 0;
let status = null;
let nbQuestions = 10; // Mets ici le nombre de questions que tu veux tester

let etatJeu = 'atelier';   // 'atelier' | 'quiz' — atelier : rien n'est compté, questions illimitées.
let quizDemarre = false;   // true une fois qu'on a cliqué "Commencer le Quiz"

/* ---------------- Paramètres (onglet) ---------------- */

const OPTIONS_TYPE_CONVERSION = [
  { value: 'longueur', label: 'Longueur' },
  { value: 'aire', label: 'Aire' },
  { value: 'volume', label: 'Volume' },
  { value: 'capacite', label: 'Capacité' }
];

function construireGroupeTypeConversion(actifs = [], disabled = false) {
  const groupe = document.createElement('div');
  groupe.className = 'panel-groupe';

  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.innerHTML = 'Type de conversion <span class="shuffle-hint">(rien coché = aléatoire)</span>';
  groupe.appendChild(label);

  const liste = document.createElement('div');
  liste.className = 'panel-type-list';
  liste.id = 'grpTypeConversion';
  OPTIONS_TYPE_CONVERSION.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn' + (actifs.includes(opt.value) ? ' active' : '');
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
      genererExercice();
    });
    liste.appendChild(btn);
  });
  groupe.appendChild(liste);

  return groupe;
}

function construireBoutonAbandonner() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'skipButton';
  btn.className = 'panel-btn';
  btn.textContent = 'Renoncer';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (etatJeu === 'quiz' && quizDemarre && total < nbQuestions) {
      total++;
      mettreAJourScore();
    }
    genererExercice();
  });
  return btn;
}

function construireLabelQuiz() {
  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = 'Quiz';
  return label;
}

/** Construit le contenu du panneau latéral selon l'état courant (atelier / quiz avant ou après lancement). */
function renderPanneauLateral() {
  const panneau = document.getElementById('panneauLateral');
  if (!panneau) return;
  const actifs = lireParametresGeneration();
  const verrouille = etatJeu === 'quiz' && quizDemarre;
  panneau.innerHTML = '';
  panneau.appendChild(construireGroupeTypeConversion(actifs, verrouille));

  const filet = document.createElement('div');
  filet.className = 'panel-filet';
  panneau.appendChild(filet);

  if (etatJeu === 'atelier') {
    const groupeAtelier = document.createElement('div');
    groupeAtelier.className = 'panel-groupe';

    const labelAtelier = document.createElement('div');
    labelAtelier.className = 'panel-groupe-label';
    labelAtelier.textContent = 'Question en cours :';
    groupeAtelier.appendChild(labelAtelier);

    groupeAtelier.appendChild(construireBoutonAbandonner());
    panneau.appendChild(groupeAtelier);

  } else if (etatJeu === 'quiz' && !quizDemarre) {
    panneau.appendChild(construireLabelQuiz());

    const btnCommencer = document.createElement('button');
    btnCommencer.type = 'button';
    btnCommencer.className = 'panel-btn active';
    btnCommencer.textContent = 'Commencer le Quiz';
    btnCommencer.addEventListener('click', () => {
      quizDemarre = true;
      total = 0;
      bonnes = 0;
      renderPanneauLateral();
      genererExercice();
    });
    panneau.appendChild(btnCommencer);

  } else { // quiz && quizDemarre
    panneau.appendChild(construireLabelQuiz());

    const scoreContainer = document.createElement('div');
    scoreContainer.id = 'score-container';

    const progressDiv = document.createElement('div');
    progressDiv.id = 'question-progress';

    const scoreDiv = document.createElement('div');
    scoreDiv.id = 'score';

    scoreContainer.append(progressDiv, scoreDiv, construireBoutonAbandonner());
    panneau.appendChild(scoreContainer);
    mettreAJourScore();
  }
}

/** Met à jour l'affichage de la progression et du score dans le panneau latéral. */
function mettreAJourScore() {
  const progressElem = document.getElementById('question-progress');
  if (progressElem) progressElem.textContent = `Question ${Math.min(total + 1, nbQuestions)}/${nbQuestions}`;
  const scoreElem = document.getElementById('score');
  if (scoreElem) scoreElem.textContent = `Score : ${bonnes}`;
}

function setSkipVisible(visible) {
  const skipBtn = document.getElementById('skipButton');
  if (skipBtn) skipBtn.style.display = visible ? '' : 'none';
}

/** Installe le bouton de bascule Atelier/Quiz dans le header. */
function setupEtatToggle() {
  const conteneur = document.getElementById('topButtonsBar');
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
    if (etatJeu === nouvelEtat) return;
    etatJeu = nouvelEtat;
    quizDemarre = false;
    total = 0;
    bonnes = 0;
    majClasses();
    renderPanneauLateral();
    genererExercice();
  };

  btnAtelier.onclick = () => basculer('atelier');
  btnQuiz.onclick = () => basculer('quiz');

  const filet = document.createElement('span');
  filet.className = 'header-filet';

  conteneur.append(btnAtelier, btnQuiz, filet);
}

// Lit les types de conversion sélectionnés dans le panneau latéral.
// Si rien n'est coché, retourne [] (= tous les types, tirage aléatoire).
function lireParametresGeneration() {
  const conteneur = document.getElementById('grpTypeConversion');
  if (!conteneur) return [];
  const actifs = [...conteneur.querySelectorAll('.panel-btn.active')].map(b => b.dataset.value);
  return actifs;
}

/* ---------------- Header ---------------- */

function construireHeader() {
  const bandeau = document.getElementById('topButtonsBar');
  if (!bandeau) return;

  setupEtatToggle();

  const btnNouvelOnglet = document.createElement('button');
  btnNouvelOnglet.type = 'button';
  btnNouvelOnglet.className = 'btn-header';
  btnNouvelOnglet.textContent = 'Nouvel onglet';
  btnNouvelOnglet.addEventListener('click', () => {
    window.open(window.location.href, '_blank');
  });
  bandeau.appendChild(btnNouvelOnglet);

  if (window.FicheConversion) {
    const fiche = new window.FicheConversion();
    fiche.installerBouton(bandeau);
  }

  if (window.GuideConversion) {
    const guide = new window.GuideConversion();
    guide.installerBouton(bandeau);
  }
}

/* ---------------- Quiz ---------------- */

function afficherAttenteQuiz() {
  document.getElementById("zoneReponse").style.display = "none";
  document.getElementById("nextButton").style.display = "none";
  document.getElementById("resultat").textContent = "";
  document.getElementById("question").style.display = "";
  document.getElementById("question").textContent =
    "Clique sur « Commencer le Quiz » dans le panneau pour démarrer.";
}

function genererExercice() {
  if (etatJeu === 'quiz' && !quizDemarre) {
    afficherAttenteQuiz();
    return;
  }
  if (etatJeu === 'quiz' && total >= nbQuestions) {
    afficherFin();
    return;
  }
  document.getElementById("zoneReponse").style.display = "";
  document.getElementById("nextButton").style.display = "";
  status = null;
  document.getElementById("resultat").textContent = "";
  document.getElementById("reponse").value = "";
  document.getElementById("reponse").disabled = false;
  document.getElementById("reponse").focus();
  document.getElementById("nextButton").disabled = true;
  setSkipVisible(true);

  try {
    const ex = genererExerciceConversion(lireParametresGeneration());
    bonneReponseActuelle = ex.bonneReponse;
    questionActuelle = ex.question;
    uniteCible = ex.uniteCible;

    let exposant = '';
    if (ex.typeExercice === 'aire') exposant = `\\mathrm{${ex.unite2.slice(0, -1)}}^2`;
    else if (ex.typeExercice === 'volume') exposant = `\\mathrm{${ex.unite2.slice(0, -1)}}^3`;
    else if (ex.typeExercice === 'capacite' && /3$/.test(ex.unite2)) {
      exposant = `\\mathrm{${ex.unite2.slice(0, -1)}}^3`;
    } else exposant = `\\mathrm{${ex.unite2}}`;

    document.getElementById("question").innerHTML =
      `Convertir \\(${ex.question.latex()}\\) en \\(${exposant}\\) :`;

    MathJax.typeset();
  } catch (e) {
    console.error("Erreur lors de la génération de l'exercice :", e);
    document.getElementById("question").textContent = "Erreur de génération.";
  }

  document.getElementById("reponse").value = "";
}

function verifierReponse() {
  const reponseInput = document.getElementById("reponse");
  const bouton = document.getElementById("nextButton");
  const resultatDiv = document.getElementById("resultat");
  const reponse = reponseInput.value.trim().replace(/\^/, '');
  status = null;

  resultatDiv.className = "";
  bouton.classList.remove("survol-smiley", "decu");

  if (!reponse) {
    status = null;
    resultatDiv.textContent = "";
    bouton.classList.add("survol-smiley");
    return;
  }

  let reponseUser;
  try {
    const ClasseAttendue = bonneReponseActuelle.constructor;
    reponseUser = new ClasseAttendue(reponse);

    const uniteUser = reponseUser.uniteInitiale.toLowerCase();
    const uniteCibleLower = uniteCible.toLowerCase();
    const estBonneValeur = reponseUser.estEgal(bonneReponseActuelle);

    if (estBonneValeur && uniteUser === uniteCibleLower) {
      status = "correct";
      const latexUser = reponseUser.latex(uniteCible);
      resultatDiv.innerHTML = `✅ Bonne réponse : \\(${latexUser}\\)`;
      resultatDiv.classList.add("correct");
      MathJax.typeset();
    } else {
      status = "incorrect";
      const bonne = bonneReponseActuelle.latex(uniteCible);
      resultatDiv.innerHTML = `❌ Mauvaise réponse. <br>La bonne réponse est : \\(${bonne}\\)`;
      resultatDiv.classList.add("incorrect");
      MathJax.typeset();
      bouton.classList.add("decu");
    }
  } catch (e) {
    status = "invalide";
    resultatDiv.textContent = "⛔ Format invalide.";
    resultatDiv.classList.add("invalide");
    bouton.classList.add("survol-smiley");
    return;
  }

  reponseInput.disabled = true;
  setSkipVisible(false);

  if (etatJeu === 'quiz' && quizDemarre && total < nbQuestions && (status === "correct" || status === "incorrect")) {
    total++;
    if (status === "correct") bonnes++;

    mettreAJourScore();
    const scoreDiv = document.getElementById("score");
    if (scoreDiv) {
      scoreDiv.classList.remove("pop");
      void scoreDiv.offsetWidth;
      scoreDiv.classList.add("pop");
    }
  }

  bouton.disabled = true;
  setTimeout(() => {
    bouton.disabled = false;
    bouton.focus();
  }, 1000);
}

function afficherFin() {
  document.getElementById("question").style.display = "none";
  document.getElementById("zoneReponse").style.display = "none";
  document.getElementById("nextButton").style.display = "none";

  let message, emoji;
  const ratio = bonnes / nbQuestions;

  if (ratio === 1) {
    emoji = "🏆";
    message = "Score parfait !";
    confettiSalves(7, 250);
  } else if (ratio >= 0.8) {
    emoji = "🎉";
    message = "Excellent !";
    confettiSalves(4, 300);
  } else if (ratio >= 0.5) {
    emoji = "👍";
    message = "Pas mal !";
    confettiSalves(2, 400);
  } else {
    emoji = "💡";
    message = "Entraîne-toi encore !";
  }

  const resultat = document.getElementById("resultat");
  resultat.className = "";
  resultat.innerHTML = `
    <div id="finJeu">
      <div style="font-size:2em;line-height:1">${emoji}</div>
      ${message}<br>
      <span style="font-size:1em;">Score final : ${bonnes} / ${nbQuestions}</span>
    </div>
    <button id="restartButton">Recommencer</button>
  `;
  MathJax.typeset();

  document.getElementById("restartButton").onclick = function () {
    total = 0;
    bonnes = 0;
    mettreAJourScore();
    document.getElementById("question").style.display = "";
    document.getElementById("zoneReponse").style.display = "";
    document.getElementById("nextButton").style.display = "";
    genererExercice();
    document.getElementById("resultat").textContent = "";
  };
}

function confettiSalves(nbSalves, interval = 350) {
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

/* ---------------- Câblage ---------------- */

document.getElementById("nextButton").addEventListener('click', function () {
  genererExercice();
});

document.addEventListener('keydown', function (event) {
  if (event.key === 'Enter') {
    const input = document.getElementById('reponse');
    const nextButton = document.getElementById('nextButton');
    if (!input.disabled && nextButton.disabled) {
      verifierReponse();
      event.preventDefault();
    } else if (input.disabled && !nextButton.disabled) {
      nextButton.click();
      event.preventDefault();
    }
  }
});

window.addEventListener("load", () => {
  construireHeader();
  renderPanneauLateral();
  if (window.MathJax) {
    MathJax.startup.promise.then(() => {
      genererExercice();
    });
  } else {
    console.error("MathJax n'a pas été chargé.");
  }
});
