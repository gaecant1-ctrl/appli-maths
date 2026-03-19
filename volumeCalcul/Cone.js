import { Solid } from "./Solid.js"

export class Cone extends Solid {

static parameters = [
{ id:"r", label:"r", min:1, max:8, step:0.1, value:3 },
{ id:"h", label:"h", min:2, max:12, step:0.1, value:8 },
{ id:"H", label:"H", min:0, max:12, step:0.1, value:4 }
]

static variables = [
{ id:"r", label:"r", unit:"cm" },
{ id:"h", label:"h", unit:"cm" },
{ id:"H", label:"H", unit:"cm" },
{ id:"Vrec", label:"V_{rec}", unit:"cm^3" },
{ id:"Veau", label:"V_{eau}", unit:"cm^3" }
]

constructor(scene,scale){

super(scene,scale)

this.r = 3
this.h = 8
this.H = 4

this.updateMeshes()

}


/* =========================
PARAMETRES
========================= */

setParameters(params){

super.setParameters(params)

/* contrainte physique */

this.H = Math.min(this.H,this.h)

}


/* =========================
MISE A JOUR (GEOMETRIE)
========================= */

updateMeshes(){

const s = this.scale

const r = this.r
const h = this.h
const H = this.H

/* =========================
RECIPIENT
========================= */

const gCone = new THREE.ConeGeometry(1,1,48,true)

this.meshCone = new THREE.Mesh(gCone,this.mContainer)

/* règle commune */
this.meshCone.scale.set(r*s, h*s, r*s)
this.meshCone.position.set(0, h*s/2, 0)

/* orientation du cone (pointe en bas) */
this.meshCone.rotation.x = Math.PI

this.group.add(this.meshCone)


/* =========================
EAU
========================= */

const k = (h === 0) ? 0 : H/h

const gWater = new THREE.ConeGeometry(1,1,48,true)

this.meshWater = new THREE.Mesh(gWater,this.mWater)

/* règle UNIQUE : hauteur positive */
this.meshWater.scale.set(
    r*k*s,
    H*s,
    r*k*s
)

/* base au sol */
this.meshWater.position.set(
    0,
    H*s/2,
    0
)

/* orientation du cône (pointe en bas) */
this.meshWater.rotation.x = Math.PI

this.group.add(this.meshWater)


/* =========================
CENTRE SURFACE
========================= */

const gCenter = new THREE.SphereGeometry(4,16,16)

this.meshCenter = new THREE.Mesh(gCenter,this.mCenter)

this.meshCenter.position.set(
0,
H*s,
0
)

this.group.add(this.meshCenter)

}


/* =========================
CENTRE (POUR RENDER)
========================= */

getSurfaceCenter(){

return {
x:0,
y:this.H*this.scale,
z:0
}

}


/* =========================
VARIABLES
========================= */

getVariables(){

const r = this.r
const h = this.h
const H = this.H

const Vrec = Math.PI*r*r*h/3
const Veau = (h === 0)
? 0
: Math.PI*r*r*(H**3)/(3*h*h)

return {
r,
h,
H,
Vrec,
Veau
}

}

}