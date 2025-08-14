import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy, doc, getDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { Comment, Task } from '../../types';
import { useAuth } from '../../lib/hooks/useAuth';
import CommentItem from './CommentItem';
import { ChevronLeftIcon, ChevronRightIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

interface CommentSectionProps {
  groupId: string;
  currentWeekId: string;
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
  selectedTask,
  onSelectTask,
  highlightedTaskId,
  onHighlightTask,
  isCollapsed,
  onToggleCollapse,
  members
}: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentTasks, setCommentTasks] = useState<Record<string, Task>>({});
  const [newComment, setNewComment] = useState('');
  const [mentionQuery, setMentionQuery] = useState('');
  const [showMentions, setShowMentions] = useState(false);
  const [mentionCursor, setMentionCursor] = useState(0);
  const [highlightedCommentId, setHighlightedCommentId] = useState<string | null>(null);
  const commentsContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  // Add a ref to the main container to handle keyboard events
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Fetch comments for the current group and week
  useEffect(() => {
    if (!groupId || !currentWeekId) return;

    const commentsRef = collection(db, 'groups', groupId, 'comments');
    const q = query(
      commentsRef,
      where('weekId', '==', currentWeekId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const commentsList: Comment[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        commentsList.push({
          id: doc.id,
          text: data.text,
          userId: data.userId,
          userName: data.userName,
          userColor: data.userColor,
          taskId: data.taskId,
          mentions: data.mentions || [],
          createdAt: data.createdAt.toDate(),
          weekId: data.weekId
        });
      });
      
      setComments(commentsList);
    });

    return () => unsubscribe();
  }, [groupId, currentWeekId]);

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

  // Add a new comment
  const handleAddComment = async () => {
    if (!newComment.trim() || !user || !groupId) return;

    try {
      const currentMember = members.find(member => member.id === user.uid);
      const userData = {
        userName: currentMember?.name || 'Anonymous',
        userColor: currentMember?.color || '#3B82F6'
      };

      // Parse mentions based on @name pattern
      const mentionNames = Array.from(newComment.matchAll(/@([\w]+)/g)).map(m => m[1].toLowerCase());
      const mentionIds = mentionNames
        .map(name => members.find(mem => mem.name.toLowerCase() === name)?.id)
        .filter((id): id is string => !!id);

      const commentRef = await addDoc(collection(db, 'groups', groupId, 'comments'), {
        text: newComment.trim(),
        userId: user.uid,
        userName: userData.userName,
        userColor: userData.userColor,
        taskId: selectedTask?.id || null,
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
          })
        );
      }

      await Promise.all(notifications);

      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await deleteDoc(doc(db, 'groups', groupId, 'comments', commentId));
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  // Handle key press in the input field
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
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
      <div className={`p-4 text-black mt-3 font-bold border-b border-gray-200 flex items-center justify-between ${isCollapsed ? 'text-center' : ''}`}> 
      <div></div>
        {!isCollapsed && (
          <span>{selectedTask ? `Comments for "${selectedTask.text}"` : 'Comments'}</span>
        )}
        <button onClick={onToggleCollapse} className="text-gray-600 hover:text-gray-900">
          {isCollapsed ? (
            <ChevronLeftIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto" ref={commentsContainerRef}>
        {/* Comment list */}
        {isCollapsed ? (
          <div className="px-2 py-4">
            {comments.slice(0, 5).map(comment => {
              const memberColor =
                members.find(m => m.id === comment.userId)?.color ||
                comment.userColor ||
                '#3B82F6';
              return (
                <div
                  key={comment.id}
                  className="h-8 w-8 rounded-full mb-2 flex items-center justify-center text-white font-medium"
                  style={{ backgroundColor: memberColor }}
                  title={`${comment.userName}: ${comment.text}`}
                >
                  {comment.userName.charAt(0)}
                </div>
              );
            })}
          </div>
        ) : (
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
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => {
                const val = e.target.value;
                const cursor = e.target.selectionStart || 0;
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
              }}
              onKeyPress={handleKeyPress}
              placeholder="Write a comment..."
              className="bg-gray-50 w-full p-3 text-sm text-gray-700 focus:outline-none resize-none"
              rows={3}
            />
            {showMentions && mentionQuery && (
              <ul className="absolute bottom-full left-0 mb-1 z-10 bg-white border rounded shadow max-h-40 overflow-auto">
                {members
                  .filter(m => m.name.toLowerCase().startsWith(mentionQuery.toLowerCase()))
                  .map(m => (
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
                          inputRef.current?.focus();
                          const pos = start + insert.length;
                          inputRef.current?.setSelectionRange(pos, pos);
                        }, 0);
                      }}
                      className="px-2 py-1 hover:bg-gray-100 cursor-pointer text-sm"
                    >
                      {m.name}
                    </li>
                  ))}
              </ul>
            )}

            <div className="bg-gray-50 p-2 flex justify-end">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-2 py-1 bg-theme text-white rounded hover:bg-theme-hover disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}