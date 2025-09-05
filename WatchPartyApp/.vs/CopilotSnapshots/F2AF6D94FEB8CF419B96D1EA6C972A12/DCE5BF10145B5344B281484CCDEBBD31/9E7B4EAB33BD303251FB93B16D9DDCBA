using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.Common;
using WatchPartyApp.Data;
using WatchPartyApp.DTOs;
using WatchPartyApp.Models;

namespace WatchPartyApp.BusinessLogic.Services
{
    public class MovieService : IMovieService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMovieApiService _movieApiService;
        private readonly ILogger<MovieService> _logger;

        public MovieService(
            IUnitOfWork unitOfWork,
            IMovieApiService movieApiService,
            ILogger<MovieService> logger)
        {
            _unitOfWork = unitOfWork;
            _movieApiService = movieApiService;
            _logger = logger;
        }
        public async Task<PaginatedResponse<MovieDto>> GetMoviesAsync(MovieQueryFilter filter)
        {
            try
            {
                if (!string.IsNullOrEmpty(filter.Search))
                {
                    var apiResult = await _movieApiService.SearchMoviesAsync(filter.Search, filter.Page);
                    return new PaginatedResponse<MovieDto>
                    {
                        Items = apiResult.Items.Select(m => m.ToMovieDto()),
                        CurrentPage = apiResult.CurrentPage,
                        TotalPages = apiResult.TotalPages,
                        TotalItems = apiResult.TotalItems,
                        HasNextPage = apiResult.HasNextPage,
                        HasPreviousPage = apiResult.HasPreviousPage
                    };
                }
                var popularMovies = await _movieApiService.GetPopularMoviesAsync(filter.Page);
                return new PaginatedResponse<MovieDto>
                {
                    Items = popularMovies.Items.Select(m => m.ToMovieDto()),
                    CurrentPage = popularMovies.CurrentPage,
                    TotalPages = popularMovies.TotalPages,
                    TotalItems = popularMovies.TotalItems,
                    HasNextPage = popularMovies.HasNextPage,
                    HasPreviousPage = popularMovies.HasPreviousPage
                };
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting movies with filter: {Filter}", filter);
                throw;
            }
        }
        public async Task<MovieDetailDto> GetMovieByIdAsync(string id)
        {
            try
            {
                var localMovie = await _unitOfWork.Movies.GetMovieByIdAsync(id);
                if (localMovie != null)
                {
                    return MapToDetailDto(localMovie);
                }
                var apiMovie = await _movieApiService.GetMovieAsync(id);
                if (apiMovie == null)
                {
                    return null;
                }
                var movieDetail = apiMovie.ToMovieDetailDto();
                string userId = null;
                if (!string.IsNullOrEmpty(userId))
                {
                    movieDetail.IsInWatchLater = await IsInWatchLaterListAsync(userId, id);
                }

                return movieDetail;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting movie by ID: {Id}", id);
                throw;
            }
        }

        public async Task<IEnumerable<MovieDto>> GetMoviesByGenreAsync(int genreId, int page = 1, int pageSize = 10)
        {
            try
            {
                var apiMovies = await _movieApiService.GetMoviesByGenreAsync(genreId, page);
                return apiMovies.Select(m => m.ToMovieDto());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting movies by genre: {GenreId}", genreId);
                throw;
            }
        }

        public async Task<IEnumerable<MovieDto>> GetTopRatedMoviesAsync(int count = 10)
        {
            try
            {
                var popularMovies = await _movieApiService.GetPopularMoviesAsync(1);
                return popularMovies.Items.Take(count).Select(m => m.ToMovieDto());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting top rated movies");
                throw;
            }
        }

