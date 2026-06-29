// Utils — fonctions minimales requises par Nombre.js

function abs(n) {
  return n < 0 ? -n : n;
}

function gcd(a, b) {
  a = abs(a); b = abs(b);
  while (b) { let t = b; b = a % b; a = t; }
  return a;
}
