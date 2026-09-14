import { Nombre } from "./nombre.js";
import { Grandeur } from "./calcul-grandeur.js";

// Rendu LaTeX "Xh + Ymin" à partir de deux entiers, via deux Grandeur
// (une par unité) plutôt que des chaînes \text{...} construites à la main.
function latexHeureMinute(h, min) {
  const gh = new Grandeur(Nombre.fromParts(h, 1, "entier"), { h: 1 });
  const gmin = new Grandeur(Nombre.fromParts(min, 1, "entier"), { min: 1 });
  return `${gh.toLatex()} + ${gmin.toLatex()}`;
}

// Réponse à deux trous ("...h + ...min") : pas un cas couvert par
// reponse.js (grandeur/litteral/texte), donc parsing local dédié.
// Accepte "3h24min", "3 h 24 min", "3h24", etc. — et, minutes optionnelles
// (implicitement 0 si absentes) : "5h" doit être accepté tel quel pour une
// durée ronde, pas seulement "5h+0min" ou "5h0min".
function verifierHeureMinute(h, min, saisie) {
  const attendu = latexHeureMinute(h, min);
  const m = String(saisie).trim().match(/^(-?\d+)\s*h[a-zéû]*(?:\D*(\d+))?/i);
  if (!m) return { ok: false, invalide: true, attendu };
  const hSaisi = parseInt(m[1], 10);
  const minSaisi = m[2] !== undefined ? parseInt(m[2], 10) : 0;
  const ok = hSaisi === h && minSaisi === min;
  // Rendu LaTeX reconstruit depuis les valeurs reconnues (pas le texte brut).
  const saisieLatex = latexHeureMinute(hSaisi, minSaisi);
  return { ok, attendu, saisieLatex };
}

/* =========================================
   CALCULS SUR LES DURÉES (somme, différence, produit, quotient)
   Port de appli-maths/dureeCalcul/EnonceDuree.js : mêmes 6 sous-types,
   mais générateurs en JS simple (h/min entiers) plutôt que la chaîne
   ObjetString/Grader de dureeCalcul — cohérent avec le reste de durees.js,
   qui vérifie déjà "...h + ...min" via verifierHeureMinute.
   ========================================= */

const MINUTES_POSSIBLES = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const rand = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

function uneDureeHMin(hMin, hMax) {
  const h = rand(hMin, hMax);
  const min = pick(MINUTES_POSSIBLES);
  return { h, min, totalMin: h * 60 + min };
}

function latexHeuresSeules(h) {
  return new Grandeur(Nombre.fromParts(h, 1, "entier"), { h: 1 }).toLatex();
}

function latexMinutesSeules(min) {
  return new Grandeur(Nombre.fromParts(min, 1, "entier"), { min: 1 }).toLatex();
}

