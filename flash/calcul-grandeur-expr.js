/* ================================================================
   calcul-grandeur-expr.js — expressions de grandeurs (valeur + unité),
   avec unités à exposant (cm^2, m^3) et unités composées (m/s).

   Port allégé depuis appli-maths/nombreProportionnalite/{Expression,
   ObjetString,Somme,Produit}.js : on ne garde que le nécessaire pour
   analyser une réponse tapée par un élève — parsing d'un atome
   "9cm^2"/"1/2 km", arbre Somme/Différence/Produit/Quotient, évaluation
   directe et rendu LaTeX du résultat. Toute la machinerie "pas à pas"
   pédagogique de la version source (evaluerPasAPas, regrouper, aplatir,
   modeMixte, Duree/Prix à affichage mixte...) n'a pas sa place ici : ce
   fichier sert uniquement à vérifier une réponse, pas à enseigner les
   étapes de calcul.

   Dépend de nombre.js et calcul-grandeur.js (chargés via import).

   API :
     parseUniteTexte(uniteStr)   → dict d'unités (ex: "cm^2" → {cm:2},
                                    "m/s" → {m:1, s:-1})
     evalGrandeurExpr(text)      → Grandeur | null
     parseGrandeurExpr(text)     → ObjetStringGrandeur (arbre + résultat)
================================================================ */

'use strict';

import { Nombre } from './nombre.js';
import { Grandeur } from './calcul-grandeur.js';

/* ---------- unités : texte → dict avec exposants ---------- */

// "m/s" → "m·s^-1" avant découpage, pour traiter les unités composées
// écrites en fraction comme des exposants négatifs.
export function parseUniteTexte(uniteStr) {
  if (typeof uniteStr !== "string") throw new Error("Unité attendue sous forme de chaîne");

  uniteStr = uniteStr.replace(/\s+/g, "");
  if (uniteStr.includes("/")) {
    const [num, den] = uniteStr.split("/");
    uniteStr = num + "·" + den.split("·").map(u =>
      u.includes("^") ? u.replace(/\^(\d+)/, "^-$1") : `${u}^-1`
    ).join("·");
  }

  const dict = {};
  uniteStr.split("·").filter(Boolean).forEach(u => {
    const [sym, expStr] = u.split("^");
    const exp = expStr ? parseInt(expStr, 10) : 1;
    if (!sym || isNaN(exp)) return;
    dict[sym] = (dict[sym] || 0) + exp;
  });

  return dict;
}

/* ---------- atome : "9cm^2", "1/2 km", "-3€" ---------- */

// Insère un espace entre le nombre et l'unité collée ("9cm^2" -> "9 cm^2"),
// puis sépare nombre / unité sur le premier espace.
function _parserAtomeGrandeur(str) {
  str = str.trim();
  str = str.replace(/^([+-]?\d+(?:[.,]\d+)?(?:\/\d+)?)([a-zA-Z€°])/u, "$1 $2");

  const [nombreStrRaw, ...uniteParts] = str.split(/\s+/);
  const nombre = new Nombre(nombreStrRaw.trim());

  if (uniteParts.length === 0) return new Grandeur(nombre, {});

  const dict = parseUniteTexte(uniteParts.join(""));
  Grandeur.validerUniteDict(dict, { throwOnError: true });
  return new Grandeur(nombre, dict);
}

class _AtomeGrandeur {
  constructor(raw) {
    this.instanceOptions = { parenthese: false };
    this.grandeur = _parserAtomeGrandeur(String(raw));
  }
  evaluer() { return this.grandeur; }
  toLatex(opts = {}) { return this.grandeur.toLatex(opts); }
  isAtome() { return true; }
}

/* ---------- arbre d'expression : Somme/Différence/Produit/Quotient ----------
   Version minimale : seulement evaluer() et toLatex(), pas de "pas à pas". */

class _SommeG {
  constructor(termes) { this.termes = termes; this.instanceOptions = { parenthese: false }; }
  evaluer() {
    const [h, ...t] = this.termes.map(x => x.evaluer());
    return t.reduce((acc, v) => acc.add(v), h);
  }
  toLatex(opts = {}) {
    const s = this.termes.map(t => t.toLatex(opts)).join(" + ");
    return this.instanceOptions.parenthese ? `\\left(${s}\\right)` : s;
  }
}

class _DifferenceG {
  constructor(termes) { this.termes = termes; this.instanceOptions = { parenthese: false }; }
  evaluer() { return this.termes[0].evaluer().sub(this.termes[1].evaluer()); }
  toLatex(opts = {}) {
    const s = `${this.termes[0].toLatex(opts)} - ${this.termes[1].toLatex(opts)}`;
    return this.instanceOptions.parenthese ? `\\left(${s}\\right)` : s;
  }
}

class _ProduitG {
  constructor(facteurs) { this.facteurs = facteurs; this.instanceOptions = { parenthese: false }; }
  evaluer() {
    const [h, ...t] = this.facteurs.map(x => x.evaluer());
    return t.reduce((acc, v) => acc.mul(v), h);
  }
  toLatex(opts = {}) {
    const s = this.facteurs.map(f => f.toLatex(opts)).join(" \\times ");
    return this.instanceOptions.parenthese ? `\\left(${s}\\right)` : s;
  }
}

