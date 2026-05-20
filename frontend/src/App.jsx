import { useState, useEffect } from 'react'
import html2canvas from 'html2canvas'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'


// Helper to get local date string (yyyy-MM-dd) without timezone shift
const getLocalDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function App() {
  const [currentView, setCurrentView] = useState('dashboard')
  const [branches, setBranches] = useState([])
  const [employees, setEmployees] = useState([])
  const [menuItems, setMenuItems] = useState([])
  const [dbSchedules, setDbSchedules] = useState([]) // From DB
  
  // Auth state (Current Branch)
  const [currentBranch, setCurrentBranch] = useState(null)
  
  // Hub view states ('scheduling' | 'timekeeping' | null)
  const [hubView, setHubView] = useState(null)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  
  const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme])
  
  // Modal visibility states
  const [showEmployeeModal, setShowEmployeeModal] = useState(false)
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [showTimekeepingModal, setShowTimekeepingModal] = useState(false)
  
  // Edit states
  const [editEmployee, setEditEmployee] = useState(null)
  const [editMenuItem, setEditMenuItem] = useState(null)
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [menuSearchQuery, setMenuSearchQuery] = useState('')
  
  // Form states
  const [newEmployee, setNewEmployee] = useState({ full_name: '', phone: '', hourly_rate: 22000, status: 'active' })
  const [newMenuItem, setNewMenuItem] = useState({ name: '', price: 0, size: '', category: 'Cà phê' })
  const [timekeeping, setTimekeeping] = useState({ employee_id: '', branch_id: '', work_date: new Date().toISOString().split('T')[0], shift: 'S', hours_worked: 0, advance_payment: 0 })
  const [inventory, setInventory] = useState({ ingredient_name: '', unit: '', ton_dau_va_nhap: 0, tong_su_dung: 0, record_date: getLocalDateString(new Date()) })
  const [salesInput, setSalesInput] = useState({}) // { itemId: quantity }
  const [salesDate, setSalesDate] = useState(getLocalDateString(new Date()))
  const [financials, setFinancials] = useState({ cash_revenue: 0, utop_revenue: 0, other_expense: 0, expense_note: '', record_date: getLocalDateString(new Date()) })
  
  // Report states
  const [reportParams, setReportParams] = useState({ branchId: '', fromDate: '', toDate: '' })
  const [reportData, setReportData] = useState(null)

  // Scheduling local state (mapped from DB)
  const [viewMode, setViewMode] = useState('month') // Default to month for new view
  const [selectedDate, setSelectedDate] = useState(new Date()) // Current selected date for calendar
  const [activeCell, setActiveCell] = useState(null) // { empId, date }
  const [activeMonthEmp, setActiveMonthEmp] = useState(null) // For month view details
  const [timekeepingDate, setTimekeepingDate] = useState(getLocalDateString(new Date()))
  const [candidateInputs, setCandidateInputs] = useState({}) // { [empId_shift]: { present: false, lateMinutes: 0 } }
  const [tempSchedule, setTempSchedule] = useState({ S: '', C: '' })
  
  // All timekeeping records for coloring the calendar bars
  const [dbTimekeepings, setDbTimekeepings] = useState([])

  const daysOfWeek = ['Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7', 'Chủ Nhật']
  
  // Helper to get week dates based on selectedDate
  const getWeekDates = () => {
    const day = selectedDate.getDay();
    const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(selectedDate);
    monday.setDate(diff);
    
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      dates.push(getLocalDateString(d));
    }
    return dates;
  }

  const weekDates = getWeekDates()

  // Helper to get all dates in current month
  const getMonthDates = () => {
    const year = selectedDate.getFullYear();
    const month = selectedDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dates = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      dates.push(getLocalDateString(d));
    }
    return dates;
  }

  // Helper to get months of current year
  const getYearMonths = () => {
    const now = new Date();
    const year = now.getFullYear();
    const months = [];
    for (let i = 0; i < 12; i++) {
      months.push(`${year}-${String(i + 1).padStart(2, '0')}`);
    }
    return months;
  }

  const monthDates = getMonthDates()
  const yearMonths = getYearMonths()

  useEffect(() => {
    fetchBranches()
    fetchEmployees()
    fetchSchedules()
    fetchAllTimekeepingRecords()
  }, [])

  // Unified fetch for menu items with search and branch filtering
  useEffect(() => {
    const delayDebounce = setTimeout(() => {
      fetchMenuItems(menuSearchQuery)
    }, 300)

    return () => clearTimeout(delayDebounce)
  }, [menuSearchQuery, currentBranch])

  // Reset search query when navigating away from menu view to restore complete list for other views
  useEffect(() => {
    if (currentView !== 'menu' && menuSearchQuery !== '') {
      setMenuSearchQuery('')
    }
  }, [currentView])

  useEffect(() => {
    if (currentView === 'timekeeping' && employees.length > 0) {
      fetchTimekeepingRecords();
    }
  }, [timekeepingDate, currentBranch, currentView, employees]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (currentView === 'menu' && expandedCategory) {
        // If clicking inside a modal or a button that opens a modal, keep it open
        if (e.target.closest('.modal-overlay') || e.target.closest('.modal-content')) {
          return;
        }
        // If clicking a button (like Sửa, Xóa, Thêm Món), keep it open
        if (e.target.closest('.btn') || e.target.closest('button')) {
          return;
        }

        // If clicking another category header, let the header's onClick toggle it
        const clickedHeader = e.target.closest('.accordion-header-card');
        if (clickedHeader) {
          return;
        }

        // Find the active accordion item group
        const activeGroup = document.querySelector(`.accordion-item-group[data-category="${expandedCategory}"]`);
        if (activeGroup && !activeGroup.contains(e.target)) {
          setExpandedCategory(null);
        }
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [currentView, expandedCategory]);

  async function fetchBranches() {
    try {
      const res = await fetch(`${API_URL}/branches`)
      const data = await res.json()
      const branchesData = Array.isArray(data) ? data : [];
      setBranches(branchesData)
      if (branchesData.length > 0) setReportParams(prev => ({ ...prev, branchId: branchesData[0].id }))
    } catch (err) { console.error('Failed to fetch branches', err) }
  }

  async function fetchEmployees() {
    try {
      const res = await fetch(`${API_URL}/employees`)
      const data = await res.json()
      setEmployees(Array.isArray(data) ? data : [])
    } catch (err) { console.error('Failed to fetch employees', err) }
  }

  async function fetchMenuItems(searchQuery = '') {
    try {
      let url = `${API_URL}/menu-items`
      const params = []
      if (currentBranch) {
        params.push(`branchId=${currentBranch.id}`)
      }
      if (searchQuery) {
        params.push(`search=${encodeURIComponent(searchQuery)}`)
      }
      if (params.length > 0) {
        url += `?${params.join('&')}`
      }
      const res = await fetch(url)
      const data = await res.json()
      // Sắp xếp theo ID để giữ nguyên thứ tự khi cập nhật
      setMenuItems(Array.isArray(data) ? data.sort((a, b) => a.id - b.id) : [])
    } catch (err) { console.error('Failed to fetch menu items', err) }
  }

  async function fetchSchedules() {
    try {
      const res = await fetch(`${API_URL}/schedules`)
      const text = await res.text()
      console.log('Raw schedules response:', text)
      const data = text ? JSON.parse(text) : []
      console.log('Parsed schedules:', data)
      setDbSchedules(Array.isArray(data) ? data : [])
    } catch (err) { console.error('Failed to fetch schedules', err) }
  }

  async function fetchAllTimekeepingRecords() {
    try {
      const res = await fetch(`${API_URL}/timekeeping/all`);
      const data = await res.json();
      setDbTimekeepings(Array.isArray(data) ? data : []);
    } catch (err) { console.error('Failed to fetch all timekeepings', err); }
  }

  async function fetchTimekeepingRecords() {
    if (!currentBranch || !timekeepingDate) return;
    try {
      const res = await fetch(`${API_URL}/timekeeping?date=${timekeepingDate}&branchId=${currentBranch.id}`);
      const data = await res.json();
      const records = Array.isArray(data) ? data : [];
      
      const inputs = {};
      records.forEach(r => {
        const key = `${r.employee_id}_${r.shift}`;
        const emp = employees.find(e => e.id === r.employee_id);
        const hourlyRate = emp?.hourly_rate || 22000;
        
        let lateMinutes = 0;
        if (r.advance_payment > 0) {
          lateMinutes = Math.round((r.advance_payment / (hourlyRate / 60)) + 5);
        }
        
        inputs[key] = {
          present: true,
          lateMinutes: lateMinutes,
          saved: true
        };
      });
      setCandidateInputs(inputs);
    } catch (err) { console.error('Failed to fetch timekeeping records', err); }
  }

  const handleOpenEditEmployee = (emp) => {
    setEditEmployee(emp)
    setNewEmployee({ full_name: emp.full_name, phone: emp.phone || '', hourly_rate: emp.hourly_rate, status: emp.status })
    setShowEmployeeModal(true)
  }

  const handleOpenEditMenuItem = (item) => {
    setEditMenuItem(item)
    setNewMenuItem({ name: item.name, price: item.price, size: item.size, category: item.category || 'Cà phê' })
    setShowMenuModal(true)
  }

  const handleCloseEmployeeModal = () => {
    setShowEmployeeModal(false)
    setEditEmployee(null)
    setNewEmployee({ full_name: '', phone: '', hourly_rate: 22000, status: 'active' })
  }

  const handleCloseMenuModal = () => {
    setShowMenuModal(false)
    setEditMenuItem(null)
    setNewMenuItem({ name: '', price: 0, size: '', category: 'Cà phê' })
  }

  const handleSaveEmployee = async (e) => {
    e.preventDefault()
    const url = editEmployee ? `${API_URL}/employees/${editEmployee.id}` : `${API_URL}/employees`
    const method = editEmployee ? 'PUT' : 'POST'
    
    const payload = {
      id: editEmployee ? editEmployee.id : 0,
      fullName: newEmployee.full_name,
      phone: newEmployee.phone || '',
      hourlyRate: newEmployee.hourly_rate,
      status: newEmployee.status
    }
    
    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        fetchEmployees()
        handleCloseEmployeeModal()
      }
    } catch (err) { console.error(err) }
  }

  const handleSaveMenuItem = async (e) => {
    e.preventDefault()
    const url = editMenuItem ? `${API_URL}/menu-items/${editMenuItem.id}` : `${API_URL}/menu-items`
    const method = editMenuItem ? 'PUT' : 'POST'
    
    try {
      const res = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newMenuItem, branch_id: currentBranch?.id })
      })
      if (res.ok) {
        fetchMenuItems(menuSearchQuery)
        handleCloseMenuModal()
      }
    } catch (err) { console.error(err) }
  }

  const handleDeleteEmployee = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return
    try {
      const res = await fetch(`${API_URL}/employees/${id}`, { method: 'DELETE' })
      if (res.ok) fetchEmployees()
    } catch (err) { console.error(err) }
  }

  const handleDeleteMenuItem = async (id) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return
    try {
      const res = await fetch(`${API_URL}/menu-items/${id}`, { method: 'DELETE' })
      if (res.ok) fetchMenuItems(menuSearchQuery)
    } catch (err) { console.error(err) }
  }

  const handleSaveTimekeeping = async (candidate, input) => {
    if (!input.present) {
      alert('Nhân viên chưa có mặt, không thể chấm công!');
      return;
    }

    const emp = employees.find(e => e.id === candidate.employee_id);
    const hourlyRate = emp?.hourly_rate || 22000;
    
    let deduction = 0;
    if (input.lateMinutes > 5) {
      deduction = (input.lateMinutes - 5) * (hourlyRate / 60);
    }

    const record = {
      EmployeeId: candidate.employee_id,
      BranchId: currentBranch.id,
      WorkDate: timekeepingDate,
      Shift: candidate.shift,
      HoursWorked: 5, // Standard shift hours
      AdvancePayment: Math.round(deduction) // Store deduction in advance_payment
    };

    try {
      const res = await fetch(`${API_URL}/timekeeping/bulk`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([record])
      });
      if (res.ok) {
        alert('Đã lưu chấm công thành công!');
        setCandidateInputs({
          ...candidateInputs,
          [`${candidate.employee_id}_${candidate.shift}`]: { ...input, saved: true }
        });
      } else {
        const err = await res.json();
        alert(`Lỗi: ${err.message}`);
      }
    } catch (err) { console.error(err); }
  }

  const handleRunReport = async (type) => {
    if (!reportParams.branchId || !reportParams.fromDate || !reportParams.toDate) {
      alert('Vui lòng điền đầy đủ tham số báo cáo!')
      return
    }
    try {
      const res = await fetch(`${API_URL}/reports/${type}?branchId=${reportParams.branchId}&fromDate=${reportParams.fromDate}&toDate=${reportParams.toDate}`)
      const data = await res.json()
      setReportData({ type, data })
    } catch (err) { console.error(err) }
  }

  const handleSelectBranch = (branch) => {
    setCurrentBranch(branch)
    setTimekeeping(prev => ({ ...prev, branch_id: branch.id }))
    setReportParams(prev => ({ ...prev, branchId: branch.id }))
    
    // On desktop, go directly to dashboard. On mobile, go to branch menu.
    if (window.innerWidth > 768) {
      setCurrentView('dashboard')
    } else {
      setCurrentView('branch-menu')
    }
  }

  const handleOpenCellPopover = (empId, date) => {
    setActiveCell({ empId, date })
    
    // Find in dbSchedules
    const morning = dbSchedules.find(s => s.employee_id === empId && s.work_date === date && s.shift === 'S')
    const afternoon = dbSchedules.find(s => s.employee_id === empId && s.work_date === date && s.shift === 'C')
    
    setTempSchedule({
      S: morning ? morning.branch_id : '',
      C: afternoon ? afternoon.branch_id : ''
    })
  }

  const handleSaveSchedule = async () => {
    const { empId, date } = activeCell
    
    try {
      // Clear existing for this day first
      const clearRes = await fetch(`${API_URL}/schedules/clear?employeeId=${empId}&workDate=${date}`, { method: 'DELETE' })
      if (!clearRes.ok) {
        const err = await clearRes.text()
        alert(`Lỗi xóa ca cũ: ${err}`)
        return
      }
      
      // Save new ones
      if (tempSchedule.S) {
        const res = await fetch(`${API_URL}/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: empId, branch_id: tempSchedule.S, work_date: date, shift: 'S' })
        })
        if (!res.ok) {
          const err = await res.text()
          alert(`Lỗi lưu ca sáng: ${err}`)
          return
        }
      }
      if (tempSchedule.C) {
        const res = await fetch(`${API_URL}/schedules`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ employee_id: empId, branch_id: tempSchedule.C, work_date: date, shift: 'C' })
        })
        if (!res.ok) {
          const err = await res.text()
          alert(`Lỗi lưu ca chiều: ${err}`)
          return
        }
      }
      
      alert('Đã lưu ca thành công!')
      fetchSchedules() // Refresh
      setActiveCell(null)
    } catch (err) { 
      console.error('Failed to save schedule', err) 
      alert(`Lỗi hệ thống: ${err.message}`)
    }
  }

  const handleClearSchedule = async () => {
    const { empId, date } = activeCell
    try {
      await fetch(`${API_URL}/schedules/clear?employeeId=${empId}&workDate=${date}`, { method: 'DELETE' })
      fetchSchedules()
      setActiveCell(null)
    } catch (err) { console.error('Failed to clear schedule', err) }
  }

  const calculateTotalHours = (empId) => {
    let activeDates = [];
    if (viewMode === 'day') {
      activeDates = [getLocalDateString(selectedDate)];
    } else if (viewMode === 'week') {
      activeDates = weekDates;
    } else if (viewMode === 'month') {
      activeDates = monthDates;
    } else if (viewMode === 'year') {
      const empScheds = dbSchedules.filter(s => s.employee_id === empId && s.work_date.startsWith('2026'));
      return empScheds.length * 5;
    }
    
    const empScheds = dbSchedules.filter(s => s.employee_id === empId && activeDates.includes(s.work_date));
    return empScheds.length * 5; // 1 ca = 5h
  }

  const renderEmployeeModal = () => {
    if (!showEmployeeModal) return null;
    return (
      <div className="modal-overlay">
        <div className="modal-content">
          <div className="modal-header">
            <div className="modal-title">{editEmployee ? 'Cập Nhật Nhân Viên' : 'Thêm Nhân Viên Mới'}</div>
            <button className="close-btn" onClick={handleCloseEmployeeModal}><i className="ph ph-x"></i></button>
          </div>
          <form onSubmit={handleSaveEmployee}>
            <div className="form-group">
              <label>Họ và Tên</label>
              <input type="text" value={newEmployee.full_name} onChange={e => setNewEmployee({...newEmployee, full_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Số Điện Thoại (SĐT)</label>
              <input type="tel" value={newEmployee.phone} onChange={e => setNewEmployee({...newEmployee, phone: e.target.value})} placeholder="VD: 0901234567" />
            </div>
            <div className="form-group">
              <label>Lương theo giờ (VND)</label>
              <input type="number" value={newEmployee.hourly_rate} onChange={e => setNewEmployee({...newEmployee, hourly_rate: parseFloat(e.target.value)})} required />
            </div>
            <div className="form-group">
              <label>Trạng thái</label>
              <select value={newEmployee.status} onChange={e => setNewEmployee({...newEmployee, status: e.target.value})} required>
                <option value="active">Hoạt động (Active)</option>
                <option value="inactive">Nghỉ việc (Inactive)</option>
              </select>
            </div>
            <button type="submit" className="btn btn-primary">Lưu</button>
          </form>
        </div>
      </div>
    );
  };

  const renderView = () => {
    switch (currentView) {
      case 'branch-menu':
        return (
          <div style={{padding: '1rem'}}>
            <h2 style={{marginBottom: '1.5rem', color: 'var(--title-color)'}}>Menu Chi Nhánh</h2>
            <div className="menu-grid">
              <div className="card" onClick={() => setCurrentView('dashboard')} style={{cursor: 'pointer', textAlign: 'center', padding: '1.5rem'}}>
                <i className="ph ph-squares-four" style={{fontSize: '2rem', color: 'var(--accent)'}}></i>
                <h3 style={{fontSize: '1rem', marginTop: '0.5rem'}}>Dashboard</h3>
              </div>
              <div className="card" onClick={() => setCurrentView('employees')} style={{cursor: 'pointer', textAlign: 'center', padding: '1.5rem'}}>
                <i className="ph ph-users" style={{fontSize: '2rem', color: 'var(--accent)'}}></i>
                <h3 style={{fontSize: '1rem', marginTop: '0.5rem'}}>Nhân Viên</h3>
              </div>
              <div className="card" onClick={() => setCurrentView('menu')} style={{cursor: 'pointer', textAlign: 'center', padding: '1.5rem'}}>
                <i className="ph ph-coffee" style={{fontSize: '2rem', color: 'var(--accent)'}}></i>
                <h3 style={{fontSize: '1rem', marginTop: '0.5rem'}}>Sản Phẩm</h3>
              </div>
              <div className="card" onClick={() => setCurrentView('inventory')} style={{cursor: 'pointer', textAlign: 'center', padding: '1.5rem'}}>
                <i className="ph ph-package" style={{fontSize: '2rem', color: 'var(--accent)'}}></i>
                <h3 style={{fontSize: '1rem', marginTop: '0.5rem'}}>Kiểm Kho</h3>
              </div>
              <div className="card" onClick={() => setCurrentView('sales')} style={{cursor: 'pointer', textAlign: 'center', padding: '1.5rem'}}>
                <i className="ph ph-shopping-cart" style={{fontSize: '2rem', color: 'var(--accent)'}}></i>
                <h3 style={{fontSize: '1rem', marginTop: '0.5rem'}}>Doanh Số</h3>
              </div>
              <div className="card" onClick={() => setCurrentView('financials')} style={{cursor: 'pointer', textAlign: 'center', padding: '1.5rem'}}>
                <i className="ph ph-money" style={{fontSize: '2rem', color: 'var(--accent)'}}></i>
                <h3 style={{fontSize: '1rem', marginTop: '0.5rem'}}>Tài Chính</h3>
              </div>
              <div className="card" onClick={() => setCurrentView('reports')} style={{cursor: 'pointer', textAlign: 'center', padding: '1.5rem'}}>
                <i className="ph ph-chart-line-up" style={{fontSize: '2rem', color: 'var(--accent)'}}></i>
                <h3 style={{fontSize: '1rem', marginTop: '0.5rem'}}>Báo Cáo</h3>
              </div>
            </div>
            <button className="btn btn-secondary" style={{marginTop: '2rem', width: '100%', padding: '1rem'}} onClick={() => setCurrentBranch(null)}>
              <i className="ph ph-arrow-left"></i> Quay lại chọn chi nhánh
            </button>
          </div>
        )

      case 'dashboard':
        return (
          <div>
            <div className="grid">
              <div className="card" style={{borderLeft: '4px solid var(--accent)'}}>
                <h3 style={{color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Nhân Viên Hệ Thống</h3>
                <p style={{fontSize: '2.5rem', fontWeight: '700', color: 'var(--accent)', marginTop: '0.5rem'}}>{employees.length}</p>
              </div>
              <div className="card" style={{borderLeft: '4px solid var(--accent)'}}>
                <h3 style={{color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em'}}>Sản Phẩm Hệ Thống</h3>
                <p style={{fontSize: '2.5rem', fontWeight: '700', color: 'var(--accent)', marginTop: '0.5rem'}}>{menuItems.length}</p>
              </div>
            </div>
            <div className="card">
              <h2>Chào mừng đến với Hệ thống Quản lý The Capital Coffee</h2>
              <p style={{marginTop: '1rem', color: 'var(--text-secondary)'}}>Bạn đang truy cập với vai trò quản lý <strong>{currentBranch.name}</strong>. Chọn một mục từ menu bên trái để bắt đầu quản lý vận hành.</p>
            </div>
          </div>
        )

      case 'employees':
        const todayStr = getLocalDateString(new Date());
        const branchTodaySchedules = dbSchedules.filter(s => s.branch_id === currentBranch?.id && s.work_date === todayStr);
        
        return (
          <div>
            <div className="card">
              <div className="section-header">
                <div>
                  <h2 style={{marginBottom: 0}}>Nhân Viên Có Ca Hôm Nay</h2>
                  <p style={{color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '0.25rem'}}>Chỉ hiển thị nhân viên được phân ca tại chi nhánh này trong ngày hôm nay.</p>
                </div>
              </div>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>STT</th>
                      <th>Họ và Tên</th>
                      <th>Ca Làm Việc</th>
                      <th>Trạng thái Chấm Công</th>
                      <th>Đi Trễ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchTodaySchedules.length > 0 ? branchTodaySchedules.map((s, index) => {
                      const emp = employees.find(e => e.id === s.employee_id);
                      const timekeepingRecord = dbTimekeepings.find(t => t.employee_id === s.employee_id && t.work_date.startsWith(todayStr) && t.shift === s.shift);
                      
                      let lateMinutes = 0;
                      if (timekeepingRecord && timekeepingRecord.advance_payment > 0) {
                        const hourlyRate = emp?.hourly_rate || 22000;
                        lateMinutes = Math.round((timekeepingRecord.advance_payment / (hourlyRate / 60)) + 5);
                      }

                      return (
                        <tr key={`${s.employee_id}_${s.shift}`}>
                          <td>{index + 1}</td>
                          <td style={{fontWeight: '600'}}>{emp?.full_name || 'Không xác định'}</td>
                          <td>{s.shift === 'S' ? 'Ca Sáng (7h - 12h)' : 'Ca Chiều (12h - 17h)'}</td>
                          <td>
                            {timekeepingRecord ? (
                              <span className="badge badge-active"><i className="ph ph-check-circle"></i> Đã chấm công</span>
                            ) : (
                              <span className="badge badge-inactive"><i className="ph ph-clock"></i> Đợi chấm công</span>
                            )}
                          </td>
                          <td>
                            {timekeepingRecord ? (
                              lateMinutes > 5 ? (
                                <span className="badge badge-inactive" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <i className="ph ph-warning-circle"></i> Trễ {lateMinutes} phút
                                </span>
                              ) : (
                                <span className="badge badge-active" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                                  <i className="ph ph-clock"></i> Đúng giờ
                                </span>
                              )
                            ) : (
                              <span style={{ color: 'var(--text-secondary)' }}>—</span>
                            )}
                          </td>
                        </tr>
                      );
                    }) : (
                      <tr><td colSpan="5" style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Không có nhân viên nào có ca tại chi nhánh này hôm nay.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )

      case 'menu': {
        const categories = ['Cà phê', 'Trà', 'Đá xay', 'Latte', 'Phindi', 'Food', 'Topping', 'Kem', 'Combo', 'Khác'];
        const getCategoryIcon = (cat) => {
          switch (cat) {
            case 'Cà phê': return 'ph-coffee';
            case 'Trà': return 'ph-tea-bag';
            case 'Đá xay': return 'ph-blender';
            case 'Latte': return 'ph-drop';
            case 'Phindi': return 'ph-sparkles';
            case 'Food': return 'ph-hamburger';
            case 'Topping': return 'ph-cookie';
            case 'Kem': return 'ph-ice-cream';
            case 'Combo': return 'ph-handshake';
            default: return 'ph-squares-four';
          }
        };

        return (
          <div>
            <div className="card">
              <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                <h2 style={{marginBottom: 0}}>Danh Mục Sản Phẩm</h2>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div className="search-box">
                    <input 
                      type="text" 
                      placeholder="Tìm sản phẩm..." 
                      value={menuSearchQuery} 
                      onChange={e => setMenuSearchQuery(e.target.value)} 
                      className="search-input"
                    />
                    <i className="ph ph-magnifying-glass search-icon"></i>
                    {menuSearchQuery && (
                      <button className="search-clear-btn" onClick={() => setMenuSearchQuery('')}>
                        <i className="ph ph-x"></i>
                      </button>
                    )}
                  </div>
                  <button onClick={() => setShowMenuModal(true)} className="btn btn-primary">
                    <i className="ph ph-plus-circle" style={{fontSize: '1.2rem'}}></i> Thêm Sản Phẩm
                  </button>
                </div>
              </div>
              
              <div id="menu-accordion-container">
                {categories.map(cat => {
                  const catItems = menuItems.filter(item => (item.category || 'Khác') === cat);
                  
                  // If searching, hide categories that have no matching items
                  if (menuSearchQuery.trim() !== '' && catItems.length === 0) return null;
                  
                  // Auto-expand categories with matching items during active search
                  const isExpanded = menuSearchQuery.trim() !== '' 
                    ? catItems.length > 0 
                    : expandedCategory === cat;
                  
                  return (
                    <div key={cat} className="accordion-item-group" data-category={cat} style={{ marginBottom: '0.75rem' }}>
                      <div 
                        className={`accordion-header-card ${isExpanded ? 'active' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setExpandedCategory(isExpanded ? null : cat);
                        }}
                      >
                        <div className="accordion-title-wrapper">
                          <i className={`ph ${getCategoryIcon(cat)} category-icon`}></i>
                          <span className="category-name">{cat}</span>
                          <span className="category-count">({catItems.length} sản phẩm)</span>
                        </div>
                        <i className={`ph ph-caret-down accordion-caret ${isExpanded ? 'rotated' : ''}`}></i>
                      </div>
                      
                      <div 
                        className={`accordion-content-container ${isExpanded ? 'expanded' : ''}`} 
                        onClick={(e) => e.stopPropagation()}
                      >
                        {catItems.length > 0 ? (
                          <div className="menu-items-grid">
                            {catItems.map((m) => (
                              <div key={m.id} className="menu-item-grid-card">
                                <div className="menu-item-card-header">
                                  <span className="menu-item-card-name" title={m.name}>{m.name}</span>
                                  {m.size && <span className="badge-size">{m.size}</span>}
                                </div>
                                <div className="menu-item-card-body">
                                  <span className="menu-item-card-price">{m.price.toLocaleString()} đ</span>
                                </div>
                                <div className="menu-item-card-footer">
                                  <button onClick={() => handleOpenEditMenuItem(m)} className="btn btn-secondary btn-small" title="Sửa">
                                    <i className="ph ph-pencil-simple"></i> Sửa
                                  </button>
                                  <button onClick={() => handleDeleteMenuItem(m.id)} className="btn btn-danger btn-small" title="Xóa">
                                    <i className="ph ph-trash"></i> Xóa
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="no-items-message">Không có sản phẩm nào trong danh mục này.</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {showMenuModal && (
              <div className="modal-overlay">
                <div className="modal-content">
                  <div className="modal-header">
                    <div className="modal-title">{editMenuItem ? 'Cập Nhật Sản Phẩm' : 'Thêm Sản Phẩm Mới'}</div>
                    <button className="close-btn" onClick={handleCloseMenuModal}><i className="ph ph-x"></i></button>
                  </div>
                  <form onSubmit={handleSaveMenuItem}>
                    <div className="form-group">
                      <label>Tên Sản Phẩm</label>
                      <input type="text" value={newMenuItem.name} onChange={e => setNewMenuItem({...newMenuItem, name: e.target.value})} required />
                    </div>
                    <div className="form-group">
                      <label>Size</label>
                      <input type="text" value={newMenuItem.size || ''} onChange={e => setNewMenuItem({...newMenuItem, size: e.target.value})} placeholder="L, XL, M hoặc để trống" />
                    </div>
                    <div className="form-group">
                      <label>Danh Mục</label>
                      <select value={newMenuItem.category} onChange={e => setNewMenuItem({...newMenuItem, category: e.target.value})} required>
                        <option value="Cà phê">Cà phê</option>
                        <option value="Trà">Trà</option>
                        <option value="Đá xay">Đá xay</option>
                        <option value="Latte">Latte</option>
                        <option value="Phindi">Phindi</option>
                        <option value="Food">Food</option>
                        <option value="Topping">Topping</option>
                        <option value="Kem">Kem</option>
                        <option value="Combo">Combo</option>
                        <option value="Khác">Khác</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label>Giá Bán (VND)</label>
                      <input type="number" value={newMenuItem.price} onChange={e => setNewMenuItem({...newMenuItem, price: parseFloat(e.target.value)})} required />
                    </div>
                    <button type="submit" className="btn btn-primary">Lưu</button>
                  </form>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'timekeeping': {
        const candidates = employees.filter(e => {
          if (e.status !== 'active') return false;
          const sched = dbSchedules.find(s => s.employee_id === e.id && s.work_date === timekeepingDate && s.branch_id === currentBranch.id);
          return sched !== undefined;
        }).map(e => {
          const sched = dbSchedules.find(s => s.employee_id === e.id && s.work_date === timekeepingDate && s.branch_id === currentBranch.id);
          return {
            employee_id: e.id,
            full_name: e.full_name,
            shift: sched.shift
          };
        });

        return (
          <div>
            <div className="card">
              <div className="section-header">
                <h2 style={{marginBottom: 0}}>Điểm Danh Theo Lịch ({currentBranch.name})</h2>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                  <label style={{marginBottom: 0}}>Ngày:</label>
                  <input type="date" value={timekeepingDate} onChange={e => setTimekeepingDate(e.target.value)} style={{width: '200px'}} />
                </div>
              </div>
              
              <div className="table-container" style={{marginTop: '1.5rem'}}>
                <table className="no-hover-table">
                  <thead>
                    <tr>
                      <th>Nhân Viên</th>
                      <th>Ca</th>
                      <th>Giờ Dự Kiến</th>
                      <th>Có Mặt</th>
                      <th>Đi Trễ (Phút)</th>
                      <th>Ghi Chú</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {candidates.length > 0 ? candidates.map(c => {
                      const key = `${c.employee_id}_${c.shift}`;
                      const input = candidateInputs[key] || { present: false, lateMinutes: 0 };
                      
                      return (
                        <tr key={key}>
                          <td style={{fontWeight: '600'}}>{c.full_name}</td>
                          <td>{c.shift === 'S' ? 'Sáng' : 'Chiều'}</td>
                          <td>{c.shift === 'S' ? '7h - 12h' : '12h - 17h'}</td>
                          <td>
                            <input type="checkbox" checked={input.present} onChange={e => {
                              setCandidateInputs({
                                ...candidateInputs,
                                [key]: { ...input, present: e.target.checked }
                              })
                            }} style={{width: 'auto'}} />
                          </td>
                          <td>
                            <input type="number" value={input.lateMinutes} onChange={e => {
                              setCandidateInputs({
                                ...candidateInputs,
                                [key]: { ...input, lateMinutes: parseInt(e.target.value) || 0 }
                              })
                            }} style={{width: '80px'}} disabled={!input.present} />
                          </td>
                          <td>
                            {!input.present ? (
                              <span style={{color: 'var(--text-secondary)'}}>Chưa điểm danh</span>
                            ) : input.lateMinutes > 5 ? (
                              <span style={{color: 'var(--color-danger)'}}>Trừ lương (Trễ {input.lateMinutes}p)</span>
                            ) : (
                              <span style={{color: 'var(--color-success)'}}>Đúng giờ</span>
                            )}
                          </td>
                          <td>
                            <button 
                              className={`btn btn-small ${input.saved ? 'btn-secondary' : 'btn-primary'}`} 
                              onClick={() => handleSaveTimekeeping(c, input)}
                              disabled={input.saved}
                            >
                              {input.saved ? 'Đã Lưu' : 'Lưu'}
                            </button>
                          </td>
                        </tr>
                      )
                    }) : (
                      <tr>
                        <td colSpan="7" style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Không có nhân viên nào được sắp ca trong ngày này.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      }

      case 'inventory':
        return (
          <div>
            <div className="card">
              <div className="section-header">
                <h2 style={{marginBottom: 0}}>Kiểm Kho ({currentBranch.name})</h2>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                try {
                  const res = await fetch(`${API_URL}/inventory/record`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...inventory,
                      branch_id: currentBranch.id
                    })
                  });
                  if (res.ok) {
                    alert('Lưu thông tin kiểm kho thành công!');
                    setInventory({ ingredient_name: '', unit: '', ton_dau_va_nhap: 0, tong_su_dung: 0, record_date: getLocalDateString(new Date()) });
                  } else {
                    const err = await res.json();
                    alert(`Lỗi: ${err.message}`);
                  }
                } catch (err) { console.error(err); }
              }} style={{marginTop: '1.5rem'}}>
                <div className="grid">
                  <div className="form-group">
                    <label>Tên Nguyên Liệu</label>
                    <input type="text" value={inventory.ingredient_name} onChange={e => setInventory({...inventory, ingredient_name: e.target.value})} required />
                  </div>
                  <div className="form-group">
                    <label>Đơn Vị Tính</label>
                    <input type="text" value={inventory.unit} onChange={e => setInventory({...inventory, unit: e.target.value})} required />
                  </div>
                </div>
                <div className="grid">
                  <div className="form-group">
                    <label>Tồn Đầu & Nhập</label>
                    <input type="number" value={inventory.ton_dau_va_nhap} onChange={e => setInventory({...inventory, ton_dau_va_nhap: parseFloat(e.target.value) || 0})} required />
                  </div>
                  <div className="form-group">
                    <label>Tổng Sử Dụng</label>
                    <input type="number" value={inventory.tong_su_dung} onChange={e => setInventory({...inventory, tong_su_dung: parseFloat(e.target.value) || 0})} required />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ngày Ghi Nhận</label>
                  <input type="date" value={inventory.record_date} onChange={e => setInventory({...inventory, record_date: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-primary">Lưu Kiểm Kho</button>
              </form>
            </div>
          </div>
        )

      case 'sales':
        return (
          <div>
            <div className="card">
              <div className="section-header">
                <h2 style={{marginBottom: 0}}>Nhập Doanh Số Bán Hàng ({currentBranch.name})</h2>
                <div style={{display: 'flex', gap: '1rem', alignItems: 'center'}}>
                  <label style={{marginBottom: 0}}>Ngày:</label>
                  <input type="date" value={salesDate} onChange={e => setSalesDate(e.target.value)} style={{width: '200px'}} />
                </div>
              </div>
              
              <div className="table-container" style={{marginTop: '1.5rem'}}>
                <table className="no-hover-table">
                  <thead>
                    <tr>
                      <th>Sản Phẩm</th>
                      <th>Giá Bán</th>
                      <th>Số Lượng Bán</th>
                    </tr>
                  </thead>
                  <tbody>
                    {menuItems.map(item => (
                      <tr key={item.id}>
                        <td style={{fontWeight: '600'}}>{item.name}</td>
                        <td>{item.price.toLocaleString()} đ</td>
                        <td>
                          <input type="number" value={salesInput[item.id] || 0} onChange={e => {
                            setSalesInput({
                              ...salesInput,
                              [item.id]: parseInt(e.target.value) || 0
                            })
                          }} style={{width: '100px'}} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <button className="btn btn-primary" style={{marginTop: '1.5rem'}} onClick={async () => {
                const salesData = menuItems.map(item => ({
                  branch_id: currentBranch.id,
                  sale_date: salesDate,
                  item_id: item.id,
                  quantity_sold: salesInput[item.id] || 0
                }));
                
                try {
                  const res = await fetch(`${API_URL}/sales/daily`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(salesData)
                  });
                  if (res.ok) {
                    alert('Lưu doanh số thành công!');
                    setSalesInput({});
                  } else {
                    const err = await res.json();
                    alert(`Lỗi: ${err.message}`);
                  }
                } catch (err) { console.error(err); }
              }}>Lưu Doanh Số</button>
            </div>
          </div>
        )

      case 'financials':
        return (
          <div>
            <div className="card">
              <div className="section-header">
                <h2 style={{marginBottom: 0}}>Nhập Dữ Liệu Tài Chính ({currentBranch.name})</h2>
              </div>
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (financials.other_expense > 0 && !financials.expense_note) {
                  alert('Bắt buộc phải ghi nhận diễn giải khi có chi phí phát sinh!');
                  return;
                }
                try {
                  const res = await fetch(`${API_URL}/financials`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      ...financials,
                      branch_id: currentBranch.id
                    })
                  });
                  if (res.ok) {
                    alert('Lưu dữ liệu tài chính thành công!');
                    setFinancials({ cash_revenue: 0, utop_revenue: 0, other_expense: 0, expense_note: '', record_date: getLocalDateString(new Date()) });
                  } else {
                    const err = await res.json();
                    alert(`Lỗi: ${err.message}`);
                  }
                } catch (err) { console.error(err); }
              }} style={{marginTop: '1.5rem'}}>
                <div className="grid">
                  <div className="form-group">
                    <label>Doanh Thu Tiền Mặt (VND)</label>
                    <input type="number" value={financials.cash_revenue} onChange={e => setFinancials({...financials, cash_revenue: parseFloat(e.target.value) || 0})} required />
                  </div>
                  <div className="form-group">
                    <label>Doanh Thu Utop (VND)</label>
                    <input type="number" value={financials.utop_revenue} onChange={e => setFinancials({...financials, utop_revenue: parseFloat(e.target.value) || 0})} required />
                  </div>
                </div>
                <div className="grid">
                  <div className="form-group">
                    <label>Chi Phí Khác (VND)</label>
                    <input type="number" value={financials.other_expense} onChange={e => setFinancials({...financials, other_expense: parseFloat(e.target.value) || 0})} required />
                  </div>
                  <div className="form-group">
                    <label>Ghi Chú Chi Phí</label>
                    <input type="text" value={financials.expense_note} onChange={e => setFinancials({...financials, expense_note: e.target.value})} disabled={financials.other_expense === 0} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Ngày Ghi Nhận</label>
                  <input type="date" value={financials.record_date} onChange={e => setFinancials({...financials, record_date: e.target.value})} required />
                </div>
                <button type="submit" className="btn btn-primary">Lưu Tài Chính</button>
              </form>
            </div>
          </div>
        )

      case 'reports':
        return (
          <div>
            <div className="card">
              <div className="section-header">
                <h2 style={{marginBottom: 0}}>Tham Số Báo Cáo ({currentBranch.name})</h2>
              </div>
              <div className="grid" style={{marginTop: '1rem'}}>
                <div className="form-group">
                  <label>Từ Ngày</label>
                  <input type="date" value={reportParams.fromDate} onChange={e => setReportParams({...reportParams, fromDate: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Đến Ngày</label>
                  <input type="date" value={reportParams.toDate} onChange={e => setReportParams({...reportParams, toDate: e.target.value})} required />
                </div>
              </div>
              <div style={{display: 'flex', gap: '1rem'}}>
                <button onClick={() => handleRunReport('revenue-compare')} className="btn btn-primary">Báo Cáo Đối Soát</button>
                <button onClick={() => handleRunReport('pnl')} className="btn btn-outline">Báo Cáo P&L</button>
              </div>
            </div>

            {reportData && (
              <div className="card">
                <h2>Kết Quả Báo Cáo ({reportData.type === 'pnl' ? 'Lợi Nhuận Thuần' : 'Đối Soát Doanh Thu'})</h2>
                
                {reportData.type === 'revenue-compare' && (
                  <div style={{marginTop: '1rem'}}>
                    <p>Doanh Thu Thực Tế: <strong>{reportData.data.totalActualRevenue.toLocaleString()} đ</strong></p>
                    <p>Doanh Thu Lý Thuyết: <strong>{reportData.data.totalTheoreticalRevenue.toLocaleString()} đ</strong></p>
                    <p>Chênh Lệch: <strong style={{color: reportData.data.difference >= 0 ? '#00e676' : '#ff1744'}}>{reportData.data.difference.toLocaleString()} đ</strong></p>
                  </div>
                )}

                {reportData.type === 'pnl' && (
                  <div style={{marginTop: '1rem'}}>
                    <p>Tổng Doanh Thu: <strong>{reportData.data.totalActualRevenue.toLocaleString()} đ</strong></p>
                    <p>Chi Phí Khác: <strong>{reportData.data.totalOtherExpense.toLocaleString()} đ</strong></p>
                    <p>Quỹ Lương: <strong>{reportData.data.totalPayroll.toLocaleString()} đ</strong></p>
                    <p>Tổng Chi Phí Vận Hành: <strong>{reportData.data.totalOperatingCost.toLocaleString()} đ</strong></p>
                    <hr style={{margin: '1rem 0', borderColor: 'var(--glass-border)'}} />
                    <p style={{fontSize: '1.2rem'}}>Lợi Nhuận Thuần: <strong style={{color: reportData.data.netProfit >= 0 ? '#00e676' : '#ff1744'}}>{reportData.data.netProfit.toLocaleString()} đ</strong></p>
                  </div>
                )}
              </div>
            )}
          </div>
        )

      default:
        return <div>View not found</div>
    }
  }

  // Render Hub View (Scheduling / Timekeeping)
  if (hubView) {
    // Scheduling View
    const renderScheduling = () => {
      return (
        <div className={`scheduling-main ${isSidebarCollapsed ? 'expanded' : ''}`} style={{flex: 1, padding: '2rem 3rem', transition: 'padding 0.3s'}}>
          <div style={{width: '100%'}}>
            <div className="section-header" style={{marginBottom: '2rem', borderBottom: 'none'}}>
            <div>
              <h1 className="title" style={{marginBottom: 0}}>Bảng Sắp Ca Tháng</h1>
              <p style={{color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem'}}>Quản lý lịch làm việc toàn hệ thống.</p>
            </div>
            <div style={{display: 'flex', gap: '1rem', flexWrap: 'wrap'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '1rem'}}>
                <button className="btn btn-outline" style={{padding: '0.5rem', minWidth: '40px', background: 'var(--bg-secondary)', borderColor: 'var(--border)'}} onClick={() => {
                  const prev = new Date(selectedDate); prev.setMonth(prev.getMonth() - 1); setSelectedDate(prev);
                }}><i className="ph ph-caret-left"></i></button>
                <div style={{textAlign: 'center', background: 'var(--bg-input)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.95rem', fontWeight: '500'}}>
                  Tháng {selectedDate.getMonth() + 1}/{selectedDate.getFullYear()}
                </div>
                <button className="btn btn-outline" style={{padding: '0.5rem', minWidth: '40px', background: 'var(--bg-secondary)', borderColor: 'var(--border)'}} onClick={() => {
                  const next = new Date(selectedDate); next.setMonth(next.getMonth() + 1); setSelectedDate(next);
                }}><i className="ph ph-caret-right"></i></button>
              </div>
              <button onClick={() => setShowEmployeeModal(true)} className="btn btn-primary">
                <i className="ph ph-plus-circle" style={{fontSize: '1.2rem'}}></i> Thêm Nhân Viên
              </button>
            </div>
          </div>
          
          <div className="calendar-grid">
            {['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(day => (
              <div key={day} className="calendar-header">{day}</div>
            ))}
            
            {(() => {
              // Get month calendar layout
              const year = selectedDate.getFullYear();
              const month = selectedDate.getMonth();
              const firstDay = new Date(year, month, 1).getDay();
              const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1; // Mon = 0
              const daysInMonth = new Date(year, month + 1, 0).getDate();
              
              const blanks = Array.from({length: adjustedFirstDay}, (_, i) => <div key={`blank-${i}`} />);
              
              const days = Array.from({length: daysInMonth}, (_, i) => {
                const dayDate = i + 1;
                const fullDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayDate).padStart(2, '0')}`;
                
                // Find schedules for this day
                const daySchedules = dbSchedules.filter(s => s.work_date === fullDate);
                
                // Group by shift
                const morningCount = daySchedules.filter(s => s.shift === 'S').length;
                const afternoonCount = daySchedules.filter(s => s.shift === 'C').length;
                
                // Check timekeeping status
                // A shift is fully checked in if all scheduled employees for that shift have a timekeeping record
                const morningTimekeepings = dbTimekeepings.filter(t => t.work_date.startsWith(fullDate) && t.shift === 'S').length;
                const afternoonTimekeepings = dbTimekeepings.filter(t => t.work_date.startsWith(fullDate) && t.shift === 'C').length;
                
                const isMorningCheckedIn = morningCount > 0 && morningTimekeepings >= morningCount;
                const isAfternoonCheckedIn = afternoonCount > 0 && afternoonTimekeepings >= afternoonCount;
                
                const totalCount = morningCount + afternoonCount;
                const hasSchedules = totalCount > 0;
                const isFullyCheckedIn = (!morningCount || isMorningCheckedIn) && (!afternoonCount || isAfternoonCheckedIn);
                
                const todayStr = getLocalDateString(new Date());
                const isToday = fullDate === todayStr;
                
                return (
                  <div key={dayDate} className={`calendar-cell ${isToday ? 'is-today' : ''}`} onClick={() => {
                    // Open the schedule edit modal for this day
                    setActiveCell({ date: fullDate }); 
                  }}>
                    <div className="calendar-date">{dayDate}</div>
                    {hasSchedules && (
                      <div className={`calendar-shift-bar ${isFullyCheckedIn ? 'checked-in' : 'not-checked-in'}`} title={`Có ca (${totalCount} nhân viên)`}></div>
                    )}
                  </div>
                );
              });
              
              return [...blanks, ...days];
            })()}
          </div>
          </div>
        </div>
      );
    };

    // Timekeeping View
    const renderTimekeeping = () => {
      // Find employees scheduled for today (selectedDate)
      const dateStr = getLocalDateString(selectedDate);
      const todaySchedules = dbSchedules.filter(s => s.work_date === dateStr);
      
      const candidates = todaySchedules.map(s => {
        const emp = employees.find(e => e.id === s.employee_id);
        const branch = branches.find(b => b.id === s.branch_id);
        
        // Find if already timekeeped
        const timekeepingRecord = dbTimekeepings.find(t => t.employee_id === s.employee_id && t.work_date.startsWith(dateStr) && t.shift === s.shift);
        
        return {
          schedule: s,
          employee: emp,
          branch: branch,
          timekeeping: timekeepingRecord
        };
      });

      const handleRealtimeCheckIn = async (cand) => {
        if (!cand.employee) return;
        
        // Calculate late minutes
        const now = new Date();
        const shiftStartHour = cand.schedule.shift === 'S' ? 7 : 12;
        const shiftStartDate = new Date(selectedDate);
        shiftStartDate.setHours(shiftStartHour, 0, 0, 0);
        
        // Use real time if it's today, otherwise simulate for past/future days just for testing
        let diffMinutes = 0;
        const todayStr = getLocalDateString(new Date());
        if (dateStr === todayStr) {
           diffMinutes = Math.floor((now - shiftStartDate) / 60000);
        }
        
        let lateMinutes = diffMinutes > 0 ? diffMinutes : 0;
        
        const hourlyRate = cand.employee.hourly_rate || 22000;
        let deduction = 0;
        if (lateMinutes >= 5) {
          deduction = (lateMinutes - 5) * (hourlyRate / 60);
        }
        
        const record = {
          EmployeeId: cand.employee.id,
          BranchId: cand.schedule.branch_id,
          WorkDate: new Date().toISOString(), // Use exact current time
          Shift: cand.schedule.shift,
          HoursWorked: 5,
          AdvancePayment: Math.round(deduction)
        };
        
        try {
          const res = await fetch(`${API_URL}/timekeeping/bulk`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify([record])
          });
          if (res.ok) {
            alert('Đã chấm công thành công!');
            fetchAllTimekeepingRecords();
          } else {
            const err = await res.json();
            alert(`Lỗi: ${err.message}`);
          }
        } catch (err) { console.error(err); }
      };

      return (
        <div className={`scheduling-main ${isSidebarCollapsed ? 'expanded' : ''}`} style={{flex: 1, padding: '2rem 3rem', transition: 'padding 0.3s'}}>
          <div style={{width: '100%'}}>
            <div className="section-header" style={{marginBottom: '2rem', borderBottom: 'none'}}>
            <div>
              <h1 className="title" style={{marginBottom: 0}}>Chấm Công Hệ Thống</h1>
              <p style={{color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem'}}>Điểm danh dựa trên thời gian thực.</p>
            </div>
            <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
              <button className="btn btn-outline" style={{padding: '0.5rem', minWidth: '40px', background: 'var(--bg-secondary)', borderColor: 'var(--border)'}} onClick={() => {
                const prev = new Date(selectedDate); prev.setDate(prev.getDate() - 1); setSelectedDate(prev);
              }}><i className="ph ph-caret-left"></i></button>
              <div style={{textAlign: 'center', background: 'var(--bg-input)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-light)', fontSize: '0.95rem', fontWeight: '500'}}>
                {dateStr}
              </div>
              <button className="btn btn-outline" style={{padding: '0.5rem', minWidth: '40px', background: 'var(--bg-secondary)', borderColor: 'var(--border)'}} onClick={() => {
                const next = new Date(selectedDate); next.setDate(next.getDate() + 1); setSelectedDate(next);
              }}><i className="ph ph-caret-right"></i></button>
            </div>
          </div>
          
          {(() => {
            const morningCandidates = candidates.filter(c => c.schedule.shift === 'S');
            const afternoonCandidates = candidates.filter(c => c.schedule.shift === 'C');

            const renderTable = (shiftCandidates, title, timeStr) => (
              <div className="card" style={{marginBottom: '2rem'}}>
                <div style={{padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-faint)', display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}>
                  <h3 style={{margin: 0, fontSize: '1.1rem'}}>{title} <span style={{fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 'normal'}}>({timeStr})</span></h3>
                  <span className="badge" style={{background: 'var(--bg-input)'}}>Tổng: {shiftCandidates.length} nhân viên</span>
                </div>
                <div className="table-container">
                  <table className="no-hover-table">
                    <thead>
                      <tr>
                        <th>Nhân Viên</th>
                        <th>Chi Nhánh</th>
                        <th>Trạng Thái</th>
                        <th>Ghi Chú</th>
                        <th>Thao tác</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shiftCandidates.length > 0 ? shiftCandidates.map((cand, idx) => {
                        const isCheckedIn = !!cand.timekeeping;
                        const hourlyRate = cand.employee?.hourly_rate || 22000;
                        let lateMin = 0;
                        if (isCheckedIn && cand.timekeeping.advance_payment > 0) {
                          lateMin = Math.round((cand.timekeeping.advance_payment / (hourlyRate / 60)) + 5);
                        }
                        
                        return (
                          <tr key={idx}>
                            <td style={{fontWeight: '600'}}>{cand.employee?.full_name}</td>
                            <td>{cand.branch?.name}</td>
                            <td>
                              {isCheckedIn ? (
                                <span className="badge badge-active"><i className="ph ph-check-circle"></i> Đã chấm công</span>
                              ) : (
                                <span className="badge badge-inactive"><i className="ph ph-clock"></i> Chưa chấm công</span>
                              )}
                            </td>
                            <td>
                              {isCheckedIn ? (
                                lateMin >= 5 ? <span style={{color: 'var(--color-danger)'}}>Trễ {lateMin}p (Trừ {(cand.timekeeping.advance_payment).toLocaleString()}đ)</span> : <span style={{color: 'var(--color-success)'}}>Đúng giờ</span>
                              ) : '-'}
                            </td>
                            <td>
                              <button 
                                className={`btn btn-small ${isCheckedIn ? 'btn-secondary' : 'btn-primary'}`} 
                                onClick={() => handleRealtimeCheckIn(cand)}
                                disabled={isCheckedIn}
                              >
                                {isCheckedIn ? 'Hoàn tất' : 'Check-in'}
                              </button>
                            </td>
                          </tr>
                        );
                      }) : (
                        <tr><td colSpan="5" style={{textAlign: 'center', color: 'var(--text-secondary)', padding: '2rem'}}>Không có ca làm việc nào.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );

            return (
              <>
                {renderTable(morningCandidates, "Ca Sáng", "7h - 12h")}
                {renderTable(afternoonCandidates, "Ca Chiều", "12h - 17h")}
              </>
            );
          })()}
          </div>
        </div>
      );
    };

    // Hub Employees View
    const renderHubEmployees = () => {
      return (
        <div className={`scheduling-main ${isSidebarCollapsed ? 'expanded' : ''}`} style={{flex: 1, padding: '2rem 3rem', transition: 'padding 0.3s'}}>
          <div style={{width: '100%'}}>
            <div className="section-header" style={{marginBottom: '2rem', borderBottom: 'none'}}>
              <div>
                <h1 className="title" style={{marginBottom: 0}}>Danh Sách Nhân Viên</h1>
                <p style={{color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '0.25rem'}}>Quản lý thông tin nhân sự toàn hệ thống.</p>
              </div>
              <button onClick={() => {
                setEditEmployee(null);
                setNewEmployee({ full_name: '', phone: '', hourly_rate: 22000, status: 'active' });
                setShowEmployeeModal(true);
              }} className="btn btn-primary">
                <i className="ph ph-plus-circle" style={{fontSize: '1.2rem'}}></i> Thêm Nhân Viên
              </button>
            </div>
            
            <div className="card">
              <div className="table-container">
                <table className="no-hover-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Tên nhân viên</th>
                      <th>SĐT</th>
                      <th>Mức lương / giờ</th>
                      <th>Trạng thái</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.map(emp => (
                      <tr key={emp.id}>
                        <td>{emp.id}</td>
                        <td style={{fontWeight: '600'}}>{emp.full_name}</td>
                        <td>{emp.phone || '—'}</td>
                        <td>{emp.hourly_rate.toLocaleString()} đ</td>
                        <td>
                          {emp.status === 'active' ? (
                            <span className="badge badge-active">Hoạt động</span>
                          ) : (
                            <span className="badge badge-inactive">Nghỉ việc</span>
                          )}
                        </td>
                        <td>
                          <div style={{display: 'flex', gap: '0.5rem'}}>
                            <button className="btn btn-secondary btn-small" onClick={() => {
                              setEditEmployee(emp);
                              setNewEmployee(emp);
                              setShowEmployeeModal(true);
                            }}>Sửa</button>
                            <button className="btn btn-outline btn-small" style={{borderColor: 'var(--color-danger)', color: 'var(--color-danger)'}} onClick={async () => {
                              if(confirm(`Bạn có chắc muốn xóa nhân viên ${emp.full_name}?`)) {
                                try {
                                  await fetch(`${API_URL}/employees/${emp.id}`, { method: 'DELETE' });
                                  fetchEmployees();
                                } catch (e) { console.error(e); }
                              }
                            }}>Xóa</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {employees.length === 0 && (
                      <tr><td colSpan="6" style={{textAlign: 'center', color: 'var(--text-secondary)'}}>Chưa có nhân viên nào.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      );
    };

    return (
      <div className="scheduling-container" style={{display: 'flex', background: 'var(--bg-primary)', minHeight: '100vh'}}>
        {/* Hub Sidebar */}
        <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`} style={{position: 'sticky', top: 0, height: '100vh', overflowY: 'auto'}}>
          <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
            <div className="logo">
              <img src="/logo_icon.png" alt="Logo" style={{height: '32px', width: '32px', borderRadius: '50%', objectFit: 'cover'}} /> <span>Capital Hub</span>
            </div>
            <button className="sidebar-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
              <i className={`ph ${isSidebarCollapsed ? 'ph-list' : 'ph-caret-left'}`}></i>
            </button>
          </div>

          <ul className="nav-links">
            <li>
              <div className={`nav-link ${hubView === 'scheduling' ? 'active' : ''}`} onClick={() => setHubView('scheduling')}>
                <i className="ph ph-calendar-plus" style={{fontSize: '1.2rem'}}></i> <span>Sắp Ca</span>
              </div>
            </li>
            <li>
              <div className={`nav-link ${hubView === 'timekeeping' ? 'active' : ''}`} onClick={() => setHubView('timekeeping')}>
                <i className="ph ph-clock" style={{fontSize: '1.2rem'}}></i> <span>Chấm Công</span>
              </div>
            </li>
            <li>
              <div className={`nav-link ${hubView === 'employees' ? 'active' : ''}`} onClick={() => setHubView('employees')}>
                <i className="ph ph-users" style={{fontSize: '1.2rem'}}></i> <span>Nhân Viên</span>
              </div>
            </li>
          </ul>
          
          <div style={{marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem'}}>
             <button 
                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                className="btn btn-secondary"
                style={{width: '100%', display: 'flex', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', border: 'none'}}
              >
                {theme === 'dark' ? <i className="ph ph-sun" style={{fontSize: '1.2rem'}}></i> : <i className="ph ph-moon" style={{fontSize: '1.2rem'}}></i>}
                {!isSidebarCollapsed && <span style={{marginLeft: '0.5rem'}}>Giao diện {theme === 'dark' ? 'Sáng' : 'Tối'}</span>}
              </button>
            <button className="btn btn-outline" style={{width: '100%', padding: isSidebarCollapsed ? '0.75rem' : '1rem', justifyContent: isSidebarCollapsed ? 'center' : 'center'}} onClick={() => setHubView(null)}>
              <i className="ph ph-sign-out"></i> {!isSidebarCollapsed && <span>Thoát Hub</span>}
            </button>
          </div>
        </div>

        <div style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
          {/* Hub Mobile Header */}
          <div className="hub-mobile-header">
            <div className="hub-mobile-header-top">
              <div className="hub-mobile-logo">
                <img src="/logo_icon.png" alt="Logo" style={{height: '28px', width: '28px', borderRadius: '50%', objectFit: 'cover'}} />
                <span>Capital Hub</span>
              </div>
              <div className="hub-mobile-actions">
                <button 
                  onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                  className="btn btn-secondary btn-small"
                  style={{width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0}}
                >
                  {theme === 'dark' ? <i className="ph ph-sun" style={{fontSize: '1.2rem'}}></i> : <i className="ph ph-moon" style={{fontSize: '1.2rem'}}></i>}
                </button>
                <button 
                  className="btn btn-danger btn-small" 
                  onClick={() => setHubView(null)}
                  style={{display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.4rem 0.75rem', borderRadius: '8px'}}
                >
                  <i className="ph ph-sign-out"></i> Thoát
                </button>
              </div>
            </div>
            <div className="hub-mobile-tabs">
              <div className={`hub-mobile-tab ${hubView === 'scheduling' ? 'active' : ''}`} onClick={() => setHubView('scheduling')}>
                <i className="ph ph-calendar-plus"></i> Sắp Ca
              </div>
              <div className={`hub-mobile-tab ${hubView === 'timekeeping' ? 'active' : ''}`} onClick={() => setHubView('timekeeping')}>
                <i className="ph ph-clock"></i> Chấm Công
              </div>
              <div className={`hub-mobile-tab ${hubView === 'employees' ? 'active' : ''}`} onClick={() => setHubView('employees')}>
                <i className="ph ph-users"></i> Nhân Viên
              </div>
            </div>
          </div>

          {hubView === 'scheduling' && renderScheduling()}
          {hubView === 'timekeeping' && renderTimekeeping()}
          {hubView === 'employees' && renderHubEmployees()}
        </div>

        {/* Date Schedule Popover / Modal */}
        {activeCell && (
          <div className="modal-overlay">
            <div className="modal-content" style={{width: '700px', maxWidth: '95%', margin: '0 auto'}}>
              <div className="modal-header">
                <div className="modal-title">Sắp Ca: {activeCell.date}</div>
                <button className="close-btn" onClick={() => setActiveCell(null)}><i className="ph ph-x"></i></button>
              </div>
              
              <div className="table-container" style={{maxHeight: '60vh', overflowY: 'auto'}}>
                <table className="no-hover-table">
                  <thead>
                    <tr>
                      <th>Nhân Viên</th>
                      <th>Ca Sáng</th>
                      <th>Ca Chiều</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employees.filter(e => e.status === 'active').map(e => {
                      const morning = dbSchedules.find(s => s.employee_id === e.id && s.work_date === activeCell.date && s.shift === 'S');
                      const afternoon = dbSchedules.find(s => s.employee_id === e.id && s.work_date === activeCell.date && s.shift === 'C');
                      
                      const EmployeeRow = () => {
                        const [mBranch, setMBranch] = useState(morning ? morning.branch_id : '');
                        const [aBranch, setABranch] = useState(afternoon ? afternoon.branch_id : '');
                        
                        const handleSaveRow = async () => {
                           try {
                              await fetch(`${API_URL}/schedules/clear?employeeId=${e.id}&workDate=${activeCell.date}`, { method: 'DELETE' });
                              if (mBranch) {
                                await fetch(`${API_URL}/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: e.id, branch_id: mBranch, work_date: activeCell.date, shift: 'S' }) });
                              }
                              if (aBranch) {
                                await fetch(`${API_URL}/schedules`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ employee_id: e.id, branch_id: aBranch, work_date: activeCell.date, shift: 'C' }) });
                              }
                              fetchSchedules();
                              alert('Đã lưu ca cho ' + e.full_name);
                           } catch (err) { console.error(err); }
                        };
                        
                        const handleDeleteRow = async () => {
                           if (confirm(`Xóa toàn bộ ca của ${e.full_name} trong ngày này?`)) {
                             try {
                               await fetch(`${API_URL}/schedules/clear?employeeId=${e.id}&workDate=${activeCell.date}`, { method: 'DELETE' });
                               setMBranch('');
                               setABranch('');
                               fetchSchedules();
                             } catch (err) { console.error(err); }
                           }
                        };
                        
                        return (
                          <tr>
                            <td style={{fontWeight: '600'}}>{e.full_name}</td>
                            <td>
                              <select value={mBranch} onChange={ev => setMBranch(ev.target.value ? parseInt(ev.target.value) : '')}>
                                <option value="">-- Trống --</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <select value={aBranch} onChange={ev => setABranch(ev.target.value ? parseInt(ev.target.value) : '')}>
                                <option value="">-- Trống --</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                              </select>
                            </td>
                            <td>
                              <div style={{display: 'flex', gap: '0.5rem'}}>
                                <button className="btn btn-primary btn-small" onClick={handleSaveRow}>Lưu</button>
                                {(morning || afternoon) && (
                                  <button className="btn btn-outline btn-small" style={{borderColor: 'var(--color-danger)', color: 'var(--color-danger)', padding: '0.25rem 0.5rem'}} onClick={handleDeleteRow} title="Xóa toàn bộ ca trong ngày">
                                    <i className="ph ph-trash"></i>
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      };
                      return <EmployeeRow key={e.id} />;
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {renderEmployeeModal()}
      </div>
    )
  }

  // Render Login / Select Branch Screen
  if (!currentBranch) {
    return (
      <div className="login-container" style={{display: 'flex', width: '100vw', height: '100vh', background: 'var(--bg-primary)', position: 'relative'}}>
        {/* Theme Toggle Top Right */}
        <button 
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            position: 'absolute', top: '2rem', right: '2rem', zIndex: 10,
            background: 'var(--bg-secondary)', border: '1px solid var(--border-light)',
            color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '50%',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: 'var(--shadow)'
          }}>
          {theme === 'dark' ? <i className="ph ph-sun" style={{fontSize: '1.5rem'}}></i> : <i className="ph ph-moon" style={{fontSize: '1.5rem'}}></i>}
        </button>
        {/* Left Side - Image */}
        <div className="login-left" style={{
          flex: '1', 
          backgroundImage: 'url(/login_bg.png)', 
          backgroundSize: 'cover', 
          backgroundPosition: 'center',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'flex-end',
          padding: '4rem',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute', 
            top: 0, left: 0, right: 0, bottom: 0, 
            background: theme === 'dark' ? 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.3) 100%)' : 'linear-gradient(to top, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.6) 100%)',
            transition: 'background 0.3s'
          }} />
          <div style={{position: 'relative', zIndex: 1}}>
            <h1 style={{fontSize: '3.5rem', fontWeight: '700', color: theme === 'dark' ? '#fff' : '#111827', marginBottom: '0.5rem', letterSpacing: '-0.05em'}}>The Capital Coffee</h1>
            <p style={{color: theme === 'dark' ? 'rgba(255,255,255,0.8)' : 'rgba(17,24,39,0.8)', fontSize: '1.2rem', marginTop: '0.5rem', fontWeight: '500'}}>Hệ thống quản lý vận hành chuỗi cửa hàng chuyên nghiệp.</p>
          </div>
        </div>

        {/* Right Side - Selector */}
        <div className="login-right" style={{
          width: '500px', 
          background: 'var(--bg-primary)', 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center', 
          padding: '4rem',
          borderLeft: '1px solid var(--border)'
        }}>
          <div style={{maxWidth: '400px', width: '100%'}}>
            <h2 style={{color: 'var(--title-color)', fontSize: '2rem', fontWeight: '600', marginBottom: '0.5rem', letterSpacing: '-0.025em'}}>Chào mừng trở lại</h2>
            <p style={{color: 'var(--text-secondary)', marginBottom: '2.5rem', fontSize: '0.95rem'}}>Chọn chi nhánh của bạn để tiếp tục vào hệ thống.</p>
            
            <div style={{display: 'flex', flexDirection: 'column', gap: '0.75rem'}}>
              {branches.map(b => (
                <div key={b.id} 
                     onClick={() => handleSelectBranch(b)}
                     style={{
                       background: 'var(--bg-secondary)',
                       border: '1px solid var(--border)',
                       borderRadius: '12px',
                       padding: '1.25rem',
                       cursor: 'pointer',
                       display: 'flex',
                       justifyContent: 'space-between',
                       alignItems: 'center'
                     }}
                     className="branch-hover-effect"
                >
                  <div>
                    <h3 style={{color: 'var(--title-color)', fontSize: '1rem', fontWeight: '600'}}>{b.name}</h3>
                    <p style={{color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.25rem'}}>Truy cập chi nhánh</p>
                  </div>
                  <div style={{
                    width: '28px', height: '28px', 
                    borderRadius: '50%', background: 'var(--accent)', color: 'var(--btn-text)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 'bold', fontSize: '0.9rem'
                  }}>→</div>
                </div>
              ))}
            </div>
            
            {/* Scheduling Button below branch list */}
            <button className="btn btn-outline" 
                    style={{marginTop: '1.5rem', width: '100%', padding: '1rem', borderRadius: '12px'}}
                    onClick={() => setHubView('scheduling')}>
              <i className="ph ph-calendar-plus" style={{fontSize: '1.2rem'}}></i> Sắp Ca Nhân Viên Toàn Hệ Thống
            </button>
            
            {branches.length === 0 && (
              <p style={{color: '#a1a1aa', fontSize: '0.9rem', marginTop: '1rem'}}>Đang tải danh sách chi nhánh...</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        <div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem'}}>
          <div className="logo">
            <img src="/logo_icon.png" alt="Logo" style={{height: '32px', width: '32px', borderRadius: '50%', objectFit: 'cover'}} /> <span>The Capital Coffee</span>
          </div>
          <button className="sidebar-toggle" onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
            <i className={`ph ${isSidebarCollapsed ? 'ph-list' : 'ph-caret-left'}`}></i>
          </button>
        </div>
        <ul className="nav-links">
          <li><div className={`nav-link ${currentView === 'dashboard' ? 'active' : ''}`} onClick={() => setCurrentView('dashboard')}><i className="ph ph-squares-four" style={{fontSize: '1.2rem'}}></i> <span>Dashboard</span></div></li>
          <li><div className={`nav-link ${currentView === 'employees' ? 'active' : ''}`} onClick={() => setCurrentView('employees')}><i className="ph ph-users" style={{fontSize: '1.2rem'}}></i> <span>Nhân Viên</span></div></li>
          <li><div className={`nav-link ${currentView === 'menu' ? 'active' : ''}`} onClick={() => setCurrentView('menu')}><i className="ph ph-coffee" style={{fontSize: '1.2rem'}}></i> <span>Sản Phẩm</span></div></li>
          {/* Note: Timekeeping is removed from Branch View as per user requirements */}
          <li><div className={`nav-link ${currentView === 'inventory' ? 'active' : ''}`} onClick={() => setCurrentView('inventory')}><i className="ph ph-package" style={{fontSize: '1.2rem'}}></i> <span>Kiểm Kho</span></div></li>
          <li><div className={`nav-link ${currentView === 'sales' ? 'active' : ''}`} onClick={() => setCurrentView('sales')}><i className="ph ph-shopping-cart" style={{fontSize: '1.2rem'}}></i> <span>Doanh Số</span></div></li>
          <li><div className={`nav-link ${currentView === 'financials' ? 'active' : ''}`} onClick={() => setCurrentView('financials')}><i className="ph ph-money" style={{fontSize: '1.2rem'}}></i> <span>Tài Chính</span></div></li>
          <li><div className={`nav-link ${currentView === 'reports' ? 'active' : ''}`} onClick={() => setCurrentView('reports')}><i className="ph ph-chart-line-up" style={{fontSize: '1.2rem'}}></i> <span>Báo Cáo</span></div></li>
        </ul>
        {/* Theme toggle moved to header */}
      </div>

      <div className={`main-content ${isSidebarCollapsed ? 'expanded' : ''}`}>
        <div className="header">
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            {currentView !== 'branch-menu' && (
              <button className="btn btn-secondary btn-small" onClick={() => setCurrentView('branch-menu')} title="Quay lại Menu" style={{width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0}}>
                <i className="ph ph-arrow-left" style={{fontSize: '1.2rem'}}></i>
              </button>
            )}
            <div className="title">
              {currentView === 'dashboard' && 'Dashboard Overview'}
              {currentView === 'employees' && 'Quản Lý Nhân Sự'}
              {currentView === 'menu' && 'Danh Mục Sản Phẩm'}
              {currentView === 'timekeeping' && 'Vận Hành Hàng Ngày'}
              {currentView === 'inventory' && 'Kiểm Kho Cửa Hàng'}
              {currentView === 'sales' && 'Doanh Số Bán Hàng'}
              {currentView === 'financials' && 'Quản Lý Tài Chính'}
              {currentView === 'reports' && 'Báo Cáo Tổng Hợp'}
              {currentView === 'branch-menu' && 'Menu Chi Nhánh'}
            </div>
          </div>
          <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
            <div style={{color: 'var(--accent)', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.25rem'}}>
              <i className="ph-fill ph-map-pin" style={{fontSize: '1.2rem'}}></i> {currentBranch.name}
            </div>
            <button className="btn btn-secondary btn-small" onClick={() => setCurrentBranch(null)}><i className="ph ph-sign-out"></i> Đổi chi nhánh</button>
            <button 
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="btn btn-secondary btn-small"
              title={theme === 'dark' ? 'Bật Giao diện sáng' : 'Bật Giao diện tối'}
              style={{width: '36px', height: '36px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0}}
            >
              {theme === 'dark' ? <i className="ph ph-sun" style={{fontSize: '1.2rem'}}></i> : <i className="ph ph-moon" style={{fontSize: '1.2rem'}}></i>}
            </button>
          </div>
        </div>

        {renderView()}
      </div>
      {renderEmployeeModal()}
    </>
  )
}

export default App
