export class DureeHM {
  constructor(totalMinutes) {
    this.totalMinutes = totalMinutes;
    this.type = "duree";
  }

fiche() {

  if (this.totalMinutes < 60) {
    return `\\(${this.totalMinutes}\\,\\mathrm{min}\\)`;
  }

  const h = Math.floor(this.totalMinutes / 60);
  const m = this.totalMinutes % 60;

  if (m === 0) {
    return `\\(${h}\\,\\mathrm{h}\\)`;
  }

  return `\\(${h}\\,\\mathrm{h}\\ ${m}\\,\\mathrm{min}\\)`;
}
}