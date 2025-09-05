using WatchPartyApp.Common;
using WatchPartyApp.DTOs;
using WatchPartyApp.Models;

namespace WatchPartyApp.BusinessLogic.Interfaces
{
    public interface IMovieService
    {
        Task<PaginatedResponse<MovieDto>> GetMoviesAsync(MovieQueryFilter filter);
        Task<MovieDetailDto> GetMovieByIdAsync(string id);
        Task<IEnumerable<MovieDto>> GetMoviesByGenreAsync(int genreId, int page = 1, int pageSize = 10);
        Task<IEnumerable<MovieDto>> GetTopRatedMoviesAsync(int count = 10);
        Task<IEnumerable<MovieDto>> GetSimilarMoviesAsync(string movieId, int count = 6);
        Task AddToWatchLaterAsync(string userId, string movieId);
        Task RemoveFromWatchLaterAsync(string userId, string movieId);
        Task<IEnumerable<MovieDto>> GetWatchLaterListAsync(string userId);
        Task<bool> IsInWatchLaterListAsync(string userId, string movieId);
        Task<Movie> SaveMovieForRoomAsync(string movieId);
    }
}
