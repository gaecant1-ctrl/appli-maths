


class Fraction {

  // ================= CONSTRUCTION =================
  constructor(num, den) {
    if (den === 0) throw new Error("Dénominateur nul");

    // fraction brute (trace du calcul)
    this.nb = num;
    this.db = den;

    // normalisation du signe
    if (this.db < 0) {
      this.nb = -this.nb;
      this.db = -this.db;
    }

    // fraction canonique (simplifiée)
    const g = Fraction.gcd(Math.abs(this.nb), Math.abs(this.db));
    this.n = this.nb / g;
    this.d = this.db / g;

    // statut déterministe
    this.statut = this.computeStatut();
  }

  // ================= OUTILS MATH =================
  static gcd(a, b) {
    while (b !== 0) [a, b] = [b, a % b];
    return a;
  }

  isEntier() {
    return this.d === 1;
  }

  valeurAbsolue() {
    return Math.abs(this.n / this.d);
  }

  estDecimaleExacte() {
    let d = this.d;
    while (d % 2 === 0) d /= 2;
    while (d % 5 === 0) d /= 5;
    return d === 1;
  }

  // ================= STATUT (SANS HASARD) =================
  computeStatut() {

    // ENTIER
    if (this.isEntier()) {
      return "entier";
    }

    // FRACTION STRICTE (< 1)
    if (Math.abs(this.n) < Math.abs(this.d)) {
      if (this.estDecimaleExacte()) {
        return "decimal";
      }
      return "simplifie";
    }

    // FRACTION IMPROPRE (>= 1)
    if (this.estDecimaleExacte()) {
      return "decimal";
    }

    return "mixte_simplifie";
  }

  // ================= AFFICHAGES TEXTE =================
  toString() {
    switch (this.statut) {

      case "entier":
        return `${this.n}`;

      case "simplifie":
        return `${this.n}/${this.d}`;

      case "mixte_simplifie":
        return this.mixedString(this.n, this.d);

      case "decimal":
        return (this.n / this.d).toString();

      default:
        throw new Error("Statut inconnu : " + this.statut);
    }
  }

  mixedString(num, den) {
    const e = Math.trunc(num / den);
    const r = Math.abs(num - e * den);
    return `${e}+${r}/${den}`;
  }

  // ================= ÉGALITÉ MATH =================
  equals(other) {
    return this.n === other.n && this.d === other.d;
  }

  // ================= AFFICHAGES LaTeX =================
toLatex(statutImpose = null){

  // 🔥 PRIORITÉ ABSOLUE AUX ENTIERS
  if(this.isEntier()){
    return `${this.n}`;
  }

  const statut = statutImpose || this.statut;

  switch(statut){

    case "simplifie":
      return `\\dfrac{${this.n}}{${this.d}}`;

    case "mixte_simplifie":
      return this.latexMixte(this.n, this.d);

    case "decimal":
      return (this.n / this.d).toString().replace(".", ",");

    case "entier": // sécurité (au cas où)
      return `${this.n}`;

    default:
      throw new Error("Statut LaTeX inconnu : " + statut);
  }
}

  latexMixte(num, den){
    const e = Math.trunc(num / den);
    const r = Math.abs(num - e * den);
    return `${e}+\\dfrac{${r}}{${den}}`;
  }
}


// ======================
// STRUCTURE DE NIVEAU
// ======================

// ============================================================
// SYSTÈME DE RÈGLES PAR NIVEAU
// ============================================================
// Chaque règle est une fonction nommée (ctx) => boolean qui répond à la
// question "cette opération doit-elle être INTERDITE ?" (true = interdite).
// Un niveau n'est plus qu'une liste de noms de règles actives : ajouter un
// niveau (4e, 3e...) ou faire évoluer 6e/5e se fait en listant des noms,
// sans toucher à la logique de vérification elle-même.
//
// ctx = { op: "+|-|*|:", gauche: {valeur, type}, droite: {valeur, type} }
// ============================================================

