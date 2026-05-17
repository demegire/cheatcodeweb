# Cheatcode (cheat-code.cc)

Collaborative weekly task tracker for accountability between friends. Users create groups, share invite links, and see each other's weekly task grids side-by-side. Tasks can be marked done/postponed/info, suggested for other members, timed, and commented on.

Production: https://cheat-code.cc

## Stack

- **Next.js 15** App Router with **React 19** and **Turbopack** dev.
- **TypeScript**, **Tailwind v4** (PostCSS plugin), ESLint flat config.
- **Firebase** (client SDK) for Auth (Google), Firestore, and Cloud Messaging.
- **firebase-admin** server-side, used only by the `/api/notify` route.
- **Vercel** hosting, with `@vercel/analytics`.
- Misc: `nanoid` for group IDs, `react-colorful` for member color picker, `chart.js`/`react-chartjs-2` for stats, `@heroicons/react` + `react-icons`.

## Scripts

```
npm run dev    # next dev --turbopack
npm run build  # next build
npm run start
npm run lint
```

## Environment

`.env` must define both client (`NEXT_PUBLIC_FIREBASE_*`) and admin (`NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL`, `NEXT_PRIVATE_FIREBASE_PRIVATE_KEY`) Firebase keys. The admin private key uses `\n` escapes and is unescaped in `src/lib/firebaseAdmin.ts`.

