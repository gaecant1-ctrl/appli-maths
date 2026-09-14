/*
 * Enonce.js — classe abstraite de base pour fabriquer des exercices
 * paramétrables et aléatoires.
 *
 * Idée clé :
 *   - La classe Enonce gère le RNG (option de seed) et expose
 *     buildExercise(zone, index, onRejet) qui retourne une instance
 *     de ExerciceExpression.
 *   - Chaque sous-classe implémente :
 *       genVariant(index)              -> données aléatoires brutes
 *       toQuestionData(variant, index) -> questionData compatible avec ExerciceExpression
 *
 *     questionData attendu :
 *       {
 *         question: "<html à afficher>",
 *         expressionInitiale: "12+3×4" | null,
 *         options: {
 *           policies: { ... },            // voir Grader.js (POLICY_DEFAULT)
 *           affichageAvecLettre: null | "" | "A",
 *           affichageInitial: { expressionInitiale: true|false, ... },
 *           modeCorrection: { correction: { expression: "..." } } // optionnel
 *         }
 *       }
 *
 * Dépendances : ExerciceExpression (Exercice.js).
 */

// ------------------------------------------------------------
// RNG (seedable) — Mulberry32 + hash de chaîne simple
// ------------------------------------------------------------
function hashStringToInt(str) {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(a) {
  return function () {
    let t = (a += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

class RNG {
  constructor(seed) {
    if (seed === undefined || seed === null) {
      this.random = Math.random.bind(Math);
    } else {
      const s = typeof seed === 'string' ? hashStringToInt(seed) : (seed >>> 0);
      const gen = mulberry32(s);
      this.random = () => gen();
    }
  }
  next() { return this.random(); }
  int(min, maxInclusive) {
    const r = this.next();
    return Math.floor(r * (maxInclusive - min + 1)) + min;
  }
  pick(arr) { return arr[this.int(0, arr.length - 1)]; }

  shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
}

// Shallow merge helper
function merge(target) {
  for (let i = 1; i < arguments.length; i++) {
    const src = arguments[i];
    if (!src) continue;
    for (const k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
  }
  return target;
}

// ------------------------------------------------------------
// Classe abstraite Enonce
// ------------------------------------------------------------
class Enonce {
  /**
   * @param {Object} opts
   * @param {string|number} [opts.seed]
   * @param {Object} [opts.sharedOptions]   // ex: { affichageAvecLettre: null | "" | "A" }
   * @param {string|string[]} [opts.letterPool="ABCDEFGHIJKLMNOPQRSTUVWXYZ"]
   */
  constructor(opts = {}) {
    this.rng = new RNG(opts.seed);
    this.sharedOptions = opts.sharedOptions || {};
    this.letterPool = this._normalizeLetterPool(
      opts.letterPool || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    );

    this.lettre = null;
  }

  // ---- à surcharger dans les sous-classes ----
  genVariant(/* index */) { throw new Error('genVariant(index) non implémenté'); }
  toQuestionData(/* variant, index */) { throw new Error('toQuestionData(variant, index) non implémenté'); }

  // ---- helpers lettre (réutilisables par les sous-classes) ----
  _normalizeLetterPool(pool) {
    const arr = Array.isArray(pool) ? pool.slice()
      : (typeof pool === 'string' ? pool.split('') : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''));
    const out = [], seen = Object.create(null);
    for (const ch of arr) {
      const up = String(ch || '').trim().toUpperCase();
      if (up.length === 1 && up >= 'A' && up <= 'Z' && !seen[up]) { seen[up] = true; out.push(up); }
    }
    return out.length ? out : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  }

  _letterByIndex(index) {
    const L = this.letterPool.length;
    const i = Math.max(1, parseInt(index || 1, 10));
    return this.letterPool[(i - 1) % L];
  }

  // null -> pas de lettre ; "" -> lettre par index ; "A" -> lettre fournie ; undefined -> pas de lettre
  _resolveLetter(index, rawOption) {
    if (rawOption === null) return null;
    if (typeof rawOption === 'string') {
      const t = rawOption.trim();
      return (t === '') ? this._letterByIndex(index) : t;
    }
    return null;
  }

  /** Classe d'Exercice à instancier. Surchargeable par les sous-classes (ex: ExerciceGrandeur). */
  _getExerciceClass() {
    return ExerciceExpression;
  }

  /** Construit et renvoie l'instance d'Exercice (fixe this.lettre avant le template). */
  buildExercise(zone, index, onRejet = null) {
    const sharedRaw = Object.prototype.hasOwnProperty.call(this.sharedOptions, 'affichageAvecLettre')
      ? this.sharedOptions.affichageAvecLettre
      : undefined;

    this.lettre = this._resolveLetter(index, sharedRaw);

    const variant = this.genVariant(index);
    const questionData = this.toQuestionData(variant, index) || {};

    const options = questionData.options = merge({}, this.sharedOptions, questionData.options || {});

    if (Object.prototype.hasOwnProperty.call(options, 'affichageAvecLettre')) {
      this.lettre = this._resolveLetter(index, options.affichageAvecLettre);
    }

    if (this.lettre) options.affichageAvecLettre = this.lettre;
    else delete options.affichageAvecLettre;

    const ExerciceClass = this._getExerciceClass();
    return new ExerciceClass(zone, questionData, onRejet);
  }
}

window.Enonce = Enonce;
window.RNG = RNG;
