class SceneManager {

  constructor(container) {

    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xf1f5f9);

    this.renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: true        // 🔥 IMPORTANT
});
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(this.renderer.domElement);

    this.initLights();
    this.initGround();
    this.resize();

    window.addEventListener("resize", () => this.resize());
  }

initLights() {

  this.dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
  this.dirLight.position.set(10, 20, 10);
  this.dirLight.castShadow = true;
  this.dirLight.shadow.mapSize.width = 2048;
  this.dirLight.shadow.mapSize.height = 2048;

  this.scene.add(this.dirLight);

  this.ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
  this.scene.add(this.ambientLight);
}

  initGround() {

    const planeGeom = new THREE.PlaneGeometry(COLS, ROWS);
    const planeMat = new THREE.MeshLambertMaterial({
      color: 0xf0f0f0,
      side: THREE.DoubleSide
    });

    const plane = new THREE.Mesh(planeGeom, planeMat);
    plane.receiveShadow = true;
    plane.rotation.x = -Math.PI / 2;
    plane.position.set(COLS/2 - 0.5, 0, ROWS/2 - 0.5);

    this.scene.add(plane);

    const gridHelper = new THREE.GridHelper(COLS, ROWS);
    gridHelper.position.set((COLS - 1)/2, 0.01, (ROWS - 1)/2);

    this.scene.add(gridHelper);
  }

resize() {

  const width  = this.container.clientWidth;
  const height = this.container.clientHeight;

  this.renderer.setSize(width, height);
  this.renderer.setViewport(0, 0, width, height);

  if (!this.camera) return;

  const aspect = width / height;
  const baseSize = 10; // 5 + marge confortable

  if (aspect >= 1) {
    // écran large → on fixe la hauteur
    this.camera.top    =  baseSize / 2;
    this.camera.bottom = -baseSize / 2;

    const worldWidth = baseSize * aspect;
    this.camera.left  = -worldWidth / 2;
    this.camera.right =  worldWidth / 2;

  } else {
    // écran haut → on fixe la largeur
    this.camera.left  = -baseSize / 2;
    this.camera.right =  baseSize / 2;

    const worldHeight = baseSize / aspect;
    this.camera.top    =  worldHeight / 2;
    this.camera.bottom = -worldHeight / 2;
  }

  this.camera.updateProjectionMatrix();
}

setCamera(camera) {
  this.camera = camera;
  this.resize(); // applique projection correcte
}

  add(obj) {
    this.scene.add(obj);
  }

  remove(obj) {
    this.scene.remove(obj);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}




class CameraController {

  constructor(sceneManager) {

    this.sceneManager = sceneManager;

    this.camera = new THREE.OrthographicCamera(
      -COLS / 2,
       COLS / 2,
       ROWS / 2,
      -ROWS / 2,
      0.1,
      1000
    );

    this.mode = "orbit";
    this.rotationActive = true;

    this.orbit = {
      radius: 10,
      height: 6,
      angle: Math.PI / 3 * 1.9
    };

    sceneManager.setCamera(this.camera);
    this.updateRotationButtons();
  }

setRotation(active) {

  this.rotationActive = active;

  const rotBtn = document.getElementById("toggleRotBtn");

  if (rotBtn) {
    rotBtn.innerHTML = active ? iconPause : iconPlay;
    rotBtn.classList.toggle("active", active);
  }

  this.updateRotationButtons();
}

rotateStep(direction) {

  // On ne tourne que si rotation auto désactivée
  if (this.rotationActive) return;

  if (this.mode !== "orbit") return;

  const step = THREE.MathUtils.degToRad(1);

  if (direction === "left") {
    this.orbit.angle -= step;
  }

  if (direction === "right") {
    this.orbit.angle += step;
  }
}

updateRotationButtons() {

  const leftBtn  = document.getElementById("rotLeftBtn");
  const rightBtn = document.getElementById("rotRightBtn");

  const manualAllowed =
    this.mode === "orbit" && !this.rotationActive;

  if (leftBtn && rightBtn) {

    leftBtn.disabled  = !manualAllowed;
    rightBtn.disabled = !manualAllowed;

    leftBtn.classList.toggle("disabled", !manualAllowed);
    rightBtn.classList.toggle("disabled", !manualAllowed);
  }
}

setView(mode) {

  this.mode = mode;

  // On coupe toujours la rotation auto
  this.setRotation(false);

  if (mode === "orbit") {
    this.orbit.angle  = Math.PI / 3 * 1.9;
    this.orbit.radius = 10;
    this.orbit.height = 6;
  }

  this.updateRotationButtons();
}

update() {

  const centerX = (COLS - 1) / 2;
  const centerZ = (ROWS - 1) / 2;
  const centerY = 2.5; // centre du cube 5x5x5

  const distance = 10; // juste pour être hors du cube


// ================================
// ORBIT
// ================================
if (this.mode === "orbit") {

  this.sceneManager.dirLight.visible = true;
  this.sceneManager.ambientLight.intensity = 0.9;

  if (this.rotationActive) {
    this.orbit.angle += 0.005;
  }

  const pos = new THREE.Vector3(
    centerX + this.orbit.radius * Math.cos(this.orbit.angle),
    this.orbit.height,
    centerZ + this.orbit.radius * Math.sin(this.orbit.angle)
  );

  this.camera.position.copy(pos);
  this.camera.lookAt(centerX, centerY, centerZ);
  this.camera.up.set(0, 1, 0);
  return;
}

// ================================
// FRONT / SIDE
// ================================
if (["front","back","left","right"].includes(this.mode)) {

  this.sceneManager.dirLight.visible = false;
  this.sceneManager.ambientLight.intensity = 2.5;

  if (this.mode === "front") {
    this.camera.position.set(centerX, centerY, centerZ + distance);
  }

  if (this.mode === "back") {
    this.camera.position.set(centerX, centerY, centerZ - distance);
  }

  if (this.mode === "right") {
    this.camera.position.set(centerX + distance, centerY, centerZ);
  }

  if (this.mode === "left") {
    this.camera.position.set(centerX - distance, centerY, centerZ);
  }

  this.camera.lookAt(centerX, centerY, centerZ);
  this.camera.up.set(0, 1, 0);
  return;
}

// ================================
// TOP
// ================================
if (this.mode === "top") {

  this.sceneManager.dirLight.visible = false;
  this.sceneManager.ambientLight.intensity = 2.5;

  this.camera.position.set(centerX, centerY + distance, centerZ);
  this.camera.lookAt(centerX, centerY, centerZ);
  this.camera.up.set(0, 0, -1);
  return;
}
}
}

