/* ================================================================
   GenerateurMystere.js — tirage de la fonction mystère
   Dépend de calcul-mv.js (evalMV), à charger AVANT ce fichier.

   Isole tout le tirage aléatoire (gabarit, coefficients, pas, valeur
   initiale). Les attributs publics SONT les réglages du panneau latéral :
   le reste de l'appli les lit/modifie directement (generateur.pas = ...),
   y compris en mode "dé" où nouvelleFonction() les met à jour lui-même.
================================================================ */

export class GenerateurMystere {
  static FRACTIONS_SIMPLES = ['1/2', '1/3', '2/3', '1/4', '3/4'];

  // Réglages — lus et modifiés par le panneau latéral.
  simpleActif = true;
  affineActif = true;
  typesNombresActifs = new Set(['simple']); // 'simple' | 'negatif' | 'fraction' — non exclusif

  pasMode = 'fixe';    // 'fixe' | 'de'
  pas = 1;             // valeur fixe, ou dernière valeur tirée en mode dé

  startNMode = 'fixe'; // 'fixe' | 'de'
  startN = 0;          // valeur fixe, ou dernière valeur tirée en mode dé

  // ------------------------------------------------------------
  // API PUBLIQUE
  // ------------------------------------------------------------

  /** Les 6 valeurs de n affichées, à partir de startN/pas courants. */
  getNValues() {
    return Array.from({ length: 6 }, (_, i) => this.startN + i * this.pas);
  }

  /** Plage du tirage "dé" pour la valeur initiale : -10/10 si Négatif est
   *  actif (des n négatifs ont du sens), sinon 0/10. Exposée pour que l'UI
   *  puisse régler l'attribut min de l'input manuel. */
  plageValeurInitiale() {
    return this.typesNombresActifs.has('negatif') ? { min: -10, max: 10 } : { min: 0, max: 10 };
  }

  /** Tire une nouvelle fonction mystère ; si pasMode/startNMode valent
   *  'de', met aussi à jour this.pas / this.startN. Renvoie
   *  { expr, estAffine, directeur }. */
  nouvelleFonction() {
    const choix = this.#choisirGabarit();

    if (this.pasMode === 'de') {
      this.pas = this.#tirerPasDe(choix);
    }
    if (this.startNMode === 'de') {
      this.startN = this.#tirerValeurInitialeDe(choix);
    }

    return choix;
  }

  // ------------------------------------------------------------
  // TIRAGE DES COEFFICIENTS (privé)
  // ------------------------------------------------------------

  /** Tire un nombre dont la nature (simple / négatif / fraction) dépend des
   *  types actifs — un type est tiré au hasard parmi les actifs à chaque
   *  appel, comme pour Mode et Pas. */
  #tirerNombre(max) {
    const types = [...this.typesNombresActifs];
    const type = types[Math.floor(Math.random() * types.length)];

    if (type === 'fraction') {
      const fractions = GenerateurMystere.FRACTIONS_SIMPLES;
      return fractions[Math.floor(Math.random() * fractions.length)];
    }

