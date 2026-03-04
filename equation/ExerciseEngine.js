export class ExerciseEngine {
  constructor(registry) {
    this.registry = registry;

    this.current = null;        // Données de l'exercice courant
    this.currentType = null;    // Type courant (structure)
    this.forcedType = null;
  }

  /* =========================================================
     CRÉATION D’UN NOUVEL EXERCICE (change le type)
  ========================================================= */

  create({ categorie, niveau, min, max }) {
    const types = this.registry.getByCategorieNiveau(categorie, niveau);

    if (!types.length) {
      console.warn("Aucun type trouvé");
      return null;
    }

    // Choix aléatoire du type
    const type = types[Math.floor(Math.random() * types.length)];
    this.currentType = type;

    return this._generateFromType(min, max);
  }

  /* =========================================================
     RÉGÉNÉRATION DES NOMBRES (garde le type courant)
  ========================================================= */

  regenerate(min, max) {
    if (!this.currentType) {
      console.warn("Aucun type courant pour régénération");
      return null;
    }

    return this._generateFromType(min, max);
  }

  /* =========================================================
     GÉNÉRATION INTERNE À PARTIR D’UN TYPE DONNÉ
  ========================================================= */

  _generateFromType(min, max) {
    const data = this.currentType.generate(min, max);

    this.current = {
      id: this.currentType.id,
      categorie: this.currentType.categorie,
      niveau: this.currentType.niveau,
      min,
      max,
      equations: data.equations,
      rep: data.rep
    };

    return this.current;
  }

  /* =========================================================
     VÉRIFICATION DE LA RÉPONSE
  ========================================================= */

  check(answer) {
    if (!this.current) return false;

    return Math.abs(Number(answer) - Number(this.current.rep)) < 1e-9;
  }

  /* =========================================================
     ACCESSEUR (optionnel mais propre)
  ========================================================= */

  getCurrent() {
    return this.current;
  }
  
  
createById(id, min, max) {

  console.log("createById appelé avec :", id);

  const type = this.registry.getById(id);

  console.log("type trouvé :", type);

  if (!type) return null;

  this.currentType = type;
  return this._generateFromType(min, max);
}
}


