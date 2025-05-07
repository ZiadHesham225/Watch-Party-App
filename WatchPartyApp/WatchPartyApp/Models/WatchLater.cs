namespace WatchPartyApp.Models
{
    public class WatchLater
    {
        public string Id { get; set; }
        public string UserId { get; set; } // Now references ApplicationUser
        public string MovieId { get; set; }
        public DateTime AddedAt { get; set; }

        // Navigation properties
        public ApplicationUser User { get; set; } // Updated to use ApplicationUser
        public Movie Movie { get; set; }
    }
}
