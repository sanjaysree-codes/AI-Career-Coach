import test from 'node:test';
import assert from 'node:assert/strict';
import { analyticsPayload } from '../src/additional-features.js';

test('analytics is built from persisted component results and round history', () => {
  const data = analyticsPayload({
    resumes: [{ _id: 'resume-1', createdAt: '2026-01-01', analysisResult: { overallScore: 100 } }],
    attempts: [
      { _id: 'aptitude-1', score: 80, submittedAt: '2026-01-02', evaluation: { details: [{ topic: 'Logic', selected: 1, isCorrect: true }] }, assessmentId: { roundType: 'aptitude', title: 'Aptitude 1' } },
      { _id: 'coding-1', score: 60, submittedAt: '2026-01-03', evaluation: {}, assessmentId: { roundType: 'coding', title: 'Coding 1' } },
    ],
    interviews: [{ _id: 'hr-1', overallScore: 90, completedAt: '2026-01-04' }],
    reports: [],
  });
  assert.deepEqual(data.components, { resume: 100, aptitude: 80, coding: 60, hr: 90 });
  assert.equal(data.overallScore, 79);
  assert.equal(data.history.length, 4);
  assert.equal(data.topics[0].topic, 'Logic');
});

test('analytics shows no overall score when a required component is missing', () => {
  const data = analyticsPayload({ resumes: [], attempts: [], interviews: [], reports: [] });
  assert.equal(data.overallScore, null);
  assert.deepEqual(data.recommendations, []);
});
