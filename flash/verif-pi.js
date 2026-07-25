// Réponses de la forme "k π <unité>" ou "k π + c <unité>" (aire/périmètre
// de disque ou demi-disque) : π est irrationnel, hors de portée de
// Nombre/Grandeur (arithmétique exacte sur des rationnels). On réutilise
// plutôt le moteur littéral (calcul-litteral.js) en substituant π par x —
// "25π" devient "25x", vérifié comme un polynôme (accepte "25*pi",
// "pi*25", toute forme algébriquement égale). L'unité, elle, reste
// vérifiée séparément (obligatoire) puisque le moteur littéral n'a pas de
// notion d'unité. Partagé entre aires.js et perimetre.js.

import { Nombre } from "./nombre.js";
import { Polynome } from "./calcul-litteral.js";
import * as reponse from "./reponse.js";

function _normaliserUnite(s) {
  return String(s).toLowerCase()
    .replace(/\\,/g, "")
    .replace(/\\text\{([^}]*)\}/g, "$1")
    // Exposant générique (²/³/^2/^{3}/...) → chiffre nu, pas seulement le
    // carré : aires.js/perimetre.js n'utilisent que ^2, mais volume.js a
    // besoin de ^3.
    .replace(/²/g, "2")
    .replace(/³/g, "3")
    .replace(/\^\{?(\d+)\}?/g, "$1")
    .replace(/\s+/g, "");
}

function verifierPi(polynomeAttendu, uniteLatex, uniteSuffixNorm, input) {
  const attendu = `${polynomeAttendu.toLatex().replace(/x/g, "\\pi")}\\,${uniteLatex}`;

  const norm = _normaliserUnite(input);

  // Retire l'unité à chaque frontière de terme (juste avant un +/- ou en
  // fin de chaîne) : elle peut être répétée sur chaque terme ("7picm+7cm")
  // ou écrite une seule fois à la fin ("7pi+7cm"). Une unité DIFFÉRENTE ou
  // mal formée ("7cm2" alors qu'on attend "cm", "7m" au lieu de "7cm") n'est
  // jamais à une frontière de terme complète : elle reste dans la chaîne et
  // fait échouer le parsing littéral plus bas → invalide, pas une fausse
  // acceptation silencieuse.
  const uniteEchappee = uniteSuffixNorm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const uniteRe = new RegExp(uniteEchappee + "(?=[+-]|$)", "g");
  if (!uniteRe.test(norm)) return { ok: false, invalide: true, attendu };
  const sansUnite = norm.replace(uniteRe, "");
  const saisieX = sansUnite.replace(/\\pi/g, "x").replace(/π/g, "x").replace(/pi/g, "x");

  const r = reponse.verifier("litteral", polynomeAttendu, saisieX);
  if (r.invalide) return { ok: false, invalide: true, attendu };

  const saisieLatex = `${r.saisieLatex.replace(/x/g, "\\pi")}\\,${uniteLatex}`;
  return { ok: r.ok, attendu, saisieLatex };
}

export function verifierMultipleDePi(coeffAttendu, uniteLatex, uniteSuffixNorm, input) {
  const poly = Polynome.fromMonome(new Nombre(String(coeffAttendu)), 1);
  return verifierPi(poly, uniteLatex, uniteSuffixNorm, input);
}

// Réponses de la forme "k π + c <unité>" (périmètre demi-disque).
export function verifierPiPlusConstante(coeffPi, cste, uniteLatex, uniteSuffixNorm, input) {
  const poly = Polynome.fromAffine(new Nombre(String(coeffPi)), new Nombre(String(cste)));
  return verifierPi(poly, uniteLatex, uniteSuffixNorm, input);
}
