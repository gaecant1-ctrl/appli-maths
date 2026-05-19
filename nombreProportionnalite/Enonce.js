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

    // Configuration des règles de correction
constructor(opts = {}) {
    super(opts);

    // Structure de référence (Défauts)
    this.defaultOptions = {
        affichageReponse:"brut",

        modeCorrection: {
            nombreAff: "auto",
            affichage: "auto",
            affichageMixte: (typeof avecMethodesDict === 'function') 
                ? avecMethodesDict({ "Duree": ["h", "min", "s"] }) 
                : { "Duree": ["h", "min", "s"] },
            correction: { result: true, rendu: 'latex', etapes: false }
        },
        policies: {
            egalite: { mode: 'numerique', unite: 'convertible', epsilon: 1e-6 },
            format: {
                nombre: 'dec',
                uniteCible: ["h min s", "€"],
                formatDuree: 'mixte',
                exigerExpression: false,
                exigerAtome: true
            },
            suite:   { 
                continuerSiInvalide: true,
                continuerSiInegale: true,
                continuerSiMauvaiseNature: true,
                continuerSiFormatIncorrect: true} 
  
        }
    };

    // On fusionne avec d'éventuels réglages globaux passés à l'instanciation
    this.baseOptions = merge({}, this.defaultOptions, opts.options || {});
}
  

genVariant(index) {
const type = this.rng.int(1, 25);
//const type=9; 
    let sit = "", quest = "", expr = "";
    let variantGrandeur = null;
    let variantOptions = {}; // Contiendra uniquement les modifs du cas
    let affOpts={nombreAff : "dec"}

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
                      variantOptions = {
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {} // Pas d'unité pour une proportion
            };
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
    sit = `Pour $${m1.toLatex(affOpts)}$ d'un produit, on paye $${p1.toLatex({nombreAff :"dec"})}$.`;
    quest = `Combien paye-t-on pour $${m2.toLatex(affOpts)}$ de ce produit ?`;

    expr = variantGrandeur.toString(affOpts);
                      variantOptions = {
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {"€":1} // Pas d'unité pour une proportion
            };
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
                      variantOptions = {
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {"€":1} // Pas d'unité pour une proportion
            };
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
                     variantOptions = {
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {"€":1} // Pas d'unité pour une proportion
            };
    
    break;
}



