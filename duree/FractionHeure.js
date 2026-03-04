

export class FractionHeure {
  constructor(m, d) {
    this.m = m;
    this.d = d;
    this.type = "fraction";
  }

  toMinutes() {
    return (this.m * 60) / this.d;
  }


  fiche() {
  return `\\(\\dfrac{${this.m}}{${this.d}}\\,\\mathrm{h}\\)`;

}
}