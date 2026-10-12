/*
 * EnonceFraction.js — « Sens des opérations (fractions) »
 *
 * Même principe que l'appli « masse », mais on ne cherche plus une masse :
 * on cherche la QUANTITÉ Q, exprimée avec l'unité dessinée en 1re colonne.
 * Colonne « Unité » : dessin + « Quantité : 1 ».
 * Colonne « Quantité cherchée » : dessin + « Q = ? ».
 * L'élève donne AU MOINS 3 ÉCRITURES DIFFÉRENTES de Q (FORMES_MIN), dans l'ordre qu'il veut ;
 * l'une d'elles doit être le NOMBRE MIXTE (2+3/4).
 * Q est TOUJOURS une fraction plus grande que 1, non entière (sinon on retire).
 *
 * Fractions par le quotient (1/4 = 1:4, 6:4 = (4+2):4 = 1 + 2/4).
 * Programme de 6e : tout est parenthésé, pas de priorités opératoires.
 *
 * Niveaux (DISQUE_NIVEAUX) :
 *   0. Échauffement — unité : 1 disque
 *      E3. p1/q + p2/q > 1, q ≤ 5      ex. 2/3 + 2/3 = 4/3 = 1 + 1/3
 *   1. Regrouper des parts — unité : 1 disque, une seule sorte de parts
 *      R1. c disques p/q identiques       (p:q)+(p:q) = (p+p):q = N:q = …
 *      R2. p1/q + p2/q + p3/q             (p1:q)+(p2:q)+(p3:q) = …
 *      R3. p1/q + p2/q (p1 ≠ p2, > 1)     (3:5)+(4:5) = (3+4):5 = 7:5 = …
 *   2. Mélange : types du niveau 1 + parts différentes (unité : 1 disque, q2 multiple de q1)
 *      D1. a/q1 + b/q2                    (a:q1)+(b:q2) = (am:q2)+(b:q2) = …
 *      D2. a/q1 + b/q2 + c/q2
 *   3. L'unité est 2 disques
 *      U2. c disques p/q (q = 3, 4, 5)    une part = 1/(2q) d'unité : Q = cp/(2q)
 * Pas de « : » dans les saisies.
 * Dans « Quantité cherchée », aucun disque n'est colorié en entier :
 * la quantité est répartie en parts sur plusieurs disques (ex. 2/3 + 2/3).
 *   4. Mixte : niveaux 1, 2 et 3, à parts égales
 */

const DISQUE_NIVEAUX = {
  0: { nom: 'Échauffement', aide: '2 dessins, petites parts', types: ['E3'] },
  1: { nom: 'Niveau 1', aide: 'regrouper des parts pareilles', types: ['R1', 'R2', 'R3'] },
  2: { nom: 'Niveau 2', aide: 'parts pareilles ou différentes', types: ['R1', 'R2', 'R3', 'D1', 'D2'] },
  3: { nom: 'Niveau 3', aide: "l'unité, c'est 2 dessins entiers", types: ['U2'] },
  4: { nom: 'Mixte', aide: 'niveaux 1, 2 et 3 mélangés', melange: [1, 2, 3] }
};

/** Types d'un niveau (pour « Mixte » : réunion des niveaux mélangés) */
function typesDuNiveau(niveau) {
  const def = DISQUE_NIVEAUX[niveau];
  return def.melange ? def.melange.flatMap(n => DISQUE_NIVEAUX[n].types) : def.types;
}
const DISQUE_DENOMS = [2, 3, 4, 5, 6, 8, 10];
// Nombre minimal d'écritures différentes de Q (dont le nombre mixte)
const FORMES_MIN = 3;
// Partages compatibles : le second partage coupe chaque part du premier
const DISQUE_PAIRES = [[2, 4], [2, 6], [3, 6], [2, 8], [4, 8], [2, 10], [5, 10]];

function disquePgcd(a, b) { while (b) { [a, b] = [b, a % b]; } return a; }

