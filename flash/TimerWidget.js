export default class TimerWidget {

  static _styleInjected = false;

  constructor(container, options = {}) {
    this.container = container;

    this.duration = options.duration ?? 5 * 60;
    this.remaining = this.duration;
    this.running = false;
    this.interval = null;

    this._injectStyle();
    this._buildDOM();
    this._bind();
    this._update();
  }

  /* =========================
     CSS (injecté une fois)
     ========================= */

  _injectStyle() {
    if (TimerWidget._styleInjected) return;

    const style = document.createElement("style");
    style.textContent = `
      .gc-timer {
        position: relative;
        display: inline-block;
        width: 200px;          /* largeur max du panneau */
        height: 40px;
      }

      .gc-timer-slot {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        display: inline-flex;
        align-items: center;
      }

      .gc-round-btn {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        border: 2px solid #2563eb;
        background: #e0e7ff;
        color: #1e3a8a;
        font-size: 1.1em;
        line-height: 1;
        display: grid;
        place-items: center;
        cursor: pointer;
        padding: 0;
      }

      .gc-timer-panel {
        display: inline-flex;
        align-items: center;
        gap: 0.45em;
        padding: 0.25em 0.55em;
        border-radius: 999px;
        background: linear-gradient(180deg, #1e293b, #0f172a);
        color: #e5e7eb;
        box-shadow:
          inset 0 0 0 1px rgba(255,255,255,0.08),
          0 4px 12px rgba(0,0,0,0.35);
      }

      .gc-timer-display {
        min-width: 3.2em;
        text-align: center;
        font-weight: 600;
        letter-spacing: 0.04em;
      }

      .gc-timer [hidden] {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
    TimerWidget._styleInjected = true;
  }

  /* =========================
     DOM
     ========================= */

  _buildDOM() {
    this.container.classList.add("gc-timer");

    this.container.innerHTML = `
      <!-- SLOT CENTRAL -->
      <div class="gc-timer-slot">

        <!-- ÉTAT FERMÉ -->
        <button class="gc-timer-toggle gc-round-btn" title="Minuteur">
          ⏱
        </button>

        <!-- ÉTAT OUVERT -->
        <div class="gc-timer-panel" hidden>
          <button class="gc-timer-play gc-round-btn">▶</button>
          <span class="gc-timer-display">5:00</span>
          <button class="gc-timer-close gc-round-btn">✖</button>
        </div>

      </div>
    `;

    this.toggleBtn = this.container.querySelector(".gc-timer-toggle");
    this.panel     = this.container.querySelector(".gc-timer-panel");
    this.playBtn   = this.container.querySelector(".gc-timer-play");
    this.closeBtn  = this.container.querySelector(".gc-timer-close");
    this.display   = this.container.querySelector(".gc-timer-display");
  }

  /* =========================
     Events
     ========================= */

  _bind() {
    this.toggleBtn.addEventListener("click", () => this.open());
    this.closeBtn.addEventListener("click", () => this.close());
    this.playBtn.addEventListener("click", () => this.toggle());
  }

  /* =========================
     Logique temps
     ========================= */

  start() {
    if (this.running) return;
    this.running = true;
    this.playBtn.textContent = "⏸";

    this.interval = setInterval(() => {
      this.remaining--;
      this._update();
      if (this.remaining <= 0) this.stop();
    }, 1000);
  }

  stop() {
    clearInterval(this.interval);
    this.interval = null;
    this.running = false;
    this.playBtn.textContent = "▶";
  }

  toggle() {
    this.running ? this.stop() : this.start();
  }

  reset() {
    this.stop();
    this.remaining = this.duration;
    this._update();
  }

  open() {
    this.toggleBtn.hidden = true;
    this.panel.hidden = false;
  }

  close() {
    this.reset();
    this.panel.hidden = true;
    this.toggleBtn.hidden = false;
  }

  /* =========================
     Utils
     ========================= */

  _format(t) {
    const m = Math.floor(t / 60);
    const s = t % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  }

  _update() {
    this.display.textContent = this._format(this.remaining);
  }
}
