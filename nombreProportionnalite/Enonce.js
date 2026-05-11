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

  shuffle(arr) {
    const out = arr.slice();
    for (let i = out.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [out[i], out[j]] = [out[j], out[i]];
    }
    return out;
  }
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


/**
 * Génère un ratio {c, b} avec contrôle sur la partie entière
 * @param {RNG} rng 
 * @param {string} mode - 'strict' (0), 'mixte' (1 ou 2), ou 'random' (selon proba)
 * @param {number} probaZero - utilisé seulement si mode === 'random'
 */
function generateRatio(rng, mode = 'random', probaZero = 0.5) {
    const mapFractions = {
        2: [1],
        3: [1, 2],
        4: [1, 3],
        5: [1, 2, 3, 4],
        6: [1, 5],
        7: [1, 2, 3, 4, 5, 6],
        8: [1, 3, 5, 7],
        9: [1, 2, 4, 5, 7, 8],
        10: [1, 3, 7, 9]
    };

    const lesDenominateurs = Object.keys(mapFractions);
    const den = parseInt(rng.pick(lesDenominateurs));
    const numBase = rng.pick(mapFractions[den]);

    let entier;
    if (mode === 'strict') {
        entier = 0;
    } else if (mode === 'mixte') {
        entier = rng.int(1, 2);
    } else {
        // Mode 'random' (comportement original)
        entier = (rng.next() < probaZero) ? 0 : rng.int(1, 2);
    }

    return {
        c: numBase + (entier * den),
        b: den
    };
}


function generateDurationC(rng, mode="random",probaZero = 0.5) {
    // 1. On organise les numérateurs possibles par dénominateur
    const mapFractions = {
        2: [1],
        3: [1, 2],
        4: [1,3],
        5: [1, 2, 3, 4],
        6: [1, 5],
        10: [1, 3, 7, 9]
    };

    const lesDenominateurs = Object.keys(mapFractions);
    const den = parseInt(rng.pick(lesDenominateurs));
    const numBase = rng.pick(mapFractions[den]);

    let entier;
    if (mode === 'strict') {
        entier = 0;
    } else if (mode === 'mixte') {
        entier = rng.int(1, 2);
    } else {
        // Mode 'random' (comportement original)
        entier = (rng.next() < probaZero) ? 0 : rng.int(1, 2);
    }

    return {
        c: numBase + (entier * den),
        b: den
    };
}

function generatePower10(rng, options = {}) {

    const allowed = options.allowed || [1, 10, 100, 1000];

    return rng.pick(allowed);
}
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
// MODIFICATION : Ajoute "onRejet" dans les arguments
buildExercise(zone, index, onRejet = null) {

  // 1) Détermine la lettre par défaut...
  const sharedRaw = Object.prototype.hasOwnProperty.call(this.sharedOptions, 'affichageAvecLettre')
    ? this.sharedOptions.affichageAvecLettre
    : undefined;

  this.lettre = this._resolveLetter(index, sharedRaw);

  // 2) Données spécifiques
  const variant = this.genVariant(index);

  // 3) questionData...
  const questionData = this.toQuestionData(variant, index) || {};

  // 4) Merge des options...
  const options = questionData.options = merge({}, this.sharedOptions, questionData.options || {});

  // 5) Sync lettre...
  if (Object.prototype.hasOwnProperty.call(options, 'affichageAvecLettre')) {
    this.lettre = this._resolveLetter(index, options.affichageAvecLettre);
  }

  // 6) Injection finale...
  if (this.lettre) options.affichageAvecLettre = this.lettre;
  else delete options.affichageAvecLettre;

  // 7) Instanciation
  return new ExerciceExpression(zone, questionData, onRejet);
}

}




/*
 * EnonceProportionnalite.js
 * Intègre les 12 types de problèmes de proportionnalité du script original.
 */
