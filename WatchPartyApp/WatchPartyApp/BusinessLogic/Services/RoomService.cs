using Microsoft.AspNetCore.Identity;
using Org.BouncyCastle.Crypto.Generators;
using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.Data;
using WatchPartyApp.DTOs;
using WatchPartyApp.Models;

namespace WatchPartyApp.BusinessLogic.Services
{
    public class RoomService : IRoomService
    {
        private readonly IUnitOfWork _unitOfWork;
        private readonly IMovieService _movieService;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ILogger<RoomService> _logger;

        public RoomService(
            IUnitOfWork unitOfWork,
            IMovieService movieService,
            UserManager<ApplicationUser> userManager,
            ILogger<RoomService> logger)
        {
            _unitOfWork = unitOfWork;
            _movieService = movieService;
            _userManager = userManager;
            _logger = logger;
        }
        public async Task<Room> CreateRoomAsync(RoomCreateDto roomDto, string userId)
        {
            try
            {
                var movie = await _movieService.SaveMovieForRoomAsync(roomDto.MovieId);
                if (movie == null)
                {
                    return null;
                }
                var room = new Room
                {
                    Id = Guid.NewGuid().ToString(),
                    Name = roomDto.Name,
                    MovieId = roomDto.MovieId,
                    AdminId = userId,
                    IsActive = true,
                    CreatedAt = DateTime.UtcNow,
                    InviteCode = GenerateInviteCode(),
                    IsPrivate = roomDto.IsPrivate,
                    AllowGuestControl = roomDto.AllowGuestControl,
                    AutoPlay = roomDto.AutoPlay,
                    SyncMode = roomDto.SyncMode,
                    CurrentPosition = 0,
                    IsPlaying = false
                };
                if (roomDto.IsPrivate && !string.IsNullOrEmpty(roomDto.Password))
                {
                    room.PasswordHash = BCrypt.Net.BCrypt.HashPassword(roomDto.Password);
                }
                await _unitOfWork.Rooms.CreateAsync(room);
                var user = await _userManager.FindByIdAsync(userId);
                var roomUser = new RoomUser
                {
                    Id = Guid.NewGuid().ToString(),
                    RoomId = room.Id,
                    UserId = userId,
                    DisplayName = user.DisplayName ?? user.UserName,
                    HasPlaybackControl = true,
                    HasVolumeControl = true,
                    JoinedAt = DateTime.UtcNow
                };

                await _unitOfWork.RoomUsers.CreateAsync(roomUser);
                await _unitOfWork.SaveAsync();

                return room;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating room");
                return null;
            }
        }
        public async Task<RoomDetailDto> GetRoomByIdAsync(string roomId)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetRoomWithDetailsAsync(roomId);
                return MapRoomToRoomDetailDto(room);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting room details by ID: {RoomId}", roomId);
                return null;
            }
        }
        public async Task<Room> GetRoomByInviteCodeAsync(string inviteCode)
        {
            try
            {
                return await _unitOfWork.Rooms.GetRoomByInviteCodeAsync(inviteCode);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting room by invite code: {InviteCode}", inviteCode);
                return null;
            }
        }
        public async Task<IEnumerable<RoomDto>> GetActiveRoomsAsync()
        {
            try
            {
                var rooms = await _unitOfWork.Rooms.GetActiveRoomsAsync();
                return rooms.Select(MapToRoomDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting active rooms");
                return Enumerable.Empty<RoomDto>();
            }
        }
        public async Task<IEnumerable<RoomDto>> GetUserRoomsAsync(string userId)
        {
            try
            {
                var createdRooms = await _unitOfWork.Rooms.GetRoomsByAdminAsync(userId);
                var joinedRooms = await _unitOfWork.Rooms.GetRoomsJoinedByUserAsync(userId);

                var allRooms = createdRooms.Union(joinedRooms, new RoomIdComparer());
                return allRooms.Select(MapToRoomDto);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting rooms for user: {UserId}", userId);
                return Enumerable.Empty<RoomDto>();
            }
        }
        public async Task<bool> UpdateRoomAsync(RoomUpdateDto roomDto, string userId)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomDto.Id);
                if (room == null || room.AdminId != userId)
                {
                    return false;
                }

                room.Name = roomDto.Name;
                room.IsPrivate = roomDto.IsPrivate;
                room.AllowGuestControl = roomDto.AllowGuestControl;
                room.AutoPlay = roomDto.AutoPlay;
                room.SyncMode = roomDto.SyncMode;
                if (!string.IsNullOrEmpty(roomDto.Password))
                {
                    room.PasswordHash = BCrypt.Net.BCrypt.HashPassword(roomDto.Password);
                }
                else if (!roomDto.IsPrivate)
                {
                    room.PasswordHash = null;
                }
                var RoomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var roomUsersExculingAdmin = RoomUsers.Where(ru => ru.RoomId == roomDto.Id && ru.UserId != room.AdminId).ToList();
                foreach (var roomUser in roomUsersExculingAdmin)
                {
                    roomUser.HasPlaybackControl = roomDto.AllowGuestControl;
                    _unitOfWork.RoomUsers.Update(roomUser);
                }
                _unitOfWork.Rooms.Update(room);
                await _unitOfWork.SaveAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating room: {RoomId}", roomDto.Id);
                return false;
            }
        }
        public async Task<bool> EndRoomAsync(string roomId, string userId)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null || room.AdminId != userId)
                {
                    return false;
                }

                room.IsActive = false;
                room.EndedAt = DateTime.UtcNow;

                _unitOfWork.Rooms.Update(room);
                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var usersInRoom = roomUsers.Where(ru => ru.RoomId == roomId);
                foreach (var user in usersInRoom)
                {
                    await _unitOfWork.RoomUsers.DeleteAsync(user.Id);
                }
                await _unitOfWork.SaveAsync();
                
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error ending room: {RoomId}", roomId);
                return false;
            }
        }
        public async Task<bool> JoinRoomAsync(string roomId, string userId, string password = null)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    return false;
                }

                if (room.IsPrivate && !string.IsNullOrEmpty(room.PasswordHash))
                {
                    if (string.IsNullOrEmpty(password) || !BCrypt.Net.BCrypt.Verify(password, room.PasswordHash))
                    {
                        return false;
                    }
                }
                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var existingRoomUser = roomUsers.FirstOrDefault(ru => ru.RoomId == roomId && ru.UserId == userId);
                if (existingRoomUser != null)
                {
                    return true;
                }

                var user = await _userManager.FindByIdAsync(userId);
                var roomUser = new RoomUser
                {
                    Id = Guid.NewGuid().ToString(),
                    RoomId = roomId,
                    UserId = userId,
                    DisplayName = user.DisplayName ?? user.UserName,
                    HasPlaybackControl = room.AdminId == userId || room.AllowGuestControl,
                    HasVolumeControl = true,
                    JoinedAt = DateTime.UtcNow
                };

                await _unitOfWork.RoomUsers.CreateAsync(roomUser);
                await _unitOfWork.SaveAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error joining room: {RoomId}, User: {UserId}", roomId, userId);
                return false;
            }
        }
        public async Task<bool> JoinRoomAsGuestAsync(string roomId, string displayName, string password = null)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    return false;
                }
                if (room.IsPrivate && !string.IsNullOrEmpty(room.PasswordHash))
                {
                    if (string.IsNullOrEmpty(password) || !BCrypt.Net.BCrypt.Verify(password, room.PasswordHash))
                    {
                        return false;
                    }
                }
                var guestId = Guid.NewGuid().ToString();
                var guestUser = new GuestUser
                {
                    Id = guestId,
                    DisplayName = displayName,
                    LastSeen = DateTime.UtcNow,
                    Avatar = $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(displayName)}&background=random"
                };

                await _unitOfWork.GuestUsers.CreateAsync(guestUser);
                var roomUser = new RoomUser
                {
                    Id = Guid.NewGuid().ToString(),
                    RoomId = roomId,
                    GuestId = guestId,
                    DisplayName = displayName,
                    HasPlaybackControl = room.AllowGuestControl,
                    HasVolumeControl = true,
                    JoinedAt = DateTime.UtcNow
                };

                await _unitOfWork.RoomUsers.CreateAsync(roomUser);
                await _unitOfWork.SaveAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error joining room as guest: {RoomId}, DisplayName: {DisplayName}", roomId, displayName);
                return false;
            }
        }
        public async Task<bool> LeaveRoomAsync(string roomId, string userId)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null)
                {
                    return false;
                }

                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var roomUser = roomUsers.FirstOrDefault(ru => ru.RoomId == roomId && ru.UserId == userId);
                if (roomUser == null)
                {
                    return false;
                }
                if (room.AdminId == userId)
                {
                    var usersInRoom = roomUsers.Where(ru => ru.RoomId == roomId);
                    foreach (var user in usersInRoom)
                    {
                        await _unitOfWork.RoomUsers.DeleteAsync(user.Id);
                    }
                    var Room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                    Room.IsActive = false;
                    Room.EndedAt = DateTime.UtcNow;
                    _unitOfWork.Rooms.Update(Room);
                    await _unitOfWork.SaveAsync();
                    return true;
                }
                else
                {
                    await _unitOfWork.RoomUsers.DeleteAsync(roomUser.Id);
                    await _unitOfWork.SaveAsync();
                    return true;
                }
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error leaving room: {RoomId}, User: {UserId}", roomId, userId);
                return false;
            }
        }
        public async Task<bool> GuestLeaveRoomAsync(string roomId, string guestId)
        {
            try
            {
                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var roomUser = roomUsers.FirstOrDefault(ru => ru.RoomId == roomId && ru.GuestId == guestId);

                if (roomUser == null)
                {
                    return false;
                }

                await _unitOfWork.RoomUsers.DeleteAsync(roomUser.Id);
                await _unitOfWork.GuestUsers.DeleteAsync(guestId);
                await _unitOfWork.SaveAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error guest leaving room: {RoomId}, Guest: {GuestId}", roomId, guestId);
                return false;
            }
        }
        public async Task<bool> UpdateUserPermissionsAsync(string roomId, string targetUserId, string adminId, RoomUserPermissionDto permissions)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null || room.AdminId != adminId)
                {
                    return false;
                }

                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var targetRoomUser = roomUsers.FirstOrDefault(ru => ru.RoomId == roomId &&
                    (ru.UserId == targetUserId || ru.GuestId == targetUserId));

                if (targetRoomUser == null)
                {
                    return false;
                }
                targetRoomUser.HasPlaybackControl = permissions.HasPlaybackControl;
                targetRoomUser.HasVolumeControl = permissions.HasVolumeControl;

                _unitOfWork.RoomUsers.Update(targetRoomUser);
                await _unitOfWork.SaveAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating user permissions: Room: {RoomId}, Target: {TargetUserId}", roomId, targetUserId);
                return false;
            }
        }
        public async Task<bool> UpdatePlaybackStateAsync(string roomId, string userId, double position, bool isPlaying)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    return false;
                }
                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var roomUser = roomUsers.FirstOrDefault(ru => ru.RoomId == roomId &&
                    (ru.UserId == userId || ru.GuestId == userId));

                if (roomUser == null || !roomUser.HasPlaybackControl)
                {
                    return false;
                }

                room.CurrentPosition = position;
                room.IsPlaying = isPlaying;

                _unitOfWork.Rooms.Update(room);
                await _unitOfWork.SaveAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating playback state: Room: {RoomId}, User: {UserId}", roomId, userId);
                return false;
            }
        }
        public async Task<string> GenerateInviteLink(string roomId)
        {
            var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
            if (room == null || !room.IsActive)
            {
                return null;
            }
            return $"/watch-party/join/{room.InviteCode}";
        }

        public async Task<bool> IsUserInRoomAsync(string roomId, string userId)
        {
            try
            {
                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                return roomUsers.Any(ru => ru.RoomId == roomId &&
                    (ru.UserId == userId || ru.GuestId == userId));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if user is in room: {RoomId}, User: {UserId}", roomId, userId);
                return false;
            }
        }

        public async Task<bool> IsUserAdminAsync(string roomId, string userId)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                return room != null && room.AdminId == userId;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error checking if user is admin: {RoomId}, User: {UserId}", roomId, userId);
                return false;
            }
        }
        public async Task<bool> TransferAdminAsync(string roomId, string currentAdminId, string newAdminId)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null || room.AdminId != currentAdminId)
                {
                    return false;
                }
                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var newAdminRoomUser = roomUsers.FirstOrDefault(ru => ru.RoomId == roomId && ru.UserId == newAdminId);

                if (newAdminRoomUser == null)
                {
                    return false;
                }
                room.AdminId = newAdminId;
                newAdminRoomUser.HasPlaybackControl = true;
                newAdminRoomUser.HasVolumeControl = true;

                _unitOfWork.Rooms.Update(room);
                _unitOfWork.RoomUsers.Update(newAdminRoomUser);
                await _unitOfWork.SaveAsync();
                return true;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error transferring admin: Room: {RoomId}, From: {CurrentAdminId}, To: {NewAdminId}",
                    roomId, currentAdminId, newAdminId);
                return false;
            }
        }
        public async Task<IEnumerable<RoomUserDto>> GetRoomUsersAsync(string roomId)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    return null;
                }

                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var usersInRoom = roomUsers.Where(ru => ru.RoomId == roomId).ToList();

                var result = new List<RoomUserDto>();

                foreach (var roomUser in usersInRoom)
                {
                    var userDto = new RoomUserDto
                    {
                        Id = roomUser.Id,
                        DisplayName = roomUser.DisplayName,
                        UserId = roomUser.UserId,
                        GuestId = roomUser.GuestId,
                        HasPlaybackControl = roomUser.HasPlaybackControl,
                        HasVolumeControl = roomUser.HasVolumeControl,
                        JoinedAt = roomUser.JoinedAt,
                        IsAdmin = room.AdminId == roomUser.UserId
                    };
                    if (!string.IsNullOrEmpty(roomUser.UserId))
                    {
                        var user = await _userManager.FindByIdAsync(roomUser.UserId);
                        userDto.AvatarUrl = user?.AvatarUrl ?? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(roomUser.DisplayName)}&background=random";
                    }
                    else if (!string.IsNullOrEmpty(roomUser.GuestId))
                    {
                        var guestUsers = await _unitOfWork.GuestUsers.GetAllAsync();
                        var guest = guestUsers.FirstOrDefault(g => g.Id == roomUser.GuestId);
                        userDto.AvatarUrl = guest?.Avatar ?? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(roomUser.DisplayName)}&background=random";
                    }

                    result.Add(userDto);
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting room users: {RoomId}", roomId);
                return Enumerable.Empty<RoomUserDto>();
            }
        }

        public async Task<IEnumerable<RegisteredRoomUserDto>> GetRegisteredRoomUsersAsync(string roomId)
        {
            try
            {
                var room = await _unitOfWork.Rooms.GetByIdAsync(roomId);
                if (room == null || !room.IsActive)
                {
                    return null;
                }

                var roomUsers = await _unitOfWork.RoomUsers.GetAllAsync();
                var registeredUsers = roomUsers.Where(ru => ru.RoomId == roomId && !string.IsNullOrEmpty(ru.UserId)).ToList();

                var result = new List<RegisteredRoomUserDto>();

                foreach (var roomUser in registeredUsers)
                {
                    var user = await _userManager.FindByIdAsync(roomUser.UserId);

                    var userDto = new RegisteredRoomUserDto
                    {
                        UserId = roomUser.UserId,
                        DisplayName = roomUser.DisplayName,
                        HasPlaybackControl = roomUser.HasPlaybackControl,
                        Avatar = user?.AvatarUrl ?? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(roomUser.DisplayName)}&background=random",
                        IsAdmin = room.AdminId == roomUser.UserId
                    };

                    result.Add(userDto);
                }

                return result;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting registered room users: {RoomId}", roomId);
                return Enumerable.Empty<RegisteredRoomUserDto>();
            }
        }
        #region Helper Methods

        private string GenerateInviteCode()
        {
            const string chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
            var random = new Random();
            return new string(Enumerable.Repeat(chars, 8)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }

        private RoomDto MapToRoomDto(Room room)
        {
            return new RoomDto
            {
                Id = room.Id,
                Name = room.Name,
                MovieId = room.MovieId,
                MovieTitle = room.Movie?.Title,
                MoviePosterUrl = room.Movie?.PosterUrl,
                AdminId = room.AdminId,
                AdminName = room.Admin?.DisplayName ?? room.Admin?.UserName,
                IsActive = room.IsActive,
                CreatedAt = room.CreatedAt,
                InviteCode = room.InviteCode,
                IsPrivate = room.IsPrivate,
                HasPassword = !string.IsNullOrEmpty(room.PasswordHash),
                AllowGuestControl = room.AllowGuestControl,
                UserCount = room.RoomUsers?.Count ?? 0
            };
        }
        private RoomDetailDto MapRoomToRoomDetailDto(Room room)
        {
            if (room == null)
                return null;

            var roomDetailDto = new RoomDetailDto
            {
                // Base RoomDto properties
                Id = room.Id,
                Name = room.Name,
                MovieId = room.MovieId,
                MovieTitle = room.Movie?.Title ?? string.Empty,
                MoviePosterUrl = room.Movie?.PosterUrl ?? string.Empty,
                AdminId = room.AdminId,
                AdminName = room.Admin?.DisplayName ?? room.Admin?.Email ?? "Unknown",
                IsActive = room.IsActive,
                CreatedAt = room.CreatedAt,
                InviteCode = room.InviteCode,
                IsPrivate = room.IsPrivate,
                HasPassword = !string.IsNullOrEmpty(room.PasswordHash),
                AllowGuestControl = room.AllowGuestControl,
                UserCount = room.RoomUsers?.Count ?? 0,

                // RoomDetailDto specific properties
                CurrentPosition = room.CurrentPosition,
                IsPlaying = room.IsPlaying,
                SyncMode = room.SyncMode,
                AutoPlay = room.AutoPlay,

                // Map users
                Users = room.RoomUsers?.Select(ru => new RoomUserDto
                {
                    Id = ru.Id,
                    UserId = ru.UserId,
                    GuestId = ru.GuestId,
                    DisplayName = ru.User?.DisplayName ?? ru.Guest?.DisplayName ?? "Unknown",
                    JoinedAt = ru.JoinedAt,
                    AvatarUrl = ru.User?.AvatarUrl ?? ru.Guest?.Avatar ?? $"https://ui-avatars.com/api/?name={Uri.EscapeDataString(ru.DisplayName)}&background=random" // Fix for CS8601
                }).ToList() ?? new List<RoomUserDto>(),

                // Map movie details
                Movie = room.Movie != null ? new MovieDetailDto
                {
                    Id = room.Movie.Id,
                    Title = room.Movie.Title,
                    Description = room.Movie.Description ?? string.Empty,
                    PosterUrl = room.Movie.PosterUrl ?? string.Empty,
                    ReleaseYear = room.Movie.ReleaseYear ?? string.Empty,
                    Duration = room.Movie.Duration,
                    Rating = room.Movie.Rating
                } : null
            };

            return roomDetailDto;
        }

        private class RoomIdComparer : IEqualityComparer<Room>
        {
            public bool Equals(Room x, Room y)
            {
                return x.Id == y.Id;
            }

            public int GetHashCode(Room obj)
            {
                return obj.Id.GetHashCode();
            }
        }

        #endregion
    }
}

