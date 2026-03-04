export class History {

  constructor() {
    this._events = [];
  }

  /* ===============================
     AJOUT QUESTION
  =============================== */

  addQuestion(data) {
    this._events.push({
      type: "question",
      timestamp: Date.now(),
      ...data
    });
  }

  /* ===============================
     AJOUT RÉSUMÉ QUIZ
  =============================== */

  addQuizSummary(data) {
    this._events.push({
      type: "quiz",
      timestamp: Date.now(),
      ...data
    });
  }

  /* ===============================
     LECTURE
  =============================== */

  getAll() {
    return [...this._events];
  }

  getByQuizId(quizId) {
    return this._events.filter(e => e.quizId === quizId);
  }

  getGlobalStats() {

    const questions = this._events.filter(e => e.type === "question");

    const total = questions.length;

    const correct =
      questions.filter(q => q.result === "vrai").length;

    const faux =
      questions.filter(q => q.result === "faux").length;

    const abandon =
      questions.filter(q => q.result === "abandon").length;

    const totalAttempts =
      questions.reduce((sum, q) => sum + q.attempts, 0);

    return {
      totalExercises: total,
      totalCorrect: correct,
      totalFaux: faux,
      totalAbandon: abandon,
      totalAttempts
    };
  }

  getSummaryStats() {

    const questions = this._events.filter(e => e.type === "question");
    const quizzes = this._events.filter(e => e.type === "quiz");

    const total = questions.length;

    if (total === 0) {
      return {
        totalQuestions: 0,
        totalCorrect: 0,
        averageLevel: 0,
        averageAttempts: 0,
        successRate: 0,
        totalQuizzes: quizzes.length,
        quizzes
      };
    }

    const totalCorrect =
      questions.filter(q => q.result === "vrai").length;

    const averageLevel =
      (
        questions.reduce((sum, q) => sum + Number(q.niveau), 0)
        / total
      ).toFixed(2);

    const retryQuestions =
      questions.filter(q => q.retry);

    const averageAttempts =
      retryQuestions.length > 0
        ? (
            retryQuestions.reduce((sum, q) => sum + q.attempts, 0)
            / retryQuestions.length
          ).toFixed(2)
        : 0;

    const successRate =
      ((totalCorrect / total) * 100).toFixed(1);

    return {
      totalQuestions: total,
      totalCorrect,
      averageLevel,
      averageAttempts,
      successRate,
      totalQuizzes: quizzes.length,
      quizzes
    };
  }
}