using System.Text.Json.Serialization;

namespace WatchPartyApp.DTOs
{
    public class ApiMovieDto
    {
        [JsonPropertyName("id")]
        public int Id { get; set; }

        [JsonPropertyName("title")]
        public string Title { get; set; }

        [JsonPropertyName("overview")]
        public string Overview { get; set; }

        [JsonPropertyName("poster_path")]
        public string PosterPath { get; set; }

        [JsonPropertyName("release_date")]
        public string ReleaseDateString { get; set; }
        [JsonPropertyName("genre_ids")]
        public List<int> GenreIds { get; set; } = new List<int>();

        [JsonIgnore]
        public DateTime ReleaseDate =>
            DateTime.TryParse(ReleaseDateString, out var date) ? date : DateTime.MinValue;

        [JsonPropertyName("vote_average")]
        public double VoteAverage { get; set; }

        [JsonPropertyName("runtime")]
        public int Runtime { get; set; }

        [JsonPropertyName("genres")]
        public List<GenreDto> Genres { get; set; } = new List<GenreDto>();
        public string StreamingUrl { get; set; } = string.Empty;

        public MovieDto ToMovieDto()
        {
            return new MovieDto
            {
                Id = Id.ToString(),
                Title = Title,
                PosterUrl = PosterPath,
                ReleaseYear = ReleaseDate.Year.ToString(),
                Rating = VoteAverage,
                Duration = TimeSpan.FromMinutes(Runtime),
                Genres = Genres?.Select(g => g.Name).ToList() ?? new List<string>()
            };
        }

        public MovieDetailDto ToMovieDetailDto()
        {
            return new MovieDetailDto
            {
                Id = Id.ToString(),
                Title = Title,
                Description = Overview,
                PosterUrl = PosterPath,
                ReleaseYear = ReleaseDate.Year.ToString(),
                Rating = VoteAverage,
                Duration = TimeSpan.FromMinutes(Runtime),
                StreamingUrl = StreamingUrl,
                AddedAt = DateTime.UtcNow,
                Genres = Genres?.ToList() ?? new List<GenreDto>()
            };
        }
    }
}
