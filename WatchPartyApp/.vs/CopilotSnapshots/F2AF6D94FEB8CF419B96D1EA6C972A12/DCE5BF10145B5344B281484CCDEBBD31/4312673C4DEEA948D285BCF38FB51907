namespace WatchPartyApp.Models
{
    public class ChatMessage
    {
        public string Id { get; set; }
        public string RoomId { get; set; }
        public string SenderId { get; set; } // User or Guest ID
        public string SenderName { get; set; }
        public bool IsFromGuest { get; set; }
        public string Content { get; set; }
        public DateTime SentAt { get; set; }

        // Navigation properties
        public Room Room { get; set; }
    }
}
