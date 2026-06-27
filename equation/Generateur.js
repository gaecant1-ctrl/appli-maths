// ============================================================
// Generateur.js — génération paramétrable d'équations du premier degré
// ============================================================
// Trois familles "shuffle" (tableau vide = pioche parmi toutes les valeurs) :
//   - typesEquation : sous-ensemble de TYPES_EQUATION (id)
//   - typesNombre   : sous-ensemble de TYPES_NOMBRE (id)
//   - typesSolution : sous-ensemble de ['entier', 'fraction']
// Deux toggles simples (booléens) :
//   - coefficientsNegatifs : autorise les coefficients négatifs (v exclu)
//   - solutionNegative     : autorise une solution x négative
//
// Méthode : on tire x_sol en premier, puis les coefficients nécessaires au
// type d'équation choisi, puis on déduit le dernier coefficient par calcul
// exact (Nombre/Polynome), pour garantir une solution connue sans jamais
// passer par du flottant.
// ============================================================

const TYPES_EQUATION = [
  { id: "Simple",         label: "ax+b=d" },
  { id: "Variable2Cotes", label: "ax+b=cx+d" },
  { id: "Parentheses",    label: "u(ax+b)=d" },
  { id: "Division",       label: "(ax+b):v=d" }
];

const TYPES_NOMBRE = [
  { id: "Entiers",            label: "Entiers" },
  { id: "FractionsSimples",   label: "Fractions simples (même dénominateur)" },
  { id: "FractionsDifferentes", label: "Fractions à dénominateurs différents" }
];

const DENOM_MIN = 2;
const DENOM_MAX = 6;

// --- Utilitaires de tirage ---

