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
} from 'lucide-react';
import { guestsApi, eventsApi } from '@/api';
import type { Guest, Event } from '@shared/types';

export default function GuestManagement() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [event, setEvent] = useState<Event | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);

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

  const getStatusStyle = (status: string) => {
    if (status === 'checked_in') {
      return 'bg-green-100 text-green-700';
    }
    return 'bg-gray-100 text-gray-600';
  };

  const getStatusLabel = (status: string) => {
    return status === 'checked_in' ? '已签到' : '未签到';
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
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-gray-900">嘉宾管理</h1>
        <p className="text-gray-500 mt-1">{event?.name || '活动'}</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
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

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
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
                  座位区域
                </th>
                <th className="text-right px-6 py-4 text-sm font-medium text-gray-500">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredGuests.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  <User className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  暂无嘉宾数据
                </td>
                </tr>
              ) : (
                filteredGuests.map((guest) => (
                  <tr
                    key={guest.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
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
                        className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusStyle(
                          guest.checkInStatus,
                        )}`}
                      >
                        {getStatusLabel(guest.checkInStatus)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {guest.seatZoneId ? (
                        <span className="text-gray-700">
                          {guest.seatZoneId === 'zone-vip-001'
                            ? 'VIP区'
                            : guest.seatZoneId === 'zone-media-001'
                            ? '媒体区'
                            : '普通区'}
                          {guest.seatNumber ? ` - ${guest.seatNumber}号` : ''}
                        </span>
                      ) : (
                          <span className="text-gray-400">未分配</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() =>
                            navigate(`/events/${eventId}/guests/${guest.id}`)
                          }
                          className="p-2 text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                          title="查看二维码"
                        >
                          <QrCode size={18} />
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
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, position: e.target.value })}
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
    </div>
  );
}
