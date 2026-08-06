// ============================================================
// ProblemeSchema.js — génération d'exercices "problème + schéma en
// barres" avec une inconnue x, et correction en deux temps (expression
// puis valeur).
// ------------------------------------------------------------
// Tout est une Grandeur (valeur + nature éventuelle — scalaire, prix,
// masse...). On sépare deux couches :
//   - FORME  : l'algèbre + le schéma d'une catégorie de problème,
//              générique sur la nature (elle demande juste "fabrique-moi
//              une grandeur aléatoire" à `fabriquer`, sans savoir si
//              c'est un scalaire, un prix, une masse...).
//   - HISTOIRE : la phrase française d'une (forme, nature) donnée — c'est
//                la seule chose qui change selon qu'on raconte des
//                billes, des euros ou des kilos.
// `genererProbleme` choisit une forme + une nature compatible (celles
// pour qui une histoire existe) et assemble le problème final.
// ------------------------------------------------------------
// Deux réglages indépendants :
//   - "taille" (NIVEAUX_SCHEMA : petit/moyen/grand) fixe l'ampleur des
//     nombres tirés au hasard ;
//   - "complexite" choisit PARMI QUELLES formes on tire, selon le nombre
//     d'OPÉRATIONS dans l'expression attendue pour x.
// ------------------------------------------------------------
// Chaque problème assemblé porte :
//   - un énoncé textuel (les nombres y apparaissent en LaTeX, voir tex()),
//   - un SchemaBarres (voir SchemaBarres.js),
//   - attendu.atomes : les Grandeur que l'expression tapée par l'élève
//     doit utiliser, chacune une fois (voir comparerExpressionSchema),
//   - inconnue : la Grandeur attendue pour x.
// ============================================================

const NIVEAUX_SCHEMA = {
  petit: { min: 2,  max: 20 },
  moyen: { min: 5,  max: 60 },
  grand: { min: 10, max: 200 },
};

/** Couleurs des segments du schéma : reflètent à quelle partie du tout
 *  matériel appartient un segment (ex: billes rouges/bleues/vertes, ou
 *  part de Paul/part de Léa) — pas son statut connu/inconnu. */
const COULEUR_ROUGE = '#f6d9d5';
const COULEUR_BLEU = '#d7e6f2';
const COULEUR_VERT = '#d7f0e1';
const COULEUR_JAUNE = '#faf0c2';