/** Dessin SVG d'un disque : n parts colorées sur d (n = d = 1 → disque entier). */
function disqueSVG(n, d, r = 36) {
  const c = r + 2, taille = 2 * c;
  const gris = 'var(--disque-couleur, #f59f00)';
  let s = `<svg class="disque" viewBox="0 0 ${taille} ${taille}" width="${taille}" height="${taille}" aria-hidden="true">`;
  if (d === 1) {
    s += `<circle cx="${c}" cy="${c}" r="${r}" style="fill:${gris}" stroke="#222" stroke-width="1.5"/>`;
    return s + '</svg>';
  }
  s += `<circle cx="${c}" cy="${c}" r="${r}" fill="#fff" stroke="none"/>`;
  // Parts colorées : de l'angle 0 (à droite) dans le sens inverse des aiguilles d'une montre
  const pt = (k) => {
    const a = 2 * Math.PI * k / d;
    return [(c + r * Math.cos(a)).toFixed(2), (c - r * Math.sin(a)).toFixed(2)];
  };
  if (n >= d) {
    s += `<circle cx="${c}" cy="${c}" r="${r}" style="fill:${gris}"/>`;
  } else if (n > 0) {
    const [x0, y0] = pt(0), [x1, y1] = pt(n);
    const grandArc = (n / d) > 0.5 ? 1 : 0;
    s += `<path d="M ${c} ${c} L ${x0} ${y0} A ${r} ${r} 0 ${grandArc} 0 ${x1} ${y1} Z" style="fill:${gris}"/>`;
  }
  for (let k = 0; k < d; k++) {
    const [x, y] = pt(k);
    s += `<line x1="${c}" y1="${c}" x2="${x}" y2="${y}" stroke="#222" stroke-width="1.5"/>`;
  }
  s += `<circle cx="${c}" cy="${c}" r="${r}" fill="none" stroke="#222" stroke-width="1.5"/>`;
  return s + '</svg>';
}

/* ------------------------------------------------------------------
 * Formes de dessin : disque, barre, rectangle (bouton « Forme »)
 * ------------------------------------------------------------------ */
const FORMES = {
  disque: { nom: 'Disque', icone: '◔' },
  barre: { nom: 'Barre', icone: '▭' },
  rectangle: { nom: 'Rectangle', icone: '▦' },
  melange: { nom: 'Mélange', icone: '🔀' }   // une forme tirée au hasard à chaque exercice
};
const FORMES_DESSIN = ['disque', 'barre', 'rectangle'];

/** Forme réelle d'un exercice : « Mélange » → celle tirée pour cet exercice */
function formeExercice(v, forme = DESSIN.forme) {
  return forme === 'melange' ? v.formeHasard : forme;
}
// Forme choisie dans l'appli (la fiche papier part de celle-ci)
const DESSIN = { forme: 'disque' };

/** Grille d'un rectangle partagé en d parts : 2 lignes si d est pair (d > 2), sinon 1 ligne */
function grilleRectangle(d) {
  const lignes = d % 2 === 0 && d > 2 ? 2 : 1;
  return { lignes, colonnes: d / lignes };
}

/** Barre de L × H partagée en d parts égales, n parts colorées depuis la gauche */
function barreSVG(n, d, L = 120, H = 30) {
  const m = 2, gris = 'var(--disque-couleur, #f59f00)';
  let s = `<svg class="disque barre" viewBox="0 0 ${L + 2 * m} ${H + 2 * m}" width="${L + 2 * m}" height="${H + 2 * m}" aria-hidden="true">`;
  s += `<rect x="${m}" y="${m}" width="${L}" height="${H}" fill="#fff"/>`;
  s += `<rect x="${m}" y="${m}" width="${(L * Math.min(n, d) / d).toFixed(2)}" height="${H}" style="fill:${gris}"/>`;
  for (let k = 1; k < d; k++) {
    const x = (m + L * k / d).toFixed(2);
    s += `<line x1="${x}" y1="${m}" x2="${x}" y2="${m + H}" stroke="#222" stroke-width="1.5"/>`;
  }
  s += `<rect x="${m}" y="${m}" width="${L}" height="${H}" fill="none" stroke="#222" stroke-width="1.5"/>`;
  return s + '</svg>';
}

