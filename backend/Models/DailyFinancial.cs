using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace CoffeeManagement.Models
{
    [Table("daily_financials")]
    public class DailyFinancial : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("branch_id")] public int BranchId { get; set; }
        [Column("record_date")] public DateTime RecordDate { get; set; }
        [Column("cash_revenue")] public decimal CashRevenue { get; set; } = 0;
        [Column("utop_revenue")] public decimal UtopRevenue { get; set; } = 0;
        [Column("other_expense")] public decimal OtherExpense { get; set; } = 0;
        [Column("expense_note")] public string? ExpenseNote { get; set; }
    }
}
