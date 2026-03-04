class ScoreSender {
  constructor(options = {}) {
    // URL du endpoint Formspree ou autre
    this.endpoint = options.endpoint || "https://formspree.io/f/xzzrojeb";
    this.debug = !!options.debug;
  }

  send(score, identifiant, extra = {}) {
    if (this.debug) {
      console.log("[ScoreSender] Envoi du score", { score, identifiant, ...extra });}
    const formData = new FormData();
    formData.append("score", score);
    formData.append("identifiant", identifiant);
    formData.append("page_url", window.location.href);

    // Ajout d'info supplémentaire si besoin (ex: date, temps, etc.)
    for (const [key, value] of Object.entries(extra)) {
      formData.append(key, value);
    }

    return fetch(this.endpoint, {
      method: "POST",
      body: formData,
      headers: { "Accept": "application/json" }
    })
      .then(response => {
        if (response.ok) {
          if (this.debug) console.log("[ScoreSender] Score envoyé !");
          return true;
        } else {
          if (this.debug) console.error("[ScoreSender] Erreur d'envoi :", response.statusText);
          return false;
        }
      })
      .catch(error => {
        if (this.debug) console.error("[ScoreSender] Erreur réseau :", error);
        return false;
      });
  }
}

window.ScoreSender = ScoreSender;
