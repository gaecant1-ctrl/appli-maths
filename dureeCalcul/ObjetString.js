// ============================================================
// ObjetString.js — parse une expression texte en arbre Expression
// ============================================================
// calculer() évalue l'arbre UNE fois (evaluer() réduit directement
// jusqu'à l'Atome final, plus de boucle de stabilisation par étapes).
// ============================================================

class ObjetString {
  constructor(expression, options) {
    this.expression = expression;
    this.options = options || {};
    this.erreur = null;
    this.tokens = this.tokeniser(expression);
    try {
      this.arbre = this.construireArbre();
    } catch (e) {
      this.arbre = null;
      this.erreur = e.message;
    }

    this.valid = (this.erreur === null && !!this.arbre);
  }

  isValid() {
    return !!this.valid;
  }

  tokeniser(expr) {
    const s = String(expr);
    const out = [];

    const isSpace     = c => /\s/.test(c);
    const isParen     = c => c === '(' || c === ')';
    const isOp        = c => c === '+' || c === '-' || c === '*' || c === ':';
    const isAtomStart = c => /[0-9a-zA-Z€]/.test(c);
    // ^ n'est PAS inclus ici : il est traité séparément (voir plus bas) pour
    // distinguer "m^2" (exposant d'unité, fait partie de l'atome) de
    // "(5+2)^2" (opérateur de puissance mathématique, token séparé).
    const isAtomChar  = c => /[0-9a-zA-Z€.,/·%]/.test(c);
    const isLetter    = c => /[a-zA-Z€]/.test(c);

    let i = 0;
    let prev = 'start'; // 'start' | 'atom' | 'op' | 'parenL' | 'parenR'

    while (i < s.length) {
      while (i < s.length && isSpace(s[i])) i++;
      if (i >= s.length) break;

      const c = s[i];

      if (isParen(c)) {
        out.push(c);
        prev = (c === '(') ? 'parenL' : 'parenR';
        i++;
        continue;
      }

      if (isOp(c)) {
        const unaryContext = (prev === 'start' || prev === 'op' || prev === 'parenL');

        // Le signe moins se fusionne avec le nombre s'il est en position unaire.
        // Le plus reste toujours binaire (pour ne pas casser "9+4.5").
        if (c === '-' && unaryContext) {
          let j = i + 1;
          while (j < s.length && isSpace(s[j])) j++;
          if (j < s.length && isAtomStart(s[j])) {
            const sign = c;
            let k = j + 1;
            while (k < s.length && isAtomChar(s[k])) k++;
            out.push(sign + s.slice(j, k));
            i = k;
            prev = 'atom';
            continue;
          }
        }

        out.push(c);
        prev = 'op';
        i++;
        continue;
      }

      // ^ : exposant d'unité ("m^2") si collé à une lettre juste avant dans CE token,
      // sinon opérateur de puissance mathématique séparé ("(5+2)^2", "5^2").
      if (c === '^') {
        const precedent = out.length ? out[out.length - 1] : '';
        const colleAUneUnite = (prev === 'atom') && /[a-zA-Z€]$/.test(precedent);
        if (colleAUneUnite) {
          // Absorbe "^", le signe optionnel, et les chiffres dans le token en cours.
          let k = i + 1;
          let frag = '^';
          if (k < s.length && (s[k] === '-' || s[k] === '+')) { frag += s[k]; k++; }
          const startDigits = k;
          while (k < s.length && /[0-9]/.test(s[k])) k++;
          if (k === startDigits) {
            // Pas de chiffre après ^ : ce n'est pas un exposant d'unité valide,
            // on retombe sur le comportement opérateur ci-dessous.
          } else {
            out[out.length - 1] = precedent + frag + s.slice(startDigits, k);
            i = k;
            prev = 'atom';
            continue;
          }
        }
        out.push('^');
        prev = 'op';
        i++;
        continue;
      }

      if (isAtomChar(c)) {
        let k = i + 1;
        while (k < s.length && isAtomChar(s[k])) k++;
        out.push(s.slice(i, k));
        prev = 'atom';
        i = k;
        continue;
      }

      out.push(s[i++]);
      prev = 'op';
    }

    return out;
  }

  analyserTokens() {
    const tokens = this.tokens || [];

    const isOp = (t) => t === '+' || t === '-' || t === '*' || t === ':' || t === '^';
    const isParen = (t) => t === '(' || t === ')';

    const out = [];

    for (const raw of tokens) {
      if (isParen(raw)) {
        out.push({ token: raw, nature: 'parenthèse', paren: raw });
        continue;
      }

      if (isOp(raw)) {
        out.push({ token: raw, nature: 'opération', op: raw });
        continue;
      }

      try {
        const atome = Atome.from(raw, {});
        out.push({ token: raw, nature: atome.getNature(), objet: atome });
      } catch (e) {
        if (e && (e.code === "UNITE_INVALIDE" || e.name === "UniteInvalideError")) {
          out.push({
            token: raw,
            nature: 'unite-invalide',
            invalidUnits: e.invalidUnits,
            erreur: e.message
          });
        } else {
          out.push({
            token: raw,
            nature: 'inconnu',
            erreur: e?.message || 'inconnu'
          });
        }
      }
    }

    return out;
  }

