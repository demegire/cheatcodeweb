import React, { useState, useEffect } from 'react';
import { Comment } from '../../types';
import { TrashIcon, ArrowRightIcon } from '@heroicons/react/24/outline';

interface CommentItemProps {
  comment: Comment;
  onHover: () => void;
  onLeave: () => void;
  onClick: () => void;
  isHighlighted: boolean;
  isOwnComment: boolean;
  isSelected: boolean;
  onDelete: () => void;
  onEdit: (newText: string) => void;
}

export default function CommentItem({
  comment,
  onHover,
  onLeave,
  onClick,
  isHighlighted,
  isOwnComment,
  isSelected,
  onDelete,
  onEdit
}: CommentItemProps) {
  const [showButtons, setShowButtons] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(comment.text);

  useEffect(() => {
    if (!isSelected && !isEditing) {
      setShowButtons(false);
    }
  }, [isSelected, isEditing]);

  const formatDateTime = (date: Date) => {
    // Format with date and 24-hour time
    return `${date.toLocaleDateString()} ${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
  };

  const handleMouseEnter = () => {
    if (comment.taskId) {
      onHover();
    }
    if (isOwnComment && !isEditing) {
      setShowButtons(true);
    }
  };

  const handleMouseLeave = () => {
    if (comment.taskId && !isSelected) {
      onLeave();
    }
    if (!isSelected && !isEditing) {
      setShowButtons(false);
    }
  };

  const handleClick = () => {
    if (comment.taskId) {
      onClick();
    }
    if (isOwnComment && !isEditing) {
      setShowButtons(true);
    }
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
    setShowButtons(false);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
  };

  const handleEditSave = () => {
    if (editText.trim()) {
      onEdit(editText.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(comment.text);
    }
  };

  return (
    <div
      className={`relative p-3 rounded-lg mb-3 border-l-4 shadow-sm bg-white
        ${isHighlighted && comment.taskId ? 'ring-2 ring-blue-400' : ''}`}
      style={{ borderLeftColor: comment.userColor }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      {isOwnComment && showButtons && !isEditing && (
        <div className="absolute top-1 right-1 flex space-x-1">
          <button
            onClick={handleEditClick}
            className="w-6 h-6 bg-blue-500 rounded-full text-white hover:bg-blue-600 flex items-center justify-center"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={handleDeleteClick}
            className="w-6 h-6 bg-red-500 rounded-full text-white hover:bg-red-600 flex items-center justify-center"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      <div className="flex justify-between items-start mb-1">
        <div className="font-medium text-sm text-gray-600">{comment.userName}</div>
        <div className="text-xs text-gray-500">{formatDateTime(comment.createdAt)}</div>
      </div>
      {isEditing ? (
        <div className="flex mt-1" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 text-gray-800 bg-white border border-gray-300 rounded px-1 py-0"
            maxLength={256}
            autoFocus
          />
          <button
            onClick={(e) => { e.stopPropagation(); handleEditSave(); }}
            className="ml-1 bg-green-500 text-white px-1 py-0 rounded hover:bg-green-600 flex items-center justify-center"
            title="Save edit"
          >
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <div className="text-sm text-gray-900 whitespace-pre-wrap break-words">{comment.text}</div>
      )}

    </div>
  );
}