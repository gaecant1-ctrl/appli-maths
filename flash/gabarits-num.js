/* ================================================================
   gabarits-num.js — moteur de gabarits pour calcul-num (flash)

   Port du moteur de gabarits taggés de calcul-prioritaire/app.js
   ("[niveaux,types] motif | directives"), adapté à flash :
     - niveaux flash ("6","5","4", sans le suffixe "e")
     - deux types de nombres seulement : "entier" et "decimal" (jamais de
       fraction affichée dans flash) — cf. expr-num.js pour l'évaluateur.
     - un motif ne contient plus jamais l'opérateur fraction "/" : au lieu
       d'écrire "a/10" dans le motif (division par une puissance de dix,
       gérée par l'opérateur fraction de la référence), on tague la LETTRE
       elle-même comme "décimale" via la directive dec(lettre, échelle) —
       le moteur pioche alors un entier comme d'habitude (intervalle/parmi)
       puis le FORMATE en écriture décimale à la substitution
       ("7" → "0.7" pour échelle 10, "0.07" pour échelle 100), sans jamais
       passer par une division. decParmi(lettre, e1, e2, ...) fait la même
       chose mais tire l'échelle au hasard parmi la liste à chaque
       génération (porte le motif "a/d" de la référence, où le diviseur
       lui-même était aléatoire parmi {1,10,100}).
================================================================ */

'use strict';

import { evalNum, parseNum } from "./expr-num.js";

const NIVEAUX_CONNUS = ['6', '5', '4'];
const TYPES_CONNUS = ['entier', 'decimal'];
const NOMS_GENERATEURS = ['intervalle', 'parmi', 'parmiDiviseur'];

/* ---------- règles de validation (portées telles quelles) ---------- */

function valeurArgRegle(arg, dictionnaire) {
  if (Object.prototype.hasOwnProperty.call(dictionnaire, arg)) {
    return dictionnaire[arg];
  }
  let expr = arg;
  Object.keys(dictionnaire)
    .sort((a, b) => b.length - a.length)
    .forEach(l => {
      const val = String(dictionnaire[l]);
      const valFormatee = val.startsWith('-') ? `(${val})` : val;
      expr = expr.replace(new RegExp(l, 'g'), valFormatee);
    });
  const res = evalNum(expr);
  if (!res) throw new Error(`Expression de règle invalide : "${arg}"`);
  return parseFloat(res.toString());
}

const ReglesValidation = {
  isEntier: (lettres, dico) => lettres.every(l => Number.isInteger(parseFloat(valeurArgRegle(l, dico)))),
  isPositif: (lettres, dico) => lettres.every(l => parseFloat(valeurArgRegle(l, dico)) > 0),
  isSuperieurOuEgal: (lettres, dico) => {
    if (lettres.length < 2) return true;
    return valeurArgRegle(lettres[0], dico) >= valeurArgRegle(lettres[1], dico);
  },
  isPrimeEntre: (lettres, dico) => {
    if (lettres.length < 2) return true;
    const gcd = (x, y) => { x = Math.abs(x); y = Math.abs(y); while (y) { const t = y; y = x % y; x = t; } return x; };
    const v1 = parseFloat(valeurArgRegle(lettres[0], dico));
    const v2 = parseFloat(valeurArgRegle(lettres[1], dico));
    return Number.isInteger(v1) && Number.isInteger(v2) && gcd(v1, v2) === 1;
  },
  isDifferent: (lettres, dico) => {
    const valeurs = lettres.map(l => parseFloat(valeurArgRegle(l, dico)));
    return new Set(valeurs).size === valeurs.length;
  }
};

/* ---------- tags "[niveau,type]" et directives ---------- */

function parseTagsEtReste(ligne) {
  const m = ligne.match(/^\[([^\]]*)\]\s*(.*)$/);
  if (!m) return { niveaux: [], types: [], reste: ligne.trim() };
  const tags = m[1].split(',').map(t => t.trim()).filter(Boolean);
  return {
    niveaux: tags.filter(t => NIVEAUX_CONNUS.includes(t)),
    types: tags.filter(t => TYPES_CONNUS.includes(t)),
    reste: m[2].trim()
  };
}

