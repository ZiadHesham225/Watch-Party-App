using WatchPartyApp.Common;
using WatchPartyApp.DTOs;

namespace WatchPartyApp.BusinessLogic.Interfaces
{
    public interface IMovieApiService
    {
        Task<ApiMovieDto> GetMovieAsync(string movieId);
        Task<PaginatedResponse<ApiMovieDto>> SearchMoviesAsync(string query, int page = 1);
        Task<PaginatedResponse<ApiMovieDto>> GetPopularMoviesAsync(int page = 1);
        Task<List<ApiMovieDto>> GetMoviesByGenreAsync(int genreId, int page = 1);
        Task<List<GenreDto>> GetGenresAsync();
        Task<List<ApiMovieDto>> GetSimilarMoviesAsync(string movieId, int count = 6);
    }
}
