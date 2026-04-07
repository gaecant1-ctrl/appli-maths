export class QuizSession {

  constructor(total) {
    this.quizId = crypto.randomUUID();
    this.total = total;

    this.done = 0;
    this.score = 0;
    this.totalAttempts = 0;
  }

  registerQuestion(result, attempts) {
    this.done++;
    this.totalAttempts += attempts;

    if (result === "vrai") {
      this.score++;
    }
  }

  isFinished() {
    return this.done >= this.total;
  }

  getSummary() {
    const moyenne =
      this.total > 0
        ? (this.totalAttempts / this.total).toFixed(2)
        : 0;

    return {
      quizId: this.quizId,
      total: this.total,
      score: this.score,
      moyenneAttempts: moyenne
    };
  }

  getLiveStats() {

    const faux = this.done - this.score;

    return {
      totalExercises: this.done,
      totalCorrect: this.score,
      totalFaux: faux,
      totalAbandon: 0, // déjà compté via result transmis
      totalAttempts: this.totalAttempts
    };
  }
}