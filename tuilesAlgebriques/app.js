/* ==============================================
   app.js — quiz de développement d'expressions, aidé par une grille d'aire
   ----------------------------------------------
   Construit le header (bascule Atelier/Quiz) et le panneau latéral
   (type d'exercice, situation visuelle, valeur de x, Renoncer / score),
   et pilote la génération/vérification des exercices.

   Le visuel n'est PAS une longueur "x" conventionnelle fixe : x est un
   vrai nombre de cases, réglable par un curseur. Une case = 1 unité.
   Un coefficient devant x (ex : 3x) est donc littéralement 3 groupes de
   x cases collées (même teinte), et on peut faire varier x pour voir la
   grille se redessiner en direct — les coefficients de l'exercice, eux,
   restent fixes.

   Deux familles :
     - distrib  : n(ax+b)      -> n rangées identiques d'une bande de a
                  groupes de x cases suivie de b cases unité.
     - produit  : (ax+b)(cx+d) -> rectangle d'aire complet : a groupes de
                  x lignes, b lignes unité ; c groupes de x colonnes,
                  d colonnes unité.
================================================== */

const QUIZ_LENGTH = 10;
const X_MIN = 1, X_MAX = 9;

let typesExerciceActifs = new Set(['distrib', 'produit']); // multi-sélection, au moins un actif
let signesActifs = new Set(['avec', 'sans']); // soustraction : "avec" et "sans" peuvent être actifs ensemble (mélange)
let visuActif = true;      // affichage de la situation visuelle (grille)
let xValue = 3;            // valeur courante de x, réglable par le curseur
let isChecking = false;    // le bouton central est-il en mode "Suivant" ?

const EMOJI = { x2: '🟥', x: '🟦', unit: '🟨' };

let etatJeu = 'atelier';   // 'atelier' | 'quiz' — atelier : rien n'est compté, questions illimitées.
let quizDemarre = false;   // true une fois qu'on a cliqué "Commencer le Quiz"
let questionIndex = 0, score = 0, recap = [];

const randInt = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const updateMath = () => window.MathJax && MathJax.typesetPromise();

const toCAS = (e) => e
  .replace(/²/g, "^2")
  .replace(/\\times/g, "*")
  .replace(/·/g, "*")
  .replace(/\s+/g, "")
  .replace(/([0-9])([a-zA-Z])/g, "$1*$2")
  .replace(/−/g, "-")
  .trim();

const toTeX = (e) => e.replace(/\*/g, " \\times ").replace(/\s+/g, " ").trim();

/* ---------------- Génération des exercices ---------------- */

/** Tire un signe parmi ceux actifs dans le panneau ("avec"/"sans" soustraction) — si les deux
 *  sont actifs, mélange aléatoire ; sinon toujours le même, imposé par le seul actif. */
function tirerSigne() {
  const options = [];
  if (signesActifs.has('sans')) options.push('+');
  if (signesActifs.has('avec')) options.push('-');
  return options[Math.floor(Math.random() * options.length)];
}

function genDistrib() {
  const signe = tirerSigne();
  const b = signe === '+' ? randInt(1, 6) : randInt(1, 5);
  return { type: 'distrib', n: randInt(2, 5), a: randInt(1, 3), b, signe };
}

function genProduit() {
  const signeB = tirerSigne(), signeD = tirerSigne();
  const b = signeB === '+' ? randInt(1, 6) : randInt(1, 5);
  const d = signeD === '+' ? randInt(1, 6) : randInt(1, 5);
  return { type: 'produit', a: randInt(1, 3), b, signeB, c: randInt(1, 3), d, signeD };
}

function choisirTypeExercicePourExercice() {
  const actifs = [...typesExerciceActifs];
  return actifs[Math.floor(Math.random() * actifs.length)];
}

function generateExpression() {
  document.querySelectorAll(".section").forEach(s => s.classList.remove("hidden"));
  window.currentData = tirerUnExercice();
  renderContent();
}

