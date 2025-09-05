import { apiService } from './api';
import {
  Room,
  RoomDetail,
  RoomCreateRequest,
  RoomUpdateRequest,
  RoomParticipant,
  ChatMessage,
} from '../types/index';

export const roomService = {
  async getActiveRooms(): Promise<Room[]> {
    return await apiService.get<Room[]>('/api/room/active');
  },

  async getUserRooms(): Promise<Room[]> {
    return await apiService.get<Room[]>('/api/room/my-rooms');
  },

  async getRoomById(roomId: string): Promise<RoomDetail> {
    return await apiService.get<RoomDetail>(`/api/room/${roomId}`);
  },

  async getRoomByInviteCode(inviteCode: string): Promise<{ data: RoomDetail }> {
    const room = await apiService.get<RoomDetail>(`/api/room/invite/${inviteCode}`);
    return { data: room };
  },

  async createRoom(roomData: RoomCreateRequest): Promise<any> {
    return apiService.post('/api/room/create', roomData);
  },

  async updateRoom(roomData: RoomUpdateRequest): Promise<void> {
    return apiService.put('/api/room/update', roomData);
  },

  async endRoom(roomId: string): Promise<void> {
    return apiService.post(`/api/room/${roomId}/end`);
  },

  async transferControl(roomId: string, newControllerId: string): Promise<void> {
    return apiService.post(`/api/room/${roomId}/transfer-control`, {
      newControllerId,
    });
  },

  async getRoomParticipants(roomId: string): Promise<RoomParticipant[]> {
    return await apiService.get<RoomParticipant[]>(`/api/room/${roomId}/participants`);
  },

  async getRoomMessages(roomId: string): Promise<ChatMessage[]> {
    return await apiService.get<ChatMessage[]>(`/api/room/${roomId}/messages`);
  },

  // Note: Room joining is handled via SignalR, not REST API
  // The backend only supports joining rooms through the SignalR hub
  async joinRoom(roomId: string, password?: string): Promise<void> {
    // Room joining happens via SignalR hub connection
    const payload = password ? { password } : {};
    return apiService.post(`/api/room/${roomId}/join`, payload);
  },
};
