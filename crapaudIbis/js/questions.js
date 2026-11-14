// ============================================================
//  Le crapaud et l'ibis — LES QUESTIONS
//  Maths de 6e ; français : le récit, la grammaire, la conjugaison et le vocabulaire, d'après le texte d'Homère
//  (chaque question indique le chant de l'Odyssée d'où elle vient ; les phrases sont adaptées pour la 6e).
// ============================================================
const $ = id => document.getElementById(id);
const fr = s => String(s).replace(/ ([?!:;»])/g, " $1").replace(/« /g, "« ");
const lignes = s => s.replace(/ — /g, "\n").replace(/ ; /g, " ;\n").replace(/([.…)]) (?=[A-ZÀ-ÖØ-Ý(«])/g, "$1\n");
const esc = t => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;");
const frac = (a, b) => `<span class="frac"><span>${a}</span><span>${b}</span></span>`;
const hasard = n => Math.floor(Math.random() * n);
const entier = (a, b) => a + hasard(b - a + 1);
const pgcd = (a, b) => b ? pgcd(b, a % b) : a;
const melanger = t => { t = [...t]; for (let k = t.length - 1; k > 0; k--) { const j = hasard(k + 1); [t[k], t[j]] = [t[j], t[k]]; } return t; };
const choisir = t => t[hasard(t.length)];
const nb = x => String(Math.round(x * 1000) / 1000).replace(".", ",").replace(/\B(?=(\d{3})+(?!\d))/g, " ");
const sansAccent = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// ---------- Lire les réponses écrites ----------
function lireNombre(t, q) {
  const s = t.replace(/\s/g, "").replace(/(m²|m2|cm|km|m|l|litres?|h|min|€|hommes|moutons|vents|ans|jours|chars|roues)$/i, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(s)) return { aide: "Écris un nombre, par exemple 48 ou 7,5." };
  return { ok: Math.abs(parseFloat(s) - q.r) < 1e-9 };
}
// une fraction a/b ; une fraction égale est acceptée (2/4 pour 1/2), sauf si on demande la forme irréductible
function lireFraction(t, q) {
  const s = t.replace(/\s/g, "");
  let m = s.match(/^(\d+)\/(\d+)$/);
  if (!m) { if (/^\d+$/.test(s)) m = [0, s, "1"]; else return { aide: "Écris une fraction avec une barre, par exemple 3/4." }; }
  const a = +m[1], b = +m[2];
  if (!b) return { aide: "Le dénominateur ne peut pas être 0." };
  const egal = a * q.b === b * q.a;
  if (egal && q.irreductible && pgcd(a, b) !== 1) return { ok: false, presque: `${a}/${b} est bien égale à la bonne réponse, mais elle n'est pas simplifiée.` };
  return { ok: egal };
}
// une durée : « 2 h 15 min », « 2h15 », « 135 min »
function lireDuree(t, q) {
  const s = t.toLowerCase().replace(/\s/g, "").replace("+", "");
  let m = s.match(/^(\d+)h(\d+)?(min)?$/), min;
  if (m) min = 60 * +m[1] + +(m[2] || 0);
  else if ((m = s.match(/^(\d+)(min)$/))) min = +m[1];
  else return { aide: "Écris une durée avec h et min, par exemple 2 h 15 min." };
  return { ok: min === q.r };
}
const duree = m => `${Math.floor(m / 60)} h${m % 60 ? " " + String(m % 60).padStart(2, "0") + " min" : ""}`;
const heure = m => `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}`;

// ---------- Fabriquer une question ----------
// maths : une réponse écrite ; français : un choix parmi plusieurs (le premier de la liste est le bon, on mélange)
function qMaths(html, r, correction, { lire = lireNombre, placeholder, ...autres } = {}) {
  return { matiere: "maths", html, r, correction, lire, placeholder, ...autres };
}
function qChoix(matiere, html, choix, correction, extra = {}) {
  const ordre = melanger(choix.map((c, k) => k));
  return { matiere, html, choix: ordre.map(k => choix[k]), bonne: ordre.indexOf(0), correction, ...extra };
}
// une question de français tirée d'une banque, sans retomber sur une question déjà posée dans la partie
const dejaPosees = new Set();
function tirer(banque) {
  let libres = banque.filter(it => !dejaPosees.has(it.q));
  if (!libres.length) { banque.forEach(it => dejaPosees.delete(it.q)); libres = banque; }
  const it = choisir(libres); dejaPosees.add(it.q);
  return it;
}
// l'extrait d'Homère, sa source, et les noms latins ou grecs expliqués
function htmlExtrait(it) {
  if (!it.extrait) return "";
  const noms = NOMS.filter(([n]) => it.extrait.includes(n)).map(([n, m]) => `${n} = ${m}`);
  return `<blockquote class="extrait">« ${it.extrait} »<cite>Homère, <i>Odyssée</i>, chant ${it.chant}, ${TRADUCTIONS[it.trad]}${noms.length ? "<br>(" + noms.join(" ; ") + ")" : ""}</cite></blockquote>`;
}
function qFrancais(banque) {
  const it = tirer(banque);
  return qChoix("francais", `${htmlExtrait(it)}${it.q}`, it.choix, it.expl, { court: it.court });
}

