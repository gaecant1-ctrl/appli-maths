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

/** Lit un membre de la forme "(expression):entier". Renvoie { interieur, denominateur } ou null. */
function lireQuotient(texte) {
  const m = String(texte).replace(/\s+/g, '').match(/^\((.+)\):(\d+)$/);
  if (!m || Number(m[2]) === 0) return null;

  // Écarte "(a)+(b):2", où la dernière parenthèse ne ferme pas la première.
  let profondeur = 0;
  for (const car of m[1]) {
    if (car === '(') profondeur++;
    if (car === ')' && --profondeur < 0) return null;
  }
  return profondeur === 0 ? { interieur: m[1], denominateur: Number(m[2]) } : null;
}

function panneauOutils() {
  return document.getElementById('panneauOutils');
}

/** Vide le panneau de droite (nouvelle question) ; il n'existe pas en mode saisie. */
function fermerOutils() {
  const panneau = panneauOutils();
  if (!panneau) return;
  panneau.innerHTML = '';
  panneau.hidden = modeActuel === 'libre';
}

function polynomeDe(texte) {
  return new ObjetString(texte, {}).calculer().resultat.polynome;
}

/** Découpe "(ax+b)(cx+d)" ou "x(cx+d)", avec ou sans *, en deux textes, sinon null. */
function decouperProduit(texte) {
  const m = String(texte).replace(/\s+/g, '').match(/^(?:\(([^()]+)\)|(x))\*?\(([^()]+)\)$/);
  return m ? [m[1] || m[2], m[3]] : null;
}

/** Lit un membre de la forme "(ax+b)(cx+d)" ou "x(cx+d)". Renvoie les deux facteurs (Polynome de degré 1) ou null. */
function lireProduit(texte) {
  const textes = decouperProduit(texte);
  if (!textes) return null;

  const facteurs = textes.map(polynomeDe);
  return facteurs.every(f => f.degre() === 1) ? facteurs : null;
}

/** Lit "(ax+b)^2". Renvoie le Polynome ax+b ou null. */
function lireCarre(texte) {
  const m = String(texte).replace(/\s+/g, '').match(/^\(([^()]+)\)\^2$/);
  if (!m) return null;

  const base = polynomeDe(m[1]);
  return base.degre() === 1 ? base : null;
}

/** Polynome correspondant à une saisie de l'élève, ou null si elle est invalide. */
function polynomeSaisi(texte) {
  try {
    const os = new ObjetString(texte, {});
    return os.isValid() ? os.calculer().resultat.polynome : null;
  } catch (e) {
    return null;
  }
}

/** Vrai si chaque coefficient du polynôme est une fraction irréductible. */
function coefficientsReduits(p) {
  for (let d = 0; d <= Math.max(p.degre(), 0); d++) {
    if (p.coeff(d).toLatex() !== p.coeff(d).simplify().toLatex()) return false;
  }
  return true;
}

/** Même polynôme avec des fractions irréductibles. */
function polynomeReduit(p) {
  if (coefficientsReduits(p)) return p;

  let resultat = Polynome.fromMonome(p.coeff(0).simplify(), 0);
  for (let d = 1; d <= p.degre(); d++) {
    resultat = resultat.add(Polynome.fromMonome(p.coeff(d).simplify(), d));
  }
  return resultat;
}

/** Écriture saisissable d'un polynôme : "2x^2-7x+3". */
function textePolynome(p) {
  let texte = '';
  for (let d = p.degre(); d >= 0; d--) {
    const c = p.coeff(d).simplify();
    if (c.valeurNum.a !== 0) texte += formatTerme(c, d, texte !== '');
  }
  return texte || '0';
}

