import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  User,
  Building,
  Briefcase,
  Phone,
  Mail,
  QrCode,
  CheckCircle,
  Clock,
  Send,
  MessageSquare,
  Mail as MailIcon,
  X,
  AlertCircle,
  MapPin,
} from 'lucide-react';
import { guestsApi } from '@/api';
import type { Guest } from '@shared/types';

export default function GuestDetail() {
  const { eventId, guestId } = useParams<{ eventId: string; guestId: string }>();
  const navigate = useNavigate();
  const [guest, setGuest] = useState<Guest | null>(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms'>('email');
  const [invitePreview, setInvitePreview] = useState<{
    subject: string;
    content: string;
  } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);

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

  const handleOpenInvite = async () => {
    if (!eventId || !guest) return;
    setInviteMethod(guest.email ? 'email' : 'sms');
    setInvitePreview(null);
    setShowInviteModal(true);
    await loadInvitePreview(guest.email ? 'email' : 'sms');
  };

  const loadInvitePreview = async (method: 'email' | 'sms') => {
    if (!eventId || !guestId) return;
    try {
      setLoadingPreview(true);
      const preview = await guestsApi.getInvitePreview(eventId, guestId, method);
      setInvitePreview({ subject: preview.subject, content: preview.content });
    } catch (err) {
      console.error('获取预览失败:', err);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleInviteMethodChange = (method: 'email' | 'sms') => {
    setInviteMethod(method);
    setInvitePreview(null);
    loadInvitePreview(method);
  };

  const handleSendInvite = async () => {
    if (!eventId || !guestId) return;
    try {
      const result = await guestsApi.sendInvite(eventId, guestId, inviteMethod);
      alert(result.message);
      setShowInviteModal(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '发送失败');
    }
  };

  const getInviteStatusStyle = (status: string) => {
    switch (status) {
      case 'sent':
        return 'bg-green-100 text-green-700';
      case 'failed':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-500';
    }
  };

  const getInviteStatusLabel = (status: string) => {
    switch (status) {
      case 'sent':
        return '已发送';
      case 'failed':
        return '发送失败';
      default:
        return '未发送';
    }
  };

  const getZoneName = (zoneId?: string) => {
    if (!zoneId) return '';
    if (zoneId === 'zone-vip-001') return 'VIP区';
    if (zoneId === 'zone-media-001') return '媒体区';
    return '普通区';
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
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-serif font-bold text-gray-900">嘉宾信息</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-medium ${getInviteStatusStyle(
                  guest.inviteStatus,
                )}`}
              >
                {getInviteStatusLabel(guest.inviteStatus)}
                {guest.inviteSentAt &&
                  ` · ${new Date(guest.inviteSentAt).toLocaleDateString('zh-CN')}`}
              </span>
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
                  <div className="flex items-center gap-2 mb-4 flex-wrap">
                    <span
                      className={`px-3 py-1 rounded-full text-xs font-medium ${
                        guest.checkInStatus === 'checked_in'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}
                    >
                      {guest.checkInStatus === 'checked_in' ? '已签到' : '未签到'}
                    </span>
                    {guest.inviteMethod && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-gold-100 text-gold-700">
                        {guest.inviteMethod === 'email' ? '邮件邀请' : '短信邀请'}
                      </span>
                    )}
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

                <div className="flex items-start gap-3 md:col-span-2">
                  <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center flex-shrink-0">
                    <MapPin size={18} className="text-gold-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 mb-1">座位信息</p>
                    <p className="text-gray-900 font-medium">
                      {guest.seatZoneId
                        ? `${getZoneName(guest.seatZoneId)}${
                            guest.seatNumber ? ` - ${guest.seatNumber}号` : ''
                          }`
                        : '尚未分配座位'}
                    </p>
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
                        签到时间：
                        {guest.checkInTime
                          ? new Date(guest.checkInTime).toLocaleString('zh-CN')
                          : '-'}
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
                <div className="flex items-center justify-center gap-2">
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
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-serif font-bold text-gray-900">发送邀请</h2>
            </div>
            <div className="p-4 space-y-2">
              <button
                onClick={handleOpenInvite}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-gold-50 hover:bg-gold-100 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gold-100 flex items-center justify-center">
                  <Send size={18} className="text-gold-600" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-medium text-gold-800 text-sm">发送邀请</p>
                  <p className="text-xs text-gold-600">邮件或短信发送邀请</p>
                </div>
              </button>
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
                  <MapPin size={18} className="text-blue-600" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900 text-sm">座位安排</p>
                  <p className="text-xs text-gray-500">分配座位区域和座位号</p>
                </div>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-gray-900">发送邀请</h2>
              <button
                onClick={() => setShowInviteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  选择发送方式
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => handleInviteMethodChange('email')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      inviteMethod === 'email'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <MailIcon size={20} />
                    <span className="font-medium">邮件</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleInviteMethodChange('sms')}
                    className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                      inviteMethod === 'sms'
                        ? 'border-primary-500 bg-primary-50 text-primary-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <MessageSquare size={20} />
                    <span className="font-medium">短信</span>
                  </button>
                </div>
              </div>

              {loadingPreview ? (
                <div className="border border-gray-200 rounded-xl p-8 text-center">
                  <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-500 text-sm">正在生成预览...</p>
                </div>
              ) : invitePreview ? (
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-700">
                      {inviteMethod === 'email' ? '邮件主题：' : '短信预览：'}
                      <span className="text-gray-900 ml-1">{invitePreview.subject}</span>
                    </p>
                  </div>
                  <div className="p-4 max-h-64 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-600 font-sans">
                      {invitePreview.content}
                    </pre>
                  </div>
                </div>
              ) : null}

              {!guest.email && inviteMethod === 'email' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    该嘉宾未填写邮箱，请使用短信发送或先补充邮箱信息
                  </p>
                </div>
              )}

              {!guest.phone && inviteMethod === 'sms' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    该嘉宾未填写手机号，请使用邮件发送或先补充手机号信息
                  </p>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={handleSendInvite}
                  disabled={
                    (inviteMethod === 'email' && !guest.email) ||
                    (inviteMethod === 'sms' && !guest.phone)
                  }
                  className="flex-1 py-2.5 px-4 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  发送邀请
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