function ligneEligible(ligne, niveau, type) {
  const { niveaux, types } = parseTagsEtReste(ligne);
  return niveaux.includes(String(niveau)) && types.includes(type);
}

function decouperDirectives(chaine) {
  if (!chaine || !chaine.trim()) return [];
  return chaine.split(/,(?![^\(]*\))/).map(s => s.trim()).filter(Boolean);
}

/** Sépare une ligne "[tags] motif | directives" en { motif, generateurs, regles, decimales, decimalesAleatoires }. */
function parseTypeExpression(ligneStr) {
  const { reste } = parseTagsEtReste(ligneStr.trim());
  const sepIdx = reste.indexOf('|');
  const motif = (sepIdx === -1 ? reste : reste.slice(0, sepIdx)).trim();
  const directivesStr = sepIdx === -1 ? '' : reste.slice(sepIdx + 1).trim();
  if (!motif) throw new Error("Gabarit vide.");

  const generateurs = {};
  const regles = [];
  const decimales = {};
  const decimalesAleatoires = {};

  for (const seg of decouperDirectives(directivesStr)) {
    const match = seg.match(/^([a-zA-Z]+)\(([^)]*)\)$/);
    if (!match) throw new Error(`Format de directive invalide : "${seg}"`);
    const [, nomFonction, argumentsStr] = match;
    const args = argumentsStr.split(',').map(a => a.trim());

    if (nomFonction === 'dec') {
      decimales[args[0]] = parseInt(args[1], 10);
      continue;
    }
    if (nomFonction === 'decParmi') {
      decimalesAleatoires[args[0]] = args.slice(1).map(v => parseInt(v, 10));
      continue;
    }
    if (NOMS_GENERATEURS.includes(nomFonction)) {
      const lettre = args[0];
      if (nomFonction === 'intervalle') {
        const min = parseInt(args[1], 10), max = parseInt(args[2], 10);
        if (!Number.isFinite(min) || !Number.isFinite(max) || min > max) {
          throw new Error(`intervalle(${args.join(',')}) invalide.`);
        }
        generateurs[lettre] = { mode: 'intervalle', min, max };
      } else if (nomFonction === 'parmi') {
        const valeurs = args.slice(1).map(v => parseInt(v, 10));
        if (!valeurs.length || valeurs.some(v => !Number.isFinite(v))) {
          throw new Error(`parmi(${args.join(',')}) invalide.`);
        }
        generateurs[lettre] = { mode: 'parmi', valeurs };
      } else if (nomFonction === 'parmiDiviseur') {
        const expr = args[1];
        if (!expr) throw new Error(`parmiDiviseur(${args.join(',')}) invalide.`);
        generateurs[lettre] = { mode: 'parmiDiviseur', expr };
      }
      continue;
    }

    if (!ReglesValidation[nomFonction]) {
      throw new Error(`La règle/générateur "${nomFonction}" n'existe pas.`);
    }
    regles.push({ lettres: args, test: ReglesValidation[nomFonction] });
  }

  return { motif, generateurs, regles, decimales, decimalesAleatoires };
}

/* ---------- tirage des lettres ---------- */

function diviseursDe(n) {
  const out = [];
  for (let d = 2; d <= n; d++) if (n % d === 0) out.push(d);
  return out;
}

function lettresDontDepend(gen) {
  if (gen && gen.mode === 'parmiDiviseur') return gen.expr.match(/[a-zA-Z]/g) || [];
  return [];
}

function ordonnerLettresSelonDependances(lettresUniques, generateurs) {
  const ordre = [];
  const visitees = new Set();
  function visiter(lettre, pile) {
    if (visitees.has(lettre)) return;
    if (pile.has(lettre)) throw new Error(`Dépendance circulaire sur la lettre "${lettre}".`);
    pile.add(lettre);
    lettresDontDepend(generateurs[lettre])
      .filter(l => l !== lettre && lettresUniques.includes(l))
      .forEach(d => visiter(d, pile));
    pile.delete(lettre);
    visitees.add(lettre);
    ordre.push(lettre);
  }
  lettresUniques.forEach(l => visiter(l, new Set()));
  return ordre;
}

