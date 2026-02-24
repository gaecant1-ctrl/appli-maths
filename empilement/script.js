
/* =========================================================
   COULEUR ALÉATOIRE
========================================================= */

function generateRandomColor() {
  randomColor = new THREE.Color().setHSL(
    Math.random(), // teinte
    0.8,           // saturation
    0.5            // luminosité
  );
}


/* =========================================================
   SCÈNE
========================================================= */

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);


/* =========================================================
   CAMÉRA ORTHOGRAPHIQUE
========================================================= */

const camera = new THREE.OrthographicCamera(
  -COLS / 2,
   COLS / 2,
   ROWS / 2,
  -ROWS / 2,
  0.1,
  1000
);


/* =========================================================
   RENDERER
========================================================= */

const container = document.getElementById("scene-container");

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

container.appendChild(renderer.domElement);

function resizeRenderer() {
  const width  = container.clientWidth;
  const height = container.clientHeight;

  renderer.setSize(width, height);

  const aspect = width / height;
  const size   = 15;

  camera.left   = -size * aspect / 2;
  camera.right  =  size * aspect / 2;
  camera.top    =  size / 2;
  camera.bottom = -size / 2;

  camera.updateProjectionMatrix();
}

resizeRenderer();
window.addEventListener("resize", resizeRenderer);


/* =========================================================
   LUMIÈRES
========================================================= */

const dirLight = new THREE.DirectionalLight(0xffffff, 1.8);
dirLight.position.set(10, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width  = 1024;
dirLight.shadow.mapSize.height = 1024;
scene.add(dirLight);

scene.add(new THREE.AmbientLight(0xffffff, 1.3));


/* =========================================================
   SOL + GRILLE
========================================================= */

const planeGeom = new THREE.PlaneGeometry(COLS, ROWS);
const planeMat  = new THREE.MeshLambertMaterial({
  color: 0xf0f0f0,
  side: THREE.DoubleSide
});

const plane = new THREE.Mesh(planeGeom, planeMat);
plane.receiveShadow = true;
plane.rotation.x = -Math.PI / 2;
plane.position.set(COLS/2 - 0.5, 0, ROWS/2 - 0.5);
scene.add(plane);

const gridHelper = new THREE.GridHelper(COLS, ROWS);
gridHelper.position.set((COLS - 1) / 2, 0.01, (ROWS - 1) / 2);
scene.add(gridHelper);


/* =========================================================
   ORBIT CAMÉRA
========================================================= */

const vueInitiale = {
  radius: 10,
  height: 6,
  angle: Math.PI / 3 * 1.9
};

const orbit = { ...vueInitiale };
let rotationActive = true;

function setCamera(position, target, upVector) {
  camera.position.copy(position);
  camera.up.copy(upVector);
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();
}

function updateCamera() {

  const centerX = (COLS - 1) / 2;
  const centerZ = (ROWS - 1) / 2;
  const centerY = 2.5; // centre du cube 5x5x5
const worldCenter = new THREE.Vector3(centerX, centerY, centerZ);

  if (cameraMode === "orbit") {

    const pos = new THREE.Vector3(
      centerX + orbit.radius * Math.cos(orbit.angle),
      orbit.height,
      centerZ + orbit.radius * Math.sin(orbit.angle)
    );

    setCamera(
      pos,
      new THREE.Vector3(centerX, 0, centerZ),
      new THREE.Vector3(0, 1, 0)
    );
  }

  if (cameraMode === "front") {
    setCamera(
      new THREE.Vector3(worldCenter.x, 8, worldCenter.z + 20),
      worldCenter,
      new THREE.Vector3(0, 1, 0)
    );
  }

  if (cameraMode === "side") {
    setCamera(
      new THREE.Vector3(worldCenter.x - 20, 8, worldCenter.z),
      worldCenter,
      new THREE.Vector3(0, 1, 0)
    );
  }

  if (cameraMode === "top") {
    setCamera(
      new THREE.Vector3(worldCenter.x, 20, worldCenter.z),
      worldCenter,
      new THREE.Vector3(0, 0, -1)
    );
  }

  camera.updateProjectionMatrix();
}


/* =========================================================
   GESTION DES COULEURS
========================================================= */

function getColor(row, col, heightIndex) {

  if (colorMode === "random") return randomColor;

  if (colorMode === "height") {
    const maxH = 10;
    const ratio = Math.min(heightIndex / maxH, 1);
    return new THREE.Color().setHSL(0.6 - ratio * 0.6, 1, 0.5);
  }

  if (colorMode === "column") {
    const ratio = col / (COLS - 1);
    return new THREE.Color().setHSL(ratio * 0.8, 1, 0.5);
  }

  if (colorMode === "row") {
    const ratio = row / (ROWS - 1);
    return new THREE.Color().setHSL(ratio * 0.8, 1, 0.5);
  }

  return new THREE.Color(0x999999);
}

function threeColorToCSS(color) {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  return `rgb(${r}, ${g}, ${b})`;
}

/* =========================================================
   RAFRAÎCHISSEMENT TABLEAU
========================================================= */

function refreshTableColors() {

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {

      const cell = ws.getCellFromCoords(c, r);
      if (!cell) continue;

      const raw = ws.getValueFromCoords(c, r);
      const h   = Math.max(0, parseInt(raw) || 0);

      // --- MODE FACES ---
      if (colorMode === "faces") {

        if (h === 0) {
          cell.style.backgroundColor = "";
        } else {
          cell.style.backgroundColor = "#e5e7eb";
        }

        continue;
      }

      // --- AUTRES MODES ---
      if (h === 0) {
        cell.style.backgroundColor = "";
      } else {
        const color = getColor(r, c, h);
        cell.style.backgroundColor = threeColorToCSS(color);
      }
    }
  }
}


