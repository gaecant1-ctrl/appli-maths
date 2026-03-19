export class Render {

constructor({sliders,variables,scene}){

this.slidersDiv = sliders
this.variablesDiv = variables
this.sceneDiv = scene

this.scale = 20
this.maxRadius = 8
this.maxHeight = 12

/* rotation indépendante */
this.autoRotate = true

this.initThree()

}


/* =========================
INITIALISATION THREE
========================= */

initThree(){

const width = this.sceneDiv.clientWidth
const height = this.sceneDiv.clientHeight

/* scène */

this.scene = new THREE.Scene()

/* caméra */

const aspect = width/height
const d = 200

this.perspCamera = new THREE.PerspectiveCamera(
45,
aspect,
0.1,
5000
)

this.perspCamera.position.set(150,250,300)
this.perspCamera.lookAt(0,100,0)

this.orthoCamera = new THREE.OrthographicCamera(
-d*aspect,
 d*aspect,
 d,
-d,
0.1,
5000
)

this.orthoCamera.position.set(0,150,400)
this.orthoCamera.lookAt(0,150,0)

/* caméra active */

this.activeCamera = this.perspCamera

/* renderer */

this.renderer = new THREE.WebGLRenderer({
antialias:true
})

this.renderer.sortObjects = true

this.renderer.setClearColor(0xf4f6fa,1)
this.renderer.clear(true,true,true)

this.renderer.setPixelRatio(Math.min(window.devicePixelRatio,2))
this.renderer.setSize(width,height)

this.sceneDiv.appendChild(this.renderer.domElement)

/* lumières */

const light = new THREE.DirectionalLight(0xffffff,1)
light.position.set(200,400,200)
this.scene.add(light)

const amb = new THREE.AmbientLight(0xffffff,0.6)
this.scene.add(amb)

/* grille */

this.createGrid()

/* axe vertical */

this.createVerticalAxis()

/* centre */

this.createCenterMarker()

/* animation */

this.animate()

}


/* =========================
GRILLE
========================= */

createGrid(){

const size = 600
const step = 20
const half = size/2

const planeGeom = new THREE.PlaneGeometry(size,size)

const planeMat = new THREE.MeshBasicMaterial({
color:0xf2f6ff
})

const plane = new THREE.Mesh(planeGeom,planeMat)

plane.rotation.x = -Math.PI/2
plane.position.y = -1.5

this.scene.add(plane)

const mat = new THREE.MeshBasicMaterial({
color:0x6f7f9a
})

for(let i=-half;i<=half;i+=step){

const geom = new THREE.PlaneGeometry(size,1.2)
const line = new THREE.Mesh(geom,mat)

line.rotation.x = -Math.PI/2
line.position.z = i
line.position.y = -1

this.scene.add(line)

}

for(let i=-half;i<=half;i+=step){

const geom = new THREE.PlaneGeometry(1.2,size)
const line = new THREE.Mesh(geom,mat)

line.rotation.x = -Math.PI/2
line.position.x = i
line.position.y = -1

this.scene.add(line)

}

}


/* =========================
AXE VERTICAL
========================= */

createVerticalAxis(){

const s = this.scale
const max = 15

const matAxis = new THREE.LineBasicMaterial({
color:0x008800
})

const axisPoints = [
new THREE.Vector3(0,0,0),
new THREE.Vector3(0,max*s,0)
]

const axisGeom = new THREE.BufferGeometry()
.setFromPoints(axisPoints)

const axis = new THREE.Line(axisGeom,matAxis)

this.scene.add(axis)

const matTick = new THREE.LineBasicMaterial({
color:0x000000
})

for(let i=0;i<=max;i++){

const y = i*s

const tickPoints = [
new THREE.Vector3(-3,y,0),
new THREE.Vector3(3,y,0)
]

const tickGeom = new THREE.BufferGeometry()
.setFromPoints(tickPoints)

const tick = new THREE.Line(tickGeom,matTick)

this.scene.add(tick)

}

}


/* =========================
MARQUEUR CENTRE
========================= */

createCenterMarker(){

const geom = new THREE.SphereGeometry(4,16,16)

const mat = new THREE.MeshBasicMaterial({
color:0xff0000,
depthTest:false
})

this.centerMarker = new THREE.Mesh(geom,mat)

this.scene.add(this.centerMarker)

}


/* =========================
INJECTION SOLIDE
========================= */

inject(SolidClass){

this.slidersDiv.innerHTML = ""
this.variablesDiv.innerHTML = ""

if(this.solid && this.solid.clear){
this.solid.clear()
}

this.SolidClass = SolidClass

this.solid = new SolidClass(
this.scene,
this.scale
)

this.buildSliders(SolidClass.parameters)

const params = {}

SolidClass.parameters.forEach(p=>{
params[p.id] = p.value
})

this.solid.setParameters(params)

this.update()

}


/* =========================
SLIDERS
========================= */

buildSliders(parameters){

this.sliders = {}

parameters.forEach(p=>{

const label = document.createElement("label")
label.textContent = p.label

const input = document.createElement("input")

input.type = "range"
input.min = p.min
input.max = p.max
input.step = p.step
input.value = p.value

input.addEventListener("input",()=>{

const params = {}

parameters.forEach(pp=>{
params[pp.id] = parseFloat(this.sliders[pp.id].value)
})

this.solid.setParameters(params)
this.update()

})

input.addEventListener("change",()=>{

input.value = Math.round(input.value)

const params = {}

parameters.forEach(pp=>{
params[pp.id] = parseFloat(this.sliders[pp.id].value)
})

this.solid.setParameters(params)
this.update()

})

this.slidersDiv.appendChild(label)
this.slidersDiv.appendChild(input)

this.sliders[p.id] = input

})

}


/* =========================
UPDATE
========================= */

update(){

this.updateCenter()
this.renderVariables()

}


/* =========================
CENTRE SURFACE
========================= */

updateCenter(){

if(!this.solid || !this.solid.getSurfaceCenter) return

const p = this.solid.getSurfaceCenter()

this.centerMarker.position.set(p.x,p.y,p.z)

}


/* =========================
VARIABLES
========================= */

renderVariables(){

const values = this.solid.getVariables()

this.variablesDiv.innerHTML = ""
this.variableState = this.variableState || {}

this.SolidClass.variables.forEach(v=>{

const val = values[v.id]

const sym =
Math.abs(val - Math.round(val)) < 1e-9
? "="
: "\\approx"

const latex =
`\\(${v.label}${sym}${val.toFixed(2)}\\,${v.unit}\\)`

const button = document.createElement("button")
button.innerHTML = `\\(${v.label}\\)`

const valueSpan = document.createElement("span")
valueSpan.classList.add("variable-value")
valueSpan.innerHTML = latex

if(this.variableState[v.id]){
button.classList.add("active")
valueSpan.classList.add("visible")
}

button.addEventListener("click",()=>{

this.variableState[v.id] = !this.variableState[v.id]

button.classList.toggle("active")
valueSpan.classList.toggle("visible")

})

this.variablesDiv.appendChild(button)
this.variablesDiv.appendChild(valueSpan)

})

if(window.MathJax){
MathJax.typesetPromise([this.variablesDiv])
}

}


/* =========================
ANIMATION
========================= */

animate(){

    requestAnimationFrame(()=>this.animate())

    if(this.autoRotate && this.activeCamera === this.perspCamera){

        if(this.angle === undefined){
            this.angle = 0
        }

        this.angle -= 0.001

        const R = 350
        const y = 250

        this.activeCamera.position.x = R*Math.sin(this.angle)
        this.activeCamera.position.z = R*Math.cos(this.angle)
        this.activeCamera.position.y = y

        this.activeCamera.lookAt(0,100,0)
    }

    this.renderer.render(this.scene,this.activeCamera)
}


/* =========================
VUES = POSITION CAMERA
========================= */
setPerspective(){

    this.activeCamera = this.perspCamera
    this.autoRotate = true
    this.modeView = "3d"

    if(this.solid?.setView){
        this.solid.setView("3d")
    }

}


setAutoRotate(state){
  this.autoRotate = state
}

setFrontView(){

    this.activeCamera = this.orthoCamera
    this.autoRotate = false
    this.modeView = "front"


    this.orthoCamera.position.set(0,150,400)
    this.orthoCamera.lookAt(0,150,0)

      /* RESET COMPLET */
    this.orthoCamera.rotation.set(0,0,0)
    this.orthoCamera.up.set(0,1,0)

}

setTopView(){

    this.activeCamera = this.orthoCamera

    this.autoRotate = false
    this.modeView = "top"

    this.orthoCamera.rotation.set(0,0,0)
    /* orientation écran */
    this.orthoCamera.up.set(0,0,-1)

    /* position STRICTEMENT verticale */
    this.orthoCamera.position.set(0,1000,0)

    /* on regarde le centre */
    this.orthoCamera.lookAt(0,0,0)

    

}
}