        public async Task<IEnumerable<MovieDto>> GetSimilarMoviesAsync(string movieId, int count = 6)
        {
            try
            {
                var apiMovies = await _movieApiService.GetSimilarMoviesAsync(movieId, count);
                return apiMovies.Select(m => m.ToMovieDto());
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting similar movies for movie ID: {MovieId}", movieId);
                throw;
            }
        }
        public async Task AddToWatchLaterAsync(string userId, string movieId)
        {
            try
            {
                var existing = (await _unitOfWork.WatchLaterItems.GetAllAsync())
                    .FirstOrDefault(wl => wl.UserId == userId && wl.MovieId == movieId);

                if (existing == null)
                {
                    var movie = await _unitOfWork.Movies.GetMovieByIdAsync(movieId);
                    if (movie == null)
                    {
                        var apiMovie = await _movieApiService.GetMovieAsync(movieId);
                        if (apiMovie == null)
                        {
                            throw new Exception($"Movie with ID {movieId} not found");
                        }
                        movie = new Movie
                        {
                            Id = movieId,
                            Title = apiMovie.Title,
                            PosterUrl = apiMovie.PosterPath,
                            Description = apiMovie.Overview,
                            StreamingUrl = apiMovie.StreamingUrl,
                            ReleaseYear = apiMovie.ReleaseDate.Year.ToString(),
                            Rating = apiMovie.VoteAverage,
                            Duration = TimeSpan.FromMinutes(apiMovie.Runtime),
                            AddedAt = DateTime.UtcNow,
                            LastUpdatedAt = DateTime.UtcNow
                        };

                        await _unitOfWork.Movies.CreateAsync(movie);
                        await _unitOfWork.SaveAsync();
                    }
                    var watchLater = new WatchLater
                    {
                        Id = Guid.NewGuid().ToString(),
                        UserId = userId,
                        MovieId = movieId,
                        AddedAt = DateTime.UtcNow
                    };

                    await _unitOfWork.WatchLaterItems.CreateAsync(watchLater);
                    await _unitOfWork.SaveAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding movie to watch later. UserId: {UserId}, MovieId: {MovieId}", userId, movieId);
                throw;
            }
        }

        public async Task RemoveFromWatchLaterAsync(string userId, string movieId)
        {
            try
            {
                var watchLaterItems = await _unitOfWork.WatchLaterItems.GetAllAsync();
                var item = watchLaterItems.FirstOrDefault(wl => wl.UserId == userId && wl.MovieId == movieId);

                if (item != null)
                {
                    await _unitOfWork.WatchLaterItems.DeleteAsync(item.Id);
                    await _unitOfWork.SaveAsync();
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing movie from watch later. UserId: {UserId}, MovieId: {MovieId}", userId, movieId);
                throw;
            }
        }

        public async Task<IEnumerable<MovieDto>> GetWatchLaterListAsync(string userId)
        {
            try
            {
                var watchLaterItems = await _unitOfWork.WatchLaterItems.GetAllAsync();
                var userWatchLater = watchLaterItems
                    .Where(wl => wl.UserId == userId)
                    .OrderByDescending(wl => wl.AddedAt)
                    .ToList();

                var movieIds = userWatchLater.Select(wl => wl.MovieId).ToList();
                var allMovies = (await _unitOfWork.Movies.GetAllAsync()).ToList();
                var watchLaterMovies = allMovies.Where(m => movieIds.Contains(m.Id)).ToList();

                return watchLaterMovies.Select(MapToDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting watch later list for user: {UserId}", userId);
                throw;
            }
        }

        public async Task<bool> IsInWatchLaterListAsync(string userId, string movieId)
        {
            try
            {
                var watchLaterItems = await _unitOfWork.WatchLaterItems.GetAllAsync();
                return watchLaterItems.Any(wl => wl.UserId == userId && wl.MovieId == movieId);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if movie is in watch later. UserId: {UserId}, MovieId: {MovieId}", userId, movieId);
                throw;
            }
        }
        public async Task<Movie> SaveMovieForRoomAsync(string movieId)
        {
            var existingMovie = await _unitOfWork.Movies.GetMovieByIdAsync(movieId);
            if (existingMovie != null)
            {
                return existingMovie;
            }
            var apiMovie = await _movieApiService.GetMovieAsync(movieId);
            if (apiMovie == null)
            {
                return null;
            }
            var movie = new Movie
            {
                Id = movieId,
                Title = apiMovie.Title,
                Description = apiMovie.Overview,
                PosterUrl = apiMovie.PosterPath,
                ReleaseYear = apiMovie.ReleaseDate.Year.ToString(),
                Rating = apiMovie.VoteAverage,
                Duration = TimeSpan.FromMinutes(apiMovie.Runtime),
                StreamingUrl = apiMovie.StreamingUrl,
                AddedAt = DateTime.UtcNow,
                LastUpdatedAt = DateTime.UtcNow,
            };

            await _unitOfWork.Movies.CreateAsync(movie);
            if (apiMovie.Genres != null && apiMovie.Genres.Any())
            {
                foreach (var apiGenre in apiMovie.Genres)
                {
                    var genre = (await _unitOfWork.Genres.GetAllAsync())
                        .FirstOrDefault(g => g.Id == apiGenre.Id);

                    if (genre == null)
                    {
                        genre = new Genre { Id = apiGenre.Id, Name = apiGenre.Name };
                        await _unitOfWork.Genres.CreateAsync(genre);
                        await _unitOfWork.SaveAsync();
                    }
                    var movieGenre = new MovieGenre
                    {
                        MovieId = movie.Id,
                        GenreId = genre.Id
                    };
                    await _unitOfWork.MovieGenres.CreateAsync(movieGenre);
                }
            }

            await _unitOfWork.SaveAsync();
            return movie;
        }

        #region Helper Methods

        private MovieDto MapToDto(Movie movie)
        {
            return new MovieDto
            {
                Id = movie.Id,
                Title = movie.Title,
                PosterUrl = movie.PosterUrl,
                ReleaseYear = movie.ReleaseYear,
                Rating = movie.Rating,
                Duration = movie.Duration,
                Genres = movie.MovieGenres?.Select(mg => mg.Genre?.Name).Where(n => n != null).ToList() ?? new List<string>()
            };
        }

        private MovieDetailDto MapToDetailDto(Movie movie)
        {
            return new MovieDetailDto
            {
                Id = movie.Id,
                Title = movie.Title,
                Description = movie.Description,
                PosterUrl = movie.PosterUrl,
                ReleaseYear = movie.ReleaseYear,
                Rating = movie.Rating,
                Duration = movie.Duration,
                StreamingUrl = movie.StreamingUrl,
                AddedAt = movie.AddedAt,
                ActiveRoomsCount = movie.Rooms?.Where(r => r.MovieId == movie.Id).Count(r => r.IsActive) ?? 0,
                Genres = movie.MovieGenres?
                    .Select(mg => new GenreDto
                    {
                        Id = mg.Genre.Id,
                        Name = mg.Genre.Name
                    })
                    .ToList() ?? new List<GenreDto>()
            };
        }

        #endregion
    }
}
