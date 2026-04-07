export class ExerciseRegistry {
  constructor() {
    this.types = {};
  }

  register(type) {
    this.types[type.id] = type;
  }

  getByCategorieNiveau(categorie, niveau) {
    return Object.values(this.types).filter(t =>
      t.categorie === categorie &&
      String(t.niveau) === String(niveau)
    );
    
  }
  
getById(id) {
  return this.types[id] || null;
}
}