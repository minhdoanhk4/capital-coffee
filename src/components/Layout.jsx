import React, { useState } from 'react';
import { Coffee, ClipboardList, Package, Users, BarChart3, Menu, X } from 'lucide-react';

export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navItems = [
    { name: 'Nhập Doanh Số', icon: <ClipboardList size={20} />, active: true },
    { name: 'Quản Lý Kho', icon: <Package size={20} /> },
    { name: 'Chấm Công', icon: <Users size={20} /> },
    { name: 'Dashboard', icon: <BarChart3 size={20} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0f172a' }}>
      {/* Mobile Header */}
      <div style={{
        display: 'none',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: '60px',
        background: 'rgba(15, 23, 42, 0.9)',
        backdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--glass-border)',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        boxSizing: 'border-box'
      }} className="mobile-header-bar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Coffee size={24} color="var(--accent-color)" />
          <span style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff' }}>The Capital</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}
        >
          {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <div style={{
        width: '260px',
        background: 'rgba(15, 23, 42, 0.8)',
        backdropFilter: 'blur(12px)',
        borderRight: '1px solid var(--glass-border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        zIndex: 101,
        transition: 'transform 0.3s ease',
      }} className={`sidebar-container ${isMobileMenuOpen ? 'open' : ''}`}>
        <div style={{ padding: '24px', display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid var(--glass-border)' }}>
          <Coffee size={28} color="var(--accent-color)" />
          <span style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#fff' }}>The Capital</span>
        </div>
        
        <nav style={{ padding: '16px', flex: 1 }}>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {navItems.map((item, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>
                <a href="#" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  color: item.active ? '#fff' : 'var(--text-secondary)',
                  background: item.active ? 'rgba(255, 255, 255, 0.05)' : 'transparent',
                  textDecoration: 'none',
                  fontWeight: item.active ? '600' : '500',
                  transition: 'all 0.2s',
                  border: item.active ? '1px solid var(--glass-border)' : '1px solid transparent'
                }} onClick={() => setIsMobileMenuOpen(false)}>
                  {item.icon}
                  {item.name}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        
        <div style={{ padding: '16px', borderTop: '1px solid var(--glass-border)', fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
          Ftown 3 Management v1.0
        </div>
      </div>

      {/* Overlay for mobile */}
      {isMobileMenuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.5)',
            zIndex: 100
          }}
          onClick={() => setIsMobileMenuOpen(false)}
          className="mobile-overlay"
        />
      )}

      {/* Main Content */}
      <div style={{ 
        marginLeft: '260px', 
        flex: 1, 
        padding: '40px',
        boxSizing: 'border-box'
      }} className="main-content">
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {children}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .mobile-header-bar {
            display: flex !important;
          }
          .sidebar-container {
            transform: translateX(-100%);
          }
          .sidebar-container.open {
            transform: translateX(0);
          }
          .main-content {
            margin-left: 0 !important;
            padding: 20px !important;
            padding-top: 80px !important;
          }
          .mobile-overlay {
            display: block !important;
          }
        }
        @media (min-width: 769px) {
          .sidebar-container {
            transform: translateX(0) !important;
          }
          .mobile-overlay {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
