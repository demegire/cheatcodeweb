import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/hooks/useAuth';
import { Task, Comment } from '../../types';
import TaskCell from './TaskCell';
import WeeklyNavigation from './WeeklyNavigation';
import TopBar from '../layout/TopBar';
import BottomBar from '../layout/BottomBar';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getCurrentISOWeek, getRelativeISOWeek, getDateFromISOWeek, getMonthFirstWeek, getISOWeek } from '../../lib/dateUtils';
import ThisWeekButton from './ThisWeekButton';

// Helper function to get list of dates for a specific ISO week
const getDates = (isoWeek: string) => {
  const days = [0, 1, 2, 3, 4, 5, 6]
  const mondayDate = getDateFromISOWeek(isoWeek);

  return days.map((index) => {
    const date = new Date(mondayDate);
    date.setDate(mondayDate.getDate() + index);
    return date;
  });
};

// Helper function to get day text from date
const getDayName = (date: Date) => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return `${days[date.getDay()]} (${date.getDate()}/${date.getMonth() + 1})`
}

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
  isStatView: boolean;
  onStatView: () => void;
  onToggleLeftSidebar?: () => void;
  onToggleRightSidebar?: () => void;
  isLeftSidebarCollapsed?: boolean;
  isRightSidebarCollapsed?: boolean;
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
  comments = [],
  isStatView,
  onStatView,
  onToggleLeftSidebar,
  onToggleRightSidebar,
  isLeftSidebarCollapsed,
  isRightSidebarCollapsed
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


  const days = getDates(currentISOWeek);
  const currentDay = new Date();

  // Extract task IDs from comments
  const tasksWithComments = comments
    .filter(comment => comment.taskId !== null)
    .map(comment => comment.taskId as string);

  useEffect(() => {
    if (!groupId) return;

    // Reference to this group's tasks for the selected week
    const tasksRef = collection(db, 'groups', groupId, 'tasks');
    const q = query(tasksRef, where('weekId', '==', currentISOWeek));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const localData: Record<string, Task[]> = {};

      members.forEach(member => {
        localData[member.id] = [];
      });

      snapshot.forEach(docSnap => {
        const data = docSnap.data();

        let createdAt;
        if (data.createdAt && typeof data.createdAt.toDate === 'function') {
          createdAt = data.createdAt.toDate();
        } else if (data.createdAt) {
          createdAt = new Date(data.createdAt);
        } else {
          createdAt = new Date();
        }

        let timerStartedAt;
        if (data.timerStartedAt && typeof data.timerStartedAt.toDate === 'function') {
          timerStartedAt = data.timerStartedAt.toDate();
        } else if (data.timerStartedAt) {
          timerStartedAt = new Date(data.timerStartedAt);
        } else {
          timerStartedAt = null;
        }

        const task = {
          id: docSnap.id,
          ...data,
          createdAt,
          timerStartedAt,
          elapsedSeconds: data.elapsedSeconds || 0,
          isGlobal: false,
        } as Task;

        if (localData[task.createdBy]) {
          localData[task.createdBy].push(task);
        }
      });

      // Sort local tasks by creation date
      members.forEach(member => {
        localData[member.id].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      });

      // Merge with any existing global tasks
      setTasks(prev => {
        const merged: Record<string, Task[]> = {};
        members.forEach(member => {
          const globals = prev[member.id]?.filter(t => t.isGlobal) || [];
          merged[member.id] = [...localData[member.id], ...globals];
        });

        const scoreData: Record<string, number> = {};
        members.forEach(member => {
          const memberTasks = merged[member.id] || [];
          const totalCount = memberTasks.filter(t => t.status !== 'suggested' && t.status !== 'info').length;
          if (totalCount > 0) {
            const completedCount = memberTasks.filter(t => t.status === 'completed').length;
            scoreData[member.id] = (completedCount / totalCount) * 100;
          }
        });

        setScores(scoreData);
        return merged;
      });
    });

    return () => unsubscribe();
  }, [groupId, currentISOWeek, members]);

  // Fetch global tasks for all members
  useEffect(() => {
    const unsubscribes: (() => void)[] = [];

    members.forEach(member => {
      const tasksRef = collection(db, 'users', member.id, 'tasks');
      const q = query(tasksRef, where('weekId', '==', currentISOWeek));

      const unsubscribe = onSnapshot(q, snapshot => {
        const globalTasks: Task[] = [];

        snapshot.forEach(docSnap => {
          const data = docSnap.data();
          let createdAt;
          if (data.createdAt && typeof data.createdAt.toDate === 'function') {
            createdAt = data.createdAt.toDate();
          } else if (data.createdAt) {
            createdAt = new Date(data.createdAt);
          } else {
            createdAt = new Date();
          }

          let timerStartedAt;
          if (data.timerStartedAt && typeof data.timerStartedAt.toDate === 'function') {
            timerStartedAt = data.timerStartedAt.toDate();
          } else if (data.timerStartedAt) {
            timerStartedAt = new Date(data.timerStartedAt);
          } else {
            timerStartedAt = null;
          }

          globalTasks.push({
            id: docSnap.id,
            ...data,
            createdAt,
            timerStartedAt,
            elapsedSeconds: data.elapsedSeconds || 0,
            isGlobal: true,
          } as Task);
        });

        // Sort global tasks by creation date
        globalTasks.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        setTasks(prev => {
          const updated: Record<string, Task[]> = { ...prev };
          const localOnly = (updated[member.id] || []).filter(t => !t.isGlobal);
          updated[member.id] = [...localOnly, ...globalTasks];

          const scoreData: Record<string, number> = {};
          members.forEach(m => {
            const memberTasks = updated[m.id] || [];
            const totalCount = memberTasks.filter(t => t.status !== 'suggested' && t.status !== 'info').length;
            if (totalCount > 0) {
              const completedCount = memberTasks.filter(t => t.status === 'completed').length;
              scoreData[m.id] = (completedCount / totalCount) * 100;
            }
          });
          setScores(scoreData);
          return updated;
        });
      });

      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(u => u());
    };
  }, [members, currentISOWeek]);

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
        weekId: currentISOWeek, // Using ISO week identifier
        timerStartedAt: null,
        elapsedSeconds: 0,
      });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error adding task:', error);
    }
  };

  const handleAddGlobalTask = async (memberId: string, day: number, text: string) => {
     if (!user) return;
     try {
        // Add task to Firestore with ISO week ID
        await addDoc(collection(db, 'users', memberId, 'tasks'), {
          text,
          status: 'not-done',
          day,
          createdBy: memberId,
          createdAt: new Date(),
          weekId: currentISOWeek, // Using ISO week identifier
          timerStartedAt: null,
          elapsedSeconds: 0,
        });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
        console.error('Error adding task:', error);
    }
  };


  const handleUpdateTaskStatus = async (memberId: string, taskId: string) => {
    if (!user) return;

    try {
      // Find the task in local state to get its current status and location
      const memberTasks = tasks[memberId] || [];
      const task = memberTasks.find(t => t.id === taskId);

      if (!task) return;

      // Determine next status (cycle through: not-done -> completed -> postponed -> info ->not-done)
      let nextStatus: 'not-done' | 'completed' | 'postponed' | 'info';
      switch (task.status) {
        case 'not-done':
          nextStatus = 'completed';
          break;
        case 'completed':
          nextStatus = 'postponed';
          break;
        case 'postponed':
          nextStatus = 'info';
          break;
        case 'info':
          nextStatus = 'not-done';
          break;
        default:
          nextStatus = 'not-done';
      }

      const taskRef = task.isGlobal
        ? doc(db, 'users', memberId, 'tasks', taskId)
        : doc(db, 'groups', groupId!, 'tasks', taskId);

      // Update task status in Firestore
      await updateDoc(taskRef, {
        status: nextStatus,
      });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };

  const handleDeleteTask = async (memberId: string, taskId: string) => {
    if (!user) return;

    try {
      const memberTasks = tasks[memberId] || [];
      const task = memberTasks.find(t => t.id === taskId);
      if (!task) return;

      const taskRef = task.isGlobal
        ? doc(db, 'users', memberId, 'tasks', taskId)
        : doc(db, 'groups', groupId!, 'tasks', taskId);

      // Delete task from Firestore
      await deleteDoc(taskRef);

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleEditTask = async (memberId: string, taskId: string, newText: string) => {
    if (!user) return;

    try {
      const memberTasks = tasks[memberId] || [];
      const task = memberTasks.find(t => t.id === taskId);
      if (!task) return;

      const taskRef = task.isGlobal
        ? doc(db, 'users', memberId, 'tasks', taskId)
        : doc(db, 'groups', groupId!, 'tasks', taskId);

      // Update task text in Firestore
      await updateDoc(taskRef, {
        text: newText,
      });

      // No need to update local state as the onSnapshot will handle that
    } catch (error) {
      console.error('Error updating task text:', error);
    }
  };

  const handleStartTaskTimer = async (memberId: string, taskId: string) => {
    if (!user) return;

    try {
      const memberTasks = tasks[memberId] || [];
      const task = memberTasks.find(t => t.id === taskId);
      if (!task) return;

      const taskRef = task.isGlobal
        ? doc(db, 'users', memberId, 'tasks', taskId)
        : doc(db, 'groups', groupId!, 'tasks', taskId);

      const now = new Date();

      await updateDoc(taskRef, {
        timerStartedAt: now,
      });

      setTasks(prev => {
        const memberTasks = prev[memberId] || [];
        const updated = memberTasks.map(t =>
          t.id === taskId ? { ...t, timerStartedAt: now } : t
        );
        return { ...prev, [memberId]: updated };
      });
    } catch (error) {
      console.error('Error starting task timer:', error);
    }
  };

  const handleStopTaskTimer = async (memberId: string, taskId: string) => {
    if (!user) return;

    try {
      const memberTasks = tasks[memberId] || [];
      const task = memberTasks.find(t => t.id === taskId);
      if (!task || !task.timerStartedAt) return;

      const taskRef = task.isGlobal
        ? doc(db, 'users', memberId, 'tasks', taskId)
        : doc(db, 'groups', groupId!, 'tasks', taskId);

      const now = new Date();
      const elapsed = task.elapsedSeconds || 0;
      const additional = Math.floor((now.getTime() - new Date(task.timerStartedAt).getTime()) / 1000);

      const newElapsed = elapsed + additional;

      await updateDoc(taskRef, {
        elapsedSeconds: newElapsed,
        timerStartedAt: null,
      });

      setTasks(prev => {
        const memberTasks = prev[memberId] || [];
        const updated = memberTasks.map(t =>
          t.id === taskId ? { ...t, elapsedSeconds: newElapsed, timerStartedAt: null } : t
        );
        return { ...prev, [memberId]: updated };
      });
    } catch (error) {
      console.error('Error stopping task timer:', error);
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
        status: 'suggested',
        day,
        createdBy: forMemberId,  // This is who the task is FOR
        suggestedBy: user.uid,   // This is who SUGGESTED the task
        createdAt: new Date(),
        weekId: currentISOWeek,
        timerStartedAt: null,
        elapsedSeconds: 0,
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
        status: 'not-done',
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

  return (
    <div className="flex flex-col h-full overflow-hidden p-4 relative">
      <TopBar
        groupId={groupId}
        groupName={currentGroupName}
        onUpdateGroupName={handleUpdateGroupName}
        isStatView={isStatView}
        onStatView={onStatView}
        onToggleLeftSidebar={onToggleLeftSidebar}
        onToggleRightSidebar={onToggleRightSidebar}
        centerContent={
          <div className="relative">
            <div className="absolute right-full w-[120px] top-1/2 -translate-y-1/2">
              <ThisWeekButton
                currentISOWeek={currentISOWeek}
                onCurrentWeek={handleCurrentWeek}
              />
            </div>
            <WeeklyNavigation
              currentISOWeek={currentISOWeek}
              onPreviousWeek={handlePreviousWeek}
              onNextWeek={handleNextWeek}
              onMonthSelect={handleMonthSelect}
              onYearSelect={handleYearSelect}
            />
          </div>
        }
      />

      <div className="flex-grow overflow-auto pb-24">
        <table className="border-separate border-spacing-x-1 border-spacing-y-2 md:w-full table-fixed">
          <thead>
            <tr>
              <th className="p-1 text-black w-24"></th>
              {days.map((day, index) => {
                let isCurrentDay = day.getDate() === currentDay.getDate() && 
                                   day.getMonth() === currentDay.getMonth() && 
                                   day.getFullYear() === currentDay.getFullYear();
                return (
                  <th
                    key={index}
                    className={`p-1 rounded-t-2xl bg-gray-100 text-black min-w-[80vw] md:min-w-auto ${isCurrentDay && `bg-gray-200 inset-ring-1`}`}
                  >
                    {getDayName(day)}
                  </th>
                );
              })}
              <th className="rounded-r-2xl p-1 text-black" style={{ width: '70px', minWidth: '70px', maxWidth: '70px' }}></th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id}>
                <td 
                  className="rounded-l-2xl p-1 font-bold text-white text-center" 
                  style={{ backgroundColor: member.color }}
                >
                  {member.name}
                </td>

                {days.map((day, index) => (
                    <TaskCell
                      key={index}
                      memberId={member.id}
                      day={index}
                      tasks={tasks[member.id]?.filter(t => t.day === index) || []}
                      onAddTask={(text) => {
                        // If adding task for current user, use handleAddTask (local)
                        if (member.id === user?.uid) {
                          handleAddTask(member.id, index, text);
                        }
                        // If adding task for another user, use handleSuggestTask (local suggestion)
                        else {
                          handleSuggestTask(member.id, index, text);
                        }
                      }}
                      // Pass the global task handler
                      onAddGlobalTask={
                        member.id === user?.uid ? (text) => handleAddGlobalTask(member.id, index, text) : undefined
                      }
                      onUpdateTaskStatus={(taskId) => handleUpdateTaskStatus(member.id, taskId)}
                      onDeleteTask={(taskId) => handleDeleteTask(member.id, taskId)}
                      onEditTask={(taskId, newText) => handleEditTask(member.id, taskId, newText)}
                      onStartTimer={(taskId) => handleStartTaskTimer(member.id, taskId)}
                      onStopTimer={(taskId) => handleStopTaskTimer(member.id, taskId)}
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
                
                <td className="rounded-r-2xl p-1 text-center font-bold text-gray-100" style={{ width: '70px', minWidth: '70px', maxWidth: '70px', overflow: 'hidden', backgroundColor: member.color}}>
                  {scores[member.id]?.toFixed(2) || '0.00'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <BottomBar
        groupId={groupId}
        isStatView={isStatView}
        onStatView={onStatView}
        onToggleLeftSidebar={onToggleLeftSidebar}
        onToggleRightSidebar={onToggleRightSidebar}
      />
    </div>
  );
}
