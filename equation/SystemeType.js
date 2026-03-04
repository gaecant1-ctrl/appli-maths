

function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Fonction exportée : crée un système complet à partir d'un type n
function creerSysteme(n,min=1,max=10) {
  let eq = [];
  let a, b, c, m, n1, rep;

  switch (n) {
    case 0:{
      a = rand(min, max);
      m = rand(1, 10);
      n1 = a + m;
      eq.push(Math.random() < 0.5 ? `a + ${m} = ${n1}` : `${m} + a = ${n1}`);
      m = rand(3, 10);
      eq.push(Math.random() < 0.5 ? `${m} * a = ?` : `a * ${m} = ?`);
      rep = m * a;
      break;}

    case 1:{
      n1 = rand(1, 6);
      m = rand(1, 6);
      a = m + n1;
      eq.push(`a - ${m} = ${n1}`);
      m = rand(3, 15 - a);
      eq.push(Math.random() < 0.5 ? `${m} * a = ?` : `a * ${m} = ?`);
      rep = m * a;
      break;}

    case 2:{
      a = rand(min, max);
      m = rand(3, 10);
      eq.push(Math.random() < 0.5 ? `a * ${m} = ${m * a}` : `${m} * a = ${m * a}`);
      n1 = rand(5, 30);
      eq.push(Math.random() < 0.5 ? `a + ${n1} = ?` : `${n1} + a = ?`);
      rep = a + n1;
      break;}
      
    case 3:{
    
      m = rand(3, 10);
      n1= rand(min, max);
      a = m*n1;
      eq.push(Math.random() < 0.5 ? `a : ${m} = ${n1}` : `${m} * a = ${n1}`);
      m = rand(5, 30);
      eq.push(Math.random() < 0.5 ? `a + ${m} = ?` : `${m} + a = ?`);
      rep = a + m;
      break;}
      
    case 70:{
      a = rand(min, max);
      b = rand(min, max); 
      n1 = a+b;
      eq.push(Math.random() < 0.5 ? `a + b=${n1}` : `b + a=${n1}`);
      eq.push(`b=${b}`);
      eq.push( `a = ?`);
      rep = a;
      break;}

    case 71:{
      b = rand(3, 10);
      n1=rand(min, max); 
      a = b+n1; 
      eq.push(`a - b=${n1}`);
      eq.push(`b=${b}`);
      eq.push( `a = ?`);
      rep = a;
      break;}

    case 72:{
      a = rand(min, max);
      b = rand(min, max); 
      n1 = a*b;
      eq.push(Math.random() < 0.5 ? `a*b=${n1}` : `b*a=${n1}`);
      eq.push(`b=${b}`);
      eq.push( `a = ?`);
      rep = a;
      break;}
      
    case 73:{
      b = rand(3, 10);
      n1=rand(min, max); 
      a = b*n1; 
      eq.push(`a : b=${n1}`);
      eq.push(`b=${b}`);
      eq.push( `a = ?`);
      rep = a;
      break;}

    case 4:{
      a = rand(min, max);
      n1 = rand(2, 5);
      eq.push(Array(n1).fill("a").join(" + ") + " = " + (n1 * a));
      m = rand(5, 30);
      eq.push(Math.random() < 0.5 ? `a + ${m} = ?` : `${m} + a = ?`);
      rep = a + m;
      break;}
      
    case 5:{
      do {
        a = rand(min, max);
        b = rand(min, max);
        c = rand(min, max);
      } while (a === b && b === c);
      m = rand(2, 4);
      n1 = rand(2, 4);
      let p = rand(2, 4);
      eq.push(`a${"+a".repeat(m - 1)} = ${m * a}`);
      eq.push(`b${"+b".repeat(n1 - 1)} = ${n1 * b}`);
      eq.push(`c${"+c".repeat(p - 1)} = ${p * c}`);
      eq.push(`a + b * c = ?`);
      rep = a + b * c;
      break;}
      
    case 6:{
      a = rand(min, max);
      b = rand(min, max);
      c = rand(min, max);
      m = rand(3, 5);
      let p=rand(1,m-1);
      n1 = rand(3, 4);
      eq.push(`a${"+a".repeat(m - 1)} = ${m * a}`);
      eq.push(`a${"+a".repeat(p - 1)}+b = ${p * a + b}`);
      eq.push(`b${"+b".repeat(n1 - 1)}+ c = ${n1*b + c}`);
      eq.push(`a*b + c = ?`);
      rep = a*b+ c;
      break;}
      
    case 10:{
      a = rand(min, max);
      b = rand(min, max);
      c = rand(min, max);
      m = rand(3, 5);

      eq.push(`a${"+a".repeat(m - 1)}+${b} = ${m * a+b}`);

      eq.push(`a = ?`);
      rep = a;
      break;}

    case 11:{
      a = rand(min, max);
      b = rand(min, 3*min);
      c = rand(min, max);
      m = rand(3, 5);

      eq.push(`a${"+a".repeat(m - 1)}-${b} = ${m * a-b}`);

      eq.push(`a = ?`);
      rep = a;
      break;}      
    

    case 7:{
      a = rand(min, max);
      b = rand(min, max);
      c = rand(min, max);
      eq.push(`a + a + a = ${3 * a}`);
      eq.push(`a + b + b = ${a + 2 * b}`);
      eq.push(`b + b + c = ${c + 2 * b}`);
      eq.push(`a+b*c = ?`);
      rep = a + b * c;
      break;}
  




    case 8:{
      a = rand(min, max);
      b = rand(min+3, max);
      c = rand(2, b);
      m = rand(2, 4);
      n1 = rand(2, 3);
      eq.push(`a${"+a".repeat(m - 1)} = ${m * a}`);
      eq.push(`a + b + b = ${a + 2 * b}`);
      eq.push(`b - c = ${b - c}`);
      eq.push(`a + b + c = ?`);
      rep = a + b + c;
      break;}

    case 9:{
      a = rand(min, max);
      b = rand(min, 10);
      c = rand(min, max);
      m = rand(2, 4);
      n1 = rand(2, 3);
      eq.push(`a${"+a".repeat(m - 1)} = ${m * a}`);
      eq.push(`a * b = ${a * b}`);
      eq.push(`b * c = ${b * c}`);
      eq.push(`a + b + c = ?`);
      rep = a + b + c;
      break;}
      






case 12: {
  let a = rand(min, max);
  let b = rand(min, max);
  let c = rand(2, b);

  eq.push(`2 * b = ${2 * b}`);
  eq.push(`b * c = ${b * c}`);
  eq.push(`b + c = ?`);
  rep = b + c;
  break;
}



case 14: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  eq.push(`a + b = ${a + b}`);
  eq.push(`b + c = ${b + c}`);
  eq.push(`a + 2*b + c = ?`);
  rep = a + 2 * b + c;
  break;
}

case 15: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  eq.push(`a + b = ${a + b}`);
  eq.push(`b + c = ${b + c}`);
  eq.push(`a + c = ${a + c}`);
  eq.push(`a + b + c = ?`);
  rep = a + b + c;
  break;
}

