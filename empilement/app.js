/* =========================================================
   ICONES
========================================================= */

const setIcon = (id, svg) => {
  const el = document.getElementById(id);
  if (!el) return;
  el.innerHTML = svg;
};

setIcon("modeRandomBtn", `
<svg viewBox="0 0 24 24" class="icon">
  <circle cx="6" cy="6" r="3" fill="currentColor"/>
  <circle cx="18" cy="6" r="3" fill="currentColor"/>
  <circle cx="12" cy="18" r="3" fill="currentColor"/>
</svg>`);

setIcon("modeHeightBtn", `
<svg viewBox="0 0 24 24" class="icon" fill="currentColor">
  <rect x="5" y="5" width="14" height="14" rx="3"/>
</svg>`);

setIcon("modeColumnBtn", `
<svg viewBox="0 0 24 24" class="icon" fill="currentColor">
  <rect x="4" y="4" width="4" height="16"/>
  <rect x="10" y="4" width="4" height="16"/>
  <rect x="16" y="4" width="4" height="16"/>
</svg>`);

setIcon("modeRowBtn", `
<svg viewBox="0 0 24 24" class="icon" fill="currentColor">
  <rect x="4" y="4" width="16" height="4"/>
  <rect x="4" y="10" width="16" height="4"/>
  <rect x="4" y="16" width="16" height="4"/>
</svg>`);

setIcon("modeFacesBtn", `
<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="2">
  <path d="M12 3L20 8L12 13L4 8Z"/>
  <path d="M4 8V16L12 21V13"/>
  <path d="M20 8V16L12 21"/>
</svg>`);

setIcon("shuffleRandomBtn", `
<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
  <path d="M4 7h4l2 3 2-3h8"/>
  <path d="M4 17h4l2-3 2 3h8"/>
</svg>`);

setIcon("resetViewBtn", `
<svg viewBox="0 0 24 24" class="icon" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round">
  <path d="M3 11L12 4l9 7"/>
  <path d="M5 10v10h14V10"/>
</svg>`);


setIcon("viewOrbitBtn", `
  <svg viewBox="0 0 24 24" class="icon">
    <path d="M3 11L12 4l9 7" />
    <path d="M5 10v10h14V10" />
  </svg>`);


const cubeIcon = (face) => `
<svg viewBox="0 0 24 24"
     class="icon"
     fill="none"
     stroke-linecap="round"
     stroke-linejoin="round">

  <!-- ===== FACES CACHEES ===== -->

  <!-- arrière -->
  <rect x="9" y="5" width="10" height="10"
        fill="${face === 'back' ? '#cbd5e1' : 'none'}"
        stroke="currentColor"
        stroke-width="${face === 'back' ? '1.6' : '0.8'}"
        stroke-dasharray="${face === 'back' ? '0' : '3 2'}"
        vector-effect="non-scaling-stroke"/>

  <!-- gauche -->
  <polygon points="5,9 9,5 9,15 5,19"
        fill="${face === 'left' ? '#cbd5e1' : 'none'}"
        stroke="currentColor"
        stroke-width="${face === 'left' ? '1.6' : '0.8'}"
        stroke-dasharray="${face === 'left' ? '0' : '3 2'}"
        vector-effect="non-scaling-stroke"/>

  <!-- ===== FACES VISIBLES ===== -->

  <!-- avant -->
  <rect x="5" y="9" width="10" height="10"
        fill="${face === 'front' ? '#cbd5e1' : 'none'}"
        stroke="currentColor"
        stroke-width="${face === 'front' ? '1.6' : '0.8'}"
        vector-effect="non-scaling-stroke"/>

  <!-- dessus -->
  <polygon points="5,9 9,5 19,5 15,9"
        fill="${face === 'top' ? '#cbd5e1' : 'none'}"
        stroke="currentColor"
        stroke-width="${face === 'top' ? '1.6' : '0.8'}"
        vector-effect="non-scaling-stroke"/>

  <!-- droite -->
  <polygon points="15,9 19,5 19,15 15,19"
        fill="${face === 'right' ? '#cbd5e1' : 'none'}"
        stroke="currentColor"
        stroke-width="${face === 'right' ? '1.6' : '0.8'}"
        vector-effect="non-scaling-stroke"/>

</svg>`;

