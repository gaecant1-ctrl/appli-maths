function estEcritureMixteDuree(expr, strict = false) {
  // 1. Nettoyage et découpage (gère "1h 20" et "1h + 20")
  const s = expr.replace(/\s+/g, '+').replace(/\++/g, '+');
  const parties = s.split('+').filter(Boolean);

  if (parties.length === 0) return false;

  const unites = new Set();
  const valeurs = {};

  for (const p of parties) {
    const m = p.match(/^(\d+)(h|min|s)$/);
    if (!m) return false; // Format de brique invalide (ex: "12,5min")

    const val = parseInt(m[1], 10);
    const unit = m[2];

    if (unites.has(unit)) return false; // Doublon (ex: "1h 2h")
    unites.add(unit);
    valeurs[unit] = val;
  }

  // 2. LOGIQUE DE VALIDATION DES SEUILS (L'intelligence)
  
  // Si on a des minutes, elles doivent être < 60 (sauf s'il n'y a QUE des minutes)
  if (valeurs['min'] >= 60 && unites.has('h')) return false; 
  
  // Si on a des secondes, elles doivent être < 60 (sauf s'il n'y a QUE des secondes)
  if (valeurs['s'] >= 60 && (unites.has('min') || unites.has('h'))) return false;

  // 3. LOGIQUE DU MODE MIXTE
  
  // Si l'utilisateur a écrit 80min sans 'h', on refuse car ce n'est pas "mixte" 
  // (ça devrait être 1h 20min)
  if (valeurs['min'] >= 60 && !unites.has('h')) return false;
  if (valeurs['s'] >= 60 && !unites.has('min')) return false;

  // Si on est en mode "strict", on attend au moins 2 unités
  // SAUF si la valeur est trop petite pour être mixte (ex: "3min")
  if (strict && unites.size < 2) {
      // On n'accepte une unité seule que si elle est "maximale"
      // ex: 3min est ok (car < 1h), mais 1h tout seul est louche si on attend du mixte
      // On peut laisser passer les petits cas :
      const valSeule = valeurs[Array.from(unites)[0]];
      if (unites.has('h')) return false; // "2h" -> devrait être "2h 0min" en mode strict ? Souvent non.
  }

  return true;
}

// --- FONCTION HORS CLASSE (À GARDER ABSOLUMENT) ---
function normalizePolicies(p) {
  const base = { ...window.REGLES.strict };
  const out = { ...base, ... (p || {}) };
  out.egalite = { ...base.egalite, ... (p?.egalite || {}) };
  out.format  = { ...base.format, ... (p?.format || {}) };
  out.suite   = { ...base.suite, ... (p?.suite || {}) };
  return out;
}

// On la rend officiellement globale pour Exercice.js
window.normalizePolicies = normalizePolicies;


window.REGLES = {
  strict: {
    accepterInvalide: true,
    memeType: true,
    egalite: { mode: 'symbolique', unite: 'exacte', epsilon: 0 },
    format:  { nombre: 'simple', exigerAtome: true, uniteCible: null, autoConvertToTarget: false,
    exigerExpression: false,memesAtomes: false, memesOperations: false, opsInclureUnaires: false,expressionSuffit: false     // <<< NOUVEAU : si true et égalité vraie (+ formes demandées), statut = 'correct'
},
suite:   { continuerSiInvalide: true, continuerSiInegale: false, continuerSiMauvaiseNature: true,continuerSiFormatIncorrect: true}  },
  
  souple: {
    accepterInvalide: true,
    memeType: false,
    egalite: { mode: 'numerique', unite: 'convertible', epsilon: 1e-6 },
        format:  { nombre: 'simple', exigerAtome: true, uniteCible: null, autoConvertToTarget: false,
    exigerExpression: false,memesAtomes: false, memesOperations: false, opsInclureUnaires: false,expressionSuffit: false     // <<< NOUVEAU : si true et égalité vraie (+ formes demandées), statut = 'correct'
},
suite:   { continuerSiInvalide: true, continuerSiInegale: true, continuerSiMauvaiseNature: true ,continuerSiFormatIncorrect: false }  },
  conversionUnites: {
    accepterInvalide: true,
    memeType: true,
    egalite: { mode: 'numerique', unite: 'convertible', epsilon: 1e-9 },
    format:  { nombre: 'simple', exigerAtome: true, uniteCible: null, autoConvertToTarget: false,
    exigerExpression: false,memesAtomes: false, memesOperations: false, opsInclureUnaires: false,expressionSuffit: false     // <<< NOUVEAU : si true et égalité vraie (+ formes demandées), statut = 'correct'
},suite:   { continuerSiInvalide: true, continuerSiInegale: true, continuerSiMauvaiseNature: true,continuerSiFormatIncorrect: false  }  }
};




