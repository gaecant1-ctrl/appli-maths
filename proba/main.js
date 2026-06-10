/**
 * ========================================================
 * 1. CLASSE ABSTRAITE PARENTE (CONTRAT DE POLYMORPHISME)
 * ========================================================
 */
class BaseExperience {
    constructor() {
        if (this.constructor === BaseExperience) throw new TypeError("Classe abstraite.");
        this.total = 0;
        this.issuesDefinition = []; 
        this.counts = {}; 
        this.eventIndices = []; 
        this.distribution = {}; 
        this.probaA = 0;            
        this.experienceDesc = "";
    }

    calculateProbaA() { 
        this.probaA = this.eventIndices.reduce((sum, id) => sum + (this.distribution[id] || 0), 0); 
    }

    getStats() {
        const effectifTotalEventA = this.eventIndices.reduce((sum, id) => sum + (this.counts[id] || 0), 0);

        return {
            total: this.total, 
            freqA: this.total > 0 ? (effectifTotalEventA / this.total) : 0, 
            probaA: this.probaA,
            issues: this.issuesDefinition.map(iss => ({
                id: iss.id, 
                label: iss.label, 
                count: this.counts[iss.id] || 0,
                freq: this.total > 0 ? (this.counts[iss.id] || 0) / this.total : 0,
                proba: this.distribution[iss.id] || 0, 
                inEvent: this.eventIndices.includes(iss.id)
            }))
        };
    }

    renderEventSettingsHTML(showTheoryActive = true) {
        let html = `<p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">Cochez les issues de l'événement A :</p>`;
        html += `<div class="outcome-selection-list">`;
        this.issuesDefinition.forEach(iss => {
            const isChecked = this.eventIndices.includes(iss.id) ? 'checked' : '';
            const labelProba = showTheoryActive 
                ? `(P=${(this.distribution[iss.id] * 100).toFixed(1)}%)` 
                : `(??)`;

            html += `
                <label class="outcome-item">
                    <input type="checkbox" class="event-checkbox" data-id="${iss.id}" ${isChecked}>
                    <span>${iss.label} <small style="color:var(--text-muted)">${labelProba}</small></span>
                </label>
            `;
        });
        html += `</div>`;
        return html;
    }

    bindEventSettings(container, onUpdateCallback) {
        const checkboxes = container.querySelectorAll('.event-checkbox');
        checkboxes.forEach(cb => {
            cb.onchange = () => {
                const id = cb.getAttribute('data-id');
                if (cb.checked) {
                    if (!this.eventIndices.includes(id)) this.eventIndices.push(id);
                } else {
                    this.eventIndices = this.eventIndices.filter(item => item !== id);
                }
                this.calculateProbaA();
                onUpdateCallback();
            };
        });
    }

    configureUniverse() { throw new Error("À implémenter."); }
    lancer() { throw new Error("À implémenter."); }
    renderStepHTML(lastOutcome) { throw new Error("À implémenter."); }
    renderContinuousHTML() { throw new Error("À implémenter."); }
    renderExperienceSettingsHTML() { throw new Error("À implémenter."); }
    bindExperienceSettings(container, onUpdateCallback) { throw new Error("À implémenter."); }
}

/**
 * ========================================================
 * 2. ENFANT 1 : SIMULATION DES DEUX DÉS (AVEC SÉLECTEUR)
 * ========================================================
 */
class SommeDeuxDesExperience extends BaseExperience {
    constructor() {
        super();
        this.savedSeuil = 7; 
        this.savedFaces = 6; 
        this.configureUniverse();
    }

    configureUniverse() {
        this.total = 0; 
        this.issuesDefinition = []; 
        this.counts = {}; 
        this.distribution = {};
        this.experienceDesc = `Simulation du lancer simultané de deux dés à ${this.savedFaces} faces. La variable d'étude suit la somme des valeurs obtenues.`;
        
        const maxSomme = this.savedFaces * 2;

        for (let s = 2; s <= maxSomme; s++) {
            const idStr = `s_${s}`; 
            this.issuesDefinition.push({ id: idStr, label: `${s}` }); 
            this.counts[idStr] = 0;
            
            let combinaisons = 0;
            for (let d1 = 1; d1 <= this.savedFaces; d1++) { 
                for (let d2 = 1; d2 <= this.savedFaces; d2++) { if (d1 + d2 === s) combinaisons++; } 
            }
            this.distribution[idStr] = combinaisons / (this.savedFaces * this.savedFaces);
        }

        if (this.savedSeuil > maxSomme) {
            this.savedSeuil = maxSomme;
        }

        this.eventIndices = this.issuesDefinition
            .filter(iss => parseInt(iss.label) >= this.savedSeuil)
            .map(i => i.id);

        this.calculateProbaA();
    }

    lancer() {
        this.total++;
        const deBleu = Math.floor(Math.random() * this.savedFaces) + 1; 
        const deRouge = Math.floor(Math.random() * this.savedFaces) + 1; 
        const somme = deBleu + deRouge;
        const idTire = `s_${somme}`; 
        this.counts[idTire]++;
        
        const isSuccess = this.eventIndices.includes(idTire); 
        return { deBleu: deBleu, deRouge: deRouge, totalSomme: somme, isSuccess: isSuccess };
    }

    getLocalCSS() {
        return `
            <style>
                .step-render-layout { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 1.4rem; font-weight: bold; min-width: 280px; height: 100%; }
                .mini-cube { background: var(--bg-panel); width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--text-main); font-size: 1.4rem; }
                .mini-cube.de-bleu { border: 2px solid #38bdf8; box-shadow: 0 0 8px rgba(56, 189, 248, 0.2); }
                .mini-cube.de-rouge { border: 2px solid #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); }
                .result-badge { height: 45px; width: 95px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-size: 1.4rem; white-space: nowrap; box-sizing: border-box; }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        if (!lastOutcome) {
            return `${localCSS}<div class="step-render-layout"><span style="color: var(--text-muted); font-weight: normal;">En attente de lancer...</span></div>`;
        }
        const emoji = isEventVisible ? (lastOutcome.isSuccess ? ' ✅' : ' ❌') : '';
        return `
            ${localCSS}
            <div class="step-render-layout">
                <div class="mini-cube de-bleu">${lastOutcome.deBleu}</div>
                <div style="font-size: 1.5rem; color: var(--accent); line-height: 45px;">+</div>
                <div class="mini-cube de-rouge">${lastOutcome.deRouge}</div>
                <div style="font-size: 1.5rem; color: var(--accent); line-height: 45px;">=</div>
                <div class="result-badge">
                    ${lastOutcome.totalSomme}${emoji}
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        return `<div class="continuous-render-layout"><span>⚡ Injection intensive de lancers de dés (Loi des grands nombres)...</span><div class="animated-bars"><span></span><span></span><span></span><span></span></div></div>`;
    }

