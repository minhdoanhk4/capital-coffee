using Postgrest.Attributes;
using Postgrest.Models;

namespace CoffeeManagement.Models
{
    [Table("employees")]
    public class Employee : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("full_name")] public string FullName { get; set; } = string.Empty;
        [Column("phone")] public string Phone { get; set; } = string.Empty;
        [Column("hourly_rate")] public decimal HourlyRate { get; set; } = 22000;
        [Column("status")] public string Status { get; set; } = "active";
    }
}