function entierAleatoireSchema(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

/** Rendu LaTeX inline d'une grandeur, prêt à être inséré dans un énoncé
 *  (rendu via textContent + MathJax, voir app.js:rendreProbleme — MathJax
 *  repère les délimiteurs \( \) dans le texte quel que soit le moyen par
 *  lequel il y est arrivé). */
function tex(grandeur) {
  return `\\(${grandeur.toLatex()}\\)`;
}

function magnitude(grandeur) {
  const { a, b } = grandeur.valeur.valeurNum;
  return a / b;
}

// ------------------------------------------------------------------
// Natures : comment fabriquer une grandeur aléatoire de cette nature.
// C'est le SEUL endroit qui sait qu'un scalaire n'a pas d'unité et qu'un
// prix se note en €.
// ------------------------------------------------------------------

const NATURES = {
  scalaire: {
    fabriquer: (niveau) => new Grandeur(new Nombre(String(entierAleatoireSchema(niveau.min, niveau.max))), {}),
  },
  Prix: {
    fabriquer: (niveau) => new Grandeur(new Nombre(String(entierAleatoireSchema(niveau.min, niveau.max))), { '€': 1 }),
  },
  Masse: {
    fabriquer: (niveau) => new Grandeur(new Nombre(String(entierAleatoireSchema(niveau.min, niveau.max))), { 'kg': 1 }),
  },
  Longueur: {
    fabriquer: (niveau) => new Grandeur(new Nombre(String(entierAleatoireSchema(niveau.min, niveau.max))), { 'm': 1 }),
  },
  // Masse en GRAMMES plutôt qu'en kg — le moteur convertit déjà g/kg
  // (table d'unités de Grandeur.js), donc énoncé et réponse en "g"
  // restent cohérents de bout en bout (contrairement à afficher "g" en
  // façade sur une grandeur construite en kg). Nature à part, utilisée
  // uniquement par les histoires qui en ont explicitement besoin.
  MasseGrammes: {
    fabriquer: (niveau) => new Grandeur(new Nombre(String(entierAleatoireSchema(niveau.min, niveau.max))), { 'g': 1 }),
  },
};

// ------------------------------------------------------------------
// Formes : l'algèbre + le schéma d'une catégorie de problème, générique
// sur la nature. `construire(fabriquer, niveau)` renvoie :
//   - valeurs   : toutes les grandeurs/paramètres nommés (pour l'histoire)
//   - grandeurs : celles qui sont CONNUES dans l'énoncé (= attendu.atomes)
//   - inconnue  : la grandeur attendue pour x
//   - schema    : le SchemaBarres correspondant
// ------------------------------------------------------------------

const FORMES = {

  // ---- Somme : deux parts connues -> total inconnu ------------------
  somme: {
    complexite: 'facile',
    construire(fabriquer, niveau) {
      const g1 = fabriquer(niveau);
      const g2 = fabriquer(niveau);
      const total = g1.add(g2);
      return {
        valeurs: { g1, g2, total },
        grandeurs: { g1, g2 },
        inconnue: total,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.inconnu())
          .ajouterPart(SegmentSchema.connu(g1, COULEUR_ROUGE))
          .ajouterPart(SegmentSchema.connu(g2, COULEUR_BLEU)),
      };
    },
  },

  // ---- Complément : total et une part connus -> part manquante ------
  complement: {
    complexite: 'facile',
    construire(fabriquer, niveau) {
      const part = fabriquer(niveau);
      const autre = fabriquer(niveau);
      const total = part.add(autre);
      return {
        valeurs: { total, part, autre },
        grandeurs: { total, part },
        inconnue: autre,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterPart(SegmentSchema.connu(part, COULEUR_ROUGE))
          .ajouterPart(SegmentSchema.inconnu(COULEUR_BLEU)),
      };
    },
  },

  // ---- Écart : la plus grande quantité connue = la plus petite connue
  // + l'écart inconnu. Même schéma que "complement" : ce n'est pas deux
  // barres indépendantes, mais un tout (le grand nombre) réparti en deux
  // parts (le petit nombre + l'écart).
  ecart: {
    complexite: 'facile',
    construire(fabriquer, niveau) {
      let a = fabriquer(niveau);
      let b = fabriquer(niveau);
      if (magnitude(a) === magnitude(b)) b = new Grandeur(b.valeur.add(new Nombre('1')), b.uniteDict);
      const [grand, petit] = magnitude(a) >= magnitude(b) ? [a, b] : [b, a];
      const inconnue = grand.sub(petit);
      return {
        valeurs: { grand, petit, ecart: inconnue },
        grandeurs: { grand, petit },
        inconnue,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(grand))
          .ajouterPart(SegmentSchema.connu(petit, COULEUR_ROUGE))
          .ajouterPart(SegmentSchema.inconnu(COULEUR_JAUNE)),
      };
    },
  },

  // ---- Somme à trois termes : trois parts connues -> total inconnu --
  sommeTrois: {
    complexite: 'moyen',
    construire(fabriquer, niveau) {
      const g1 = fabriquer(niveau);
      const g2 = fabriquer(niveau);
      const g3 = fabriquer(niveau);
      const total = g1.add(g2).add(g3);
      return {
        valeurs: { g1, g2, g3, total },
        grandeurs: { g1, g2, g3 },
        inconnue: total,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.inconnu())
          .ajouterPart(SegmentSchema.connu(g1, COULEUR_ROUGE))
          .ajouterPart(SegmentSchema.connu(g2, COULEUR_BLEU))
          .ajouterPart(SegmentSchema.connu(g3, COULEUR_VERT)),
      };
    },
  },

  // ---- Complément à trois termes : total + deux parts connus -> 3e --
  complementTrois: {
    complexite: 'moyen',
    construire(fabriquer, niveau) {
      const g1 = fabriquer(niveau);
      const g2 = fabriquer(niveau);
      const g3 = fabriquer(niveau);
      const total = g1.add(g2).add(g3);
      return {
        valeurs: { total, g1, g2, g3 },
        grandeurs: { total, g1, g2 },
        inconnue: g3,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterPart(SegmentSchema.connu(g1, COULEUR_ROUGE))
          .ajouterPart(SegmentSchema.connu(g2, COULEUR_BLEU))
          .ajouterPart(SegmentSchema.inconnu(COULEUR_VERT)),
      };
    },
  },

  // ---- Comparaison additive : Léo = Paul + écart, ensemble = total --
  comparaisonAdditive: {
    complexite: 'difficile',
    construire(fabriquer, niveau) {
      const paul = fabriquer(niveau);
      const ecart = fabriquer({ min: 2, max: Math.max(2, Math.floor(niveau.max / 3)) });
      const leo = paul.add(ecart);
      const total = paul.add(leo);
      const deux = new Grandeur(new Nombre('2'), {});
      return {
        valeurs: { total, ecart, leo, paul, deux },
        grandeurs: { total, ecart },
        inconnue: paul,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterPart(SegmentSchema.inconnu(COULEUR_ROUGE))
          .ajouterPart(SegmentSchema.inconnu(COULEUR_BLEU))
          .ajouterPart(SegmentSchema.connu(ecart, COULEUR_BLEU)),
      };
    },
  },

  // ---- Comparaison multiplicative : Léo = k x Paul, ensemble = total -
  comparaisonMultiplicative: {
    complexite: 'difficile',
    construire(fabriquer, niveau) {
      const k = entierAleatoireSchema(3, 5);
      const paul = fabriquer(niveau);
      const parts = new Grandeur(new Nombre(String(k + 1)), {});
      const total = parts.mul(paul);
      return {
        valeurs: { k, paul, parts, total },
        grandeurs: { total },
        inconnue: paul,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterGroupeRepete(k, () => SegmentSchema.inconnu(COULEUR_BLEU), COULEUR_BLEU)
          .ajouterPart(SegmentSchema.inconnu(COULEUR_ROUGE)),
      };
    },
  },

  // ---- Chaîne à trois, sens inverse : total et écart connus, Mathis
  // (la valeur de base, celle du premier) inconnue. Deux variantes selon
  // l'ordre des relations Léo/Maya — le facteur reste TOUJOURS figé à 2
  // (le plus simple à représenter dans le schéma). Le schéma pose des
  // tuiles, pas des valeurs déjà calculées : Mathis étant inconnu, chacune
  // de ses occurrences est une case "x" ; seul l'écart (connu) est une
  // vraie valeur.
  //
  // Écart puis facteur : Léo = Mathis+écart, Maya = 2×Léo,
  // total = Mathis+Léo+Maya = 4×Mathis+3×écart.
  chaineBaseEcartPuisFacteur: {
    complexite: 'difficile+',
    construire(fabriquer, niveau) {
      const mathis = fabriquer(niveau);
      const ecart = fabriquer({ min: 2, max: Math.max(2, Math.floor(niveau.max / 3)) });
      const deux = new Grandeur(new Nombre('2'), {});
      const leo = mathis.add(ecart);
      const maya = leo.mul(deux);
      const total = mathis.add(leo).add(maya);

      const tuiles = [
        SegmentSchema.inconnu(COULEUR_ROUGE),
        SegmentSchema.inconnu(COULEUR_BLEU),
        SegmentSchema.connu(ecart, COULEUR_BLEU),
        SegmentSchema.inconnu(COULEUR_VERT),
        SegmentSchema.connu(ecart, COULEUR_VERT),
        SegmentSchema.inconnu(COULEUR_VERT),
        SegmentSchema.connu(ecart, COULEUR_VERT),
      ];
      const schema = new SchemaBarres().definirTotal(SegmentSchema.connu(total));
      tuiles.forEach(seg => schema.ajouterPart(seg));

      return {
        valeurs: { mathis, ecart, leo, deux, maya, total },
        grandeurs: { total, ecart },
        inconnue: mathis,
        schema,
      };
    },
  },

  // Facteur puis écart : Léo = 2×Mathis, Maya = Léo+écart,
  // total = Mathis+Léo+Maya = 5×Mathis+écart.
  chaineBaseFacteurPuisEcart: {
    complexite: 'difficile+',
    construire(fabriquer, niveau) {
      const mathis = fabriquer(niveau);
      const deux = new Grandeur(new Nombre('2'), {});
      const leo = mathis.mul(deux);
      const ecart = fabriquer({ min: 2, max: Math.max(2, Math.floor(niveau.max / 3)) });
      const maya = leo.add(ecart);
      const total = mathis.add(leo).add(maya);

      const tuiles = [
        SegmentSchema.inconnu(COULEUR_ROUGE),
        SegmentSchema.inconnu(COULEUR_BLEU),
        SegmentSchema.inconnu(COULEUR_BLEU),
        SegmentSchema.inconnu(COULEUR_VERT),
        SegmentSchema.inconnu(COULEUR_VERT),
        SegmentSchema.connu(ecart, COULEUR_VERT),
      ];
      const schema = new SchemaBarres().definirTotal(SegmentSchema.connu(total));
      tuiles.forEach(seg => schema.ajouterPart(seg));

      return {
        valeurs: { mathis, deux, leo, ecart, maya, total },
        grandeurs: { total, ecart },
        inconnue: mathis,
        schema,
      };
    },
  },

  // ---- Produit : n parts égales connues -> total inconnu ------------
  produit: {
    complexite: 'facile',
    construire(fabriquer, niveau) {
      const n = entierAleatoireSchema(4, Math.min(12, Math.max(4, Math.floor(niveau.max / 5))));
      const nG = new Grandeur(new Nombre(String(n)), {});
      const valeurPart = fabriquer(niveau);
      const total = valeurPart.mul(nG);
      return {
        valeurs: { n: nG, valeurPart, total },
        grandeurs: { valeurPart },
        inconnue: total,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.inconnu())
          .ajouterGroupeRepete(n, () => SegmentSchema.connu(valeurPart, COULEUR_BLEU), COULEUR_BLEU),
      };
    },
  },

  // ---- Quotient : total et nombre de parts connus -> part inconnue --
  quotient: {
    complexite: 'facile',
    construire(fabriquer, niveau) {
      const n = entierAleatoireSchema(4, Math.min(12, Math.max(4, Math.floor(niveau.max / 5))));
      const nG = new Grandeur(new Nombre(String(n)), {});
      const valeurPart = fabriquer(niveau);
      const total = valeurPart.mul(nG);
      return {
        valeurs: { n: nG, valeurPart, total },
        grandeurs: { total },
        inconnue: valeurPart,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterGroupeRepete(n, () => SegmentSchema.inconnu(COULEUR_BLEU), COULEUR_BLEU),
      };
    },
  },

  // ---- Compte : total et valeur d'une part connus -> NOMBRE de parts
  // inconnu (x est le nombre de répétitions lui-même). Le "..." du
  // groupe répété porte donc un compte inconnu (compte=null -> "x").
  compte: {
    complexite: 'facile',
    construire(fabriquer, niveau) {
      const n = entierAleatoireSchema(4, Math.min(12, Math.max(4, Math.floor(niveau.max / 5))));
      const nG = new Grandeur(new Nombre(String(n)), {});
      const valeurPart = fabriquer(niveau);
      const total = valeurPart.mul(nG);
      return {
        valeurs: { n: nG, valeurPart, total },
        grandeurs: { total, valeurPart },
        inconnue: nG,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterGroupeRepete(n, () => SegmentSchema.connu(valeurPart, COULEUR_BLEU), COULEUR_BLEU, null),
      };
    },
  },

  // ---- Produit + terme : n objets identiques à un prix + un objet
  // différent (total = n×prixUnitaire + prixAutre) -> quatre formes,
  // une par quantité qu'on peut choisir comme inconnue.
  produitSommeTotal: {
    complexite: 'moyen',
    construire(fabriquer, niveau) {
      const n = entierAleatoireSchema(3, Math.min(8, Math.max(3, Math.floor(niveau.max / 8))));
      const nG = new Grandeur(new Nombre(String(n)), {});
      const prixUnitaire = fabriquer(niveau);
      const prixAutre = fabriquer(niveau);
      const total = prixUnitaire.mul(nG).add(prixAutre);
      return {
        valeurs: { n: nG, prixUnitaire, prixAutre, total },
        grandeurs: { prixUnitaire, prixAutre },
        inconnue: total,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.inconnu())
          .ajouterGroupeRepete(n, () => SegmentSchema.connu(prixUnitaire, COULEUR_BLEU), COULEUR_BLEU)
          .ajouterPart(SegmentSchema.connu(prixAutre, COULEUR_ROUGE)),
      };
    },
  },

  produitSommeAutre: {
    complexite: 'moyen',
    construire(fabriquer, niveau) {
      const n = entierAleatoireSchema(3, Math.min(8, Math.max(3, Math.floor(niveau.max / 8))));
      const nG = new Grandeur(new Nombre(String(n)), {});
      const prixUnitaire = fabriquer(niveau);
      const prixAutre = fabriquer(niveau);
      const total = prixUnitaire.mul(nG).add(prixAutre);
      return {
        valeurs: { n: nG, prixUnitaire, prixAutre, total },
        grandeurs: { total, prixUnitaire },
        inconnue: prixAutre,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterGroupeRepete(n, () => SegmentSchema.connu(prixUnitaire, COULEUR_BLEU), COULEUR_BLEU)
          .ajouterPart(SegmentSchema.inconnu(COULEUR_ROUGE)),
      };
    },
  },

  produitSommeUnitaire: {
    complexite: 'moyen',
    construire(fabriquer, niveau) {
      const n = entierAleatoireSchema(3, Math.min(8, Math.max(3, Math.floor(niveau.max / 8))));
      const nG = new Grandeur(new Nombre(String(n)), {});
      const prixUnitaire = fabriquer(niveau);
      const prixAutre = fabriquer(niveau);
      const total = prixUnitaire.mul(nG).add(prixAutre);
      return {
        valeurs: { n: nG, prixUnitaire, prixAutre, total },
        grandeurs: { total, prixAutre },
        inconnue: prixUnitaire,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterGroupeRepete(n, () => SegmentSchema.inconnu(COULEUR_BLEU), COULEUR_BLEU)
          .ajouterPart(SegmentSchema.connu(prixAutre, COULEUR_ROUGE)),
      };
    },
  },

  produitSommeCompte: {
    complexite: 'moyen',
    construire(fabriquer, niveau) {
      const n = entierAleatoireSchema(3, Math.min(8, Math.max(3, Math.floor(niveau.max / 8))));
      const nG = new Grandeur(new Nombre(String(n)), {});
      const prixUnitaire = fabriquer(niveau);
      const prixAutre = fabriquer(niveau);
      const total = prixUnitaire.mul(nG).add(prixAutre);
      return {
        valeurs: { n: nG, prixUnitaire, prixAutre, total },
        grandeurs: { total, prixAutre, prixUnitaire },
        inconnue: nG,
        schema: new SchemaBarres()
          .definirTotal(SegmentSchema.connu(total))
          .ajouterGroupeRepete(n, () => SegmentSchema.connu(prixUnitaire, COULEUR_BLEU), COULEUR_BLEU, null)
          .ajouterPart(SegmentSchema.connu(prixAutre, COULEUR_ROUGE)),
      };
    },
  },
};

