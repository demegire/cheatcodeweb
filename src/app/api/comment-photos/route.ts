import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { adminAuth, adminDb, adminStorage } from '../../../lib/firebaseAdmin';

export const runtime = 'nodejs';

const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;
const CHUNK_SIZE_BYTES = 512 * 1024;
const PHOTO_STORAGE_PREFIX = 'commentPhotos';

const getBearerToken = (req: NextRequest) => {
  const header = req.headers.get('authorization') || '';
  const [scheme, token] = header.split(' ');
  return scheme === 'Bearer' ? token : '';
};

const jsonError = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

const getPhotoUrl = (req: NextRequest, groupId: string, photoId: string, token: string) => {
  const params = new URLSearchParams({ groupId, photoId, token });
  return `${req.nextUrl.origin}/api/comment-photos?${params.toString()}`;
};

const getPhotoRef = (groupId: string, photoId: string) =>
  adminDb.collection('groups').doc(groupId).collection('commentPhotos').doc(photoId);

const verifyGroupMember = async (groupId: string, uid: string) => {
  const groupSnap = await adminDb.collection('groups').doc(groupId).get();
  const group = groupSnap.data();
  return !!group?.memberUids?.[uid];
};

const deleteStoredPhoto = async (groupId: string, photoId: string) => {
  const photoRef = getPhotoRef(groupId, photoId);
  const photoSnap = await photoRef.get();
  const photo = photoSnap.data();
  const chunkCount = typeof photo?.chunkCount === 'number' ? photo.chunkCount : 0;

  await Promise.all(
    Array.from({ length: chunkCount }, (_, index) =>
      photoRef.collection('chunks').doc(String(index).padStart(4, '0')).delete()
    )
  );
  await photoRef.delete();
};

const parseFirestoreStoragePath = (storagePath: string) => {
  const [prefix, groupId, photoId] = storagePath.split('/');
  if (prefix !== PHOTO_STORAGE_PREFIX || !groupId || !photoId) return null;
  return { groupId, photoId };
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

    const token = randomUUID();
    const photoId = randomUUID();
    const storagePath = `${PHOTO_STORAGE_PREFIX}/${groupId}/${photoId}`;
    const bytes = Buffer.from(await file.arrayBuffer());
    const photoRef = getPhotoRef(groupId, photoId);
    const chunkCount = Math.ceil(bytes.length / CHUNK_SIZE_BYTES);

    await photoRef.set({
      contentType: file.type,
      createdAt: new Date(),
      fileName: file.name,
      ownerId: decodedToken.uid,
      size: bytes.length,
      token,
      weekId,
      chunkCount,
    });

    await Promise.all(
      Array.from({ length: chunkCount }, async (_, index) => {
        const start = index * CHUNK_SIZE_BYTES;
        const end = Math.min(start + CHUNK_SIZE_BYTES, bytes.length);
        await photoRef.collection('chunks').doc(String(index).padStart(4, '0')).set({
          data: bytes.subarray(start, end).toString('base64'),
        });
      })
    );

    return NextResponse.json({
      type: 'image',
      url: getPhotoUrl(req, groupId, photoId, token),
      storagePath,
      fileName: file.name,
    });
  } catch (error) {
    console.error('Error uploading comment photo:', error);
    return jsonError('Could not upload that photo', 500);
  }
}

export async function GET(req: NextRequest) {
  try {
    const groupId = req.nextUrl.searchParams.get('groupId');
    const photoId = req.nextUrl.searchParams.get('photoId');
    const token = req.nextUrl.searchParams.get('token');

    if (!groupId || !photoId || !token) {
      return jsonError('Missing photo fields', 400);
    }

    const photoRef = getPhotoRef(groupId, photoId);
    const photoSnap = await photoRef.get();
    const photo = photoSnap.data();

    if (!photoSnap.exists || photo?.token !== token) {
      return jsonError('Photo not found', 404);
    }

    const chunkCount = typeof photo.chunkCount === 'number' ? photo.chunkCount : 0;
    const chunkSnaps = await Promise.all(
      Array.from({ length: chunkCount }, (_, index) =>
        photoRef.collection('chunks').doc(String(index).padStart(4, '0')).get()
      )
    );
    const data = Buffer.concat(
      chunkSnaps.map((chunkSnap) => Buffer.from(String(chunkSnap.data()?.data || ''), 'base64'))
    );

    return new NextResponse(new Uint8Array(data), {
      headers: {
        'Cache-Control': 'private, max-age=31536000, immutable',
        'Content-Type': typeof photo.contentType === 'string' ? photo.contentType : 'image/jpeg',
      },
    });
  } catch (error) {
    console.error('Error reading comment photo:', error);
    return jsonError('Could not load that photo', 500);
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

    const storedPhoto = parseFirestoreStoragePath(storagePath);
    if (storedPhoto) {
      if (storedPhoto.groupId !== groupId) {
        return jsonError('You cannot delete this photo', 403);
      }

      const photoSnap = await getPhotoRef(groupId, storedPhoto.photoId).get();
      const photo = photoSnap.data();
      if (photo?.ownerId !== decodedToken.uid) {
        return jsonError('You cannot delete this photo', 403);
      }

      const isMember = await verifyGroupMember(groupId, decodedToken.uid);
      if (!isMember) return jsonError('You do not have access to this group', 403);

      await deleteStoredPhoto(groupId, storedPhoto.photoId);
      return NextResponse.json({ success: true });
    }

    if (!storagePath.startsWith(`groups/${groupId}/comments/`) || !storagePath.includes(`/${decodedToken.uid}/`)) {
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
