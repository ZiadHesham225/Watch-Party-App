using WatchPartyApp.Validations;

namespace WatchPartyApp.DTOs
{
    [RequirePasswordIfPrivate]
    public class RoomCreateDto : IPrivateRoomDto
    {
        public required string Name { get; set; }
        public required string VideoUrl { get; set; }
        public bool IsPrivate { get; set; } = false;
        public string? Password { get; set; }
        public bool AutoPlay { get; set; } = true;
        public required string SyncMode { get; set; } = "strict";
    }
}