// ------------------------------------------------------------------
// Histoires : la phrase française d'une (forme, nature). C'EST ICI QUE
// LE TRAVAIL À LA MAIN CONTINUE — chaque forme peut recevoir d'autres
// natures (Masse, Longueur, Durée...) en ajoutant simplement une entrée
// de plus ; rien d'autre à toucher.
// ------------------------------------------------------------------

const HISTOIRES = {
  somme: {
    scalaire: ({ valeurs: { g1, g2 } }) => ({
      enonce: `Un premier lot contient ${tex(g1)} objets et un second lot en contient ${tex(g2)}. Combien y a-t-il d'objets en tout ?`,
      xDescription: "le nombre total d'objets",
    }),
    Masse: ({ valeurs: { g1, g2 } }) => ({
      enonce: `Un sac de riz pèse ${tex(g1)} et un sac de sucre pèse ${tex(g2)}. Quelle est la masse totale ?`,
      xDescription: 'la masse totale',
    }),
    Longueur: ({ valeurs: { g1, g2 } }) => ({
      enonce: `Une première corde mesure ${tex(g1)} et une deuxième corde mesure ${tex(g2)}. Quelle est la longueur totale ?`,
      xDescription: 'la longueur totale',
    }),
  },

  complement: {
    scalaire: ({ valeurs: { total, part } }) => ({
      enonce: `Un sac contient ${tex(total)} billes en tout. On sait que ${tex(part)} d'entre elles sont rouges, les autres sont bleues. Combien y a-t-il de billes bleues ?`,
      xDescription: 'le nombre de billes bleues',
    }),
    Masse: ({ valeurs: { total, part } }) => ({
      enonce: `Un mélange pèse ${tex(total)} au total. On sait que ${tex(part)} sont du sel, le reste est du sucre. Quelle est la masse de sucre ?`,
      xDescription: 'la masse de sucre',
    }),
    Longueur: ({ valeurs: { total, part } }) => ({
      enonce: `Une route mesure ${tex(total)} en tout. On sait que ${tex(part)} est pavée, le reste est en gravier. Quelle est la longueur du gravier ?`,
      xDescription: 'la longueur du gravier',
    }),
  },

  ecart: {
    scalaire: ({ valeurs: { grand, petit } }) => ({
      enonce: `Dans une classe, il y a ${tex(grand)} filles et ${tex(petit)} garçons. Combien y a-t-il de filles de plus que de garçons ?`,
      xDescription: 'le nombre de filles de plus que de garçons',
    }),
    Masse: ({ valeurs: { grand, petit } }) => ({
      enonce: `Une boîte A pèse ${tex(grand)} et une boîte B pèse ${tex(petit)}. Quelle est la différence de masse ?`,
      xDescription: 'la différence de masse',
    }),
    Longueur: ({ valeurs: { grand, petit } }) => ({
      enonce: `Une tour mesure ${tex(grand)} et un bâtiment mesure ${tex(petit)}. Quelle est la différence de hauteur ?`,
      xDescription: 'la différence de hauteur',
    }),
  },

  sommeTrois: {
    scalaire: ({ valeurs: { g1, g2, g3 } }) => ({
      enonce: `Un sac contient des billes rouges, bleues et vertes : ${tex(g1)} rouges, ${tex(g2)} bleues et ${tex(g3)} vertes. Combien y a-t-il de billes en tout ?`,
      xDescription: 'le nombre total de billes',
    }),
    Masse: ({ valeurs: { g1, g2, g3 } }) => ({
      enonce: `Une recette mélange trois ingrédients : ${tex(g1)} de farine, ${tex(g2)} de sucre et ${tex(g3)} de beurre. Quelle est la masse totale ?`,
      xDescription: 'la masse totale du mélange',
    }),
    Longueur: ({ valeurs: { g1, g2, g3 } }) => ({
      enonce: `Un train comporte trois wagons : le premier mesure ${tex(g1)}, le deuxième ${tex(g2)} et le troisième ${tex(g3)}. Quelle est la longueur totale ?`,
      xDescription: 'la longueur totale du train',
    }),
  },

  complementTrois: {
    scalaire: ({ valeurs: { total, g1, g2 } }) => ({
      enonce: `Un sac contient ${tex(total)} billes en tout : ${tex(g1)} rouges, ${tex(g2)} bleues, le reste est vert. Combien y a-t-il de billes vertes ?`,
      xDescription: 'le nombre de billes vertes',
    }),
    Masse: ({ valeurs: { total, g1, g2 } }) => ({
      enonce: `Un mélange pèse ${tex(total)} au total : ${tex(g1)} de sel, ${tex(g2)} de sucre, le reste est du poivre. Quelle est la masse de poivre ?`,
      xDescription: 'la masse de poivre',
    }),
    Longueur: ({ valeurs: { total, g1, g2 } }) => ({
      enonce: `Une route mesure ${tex(total)} en tout : ${tex(g1)} pavée, ${tex(g2)} en gravier, le reste est en terre. Quelle est la longueur de terre ?`,
      xDescription: 'la longueur de terre',
    }),
  },

  comparaisonAdditive: {
    scalaire: ({ valeurs: { ecart, total } }) => ({
      enonce: `Léo a ${tex(ecart)} billes de plus que Paul. Au total, ils ont ${tex(total)} billes. Combien en a Paul ?`,
      xDescription: 'le nombre de billes de Paul',
    }),
    Masse: ({ valeurs: { ecart, total } }) => ({
      enonce: `Une boîte A pèse ${tex(ecart)} de plus qu'une boîte B. Au total, elles pèsent ${tex(total)}. Quel est le poids de B ?`,
      xDescription: 'le poids de la boîte B',
    }),
    Longueur: ({ valeurs: { ecart, total } }) => ({
      enonce: `Une poutre mesure ${tex(ecart)} de plus qu'une planche. Au total, elles mesurent ${tex(total)}. Quelle est la longueur de la planche ?`,
      xDescription: 'la longueur de la planche',
    }),
  },

  comparaisonMultiplicative: {
    scalaire: ({ valeurs: { k, total } }) => ({
      enonce: `Léo a ${k} fois plus de billes que Paul. Au total, ils ont ${tex(total)} billes. Combien en a Paul ?`,
      xDescription: 'le nombre de billes de Paul',
    }),
    Masse: ({ valeurs: { k, total } }) => ({
      enonce: `Une boîte A pèse ${k} fois plus qu'une boîte B. Au total, elles pèsent ${tex(total)}. Quel est le poids de B ?`,
      xDescription: 'le poids de la boîte B',
    }),
    Longueur: ({ valeurs: { k, total } }) => ({
      enonce: `Une poutre mesure ${k} fois plus long qu'une planche. Au total, elles mesurent ${tex(total)}. Quelle est la longueur de la planche ?`,
      xDescription: 'la longueur de la planche',
    }),
  },

  chaineBaseEcartPuisFacteur: {
    scalaire: ({ valeurs: { total, ecart } }) => ({
      enonce: `Léo a ${tex(ecart)} billes de plus que Mathis. Maya a deux fois plus de billes que Léo. À eux trois, ils ont ${tex(total)} billes. Combien Mathis a-t-il de billes ?`,
      xDescription: 'le nombre de billes de Mathis',
    }),
    Prix: ({ valeurs: { total, ecart } }) => ({
      enonce: `Léo a ${tex(ecart)} de plus que Mathis dans sa tirelire. Maya a deux fois plus d'argent que Léo. À eux trois, ils ont ${tex(total)}. Combien Mathis a-t-il dans sa tirelire ?`,
      xDescription: "l'argent de Mathis dans sa tirelire",
    }),
    MasseGrammes: ({ valeurs: { total, ecart } }) => ({
      enonce: `Léo a mangé ${tex(ecart)} de chocolat de plus que Mathis. Maya a mangé deux fois plus de chocolat que Léo. À eux trois, ils ont mangé ${tex(total)} de chocolat. Quelle masse de chocolat Mathis a-t-il mangée ?`,
      xDescription: 'la masse de chocolat mangée par Mathis',
    }),
  },

  chaineBaseFacteurPuisEcart: {
    scalaire: ({ valeurs: { total, ecart } }) => ({
      enonce: `Léo a deux fois plus de billes que Mathis. Maya a ${tex(ecart)} billes de plus que Léo. À eux trois, ils ont ${tex(total)} billes. Combien Mathis a-t-il de billes ?`,
      xDescription: 'le nombre de billes de Mathis',
    }),
    Prix: ({ valeurs: { total, ecart } }) => ({
      enonce: `Léo a deux fois plus d'argent que Mathis dans sa tirelire. Maya a ${tex(ecart)} de plus que Léo. À eux trois, ils ont ${tex(total)}. Combien Mathis a-t-il dans sa tirelire ?`,
      xDescription: "l'argent de Mathis dans sa tirelire",
    }),
    MasseGrammes: ({ valeurs: { total, ecart } }) => ({
      enonce: `Léo a mangé deux fois plus de chocolat que Mathis. Maya a mangé ${tex(ecart)} de chocolat de plus que Léo. À eux trois, ils ont mangé ${tex(total)} de chocolat. Quelle masse de chocolat Mathis a-t-il mangée ?`,
      xDescription: 'la masse de chocolat mangée par Mathis',
    }),
  },

  produit: {
    Prix: ({ valeurs: { n, valeurPart } }) => ({
      enonce: `Dalila a acheté ${tex(n)} livres à ${tex(valeurPart)} pièce. Combien a-t-elle payé en tout ?`,
      xDescription: 'le montant total payé',
    }),
    Masse: ({ valeurs: { n, valeurPart } }) => ({
      enonce: `On a ${tex(n)} sacs pesant chacun ${tex(valeurPart)}. Quelle est la masse totale ?`,
      xDescription: 'la masse totale',
    }),
    Longueur: ({ valeurs: { n, valeurPart } }) => ({
      enonce: `On pose ${tex(n)} cordes de ${tex(valeurPart)} chacune bout à bout. Quelle est la longueur totale ?`,
      xDescription: 'la longueur totale',
    }),
  },

  quotient: {
    scalaire: ({ valeurs: { total, n } }) => ({
      enonce: `${tex(total)} cartes de vœux sont partagées à parts égales entre ${tex(n)} amis. Combien de cartes chacun reçoit-il ?`,
      xDescription: 'le nombre de cartes que chacun reçoit',
    }),
    Masse: ({ valeurs: { total, n } }) => ({
      enonce: `On partage ${tex(total)} de confiture à parts égales entre ${tex(n)} pots. Quelle est la masse par pot ?`,
      xDescription: 'la masse par pot',
    }),
    Longueur: ({ valeurs: { total, n } }) => ({
      enonce: `On découpe ${tex(total)} de tissu en ${tex(n)} morceaux égaux. Quelle est la longueur d'un morceau ?`,
      xDescription: 'la longueur d\'un morceau',
    }),
  },

  compte: {
    scalaire: ({ valeurs: { total, valeurPart } }) => ({
      enonce: `Nicolas a besoin de ${tex(total)} boîtes. Il en récupère ${tex(valeurPart)} chaque jour. Au bout de combien de jours aura-t-il le nécessaire ?`,
      xDescription: 'le nombre de jours nécessaires',
    }),
    Prix: ({ valeurs: { total, valeurPart } }) => ({
      enonce: `J'ai payé ${tex(total)} pour des gâteaux coûtant ${tex(valeurPart)} chacun. Combien en ai-je acheté ?`,
      xDescription: 'le nombre de gâteaux achetés',
    }),
    Masse: ({ valeurs: { total, valeurPart } }) => ({
      enonce: `J'ai besoin de ${tex(total)} de farine. Je prélève ${tex(valeurPart)} à la fois. Combien de fois devrai-je prélever ?`,
      xDescription: 'le nombre de prélèvements',
    }),
    Longueur: ({ valeurs: { total, valeurPart } }) => ({
      enonce: `J'ai besoin de ${tex(total)} de fil. Je coupe des morceaux de ${tex(valeurPart)}. Combien de morceaux obtiendrai-je ?`,
      xDescription: 'le nombre de morceaux',
    }),
  },

  produitSommeTotal: {
    Prix: ({ valeurs: { n, prixUnitaire, prixAutre } }) => ({
      enonce: `On a acheté ${tex(n)} crayons à ${tex(prixUnitaire)} chacun et un cahier à ${tex(prixAutre)}. Quel est le montant total à payer ?`,
      xDescription: 'le montant total payé',
    }),
    Masse: ({ valeurs: { n, prixUnitaire, prixAutre } }) => ({
      enonce: `On a ${tex(n)} sacs de riz pesant chacun ${tex(prixUnitaire)} et un sac de sucre pesant ${tex(prixAutre)}. Quelle est la masse totale ?`,
      xDescription: 'la masse totale',
    }),
    Longueur: ({ valeurs: { n, prixUnitaire, prixAutre } }) => ({
      enonce: `On pose ${tex(n)} cordes de ${tex(prixUnitaire)} chacune et une corde de ${tex(prixAutre)}. Quelle est la longueur totale ?`,
      xDescription: 'la longueur totale',
    }),
  },

  produitSommeAutre: {
    Prix: ({ valeurs: { n, prixUnitaire, total } }) => ({
      enonce: `On a acheté ${tex(n)} crayons à ${tex(prixUnitaire)} chacun et un cahier. On a payé ${tex(total)} en tout. Quel est le prix du cahier ?`,
      xDescription: 'le prix du cahier',
    }),
    Masse: ({ valeurs: { n, prixUnitaire, total } }) => ({
      enonce: `On a ${tex(n)} sacs pesant chacun ${tex(prixUnitaire)} et un sac de farine. La masse totale est ${tex(total)}. Quelle est la masse du sac de farine ?`,
      xDescription: 'la masse du sac de farine',
    }),
    Longueur: ({ valeurs: { n, prixUnitaire, total } }) => ({
      enonce: `On découpe ${tex(n)} morceaux de ${tex(prixUnitaire)} chacun et un dernier morceau. La longueur totale est ${tex(total)}. Quelle est la longueur du dernier morceau ?`,
      xDescription: 'la longueur du dernier morceau',
    }),
  },

  produitSommeUnitaire: {
    Prix: ({ valeurs: { n, prixAutre, total } }) => ({
      enonce: `On a acheté ${tex(n)} crayons identiques et un cahier à ${tex(prixAutre)}. On a payé ${tex(total)} en tout. Quel est le prix d'un crayon ?`,
      xDescription: 'le prix d\'un crayon',
    }),
    Masse: ({ valeurs: { n, prixAutre, total } }) => ({
      enonce: `On a ${tex(n)} sacs de même masse et un sac de sel pesant ${tex(prixAutre)}. La masse totale est ${tex(total)}. Quelle est la masse d'un sac ?`,
      xDescription: 'la masse d\'un sac',
    }),
    Longueur: ({ valeurs: { n, prixAutre, total } }) => ({
      enonce: `On a ${tex(n)} cordes identiques et une corde de ${tex(prixAutre)}. La longueur totale est ${tex(total)}. Quelle est la longueur d'une corde ?`,
      xDescription: 'la longueur d\'une corde',
    }),
  },

  produitSommeCompte: {
    Prix: ({ valeurs: { total, prixUnitaire, prixAutre } }) => ({
      enonce: `On a payé ${tex(total)} pour des crayons à ${tex(prixUnitaire)} pièce et un cahier à ${tex(prixAutre)}. Combien de crayons a-t-on achetés ?`,
      xDescription: 'le nombre de crayons achetés',
    }),
    Masse: ({ valeurs: { total, prixUnitaire, prixAutre } }) => ({
      enonce: `On a une masse totale de ${tex(total)} : des sacs à ${tex(prixUnitaire)} chacun et un sac à ${tex(prixAutre)}. Combien de sacs à ${tex(prixUnitaire)} a-t-on ?`,
      xDescription: 'le nombre de sacs',
    }),
    Longueur: ({ valeurs: { total, prixUnitaire, prixAutre } }) => ({
      enonce: `On a une longueur totale de ${tex(total)} : des morceaux de ${tex(prixUnitaire)} et un morceau de ${tex(prixAutre)}. Combien de morceaux de ${tex(prixUnitaire)} a-t-on ?`,
      xDescription: 'le nombre de morceaux',
    }),
  },
};