class EnonceProportionnalite extends Enonce {
  constructor(opts = {}) {
    super(opts);

    // Configuration des règles de correction
    this.policies = opts.policies || merge({}, window.REGLES?.strict || {}, {
      egalite: { mode: 'numerique', unite: 'convertible', epsilon: 1e-6 },
      format: {
        nombre: 'decimal',
        uniteCible: ["h min s","€"], // L'objectif final
        exigerAtome: true,
        exigerExpression: false,
        memesAtomes: false,
        memesOperations: false,
        opsInclureUnaires: true,
        expressionSuffit: false
      },
      suite: {
        continuerSiInvalide: true,
        continuerSiInegale: true,
        continuerSiMauvaiseNature: true,
        continuerSiFormatIncorrect: true
      }
    });
  }

genVariant(index) {
  const type = this.rng.int(1, 17); 
  //const type=10;
    let sit = "", quest = "", expr = "";
    let unitRef = {}; 
    let variantGrandeur = null; 
    const affOpts = { nombreAff: "dec", precision: 2 };

    switch (type) {
case 1: { 
    // 1. Ratio avec forte probabilité de rester < 1 (entier = 0)
    // On passe 0.6 pour avoir 60% de cas "simples"
    const ratio = generateDurationC(this.rng, 0.6); 
    
    // 2. Distance de référence
    // u entre 5 et 15 pour des vitesses entre 30 et 150 km/h (si tRef = 1h)
    const u = this.rng.int(5, 15);
    const puissance = this.rng.pick([1, 10]); 
    const distRefVal = u * ratio.b * puissance;
    const dRef = new Grandeur(Nombre.fromParts(distRefVal, 1), { "km": 1 });

    // 3. Temps de référence fixé à 1h pour la clarté de la linéarité
    const tRef = new Duree(new Grandeur(Nombre.fromParts(1, 1), { "h": 1 }), { affichage: "standard" });

    // 4. Temps cible
    const fractionCible = Nombre.fromParts(ratio.c, ratio.b);
    const gTempsCible = tRef.grandeur.mul(new Grandeur(fractionCible, {}));
    const tCible = new Duree(gTempsCible, { affichage: "mixte" });

    // 5. Calcul du résultat
    variantGrandeur = dRef.mul(new Grandeur(fractionCible, {}));

    // 6. Énoncé avec LaTeX
    sit = `Un véhicule parcourt $${dRef.toLatex()}$ en $${tRef.toLatex()}$.`;
    quest = `Quelle distance parcourra-t-il en $${tCible.toLatex()}$ à la même vitesse ?`;
    
    expr = variantGrandeur.toString(affOpts);
    unitRef = { "km": 1 };
    break;
}

case 2: { // Masse / Prix - Pivot avec classe Nombre et Grandeur
    // 1. Prix de base pour une unité de masse
    const denom = this.rng.next() < 0.5 ? 1 : 10;
    const n = Nombre.fromParts(this.rng.int(1, 10), denom); 
    const prixBase = new Grandeur(n, {"€": 1}); 

    // 2. Unité de masse pivot (10g, 50g ou 100g)
    const baseMasse = new Grandeur(Nombre.fromParts(this.rng.pick([10, 50, 100]), 1), {"g": 1});
    
    // 3. Ratio b, c (on utilise des Grandeurs sans unité pour le calcul)
    const ratio = generateRatio(this.rng, "strict"); 
    
    // Pour multiplier une Grandeur par un ratio, le ratio doit avoir un dictionnaire d'unités vide {}
    const coeffB = new Grandeur(Nombre.fromParts(ratio.b, 1), {});
    const coeffC = new Grandeur(Nombre.fromParts(ratio.c, 1), {});

    // 4. Calculs des masses et prix via les méthodes mul() de ta classe
    const m1 = baseMasse.mul(coeffB);
    const m2 = baseMasse.mul(coeffC);

    const p1 = prixBase.mul(coeffB);
    const p2 = prixBase.mul(coeffC);
    
    variantGrandeur = p2;

    // 5. Énoncé
    sit = `Pour $${m1.toLatex(affOpts)}$ d'un produit, on paye $${p1.toLatex(affOpts)}$.`;
    quest = `Combien paye-t-on pour $${m2.toLatex(affOpts)}$ de ce produit ?`;

    expr = variantGrandeur.toString(affOpts);
    unitRef = { "€": 1 };
    break;
}

case 3: { // Articles / Prix (Bonbons)
    // 1. On récupère le ratio (b, c)
    const ratio = generateRatio(this.rng, 'strict', 0.5);

    // 2. Quantités d'articles (on utilise Nombre pour n1 et n2)
    const n1 = new Grandeur(Nombre.fromParts(ratio.b, 1), {});
    const n2 = new Grandeur(Nombre.fromParts(ratio.c, 1), {});

    // 3. Prix unitaire : Tirage du prix pour 1 article (ex: 0,20€ ou 1€)
    const denom =  100; // Entier ou centimes
    const nVal = this.rng.pick([10, 20, 25, 50, 60, 80]);
    const prixUnitaire = Nombre.fromParts(nVal, denom);
    const coeffPrix = new Grandeur(prixUnitaire, { "€": 1 });

    // 4. Calcul des prix totaux via les Grandeurs (qui utilisent Nombre.mul)
    const p1 = n1.mul(coeffPrix);
    variantGrandeur = n2.mul(coeffPrix);

    // 5. Choix de la formulation de 'sit' selon la valeur de n1
    // On utilise toNumber() pour tester la valeur
    const q1 = n1.valeur.valeurNum.a / n1.valeur.valeurNum.b;
    
    if (q1 === 1) {
        // Situation A : Unitaire
        sit = `Un bonbon identique coûte $${p1.toLatex(affOpts)}$.`;
    } else {
        // Situation B : Pluriel
        sit = `Pour $${n1.toLatex(affOpts)}$ bonbons identiques, on paye $${p1.toLatex(affOpts)}$.`;
    }

    // 6. Question
    quest = `Combien paye-t-on pour $${n2.toLatex(affOpts)}$ de ces bonbons ?`;

    // 7. Sortie
    expr = variantGrandeur.toString(affOpts);
    unitRef = { "€": 1 };
    break;
}

case 4: { // Ruban (Longueur -> Prix)
    // 1. Ratio pédagogique (b, c)
    const ratio = generateRatio(this.rng, 'random', 0.5);

    // 2. Longueurs (cm)
    const scale = 10; // Fixé à 10 selon ton code
    const l1 = new Grandeur(
        Nombre.fromParts(ratio.b * scale, 1),
        { "cm": 1 }
    );

    let l2;
    if (this.rng.next() < 0.5) {
        // Option A : Longueur aléatoire entre 1 et 10 cm
        l2 = new Grandeur(Nombre.fromParts(this.rng.int(1, 10), 1), { "cm": 1 });
    } else {
        // Option B : Longueur basée sur le ratio
        l2 = new Grandeur(Nombre.fromParts(ratio.c * scale, 1), { "cm": 1 });
    }

    // 3. Prix au cm (0.2, 0.3... -> n/10 €)
    // On transforme le prix décimal en fraction pour la classe Nombre
    const prixVals = [2, 3, 4, 5, 6, 8, 9];
    const nPrix = this.rng.pick(prixVals);
    
    const coeffPrix = new Grandeur(
        Nombre.fromParts(nPrix, 10), // n/10 donne 0.2, 0.3, etc.
        { "€": 1, "cm": -1 } 
    );

    // 4. Calcul des prix totaux
    const p1 = l1.mul(coeffPrix);
    variantGrandeur = l2.mul(coeffPrix);

    // 5. Formulation de la situation
    const v1 = l1.valeur.valeurNum.a / l1.valeur.valeurNum.b;
    
    if (v1 === 1) {
        sit = `Le prix d'un ruban de $1\\,\\text{cm}$ est de $${p1.toLatex(affOpts)}$.`;
    } else {
        sit = `Pour un ruban de $${l1.toLatex(affOpts)}$, on paye $${p1.toLatex(affOpts)}$.`;
    }

    // 6. Question
    quest = `Combien paye-t-on pour un ruban de $${l2.toLatex(affOpts)}$ ?`;

    // 7. Sortie
    expr = variantGrandeur.toString(affOpts);
    unitRef = { "€": 1 };
    
    break;
}



case 5: { // Masse tige (Longueur -> Masse)
    // 1. Ratio pédagogique (b, c)
    const ratio = generateRatio(this.rng, 'random', 0.5);

    // 2. Longueurs cohérentes (en cm)
    // On utilise un scale de 5 pour avoir des multiples de 5 (5, 10, 15...)
    const scale = 5;

    const l1 = new Grandeur(
        Nombre.fromParts(ratio.c * scale, 1),
        { "cm": 1 }
    );

    const l2 = new Grandeur(
        Nombre.fromParts(ratio.b * scale, 1),
        { "cm": 1 }
    );

    // 3. Masse linéique (en g/cm)
    const masseLineiqueVal = this.rng.pick([2, 4, 5, 6, 8, 10]);

    const coeffML = new Grandeur(
        Nombre.fromParts(masseLineiqueVal, 1),
        { "g": 1, "cm": -1 }
    );

    // 4. Calcul des masses (L * g/cm = g)
    const m1 = l1.mul(coeffML);
    variantGrandeur = l2.mul(coeffML);

    // 5. Énoncé
    // On garde l'aspect "tige homogène" pour justifier la proportionnalité
    sit = `Une tige cylindrique homogène de $${l1.toLatex(affOpts)}$ pèse $${m1.toLatex(affOpts)}$.`;

    quest = `On découpe un morceau de $${l2.toLatex(affOpts)}$ dans cette même tige. Quelle est sa masse ?`;

    // 6. Sortie
    expr = variantGrandeur.toString(affOpts);
    unitRef = { "g": 1 };

    break;
}

case 6: { // Échelle (Plan -> Réel)

    // 1. Ratio pédagogique
    const ratio = generateRatio(this.rng);

    // 2. Distances plan
    const dPlan1 = new Grandeur(
        Nombre.fromParts(ratio.c, 1),
        { "cm": 1 }
    );

    const dPlan2 = new Grandeur(
        Nombre.fromParts(ratio.b, 1),
        { "cm": 1 }
    );

    // 3. Coefficient d'échelle
    const coeffKmCm = this.rng.pick([2, 5, 10]);

    const coeffEchelle = new Grandeur(
        Nombre.fromParts(coeffKmCm, 1),
        { "km": 1, "cm": -1 }
    );

    // 4. Distances réelles
    const dReelle1 = dPlan1.mul(coeffEchelle);
    variantGrandeur = dPlan2.mul(coeffEchelle);

    sit = `Une distance de $${dReelle1.toLatex(affOpts)}$ est représentée par $${dPlan1.toLatex(affOpts)}$ sur un plan.`;

    quest = `Quelle distance réelle est représentée par $${dPlan2.toLatex(affOpts)}$ ?`;

    break;
}

case 7: { // Immobilier (Surface -> Prix)
    // 1. Ratio pédagogique (b, c)
    const ratio = generateRatio(this.rng, 'random', 0.5);

    // 2. Surfaces cohérentes (multiples de 10 m²)
    const scale = 10;

    const s1 = new Grandeur(
        Nombre.fromParts(ratio.c * scale, 1),
        { "m": 2 }
    );

    const s2 = new Grandeur(
        Nombre.fromParts(ratio.b * scale, 1),
        { "m": 2 }
    );

    // 3. Prix au m² (Coefficient de proportionnalité)
    // On choisit des prix ronds pour faciliter la division
    const prixM2Val = this.rng.pick([2000, 2500, 3000, 4000, 5000, 6000]);

    const pUnitaire = new Grandeur(
        Nombre.fromParts(prixM2Val, 1),
        { "€": 1, "m": -2 } // € / m²
    );

    // 4. Calcul des prix totaux (m² * €/m² = €)
    const p1 = s1.mul(pUnitaire);
    variantGrandeur = s2.mul(pUnitaire);

    // 5. Énoncé
    // On utilise toLatex(affOpts) pour que les milliers soient bien espacés (\,)
    sit = `Pour un appartement de $${s1.toLatex(affOpts)}$, on paye $${p1.toLatex(affOpts)}$.`;

    quest = `Combien paierait-on pour un appartement de $${s2.toLatex(affOpts)}$ dans le même quartier ?`;

    // 6. Sortie
    expr = variantGrandeur.toString(affOpts);
    unitRef = { "€": 1 };

    break;
}

case 8: { // Débit (Volume -> Temps)
    // 1. Setup du volume : un nombre entre 0,1 et 2,0 L
    // On génère l'entier (1 à 20) puis on divise par 10
    const volDixiemes = this.rng.int(1, 20);
    const v2 = new Grandeur(Nombre.fromParts(volDixiemes, 10), { "L": 1 });

    // 2. Coefficient : un nombre entier de minutes pour 1 Litre
    const minParLitre = this.rng.pick([2, 3, 4, 5, 6, 7, 10]); 
    const coeff = new Grandeur(Nombre.fromParts(minParLitre, 1), { "min": 1, "L": -1 });

    // 3. Calcul du Temps (en minutes)
    const tFinal = v2.mul(coeff); 

    // 4. Grandeur de référence pour l'énoncé (1 L)
    const unLitre = new Grandeur(Nombre.fromParts(1, 1), { "L": 1 });
    const tPourUnLitre = unLitre.mul(coeff);

    // 5. Textes utilisant les méthodes toLatex() des objets Grandeur
    sit = `Un robinet a un débit constant : il faut $${tPourUnLitre.toLatex()}$ pour remplir $${unLitre.toLatex()}$.`;
    quest = `Combien de temps faut-il pour remplir $${v2.toLatex(affOpts)}$ ?`;
    
    // 6. Expression de référence (en secondes) pour la correction
    // tFinal.convertirEn({ "s": 1 }) s'occupe de multiplier par 60
    expr = tFinal.convertirEn({ "s": 1 }).toString();
    
    unitRef = { "s": 1 };
    break;
}

case 9: { // Tuyau qui fuit (Version Durée Réelle)
    // 1. Débit : b/c Litres par minute
    const ratio = generateDurationC(this.rng, 'strict'); 
    const debitVal = Nombre.fromParts(ratio.b, ratio.c);
    const coeffDebit = new Grandeur(debitVal, { "L": 1, "min": -1 });

    // 2. Volume cible : Entier entre 5 et 15
    const v2Val = this.rng.int(5, 15);
    const v2 = new Grandeur(Nombre.fromParts(v2Val, 1), { "L": 1 });

    // 3. Calcul de la durée (Résultat en minutes)
    const gTemps = v2.div(coeffDebit); 


    // 6. Énoncé
    const optsFrac = { nombreAff: "fractionSimple" };
    const affOpts = { nombreAff: "dec" }; // Garantit l'affichage "10" au lieu de "10/1"
    
    sit = `Un tuyau fuit de $${debitVal.toLatex(optsFrac)}\\,\\text{L}$ en $1\\,\\text{min}$.`;
    quest = `Combien de temps faut-il pour que $${v2.toLatex(affOpts)}$ s'écoulent ?`;

    variantGrandeur = gTemps; 
    console.log(variantGrandeur);
    
    // On définit unitRef pour que le moteur de comparaison valide les saisies temporelles
    unitRef = { "h": 1, "min": 1, "s": 1 }; 
    
    break;
}

case 10: { // Débit Inverse (Temps -> Volume)
    // 1. Durée via ta méthode (secondes entières garanties)
    const ratioTemps = generateDurationC(this.rng, 'mixte'); 
    const gTemps = new Grandeur(Nombre.fromParts(ratioTemps.c, ratioTemps.b), { "min": 1 });
    const d = ratioTemps.b; // Le dénominateur (ex: 3, 4, 6, 12...)

    // 2. Liste de débits simples
    const debitsBase = [2, 3, 4, 5, 6, 8, 10, 12, 15];
    let litreParMin;

    // 3. ÉQUILIBRE : 50/50 entre entier et fraction
    if (this.rng.next() < 0.5) {
        // ON VEUT UNE FRACTION (pour l'atome étendu)
        // On élimine les débits qui simplifient totalement le dénominateur
        const eligibles = debitsBase.filter(n => (n * ratioTemps.c) % d !== 0);
        litreParMin = eligibles.length > 0 ? this.rng.pick(eligibles) : 7; // 7 est un bon joker
    } else {
        // ON VEUT UN ENTIER (cas simple)
        // On cherche un débit qui annule le dénominateur
        const eligibles = debitsBase.filter(n => (n * ratioTemps.c) % d === 0);
        litreParMin = eligibles.length > 0 ? this.rng.pick(eligibles) : d; 
    }

    const coeffDebit = new Grandeur(Nombre.fromParts(litreParMin, 1), { "L": 1, "min": -1 });

    // 4. Objet Duree pour l'énoncé
    const laDuree = new Duree(gTemps, { affichage: "mixte" });

    // 5. Volume final
    variantGrandeur = coeffDebit.mul(gTemps); 
    expr = variantGrandeur.toString(affOpts); 

    sit = `Un robinet a un débit constant de $${coeffDebit.toLatex()}$.`;
    quest = `Quel volume d'eau s'écoule-t-il en $${laDuree.toLatex()}$ ? `;

    unitRef = { "L": 1 };
    break;
}

case 11: { // Pelouse (Surface -> Temps Mixte)
    // 1. On récupère le ratio (ex: 3/2, 5/4, 7/6...)
    const ratio = generateDurationC(this.rng, 'random'); 
    
    // 2. Liste des bases propres
    const basesPropres = [200, 300, 400, 500, 600, 700, 800, 900, 1000, 1200];
    
    // 3. On filtre les bases pour n'en garder que celles divisibles par ratio.b
    // Cela garantit que s2 = (perfVal * ratio.c) / ratio.b sera un entier propre.
    const basesEligibles = basesPropres.filter(b => (b % ratio.b) === 0);
    
    // Si par malchance aucune base ne convient (rare ici), on prend la première par défaut
    const perfVal = basesEligibles.length > 0 
        ? this.rng.pick(basesEligibles) 
        : 600;

    const s1 = new Grandeur(Nombre.fromParts(perfVal, 1), {"m": 2});
    const coeffPerf = new Grandeur(Nombre.fromParts(perfVal, 1), {"m": 2, "h": -1});

    // 4. Calcul de s2 (Surface cible)
    // Puisque perfVal est divisible par ratio.b, s2Val sera un entier.
    const s2Val = (perfVal * ratio.c) / ratio.b;
    const s2 = new Grandeur(Nombre.fromParts(s2Val, 1), {"m": 2});

    // 5. Calcul de la durée (gTemps)
    const gTemps = s2.div(coeffPerf); 
    const laDuree = new Duree(gTemps, { 
        affichage: "mixte",
        affichageMixte: {"Duree": ["h", "min"]} 
    });

    // 6. Source à parser (Compacte : "1h+15min")
    expr = laDuree.toString({modeMixte: "affichage"}); 

    // 7. Rendu LaTeX (Énoncé propre)
    sit = `Pour tondre $${s1.toLatex(affOpts)}$ de pelouse, il faut $1\\text{ h}$.`;
    quest = `Combien de temps faut-il pour en tondre $${s2.toLatex(affOpts)}$ ?`;

    variantGrandeur = gTemps;
    unitRef = {"h": 1, "min": 1}; 
    
    break;
}



/* ... début du switch ... */

case 12: { 
    const f = this.rng.pick([{a:2, b:3}, {a:3, b:4}, {a:4, b:5}, {a:2, b:5}]);
    const prixBasePossibles = [120, 150, 180, 200, 240, 300, 360, 400, 420, 450, 480, 500, 600, 720, 750, 800, 900];
    const prixEligibles = prixBasePossibles.filter(p => (p % f.a === 0) && ((p / f.a) % 10 === 0));
    const p1Centimes = prixEligibles.length > 0 ? this.rng.pick(prixEligibles) : 600;

    const p1 = new Grandeur(Nombre.fromParts(p1Centimes, 100), {"€": 1});
    const v1 = new Grandeur(Nombre.fromParts(f.a, f.b), {"L": 1});
    const res = p1.div(v1); 

    variantGrandeur = new Grandeur(res.valeur, {"€": 1});
    
    // Réassignation explicite des énoncés
    sit = `On paye $${p1.toLatex()}$ pour $${v1.toLatex()}$ d'un produit.`;
    quest = `Combien paye-t-on pour $1\\text{ L}$ de ce produit ?`;
    unitRef = {"€": 1};
    break;
}

case 13: 
case 14: { 
    const rho = this.rng.int(2, 5);
    const a1Val = this.rng.int(2, 3);
    const a2Val = a1Val * 2;
    const m1 = new Grandeur(Nombre.fromParts(rho * Math.pow(a1Val, 3), 1), { "g": 1 });
    
    variantGrandeur = new Grandeur(Nombre.fromParts(rho * Math.pow(a2Val, 3), 1), { "g": 1 });
    
    sit = `Un cube homogène de $${a1Val}\\text{ cm}$ d'arête pèse $${m1.toLatex()}$.`;
    quest = `Combien pèse un cube de $${a2Val}\\text{ cm}$ d'arête fabriqué dans le même matériau ?`;
    unitRef = { "g": 1 };
    break;
}

case 15: { 
    const p1Val = this.rng.int(6, 10);
    const p1 = new Grandeur(Nombre.fromParts(p1Val, 1), { "€": 1 });
    variantGrandeur = new Grandeur(Nombre.fromParts(p1Val * 4, 1), { "€": 1 });
    
    sit = `Une pizza de $20\\text{ cm}$ de diamètre coûte $${p1.toLatex()}$.`;
    quest = `Au même tarif, combien devrait coûter une pizza de $40\\text{ cm}$ de diamètre ?`;
    unitRef = { "€": 1 };
    break;
}

case 16: { 
    const tVal = this.rng.pick([6, 9]);
    variantGrandeur = new Grandeur(Nombre.fromParts(tVal, 1), { "min": 1 });
    
    sit = `Dans l'eau bouillante, il faut $${variantGrandeur.toLatex()}$ pour cuire $3$ œufs.`;
    quest = `Combien de temps faut-il pour en cuire $10$ dans la même casserole ?`;
    unitRef = { "min": 1 };
    break;
}

case 17: { 
    // Cas statique : on force les valeurs via Nombre/Grandeur
    const v1Val = 10, j1Val = 30;
    const j2Val = 15; 

    variantGrandeur = new Grandeur(Nombre.fromParts(j2Val, 1), {}); // Nombre pur
    
    sit = `$${v1Val}$ vaches épuisent une réserve de foin en $${j1Val}$ jours.`;
    quest = `Pendant combien de jours, $20$ vaches épuiseront-elles cette même réserve ?`;
    unitRef = {}; 
    break;
}    }

// === Options d'affichage par défaut ===

    // Finalisation de expr si elle n'a pas été forcée manuellement (cas 9, 11)
    if (variantGrandeur && expr === "") {
        // On produit une chaîne décimale pour la réponse de référence
        expr = variantGrandeur.toString(affOpts);
    }
    
    return { sit, quest, expr, grandeur: variantGrandeur, unitRef };
}

toQuestionData(variant, index) {


  // 2. CONVERSION DU DICTIONNAIRE EN CHAÎNE
const dict = (variant.grandeur && variant.grandeur.uniteDict)
  ? variant.grandeur.uniteDict
  : (variant.unitRef || {});

  return {
    question: `${variant.sit}<br>${variant.quest}`,
    expressionInitiale : variant.expr,

    options: {
      affichageReponse :{ nombreAff : "brut"},
      modeCorrection: {
        nombreAff:"auto",
        affichage:"mixte",
        affichageMixte: avecMethodesDict({ "Duree": ["h", "min", "s"] }),
        correction: { 
          expression: variant.expr,
          // --- MODIFICATIONS ICI ---
          etapes: false,  // Désactive le calcul pas à pas
          result: true,   // Affiche la valeur finale de l'expression
          rendu: 'latex'  // Assure un affichage mathématique propre
          // --------------------------
        }
      },
      policies: merge({}, this.policies, {
        format: { 
          formatDuree: 'mixte',
          uniteCible: dict
        }
      })
    }
  };
}
}

window.EnonceProportionnalite = EnonceProportionnalite;




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

buildExercise(zone, index, onRejet = null) {

  // 1. Choix du type
  const entry = this.pick(index);

  // 2. Stats
  this.counts[entry.key] = (this.counts[entry.key] || 0) + 1;
  this.lastKey = entry.key;

  // 3. Provider
  const build = this._resolveProvider(entry.provider);

  // 4. Construction
  const exercice = build(zone, index, onRejet);

  // 5. Meta debug
  exercice.__meta = {
    type: entry.key,
    index,
    counts: this.getStats()
  };

  return exercice;
}
}

// Export global
window.EnonceRouter = EnonceRouter;

