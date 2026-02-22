// ==================================================
// VARIABLES GLOBALES
// ==================================================

var canvas1 = document.getElementById("canvas1");
var canvas2 = document.getElementById("canvas2");

var masse1 = document.getElementById("masse1");
var masse2 = document.getElementById("masse2");
var angle1 = document.getElementById("angle1");
var angle2 = document.getElementById("angle2");

var reponse = document.getElementById("reponse");
var scoreDiv = document.getElementById("score");

var rep = "";
var score = 0;
var compteur = 0;


// ==================================================
// CLASSE BALLON
// ==================================================

class Ballon {
  constructor(a, b) {
    this.a = a;
    this.b = b;
    this.radius = 50;
  }

  draw(canvas) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    var x = canvas.width / 2;
    var y = canvas.height / 2;

    if (this.b === 1) {

      ctx.beginPath();
      ctx.arc(x, y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgb(100,255,0)";
      ctx.fill();
      ctx.stroke();

    } else {

      // fond gris
      ctx.beginPath();
      ctx.arc(x, y, this.radius, 0, Math.PI * 2);
      ctx.fillStyle = "#e5e7eb";
      ctx.fill();
      ctx.stroke();

      // secteur vert proportionnel
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.arc(
        x,
        y,
        this.radius,
        0,
        -2 * Math.PI * this.a / this.b,
        true
      );
      ctx.closePath();

      ctx.fillStyle = "rgb(100,255,0)";
      ctx.fill();
      ctx.stroke();
    }
  }
}


// ==================================================
// INITIALISATION LISTENERS (UNE SEULE FOIS)
// ==================================================

reponse.addEventListener("change", test);

scoreDiv.addEventListener("click", function () {
  if (scoreDiv.classList.contains("scoButton")) {
    passe();
  }
});


// ==================================================
// JEU
// ==================================================

function jeu() {

  compteur++;

  reponse.value = "";
  reponse.disabled = false;
  reponse.style.background = "rgb(0,255,255)";

  scoreDiv.className = "sco";

  var arr = [2, 3, 4,5,6,8,9,10,12];
  var b = arr[Math.floor(Math.random() * arr.length)];
  var a = Math.floor(Math.random() * (b - 1) + 1);

  var ball1 = new Ballon(1, 1);
  var ball2 = new Ballon(a, b);

  var M = b * Math.floor(Math.random() * 10 + 1) * 10;
  var m = M / b * a;
  var ang = 360 / b * a;

  rep = String(m) + "g";

  angle1.innerHTML = "Angle : A = 360°";
  angle2.innerHTML = "Angle : a = " + ang + "°";

  masse1.innerHTML = "Masse : M = " + M + "g";
  masse2.innerHTML = "Masse : m = ?";

  ball1.draw(canvas1);
  ball2.draw(canvas2);
}


// ==================================================
// TEST
// ==================================================

function test() {

  reponse.blur();

  if (reponse.value === rep) {
    gagne();
  } else {
    perd();
  }
}


// ==================================================
// GAGNE
// ==================================================

function gagne() {

  reponse.style.background = "green";
  reponse.disabled = true;

  score++;

  scoreDiv.innerHTML = "Question suivante ▶ (Score : " + score + "/" + compteur + ")";

  scoreDiv.className = "scoButton";
}


// ==================================================
// PERDU
// ==================================================

function perd() {

  reponse.style.background = "red";
  reponse.disabled = true;

  scoreDiv.innerHTML = "Question suivante ▶ (Score : " + score + "/" + compteur + ")";

  scoreDiv.className = "scoButton";
}


// ==================================================
// RESET INPUT
// ==================================================

function vide() {
  reponse.value = "";
  reponse.style.background = "rgb(0,255,255)";
}


// ==================================================
// PASSER A LA QUESTION SUIVANTE
// ==================================================

function passe() {

  if (compteur < 10) {
    jeu();
  } else {
    scoreDiv.innerHTML = "Partie terminée : " + score + "/10";
    scoreDiv.className = "sco";
  }
}


