// ==============================================
// app.js — logique de l'appli "Algèbre — problèmes & schémas en barres"
// ------------------------------------------------------------
// L'élève lit un problème illustré par un schéma en barres où l'inconnue
// est notée x, puis répond en DEUX temps : d'abord l'expression qui donne
// x (ex: "x=88+20"), puis la valeur numérique de x.
// ==============================================

let problemeActuel = null;
let tailleActuelle = 'moyen';       // 'petit' | 'moyen' | 'grand' — ampleur des nombres
// Complexités actives : PLUSIEURS à la fois (pas exclusif, contrairement à
// Taille) — les formes tirées sont l'union de toutes les complexités
// cochées. Au moins une doit rester active (voir construireBoutonsComplexite).
let complexitesActuelles = new Set(['facile']);

// Forme (catégorie d'algèbre, ex: "somme") et contexte (nature de grandeur
// racontée, ex: "Prix") du problème courant, navigables via les sélecteurs
// Suivant/Aléatoire du panneau latéral (voir construireSelecteurCyclique).
// Chacun a son propre mode "aléatoire" (persistant : tant qu'il est actif,
// CHAQUE nouvelle question retire une nouvelle valeur au hasard — voir
// demarrerQuestion) ou "fixe" (la valeur reste constante d'une question à
// l'autre). "Aléatoire" est le mode de départ ; "Suivant" bascule en mode
// fixe et avance d'un cran.
let formeActuelle = null;
let natureActuelle = null;
let formeAleatoireActif = true;
let natureAleatoireActif = true;

function formesPourComplexites(complexitesId) {
  return Object.keys(FORMES).filter(id => complexitesId.has(FORMES[id].complexite) && HISTOIRES[id]);
}

function naturesPourForme(formeId) {
  return Object.keys(HISTOIRES[formeId]);
}

