import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import Button from '../common/Button';
import Input from '../common/Input';
import { roomService } from '../../services/roomService';
import signalRService from '../../services/signalRService';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

interface JoinRoomFormProps {
  onClose: () => void;
}

const JoinRoomForm: React.FC<JoinRoomFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    inviteCode: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [requiresPassword, setRequiresPassword] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // First try to get room info by invite code
      const roomInfo = await roomService.getRoomByInviteCode(formData.inviteCode);
      
      if (roomInfo.data.isPrivate && !requiresPassword) {
        setRequiresPassword(true);
        setIsLoading(false);
        return;
      }

      // Only authenticated users can join rooms
      if (!user) {
        toast.error('Please log in to join a room');
        setIsLoading(false);
        return;
      }

      // Join the room via SignalR
      const displayName = user.displayName || user.email;
      
      // Check if SignalR is connected before attempting to join
      if (!signalRService.getIsConnected()) {
        // Try to connect first
        const token = localStorage.getItem('token');
        await signalRService.connect(token);
      }
      
      await signalRService.joinRoom(
        roomInfo.data.id,
        formData.password || undefined
      );
      
      // Set flag to indicate we already joined via this form
      sessionStorage.setItem('joinedRoom', roomInfo.data.id);
      
      toast.success('Joined room successfully!');
      onClose();
      navigate(`/room/${roomInfo.data.id}`);
    } catch (error: any) {
      if (error.message?.includes('password')) {
        setRequiresPassword(true);
        toast.error('Password required for this private room');
      } else {
        toast.error('Failed to join room. Check your invite code.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Join Room</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Invite Code"
              type="text"
              name="inviteCode"
              value={formData.inviteCode}
              onChange={handleChange}
              required
              placeholder="Enter room invite code"
            />

            {requiresPassword && (
              <Input
                label="Room Password"
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                placeholder="Enter room password"
              />
            )}

            <div className="flex space-x-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50 inline-flex items-center justify-center"
                disabled={isLoading}
              >
                <LogIn className="w-4 h-4 mr-2" />
                {isLoading ? 'Joining...' : 'Join Room'}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600 text-center">
              Don't have an invite code? Browse public rooms below or ask a friend to share their room code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JoinRoomForm;
