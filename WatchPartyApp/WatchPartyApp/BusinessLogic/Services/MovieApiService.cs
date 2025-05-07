using System.Text.Json;
using System.Text.Json.Serialization;
using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.Common;
using WatchPartyApp.DTOs;

namespace WatchPartyApp.BusinessLogic.Services
{
    public class MovieApiService : IMovieApiService
    {
        private readonly HttpClient _httpClient;
        private readonly IConfiguration _configuration;
        private readonly ILogger<MovieApiService> _logger;
        private readonly string _apiKey;
        private readonly string _baseUrl = "https://api.themoviedb.org/3";
        private readonly string _embedUrl = "https://embed.su/embed/movie/";

        public MovieApiService(
            HttpClient httpClient,
            IConfiguration configuration,
            ILogger<MovieApiService> logger)
        {
            _httpClient = httpClient;
            _configuration = configuration;
            _logger = logger;
            _apiKey = _configuration["MovieDb:ApiKey"];
        }

        public async Task<ApiMovieDto> GetMovieAsync(string movieId)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/movie/{movieId}?api_key={_apiKey}&append_to_response=videos");
                response.EnsureSuccessStatusCode();

                var content = await response.Content.ReadFromJsonAsync<ApiMovieDto>();
                var movieDetails = content.ToMovieDetailDto();
                if (!string.IsNullOrEmpty(content.PosterPath))
                {
                    content.PosterPath = $"https://image.tmdb.org/t/p/w500{content.PosterPath}";
                }
                content.StreamingUrl = $"{_embedUrl}{movieId}";
                return content;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching movie with ID {MovieId} from API", movieId);
                return null;
            }
        }

        public async Task<PaginatedResponse<ApiMovieDto>> SearchMoviesAsync(string query, int page = 1)
        {
            try
            {
                var allGenres = await GetGenresAsync();
                var genreMap = allGenres.ToDictionary(g => g.Id, g => g);
                var response = await _httpClient.GetAsync(
                    $"{_baseUrl}/search/movie?api_key={_apiKey}&query={Uri.EscapeDataString(query)}&page={page}");
                response.EnsureSuccessStatusCode();
                var jsonResponse = await response.Content.ReadAsStringAsync();
                var searchResult = JsonSerializer.Deserialize<TheMovieDbSearchResponse>(jsonResponse);
                foreach (var movie in searchResult.Results)
                {
                    if (!string.IsNullOrEmpty(movie.PosterPath))
                    {
                        movie.PosterPath = $"https://image.tmdb.org/t/p/w500{movie.PosterPath}";
                    }
                    if (movie.GenreIds != null && movie.GenreIds.Any())
                    {
                        movie.Genres = movie.GenreIds
                            .Where(id => genreMap.ContainsKey(id))
                            .Select(id => genreMap[id])
                            .ToList();
                    }
                }

                return new PaginatedResponse<ApiMovieDto>
                {
                    Items = searchResult.Results,
                    CurrentPage = searchResult.Page,
                    TotalPages = searchResult.TotalPages,
                    TotalItems = searchResult.TotalResults,
                    HasPreviousPage = searchResult.Page > 1,
                    HasNextPage = searchResult.Page < searchResult.TotalPages
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching movies with query: {Query}", query);
                return new PaginatedResponse<ApiMovieDto>
                {
                    Items = new List<ApiMovieDto>(),
                    CurrentPage = page,
                    TotalPages = 0,
                    TotalItems = 0,
                    HasPreviousPage = false,
                    HasNextPage = false
                };
            }
        }

        public async Task<PaginatedResponse<ApiMovieDto>> GetPopularMoviesAsync(int page = 1)
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/movie/popular?api_key={_apiKey}&page={page}");
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<TheMovieDbSearchResponse>(jsonResponse);
                foreach (var movie in result.Results)
                {
                    if (!string.IsNullOrEmpty(movie.PosterPath))
                    {
                        movie.PosterPath = $"https://image.tmdb.org/t/p/w500{movie.PosterPath}";
                    }
                }

                return new PaginatedResponse<ApiMovieDto>
                {
                    Items = result.Results,
                    CurrentPage = result.Page,
                    TotalPages = result.TotalPages,
                    TotalItems = result.TotalResults,
                    HasPreviousPage = result.Page > 1,
                    HasNextPage = result.Page < result.TotalPages
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching popular movies");
                return new PaginatedResponse<ApiMovieDto>
                {
                    Items = new List<ApiMovieDto>(),
                    CurrentPage = page,
                    TotalPages = 0,
                    TotalItems = 0,
                    HasPreviousPage = false,
                    HasNextPage = false
                };
            }
        }

        public async Task<List<ApiMovieDto>> GetMoviesByGenreAsync(int genreId, int page = 1)
        {
            try
            {
                var response = await _httpClient.GetAsync(
                    $"{_baseUrl}/discover/movie?api_key={_apiKey}&with_genres={genreId}&page={page}");
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<TheMovieDbSearchResponse>(jsonResponse);
                foreach (var movie in result.Results)
                {
                    if (!string.IsNullOrEmpty(movie.PosterPath))
                    {
                        movie.PosterPath = $"https://image.tmdb.org/t/p/w500{movie.PosterPath}";
                    }
                }

                return result.Results;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching movies by genre ID: {GenreId}", genreId);
                return new List<ApiMovieDto>();
            }
        }

        public async Task<List<GenreDto>> GetGenresAsync()
        {
            try
            {
                var response = await _httpClient.GetAsync($"{_baseUrl}/genre/movie/list?api_key={_apiKey}");
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<TheMovieDbGenreResponse>(jsonResponse);

                return result.Genres;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching movie genres");
                return new List<GenreDto>();
            }
        }

        public async Task<List<ApiMovieDto>> GetSimilarMoviesAsync(string movieId, int count = 6)
        {
            try
            {
                var response = await _httpClient.GetAsync(
                    $"{_baseUrl}/movie/{movieId}/similar?api_key={_apiKey}&page=1");
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                var result = JsonSerializer.Deserialize<TheMovieDbSearchResponse>(jsonResponse);
                var movies = result.Results.Take(count).ToList();
                foreach (var movie in movies)
                {
                    if (!string.IsNullOrEmpty(movie.PosterPath))
                    {
                        movie.PosterPath = $"https://image.tmdb.org/t/p/w500{movie.PosterPath}";
                    }
                }

                return movies;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error fetching similar movies for movie ID: {MovieId}", movieId);
                return new List<ApiMovieDto>();
            }
        }
        public class TheMovieDbSearchResponse
        {
            [JsonPropertyName("page")]
            public int Page { get; set; }
            [JsonPropertyName("results")]
            public List<ApiMovieDto> Results { get; set; }
            [JsonPropertyName("total_pages")]
            public int TotalPages { get; set; }
            [JsonPropertyName("total_results")]
            public int TotalResults { get; set; }
        }

        public class TheMovieDbGenreResponse
        {
            [JsonPropertyName("genres")]
            public List<GenreDto> Genres { get; set; }
        }
    }
}
