// ============================================================
// ModeOperationGuidee.js — UI du mode "opération guidée"
// ============================================================
// L'élève ne tape jamais l'équation entière : seulement l'opération à
// appliquer aux deux membres (ex: "-3", "+2x", ":4"). Le moteur
// (OperationGuidee + Polynome) calcule et affiche la nouvelle équation.
//
// Disposition en tableau à colonnes fixes : la colonne "équation" affiche
// l'état courant (lecture, LaTeX) ; la colonne "opération" contient soit
// la saisie en cours, soit l'opération validée à cette étape.
//
// La toute première ligne EST déjà la première ligne de saisie : elle
// affiche l'énoncé dans sa colonne équation, donc une ligne "Énoncé" séparée
// serait redondante. La dernière étape validée porte un bouton ❌ pour
// l'annuler — uniquement elle, et il disparaît dès qu'une étape suivante
// est ajoutée (cohérent avec "annuler le dernier coup", pas un historique
// complet). Une fois résolu, la dernière ligne affiche x = valeur en lecture.
// ============================================================

class OperationRow {
  /**
   * @param {Polynome} polyLhs - membre gauche courant
   * @param {Polynome} polyRhs - membre droit courant
   * @param {Equation} equationCible - équation à résoudre (pour connaître la solution cible)
   * @param {HTMLElement} container
   * @param {OperationRow|null} ligneParente - la ligne dont la validation a produit cette équation
   *   (sert à retirer le bouton ❌ de la parente dès qu'on avance d'une étape).
   */
  constructor(polyLhs, polyRhs, equationCible, container, ligneParente = null) {
    this.polyLhs = polyLhs;
    this.polyRhs = polyRhs;
    this.equationCible = equationCible;
    this.container = container;
    this.ligneParente = ligneParente;
    this._btnAnnulation = null; // unique bouton ❌ possible pour cette ligne, qu'il serve à "annuler" ou à "retaper après erreur"

    this.wrapper = document.createElement('div');
    this.wrapper.className = 'op-row';

    // Zone d'équivalence (⟺), à gauche : ici toujours affichée dès la
    // validation d'une étape, puisqu'une opération acceptée par le parser
    // est par construction réversible — pas besoin de vérifier, contrairement
    // au mode libre où l'élève peut écrire n'importe quoi.
    this.equivZone = document.createElement('div');
    this.equivZone.className = 'equiv-zone';

    this.eqCell = document.createElement('div');
    this.eqCell.className = 'op-eq-cell';

    this.opCell = document.createElement('div');
    this.opCell.className = 'op-op-cell';

    this.feedbackCell = document.createElement('div');
    this.feedbackCell.className = 'op-feedback-cell';

    this.wrapper.append(this.equivZone, this.eqCell, this.opCell, this.feedbackCell);
    this.container.appendChild(this.wrapper);

    // Cette ligne affiche ⟺ dans SA PROPRE zone d'équivalence si elle résulte
    // d'une opération validée (ligneParente non nulle) : l'équation qu'elle
    // montre est, par construction, équivalente à celle de la ligne précédente
    // (le parser n'accepte que des opérations réversibles, pas besoin de
    // vérifier). La toute première ligne (énoncé initial, pas de parente)
    // n'a rien à comparer, donc reste vide.
    if (this.ligneParente) {
      this.equivZone.innerHTML = '\\(\\Leftrightarrow\\)';
      if (window.MathJax) MathJax.typesetPromise([this.equivZone]);
    }

    this._renderEquation();
    this._renderInput();
  }

  _renderEquation() {
    this.eqCell.innerHTML = `\\(${this.polyLhs.toLatex()} = ${this.polyRhs.toLatex()}\\)`;
    if (window.MathJax) MathJax.typesetPromise([this.eqCell]);
  }

