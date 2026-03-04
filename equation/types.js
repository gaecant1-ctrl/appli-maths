import { registerArithmeticTypes } from "./typesArithmetic.js";
import { registerAlgebraicTypes } from "./typesAlgebraic.js";
import { registerEquationTypes } from "./typesEquation.js";

export function registerAllTypes(registry) {
  registerArithmeticTypes(registry);
  registerAlgebraicTypes(registry);
  registerEquationTypes(registry);
}