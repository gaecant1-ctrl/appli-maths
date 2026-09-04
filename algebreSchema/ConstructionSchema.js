/* ==============================================
   ConstructionSchema.js — mode "Construction" : au lieu de recevoir le
   schéma tout fait et de calculer x, l'élève le RECONSTITUE par
   glisser-déposer. Affiché EN LIGNE dans #problemeGrille, à la place du
   diagramme habituel (voir app.js:rendreProbleme) — pas un overlay.
   Chaque nouveau problème appelle construireVue(probleme, onValide), qui
   repart de zéro (comme rendreSchema()) et renvoie le DOM à insérer.
   onValide est appelé dès que _valider() juge le schéma correct — c'est
   ce qui permet à app.js de basculer sur le vrai diagramme et de révéler
   la zone de réponse à ce moment précis, jamais avant.

   Tuiles : une par valeur connue distincte du schéma, une tuile "x", et
   une tuile "..." si le schéma attendu a un groupe répété (produit/
   quotient/compte). Pas de tuile séparée pour le nombre de répétitions :
   il se saisit directement sur la tuile "..." posée (double-clic dessus
   -> input à la place des points, PASSAGE TEMPORAIRE : validé, la case
   revient aux points et le nombre saisi apparaît sur le badge "×n" +
   flèche double au-dessus du groupe, exactement comme rendreSchema()).
   Les tuiles sont réutilisables (pas consommées au dépôt) — un groupe
   répété se reconstitue en déposant la même tuile plusieurs fois.
   L'affichage réutilise EXACTEMENT les classes de rendreSchema()
   (schema-carte/schema-parts/schema-total/schema-segment/schema-repet-*,
   voir app.js et style.css) : une part déposée partage l'espace avec les
   autres (flex: 1 1 0, déjà défini pour le vrai schéma), pas de mise en
   forme parallèle à maintenir. Pas de bouton de suppression : on retire
   une tuile posée en la faisant glisser EN DEHORS des deux zones.

   Validation volontairement simple (voir _valider) : chaque tuile de la
   réserve doit être utilisée au moins une fois, et la somme des parts
   (le "..." compté pour compte × la valeur de sa voisine) doit égaler
   le total.
================================================== */

class ConstructionSchema {
  constructor() {
    this._installerCSS();
    // Repère visuel affiché PENDANT le survol de la barre "parts", pour
    // matérialiser où la tuile s'insérera si on la lâche ici — un seul
    // élément réutilisé d'un rendu à l'autre (retiré du DOM entre deux
    // survols, voir _afficherIndicateur/_masquerIndicateur).
    this._indicateur = document.createElement('div');
    this._indicateur.className = 'construction-indicateur';

    // Image de drag transparente (1x1) : désactive le fantôme NATIF du
    // navigateur (qui, sur un drop raté, s'anime en retour vers sa
    // position d'origine avant qu'on supprime la tuile — effet "elle
    // revient puis disparaît"). À la place, on gère nous-même un fantôme
    // (voir _demarrerFantome/_deplacerFantome/_terminerFantome) : visible,
    // suit la souris pendant le glisser, et s'efface en fondu là où on
    // l'a lâché si le drop échoue — jamais de retour en arrière.
    this._imageDragVide = new Image();
    this._imageDragVide.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBTAA7';
    this._fantome = null;
  }

  /** Crée le fantôme qui suivra la souris pendant tout le glisser — un
   *  clone visuel de la tuile, positionné en fixed, indépendant du DOM
   *  source (qui reste à sa place, juste atténué via .en-glisser).
   *  Le suivi se fait via un "dragover" posé sur DOCUMENT (pas l'évènement
   *  "drag" de l'élément source) : "drag" est trop peu fréquent/saccadé
   *  suivant les navigateurs pour donner l'impression d'un vrai suivi de
   *  la souris, alors que "dragover" (qui bubble depuis l'élément survolé,
   *  y compris les zones de dépôt qui l'écoutent déjà) se déclenche bien
   *  plus souvent. */
  _demarrerFantome(tuile, x, y) {
    const fantome = document.createElement('div');
    fantome.className = 'construction-fantome';
    if (tuile.couleur) fantome.style.backgroundColor = tuile.couleur;
    ecrireLatex(fantome, tuile.latex);
    document.body.appendChild(fantome);
    typesetMathJax([fantome]);
    this._deplacerFantome(x, y);
    this._fantome = fantome;

    this._onDragOverDocument = (e) => this._deplacerFantome(e.clientX, e.clientY);
    document.addEventListener('dragover', this._onDragOverDocument);
  }

