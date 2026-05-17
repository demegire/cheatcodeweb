# scripts

## bench-dashboard-load.mjs

Benchmarks the group + member fan-out that runs in `src/app/dashboard/page.tsx`
when a user lands on `/dashboard`. Uses `firebase-admin` so it can hit
production Firestore without going through client auth.

```bash
# Defaults: group "Cheatcode", user displayName "demegire", 15 iterations.
node scripts/bench-dashboard-load.mjs

# Override:
ITERATIONS=30 GROUP_NAME="Some Group" USER_DISPLAY_NAME="alice" \
  node scripts/bench-dashboard-load.mjs
```

It runs two implementations against the same group, interleaved, for `ITERATIONS` rounds each:

| Variant | What it does | Round-trip layers |
| --- | --- | --- |
| **OLD (serial)** | Mirrors the original `dashboard/page.tsx`: fetch the user doc, then loop the user's groups with `await getDoc(group)` and `await getDoc(user/{m})` per member. | `1 + G + G·M` (sequential) |
| **NEW (parallel)** | Fetches the user doc once, then `Promise.all` over all groups, collects the union of member UIDs, then `Promise.all` over each unique member. | 3 (`user → groups → unique members`) |

## Result on the "Cheatcode" group

- Group: `yb9D1mMXZ4`, 4 active members (incl. `demegire`).
- Run from a GCP `us-central1` VM to Firestore `us-central1` (low RTT, ~1–5 ms).
- 20 interleaved samples per variant, warmup excluded.

| Variant | avg | median | p95 | min | max |
| --- | --- | --- | --- | --- | --- |
| OLD (serial) | **460.1 ms** | 318.2 ms | 906.0 ms | 288.6 ms | 906.0 ms |
| NEW (parallel) | **244.0 ms** | 175.2 ms | 667.8 ms | 105.3 ms | 667.8 ms |

**Speedup: 1.89× — ~216 ms saved per dashboard load** for a single-group, 4-member case.

### Why real users will see a bigger win

The benchmark runs in the same region as Firestore, so each round-trip is
near-optimal (~30–60 ms once you factor in the per-call SDK overhead). A
browser user is typically 50–150 ms away from the Firestore endpoint. The
OLD pattern's wall-clock is dominated by the *sum* of round-trips, while the
NEW pattern's is dominated by the *max* of round-trips in each layer. So:

- On this VM the OLD/NEW gap is ~216 ms (the 4 serial member fetches reduce
  to one parallel batch).
- A user on home Wi-Fi (~80 ms RTT) saves closer to `(M-1) × RTT` per group
  — for 4 members in 1 group that's ~240 ms; for a user in *N* groups with
  shared members it scales by `(unique members − 1) × RTT` instead of
  `Σ (members_per_group − 1) × RTT`.

### What's not measured

- The initial JS bundle download and Firebase auth handshake (which run
  before any Firestore call) are unchanged by this fix.
- The current-week task and comment `onSnapshot` listeners (in
  `TaskTracker.tsx` and `MainLayout.tsx`) run after `setLoading(false)` and
  are identical in both variants.
- This benchmark also doesn't reflect the second fix in this change set —
  removing the duplicate comments listener from `CommentSection.tsx` —
  which is a wasted listener rather than added latency.
