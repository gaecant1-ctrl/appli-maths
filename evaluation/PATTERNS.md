# Patterns UI communs (panneau latéral / quiz)

Notes de conventions établies sur `evaluation` et répliquées sur `conversion`,
à réutiliser telles quelles sur les autres applis appli-maths.

## Structure de page

```html
<header>
  <span id="titre_appli">...</span>
  <div class="header-actions" id="topButtonsBar"></div>
</header>

<div id="appBody">
  <aside id="panneauLateral"></aside>
  <main>
    <div id="container">...</div>
  </main>
</div>
```

CSS clés : `#appBody` en `flex`, `#panneauLateral` largeur fixe `320px`,
`main` en `flex:1 1 auto`. Pas de `<h1>` dans `main` (redondant avec le
titre du header) — le retirer si présent.

## Panneau latéral — boutons de paramètres

Classes : `.panel-groupe` > `.panel-groupe-label` + `.panel-type-list` >
boutons `.panel-btn`. Séparateurs entre groupes : `<div class="panel-filet">`.

Sélection multiple par toggle (`classList.toggle('active')`). **Important** :
tout changement de paramètre doit régénérer la question immédiatement
(appeler la fonction de génération dans le handler de clic), pas seulement
au prochain "Nouvel exercice".

### États disabled/verrouillé (pendant un quiz démarré)

Ne jamais utiliser `cursor: not-allowed` (icône interdite) — utiliser
`cursor: default`. Le texte est **toujours gris** (`#9a9a9a`), y compris sur
les boutons sélectionnés. Le fond des boutons sélectionnés garde sa couleur
mais atténuée (`opacity: 0.55`), pour rester visible sans donner l'illusion
qu'on peut encore cliquer :

```css
.panel-btn:disabled {
  cursor: default;
  background-color: var(--papier-panel);
  border-color: var(--grille);
  color: #9a9a9a;
}
.panel-btn.active:disabled {
  opacity: 0.55;
  background-color: var(--accent); /* ou --craie selon l'appli */
  border-color: var(--accent);
  color: #9a9a9a;
}
```

## Mode Atelier / Quiz

Toggle dans le header (`topButtonsBar`), deux boutons `.btn-header` id
`btnAtelier`/`btnQuiz`, classe `.active` sur celui en cours.

- **Atelier** : entraînement illimité, pas de score. Le panneau affiche un
  groupe avec le label **"Question en cours :"** et un bouton **"Renoncer"**
  (pas "Abandonner").
- **Quiz** : avant démarrage → bouton "Commencer le Quiz". Une fois démarré →
  score déplacé **dans le panneau latéral** (`#score-container` avec
  `#question-progress` "Question x/N" et `#score` "Score : N" *sans*
  dénominateur — la progression suffit), + bouton "Renoncer" qui compte la
  question comme ratée (incrémente le total, pas les bonnes réponses) et
  passe à la suivante.
- Les boutons de paramètres passent en état verrouillé (voir ci-dessus) une
  fois le quiz démarré, mais la sélection reste visible.

## Bouton Guide

Petite classe autonome (`Guide.js`), instanciée dans `window.onload` et son
bouton installé dans `topButtonsBar` via `installerBouton(conteneur)`.
Injecte son propre `<style>` scoped par id pour ne pas dépendre du thème de
l'appli (couleur d'accent à adapter manuellement par appli).

## Fiche papier / impression

- Overlay construit en DOM (pas de `<table>` généré côté LaTeX dupliqué en
  JS) — `.fiche-table` avec bordures complètes (`border` sur `th`/`td`, pas
  seulement `border-bottom`) pour que ça ressemble à un vrai tableau.
  Cellules centrées (`text-align:center`), hauteur de ligne minimum 35px
  (`padding: 8px 10px; height:35px; box-sizing:border-box`).
- Impression : bouton "Imprimer / Enregistrer en PDF" appelle simplement
  `window.print()` sur l'overlay courant — ne PAS ouvrir un nouvel onglet
  dédié à l'impression (ancien pattern supprimé). Un `@media print` dans
  `style.css` masque tout sauf `#overlayFiche`.
- Export LaTeX : `\documentclass[12pt]{article}` et
  `\renewcommand{\arraystretch}{2.5}` pour un tableau bien aéré à imprimer.

## Input de réponse

`input[type="text"]` assez large (`~260px`) et texte centré
(`text-align:center`), plus confortable pour des réponses avec unité (ex :
"3.5 dam³").

## Cache-busting

Scripts chargés avec `?v=N` dans `index.html`. **Incrémenter ce numéro à
chaque modification JS/HTML**, sinon le serveur de dev (`python -m
http.server`) sert une version cache-bustée obsolète depuis le cache
navigateur même après un rechargement forcé.
