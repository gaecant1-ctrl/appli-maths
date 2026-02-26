/* =========================
   TURTLE ENGINE
========================= */

class Turtle {
  constructor(ctx) {
    this.ctx = ctx;
    this.x = 0;
    this.y = 0;
    this.angle = 0;
    this.pen = true;
  }

  up() { this.pen = false; }
  down() { this.pen = true; }

  goto(x, y) {
    this.x = x;
    this.y = y;
  }

  left(deg) {
    this.angle += deg;
  }

forward(length, color) {

  const rad = this.angle * Math.PI / 180;

  const nx = this.x + length * Math.cos(rad);
  const ny = this.y + length * Math.sin(rad);  // ← PLUS de signe -

  if (this.pen) {
    this.ctx.beginPath();
    this.ctx.moveTo(this.x, this.y);
    this.ctx.lineTo(nx, ny);
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;
    this.ctx.stroke();
  }

  this.x = nx;
  this.y = ny;
}
}

/* =========================
   RECTI CLASS (FIDÈLE)
========================= */

class Recti {

  constructor(liste, a, b, c, aire, peri) {
    this.liste = liste;
    this.a = a;
    this.b = b;
    this.c = c;
    this.aire = aire;
    this.peri = peri;
  }

drawFond(t) {

  let points = [];

  // Rejouer la géométrie
  let x = 0;
  let y = 0;
  let angle = 0;

  for (let u of this.liste) {

    if (u.length === 3) {
      x = u[1];
      y = u[2];
      points.push([x, y]);
      continue;
    }

    if (u.length === 2) {

      // ignorer les toggles stylo
      if (u[0] === 0 && u[1] === 0) continue;

      angle += u[0];

      const rad = angle * Math.PI / 180;
      x += u[1] * Math.cos(rad);
      y += u[1] * Math.sin(rad);

      points.push([x, y]);
    }
  }

  // Dessin du polygone
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);

  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i][0], points[i][1]);
  }

  ctx.closePath();
  ctx.fillStyle = "white";
  ctx.fill();
}

drawContour(t) {



  t.x = 0;
  t.y = 0;
  t.angle = 0;
  t.down();

  let mode = "down";

    for (let u of this.liste) {

      if (u.length === 2) {

        if (u[0] === 0 && u[1] === 0) {
          if (mode === "down") {
            t.up();
            mode = "up";
          } else {
            t.down();
            mode = "down";
          }
        }

        this.av(t, u);

      } else if (u.length === 3) {
        this.go(t, u);
        t.down();
      }
    }
  }

  go(t, u) {
    if (u[0] === 0) t.up();
    else t.down();

t.goto(u[1], u[2]);
  }

  av(t, u) {
    t.left(u[0]);

    let color = "black";

    if (u[1] === this.a) color = "green";
    else if (u[1] === this.b) color = "blue";
    else if (u[1] === this.c) color = "red";

    t.forward(u[1], color);
  }
  
  draw(t) {

  // ============================
  // RESET CANVAS
  // ============================
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Fond bleu général
  ctx.fillStyle = "lightblue";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Transformation turtle
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(1, -1);

  // ============================
  // 1️⃣ Fond blanc
  // ============================
  this.drawFond(t);

  // ============================
  // 2️⃣ Contours colorés
  // ============================
  this.drawContour(t);
}

evalExpression(expr, type) {

  const revele = (f) => {
    let ant = "$";
    let g = "";

    for (let i of f) {
      if (
        ("(abc".includes(i)) &&
        ("0123456789abc)".includes(ant))
      ) {
        g += "*" + i;
      } else {
        g += i;
      }
      ant = i;
    }
    return g;
  };

  const prepare = (s) => {
    return revele(s)
      .replaceAll("a", this.a)
      .replaceAll("b", this.b)
      .replaceAll("c", this.c)
      .replaceAll("^", "**");
  };

  const expected = type === "aire" ? this.aire : this.peri;

  try {
    const userValue = eval(prepare(expr));
    const expectedValue = eval(prepare(expected));

    if (typeof userValue !== "number" || isNaN(userValue)) {
      return { status: "invalid" };
    }

    return {
      status: userValue === expectedValue ? "correct" : "wrong"
    };

  } catch {
    return { status: "invalid" };
  }
}


}


