namespace WatchPartyApp.Models
{
    public class Movie
    {
        public string Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public string PosterUrl { get; set; }
        public string ReleaseYear { get; set; }
        public double Rating { get; set; }
        public TimeSpan Duration { get; set; }
        public string StreamingUrl { get; set; }
        public DateTime AddedAt { get; set; }
        public DateTime LastUpdatedAt { get; set; }

        // Navigation properties
        public List<MovieGenre> MovieGenres { get; set; }
        public List<Room> Rooms { get; set; }
        public List<WatchLater> WatchLaterItems { get; set; }
    }
}
