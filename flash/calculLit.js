import { Nombre } from "./nombre.js";
import { Polynome } from "./calcul-litteral.js";
import * as reponse from "./reponse.js";

const calculLit = [

  {
    id: "developpement-reduction",
    theme: "calcul-lit",
    niveau: "6",
    negatif: "non",
    gen() {
      const rand = (min, max) =>
        min + Math.floor(Math.random() * (max - min + 1));

      const sign = () => (Math.random() < 0.5 ? "+" : "-");
      const s1 = sign();
      const s2 = sign();

      const a = rand(1, 9);
      const b = rand(1, 9);

      let expression, fx, g;

      // tirage du type : 1 à 4
      const type = rand(1, 4);

      if (type === 1) {
        // (x ± a) + (x ± b)
        fx = 2;
        g =
          (s1 === "+" ? a : -a) +
          (s2 === "+" ? b : -b);

        expression = `(x ${s1} ${a}) + (x ${s2} ${b})`;
      }

      if (type === 2) {
        // c(x ± a) + d(x ± b)
        const c = rand(2, 9);
        const d = rand(2, 9);

        fx = c + d;
        g =
          c * (s1 === "+" ? a : -a) +
          d * (s2 === "+" ? b : -b);

        expression = `${c}(x ${s1} ${a}) + ${d}(x ${s2} ${b})`;
      }

      if (type === 3) {
        // c(x ± a) + (x ± b)
        const c = rand(2, 9);

        fx = c + 1;
        g =
          c * (s1 === "+" ? a : -a) +
          (s2 === "+" ? b : -b);

        expression = `${c}(x ${s1} ${a}) + (x ${s2} ${b})`;
      }

      if (type === 4) {
        // c(x ± a) - (x ± b)
        const c = rand(2, 9);

        fx = c - 1;
        g =
          c * (s1 === "+" ? a : -a) -
          (s2 === "+" ? b : -b);

        expression = `${c}(x ${s1} ${a}) - (x ${s2} ${b})`;
      }

      // écriture propre de fx
      const fxTex =
        fx === 1 ? "x" :
        fx === -1 ? "-x" :
        `${fx}x`;

      // écriture propre de g
      const gTex =
        g === 0 ? "" :
        g > 0 ? ` + ${g}` :
        ` - ${Math.abs(g)}`;

      const attenduPoly = Polynome.fromAffine(
        Nombre.fromParts(fx, 1),
        Nombre.fromParts(g, 1)
      );

      return {
        latex: `
        \\text{Développer et réduire :}
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${fxTex}${gTex}
        `,
        verifier(input) {
          return reponse.verifier("litteral", attenduPoly, input);
        }
      };
    }
  }

];

export default calculLit;
