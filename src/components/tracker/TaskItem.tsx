import React, { useState, useEffect } from 'react';
import { Task } from '../../types';
import { ArrowRightIcon, TrashIcon, PlayIcon, PauseIcon, XMarkIcon, CheckIcon } from '@heroicons/react/24/outline';
import { linkifyText } from '../../lib/linkify';
import { FaInfo } from "react-icons/fa6";

interface TaskItemProps {
  task: Task;
  onUpdateStatus: () => void;
  isCurrentUser: boolean;
  isHighlighted?: boolean;
  onSelect?: () => void;
  onDoubleClick?: () => void;
  onDelete?: () => void;
  onEdit?: (newText: string) => void;
  onAcceptTask?: () => void;
  onRejectTask?: () => void;
  suggestedByColor?: string;
  currentUserId?: string;
  hasComments?: boolean;
  onStartTimer?: () => void;
  onStopTimer?: () => void;
  members: { id: string; name: string; color: string }[];
}

export default function TaskItem({ 
  task, 
  onUpdateStatus, 
  isCurrentUser ,
  isHighlighted = false,
  onSelect,
  onDoubleClick,
  onDelete,
  onEdit,
  onAcceptTask,
  onRejectTask,
  suggestedByColor,
  currentUserId,
  hasComments = false,
  onStartTimer,
  onStopTimer,
  members
}: TaskItemProps) {
  const [showButtons, setShowButtons] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(task.text);
  const [elapsed, setElapsed] = useState(task.elapsedSeconds || 0);

  const isSuggested = !!task.suggestedBy;
  const isCurrentUserSuggester = currentUserId && task.suggestedBy === currentUserId;

  const getStatusIcon = () => {
    switch (task.status) {
      case 'completed': return <CheckIcon className="size-3 stroke-3" />;
      case 'postponed': return <ArrowRightIcon className="size-3 stroke-3" />;
      case 'suggested': return '?';
      case 'info': return <FaInfo />;
      default: return <XMarkIcon className="size-3 stroke-3" />;
    }
  };

  const getStatusBgColor = () => {
    switch (task.status) {
      case 'completed': return `${isCurrentUser ? "bg-green-400 hover:bg-green-500" : "bg-green-300"}`;
      case 'postponed': return `${isCurrentUser ? "bg-yellow-400 hover:bg-yellow-500" : "bg-yellow-300"}`;
      case 'not-done': return `${isCurrentUser ? "bg-red-400 hover:bg-red-500" : "bg-red-300"}`;
      case 'info': return `${isCurrentUser ? "bg-gray-400 hover:bg-gray-500" : "bg-gray-300"}`;
    }
  };

  const getStatusTitle = () => {
    switch (task.status) {
      case 'completed': return 'Completed';
      case 'postponed': return 'Postponed';
      case 'suggested': return `Suggested by ${members.find(m => m.id === task.suggestedBy)?.name}`;
      case 'info': return 'Info';
      default: return 'Not done';
    }
  };

  const handleMouseEnter = () => {
    setShowButtons(true);
  };

  const handleMouseLeave = () => {
    setShowButtons(false);
  };

  const handleClick = () => {
    onSelect?.();
    if (isCurrentUser) {
      setShowButtons(true);
    }
  };

  useEffect(() => {
    if (!isHighlighted) {
      setShowButtons(false);
    }
  }, [isHighlighted]);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (task.timerStartedAt) {
      interval = setInterval(() => {
        const start = new Date(task.timerStartedAt!).getTime();
        const now = Date.now();
        const base = task.elapsedSeconds || 0;
        setElapsed(base + Math.floor((now - start) / 1000));
      }, 1000);
    } else {
      setElapsed(task.elapsedSeconds || 0);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [task.timerStartedAt, task.elapsedSeconds]);

  const formatTime = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600);
    const mins = Math.floor((totalSeconds % 3600) / 60);
    const secs = totalSeconds % 60;
    return [hrs, mins, secs].map(v => v.toString().padStart(2, '0')).join(':');
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
      className={`relative w-full overflow-hidden border-b-1 border-b-gray-300 px-1 py-1 text-sm text-black
        ${isHighlighted ? 'ring-2 ring-blue-400' : ''}
        ${onSelect ? 'cursor-pointer' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={onDoubleClick}
      data-task-item="true"
    >
      {/* Comment icon - shows in top right corner when task has comments */}
      {hasComments && !isEditing && (
        <div className="absolute top-0.5 right-0.5">
          <span className="block h-1.5 w-1.5 bg-blue-500 rounded-full" title="This task has comments" />
        </div>
      )}

      {/* Status icons for current user*/}
      {isCurrentUser && !isSuggested && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onUpdateStatus();
          }}
          onDoubleClick={(e) => {
            e.stopPropagation();
          }}
          className={`absolute left-1 top-1/2 transform -translate-y-1/2
            w-5 h-5 flex items-center justify-center font-bold
            rounded-full text-white text-xs cursor-pointer select-none
            ${getStatusBgColor()}`}
            title={getStatusTitle()}
        >
          {getStatusIcon()}
        </button>
      )}

      {/* Status icons for other users*/}
      {(!isCurrentUser) && (
        <div
          className={`absolute left-1 top-1/2 transform -translate-y-1/2
            w-5 h-5 flex items-center justify-center font-bold
            rounded-full text-white text-xs cursor-default select-none
            ${getStatusBgColor()}`}
            title={getStatusTitle()}
        >
          {getStatusIcon()}
        </div>
      )}

      {/* Status icon for suggested tasks */}
      {isSuggested && (
        <div
          className='absolute left-1 top-1/2 transform -translate-y-1/2
          w-5 h-5 flex items-center justify-center font-bold
          rounded-full text-white text-xs cursor-default'
          style={{backgroundColor: suggestedByColor}}
          title={getStatusTitle()}
        >
          {getStatusIcon()}
        </div>
      )}

      {/* Suggested task accept and reject buttons */}
      {isSuggested && isCurrentUser && !isCurrentUserSuggester && onAcceptTask && onRejectTask && (
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex space-x-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onAcceptTask();
            }}
            className="w-6 h-6 bg-green-500 rounded-full text-white hover:bg-green-600 flex items-center justify-center cursor-pointer"
            title="Accept task"
          >
            ✓
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRejectTask();
            }}
            className="w-6 h-6 bg-red-500 rounded-full text-white hover:bg-red-600 flex items-center justify-center cursor-pointer"
            title="Reject task"
          >
            ×
          </button>
        </div>
      )}

      {/* Edit and delete buttons. */}
      {((!isSuggested && isCurrentUser) || (isSuggested && isCurrentUserSuggester)) && showButtons && !isEditing && (
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 flex space-x-1">
            {!isSuggested && isCurrentUser && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (task.timerStartedAt) {
                    onStopTimer?.();
                  } else {
                    onStartTimer?.();
                  }
                }}
                className="w-6 h-6 bg-green-500 rounded-full text-white hover:bg-green-600 flex items-center justify-center cursor-pointer"
                title={task.timerStartedAt ? 'Pause timer' : 'Start timer'}
              >
                {task.timerStartedAt ? <PauseIcon className="h-4 w-4" /> : <PlayIcon className="h-4 w-4" />}
              </button>
            )}
          <button
            onClick={handleEditClick}
            className="w-6 h-6 bg-blue-500 rounded-full text-white hover:bg-blue-600 flex items-center justify-center cursor-pointer"
            title="Edit"
          >
            ✎
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete?.();
            }}
            className="w-6 h-6 bg-red-500 rounded-full text-white hover:bg-red-600 flex items-center justify-center cursor-pointer"
            title="Delete"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* Time elapsed */}
      {(!showButtons || !isCurrentUser) && !isEditing && (task.timerStartedAt || elapsed > 0) && (
        <div className="absolute right-1 top-1/2 transform -translate-y-1/2 text-xs text-gray-600">
          {formatTime(elapsed)}
        </div>
      )}

      {/* Text and edit fields */}
      {isEditing ? (
        <div className="ml-6 flex w-full" onClick={(e) => e.stopPropagation()}>
          <input
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onKeyDown={handleKeyPress}
            maxLength={64}
            className="flex-1 text-gray-800 bg-white border border-gray-300 rounded px-1 py-0 w-full"
            autoFocus
            style={{ maxWidth: 'calc(100% - 45px)'}}
          />
          <button
            onClick={handleEditSave}
            className="ml-1 bg-green-500 text-white px-1 py-0 rounded hover:bg-green-600 flex-shrink-0"
            title="Save edit"
          >
            <ArrowRightIcon className="h-3 w-3" />
          </button>
        </div>
      ) : (
        <span
          className={`ml-5 pl-1 block break-words overflow-hidden text-ellipsis ${
            !isEditing &&
            (task.timerStartedAt || elapsed > 0)
              ? 'max-w-7/10'
              : ''
          }`}
          // Prevent double tap from selecting text
          onMouseDown={(e) => {
            if (e.detail > 1) {
              e.preventDefault();
            }
          }}
        >
            {linkifyText(task.text)}
        </span>
      )}
    </div>
  );
}