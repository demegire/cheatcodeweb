import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { adminAuth, adminDb, adminStorage } from '../../../lib/firebaseAdmin';

export const runtime = 'nodejs';

const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;

const getBearerToken = (req: NextRequest) => {
  const header = req.headers.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : '';
};

const sanitizeFileName = (fileName: string) =>
  fileName.replace(/[^a-z0-9._-]/gi, '-').replace(/-+/g, '-').slice(0, 120) || 'photo';

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

const verifyGroupMember = async (groupId: string, uid: string) => {
  const groupSnap = await adminDb.collection('groups').doc(groupId).get();
  const group = groupSnap.data();
  return !!group?.memberUids?.[uid];
};

export async function POST(req: NextRequest) {
  try {
    const idToken = getBearerToken(req);
    if (!idToken) return jsonError('Missing auth token', 401);

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const form = await req.formData();
    const groupId = form.get('groupId');
    const weekId = form.get('weekId');
    const file = form.get('file');

    if (typeof groupId !== 'string' || typeof weekId !== 'string' || !(file instanceof File)) {
      return jsonError('Missing upload fields', 400);
    }

    if (!file.type.startsWith('image/') || file.size > MAX_PHOTO_SIZE_BYTES) {
      return jsonError('Use an image under 8 MB', 400);
    }

    const isMember = await verifyGroupMember(groupId, decodedToken.uid);
    if (!isMember) return jsonError('You do not have access to this group', 403);

    const bucket = adminStorage.bucket();
    const safeName = sanitizeFileName(file.name);
    const token = randomUUID();
    const storagePath = `groups/${groupId}/comments/${weekId}/${decodedToken.uid}/${Date.now()}-${token}-${safeName}`;
    const bytes = Buffer.from(await file.arrayBuffer());

    await bucket.file(storagePath).save(bytes, {
      contentType: file.type,
      metadata: {
        metadata: {
          firebaseStorageDownloadTokens: token,
        },
      },
    });

    return NextResponse.json({
      type: 'image',
      url: `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(storagePath)}?alt=media&token=${token}`,
      storagePath,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Error uploading comment photo:', error);
    return jsonError('Could not upload that photo', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const idToken = getBearerToken(req);
    if (!idToken) return jsonError('Missing auth token', 401);

    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { groupId, storagePath } = await req.json();

    if (typeof groupId !== 'string' || typeof storagePath !== 'string') {
      return jsonError('Missing delete fields', 400);
    }

    if (
      !storagePath.startsWith(`groups/${groupId}/comments/`) ||
      !storagePath.includes(`/${decodedToken.uid}/`)
    ) {
      return jsonError('You cannot delete this photo', 403);
    }

    const isMember = await verifyGroupMember(groupId, decodedToken.uid);
    if (!isMember) return jsonError('You do not have access to this group', 403);

    await adminStorage.bucket().file(storagePath).delete({ ignoreNotFound: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment photo:', error);
    return jsonError('Could not delete that photo', 500);
  }
}
