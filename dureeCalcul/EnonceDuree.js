/*
 * EnonceDuree.js — "dureeCalcul light" (6e) : calculs sur les durées h+min.
 *
 * Version allégée de la partie "duree" d'EnonceGrandeur.js (voir
 * appli-maths/calculExpression) : seulement 4 sous-types, aucune division ni
 * conversion vitesse/distance — hors programme en 6e.
 *
 *   somme                : (Xh+Ymin)+(Xh+Ymin)
 *   difference           : (Xh+Ymin)-(Xh+Ymin), toujours positive
 *   produit              : (Xh+Ymin)*n
 *   produitProcheHeure   : n*Ymin, Y proche d'une heure (50 à 59 min) —
 *                          force la conversion au moment du résultat
 *                          (ex. 4*54min = 216min = 3h36min).
 *   division             : (kn+1)h:n, n dans {2,3,4,5,6,10} (diviseurs de
 *                          60) — le "+1" garantit un reste net d'exactement
 *                          1h à chaque tirage (jamais une division exacte
 *                          triviale), qui se convertit toujours pile en
 *                          minutes puisque 60/n est entier (ex. 4h:3 =
 *                          1h+60min:3 = 1h20min).
 *   quotientLibre        : Xh:n, X ENTIER QUELCONQUE (1 à 9, pas de forme
 *                          imposée) — n dans {2,3,4,5,6,10} toujours, donc
 *                          le reste se convertit toujours exactement en
 *                          minutes, mais la division peut tomber juste
 *                          (X multiple de n) ou pas. Désactivé par défaut
 *                          (voir index.html) : variante plus difficile,
 *                          à activer volontairement.
 */
const SOUS_TYPES_DUREE = ['somme', 'difference', 'produit', 'produitProcheHeure', 'division', 'quotientLibre'];

const MINUTES_POSSIBLES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

class EnonceDuree extends Enonce {

  genVariant(index) {
    const sousTypes = this.sharedOptions?.sousTypes?.length ? this.sharedOptions.sousTypes : SOUS_TYPES_DUREE;
    const sousType = this.sharedOptions?.sousTypeForce || this.rng.pick(sousTypes);

    switch (sousType) {
      case 'somme':              return this._genSomme();
      case 'difference':         return this._genDifference();
      case 'produit':            return this._genProduit();
      case 'produitProcheHeure': return this._genProduitProcheHeure();
      case 'division':           return this._genDivision();
      case 'quotientLibre':      return this._genQuotientLibre();
      default:
        throw new Error(`EnonceDuree: sous-type "${sousType}" inconnu. Sous-types enregistrés : ${SOUS_TYPES_DUREE.join(', ')}.`);
    }
  }

  _uneDureeHMin(hMin, hMax) {
    const h = this.rng.int(hMin, hMax);
    const min = this.rng.pick(MINUTES_POSSIBLES);
    return { h, min, totalMin: h * 60 + min, expr: `${h}h+${min}min` };
  }

  _genSomme() {
    const d1 = this._uneDureeHMin(1, 4);
    const d2 = this._uneDureeHMin(1, 4);
    return { sousType: 'somme', expression: `(${d1.expr})+(${d2.expr})` };
  }

  // d1 > d2 garanti (résultat strictement positif) en comparant les totaux
  // en minutes ; ré-essaie une poignée de fois dans le cas limite (égalité
  // exacte après l'échange), sans jamais sortir du format h+min.
  _genDifference() {
    let d1 = this._uneDureeHMin(2, 6);
    let d2 = this._uneDureeHMin(1, 5);
    if (d2.totalMin >= d1.totalMin) [d1, d2] = [d2, d1];

    let garde = 0;
    while (d2.totalMin >= d1.totalMin && garde++ < 10) {
      d2 = this._uneDureeHMin(1, Math.max(1, d1.h - 1));
    }
    return { sousType: 'difference', expression: `(${d1.expr})-(${d2.expr})` };
  }

  _genProduit() {
    const d = this._uneDureeHMin(1, 3);
    const facteur = this.rng.int(2, 5);
    return { sousType: 'produit', expression: `(${d.expr})*${facteur}` };
  }

  _genProduitProcheHeure() {
    const minutesProchesHeure = this.rng.int(50, 59);
    const facteur = this.rng.int(2, 6);
    return { sousType: 'produitProcheHeure', expression: `${facteur}*${minutesProchesHeure}min` };
  }

  // (kn+1)h:n — k tiré de 0 à 3, jamais de division exacte triviale.
  _genDivision() {
    const diviseur = this.rng.pick([2, 3, 4, 5, 6, 10]);
    const k = this.rng.int(0, 3);
    const h = k * diviseur + 1;
    return { sousType: 'division', expression: `${h}h:${diviseur}` };
  }

  // Xh:n — X entier quelconque (1 à 9), sans forme imposée : la division
  // peut tomber juste ou laisser un reste, au hasard.
  _genQuotientLibre() {
    const diviseur = this.rng.pick([2, 3, 4, 5, 6, 10]);
    const h = this.rng.int(1, 9);
    return { sousType: 'quotientLibre', expression: `${h}h:${diviseur}` };
  }

  toQuestionData(variant, index) {
    return {
      question: `Calcule le résultat.`,
      expressionInitiale: variant.expression,
      options: {
        affichageInitial: { expressionInitiale: true },
        // modeCorrection : options passées à ObjetString pour le rendu LaTeX
        // de la correction — reflète le format attendu de la réponse
        // ci-dessous, sinon la correction montrerait un résultat juste mais
        // sous une forme jamais vue par l'élève (ex: "7/2h" au lieu de
        // "3h30min").
        modeCorrection: {
          affichage: 'mixte',
          affichageMixte: { Duree: ['h', 'min'] }
        },
        policies: {
          format: {
            exigerAtome: true,
            formatDuree: 'mixte',
            formatDureeUnites: ['h', 'min'],
            nombre: 'simple'
          },
          suite: {
            continuerSiInvalide: true,
            continuerSiInegale: true,
            continuerSiMauvaiseNature: true,
            continuerSiFormatIncorrect: true
          }
        }
      }
    };
  }
}

window.EnonceDuree = EnonceDuree;
window.SOUS_TYPES_DUREE = SOUS_TYPES_DUREE;
