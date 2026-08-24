// ==============================================
// app.js — logique de l'appli "Algèbre — deux pesées (facile)"
// ------------------------------------------------------------
// Variante beginner-friendly d'algebre/ : au lieu de taper une égalité
// algébrique ("3a+5b=3380g"), l'élève construit sa pesée avec des boutons
// de comptage (nombre de chaque fruit), voit l'aperçu visuel se mettre à
// jour en direct, puis tape la masse totale qu'il pense correcte — un
// nombre, ou une expression à calculer ("500g+50g") si le mode "Avec
// calcul" est actif.
// ==============================================

let peseeActuelle = null;
let niveauActuel = 'moyen';
let themeActuel = 'masse'; // 'masse' | 'point' — exclusif : bascule la banque d'illustrations, l'unité et le vocabulaire
let modeSaisie = 'construction'; // 'construction' (compteurs +/-) | 'equation' (taper directement "3a+2b=560g")
let calculActif = true; // true : masse totale affichée directement — false : détail de l'addition
let expressionObligatoire = false; // true : la masse tapée doit combiner mass1 et mass2 (pas un nombre libre)
let aTrouve = false;
let bTrouve = false;
let cartesSupplementaires = []; // [{n, m}, ...] pesées construites par l'élève

let etatJeu = 'atelier';  // 'atelier' | 'quiz' — atelier : illimité, rien n'est compté.
let quizDemarre = false;  // true une fois qu'on a cliqué "Commencer le Quiz"
let questionCount = 0;
let score = 0;

const COMPTEUR_MAX = 20;

/** Remet aTrouve/bTrouve à zéro, sauf pour la variable donnée directement
 *  par la pesée en cours (niveau "Très facile") : elle est déjà connue, pas
 *  à re-découvrir. */
function reinitialiserTrouve() {
  aTrouve = peseeActuelle?.donnee === 'a';
  bTrouve = peseeActuelle?.donnee === 'b';
}

/** Thème courant (voir THEMES dans Pesee.js). */
function theme() {
  return THEMES[themeActuel];
}

/** Construit une vraie Grandeur — masse en grammes (thème "Masse"), ou
 *  nombre nu (thème "Point", sans unité) — évite tout formatage fait main :
 *  l'affichage passe toujours par Grandeur.toString(). */
function valeur(n) {
  return new Grandeur(new Nombre(String(n)), theme().unite ? { g: 1 } : {});
}

/** Texte affiché pour une valeur (masse ou score), avec le suffixe du
 *  thème courant (ex: " pts" en mode "Point", rien en mode "Masse" — déjà
 *  inclus dans le "g" de Grandeur). */
function formaterValeur(n) {
  return valeur(n).toString() + theme().suffixeAffichage;
}

/** Habillage purement visuel d'une expression tapée par l'élève (les
 *  symboles ASCII * et : deviennent × et ÷) — ne change jamais sa valeur.
 *  ":" est le symbole de division reconnu par le moteur (ObjetString),
 *  pas "/". */
function cosmetique(texte) {
  return String(texte).trim().replace(/\*/g, '×').replace(/:/g, '÷');
}

/** Colore systématiquement les occurrences autonomes de "a" (rouge) et "b"
 *  (vert) dans un texte, sans toucher aux lettres faisant partie d'un autre
 *  mot ou d'une unité (ex: le "a" de "dag" reste noir). Échappe le texte
 *  source avant d'y injecter les balises — à utiliser avec innerHTML.
 *  Utilisé par Fiche.js pour l'énoncé papier ("On note a la masse..."). */
function colorerLettres(texte) {
  const echappe = String(texte)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return echappe.replace(/(?<![a-zA-Z])([ab])(?![a-zA-Z])/g, (m, lettre) => `<span class="var-${lettre}">${lettre}</span>`);
}

/**
 * Vérifie si le texte tapé par l'élève pour la masse (un nombre, ou une
 * expression comme "500g+50g", "6*80") vaut bien masseAttendueGrammes.
 * Aucune inconnue a/b ici (juste une masse concrète à calculer) : on
 * réutilise directement pretraiterMembre (pour l'injection d'unité
 * implicite) et ObjetString/comparerAtomes (calcul + comparaison) de
 * EgaliteMasses.js, sans réinventer de parseur.
 * Renvoie 'invalide' (syntaxe/unité incorrecte) | 'faux' | 'ok'.
 */
function validerMasseTexte(texte, masseAttendueGrammes) {
  const unite = theme().unite ? 'g' : null;

  let pretraite;
  try {
    pretraite = pretraiterMembre(texte, 0, 0, unite).texte;
  } catch (e) {
    return 'invalide';
  }

  try {
    const os = new ObjetString(pretraite, {});
    if (!os.isValid()) return 'invalide';

    const resultat = os.calculer().resultat;
    const attendu = new Atome(valeur(masseAttendueGrammes), {});
    return comparerAtomes(resultat, attendu, unite) ? 'ok' : 'faux';
  } catch (e) {
    return 'invalide';
  }
}