// ------------------------------------------------------------------
// Assemblage : générique, ne sait rien de la nature ni de la forme.
// ------------------------------------------------------------------

function genererProblemeDepuis(formeId, natureId, niveau) {
  const { grandeurs, inconnue, schema, ...contexte } = FORMES[formeId].construire(NATURES[natureId].fabriquer, niveau);
  const { enonce, xDescription } = HISTOIRES[formeId][natureId](contexte);
  return {
    categorie: formeId,
    enonce,
    xDescription,
    schema,
    // Grandeurs additives du problème — chacune doit apparaître au moins
    // une fois dans l'expression de l'élève (réutilisation libre). Les
    // facteurs multiplicatifs/de répétition (n, k, "deux"...) ne sont PAS
    // listés ici : comparerExpressionSchema les reconnaît directement
    // dans l'arbre (tout facteur d'un produit/quotient qui n'est pas lui
    // -même une grandeur, mais dont le facteur voisin en contient une).
    attendu: { atomes: Object.values(grandeurs) },
    inconnue,
  };
}

function genererProbleme(tailleId = 'moyen', complexiteId = 'facile', categorieId = null) {
  const niveau = NIVEAUX_SCHEMA[tailleId] || NIVEAUX_SCHEMA.moyen;
  const formesDisponibles = Object.keys(FORMES)
    .filter(id => FORMES[id].complexite === complexiteId && HISTOIRES[id]);
  const formeId = categorieId || formesDisponibles[Math.floor(Math.random() * formesDisponibles.length)];
  const naturesDisponibles = Object.keys(HISTOIRES[formeId]);
  const natureId = naturesDisponibles[Math.floor(Math.random() * naturesDisponibles.length)];
  return genererProblemeDepuis(formeId, natureId, niveau);
}

