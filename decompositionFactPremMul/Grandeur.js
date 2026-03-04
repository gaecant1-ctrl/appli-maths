// Grandeur.js

// Fonction utilitaire
function diviserParPuissanceDe10(nombre, puissance) {
    let str = nombre;
    let negatif = false;
    if (str[0] === '-') {
        negatif = true;
        str = str.slice(1);
    }
    let [entier, decimal = ""] = str.split('.');
    let total = entier + decimal;
    let nouvellePosition = entier.length - puissance;
    while (nouvellePosition < 0) {
        total = '0' + total;
        nouvellePosition++;
    }
    while (nouvellePosition > total.length) {
        total = total + '0';
    }
    let resultat = total.slice(0, nouvellePosition) + '.' + total.slice(nouvellePosition);
    if (resultat[0] === '.') resultat = '0' + resultat;
    resultat = resultat.replace(/^0+(\d)/, '$1');
    resultat = resultat.replace(/\.$/, '');
    resultat = resultat.replace(/(\.\d*?)0+$/, '$1');
    resultat = resultat.replace(/\.$/, '');
    if (negatif) resultat = '-' + resultat;
    if (resultat === '' || resultat === '.') resultat = '0';
    return resultat;
}


function nombreSignificatifAmeliore(type = 'longueur', index1 = 0, index2 = 0) {
  const ecart = Math.abs(index1 - index2);

  // Choix du nombre de chiffres significatifs
  let chiffresMin = 2, chiffresMax = 4;
  if (type === 'aire' || type === 'volume') chiffresMax = 3;
  if (ecart >= 2) chiffresMax = 2;
  const chiffres = Math.floor(Math.random() * (chiffresMax - chiffresMin + 1)) + chiffresMin;

  // Définition des plages et probabilités selon le type
  let plages;
  if (type === 'longueur') {
    plages = [
      { min: 0.1, max: 1, proba: 0.25 },
      { min: 1, max: 10, proba: 0.35 },
      { min: 10, max: 100, proba: 0.25 },
      { min: 100, max: 999, proba: 0.15 }
    ];
  } else if (type === 'aire') {
    plages = [
      { min: 0.01, max: 0.1, proba: 0.15 },
      { min: 0.1, max: 1, proba: 0.25 },
      { min: 1, max: 10, proba: 0.35 },
      { min: 10, max: 100, proba: 0.25 }
    ];
  } else { // volume
    plages = [
      { min: 0.001, max: 0.01, proba: 0.10 },
      { min: 0.01, max: 0.1, proba: 0.20 },
      { min: 0.1, max: 1, proba: 0.30 },
      { min: 1, max: 10, proba: 0.40 }
    ];
  }

  // Si l'écart d'unités est grand, favorise les petites valeurs
  if (ecart >= 1) {
    plages = plages.map(p => {
      if (p.max <= 1) return { ...p, proba: p.proba + 0.10 };
      if (p.min >= 10) return { ...p, proba: p.proba - 0.10 };
      return p;
    });
  }

  // Sélection de la plage selon la proba
  let r = Math.random(), sum = 0, plageChoisie = plages[0];
  for (let p of plages) {
    sum += p.proba;
    if (r <= sum) { plageChoisie = p; break; }
  }

  // Génération du nombre à chiffres significatifs dans la plage choisie
  let valeur, essais = 0;
  do {
    valeur = Math.random() * (plageChoisie.max - plageChoisie.min) + plageChoisie.min;
    valeur = Number.parseFloat(valeur.toPrecision(chiffres));
    essais++;
  } while ((Number.isInteger(valeur) || String(valeur).endsWith('.0')) && essais < 10);

  return valeur.toString();
}


// Classe Longueur
class Longueur {
  static facteurs = {
    km: 3, hm: 2, dam: 1, m: 0, dm: -1, cm: -2, mm: -3
  };

  constructor(texte) {
    const match = texte.trim().match(/^([\d.,]+)\s*(mm|cm|dm|m|dam|hm|km)$/i);
    if (!match) throw new Error("Format invalide");
    this.valeur = match[1].replace(',', '.');
    this.uniteInitiale = match[2];
    this.metres = diviserParPuissanceDe10(this.valeur, -1 * Longueur.facteurs[this.uniteInitiale]);
  }

  en(unite) {
    if (!(unite in Longueur.facteurs)) throw new Error("Unité inconnue : " + unite);
    const puissance = Longueur.facteurs[unite];
    return diviserParPuissanceDe10(this.metres, puissance);
  }

  estEgal(autre) {
    return Math.abs(this.metres - autre.metres) < 1e-9;
  }

  latex(unite = this.uniteInitiale) {
    return `\\(${this.en(unite)}\\ \\mathrm{${unite}}\\)`;
  }

  static unitesDisponibles() {
    return Object.keys(this.facteurs);
  }
}

// Classe Aire
class Aire {
  static facteurs = {
    km2: 6, hm2: 4, dam2: 2, m2: 0, dm2: -2, cm2: -4, mm2: -6
  };

  constructor(texte) {
    const match = texte.trim().match(/^([\d.,]+)\s*(mm2|cm2|dm2|m2|dam2|hm2|km2)$/i);
    if (!match) throw new Error("Format invalide");
    this.valeur = match[1].replace(',', '.');
    this.uniteInitiale = match[2];
    this.metresCarres = diviserParPuissanceDe10(this.valeur, -1 * Aire.facteurs[this.uniteInitiale]);
  }

  en(unite) {
    if (!(unite in Aire.facteurs)) throw new Error("Unité inconnue : " + unite);
    const puissance = Aire.facteurs[unite];
    return diviserParPuissanceDe10(this.metresCarres, puissance);
  }

  estEgal(autre) {
    return Math.abs(this.metresCarres - autre.metresCarres) < 1e-9;
  }

  latex(unite = this.uniteInitiale) {
    const valeur = this.en(unite);
    const uniteSans2 = unite.replace(/2$/, '');
    return `\\(${valeur}\\ \\mathrm{${uniteSans2}}^2\\)`;
  }

  static unitesDisponibles() {
    return Object.keys(this.facteurs);
  }
}

// Classe Volume
class Volume {
  static facteurs = {
    km3: 9, hm3: 6, dam3: 3, m3: 0, dm3: -3, cm3: -6, mm3: -9
  };

  constructor(texte) {
    const match = texte.trim().match(/^([\d.,]+)\s*(mm3|cm3|dm3|m3|dam3|hm3|km3)$/i);
    if (!match) throw new Error("Format invalide");
    this.valeur = match[1].replace(',', '.');
    this.uniteInitiale = match[2];
    this.metresCubes = diviserParPuissanceDe10(this.valeur, -1 * Volume.facteurs[this.uniteInitiale]);
  }

  en(unite) {
    if (!(unite in Volume.facteurs)) throw new Error("Unité inconnue : " + unite);
    const puissance = Volume.facteurs[unite];
    return diviserParPuissanceDe10(this.metresCubes, puissance);
  }

  estEgal(autre) {
    return Math.abs(this.metresCubes - autre.metresCubes) < 1e-9;
  }

  latex(unite = this.uniteInitiale) {
    const valeur = this.en(unite);
    const uniteSans3 = unite.replace(/3$/, '');
    return `\\(${valeur}\\ \\mathrm{${uniteSans3}}^3\\)`;
  }

  static unitesDisponibles() {
    return Object.keys(this.facteurs);
  }
}

// Optionnel : exporte tout sur window pour un usage classique
//window.diviserParPuissanceDe10 = diviserParPuissanceDe10;
//window.Longueur = Longueur;
//window.Aire = Aire;
//window.Volume = Volume;