    renderExperienceSettingsHTML() {
        const check4 = this.savedFaces === 4 ? 'checked' : '';
        const check6 = this.savedFaces === 6 ? 'checked' : '';
        const maxSomme = this.savedFaces * 2;

        return `
            <div style="margin-bottom: 15px;">
                <label style="display:block; margin-bottom:5px;">Type de dés :</label>
                <div style="display:flex; gap:15px;">
                    <label><input type="radio" name="dice-type" value="4" ${check4}> Tétraédrique (4 faces)</label>
                    <label><input type="radio" name="dice-type" value="6" ${check6}> Cubique (6 faces)</label>
                </div>
            </div>
            <div>
                <label>Seuil de la Somme visée (Somme ≥ X) :</label>
                <div class="slider-wrapper">
                    <input type="range" id="slider-somme-cible" class="slider-input" min="2" max="${maxSomme}" value="${this.savedSeuil}">
                    <span id="value-somme-cible" class="slider-value">${this.savedSeuil}</span>
                </div>
            </div>
        `;
    }

    bindExperienceSettings(container, onUpdateCallback) {
        const radios = container.querySelectorAll('input[name="dice-type"]');
        const slider = container.querySelector('#slider-somme-cible');
        const sliderValue = container.querySelector('#value-somme-cible');
        
        radios.forEach(r => {
            r.onchange = () => {
                this.savedFaces = parseInt(r.value);
                this.configureUniverse();
                const maxSomme = this.savedFaces * 2;
                if (slider) {
                    slider.max = maxSomme;
                    slider.value = this.savedSeuil;
                }
                if (sliderValue) sliderValue.textContent = this.savedSeuil;
                onUpdateCallback();
            };
        });

        if (!slider) return;
        slider.oninput = () => {
            this.savedSeuil = parseInt(slider.value);
            if (sliderValue) sliderValue.textContent = slider.value;
            this.configureUniverse();
            onUpdateCallback();
        };
    }
}

/**
 * ========================================================
 * 3. ENFANT 2 : SIMULATION DU PRODUIT DE DEUX DÉS
 * ========================================================
 */
class ProduitDeuxDesExperience extends BaseExperience {
    constructor() {
        super();
        this.savedSeuilProduit = 5; 
        this.configureUniverse();
    }

    configureUniverse() {
        this.total = 0; this.issuesDefinition = []; this.counts = {}; this.distribution = {};
        this.experienceDesc = "Simulation du lancer simultané d'un dé bleu et d'un dé rouge. La variable d'étude calcule la SOMME DES CHIFFRES du produit des deux dés.";
        
        const produitsPossibles = [1, 2, 3, 4, 5, 6, 7, 8, 9];
        produitsPossibles.forEach(p => {
            const idStr = `p_${p}`;
            this.issuesDefinition.push({ id: idStr, label: `${p}` });
            this.counts[idStr] = 0;

            let combinaisons = 0;
            for (let d1 = 1; d1 <= 6; d1++) {
                for (let d2 = 1; d2 <= 6; d2++) {
                    const prodBrut = d1 * d2;
                    const sommeChiffres = prodBrut.toString().split('').reduce((sum, char) => sum + parseInt(char), 0);
                    if (sommeChiffres === p) combinaisons++;
                }
            }
            this.distribution[idStr] = combinaisons / 36;
        });

        this.eventIndices = this.issuesDefinition.filter(iss => parseInt(iss.label) >= this.savedSeuilProduit).map(i => i.id);
        this.calculateProbaA();
    }

    lancer() {
        this.total++;
        const deBleu = Math.floor(Math.random() * 6) + 1;
        const deRouge = Math.floor(Math.random() * 6) + 1;
        const produitBrut = deBleu * deRouge;
        const produit = produitBrut.toString().split('').reduce((sum, char) => sum + parseInt(char), 0);
        const idTire = `p_${produit}`;
        
        this.counts[idTire]++;
        const isSuccess = this.eventIndices.includes(idTire);
        return { deBleu: deBleu, deRouge: deRouge, totalProduit: produit, isSuccess: isSuccess };
    }

    getLocalCSS() {
        return `
            <style>
                .step-render-layout { display: flex; align-items: center; justify-content: center; gap: 12px; font-size: 1.4rem; font-weight: bold; min-width: 360px; height: 100%; }
                .mini-cube { background: var(--bg-panel); width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 6px; color: var(--text-main); font-size: 1.4rem; }
                .mini-cube.de-bleu { border: 2px solid #38bdf8; box-shadow: 0 0 8px rgba(56, 189, 248, 0.2); }
                .mini-cube.de-rouge { border: 2px solid #ef4444; box-shadow: 0 0 8px rgba(239, 68, 68, 0.2); }
                .op-sign { font-size: 1.4rem; color: var(--accent); line-height: 45px; width: 20px; text-align: center; }
                .result-badge { height: 45px; width: 55px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-size: 1.3rem; box-sizing: border-box; }
                .box-text-arrow { display: inline-block; width: 25px; text-align: center; color: var(--text-muted); font-size: 1.1rem; }
                .reduction-badge { height: 45px; width: 75px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: rgba(255,255,255,0.02); border: 1px solid rgba(255, 255, 255, 0.08); font-size: 1.3rem; box-sizing: border-box; padding-left: 5px; }
                .box-num-d { display: inline-block; width: 20px; text-align: center; }
                .box-emoji { display: inline-block; width: 24px; text-align: right; margin-left: 4px; }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        if (!lastOutcome) {
            return `${localCSS}<div class="step-render-layout"><span style="color: var(--text-muted); font-weight: normal;">En attente de lancer...</span></div>`;
        }
        const emoji = isEventVisible ? (lastOutcome.isSuccess ? ' ✅' : ' ❌') : '';
        const produitBrut = lastOutcome.deBleu * lastOutcome.deRouge;
        
        return `
            ${localCSS}
            <div class="step-render-layout">
                <div class="mini-cube de-bleu">${lastOutcome.deBleu}</div>
                <div class="op-sign">✕</div>
                <div class="mini-cube de-rouge">${lastOutcome.deRouge}</div>
                <div class="op-sign">=</div>
                <div class="result-badge">${produitBrut}</div>
                <span class="box-text-arrow">➔</span>
                <div class="reduction-badge">
                    <span class="box-num-d">${lastOutcome.totalProduit}</span>
                    <span class="box-emoji">${emoji}</span>
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        return `<div class="continuous-render-layout"><span>⚡ Calcul intensif de la somme des chiffres du produit...</span><div class="animated-bars"><span></span><span></span><span></span><span></span></div></div>`;
    }

