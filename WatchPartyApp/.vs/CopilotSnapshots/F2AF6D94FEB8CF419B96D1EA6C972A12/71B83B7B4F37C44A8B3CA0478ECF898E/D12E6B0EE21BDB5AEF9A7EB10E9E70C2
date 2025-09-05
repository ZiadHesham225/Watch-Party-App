using Microsoft.EntityFrameworkCore;
using WatchPartyApp.Common;
using WatchPartyApp.Data;
using WatchPartyApp.DataAccess.Interfaces;
using WatchPartyApp.Models;

namespace WatchPartyApp.DataAccess.Repositories
{
    public class MovieRepository : GenericRepository<Movie>, IMovieRepository
    {
        public MovieRepository(WatchPartyDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Movie>> GetAllMoviesAsync(MovieQueryFilter filter)
        {
            var query = dbSet.AsQueryable();

            if (!string.IsNullOrEmpty(filter.Search))
            {
                query = query.Where(m => m.Title.Contains(filter.Search));
            }

            if (filter.GenresIds.Any())
            {
                query = query.Where(m => m.MovieGenres.Any(g => filter.GenresIds.Contains(g.GenreId)));
            }

            if (filter.Year.Length != 0)
            {
                query = query.Where(m => m.ReleaseYear == filter.Year);
            }

            switch (filter.SortBy?.ToLower())
            {
                case "rating":
                    query = filter.SortDirection == "desc" ?
                        query.OrderByDescending(m => m.Rating) :
                        query.OrderBy(m => m.Rating);
                    break;
                case "releasedate":
                    query = filter.SortDirection == "desc" ?
                        query.OrderByDescending(m => m.ReleaseYear) :
                        query.OrderBy(m => m.ReleaseYear);
                    break;
                case "title":
                    query = filter.SortDirection == "desc" ?
                        query.OrderByDescending(m => m.Title) :
                        query.OrderBy(m => m.Title);
                    break;
                default:
                    query = query.OrderByDescending(m => m.AddedAt);
                    break;
            }
            query = query.Include(m => m.MovieGenres)
                         .ThenInclude(mg => mg.Genre);

            var paginatedList = await PaginatedList<Movie>.CreateAsync(query, filter.Page);
            return paginatedList;
        }

        public async Task<Movie> GetMovieByIdAsync(string id)
        {
            return await _context.Movies
                .Include(m => m.MovieGenres)
                    .ThenInclude(mg => mg.Genre)
                .FirstOrDefaultAsync(m => m.Id == id);
        }

        public async Task<IEnumerable<Movie>> GetMoviesByGenreAsync(int genreId)
        {
            return await _context.Movies
                .Include(m => m.MovieGenres)
                    .ThenInclude(mg => mg.Genre)
                .Where(m => m.MovieGenres.Any(mg => mg.GenreId == genreId))
                .ToListAsync();
        }
        public async Task<IEnumerable<Movie>> GetSimilarMoviesAsync(string movieId, int count)
        {
            var movie = await GetMovieByIdAsync(movieId);

            if (movie == null)
                return new List<Movie>();
            var genreIds = movie.MovieGenres.Select(mg => mg.GenreId).ToList();
            return await _context.Movies
                .Where(m => m.Id != movieId &&
                           m.MovieGenres.Any(mg => genreIds.Contains(mg.GenreId)))
                .Include(m => m.MovieGenres)
                    .ThenInclude(mg => mg.Genre)
                .OrderByDescending(m => m.MovieGenres.Count(mg => genreIds.Contains(mg.GenreId)))
                .ThenByDescending(m => m.Rating)
                .Take(count)
                .ToListAsync();
        }

        public async Task<IEnumerable<Movie>> GetTopRatedMoviesAsync(int count)
        {
            return await _context.Movies
                .Include(m => m.MovieGenres)
                    .ThenInclude(mg => mg.Genre)
                .OrderByDescending(m => m.Rating)
                .Take(count)
                .ToListAsync();
        }

        public async Task<IEnumerable<Movie>> SearchMoviesAsync(MovieQueryFilter filter)
        {
            return await GetAllMoviesAsync(filter);
        }
    }
}
