namespace WatchPartyApp.Models
{
    public class RoomUser
    {
        public string Id { get; set; }
        public string RoomId { get; set; }
        public string? UserId { get; set; }
        public string? GuestId { get; set; }
        public string DisplayName { get; set; }
        public bool HasPlaybackControl { get; set; }
        public bool HasVolumeControl { get; set; }
        public DateTime JoinedAt { get; set; }

        // Navigation properties
        public Room Room { get; set; }
        public ApplicationUser User { get; set; }
        public GuestUser Guest { get; set; }
    }
}