/** Rectangle de L × H partagé en d cases (grille), n cases colorées ligne par ligne */
function rectangleSVG(n, d, L = 96, H = 64) {
  const m = 2, gris = 'var(--disque-couleur, #f59f00)';
  const { lignes, colonnes } = grilleRectangle(d);
  const w = L / colonnes, h = H / lignes;
  let s = `<svg class="disque rectangle" viewBox="0 0 ${L + 2 * m} ${H + 2 * m}" width="${L + 2 * m}" height="${H + 2 * m}" aria-hidden="true">`;
  s += `<rect x="${m}" y="${m}" width="${L}" height="${H}" fill="#fff"/>`;
  for (let i = 0; i < Math.min(n, d); i++) {
    const x = m + (i % colonnes) * w, y = m + Math.floor(i / colonnes) * h;
    s += `<rect x="${x.toFixed(2)}" y="${y.toFixed(2)}" width="${w.toFixed(2)}" height="${h.toFixed(2)}" style="fill:${gris}"/>`;
  }
  for (let k = 1; k < colonnes; k++) {
    const x = (m + k * w).toFixed(2);
    s += `<line x1="${x}" y1="${m}" x2="${x}" y2="${m + H}" stroke="#222" stroke-width="1.5"/>`;
  }
  for (let k = 1; k < lignes; k++) {
    const y = (m + k * h).toFixed(2);
    s += `<line x1="${m}" y1="${y}" x2="${m + L}" y2="${y}" stroke="#222" stroke-width="1.5"/>`;
  }
  s += `<rect x="${m}" y="${m}" width="${L}" height="${H}" fill="none" stroke="#222" stroke-width="1.5"/>`;
  return s + '</svg>';
}

/** Une part n/d dans la forme demandée */
function formeSVG(n, d, forme = DESSIN.forme) {
  if (forme === 'barre') return barreSVG(n, d);
  if (forme === 'rectangle') return rectangleSVG(n, d);
  return disqueSVG(n, d);
}

/** pieces : [{n, d}] → suite de dessins */
function disquesSVG(pieces, forme = DESSIN.forme) {
  return pieces.map(p => formeSVG(p.n, p.d, forme)).join('');
}

/** Écriture finale attendue : entier, fraction < 1, ou nombre mixte « 2+3/4 » (partie fractionnaire < 1) */
function estEcritureMixte(s) {
  s = String(s).replace(/\s+/g, '');
  if (/^[1-9]\d*$/.test(s)) return true;
  let m = /^(\d+)\/(\d+)$/.exec(s);
  if (m) return +m[1] > 0 && +m[1] < +m[2];
  m = /^([1-9]\d*)\+(\d+)\/(\d+)$/.exec(s);
  return !!m && +m[2] > 0 && +m[2] < +m[3];
}

/** Fin du calcul, à partir de « W + (N : q) » (W disques déjà comptés à part) :
 *  N : q = (e×q + r) : q = e + r/q. Programme de 6e : on décompose le dividende. */
function etapesMixte(W, N, q) {
  const e = Math.floor(N / q), r = N % q;
  const pre = W > 0 ? `${W}+` : '';
  if (N < q) return [`${pre}${N}/${q}`];
  if (r === 0) return W > 0 ? [`${W}+${e}`, `${W + e}`] : [`${e}`];
  const etapes = [W > 0 ? `${W}+((${e * q}+${r}):${q})` : `(${e * q}+${r}):${q}`];
  if (W > 0) etapes.push(`${W}+${e}+${r}/${q}`);
  etapes.push(`${W + e}+${r}/${q}`);
  return etapes;
}

const UN = { n: 1, d: 1 };

class EnonceDisque extends Enonce {
  constructor(opts = {}) {
    super(opts);
    this.baseOptions = {
      affichageReponse: 'brut',
      modeCorrection: { nombreAff: 'brut', correction: { result: true, etapes: false } },
      policies: {
        memeType: true,
        egalite: { mode: 'numerique', unite: 'exacte', epsilon: 1e-9 },
        format: { nombre: 'simple', exigerAtome: true, exigerExpression: false },
        suite: {
          continuerSiInvalide: true,
          continuerSiInegale: true,
          continuerSiMauvaiseNature: true,
          continuerSiFormatIncorrect: true
        }
      }
    };
  }

  /** Numérateurs p (pMin ≤ p < q) premiers avec q */
  _numerateurs(q, pMin = 1) {
    const ps = [];
    for (let p = pMin; p < q; p++) if (disquePgcd(p, q) === 1) ps.push(p);
    return ps;
  }

  _fractionIrreductible(denoms = DISQUE_DENOMS, pMin = 1) {
    const q = this.rng.pick(denoms);
    const ps = this._numerateurs(q, pMin);
    if (!ps.length) return this._fractionIrreductible(denoms.filter(x => x !== q), pMin);
    return { n: this.rng.pick(ps), d: q };
  }