class _QuotientG {
  constructor(termes) { this.termes = termes; this.instanceOptions = { parenthese: false }; }
  evaluer() { return this.termes[0].evaluer().div(this.termes[1].evaluer()); }
  toLatex(opts = {}) {
    const s = `${this.termes[0].toLatex(opts)} \\div ${this.termes[1].toLatex(opts)}`;
    return this.instanceOptions.parenthese ? `\\left(${s}\\right)` : s;
  }
}

/* ---------- parseur ObjetStringGrandeur ---------- */

export class ObjetStringGrandeur {
  constructor(expression) {
    this.expression = expression;
    this.erreur = null;
    this.tokens = this._tokeniser(expression);
    try {
      this.arbre = this._construireArbre();
    } catch (e) {
      this.arbre = null;
      this.erreur = e.message;
    }
    this.valid = !this.erreur && !!this.arbre;
  }

  isValid() { return !!this.valid; }

  calculer() {
    if (!this.arbre) throw new Error(this.erreur || "Arbre invalide");
    return { resultat: this.arbre.evaluer() };
  }

  _tokeniser(expr) {
    const s = String(expr);
    const out = [];
    const isSpace = c => /\s/.test(c);
    const isParen = c => c === "(" || c === ")";
    const isOp = c => c === "+" || c === "-" || c === "*" || c === ":";
    const isAtomStart = c => /[0-9a-zA-Z€°]/.test(c);
    const isAtomChar = c => /[0-9a-zA-Z€°.,/^·%]/.test(c);

    let i = 0, prev = "start";
    while (i < s.length) {
      while (i < s.length && isSpace(s[i])) i++;
      if (i >= s.length) break;
      const c = s[i];

      if (isParen(c)) { out.push(c); prev = c === "(" ? "parenL" : "parenR"; i++; continue; }

      if (isOp(c)) {
        const unaryContext = (prev === "start" || prev === "op" || prev === "parenL");
        if (c === "-" && unaryContext) {
          let j = i + 1;
          while (j < s.length && isSpace(s[j])) j++;
          if (j < s.length && isAtomStart(s[j])) {
            let k = j + 1;
            while (k < s.length && isAtomChar(s[k])) k++;
            out.push(c + s.slice(j, k));
            i = k; prev = "atom";
            continue;
          }
        }
        out.push(c); prev = "op"; i++; continue;
      }

      if (isAtomChar(c)) {
        let k = i + 1;
        while (k < s.length && isAtomChar(s[k])) k++;
        out.push(s.slice(i, k));
        prev = "atom"; i = k;
        continue;
      }

      out.push(s[i++]); prev = "op";
    }
    return out;
  }

  _analyserTokens() {
    const isOp = t => t === "+" || t === "-" || t === "*" || t === ":";
    const isParen = t => t === "(" || t === ")";
    const out = [];
    for (const raw of this.tokens) {
      if (isParen(raw)) { out.push({ token: raw, nature: "parenthese" }); continue; }
      if (isOp(raw)) { out.push({ token: raw, nature: "operation" }); continue; }
      try {
        const atome = new _AtomeGrandeur(raw);
        out.push({ token: raw, nature: "grandeur", objet: atome });
      } catch (e) {
        out.push({ token: raw, nature: "inconnu", erreur: e?.message || "inconnu" });
      }
    }
    return out;
  }

  _construireArbre() {
    const tokensAnalyses = this._analyserTokens();

    const erreurs = tokensAnalyses.filter(t => t.nature === "inconnu");
    if (erreurs.length > 0) {
      const e = new Error("PARSE_ERROR");
      e.code = "PARSE_ERROR";
      throw e;
    }

    let index = 0;
    const parseExpression = () => parseAddSub();

    const parseAtom = () => {
      if (index >= tokensAnalyses.length) throw new Error("Réponse invalide.");
      const token = tokensAnalyses[index++];
      if (token.token === "(") {
        const expr = parseExpression();
        if (index >= tokensAnalyses.length || tokensAnalyses[index++].token !== ")") {
          throw new Error("Réponse invalide.");
        }
        expr.instanceOptions = { ...(expr.instanceOptions || {}), parenthese: true };
        return expr;
      }
      if (token.objet) return token.objet;
      throw new Error("Réponse invalide.");
    };

    const parseMulDiv = () => {
      let left = parseAtom();
      while (index < tokensAnalyses.length && ["*", ":"].includes(tokensAnalyses[index].token)) {
        const op = tokensAnalyses[index++].token;
        const right = parseAtom();
        left = (op === "*") ? new _ProduitG([left, right]) : new _QuotientG([left, right]);
      }
      return left;
    };

    const parseAddSub = () => {
      let left = parseMulDiv();
      while (index < tokensAnalyses.length && ["+", "-"].includes(tokensAnalyses[index].token)) {
        const op = tokensAnalyses[index++].token;
        const right = parseMulDiv();
        left = (op === "+") ? new _SommeG([left, right]) : new _DifferenceG([left, right]);
      }
      return left;
    };

    const arbre = parseExpression();
    if (index < tokensAnalyses.length) throw new Error("Réponse invalide.");
    return arbre;
  }
}

export function evalGrandeurExpr(text) {
  try {
    const os = new ObjetStringGrandeur(String(text).trim());
    if (!os.isValid()) return null;
    return os.calculer().resultat;
  } catch (e) { return null; }
}

export function parseGrandeurExpr(text) {
  return new ObjetStringGrandeur(String(text).trim());
}
