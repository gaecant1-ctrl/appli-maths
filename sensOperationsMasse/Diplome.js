/* ==============================================
   Diplome.js — diplôme de fin de quiz (A4 paysage, imprimable)
   Inspiré du diplôme de « La grue » (claude/grue/index.html).

   API :
     ouvrirDiplome({ nom, score, total, niveau })
       nom    : « Prénom I. »
       niveau : nom du niveau joué (ex. « Niveau 2 »)
================================================== */

const DIPLOME_CSS = `
#overlayDiplome{position:fixed;inset:0;background:rgba(31,36,48,.55);display:none;align-items:flex-start;justify-content:center;overflow:auto;z-index:3000;padding:24px;}
#overlayDiplome.ouverte{display:flex;}
#diplomeCarte{position:relative;background:#fff;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,.3);padding:18px 20px 24px;width:min(297mm,100%);}
#btnFermerDiplome{position:absolute;top:8px;right:12px;border:none;background:none;font-size:28px;line-height:1;cursor:pointer;color:#555;}
#overlayDiplome .d-actions{display:flex;gap:10px;margin-bottom:6px;}
#overlayDiplome .d-actions button{border:1px solid #2f9e44;background:#2f9e44;color:#fff;border-radius:8px;padding:8px 14px;font:inherit;font-size:.95rem;cursor:pointer;}
#overlayDiplome .note-impression{font-size:.85rem;color:#6b6f7a;margin:0 0 6mm;}
#overlayDiplome .diplome{width:277mm;height:190mm;flex:none;transform-origin:0 0;background:radial-gradient(ellipse at center,#fffdf6 0%,#fbf3de 100%);color:#1f2430;padding:4mm;border-radius:2mm;box-shadow:inset 0 0 0 1.5mm #1f5c33;font-family:Georgia,"Times New Roman",serif;box-sizing:border-box;}
#overlayDiplome .d-cadre{position:relative;height:100%;box-sizing:border-box;border:.6mm solid #c9a227;outline:.3mm solid #c9a227;outline-offset:-2.2mm;padding:10mm 16mm 6mm;display:flex;flex-direction:column;align-items:center;justify-content:space-between;overflow:hidden;}
#overlayDiplome .d-c{position:absolute;width:14mm;height:14mm;}
#overlayDiplome .d-c svg{width:100%;height:100%;display:block;}
#overlayDiplome .d-c.hg{top:3mm;left:3mm;}
#overlayDiplome .d-c.hd{top:3mm;right:3mm;transform:scaleX(-1);}
#overlayDiplome .d-c.bg{bottom:3mm;left:3mm;transform:scaleY(-1);}
#overlayDiplome .d-c.bd{bottom:3mm;right:3mm;transform:scale(-1,-1);}
#overlayDiplome .d-titre{font-size:48pt;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#1f5c33;line-height:1.05;}
#overlayDiplome .d-sous{font-size:14pt;color:#6b5a2e;letter-spacing:.04em;margin-top:1mm;text-align:center;}
#overlayDiplome .d-sous b{color:#1f5c33;}
#overlayDiplome .d-milieu{display:flex;align-items:center;gap:12mm;width:100%;justify-content:center;}
#overlayDiplome .d-texte{text-align:center;flex:1;}
#overlayDiplome .d-decerne{font-style:italic;font-size:15pt;color:#6b5a2e;}
#overlayDiplome .d-nom{font-family:"Brush Script MT","Segoe Script",cursive;font-size:44pt;font-weight:700;color:#1f5c33;margin:1mm auto;padding:0 10mm 1mm;border-bottom:.4mm solid #c9a227;display:inline-block;min-width:120mm;}
#overlayDiplome .d-pour{font-size:12.5pt;font-style:italic;color:#4a4a4a;margin-top:2mm;}
#overlayDiplome .d-niveau{display:inline-block;margin-top:3mm;padding:1.5mm 6mm;border-radius:999px;background:#6f3fa0;color:#fff;font-size:12pt;letter-spacing:.03em;}
#overlayDiplome .d-mention{font-size:18pt;font-weight:700;color:#1f8a4c;margin-top:3mm;letter-spacing:.03em;}
#overlayDiplome .d-sceau{width:44mm;flex:none;filter:drop-shadow(0 1mm 1mm rgba(0,0,0,.25));}
#overlayDiplome .d-sceau-note{font-family:Georgia,serif;font-size:22px;font-weight:700;fill:#1f5c33;}
#overlayDiplome .d-sceau-sur{font-family:Georgia,serif;font-size:9px;fill:#6b5a2e;}
#overlayDiplome .d-bas{display:flex;justify-content:space-between;align-items:flex-end;width:100%;padding:0 6mm;font-size:12pt;box-sizing:border-box;}
#overlayDiplome .d-erreurs{font-size:8.5pt;color:#9a927f;font-style:italic;margin-top:1mm;}
#overlayDiplome .d-signature{min-width:70mm;border-top:.3mm solid #1f2430;padding-top:1mm;text-align:center;margin-top:10mm;color:#4a4a4a;}
#overlayDiplome .d-frise{display:flex;gap:2.5mm;margin-top:1mm;}
#overlayDiplome .d-frise svg{width:8mm;height:8mm;}
body.diplome-ouvert{overflow:hidden;}
@media print{
  @page{size:A4 landscape;margin:.6cm;}
  *{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  body.diplome-ouvert > :not(#overlayDiplome){display:none !important;}
  body.diplome-ouvert{background:#fff !important;}
  #overlayDiplome{position:static;background:#fff;padding:0;display:block !important;overflow:visible;}
  #diplomeCarte{box-shadow:none;width:auto;padding:0;border-radius:0;}
  #btnFermerDiplome,#overlayDiplome .d-actions,#overlayDiplome .note-impression{display:none !important;}
  #overlayDiplome .diplome{transform:none !important;margin:0 auto !important;}
}`;

