/* ================================================================
   calculAsctucieux.js — calcul astucieux (associativité, commutativité,
   distributivité, produits proches d'un nombre rond ou à zéros)

   Port du moteur de calculAstucieux/CalculAstucieux.js (appli autonome) :
   chaque "type" pédagogique devient ici son propre exercice flash (son
   propre id), pour que tous les types soient effectivement tirables —
   auparavant ce fichier ne contenait que deux entrées quasi identiques
   (a*b+c*a+d*e), loin de couvrir toute la famille.

   Comme dans l'appli calculAstucieux : seule la valeur finale est
   vérifiée (pas de contrôle qu'une "astuce" particulière ait été
   utilisée) — l'astuce est dans la forme des nombres générés, pas dans
   une règle de réécriture imposée. Écriture systématiquement parenthésée
   pour tout produit inséré dans une somme (priorités opératoires pas
   supposées connues en sixième), exactement comme dans l'appli.
================================================================ */

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

// --- utilitaires ---
function randInt(a, b) { return Math.floor(Math.random() * (b - a + 1)) + a; }

function decimalPair() {
  const target = randInt(1, 4) * 10;
  const intA = randInt(1, target - 2);
  const t = randInt(1, 9) / 10;
  const a = parseFloat((intA + t).toFixed(1));
  const b = parseFloat((target - a).toFixed(1));
  return [a, b];
}

function integerPair() {
  const u = randInt(1, 9);
  const a = randInt(1, 4) * 10 + u;
  const b = randInt(1, 4) * 10 + (10 - u);
  return [a, b];
}

function subVars(expr, map) {
  return expr
    .replace(/\ba\b/g, map.a)
    .replace(/\bb\b/g, map.b)
    .replace(/\bc\b/g, map.c)
    .replace(/\bd\b/g, map.d);
}

const NOMBRES_RONDS_PRODUIT = [50, 100, 200, 500, 1000];

// --- parseur d'expression (+ − × ÷, parenthèses) → arbre {type:'NUM'|'op'} ---
// Même mécanisme que calculAstucieux/app.js : un nœud parenthésé dans le
// texte source est marqué explicitParens pour que le rendu LaTeX conserve
// ce regroupement, même quand les priorités usuelles ne l'exigeraient pas.
function tokeniser(expr) {
  const tokens = [];
  let i = 0;
  const n = expr.length;
  while (i < n) {
    const c = expr[i];
    if (c === "(" || c === ")") {
      tokens.push({ type: c === "(" ? "LPAREN" : "RPAREN" });
      i++;
      continue;
    }
    if ("+-*:".includes(c)) {
      tokens.push({ type: "OP", value: c });
      i++;
      continue;
    }
    if (/\d/.test(c) || c === "." || c === ",") {
      let num = "";
      let j = i;
      let vuSeparateur = false;
      while (j < n && (/\d/.test(expr[j]) || (!vuSeparateur && (expr[j] === "." || expr[j] === ",")))) {
        if (expr[j] === "." || expr[j] === ",") vuSeparateur = true;
        num += expr[j];
        j++;
      }
      tokens.push({ type: "NUM", value: num });
      i = j;
      continue;
    }
    throw new Error("Caractère inattendu dans l'expression générée : " + c);
  }
  return tokens;
}

function construireArbre(tokens) {
  let pos = 0;
  const peek = () => tokens[pos];
  const avance = () => tokens[pos++];

  function parseAdditif() {
    let gauche = parseMultiplicatif();
    while (peek() && peek().type === "OP" && (peek().value === "+" || peek().value === "-")) {
      const op = avance().value;
      const droite = parseMultiplicatif();
      gauche = { type: "op", op, gauche, droite };
    }
    return gauche;
  }

  function parseMultiplicatif() {
    let gauche = parseFacteur();
    while (peek() && peek().type === "OP" && (peek().value === "*" || peek().value === ":")) {
      const op = avance().value;
      const droite = parseFacteur();
      gauche = { type: "op", op, gauche, droite };
    }
    return gauche;
  }

  function parseFacteur() {
    const t = peek();
    if (t.type === "NUM") {
      avance();
      return { type: "NUM", nombre: new Nombre(t.value) };
    }
    if (t.type === "LPAREN") {
      avance();
      const inner = parseAdditif();
      avance(); // RPAREN
      if (inner.type === "op") inner.explicitParens = true;
      return inner;
    }
    throw new Error("Expression générée invalide (facteur attendu)");
  }

  const arbre = parseAdditif();
  return arbre;
}

