import React, { useState } from 'react';
import {
  Search,
  Bell,
  Plus,
  UserCheck,
  ChevronDown,
  Wrench,
  Car,
  UserPlus,
  Receipt,
  CreditCard,
  PackagePlus,
  CalendarPlus,
  FileText,
  Clock,
  Menu,
  Download
} from 'lucide-react';
import { User, UserRole, AppNotification } from '../types';
import { db } from '../services/db';
import { BrandLogo } from './BrandLogo';
import { subscribeNotifications, connectNotifications } from '../services/notifications';

interface HeaderProps {
  currentUser?: User;
  onSwitchUser?: (user: User) => void;
  availableUsers?: User[];
  notifications?: AppNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onOpenSearch: () => void;
  onOpenQuickAdd: (type: string) => void;
  onOpenMobileMenu?: () => void;
  sidebarCollapsed?: boolean;
  userRole?: UserRole;
  setUserRole?: (role: UserRole) => void;
  onSignOut?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onSwitchUser,
  availableUsers,
  notifications,
  onMarkNotificationRead,
  onOpenSearch,
  onOpenQuickAdd,
  sidebarCollapsed = false,
  userRole,
  setUserRole,
  onOpenMobileMenu
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [showNotifMenu, setShowNotifMenu] = useState(false);
  const [showQuickAddMenu, setShowQuickAddMenu] = useState(false);
  const [installPromptEvent, setInstallPromptEvent] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  React.useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstallable(false);
      setInstallPromptEvent(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt as EventListener);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!installPromptEvent) return;

    installPromptEvent.prompt();
    await installPromptEvent.userChoice;
    setInstallPromptEvent(null);
    setIsInstallable(false);
  };

  const activeUser = currentUser || db.getCurrentUser();
  const usersList = availableUsers || db.getUsers() || [];
  const [localNotifications, setLocalNotifications] = React.useState<AppNotification[]>(notifications || db.getNotifications() || []);
  const notificationsList = notifications || localNotifications;

  React.useEffect(() => {
    connectNotifications();
    const unsub = subscribeNotifications((n: AppNotification) => {
      try {
        db.addNotification(n);
      } catch {}
      setLocalNotifications(prev => [n, ...prev]);
    });
    return () => unsub();
  }, []);

  const unreadCount = notificationsList.filter((n) => n && !n.read).length;

  return (
    <header
      className={`fixed top-0 right-0 z-20 h-16 bg-white/95 backdrop-blur-md border-b border-slate-200 transition-all duration-300 flex items-center justify-between px-4 sm:px-6 ${
        sidebarCollapsed ? 'md:left-20' : 'md:left-64'
      } left-0`}
    >
      {/* Left: Brand + Global Search trigger */}
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden inline-flex items-center justify-center p-2 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-50 transition-colors"
            title="Open navigation"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}
        <div className="hidden sm:flex items-center shrink-0 w-36 md:w-44 lg:w-52">
          <BrandLogo compact className="w-full" />
        </div>
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center gap-3 px-3.5 py-2 bg-slate-100/80 hover:bg-slate-100 border border-slate-200 text-slate-500 rounded-xl text-sm transition-all shadow-sm group"
        >
          <Search className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition-colors" />
          <span className="text-slate-400 group-hover:text-slate-600 transition-colors">
            Search registration (GR 1234), customer, phone, job #...
          </span>
          <kbd className="ml-auto hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-400 bg-white border border-slate-200 rounded">
            /
          </kbd>
        </button>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Quick Add Button & Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowQuickAddMenu(!showQuickAddMenu)}
            className="flex items-center gap-2 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Quick Add</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>

          {showQuickAddMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150"
              onMouseLeave={() => setShowQuickAddMenu(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                Create New Workshop Record
              </div>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onOpenQuickAdd('job');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Wrench className="w-4 h-4 text-blue-600" />
                New Job Card
              </button>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onOpenQuickAdd('customer');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <UserPlus className="w-4 h-4 text-emerald-600" />
                New Customer
              </button>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onOpenQuickAdd('vehicle');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <Car className="w-4 h-4 text-indigo-600" />
                New Vehicle
              </button>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onOpenQuickAdd('booking');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <CalendarPlus className="w-4 h-4 text-purple-600" />
                New Booking
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onOpenQuickAdd('quotation');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <FileText className="w-4 h-4 text-amber-600" />
                New Quotation
              </button>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onOpenQuickAdd('payment');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <CreditCard className="w-4 h-4 text-emerald-600" />
                Record Payment
              </button>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onOpenQuickAdd('part');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <PackagePlus className="w-4 h-4 text-teal-600" />
                Add Spare Part
              </button>
              <button
                onClick={() => {
                  setShowQuickAddMenu(false);
                  onOpenQuickAdd('price-list');
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 transition-colors"
              >
                <FileText className="w-4 h-4 text-teal-600" />
                Add Price List Item
              </button>
            </div>
          )}
        </div>

        {isInstallable && (
          <button
            onClick={handleInstallClick}
            className="hidden sm:inline-flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-semibold shadow-sm transition-all"
          >
            <Download className="w-4 h-4" />
            Install App
          </button>
        )}

        {/* Notifications Popover */}
        <div className="relative">
          <button
            onClick={() => setShowNotifMenu(!showNotifMenu)}
            className="p-2.5 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 relative transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifMenu && (
            <div
              className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50 max-h-96 overflow-y-auto"
              onMouseLeave={() => setShowNotifMenu(false)}
            >
              <div className="px-4 py-2 flex items-center justify-between border-b border-slate-100">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-700">Notifications</span>
                <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full">
                  {unreadCount} New
                </span>
              </div>
              {notificationsList.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">No new notifications</div>
              ) : (
                notificationsList.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onMarkNotificationRead?.(n.id)}
                    className={`px-4 py-3 border-b border-slate-50 hover:bg-slate-50 cursor-pointer transition-colors ${
                      !n.read ? 'bg-blue-50/40' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">{n.title}</span>
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{n.date?.split(' ')[1] || ''}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-snug">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* User Role Switcher Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowRoleMenu(!showRoleMenu)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-left"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-200 text-blue-700 flex items-center justify-center font-bold text-xs">
              {activeUser.role.substring(0, 2).toUpperCase()}
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-xs font-bold text-slate-800 leading-tight">{activeUser.name}</span>
              <span className="text-[10px] text-blue-600 font-medium">{activeUser.role}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {showRoleMenu && (
            <div
              className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-50"
              onMouseLeave={() => setShowRoleMenu(false)}
            >
              <div className="px-3 py-2 text-sm font-semibold text-slate-800">
                Signed in as
              </div>
              <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 text-blue-700 flex items-center justify-center font-bold text-sm">
                  {activeUser.role.substring(0, 2).toUpperCase()}
                </div>
                <div className="flex-1">
                  <div className="text-xs font-semibold text-slate-800">{activeUser.name}</div>
                  <div className="text-[11px] text-slate-500">{activeUser.role}</div>
                </div>
              </div>
              <div className="my-1 border-t border-slate-100" />
              <button
                onClick={() => {
                  localStorage.removeItem('eljindi_current_user_v1');
                  window.location.reload();
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 text-xs text-rose-600 font-semibold"
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