function diplomeEchapper(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function diplomeMention(score, total) {
  const x = total ? score / total * 20 : 0;
  return x >= 20 ? 'Félicitations !' : x >= 16 ? 'Très bien' : x >= 14 ? 'Bien'
    : x >= 12 ? 'Assez bien' : x >= 10 ? 'Réussi' : 'Continue tes efforts';
}

function diplomeContenu({ nom, score, total, niveau, erreurs = null }) {
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  // Sceau doré : cercle festonné, rubans, note au centre
  const festons = Array.from({ length: 48 }, (_, k) => {
    const a = k / 48 * 2 * Math.PI, r = k % 2 ? 44 : 48;
    return (k ? 'L' : 'M') + (50 + r * Math.cos(a)).toFixed(2) + ' ' + (50 + r * Math.sin(a)).toFixed(2);
  }).join(' ') + 'Z';
  const sceau = `<svg class="d-sceau" viewBox="0 0 100 130" aria-hidden="true">
    <defs><linearGradient id="dOr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f7e08a"/><stop offset=".5" stop-color="#d4a62a"/><stop offset="1" stop-color="#a87a12"/></linearGradient></defs>
    <path d="M30 80 L18 128 L32 118 L40 130 L48 86 Z" fill="#1f5c33"/><path d="M70 80 L82 128 L68 118 L60 130 L52 86 Z" fill="#1f5c33"/>
    <path d="${festons}" fill="url(#dOr)" stroke="#a87a12" stroke-width="1"/>
    <circle cx="50" cy="50" r="36" fill="#fffaf0" stroke="#c9a227" stroke-width="2"/>
    <circle cx="50" cy="50" r="31" fill="none" stroke="#c9a227" stroke-width=".8" stroke-dasharray="2 2"/>
    <text x="50" y="50" text-anchor="middle" class="d-sceau-note">${score}</text>
    <text x="50" y="66" text-anchor="middle" class="d-sceau-sur">sur ${total}</text>
  </svg>`;
  const coin = `<svg viewBox="0 0 40 40" aria-hidden="true"><path d="M2 38 V2 H38" fill="none" stroke="#c9a227" stroke-width="2"/><path d="M8 38 V8 H38" fill="none" stroke="#1f5c33" stroke-width="1"/><rect x="11" y="11" width="8" height="8" transform="rotate(45 15 15)" fill="#c9a227"/></svg>`;
  // Frise : les parts de disque de l'appli (1/2, 1/3, 3/4, …, disque entier)
  const frise = [[1, 2], [1, 3], [3, 4], [2, 5], [5, 6], [7, 8], [9, 10], [1, 1], [9, 10], [7, 8], [5, 6], [2, 5], [3, 4], [1, 3], [1, 2]]
    .map(([n, d]) => disqueSVG(n, d, 16)).join('');
  return `<div class="diplome">
  <div class="d-cadre">
    ${['hg', 'hd', 'bg', 'bd'].map(p => `<div class="d-c ${p}">${coin}</div>`).join('')}
    <div style="text-align:center">
      <div class="d-titre">Diplôme</div>
      <div class="d-sous">Sens des opérations · <b>masse</b></div>
    </div>
    <div class="d-milieu">
      <div class="d-texte">
        <div class="d-decerne">Ce diplôme est décerné à</div>
        <div class="d-nom">${diplomeEchapper(nom || '……………………')}</div>
        <div class="d-pour">pour avoir exprimé puis calculé des masses de parts de disques.</div>
        <div class="d-niveau">${diplomeEchapper(niveau || '')}</div>
        <div class="d-mention">${diplomeMention(score, total)}</div>
      </div>
      ${sceau}
    </div>
    <div class="d-bas"><div>Fait le ${date}${erreurs === null ? '' : `<div class="d-erreurs">Moyenne d'erreurs : ${erreurs.toFixed(1).replace('.', ',')} par exercice</div>`}</div><div class="d-signature">Signature du professeur</div></div>
    <div class="d-frise">${frise}</div>
  </div>
</div>`;
}

function fermerDiplome() {
  const ov = document.getElementById('overlayDiplome');
  if (ov) ov.classList.remove('ouverte');
  document.body.classList.remove('diplome-ouvert');
}

function ouvrirDiplome(infos) {
  let ov = document.getElementById('overlayDiplome');
  if (!ov) {
    const st = document.createElement('style');
    st.textContent = DIPLOME_CSS;
    document.head.append(st);
    ov = document.createElement('div');
    ov.id = 'overlayDiplome';
    ov.addEventListener('click', e => { if (e.target === ov) fermerDiplome(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') fermerDiplome(); });
    document.body.append(ov);
  }
  ov.innerHTML = `<div id="diplomeCarte">
    <button id="btnFermerDiplome" type="button" aria-label="Fermer">×</button>
    <div class="d-actions"><button type="button" id="btnImprimerDiplome">🖨️ Imprimer / Enregistrer en PDF</button></div>
    <p class="note-impression">💡 Dans la fenêtre d'impression, choisis <strong>Paysage</strong>, décoche <strong>« En-têtes et pieds de page »</strong> et coche <strong>« Graphiques d'arrière-plan »</strong>.</p>
    ${diplomeContenu(infos)}
  </div>`;
  document.getElementById('btnFermerDiplome').onclick = fermerDiplome;
  document.getElementById('btnImprimerDiplome').onclick = () => window.print();
  ov.classList.add('ouverte');
  document.body.classList.add('diplome-ouvert');

  // Le diplôme garde sa taille A4 ; à l'écran, il est réduit pour tenir dans la fenêtre
  const d = ov.querySelector('.diplome');
  const carte = d.parentElement;
  const cs = getComputedStyle(carte);
  const place = carte.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const r = d.getBoundingClientRect();
  const e = Math.min(1, place / r.width);
  d.style.transform = `scale(${e})`;
  d.style.marginBottom = -(1 - e) * r.height + 'px';
  d.style.marginRight = -(1 - e) * r.width + 'px';
}

window.ouvrirDiplome = ouvrirDiplome;
