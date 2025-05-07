using WatchPartyApp.Common;
using WatchPartyApp.Models;

namespace WatchPartyApp.DataAccess.Interfaces
{
    public interface IMovieRepository : IGenericRepository<Movie>
    {
        Task<IEnumerable<Movie>> GetAllMoviesAsync(MovieQueryFilter filter);
        Task<Movie> GetMovieByIdAsync(string id);
        Task<IEnumerable<Movie>> GetMoviesByGenreAsync(int genreId);
        Task<IEnumerable<Movie>> SearchMoviesAsync(MovieQueryFilter filter);
        Task<IEnumerable<Movie>> GetTopRatedMoviesAsync(int count);
        Task<IEnumerable<Movie>> GetSimilarMoviesAsync(string movieId, int count);
    }
}
