import { NextRequest, NextResponse } from 'next/server';
import { adminDb, adminMessaging } from '../../../lib/firebaseAdmin';

export async function POST(req: NextRequest) {
  const { userId, notification } = await req.json();
  if (!userId || !notification) {
    return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
  }

  try {
    const tokenSnap = await adminDb
      .collection('users')
      .doc(userId)
      .collection('fcmTokens')
      .get();
    const tokens = tokenSnap.docs.map((d: any) => d.id);

    if (tokens.length === 0) {
      return NextResponse.json({ success: true });
    }

    await adminMessaging.sendEachForMulticast({
      tokens,
      data: notification,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Error sending notification', err);
    return NextResponse.json({ error: 'Failed to send notification' }, { status: 500 });
  }
}