// ------------------------------------------------------------------
// Validation de l'expression/valeur tapée par l'élève. Le calcul est
// TOUJOURS délégué au moteur (ObjetString) : on ne reparse jamais le
// texte à la main, on lit l'arbre qu'ObjetString a déjà construit.
// ------------------------------------------------------------------

/** Retire le "x=" (ou "x =") de tête si présent — l'élève peut taper la
 *  formule complète ou juste le membre de droite, les deux sont acceptés. */
function retirerPrefixeX(texte) {
  const m = /^\s*x\s*=\s*(.+)$/i.exec(String(texte ?? ''));
  return m ? m[1] : texte;
}

/** Un nœud (ou sous-arbre) de l'expression tapée par l'élève est
 *  "reconnu" si tout ce qu'il contient est justifié — une vraie grandeur
 *  du problème, ou un facteur de répétition (n, k, "deux"...) toléré à
 *  côté d'une grandeur. Aucune liste de facteurs à maintenir : la
 *  reconnaissance se calcule directement sur la structure de l'arbre.
 *  - Atome : reconnu ssi c'est une grandeur attendue.
 *  - Somme/Différence : reconnu ssi TOUS les termes sont reconnus — une
 *    addition n'excuse rien, chaque terme doit être une vraie grandeur
 *    (4+3 n'a pas de raison d'être si ni 4 ni 3 n'en sont).
 *  - Produit : reconnu ssi AU MOINS UN facteur est reconnu — l'autre est
 *    alors toléré comme facteur de répétition, quelle que soit sa forme
 *    (un atome comme "deux", ou tout un sous-arbre comme "(mathis+ecart)").
 *  - Quotient [numérateur, dénominateur] : reconnu ssi le NUMÉRATEUR est
 *    reconnu — le dénominateur joue toujours un rôle de facteur ("total:
 *    deux" et "total:n" sont recevables quel que soit deux/n). */
