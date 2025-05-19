import React, { useState, useEffect } from 'react';
import StatButton from '../layout/StatsButton';
import ShareButton from '../layout/ShareButton';
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
}

export default function StatsView({
    groupID,
    groupName,
    members,
    isStatView,
    onStatView
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
  
  useEffect(() => {
    if (!groupID) return;
    
    // Calculate current year for filtering
    const currentYear = new Date().getFullYear();
    const yearStart = `${currentYear}-W01`;
    const yearEnd = `${currentYear}-W53`; // Using W53 to ensure we capture all weeks
    
    // Reference to tasks collection
    const tasksRef = collection(db, 'groups', groupID, 'tasks');
    
    // Query tasks for the current year
    const q = query(
      tasksRef,
      where('weekId', '>=', yearStart),
      where('weekId', '<=', yearEnd)
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // Initialize data structure to hold all tasks by member and week
      const tasksByMemberAndWeek: Record<string, Record<string, Task[]>> = {};
      
      // Initialize for all members
      members.forEach(member => {
        tasksByMemberAndWeek[member.id] = {};
      });
      
      // Collect all weeks present in the data
      const weeksSet = new Set<string>();
      
      // Process all tasks from the snapshot
      snapshot.forEach(doc => {
        const task = { 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Task;
        
        // Add the week to our set of weeks
        weeksSet.add(task.weekId);
        
        // Ensure the member exists in our structure
        if (!tasksByMemberAndWeek[task.createdBy]) {
          tasksByMemberAndWeek[task.createdBy] = {};
        }
        
        // Ensure the week exists for this member
        if (!tasksByMemberAndWeek[task.createdBy][task.weekId]) {
          tasksByMemberAndWeek[task.createdBy][task.weekId] = [];
        }
        
        // Add the task to the appropriate member and week
        tasksByMemberAndWeek[task.createdBy][task.weekId].push(task);
      });
      
      // Convert the set of weeks to a sorted array
      const existingWeeks = Array.from(weeksSet).sort();
      
      // Generate all weeks in the range
      const allWeeks: string[] = [];
      if (existingWeeks.length > 0) {
        // Find min and max weeks from the data
        const minWeek = existingWeeks[0];
        const maxWeek = existingWeeks[existingWeeks.length - 1];
        
        const [minYear, minWeekNum] = minWeek.split('-W').map(Number);
        const [maxYear, maxWeekNum] = maxWeek.split('-W').map(Number);
        
        // Generate all weeks between min and max
        let currentWeek = minWeek;
        while (currentWeek <= maxWeek) {
          allWeeks.push(currentWeek);
          // Move to next week
          const date = getDateFromISOWeek(currentWeek);
          date.setDate(date.getDate() + 7); // Add 7 days
          currentWeek = getISOWeek(date);
        }
      }
      
      // If no data, return empty
      if (allWeeks.length === 0) {
        setWeeklyStats({
          weekLabels: [],
          memberStats: {}
        });
        return;
      }
      
      // Initialize the stats object for all members
      const memberStats: Record<string, number[]> = {};
      members.forEach(member => {
        memberStats[member.id] = Array(allWeeks.length).fill(0);
      });

      // Initialize yearly stats object
      const memberNames: string[] = [];
      const uncplTasks: Record<string, number> = {};
      const complTasks: Record<string, number> = {};
      members.forEach(member => {
        memberNames.push(member.name);
        uncplTasks[member.id] = 0;
        complTasks[member.id] = 0;
      })
      
      // Calculate completion rate for each member for each week
      allWeeks.forEach((week, weekIndex) => {
        members.forEach(member => {
          const weekTasks = tasksByMemberAndWeek[member.id][week] || [];
          
          if (weekTasks.length > 0) {
            const suggestedTasks = weekTasks.filter(t => t.suggestedBy != null)
            const totalTasks = weekTasks.length - suggestedTasks.length;
            const completedCount = weekTasks.filter(t => t.status === 'completed').length;
            const completionRate = (completedCount / totalTasks) * 100;
            memberStats[member.id][weekIndex] = completionRate;

            uncplTasks[member.id] = uncplTasks[member.id] + (totalTasks - completedCount);
            complTasks[member.id] = complTasks[member.id] + completedCount;
          }
          // If no tasks, rate remains 0 from our fill(0) initialization
        });
      });
      
      // Format week labels as dates (first day of each week)
      const weekLabels = allWeeks.map(week => {
        const weekDate = getDateFromISOWeek(week);
        return weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      });

      // Calculate total yearly rates
      const rates: Record<string, number> = {};

      members.forEach( member => {
        rates[member.id] = complTasks[member.id] / (complTasks[member.id] + uncplTasks[member.id]);
      })
      
      setWeeklyStats({
        weekLabels,
        memberStats
      });
      setYearlyStats({
        memberNames,
        uncplTasks,
        complTasks,
        rates
      })
    });
    
    return () => unsubscribe();
  }, [groupID, members]);
  
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
        font: {size: 18},
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
        font: {size: 18},
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
      }
    }
  };

  const barData = {
    labels: yearlyStats.memberNames,
    datasets: [
      {
      label: 'Completed Tasks',
      data: members.map(member => (yearlyStats.complTasks[member.id])),
      backgroundColor: 'rgba(0, 255, 0, 60)'
      },
      {
        label: 'Total Tasks',
        data: members.map(member => yearlyStats.uncplTasks[member.id]),
        backgroundColor: 'rgba(255, 0, 0, 60)'
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
    <div className="flex flex-col h-full overflow-hidden p-4 relative">
        <div className="flex justify-between items-center mb-3 relative">
            {/* Left section: Group name */}
            <div className="py-2 flex justify-center items-center">
                <h1 
                className="text-2xl text-gray-800 font-bold cursor-pointer"
                >{groupName}</h1>
            </div>
            {/* Right section: Share button */}
            <div className="flex gap-4">
                <div>
                <StatButton isStatView={isStatView} onStatView={onStatView} />
                </div>
                <div>
                <ShareButton groupId={groupID} />
                </div>
            </div>        rate;

        </div>
        <div className="flex-1">
          <Line options={lineOptions} data={lineData}/>
        </div>
        <div className="flex flex-1">
          <div className='flex-1'>
            {/*Bar chart*/}
            <Bar options={barOptions} data={barData}/>
          </div>
          <div className='flex flex-1 flex-col justify-center'>
            {/* Leaderboard */}
            <div className='flex justify-center text-xl text-gray-800 font-bold mb-2  '>
              <h5 className='text-gray-800'>Leaderboard</h5>
            </div>
            <div>
              <table className='w-full text-gray-800 border-collapse'>
                <thead>
                  <tr>
                    <th className='border'>Rank</th>
                    <th className='border'>Name</th>
                    <th className='border'>Score</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedMembers.map((member, index) => (
                    <tr key={member.id}>
                      <td className='border text-center'>{index + 1}</td>
                      <td className='border text-center'>{member.name}</td>
                      <td className='border text-center'>
                        {(yearlyStats.rates[member.id] * 100 || 0).toFixed(2)}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
    </div>
  );
}