  genVariant(index) {
    const so = this.sharedOptions || {};
    const niveau = DISQUE_NIVEAUX[so.niveau] !== undefined ? so.niveau : 1;
    const type = so.typeForce || this.rng.pick(typesDuNiveau(niveau));
    let unite = [UN], cherche, etapes, num, den;

    switch (type) {
      case 'E3': { // deux disques p1/q et p2/q, petits partages (q ≤ 5), plus d'une unité en tout
        const q = this.rng.pick([3, 4, 5]);
        let p1, p2;
        do { p1 = this.rng.int(1, q - 1); p2 = this.rng.int(1, q - 1); } while (p1 + p2 <= q);
        cherche = [{ n: p1, d: q }, { n: p2, d: q }];
        etapes = [`(${p1}:${q})+(${p2}:${q})`, `(${p1}+${p2}):${q}`, `${p1 + p2}:${q}`, ...etapesMixte(0, p1 + p2, q)];
        num = p1 + p2; den = q;
        break;
      }
      case 'R1': { // c disques identiques p/q, plus d'une unité en tout
        let f, c;
        do {
          f = this._fractionIrreductible([2, 3, 4, 5, 6, 8]);
          c = this.rng.int(2, 3);
        } while (c * f.n <= f.d || c * f.n > 3 * f.d);
        const N = c * f.n;
        cherche = Array(c).fill(f);
        etapes = [
          Array(c).fill(`(${f.n}:${f.d})`).join('+'),
          `(${Array(c).fill(f.n).join('+')}):${f.d}`,
          `${N}:${f.d}`,
          ...etapesMixte(0, N, f.d)
        ];
        num = N; den = f.d;
        break;
      }
      case 'R2': { // trois disques p1/q, p2/q, p3/q : plus d'une unité en tout
        const q = this.rng.pick([3, 4, 5, 6, 8]);
        const ps = this._numerateurs(q);
        let p;
        do { p = [this.rng.pick(ps), this.rng.pick(ps), this.rng.pick(ps)]; }
        while (p[0] + p[1] + p[2] <= q || p[0] + p[1] + p[2] > 3 * q || (p[0] === p[1] && p[1] === p[2]));
        const N = p[0] + p[1] + p[2];
        cherche = p.map(n => ({ n, d: q }));
        etapes = [
          p.map(n => `(${n}:${q})`).join('+'),
          `(${p.join('+')}):${q}`,
          `${N}:${q}`,
          ...etapesMixte(0, N, q)
        ];
        num = N; den = q;
        break;
      }
      case 'R3': { // deux disques p1/q et p2/q différents, plus d'une unité en tout (ex. 3/5 + 4/5)
        // Tous les numérateurs (2/4 se lit bien sur le dessin) ; q = 3 exclu : 1/3 + 2/3 ne dépasse pas 1
        const q = this.rng.pick([4, 5, 6, 8, 10]);
        let p1, p2;
        do { p1 = this.rng.int(1, q - 1); p2 = this.rng.int(1, q - 1); } while (p1 === p2 || p1 + p2 <= q);
        const N = p1 + p2;
        cherche = [{ n: p1, d: q }, { n: p2, d: q }];
        etapes = [`(${p1}:${q})+(${p2}:${q})`, `(${p1}+${p2}):${q}`, `${N}:${q}`, ...etapesMixte(0, N, q)];
        num = N; den = q;
        break;
      }
      case 'D1': case 'D2': { // a/q1 + b/q2 (D2 : + c/q2), q2 multiple de q1
        const [q1, q2] = this.rng.pick(DISQUE_PAIRES);
        const a = this.rng.pick(this._numerateurs(q1));
        const am = a * (q2 / q1);
        const bs = type === 'D2'
          ? [this.rng.pick(this._numerateurs(q2)), this.rng.pick(this._numerateurs(q2))]
          : [this.rng.pick(this._numerateurs(q2))];
        const N = am + bs.reduce((x, y) => x + y, 0);
        const termes = bs.map(b => `(${b}:${q2})`).join('+');
        cherche = [{ n: a, d: q1 }, ...bs.map(b => ({ n: b, d: q2 }))];
        etapes = [
          `(${a}:${q1})+${termes}`,
          `(${am}:${q2})+${termes}`,
          `(${[am, ...bs].join('+')}):${q2}`,
          `${N}:${q2}`,
          ...etapesMixte(0, N, q2)
        ];
        num = N; den = q2;
        break;
      }
      case 'U2': { // unité : 2 disques ; c disques p/q → une part = 1/(2q) d'unité
        let q, p, c;
        do {
          // p ≥ 2 : pas de parts unitaires dessinées
          q = this.rng.pick([3, 4, 5]);
          p = this.rng.pick(this._numerateurs(q, 2));
          c = this.rng.int(2, 5);
        } while (c * p === 2 * q || c * p > 3 * 2 * q);
        const D = 2 * q, N = c * p;
        unite = [UN, UN];
        cherche = Array(c).fill({ n: p, d: q });
        etapes = [`(1:${D})*${N}`, `${N}:${D}`, ...etapesMixte(0, N, D)];
        num = N; den = D;
        break;
      }
    }
    // Q toujours plus grand que 1 et non entier : sinon on retire
    if (num <= den || num % den === 0) return this.genVariant(index);
    const g = disquePgcd(num, den);
    const reponse = den / g === 1 ? `${num / g}` : `${num / g}/${den / g}`;
    // Correction : des écritures possibles de Q (pas des étapes), sans « : » ni soustraction —
    // somme des parts du dessin (2/3+2/3), multiplication si des disques sont pareils (2×2/3),
    // fraction (4/3), parts comptées (4×1/3), nombre mixte (1+1/3)
    // Niveau 3 : l'unité est 2 disques, une part p/q de disque vaut p/(2q) d'unité.
    const mixte = etapes[etapes.length - 1];
    const k = unite.length;
    const fracs = cherche.map(p => `${p.n}/${k * p.d}`);
    const somme = fracs.join('+');
    // Disques pareils regroupés : 3/4+1/4+3/4 → (2×3/4)+1/4
    const groupes = [];
    for (const f of fracs) {
      const g = groupes.find(x => x.f === f);
      if (g) g.c++; else groupes.push({ f, c: 1 });
    }
    let produit = null;
    if (groupes.some(x => x.c > 1)) {
      const termes = groupes.map(x => x.c > 1 ? `${x.c}*${x.f}` : x.f);
      produit = termes.length === 1 ? termes[0] : termes.map(t => t.includes('*') ? `(${t})` : t).join('+');
    }
    const correction = [...new Set([somme, produit, `${num}/${den}`, `${num}*1/${den}`, mixte].filter(Boolean))];
    // Forme tirée au hasard, utilisée si « Mélange » est choisi (même forme pour l'unité et la quantité)
    const formeHasard = this.rng.pick(FORMES_DESSIN);
    return { type, unite, cherche, reponse, etapes, correction, formeHasard };
  }

