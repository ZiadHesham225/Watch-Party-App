using WatchPartyApp.DTOs;

namespace WatchPartyApp.Hubs
{
    public interface IRoomClient
    {
        Task RoomJoined(string roomId, string userId, string displayName, string avatarUrl);
        Task RoomLeft(string roomId, string userId, string displayName);
        Task UserJoinedNotification(string displayName);
        Task UserLeftNotification(string displayName);
        Task RoomClosed(string roomId, string reason);
        Task ReceivePlaybackUpdate(double position, bool isPlaying);
        Task ForceSyncPlayback(double position, bool isPlaying);
        Task ReceiveHeartbeat(double position);
        Task AdminTransferred(string newAdminId, string newAdminName);
        Task PermissionChanged(string userId, string displayName, bool hasPlaybackControl, bool hasVolumeControl);
        Task YourPermissionChanged(bool hasPlaybackControl, bool hasVolumeControl);
        Task ReceiveMessage(string userId, string displayName, string avatarUrl, string message, DateTime timestamp);
        Task ReceiveRoomUsers(IEnumerable<RoomUserDto> users);
        Task Error(string message);
    }
}