function refreshColors() {

  // --- Refresh 3D ---
  piles.forEach(p => {
    const h = p.getHeight();
    p.clear();
    p.setHeight(h);
  });

  // --- Refresh tableau ---
  refreshTableColors();
}


/* =========================================================
   MATÉRIAU HACHURÉ
========================================================= */

function createHatchedMaterial(baseColor) {

  const size      = 128;
  const spacing   = 30;
  const thickness = 12;

  const canvas = document.createElement("canvas");
  canvas.width  = size;
  canvas.height = size;

  const ctx = canvas.getContext("2d");

  // --- Fond ---
  const color = new THREE.Color(baseColor);
  ctx.fillStyle = "#" + color.getHexString();
  ctx.fillRect(0, 0, size, size);

  // --- Hachures diagonales ---
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


/* =========================================================
   CRÉATION CUBE
========================================================= */

function makeCube(x, y, z, sizeY, heightIndex) {

  const geom  = new THREE.BoxGeometry(1, sizeY, 1);
  let mat;

  if (colorMode === "faces") {

    const materials = [

      // +X
      createHatchedMaterial(0x00ffff),

      // -X
      new THREE.MeshStandardMaterial({
        color: 0x00ffff,
        roughness: 0.2,
        metalness: 0.1
      }),

      // +Y
      new THREE.MeshStandardMaterial({
        color: 0x00ff00,
        roughness: 0.2,
        metalness: 0.1
      }),

      // -Y
      createHatchedMaterial(0x00ff00),

      // +Z
      new THREE.MeshStandardMaterial({
        color: 0xff0000,
        roughness: 0.2,
        metalness: 0.1
      }),

      // -Z
      createHatchedMaterial(0xff0000)

    ];

    mat = materials;

  } else {

    const color = getColor(z, x, heightIndex);

    mat = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.4,
      metalness: 0.0
    });
  }

  const cube = new THREE.Mesh(geom, mat);
  cube.position.set(x, y, z);
  cube.castShadow    = true;
  cube.receiveShadow = false;

  scene.add(cube);

  // --- Arêtes ---
  const edges = new THREE.EdgesGeometry(geom);
  const line  = new THREE.LineSegments(
    edges,
    new THREE.LineBasicMaterial({ color: 0x004400 })
  );

  line.position.copy(cube.position);
  scene.add(line);

  return { cube, line };
}


/* =========================================================
   CADRE SUPÉRIEUR
========================================================= */

function makeFrame(x, y, z) {

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


/* =========================================================
   OUTILS
========================================================= */

function coordsToCellName(col, row) {
  const letter = String.fromCharCode(65 + col);
  return letter + (row + 1);
}


/* =========================================================
   CLASSE PILE
========================================================= */

class Pile {

  constructor(row, col) {
    this.row    = row;
    this.col    = col;
    this.blocks = [];
    this.frame  = null;
  }

  setHeight(h) {

    // --- Supprimer ancien cadre ---
    if (this.frame) {
      scene.remove(this.frame);
      this.frame = null;
    }

    // --- Réduction ---
    while (this.blocks.length > h) {
      const b = this.blocks.pop();
      scene.remove(b.cube);
      scene.remove(b.line);
    }

    // --- Ajout ---
    while (this.blocks.length < h) {
      const y = this.blocks.length * BRICK_HEIGHT + BRICK_HEIGHT / 2;

      const b = makeCube(
        this.col,
        y,
        this.row,
        BRICK_HEIGHT,
        this.blocks.length + 1
      );

      this.blocks.push(b);
    }

    // --- Cadre supérieur ---
    if (h > 0) {
      const topY = h * BRICK_HEIGHT;
      this.frame = makeFrame(this.col, topY, this.row);
      scene.add(this.frame);
    }
  }

  getHeight() {
    return this.blocks.length;
  }

  clear() {

    this.blocks.forEach(b => {
      scene.remove(b.cube);
      scene.remove(b.line);
    });

    this.blocks = [];

    if (this.frame) {
      scene.remove(this.frame);
      this.frame = null;
    }
  }
}


/* =========================================================
   CRÉATION DES PILES
========================================================= */

const piles = [];

for (let r = 0; r < ROWS; r++) {
  for (let c = 0; c < COLS; c++) {
    piles.push(new Pile(r, c));
  }
}

function setPile(row, col, h) {
  piles[row * COLS + col].setHeight(h);
}


/* =========================================================
   ANIMATION
========================================================= */

function animate() {

  requestAnimationFrame(animate);

  if (cameraMode === "orbit" && rotationActive) {
    orbit.angle += 0.005;
  }

  updateCamera();
  renderer.render(scene, camera);
}

updateCamera();
animate();