/**
 * Mode "Expression obligatoire" : chaque nombre unité de l'expression (une
 * masse — pas un simple coefficient sans unité, qui reste un multiplicateur
 * libre) doit correspondre exactement à la masse totale de la pesée 1 ou de
 * la pesée 2. Réutilise tokeniserMembre (EgaliteMasses.js) pour distinguer
 * les nombres unités des coefficients nus (`sansUnite`), sans réimplémenter
 * de tokeniseur.
 */
function utiliseUniquementLesMassesDeDepart(texte) {
  // Le repérage "nombre unité vs coefficient nu" repose sur la lettre
  // d'unité collée au nombre (ex: "80g") — sans unité (thème "Point"), rien
  // ne les distingue plus, donc "Expression obligatoire" est désactivé côté
  // interface pour ce thème (voir construireBoutonsExpression).
  if (!theme().unite) return true;

  let tokens;
  try {
    tokens = tokeniserMembre(texte);
  } catch (e) {
    return false;
  }

  const conversion = Grandeur.conversionTable.Masse.conversion;
  return tokens.every(t => {
    if (t.type !== 'number' || t.sansUnite) return true;

    const m = /^([0-9.]+)([a-zA-Z]*)$/.exec(t.text);
    if (!m || !(m[2] in conversion)) return false;

    const valeurGrammes = parseFloat(m[1]) * (conversion[m[2]] / conversion.g);
    return Math.abs(valeurGrammes - peseeActuelle.mass1) < 1e-6
      || Math.abs(valeurGrammes - peseeActuelle.mass2) < 1e-6;
  });
}

/** Texte d'aide du champ masse, selon le mode "Expression obligatoire". */
function placeholderMasse() {
  const t = theme();
  if (!expressionObligatoire || !peseeActuelle) return `${t.libelleTotal} (ex: ${t.exempleValeur})`;
  const m1 = formaterValeur(peseeActuelle.mass1);
  const m2 = formaterValeur(peseeActuelle.mass2);
  return `Combine la ${t.nomExerciceMin} 1 (${m1}) et la ${t.nomExerciceMin} 2 (${m2})`;
}

/**
 * Widget principal : deux compteurs (+/-) pour choisir le nombre de chaque
 * fruit, un aperçu visuel et l'équation qui se mettent à jour en direct, et
 * un champ pour la masse totale devinée/calculée.
 */
