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
  onAcceptTask?: (taskId: string) => void;
  onRejectTask?: (taskId: string) => void;
  members: { id: string; name: string; color: string }[];
  currentUserId: string;
  tasksWithComments?: string[]; // Array of task IDs that have comments
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
  highlightedTaskId,
  onAcceptTask,
  onRejectTask,
  members,
  currentUserId,
  tasksWithComments = []
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

    // Function to get color of a user who suggested the task
    const getSuggestedByColor = (suggestedById?: string) => {
      if (!suggestedById) return undefined;
      const suggestingMember = members.find(m => m.id === suggestedById);
      return suggestingMember?.color;
    };

    return (
      <td 
        ref={cellRef}
        className="border p-2 align-top bg-gray-50 border-gray-300 min-w-[150px] box-border"
        style={{ minHeight: '150px', position: 'relative' }} 
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        {/* Task list */}
        <div>
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
              onAcceptTask={task.suggestedBy && isCurrentUser && onAcceptTask ? 
                () => onAcceptTask(task.id) : undefined}
              onRejectTask={task.suggestedBy && isCurrentUser && onRejectTask ? 
                () => onRejectTask(task.id) : undefined}
              suggestedByColor={getSuggestedByColor(task.suggestedBy)}
              currentUserId={currentUserId}
              hasComments={tasksWithComments.includes(task.id)}
            />
          ))}
        </div>
        
        {/* Empty placeholder to reserve space (always visible) */}
        <div style={{ height: '32px', marginTop: '5px' }}></div>
        
        {/* Input field container with fixed positioning */}
        {(isHovering || newTaskText.trim().length > 0 || isFocused) && (
          <div 
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              width: 'calc(100% - 16px)',
              zIndex: 10
            }}
          >
            <div className="flex w-full">
              <input
                type="text"
                maxLength={64}
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                className="text-sm border border-gray-300 rounded-l px-2 py-1 text-gray-800"
                style={{ width: 'calc(100% - 27px)' }}
                placeholder={isCurrentUser ? "Add task..." : "Suggest task..."}
              />
              <button
                onClick={handleAddTask}
                className="bg-blue-500 text-white px-2 py-1 rounded-r hover:bg-blue-600 w-[27px] flex-shrink-0"
              >
                +
              </button>
            </div>
          </div>
        )}
      </td>
    );
  }