function estReconnu(noeud, grandeursAttendues) {
  if (typeof noeud.isAtome === 'function' && noeud.isAtome()) {
    return grandeursAttendues.some(g => g.equals(noeud.grandeur));
  }
  if (noeud instanceof Produit) {
    return noeud.facteurs.some(f => estReconnu(f, grandeursAttendues));
  }
  if (noeud instanceof Quotient) {
    return estReconnu(noeud.termes[0], grandeursAttendues);
  }
  // Somme / Difference : tous les termes doivent être reconnus.
  const termes = noeud.termes || [];
  return termes.length > 0 && termes.every(t => estReconnu(t, grandeursAttendues));
}

/** Grandeurs attendues effectivement rencontrées dans l'arbre, où qu'elles
 *  soient — sert uniquement à vérifier qu'aucune n'a été oubliée
 *  (couverture), pas à juger si l'expression est valide (voir estReconnu). */
function grandeursUtiliseesDans(noeud, grandeursAttendues) {
  if (typeof noeud.isAtome === 'function' && noeud.isAtome()) {
    const g = grandeursAttendues.find(g => g.equals(noeud.grandeur));
    return g ? [g] : [];
  }
  const enfants = noeud.termes || noeud.facteurs || [];
  return enfants.flatMap(e => grandeursUtiliseesDans(e, grandeursAttendues));
}

