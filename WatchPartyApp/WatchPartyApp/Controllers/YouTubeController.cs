using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using WatchPartyApp.DTOs;
using WatchPartyApp.BusinessLogic.Interfaces;

namespace WatchPartyApp.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class YouTubeController : ControllerBase
    {
        private readonly IYouTubeService _youTubeService;
        private readonly ILogger<YouTubeController> _logger;

        public YouTubeController(IYouTubeService youTubeService, ILogger<YouTubeController> logger)
        {
            _youTubeService = youTubeService;
            _logger = logger;
        }

        [HttpGet("search")]
        public async Task<ActionResult<YouTubeSearchResponse>> SearchVideos(
            [FromQuery] string query,
            [FromQuery] int maxResults = 10,
            [FromQuery] string? pageToken = null)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(query))
                {
                    return BadRequest("Search query is required");
                }

                if (maxResults < 1 || maxResults > 50)
                {
                    return BadRequest("Max results must be between 1 and 50");
                }

                var result = await _youTubeService.SearchVideosAsync(query, maxResults, pageToken);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error searching YouTube videos");
                return StatusCode(500, "An error occurred while searching videos");
            }
        }

        [HttpGet("video/{videoId}")]
        public async Task<ActionResult<YouTubeVideoDto>> GetVideoDetails(string videoId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(videoId))
                {
                    return BadRequest("Video ID is required");
                }

                var video = await _youTubeService.GetVideoDetailsAsync(videoId);
                if (video == null)
                {
                    return NotFound("Video not found");
                }

                return Ok(video);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting YouTube video details");
                return StatusCode(500, "An error occurred while getting video details");
            }
        }

        [HttpGet("stream/{videoId}")]
        public IActionResult StreamVideo(string videoId)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(videoId))
                {
                    return BadRequest("Video ID is required");
                }

                // For now, return the YouTube embed URL that works better with HTML5 video
                // This is a temporary solution - in production you'd want to use yt-dlp or similar
                var embedUrl = $"https://www.youtube.com/embed/{videoId}?autoplay=0&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0";
                
                // Return a redirect to the embed URL for now
                // Later this can be enhanced to proxy actual video streams
                return Redirect(embedUrl);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error streaming YouTube video");
                return StatusCode(500, "An error occurred while streaming the video");
            }
        }
    }
}