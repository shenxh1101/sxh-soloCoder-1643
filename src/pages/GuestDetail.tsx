import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Download, User, Building, Briefcase, Phone, Mail, QrCode, CheckCircle, Clock } from 'lucide-react';
import { guestsApi } from '@/api';
import type { Guest } from '@shared/types';

export default function GuestDetail() {
  const { eventId, guestId } = useParams<{ eventId: string; guestId: string }>();
  const navigate = useNavigate();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (eventId && guestId) {
      loadData();
    }
  }, [eventId, guestId]);

  const loadData = async () => {
    if (!eventId || !guestId) return;
    try {
      setLoading(true);
      const [guestData, qrData] = await Promise.all([
        guestsApi.getById(eventId, guestId),
        guestsApi.getQrCode(eventId, guestId),
      ]);
      setGuest(guestData);
      setQrDataUrl(qrData.qrDataUrl);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = () => {
    if (!qrDataUrl || !guest) return;

    const link = document.createElement('a');
    link.download = `邀请码_${guest.name}.png`;
    link.href = qrDataUrl;
    link.click();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!guest) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-gray-500">未找到嘉宾信息</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate(`/events/${eventId}/guests`)}
        className="flex items-center gap-2 text-gray-600 hover:text-primary-600 mb-6 transition-colors"
      >
        <ArrowLeft size={20} />
        <span>返回嘉宾列表</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-serif font-bold text-gray-900">嘉宾信息</h2>
            </div>
            <div className="p-6">
              <div className="flex items-start gap-6">
                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                  <span className="text-2xl font-serif font-bold text-white">
                    {guest.name.charAt(0)}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{guest.name}</h3>
                  <div className="flex items-center gap-2 mb-4">
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
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8 pt-6 border-t border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Building size={18} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">公司</p>
                    <p className="text-gray-900 font-medium">{guest.company || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                    <Briefcase size={18} className="text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">职位</p>
                    <p className="text-gray-900 font-medium">{guest.position || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center flex-shrink-0">
                    <Phone size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">手机号</p>
                    <p className="text-gray-900 font-medium">{guest.phone || '-'}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <Mail size={18} className="text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">邮箱</p>
                    <p className="text-gray-900 font-medium">{guest.email || '-'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-serif font-bold text-gray-900">签到信息</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center gap-4">
                {guest.checkInStatus === 'checked_in' ? (
                  <>
                    <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                      <CheckCircle size={24} className="text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">已签到</p>
                      <p className="text-sm text-gray-500">
                        签到时间：{guest.checkInTime ? new Date(guest.checkInTime).toLocaleString('zh-CN') : '-'}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                      <Clock size={24} className="text-gray-400" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-500">尚未签到</p>
                      <p className="text-sm text-gray-400">等待嘉宾到场签到</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-serif font-bold text-gray-900">邀请二维码</h2>
            </div>
            <div className="p-6">
              <div className="bg-gradient-to-br from-primary-50 to-white p-6 rounded-xl border border-primary-100">
                {qrDataUrl && (
                  <div className="bg-white p-4 rounded-lg shadow-sm">
                    <img
                      src={qrDataUrl}
                      alt="邀请二维码"
                      className="w-full aspect-square"
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 text-center">
                <p className="text-sm text-gray-500 mb-3">扫码即可签到入场</p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary-700 hover:bg-primary-600 text-white text-sm rounded-lg transition-all"
                >
                  <Download size={16} />
                  下载二维码
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-serif font-bold text-gray-900">快捷操作</h2>
            </div>
            <div className="p-4 space-y-2">
              <Link
                to={`/events/${eventId}/checkin`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <QrCode size={18} className="text-green-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">前往签到</p>
                  <p className="text-xs text-gray-500">扫描二维码签到</p>
                </div>
              </Link>
              <Link
                to={`/events/${eventId}/seats`}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Building size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">座位安排</p>
                  <p className="text-xs text-gray-500">分配座位区域</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
