using Microsoft.EntityFrameworkCore;
using WatchPartyApp.Data;
using WatchPartyApp.DataAccess.Interfaces;
using WatchPartyApp.Models;

namespace WatchPartyApp.DataAccess.Repositories
{
    public class RoomRepository : GenericRepository<Room>, IRoomRepository
    {
        public RoomRepository(WatchPartyDbContext context) : base(context)
        {
        }

        public async Task<IEnumerable<Room>> GetActiveRoomsAsync()
        {
            return await dbSet
                .Where(r => r.IsActive)
                .Include(r => r.Movie)
                .Include(r => r.Admin)
                .ToListAsync();
        }

        public async Task<IEnumerable<Room>> GetRoomsByAdminAsync(string adminId)
        {
            return await dbSet
                .Where(r => r.AdminId == adminId)
                .Include(r => r.Movie)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<Room> GetRoomByInviteCodeAsync(string inviteCode)
        {
            return await dbSet
                .Include(r => r.Movie)
                .Include(r => r.Admin)
                .FirstOrDefaultAsync(r => r.InviteCode == inviteCode && r.IsActive);
        }

        public async Task<Room> GetRoomWithDetailsAsync(string roomId)
        {
            return await dbSet
                .Include(r => r.Movie)
                    .ThenInclude(m => m.MovieGenres)
                        .ThenInclude(mg => mg.Genre)
                .Include(r => r.Admin)
                .Include(r => r.RoomUsers)
                    .ThenInclude(ru => ru.User)
                .Include(r => r.RoomUsers)
                    .ThenInclude(ru => ru.Guest)
                .Include(r => r.Messages)
                .FirstOrDefaultAsync(r => r.Id == roomId);
        }

        public async Task<IEnumerable<Room>> GetRoomsByMovieAsync(string movieId)
        {
            return await dbSet
                .Where(r => r.MovieId == movieId && r.IsActive)
                .Include(r => r.Admin)
                .ToListAsync();
        }
        public async Task<IEnumerable<Room>> GetRoomsJoinedByUserAsync(string userId)
        {
            return await dbSet
                .Where(r => r.RoomUsers.Any(ru => ru.UserId == userId) && r.IsActive)
                .Include(r => r.Movie)
                .Include(r => r.Admin)
                .OrderByDescending(r => r.CreatedAt)
                .ToListAsync();
        }

        public async Task<bool> RoomExistsAsync(string roomId)
        {
            return await dbSet.AnyAsync(r => r.Id == roomId);
        }
    }
}
