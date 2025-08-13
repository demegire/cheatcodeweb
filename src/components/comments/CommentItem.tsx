import React, { useState } from 'react';
import { Comment, Task } from '../../types';
import { TrashIcon } from '@heroicons/react/24/outline';
import { linkifyText } from '../../lib/linkify';

interface CommentItemProps {
  comment: Comment;
  onHover: () => void;
  onLeave: () => void;
  isHighlighted: boolean;
  /** Color assigned to the comment's author */
  color: string;
  /** Optional task referenced by the comment */
  task?: Task;
  /** Owner info for the referenced task */
  taskOwner?: { name: string; color: string } | null;
  /** Whether the current user can delete this comment */
  canDelete: boolean;
  /** Delete handler */
  onDelete: () => void;
}

export default function CommentItem({ comment, onHover, onLeave, isHighlighted, color, task, taskOwner, canDelete, onDelete }: CommentItemProps) {
  const [showDelete, setShowDelete] = useState(false);
  const formatDateTime = (date: Date) => {
    // Format with date and 24-hour time
    return `${date.toLocaleDateString()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Only add hover effects if there's a task associated
  const handleMouseEnter = () => {
    if (comment.taskId) {
      onHover();
    }
    if (canDelete) {
      setShowDelete(true);
    }
  };

  const handleMouseLeave = () => {
    if (comment.taskId) {
      onLeave();
    }
    setShowDelete(false);
  };

  const handleClick = () => {
    if (canDelete) {
      setShowDelete(true);
    }
  };

  return (
    <div
      className={`p-3 rounded-lg mb-3 border-l-4 shadow-sm bg-white
        ${isHighlighted && comment.taskId ? 'ring-2 ring-blue-400' : ''}`}
      style={{ borderLeftColor: color }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="font-medium text-sm text-gray-600">{comment.userName}</div>
        <div className="flex items-start space-x-2">
          {showDelete && canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="w-5 h-5 bg-red-500 rounded-full text-white hover:bg-red-600 flex items-center justify-center"
            >
              <TrashIcon className="h-3.5 w-3.5" />
            </button>
          )}
          <div className="text-xs text-gray-500">{formatDateTime(comment.createdAt)}</div>
        </div>
      </div>
      <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">
        {linkifyText(comment.text)}
      </div>
      {task && taskOwner && (
        <div className="mt-2 flex items-center">
          <div
            className="h-6 w-6 rounded-full flex items-center justify-center text-white text-xs mr-2"
            style={{ backgroundColor: taskOwner.color }}
          >
            {taskOwner.name.charAt(0)}
          </div>
          <div className="text-xs text-gray-600 truncate flex-1">
            {linkifyText(task.text)}
          </div>
        </div>
      )}
    </div>
  );
}
