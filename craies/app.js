/* ==============================================
   app.js — quiz de réduction d'expressions
   ----------------------------------------------
   Construit le header (bascule Atelier/Quiz) et le panneau latéral
   (mode d'affichage, situation visuelle, Renoncer / score), et pilote
   la génération/vérification des exercices.
================================================== */

const XNUM = 100, QUIZ_LENGTH = 10;

let mode = "abc";          // "abc" (lettre x) | "123" (valeur numérique XNUM)
const typesExerciceActifs = new Set(['multiples']); // "simple" (jamais de multiplication) et/ou "multiples" — multi-sélection, au moins un actif
let visuActif = false;     // affichage de la situation visuelle (boîtes)
let isChecking = false;    // le bouton central est-il en mode "Suivant" ?

let etatJeu = 'atelier';   // 'atelier' | 'quiz' — atelier : rien n'est compté, questions illimitées.
let quizDemarre = false;   // true une fois qu'on a cliqué "Commencer le Quiz"
let questionIndex = 0, score = 0, recap = [];

const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const updateMath = () => window.MathJax && MathJax.typesetPromise();
const toCAS = (e) => e.replace(/\\times/g, "*").replace(/·/g, "*").replace(/\s+/g, "").replace(/([0-9])([a-z])/g, "$1*$2").replace(/−/g, "-").trim();
const toTeX = (e) => e.replace(/\*/g, "\\times ").replace(/\\times ([a-z])/g, "$1").replace(/\s+/g, "").replace(/\+\-/g, "-");

/* ---------------- Génération / rendu de l'exercice ---------------- */

function renderContent() {
  const data = window.currentData;
  let visuals = "", terms = [], tCoeff = 0, tConst = 0;

  data.forEach(({ repeat, sign, val }) => {
    tCoeff += repeat;
    tConst += repeat * (sign === "+" ? val : -val);
    terms.push({ r: repeat, s: sign, v: val });
    for (let k = 0; k < repeat; k++) {
      visuals += `<div class="box">${mode === "abc" ? "x" : XNUM}<div class="badge ${sign === "+" ? "plus" : "minus"}">${sign}${val}</div></div>`;
    }
  });

  document.getElementById("expression-zone").innerHTML = visuals;

  let totalLatex = "";
  if (mode === "abc") {
    let parts = terms.map(t => t.r > 1 ? `${t.r}\\times(x ${t.s} ${t.v})` : `(x ${t.s} ${t.v})`);
    totalLatex = `\\[ ${parts.join(" + ")} \\]`;
  } else {
    let step1 = terms.map(t => t.r > 1 ? `${t.r}\\times(${XNUM} ${t.s} ${t.v})` : `(${XNUM} ${t.s} ${t.v})`).join(" + ");
    let step2 = terms.map(t => {
      let res = t.s === "+" ? XNUM + t.v : XNUM - t.v;
      return t.r > 1 ? `${t.r}\\times ${res}` : `${res}`;
    }).join(" + ");
    totalLatex = `\\[ ${step1} = ${step2} \\]`;
  }

  document.getElementById("translation").innerHTML = totalLatex;
  window.currentSolution = mode === "abc" ? `${tCoeff}*x${tConst >= 0 ? "+" : "-"}${Math.abs(tConst)}` : (XNUM * tCoeff + tConst).toString();

  isChecking = false;
  const ans = document.getElementById("answer");
  ans.style.display = "block";
  ans.value = "";
  document.getElementById("latex-res").style.display = "none";
  document.getElementById("check-btn").textContent = "✅ Vérifier";
  document.getElementById("feedback").textContent = "";
  ans.focus();
  updateMath();
}

/** Tire au hasard un type d'exercice parmi ceux actifs (simple / multiples). */
function choisirTypeExercicePourExercice() {
  const actifs = [...typesExerciceActifs];
  return actifs[Math.floor(Math.random() * actifs.length)];
}

/** Tire un exercice (liste de termes {repeat, sign, val}), selon les types actifs du panneau —
 *  pure fonction sans toucher au DOM ; utilisée par le quiz courant et par la fiche papier. */
function tirerUnExercice() {
  const typeTire = choisirTypeExercicePourExercice();
  const nb = randInt(2, 3), motifs = [];
  const data = [];
  for (let i = 0; i < nb; i++) motifs.push({ sign: Math.random() < 0.5 ? "+" : "-", val: randInt(1, 9) });
  motifs.forEach((m, i) => {
    const repeat = (typeTire === 'simple') ? 1 : ((i === 0) ? randInt(1, 2) : 1);
    data.push({ repeat, ...m });
  });
  return data;
}

/** Construit l'énoncé LaTeX (lettre x) d'un exercice — même formule que le mode "abc" de
 *  renderContent, réutilisée par la fiche papier. */
function construireEnonceLatex(data) {
  return data.map(t => t.repeat > 1 ? `${t.repeat}\\times(x ${t.sign} ${t.val})` : `(x ${t.sign} ${t.val})`).join(" + ");
}

