// --- utils (global) ---
function gid(r, c) { return r + "_" + c; }

// --- classe Cellule (sans export, compatible Trinket) ---
class Cellule {
  constructor(r, c, opts = {}) {
    this.r = r;
    this.c = c;

    this.value    = (opts.value    !== undefined) ? opts.value    : null;   // number | string | null
    this.isEmoji  = (opts.isEmoji  !== undefined) ? opts.isEmoji  : (typeof this.value === "string");
    this.isActive = (opts.isActive !== undefined) ? opts.isActive : true;

    this.inPath = !!opts.inPath;
    this.isStart = !!opts.isStart;
    this.isEnd   = !!opts.isEnd;

    if (this.isEmoji && typeof this.value !== "string") {
      throw new Error("Cellule: isEmoji=true mais value n'est pas un string (emoji)");
    }
  }

  get id()       { return gid(this.r, this.c); }
  get isEmpty()  { return this.value === null || this.value === undefined; }
  get isNumber() { return typeof this.value === "number"; }
  get coords()   { return [this.r, this.c]; }

  setNumber(n) {
    if (typeof n !== "number" || !Number.isFinite(n)) {
      throw new Error("Cellule.setNumber: n doit être un nombre fini");
    }
    this.value = n;
    this.isEmoji = false;
    return this;
  }

  setEmoji(char, opts = {}) {
    if (typeof char !== "string" || !char.length) {
      throw new Error("Cellule.setEmoji: char doit être une chaîne non vide (emoji)");
    }
    this.value = char;
    this.isEmoji = true;
    if (opts.deactivate !== false) this.isActive = false; // par défaut on désactive
    return this;
  }

  clearValue() { this.value = null; this.isEmoji = false; return this; }

  activate(on = true) { this.isActive = !!on; return this; }
  deactivate() { this.isActive = false; return this; }

  markPath(on = true) { this.inPath = !!on; return this; }
  markStart(on = true) { this.isStart = !!on; return this; }
  markEnd(on = true) { this.isEnd = !!on; return this; }

  resetFlags() {
    this.inPath = false;
    this.isStart = false;
    this.isEnd = false;
    this.isActive = true;
    return this;
  }

  resetAll() {
    this.value = null;
    this.isEmoji = false;
    this.inPath = false;
    this.isStart = false;
    this.isEnd = false;
    this.isActive = true;
    return this;
  }

  clone() {
    return new Cellule(this.r, this.c, {
      value: this.value,
      isEmoji: this.isEmoji,
      isActive: this.isActive,
      inPath: this.inPath,
      isStart: this.isStart,
      isEnd: this.isEnd
    });
  }

  toJSON() {
    return {
      r: this.r, c: this.c, id: this.id,
      value: this.value,
      isEmoji: this.isEmoji,
      isActive: this.isActive,
      inPath: this.inPath,
      isStart: this.isStart,
      isEnd: this.isEnd
    };
  }

  toString() {
    const tag = this.isEmoji ? "emoji" : (this.isNumber ? "num" : "empty");
    return `Cell(${this.id})[${tag}:${this.value ?? "∅"}]` +
           (this.inPath ? " path" : "") +
           (this.isStart ? " start" : "") +
           (this.isEnd ? " end" : "") +
           (this.isActive ? " active" : " inactive");
  }
}

// exposer en global (Trinket)
window.gid = gid;
window.Cellule = Cellule;
