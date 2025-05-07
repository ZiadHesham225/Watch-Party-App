using WatchPartyApp.DTOs;

namespace WatchPartyApp.BusinessLogic.Interfaces
{
    public interface IAuthService
    {
        Task RegisterUserAsync(RegisterDto registerDto);
        Task<TokenResponseDto> LoginAsync(LoginDto loginDto);
        Task<TokenResponseDto> CreateToken(string userId);
        Task ForgotPasswordAsync(ForgotPasswordRequestDto model);
        Task ResetPasswordAsync(ResetPasswordRequestDto model);
        string GeneratePasswordResetLink(string frontendResetPasswordUrlBase, string token, string userEmail);
    }
}