class ConstructeurPesee {
  constructor(container) {
    this.container = container;
    this.nA = 0;
    this.nB = 0;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'pesee-carte constructeur-carte';

    const titre = document.createElement('div');
    titre.className = 'pesee-titre';
    titre.textContent = theme().titreConstruction;

    this.ligneA = this._construireLigneCompteur('a');
    this.ligneB = this._construireLigneCompteur('b');

    this.apercuDiv = document.createElement('div');
    this.apercuDiv.className = 'pesee-fruits constructeur-apercu';

    const masseZone = document.createElement('div');
    masseZone.className = 'constructeur-masse-zone';

    this.masseInput = document.createElement('input');
    this.masseInput.type = 'text';
    this.masseInput.className = 'constructeur-masse-input';
    this.masseInput.placeholder = placeholderMasse();
    this.masseInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.valider();
    });

    const btnValider = document.createElement('button');
    btnValider.type = 'button';
    btnValider.className = 'constructeur-valider';
    btnValider.textContent = 'Valider';
    btnValider.onclick = () => this.valider();

    const btnInit = document.createElement('button');
    btnInit.type = 'button';
    btnInit.className = 'constructeur-init';
    btnInit.textContent = 'Init';
    btnInit.onclick = () => this.reinitialiser();

    masseZone.append(this.masseInput, btnValider, btnInit);

    this.feedbackDiv = document.createElement('div');
    this.feedbackDiv.className = 'constructeur-feedback';

    this.wrapper.append(titre, this.ligneA, this.ligneB, this.apercuDiv, masseZone, this.feedbackDiv);
    this.container.appendChild(this.wrapper);

    this._rafraichir();
    this.masseInput.focus();
  }

  _construireLigneCompteur(lettre) {
    const ligne = document.createElement('div');
    ligne.className = 'constructeur-ligne';

    const fruit = peseeActuelle[lettre === 'a' ? 'fruitA' : 'fruitB'];

    const emojiSpan = document.createElement('span');
    emojiSpan.className = 'constructeur-emoji';
    emojiSpan.textContent = fruit.emoji;

    const btnMoins = document.createElement('button');
    btnMoins.type = 'button';
    btnMoins.className = 'cpt-btn';
    btnMoins.textContent = '−';
    btnMoins.onclick = () => this._changer(lettre, -1);

    const valeurSpan = document.createElement('span');
    valeurSpan.className = 'cpt-valeur';

    const btnPlus = document.createElement('button');
    btnPlus.type = 'button';
    btnPlus.className = 'cpt-btn';
    btnPlus.textContent = '+';
    btnPlus.onclick = () => this._changer(lettre, +1);

    ligne.append(emojiSpan, btnMoins, valeurSpan, btnPlus);
    ligne._valeurSpan = valeurSpan;
    return ligne;
  }

  _changer(lettre, delta) {
    if (lettre === 'a') this.nA = Math.min(COMPTEUR_MAX, Math.max(0, this.nA + delta));
    else this.nB = Math.min(COMPTEUR_MAX, Math.max(0, this.nB + delta));
    this._rafraichir();
  }

  _rafraichir() {
    this.ligneA._valeurSpan.textContent = this.nA;
    this.ligneB._valeurSpan.textContent = this.nB;

    const { fruitA, fruitB } = peseeActuelle;
    this.apercuDiv.textContent = [
      this.nA > 0 ? fruitA.emoji.repeat(this.nA) : '',
      this.nB > 0 ? fruitB.emoji.repeat(this.nB) : '',
    ].filter(Boolean).join(' ') || '—';
  }

  _afficherFeedback(texte, classe) {
    this.feedbackDiv.className = 'constructeur-feedback ' + classe;
    this.feedbackDiv.textContent = texte;
  }

  /** Remet le constructeur à son état initial (0 fruit de chaque, masse
   *  vide) — bouton "Init", pour repartir de zéro sans changer d'exercice. */
  reinitialiser() {
    this.nA = 0;
    this.nB = 0;
    this._rafraichir();
    this.masseInput.value = '';
    this._afficherFeedback('', '');
    this.masseInput.focus();
  }

  valider() {
    const t = theme();
    if (this.nA === 0 && this.nB === 0) {
      this._afficherFeedback(`Il faut au moins ${t.articleUn} ${t.nomItemUnique} ${t.zonePhrase}.`, 'erreur');
      return;
    }

    const texte = this.masseInput.value.trim();
    if (!texte) {
      this._afficherFeedback(`Tape ${t.article} ${t.libelleTotalMin} (ou un calcul).`, 'erreur');
      return;
    }

    const masseReelle = this.nA * peseeActuelle.aGrammes + this.nB * peseeActuelle.bGrammes;
    const statut = validerMasseTexte(texte, masseReelle);

    if (statut === 'invalide') {
      this._afficherFeedback('Expression invalide.', 'erreur');
      return;
    }
    if (statut === 'faux') {
      this._afficherFeedback(`Ce n'est pas ${t.article === 'une' ? 'la' : 'le'} ${t.adjectifBon} ${t.libelleTotalMin} pour cette ${t.nomExerciceMin}.`, 'erreur');
      return;
    }

    if (expressionObligatoire && !utiliseUniquementLesMassesDeDepart(texte)) {
      const m1 = formaterValeur(peseeActuelle.mass1);
      const m2 = formaterValeur(peseeActuelle.mass2);
      this._afficherFeedback(`Utilise seulement les ${t.libelleTotalMin}s de la ${t.nomExerciceMin} 1 (${m1}) et de la ${t.nomExerciceMin} 2 (${m2}).`, 'erreur');
      return;
    }

    ajouterCarteSiNouvelle(this.nA, this.nB, texte);
    if (this.nA === 1 && this.nB === 0) aTrouve = true;
    else if (this.nA === 0 && this.nB === 1) bTrouve = true;
    majStatutVariables();

    if (aTrouve && bTrouve) {
      this.wrapper.remove();
      afficherVictoire(this.container);
    } else {
      this._afficherFeedback('', '');
      this.masseInput.value = '';
      this.masseInput.focus();
    }
  }
}

/** Détecte si un membre de texte a la forme d'une pesée à un ou deux fruits :
 *  "na+mb"/"mb+na" (deux fruits) ou "na"/"mb" seul (un seul fruit, y compris
 *  "a"/"b" nus — coefficient 1) — coefficients entiers positifs, espaces
 *  ignorés. Renvoie {n, m} (n = coefficient de a, m = coefficient de b), ou
 *  null si le texte ne correspond à aucune de ces formes. */
function detecterFormePesee(texte) {
  const s = String(texte).replace(/\s+/g, '');

  const mAB = /^(\d*)a\+(\d*)b$/i.exec(s);
  if (mAB) {
    const n = mAB[1] === '' ? 1 : parseInt(mAB[1], 10);
    const m = mAB[2] === '' ? 1 : parseInt(mAB[2], 10);
    if (n > 0 && m > 0) return { n, m };
  }

  const mBA = /^(\d*)b\+(\d*)a$/i.exec(s);
  if (mBA) {
    const m = mBA[1] === '' ? 1 : parseInt(mBA[1], 10);
    const n = mBA[2] === '' ? 1 : parseInt(mBA[2], 10);
    if (n > 0 && m > 0) return { n, m };
  }

  const mA = /^(\d*)a$/i.exec(s);
  if (mA) {
    const n = mA[1] === '' ? 1 : parseInt(mA[1], 10);
    if (n > 0) return { n, m: 0 };
  }

  const mB = /^(\d*)b$/i.exec(s);
  if (mB) {
    const m = mB[1] === '' ? 1 : parseInt(mB[1], 10);
    if (m > 0) return { n: 0, m };
  }

  return null;
}

