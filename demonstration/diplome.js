/* ============================================================
   ÉLÈVE, NOTE ET DIPLÔME (même principe que l'appli « La grue »)

   - À l'ouverture, l'élève tape son prénom et son nom ; le même nom retrouve
     sa note enregistrée dans ce navigateur.
   - Chaque exercice rapporte ses points (ligne « points N » du fichier, 2 par défaut) :
     tous les points si la démonstration est juste dès le premier « Vérifier »,
     la moitié après des vérifications ratées. On garde la meilleure note.
   - « Recommencer » change le nom des droites : on peut retenter le premier coup.
   ============================================================ */

const CLE_ELEVE = 'demonstration.eleve';
let eleve = { nom: '', notes: {} };
let enregistre = null;
// Vérifications ratées sur l'exercice en cours (remis à zéro par « Recommencer »).
const echecs = {};

function empreinte(nom, notes) {
    const t = 'demo✦' + nom + '✦' + Object.keys(notes).sort().map(k => k + '=' + notes[k]).join(';');
    let h = 2166136261;
    for (let k = 0; k < t.length; k++) { h ^= t.charCodeAt(k); h = Math.imul(h, 16777619) >>> 0; }
    return h.toString(36);
}
try {
    const e = JSON.parse(localStorage.getItem(CLE_ELEVE));
    if (e && typeof e.nom === 'string' && e.notes && e.cle === empreinte(e.nom, e.notes)) enregistre = { nom: e.nom, notes: e.notes };
} catch (e) {}

function sauverEleve() {
    try {
        localStorage.setItem(CLE_ELEVE, JSON.stringify({ nom: eleve.nom, notes: eleve.notes, cle: empreinte(eleve.nom, eleve.notes) }));
    } catch (e) {}
}

const fmt = x => String(x).replace('.', ',');
const ptsMax = i => (EXERCICES[i] && EXERCICES[i].points) || 0;
const noteMax = () => EXERCICES.reduce((t, _, i) => t + ptsMax(i), 0);
const noteTotale = () => Object.values(eleve.notes).reduce((a, b) => a + b, 0);
const exerciceReussi = i => (eleve.notes[i] || 0) > 0;

// Points gagnés en réussissant l'exercice i ; renvoie les points de cette réussite.
function noterReussite(i) {
    const p = echecs[i] ? ptsMax(i) / 2 : ptsMax(i);
    if (p > (eleve.notes[i] || 0)) { eleve.notes[i] = p; sauverEleve(); }
    majEleve();
    return p;
}
function noterEchec(i) { echecs[i] = (echecs[i] || 0) + 1; }
function oublierEchecs(i) { delete echecs[i]; }

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

/* ---------- Entête : élève, note, diplôme ---------- */

const infoEleve = document.createElement('span');
infoEleve.className = 'eleve';
const btnDiplome = document.createElement('button');
btnDiplome.type = 'button';
btnDiplome.className = 'btn-header';
btnDiplome.textContent = '🎓 Diplôme';
btnDiplome.style.display = 'none';
btnDiplome.onclick = () => ouvrirDiplome();

function installerEntete(conteneur) {
    conteneur.prepend(infoEleve, btnDiplome);
}

function majEleve() {
    infoEleve.innerHTML = eleve.nom
        ? `👤 ${esc(eleve.nom)} <span class="note">📝 ${fmt(noteTotale())} / ${noteMax()}</span>`
        : '';
    btnDiplome.style.display = eleve.nom ? '' : 'none';
    if (typeof mettreAJourBoutonsExercices === 'function') mettreAJourBoutonsExercices();
}

/* ---------- Nouvel onglet : l'élève garde son nom ---------- */

// Le nouvel onglet retrouve le nom par un relais court dans localStorage (lu une seule fois).
const CLE_REPRISE = 'demonstration.reprise';

function ouvrirNouvelOnglet() {
    try {
        if (eleve.nom) localStorage.setItem(CLE_REPRISE, JSON.stringify({ nom: eleve.nom, t: Date.now() }));
    } catch (e) {}
    const w = window.open(window.location.href, '_blank');
    if (w) w.opener = null;
    return !!w;
}

