import { ExerciseType } from "./ExerciseType.js";
import { rand,randN,randP,formatNumber } from "./Random.js";

export function registerArithmeticTypes(registry) {

  /* =========================================
     NIVEAU 1
  ========================================= */


  // TYPE 70
  registry.register(new ExerciseType({
    id: 70,
    categorie: "arithmetique",
    niveau: 1,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);

      return {
        equations: [
          `a + b = ${formatNumber(a + b)}`,
          `b = ${formatNumber(b)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 71
  registry.register(new ExerciseType({
    id: 71,
    categorie: "arithmetique",
    niveau: 1,
    generate(min, max) {
      const b = randN(min, max);
      const n1 = randN(min, max);
      const a = b + n1;

      return {
        equations: [
          `a - b = ${formatNumber(n1)}`,
          `b = ${formatNumber(b)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 72
  registry.register(new ExerciseType({
    id: 72,
    categorie: "arithmetique",
    niveau: 1,
    generate(min, max) {
      let a, b;

      if (Math.random() < 0.5) {
        a = randN(5, 10);
        b = randP(min, max);
      } else {
        a = randP(5, 10);
        b = randN(min, max);
      }

      return {
        equations: [
          `a * b = ${formatNumber(a * b)}`,
          `b = ${formatNumber(b)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 73
  registry.register(new ExerciseType({
    id: 73,
    categorie: "arithmetique",
    niveau: 1,
    generate(min, max) {
      const b = randP(3, 10);
      const n1 = randN(min, max);
      const a = b * n1;

      return {
        equations: [
          `a : b = ${formatNumber(n1)}`,
          `b = ${formatNumber(b)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


  /* =========================================
     NIVEAU 2
  ========================================= */

  
    // TYPE 5
  registry.register(new ExerciseType({
    id: 5,
    categorie: "arithmetique",
    niveau: 2,
    generate(min, max) {
      let a, b, c;
      do {
        a = randN(min, max);
        b = randN(min, max);
        c = randN(min, max);
      } while (a === b && b === c);

      const m = rand(2, 4);
      const n1 = rand(2, 4);
      const p = rand(2, 4);

      return {
        equations: [
          `${Array(m).fill("a").join("+")} = ${formatNumber(m * a)}`,
          `${Array(n1).fill("b").join("+")} = ${formatNumber(n1 * b)}`,
          `${Array(p).fill("c").join("+")} = ${formatNumber(p * c)}`,
          `a + b + c = ?`
        ],
        rep: a + b + c
      };
    }
  }));


  /* =========================================
     NIVEAU 3
  ========================================= */
 
  
  
  /* =========================================
     NIVEAU 4
  ========================================= */



  // TYPE 6
  registry.register(new ExerciseType({
    id: 6,
    categorie: "arithmetique",
    niveau: 4,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);
      const m = rand(3, 5);
      const p = rand(1, m - 1);
      const n1 = rand(3, 4);

      return {
        equations: [
          `${Array(m).fill("a").join("+")} = ${formatNumber(m * a)}`,
          `${Array(p).fill("a").join("+")} + b = ${formatNumber(p * a + b)}`,
          `${Array(n1).fill("b").join("+")} + c = ${formatNumber(n1 * b + c)}`,
          `a + b + c = ?`
        ],
        rep: a + b + c
      };
    }
  }));

  // TYPE 7
  registry.register(new ExerciseType({
    id: 7,
    categorie: "arithmetique",
    niveau: 4,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);

      return {
        equations: [
          `a + a + a = ${formatNumber(3 * a)}`,
          `a + b + b = ${formatNumber(a + 2 * b)}`,
          `b + b + c = ${formatNumber(c + 2 * b)}`,
          `c = ?`
        ],
        rep: c
      };
    }
  }));

  // TYPE 8
  registry.register(new ExerciseType({
    id: 8,
    categorie: "arithmetique",
    niveau: 4,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min + 3, max + 3);
      const c = randN(2, b);
      const m = rand(2, 4);

      return {
        equations: [
          `${Array(m).fill("a").join("+")} = ${formatNumber(m * a)}`,
          `a + b + b = ${formatNumber(a + 2 * b)}`,
          `b - c = ${formatNumber(b - c)}`,
          `c = ?`
        ],
        rep: c
      };
    }
  }));
  
  


  /* =========================================
     NIVEAU 5
  ========================================= */

  // TYPE 9
  registry.register(new ExerciseType({
    id: 9,
    categorie: "arithmetique",
    niveau: 5,
    generate(min, max) {
      const a = randN(min, max);
      const b = randP(3, 10);
      const c = randN(min, max);
      const m = rand(2, 4);

      return {
        equations: [
          `${Array(m).fill("a").join("+")} = ${formatNumber(m * a)}`,
          `a * b = ${formatNumber(a * b)}`,
          `b * c = ${formatNumber(b * c)}`,
          `c = ?`
        ],
        rep: c
      };
    }
  }));

  // TYPE 12
  registry.register(new ExerciseType({
    id: 12,
    categorie: "arithmetique",
    niveau: 5,
    generate(min, max) {
      let m,b,c;
      m = randN(min,max);
      if(m<0){b = randP(min, max);}else{b = randN(min, max);}
      if(b<0){c = randP(min, max);}else{c = randN(min, max);}

      return {
        equations: [
          `${formatNumber(m)} * b = ${formatNumber(m * b)}`,
          `b * c = ${formatNumber(b * c)}`,
          `c = ?`
        ],
        rep: c
      };
    }
  }));

  // TYPE 41
  registry.register(new ExerciseType({
    id: 41,
    categorie: "arithmetique",
    niveau: 5,
    generate(min, max) {
      const q = randP(2, 5);
      const m1 = Math.floor(randN(min, max) / q);
      const b = q * m1;
      const c = randN(min, max);
      const p = rand(2, 5);

      return {
        equations: [
          `b : ${formatNumber(q)} = ${formatNumber(m1)}`,
          `${formatNumber(p)}*(b + c) = ${formatNumber(p * (b + c))}`,
          `c = ?`
        ],
        rep: c
      };
    }
  }));
  
  
    // TYPE 42
  registry.register(new ExerciseType({
    id: 42,
    categorie: "arithmetique",
    niveau: 5,
    generate(min, max) {
      const q = randP(2,5);
      const b = Math.floor(randN(2*min, 2*max) / q);
      const c = randN(min, max);
      const p = rand(2, 5);

      return {
        equations: [
          `b * ${formatNumber(q)} = ${formatNumber(b*q)}`,
          `${formatNumber(p)}*(b + c) = ${formatNumber(p * (b + c))}`,
          `c = ?`
        ],
        rep: c
      };
    }
  }));
  
}