/**
 * Mode "Équation" : au lieu de construire la pesée avec des compteurs,
 * l'élève tape directement une égalité algébrique ("3a+2b=560g", "a=50g",
 * ...). Une capsule par égalité tapée ; une nouvelle capsule vide est créée
 * après chaque validation, jusqu'à ce que a et b soient tous les deux
 * trouvés. Diagnostic délégué à EgaliteMasses (moteur partagé, inchangé).
 */
class SaisieEquation {
  constructor(container) {
    this.container = container;

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'capsule-wrapper';

    this.equivZone = document.createElement('div');
    this.equivZone.className = 'equiv-zone';

    this.equationZone = document.createElement('div');
    this.equationZone.className = 'equation-zone';

    this.leftPart = document.createElement('div');
    this.leftPart.className = 'side-left';

    this.symbolPart = document.createElement('div');
    this.symbolPart.className = 'symbol-zone';
    this.symbolPart.textContent = '=';

    this.rightPart = document.createElement('div');
    this.rightPart.className = 'side-right';

    this.equationZone.append(this.leftPart, this.symbolPart, this.rightPart);

    this.commentPart = document.createElement('div');
    this.commentPart.className = 'feedback-zone';

    this.wrapper.append(this.equivZone, this.equationZone, this.commentPart);
    this.container.appendChild(this.wrapper);

    this.renderInput();
  }

  renderInput() {
    const t = theme();
    this.input = document.createElement('input');
    this.input.className = 'input-full';
    this.input.placeholder = `Tape une égalité (ex: 3a+2b=200${t.unite ? 'g' : ''})`;

    this.leftPart.style.gridColumn = "1 / span 3";
    this.symbolPart.style.display = "none";
    this.rightPart.style.display = "none";

    this.leftPart.appendChild(this.input);
    this.input.focus();
    this.input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.input.value.includes('=')) {
        this.validate();
      }
    });
  }

  renderStatic(lhsTexte, rhsTexte) {
    if (this.input) this.input.remove();
    this.leftPart.style.gridColumn = "1";
    this.symbolPart.style.display = "block";
    this.rightPart.style.display = "block";

    this.leftPart.innerHTML = colorerLettres(cosmetique(lhsTexte));
    this.rightPart.innerHTML = colorerLettres(cosmetique(rhsTexte));
  }

  afficherValide() {
    this.equivZone.classList.remove('non-equiv');
    this.equivZone.textContent = '✓';
  }

  validate() {
    const val = this.input.value;
    const parts = val.split('=');
    if (parts.length !== 2) return;

    const unite = theme().unite ? 'g' : null;
    const [lhsTexte, rhsTexte] = parts;
    const egalite = new EgaliteMasses(lhsTexte, rhsTexte);
    const diag = egalite.diagnostiquer(peseeActuelle.aGrammes, peseeActuelle.bGrammes, unite);

    this.renderStatic(lhsTexte, rhsTexte);

    if (diag.statut === 'ok') {
      const variable = egalite.variableIsolee(peseeActuelle.aGrammes, peseeActuelle.bGrammes, unite);
      const nouvelleDecouverte = (variable === 'a' && !aTrouve) || (variable === 'b' && !bTrouve);

      // "a=..." / "b=..." compte aussi comme une forme de pesée (un seul
      // fruit sur le plateau) : elle mérite sa carte au même titre que
      // "na+mb=...", pas seulement le statut "trouvé" dans la capsule.
      const formeGauche = detecterFormePesee(lhsTexte);
      const formeDroite = detecterFormePesee(rhsTexte);
      const estFormePesee = !!(formeGauche || formeDroite);
      if (formeGauche) ajouterCarteSiNouvelle(formeGauche.n, formeGauche.m, rhsTexte);
      else if (formeDroite) ajouterCarteSiNouvelle(formeDroite.n, formeDroite.m, lhsTexte);

      if (variable === 'a') aTrouve = true;
      else if (variable === 'b') bTrouve = true;

      if (estFormePesee) {
        // Déjà affichée comme carte de pesée juste au-dessus : la capsule
        // ne sert plus à rien, elle ferait doublon.
        this.wrapper.remove();
      } else {
        this.afficherValide();
        if (variable === 'a' && nouvelleDecouverte) {
          this.commentPart.innerHTML = "<span style='color:var(--succes); font-weight:bold;'>a trouvé !</span>";
        } else if (variable === 'b' && nouvelleDecouverte) {
          this.commentPart.innerHTML = "<span style='color:var(--succes); font-weight:bold;'>b trouvé !</span>";
        } else {
          this.commentPart.innerHTML = "Égalité valable";
        }
      }

      majStatutVariables();

      if (aTrouve && bTrouve) {
        if (!estFormePesee) this.wrapper.classList.add('capsule-wrapper-final');
        afficherVictoire(this.container);
      } else {
        new SaisieEquation(this.container);
      }
    } else {
      const messages = {
        invalide: "Expression invalide.",
        disparu: "Il ne reste plus ni a ni b : ce n'est pas une égalité entre les deux grandeurs.",
        faux: "Cette égalité n'est pas vérifiée par les deux pesées.",
      };
      this.equivZone.classList.add('non-equiv');
      this.equivZone.textContent = '✗';
      this.commentPart.innerHTML = messages[diag.statut] || "Égalité incorrecte.";

      const btnX = document.createElement('button');
      btnX.className = "delete-button";
      btnX.innerHTML = "❌";
      btnX.onclick = () => {
        this.wrapper.remove();
        new SaisieEquation(this.container);
      };
      this.commentPart.appendChild(btnX);
    }
  }
}