  /** Repositionne le fantôme sur la souris. Certains navigateurs (Firefox)
   *  envoient occasionnellement clientX=clientY=0 sur ces évènements : on
   *  ignore ces valeurs pour ne pas faire sauter le fantôme dans le coin
   *  de l'écran. */
  _deplacerFantome(x, y) {
    if (!this._fantome || (x === 0 && y === 0)) return;
    this._fantome.style.left = `${x}px`;
    this._fantome.style.top = `${y}px`;
  }

  /** Fin du glisser : si le drop a échoué (jeté en dehors), le fantôme
   *  s'efface en fondu là où il se trouve ; sinon il disparaît net, le
   *  vrai segment prenant sa place via _rendreZones(). */
  _terminerFantome(echoue) {
    if (this._onDragOverDocument) {
      document.removeEventListener('dragover', this._onDragOverDocument);
      this._onDragOverDocument = null;
    }
    const fantome = this._fantome;
    this._fantome = null;
    if (!fantome) return;
    if (!echoue) { fantome.remove(); return; }
    fantome.classList.add('disparait');
    fantome.addEventListener('transitionend', () => fantome.remove(), { once: true });
    setTimeout(() => fantome.remove(), 300); // filet de sécurité
  }

  /** Construit la vue de construction pour ce problème et la renvoie
   *  (à insérer dans #problemeGrille par rendreProbleme, app.js). Repart
   *  de zéro à chaque appel, comme rendreSchema(). onValide(probleme) est
   *  appelé dès que _valider() juge le schéma correct. */
  construireVue(probleme, onValide = null) {
    this.probleme = probleme;
    this.onValide = onValide;
    this.tuiles = this._genererTuiles(probleme);
    this.partsPlacees = [];
    this.totalPlace = null;
    this.couleurSelectionnee = null;

    const conteneur = document.createElement('div');
    conteneur.className = 'construction-inline';

    const labelCouleurs = document.createElement('div');
    labelCouleurs.className = 'construction-section-label';
    labelCouleurs.textContent = 'Couleurs ';

    const palette = this._construirePalette();

    const labelTuiles = document.createElement('div');
    labelTuiles.className = 'construction-section-label';
    labelTuiles.textContent = 'Tuiles disponibles ';

    const tray = document.createElement('div');
    tray.className = 'construction-tray';

    // Même carte que le vrai schéma (rendreSchema, app.js) : bordure
    // accent + label "Schéma", parts au-dessus / total en dessous. Les
    // deux barres démarrent vides et acceptent le dépôt.
    const schemaCarte = document.createElement('div');
    schemaCarte.className = 'schema-carte';

    const schemaLabel = document.createElement('div');
    schemaLabel.className = 'schema-carte-label';
    schemaLabel.textContent = 'Schéma : ';

    const badge = document.createElement('div');
    badge.className = 'schema-repet-badge';

    const fleche = document.createElement('div');
    fleche.className = 'schema-repet-fleche';
    fleche.appendChild(document.createElement('div')).className = 'schema-repet-ligne';

    const zoneParts = document.createElement('div');
    zoneParts.className = 'schema-parts construction-dropzone';

    const zoneTotal = document.createElement('div');
    zoneTotal.className = 'schema-total construction-dropzone';

    schemaCarte.append(schemaLabel, badge, fleche, zoneParts, zoneTotal);

    const actions = document.createElement('div');
    actions.className = 'construction-actions';

    const btnValider = document.createElement('button');
    btnValider.type = 'button';
    btnValider.className = 'panel-btn accent';
    btnValider.textContent = 'Valider';
    btnValider.onclick = () => this._valider();

    const btnReset = document.createElement('button');
    btnReset.type = 'button';
    btnReset.className = 'panel-btn';
    btnReset.textContent = 'Réinitialiser';
    btnReset.onclick = () => this._reinitialiser();

    actions.append(btnValider, btnReset);

    const feedback = document.createElement('div');
    feedback.className = 'construction-feedback';

    // Tuiles et couleurs côte à côte : les tuiles prennent la place
    // disponible, la palette reste compacte à droite.
    const colTuiles = document.createElement('div');
    colTuiles.className = 'construction-colonne-tuiles';
    colTuiles.append(labelTuiles, tray);

    const colCouleurs = document.createElement('div');
    colCouleurs.className = 'construction-colonne-couleurs';
    colCouleurs.append(labelCouleurs, palette);

    const rangee = document.createElement('div');
    rangee.className = 'construction-rangee';
    rangee.append(colTuiles, colCouleurs);

    conteneur.append(rangee, schemaCarte, actions, feedback);

    this.elTray = tray;
    this.zoneParts = zoneParts;
    this.zoneTotal = zoneTotal;
    this.elBadge = badge;
    this.elFleche = fleche;
    this.elFeedback = feedback;
    // Gardée pour figerCarte() : une fois validé, app.js affiche CETTE
    // carte (l'agencement réellement construit par l'élève — ordre des
    // parts inclus) plutôt que de regénérer le schéma canonique, qui
    // peut différer (voir figerCarte).
    this.schemaCarte = schemaCarte;

    this._brancherDropZone(zoneParts, 'parts');
    this._brancherDropZone(zoneTotal, 'total');

    this._rendreTuiles();
    this._rendreZones();

    return conteneur;
  }

