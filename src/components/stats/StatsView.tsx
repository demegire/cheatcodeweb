import React, { useState, useEffect } from 'react';
import TopBar from '../layout/TopBar';
import BottomBar from '../layout/BottomBar';
import { 
  Chart as ChartJS, 
  CategoryScale, 
  LinearScale, 
  PointElement,
  LineElement,
  BarElement, 
  Title, 
  Tooltip, 
  Legend 
} from "chart.js";
import { Bar, Line } from 'react-chartjs-2';
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { db } from '../../lib/firebase';
import { Task } from '../../types'
import { getISOWeek, getCurrentISOWeek, getDateFromISOWeek } from '../../lib/dateUtils';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

ChartJS.defaults.font.family = 'Arial';

interface StatsViewProps {
    groupID: string,
    groupName: string,
    members: { id: string; name: string; color: string }[];
    isStatView: boolean
    onStatView: () => void
    onToggleLeftSidebar?: () => void;
    onToggleRightSidebar?: () => void;
    isLeftSidebarCollapsed?: boolean;
    isRightSidebarCollapsed?: boolean;
}

export default function StatsView({
    groupID,
    groupName,
    members,
    isStatView,
    onStatView,
    onToggleLeftSidebar,
    onToggleRightSidebar,
    isLeftSidebarCollapsed,
    isRightSidebarCollapsed
}: StatsViewProps) {
  // State to store weekly completion rates for each user
  const [weeklyStats, setWeeklyStats] = useState<{
    weekLabels: string[],
    memberStats: Record<string, number[]>
  }>({
    weekLabels: [],
    memberStats: {}
  });

  const [yearlyStats, setYearlyStats] = useState<{
    memberNames: string[],
    uncplTasks: Record<string, number>,
    complTasks: Record<string, number>,
    rates: Record<string, number>,
  }>({
    memberNames: [],
    uncplTasks: {},
    complTasks: {},
    rates: {},
  })

  // Store raw task data
  const [groupTasks, setGroupTasks] = useState<Task[]>([]);
  const [userTasks, setUserTasks] = useState<Record<string, Task[]>>({});
  
  // Fetch tasks stored under the group
  useEffect(() => {
    if (!groupID) return;

    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-W01`;
    const yearEnd = `${currentYear}-W53`;

    const tasksRef = collection(db, 'groups', groupID, 'tasks');
    const q = query(tasksRef, where('weekId', '>=', yearStart), where('weekId', '<=', yearEnd));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasks: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate() || new Date()
      })) as Task[];
      setGroupTasks(tasks);
    });

    return () => unsubscribe();
  }, [groupID]);

  // Fetch global tasks stored under each user
  useEffect(() => {
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-W01`;
    const yearEnd = `${currentYear}-W53`;

    const unsubscribes: (() => void)[] = [];

    members.forEach(member => {
      const tasksRef = collection(db, 'users', member.id, 'tasks');
      const q = query(tasksRef, where('weekId', '>=', yearStart), where('weekId', '<=', yearEnd));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const tasks: Task[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as Task[];
        setUserTasks(prev => ({ ...prev, [member.id]: tasks }));
      });
      unsubscribes.push(unsubscribe);
    });

    return () => {
      unsubscribes.forEach(u => u());
    };
  }, [members]);

  // Recalculate stats whenever tasks change
  useEffect(() => {
    // Initialize data structure to hold all tasks by member and week
    const tasksByMemberAndWeek: Record<string, Record<string, Task[]>> = {};

    members.forEach(member => {
      tasksByMemberAndWeek[member.id] = {};
    });

    const weeksSet = new Set<string>();

    // Process group tasks
    groupTasks.forEach(task => {
      weeksSet.add(task.weekId);

      if (!tasksByMemberAndWeek[task.createdBy]) {
        tasksByMemberAndWeek[task.createdBy] = {};
      }

      if (!tasksByMemberAndWeek[task.createdBy][task.weekId]) {
        tasksByMemberAndWeek[task.createdBy][task.weekId] = [];
      }

      tasksByMemberAndWeek[task.createdBy][task.weekId].push(task);
    });

    // Process user global tasks
    Object.entries(userTasks).forEach(([userId, tasks]) => {
      tasks.forEach(task => {
        weeksSet.add(task.weekId);

        if (!tasksByMemberAndWeek[userId]) {
          tasksByMemberAndWeek[userId] = {};
        }

        if (!tasksByMemberAndWeek[userId][task.weekId]) {
          tasksByMemberAndWeek[userId][task.weekId] = [];
        }

        tasksByMemberAndWeek[userId][task.weekId].push(task);
      });
    });

    const existingWeeks = Array.from(weeksSet).sort();

    const allWeeks: string[] = [];
    if (existingWeeks.length > 0) {
      let currentWeek = existingWeeks[0];
      const maxWeek = existingWeeks[existingWeeks.length - 1];

      while (currentWeek <= maxWeek) {
        allWeeks.push(currentWeek);
        const date = getDateFromISOWeek(currentWeek);
        date.setDate(date.getDate() + 7);
        currentWeek = getISOWeek(date);
      }
    }

    if (allWeeks.length === 0) {
      setWeeklyStats({ weekLabels: [], memberStats: {} });
      setYearlyStats({ memberNames: [], uncplTasks: {}, complTasks: {}, rates: {} });
      return;
    }

    const memberStats: Record<string, number[]> = {};
    const memberNames: string[] = [];
    const uncplTasks: Record<string, number> = {};
    const complTasks: Record<string, number> = {};

    members.forEach(member => {
      memberStats[member.id] = Array(allWeeks.length).fill(0);
      memberNames.push(member.name);
      uncplTasks[member.id] = 0;
      complTasks[member.id] = 0;
    });

    allWeeks.forEach((week, weekIndex) => {
      members.forEach(member => {
        const weekTasks = tasksByMemberAndWeek[member.id][week] || [];

        if (weekTasks.length > 0) {
          const suggestedTasks = weekTasks.filter(t => t.suggestedBy != null);
          const totalTasks = weekTasks.length - suggestedTasks.length;
          if (totalTasks > 0) {
            const completedCount = weekTasks.filter(t => t.status === 'completed').length;
            const completionRate = (completedCount / totalTasks) * 100;
            memberStats[member.id][weekIndex] = completionRate;

            uncplTasks[member.id] += totalTasks - completedCount;
            complTasks[member.id] += completedCount;
          }
        }
      });
    });

    const weekLabels = allWeeks.map(week => {
      const weekDate = getDateFromISOWeek(week);
      return weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    const rates: Record<string, number> = {};
    members.forEach(member => {
      const total = complTasks[member.id] + uncplTasks[member.id];
      rates[member.id] = total === 0 ? 0 : complTasks[member.id] / total;
    });

    setWeeklyStats({ weekLabels, memberStats });
    setYearlyStats({ memberNames, uncplTasks, complTasks, rates });
  }, [groupTasks, userTasks, members]);
  
  // Line chart configuration
  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Weekly Task Completion Rates',
        color: 'black',
        font: {size: 24},
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        title: {
          display: true,
          text: 'Completion Rate (%)'
        }
      },
    }
  };
  
  // Prepare dataset for line chart
  const lineData = {
    labels: weeklyStats.weekLabels,
    datasets: members.map(member => ({
      label: member.name,
      data: weeklyStats.memberStats[member.id] || [],
      borderColor: member.color,
      backgroundColor: member.color,
      fill: false,
      pointRadius: 2,
      }))
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Yearly Task Totals',
        color: 'black',
        font: {size: 24},
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grace: '5%',
        title: {
          display: true,
          text: 'Number of tasks'
        },
        stacked: true,
      },
      x: {
        stacked: true,
        grid: {display: false}
      }
    }
  };

  const barData = {
    labels: yearlyStats.memberNames,
    datasets: [
      {
      label: 'Completed Tasks',
      data: members.map(member => (yearlyStats.complTasks[member.id])),
      backgroundColor: 'rgb(64, 219, 64)'
      },
      {
        label: 'Total Tasks',
        data: members.map(member => yearlyStats.uncplTasks[member.id]),
        backgroundColor: 'rgb(255, 53, 53)'
      }
    ]
  }
  
  // Sort members by yearly completion rate for the leaderboard
  const sortedMembers = members.slice().sort((a, b) => {
    const rateA = yearlyStats.rates[a.id] || 0;
    const rateB = yearlyStats.rates[b.id] || 0;
    return rateB - rateA; // Sort descending
  });

  return (
    <div className="flex flex-col h-screen overflow-y-auto p-4 pb-24 relative">
      <TopBar
        groupId={groupID}
        groupName={groupName}
        isStatView={isStatView}
        onStatView={onStatView}
        onToggleLeftSidebar={onToggleLeftSidebar}
        onToggleRightSidebar={onToggleRightSidebar}
      />

      {/* Charts */}
      <div className="grid flex-1 grid-rows-3 md:grid-rows-2 md:grid-cols-2">
        <div className="row-span-1 md:col-span-2 bg-gray-100 m-2 p-4 rounded-2xl">
          <Line options={lineOptions} data={lineData} />
        </div>
        <div className="bg-gray-100 m-2 p-4 rounded-2xl">
          <Bar options={barOptions} data={barData} />
        </div>
        <div className='flex flex-1 flex-col justify-start bg-gray-100 m-2 p-4 rounded-2xl overflow-auto'>
          {/* Leaderboard */}
          <div className='self-center text-2xl text-gray-800 font-bold mb-2  '>
            Leaderboard
          </div>
          <div>
            <table className='w-full text-gray-800 border-separate border-spacing-x-0 border-spacing-y-1'>
              <thead>
                <tr className=''>
                  <th className='rounded-tl-md bg-gray-300 p-0.5'>Rank</th>
                  <th className='bg-gray-300'>Name</th>
                  <th className='rounded-tr-md  bg-gray-300'>Score</th>
                </tr>
              </thead>
              <tbody>
                {sortedMembers.map((member, index) => (
                  <tr key={member.id} className=''>
                    <td className={`text-center rounded-l-md ${
                      index === 0 ? ('') :
                      index === 1 ? ('') :
                      index === 2 ? ('') :
                      ('')}`}>{index + 1}</td>
                    <td className={`text-center ${
                      index === 0 ? ('') :
                      index === 1 ? ('') :
                      index === 2 ? ('') :
                      ('')}`}>{member.name}</td>
                    <td className={`text-center rounded-r-md ${
                      index === 0 ? ('') :
                      index === 1 ? ('') :
                      index === 2 ? ('') :
                      ('')}`}>
                      {(yearlyStats.rates[member.id] * 100 || 0).toFixed(2)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <BottomBar
        groupId={groupID}
        isStatView={isStatView}
        onStatView={onStatView}
        onToggleLeftSidebar={onToggleLeftSidebar}
        onToggleRightSidebar={onToggleRightSidebar}
      />
    </div>
  );
}