/** Construit l'affichage illustré d'une pesée (un des deux plateaux, ou une
 *  carte construite par l'élève). `exprBrute` n'existe que pour les cartes
 *  construites par l'élève (jamais pour les pesées 1/2, données telles
 *  quelles) : c'est le texte qu'il a tapé pour la masse. `validee` ajoute le
 *  halo vert (uniquement pour ces cartes construites, jamais les pesées
 *  1/2 : elles ne sont pas "validées", juste données). */
function rendrePeseeCarte(titre, fruitA, nA, fruitB, nB, masse, exprBrute, validee = false, avecEquation = false) {
  const carte = document.createElement('div');
  carte.className = 'pesee-carte' + (validee ? ' pesee-carte-validee' : '');

  const titreDiv = document.createElement('div');
  titreDiv.className = 'pesee-titre';
  titreDiv.textContent = titre;

  // Un fruit peut être absent (niveau "Très facile" : une seule sorte par
  // pesée) — on omet alors sa part dans l'illustration.
  const fruitsDiv = document.createElement('div');
  fruitsDiv.className = 'pesee-fruits';
  fruitsDiv.textContent = [
    nA > 0 ? fruitA.emoji.repeat(nA) : '',
    nB > 0 ? fruitB.emoji.repeat(nB) : '',
  ].filter(Boolean).join(' ');

  const membreDroit = (!calculActif && exprBrute) ? cosmetique(exprBrute) : formaterValeur(masse);

  const masseDiv = document.createElement('div');
  masseDiv.className = 'pesee-masse';
  masseDiv.textContent = `${theme().libelleTotal} : ${membreDroit}`;

  carte.append(titreDiv, fruitsDiv, masseDiv);

  // Mode équation : l'élève doit voir l'écriture algébrique de la pesée pour
  // pouvoir combiner les deux — inutile en mode construction (les compteurs
  // suffisent).
  if (avecEquation) {
    const termes = [];
    if (nA > 0) termes.push(nA === 1 ? 'a' : `${nA}a`);
    if (nB > 0) termes.push(nB === 1 ? 'b' : `${nB}b`);
    const eqDiv = document.createElement('div');
    eqDiv.className = 'pesee-equation';
    eqDiv.innerHTML = colorerLettres(`${termes.join(' + ')} = ${membreDroit}`);
    carte.appendChild(eqDiv);
  }

  return carte;
}

function rendrePesees() {
  const intro = document.getElementById('peseeIntro');
  const grille = document.getElementById('peseesGrille');
  if (!intro || !grille) return;

  const { fruitA, fruitB, n1a, n1b, mass1, n2a, n2b, mass2 } = peseeActuelle;
  const t = theme();

  intro.innerHTML = t.introTexte(fruitA, fruitB);

  const avecEquation = modeSaisie === 'equation';

  grille.innerHTML = '';
  grille.appendChild(rendrePeseeCarte(t.nomExercice(1), fruitA, n1a, fruitB, n1b, mass1, undefined, false, avecEquation));
  grille.appendChild(rendrePeseeCarte(t.nomExercice(2), fruitA, n2a, fruitB, n2b, mass2, undefined, false, avecEquation));

  // Pesées supplémentaires construites par l'élève (voir ajouterCarteSiNouvelle).
  cartesSupplementaires.forEach((carte, i) => {
    const masse = carte.n * peseeActuelle.aGrammes + carte.m * peseeActuelle.bGrammes;
    grille.appendChild(rendrePeseeCarte(t.nomExercice(3 + i), fruitA, carte.n, fruitB, carte.m, masse, carte.expr, true, avecEquation));
  });
}

/** Coefficients (n, m) des deux pesées de départ (jamais dupliquées : elles
 *  restent générées, pas construites par l'élève). */
function coefficientsDesPeseesDeDepart() {
  if (!peseeActuelle) return [];
  return [
    { n: peseeActuelle.n1a, m: peseeActuelle.n1b },
    { n: peseeActuelle.n2a, m: peseeActuelle.n2b },
  ];
}

