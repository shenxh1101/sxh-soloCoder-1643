import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  Users,
  QrCode,
  LayoutGrid,
  BarChart3,
  Sparkles,
  Clock,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { eventsApi, guestsApi, reportsApi, seatsApi } from '@/api';
import type { Event, Guest, ReportData, SeatZone } from '@shared/types';

export default function EventOverview() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
  const [zones, setZones] = useState<(SeatZone & { assignedCount: number })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [eventData, guestsData, reportData, zonesData] = await Promise.all([
        eventsApi.getById(eventId),
        guestsApi.getByEvent(eventId),
        reportsApi.getReport(eventId),
        seatsApi.getZones(eventId),
      ]);
      setEvent(eventData);
      setGuests(guestsData);
      setReport(reportData);
      setZones(zonesData as (SeatZone & { assignedCount: number })[]);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusStyle = (status: string) => {
    const map: Record<string, { label: string; className: string }> = {
      upcoming: { label: '即将开始', className: 'bg-blue-100 text-blue-700' },
      ongoing: { label: '进行中', className: 'bg-green-100 text-green-700' },
      ended: { label: '已结束', className: 'bg-gray-100 text-gray-600' },
    };
    return map[status] || map.upcoming;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-gray-500">活动不存在</div>
      </div>
    );
  }

  const status = getStatusStyle(event.status);

  const quickActions = [
    {
      icon: Users,
      title: '嘉宾管理',
      desc: '管理嘉宾信息和邀请',
      path: `/events/${eventId}/guests`,
      color: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      icon: QrCode,
      title: '签到管理',
      desc: '扫码签到和手动签到',
      path: `/events/${eventId}/checkin`,
      color: 'from-green-500 to-green-600',
      bg: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      icon: LayoutGrid,
      title: '座位安排',
      desc: '分配座位区域和座位号',
      path: `/events/${eventId}/seats`,
      color: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
    {
      icon: BarChart3,
      title: '统计报告',
      desc: '签到数据和分析报告',
      path: `/events/${eventId}/reports`,
      color: 'from-gold-500 to-gold-600',
      bg: 'bg-gold-50',
      iconColor: 'text-gold-600',
    },
    {
      icon: Sparkles,
      title: '分论坛',
      desc: '分论坛和日程管理',
      path: `/events/${eventId}/forums`,
      color: 'from-pink-500 to-pink-600',
      bg: 'bg-pink-50',
      iconColor: 'text-pink-600',
    },
  ];

  return (
    <div className="p-8">
      <div className="bg-gradient-to-r from-primary-800 via-primary-700 to-primary-800 rounded-2xl p-8 mb-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gold-400 rounded-full blur-3xl transform translate-x-1/2 -translate-y-1/2"></div>
        </div>
        <div className="relative z-10">
          <div className="flex items-start justify-between">
            <div>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium mb-3 ${status.className}`}>
                {status.label}
              </span>
              <h1 className="text-3xl font-serif font-bold mb-2">{event.name}</h1>
              {event.description && (
                <p className="text-primary-200 max-w-2xl">{event.description}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-8">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <p className="text-sm text-primary-300">活动时间</p>
                <p className="font-medium">{formatDate(event.startTime)}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <p className="text-sm text-primary-300">具体时间</p>
                <p className="font-medium">
                  {formatTime(event.startTime)} - {formatTime(event.endTime)}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <MapPin className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <p className="text-sm text-primary-300">活动地点</p>
                <p className="font-medium">{event.location}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-gold-400" />
              </div>
              <div>
                <p className="text-sm text-primary-300">预计人数</p>
                <p className="font-medium">{event.expectedAttendees} 人</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">邀请嘉宾</p>
              <p className="text-2xl font-bold text-gray-900">{guests.length}</p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 rounded-full transition-all"
              style={{
                width: `${event.expectedAttendees > 0 ? Math.min((guests.length / event.expectedAttendees) * 100, 100) : 0}%`,
              }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            占预计人数 {event.expectedAttendees > 0 ? Math.round((guests.length / event.expectedAttendees) * 100) : 0}%
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">已签到</p>
              <p className="text-2xl font-bold text-gray-900">
                {report?.checkedInCount || 0}
              </p>
            </div>
          </div>
          <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-500 rounded-full transition-all"
              style={{ width: `${report?.checkInRate || 0}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-400 mt-2">签到率 {report?.checkInRate || 0}%</p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gold-50 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-gold-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">座位区域</p>
              <p className="text-2xl font-bold text-gray-900">{zones.length} 个</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {zones.map((zone) => (
              <div
                key={zone.id}
                className="h-2 flex-1 rounded-full"
                style={{ backgroundColor: zone.color }}
                title={zone.name}
              ></div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-2">
            已分配 {zones.reduce((sum, z) => sum + (z.assignedCount || 0), 0)} 个座位
          </p>
        </div>
      </div>

      <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">快速入口</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.path}
              onClick={() => navigate(action.path)}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 text-left hover:shadow-card-hover hover:-translate-y-1 transition-all group"
            >
              <div
                className={`w-12 h-12 rounded-xl ${action.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}
              >
                <Icon className={`w-6 h-6 ${action.iconColor}`} />
              </div>
              <h3 className="font-bold text-gray-900 mb-1">{action.title}</h3>
              <p className="text-sm text-gray-500">{action.desc}</p>
            </button>
          );
        })}
      </div>

      {guests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-serif font-bold text-gray-900 mb-4">最近添加的嘉宾</h2>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="divide-y divide-gray-100">
              {guests.slice(0, 5).map((guest) => (
                <div
                  key={guest.id}
                  className="flex items-center gap-4 p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate(`/events/${eventId}/guests/${guest.id}`)}
                >
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium text-sm">
                      {guest.name.charAt(0)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{guest.name}</p>
                    <p className="text-sm text-gray-500 truncate">{guest.company}</p>
                  </div>
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      guest.checkInStatus === 'checked_in'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {guest.checkInStatus === 'checked_in' ? '已签到' : '未签到'}
                  </span>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => navigate(`/events/${eventId}/guests`)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                查看全部嘉宾 →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