function tirerValeurPourLettre(lettre, generateurs, dictionnaire) {
  const gen = generateurs[lettre];
  if (!gen) throw new Error(`Aucun générateur pour la lettre "${lettre}".`);
  if (gen.mode === 'intervalle') {
    return Math.floor(Math.random() * (gen.max - gen.min + 1)) + gen.min;
  }
  if (gen.mode === 'parmi') {
    return gen.valeurs[Math.floor(Math.random() * gen.valeurs.length)];
  }
  if (gen.mode === 'parmiDiviseur') {
    const n = Math.round(valeurArgRegle(gen.expr, dictionnaire));
    const diviseurs = diviseursDe(Math.abs(n));
    if (!diviseurs.length) throw new Error(`Aucun diviseur (>1) trouvé pour "${gen.expr}" = ${n}.`);
    return diviseurs[Math.floor(Math.random() * diviseurs.length)];
  }
  throw new Error(`Générateur inconnu pour la lettre "${lettre}".`);
}

/* ---------- formatage décimal (sans opérateur fraction) ---------- */

function formaterValeurDecimale(val, echelle) {
  if (echelle === 1) return String(val);
  const digits = echelle === 10 ? 1 : 2;
  const abs = Math.abs(val);
  const str = (abs / echelle).toFixed(digits);
  return (val < 0 ? '-' : '') + str;
}

function formaterLettre(val, lettre, decimales, echelleChoisie) {
  const echelle = echelleChoisie[lettre] ?? decimales[lettre];
  const texte = echelle ? formaterValeurDecimale(val, echelle) : String(val);
  return texte.startsWith('-') ? `(${texte})` : texte;
}

/* ---------- résolution des opérations "$" (priorité immédiate) ---------- */

function resoudreOperationsDollar(expr) {
  const NUM_CORE = `(?:\\(-?\\d+(?:\\.\\d+)?\\)|\\d+(?:\\.\\d+)?)`;
  const NUM = `(${NUM_CORE})`;
  const regexMult = new RegExp(`${NUM}\\s*\\$([*:])\\s*${NUM}`);
  const regexAdd = new RegExp(`${NUM}\\s*\\$([+\\-])\\s*${NUM}`);

  const resoudreUnMatch = (regex) => {
    expr = expr.replace(regex, (match, gauche, op, droite) => {
      const sousExpr = `${gauche}${op}${droite}`;
      const evalResultat = evalNum(sousExpr);
      if (!evalResultat) throw new Error("Calcul intermédiaire impossible : " + sousExpr);
      const valeurStr = evalResultat.toString();
      return valeurStr.startsWith('-') ? `(${valeurStr})` : valeurStr;
    });
  };

  let boucleSecurite = 0;
  while ((regexMult.test(expr) || regexAdd.test(expr)) && boucleSecurite < 40) {
    resoudreUnMatch(regexMult.test(expr) ? regexMult : regexAdd);
    boucleSecurite++;
  }
  return expr;
}

/* ---------- pipeline complet pour une ligne de gabarit ---------- */