case 16: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  eq.push(`a + b = ${a + b}`);
  eq.push(`a + c + b = ${a + b + c}`);
  eq.push(`c = ?`);
  rep = c;
  break;
}

case 17: {
  a = rand(min, max);
  b = rand(min, max);
  m = rand(1, 10);
  eq.push(`a + b = ${a + b}`);
  eq.push(`a + ${m} = ${a + m}`);
  eq.push(`b + ${m} = ?`);
  rep = b + m;
  break;
}

case 18: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  eq.push(`a + b = ${a + b}`);
  eq.push(`b + c = ${b + c}`);
  eq.push(`a + c = ${a + c}`);
  eq.push(`a + b + c = ?`);
  rep = a + b + c;
  break;
}

case 19: {
  a = rand(min, max);
  b = rand(min, max);
  let t = `a + b + a + b`;
  m = 2 * (a + b);
  if (Math.random() < 0.5) {
    t += ` + a + b`;
    m += a + b;
  }
  eq.push(`${t} = ${m}`);
  n1 = rand(5, 15);
  eq.push(`a + ${n1} + b = ?`);
  rep = a + b + n1;
  break;
}

case 20: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  eq.push(`a + b = ${a + b}`);
  eq.push(`b + c = ${b + c}`);
  eq.push(`a + 2 * b + c = ?`);
  rep = a + 2 * b + c;
  break;
}

case 21: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  eq.push(`2*a + b+c = ${2 * a + b + c}`);
  eq.push(`a + b = ${a + b}`);
  eq.push(`a + c = ?`);
  rep = a + c;
  break;
}

case 22: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  eq.push(`a*b = ${a * b}`);
  eq.push(`a*c = ${a * c}`);
  eq.push(`a * (b + c) = ?`);
  rep = a * (b + c);
  break;
}

case 23: {
  a = rand(min, max);
  b = rand(min, max);
  let n1 = rand(5, 15);
  let texte = `a + b + a + b`;
  let total = 2 * (a + b);
  if (Math.random() < 0.5) {
    texte += ` + a + b`;
    total += a + b;
  }
  eq.push(`${texte} = ${total}`);
  eq.push(`a + ${n1} + b = ?`);
  rep = a + b + n1;
  break;
}

case 24: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  let p = rand(2, 5);
  eq.push(`a + b = ${a + b}`);
  eq.push(`b + c = ${b + c}`);
  eq.push(`${p} * a + ${p + 1} * b + c = ?`);
  rep = p * a + (p + 1) * b + c;
  break;
}

case 25: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  let q = rand(2, 4);
  let r = rand(2, 4);
  eq.push(`a + b = ${a + b}`);
  eq.push(`b + c = ${b + c}`);
  eq.push(`${q} * a + ${q + r} * b + ${r} * c = ?`);
  rep = q * a + (q + r) * b + r * c;
  break;
}

