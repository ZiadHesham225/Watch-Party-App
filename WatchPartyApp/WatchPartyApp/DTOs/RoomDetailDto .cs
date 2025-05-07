namespace WatchPartyApp.DTOs
{
    public class RoomDetailDto : RoomDto
    {
        public double CurrentPosition { get; set; }
        public bool IsPlaying { get; set; }
        public string SyncMode { get; set; }
        public bool AutoPlay { get; set; }
        public List<RoomUserDto> Users { get; set; } = new List<RoomUserDto>();
        public MovieDetailDto Movie { get; set; }
    }
}
