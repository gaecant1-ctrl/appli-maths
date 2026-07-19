import { Nombre } from "./Nombre.js";
import { CarteNombre } from "./CarteNombre.js";
import { pgcd, shuffle } from "./Utils.js";

/* ================================================================
   Paire.js — génère deux écritures différentes d'un même nombre.
   ----------------------------------------------
   Référence : une fraction p/q simplifiée, q ∈ {2,3,4,5,10}, p premier
   avec q.

   Niveaux :
     1 — la fraction simplifiée fait toujours partie de la paire, valeur < 1
     2 — la fraction simplifiée fait toujours partie de la paire, valeur > 1
     3 — aucune contrainte : les deux écritures de la paire sont tirées
         librement dans le pool (pas forcément la fraction simplifiée),
         et la valeur peut être propre ou impropre.

   Le pool d'écritures valides pour une valeur donnée : fraction simplifiée,
   fraction équivalente non simplifiée, mixte (si p > q), décimale et
   pourcentage (si q ∈ {2,4,5,10}).
================================================== */

export class Paire {
  constructor(niveau) {
    this.objets = [];
    this.signature = "";
    this.generer(niveau);
  }

  generer(niveau) {

    const denominateurs = [2, 3, 4, 5, 10];
    const denominateursDecimaux = [2, 4, 5, 10];

    const q = denominateurs[Math.floor(Math.random() * denominateurs.length)];

    let impropre;
    if (niveau === 1) impropre = false;
    else if (niveau === 2) impropre = true;
    else impropre = Math.random() < 0.3;

    const tirerCoprime = (max) => {
      let r = Math.floor(Math.random() * max) + 1;
      while (pgcd(r, q) !== 1) {
        r = (r % max) + 1;
      }
      return r;
    };

    let p;
    if (impropre) {
      const entier = Math.floor(Math.random() * 2) + 1; // 1 ou 2
      const reste = tirerCoprime(q - 1);
      p = entier * q + reste;
    } else {
      p = tirerCoprime(q - 1);
    }

    const reference = Nombre.fromParts(p, q);

    // ---- construction de la liste des écritures valides ----
    const pool = [];

    pool.push({ mode: "fractionSimple", nombre: reference });

    const k = Math.floor(Math.random() * 3) + 2; // 2, 3 ou 4
    pool.push({ mode: "fraction", nombre: Nombre.fromParts(p * k, q * k) });

    if (p > q) {
      pool.push({ mode: "mixteSimple", nombre: reference });
    }

    if (denominateursDecimaux.includes(q)) {
      pool.push({ mode: "dec", nombre: reference });
      pool.push({ mode: "pourcentage", nombre: reference });
    }

    this.pool = pool; // toutes les écritures valides (utilisé par la fiche papier)

    let choixA, choixB;

    if (niveau === 1 || niveau === 2) {
      // la fraction simplifiée fait toujours partie de la paire
      const autres = shuffle(pool.filter(e => e.mode !== "fractionSimple"));
      choixA = pool.find(e => e.mode === "fractionSimple");
      choixB = autres[0];
    } else {
      const tirage = shuffle([...pool]);
      [choixA, choixB] = tirage.slice(0, 2);
    }

    this.signature = `${p}/${q}`;
    this.objets = [
      new CarteNombre(choixA.nombre, choixA.mode, "fraction"),
      new CarteNombre(choixB.nombre, choixB.mode, "duree"),
    ];
  }
}