case 26: {
  a = rand(2, 10);
  let m = rand(2, 4);
  let b = m * a;
  let t1 = `b = a${" + a".repeat(m - 1)}`;
  eq.push(t1);

  let n = rand(2, 3);
  let sum = n * b + a;
  let t2 = `b + a${" + b".repeat(n - 1)} = ${sum}`;
  eq.push(t2);

  eq.push(`a + b = ?`);
  rep = a + b;
  break;
}

case 31: {
  a = rand(min,max);
  let m = rand(2, 4);
  b = m * a;
  let n1 = rand(2, 3);


  let expr1 = `b = ${Array(m).fill("a").join(" + ")}`;
  eq.push(expr1);

  let expr2 = `b + a${" + b".repeat(n1 - 1)} = ${n1 * b + a}`;
  eq.push(expr2);

  eq.push("a + b = ?");
  rep = a + b;
  break;
}

case 32: {
  a = rand(min,max);
  let m = rand(2, 3);
  let n1 = m + rand(1, 4 - m);

  let expr1 = `${Array(m).fill("a").join(" + ")} = b`;
  let expr2 = `${Array(n1).fill("a").join(" + ")} = c`;

  eq.push(expr1);
  eq.push(expr2);
  eq.push(`b + c = ${a * (m + n1)}`);
  eq.push("a = ?");
  rep = a;
  break;
}

case 41: {
  let q = rand(2,5);
  let m1 = Math.floor(rand(min, max)/q);
  b=q*m1;
  c = rand(min, max);
  
  let p = rand(2, 5);
  let m2 = b + c;
  
  eq.push(`b : ${q} = ${m1}`);
  eq.push(`${p}*(b + c) = ${p*m2}`);
  eq.push(`c = ?`);
  rep = c;
  break;
}

case 51: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  let m1 = a + b;
  let m2 = b + c;
  eq.push(`a + b = ${m1}`);
  eq.push(`b + c = ${m2}`);
  let p = rand(2, 5);
  eq.push(`${p}a + ${p + 1}b + c = ?`);
  rep = p * a + (p + 1) * b + c;
  break;
}

case 52: {
  a = rand(min, max);
  b = rand(min, max);
  c = rand(min, max);
  let m1 = a + b;
  let m2 = b + c;
  eq.push(`a + b = ${m1}`);
  eq.push(`b + c = ${m2}`);
  let p = rand(2, 4);
  let q = rand(2, 4);
  eq.push(`${p}a + ${p + q}b + ${q}c = ?`);
  rep = p * a + (p + q) * b + q * c;
  break;
}

case 53: {
  a = rand(3, 10);
  b = rand(3, 10);
  let q = rand(2, 4);
  let p = q + rand(2, 4);
  eq.push(`${p}a + b = ${p * a + b}`);
  eq.push(`${q}a + b = ${q * a + b}`);
  eq.push(`a = ?`);
  rep = a;
  break;
}





  }  
let niveau = getNiveauParType(n);
return new Systeme(eq, rep, getNiveauParType(n), n);



}


const typeNiveaux = {
  arithmetique: {
    1:[0,1,2,3,70,71,72,73],
    2: [4,10,11],
    3: [5,6,7,8],
    4: [9,12, 31, 41],

  },
  algebrique: {
    1: [ 14,22],
    2: [16,  21, 23, 24, 26,31,32],
    3: [15, 18, 25, 20],
    4: [21,51,52,53],
    
  }
};

function getMinMaxParNiveauNombre() {
  const niveau = document.getElementById("nombreSelect").value;
  switch (niveau) {
    case "petit":
      return [1, 10];
    case "grand":
      return [20, 50];
    case "moyen":
      return [5, 15];
    default:
      return [1, 50];
  }
}

function getTypesParCategorieEtNiveau(categorie, niveau) {
  if(categorie=="mixte") categorie= Math.random()<0.5? "aritmétique": "algebrique";
  if(niveau=="mixte") niveau= Math.floor(Math.random()*4)+1;
  console.log(categorie);
  console.log(niveau);
  console.log(typeNiveaux[categorie][niveau]);
  if (typeNiveaux[categorie] && typeNiveaux[categorie][niveau]) {
    return typeNiveaux[categorie][niveau];
  }
  return [];
}


function getNiveauParType(n) {
  for (const cat in typeNiveaux) {
    for (const niveau in typeNiveaux[cat]) {
      if (typeNiveaux[cat][niveau].includes(n)) {
        return niveau;
      }
    }
  }
  return "inconnu";
}

function getCategorieParType(n) {
  for (const cat in typeNiveaux) {
    for (const niveau in typeNiveaux[cat]) {
      if (typeNiveaux[cat][niveau].includes(n)) {
        return cat;
      }
    }
  }
  return "inconnu";
}





