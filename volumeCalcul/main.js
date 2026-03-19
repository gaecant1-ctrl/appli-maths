import { Render } from "./Render.js"
import { Cone } from "./Cone.js"
import { Cylindre } from "./cylindre.js"
import { PaveCarre } from "./pave.js"
import { PyramideCarree } from "./PyramideCarree.js"
import { ToggleButton,SegmentedToggle } from "./ToggleButton.js"


/* =========================
ROTATION
========================= */

const rotateToggle = new ToggleButton({
  element: document.getElementById("toggleRotate"),
  initialState: true,
  contentOn: "Rotation ON",
  contentOff: "Rotation OFF",
  onChange: (state) => {
    render.setAutoRotate(state)
  }
})

/* =========================
VUE
========================= */

const viewToggle = new SegmentedToggle({
  container: document.getElementById("viewToggle"),
  initialValue: "3d",
  onChange: (value) => {

    if(value === "3d") render.setPerspective()
    if(value === "front") render.setFrontView()
    if(value === "top") render.setTopView()

  }
})

const solids = [
{ label:"Cône", class:Cone },
{ label:"Cylindre", class:Cylindre },
{ label:"Pavé", class:PaveCarre },
{ label:"Pyramide", class:PyramideCarree }
]


const select = document.getElementById("solidSelect")

solids.forEach((s,i)=>{

const option = document.createElement("option")

option.value = i
option.textContent = s.label

select.appendChild(option)

})


const render = new Render({
sliders:document.getElementById("sliders"),
variables:document.getElementById("variables"),
scene:document.getElementById("scene")
})


select.addEventListener("change",()=>{

const solid = solids[select.value]

render.inject(solid.class)

})


render.inject(Cone)