  _renderInput() {
    this.input = document.createElement('input');
    this.input.className = 'op-input';
    this.input.placeholder = 'Opération';
    this.opCell.appendChild(this.input);
    this.input.focus();
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.input.value.trim() !== '') {
        this.valider();
      }
    });
    // Dès que l'élève modifie sa saisie après une erreur, on efface le
    // message et l'état d'erreur — pas besoin de cliquer sur ❌ pour ça.
    this.input.addEventListener('input', () => this._effacerErreur());
  }

  _effacerErreur() {
    if (!this.opCell.classList.contains('op-erreur')) return;
    this.opCell.classList.remove('op-erreur');
    this.feedbackCell.innerHTML = '';
  }

  _freeze(texteOperation) {
    if (this.input) this.input.remove();
    this.opCell.classList.remove('op-erreur');
    this.opCell.innerHTML = '';
    this.feedbackCell.innerHTML = '';

    const span = document.createElement('span');
    span.className = 'op-validee';
    span.innerHTML = `\\(${texteOperation}\\)`;
    this.opCell.appendChild(span);
    if (window.MathJax) MathJax.typesetPromise([span]);

    // Le bouton ❌ est TOUJOURS créé ici (même s'il sera masqué juste après) :
    // il réserve sa place dans la mise en page, pour que le texte de
    // l'opération reste centré au même endroit qu'il soit visible ou pas.
    // Seule sa VISIBILITÉ change selon qui est "la dernière étape validée".
    const btnX = document.createElement('button');
    btnX.className = 'delete-button';
    btnX.innerHTML = '❌';
    btnX.title = 'Annuler cette opération';
    btnX.onclick = () => this._annulerEtape();
    this.opCell.appendChild(btnX);
    this._btnAnnulation = btnX;

    // Cette étape devient la nouvelle "dernière étape validée" : elle affiche
    // son bouton, et la précédente (sa parente) masque le sien.
    if (this.ligneParente) this.ligneParente._masquerBoutonAnnulation();
    this._afficherBoutonAnnulation();
  }

  _afficherBoutonAnnulation() {
    if (this._btnAnnulation) this._btnAnnulation.classList.remove('bouton-masque');
  }

  _masquerBoutonAnnulation() {
    if (this._btnAnnulation) this._btnAnnulation.classList.add('bouton-masque');
  }

  /** Annule cette étape déjà validée : supprime la ligne de saisie courante (qui la suit) et redonne une saisie vierge ici. */
  _annulerEtape() {
    // Retire la ligne de saisie courante (celle qui suit cette étape, encore vide).
    const lignes = [...this.container.querySelectorAll('.op-row')];
    const indexCette = lignes.indexOf(this.wrapper);
    const ligneSuivante = lignes[indexCette + 1];
    if (ligneSuivante) ligneSuivante.remove();

    this.wrapper.remove();
    // La parente redevient la dernière étape validée : elle réaffiche son bouton ❌.
    if (this.ligneParente) this.ligneParente._afficherBoutonAnnulation();
    new OperationRow(this.polyLhs, this.polyRhs, this.equationCible, this.container, this.ligneParente);
  }

  valider() {
    const saisie = this.input.value;

    let operation;
    try {
      operation = OperationGuidee.parser(saisie);
    } catch (e) {
      this._signalerErreur(e.message);
      return;
    }

    const nouveauLhs = OperationGuidee.appliquer(this.polyLhs, operation);
    const nouveauRhs = OperationGuidee.appliquer(this.polyRhs, operation);

    this._freeze(OperationGuidee.formaterOperationLatex(operation));

    // Vérifie si l'équation résultante est résolue : x = nombre ou nombre = x
    // (même logique que le mode saisie libre, mais ici toujours garanti
    // mathématiquement valide puisque l'opération est réversible par construction —
    // donc on vérifie juste la FORME, pas l'équivalence).
    const lhsEstX = nouveauLhs.degre() === 1 && nouveauLhs.coeff(1).equal(new Nombre("1")) && nouveauLhs.coeff(0).equal(new Nombre("0"));
    const rhsEstX = nouveauRhs.degre() === 1 && nouveauRhs.coeff(1).equal(new Nombre("1")) && nouveauRhs.coeff(0).equal(new Nombre("0"));
    const lhsEstConstante = nouveauLhs.estConstant();
    const rhsEstConstante = nouveauRhs.estConstant();
    const estResolu = (lhsEstX && rhsEstConstante) || (rhsEstX && lhsEstConstante);

    if (estResolu) {
      // Une fois résolu, plus aucun retour en arrière possible : on masque
      // (et neutralise) le bouton ❌ de cette dernière étape — il n'y a plus
      // de ligne de saisie à recréer derrière, donc l'annuler n'aurait plus
      // de sens dans ce flux.
      this._masquerBoutonAnnulation();
      this._afficherResultatFinal(nouveauLhs, nouveauRhs);
      createNextBtn(this.container);
    } else {
      new OperationRow(nouveauLhs, nouveauRhs, this.equationCible, this.container, this);
    }
  }

  /** Affiche une ligne finale en lecture (x = valeur), avec le même calage que les autres lignes et le symbole ⟺. */
  _afficherResultatFinal(polyLhs, polyRhs) {
    const ligneFinale = document.createElement('div');
    ligneFinale.className = 'op-row op-row-final';

    const equivCell = document.createElement('div');
    equivCell.className = 'equiv-zone';
    equivCell.innerHTML = '\\(\\Leftrightarrow\\)';

    const eqCell = document.createElement('div');
    eqCell.className = 'op-eq-cell';
    eqCell.innerHTML = `\\(${polyLhs.toLatex()} = ${polyRhs.toLatex()}\\)`;

    const opCell = document.createElement('div');
    opCell.className = 'op-op-cell';

    const feedbackCell = document.createElement('div');
    feedbackCell.className = 'op-feedback-cell';
    feedbackCell.innerHTML = "<span style='color:#28a745; font-weight:bold;'>✅ Résolu !</span>";

    ligneFinale.append(equivCell, eqCell, opCell, feedbackCell);
    this.container.appendChild(ligneFinale);

    if (window.MathJax) MathJax.typesetPromise([equivCell, eqCell]);
  }

  /**
   * Signale une saisie invalide : message d'erreur + UN SEUL bouton ❌ (le
   * même this._btnAnnulation que celui utilisé après une validation réussie,
   * jamais un second bouton séparé — sinon on se retrouve avec deux croix
   * si l'élève corrige et valide ensuite avec succès sur la même ligne).
   */
  _signalerErreur(message) {
    this.opCell.classList.add('op-erreur');
    this.feedbackCell.innerHTML = `<span class="op-msg-erreur">${message}</span>`;

    if (!this._btnAnnulation) {
      const btnX = document.createElement('button');
      btnX.className = 'delete-button';
      btnX.innerHTML = '❌';
      btnX.title = 'Effacer et retaper';
      btnX.onclick = () => {
        this.wrapper.remove();
        new OperationRow(this.polyLhs, this.polyRhs, this.equationCible, this.container, this.ligneParente);
      };
      this.feedbackCell.appendChild(btnX);
      this._btnAnnulation = btnX;
    }
  }
}

/** Démarre une question en mode opération guidée : une seule ligne de saisie initiale (l'énoncé y est déjà visible). */
function startQuizOperationGuidee() {
  const eq = generateRandomExpression();
  lancerResolution(eq);

  if (etatJeu === 'quiz') {
    questionCount++;
    updateScoreDisplay();
  }
}