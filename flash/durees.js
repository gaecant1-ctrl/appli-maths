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
// Accepte "3h24min", "3 h 24 min", "3h24", etc.
function verifierHeureMinute(h, min, saisie) {
  const attendu = latexHeureMinute(h, min);
  const m = String(saisie).trim().match(/^(-?\d+)\s*h[a-zéû]*\D*(\d+)/i);
  if (!m) return { ok: false, invalide: true, attendu };
  const hSaisi = parseInt(m[1], 10);
  const minSaisi = parseInt(m[2], 10);
  const ok = hSaisi === h && minSaisi === min;
  // Rendu LaTeX reconstruit depuis les valeurs reconnues (pas le texte brut).
  const saisieLatex = latexHeureMinute(hSaisi, minSaisi);
  return { ok, attendu, saisieLatex };
}

const duree = [

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

      // fraction strictement > 1
      const a = b + 1 + Math.floor(Math.random() * (2 * b));

      const h = Math.floor(a / b);
      const reste = a % b;
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
