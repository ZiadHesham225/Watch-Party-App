import React, { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { ChatMessage } from '../../types/index';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../common/Button';
import Input from '../common/Input';

interface ChatPanelProps {
    messages: ChatMessage[];
    onSendMessage: (message: string) => void;
    isConnected: boolean;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ messages, onSendMessage, isConnected }) => {
    const [newMessage, setNewMessage] = useState('');
    const { user } = useAuth();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newMessage.trim() || !isConnected) return;
        onSendMessage(newMessage.trim());
        setNewMessage('');
    };

    const formatTimestamp = (timestamp: string | Date | undefined) => {
        if (!timestamp) {
            return new Date().toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
        }
        const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-3 space-y-2">
                {messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        <div className="text-2xl mb-2">💬</div>
                        <p className="text-sm">No messages yet.</p>
                        <p className="text-xs text-gray-500 mt-1">Be the first to say something!</p>
                    </div>
                ) : (
                    messages
                        .filter(message => message && message.id && message.content)
                        .map((message) => {
                            const isCurrentUser = user?.id === message.senderId;
                            const isSystemMessage = message.senderId === 'system';
                            
                            if (isSystemMessage) {
                                return (
                                    <div key={message.id} className="flex justify-center fade-in">
                                        <div className="bg-gradient-to-r from-blue-100 to-purple-100 px-4 py-2 rounded-full text-xs text-gray-700 font-medium border border-blue-200 shadow-sm">
                                            <span className="text-blue-600 mr-1">✨</span>
                                            {message.content}
                                        </div>
                                    </div>
                                );
                            }
                            
                            return (
                                <div key={message.id} className={`flex chat-message ${isCurrentUser ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`flex max-w-[70%] ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'} space-x-2 ${isCurrentUser ? 'space-x-reverse' : ''}`}>
                                        {/* Avatar - only show for other users */}
                                        {!isCurrentUser && (
                                            <div className="flex-shrink-0">
                                                {message.avatarUrl ? (
                                                    <img className="w-8 h-8 rounded-full" src={message.avatarUrl} alt={message.senderName || 'User'} />
                                                ) : (
                                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xs">
                                                        {((message.senderName && message.senderName !== 'Unknown User') ? message.senderName : 'U').charAt(0).toUpperCase()}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        
                                        {/* Message bubble */}
                                        <div className={`p-3 rounded-lg ${
                                            isCurrentUser 
                                                ? 'bg-blue-500 text-white rounded-br-sm' 
                                                : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                                        }`}>
                                            {/* Sender name - only for other users */}
                                            {!isCurrentUser && (
                                                <div className="mb-1">
                                                    <p className="text-xs font-semibold text-blue-600">
                                                        {message.senderName && message.senderName !== 'Unknown User' ? message.senderName : 'Anonymous User'}
                                                    </p>
                                                </div>
                                            )}
                                            
                                            <p className="text-sm">{message.content}</p>
                                            
                                            <div className={`text-xs mt-1 ${
                                                isCurrentUser ? 'text-blue-100' : 'text-gray-500'
                                            }`}>
                                                {formatTimestamp(message.sentAt)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-3 border-t border-gray-100 bg-gray-50 flex-shrink-0">
                <form onSubmit={handleSendMessage} className="flex space-x-2">
                    <input
                        type="text"
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-200 rounded-lg focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none text-sm"
                        disabled={!isConnected}
                    />
                    <button 
                        type="submit" 
                        disabled={!isConnected || !newMessage.trim()} 
                        className="px-3 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white rounded-lg transition-colors flex items-center justify-center"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
                {!isConnected && (
                    <p className="text-xs text-red-500 mt-1">Connecting to chat...</p>
                )}
            </div>
        </div>
    );
};

export default ChatPanel;