class ColorManager {

  constructor() {
    this.mode = "height";
    this.randomColor = new THREE.Color();
    
  }

 setMaxHeight(max) {
    this.maxHeight = Math.max(max, 1);
 }
 
generateRandom() {
  this.randomColor.setHSL(Math.random(), 0.8, 0.5);
}

  getColor(row, col, heightIndex) {

if (this.mode === "random") {

  const denom = Math.max(this.maxHeight - 1, 1);
  const ratio = heightIndex / denom;

  const hsl = {};
  this.randomColor.getHSL(hsl);

  const light = 0.35 + ratio * 0.45;

  return new THREE.Color().setHSL(
    hsl.h,
    hsl.s,
    light
  );
}

if (this.mode === "height") {

  const ratio = heightIndex / (this.maxHeight - 1 || 1);

  return new THREE.Color().setHSL(
    ratio,     // plein spectre
    1,
    0.5
  );
}


    if (this.mode === "column") {
      const ratio = col / (COLS - 1);
      return new THREE.Color().setHSL(ratio * 0.8, 1, 0.5);
    }

    if (this.mode === "row") {
      const ratio = row / (ROWS - 1);
      return new THREE.Color().setHSL(ratio * 0.8, 1, 0.5);
    }

    return new THREE.Color(0x999999);
  }
}

class PileManager {

  constructor(sceneManager, colorManager) {

    this.sceneManager = sceneManager;
    this.colorManager = colorManager;
    this.piles = [];

    this.init();
  }

  init() {

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.piles.push(new Pile(r, c, this.sceneManager, this.colorManager));
      }
    }
  }

  setHeight(row, col, h) {
    this.piles[row * COLS + col].setHeight(h);
  }
}

function createHatchedMaterial(baseColor) {

  const size      = 128;
  const spacing   = 30;
  const thickness = 12;

  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  const color = new THREE.Color(baseColor);
  ctx.fillStyle = "#" + color.getHexString();
  ctx.fillRect(0, 0, size, size);

  ctx.strokeStyle = "rgba(0,0,0,0.6)";
  ctx.lineWidth   = thickness;

  ctx.beginPath();
  for (let i = -size; i <= size * 2; i += spacing) {
    ctx.moveTo(i, size);
    ctx.lineTo(i + size, 0);
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  return new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.25,
    metalness: 0.05
  });
}

class Pile {

  constructor(row, col, sceneManager, colorManager) {

    this.row = row;
    this.col = col;

    this.sceneManager = sceneManager;
    this.colorManager = colorManager;

    this.blocks = [];
    this.frame  = null;
  }

  /* ============================
     Définir hauteur
  ============================ */

