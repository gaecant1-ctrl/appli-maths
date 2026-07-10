/* ============================================================
   BLOCS BLOCKLY
   ============================================================ */

Blockly.Blocks['programme'] = {
    init: function() {
        this.appendDummyInput().appendField("Programme");
        this.appendStatementInput("DO").setCheck(null);
        this.setColour(290);
        this.setTooltip("Point de départ du programme.");
    }
};
Blockly.JavaScript.forBlock['programme'] = function(block) {
    return Blockly.JavaScript.statementToCode(block, 'DO');
};

Blockly.Blocks['point'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown(function() {
                return Object.keys(etiquettes).map(p => [p, p]);
            }), "POINT");
        this.setOutput(true);
        this.setColour(60);
        this.setTooltip("Pointe vers un point ou un objet déjà nommé.");
    }
};
Blockly.JavaScript.forBlock['point'] = function(block) {
    return ["'" + block.getFieldValue('POINT') + "'", Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.Blocks['objet_nomme'] = {
    init: function() {
        this.appendDummyInput()
            .appendField(new Blockly.FieldDropdown(function() {
                const noms = Object.keys(etiquettes).filter(nom => !['A', 'B', 'C'].includes(nom));
                return noms.length ? noms.map(p => [p, p]) : [["(aucun nom créé)", ""]];
            }), "NOM");
        this.setOutput(true);
        this.setColour(20);
        this.setTooltip("Accède directement à un objet par le nom qu'on lui a donné via \"nommer\".");
    }
};
Blockly.JavaScript.forBlock['objet_nomme'] = function(block) {
    return ["'" + block.getFieldValue('NOM') + "'", Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.Blocks['droite_ref'] = {
    init: function() {
        this.appendValueInput("P1").setCheck("Point").appendField("droite (");
        this.appendValueInput("P2").setCheck("Point").appendField(",");
        this.appendDummyInput().appendField(")");
        this.setInputsInline(true);
        this.setOutput(true, "Droite");
        this.setColour(230);
        this.setTooltip("Référence à la droite passant par deux points.");
    }
};
Blockly.JavaScript.forBlock['droite_ref'] = function(block) {
    var p1 = Blockly.JavaScript.valueToCode(block, 'P1', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var p2 = Blockly.JavaScript.valueToCode(block, 'P2', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return [`construire.refDroite(${p1}, ${p2})`, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.Blocks['segment_ref'] = {
    init: function() {
        this.appendValueInput("P1").setCheck("Point").appendField("segment [");
        this.appendValueInput("P2").setCheck("Point").appendField(",");
        this.appendDummyInput().appendField("]");
        this.setInputsInline(true);
        this.setOutput(true, "Segment");
        this.setColour(230);
        this.setTooltip("Référence au segment reliant deux points.");
    }
};
Blockly.JavaScript.forBlock['segment_ref'] = function(block) {
    var p1 = Blockly.JavaScript.valueToCode(block, 'P1', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var p2 = Blockly.JavaScript.valueToCode(block, 'P2', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return [`construire.refSegment(${p1}, ${p2})`, Blockly.JavaScript.ORDER_ATOMIC];
};

Blockly.Blocks['cercle_ref'] = {
    init: function() {
        this.appendValueInput("CENTRE").setCheck("Point").appendField("cercle (");
        this.appendValueInput("PAR").setCheck("Point").appendField(",");
        this.appendDummyInput().appendField(")");
        this.setInputsInline(true);
        this.setOutput(true, "Cercle");
        this.setColour(230);
        this.setTooltip("Référence au cercle de centre donné passant par un point.");
    }
};
Blockly.JavaScript.forBlock['cercle_ref'] = function(block) {
    var centre = Blockly.JavaScript.valueToCode(block, 'CENTRE', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var par = Blockly.JavaScript.valueToCode(block, 'PAR', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return [`construire.refCercle(${centre}, ${par})`, Blockly.JavaScript.ORDER_ATOMIC];
};

function creerBlocTracer(nom, config) {
    Blockly.Blocks[nom] = {
        init: function() {
            config.champs(this);
            this.setInputsInline(true);
            this.setPreviousStatement(true, null);
            this.setNextStatement(true, null);
            this.setColour(160);
            this.setTooltip(config.tooltip || "");
        }
    };
}

creerBlocTracer('tracer_droite', {
    champs: function(b) {
        b.appendValueInput("P1").setCheck("Point").appendField("tracer la droite passant par");
        b.appendValueInput("P2").setCheck("Point").appendField("et");
    },
    tooltip: "Trace la droite passant par deux points."
});
Blockly.JavaScript.forBlock['tracer_droite'] = function(block) {
    var p1 = Blockly.JavaScript.valueToCode(block, 'P1', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var p2 = Blockly.JavaScript.valueToCode(block, 'P2', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.tracerDroite(${p1}, ${p2});\n`;
};

creerBlocTracer('tracer_segment', {
    champs: function(b) {
        b.appendValueInput("P1").setCheck("Point").appendField("tracer le segment d'extrémités");
        b.appendValueInput("P2").setCheck("Point").appendField("et");
    },
    tooltip: "Trace le segment reliant deux points."
});
Blockly.JavaScript.forBlock['tracer_segment'] = function(block) {
    var p1 = Blockly.JavaScript.valueToCode(block, 'P1', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var p2 = Blockly.JavaScript.valueToCode(block, 'P2', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.tracerSegment(${p1}, ${p2});\n`;
};

creerBlocTracer('tracer_demidroite', {
    champs: function(b) {
        b.appendValueInput("ORIGINE").setCheck("Point").appendField("tracer la demi-droite d'origine");
        b.appendValueInput("PAR").setCheck("Point").appendField("passant par");
    },
    tooltip: "Trace la demi-droite d'origine donnée passant par un point."
});
Blockly.JavaScript.forBlock['tracer_demidroite'] = function(block) {
    var origine = Blockly.JavaScript.valueToCode(block, 'ORIGINE', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var par = Blockly.JavaScript.valueToCode(block, 'PAR', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.tracerDemiDroite(${origine}, ${par});\n`;
};

creerBlocTracer('tracer_cercle', {
    champs: function(b) {
        b.appendValueInput("CENTRE").setCheck("Point").appendField("tracer le cercle de centre");
        b.appendValueInput("PAR").setCheck("Point").appendField("passant par");
    },
    tooltip: "Trace le cercle de centre donné passant par un point."
});
Blockly.JavaScript.forBlock['tracer_cercle'] = function(block) {
    var centre = Blockly.JavaScript.valueToCode(block, 'CENTRE', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var par = Blockly.JavaScript.valueToCode(block, 'PAR', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.tracerCercle(${centre}, ${par});\n`;
};

creerBlocTracer('tracer_parallele', {
    champs: function(b) {
        b.appendValueInput("DROITE").setCheck("Droite").appendField("tracer la droite parallèle à");
        b.appendValueInput("POINT").setCheck("Point").appendField("passant par");
    },
    tooltip: "Trace la parallèle à une droite passant par un point."
});
Blockly.JavaScript.forBlock['tracer_parallele'] = function(block) {
    var droite = Blockly.JavaScript.valueToCode(block, 'DROITE', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var point = Blockly.JavaScript.valueToCode(block, 'POINT', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.tracerParallele(${droite}, ${point});\n`;
};

creerBlocTracer('tracer_perpendiculaire', {
    champs: function(b) {
        b.appendValueInput("DROITE").setCheck("Droite").appendField("tracer la droite perpendiculaire à");
        b.appendValueInput("POINT").setCheck("Point").appendField("passant par");
    },
    tooltip: "Trace la perpendiculaire à une droite passant par un point."
});
Blockly.JavaScript.forBlock['tracer_perpendiculaire'] = function(block) {
    var droite = Blockly.JavaScript.valueToCode(block, 'DROITE', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var point = Blockly.JavaScript.valueToCode(block, 'POINT', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.tracerPerpendiculaire(${droite}, ${point});\n`;
};

creerBlocTracer('tracer_mediatrice', {
    champs: function(b) {
        b.appendValueInput("SEGMENT").setCheck("Segment").appendField("tracer la médiatrice de");
    },
    tooltip: "Trace la médiatrice d'un segment."
});
Blockly.JavaScript.forBlock['tracer_mediatrice'] = function(block) {
    var segment = Blockly.JavaScript.valueToCode(block, 'SEGMENT', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.tracerMediatrice(${segment});\n`;
};

creerBlocTracer('placer_milieu', {
    champs: function(b) {
        b.appendValueInput("SEGMENT").setCheck("Segment").appendField("placer le milieu du");
    },
    tooltip: "Place le milieu d'un segment."
});
Blockly.JavaScript.forBlock['placer_milieu'] = function(block) {
    var segment = Blockly.JavaScript.valueToCode(block, 'SEGMENT', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.placerMilieu(${segment});\n`;
};

creerBlocTracer('placer_intersection', {
    champs: function(b) {
        b.appendValueInput("OBJ1").setCheck(["Droite", "Segment", "Cercle"]).appendField("placer le point d'intersection visible entre");
        b.appendValueInput("OBJ2").setCheck(["Droite", "Segment", "Cercle"]).appendField("et");
    },
    tooltip: "Place le point d'intersection visible entre deux objets."
});
Blockly.JavaScript.forBlock['placer_intersection'] = function(block) {
    var obj1 = Blockly.JavaScript.valueToCode(block, 'OBJ1', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    var obj2 = Blockly.JavaScript.valueToCode(block, 'OBJ2', Blockly.JavaScript.ORDER_ATOMIC) || "null";
    return `await construire.placerIntersection(${obj1}, ${obj2});\n`;
};

Blockly.Blocks['tracer_polygone'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("tracer le polygone")
            .appendField(new Blockly.FieldTextInput("ABC"), "SOMMETS");
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(160);
        this.setTooltip("Trace le polygone dont les sommets sont les points indiqués, dans l'ordre, sans séparateur (ex: ABC).");
    }
};
Blockly.JavaScript.forBlock['tracer_polygone'] = function(block) {
    const texte = block.getFieldValue('SOMMETS').replace(/'/g, "").replace(/\s+/g, "");
    const noms = texte.split('').filter(s => s.length > 0);
    const tableau = noms.map(n => "'" + n + "'").join(', ');
    return `await construire.tracerPolygone([${tableau}]);\n`;
};

Blockly.Blocks['nommer'] = {
    init: function() {
        this.appendDummyInput()
            .appendField("nommer")
            .appendField(new Blockly.FieldTextInput("M"), "LABEL");
        this.setInputsInline(true);
        this.setPreviousStatement(true, null);
        this.setNextStatement(true, null);
        this.setColour(20);
        this.setTooltip("Nomme le dernier objet construit.");
    }
};
Blockly.JavaScript.forBlock['nommer'] = function(block) {
    var label = block.getFieldValue('LABEL').replace(/'/g, "");
    return `await construire.nommer('${label}');\n`;
};

/* ============================================================
   WORKSPACE BLOCKLY
   ============================================================ */

const workspace = Blockly.inject('blocklyDiv', {
    toolbox: `
    <xml>
      <category name="Programme" colour="290">
        <block type="programme"></block>
      </category>
      <category name="Points" colour="60">
        <block type="point"></block>
      </category>
      <category name="Références" colour="230">
        <block type="droite_ref"></block>
        <block type="segment_ref"></block>
        <block type="cercle_ref"></block>
      </category>
      <category name="Constructions" colour="160">
        <block type="tracer_droite"></block>
        <block type="tracer_segment"></block>
        <block type="tracer_demidroite"></block>
        <block type="tracer_cercle"></block>
        <block type="tracer_parallele"></block>
        <block type="tracer_perpendiculaire"></block>
        <block type="tracer_mediatrice"></block>
        <block type="placer_milieu"></block>
        <block type="placer_intersection"></block>
        <block type="tracer_polygone"></block>
      </category>
      <category name="Nommer" colour="20">
        <block type="objet_nomme"></block>
        <block type="nommer"></block>
      </category>
    </xml>
    `,
    media: 'https://unpkg.com/blockly/media/'
});

(function initierBlocProgramme() {
    const bloc = workspace.newBlock('programme');
    bloc.initSvg();
    bloc.render();
    bloc.moveBy(20, 20);
})();

// Fait générer par Blockly un appel "await avantBlocPasAPas('<id du bloc>');" devant
// chaque instruction, pour surligner le bloc en cours et gérer la pause pas à pas
// (avantBlocPasAPas est définie dans moteur-construction.js). Mécanisme standard de
// Blockly (STATEMENT_PREFIX), pas besoin de toucher aux générateurs de chaque bloc.
Blockly.JavaScript.STATEMENT_PREFIX = 'await avantBlocPasAPas(%1);\n';
Blockly.JavaScript.addReservedWords('avantBlocPasAPas');
