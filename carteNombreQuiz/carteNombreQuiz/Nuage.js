export class Nuage {

constructor(container){

  this.container = container;

  this.cartes = [];
  this.centreCarte = null;

  this.ordreOrbital = [];


  this.rayon = 140;


  this.animation = null;

  this.w = container.clientWidth;
  this.h = container.clientHeight;

  this.cx = this.w/2;
  this.cy = this.h/2;



}



ajouterCarte(carte){

  this.container.appendChild(carte.el);

  this.cartes.push(carte);

  if(carte.data.description === "Fraction simplifiée"){

    this.centreCarte = carte;

    carte.setPosition(this.cx,this.cy);

  }else{

    this.ordreOrbital.push(carte);

  }

}



demarrer(){

this.placerCartes();

}



placerCartes(){


  const n = this.ordreOrbital.length;

  if(n === 0) return;

  this.ordreOrbital.forEach((c,i)=>{

    const angle = i * 2*Math.PI / n;

    const rayon =this.rayon;

    const x = this.cx + Math.cos(angle)*rayon;
    const y = this.cy + Math.sin(angle)*rayon;

    c.setPosition(x,y);

  });

  if(this.centreCarte){
    this.centreCarte.setPosition(this.cx,this.cy);
  }

}



}