// 3) Vérificateur (GRADER)
// ... début identique ...



class MathGrader {
  constructor(policies) {
    this.policies = policies;
  }

  // ==========================================
  // 1. POINT D'ENTRÉE UNIQUE (L'intelligence)
  // ==========================================
evaluer(initialObj, answerObj) {
    const calcInitial = initialObj.calculer();
    const calcAnswer = answerObj.calculer();

    // 1. Sécurité : Erreur de parsing ou de calcul interne
    if (!calcInitial.resultat || !calcAnswer.resultat) {
        return { status: 'invalid_parse', message: "Erreur de calcul ou format illisible." };
    }

    const resInitial = calcInitial.resultat;
    const resAnswer = calcAnswer.resultat;

    // --- 2. DÉTECTION ET COMPARAISON DES NATURES (Correction du bug) ---
    // On définit la nature simplifiée (Grandeur vs Nombre)
    const natureInitiale = (resInitial.nature && resInitial.nature !== "Nombre") ? 'Grandeur' : 'Nombre';
    const natureReponse = (resAnswer.nature && resAnswer.nature !== "Nombre") ? 'Grandeur' : 'Nombre';

    // LOG DE CONTRÔLE (Optionnel, pour tes tests)
    console.log(`COMPARAISON DES NATURES -> Attendu: ${natureInitiale} (${resInitial.nature}), Obtenu: ${natureReponse} (${resAnswer.nature})`);

    // On sort en 'wrong_nature' si les natures physiques précises diffèrent (ex: Longueur vs Capacite)
    // OU si le type global diffère (Grandeur vs Nombre) alors que la policy l'exige.
    const natureDifferente = resInitial.nature !== resAnswer.nature;
    const typeDifferent = this.policies.memeType && (natureInitiale !== natureReponse);

    if (natureDifferente || typeDifferent) {
        return { 
            status: 'wrong_nature', 
            meta: { 
                reason: 'wrong_nature',
                attendu: resInitial.nature || 'Nombre',
                obtenu: resAnswer.nature || 'Nombre'
            } 
        };
    }

    // --- 3. VÉRIFICATION DE L'ÉGALITÉ MATHÉMATIQUE ---
    // Si on arrive ici, les natures sont compatibles.
    if (!resInitial.equals(resAnswer)) {
        return { status: 'unequal' };
    }

    // --- 4. VÉRIFICATION DU FORMAT (DURÉE MIXTE) ---
    if (resInitial instanceof Duree && this.policies.format?.formatDuree === 'mixte') {
        // Utilisation de la fonction externe estEcritureMixteDuree
        const estBienMixte = estEcritureMixteDuree(answerObj.expression);

        if (!estBienMixte) {
            return { 
                status: 'ok', 
                meta: { reason: 'format_mismatch', detail: 'mixed_format_required' } 
            };
        }
    }

    // --- 5. APPEL AUX VÉRIFICATEURS DE FORMATS SECONDAIRES ---
    // On conserve l'appel à la méthode privée qui gère les atomes et les unités exactes
    return this._verifierFormat(resInitial, resAnswer, answerObj);
}

_verifierFormat(ref, ans, answerObj) {
    const p = this.policies || {};

    // Check Atome
    if (p.format?.exigerAtome && !this._isPureAtome(answerObj)) {
        return { status: 'ok', meta: { reason: 'different_atoms' } };
    }

    // Check Unité exacte
    if (p.egalite?.unite === 'exacte') {
        if (!Grandeur.unitesEgales(ref.grandeur.uniteDict, ans.grandeur.uniteDict)) {
            return { status: 'ok', meta: { reason: 'wrong_unit' } };
        }
    }

    // Check Durée Mixte
    if (ref instanceof Duree && p.format?.formatDuree === 'mixte') {
        if (!(ans.doitAfficherMixte?.() ?? false)) {
            return { status: 'ok', meta: { reason: 'format_mismatch' } };
        }
    }

    return { status: 'correct' };
}

_isPureAtome(obj) {
    // 1. Accès sécurisé à l'arbre (supporte l'objet ObjetString ou l'arbre direct)
    const a = obj.arbre || obj;
    if (!a) return false;

    // 2. Identification du type via propriété ou constructeur
    const type = a.type || (a.constructor ? a.constructor.name : null);
    
    // CAS 1 : ATOME UNIQUE (ex: 34/6 L)
    if (type === 'Atome') return true;

    // CAS 2 : SOMME (ex: 16L + 2/3L)
    if (type === 'Somme') {
        const t = a.termes;
        if (!t || t.length !== 2) return false;

        // Extraction des valeurs textuelles des termes
        const v1 = t[0].valeur || (t[0].nombre ? t[0].nombre.toString() : null);
        const v2 = t[1].valeur || (t[1].nombre ? t[1].nombre.toString() : null);

        if (!v1 || !v2) return false;

        // Utilisation de ta classe Nombre pour valider les propriétés numériques
        const n1 = new Nombre(v1);
        const n2 = new Nombre(v2);

        const t1Entier = n1.isEntier();
        const t2Entier = n2.isEntier();
        const t1Mixte = n1.isFractionMixte();
        const t2Mixte = n2.isFractionMixte();

        // Validation : (Un Entier + Une Fraction Propre)
        // La fraction propre est définie par : n'est pas entière ET n'est pas mixte (>1)
        const conditionCanonique = (t1Entier && !t2Entier && !t2Mixte) || 
                                   (t2Entier && !t1Entier && !t1Mixte);

        if (conditionCanonique) {
            // Sécurité : on n'accepte que des valeurs positives (évite 10L + -1/3L)
            if (n1.valeurNum.a > 0 && n2.valeurNum.a > 0) {
                return true;
            }
        }
    }

    // CAS 3 : DURÉES MIXTES (ex: 1h 20min)
    if (typeof estEcritureMixteDuree === 'function' && estEcritureMixteDuree(obj.expression)) {
        return true;
    }

    return false;
}