  toQuestionData(v) {
    const options = JSON.parse(JSON.stringify(this.baseOptions));
    const question = `
      <div class="disque-consigne">Écris $Q$ de 3 façons, dont le nombre mixte.</div>
      <div class="disque-tableau">
        <div class="disque-case">
          <div class="disque-titre">Unité</div>
          <div class="disque-dessins">${disquesSVG(v.unite, formeExercice(v))}</div>
          <div class="disque-legende">Quantité : $1$</div>
        </div>
        <div class="disque-case">
          <div class="disque-titre">Quantité cherchée</div>
          <div class="disque-dessins">${disquesSVG(v.cherche, formeExercice(v))}</div>
          <div class="disque-legende">$Q = \\,?$</div>
        </div>
      </div>`;
    return {
      question,
      expressionInitiale: v.reponse,
      etapes: v.etapes,
      correction: v.correction,
      options
    };
  }

  buildExercise(zone, index, onRejet = null) {
    const variant = this.genVariant(index);
    const questionData = this.toQuestionData(variant, index);
    questionData.options.affichageAvecLettre = 'Q';
    return new ExerciceDisque(zone, questionData, onRejet);
  }
}

/* ------------------------------------------------------------------
 * Saisie : accepte × x ÷ en plus de * et :
 * ------------------------------------------------------------------ */
