import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, query, where, onSnapshot, orderBy } from 'firebase/firestore';
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
  const [newComment, setNewComment] = useState('');
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
          createdAt: data.createdAt.toDate(),
          weekId: data.weekId
        });
      });
      
      setComments(commentsList);
    });

    return () => unsubscribe();
  }, [groupId, currentWeekId]);

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
      // If there's a selected task and the click is not within a task element
      if (selectedTask && 
          !(e.target as Element)?.closest('[data-task-item="true"]') && 
          !containerRef.current?.contains(e.target as Node)) {
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
        userColor: currentMember?.color || '#3B82F6' // Use member's color or default blue
      };
      
      // Look up user's member color from the group
      // This would require access to the current group members data
      
      await addDoc(collection(db, 'groups', groupId, 'comments'), {
        text: newComment.trim(),
        userId: user.uid,
        userName: userData.userName,
        userColor: userData.userColor,
        taskId: selectedTask?.id || null,
        createdAt: new Date(),
        weekId: currentWeekId
      });
      
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
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
      <div className={`p-4 text-gray-600 font-bold ${isCollapsed ? 'text-center' : ''} border-b border-gray-200`}>
        {!isCollapsed && (selectedTask ? `Comments for "${selectedTask.text}"` : 'All Comments')}
      </div>
      
      <div className="flex-1 overflow-y-auto" ref={commentsContainerRef}>
        {/* Comment list */}
        {isCollapsed ? (
          <div className="px-2 py-4">
            {comments.slice(0, 5).map(comment => (
              <div 
                key={comment.id}
                className="h-8 w-8 rounded-full mb-2 flex items-center justify-center text-white font-medium"
                style={{ backgroundColor: comment.userColor }}
                title={`${comment.userName}: ${comment.text}`}
              >
                {comment.userName.charAt(0)}
              </div>
            ))}
          </div>
        )  : (
          <div className="p-4">
            {filteredComments.map(comment => (
              <CommentItem 
                key={comment.id}
                comment={comment}
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
              />
            ))}
            {filteredComments.length === 0 && (
              <div className="text-gray-500 text-center italic">
                {selectedTask ? "No comments for this task yet" : "No comments yet"}
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
          
          <div className={`border rounded-lg overflow-hidden transition 
            ${selectedTask ? 'border-blue-400' : 'border-gray-300'}`}>
            <textarea
              ref={inputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Write a comment..."
              className="bg-gray-50 w-full p-3 text-sm text-gray-700 focus:outline-none resize-none"
              rows={3}
            />
            
            <div className="bg-gray-50 p-2 flex justify-end">
              <button
                onClick={handleAddComment}
                disabled={!newComment.trim()}
                className="px-2 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                <PaperAirplaneIcon className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Toggle button */}
      <div className="p-4 border-t border-gray-200 flex items-center justify-between">
        <button 
          onClick={onToggleCollapse} 
          className="text-gray-600 hover:text-gray-900"
        >
          {isCollapsed ? (
            <ChevronLeftIcon className="h-5 w-5" />
          ) : (
            <ChevronRightIcon className="h-5 w-5" />
          )}
        </button>
      </div>
    </div>
  );
}