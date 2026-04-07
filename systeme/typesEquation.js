import { ExerciseType } from "./ExerciseType.js";
import { rand,randN,randP,formatNumber } from "./Random.js";

export function registerEquationTypes(registry) {

  /* =========================================
     NIVEAU 1
  ========================================= */

  // TYPE 0
  registry.register(new ExerciseType({
    id: 0,
    categorie: "equation",
    niveau: 1,
    generate(min, max) {
      const a = randN(min, max);
      const m = randN(1, 10);

      return {
        equations: [
          `a + ${formatNumber(m)} = ${formatNumber(a + m)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 1
  registry.register(new ExerciseType({
    id: 1,
    categorie: "equation",
    niveau: 1,
    generate(min, max) {
      const n1 = randN(min, max);
      const m = randN(min, max);
      const a = m + n1;

      return {
        equations: [
          `a - ${formatNumber(m)} = ${formatNumber(n1)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 2
  registry.register(new ExerciseType({
    id: 2,
    categorie: "equation",
    niveau: 1,
    generate(min, max) {
      const a = randN(min, max);
      const m = randP(3, 10);

      return {
        equations: [
          `a * ${formatNumber(m)} = ${formatNumber(a * m)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 3
  registry.register(new ExerciseType({
    id: 3,
    categorie: "equation",
    niveau: 1,
    generate(min, max) {
      const m = randP(3, 10);
      const n1 = randN(min, max);
      const a = m * n1;

      return {
        equations: [
          `a : ${formatNumber(m)} = ${formatNumber(n1)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));







  /* =========================================
     NIVEAU 2
  ========================================= */

  // TYPE 4
  registry.register(new ExerciseType({
    id: 4,
    categorie: "equation",
    niveau: 2,
    generate(min, max) {
      const a = randN(min, max);
      const n1 = rand(2, 5);
      const m = rand(5, 30);

      return {
        equations: [
          `${Array(n1).fill("a").join(" + ")} = ${formatNumber(n1 * a)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 10
  registry.register(new ExerciseType({
    id: 10,
    categorie: "equation",
    niveau: 2,
    generate(min, max) {
      const a = randN(min, max);
      const p = randN(min, max);
      const m = rand(2, 5);

      return {
        equations: [
          `${Array(m).fill("a").join(" + ")} + ${formatNumber(p)} = ${formatNumber(m * a + p)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 11
  registry.register(new ExerciseType({
    id: 11,
    categorie: "equation",
    niveau: 2,
    generate(min, max) {
      const a = randN(min, max);
      const p = randN(min, 3 * min);
      const m = rand(2, 5);

      return {
        equations: [
          `${Array(m).fill("a").join(" + ")} - ${formatNumber(p)} = ${formatNumber(m * a - p)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));



  /* =========================================
     NIVEAU 3
  ========================================= */

    // TYPE 101
  registry.register(new ExerciseType({
    id: 101,
    categorie: "equation",
    niveau: 3,
    generate(min, max) {
      const p = randP(2, 5);
      const a = randN(min, max);
      const q = randN(min, max);


      return {
        equations: [
          `${formatNumber(p)}*(a + ${formatNumber(q)}) = ${formatNumber(p * (a + q))}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

      // TYPE 102
  registry.register(new ExerciseType({
    id: 102,
    categorie: "equation",
    niveau: 3,
    generate(min, max) {
      const p = randP(2, 5);
      const q = randN(min, max);
      const a = q+randN(min, max);


      return {
        equations: [
          `${formatNumber(p)}*(a - ${formatNumber(q)}) = ${formatNumber(p * (a - q))}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

        // TYPE 103
  registry.register(new ExerciseType({
    id: 103,
    categorie: "equation",
    niveau: 3,
    generate(min, max) {
      const p = randP(2, 5);
      const n = randN(min, max);
      const q = randN(min, max);
      const a = Math.floor((q+n)/p);


      return {
        equations: [
          `${formatNumber(p)}*a - ${formatNumber(q)} = ${formatNumber(p * a - q)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


          // TYPE 104
  registry.register(new ExerciseType({
    id: 104,
    categorie: "equation",
    niveau: 3,
    generate(min, max) {
      const p = randP(2, 5);
      const a = randN(min, max);
      const q = randN(min, max);


      return {
        equations: [
          `${formatNumber(p)}*a + ${formatNumber(q)} = ${formatNumber(p * a + q)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


          // TYPE 105
  registry.register(new ExerciseType({
    id: 105,
    categorie: "equation",
    niveau: 3,
    generate(min, max) {
      const p = randP(2, 5);
      const n = randN(min, max);
      const a = n*p;
      const q = randN(min, max);


      return {
        equations: [
          `a:${formatNumber(p)} + ${formatNumber(q)} = ${formatNumber(n + q)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

       // TYPE 106
  registry.register(new ExerciseType({
    id: 106,
    categorie: "equation",
    niveau: 3,
    generate(min, max) {
      const p = randP(2, 5);
      const n = randN(min, max);
      const q = randN(min, max);
      const a = (q+n)*p;


      return {
        equations: [
          `a:${formatNumber(p)} - ${formatNumber(q)} = ${formatNumber(n)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

    // TYPE 107
  registry.register(new ExerciseType({
    id: 107,
    categorie: "equation",
    niveau: 3,
    generate(min, max) {
      const q = randN(min, max);
      const p = randP(2, 5);
      const n = Math.floor((randN(min, max)+q)/p);
      
      const a = n*p-q;
      


      return {
        equations: [
          `(a + ${formatNumber(q)}): ${formatNumber(p)} = ${formatNumber(n)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


    // TYPE 108
  registry.register(new ExerciseType({
    id: 108,
    categorie: "equation",
    niveau: 3,
    generate(min, max) {
      const q = randN(min, max);
      const p = randP(2, 5);
      const n = randN(min, max);
      const a = n*p+q;



      return {
        equations: [
          `(a - ${formatNumber(q)}): ${formatNumber(p)} = ${formatNumber(n)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));
  /* =========================================
     NIVEAU 4
  ========================================= */

    // TYPE 109
  registry.register(new ExerciseType({
    id: 109,
    categorie: "equation",
    niveau: 4,
    generate(min, max) {
      const a = randN(min, max);
      const p = randN(min, max);
      const m = rand(2, 3);
      const n = rand(1, 2);
      const q = n*a+p;

      return {
        equations: [
          `${Array(m+n).fill("a").join(" + ")} + ${formatNumber(p)} = ${Array(m).fill("a").join(" + ")} + ${formatNumber(q)} `,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


    // TYPE 110
  registry.register(new ExerciseType({
    id: 110,
    categorie: "equation",
    niveau: 4,
    generate(min, max) {
      const a = randN(min, max);
      const p = randN(min, max);
      const m = rand(2, 3);
      const n = rand(1, 2);
      const q = n*a+p;

      return {
        equations: [
          ` ${Array(m).fill("a").join(" + ")} + ${formatNumber(q)} = ${Array(m+n).fill("a").join(" + ")} + ${formatNumber(p)} `,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

    // TYPE 111
  registry.register(new ExerciseType({
    id: 111,
    categorie: "equation",
    niveau: 4,
    generate(min, max) {
      const a = 2+randN(min, max);
      const m = rand(2, 3);
      const n = rand(1, 2);
      const p = randN(1, Math.abs(n*a));
      const q = n*a-p;

      return {
        equations: [
          `${Array(m+n).fill("a").join(" + ")} - ${formatNumber(p)} = ${Array(m).fill("a").join(" + ")} + ${formatNumber(q)} `,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


    // TYPE 112
  registry.register(new ExerciseType({
    id: 112,
    categorie: "equation",
    niveau: 4,
    generate(min, max) {
      const a = 2+randN(min, max);
      const m = rand(2, 4);
      const n = rand(2, 7);
      const p = randN(1, Math.abs(n*a));
      const q = n*a-p;

      return {
        equations: [
          `${formatNumber(m+n)}*a - ${formatNumber(p)} = ${formatNumber(m)}*a + ${formatNumber(q)} `,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


    // TYPE 113
  registry.register(new ExerciseType({
    id: 113,
    categorie: "equation",
    niveau: 4,
    generate(min, max) {
      const a = 2+randN(min, max);
      const m = rand(2, 4);
      const n = rand(2, 7);
      const p = randN(1, Math.abs(n*a));
      const q = n*a-p;

      return {
        equations: [
          `${formatNumber(m)}*a + ${formatNumber(q)} = ${formatNumber(m+n)}*a - ${formatNumber(p)} `,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


    // TYPE 114
  registry.register(new ExerciseType({
    id: 114,
    categorie: "equation",
    niveau: 4,
    generate(min, max) {
      const a = randN(min, max);
      const m = rand(2, 4);
      const n = rand(2, 7);
      const p = randN(min,max);
      const q = n*a+p;

      return {
        equations: [
          `${formatNumber(m+n)}*a + ${formatNumber(p)} = ${formatNumber(m)}*a + ${formatNumber(q)} `,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


    // TYPE 115
  registry.register(new ExerciseType({
    id: 115,
    categorie: "equation",
    niveau: 4,
    generate(min, max) {
      const a = randN(min, max);
      const m = rand(2, 4);
      const n = rand(2, 7);
      const p = randN(min,max);
      const q = n*a+p;

      return {
        equations: [
          `${formatNumber(m)}*a + ${formatNumber(q)} = ${formatNumber(m+n)}*a + ${formatNumber(p)} `,
          `a = ?`
        ],
        rep: a
      };
    }
  }));









}