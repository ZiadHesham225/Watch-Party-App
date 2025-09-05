using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using System.Collections.Concurrent;
using System.Security.Claims;
using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.DTOs;

namespace WatchPartyApp.Hubs
{
    public class RoomHub : Hub<IRoomClient>
    {
        private readonly IRoomService _roomService;
        private readonly ILogger<RoomHub> _logger;

        // Track user connections
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, UserConnectionInfo>>
            _roomConnections = new(); // roomId -> userId/guestId -> connection info

        // Track position reports for sync
        private static readonly ConcurrentDictionary<string, ConcurrentDictionary<string, double>>
            _positionReports = new(); // roomId -> connectionId -> position

        public RoomHub(
            IRoomService roomService,
            ILogger<RoomHub> logger)
        {
            _roomService = roomService;
            _logger = logger;
        }

        public override async Task OnConnectedAsync()
        {
            await base.OnConnectedAsync();
            _logger.LogInformation($"Client connected: {Context.ConnectionId}");
        }

        public override async Task OnDisconnectedAsync(Exception exception)
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

        public async Task JoinRoom(string roomId, string displayName, string avatarUrl, bool isGuest = false, string password = null)
        {
            try
            {
                Console.WriteLine("entered room///////////////////////////////////////////////////////////////");
                bool joinSuccess = false;
                string userId;

                if (isGuest)
                {
                    userId = Context.ConnectionId;
                    joinSuccess = await _roomService.JoinRoomAsGuestAsync(roomId, displayName, password);

                    if (!joinSuccess)
                    {
                        await Clients.Caller.Error("Failed to join room. The room may be private or no longer active.");
                        return;
                    }

                    Context.Items["IsGuest"] = true;
                    Context.Items["GuestId"] = userId;
                }
                else
                {
                    userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (string.IsNullOrEmpty(userId))
                    {
                        await Clients.Caller.Error("User authentication required.");
                        return;
                    }

                    joinSuccess = await _roomService.JoinRoomAsync(roomId, userId, password);
                    if (!joinSuccess)
                    {
                        await Clients.Caller.Error("Failed to join room. The room may be private or no longer active.");
                        return;
                    }

                    Context.Items["IsGuest"] = false;
                }

                await Groups.AddToGroupAsync(Context.ConnectionId, roomId);

                Context.Items["RoomId"] = roomId;
                Context.Items["UserId"] = userId;
                Context.Items["DisplayName"] = displayName;
                Context.Items["AvatarUrl"] = avatarUrl;
                if (!_roomConnections.TryGetValue(roomId, out var userConnections))
                {
                    userConnections = new ConcurrentDictionary<string, UserConnectionInfo>();
                    _roomConnections[roomId] = userConnections;
                }

                userConnections[userId] = new UserConnectionInfo
                {
                    ConnectionId = Context.ConnectionId,
                    DisplayName = displayName,
                    AvatarUrl = avatarUrl,
                    IsGuest = isGuest
                };
                await Clients.OthersInGroup(roomId).RoomJoined(roomId, userId, displayName, avatarUrl);
                await Clients.OthersInGroup(roomId).UserJoinedNotification(displayName);

                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room != null)
                {
                    await Clients.Caller.ForceSyncPlayback(room.CurrentPosition, room.IsPlaying);
                    var roomUsers = await _roomService.GetRoomUsersAsync(roomId);
                    await Clients.Caller.ReceiveRoomUsers(roomUsers);
                }

                _logger.LogInformation($"{(isGuest ? "Guest" : "User")} {userId} joined room {roomId}");
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
                bool isGuest = Context.Items["IsGuest"] as bool? ?? false;
                string userId;
                string displayName = Context.Items["DisplayName"] as string ?? "Unknown User";
                bool leaveSuccess = false;

                if (isGuest)
                {
                    string guestId = Context.Items["GuestId"] as string;
                    if (!string.IsNullOrEmpty(guestId))
                    {
                        leaveSuccess = await _roomService.GuestLeaveRoomAsync(roomId, guestId);
                        userId = guestId;
                    }
                    else
                    {
                        userId = "unknown-guest";
                    }
                }
                else
                {
                    userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                    if (!string.IsNullOrEmpty(userId))
                    {
                        leaveSuccess = await _roomService.LeaveRoomAsync(roomId, userId);
                    }
                }

                await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomId);
                if (_roomConnections.TryGetValue(roomId, out var userConnections))
                {
                    userConnections.TryRemove(userId, out _);
                    if (userConnections.IsEmpty)
                    {
                        _roomConnections.TryRemove(roomId, out _);
                        _positionReports.TryRemove(roomId, out _);
                    }
                }

