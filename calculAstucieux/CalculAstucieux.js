// CalculAstucieux.js — génération d'expressions "à calculer astucieusement"
// (associativité, commutativité, distributivité), sur le modèle de
// arbreCalcul/Arbre.js : on ne produit ici qu'un TEXTE d'expression (+ − ×
// ÷, parenthésé explicitement pour préserver le regroupement qui porte
// l'astuce), jamais un arbre déjà résolu — c'est app.js (comme dans
// arbreCalcul) qui le parse et calcule la cible via Nombre. Aucune
// vérification symbolique ici : comme dans arbreCalcul, seule la valeur
// finale compte, l'"astuce" tient entièrement dans la forme des nombres
// générés (compléments à 10, faits de table ×25×4, etc.), pas dans une
// règle de réécriture imposée.

// --- utilitaires ---
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

// --- paires de nombres ---
// Fabrique une paire décimale (a,b) dont la somme est un multiple de 10
// Exemple : 2.3 + 7.7 = 10   ou   12.4 + 7.6 = 20
function decimalPair() {
  const target = randInt(1, 4) * 10;
  const intA = randInt(1, target - 2);
  const t = randInt(1, 9) / 10;
  const a = parseFloat((intA + t).toFixed(1));
  const b = parseFloat((target - a).toFixed(1));
  return [a, b];
}

function integerPair() {
  // unités complémentaires à 10, sur des dizaines 10..40
  const u = randInt(1, 9);
  const a = randInt(1, 4) * 10 + u;
  const b = randInt(1, 4) * 10 + (10 - u);
  return [a, b];
}

// --- substitution robuste : \b(a|b|c|d)\b ---
function subVars(expr, map) {
  return expr
    .replace(/\ba\b/g, map.a)
    .replace(/\bb\b/g, map.b)
    .replace(/\bc\b/g, map.c)
    .replace(/\bd\b/g, map.d);
}

// --- familles d'astuces exposées au panneau latéral ---
// Deux bascules INDÉPENDANTES (pas un choix exclusif, pas de "Tous" séparé
// — les activer toutes les deux revient déjà à "tous") — voir
// construireBoutonsFamille dans app.js, qui refuse le clic qui
// désactiverait la dernière restante.
const FAMILLES_ASTUCE = {
  sommes: { label: "Sommes", pool: [1, 2, 3, 4, 8, 9, 10, 11, 12] },
  produits: { label: "Produits", pool: [5, 6, 7, 13, 14] },
};

// Nombres ronds utilisés comme repère pour m=13 (produit proche d'un
// nombre rond, ex. 7×99 ~ 7×100).
const NOMBRES_RONDS_PRODUIT = [50, 100, 200, 500, 1000];