function lireReprise() {
    try {
        const r = JSON.parse(localStorage.getItem(CLE_REPRISE));
        localStorage.removeItem(CLE_REPRISE);
        if (r && typeof r.nom === 'string' && Date.now() - r.t < 60000) return r.nom;
    } catch (e) {}
    return null;
}

function connecter(nom) {
    // même nom que la note enregistrée : on la retrouve ; sinon on part de zéro
    eleve = enregistre && enregistre.nom === nom ? enregistre : { nom, notes: {} };
    enregistre = eleve;
    sauverEleve();
    majEleve();
}

/* ---------- Accueil : nom de l'élève ---------- */

function demanderNom(ensuite) {
    // Onglet ouvert depuis l'appli : le nom est déjà connu.
    const repris = lireReprise();
    if (repris) { connecter(repris); ensuite(); return; }

    const ov = document.createElement('div');
    ov.className = 'overlay-fond visible';
    ov.innerHTML = `
        <div class="overlay-carte carte-nom">
            <h2>Démonstration</h2>
            <label class="nom-eleve" for="champNom">Ton prénom et ton nom (pour le diplôme) :
                <input id="champNom" type="text" autocomplete="off" placeholder="Prénom Nom" maxlength="40">
            </label>
            <span class="erreur-nom"></span>
            <div class="nom-actions">
                <button type="button" id="btnCommencer">Commencer →</button>
            </div>
        </div>`;
    document.body.appendChild(ov);
    const champ = ov.querySelector('#champNom');
    const lireNom = () => {
        const nom = champ.value.trim().replace(/\s+/g, ' ');
        if (nom.length >= 2) return nom;
        ov.querySelector('.erreur-nom').textContent = 'Écris ton prénom et ton nom.';
        champ.focus();
        return null;
    };
    // Appli intégrée dans une page (iframe) : une fois le nom tapé, elle s'ouvre
    // directement dans un nouvel onglet, qui démarre avec ce nom.
    const integree = window.self !== window.top;
    const commencer = () => {
        const nom = lireNom();
        if (!nom) return;
        connecter(nom);
        const ouvert = integree ? ouvrirNouvelOnglet() : null;
        ov.remove();
        ensuite();
        if (ouvert === true) alerte('Appli ouverte dans un nouvel onglet.', 'info');
        if (ouvert === false) alerte(`Nouvel onglet bloqué — <a href="${window.location.href}" target="_blank" rel="noopener">clique ici</a>`, 'info');
    };
    champ.addEventListener('keydown', e => { if (e.key === 'Enter') commencer(); });
    ov.querySelector('#btnCommencer').onclick = commencer;
    setTimeout(() => champ.focus(), 0);
}

/* ---------- Diplôme (A4 paysage, imprimable) ---------- */

function mention(note, max) {
    const x = note / max * 20;
    return x >= 20 ? 'Félicitations !' : x >= 16 ? 'Très bien' : x >= 14 ? 'Bien' : x >= 12 ? 'Assez bien' : x >= 10 ? 'Réussi' : 'Continue tes efforts';
}

