import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Users,
  UserCheck,
  Percent,
  Download,
  BarChart3,
  TrendingUp,
  PieChart,
} from 'lucide-react';
import { reportsApi, eventsApi, exportApi, seatsApi } from '@/api';
import type { ReportData, Event, SeatZone } from '@shared/types';
import { getZoneColor } from '@/lib/utils';

export default function ReportPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [zones, setZones] = useState<SeatZone[]>([]);
  const [report, setReport] = useState<ReportData | null>(null);
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
      const [eventData, reportData, zonesData] = await Promise.all([
        eventsApi.getById(eventId),
        reportsApi.getReport(eventId),
        seatsApi.getZones(eventId),
      ]);
      setEvent(eventData);
      setReport(reportData);
      setZones(zonesData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (eventId) {
      exportApi.downloadGuests(eventId);
    }
  };

  const StatCard = ({
    icon: Icon,
    label,
    value,
    subtitle,
    color,
    bgColor,
  }: {
    icon: React.ElementType;
    label: string;
    value: string | number;
    subtitle?: string;
    color: string;
    bgColor: string;
  }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-gray-500 mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-sm text-gray-400 mt-1">{subtitle}</p>}
        </div>
        <div className={`w-12 h-12 rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`w-6 h-6 ${color}`} />
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-gray-500">加载中...</div>
      </div>
    );
  }

  const maxZoneTotal = report?.zoneStats.length
    ? Math.max(...report.zoneStats.map((z) => z.total))
    : 0;

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">统计报告</h1>
          <p className="text-gray-500 mt-1">{event?.name || '活动'}</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all hover:shadow-lg"
        >
          <Download size={18} />
          <span>导出Excel</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard
          icon={Users}
          label="邀请嘉宾"
          value={report?.totalGuests || 0}
          subtitle="总邀请人数"
          color="text-primary-600"
          bgColor="bg-primary-100"
        />
        <StatCard
          icon={UserCheck}
          label="实到人数"
          value={report?.checkedInCount || 0}
          subtitle="实际签到人数"
          color="text-green-600"
          bgColor="bg-green-100"
        />
        <StatCard
          icon={Percent}
          label="签到率"
          value={`${report?.checkInRate || 0}%`}
          subtitle="签到完成度"
          color="text-gold-600"
          bgColor="bg-gold-100"
        />
        <StatCard
          icon={TrendingUp}
          label="预计人数"
          value={event?.expectedAttendees || 0}
          subtitle="活动预期规模"
          color="text-purple-600"
          bgColor="bg-purple-100"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-gray-900">各区域签到统计</h2>
              <p className="text-sm text-gray-500">按座位区域统计签到情况</p>
            </div>
          </div>
          <div className="p-6">
            {report?.zoneStats.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                暂无座位区域数据
              </div>
            ) : (
              <div className="space-y-5">
                {report?.zoneStats.map((zone) => {
                  const percent = zone.total > 0 ? (zone.checkedIn / zone.total) * 100 : 0;
                  const widthPercent = maxZoneTotal > 0 ? (zone.total / maxZoneTotal) * 100 : 0;
                  return (
                    <div key={zone.zoneId}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-gray-700">
                          {zone.zoneName}
                        </span>
                        <span className="text-sm text-gray-500">
                          {zone.checkedIn} / {zone.total}
                          <span className="text-gray-400 ml-2">
                            ({percent.toFixed(0)}%)
                          </span>
                        </span>
                      </div>
                      <div className="relative h-8 bg-gray-100 rounded-lg overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-primary-500 rounded-lg transition-all"
                          style={{ width: `${widthPercent}%` }}
                        >
                          <div
                            className="h-full bg-green-500 rounded-l-lg"
                            style={{ width: `${percent}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="font-serif font-bold text-gray-900">签到趋势</h2>
              <p className="text-sm text-gray-500">按时间统计签到人数</p>
            </div>
          </div>
          <div className="p-6">
            {!report?.checkInTrend.length ? (
              <div className="text-center py-12 text-gray-500">
                <TrendingUp className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                暂无签到数据
              </div>
            ) : (
              <div className="h-64 flex items-end gap-2">
                {report?.checkInTrend.map((item, index) => {
                  const maxCount = Math.max(...report.checkInTrend.map((t) => t.count), 1);
                  const height = (item.count / maxCount) * 100;
                  const time = new Date(item.time).toLocaleTimeString('zh-CN', {
                    hour: '2-digit',
                    minute: '2-digit',
                  });
                  return (
                    <div key={index} className="flex-1 flex flex-col items-center gap-2">
                      <span className="text-xs text-gray-500">{item.count}</span>
                      <div
                        className="w-full bg-gradient-to-t from-primary-500 to-primary-400 rounded-t-lg transition-all"
                        style={{ height: `${Math.max(height, 5)}%` }}
                      ></div>
                      <span className="text-xs text-gray-400">{time}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gold-100 flex items-center justify-center">
            <PieChart className="w-5 h-5 text-gold-600" />
          </div>
          <div>
            <h2 className="font-serif font-bold text-gray-900">嘉宾构成分析</h2>
            <p className="text-sm text-gray-500">各区域嘉宾占比</p>
          </div>
        </div>
        <div className="p-6">
          {report?.zoneStats.length === 0 ? (
            <div className="text-center py-8 text-gray-500">暂无数据</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              {report?.zoneStats.map((zone) => {
                const total = report.totalGuests;
                const percent = total > 0 ? ((zone.total / total) * 100).toFixed(1) : '0';
                const color = getZoneColor(zone.zoneId, zones);
                return (
                  <div key={zone.zoneId} className="text-center">
                    <div
                      className="w-20 h-20 mx-auto mb-3 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${color}20` }}
                    >
                      <div
                        className="w-14 h-14 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: color }}
                      >
                        <span className="text-white font-bold text-lg">{zone.total}</span>
                      </div>
                    </div>
                    <p className="font-medium text-gray-900">{zone.zoneName}</p>
                    <p className="text-sm text-gray-500">{percent}%</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
