// =====================================================
// DISTANCES — questions de cours (6e)
// Reprend le cours "Distances" : distance entre deux points, cercle et
// disque, médiatrice, distance d'un point à une droite.
// =====================================================

import { questionTrou, deuxLettres } from "./geometrieBase.js";

// Même format que dans geometrieBase.js (voir questionTrou). Une entrée peut
// être une fonction (a, b) => entrée quand la réponse dépend des lettres
// tirées. Dès qu'il y a plus de deux points, on garde les lettres du cours.

const distanceDeuxPoints = [
  (a, b) => ({
    debut: `\\text{La distance entre deux points } ${a} \\text{ et } ${b}\\\\
            \\text{est la ............. du segment } [${a}${b}]\\text{.}`,
    reponse: "longueur"
  }),
  (a, b) => ({
    debut: `\\text{La distance entre deux points } ${a} \\text{ et } ${b} \\text{ est notée}`,
    reponse: [`${a}${b}`, `${b}${a}`],
    presqueJuste: [`[${a}${b}]`, `(${a}${b})`, `[${a}${b})`]
  }),
  (a, b) => ({
    debut: `\\text{La longueur du plus court chemin pour aller de } ${a} \\text{ à } ${b}\\\\
            \\text{est la ............. entre } ${a} \\text{ et } ${b}\\text{.}`,
    reponse: "distance"
  })
];

const cercle = [
  {
    debut: `\\text{Le cercle de centre } O \\text{ et de rayon } r \\text{ est l'ensemble des points}\\\\
            \\text{situés à la même ............. } r \\text{ de son centre } O\\text{.}`,
    reponse: "distance"
  },
  {
    debut: `\\text{Le cercle de centre } O \\text{ et de rayon } r \\text{ est l'............. des points}\\\\
            \\text{situés à la même distance } r \\text{ de son centre } O\\text{.}`,
    reponse: "ensemble"
  },
  {
    debut: `\\text{L'ensemble des points situés à la même distance } r\\\\
            \\text{d'un point } O \\text{ est un}`,
    reponse: "cercle"
  },
  {
    debut: `\\text{La distance } r \\text{ entre le centre d'un cercle et ses points}\\\\
            \\text{est appelée}`,
    reponse: "rayon"
  },
  {
    debut: `\\text{Le point } M \\text{ est sur le cercle de centre } O \\text{ et de rayon } r\\text{.}\\\\
            \\text{On a : } OM \\text{ ............. } r`,
    reponse: "="
  },
  {
    debut: `\\text{Le point } N \\text{ est à l'intérieur du cercle de centre } O \\text{ et de rayon } r\\text{.}\\\\
            \\text{On a : } ON \\text{ ............. } r`,
    reponse: "<"
  },
  {
    debut: `\\text{Le point } P \\text{ est à l'extérieur du cercle de centre } O \\text{ et de rayon } r\\text{.}\\\\
            \\text{On a : } OP \\text{ ............. } r`,
    reponse: ">"
  },
  {
    debut: `\\text{Pour le cercle de centre } O \\text{ et de rayon } r \\text{ : si } OM = r\\text{,}\\\\
            \\text{alors le point } M \\text{ est ............. le cercle.}`,
    reponse: "sur"
  },
  {
    debut: `\\text{Pour le cercle de centre } O \\text{ et de rayon } r \\text{ : si } ON \\lt r\\text{,}\\\\
            \\text{alors le point } N \\text{ est à l'............. du cercle.}`,
    reponse: "intérieur"
  },
  {
    debut: `\\text{Pour le cercle de centre } O \\text{ et de rayon } r \\text{ : si } OP \\gt r\\text{,}\\\\
            \\text{alors le point } P \\text{ est à l'............. du cercle.}`,
    reponse: "extérieur"
  }
];

const disqueVocabulaire = [
  {
    debut: `\\text{Le disque de centre } O \\text{ et de rayon } r \\text{ est formé du cercle}\\\\
            \\text{et de tous les points à l'............. du cercle.}`,
    reponse: "intérieur"
  },
  {
    debut: `\\text{Le ............. de centre } O \\text{ et de rayon } r \\text{ est formé du cercle}\\\\
            \\text{et de tous les points à l'intérieur du cercle.}`,
    reponse: "disque"
  },
  {
    debut: `\\text{Un cercle est une}`,
    reponse: "ligne"
  },
  {
    debut: `\\text{Un disque est une}`,
    reponse: "surface"
  },
  {
    debut: `\\text{Le point } A \\text{ est sur le cercle de centre } O\\text{.}\\\\
            \\text{Le segment } [OA] \\text{ est un}`,
    reponse: "rayon"
  },
  {
    debut: `\\text{Un segment qui joint deux points d'un cercle}\\\\
            \\text{en passant par son centre est un}`,
    reponse: "diamètre"
  },
  {
    debut: `\\text{Un segment qui joint deux points d'un cercle est une}`,
    reponse: "corde"
  }
];

