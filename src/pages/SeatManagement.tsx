import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Users,
  UserCheck,
  LayoutGrid,
  X,
  CheckSquare,
  Square,
  Hash,
  UserPlus,
} from 'lucide-react';
import { seatsApi, guestsApi, eventsApi } from '@/api';
import type { SeatZone, Guest, Event } from '@shared/types';

type SeatZoneWithStats = SeatZone & { assignedCount: number; checkedInCount: number };

export default function SeatManagement() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [zones, setZones] = useState<SeatZoneWithStats[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [unassignedGuests, setUnassignedGuests] = useState<Guest[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<SeatZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedGuests, setSelectedGuests] = useState<Set<string>>(new Set());
  const [startSeatNumber, setStartSeatNumber] = useState(1);
  const [showEditSeatModal, setShowEditSeatModal] = useState(false);
  const [editingGuest, setEditingGuest] = useState<Guest | null>(null);
  const [editSeatNumber, setEditSeatNumber] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    type: 'custom' as SeatZone['type'],
    capacity: 50,
    color: '#6b7280',
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
      const [eventData, zonesData, guestsData] = await Promise.all([
        eventsApi.getById(eventId),
        seatsApi.getZones(eventId),
        guestsApi.getByEvent(eventId),
      ]);
      setEvent(eventData);
      setZones(zonesData as SeatZoneWithStats[]);
      setGuests(guestsData);
      setUnassignedGuests(guestsData.filter((g) => !g.seatZoneId));
    } catch (err) {
      console.error('加载数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventId) return;

    try {
      if (editingZone) {
        await seatsApi.updateZone(eventId, editingZone.id, formData);
      } else {
        await seatsApi.createZone(eventId, formData);
      }
      setShowModal(false);
      setEditingZone(null);
      resetForm();
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleEdit = (zone: SeatZone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      type: zone.type,
      capacity: zone.capacity,
      color: zone.color,
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!eventId || !confirm('确定要删除这个座位区域吗？删除后该区域的嘉宾座位将被清空。'))
      return;
    try {
      await seatsApi.deleteZone(eventId, id);
      loadData();
      if (selectedZone === id) setSelectedZone(null);
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleBulkAssign = async () => {
    if (!eventId || !selectedZone || selectedGuests.size === 0) return;
    try {
      const result = await seatsApi.bulkAssignSeats(
        eventId,
        selectedZone,
        Array.from(selectedGuests),
        startSeatNumber,
      );
      alert(`成功分配 ${result.assignedCount} 个座位`);
      setShowAssignModal(false);
      setSelectedGuests(new Set());
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '分配失败');
    }
  };

  const handleRemoveSeat = async (guestId: string) => {
    if (!eventId) return;
    try {
      await guestsApi.updateSeat(eventId, guestId, undefined, undefined);
      loadData();
    } catch (err) {
      alert('移除失败');
    }
  };

  const handleOpenEditSeat = (guest: Guest) => {
    setEditingGuest(guest);
    setEditSeatNumber(guest.seatNumber || '');
    setShowEditSeatModal(true);
  };

  const handleSaveSeatNumber = async () => {
    if (!eventId || !editingGuest) return;
    try {
      await guestsApi.updateSeat(
        eventId,
        editingGuest.id,
        editingGuest.seatZoneId,
        editSeatNumber || undefined,
      );
      setShowEditSeatModal(false);
      setEditingGuest(null);
      loadData();
    } catch (err) {
      alert('保存失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'custom',
      capacity: 50,
      color: '#6b7280',
    });
  };

  const getZoneGuests = (zoneId: string) => {
    return guests.filter((g) => g.seatZoneId === zoneId).sort((a, b) => {
      const numA = parseInt(a.seatNumber || '0');
      const numB = parseInt(b.seatNumber || '0');
      return numA - numB;
    });
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
    if (selectedGuests.size === unassignedGuests.length) {
      setSelectedGuests(new Set());
    } else {
      setSelectedGuests(new Set(unassignedGuests.map((g) => g.id)));
    }
  };

  const typeColors: Record<string, string> = {
    vip: '#d4af37',
    media: '#3b82f6',
    general: '#6b7280',
    custom: '#6b7280',
  };

  const getZoneName = (zoneId?: string) => {
    if (!zoneId) return '';
    return zones.find((z) => z.id === zoneId)?.name || '';
  };

  const getNextSeatNumber = () => {
    if (!selectedZone) return 1;
    const zoneGuests = getZoneGuests(selectedZone);
    if (zoneGuests.length === 0) return 1;
    const maxNum = Math.max(
      ...zoneGuests.map((g) => parseInt(g.seatNumber || '0')),
    );
    return maxNum + 1;
  };

  const openAssignModal = () => {
    setSelectedGuests(new Set());
    setStartSeatNumber(getNextSeatNumber());
    setShowAssignModal(true);
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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-serif font-bold text-gray-900">座位安排</h1>
          <p className="text-gray-500 mt-1">{event?.name || '活动'}</p>
        </div>
        <button
          onClick={() => {
            setEditingZone(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all hover:shadow-lg"
        >
          <Plus size={18} />
          <span>添加区域</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {zones.map((zone) => {
          const zoneGuests = getZoneGuests(zone.id);
          const usagePercent = zone.capacity > 0 ? (zoneGuests.length / zone.capacity) * 100 : 0;
          return (
            <div
              key={zone.id}
              className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden cursor-pointer transition-all hover:shadow-card ${
                selectedZone === zone.id ? 'ring-2 ring-primary-500' : ''
              }`}
              onClick={() => setSelectedZone(zone.id === selectedZone ? null : zone.id)}
            >
              <div
                className="h-3"
                style={{ backgroundColor: zone.color || typeColors[zone.type] }}
              ></div>
              <div className="p-5">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="font-bold text-gray-900">{zone.name}</h3>
                    <p className="text-sm text-gray-500">容量：{zone.capacity} 座</p>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEdit(zone);
                      }}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(zone.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-4 mb-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Users size={16} className="text-gray-400" />
                    <span>{zoneGuests.length} 人已分配</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <UserCheck size={16} className="text-green-500" />
                    <span>
                      {zoneGuests.filter((g) => g.checkInStatus === 'checked_in').length} 人已签到
                    </span>
                  </div>
                </div>

                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${Math.min(usagePercent, 100)}%`,
                      backgroundColor: zone.color || typeColors[zone.type],
                    }}
                  ></div>
                </div>
              </div>
            </div>
          );
        })}

        {zones.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-2xl border border-gray-100">
            <LayoutGrid className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">暂无座位区域，点击上方按钮添加</p>
          </div>
        )}
      </div>

      {selectedZone && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">
                {zones.find((z) => z.id === selectedZone)?.name || '区域'} - 嘉宾列表
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                共 {getZoneGuests(selectedZone).length} 位嘉宾
              </p>
            </div>
            <button
              onClick={openAssignModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary-100 hover:bg-primary-200 text-primary-700 rounded-xl transition-all text-sm font-medium"
            >
              <UserPlus size={16} />
              批量分配
            </button>
          </div>

          <div className="p-6">
            {getZoneGuests(selectedZone).length === 0 ? (
              <div className="text-center py-12">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">该区域暂无嘉宾</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getZoneGuests(selectedZone).map((guest) => (
                  <div
                    key={guest.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl group"
                  >
                    <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 font-medium text-sm">
                        {guest.name.charAt(0)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {guest.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{guest.company}</p>
                    </div>
                    <button
                      onClick={() => handleOpenEditSeat(guest)}
                      className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-primary-600 hover:bg-primary-50 rounded transition-all"
                      title="编辑座位号"
                    >
                      <Hash size={14} />
                      <span>{guest.seatNumber || '无座号'}</span>
                    </button>
                    <button
                      onClick={() => handleRemoveSeat(guest.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                      title="移除"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-gray-900">
                {editingZone ? '编辑区域' : '添加座位区域'}
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
                  区域名称 *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  区域类型
                </label>
                <select
                  value={formData.type}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      type: e.target.value as SeatZone['type'],
                      color: typeColors[e.target.value] || formData.color,
                    })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="vip">VIP区</option>
                  <option value="media">媒体区</option>
                  <option value="general">普通区</option>
                  <option value="custom">自定义</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  座位容量 *
                </label>
                <input
                  type="number"
                  value={formData.capacity}
                  onChange={(e) =>
                    setFormData({ ...formData, capacity: Number(e.target.value) })
                  }
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                  min={1}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  标识颜色
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-12 h-10 rounded-lg border border-gray-200 cursor-pointer"
                  />
                  <span className="text-sm text-gray-500">{formData.color}</span>
                </div>
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
                  {editingZone ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showAssignModal && selectedZone && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-gray-900">批量分配座位</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {getZoneName(selectedZone)} - 选择嘉宾并分配座位
                </p>
              </div>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-600">起始座位号：</label>
                  <input
                    type="number"
                    value={startSeatNumber}
                    onChange={(e) => setStartSeatNumber(Number(e.target.value))}
                    min={1}
                    className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div className="flex-1" />
                <button
                  onClick={toggleSelectAll}
                  className="flex items-center gap-2 text-sm text-gray-600 hover:text-primary-600"
                >
                  {selectedGuests.size === unassignedGuests.length &&
                  unassignedGuests.length > 0 ? (
                    <CheckSquare size={18} className="text-primary-600" />
                  ) : (
                    <Square size={18} />
                  )}
                  <span>全选</span>
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {unassignedGuests.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  所有嘉宾都已分配座位
                </div>
              ) : (
                <div className="space-y-2">
                  {unassignedGuests.map((guest) => (
                    <button
                      key={guest.id}
                      onClick={() => toggleGuestSelection(guest.id)}
                      className={`w-full flex items-center gap-3 p-3 rounded-xl transition-colors text-left ${
                        selectedGuests.has(guest.id)
                          ? 'bg-primary-50 border-2 border-primary-500'
                          : 'bg-gray-50 border-2 border-transparent hover:bg-gray-100'
                      }`}
                    >
                      {selectedGuests.has(guest.id) ? (
                        <CheckSquare size={18} className="text-primary-600 flex-shrink-0" />
                      ) : (
                        <Square size={18} className="text-gray-400 flex-shrink-0" />
                      )}
                      <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-primary-700 font-medium text-sm">
                          {guest.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {guest.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{guest.company}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={selectedGuests.size === 0}
                className="flex-1 py-2.5 px-4 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认分配 ({selectedGuests.size} 人)
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditSeatModal && editingGuest && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-serif font-bold text-gray-900">编辑座位号</h2>
              <button
                onClick={() => setShowEditSeatModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <span className="text-primary-700 font-bold">
                    {editingGuest.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">{editingGuest.name}</p>
                  <p className="text-sm text-gray-500">{editingGuest.company}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  座位号
                </label>
                <input
                  type="text"
                  value={editSeatNumber}
                  onChange={(e) => setEditSeatNumber(e.target.value)}
                  placeholder="如：A01、12、VIP-05"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-2">留空则不显示座位号</p>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowEditSeatModal(false)}
                  className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
                >
                  取消
                </button>
                <button
                  onClick={handleSaveSeatNumber}
                  className="flex-1 py-2.5 px-4 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