                await Clients.OthersInGroup(roomId).RoomLeft(roomId, userId, displayName);
                await Clients.OthersInGroup(roomId).UserLeftNotification(displayName);
                Context.Items.Remove("RoomId");
                Context.Items.Remove("UserId");
                Context.Items.Remove("DisplayName");
                Context.Items.Remove("AvatarUrl");
                Context.Items.Remove("IsGuest");
                Context.Items.Remove("GuestId");

                _logger.LogInformation($"{(isGuest ? "Guest" : "User")} {userId} left room {roomId}");
                var room = await _roomService.GetRoomByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    await Clients.Group(roomId).RoomClosed(roomId, "Room has been closed");
                    _roomConnections.TryRemove(roomId, out _);
                    _positionReports.TryRemove(roomId, out _);
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error leaving room {roomId}");
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

                _roomConnections.TryRemove(roomId, out _);
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
        #endregion

        #region Playback Control

        public async Task UpdatePlayback(string roomId, double position, bool isPlaying)
        {
            try
            {
                bool isGuest = Context.Items["IsGuest"] as bool? ?? false;
                string userId;

                if (isGuest)
                {
                    userId = Context.Items["GuestId"] as string;
                }
                else
                {
                    userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                }

                if (string.IsNullOrEmpty(userId))
                {
                    _logger.LogWarning("Unknown user attempted to control playback");
                    return;
                }

                // Check permission
                bool canControl = await HasPlaybackControlAsync(roomId, userId);

                if (!canControl)
                {
                    _logger.LogWarning($"{(isGuest ? "Guest" : "User")} {userId} attempted to control playback without permission in room {roomId}");
                    await Clients.Caller.Error("You don't have permission to control playback.");
                    return;
                }

                // Update database state
                await _roomService.UpdatePlaybackStateAsync(roomId, userId, position, isPlaying);

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
                bool isGuest = Context.Items["IsGuest"] as bool? ?? false;
                string userId;

                if (isGuest)
                {
                    userId = Context.Items["GuestId"] as string;
                }
                else
                {
                    userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                }

                if (string.IsNullOrEmpty(userId))
                {
                    return;
                }
                bool canControl = await HasPlaybackControlAsync(roomId, userId);

                if (canControl)
                {
                    await _roomService.UpdatePlaybackStateAsync(roomId, userId, position, true);
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

                // Get count of users in room to determine if everyone has reported
                if (_roomConnections.TryGetValue(roomId, out var roomUsers))
                {
                    int totalUsers = roomUsers.Count;
                    int reportedUsers = reports.Count;

                    // If most users have reported (80% or more), analyze and sync if needed
                    if (reportedUsers >= totalUsers * 0.8 && reportedUsers >= 2)
                    {
                        await AnalyzeAndSyncPositions(roomId);
                    }
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
        #endregion

        #region Admin and Permissions

        [Authorize]
        public async Task TransferAdmin(string roomId, string newAdminId, string newAdminName)
        {
            try
            {
                var currentAdminId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(currentAdminId))
                {
                    await Clients.Caller.Error("Authentication required to transfer admin rights.");
                    return;
                }

                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, currentAdminId);
                if (!isAdmin)
                {
                    _logger.LogWarning($"Non-admin user {currentAdminId} attempted to transfer admin rights in room {roomId}");
                    await Clients.Caller.Error("Only the room administrator can transfer admin rights.");
                    return;
                }

                bool success = await _roomService.TransferAdminAsync(roomId, currentAdminId, newAdminId);
                if (!success)
                {
                    _logger.LogWarning($"Failed to transfer admin for room {roomId} from {currentAdminId} to {newAdminId}");
                    await Clients.Caller.Error("Failed to transfer admin rights.");
                    return;
                }

                await Clients.Group(roomId).AdminTransferred(newAdminId, newAdminName);
                var roomUsers = await _roomService.GetRoomUsersAsync(roomId);
                await Clients.Group(roomId).ReceiveRoomUsers(roomUsers);

                _logger.LogInformation($"Admin transferred in room {roomId} from {currentAdminId} to {newAdminId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error transferring admin in room {roomId}");
                await Clients.Caller.Error("An error occurred while transferring admin rights.");
                throw;
            }
        }

        [Authorize]
        public async Task UpdateUserPermissions(string roomId, string targetUserId, bool hasPlaybackControl, bool hasVolumeControl)
        {
            try
            {
                var adminId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                if (string.IsNullOrEmpty(adminId))
                {
                    await Clients.Caller.Error("Authentication required to update permissions.");
                    return;
                }

                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, adminId);
                if (!isAdmin)
                {
                    _logger.LogWarning($"Non-admin user {adminId} attempted to update permissions in room {roomId}");
                    await Clients.Caller.Error("Only the room administrator can update user permissions.");
                    return;
                }

                var permissions = new RoomUserPermissionDto
                {
                    HasPlaybackControl = hasPlaybackControl,
                    HasVolumeControl = hasVolumeControl
                };

                bool success = await _roomService.UpdateUserPermissionsAsync(roomId, targetUserId, adminId, permissions);
                if (!success)
                {
                    _logger.LogWarning($"Failed to update permissions for user {targetUserId} in room {roomId}");
                    await Clients.Caller.Error("Failed to update user permissions.");
                    return;
                }

                var roomUsers = await _roomService.GetRoomUsersAsync(roomId);
                var targetUser = roomUsers?.FirstOrDefault(u => u.UserId == targetUserId || u.GuestId == targetUserId);
                if (targetUser == null)
                {
                    _logger.LogWarning($"Target user {targetUserId} not found in room {roomId}");
                    return;
                }

                await Clients.Group(roomId).PermissionChanged(
                    targetUserId,
                    targetUser.DisplayName,
                    hasPlaybackControl,
                    hasVolumeControl);

                if (_roomConnections.TryGetValue(roomId, out var connections) &&
                    connections.TryGetValue(targetUserId, out var connectionInfo))
                {
                    await Clients.Client(connectionInfo.ConnectionId).YourPermissionChanged(hasPlaybackControl, hasVolumeControl);
                }

                _logger.LogInformation($"Permissions updated for user {targetUserId} in room {roomId}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error updating permissions in room {roomId}");
                await Clients.Caller.Error("An error occurred while updating user permissions.");
                throw;
            }
        }
        #endregion

        #region Chat

        public async Task SendMessage(string roomId, string message)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(message))
                {
                    return;
                }

