// ============================================================
// AideSaisie.js — commentaires du mode « Saisie avec aide »
// ============================================================
// À partir de la dernière ligne acceptée (texte tapé par l'élève ou énoncé),
// indique le degré de l'équation et la prochaine étape à envisager.
// ============================================================

const AIDE_PREMIER_DEGRE = "C'est une équation du premier degré.";
const AIDE_SECOND_DEGRE = "C'est une équation du second degré.";
const AIDE_RESOLUE = "L'équation est résolue.";

/** Prochaine étape sur une équation du premier degré. */
function etapePremierDegre(g, d, polyG, polyD) {
  if ((g + d).includes(':')) return "Supprime les dénominateurs : multiplie les deux membres, ou fais un produit en croix.";
  if ((g + d).includes('(')) return "Développe.";
  if (!ecritureReduite(g) || !ecritureReduite(d)) return "Réduis chaque membre.";
  if (polyG.degre() === 1 && polyD.degre() === 1) return "Regroupe les termes en x dans un seul membre.";

  const coteX = polyG.degre() === 1 ? polyG : polyD;
  const zero = new Nombre("0");
  if (!coteX.coeff(0).equal(zero)) return "Isole le terme en x : enlève le nombre qui l'accompagne.";
  if (!coteX.coeff(1).equal(new Nombre("1"))) return "Divise les deux membres par le coefficient de x.";
  return "Simplifie la fraction.";
}

/** Prochaine étape sur une équation du second degré. */
function etapeSecondDegre(g, d, polyG, polyD) {
  const zero = new Nombre("0");
  const estXCarre = polyG.degre() === 2 && polyG.coeff(2).equal(new Nombre("1"))
    && polyG.coeff(1).equal(zero) && polyG.coeff(0).equal(zero);
  if (estXCarre && polyD.estConstant()) return "C'est une équation du type x² = a : regarde le signe de a.";

  if (!polyD.estNul()) return "Ramène-toi à une équation nulle (0 à droite).";

  const facteurs = decouperProduit(g);
  if (facteurs && facteurs.every(f => polynomeDe(f).degre() === 1)) {
    return "Un produit est nul si et seulement si l'un de ses facteurs est nul : écris A = 0 ou B = 0.";
  }

  if (/^(\([^()]+\)|x)\*?\([^()]+\)-\1\*?\(/.test(g)) return "Factorise : il y a un facteur commun.";
  if (/\)\^2-/.test(g)) return "Factorise avec A² − B².";
  if (g.includes('(')) return "Développe.";
  if (polyG.coeff(0).equal(zero)) return "Factorise : x est un facteur commun.";
  return "Factorise le membre de gauche, pour obtenir un produit nul.";
}

/** Vrai si la ligne est de la forme x = nombre, écrit sous forme réduite. */
function estLigneFinale(g, d, polyD) {
  return g === 'x' && polyD.estConstant() && ecritureReduite(d) && coefficientsReduits(polyD);
}

/** Commentaires pour une ligne « A=B » ou « A=B ou C=D ». Tableau vide si la ligne est illisible. */
function conseilsAide(ligne) {
  try {
    const parties = String(ligne).split(/\bou\b/i).map(lireMembres);
    if (parties.some(m => !m)) return [];

    const lues = parties.map(([gBrut, dBrut]) => {
      const g = gBrut.replace(/\s+/g, '');
      const d = dBrut.replace(/\s+/g, '');
      return { g, d, polyG: polynomeDe(g), polyD: polynomeDe(d) };
    });

    if (lues.every(({ g, d, polyD }) => estLigneFinale(g, d, polyD))) return [AIDE_RESOLUE];
    if (lues.length > 1) return ["Résous chacune des équations."];

    const { g, d, polyG, polyD } = lues[0];
    const degre = polyG.sub(polyD).degre();
    if (degre === 1) return [AIDE_PREMIER_DEGRE, etapePremierDegre(g, d, polyG, polyD)];
    if (degre === 2) return [AIDE_SECOND_DEGRE, etapeSecondDegre(g, d, polyG, polyD)];
    return [];
  } catch (e) {
    return [];
  }
}

/** Mode « Saisie avec aide » : le panneau de droite commente la dernière ligne acceptée. */
function actualiserAide(ligne) {
  if (modeActuel !== 'aide') return;

  const panneau = panneauOutils();
  panneau.innerHTML = '';

  const titre = document.createElement('div');
  titre.className = 'panel-groupe-label';
  titre.textContent = 'Aide';
  panneau.appendChild(titre);

  conseilsAide(ligne).forEach(texte => {
    const commentaire = document.createElement('p');
    commentaire.className = 'aide-commentaire';
    commentaire.textContent = texte;
    panneau.appendChild(commentaire);
  });
}
