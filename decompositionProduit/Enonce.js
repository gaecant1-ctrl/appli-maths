/*
 * Enonce.js — fabrique d'exercices paramétrables et aléatoires
 *
 * Idée clé :
 *   - Une classe de base Enonce gère le RNG (option de seed),
 *     et expose buildExercise(zone, index) qui retourne l'instance de votre Exercice*.
 *   - Chaque sous-classe implémente genVariant(index) => données aléatoires
 *     et toQuestionData(variant, index) => questionData compatible avec ExerciceExpression.
 *
 * Dépendances optionnelles : MathJax, REGLES.strict, avecMethodesListe, avecMethodesDict, ExerciceExpression.
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
}

// Shallow merge helper (no Object.assign, ES5-friendly)
function merge(target) {
  for (var i = 1; i < arguments.length; i++) {
    var src = arguments[i];
    if (!src) continue;
    for (var k in src) if (Object.prototype.hasOwnProperty.call(src, k)) target[k] = src[k];
  }
  return target;
}

// Helpers tolérants si vos fonctions utilitaires ne sont pas chargées
const AML = (typeof window !== 'undefined' && typeof window.avecMethodesListe === 'function')
  ? window.avecMethodesListe
  : (x) => x;
const AMD = (typeof window !== 'undefined' && typeof window.avecMethodesDict === 'function')
  ? window.avecMethodesDict
  : (x) => x;
const REGLES_STRICT = (typeof window !== 'undefined' && window.REGLES && window.REGLES.strict)
  ? window.REGLES.strict
  : {};

// ------------------------------------------------------------
// Classe de base
// ------------------------------------------------------------
// ------------------------------------------------------------
// Classe de base — lettre auto (A,B,C,...) selon l'index
// ------------------------------------------------------------
// ------------------------------------------------------------
// Classe de base — gère l'attribut `lettre` pour tous les énoncés
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

    // Attribut accessible dans toutes les sous-classes
    this.lettre = null;
  }

  // ---- à surcharger ----
  genVariant(/* index */) { throw new Error('genVariant(index) non implémenté'); }
  toQuestionData(/* variant, index */) { throw new Error('toQuestionData(variant, index) non implémenté'); }

  // ---- helpers lettre (réutilisables par les sous-classes si besoin) ----
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
    const i = Math.max(1, parseInt(index || 1, 10)); // 1-based
    return this.letterPool[(i - 1) % L];
  }

  // Applique la règle: null → pas de lettre ; "" → lettre par index ; "A" → lettre fournie ; undefined → pas de lettre
  _resolveLetter(index, rawOption) {
    if (rawOption === null) return null;
    if (typeof rawOption === 'string') {
      const t = rawOption.trim();
      return (t === '') ? this._letterByIndex(index) : t;
    }
    // undefined ou autre → pas de lettre
    return null;
  }

  /** Construit et renvoie l'exercice (fixe this.lettre avant le template) */
  buildExercise(zone, index) {
    // 1) Détermine la lettre par défaut depuis sharedOptions (si présent)
    const sharedRaw = Object.prototype.hasOwnProperty.call(this.sharedOptions, 'affichageAvecLettre')
      ? this.sharedOptions.affichageAvecLettre
      : undefined;
    this.lettre = this._resolveLetter(index, sharedRaw);  // <-- dispo pour le template

    // 2) Données spécifiques
    const variant = this.genVariant(index);

    // 3) questionData de la sous-classe (peut utiliser this.lettre)
    const questionData = this.toQuestionData(variant, index) || {};

    // 4) Merge des options (sharedOptions -> spécifiques)
    const options = questionData.options = merge({}, this.sharedOptions, questionData.options || {});

    // 5) Si la question fournit SA PROPRE option, on la respecte (re-résolution + synchro)
    if (Object.prototype.hasOwnProperty.call(options, 'affichageAvecLettre')) {
      this.lettre = this._resolveLetter(index, options.affichageAvecLettre);
    }

    // 6) Injection finale dans options (pour ExerciceExpression)
    if (this.lettre) options.affichageAvecLettre = this.lettre;
    else delete options.affichageAvecLettre;

    // 7) Instanciation
    return new ExerciceExpression(zone, questionData);
  }
}


