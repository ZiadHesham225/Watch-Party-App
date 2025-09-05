import React from 'react';
import Header from '../components/common/Header';
import CreateRoomForm from '../components/room/CreateRoomForm';
import ProtectedRoute from '../components/common/ProtectedRoute';

const CreateRoomPage: React.FC = () => {
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <CreateRoomForm />
        </main>
      </div>
    </ProtectedRoute>
  );
};

export default CreateRoomPage;