  setHeight(h) {

    // --- Supprimer ancien cadre ---
    if (this.frame) {
      this.sceneManager.remove(this.frame);
      this.frame = null;
    }

    // --- Réduction ---
    while (this.blocks.length > h) {

      const b = this.blocks.pop();

      this.sceneManager.remove(b.cube);
      this.sceneManager.remove(b.line);
    }

    // --- Ajout ---
    while (this.blocks.length < h) {

      const y = this.blocks.length * BRICK_HEIGHT + BRICK_HEIGHT / 2;

      const block = this.makeCube(
        this.col,
        y,
        this.row,
        BRICK_HEIGHT,
        this.blocks.length + 1
      );

      this.blocks.push(block);
    }

    // --- Cadre supérieur ---
    if (h > 0) {

      const topY = h * BRICK_HEIGHT;

      this.frame = this.makeFrame(
        this.col,
        topY,
        this.row
      );

      this.sceneManager.add(this.frame);
    }
  }

  /* ============================
     Hauteur actuelle
  ============================ */

  getHeight() {
    return this.blocks.length;
  }

  /* ============================
     Clear complet
  ============================ */

  clear() {

    this.blocks.forEach(b => {
      this.sceneManager.remove(b.cube);
      this.sceneManager.remove(b.line);
    });

    this.blocks = [];

    if (this.frame) {
      this.sceneManager.remove(this.frame);
      this.frame = null;
    }
  }

  /* ============================
     Création cube
  ============================ */

makeCube(x, y, z, sizeY, heightIndex) {

  const geom = new THREE.BoxGeometry(1, sizeY, 1);
  let mat;

  if (this.colorManager.mode === "faces") {

    mat = [

      // +X
// +X
createHatchedMaterial(0x7dd3fc),

// -X
new THREE.MeshStandardMaterial({
  color: 0x7dd3fc,
  roughness: 0.05,
  metalness: 0.0
}),

      // +Y
      new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        roughness: 0.05,
        metalness: 0.0
      }),

      // -Y
      createHatchedMaterial(0x00ff00),

      // +Z
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.05,
        metalness: 0.0
      }),

      // -Z
      createHatchedMaterial(0xff0000)

    ];

  } else {

    const color = this.colorManager.getColor(
      z,
      x,
      heightIndex
    );

    mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.25,
      metalness: 0.05
    });
  }

  const cube = new THREE.Mesh(geom, mat);
  cube.position.set(x, y, z);
  cube.castShadow = true;
  cube.receiveShadow = false;

  this.sceneManager.add(cube);

  const edges = new THREE.EdgesGeometry(geom);
  const line  = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x004400 })
  );

  line.position.copy(cube.position);
  this.sceneManager.add(line);

  return { cube, line };
}

  /* ============================
     Cadre supérieur
  ============================ */

  makeFrame(x, y, z) {

    const geom = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(1, 0, 1),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(0, 0, 0)
    ]);

    const mat = new THREE.LineBasicMaterial({
      color: 0x006000,
      linewidth: 2
    });

    const frame = new THREE.Line(geom, mat);
    frame.position.set(x - 0.5, y + 0.001, z - 0.5);

    return frame;
  }
}


class App {

  constructor() {

    const container = document.getElementById("scene-container");

    this.sceneManager = new SceneManager(container);
    this.camera       = new CameraController(this.sceneManager);
    this.colors       = new ColorManager();
    this.piles        = new PileManager(this.sceneManager, this.colors);
    this.colors.mode = "column";
    this.camera.mode = "orbit";
    this.animate();
  }

  animate() {
    requestAnimationFrame(() => this.animate());
    this.camera.update();
    this.sceneManager.render();
  }
}

const app = new App();

let rotBtn = document.getElementById("toggleRotBtn");
rotBtn.innerHTML = iconPause; // rotation active au départ
rotBtn.classList.add("active");
app.camera.updateRotationButtons();


function setPile(row, col, h) {
  app.piles.setHeight(row, col, h);
}

function refreshTableColors() {

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {

      const cell = ws.getCellFromCoords(c, r);
      if (!cell) continue;

      const raw = ws.getValueFromCoords(c, r);
      const h = Math.max(0, parseInt(raw) || 0);

      if (h === 0) {
        cell.style.backgroundColor = "";
      } else {
        const color = app.colors.getColor(r, c, h);
        cell.style.backgroundColor =
          `rgb(${Math.round(color.r*255)},
               ${Math.round(color.g*255)},
               ${Math.round(color.b*255)})`;
      }
    }
  }
  
}


function refreshColors() {

  // 1️⃣ Calculer le max réel des piles
  const maxH = Math.max(
    ...app.piles.piles.map(p => p.getHeight())
  );

  // 2️⃣ L’enregistrer dans ColorManager
  app.colors.setMaxHeight(maxH);

  // 3️⃣ Rebuild 3D
  app.piles.piles.forEach(p => {
    const h = p.getHeight();
    p.clear();
    p.setHeight(h);
  });

  // 4️⃣ Refresh tableau
  refreshTableColors();
}
