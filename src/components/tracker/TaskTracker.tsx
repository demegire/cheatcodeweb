import React, { useState, useEffect } from 'react';
import { useAuth } from '../../lib/hooks/useAuth';
import { Task } from '../../types';
import TaskCell from './TaskCell';
import WeekNavigation from './WeekNavigation';
import GroupHeader from '../layout/GroupHeader';
import { collection, addDoc, updateDoc, doc, query, where, onSnapshot, deleteDoc } from 'firebase/firestore';
import { db } from '../../lib/firebase';
import { getCurrentISOWeek, getRelativeISOWeek, getDateFromISOWeek } from '../../lib/dateUtils';

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
  onWeekChange?: (weekId: string) => void; // Add this
}

export default function TaskTracker({ 
  groupId, 
  groupName, 
  members, 
  onGroupNameUpdate,
  onSelectTask,
  selectedTask,
  highlightedTaskId,
  onWeekChange
}: TaskTrackerProps) {
  const { user } = useAuth();
  const [currentISOWeek, setCurrentISOWeek] = useState(getCurrentISOWeek());
  const [tasks, setTasks] = useState<Record<string, Task[]>>({});
  const [scores, setScores] = useState<Record<string, number>>({});
  const [currentGroupName, setCurrentGroupName] = useState(groupName);
  
  
  const dayNames = getDayNames(currentISOWeek);

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
        const task = { id: doc.id, ...doc.data() } as Task;
        if (taskData[task.createdBy]) {
          taskData[task.createdBy].push(task);
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
    <div className="flex flex-col h-full">
      <GroupHeader groupName={groupName} groupId={groupId} onUpdateName={handleUpdateGroupName}/>
      
      <div className="flex-1 overflow-auto p-4">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="border p-2 bg-gray-50 text-gray-800">Person</th>
              {dayNames.map((day, index) => (
                <th key={index} className="border p-2 bg-gray-50 text-gray-800">{day}</th>
              ))}
              <th className="border p-2 bg-gray-50 text-gray-800">Score</th>
            </tr>
          </thead>
          <tbody>
            {members.map(member => (
              <tr key={member.id}>
                <td 
                  className="border border-black p-2 font-bold text-white text-center" 
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
                      // If adding task for current user, use handleAddTask
                      if (member.id === user?.uid) {
                        handleAddTask(member.id, day, text);
                      } 
                      // If adding task for another user, use handleSuggestTask
                      else {
                        handleSuggestTask(member.id, day, text);
                      }
                    }}
                    onUpdateTaskStatus={(taskId) => handleUpdateTaskStatus(member.id, taskId)}
                    onDeleteTask={(taskId) => handleDeleteTask(member.id, taskId)}
                    onEditTask={(taskId, newText) => handleEditTask(member.id, taskId, newText)}
                    isCurrentUser={member.id === user?.uid}
                    onSelectTask={onSelectTask ? (task) => onSelectTask(task) : undefined}
                    selectedTaskId={selectedTask?.id}
                    highlightedTaskId={highlightedTaskId}
                    onAcceptTask={(taskId) => handleAcceptTask(member.id, taskId)}
                    onRejectTask={(taskId) => handleRejectTask(member.id, taskId)}
                    members={members} // Pass all members to get color info for suggested tasks
                  />
                ))}
                
                <td className="border p-2 text-center font-bold text-gray-800 bg-white">
                  {scores[member.id]?.toFixed(2) || '0.00'}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <WeekNavigation 
        currentISOWeek={currentISOWeek}
        onPreviousWeek={handlePreviousWeek}
        onNextWeek={handleNextWeek}
      />
    </div>
  );
}