function genererDepuisLigne(ligneStr) {
  const { motif, generateurs, regles, decimales, decimalesAleatoires } = parseTypeExpression(ligneStr);

  const matches = motif.match(/[a-zA-Z]/g);
  const lettresUniques = matches ? [...new Set(matches)] : [];
  const ordreTirage = ordonnerLettresSelonDependances(lettresUniques, generateurs);

  for (let tirs = 1; tirs <= 500; tirs++) {
    const dictionnaire = {};
    try {
      ordreTirage.forEach(lettre => {
        dictionnaire[lettre] = tirerValeurPourLettre(lettre, generateurs, dictionnaire);
      });
    } catch (e) { continue; }

    const reglesOk = regles.every(regle => {
      const lettresUtilisees = regle.lettres.flatMap(arg => arg.match(/[a-zA-Z]/g) || []);
      const presentes = lettresUtilisees.every(l => lettresUniques.includes(l));
      if (!presentes) return true;
      return regle.test(regle.lettres, dictionnaire);
    });
    if (!reglesOk) continue;

    const echelleChoisie = {};
    Object.keys(decimalesAleatoires).forEach(lettre => {
      const options = decimalesAleatoires[lettre];
      echelleChoisie[lettre] = options[Math.floor(Math.random() * options.length)];
    });

    let exprIntermediaire = motif;
    lettresUniques.forEach(lettre => {
      const valFormatee = formaterLettre(dictionnaire[lettre], lettre, decimales, echelleChoisie);
      exprIntermediaire = exprIntermediaire.replace(new RegExp(lettre, 'g'), valFormatee);
    });

    let exprFinale;
    try {
      exprFinale = resoudreOperationsDollar(exprIntermediaire);
    } catch (e) { continue; }

    const exerciceParse = parseNum(exprFinale);
    if (!exerciceParse || !exerciceParse.isValid()) continue;

    let resExact;
    try {
      resExact = exerciceParse.calculer().resultat;
    } catch (e) { continue; }

    return { dictionnaire, exprFinale, exerciceParse, resExact };
  }

  throw new Error(`Impossible de générer une expression valide pour la ligne : "${ligneStr}"`);
}

/* ================================================================
   BANQUE DE GABARITS — transcription des blocs "entier" et "decimal"
   (niveaux 6e/5e/4e) de calcul-prioritaire/app.js, sans le bloc
   "fraction" (hors périmètre de flash). Les lignes "decimal" sont
   traduites depuis l'écriture "a/10" de la référence vers la directive
   dec(a,10) — voir l'en-tête du fichier.
================================================================ */

