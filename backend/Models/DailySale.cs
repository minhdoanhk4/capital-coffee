using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace CoffeeManagement.Models
{
    [Table("daily_sales")]
    public class DailySale : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("branch_id")] public int BranchId { get; set; }
        [Column("sale_date")] public DateTime SaleDate { get; set; }
        [Column("item_id")] public int ItemId { get; set; }
        [Column("quantity_sold")] public int QuantitySold { get; set; } = 0;
    }
}
