import React, { useState, useRef, useEffect, useCallback } from 'react';
import { collection, addDoc, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { sendUserNotification } from '../../lib/notifications';
import { Comment, CommentAttachment, Task } from '../../types';
import { useAuth } from '../../lib/hooks/useAuth';
import CommentItem from './CommentItem';
import { ChevronLeftIcon, ChevronRightIcon, PaperAirplaneIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

const MAX_PHOTOS_PER_COMMENT = 4;
const MAX_PHOTO_SIZE_BYTES = 8 * 1024 * 1024;

interface DraftPhoto {
  id: string;
  file: File;
  previewUrl: string;
}

interface CommentSectionProps {
  groupId: string;
  currentWeekId: string;
  comments: Comment[];
  selectedTask: Task | null;
  onSelectTask: (task: Task | null) => void;
  highlightedTaskId: string | null;
  onHighlightTask: (taskId: string | null) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  members: { id: string; name: string; color: string }[]; // Add this
}

export default function CommentSection({
  groupId,
  currentWeekId,
  comments,
  selectedTask,
  onSelectTask,
  highlightedTaskId,
  onHighlightTask,
  isCollapsed,
  onToggleCollapse,
  members
}: CommentSectionProps) {
  const { user } = useAuth();
  const [commentTasks, setCommentTasks] = useState<Record<string, Task>>({});
  const [newComment, setNewComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCursor, setMentionCursor] = useState(0);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<DraftPhoto[]>([]);
  const [photoError, setPhotoError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLDivElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const selectedPhotosRef = useRef<DraftPhoto[]>([]);

  // Add a ref to the main container to handle keyboard events
  const containerRef = useRef<HTMLDivElement>(null);

  const escapeHTML = (s: string) =>
    s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));

  const getMentionHTML = useCallback((text: string) => {
    const safe = escapeHTML(text);
    return safe.replace(/(@[\w]+)/g, `<span class="text-blue-600 font-medium">$1</span>`);
  }, []);

  useEffect(() => {
    selectedPhotosRef.current = selectedPhotos;
  }, [selectedPhotos]);

  useEffect(() => {
    return () => {
      selectedPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    };
  }, []);

  const getCaretPosition = (element: HTMLElement) => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return 0;
    const range = selection.getRangeAt(0);
    const preRange = range.cloneRange();
    preRange.selectNodeContents(element);
    preRange.setEnd(range.endContainer, range.endOffset);
    return preRange.toString().length;
  };

  const setCaretPosition = (element: HTMLElement, index: number) => {
    const selection = window.getSelection();
    if (!selection) return;
    let pos = index;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null);
    let node: Node | null = walker.nextNode();
    while (node) {
      const textLength = node.textContent?.length || 0;
      if (textLength >= pos) {
        const range = document.createRange();
        range.setStart(node, pos);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      pos -= textLength;
      node = walker.nextNode();
    }
  };

  useEffect(() => {
    if (inputRef.current && inputRef.current.innerText !== newComment) {
      inputRef.current.innerHTML = getMentionHTML(newComment);
    }
  }, [newComment, getMentionHTML]);

  const handleInputChange = (e: React.FormEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const cursor = getCaretPosition(el);
    const val = el.innerText;
    setNewComment(val);
    const upToCursor = val.slice(0, cursor);
    const match = upToCursor.match(/@([\w]*)$/);
    if (match) {
      setMentionQuery(match[1]);
      setShowMentions(true);
      setMentionCursor(cursor);
    } else {
      setShowMentions(false);
    }
    const html = getMentionHTML(val);
    if (el.innerHTML !== html) {
      el.innerHTML = html;
      setCaretPosition(el, cursor);
    }
  };

  
  // Fetch tasks referenced by comments
  useEffect(() => {
    let isCancelled = false;

    const fetchTasks = async () => {
      const taskIds = Array.from(
        new Set(comments.filter(c => c.taskId).map(c => c.taskId as string))
      );

      if (taskIds.length === 0) {
        setCommentTasks({});
        return;
      }

      const tasksMap: Record<string, Task> = {};
      await Promise.all(
        taskIds.map(async id => {
          // 1. Try to fetch from group tasks
          const groupRef = doc(db, 'groups', groupId, 'tasks', id);
          let snap = await getDoc(groupRef);

          // 2. If not found, try each member's personal tasks
          if (!snap.exists()) {
            for (const member of members) {
              const personalRef = doc(db, 'users', member.id, 'tasks', id);
              const personalSnap = await getDoc(personalRef);
              if (personalSnap.exists()) {
                snap = personalSnap;
                break;
              }
            }
          }

          if (snap.exists()) {
            const data = snap.data();

            let createdAt: Date = new Date();
            if (data.createdAt && typeof data.createdAt.toDate === 'function') {
              createdAt = data.createdAt.toDate();
            } else if (data.createdAt) {
              createdAt = new Date(data.createdAt);
            }

            let timerStartedAt: Date | null = null;
            if (data.timerStartedAt && typeof data.timerStartedAt.toDate === 'function') {
              timerStartedAt = data.timerStartedAt.toDate();
            } else if (data.timerStartedAt) {
              timerStartedAt = new Date(data.timerStartedAt);
            }

            tasksMap[id] = {
              id: snap.id,
              ...data,
              createdAt,
              timerStartedAt,
              elapsedSeconds: data.elapsedSeconds || 0,
              // Personal tasks are marked with isGlobal true
              isGlobal: snap.ref.path.includes('/users/'),
            } as Task;
          }
        })
      );

      if (!isCancelled) {
        setCommentTasks(tasksMap);
      }
    };

    fetchTasks();

    return () => {
      isCancelled = true;
    };
  }, [comments, groupId, currentWeekId, members]);

  // Add an effect to handle the Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedTask) {
        onSelectTask(null);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedTask, onSelectTask]);

  // Add an effect to handle clicks outside of the task cell
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Element;
      if (
        selectedTask &&
        !target.closest('[data-task-item="true"]') &&
        !containerRef.current?.contains(target) &&
        !target.closest('[data-comment-toggle="true"]')
      ) {
        onSelectTask(null);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [selectedTask, onSelectTask]);

  // Scroll to bottom when new comments are added
  useEffect(() => {
    if (commentsContainerRef.current) {
      commentsContainerRef.current.scrollTop = commentsContainerRef.current.scrollHeight;
    }
  }, [comments.length]);

  // Filter comments based on selected task
  const filteredComments = selectedTask 
    ? comments.filter(comment => comment.taskId === selectedTask.id)
    : comments;

  const clearSelectedPhotos = () => {
    selectedPhotosRef.current.forEach((photo) => URL.revokeObjectURL(photo.previewUrl));
    selectedPhotosRef.current = [];
    setSelectedPhotos([]);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
  };

  const removeSelectedPhoto = (photoId: string) => {
    setSelectedPhotos((photos) => {
      const photoToRemove = photos.find((photo) => photo.id === photoId);
      if (photoToRemove) {
        URL.revokeObjectURL(photoToRemove.previewUrl);
      }
      return photos.filter((photo) => photo.id !== photoId);
    });
  };

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = MAX_PHOTOS_PER_COMMENT - selectedPhotos.length;
    if (remainingSlots <= 0) {
      setPhotoError(`Attach up to ${MAX_PHOTOS_PER_COMMENT} photos per comment.`);
      event.target.value = '';
      return;
    }

    const acceptedPhotos: DraftPhoto[] = [];
    let rejected = false;

    files.slice(0, remainingSlots).forEach((file) => {
      if (!file.type.startsWith('image/')) {
        rejected = true;
        return;
      }
      if (file.size > MAX_PHOTO_SIZE_BYTES) {
        rejected = true;
        return;
      }

      const photoId =
        typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

      acceptedPhotos.push({
        id: `${file.name}-${file.lastModified}-${photoId}`,
        file,
        previewUrl: URL.createObjectURL(file),
      });
    });

    setSelectedPhotos((photos) => [...photos, ...acceptedPhotos]);
    setPhotoError(
      rejected || files.length > remainingSlots
        ? `Some photos were skipped. Use image files under 8 MB, up to ${MAX_PHOTOS_PER_COMMENT} per comment.`
        : ''
    );
    event.target.value = '';
  };

  const uploadCommentPhotos = async (): Promise<CommentAttachment[]> => {
    return Promise.all(
      selectedPhotos.map(async (photo, index) => {
        const token = await user!.getIdToken();
        const formData = new FormData();
        formData.append('groupId', groupId);
        formData.append('weekId', currentWeekId);
        formData.append('file', photo.file);

        const response = await fetch('/api/comment-photos', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Could not upload photo ${index + 1}`);
        }

        return await response.json() as CommentAttachment;
      })
    );
  };

  const deleteCommentPhoto = async (storagePath: string) => {
    if (!user || !groupId) return;

    const token = await user.getIdToken();
    const response = await fetch('/api/comment-photos', {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ groupId, storagePath }),
    });

    if (!response.ok) {
      throw new Error('Could not delete comment photo');
    }
  };

  // Add a new comment
  const handleAddComment = async () => {
    if ((!newComment.trim() && selectedPhotos.length === 0) || !user || !groupId || isSubmitting) return;

    setIsSubmitting(true);
    setPhotoError('');
    let uploadedAttachments: CommentAttachment[] = [];
    try {
      const currentMember = members.find(member => member.id === user.uid);
      const userData = {
        userName: currentMember?.name || 'Anonymous',
        userColor: currentMember?.color || '#3B82F6'
      };
      const commentText = newComment.trim();
      uploadedAttachments = await uploadCommentPhotos();
      const notificationBody = commentText || (uploadedAttachments.length === 1 ? 'Shared a photo' : `Shared ${uploadedAttachments.length} photos`);

      // Parse mentions based on @name pattern
      const mentionNames = Array.from(commentText.matchAll(/@([\w]+)/g)).map(m => m[1].toLowerCase());
      const mentionIds = mentionNames
        .map(name => members.find(mem => mem.name.toLowerCase() === name)?.id)
        .filter((id): id is string => !!id);

      const commentRef = await addDoc(collection(db, 'groups', groupId, 'comments'), {
        text: commentText,
        userId: user.uid,
        userName: userData.userName,
        userColor: userData.userColor,
        taskId: selectedTask?.id || null,
        attachments: uploadedAttachments,
        mentions: mentionIds,
        createdAt: new Date(),
        weekId: currentWeekId
      });

      const notifications: Promise<any>[] = [];

      // Notify mentioned users
      mentionIds.forEach(uid => {
        if (uid !== user.uid) {
          notifications.push(
            addDoc(collection(db, 'users', uid, 'notifications'), {
              type: 'mention',
              commentId: commentRef.id,
              groupId,
              taskId: selectedTask?.id || null,
              createdAt: new Date(),
              read: false,
            }),
            sendUserNotification(uid, {
              title: `${userData.userName} mentioned you`,
              body: notificationBody,
            })
          );
        }
      });

      // Notify owner of the task when someone comments on their task
      if (selectedTask && selectedTask.createdBy !== user.uid) {
        notifications.push(
          addDoc(collection(db, 'users', selectedTask.createdBy, 'notifications'), {
            type: 'comment',
            commentId: commentRef.id,
            taskId: selectedTask.id,
            groupId,
            createdAt: new Date(),
            read: false,
          }),
          sendUserNotification(selectedTask.createdBy, {
            title: `${userData.userName} commented on your task`,
            body: notificationBody,
          })
        );
      }

      await Promise.all(notifications);

      setNewComment('');
      clearSelectedPhotos();
    } catch (error) {
      if (uploadedAttachments.length > 0) {
        await Promise.allSettled(
          uploadedAttachments.map((attachment) => deleteCommentPhoto(attachment.storagePath))
        );
      }
      console.error('Error adding comment:', error);
      setPhotoError('Could not post that comment. Try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const comment = comments.find((item) => item.id === commentId);
      if (comment?.attachments?.length) {
        await Promise.allSettled(
          comment.attachments.map((attachment) => deleteCommentPhoto(attachment.storagePath))
        );
      }
      await deleteDoc(doc(db, 'groups', groupId, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Handle key press in the input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAddComment();
    }
  };

  // Clear task selection button
  const handleClearTaskSelection = () => {
    onSelectTask(null);
  };
  return (
    <div className="h-full flex flex-col" ref={containerRef}>
      <div className={`text-black mt-3 font-bold border-b border-gray-200 flex items-center justify-between ${!isCollapsed && 'p-4'}`}> 
        {!isCollapsed && (
          <span>{selectedTask ? `Comments for "${selectedTask.text}"` : 'Comments'}</span>
        )}
        <button onClick={onToggleCollapse} className="text-gray-600 hover:text-gray-900 cursor-pointer">
          {!isCollapsed && (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto" ref={commentsContainerRef}>
        {/* Comment list */}
        {!isCollapsed && (
          <div className="p-4">
            {filteredComments.map(comment => {
              const memberColor =
                members.find(m => m.id === comment.userId)?.color ||
                comment.userColor ||
                '#3B82F6';
              const task = comment.taskId ? commentTasks[comment.taskId] : undefined;
              const taskOwner = task
                ? (() => {
                    const m = members.find(mem => mem.id === task.createdBy);
                    return { name: m?.name || 'Unknown', color: m?.color || '#3B82F6' };
                  })()
                : null;
              return (
                <CommentItem
                  key={comment.id}
                  comment={comment}
                  color={memberColor}
                  task={task}
                  taskOwner={taskOwner}
                  isHighlighted={!!(comment.id === highlightedCommentId ||
                    (comment.taskId && comment.taskId === highlightedTaskId))}
                  onHover={() => {
                    setHighlightedCommentId(comment.id);
                    if (comment.taskId) {
                      onHighlightTask(comment.taskId);
                    }
                  }}
                  onLeave={() => {
                    setHighlightedCommentId(null);
                    onHighlightTask(null);
                  }}
                  canDelete={comment.userId === user?.uid}
                  onDelete={() => handleDeleteComment(comment.id)}
                />
              );
            })}
            {filteredComments.length === 0 && (
              <div className="text-gray-500 text-center italic">
                {selectedTask ? 'No comments for this task yet' : 'No comments yet'}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Input section */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200">
          {selectedTask && (
            <div className="mb-2 p-2 bg-blue-50 rounded-lg flex justify-between items-center">
              <span className="text-sm text-blue-700">
                Commenting on: <span className="font-medium">{selectedTask.text}</span>
              </span>
              <button 
                onClick={handleClearTaskSelection}
                className="text-xs text-blue-500 hover:text-blue-700"
              >
                Clear
              </button>
            </div>
          )}
          
          <div className={`relative border rounded-lg overflow-visible transition
            ${selectedTask ? 'border-blue-400' : 'border-gray-300'}`}>
          <div className="relative">
            {!newComment && (
              <div className="absolute p-3 text-sm text-gray-400 pointer-events-none">
                Write a comment...
              </div>
            )}
            <div
              ref={inputRef}
              contentEditable
              onInput={handleInputChange}
              onKeyDown={handleKeyPress}
              className="bg-transparent w-full p-3 text-sm text-gray-700 focus:outline-none resize-none min-h-[3rem]"
            />

            {/* Mentions dropdown (keeps working as before) */}
            {showMentions && mentionQuery && (
              <ul className="absolute bottom-full left-0 mb-1 z-20 bg-white border rounded shadow max-h-40 text-black overflow-auto">
                {members
                  .filter((m) => m.name.toLowerCase().startsWith(mentionQuery.toLowerCase()))
                  .map((m) => (
                    <li
                      key={m.id}
                      onClick={() => {
                        const start = mentionCursor - mentionQuery.length;
                        const before = newComment.slice(0, start);
                        const after = newComment.slice(mentionCursor);
                        const insert = m.name + ' ';
                        const updated = before + insert + after;
                        setNewComment(updated);
                        setShowMentions(false);
                        setTimeout(() => {
                          if (inputRef.current) {
                            inputRef.current.focus();
                            inputRef.current.innerHTML = getMentionHTML(updated);
                            const pos = start + insert.length;
                            setCaretPosition(inputRef.current, pos);
                          }
                        }, 0);
                      }}
                      className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      {m.name}
                    </li>
                  ))}
              </ul>
            )}
          </div>

            <div className="bg-gray-50 p-2 flex justify-end">
              <input
                ref={photoInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handlePhotoSelect}
              />
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                disabled={isSubmitting || selectedPhotos.length >= MAX_PHOTOS_PER_COMMENT}
                className="mr-auto px-2 py-1 text-gray-600 rounded hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                title="Attach photos"
                aria-label="Attach photos"
              >
                <PhotoIcon className="h-5 w-5" />
              </button>
              <button
                onClick={handleAddComment}
                disabled={(!newComment.trim() && selectedPhotos.length === 0) || isSubmitting}
                className="px-2 py-1 bg-theme text-white rounded hover:bg-theme-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm cursor-pointer"
                title={isSubmitting ? 'Posting comment' : 'Post comment'}
                aria-label={isSubmitting ? 'Posting comment' : 'Post comment'}
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
          {selectedPhotos.length > 0 && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              {selectedPhotos.map((photo) => (
                <div key={photo.id} className="relative overflow-hidden rounded border border-gray-200 bg-gray-50">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt={photo.file.name}
                    className="h-24 w-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeSelectedPhoto(photo.id)}
                    disabled={isSubmitting}
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/75 disabled:opacity-50"
                    title="Remove photo"
                    aria-label="Remove photo"
                  >
                    <XMarkIcon className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
          {photoError && (
            <p className="mt-2 text-xs text-red-600">{photoError}</p>
          )}
        </div>
      )}
      
    </div>
  );
}
