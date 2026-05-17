# Tài liệu Yêu cầu Kỹ thuật (PRD) - Hệ thống Quản lý The Capital Coffee (Ftown 3)

## 1. Tổng quan hệ thống
Hệ thống quản lý nội bộ tối giản dành cho 2 quầy **BUS Ftown 3** và **PAUSE Ftown 3**. Mục tiêu cốt lõi là thay thế các file Excel rời rạc bằng một giao diện web tập trung, nhập liệu nhanh dạng bảng lưới (Excel-like), loại bỏ các quy trình tạo phiếu phức tạp. Dữ liệu được lưu trữ tập trung trên Supabase.

- **Công nghệ:** React (Vite / Create React App), Tailwind CSS, `@supabase/supabase-js`.
- **Thư viện bổ sung khuyến nghị:** `lucide-react` (icon), `recharts` (biểu đồ Dashboard).

---

## 2. Cấu trúc Database hiện tại trên Supabase (Context)
Agent cần tuân thủ cấu trúc các bảng sau đã được khởi tạo:
- `branches`: `id`, `name` ('BUS Ftown 3', 'PAUSE Ftown 3')
- `employees`: `id`, `full_name`, `hourly_rate`, `status`
- `menu_items`: `id`, `name`, `price`
- `inventory_inputs`: `id`, `branch_id`, `ingredient_name`, `unit`, `record_date`, `ton_dau_va_nhap`, `tong_su_dung`
- `daily_sales`: `id`, `branch_id`, `sale_date`, `item_id`, `quantity_sold`
- `daily_financials`: `id`, `branch_id`, `record_date`, `cash_revenue`, `utop_revenue`, `other_expense`, `expense_note`
- `timekeeping`: `id`, `employee_id`, `branch_id`, `work_date`, `shift` ('S' hoặc 'C'), `hours_worked`, `advance_payment`

---

## 3. Kiến trúc Giao diện & Các Trang cần xây dựng

### Bước 1: Khung ứng dụng chung (Layout & Navigation)
- Tạo thanh điều hướng bên trái (Sidebar) hoặc phía trên (Navbar) để chuyển đổi qua lại giữa 4 màn hình:
  1. Nhập Doanh Số & Thu Chi Hằng Ngày
  2. Quản Lý Kho Đơn Giản
  3. Chấm Công Nhân Viên
  4. Báo Cáo & Dashboard Tổng Hợp

---

### Bước 2: Trang 1 - Nhập Doanh Số & Thu Chi (`DailyInput.jsx`)
Giao diện nhập liệu dạng lưới cho cuối ngày.
- **Bộ lọc:** Chọn Ngày (mặc định hôm nay) và Chọn Chi nhánh (BUS hoặc PAUSE).
- **Bảng 1 (Số lượng bán hằng ngày):**
  - Hiển thị danh sách toàn bộ món lấy từ `menu_items`.
  - Cột 1: Tên món.
  - Cột 2: Ô nhập số lượng bán (`quantity_sold`). Mặc định hiển thị `0` hoặc số cũ đã lưu (nếu ngày đó đã được nhập).
- **Bảng 2 (Doanh thu tài chính & Chi phí khác):**
  - Gồm 4 ô nhập lớn ở cuối trang:
    1. Tiền mặt thu về (`cash_revenue`)
    2. Tiền qua Utop (`utop_revenue`)
    3. Chi phí phát sinh khác (`other_expense`)
    4. Ghi chú chi phí (`expense_note` - ví dụ: "Mua 6 bao đá", "Vệ sinh máy lạnh")
- **Nút hành động:** "Lưu số liệu cuối ngày". Khi bấm, tiến hành ghi đè (Upsert) dữ liệu vào bảng `daily_sales` và `daily_financials` trên Supabase tương ứng với Ngày và Chi nhánh đã chọn.

---

### Bước 3: Trang 2 - Quản Lý Kho Tối Giản (`InventoryInput.jsx`)
Nhập liệu kho theo dạng bảng tính Excel, không dùng phiếu nhập xuất.
- **Bộ lọc:** Chọn Tháng/Năm và Chọn Chi nhánh.
- **Bảng nhập liệu lưới (Grid):**
  - Danh sách nguyên liệu tự động nhóm hoặc liệt kê theo hàng dọc (Cà phê bột, Sữa đặc, Ly giấy, Muỗng...).
  - Cột cho phép sửa trực tiếp (Inline Input):
    - `Tồn đầu + Nhập`: Người dùng gõ thẳng tổng số lượng có ban đầu cộng với hàng mua thêm trong kỳ.
    - `Tổng sử dụng`: Người dùng gõ số lượng đã tiêu hao.
  - Cột tự động tính toán (Read-only):
    - `Tồn kho SSD` = `Tồn đầu + Nhập` - `Tổng sử dụng`.
    - `Tình trạng`: Nếu `Tồn kho SSD` <= 0, hiển thị chữ **"Nhập gấp"** màu đỏ nhấp nháy. Nếu > 0 hiển thị chữ **"OK"** màu xanh.
