import { Solid } from "./Solid.js"

export class Cylindre extends Solid {

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

    this.H = Math.min(this.H,this.h)
}


/* =========================
GEOMETRIE
========================= */

updateMeshes(){

    const s = this.scale
    const r = this.r
    const h = this.h
    const H = this.H

    /* =========================
    RECIPIENT
    ========================= */

    const gCyl = new THREE.CylinderGeometry(1,1,1,48,true)

    this.meshCyl = new THREE.Mesh(gCyl,this.mContainer)

    this.meshCyl.scale.set(
        r*s,
        h*s,
        r*s
    )

    this.meshCyl.position.set(
        0,
        h*s/2,
        0
    )

    this.group.add(this.meshCyl)


    /* =========================
    EAU
    ========================= */

    const gWater = new THREE.CylinderGeometry(1,1,1,48,true)

    this.meshWater = new THREE.Mesh(gWater,this.mWater)

    this.meshWater.scale.set(
        r*s,
        H*s,
        r*s
    )

    this.meshWater.position.set(
        0,
        H*s/2,
        0
    )

    this.group.add(this.meshWater)


    /* =========================
    CENTRE
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
CENTRE
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

    const Vrec = Math.PI*r*r*h
    const Veau = Math.PI*r*r*H

    return { r,h,H,Vrec,Veau }
}

}