                string userId;
                bool isGuest = Context.Items["IsGuest"] as bool? ?? false;

                if (isGuest)
                {
                    userId = Context.Items["GuestId"] as string;
                }
                else
                {
                    userId = Context.User?.FindFirstValue(ClaimTypes.NameIdentifier);
                }

                if (string.IsNullOrEmpty(userId))
                {
                    await Clients.Caller.Error("Unable to identify user for message sending.");
                    return;
                }

                var displayName = Context.Items["DisplayName"] as string ?? "Unknown User";
                var avatarUrl = Context.Items["AvatarUrl"] as string ?? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(displayName)}&background=random";
                bool isInRoom = await _roomService.IsUserInRoomAsync(roomId, userId);
                if (!isInRoom)
                {
                    await Clients.Caller.Error("You are no longer in this room.");
                    return;
                }

                await Clients.Group(roomId).ReceiveMessage(
                    userId,
                    displayName,
                    avatarUrl,
                    message,
                    DateTime.UtcNow);

                _logger.LogDebug($"Message sent in room {roomId} by {userId}: {message}");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error sending message in room {roomId}");
                await Clients.Caller.Error("Failed to send message.");
                throw;
            }
        }
        #endregion

        #region Helper Methods

        private string GetUserRoom()
        {
            if (Context.Items.TryGetValue("RoomId", out var roomId) && roomId != null)
            {
                return roomId.ToString();
            }
            return null;
        }

        private async Task<bool> HasPlaybackControlAsync(string roomId, string userId)
        {
            try
            {
                bool isAdmin = await _roomService.IsUserAdminAsync(roomId, userId);
                if (isAdmin)
                {
                    return true;
                }
                var roomUsers = await _roomService.GetRoomUsersAsync(roomId);
                var user = roomUsers?.FirstOrDefault(u => u.UserId == userId || u.GuestId == userId);
                return user?.HasPlaybackControl ?? false;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, $"Error checking playback control for user {userId} in room {roomId}");
                return false;
            }
        }

        private class UserConnectionInfo
        {
            public string ConnectionId { get; set; }
            public string DisplayName { get; set; }
            public string AvatarUrl { get; set; }
            public bool IsGuest { get; set; }
        }
        #endregion
    }

}
