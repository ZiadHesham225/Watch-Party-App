import React from 'react';
import { Users, Crown, RotateCcw, Diamond, UserX } from 'lucide-react';
import { RoomParticipant } from '../../types/index';

interface ParticipantsListProps {
    participants: RoomParticipant[];
    currentUserId?: string;
    roomAdminId?: string;
    onTransferControl?: (participantId: string) => void;
    onKickUser?: (participantId: string) => void;
    currentUserHasControl?: boolean;
}

const ParticipantsList: React.FC<ParticipantsListProps> = ({ 
    participants, 
    currentUserId,
    roomAdminId,
    onTransferControl,
    onKickUser,
    currentUserHasControl
}) => {
    const isCurrentUserAdmin = currentUserId === roomAdminId;
    const canTransferControl = isCurrentUserAdmin || currentUserHasControl;
    return (
        <div className="h-full flex flex-col bg-white">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
                <div className="flex items-center space-x-2">
                    <Users className="w-5 h-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">
                        Participants
                    </h3>
                    <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {participants.length}
                    </span>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4">
                {participants.length === 0 ? (
                    <div className="text-center py-8">
                        <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500 font-medium">No participants yet</p>
                        <p className="text-sm text-gray-400">Waiting for others to join...</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {participants
                            .sort((a, b) => {
                                // Sort by: controller first, then admin, then alphabetically
                                if (a.hasControl !== b.hasControl) return a.hasControl ? -1 : 1;
                                if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1;
                                return a.displayName.localeCompare(b.displayName);
                            })
                            .map((participant) => (
                            <div
                                key={participant.id}
                                className={`flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 hover:shadow-md ${
                                    participant.id === currentUserId 
                                        ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-200 shadow-sm' 
                                        : participant.hasControl
                                            ? 'bg-gradient-to-r from-green-50 to-green-100 border border-green-200'
                                            : participant.isAdmin
                                                ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200'
                                                : 'bg-gray-50 border border-gray-200 hover:bg-gray-100'
                                }`}
                            >
                                {/* Avatar */}
                                <div className="flex-shrink-0 relative">
                                    {participant.avatarUrl ? (
                                        <img
                                            src={participant.avatarUrl}
                                            alt={participant.displayName}
                                            className={`w-10 h-10 rounded-full object-cover ${
                                                participant.hasControl ? 'ring-2 ring-green-400 ring-offset-2' : ''
                                            }`}
                                        />
                                    ) : (
                                        <div className={`w-10 h-10 bg-gradient-to-br ${
                                            participant.hasControl 
                                                ? 'from-green-400 to-green-600' 
                                                : participant.isAdmin 
                                                    ? 'from-yellow-400 to-yellow-600'
                                                    : 'from-gray-400 to-gray-600'
                                        } rounded-full flex items-center justify-center ring-2 ${
                                            participant.hasControl ? 'ring-green-400' : 'ring-transparent'
                                        } ring-offset-2`}>
                                            <span className="text-sm font-bold text-white">
                                                {participant.displayName.charAt(0).toUpperCase()}
                                            </span>
                                        </div>
                                    )}
                                    {participant.hasControl && (
                                        <div className="absolute -top-1 -right-1">
                                            <Diamond className="w-5 h-5 text-green-500 bg-white rounded-full p-0.5" />
                                        </div>
                                    )}
                                    {participant.isAdmin && !participant.hasControl && (
                                        <div className="absolute -top-1 -right-1">
                                            <Crown className="w-5 h-5 text-yellow-500 bg-white rounded-full p-0.5" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center space-x-2">
                                        <span className={`text-sm font-medium truncate ${
                                            participant.hasControl 
                                                ? 'text-green-700 font-bold' 
                                                : participant.isAdmin 
                                                    ? 'text-yellow-700 font-semibold' 
                                                    : 'text-gray-900'
                                        }`}>
                                            {participant.displayName}
                                            {participant.id === currentUserId && (
                                                <span className="text-xs text-blue-600 ml-1 font-normal">(You)</span>
                                            )}
                                        </span>
                                    </div>
                                    
                                    <div className="text-xs">
                                        {participant.hasControl && (
                                            <span className="text-green-600 font-medium">
                                                🎮 Currently controlling
                                            </span>
                                        )}
                                        {participant.isAdmin && !participant.hasControl && (
                                            <span className="text-yellow-600 font-medium">
                                                👑 Room admin
                                            </span>
                                        )}
                                        {!participant.hasControl && !participant.isAdmin && (
                                            <span className="text-gray-500">
                                                👁️ Viewer
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex space-x-1">
                                    {canTransferControl && 
                                     onTransferControl && 
                                     !participant.hasControl && 
                                     participant.id !== currentUserId && (
                                        <button
                                            onClick={() => onTransferControl(participant.id)}
                                            className="flex-shrink-0 p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95"
                                            title="Transfer control to this participant"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                    {isCurrentUserAdmin && 
                                     onKickUser && 
                                     participant.id !== currentUserId && 
                                     participant.id !== roomAdminId && (
                                        <button
                                            onClick={() => onKickUser(participant.id)}
                                            className="flex-shrink-0 p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-all duration-200 transform hover:scale-110 active:scale-95"
                                            title="Kick this participant from the room"
                                        >
                                            <UserX className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ParticipantsList;
