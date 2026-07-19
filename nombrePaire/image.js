export function afficherEcranFinal(containerParent) {

  const overlay = document.createElement("div");
  overlay.className = "ecran-final";

  overlay.innerHTML = `
<div class="cinematic">
  <div class="halo"></div>
  <div class="phoenix-container">
   <svg viewBox="0 0 600 480" role="img" aria-label="Emblème du Phénix">
      <defs>
        <!-- Dégradé “feu” animé -->
        <linearGradient id="fire" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%"  stop-color="#fff3b0">
            <animate attributeName="stop-color" values="#fff3b0;#ffd35c;#fff3b0" dur="3s" repeatCount="indefinite"/>
          </stop>
          <stop offset="55%" stop-color="#ff7a18">
            <animate attributeName="stop-color" values="#ff7a18;#ff3b00;#ff7a18" dur="2.6s" repeatCount="indefinite"/>
          </stop>
          <stop offset="100%" stop-color="#c90000">
            <animate attributeName="stop-color" values="#c90000;#ff3b00;#c90000" dur="2.2s" repeatCount="indefinite"/>
          </stop>
        </linearGradient>

        <!-- Lueur douce autour des formes -->
        <filter id="soft-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="4" result="b1"/>
          <feMerge>
            <feMergeNode in="b1"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>

        <!-- Trait doré réutilisable -->
        <style>
          .gold-stroke{ stroke: var(--gold); stroke-width:2.2; paint-order: stroke; }
        </style>
      </defs>

      <!-- Halo circulaire -->
      <radialGradient id="halo" cx="50%" cy="45%" r="60%">
        <stop offset="0%" stop-color="rgba(255,211,92,.35)"/>
        <stop offset="60%" stop-color="rgba(255,211,92,.08)"/>
        <stop offset="100%" stop-color="rgba(255,211,92,0)"/>
      </radialGradient>
      <circle cx="300" cy="200" r="180" fill="url(#halo)"/>

      <!-- Groupe Phénix -->
      <g class="phoenix" fill="url(#fire)" class="gold-stroke">

        <!-- Corps (goutte/flamme) -->
        <path class="gold-stroke"
          d="M300,110
             C280,140 270,190 300,250
             C330,190 320,140 300,110Z" />

        <!-- Tête + bec -->
        <path class="gold-stroke"
          d="M300,105
             C292,100 292,90 300,85
             C308,90 308,100 300,105Z
             M302,92 L315,88 L305,98Z" />

        <!-- Aile gauche -->
        <path class="gold-stroke"
          d="M300,180
             C235,160 175,130 125,92
             C102,122 128,176 156,205
             C118,206 95,236 118,251
             C150,270 190,245 215,232
             C190,264 176,292 201,304
             C235,316 259,276 275,250
             Z" />

        <!-- Aile droite (miroir) -->
        <use href="#rightWing" />

        <!-- Définition de l’aile droite en miroir via un <g> transformé -->
        <g id="rightWing" transform="translate(600,0) scale(-1,1)">
          <path class="gold-stroke"
            d="M300,180
               C235,160 175,130 125,92
               C102,122 128,176 156,205
               C118,206 95,236 118,251
               C150,270 190,245 215,232
               C190,264 176,292 201,304
               C235,316 259,276 275,250
               Z" />
        </g>

        <!-- Plumes de queue -->
        <path class="gold-stroke" opacity="0.9"
          d="M300,250
             C290,300 295,330 300,360
             C305,330 310,300 300,250Z" />
        <path class="gold-stroke" opacity="0.75"
          d="M290,255
             C265,300 275,335 290,360
             C300,332 297,300 290,255Z" />
        <path class="gold-stroke" opacity="0.75"
          d="M310,255
             C335,300 325,335 310,360
             C300,332 303,300 310,255Z" />

      </g>

    </svg>
  </div>

  <div class="final-ui">
    <div class="victory-text">VICTOIRE</div>
    <button class="replay-btn">Rejouer</button>
  </div>
</div>
  `;

containerParent.appendChild(overlay);

  document.querySelector(".replay-btn")
    .addEventListener("click", () => window.location.reload());
}