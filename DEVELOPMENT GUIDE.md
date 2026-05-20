BƯỚC 1: KHỞI TẠO DỰ ÁN .NET 10 & CÀI ĐẶT THƯ VIỆN
Tạo một dự án ASP.NET Core Web API trống (sử dụng Minimal APIs).

Thêm package Supabase C# Client vào file .csproj:

XML
<PackageReference Include="supabase-csharp" Version="0.16.2" />
BƯỚC 2: CẤU HÌNH KẾT NỐI SUPABASE
Cấu hình thông tin kết nối trong tệp appsettings.json:

JSON
{
  "Supabase": {
    "Url": "[https://hnpydicsafapdkimqijb.supabase.co](https://hnpydicsafapdkimqijb.supabase.co)",
    "Key": "YOUR_SUPABASE_ANON_KEY"
  }
}
Đăng ký Supabase.Client trong tệp Program.cs dưới dạng Singleton để tái sử dụng xuyên suốt ứng dụng.

BƯỚC 3: XÂY DỰNG LỚP DỮ LIỆU (MODELS)
Tạo thư mục Models/.

Sao chép và tạo chính xác 7 Class Models (Branch, Employee, MenuItem, InventoryInput, DailySale, DailyFinancial, Timekeeping) đã được định nghĩa rõ ràng kèm thuộc tính [Table] và [Column] ở Phần 1.

BƯỚC 4: TRIỂN KHAI CÁC ROUTE CRUD MINIMAL APIS
Hãy triển khai tuần tự các Group Endpoint sau vào Program.cs:

1. Nhóm Master Data (Branch, Employee, Menu)
Tạo các endpoint basic CRUD.

Thêm kiểm tra validation: Khi tạo mới nhân viên, nếu hourly_rate không được truyền lên, gán giá trị mặc định bằng 22000.

2. Nhóm Vận Hành Hàng Ngày (Timekeeping, Sales, Inventory, Financials)
/api/timekeeping/bulk: Nhận vào một danh sách các bản ghi chấm công của một ngày. Chỉ cho phép chèn nếu nhân viên có trạng thái là active.

/api/financials: Nhập dữ liệu tài chính cuối ngày. Kiểm tra điều kiện logic: Nếu OtherExpense > 0 và ExpenseNote để trống hoặc vô nghĩa, trả về lỗi 400 Bad Request.

BƯỚC 5: LẬP TRÌNH LOGIC BÁO CÁO TỔNG HỢP (REPORTS)
Triển khai 2 API xử lý logic tính toán tổng hợp dữ liệu:

1. Endpoint /api/reports/revenue-compare
Tham số truyền vào: branchId (int), fromDate (DateTime), toDate (DateTime).

Logic xử lý:

Lấy tổng thu nhập thực tế từ bảng daily_financials (CashRevenue + UtopRevenue).

Lấy danh sách số lượng bán từ daily_sales kết hợp với giá tiền từ menu_items để tính doanh số lý thuyết (QuantitySold * Price).

Trả về kết quả đối chiếu và số tiền chênh lệch cụ thể (Doanh thu lý thuyết - Doanh thu thực tế).

2. Endpoint /api/reports/pnl
Tham số truyền vào: branchId (int), fromDate (DateTime), toDate (DateTime).

Logic xử lý:

Lấy tổng doanh thu thực tế (CashRevenue + UtopRevenue).

Tính tổng chi phí vận hành gồm: OtherExpense từ bảng daily_financials cộng với Tổng tiền lương ca làm việc từ bảng timekeeping (phối hợp với giá lương theo giờ HourlyRate của bảng employees).

Tính toán Lợi nhuận thuần = Tổng doanh thu thực tế - Tổng chi phí vận hành và trả về cấu trúc JSON chi tiết.

BƯỚC 6: KIỂM TRA TOÀN DIỆN (TESTING)
Đảm bảo chạy ứng dụng không lỗi biên dịch trên môi trường .NET 10.

Kiểm tra tất cả các trường dữ liệu có kiểu số (numeric, int) không bị gán giá trị âm, bảo toàn logic nghiệp vụ thực tế của cửa hàng.