const BANQUE_GABARITS_NUM = `
[6,entier,A] a$+b$+c-b+c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,A] a$+b$+c-(b+c) | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,B] a$*b$*c:b*c | intervalle(a,2,3), intervalle(b,2,3), intervalle(c,2,9)
[6,entier,B] a$*b$*c:(b*c) | intervalle(a,2,3), intervalle(b,2,3), intervalle(c,2,9)
[6,entier,C] a+b*c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,C] a*b+c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,C] a*b-c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), isSuperieurOuEgal(a*b,c)
[6,entier,C] b$*c$+a-b*c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,D] a*b+c*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9)
[6,entier,D] a*b-c*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a*b,c*d)
[6,entier,E] a+b$*c:c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,E] a$+b-b$*c:c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,E] b$*c:c+a | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,E] (b$+a)$*c:c-a | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9)
[6,entier,F] (a+b*c):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c)
[6,entier,F] (b*c+a):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c)
[6,entier,F] (a$*b:b-c)*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a,c)
[6,entier,F] a*(b+c$*d:d) | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9)
[6,entier,G] (a-b)*c+d | intervalle(a,4,9), intervalle(b,2,8), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a,b)
[6,entier,H] a*b+e+c$*d:d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), intervalle(e,2,9)
[6,entier,H] a*b-c$*d:d +e | intervalle(a,4,9), intervalle(b,2,8), intervalle(c,2,9), intervalle(d,2,9), intervalle(e,2,9), isSuperieurOuEgal(a*b,c)

[6,decimal,A] a$+b$+c-b+c | intervalle(a,2,30), intervalle(b,2,30), intervalle(c,2,50), dec(a,10), dec(b,10), dec(c,10)
[6,decimal,A] a$+b-b+c | intervalle(a,2,30), intervalle(b,2,30), intervalle(c,2,20), dec(a,10), dec(b,10), dec(c,100)
[6,decimal,B] a$*b$*c:b*c | intervalle(a,2,3), intervalle(b,2,3), intervalle(c,2,9), dec(a,10)
[6,decimal,B] a$*b$*c:(b*c) | intervalle(a,2,3), intervalle(b,2,3), intervalle(c,2,9), dec(a,10)
[6,decimal,B] a$*b$*c:b*c | intervalle(a,2,3), intervalle(b,2,3), intervalle(c,2,9), dec(a,100)
[6,decimal,B] a$*b$*c:(b*c) | intervalle(a,2,3), intervalle(b,2,3), intervalle(c,2,9), dec(a,100)
[6,decimal,C] a+b*c | intervalle(a,2,9), intervalle(b,2,15), intervalle(c,2,3), dec(a,10), dec(b,10)
[6,decimal,C] a+b*c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), dec(a,10), dec(b,100)
[6,decimal,C] a*b+c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,70), dec(b,10), dec(c,10)
[6,decimal,C] a*b-c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), dec(b,10), dec(c,10), isSuperieurOuEgal(a*b,c)
[6,decimal,C] b$*c$+a-b*c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), dec(a,10), dec(b,10), dec(c,10)
[6,decimal,D] a*b+c*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), dec(b,10), dec(d,10)
[6,decimal,D] a*b+c*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), dec(b,10), dec(c,10), dec(d,10)
[6,decimal,D] a*b+c*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), dec(a,10), dec(b,10), dec(c,10), dec(d,10)
[6,decimal,D] a*b+c*d | intervalle(a,2,20), intervalle(b,2,3), intervalle(c,2,3), intervalle(d,2,20), dec(a,10), dec(b,10), dec(c,10), dec(d,10)
[6,decimal,D] a*b-c*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), dec(b,10), dec(d,10), isSuperieurOuEgal(a*b,c*d)
[6,decimal,E] a+b$*c:c | intervalle(a,2,30), intervalle(b,2,9), intervalle(c,2,9), dec(a,10), dec(b,10)
[6,decimal,E] a$+b-b$*c:c | intervalle(a,2,40), intervalle(b,2,9), intervalle(c,2,9), dec(a,10), dec(b,10)
[6,decimal,E] b$*c:c+a | intervalle(a,2,30), intervalle(b,2,9), intervalle(c,2,9), dec(a,10), dec(b,100)
[6,decimal,E] (b$+a)$*c:c-a | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), dec(a,10), dec(b,10)
[6,decimal,F] (a+b*c):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c), dec(a,100), dec(b,10), dec(c,10)
[6,decimal,F] (a+b*c):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c), dec(a,10), dec(c,10)
[6,decimal,F] (a+b*c):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c), dec(a,10), dec(b,10)
[6,decimal,F] (b*c+a):d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c), dec(a,100), dec(c,100)
[6,decimal,F] (a$*b:b-c)*d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a,c), dec(a,10), dec(c,10)
[6,decimal,F] a*(b+c$*d:d) | intervalle(a,2,3), intervalle(b,2,3), intervalle(c,2,9), intervalle(d,2,9), dec(b,100), dec(c,10)
[6,decimal,G] (a-b)*c+d | intervalle(a,4,9), intervalle(b,2,8), intervalle(c,2,9), intervalle(d,2,9), isSuperieurOuEgal(a,b), dec(a,10), dec(b,10), dec(c,10), dec(d,10)
[6,decimal,H] a*b+e+c$*d:d | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), intervalle(e,2,9), dec(a,10), dec(e,10), dec(c,10)
[6,decimal,H] a*b-c$*d:d +e | intervalle(a,4,9), intervalle(b,2,8), intervalle(c,2,9), intervalle(d,2,9), intervalle(e,2,9), isSuperieurOuEgal(a*b,c), dec(b,10), dec(c,10), dec(e,100)

[5,entier,A] a-b+c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[5,entier,A] a-(b+c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[5,entier,B] a$*b$*c:b*c | intervalle(a,-9,9), intervalle(b,2,3), intervalle(c,2,9)
[5,entier,B] a$*b$*c:(b*c) | intervalle(a,-9,9), intervalle(b,2,3), intervalle(c,2,9)
[5,entier,C] a+b*c | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9)
[5,entier,C] a*b+c | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9)
[5,entier,C] a-b*c | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9)
[5,entier,C] a*b-c | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9)
[5,entier,D] a*b+c*d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9)
[5,entier,D] a*b-c*d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9)
[5,entier,E] a+b$*c:c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9)
[5,entier,E] a-b$*c:c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9)
[5,entier,E] b$*c:c+a | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9)
[5,entier,E] b$*c:c-a | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9)
[5,entier,F] (a+b*c):d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c)
[5,entier,F] (b*c+a):d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c)
[5,entier,F] (a-b*c):d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), parmiDiviseur(d,a-b*c)
[5,entier,F] (b*c-a):d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), parmiDiviseur(d,b*c-a)
[5,entier,F] (a$*b:b+c)*d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9)
[5,entier,F] a*(b-c$*d:d) | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9)
[5,entier,G] (a+b)*c-d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5,entier,G] (a-b)*c+d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5,entier,G] d-(a+b)*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5,entier,G] d-(a-b)*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5,entier,G] d+(a-b*c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5,entier,G] d-(a+b*c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9)
[5,entier,H] a*b-e+c$*d:d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9), intervalle(e,2,9)
[5,entier,H] a*b-c$*d:d -e | intervalle(a,-9,9), intervalle(b,2,8), intervalle(c,-9,9), intervalle(d,2,9), intervalle(e,2,9)

[5,decimal,A] a+b+c | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50), dec(a,10), dec(b,10), dec(c,10)
[5,decimal,A] a-b+c | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50), dec(a,10), dec(b,10), dec(c,10)
[5,decimal,A] a-b-c | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50), dec(a,10), dec(b,10), dec(c,10)
[5,decimal,A] a-b+c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), decParmi(a,1,10,100), decParmi(b,1,10,100), decParmi(c,1,10,100)
[5,decimal,B] a$*b$*c:b*c | intervalle(a,-3,3), intervalle(b,2,3), intervalle(c,2,9), dec(a,10)
[5,decimal,B] a$*b$*c:(b*c) | intervalle(a,-3,3), intervalle(b,2,3), intervalle(c,2,9), dec(a,10)
[5,decimal,B] a$*b$*c:b*c | intervalle(a,-3,3), intervalle(b,2,3), intervalle(c,2,9), dec(a,100)
[5,decimal,B] a$*b$*c:(b*c) | intervalle(a,-3,3), intervalle(b,2,3), intervalle(c,2,9), dec(a,100)
[5,decimal,C] a+b*c | intervalle(a,-9,9), intervalle(b,-15,15), intervalle(c,2,3), dec(a,10), dec(b,10)
[5,decimal,C] a+b*c | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,2,9), dec(a,10), dec(b,100)
[5,decimal,C] a*b+c | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-70,70), dec(b,10), dec(c,10)
[5,decimal,C] a*b-c | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), dec(b,10), dec(c,10)
[5,decimal,C] b$*c$+a-b*c | intervalle(a,2,9), intervalle(b,2,9), intervalle(c,2,9), dec(a,10), dec(b,10), dec(c,10)
[5,decimal,D] a*b+c*d | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9), dec(b,10), dec(d,10)
[5,decimal,D] a*b-c*d | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,-9,9), dec(b,10), dec(d,10)
[5,decimal,D] a*b+c*d | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,2,9), dec(b,10), dec(c,10), dec(d,10)
[5,decimal,D] a*b-c*d | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,2,9), intervalle(d,2,9), dec(b,10), dec(c,10), dec(d,10)
[5,decimal,D] a*b-c*d | intervalle(a,2,20), intervalle(b,2,3), intervalle(c,2,3), intervalle(d,2,20), dec(a,10), dec(b,10), dec(c,10), dec(d,10)
[5,decimal,E] a+b$*c:c | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,2,9), dec(a,10), dec(b,10)
[5,decimal,E] a-b$*c:c | intervalle(a,2,40), intervalle(b,-9,9), intervalle(c,2,9), dec(a,10), dec(b,10)
[5,decimal,E] b$*c:c+a | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,2,9), dec(a,10), dec(b,100)
[5,decimal,E] b$*c:c-a | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,2,9), dec(a,10), dec(b,100)
[5,decimal,F] (a+b*c):d | intervalle(a,-20,20), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c), dec(a,100), dec(b,10), dec(c,10)
[5,decimal,F] (a-b*c):d | intervalle(a,-20,20), intervalle(b,2,9), intervalle(c,2,9), parmiDiviseur(d,a-b*c), dec(a,100), dec(b,10), dec(c,10)
[5,decimal,F] (a+b*c):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,2,9), parmiDiviseur(d,a+b*c), decParmi(a,10,100), decParmi(c,10,100)
[5,decimal,F] (a-b*c):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,2,9), parmiDiviseur(d,a-b*c), decParmi(a,10,100), decParmi(b,10,100)
[5,decimal,F] a*(b+c$*d:d) | intervalle(a,2,3), intervalle(b,-3,3), intervalle(c,-9,9), intervalle(d,2,9), dec(b,100), dec(c,10)
[5,decimal,G] (a-b)*c+d | intervalle(a,-9,9), intervalle(b,-8,8), intervalle(c,2,9), intervalle(d,-9,9), dec(a,10), dec(b,10), dec(c,10), dec(d,10)
[5,decimal,H] a*b+e+c$*d:d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,2,9), intervalle(d,2,9), intervalle(e,-20,20), dec(a,10), dec(e,10), dec(c,10)
[5,decimal,H] a*b-c$*d:d +e | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9), intervalle(e,-30,30), dec(b,10), dec(c,10), dec(e,100)

[4,entier,A] a-b+c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,A] a-(b+c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,B] a$*b$*c:b*c | intervalle(a,-9,9), intervalle(b,2,3), intervalle(c,-9,9)
[4,entier,B] a$*b$*c:(b*c) | intervalle(a,-9,9), intervalle(b,2,3), intervalle(c,-9,9)
[4,entier,C] a+b*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,C] a*b+c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,C] a-b*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,C] a*b-c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,D] a*b+c*d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4,entier,D] a*b-c*d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4,entier,E] a+b$*c:c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,E] a-b$*c:c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,E] b$*c:c+a | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,E] b$*c:c-a | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9)
[4,entier,F] (a+b*c):d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), parmiDiviseur(d,a+b*c)
[4,entier,F] (b*c+a):d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), parmiDiviseur(d,a+b*c)
[4,entier,F] (a-b*c):d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), parmiDiviseur(d,a-b*c)
[4,entier,F] (b*c-a):d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), parmiDiviseur(d,b*c-a)
[4,entier,F] (a$*b:b+c)*d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9)
[4,entier,F] a*(b-c$*d:d) | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9)
[4,entier,G] (a+b)*c-d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4,entier,G] (a-b)*c+d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4,entier,G] d-(a+b)*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4,entier,G] d-(a-b)*c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4,entier,G] d+(a-b*c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4,entier,G] d-(a+b*c) | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9)
[4,entier,H] a*b-e+c$*d:d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9), intervalle(e,2,9)
[4,entier,H] a*b-c$*d:d -e | intervalle(a,-9,9), intervalle(b,2,8), intervalle(c,-9,9), intervalle(d,2,9), intervalle(e,2,9)

[4,decimal,A] a+b+c | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50), dec(a,10), dec(b,10), dec(c,10)
[4,decimal,A] a-b+c | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50), dec(a,10), dec(b,10), dec(c,10)
[4,decimal,A] a-b-c | intervalle(a,-30,30), intervalle(b,-30,30), intervalle(c,-50,50), dec(a,10), dec(b,10), dec(c,10)
[4,decimal,A] a-b+c | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), decParmi(a,1,10,100), decParmi(b,1,10,100), decParmi(c,1,10,100)
[4,decimal,B] a$*b$*c:b*c | intervalle(a,-3,3), intervalle(b,2,3), intervalle(c,-9,9), dec(a,10)
[4,decimal,B] a$*b$*c:(b*c) | intervalle(a,-3,3), intervalle(b,2,3), intervalle(c,-9,9), dec(a,10)
[4,decimal,B] a$*b$*c:b*c | intervalle(a,-3,3), intervalle(b,2,3), intervalle(c,-9,9), dec(a,100)
[4,decimal,B] a$*b$*c:(b*c) | intervalle(a,-3,3), intervalle(b,2,3), intervalle(c,-9,9), dec(a,100)
[4,decimal,C] a+b*c | intervalle(a,-9,9), intervalle(b,-15,15), intervalle(c,-3,3), dec(a,10), dec(b,10)
[4,decimal,C] a+b*c | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,-9,9), dec(a,10), dec(b,100)
[4,decimal,C] a*b+c | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-70,70), dec(b,10), dec(c,10)
[4,decimal,C] a*b-c | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), dec(b,10), dec(c,10)
[4,decimal,D] a*b+c*d | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9), dec(b,10), dec(d,10)
[4,decimal,D] a*b-c*d | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9), dec(b,10), dec(d,10)
[4,decimal,D] a*b+c*d | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9), dec(b,10), dec(c,10), dec(d,10)
[4,decimal,D] a*b-c*d | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9), dec(b,10), dec(c,10), dec(d,10)
[4,decimal,D] a*b-c*d | intervalle(a,-9,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,-9,9), dec(a,10), dec(b,10), dec(c,10), dec(d,10)
[4,decimal,E] a+b$*c:c | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,-9,9), dec(a,10), dec(b,10)
[4,decimal,E] a-b$*c:c | intervalle(a,2,40), intervalle(b,-9,9), intervalle(c,-9,9), dec(a,10), dec(b,10)
[4,decimal,E] b$*c:c+a | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,-9,9), dec(a,10), dec(b,100)
[4,decimal,E] b$*c:c-a | intervalle(a,-30,30), intervalle(b,-9,9), intervalle(c,-9,9), dec(a,10), dec(b,100)
[4,decimal,F] (a+b*c):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), parmiDiviseur(d,a+b*c), dec(a,100), dec(b,10), dec(c,10)
[4,decimal,F] (a-b*c):d | intervalle(a,-20,20), intervalle(b,2,9), intervalle(c,-9,9), parmiDiviseur(d,a-b*c), dec(a,100), dec(b,10), dec(c,10)
[4,decimal,F] (a+b*c):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), parmiDiviseur(d,a+b*c), decParmi(a,10,100), decParmi(c,10,100)
[4,decimal,F] (a-b*c):d | intervalle(a,-20,20), intervalle(b,-9,9), intervalle(c,-9,9), parmiDiviseur(d,a-b*c), decParmi(a,10,100), decParmi(b,10,100)
[4,decimal,F] a*(b+c$*d:d) | intervalle(a,2,3), intervalle(b,-3,3), intervalle(c,-9,9), intervalle(d,2,9), dec(b,100), dec(c,10)
[4,decimal,G] (a-b)*c+d | intervalle(a,-9,9), intervalle(b,-8,8), intervalle(c,-9,9), intervalle(d,-9,9), dec(a,10), dec(b,10), dec(c,10), dec(d,10)
[4,decimal,H] a*b+e+c$*d:d | intervalle(a,-9,9), intervalle(b,2,9), intervalle(c,-9,9), intervalle(d,2,9), intervalle(e,-20,20), dec(a,10), dec(e,10), dec(c,10)
[4,decimal,H] a*b-c$*d:d +e | intervalle(a,2,9), intervalle(b,-9,9), intervalle(c,-9,9), intervalle(d,2,9), intervalle(e,-30,30), dec(b,10), dec(c,10), dec(e,100)
`.trim();

const LIGNES_BANQUE = BANQUE_GABARITS_NUM.split('\n').map(l => l.trim()).filter(Boolean);

/** Pioche un gabarit éligible pour (niveau, type) et génère un exercice. */
export function genererCalculNum(niveau, type) {
  const eligibles = LIGNES_BANQUE.filter(l => ligneEligible(l, niveau, type));
  if (eligibles.length === 0) {
    throw new Error(`Aucun gabarit calcul-num pour niveau="${niveau}", type="${type}".`);
  }
  const ligne = eligibles[Math.floor(Math.random() * eligibles.length)];
  return genererDepuisLigne(ligne);
}