function generateExpression() {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("hidden"));
  window.currentData = tirerUnExercice();
  renderContent();
}

function afficherAttenteQuiz() {
  document.getElementById("zone-visuelle").classList.add("hidden");
  document.getElementById("zone-total").classList.remove("hidden");
  document.getElementById("zone-reduite").classList.add("hidden");
  document.getElementById("translation").innerHTML = "Clique sur « Commencer le Quiz » dans le panneau pour démarrer.";
}

function genererExercice() {
  if (etatJeu === 'quiz' && !quizDemarre) {
    afficherAttenteQuiz();
    return;
  }
  if (etatJeu === 'quiz' && questionIndex >= QUIZ_LENGTH) {
    showBilan();
    return;
  }
  generateExpression();
}

function transition(cb) {
  document.querySelectorAll(".section").forEach(s => s.classList.add("fade-out"));
  setTimeout(() => { document.querySelectorAll(".section").forEach(s => s.classList.remove("fade-out")); cb(); }, 300);
}

/* ---------------- Vérification ---------------- */

function checkAnswer() {
  if (isChecking) { nextQuestion(); return; }
  const ansInput = document.getElementById("answer");
  const raw = ansInput.value.trim();
  if (!raw) return;

  const user = toCAS(raw), sol = toCAS(window.currentSolution);
  let equiv = false, reduite = false;
  try {
    equiv = [-2, 3].every(v => math.evaluate(user, { x: v }) === math.evaluate(sol, { x: v }));
    reduite = (mode === "abc") ? (user.match(/\bx\b|[0-9]*\*?x/g) || []).length <= 1 : !user.match(/[\+\*\/]/);
  } catch (e) { }

  const correct = equiv && reduite;
  if (etatJeu === 'quiz' && quizDemarre) {
    if (correct) score++;
    recap.push(correct ? "✅" : "❌");
    mettreAJourScore();
  }

  const feedback = document.getElementById("feedback");
  feedback.innerHTML = correct ? "🎉 Bravo !" : equiv ? "⚠️ Calcule tout" : "❌ Faux";
  feedback.style.color = correct ? "#2e7d32" : "#c62828";

  const latexAns = mode === "abc" ? toTeX(user) : user.replace(/\*/g, "\\times ");
  const lBox = document.getElementById("latex-res");
  lBox.innerHTML = `\\[ ${latexAns} \\]`;
  lBox.style.display = "flex";
  ansInput.style.display = "none";
  document.getElementById("check-btn").textContent = "➡️ Suivant";
  isChecking = true;
  updateMath();
}

function nextQuestion() {
  questionIndex++;
  if (etatJeu === 'quiz' && quizDemarre && questionIndex >= QUIZ_LENGTH) { transition(showBilan); return; }
  transition(genererExercice);
}

function showBilan() {
  document.querySelectorAll(".section").forEach(s => s.classList.add("hidden"));
  let b = document.getElementById("bilan-final");
  if (!b) {
    b = document.createElement("div");
    b.id = "bilan-final";
    document.getElementById("container").appendChild(b);
  }
  b.innerHTML = `<div style='font-size:2.5em;'>${recap.join("")}</div><h2>RÉSULTAT : ${score}/${QUIZ_LENGTH}</h2><button id="restartButton">🔄 RECOMMENCER</button>`;
  document.getElementById("restartButton").onclick = () => {
    b.remove();
    quizDemarre = false;
    questionIndex = 0; score = 0; recap = [];
    renderPanneauLateral();
    genererExercice();
  };
}

/* ---------------- Panneau latéral ---------------- */

function construireGroupeType(disabled = false) {
  const groupe = document.createElement('div');
  groupe.className = 'panel-groupe';

  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = 'Type';
  groupe.appendChild(label);

  const wrap = document.createElement('div');
  wrap.className = 'panel-groupe-paire';

  const options = [{ code: 'simple', label: 'Simple' }, { code: 'multiples', label: 'Multiples' }];
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn panel-btn-half' + (typesExerciceActifs.has(opt.code) ? ' active' : '');
    btn.textContent = opt.label;
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      if (typesExerciceActifs.has(opt.code)) {
        if (typesExerciceActifs.size > 1) { // garder au moins un actif
          typesExerciceActifs.delete(opt.code);
          btn.classList.remove('active');
        }
      } else {
        typesExerciceActifs.add(opt.code);
        btn.classList.add('active');
      }
      transition(genererExercice);
    });
    wrap.appendChild(btn);
  });
  groupe.appendChild(wrap);
  return groupe;
}

function construireGroupeMode(disabled = false) {
  const groupe = document.createElement('div');
  groupe.className = 'panel-groupe';

  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = "Mode d'affichage";
  groupe.appendChild(label);

  const wrap = document.createElement('div');
  wrap.className = 'panel-groupe-paire';

  const options = [{ code: 'abc', label: 'Lettres (x)' }, { code: '123', label: `Nombres (${XNUM})` }];
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn panel-btn-half' + (mode === opt.code ? ' active' : '');
    btn.textContent = opt.label;
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      if (mode === opt.code) return;
      mode = opt.code;
      renderPanneauLateral();
      transition(renderContent);
    });
    wrap.appendChild(btn);
  });
  groupe.appendChild(wrap);
  return groupe;
}

