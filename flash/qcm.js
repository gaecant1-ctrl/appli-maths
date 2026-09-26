/* ================================================================
   qcm.js — questions à choix multiples (menu déroulant) pour flash

   construireQcm(choix, bonne) → { qcm, verifier }
     choix : tableau de { texte, latex }
             texte = libellé affiché dans le menu déroulant (un <option>
                     ne passe pas par MathJax : texte brut / Unicode)
             latex = rendu de la réponse une fois verrouillée
     bonne : indice de la bonne proposition dans `choix`

   L'énoncé reste une question ouverte (projection, fiche papier) : seul
   le mode saisie remplace le champ texte par un <select> (voir
   data.qcm dans engine.js → _renderSaisie). La valeur d'une option est
   son indice ; verifier() reçoit donc "0", "1"... ou "" (rien choisi).
================================================================ */

export function construireQcm(choix, bonne) {
  return {
    qcm: { options: choix.map(c => c.texte) },
    verifier(valeur) {
      const i = parseInt(valeur, 10);
      if (!(i >= 0 && i < choix.length)) {
        return { ok: false, invalide: true, attendu: choix[bonne].latex };
      }
      return { ok: i === bonne, attendu: choix[bonne].latex, saisieLatex: choix[i].latex };
    }
  };
}
