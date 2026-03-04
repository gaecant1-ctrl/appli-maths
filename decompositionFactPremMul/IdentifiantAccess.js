class IdentifiantAccess {
  constructor(onReady) {
    this.identifiant = "";
    this.dialog = null;
    this.input = null;
    this.btn = null;
    this._onReady = onReady;
    this.initDialog();
    this.showDialog();
  }

  initDialog() {
    if (this.dialog) return;
    this.dialog = document.createElement("div");
    this.dialog.id = "dialogIdentifiant";
    this.dialog.style.cssText = "display:none; position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.35); z-index:9999; justify-content:center; align-items:center;";
    this.dialog.innerHTML = `
      <div style="background:white; padding:32px 28px 18px 28px; border-radius:14px; box-shadow:0 4px 28px rgba(0,0,0,0.13); min-width:260px; display:flex; flex-direction:column; align-items:center;">
        <h2 style="margin-bottom:18px; color:#4A90E2;">Identifiant</h2>
        <input id="identifiantDialogInput" type="text" placeholder="prénom" style="margin-bottom:14px; padding:8px 12px; font-size:1.1em; border-radius:7px; border:1.5px solid #b3c2d6; width:180px;">
        <button id="identifiantDialogBtn" style="padding:8px 28px; border-radius:7px; background:#4A90E2; color:white; font-size:1em; border:none; cursor:pointer;">Valider</button>
      </div>
    `;
    document.body.appendChild(this.dialog);
    this.input = this.dialog.querySelector("#identifiantDialogInput");
    this.btn = this.dialog.querySelector("#identifiantDialogBtn");
    this.btn.onclick = () => this.valider();
    this.input.onkeydown = (e) => { if (e.key === "Enter") this.valider(); };
  }

  showDialog() {
    try {
      this.input.value = localStorage.getItem("identifiantUtilisateur") || "";
    } catch (e) {
      this.input.value = "";
    }
    this.dialog.style.display = "flex";
    this.input.focus();
  }

valider() {
  const val = this.input.value.trim();
  // N'accepte que les lettres (y compris accentuées), au moins 2 caractères
  if (!/^[\p{L}]{2,30}$/u.test(val)) {
    alert("Merci d'entrer un prénom valide (lettres uniquement, 2 à 30 caractères).");
    this.input.focus();
    return;
  }
  this.identifiant = val;
  try {
    localStorage.setItem("identifiantUtilisateur", val);
  } catch (e) {}
  this.dialog.style.display = "none";
  if (typeof this._onReady === "function") {
    this._onReady(val);
  }
}

}
