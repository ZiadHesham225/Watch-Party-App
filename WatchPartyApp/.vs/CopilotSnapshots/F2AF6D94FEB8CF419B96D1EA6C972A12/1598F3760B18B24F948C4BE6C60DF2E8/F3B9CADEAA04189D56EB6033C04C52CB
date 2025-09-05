using Microsoft.AspNetCore.Identity;

namespace WatchPartyApp.Models
{
    public class ApplicationUser : IdentityUser
    {
        public DateTime CreatedAt { get; set; }
        public DateTime LastLoginAt { get; set; }

        public string DisplayName { get; set; }
        public string? AvatarUrl { get; set; }

        // Navigation properties
        public List<Room> CreatedRooms { get; set; }
        public List<RoomUser> JoinedRooms { get; set; }
        public List<WatchLater> WatchLaterItems { get; set; }
    }
}
