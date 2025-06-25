import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/hooks/useAuth';
import { Task, Comment } from '../../types';
import TaskCell from './TaskCell';
import Navigation from './Navigation';
import WeeklyNavigation from './WeeklyNavigation';
import CompactGroupHeader from '../layout/CompactGroupHeader';
import ShareButton from '../layout/ShareButton';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getCurrentISOWeek, getRelativeISOWeek, getDateFromISOWeek, getMonthFirstWeek, getISOWeek } from '../../lib/dateUtils';

// Helper function to get day names with dates for a specific ISO week
const getDayNames = (isoWeek: string) => {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const mondayDate = getDateFromISOWeek(isoWeek);

  return days.map((day, index) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + index);
    return `${day} (${date.getDate()}/${date.getMonth() + 1})`;
  });
};

interface TaskTrackerProps {
  groupId: string;
  groupName: string;
  members: { id: string; name: string; color: string }[];
  onGroupNameUpdate?: (groupId: string, newName: string) => void;
  onSelectTask?: (task: Task | null) => void;
  selectedTask?: Task | null;
  highlightedTaskId?: string | null;
  onWeekChange?: (weekId: string) => void;
  comments?: Comment[];
}

// Task types enum for better type safety (Define it here too)
type TaskType = 'local' | 'global';