function tirerEntier(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function tirerSigne(autoriseNegatif) {
  if (!autoriseNegatif) return 1;
  return Math.random() < 0.5 ? -1 : 1;
}

function choisirParmi(liste) {
  return liste[Math.floor(Math.random() * liste.length)];
}

/** Pioche un id parmi la sélection fournie, ou parmi tous les ids du référentiel si la sélection est vide (shuffle). */
function piocherType(selection, referentiel) {
  const ids = referentiel.map(t => t.id);
  const dispo = (selection && selection.length > 0) ? selection : ids;
  return choisirParmi(dispo);
}

/**
 * Tire un coefficient (Nombre) selon le type de nombre demandé.
 * - Entiers : entier entre min et max, signe selon coefficientsNegatifs.
 * - FractionsSimples : numérateur entier (min..max) sur un dénominateur
 *   commun fixé par denomCommun (passé par l'appelant pour que tous les
 *   coefficients d'une même équation partagent le même dénominateur).
 * - FractionsDifferentes : numérateur entier sur un dénominateur propre,
 *   tiré indépendamment entre DENOM_MIN et DENOM_MAX.
 */
function tirerCoefficient(typeNombre, opts) {
  const { min = 2, max = 9, coefficientsNegatifs = false, denomCommun = null } = opts || {};
  const signe = tirerSigne(coefficientsNegatifs);
  const numerateur = signe * tirerEntier(min, max);

  if (typeNombre === "Entiers") {
    return Nombre.fromParts(numerateur, 1, "entier");
  }
  if (typeNombre === "FractionsSimples") {
    const den = denomCommun || tirerEntier(DENOM_MIN, DENOM_MAX);
    return Nombre.fromParts(numerateur, den, "fraction");
  }
  if (typeNombre === "FractionsDifferentes") {
    const den = tirerEntier(DENOM_MIN, DENOM_MAX);
    return Nombre.fromParts(numerateur, den, "fraction");
  }
  throw new Error("Type de nombre inconnu : " + typeNombre);
}

/** Tire x_sol (Nombre) selon le type de solution demandé. */
function tirerSolution(typeSolution, solutionNegative) {
  const signe = tirerSigne(solutionNegative);
  if (typeSolution === "fraction") {
    const num = tirerEntier(1, 9);
    const den = tirerEntier(2, 6);
    return Nombre.fromParts(signe * num, den, "fraction");
  }
  // entier
  return Nombre.fromParts(signe * tirerEntier(0, 12), 1, "entier");
}

/** Liste les diviseurs entiers positifs (>1, pour éviter v=1 qui ne sert à rien pédagogiquement) d'un entier strictement positif. */
function diviseursPositifs(n) {
  const res = [];
  for (let d = 2; d <= n; d++) {
    if (n % d === 0) res.push(d);
  }
  return res;
}

/**
 * Génère une équation selon les paramètres fournis. Renvoie { lhs, rhs, xSol }
 * où lhs/rhs sont des chaînes (texte prêt à parser par ObjetString/Equation)
 * et xSol est le Nombre solution exacte attendue.
 *
 * @param {Object} params
 * @param {string[]} params.typesEquation - sous-ensemble de TYPES_EQUATION (ids), [] = shuffle
 * @param {string[]} params.typesNombre - sous-ensemble de TYPES_NOMBRE (ids), [] = shuffle
 * @param {string[]} params.typesSolution - sous-ensemble de ['entier','fraction'], [] = shuffle
 * @param {boolean} params.coefficientsNegatifs
 * @param {boolean} params.solutionNegative
 */
function genererEquation(params) {
  const {
    typesEquation = [],
    typesNombre = [],
    typesSolution = [],
    coefficientsNegatifs = false,
    solutionNegative = false
  } = params || {};

  const typeEq = piocherType(typesEquation, TYPES_EQUATION);
  const typeNb = piocherType(typesNombre, TYPES_NOMBRE);
  const typeSol = (typesSolution && typesSolution.length > 0)
    ? choisirParmi(typesSolution)
    : choisirParmi(['entier', 'fraction']);

  const xSol = simplifie(tirerSolution(typeSol, solutionNegative));

  // Dénominateur commun unique pour toute l'équation si FractionsSimples.
  const denomCommun = (typeNb === "FractionsSimples") ? tirerEntier(DENOM_MIN, DENOM_MAX) : null;
  const coeffOpts = { coefficientsNegatifs, denomCommun };

  switch (typeEq) {
    case "Simple": {
      // ax+b=d : tirer a (a!=0), b -> déduire d = a*xSol+b
      const a = tirerCoefficient(typeNb, { ...coeffOpts, min: 2, max: 9 });
      const b = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 15 });
      const d = a.mul(xSol).add(b);
      return { lhs: formatTerme(a, 1) + formatTerme(b, 0, true), rhs: simplifie(d).toString(), xSol, typeEq, typeNb, typeSol };
    }

    case "Variable2Cotes": {
      // ax+b=cx+d : tirer a, b, c (a != c) -> déduire d = a*xSol+b - c*xSol
      let a, c;
      do {
        a = tirerCoefficient(typeNb, { ...coeffOpts, min: 2, max: 9 });
        c = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 8 });
      } while (a.equal(c)); // évite la dégénérescence "x disparu"
      const b = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 15 });
      const d = a.mul(xSol).add(b).sub(c.mul(xSol));
      return {
        lhs: formatTerme(a, 1) + formatTerme(b, 0, true),
        rhs: formatTerme(c, 1) + formatTerme(simplifie(d), 0, true),
        xSol, typeEq, typeNb, typeSol
      };
    }

    case "Parentheses": {
      // u(ax+b)=d : tirer u (entier, jamais fraction pour rester un facteur simple), a, b -> déduire d = u*(a*xSol+b)
      const u = tirerCoefficient("Entiers", { coefficientsNegatifs, min: 2, max: 6 });
      const a = tirerCoefficient(typeNb, { ...coeffOpts, min: 2, max: 9 });
      const b = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 15 });
      const interieur = a.mul(xSol).add(b);
      const d = u.mul(interieur);
      const lhsInterieur = formatTerme(a, 1) + formatTerme(b, 0, true);
      return { lhs: `${simplifie(u).toString()}(${lhsInterieur})`, rhs: simplifie(d).toString(), xSol, typeEq, typeNb, typeSol };
    }

    case "Division": {
      // (ax+b):v=d : tirer a, b -> calculer numerateur = a*xSol+b (Nombre, potentiellement fractionnaire)
      // -> si le numérateur est entier ET type "Entiers", choisir v parmi ses diviseurs réels (>1) ;
      //    si aucun diviseur >1 n'existe (numérateur premier ou 0), retirer a,b plutôt que d'accepter v=1.
      //    si le numérateur est déjà fractionnaire, v est un entier simple (2..6), d en découle exactement.
      let a, b, numerateur, v;
      let tentatives = 0;
      do {
        a = tirerCoefficient(typeNb, { ...coeffOpts, min: 2, max: 9 });
        b = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 15 });
        numerateur = simplifie(a.mul(xSol).add(b));
        tentatives++;

        if (typeNb === "Entiers" && numerateur.isEntier()) {
          const valEnt = Math.abs(numerateur.valeurNum.a / numerateur.valeurNum.b);
          const divs = diviseursPositifs(valEnt).filter(dd => dd > 1 && dd <= 12);
          v = divs.length > 0 ? Nombre.fromParts(choisirParmi(divs), 1, "entier") : null;
        } else {
          v = Nombre.fromParts(tirerEntier(2, 6), 1, "entier");
        }
      } while (v === null && tentatives < 50);

      if (v === null) {
        // Filet de sécurité ultime (devrait être extrêmement rare en pratique) :
        // on reconstruit b pour forcer un numérateur entier pair, garantissant v=2 comme diviseur valide.
        a = tirerCoefficient(typeNb, { ...coeffOpts, min: 2, max: 9 });
        const reste = a.mul(xSol);
        // On choisit b entier tel que (reste + b) soit un entier pair : b = (entier pair désiré) - reste.
        const cible = Nombre.fromParts(2 * tirerEntier(1, 8), 1, "entier"); // un pair entre 2 et 16
        b = simplifie(cible.sub(reste));
        numerateur = simplifie(a.mul(xSol).add(b));
        v = Nombre.fromParts(2, 1, "entier");
      }

      const d = simplifie(numerateur.div(v));
      const lhsInterieur = formatTerme(a, 1) + formatTerme(b, 0, true);
      return { lhs: `(${lhsInterieur}):${simplifie(v).toString()}`, rhs: d.toString(), xSol, typeEq, typeNb, typeSol };
    }

    default:
      throw new Error("Type d'équation inconnu : " + typeEq);
  }
}

