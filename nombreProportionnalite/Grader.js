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
    // Utilisation de la normalisation globale définie dans Exercice.js
    this.policies = typeof window.normalizePolicies === 'function' 
      ? window.normalizePolicies(policies) 
      : policies;
  }

  /**
   * Méthode principale d'évaluation
   * @param {Expression} initialObj - L'objet de référence (la consigne/solution)
   * @param {Expression} answerObj - L'objet créé à partir de la réponse élève
   */
evaluer(initialObj, answerObj) {
  const p = this.policies;

  // 1. TECHNIQUE : L'entrée est-elle valide ?
  if (!answerObj || !answerObj.isValid()) {
    return this._finaliserVerdict({ status: 'invalid_parse' });
  }

  const resRef = initialObj.calculer().resultat;
  const resAns = answerObj.calculer().resultat;

  // 2. NATURE : Masse, Volume, Durée...
  const natRef = resRef.getNature?.() || resRef.nature;
  const natAns = resAns.getNature?.() || resAns.nature;
  if (p.memeType && natRef !== natAns) {
    return this._finaliserVerdict({ status: 'wrong_nature', meta: { attendu: natRef } });
  }

  // 3. MATHS : Est-ce que la valeur est juste ?
  if (!this._comparerValeurs(resRef, resAns, p.egalite)) {
    return this._finaliserVerdict({ status: 'unequal' });
  }

  // 4. EXTRACTION : On récupère l'objet pour tester la forme
  const atomeEleve = this._extraireAtome(answerObj, p.format.nombre);

  // --- LE BLOC DE CONFIANCE (Format & Unité Cible) ---
  if (atomeEleve) {
    // On lance la vérification détaillée (Unité cible + HMS + Type de nombre)
    const formatVerdict = this._verifierFormatAtome(
      atomeEleve, 
      resRef, 
      p.format, 
      answerObj.expression
    );
    
    if (formatVerdict.status !== 'correct') {
      return this._finaliserVerdict(formatVerdict);
    }
  } 
  else if (p.format.exigerAtome) {
    // Si on n'a pas pu extraire d'atome (ex: l'élève a laissé une opération)
    return this._finaliserVerdict({ status: 'ok', meta: { reason: 'not_an_atom' } });
  }

  // 5. VICTOIRE FINALE
  return this._finaliserVerdict({ status: 'correct' });
}

  // NOUVELLE MÉTHODE INTERNE : Centralise la création de l'objet final
_finaliserVerdict(verdict) {
    // 1. On assure que les propriétés de base existent toujours
    const stableVerdict = {
        status: verdict.status || 'invalid_parse',
        meta: verdict.meta || {}, // Jamais null, toujours un objet vide au pire
        message: verdict.message || null
    };

    // 2. On génère le message seulement une fois que l'objet est stable
    stableVerdict.message = stableVerdict.message || this._genererMessage(stableVerdict);
     //console.log("verdict",verdict);
    return stableVerdict;
}

 _genererMessage(verdict) {
    const { status, meta } = verdict; // meta est garanti être un {} grâce au point 2

    if (status === 'correct') return "✅ Bravo !";
    if (status === 'invalid_parse') return "Entrée non reconnue.";
    if (status === 'unequal') return "Valeur incorrecte.";

    // RÉHABILITATION DU MESSAGE DE NATURE
    if (status === 'wrong_nature') {
        const attendu = meta.attendu || "une autre grandeur";
        return `Nature incorrecte (attendu : **${attendu}**).`;
    }

    if (status === 'ok') {
        // C'est ici que le meta doit être lu prudemment
        if (meta.reason === 'not_an_atom') return "Ok,continue";
        if (meta.reason === 'wrong_unit') return `L'unité attendue est : **${meta.attendu || '?'}**.`;
        
        if (meta.reason === 'format_mismatch') {
            const messages = {
                'expected_duration_mixte': "Format HMS attendu.",
                'expected_fractionSimple': "Simplifie la fraction.",
                'expected_mixte': "Forme mixte attendue."
            };
            return messages[meta.detail] || "Simplifier la forme.";
        }
    }

    return "Réponse incorrecte.";
}
_extraireAtome(answerObj, formatNombreAttendu) {
  const arbre = answerObj.arbre;
  const expr = answerObj.expression; // L'expression brute (ex: "1h 20min")

  if (arbre.isAtome()) return arbre;

  if (arbre instanceof Somme || arbre.getNature?.() === 'Duree') {
    // Si c'est une durée, on vérifie si la chaîne brute respecte le format mixte
if (arbre.getNature?.() === 'Duree') {
    // On renvoie le résultat du calcul (l'objet Duree global)
    return answerObj.calculer().resultat;
  }


      return this._testerSiSommeEstNombreMixte(arbre, expr);
    
  }
  return null;
}

