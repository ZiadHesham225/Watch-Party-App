namespace WatchPartyApp.DTOs
{
    public class RoomParticipantDto
    {
        public string Id { get; set; }
        public string DisplayName { get; set; }
        public string? AvatarUrl { get; set; }
        public bool HasControl { get; set; }
        public DateTime JoinedAt { get; set; }
        public bool IsAdmin { get; set; }
    }
}