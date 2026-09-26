/* ============================================================
   BLOCS BLOCKLY : Démonstration / Étape / Informations / Propriétés
   ============================================================ */

// Noms des droites de l'exercice affiché (alimente les menus déroulants).
let droitesCourantes = [];

function menuDroites() {
    return droitesCourantes.length
        ? droitesCourantes.map(n => [nomAffiche(n), n])
        : [['( )', '']];
}

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

Blockly.Blocks['etape'] = {
    init: function () {
        this.appendDummyInput().appendField(new Blockly.FieldLabel('Étape'), 'NUM');
        this.appendValueInput('FAIT1').setCheck('Fait').appendField('On a :');
        this.appendValueInput('FAIT2').setCheck('Fait').appendField('et');
        this.appendValueInput('PROP').setCheck('Propriete').appendField('Or :');
        this.appendValueInput('CONCL').setCheck('Fait').appendField('Donc :');
        this.setInputsInline(false);
        this.setPreviousStatement(true, 'Etape');
        this.setNextStatement(true, 'Etape');
        this.setColour(COULEURS.etape);
        this.setTooltip('Une étape : deux informations connues, une propriété du cours, une conclusion.');
    }
};

function definirBlocFait(type, symbole, couleur, aide) {
    Blockly.Blocks['fait_' + type] = {
        init: function () {
            this.appendDummyInput()
                .appendField(new Blockly.FieldDropdown(menuDroites), 'A')
                .appendField(symbole)
                .appendField(new Blockly.FieldDropdown(menuDroites), 'B');
            this.setInputsInline(true);
            this.setOutput(true, 'Fait');
            this.setColour(couleur);
            this.setTooltip(aide);
        }
    };
}
definirBlocFait('perp', '⊥', COULEURS.perp, 'Les deux droites sont perpendiculaires.');
definirBlocFait('para', '//', COULEURS.para, 'Les deux droites sont parallèles.');

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

/* ---------- Workspace ---------- */

const TOOLBOX = {
        kind: 'flyoutToolbox',
        contents: [
            { kind: 'label', text: 'Étape' },
            { kind: 'block', type: 'etape' },
            { kind: 'label', text: 'Informations' },
            { kind: 'block', type: 'fait_perp' },
            { kind: 'block', type: 'fait_para' },
            { kind: 'label', text: 'Propriétés du cours' },
            { kind: 'block', type: 'propriete_P1' },
            { kind: 'block', type: 'propriete_P2' },
            { kind: 'block', type: 'propriete_P3' }
        ]
};

const workspace = Blockly.inject('blocklyDiv', {
    toolbox: TOOLBOX,
    trashcan: true,
    zoom: { controls: true, startScale: 0.9 },
    media: 'https://unpkg.com/blockly/media/'
});

// Les menus de la palette sont figés à sa création : on la reconstruit quand
// l'exercice (donc la liste des droites) change.
function rafraichirPalette() {
    workspace.updateToolbox(TOOLBOX);
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
        b.setFieldValue(i >= 0 ? `Étape ${i + 1}` : 'Étape (non accrochée)', 'NUM');
    });
}

workspace.addChangeListener(e => {
    if (e.isUiEvent) return;
    numeroterEtapes();
    workspace.getAllBlocks(false).forEach(b => b.setWarningText(null));
});

function lireFait(bloc) {
    if (!bloc) return null;
    const a = bloc.getFieldValue('A');
    const b = bloc.getFieldValue('B');
    if (!a || !b) return null;
    return { type: bloc.type === 'fait_perp' ? 'perp' : 'para', a, b };
}

function lireEtapes() {
    return etapesAccrochees().map(b => {
        const prop = b.getInputTargetBlock('PROP');
        return {
            bloc: b,
            f1: lireFait(b.getInputTargetBlock('FAIT1')),
            f2: lireFait(b.getInputTargetBlock('FAIT2')),
            prop: prop ? prop.type.replace('propriete_', '') : null,
            concl: lireFait(b.getInputTargetBlock('CONCL'))
        };
    });
}

// Point de départ d'un exercice : le bloc Démonstration avec une étape vide accrochée.
function espaceDeTravailInitial() {
    workspace.clear();
    const racine = workspace.newBlock('demonstration');
    racine.initSvg();
    racine.render();
    // En haut à gauche de la zone visible (à droite de la palette).
    const vue = workspace.getMetricsManager().getViewMetrics(true);
    racine.moveBy(vue.left + 20, vue.top + 20);
    const etape = workspace.newBlock('etape');
    etape.initSvg();
    etape.render();
    racine.getInput('ETAPES').connection.connect(etape.previousConnection);
    numeroterEtapes();
}