  /** Une tuile par valeur connue DISTINCTE portée par un segment du
   *  schéma (parts + total, dédupliquées par valeur — une part répétée
   *  comme "60 kg" ne donne qu'une seule tuile, réutilisable), une tuile
   *  "x", et une tuile "..." si le schéma a un groupe répété. Le "..."
   *  ne porte PAS sa propre tuile de compte : ce nombre se saisit en
   *  double-cliquant la tuile "..." une fois posée (voir _creerSegmentPlace).
   *  Chaque tuile (sauf "...") garde sa Grandeur (magnitude) pour la
   *  validation — voir _valider. */
  _genererTuiles(probleme) {
    const tuiles = [];
    const vues = new Set();
    const ajouter = (grandeur) => {
      const latex = grandeur.toLatex();
      if (vues.has(latex)) return;
      vues.add(latex);
      tuiles.push({ id: `atome-${tuiles.length}`, latex, grandeur });
    };

    probleme.schema.parts.forEach(seg => {
      if (!seg.ellipsis && seg.connue) ajouter(seg.grandeur);
    });
    if (probleme.schema.total.connue) ajouter(probleme.schema.total.grandeur);

    tuiles.push({ id: 'x', latex: 'x', grandeur: probleme.inconnue });
    if (probleme.schema.parts.some(p => p.ellipsis)) {
      tuiles.push({ id: 'ellipsis', latex: '\\ldots', ellipsis: true });
    }
    return tuiles;
  }