const mediatrice = [
  {
    debut: `\\text{La ............. d'un segment est la droite}\\\\
            \\text{perpendiculaire à ce segment qui passe par son milieu.}`,
    reponse: "médiatrice"
  },
  {
    debut: `\\text{La médiatrice d'un segment est la droite}\\\\
            \\text{............. à ce segment qui passe par son milieu.}`,
    reponse: "perpendiculaire"
  },
  {
    debut: `\\text{La médiatrice d'un segment est la droite}\\\\
            \\text{perpendiculaire à ce segment qui passe par son}`,
    reponse: "milieu"
  },
  {
    debut: `\\text{La médiatrice d'un segment est l'ensemble des points situés}\\\\
            \\text{à ............. distance des extrémités de ce segment.}`,
    reponse: "égale",
    presqueJuste: ["même"]
  },
  {
    debut: `\\text{La médiatrice d'un segment est l'ensemble des points situés}\\\\
            \\text{à égale distance des ............. de ce segment.}`,
    reponse: "extrémités",
    presqueJuste: ["extrémité"]
  },
  {
    debut: `\\text{Le point } M \\text{ est sur la médiatrice du segment } [AB]\\text{.}\\\\
            \\text{On a : } MA \\text{ ............. } MB`,
    reponse: "="
  },
  {
    debut: `\\text{Le point } M \\text{ est du côté de } A \\text{ par rapport à la médiatrice de } [AB]\\text{.}\\\\
            \\text{On a : } MA \\text{ ............. } MB`,
    reponse: "<"
  },
  {
    debut: `\\text{Le point } M \\text{ est du côté de } B \\text{ par rapport à la médiatrice de } [AB]\\text{.}\\\\
            \\text{On a : } MA \\text{ ............. } MB`,
    reponse: ">"
  }
];

const distancePointDroite = [
  {
    debut: `\\text{La perpendiculaire à } (d) \\text{ passant par } A \\text{ coupe } (d) \\text{ en } H\\text{.}\\\\
            \\text{La distance du point } A \\text{ à la droite } (d) \\text{ est la longueur}`,
    reponse: ["AH", "HA"],
    presqueJuste: ["[AH]", "(AH)", "[AH)"]
  },
  {
    debut: `\\text{Pour trouver la distance du point } A \\text{ à la droite } (d)\\text{,}\\\\
            \\text{on trace la ............. à } (d) \\text{ passant par } A\\text{.}`,
    reponse: "perpendiculaire"
  },
  {
    debut: `\\text{La distance du point } A \\text{ à la droite } (d) \\text{ est la longueur}\\\\
            \\text{du plus court ............. entre } A \\text{ et } (d)\\text{.}`,
    reponse: "chemin"
  },
  {
    debut: `\\text{La perpendiculaire à } (d) \\text{ passant par } A \\text{ coupe } (d) \\text{ en } H\\text{,}\\\\
            \\text{et } M \\text{ est un autre point de } (d)\\text{. On a : } AH \\text{ ............. } AM`,
    reponse: "<"
  },
  {
    debut: `\\text{Deux droites parallèles restent toujours}\\\\
            \\text{à la ............. distance l'une de l'autre.}`,
    reponse: "même"
  },
  {
    debut: `\\text{Deux droites ............. restent toujours}\\\\
            \\text{à la même distance l'une de l'autre.}`,
    reponse: "parallèles",
    presqueJuste: ["parallèle"]
  }
];

function coursTrou(id, liste) {
  return {
    id,
    theme: "distances",
    niveau: "6",
    negatif: "non",
    cours: "oui",
    gen() {
      const [a, b] = deuxLettres();
      const choix = liste[Math.floor(Math.random() * liste.length)];
      return questionTrou(typeof choix === "function" ? choix(a, b) : choix, a, b);
    }
  };
}

const distances = [
  coursTrou("distance_deux_points", distanceDeuxPoints),
  coursTrou("distance_cercle", cercle),
  coursTrou("distance_disque_vocabulaire", disqueVocabulaire),
  coursTrou("distance_mediatrice", mediatrice),
  coursTrou("distance_point_droite", distancePointDroite)
];

export default distances;
