// ============================================================
// Grader.js — comparaison "réponse élève" vs "expression de référence"
// ============================================================
// Policies simplifiées : un seul objet plat avec des valeurs par
// défaut sensées, fusionné superficiellement avec ce que fournit
// l'exercice. Plus de profils multiples (strict/souple/...) à
// chaîner ; on part d'UN seul jeu de défauts et on surcharge au cas
// par cas.
// ============================================================

/**
 * Détecte si une chaîne respecte le format mixte d'une durée (ex: "1h+20min").
 * @param {string} expr
 * @param {boolean} strict
 * @param {string[]} unitesAutorisees - unités acceptées, dans l'ordre décroissant
 *        de grandeur attendu (défaut : toutes). Ex: ['h','min'] interdit 's'.
 * Renvoie { ok: true } si valide, sinon { ok: false, raison } avec raison parmi :
 *   'brique_invalide'    -> un morceau n'a pas la forme "<entier><unité autorisée>"
 *   'unite_non_autorisee' -> l'unité utilisée n'est pas dans unitesAutorisees (ex: 's' avec ['h','min'])
 *   'unite_dupliquee'    -> la même unité apparaît plusieurs fois (ex: "1h+15min+15min")
 *   'seuil_depasse'      -> une unité dépasse son seuil alors qu'une unité supérieure est présente
 *                           (ex: "1h+80min" au lieu de "2h+20min")
 *   'unite_seule_trop_grande' -> ex: "80min" sans 'h' (devrait être "1h+20min")
 */
function analyserEcritureMixteDuree(expr, strict = false, unitesAutorisees = ['h', 'min', 's']) {
  const s = expr.replace(/\s+/g, '+').replace(/\++/g, '+');
  const parties = s.split('+').filter(Boolean);

  if (parties.length === 0) return { ok: false, raison: 'brique_invalide' };

  const setAutorisees = new Set(unitesAutorisees);
  const aH = setAutorisees.has('h');
  const aMin = setAutorisees.has('min');
  const aS = setAutorisees.has('s');

  const unites = new Set();
  const valeurs = {};

  for (const p of parties) {
    const m = p.match(/^(\d+)(h|min|s)$/);
    if (!m) return { ok: false, raison: 'brique_invalide' };

    const val = parseInt(m[1], 10);
    const unit = m[2];

    if (!setAutorisees.has(unit)) return { ok: false, raison: 'unite_non_autorisee' };

    if (unites.has(unit)) return { ok: false, raison: 'unite_dupliquee' };
    unites.add(unit);
    valeurs[unit] = val;
  }

  // Si on a des minutes, elles doivent être < 60 (sauf s'il n'y a QUE des minutes,
  // ou si 'h' n'est pas une unité autorisée pour cet exercice)
  if (valeurs['min'] >= 60 && unites.has('h') && aH) return { ok: false, raison: 'seuil_depasse' };

  // Si on a des secondes, elles doivent être < 60 (sauf s'il n'y a QUE des secondes,
  // ou si 'min' n'est pas une unité autorisée pour cet exercice)
  if (valeurs['s'] >= 60 && (unites.has('min') || unites.has('h')) && aMin) return { ok: false, raison: 'seuil_depasse' };

  // Une unité dépassant son seuil, alors qu'une unité supérieure AUTORISÉE existe,
  // n'est pas "mixte" : ex. "80min" sans 'h' devrait être "1h+20min" (si 'h' est autorisé).
  if (valeurs['min'] >= 60 && !unites.has('h') && aH) return { ok: false, raison: 'unite_seule_trop_grande' };
  if (valeurs['s'] >= 60 && !unites.has('min') && aMin) return { ok: false, raison: 'unite_seule_trop_grande' };

  if (strict && unites.size < 2 && unites.has('h')) {
    return { ok: false, raison: 'unite_seule_trop_grande' };
  }

  return { ok: true };
}

/** Version booléenne, conservée pour compatibilité si appelée ailleurs. */
function estEcritureMixteDuree(expr, strict = false, unitesAutorisees = ['h', 'min', 's']) {
  return analyserEcritureMixteDuree(expr, strict, unitesAutorisees).ok;
}

