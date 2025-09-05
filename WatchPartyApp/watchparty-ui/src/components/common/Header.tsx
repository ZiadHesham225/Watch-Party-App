import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Home, Plus } from 'lucide-react';
import Button from './Button';

const Header: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex items-center">
            <h1 
              className="text-2xl font-bold text-blue-600 cursor-pointer hover:text-blue-700 transition-colors"
              onClick={() => navigate('/')}
            >
              WatchParty
            </h1>
          </div>

          {/* Navigation */}
          <nav className="flex items-center space-x-6">
            <Button
              variant="ghost"
              size="sm"
              icon={Home}
              onClick={() => navigate('/')}
              className="text-gray-600 hover:text-gray-900"
            >
              Home
            </Button>

            {isAuthenticated ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  icon={Plus}
                  onClick={() => navigate('/create-room')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Create Room
                </Button>
                
                {/* User Profile */}
                <div className="flex items-center space-x-4 ml-4 pl-4 border-l border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center overflow-hidden shadow-sm">
                      {user?.avatarUrl ? (
                        <img 
                          src={user.avatarUrl.startsWith('http') ? user.avatarUrl : `${process.env.REACT_APP_API_URL || 'https://localhost:7189'}${user.avatarUrl}`}
                          alt={user.displayName || user.username}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            const img = e.target as HTMLImageElement;
                            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTIwIDIxdi0yYTQgNCAwIDAgMC00LTRIOS02YTQgNCAwIDAgMC00IDR2MiIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+CjxjaXJjbGUgY3g9IjEyIiBjeT0iNyIgcj0iNCIgc3Ryb2tlPSJjdXJyZW50Q29sb3IiIHN0cm9rZS13aWR0aD0iMiIgc3Ryb2tlLWxpbmVjYXA9InJvdW5kIiBzdHJva2UtbGluZWpvaW49InJvdW5kIi8+Cjwvc3ZnPgo=';
                            img.className = "w-4 h-4 text-white";
                          }}
                        />
                      ) : (
                        <User className="w-4 h-4 text-white" />
                      )}
                    </div>
                    <span className="text-sm font-medium text-gray-700 hidden sm:block">
                      {user?.displayName || user?.username}
                    </span>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    icon={LogOut}
                    onClick={handleLogout}
                    className="text-gray-500 hover:text-red-600"
                  >
                    <span className="hidden sm:inline">Logout</span>
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/login')}
                  className="text-gray-600 hover:text-gray-900"
                >
                  Login
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/register')}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Sign Up
                </Button>
              </div>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
};

export default Header;
