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

  constructor(opts = {}) {
    super(opts);
    // Retry (sélecteur du panneau latéral) : true → une réponse fausse
    // laisse réessayer ; false (par défaut, comportement historique) →
    // validé dès la première réponse.
    this.continuerSiInegale = (typeof opts.continuerSiInegale === 'boolean') ? opts.continuerSiInegale : false;

    // Pondérations des 5 patrons (sélecteur "Type" Simple/Complexe) :
    // 1 = Simple (comportement historique) ; 2-5 = les 4 sous-types de
    // "Complexe" (voir _genererType1..4 ci-dessous).
    this.patternWeights = opts.patternWeights || [1, 1, 1, 1, 1];
  }

  // tirage pondéré 1..5 (même mécanique que EnonceDivisionEuclidienne)
  _pickPattern() {
    const w = this.patternWeights;
    const S = w.reduce((s, x) => s + Math.max(0, x || 0), 0) || 5;
    let r = this.rng.next() * S;
    for (let i = 0; i < 5; i++) {
      // "?? 1" (pas "|| 1") : un poids explicitement à 0 (patron désactivé
      // via le sélecteur Type) doit RESTER à 0, pas retomber sur 1 — sinon
      // "0 est falsy" en JS fait réapparaître ce patron malgré tout.
      r -= Math.max(0, (w[i] ?? 1));
      if (r <= 0) return i + 1;
    }
    return 5;
  }

  /** Décomposition en facteurs premiers par division successive — utilisée
   *  pour la CORRECTION, quel que soit le patron (l'énoncé peut afficher un
   *  produit/une somme dont les facteurs "affichés" ne sont pas eux-mêmes
   *  premiers ou pas la vraie décomposition : seule cette fonction fait foi). */
  _factoriser(n) {
    const facteurs = [];
    let reste = n;
    for (let p = 2; p * p <= reste; p++) {
      while (reste % p === 0) {
        facteurs.push(p);
        reste /= p;
      }
    }
    if (reste > 1) facteurs.push(reste);
    return facteurs;
  }

  _estPremier(n) {
    if (n < 2) return false;
    for (let i = 2; i * i <= n; i++) {
      if (n % i === 0) return false;
    }
    return true;
  }

  /** Nombre composé (non premier) tiré dans [min, max]. */
  _tirerNonPremier(min, max) {
    let n;
    do { n = this.rng.int(min, max); } while (this._estPremier(n) || n < 4);
    return n;
  }

  // ---------------- Patron 1 : Simple (comportement historique) ----------------
  _genererSimple() {
    const petits = [2, 3, 5];
    const moyens = [7, 11, 13];
    const grands = [17, 19, 23];

    const nbFacteurs = this.rng.int(2, 4);
    let facteurs = [];
    const useGrand = this.rng.random() < 0.3;

    if (useGrand) {
      facteurs.push(this.rng.pick(grands));
      for (let i = 1; i < nbFacteurs; i++) facteurs.push(this.rng.pick(petits));
    } else {
      const pool = [...petits, ...moyens];
      for (let i = 0; i < nbFacteurs; i++) facteurs.push(this.rng.pick(pool));
    }

    const n = facteurs.reduce((a, b) => a * b, 1);
    return { n, exprStr: String(n) };
  }

  // ---------------- Patron 2 (Complexe, type 1) ----------------
  // Produit de facteurs dont UN n'est pas premier (ex: 4×15×7).
  _genererType1() {
    const petits = [2, 3, 5, 7, 11];
    const nbFacteurs = this.rng.int(2, 3);
    let facteurs = [];
    for (let i = 0; i < nbFacteurs; i++) facteurs.push(this.rng.pick(petits));

    const idx = this.rng.int(0, facteurs.length - 1);
    facteurs[idx] = facteurs[idx] * this.rng.pick([2, 3]);

    const n = facteurs.reduce((a, b) => a * b, 1);
    return { n, exprStr: facteurs.join('*') };
  }

  // ---------------- Patron 3 (Complexe, type 2) ----------------
  // Produit de deux nombres non premiers entre 1 et 100.
  _genererType2() {
    const c1 = this._tirerNonPremier(4, 30);
    const c2 = this._tirerNonPremier(4, 30);
    const n = c1 * c2;
    return { n, exprStr: `${c1}*${c2}` };
  }

  // ---------------- Patron 4 (Complexe, type 3) ----------------
  // Somme de produits de facteurs premiers avec 1 ou 2 facteurs communs
  // (ex: 2×3×5 + 2×3×7).
  _genererType3() {
    const petits = [2, 3, 5, 7];
    const nbCommuns = this.rng.int(1, 2);

    let communs = [];
    while (communs.length < nbCommuns) {
      const p = this.rng.pick(petits);
      if (!communs.includes(p)) communs.push(p);
    }

    const autresPool = petits.filter(p => !communs.includes(p));
    const pool = autresPool.length ? autresPool : petits;
    const f1 = this.rng.pick(pool);
    let f2;
    do { f2 = this.rng.pick(pool); } while (f2 === f1);

    const terme1 = [...communs, f1];
    const terme2 = [...communs, f2];
    const p1 = terme1.reduce((a, b) => a * b, 1);
    const p2 = terme2.reduce((a, b) => a * b, 1);

    const n = p1 + p2;
    return { n, exprStr: `${terme1.join('*')}+${terme2.join('*')}` };
  }

  // ---------------- Patron 5 (Complexe, type 4) ----------------
  // Somme d'un produit de facteurs premiers et d'un des facteurs du produit
  // (ex: 2×3×5 + 3).
  _genererType4() {
    const petits = [2, 3, 5, 7, 11];
    const nbFacteurs = this.rng.int(2, 3);
    let facteurs = [];
    for (let i = 0; i < nbFacteurs; i++) facteurs.push(this.rng.pick(petits));

    const produit = facteurs.reduce((a, b) => a * b, 1);
    const facteurAjoute = this.rng.pick(facteurs);

    const n = produit + facteurAjoute;
    return { n, exprStr: `${facteurs.join('*')}+${facteurAjoute}` };
  }

genVariant() {
  const patron = this._pickPattern();
  let res;
  if (patron === 1) res = this._genererSimple();
  else if (patron === 2) res = this._genererType1();
  else if (patron === 3) res = this._genererType2();
  else if (patron === 4) res = this._genererType3();
  else res = this._genererType4();

  const facteurs = this._factoriser(res.n);
  return { n: res.n, exprStr: res.exprStr, facteurs };
}

toQuestionData(variant) {

  const n = variant.n;

  return {
    question: "Donner la décomposition en produit de facteurs premiers",

    expressionInitiale: String(variant.exprStr),

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
    },

    suite: {
      continuerSiInegale: this.continuerSiInegale
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