/**
 * Quand l'élève valide une pesée construite (nA fruits A, nB fruits B, avec
 * la bonne masse), on la matérialise en une nouvelle carte, ajoutée sous
 * les deux premières. Rien de nouveau si ces coefficients correspondent à
 * une des deux pesées de départ ; si une carte existe déjà pour ces mêmes
 * coefficients, on remplace juste son expression (nouvelle formulation).
 */
function ajouterCarteSiNouvelle(n, m, expr) {
  if (coefficientsDesPeseesDeDepart().some(p => p.n === n && p.m === m)) return;

  const existante = cartesSupplementaires.find(c => c.n === n && c.m === m);
  if (existante) existante.expr = expr;
  else cartesSupplementaires.push({ n, m, expr });

  rendrePesees();
}

function majStatutVariables() {
  const zone = document.getElementById('statutVariables');
  if (!zone || !peseeActuelle) return;
  zone.innerHTML = '';

  // Une masse donnée directement par la pesée (niveau "Très facile")
  // n'a jamais été "trouvée" par l'élève : on l'affiche comme "donnée".
  const libelle = (lettre, trouve) => {
    if (peseeActuelle?.donnee === lettre) return '✓ donnée';
    return trouve ? '✓ trouvée' : '?';
  };

  const { fruitA, fruitB } = peseeActuelle;

  const ligneA = document.createElement('div');
  ligneA.className = 'statut-item' + (aTrouve ? ' trouve' : '');
  ligneA.innerHTML = `<span>${fruitA.emoji} ${fruitA.nom}</span><span>${libelle('a', aTrouve)}</span>`;

  const ligneB = document.createElement('div');
  ligneB.className = 'statut-item' + (bTrouve ? ' trouve' : '');
  ligneB.innerHTML = `<span>${fruitB.emoji} ${fruitB.nom}</span><span>${libelle('b', bTrouve)}</span>`;

  zone.append(ligneA, ligneB);
}

function afficherVictoire(container) {
  const { fruitA, fruitB } = peseeActuelle;
  const t = theme();
  const bloc = document.createElement('div');
  bloc.className = 'victoire-bloc';
  bloc.textContent = `🎉 Bien joué ! ${t.article === 'une' ? 'Une' : 'Un'} ${fruitA.emoji} ${fruitA.nom} ${t.verbeValoir} ${formaterValeur(peseeActuelle.aGrammes)} ` +
    `et ${t.article === 'une' ? 'une' : 'un'} ${fruitB.emoji} ${fruitB.nom} ${t.verbeValoir} ${formaterValeur(peseeActuelle.bGrammes)}.`;
  container.appendChild(bloc);

  const div = document.createElement('div');
  div.className = 'center-button';
  const b = document.createElement('button');
  b.textContent = etatJeu === 'quiz' ? 'Suivant (Entrée)' : t.labelNouvelExercice;
  b.onclick = () => {
    if (etatJeu === 'quiz') {
      score++;
      updateScoreDisplay();
    }
    demarrerQuestion();
  };
  div.appendChild(b);
  container.appendChild(div);

  // Une fois la pesée résolue, plus la peine de proposer "Renoncer".
  const skipBtn = document.getElementById('skipButton');
  if (skipBtn) skipBtn.style.display = 'none';
}

/**
 * Point d'aiguillage central :
 *   - etatJeu === 'quiz' && !quizDemarre → rien à afficher avant "Commencer le Quiz".
 *   - etatJeu === 'quiz' && questionCount >= 10 → écran de fin.
 *   - sinon → nouvelle pesée (atelier : illimité, sans comptage).
 */
