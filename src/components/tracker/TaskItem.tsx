import React from 'react';
import { Task } from '../../types';

interface TaskItemProps {
  task: Task;
  onUpdateStatus: () => void;
  isEditable: boolean;
  isHighlighted?: boolean;
  onSelect?: () => void;
}


export default function TaskItem({ 
  task, 
  onUpdateStatus, 
  isEditable, 
  isHighlighted = false,
  onSelect
}: TaskItemProps) {
  const getStatusColor = () => {
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

  return (
    <div 
      className={`relative rounded border p-2 mb-1 text-sm ${getStatusColor()} 
        ${isHighlighted ? 'ring-2 ring-blue-400' : ''}
        ${onSelect ? 'cursor-pointer' : ''}`}
      onClick={onSelect}
    >
        {isEditable && (
          <button
            onClick={onUpdateStatus}
            className={`absolute left-1 top-1/2 transform -translate-y-1/2
              w-6 h-6 flex items-center justify-center
              rounded-full text-white text-xs
              ${getStatusBgColor()}`}
          >
            {getStatusIcon()}
          </button>
      )}
      <span className={`${isEditable ? 'ml-6' : ''} block truncate`}>
        {task.text}
      </span>
    </div>
  );
}