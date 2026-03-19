import { Solid } from "./Solid.js"

export class PaveCarre extends Solid {

static parameters = [
{ id:"c", label:"c", min:1, max:8, step:0.1, value:4 },
{ id:"h", label:"h", min:2, max:12, step:0.1, value:8 },
{ id:"H", label:"H", min:0, max:12, step:0.1, value:4 }
]

static variables = [
{ id:"c", label:"c", unit:"cm" },
{ id:"h", label:"h", unit:"cm" },
{ id:"H", label:"H", unit:"cm" },
{ id:"Vrec", label:"V_{rec}", unit:"cm^3" },
{ id:"Veau", label:"V_{eau}", unit:"cm^3" }
]

constructor(scene,scale){

    super(scene,scale)

    this.c = 4
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
    const c = this.c
    const h = this.h
    const H = this.H

    /* =========================
    RECIPIENT
    ========================= */

    const gBox = new THREE.BoxGeometry(1,1,1)

    this.meshBox = new THREE.Mesh(gBox,this.mContainer)

    this.meshBox.scale.set(
        c*s,
        h*s,
        c*s
    )

    this.meshBox.position.set(
        0,
        h*s/2,
        0
    )

    this.group.add(this.meshBox)


    /* =========================
    EAU
    ========================= */

    const gWater = new THREE.BoxGeometry(1,1,1)

    this.meshWater = new THREE.Mesh(gWater,this.mWater)

    this.meshWater.scale.set(
        c*s,
        H*s,
        c*s
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

    const c = this.c
    const h = this.h
    const H = this.H

    const Vrec = c*c*h
    const Veau = c*c*H

    return { c,h,H,Vrec,Veau }
}

}