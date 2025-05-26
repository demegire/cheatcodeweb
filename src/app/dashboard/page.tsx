'use client';
import { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion } from 'firebase/firestore';
import ProfileSetup from '../../components/auth/ProfileSetup';
import MainLayout from '../../components/layout/MainLayout';
import TaskTracker from '../../components/tracker/TaskTracker';
import { Task } from '../../types';
import { getCurrentISOWeek } from '../../lib/dateUtils';
import { nanoid } from 'nanoid';
import StatsView from '../../components/stats/StatsView';

interface GroupData {
  id: string;
  name: string;
  members: {
    id: string;
    name: string;
    color: string;
  }[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [needsProfileSetup, setNeedsProfileSetup] = useState(false);
  const [groups, setGroups] = useState<GroupData[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<GroupData | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [currentISOWeek, setCurrentISOWeek] = useState(getCurrentISOWeek());
  const [isStatView, setStatView] = useState(false);


  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (!authUser) {
        // No user, redirect to login
        router.push('/');
        return;
      }
      
      setUser(authUser);
      
      // Check if profile is completed
      const userDoc = await getDoc(doc(db, 'users', authUser.uid));
      
      if (!userDoc.exists() || !userDoc.data().profileCompleted) {
        setNeedsProfileSetup(true);
        setLoading(false);
        return;
      } else {
        setNeedsProfileSetup(false);
      }
      
      // Fetch user's groups
      try {
        const userData = userDoc.data();
        const userGroups = userData.groups || [];
        
        if (userGroups.length === 0) {
          setLoading(false);
          return;
        }
        
        const groupsData: GroupData[] = [];
        
        for (const groupId of userGroups) {
          const groupDoc = await getDoc(doc(db, 'groups', groupId));
          
          if (groupDoc.exists()) {
            const groupData = groupDoc.data();
            
            groupsData.push({
              id: groupDoc.id,
              name: groupData.name,
              members: groupData.members || []
            });
          }
        }
        
        setGroups(groupsData);
        
        // Auto-select the first group if available
        if (groupsData.length > 0) {
          setSelectedGroup(groupsData[0]);
        }
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [router]);

    // Create a new group
    const handleCreateGroup = async () => {
        if (!user) return;
        
        try {
          // Generate a unique ID for the new group
          const groupId = nanoid(10);

          const userDoc = await getDoc(doc(db, 'users', user.uid));
          const userData = userDoc.data();
          const userColor = userData?.color || '#3498DB'; // Use user's color or default if not set
                    
          // Create new group document
          await setDoc(doc(db, 'groups', groupId), {
            name: `New Group (click to change)`,
            members: [
              {
                id: user.uid,
                name: userData?.displayName || 'User',
                color: userColor // Default color
              }
            ],
            createdBy: user.uid,
            createdAt: new Date()
          });
          
          // Update user's document to include this group
          await updateDoc(doc(db, 'users', user.uid), {
            groups: arrayUnion(groupId)
          });
          
          // Create the new group in local state
          const newGroup: GroupData = {
            id: groupId,
            name: `New Group (click to change)`,
            members: [
              {
                id: user.uid,
                name: userData?.displayName || 'User',
                color: userColor
              }
            ]
          };
          
          // Update state
          setGroups(prev => [...prev, newGroup]);
          setSelectedGroup(newGroup);
          
        } catch (error) {
          console.error("Error creating group:", error);
          alert("Failed to create group. Please try again.");
        }
      };



  // Handle group selection
  const handleGroupSelect = (group: GroupData) => {
    setSelectedGroup(group);
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!user) {
    return <div className="flex items-center justify-center min-h-screen">Redirecting to login...</div>;
  }

  if (needsProfileSetup) {
    return <ProfileSetup userId={user.uid} />;
  }

  const handleGroupNameUpdate = (groupId: string, newName: string) => {
    // Update the groups array with the new name
    setGroups(prevGroups => 
      prevGroups.map(group => 
        group.id === groupId 
          ? { ...group, name: newName } 
          : group
      )
    );
    
    // If this is the selected group, update that too
    if (selectedGroup?.id === groupId) {
      setSelectedGroup(prev => prev ? { ...prev, name: newName } : null);
    }
  };

  const handleStatButtonPress = () => {
    setStatView(!isStatView)

  }

  // No groups available
  if (groups.length === 0) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center h-full p-8">
          <h1 className="text-2xl font-bold mb-4">No Groups Found</h1>
          <p className="text-gray-600 mb-8">You are not a member of any groups yet.</p>
          <button 
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            onClick={handleCreateGroup}
          >
            Create New Group
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout 
      groups={groups}
      selectedGroup={selectedGroup}
      onGroupSelect={handleGroupSelect}
      onCreateGroup={handleCreateGroup}
      groupId={selectedGroup?.id}
      currentWeekId={currentISOWeek}
      selectedTask={selectedTask}
      onSelectTask={setSelectedTask}
      > 
      {selectedGroup && !isStatView && (
        <TaskTracker
        groupId={selectedGroup?.id || ''}
        groupName={selectedGroup?.name || ''}
        members={selectedGroup?.members || []}
        onGroupNameUpdate={handleGroupNameUpdate}
        onSelectTask={setSelectedTask}
        selectedTask={selectedTask}
        onWeekChange={setCurrentISOWeek}
        isStatView={isStatView}
        onStatView={handleStatButtonPress}
      />
      )}
      {selectedGroup && isStatView && (
        <StatsView
        groupID={selectedGroup?.id || ''}
        groupName={selectedGroup?.name || ''}
        members = {selectedGroup?.members || []}
        isStatView={isStatView}
        onStatView={handleStatButtonPress}
        />
      )}
    </MainLayout>
  );
}