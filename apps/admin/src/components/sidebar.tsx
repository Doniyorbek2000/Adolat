'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Tag,
  Receipt,
  Settings2,
  Activity,
  BookOpen,
  HeadphonesIcon,
  BarChart2,
  ScrollText,
  Settings,
  Bell,
  Shield,
  LogOut,
  Menu,
  X,
  Scale,
} from 'lucide-react';
import { useState } from 'react';
import { clearToken } from '../lib/auth';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: <LayoutDashboard size={18} /> },
  { label: 'Users', href: '/users', icon: <Users size={18} /> },
  { label: 'Plans', href: '/plans', icon: <CreditCard size={18} /> },
  { label: 'Promo Codes', href: '/promo-codes', icon: <Tag size={18} /> },
  { label: 'Payments', href: '/payments', icon: <Receipt size={18} /> },
  { label: 'AI Settings', href: '/ai-settings', icon: <Settings2 size={18} /> },
  { label: 'AI Monitoring', href: '/ai-monitoring', icon: <Activity size={18} /> },
  { label: 'Legal Sources', href: '/legal-sources', icon: <BookOpen size={18} /> },
  { label: 'Support', href: '/support', icon: <HeadphonesIcon size={18} /> },
  { label: 'Analytics', href: '/analytics', icon: <BarChart2 size={18} /> },
  { label: 'Bildirishnomalar', href: '/notifications', icon: <Bell size={18} /> },
  { label: 'Audit Loglar', href: '/audit-logs', icon: <Shield size={18} /> },
  { label: 'Sozlamalar', href: '/settings', icon: <Settings size={18} /> },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleLogout() {
    clearToken();
    router.push('/login');
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2 px-4 py-5 border-b border-blue-800">
        <Scale size={22} className="text-blue-300" />
        <span className="text-white font-bold text-base leading-tight">
          Adolat AI<br />
          <span className="text-blue-300 text-xs font-normal">Admin Panel</span>
        </span>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 overflow-y-auto px-2 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== '/dashboard' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-blue-700 text-white'
                  : 'text-blue-100 hover:bg-blue-800 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-2 py-4 border-t border-blue-800">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2 w-full rounded-lg text-sm font-medium text-blue-100 hover:bg-blue-800 hover:text-white transition-colors"
        >
          <LogOut size={18} />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:flex-col md:w-56 lg:w-60 bg-[#1A3A6C] min-h-screen flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile: hamburger button */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-[#1A3A6C] text-white shadow-lg"
        onClick={() => setMobileOpen((v) => !v)}
        aria-label="Toggle menu"
      >
        {mobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`md:hidden fixed top-0 left-0 z-50 h-full w-60 bg-[#1A3A6C] transform transition-transform duration-200 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <SidebarContent />
      </aside>
    </>
  );
}
