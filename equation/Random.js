let policy = {
  allowNegativeP: false,  // pour randP
  allowNegativeN: false   // pour randN
};

export function setNumberPolicy(p) {
  policy = { ...policy, ...p };
}

export function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function randP(min, max) {

  if (!policy.allowNegativeP) {
    return rand(min, max);
  }

  const sign = Math.random() < 0.5 ? 1 : -1;
  return sign * rand(min, max);
}

export function randN(min, max) {

  if (!policy.allowNegativeN) {
    return rand(min, max);
  }

  const sign = Math.random() < 0.5 ? 1 : -1;
  return sign * rand(min, max);
}


export function formatNumber(n) {

  // Cas fraction (futur)
  if (typeof n === "object" && n.type === "fraction") {
    const value = `${n.num}/${n.den}`;
    return n.num < 0 ? `(${value})` : value;
  }

  // Cas nombre classique
  if (n < 0) {
    return `(${n})`;
  }

  return `${n}`;
}
