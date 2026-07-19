/* Un jeton de la grille : une écriture particulière (fraction, fraction
   simplifiée, fraction équivalente, mixte, décimale, pourcentage) d'un
   Nombre de référence. */
export class CarteNombre {
  constructor(nombre, mode, type) {
    this.nombre = nombre;
    this.mode = mode;
    this.type = type; // "fraction" | "duree" — réutilise les deux couleurs existantes
  }

  fiche() {
    return `\\(${this.nombre.toLatex({ nombreAff: this.mode })}\\)`;
  }
}