// ============================================================
//  LA NUMÉRATION ÉGYPTIENNE : le bâton (1), l'anse (10), la corde enroulée (100), la fleur de lotus (1 000), le doigt (10 000)
// ============================================================
const SIGNES_EG = [[10000, "doigt", "doigts"], [1000, "fleur de lotus", "fleurs de lotus"], [100, "corde enroulée", "cordes enroulées"], [10, "anse", "anses"], [1, "bâton", "bâtons"]];
const chiffresDe = n => SIGNES_EG.map(([v]) => Math.floor(n / v) % 10);     // [dizaines de mille, milliers, centaines, dizaines, unités]
const nbSignes = n => chiffresDe(n).reduce((a, b) => a + b, 0);
function detailEgyptien(n) {
  return SIGNES_EG.map(([v, un, plus], k) => { const c = chiffresDe(n)[k]; return c ? `${c} ${c > 1 ? plus : un} = ${nb(c * v)}` : null; }).filter(Boolean).join(" ; ");
}
// le nombre est écrit sur le papyrus que déroule le scribe (question.papyrus)
function qLireEgyptien(max = 4999) {
  let n; do n = entier(120, max); while (nbSignes(n) > 22);
  return qMaths(`Le scribe a écrit un nombre sur le papyrus, en chiffres égyptiens.<div class="gros">Quel est ce nombre ?</div>`, n,
    `${detailEgyptien(n)}. En tout : ${nb(n)}.`, { papyrus: n });
}
function qSignesEgyptien() {
  let n; do n = entier(1200, 4999); while (nbSignes(n) > 26);
  return qMaths(`Le scribe doit écrire <b>${nb(n)}</b> en chiffres égyptiens.<div class="gros">Combien de signes va-t-il dessiner ?</div>`, nbSignes(n),
    `${nb(n)} : ${detailEgyptien(n)}. On compte les signes : ${chiffresDe(n).filter(c => c).join(" + ")} = ${nbSignes(n)} signes.`);
}

// ============================================================
//  LES ÉNIGMES D'ANUBIS (en cas de danger : il pèse ton cœur)
// ============================================================
let derniereEnigme = -1;
function nouvelleEnigme() {
  let k; do k = hasard(5); while (k === derniereEnigme); derniereEnigme = k;
  if (k === 0) { const x = entier(3, 15), a = entier(3, 6), b = entier(2, 12), y = a * x + b;
    return { texte: `Je pense à un nombre. Je le multiplie par ${a}, puis j'ajoute ${b} : j'obtiens ${y}. Quel est mon nombre ?`, r: x,
      correction: `On remonte le calcul : ${y} − ${b} = ${y - b}, puis ${y - b} : ${a} = ${x}. (Vérification : ${a} × ${x} + ${b} = ${y}.)` }; }
  if (k === 1) { const [a, b] = choisir([[3, 4], [2, 3], [2, 5], [3, 5]]), u = entier(3, 9);
    return { texte: `${a}/${b} de mes dattes font ${a * u} dattes. Combien ai-je de dattes en tout ?`, r: b * u,
      correction: `${a} parts font ${a * u}, donc une part fait ${a * u} : ${a} = ${u}. En tout, ${b} parts : ${b} × ${u} = ${b * u} dattes.` }; }
  if (k === 2) { const t = entier(6, 10), m = entier(1, t - 1), pattes = 2 * (t - m) + 4 * m;
    return { texte: `Dans la cour du temple, il y a des oies et des chèvres : je compte ${t} têtes et ${pattes} pattes. Combien y a-t-il de chèvres ?`, r: m,
      correction: `Si c'étaient ${t} oies, il y aurait ${2 * t} pattes. Il y en a ${pattes - 2 * t} de plus ; chaque chèvre a 2 pattes de plus qu'une oie : ${pattes - 2 * t} : 2 = ${m} chèvres.` }; }
  if (k === 3) { const p = choisir([25, 50, 75]);
    return { texte: `Je dors ${p} % de la journée. Combien d'heures est-ce que je dors ?`, r: 24 * p / 100,
      correction: `Une journée dure 24 heures. ${p} % de 24 : ${p === 50 ? "la moitié, 12" : p === 25 ? "le quart, 6" : "les trois quarts, 3 × 6 = 18"} heures.` }; }
  const [a, b, m] = choisir([[4, 6, 12], [6, 8, 24], [3, 5, 15], [6, 9, 18], [4, 10, 20]]);
  return { texte: `Je suis le plus petit nombre entier, plus grand que 0, qui est à la fois dans la table de ${a} et dans la table de ${b}. Qui suis-je ?`, r: m,
    correction: `Table de ${a} : ${[1, 2, 3, 4, 5, 6].map(k => a * k).join(", ")}… Table de ${b} : ${[1, 2, 3, 4].map(k => b * k).join(", ")}… Le premier nombre commun est ${m}.` };
}


