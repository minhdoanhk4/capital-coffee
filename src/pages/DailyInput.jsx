import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Save, Calendar, Store } from 'lucide-react';

export default function DailyInput() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [branch, setBranch] = useState('');
  const [branches, setBranches] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [sales, setSales] = useState({});
  const [financials, setFinancials] = useState({
    cash_revenue: '',
    utop_revenue: '',
    other_expense: '',
    expense_note: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      // Fetch branches
      const { data: branchData } = await supabase.from('branches').select('*');
      setBranches(branchData || []);
      if (branchData && branchData.length > 0) {
        setBranch(branchData[0].id);
      }

      // Fetch menu items
      const { data: items } = await supabase.from('menu_items').select('*');
      setMenuItems(items || []);
      
      // Khởi tạo object sales với quantity = 0
      const initialSales = {};
      items?.forEach(item => {
        initialSales[item.id] = 0;
      });
      setSales(initialSales);
    }
    fetchData();
  }, []);

  const handleSaleChange = (itemId, value) => {
    setSales(prev => ({
      ...prev,
      [itemId]: parseInt(value) || 0
    }));
  };

  const handleFinancialChange = (e) => {
    const { name, value } = e.target;
    setFinancials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const salesData = Object.keys(sales).map(itemId => ({
        branch_id: branch,
        sale_date: date,
        item_id: itemId,
        quantity_sold: sales[itemId]
      }));

      const { error: salesError } = await supabase
        .from('daily_sales')
        .upsert(salesData, { onConflict: 'branch_id,sale_date,item_id' });

      if (salesError) throw salesError;

      const financialData = {
        branch_id: branch,
        record_date: date,
        cash_revenue: parseFloat(financials.cash_revenue) || 0,
        utop_revenue: parseFloat(financials.utop_revenue) || 0,
        other_expense: parseFloat(financials.other_expense) || 0,
        expense_note: financials.expense_note
      };

      const { error: finError } = await supabase
        .from('daily_financials')
        .upsert([financialData], { onConflict: 'branch_id,record_date' });

      if (finError) throw finError;

      alert('Đã lưu dữ liệu thành công!');
    } catch (error) {
      console.error(error);
      alert('Lỗi khi lưu dữ liệu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="header-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '2rem', fontWeight: 'bold' }}>Nhập Doanh Số & Thu Chi</h1>
          <p style={{ color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>Ghi nhận số liệu cuối ngày cho các quầy</p>
        </div>
        
        <button className="glass-button" onClick={handleSave} disabled={loading}>
          <Save size={18} />
          {loading ? 'Đang lưu...' : 'Lưu số liệu cuối ngày'}
        </button>
      </div>

      {/* Filters */}
      <div className="glass-card filters-container" style={{ display: 'flex', gap: '20px', marginBottom: '32px', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <Calendar size={18} color="var(--text-secondary)" />
          <label style={{ fontWeight: '500', minWidth: '110px' }}>Ngày ghi nhận:</label>
          <input 
            type="date" 
            className="glass-input" 
            style={{ flex: 1 }}
            value={date} 
            onChange={(e) => setDate(e.target.value)}
          />
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', width: '100%' }}>
          <Store size={18} color="var(--text-secondary)" />
          <label style={{ fontWeight: '500', minWidth: '110px' }}>Chi nhánh:</label>
          <select 
            className="glass-input" 
            style={{ flex: 1 }}
            value={branch} 
            onChange={(e) => setBranch(e.target.value)}
          >
            {branches.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="responsive-grid">
        {/* Table 1: Sales */}
        <div className="glass-card">
          <h2 style={{ marginTop: 0, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--accent-color)' }}>Số lượng bán hằng ngày</h2>
          <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
            <table className="responsive-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--glass-border)', color: 'var(--text-secondary)' }}>
                  <th style={{ textAlign: 'left', padding: '12px 8px' }}>Tên món</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px' }}>Giá</th>
                  <th style={{ textAlign: 'right', padding: '12px 8px', width: '150px' }}>Số lượng bán</th>
                </tr>
              </thead>
              <tbody>
                {menuItems.map(item => (
                  <tr key={item.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '14px 8px', fontWeight: '500' }} data-label="Tên món">{item.name}</td>
                    <td style={{ padding: '14px 8px', textAlign: 'right', color: 'var(--text-secondary)' }} data-label="Giá">{item.price?.toLocaleString()}đ</td>
                    <td style={{ padding: '14px 8px', textAlign: 'right' }} data-label="Số lượng bán">
                      <input 
                        type="number" 
                        className="glass-input" 
                        style={{ width: '100%', maxWidth: '120px', textAlign: 'right' }}
                        value={sales[item.id] || 0}
                        onChange={(e) => handleSaleChange(item.id, e.target.value)}
                        min="0"
                      />
                    </td>
                  </tr>
                ))}
                {menuItems.length === 0 && (
                  <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      Không có dữ liệu món ăn. Vui lòng thêm vào database.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Table 2: Financials */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div className="glass-card">
            <h2 style={{ marginTop: 0, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--accent-color)' }}>Doanh thu tài chính</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tiền mặt thu về</label>
                <input 
                  type="number" 
                  name="cash_revenue"
                  className="glass-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="0"
                  value={financials.cash_revenue}
                  onChange={handleFinancialChange}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Tiền qua Utop</label>
                <input 
                  type="number" 
                  name="utop_revenue"
                  className="glass-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="0"
                  value={financials.utop_revenue}
                  onChange={handleFinancialChange}
                />
              </div>
            </div>
          </div>

          <div className="glass-card">
            <h2 style={{ marginTop: 0, fontSize: '1.2rem', marginBottom: '20px', color: 'var(--accent-color)' }}>Chi phí phát sinh</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Số tiền chi</label>
                <input 
                  type="number" 
                  name="other_expense"
                  className="glass-input" 
                  style={{ width: '100%', boxSizing: 'border-box' }}
                  placeholder="0"
                  value={financials.other_expense}
                  onChange={handleFinancialChange}
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Ghi chú chi phí</label>
                <textarea 
                  name="expense_note"
                  className="glass-input" 
                  style={{ width: '100%', boxSizing: 'border-box', minHeight: '80px', fontFamily: 'inherit' }}
                  placeholder="Ví dụ: Mua đá, Vệ sinh máy..."
                  value={financials.expense_note}
                  onChange={handleFinancialChange}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
