using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.Common;
using WatchPartyApp.DTOs;

namespace WatchPartyApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class MoviesController : ControllerBase
    {
        private readonly IMovieService _movieService;
        private readonly ILogger<MoviesController> _logger;

        public MoviesController(IMovieService movieService, ILogger<MoviesController> logger)
        {
            _movieService = movieService;
            _logger = logger;
        }

        /// <summary>
        /// Get movies with optional search and pagination
        /// </summary>
        [HttpGet]
        public async Task<ActionResult<PaginatedResponse<MovieDto>>> GetMovies([FromQuery] MovieQueryFilter filter)
        {
            try
            {
                var movies = await _movieService.GetMoviesAsync(filter);
                return Ok(movies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving movies");
                return StatusCode(500, "An error occurred while retrieving movies");
            }
        }

        /// <summary>
        /// Get a movie by ID
        /// </summary>
        [HttpGet("{id}")]
        public async Task<ActionResult<MovieDetailDto>> GetMovie(string id)
        {
            try
            {
                var movie = await _movieService.GetMovieByIdAsync(id);
                if (movie == null)
                {
                    return NotFound($"Movie with ID {id} not found");
                }

                // If user is authenticated, check if movie is in their watch later list
                if (User.Identity.IsAuthenticated)
                {
                    var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                    movie.IsInWatchLater = await _movieService.IsInWatchLaterListAsync(userId, id);
                }

                return Ok(movie);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving movie with ID {Id}", id);
                return StatusCode(500, "An error occurred while retrieving the movie");
            }
        }

        /// <summary>
        /// Get movies by genre
        /// </summary>
        [HttpGet("genre/{genreId}")]
        public async Task<ActionResult<IEnumerable<MovieDto>>> GetMoviesByGenre(int genreId, [FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var movies = await _movieService.GetMoviesByGenreAsync(genreId, page, pageSize);
                return Ok(movies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving movies for genre {GenreId}", genreId);
                return StatusCode(500, "An error occurred while retrieving movies by genre");
            }
        }

        /// <summary>
        /// Get top rated movies
        /// </summary>
        [HttpGet("top-rated")]
        public async Task<ActionResult<IEnumerable<MovieDto>>> GetTopRatedMovies([FromQuery] int count = 10)
        {
            try
            {
                var movies = await _movieService.GetTopRatedMoviesAsync(count);
                return Ok(movies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving top rated movies");
                return StatusCode(500, "An error occurred while retrieving top rated movies");
            }
        }

        /// <summary>
        /// Get similar movies
        /// </summary>
        [HttpGet("{id}/similar")]
        public async Task<ActionResult<IEnumerable<MovieDto>>> GetSimilarMovies(string id, [FromQuery] int count = 6)
        {
            try
            {
                var movies = await _movieService.GetSimilarMoviesAsync(id, count);
                return Ok(movies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving similar movies for movie ID {MovieId}", id);
                return StatusCode(500, "An error occurred while retrieving similar movies");
            }
        }

        /// <summary>
        /// Get the authenticated user's watch later list
        /// </summary>
        [Authorize]
        [HttpGet("watch-later")]
        public async Task<ActionResult<IEnumerable<MovieDto>>> GetWatchLaterList()
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var movies = await _movieService.GetWatchLaterListAsync(userId);
                return Ok(movies);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error retrieving watch later list");
                return StatusCode(500, "An error occurred while retrieving your watch later list");
            }
        }

        /// <summary>
        /// Add a movie to the authenticated user's watch later list
        /// </summary>
        [Authorize]
        [HttpPost("watch-later/{id}")]
        public async Task<ActionResult> AddToWatchLater(string id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                await _movieService.AddToWatchLaterAsync(userId, id);
                return Ok(new { message = "Movie added to watch later list" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error adding movie {MovieId} to watch later", id);
                return StatusCode(500, "An error occurred while adding the movie to your watch later list");
            }
        }

        /// <summary>
        /// Remove a movie from the authenticated user's watch later list
        /// </summary>
        [Authorize]
        [HttpDelete("watch-later/{id}")]
        public async Task<ActionResult> RemoveFromWatchLater(string id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                await _movieService.RemoveFromWatchLaterAsync(userId, id);
                return Ok(new { message = "Movie removed from watch later list" });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error removing movie {MovieId} from watch later", id);
                return StatusCode(500, "An error occurred while removing the movie from your watch later list");
            }
        }

        /// <summary>
        /// Check if a movie is in the authenticated user's watch later list
        /// </summary>
        [Authorize]
        [HttpGet("watch-later/check/{id}")]
        public async Task<ActionResult<bool>> IsInWatchLater(string id)
        {
            try
            {
                var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
                var isInWatchLater = await _movieService.IsInWatchLaterListAsync(userId, id);
                return Ok(isInWatchLater);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if movie {MovieId} is in watch later", id);
                return StatusCode(500, "An error occurred while checking your watch later list");
            }
        }
    }
}
