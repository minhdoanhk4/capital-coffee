using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace CoffeeManagement.Models
{
    [Table("timekeeping")]
    public class Timekeeping : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("employee_id")] public int EmployeeId { get; set; }
        [Column("branch_id")] public int BranchId { get; set; }
        [Column("work_date")] public DateTime WorkDate { get; set; }
        [Column("shift")] public string Shift { get; set; } = string.Empty;
        [Column("hours_worked")] public decimal HoursWorked { get; set; } = 0;
        [Column("advance_payment")] public decimal AdvancePayment { get; set; } = 0;
    }
}