// --- moteur de génération d'un cas m ---
// avecDecimaux ne joue que sur les familles additives (m<=4,8..12) : les
// produits (m=5..7) restent entiers dans tous les cas, l'astuce y étant
// ×10/×100 plutôt que le complément décimal.
// vMax borne le nombre de répétitions dans les sommes alternées (m=3,4,8) —
// par défaut 7 (variété maximale en jeu), mais la fiche papier appelle avec
// une valeur basse (voir app.js) pour éviter les expressions à rallonge du
// type "31+19+31+19+31+19+...", peu lisibles/agréables sur papier.
function calcul(m, avecDecimaux, vMax = 7) {
  const pair = avecDecimaux ? decimalPair : integerPair;
  const tirerV = () => randInt(3, Math.max(3, vMax));

  let a = 0, b = 0, c = 0, d = 0, v = 0;
  let quest = "";

  if (m === 1) {
    // (a+b)+c -> (a+c)+b (assoc) ; a,b décimaux simples ; c=1
    [a, b] = pair();
    c = 1;
    quest = "(a+b)+c";
  } else if (m === 2) {
    // (a+c)+(b+d) → (a+b)+(c+d) ; a,b et c,d sont deux paires (même type)
    let a1, b1, a2, b2; [a1, b1] = pair(); [a2, b2] = pair();
    a = a1; b = b1; c = a2; d = b2;
    const t = randInt(1, 3);
    quest = (t === 1) ? "(a+c)+(b+d)" : (t === 2) ? "(c+a)+(b+d)" : "(a+c)+(d+b)";
  } else if (m === 3) {
    // somme alternée → v*(a+b)
    [a, b] = pair();
    v = tirerV();
    const lis = []; for (let i = 0; i < v; i++) { lis.push(a); lis.push(b); }
    quest = lis.join("+");
  } else if (m === 4) {
    // somme alternée + c → v*(a+b)+c avec c entier 3..9
    [a, b] = pair();
    v = tirerV();
    c = randInt(3, 9);
    const lis = []; for (let i = 0; i < v; i++) { lis.push(a); lis.push(b); }
    lis.push(c);
    quest = lis.join("+");
  } else if (m === 5) {
    // (a*b)*c -> (a*c)*b ; tout entier pour rester "astuce ×10"
    const A = (randInt(1, 4) * 2 + 1) * 5;
    const B = randInt(1, 9);
    const C = 2;
    a = A; b = B; c = C;
    const u = randInt(1, 3);
    quest = (u === 1) ? "(a*b)*c" : (u === 2) ? "(a*c)*b" : "(c*b)*a";
  } else if (m === 6) {
    // 25×4×c -> (25×4)×c
    a = 25; b = 4; c = randInt(3, 15);
    const u = randInt(1, 4);
    quest = (u === 1) ? "(a*b)*c" : (u === 2) ? "(a*c)*b" : (u === 3) ? "(c*a)*b" : "b*(a*c)";
  } else if (m === 7) {
    // (a*c)*(b*d) → (a*b)*(c*d)
    a = 25; b = 4; c = randInt(1, 9); d = randInt(1, 9);
    const t = randInt(1, 3);
    quest = (t === 1) ? "(a*c)*(b*d)" : (t === 2) ? "(c*a)*(b*d)" : "(a*c)*(d*b)";
  } else if (m === 13) {
    // v×(nombre rond ± 1 ou 2) — ex. 7×99, 6×49, 4×199 : l'astuce est de
    // passer par le nombre rond voisin (7×100−7, 6×50−6×1, ...) plutôt que
    // de poser la multiplication. Pas de parenthèses ici : quest est déjà
    // un unique facteur numérique, l'astuce elle-même (le passage par la
    // soustraction) reste à trouver par l'élève, pas donnée dans l'énoncé.
    const centre = NOMBRES_RONDS_PRODUIT[randInt(0, NOMBRES_RONDS_PRODUIT.length - 1)];
    const delta = [1, 2, -1, -2][randInt(0, 3)];
    v = randInt(2, 9);
    b = centre + delta;
    quest = `${v}*b`;
  } else if (m === 14) {
    // produit de deux nombres à zéros — ex. 3×60, 30×40, 50×600 : l'astuce
    // est de multiplier les chiffres significatifs puis de recoller les
    // zéros (3×6×10, 3×4×100, 5×6×1000...). z1+z2<=3 pour ne pas dépasser
    // des produits à 5-6 chiffres.
    let z1, z2;
    do {
      z1 = randInt(0, 2);
      z2 = randInt(0, 2);
    } while (z1 + z2 === 0 || z1 + z2 > 3);
    a = randInt(2, 9) * 10 ** z1;
    b = randInt(2, 9) * 10 ** z2;
    quest = "a*b";
  } else if (m === 8) {
    // comme m=4 mais c=b
    [a, b] = pair();
    v = tirerV();
    c = b;
    const lis = []; for (let i = 0; i < v; i++) { lis.push(a); lis.push(b); }
    lis.push(c);
    quest = lis.join("+");
  } else if (m === 9) {
    // v*a + c + v*b → v*(a+b)+c ; c entier 5..40
    [a, b] = pair(); v = randInt(3, 7); c = randInt(5, 40);
    quest = `${v}*a+${c}+${v}*b`;
  } else if (m === 10) {
    // v*a + c + b*v → v*(a+b)+c
    [a, b] = pair(); v = randInt(3, 7); c = randInt(5, 40);
    quest = `${v}*a+${c}+b*${v}`;
  } else if (m === 11) {
    // c + v*a + b*v → v*(a+b)+c
    [a, b] = pair(); v = randInt(3, 7); c = randInt(5, 40);
    quest = `c+${v}*a+b*${v}`;
  } else if (m === 12) {
    // v*a + b*v + c → v*(a+b)+c
    [a, b] = pair(); v = randInt(3, 7); c = randInt(5, 40);
    quest = `${v}*a+b*${v}+${c}`;
  }

  const map = { a, b, c, d };
  let questText = subVars(quest, map);

  // Repli si trop long (m=3,4,8 s'y prêtent) : forme représentative plus
  // courte plutôt que la somme alternée complète. m=3 n'a pas de c (0 par
  // défaut) : lui donner deux paires (a+b) plutôt qu'un "+c" fantôme qui
  // ajouterait un terme nul. m=4/m=8 ont déjà leur c dans "a+b+a+c" : ne
  // pas l'ajouter une seconde fois.
  // Seuil volontairement bas (pas 50) : la capsule d'énoncé doit TENIR sans
  // ascenseur horizontal, jamais y recourir — voir app.js (pas de wrap
  // possible sur une formule LaTeX rendue en SVG, donc mieux vaut une
  // expression plus courte qu'un débordement).
  if (questText.length > 32) {
    if (m === 3) {
      questText = subVars("a+b+a+b", map);
    } else if (m === 4 || m === 8) {
      questText = subVars("a+b+a+c", map);
    } else if ([9, 10, 11, 12].includes(m)) {
      questText = subVars("a*b+a*c" + (m >= 10 ? "+c" : ""), map);
    }
  }

  return questText;
}

// Tire une famille et une variante au hasard dedans, renvoie le texte de
// l'expression donnée (à parser et évaluer côté app.js, comme
// tirerArbreEtCible le fait pour l'arbre dans arbreCalcul).
// famillesActives : tableau de clés de FAMILLES_ASTUCE actuellement
// activées (une ou les deux) — leurs pools sont simplement concaténés.
function genererCalculAstucieux(famillesActives, avecDecimaux, vMax = 7) {
  const cles = famillesActives.filter(cle => FAMILLES_ASTUCE[cle]);
  const pool = (cles.length ? cles : ["sommes"]).flatMap(cle => FAMILLES_ASTUCE[cle].pool);
  const m = pool[Math.floor(Math.random() * pool.length)];
  return calcul(m, avecDecimaux, vMax);
}

window.FAMILLES_ASTUCE = FAMILLES_ASTUCE;
window.genererCalculAstucieux = genererCalculAstucieux;