function evaluer(noeud) {
  if (noeud.type === "NUM") return noeud.nombre;
  const g = evaluer(noeud.gauche);
  const d = evaluer(noeud.droite);
  switch (noeud.op) {
    case "+": return g.add(d);
    case "-": return g.sub(d);
    case "*": return g.mul(d);
    case ":": return g.div(d);
  }
}

function latexOp(op) {
  return op === "*" ? "\\times " : op === ":" ? "\\div " : op;
}

function prioriteOp(op) {
  return (op === "*" || op === ":") ? 2 : 1;
}

// Parenthésage systématique de tout changement d'opération (comme le
// réglage "sans priorités" de l'appli calculAstucieux, par défaut ici
// puisque flash cible aussi la sixième) : un produit inséré dans une
// somme est TOUJOURS parenthésé.
function rendreCote(noeud, prioParent, cote) {
  const texte = versLatex(noeud);
  if (noeud.type !== "op") return texte;
  const prioEnfant = prioriteOp(noeud.op);
  const besoinParens = noeud.explicitParens
    || prioEnfant !== prioParent
    || (cote === "droite" && prioEnfant === prioParent);
  return besoinParens ? `(${texte})` : texte;
}

function versLatex(noeud) {
  if (noeud.type === "NUM") return noeud.nombre.toLatex({ nombreAff: "canonique" });
  const prio = prioriteOp(noeud.op);
  const txtGauche = rendreCote(noeud.gauche, prio, "gauche");
  const txtDroite = rendreCote(noeud.droite, prio, "droite");
  return `${txtGauche}${latexOp(noeud.op)}${txtDroite}`;
}

// Construit {latexExpr, cible} à partir d'un texte d'expression généré.
function construireQuestion(texte) {
  const arbre = construireArbre(tokeniser(texte));
  return { latexExpr: versLatex(arbre), cible: evaluer(arbre) };
}

// --- moteur de génération d'un cas m (repris de calculAstucieux/CalculAstucieux.js) ---
// vMax=4 (plus bas que dans l'appli dédiée) : les cartes flash sont plus
// étroites qu'une capsule de réponse pleine page, mieux vaut une somme
// alternée courte qu'un débordement.
function genererTexte(m, avecDecimaux, vMax = 4) {
  const pair = avecDecimaux ? decimalPair : integerPair;
  const tirerV = () => randInt(3, Math.max(3, vMax));

  let a = 0, b = 0, c = 0, d = 0, v = 0;
  let quest = "";

  if (m === 1) {
    [a, b] = pair();
    c = 1;
    quest = "(a+b)+c";
  } else if (m === 2) {
    let a1, b1, a2, b2; [a1, b1] = pair(); [a2, b2] = pair();
    a = a1; b = b1; c = a2; d = b2;
    const t = randInt(1, 3);
    quest = (t === 1) ? "(a+c)+(b+d)" : (t === 2) ? "(c+a)+(b+d)" : "(a+c)+(d+b)";
  } else if (m === 3) {
    [a, b] = pair();
    v = tirerV();
    const lis = []; for (let i = 0; i < v; i++) { lis.push(a); lis.push(b); }
    quest = lis.join("+");
  } else if (m === 4) {
    // fusion des variantes "+c" et "+b" (c=b) de l'appli dédiée
    [a, b] = pair();
    v = tirerV();
    c = Math.random() < 0.5 ? randInt(3, 9) : b;
    const lis = []; for (let i = 0; i < v; i++) { lis.push(a); lis.push(b); }
    lis.push(c);
    quest = lis.join("+");
  } else if (m === 5) {
    const A = (randInt(1, 4) * 2 + 1) * 5;
    const B = randInt(1, 9);
    const C = 2;
    a = A; b = B; c = C;
    const u = randInt(1, 3);
    quest = (u === 1) ? "(a*b)*c" : (u === 2) ? "(a*c)*b" : "(c*b)*a";
  } else if (m === 6) {
    a = 25; b = 4; c = randInt(3, 15);
    const u = randInt(1, 4);
    quest = (u === 1) ? "(a*b)*c" : (u === 2) ? "(a*c)*b" : (u === 3) ? "(c*a)*b" : "b*(a*c)";
  } else if (m === 7) {
    a = 25; b = 4; c = randInt(1, 9); d = randInt(1, 9);
    const t = randInt(1, 3);
    quest = (t === 1) ? "(a*c)*(b*d)" : (t === 2) ? "(c*a)*(b*d)" : "(a*c)*(d*b)";
  } else if (m === 9) {
    // fusion des 4 permutations v*a+c+v*b de l'appli dédiée
    [a, b] = pair(); v = randInt(3, 7); c = randInt(5, 40);
    const variantes = [
      `${v}*a+${c}+${v}*b`,
      `${v}*a+${c}+b*${v}`,
      `c+${v}*a+b*${v}`,
      `${v}*a+b*${v}+${c}`,
    ];
    quest = variantes[randInt(0, variantes.length - 1)];
  } else if (m === 13) {
    const centre = NOMBRES_RONDS_PRODUIT[randInt(0, NOMBRES_RONDS_PRODUIT.length - 1)];
    const delta = [1, 2, -1, -2][randInt(0, 3)];
    v = randInt(2, 9);
    b = centre + delta;
    quest = `${v}*b`;
  } else if (m === 14) {
    let z1, z2;
    do {
      z1 = randInt(0, 2);
      z2 = randInt(0, 2);
    } while (z1 + z2 === 0 || z1 + z2 > 3);
    a = randInt(2, 9) * 10 ** z1;
    b = randInt(2, 9) * 10 ** z2;
    quest = "a*b";
  }

  const map = { a, b, c: c === undefined ? 0 : c, d };
  let texte = subVars(quest, map);

  // Repli si trop long (m=3,4 : sommes alternées) : forme représentative
  // plus courte — même seuil resserré que la fiche papier de l'appli
  // dédiée (une carte flash est étroite).
  if (texte.length > 28) {
    if (m === 3) texte = subVars("a+b+a+b", map);
    else if (m === 4) texte = subVars("a+b+a+c", map);
  }

  return texte;
}

