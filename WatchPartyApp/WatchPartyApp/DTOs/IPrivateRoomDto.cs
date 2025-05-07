namespace WatchPartyApp.DTOs
{
    public interface IPrivateRoomDto
    {
        bool IsPrivate { get; }
        string? Password { get; }
    }
}