    const n = Math.floor(1 + Math.random() * max);
    return type === 'negatif' ? -n : n;
  }

    #tirerNombreSansFrac(max) {
    const types = [...this.typesNombresActifs];
    const type = types[Math.floor(Math.random() * types.length)];


    const n = Math.floor(1 + Math.random() * max);
    return type === 'negatif' ? -n : n;
  }


  /** Comme #tirerNombre(), mais exclut le type 'fraction'. À n'utiliser que
   *  lorsqu'on sait qu'un type non-fractionnaire est actif (voir
   *  #genererPaireAffine), sinon la liste de types peut être vide. */
  #tirerNombreSansFraction(max) {
    const types = [...this.typesNombresActifs].filter(t => t !== 'fraction');
    const type = types[Math.floor(Math.random() * types.length)];
    const n = Math.floor(1 + Math.random() * max);
    return type === 'negatif' ? -n : n;
  }

  static #estFraction(coeff) {
    return typeof coeff === 'string' && coeff.includes('/');
  }

  /** Dénominateur d'un coefficient ("1/4" → 4, entier → 1, null → null). */
  static #denominateurCoefficient(coeff) {
    if (coeff === null || coeff === undefined) return null;
    if (typeof coeff === 'number') return 1;
    const parts = String(coeff).split('/');
    return parts.length === 2 ? Math.abs(parseInt(parts[1], 10)) : 1;
  }

  /** Tire une fraction de FRACTIONS_SIMPLES qui a le MÊME dénominateur que
   *  coeffFraction (ex: "1/3" → "1/3" ou "2/3"). */
  #tirerFractionMemeDenominateur(coeffFraction) {
    const denom = GenerateurMystere.#denominateurCoefficient(coeffFraction);
    const options = GenerateurMystere.FRACTIONS_SIMPLES.filter(
      f => GenerateurMystere.#denominateurCoefficient(f) === denom
    );
    return options[Math.floor(Math.random() * options.length)];
  }

  /** Tire (directeur, constante) pour un gabarit "directeur*n + constante",
   *  en écartant le seul cas mathématiquement impossible à rendre entier :
   *  un directeur ENTIER ne peut jamais compenser une constante
   *  FRACTIONNAIRE (le terme directeur*n est toujours entier, quel que soit
   *  n). Les trois autres cas sont tous valides :
   *    - directeur entier,        constante entière        → rien à faire
   *    - directeur fractionnaire, constante entière        → rien à faire
   *      (on peut toujours choisir n multiple du dénominateur du directeur)
   *    - directeur fractionnaire, constante fractionnaire, MÊME dénominateur
   *      → on aligne le dénominateur de la constante sur celui du directeur
   *        si le tirage initial les a rendus différents (ex: 1/3 et 1/4). */
  #genererPaireAffine(maxDirecteur, maxConstante) {
    const directeur = this.#tirerNombre(maxDirecteur);
    let constante = this.#tirerNombre(maxConstante);

    if (!GenerateurMystere.#estFraction(directeur) && GenerateurMystere.#estFraction(constante)) {
      // Cas impossible (entier + fraction) : on sait qu'un type non-fractionnaire
      // est actif puisque `directeur` vient d'en tirer un.
      constante = this.#tirerNombreSansFraction(maxConstante);
    } else if (
      GenerateurMystere.#estFraction(directeur) &&
      GenerateurMystere.#estFraction(constante) &&
      GenerateurMystere.#denominateurCoefficient(directeur) !== GenerateurMystere.#denominateurCoefficient(constante)
    ) {
      constante = this.#tirerFractionMemeDenominateur(directeur);
    }

    return { directeur, constante };
  }

  // ------------------------------------------------------------
  // CHOIX DU GABARIT (privé)
  // ------------------------------------------------------------

  /** Renvoie { expr, estAffine, directeur } : directeur = coefficient qui
   *  multiplie n (utile pour contraindre le pas et la valeur initiale "dé"). */
  #choisirGabarit() {
    const uSeul = this.#tirerNombre(5);            // pour "u*n" seul : pas de constante, aucune contrainte
    const pairUV = this.#genererPaireAffine(5, 3); // pour "u*n + v"
    const pairVU = this.#genererPaireAffine(3, 5); // pour "v*n + u"
    const vSimple = this.#tirerNombre(3);          // gabarits quadratiques : aucune contrainte
    const vSimpleUn = this.#tirerNombre(1);          // gabarits quadratiques : aucune contrainte
    const vSimpleSans = this.#tirerNombre(1);  

    const templatesAffine = [
      { expr: `${uSeul}*n`, directeur: uSeul },
      { expr: `${pairUV.directeur}*n+${pairUV.constante}`, directeur: pairUV.directeur },
      { expr: `${pairVU.directeur}*n+${pairVU.constante}`, directeur: pairVU.directeur }
    ];

    const templatesSimple = [
      { expr: `${vSimple}*n*n`, directeur: null },
      { expr: `${vSimpleUn}n*(n+${vSimpleUn})`, directeur: null },
      { expr: `${vSimpleUn}*(n+1)^2`, directeur: null }
    ];

    let pool = [];
    if (this.simpleActif) pool = pool.concat(templatesSimple.map(t => ({ ...t, estAffine: false })));
    if (this.affineActif) pool = pool.concat(templatesAffine.map(t => ({ ...t, estAffine: true })));
    if (pool.length === 0) {
      pool = templatesSimple.map(t => ({ ...t, estAffine: false }))
        .concat(templatesAffine.map(t => ({ ...t, estAffine: true })));
    }

    return pool[Math.floor(Math.random() * pool.length)];
  }

  // ------------------------------------------------------------
  // PAS / VALEUR INITIALE "DÉ" (privé)
  // ------------------------------------------------------------

  /** Pour un mystère affine au coefficient directeur fractionnaire, le pas
   *  tiré est un multiple du dénominateur (entre 1 et 10), pour que
   *  l'accroissement entre deux valeurs de n reste un nombre simple. */
  #tirerPasDe(choix) {
    const denom = GenerateurMystere.#denominateurCoefficient(choix.estAffine ? choix.directeur : null);

    if (!denom || denom === 1) {
      return Math.floor(1 + Math.random() * 10);
    }

    const multiples = [];
    for (let m = denom; m <= 10; m += denom) multiples.push(m);

    return multiples[Math.floor(Math.random() * multiples.length)];
  }

  static #imageEstEntiere(poly) {
    if (!poly.estConstant()) return false;
    if (poly.monomes.length === 0) return true; // image nulle
    return poly.monomes[0].coeff.isEntier();
  }

  /** Pour un mystère affine, on ne retient que les valeurs (dans la plage
   *  de plageValeurInitiale()) dont l'IMAGE f(valeur) est un entier — on
   *  teste l'évaluation complète (directeur ET constante) plutôt que de ne
   *  regarder que le dénominateur du directeur. */
  #tirerValeurInitialeDe(choix) {
    const { min, max } = this.plageValeurInitiale();
    const tirageUniforme = () => min + Math.floor(Math.random() * (max - min + 1));

    if (!choix.estAffine) {
      return tirageUniforme();
    }

    const candidats = [];
    for (let n = min; n <= max; n++) {
      const image = evalMV(choix.expr.replace(/n/g, `(${n})`));
      if (image && GenerateurMystere.#imageEstEntiere(image)) candidats.push(n);
    }

    return candidats.length
      ? candidats[Math.floor(Math.random() * candidats.length)]
      : tirageUniforme();
  }
}