function diplomeContenu() {
    const note = noteTotale(), max = noteMax();
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    // une médaille par exercice, avec ses étoiles (une par point entier)
    const medailles = EXERCICES.map((_, i) => {
        const pts = eleve.notes[i] || 0, m = ptsMax(i);
        const etoiles = Array.from({ length: m }, (_, k) => `<span class="${k < Math.floor(pts) ? 'pleine' : ''}">★</span>`).join('');
        return `<div class="d-med${pts >= m ? ' complete' : ''}"><div class="d-med-nom">Exercice ${i + 1}</div>` +
            `<div class="d-med-pts">${fmt(pts)} / ${m}</div><div class="d-etoiles">${etoiles}</div></div>`;
    }).join('');
    // sceau doré : cercle festonné, rubans, note au centre
    const festons = Array.from({ length: 48 }, (_, k) => {
        const a = k / 48 * 2 * Math.PI, r = k % 2 ? 44 : 48;
        return (k ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(2) + ' ' + (50 + r * Math.sin(a)).toFixed(2);
    }).join(' ') + 'Z';
    const sceau = `<svg class="d-sceau" viewBox="0 0 100 130" aria-hidden="true">
    <defs><linearGradient id="or" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e08a"/><stop offset=".5" stop-color="#d4a62a"/><stop offset="1" stop-color="#a87a12"/></linearGradient></defs>
    <path d="M30 80 L18 128 L32 118 L40 130 L48 86 Z" fill="#1d3b8f"/><path d="M70 80 L82 128 L68 118 L60 130 L52 86 Z" fill="#1d3b8f"/>
    <path d="${festons}" fill="url(#or)" stroke="#a87a12" stroke-width="1"/>
    <circle cx="50" cy="50" r="36" fill="#fffaf0" stroke="#c9a227" stroke-width="2"/>
    <circle cx="50" cy="50" r="31" fill="none" stroke="#c9a227" stroke-width=".8" stroke-dasharray="2 2"/>
    <text x="50" y="50" text-anchor="middle" class="d-sceau-note">${fmt(note)}</text>
    <text x="50" y="66" text-anchor="middle" class="d-sceau-sur">sur ${max}</text>
  </svg>`;
    // la figure : deux parallèles coupées par une perpendiculaire, codages vert et rouge
    const figure = `<svg class="d-figure" viewBox="0 0 120 100" aria-hidden="true">
    <g stroke="#1d3b8f" stroke-width="2.4" stroke-linecap="round">
      <path d="M6 30 L114 18"/><path d="M6 78 L114 66"/><path d="M52 4 L64 98"/>
    </g>
    <path d="M60.8 32.4 L68.6 31.6 L67.6 23.6" fill="none" stroke="#2f9e44" stroke-width="2"/>
    <g stroke="#c0392b" stroke-width="2" fill="none">
      <path d="M92 24 L96 63"/><circle cx="94" cy="43" r="7" fill="#fffdf6"/>
      <path d="M90.5 46.5 L93 39.5 M94.5 46.5 L97 39.5"/>
    </g>
    <text x="10" y="25" font-size="9" font-style="italic" fill="#1d3b8f">(d₁)</text>
    <text x="10" y="73" font-size="9" font-style="italic" fill="#1d3b8f">(d₂)</text>
    <text x="40" y="95" font-size="9" font-style="italic" fill="#1d3b8f">(d₃)</text>
  </svg>`;
    const coin = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 38 V2 H38" fill="none" stroke="#c9a227" stroke-width="2"/><path d="M8 38 V8 H38" fill="none" stroke="#1d3b8f" stroke-width="1"/><rect x="11" y="11" width="8" height="8" transform="rotate(45 15 15)" fill="#c9a227"/></svg>`;
    const frise = Array.from({ length: 12 }, (_, k) => k % 2
        ? '<span style="background:#e6f6ea;color:#2f9e44">⊥</span>'
        : '<span style="background:#fbeceb;color:#c0392b">//</span>').join('');
    return `<div class="diplome">
  <div class="d-cadre">
    ${['hg', 'hd', 'bg', 'bd'].map(p => `<div class="d-c ${p}">${coin}</div>`).join('')}
    ${figure}
    <div class="d-titre">Diplôme</div>
    <div class="d-sous">de démonstration · <b>Parallèles et perpendiculaires</b></div>
    <div class="d-milieu">
      <div class="d-texte">
        <div class="d-decerne">Ce diplôme est décerné à</div>
        <div class="d-nom">${esc(eleve.nom || '……………………')}</div>
        <div class="d-pour">pour avoir tenu des raisonnements valides à partir des codages d'une figure.</div>
        <div class="d-mention">${mention(note, max)}</div>
      </div>
      ${sceau}
    </div>
    <div class="d-meds">${medailles}</div>
    <div class="d-bas"><div>Fait le ${date}</div><div class="d-signature">Signature du professeur</div></div>
    <div class="d-frise">${frise}</div>
  </div>
</div>`;
}

const FICHE_CSS = `
#overlayFiche{position:fixed;inset:0;background:rgba(31,36,48,.55);display:none;align-items:flex-start;justify-content:center;overflow:auto;z-index:2000000;padding:24px;}
#overlayFiche.ouverte{display:flex;}
#ficheCarte{position:relative;background:#fff;color:#1f2430;width:min(297mm,100%);border-radius:10px;box-shadow:0 10px 40px rgba(0,0,0,.3);padding:12mm 12mm 14mm;font-size:12pt;}
#btnFermerFiche{position:absolute;top:8px;right:12px;border:none;background:none;font-size:28px;cursor:pointer;color:#6b6f7a;margin:0;padding:0;}
#overlayFiche .fiche-actions{display:flex;gap:10px;flex-wrap:wrap;margin-bottom:6px;}
#overlayFiche .fiche-actions button{border:1px solid #d9d2c3;background:#f5f1e8;border-radius:8px;padding:8px 14px;font:inherit;font-size:.95rem;cursor:pointer;color:#1f2430;margin:0;}
#overlayFiche .fiche-actions button.principal{background:#2f5fd0;color:#fff;border-color:#2f5fd0;}
#overlayFiche .note-impression{font-size:.85rem;color:#6b6f7a;margin:0 0 10mm;}
#overlayFiche .diplome{width:277mm;height:190mm;zoom:.95;flex:none;transform-origin:0 0;background:radial-gradient(ellipse at center,#fffdf6 0%,#fbf3de 100%);color:#1f2430;padding:4mm;border-radius:2mm;box-shadow:inset 0 0 0 1.5mm #1d3b8f;font-family:Georgia,"Times New Roman",serif;}
#overlayFiche .d-cadre{position:relative;height:100%;border:.6mm solid #c9a227;outline:.3mm solid #c9a227;outline-offset:-2.2mm;padding:10mm 16mm 6mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;}
#overlayFiche .d-c{position:absolute;width:14mm;height:14mm;}
#overlayFiche .d-c svg{width:100%;height:100%;display:block;}
#overlayFiche .d-c.hg{top:3mm;left:3mm;}
#overlayFiche .d-c.hd{top:3mm;right:3mm;transform:scaleX(-1);}
#overlayFiche .d-c.bg{bottom:3mm;left:3mm;transform:scaleY(-1);}
#overlayFiche .d-c.bd{bottom:3mm;right:3mm;transform:scale(-1,-1);}
#overlayFiche .d-figure{position:absolute;left:14mm;top:9mm;width:42mm;}
#overlayFiche .d-titre{font-family:"Playfair Display",Georgia,serif;font-size:48pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1d3b8f;line-height:1.05;}
#overlayFiche .d-sous{font-size:14pt;color:#6b5a2e;letter-spacing:.04em;margin-top:1mm;}
#overlayFiche .d-sous b{color:#1d3b8f;}
#overlayFiche .d-milieu{display:flex;align-items:center;gap:12mm;margin:0;width:100%;justify-content:center;}
#overlayFiche .d-texte{text-align:center;flex:1;}
#overlayFiche .d-decerne{font-style:italic;font-size:15pt;color:#6b5a2e;}
#overlayFiche .d-nom{font-family:"Dancing Script","Brush Script MT",cursive;font-size:42pt;font-weight:700;color:#1d3b8f;margin:1mm auto 1mm;padding:0 10mm 1mm;border-bottom:.4mm solid #c9a227;display:inline-block;min-width:120mm;}
#overlayFiche .d-pour{font-size:12.5pt;font-style:italic;color:#4a4a4a;margin-top:2mm;}
#overlayFiche .d-mention{font-size:18pt;font-weight:700;color:#1f8a4c;margin-top:3mm;letter-spacing:.03em;}
#overlayFiche .d-sceau{width:44mm;flex:none;filter:drop-shadow(0 1mm 1mm rgba(0,0,0,.25));}
#overlayFiche .d-sceau-note{font-family:Georgia,serif;font-size:22px;font-weight:700;fill:#1d3b8f;}
#overlayFiche .d-sceau-sur{font-family:Georgia,serif;font-size:9px;fill:#6b5a2e;}
#overlayFiche .d-meds{display:flex;gap:2.5mm;justify-content:center;}
#overlayFiche .d-med{border:.4mm solid #d9c58a;border-radius:3mm;padding:2mm 3mm;min-width:25mm;text-align:center;background:rgba(255,255,255,.6);}
#overlayFiche .d-med.complete{border-color:#c9a227;background:#fff6d6;}
#overlayFiche .d-med-nom{font-size:9pt;color:#6b5a2e;text-transform:uppercase;letter-spacing:.05em;}
#overlayFiche .d-med-pts{font-size:14pt;font-weight:700;color:#1d3b8f;}
#overlayFiche .d-etoiles{font-size:11pt;letter-spacing:.5mm;color:#d9d2c3;}
#overlayFiche .d-etoiles .pleine{color:#d4a62a;}
#overlayFiche .d-bas{display:flex;justify-content:space-between;align-items:flex-end;width:100%;padding:0 6mm;font-size:12pt;}
#overlayFiche .d-signature{min-width:70mm;border-top:.3mm solid #1f2430;padding-top:1mm;text-align:center;margin-top:10mm;color:#4a4a4a;}
#overlayFiche .d-frise{display:flex;gap:1.5mm;margin-top:1mm;}
#overlayFiche .d-frise span{width:7mm;height:6mm;border-radius:1mm;display:flex;align-items:center;justify-content:center;font-size:3.6mm;font-weight:700;box-shadow:inset 0 0 0 .4mm rgba(0,0,0,.2);}
body.fiche-ouverte{overflow:hidden;}
@media print{
  @page{size:A4 landscape;margin:10mm;}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  html{font-size:16px !important;}
  body.fiche-ouverte{height:auto !important;min-height:0 !important;display:block !important;background:#fff !important;}
  body.fiche-ouverte > :not(#overlayFiche){display:none !important;}
  #overlayFiche{position:static;background:#fff;padding:0;display:block !important;overflow:visible;}
  #ficheCarte{box-shadow:none;width:100%;border-radius:0;padding:0;}
  #btnFermerFiche,#overlayFiche .fiche-actions,#overlayFiche .note-impression{display:none !important;}
  #overlayFiche .diplome{transform:none !important;margin:0 auto !important;break-inside:avoid;}
}`;

function fermerFiche() {
    const ov = document.getElementById('overlayFiche');
    if (ov) ov.classList.remove('ouverte');
    document.body.classList.remove('fiche-ouverte');
}

// Le diplôme garde sa taille A4 (paysage) ; à l'écran, il est réduit pour tenir dans la fenêtre.
function ouvrirDiplome() {
    if (!eleve.nom) return;
    let ov = document.getElementById('overlayFiche');
    if (!ov) {
        const st = document.createElement('style');
        st.textContent = FICHE_CSS;
        document.head.append(st);
        ov = document.createElement('div');
        ov.id = 'overlayFiche';
        ov.addEventListener('click', e => { if (e.target === ov) fermerFiche(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerFiche(); });
        document.body.append(ov);
    }
    ov.innerHTML = `<div id="ficheCarte">
    <button id="btnFermerFiche" type="button" aria-label="Fermer">×</button>
    <div class="fiche-actions">
      <button type="button" class="principal" id="btnImprimerFiche">🖨️ Imprimer / Enregistrer en PDF</button>
    </div>
    <p class="note-impression">💡 Dans la fenêtre d'impression, décoche <strong>« En-têtes et pieds de page »</strong> et coche <strong>« Graphiques d'arrière-plan »</strong> pour garder les couleurs.</p>
    ${diplomeContenu()}
  </div>`;
    document.getElementById('btnFermerFiche').onclick = fermerFiche;
    document.getElementById('btnImprimerFiche').onclick = () => window.print();
    ov.classList.add('ouverte');
    document.body.classList.add('fiche-ouverte');

    const d = ov.querySelector('.diplome');
    const carte = getComputedStyle(d.parentElement);
    const place = d.parentElement.clientWidth - parseFloat(carte.paddingLeft) - parseFloat(carte.paddingRight);
    const r = d.getBoundingClientRect();            // taille réelle affichée (zoom compris)
    const e = Math.min(1, place / r.width);
    d.style.transform = 'scale(' + e + ')';
    d.style.marginBottom = -(1 - e) * r.height / 0.95 + 'px';
    d.style.marginRight = -(1 - e) * r.width / 0.95 + 'px';
}
