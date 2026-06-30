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

/* ---------------- Paramètres (onglet) ---------------- */

const OPTIONS_TYPE_CONVERSION = [
  { value: 'longueur', label: 'Longueur' },
  { value: 'aire', label: 'Aire' },
  { value: 'volume', label: 'Volume' }
];

function construireBoutonsParametres() {
  const conteneur = document.getElementById('grpTypeConversion');
  if (!conteneur) return;
  conteneur.innerHTML = '';
  OPTIONS_TYPE_CONVERSION.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'param-btn';
    btn.textContent = opt.label;
    btn.dataset.value = opt.value;
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
    conteneur.appendChild(btn);
  });
}

// Lit les types de conversion sélectionnés dans l'onglet Paramètres.
// Si rien n'est coché, retourne [] (= tous les types, tirage aléatoire).
function lireParametresGeneration() {
  const conteneur = document.getElementById('grpTypeConversion');
  if (!conteneur) return [];
  const actifs = [...conteneur.querySelectorAll('.param-btn.active')].map(b => b.dataset.value);
  return actifs;
}

function ouvrirParametres() {
  document.getElementById('paramsOverlay').classList.add('open');
}

function fermerParametres() {
  document.getElementById('paramsOverlay').classList.remove('open');
}

function installerOverlayParametres() {
  construireBoutonsParametres();
  document.getElementById('paramsClose').addEventListener('click', fermerParametres);
  document.getElementById('paramsOverlay').addEventListener('click', (e) => {
    if (e.target.id === 'paramsOverlay') fermerParametres();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && document.getElementById('paramsOverlay').classList.contains('open')) {
      fermerParametres();
    }
  });
}

/* ---------------- Header ---------------- */

function construireHeader() {
  const bandeau = document.getElementById('topButtonsBar');
  if (!bandeau) return;

  const btnParams = document.createElement('button');
  btnParams.type = 'button';
  btnParams.className = 'btn-header';
  btnParams.textContent = 'Paramètres';
  btnParams.addEventListener('click', ouvrirParametres);
  bandeau.appendChild(btnParams);

  const filet = document.createElement('span');
  filet.className = 'header-filet';
  bandeau.appendChild(filet);

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
}

/* ---------------- Quiz ---------------- */

function genererExercice() {
  if (total >= nbQuestions) {
    afficherFin();
    return;
  }
  status = null;
  document.getElementById("resultat").textContent = "";
  document.getElementById("reponse").value = "";
  document.getElementById("reponse").disabled = false;
  document.getElementById("reponse").focus();
  document.getElementById("nextButton").disabled = true;

  try {
    const ex = genererExerciceConversion(lireParametresGeneration());
    bonneReponseActuelle = ex.bonneReponse;
    questionActuelle = ex.question;
    uniteCible = ex.uniteCible;

    let exposant = '';
    if (ex.typeExercice === 'aire') exposant = `\\mathrm{${ex.unite2.slice(0, -1)}}^2`;
    else if (ex.typeExercice === 'volume') exposant = `\\mathrm{${ex.unite2.slice(0, -1)}}^3`;
    else exposant = `\\mathrm{${ex.unite2}}`;

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

  if (total < nbQuestions && (status === "correct" || status === "incorrect")) {
    total++;
    if (status === "correct") bonnes++;

    const scoreDiv = document.getElementById("score");
    scoreDiv.textContent = `Score : ${bonnes}/${total}`;
    scoreDiv.classList.remove("pop");
    void scoreDiv.offsetWidth;
    scoreDiv.classList.add("pop");
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
    document.getElementById("score").textContent = `Score : 0/0`;
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
  installerOverlayParametres();
  if (window.MathJax) {
    MathJax.startup.promise.then(() => {
      genererExercice();
    });
  } else {
    console.error("MathJax n'a pas été chargé.");
  }
});