const REGLES = {

  // Diviser par une fraction est hors-programme tant que la division par
  // un nombre non entier n'a pas été introduite.
  interditFractionDiviseur(ctx){
    return ctx.op === ":" && ctx.droite.type === "fraction";
  },

  // Division par zéro : toujours interdite, à tout niveau.
  interditDivisionParZero(ctx){
    return ctx.op === ":" && ctx.droite.valeur === 0;
  },

  // Aucun opérande déjà négatif n'est autorisé en entrée d'opération.
  // Vérifié explicitement (plutôt que de compter implicitement sur le fait
  // qu'une étape antérieure ait déjà bloqué tout négatif) pour rester
  // robuste même si la structure de génération évolue.
  interditEntreeNegative(ctx){
    return ctx.gauche.valeur < 0 || ctx.droite.valeur < 0;
  },

  // Le résultat de CETTE opération précise ne doit pas être négatif.
  // Calculé explicitement plutôt que déduit de "op === '-'" : entre deux
  // opérandes positifs, seule la soustraction peut produire un négatif,
  // mais on ne veut pas supposer ça, on le calcule.
  interditResultatNegatif(ctx){
    const r = calculerValeur(ctx.op, ctx.gauche.valeur, ctx.droite.valeur);
    return r === null || r < 0;
  },

  // Multiplier ou diviser deux négatifs entre eux suppose la règle des
  // signes "− × − = +", pas encore vue à ce niveau. Multiplier/diviser
  // PAR un négatif (un seul facteur négatif) reste autorisé.
  interditNegNegMultDiv(ctx){
    return (ctx.op === "*" || ctx.op === ":")
      && ctx.gauche.valeur < 0
      && ctx.droite.valeur < 0;
  },

};

// Calcule la valeur numérique d'une opération ; utilisé par les règles pour
// vérifier le signe du résultat avant de construire la vraie Fraction
// (évite de dépendre d'applyOp, qui vit dans le script du jeu, pas ici).
function calculerValeur(op, g, d){
  switch(op){
    case "+": return g + d;
    case "-": return g - d;
    case "*": return g * d;
    case ":": return d === 0 ? null : g / d;
    default: return null;
  }
}

// ======================
// NIVEAU (générique)
// ======================
// Un niveau est entièrement défini par la liste des règles qu'il active.
// autoriseOperation() reste la même pour tous les niveaux : elle applique
// chaque règle nommée et refuse dès que l'une d'elles interdit l'opération.

class Niveau {

  constructor(reglesActives = [], options = {}){
    this.reglesActives = reglesActives;

    // jetonsRelatifs : si true, les jetons de départ (avant toute opération)
    // peuvent être négatifs ; sinon ils restent dans 1..9 comme avant.
    this.jetonsRelatifs = options.jetonsRelatifs || false;

    // Garde-fou : si un nom de règle n'existe pas dans REGLES, on le signale
    // tout de suite (faute de frappe lors de la définition d'un niveau)
    // plutôt que de laisser une règle silencieusement ignorée.
    for(const nom of reglesActives){
      if(typeof REGLES[nom] !== "function"){
        throw new Error(`Règle inconnue : "${nom}". Vérifie son nom dans REGLES.`);
      }
    }
  }

  autoriseOperation(ctx){
    for(const nom of this.reglesActives){
      if(REGLES[nom](ctx)){
        return false; // une règle interdit l'opération : on s'arrête là
      }
    }
    return true;
  }

  // Génère un jeton de départ (1..9, et -9..-1 aussi si jetonsRelatifs).
  // C'est le niveau qui décide de cette plage, pas le script du jeu, pour
  // que toute la configuration d'un niveau reste centralisée ici.
  genererJeton(){
    const valeurAbsolue = Math.floor(Math.random() * 9) + 1;
    if(this.jetonsRelatifs && Math.random() < 0.5){
      return -valeurAbsolue;
    }
    return valeurAbsolue;
  }
}

// ======================
// NIVEAU 6e
// ======================
// Programme officiel 6e : aucun nombre relatif (entrée, intermédiaire ou
// résultat final), pas de division par une fraction ni par zéro.

class Niveau6 extends Niveau {
  constructor(){
    super([
      "interditEntreeNegative",
      "interditResultatNegatif",
      "interditFractionDiviseur",
      "interditDivisionParZero",
    ]); // jetonsRelatifs reste false par défaut
  }
}

// ======================
// NIVEAU 5e
// ======================
// Les relatifs sont permis (entrée, intermédiaire, résultat), addition et
// soustraction de relatifs comprises. Seule la règle des signes pour la
// multiplication/division de deux négatifs n'est pas encore vue.
// Les JETONS eux-mêmes peuvent aussi être relatifs dès le départ.

class Niveau5 extends Niveau {
  constructor(){
    super([
      "interditFractionDiviseur",
      "interditDivisionParZero",
      "interditNegNegMultDiv",
    ], { jetonsRelatifs: true });
  }
}

// ======================
// NIVEAU 4e
// ======================
// Comme la 5e (relatifs partout, jetons compris), mais la règle des signes
// pour la multiplication/division de deux négatifs est désormais acquise :
// produit et quotient de deux négatifs sont autorisés (pas de règle
// interditNegNegMultDiv ici, contrairement à Niveau5).

class Niveau4 extends Niveau {
  constructor(){
    super([
      "interditFractionDiviseur",
      "interditDivisionParZero",
    ], { jetonsRelatifs: true });
  }
}