  construireArbre() {
    const tokensAnalyses = this.analyserTokens();

    // 1) PRIORITÉ : unité invalide -> message unique et clair
    const errUnits = tokensAnalyses.filter(t => t.nature === 'unite-invalide');
    if (errUnits.length > 0) {
      const invalidUnits = [...new Set(errUnits.flatMap(t => t.invalidUnits || []))];
      const msg = invalidUnits.length
        ? `Unité invalide : ${invalidUnits.join(', ')}`
        : `Unité invalide`;
      const e = new Error(msg);
      e.code = "UNITE_INVALIDE";
      e.invalidUnits = invalidUnits;
      throw e;
    }

    // 2) Autres erreurs de token
    const erreurs = tokensAnalyses.filter(t => t.nature === "inconnu");
    if (erreurs.length > 0) {
      const e = new Error("PARSE_ERROR");
      e.code = "PARSE_ERROR";
      throw e;
    }

    // 3) Parsing récursif descendant :
    //    Somme/Difference > Produit/Quotient (dont mult. implicite) > Puissance > Atome
    let index = 0;

    const parseExpression = () => parseAddSub();

    const peek = () => (index < tokensAnalyses.length ? tokensAnalyses[index] : null);

    const parseAtom = () => {
      if (index >= tokensAnalyses.length) throw new Error("Réponse invalide.");

      const token = tokensAnalyses[index++];

      if (token.token === '(') {
        const expr = parseExpression();
        if (index >= tokensAnalyses.length || tokensAnalyses[index++].token !== ')') {
          throw new Error("Réponse invalide.");
        }
        expr.instanceOptions = { ...(expr.instanceOptions || {}), parenthese: true };
        return expr;
      }

      if (token.objet) return token.objet;
      throw new Error("Réponse invalide.");
    };

    // Puissance : associative à droite (2^3^2 = 2^(3^2)).
    const parsePow = () => {
      const base = parseAtom();
      if (index < tokensAnalyses.length && peek().token === '^') {
        index++;
        const exposant = parsePow();
        return new Puissance([base, exposant], {});
      }
      return base;
    };

    // Un nouveau facteur commence sans opérateur explicite : "(" ou un atome.
    // C'est la multiplication implicite ("3(5+2)", "2(3+1)(4-1)").
    const debuteUnNouveauFacteur = () => {
      const t = peek();
      if (!t) return false;
      return t.token === '(' || !!t.objet;
    };

    const parseMulDiv = () => {
      let left = parsePow();
      while (index < tokensAnalyses.length) {
        const t = peek();
        if (t.token === '*' || t.token === ':') {
          const op = tokensAnalyses[index++].token;
          const right = parsePow();
          left = (op === '*') ? new Produit([left, right], {}) : new Quotient([left, right], {});
        } else if (debuteUnNouveauFacteur()) {
          // Multiplication implicite : pas de token opérateur, on en insère une.
          const right = parsePow();
          left = new Produit([left, right], {});
        } else {
          break;
        }
      }
      return left;
    };

    const parseAddSub = () => {
      let left = parseMulDiv();
      while (index < tokensAnalyses.length && ['+', '-'].includes(tokensAnalyses[index].token)) {
        const op = tokensAnalyses[index++].token;
        const right = parseMulDiv();
        if (op === '+') {
          left = (left instanceof Somme && !left.instanceOptions?.parenthese)
            ? new Somme([...left.termes, right], {})
            : new Somme([left, right], {});
        } else {
          left = new Difference([left, right], {});
        }
      }
      if (left instanceof Somme && left.termes.length === 1) return left.termes[0];
      return left;
    };

    const arbre = parseExpression();
    if (index < tokensAnalyses.length) throw new Error("Réponse invalide.");
    return arbre;
  }

  /**
   * Évalue l'arbre et renvoie l'Atome final.
   * Lève une exception si l'arbre est invalide ou si l'évaluation échoue
   * (unités incompatibles, division par zéro...).
   */
  calculer() {
    if (!this.arbre) throw new Error(this.erreur || "Arbre invalide.");
    const resultat = this.arbre.evaluer(this.options);
    return { resultat };
  }

  /** Représentation LaTeX du résultat final (sans étapes intermédiaires). */
  calculerLatex() {
    const { resultat } = this.calculer();
    return { resultat, latex: resultat.toLatex(this.options) };
  }

  checkEqual(other) {
    try {
      const r1 = this.calculer().resultat;
      const r2 = other.calculer().resultat;
      return r1.equals(r2);
    } catch (e) {
      this.erreur = e.message;
      return false;
    }
  }

  result() {
    try {
      return this.calculer().resultat;
    } catch {
      return null;
    }
  }
}
