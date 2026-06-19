import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Calendar,
  Users,
  QrCode,
  LayoutGrid,
  BarChart3,
  LogOut,
  Sparkles,
  Settings,
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);

  const eventId = location.pathname.match(/\/events\/([^/]+)/)?.[1];

  const navItems = eventId
    ? [
        { path: `/events/${eventId}`, label: '活动概览', icon: Calendar },
        { path: `/events/${eventId}/guests`, label: '嘉宾管理', icon: Users },
        { path: `/events/${eventId}/checkin`, label: '签到管理', icon: QrCode },
        { path: `/events/${eventId}/seats`, label: '座位安排', icon: LayoutGrid },
        { path: `/events/${eventId}/reports`, label: '统计报告', icon: BarChart3 },
        { path: `/events/${eventId}/forums`, label: '分论坛', icon: Sparkles },
      ]
    : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path: string) => {
    if (path === `/events/${eventId}`) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="w-64 bg-primary-800 text-white flex flex-col">
        <div className="p-6 border-b border-primary-700">
          <h1 className="text-xl font-serif font-bold text-gold-400">嘉宾管理系统</h1>
          <p className="text-sm text-primary-300 mt-1">活动邀请与接待平台</p>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <button
            onClick={() => navigate('/events')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
              !eventId
                ? 'bg-primary-700 text-white'
                : 'text-primary-200 hover:bg-primary-700/50 hover:text-white'
            }`}
          >
            <Calendar size={20} />
            <span className="text-sm font-medium">活动列表</span>
          </button>

          {eventId && (
            <div className="pt-4">
              <p className="px-4 text-xs text-primary-400 uppercase tracking-wider mb-2">
                当前活动
              </p>
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all text-sm ${
                      isActive(item.path)
                        ? 'bg-gold-500/20 text-gold-300 border-l-2 border-gold-400'
                        : 'text-primary-200 hover:bg-primary-700/50 hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <div className="p-4 border-t border-primary-700">
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="w-10 h-10 rounded-full bg-gold-500/20 flex items-center justify-center">
              <Settings size={18} className="text-gold-400" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name || '用户'}</p>
              <p className="text-xs text-primary-400">
                {user?.role === 'admin' ? '管理员' : '接待员'}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-primary-300 hover:bg-primary-700/50 hover:text-white transition-all text-sm"
          >
            <LogOut size={18} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
