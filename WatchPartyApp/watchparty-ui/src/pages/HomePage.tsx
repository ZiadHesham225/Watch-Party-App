import React, { useState } from 'react';
import { Plus, LogIn } from 'lucide-react';
import Header from '../components/common/Header';
import RoomList from '../components/room/RoomList';
import CreateRoomForm from '../components/room/CreateRoomForm';
import JoinRoomForm from '../components/room/JoinRoomForm';
import Button from '../components/common/Button';

const HomePage: React.FC = () => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showJoinForm, setShowJoinForm] = useState(false);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Watch Together, Stay Connected
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
            Create or join watch rooms to enjoy videos with friends in real-time. 
            Chat, sync playback, and share the experience no matter where you are.
          </p>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-center gap-4 mb-12">
            <Button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center justify-center px-8 py-3 text-lg"
            >
              <Plus className="w-5 h-5 mr-2" />
              Create Room
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowJoinForm(true)}
              className="flex items-center justify-center px-8 py-3 text-lg"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Join with Code
            </Button>
          </div>
        </div>
        
        {/* Browse Public Rooms Section */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Browse Public Rooms
          </h2>
          <RoomList />
        </div>
      </main>

      {/* Modals */}
      {showCreateForm && (
        <CreateRoomForm onClose={() => setShowCreateForm(false)} />
      )}
      {showJoinForm && (
        <JoinRoomForm onClose={() => setShowJoinForm(false)} />
      )}
    </div>
  );
};

export default HomePage;
