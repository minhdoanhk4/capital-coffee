using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace CoffeeManagement.Models
{
    [Table("inventory_inputs")]
    public class InventoryInput : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("branch_id")] public int BranchId { get; set; }
        [Column("ingredient_name")] public string IngredientName { get; set; } = string.Empty;
        [Column("unit")] public string Unit { get; set; } = string.Empty;
        [Column("record_date")] public DateTime RecordDate { get; set; } = DateTime.Today;
        [Column("ton_dau_va_nhap")] public decimal TonDauVaNhap { get; set; } = 0;
        [Column("tong_su_dung")] public decimal TongSuDung { get; set; } = 0;
    }
}