- **Nút hành động:** "Cập nhật Kho". Lưu toàn bộ bảng lưới vào `inventory_inputs`.

---

### Bước 4: Trang 3 - Chấm Công Nhân Viên (`TimekeepingInput.jsx`)
Quản lý lịch làm việc và ứng lương theo ca Sáng/Chiều.
- **Bộ lọc:** Chọn Ngày và Chọn Chi nhánh.
- **Giao diện danh sách nhân viên** (Lấy từ bảng `employees` có trạng thái active):
  - Với mỗi nhân viên, hiển thị các trường dữ liệu sau để điền:
    1. Chọn Ca làm: Checkbox hoặc Dropdown chọn `Ca Sáng (S)` hoặc `Ca Chiều (C)`.
    2. Số giờ làm (`hours_worked`): Mặc định gợi ý số giờ của ca (ví dụ: 4 hoặc 5 tiếng), cho phép sửa nếu làm tăng ca.
    3. Tiền tạm ứng trong ca (`advance_payment`): Ô nhập số tiền nếu nhân viên có ứng trước tiền mặt tại quầy.
- **Nút hành động:** "Lưu Chấm Công". Thực hiện lưu vào bảng `timekeeping`.

---

### Bước 5: Trang 4 - Dashboard & Báo Cáo Tổng Hợp (`Dashboard.jsx`)
Trang tự động tính toán dòng tiền, thay thế hoàn toàn công thức Excel thủ công.
- **Bộ lọc tổng:** Chọn Tháng/Năm để xem báo cáo chi tiết.
- **Khối chỉ số tổng hợp (Cards):**
  - **Tổng doanh thu:** `= SUM(cash_revenue + utop_revenue)` của tháng được chọn.
  - **Tổng chi phí vận hành:** `= SUM(other_expense)` của tháng.
  - **Tổng quỹ lương NV:** Hệ thống tự tính bằng cách lấy dữ liệu từ bảng `timekeeping` trong tháng, liên kết với `hourly_rate` của từng nhân viên để ra tổng lương thực tế.
  - **Lợi nhuận thực tế:** `= Tổng doanh thu - Chi phí vận hành - Quỹ lương`.
- **Biểu đồ (Khuyến khích dùng Recharts):**
  - Biểu đồ cột chồng hoặc cột đôi so sánh Doanh thu (Tiền mặt vs Utop) của Quầy BUS và Quầy PAUSE qua các ngày trong tháng.
  - Biểu đồ tròn thể hiện cơ cấu chi phí (Chi phí lương vs Chi phí vặt vãnh).

---

## 4. Hướng dẫn Triển khai cho Agent (Implementation Steps)
1. **Bước 1:** Kiểm tra kết nối file `src/supabaseClient.js`, đảm bảo ứng dụng không bị lỗi import.
2. **Bước 2:** Tạo thư mục `src/components` và dựng khung Layout (Sidebar định tuyến).
3. **Bước 3:** Tạo và hoàn thiện trang `DailyInput.jsx` trước, đảm bảo tính năng lưu dữ liệu bán hàng và doanh thu hoạt động chuẩn xác.
4. **Bước 4:** Tạo trang `InventoryInput.jsx` và tích hợp công thức tự động tính toán Tồn kho SSD.
5. **Bước 5:** Tạo trang `TimekeepingInput.jsx` để chấm công.
6. **Bước 6:** Tạo trang `Dashboard.jsx`, viết các hàm tính toán tổng hợp từ Supabase và dựng biểu đồ trực quan.

Hãy thực hiện từng bước một và chạy Browser Verification sau mỗi cấu phần để đảm bảo ứng dụng không lỗi.

## 5. Yêu cầu Giao diện Đa thiết bị (Responsive UI Requirements)

Agent cần thiết kế giao diện theo tư duy "Mobile-First" (Ưu tiên hiển thị tốt trên điện thoại trước, sau đó mở rộng ra máy tính bảng và máy tính).

### Quy tắc hiển thị trên các thiết bị:
1. **Màn hình Máy tính (Desktop/Laptop):**
   - Hiển thị đầy đủ Sidebar điều hướng ở bên trái.
   - Các bảng dữ liệu (`DailyInput`, `InventoryInput`) hiển thị dạng bảng lưới nằm ngang (Excel-like Grid) để nhìn được tổng thể nhiều cột cùng lúc.

2. **Màn hình Điện thoại (Mobile) & Máy tính bảng (Tablet):**
   - Sidebar tự động thu gọn thành một nút bấm Menu (Hamburger Menu) ở góc màn hình.
   - **Tối ưu bảng dữ liệu:** Trên màn hình dọc của điện thoại, các bảng dữ liệu nằm ngang phức tạp phải tự động chuyển đổi giao diện thành **dạng danh sách thẻ (Card List)** hoặc **dạng cuộn dọc**. Mỗi món ăn hoặc mỗi loại nguyên liệu sẽ là một thẻ riêng biệt, có ô nhập số to, rõ ràng, dễ dùng ngón tay để bấm chọn mà không bị lệch dòng.