function demarrerQuestion() {
  if (etatJeu === 'quiz' && !quizDemarre) return;
  if (etatJeu === 'quiz' && questionCount >= 10) { showScore(); return; }

  demarrerExercice(genererPesee(niveauActuel, theme().banque));

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

/** Écran de fin de quiz : score final et bouton pour recommencer. */
function showScore() {
  const skipBtn = document.getElementById('skipButton');
  if (skipBtn) skipBtn.style.display = 'none';

  const cont = document.getElementById('inputContainer');
  const grille = document.getElementById('peseesGrille');
  const intro = document.getElementById('peseeIntro');
  const variables = document.getElementById('statutVariables');
  if (grille) grille.innerHTML = '';
  if (intro) intro.textContent = '';
  if (variables) variables.innerHTML = '';
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

function construireBoutonsNiveau(disabled = false) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';
  const niveaux = [
    { id: 'tresfacile', label: 'T.facile' },
    { id: 'facile', label: 'Facile' },
    { id: 'moyen', label: 'Moyen' },
    { id: 'difficile', label: 'Difficile' },
  ];
  niveaux.forEach(n => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'param-btn' + (n.id === niveauActuel ? ' active' : '');
    btn.disabled = disabled;
    btn.textContent = n.label;
    btn.onclick = () => {
      niveauActuel = n.id;
      [...conteneur.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      demarrerQuestion();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

function construireBoutonsCalcul(disabled = false) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';
  const options = [
    { id: 'avec', label: 'Avec calcul' },
    { id: 'sans', label: 'Sans calcul' },
  ];
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'param-btn' + ((opt.id === 'avec') === calculActif ? ' active' : '');
    btn.disabled = disabled;
    btn.textContent = opt.label;
    btn.onclick = () => {
      calculActif = (opt.id === 'avec');
      [...conteneur.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      rendrePesees();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

/** Bascule exclusive entre les deux modes de saisie : "Construction"
 *  (compteurs +/- sur un plateau, puis masse totale devinée) ou "Équation"
 *  (taper directement une égalité algébrique, ex: "3a+2b=560g"). Redémarre
 *  l'affichage de la pesée en cours dans le nouveau mode, sans en tirer une
 *  nouvelle. */
function construireBoutonsSaisie(disabled = false) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';
  const options = [
    { id: 'construction', label: 'Construction' },
    { id: 'equation', label: 'Équation' },
  ];
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'param-btn' + (opt.id === modeSaisie ? ' active' : '');
    btn.disabled = disabled;
    btn.textContent = opt.label;
    btn.onclick = () => {
      if (modeSaisie === opt.id) return;
      modeSaisie = opt.id;
      renderPanneauLateral();
      if (peseeActuelle) demarrerExercice(peseeActuelle);
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

/** Bascule exclusive entre les deux thèmes (Masse / Point) — change la
 *  banque d'illustrations, l'unité et tout le vocabulaire (voir THEMES dans
 *  Pesee.js). Ferme aussi "Expression obligatoire", qui repose sur l'unité
 *  "g" collée aux nombres et n'a pas de sens en mode sans unité. */
function construireBoutonsTheme(disabled = false) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';
  Object.values(THEMES).forEach(t => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'param-btn' + (t.id === themeActuel ? ' active' : '');
    btn.disabled = disabled;
    btn.textContent = t.label;
    btn.onclick = () => {
      if (themeActuel === t.id) return;
      themeActuel = t.id;
      if (!t.unite) expressionObligatoire = false;
      renderPanneauLateral();
      demarrerQuestion();
    };
    conteneur.appendChild(btn);
  });
  return conteneur;
}

function construireBoutonsExpression(disabled = false) {
  const conteneur = document.createElement('div');
  conteneur.className = 'param-buttons';
  // Repose sur l'unité "g" collée aux nombres (voir utiliseUniquementLesMassesDeDepart) :
  // sans objet en thème "Point" (sans unité), donc désactivé dans ce cas. Sans
  // objet non plus en mode "Équation" : pas de champ masse séparé à contraindre.
  disabled = disabled || !theme().unite || modeSaisie === 'equation';
  const options = [
    { id: 'libre', label: 'Libre' },
    { id: 'obligatoire', label: 'Expression obligatoire' },
  ];
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'param-btn' + ((opt.id === 'obligatoire') === expressionObligatoire ? ' active' : '');
    btn.disabled = disabled;
    btn.textContent = opt.label;
    btn.onclick = () => {
      expressionObligatoire = (opt.id === 'obligatoire');
      [...conteneur.children].forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      const input = document.querySelector('.constructeur-masse-input');
      if (input) input.placeholder = placeholderMasse();
    };
    conteneur.appendChild(btn);
  });
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

/**
 * Affiche un formulaire permettant de choisir soi-même les deux masses
 * (a, b) et la composition des deux pesées (nombre de chaque fruit), plutôt
 * que de les tirer au hasard. Une fois validé, l'exercice démarre
 * normalement avec ces valeurs.
 */
function demarrerFormulairePersonnalise() {
  const intro = document.getElementById('peseeIntro');
  const grille = document.getElementById('peseesGrille');
  const cont = document.getElementById('inputContainer');
  intro.textContent = '';
  grille.innerHTML = '';
  cont.innerHTML = '';

  const t = theme();
  const [fruitA, fruitB] = tirerFruits(t.banque);

  const bloc = document.createElement('div');
  bloc.className = 'perso-saisie';

  const champ = (id, label, def) => `
    <label class="perso-champ">
      <span>${label}</span>
      <input type="number" id="${id}" value="${def}" min="0" step="1">
    </label>`;

  const NomEx = t.nomExerciceMin[0].toUpperCase() + t.nomExerciceMin.slice(1);

  bloc.innerHTML = `
    <div class="perso-label">
      ${t.persoIntro(fruitA, fruitB)}
    </div>
    <div class="perso-grille">
      ${champ('persoA', t.champValeurLabel(fruitA), 50)}
      ${champ('persoB', t.champValeurLabel(fruitB), 80)}
    </div>
    <div class="perso-grille">
      ${champ('persoN1a', `${NomEx} 1 — nombre de ${fruitA.emoji}`, 3)}
      ${champ('persoN1b', `${NomEx} 1 — nombre de ${fruitB.emoji}`, 2)}
    </div>
    <div class="perso-grille">
      ${champ('persoN2a', `${NomEx} 2 — nombre de ${fruitA.emoji}`, 1)}
      ${champ('persoN2b', `${NomEx} 2 — nombre de ${fruitB.emoji}`, 4)}
    </div>
    <div class="perso-label perso-erreur" id="persoErreur" style="display:none;"></div>
    <button type="button" class="panel-btn accent" id="persoLancer" style="width:auto;">${t.btnCreer}</button>
  `;

  cont.appendChild(bloc);

  const lireEntier = (id) => parseInt(document.getElementById(id).value, 10);

  document.getElementById('persoLancer').onclick = () => {
    const aGrammes = lireEntier('persoA');
    const bGrammes = lireEntier('persoB');
    const n1a = lireEntier('persoN1a');
    const n1b = lireEntier('persoN1b');
    const n2a = lireEntier('persoN2a');
    const n2b = lireEntier('persoN2b');

    const erreurZone = document.getElementById('persoErreur');
    const invalides = [aGrammes, bGrammes, n1a, n1b, n2a, n2b].some(v => !Number.isInteger(v) || v < 0);
    let message = '';
    if (invalides) message = 'Toutes les valeurs doivent être des entiers positifs.';
    else if (aGrammes === 0 || bGrammes === 0) message = t.msgValeursPositives;
    else if (n1a === 0 && n1b === 0) message = `La ${t.nomExerciceMin} 1 doit contenir au moins ${t.articleUn} ${t.nomItemUnique}.`;
    else if (n2a === 0 && n2b === 0) message = `La ${t.nomExerciceMin} 2 doit contenir au moins ${t.articleUn} ${t.nomItemUnique}.`;
    else if (!determinantValide(n1a, n1b, n2a, n2b)) message = `Ces deux ${t.nomExerciceMin}s ne permettent pas de déterminer a et b de façon unique (essaie une composition différente).`;

    if (message) {
      erreurZone.textContent = message;
      erreurZone.style.display = 'block';
      return;
    }

    demarrerExercice(construirePesee({ fruitA, fruitB, n1a, n1b, n2a, n2b, aGrammes, bGrammes }));
  };
}

/** Démarre (ou redémarre) l'exercice à partir d'un objet pesée déjà construit. */
function demarrerExercice(pesee) {
  peseeActuelle = pesee;
  reinitialiserTrouve();
  cartesSupplementaires = [];

  rendrePesees();
  majStatutVariables();

  const cont = document.getElementById('inputContainer');
  cont.innerHTML = '';
  if (modeSaisie === 'equation') new SaisieEquation(cont);
  else new ConstructeurPesee(cont);
}

/** Construit le contenu du panneau latéral selon l'état courant (atelier / quiz avant ou après lancement). */
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

  ajouterGroupe('Thème', construireBoutonsTheme(verrouille));
  ajouterFilet();
  ajouterGroupe('Saisie', construireBoutonsSaisie(verrouille));
  ajouterFilet();
  ajouterGroupe('Niveau', construireBoutonsNiveau(verrouille));
  ajouterFilet();
  ajouterGroupe('Calcul', construireBoutonsCalcul(verrouille));
  ajouterFilet();
  ajouterGroupe('Expression', construireBoutonsExpression(verrouille));
  ajouterFilet();

  // Pesée personnalisée : uniquement en atelier — en quiz, les questions
  // doivent suivre le déroulé normal du score. Pour une nouvelle pesée
  // aléatoire, on passe désormais par le bouton "Renoncer".
  if (etatJeu === 'atelier') {
    const btnPerso = document.createElement('button');
    btnPerso.type = 'button';
    btnPerso.className = 'panel-btn';
    btnPerso.textContent = `${theme().nomExerciceMin[0].toUpperCase()}${theme().nomExerciceMin.slice(1)} personnalisée`;
    btnPerso.onclick = () => demarrerFormulairePersonnalise();
    panneau.appendChild(btnPerso);
    ajouterFilet();
  }

  const zoneVariables = document.createElement('div');
  zoneVariables.className = 'statut-variables';
  zoneVariables.id = 'statutVariables';
  ajouterGroupe(theme().labelATrouver, zoneVariables);
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

  majStatutVariables();
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
    questionCount = 0;
    score = 0;
    document.getElementById('inputContainer').innerHTML = '';
    document.getElementById('peseesGrille').innerHTML = '';
    document.getElementById('peseeIntro').textContent = '';
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
  if (typeof FichePapier === 'function') {
    const fiche = new FichePapier();
    fiche.installerBouton(document.getElementById("topButtonsBar"));
  }
  if (typeof GuideAppli === 'function') {
    const guide = new GuideAppli();
    guide.installerBouton(document.getElementById("topButtonsBar"));
  }

  demarrerQuestion();
};
