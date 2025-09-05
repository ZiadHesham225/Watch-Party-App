using Microsoft.AspNetCore.Identity.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore;
using WatchPartyApp.Models;

namespace WatchPartyApp.Data
{
    public class WatchPartyDbContext : IdentityDbContext<ApplicationUser>
    {
        public WatchPartyDbContext(DbContextOptions<WatchPartyDbContext> options)
        : base(options)
        {
        }

        // We don't need to define DbSet<ApplicationUser> since IdentityDbContext already provides it
        public DbSet<GuestUser> Guests { get; set; }
        public DbSet<Room> Rooms { get; set; }
        public DbSet<RoomUser> RoomUsers { get; set; }
        public DbSet<ChatMessage> ChatMessages { get; set; }
        public DbSet<Movie> Movies { get; set; }
        public DbSet<Genre> Genres { get; set; }
        public DbSet<MovieGenre> MovieGenres { get; set; }
        public DbSet<WatchLater> WatchLaterItems { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            // This calls the base class implementation which sets up all the Identity related tables
            base.OnModelCreating(modelBuilder);

            modelBuilder.Entity<Room>()
                .HasOne(r => r.Admin)
                .WithMany(u => u.CreatedRooms)
                .HasForeignKey(r => r.AdminId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<Room>()
                .HasOne(r => r.Movie)
                .WithMany(m => m.Rooms)
                .HasForeignKey(r => r.MovieId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<RoomUser>()
                .HasOne(ru => ru.Room)
                .WithMany(r => r.RoomUsers)
                .HasForeignKey(ru => ru.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<RoomUser>()
                .HasOne(ru => ru.User)
                .WithMany(u => u.JoinedRooms)
                .HasForeignKey(ru => ru.UserId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<RoomUser>()
                .HasOne(ru => ru.Guest)
                .WithMany(g => g.JoinedRooms)
                .HasForeignKey(ru => ru.GuestId)
                .OnDelete(DeleteBehavior.Restrict);

            modelBuilder.Entity<ChatMessage>()
                .HasOne(cm => cm.Room)
                .WithMany(r => r.Messages)
                .HasForeignKey(cm => cm.RoomId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MovieGenre>()
                .HasOne(mg => mg.Movie)
                .WithMany(m => m.MovieGenres)
                .HasForeignKey(mg => mg.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<MovieGenre>()
                .HasOne(mg => mg.Genre)
                .WithMany(g => g.MovieGenres)
                .HasForeignKey(mg => mg.GenreId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WatchLater>()
                .HasOne(wl => wl.User)
                .WithMany(u => u.WatchLaterItems)
                .HasForeignKey(wl => wl.UserId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<WatchLater>()
                .HasOne(wl => wl.Movie)
                .WithMany(m => m.WatchLaterItems)
                .HasForeignKey(wl => wl.MovieId)
                .OnDelete(DeleteBehavior.Cascade);

            modelBuilder.Entity<Genre>().HasData(
           new Genre { Id = 1, Name = "Action"},
                new Genre { Id = 2, Name = "Comedy" },
                new Genre { Id = 3, Name = "Drama" },
                new Genre { Id = 4, Name = "Horror" },
                new Genre { Id = 5, Name = "Science Fiction" },
                new Genre { Id = 6, Name = "Thriller" },
                new Genre { Id = 7, Name = "Romance" },
                new Genre { Id = 8, Name = "Documentary" },
                new Genre { Id = 9, Name = "Animation" },
                new Genre { Id = 10, Name = "Family" }
            );
        }
    }
}
