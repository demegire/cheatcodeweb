import React from 'react';
import { Comment } from '../../types';

interface CommentItemProps {
  comment: Comment;
  onHover: () => void;
  onLeave: () => void;
  isHighlighted: boolean;
}

export default function CommentItem({ comment, onHover, onLeave, isHighlighted }: CommentItemProps) {
  const formatDateTime = (date: Date) => {
    // Format with date and 24-hour time
    return `${date.toLocaleDateString()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  // Only add hover effects if there's a task associated
  const handleMouseEnter = () => {
    if (comment.taskId) {
      onHover();
    }
  };

  const handleMouseLeave = () => {
    if (comment.taskId) {
      onLeave();
    }
  };

  return (
    <div 
      className={`p-3 rounded-lg mb-3 border-l-4 shadow-sm bg-white
        ${isHighlighted && comment.taskId ? 'ring-2 ring-blue-400' : ''}`}
      style={{ borderLeftColor: comment.userColor }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="flex justify-between items-start mb-1">
        <div className="font-medium text-sm text-gray-600">{comment.userName}</div>
        <div className="text-xs text-gray-500">{formatDateTime(comment.createdAt)}</div>
      </div>
      <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">{comment.text}</div>
      
    </div>
  );
}