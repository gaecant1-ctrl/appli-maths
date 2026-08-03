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
 const dico = {
  "": 0, "un": 1, "deux": 2, "trois": 3, "quatre": 4, "cinq": 5, "six": 6,
  "sept": 7, "huit": 8, "neuf": 9, "dix": 10, "onze": 11, "douze": 12,
  "treize": 13, "quatorze": 14, "quinze": 15, "seize": 16,
  "vingt": 20, "trente": 30, "quarante": 40, "cinquante": 50, "soixante": 60,
  "cent": 100, "mille": 1000, "million": 1000000
};

const dicoinv = {};
for (const [k, v] of Object.entries(dico)) {
  dicoinv[v] = k;
}

function getList(s) {
  const lisnb = s.split("-");
  const lis = [];
  for (let i of lisnb) {
    if (i !== "et") {
      if (i === "cents") {
        i = "cent";
      } else if (i === "vingts") {
        i = "vingt";
      }
      lis.push(dico[i]);
    }
  }
  return lis;
}

function getNombre(s) {
  let lis = getList(s);
  let av = lis.pop();
  let cle = [];
  let out = String(av);

  while (lis.length > 0) {
    let i = lis.pop();

    if (i < av) {
      cle.push(av);
      if (lis.length > 0) {
        let t = lis.pop();
        let c = cle.pop();
        if (t > c) {
          out = i + "*" + out;
          lis.push(t);
        } else {
          lis.push(t);
          cle.push(c);
          out = i + ")*" + out;
        }
      } else {
        cle.pop();
        out = i + "*" + out;
      }
    } else {
      while (cle.length > 0) {
        let c = cle.pop();
        if (i > c) {
          out = "(" + out;
        } else {
          cle.push(c);
          break;
        }
      }
      out = i + "+" + out;
    }
    av = i;
  }

  while (cle.length > 0) {
    cle.pop();
    out = "(" + out;
  }

  return out;
}

function getMot(n, c = "", d = "") {
  let s = "";
  if (n === 0) {
    return "";
  }
  if (n > 0 && n < 17) {
    s += dicoinv[n];
  } else if (n < 100) {
    let m = Math.floor(n / 10);
    if (m > 0 && m < 7) {
      if (n % 10 === 1) {
        s += dicoinv[m * 10] + "-et-un";
      } else {
        s += dicoinv[m * 10] + getMot(n % 10, "-", "");
      }
    } else if (m === 7) {
      s += "soixante" + getMot(n - 60, "-", "");
    } else if (m === 8 || m === 9) {
      if (n === 80 && d === "") {
        s += "quatre-vingts" + getMot(n - 80, "-", "");
      } else {
        s += "quatre-vingt" + getMot(n - 80, "-", "");
      }
    }
  } else if (n < 200) {
    s += "cent" + getMot(n - 100, "-");
  } else if (n < 1000) {
    let m = Math.floor(n / 100);
    if (n % 100 === 0 && d === "") {
      s += getMot(m, "", "-") + "cents";
    } else {
      s += getMot(m, "", "-") + "cent" + getMot(n % 100, "-", "");
    }
  } else if (n < 2000) {
    s += "mille" + getMot(n - 1000, "-");
  } else if (n < 1000000) {
    let m = Math.floor(n / 1000);
    s += getMot(m, "", "-") + "mille" + getMot(n % 1000, "-", "");
  } else if (n < 1000000000) {
    let m = Math.floor(n / 1000000);
    if (m === 1) {
      s += "un-million" + getMot(n % 1000000, "-", "");
    } else {
      s += getMot(m, "", "-") + "millions" + getMot(n % 1000000, "-", "");
    }
  }

  s = c + s + d;
  return s;
}


// ============================================================
// EnonceNombreMot — version JS de ton "questionNombreMot"
// ============================================================
// ============================================================
// EnonceNombreMot — version calquée sur EnonceDivisionEuclidienne
// ============================================================
class EnonceNombreMot extends Enonce {
  constructor(opts = {}) {
    super(opts);

    // ⚡ Texte de l'énoncé : reçoit (lettre, mot)
    this.textTemplate = opts.textTemplate
      || ((lettre, mot) => `On donne ${lettre} = "${mot}"`);

    this.modeCorrectionBase = opts.modeCorrectionBase || {
      nombreAff: 'decimal',
      modeMixte: null,
      affichageMixte: AML({}),
      autoReduce: false,
      precision: 5,
      arrondi: false,
      uniteBase: AMD({}),
      uniteOpe: AMD({}),
      regles: [],
    };

    this.policies = opts.policies || merge({}, REGLES_STRICT, {
      egalite: { mode: 'symbolique' },
      format: { 
        exigerAtome: false, 
        memesAtomes: true, 
        memesOperations: true 
      }
    });

    this.affichageInitial = opts.affichageInitial || { expressionInitiale: false };
  }

  genVariant(/* index */) {
    const n = this.rng.int(1, 1500);
    const mot = getMot(n);        // ex: "vingt-quatre"
    const expr = getNombre(mot);  // ex: "20+4"
    return { mot, expr };
  }

  toQuestionData(v, index) {
    return {
      // ⚡ ENONCÉ avec la lettre
      question: this.textTemplate(this.lettre, v.mot),

      // pas d’expression initiale (on ne montre que la correction)
      expressionInitiale: null,

      options: {
        affichageInitial: this.affichageInitial,
        modeCorrection: merge({}, this.modeCorrectionBase, {
          correction: {
            expression: v.expr,   // ex: "20+4"
            etapes: false,
            result: false,
            rendu: 'latex',
          }
        }),
        policies: this.policies,
      }
    };
  }
}

window.EnonceNombreMot = EnonceNombreMot;



// ------------------------------------------------------------
window.Enonce = Enonce;

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

