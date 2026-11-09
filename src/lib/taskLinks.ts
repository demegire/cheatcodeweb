// Shareable deep links to a single task:
//   /dashboard?group=<groupId>&week=<YYYY-Www>&task=<taskId>
// The group is needed because comments are group-scoped (and global tasks show
// up in every group). The day comes from the task itself once it loads.
// Without `task` the link opens that group's week with the comments panel
// (used for @mentions in the general weekly chat).

export interface TaskLink {
  groupId: string;
  weekId: string;
  taskId?: string | null;
}

const WEEK_ID = /^\d{4}-W\d{2}$/;
const PENDING_KEY = 'pendingTaskLink';

export function buildTaskPath({ groupId, weekId, taskId }: TaskLink): string {
  const params = new URLSearchParams({ group: groupId, week: weekId });
  if (taskId) params.set('task', taskId);
  return `/dashboard?${params.toString()}`;
}

export function parseTaskLink(search: string): TaskLink | null {
  const params = new URLSearchParams(search);
  const groupId = params.get('group');
  const weekId = params.get('week');
  const taskId = params.get('task');
  if (!groupId || !weekId || !WEEK_ID.test(weekId)) return null;
  return { groupId, weekId, taskId };
}

export function readTaskLinkFromLocation(): TaskLink | null {
  if (typeof window === 'undefined') return null;
  return parseTaskLink(window.location.search);
}

// Survives the trip through the login page when a signed-out user opens a link.
export function stashPendingTaskLink(link: TaskLink) {
  try {
    localStorage.setItem(PENDING_KEY, buildTaskPath(link));
  } catch {}
}

// Read (not removed) by the login page, so it survives a reload there; the
// dashboard clears it once a signed-in user arrives.
export function peekPendingTaskPath(): string | null {
  try {
    const path = localStorage.getItem(PENDING_KEY);
    if (path && path.startsWith('/dashboard?') && parseTaskLink(path.slice('/dashboard'.length))) {
      return path;
    }
  } catch {}
  return null;
}

export function clearPendingTaskLink() {
  try {
    localStorage.removeItem(PENDING_KEY);
  } catch {}
}
