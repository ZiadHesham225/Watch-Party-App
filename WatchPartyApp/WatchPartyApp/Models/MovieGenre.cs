namespace WatchPartyApp.Models
{
    public class MovieGenre
    {
        public int Id { get; set; }
        public string MovieId { get; set; }
        public int GenreId { get; set; }

        // Navigation properties
        public Movie Movie { get; set; }
        public Genre Genre { get; set; }
    }
}
