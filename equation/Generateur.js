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
  { id: "Division",       label: "(ax+b):v=d" },
  { id: "DifferenceParentheses", label: "(ax+b)-(cx+d)=0" },
  { id: "DeuxQuotients",  label: "(ax+b)/u=(cx+d)/v" },
  { id: "ProduitNul",     label: "(ax+b)(cx+d)=0" },
  { id: "ProduitConstante", label: "(ax+b)(cx+d)=bd" },
  { id: "CarreEgalNombre", label: "x²=a" },
  { id: "CarreX",         label: "ax²=bx" },
  { id: "CarreNombre",    label: "(ax+b)²=c²" },
  { id: "DeuxCarres",     label: "A²=B²" },
  { id: "FacteurCommun",  label: "(ax+b)(cx+d)=(ax+b)(ex+f)" }
];

// Un niveau est un raccourci qui coche un ensemble de types d'équation (cumulatif).
const NIVEAUX = [
  { id: "5e", label: "5e", types: ["Simple", "Variable2Cotes"] },
  { id: "4e", label: "4e", types: ["Simple", "Variable2Cotes", "Parentheses", "Division", "DifferenceParentheses"] },
  { id: "3e", label: "3e", types: TYPES_EQUATION.map(t => t.id) }
];

const TYPES_NOMBRE = [
  { id: "Entiers",            label: "Entiers" },
  { id: "FractionsSimples",   label: "Fractions simples (même dénominateur)" },
  { id: "FractionsDifferentes", label: "Fractions à dénominateurs différents" }
];

const DENOM_MIN = 2;
const DENOM_MAX = 6;
const CARRE_RACINE_MAX = 10; // un nombre élevé au carré ne dépasse pas 10, soit un carré d'au plus 100

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

const PROBA_CHANGEMENT_TYPE = 2 / 3;
let dernierTypeEquation = null;

