// Cache of the user's group+member graph in localStorage so the dashboard
// can render instantly from cache while Firestore revalidates in the
// background. Keyed by uid so multiple accounts on the same browser don't
// collide.

export interface CachedMember {
  id: string;
  name: string;
  color: string;
  joinedAt?: number;
}

export interface CachedGroup {
  id: string;
  name: string;
  members: CachedMember[];
}

export interface CachedDashboard {
  cachedAt: number;
  groups: CachedGroup[];
  pinnedGroupId: string | null;
  selectedGroupId: string | null;
}

const PREFIX = 'cc-dash-v1:';
// Always revalidated in the background, so this only bounds how stale the
// first paint can be for someone returning after a while.
const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function readDashboardCache(uid: string): CachedDashboard | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(PREFIX + uid);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDashboard;
    if (!parsed.cachedAt || Date.now() - parsed.cachedAt > TTL_MS) {
      localStorage.removeItem(PREFIX + uid);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function writeDashboardCache(
  uid: string,
  data: Omit<CachedDashboard, 'cachedAt'>
) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      PREFIX + uid,
      JSON.stringify({ cachedAt: Date.now(), ...data })
    );
  } catch {
    // Storage full or disabled — give up silently.
  }
}

// True if any account on this browser has a fresh cache entry, i.e. a
// returning user who can go straight to /dashboard without waiting on auth.
export function hasDashboardCache(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .some(k => readDashboardCache(k.slice(PREFIX.length)) !== null);
  } catch {
    return false;
  }
}

export function clearDashboardCache(uid?: string) {
  if (typeof window === 'undefined') return;
  try {
    if (uid) {
      localStorage.removeItem(PREFIX + uid);
      return;
    }
    Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX))
      .forEach(k => localStorage.removeItem(k));
  } catch {
    // ignore
  }
}