Note: `public/firebase-messaging-sw.js` currently hardcodes the public Firebase config (service workers can't read Next env at runtime). Update there too if the project ever moves.

## Data model (Firestore)

Top-level collections:

- `users/{uid}` — `UserData` (see `src/types/index.ts`). Fields beyond the type: `tutorialSeen`, `pinnedGroup`, `deletedGroups`.
  - `users/{uid}/tasks/{taskId}` — **global** tasks, personal to a user, visible in every group row for them. `isGlobal` is set in memory on read; not stored.
  - `users/{uid}/fcmTokens/{token}` — FCM registration tokens for push.
  - `users/{uid}/notifications/{id}` — in-app notification records (e.g., `task_suggested`).
- `groups/{groupId}` — `GroupData`. Key fields:
  - `memberUids: Record<uid, boolean>` — membership map (false = removed; rules check this). NOT an array.
  - `memberJoinDates: Record<uid, Timestamp>` — sort order in the UI.
  - `memberColors: Record<uid, string>` — per-group color override (else falls back to `users/{uid}.color`).
  - `groups/{groupId}/tasks/{taskId}` — **local** tasks (group-scoped, including `suggested` ones).
  - `groups/{groupId}/comments/{id}` — weekly chat, optionally pinned to a `taskId`. Supports `@mentions`.

Tasks are keyed by `weekId` in ISO week format `YYYY-Www` (see `src/lib/dateUtils.ts`). `day` is 0–6 = Mon–Sun. Status cycle: `not-done → completed → postponed → info → not-done`. Suggested tasks are created with `status: 'suggested'` and `suggestedBy`; accepting clears `suggestedBy` and sets `not-done`.

`scores[memberId]` shown in the right column = completed / (total excluding `suggested` & `info`) × 100.

## Routing (App Router, all client components)

- `src/app/page.tsx` — login + post-login redirect (honors `localStorage.pendingInvite`).
- `src/app/dashboard/page.tsx` — the main app. Owns group list, selected group/week, stats toggle, tutorial, leave/pin group flows.
- `src/app/invite/[code]/page.tsx` — adds current user to `groups/{code}.memberUids` and to their `users/{uid}.groups`; stashes the code in `localStorage` if not yet signed in.
- `src/app/plus/page.tsx`, `src/app/about/page.tsx`, `src/app/tos/page.tsx` — static-ish marketing/legal.
- `src/app/api/notify/route.ts` — the only server route. POST `{ userId, notification }`, fans out via `adminMessaging.sendEachForMulticast` to all of the user's `fcmTokens`. Note: payload uses `data:` (not `notification:`) so the SW formats it — see `public/firebase-messaging-sw.js`.

## Key files

| Concern | File |
| --- | --- |
| Types | `src/types/index.ts` (`Task`, `UserData`, `GroupData`, `Comment`) |
| Firebase client init | `src/lib/firebase.ts` |
| Firebase admin init | `src/lib/firebaseAdmin.ts` |
| Auth + first-user bootstrap | `src/lib/hooks/useAuth.ts` (creates user doc, default group, seeds "Invite a friend" task) |
| ISO week math | `src/lib/dateUtils.ts` |
| FCM (request token + send) | `src/lib/notifications.ts` + `public/firebase-messaging-sw.js` |
| Main grid | `src/components/tracker/TaskTracker.tsx` — owns Firestore subscriptions for local + global tasks per week, all task CRUD/timer handlers, member color picker |
| Day cell | `src/components/tracker/TaskCell.tsx` — input, expand-to-suggest UI, local/global toggle |
| Task row | `src/components/tracker/TaskItem.tsx` |
| Comments panel | `src/components/comments/CommentSection.tsx` (right sidebar; `@mentions` regex-driven) |
| Stats view | `src/components/stats/StatsView.tsx` |
| Outer shell | `src/components/layout/MainLayout.tsx` — left sidebar (groups), right sidebar (comments), notification permission button, clones children to inject sidebar props |
| Modals | `src/components/modals/{TutorialModal,PlusModal,ConfirmModal}.tsx` |
| Login + onboarding | `src/components/auth/{LoginForm,ProfileSetup,...}.tsx` |

## Patterns and conventions

- **Realtime via `onSnapshot`.** `TaskTracker` keeps two subscriptions: one for `groups/{id}/tasks` filtered by current `weekId`, and one per member for `users/{uid}/tasks`. Both merge into a single `tasks: Record<memberId, Task[]>` keyed by `isGlobal`. Don't break this merge when editing.
- **Task ref dispatch.** `task.isGlobal ? doc(db,'users',memberId,'tasks',id) : doc(db,'groups',groupId,'tasks',id)` — replicated across update/delete/timer handlers in `TaskTracker.tsx`. Keep it consistent.
- **Group membership is a map, not an array.** Use `memberUids[uid] = true/false`, never `arrayUnion/arrayRemove`. The `users.groups` field IS an array — that one uses arrayUnion/arrayRemove.
- **Leaving a group** sets `memberUids[uid] = false` (soft delete, preserves history for others) and deletes the user's own tasks in that group; see `handleLeaveGroup` in `dashboard/page.tsx`.
- **Suggested tasks** live under the recipient's `createdBy` even though `suggestedBy` is the actual author. Accept = clear `suggestedBy` + set `not-done`. Reject = delete doc.
- **All pages are `'use client'`.** Server work is limited to `/api/notify`. Don't reach for Server Components unless intentionally refactoring.
- **Preferred task type** (`local` | `global`) is in `localStorage` under `preferredTaskType`; default is `global`.
- **Pending invite handoff** uses `localStorage.pendingInvite`; the invite page and `app/page.tsx` both consult it.
- Styling is Tailwind utility classes inline; the theme color is `bg-theme` / `bg-theme-hover` (defined in `globals.css`).

## Gotchas

- `(window.navigator as any).standalone` is used to detect iOS PWA mode in `TaskTracker.tsx` — only meaningful client-side; it's referenced unconditionally so SSR would crash. Stay client-only here.
- Firestore `Timestamp` vs `Date`: snapshots are normalized with `typeof data.createdAt.toDate === 'function'` checks. Mirror this pattern when adding new date fields.
- The notify API sends payloads as `data` (not `notification`) so the SW controls rendering on background; `onBackgroundMessage` reads `payload.data.title/body`.
- `firebase-messaging-sw.js` lives in `public/` and must be served from the site root — don't move it.
- ESLint config is flat (`eslint.config.mjs`) extending `next/core-web-vitals` and `next/typescript`.

## Workflow

`README.md` / `setup.md`: branch per issue, PR to `main`. Default branch is `main`; recent merges came from `dev`. Contact: alp@cheat-code.cc.
