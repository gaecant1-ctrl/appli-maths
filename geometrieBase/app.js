/* ============================================================
   BANDEAU : Nouvel onglet
   ============================================================ */

function installerBoutonNouvelOnglet() {
    const conteneur = document.getElementById("topButtonsBar");
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn-header';
    btn.textContent = 'Nouvel onglet';

    const repli = document.createElement('span');
    repli.style.cssText = 'display:none; font-size:0.8em; margin-left:8px;';
    repli.innerHTML = `Bloqué — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`;

    btn.onclick = () => {
        const w = window.open(window.location.href, "_blank", "noopener");
        if (!w) repli.style.display = 'inline';
    };

    conteneur.appendChild(btn);
    conteneur.appendChild(repli);
}

/* ============================================================
   BOOTSTRAP : GeoGebra + bandeau
   ============================================================ */

async function demarrerGeometrie() {
    ggbApplet.setAxesVisible(false, false);
    ggbApplet.setGridVisible(false);

    appliquerPointsBase(POINTS_BASE_DEFAUT);

    await chargerFiguresTexte('figure', FIGURES);
    genererCible();
    appliquerStylePoints(2); // "croix" par défaut

    document.getElementById("button").disabled = false;
    document.getElementById("button").innerText = "Exécuter";
    document.getElementById("nouvelleFigureButton").disabled = false;
    document.getElementById("resetButton").disabled = false;
    document.getElementById("stylePointsButton").disabled = false;
    document.getElementById("btnEtiquettesFantome").disabled = false;
    document.getElementById("modeSaisieButton").disabled = false;
    document.getElementById("btnFicheHeader").disabled = false;
    document.getElementById("btnModeExecution").disabled = false;
}

function onAppletReady() {
    ggbApplet = window.ggbApplet;
    demarrerGeometrie();
}

const ggbApp = new GGBApplet({
    appName: "classic",
    perspective: "G",
    width: 400,
    height: 400,
    showToolBar: false,
    showAlgebraInput: false,
    showMenuBar: false,
    showResetIcon: false,
    showAxes: false,
    showGrid: false,
    enableLabelDrags: true,
    enableShiftDragZoom: false,
    enableRightClick: false,
    errorDialogsActive: false,
    appletOnLoad: onAppletReady
}, true);

ggbApp.inject('ggb-element');

installerBoutonNouvelOnglet();

const fiche = new FichePapier();
fiche.installerBouton(document.getElementById("topButtonsBar"));

const guide = new GuideAppli();
guide.installerBouton(document.getElementById("topButtonsBar"));
