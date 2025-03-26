import React, { useState } from 'react';
import { Task } from '../../types';
import TaskItem from './TaskItem';

interface TaskCellProps {
  memberId: string;
  day: number;
  tasks: Task[];
  onAddTask: (text: string) => void;
  onUpdateTaskStatus: (taskId: string) => void;
  isCurrentUser: boolean;
  onSelectTask?: (task: Task | null) => void;
  selectedTaskId?: string | null;
  highlightedTaskId?: string | null;
}

export default function TaskCell({ 
  memberId, 
  day, 
  tasks, 
  onAddTask, 
  onUpdateTaskStatus,
  isCurrentUser,
  onSelectTask,
  selectedTaskId,
  highlightedTaskId
}: TaskCellProps) {
    const [newTaskText, setNewTaskText] = useState('');
  
    const handleAddTask = () => {
      if (newTaskText.trim() && newTaskText.length <= 64) {
        onAddTask(newTaskText.trim());
        setNewTaskText('');
      }
    };
  
    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleAddTask();
      }
    };
  
    return (
      <td className="border p-2 align-top bg-gray-50 border-gray-300 min-w-[150px]">
        {tasks.map(task => (
          <TaskItem 
            key={task.id} 
            task={task} 
            onUpdateStatus={() => onUpdateTaskStatus(task.id)}
            isEditable={isCurrentUser}
            isHighlighted={task.id === selectedTaskId || task.id === highlightedTaskId}
            onSelect={onSelectTask ? () => onSelectTask(task) : undefined}
          />
        ))}
        
        {isCurrentUser && (
          <div className="flex mt-2">
            <input
              type="text"
              maxLength={64}
              value={newTaskText}
              onChange={(e) => setNewTaskText(e.target.value)}
              onKeyPress={handleKeyPress}
              className="flex-1 text-sm border border-gray-300 rounded-l px-2 py-1 text-gray-800"
            />
            <button
              onClick={handleAddTask}
              className="bg-blue-500 text-white px-2 py-1 rounded-r hover:bg-blue-600"
            >
              +
            </button>
          </div>
        )}
      </td>
    );
  }