// decimal (bool) : contrôle à la fois la GÉNÉRATION (compléments décimaux
// dans les paires plutôt qu'entiers, voir genererTexte) et l'ÉLIGIBILITÉ
// (tag decimal:"oui", filtré par le bouton "Avec décimaux" du panneau
// latéral — voir decimalEligible dans engine.js). Absent/false → toujours
// éligible, comme negatif/fraction (voir engine.js).
function exoAstucieux(id, m, { decimal = false } = {}) {
  return {
    id: `calcul-astucieux-${id}`,
    theme: "calcul-astucieux",
    niveau: "6",
    ...(decimal ? { decimal: "oui" } : {}),
    gen() {
      const texte = genererTexte(m, decimal);
      const { latexExpr, cible } = construireQuestion(texte);

      return {
        latex: `
        \\text{Calculer astucieusement :}\\\\[4pt]
        \\,\\,${latexExpr}
        `,
        correction: `
        ${latexExpr} = ${cible.toLatex()}
        `,
        verifier(input) {
          const attendu = new Grandeur(cible, {});
          return reponse.verifier("grandeur", attendu, input);
        }
      };
    }
  };
}

// Les types additifs (1,2,3,4,9) existent en deux variantes, entiers
// (toujours éligible) et décimaux (tag decimal:"oui", derrière le bouton
// "Avec décimaux") — les types multiplicatifs (5,6,7,13,14) restent
// entiers dans tous les cas (l'astuce y est ×10/×100/proximité d'un
// nombre rond, pas le complément décimal), pas de variante décimale.
const calcul = [
  exoAstucieux("assoc-somme-entiers", 1),
  exoAstucieux("assoc-somme-decimaux", 1, { decimal: true }),
  exoAstucieux("double-assoc-somme-entiers", 2),
  exoAstucieux("double-assoc-somme-decimaux", 2, { decimal: true }),
  exoAstucieux("somme-alternee-entiers", 3),
  exoAstucieux("somme-alternee-decimaux", 3, { decimal: true }),
  exoAstucieux("somme-alternee-plus-c-entiers", 4),
  exoAstucieux("somme-alternee-plus-c-decimaux", 4, { decimal: true }),
  exoAstucieux("distributivite-facteur-commun-entiers", 9),
  exoAstucieux("distributivite-facteur-commun-decimaux", 9, { decimal: true }),
  exoAstucieux("assoc-produit", 5),
  exoAstucieux("25x4", 6),
  exoAstucieux("25x4-double", 7),
  exoAstucieux("produit-nombre-rond", 13),
  exoAstucieux("produit-zeros", 14),
];

export default calcul;
