export class Solid {

constructor(scene,scale){

this.scene = scene
this.scale = scale

/* groupe principal */

this.group = new THREE.Group()
this.scene.add(this.group)

/* =========================
MATERIAUX (UNIQUE)
========================= */

/* récipient */

this.mContainer = new THREE.MeshPhongMaterial({
color:0xaaaaaa,
transparent:true,
opacity:0.25,
side:THREE.DoubleSide
})

/* eau */

this.mWater = new THREE.MeshPhongMaterial({
color:0x3399ff,
transparent:true,
opacity:0.5
})

/* centre */

this.mCenter = new THREE.MeshBasicMaterial({
color:0xff0000,
depthTest:false
})

}

/* =========================
PARAMETRES
========================= */

setParameters(params){

Object.assign(this,params)

/* reconstruction complète */

this.clearMeshes()
this.updateMeshes()

}

/* =========================
NETTOYAGE MESHES
========================= */

clearMeshes(){

/* dispose propre */

this.group.traverse(obj=>{
if(obj.geometry) obj.geometry.dispose()
if(obj.material) obj.material.dispose()
})

/* vide le groupe */

this.group.clear()

}

/* =========================
A IMPLEMENTER (enfants)
========================= */

updateMeshes(){
/* Cone, Cylindre… */
}

/* =========================
SUPPRESSION COMPLETE
========================= */

clear(){

this.clearMeshes()
this.scene.remove(this.group)

}

/* =========================
OPTIONNEL (par défaut)
========================= */

getSurfaceCenter(){
return {x:0,y:0,z:0}
}

getVariables(){
return {}
}

}