'use client';
import { User } from 'firebase/auth';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '../../lib/firebase';
import { doc, getDoc, setDoc, updateDoc, arrayUnion, arrayRemove, deleteField, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import ProfileSetup from '../../components/auth/ProfileSetup';
import MainLayout from '../../components/layout/MainLayout';
import TaskTracker from '../../components/tracker/TaskTracker';
import { Task } from '../../types';
import { getCurrentISOWeek } from '../../lib/dateUtils';
import { nanoid } from 'nanoid';
import StatsView from '../../components/stats/StatsView';
import ConfirmModal from '../../components/modals/ConfirmModal';
import TutorialModal from '../../components/modals/TutorialModal';
import { PlusIcon } from '@heroicons/react/24/outline';

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
  const [groupToLeave, setGroupToLeave] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [pinnedGroupId, setPinnedGroupId] = useState<string | null>(null);
  const tutorialSlides = [
    {
      image: '/slide1.png',
      text: 'Welcome! Hover over a day to add your first task...',
    },
    {
      image: '/slide2.png',
      text: 'Mark your tasks by clicking on the status button...',
    },
    {
      image: '/slide3.png',
      text: 'Hover over tasks to time, edit and delete...',
    },
    {
      image: '/slide4.png',
      text: 'Invite your friends by sending them an invite link...',
    },
    {
      image: '/slide5.png',
      text: 'Suggest tasks to friends and tap on them to comment...',
    },
    {
      image: '/slide6.png',
      text: 'Click on Stats to see who works the most...',
    },
    {
      image: '/slide7.png',
      text: ' And open the left sidebar to manage your groups.',
    },
    {
      image: '/android-chrome-512x512.png',
      text: "That's it! Have fun using cheat-code.cc!",
    }
  ];


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

      const userData = userDoc.data();
      if (!userData.tutorialSeen) {
        setShowTutorial(true);
      }
      setPinnedGroupId(userData.pinnedGroup || null);

      // Fetch user's groups
      try {
        const userGroups = userData.groups || [];
        
        if (userGroups.length === 0) {
          setLoading(false);
          return;
        }
        
        const groupsData: GroupData[] = [];

        for (const groupId of userGroups) {
          const groupDocSnap = await getDoc(doc(db, 'groups', groupId));

          if (groupDocSnap.exists()) {
            const groupData = groupDocSnap.data();

            const memberUids: Record<string, boolean> = groupData.memberUids || {};
            const memberColors: Record<string, string> = groupData.memberColors || {};
            // Skip groups where current user is marked as not a member
            if (!memberUids[authUser.uid]) continue;

            const members: { id: string; name: string; color: string }[] = [];
            const me = authUser.uid;

            // 1️⃣ Add me first (if I’m in this group)
            if (memberUids[me]) {
              const meSnap = await getDoc(doc(db, 'users', me));
              if (meSnap.exists()) {
                const { displayName, color } = meSnap.data();
                members.push({
                  id: me,
                  name: displayName || 'You',
                  color: memberColors[me] || color || '#3B82F6'
                });
              }
            }

            // 2️⃣ Then add everyone else
            for (const uid of Object.keys(memberUids)) {
              if (uid === me || !memberUids[uid]) continue;
              const memberSnap = await getDoc(doc(db, 'users', uid));
              if (memberSnap.exists()) {
                const { displayName, color } = memberSnap.data();
                members.push({
                  id: uid,
                  name: displayName || 'User',
                  color: memberColors[uid] || color || '#3B82F6'
                });
              }
            }

            groupsData.push({
              id: groupDocSnap.id,
              name: groupData.name,
              members
            });
          }
        }
        
        if (userData.pinnedGroup) {
          groupsData.sort((a, b) => (a.id === userData.pinnedGroup ? -1 : b.id === userData.pinnedGroup ? 1 : 0));
        }

        setGroups(groupsData);

        // Auto-select pinned group if available, otherwise first group
        if (groupsData.length > 0) {
          const initial = groupsData.find(g => g.id === userData.pinnedGroup) || groupsData[0];
          setSelectedGroup(initial);
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
            memberUids: {
              [user.uid]: true
            },
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

  const handleLeaveGroup = async () => {
        if (!user || !groupToLeave) return;
        const groupId = groupToLeave;

        try {
          await updateDoc(doc(db, 'groups', groupId), {
            [`memberUids.${user.uid}`]: false,
            [`memberColors.${user.uid}`]: deleteField()
          });

          const tasksRef = collection(db, 'groups', groupId, 'tasks');
          const q = query(tasksRef, where('createdBy', '==', user.uid));
          const snapshot = await getDocs(q);
          await Promise.all(snapshot.docs.map(docSnap => deleteDoc(docSnap.ref)));

          const updates: Record<string, any> = {
            groups: arrayRemove(groupId),
            deletedGroups: arrayUnion(groupId)
          };
          if (pinnedGroupId === groupId) {
            updates.pinnedGroup = deleteField();
            setPinnedGroupId(null);
          }

          await updateDoc(doc(db, 'users', user.uid), updates);

          setGroups(prev => {
            const updated = prev.filter(g => g.id !== groupId);
            if (selectedGroup?.id === groupId) {
              setSelectedGroup(updated[0] || null);
            }
            return updated;
          });
        } catch (error) {
          console.error('Error leaving group:', error);
        } finally {
          setGroupToLeave(null);
        }
  };

  const promptLeaveGroup = (groupId: string) => {
    setGroupToLeave(groupId);
  };

  const handlePinGroup = async (groupId: string) => {
    if (!user) return;
    try {
      if (pinnedGroupId === groupId) {
        await updateDoc(doc(db, 'users', user.uid), { pinnedGroup: deleteField() });
        setPinnedGroupId(null);
      } else {
        await updateDoc(doc(db, 'users', user.uid), { pinnedGroup: groupId });
        setPinnedGroupId(groupId);
        setGroups(prev => {
          const updated = [...prev];
          updated.sort((a, b) => (a.id === groupId ? -1 : b.id === groupId ? 1 : 0));
          return updated;
        });
      }
    } catch (error) {
      console.error('Error pinning group:', error);
    }
  };

  const handleMemberColorChange = (memberId: string, color: string) => {
    setGroups(prev =>
      prev.map(g =>
        g.id === selectedGroup?.id
          ? { ...g, members: g.members.map(m => (m.id === memberId ? { ...m, color } : m)) }
          : g
      )
    );
    setSelectedGroup(prev =>
      prev ? { ...prev, members: prev.members.map(m => (m.id === memberId ? { ...m, color } : m)) } : prev
    );
  };

  const handleFinishTutorial = async () => {
    setShowTutorial(false);
    if (user) {
      await updateDoc(doc(db, 'users', user.uid), { tutorialSeen: true });
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
            className="bg-theme text-white px-4 py-2 rounded-full hover:bg-theme-hover flex items-center"
            onClick={handleCreateGroup}
          >
            <PlusIcon className="mr-1 h-6 w-6 text-white" />
            Create New Group
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <>
      {showTutorial && (
        <TutorialModal
          slides={tutorialSlides}
          onFinish={handleFinishTutorial}
        />
      )}
      <MainLayout
        groups={groups}
        selectedGroup={selectedGroup}
        onGroupSelect={handleGroupSelect}
        onCreateGroup={handleCreateGroup}
        onLeaveGroup={promptLeaveGroup}
        onPinGroup={handlePinGroup}
        pinnedGroupId={pinnedGroupId}
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
          onMemberColorChange={handleMemberColorChange}
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

      {groupToLeave && (
        <ConfirmModal
          title="Leave group?"
          message="Are you sure you want to leave this group?"
          confirmText="Leave"
          cancelText="Cancel"
          onConfirm={handleLeaveGroup}
          onCancel={() => setGroupToLeave(null)}
        />
      )}
    </>
  );
}
