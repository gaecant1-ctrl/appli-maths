// ============================================================
// SchemaBarres.js — modèle de données du schéma en barres (barre "total"
// + segments "parts"). Sépare la REPRÉSENTATION du schéma (cette classe)
// de sa génération (ProblemeSchema.js) et de son rendu DOM (app.js) :
// app.js ne lit/écrit plus jamais des propriétés ad hoc sur un objet
// littéral, il consomme l'API de SchemaBarres.
// ------------------------------------------------------------
// Pensé pour être réutilisé tel quel par un futur éditeur où l'ÉLÈVE
// construit le schéma (au lieu de le recevoir tout fait) : un
// SchemaBarres vide peut être rempli pas à pas via definirTotal /
// ajouterPart / ajouterGroupeRepete, exactement comme le fait aujourd'hui
// chaque forme de ProblemeSchema.js.
// ============================================================

/** Un segment de barre : soit une grandeur connue, soit l'inconnue x,
 *  soit un "..." (ellipsis) qui abrège un groupe de parts identiques et
 *  PORTE LUI-MÊME le compte de répétitions (connu, ou x si c'est ce
 *  compte qui est demandé — catégorie "compte"). couleur (optionnelle)
 *  reflète à quelle partie du tout matériel appartient ce segment (ex:
 *  "billes rouges" vs "billes bleues") — PAS son statut connu/inconnu,
 *  qui reste géré séparément (voir style.css). */
class SegmentSchema {
  constructor({ grandeur = null, connue = true, couleur = null, ellipsis = false } = {}) {
    this.grandeur = grandeur; // pour un ellipsis : le COMPTE de répétitions, pas une valeur de part
    this.connue = connue;     // pour un ellipsis : le compte est-il connu, ou est-ce x ?
    this.couleur = couleur;
    this.ellipsis = ellipsis;
  }

  static connu(grandeur, couleur = null) {
    return new SegmentSchema({ grandeur, connue: true, couleur });
  }

  static inconnu(couleur = null) {
    return new SegmentSchema({ connue: false, couleur });
  }

  /** compte : Grandeur (nombre de répétitions, connu) ou null (inconnu -> "x"). */
  static ellipsisSegment(compte = null, couleur = null) {
    return new SegmentSchema({ ellipsis: true, grandeur: compte, connue: compte !== null, couleur });
  }

  /** Rendu LaTeX de la CASE : "..." pour un ellipsis (le compte ne s'y
   *  affiche jamais, voir compteLatex), "x" si inconnu, sinon la grandeur. */
  toLatex() {
    if (this.ellipsis) return '\\ldots';
    return this.connue ? this.grandeur.toLatex() : 'x';
  }

  /** Ce que le badge de répétition au-dessus doit afficher (uniquement
   *  pertinent pour un segment ellipsis). */
  compteLatex() {
    return this.connue ? this.grandeur.toLatex() : 'x';
  }
}

/** Le schéma complet : une barre "total" et une ou plusieurs "parts"
 *  au-dessus. Un groupe de parts égales se représente de façon compacte
 *  (voir ajouterGroupeRepete) : le "..." qui l'abrège porte lui-même son
 *  compte, il n'y a plus d'information de répétition séparée. */
class SchemaBarres {
  constructor() {
    this.total = null;
    this.parts = [];
  }

  definirTotal(segment) {
    this.total = segment;
    return this;
  }

  ajouterPart(segment) {
    this.parts.push(segment);
    return this;
  }

  /** Ajoute un groupe de n parts égales (fabriquées par construireSegment).
   *  n <= 2 : les deux parts sont affichées telles quelles (rien à abréger).
   *  n > 2 : forme compacte [première, "...", dernière] — le "..." porte le
   *  compte (Grandeur scalaire n par défaut, ou une autre Grandeur/null
   *  passée explicitement — null quand ce compte lui-même est l'inconnue,
   *  ex: catégorie "compte"). */
  ajouterGroupeRepete(n, construireSegment, couleur = null, compte = new Grandeur(new Nombre(String(n)), {})) {
    if (n <= 2) {
      for (let i = 0; i < n; i++) this.ajouterPart(construireSegment());
      return this;
    }
    this.ajouterPart(construireSegment());
    this.ajouterPart(SegmentSchema.ellipsisSegment(compte, couleur));
    this.ajouterPart(construireSegment());
    return this;
  }
}