function normaliserSaisieDisque(s) {
  return String(s)
    .replace(/[×·]/g, '*')
    .replace(/(\d)\s*[xX]\s*(?=[\d(])/g, '$1*')
    .replace(/\)\s*[xX]\s*(?=[\d(])/g, ')*')
    .replace(/÷/g, ':');
}

/* ------------------------------------------------------------------
 * Programme de 6e : pas de priorités opératoires, tout est parenthésé.
 * Dans chaque niveau de parenthèses : une seule opération, ou une suite
 * de + (ou de ×) seulement. « 1:4*3 » ou « 2*1+1:4 » sont refusés.
 * (« 3/4 » est un nombre, pas une opération.)
 * ------------------------------------------------------------------ */
function parenthesageComplet(tokens) {
  const groupeOk = (ops) => ops.length <= 1
    || (ops.every(o => o === ops[0]) && (ops[0] === '+' || ops[0] === '*'));
  const pile = [[]];
  for (const t of tokens || []) {
    if (t === '(') pile.push([]);
    else if (t === ')') {
      if (pile.length < 2 || !groupeOk(pile.pop())) return false;
    }
    else if (t === '+' || t === '-' || t === '*' || t === ':') pile[pile.length - 1].push(t);
  }
  return pile.length === 1 && groupeOk(pile[0]);
}

class InputWrapperDisque extends InputWrapper {
  constructor(...args) {
    super(...args);
    this.input.placeholder = 'Écris ta réponse ici';
  }
  appliquerVerdict(verdict) {
    // Fractions en grand (\displaystyle) dans la ligne affichée
    const arbre = this.currentAnswer?.arbre;
    if (arbre?.toLatex && !arbre._grand) {
      const toLatex = arbre.toLatex.bind(arbre);
      arbre.toLatex = o => '\\displaystyle ' + toLatex(o);
      arbre._grand = true;
    }
    // Valeur juste mais ligne non retenue (déjà écrite) :
    // signe « = » (c'est bien égal), croix pour l'effacer
    if (verdict.status === 'need_more') return super.appliquerVerdict({ ...verdict, status: 'ok' });
    super.appliquerVerdict(verdict);
    // Ligne acceptée : pas de croix pour l'effacer
    if (verdict.status === 'ok') this.comment.querySelector('.close-button')?.remove();
  }

  handleKeydown(event) {
    if (event.key === 'Enter' && this.input) {
      this.input.value = normaliserSaisieDisque(this.input.value);
      if (typeof evalCount !== 'undefined') evalCount = 0;
    }
    super.handleKeydown(event);
  }
}

/* ------------------------------------------------------------------
 * Exercice : dernière ligne = nombre mixte (expression facultative).
 * ------------------------------------------------------------------ */
class ExerciceDisque extends ExerciceExpression {
  constructor(container, questionData, onRejet) {
    super(container, questionData, onRejet);
    const base = this.grader;
    this.grader = { evaluer: (ini, ans) => this._evaluerDisque(base, ini, ans) };
  }

  _evaluerDisque(base, ini, ans) {
    // Le moteur bloque tout au-delà de 10 000 évaluations depuis le chargement
    // de la page (garde-fou anti-boucle) : on remet le compteur à zéro à chaque saisie.
    if (typeof evalCount !== 'undefined') evalCount = 0;
    if (!ans?.isValid?.()) {
      return { status: 'invalid_parse', meta: {}, message: 'Écriture non reconnue.' };
    }
    if (!parenthesageComplet(ans.tokens)) {
      return { status: 'invalid_parse', meta: {}, message: 'Mets des parenthèses.' };
    }
    let v;
    try {
      v = base.evaluer(ini, ans);
    } catch (e) {
      return { status: 'invalid_parse', meta: {}, message: 'Écriture non reconnue.' };
    }
    if (v.status === 'wrong_nature') return { status: 'wrong_nature', meta: {}, message: "Pas d'unité ici." };
    if (v.status === 'invalid_parse') return { ...v, message: 'Écriture non reconnue.' };
    if (v.status !== 'ok' && v.status !== 'correct') {
      return { status: 'unequal', meta: {}, message: "Ce n'est pas la quantité cherchée." };
    }
    // Pas de signe de division ici : la ligne est juste, mais elle ne compte pas (pas une erreur)
    if ((ans.tokens || []).includes(':')) {
      return { status: 'need_more', meta: {}, message: "C'est juste, mais « : » n'est pas autorisé." };
    }

    // Valeur juste : il faut FORMES_MIN écritures différentes, dont le nombre mixte (à n'importe quelle ligne)
    const formes = this._formes || (this._formes = []);
    const ecriture = String(ans.expression).replace(/\s+/g, '');
    if (formes.includes(ecriture)) return { status: 'need_more', meta: {}, message: 'Déjà écrit.' };
    formes.push(ecriture);
    this._lignesOk = formes.length;
    const avecMixte = formes.some(estEcritureMixte);
    const manque = FORMES_MIN - formes.length;
    if (manque <= 0 && avecMixte) return { status: 'correct', meta: {}, message: '✅ Bravo !' };
    if (manque <= 0) return { status: 'ok', meta: {}, message: 'Juste. Écris aussi le nombre mixte.' };
    const encore = manque === 1 ? 'Encore 1 écriture.' : `Encore ${manque} écritures.`;
    return { status: 'ok', meta: {}, message: `Juste. ${encore}` };
  }

  /** Ligne juste mais non retenue : pas une erreur, on rouvre une ligne */
  _onGradeResult(e) {
    if (e.detail?.status === 'need_more') return this._createInputWrapper();
    return super._onGradeResult(e);
  }

  _createInputWrapper() {
    if (this.inputWrapper) this.inputWrapper.disable();
    this.inputWrapper = new InputWrapperDisque(
      this._getReferenceObjetForGrading(),
      this.reponseDiv,
      this.questionData.options
    );
    // « Q = » réécrit à chaque ligne
    this.inputWrapper._prefixLetter = this._prefixLetter;
    this.inputWrapper.input.placeholder = (this._lignesOk || 0) === 0
      ? 'Écris ta réponse ici'
      : 'Continue le calcul';
    this._reindexPrefixes();
  }

  _reindexPrefixes() {
    const wrappers = Array.from(this.reponseDiv?.querySelectorAll('.input-wrapper') || []);
    wrappers.forEach((w, i) => {
      const inst = w.instance;
      if (!inst) return;
      inst.index = i + 1; // jamais de « = » fantôme
      if (typeof inst._buildPrefixe === 'function') inst._buildPrefixe();
    });
  }

  /** Abandon : correction affichée en Atelier, pas en Quiz */
  abandonner({ sansCorrection = false } = {}) {
    // On retire la ligne de saisie vide restée ouverte
    if (this.inputWrapper && !this.inputWrapper.currentAnswer) this.inputWrapper.wrapper.remove();
    if (!sansCorrection) this._correction();
    if (this.status !== 'correct') {
      this._finish('incorrect', { status: 'forced_by_correction' });
    }
  }

  _correction() {
    const host = this.correctionDiv;
    host.style.display = 'block';
    host.style.padding = '14px';
    host.innerHTML = '<p class="propositions-titre">Quelques écritures possibles :</p>';
    const props = this.questionData.correction || [];
    props.forEach((e, i) => {
      const line = document.createElement('div');
      line.className = 'etape proposition';
      const prefix = document.createElement('span');
      prefix.className = 'etape-egal equal-sign';
      prefix.textContent = 'Q\u00A0=';
      const expr = document.createElement('span');
      expr.className = 'etape-expr';
      expr.innerHTML = `\\(\\displaystyle ${fractionTex(e, { ecran: true })}\\)`;
      line.append(prefix, expr);
      if (i === props.length - 1 && e.includes('+')) {
        const note = document.createElement('span');
        note.className = 'proposition-note';
        note.textContent = 'nombre mixte';
        line.append(note);
      }
      host.appendChild(line);
    });
    try {
      if (window.MathJax?.typesetPromise) window.MathJax.typesetPromise([host]);
    } catch (e) { console.error(e); }
  }
}

/** « (3:4)+(3:4) » → « (3 : 4) + (3 : 4) » ; « 2+3/4 » → « 2 + \dfrac{3}{4} ».
 *  À l'écran : « ÷ » et \frac, comme les lignes tapées par l'élève. */
function fractionTex(expr, { ecran = false } = {}) {
  return String(expr)
    .replace(/(\d+)\/(\d+)/g, ecran ? '\\frac{$1}{$2}' : '\\dfrac{$1}{$2}')
    .replace(/\*/g, '\\times ')
    .replace(/:/g, ecran ? ' \\div ' : ' : ')
    .replace(/\+/g, ' + ')
    .replace(/-/g, ' - ');
}

window.EnonceDisque = EnonceDisque;