case 5: { // Masse tige (Longueur -> Masse)
    // 1. Ratio pédagogique (b, c)
    const ratio = generateRatio(this.rng, 'strict');

    // 2. Longueurs cohérentes (en cm)
    // On utilise un scale de 5 pour avoir des multiples de 5 (5, 10, 15...)
    const scale = 5;

    const l1 = new Grandeur(
        Nombre.fromParts(ratio.b * scale, 1),
        { "cm": 1 }
    );

    const l2 = new Grandeur(
        Nombre.fromParts(ratio.c * scale, 1),
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
                  variantOptions = {
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {} // Pas d'unité pour une proportion
            };

    break;
}

case 6: { // Échelle (Plan -> Réel)

    // 1. Ratio pédagogique
    const ratio = generateRatio(this.rng);
    const base = this.rng.int(1, 5); 

    // 2. Distances plan
    const dPlan1 = new Grandeur(
        Nombre.fromParts(ratio.c*base, 1),
        { "cm": 1 }
    );


    const choix = this.rng.next()<0.5 ? {"mm": 1} : {"cm" : 1};
    const dPlan2 = new Grandeur(
        Nombre.fromParts(ratio.b*base, 1),
        choix
    );

    // 3. Coefficient d'échelle
    const coeffKmCm = this.rng.pick([2,3,4,5]);

    const coeffEchelle = new Grandeur(
        Nombre.fromParts(coeffKmCm, 1),
        { "km": 1, "cm": -1 }
    );

    // 4. Distances réelles
    const dReelle1 = dPlan1.mul(coeffEchelle);
    variantGrandeur = dPlan2.mul(coeffEchelle).nettoyer().convertirEn({"km":1});


    sit = `Une distance de $${dReelle1.toLatex(affOpts)}$ est représentée par $${dPlan1.toLatex(affOpts)}$ sur un plan.`;

    quest = `Quelle distance réelle est représentée par $${dPlan2.toLatex(affOpts)}$ ?`;
                  variantOptions = {
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {} // Pas d'unité pour une proportion
            };

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
                variantOptions = {
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {"€":1} // Pas d'unité pour une proportion
            };

    break;
}

case 8: { // Débit (Volume -> Temps)
    // 1. Setup du volume : un nombre entre 0,1 et 2,0 L
    // On génère l'entier (1 à 20) puis on divise par 10
    const volDixiemes = this.rng.pick([this.rng.int(1,9),this.rng.int(11,15)]);
    let v2 = new Grandeur(Nombre.fromParts(volDixiemes, 10), { "L": 1 });

    // 2. Coefficient : un nombre entier de minutes pour 1 Litre
    const minParLitre = this.rng.pick([2, 3, 4, 5, 6, 7, 10]); 
    const coeff = new Grandeur(Nombre.fromParts(minParLitre, 1), { "min": 1, "L": -1 });

    // 3. Calcul du Temps (en minutes)
    const tFinal = v2.mul(coeff); 

    // 4. Grandeur de référence pour l'énoncé (1 L)
    const unLitre = new Grandeur(Nombre.fromParts(1, 1), { "L": 1 });
    const tPourUnLitre = unLitre.mul(coeff);

    v2=v2.convertirEn({"cL":1});

    // 5. Textes utilisant les méthodes toLatex() des objets Grandeur
    sit = `Un robinet a un débit constant : il faut $${tPourUnLitre.toLatex()}$ pour remplir $${unLitre.toLatex()}$.`;
    quest = `Combien de temps faut-il pour qu'il s'écoule $${v2.toLatex(affOpts)}$ ?`;
    
    // 6. Expression de référence (en secondes) pour la correction
    // tFinal.convertirEn({ "s": 1 }) s'occupe de multiplier par 60
    expr = tFinal.convertirEn({ "s": 1 }).toString();
    
   
            variantOptions = {
                "modeCorrection.nombreAff": "mixte",
                "modeCorrection.affichage": "mixte",
                "policies.format.nombre": "mixte",
                "policies.format.uniteCible": {} // Pas d'unité pour une proportion
            };
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
    console.log(v2,coeffDebit,gTemps);


    // 6. Énoncé
    const optsFrac = { nombreAff: "fractionSimple" };
    const affOpts = { nombreAff: "dec" }; // Garantit l'affichage "10" au lieu de "10/1"
    
    sit = `Un tuyau fuit de $${debitVal.toLatex(optsFrac)}\\,\\text{L}$ en $1\\,\\text{min}$.`;
    quest = `Combien de temps faut-il pour que $${v2.toLatex(affOpts)}$ s'écoulent ?`;
    

    variantGrandeur = gTemps; 
            variantOptions = {
                "modeCorrection.affichage": "mixte",
                "policies.format.nombre": "mixte",
                "policies.format.uniteCible": {} // Pas d'unité pour une proportion
            };
    
    
    
    
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

        variantOptions = {
                "modeCorrection.nombreAff": "canoniqueMixte",
                "policies.format.nombre": "canoniqueMixte",
                "policies.format.uniteCible": {"L":1} // Pas d'unité pour une proportion
            };

    sit = `Un robinet a un débit constant de $${coeffDebit.toLatex()}$.`;
    quest = `Quel volume d'eau s'écoule-t-il en $${laDuree.toLatex()}$ ? `;

    
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
               variantOptions = {
                // On modifie le format de nombre partout d'un coup

                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {}  // Pas d'unité pour une proportion
            };
    
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
    
               variantOptions = {
                // On modifie le format de nombre partout d'un coup
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {"€":1} // Pas d'unité pour une proportion
            };
    // Réassignation explicite des énoncés
    sit = `On paye $${p1.toLatex({nombreAff :"dec" })}$ pour $${v1.toLatex({nombreAff :"fractionSimple"})}$ d'un produit.`;
    quest = `Combien paye-t-on pour $1\\text{ L}$ de ce produit ?`;
    
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
           variantOptions = {
                // On modifie le format de nombre partout d'un coup
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {"g":1} // Pas d'unité pour une proportion
            };
    break;
}

case 15: { // Agrandissement et Prix (Aire d'une pizza)
    // 1. On choisit un diamètre de base d1 (ex: 20, 24, 26, 30 cm)
    const d1Val = this.rng.pick([20, 24, 25, 30]);
    
    // 2. On choisit un coefficient d'agrandissement k (simple : 1.5, 2, 3)
    // Pour que le prix reste "réaliste" et le calcul faisable
    const k = this.rng.pick([2,3]); 
    const d2Val = d1Val * k;

    // 3. On choisit un prix de base p1 (entre 6 et 12€)
    // On s'assure que p1 * k^2 donne un résultat propre
    const p1Val = this.rng.int(6, 12);
    const p1 = new Grandeur(Nombre.fromParts(p1Val, 1), { "€": 1 });

    // 4. Calcul du prix final : p2 = p1 * k^2
    // Si k=2, le prix est multiplié par 4. Si k=1.5, par 2.25.
    const p2Val = p1Val * k*k;
    
    // Utilisation de Nombre.fromParts avec multiplication par 100 pour gérer les décimaux (€)
    variantGrandeur = new Grandeur(Nombre.fromParts(p2Val,1), { "€": 1 });

    // 5. Objets pour l'énoncé
    const d1 = new Grandeur(Nombre.fromParts(d1Val, 1), { "cm": 1 });
    const d2 = new Grandeur(Nombre.fromParts(d2Val, 1), { "cm": 1 });
    const affOpts = { nombreAff: "dec" };

    sit = `Une pizza de $${d1.toLatex(affOpts)}$ de diamètre coûte $${p1.toLatex(affOpts)}$.`;
    quest = `Combien devrait coûter une pizza de $${d2.toLatex(affOpts)}$ de diamètre ?`;

       variantOptions = {
                // On modifie le format de nombre partout d'un coup
                "modeCorrection.nombreAff": "dec",
                "policies.format.nombre": "dec",
                "policies.format.uniteCible": {"€":1} // Pas d'unité pour une proportion
            };
    break;
}

case 16: { 
    const tVal = 8;
    const a = this.rng.int(2, 5);
    const b = a*this.rng.int(2, 3,4);
    variantGrandeur = new Grandeur(Nombre.fromParts(tVal, 1), { "min": 1 });
    
       variantOptions = {
                // On modifie le format de nombre partout d'un coup
                "modeCorrection.nombreAff": "entier",
                "policies.format.nombre": "entier",
                "policies.format.uniteCible": {} // Pas d'unité pour une proportion
            };
    sit = `Dans l'eau bouillante, il faut $${variantGrandeur.toLatex()}$ pour cuire $${a}$ œufs.`;
    quest = `Combien de temps faut-il pour en cuire $${b}$ dans la même casserole ?`;

    break;
}

case 17: { // Proportionnalité inverse (Vaches et Foin)
    // 1. Paramètres : n vaches (v1Val) et j jours (j1Val)
    const n = this.rng.int(2, 10);


    // 2. On choisit un coefficient multiplicateur k pour les vaches (ex: k=2 pour "doubler")
    // On peut aussi prendre 0.5 (1/2) ou 3, etc.
    const k = this.rng.pick([2, 3, ]); 
    const j = this.rng.pick([12, 15, 18, 20, 24, 30]);


    // 3. Objets Grandeurs pour l'énoncé
    const v1 = new Grandeur(Nombre.fromParts(n, 1), {});
    const j1 = new Grandeur(Nombre.fromParts(k*j, 1), {});
    const v2 = new Grandeur(Nombre.fromParts(k*n, 1), {});
    variantGrandeur = new Grandeur(Nombre.fromParts(j, 1), {});

   variantOptions = {
                // On modifie le format de nombre partout d'un coup
                "modeCorrection.nombreAff": "entier",
                "policies.format.nombre": "entier",
                "policies.format.uniteCible": {} // Pas d'unité pour une proportion
            };
    // 5. Énoncé avec les méthodes toLatex() des objets
    affOpts = { nombreAff: "dec" }; 
    sit = `$${v1.toLatex(affOpts)}$ vaches épuisent une réserve de foin en $${j1.toLatex(affOpts)}$ jours.`;
    quest = `Pendant combien de jours $${v2.toLatex(affOpts)}$ vaches peuvent-elles se nourrir avec cette même réserve ? (pas d'unité)`;

    
    
    break;
}   


case 18: {
    // 1. On utilise generateRatio en mode 'strict' pour obtenir une fraction irréductible < 1
    // ratio.c sera notre 'a' (numérateur), ratio.b sera notre 'b' (dénominateur)
    const ratio = generateRatio(this.rng, 'strict');
    const a = ratio.c;
    const b = ratio.b;

    // 2. On choisit un multiplicateur au hasard pour faire varier la taille du groupe
    const k = this.rng.pick([2, 3, 4, 5, 6]);

    const tot = b * k;
    const g = a * k;
    const f = tot - g;

    // 3. Choix équiprobable du groupe cible (Garçons ou Filles)
    const cible = this.rng.pick(['garçons', 'filles']);
    const numCible = (cible === 'garçons') ? g : f;

    // L'autre groupe
    const autreCible = (cible === 'garçons') ? 'filles' : 'garçons';
    const numAutre = (cible === 'garçons') ? f : g;

    // 4. Tirage au sort du sous-cas (1, 2 ou 3)
    const sousCas = this.rng.pick([1, 2, 3]);

    switch (sousCas) {
        case 1:
            sit = `Dans un groupe, il y a $${g}$ garçons et $${f}$ filles.`;
            quest = `Quelle est la proportion de ${cible} dans le groupe ?`;
            break;

        case 2:
            sit = `Dans un groupe de $${tot}$ élèves, $${numCible}$ sont des ${cible} et les autres sont des ${autreCible}.`;
            quest = `Quelle est la proportion de ${cible} dans le groupe ?`;
            break;

        case 3:
            sit = `Dans un groupe de $${tot}$ élèves, $${numAutre}$ sont des ${autreCible} et les autres sont des ${cible}.`;
            quest = `Quelle est la proportion de ${cible} dans le groupe ?`;
            break;
    }

    // La grandeur attendue (la fraction de départ non simplifiée pour ton moteur)
    variantGrandeur = new Grandeur(Nombre.fromParts(numCible, tot), {});

    variantOptions = {
        "modeCorrection.nombreAff": "fractionSimple",
        "policies.format.nombre": "fractionSimple",
        "policies.format.uniteCible": {} 
    };

    break;
}


case 19: {
    // 1. Génération de la base mathématique (identique)
    const pct = this.rng.pick([10, 20, 25, 30, 40, 50, 60, 75]);
    const base = Nombre.fromParts(pct, 100).simplify();
    const { a, b } = base.valeurNum; 

    const k = this.rng.pick([1, 2, 3, 4, 5]);
    const tot = b * k;
    const g = a * k;
    const f = tot - g;

    // 2. Choix équiprobable du groupe cible pour la question (Garçons ou Filles)
    // cible = "garçons" ou "filles"
    // valCible = nombre d'élèves du groupe cible
    // pctCible = le pourcentage correspondant à ce groupe
    const cible = this.rng.pick(['garçons', 'filles']);
    const valCible = (cible === 'garçons') ? g : f;
    const pctCible = (cible === 'garçons') ? pct : (100 - pct);

    // L'autre groupe (pour les scénarios où on donne l'un et demande l'autre)
    const autreCible = (cible === 'garçons') ? 'filles' : 'garçons';
    const valAutre = (cible === 'garçons') ? f : g;

    // 3. Tirage au sort du sous-cas (1, 2 ou 3)
    const sousCas = this.rng.pick([1, 2, 3]);

    switch (sousCas) {
        case 1:
            // Scénario : On donne f et g, on demande le pourcentage de la cible
            sit = `Dans un groupe, il y a ${g} garçons et ${f} filles.`;
            quest = `Quel est le pourcentage de ${cible} dans le groupe ?`;
            
            // La grandeur attendue est le pourcentage de la cible
            variantGrandeur = Nombre.fromParts(pctCible, 100); 
            break;

        case 2:
            // Scénario : On donne total et (f ou g), on demande le pourcentage de ce même groupe
            sit = `Dans un groupe de ${tot} élèves, ${valCible} sont des ${cible} et les autres sont des ${autreCible}.`;
            quest = `Quel est le pourcentage de ${cible} dans le groupe ?`;
            
            variantGrandeur = Nombre.fromParts(pctCible, 100);
            break;

        case 3:
            // Scénario : On donne total et (f ou g), on demande le pourcentage de L'AUTRE groupe
            // Exemple : On donne le total et les filles, on demande le pourcentage de garçons
            sit = `Dans un groupe de ${tot} élèves, ${valAutre} sont des ${autreCible} et les autres sont des ${cible}.`;
            quest = `Quel est le pourcentage de ${cible} dans le groupe ?`;
            
            variantGrandeur = Nombre.fromParts(pctCible, 100);
            break;
    }

    // Configuration des options d'affichage (commune aux 3 sous-cas)
    variantOptions = {
        "modeCorrection.nombreAff": "pourcentage",
        "policies.format.nombre": "pourcentage",
        "policies.format.uniteCible": {}
    };

    break;
}


case 20: {
    // 1. On choisit un pourcentage simple (identique au cas 19)
    const pctBase = this.rng.pick([10, 20, 25, 30, 40, 50, 60, 75]);

    // 2. Conversion en fraction irréductible a/b
    const base = Nombre.fromParts(pctBase, 100).simplify();
    const { a, b } = base.valeurNum; 

    // 3. On choisit un multiplicateur pour générer le groupe entier
    const k = this.rng.pick([2, 3, 4, 5, 6]);
    const tot = b * k;
    const g = a * k;   // Effectif correspondant à pctBase (Garçons)
    const f = tot - g; // Effectif complémentaire (Filles)

    // 4. Choix équiprobable du groupe associé au pourcentage donné dans l'énoncé
    const groupePct = this.rng.pick(['garçons', 'filles']);
    const pctDonne = (groupePct === 'garçons') ? pctBase : (100 - pctBase);

    // 5. Choix équiprobable du groupe ciblé par la question (Calcule-t-on le même ou l'autre ?)
    const cibleQuestion = this.rng.pick(['garçons', 'filles']);
    const reponseAttendue = (cibleQuestion === 'garçons') ? g : f;

    // 6. Les deux sous-cas (1 : Direct, 2 : Complémentaire / Indirect)
    const sousCas = this.rng.pick([1, 2]);

    switch (sousCas) {
        case 1:
            sit = `Dans un groupe de ${tot} personnes, il y a ${pctDonne}% de ${groupePct}.`;
            quest = `Quel est le nombre de ${cibleQuestion} dans ce groupe ?`;
            break;

        case 2:
            sit = `Dans un groupe de ${tot} personnes, il y a ${pctDonne}% de ${groupePct}.`;
            quest = `Quel est le nombre de ${cibleQuestion} dans ce groupe ?`;
            break;
    }

    // CORRECTION : On utilise la vraie méthode de ton moteur (fraction sur 1 pour un entier)
    variantGrandeur = Nombre.fromParts(reponseAttendue, 1);

    variantOptions = {
        "modeCorrection.nombreAff": "standard",
        "policies.format.nombre": "standard",
        "policies.format.uniteCible": {}
    };

    break;
}

case 21: {
    // 1. Pourcentage et fraction simplifiée a/b (identique cas 19 et 20)
    const pctBase = this.rng.pick([10, 20, 25, 30, 40, 50, 60, 75]);
    const base = Nombre.fromParts(pctBase, 100).simplify();
    const { a, b } = base.valeurNum; 

    // 2. Génération des effectifs réels (toujours des entiers)
    const k = this.rng.pick([2, 3, 4, 5, 6]);
    const tot = b * k; // Effectif total

// 3. Identification des groupes A et B
const nomA = this.rng.pick(['garçons', 'filles']);
const pctA = pctBase;
const valA = a * k; // Toujours lié à pctA (a/b)

const nomB = (nomA === 'garçons') ? 'filles' : 'garçons';
const pctB = 100 - pctBase;
const valB = tot - valA; // Le reste du groupe

    // 4. Tirage au sort parmi les 4 sous-cas (équiprobabilité 1/4)
    const sousCas = this.rng.pick([1, 2, 3, 4]);

    switch (sousCas) {
        case 1:
            // Donne : % de A et Nombre de A | Demande : Le TOTAL
            // Exemple : "Il y a 25% de garçons, ce qui fait 6 garçons. Quel est le total ?"
            sit = `Dans un groupe, il y a ${pctA}% de ${nomA}, ce qui correspond à ${valA} ${nomA}.`;
            quest = `Quel est le nombre total de personnes dans ce groupe ?`;
            variantGrandeur = Nombre.fromParts(tot, 1);
            break;

        case 2:
            // Donne : % de A et Nombre de B | Demande : Le TOTAL
            // Exemple : "Il y a 25% de garçons. On compte 18 filles. Quel est le total ?"
            sit = `Dans un groupe, il y a ${pctA}% de ${nomA}. On y compte également ${valB} ${nomB}.`;
            quest = `Quel est le nombre total de personnes dans ce groupe ?`;
            variantGrandeur = Nombre.fromParts(tot, 1);
            break;

        case 3:
            // Donne : % de A et Nombre de A | Demande : Nombre de B
            // Exemple : "Il y a 25% de garçons, ce qui fait 6 garçons. Quel est le nombre de filles ?"
            sit = `Dans un groupe, il y a ${pctA}% de ${nomA}, ce qui correspond à ${valA} ${nomA}.`;
            quest = `Quel est le nombre de ${nomB} dans ce groupe ?`;
            variantGrandeur = Nombre.fromParts(valB, 1);
            break;

        case 4:
            // Donne : % de A et Nombre de B | Demande : Nombre de A
            // Exemple : "Il y a 25% de garçons. On compte 18 filles. Quel est le nombre de garçons ?"
            sit = `Dans un groupe, il y a ${pctA}% de ${nomA}. On y compte également ${valB} ${nomB}.`;
            quest = `Quel est le nombre de ${nomA} dans ce groupe ?`;
            variantGrandeur = Nombre.fromParts(valA, 1);
            break;
    }

    // Configuration des options d'affichage standard (nombres entiers)
    variantOptions = {
        "modeCorrection.nombreAff": "standard",
        "policies.format.nombre": "standard",
        "policies.format.uniteCible": {}
    };
    break;
}

case 22: {
    // 1. Ratio irréductible via generateRatio (mode mixte ou strict)
    const ratio = generateRatio(this.rng, 'random', 0.4);
    const a = ratio.c;
    const b = ratio.b;

    // 2. Nombre de personnes
    const k = this.rng.pick([2, 4, 5]); 
    const persOrigine = b * k;
    let persCible = a * k;

    // Sécurité pédagogique : on évite que persOrigine === persCible
    if (persOrigine === persCible) {
        persCible = (a + 1) * k;
    }

    // 3. Ingrédient de base
    const ingrBase = this.rng.pick([30, 40, 50, 60, 100, 150]);
    const qteOrigine = ingrBase * b;
    const qteAttendue = ingrBase * (persCible / k); // Toujours un entier

    const ingr = this.rng.pick(['de sucre', 'de farine', 'de chocolat', 'de beurre']);

    sit = `Une recette de gâteau pour $${persOrigine}$ personnes nécessite $${qteOrigine}\\,\\text{g}$ ${ingr}.`;
    quest = `Quelle quantité ${ingr} faut-il pour préparer ce gâteau pour $${persCible}$ personnes ?`;

    // CORRECTION : On instancie une vraie Grandeur de masse en grammes
    variantGrandeur = new Grandeur(Nombre.fromParts(qteAttendue, 1), { "g": 1 });

    variantOptions = {
        "modeCorrection.nombreAff": "entier",
        "policies.format.nombre": "entier",
        "policies.format.uniteCible": { "g": 1 } // L'unité cible attendue est bien le gramme
    };
    break;
}


case 23: {
    // 1. Génération des âges de départ
    // Un enfant entre 3 et 10 ans, un parent ayant entre 25 et 35 ans de plus
    const ageEnfant1 = this.rng.int(3, 10);
    const ecart = this.rng.int(25, 35);
    const ageParent1 = ageEnfant1 + ecart;

    // 2. On choisit le futur (ex: l'enfant grandit de 5, 10 ou son âge double)
    const anneesPlus = this.rng.pick([5, 10, ageEnfant1]); 
    const ageEnfant2 = ageEnfant1 + anneesPlus;

    // La réponse attendue (relation additive : le parent vieillit du même nombre d'années)
    const ageParent2 = ageParent1 + anneesPlus;

    sit = `Quand un enfant a $${ageEnfant1}$ ans, son père a $${ageParent1}$ ans.`;
    quest = `Quel sera l'âge du père quand l'enfant aura $${ageEnfant2}$ ans ? (pas d'unité)`;

    variantGrandeur = Nombre.fromParts(ageParent2, 1);

    variantOptions = {
        "modeCorrection.nombreAff": "entier",
        "policies.format.nombre": "entier",
        "policies.format.uniteCible": {}
    };
    break;
}

case 24: {
    // 1. Pour contrôler la taille initiale (max 6), on filtre les dénominateurs
    // On ne garde que 2, 3, 4, 5 (ce qui permettra avec k d'avoir des totaux bas)
    const ratioLimiteur = generateRatio(this.rng, 'random', 0.4);
    let bBase = ratioLimiteur.b;
    let aLim = ratioLimiteur.c;

    // Sécurité si generateRatio sort un dénominateur trop grand (ex: 7, 8, 9, 10)
    if (bBase > 5) {
        bBase = this.rng.pick([2, 3, 4]);
        aLim = this.rng.int(1, bBase - 1); // Garantit une fraction < 1
    }

    // 2. On choisit un multiplicateur 'k' adapté pour que persOrigine (bBase * k) soit <= 6
    // Si bBase vaut 2 -> k peut être 2 ou 3 (persOrigine = 4 ou 6)
    // Si bBase vaut 3 -> k peut être 2 (persOrigine = 6)
    // Si bBase vaut 4 ou 5 -> k doit être 1 (persOrigine = 4 ou 5)
    let k = 1;
    if (bBase === 2) k = this.rng.pick([2, 3]);
    else if (bBase === 3) k = 2;
    else k = 1;

    const persOrigine = bBase * k; // Garantit 4, 5 ou 6 personnes maximum !
    
// 3. Calcul de la réponse (Nombre max de personnes possible)
    // On reste sur des facteurs d'agrandissement raisonnables (ex: double ou triple)
    const facteurAgrandissement = this.rng.pick([2, 3]); 
    const persMaxPossible = persOrigine * facteurAgrandissement; 

    // 4. Ingrédient 1 (Le limiteur - tombe pile sur persMaxPossible)
    const coefIngr1 = this.rng.pick([10, 20, 30, 50]); // Coefficients plus bas pour éviter les milliers de grammes
    const qteOrigine1 = coefIngr1 * persOrigine;
    const reserve1 = coefIngr1 * persMaxPossible;

    // 5. Ingrédient 2 (Celui en surplus)
    const coefIngr2 = this.rng.pick([15, 25, 40]); 
    const qteOrigine2 = coefIngr2 * persOrigine;
    
    // CORRECTION : On ajoute juste quelques personnes de plus au max possible, 
    // sans multiplier par persOrigine
    const surplusPersonnes = this.rng.pick([1, 2, 3]); 
    const reserve2 = coefIngr2 * (persMaxPossible + surplusPersonnes);

    // 6. Attribution aléatoire des noms d'ingrédients
    const listeIngr = this.rng.shuffle([
        { nom: 'de sucre', qteOrig: qteOrigine1, res: reserve1 },
        { nom: 'de farine', qteOrig: qteOrigine2, res: reserve2 }
    ]);
    
    // 7. Énoncé
    sit = `Une recette de gâteau pour $${persOrigine}$ personnes nécessite $${listeIngr[0].qteOrig}\\,\\text{g}$ ${listeIngr[0].nom} et $${listeIngr[1].qteOrig}\\,\\text{g}$ ${listeIngr[1].nom}.<br>` +
          `Dans vos placards, vous disposez de $${listeIngr[0].res}\\,\\text{g}$ ${listeIngr[0].nom} et de $${listeIngr[1].res}\\,\\text{g}$ ${listeIngr[1].nom}.`;
          
    quest = `Pour combien de personnes au maximum pouvez-vous préparer ce gâteau en respectant les proportions ?`;

    // La grandeur attendue est un nombre entier de personnes
    variantGrandeur = Nombre.fromParts(persMaxPossible, 1);

    variantOptions = {
        "modeCorrection.nombreAff": "entier",
        "policies.format.nombre": "entier",
        "policies.format.uniteCible": {}
    };
    break;
}

case 25: {
    // 1. En coulisse (caché) : part fixe (prise en charge) et prix au kilomètre
    const priseEnCharge = this.rng.pick([2, 3, 4, 5]);
    const prixKm = this.rng.pick([1, 2, 3]);

    // 2. Aléatorisation des distances entières
    const d1Val = this.rng.int(3, 7);
    let d2Val = this.rng.int(2, 5);
    
    if (d1Val === d2Val) {
        d2Val = d1Val - 1;
    }
    const d3Val = d1Val + d2Val; 

    // 3. Conversion des distances en objets Grandeur
    const d1 = new Grandeur(Nombre.fromParts(d1Val, 1), { "km": 1 });
    const d2 = new Grandeur(Nombre.fromParts(d2Val, 1), { "km": 1 });
    const d3 = new Grandeur(Nombre.fromParts(d3Val, 1), { "km": 1 });

    // 4. Calcul des prix réels correspondants et conversion en objets Grandeur
    const p1Val = priseEnCharge + (d1Val * prixKm);
    const p2Val = priseEnCharge + (d2Val * prixKm);
    const p3Val = priseEnCharge + (d3Val * prixKm); // La réponse attendue

    const p1 = new Grandeur(Nombre.fromParts(p1Val, 1), { "€": 1 });
    const p2 = new Grandeur(Nombre.fromParts(p2Val, 1), { "€": 1 });

    // 5. Énoncé 100% propre : ce sont les objets Grandeur qui gèrent le LaTeX et leurs unités
    sit = `Pour une course de taxi de $${d1.toLatex()}$, on paye $${p1.toLatex()}$. Pour une course de $${d2.toLatex()}$ avec le même taxi, on paye $${p2.toLatex()}$.`;
    quest = `Combien paiera-t-on pour une seule course de $${d3.toLatex()}$ ?`;

    // 6. La réponse finale transmise au moteur est la Grandeur du troisième prix
    variantGrandeur = new Grandeur(Nombre.fromParts(p3Val, 1), { "€": 1 });

    variantOptions = {
        "modeCorrection.nombreAff": "entier",
        "policies.format.nombre": "entier",
        "policies.format.uniteCible": { "€": 1 }
    };
    break;
}

}

