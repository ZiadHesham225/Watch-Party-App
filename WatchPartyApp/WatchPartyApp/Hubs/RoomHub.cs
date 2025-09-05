using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Security.Claims;
using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.DTOs;
using WatchPartyApp.Models;
using WatchPartyApp.Services.InMemory;
using WatchPartyApp.Models.InMemory;

namespace WatchPartyApp.Hubs
{
    public class RoomHub : Hub<IRoomClient>
    {
        private readonly IRoomService _roomService;
        private readonly InMemoryRoomManager _roomManager;
        private readonly ILogger<RoomHub> _logger;
        private readonly UserManager<ApplicationUser> _userManager;

        // Track position reports for sync
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, double>>
            _positionReports = new(); // roomId -> connectionId -> position

        public RoomHub(
            IRoomService roomService,
            InMemoryRoomManager roomManager,
            ILogger<RoomHub> logger,
            UserManager<ApplicationUser> userManager)
        {
            _roomService = roomService;
            _roomManager = roomManager;
            _logger = logger;
            _userManager = userManager;
        }

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
            _logger.LogInformation($"Client connected: {Context.ConnectionId}");
        }

        public override async Task OnDisconnectedAsync(Exception? exception)
        {
            try
            {
                var roomId = GetUserRoom();

                if (!string.IsNullOrEmpty(roomId))
                {
                    await LeaveRoom(roomId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error in OnDisconnectedAsync for connection {Context.ConnectionId}");
            }

            await base.OnDisconnectedAsync(exception);
        }

        #region Room Management

        [Authorize]
        public async Task JoinRoom(string roomId, string? password = null)
        {
            try
            {
                var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    await Clients.Caller.Error("User not found.");
                    return;
                }
                var user = await _userManager.FindByIdAsync(userId);

                if (user == null)
                {
                    await Clients.Caller.Error("User not found.");
                    return;
                }

                _logger.LogInformation($"User {user.UserName} ({userId}) attempting to join room {roomId}.");
                
                // Verify room exists and user can join
                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    await Clients.Caller.Error("Room not found or no longer active.");
                    return;
                }

                string participantId = userId;
                bool isAdmin = participantId == room.AdminId;

                // Check password if room is private (but skip for admin/creator)
                if (room.IsPrivate && !isAdmin && !await _roomService.ValidateRoomPasswordAsync(roomId, password))
                {
                    await Clients.Caller.Error("Incorrect password.");
                    return;
                }
                
                _logger.LogInformation($"Authenticated user participant ID: {participantId}");

                // Log current room state before adding participant
                var currentParticipants = _roomManager.GetRoomParticipants(roomId);
                _logger.LogInformation($"BEFORE JOIN - Room {roomId} has {currentParticipants.Count} participants: [{string.Join(", ", currentParticipants.Select(p => $"{p.DisplayName}({p.Id})"))}]");
                
                // Check if this participant already exists
                var existingParticipant = _roomManager.GetParticipant(roomId, participantId);
                if (existingParticipant != null)
                {
                    _logger.LogWarning($"Participant {participantId} ({user.UserName}) is rejoining room {roomId}. Existing: {existingParticipant.DisplayName}");
                }

                // Add participant to in-memory store
                // First person to join gets control, or admin always gets control
                bool isFirstParticipant = _roomManager.GetParticipantCount(roomId) == 0;
                bool shouldHaveControl = isAdmin || isFirstParticipant;

                _logger.LogInformation($"Participant {participantId} ({user.UserName}) joining room {roomId}. IsAdmin: {isAdmin}, IsFirstParticipant: {isFirstParticipant}, ShouldHaveControl: {shouldHaveControl}");
                
                var participant = new RoomParticipant(
                    participantId, 
                    Context.ConnectionId, 
                    user.UserName ?? "Unknown User", 
                    user.AvatarUrl,
                    shouldHaveControl
                );

                // If admin is joining and someone else has control, transfer control to admin
                if (isAdmin && !isFirstParticipant)
                {
                    var currentController = _roomManager.GetController(roomId);
                    if (currentController != null && currentController.Id != participantId)
                    {
                        // Admin takes control
                        _roomManager.SetController(roomId, participantId);
                        shouldHaveControl = true; // Ensure admin gets control
                        participant.HasControl = true; // Update the participant object as well
                        
                        // Notify room about control transfer
                        await Clients.Group(roomId).ControlTransferred(participantId, user.UserName ?? "Unknown User");
                    }
                }

                // Add participant and check what happened
                _roomManager.AddParticipant(roomId, participant);

                // Log the state after adding
                var participantsAfterAdd = _roomManager.GetRoomParticipants(roomId);
                _logger.LogInformation($"AFTER ADD - Room {roomId} has {participantsAfterAdd.Count} participants: [{string.Join(", ", participantsAfterAdd.Select(p => $"{p.DisplayName}({p.Id})"))}]");

                // Ensure control consistency after adding participant
                _roomManager.EnsureControlConsistency(roomId);

                // Join SignalR group
                await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

                // Store context items
                Context.Items["RoomId"] = roomId;
                Context.Items["ParticipantId"] = participantId;
                Context.Items["DisplayName"] = user.UserName;

                // Notify the caller about their successful join with their actual participant ID
                await Clients.Caller.RoomJoined(roomId, participantId, user.UserName ?? "Unknown User", user.AvatarUrl ?? "");
                
                // Notify others and send current state
                await Clients.OthersInGroup(roomId).RoomJoined(roomId, participantId, user.UserName ?? "Unknown User", user.AvatarUrl ?? "");
                await Clients.OthersInGroup(roomId).ParticipantJoinedNotification(user.UserName ?? "Unknown User");

                // Send updated participant list to all users in the room
                var allParticipants = _roomManager.GetRoomParticipants(roomId);
                _logger.LogInformation($"Sending participant list to room {roomId}: {allParticipants.Count} participants");
                
                var allParticipantDtos = allParticipants.Select(p => new RoomParticipantDto
                {
                    Id = p.Id,
                    DisplayName = p.DisplayName,
                    AvatarUrl = p.AvatarUrl,
                    HasControl = p.HasControl,
                    JoinedAt = p.JoinedAt,
                    IsAdmin = p.Id == room.AdminId
                }).ToList();

                foreach (var dto in allParticipantDtos)
                {
                    _logger.LogInformation($"  - {dto.DisplayName} (ID: {dto.Id}, HasControl: {dto.HasControl})");
                }

                await Clients.Group(roomId).ReceiveRoomParticipants(allParticipantDtos);

                // Send current room state to joining user
                await Clients.Caller.ForceSyncPlayback(room.CurrentPosition, room.IsPlaying);
                
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

                await Clients.Caller.ReceiveRoomParticipants(participantDtos);
                
                // Send chat history
                var chatHistory = _roomManager.GetRoomMessages(roomId);
                var messageDtos = chatHistory.Select(m => new ChatMessageDto
                {
                    Id = m.Id,
                    SenderId = m.SenderId,
                    SenderName = m.SenderName,
                    AvatarUrl = m.AvatarUrl,
                    Content = m.Content,
                    SentAt = m.SentAt
                }).ToList();

                await Clients.Caller.ReceiveChatHistory(messageDtos);

                _logger.LogInformation($"User {participantId} joined room {roomId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error joining room {roomId}");
                await Clients.Caller.Error("An error occurred while joining the room.");
                throw;
            }
        }