/**
 * Configuration par défaut du Grader.
 * - egalite.mode : 'symbolique' (égalité stricte via .equals) ou 'numerique' (tolérance epsilon)
 * - format.nombre : forme attendue ('simple' = pas de contrainte, 'dec', 'fraction', 'mixte'...)
 * - format.exigerAtome : la réponse doit se réduire à un seul atome (pas une opération non réduite)
 * - format.formatDuree : 'mixte' pour exiger "1h+20min" plutôt que "80min".
 *   Quand actif sur une durée, il est PRIORITAIRE et EXCLUSIF : format.nombre
 *   est alors ignoré pour cet atome (les deux ne se cumulent jamais).
 * - format.formatDureeUnites : unités acceptées en mode mixte, ex ['h','min'] pour
 *   interdire 's' (défaut : ['h','min','s']).
 * - masquerNatureAttendue : si true, le message d'erreur 'wrong_nature' ne révèle pas
 *   la nature attendue (utile pour les exercices où deviner la nature est l'objectif,
 *   ex: ExerciceGrandeur). Défaut false : comportement habituel, informatif.
 * - suite.* : que faire après une erreur (autoriser une nouvelle tentative ou arrêter)
 */
const POLICY_DEFAULT = {
  memeType: true,
  egalite: { mode: 'symbolique', epsilon: 0 },
  format: {
    nombre: 'simple',
    exigerAtome: true,
    uniteCible: null,
    formatDuree: null,
    formatDureeUnites: ['h', 'min', 's']
  },
  masquerNatureAttendue: false,
  suite: {
    continuerSiInvalide: true,
    continuerSiInegale: false,
    continuerSiMauvaiseNature: true,
    continuerSiFormatIncorrect: true
  }
};

/** Fusion superficielle (un niveau) avec les défauts ci-dessus. */
function normalizePolicies(p) {
  const out = { ...POLICY_DEFAULT, ...(p || {}) };
  out.egalite = { ...POLICY_DEFAULT.egalite, ...(p?.egalite || {}) };
  out.format  = { ...POLICY_DEFAULT.format, ...(p?.format || {}) };
  out.suite   = { ...POLICY_DEFAULT.suite, ...(p?.suite || {}) };
  return out;
}

window.normalizePolicies = normalizePolicies;
window.POLICY_DEFAULT = POLICY_DEFAULT;

class MathGrader {
  constructor(policies) {
    this.policies = normalizePolicies(policies);
  }

  /**
   * Méthode principale d'évaluation
   * @param {ObjetString} initialObj - L'objet de référence (la consigne/solution)
   * @param {ObjetString} answerObj  - L'objet créé à partir de la réponse élève
   */
  evaluer(initialObj, answerObj) {
    const p = this.policies;

    // 1. TECHNIQUE : L'entrée est-elle valide ?
    if (!answerObj || !answerObj.isValid()) {
      return this._finaliserVerdict({ status: 'invalid_parse' });
    }

    let resRef, resAns;
    try {
      resRef = initialObj.calculer().resultat;
      resAns = answerObj.calculer().resultat;
    } catch (e) {
      return this._finaliserVerdict({ status: 'invalid_parse' });
    }

    // 2. NATURE : Masse, Volume, Durée...
    const natRef = resRef.getNature?.() || resRef.nature;
    const natAns = resAns.getNature?.() || resAns.nature;
    if (p.memeType && natRef !== natAns) {
      const meta = p.masquerNatureAttendue ? {} : { attendu: natRef };
      return this._finaliserVerdict({ status: 'wrong_nature', meta });
    }

    // 3. MATHS : Est-ce que la valeur est juste ?
    if (!this._comparerValeurs(resRef, resAns, p.egalite)) {
      return this._finaliserVerdict({ status: 'unequal' });
    }

    // 4. EXTRACTION : On récupère l'objet pour tester la forme
    const atomeEleve = this._extraireAtome(answerObj, p.format);

    // --- Format & unité cible ---
    if (atomeEleve) {
      const formatVerdict = this._verifierFormatAtome(atomeEleve, resRef, p.format, answerObj.expression);
      if (formatVerdict.status !== 'correct') {
        return this._finaliserVerdict(formatVerdict);
      }
    } else if (p.format.exigerAtome) {
      // Réponse mathématiquement juste mais non réduite à un atome (ex: opération laissée telle quelle)
      return this._finaliserVerdict({ status: 'ok', meta: { reason: 'not_an_atom' } });
    }

    // 5. VICTOIRE FINALE
    return this._finaliserVerdict({ status: 'correct' });
  }