    renderExperienceSettingsHTML() {
        return `<div><label>Seuil du résultat visé (Résultat ≥ X) :</label><div class="slider-wrapper"><input type="range" id="slider-produit-cible" class="slider-input" min="1" max="9" value="${this.savedSeuilProduit}"><span id="value-produit-cible" class="slider-value">${this.savedSeuilProduit}</span></div></div>`;
    }

    bindExperienceSettings(container, onUpdateCallback) {
        const s = container.querySelector('#slider-produit-cible');
        if (!s) return;
        s.oninput = () => {
            this.savedSeuilProduit = parseInt(s.value);
            container.querySelector('#value-produit-cible').textContent = s.value;
            this.configureUniverse();
            onUpdateCallback();
        };
    }
}

/**
 * ========================================================
 * 4. ENFANT 3 : SIMULATION DE L'URNE COLORÉE
 * ========================================================
 */
class UrneMulticoloreExperience extends BaseExperience {
    constructor() {
        super();
        this.savedComposition = { bleue: 3, rouge: 2, jaune: 5 }; 
        this.configureUniverse();
    }

    configureUniverse() {
        this.total = 0; this.issuesDefinition = []; this.counts = {}; this.distribution = {};
        const totalBoules = this.savedComposition.bleue + this.savedComposition.rouge + this.savedComposition.jaune;
        this.experienceDesc = `Tirage d'une boule dans une urne colorée. Effectif actuel : ${totalBoules} boules.`;

        const issuesPotentielles = [
            { id: 'bleue', label: 'Bleue 🟦' },
            { id: 'rouge', label: 'Rouge 🟥' },
            { id: 'jaune', label: 'Jaune 🟨' }
        ];

        this.issuesDefinition = issuesPotentielles.filter(iss => this.savedComposition[iss.id] > 0);

        if (this.issuesDefinition.length === 0) {
            this.issuesDefinition = [{ id: 'vide', label: 'Vide 🫙' }];
            this.counts['vide'] = 0;
            this.distribution['vide'] = 1;
        } else {
            this.issuesDefinition.forEach(iss => {
                this.counts[iss.id] = 0;
                this.distribution[iss.id] = this.savedComposition[iss.id] / totalBoules;
            });
        }

        this.urnePhysiqueFixe = [];
        for (let i = 0; i < this.savedComposition.bleue; i++) this.urnePhysiqueFixe.push('bleue');
        for (let i = 0; i < this.savedComposition.rouge; i++) this.urnePhysiqueFixe.push('rouge');
        for (let i = 0; i < this.savedComposition.jaune; i++) this.urnePhysiqueFixe.push('jaune');

        this.eventIndices = this.eventIndices.filter(id => this.issuesDefinition.some(iss => iss.id === id));
        if (this.eventIndices.length === 0) {
            this.eventIndices = [this.issuesDefinition[0].id];
        }
        this.calculateProbaA();
    }

    lancer() {
        this.total++;
        if (this.urnePhysiqueFixe.length === 0) {
            this.counts['vide']++;
            return { couleur: 'vide', indexPioche: -1, isSuccess: false };
        }
        
        const indexPioche = Math.floor(Math.random() * this.urnePhysiqueFixe.length);
        const idTire = this.urnePhysiqueFixe[indexPioche];
        if (this.counts[idTire] !== undefined) this.counts[idTire]++;
        
        const isSuccess = this.eventIndices.includes(idTire); 
        return { couleur: idTire, indexPioche: indexPioche, urneComplete: [...this.urnePhysiqueFixe], isSuccess: isSuccess };
    }

