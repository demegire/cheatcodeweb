import React, { useState, useRef, useEffect } from 'react';
import { Task } from '../../types';
import TaskItem from './TaskItem';

interface TaskCellProps {
  memberId: string;
  day: number;
  tasks: Task[];
  onAddTask: (text: string) => void;
  onUpdateTaskStatus: (taskId: string) => void;
  onDeleteTask?: (taskId: string) => void;
  onEditTask?: (taskId: string, newText: string) => void;
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
  onDeleteTask,
  onEditTask,
  isCurrentUser,
  onSelectTask,
  selectedTaskId,
  highlightedTaskId
}: TaskCellProps) {
    const [newTaskText, setNewTaskText] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const cellRef = useRef<HTMLTableCellElement>(null);
    const [cellWidth, setCellWidth] = useState(0);
  
    // Measure the actual cell width
    useEffect(() => {
      if (cellRef.current && (isHovering || newTaskText.trim() || isFocused)) {
        const width = cellRef.current.getBoundingClientRect().width;
        setCellWidth(width);
      }
    }, [isHovering, newTaskText, isFocused]);

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

    // Calculate input width based on cell width (accounting for padding)
    const getInputWidth = () => {
      if (cellWidth === 0) return 104; // Default width
      // Calculate available space (cell width minus padding and button width)
      return Math.max(104, cellWidth - 16 - 27 - 2); // 16px for cell padding (8px each side), 27px for button, 2px for borders
    };

    // Show input field if hovering OR if there's text in the input OR it's focused
    const showInputField = isCurrentUser && (isHovering || newTaskText.trim().length > 0 || isFocused);
  
    return (
      <td 
        ref={cellRef}
        className="border p-2 align-top bg-gray-50 border-gray-300 min-w-[150px] box-border"
        style={{ minHeight: '150px' }} // Ensure consistent height
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <div className="h-full flex flex-col justify-between">
          <div className="flex-grow">
            {tasks.map(task => (
              <TaskItem 
                key={task.id} 
                task={task} 
                onUpdateStatus={() => onUpdateTaskStatus(task.id)}
                onDelete={onDeleteTask ? () => onDeleteTask(task.id) : undefined}
                onEdit={onEditTask ? (newText) => onEditTask(task.id, newText) : undefined}
                isEditable={isCurrentUser}
                isHighlighted={task.id === selectedTaskId || task.id === highlightedTaskId}
                onSelect={onSelectTask ? () => onSelectTask(task) : undefined}
              />
            ))}
          </div>
          
          {/* Reserve space for input field even when not shown */}
          <div className="h-[38px] mt-1 box-border">
            {showInputField ? (
              <div className="flex w-full m-0 box-border">
                <input
                  type="text"
                  maxLength={64}
                  value={newTaskText}
                  onChange={(e) => setNewTaskText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="text-sm border border-gray-300 rounded-l px-2 py-1 text-gray-800 box-border"
                  style={{ width: `${getInputWidth()}px` }}
                />
                <button
                  onClick={handleAddTask}
                  className="bg-blue-500 text-white px-2 py-1 rounded-r hover:bg-blue-600 w-[27px] flex-shrink-0 box-border"
                >
                  +
                </button>
              </div>
            ) : (
              <div className="h-[32px]"></div> // Placeholder with the same height as input
            )}
          </div>
        </div>
      </td>
    );
  }