using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using System.Web;
using WatchPartyApp.BusinessLogic.Interfaces;
using WatchPartyApp.DTOs;
using WatchPartyApp.Models;

namespace WatchPartyApp.BusinessLogic.Services
{
    public class AuthService : IAuthService
    {
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _emailService;
        public AuthService(UserManager<ApplicationUser> userManager, IConfiguration configuration, IEmailService emailService)
        {
            _userManager = userManager;
            _configuration = configuration;
            _emailService = emailService;
        }
        public async Task<TokenResponseDto> CreateToken(string userId)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user == null)
                throw new ApplicationException("User not found");

            var userRoles = await _userManager.GetRolesAsync(user);
            var authClaims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, user.UserName ?? string.Empty),
                new Claim(ClaimTypes.NameIdentifier, user.Id ?? string.Empty),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
                new Claim("Image",user.AvatarUrl ?? "/uploads/default.png")
            };
            foreach (var userRole in userRoles)
            {
                authClaims.Add(new Claim(ClaimTypes.Role, userRole));
            }
            var accessToken = GenerateAccessToken(authClaims);
            var expiration = DateTime.UtcNow.AddHours(3);

            return new TokenResponseDto
            {
                AccessToken = accessToken,
                Expiration = expiration
            };
        }

        public async Task ForgotPasswordAsync(ForgotPasswordRequestDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);

            if (user == null) throw new ApplicationException(message: $"Email: {model.Email} Not Found!");

            var token = await _userManager.GeneratePasswordResetTokenAsync(user);

            if (token == null) throw new ApplicationException(message: "Generating Password Token Failed, Try Again Later!");

            var link = GeneratePasswordResetLink(_configuration["JWT:ValidIssuer"], token, model.Email);

            if (string.IsNullOrEmpty(link)) throw new ApplicationException(message: $"Cannot Find Url Base!");

            await _emailService.SendPasswordResetEmailAsync(model.Email, user.UserName, link);
        }

        public string GeneratePasswordResetLink(string frontendResetPasswordUrlBase, string token, string userEmail)
        {
            if (frontendResetPasswordUrlBase == null)
            {
                return string.Empty;
            }
            var encodedToken = HttpUtility.UrlEncode(token);

            var resetLink = $"{frontendResetPasswordUrlBase}?email={HttpUtility.UrlEncode(userEmail)}&token={encodedToken}";

            return resetLink;
        }
        public async Task ResetPasswordAsync(ResetPasswordRequestDto model)
        {
            var user = await _userManager.FindByEmailAsync(model.Email);

            if (user == null) throw new ApplicationException(message: $"Email: {model.Email} Not Found!");

            var decodedToken = HttpUtility.UrlDecode(model.Token);

            var result = await _userManager.ResetPasswordAsync(user, decodedToken, model.NewPassword);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new ApplicationException($"Failed to reset password. Errors: {errors}");
            }
        }
        public async Task<TokenResponseDto> LoginAsync(LoginDto loginDto)
        {
            var user = await _userManager.FindByNameAsync(loginDto.Username);
            if (user == null)
                throw new ApplicationException("Invalid username or password");

            var isPasswordValid = await _userManager.CheckPasswordAsync(user, loginDto.Password);
            if (!isPasswordValid)
                throw new ApplicationException("Invalid username or password");

            return await CreateToken(user.Id);
        }

        public async Task RegisterUserAsync(RegisterDto registerDto)
        {
            var userExists = await _userManager.FindByNameAsync(registerDto.Username);
            if (userExists != null)
                throw new ApplicationException("User with this username already exists");

            var emailExists = await _userManager.FindByEmailAsync(registerDto.Email);
            if (emailExists != null)
                throw new ApplicationException("User with this email already exists");

            ApplicationUser user = new ApplicationUser()
            {
                UserName = registerDto.Username,
                Email = registerDto.Email,
                DisplayName = registerDto.DisplayName,
                SecurityStamp = Guid.NewGuid().ToString()
            };

            var result = await _userManager.CreateAsync(user, registerDto.Password);

            if (!result.Succeeded)
            {
                var errors = string.Join(", ", result.Errors.Select(e => e.Description));
                throw new ApplicationException($"User creation failed: {errors}");
            }
        }

        private string GenerateAccessToken(IEnumerable<Claim> claims)
        {
            var authSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_configuration["JWT:Secret"]));

            var tokenDescriptor = new SecurityTokenDescriptor
            {
                Issuer = _configuration["JWT:ValidIssuer"],
                Audience = _configuration["JWT:ValidAudience"],
                Expires = DateTime.UtcNow.AddHours(3),
                SigningCredentials = new SigningCredentials(authSigningKey, SecurityAlgorithms.HmacSha256),
                Subject = new ClaimsIdentity(claims)
            };

            var tokenHandler = new JwtSecurityTokenHandler();
            var token = tokenHandler.CreateToken(tokenDescriptor);
            return tokenHandler.WriteToken(token);
        }

    }
}