/** Simplifie un Nombre (réduit la fraction) avant de le formater. */
function simplifie(n) {
  return n.simplify();
}

/**
 * Formate un coefficient en terme texte ("3x", "-2/3x", "+5", "-7"...).
 * @param {Nombre} coeff
 * @param {number} degre - 1 pour le terme en x, 0 pour la constante
 * @param {boolean} avecSignePourPositif - si true, préfixe "+" explicite quand positif (utile pour la concaténation après un premier terme)
 */
function formatTerme(coeffBrut, degre, avecSignePourPositif = false) {
  const coeff = simplifie(coeffBrut);
  const estNegatif = coeff.valeurNum.a < 0;
  const valeurAbs = estNegatif
    ? Nombre.fromParts(-coeff.valeurNum.a, coeff.valeurNum.b, coeff.typeEcriture)
    : coeff;
  const texte = valeurAbs.toString();
  const suffixe = degre === 1 ? "x" : "";

  // Coefficient 1 devant x (entier OU fraction valant exactement 1) : on écrit juste "x".
  const estUnSimple = degre === 1 && texte === "1";
  const corps = estUnSimple ? "x" : `${texte}${suffixe}`;

  if (estNegatif) return `-${corps}`;
  return avecSignePourPositif ? `+${corps}` : corps;
}
