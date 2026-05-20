using Supabase;
using CoffeeManagement.Models;
using static Postgrest.Constants;

var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
builder.Services.AddEndpointsApiExplorer();

// Configure CORS
builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy.AllowAnyOrigin()
              .AllowAnyMethod()
              .AllowAnyHeader();
    });
});

// Register Supabase Client
var supabaseUrl = builder.Configuration["Supabase:Url"];
var supabaseKey = builder.Configuration["Supabase:Key"];

if (string.IsNullOrEmpty(supabaseUrl) || string.IsNullOrEmpty(supabaseKey))
{
    throw new InvalidOperationException("Supabase Url and Key must be configured in appsettings.json");
}

builder.Services.AddSingleton(provider => 
    new Supabase.Client(supabaseUrl, supabaseKey, new SupabaseOptions
    {
        AutoRefreshToken = true,
        AutoConnectRealtime = true
    }));

var app = builder.Build();

// Configure the HTTP request pipeline.
app.UseCors();

app.MapGet("/", () => Results.Ok(new { message = "The Capital Coffee Backend API is running." }));

// ==========================================
// PHÂN HỆ CHI NHÁNH (BRANCHES)
// ==========================================

app.MapGet("/api/branches", async (Supabase.Client client) =>
{
    var response = await client.From<Branch>().Get();
    var data = response.Models.Select(b => new { id = b.Id, name = b.Name });
    return Results.Ok(data);
});

app.MapPost("/api/branches", async (Supabase.Client client, Branch branch) =>
{
    var response = await client.From<Branch>().Insert(branch);
    var model = response.Model;
    return Results.Created($"/api/branches/{model.Id}", new { id = model.Id, name = model.Name });
});

app.MapPut("/api/branches/{id}", async (Supabase.Client client, int id, Branch branch) =>
{
    branch.Id = id;
    var response = await client.From<Branch>().Update(branch);
    var model = response.Model;
    return Results.Ok(new { id = model.Id, name = model.Name });
});

app.MapDelete("/api/branches/{id}", async (Supabase.Client client, int id) =>
{
    await client.From<Branch>().Where(b => b.Id == id).Delete();
    return Results.NoContent();
});

// ==========================================
// PHÂN HỆ NHÂN VIÊN (EMPLOYEES)
// ==========================================

app.MapGet("/api/employees", async (Supabase.Client client) =>
{
    var response = await client.From<Employee>().Get();
    var data = response.Models.Select(e => new { 
        id = e.Id, 
        full_name = e.FullName, 
        phone = e.Phone,
        hourly_rate = e.HourlyRate, 
        status = e.Status 
    });
    return Results.Ok(data);
});

app.MapPost("/api/employees", async (Supabase.Client client, Employee employee) =>
{
    if (employee.HourlyRate == 0)
    {
        employee.HourlyRate = 22000;
    }
    var response = await client.From<Employee>().Insert(employee);
    var model = response.Model;
    return Results.Created($"/api/employees/{model.Id}", new { id = model.Id, full_name = model.FullName, phone = model.Phone, hourly_rate = model.HourlyRate, status = model.Status });
});

app.MapPut("/api/employees/{id}", async (Supabase.Client client, int id, Employee employee) =>
{
    employee.Id = id;
    var response = await client.From<Employee>().Update(employee);
    var model = response.Model;
    return Results.Ok(new { id = model.Id, full_name = model.FullName, phone = model.Phone, hourly_rate = model.HourlyRate, status = model.Status });
});

app.MapDelete("/api/employees/{id}", async (Supabase.Client client, int id) =>
{
    await client.From<Employee>().Where(e => e.Id == id).Delete();
    return Results.NoContent();
});

// ==========================================
// PHÂN HỆ SẮP CA (SCHEDULES)
// ==========================================