_testerSiSommeEstNombreMixte(sommeObj, expressionBrute) {
  // Un nombre mixte sous forme de somme a exactement 2 termes
  if (!sommeObj.termes || sommeObj.termes.length !== 2) return null;

  const [t1, t2] = sommeObj.termes;

  // Ils doivent tous deux être des Atomes
  if (!t1.isAtome() || !t2.isAtome()) return null;

  // Ils doivent avoir la même unité (ex: "L" et "L")
  const u1 = JSON.stringify(t1.grandeur.uniteDict);
  const u2 = JSON.stringify(t2.grandeur.uniteDict);
  
  if (u1 !== u2) return null;

  // RUSE : On prend l'expression, on enlève l'unité et on teste si c'est un format mixte
  const uniteStr = t1.unite || ""; 
  const sansUnite = expressionBrute.replace(new RegExp(uniteStr, 'g'), '').trim();


try {
    const unitStr = sommeObj.termes[0].unite || "";
    // On nettoie l'expression pour ne garder que la partie numérique
    const sansUnite = expressionBrute.replace(new RegExp(unitStr, 'g'), '').trim();
    
    const testNombre = new Nombre(sansUnite);

  
    if (testNombre.isFormat('mixte')) {
      // 1. On récupère la grandeur totale (la somme mathématique des deux termes)
      const grandeurTotale = sommeObj.termes[0].grandeur.add(sommeObj.termes[1].grandeur);

      // 2. On crée l'Atome final via la factory statique Atome.from
      // Cela permet de récupérer automatiquement la bonne classe (Duree, Prix, Atome)
      const atomeFinal = Atome.from(grandeurTotale);

      // 3. ON FORCE LE NOMBRE INTERNE 
      // C'est l'étape clé : l'atome mathématique contient 7/3, 
      // mais on lui injecte l'objet 'testNombre' qui sait qu'il est 'mixteSimple'
      atomeFinal.nombre = testNombre;
      atomeFinal.texte = expressionBrute; // On garde la trace de la saisie

      return atomeFinal; // répond true à isAtome() et possède le bon typeEcriture
   }
  } catch (e) {
    return null;
  }
  return null;
}


  /**
   * Vérifie la conformité pédagogique de l'atome
   */
_verifierFormatAtome(atome, resRef, f, expressionBrute) {
  const meta = {};
  const estUneDuree = (atome instanceof Duree) || (atome.getNature?.() === "Duree");

  // 1. Unité Cible : Toujours prioritaire si définie
  if (f.uniteCible && Object.keys(f.uniteCible).length > 0) {
    // ... (ton code de validation d'unité cible)
  }

  // 2. DÉTERMINATION DU FORMAT MAÎTRE
  // Si c'est une durée et qu'on demande du mixte, c'est LE format qui gagne.
  if (estUneDuree && f.formatDuree === 'mixte') {
    const formatOk = estEcritureMixteDuree(expressionBrute, false);
    if (!formatOk) {
      meta.reason = 'format_mismatch';
      meta.detail = 'expected_duration_mixte';
    }
    // ON RETOURNE ICI : On ne veut pas vérifier si "2h 30min" est un décimal ou une fraction.
    return Object.keys(meta).length > 0 ? { status: 'ok', meta } : { status: 'correct' };
  }

  // 3. FORMATS STANDARDS (Nombre simple, fraction, décimal...)
  // On n'arrive ici que si on n'est pas en "Duree Mixte"
  if (f.nombre && f.nombre !== 'simple') {
    const nombreEleve = atome.nombre;
    if (nombreEleve?.isFormat && !nombreEleve.isFormat(f.nombre)) {
      meta.reason = 'format_mismatch';
      meta.detail = `expected_${f.nombre}`;
    }
  }

  return Object.keys(meta).length > 0 ? { status: 'ok', meta } : { status: 'correct' };
}

  /**
   * Comparaison mathématique stricte ou numérique
   */
  _comparerValeurs(resRef, resAns, pEgalite) {
    // On utilise la méthode equals() de tes classes (Grandeur/Atome)
    // Elle gère déjà la conversion d'unités en interne
    let isMathEqual = resRef.equals(resAns);

    // Si l'égalité exacte échoue, on tente le mode numérique (approximatif)
    if (!isMathEqual && pEgalite.mode === 'numerique') {
      const v1 = this._nombreToFloat(resRef.grandeur?.valeur || resRef.valeur);
      const v2 = this._nombreToFloat(resAns.grandeur?.valeur || resAns.valeur);
      
      if (!isNaN(v1) && !isNaN(v2)) {
        isMathEqual = Math.abs(v1 - v2) <= pEgalite.epsilon;
      }
    }
    return isMathEqual;
  }

  /**
   * Conversion sécurisée pour calculs d'epsilon
   */
  _nombreToFloat(n) {
    if (!n) return NaN;
    // Si c'est déjà un number JS
    if (typeof n === 'number') return n;
    // Si c'est un objet Nombre/Fraction
    const { a, b } = n.valeurNum || { a: n.a, b: n.b };
    return a / (b || 1);
  }

  _isUnitInCible(ansDict, cible) {
    // Si la cible est un dictionnaire précis { m: 1 }
    if (typeof cible === 'object' && !Array.isArray(cible)) {
      const kA = Object.keys(ansDict).sort(), kC = Object.keys(cible).sort();
      return kA.length === kC.length && kA.every(k => ansDict[k] === cible[k]);
    }
    // Si la cible est une liste d'unités acceptables ['m', 'km']
    if (Array.isArray(cible)) {
      const u = Object.keys(ansDict)[0];
      return cible.includes(u);
    }
    return true;
  }
}

window.MathGrader = MathGrader;