    getLocalCSS() {
        return `
            <style>
                .urn-bricks-container { display: flex; gap: 8px; align-items: center; justify-content: center; width: 100%; padding: 10px; flex-wrap: wrap; }
                .brick { 
                    width: 32px; height: 32px; border-radius: 50%; border: 2px solid rgba(255, 255, 255, 0.1); 
                    opacity: 0.5; position: relative; box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2); transition: all 0.2s ease;
                }
                .brick.color-bleue { background-color: var(--accent); }
                .brick.color-rouge { background-color: var(--danger); }
                .brick.color-jaune { background-color: #eab308; }
                .brick.picked-highlight { opacity: 1 !important; transform: scale(1.18) translateY(-5px); border-color: var(--text-main); box-shadow: 0 0 15px rgba(245, 158, 11, 0.8), inset 0 -4px 0 rgba(0,0,0,0.2); z-index: 10; }
                .brick.picked-highlight::before { 
                    content: "👇"; position: absolute; top: -32px; left: 50%; transform: translateX(-50%); font-size: 1.2rem; animation: bounceArrow 0.4s infinite alternate; 
                }
                @keyframes bounceArrow { from { transform: translateX(-50%) translateY(0); } to { transform: translateX(-50%) translateY(-4px); } }
                .result-badge-urne { height: 45px; min-width: 120px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-size: 1.4rem; font-weight: bold; white-space: nowrap; box-sizing: border-box; }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        if (!lastOutcome || !lastOutcome.urneComplete) {
            if (this.urnePhysiqueFixe.length === 0) return `${localCSS}<span style="color: var(--text-muted);">Urne vide.</span>`;
            const briquesHTML = this.urnePhysiqueFixe.map(c => `<div class="brick color-${c}" style="opacity:1;"></div>`).join('');
            return `${localCSS}<div class="urn-bricks-container">${briquesHTML}</div>`;
        }
        
        const briquesHTML = lastOutcome.urneComplete.map((c, index) => {
            const isPicked = (index === lastOutcome.indexPioche) ? 'picked-highlight' : '';
            return `<div class="brick color-${c} ${isPicked}"></div>`;
        }).join('');
        
        const traductionNom = { bleue: 'Bleue', rouge: 'Rouge', jaune: 'Jaune', vide: 'Vide' };
        const emoji = isEventVisible ? (lastOutcome.isSuccess ? ' ✅' : ' ❌') : '';

        return `
            ${localCSS}
            <div style="display: flex; align-items: center; justify-content: center; gap: 24px; height: 100%; width: 100%;">
                <div class="urn-bricks-container" style="flex: 1;">${briquesHTML}</div>
                <div class="result-badge-urne">
                    ${traductionNom[lastOutcome.couleur] || 'Vide'}${emoji}
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        const localCSS = this.getLocalCSS();
        const briquesHTML = this.urnePhysiqueFixe.map(c => `<div class="brick color-${c}" style="opacity:0.7;"></div>`).join('');
        return `${localCSS}<div style="display:flex; flex-direction:column; align-items:center; width:100%; gap:8px;"><div class="continuous-render-layout"><span>Submersion de tirages statistiques...</span><div class="animated-bars"><span></span><span></span><span></span><span></span></div></div><div class="urn-bricks-container" style="opacity: 0.4;">${briquesHTML}</div></div>`;
    }

    renderExperienceSettingsHTML() {
        return `
            <div><label>Nombre de boules Bleues 🟦 :</label><div class="slider-wrapper"><input type="range" id="u-bleue" class="slider-input" min="0" max="10" value="${this.savedComposition.bleue}"><span id="v-bleue" class="slider-value">${this.savedComposition.bleue}</span></div></div>
            <div><label>Nombre de boules Rouges 🟥 :</label><div class="slider-wrapper"><input type="range" id="u-rouge" class="slider-input" min="0" max="10" value="${this.savedComposition.rouge}"><span id="v-rouge" class="slider-value">${this.savedComposition.rouge}</span></div></div>
            <div><label>Nombre de boules Jaunes 🟨 :</label><div class="slider-wrapper"><input type="range" id="u-jaune" class="slider-input" min="0" max="10" value="${this.savedComposition.jaune}"><span id="v-jaune" class="slider-value">${this.savedComposition.jaune}</span></div></div>
        `;
    }

    bindExperienceSettings(container, onUpdateCallback) {
        const b = container.querySelector('#u-bleue'), r = container.querySelector('#u-rouge'), j = container.querySelector('#u-jaune');
        if (!b || !r || !j) return;
        const reconfig = () => {
            this.savedComposition = { bleue: parseInt(b.value), rouge: parseInt(r.value), jaune: parseInt(j.value) };
            container.querySelector('#v-bleue').textContent = b.value;
            container.querySelector('#v-rouge').textContent = r.value;
            container.querySelector('#v-jaune').textContent = j.value;
            
            this.configureUniverse();
            onUpdateCallback();
        };
        b.oninput = r.oninput = j.oninput = reconfig;
    }
}

/**
 * ========================================================
 * 5. ENFANT 4 : SIMULATION DE LA MARCHE ALÉATOIRE
 * ========================================================
 */
class MarcheAleatoireExperience extends BaseExperience {
    constructor() {
        super();
        this.savedPas = 2;
        this.configureUniverse();
    }

    configureUniverse() {
        this.total = 0; this.issuesDefinition = []; this.counts = {}; this.distribution = {};
        this.experienceDesc = "Particule partant du centre (0,0). Elle effectue strictement 2 déplacements aléatoires équiprobables (Haut, Bas, Gauche, Droite). L'issue étudie sa case d'arrivée exacte.";

        this.issuesDefinition = [
            { id: 'centre', label: '(0,0)' }, { id: 'nord',   label: '(0,2)' }, { id: 'sud',    label: '(0,-2)' },
            { id: 'ouest',  label: '(-2,0)' }, { id: 'est',    label: '(2,0)' }, { id: 'ne',     label: '(1,1)' },
            { id: 'no',     label: '(-1,1)' }, { id: 'so',     label: '(-1,-1)' }, { id: 'se',     label: '(1,-1)' }
        ];

        this.issuesDefinition.forEach(iss => this.counts[iss.id] = 0);

        this.distribution = {
            centre: 4 / 16, nord: 1 / 16, sud: 1 / 16, ouest: 1 / 16, est: 1 / 16,
            ne: 2 / 16, no: 2 / 16, so: 2 / 16, se: 2 / 16  
        };

        this.eventIndices = ['ne', 'no', 'so', 'se'];
        this.calculateProbaA();
    }

    lancer() {
        this.total++;
        let x = 0, y = 0;
        for (let i = 0; i < this.savedPas; i++) {
            const dir = Math.floor(Math.random() * 4);
            if (dir === 0) y++;
            else if (dir === 1) y--;
            else if (dir === 2) x--;
            else if (dir === 3) x++;
        }

        let idTire = '';
        if (x === 0 && y === 0) idTire = 'centre';
        else if (x === 0 && y === 2) idTire = 'nord';
        else if (x === 0 && y === -2) idTire = 'sud';
        else if (x === -2 && y === 0) idTire = 'ouest';
        else if (x === 2 && y === 0) idTire = 'est';
        else if (x === 1 && y === 1) idTire = 'ne';
        else if (x === -1 && y === 1) idTire = 'no';
        else if (x === -1 && y === -1) idTire = 'so';
        else if (x === 1 && y === -1) idTire = 'se';

        if (this.counts[idTire] !== undefined) this.counts[idTire]++;
        return { xFinal: x, yFinal: y, idCase: idTire, isSuccess: this.eventIndices.includes(idTire) };
    }

