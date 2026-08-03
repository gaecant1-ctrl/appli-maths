export function pgcd(a, b) {
  if (b === 0) return a;
  return pgcd(b, a % b);
}

export function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

export function correspond(a, b) {
  if (a.type === "fraction" && b.type === "duree") {
    return a.toMinutes() === b.totalMinutes;
  }

  if (b.type === "fraction" && a.type === "duree") {
    return b.toMinutes() === a.totalMinutes;
  }

  return false;
}