using WatchPartyApp.Models;

namespace WatchPartyApp.DataAccess.Interfaces
{
    public interface IRoomRepository : IGenericRepository<Room>
    {
        Task<IEnumerable<Room>> GetActiveRoomsAsync();
        Task<IEnumerable<Room>> GetRoomsByAdminAsync(string adminId);
        Task<Room> GetRoomByInviteCodeAsync(string inviteCode);
        Task<Room> GetRoomWithDetailsAsync(string roomId);
        Task<IEnumerable<Room>> GetRoomsByMovieAsync(string movieId);
        Task<IEnumerable<Room>> GetRoomsJoinedByUserAsync(string userId);
        Task<bool> RoomExistsAsync(string roomId);
    }
}
