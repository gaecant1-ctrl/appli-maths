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

    // Calcule la probabilité théorique stricte de l'événement A
    calculateProbaA() { 
        this.probaA = this.eventIndices.reduce((sum, id) => sum + (this.distribution[id] || 0), 0); 
    }

    // Retourne les statistiques globales requises par l'UI (Calcul dynamique de l'événement)
    getStats() {
        // --- CALCUL DYNAMIQUE DE L'EFFECTIF DE L'ÉVÉNEMENT ---
        // On fait la somme des lancers uniquement pour les issues présentes dans this.eventIndices
        const effectifTotalEventA = this.eventIndices.reduce((sum, id) => sum + (this.counts[id] || 0), 0);

        return {
            total: this.total, 
            // La fréquence est calculée directement sur la somme des issues de l'événement
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

    // Rendu générique de la liste des cases à cocher de l'événement A (Corrigé pour masquer les %)
    renderEventSettingsHTML(showTheoryActive = true) {
        let html = `<p style="font-size:0.8rem; color:var(--text-muted); margin-bottom:10px;">Cochez les issues de l'événement A :</p>`;
        html += `<div class="outcome-selection-list">`;
        this.issuesDefinition.forEach(iss => {
            const isChecked = this.eventIndices.includes(iss.id) ? 'checked' : '';
            
            // --- MASQUAGE INTÉGRÉ ÉVALUÉ ICI ---
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

    // Écouteur générique pour la modale de l'événement A
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

    // Méthodes abstraites obligatoires à implémenter par les enfants
    configureUniverse() { throw new Error("À implémenter."); }
    lancer() { throw new Error("À implémenter."); }
    renderStepHTML(lastOutcome) { throw new Error("À implémenter."); }
    renderContinuousHTML() { throw new Error("À implémenter."); }
    renderExperienceSettingsHTML() { throw new Error("À implémenter."); }
    bindExperienceSettings(container, onUpdateCallback) { throw new Error("À implémenter."); }
}

/**
 * ========================================================
 * 2. ENFANT 1 : SIMULATION DES DEUX DÉS
 * ========================================================
 */
class SommeDeuxDesExperience extends BaseExperience {
    constructor() {
        super();
        this.savedSeuil = 7; // Persistance interne du paramètre
        this.configureUniverse();
    }

    configureUniverse() {
        this.total = 0; this.issuesDefinition = []; this.counts = {}; this.distribution = {};
        this.experienceDesc = "Simulation du lancer simultané de deux dés cubiques équilibrés à 6 faces. La variable d'étude suit la somme des valeurs obtenues.";
        
        for (let s = 2; s <= 12; s++) {
            const idStr = `s_${s}`; 
            this.issuesDefinition.push({ id: idStr, label: `${s}` }); 
            this.counts[idStr] = 0;
            
            let combinaisons = 0;
            for (let d1 = 1; d1 <= 6; d1++) { 
                for (let d2 = 1; d2 <= 6; d2++) { if (d1 + d2 === s) combinaisons++; } 
            }
            this.distribution[idStr] = combinaisons / 36;
        }

        // Configuration de l'événement par défaut (Somme >= seuil) si vide
        if (this.eventIndices.length === 0) {
            this.eventIndices = this.issuesDefinition.filter(iss => parseInt(iss.label) >= this.savedSeuil).map(i => i.id);
        }
        this.calculateProbaA();
    }

    lancer() {
        this.total++;
        const deBleu = Math.floor(Math.random() * 6) + 1; 
        const deRouge = Math.floor(Math.random() * 6) + 1; 
        const somme = deBleu + deRouge;
        const idTire = `s_${somme}`; 
        this.counts[idTire]++;
        
        const isSuccess = this.eventIndices.includes(idTire); 
        return { deBleu: deBleu, deRouge: deRouge, totalSomme: somme, isSuccess: isSuccess };
    }

    getLocalCSS() {
        return `
            <style>
                .step-render-layout { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    gap: 12px; 
                    font-size: 1.4rem; 
                    font-weight: bold; 
                    min-width: 280px; 
                    height: 100%;
                }
                
                .mini-cube { 
                    background: var(--bg-panel); 
                    width: 45px;  
                    height: 45px; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px; 
                    color: var(--text-main); 
                    font-size: 1.4rem; 
                }

                .mini-cube.de-bleu {
                    border: 2px solid #38bdf8; 
                    box-shadow: 0 0 8px rgba(56, 189, 248, 0.2);
                }

                .mini-cube.de-rouge {
                    border: 2px solid #ef4444; 
                    box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
                }
                
                .result-badge { 
                    height: 45px;
                    width: 95px; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px; 
                    background: rgba(255,255,255,0.05); 
                    border: 1px solid var(--border-color); 
                    font-size: 1.4rem; 
                    white-space: nowrap;
                    box-sizing: border-box;
                }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        if (!lastOutcome) {
            return `
                ${localCSS}
                <div class="step-render-layout">
                    <span style="color: var(--text-muted); font-weight: normal;">En attente de lancer...</span>
                </div>
            `;
        }

        const showSuccess = isEventVisible && lastOutcome.isSuccess;
        const emoji = isEventVisible ? (lastOutcome.isSuccess ? ' ✅' : ' ❌') : '';

        return `
            ${localCSS}
            <div class="step-render-layout">
                <div class="mini-cube de-bleu">${lastOutcome.deBleu}</div>
                <div style="font-size: 1.5rem; color: var(--accent); line-height: 45px;">+</div>
                <div class="mini-cube de-rouge">${lastOutcome.deRouge}</div>
                <div style="font-size: 1.5rem; color: var(--accent); line-height: 45px;">=</div>
                <div class="result-badge ${showSuccess ? 'success-active' : ''}">
                    ${lastOutcome.totalSomme}${emoji}
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        return `
            <div class="continuous-render-layout">
                <span>⚡ Injection intensive de lancers de dés (Loi des grands nobles)...</span>
                <div class="animated-bars"><span></span><span></span><span></span><span></span></div>
            </div>
        `;
    }

    renderExperienceSettingsHTML() {
        return `
            <div>
                <label>Seuil de la Somme visée (Somme ≥ X) :</label>
                <div class="slider-wrapper">
                    <input type="range" id="slider-somme-cible" class="slider-input" min="2" max="12" value="${this.savedSeuil}">
                    <span id="value-somme-cible" class="slider-value">${this.savedSeuil}</span>
                </div>
            </div>`;
    }

    bindExperienceSettings(container, onUpdateCallback) {
        const s = container.querySelector('#slider-somme-cible');
        s.oninput = () => {
            this.savedSeuil = parseInt(s.value);
            container.querySelector('#value-somme-cible').textContent = s.value;
            this.eventIndices = this.issuesDefinition.filter(iss => parseInt(iss.label) >= this.savedSeuil).map(i => i.id);
            this.configureUniverse();
            onUpdateCallback();
        };
    }
}

/**
 * ========================================================
 * 3. ENFANT 2 : SIMULATION DU PRODUIT DE DEUX DÉS (SOMME DES CHIFFRES)
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

        if (this.eventIndices.length === 0) {
            this.eventIndices = this.issuesDefinition.filter(iss => parseInt(iss.label) >= this.savedSeuilProduit).map(i => i.id);
        }
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
                .step-render-layout { 
                    display: flex; 
                    align-items: center; 
                    justify-content: center;
                    gap: 12px; 
                    font-size: 1.4rem; 
                    font-weight: bold; 
                    min-width: 360px; 
                    height: 100%;
                }
                .mini-cube { 
                    background: var(--bg-panel); 
                    width: 45px;  
                    height: 45px; 
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px; 
                    color: var(--text-main); 
                    font-size: 1.4rem; 
                }
                .mini-cube.de-bleu {
                    border: 2px solid #38bdf8;
                    box-shadow: 0 0 8px rgba(56, 189, 248, 0.2);
                }
                .mini-cube.de-rouge {
                    border: 2px solid #ef4444;
                    box-shadow: 0 0 8px rgba(239, 68, 68, 0.2);
                }
                
                /* --- ISOLATION ET ANCRAGE DES ÉLÉMENTS (ÉGALITÉ STRICTE) --- */
                .op-sign {
                    font-size: 1.4rem; 
                    color: var(--accent); 
                    line-height: 45px;
                    width: 20px;
                    text-align: center;
                }
                
                /* Badge pour le produit brut 'c' (juste après le =) */
                .result-badge { 
                    height: 45px;
                    width: 55px; /* Largeur fixe parfaite pour "36" ou "3" au centre */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px; 
                    background: rgba(255,255,255,0.05); 
                    border: 1px solid var(--border-color); 
                    font-size: 1.3rem; 
                    box-sizing: border-box;
                }

                .box-fleche-arr {
                    display: inline-block;
                    width: 25px;
                    text-align: center;
                    color: var(--text-muted);
                    font-size: 1.1rem;
                }

                /* Badge pour le résultat réduit final 'd' */
                .reduction-badge {
                    height: 45px;
                    width: 75px; /* Intègre le chiffre fixe et l'emoji de validation */
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px; 
                    background: rgba(255,255,255,0.02); 
                    border: 1px solid rgba(255, 255, 255, 0.08); 
                    font-size: 1.3rem; 
                    box-sizing: border-box;
                    padding-left: 5px;
                }

                .box-num-d {
                    display: inline-block;
                    width: 20px;
                    text-align: center;
                }

                .box-emoji {
                    display: inline-block;
                    width: 24px;
                    text-align: right;
                    margin-left: 4px;
                }
            </style>
        `;
    }

renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        if (!lastOutcome) {
            return `
                ${localCSS}
                <div class="step-render-layout">
                    <span style="color: var(--text-muted); font-weight: normal;">En attente de lancer...</span>
                </div>
            `;
        }

        const showSuccess = isEventVisible && lastOutcome.isSuccess;
        const emoji = isEventVisible ? (lastOutcome.isSuccess ? ' ✅' : ' ❌') : '';
        
        // Calcul du produit brut (c)
        const produitBrut = lastOutcome.deBleu * lastOutcome.deRouge;
        
        return `
            ${localCSS}
            <div class="step-render-layout">
                <div class="mini-cube de-bleu">${lastOutcome.deBleu}</div>
                
                <div class="op-sign">✕</div>
                
                <div class="mini-cube de-rouge">${lastOutcome.deRouge}</div>
                
                <div class="op-sign">=</div>
                
                <div class="result-badge">${produitBrut}</div>
                
                <span class="box-fleche-arr">➔</span>
                
                <div class="reduction-badge ${showSuccess ? 'success-active' : ''}">
                    <span class="box-num-d">${lastOutcome.totalProduit}</span>
                    <span class="box-emoji">${emoji}</span>
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        return `
            <div class="continuous-render-layout">
                <span>⚡ Calcul intensif de la somme des chiffres du produit...</span>
                <div class="animated-bars"><span></span><span></span><span></span><span></span></div>
            </div>
        `;
    }

    renderExperienceSettingsHTML() {
        return `
            <div>
                <label>Seuil du résultat visé (Résultat ≥ X) :</label>
                <div class="slider-wrapper">
                    <input type="range" id="slider-produit-cible" class="slider-input" min="1" max="9" value="${this.savedSeuilProduit}">
                    <span id="value-produit-cible" class="slider-value">${this.savedSeuilProduit}</span>
                </div>
            </div>`;
    }

    bindExperienceSettings(container, onUpdateCallback) {
        const s = container.querySelector('#slider-produit-cible');
        if (!s) return;
        s.oninput = () => {
            this.savedSeuilProduit = parseInt(s.value);
            container.querySelector('#value-produit-cible').textContent = s.value;
            this.eventIndices = this.issuesDefinition.filter(iss => parseInt(iss.label) >= this.savedSeuilProduit).map(i => i.id);
            this.configureUniverse();
            onUpdateCallback();
        };
    }
}

/**
 * ========================================================
 * 4. ENFANT 3 : SIMULATION DE L'URNE AUX BRIQUES COLORÉES
 * ========================================================
 */
class UrneMulticoloreExperience extends BaseExperience {
    constructor() {
        super();
        this.savedComposition = { bleue: 3, rouge: 2, jaune: 5 }; 
        this.configureUniverse();
    }

    configureUniverse() {
        this.total = 0; 
        this.issuesDefinition = []; 
        this.counts = {}; 
        this.distribution = {};
        
        const totalBoules = this.savedComposition.bleue + this.savedComposition.rouge + this.savedComposition.jaune;
        this.experienceDesc = `Tirage d'une boule dans une urne colorée. Effectif total actuel : ${totalBoules} boules.`;

        // 1. Définition brute de toutes les issues potentielles
        const issuesPotentielles = [
            { id: 'bleue', label: 'Bleue 🟦' },
            { id: 'rouge', label: 'Rouge 🟥' },
            { id: 'jaune', label: 'Jaune 🟨' }
        ];

        // 2. FILTRAGE DYNAMIQUE : On ne garde QUE les couleurs dont l'effectif est strictement supérieur à 0
        this.issuesDefinition = issuesPotentielles.filter(iss => this.savedComposition[iss.id] > 0);

        // Si l'urne est complètement vide (sécurité), on remet une issue par défaut pour éviter un crash graphique
        if (this.issuesDefinition.length === 0) {
            this.issuesDefinition = [{ id: 'vide', label: 'Vide 🫙' }];
            this.counts['vide'] = 0;
            this.distribution['vide'] = 1;
        } else {
            // Initialisation normale des compteurs et de la distribution pour les couleurs actives
            this.issuesDefinition.forEach(iss => {
                this.counts[iss.id] = 0;
                this.distribution[iss.id] = this.savedComposition[iss.id] / totalBoules;
            });
        }

        // 3. Construction de la structure physique du sac de billes
        this.urnePhysiqueFixe = [];
        for (let i = 0; i < this.savedComposition.bleue; i++) this.urnePhysiqueFixe.push('bleue');
        for (let i = 0; i < this.savedComposition.rouge; i++) this.urnePhysiqueFixe.push('rouge');
        for (let i = 0; i < this.savedComposition.jaune; i++) this.urnePhysiqueFixe.push('jaune');

        // 4. Nettoyage et mise à jour de l'événement A
        // On filtre les indices de l'événement pour ne garder que ceux de la couleur encore présente
        this.eventIndices = this.eventIndices.filter(id => this.issuesDefinition.some(iss => iss.id === id));
        
        // Si l'événement se retrouve vide après élimination d'une couleur, on applique un choix par défaut logique
        if (this.eventIndices.length === 0) {
            // Par exemple, on cible la première couleur disponible dans la liste active
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
        
        // Sécurité au cas où un résidu de compteur traîne
        if (this.counts[idTire] !== undefined) {
            this.counts[idTire]++;
        }
        
        const isSuccess = this.eventIndices.includes(idTire); 
        return { 
            couleur: idTire, 
            indexPioche: indexPioche, 
            urneComplete: [...this.urnePhysiqueFixe], 
            isSuccess: isSuccess 
        };
    }

    getLocalCSS() {
        return `
            <style>
                .urn-bricks-container { display: flex; gap: 8px; align-items: center; justify-content: center; width: 100%; padding: 10px; flex-wrap: wrap; }
                .brick { width: 32px; height: 45px; border-radius: 6px; border: 2px solid rgba(255, 255, 255, 0.1); transition: all 0.2s ease; opacity: 0.5; position: relative; box-shadow: inset 0 -4px 0 rgba(0,0,0,0.2); }
                .brick.color-bleue { background-color: var(--accent); }
                .brick.color-rouge { background-color: var(--danger); }
                .brick.color-jaune { background-color: #eab308; }
                .brick.picked-highlight { opacity: 1 !important; transform: scale(1.18) translateY(-5px); border-color: var(--text-main); box-shadow: 0 0 15px rgba(245, 158, 11, 0.8), inset 0 -4px 0 rgba(0,0,0,0.2); z-index: 10; }
                .brick.picked-highlight::before { content: "👇"; position: absolute; top: -28px; left: 50%; transform: translateX(-50%); font-size: 1.2rem; animation: bounceArrow 0.4s infinite alternate; }
                @keyframes bounceArrow { from { transform: translateX(-50%) translateY(0); } to { transform: translateX(-50%) translateY(-4px); } }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        
        const badgeStyle = `
            <style>
                .result-badge-urne {
                    height: 45px;
                    min-width: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid var(--border-color);
                    font-size: 1.4rem;
                    font-weight: bold;
                    white-space: nowrap;
                    box-sizing: border-box;
                    transition: all 0.2s ease;
                }
            </style>
        `;

        if (!lastOutcome || !lastOutcome.urneComplete) {
            if (this.urnePhysiqueFixe.length === 0) return `${localCSS}${badgeStyle}<span style="color: var(--text-muted);">Urne vide.</span>`;
            const briquesHTML = this.urnePhysiqueFixe.map(couleur => `<div class="brick color-${couleur}" style="opacity:1;"></div>`).join('');
            return `${localCSS}${badgeStyle}<div class="urn-bricks-container">${briquesHTML}</div>`;
        }
        
        const briquesHTML = lastOutcome.urneComplete.map((couleur, index) => {
            const isPicked = (index === lastOutcome.indexPioche) ? 'picked-highlight' : '';
            return `<div class="brick color-${couleur} ${isPicked}"></div>`;
        }).join('');
        
        const traductionNom = { bleue: 'Bleue', rouge: 'Rouge', jaune: 'Jaune', vide: 'Vide' };
        const nomCouleur = traductionNom[lastOutcome.couleur] || 'Vide';

        const showSuccess = isEventVisible && lastOutcome.isSuccess;
        const emoji = isEventVisible ? (lastOutcome.isSuccess ? ' ✅' : ' ❌') : '';

        return `
            ${localCSS}
            ${badgeStyle}
            <div style="display: flex; align-items: center; justify-content: center; gap: 24px; height: 100%; width: 100%;">
                <div class="urn-bricks-container" style="flex: 1;">${briquesHTML}</div>
                <div class="result-badge-urne ${showSuccess ? 'success-active' : ''}">
                    ${nomCouleur}${emoji}
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        const localCSS = this.getLocalCSS();
        const briquesHTML = this.urnePhysiqueFixe.map(couleur => `<div class="brick color-${couleur}" style="opacity:0.7;"></div>`).join('');
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
        const reconfig = () => {
            this.savedComposition = { bleue: parseInt(b.value), rouge: parseInt(r.value), jaune: parseInt(j.value) };
            container.querySelector('#v-bleue').textContent = b.value;
            container.querySelector('#v-rouge').textContent = r.value;
            container.querySelector('#v-jaune').textContent = j.value;
            
            // Re-génération totale de l'univers (filtre les issues et nettoie l'échantillon des 100 via le callback)
            this.configureUniverse();
            
            if (typeof échantillonLancers !== 'undefined') échantillonLancers = [];
            onUpdateCallback();
        };
        b.oninput = r.oninput = j.oninput = reconfig;
    }
}

/**
 * ========================================================
 * 5. ENFANT 4 : SIMULATION DE LA MARCHE ALÉATOIRE (2 PAS FIXES)
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
            { id: 'centre', label: '(0,0)' },
            { id: 'nord',   label: '(0,2)' },
            { id: 'sud',    label: '(0,-2)' },
            { id: 'ouest',  label: '(-2,0)' },
            { id: 'est',    label: '(2,0)' },
            { id: 'ne',     label: '(1,1)' },
            { id: 'no',     label: '(-1,1)' },
            { id: 'so',     label: '(-1,-1)' },
            { id: 'se',     label: '(1,-1)' }
        ];

        this.issuesDefinition.forEach(iss => this.counts[iss.id] = 0);

        this.distribution = {
            centre: 4 / 16, 
            nord:   1 / 16, 
            sud:    1 / 16, 
            ouest:  1 / 16, 
            est:    1 / 16, 
            ne:     2 / 16, 
            no:     2 / 16, 
            so:     2 / 16, 
            se:     2 / 16  
        };

        if (this.eventIndices.length === 0) {
            this.eventIndices = ['ne', 'no', 'so', 'se'];
        }
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

        if (this.counts[idTire] !== undefined) {
            this.counts[idTire]++;
        }

        const isSuccess = this.eventIndices.includes(idTire);
        return { xFinal: x, yFinal: y, idCase: idTire, isSuccess: isSuccess };
    }

    getLocalCSS() {
        return `
            <style>
                .grid-marche {
                    display: grid;
                    grid-template-columns: repeat(5, 24px);
                    grid-template-rows: repeat(5, 24px);
                    gap: 3px;
                    background: rgba(255,255,255,0.02);
                    padding: 6px;
                    border-radius: 6px;
                    border: 1px solid var(--border-color);
                }
                .cell-marche {
                    background: var(--bg-panel);
                    border: 1px solid rgba(255,255,255,0.04);
                    border-radius: 4px;
                    position: relative;
                }
                .cell-marche.cible-possible {
                    border: 1px dashed rgba(255, 255, 255, 0.15);
                }
                .cell-marche.centre {
                    border: 1px dashed var(--accent);
                }
                .particule {
                    width: 16px;
                    height: 16px;
                    background: var(--accent);
                    border-radius: 50%;
                    position: absolute;
                    top: 50%; left: 50%;
                    transform: translate(-50%, -50%);
                    box-shadow: 0 0 10px var(--accent);
                    z-index: 5;
                }
                .particule.succes {
                    background: var(--warning);
                    box-shadow: 0 0 10px var(--warning);
                }
                .result-badge-marche { 
                    height: 45px;
                    padding: 0 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px; 
                    background: rgba(255,255,255,0.05); 
                    border: 1px solid var(--border-color); 
                    font-size: 1.4rem; 
                    font-weight: bold;
                    white-space: nowrap;
                    box-sizing: border-box;
                }
                .coord-box {
                    display: inline-block;
                    width: 38px; 
                    text-align: center; 
                }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        
        let pX = 0, pY = 0;
        let xStr = "+0", yStr = "+0";
        let showSuccess = false;
        let emoji = "";

        if (lastOutcome) {
            pX = lastOutcome.xFinal;
            pY = lastOutcome.yFinal;
            showSuccess = isEventVisible && lastOutcome.isSuccess;
            emoji = isEventVisible ? (lastOutcome.isSuccess ? '✅' : '❌') : '';
            xStr = lastOutcome.xFinal >= 0 ? `+${lastOutcome.xFinal}` : lastOutcome.xFinal;
            yStr = lastOutcome.yFinal >= 0 ? `+${lastOutcome.yFinal}` : lastOutcome.yFinal;
        }

        let grilleHTML = `<div class="grid-marche">`;
        for (let y = 2; y >= -2; y--) {
            for (let x = -2; x <= 2; x++) {
                let classeCase = "";
                let idCase = "";
                
                if (x === 0 && y === 0) { idCase = 'centre'; classeCase = "centre"; }
                else if (x === 0 && y === 2)  idCase = 'nord';
                else if (x === 0 && y === -2) idCase = 'sud';
                else if (x === -2 && y === 0) idCase = 'ouest';
                else if (x === 2 && y === 0)  idCase = 'est';
                else if (x === 1 && y === 1)   idCase = 'ne';
                else if (x === -1 && y === 1)  idCase = 'no';
                else if (x === -1 && y === -1) idCase = 'so';
                else if (x === 1 && y === -1)  idCase = 'se';

                if (idCase && idCase !== 'centre') {
                    classeCase = "cible-possible";
                }

                let styleTrace = "";
                const nbrVisites = this.counts[idCase] || 0;
                
                if (nbrVisites > 0) {
                    const opacite = Math.min((nbrVisites / Math.max(this.total, 20)) * 3, 0.8);
                    styleTrace = `style="background-color: rgba(56, 189, 248, ${opacite});"`;
                }

                const hasParticule = (x === pX && y === pY) ? `<div class="particule ${showSuccess ? 'succes' : ''}"></div>` : '';
                grilleHTML += `<div class="cell-marche ${classeCase}" ${styleTrace}>${hasParticule}</div>`;
            }
        }
        grilleHTML += `</div>`;

        return `
            ${localCSS}
            <div style="display: flex; align-items: center; justify-content: center; gap: 24px; height: 100%; width: 100%;">
                ${grilleHTML}
                <div class="result-badge-marche ${showSuccess ? 'success-active' : ''}">
                    <span>(</span>
                    <span class="coord-box">${xStr}</span>
                    <span>,</span>
                    <span class="coord-box">${yStr}</span>
                    <span>)</span>
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
        return `<p style="font-size:0.85rem; color:var(--text-muted);">Simulation géométrique stricte bloquée à 2 pas pour étudier la diffusion sur les 9 cases accessibles de la matrice.</p>`;
    }

    bindExperienceSettings(container, onUpdateCallback) {}
}


/**
 * ========================================================
 * ENFANT 5 : SIMULATION DU LANCER DE N PIÈCES (LOI BINOMIALE)
 * ========================================================
 */
class PiecesExperience extends BaseExperience {
    constructor() {
        super();
        this.savedN = 4; // Nombre de pièces par défaut (entre 1 et 10)
        this.configureUniverse();
    }

    configureUniverse() {
        this.total = 0; this.issuesDefinition = []; this.counts = {}; this.distribution = {};
        this.experienceDesc = `Simulation du lancer simultané de ${this.savedN} pièces de monnaie équilibrées. La variable d'étude compte le nombre de PILES obtenus.`;
        
        // 1. Calcul du nombre total de combinaisons (2^n)
        const totalCombinaisons = Math.pow(2, this.savedN);
        
        // Fonction interne pour calculer les coefficients binomiaux (k parmi n)
        const coeffBinomial = (n, k) => {
            if (k < 0 || k > n) return 0;
            if (k === 0 || k === n) return 1;
            let prod = 1;
            for (let i = 1; i <= k; i++) prod = prod * (n - i + 1) / i;
            return Math.round(prod);
        };

        // 2. Génération des issues de 0 à n Piles
        for (let k = 0; k <= this.savedN; k++) {
            const idStr = `p_${k}`;
            this.issuesDefinition.push({ id: idStr, label: `${k} P` });
            this.counts[idStr] = 0;
            
            // Loi binomiale B(n, 0.5)
            this.distribution[idStr] = coeffBinomial(this.savedN, k) / totalCombinaisons;
        }

        // 3. Configuration de l'événement par défaut (Avoir au moins la moitié de Piles)
        if (this.eventIndices.length === 0) {
            const seuilMoitie = Math.ceil(this.savedN / 2);
            this.eventIndices = this.issuesDefinition
                .filter(iss => parseInt(iss.label) >= seuilMoitie)
                .map(i => i.id);
        }
        this.calculateProbaA();
    }

    lancer() {
        this.total++;
        let nbPiles = 0;
        let piecesVisuelles = [];

        // Simulation du lancer de chaque pièce
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
        const isSuccess = this.eventIndices.includes(idTire);

        // On retourne la clé idCase requise pour la capture de la grille des 100 lancers
        return { idCase: idTire, piecesHTML: piecesVisuelles.join(''), totalPiles: nbPiles, isSuccess: isSuccess };
    }

    getLocalCSS() {
        return `
            <style>
                .step-render-layout { 
                    display: flex; 
                    flex-direction: column;
                    align-items: center; 
                    justify-content: center;
                    gap: 10px; 
                    min-width: 280px; 
                    height: 100%;
                }
                .coins-container {
                    display: flex;
                    gap: 6px;
                    justify-content: center;
                    flex-wrap: wrap;
                }
                .coin {
                    width: 36px;
                    height: 36px;
                    border-radius: 50%;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    font-weight: bold;
                    font-size: 1.1rem;
                    border: 2px solid rgba(255,255,255,0.2);
                    box-shadow: inset 0 -3px 0 rgba(0,0,0,0.2);
                }
                .coin.pile {
                    background: #eab308; /* Or / Jaune */
                    color: #451a03;
                    border-color: #fef08a;
                }
                .coin.face {
                    background: #94a3b8; /* Argent / Gris */
                    color: #0f172a;
                    border-color: #cbd5e1;
                }
                .result-badge { 
                    height: 45px;
                    padding: 0 15px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    border-radius: 6px; 
                    background: rgba(255,255,255,0.05); 
                    border: 1px solid var(--border-color); 
                    font-size: 1.3rem; 
                    font-weight: bold;
                    white-space: nowrap;
                    box-sizing: border-box;
                }
            </style>
        `;
    }

    renderStepHTML(lastOutcome, isEventVisible) {
        const localCSS = this.getLocalCSS();
        if (!lastOutcome) {
            return `
                ${localCSS}
                <div class="step-render-layout">
                    <span style="color: var(--text-muted); font-weight: normal;">En attente de lancer...</span>
                </div>
            `;
        }

        const showSuccess = isEventVisible && lastOutcome.isSuccess;
        const emoji = isEventVisible ? (lastOutcome.isSuccess ? ' ✅' : ' ❌') : '';

        return `
            ${localCSS}
            <div class="step-render-layout">
                <div class="coins-container">
                    ${lastOutcome.piecesHTML}
                </div>
                <div class="result-badge ${showSuccess ? 'success-active' : ''}">
                    ${lastOutcome.totalPiles} Pile${lastOutcome.totalPiles > 1 ? 's' : ''}${emoji}
                </div>
            </div>
        `;
    }

    renderContinuousHTML() {
        return `
            <div class="continuous-render-layout">
                <span>⚡ Flambée de tirages binomiaux en cours (Loi des grands nombres)...</span>
                <div class="animated-bars"><span></span><span></span><span></span><span></span></div>
            </div>
        `;
    }

    renderExperienceSettingsHTML() {
        return `
            <div>
                <label>Nombre de pièces à lancer ($n$) :</label>
                <div class="slider-wrapper">
                    <input type="range" id="slider-pieces-n" class="slider-input" min="1" max="10" step="1" value="${this.savedN}">
                    <span id="value-pieces-n" class="slider-value">${this.savedN}</span>
                </div>
            </div>`;
    }

    bindExperienceSettings(container, onUpdateCallback) {
        const s = container.querySelector('#slider-pieces-n');
        if (!s) return;
        s.oninput = () => {
            this.savedN = parseInt(s.value);
            container.querySelector('#value-pieces-n').textContent = s.value;
            
            // Recalcul dynamique de l'événement par défaut lors du changement de N
            const seuilMoitie = Math.ceil(this.savedN / 2);
            this.eventIndices = []; // Reset temporaire pour forcer le filtre
            
            this.configureUniverse();
            this.eventIndices = this.issuesDefinition
                .filter(iss => parseInt(iss.label) >= seuilMoitie)
                .map(i => i.id);
            
            this.configureUniverse();
            onUpdateCallback();
        };
    }
}

/**
 * ========================================================
 * 6. MOTEUR D'AIGUILLAGE ET POOL DU DOM (AGNOSTIQUE)
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
const containerEventView = document.getElementById('container-event-view');
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

// Récupération des éléments de réglages dynamiques de l'avance
const speedSlider = document.getElementById('speed-slider');
const speedValue = document.getElementById('speed-value');
const batchSlider = document.getElementById('batch-slider');
const batchValue = document.getElementById('batch-value');

let exp = null;
let phetUnitMode = 'frequency';
let playing = false;
let interval = null;
let showTheory = false;
let échantillonLancers = []; // Stocke les labels des 100 premiers lancers

const btnTheoryShow = document.getElementById('btn-theory-show');
const btnTheoryHide = document.getElementById('btn-theory-hide');

btnTheoryShow.onclick = function() {
    showTheory = true;
    this.classList.add('active');
    btnTheoryHide.classList.remove('active');
    rafraichirModalesEtParametres(); 
    updateUI();
};

btnTheoryHide.onclick = function() {
    showTheory = false;
    this.classList.add('active');
    btnTheoryShow.classList.remove('active');
    rafraichirModalesEtParametres(); 
    updateUI();
};

function buildCentralSettings() {
    stop();
    exp = new EXPERIENCES_MAP[expSelect.value]();
    // Dans buildCentralSettings() et dans le clic du bouton Reset, ajoute cette ligne :
    échantillonLancers = [];
    updateUI();
}

expSelect.onchange = buildCentralSettings;

function renderModalContent(type) {
    const header = document.querySelector('.modal-header h3');
    if (type === 'experience') {
        header.textContent = "Configuration du modèle";
        settingsViewport.innerHTML = exp.renderExperienceSettingsHTML();
        exp.bindExperienceSettings(settingsViewport, () => { stop(); updateUI(); });
    } else {
        header.textContent = "Définition de l'événement A";
        settingsViewport.innerHTML = exp.renderEventSettingsHTML(showTheory);
        exp.bindEventSettings(settingsViewport, () => { stop(); updateUI(); });
    }
}

document.getElementById('btn-open-settings').onclick = () => { renderModalContent('experience'); modalOverlay.classList.remove('hidden'); };
document.getElementById('btn-open-event-settings').onclick = () => { renderModalContent('event'); modalOverlay.classList.remove('hidden'); };
document.getElementById('btn-close-settings').onclick = () => modalOverlay.classList.add('hidden');
modalOverlay.onclick = (e) => { if(e.target === modalOverlay) modalOverlay.classList.add('hidden'); };

/**
 * ========================================================
 * 7. MOTEUR DE CORRÉLATION GRAPHIQUE (UI)
 * ========================================================
 */
function rafraichirModalesEtParametres() {
    if (!exp) return;
    const modalHeader = document.querySelector('.modal-header h3');
    if (modalOverlay && !modalOverlay.classList.contains('hidden') && modalHeader.textContent === "Définition de l'événement A") {
        settingsViewport.innerHTML = exp.renderEventSettingsHTML(showTheory);
        exp.bindEventSettings(settingsViewport, () => { stop(); updateUI(); });
    }

    const containerSettings = document.getElementById('experience-settings-container');
    if (containerSettings) {
        containerSettings.innerHTML = exp.renderExperienceSettingsHTML();
        exp.bindExperienceSettings(containerSettings, () => { updateUI(); });
    }
}

function updateUI(lastOutcome = null) {
    if (!exp) return; 
    const stats = exp.getStats();
    const isContinuousModeActive = btnModeInfinite.classList.contains('active');
    
    document.getElementById('display-desc').textContent = exp.experienceDesc;
    totalCountEl.textContent = stats.total.toLocaleString();
    
    const isEventSectionVisible = !containerEventView.classList.contains('hidden');
    const canDisplayTheory = showTheory && exp.eventIndices.length > 0 && isEventSectionVisible;
    
    if (playing && isContinuousModeActive) {
        mainRenderViewport.innerHTML = exp.renderContinuousHTML();
    } else {
        mainRenderViewport.innerHTML = exp.renderStepHTML(lastOutcome, isEventSectionVisible);
    }

    const prefixLabel = expSelect.value === 'des' || expSelect.value === 'produit' ? '' : '';
    if (exp.eventIndices.length === 0) {
        document.getElementById('display-set').textContent = "A = ∅ (Événement impossible)";
    } else {
        document.getElementById('display-set').textContent = `A = { ${stats.issues.filter(i => i.inEvent).map(i => prefixLabel + i.label).join(" ; ")} }`;
    }

    eventFill.style.width = `${stats.freqA * 100}%`;
    
    if (canDisplayTheory) {
        eventMarker.style.display = "block";
        eventMarker.style.left = `${stats.probaA * 100}%`;
        eventFill.textContent = `Fréq : ${(stats.freqA * 100).toFixed(1)}% | P(A) : ${(stats.probaA * 100).toFixed(1)}%`;
    } else {
        eventMarker.style.display = "none"; 
        eventFill.textContent = `Fréq : ${(stats.freqA * 100).toFixed(1)}%`;
    }

    const maxEffectifConstate = Math.max(...stats.issues.map(i => i.count), 1);
    const maxFreqEchelleGraphique = parseFloat(heightSlider.value) / 100;

    chartGrid.innerHTML = stats.issues.map(iss => {
        let heightPercent = phetUnitMode === 'frequency' ? (iss.freq / maxFreqEchelleGraphique) * 100 : (iss.count / maxEffectifConstate) * 100;
        let valueStr = phetUnitMode === 'frequency' ? (iss.freq * 100).toFixed(1) + "%" : iss.count.toString();
        const applyOrangeColor = (iss.inEvent && isEventSectionVisible) ? 'in-event' : '';
        return `<div class="chart-col"><div class="chart-bar ${applyOrangeColor}" style="height: ${stats.total > 0 ? Math.min(heightPercent, 90) : 0}%"><div class="chart-col-value">${stats.total > 0 ? valueStr : ''}</div></div><div class="col-label">${iss.label.replace(' 🟦','').replace(' 🟥','').replace(' 🟨','')}</div></div>`;
    }).join('');

    tableBody.innerHTML = stats.issues.map(iss => {
        const probaAFFICHEE = showTheory ? `${(iss.proba * 100).toFixed(1)}%` : `<span style="opacity: 0.3;">??</span>`;
        return `
            <tr>
                <td style="font-weight:600; color:${(iss.inEvent && isEventSectionVisible)?'var(--warning)':'var(--text-main)'}">${iss.label}</td>
                <td>${iss.count.toLocaleString()}</td>
                <td>${(iss.freq * 100).toFixed(1)}%</td>
                <td style="color:var(--text-muted); font-weight: bold;">${probaAFFICHEE}</td>
            </tr>
        `;
    }).join('');
    // --- RENDU DE LA GRILLE DES 100 PREMIERS LANCERS ---
const sampleGridEl = document.getElementById('sample-grid');
    
    if (sampleGridEl) {
        let casesHTML = "";
        for (let i = 0; i < 100; i++) {
            if (i < échantillonLancers.length) {
                const item = échantillonLancers[i];
                // L'identifiant global "isEventSectionVisible" du début de la fonction est utilisé ici sans problème
                const classeSucces = (item.inEvent && isEventSectionVisible) ? "sample-cell-success" : "";
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
        
        // --- CAPTURE DES 100 PREMIERS RÉSULTATS ---
        if (échantillonLancers.length < 100 && last) {
            // Extraction intelligente de la valeur textuelle propre selon le modèle
            let valeurBrute = "";
            if (last.totalSomme !== undefined) valeurBrute = last.totalSomme;
            else if (last.totalProduit !== undefined) valeurBrute = last.totalProduit;
            else if (last.couleur !== undefined) valeurBrute = last.couleur === 'bleue' ? '🟦' : last.couleur === 'rouge' ? '🟥' : last.couleur === 'jaune' ? '🟨' : '❌';
            else if (last.idCase !== undefined) valeurBrute = exp.issuesDefinition.find(i => i.id === last.idCase)?.label || "?";

            échantillonLancers.push({
                valeur: valeurBrute,
                inEvent: last.isSuccess
            });
        }
    }
    updateUI(last);
}



if (batchSlider) {
    batchSlider.oninput = function() {
        batchValue.textContent = parseInt(this.value).toLocaleString();
        if (playing && btnModeInfinite.classList.contains('active')) {
            relancerInterval();
        }
    };
}

// MISE À JOUR DU BOUTON SUIVANT : Intelligent selon le mode actif
btnNext.onclick = function() { 
    stop(); // Arrête la simulation automatique si elle tournait
    
    // On vérifie quel mode est actuellement sélectionné par l'utilisateur
    const isModeContinuActive = btnModeInfinite.classList.contains('active');
    
    if (isModeContinuActive) {
        // En mode continu, on avance du paquet entier défini sur le slider
        const taillePaquet = batchSlider ? parseInt(batchSlider.value) : 100;
        runSimulation(taillePaquet); 
    } else {
        // En mode pas-à-pas, on avance strictement de 1 seul lancer
        runSimulation(1); 
    }
};

if (speedSlider) {
    speedSlider.oninput = function() {
        speedValue.textContent = this.value + " ms";
        if (playing && !btnModeInfinite.classList.contains('active')) {
            relancerInterval();
        }
    };
}

function relancerInterval() {
    clearInterval(interval);
    const isInf = btnModeInfinite.classList.contains('active');
    const delaiPasAPas = speedSlider ? parseInt(speedSlider.value) : 350;
    const taillePaquetContinu = batchSlider ? parseInt(batchSlider.value) : 15;
    
    interval = setInterval(() => runSimulation(isInf ? taillePaquetContinu : 1), isInf ? 16 : delaiPasAPas);
}

btnPlay.onclick = function() {
    if (playing) {
        stop();
    } else {
        playing = true; 
        this.textContent = "Pause ⏸️"; 
        this.classList.add('playing');
        relancerInterval(); 
    }
};

btnModeStep.onclick = function() {
    this.classList.add('active');
    btnModeInfinite.classList.remove('active');
    const bCtrl = document.getElementById('speed-control-group');
    if(bCtrl) bCtrl.style.display = 'block';
    if (playing) relancerInterval();
};

btnModeInfinite.onclick = function() {
    this.classList.add('active');
    btnModeStep.classList.remove('active');
    const bCtrl = document.getElementById('speed-control-group');
    if(bCtrl) bCtrl.style.display = 'none';
    if (playing) relancerInterval();
};

function stop() { 
    playing = false; 
    btnPlay.textContent = "Play ▶️"; 
    btnPlay.classList.remove('playing'); 
    clearInterval(interval); 
    // Supprime "updateUI()" d'ici si elle y est, pour éviter qu'un stop() intempestif ne redessine l'ancienne grille
}
// Le bouton RESET réinitialise l'univers, arrête la boucle et vide l'échantillon
document.getElementById('control-reset').onclick = () => { 
    stop();                  // 1. On arrête la simulation si elle tournait
    exp.configureUniverse(); // 2. On remet les compteurs de l'expérience à 0
    échantillonLancers = []; // 3. ON VIDE STRICTEMENT LA GRILLE DES 100
    updateUI();              // 4. On rafraîchit tout l'écran
};

heightSlider.oninput = function() { heightValue.textContent = this.value + "%"; updateUI(); };

document.getElementById('btn-phet-count').onclick = function() { phetUnitMode = 'count'; this.classList.add('active'); document.getElementById('btn-phet-freq').classList.remove('active'); document.getElementById('wrapper-height-slider').style.opacity = '0.25'; document.getElementById('wrapper-height-slider').style.pointerEvents = 'none'; updateUI(); };
document.getElementById('btn-phet-freq').onclick = function() { phetUnitMode = 'frequency'; this.classList.add('active'); document.getElementById('btn-phet-count').classList.remove('active'); document.getElementById('wrapper-height-slider').style.opacity = '1'; document.getElementById('wrapper-height-slider').style.pointerEvents = 'auto'; updateUI(); };

function bindToggle(btnId, containerId) {
    document.getElementById(btnId).onclick = function() {
        const c = document.getElementById(containerId);
        const isHidden = c.classList.toggle('hidden');
        this.textContent = isHidden ? `👁️ Afficher` : `🙈 Masquer`;
        updateUI();
    };
}
bindToggle('toggle-desc', 'container-desc');
bindToggle('toggle-visual', 'main-render-viewport');
bindToggle('toggle-event-view', 'container-event-view'); 
bindToggle('btn-toggle-chart', 'chart-container');
bindToggle('btn-toggle-event', 'event-container');
bindToggle('btn-toggle-table', 'table-container');
bindToggle('btn-toggle-sample', 'container-sample-view');

buildCentralSettings();