/**
 * Valide l'expression tapée par l'élève pour x : elle doit (1) ne
 * contenir aucun nombre injustifié (voir estReconnu) et utiliser chaque
 * grandeur du problème au moins une fois (voir grandeursUtiliseesDans),
 * et (2) s'évaluer à la même valeur que probleme.inconnue. Renvoie
 * 'invalide' | 'faux' | 'ok'.
 */
function comparerExpressionSchema(texteEleve, probleme) {
  const texte = retirerPrefixeX(texteEleve);

  let os;
  try {
    os = new ObjetString(texte, {});
    if (!os.isValid()) return 'invalide';
  } catch (e) {
    return 'invalide';
  }

  const grandeursAttendues = probleme.attendu.atomes;

  if (!estReconnu(os.arbre, grandeursAttendues)) return 'faux';

  const utilisees = grandeursUtiliseesDans(os.arbre, grandeursAttendues);
  const toutesUtilisees = grandeursAttendues.every(g => utilisees.some(u => u.equals(g)));
  if (!toutesUtilisees) return 'faux';

  let resultat;
  try {
    resultat = os.calculer().resultat;
  } catch (e) {
    return 'invalide';
  }

  return resultat.equals(Atome.from(probleme.inconnue)) ? 'ok' : 'faux';
}

