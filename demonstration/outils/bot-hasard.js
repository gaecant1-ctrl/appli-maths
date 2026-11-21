/* ============================================================
   BOT « AU HASARD » : joue comme un élève qui clique n'importe où.

   Il clique sur les vrais boutons de la page (cases de l'étape, symboles, objets de la
   figure, propriétés, « Écrire cette phrase », « Valider l'étape », « + Étape »...), au
   hasard, jusqu'au « Bravo » ou jusqu'à un nombre maximal de clics.

   Il vérifie à chaque étape validée :
     - que les informations « On a » étaient connues (données, ou conclusions validées avant) ;
     - que la conclusion est vraie sur la figure (vérification indépendante, par les coordonnées).
   Il compte aussi les erreurs JavaScript de la page.
   Il mesure enfin, pour chaque exercice, en combien de clics le hasard réussit.

   Utilisation : ouvrir l'appli, puis dans la console du navigateur :
       const s = document.createElement('script'); s.src = 'outils/bot-hasard.js'; document.head.append(s);
       botHasard({ parties: 20, clicsMax: 400 });          // mode réglé sur l'accueil
       botHasard({ parties: 20, propositions: true });     // mode « phrases proposées »
   Le résultat s'affiche dans la console (et dans window.botResultat).
   Les notes enregistrées dans le navigateur sont remises comme avant à la fin.
   ============================================================ */