setIcon("viewFrontBtn", cubeIcon("front"));
setIcon("viewBackBtn", cubeIcon("back"));
setIcon("viewTopBtn", cubeIcon("top"));
setIcon("viewLeftBtn", cubeIcon("left"));
setIcon("viewRightBtn", cubeIcon("right"));
// back = on colorie la face avant du cube orienté gauche
/* =========================================================
   ROTATION / ZOOM / RESET
========================================================= */

document.getElementById("toggleRotBtn").addEventListener("click", () => {

  const cam = app.camera;
  cam.rotationActive = !cam.rotationActive;

  const btn = document.getElementById("toggleRotBtn");

  if (cam.rotationActive) {
    btn.textContent = "⟳";
    btn.classList.remove("paused");
  } else {
    btn.textContent = "⏸";
    btn.classList.add("paused");
  }
});

document.getElementById("resetViewBtn").addEventListener("click", () => {

  const cam = app.camera;

  cam.rotationActive = false;
  cam.orbit.radius = 10;
  cam.orbit.height = 6;
  cam.orbit.angle  = Math.PI / 3 * 1.9;

  cam.camera.zoom = 1;
  cam.camera.updateProjectionMatrix();
});

document.getElementById("zoomInBtn").addEventListener("click", () => {
  const cam = app.camera.camera;
  cam.zoom *= 1.2;
  cam.updateProjectionMatrix();
});

document.getElementById("zoomOutBtn").addEventListener("click", () => {
  const cam = app.camera.camera;
  cam.zoom /= 1.2;
  cam.updateProjectionMatrix();
});


/* =========================================================
   VALIDATION TABLEAU
========================================================= */

function valider() {
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const raw = ws.getValueFromCoords(c, r);
      const h = Math.max(0, parseInt(raw) || 0);
      setPile(r, c, h);
    }
  }
  refreshTableColors();
}


/* =========================================================
   CLEAR / INC / DEC
========================================================= */

document.getElementById("clearBtn").addEventListener("click", () => {
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      ws.setValueFromCoords(c, r, "");
});

function applyToSelection(callback) {

  if (!lastSelection) return;

  let [x1, y1, x2, y2] = lastSelection;

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);

  for (let r = minY; r <= maxY; r++)
    for (let c = minX; c <= maxX; c++)
      callback(c, r);
}

document.getElementById("incBtn").addEventListener("click", () => {
  applyToSelection((c, r) => {
    const v = parseInt(ws.getValueFromCoords(c, r), 10);
    ws.setValueFromCoords(c, r, (isNaN(v) ? 0 : v) + 1);
  });
});

document.getElementById("decBtn").addEventListener("click", () => {
  applyToSelection((c, r) => {
    let v = parseInt(ws.getValueFromCoords(c, r), 10);
    if (isNaN(v)) v = 0;
    if (v > 0) ws.setValueFromCoords(c, r, v - 1);
  });
});


document.getElementById("toggleTableBtn")
  .addEventListener("click", () => {

    const sheet = document.getElementById("spreadsheet");
    sheet.classList.toggle("hidden-spreadsheet");

});

/* =========================================================
   EXPORT PNG
========================================================= */

document.getElementById("savePngBtn").addEventListener("click", () => {

  app.sceneManager.render();

  const dataURL =
    app.sceneManager.renderer.domElement.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = dataURL;
  a.download = "scene.png";
  a.click();
});


/* =========================================================
   COULEURS
========================================================= */

function setColorMode(mode, btn) {
  app.colors.mode = mode;
  setActiveButton(btn);
  refreshColors();
}

