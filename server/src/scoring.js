export function gradeAptitude(questions, answers = {}) {
  let attempted = 0;
  let correct = 0;
  const details = questions.map((question, index) => {
    const selected = answers[index];
    if (selected !== undefined && selected !== null) attempted += 1;
    const isCorrect = selected === question.answerIndex;
    if (isCorrect) correct += 1;
    return {
      question: question.text,
      selected: selected ?? null,
      correctAnswer: question.answerIndex,
      explanation: question.explanation,
      isCorrect,
      topic: question.topic,
    };
  });
  return {
    score: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    correct,
    incorrect: attempted - correct,
    unanswered: questions.length - attempted,
    accuracy: attempted ? Math.round((correct / attempted) * 100) : null,
    details,
  };
}

export function weightedPlacementScore({ resume, aptitude, coding, hr }) {
  return Math.round(resume * 0.2 + aptitude * 0.25 + coding * 0.35 + hr * 0.2);
}

export function summarizeAttemptComparisons(attempts) {
  const grouped = new Map();
  for (const attempt of [...attempts].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))) {
    const type = attempt.assessmentId?.roundType;
    if (!type) continue;
    const rows = grouped.get(type) || [];
    rows.push({ id: String(attempt._id), score: attempt.score, submittedAt: attempt.submittedAt, evaluation: attempt.evaluation, title: attempt.assessmentId.title });
    grouped.set(type, rows);
  }
  return Object.fromEntries([...grouped].map(([type, rows]) => {
    const previous = rows.at(-2) || null;
    const current = rows.at(-1) || null;
    return [type, { attempts: rows, previous, current, scoreChange: previous && current ? current.score - previous.score : null }];
  }));
}

export function topicPerformance(attempts) {
  const totals = new Map();
  for (const attempt of attempts) {
    for (const row of attempt.evaluation?.details || []) {
      if (!row.topic) continue;
      const stats = totals.get(row.topic) || { topic: row.topic, correct: 0, attempted: 0 };
      if (row.selected !== null && row.selected !== undefined) stats.attempted += 1;
      if (row.isCorrect) stats.correct += 1;
      totals.set(row.topic, stats);
    }
  }
  return [...totals.values()].map(x => ({ ...x, accuracy: x.attempted ? Math.round(x.correct / x.attempted * 100) : null })).sort((a, b) => (b.accuracy ?? -1) - (a.accuracy ?? -1));
}

export function compareTopicPerformance(attempts) {
  const series = new Map();
  for (const attempt of [...attempts].sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))) {
    const groups = new Map();
    for (const row of attempt.evaluation?.details || []) {
      if (!row.topic) continue;
      const stats = groups.get(row.topic) || { correct: 0, attempted: 0 };
      if (row.selected !== null && row.selected !== undefined) stats.attempted += 1;
      if (row.isCorrect) stats.correct += 1;
      groups.set(row.topic, stats);
    }
    for (const [topic, stats] of groups) {
      if (!stats.attempted) continue;
      const points = series.get(topic) || [];
      points.push({ attemptId: String(attempt._id), accuracy: Math.round(stats.correct / stats.attempted * 100), submittedAt: attempt.submittedAt });
      series.set(topic, points);
    }
  }
  return [...series].map(([topic, points]) => {
    const previous = points.at(-2) || null;
    const current = points.at(-1) || null;
    return { topic, previous, current, change: previous && current ? current.accuracy - previous.accuracy : null };
  }).sort((a, b) => (a.current?.accuracy ?? 0) - (b.current?.accuracy ?? 0));
}