/** D'une équation à la suivante, le type change avec la probabilité PROBA_CHANGEMENT_TYPE. */
function piocherTypeEquation(selection) {
  const dispo = (selection && selection.length > 0) ? selection : TYPES_EQUATION.map(t => t.id);
  const autres = dispo.filter(id => id !== dernierTypeEquation);

  const garder = autres.length < dispo.length
    && (autres.length === 0 || Math.random() >= PROBA_CHANGEMENT_TYPE);
  if (!garder) dernierTypeEquation = choisirParmi(autres);
  return dernierTypeEquation;
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

  const typeEq = piocherTypeEquation(typesEquation);
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

    case "DifferenceParentheses": {
      // (ax+b)-(cx+d)=0 : tirer a != c et b -> déduire d = (a-c)*xSol+b.
      const TENTATIVES_MAX = 2000;
      let a, b, c, d, valable, ideal;
      let tentatives = 0;
      do {
        a = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 9 });
        c = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 9 });
        b = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 15 });
        d = simplifie(a.sub(c).mul(xSol).add(b));

        valable = !a.equal(c) && d.valeurNum.a !== 0 && (coefficientsNegatifs || d.valeurNum.a > 0);
        ideal = typeNb !== "Entiers"
          || (d.isEntier() && Math.abs(d.valeurNum.a / d.valeurNum.b) <= 40);
        tentatives++;
      } while (!(valable && (ideal || tentatives >= TENTATIVES_MAX)));

      return {
        lhs: `(${formatTerme(a, 1)}${formatTerme(b, 0, true)})-(${formatTerme(c, 1)}${formatTerme(d, 0, true)})`,
        rhs: "0",
        xSol, typeEq, typeNb, typeSol
      };
    }

    case "DeuxQuotients": {
      // (ax+b):u=(cx+d):v : tirer u != v, a, b, c -> déduire d = (a*xSol+b)*v/u - c*xSol.
      // On écarte a/u = c/v (x disparaîtrait) et d = 0. En "Entiers", on retire
      // jusqu'à obtenir un d entier raisonnable ; après TENTATIVES_MAX essais,
      // on accepte un d fractionnaire plutôt que de boucler.
      const TENTATIVES_MAX = 2000;
      let a, b, c, d, u, v, valable, ideal;
      let tentatives = 0;
      do {
        const nu = tirerEntier(2, 6);
        let nv;
        do { nv = tirerEntier(2, 6); } while (nv === nu);
        u = Nombre.fromParts(nu, 1, "entier");
        v = Nombre.fromParts(nv, 1, "entier");

        a = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 9 });
        b = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 15 });
        c = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 9 });
        d = simplifie(a.mul(xSol).add(b).mul(v).div(u).sub(c.mul(xSol)));

        valable = !a.mul(v).equal(c.mul(u)) && d.valeurNum.a !== 0;
        ideal = typeNb !== "Entiers"
          || (d.isEntier() && Math.abs(d.valeurNum.a / d.valeurNum.b) <= 40);
        tentatives++;
      } while (!(valable && (ideal || tentatives >= TENTATIVES_MAX)));

      const gauche = formatTerme(a, 1) + formatTerme(b, 0, true);
      const droite = formatTerme(c, 1) + formatTerme(d, 0, true);
      return {
        lhs: `(${gauche}):${simplifie(u).toString()}`,
        rhs: `(${droite}):${simplifie(v).toString()}`,
        xSol, typeEq, typeNb, typeSol
      };
    }

    case "ProduitNul": {
      // (ax+b)(cx+d)=0 : deux racines distinctes non nulles, chaque facteur s'écrit a(x-r).
      const [x1, x2] = tirerDeuxRacines(typeSol, solutionNegative);
      const ecrire = (r) => ecrireFacteurDeRacine(r, typeNb, coeffOpts);
      return { lhs: `(${ecrire(x1)})(${ecrire(x2)})`, rhs: "0", xSol: x1, solutions: [x1, x2], typeEq, typeNb, typeSol };
    }

    case "ProduitConstante": {
      // (ax+b)(cx+d)=bd : en développant, bd s'élimine ; solutions 0 et r = -(ad+bc)/(ac).
      // b et d sont signés, sans quoi r serait toujours négative avec a et c positifs.
      const TENTATIVES_MAX = 5000;
      const zero = Nombre.fromParts(0, 1, "entier");
      let a, b, c, d, r, valable, ideal;
      let tentatives = 0;
      do {
        a = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 6 });
        c = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 6 });
        b = tirerCoefficient(typeNb, { ...coeffOpts, coefficientsNegatifs: true, min: 1, max: 9 });
        d = tirerCoefficient(typeNb, { ...coeffOpts, coefficientsNegatifs: true, min: 1, max: 9 });
        r = simplifie(zero.sub(a.mul(d).add(b.mul(c))).div(a.mul(c)));

        valable = r.valeurNum.a !== 0 && (solutionNegative || r.valeurNum.a > 0);
        ideal = r.isEntier() === (typeSol === "entier");
        tentatives++;
      } while (!(valable && (ideal || tentatives >= TENTATIVES_MAX)));

      return {
        lhs: `(${formatTerme(a, 1)}${formatTerme(b, 0, true)})(${formatTerme(c, 1)}${formatTerme(d, 0, true)})`,
        rhs: simplifie(b.mul(d)).toString(),
        xSol: zero, solutions: [zero, r], typeEq, typeNb, typeSol
      };
    }

    case "CarreEgalNombre": {
      // x²=a : a est le carré d'une racine r > 0, solutions r et -r. En "Entiers", r est
      // entière quel que soit le type de solution, sinon a serait fractionnaire.
      const typeRacine = typeNb === "Entiers" ? "entier" : typeSol;
      let r;
      do {
        r = simplifie(tirerSolution(typeRacine, false));
      } while (r.valeurNum.a === 0 || !carresSousLimite([r]));

      const oppose = simplifie(Nombre.fromParts(0, 1, "entier").sub(r));
      return { lhs: "x^2", rhs: simplifie(r.mul(r)).toString(), xSol: r, solutions: [r, oppose], typeEq, typeNb, typeSol };
    }

    case "CarreX": {
      // ax²=bx : solutions 0 et r, avec b = a*r. En "Entiers", a est un multiple du dénominateur de r.
      const [r] = tirerDeuxRacines(typeSol, solutionNegative);
      const q = r.valeurNum.b;
      const a = (typeNb === "Entiers")
        ? Nombre.fromParts(tirerSigne(coefficientsNegatifs) * q * tirerEntier(q > 1 ? 1 : 2, Math.floor(9 / q)), 1, "entier")
        : tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 9 });
      const zero = Nombre.fromParts(0, 1, "entier");
      return { lhs: formatTerme(a, 2), rhs: formatTerme(a.mul(r), 1), xSol: zero, solutions: [zero, r], typeEq, typeNb, typeSol };
    }

    case "CarreNombre": {
      // (ax+b)²=c² : ax+b vaut c en x1 et -c en x2, d'où c = a(x1-x2)/2 et b = -a(x1+x2)/2.
      const TENTATIVES_MAX = 5000;
      const zero = Nombre.fromParts(0, 1, "entier");
      const deux = Nombre.fromParts(2, 1, "entier");
      let x1, x2, a, b, c, valable, ideal;
      let tentatives = 0;
      do {
        [x1, x2] = tirerDeuxRacines(typeSol, solutionNegative);
        a = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 6 });
        c = simplifie(a.mul(x1.sub(x2)).div(deux));
        if (c.valeurNum.a < 0) c = simplifie(zero.sub(c));
        b = simplifie(zero.sub(a.mul(x1.add(x2)).div(deux)));

        valable = b.valeurNum.a !== 0;
        ideal = carresSousLimite([b, c]) && (typeNb !== "Entiers" || (b.isEntier() && c.isEntier()));
        tentatives++;
      } while (!(valable && (ideal || tentatives >= TENTATIVES_MAX)));

      return {
        lhs: `(${formatTerme(a, 1)}${formatTerme(b, 0, true)})^2`,
        rhs: simplifie(c.mul(c)).toString(),
        xSol: x1, solutions: [x1, x2], typeEq, typeNb, typeSol
      };
    }

    case "DeuxCarres": {
      // A²=B² : on part de P = A-B de racine x1 et Q = A+B de racine x2, d'où
      // A = (P+Q)/2 et B = (Q-P)/2. On écarte les cas où A ou B perd son terme
      // en x ou sa constante, et en "Entiers" on retire jusqu'à des coefficients entiers.
      const TENTATIVES_MAX = 5000;
      const zero = Nombre.fromParts(0, 1, "entier");
      const deux = Nombre.fromParts(2, 1, "entier");
      let x1, x2, a, b, c, d, valable, ideal;
      let tentatives = 0;
      do {
        [x1, x2] = tirerDeuxRacines(typeSol, solutionNegative);
        // En "Entiers", une pente multiple du dénominateur de la racine garantit une constante entière.
        const tirerPente = (r) => (typeNb === "Entiers")
          ? Nombre.fromParts(tirerSigne(coefficientsNegatifs) * r.valeurNum.b * tirerEntier(1, Math.ceil(12 / r.valeurNum.b)), 1, "entier")
          : tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 12 });
        const p = tirerPente(x1);
        const q = tirerPente(x2);
        const pc = zero.sub(p.mul(x1));
        const qc = zero.sub(q.mul(x2));

        a = simplifie(p.add(q).div(deux));
        b = simplifie(pc.add(qc).div(deux));
        c = simplifie(q.sub(p).div(deux));
        d = simplifie(qc.sub(pc).div(deux));

        valable = [a, b, c, d].every(n => n.valeurNum.a !== 0)
          && (coefficientsNegatifs || (a.valeurNum.a > 0 && c.valeurNum.a > 0));
        ideal = carresSousLimite([a, b, c, d]) && (typeNb !== "Entiers" || [a, b, c, d].every(n => n.isEntier()));
        tentatives++;
      } while (!(valable && (ideal || tentatives >= TENTATIVES_MAX)));

      return {
        lhs: `(${formatTerme(a, 1)}${formatTerme(b, 0, true)})^2`,
        rhs: `(${formatTerme(c, 1)}${formatTerme(d, 0, true)})^2`,
        xSol: x1, solutions: [x1, x2], typeEq, typeNb, typeSol
      };
    }

    case "FacteurCommun": {
      // A×B=A×C : A s'annule en x1 (A vaut parfois x seul, alors x1 = 0) ;
      // B=cx+d et C=ex+f sont égaux en x2, d'où f = c*x2+d-e*x2.
      const TENTATIVES_MAX = 5000;
      const zero = Nombre.fromParts(0, 1, "entier");
      const [r1, x2] = tirerDeuxRacines(typeSol, solutionNegative);
      const facteurX = Math.random() < 0.3;
      const x1 = facteurX ? zero : r1;
      const commun = facteurX ? "x" : `(${ecrireFacteurDeRacine(x1, typeNb, coeffOpts)})`;

      let c, d, e, f, valable, ideal;
      let tentatives = 0;
      do {
        c = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 9 });
        d = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 15 });
        e = tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 9 });
        f = simplifie(c.mul(x2).add(d).sub(e.mul(x2)));

        valable = !c.equal(e) && f.valeurNum.a !== 0;
        ideal = typeNb !== "Entiers"
          || (f.isEntier() && Math.abs(f.valeurNum.a / f.valeurNum.b) <= 40);
        tentatives++;
      } while (!(valable && (ideal || tentatives >= TENTATIVES_MAX)));

      return {
        lhs: `${commun}(${formatTerme(c, 1)}${formatTerme(d, 0, true)})`,
        rhs: `${commun}(${formatTerme(e, 1)}${formatTerme(f, 0, true)})`,
        xSol: x1, solutions: [x1, x2], typeEq, typeNb, typeSol
      };
    }

    default:
      throw new Error("Type d'équation inconnu : " + typeEq);
  }
}

