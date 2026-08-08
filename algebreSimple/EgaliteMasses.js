// ============================================================
// EgaliteMasses.js — égalité texte entre expressions contenant les
// inconnues "a" et "b" (masses des deux fruits).
// ------------------------------------------------------------
// Principe : on NE réimplémente PAS de calcul littéral symbolique. On
// substitue a et b par leur valeur réelle (en grammes), on reconstruit un
// texte 100% concret, et on délègue TOUT le calcul — unités, conversions,
// parenthèses, produits, quotients, égalité — au moteur "expressions de
// grandeurs" de nombreProportionnalite (Atome / Somme / Difference /
// Produit / Quotient / ObjetString), repris ici SANS modification
// (Utils.js, Nombre.js, Grandeur.js, Expression.js, Somme.js, Produit.js,
// ObjetString.js).
//
// L'élève est libre d'écrire n'importe quelle expression valable : comme a
// et b sont remplacés par leur valeur AVANT évaluation, même "a*b" se
// calcule (ça donnera un résultat en g², qui ne correspondra simplement à
// aucune masse attendue — pas d'erreur artificielle "degré trop élevé").
// ============================================================

class EgaliteMassesError extends Error {}

/** Tokenise un membre d'égalité : NUMBER (avec unité optionnelle collée),
 *  IDENT ('a' ou 'b'), OP ('+','-','*',':'), PAREN ('(' ou ')'). */
function tokeniserMembre(texte) {
  const s = String(texte ?? '').replace(/,/g, '.');
  const tokens = [];
  let i = 0;

  while (i < s.length) {
    const c = s[i];
    if (/\s/.test(c)) { i++; continue; }

    if ('+-*:()'.includes(c)) {
      tokens.push({ type: (c === '(' || c === ')') ? 'paren' : 'op', text: c });
      i++;
      continue;
    }

    if (/[0-9.]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const nombreTexte = s.slice(i, j);

      // Unité optionnelle collée (ex: "g", "kg"...), SAUF si elle vaut
      // exactement "a" ou "b" : ce n'est alors pas une unité, mais
      // l'inconnue juste après (ex: "3a" = coefficient "3" puis "a").
      let k = j;
      while (k < s.length && /[a-zA-Z€]/.test(s[k])) k++;
      const suite = s.slice(j, k);

      if (suite === 'a' || suite === 'b') {
        tokens.push({ type: 'number', text: nombreTexte, sansUnite: true });
        tokens.push({ type: 'ident', text: suite });
        i = k;
        continue;
      }

      tokens.push({ type: 'number', text: nombreTexte + suite, sansUnite: suite === '' });
      i = k;
      continue;
    }

    if (/[a-zA-Z]/.test(c)) {
      let j = i + 1;
      while (j < s.length && /[a-zA-Z]/.test(s[j])) j++;
      const lettre = s.slice(i, j);
      if (lettre === 'a' || lettre === 'b') {
        tokens.push({ type: 'ident', text: lettre });
      } else {
        throw new EgaliteMassesError(`Lettre inconnue : "${lettre}".`);
      }
      i = j;
      continue;
    }

    throw new EgaliteMassesError(`Caractère non reconnu : "${c}".`);
  }

  return tokens;
}

/**
 * Prétraite un membre d'égalité par une passe de descente récursive sur les
 * tokens (grammaire : expr := terme (('+'|'-') terme)* ; terme := facteur
 * (('*'|':' | implicite) facteur)* ; facteur := NOMBRE | IDENT | '(' expr ')').
 * En une seule passe, elle :
 *  - remplace a/b par leur valeur concrète (entre parenthèses) ;
 *  - insère les "*" de multiplication implicite (le moteur réutilisé,
 *    ObjetString, n'en gère pas nativement — ex: "3a", "2(a+b)") ;
 *  - n'attribue l'unité par défaut ("g") qu'à un TERME entier (chaîne de
 *    facteurs séparés par "*"/":") pris dans son ensemble, et seulement
 *    quand AUCUN de ses facteurs ne porte déjà une unité ou n'est une
 *    inconnue — jamais à un nombre isolé au milieu d'un produit. Sans ça,
 *    "54g - 2*7g" gonflerait le "2" en "2g" et donnerait 2g*7g = 14g²,
 *    incompatible avec 54g (bug corrigé ici).
 *    Restreint au niveau le plus externe (profondeur 0) : à l'intérieur de
 *    parenthèses imbriquées, on ne devine rien — le rôle (coefficient ou
 *    masse autonome) se décide une fois, au niveau où le groupe entier
 *    apparaît réellement dans une somme.
 * Renvoie { texte, contientInconnue }.
 */