function choisirAleatoire(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

/** Passe à la forme suivante (ordre stable de FORMES) parmi celles de la
 *  complexité courante, et fige le mode sur "fixe". Le contexte peut ne
 *  plus être valide pour cette forme (ex: "Prix" n'existe pas pour
 *  "sommeTrois") — demarrerQuestion() le rattrape après coup. */
function formeSuivante() {
  formeAleatoireActif = false;
  const liste = formesPourComplexites(complexitesActuelles);
  const i = liste.indexOf(formeActuelle);
  formeActuelle = liste[(i + 1) % liste.length];
}

function reactiverFormeAleatoire() {
  formeAleatoireActif = true;
}

function contexteSuivant() {
  natureAleatoireActif = false;
  const liste = naturesPourForme(formeActuelle);
  const i = liste.indexOf(natureActuelle);
  natureActuelle = liste[(i + 1) % liste.length];
}

function reactiverContexteAleatoire() {
  natureAleatoireActif = true;
}

// Affichage énoncé / diagramme : les deux sont actifs à l'ouverture de
// l'appli (état initial, pas une valeur qu'on peut restaurer) — l'élève
// peut désactiver l'un des deux, jamais les deux à la fois.
let afficherEnonce = true;
let afficherDiagramme = true;

// Mode "Construction" : tant qu'il est actif ET que le schéma du problème
// courant n'a pas encore été validé, la zone diagramme montre l'atelier
// de reconstitution par glisser-déposer EN LIGNE (voir ConstructionSchema.js)
// au lieu du vrai schéma — ignore afficherDiagramme jusque-là. Dès que
// _valider() y juge le schéma correct, le vrai diagramme prend sa place
// (rendreProbleme) et la zone de réponse se révèle (synchroniserZoneReponse).
let modeConstructionActif = false;
let schemaConstruitValide = false;

let etatJeu = 'atelier';  // 'atelier' | 'quiz'
let quizDemarre = false;
let questionCount = 0;
let score = 0;

/** Rendu MathJax d'un nombre/grandeur/x isolé (schéma, badges, messages) :
 *  remplace le texte brut par du LaTeX inline, en confiant le typeset à
 *  l'appelant (une fois les éléments attachés au DOM) pour ne déclencher
 *  qu'une seule passe MathJax par écran. */
function ecrireLatex(el, latex) {
  el.innerHTML = `\\(${latex}\\)`;
}

function typesetMathJax(elements) {
  if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise(elements);
}

/** Construit le schéma en barres correspondant au problème courant.
 *  probleme.schema est une instance de SchemaBarres (SchemaBarres.js) :
 *  ce code se contente de la parcourir et de demander à chaque segment
 *  son rendu LaTeX (SegmentSchema#toLatex), sans connaître les détails
 *  de la catégorie de problème qui l'a construit. La forme (déjà
 *  compacte : [première, "...", dernière] pour un groupe répété, voir
 *  SchemaBarres#ajouterGroupeRepete) est fournie telle quelle, rien à
 *  abréger ici. */
function rendreSchema(probleme) {
  const carte = document.createElement('div');
  carte.className = 'schema-carte';

  const label = document.createElement('div');
  label.className = 'schema-carte-label';
  label.textContent = 'Schéma : ';
  carte.appendChild(label);

  const { total, parts } = probleme.schema;

  // produit / quotient / compte : un "..." porte lui-même son compte de
  // répétitions (SegmentSchema#compteLatex) -> flèche double + badge
  // au-dessus, visuel distinct (ce n'est pas une valeur de segment).
  // Badge et flèche ne couvrent que le GROUPE auquel appartient ce "..."
  // (les segments contigus de même couleur, en partant du début) — pas
  // les segments ajoutés après (ex: l'objet isolé de produitSomme).
  const indexEllipsis = parts.findIndex(p => p.ellipsis);
  if (indexEllipsis !== -1) {
    const couleurGroupe = parts[indexEllipsis].couleur;
    let tailleGroupe = 0;
    while (tailleGroupe < parts.length && parts[tailleGroupe].couleur === couleurGroupe) tailleGroupe++;
    const largeurGroupePct = (tailleGroupe / parts.length) * 100;

    const badge = document.createElement('div');
    badge.className = 'schema-repet-badge';
    badge.style.width = `${largeurGroupePct}%`;
    ecrireLatex(badge, `\\times ${parts[indexEllipsis].compteLatex()}`);
    carte.appendChild(badge);

    const fleche = document.createElement('div');
    fleche.className = 'schema-repet-fleche';
    fleche.style.width = `${largeurGroupePct}%`;
    fleche.appendChild(document.createElement('div')).className = 'schema-repet-ligne';
    carte.appendChild(fleche);
  }

  const barreParts = document.createElement('div');
  barreParts.className = 'schema-parts';
  parts.forEach(p => {
    const seg = document.createElement('div');
    if (p.ellipsis) {
      seg.className = 'schema-segment schema-segment-ellipsis';
      if (p.couleur) seg.style.backgroundColor = p.couleur;
      seg.textContent = '…';
    } else {
      seg.className = 'schema-segment ' + (p.connue ? 'connue' : 'inconnue');
      // La couleur identifie la partie du tout matériel que compose ce
      // segment — connu ou non, x prend la couleur de ce qu'il compose
      // (texte toujours noir, voir style.css).
      if (p.couleur) seg.style.backgroundColor = p.couleur;
      ecrireLatex(seg, p.toLatex());
    }
    barreParts.appendChild(seg);
  });
  carte.appendChild(barreParts);

  const barreTotal = document.createElement('div');
  barreTotal.className = 'schema-total';
  const segTotal = document.createElement('div');
  // Le total reste toujours blanc/neutre, connu ou non : il représente
  // l'ensemble, pas une partie particulière du tout matériel.
  segTotal.className = 'schema-segment ' + (total.connue ? 'connue' : 'inconnue');
  ecrireLatex(segTotal, total.toLatex());
  barreTotal.appendChild(segTotal);
  carte.appendChild(barreTotal);

  return carte;
}

function rendreProbleme() {
  const intro = document.getElementById('problemeIntro');
  const grille = document.getElementById('problemeGrille');
  if (!intro || !grille) return;

  intro.style.display = afficherEnonce ? '' : 'none';
  if (afficherEnonce) {
    intro.innerHTML = '';
    // Label sur sa propre ligne, aligné à gauche — même forme que
    // "Schéma : " et "Résolution : " (voir rendreSchema/ReponseSchema),
    // pour que les trois soient calés ensemble.
    const label = document.createElement('div');
    label.className = 'probleme-intro-label';
    label.textContent = 'Énoncé : ';
    intro.appendChild(label);

    const texte = document.createElement('div');
    texte.className = 'probleme-intro-texte';
    texte.appendChild(document.createTextNode(problemeActuel.enonce + ' On note '));
    const xInline = document.createElement('span');
    ecrireLatex(xInline, 'x');
    texte.appendChild(xInline);
    texte.appendChild(document.createTextNode(` ${problemeActuel.xDescription}.`));
    intro.appendChild(texte);

    typesetMathJax([intro]);
  } else {
    intro.textContent = '';
  }

  grille.innerHTML = '';
  if (modeConstructionActif && !schemaConstruitValide) {
    // Tant que le schéma n'est pas validé : l'atelier de reconstitution
    // EN LIGNE (voir ConstructionSchema.js) à la place du diagramme —
    // ignore afficherDiagramme jusque-là.
    grille.style.display = '';
    if (window.constructionSchema) {
      grille.appendChild(window.constructionSchema.construireVue(problemeActuel, () => {
        // Validé : le vrai diagramme prend la place de l'atelier, et la
        // zone de réponse (x = ...) peut enfin se révéler. afficherDiagramme
        // avait été mis à false en entrant en Construction (voir
        // construireBoutonsAffichage) : sans le repasser à true ici, la
        // branche else ci-dessous masquerait la grille et n'afficherait rien.
        schemaConstruitValide = true;
        afficherDiagramme = true;
        renderPanneauLateral();
        rendreProbleme();
        synchroniserZoneReponse();
      }));
      typesetMathJax([grille]);
    }
  } else if (modeConstructionActif && schemaConstruitValide) {
    // Schéma tel que l'élève l'a CONSTRUIT et validé (voir figerCarte,
    // ConstructionSchema.js) — pas rendreSchema(problemeActuel), qui
    // régénérerait l'ordre canonique des parts et pourrait donc afficher
    // un agencement différent de celui que l'élève a réellement posé.
    grille.style.display = afficherDiagramme ? '' : 'none';
    if (afficherDiagramme && window.constructionSchema) {
      grille.appendChild(window.constructionSchema.figerCarte());
    }
  } else {
    grille.style.display = afficherDiagramme ? '' : 'none';
    if (afficherDiagramme) {
      grille.appendChild(rendreSchema(problemeActuel));
      typesetMathJax([grille]);
    }
  }
}

/** Garde #inputContainer synchronisé avec l'état construction/validation :
 *  la zone de réponse (x = ...) n'apparaît qu'en mode normal, ou en mode
 *  Construction une fois le schéma validé — jamais avant. Appelée aux
 *  points où l'un de ces deux états change (nouvelle question, bascule
 *  du mode Construction, validation réussie) — PAS depuis rendreProbleme()
 *  lui-même, qui tourne aussi pour Énoncé/Diagramme et détruirait sinon
 *  une réponse déjà en cours de saisie. */
function synchroniserZoneReponse() {
  const cont = document.getElementById('inputContainer');
  const doitAfficher = !modeConstructionActif || schemaConstruitValide;
  const dejaAffichee = cont.hasChildNodes();
  if (doitAfficher && !dejaAffichee) {
    new ReponseSchema(cont);
  } else if (!doitAfficher && dejaAffichee) {
    cont.innerHTML = '';
  }
}

/**
 * Zone de réponse en deux temps : d'abord l'expression pour x, puis la
 * valeur numérique. Réutilise comparerExpressionSchema / validerValeurSchema
 * de ProblemeSchema.js — aucun calcul n'est réinventé ici.
 */
class ReponseSchema {
  constructor(container) {
    this.container = container;
    this.etape = 'expression'; // 'expression' | 'valeur'
    this.expressionValidee = null;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'probleme-carte reponse-carte';

    const resolutionLabel = document.createElement('div');
    resolutionLabel.className = 'reponse-resolution-label';
    resolutionLabel.textContent = 'Résolution : ';

    this.labelDiv = document.createElement('div');
    this.labelDiv.className = 'reponse-etape-label';

    // Étapes déjà validées : rendu MathJax figé, une ligne par étape,
    // dans la forme exacte tapée par l'élève (jamais reformatée).
    this.frozenDiv = document.createElement('div');
    this.frozenDiv.className = 'reponse-frozen';

    this.ligne = document.createElement('div');
    this.ligne.className = 'reponse-ligne';

    this.prefixe = document.createElement('span');
    this.prefixe.className = 'reponse-prefixe';

    this.input = document.createElement('input');
    this.input.type = 'text';
    this.input.className = 'reponse-input';
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.valider();
    });

    const btnValider = document.createElement('button');
    btnValider.type = 'button';
    btnValider.className = 'constructeur-valider';
    btnValider.textContent = 'Valider';
    btnValider.onclick = () => this.valider();

    this.ligne.append(this.prefixe, this.input, btnValider);

    this.feedbackDiv = document.createElement('div');
    this.feedbackDiv.className = 'constructeur-feedback';

    this.wrapper.append(resolutionLabel, this.labelDiv, this.frozenDiv, this.ligne, this.feedbackDiv);
    this.container.appendChild(this.wrapper);

    this._rafraichirEtape();
    this.input.focus();
  }

  _rafraichirEtape() {
    if (this.etape === 'expression') {
      this.labelDiv.textContent = "Étape 1 — Écris l'expression qui donne x";
      this.input.placeholder = 'expression';
    } else {
      this.labelDiv.textContent = 'Étape 2 — Calcule la valeur de x';
      this.input.placeholder = 'calcul ou valeur';
    }
    ecrireLatex(this.prefixe, 'x=');
    typesetMathJax([this.prefixe]);
  }

  _afficherFeedback(texte, classe) {
    this.feedbackDiv.className = 'constructeur-feedback ' + classe;
    this.feedbackDiv.textContent = texte;
  }

  /** Fige une étape validée en rendu MathJax (même taille que la saisie),
   *  dans la forme exacte tapée par l'élève — jamais reformatée. Tout le
   *  "x=..." est un seul bloc LaTeX (pas de span "x =" à part) pour que le
   *  x garde le même style italique que partout ailleurs dans l'appli. */
  _figerLigne(latex) {
    const ligne = document.createElement('div');
    ligne.className = 'reponse-frozen-ligne';
    ecrireLatex(ligne, `x=${latex}`);
    this.frozenDiv.appendChild(ligne);
    typesetMathJax([ligne]);
  }

  valider() {
    const texte = this.input.value.trim();
    if (!texte) {
      this._afficherFeedback('Tape une réponse.', 'erreur');
      return;
    }

    if (this.etape === 'expression') {
      const statut = comparerExpressionSchema(texte, problemeActuel);
      if (statut === 'invalide') {
        this._afficherFeedback('Expression invalide.', 'erreur');
        return;
      }
      if (statut === 'faux') {
        this._afficherFeedback("Ce n'est pas la bonne expression pour cette situation.", 'erreur');
        return;
      }
      this.expressionValidee = texte.replace(/\s+/g, '');
      this._figerLigne(expressionVersLatex(this.expressionValidee));
      this.etape = 'valeur';
      this.input.value = '';
      this._afficherFeedback('', '');
      this._rafraichirEtape();
      this.input.focus();
      return;
    }

    // étape 'valeur' : le calcul peut se faire en plusieurs fois. Tant que
    // l'élève tape encore une expression (ex: "(61-4):3", puis "45:3"),
    // elle est acceptée telle quelle — figée, nouvel input — SANS être
    // comparée à la réponse. Seule une valeur finale (un seul nombre,
    // plus d'opérateur) déclenche la vraie validation.
    if (!estValeurFinale(texte)) {
      const statutEtape = validerEtapeIntermediaire(texte);
      if (statutEtape === 'invalide') {
        this._afficherFeedback('Calcul invalide.', 'erreur');
        return;
      }
      this._figerLigne(expressionVersLatex(texte.trim()));
      this.input.value = '';
      this._afficherFeedback('', '');
      this.input.focus();
      return;
    }

    const statut = validerValeurSchema(texte, problemeActuel);
    if (statut === 'invalide') {
      this._afficherFeedback('Réponse invalide (nombre attendu).', 'erreur');
      return;
    }
    if (statut === 'faux') {
      this._afficherFeedback("Ce n'est pas la bonne valeur.", 'erreur');
      return;
    }

    this._figerLigne(expressionVersLatex(texte.trim()));
    this.ligne.remove();
    this._afficherFeedback('', '');
    afficherVictoire(this.container);
  }
}

