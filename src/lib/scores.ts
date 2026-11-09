import { Task } from '../types';

// Suggested, info and goal tasks don't count toward a member's score.
export const countsTowardScore = (task: Task) => {
  return task.status !== 'suggested' && task.status !== 'info' && task.status !== 'goal';
};

// Percentage of counted tasks that are completed, per member. Members with no
// counted tasks are left out (the UI shows no score for them).
export const computeScores = (
  memberIds: string[],
  tasksByMember: Record<string, Task[]>
): Record<string, number> => {
  const scores: Record<string, number> = {};
  memberIds.forEach(id => {
    const memberTasks = tasksByMember[id] || [];
    const totalCount = memberTasks.filter(countsTowardScore).length;
    if (totalCount > 0) {
      const completedCount = memberTasks.filter(t => t.status === 'completed').length;
      scores[id] = (completedCount / totalCount) * 100;
    }
  });
  return scores;
};
