import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Plus,
  Search,
  QrCode,
  Edit,
  Trash2,
  User,
  Building,
  Briefcase,
  Phone,
  Mail,
  X,
  Send,
  Upload,
  Mail as MailIcon,
  MessageSquare,
  CheckCircle,
  AlertCircle,
  Download,
  ChevronDown,
  CheckSquare,
  Square,
} from 'lucide-react';
import { guestsApi, eventsApi } from '@/api';
import type { Guest, Event, ImportGuestRow } from '@shared/types';
import * as XLSX from 'xlsx';

export default function GuestManagement() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [inviteMethod, setInviteMethod] = useState<'email' | 'sms'>('email');
  const [invitePreview, setInvitePreview] = useState<{
    subject: string;
    content: string;
  } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importPreview, setImportPreview] = useState<{
    total: number;
    valid: number;
    invalid: number;
    duplicates: number;
    rows: ImportGuestRow[];
  } | null>(null);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [showBulkInviteModal, setShowBulkInviteModal] = useState(false);
  const [bulkInviteMethod, setBulkInviteMethod] = useState<'email' | 'sms'>('email');

  const [formData, setFormData] = useState({
    name: '',
    company: '',
    position: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (eventId) {
      loadData();
    }
  }, [eventId]);

  const loadData = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      const [eventData, guestsData] = await Promise.all([
        eventsApi.getById(eventId),
        guestsApi.getByEvent(eventId),
      ]);
      setEvent(eventData);
      setGuests(guestsData);
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredGuests = guests.filter(
    (g) =>
      g.name.toLowerCase().includes(search.toLowerCase()) ||
      g.company.toLowerCase().includes(search.toLowerCase()),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    try {
      if (editingGuest) {
        await guestsApi.update(eventId, editingGuest.id, formData);
      } else {
        await guestsApi.create(eventId, formData);
      }
      setShowModal(false);
      setEditingGuest(null);
      resetForm();
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleEdit = (guest: Guest) => {
    setEditingGuest(guest);
    setFormData({
      name: guest.name,
      company: guest.company,
      position: guest.position,
      phone: guest.phone,
      email: guest.email,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!eventId || !confirm('确定要删除这位嘉宾吗？')) return;
    try {
      await guestsApi.delete(eventId, id);
      loadData();
      setSelectedGuests((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (err) {
      alert('删除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      position: '',
      phone: '',
      email: '',
    });
  };

  const handleOpenInvite = async (guest: Guest) => {
    if (!eventId) return;
    setSelectedGuest(guest);
    setInviteMethod(guest.email ? 'email' : 'sms');
    setInvitePreview(null);
    setShowInviteModal(true);

    try {
      const preview = await guestsApi.getInvitePreview(
        eventId,
        guest.id,
        guest.email ? 'email' : 'sms',
      );
      setInvitePreview({ subject: preview.subject, content: preview.content });
    } catch (err) {
      console.error('获取预览失败:', err);
    }
  };

  const handleInviteMethodChange = async (method: 'email' | 'sms') => {
    if (!eventId || !selectedGuest) return;
    setInviteMethod(method);
    setInvitePreview(null);
    try {
      const preview = await guestsApi.getInvitePreview(eventId, selectedGuest.id, method);
      setInvitePreview({ subject: preview.subject, content: preview.content });
    } catch (err) {
      alert(err instanceof Error ? err.message : '获取预览失败');
    }
  };

  const handleSendInvite = async () => {
    if (!eventId || !selectedGuest) return;
    try {
      const result = await guestsApi.sendInvite(eventId, selectedGuest.id, inviteMethod);
      alert(result.message);
      setShowInviteModal(false);
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '发送失败');
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !eventId) return;

    setImportFile(file);
    setImportPreview(null);

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string)?.split(',')[1];
        if (base64) {
          try {
            const result = await guestsApi.validateImport(eventId, base64);
            setImportPreview(result);
          } catch (err) {
            alert(err instanceof Error ? err.message : '文件解析失败');
          }
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      alert('文件读取失败');
    }
  };

  const handleImport = async (skipDuplicates: boolean) => {
    if (!eventId || !importFile) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string)?.split(',')[1];
        if (base64) {
          try {
            const result = await guestsApi.importGuests(eventId, base64, skipDuplicates);
            alert(
              `导入完成！共导入 ${result.imported} 位嘉宾，跳过 ${result.duplicates} 条重复`,
            );
            setShowImportModal(false);
            setImportFile(null);
            setImportPreview(null);
            loadData();
          } catch (err) {
            alert(err instanceof Error ? err.message : '导入失败');
          }
        }
      };
      reader.readAsDataURL(importFile);
    } catch (err) {
      alert('文件读取失败');
    }
  };

  const toggleGuestSelection = (guestId: string) => {
    setSelectedGuests((prev) => {
      const next = new Set(prev);
      if (next.has(guestId)) {
        next.delete(guestId);
      } else {
        next.add(guestId);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedGuests.size === filteredGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(filteredGuests.map((g) => g.id)));
    }
  };

  const handleBulkInvite = async () => {
    if (!eventId || selectedGuests.size === 0) return;

    try {
      const result = await guestsApi.bulkInvite(
        eventId,
        bulkInviteMethod,
        Array.from(selectedGuests),
      );
      alert(
        `批量发送完成！成功 ${result.successCount} 条，失败 ${result.failedCount} 条`,
      );
      setShowBulkInviteModal(false);
      setSelectedGuests(new Set());
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

  const getCheckInStatusStyle = (status: string) => {
    if (status === 'checked_in') {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-gray-100 text-gray-600';
  };

  const getCheckInStatusLabel = (status: string) => {
    return status === 'checked_in' ? '已签到' : '未签到';
  };

  const getZoneName = (zoneId?: string) => {
    if (!zoneId) return '';
    if (zoneId === 'zone-vip-001') return 'VIP区';
    if (zoneId === 'zone-media-001') return '媒体区';
    return '普通区';
  };

  const downloadTemplate = () => {
    const template = [
      { 姓名: '张三', 公司: '某某科技有限公司', 职位: 'CEO', 手机: '13800138000', 邮箱: 'zhangsan@example.com' },
      { 姓名: '李四', 公司: '某某传媒集团', 职位: '总编辑', 手机: '13900139000', 邮箱: 'lisi@example.com' },
    ];
    const worksheet = XLSX.utils.json_to_sheet(template);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '嘉宾名单');
    XLSX.writeFile(workbook, '嘉宾导入模板.xlsx');
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="text-center py-20 text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">嘉宾管理</h1>
          <p className="text-gray-500 mt-1">{event?.name || '活动'}</p>
        </div>
        <div className="flex items-center gap-3">
          {selectedGuests.size > 0 && (
            <button
              onClick={() => setShowBulkInviteModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-gold-500 hover:bg-gold-600 text-white rounded-xl transition-all hover:shadow-lg"
            >
              <Send size={18} />
              <span>批量发送邀请 ({selectedGuests.size})</span>
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl transition-all"
          >
            <Upload size={18} />
            <span>批量导入</span>
          </button>
          <button
            onClick={() => {
              setEditingGuest(null);
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all hover:shadow-lg"
          >
            <Plus size={18} />
            <span>添加嘉宾</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={toggleSelectAll}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
            >
              {selectedGuests.size === filteredGuests.length && filteredGuests.length > 0 ? (
                <CheckSquare size={18} className="text-primary-600" />
              ) : (
                <Square size={18} />
              )}
              <span>全选</span>
            </button>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索嘉宾姓名或公司..."
                className="w-full pl-12 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:bg-white transition-all"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-4 text-sm font-medium text-gray-500 w-10"></th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                  嘉宾信息
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                  联系方式
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                  签到状态
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                  邀请状态
                </th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-500">
                  座位信息
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    暂无嘉宾数据
                  </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedGuests.has(guest.id) ? 'bg-primary-50/50' : ''
                    }`}
                  >
                    <td className="px-4 py-4">
                      <button
                        onClick={() => toggleGuestSelection(guest.id)}
                        className="text-gray-400 hover:text-primary-600"
                      >
                        {selectedGuests.has(guest.id) ? (
                          <CheckSquare size={18} className="text-primary-600" />
                        ) : (
                          <Square size={18} />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-medium text-sm">
                            {guest.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{guest.name}</p>
                          <p className="text-sm text-gray-500 flex items-center gap-1">
                            <Building size={12} />
                            {guest.company || '-'}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-gray-400" />
                          <span>{guest.phone || '-'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-gray-400" />
                          <span>{guest.email || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getCheckInStatusStyle(
                          guest.checkInStatus,
                        )}`}
                      >
                        {getCheckInStatusLabel(guest.checkInStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getInviteStatusStyle(
                          guest.inviteStatus,
                        )}`}
                      >
                        {getInviteStatusLabel(guest.inviteStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {guest.seatZoneId ? (
                        <span className="text-gray-700">
                          {getZoneName(guest.seatZoneId)}
                          {guest.seatNumber ? ` - ${guest.seatNumber}号` : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400">未分配</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() =>
                            navigate(`/events/${eventId}/guests/${guest.id}`)
                          }
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                          title="查看详情"
                        >
                          <QrCode size={18} />
                        </button>
                        <button
                          onClick={() => handleOpenInvite(guest)}
                          className="p-2 text-gray-500 hover:text-gold-600 hover:bg-gold-50 rounded-lg transition-all"
                          title="发送邀请"
                        >
                          <Send size={18} />
                        </button>
                        <button
                          onClick={() => handleEdit(guest)}
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                          title="编辑"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(guest.id)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                          title="删除"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
          <span>共 {filteredGuests.length} 位嘉宾</span>
          <span>
            已签到 {guests.filter((g) => g.checkInStatus === 'checked_in').length} 人
          </span>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-gray-900">
                {editingGuest ? '编辑嘉宾' : '添加嘉宾'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  姓名 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    公司
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) =>
                      setFormData({ ...formData, company: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    职位
                  </label>
                  <input
                    type="text"
                    value={formData.position}
                    onChange={(e) =>
                      setFormData({ ...formData, position: e.target.value })
                    }
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  手机号
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  邮箱
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 px-4 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all"
                >
                  {editingGuest ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showInviteModal && selectedGuest && (
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

              {invitePreview && (
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
              )}

              {!selectedGuest.email && inviteMethod === 'email' && (
                <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">
                    该嘉宾未填写邮箱，请使用短信发送或先补充邮箱信息
                  </p>
                </div>
              )}

              {!selectedGuest.phone && inviteMethod === 'sms' && (
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
                    (inviteMethod === 'email' && !selectedGuest.email) ||
                    (inviteMethod === 'sms' && !selectedGuest.phone)
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

      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-gray-900">批量导入嘉宾</h2>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportFile(null);
                  setImportPreview(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              {!importFile ? (
                <div className="text-center py-12">
                  <div className="w-24 h-24 mx-auto mb-6 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-200 flex items-center justify-center">
                    <Upload className="w-10 h-10 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">上传Excel文件</h3>
                  <p className="text-sm text-gray-500 mb-6">
                    支持 .xlsx、.xls 格式，需包含姓名、公司、职位、手机、邮箱列
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <button
                      onClick={downloadTemplate}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-primary-600 hover:text-primary-700"
                    >
                      <Download size={16} />
                      下载模板
                    </button>
                    <label className="cursor-pointer px-6 py-2.5 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all">
                      <span>选择文件</span>
                      <input
                        type="file"
                        accept=".xlsx,.xls"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              ) : importPreview ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-4 gap-4">
                    <div className="p-4 bg-gray-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-gray-900">{importPreview.total}</p>
                      <p className="text-sm text-gray-500">总计</p>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-green-600">{importPreview.valid}</p>
                      <p className="text-sm text-green-600">有效</p>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-red-600">{importPreview.invalid}</p>
                      <p className="text-sm text-red-600">无效</p>
                    </div>
                    <div className="p-4 bg-yellow-50 rounded-xl text-center">
                      <p className="text-2xl font-bold text-yellow-600">
                        {importPreview.duplicates}
                      </p>
                      <p className="text-sm text-yellow-600">重复</p>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-700">数据预览</p>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="text-left px-4 py-2 text-gray-500 font-medium">行号</th>
                            <th className="text-left px-4 py-2 text-gray-500 font-medium">姓名</th>
                            <th className="text-left px-4 py-2 text-gray-500 font-medium">公司</th>
                            <th className="text-left px-4 py-2 text-gray-500 font-medium">手机</th>
                            <th className="text-left px-4 py-2 text-gray-500 font-medium">邮箱</th>
                            <th className="text-left px-4 py-2 text-gray-500 font-medium">状态</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {importPreview.rows.slice(0, 20).map((row) => (
                            <tr key={row.rowIndex} className={!row.valid ? 'bg-red-50' : ''}>
                              <td className="px-4 py-2 text-gray-500">{row.rowIndex}</td>
                              <td className="px-4 py-2 text-gray-900">{row.name || '-'}</td>
                              <td className="px-4 py-2 text-gray-600">{row.company || '-'}</td>
                              <td className="px-4 py-2 text-gray-600">{row.phone || '-'}</td>
                              <td className="px-4 py-2 text-gray-600">{row.email || '-'}</td>
                              <td className="px-4 py-2">
                                {row.valid ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle size={14} />
                                    <span className="text-xs">有效</span>
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-red-600">
                                    <AlertCircle size={14} />
                                    <span className="text-xs">{row.errors.join('、')}</span>
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {importPreview.rows.length > 20 && (
                        <div className="px-4 py-2 text-center text-sm text-gray-500 bg-gray-50">
                          仅显示前20条，共 {importPreview.rows.length} 条数据
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p>正在解析文件...</p>
                </div>
              )}
            </div>
            {importFile && importPreview && (
              <div className="p-6 border-t border-gray-100 flex gap-3">
                <button
                  onClick={() => {
                    setImportFile(null);
                    setImportPreview(null);
                  }}
                  className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                >
                  重新选择
                </button>
                <button
                  onClick={() => handleImport(false)}
                  className="px-6 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl transition-all"
                >
                  全部导入（含重复）
                </button>
                <button
                  onClick={() => handleImport(true)}
                  className="px-6 py-2.5 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all"
                >
                  跳过重复导入
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {showBulkInviteModal && selectedGuests.size > 0 && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-gray-900">批量发送邀请</h2>
              <button
                onClick={() => setShowBulkInviteModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <p className="text-gray-600">
                已选择 <span className="font-bold text-primary-600">{selectedGuests.size}</span> 位嘉宾，请选择发送方式
              </p>

              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setBulkInviteMethod('email')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    bulkInviteMethod === 'email'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <MailIcon size={20} />
                  <span className="font-medium">邮件</span>
                </button>
                <button
                  type="button"
                  onClick={() => setBulkInviteMethod('sms')}
                  className={`flex items-center justify-center gap-2 p-4 rounded-xl border-2 transition-all ${
                    bulkInviteMethod === 'sms'
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <MessageSquare size={20} />
                  <span className="font-medium">短信</span>
                </button>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowBulkInviteModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleBulkInvite}
                  className="flex-1 py-2.5 px-4 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all"
                >
                  确认发送
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
