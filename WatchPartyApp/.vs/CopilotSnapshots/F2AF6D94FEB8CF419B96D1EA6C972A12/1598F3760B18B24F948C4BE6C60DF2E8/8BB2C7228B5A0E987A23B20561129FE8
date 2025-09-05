using WatchPartyApp.Validations;

namespace WatchPartyApp.DTOs
{
    [RequirePasswordIfPrivate]
    public class RoomCreateDto : IPrivateRoomDto
    {
        public string Name { get; set; }
        public string MovieId { get; set; }
        public bool IsPrivate { get; set; }
        public string? Password { get; set; }
        public bool AllowGuestControl { get; set; }
        public bool AutoPlay { get; set; } = true;
        public string SyncMode { get; set; } = "strict";
    }
}
