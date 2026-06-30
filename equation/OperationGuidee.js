// ============================================================
// OperationGuidee.js — parser + application d'opérations atomiques
// ============================================================
// Mode "opération guidée" : l'élève tape uniquement l'opération à appliquer
// aux deux membres (ex: "-2", "+3x", ":4", "*(-1)"), jamais l'équation
// entière. Ce module reconnaît le format, vérifie la réversibilité, et
// applique l'opération à un Polynome (lhs ou rhs de l'équation courante).
//
// Formats acceptés (espaces internes tolérés) :
//   +k   -k   *k   :k      (k = scalaire : entier, décimal, fraction, signé)
//   +kx  -kx               (k = scalaire, terme en x ; "x" seul = coefficient 1)
// Tout le reste est rejeté avec un message explicite.
//
// Réversibilité :
//   +k, -k, +kx, -kx : toujours réversibles.
//   *k, :k           : réversibles seulement si k est un scalaire non nul.
//                       Un terme contenant x (*x, :x, *2x, :3x...) est
//                       TOUJOURS rejeté, quel que soit le coefficient,
//                       puisqu'on ne peut jamais garantir x != 0 à ce stade.
// ============================================================

class OperationGuidee {
  /**
   * Parse une chaîne d'opération. Renvoie soit un descripteur valide,
   * soit lève une Error avec un message explicite destiné à l'élève.
   * @returns {{ operateur: '+'|'-'|'*'|':', estTermeX: boolean, valeur: Nombre }}
   */
  static parser(saisie) {
    const s = String(saisie || '').replace(/\s+/g, '');
    if (!s) throw new Error("Saisie vide.");

    const operateur = s[0];
    if (!['+', '-', '*', ':'].includes(operateur)) {
      throw new Error("L'opération doit commencer par +, -, * ou :");
    }
    const reste = s.slice(1);
    if (!reste) throw new Error("Il manque la valeur de l'opération.");

    // Terme en x : "x", "2x", "1/2x", "-3x" (le signe global est déjà séparé
    // dans `operateur`, donc reste ne devrait pas recommencer par +/- sauf
    // cas comme ":-2" qui n'a pas de sens ici et sera rejeté par Nombre).
    const estTermeXSeul = /^x$/.test(reste);
    const estTermeXAvecCoeff = /^\d+(?:[.,]\d+)?(?:\/\d+)?x$/.test(reste);

    if (estTermeXSeul || estTermeXAvecCoeff) {
      if (operateur === '*' || operateur === ':') {
        throw new Error("Multiplier ou diviser par x n'est pas autorisé (x pourrait valoir 0).");
      }
      const valeur = estTermeXSeul ? new Nombre("1") : new Nombre(reste.slice(0, -1));
      return { operateur, estTermeX: true, valeur };
    }

    // Sinon : doit être un scalaire pur (Nombre). On laisse Nombre lever une
    // erreur de format si la chaîne ne correspond à aucun format reconnu
    // (entier, décimal, fraction).
    let valeur;
    try {
      valeur = new Nombre(reste);
    } catch (e) {
      throw new Error(`"${saisie}" n'est pas une opération valide (ex: +2, -3x, :4, *1/2).`);
    }

    if ((operateur === '*' || operateur === ':') && valeur.valeurNum.a === 0) {
      throw new Error(operateur === '*' ? "Multiplier par 0 n'est pas autorisé." : "Diviser par 0 est impossible.");
    }

    return { operateur, estTermeX: false, valeur };
  }

  /**
   * Applique une opération (déjà parsée) à un Polynome. Renvoie un nouveau Polynome.
   * @param {Polynome} polynome
   * @param {{operateur, estTermeX, valeur}} operation
   */
  static appliquer(polynome, operation) {
    const { operateur, estTermeX, valeur } = operation;

    if (estTermeX) {
      const terme = Polynome.fromMonome(valeur, 1);
      return (operateur === '+') ? polynome.add(terme) : polynome.sub(terme);
    }

    switch (operateur) {
      case '+': return polynome.addScalaire(valeur);
      case '-': return polynome.subScalaire(valeur);
      case '*': return polynome.mulScalaire(valeur);
      case ':': return polynome.divScalaire(valeur);
      default: throw new Error("Opérateur inconnu : " + operateur);
    }
  }

  /**
   * Parse ET applique en une fois à une paire {lhs, rhs} de Polynome.
   * Lève une Error si la saisie est invalide (à laisser remonter à l'appelant,
   * qui décide de l'affichage — ex: bouton ❌ pour retaper).
   */
  static appliquerSurEquation(saisie, polyLhs, polyRhs) {
    const operation = OperationGuidee.parser(saisie);
    return {
      lhs: OperationGuidee.appliquer(polyLhs, operation),
      rhs: OperationGuidee.appliquer(polyRhs, operation),
      operation
    };
  }

  /** Formate l'opération pour affichage texte simple (ex: "+2", "-3x", ":4"). */
  static formaterOperation(operation) {
    const { operateur, estTermeX, valeur } = operation;
    const estUn = valeur.equal(new Nombre("1"));
    const corps = estTermeX
      ? (estUn ? "x" : `${valeur.toString()}x`)
      : valeur.toString();
    return `${operateur}${corps}`;
  }

  /**
   * Formate l'opération en LaTeX (ex: "+2", "-3x", "\div 4", "\times \frac{1}{2}")
   * pour un rendu mathématique correct des fractions et du signe x — le texte
   * brut ("1/2x") serait ambigu visuellement, contrairement au rendu LaTeX.
   */
  static formaterOperationLatex(operation) {
    const { operateur, estTermeX, valeur } = operation;
    const estUn = valeur.equal(new Nombre("1"));
    const corpsLatex = estTermeX
      ? (estUn ? "x" : `${valeur.toLatex()}x`)
      : valeur.toLatex();

    // + et - restent lisibles tels quels ; * et : sont rendus en symboles
    // mathématiques explicites pour ne pas les confondre avec des opérateurs
    // de saisie bruts.
    if (operateur === '*') return `\\times ${corpsLatex}`;
    if (operateur === ':') return `\\div ${corpsLatex}`;
    return `${operateur}${corpsLatex}`;
  }
}