function afficherVictoire(container) {
  const bloc = document.createElement('div');
  bloc.className = 'victoire-bloc';
  bloc.innerHTML = `🎉 Bien joué ! \\(x = ${problemeActuel.inconnue.toLatex()}\\).`;
  container.appendChild(bloc);
  typesetMathJax([bloc]);

  const div = document.createElement('div');
  div.className = 'center-button';
  const b = document.createElement('button');
  b.textContent = etatJeu === 'quiz' ? 'Suivant (Entrée)' : 'Nouveau problème (Entrée)';
  b.onclick = () => {
    if (etatJeu === 'quiz') {
      score++;
      updateScoreDisplay();
    }
    demarrerQuestion();
  };
  div.appendChild(b);
  container.appendChild(div);

  const skipBtn = document.getElementById('skipButton');
  if (skipBtn) skipBtn.style.display = 'none';
}

function demarrerQuestion() {
  if (etatJeu === 'quiz' && !quizDemarre) return;
  if (etatJeu === 'quiz' && questionCount >= 10) { showScore(); return; }

  // Mode "aléatoire" persistant : tant qu'il est actif, chaque nouvelle
  // question retire une nouvelle valeur — c'est ce qui distingue "aléatoire"
  // (relancé ici à chaque question) de "fixe" (formeSuivante/contexteSuivant
  // ont déjà positionné la valeur, on n'y touche pas).
  if (formeAleatoireActif) formeActuelle = choisirAleatoire(formesPourComplexites(complexitesActuelles));
  const naturesValides = naturesPourForme(formeActuelle);
  if (natureAleatoireActif || !naturesValides.includes(natureActuelle)) {
    natureActuelle = choisirAleatoire(naturesValides);
  }

  const niveau = NIVEAUX_SCHEMA[tailleActuelle] || NIVEAUX_SCHEMA.moyen;
  demarrerExercice(genererProblemeDepuis(formeActuelle, natureActuelle, niveau));

  if (etatJeu === 'quiz') {
    questionCount++;
    updateScoreDisplay();
  }
  setupSkipButton();
}