// ==================================================
// LANCEMENT INITIAL
// ==================================================

jeu();


// ==================================================
// ANIMATION DISTRACTEUR FANTÔME
// ==================================================

window.addEventListener("load", function () {

  const bgCanvas = document.getElementById("bgCanvas");
  const bgCtx = bgCanvas.getContext("2d");

  function resizeBG() {
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
  }

  resizeBG();
  window.addEventListener("resize", resizeBG);

  const emojis = [
    "😊","😜","😎","🤯",
    "😂","😵","🤪","😇","😏"
  ];

  class FloatingEmoji {

    constructor() {
      this.reset();
    }

    reset() {
      this.x = Math.random() * bgCanvas.width;
      this.y = Math.random() * bgCanvas.height;

      this.size = 20 + Math.random() * 40;

      this.speedX = (Math.random() - 0.5) * 1.2;
      this.speedY = (Math.random() - 0.5) * 1.2;

      this.rotation = Math.random() * Math.PI * 2;
      this.rotationSpeed = (Math.random() - 0.5) * 0.03;

      this.opacity = 0.5 + Math.random() * 0.03;
      this.fadeSpeed = 0.001 + Math.random() * 0.002;

      this.emoji = emojis[Math.floor(Math.random() * emojis.length)];
    }

    update(multiplier = 1) {

      this.x += this.speedX * multiplier;
      this.y += this.speedY * multiplier;

      this.rotation += this.rotationSpeed * multiplier;

      this.opacity += this.fadeSpeed;
      if (this.opacity > 0.08 || this.opacity < 0.03) {
        this.fadeSpeed *= -1;
      }

      if (this.x < -50 || this.x > bgCanvas.width + 50) {
        this.speedX *= -1;
      }

      if (this.y < -50 || this.y > bgCanvas.height + 50) {
        this.speedY *= -1;
      }
    }

    draw() {

      bgCtx.save();

      bgCtx.globalAlpha = this.opacity;

      bgCtx.translate(this.x, this.y);
      bgCtx.rotate(this.rotation);

      bgCtx.font = this.size + "px Arial";
      bgCtx.textAlign = "center";
      bgCtx.textBaseline = "middle";

      bgCtx.fillText(this.emoji, 0, 0);

      bgCtx.restore();
    }
  }

  let elements = [];
  for (let i = 0; i < 25; i++) {
    elements.push(new FloatingEmoji());
  }

  let flashTime = 0;
  let flashDuration = 0;
  let flashCooldown = 0;
  let flashEmoji = null;

  function animate() {

    bgCtx.clearRect(0, 0, bgCanvas.width, bgCanvas.height);

    if (flashCooldown <= 0 && Math.random() < 0.0025) {
      flashDuration = 60;
      flashTime = 0;
      flashCooldown = 500;
      flashEmoji = emojis[Math.floor(Math.random() * emojis.length)];
    }

    let multiplier = flashDuration > 0 ? 2 : 1;

    elements.forEach(el => {
      el.update(multiplier);
      el.draw();
    });

    if (flashDuration > 0) {

      let progress = flashTime / flashDuration;
      let opacity = 0.8 + Math.sin(progress * Math.PI) * 0.2;
      let size = 150 + 150 * Math.sin(progress * Math.PI);
      let rotation = progress * Math.PI * 4;

      bgCtx.save();
      bgCtx.globalAlpha = opacity;
      bgCtx.translate(bgCanvas.width / 2, bgCanvas.height / 2);
      bgCtx.rotate(rotation);
      bgCtx.font = size + "px Arial";
      bgCtx.textAlign = "center";
      bgCtx.textBaseline = "middle";
      bgCtx.fillText(flashEmoji, 0, 0);
      bgCtx.restore();

      flashTime++;
      flashDuration--;
    }

    if (flashCooldown > 0) flashCooldown--;

    requestAnimationFrame(animate);
  }

  animate();
});
