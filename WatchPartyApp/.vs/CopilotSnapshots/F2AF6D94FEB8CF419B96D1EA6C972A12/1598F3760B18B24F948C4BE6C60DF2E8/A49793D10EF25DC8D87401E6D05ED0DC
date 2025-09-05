using WatchPartyApp.DTOs;
using WatchPartyApp.Models;

namespace WatchPartyApp.BusinessLogic.Interfaces
{
    public interface IRoomService
    {
        Task<Room> CreateRoomAsync(RoomCreateDto roomDto, string userId);
        Task<RoomDetailDto> GetRoomByIdAsync(string roomId);
        Task<Room> GetRoomByInviteCodeAsync(string inviteCode);
        Task<IEnumerable<RoomDto>> GetActiveRoomsAsync();
        Task<IEnumerable<RoomDto>> GetUserRoomsAsync(string userId);
        Task<IEnumerable<RoomUserDto>> GetRoomUsersAsync(string roomId);
        Task<IEnumerable<RegisteredRoomUserDto>> GetRegisteredRoomUsersAsync(string roomId);
        Task<bool> UpdateRoomAsync(RoomUpdateDto roomDto, string userId);
        Task<bool> GuestLeaveRoomAsync(string roomId, string guestId);
        Task<bool> TransferAdminAsync(string roomId, string currentAdminId, string newAdminId);
        Task<bool> EndRoomAsync(string roomId, string userId);
        Task<bool> JoinRoomAsync(string roomId, string userId, string password = null);
        Task<bool> JoinRoomAsGuestAsync(string roomId, string displayName, string password = null);
        Task<bool> LeaveRoomAsync(string roomId, string userId);
        Task<bool> UpdateUserPermissionsAsync(string roomId, string targetUserId, string adminId, RoomUserPermissionDto permissions);
        Task<bool> UpdatePlaybackStateAsync(string roomId, string userId, double position, bool isPlaying);
        Task<string> GenerateInviteLink(string roomId);
        Task<bool> IsUserInRoomAsync(string roomId, string userId);
        Task<bool> IsUserAdminAsync(string roomId, string userId);
    }
}