    getLocalCSS() {
        return `
            <style>
                .grid-marche { display: grid; grid-template-columns: repeat(5, 24px); grid-template-rows: repeat(5, 24px); gap: 3px; background: rgba(255,255,255,0.02); padding: 6px; border-radius: 6px; border: 1px solid var(--border-color); }
                .cell-marche { background: var(--bg-panel); border: 1px solid rgba(255,255,255,0.04); border-radius: 4px; position: relative; }
                .cell-marche.cible-possible { border: 1px dashed rgba(255, 255, 255, 0.15); }
                .cell-marche.centre { border: 1px dashed var(--accent); }
                .particule { width: 16px; height: 16px; background: var(--accent); border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); box-shadow: 0 0 10px var(--accent); z-index: 5; }
                .particule.succes { background: var(--warning); box-shadow: 0 0 10px var(--warning); }
                .result-badge-marche { height: 45px; padding: 0 15px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-size: 1.4rem; font-weight: bold; white-space: nowrap; box-sizing: border-box; }
                .coord-box { display: inline-block; width: 38px; text-align: center; }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        let pX = 0, pY = 0, xStr = "+0", yStr = "+0", emoji = "";

        if (lastOutcome) {
            pX = lastOutcome.xFinal; pY = lastOutcome.yFinal;
            emoji = isEventVisible ? (lastOutcome.isSuccess ? '✅' : '❌') : '';
            xStr = lastOutcome.xFinal >= 0 ? `+${lastOutcome.xFinal}` : lastOutcome.xFinal;
            yStr = lastOutcome.yFinal >= 0 ? `+${lastOutcome.yFinal}` : lastOutcome.yFinal;
        }

        let grilleHTML = `<div class="grid-marche">`;
        for (let y = 2; y >= -2; y--) {
            for (let x = -2; x <= 2; x++) {
                let classeCase = "", idCase = "";
                if (x === 0 && y === 0) { idCase = 'centre'; classeCase = "centre"; }
                else if (x === 0 && y === 2)  idCase = 'nord';
                else if (x === 0 && y === -2) idCase = 'sud';
                else if (x === -2 && y === 0) idCase = 'ouest';
                else if (x === 2 && y === 0)  idCase = 'est';
                else if (x === 1 && y === 1)   idCase = 'ne';
                else if (x === -1 && y === 1)  idCase = 'no';
                else if (x === -1 && y === -1) idCase = 'so';
                else if (x === 1 && y === -1)  idCase = 'se';

                if (idCase && idCase !== 'centre') classeCase = "cible-possible";

                let styleTrace = "";
                const nbrVisites = this.counts[idCase] || 0;
                if (nbrVisites > 0) {
                    const opacite = Math.min((nbrVisites / Math.max(this.total, 20)) * 3, 0.8);
                    styleTrace = `style="background-color: rgba(56, 189, 248, ${opacite});"`;
                }

                const hasParticule = (x === pX && y === pY) ? `<div class="particule ${(isEventVisible && lastOutcome?.isSuccess) ? 'succes' : ''}"></div>` : '';
                grilleHTML += `<div class="cell-marche ${classeCase}" ${styleTrace}>${hasParticule}</div>`;
            }
        }
        grilleHTML += `</div>`;

        return `
            ${localCSS}
            <div style="display: flex; align-items: center; justify-content: center; gap: 24px; height: 100%; width: 100%;">
                ${grilleHTML}
                <div class="result-badge-marche">
                    <span>(</span><span class="coord-box">${xStr}</span><span>,</span><span class="coord-box">${yStr}</span><span>)</span>
                    <span style="margin-left: 8px; display: inline-block; min-width: 20px;">${emoji}</span>
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        const localCSS = this.getLocalCSS();
        let grilleHTML = `<div class="grid-marche">`;
        for (let y = 2; y >= -2; y--) {
            for (let x = -2; x <= 2; x++) {
                let idCase = "";
                if (x === 0 && y === 0) idCase = 'centre';
                else if (x === 0 && y === 2)  idCase = 'nord';
                else if (x === 0 && y === -2) idCase = 'sud';
                else if (x === -2 && y === 0) idCase = 'ouest';
                else if (x === 2 && y === 0)  idCase = 'est';
                else if (x === 1 && y === 1)   idCase = 'ne';
                else if (x === -1 && y === 1)  idCase = 'no';
                else if (x === -1 && y === -1) idCase = 'so';
                else if (x === 1 && y === -1)  idCase = 'se';

                let styleTrace = "";
                const nbrVisites = this.counts[idCase] || 0;
                if (nbrVisites > 0) {
                    const opacite = Math.min((nbrVisites / Math.max(this.total, 100)) * 3, 0.8);
                    styleTrace = `style="background-color: rgba(56, 189, 248, ${opacite});"`;
                }
                grilleHTML += `<div class="cell-marche" ${styleTrace}></div>`;
            }
        }
        grilleHTML += `</div>`;

        return `
            ${localCSS}
            <div style="display: flex; align-items: center; justify-content: center; gap: 24px; height: 100%; width: 100%;">
                ${grilleHTML}
                <div style="font-size: 0.9rem; color: var(--accent); max-width: 150px; line-height: 1.3;">
                    🧭 Accumulation... Observez les zones de diffusion se stabiliser.
                </div>
            </div>
        `;
    }

    renderExperienceSettingsHTML() {
        return `<p style="font-size:0.85rem; color:var(--text-muted);">Simulation géométrique stricte bloquée à 2 pas pour étudier la diffusion sur les 9 cases accessibles.</p>`;
    }
    bindExperienceSettings(container, onUpdateCallback) {}
}

/**
 * ========================================================
 * 6. ENFANT 5 : SIMULATION DU LANCER DE N PIÈCES
 * ========================================================
 */
class PiecesExperience extends BaseExperience {
    constructor() {
        super();
        this.savedN = 4; 
        this.configureUniverse();
    }