  /** Palette "Aucune"/rouge/bleu/vert/jaune (mêmes couleurs que
   *  rendreSchema(), voir COULEUR_ROUGE etc. dans ProblemeSchema.js).
   *  "Aucune" est une option explicite (pas juste "rien sélectionné") et
   *  reste active par défaut — jamais de palette qui a l'air vide/blanche.
   *  Sélectionner une couleur ne teint rien tout de suite, elle s'applique
   *  à la prochaine part OU au total déposé(e) ou cliqué(e) (voir
   *  _brancherDropZone et _colorierAuClic), APRÈS QUOI la sélection
   *  revient automatiquement sur "Aucune" — une couleur ne sert qu'une
   *  fois, il faut la resélectionner pour la case suivante. */
  _construirePalette() {
    const conteneur = document.createElement('div');
    conteneur.className = 'construction-palette';
    const couleurs = [
      { id: 'aucune', valeur: null },
      { id: 'rouge', valeur: COULEUR_ROUGE },
      { id: 'bleu', valeur: COULEUR_BLEU },
      { id: 'vert', valeur: COULEUR_VERT },
      { id: 'jaune', valeur: COULEUR_JAUNE },
    ];
    this._boutonsPalette = couleurs.map(c => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'construction-couleur-btn' + (c.valeur === null ? ' construction-couleur-aucune' : '');
      if (c.valeur) btn.style.backgroundColor = c.valeur;
      btn.setAttribute('aria-label', c.id);
      btn.onclick = () => this._selectionnerCouleur(c.valeur);
      conteneur.appendChild(btn);
      return { btn, valeur: c.valeur };
    });
    this._selectionnerCouleur(null);
    return conteneur;
  }

  _selectionnerCouleur(valeur) {
    this.couleurSelectionnee = valeur;
    this._boutonsPalette.forEach(({ btn, valeur: v }) => btn.classList.toggle('active', v === valeur));
  }

  _rendreTuiles() {
    this.elTray.innerHTML = '';
    this.tuiles.forEach(tuile => {
      const pill = document.createElement('div');
      pill.className = 'schema-segment';
      pill.draggable = true;
      ecrireLatex(pill, tuile.latex);
      pill.addEventListener('dragstart', (e) => {
        e.dataTransfer.effectAllowed = 'copy';
        e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'tray', tuileId: tuile.id }));
        e.dataTransfer.setDragImage(this._imageDragVide, 0, 0);
        pill.classList.add('en-glisser');
        this._demarrerFantome(tuile, e.clientX, e.clientY);
      });
      pill.addEventListener('dragend', (e) => {
        pill.classList.remove('en-glisser');
        this._terminerFantome(e.dataTransfer.dropEffect === 'none');
      });
      this.elTray.appendChild(pill);
    });
    typesetMathJax([this.elTray]);
  }

  _brancherDropZone(zone, cible) {
    zone.addEventListener('dragover', (e) => {
      e.preventDefault();
      // dropEffect DOIT être compatible avec l'effectAllowed fixé au
      // dragstart ('copy' pour une tuile de la réserve, 'move' pour une
      // tuile déjà posée — voir _rendreTuiles/_creerSegmentPlace) : sinon
      // le navigateur ignore la valeur et rapporte 'none' au dragend,
      // faisant croire à un drop raté — et donc supprimer la tuile même
      // quand on l'a bien déposée sur l'autre barre.
      e.dataTransfer.dropEffect = e.dataTransfer.effectAllowed === 'move' ? 'move' : 'copy';
      zone.classList.add('survol');
      if (cible === 'parts') this._afficherIndicateur(e.clientX);
    });
    zone.addEventListener('dragleave', () => {
      zone.classList.remove('survol');
      if (cible === 'parts') this._masquerIndicateur();
    });
    zone.addEventListener('drop', (e) => {
      e.preventDefault();
      zone.classList.remove('survol');
      let data;
      try { data = JSON.parse(e.dataTransfer.getData('text/plain')); } catch { return; }

      if (cible === 'total') {
        if (data.source === 'tray') {
          const modele = this.tuiles.find(t => t.id === data.tuileId);
          if (!modele) return;
          this.totalPlace = { ...modele, couleur: this.couleurSelectionnee };
          this._selectionnerCouleur(null);
          this._rendreZones();
          return;
        }
        if (data.source === 'placed' && data.zoneType === 'parts') {
          // Déplace cette part vers le total — remplace ce qui y était
          // déjà (comme un dépôt de la réserve directement sur le total).
          const [tuile] = this.partsPlacees.splice(data.index, 1);
          this.totalPlace = tuile;
          this._rendreZones();
        }
        // placed depuis 'total' vers 'total' : déjà à sa place, rien à faire.
        return;
      }

      // cible === 'parts' : on insère au point précis pointé par le
      // curseur (voir _indexDepotParts), pas forcément à la fin.
      const index = this._indexDepotParts(e.clientX);
      this._masquerIndicateur();
      if (data.source === 'tray') {
        // Chaque dépôt clone la tuile-modèle : un "..." posé deux fois a
        // deux comptes (compte) indépendants (voir _creerSegmentPlace).
        // La couleur sélectionnée dans la palette (si il y en a une) se
        // fige sur CETTE part au moment du dépôt, puis la palette revient
        // sur "Aucune" — une couleur ne sert qu'une fois.
        const modele = this.tuiles.find(t => t.id === data.tuileId);
        if (!modele) return;
        this.partsPlacees.splice(index, 0, { ...modele, couleur: this.couleurSelectionnee });
        this._selectionnerCouleur(null);
      } else if (data.source === 'placed' && data.zoneType === 'parts') {
        // Réordonnancement : on retire l'ancienne position, puis on
        // insère à la nouvelle (décalée de -1 si elle suivait l'ancienne).
        const [tuile] = this.partsPlacees.splice(data.index, 1);
        const indexAjuste = data.index < index ? index - 1 : index;
        this.partsPlacees.splice(indexAjuste, 0, tuile);
      } else if (data.source === 'placed' && data.zoneType === 'total') {
        // Déplace le total vers les parts, à l'endroit pointé.
        const tuile = this.totalPlace;
        this.totalPlace = null;
        this.partsPlacees.splice(index, 0, tuile);
      } else {
        return;
      }
      this._rendreZones();
    });
  }

  /** Segments réellement posés dans la barre (exclut le repère d'insertion). */
  _segmentsReels(zone) {
    return [...zone.children].filter(el => el !== this._indicateur);
  }

  /** Index d'insertion correspondant à la position horizontale du curseur :
   *  avant le premier segment dont le milieu est à sa droite. */
  _indexDepotParts(clientX) {
    if (this.partsPlacees.length === 0) return 0;
    const enfants = this._segmentsReels(this.zoneParts);
    for (let i = 0; i < enfants.length; i++) {
      const rect = enfants[i].getBoundingClientRect();
      if (clientX < rect.left + rect.width / 2) return i;
    }
    return enfants.length;
  }

  _afficherIndicateur(clientX) {
    const index = this._indexDepotParts(clientX);
    const enfants = this._segmentsReels(this.zoneParts);
    this.zoneParts.insertBefore(this._indicateur, enfants[index] || null);
  }

  _masquerIndicateur() {
    if (this._indicateur.parentNode) this._indicateur.remove();
  }

  _rendreZones() {
    this._afficherResultatValidation(null); // toute modification invalide le résultat affiché
    this.zoneTotal.innerHTML = '';
    this.zoneTotal.appendChild(
      this.totalPlace ? this._creerSegmentPlace(this.totalPlace, 'total', 0) : this._creerSegmentVide()
    );

    this.zoneParts.innerHTML = '';
    if (this.partsPlacees.length === 0) {
      this.zoneParts.appendChild(this._creerSegmentVide());
    } else {
      this.partsPlacees.forEach((tuile, index) => {
        this.zoneParts.appendChild(this._creerSegmentPlace(tuile, 'parts', index));
      });
    }

    this._rendreHabillageRepetition();

    typesetMathJax([this.zoneTotal, this.zoneParts, this.elBadge]);
  }

  /** Badge "×n" + flèche double au-dessus du groupe répété, comme le vrai
   *  schéma (rendreSchema, app.js) — affichés seulement une fois le compte
   *  saisi (double-clic sur le "..."), ET seulement si les deux tuiles
   *  voisines portent la MÊME valeur : sans ça, ce n'est pas un vrai
   *  groupe répété (ex: valeurPart des deux côtés), donc pas d'habillage.
   *  Le "..." lui-même reste toujours "...", l'input n'est qu'un passage
   *  (voir _editerCompteEllipsis) : c'est ce badge qui porte le nombre,
   *  pas la case elle-même.
   *  Portée EXACTE de l'habillage : du DÉBUT de la case précédant les
   *  trois points jusqu'à la FIN de celle qui les suit (3 cases), quelle
   *  que soit sa position dans la rangée — d'où le décalage à gauche
   *  (marginLeft) en plus de la largeur. */
  _rendreHabillageRepetition() {
    const total = this.partsPlacees.length;
    const ie = this.partsPlacees.findIndex(t => t.ellipsis);
    const compte = ie !== -1 ? this.partsPlacees[ie].compte : null;
    const avant = ie !== -1 ? this.partsPlacees[ie - 1] : null;
    const apres = ie !== -1 ? this.partsPlacees[ie + 1] : null;
    const extremesIdentiques = !!avant && !!apres && avant.latex === apres.latex;
    if (ie === -1 || !compte || !extremesIdentiques) {
      this.elBadge.style.display = 'none';
      this.elFleche.style.display = 'none';
      return;
    }

    const debut = Math.max(ie - 1, 0);
    const fin = Math.min(ie + 1, total - 1);
    const decalagePct = (debut / total) * 100;
    const largeurPct = ((fin - debut + 1) / total) * 100;

    this.elBadge.style.display = '';
    this.elFleche.style.display = '';
    this.elBadge.style.marginLeft = `${decalagePct}%`;
    this.elBadge.style.width = `${largeurPct}%`;
    this.elFleche.style.marginLeft = `${decalagePct}%`;
    this.elFleche.style.width = `${largeurPct}%`;
    ecrireLatex(this.elBadge, `\\times ${compte}`);
  }

  _creerSegmentVide() {
    const seg = document.createElement('div');
    seg.className = 'schema-segment construction-segment-vide';
    seg.textContent = 'Dépose ici';
    return seg;
  }

  /** Segment déjà posé : redraggable pour le retirer — le déposer EN
   *  DEHORS des deux barres (là où rien n'écoute "drop") laisse le
   *  navigateur à dropEffect 'none' au dragend, ce qui déclenche le
   *  retrait ; le reposer sur une des deux barres (dropEffect 'copy',
   *  fixé par _brancherDropZone) ne fait rien. Un "..." se double-clique
   *  pour saisir son compte (voir _editerCompteEllipsis). */
  _creerSegmentPlace(tuile, zoneType, index) {
    const seg = document.createElement('div');
    seg.className = 'schema-segment';
    seg.draggable = true;
    if (tuile.couleur) seg.style.backgroundColor = tuile.couleur;
    this._afficherContenuSegment(seg, tuile);
    seg.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', JSON.stringify({ source: 'placed', zoneType, index }));
      e.dataTransfer.setDragImage(this._imageDragVide, 0, 0);
      seg.classList.add('en-glisser');
      this._demarrerFantome(tuile, e.clientX, e.clientY);
    });
    seg.addEventListener('dragend', (e) => {
      seg.classList.remove('en-glisser');
      const echoue = e.dataTransfer.dropEffect === 'none';
      this._terminerFantome(echoue);
      if (echoue) {
        if (zoneType === 'total') this.totalPlace = null;
        else this.partsPlacees.splice(index, 1);
        this._rendreZones();
      }
    });
    if (tuile.ellipsis) {
      seg.addEventListener('dblclick', () => this._editerCompteEllipsis(seg, tuile));
    }
    seg.addEventListener('click', () => this._colorierAuClic(tuile, index));
    return seg;
  }

  /** Clic sur une part déjà posée, avec une couleur choisie dans la
   *  palette : l'applique à cette tuile — et, pour un "...", aussi aux
   *  deux tuiles voisines (le même groupe que le badge/la flèche, voir
   *  _rendreHabillageRepetition), pour teindre le groupe répété en un
   *  clic plutôt que tuile par tuile. Sans couleur sélectionnée : rien. */
  _colorierAuClic(tuile, index) {
    if (!this.couleurSelectionnee) return;
    tuile.couleur = this.couleurSelectionnee;
    if (tuile.ellipsis) {
      const avant = this.partsPlacees[index - 1];
      const apres = this.partsPlacees[index + 1];
      if (avant) avant.couleur = this.couleurSelectionnee;
      if (apres) apres.couleur = this.couleurSelectionnee;
    }
    this._selectionnerCouleur(null);
    this._rendreZones();
  }

  /** Appelée quand l'élève donne sa valeur au "..." (voir
   *  _editerCompteEllipsis) : si les deux tuiles voisines portent la
   *  MÊME valeur (condition d'un vrai groupe répété — sinon
   *  _rendreHabillageRepetition n'affichera de toute façon rien),
   *  synchronise leur couleur avec celle du "..." :
   *  - "..." coloré, voisines sans couleur -> les voisines prennent sa couleur.
   *  - voisines colorées à l'identique, "..." sans couleur -> il prend leur couleur.
   *  - tout autre cas (couleurs différentes, tout coloré, tout neutre...) :
   *    rien ne change, pas de règle évidente à appliquer. */
  _synchroniserCouleursGroupe(tuile) {
    const ie = this.partsPlacees.indexOf(tuile);
    const avant = this.partsPlacees[ie - 1];
    const apres = this.partsPlacees[ie + 1];
    if (!avant || !apres || avant.latex !== apres.latex) return;

    if (tuile.couleur && !avant.couleur && !apres.couleur) {
      avant.couleur = tuile.couleur;
      apres.couleur = tuile.couleur;
    } else if (!tuile.couleur && avant.couleur && avant.couleur === apres.couleur) {
      tuile.couleur = avant.couleur;
    }
  }

  /** Contenu normal d'une case : toujours tuile.latex, même pour un "..."
   *  dont le compte a été saisi — ce nombre s'affiche sur le badge
   *  au-dessus (_rendreHabillageRepetition), jamais dans la case elle-même. */
  _afficherContenuSegment(seg, tuile) {
    ecrireLatex(seg, tuile.latex);
  }

  /** Double-clic sur un "..." posé : remplace TEMPORAIREMENT les points
   *  par un champ où saisir le nombre TOTAL de répétitions (tuiles
   *  extrêmes comprises — ex: [première, "...", dernière] avec un total
   *  de 8 parts s'écrit 8, pas 6). Ce n'est qu'un passage : validé
   *  (Entrée ou perte de focus), la case revient aux points, et le nombre
   *  saisi apparaît sur le badge "×n" au-dessus du groupe, comme le vrai
   *  schéma. */
  _editerCompteEllipsis(seg, tuile) {
    seg.draggable = false;
    seg.innerHTML = '';
    const input = document.createElement('input');
    input.type = 'text';
    input.inputMode = 'numeric';
    input.className = 'construction-input-compte';
    input.value = tuile.compte || '';
    input.placeholder = '…';
    seg.appendChild(input);
    input.focus();
    input.select();

    const valider = () => {
      const valeur = input.value.trim();
      tuile.compte = valeur || null;
      // Au moment où on donne sa valeur au "...", on synchronise sa
      // couleur avec ses voisines si elles forment un vrai groupe répété
      // (voir _synchroniserCouleursGroupe) — ça touche potentiellement
      // leur affichage aussi, d'où un _rendreZones() complet plutôt qu'une
      // mise à jour ciblée de seg/badge.
      if (tuile.compte) this._synchroniserCouleursGroupe(tuile);
      this._rendreZones();
    };
    input.addEventListener('blur', valider);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); input.blur(); }
    });
    input.addEventListener('click', (e) => e.stopPropagation());
    input.addEventListener('mousedown', (e) => e.stopPropagation());
  }

  /** Snapshot figé (non interactif) de la carte-schéma telle que l'élève
   *  l'a construite et validée — ordre des parts, couleurs et groupe
   *  répété compris. cloneNode(true) supprime au passage les listeners de
   *  glisser-déposer, sans quoi la carte "validée" resterait modifiable.
   *  Appelée par app.js (rendreProbleme) à la place de rendreSchema() une
   *  fois schemaConstruitValide : le schéma canonique peut présenter les
   *  parts dans un ordre différent de celui choisi par l'élève. */
  figerCarte() {
    return this.schemaCarte.cloneNode(true);
  }

  _reinitialiser() {
    this.partsPlacees = [];
    this.totalPlace = null;
    this._rendreZones();
  }

  /** Magnitude numérique d'une tuile (voir _genererTuiles : chaque tuile
   *  porte sa Grandeur, y compris "x" qui porte probleme.inconnue). */
  _magnitude(tuile) {
    return magnitude(tuile.grandeur);
  }

  /** Validation volontairement simple : la somme des parts (le "..."
   *  compté pour compte × la valeur de sa voisine, PAS pour sa propre
   *  case ni en comptant deux fois les deux tuiles voisines déjà prises
   *  en compte individuellement) doit égaler le total, ET chaque tuile de
   *  la réserve doit avoir été utilisée au moins une fois (posée quelque
   *  part, parts ou total). */
  _valider() {
    const tousUtilises = this.tuiles.every(modele =>
      this.partsPlacees.some(t => t.id === modele.id) ||
      (this.totalPlace && this.totalPlace.id === modele.id)
    );

    const ie = this.partsPlacees.findIndex(t => t.ellipsis);
    const indicesExclus = new Set();
    let sommeParts = 0;

    if (ie !== -1) {
      indicesExclus.add(ie);
      const avant = this.partsPlacees[ie - 1];
      const apres = this.partsPlacees[ie + 1];
      const compte = this.partsPlacees[ie].compte;
      const voisin = avant || apres;
      if (avant) indicesExclus.add(ie - 1);
      if (apres) indicesExclus.add(ie + 1);
      if (compte && voisin) sommeParts += Number(compte) * this._magnitude(voisin);
    }

    this.partsPlacees.forEach((tuile, index) => {
      if (indicesExclus.has(index)) return;
      sommeParts += this._magnitude(tuile);
    });

    const sommeTotal = this.totalPlace ? this._magnitude(this.totalPlace) : NaN;
    const sommesEgales = Math.abs(sommeParts - sommeTotal) < 1e-9;

    const valide = tousUtilises && sommesEgales;
    this._afficherResultatValidation(valide);
    if (valide && this.onValide) this.onValide();
  }

  /** valide: true -> succès, false -> erreur, null -> efface (rendu/reset). */
  _afficherResultatValidation(valide) {
    if (valide === null) {
      this.elFeedback.textContent = '';
      this.elFeedback.className = 'construction-feedback';
      return;
    }
    this.elFeedback.textContent = valide
      ? 'Bravo, ce schéma correspond à l\'énoncé !'
      : "Ce n'est pas encore ça — vérifie que toutes les tuiles sont utilisées et que le total correspond.";
    this.elFeedback.className = 'construction-feedback ' + (valide ? 'succes' : 'erreur');
  }

  _installerCSS() {
    if (document.getElementById('construction-schema-css')) return;
    const style = document.createElement('style');
    style.id = 'construction-schema-css';
    style.textContent = `
      .construction-inline{
        width:100%;
        max-width:var(--contenu-largeur, 700px);
        background:var(--papier-encart, #fff);
        border:2px solid var(--craie, #7d3358);
        border-radius:var(--rayon, 6px);
        padding:18px 24px;
      }

      .construction-section-label{
        font-size:11.5px;
        font-weight:600;
        color:var(--encre-douce, #6b5b62);
        text-transform:uppercase;
        letter-spacing:0.04em;
        margin-bottom:8px;
      }

      .construction-rangee{
        display:flex;
        gap:24px;
        align-items:flex-start;
      }

      .construction-colonne-tuiles{ flex:1 1 auto; min-width:0; }
      .construction-colonne-couleurs{ flex:0 0 auto; }

      .construction-palette{
        display:flex;
        gap:10px;
        margin-bottom:20px;
      }

      .construction-couleur-btn{
        width:32px;
        height:32px;
        border-radius:50%;
        border:2px solid var(--grille-forte, #2c2226);
        cursor:pointer;
        padding:0;
      }

      /* "Aucune" : option explicite, pas une case vide — un cercle
         barré pour se distinguer d'un vrai blanc/vide. */
      .construction-couleur-aucune{
        background:var(--papier, #fff);
        border-style:dashed;
        position:relative;
      }

      .construction-couleur-aucune::after{
        content:'';
        position:absolute;
        top:50%; left:15%;
        width:70%;
        height:2px;
        background:var(--erreur, #c44336);
        transform:rotate(-45deg);
        transform-origin:center;
      }

      .construction-couleur-btn.active{
        outline:3px solid var(--craie, #7d3358);
        outline-offset:2px;
      }

      /* Réserve de tuiles : mêmes cases que le schéma (schema-segment)
         mais en vrac, pas dans une barre flex qui les ferait partager
         l'espace — chacune garde sa taille naturelle. */
      .construction-tray{
        display:flex;
        flex-wrap:wrap;
        gap:10px;
        padding:14px;
        margin-bottom:20px;
        background:var(--papier-panel, #f7f2f5);
        border-radius:6px;
        min-height:52px;
      }

      /* Les règles .schema-parts/.schema-total .schema-segment de
         style.css sont scopées à ces parents : ici, sous .construction-tray,
         aucune ne s'applique — on refixe donc la même police/couleur/bordure
         "classique" que le vrai segment (juste la taille diffère, puisque
         ce n'est pas une case qui partage une barre avec ses voisines). */
      .construction-tray .schema-segment{
        flex:0 0 auto;
        display:flex;
        align-items:center;
        justify-content:center;
        min-width:52px;
        height:46px;
        padding:0 18px;
        border-radius:6px;
        border:2px solid var(--grille-forte, #2c2226);
        background:var(--papier-panel, #f7f2f5);
        font-family:'JetBrains Mono', monospace;
        font-weight:700;
        font-size:16px;
        cursor:grab;
        user-select:none;
      }

      .construction-tray .schema-segment:active{ cursor:grabbing; }

      .construction-dropzone{ transition: border-color 0.15s, background-color 0.15s; }

      .construction-dropzone.survol{
        border-color:var(--craie, #7d3358);
        background:var(--accent-clair, #f3e6ed);
      }

      .construction-dropzone .schema-segment{ cursor:grab; }
      .construction-dropzone .schema-segment:active{ cursor:grabbing; }

      .construction-segment-vide{
        color:var(--encre-douce, #6b5b62);
        font-style:italic;
        font-weight:500;
        font-size:13px;
        cursor:default;
      }

      .construction-indicateur{
        flex:0 0 3px;
        align-self:stretch;
        background:var(--craie, #7d3358);
        border-radius:2px;
      }

      /* Retour visuel pendant le glisser, à la place du fantôme natif
         (désactivé via setDragImage — voir _imageDragVide) qui sinon
         "revient" en arrière quand le drop échoue, avant que la tuile ne
         soit réellement retirée. */
      .schema-segment.en-glisser{ opacity:0.35; }

      /* Fantôme qui suit la souris pendant le glisser (voir
         _demarrerFantome/_deplacerFantome/_terminerFantome) — indépendant
         des règles .schema-parts/.schema-total/.construction-tray
         .schema-segment (scopées à ces parents), donc son propre style
         complet. */
      .construction-fantome{
        position:fixed;
        top:0; left:0;
        transform:translate(-50%, -50%);
        pointer-events:none;
        z-index:2000000;
        display:flex;
        align-items:center;
        justify-content:center;
        min-width:52px;
        height:46px;
        padding:0 18px;
        border-radius:6px;
        border:2px solid var(--grille-forte, #2c2226);
        background:var(--papier-panel, #f7f2f5);
        font-family:'JetBrains Mono', monospace;
        font-weight:700;
        font-size:16px;
        color:var(--encre, #2c2226);
        box-shadow:0 4px 12px rgba(44,34,38,0.25);
        transition: opacity 0.2s ease, transform 0.2s ease;
      }

      .construction-fantome.disparait{
        opacity:0;
        transform:translate(-50%, -50%) scale(0.4);
      }

      .construction-input-compte{
        width:48px;
        text-align:center;
        font-family:'JetBrains Mono', monospace;
        font-weight:700;
        font-size:16px;
        border:1px solid var(--craie, #7d3358);
        border-radius:4px;
        padding:4px 2px;
        background:var(--papier, #fff);
        color:var(--encre, #2c2226);
      }

      .construction-actions{
        display:flex;
        gap:10px;
        margin-top:8px;
      }

      .construction-actions .panel-btn{ width:auto; flex:0 0 auto; }

      .construction-feedback{
        margin-top:12px;
        min-height:18px;
        font-size:13.5px;
        font-weight:600;
      }

      .construction-feedback.erreur{ color:var(--erreur, #c44336); }
      .construction-feedback.succes{ color:var(--succes, #2e9e5b); }
    `;
    document.head.appendChild(style);
  }
}