(function () {
    const EPS = 1e-3;
    const hasard = n => Math.floor(Math.random() * n);
    const auHasard = liste => liste[hasard(liste.length)];
    const pause = () => new Promise(r => setTimeout(r, 0));

    /* ---------- Vérification indépendante : la phrase est-elle vraie sur la figure ? ---------- */

    const ecart = (P, Q) => Math.hypot(Q[0] - P[0], Q[1] - P[1]);
    function direction(nom) {
        if (nom.startsWith('[')) {
            const A = coordonnees[nom[1]], B = coordonnees[nom[2]], L = ecart(A, B);
            return [(B[0] - A[0]) / L, (B[1] - A[1]) / L];
        }
        return geometrieCourante[nom].u;
    }
    function surDroite(P, d) {
        const g = geometrieCourante[d];
        return Math.abs((P[0] - g.p[0]) * g.u[1] - (P[1] - g.p[1]) * g.u[0]) < EPS;
    }
    function estVrai(f) {
        const C = coordonnees, L = l => ecart(C[l[0]], C[l[1]]);
        switch (f.type) {
            case 'appartient': return surDroite(C[f.a], f.b);
            case 'surCercle': {
                const c = exerciceCourant.cercles.find(x => x.nom === f.b);
                return Math.abs(ecart(C[f.a], C[c.centre]) - ecart(C[c.par], C[c.centre])) < EPS;
            }
            case 'egal': return Math.abs(L(f.a) - L(f.b)) < EPS;
            case 'perp': { const u = direction(f.a), v = direction(f.b); return Math.abs(u[0] * v[0] + u[1] * v[1]) < EPS; }
            case 'para': { const u = direction(f.a), v = direction(f.b); return Math.abs(u[0] * v[1] - u[1] * v[0]) < EPS; }
            case 'milieu': { const A = C[f.b[1]], B = C[f.b[2]]; return surDroite([(A[0] + B[0]) / 2, (A[1] + B[1]) / 2], f.a); }
            case 'mediatrice': return estVrai({ type: 'perp', a: f.a, b: f.b }) && estVrai({ type: 'milieu', a: f.a, b: f.b });
            case 'surMed': return Math.abs(ecart(C[f.a], C[f.b[1]]) - ecart(C[f.a], C[f.b[2]])) < EPS;
        }
        return null; // une mesure, par exemple : on ne sait pas
    }

    // Contrôle d'une étape qui vient d'être validée. Retourne la liste des anomalies.
    function controlerEtape(etape, avant) {
        const ex = exerciceCourant, anomalies = [];
        fixerNotations(ex);
        avant.forEach(e => { if (e.concl.type === 'mediatrice') nommerMediatrice(e.concl.a, e.concl.b); });
        const connus = new Set([...ex.hypotheses, ...avant.map(e => e.concl)].map(cleFait));
        const premisses = [etape.f1, etape.f2].filter(Boolean).flatMap(f => f.type === 'surMed2'
            ? [{ type: 'surMed', a: f.a, b: f.b }, { type: 'surMed', a: f.c, b: f.b }] : [f]);
        premisses.forEach(f => { if (!connus.has(cleFait(f))) anomalies.push(`« ${texteFait(f)} » accepté dans On a sans être connu`); });
        const vrai = estVrai(etape.concl);
        if (vrai === false) anomalies.push(`conclusion FAUSSE validée : « ${texteFait(etape.concl)} »`);
        return anomalies;
    }

    /* ---------- Un clic au hasard, comme un élève ---------- */

    const visible = () => overlayChoix.classList.contains('visible');
    const actifs = racine => [...racine.querySelectorAll('button')].filter(b => !b.disabled && b.offsetParent !== null);

    function clicAuHasard() {
        if (visible()) {
            // Dans la fenêtre de choix : n'importe quel bouton ; fermer (×) est plus rare.
            const boutons = actifs(overlayChoix);
            const sansFermer = boutons.filter(b => !b.classList.contains('overlay-fermer'));
            const b = Math.random() < 0.05 || !sansFermer.length ? auHasard(boutons) : auHasard(sansFermer);
            if (b) b.click();
            return b ? 'fenetre' : null;
        }
        // Sur la page : une case de l'étape en cours, « Valider l'étape », « + Étape », un titre.
        const cases = actifs(document.getElementById('blocs')).filter(b => b.classList.contains('bd-case'));
        const titres = actifs(document.getElementById('blocs')).filter(b => b.classList.contains('bd-titre'));
        const r = Math.random();
        let b;
        if (r < 0.70 && cases.length) b = auHasard(cases);
        else if (r < 0.88) b = document.getElementById('btnVerifier');
        else if (r < 0.97) b = document.getElementById('btnAjouterEtape');
        else b = auHasard(titres.length ? titres : cases);
        if (b) b.click();
        return b && b.id === 'btnVerifier' ? 'valider' : 'page';
    }

    /* ---------- Une partie : jusqu'au « Bravo » ou jusqu'au maximum de clics ---------- */

    async function partie(i, clicsMax, erreurs) {
        recommencer();
        afficherExercice(i);
        let clics = 0, validations = 0;
        const anomalies = [];
        while (clics < clicsMax) {
            const avant = lireEtapes().filter(e => e.valide).map(e => ({ ...e }));
            const quoi = clicAuHasard();
            clics++;
            if (quoi === 'valider') {
                validations++;
                const apres = lireEtapes().filter(e => e.valide);
                apres.slice(avant.length).forEach(e => anomalies.push(...controlerEtape(e, avant)));
                const msg = document.getElementById('messageAlerte').innerText;
                if (msg.startsWith('Bravo')) {
                    const m = msg.match(/⭐ ([\d,]+) \/ ([\d,]+)/);
                    fermerChoix();
                    return { reussi: true, clics, validations, points: m ? m[1] : '?', anomalies };
                }
            }
            if (clics % 40 === 0) await pause();
        }
        fermerChoix();
        return { reussi: false, clics, validations, points: '0', anomalies };
    }

    const mediane = t => { if (!t.length) return '-'; const s = [...t].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

    window.botHasard = async function ({ parties = 20, clicsMax = 400, propositions } = {}) {
        // Sauvegarde de ce que le bot va toucher : notes, mode.
        const sauvegarde = {};
        try { Object.keys(localStorage).filter(k => k.startsWith('demonstration')).forEach(k => { sauvegarde[k] = localStorage.getItem(k); }); } catch (e) {}
        const modeAvant = modePropositions;
        const exerciceAvant = indexExercice;

        const erreurs = [];
        const surErreur = e => erreurs.push(e.message || String(e));
        window.addEventListener('error', surErreur);

        // Écran d'accueil encore ouvert : le bot y écrit son nom.
        const champ = document.getElementById('champNom');
        if (champ) { champ.value = 'Bot Hasard'; document.getElementById('btnCommencer').click(); }
        if (propositions !== undefined) fixerMode(propositions);

        const lignes = [];
        for (let i = 0; i < EXERCICES.length; i++) {
            if (EXERCICES[i].erreur) { lignes.push({ exercice: i + 1, souci: EXERCICES[i].erreur }); continue; }
            const res = [];
            for (let k = 0; k < parties; k++) res.push(await partie(i, clicsMax, erreurs));
            const ok = res.filter(r => r.reussi);
            const anomalies = [...new Set(res.flatMap(r => r.anomalies))];
            lignes.push({
                exercice: i + 1,
                'réussi au hasard': `${ok.length}/${parties}`,
                'clics (médiane)': mediane(ok.map(r => r.clics)),
                'validations (médiane)': mediane(ok.map(r => r.validations)),
                'points obtenus': [...new Set(ok.map(r => r.points))].join(' ou ') || '-',
                anomalies: anomalies.length ? anomalies.join(' | ') : 'aucune'
            });
        }

        window.removeEventListener('error', surErreur);
        // Remise en état : notes, mode, exercice affiché.
        try {
            Object.keys(localStorage).filter(k => k.startsWith('demonstration')).forEach(k => localStorage.removeItem(k));
            Object.entries(sauvegarde).forEach(([k, v]) => localStorage.setItem(k, v));
        } catch (e) {}
        fixerMode(modeAvant);
        recommencer();
        if (exerciceAvant >= 0) afficherExercice(exerciceAvant);

        const resultat = {
            chapitre: CHAP.titre,
            mode: (propositions !== undefined ? propositions : modeAvant) ? 'phrases proposées' : 'phrases à construire',
            parties, clicsMax, lignes,
            'erreurs JavaScript': [...new Set(erreurs)]
        };
        console.log(`Bot au hasard — ${resultat.chapitre}, ${resultat.mode}, ${parties} parties par exercice, ${clicsMax} clics au plus`);
        console.table(lignes);
        if (erreurs.length) console.warn('Erreurs JavaScript :', resultat['erreurs JavaScript']);
        window.botResultat = resultat;
        return resultat;
    };
})();

/* ============================================================
   MODE DÉMONSTRATION (pour filmer, en classe de probabilités)

   Ouvrir l'appli avec « &demo » dans l'adresse, par exemple :
       index.html?chapitre=distance&demo&exercice=5
   Un élève fictif remplit l'étape AU HASARD en mode « phrases proposées » : chaque case
   est cliquée, puis une proposition est choisie au hasard dans la liste ; puis il clique
   sur « Valider l'étape ». C'est un « tirage ». Un doigt montre chaque clic.
   Le panneau du bas compte les tirages et les réussites, et trace la fréquence de
   réussite au fil des tirages, à comparer avec la probabilité calculée exactement
   (en essayant toutes les façons de remplir l'étape).
   Boutons : Lent (on voit chaque clic), Rapide (beaucoup de tirages), Pause, Arrêter.
   Les notes enregistrées dans le navigateur sont remises comme avant à l'arrêt.
   ============================================================ */

(function () {
    const attendre = ms => new Promise(r => setTimeout(r, ms));
    const auHasard = t => t[Math.floor(Math.random() * t.length)];
    const pgcd = (a, b) => (b ? pgcd(b, a % b) : a);
    const pourcent = x => (100 * x).toLocaleString('fr-FR', { maximumFractionDigits: 1 }) + ' %';

    const style = document.createElement('style');
    style.textContent = `
        #botDoigt { position: fixed; z-index: 2000000; width: 26px; height: 26px; margin: -13px 0 0 -13px;
            border-radius: 50%; background: rgba(192, 57, 43, .35); border: 3px solid #c0392b;
            pointer-events: none; transition: left .35s ease, top .35s ease, transform .12s; left: 50%; top: 50%; }
        #botDoigt.appui { transform: scale(.6); background: rgba(192, 57, 43, .7); }
        .bot-clic { outline: 4px solid #ffd166 !important; outline-offset: 2px; }
        #botPanneau { position: fixed; z-index: 1999999; left: 50%; bottom: 1rem; transform: translateX(-50%);
            width: min(60rem, 96vw); background: #fff; border: 2px solid #1f5c33; border-radius: .7rem;
            box-shadow: 0 6px 24px rgba(0,0,0,.25); padding: .8rem 1rem; font-family: 'Segoe UI', Arial, sans-serif; color: #23302a; }
        #botPanneau .bp-titre { font-weight: 700; color: #1f5c33; font-size: 1.05rem; }
        #botPanneau .bp-chiffres { display: flex; flex-wrap: wrap; gap: .3rem 1.6rem; margin: .45rem 0; font-size: 1.05rem; }
        #botPanneau .bp-chiffres b { font-size: 1.25rem; }
        #botPanneau .bp-freq b { color: #c0392b; }
        #botPanneau .bp-proba b { color: #1d3b8f; }
        #botPanneau svg { width: 100%; height: 150px; display: block; }
        #botPanneau .bp-boutons { display: flex; gap: .5rem; justify-content: flex-end; margin-top: .3rem; }
        #botPanneau .bp-boutons button { margin: 0; padding: .35rem .8rem; }
        #botPanneau .bp-boutons button.choisi { background: #1f5c33; color: #fff; border-color: #1f5c33; }
    `;

    // Probabilité exacte de réussir un tirage : on essaie toutes les façons de remplir l'étape
    // avec les propositions des listes, comme le fait le hasard.
    function probabiliteExacte() {
        const ex = exerciceCourant;
        const etape = lireEtapes()[0];
        const connus = rubriquesConnues().flatMap(r => r.faits);
        const possibles = rubriquesPossibles().flatMap(r => r.faits);
        const props = CHAP.proprietes;
        const deux = casesOnA(etape) === 2;
        let bons = 0, total = 0;
        connus.forEach(f1 => (deux ? connus : [null]).forEach(f2 => props.forEach(prop => possibles.forEach(concl => {
            total++;
            const r = verifierDemonstration(ex, etapesLues([{ f1, f2, prop, concl }]));
            if (r.ok) bons++; // réussir = l'exercice est démontré (le « Bravo »)
        }))));
        return { bons, total };
    }

    window.probabiliteHasard = probabiliteExacte; // pour comparer les exercices depuis la console

    window.botDemo = async function ({ exercice = 1 } = {}) {
        document.head.append(style);
        // Sauvegarde : notes et mode du navigateur, remis à l'arrêt.
        const sauvegarde = {};
        try { Object.keys(localStorage).filter(k => k.startsWith('demonstration')).forEach(k => { sauvegarde[k] = localStorage.getItem(k); }); } catch (e) {}
        const modeAvant = modePropositions;
        // Remise en état, même si la page est rechargée ou fermée sans « Arrêter ».
        let remis = false;
        const remettre = () => {
            if (remis) return;
            remis = true;
            try {
                Object.keys(localStorage).filter(c => c.startsWith('demonstration')).forEach(c => localStorage.removeItem(c));
                Object.entries(sauvegarde).forEach(([c, v]) => localStorage.setItem(c, v));
                localStorage.setItem('demonstration.mode', modeAvant ? 'propositions' : 'construire');
            } catch (e) {}
        };
        window.addEventListener('pagehide', remettre);

        const champ = document.getElementById('champNom');
        if (champ) { champ.value = 'Élève au hasard'; document.getElementById('btnCommencer').click(); }
        fixerMode(true);
        const i = Math.min(Math.max(exercice, 1), EXERCICES.length) - 1;
        recommencer(); afficherExercice(i); recommencer();

        const { bons, total } = probabiliteExacte();
        const p = bons / total, g = pgcd(bons, total);

        const doigt = document.createElement('div'); doigt.id = 'botDoigt';
        const panneau = document.createElement('div'); panneau.id = 'botPanneau';
        panneau.innerHTML = `
            <div class="bp-titre">Un élève qui clique au hasard — exercice ${i + 1}</div>
            <div class="bp-chiffres">
                <span>Tirages : <b class="n">0</b></span>
                <span>Réussites : <b class="k">0</b></span>
                <span class="bp-freq">Fréquence de réussite : <b class="f">–</b></span>
                <span class="bp-proba">Probabilité : <b>${bons / g} sur ${total / g}</b> ≈ <b>${pourcent(p)}</b></span>
            </div>
            <svg viewBox="0 0 600 150" preserveAspectRatio="none"></svg>
            <div class="bp-boutons">
                <button type="button" data-v="lent" class="choisi">Lent</button>
                <button type="button" data-v="rapide">Rapide</button>
                <button type="button" data-v="pause">Pause</button>
                <button type="button" data-v="stop">Arrêter</button>
            </div>`;
        document.body.append(doigt, panneau);

        let vitesse = 'lent', pause = false, stop = false;
        panneau.querySelectorAll('button').forEach(b => b.onclick = () => {
            const v = b.dataset.v;
            if (v === 'pause') { pause = !pause; b.textContent = pause ? 'Reprendre' : 'Pause'; return; }
            if (v === 'stop') { stop = true; return; }
            vitesse = v;
            panneau.querySelectorAll('[data-v=lent],[data-v=rapide]').forEach(x => x.classList.toggle('choisi', x === b));
        });
        const attente = async ms => { do { if (vitesse === 'lent') await attendre(ms); else await attendre(0); } while (pause && !stop); };

        // Un clic, montré par le doigt quand on va lentement.
        async function cliquer(el) {
            if (!el) return;
            if (vitesse === 'lent') {
                const r = el.getBoundingClientRect();
                doigt.style.display = '';
                doigt.style.left = (r.left + r.width / 2) + 'px';
                doigt.style.top = (r.top + r.height / 2) + 'px';
                await attente(450);
                doigt.classList.add('appui'); el.classList.add('bot-clic');
                await attente(220);
                doigt.classList.remove('appui'); el.classList.remove('bot-clic');
            } else {
                doigt.style.display = 'none';
            }
            el.click();
            await attente(250);
        }

        const frequences = [];
        function tracer() {
            const n = frequences.length, svg = panneau.querySelector('svg');
            const xmax = Math.max(20, n), ymax = Math.min(1, Math.max(0.1, 2 * p, ...frequences) * 1.1);
            const X = t => 40 + 550 * t / xmax, Y = v => 135 - 125 * v / ymax;
            const pts = frequences.map((f, t) => `${X(t + 1).toFixed(1)},${Y(f).toFixed(1)}`).join(' ');
            const graduations = [0, ymax / 2, ymax].map(v =>
                `<text x="36" y="${Y(v) + 4}" text-anchor="end" font-size="11" fill="#5f7a68">${pourcent(v)}</text>`).join('');
            svg.innerHTML = `
                <line x1="40" y1="135" x2="592" y2="135" stroke="#9aa"/><line x1="40" y1="8" x2="40" y2="135" stroke="#9aa"/>
                ${graduations}
                <text x="592" y="148" text-anchor="end" font-size="11" fill="#5f7a68">nombre de tirages : ${n}</text>
                <line x1="40" y1="${Y(p)}" x2="592" y2="${Y(p)}" stroke="#1d3b8f" stroke-width="2" stroke-dasharray="6 5"/>
                <text x="590" y="${Y(p) - 5}" text-anchor="end" font-size="11" fill="#1d3b8f">probabilité</text>
                <polyline points="${pts}" fill="none" stroke="#c0392b" stroke-width="2.5"/>`;
        }
        tracer();

        let n = 0, k = 0;
        while (!stop && n < 100000) {
            recommencer();
            const etape = lireEtapes()[0];
            const cases = ['f1', ...(casesOnA(etape) === 2 ? ['f2'] : []), 'prop', 'concl'];
            for (const nom of cases) {
                if (stop) break;
                const caseBtn = [...document.querySelectorAll('#blocs .bd-etape:not(.validee) .bd-case')]
                    .filter(b => !b.disabled)[cases.indexOf(nom)] || null;
                await cliquer(caseBtn);
                const choix = [...overlayChoix.querySelectorAll('.btn-choix')]
                    .filter(b => !b.disabled && !b.classList.contains('retirer') && b.offsetParent !== null);
                await cliquer(auHasard(choix));
            }
            if (stop) break;
            await cliquer(document.getElementById('btnVerifier'));
            n++;
            if (document.getElementById('messageAlerte').innerText.startsWith('Bravo')) k++;
            frequences.push(k / n);
            panneau.querySelector('.n').textContent = n;
            panneau.querySelector('.k').textContent = k;
            panneau.querySelector('.f').textContent = `${k}/${n} ≈ ${pourcent(k / n)}`;
            tracer();
            await attente(vitesse === 'lent' ? 900 : 0);
        }

        // Arrêt : on remet les notes et le mode comme avant ; le panneau reste pour la fin du film.
        doigt.remove();
        remettre();
        modePropositions = modeAvant;
        panneau.querySelector('.bp-boutons').innerHTML = '<span>Démonstration terminée. Recharge la page pour revenir à l\'appli.</span>';
        return { tirages: n, reussites: k, probabilite: p };
    };
})();