const paletteButtons = [
  document.getElementById("modeHeightBtn"),
  document.getElementById("modeColumnBtn"),
  document.getElementById("modeRowBtn"),
  document.getElementById("modeRandomBtn"),
  document.getElementById("modeFacesBtn")
];

paletteButtons.forEach(b => b.classList.add("palette-btn"));

function setActiveButton(activeBtn){
  paletteButtons.forEach(b => b.classList.remove("active"));
  activeBtn.classList.add("active");
}

document.getElementById("modeHeightBtn")
  .addEventListener("click", () =>
    setColorMode("height", modeHeightBtn));

document.getElementById("modeColumnBtn")
  .addEventListener("click", () =>
    setColorMode("column", modeColumnBtn));

document.getElementById("modeRowBtn")
  .addEventListener("click", () =>
    setColorMode("row", modeRowBtn));

document.getElementById("modeFacesBtn")
  .addEventListener("click", () =>
    setColorMode("faces", modeFacesBtn)
    );

document.getElementById("modeRandomBtn")
  .addEventListener("click", () => {
    app.colors.generateRandom();
    setColorMode("random", modeRandomBtn);
  });


/* =========================================================
   SHUFFLE
========================================================= */

document.getElementById("shuffleRandomBtn").addEventListener("click", () => {

  const MAX_HEIGHT = 5;
  const maxTotal = parseInt(
    document.getElementById("totalCubesInput").value
  ) || 0;

  const MAX_POSSIBLE = ROWS * COLS * MAX_HEIGHT;
  const target = Math.min(maxTotal, MAX_POSSIBLE);

  const grid = Array.from({ length: ROWS }, () =>
    Array(COLS).fill(0)
  );

  let total = 0;

  while (total < target) {

    const r = Math.floor(Math.random() * ROWS);
    const c = Math.floor(Math.random() * COLS);

    if (grid[r][c] < MAX_HEIGHT) {
      grid[r][c]++;
      total++;
    }
  }

  ws.setData(grid);
  valider();
});

/* =========================================================
   VUES CAMERA
========================================================= */

function setView(mode, rotate = false) {
  app.camera.mode = mode;
  app.camera.rotationActive = rotate;
}

document.getElementById("viewTopBtn")
  .addEventListener("click", () => app.camera.setView("top"));

document.getElementById("viewFrontBtn")
  .addEventListener("click", () => app.camera.setView("front"));

document.getElementById("viewBackBtn")
  .addEventListener("click", () => app.camera.setView("back"));

document.getElementById("viewLeftBtn")
  .addEventListener("click", () => app.camera.setView("left"));

document.getElementById("viewRightBtn")
  .addEventListener("click", () => app.camera.setView("right"));

document.getElementById("viewOrbitBtn")
  .addEventListener("click", () => app.camera.setView("orbit"));


/* =========================================================
   BANQUE DE TABLEAUX
========================================================= */

const banqueTableaux = [

  // Escalier
  [
    [0,1,2,3,4],
    [0,1,2,3,4],
    [0,1,2,3,4],
    [0,1,2,3,4],
    [0,1,2,3,4]
  ],

  // Pyramide
  [
    [0,0,1,0,0],
    [0,1,2,1,0],
    [1,2,3,2,1],
    [0,1,2,1,0],
    [0,0,1,0,0]
  ],

  // Diagonale
  [
    [1,0,0,0,0],
    [0,2,0,0,0],
    [0,0,3,0,0],
    [0,0,0,4,0],
    [0,0,0,0,5]
  ],

  // Plateau central
  [
    [1,1,1,1,1],
    [1,3,3,3,1],
    [1,3,5,3,1],
    [1,3,3,3,1],
    [1,1,1,1,1]
  ]
];


document.getElementById("shuffleBtn").addEventListener("click", () => {

  const index = Math.floor(Math.random() * banqueTableaux.length);
  const tableau = banqueTableaux[index];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      ws.setValueFromCoords(c, r, tableau[r][c]);
    }
  }

  valider(); // mise à jour 3D
});