/** Vrai si le numérateur et le dénominateur de chaque nombre ont un carré d'au plus 100. */
function carresSousLimite(nombres) {
  return nombres.every(n => Math.abs(n.valeurNum.a) <= CARRE_RACINE_MAX && n.valeurNum.b <= CARRE_RACINE_MAX);
}

/** Deux racines distinctes et non nulles, selon le type de solution demandé. */
function tirerDeuxRacines(typeSol, solutionNegative) {
  const tirer = () => {
    let r;
    do { r = simplifie(tirerSolution(typeSol, solutionNegative)); } while (r.valeurNum.a === 0);
    return r;
  };
  const x1 = tirer();
  let x2;
  do { x2 = tirer(); } while (x2.equal(x1));
  return [x1, x2];
}

/** Écrit un facteur a(x-r) développé. En "Entiers", a est un multiple du dénominateur de r. */
function ecrireFacteurDeRacine(r, typeNb, coeffOpts) {
  const q = r.valeurNum.b;
  const a = (typeNb === "Entiers")
    ? Nombre.fromParts(tirerSigne(coeffOpts.coefficientsNegatifs) * q * tirerEntier(1, q > 1 ? 1 : 3), 1, "entier")
    : tirerCoefficient(typeNb, { ...coeffOpts, min: 1, max: 9 });
  return formatTerme(a, 1) + formatTerme(Nombre.fromParts(0, 1, "entier").sub(a.mul(r)), 0, true);
}