// ------------------------------------------------------------
// Exemple concret : Division Euclidienne a par d
// Paramètres : aRange, dRange, avoidMultiples, texte/question template
// ------------------------------------------------------------
// ------------------------------------------------------------
// Exemple concret : Division Euclidienne — patrons n=1..5 (version Python-like)
// ------------------------------------------------------------
// ------------------------------------------------------------
// Division Euclidienne — patrons n=1..5, ENONCÉ avec la LETTRE
// ------------------------------------------------------------
class EnonceFacteursPremiers extends Enonce {

genVariant() {

  const petits = [2,3,5];
  const moyens = [7,11,13];
  const grands = [17,19,23];

  const nbFacteurs = this.rng.int(2,4);

  let facteurs = [];

  const useGrand = this.rng.random() < 0.3;

  if (useGrand) {

    const g = this.rng.pick(grands);
    facteurs.push(g);

    for (let i = 1; i < nbFacteurs; i++) {
      facteurs.push(this.rng.pick(petits));
    }

  } else {

    const pool = [...petits, ...moyens];

    for (let i = 0; i < nbFacteurs; i++) {
      facteurs.push(this.rng.pick(pool));
    }

  }

  const n = facteurs.reduce((a,b)=>a*b,1);

  return { n, facteurs };
}

toQuestionData(variant) {

  const n = variant.n;

  return {
    question: "Donner la décomposition en produit de facteurs premiers",

    expressionInitiale: String(n),

options: {


  affichageInitial: {
    expressionInitiale: true
  },

  modeCorrection: {
    correction: {
      expression: variant.facteurs.join("*")
    }
  },

  policies: {
    egalite: {
      mode: "numerique"
    },

    format: {
      exigerAtome: false,       // autorise une opération
      exigerExpression: true,   // refuse "66"
      memesOperations: true,   // ordre libre
      memesAtomes: true        // ordre libre des facteurs
    }
  }
}
  };
}

}
// ------------------------------------------------------------
// Export global
// ------------------------------------------------------------
window.Enonce = Enonce;
window.EnonceFacteursPremiers= EnonceFacteursPremiers;


// ------------------------------------------------------------
// Router multi-types : compose plusieurs Enonce (ou factories) pour un même quiz
// - Choix pondéré par 'weight'
// - Contraintes par type: 'max' par quiz
// - Option 'sequence' pour imposer un ordre déterministe (par clés)
// - Évite par défaut deux types identiques consécutifs
// ------------------------------------------------------------
class EnonceRouter {
  /**
   * @param {Object} opts
   * @param {Array<{ key?:string, provider:any, weight?:number, max?:number }>} opts.entries
   *        provider: instance d'Enonce (avec buildExercise) OU fonction (zone,index)=>Exercice*
   * @param {string|number} [opts.seed]
   * @param {boolean} [opts.avoidConsecutiveSameType=true]
   * @param {string[]} [opts.sequence=null]  // tableau de keys pour imposer un ordre
   */
  constructor({ entries, seed, avoidConsecutiveSameType = true, sequence = null }) {
    if (!entries || !entries.length) throw new Error('EnonceRouter: entries requis');
    this.rng = new RNG(seed);
    this.avoidConsecutive = !!avoidConsecutiveSameType;
    this.sequence = Array.isArray(sequence) ? sequence.slice() : null;

    // Normalisation des entrées
    this.entries = entries.map((e, i) => ({
      key: e.key || `type${i+1}`,
      provider: e.provider,
      weight: ((e.weight != null ? e.weight : 1) > 0 ? (e.weight != null ? e.weight : 1) : 1),
      max: (e.max != null ? e.max : null)
    }));

    this.counts = Object.create(null); // par key
    this.lastKey = null;
  }

  getStats() {
    return { byKey: merge({}, this.counts), lastKey: this.lastKey };
  }

  _eligible() {
    return this.entries.filter(e => (e.max == null) || ((this.counts[e.key] || 0) < e.max));
  }

  _pickWeighted(cands, forbidKey = null) {
    let list = cands;
    if (forbidKey && this.avoidConsecutive && cands.length > 1) {
      list = cands.filter(e => e.key !== forbidKey);
      if (!list.length) list = cands; // si tous filtrés, on relâche
    }
    const totalW = list.reduce((s, e) => s + e.weight, 0);
    let r = this.rng.next() * totalW;
    for (const e of list) {
      if ((r -= e.weight) <= 0) return e;
    }
    return list[list.length - 1];
  }

  _resolveProvider(provider) {
    // instance Enonce (méthode buildExercise)
    if (provider && typeof provider.buildExercise === 'function') return provider.buildExercise.bind(provider);
    // fonction factory (zone,index)=>Exercice*
    if (typeof provider === 'function') return provider;
    throw new Error('EnonceRouter: provider invalide');
  }

  _pickEntryByKey(key) {
    return this.entries.find(e => e.key === key) || null;
  }

  pick(index) {
    // 1) Séquence imposée ?
    if (this.sequence && index - 1 < this.sequence.length) {
      const e = this._pickEntryByKey(this.sequence[index - 1]);
      if (!e) throw new Error(`EnonceRouter: key inconnue dans sequence: ${this.sequence[index - 1]}`);
      // Respecte 'max' si défini, sinon retombe sur pondération
      const used = (this.counts[e.key] || 0);
      if (e.max == null || used < e.max) return e;
    }

    // 2) Choix pondéré parmi éligibles
    const cands = this._eligible();
    if (!cands.length) throw new Error('EnonceRouter: plus aucun type éligible (tous max atteints)');
    return this._pickWeighted(cands, this.lastKey);
  }

  buildExercise(zone, index) {
    const entry = this.pick(index);
    const factory = this._resolveProvider(entry.provider);
    const ex = factory(zone, index);
    this.counts[entry.key] = (this.counts[entry.key] || 0) + 1;
    this.lastKey = entry.key;

    // Optionnel: exposer le type choisi sur le conteneur
    try { zone.dataset.enonceType = entry.key; } catch (_) {}

    return ex;
  }
}

// Export global
window.EnonceRouter = EnonceRouter;
