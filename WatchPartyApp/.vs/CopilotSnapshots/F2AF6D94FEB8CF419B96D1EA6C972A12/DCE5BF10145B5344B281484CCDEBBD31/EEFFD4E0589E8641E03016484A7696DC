using WatchPartyApp.DataAccess.Interfaces;
using WatchPartyApp.DataAccess.Repositories;
using WatchPartyApp.Models;

namespace WatchPartyApp.Data
{
    public class UnitOfWork : IUnitOfWork
    {
        private readonly WatchPartyDbContext _context;
        private IMovieRepository _movies;
        private IRoomRepository _rooms;
        private IGenericRepository<Genre> _genres;
        private IGenericRepository<MovieGenre> _movieGenres;
        private IGenericRepository<GuestUser> _guestUsers;
        private IGenericRepository<RoomUser> _roomUsers;
        private IGenericRepository<ChatMessage> _chatMessages;
        private IGenericRepository<WatchLater> _watchLaterItems;

        public UnitOfWork(WatchPartyDbContext context)
        {
            _context = context;
        }

        public IMovieRepository Movies => _movies ??= new MovieRepository(_context);
        public IRoomRepository Rooms => _rooms ??= new RoomRepository(_context);
        public IGenericRepository<Genre> Genres => _genres ??= new GenericRepository<Genre>(_context);
        public IGenericRepository<MovieGenre> MovieGenres => _movieGenres ??= new GenericRepository<MovieGenre>(_context);
        public IGenericRepository<GuestUser> GuestUsers => _guestUsers ??= new GenericRepository<GuestUser>(_context);
        public IGenericRepository<RoomUser> RoomUsers => _roomUsers ??= new GenericRepository<RoomUser>(_context);
        public IGenericRepository<ChatMessage> ChatMessages => _chatMessages ??= new GenericRepository<ChatMessage>(_context);
        public IGenericRepository<WatchLater> WatchLaterItems => _watchLaterItems ??= new GenericRepository<WatchLater>(_context);

        public async Task SaveAsync()
        {
            await _context.SaveChangesAsync();
        }

        public void Dispose()
        {
            _context.Dispose();
        }
    }
}
