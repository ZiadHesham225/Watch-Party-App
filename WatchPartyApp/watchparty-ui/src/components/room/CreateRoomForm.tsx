import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Video, Lock } from 'lucide-react';
import { roomService } from '../../services/roomService';
import { RoomCreateRequest } from '../../types/index';
import Input from '../common/Input';
import Button from '../common/Button';
import toast from 'react-hot-toast';

interface CreateRoomFormProps {
  onClose?: () => void;
}

const CreateRoomForm: React.FC<CreateRoomFormProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<RoomCreateRequest>({
    name: '',
    videoUrl: '',
    isPrivate: false,
    password: '',
    autoPlay: true,
    syncMode: 'strict'
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const response = await roomService.createRoom(formData);
      console.log('Create room response:', response); // Debug log
      toast.success('Room created successfully!');
      
      // Backend returns { Id, Name, InviteCode, InviteLink } with capitalized Id
      const roomId = response.Id || response.id;
      if (roomId) {
        // If this is a private room, store the password for the creator
        if (formData.isPrivate && formData.password) {
          // Store with timestamp for cleanup later
          const passwordData = {
            password: formData.password,
            timestamp: Date.now(),
            isCreator: true
          };
          sessionStorage.setItem(`room_password_${roomId}`, JSON.stringify(passwordData));
        }
        navigate(`/room/${roomId}`);
      } else {
        toast.error('Room created but could not navigate to it');
      }
    } catch (error: any) {
      toast.error(error.message || 'Failed to create room');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const isFormValid = formData.name; // Only require name, video URL is optional

  const formContent = (
    <form onSubmit={handleSubmit} className="space-y-4 p-6">
      <Input
        label="Room Name"
        name="name"
        value={formData.name}
        onChange={handleChange}
        placeholder="Give your room a catchy name"
        required
      />
      <Input
        label="Video URL (Optional)"
        type="url"
        name="videoUrl"
        value={formData.videoUrl}
        onChange={handleChange}
        icon={Video}
        placeholder="https://youtube.com/watch?v=... or direct video URL (leave empty to choose later)"
      />
      <div className="flex items-center">
        <input
          type="checkbox"
          id="isPrivate"
          name="isPrivate"
          checked={formData.isPrivate}
          onChange={handleChange}
          className="mr-2"
        />
        <label htmlFor="isPrivate" className="text-sm">Private Room</label>
      </div>
      {formData.isPrivate && (
        <Input
          label="Password"
          type="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          icon={Lock}
          required
        />
      )}
      <div className="flex items-center">
        <input
          type="checkbox"
          id="autoPlay"
          name="autoPlay"
          checked={formData.autoPlay}
          onChange={handleChange}
          className="mr-2"
        />
        <label htmlFor="autoPlay" className="text-sm">Auto-play video on join</label>
      </div>
      <div className="flex flex-col">
        <label htmlFor="syncMode" className="text-sm mb-1">Sync Mode</label>
        <select
          id="syncMode"
          name="syncMode"
          value={formData.syncMode}
          onChange={handleChange}
          className="border rounded px-2 py-1"
        >
          <option value="strict">Strict - Force sync all participants</option>
          <option value="loose">Loose - Allow small differences</option>
          <option value="manual">Manual - Users control their own playback</option>
        </select>
      </div>
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={() => onClose ? onClose() : navigate('/')}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          isLoading={isLoading}
          disabled={!isFormValid}
        >
          Create Room
        </Button>
      </div>
    </form>
  );

  return onClose ? (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      {formContent}
    </div>
  ) : (
    <div className="max-w-2xl mx-auto py-8">
      {formContent}
    </div>
  );
};

export default CreateRoomForm;