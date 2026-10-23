import { describe, it, expect } from 'vitest';
import { computeScores } from './scores';
import { Task, TaskStatus } from '../types';

const task = (status: TaskStatus): Task =>
  ({ id: status, text: '', status, day: 0, createdBy: 'a', createdAt: new Date(), weekId: '2026-W43' }) as Task;

describe('computeScores', () => {
  it('is completed / counted tasks, as a percentage', () => {
    const scores = computeScores(['a'], {
      a: [task('completed'), task('not-done'), task('postponed'), task('completed')],
    });
    expect(scores.a).toBe(50);
  });

  it('ignores suggested, info and goal tasks', () => {
    const scores = computeScores(['a'], {
      a: [task('completed'), task('suggested'), task('info'), task('goal')],
    });
    expect(scores.a).toBe(100);
  });

  it('leaves out members with nothing to count', () => {
    const scores = computeScores(['a', 'b', 'c'], {
      a: [task('info')],
      b: [],
    });
    expect(scores).toEqual({});
  });
});