    configureUniverse() {
        this.total = 0; this.issuesDefinition = []; this.counts = {}; this.distribution = {};
        this.experienceDesc = `Simulation du lancer simultané de ${this.savedN} pièces de monnaie équilibrées. La variable d'étude compte le nombre de PILES obtenus.`;
        
        const totalCombinaisons = Math.pow(2, this.savedN);
        const coeffBinomial = (n, k) => {
            if (k < 0 || k > n) return 0;
            if (k === 0 || k === n) return 1;
            let prod = 1;
            for (let i = 1; i <= k; i++) prod = prod * (n - i + 1) / i;
            return Math.round(prod);
        };

        for (let k = 0; k <= this.savedN; k++) {
            const idStr = `p_${k}`;
            this.issuesDefinition.push({ id: idStr, label: `${k} P` });
            this.counts[idStr] = 0;
            this.distribution[idStr] = coeffBinomial(this.savedN, k) / totalCombinaisons;
        }

        const seuilMoitie = Math.ceil(this.savedN / 2);
        this.eventIndices = this.issuesDefinition
            .filter(iss => parseInt(iss.label) >= seuilMoitie)
            .map(i => i.id);

        this.calculateProbaA();
    }

    lancer() {
        this.total++;
        let nbPiles = 0;
        let piecesVisuelles = [];

        for (let i = 0; i < this.savedN; i++) {
            if (Math.random() < 0.5) {
                nbPiles++;
                piecesVisuelles.push('<span class="coin pile">P</span>');
            } else {
                piecesVisuelles.push('<span class="coin face">F</span>');
            }
        }

        const idTire = `p_${nbPiles}`;
        this.counts[idTire]++;
        return { idCase: idTire, piecesHTML: piecesVisuelles.join(''), totalPiles: nbPiles, isSuccess: this.eventIndices.includes(idTire) };
    }

    getLocalCSS() {
        return `
            <style>
                .step-render-layout { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-width: 280px; height: 100%; }
                .coins-container { display: flex; gap: 6px; justify-content: center; flex-wrap: wrap; }
                .coin { width: 36px; height: 36px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 1.1rem; border: 2px solid rgba(255,255,255,0.2); box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2); }
                .coin.pile { background: #eab308; color: #451a03; border-color: #fef08a; }
                .coin.face { background: #94a3b8; color: #0f172a; border-color: #cbd5e1; }
                .result-badge { height: 45px; padding: 0 15px; display: flex; align-items: center; justify-content: center; border-radius: 6px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); font-size: 1.3rem; font-weight: bold; white-space: nowrap; box-sizing: border-box; }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        if (!lastOutcome) {
            return `${localCSS}<div class="step-render-layout"><span style="color: var(--text-muted); font-weight: normal;">En attente de lancer...</span></div>`;
        }
        const emoji = isEventVisible ? (lastOutcome.isSuccess ? ' ✅' : ' ❌') : '';
        return `
            ${localCSS}
            <div class="step-render-layout">
                <div class="coins-container">${lastOutcome.piecesHTML}</div>
                <div class="result-badge">
                    ${lastOutcome.totalPiles} Pile${lastOutcome.totalPiles > 1 ? 's' : ''}${emoji}
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        return `<div class="continuous-render-layout"><span>⚡ Flambée de tirages binomiaux en cours (Loi des grands nombres)...</span><div class="animated-bars"><span></span><span></span><span></span><span></span></div></div>`;
    }

    renderExperienceSettingsHTML() {
        return `<div><label>Nombre de pièces ($n$) :</label><div class="slider-wrapper"><input type="range" id="slider-pieces-n" class="slider-input" min="1" max="10" step="1" value="${this.savedN}"><span id="value-pieces-n" class="slider-value">${this.savedN}</span></div></div>`;
    }

    bindExperienceSettings(container, onUpdateCallback) {
        const s = container.querySelector('#slider-pieces-n');
        if (!s) return;
        s.oninput = () => {
            this.savedN = parseInt(s.value);
            container.querySelector('#value-pieces-n').textContent = s.value;
            this.configureUniverse();
            onUpdateCallback();
        };
    }
}

/**
 * ========================================================
 * 7. MOTEUR D'AIGUILLAGE ET GESTIONNAIRE GLOBAL
 * ========================================================
 */
const EXPERIENCES_MAP = {
    'des': SommeDeuxDesExperience,
    'produit': ProduitDeuxDesExperience,
    'urne': UrneMulticoloreExperience,
    'marche': MarcheAleatoireExperience,
    'pieces': PiecesExperience 
};

const expSelect = document.getElementById('experience-select');
const settingsViewport = document.getElementById('dynamic-settings-viewport');
const modalOverlay = document.getElementById('modal-overlay');

const btnModeStep = document.getElementById('btn-mode-step');
const btnModeInfinite = document.getElementById('btn-mode-infinite');
const heightSlider = document.getElementById('height-slider');
const heightValue = document.getElementById('height-value');
const mainRenderViewport = document.getElementById('main-render-viewport');
const btnPlay = document.getElementById('control-play');
const btnNext = document.getElementById('control-next');
const totalCountEl = document.getElementById('total-count');
const chartGrid = document.getElementById('chart-container');
const tableBody = document.getElementById('table-body');
const eventFill = document.getElementById('event-fill');
const eventMarker = document.getElementById('event-marker');

const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');
const batchSlider = document.getElementById('batch-slider');
const batchValue = document.getElementById('batch-value');
const btnOpenEventSettings = document.querySelector('.btn-toggle-event-settings');

let exp = null;
let phetUnitMode = 'frequency';
let playing = false;
let interval = null;
let showTheory = false; 
let échantillonLancers = []; 

const btnTheoryShow = document.getElementById('btn-theory-show');
const btnTheoryHide = document.getElementById('btn-theory-hide');

if (btnTheoryShow) {
    btnTheoryShow.onclick = function() {
        showTheory = true;
        this.classList.add('active');
        if (btnTheoryHide) btnTheoryHide.classList.remove('active');
        rafraichirModalesEtParametres(); 
        updateUI();
    };
}

if (btnTheoryHide) {
    btnTheoryHide.onclick = function() {
        showTheory = false;
        this.classList.add('active');
        if (btnTheoryShow) btnTheoryShow.classList.remove('active');
        rafraichirModalesEtParametres(); 
        updateUI();
    };
}

function buildCentralSettings() {
    stop();
    if (expSelect) exp = new EXPERIENCES_MAP[expSelect.value]();
    échantillonLancers = [];
    updateUI();
}
if (expSelect) expSelect.onchange = buildCentralSettings;

