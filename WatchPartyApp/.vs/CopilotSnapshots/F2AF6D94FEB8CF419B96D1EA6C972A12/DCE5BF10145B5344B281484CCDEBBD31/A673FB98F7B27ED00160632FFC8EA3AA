using WatchPartyApp.DataAccess.Interfaces;
using WatchPartyApp.Models;

namespace WatchPartyApp.Data
{
    public interface IUnitOfWork : IDisposable
    {
        IMovieRepository Movies { get; }
        IRoomRepository Rooms { get; }
        IGenericRepository<Genre> Genres { get; }
        IGenericRepository<MovieGenre> MovieGenres { get; }
        IGenericRepository<GuestUser> GuestUsers { get; }
        IGenericRepository<RoomUser> RoomUsers { get; }
        IGenericRepository<ChatMessage> ChatMessages { get; }
        IGenericRepository<WatchLater> WatchLaterItems { get; }

        Task SaveAsync();
    }
}