export default function TaskTracker({
  groupId,
  groupName,
  members,
  onGroupNameUpdate,
  onSelectTask,
  selectedTask,
  highlightedTaskId,
  onWeekChange,
  comments = []
}: TaskTrackerProps) {
  const { user } = useAuth();
  const [currentISOWeek, setCurrentISOWeek] = useState(getCurrentISOWeek());
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [currentGroupName, setCurrentGroupName] = useState(groupName);

  // State for the globally selected task type
  const [globalTaskType, setGlobalTaskType] = useState<TaskType>(() => {
    // Load from localStorage on initial render
    const savedType = localStorage.getItem('preferredTaskType');
    return (savedType === 'global' ? 'global' : 'local') as TaskType;
  });

  // Effect to save the preferred task type to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('preferredTaskType', globalTaskType);
  }, [globalTaskType]);


  const dayNames = getDayNames(currentISOWeek);

  // Extract task IDs from comments
  const tasksWithComments = comments
    .filter(comment => comment.taskId !== null)
    .map(comment => comment.taskId as string);

  useEffect(() => {
    if (!groupId) return;

    // Create a reference to the tasks collection for this group
    const tasksRef = collection(db, 'groups', groupId, 'tasks');

    // Query tasks for the current week using ISO week identifier
    const q = query(
      tasksRef,
      where('weekId', '==', currentISOWeek)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskData: Record<string, Task[]> = {};
      const scoreData: Record<string, number> = {};

      // Initialize empty arrays for each member
      members.forEach(member => {
        taskData[member.id] = [];
        scoreData[member.id] = 0;
      });

      // Populate with tasks from Firestore
      snapshot.forEach(doc => {
        const data = doc.data();

        // Convert Firestore timestamp to a serializable format
        let createdAt;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date(); // Fallback to current date if missing
        }

        const task = {
          id: doc.id,
          ...data,
          createdAt: createdAt
        } as Task;

        if (taskData[task.createdBy]) {
          taskData[task.createdBy].push(task);
        }
      });

      // Sort tasks by creation date for each member (oldest first)
      members.forEach(member => {
        if (taskData[member.id]) {
          console.log(`Before sorting - ${member.id}:`,
            taskData[member.id].map(t => ({ id: t.id, text: t.text, createdAt: t.createdAt }))
          );

          taskData[member.id].sort((a, b) => {
            console.log(`Comparing ${a.text} (${a.createdAt}) with ${b.text} (${b.createdAt})`);
            return a.createdAt.getTime() - b.createdAt.getTime();
          });

          console.log(`After sorting - ${member.id}:`,
            taskData[member.id].map(t => ({ id: t.id, text: t.text, createdAt: t.createdAt }))
          );
        }
      });

      // Calculate scores for each member
      members.forEach(member => {
        const memberTasks = taskData[member.id] || [];
        if (memberTasks.length > 0) {
          const completedCount = memberTasks.filter(t => t.status === 'completed').length;
          scoreData[member.id] = (completedCount / memberTasks.length) * 100;
        }
      });

      setTasks(taskData);
      setScores(scoreData);
    });

    return () => unsubscribe();
  }, [groupId, currentISOWeek, members]);

  useEffect(() => {
    setCurrentGroupName(groupName);
  }, [groupName]);

  const handlePreviousWeek = () => {
    const newWeek = getRelativeISOWeek(currentISOWeek, -1);
    setCurrentISOWeek(newWeek);
    onWeekChange?.(newWeek); // Notify parent
  };

  const handleNextWeek = () => {
    const newWeek = getRelativeISOWeek(currentISOWeek, 1);
    setCurrentISOWeek(newWeek);
    onWeekChange?.(newWeek); // Notify parent
  };

  const handleCurrentWeek = () => {
    const currentWeek = getCurrentISOWeek();
    setCurrentISOWeek(currentWeek);
    onWeekChange?.(currentWeek); // Notify parent
  };

  const handleMonthSelect = (year: number, month: number) => {
    const newWeek = getMonthFirstWeek(year, month);
    setCurrentISOWeek(newWeek);
    onWeekChange?.(newWeek); // Notify parent
  };

  const handleYearSelect = (year: number) => {
    // Get a date object from the current week
    const weekDate = getDateFromISOWeek(currentISOWeek);
    // Set the year while preserving month/day
    weekDate.setFullYear(year);
    // Convert back to ISO week format using getISOWeek
    const newWeek = getISOWeek(weekDate);
    setCurrentISOWeek(newWeek);
    onWeekChange?.(newWeek); // Notify parent
  };

  const handleAddTask = async (memberId: string, day: number, text: string) => {
    if (!user || !groupId) return;

    try {
      // Add task to Firestore with ISO week ID
      await addDoc(collection(db, 'groups', groupId, 'tasks'), {
        text,
        status: 'not-done',
        day,
        createdBy: memberId,
        createdAt: new Date(),
        weekId: currentISOWeek  // Using ISO week identifier
      });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  // Placeholder for handleAddGlobalTask (Implement the actual logic here later)
  const handleAddGlobalTask = async (memberId: string, day: number, text: string) => {
     if (!user) return;
     console.log(`Attempting to add GLOBAL task for member ${memberId} on day ${day}: "${text}"`);
     // TODO: Implement actual global task creation logic here
     alert(`Simulating adding global task for ${members.find(m => m.id === memberId)?.name} on day ${day}: "${text}"`);
  };


  const handleUpdateTaskStatus = async (memberId: string, taskId: string) => {
    if (!user || !groupId) return;

    try {
      // Get the current task
      const taskRef = doc(db, 'groups', groupId, 'tasks', taskId);

      // Find the task in local state to get its current status
      const memberTasks = tasks[memberId] || [];
      const task = memberTasks.find(t => t.id === taskId);

      if (!task) return;

      // Determine next status (cycle through: not-done -> completed -> postponed -> not-done)
      let nextStatus: 'not-done' | 'completed' | 'postponed';
      switch (task.status) {
        case 'not-done':
          nextStatus = 'completed';
          break;
        case 'completed':
          nextStatus = 'postponed';
          break;
        case 'postponed':
          nextStatus = 'not-done';
          break;
        default:
          nextStatus = 'not-done';
      }

      // Update task status in Firestore
      await updateDoc(taskRef, {
        status: nextStatus
      });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (memberId: string, taskId: string) => {
    if (!user || !groupId) return;

    try {
      // Delete task from Firestore
      await deleteDoc(doc(db, 'groups', groupId, 'tasks', taskId));

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleEditTask = async (memberId: string, taskId: string, newText: string) => {
    if (!user || !groupId) return;

    try {
      // Update task text in Firestore
      await updateDoc(doc(db, 'groups', groupId, 'tasks', taskId), {
        text: newText
      });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error updating task text:', error);
    }
  };

  const handleUpdateGroupName = async (newName: string) => {
    if (!groupId) return;

    try {
      // Update group name in Firestore
      await updateDoc(doc(db, 'groups', groupId), {
        name: newName
      });

      // Update local state
      setCurrentGroupName(newName);

      // Notify parent component
      if (onGroupNameUpdate) {
        onGroupNameUpdate(groupId, newName);
      }
    } catch (error) {
      console.error('Error updating group name:', error);
    }
  };

  // New method to suggest a task for another user
  const handleSuggestTask = async (forMemberId: string, day: number, text: string) => {
    if (!user || !groupId) return;

    try {
      // Add suggested task to Firestore
      await addDoc(collection(db, 'groups', groupId, 'tasks'), {
        text,
        status: 'not-done',
        day,
        createdBy: forMemberId,  // This is who the task is FOR
        suggestedBy: user.uid,   // This is who SUGGESTED the task
        createdAt: new Date(),
        weekId: currentISOWeek
      });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error suggesting task:', error);
    }
  };

  // New method to accept a suggested task
  const handleAcceptTask = async (memberId: string, taskId: string) => {
    if (!user || !groupId) return;

    try {
      // Update task in Firestore to remove suggestedBy field
      const taskRef = doc(db, 'groups', groupId, 'tasks', taskId);
      await updateDoc(taskRef, {
        suggestedBy: null
      });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error accepting task:', error);
    }
  };

  // New method to reject a suggested task
  const handleRejectTask = async (memberId: string, taskId: string) => {
    if (!user || !groupId) return;

    try {
      // Delete the suggested task
      await deleteDoc(doc(db, 'groups', groupId, 'tasks', taskId));

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error rejecting task:', error);
    }
  };

  // Rest of the component remains the same
  return (
    <div className="flex flex-col h-full overflow-hidden p-4 relative">
      <div className="flex justify-between items-center mb-3">
        <div className="py-1">
          <WeeklyNavigation
            currentISOWeek={currentISOWeek}
            onPreviousWeek={handlePreviousWeek}
            onNextWeek={handleNextWeek}
            onCurrentWeek={handleCurrentWeek}
          />
        </div>
        <div className="py-1">
          <ShareButton groupId={groupId} />
        </div>
      </div>

      {/* Absolutely positioned group header to keep it centered */}
      <div className="absolute top-4 left-0 right-0 flex justify-center pointer-events-none">
        <div className="pointer-events-auto">
          <CompactGroupHeader
            groupName={currentGroupName}
            onUpdateName={handleUpdateGroupName}
          />
        </div>
      </div>

      <div className="flex-grow overflow-auto">
        <table className="w-full border-collapse table-fixed">
          <thead>
            <tr>
              <th className="border p-1 bg-gray-50 text-gray-800 w-24">Person</th>
              {dayNames.map((day, index) => (
                <th key={index} className="border p-1 bg-gray-50 text-gray-800" style={{ width: '14.28%', minWidth: '150px', maxWidth: '1fr' }}>
                  {day}
                </th>
              ))}
              <th className="border p-1 bg-gray-50 text-gray-800" style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}>Score</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id}>
                <td
                  className="border border-black p-1 font-bold text-white text-center"
                  style={{ backgroundColor: member.color }}
                >
                  {member.name}
                </td>

                {[0, 1, 2, 3, 4, 5, 6].map(day => (
                  <TaskCell
                    key={day}
                    memberId={member.id}
                    day={day}
                    tasks={tasks[member.id]?.filter(t => t.day === day) || []}
                    onAddTask={(text) => {
                      // If adding task for current user, use handleAddTask (local)
                      if (member.id === user?.uid) {
                        handleAddTask(member.id, day, text);
                      }
                      // If adding task for another user, use handleSuggestTask (local suggestion)
                      else {
                        handleSuggestTask(member.id, day, text);
                      }
                    }}
                    // Pass the global task handler
                    onAddGlobalTask={
                       member.id === user?.uid ? (text) => handleAddGlobalTask(member.id, day, text) : undefined
                    }
                    onUpdateTaskStatus={(taskId) => handleUpdateTaskStatus(member.id, taskId)}
                    onDeleteTask={(taskId) => handleDeleteTask(member.id, taskId)}
                    onEditTask={(taskId, newText) => handleEditTask(member.id, taskId, newText)}
                    isCurrentUser={member.id === user?.uid}
                    onSelectTask={onSelectTask ? (task) => onSelectTask(task) : undefined}
                    selectedTaskId={selectedTask?.id}
                    highlightedTaskId={highlightedTaskId}
                    onAcceptTask={(taskId) => handleAcceptTask(member.id, taskId)}
                    onRejectTask={(taskId) => handleRejectTask(member.id, taskId)}
                    members={members}
                    currentUserId={user?.uid || ''}
                    tasksWithComments={tasksWithComments}
                    // Pass the global task type state and setter
                    currentTaskType={globalTaskType}
                    onTaskTypeChange={setGlobalTaskType}
                  />
                ))}

                <td className="border p-1 text-center font-bold text-gray-800 bg-white" style={{ width: '70px', minWidth: '70px', maxWidth: '70px', overflow: 'hidden' }}>
                  {scores[member.id]?.toFixed(2) || '0.00'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Navigation
        currentISOWeek={currentISOWeek}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
        onMonthSelect={handleMonthSelect}
        onYearSelect={handleYearSelect}
      />
    </div>
  );
}