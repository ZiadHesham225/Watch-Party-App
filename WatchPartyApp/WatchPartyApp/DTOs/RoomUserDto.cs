namespace WatchPartyApp.DTOs
{
    public class RoomUserDto
    {
        public string Id { get; set; }
        public string? UserId { get; set; }
        public string? GuestId { get; set; }
        public bool IsGuest => !string.IsNullOrEmpty(GuestId);
        public string DisplayName { get; set; }
        public bool HasPlaybackControl { get; set; }
        public bool HasVolumeControl { get; set; }
        public DateTime JoinedAt { get; set; }
        public bool IsAdmin { get; set; }
        public string? AvatarUrl { get; set; }
    }
}
