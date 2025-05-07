using System.ComponentModel.DataAnnotations;

namespace WatchPartyApp.DTOs
{
    public class ForgotPasswordRequestDto
    {
        [EmailAddress]
        public string Email { get; set; }
    }
}
