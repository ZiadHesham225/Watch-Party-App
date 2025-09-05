import React, { useState, useEffect } from 'react';
import { Users, Clock, Lock, Play, Trash2 } from 'lucide-react';
import { Room } from '../../types/index';
import { roomService } from '../../services/roomService';
import Button from '../common/Button';
import Input from '../common/Input';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import signalRService from '../../services/signalRService';

const RoomList: React.FC = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [userRooms, setUserRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [passwordModal, setPasswordModal] = useState<{
    isOpen: boolean;
    roomId: string | null;
    password: string;
    isValidating: boolean;
    error: string | null;
  }>({
    isOpen: false,
    roomId: null,
    password: '',
    isValidating: false,
    error: null
  });
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRooms();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchRooms = async () => {
    try {
      setIsLoading(true);
      const [activeRooms, myRooms] = await Promise.all([
        roomService.getActiveRooms(),
        isAuthenticated ? roomService.getUserRooms() : Promise.resolve([])
      ]);
      
      setRooms(activeRooms);
      setUserRooms(myRooms);
    } catch (error: any) {
      toast.error('Failed to fetch rooms');
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinRoom = (room: Room) => {
    if (room.isPrivate) {
      // Show password modal for private rooms
      setPasswordModal({
        isOpen: true,
        roomId: room.id,
        password: '',
        isValidating: false,
        error: null
      });
    } else {
      // Direct join for public rooms
      navigate(`/room/${room.id}`);
    }
  };

  // Handle room deletion
  const handleDeleteRoom = async (roomId: string) => {
    if (!window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
      return;
    }

    try {
      await roomService.endRoom(roomId);
      toast.success('Room deleted successfully');
      
      // Immediately remove the room from both lists in state for instant UI update
      setRooms(prevRooms => {
        const filteredRooms = prevRooms.filter(room => room.id !== roomId);
        return filteredRooms;
      });
      
      setUserRooms(prevUserRooms => {
        const filteredUserRooms = prevUserRooms.filter(room => room.id !== roomId);
        return filteredUserRooms;
      });
      
      // Also refresh from backend after a longer delay to ensure backend consistency
      setTimeout(async () => {
        await fetchRooms();
      }, 1000);
    } catch (error) {
      toast.error('Failed to delete room');
    }
  };

  const handlePasswordSubmit = async () => {
    if (!passwordModal.password.trim() || !passwordModal.roomId) return;

    setPasswordModal(prev => ({ ...prev, isValidating: true, error: null }));

    try {
      // First, connect to SignalR if not connected
      if (!signalRService.getIsConnected()) {
        const token = localStorage.getItem('token');
        await signalRService.connect(token);
      }

      // Try to join the room with the password
      await signalRService.joinRoom(passwordModal.roomId, passwordModal.password);
      
      // If successful, store password and navigate
      const passwordData = {
        password: passwordModal.password,
        timestamp: Date.now(),
        isCreator: false
      };
      sessionStorage.setItem(`room_password_${passwordModal.roomId}`, JSON.stringify(passwordData));
      navigate(`/room/${passwordModal.roomId}`);
      
      // Close modal
      setPasswordModal({ 
        isOpen: false, 
        roomId: null, 
        password: '', 
        isValidating: false, 
        error: null 
      });
      
    } catch (error: any) {
      // Show error message for incorrect password
      const errorMessage = error?.message || 'Incorrect password. Please try again.';
      setPasswordModal(prev => ({ 
        ...prev, 
        isValidating: false, 
        error: errorMessage
      }));
      
      // Disconnect from SignalR on failure to clean up
      try {
        await signalRService.disconnect();
      } catch (disconnectError) {
      }
    }
  };

  const formatDate = (dateString: string | Date) => {
    const date = typeof dateString === 'string' ? new Date(dateString) : dateString;
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const RoomCard: React.FC<{ 
    room: Room; 
    showDeleteButton?: boolean; 
    onDelete?: (roomId: string) => void; 
  }> = ({ room, showDeleteButton = false, onDelete }) => (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
  {/* Removed video thumbnail as per backend update */}
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <h3 className="text-lg font-semibold text-gray-900 truncate">
            {room.name}
          </h3>
          {room.isPrivate && (
            <Lock className="w-4 h-4 text-gray-500 flex-shrink-0 ml-2" />
          )}
        </div>
        
  {/* Removed video title as per backend update */}
        
        <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <Users className="w-4 h-4 mr-1" />
              <span>{room.userCount}</span>
            </div>
            <div className="flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              <span>{formatDate(room.createdAt)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">by {room.adminName}</span>
          <div className="flex space-x-2">
            <Button
              size="sm"
              icon={Play}
              onClick={() => handleJoinRoom(room)}
            >
              Join
            </Button>
            {showDeleteButton && onDelete && (
              <Button
                size="sm"
                variant="outline"
                icon={Trash2}
                onClick={() => onDelete(room.id)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                Delete
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Watch Rooms</h2>
        {isAuthenticated && (
          <Button onClick={() => navigate('/create-room')}>
            Create Room
          </Button>
        )}
      </div>

      {isAuthenticated && (
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'all'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('all')}
            >
              All Rooms ({rooms.length})
            </button>
            <button
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'my'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              onClick={() => setActiveTab('my')}
            >
              My Rooms ({userRooms.length})
            </button>
          </nav>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(activeTab === 'all' ? rooms : userRooms).length === 0 ? (
          <div className="col-span-full text-center py-12">
            <Play className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">
              No rooms found
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {activeTab === 'all' 
                ? 'There are no active rooms at the moment.'
                : 'You haven\'t created any rooms yet.'
              }
            </p>
            {isAuthenticated && activeTab === 'my' && (
              <div className="mt-6">
                <Button onClick={() => navigate('/create-room')}>
                  Create your first room
                </Button>
              </div>
            )}
          </div>
        ) : (
          (activeTab === 'all' ? rooms : userRooms).map((room) => (
            <RoomCard 
              key={room.id} 
              room={room} 
              showDeleteButton={activeTab === 'my'}
              onDelete={activeTab === 'my' ? handleDeleteRoom : undefined}
            />
          ))
        )}
      </div>

      {/* Password Modal for Private Rooms */}
      {passwordModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium mb-4">Enter Room Password</h3>
            <p className="text-sm text-gray-600 mb-4">
              This is a private room. Please enter the password to join.
            </p>
            {passwordModal.error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{passwordModal.error}</p>
              </div>
            )}
            <Input
              type="password"
              placeholder="Room password"
              value={passwordModal.password}
              onChange={(e) => setPasswordModal(prev => ({ ...prev, password: e.target.value, error: null }))}
              className="mb-4"
              disabled={passwordModal.isValidating}
              onKeyPress={async (e) => {
                if (e.key === 'Enter' && !passwordModal.isValidating) {
                  await handlePasswordSubmit();
                }
              }}
            />
            <div className="flex justify-end space-x-3">
              <Button
                variant="secondary"
                onClick={() => setPasswordModal({ 
                  isOpen: false, 
                  roomId: null, 
                  password: '', 
                  isValidating: false, 
                  error: null 
                })}
                disabled={passwordModal.isValidating}
              >
                Cancel
              </Button>
              <Button
                onClick={handlePasswordSubmit}
                disabled={!passwordModal.password.trim() || passwordModal.isValidating}
              >
                {passwordModal.isValidating ? 'Validating...' : 'Join Room'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoomList;
