// Arbre.js — génération d'un arbre de calcul déjà complet (jetons + opérations
// aux nœuds), que l'élève doit ÉVALUER pour trouver le résultat final. Cette
// application est l'inverse de compteEstBonSimple : là-bas l'élève CONSTRUIT
// un arbre pour atteindre une cible donnée ; ici l'arbre est donné et c'est
// le résultat qui est à trouver.
//
// Un seul mécanisme de génération (construireNiveau1 + agrandir, par
// SUBSTITUTION DE FEUILLE) pour les deux modes — avecFraction ne change que
// le comportement de la décomposition et l'éligibilité des feuilles :
//
// - avecFraction = false : CHAQUE nœud doit être un entier. Une substitution
//   doit donc PRÉSERVER EXACTEMENT la valeur de la feuille remplacée (÷
//   construit le dividende comme valeur × diviseur, × cherche un vrai
//   diviseur de valeur, etc.) — voir les commentaires plus bas pour le détail
//   des règles d'éligibilité que ça impose.
//
// - avecFraction = true : aucune contrainte sur les valeurs (tout résultat,
//   entier ou non, est accepté), donc rien à préserver : décomposer une
//   feuille revient juste à tirer deux feuilles fraîches dans la plage du
//   niveau, exactement comme construireNiveau1 le fait pour la toute
//   première opération — n'importe quelle feuille accepte n'importe quelle
//   opération, aucune règle d'éligibilité particulière.

const OPS_ARBRE_CALCUL = ["+", "-", "*", ":"];
const MAGNITUDE_MAX = 1000000;

