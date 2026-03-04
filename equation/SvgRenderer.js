import { Systeme } from "./Systeme.js";

export class SvgRenderer {
  render(exercise, svg, dico) {
    const systeme = new Systeme(
      exercise.equations,
      exercise.rep
    );

    systeme.render(svg, dico);
  }
}