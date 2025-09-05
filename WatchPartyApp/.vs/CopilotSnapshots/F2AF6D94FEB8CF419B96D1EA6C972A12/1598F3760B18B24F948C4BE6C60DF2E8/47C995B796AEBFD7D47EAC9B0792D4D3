using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.DTOs;

namespace WatchPartyApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomController : ControllerBase
    {
        private readonly IRoomService _roomService;
        private readonly ILogger<RoomController> _logger;

        public RoomController(
            IRoomService roomService,
            ILogger<RoomController> logger)
        {
            _roomService = roomService;
            _logger = logger;
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveRooms()
        {
            var rooms = await _roomService.GetActiveRoomsAsync();
            return Ok(rooms);
        }
        [HttpGet("{roomId}/users")]
        public async Task<IActionResult> GetRoomUsers(string roomId)
        {
            var roomUsers = await _roomService.GetRoomUsersAsync(roomId);
            if (roomUsers == null)
            {
                return NotFound("Room not found");
            }

            return Ok(roomUsers);
        }

        [HttpGet("{roomId}/registered-users")]
        public async Task<IActionResult> GetRegisteredRoomUsers(string roomId)
        {
            var registeredUsers = await _roomService.GetRegisteredRoomUsersAsync(roomId);
            if (registeredUsers == null)
            {
                return NotFound("Room not found");
            }

            return Ok(registeredUsers);
        }

        [Authorize]
        [HttpGet("my-rooms")]
        public async Task<IActionResult> GetUserRooms()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }
            var rooms = await _roomService.GetUserRoomsAsync(userId);
            return Ok(rooms);
        }

        [HttpGet("{roomId}")]
        public async Task<IActionResult> GetRoomById(string roomId)
        {
            var room = await _roomService.GetRoomByIdAsync(roomId);
            if (room == null)
            {
                return NotFound();
            }
            return Ok(room);
        }

        [HttpGet("invite/{inviteCode}")]
        public async Task<IActionResult> GetRoomByInviteCode(string inviteCode)
        {
            var room = await _roomService.GetRoomByInviteCodeAsync(inviteCode);
            if (room == null)
            {
                return NotFound();
            }
            return Ok(new
            {
                room.Id,
                room.Name,
                room.IsPrivate,
                RequiresPassword = !string.IsNullOrEmpty(room.PasswordHash),
                MovieId = room.MovieId,
                MovieTitle = room.Movie?.Title,
                MoviePosterUrl = room.Movie?.PosterUrl,
                AdminName = room.Admin?.DisplayName ?? room.Admin?.UserName
            });
        }

        [Authorize]
        [HttpPost("create")]
        public async Task<IActionResult> CreateRoom([FromBody] RoomCreateDto roomDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var room = await _roomService.CreateRoomAsync(roomDto, userId);
            if (room == null)
            {
                return BadRequest("Unable to create room");
            }
            var inviteLink = await _roomService.GenerateInviteLink(room.Id);

            return Ok(new
            {
                room.Id,
                room.Name,
                room.InviteCode,
                InviteLink = inviteLink
            });
        }

        [Authorize]
        [HttpPut("update")]
        public async Task<IActionResult> UpdateRoom([FromBody] RoomUpdateDto roomDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _roomService.UpdateRoomAsync(roomDto, userId);
            if (!success)
            {
                return BadRequest("Unable to update room");
            }

            return Ok();
        }

        [Authorize]
        [HttpPost("{roomId}/end")]
        public async Task<IActionResult> EndRoom(string roomId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _roomService.EndRoomAsync(roomId, userId);
            if (!success)
            {
                return BadRequest("Unable to end room");
            }

            return Ok();
        }

        [Authorize]
        [HttpPost("{roomId}/join")]
        public async Task<IActionResult> JoinRoom(string roomId, [FromBody] JoinRoomDto joinDto)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _roomService.JoinRoomAsync(roomId, userId, joinDto.Password);
            if (!success)
            {
                return BadRequest("Unable to join room");
            }

            return Ok();
        }

        [HttpPost("{roomId}/join-guest")]
        public async Task<IActionResult> JoinRoomAsGuest(string roomId, [FromBody] JoinAsGuestDto joinDto)
        {
            if (string.IsNullOrEmpty(joinDto.DisplayName))
            {
                return BadRequest("Display name is required");
            }

            var success = await _roomService.JoinRoomAsGuestAsync(roomId, joinDto.DisplayName, joinDto.Password);
            if (!success)
            {
                return BadRequest("Unable to join room");
            }

            return Ok();
        }

        [Authorize]
        [HttpPost("{roomId}/leave")]
        public async Task<IActionResult> LeaveRoom(string roomId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            var success = await _roomService.LeaveRoomAsync(roomId, userId);
            if (!success)
            {
                return BadRequest("Unable to leave room");
            }

            return Ok();
        }

        [HttpPost("{roomId}/leave-guest")]
        public async Task<IActionResult> GuestLeaveRoom(string roomId, string guestId)
        {
            if (string.IsNullOrEmpty(guestId))
            {
                return BadRequest("Guest ID is required");
            }

            var success = await _roomService.GuestLeaveRoomAsync(roomId, guestId);
            if (!success)
            {
                return BadRequest("Unable to leave room");
            }

            return Ok();
        }
        [Authorize]
        [HttpPost("{roomId}/transfer-admin")]
        public async Task<IActionResult> TransferAdmin(string roomId, string newAdminId)
        {
            if (string.IsNullOrEmpty(newAdminId))
            {
                return BadRequest("New admin ID is required");
            }
            var currentAdminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentAdminId))
            {
                return Unauthorized();
            }

            var success = await _roomService.TransferAdminAsync(roomId, currentAdminId, newAdminId);
            if (!success)
            {
                return BadRequest("Unable to transfer admin rights");
            }

            return Ok(new { message = "Admin rights transferred successfully" });
        }

        [Authorize]
        [HttpPut("{roomId}/permissions/{targetUserId}")]
        public async Task<IActionResult> UpdateUserPermissions(
            string roomId,
            string targetUserId,
            [FromBody] RoomUserPermissionDto permissions)
        {
            var adminId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(adminId))
            {
                return Unauthorized();
            }

            var success = await _roomService.UpdateUserPermissionsAsync(roomId, targetUserId, adminId, permissions);
            if (!success)
            {
                return BadRequest("Unable to update permissions");
            }

            return Ok();
        }
    }
}
