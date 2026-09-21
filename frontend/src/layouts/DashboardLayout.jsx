import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  UploadCloud,
  BarChart3,
  Settings as SettingsIcon,
  LogOut,
  Sparkles,
  Search,
  Bell,
  Menu,
  X,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AzureStatusBanner } from '../components/common/AzureStatusBanner';

export const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'Invoices', path: '/invoices', icon: FileText },
    { name: 'Upload Invoice', path: '/upload', icon: UploadCloud },
    { name: 'Analytics', path: '/analytics', icon: BarChart3 },
    { name: 'Settings', path: '/settings', icon: SettingsIcon },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0c0e12] text-slate-100 font-sans">
      {/* Top Azure Environment Status Banner */}
      <AzureStatusBanner />

      {/* Reference Top Header */}
      <header className="sticky top-0 z-40 bg-[#0c0e12]/90 backdrop-blur-md border-b border-[#1c2027] px-4 sm:px-8 py-3.5">
        <div className="max-w-[1520px] mx-auto flex items-center justify-between gap-4">
          
          {/* Left: Hamburger & Brand Mark */}
          <div className="flex items-center gap-3.5">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 rounded-xl bg-[#181b21] border border-[#252932] text-[#7e8695] hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>

            <NavLink to="/" className="flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-[#8ff59c] text-[#0d1710] flex items-center justify-center font-bold text-base shadow-lg shadow-[#8ff59c]/20 group-hover:scale-105 transition-transform">
                R
              </div>
              <span className="font-bold text-lg text-white tracking-tight">InvoiceAI</span>
            </NavLink>
          </div>

          {/* Center: Navigation Pill Capsule (Exactly as shown in reference: Dashboard, Analytics, Reports, Settings) */}
          <nav className="hidden lg:flex items-center gap-1 bg-[#181b21] border border-[#252932] p-1.5 rounded-2xl shadow-inner">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                    isActive
                      ? 'bg-[#252a35] text-white shadow-sm'
                      : 'text-[#7e8695] hover:text-slate-200 hover:bg-[#1e222b]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Right: Search, Notifications, and Profile Pill */}
          <div className="flex items-center gap-3">
            {/* Search Icon / Mini Input */}
            <div className="relative hidden md:flex items-center">
              <Search className="w-4 h-4 text-[#7e8695] absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search..."
                className="bg-[#181b21] border border-[#252932] rounded-full pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-[#7e8695] focus:outline-none focus:border-[#8ff59c] w-36 lg:w-44 transition-all"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    navigate(`/invoices?search=${encodeURIComponent(e.target.value.trim())}`);
                  }
                }}
              />
            </div>

            {/* Notification Bell */}
            <div className="relative">
              <button
                className="p-2 rounded-full bg-[#181b21] border border-[#252932] text-[#7e8695] hover:text-white transition-colors relative"
                title="Notifications"
                onClick={() => navigate('/invoices')}
              >
                <Bell className="w-4 h-4" />
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ff59c] absolute top-1.5 right-1.5" />
              </button>
            </div>

            {/* User Avatar & Dropdown */}
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2 p-1 pl-1 pr-2.5 rounded-full bg-[#181b21] border border-[#252932] hover:border-[#303642] transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-400 to-orange-500 text-slate-900 font-bold text-xs flex items-center justify-center overflow-hidden shadow-sm">
                  {user?.name?.charAt(0) || 'A'}
                </div>
                <span className="hidden sm:inline text-xs font-semibold text-slate-200 max-w-[90px] truncate">
                  {user?.name?.split(' ')[0] || 'Admin'}
                </span>
                <ChevronDown className="w-3 h-3 text-[#7e8695]" />
              </button>

              {userDropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-[#181b21] border border-[#252932] rounded-2xl shadow-2xl p-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-[#252932] mb-1">
                    <p className="font-semibold text-white truncate">{user?.name || 'User'}</p>
                    <p className="text-[11px] text-[#7e8695] truncate">{user?.email}</p>
                  </div>
                  <NavLink
                    to="/settings"
                    onClick={() => setUserDropdownOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-[#222731] transition-colors"
                  >
                    <SettingsIcon className="w-3.5 h-3.5 text-[#7e8695]" />
                    <span>System Settings</span>
                  </NavLink>
                  <button
                    onClick={() => {
                      setUserDropdownOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 pt-3 border-t border-[#1c2027] space-y-1.5 pb-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = item.path === '/' 
                ? location.pathname === '/' 
                : location.pathname.startsWith(item.path);

              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold ${
                    isActive
                      ? 'bg-[#8ff59c] text-[#0d1710]'
                      : 'text-[#7e8695] hover:text-white hover:bg-[#181b21]'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </NavLink>
              );
            })}
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-xs font-semibold text-rose-400 hover:bg-rose-500/10 rounded-xl"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