  // ==========================================
  // 3. HELPERS MATHÉMATIQUES (Tes fonctions)
  // ==========================================
  _getEvalResult(obj) {
    const res = obj?.calculer?.();
    const expr = res?.resultat;
    const isAtom = !!expr?.isAtome?.() && expr.isAtome();
    return { expr, isAtom };
  }

  _numericEqualWithUnits(aAtome, bAtome, rules) {
    const epsilon = rules?.egalite?.epsilon ?? 1e-9;
    const unitMode = rules?.egalite?.unite ?? 'exacte';
    const aDict = aAtome.grandeur?.uniteDict ?? {};
    const bDict = bAtome.grandeur?.uniteDict ?? {};

    if (unitMode === 'exacte' && !this._areUnitsEqualDict(aDict, bDict)) return false;

    let bComparable = bAtome;
    if (unitMode === 'convertible') {
      const cibleTexte = this._unitDictToText(aDict);
      try { 
        bComparable = bAtome.convertirEn(cibleTexte) || bAtome; 
      } catch { return false; }
    }

    const aVal = this._nombreToFloat(aAtome.grandeur?.valeur);
    const bVal = this._nombreToFloat(bComparable.grandeur?.valeur);

    if (!isFinite(aVal) || !isFinite(bVal)) return false;
    return Math.abs(aVal - bVal) <= epsilon;
  }

  // ==========================================
  // 4. FORMATS & DURÉES
  // ==========================================
  _checkFormat(answerObj, rules) {
    const fmt = rules?.format || {};
    if (fmt.formatDuree === 'mixte') {
      return this._estEcritureMixteDuree(answerObj.expression);
    }
    return true;
  }


  // ==========================================
  // 5. ANALYSE DE STRUCTURE (Multisets)
  // ==========================================
  _multiset(list) {
    const m = Object.create(null);
    for (const x of list) m[x] = (m[x] || 0) + 1;
    return m;
  }

  _multisetEqual(a, b) {
    const ma = this._multiset(a), mb = this._multiset(b);
    const ka = Object.keys(ma), kb = Object.keys(mb);
    if (ka.length !== kb.length) return false;
    for (const k of ka) if (ma[k] !== mb[k]) return false;
    return true;
  }

  // ==========================================
  // 6. UTILS DE BAS NIVEAU
  // ==========================================
  _unitDictToText(dict = {}) {
    const parts = Object.keys(dict).sort().map(k => dict[k] === 1 ? k : `${k}^${dict[k]}`);
    return parts.join('·');
  }

  _nombreToFloat(nombre) {
    if (!nombre?.simplify) return NaN;
    const { a, b } = nombre.simplify().valeurNum ?? {};
    if (typeof a !== 'number' || typeof b !== 'number' || b === 0) return NaN;
    return a / b;
  }

  _areUnitsEqualDict(d1 = {}, d2 = {}) {
    const k1 = Object.keys(d1).sort(), k2 = Object.keys(d2).sort();
    if (k1.length !== k2.length) return false;
    for (let i = 0; i < k1.length; i++) {
      if (k1[i] !== k2[i]) return false;
      if (d1[k1[i]] !== d2[k1[i]]) return false;
    }
    return true;
  }
}

// On exporte pour que ce soit accessible
window.MathGrader = MathGrader;



