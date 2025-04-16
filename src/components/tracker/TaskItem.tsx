import React, { useState } from 'react';
import { Task } from '../../types';
import { ChatBubbleLeftIcon } from '@heroicons/react/24/outline';

interface TaskItemProps {
  task: Task;
  onUpdateStatus: () => void;
  isEditable: boolean;
  isHighlighted?: boolean;
  onSelect?: () => void;
  onDelete?: () => void;
  onEdit?: (newText: string) => void;
  onAcceptTask?: () => void;
  onRejectTask?: () => void;
  suggestedByColor?: string;
  currentUserId?: string;
  hasComments?: boolean;
}

export default function TaskItem({ 
  task, 
  onUpdateStatus, 
  isEditable, 
  isHighlighted = false,
  onSelect,
  onDelete,
  onEdit,
  onAcceptTask,
  onRejectTask,
  suggestedByColor,
  currentUserId,
  hasComments = false
}: TaskItemProps) {
  const [showButtons, setShowButtons] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);

  const isSuggested = !!task.suggestedBy;
  const isCurrentUserSuggester = currentUserId && task.suggestedBy === currentUserId;

  const getStatusColor = () => {
    if (isSuggested && suggestedByColor) {
      return `bg-opacity-20 border border-opacity-30 text-gray-800`;
    }
    
    switch (task.status) {
      case 'completed': return 'bg-green-50 border-green-200 text-green-800';
      case 'postponed': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      default: return 'bg-red-50 border-red-200 text-red-800';
    }
  };

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed': return '✓';
      case 'postponed': return '-';
      default: return 'x';
    }
  };

  const getStatusBgColor = () => {
    switch (task.status) {
      case 'completed': return 'bg-green-400 hover:bg-green-500';
      case 'postponed': return 'bg-yellow-400 hover:bg-yellow-500';
      default: return 'bg-red-400 hover:bg-red-500';
    }
  };

  const handleMouseEnter = () => {
    setShowButtons(true);
  };

  const handleMouseLeave = () => {
    setShowButtons(false);
  };

  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsEditing(true);
  };

  const handleEditSave = () => {
    if (editText.trim() && editText.length <= 64) {
      onEdit?.(editText.trim());
      setIsEditing(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEditSave();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
      setEditText(task.text);
    }
  };

  return (
    <div 
      className={`relative rounded border p-1 mb-1 text-sm ${getStatusColor()} 
        ${isHighlighted ? 'ring-2 ring-blue-400' : ''}
        ${onSelect ? 'cursor-pointer' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onSelect}
      data-task-item="true"
      style={isSuggested && suggestedByColor ? { 
        backgroundColor: `${suggestedByColor}20`,
        borderColor: `${suggestedByColor}30`
      } : {}}
    >
      {/* Comment icon - shows in top right corner when task has comments */}
      {hasComments && (
        <div className="absolute top-0.5 right-0.5">
          <ChatBubbleLeftIcon className="h-4 w-4 text-blue-500" title="This task has comments" />
        </div>
      )}

      {isEditable && !isSuggested && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus();
          }}
          className={`absolute left-1 top-1/2 transform -translate-y-1/2
            w-5 h-5 flex items-center justify-center
            rounded-full text-white text-xs
            ${getStatusBgColor()}`}
        >
          {getStatusIcon()}
        </button>
      )}

      {isSuggested && isEditable && !isCurrentUserSuggester && onAcceptTask && onRejectTask && (
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAcceptTask();
            }}
            className="w-6 h-6 bg-green-500 rounded-full text-white hover:bg-green-600 flex items-center justify-center"
            title="Accept task"
          >
            ✓
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRejectTask();
            }}
            className="w-6 h-6 bg-red-500 rounded-full text-white hover:bg-red-600 flex items-center justify-center"
            title="Reject task"
          >
            ×
          </button>
        </div>
      )}

      {isSuggested && isCurrentUserSuggester && showButtons && !isEditing && (
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex space-x-1">
          <button
            onClick={handleEditClick}
            className="w-6 h-6 bg-blue-500 rounded-full text-white hover:bg-blue-600 flex items-center justify-center"
            title="Edit suggestion"
          >
            ✎
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="w-6 h-6 bg-red-500 rounded-full text-white hover:bg-red-600 flex items-center justify-center"
            title="Delete suggestion"
          >
            ×
          </button>
        </div>
      )}

      {isEditable && showButtons && !isEditing && !isSuggested && (
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex space-x-1">
          <button
            onClick={handleEditClick}
            className="w-6 h-6 bg-blue-500 rounded-full text-white hover:bg-blue-600 flex items-center justify-center"
          >
            ✎
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="w-6 h-6 bg-red-500 rounded-full text-white hover:bg-red-600 flex items-center justify-center"
          >
            ×
          </button>
        </div>
      )}

      {isEditing ? (
        <div className="ml-0 flex" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyPress}
            maxLength={64}
            className="flex-1 text-gray-800 bg-white border border-gray-300 rounded px-2 py-0.5"
            autoFocus
          />
          <button
            onClick={handleEditSave}
            className="ml-1 bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600 text-xs"
          >
            Save
          </button>
        </div>
      ) : (
        <span className={`${isEditable && !isSuggested ? 'ml-5 pl-1' : ''} block break-words`}>
          {task.text}
        </span>
      )}
    </div>
  );
}