/* ---------------- Géométrie de la grille (dépend de x) ---------------- */

/** rXg/cXg : nombre de groupes de x (lignes/colonnes) ; rUc/cUc : lignes/colonnes unité fixes. */
function computeCounts(geom, xVal) {
  const rowsXCells = geom.rXg * xVal, colsXCells = geom.cXg * xVal;
  return {
    rowsXCells, colsXCells,
    rowsTotal: rowsXCells + geom.rUc,
    colsTotal: colsXCells + geom.cUc
  };
}

function cellSizeFor(rowsTotal, colsTotal) {
  const maxW = 660, maxH = 300;
  const size = Math.floor(Math.min(maxW / colsTotal, maxH / rowsTotal));
  return Math.max(8, Math.min(46, size));
}

/* ---------------- Affichage principal : grille + bandes de mesure ---------------- */

const BORDURE_COULEUR = { x2: '#c62828', x: '#1976d2', unit: '#5a7a9a' };

/** Identifiant du groupe (bande x, ou case unité isolée) auquel appartient la ligne/colonne
 *  d'indice i — deux cases voisines dans le même groupe ne sont PAS séparées par une bordure ;
 *  chaque case unité est son propre groupe, chaque bande de x cases forme un seul groupe.
 *  Barrée ou non ne change rien ici : la croix est un simple contenu visuel, pas une frontière —
 *  une bande x reste UN SEUL bloc encadré, même si sa fin est soustraite. */
function groupId(i, xCellsCount, xVal) {
  return i < xCellsCount ? 'x' + Math.floor(i / xVal) : 'u' + i;
}

function buildEmojiGrid(geom, xVal) {
  const { rowsXCells, colsXCells, rowsTotal, colsTotal } = computeCounts(geom, xVal);
  const cs = cellSizeFor(rowsTotal, colsTotal);
  const croixRows = Math.min(geom.croixRows || 0, rowsXCells);
  const croixCols = Math.min(geom.croixCols || 0, colsXCells);

  const grid = document.createElement('div');
  grid.className = 'emoji-grid';
  grid.style.gridTemplateColumns = `repeat(${colsTotal}, ${cs}px)`;
  grid.style.gridTemplateRows = `repeat(${rowsTotal}, ${cs}px)`;

  const rGroups = Array.from({ length: rowsTotal }, (_, r) => groupId(r, rowsXCells, xVal));
  const cGroups = Array.from({ length: colsTotal }, (_, c) => groupId(c, colsXCells, xVal));

  for (let r = 0; r < rowsTotal; r++) {
    for (let c = 0; c < colsTotal; c++) {
      const isXRow = r < rowsXCells, isXCol = c < colsXCells;
      const type = (isXRow && isXCol) ? 'x2' : (isXRow || isXCol) ? 'x' : 'unit';
      const estCroix = (isXCol && c >= colsXCells - croixCols) || (isXRow && r >= rowsXCells - croixRows);

      const cell = document.createElement('div');
      cell.className = `cellule-emoji cellule-${type}` + (estCroix ? ' cellule-croix' : '');
      cell.style.fontSize = Math.max(8, cs * 0.65) + 'px';
      cell.textContent = cs >= 16 ? EMOJI[type] : '';

      // Bordure encadrant chaque groupe (case unité isolée, bande x, bande soustraite, ou
      // plaque x²) comme un seul bloc : deux bandes x voisines restent bien dissociées.
      const couleur = BORDURE_COULEUR[type];
      const epais = '2px solid ' + couleur;
      if (r === 0 || rGroups[r] !== rGroups[r - 1]) cell.style.borderTop = epais;
      if (r === rowsTotal - 1 || rGroups[r] !== rGroups[r + 1]) cell.style.borderBottom = epais;
      if (c === 0 || cGroups[c] !== cGroups[c - 1]) cell.style.borderLeft = epais;
      if (c === colsTotal - 1 || cGroups[c] !== cGroups[c + 1]) cell.style.borderRight = epais;

      grid.appendChild(cell);
    }
  }
  return { grid, cs, croixRows, croixCols, ...computeCounts(geom, xVal) };
}

