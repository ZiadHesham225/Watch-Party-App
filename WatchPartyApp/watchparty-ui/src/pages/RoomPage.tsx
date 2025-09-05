import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Copy, Check } from 'lucide-react';
import { RoomDetail, ChatMessage, RoomParticipant, PlaybackState} from '../types/index';
import { useAuth } from '../contexts/AuthContext';
import { apiService } from '../services/api';
import signalRService from '../services/signalRService';
import Header from '../components/common/Header';
import VideoPlayer from '../components/room/VideoPlayer';
import ChatPanel from '../components/room/ChatPanel';
import ParticipantsList from '../components/room/ParticipantsList';
import AuthModal from '../components/auth/AuthModal';

const RoomPage: React.FC = () => {
    const { id: roomId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAuthenticated, isLoading: authLoading } = useAuth();
    
    const [roomData, setRoomData] = useState<RoomDetail | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [participants, setParticipants] = useState<RoomParticipant[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [currentUserHasControl, setCurrentUserHasControl] = useState(false);
    const [showAuthModal, setShowAuthModal] = useState(false);
    const [isCopied, setIsCopied] = useState(false);
    
    // Video state
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentPosition, setCurrentPosition] = useState(0);
    const [videoDuration, setVideoDuration] = useState(0);

    useEffect(() => {
        // Wait for auth to finish loading
        if (authLoading) {
            return;
        }
        
        // Check authentication after loading is complete
        if (!isAuthenticated) {
            setLoading(false);
            setShowAuthModal(true);
            return;
        }

        const initializeRoom = async () => {
            if (!roomId || !user) {
                setError('Missing room ID or user information');
                setLoading(false);
                return;
            }

            try {
                // Get room details
                const response = await apiService.get<RoomDetail>(`/api/room/${roomId}`);
                setRoomData(response);
                
                // Check if room detail includes participants and set control status accordingly
                if (response.participants && response.participants.length > 0) {
                    const currentUserParticipant = response.participants.find(p => p.id === user.id);
                    if (currentUserParticipant) {
                        setCurrentUserHasControl(currentUserParticipant.hasControl);
                        // Also set the participants state
                        const mappedParticipants = response.participants.map(p => ({
                            ...p,
                            avatarUrl: p.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${p.displayName}`
                        }));
                        setParticipants(mappedParticipants);
                    } else {
                        // If not found in participants, default to admin control
                        setCurrentUserHasControl(response.adminId === user.id);
                    }
                } else {
                    // Initially, only the admin has control (unless specified otherwise in the response)
                    setCurrentUserHasControl(response.adminId === user.id);
                }
                
                // Initialize video state from room data
                setIsPlaying(response.isPlaying || false);
                setCurrentPosition(response.currentPosition || 0);

                // Connect to SignalR if not already connected
                if (!signalRService.getIsConnected()) {
                    const token = localStorage.getItem('token');
                    await signalRService.connect(token);
                }

                // Always attempt to join the room (even if already connected)
                // The backend will handle if user is already in the room
                // Check if there's a password stored for this room (from private room flow or creation)
                const storedPasswordData = sessionStorage.getItem(`room_password_${roomId}`);
                let password = null;
                
                if (storedPasswordData) {
                    try {
                        const parsed = JSON.parse(storedPasswordData);
                        // Check if password is not too old (24 hours for creators, 1 hour for others)
                        const maxAge = parsed.isCreator ? 24 * 60 * 60 * 1000 : 60 * 60 * 1000;
                        if (Date.now() - parsed.timestamp < maxAge) {
                            password = parsed.password;
                        } else {
                            sessionStorage.removeItem(`room_password_${roomId}`);
                        }
                    } catch (e) {
                        // Old format - just use as string
                        password = storedPasswordData;
                    }
                }
                
                try {
                    if (password) {
                        await signalRService.joinRoom(roomId, password);
                    } else {
                        await signalRService.joinRoom(roomId);
                    }
                } catch (joinError: any) {
                    // If this is a private room and we don't have a password, redirect to room list
                    if (joinError.message?.includes('Incorrect password') || joinError.message?.includes('password')) {
                        toast.error('This private room requires a password. Please join from the room list.');
                        navigate('/dashboard');
                        return;
                    }
                    
                    // For other errors, still try to continue
                }
                
                // Load chat history
                try {
                    const chatHistory = await apiService.get<ChatMessage[]>(`/api/room/${roomId}/messages`);
                    if (chatHistory && chatHistory.length > 0) {
                        setMessages(chatHistory);
                        toast(`📜 Loaded ${chatHistory.length} previous messages`, {
                            duration: 2000,
                            style: {
                                background: '#f3f4f6',
                                color: '#374151',
                                border: '1px solid #d1d5db'
                            }
                        });
                    }
                } catch (error) {
                    // Don't fail the entire room load if chat history fails
                }
                
                setLoading(false);
            } catch (error: any) {
                setError(error.message || 'Failed to load room');
                setLoading(false);
            }
        };

        if (roomId && user && isAuthenticated && !authLoading) {
            initializeRoom();
        }
    }, [roomId, user, isAuthenticated, authLoading]);

    // Set up SignalR event handlers
    useEffect(() => {
        const originalOnReceiveMessage = signalRService.onReceiveMessage;
        const originalOnUserJoined = signalRService.onUserJoined;
        const originalOnUserLeft = signalRService.onUserLeft;
        const originalOnReceivePlaybackState = signalRService.onReceivePlaybackState;
        const originalOnUserKicked = signalRService.onUserKicked;
        const originalOnReceiveRoomParticipants = signalRService.onReceiveRoomParticipants;

        signalRService.onReceiveMessage = (message: ChatMessage) => {
            setMessages(prev => {
                // Check if message already exists to prevent duplicates
                if (prev.find(m => m.id === message.id)) {
                    return prev;
                }
                return [...prev, message];
            });
        };

        signalRService.onUserJoined = (displayName: string) => {
            // Add system message for user join
            const systemMessage: ChatMessage = {
                id: `system-join-${Date.now()}-${Math.random()}`, // Add random component to ensure uniqueness
                senderId: 'system',
                roomId: roomId || '',
                senderName: 'System',
                avatarUrl: '',
                content: `${displayName} joined the room`,
                timestamp: Date.now(),
                sentAt: new Date().toISOString()
            };
            setMessages(prev => {
                // Check for recent duplicate system messages (within last 5 seconds)
                const recentJoinMessages = prev.filter(m => 
                    m.senderId === 'system' && 
                    m.content.includes(`${displayName} joined the room`) &&
                    Date.now() - m.timestamp < 5000
                );
                if (recentJoinMessages.length > 0) {
                    return prev;
                }
                return [...prev, systemMessage];
            });
        };

        signalRService.onUserLeft = (displayName: string) => {
            // Add system message for user leave
            const systemMessage: ChatMessage = {
                id: `system-leave-${Date.now()}-${Math.random()}`, // Add random component to ensure uniqueness
                senderId: 'system',
                roomId: roomId || '',
                senderName: 'System',
                avatarUrl: '',
                content: `${displayName} left the room`,
                timestamp: Date.now(),
                sentAt: new Date().toISOString()
            };
            setMessages(prev => {
                // Check for recent duplicate system messages (within last 5 seconds)
                const recentLeftMessages = prev.filter(m => 
                    m.senderId === 'system' && 
                    m.content.includes(`${displayName} left the room`) &&
                    Date.now() - m.timestamp < 5000
                );
                if (recentLeftMessages.length > 0) {
                    return prev;
                }
                return [...prev, systemMessage];
            });
        };

        signalRService.onReceiveRoomParticipants = (participants: any[]) => {
            console.log('Received room participants update:', participants);
            const mappedParticipants = participants.map(p => ({
                id: p.id,
                displayName: p.displayName,
                avatarUrl: p.avatarUrl || `https://api.dicebear.com/7.x/initials/svg?seed=${p.displayName}`,
                hasControl: p.hasControl,
                joinedAt: p.joinedAt,
                isAdmin: p.isAdmin
            }));
            console.log('Mapped participants:', mappedParticipants);
            setParticipants(mappedParticipants);
            
            // Update current user's control status
            const currentUserParticipant = mappedParticipants.find(p => p.id === user?.id);
            if (currentUserParticipant) {
                setCurrentUserHasControl(currentUserParticipant.hasControl);
            }
        };

        signalRService.onControlTransferred = (newControllerId: string, newControllerName: string) => {
            // Add system message for control transfer
            const systemMessage: ChatMessage = {
                id: `system-control-${Date.now()}-${Math.random()}`, // Add random component to ensure uniqueness
                senderId: 'system',
                roomId: roomId || '',
                senderName: 'System',
                avatarUrl: '',
                content: `Control transferred to ${newControllerName}`,
                timestamp: Date.now(),
                sentAt: new Date().toISOString()
            };
            setMessages(prev => [...prev, systemMessage]);
            
            // Update participants to reflect control change
            setParticipants(prev => prev.map(p => ({
                ...p,
                hasControl: p.id === newControllerId
            })));
            
            // Update current user's control status
            setCurrentUserHasControl(newControllerId === user?.id);
        };

        signalRService.onReceivePlaybackState = (state: PlaybackState) => {
            setIsPlaying(state.isPlaying);
            setCurrentPosition(state.progress);
            if (state.duration > 0) {
                setVideoDuration(state.duration);
            }
        };

        signalRService.onUserKicked = (roomId: string, reason: string) => {
            console.log('User was kicked:', { roomId, reason });
            // User has been kicked from the room
            toast.error(reason);
            // Leave the room on SignalR side before redirecting
            if (roomData) {
                signalRService.leaveRoom(roomData.id);
            }
            navigate('/');
        };

        return () => {
            signalRService.onReceiveMessage = originalOnReceiveMessage;
            signalRService.onUserJoined = originalOnUserJoined;
            signalRService.onUserLeft = originalOnUserLeft;
            signalRService.onReceivePlaybackState = originalOnReceivePlaybackState;
            signalRService.onUserKicked = originalOnUserKicked;
            signalRService.onReceiveRoomParticipants = originalOnReceiveRoomParticipants;
        };
    }, []);

    const handleSendMessage = async (content: string) => {
        if (!roomId || !user) return;
        
        try {
            await signalRService.sendMessage(roomId, content);
        } catch (error) {
            toast.error('Failed to send message');
        }
    };

    const handleLeaveRoom = () => {
        if (roomId) {
            signalRService.leaveRoom(roomId);
        }
        navigate('/dashboard');
    };

    const handleKickUser = (userId: string) => {
        const participant = participants.find(p => p.id === userId);
        const username = participant?.displayName || 'Unknown User';
        console.log('Attempting to kick user:', { userId, username, participant });
        const confirmed = window.confirm(`Are you sure you want to kick ${username} from the room?`);
        if (confirmed && roomData) {
            console.log('Sending kick request for user:', userId);
            signalRService.kickUser(roomData.id, userId);
        }
    };

    const handleTransferControl = async (participantId: string) => {
        if (!roomId) return;
        
        try {
            await signalRService.transferControl(roomId, participantId);
            toast.success('Control transferred successfully');
        } catch (error) {
            toast.error('Failed to transfer control');
        }
    };

    // Video control handlers
    const handleVideoPlay = async () => {
        if (!roomId) return;
        try {
            setIsPlaying(true);
            await signalRService.playVideo(roomId);
        } catch (error) {
            setIsPlaying(false);
        }
    };

    const handleVideoPause = async () => {
        if (!roomId) return;
        try {
            setIsPlaying(false);
            await signalRService.pauseVideo(roomId);
        } catch (error) {
            setIsPlaying(true);
        }
    };

    const handleVideoSeek = async (position: number) => {
        if (!roomId) return;
        try {
            setCurrentPosition(position);
            await signalRService.seekVideo(roomId, position);
        } catch (error) {
        }
    };

    const handleVideoTimeUpdate = (position: number) => {
        setCurrentPosition(position);
    };

    const handleVideoDurationUpdate = (duration: number) => {
        setVideoDuration(duration);
    };

    const handleAuthSuccess = () => {
        setShowAuthModal(false);
        setLoading(true);
        // The useEffect will re-run when isAuthenticated becomes true
    };

    const handleAuthModalClose = () => {
        setShowAuthModal(false);
        navigate('/');
    };

    const handleCopyInviteCode = async () => {
        if (!roomData?.inviteCode) return;
        
        try {
            await navigator.clipboard.writeText(roomData.inviteCode);
            setIsCopied(true);
            toast.success('Invite code copied to clipboard!');
            
            // Reset the copy state after 2 seconds
            setTimeout(() => {
                setIsCopied(false);
            }, 2000);
        } catch (error) {
            toast.error('Failed to copy invite code');
        }
    };

    // Show authentication modal for unauthenticated users
    if (showAuthModal) {
        return (
            <div className="min-h-screen bg-gray-100">
                <Header />
                <AuthModal
                    isOpen={showAuthModal}
                    onClose={handleAuthModalClose}
                    onSuccess={handleAuthSuccess}
                    title="Join Watch Party"
                    message="Please login or create an account to join this watch party room."
                />
            </div>
        );
    }

    // Handle authentication after all hooks but before other early returns
    if (authLoading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (!isAuthenticated && !showAuthModal) {
        return null; // This shouldn't happen now, but kept as safety
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                    Error: {error}
                </div>
                <button
                    onClick={() => navigate('/dashboard')}
                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                >
                    Back to Dashboard
                </button>
            </div>
        );
    }

    if (!roomData) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            <Header />
            
            {/* Room Header - Enhanced with invite code */}
            <div className="bg-white shadow-sm border-b">
                <div className="mx-auto px-6 py-4">
                    <div className="flex justify-between items-center">
                        <div className="flex-1">
                            <div className="flex items-center space-x-4">
                                <div>
                                    <h1 className="text-2xl font-bold text-gray-900">{roomData.name}</h1>
                                    <div className="flex items-center space-x-3 mt-1">
                                        <p className="text-sm text-gray-500">
                                            Hosted by <span className="font-medium">{participants.find(p => p.id === roomData.adminId)?.displayName || roomData.adminName}</span> • 
                                            {participants.length} participant{participants.length !== 1 ? 's' : ''}
                                        </p>
                                        
                                        {/* Invite Code Button */}
                                        <button
                                            onClick={handleCopyInviteCode}
                                            className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors"
                                            title={`Copy invite code: ${roomData.inviteCode}`}
                                        >
                                            {isCopied ? (
                                                <>
                                                    <Check className="w-3 h-3 mr-1.5" />
                                                    Copied!
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="w-3 h-3 mr-1.5" />
                                                    Copy Code: {roomData.inviteCode}
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex items-center space-x-3">
                            <button
                                onClick={handleLeaveRoom}
                                className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors shadow-sm"
                            >
                                Leave Room
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content - Professional grid layout */}
            <div className="px-6 py-6 flex-grow" style={{ minHeight: 'calc(100vh - 200px)' }}>
                <div className="room-main-content grid grid-cols-1 lg:grid-cols-3 gap-8 lg:h-full lg:overflow-hidden">
                    
                    {/* Video Player - Takes 2/3 of the space */}
                    <div className="room-video-section lg:col-span-2">
                        <div className="bg-black rounded-xl shadow-lg overflow-hidden h-full">
                            <div className="aspect-video lg:h-full">
                                <VideoPlayer
                                    src={roomData.videoUrl}
                                    isPlaying={isPlaying}
                                    position={currentPosition}
                                    duration={videoDuration}
                                    onPlay={handleVideoPlay}
                                    onPause={handleVideoPause}
                                    onSeek={handleVideoSeek}
                                    onTimeUpdate={handleVideoTimeUpdate}
                                    onDurationUpdate={handleVideoDurationUpdate}
                                    hasControl={currentUserHasControl}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Sidebar - Takes 1/3 of the space */}
                    <div className="room-sidebar lg:col-span-1 space-y-6 flex flex-col lg:min-h-0 lg:overflow-hidden">
                        
                        {/* Participants Panel */}
                        <div className="room-participants bg-white rounded-xl shadow-lg lg:flex-shrink-0">
                            <div className="px-4 py-3 border-b border-gray-100">
                                <h3 className="text-sm font-semibold text-gray-700 flex items-center">
                                    👥 Participants ({participants.length})
                                </h3>
                            </div>
                            <div className="p-3 lg:max-h-48 lg:overflow-y-auto">
                                <ParticipantsList
                                    participants={participants}
                                    currentUserId={user?.id || ''}
                                    roomAdminId={roomData.adminId}
                                    onTransferControl={handleTransferControl}
                                    currentUserHasControl={currentUserHasControl}
                                    onKickUser={handleKickUser}
                                />
                            </div>
                        </div>

                        {/* Chat Panel */}
                        <div className="room-chat bg-white rounded-xl shadow-lg flex flex-col lg:flex-1 lg:min-h-0 lg:overflow-hidden">
                            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <h3 className="text-sm font-semibold text-gray-700 flex items-center justify-between">
                                    <span>💬 Live Chat</span>
                                    <span className="text-xs text-green-500 font-normal">Connected</span>
                                </h3>
                            </div>
                            <div className="flex-1 fullscreen-chat lg:overflow-hidden lg:min-h-0">
                                <ChatPanel
                                    messages={messages}
                                    onSendMessage={handleSendMessage}
                                    isConnected={signalRService.getIsConnected()}
                                />
                            </div>
                        </div>
                        
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoomPage;
