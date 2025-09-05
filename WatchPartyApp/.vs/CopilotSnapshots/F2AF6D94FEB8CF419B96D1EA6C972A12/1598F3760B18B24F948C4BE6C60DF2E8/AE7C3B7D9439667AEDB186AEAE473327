using WatchPartyApp.Validations;

namespace WatchPartyApp.DTOs
{
    [RequirePasswordIfPrivate]
    public class RoomUpdateDto : IPrivateRoomDto
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public bool IsPrivate { get; set; }
        public string? Password { get; set; }
        public bool AllowGuestControl { get; set; } = false;
        public bool AutoPlay { get; set; } = true;
        public string SyncMode { get; set; } = "strict";
    }
}