/**
 * Racines d'un Polynome de degré 2 à coefficients rationnels : tableau de
 * Nombre (1 si racine double, 2 sinon), ou null si elles ne sont pas rationnelles.
 */
function racinesRationnelles(poly) {
  const [a, b, c] = [2, 1, 0].map(d => poly.coeff(d).simplify().valeurNum);
  const pgcd = (m, n) => n === 0 ? Math.abs(m) : pgcd(n, m % n);
  const ppcm = (m, n) => m * n / pgcd(m, n);

  const den = ppcm(ppcm(a.b, b.b), c.b);
  const A = a.a * den / a.b;
  const B = b.a * den / b.b;
  const C = c.a * den / c.b;
  if (A === 0) return null;

  const delta = B * B - 4 * A * C;
  const s = Math.round(Math.sqrt(Math.max(delta, 0)));
  if (delta < 0 || s * s !== delta) return null;

  const racine = (num) => {
    const signe = 2 * A < 0 ? -1 : 1;
    return Nombre.fromParts(signe * num, signe * 2 * A, "fraction").simplify();
  };
  return delta === 0 ? [racine(-B)] : [racine(-B - s), racine(-B + s)];
}

/** Simplifie un Nombre (réduit la fraction) avant de le formater. */
function simplifie(n) {
  return n.simplify();
}

/**
 * Formate un coefficient en terme texte ("3x", "-2/3x", "+5", "-7"...).
 * @param {Nombre} coeff
 * @param {number} degre - 2 pour le terme en x², 1 pour le terme en x, 0 pour la constante
 * @param {boolean} avecSignePourPositif - si true, préfixe "+" explicite quand positif (utile pour la concaténation après un premier terme)
 */
function formatTerme(coeffBrut, degre, avecSignePourPositif = false) {
  const coeff = simplifie(coeffBrut);
  const estNegatif = coeff.valeurNum.a < 0;
  const valeurAbs = estNegatif
    ? Nombre.fromParts(-coeff.valeurNum.a, coeff.valeurNum.b, coeff.typeEcriture)
    : coeff;
  const texte = valeurAbs.toString();
  const suffixe = degre === 2 ? "x^2" : degre === 1 ? "x" : "";

  // Coefficient 1 devant x (entier OU fraction valant exactement 1) : on écrit juste "x".
  const estUnSimple = degre >= 1 && texte === "1";
  const corps = estUnSimple ? suffixe : `${texte}${suffixe}`;

  if (estNegatif) return `-${corps}`;
  return avecSignePourPositif ? `+${corps}` : corps;
}