function construireBoutonVisu(disabled = false) {
  const groupe = document.createElement('div');
  groupe.className = 'panel-groupe';

  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = 'Affichage';
  groupe.appendChild(label);

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'panel-btn' + (visuActif ? ' active' : '');
  btn.textContent = '🎨 Situation visuelle';
  btn.disabled = disabled;
  btn.addEventListener('click', () => {
    visuActif = !visuActif;
    appliquerVisibiliteVisu();
    renderPanneauLateral();
  });
  groupe.appendChild(btn);
  return groupe;
}

function appliquerVisibiliteVisu() {
  const zone = document.getElementById('expression-zone');
  zone.classList.toggle('hidden-visu', !visuActif);
}

function construireBoutonRenoncer() {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'skipButton';
  btn.className = 'panel-btn';
  btn.textContent = 'Renoncer';
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    if (etatJeu === 'quiz' && quizDemarre && questionIndex < QUIZ_LENGTH) {
      recap.push("❌");
      questionIndex++;
      mettreAJourScore();
      if (questionIndex >= QUIZ_LENGTH) { transition(showBilan); return; }
    }
    transition(genererExercice);
  });
  return btn;
}

function construireLabelQuiz() {
  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = 'Quiz';
  return label;
}

function mettreAJourScore() {
  const progressElem = document.getElementById('question-progress');
  if (progressElem) progressElem.textContent = `Question ${Math.min(questionIndex + 1, QUIZ_LENGTH)}/${QUIZ_LENGTH}`;
  const scoreElem = document.getElementById('score');
  if (scoreElem) {
    scoreElem.textContent = `Score : ${score}`;
    scoreElem.classList.remove('pop');
    void scoreElem.offsetWidth;
    scoreElem.classList.add('pop');
  }
}

function renderPanneauLateral() {
  const panneau = document.getElementById('panneauLateral');
  if (!panneau) return;
  panneau.innerHTML = '';

  const verrouille = etatJeu === 'quiz' && quizDemarre;

  panneau.appendChild(construireGroupeType(verrouille));
  const filet0 = document.createElement('div');
  filet0.className = 'panel-filet';
  panneau.appendChild(filet0);

  panneau.appendChild(construireGroupeMode(verrouille));
  const filet1 = document.createElement('div');
  filet1.className = 'panel-filet';
  panneau.appendChild(filet1);

  panneau.appendChild(construireBoutonVisu(verrouille));
  const filet2 = document.createElement('div');
  filet2.className = 'panel-filet';
  panneau.appendChild(filet2);

  if (etatJeu === 'atelier') {
    const groupeAtelier = document.createElement('div');
    groupeAtelier.className = 'panel-groupe';
    const labelAtelier = document.createElement('div');
    labelAtelier.className = 'panel-groupe-label';
    labelAtelier.textContent = 'Question en cours :';
    groupeAtelier.appendChild(labelAtelier);
    groupeAtelier.appendChild(construireBoutonRenoncer());
    panneau.appendChild(groupeAtelier);

  } else if (etatJeu === 'quiz' && !quizDemarre) {
    panneau.appendChild(construireLabelQuiz());

    const btnCommencer = document.createElement('button');
    btnCommencer.type = 'button';
    btnCommencer.className = 'panel-btn active';
    btnCommencer.textContent = 'Commencer le Quiz';
    btnCommencer.addEventListener('click', () => {
      quizDemarre = true;
      questionIndex = 0; score = 0; recap = [];
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

    scoreContainer.append(progressDiv, scoreDiv, construireBoutonRenoncer());
    panneau.appendChild(scoreContainer);
    mettreAJourScore();
  }
}

/* ---------------- Header ---------------- */

function setupEtatToggle() {
  const conteneur = document.getElementById('topButtonsBar');
  if (!conteneur) return;

  const btnAtelier = document.createElement('button');
  btnAtelier.type = 'button';
  btnAtelier.textContent = 'Atelier';

  const btnQuiz = document.createElement('button');
  btnQuiz.type = 'button';
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
    questionIndex = 0; score = 0; recap = [];
    const bilan = document.getElementById('bilan-final');
    if (bilan) bilan.remove();
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

  if (window.FichePapier) {
    const fiche = new FichePapier();
    fiche.installerBouton(bandeau);
  }

  if (window.GuideCraies) {
    const guide = new GuideCraies();
    guide.installerBouton(bandeau);
  }
}

/* ---------------- Câblage ---------------- */

document.getElementById("check-btn").onclick = checkAnswer;
document.getElementById("answer").onkeyup = (e) => { if (e.key === "Enter") checkAnswer(); };

window.addEventListener("load", () => {
  construireHeader();
  renderPanneauLateral();
  appliquerVisibiliteVisu();
  if (window.MathJax) {
    MathJax.startup.promise.then(() => genererExercice());
  } else {
    genererExercice();
  }
});
