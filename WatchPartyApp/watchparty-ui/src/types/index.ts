// API Response Types
export interface ApiResponse<T = any> {
  data?: T;
  message?: string;
  success: boolean;
}

// Auth Types
export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  displayName: string;
  username: string;
  email: string;
  password: string;
}

export interface TokenResponse {
  accessToken: string;  // Changed from 'token' to match your backend
  expiration: string;   // Changed from Date to string to match your backend
}

export interface JwtClaims {
  [key: string]: any;
  // Standard claims
  sub?: string;  // Subject (user ID) 
  iat?: number;  // Issued at
  exp?: number;  // Expiration
  jti?: string;  // JWT ID
  iss?: string;  // Issuer
  aud?: string;  // Audience
  name?: string; // Name
  email?: string; // Email
  // Your backend's actual claims
  unique_name?: string;  // Username from your backend
  nameId?: string;       // User ID from your backend  
  Image?: string;        // Avatar URL from your backend
  // Microsoft claim URIs (fallback)
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'?: string;           // Username
  'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier'?: string; // User ID
}

export interface User {
  id: string;
  displayName: string;
  username: string;
  email: string;
  avatarUrl?: string;
}

// Room Types

export interface Room {
  id: string;
  name: string;
  videoUrl: string;
  adminId: string;
  adminName: string;
  isActive: boolean;
  createdAt: string;
  inviteCode: string;
  isPrivate: boolean;
  hasPassword: boolean;
  userCount: number;
}

export interface RoomDetail extends Room {
  description?: string;
  currentPosition: number;
  isPlaying: boolean;
  syncMode: string;
  autoPlay: boolean;
  participants: RoomParticipant[];
}

export interface RoomCreateRequest {
  name: string;
  videoUrl: string;
  isPrivate: boolean;
  password?: string;
  autoPlay: boolean;
  syncMode: string;
}

export interface RoomUpdateRequest {
  id: string;
  name: string;
  videoUrl: string;
  autoPlay: boolean;
  syncMode: string;
}

export interface RoomParticipant {
  id: string;
  displayName: string;
  avatarUrl?: string;
  hasControl: boolean;
  joinedAt: string;
  isAdmin: boolean;
}

// Chat Types
export interface ChatMessage {
  id: string;
  senderId: string;
  roomId: string;
  senderName: string;
  avatarUrl?: string;
  content: string;
  timestamp: number;
  sentAt: string;
}

// SignalR Types
export interface JoinRoomRequest {
  roomId: string;
  displayName: string;
  avatarUrl?: string;
  password?: string;
}

export interface PlaybackState {
  isPlaying: boolean;
  progress: number;
  speed: number;
  duration: number;
}

// Error Types
export interface ApiError {
  message: string;
  details?: string;
  statusCode?: number;
}