/* =========================
   BIBLIOTHÈQUE RECTIS
========================= */



function randint(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function initRectis(ide) {



  // =========================
  // 1
  // =========================
  if(ide === 1){
  let a = 200;
  let b = 150;
  let c = 70;

  let liste = [[0,-(b+c)/2,-a/2],[0,b],[90,(a-c)/2],[-90,c],[90,c],[90,c],[-90,(a-c)/2],[90,b],[90,a]];
  return new Recti(liste,a,b,c,"a*b+c^2","2*(a+b+c)");
  }
  // =========================
  // 2
  // =========================
    if(ide === 2){
  a = randint(170,190);
  b = randint(100,130);
  c = 200 - b;

  liste = [[0,-(b+a)/2,-a/2],[0,b],[90,(a-c)/2],[-90,a],[90,c],[90,a],[-90,(a-c)/2],[90,b],[90,a]];
  return new Recti(liste,a,b,c,"a*b+a*c","4*a+2*b");
}
  // =========================
  // 3
  // =========================
  if(ide === 3){
  a = randint(11,14)*10;
  b = randint(3,7)*10;
  c = 200 - a;

  liste = [[0,-(a+c)/2,-a/2],[0,a],[0,c],[90,a-b],[90,c],[-90,b],[90,a],[90,a]];
  return new Recti(liste,a,b,c,"(a+c)*a-b*c","4*a+2*c");
}
  // =========================
  // 4
  // =========================
  if(ide === 4){
  a = 200;
  b = randint(5,8)*10;
  c = randint(10,13)*10;

  liste = [[0,-a/2,-c/2],[0,a],[90,(c-b)/2],[90,b],[-90,b],[-90,b],[90,(c-b)/2],[90,a],[90,c]];
  return new Recti(liste,a,b,c,"a*c-b*b","2*(a+b+c)");
}
// =========================
// 5
// =========================
  if(ide === 5){
b = randint(5,8)*10;
a = 200 + b;
c = randint(10,13)*10;

liste = [
  [0,-a/2,-c/2],
  [0,a],
  [90,(c-b)/2],
  [90,c],
  [-90,b],
  [-90,c],
  [90,(c-b)/2],
  [90,a],
  [90,c]
];

return new Recti(liste,a,b,c,"a*c-b*c","4*c+2*a");
}

// =========================
// 6
// =========================
  if(ide === 6){
a = randint(10,13)*10;
b = 200;
c = randint(5,9)*10;

liste = [
  [0,-b/2,-a/2],
  [0,b],
  [90,a-c],
  [90,c],
  [-90,c],
  [90,b-c],
  [90,a]
];

return new Recti(liste,a,b,c,"a*b-c^2","2*(a+b)");
}

// =========================
// 7
// =========================
  if(ide === 7){
a = randint(150,200);
b = randint(10,26)*5;
c = 200 - b;

liste = [
  [0,-(b+c)/2,-a/2],
  [0,b],
  [0,c],
  [90,a],
  [90,c],
  [0,b],
  [90,a]
];

return new Recti(liste,a,b,c,"a*(b+c)","2*(a+b+c)");

}
// =========================
// 8
// =========================
  if(ide === 8){
a = 200;
b = 100;
c = randint(5,8)*10;

liste = [
  [0,-(b+c)/2,-(b+c)/2],
  [0,b],
  [90,(b-c)/2],
  [-90,c],
  [90,c],
  [90,c],
  [-90,(b-c)/2],
  [90,(b-c)/2],
  [-90,c],
  [90,c],
  [90,c],
  [-90,(b-c)/2],
  [90,b]
];

return Recti(liste,a,b,c,"b^2+2*c^2","4*(b+c)");

}
// =========================
// 9
// =========================
  if(ide === 9){
a = 300;
b = randint(8,12)*10;
c = randint(5,7)*10;

liste = [
  [0,-(b+c)/2,-b/2],
  [0,b],
  [90,(b-c)/2],
  [-90,c],
  [90,c],
  [90,c],
  [-90,(b-c)/2],
  [90,(b-c)/2],
  [90,c],
  [-90,c],
  [-90,c],
  [90,(b-c)/2],
  [90,b]
];

return new Recti(liste,a,b,c,"b^2","4*(b+c)");

}
// =========================
// 10
// =========================
  if(ide === 10){
a = randint(8,9)*10;
b = 200;
c = randint(5,7)*10;

liste = [
  [0,-(b+c)/2,-b/2],
  [0,b],
  [90,(b-c)/2],
  [-90,c],
  [90,c],
  [90,c],
  [-90,(b-c)/2],
  [90,(b-a)/2],
  [90,a],
  [-90,a],
  [-90,a],
  [90,(b-a)/2],
  [90,b]
];

return new Recti(liste,a,b,c,"b^2+c^2-a^2","4*b+2*a+2*c");
  }
 // =========================
// 11
// =========================
  if(ide === 11){
a = randint(80,120);
b = 200;
c = a - 10;

liste = [
  [0,-(b+a)/2,-b/2],
  [0,b],
  [90,(b-c)/2],
  [-90,a],
  [90,c],
  [90,a],
  [-90,(b-c)/2],
  [90,(b-a)/2],
  [90,a],
  [-90,a],
  [-90,a],
  [90,(b-a)/2],
  [90,b]
];

return new Recti(liste,a,b,c,"b^2+c*a-a^2","4*a+4*b");
}

// =========================
// 12
// =========================
  if(ide === 12){
a = randint(80,120);
b = a + randint(50,80);
c = 200 - b + a;

liste = [
  [0,-b/2,-a/2],
  [0,b],
  [90,c],
  [90,a],
  [-90,a-c],
  [90,b-a],
  [90,a]
];

return new Recti(liste,a,b,c,"a*(b+c-a)","2*a+b+c");
}

// =========================
// 13
// =========================
  if(ide === 13){
b = randint(40,60);
a = 200 - 2*b;
c = 70;

liste = [
  [0,-(a+b)/2,-c],
  [0,a],
  [0,b],
  [90,c],
  [90,a],
  [-90,c],
  [90,b],
  [90,2*c]
];

return new Recti(liste,a,b,c,"c*(a+2*b)","2*a+2*b+4*c");
}

// =========================
// 14
// =========================
  if(ide === 14){
c = 100;
b = randint(40,60);
a = 200 - b;

liste = [
  [0,-(a+b)/2,-(a+b)/2],
  [0,b],
  [0,a],
  [90,a+b],
  [90,a+b],
  [90,a],
  [0,b]
];

return new Recti(liste,a,b,c,"(a+b)^2","4*(a+b)");
}

// =========================
// 15
// =========================
  if(ide === 15){
a = randint(7,9)*10;
b = a - randint(2,4)*10;
c = b + 10;

liste = [
  [0,-(a+b)/2,-(b+c)/2],
  [0,b],
  [0,a],
  [90,b+c],
  [90,a+b],
  [90,c],
  [0,b]
];

return new Recti(liste,a,b,c,"(a+b)*(b+c)","4*b+2*a+2*c");
}

// =========================
// 16
// =========================
  if(ide === 16){
a = 200;
b = 100;
c = randint(5,9)*10;

liste = [
  [0,-(3*c)/2,-(b-c)/2],
  [0,c],
  [-90,c],
  [90,c],
  [90,c],
  [-90,c],
  [90,b],
  [90,c],
  [90,c],
  [-90,c],
  [-90,c],
  [90,c],
  [90,b]
];

return new Recti(liste,a,b,c,"3*b*c","2*b+10*c");
}
// =========================
// 17
// =========================
  if(ide === 17){
a = randint(5,8)*10;
b = 100;
c = randint(4,5)*10;

liste = [
  [0,-2*a,-2*c],
  [90,c],
  [-90,a],
  [90,c],
  [-90,a],
  [90,c],
  [-90,a],
  [90,c],
  [-90,a],
  [-90,4*c],
  [-90,4*a]
];

return new Recti(liste,a,b,c,"10*a*c","8*(a+c)");
}

// =========================
// 18
// =========================
  if(ide === 18){
a = randint(5,8)*10;
b = (2*randint(1,2)+1)*25;
c = 100;

liste = [
  [0,-(3*b)/2,-a],
  [90,a],
  [-90,b],
  [90,a],
  [-90,b],
  [-90,a],
  [90,b],
  [-90,a],
  [-90,3*b]
];

return new Recti(liste,a,b,c,"4*a*b","4*a+6*b");
}

// =========================
// 19
// =========================
  if(ide === 19){
c = 2*randint(2,4)*10;
b = 100;
a = c + randint(1,2)*10;

liste = [
  [0,-(3*a)/2,-c/2],
  [90,c],
  [-90,a],
  [90,c],
  [-90,a],
  [-90,c],
  [90,a],
  [-90,c],
  [-90,a],
  [90,c],
  [-90,a],
  [-90,c],
  [90,a]
];

return new Recti(liste,a,b,c,"5*a*c","6*(a+c)");
}

// =========================
// 20
// =========================
  if(ide === 20){
b = randint(20,40);
a = 200 - 4*b;
c = 70;

liste = [
  [0,a/2,a/2],
  [90,b],
  [90,a],
  [90,b],
  [180,0],
  [90,b],
  [90,a],
  [90,b],
  [180,0],
  [90,b],
  [90,a],
  [90,b],
  [180,0],
  [90,b],
  [90,a],
  [90,b],
  [180,0]
];

return new Recti(liste,a,b,c,"a*(4*b+a)","4*(a+2*b)");
}

// =========================
// 21
// =========================
  if(ide === 21){
b = randint(50,110);
a = 250 - b;
c = randint(2,4)*10;

liste = [
  [0,-a/2,(b+c)/2],
  [-90,b],
  [0,c],
  [90,a],
  [90,c],
  [90,a-c],
  [-90,b],
  [90,c]
];

return new Recti(liste,a,b,c,"c*(a+b)","2*(a+b+c)");
}

// =========================
// 22
// =========================
  if(ide === 22){
b = randint(70,100);
a = 300 - 2*b;
c = randint(3,5)*10;

liste = [
  [0,-a/2,(b+c)/2],
  [-90,b],
  [0,c],
  [90,a],
  [90,c],
  [0,b],
  [90,c],
  [90,b],
  [-90,a-2*c],
  [-90,b],
  [90,c]
];

return new Recti(liste,a,b,c,"c*(a+2*b)","2*(a+2*b+c)");
}
// =========================
// 23
// =========================
  if(ide === 23){
c = randint(10,20)*5;
a = 2*(c+randint(7,10)*2);
b = randint(70,100);


liste = [
  [0,-5*c/2,-a/2],
  [0,5*c],
  [90,a],
  [90,c],
  [90,c],
  [-90,c],
  [-90,c],
  [90,c],
  [90,c],
  [-90,c],
  [-90,c],
  [90,c],
  [90,a]

];

return new Recti(liste,a,b,c,"5*a*c-2*c^2","2*a+14*c");
}

// =========================
// 24
// =========================
  if(ide === 24){
c = randint(50,60)*1;
a = randint(70,90)*1;
b = randint(3,7)*10+2*a-2*c;


liste = [
  [0,-(a+b)/2,-(a+b)/2],
  [0,a],
  [90,c],
  [-90,b],
  [90,c],
  [90,a+b-2*c],
  [-90,a+b-2*c],
  [90,c],
  [90,b],
  [-90,c],
  [90,a],

];

return new Recti(liste,a,b,c,"5*a*c-2*c^2","4*(a+b)");
}

  // =========================
  // ...
  // =========================
  // 👉 Ici tu continues en copiant exactement
  // les blocs 5 → 22
  // en remplaçant random.randint par randint
  // et //2 par /2
  // et ^ reste dans la string (on le gère déjà)
  // =========================
  

}

