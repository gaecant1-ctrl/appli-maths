import { GestionGrille } from "./GestionGrille.js";
import { FicheAppariement } from "./Fiche.js?v=3";
import { GuideAppli } from "./Guide.js";

const container = document.getElementById("grid");

const grille = new GestionGrille(4, 4, container, 1);
window.grille = grille;

const headerActions = document.getElementById("headerActions");

if (headerActions) {
  // Bouton "Nouvel onglet" : rouvre simplement la page courante dans un
  // nouvel onglet (état frais, partie indépendante), même mécanique que
  // dans les autres applis. Repli si window.open() est bloqué (ex: page
  // intégrée dans une iframe "sandbox" sans allow-popups, comme certains
  // exports Trinket) : window.open renvoie alors null, et on affiche un
  // vrai lien <a target="_blank"> qu'un clic direct peut ouvrir même quand
  // l'appel JS programmatique est bloqué.
  const btnNouvelOnglet = document.createElement("button");
  btnNouvelOnglet.type = "button";
  btnNouvelOnglet.id = "btnNouvelOnglet";
  btnNouvelOnglet.className = "btn-header";
  btnNouvelOnglet.textContent = "Nouvel onglet";

  const repliNouvelOnglet = document.createElement("span");
  repliNouvelOnglet.id = "repliNouvelOnglet";
  repliNouvelOnglet.style.display = "none";
  repliNouvelOnglet.style.fontSize = "0.8em";
  repliNouvelOnglet.style.marginLeft = "8px";
  repliNouvelOnglet.innerHTML = `Bloqué ici — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

  btnNouvelOnglet.onclick = () => {
    const nouvelOnglet = window.open(window.location.href, "_blank", "noopener");
    if (!nouvelOnglet) {
      repliNouvelOnglet.style.display = "inline";
    }
  };

  headerActions.appendChild(btnNouvelOnglet);
  headerActions.appendChild(repliNouvelOnglet);

  // Bouton "Fiche papier" : génère une fiche imprimable indépendante de la
  // partie en cours, qui pioche parmi TOUS les niveaux du jeu (1 à niveauMax),
  // pas seulement le niveau actuellement affiché.
  const fiche = new FicheAppariement(() => grille.niveauMax);
  fiche.installerBouton(headerActions);

  // Bouton "Guide" : rappel des règles du jeu (jetons, vies, étoiles).
  const filetGuide = document.createElement("div");
  filetGuide.className = "filet-header";
  headerActions.appendChild(filetGuide);

  const guide = new GuideAppli();
  guide.installerBouton(headerActions);
}