function updateScoreDisplay() {
  const progressElem = document.getElementById('question-progress');
  if (progressElem) progressElem.textContent = `Question ${questionCount}/10`;
  const sElem = document.getElementById('score');
  if (sElem) sElem.textContent = `Score : ${score}`;
}

function setupSkipButton() {
  const skipBtn = document.getElementById('skipButton');
  if (skipBtn) {
    skipBtn.style.display = 'block';
    skipBtn.onclick = (e) => { e.preventDefault(); demarrerQuestion(); };
  }
}

function showScore() {
  const skipBtn = document.getElementById('skipButton');
  if (skipBtn) skipBtn.style.display = 'none';

  const cont = document.getElementById('inputContainer');
  const grille = document.getElementById('problemeGrille');
  const intro = document.getElementById('problemeIntro');
  if (grille) grille.innerHTML = '';
  if (intro) intro.textContent = '';
  if (!cont) return;

  cont.innerHTML = '';
  const bloc = document.createElement('div');
  bloc.className = 'fin-quiz';

  const titre = document.createElement('h2');
  titre.className = 'fin-quiz-titre';
  titre.textContent = 'Quiz terminé';

  const scoreFinal = document.createElement('div');
  scoreFinal.className = 'fin-quiz-score';
  scoreFinal.textContent = `${score} / ${questionCount}`;

  const btn = document.createElement('button');
  btn.className = 'restart-btn';
  btn.textContent = 'Recommencer';
  btn.onclick = () => location.reload();

  bloc.append(titre, scoreFinal, btn);
  cont.appendChild(bloc);
}

