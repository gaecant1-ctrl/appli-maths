export class Boule {
  constructor(p, contenu = null) {
    this.p = p;
    this.contenu = contenu;
    this.x = 0;
    this.y = 0;
    this.size = 0;
    this.color = [255, 255, 255];
  }

  isEmpty() {
    return this.contenu === null;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
  }

  setSize(s) {
    this.size = s;
  }

  contains(px, py) {
    return this.p.dist(this.x, this.y, px, py) < this.size / 2;
  }

  draw() {
    if (!this.p) {
      console.error("p undefined dans Boule");
      return;
    }

    if (this.isEmpty()) return;

    const p = this.p;

    p.fill(this.color[0], this.color[1], this.color[2]);
    p.stroke(0);
    p.ellipse(this.x, this.y, this.size);

    p.fill(0);
    p.noStroke();
    p.text(this.contenu.fiche(), this.x, this.y);
  }
}