const GRID_GAP = 1; // doit rester identique au "gap" de .emoji-grid en CSS

/** Largeur/hauteur exacte (px) d'un bloc de `count` cases de taille cs, gaps internes inclus —
 *  doit correspondre pile à ce que occupent ces mêmes cases dans la grille. */
function segmentSize(count, cs) {
  return count * cs + Math.max(0, count - 1) * GRID_GAP;
}

function makeMesure(count, xVal, isXBand) {
  const div = document.createElement('div');
  div.className = 'mesure ' + (isXBand ? 'mesure-x' : 'mesure-unit');
  const texte = isXBand ? (count > 1 ? `${count}x` : 'x') : `${count}`;
  div.innerHTML = `\\(${texte}\\)`;
  return div;
}

/** Bande invisible servant uniquement à décaler la bande de mesure d'une portion soustraite
 *  jusqu'à l'aplomb de sa position réelle dans la grille (elle est à la fin de la zone x). */
function makeEspaceur(sizePx, horizontal) {
  const div = document.createElement('div');
  div.style.visibility = 'hidden';
  if (horizontal) { div.style.width = sizePx + 'px'; div.style.height = '26px'; }
  else { div.style.height = sizePx + 'px'; div.style.width = '30px'; }
  return div;
}

/** Assemble bandes de mesure (haut, gauche, et bas/droite pour une portion soustraite) et
 *  grille dans un même repère. */
function buildAireAvecMesures(geom, xVal) {
  const wrapper = document.createElement('div');
  wrapper.className = 'aire-wrapper';

  const { grid, cs, rowsXCells, colsXCells, croixRows, croixCols } = buildEmojiGrid(geom, xVal);
  const hasBottom = croixCols > 0, hasRight = croixRows > 0;

  wrapper.style.gridTemplateRows = '26px max-content' + (hasBottom ? ' 26px' : '');
  wrapper.style.gridTemplateColumns = '30px max-content' + (hasRight ? ' 30px' : '');

  const top = document.createElement('div');
  top.className = 'mesures-top';
  if (geom.cXg > 0) {
    // La bande "x" couvre TOUTE la zone x (colsXCells), y compris sa portion soustraite plus
    // bas : ces cases restent des cases x à part entière, seulement barrées d'une croix.
    const div = makeMesure(geom.cXg, xVal, true);
    div.style.width = segmentSize(colsXCells, cs) + 'px';
    div.style.height = '26px';
    top.appendChild(div);
  }
  if (geom.cUc > 0) {
    const div = makeMesure(geom.cUc, xVal, false);
    div.style.width = segmentSize(geom.cUc, cs) + 'px';
    div.style.height = '26px';
    top.appendChild(div);
  }

  const left = document.createElement('div');
  left.className = 'mesures-left';
  if (geom.rXg > 0) {
    const div = makeMesure(geom.rXg, xVal, true);
    div.style.height = segmentSize(rowsXCells, cs) + 'px';
    div.style.width = '30px';
    left.appendChild(div);
  }
  if (geom.rUc > 0) {
    const div = makeMesure(geom.rUc, xVal, false);
    div.style.height = segmentSize(geom.rUc, cs) + 'px';
    div.style.width = '30px';
    left.appendChild(div);
  }
  wrapper.append(top, left, grid);

  if (hasBottom) {
    const bottom = document.createElement('div');
    bottom.className = 'mesures-bottom';

    const largeurRestante = colsTotalSansCroix(geom, xVal, croixCols);
    bottom.appendChild(makeEspaceur(segmentSize(largeurRestante, cs), true));

    const div = makeMesure(croixCols, xVal, false);
    div.style.width = segmentSize(croixCols, cs) + 'px';
    div.style.height = '26px';
    bottom.appendChild(div);
    wrapper.appendChild(bottom);
  }

  if (hasRight) {
    const right = document.createElement('div');
    right.className = 'mesures-right';

    const hauteurRestante = rowsTotalSansCroix(geom, xVal, croixRows);
    right.appendChild(makeEspaceur(segmentSize(hauteurRestante, cs), false));

    const div = makeMesure(croixRows, xVal, false);
    div.style.height = segmentSize(croixRows, cs) + 'px';
    div.style.width = '30px';
    right.appendChild(div);
    wrapper.appendChild(right);
  }

  return wrapper;
}