function randEntreArbre(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function melangerArbre(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// rangeDefaut/rangeSpecial définissent la plage de tirage d'une feuille pour
// chaque niveau — rangeSpecial (quand il existe) tire occasionnellement une
// feuille dans une plage plus large, pour varier la difficulté (voir
// tirerPlageFeuille). Jetons toujours strictement positifs (jamais 0) :
// évite les divisions par zéro et les multiplications triviales par 0.
const NIVEAUX_JETONS_ARBRE = {
  simple: { label: "1", rangeDefaut: [1, 10], rangeSpecial: null },
  moyen: { label: "2", rangeDefaut: [1, 10], rangeSpecial: [10, 20] },
  complexe: { label: "3", rangeDefaut: [10, 20], rangeSpecial: [1, 10] },
};

function depasseMax(nombre) {
  const s = nombre.simplify().valeurNum;
  return Math.abs(s.a) > MAGNITUDE_MAX || s.b > MAGNITUDE_MAX;
}

// ==================== GÉNÉRATION PAR SUBSTITUTION DE FEUILLE ====================
//
// Pas de phase "structure d'abord, valeurs ensuite" ni de cible qui descend
// en cascade dans l'arbre : on construit un arbre à UNE opération (niveau
// 1), puis on l'AGRANDIT une opération à la fois en choisissant une feuille
// existante et en la REMPLAÇANT par un sous-calcul — voir decomposer plus
// bas pour ce que "remplacer" veut dire selon avecFraction.
//
// À chaque étape (niveau 1 compris) on choisit l'OPÉRATION en premier (les 4
// à égalité), puis on cherche une feuille qui peut l'accueillir. En mode
// entier (avecFraction=false) seules certaines feuilles conviennent :
//   - ÷ : la feuille doit valoir une valeur de la plage du niveau, et ≠ 1
//     (sinon le nouveau dividende = diviseur, donc a÷a — le cas trivial
//     qu'on veut justement éviter). Le dividende est construit comme un
//     vrai fait de table (diviseur × quotient), jamais cherché après coup.
//   - × : la feuille doit être composée (avoir un diviseur autre que 1 et
//     elle-même) — une feuille première ne peut tout simplement pas se
//     décomposer en produit non trivial.
//   - + / − : n'importe quelle feuille convient.
// En mode fraction (avecFraction=true), n'importe quelle feuille accepte
// n'importe quelle opération : rien à préserver, donc rien à vérifier.
// Si aucune feuille ne convient pour l'opération tirée, on en essaie une
// autre (pas encore essayée à cette étape) ; si les 4 échouent, on relance
// tout l'arbre depuis le niveau 1.

function feuille(valeur) {
  return { type: "jeton", nombre: Nombre.fromParts(valeur, 1, "entier") };
}

function noeudOp(op, gauche, droite) {
  let nombre;
  switch (op) {
    case "+": nombre = gauche.nombre.add(droite.nombre).simplify(); break;
    case "-": nombre = gauche.nombre.sub(droite.nombre).simplify(); break;
    case "*": nombre = gauche.nombre.mul(droite.nombre).simplify(); break;
    case ":": nombre = gauche.nombre.div(droite.nombre).simplify(); break;
  }
  return { type: "op", op, gauche, droite, nombre };
}

function diviseursDe(n) {
  const diviseurs = [];
  for (let d = 1; d <= n; d++) {
    if (n % d === 0) diviseurs.push(d);
  }
  return diviseurs;
}

// Une feuille au hasard prend la plage "spéciale" du niveau (si elle
// existe) au lieu de la plage par défaut — approxime l'ancien "une feuille
// spéciale par arbre" sans avoir à la désigner à l'avance, puisque les
// feuilles apparaissent au fil de l'agrandissement plutôt que toutes en
// même temps.
function tirerPlageFeuille(niveau) {
  if (niveau.rangeSpecial && Math.random() < 0.2) return niveau.rangeSpecial;
  return niveau.rangeDefaut;
}

// Décompose une feuille selon op. En mode fraction, valeur n'intervient pas
// du tout : on tire simplement deux feuilles fraîches dans la plage du
// niveau (rien à préserver). En mode entier, valeur est imposée — on tire UN
// des deux membres dans la plage et on déduit l'autre pour que le résultat
// vaille exactement valeur. Renvoie {gauche, droite} ou null si impossible.
function decomposer(valeur, op, niveau, avecRelatifs, avecFraction) {
  if (avecFraction) {
    const [minA, maxA] = tirerPlageFeuille(niveau);
    const [minB, maxB] = tirerPlageFeuille(niveau);
    if (op === "-") {
      for (let essai = 0; essai < 5; essai++) {
        let a = randEntreArbre(minA, maxA);
        let b = randEntreArbre(minB, maxB);
        if (!avecRelatifs) {
          if (a < b) [a, b] = [b, a];
          if (a === b) continue; // égalité stricte : on retire un autre couple
        }
        return { gauche: feuille(a), droite: feuille(b) };
      }
      return null;
    }
    return { gauche: feuille(randEntreArbre(minA, maxA)), droite: feuille(randEntreArbre(minB, maxB)) };
  }

  const [min, max] = tirerPlageFeuille(niveau);

  if (op === "+") {
    const bMin = Math.max(1, min);
    const bMax = Math.min(max, valeur - 1);
    if (bMin > bMax) return null;
    const membre = randEntreArbre(bMin, bMax);
    return { gauche: feuille(valeur - membre), droite: feuille(membre) };
  }

  if (op === "-") {
    const bMin = Math.max(1, min);
    if (bMin > max) return null;
    const membre = randEntreArbre(bMin, max);
    return { gauche: feuille(valeur + membre), droite: feuille(membre) };
  }

  if (op === "*") {
    const candidats = melangerArbre(
      diviseursDe(valeur).filter(d => d !== 1 && d !== valeur && d >= min && d <= max)
    );
    if (candidats.length === 0) return null;
    const d = candidats[0];
    return { gauche: feuille(valeur / d), droite: feuille(d) };
  }

  // ":" — valeur devient le quotient imposé ; jamais si valeur === 1 (voir
  // estEligible), donc pas besoin de re-vérifier la triviailté ici.
  const bMin = Math.max(2, min);
  if (bMin > max) return null;
  const diviseur = randEntreArbre(bMin, max);
  return { gauche: feuille(valeur * diviseur), droite: feuille(diviseur) };
}

function dansPlageNiveau(valeur, niveau) {
  const [dMin, dMax] = niveau.rangeDefaut;
  if (valeur >= dMin && valeur <= dMax) return true;
  if (!niveau.rangeSpecial) return false;
  const [sMin, sMax] = niveau.rangeSpecial;
  return valeur >= sMin && valeur <= sMax;
}

// ÷ ne peut remplacer qu'une feuille dont la valeur est ENCORE dans la
// plage du niveau (jamais une valeur déjà sortie de plage à cause d'un
// remplacement précédent) — sinon un dividende (déjà plus grand que sa
// plage par construction) pourrait lui-même redevenir éligible à une
// nouvelle division, et ainsi de suite : la valeur grossirait sans limite
// avec la profondeur de l'arbre au lieu de rester bornée par la plage.
function estEligible(valeur, op, niveau, avecFraction) {
  if (avecFraction) return true; // rien à préserver : toute feuille convient
  if (op === ":") return valeur !== 1 && dansPlageNiveau(valeur, niveau);
  if (op === "*") return diviseursDe(valeur).some(d => d !== 1 && d !== valeur);
  return true; // + / - : toujours possible
}

function collecterFeuilles(racine) {
  const feuilles = [];
  (function marcher(n) {
    if (n.type === "jeton") { feuilles.push(n); return; }
    marcher(n.gauche);
    marcher(n.droite);
  })(racine);
  return feuilles;
}

// Construit l'arbre de départ : une seule opération. En mode fraction, ses
// deux membres sont tirés directement dans la plage pour n'importe quelle
// opération (÷ compris — le quotient peut tomber pile ou pas, aucune
// importance). En mode entier, ÷ reste un fait de table construit
// directement (diviseur × quotient), jamais cherché après coup.
function construireNiveau1(niveau, avecRelatifs, avecFraction) {
  for (const op of melangerArbre(OPS_ARBRE_CALCUL)) {
    const [minA, maxA] = tirerPlageFeuille(niveau);
    const [minB, maxB] = tirerPlageFeuille(niveau);

    if (op === "+") {
      return noeudOp("+", feuille(randEntreArbre(minA, maxA)), feuille(randEntreArbre(minB, maxB)));
    }
    if (op === "*") {
      return noeudOp("*", feuille(randEntreArbre(minA, maxA)), feuille(randEntreArbre(minB, maxB)));
    }
    if (op === "-") {
      let a = randEntreArbre(minA, maxA);
      let b = randEntreArbre(minB, maxB);
      if (!avecRelatifs) {
        if (a < b) [a, b] = [b, a];
        if (a === b) continue; // égalité stricte : résultat nul, on retire cette opération
      }
      return noeudOp("-", feuille(a), feuille(b));
    }
    // ":"
    if (avecFraction) {
      return noeudOp(":", feuille(randEntreArbre(minA, maxA)), feuille(randEntreArbre(minB, maxB)));
    }
    const diviseur = randEntreArbre(Math.max(2, minB), maxB); // fait de table direct, diviseur ≠ 1
    const quotient = randEntreArbre(Math.max(1, minA), maxA);
    return noeudOp(":", feuille(diviseur * quotient), feuille(diviseur));
  }
  return null;
}

// Ajoute UNE opération à l'arbre en remplaçant une feuille existante par un
// sous-calcul. Mute racine en place (la feuille choisie devient un nœud
// "op") ; renvoie true/false selon le succès.
function agrandir(racine, niveau, avecRelatifs, avecFraction) {
  for (const op of melangerArbre(OPS_ARBRE_CALCUL)) {
    const candidates = melangerArbre(
      collecterFeuilles(racine).filter(f => estEligible(f.nombre.valeurNum.a, op, niveau, avecFraction))
    );
    for (const f of candidates) {
      const decomposition = decomposer(f.nombre.valeurNum.a, op, niveau, avecRelatifs, avecFraction);
      if (!decomposition) continue;
      f.type = "op";
      f.op = op;
      f.gauche = decomposition.gauche;
      f.droite = decomposition.droite;
      // en mode entier, f.nombre reste inchangé (substitution exacte) ; en
      // mode fraction, il n'a plus de sens et sera ignoré — on le laisse tel
      // quel, seul le résultat recalculé de bas en haut compte à la fin.
      return true;
    }
  }
  return false;
}

// Recalcule le résultat de chaque nœud "op" de bas en haut — nécessaire en
// mode fraction puisque decomposer n'y préserve pas la valeur de la feuille
// remplacée (voir agrandir) ; sans effet en mode entier où f.nombre était
// déjà exact partout, mais appelé dans les deux cas pour rester simple.
function recalculer(noeud) {
  if (noeud.type === "jeton") return noeud.nombre;
  const g = recalculer(noeud.gauche);
  const d = recalculer(noeud.droite);
  switch (noeud.op) {
    case "+": noeud.nombre = g.add(d).simplify(); break;
    case "-": noeud.nombre = g.sub(d).simplify(); break;
    case "*": noeud.nombre = g.mul(d).simplify(); break;
    case ":": noeud.nombre = g.div(d).simplify(); break;
  }
  return noeud.nombre;
}

// Numérote les feuilles de gauche à droite et construit le tableau jetons
// attendu par le reste de l'appli (game.jetons + jetonIndex sur chaque
// feuille) — la structure/valeurs sont déjà entièrement résolues à ce stade.
function finaliserArbre(structure, cible) {
  const jetons = [];
  (function indexer(noeud) {
    if (noeud.type === "jeton") {
      noeud.jetonIndex = jetons.length;
      jetons.push(noeud.nombre.valeurNum.a);
      return;
    }
    indexer(noeud.gauche);
    indexer(noeud.droite);
  })(structure);
  return { jetons, arbre: structure, cible };
}

// Tire nbJetons jetons (selon niveauCle) et une forme d'arbre valide.
// Renvoie {jetons, arbre, cible} où cible est le Nombre résultat final.
function tirerArbreEtCible(nbJetons, niveauCle, avecRelatifs, avecFraction, essaisMax = 800) {
  const niveau = NIVEAUX_JETONS_ARBRE[niveauCle] || NIVEAUX_JETONS_ARBRE.simple;
  const nbOperations = nbJetons - 1;
  essaiArbre:
  for (let essai = 0; essai < essaisMax; essai++) {
    const racine = construireNiveau1(niveau, avecRelatifs, avecFraction);
    if (!racine) continue;
    for (let k = 1; k < nbOperations; k++) {
      if (!agrandir(racine, niveau, avecRelatifs, avecFraction)) continue essaiArbre;
    }
    const cible = avecFraction ? recalculer(racine) : racine.nombre;
    if (depasseMax(cible)) continue;
    return finaliserArbre(racine, cible);
  }
  return null;
}

window.NIVEAUX_JETONS_ARBRE = NIVEAUX_JETONS_ARBRE;
window.tirerArbreEtCible = tirerArbreEtCible;
