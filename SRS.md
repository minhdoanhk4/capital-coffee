# TÀI LIỆU TỔNG HỢP: QUẢN LÝ VẬN HÀNH CHUỖI CỬA HÀNG (THE CAPITAL COFFEE)

Tài liệu này bao gồm hai phần chính:
1. Phần 1: System Requirement Specification (SRS) - Định nghĩa kiến trúc dữ liệu và quy tắc nghiệp vụ lõi.
2. Phần 2: Development Guide - Hướng dẫn từng bước cấu hình và lập trình dành cho AI coding assistant (antigravity).

---

## PHẦN 1: SYSTEM REQUIREMENT SPECIFICATION (SRS)

### 1. TỔNG QUAN CÔNG NGHỆ (TECH STACK)
* Backend Framework: .NET 10 (C#) - ASP.NET Core Minimal APIs.
* Database System: Supabase (PostgreSQL) kết nối qua thư viện `supabase-csharp`.
* Mục tiêu: Hệ thống quản trị vận hành nội bộ tinh gọn, xử lý trực tiếp dữ liệu CRUD từ Supabase, không qua các bước thủ tục trung gian.

### 2. KIẾN TRÚC DỮ LIỆU & C# POCO MODELS
Toàn bộ các Model dưới đây được ánh xạ (mapping) trực tiếp 1:1 với cấu trúc database hiện tại trên Supabase.

```csharp
using System;
using Postgrest.Attributes;
using Postgrest.Models;

namespace CoffeeManagement.Models
{
    [Table("branches")]
    public class Branch : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("name")] public string Name { get; set; }
    }

    [Table("employees")]
    public class Employee : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("full_name")] public string FullName { get; set; }
        [Column("hourly_rate")] public decimal HourlyRate { get; set; } = 22000;
        [Column("status")] public string Status { get; set; } = "active";
    }

    [Table("menu_items")]
    public class MenuItem : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("name")] public string Name { get; set; }
        [Column("price")] public decimal Price { get; set; }
    }

    [Table("inventory_inputs")]
    public class InventoryInput : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("branch_id")] public int BranchId { get; set; }
        [Column("ingredient_name")] public string IngredientName { get; set; }
        [Column("unit")] public string Unit { get; set; }
        [Column("record_date")] public DateTime RecordDate { get; set; } = DateTime.Today;
        [Column("ton_dau_va_nhap")] public decimal TonDauVaNhap { get; set; } = 0;
        [Column("tong_su_dung")] public decimal TongSuDung { get; set; } = 0;
    }

    [Table("daily_sales")]
    public class DailySale : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("branch_id")] public int BranchId { get; set; }
        [Column("sale_date")] public DateTime SaleDate { get; set; }
        [Column("item_id")] public int ItemId { get; set; }
        [Column("quantity_sold")] public int QuantitySold { get; set; } = 0;
    }

    [Table("daily_financials")]
    public class DailyFinancial : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("branch_id")] public int BranchId { get; set; }
        [Column("record_date")] public DateTime RecordDate { get; set; }
        [Column("cash_revenue")] public decimal CashRevenue { get; set; } = 0;
        [Column("utop_revenue")] public decimal UtopRevenue { get; set; } = 0;
        [Column("other_expense")] public decimal OtherExpense { get; set; } = 0;
        [Column("expense_note")] public string ExpenseNote { get; set; }
    }

    [Table("timekeeping")]
    public class Timekeeping : BaseModel
    {
        [PrimaryKey("id", false)] public int Id { get; set; }
        [Column("employee_id")] public int EmployeeId { get; set; }
        [Column("branch_id")] public int BranchId { get; set; }
        [Column("work_date")] public DateTime WorkDate { get; set; }
        [Column("shift")] public string Shift { get; set; } 
        [Column("hours_worked")] public decimal HoursWorked { get; set; } = 0;
        [Column("advance_payment")] public decimal AdvancePayment { get; set; } = 0;
    }
}
3. CHI TIẾT NGHIỆP VỤ & QUY TẮC LOGIC (BUSINESS RULES)
3.1. Danh Mục Gốc (Master Data)
Chi nhánh (branches): Tên chi nhánh duy nhất (UNIQUE), phục vụ lọc dữ liệu trên toàn hệ thống. Mặc định hệ thống chạy song song 2 chi nhánh: 'BUS Ftown 3' và 'PAUSE Ftown 3'.

Nhân viên (employees): Mặc định hourly_rate là 22,000 VND nếu bỏ trống. Chỉ những nhân viên có trạng thái 'active' mới hiển thị trên giao diện chấm công hàng ngày.

Món ăn (menu_items): Lưu thông tin tên món và giá bán lẻ cố định để đối soát doanh thu.

3.2. Chấm Công Vận Hành (timekeeping)
Nhập liệu nhanh dạng Grid theo Ngày và Chi nhánh.

Quy định mã ca (shift): Chỉ nhận 2 giá trị là 'S' (Ca Sáng) hoặc 'C' (Ca Chiều).

Công thức lương trên ca: Lương thực nhận = (HoursWorked * HourlyRate) - AdvancePayment

3.3. Kiểm Kho Đơn Giản (inventory_inputs)
Hệ thống không tự động trừ kho từ hóa đơn. Quản lý kiểm kho thực tế cuối kỳ (ngày/tuần) rồi điền trực tiếp thông số.

Công thức tính tồn kho: Tồn cuối ngày = TonDauVaNhap - TongSuDung

3.4. Số Lượng Bán Hàng (daily_sales)
Cuối ngày nhập số lượng ly bán ra của từng món (quantity_sold). Mặc định nếu không nhập hoặc không bán được là 0.

3.5. Tài Chính & Chi Phí (daily_financials)
Doanh thu phân tách rõ ràng thành 2 nguồn: Tiền mặt (cash_revenue) và Ví điện tử Utop (utop_revenue).

Nếu có phát sinh chi phí (other_expense > 0), bắt buộc phải ghi nhận diễn giải (expense_note) (Ví dụ: "Mua 6 bao đá").

Công thức tổng thu: Tổng doanh thu thực tế = CashRevenue + UtopRevenue

4. DANH SÁCH ENDPOINTS API (MINIMAL API SPEC)
Phân hệ Chi nhánh (Branches)
GET /api/branches -> Lấy danh sách toàn bộ chi nhánh.

POST /api/branches -> Thêm mới một chi nhánh.

Phân hệ Nhân viên (Employees)
GET /api/employees -> Lấy danh sách nhân sự.

POST /api/employees -> Thêm mới nhân sự vào hệ thống.

PUT /api/employees/{id} -> Cập nhật thông tin hoặc trạng thái làm việc (active/inactive) của nhân viên.

Phân hệ Thực đơn (Menu)
GET /api/menu-items -> Lấy danh mục món ăn và đơn giá gốc.

POST /api/menu-items -> Thêm món mới hoặc cập nhật giá.

Phân hệ Chấm công (Timekeeping)
GET /api/timekeeping -> Xem lịch sử chấm công (Hỗ trợ lọc theo tham số date và branchId).

POST /api/timekeeping/bulk -> Lưu chuỗi chấm công hàng loạt theo ca của một ngày cụ thể.

Phân hệ Kho hàng (Inventory)
POST /api/inventory/record -> Lưu dữ liệu kiểm kho thực tế do quản lý nhập vào.

Phân hệ Bán hàng (Sales)
POST /api/sales/daily -> Ghi nhận số lượng bán lẻ cuối ngày của từng món tại chi nhánh.

Phân hệ Tài chính (Financials)
POST /api/financials -> Chốt doanh thu tiền mặt, doanh thu utop và chi phí phát sinh cuối ngày.

Phân hệ Báo cáo (Reports)
GET /api/reports/revenue-compare -> API báo cáo đối soát chênh lệch: So sánh giữa Tổng doanh thu thực tế (daily_financials) và doanh thu lý thuyết tính theo số lượng ly bán lẻ (Tổng của QuantitySold * Price).

GET /api/reports/pnl -> API báo cáo Lợi nhuận thuần: Lấy Tổng doanh thu thực tế trừ đi Tổng chi phí vận hành (bao gồm chi phí khác và tổng quỹ lương nhân viên).