import React, { useState, useRef, useEffect, useCallback } from 'react'; // Import useCallback
import { createPortal } from 'react-dom'; // Import createPortal
import { Task } from '../../types';
import TaskItem from './TaskItem';
import { ChevronRightIcon, GlobeAltIcon } from '@heroicons/react/24/outline';

// Task types enum for better type safety
type TaskType = 'local' | 'global';

interface TaskCellProps {
  memberId: string;
  day: number;
  tasks: Task[];
  onAddTask: (text: string) => void; // This will now always be the local task handler from TaskTracker
  onAddGlobalTask?: (text: string) => void; // This will be the global task handler from TaskTracker (only passed for current user's row)
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
  // New props for global task type state
  currentTaskType: TaskType;
  onTaskTypeChange: (type: TaskType) => void;
}

export default function TaskCell({
  memberId,
  day,
  tasks,
  onAddTask,
  onAddGlobalTask, // Received from TaskTracker
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
  tasksWithComments = [],
  // Destructure new props
  currentTaskType,
  onTaskTypeChange,
}: TaskCellProps) {
    const [newTaskText, setNewTaskText] = useState('');
    const [isHovering, setIsHovering] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [isExpanded, setIsExpanded] = useState(false);
    const cellRef = useRef<HTMLTableCellElement>(null);
    const tasksContainerRef = useRef<HTMLDivElement>(null);
    const inputContainerRef = useRef<HTMLDivElement>(null); // Ref for the input container

    // Removed cellWidth state and related effect as input width is now handled by flexbox
    // Removed local currentTaskType state and its localStorage effect

    // New state to store the position of the input container for positioning the expanded menu
    const [inputContainerRect, setInputContainerRect] = useState<DOMRect | null>(null);

    // Measure the input container rect when expanding
    useEffect(() => {
      if (isExpanded && inputContainerRef.current) {
        setInputContainerRect(inputContainerRef.current.getBoundingClientRect());
      } else {
        setInputContainerRect(null); // Clear the rect when collapsing
      }
    }, [isExpanded]); // Re-measure only when expanded state changes


    const handleAddTask = () => {
      if (newTaskText.trim() && newTaskText.length <= 64) {
        // Use the currentTaskType from props
        if (currentTaskType === 'global' && onAddGlobalTask) {
          // Call the global handler if type is global and handler is provided
          onAddGlobalTask(newTaskText.trim());
        } else {
          // Otherwise, call the local handler
          onAddTask(newTaskText.trim());
        }
        setNewTaskText('');
        // Optionally collapse options after adding task
        setIsExpanded(false);
      }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        handleAddTask();
      }
    };

    const toggleExpanded = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation(); // Prevent event from bubbling up and triggering document click immediately
      setIsExpanded(!isExpanded);
    };

    // Use the onTaskTypeChange prop to update the global state
    const handleTaskTypeChange = (type: TaskType) => {
      onTaskTypeChange(type); // Call the parent handler
      setIsExpanded(false); // Collapse after selection
    };

     // Handle blur specifically for the input field
     const handleInputBlur = () => {
        setIsFocused(false);
        // If the cell is not hovered and the input is empty, close the options
        // Add a small delay to allow click events on the expanded menu buttons to register
        setTimeout(() => {
             // Only collapse if not hovering the cell OR if the input text is empty
             if (!isHovering && !newTaskText.trim()) {
                 setIsExpanded(false);
             }
        }, 50); // 50ms delay
     };


    // Close expanded menu when clicking outside the input container area
    const handleDocumentClick = useCallback((e: MouseEvent) => {
      // Also check if the click was inside the expanded menu portal itself
      if (isExpanded && inputContainerRef.current && !inputContainerRef.current.contains(e.target as Node)) {
           // Add a check to see if the click target is within the portal's element.
           // This is slightly complex because the portal is appended to body.
           // A simpler approach for now is to rely on pointerEvents: 'none' when not expanded.
           // If a click occurs and !inputContainerRef.current.contains(e.target), it means the click
           // was either elsewhere on the document or on the expanded menu itself.
           // We only want to close if it's *not* on the expanded menu.
           // Since the expanded menu is rendered by the portal and positioned
           // absolutely, it's not a child of inputContainerRef.current.
           // We need a way to check if the click target is part of the expanded menu.
           // For now, the current logic will close the menu if the click is outside the input container
           // which includes the chevron. This is acceptable for the requested behavior.

           setIsExpanded(false);
      }
    }, [isExpanded, inputContainerRef]); // Add inputContainerRef to dependencies

    useEffect(() => {
      // Add and remove document click listener
      document.addEventListener('click', handleDocumentClick);
      return () => {
        document.removeEventListener('click', handleDocumentClick);
      };
    }, [handleDocumentClick]);


    // Function to get color of a user who suggested the task
    const getSuggestedByColor = (suggestedById?: string) => {
      if (!suggestedById) return undefined;
      const suggestingMember = members.find(m => m.id === suggestedById);
      return suggestingMember?.color;
    };

    // Define the minimum height we want for the task container
    // Each task is about 32px total height (content + padding + margin + borders)
    const MIN_TASK_CONTAINER_HEIGHT = 96; // 32px * 3 tasks

    // Calculate the height we need to add to meet the minimum
    const getMinHeightStyle = () => {
      if (!tasksContainerRef.current || tasks.length === 0) {
        // If no tasks, use the full minimum height
        return { minHeight: `${MIN_TASK_CONTAINER_HEIGHT}px` };
      }

      // No extra minimum height needed
      return {};
    };

    return (
      <td
        ref={cellRef}
        className="border p-1 align-top bg-gray-50 border-gray-300 h-full"
        style={{
          minHeight: '150px',
          position: 'relative',
          width: '14.28%',
          maxWidth: '1fr',
          overflow: 'hidden' // Keep overflow hidden for cell content
        }}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => {
            setIsHovering(false);
            // If input is not focused and is empty, close the options
            // Add a small delay to allow relatedTarget to be set if moving to the expanded menu
            setTimeout(() => {
                // Only collapse if input is not focused AND the input text is empty
                if (!isFocused && !newTaskText.trim()) {
                    setIsExpanded(false);
                }
            }, 50); // 50ms delay
        }}
      >
        {/* Task list with minimum height */}
        <div ref={tasksContainerRef} style={getMinHeightStyle()}>
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

          {/* If the cell is empty, add invisible placeholder to maintain minimum height */}
          {tasks.length === 0 && (
            <div className="opacity-0" style={{ height: `${MIN_TASK_CONTAINER_HEIGHT}px` }}>
              &nbsp;
            </div>
          )}
        </div>

        {/* Empty placeholder to reserve space (always visible) */}
        <div style={{ height: '32px', marginTop: '5px' }}></div>

        {/* Input field container with fixed positioning within the cell */}
        {/* Only show input if it's the current user's row */}
        {isCurrentUser && (isHovering || newTaskText.trim().length > 0 || isFocused) && (
          <div
            ref={inputContainerRef} // Attach ref here
            style={{
              position: 'absolute',
              bottom: '4px',
              left: '4px',
              width: 'calc(100% - 8px)', // This container takes up most of the cell width
              zIndex: 10, // Ensure input is above tasks
            }}
          >
            <div className="flex w-full items-center" style={{height: '32px'}}> {/* Flex container for input and buttons */}
              <input
                type="text"
                maxLength={64}
                value={newTaskText}
                onChange={(e) => setNewTaskText(e.target.value)}
                onKeyPress={handleKeyPress}
                onFocus={() => setIsFocused(true)}
                onBlur={handleInputBlur} // Use the new blur handler
                className="text-sm border border-gray-300 rounded-l px-2 py-1 text-gray-800 h-full" // Ensure input takes full height
                style={{ width: 'calc(100% - 46px)' }} // Set width to accommodate both buttons (27px + 19px)
                placeholder={`Add ${currentTaskType} task...`} // Placeholder uses currentTaskType from props
              />
              <button
                onClick={handleAddTask} // This now calls the local handleAddTask which checks currentTaskType
                className={`bg-blue-500 text-white px-2 py-1 hover:bg-blue-600 w-[27px] flex-shrink-0 flex items-center justify-center h-full`} // Removed rounded-r here
              >
                {currentTaskType === 'global' ? <GlobeAltIcon className="h-4 w-4" /> : '+'} {/* Use h-4 w-4 for consistent icon size */}
              </button>

              <button
                  onClick={toggleExpanded} // Chevron button triggers expansion
                  className="bg-blue-500 text-white border-l border-white px-1 py-1 rounded-r hover:bg-blue-600 w-[19px] flex-shrink-0 flex items-center justify-center h-full"
                >
                  <ChevronRightIcon className={`h-3 w-3 transition-transform duration-300 ease-in-out ${isExpanded ? 'rotate-180' : ''}`}/>
                </button>
            </div>
          </div>
        )}
         {/* Do not show input/buttons for other users when not current user */}
        {!isCurrentUser && (isHovering || newTaskText.trim().length > 0 || isFocused) && (
             <div
                ref={inputContainerRef} // Attach ref here
                style={{
                  position: 'absolute',
                  bottom: '4px',
                  left: '4px',
                  width: 'calc(100% - 8px)', // This container takes up most of the cell width
                  zIndex: 10, // Ensure input is above tasks
                }}
             >
                 <div className="flex w-full items-center" style={{height: '32px'}}>
                     <input
                        type="text"
                        maxLength={64}
                        value={newTaskText}
                        onChange={(e) => setNewTaskText(e.target.value)}
                        onKeyPress={handleKeyPress}
                        onFocus={() => setIsFocused(true)}
                        onBlur={handleInputBlur}
                        className="text-sm border border-gray-300 rounded-l px-2 py-1 text-gray-800 h-full rounded-r" // Apply rounded-r here for non-current user
                        style={{ width: 'calc(100% - 27px)' }} // Let it grow for non-current user
                        placeholder={"Suggest task..."}
                     />
                      <button
                        onClick={handleAddTask} // This will call the local handleAddTask (which calls handleSuggestTask)
                        className={`bg-blue-500 text-white px-2 py-1 hover:bg-blue-600 w-[27px] flex-shrink-0 flex items-center justify-center h-full rounded-r`} // Apply rounded-r here for non-current user
                      >
                        +
                      </button>
                 </div>
            </div>
        )}


        {/* Expanded options rendered outside the cell flow when visible */}
        {isExpanded && isCurrentUser && inputContainerRect && createPortal(
          <div
            style={{
              position: 'absolute', // Position relative to the viewport/document
              top: inputContainerRect.top,
              left: inputContainerRect.right, // Position to the right of the input container
              zIndex: 50, // High z-index to appear on top
              display: 'flex',
              flexDirection: 'row', // Buttons side-by-side
              backgroundColor: 'white', // Add a background
              border: '1px solid #d1d5db', // Add a border
              borderRadius: '0 4px 4px 0', // Match input border radius on the right
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)', // Add a shadow
              overflow: 'hidden', // Hide overflow during transition
               // Smooth transition for appearing
              transition: 'opacity 0.3s ease-in-out',
              opacity: isExpanded ? 1 : 0,
              pointerEvents: isExpanded ? 'auto' : 'none', // Disable pointer events when hidden
            }}
          >
            {/* Only show the option to switch if the alternative handler is available */}
            {currentTaskType === 'local' && onAddGlobalTask && (
              <button
                onClick={() => handleTaskTypeChange('global')} // Calls parent handler
                className="bg-blue-500 text-white border-l border-white px-2 py-1 flex items-center justify-center hover:bg-blue-600 whitespace-nowrap text-sm h-8" // Set fixed height
              >
                <GlobeAltIcon className="h-4 w-4 mr-1" /> {/* Use h-4 w-4 for consistent icon size */}
                <span>Global</span>
              </button>
            )}

            {currentTaskType === 'global' && (
              <button
                onClick={() => handleTaskTypeChange('local')} // Calls parent handler
                className="bg-blue-500 text-white border-l border-white px-2 py-1 flex items-center justify-center hover:bg-blue-600 whitespace-nowrap text-sm h-8" // Set fixed height
              >
                <span className="mr-1">+</span>
                <span>Local</span>
              </button>
            )}

            {/* Room for future task types */}
          </div>,
          document.body // Append to the document body
        )}
      </td>
    );
  }