/**
 * Convertit le texte tapé par l'élève (déjà validé par
 * comparerExpressionSchema) en LaTeX, via l'arbre qu'ObjetString construit
 * lui-même — pas de rendu réinventé à côté.
 */
function expressionVersLatex(texte) {
  try {
    const os = new ObjetString(retirerPrefixeX(String(texte ?? '').trim().replace(/,/g, '.')), {});
    if (os.isValid()) return os.arbre.toLatex({});
  } catch (e) {
    // ignore
  }
  return '';
}

/**
 * L'étape "valeur" accepte que le calcul se fasse en plusieurs fois :
 * tant que l'élève tape encore une EXPRESSION composée, c'est un calcul
 * intermédiaire (jamais comparé à la réponse attendue). Seule une VALEUR
 * FINALE (un seul atome, ex: "15€") est comparée à la bonne réponse.
 * Renvoie true si texte est déjà une valeur finale (à valider par
 * validerValeurSchema), false si c'est encore une expression composée (à
 * accepter sans vérifier son résultat, voir validerEtapeIntermediaire).
 */
function estValeurFinale(texte) {
  try {
    const os = new ObjetString(String(retirerPrefixeX(texte) ?? '').trim().replace(/,/g, '.'), {});
    if (!os.isValid()) return true; // texte invalide -> laisser validerValeurSchema le signaler
    return os.arbre.isAtome();
  } catch (e) {
    return true;
  }
}

/**
 * Vérifie qu'un calcul intermédiaire (encore une expression composée) est
 * au moins syntaxiquement valide et se calcule sans erreur — sa valeur
 * n'est JAMAIS comparée à la réponse attendue, seule la valeur finale
 * l'est (voir estValeurFinale). Renvoie 'invalide' | 'ok'.
 */
function validerEtapeIntermediaire(texte) {
  try {
    const os = new ObjetString(String(retirerPrefixeX(texte) ?? '').trim().replace(/,/g, '.'), {});
    if (!os.isValid()) return 'invalide';
    os.calculer();
    return 'ok';
  } catch (e) {
    return 'invalide';
  }
}

/**
 * Vérifie la valeur finale (éventuellement une grandeur, ex: "80€") tapée
 * par l'élève pour x. Délègue le parsing, la validation d'unité ET le
 * calcul au moteur (ObjetString/Atome). Renvoie 'invalide' | 'faux' | 'ok'.
 */
function validerValeurSchema(texte, probleme) {
  const s = String(retirerPrefixeX(texte) ?? '').trim().replace(/,/g, '.');
  if (!s) return 'invalide';

  let obtenu;
  try {
    const os = new ObjetString(s, {});
    if (!os.isValid()) return 'invalide';
    obtenu = os.calculer().resultat;
  } catch (e) {
    return 'invalide';
  }

  return obtenu.equals(Atome.from(probleme.inconnue)) ? 'ok' : 'faux';
}
