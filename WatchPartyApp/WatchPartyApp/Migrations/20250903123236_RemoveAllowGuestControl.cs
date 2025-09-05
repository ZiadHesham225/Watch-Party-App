using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WatchPartyApp.Migrations
{
    /// <inheritdoc />
    public partial class RemoveAllowGuestControl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowGuestControl",
                table: "Rooms");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AllowGuestControl",
                table: "Rooms",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }
    }
}