function renderModalContent(type) {
    if (!exp) return;
    const header = document.querySelector('.modal-header h3');
    if (!header) return;
    
    const rafraichirApresConfiguration = () => {
        stop(); 
        if (type === 'experience') échantillonLancers = []; 
        exp.calculateProbaA(); 
        updateUI();            
    };

    if (type === 'experience') {
        header.textContent = "Configuration du modèle";
        settingsViewport.innerHTML = exp.renderExperienceSettingsHTML();
        exp.bindExperienceSettings(settingsViewport, rafraichirApresConfiguration);
    } else {
        header.textContent = "Définition de l'événement A";
        settingsViewport.innerHTML = exp.renderEventSettingsHTML(showTheory);
        exp.bindEventSettings(settingsViewport, rafraichirApresConfiguration);
    }
}

const btnOpenSettings = document.getElementById('btn-open-settings');
if (btnOpenSettings) {
    btnOpenSettings.onclick = () => { renderModalContent('experience'); if(modalOverlay) modalOverlay.classList.remove('hidden'); };
}
if (btnOpenEventSettings) {
    btnOpenEventSettings.onclick = () => { renderModalContent('event'); if(modalOverlay) modalOverlay.classList.remove('hidden'); };
}
const btnCloseSettings = document.getElementById('btn-close-settings');
if (btnCloseSettings) {
    btnCloseSettings.onclick = () => { if(modalOverlay) modalOverlay.classList.add('hidden'); };
}
if (modalOverlay) {
    modalOverlay.onclick = (e) => { if(e.target === modalOverlay) modalOverlay.classList.add('hidden'); };
}

function rafraichirModalesEtParametres() {
    if (!exp) return;
    const modalHeader = document.querySelector('.modal-header h3');
    if (modalOverlay && !modalOverlay.classList.contains('hidden') && modalHeader && modalHeader.textContent === "Définition de l'événement A") {
        settingsViewport.innerHTML = exp.renderEventSettingsHTML(showTheory);
        exp.bindEventSettings(settingsViewport, () => { stop(); updateUI(); });
    }
}

function updateUI(lastOutcome = null) {
    if (!exp) return; 
    const stats = exp.getStats();
    const isContinuousModeActive = btnModeInfinite && btnModeInfinite.classList.contains('active');
    
    const displayDesc = document.getElementById('display-desc');
    if (displayDesc) displayDesc.textContent = exp.experienceDesc;
    if (totalCountEl) totalCountEl.textContent = stats.total.toLocaleString();
    
    const eventContainer = document.getElementById('event-container');
    const isEventSectionVisible = eventContainer ? !eventContainer.classList.contains('hidden') : true;
    
    if (playing && isContinuousModeActive) {
        if (mainRenderViewport) mainRenderViewport.innerHTML = exp.renderContinuousHTML();
    } else {
        if (mainRenderViewport) mainRenderViewport.innerHTML = exp.renderStepHTML(lastOutcome, isEventSectionVisible);
    }

    const displaySet = document.getElementById('display-set');
    if (displaySet) {
        if (exp.eventIndices.length === 0) {
            displaySet.textContent = "A = ∅ (Événement impossible)";
        } else {
            displaySet.textContent = `A = { ${stats.issues.filter(i => i.inEvent).map(i => i.label).join(" ; ")} }`;
        }
    }

    if (eventFill) eventFill.style.width = `${stats.freqA * 100}%`;
    
    if (showTheory && exp.eventIndices.length > 0 && isEventSectionVisible) {
        if (eventMarker) { eventMarker.style.display = "block"; eventMarker.style.left = `${stats.probaA * 100}%`; }
        if (eventFill) eventFill.textContent = `Fréq : ${(stats.freqA * 100).toFixed(1)}% | P(A) : ${(stats.probaA * 100).toFixed(1)}%`;
    } else {
        if (eventMarker) eventMarker.style.display = "none"; 
        if (eventFill) eventFill.textContent = `Fréq : ${(stats.freqA * 100).toFixed(1)}%`;
    }

    const maxEffectifConstate = Math.max(...stats.issues.map(i => i.count), 1);
    const maxFreqEchelleGraphique = heightSlider ? (parseFloat(heightSlider.value) / 100) : 0.4;

    if (chartGrid) {
        chartGrid.innerHTML = stats.issues.map(iss => {
            let heightPercent = phetUnitMode === 'frequency' ? (iss.freq / maxFreqEchelleGraphique) * 100 : (iss.count / maxEffectifConstate) * 100;
            let valueStr = phetUnitMode === 'frequency' ? (iss.freq * 100).toFixed(1) + "%" : iss.count.toString();
            const applyOrangeColor = (iss.inEvent && isEventSectionVisible) ? 'in-event' : '';
            return `<div class="chart-col"><div class="chart-bar ${applyOrangeColor}" style="height: ${stats.total > 0 ? Math.min(heightPercent, 90) : 0}%"><div class="chart-col-value">${stats.total > 0 ? valueStr : ''}</div></div><div class="col-label">${iss.label.replace(' 🟦','').replace(' 🟥','').replace(' 🟨','')}</div></div>`;
        }).join('');
    }

    if (tableBody) {
        tableBody.innerHTML = stats.issues.map(iss => {
            const probaAFFICHEE = showTheory ? `${(iss.proba * 100).toFixed(1)}%` : `<span style="opacity: 0.3;">??</span>`;
            return `
                <tr>
                    <td style="font-weight:600; color:${(iss.inEvent && isEventSectionVisible) ? 'var(--warning)' : 'var(--text-main)'}">${iss.label}</td>
                    <td>${iss.count.toLocaleString()}</td>
                    <td>${(iss.freq * 100).toFixed(1)}%</td>
                    <td style="color:var(--text-muted); font-weight: bold;">${probaAFFICHEE}</td>
                </tr>
            `;
        }).join('');
    }

 const sampleGridEl = document.getElementById('sample-grid');
    if (sampleGridEl) {
        let casesHTML = "";
        for (let i = 0; i < 100; i++) {
            if (i < échantillonLancers.length) {
                const item = échantillonLancers[i];
                
                // 1. On retrouve l'ID de l'issue correspondante dans l'univers actuel
                const correspondance = exp.issuesDefinition.find(iss => 
                    iss.label === item.valeur.toString() || 
                    iss.label === `${item.valeur} P` ||
                    iss.id === item.valeur
                );
                
                // 2. On vérifie en temps réel si cette issue fait partie de l'événement A reconfiguré
                const estDansEvenementActuel = correspondance ? exp.eventIndices.includes(correspondance.id) : item.inEvent;
                
                const classeSucces = (estDansEvenementActuel && isEventSectionVisible) ? "sample-cell-success" : "";
                casesHTML += `<div class="sample-cell ${classeSucces}">${item.valeur}</div>`;
            } else {
                casesHTML += `<div class="sample-cell empty">•</div>`;
            }
        }
        sampleGridEl.innerHTML = casesHTML;
    }

}