function pretraiterMembre(texte, aValeur, bValeur, unite) {
  const tokens = tokeniserMembre(texte);
  const contientInconnue = tokens.some(t => t.type === 'ident');

  let i = 0;
  const debuteFacteur = (t) => !!t && (t.type === 'number' || t.type === 'ident' || (t.type === 'paren' && t.text === '('));

  function parseFacteur() {
    const t = tokens[i];
    if (!t) throw new EgaliteMassesError('Expression invalide.');

    if (t.type === 'paren' && t.text === '(') {
      i++;
      const interieur = parseExpr();
      if (!tokens[i] || tokens[i].text !== ')') throw new EgaliteMassesError('Parenthèse manquante.');
      i++;
      return { sortie: [{ type: 'paren', text: '(' }, ...interieur.sortie, { type: 'paren', text: ')' }], porteUnite: interieur.porteUnite };
    }
    if (t.type === 'ident') {
      i++;
      const valeur = t.text === 'a' ? aValeur : bValeur;
      const texteValeur = unite ? `(${valeur}${unite})` : `(${valeur})`;
      return { sortie: [{ type: 'number', text: texteValeur }], porteUnite: true };
    }
    if (t.type === 'number') {
      i++;
      return { sortie: [t], porteUnite: !t.sansUnite };
    }
    throw new EgaliteMassesError('Expression invalide.');
  }

  function parseUnaire() {
    const t = tokens[i];
    if (t && t.type === 'op' && t.text === '-') {
      i++;
      const suite = parseUnaire();
      return { sortie: [t, ...suite.sortie], porteUnite: suite.porteUnite };
    }
    if (t && t.type === 'op' && t.text === '+') {
      i++;
      return parseUnaire();
    }
    return parseFacteur();
  }

  function parseTerme(profondeur) {
    let { sortie, porteUnite } = parseUnaire();
    while (true) {
      const t = tokens[i];
      if (t && t.type === 'op' && (t.text === '*' || t.text === ':')) {
        i++;
        const droite = parseUnaire();
        sortie = [...sortie, t, ...droite.sortie];
        porteUnite = porteUnite || droite.porteUnite;
        continue;
      }
      if (debuteFacteur(t)) {
        const droite = parseUnaire();
        sortie = [...sortie, { type: 'op', text: '*' }, ...droite.sortie];
        porteUnite = porteUnite || droite.porteUnite;
        continue;
      }
      break;
    }
    if (!porteUnite && unite && profondeur === 0) {
      sortie = [...sortie, { type: 'op', text: '*' }, { type: 'number', text: `1${unite}` }];
      porteUnite = true;
    }
    return { sortie, porteUnite };
  }

  function parseExpr(profondeur = 1) {
    let { sortie, porteUnite } = parseTerme(profondeur);
    while (tokens[i] && tokens[i].type === 'op' && (tokens[i].text === '+' || tokens[i].text === '-')) {
      const op = tokens[i]; i++;
      const droite = parseTerme(profondeur);
      sortie = [...sortie, op, ...droite.sortie];
      porteUnite = porteUnite || droite.porteUnite;
    }
    return { sortie, porteUnite };
  }

  const resultat = parseExpr(0);
  if (i < tokens.length) throw new EgaliteMassesError('Expression invalide.');

  return { texte: resultat.sortie.map(t => t.text).join(' '), contientInconnue };
}