// === Options d'affichage par défaut ===

    // Finalisation de expr si elle n'a pas été forcée manuellement (cas 9, 11)
    if (variantGrandeur && expr === "") {
        // On produit une chaîne décimale pour la réponse de référence
        expr = variantGrandeur.toString(variantOptions);
    }
    
    return { sit, quest, expr, grandeur: variantGrandeur, variantOptions };
}

toQuestionData(variant, index) {
    // 1. On part des options de base du constructeur
    let finalOptions = merge({}, this.baseOptions);

    // 2. On applique les réglages spécifiques du cas
    const vo = variant.variantOptions || {};
    for (let path in vo) {
        const keys = path.split('.');
        let current = finalOptions;
        for (let i = 0; i < keys.length - 1; i++) {
            current = current[keys[i]];
        }
        current[keys[keys.length - 1]] = vo[path];
    }

    // 3. Sécurité : Si l'uniteCible n'a pas été forcée par le cas, on prend celle de la grandeur
    if (!vo["policies.format.uniteCible"] && variant.grandeur) {
        finalOptions.policies.format.uniteCible = variant.grandeur.uniteDict;
    }

    return {
        question: `${variant.sit}<br>${variant.quest}`,
        expressionInitiale: variant.expr,
        options: finalOptions
    };
}
}

window.EnonceProportionnalite = EnonceProportionnalite;