  _finaliserVerdict(verdict) {
    const stableVerdict = {
      status: verdict.status || 'invalid_parse',
      meta: verdict.meta || {},
      message: verdict.message || null
    };
    stableVerdict.message = stableVerdict.message || this._genererMessage(stableVerdict);
    return stableVerdict;
  }

  _genererMessage(verdict) {
    const { status, meta } = verdict;

    if (status === 'correct') return "✅ Bravo !";
    if (status === 'invalid_parse') return "Entrée non reconnue.";
    if (status === 'unequal') return "Valeur incorrecte.";

    if (status === 'wrong_nature') {
      const attendu = meta.attendu || "une autre grandeur";
      return `Nature incorrecte (attendu : **${attendu}**).`;
    }

    if (status === 'ok') {
      if (meta.reason === 'not_an_atom') return "Ok, continue";
      if (meta.reason === 'wrong_unit') return `L'unité attendue est : **${meta.attendu || '?'}**.`;

      if (meta.reason === 'format_mismatch') {
        const messages = {
          'expected_duration_mixte': "Format HMS attendu.",
          'expected_fractionSimple': "Simplifie la fraction.",
          'expected_mixte': "Forme mixte attendue.",
          'expected_pourcentage': "Pourcentage attendu."
        };
        return messages[meta.detail] || "Simplifier la forme.";
      }
      return "À réduire";
    }

    return "Réponse incorrecte.";
  }

  /** Extrait l'atome final d'une réponse, ou null si ce n'est pas structurellement un atome. */
  _extraireAtome(answerObj, f = {}) {
    const arbre = answerObj.arbre;

    if (arbre.isAtome()) return arbre;

    if (arbre instanceof Somme) {
      // Cas durée mixte ("1h+20min") : on n'accepte la Somme comme "atome"
      // QUE si elle est structurellement une vraie écriture mixte valide
      // (chaque terme = une unité distincte, dans le bon ordre/seuils, et
      // restreinte à f.formatDureeUnites si défini).
      // "3h+15min+15min" (doublon) ou "3h+80min" (seuil dépassé) ne sont PAS des atomes.
      if (arbre.getNature?.() === 'Duree') {
        const tousAtomes = arbre.termes.every(t => typeof t.isAtome === "function" && t.isAtome());
        if (!tousAtomes) return null;

        const unitesAutorisees = f.formatDureeUnites || ['h', 'min', 's'];
        const analyse = analyserEcritureMixteDuree(answerObj.expression, false, unitesAutorisees);
        if (!analyse.ok) return null;

        return answerObj.calculer().resultat;
      }
      // Sinon, cas nombre mixte générique sur une même unité (ex: "3L+1/2L").
      return this._testerSiSommeEstNombreMixte(arbre, answerObj.expression);
    }

    return null;
  }

