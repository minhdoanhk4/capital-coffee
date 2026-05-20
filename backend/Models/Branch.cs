using Postgrest.Attributes;
using Postgrest.Models;

namespace CoffeeManagement.Models
{
    [Table("branches")]
    public class Branch : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("name")] public string Name { get; set; } = string.Empty;
    }
}
