import test from 'node:test';
import assert from 'node:assert/strict';
import { compareTopicPerformance, gradeAptitude, summarizeAttemptComparisons, topicPerformance, weightedPlacementScore } from '../src/scoring.js';

const questions = [
  { text: 'One', answerIndex: 1, explanation: 'One.', topic: 'Logic' },
  { text: 'Two', answerIndex: 0, explanation: 'Two.', topic: 'Math' },
  { text: 'Three', answerIndex: 2, explanation: 'Three.', topic: 'Math' },
];

test('aptitude scoring counts correct, incorrect, and unanswered separately', () => {
  const result = gradeAptitude(questions, { 0: 1, 1: 3 });
  assert.equal(result.score, 33);
  assert.equal(result.correct, 1);
  assert.equal(result.incorrect, 1);
  assert.equal(result.unanswered, 1);
  assert.equal(result.accuracy, 50);
});

test('aptitude accuracy is null when no answers were attempted', () => {
  const result = gradeAptitude(questions);
  assert.equal(result.score, 0);
  assert.equal(result.accuracy, null);
  assert.equal(result.unanswered, 3);
});

test('the placement score follows the configured 20/25/35/20 weights', () => {
  assert.equal(weightedPlacementScore({ resume: 100, aptitude: 80, coding: 60, hr: 90 }), 79);
});

test('comparison preserves attempts and compares the latest two scores', () => {
  const summary = summarizeAttemptComparisons([
    { _id: 'a', score: 60, submittedAt: '2026-01-01', assessmentId: { roundType: 'aptitude', title: 'First' } },
    { _id: 'b', score: 75, submittedAt: '2026-01-02', assessmentId: { roundType: 'aptitude', title: 'Second' } },
    { _id: 'c', score: 40, submittedAt: '2026-01-03', assessmentId: { roundType: 'coding', title: 'Code' } },
  ]);
  assert.equal(summary.aptitude.attempts.length, 2);
  assert.equal(summary.aptitude.scoreChange, 15);
  assert.equal(summary.coding.scoreChange, null);
});

test('topic accuracy uses only submitted answers', () => {
  const topics = topicPerformance([{ evaluation: { details: [
    { topic: 'Logic', selected: 1, isCorrect: true },
    { topic: 'Logic', selected: 0, isCorrect: false },
    { topic: 'Logic', selected: null, isCorrect: false },
  ] } }]);
  assert.equal(topics[0].accuracy, 50);
  assert.equal(topics[0].attempted, 2);
});

test('topic comparisons identify improvement and decline across saved attempts', () => {
  const attempts = [
    { _id: 'a', submittedAt: '2026-01-01', evaluation: { details: [
      { topic: 'Logic', selected: 1, isCorrect: true }, { topic: 'Logic', selected: 0, isCorrect: false },
      { topic: 'Math', selected: 1, isCorrect: true }, { topic: 'Math', selected: 0, isCorrect: true },
    ] } },
    { _id: 'b', submittedAt: '2026-01-02', evaluation: { details: [
      { topic: 'Logic', selected: 1, isCorrect: true }, { topic: 'Logic', selected: 0, isCorrect: true },
      { topic: 'Math', selected: 1, isCorrect: false }, { topic: 'Math', selected: 0, isCorrect: false },
    ] } },
  ];
  const comparison = compareTopicPerformance(attempts);
  assert.equal(comparison.find(x => x.topic === 'Logic').change, 50);
  assert.equal(comparison.find(x => x.topic === 'Math').change, -100);
});
