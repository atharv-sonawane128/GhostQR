'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  ShoppingBag,
  Bell,
  User,
  Shield,
  Ghost,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/chats', icon: MessageSquare, label: 'Chats' },
  { href: '/shop', icon: ShoppingBag, label: 'Shop' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
  { href: '/profile', icon: User, label: 'Profile' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, userData, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out');
    } catch {
      toast.error('Logout failed');
    }
  };

  const items = userData?.role === 'admin'
    ? [...navItems, { href: '/admin', icon: Shield, label: 'Admin Panel' }]
    : navItems;

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={clsx(
        'flex items-center gap-3 p-5 border-b border-ghost-600/30',
        collapsed && 'justify-center px-3'
      )}>
        <div className="w-9 h-9 rounded-xl bg-ghost-gradient flex items-center justify-center flex-shrink-0 shadow-lg"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}>
          <Ghost className="w-5 h-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-ghost-200 text-sm tracking-wide">GhostQR</p>
            <p className="text-xs text-ghost-300">Smart Recovery</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {items.map(({ href, icon: Icon, label }) => {
          const active = pathname === href || pathname.startsWith(href + '/');
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={clsx(
                'nav-link',
                active && 'active',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? label : undefined}
            >
              <Icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span>{label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* User Section */}
      <div className={clsx(
        'border-t border-ghost-600/30 p-3',
        collapsed ? 'flex flex-col items-center gap-2' : 'space-y-2'
      )}>
        {!collapsed && user && (
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-lg bg-ghost-500 flex items-center justify-center text-sm font-bold text-ghost-accent-light flex-shrink-0">
              {userData?.name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-ghost-100 truncate">{userData?.name || 'User'}</p>
              <p className="text-[11px] text-ghost-300 truncate">{user.email}</p>
            </div>
          </div>
        )}

        {!collapsed && userData && (
          <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-ghost-600/30">
            <span className="text-xs text-ghost-300">GhostCoins</span>
            <span className="text-xs font-bold text-ghost-gold">{userData.ghostCoins ?? 0} 🪙</span>
          </div>
        )}

        <button
          onClick={handleLogout}
          className={clsx(
            'nav-link w-full text-ghost-danger hover:bg-ghost-danger/10 hover:text-ghost-danger',
            collapsed && 'justify-center px-2'
          )}
          title={collapsed ? 'Logout' : undefined}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile toggle button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-lg bg-ghost-700 border border-ghost-600/40 flex items-center justify-center text-ghost-300 hover:text-ghost-100"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile sidebar */}
      <aside className={clsx(
        'lg:hidden fixed left-0 top-0 bottom-0 z-40 w-64',
        'bg-ghost-800 border-r border-ghost-600/30',
        'transform transition-transform duration-300',
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <SidebarContent />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className={clsx(
          'hidden lg:flex flex-col',
          'bg-ghost-800 border-r border-ghost-600/30',
          'transition-all duration-300',
          'relative flex-shrink-0',
          collapsed ? 'w-[72px]' : 'w-[260px]'
        )}
      >
        <SidebarContent />

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-ghost-700 border border-ghost-600/40 flex items-center justify-center text-ghost-300 hover:text-ghost-100 hover:bg-ghost-600 transition-colors z-10"
        >
          {collapsed
            ? <ChevronRight className="w-3 h-3" />
            : <ChevronLeft className="w-3 h-3" />}
        </button>
      </aside>
    </>
  );
}
