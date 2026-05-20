using Postgrest.Attributes;
using Postgrest.Models;
using System.Text.Json.Serialization;

namespace CoffeeManagement.Models
{
    [Table("menu_items")]
    public class MenuItem : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        
        [Column("name")] 
        [JsonPropertyName("name")]
        public string Name { get; set; } = string.Empty;
        
        [Column("price")] 
        [JsonPropertyName("price")]
        public decimal Price { get; set; }
        
        [Column("size")] 
        [JsonPropertyName("size")]
        public string? Size { get; set; }
        
        [Column("branch_id")] 
        [JsonPropertyName("branch_id")]
        public int? BranchId { get; set; }

        [Column("category")] 
        [JsonPropertyName("category")]
        public string Category { get; set; } = "Khác";
    }
}
