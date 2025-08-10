import React, { useState } from 'react';
import { nanoid } from 'nanoid';
import TaskCell from '../tracker/TaskCell';
import { Task } from '../../types';

export default function TaskDemoBox() {
  const today = new Date();
  const formattedDate = today.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });

  const members = [
    { id: 'alp', name: 'Alp', color: '#3B82F6' },
    { id: 'you', name: 'You', color: '#10B981' },
  ];

  const [tasks, setTasks] = useState<Record<string, Task[]>>({
    alp: [
      {
        id: nanoid(),
        text: 'Launch cheatcode',
        status: 'not-done',
        day: 0,
        createdBy: 'alp',
        createdAt: new Date(),
        weekId: 'demo',
      },
      {
        id: nanoid(),
        text: 'Birthday',
        status: 'not-done',
        day: 0,
        createdBy: 'alp',
        createdAt: new Date(),
        weekId: 'demo',
      },
    ],
    you: [],
  });

  const handleAddTask = (memberId: string, text: string) => {
    setTasks(prev => {
      const memberTasks = prev[memberId] || [];
      if (memberTasks.length >= 2) return prev;
      const newTask: Task = {
        id: nanoid(),
        text,
        status: 'not-done',
        day: 0,
        createdBy: memberId,
        createdAt: new Date(),
        weekId: 'demo',
        elapsedSeconds: 0,
        timerStartedAt: null,
      };
      return { ...prev, [memberId]: [...memberTasks, newTask] };
    });
  };

  const handleUpdateStatus = (memberId: string, taskId: string) => {
    setTasks(prev => ({
      ...prev,
      [memberId]: prev[memberId].map(t =>
        t.id === taskId
          ? { ...t, status: t.status === 'completed' ? 'not-done' : 'completed' }
          : t
      ),
    }));
  };

  const handleDeleteTask = (memberId: string, taskId: string) => {
    setTasks(prev => ({
      ...prev,
      [memberId]: prev[memberId].filter(t => t.id !== taskId),
    }));
  };

  const handleEditTask = (memberId: string, taskId: string, newText: string) => {
    setTasks(prev => ({
      ...prev,
      [memberId]: prev[memberId].map(t =>
        t.id === taskId ? { ...t, text: newText } : t
      ),
    }));
  };

  const handleStartTimer = (memberId: string, taskId: string) => {
    setTasks(prev => ({
      ...prev,
      [memberId]: prev[memberId].map(t =>
        t.id === taskId ? { ...t, timerStartedAt: new Date() } : t
      ),
    }));
  };

  const handleStopTimer = (memberId: string, taskId: string) => {
    setTasks(prev => ({
      ...prev,
      [memberId]: prev[memberId].map(t => {
        if (t.id === taskId && t.timerStartedAt) {
          const start = new Date(t.timerStartedAt).getTime();
          const now = Date.now();
          const elapsed = t.elapsedSeconds || 0;
          return {
            ...t,
            elapsedSeconds: elapsed + Math.floor((now - start) / 1000),
            timerStartedAt: null,
          };
        }
        return t;
      }),
    }));
  };

  const [currentTaskType, setCurrentTaskType] = useState<'local' | 'global'>('local');

  return (
    <div className="bg-white p-8 rounded-lg shadow-md max-w-xs w-full">
      <div className="text-center font-bold mb-4 text-black">{formattedDate}</div>
      <table className="border-separate border-spacing-x-1 border-spacing-y-2 w-full table-fixed">
        <tbody>
          {members.map(member => (
            <tr key={member.id}>
              <td
                className="rounded-l-2xl p-1 font-bold text-white text-center relative"
                style={{
                  backgroundColor: member.color,
                  width: '50px',
                  height: '80px',
                  boxShadow: '-10px 0 0 0 white',
                }}
              >
                <div
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 transform -rotate-90 break-words"
                  style={{
                    width: '80px',
                    maxHeight: '50px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: '2',
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {member.name}
                </div>
              </td>
              <TaskCell
                memberId={member.id}
                day={0}
                tasks={tasks[member.id] || []}
                onAddTask={text => handleAddTask(member.id, text)}
                onUpdateTaskStatus={taskId => handleUpdateStatus(member.id, taskId)}
                onDeleteTask={taskId => handleDeleteTask(member.id, taskId)}
                onEditTask={(taskId, newText) => handleEditTask(member.id, taskId, newText)}
                onStartTimer={taskId => handleStartTimer(member.id, taskId)}
                onStopTimer={taskId => handleStopTimer(member.id, taskId)}
                isCurrentUser={member.id === 'you'}
                members={members}
                currentUserId={'you'}
                currentTaskType={currentTaskType}
                onTaskTypeChange={setCurrentTaskType}
                minHeight={100}
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
