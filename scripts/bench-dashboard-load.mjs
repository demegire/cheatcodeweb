// Benchmark dashboard/page.tsx group+member fetch logic against real Firestore.
// Uses firebase-admin to bypass auth. Run with: node scripts/bench-dashboard-load.mjs
//
// Times two equivalent implementations against the same group:
//   OLD = mimic of current dashboard/page.tsx (serial getDocs)
//   NEW = parallel getDocs (Promise.all)
//
// Pass GROUP_NAME and USER_DISPLAY_NAME env vars to target a specific
// group, or rely on the defaults (Cheatcode / demegire).

import 'dotenv/config';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const TARGET_GROUP = process.env.GROUP_NAME ?? 'Cheatcode';
const TARGET_USER = process.env.USER_DISPLAY_NAME ?? 'demegire';
const ITERATIONS = Number(process.env.ITERATIONS ?? 15);

const app = initializeApp({
  credential: cert({
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    privateKey: process.env.NEXT_PRIVATE_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    clientEmail: process.env.NEXT_PRIVATE_FIREBASE_CLIENT_EMAIL,
  }),
});

const db = getFirestore(app);

// 1. Locate the target user.
const userQuery = await db
  .collection('users')
  .where('displayName', '==', TARGET_USER)
  .get();

if (userQuery.empty) {
  console.error(`No user with displayName="${TARGET_USER}".`);
  process.exit(1);
}
if (userQuery.size > 1) {
  console.error(`Multiple users with displayName="${TARGET_USER}":`);
  userQuery.docs.forEach(d => console.error(`  ${d.id} (${d.data().email ?? '?'})`));
  process.exit(1);
}
const meDoc = userQuery.docs[0];
const meUid = meDoc.id;
const myGroupIds = meDoc.data().groups ?? [];

// 2. Locate the target group by name within that user's groups.
const allGroupSnaps = await Promise.all(
  myGroupIds.map(id => db.doc(`groups/${id}`).get())
);
const groupMatch = allGroupSnaps.find(
  g => g.exists && g.data().name === TARGET_GROUP
);
if (!groupMatch) {
  console.error(`No group named "${TARGET_GROUP}" in user ${meUid}'s groups.`);
  console.error(`Available groups:`);
  allGroupSnaps.forEach(g =>
    console.error(`  ${g.id} -> ${g.exists ? g.data().name : '<missing>'}`)
  );
  process.exit(1);
}
const groupId = groupMatch.id;
const memberUidMap = groupMatch.data().memberUids ?? {};
const activeMemberUids = Object.entries(memberUidMap)
  .filter(([, on]) => on)
  .map(([uid]) => uid);

console.log(
  `Target: group "${TARGET_GROUP}" (${groupId}), ${activeMemberUids.length} active members, user ${TARGET_USER} (${meUid}).\n`
);

// 3. The two implementations under test.

// Mimics dashboard/page.tsx :93 + :120-175 for ONE group, including the
// redundant self-refetch inside the loop.
async function oldLogic() {
  // :93 — initial user doc fetch
  await db.doc(`users/${meUid}`).get();

  // :121 — get group doc
  const groupSnap = await db.doc(`groups/${groupId}`).get();
  const memberUids = groupSnap.data().memberUids ?? {};

  // :137 — fetch self again
  await db.doc(`users/${meUid}`).get();

  // :151-164 — serial loop over other members
  for (const uid of Object.keys(memberUids)) {
    if (uid === meUid || !memberUids[uid]) continue;
    await db.doc(`users/${uid}`).get();
  }
}

// Parallel: one batched fetch for user + group, then one batched
// fetch for all other members. Self is fetched once.
async function newLogic() {
  const [, groupSnap] = await Promise.all([
    db.doc(`users/${meUid}`).get(),
    db.doc(`groups/${groupId}`).get(),
  ]);
  const memberUids = groupSnap.data().memberUids ?? {};
  const otherUids = Object.keys(memberUids).filter(
    uid => uid !== meUid && memberUids[uid]
  );
  await Promise.all(otherUids.map(uid => db.doc(`users/${uid}`).get()));
}

// 4. Bench harness. Warmup, then `ITERATIONS` timed runs each.
async function bench(label, fn) {
  await fn(); // warmup, not counted
  const samples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const t0 = process.hrtime.bigint();
    await fn();
    const t1 = process.hrtime.bigint();
    samples.push(Number(t1 - t0) / 1e6);
  }
  samples.sort((a, b) => a - b);
  const sum = samples.reduce((a, b) => a + b, 0);
  return {
    label,
    avg: sum / samples.length,
    median: samples[Math.floor(samples.length / 2)],
    p95: samples[Math.floor(samples.length * 0.95)],
    min: samples[0],
    max: samples[samples.length - 1],
    samples,
  };
}

// Alternate OLD/NEW runs so any background network jitter affects both
// roughly equally. Run a full A/B pair `ITERATIONS` times.
async function interleavedBench() {
  await oldLogic(); // warmup once
  await newLogic();
  const oldSamples = [];
  const newSamples = [];
  for (let i = 0; i < ITERATIONS; i++) {
    const oldStart = process.hrtime.bigint();
    await oldLogic();
    const oldEnd = process.hrtime.bigint();
    oldSamples.push(Number(oldEnd - oldStart) / 1e6);

    const newStart = process.hrtime.bigint();
    await newLogic();
    const newEnd = process.hrtime.bigint();
    newSamples.push(Number(newEnd - newStart) / 1e6);
  }
  const summarize = (label, arr) => {
    arr.sort((a, b) => a - b);
    const sum = arr.reduce((a, b) => a + b, 0);
    return {
      label,
      avg: sum / arr.length,
      median: arr[Math.floor(arr.length / 2)],
      p95: arr[Math.floor(arr.length * 0.95)],
      min: arr[0],
      max: arr[arr.length - 1],
    };
  };
  return [summarize('OLD (serial) ', oldSamples), summarize('NEW (parallel)', newSamples)];
}

const [oldR, newR] = await interleavedBench();
const fmt = r =>
  `${r.label}  avg=${r.avg.toFixed(1).padStart(6)}ms  median=${r.median
    .toFixed(1)
    .padStart(6)}ms  p95=${r.p95.toFixed(1).padStart(6)}ms  min=${r.min
    .toFixed(1)
    .padStart(6)}ms  max=${r.max.toFixed(1).padStart(6)}ms`;
console.log(fmt(oldR));
console.log(fmt(newR));
console.log(
  `\nSpeedup: ${(oldR.avg / newR.avg).toFixed(2)}x   |   ` +
    `${(oldR.avg - newR.avg).toFixed(0)} ms saved per dashboard load   |   ` +
    `${ITERATIONS} samples each, interleaved`
);

process.exit(0);