function colsTotalSansCroix(geom, xVal, croixCols) {
  return computeCounts(geom, xVal).colsTotal - croixCols;
}

function rowsTotalSansCroix(geom, xVal, croixRows) {
  return computeCounts(geom, xVal).rowsTotal - croixRows;
}

/** Redessine uniquement la partie visuelle (appelé par le curseur x, sans regénérer l'exercice). */
function renderVisuel() {
  const zone = document.getElementById("expression-zone");
  zone.innerHTML = "";
  if (!window.currentGeom) return;
  const wrap = document.createElement('div');
  wrap.appendChild(buildAireAvecMesures(window.currentGeom, xValue));
  zone.appendChild(wrap);
}

/* ---------------- Génération / rendu de l'exercice ---------------- */

/** Calcule l'énoncé LaTeX, la solution (forme CAS) et la géométrie de la grille pour un
 *  exercice donné — pure fonction, sans toucher au DOM (réutilisée par la fiche papier). */
function construireExprEtSolution(d) {
  let expr, solCAS, expectedXCount, geom, minX = X_MIN;

  if (d.type === 'distrib') {
    const coefA = d.a > 1 ? d.a : '';
    expr = `${d.n}(${coefA}x${d.signe}${d.b})`;
    const coeffX = d.n * d.a, cst = d.n * d.b;
    solCAS = `${coeffX}*x${d.signe}${cst}`;
    expectedXCount = 1;
    const negatif = d.signe === '-';
    geom = {
      rXg: 0, rUc: d.n, cXg: d.a,
      cUc: negatif ? 0 : d.b,
      croixCols: negatif ? d.b : 0,
      avecX2: false
    };
    if (negatif) minX = Math.ceil((d.b + 1) / d.a);
  } else {
    const coefA = d.a > 1 ? d.a : '', coefC = d.c > 1 ? d.c : '';
    expr = `(${coefA}x${d.signeB}${d.b})(${coefC}x${d.signeD}${d.d})`;

    const sB = d.signeB === '+' ? 1 : -1, sD = d.signeD === '+' ? 1 : -1;
    const coeffX2 = d.a * d.c;
    const coeffX = d.a * d.d * sD + d.c * d.b * sB;
    const cst = d.b * d.d * sB * sD;
    solCAS = `${coeffX2}*x^2` + (coeffX >= 0 ? '+' : '-') + `${Math.abs(coeffX)}*x` + (cst >= 0 ? '+' : '-') + `${Math.abs(cst)}`;
    expectedXCount = 2;

    const negB = d.signeB === '-', negD = d.signeD === '-';
    geom = {
      rXg: d.a, rUc: negB ? 0 : d.b, croixRows: negB ? d.b : 0,
      cXg: d.c, cUc: negD ? 0 : d.d, croixCols: negD ? d.d : 0,
      avecX2: true
    };
    if (negB) minX = Math.max(minX, Math.ceil((d.b + 1) / d.a));
    if (negD) minX = Math.max(minX, Math.ceil((d.d + 1) / d.c));
  }

  return { expr, solCAS, expectedXCount, geom, minX };
}

/** Tire un exercice complet (type + valeurs), selon les types actifs du panneau — sans
 *  toucher au DOM ; utilisé par le quiz courant et par la fiche papier. */
function tirerUnExercice() {
  const typeTire = choisirTypeExercicePourExercice();
  return typeTire === 'distrib' ? genDistrib() : genProduit();
}

