using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;
using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.DTOs;
using WatchPartyApp.Services.InMemory;

namespace WatchPartyApp.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class RoomController : ControllerBase
    {
        private readonly IRoomService _roomService;
        private readonly InMemoryRoomManager _roomManager;
        private readonly ILogger<RoomController> _logger;

        public RoomController(
            IRoomService roomService,
            InMemoryRoomManager roomManager,
            ILogger<RoomController> logger)
        {
            _roomService = roomService;
            _roomManager = roomManager;
            _logger = logger;
        }

        [HttpGet("active")]
        public async Task<IActionResult> GetActiveRooms()
        {
            var rooms = await _roomService.GetActiveRoomsAsync();
            
            // Enhance with participant count from in-memory store
            var enhancedRooms = rooms.Select(room => 
            {
                room.UserCount = _roomManager.GetParticipantCount(room.Id);
                return room;
            }).ToList();
            
            return Ok(enhancedRooms);
        }

        [HttpGet("{roomId}/participants")]
        public async Task<IActionResult> GetRoomParticipants(string roomId)
        {
            // Check if room exists
            var room = await _roomService.GetRoomByIdAsync(roomId);
            if (room == null)
            {
                return NotFound("Room not found");
            }

            // Get participants from in-memory store
            var participants = _roomManager.GetRoomParticipants(roomId);
            var participantDtos = participants.Select(p => new RoomParticipantDto
            {
                Id = p.Id,
                DisplayName = p.DisplayName,
                AvatarUrl = p.AvatarUrl,
                HasControl = p.HasControl,
                JoinedAt = p.JoinedAt,
                IsAdmin = p.Id == room.AdminId
            }).ToList();

            return Ok(participantDtos);
        }

        [HttpGet("{roomId}/messages")]
        public async Task<IActionResult> GetRoomMessages(string roomId)
        {
            // Check if room exists
            var room = await _roomService.GetRoomByIdAsync(roomId);
            if (room == null)
            {
                return NotFound("Room not found");
            }

            // Get messages from in-memory store
            var messages = _roomManager.GetRoomMessages(roomId);
            var messageDtos = messages.Select(m => new ChatMessageDto
            {
                Id = m.Id,
                SenderId = m.SenderId,
                SenderName = m.SenderName,
                AvatarUrl = m.AvatarUrl,
                Content = m.Content,
                SentAt = m.SentAt
            }).ToList();

            return Ok(messageDtos);
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
            
            // Enhance with participant count from in-memory store
            var enhancedRooms = rooms.Select(room => 
            {
                room.UserCount = _roomManager.GetParticipantCount(room.Id);
                return room;
            }).ToList();
            
            return Ok(enhancedRooms);
        }

        [HttpGet("{roomId}")]
        public async Task<IActionResult> GetRoomById(string roomId)
        {
            var room = await _roomService.GetRoomByIdAsync(roomId);
            if (room == null)
            {
                return NotFound();
            }

            // Create detailed DTO with participant information
            var participants = _roomManager.GetRoomParticipants(roomId);
            var participantDtos = participants.Select(p => new RoomParticipantDto
            {
                Id = p.Id,
                DisplayName = p.DisplayName,
                AvatarUrl = p.AvatarUrl,
                HasControl = p.HasControl,
                JoinedAt = p.JoinedAt,
                IsAdmin = p.Id == room.AdminId
            }).ToList();

            var roomDetailDto = new RoomDetailDto
            {
                Id = room.Id,
                Name = room.Name,
                VideoUrl = room.VideoUrl,
                AdminId = room.AdminId,
                AdminName = "Admin", // Will need to get from user service
                IsActive = room.IsActive,
                CreatedAt = room.CreatedAt,
                InviteCode = room.InviteCode,
                IsPrivate = room.IsPrivate,
                HasPassword = !string.IsNullOrEmpty(room.PasswordHash),
                UserCount = participants.Count,
                CurrentPosition = room.CurrentPosition,
                IsPlaying = room.IsPlaying,
                SyncMode = room.SyncMode,
                AutoPlay = room.AutoPlay,
                Participants = participantDtos
            };

            return Ok(roomDetailDto);
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
                AdminName = "Admin"
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
        [HttpPost("{roomId}/transfer-control")]
        public async Task<IActionResult> TransferControl(string roomId, [FromBody] TransferControlDto transferDto)
        {
            var currentUserId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(currentUserId))
            {
                return Unauthorized();
            }

            // Check if user is admin
            bool isAdmin = await _roomService.IsUserAdminAsync(roomId, currentUserId);
            if (!isAdmin)
            {
                return Forbid("Only room administrators can transfer control.");
            }

            // Check if target participant exists
            var targetParticipant = _roomManager.GetParticipant(roomId, transferDto.NewControllerId);
            if (targetParticipant == null)
            {
                return BadRequest("Target participant not found in room.");
            }

            // Transfer control
            _roomManager.SetController(roomId, transferDto.NewControllerId);

            return Ok(new { message = "Control transferred successfully" });
        }

        [Authorize]
        [HttpPost("{roomId}/take-control")]
        public async Task<IActionResult> TakeControl(string roomId)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(userId))
            {
                return Unauthorized();
            }

            // Check if user is admin
            bool isAdmin = await _roomService.IsUserAdminAsync(roomId, userId);
            if (!isAdmin)
            {
                return Forbid("Only room administrators can take control.");
            }

            // Check if admin is in the room
            var adminParticipant = _roomManager.GetParticipant(roomId, userId);
            if (adminParticipant == null)
            {
                return BadRequest("You must be in the room to take control.");
            }

            // Transfer control to admin
            _roomManager.SetController(roomId, userId);

            return Ok(new { message = "Control taken successfully" });
        }

        // Simplified endpoints - no more join/leave since they're handled via SignalR
    }

    public class TransferControlDto
    {
        public required string NewControllerId { get; set; }
    }
}