const duree = [

  /* =========================================
     SOMME DE DURÉES
     ========================================= */

  {
    id: "calcul_duree_somme",
    theme: "durees",
    niveau: "6",
    negatif: "non",
    gen() {
      const d1 = uneDureeHMin(1, 4);
      const d2 = uneDureeHMin(1, 4);
      const totalMin = d1.totalMin + d2.totalMin;
      const h = Math.floor(totalMin / 60);
      const min = totalMin % 60;

      const expression = `(${latexHeureMinute(d1.h, d1.min)}) + (${latexHeureMinute(d2.h, d2.min)})`;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${latexHeureMinute(h, min)}
        `,
        verifier(input) {
          return verifierHeureMinute(h, min, input);
        }
      };
    }
  },

  /* =========================================
     DIFFÉRENCE DE DURÉES (toujours positive)
     ========================================= */

  {
    id: "calcul_duree_difference",
    theme: "durees",
    niveau: "6",
    negatif: "non",
    gen() {
      let d1 = uneDureeHMin(2, 6);
      let d2 = uneDureeHMin(1, 5);
      if (d2.totalMin >= d1.totalMin) [d1, d2] = [d2, d1];

      let garde = 0;
      while (d2.totalMin >= d1.totalMin && garde++ < 10) {
        d2 = uneDureeHMin(1, Math.max(1, d1.h - 1));
      }

      const totalMin = d1.totalMin - d2.totalMin;
      const h = Math.floor(totalMin / 60);
      const min = totalMin % 60;

      const expression = `(${latexHeureMinute(d1.h, d1.min)}) - (${latexHeureMinute(d2.h, d2.min)})`;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${latexHeureMinute(h, min)}
        `,
        verifier(input) {
          return verifierHeureMinute(h, min, input);
        }
      };
    }
  },

  /* =========================================
     PRODUIT D'UNE DURÉE PAR UN ENTIER
     ========================================= */

  {
    id: "calcul_duree_produit",
    theme: "durees",
    niveau: "6",
    negatif: "non",
    gen() {
      const d = uneDureeHMin(1, 3);
      const facteur = rand(2, 5);
      const totalMin = d.totalMin * facteur;
      const h = Math.floor(totalMin / 60);
      const min = totalMin % 60;

      const expression = `(${latexHeureMinute(d.h, d.min)}) \\times ${facteur}`;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${latexHeureMinute(h, min)}
        `,
        verifier(input) {
          return verifierHeureMinute(h, min, input);
        }
      };
    }
  },

  /* =========================================
     PRODUIT PAR UN ENTIER D'UNE DURÉE PROCHE D'UNE HEURE
     (minutes seules, 50 à 59) — force la conversion au résultat,
     ex. 4×54min = 216min = 3h36min.
     ========================================= */

  {
    id: "calcul_duree_produit_proche_heure",
    theme: "durees",
    niveau: "6",
    negatif: "non",
    gen() {
      const minutesProchesHeure = rand(50, 59);
      const facteur = rand(2, 6);
      const totalMin = minutesProchesHeure * facteur;
      const h = Math.floor(totalMin / 60);
      const min = totalMin % 60;

      const expression = `${facteur} \\times ${latexMinutesSeules(minutesProchesHeure)}`;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${latexHeureMinute(h, min)}
        `,
        verifier(input) {
          return verifierHeureMinute(h, min, input);
        }
      };
    }
  },

  /* =========================================
     QUOTIENT PAR UN ENTIER — (kn+1)h : n
     n dans {2,3,4,5,6,10} (diviseurs de 60) : le "+1" garantit un reste net
     d'exactement 1h à chaque tirage (jamais une division exacte triviale),
     qui se convertit toujours pile en minutes puisque 60/n est entier
     (ex. 4h:3 = 1h + 60min:3 = 1h20min).
     ========================================= */

  {
    id: "calcul_duree_quotient",
    theme: "durees",
    niveau: "6",
    negatif: "non",
    gen() {
      const diviseur = pick([2, 3, 4, 5, 6, 10]);
      const k = rand(0, 3);
      const hDividende = k * diviseur + 1;
      const totalMin = hDividende * 60;
      const h = Math.floor(totalMin / diviseur / 60);
      const min = Math.floor(totalMin / diviseur) % 60;

      const expression = `${latexHeuresSeules(hDividende)} \\div ${diviseur}`;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${latexHeureMinute(h, min)}
        `,
        verifier(input) {
          return verifierHeureMinute(h, min, input);
        }
      };
    }
  },

  /* =========================================
     QUOTIENT PAR UN ENTIER * — Xh:n, X entier QUELCONQUE (1 à 9)
     n dans {2,3,4,5,6,10} toujours (reste convertible exactement), mais
     sans la forme imposée kn+1 : variante plus difficile (division parfois
     triviale, parfois non) — niveau 5e plutôt que 6e, pour ne pas sortir
     par défaut avec les sélections 6e seules.
     ========================================= */

  {
    id: "calcul_duree_quotient_libre",
    theme: "durees",
    niveau: "5",
    negatif: "non",
    gen() {
      const diviseur = pick([2, 3, 4, 5, 6, 10]);
      const hDividende = rand(1, 9);
      const totalMin = hDividende * 60;
      const h = Math.floor(totalMin / diviseur / 60);
      const min = Math.floor(totalMin / diviseur) % 60;

      const expression = `${latexHeuresSeules(hDividende)} \\div ${diviseur}`;

      return {
        latex: `
        \\text{Calculer : }
        \\,\\,${expression}
        `,
        correction: `
        ${expression} = ${latexHeureMinute(h, min)}
        `,
        verifier(input) {
          return verifierHeureMinute(h, min, input);
        }
      };
    }
  },

  /* =========================================
     DÉCIMAL → h + min
     ========================================= */

  {
    id: "decimal_vers_h_min",
    theme: "durees",
    niveau: "6",
    gen() {
      const entier = 1 + Math.floor(Math.random() * 5); // h
      const dixieme = 1 + Math.floor(Math.random() * 9); // 0,1 à 0,9

      const minutes = dixieme * 6; // 0,1 h = 6 min

      const dureeGrandeur = new Grandeur(new Nombre(`${entier}.${dixieme}`), { h: 1 });
      const expression = dureeGrandeur.toLatex();
      const resultat = latexHeureMinute(entier, minutes);

      return {
        latex: `
        \\text{Écrire la durée, au format HMS : }
        ${expression}
        `,
        correction: `
        ${expression} = ${resultat}
        `,
        verifier(input) {
          return verifierHeureMinute(entier, minutes, input);
        }
      };
    }
  },

  /* =========================================
     FRACTION → h + min
     ========================================= */

  {
    id: "fraction_vers_h_min",
    theme: "durees",
    niveau: "6",
    gen() {
      const denominateurs = [2, 3, 4, 5, 6];
      const b = denominateurs[Math.floor(Math.random() * denominateurs.length)];

      // Partie entière (1 ou 2 h) + reste NON NUL entre 1 et b-1 : on
      // construit directement une fraction qui ne tombe jamais sur une
      // durée ronde (reste=0, donc 0 min) — 60 est divisible par chacun
      // des dénominateurs ci-dessus, reste*60/b est toujours entier.
      const h = 1 + Math.floor(Math.random() * 2);
      const reste = 1 + Math.floor(Math.random() * (b - 1));
      const a = h * b + reste;
      const minutes = (reste * 60) / b;

      const dureeGrandeur = new Grandeur(Nombre.fromParts(a, b, "fraction"), { h: 1 });
      const expression = dureeGrandeur.toLatex();
      const resultat = latexHeureMinute(h, minutes);

      return {
        latex: `
        \\text{Écrire la durée, au format HMS : }
        ${expression}
        `,
        correction: `
        ${expression} = ${resultat}
        `,
        verifier(input) {
          return verifierHeureMinute(h, minutes, input);
        }
      };
    }
  },

  /* =========================================
     MINUTES → h + min
     a entre 1 et 10
     b non nul
     ========================================= */

  {
    id: "minutes_vers_h_min",
    theme: "durees",
    niveau: "6",
    gen() {
      // heures entre 1 et 10
      const a = 1 + Math.floor(Math.random() * 10);

      // minutes restantes NON nulles
      const b = 1 + Math.floor(Math.random() * 59);

      const n = a * 60 + b;

      const dureeGrandeur = new Grandeur(Nombre.fromParts(n, 1, "entier"), { min: 1 });
      const expression = dureeGrandeur.toLatex();
      const resultat = latexHeureMinute(a, b);

      return {
        latex: `
        \\text{Écrire la durée, au format HMS : }
        ${expression}
        `,
        correction: `
        ${expression} = ${resultat}
        `,
        verifier(input) {
          return verifierHeureMinute(a, b, input);
        }
      };
    }
  }

];

export default duree;
