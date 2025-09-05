using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace WatchPartyApp.Migrations
{
    /// <inheritdoc />
    public partial class RemoveVideoTitleAndThumbnail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VideoThumbnail",
                table: "Rooms");

            migrationBuilder.DropColumn(
                name: "VideoTitle",
                table: "Rooms");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "VideoThumbnail",
                table: "Rooms",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "VideoTitle",
                table: "Rooms",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "");
        }
    }
}