function runSimulation(batchSize) {
    let last = null;
    for(let i = 0; i < batchSize; i++) {
        last = exp.lancer();
        if (échantillonLancers.length < 100 && last) {
            let valeurBrute = "";
            if (last.totalSomme !== undefined) valeurBrute = last.totalSomme;
            else if (last.totalProduit !== undefined) valeurBrute = last.totalProduit;
            else if (last.couleur !== undefined) valeurBrute = last.couleur === 'bleue' ? '🟦' : last.couleur === 'rouge' ? '🟥' : last.couleur === 'jaune' ? '🟨' : '❌';
            else if (last.idCase !== undefined) valeurBrute = exp.issuesDefinition.find(i => i.id === last.idCase)?.label || "?";

            échantillonLancers.push({ valeur: valeurBrute, inEvent: last.isSuccess });
        }
    }
    
    if (échantillonLancers.length > 0) {
        échantillonLancers.forEach(item => {
            const correspondance = exp.issuesDefinition.find(iss => 
                iss.label === item.valeur.toString() || 
                iss.label === `${item.valeur} P` ||
                iss.id === item.valeur
            );
            if (correspondance) item.inEvent = exp.eventIndices.includes(correspondance.id);
        });
    }
    updateUI(last);
}

if (batchSlider) {
    batchSlider.oninput = function() {
        if (batchValue) batchValue.textContent = parseInt(this.value).toLocaleString();
        if (playing && btnModeInfinite && btnModeInfinite.classList.contains('active')) relancerInterval();
    };
}

if (btnNext) {
    btnNext.onclick = function() { 
        stop(); 
        const isModeContinuActive = btnModeInfinite && btnModeInfinite.classList.contains('active');
        runSimulation(isModeContinuActive ? (batchSlider ? parseInt(batchSlider.value) : 100) : 1);
    };
}

if (speedSlider) {
    speedSlider.oninput = function() {
        if (speedValue) speedValue.textContent = this.value + " ms";
        if (playing && btnModeInfinite && !btnModeInfinite.classList.contains('active')) relancerInterval();
    };
}

function relancerInterval() {
    clearInterval(interval);
    const isInf = btnModeInfinite && btnModeInfinite.classList.contains('active');
    interval = setInterval(() => runSimulation(isInf ? (batchSlider ? parseInt(batchSlider.value) : 100) : 1), isInf ? 16 : (speedSlider ? parseInt(speedSlider.value) : 500));
}

if (btnPlay) {
    btnPlay.onclick = function() {
        if (playing) { stop(); } else {
            playing = true; 
            this.textContent = "Pause ⏸️"; 
            this.classList.add('playing');
            relancerInterval(); 
        }
    };
}

if (btnModeStep) {
    btnModeStep.onclick = function() {
        this.classList.add('active');
        if (btnModeInfinite) btnModeInfinite.classList.remove('active');
        if (playing) relancerInterval();
    };
}

if (btnModeInfinite) {
    btnModeInfinite.onclick = function() {
        this.classList.add('active');
        if (btnModeStep) btnModeStep.classList.remove('active');
        if (playing) relancerInterval();
    };
}

function stop() { 
    playing = false; 
    if (btnPlay) { btnPlay.textContent = "Play ▶️"; btnPlay.classList.remove('playing'); }
    clearInterval(interval); 
}

const btnReset = document.getElementById('control-reset');
if (btnReset) {
    btnReset.onclick = () => { stop(); if (exp) exp.configureUniverse(); échantillonLancers = []; updateUI(); };
}

if (heightSlider) {
    heightSlider.oninput = function() { 
        if (heightValue) heightValue.textContent = this.value + "%"; 
        updateUI(); 
    };
}

const btnPhetCount = document.getElementById('btn-phet-count');
const btnPhetFreq = document.getElementById('btn-phet-freq');
const wrapperHeightSlider = document.getElementById('wrapper-height-slider');

if (btnPhetCount) {
    btnPhetCount.onclick = function() { 
        phetUnitMode = 'count'; 
        this.classList.add('active'); 
        if (btnPhetFreq) btnPhetFreq.classList.remove('active'); 
        if (wrapperHeightSlider) { wrapperHeightSlider.style.opacity = '0.25'; wrapperHeightSlider.style.pointerEvents = 'none'; }
        updateUI(); 
    };
}

if (btnPhetFreq) {
    btnPhetFreq.onclick = function() { 
        phetUnitMode = 'frequency'; 
        this.classList.add('active'); 
        if (btnPhetCount) btnPhetCount.classList.remove('active'); 
        if (wrapperHeightSlider) { wrapperHeightSlider.style.opacity = '1'; wrapperHeightSlider.style.pointerEvents = 'auto'; }
        updateUI(); 
    };
}

function brancherAccordeon(btnId, containerId) {
    const bouton = document.getElementById(btnId);
    const conteneur = document.getElementById(containerId);
    if (bouton && conteneur) {
        bouton.onclick = function() {
            const estMasque = conteneur.classList.toggle('hidden');
            this.textContent = estMasque ? `👁️ Afficher` : `🙈 Masquer`;
            updateUI();
        };
    }
}

brancherAccordeon('btn-toggle-sample', 'container-sample-view');
brancherAccordeon('btn-toggle-chart', 'chart-container');
brancherAccordeon('btn-toggle-event', 'event-container');
brancherAccordeon('btn-toggle-table', 'table-container');

buildCentralSettings();