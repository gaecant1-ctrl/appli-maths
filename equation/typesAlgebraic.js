import { ExerciseType } from "./ExerciseType.js";
import { rand,randN,randP,formatNumber } from "./Random.js";

export function registerAlgebraicTypes(registry) {

  /* =========================================
     NIVEAU 1
  ========================================= */

  // TYPE 14 — Combinaison de deux égalités
  registry.register(new ExerciseType({
    id: 14,
    categorie: "algebrique",
    niveau: 1,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);

      return {
        equations: [
          `a + b = ${formatNumber(a + b)}`,
          `b + c = ${formatNumber(b + c)}`,
          `a + 2b + c = ?`
        ],
        rep: a + 2 * b + c
      };
    }
  }));

  // TYPE 22 — Distributivité simple
  registry.register(new ExerciseType({
    id: 22,
    categorie: "algebrique",
    niveau: 1,
    generate(min, max) {
      const u = randN(min, max);
      const v = u+randN(min, max);
      

      return {
        equations: [
          `a*b = ${formatNumber(v)}`,
          `a*c = ${formatNumber(u)}`,
          `a*(b - c) = ?`
        ],
        rep: v-u
      };
    }
  }));

  // TYPE 16 — Variable isolée indirectement
  registry.register(new ExerciseType({
    id: 16,
    categorie: "algebrique",
    niveau: 1,
    generate(min, max) {
      const u = randN(min, max);
      const v = u+randN(min, max);

      return {
        equations: [
          `a + b = ${formatNumber(u)}`,
          `a + b + c = ${formatNumber(v)}`,
          `c = ?`
        ],
        rep: c
      };
    }
  }));


  // TYPE 51 — Combinaison linéaire pondérée
  registry.register(new ExerciseType({
    id: 51,
    categorie: "algebrique",
    niveau: 1,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);
      const p = rand(2, 5);

      return {
        equations: [
          `a + b = ${formatNumber(a + b)}`,
          `b + c = ${formatNumber(b + c)}`,
          `${formatNumber(p)}a + ${formatNumber(p + 1)}b + c = ?`
        ],
        rep: p * a + (p + 1) * b + c
      };
    }
  }));

  // TYPE 52 — Double pondération
  registry.register(new ExerciseType({
    id: 52,
    categorie: "algebrique",
    niveau: 1,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);
      const p = rand(2, 4);
      const q = rand(2, 4);

      return {
        equations: [
          `a + b = ${formatNumber(a + b)}`,
          `b + c = ${formatNumber(b + c)}`,
          `${formatNumber(p)}a + ${formatNumber(p + q)}b + ${formatNumber(q)}c = ?`
        ],
        rep: p * a + (p + q) * b + q * c
      };
    }
  }));

  /* =========================================
     NIVEAU 2
  ========================================= */

  // TYPE 21 — Combinaison pondérée
  registry.register(new ExerciseType({
    id: 21,
    categorie: "algebrique",
    niveau: 2,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);

      return {
        equations: [
          `2a + b + c = ${formatNumber(2 * a + b + c)}`,
          `a + b = ${formatNumber(a + b)}`,
          `a + c = ?`
        ],
        rep: a + c
      };
    }
  }));

  // TYPE 23 — Répétition structurée
  registry.register(new ExerciseType({
    id: 23,
    categorie: "algebrique",
    niveau: 2,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const n = randN(5, 15);

      let expr = `a + b + a + b`;
      let total = 2 * (a + b);

      if (Math.random() < 0.5) {
        expr += ` + a + b`;
        total += a + b;
      }

      return {
        equations: [
          `${formatNumber(expr)} = ${formatNumber(total)}`,
          `a + ${formatNumber(n)} + b = ?`
        ],
        rep: a + b + n
      };
    }
  }));

  // TYPE 24 — Coefficients simples
  registry.register(new ExerciseType({
    id: 24,
    categorie: "algebrique",
    niveau: 2,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);
      const p = randN(2, 5);

      return {
        equations: [
          `a + b = ${formatNumber(a + b)}`,
          `b + c = ${formatNumber(b + c)}`,
          `${p}a + ${formatNumber(p + 1)}b + c = ?`
        ],
        rep: p * a + (p + 1) * b + c
      };
    }
  }));

  // TYPE 26 — Dépendance b en fonction de a
  registry.register(new ExerciseType({
    id: 26,
    categorie: "algebrique",
    niveau: 2,
    generate(min, max) {

      const a = randN(2, 10);
      const m = rand(2, 4);
      const b = m * a;
      const n = rand(2, 3);

      const sommeA = Array(m).fill("a").join(" + ");

      // 🔁 Inversion membres eq1 (1/2)
      const eq1 = Math.random() < 0.5
        ? `b = ${sommeA}`
        : `${sommeA} = b`;

      const eq2 = `b + a${" + b".repeat(n - 1)} = ${formatNumber(n * b + a)}`;

      // 🔁 Inversion ordre eq1 / eq2 (1/2)
      const firstTwo = Math.random() < 0.5
        ? [eq1, eq2]
        : [eq2, eq1];

      return {
        equations: [
          ...firstTwo,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  // TYPE 26 — Dépendance b en fonction de a
  registry.register(new ExerciseType({
    id: 26,
    categorie: "algebrique",
    niveau: 2,
    generate(min, max) {

      const a = randN(2, 10);
      const m = rand(2, 4);
      const b = m * a;
      const n = rand(2, 3);

      const sommeA = Array(m).fill("a").join(" + ");

      // 🔁 Inversion membres eq1 (1/2)
      const eq1 = Math.random() < 0.5
        ? `b = ${sommeA}`
        : `${sommeA} = b`;

      const eq2 = `b + a${" + b".repeat(n - 1)} = ${formatNumber(n * b + a)}`;

      // 🔁 Inversion ordre eq1 / eq2 (1/2)
      const firstTwo = Math.random() < 0.5
        ? [eq1, eq2]
        : [eq2, eq1];

      return {
        equations: [
          ...firstTwo,
          `b = ?`
        ],
        rep: b
      };
    }
  }));
  
    /* =========================================
     NIVEAU 3
  ========================================= */

  // TYPE 15 — Trois sommes croisées → somme totale
  registry.register(new ExerciseType({
    id: 15,
    categorie: "algebrique",
    niveau: 3,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);

      return {
        equations: [
          `a + b = ${formatNumber(a + b)}`,
          `b + c = ${formatNumber(b + c)}`,
          `a + c = ${formatNumber(a + c)}`,
          `a + b + c = ?`
        ],
        rep: a + b + c
      };
    }
  }));




  // TYPE 25 — Coefficients multiples
  registry.register(new ExerciseType({
    id: 25,
    categorie: "algebrique",
    niveau: 3,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);
      const q = rand(2, 4);
      const r = rand(2, 4);

      return {
        equations: [
          `a + b = ${formatNumber(a + b)}`,
          `b + c = ${formatNumber(b + c)}`,
          `${q}a + ${formatNumber(q + r)}b + ${formatNumber(r)}c = ?`
        ],
        rep: q * a + (q + r) * b + r * c
      };
    }
  }));


  // TYPE 32 — b et c multiples de a
  registry.register(new ExerciseType({
    id: 32,
    categorie: "algebrique",
    niveau: 3,
    generate(min, max) {
      const a = randN(min, max);
      const m = rand(2, 3);
      const n1 = m + rand(1, 4 - m);

      return {
        equations: [
          `${Array(m).fill("a").join(" + ")} = b`,
          `${Array(n1).fill("a").join(" + ")} = c`,
          `b + c = ${formatNumber(a * (m + n1))}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));


  /* =========================================
     NIVEAU 4
  ========================================= */

  // TYPE 18 — Variante structurée de 15
  registry.register(new ExerciseType({
    id: 18,
    categorie: "algebrique",
    niveau: 4,
    generate(min, max) {
      const a = randN(min, max);
      const b = randN(min, max);
      const c = randN(min, max);

      return {
        equations: [
          `a + b = ${formatNumber(a + b)}`,
          `b + c = ${formatNumber(b + c)}`,
          `a + c = ${formatNumber(a + c)}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

  






  // TYPE 53 — Élimination simple
  registry.register(new ExerciseType({
    id: 53,
    categorie: "algebrique",
    niveau: 4,
    generate(min, max) {
      const a = rand(3, 10);
      const b = rand(3, 10);
      const q = rand(2, 4);
      const p = q + rand(2, 4);

      return {
        equations: [
          `${p}a + b = ${p * a + b}`,
          `${q}a + b = ${q * a + b}`,
          `a = ?`
        ],
        rep: a
      };
    }
  }));

}