namespace WatchPartyApp.Models
{
    public class Room
    {
        public string Id { get; set; }
        public string Name { get; set; }
        public string MovieId { get; set; }
        public string AdminId { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime? EndedAt { get; set; }
        public string InviteCode { get; set; }

        // Privacy settings
        public bool IsPrivate { get; set; } = false;
        public string? PasswordHash { get; set; }

        // Room configuration options
        public bool AllowGuestControl { get; set; } = false;
        public bool AutoPlay { get; set; } = true;
        public string SyncMode { get; set; } = "strict";

        // Current playback state
        public double CurrentPosition { get; set; }
        public bool IsPlaying { get; set; }

        // Navigation properties
        public ApplicationUser Admin { get; set; }
        public Movie Movie { get; set; }
        public List<RoomUser> RoomUsers { get; set; }
        public List<ChatMessage> Messages { get; set; }
    }
}