// pas encore de questions de français dans cet univers
const qMixte = () => null;

// ============================================================
//  LES DÉBITS (le temple aux portes de sable) : le sable s'écoule à tant de litres par minute
// ============================================================
// la porte à contrepoids : combien de minutes pour remplir le panier ?
function qDebitPorte() {
  const d = entier(3, 9), k = entier(4, 9), v = d * k;
  return qMaths(`Le sable coule du grand vase à <b>${d} litres par minute</b>. Pour ouvrir la porte, le panier du contrepoids doit recevoir <b>${v} litres</b> de sable.<div class="gros">Combien de minutes faut-il ?</div>`, k,
    `En 1 minute : ${d} L. Il faut ${v} L : ${v} : ${d} = ${k} minutes (car ${k} × ${d} = ${v}).`, { placeholder: "en minutes", debit: { d, v } });
}
// la fosse : deux trous versent du sable
function qDebitFosse() {
  const d = entier(2, 6), k = entier(3, 8), v = 2 * d * k;
  return qMaths(`La fosse peut contenir <b>${v} litres</b> de sable. Deux trous du plafond versent chacun <b>${d} litres par minute</b>.<div class="gros">En combien de minutes la fosse sera-t-elle pleine ?</div>`, k,
    `Les deux trous ensemble versent ${d} + ${d} = ${2 * d} L par minute. ${v} : ${2 * d} = ${k} minutes.`, { placeholder: "en minutes", debit: { d: 2 * d, v } });
}
// la dernière porte : retrouver le débit, ou une durée
function qDebitDerniere() {
  if (hasard(2)) {
    const d = entier(4, 12), k = entier(3, 8), v = d * k;
    return qMaths(`Le sablier de la dernière porte s'est vidé : <b>${v} litres</b> de sable ont coulé en <b>${k} minutes</b>, toujours au même rythme.<div class="gros">Quel est le débit, en litres par minute ?</div>`, d,
      `En ${k} minutes : ${v} L. En 1 minute : ${v} : ${k} = ${d} L. Le débit est de ${d} litres par minute.`, { placeholder: "L par minute", debit: { d, v } });
  }
  const h = entier(8, 15), m0 = entier(0, 11) * 5, duree = entier(5, 13) * 5, f = h * 60 + m0 + duree;
  return qMaths(`Le prêtre ouvre le grand sablier à <b>${h} h ${String(m0).padStart(2, "0")}</b>. Le sable coule pendant <b>${duree} minutes</b>.<div class="gros">À quelle heure le sablier sera-t-il vide ?</div>`, f,
    `${h} h ${String(m0).padStart(2, "0")} + ${duree} min = ${Math.floor(f / 60)} h ${String(f % 60).padStart(2, "0")}.`, { lire: lireHeure, placeholder: "… h …" });
}
// une heure : « 10 h 25 », « 10h25 »
function lireHeure(t, q) {
  const m = t.toLowerCase().replace(/\s/g, "").match(/^(\d{1,2})h(\d{1,2})?(min)?$/);
  if (!m) return { aide: "Écris une heure, par exemple 10 h 25." };
  return { ok: 60 * +m[1] + +(m[2] || 0) === q.r };
}
