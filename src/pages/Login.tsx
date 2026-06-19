import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, User, Sparkles } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';

export default function Login() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const login = useAuthStore((state) => state.login);

  const from = (location.state as { from?: Location })?.from?.pathname || '/events';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      <div className="hidden lg:flex lg:w-1/2 bg-primary-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary-900 via-primary-800 to-primary-900">
          <div className="absolute top-20 left-20 w-64 h-64 bg-gold-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-gold-400/5 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/3 w-48 h-48 border border-gold-500/20 rounded-full"></div>
          <div className="absolute top-1/3 right-1/4 w-32 h-32 border border-gold-400/10 rounded-full"></div>
        </div>

        <div className="relative z-10 flex flex-col justify-center px-16">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-14 h-14 rounded-xl bg-gold-500/20 flex items-center justify-center">
              <Sparkles className="w-7 h-7 text-gold-400" />
            </div>
            <div>
              <h1 className="text-2xl font-serif font-bold text-white">嘉宾管理系统</h1>
              <p className="text-primary-300 text-sm">Event Guest Management</p>
            </div>
          </div>

          <h2 className="text-4xl font-serif font-bold text-white mb-4 leading-tight">
            专业的活动<br />
            <span className="text-gold-400">嘉宾接待方案</span>
          </h2>
          <p className="text-primary-200 text-lg mb-12 max-w-md">
            一站式活动管理平台，从邀请、签到到数据分析，
            让您的活动更加精彩有序。
          </p>

          <div className="space-y-4">
            {[
              { title: '智能邀请', desc: '自动生成专属二维码邀请' },
              { title: '便捷签到', desc: '扫码即签，高效准确' },
              { title: '数据统计', desc: '实时签到数据与分析报告' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                  <span className="text-gold-400 font-serif font-bold">{i + 1}</span>
                </div>
                <div>
                  <p className="text-white font-medium">{item.title}</p>
                  <p className="text-primary-300 text-sm">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-slate-50">
        <div className="w-full max-w-md">
          <div className="lg:hidden text-center mb-10">
            <div className="inline-flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-primary-700 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-gold-400" />
              </div>
              <h1 className="text-xl font-serif font-bold text-primary-800">嘉宾管理系统</h1>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-card p-8">
            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">欢迎回来</h2>
            <p className="text-gray-500 mb-8">请登录您的账号继续</p>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  用户名
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="请输入用户名"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  密码
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                    placeholder="请输入密码"
                  />
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-primary-700 hover:bg-primary-600 text-white font-medium rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '登录中...' : '登录'}
              </button>
            </form>

            <div className="mt-8 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center">
                测试账号：admin / admin123（管理员）
              </p>
              <p className="text-xs text-gray-400 text-center mt-1">
                reception / reception123（接待员）
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