function renderContent() {
  const d = window.currentData;
  const { expr, solCAS, expectedXCount, geom, minX } = construireExprEtSolution(d);

  window.currentGeom = geom;
  ajusterSlider(minX);
  renderVisuel();

  document.getElementById("translation").innerHTML = `\\[ ${expr} \\]`;
  window.currentSolution = solCAS;
  window.currentExpectedXCount = expectedXCount;

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
    equiv = [-3, 2, 5, 7].every(v => Math.abs(math.evaluate(user, { x: v }) - math.evaluate(sol, { x: v })) < 1e-9);
    reduite = !raw.includes('(') && !raw.includes(')') && (user.match(/x/g) || []).length <= window.currentExpectedXCount;
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

  // Règle absolue : on affiche exactement ce que l'élève a tapé (raw), jamais la version
  // normalisée pour le calcul (user) — pas de "*" implicite ajouté donc pas de "\times" ajouté.
  const latexAns = toTeX(raw);
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

  const options = [{ code: 'distrib', label: 'Distributivité' }, { code: 'produit', label: 'Produit de binômes' }];
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

function construireGroupeSigne(disabled = false) {
  const groupe = document.createElement('div');
  groupe.className = 'panel-groupe';

  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = 'Soustraction';
  groupe.appendChild(label);

  const wrap = document.createElement('div');
  wrap.className = 'panel-groupe-paire';

  const options = [{ code: 'avec', label: 'Avec' }, { code: 'sans', label: 'Sans' }];
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'panel-btn panel-btn-half' + (signesActifs.has(opt.code) ? ' active' : '');
    btn.textContent = opt.label;
    btn.disabled = disabled;
    btn.addEventListener('click', () => {
      if (signesActifs.has(opt.code)) {
        if (signesActifs.size > 1) { // garder au moins un actif ; les deux ensemble = mélange
          signesActifs.delete(opt.code);
          btn.classList.remove('active');
        }
      } else {
        signesActifs.add(opt.code);
        btn.classList.add('active');
      }
      transition(genererExercice);
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

/** Remonte le minimum du curseur x si l'exercice courant l'exige (ex : une soustraction n'a de
 *  sens visuel que si a×x reste supérieur au nombre soustrait). */
function ajusterSlider(minX) {
  const slider = document.getElementById('sliderX');
  if (!slider) return;
  slider.min = Math.max(X_MIN, minX);
  if (xValue < slider.min) {
    xValue = parseInt(slider.min, 10);
    slider.value = xValue;
    const label = document.getElementById('labelValeurX');
    if (label) label.textContent = `Valeur de x = ${xValue}`;
  }
}

function construireGroupeValeurX() {
  const groupe = document.createElement('div');
  groupe.className = 'panel-groupe';

  const label = document.createElement('div');
  label.className = 'panel-groupe-label';
  label.textContent = `Valeur de x = ${xValue}`;
  label.id = 'labelValeurX';
  groupe.appendChild(label);

  const input = document.createElement('input');
  input.type = 'range';
  input.id = 'sliderX';
  input.min = X_MIN;
  input.max = X_MAX;
  input.value = xValue;
  input.className = 'panel-slider';
  input.addEventListener('input', () => {
    xValue = parseInt(input.value, 10);
    label.textContent = `Valeur de x = ${xValue}`;
    renderVisuel();
    updateMath();
  });
  groupe.appendChild(input);
  return groupe;
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
  panneau.appendChild(construireGroupeSigne(verrouille));
  const filet0 = document.createElement('div');
  filet0.className = 'panel-filet';
  panneau.appendChild(filet0);

  panneau.appendChild(construireBoutonVisu(verrouille));
  panneau.appendChild(construireGroupeValeurX());
  const filet1 = document.createElement('div');
  filet1.className = 'panel-filet';
  panneau.appendChild(filet1);

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

  if (window.GuideTuiles) {
    const guide = new GuideTuiles();
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