  _testerSiSommeEstNombreMixte(sommeObj, expressionBrute) {
    if (!sommeObj.termes || sommeObj.termes.length !== 2) return null;

    const [t1, t2] = sommeObj.termes;
    if (!t1.isAtome() || !t2.isAtome()) return null;

    const u1 = JSON.stringify(t1.grandeur.uniteDict);
    const u2 = JSON.stringify(t2.grandeur.uniteDict);
    if (u1 !== u2) return null;

    try {
      const unitStr = t1.unite || "";
      const sansUnite = expressionBrute.replace(new RegExp(unitStr, 'g'), '').trim();
      const testNombre = new Nombre(sansUnite);

      if (testNombre.isFormat('mixte')) {
        const grandeurTotale = t1.grandeur.add(t2.grandeur);
        const atomeFinal = Atome.from(grandeurTotale);
        atomeFinal.nombre = testNombre;
        atomeFinal.texte = expressionBrute;
        return atomeFinal;
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  /**
   * Vérifie la conformité pédagogique de l'atome (unité cible, format de nombre, mixte...).
   *
   * RÈGLE DE PRIORITÉ — formatDuree vs format.nombre :
   *   Si l'atome est une Duree ET que f.formatDuree === 'mixte', SEUL le format mixte
   *   est vérifié (return immédiat, correct ou ok/format_mismatch). format.nombre est
   *   alors totalement ignoré pour cet atome — les deux réglages ne se cumulent jamais.
   *   format.nombre ne reprend la main que pour les durées SANS formatDuree:'mixte'
   *   (ex: juger "3.5h" via format.nombre:'dec') ou pour toute grandeur non-Duree.
   */
  _verifierFormatAtome(atome, resRef, f, expressionBrute) {
    const meta = {};
    const estUneDuree = (atome instanceof Duree) || (atome.getNature?.() === "Duree");

    // 1. Unité cible (si définie)
    if (f.uniteCible && this._hasUniteCible(f.uniteCible)) {
      const ok = this._isUnitInCible(atome.grandeur.uniteDict, f.uniteCible);
      if (!ok) {
        meta.reason = 'wrong_unit';
        meta.attendu = Array.isArray(f.uniteCible) ? f.uniteCible.join(' ou ') : JSON.stringify(f.uniteCible);
        return { status: 'ok', meta };
      }
    }

    // 2. Durée en format mixte : ce format prime sur tout le reste.
    // (Si on arrive ici avec un atome de nature Duree et exigerAtome actif,
    // c'est que l'écriture était déjà structurellement valide — voir _extraireAtome.)
    if (estUneDuree && f.formatDuree === 'mixte') {
      const unitesAutorisees = f.formatDureeUnites || ['h', 'min', 's'];
      const analyse = analyserEcritureMixteDuree(expressionBrute, false, unitesAutorisees);
      if (!analyse.ok) {
        meta.reason = 'format_mismatch';
        meta.detail = 'expected_duration_mixte';
        return { status: 'ok', meta };
      }
      return { status: 'correct' };
    }

    // 3. Formats standards (fraction, décimal, mixte...)
    if (f.nombre && f.nombre !== 'simple') {
      const nombreEleve = atome.nombre;
      if (nombreEleve?.isFormat && !nombreEleve.isFormat(f.nombre)) {
        meta.reason = 'format_mismatch';
        meta.detail = `expected_${f.nombre}`;
      } else if (nombreEleve?.isEcritureSimple && !nombreEleve.isEcritureSimple()) {
        meta.reason = 'reduction_mismatch';
        meta.detail = '';
      }
    }

    return Object.keys(meta).length > 0 ? { status: 'ok', meta } : { status: 'correct' };
  }

  _hasUniteCible(cible) {
    if (Array.isArray(cible)) return cible.length > 0;
    if (typeof cible === 'object' && cible !== null) return Object.keys(cible).length > 0;
    return !!cible;
  }

  /** Comparaison mathématique stricte ou numérique (tolérance epsilon). */
  _comparerValeurs(resRef, resAns, pEgalite) {
    let isMathEqual = resRef.equals(resAns);

    if (!isMathEqual && pEgalite.mode === 'numerique') {
      const v1 = this._nombreToFloat(resRef.grandeur?.valeur || resRef.valeur);
      const v2 = this._nombreToFloat(resAns.grandeur?.valeur || resAns.valeur);

      if (!isNaN(v1) && !isNaN(v2)) {
        isMathEqual = Math.abs(v1 - v2) <= pEgalite.epsilon;
      }
    }
    return isMathEqual;
  }

  _nombreToFloat(n) {
    if (!n) return NaN;
    if (typeof n === 'number') return n;
    const { a, b } = n.valeurNum || { a: n.a, b: n.b };
    return a / (b || 1);
  }

  _isUnitInCible(ansDict, cible) {
    if (typeof cible === 'object' && !Array.isArray(cible)) {
      const kA = Object.keys(ansDict).sort(), kC = Object.keys(cible).sort();
      return kA.length === kC.length && kA.every(k => ansDict[k] === cible[k]);
    }
    if (Array.isArray(cible)) {
      const u = Object.keys(ansDict)[0];
      return cible.includes(u);
    }
    return true;
  }
}

window.MathGrader = MathGrader;