/** Compare deux Atome renvoyés par ObjetString.calculer(). En mode "avec
 *  unité", un résultat "Scalaire" (l'élève n'a tapé aucune unité) est
 *  traité comme une masse dans l'unité par défaut — "170" et "170g"
 *  désignent la même chose. En mode "sans unité", tout est déjà scalaire :
 *  comparaison directe, sans coercion. */
function comparerAtomes(r1, r2, unite) {
  if (!unite) return r1.equals(r2);
  const versMasse = (r) => {
    if (r.getNature() === 'Scalaire') {
      return new Atome(new Grandeur(r.grandeur.valeur, { [unite]: 1 }), {});
    }
    return r;
  };
  return versMasse(r1).equals(versMasse(r2));
}

class EgaliteMasses {
  constructor(lhsTexte, rhsTexte) {
    this.lhsTexte = (lhsTexte ?? '').toString();
    this.rhsTexte = (rhsTexte ?? '').toString();
  }

  /**
   * Diagnostic de l'égalité pour des masses concrètes a = aValeur, b =
   * bValeur (entiers). `unite` : "g" (par défaut) pour raisonner en masses,
   * ou null pour le mode "sans unité" (tout redevient un nombre nu).
   *  - 'invalide' : erreur de syntaxe, unité inconnue, ou unités
   *                 incompatibles (ex: mélange avec une durée).
   *  - 'disparu'  : ni a ni b n'apparaissent dans l'égalité.
   *  - 'faux'     : égalité syntaxiquement valide mais non vérifiée.
   *  - 'ok'       : égalité vraie.
   */
  diagnostiquer(aValeur, bValeur, unite = 'g') {
    let gauche, droite;
    try {
      gauche = pretraiterMembre(this.lhsTexte, aValeur, bValeur, unite);
      droite = pretraiterMembre(this.rhsTexte, aValeur, bValeur, unite);
    } catch (e) {
      return { statut: 'invalide', message: e.message };
    }

    if (!gauche.contientInconnue && !droite.contientInconnue) {
      return { statut: 'disparu' };
    }

    try {
      const osGauche = new ObjetString(gauche.texte, {});
      const osDroite = new ObjetString(droite.texte, {});
      if (!osGauche.isValid() || !osDroite.isValid()) {
        return { statut: 'invalide', message: osGauche.erreur || osDroite.erreur };
      }

      const rGauche = osGauche.calculer().resultat;
      const rDroite = osDroite.calculer().resultat;

      return { statut: comparerAtomes(rGauche, rDroite, unite) ? 'ok' : 'faux' };
    } catch (e) {
      return { statut: 'invalide', message: e.message };
    }
  }

  /** Renvoie 'a' ou 'b' si l'égalité isole proprement une inconnue (seule
   *  d'un côté) avec une écriture simple pour la valeur trouvée, sinon
   *  null. */
  variableIsolee(aValeur, bValeur, unite = 'g') {
    const lhs = this.lhsTexte.trim();
    const rhs = this.rhsTexte.trim();

    let variable = null, autreTexte = null;
    if (lhs === 'a' || lhs === 'b') { variable = lhs; autreTexte = this.rhsTexte; }
    else if (rhs === 'a' || rhs === 'b') { variable = rhs; autreTexte = this.lhsTexte; }
    if (!variable) return null;

    try {
      const { texte, contientInconnue } = pretraiterMembre(autreTexte, aValeur, bValeur, unite);
      if (contientInconnue) return null; // ex: "a = b" n'isole rien de concret

      const os = new ObjetString(texte, {});
      if (!os.isValid()) return null;
      const resultat = os.calculer().resultat;

      const nature = resultat.getNature();
      if (nature !== 'Masse' && nature !== 'Scalaire') return null;

      const te = resultat.nombre.typeEcriture;
      if (te !== 'entier' && te !== 'fractionSimple' && te !== 'dec') return null;
      return variable;
    } catch (e) {
      return null;
    }
  }
}
