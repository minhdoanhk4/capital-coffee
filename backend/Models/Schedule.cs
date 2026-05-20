using System;
using System.Text.Json.Serialization;
using Postgrest.Attributes;
using Postgrest.Models;

namespace CoffeeManagement.Models
{
    [Table("schedules")]
    public class Schedule : BaseModel
    {
        [PrimaryKey("id", false)]

        [JsonPropertyName("id")]
        public int Id { get; set; }

        [Column("employee_id")]

        [JsonPropertyName("employee_id")]
        public int EmployeeId { get; set; }

        [Column("branch_id")]

        [JsonPropertyName("branch_id")]
        public int BranchId { get; set; }

        [Column("work_date")]

        [JsonPropertyName("work_date")]
        public string WorkDate { get; set; } = string.Empty; // Dùng string để tránh lệch múi giờ

        [Column("shift")]

        [JsonPropertyName("shift")]
        public string Shift { get; set; } = string.Empty; // 'S' hoặc 'C'
    }
}