/** Sépare « A=B » en deux textes, ou null. Le parseur refuse -( : il devient -1(. */
function lireMembres(texte) {
  const membres = String(texte).split('=').map(m => m.trim().replace(/^-\s*\(/, '-1('));
  return membres.length === 2 && membres.every(m => m !== '') ? membres : null;
}

/** Vrai si le texte n'a ni parenthèse, ni deux termes de même degré, ni fraction réductible (2x+3, et non 2x+x+3). */
function ecritureReduite(texte) {
  const s = String(texte).replace(/\s+/g, '');
  if (s.includes('(')) return false;

  // Le parseur transforme 8/2 en 4 : on contrôle les fractions sur le texte.
  const pgcd = (m, n) => n === 0 ? m : pgcd(n, m % n);
  const fractionsReduites = [...s.matchAll(/(\d+)\/(\d+)/g)].every(([, n, d]) => Number(d) > 1 && pgcd(Number(n), Number(d)) === 1);
  if (!fractionsReduites) return false;

  const termes = s.replace(/(?!^)[+-]/g, '|$&').split('|');
  const degres = termes.map(t => t.includes('x^2') ? 2 : t.includes('x') ? 1 : 0);
  return new Set(degres).size === degres.length;
}

/** Quotient exact de P par F (F de degré 0 ou 1), ou null si F ne divise pas P. */
function diviserPolynome(P, F) {
  if (F.estNul() || F.degre() > 1 || F.degre() > P.degre()) return null;
  if (F.estConstant()) return P.divScalaire(F.coeff(0).simplify());

  const f1 = F.coeff(1);
  const f0 = F.coeff(0);
  const q1 = P.degre() === 2 ? P.coeff(2).div(f1).simplify() : new Nombre("0");
  const q0 = P.coeff(1).sub(q1.mul(f0)).div(f1).simplify();
  const Q = Polynome.fromConstant(q0).add(Polynome.fromMonome(q1, 1));
  return F.mul(Q).equals(P) ? Q : null;
}

/** Écrit un facteur en LaTeX : "x" tel quel, sinon entre parenthèses. */
function facteurLatex(f) {
  return f.coeff(0).equal(new Nombre("0")) ? f.toLatex() : `(${f.toLatex()})`;
}

class OperationRow {
  /**
   * @param {Polynome} polyLhs - membre gauche courant
   * @param {Polynome} polyRhs - membre droit courant
   * @param {Equation} equationCible - équation à résoudre (pour connaître la solution cible)
   * @param {HTMLElement} container
   * @param {OperationRow|null} ligneParente - la ligne dont la validation a produit cette équation
   *   (sert à retirer le bouton ❌ de la parente dès qu'on avance d'une étape).
   * @param {{gauche: string, droite: string}|null} formeLatex - écriture à afficher à la place
   *   du polynôme développé (ex: 6(2x+3) = 4(x+5) après un produit en croix).
   * @param {boolean} saisieResultat - saisie accompagnée : l'élève doit d'abord taper cette équation.
   */
  constructor(polyLhs, polyRhs, equationCible, container, ligneParente = null, formeLatex = null, saisieResultat = false) {
    this.formeLatex = formeLatex;
    this.saisieResultat = saisieResultat;
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

    if (saisieResultat) {
      this._renderSaisieResultat();
    } else {
      this._renderEquation();
      this._renderInput();
    }
  }

  /** Saisie accompagnée : l'équation obtenue est à taper à la place de son affichage. */
  _renderSaisieResultat() {
    this.input = document.createElement('input');
    this.input.className = 'op-input op-input-resultat';
    this.input.placeholder = 'équation';
    this.eqCell.appendChild(this.input);
    this.input.focus();
    this.input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && this.input.value.includes('=')) this._validerResultat();
    });
    this.input.addEventListener('input', () => this._effacerErreur());

    this.btnRecopier = document.createElement('button');
    this.btnRecopier.type = 'button';
    this.btnRecopier.className = 'recopier-button';
    this.btnRecopier.textContent = 'Recopier';
    this.btnRecopier.title = 'Remettre la ligne précédente dans le champ';
    this.btnRecopier.onclick = () => {
      this._effacerErreur();
      this.input.value = this.ligneParente._texteLigne();
      this.input.focus();
    };
    this.opCell.appendChild(this.btnRecopier);

    this._afficherOutils();
  }

  /** Après un refus : un bouton remet la réponse refusée dans le champ, même après Recopier. */
  _proposerModifier(texte) {
    if (!this.btnModifier) {
      this.btnModifier = document.createElement('button');
      this.btnModifier.type = 'button';
      this.btnModifier.className = 'recopier-button';
      this.btnModifier.textContent = 'Modifier';
      this.btnModifier.title = 'Remettre la réponse refusée dans le champ';
      this.btnModifier.onclick = () => {
        this._effacerErreur();
        this.input.value = this.reponseRefusee;
        this.input.focus();
      };
      this.opCell.appendChild(this.btnModifier);
    }
    this.reponseRefusee = texte;
  }

  /** Cette ligne, écrite comme l'élève la taperait. */
  _texteLigne() {
    if (!this.ligneParente) return `${this.equationCible.lhs}=${this.equationCible.rhs}`;

    const { cas, produit } = this.formeLatex || {};
    if (cas) return cas.map(f => `${textePolynome(f)}=0`).join(' ou ');
    if (produit) {
      const facteurs = produit.facteurs.map(f => f.coeff(0).equal(new Nombre("0")) ? textePolynome(f) : `(${textePolynome(f)})`);
      return `${produit.k ? produit.k.toString() : ''}${facteurs.join('')}=0`;
    }
    return `${textePolynome(this.polyLhs)}=${textePolynome(this.polyRhs)}`;
  }

  _validerResultat() {
    const forme = this.formeLatex;
    const texte = this.input.value;
    const erreur = forme?.finale ? this._erreurSolutions(texte, forme.finale)
      : forme?.cas ? this._erreurCas(texte, forme.cas)
      : forme?.produit ? this._erreurProduit(texte)
      : this._erreurEquation(texte);

    if (erreur) {
      this._signalerErreur(erreur);
      this._proposerModifier(texte);
      return;
    }

    this._effacerErreur();
    this.input.remove();
    this.input = null;
    this.btnRecopier.remove();
    this.btnModifier?.remove();
    this.saisieResultat = false;

    if (forme?.finale) {
      this.ligneParente._masquerBoutonAnnulation();
      this.wrapper.remove();
      this._afficherResultatFinal(forme.finale
        .map(f => `x = ${f.getSolution().simplify().toLatex()}`)
        .join(' \\text{ ou } '));
      afficherVerification(this.container, this.equationCible, forme.finale.map(f => f.getSolution()));
      createNextBtn(this.container);
    } else if (!forme?.cas && this._estResolue(this.polyLhs, this.polyRhs)) {
      this.ligneParente._masquerBoutonAnnulation();
      this.wrapper.remove();
      this._conclure(this.polyLhs, this.polyRhs);
    } else {
      this._renderEquation();
      this._renderInput();
    }
  }

  /** Équation attendue. Sur une ligne sans écriture particulière, elle doit être réduite. */
  _erreurEquation(texte) {
    const membres = lireMembres(texte);
    const [g, d] = membres ? membres.map(polynomeSaisi) : [null, null];
    if (!g || !d) return "Expression invalide.";
    if (!g.equals(this.polyLhs) || !d.equals(this.polyRhs)) return "Ce n'est pas le résultat de cette opération.";

    const reduit = coefficientsReduits(g) && coefficientsReduits(d) && membres.every(ecritureReduite);
    return this.formeLatex || reduit ? null : "Ce résultat n'est pas réduit.";
  }

  /** Produit de deux facteurs réduits, égal à 0. L'écriture de l'élève devient celle de la ligne. */
  _erreurProduit(texte) {
    const membres = lireMembres(texte);
    if (!membres) return "Expression invalide.";

    const droite = polynomeSaisi(membres[1]);
    if (!droite || !droite.estNul()) return "Le membre de droite doit valoir 0.";

    const facteurs = this._lireProduitReduit(membres[0]);
    if (typeof facteurs === 'string') return facteurs;

    this.formeLatex = this._formeProduit({ k: null, facteurs });
    return null;
  }

  /** « A=0 ou B=0 », dans n'importe quel ordre. */
  _erreurCas(texte, facteurs) {
    const parties = texte.split(/\bou\b/i).map(lireMembres);
    if (parties.length !== facteurs.length || parties.some(m => !m)) {
      return "Écris une équation par facteur, séparées par « ou ».";
    }

    const restants = [...facteurs];
    for (const [g, d] of parties) {
      const poly = polynomeSaisi(g);
      const droite = polynomeSaisi(d);
      const i = poly && droite && droite.estNul() ? restants.findIndex(f => f.equals(poly)) : -1;
      if (i === -1) return "Chaque facteur doit être égal à 0.";
      restants.splice(i, 1);
    }
    return null;
  }

  /** « x=a ou x=b », valeurs réduites, dans n'importe quel ordre. */
  _erreurSolutions(texte, facteurs) {
    const parties = texte.split(/\bou\b/i).map(lireMembres);
    if (parties.length !== facteurs.length || parties.some(m => !m)) {
      return "Écris une solution par facteur : x=… ou x=…";
    }

    const restants = facteurs.map(f => f.getSolution().simplify());
    for (const [g, d] of parties) {
      const valeur = polynomeSaisi(d);
      if (g.replace(/\s+/g, '') !== 'x' || !valeur || !valeur.estConstant()) return "Écris une solution par facteur : x=… ou x=…";
      if (!coefficientsReduits(valeur) || !ecritureReduite(d)) return "Ces solutions ne sont pas réduites.";

      const i = restants.findIndex(r => r.equal(valeur.coeff(0)));
      if (i === -1) return "Ce ne sont pas les solutions.";
      restants.splice(i, 1);
    }
    return null;
  }

  _renderEquation() {
    // Énoncé avec un quotient : on garde sa forme (\frac{ax+b}{u}) sur la
    // première ligne, sinon le développement en polynôme ferait disparaître
    // le dénominateur sur lequel l'élève doit justement raisonner.
    const eq = this.equationCible;
    const garderForme = !this.ligneParente && /\)\s*[:(^]|\)\s*-\s*\(|x\(/.test(`${eq.lhs} ${eq.rhs}`);
    const gauche = this.formeLatex ? this.formeLatex.gauche
      : garderForme ? formatToLatex(eq.lhs) : this.polyLhs.toLatex();
    const droite = this.formeLatex ? this.formeLatex.droite
      : garderForme ? formatToLatex(eq.rhs) : this.polyRhs.toLatex();

    // Mémorisé pour écrire la différence sans perdre la forme affichée.
    this.formeAffichee = (this.formeLatex || garderForme) ? { gauche, droite } : null;

    this.eqCell.innerHTML = `\\(${gauche} = ${droite}\\)`;
    if (window.MathJax) MathJax.typesetPromise([this.eqCell]);
  }

  _renderInput() {
    // Ligne « A = 0 ou B = 0 » : une opération ne s'applique pas ici, seul ce bouton continue.
    if (this.formeLatex?.cas) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'op-resoudre';
      btn.textContent = 'Résoudre les deux équations';
      btn.onclick = () => {
        this._freeze('\\text{résoudre}');
        if (modeActuel === 'accompagnee') {
          new OperationRow(this.polyLhs, this.polyRhs, this.equationCible, this.container, this,
            { finale: this.formeLatex.cas }, true);
        } else {
          this._resoudreCasEnParallele(this.formeLatex.cas);
        }
      };
      this.opCell.appendChild(btn);
      this._afficherOutils();
      return;
    }

    this.input = document.createElement('input');
    this.input.className = 'op-input';
    this.input.placeholder = 'opé';
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

    this.wrapper.classList.add('op-row-saisie');
    this._afficherOutils();
  }

  /**
   * Un outil qui ne s'applique pas reste cliquable et explique pourquoi : le
   * griser indiquerait à l'élève quelle étape choisir.
   */
  /** Remplit le panneau de droite avec les outils de cette ligne. */
  _afficherOutils() {
    const panneau = panneauOutils();
    panneau.innerHTML = '';

    // Tant que la ligne attend autre chose qu'une opération, les outils ne s'appliquent pas.
    const blocage = this.saisieResultat ? "Écris d'abord le résultat de l'étape."
      : this.formeLatex?.cas ? "Clique sur « Résoudre les deux équations »."
      : null;

    const groupes = [
      ['Transformation des membres', [
        ['Développer', null, this._actionDevelopper(), "Rien à développer sur cette ligne."],
        ['Factoriser', null, this._actionFactoriser(), "Pour factoriser, il faut une ligne de la forme P = 0 qui ne soit pas déjà un produit."]
      ]],
      ['Équivalences', [
        ['Différence nulle', 'A = B ⇔ A − B = 0', this._actionDifferenceNulle(), "Le membre de droite vaut déjà 0."],
        ['Produit nul', 'A × B = 0 ⇔ A = 0 ou B = 0', this._actionProduitNul(), "Il faut d'abord un produit égal à 0."],
        ['Produit en croix', 'A/B = C/D ⇔ A × D = B × C', this._actionProduitEnCroix(), "Le produit en croix demande un quotient de chaque côté, sur l'énoncé."],
        ['Équation x² = a', 'selon le signe de a', this._actionCarreEgal(), "Il faut une ligne de la forme x² = a."]
      ]]
    ];

    groupes.forEach(([titreGroupe, outils]) => {
      const titre = document.createElement('div');
      titre.className = 'panel-groupe-label';
      titre.textContent = titreGroupe;
      panneau.appendChild(titre);

      outils.forEach(([nom, formule, action, refus]) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'panel-btn';
        btn.textContent = nom;
        if (formule) {
          const detail = document.createElement('span');
          detail.className = 'outil-formule';
          detail.textContent = formule;
          btn.appendChild(detail);
        }
        btn.onclick = () => {
          if (blocage) this._refuserOutil(blocage);
          else if (action) action();
          else this._refuserOutil(refus);
        };
        panneau.appendChild(btn);
      });
    });

    if (Math.max(this.polyLhs.degre(), this.polyRhs.degre()) === 2) {
      const conseil = document.createElement('p');
      conseil.className = 'outil-conseil';
      conseil.textContent = 'Pour une équation du second degré, on se ramène à une équation produit nul.';
      panneau.appendChild(conseil);
    }
  }

  _refuserOutil(message) {
    this.opCell.classList.add('op-erreur');
    this.feedbackCell.innerHTML = `<span class="op-msg-erreur">${message}</span>`;
  }

  _membreDroitNul() {
    return this.polyRhs.estConstant() && this.polyRhs.coeff(0).equal(new Nombre("0"));
  }

  /** Sur une ligne affichée sous une forme non développée : passe à la forme développée. */
  _actionDevelopper() {
    const developpable = this.formeLatex
      ? this.formeLatex.developpable !== false
      : !!(this._factorisationEnonce()
          || (!this.ligneParente && (decouperProduit(this.equationCible.lhs) || /\)\s*-\s*\(/.test(this.equationCible.lhs))));
    if (!developpable) return null;

    return () => {
      this._freeze('\\text{développer}');
      this._poursuivre(this.polyLhs, this.polyRhs);
    };
  }

  /** Lit un produit de deux facteurs réduits égal au membre gauche : les facteurs, ou un message d'erreur. */
  _lireProduitReduit(texte) {
    const textes = decouperProduit(texte);
    if (!textes) return "Écris un produit de deux facteurs, par exemple (x+1)(x-7).";

    const facteurs = textes.map(polynomeSaisi);
    if (facteurs.some(f => f === null || f.degre() !== 1)) return "Chaque facteur doit être du premier degré.";
    if (!textes.every(ecritureReduite)) return "Ces facteurs ne sont pas encore réduits.";
    if (!facteurs[0].mul(facteurs[1]).equals(this.polyLhs)) return "Ce n'est pas égal à ce membre.";
    return facteurs;
  }

  /** A = B équivaut à A - B = 0. */
  _actionDifferenceNulle() {
    if (this._membreDroitNul()) return null;

    return () => {
      const forme = this.formeAffichee
        ? {
            gauche: `${this.formeAffichee.gauche} - ${this.formeAffichee.droite}`,
            droite: '0',
            factorisation: this._factorisationEnonce()
          }
        : null;
      const zero = Polynome.fromMonome(new Nombre("0"), 0);
      this._freeze('\\text{diff. nulle}');
      this._poursuivre(this.polyLhs.sub(this.polyRhs), zero, forme);
    };
  }

  /** Énoncé déjà écrit comme un produit nul : { k: null, facteurs }, sinon null. */
  _produitEnonce() {
    if (this.ligneParente || !this._membreDroitNul()) return null;

    const facteurs = lireProduit(this.equationCible.lhs);
    return facteurs ? { k: null, facteurs } : null;
  }

  /**
   * Factorisation de A²-B² ou A×B-A×C quand l'énoncé a cette forme :
   * { k: null, facteurs, latex }, sinon null. Garde l'écriture avec A, B et C,
   * contrairement à la factorisation générale qui part de la forme développée.
   */
  _factorisationEnonce() {
    if (this.ligneParente) return null;

    const { lhs, rhs } = this.equationCible;
    const par = (p) => `(${p.toLatex()})`;

    const A = lireCarre(lhs);
    const B = lireCarre(rhs);
    if (A && B) {
      const facteurs = [A.sub(B), A.add(B)];
      if (!facteurs.every(f => f.degre() === 1)) return null;
      return {
        k: null,
        facteurs,
        latex: `(${par(A)} - ${par(B)})(${par(A)} + ${par(B)})`
      };
    }

    const g = decouperProduit(lhs);
    const d = decouperProduit(rhs);
    if (g && d && g[0] === d[0]) {
      const commun = polynomeDe(g[0]);
      const [P, Q] = [polynomeDe(g[1]), polynomeDe(d[1])];
      const reste = P.sub(Q);
      if (commun.degre() !== 1 || reste.degre() !== 1) return null;
      return {
        k: null,
        facteurs: [commun, reste],
        latex: `${facteurLatex(commun)}(${par(P)} - ${par(Q)})`,
        commun
      };
    }

    return null;
  }

  /** Sur P = 0 : demande le type de factorisation, puis les facteurs à l'élève. */
  _actionFactoriser() {
    if (this.formeLatex?.produit || this._produitEnonce() || !this._membreDroitNul()) return null;
    return () => this._vueTypeFactorisation();
  }

  _viderPanneau(titre) {
    const panneau = panneauOutils();
    panneau.innerHTML = '';

    const label = document.createElement('div');
    label.className = 'panel-groupe-label';
    label.textContent = titre;
    panneau.appendChild(label);
    return panneau;
  }

  _boutonPanneau(panneau, texte, action, classe = 'panel-btn') {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = classe;
    btn.textContent = texte;
    btn.onclick = action;
    panneau.appendChild(btn);
  }

  _vueTypeFactorisation() {
    this._effacerErreur();
    const panneau = this._viderPanneau('Factoriser : quel type ?');

    const retour = { texte: 'Retour au type', action: () => this._vueTypeFactorisation() };
    const appliquer = (resultat) => {
      this._freeze('\\text{factoriser}');
      this._poursuivre(this.polyLhs, this.polyRhs, {
        gauche: resultat.facteur.latex,
        droite: '0',
        developpable: false,
        produit: resultat.facteur,
        aReduire: resultat.aReduire
      });
    };

    this._boutonPanneau(panneau, 'Facteur commun', () => this._vueSaisie(
      'Facteur commun', ['Facteur commun'], ([F]) => this._factoriserParFacteur(F), appliquer, retour
    ));
    this._boutonPanneau(panneau, 'A² − B²', () => this._vueSaisie(
      'A² − B²', ['A', 'B'], ([A, B]) => this._factoriserParCarres(A, B), appliquer, retour
    ));
    this._boutonPanneau(panneau, 'Retour à la liste', () => this._afficherOutils(), 'panel-btn accent');
  }

  /**
   * Formulaire du panneau : un champ par libellé.
   * @param {(polynomes: Polynome[], textes: string[]) => *} calculer -
   *   renvoie le message d'erreur à afficher (string), ou le résultat.
   * @param {(resultat: *) => void} appliquer - applique le résultat validé
   * @param {{texte: string, action: () => void}} retour - bouton de retour du formulaire
   */
  _vueSaisie(titre, libelles, calculer, appliquer, retour) {
    const panneau = this._viderPanneau(titre);

    const champs = libelles.map(libelle => {
      const etiquette = document.createElement('label');
      etiquette.className = 'panneau-champ';
      etiquette.textContent = libelle;

      const champ = document.createElement('input');
      champ.type = 'text';
      champ.autocomplete = 'off';
      champ.addEventListener('keydown', (e) => { if (e.key === 'Enter') valider(); });
      etiquette.appendChild(champ);
      panneau.appendChild(etiquette);
      return champ;
    });

    const erreur = document.createElement('div');
    erreur.className = 'op-msg-erreur panneau-erreur';

    const valider = () => {
      const polynomes = champs.map(c => polynomeSaisi(c.value));
      if (polynomes.some(p => p === null)) {
        erreur.textContent = 'Expression invalide.';
        return;
      }

      const resultat = calculer(polynomes, champs.map(c => c.value));
      if (typeof resultat === 'string') {
        erreur.textContent = resultat;
        return;
      }

      appliquer(resultat);
    };

    this._boutonPanneau(panneau, 'Valider', valider, 'panel-btn accent');
    panneau.appendChild(erreur);
    this._boutonPanneau(panneau, retour.texte, retour.action);

    champs[0].focus();
  }

  _factoriserParFacteur(F) {
    // Le facteur de l'énoncé A×B - A×C garde l'écriture avec B et C.
    const enonce = this.formeLatex?.factorisation;
    if (enonce?.commun && enonce.commun.equals(F)) {
      return { facteur: enonce, aReduire: true };
    }

    const Q = diviserPolynome(this.polyLhs, F);
    if (!Q) return "Ce n'est pas un facteur commun de cette expression.";

    const un = new Nombre("1");
    if ((F.estConstant() && F.coeff(0).equal(un)) || (Q.estConstant() && Q.coeff(0).equal(un))) {
      return "Ce facteur ne factorise rien.";
    }
    if (Q.degre() >= 2) {
      return "Il resterait un facteur de degré 2 : ce facteur commun ne permet pas de conclure.";
    }

    if (F.estConstant()) {
      const k = F.coeff(0).simplify();
      return { facteur: { k, facteurs: [Q], latex: `${k.toLatex()}${facteurLatex(Q)}` }, aReduire: false };
    }
    if (Q.estConstant()) {
      const k = Q.coeff(0).simplify();
      return { facteur: { k, facteurs: [F], latex: `${k.toLatex()}${facteurLatex(F)}` }, aReduire: false };
    }
    return {
      facteur: { k: null, facteurs: [F, Q], latex: `${facteurLatex(F)}${facteurLatex(Q)}` },
      aReduire: false
    };
  }

  _factoriserParCarres(A, B) {
    if (!A.pow(2).sub(B.pow(2)).equals(this.polyLhs)) {
      return "A² − B² ne redonne pas cette expression.";
    }

    const moins = A.sub(B);
    const plus = A.add(B);
    const constantes = [moins, plus].filter(f => f.estConstant());
    const facteurs = [moins, plus].filter(f => !f.estConstant());
    const k = constantes.length ? constantes[0].coeff(0).simplify() : null;

    const par = (p) => `(${p.toLatex()})`;
    return {
      facteur: { k, facteurs, latex: `(${par(A)} - ${par(B)})(${par(A)} + ${par(B)})` },
      aReduire: true
    };
  }

  /**
   * k·P·Q = 0 équivaut à k = 0 ou P = 0 ou Q = 0. k n'étant pas nul, il reste
   * un cas par facteur (une racine double ne donne qu'un seul cas).
   */
  _actionProduitNul() {
    const produit = this.formeLatex?.produit || this._produitEnonce();
    if (!produit) return null;

    return () => {
      const zero = Polynome.fromMonome(new Nombre("0"), 0);
      const vus = new Set();
      const facteurs = produit.facteurs.filter(f => {
        const racine = f.getSolution().simplify().toString();
        return !vus.has(racine) && vus.add(racine);
      });

      const morceaux = [
        ...(produit.k ? [`${produit.k.toLatex()} = 0`] : []),
        ...facteurs.map(f => `${f.toLatex()} = 0`)
      ];
      const gauche = morceaux.join(' \\text{ ou } ').replace(/ = 0$/, '');

      this._freeze('\\text{produit nul}');

      if (facteurs.length === 1) {
        this._poursuivre(facteurs[0], zero, { gauche, droite: '0', developpable: false });
      } else {
        new OperationRow(this.polyLhs, this.polyRhs, this.equationCible, this.container, this,
          { gauche, droite: '0', developpable: false, cas: facteurs }, modeActuel === 'accompagnee');
      }
    };
  }

  /** Étapes de résolution de ax+b = 0, en LaTeX. */
  _etapesCas(facteur) {
    const zero = new Nombre("0");
    const a = facteur.coeff(1).simplify();
    const b = facteur.coeff(0).simplify();
    const aVautUn = a.equal(new Nombre("1"));
    const bNul = b.equal(zero);

    const etapes = [`${facteur.toLatex()} = 0`];
    if (!bNul && !aVautUn) {
      etapes.push(`${Polynome.fromMonome(a, 1).toLatex()} = ${zero.sub(b).simplify().toLatex()}`);
    }
    if (!bNul || !aVautUn) {
      etapes.push(`x = ${facteur.getSolution().simplify().toLatex()}`);
    }
    return etapes;
  }

  /** Résout tous les facteurs en parallèle : chaque étape tient sur une ligne « A ou B ». */
  _resoudreCasEnParallele(facteurs) {
    // Plus aucun retour en arrière une fois l'équation résolue.
    this._masquerBoutonAnnulation();

    const etapes = facteurs.map(f => this._etapesCas(f));
    const nbLignes = Math.max(...etapes.map(e => e.length));

    // Un cas déjà terminé répète sa dernière étape sur les lignes suivantes.
    const ligne = (i) => etapes
      .map(e => e[Math.min(i, e.length - 1)])
      .join(' \\text{ ou } ');

    // La ligne 0 est déjà affichée, la dernière est la conclusion.
    for (let i = 1; i < nbLignes - 1; i++) this._afficherLigneAuto(ligne(i));

    this._afficherResultatFinal(ligne(nbLignes - 1));
    afficherVerification(this.container, this.equationCible, facteurs.map(f => f.getSolution()));
    createNextBtn(this.container);
  }

  /** Ligne de résolution automatique, en lecture seule. */
  _afficherLigneAuto(latex) {
    const rang = document.createElement('div');
    rang.className = 'op-row op-row-validee';

    const equivCell = document.createElement('div');
    equivCell.className = 'equiv-zone';
    equivCell.innerHTML = '\\(\\Leftrightarrow\\)';

    const eqCell = document.createElement('div');
    eqCell.className = 'op-eq-cell';
    eqCell.innerHTML = `\\(${latex}\\)`;

    rang.append(equivCell, eqCell, document.createElement('div'), document.createElement('div'));
    this.container.appendChild(rang);

    if (window.MathJax) MathJax.typesetPromise([equivCell, eqCell]);
  }

  /** Sur une ligne x² = a : demande le signe de a. */
  _actionCarreEgal() {
    const zero = new Nombre("0");
    const un = new Nombre("1");
    const estCarre = this.polyLhs.degre() === 2 && this.polyLhs.coeff(2).equal(un)
      && this.polyLhs.coeff(1).equal(zero) && this.polyLhs.coeff(0).equal(zero);
    if (!estCarre || !this.polyRhs.estConstant()) return null;

    const signeA = Math.sign(this.polyRhs.coeff(0).simplify().valeurNum.a);
    const nbSolutions = signeA + 1; // a < 0 : 0, a = 0 : 1, a > 0 : 2

    return () => this._vueChoix('x² = a : quel est le signe de a ?',
      [['a > 0', signeA === 1], ['a = 0', signeA === 0], ['a < 0', signeA === -1]],
      "Ce n'est pas le signe de a.",
      () => this._vueChoix('a ' + ['< 0', '= 0', '> 0'][nbSolutions] + ' : combien de solutions ?',
        [['Pas de solution', nbSolutions === 0], ['Une solution', nbSolutions === 1], ['Deux solutions', nbSolutions === 2]],
        "Ce n'est pas le bon nombre de solutions.",
        (erreur) => this._appliquerCarreEgal(signeA, erreur)
      )
    );
  }

  /**
   * Question à choix dans le panneau, en minuscules.
   * @param {[string, boolean][]} choix - texte du bouton, et s'il est juste
   * @param {(erreur: HTMLElement) => void} surJuste - appelée quand l'élève choisit juste
   */
  _vueChoix(titre, choix, messageFaux, surJuste) {
    const panneau = this._viderPanneau(titre);
    panneau.firstChild.classList.add('sans-majuscules');

    const erreur = document.createElement('div');
    choix.forEach(([texte, juste]) => {
      this._boutonPanneau(panneau, texte, () => {
        if (juste) surJuste(erreur);
        else erreur.textContent = messageFaux;
      });
    });

    erreur.className = 'op-msg-erreur panneau-erreur';
    panneau.appendChild(erreur);
    this._boutonPanneau(panneau, 'Retour à la liste', () => this._afficherOutils());
  }

  /** a > 0 : x = √a ou x = -√a ; a = 0 : x = 0 ; a < 0 : pas de solution. */
  _appliquerCarreEgal(signe, erreur) {
    const zero = new Nombre("0");
    const x = Polynome.fromMonome(new Nombre("1"), 1);

    if (signe > 0) {
      const racines = racinesRationnelles(this.polyLhs.sub(this.polyRhs));
      if (!racines) {
        erreur.textContent = "a n'est pas le carré d'un nombre rationnel.";
        return;
      }
      const r = racines.find(v => v.valeurNum.a > 0);
      const facteurs = [r, zero.sub(r).simplify()].map(v => x.sub(Polynome.fromConstant(v)));

      this._freeze('\\text{type } x^2=a');
      if (modeActuel === 'accompagnee') {
        new OperationRow(this.polyLhs, this.polyRhs, this.equationCible, this.container, this, { finale: facteurs }, true);
        return;
      }
      this._masquerBoutonAnnulation();
      this._afficherResultatFinal(facteurs
        .map(f => `x = ${nombreLatex(f.getSolution())}`)
        .join(' \\text{ ou } '));
      afficherVerification(this.container, this.equationCible, facteurs.map(f => f.getSolution()));
      createNextBtn(this.container);
      return;
    }

    this._freeze('\\text{type } x^2=a');
    if (signe === 0) {
      this._poursuivre(x, Polynome.fromConstant(zero));
      return;
    }
    this._masquerBoutonAnnulation();
    this._afficherResultatFinal('\\text{Pas de solution}');
    createNextBtn(this.container);
  }

  /** Sur l'énoncé uniquement, quand chaque membre est un quotient. */
  _actionProduitEnCroix() {
    if (this.ligneParente) return null;

    const gauche = lireQuotient(this.equationCible.lhs);
    const droite = lireQuotient(this.equationCible.rhs);
    if (!gauche || !droite) return null;

    return () => this._produitEnCroix(gauche, droite);
  }

  /** a/u = c/v devient v·a = u·c, soit les deux membres multipliés par u·v. */
  _produitEnCroix(gauche, droite) {
    const facteur = Nombre.fromParts(gauche.denominateur * droite.denominateur, 1, "entier");
    const nouveauLhs = this.polyLhs.mulScalaire(facteur);
    const nouveauRhs = this.polyRhs.mulScalaire(facteur);

    this._freeze('\\text{en croix}');
    this._poursuivre(nouveauLhs, nouveauRhs, {
      gauche: `${droite.denominateur}(${formatToLatex(gauche.interieur)})`,
      droite: `${gauche.denominateur}(${formatToLatex(droite.interieur)})`
    });
  }

  _effacerErreur() {
    if (!this.opCell.classList.contains('op-erreur')) return;
    this.opCell.classList.remove('op-erreur');
    this.feedbackCell.innerHTML = '';
    this._retirerCroixErreur();
  }

  _retirerCroixErreur() {
    this._btnErreur?.remove();
    this._btnErreur = null;
  }

  _freeze(texteOperation) {
    this._retirerCroixErreur();
    if (this.input) this.input.remove();
    panneauOutils().innerHTML = '';
    this.wrapper.classList.remove('op-row-saisie');
    this.wrapper.classList.add('op-row-validee');
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
    // Retire ce qui suit cette étape : la ligne de saisie et une éventuelle ligne de réduction automatique.
    const lignes = [...this.container.querySelectorAll('.op-row')];
    const indexCette = lignes.indexOf(this.wrapper);
    lignes.slice(indexCette + 1).forEach(l => l.remove());

    this.wrapper.remove();
    // La parente redevient la dernière étape validée : elle réaffiche son bouton ❌.
    if (this.ligneParente) this.ligneParente._afficherBoutonAnnulation();
    new OperationRow(this.polyLhs, this.polyRhs, this.equationCible, this.container, this.ligneParente, this.formeLatex);
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
    this._poursuivre(nouveauLhs, nouveauRhs);
  }

  /** Après une étape validée : les fractions sont réduites, puis l'équation se conclut ou continue. */
  _poursuivre(lhs, rhs, formeLatex = null) {
    const nouveauLhs = polynomeReduit(lhs);
    const nouveauRhs = polynomeReduit(rhs);

    // Saisie accompagnée : c'est l'élève qui écrit le résultat (facteur constant excepté, cas rare).
    if (modeActuel === 'accompagnee' && !formeLatex?.produit?.k) {
      new OperationRow(nouveauLhs, nouveauRhs, this.equationCible, this.container, this, formeLatex, true);
      return;
    }

    if (this._estResolue(nouveauLhs, nouveauRhs)) {
      // Une fois résolu, plus aucun retour en arrière : il n'y a plus de ligne de saisie à recréer.
      this._masquerBoutonAnnulation();
      this._conclure(nouveauLhs, nouveauRhs);
      return;
    }

    // Produit encore écrit avec A, B et C : on le montre, puis sa réduction sur la ligne suivante.
    let forme = formeLatex;
    if (forme?.aReduire) {
      this._afficherLigneAuto(`${forme.gauche} = ${forme.droite}`);
      forme = this._formeProduit(forme.produit);
    }
    new OperationRow(nouveauLhs, nouveauRhs, this.equationCible, this.container, this, forme);
  }

  /** Écriture réduite d'un produit égal à 0. */
  _formeProduit({ k, facteurs }) {
    const reduits = facteurs.map(polynomeReduit);
    return {
      gauche: (k ? k.toLatex() : '') + reduits.map(facteurLatex).join(''),
      droite: '0',
      developpable: false,
      produit: { k, facteurs: reduits }
    };
  }

  /** x = nombre ou nombre = x. */
  _estResolue(lhs, rhs) {
    const estX = (p) => p.degre() === 1 && p.coeff(1).equal(new Nombre("1")) && p.coeff(0).equal(new Nombre("0"));
    return (estX(lhs) && rhs.estConstant()) || (estX(rhs) && lhs.estConstant());
  }

  _conclure(lhs, rhs) {
    const valeur = (lhs.estConstant() ? lhs : rhs).coeff(0).simplify();
    this._afficherResultatFinal(lhs.estConstant() ? `${valeur.toLatex()} = x` : `x = ${valeur.toLatex()}`);
    afficherVerification(this.container, this.equationCible, [valeur]);
    createNextBtn(this.container);
  }

  /** Affiche une ligne finale en lecture (x = valeur), avec le même calage que les autres lignes et le symbole ⟺. */
  _afficherResultatFinal(latex) {
    const ligneFinale = document.createElement('div');
    ligneFinale.className = 'op-row op-row-final';

    const equivCell = document.createElement('div');
    equivCell.className = 'equiv-zone';
    equivCell.innerHTML = '\\(\\Leftrightarrow\\)';

    const eqCell = document.createElement('div');
    eqCell.className = 'op-eq-cell';
    eqCell.innerHTML = `\\(${latex}\\)`;

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
   * Signale une saisie invalide : message d'erreur sous l'équation, et bouton ❌
   * dans la colonne réservée de la zone de saisie (retiré dès que l'élève
   * corrige ou valide, pour ne jamais avoir deux croix sur la même ligne).
   */
  _signalerErreur(message) {
    this.opCell.classList.add('op-erreur');
    this.feedbackCell.innerHTML = `<span class="op-msg-erreur">${message}</span>`;

    if (!this._btnErreur) {
      const btnX = document.createElement('button');
      btnX.className = 'delete-button';
      btnX.innerHTML = '❌';
      btnX.title = 'Effacer et retaper';
      btnX.onclick = () => {
        this.wrapper.remove();
        new OperationRow(this.polyLhs, this.polyRhs, this.equationCible, this.container, this.ligneParente, this.formeLatex, this.saisieResultat);
      };
      this.wrapper.appendChild(btnX);
      this._btnErreur = btnX;
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