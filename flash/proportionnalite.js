// =====================================================
// PROPORTIONNALITÉ — situations concrètes de proportionnalité (directe et
// inverse), quatrième proportionnelle.
// Port des cas 1, 3, 5, 7, 12, 16, 17, 22 de
// appli-maths/nombreProportionnalite/Enonce.js (EnonceProportionnalite)
// au format flash (gen()/verifier()) — les cas s'appuyant sur la classe
// Duree (mixte h/min, non portée dans flash) sont laissés de côté ou
// simplifiés en une seule unité, cohérent avec le reste de flash (aucun
// arrondi, valeurs toujours exactes).
// =====================================================

import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";
import * as reponse from "./reponse.js";

function randInt(min, max) {
  return min + Math.floor(Math.random() * (max - min + 1));
}

function pick(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function randDiffInt(min, max, exclu) {
  let v;
  do { v = randInt(min, max); } while (v === exclu);
  return v;
}

function grandeurEuroCentimes(centimes) {
  return new Grandeur(Nombre.fromParts(centimes, 100, "dec"), { "€": 1 });
}

function grandeur(valeur, unite) {
  return new Grandeur(new Nombre(String(valeur)), unite ? { [unite]: 1 } : {});
}

const proportionnalite = [

  // ---------------------------------------------------
  // Vitesse constante : distance parcourue (cas 1)
  // ---------------------------------------------------
  {
    id: "proportionnalite_vitesse_distance",
    theme: "proportionnalite",
    niveau: "5",
    negatif: "non",
    gen() {
      const v = pick([40, 50, 60, 70, 80, 90, 100, 110, 120]);
      const t1 = randInt(1, 4);
      const t2 = randDiffInt(1, 6, t1);
      const d1 = v * t1, d2 = v * t2;

      return {
        latex: `
        \\text{Un véhicule roulant à vitesse constante parcourt } ${d1}\\,\\text{km en } ${t1}\\,\\text{h}.\\\\
        \\text{Quelle distance parcourt-il en } ${t2}\\,\\text{h} \\text{ ?}
        `,
        correction: `${d1} \\div ${t1} = ${v}\\,\\text{km/h}\\quad\\text{puis}\\quad ${v} \\times ${t2} = ${d2}\\,\\text{km}`,
        verifier(input) { return reponse.verifier("grandeur", grandeur(d2, "km"), input); }
      };
    }
  },

  // ---------------------------------------------------
  // Prix proportionnel au nombre d'articles identiques (cas 3)
  // ---------------------------------------------------
  {
    id: "proportionnalite_prix_articles",
    theme: "proportionnalite",
    niveau: "6",
    negatif: "non",
    gen() {
      const prixUnitaire = pick([20, 25, 30, 40, 50, 60, 75, 80, 100]); // centimes
      const n1 = randInt(2, 8);
      const n2 = randDiffInt(2, 10, n1);
      const p1 = grandeurEuroCentimes(prixUnitaire * n1);
      const p2 = grandeurEuroCentimes(prixUnitaire * n2);

      return {
        latex: `
        \\text{${n1} bonbons identiques coûtent } ${p1.toLatex()}.\\\\
        \\text{Combien coûtent } ${n2} \\text{ bonbons identiques ?}
        `,
        correction: `${p1.toLatex()} \\div ${n1} \\times ${n2} = ${p2.toLatex()}`,
        verifier(input) { return reponse.verifier("grandeur", p2, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Masse proportionnelle à la longueur (tige homogène, cas 5)
  // ---------------------------------------------------
  {
    id: "proportionnalite_masse_longueur",
    theme: "proportionnalite",
    niveau: "5",
    negatif: "non",
    gen() {
      const masseParCm = pick([2, 3, 4, 5, 6, 8, 10, 12]);
      const l1 = randInt(3, 12);
      const l2 = randDiffInt(3, 20, l1);
      const m1 = l1 * masseParCm, m2 = l2 * masseParCm;

      return {
        latex: `
        \\text{Une tige cylindrique homogène de } ${l1}\\,\\text{cm} \\text{ pèse } ${m1}\\,\\text{g}.\\\\
        \\text{Quelle est la masse d'un morceau de } ${l2}\\,\\text{cm} \\text{ pris dans cette même tige ?}
        `,
        correction: `${m1} \\div ${l1} \\times ${l2} = ${m2}\\,\\text{g}`,
        verifier(input) { return reponse.verifier("grandeur", grandeur(m2, "g"), input); }
      };
    }
  },

  // ---------------------------------------------------
  // Prix proportionnel à la surface (immobilier, cas 7)
  // ---------------------------------------------------
  {
    id: "proportionnalite_prix_surface",
    theme: "proportionnalite",
    niveau: "5",
    negatif: "non",
    gen() {
      const prixM2 = pick([2000, 2500, 3000, 4000, 5000, 6000]);
      const s1 = randInt(20, 80);
      const s2 = randDiffInt(20, 100, s1);
      const p1 = prixM2 * s1, p2 = prixM2 * s2;

      return {
        latex: `
        \\text{Un appartement de } ${s1}\\,\\text{m}^2 \\text{ coûte } ${p1}\\,\\text{€}.\\\\
        \\text{Combien coûterait un appartement de } ${s2}\\,\\text{m}^2 \\text{ dans le même quartier ?}
        `,
        correction: `${p1} \\div ${s1} \\times ${s2} = ${p2}\\,\\text{€}`,
        verifier(input) { return reponse.verifier("grandeur", grandeur(p2, "€"), input); }
      };
    }
  },

  // ---------------------------------------------------
  // Quatrième proportionnelle : prix pour une unité (cas 12)
  // ---------------------------------------------------
  {
    id: "proportionnalite_prix_unitaire",
    theme: "proportionnalite",
    niveau: "5",
    negatif: "non",
    gen() {
      const prixUnitaire = pick([80, 90, 100, 120, 150, 180, 200, 240, 250, 300]); // centimes pour 1 L
      const v1 = pick([2, 3, 4, 5]);
      const pTotal = grandeurEuroCentimes(prixUnitaire * v1);
      const pUnitaire = grandeurEuroCentimes(prixUnitaire);

      return {
        latex: `
        \\text{On paye } ${pTotal.toLatex()} \\text{ pour } ${v1}\\,\\text{L} \\text{ d'un produit.}\\\\
        \\text{Combien paye-t-on pour } 1\\,\\text{L} \\text{ de ce produit ?}
        `,
        correction: `${pTotal.toLatex()} \\div ${v1} = ${pUnitaire.toLatex()}`,
        verifier(input) { return reponse.verifier("grandeur", pUnitaire, input); }
      };
    }
  },

  // ---------------------------------------------------
  // Proportionnalité INVERSE : vaches et réserve de foin (cas 17)
  // ---------------------------------------------------
  {
    id: "proportionnalite_inverse_vaches",
    theme: "proportionnalite",
    niveau: "4",
    negatif: "non",
    gen() {
      const n = randInt(2, 10);
      const k = pick([2, 3]);
      const j = pick([12, 15, 18, 20, 24, 30]);
      const jInitial = k * j;

      return {
        latex: `
        \\text{${n} vaches épuisent une réserve de foin en } ${jInitial}\\,\\text{jours}.\\\\
        \\text{Pendant combien de jours } ${k * n} \\text{ vaches peuvent-elles se nourrir avec cette même réserve ?}
        `,
        correction: `
        \\text{Ce n'est pas une situation de proportionnalité directe : le nombre de vaches est multiplié}\\\\
        \\text{par } ${k}\\text{, donc la durée est divisée par } ${k}\\,: \\quad ${jInitial} \\div ${k} = ${j}\\,\\text{jours}
        `,
        verifier(input) { return reponse.verifier("grandeur", grandeur(j), input); }
      };
    }
  },

  // ---------------------------------------------------
  // Recette de cuisine : ingrédient proportionnel au nombre de personnes
  // (cas 22)
  // ---------------------------------------------------
  {
    id: "proportionnalite_recette",
    theme: "proportionnalite",
    niveau: "6",
    negatif: "non",
    gen() {
      const persOrigine = pick([2, 4, 5, 6, 8, 10]);
      const persCible = randDiffInt(2, 20, persOrigine);
      const parPersonne = pick([30, 40, 50, 60, 100, 150]);
      const ingr = pick(["de sucre", "de farine", "de chocolat", "de beurre"]);
      const qteOrigine = parPersonne * persOrigine;
      const qteCible = parPersonne * persCible;

      return {
        latex: `
        \\text{Une recette de gâteau pour } ${persOrigine} \\text{ personnes nécessite } ${qteOrigine}\\,\\text{g ${ingr}}.\\\\
        \\text{Quelle quantité ${ingr} faut-il pour ${persCible} personnes ?}
        `,
        correction: `${qteOrigine} \\div ${persOrigine} \\times ${persCible} = ${qteCible}\\,\\text{g}`,
        verifier(input) { return reponse.verifier("grandeur", grandeur(qteCible, "g"), input); }
      };
    }
  },

  // ---------------------------------------------------
  // Piège : situation NON proportionnelle (cuisson d'œufs, cas 16) — le
  // temps de cuisson ne dépend pas de la quantité.
  // ---------------------------------------------------
  {
    id: "proportionnalite_piege_cuisson",
    theme: "proportionnalite",
    niveau: "5",
    negatif: "non",
    gen() {
      const tCuisson = 8;
      const a = randInt(2, 5);
      const b = randDiffInt(2, 8, a);

      return {
        latex: `
        \\text{Dans l'eau bouillante, il faut } ${tCuisson}\\,\\text{min} \\text{ pour cuire } ${a} \\text{ œufs.}\\\\
        \\text{Combien de temps faut-il pour en cuire } ${b} \\text{ dans la même casserole ?}
        `,
        correction: `
        \\text{Le temps de cuisson ne dépend pas du nombre d'œufs : ce n'est pas une situation de}\\\\
        \\text{proportionnalité.}\\quad ${tCuisson}\\,\\text{min}
        `,
        verifier(input) { return reponse.verifier("grandeur", grandeur(tCuisson, "min"), input); }
      };
    }
  }

];

export default proportionnalite;