app.MapGet("/api/schedules", async (Supabase.Client client) =>
{
    try
    {
        var response = await client.From<Schedule>().Get();
        var data = response.Models.Select(s => new { 
            id = s.Id, 
            employee_id = s.EmployeeId, 
            branch_id = s.BranchId, 
            work_date = s.WorkDate, 
            shift = s.Shift 
        });
        return Results.Ok(data);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/schedules", async (Supabase.Client client, Schedule schedule) =>
{
    try
    {
        var response = await client.From<Schedule>().Insert(schedule);
        var model = response.Model;
        return Results.Created($"/api/schedules/{model?.Id}", new { 
            id = model?.Id, 
            employee_id = model?.EmployeeId, 
            branch_id = model?.BranchId, 
            work_date = model?.WorkDate, 
            shift = model?.Shift 
        });
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapDelete("/api/schedules/clear", async (Supabase.Client client, int employeeId, string workDate) =>
{
    try
    {
        await client.From<Schedule>()
            .Where(s => s.EmployeeId == employeeId && s.WorkDate == workDate)
            .Delete();
        return Results.NoContent();
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

// ==========================================
// PHÂN HỆ THỰC ĐƠN (MENU)
// ==========================================

app.MapGet("/api/menu-items", async (Supabase.Client client, int? branchId, string? search) =>
{
    var query = client.From<MenuItem>();
    if (branchId.HasValue)
    {
        query.Filter("branch_id", Operator.Equals, branchId.Value);
    }
    if (!string.IsNullOrEmpty(search))
    {
        query.Filter("name", Operator.ILike, $"%{search}%");
    }
    var response = await query.Get();
    var data = response.Models.Select(m => new { id = m.Id, name = m.Name, price = m.Price, size = m.Size, branch_id = m.BranchId, category = m.Category });
    return Results.Ok(data);
});

app.MapPost("/api/menu-items", async (Supabase.Client client, MenuItem item) =>
{
    var response = await client.From<MenuItem>().Insert(item);
    var model = response.Model;
    return Results.Created($"/api/menu-items/{model.Id}", new { id = model.Id, name = model.Name, price = model.Price, size = model.Size, branch_id = model.BranchId, category = model.Category });
});

app.MapPut("/api/menu-items/{id}", async (Supabase.Client client, int id, MenuItem item) =>
{
    item.Id = id;
    var response = await client.From<MenuItem>().Update(item);
    var model = response.Model;
    return Results.Ok(new { id = model.Id, name = model.Name, price = model.Price, size = model.Size, branch_id = model.BranchId, category = model.Category });
});

app.MapDelete("/api/menu-items/{id}", async (Supabase.Client client, int id) =>
{
    await client.From<MenuItem>().Where(m => m.Id == id).Delete();
    return Results.NoContent();
});

// ==========================================
// PHÂN HỆ CHẤM CÔNG (TIMEKEEPING)
// ==========================================

app.MapGet("/api/timekeeping/all", async (Supabase.Client client) =>
{
    var response = await client.From<Timekeeping>().Get();
    var data = response.Models.Select(t => new { 
        id = t.Id, 
        employee_id = t.EmployeeId, 
        branch_id = t.BranchId, 
        work_date = t.WorkDate, 
        shift = t.Shift, 
        hours_worked = t.HoursWorked, 
        advance_payment = t.AdvancePayment 
    });
    return Results.Ok(data);
});

app.MapGet("/api/timekeeping", async (Supabase.Client client, string? date, int? branchId) =>
{
    var query = client.From<Timekeeping>();
    
    if (!string.IsNullOrEmpty(date))
    {
        query.Filter("work_date", Operator.GreaterThanOrEqual, date);
        query.Filter("work_date", Operator.LessThanOrEqual, date + "T23:59:59");
    }
    if (branchId.HasValue)
    {
        query.Filter("branch_id", Operator.Equals, branchId.Value);
    }
    
    var response = await query.Get();
    Console.WriteLine($"[DEBUG] Timekeeping fetch returned {response.Models.Count} records for date {date} and branch {branchId}");
    foreach (var r in response.Models)
    {
        Console.WriteLine($"[DEBUG] Record: EmpId={r.EmployeeId}, Date={r.WorkDate}, Shift={r.Shift}");
    }
    var data = response.Models.Select(t => new { 
        id = t.Id, 
        employee_id = t.EmployeeId, 
        branch_id = t.BranchId, 
        work_date = t.WorkDate, 
        shift = t.Shift, 
        hours_worked = t.HoursWorked, 
        advance_payment = t.AdvancePayment 
    });
    return Results.Ok(data);
});

app.MapGet("/api/timekeeping/candidates", async (Supabase.Client client, int branchId, string date) =>
{
    try
    {
        var scheduleResponse = await client.From<Schedule>()
            .Filter("branch_id", Operator.Equals, branchId)
            .Filter("work_date", Operator.Equals, date)
            .Get();

        var schedules = scheduleResponse.Models;

        if (!schedules.Any())
        {
            return Results.Ok(new List<object>());
        }

        var employeeResponse = await client.From<Employee>().Get();
        var employeeDict = employeeResponse.Models.ToDictionary(e => e.Id, e => e.FullName);

        var result = schedules.Select(s => new {
            employee_id = s.EmployeeId,
            full_name = employeeDict.TryGetValue(s.EmployeeId, out var name) ? name : "Không xác định",
            shift = s.Shift,
            branch_id = s.BranchId,
            work_date = s.WorkDate
        });

        return Results.Ok(result);
    }
    catch (Exception ex)
    {
        return Results.Problem(ex.Message);
    }
});

app.MapPost("/api/timekeeping/bulk", async (Supabase.Client client, List<Timekeeping> records) =>
{
    var empResponse = await client.From<Employee>().Get();
    var activeEmployeeIds = empResponse.Models
        .Where(e => e.Status == "active")
        .Select(e => e.Id)
        .ToList();

    foreach (var record in records)
    {
        record.WorkDate = DateTime.SpecifyKind(record.WorkDate, DateTimeKind.Utc);
        if (!activeEmployeeIds.Contains(record.EmployeeId))
        {
            return Results.BadRequest(new { message = $"Nhân viên với ID {record.EmployeeId} không hoạt động (inactive) hoặc không tồn tại." });
        }
        
        if (record.HoursWorked < 0 || record.AdvancePayment < 0)
        {
            return Results.BadRequest(new { message = "Số giờ làm và tiền tạm ứng không được âm." });
        }
    }

    var response = await client.From<Timekeeping>().Insert(records);
    var data = response.Models.Select(t => new { 
        id = t.Id, 
        employee_id = t.EmployeeId, 
        branch_id = t.BranchId, 
        work_date = t.WorkDate, 
        shift = t.Shift, 
        hours_worked = t.HoursWorked, 
        advance_payment = t.AdvancePayment 
    });
    return Results.Ok(data);
});

// ==========================================
// PHÂN HỆ KHO HÀNG (INVENTORY)
// ==========================================

app.MapPost("/api/inventory/record", async (Supabase.Client client, InventoryInput input) =>
{
    if (input.TonDauVaNhap < 0 || input.TongSuDung < 0)
    {
        return Results.BadRequest(new { message = "Số lượng tồn kho không được âm." });
    }
    
    var response = await client.From<InventoryInput>().Insert(input);
    var model = response.Model;
    return Results.Created($"/api/inventory/record/{model.Id}", new { 
        id = model.Id, 
        branch_id = model.BranchId, 
        ingredient_name = model.IngredientName, 
        unit = model.Unit, 
        record_date = model.RecordDate, 
        ton_dau_va_nhap = model.TonDauVaNhap, 
        tong_su_dung = model.TongSuDung 
    });
});

// ==========================================
// PHÂN HỆ BÁN HÀNG (SALES)
// ==========================================

app.MapPost("/api/sales/daily", async (Supabase.Client client, List<DailySale> sales) =>
{
    foreach (var sale in sales)
    {
        if (sale.QuantitySold < 0)
        {
            return Results.BadRequest(new { message = "Số lượng bán không được âm." });
        }
    }
    
    var response = await client.From<DailySale>().Insert(sales);
    var data = response.Models.Select(s => new { 
        id = s.Id, 
        branch_id = s.BranchId, 
        sale_date = s.SaleDate, 
        item_id = s.ItemId, 
        quantity_sold = s.QuantitySold 
    });
    return Results.Ok(data);
});

// ==========================================
// PHÂN HỆ TÀI CHÍNH (FINANCIALS)
// ==========================================

app.MapPost("/api/financials", async (Supabase.Client client, DailyFinancial financial) =>
{
    if (financial.OtherExpense > 0 && string.IsNullOrWhiteSpace(financial.ExpenseNote))
    {
        return Results.BadRequest(new { message = "Bắt buộc phải ghi nhận diễn giải (ExpenseNote) khi có chi phí phát sinh." });
    }
    
    if (financial.CashRevenue < 0 || financial.UtopRevenue < 0 || financial.OtherExpense < 0)
    {
        return Results.BadRequest(new { message = "Các giá trị tài chính không được âm." });
    }
    
    var response = await client.From<DailyFinancial>().Insert(financial);
    var model = response.Model;
    return Results.Created($"/api/financials/{model.Id}", new { 
        id = model.Id, 
        branch_id = model.BranchId, 
        record_date = model.RecordDate, 
        cash_revenue = model.CashRevenue, 
        utop_revenue = model.UtopRevenue, 
        other_expense = model.OtherExpense, 
        expense_note = model.ExpenseNote 
    });
});

// ==========================================
// PHÂN HỆ BÁO CÁO (REPORTS)
// ==========================================

app.MapGet("/api/reports/revenue-compare", async (Supabase.Client client, int branchId, DateTime fromDate, DateTime toDate) =>
{
    var financialResponse = await client.From<DailyFinancial>()
        .Filter("branch_id", Operator.Equals, branchId)
        .Filter("record_date", Operator.GreaterThanOrEqual, fromDate.ToString("yyyy-MM-dd"))
        .Filter("record_date", Operator.LessThanOrEqual, toDate.ToString("yyyy-MM-dd"))
        .Get();

    decimal totalActualRevenue = financialResponse.Models.Sum(f => f.CashRevenue + f.UtopRevenue);

    var salesResponse = await client.From<DailySale>()
        .Filter("branch_id", Operator.Equals, branchId)
        .Filter("sale_date", Operator.GreaterThanOrEqual, fromDate.ToString("yyyy-MM-dd"))
        .Filter("sale_date", Operator.LessThanOrEqual, toDate.ToString("yyyy-MM-dd"))
        .Get();

    var menuResponse = await client.From<MenuItem>().Get();
    var menuDict = menuResponse.Models.ToDictionary(m => m.Id, m => m.Price);

    decimal totalTheoreticalRevenue = 0;
    foreach (var sale in salesResponse.Models)
    {
        if (menuDict.TryGetValue(sale.ItemId, out var price))
        {
            totalTheoreticalRevenue += sale.QuantitySold * price;
        }
    }

    decimal difference = totalTheoreticalRevenue - totalActualRevenue;

    return Results.Ok(new
    {
        branchId,
        fromDate,
        toDate,
        totalActualRevenue,
        totalTheoreticalRevenue,
        difference
    });
});

app.MapGet("/api/reports/pnl", async (Supabase.Client client, int branchId, DateTime fromDate, DateTime toDate) =>
{
    var financialResponse = await client.From<DailyFinancial>()
        .Filter("branch_id", Operator.Equals, branchId)
        .Filter("record_date", Operator.GreaterThanOrEqual, fromDate.ToString("yyyy-MM-dd"))
        .Filter("record_date", Operator.LessThanOrEqual, toDate.ToString("yyyy-MM-dd"))
        .Get();

    decimal totalActualRevenue = financialResponse.Models.Sum(f => f.CashRevenue + f.UtopRevenue);
    decimal totalOtherExpense = financialResponse.Models.Sum(f => f.OtherExpense);

    var timekeepingResponse = await client.From<Timekeeping>()
        .Filter("branch_id", Operator.Equals, branchId)
        .Filter("work_date", Operator.GreaterThanOrEqual, fromDate.ToString("yyyy-MM-dd"))
        .Filter("work_date", Operator.LessThanOrEqual, toDate.ToString("yyyy-MM-dd"))
        .Get();

    var employeeResponse = await client.From<Employee>().Get();
    var employeeDict = employeeResponse.Models.ToDictionary(e => e.Id, e => e.HourlyRate);

    decimal totalPayroll = 0;
    foreach (var record in timekeepingResponse.Models)
    {
        if (employeeDict.TryGetValue(record.EmployeeId, out var rate))
        {
            totalPayroll += (record.HoursWorked * rate) - record.AdvancePayment;
        }
    }

    decimal totalOperatingCost = totalOtherExpense + totalPayroll;
    decimal netProfit = totalActualRevenue - totalOperatingCost;

    return Results.Ok(new
    {
        branchId,
        fromDate,
        toDate,
        totalActualRevenue,
        totalOtherExpense,
        totalPayroll,
        totalOperatingCost,
        netProfit
    });
});

app.Run();
