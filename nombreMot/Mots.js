// Mots.js — nombre entier <-> mot français <-> expression des "mots-simples"
// Porté depuis appli-maths/nombreMot/Enonce.js (dico, getMot, getNombre) :
// même logique, réutilisée telle quelle comme brique de génération des jetons.

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

// Reconstruit une expression numérique ("4*20+16") à partir du mot composé,
// en respectant la structure multiplicative/additive de l'écriture française.
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

// Décompose n en { n, mot, expr, jetons } où jetons est la liste (dans
// l'ordre d'apparition) des nombres-mots-simples composant l'écriture de n,
// et expr l'expression canonique ("4*20+16") qui les relie.
function decomposerNombre(n) {
  const mot = getMot(n);
  if (!mot) return null;
  const expr = getNombre(mot);
  const jetons = (expr.match(/\d+/g) || []).map(Number);
  const nbOperations = jetons.length - 1;
  return { n, mot, expr, jetons, nbOperations };
}

// ---------- Génération directe par les mots (plutôt que par balayage) ----------
//
// Au lieu de balayer une plage de nombres et de regarder après coup lesquels
// ont le bon nombre de jetons (biaisé, et borné artificiellement en
// magnitude — voir historique), on part des JETONS eux-mêmes : on choisit
// nbJetonsRequis valeurs du dico, on construit tous les mots que ces jetons
// peuvent former (permutations, plus les variantes de pluriel/liaison —
// "quatre-vingts", "vingt-et-un"), et pour chacun on vérifie qu'il "passe"
// getNombre ET qu'il est bien le mot CANONIQUE de sa propre valeur (round-
// trip via getMot) — sinon ce n'est pas un vrai mot français, juste une
// combinaison de jetons dans un ordre qui ne se dit pas. Aucune borne
// numérique n'est nécessaire : un mot comme "trois-cent-mille" (300 000)
// est trouvé aussi naturellement qu'un petit nombre.

const VALEURS_DICO = Object.values(dico).filter(v => v > 0);

function permutations(arr) {
  if (arr.length <= 1) return [arr];
  const vues = new Set();
  const resultat = [];
  for (let i = 0; i < arr.length; i++) {
    if (vues.has(arr[i])) continue; // évite les doublons de permutation quand un jeton se répète
    vues.add(arr[i]);
    const reste = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const suite of permutations(reste)) {
      resultat.push([arr[i], ...suite]);
    }
  }
  return resultat;
}

// Variantes orthographiques d'une permutation de jetons : le "s" final de
// "cent"/"vingt" quand il n'y a rien après (multiple exact : 300, 80...),
// et le "-et-" de "vingt-et-un" (21, 31... 71) quand un 1 suit un multiple
// de dix entre 20 et 60.
function variantesMot(motsJetons) {
  const variantes = [motsJetons.join("-")];

  const dernier = motsJetons[motsJetons.length - 1];
  if (dernier === "cent" || dernier === "vingt") {
    variantes.push(motsJetons.slice(0, -1).concat(dernier + "s").join("-"));
  }

  for (let i = 1; i < motsJetons.length; i++) {
    if (motsJetons[i] !== "un") continue;
    const precedent = dico[motsJetons[i - 1]];
    if (precedent >= 20 && precedent <= 60 && precedent % 10 === 0) {
      const avecEt = motsJetons.slice();
      avecEt[i] = "et-un";
      variantes.push(avecEt.join("-"));
    }
  }

  return variantes;
}

// Évalue une expression "canonique" (chiffres, +, *, parenthèses — jamais
// rien d'autre : produite par getNombre) pour retrouver la valeur n.
function evaluerExpr(expr) {
  return Function('"use strict"; return (' + expr + ');')();
}

// Construit la famille de TOUS les nombres-mots valides que ce jeu de
// jetons peut former (souvent un seul, parfois plusieurs — voir
// exemple {1000,3,100} → 1103, 1300, 3100, 100003, 103000, 300000).
function motsPossiblesPourJetons(jetons) {
  const motsVus = new Set();
  const resultats = [];

  for (const perm of permutations(jetons)) {
    const motsJetons = perm.map(v => dicoinv[v]);
    for (const mot of variantesMot(motsJetons)) {
      if (motsVus.has(mot)) continue;
      motsVus.add(mot);

      let expr;
      try { expr = getNombre(mot); } catch (e) { continue; }
      const n = evaluerExpr(expr);
      if (!Number.isInteger(n) || n <= 0) continue;

      // Vérification round-trip : mot doit être LE mot officiel de n,
      // pas juste une combinaison de jetons qui "parse" mécaniquement.
      if (getMot(n) !== mot) continue;

      const jetonsExtraits = (expr.match(/\d+/g) || []).map(Number);
      if (jetonsExtraits.length !== jetons.length) continue;

      resultats.push({ n, mot, expr, jetons: jetonsExtraits });
    }
  }
  return resultats;
}

function tirerJetonsAleatoires(nbJetons) {
  const jetons = [];
  for (let i = 0; i < nbJetons; i++) {
    jetons.push(VALEURS_DICO[Math.floor(Math.random() * VALEURS_DICO.length)]);
  }
  return jetons;
}

// Tire au hasard un nombre dont la décomposition en mots-simples utilise
// exactement nbJetonsRequis jetons — donc (nbJetonsRequis - 1) opérations
// pour reconstituer le nombre canoniquement. essaisMax : nombre de jeux de
// jetons tirés au hasard avant d'abandonner (un jeu de jetons pris au
// hasard ne correspond pas toujours à un mot français valide).
// État conservé d'un tirage à l'autre, par nombre de jetons : la dernière
// famille trouvée (pour pouvoir y repiocher directement) et le dernier
// nombre choisi dedans (pour ne pas retomber dessus).
const derniereFamilleParNbJetons = {};
const dernierChoixParNbJetons = {};

function tirerNombreParJetons(nbJetonsRequis, essaisMax = 300) {
  const derniereFamille = derniereFamilleParNbJetons[nbJetonsRequis];

  // Une fois sur deux, si on a déjà une famille en mémoire pour ce mode, on
  // repioche directement dedans plutôt que de relancer un tirage complet
  // (jetons + recherche de mots) — moins coûteux, et ça permet de revenir
  // naturellement sur les "jumeaux" d'une famille déjà rencontrée.
  if (derniereFamille && derniereFamille.length > 0 && Math.random() < 0.5) {
    const dernierChoix = dernierChoixParNbJetons[nbJetonsRequis];
    const options = derniereFamille.length > 1
      ? derniereFamille.filter(d => d.n !== dernierChoix)
      : derniereFamille;
    const choix = options[Math.floor(Math.random() * options.length)];
    dernierChoixParNbJetons[nbJetonsRequis] = choix.n;
    return choix;
  }

  for (let essai = 0; essai < essaisMax; essai++) {
    const jetons = tirerJetonsAleatoires(nbJetonsRequis);
    const famille = motsPossiblesPourJetons(jetons);
    if (famille.length > 0) {
      const choix = famille[Math.floor(Math.random() * famille.length)];
      derniereFamilleParNbJetons[nbJetonsRequis] = famille;
      dernierChoixParNbJetons[nbJetonsRequis] = choix.n;
      return choix;
    }
  }
  return null;
}

window.getMot = getMot;
window.getNombre = getNombre;
window.decomposerNombre = decomposerNombre;
window.tirerNombreParJetons = tirerNombreParJetons;
window.motsPossiblesPourJetons = motsPossiblesPourJetons;
