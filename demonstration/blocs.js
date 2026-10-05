/* ============================================================
   BLOCS BLOCKLY : Démonstration / Étape / Informations / Propriétés
   ============================================================ */

// Noms des droites de l'exercice affiché (alimente les choix de l'overlay).
let droitesCourantes = [];

const COULEURS = {
    demonstration: 120,
    etape: 210,
    perp: 20,
    para: 170,
    propriete: 290
};

Blockly.Blocks['demonstration'] = {
    init: function () {
        this.appendDummyInput().appendField('Démonstration');
        this.appendStatementInput('ETAPES').setCheck('Etape');
        this.setColour(COULEURS.demonstration);
        this.setDeletable(false);
        this.setTooltip('Accroche ici tes étapes, dans l\'ordre.');
    }
};

// Titre d'étape dessiné comme un bouton (pastille colorée + ▾) : un clic ouvre les
// choix Dupliquer / Supprimer.
const TITRE_L = 104, TITRE_H = 26;
function imageTitre(texte) {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TITRE_L}" height="${TITRE_H}">` +
        `<rect x="0.5" y="0.5" width="${TITRE_L - 1}" height="${TITRE_H - 1}" rx="12" fill="#ffd166" stroke="#c99a1e"/>` +
        `<text x="${TITRE_L / 2 - 6}" y="18" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" ` +
        `font-size="14" font-weight="700" fill="#3a2f0b">${texte}</text>` +
        `<text x="${TITRE_L - 14}" y="18" text-anchor="middle" font-size="11" fill="#3a2f0b">▼</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

Blockly.Blocks['etape'] = {
    init: function () {
        // Entrées en ligne, avec des fins de ligne forcées :
        // Étape / On a : [ ] et [ ] / Or : [ ] / Donc : [ ]
        this.titre = 'Étape';
        this.appendEndRowInput().appendField(new Blockly.FieldImage(imageTitre('Étape'), TITRE_L, TITRE_H, 'Étape',
            champ => choixPourEtape(champ.getSourceBlock())), 'NUM');
        this.appendValueInput('FAIT1').setCheck('Fait').appendField('On a :');
        this.appendValueInput('FAIT2').setCheck('Fait').appendField('et');
        this.appendEndRowInput();
        this.appendValueInput('PROP').setCheck('Propriete').appendField('Or :');
        this.appendEndRowInput();
        this.appendValueInput('CONCL').setCheck('Fait').appendField('Donc :');
        this.setInputsInline(true);
        this.setPreviousStatement(true, 'Etape');
        this.setNextStatement(true, 'Etape');
        this.setColour(COULEURS.etape);
        this.setTooltip('Une étape : deux informations connues, une propriété du cours, une conclusion.');
    }
};

// Bloc « information » : les deux droites sont choisies dans l'overlay et gardées dans
// block.data ("d1|d3") ; les libellés ne servent qu'à l'affichage.
function definirBlocFait(type, symbole, couleur, aide) {
    Blockly.Blocks['fait_' + type] = {
        init: function () {
            this.appendDummyInput()
                .appendField(new Blockly.FieldLabelSerializable(''), 'A_TXT')
                .appendField(symbole)
                .appendField(new Blockly.FieldLabelSerializable(''), 'B_TXT');
            this.setInputsInline(true);
            this.setOutput(true, 'Fait');
            this.setColour(couleur);
            this.setTooltip(aide);
        }
    };
}
definirBlocFait('perp', '⊥', COULEURS.perp, 'Les deux droites sont perpendiculaires.');
definirBlocFait('para', '//', COULEURS.para, 'Les deux droites sont parallèles.');

// Cases vides : un clic dessus ouvre l'overlay de choix.
function definirCaseVide(type, check, texte) {
    Blockly.Blocks[type] = {
        init: function () {
            this.appendDummyInput().appendField(texte);
            this.setOutput(true, check);
            this.setColour('#7d8f84');
            this.setTooltip('Clique pour choisir.');
        }
    };
}
definirCaseVide('case_fait', 'Fait', '  clique ici  ');
definirCaseVide('case_prop', 'Propriete', '  clique ici pour choisir la propriété  ');

Object.entries(PROPRIETES).forEach(([cle, prop]) => {
    Blockly.Blocks['propriete_' + cle] = {
        init: function () {
            prop.lignes.forEach(l => this.appendDummyInput().appendField(l));
            this.setOutput(true, 'Propriete');
            this.setColour(COULEURS.propriete);
            this.setTooltip(prop.lignes.join(' '));
        }
    };
});

/* ---------- Workspace (sans palette : les choix se font dans un overlay) ---------- */

const workspace = Blockly.inject('blocklyDiv', {
    trashcan: false,
    zoom: { controls: true, startScale: 1.1 },
    media: 'https://unpkg.com/blockly/media/'
});

// Zoom des blocs proportionnel à la taille de base de la page (qui suit la fenêtre).
function echellePage() {
    return parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
}
function ajusterZoomBlocs() {
    workspace.setScale(1.1 * echellePage());
}
ajusterZoomBlocs();
window.addEventListener('resize', ajusterZoomBlocs);
// La zone suit la hauteur de la colonne figure (qui grandit quand GeoGebra est chargé).
new ResizeObserver(() => Blockly.svgResize(workspace)).observe(document.getElementById('blocklyDiv'));

// Blocs figés : ni déplacés, ni supprimés, ni dupliqués (tout passe par l'overlay).
function figer(bloc) {
    bloc.setMovable(false);
    bloc.setDeletable(false);
    bloc.contextMenu = false;
}

function nouveauBloc(type) {
    const b = workspace.newBlock(type);
    b.initSvg();
    b.render();
    figer(b);
    return b;
}

const ENTREES_FAIT = ['FAIT1', 'FAIT2', 'CONCL'];

// Met une case vide dans chaque entrée libre de l'étape.
function remplirCasesVides(etape) {
    ['FAIT1', 'FAIT2', 'PROP', 'CONCL'].forEach(nom => {
        const entree = etape.getInput(nom);
        if (entree.connection.targetBlock()) return;
        const c = nouveauBloc(nom === 'PROP' ? 'case_prop' : 'case_fait');
        entree.connection.connect(c.outputConnection);
    });
}

function poserDansEntree(etape, nom, bloc) {
    const entree = etape.getInput(nom);
    const ancien = entree.connection.targetBlock();
    if (ancien) ancien.dispose(false);
    entree.connection.connect(bloc.outputConnection);
}

function blocFait(type, a, b) {
    const bloc = nouveauBloc('fait_' + type);
    bloc.data = `${a}|${b}`;
    bloc.setFieldValue(nomAffiche(a), 'A_TXT');
    bloc.setFieldValue(nomAffiche(b), 'B_TXT');
    return bloc;
}

function ajouterEtape() {
    const etape = nouveauBloc('etape');
    remplirCasesVides(etape);
    const accrochees = etapesAccrochees();
    const conn = accrochees.length
        ? accrochees[accrochees.length - 1].nextConnection
        : blocRacine().getInput('ETAPES').connection;
    conn.connect(etape.previousConnection);
    numeroterEtapes();
    return etape;
}

// Copie de l'étape (cases remplies comprises), placée juste en dessous.
function dupliquerEtape(etape) {
    const json = Blockly.serialization.blocks.save(etape, { addNextBlocks: false });
    const copie = Blockly.serialization.blocks.append(json, workspace);
    copie.getDescendants(false).forEach(figer);
    const suivante = etape.nextConnection.targetBlock();
    if (suivante) suivante.previousConnection.disconnect();
    etape.nextConnection.connect(copie.previousConnection);
    if (suivante) copie.nextConnection.connect(suivante.previousConnection);
    numeroterEtapes();
}

function supprimerEtape(etape) {
    etape.unplug(true); // les étapes suivantes remontent
    etape.dispose(false);
    if (!etapesAccrochees().length) ajouterEtape();
    numeroterEtapes();
}

function blocRacine() {
    return workspace.getTopBlocks(false).find(b => b.type === 'demonstration');
}

function etapesAccrochees() {
    const liste = [];
    const racine = blocRacine();
    let b = racine ? racine.getInputTargetBlock('ETAPES') : null;
    while (b) {
        if (b.type === 'etape') liste.push(b);
        b = b.getNextBlock();
    }
    return liste;
}

// Numérote les étapes accrochées ("Étape 1", "Étape 2"...) ; une étape libre
// est signalée comme non accrochée.
function numeroterEtapes() {
    const accrochees = etapesAccrochees();
    workspace.getAllBlocks(false).filter(b => b.type === 'etape').forEach(b => {
        const i = accrochees.indexOf(b);
        const titre = i >= 0 ? `Étape ${i + 1}` : 'Étape';
        if (b.titre === titre) return;
        b.titre = titre;
        b.setFieldValue(imageTitre(titre), 'NUM');
    });
}

// Mêmes couleurs que les codages de la figure : vert pour ce qu'on a (« On a », « et »),
// rouge pour ce qu'on conclut (« Donc »).
const COULEUR_ON_A = '#2f9e44';
const COULEUR_DONC = '#c0392b';

function colorerFaits() {
    workspace.getAllBlocks(false).filter(b => b.type.startsWith('fait_')).forEach(b => {
        const parent = b.getParent();
        const entree = parent && parent.getInputWithBlock(b);
        const couleur = entree && entree.name === 'CONCL' ? COULEUR_DONC : COULEUR_ON_A;
        if (b.getColour().toLowerCase() !== couleur) b.setColour(couleur);
    });
}

workspace.addChangeListener(e => {
    if (e.isUiEvent) return;
    numeroterEtapes();
    colorerFaits();
    workspace.getAllBlocks(false).forEach(b => b.setWarningText(null));
});

function lireFait(bloc) {
    if (!bloc || !bloc.type.startsWith('fait_') || !bloc.data) return null;
    const [a, b] = bloc.data.split('|');
    return { type: bloc.type === 'fait_perp' ? 'perp' : 'para', a, b };
}

function lireEtapes() {
    return etapesAccrochees().map(b => {
        const prop = b.getInputTargetBlock('PROP');
        return {
            bloc: b,
            f1: lireFait(b.getInputTargetBlock('FAIT1')),
            f2: lireFait(b.getInputTargetBlock('FAIT2')),
            prop: prop && prop.type.startsWith('propriete_') ? prop.type.replace('propriete_', '') : null,
            concl: lireFait(b.getInputTargetBlock('CONCL'))
        };
    });
}

// Point de départ d'un exercice : le bloc Démonstration avec une étape vide accrochée.
function espaceDeTravailInitial() {
    workspace.clear();
    const racine = nouveauBloc('demonstration');
    const vue = workspace.getMetricsManager().getViewMetrics(true);
    racine.moveBy(vue.left + 20, vue.top + 20);
    ajouterEtape();
}

/* ---------- Overlay de choix ---------- */

const overlayChoix = document.createElement('div');
overlayChoix.className = 'overlay-fond';
overlayChoix.innerHTML = `
    <div class="overlay-carte carte-choix">
        <button type="button" class="overlay-fermer" aria-label="Fermer">×</button>
        <h2></h2>
        <div class="choix-contenu"></div>
    </div>`;
document.body.appendChild(overlayChoix);
overlayChoix.querySelector('.overlay-fermer').onclick = fermerChoix;
overlayChoix.addEventListener('click', e => { if (e.target === overlayChoix) fermerChoix(); });
document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && overlayChoix.classList.contains('visible')) fermerChoix();
});

function fermerChoix() {
    overlayChoix.classList.remove('visible');
}

function boutonChoix(html, classe, action) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-choix ' + classe;
    btn.innerHTML = html;
    btn.onclick = () => { fermerChoix(); action(); };
    return btn;
}

function ouvrirChoix(titre, elements) {
    overlayChoix.querySelector('h2').textContent = titre;
    const zone = overlayChoix.querySelector('.choix-contenu');
    zone.innerHTML = '';
    elements.forEach(el => zone.appendChild(el));
    overlayChoix.classList.add('visible');
}

const TITRES = { FAIT1: 'On a :', FAIT2: 'et', PROP: 'Or :', CONCL: 'Donc :' };

function choixPourEntree(etape, nom) {
    const elements = [];
    const rempli = !etape.getInput(nom).connection.targetBlock().type.startsWith('case_');

    if (nom === 'PROP') {
        const liste = document.createElement('div');
        liste.className = 'choix-proprietes';
        Object.entries(PROPRIETES).forEach(([cle, prop]) => {
            liste.appendChild(boutonChoix(prop.lignes.join('<br>'), 'propriete',
                () => poserDansEntree(etape, nom, nouveauBloc('propriete_' + cle))));
        });
        elements.push(liste);
    } else {
        // Toutes les paires de droites, en deux colonnes : ⊥ et //.
        const paires = [];
        droitesCourantes.forEach((a, i) => droitesCourantes.slice(i + 1).forEach(b => paires.push([a, b])));
        const grille = document.createElement('div');
        grille.className = 'choix-faits';
        [['perp', '⊥'], ['para', '//']].forEach(([type, symbole]) => {
            const col = document.createElement('div');
            col.className = 'colonne-faits';
            paires.forEach(([a, b]) => {
                const texte = versHtml(`${nomAffiche(a)} ${symbole} ${nomAffiche(b)}`);
                col.appendChild(boutonChoix(texte, nom === 'CONCL' ? 'donc' : 'on-a',
                    () => poserDansEntree(etape, nom, blocFait(type, a, b))));
            });
            grille.appendChild(col);
        });
        elements.push(grille);
    }

    if (rempli) {
        elements.push(boutonChoix('Retirer', 'retirer', () => {
            poserDansEntree(etape, nom, nouveauBloc(nom === 'PROP' ? 'case_prop' : 'case_fait'));
        }));
    }
    ouvrirChoix(TITRES[nom], elements);
}

function choixPourEtape(etape) {
    const elements = [boutonChoix('Dupliquer cette étape', 'dupliquer', () => dupliquerEtape(etape))];
    if (etapesAccrochees().length > 1) {
        elements.push(boutonChoix('Supprimer cette étape', 'retirer', () => supprimerEtape(etape)));
    }
    ouvrirChoix(etape.titre, elements);
}

// Un clic sur une case (vide ou remplie) ouvre ses choix (le titre d'étape a son propre clic).
workspace.addChangeListener(e => {
    if (e.type !== Blockly.Events.CLICK || !e.blockId) return;
    const bloc = workspace.getBlockById(e.blockId);
    if (!bloc) return;
    const parent = bloc.getParent();
    if (!parent || parent.type !== 'etape') return;
    const entree = parent.getInputWithBlock(bloc);
    if (entree) choixPourEntree(parent, entree.name);
});