function construireBoutonsTaille(disabled = false) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';
  const tailles = [
    { id: 'petit', label: 'Petits' },
    { id: 'moyen', label: 'Moyens' },
    { id: 'grand', label: 'Grands' },
  ];
  tailles.forEach(n => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'param-btn' + (n.id === tailleActuelle ? ' active' : '');
    btn.disabled = disabled;
    btn.textContent = n.label;
    btn.onclick = () => {
      tailleActuelle = n.id;
      [...conteneur.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      demarrerQuestion();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

/** Réglage indépendant de la taille des nombres : choisit PARMI QUELLES
 *  catégories de problèmes on tire (voir complexite dans ProblemeSchema.js). */
function construireBoutonsComplexite(disabled = false) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';
  const complexites = [
    { id: 'facile', label: 'Facile' },
    { id: 'moyen', label: 'Moyen' },
    { id: 'difficile', label: 'Difficile' },
    { id: 'difficile+', label: 'Difficile+' },
  ];
  complexites.forEach(n => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'param-btn' + (complexitesActuelles.has(n.id) ? ' active' : '');
    btn.disabled = disabled;
    btn.textContent = n.label;
    btn.onclick = () => {
      const estActif = complexitesActuelles.has(n.id);
      if (estActif && complexitesActuelles.size === 1) return; // au moins une complexité active
      if (estActif) complexitesActuelles.delete(n.id);
      else complexitesActuelles.add(n.id);
      btn.classList.toggle('active');

      // En mode "aléatoire", demarrerQuestion() retire déjà une forme
      // parmi celles désormais cochées. En mode "fixe", la forme figée
      // peut ne plus exister dans cet ensemble -> on la rattrape.
      if (!formeAleatoireActif && !formesPourComplexites(complexitesActuelles).includes(formeActuelle)) {
        formeActuelle = choisirAleatoire(formesPourComplexites(complexitesActuelles));
      }
      demarrerQuestion();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

/** Bascule indépendante énoncé / diagramme (pas un choix exclusif comme le
 *  niveau) — au moins l'un des deux doit rester actif. */
/** Énoncé est une bascule indépendante (la zone schéma/construction
 *  affiche toujours quelque chose, jamais les deux zones vides à la
 *  fois — plus besoin de contrainte "au moins un actif"). Schéma et
 *  Construction s'excluent mutuellement : exactement l'un des deux est
 *  actif, cliquer sur l'un bascule sur lui et désactive l'autre —
 *  recliquer sur celui déjà actif ne fait rien (comme des boutons radio). */
function construireBoutonsAffichage(disabled = false) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';

  // Schéma et Construction se partagent la même zone (la grille) et ne
  // peuvent donc jamais être visibles tous les deux à la fois : activer
  // l'un désactive systématiquement l'autre. Énoncé est indépendant, sauf
  // pendant Construction où il est verrouillé actif (l'atelier a besoin
  // des valeurs de l'énoncé pour savoir quelles tuiles proposer — voir
  // ConstructionSchema.js). Contrainte commune : il faut toujours au
  // moins un élément visible (Énoncé, ou la zone schéma/construction).
  const btnEnonce = document.createElement('button');
  btnEnonce.type = 'button';
  btnEnonce.className = 'param-btn' + (afficherEnonce ? ' active' : '');
  btnEnonce.disabled = disabled;
  btnEnonce.textContent = 'Énoncé';
  btnEnonce.onclick = () => {
    if (modeConstructionActif) return; // verrouillé actif pendant Construction
    if (afficherEnonce && !afficherDiagramme) return; // dernier élément visible
    afficherEnonce = !afficherEnonce;
    btnEnonce.classList.toggle('active');
    rendreProbleme();
  };
  conteneur.appendChild(btnEnonce);

  const btnSchema = document.createElement('button');
  btnSchema.type = 'button';
  btnSchema.className = 'param-btn' + (afficherDiagramme ? ' active' : '');
  btnSchema.disabled = disabled;
  btnSchema.textContent = 'Schéma';
  btnSchema.onclick = () => {
    if (modeConstructionActif) {
      // On quitte Construction pour afficher le schéma normal.
      modeConstructionActif = false;
      schemaConstruitValide = false;
      afficherDiagramme = true;
    } else {
      if (afficherDiagramme && !afficherEnonce) return; // dernier élément visible
      afficherDiagramme = !afficherDiagramme;
    }
    renderPanneauLateral();
    rendreProbleme();
    synchroniserZoneReponse();
  };
  conteneur.appendChild(btnSchema);

  const btnConstruction = document.createElement('button');
  btnConstruction.type = 'button';
  btnConstruction.className = 'param-btn' + (modeConstructionActif ? ' active' : '');
  btnConstruction.disabled = disabled;
  btnConstruction.textContent = 'Construction';
  btnConstruction.onclick = () => {
    modeConstructionActif = !modeConstructionActif;
    schemaConstruitValide = false;
    if (modeConstructionActif) {
      afficherEnonce = true;
      afficherDiagramme = false;
    }
    // La désactiver ne touche pas Schéma : il reste éteint, Énoncé
    // (resté actif) suffit à respecter la contrainte de visibilité.
    renderPanneauLateral();
    rendreProbleme();
    synchroniserZoneReponse();
  };
  conteneur.appendChild(btnConstruction);

  return conteneur;
}

/** Suivant/Aléatoire, réutilisé pour Forme et Contexte : pas de texte
 *  affichant la valeur courante (l'énoncé du problème la raconte déjà),
 *  juste deux boutons d'action — trop d'options (14 formes) pour un
 *  bouton par choix comme Taille/Complexité. "Aléatoire" est un mode
 *  persistant (voir demarrerQuestion) et se colore comme actif tant qu'il
 *  l'est ; "Suivant" le désactive et avance d'un cran en mode fixe. */
function construireSelecteurCyclique({ estAleatoireActif, onSuivant, onAleatoire, disabled = false }) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';

  // On refait tout le panneau après chaque clic (plutôt que de ne changer
  // qu'un bouton) : changer la forme peut changer le contexte aussi, donc
  // le sélecteur Contexte doit se rafraîchir en même temps.
  const btnSuivant = document.createElement('button');
  btnSuivant.type = 'button';
  btnSuivant.className = 'param-btn';
  btnSuivant.disabled = disabled;
  btnSuivant.textContent = 'Suivant';
  btnSuivant.onclick = () => { onSuivant(); renderPanneauLateral(); demarrerQuestion(); };

  const btnAleatoire = document.createElement('button');
  btnAleatoire.type = 'button';
  btnAleatoire.className = 'param-btn' + (estAleatoireActif() ? ' active' : '');
  btnAleatoire.disabled = disabled;
  btnAleatoire.textContent = 'Aléatoire';
  btnAleatoire.onclick = () => { onAleatoire(); renderPanneauLateral(); demarrerQuestion(); };

  conteneur.append(btnSuivant, btnAleatoire);
  return conteneur;
}

function setupBoutonNouvelOnglet() {
  const conteneur = document.getElementById("topButtonsBar");
  if (!conteneur) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'btn-header';
  btn.textContent = 'Nouvel onglet';

  const repli = document.createElement('span');
  repli.style.display = 'none';
  repli.style.fontSize = '0.8em';
  repli.style.marginLeft = '8px';
  repli.innerHTML = `Bloqué ici — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

  btn.onclick = () => {
    const nouvelOnglet = window.open(window.location.href, "_blank", "noopener");
    if (!nouvelOnglet) repli.style.display = 'inline';
  };

  conteneur.appendChild(btn);
  conteneur.appendChild(repli);
}

function demarrerExercice(probleme) {
  problemeActuel = probleme;
  schemaConstruitValide = false;

  document.getElementById('inputContainer').innerHTML = '';
  synchroniserZoneReponse();

  rendreProbleme();
}

function renderPanneauLateral() {
  const panneau = document.getElementById('panneauLateral');
  if (!panneau) return;
  panneau.innerHTML = '';

  const ajouterFilet = () => {
    const f = document.createElement('div');
    f.className = 'panel-filet';
    panneau.appendChild(f);
  };

  const ajouterGroupe = (label, contenu) => {
    const groupe = document.createElement('div');
    groupe.className = 'panel-groupe';
    const lbl = document.createElement('div');
    lbl.className = 'panel-groupe-label';
    lbl.textContent = label;
    groupe.appendChild(lbl);
    groupe.appendChild(contenu);
    panneau.appendChild(groupe);
  };

  const verrouille = etatJeu === 'quiz' && quizDemarre;

  ajouterGroupe('Taille des nombres', construireBoutonsTaille(verrouille));
  ajouterFilet();
  ajouterGroupe('Complexité', construireBoutonsComplexite(verrouille));
  ajouterFilet();
  ajouterGroupe('Forme', construireSelecteurCyclique({
    estAleatoireActif: () => formeAleatoireActif,
    onSuivant: formeSuivante,
    onAleatoire: reactiverFormeAleatoire,
    disabled: verrouille,
  }));
  ajouterFilet();
  ajouterGroupe('Contexte', construireSelecteurCyclique({
    estAleatoireActif: () => natureAleatoireActif,
    onSuivant: contexteSuivant,
    onAleatoire: reactiverContexteAleatoire,
    disabled: verrouille,
  }));
  ajouterFilet();
  ajouterGroupe('Affichage', construireBoutonsAffichage(verrouille));
  ajouterFilet();

  if (etatJeu === 'atelier') {
    const labelAtelier = document.createElement('div');
    labelAtelier.className = 'panel-groupe-label';
    labelAtelier.textContent = 'Question en cours :';
    panneau.appendChild(labelAtelier);

    const skipBtn = document.createElement('button');
    skipBtn.id = 'skipButton';
    skipBtn.className = 'panel-btn';
    skipBtn.textContent = 'Renoncer';
    panneau.appendChild(skipBtn);
    setupSkipButton();

  } else if (etatJeu === 'quiz' && !quizDemarre) {
    const labelQuiz = document.createElement('div');
    labelQuiz.className = 'panel-groupe-label';
    labelQuiz.textContent = 'Quiz';
    panneau.appendChild(labelQuiz);

    const btnCommencer = document.createElement('button');
    btnCommencer.type = 'button';
    btnCommencer.className = 'panel-btn accent';
    btnCommencer.textContent = 'Commencer le Quiz';
    btnCommencer.onclick = () => {
      quizDemarre = true;
      questionCount = 0;
      score = 0;
      renderPanneauLateral();
      demarrerQuestion();
    };
    panneau.appendChild(btnCommencer);

  } else { // quiz && quizDemarre
    const labelQuiz = document.createElement('div');
    labelQuiz.className = 'panel-groupe-label';
    labelQuiz.textContent = 'Quiz';
    panneau.appendChild(labelQuiz);

    const scoreContainer = document.createElement('div');
    scoreContainer.id = 'score-container';

    const progressDiv = document.createElement('div');
    progressDiv.id = 'question-progress';
    progressDiv.textContent = `Question ${questionCount}/10`;

    const scoreDiv = document.createElement('div');
    scoreDiv.id = 'score';
    scoreDiv.textContent = `Score : ${score}`;

    const skipBtn = document.createElement('button');
    skipBtn.id = 'skipButton';
    skipBtn.className = 'panel-btn';
    skipBtn.textContent = 'Renoncer';

    scoreContainer.append(progressDiv, scoreDiv, skipBtn);
    panneau.appendChild(scoreContainer);
    setupSkipButton();
  }
}

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
    questionCount = 0;
    score = 0;
    document.getElementById('inputContainer').innerHTML = '';
    document.getElementById('problemeGrille').innerHTML = '';
    document.getElementById('problemeIntro').textContent = '';
    majClasses();
    renderPanneauLateral();
    demarrerQuestion();
  };

  btnAtelier.onclick = () => basculer('atelier');
  btnQuiz.onclick = () => basculer('quiz');

  const filet = document.createElement('div');
  filet.className = 'filet-header';

  conteneur.append(btnAtelier, btnQuiz, filet);
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const nextBtn = document.querySelector(".center-button button");
    if (nextBtn && e.target.tagName !== "INPUT") {
      e.preventDefault();
      nextBtn.click();
    }
  }
});

window.onload = () => {
  setupEtatToggle();
  renderPanneauLateral();
  setupBoutonNouvelOnglet();
  if (typeof FicheProblemes === 'function') {
    const fiche = new FicheProblemes();
    fiche.installerBouton(document.getElementById('topButtonsBar'));
  }
  if (typeof ConstructionSchema === 'function') {
    window.constructionSchema = new ConstructionSchema();
  }
  if (typeof GuideAlgebreSchema === 'function') {
    const guide = new GuideAlgebreSchema();
    guide.installerBouton(document.getElementById('topButtonsBar'));
  }

  demarrerQuestion();
};