        public async Task LeaveRoom(string roomId)
        {
            try
            {
                var participantId = Context.Items["ParticipantId"] as string;
                var displayName = Context.Items["DisplayName"] as string ?? "Unknown User";

                if (string.IsNullOrEmpty(participantId))
                {
                    return;
                }

                var participant = _roomManager.GetParticipant(roomId, participantId);
                bool wasController = participant?.HasControl ?? false;

                // Remove from in-memory store first
                _roomManager.RemoveParticipant(roomId, participantId);

                // Leave SignalR group
                await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);

                // Transfer control if the controller left and there are still participants
                if (wasController && _roomManager.GetParticipantCount(roomId) > 0)
                {
                    _logger.LogInformation($"Controller {participantId} left room {roomId}, transferring control to next participant");
                    _roomManager.TransferControlToNext(roomId, participantId);
                    
                    // Ensure consistency after transfer
                    _roomManager.EnsureControlConsistency(roomId);
                    
                    var newController = _roomManager.GetController(roomId);
                    if (newController != null)
                    {
                        await Clients.Group(roomId).ControlTransferred(newController.Id, newController.DisplayName);
                        _logger.LogInformation($"Control transferred to {newController.DisplayName} ({newController.Id}) in room {roomId}");
                    }
                    else
                    {
                        _logger.LogWarning($"No controller found after transfer in room {roomId}");
                    }
                }

                // Notify others
                await Clients.OthersInGroup(roomId).RoomLeft(roomId, participantId, displayName);
                await Clients.OthersInGroup(roomId).ParticipantLeftNotification(displayName);

                // Send updated participant list to remaining users (after control transfer)
                if (_roomManager.GetParticipantCount(roomId) > 0)
                {
                    var remainingParticipants = _roomManager.GetRoomParticipants(roomId);
                    var room = await _roomService.GetRoomByIdAsync(roomId);
                    var remainingParticipantDtos = remainingParticipants.Select(p => new RoomParticipantDto
                    {
                        Id = p.Id,
                        DisplayName = p.DisplayName,
                        AvatarUrl = p.AvatarUrl,
                        HasControl = p.HasControl,
                        JoinedAt = p.JoinedAt,
                        IsAdmin = room != null && p.Id == room.AdminId
                    }).ToList();

                    await Clients.Group(roomId).ReceiveRoomParticipants(remainingParticipantDtos);
                }

                // Clear context items
                Context.Items.Remove("RoomId");
                Context.Items.Remove("ParticipantId");
                Context.Items.Remove("DisplayName");

                // Check if room is empty and should be cleaned up
                if (_roomManager.GetParticipantCount(roomId) == 0)
                {
                    _roomManager.ClearRoomData(roomId);
                    _positionReports.TryRemove(roomId, out _);
                }

                _logger.LogInformation($"User {participantId} left room {roomId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error leaving room {roomId}");
                throw;
            }
        }

        public async Task GetRoomParticipants(string roomId)
        {
            try
            {
                var participants = _roomManager.GetRoomParticipants(roomId);
                var room = await _roomService.GetRoomByIdAsync(roomId);
                
                var participantDtos = participants.Select(p => new RoomParticipantDto
                {
                    Id = p.Id,
                    DisplayName = p.DisplayName,
                    AvatarUrl = p.AvatarUrl,
                    HasControl = p.HasControl,
                    JoinedAt = p.JoinedAt,
                    IsAdmin = room != null && p.Id == room.AdminId
                }).ToList();

                await Clients.Caller.ReceiveRoomParticipants(participantDtos);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error getting room participants for room {roomId}");
                await Clients.Caller.Error("Failed to get room participants.");
                throw;
            }
        }

        [Authorize]
        public async Task CloseRoom(string roomId)
        {
            try
            {
                var userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(userId))
                {
                    await Clients.Caller.Error("Authentication required to close rooms.");
                    return;
                }

                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, userId);
                if (!isAdmin)
                {
                    _logger.LogWarning($"Non-admin user {userId} attempted to close room {roomId}");
                    await Clients.Caller.Error("Only room administrators can close rooms.");
                    return;
                }

                bool success = await _roomService.EndRoomAsync(roomId, userId);
                if (!success)
                {
                    _logger.LogWarning($"Failed to end room {roomId} in database");
                    await Clients.Caller.Error("Failed to close the room.");
                    return;
                }

                await Clients.Group(roomId).RoomClosed(roomId, "Room closed by admin");

                _roomManager.ClearRoomData(roomId);
                _positionReports.TryRemove(roomId, out _);
                _logger.LogInformation($"Room {roomId} closed by admin {userId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error closing room {roomId}");
                await Clients.Caller.Error("An error occurred while closing the room.");
                throw;
            }
        }

        public async Task ChangeVideo(string roomId, string videoUrl, string videoTitle, string? videoThumbnail)
        {
            try
            {
                var participantId = Context.Items["ParticipantId"] as string;
                if (string.IsNullOrEmpty(participantId))
                {
                    await Clients.Caller.Error("Unable to identify participant.");
                    return;
                }

                var participant = _roomManager.GetParticipant(roomId, participantId);
                if (participant == null)
                {
                    await Clients.Caller.Error("You are not in this room.");
                    return;
                }

                // Check if user has control or is admin
                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, participantId);
                if (!participant.HasControl && !isAdmin)
                {
                    await Clients.Caller.Error("You don't have permission to change the video.");
                    return;
                }

                // Update room in database
                await _roomService.UpdateRoomVideoAsync(roomId, videoUrl);

                // Notify all participants
                await Clients.Group(roomId).VideoChanged(videoUrl, videoTitle, videoThumbnail);

                _logger.LogInformation($"Video changed in room {roomId} by {participantId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error changing video in room {roomId}");
                await Clients.Caller.Error("Failed to change video.");
                throw;
            }
        }
        #endregion

        #region Playback Control

        public async Task UpdatePlayback(string roomId, double position, bool isPlaying)
        {
            try
            {
                var participantId = Context.Items["ParticipantId"] as string;
                if (string.IsNullOrEmpty(participantId))
                {
                    await Clients.Caller.Error("Unable to identify participant.");
                    return;
                }

                var participant = _roomManager.GetParticipant(roomId, participantId);
                if (participant == null || !participant.HasControl)
                {
                    await Clients.Caller.Error("You don't have permission to control playback.");
                    return;
                }

                // Update database state
                await _roomService.UpdatePlaybackStateAsync(roomId, participantId, position, isPlaying);

                // Broadcast to all clients in the room
                await Clients.Group(roomId).ReceivePlaybackUpdate(position, isPlaying);

                _logger.LogDebug($"Playback updated in room {roomId}: pos={position}, playing={isPlaying}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating playback in room {roomId}");
                await Clients.Caller.Error("Failed to update playback state.");
                throw;
            }
        }

        public async Task RequestSync(string roomId)
        {
            try
            {
                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room != null && room.IsActive)
                {
                    await Clients.Caller.ForceSyncPlayback(room.CurrentPosition, room.IsPlaying);
                }
                else
                {
                    await Clients.Caller.Error("Room not found or no longer active.");
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error requesting sync for room {roomId}");
                await Clients.Caller.Error("Failed to sync playback.");
                throw;
            }
        }

        public async Task BroadcastHeartbeat(string roomId, double position)
        {
            try
            {
                var participantId = Context.Items["ParticipantId"] as string;
                if (string.IsNullOrEmpty(participantId))
                {
                    return;
                }

                var participant = _roomManager.GetParticipant(roomId, participantId);
                if (participant != null && participant.HasControl)
                {
                    await _roomService.UpdatePlaybackStateAsync(roomId, participantId, position, true);
                    await Clients.OthersInGroup(roomId).ReceiveHeartbeat(position);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error broadcasting heartbeat in room {roomId}");
            }
        }

        public async Task ReportPosition(string roomId, double position)
        {
            try
            {
                // Store the position report
                if (!_positionReports.TryGetValue(roomId, out var reports))
                {
                    reports = new ConcurrentDictionary<string, double>();
                    _positionReports[roomId] = reports;
                }

                reports[Context.ConnectionId] = position;

                // Get count of participants in room to determine if everyone has reported
                int totalParticipants = _roomManager.GetParticipantCount(roomId);
                int reportedParticipants = reports.Count;

                // If most participants have reported (80% or more), analyze and sync if needed
                if (reportedParticipants >= totalParticipants * 0.8 && reportedParticipants >= 2)
                {
                    await AnalyzeAndSyncPositions(roomId);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error reporting position in room {roomId}");
            }
        }

        private async Task AnalyzeAndSyncPositions(string roomId)
        {
            try
            {
                if (!_positionReports.TryGetValue(roomId, out var reports) || reports.Count < 2)
                {
                    return;
                }

                // Get the median position as the "correct" one
                var positions = reports.Values.OrderBy(p => p).ToList();
                double medianPosition = positions[positions.Count / 2];

                // Find outliers (more than 3 seconds off)
                const double tolerance = 3.0;
                var outliers = reports
                    .Where(r => Math.Abs(r.Value - medianPosition) > tolerance)
                    .Select(r => r.Key)
                    .ToList();

                // Sync outliers to the median position
                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room != null && room.IsActive)
                {
                    foreach (var outlierConnectionId in outliers)
                    {
                        await Clients.Client(outlierConnectionId).ForceSyncPlayback(medianPosition, room.IsPlaying);
                        _logger.LogInformation($"Forced sync for outlier in room {roomId}: connection {outlierConnectionId}");
                    }
                }
                _positionReports[roomId].Clear();
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error analyzing positions in room {roomId}");
            }
        }

        public async Task PlayVideo(string roomId)
        {
            try
            {
                var participantId = Context.Items["ParticipantId"] as string;
                if (string.IsNullOrEmpty(participantId))
                {
                    await Clients.Caller.Error("Unable to identify participant.");
                    return;
                }

                var participant = _roomManager.GetParticipant(roomId, participantId);
                
                // Check if user has control or is admin
                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, participantId);
                if (participant == null || (!participant.HasControl && !isAdmin))
                {
                    await Clients.Caller.Error("You don't have permission to control playback.");
                    return;
                }

                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    await Clients.Caller.Error("Room not found or no longer active.");
                    return;
                }

                // Update database state
                await _roomService.UpdatePlaybackStateAsync(roomId, participantId, room.CurrentPosition, true);

                // Broadcast to all clients in the room
                await Clients.Group(roomId).ReceivePlaybackUpdate(room.CurrentPosition, true);

                _logger.LogDebug($"Video played in room {roomId} by {participantId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error playing video in room {roomId}");
                await Clients.Caller.Error("Failed to play video.");
                throw;
            }
        }

        public async Task PauseVideo(string roomId)
        {
            try
            {
                var participantId = Context.Items["ParticipantId"] as string;
                if (string.IsNullOrEmpty(participantId))
                {
                    await Clients.Caller.Error("Unable to identify participant.");
                    return;
                }

                var participant = _roomManager.GetParticipant(roomId, participantId);
                
                // Check if user has control or is admin
                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, participantId);
                if (participant == null || (!participant.HasControl && !isAdmin))
                {
                    await Clients.Caller.Error("You don't have permission to control playback.");
                    return;
                }

                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    await Clients.Caller.Error("Room not found or no longer active.");
                    return;
                }

                // Update database state
                await _roomService.UpdatePlaybackStateAsync(roomId, participantId, room.CurrentPosition, false);

                // Broadcast to all clients in the room
                await Clients.Group(roomId).ReceivePlaybackUpdate(room.CurrentPosition, false);

                _logger.LogDebug($"Video paused in room {roomId} by {participantId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error pausing video in room {roomId}");
                await Clients.Caller.Error("Failed to pause video.");
                throw;
            }
        }

        public async Task SeekVideo(string roomId, double position)
        {
            try
            {
                var participantId = Context.Items["ParticipantId"] as string;
                if (string.IsNullOrEmpty(participantId))
                {
                    await Clients.Caller.Error("Unable to identify participant.");
                    return;
                }

                var participant = _roomManager.GetParticipant(roomId, participantId);
                
                // Check if user has control or is admin
                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, participantId);
                if (participant == null || (!participant.HasControl && !isAdmin))
                {
                    await Clients.Caller.Error("You don't have permission to control playback.");
                    return;
                }

                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    await Clients.Caller.Error("Room not found or no longer active.");
                    return;
                }

                // Update database state
                await _roomService.UpdatePlaybackStateAsync(roomId, participantId, position, room.IsPlaying);

                // Broadcast to all clients in the room
                await Clients.Group(roomId).ReceivePlaybackUpdate(position, room.IsPlaying);

                _logger.LogDebug($"Video seeked to {position} in room {roomId} by {participantId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error seeking video in room {roomId}");
                await Clients.Caller.Error("Failed to seek video.");
                throw;
            }
        }
        
        #endregion

        #region Control Management
        [Authorize]
        public async Task TransferControl(string roomId, string newControllerId)
        {
            try
            {
                var currentUserId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(currentUserId))
                {
                    await Clients.Caller.Error("Authentication required to transfer control.");
                    return;
                }

                _logger.LogInformation($"TransferControl called. CurrentUserId: {currentUserId}, NewControllerId: {newControllerId}, RoomId: {roomId}");

                // Check if user is admin or has control
                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, currentUserId);
                var currentParticipant = _roomManager.GetParticipant(roomId, currentUserId);
                bool hasControl = currentParticipant?.HasControl ?? false;
                
                _logger.LogInformation($"Current participant: {currentParticipant?.DisplayName ?? "NOT_FOUND"}, HasControl: {hasControl}, IsAdmin: {isAdmin}");
                
                if (!isAdmin && !hasControl)
                {
                    _logger.LogWarning($"User {currentUserId} attempted to transfer control without permission in room {roomId}. IsAdmin: {isAdmin}, HasControl: {hasControl}");
                    await Clients.Caller.Error("Only room administrators or current controllers can transfer control.");
                    return;
                }

                var newController = _roomManager.GetParticipant(roomId, newControllerId);
                if (newController == null)
                {
                    await Clients.Caller.Error("Target participant not found in room.");
                    return;
                }

                _roomManager.SetController(roomId, newControllerId);
                await Clients.Group(roomId).ControlTransferred(newControllerId, newController.DisplayName);

                // Send updated participant list to all users
                var allParticipants = _roomManager.GetRoomParticipants(roomId);
                var room = await _roomService.GetRoomByIdAsync(roomId);
                var allParticipantDtos = allParticipants.Select(p => new RoomParticipantDto
                {
                    Id = p.Id,
                    DisplayName = p.DisplayName,
                    AvatarUrl = p.AvatarUrl,
                    HasControl = p.HasControl,
                    JoinedAt = p.JoinedAt,
                    IsAdmin = room != null && p.Id == room.AdminId
                }).ToList();

                await Clients.Group(roomId).ReceiveRoomParticipants(allParticipantDtos);

                _logger.LogInformation($"Control transferred in room {roomId} from {currentUserId} to {newControllerId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error transferring control in room {roomId}");
                await Clients.Caller.Error("An error occurred while transferring control.");
                throw;
            }
        }

        #endregion

        #region Chat
        [Authorize]
        public async Task SendMessage(string roomId, string message)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(message))
                {
                    return;
                }

                var participantId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(participantId))
                {
                    await Clients.Caller.Error("Unable to identify participant for message sending.");
                    return;
                }

                var participant = _roomManager.GetParticipant(roomId, participantId);
                if (participant == null)
                {
                    await Clients.Caller.Error("You are no longer in this room.");
                    return;
                }

                // Create and store message
                var chatMessage = new ChatMessage(participantId, participant.DisplayName, participant.AvatarUrl, message);
                _roomManager.AddMessage(roomId, chatMessage);

                // Broadcast to all participants
                await Clients.Group(roomId).ReceiveMessage(
                    participantId,
                    participant.DisplayName,
                    participant.AvatarUrl,
                    message,
                    DateTime.UtcNow,
                    false);

                _logger.LogDebug($"Message sent in room {roomId} by {participantId} ({participant.DisplayName}): {message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending message in room {roomId}");
                await Clients.Caller.Error("Failed to send message.");
                throw;
            }
        }

        [Authorize]
        public async Task KickUser(string roomId, string userIdToKick)
        {
            try
            {
                var adminId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(adminId))
                {
                    await Clients.Caller.Error("Unable to identify admin for kick action.");
                    return;
                }

                // Verify the caller is the room admin
                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room == null)
                {
                    await Clients.Caller.Error("Room not found.");
                    return;
                }

                if (room.AdminId != adminId)
                {
                    await Clients.Caller.Error("Only the room admin can kick users.");
                    return;
                }

                // Get the participant to be kicked
                var participantToKick = _roomManager.GetParticipant(roomId, userIdToKick);
                if (participantToKick == null)
                {
                    await Clients.Caller.Error("User not found in room.");
                    return;
                }

                // Don't allow kicking the admin themselves
                if (userIdToKick == adminId)
                {
                    await Clients.Caller.Error("Admin cannot kick themselves.");
                    return;
                }

                // Get the admin's display name for the kick message
                var adminParticipant = _roomManager.GetParticipant(roomId, adminId);
                var adminDisplayName = adminParticipant?.DisplayName ?? "Admin";

                // Notify the kicked user BEFORE removing them from the room
                await Clients.User(userIdToKick).UserKicked(roomId, $"You have been kicked from the room by {adminDisplayName}");

                // Remove the user from the room
                _roomManager.RemoveParticipant(roomId, userIdToKick);

                // Notify all room participants about the kick (using system message)
                await Clients.Group(roomId).ReceiveMessage(
                    "system",
                    "System",
                    null,
                    $"{participantToKick.DisplayName} was kicked from the room by {adminDisplayName}",
                    DateTime.UtcNow,
                    true);

                // Update participants list for remaining users - convert to DTOs
                var updatedParticipants = _roomManager.GetRoomParticipants(roomId)
                    .Select(p => new RoomParticipantDto
                    {
                        Id = p.Id,
                        DisplayName = p.DisplayName,
                        AvatarUrl = p.AvatarUrl,
                        IsAdmin = p.Id == room.AdminId,
                        HasControl = p.HasControl,
                        JoinedAt = p.JoinedAt
                    });
                
                await Clients.Group(roomId).ReceiveRoomParticipants(updatedParticipants);

                _logger.LogInformation($"User {userIdToKick} ({participantToKick.DisplayName}) was kicked from room {roomId} by admin {adminId} ({adminDisplayName})");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error kicking user {userIdToKick} from room {roomId}");
                await Clients.Caller.Error("Failed to kick user.");
                throw;
            }
        }

        #endregion

        #region Helper Methods

        private string? GetUserRoom()
        {
            if (Context.Items.TryGetValue("RoomId", out var roomId) && roomId != null)
            {
                return roomId.ToString();
            }
            return null;
        }

        #endregion
    }
}
