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
  Grid3X3,
  List,
  Grip,
  Move,
} from 'lucide-react';
import { seatsApi, guestsApi, eventsApi } from '@/api';
import type { SeatZone, Guest, Event } from '@shared/types';
import { getZoneName } from '@/lib/utils';

type SeatZoneWithStats = SeatZone & { assignedCount: number; checkedInCount: number };
type ViewMode = 'list' | 'chart';
type DragState = {
  isDragging: boolean;
  guestId: string | null;
};

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
  const [viewMode, setViewMode] = useState<ViewMode>('chart');
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, guestId: null });

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

  const handleDropSeat = async (zoneId: string, seatNumber: number) => {
    if (!eventId || !dragState.guestId) return;

    const existingGuest = getZoneGuests(zoneId).find(
      (g) => parseInt(g.seatNumber || '0') === seatNumber,
    );

    if (existingGuest) {
      alert('该座位已被占用');
      setDragState({ isDragging: false, guestId: null });
      return;
    }

    try {
      await guestsApi.updateSeat(
        eventId,
        dragState.guestId,
        zoneId,
        seatNumber.toString(),
      );
      loadData();
    } catch (err) {
      alert('分配失败');
    } finally {
      setDragState({ isDragging: false, guestId: null });
    }
  };

  const handleQuickAssign = async (zoneId: string, seatNumber: number) => {
    if (!eventId) return;

    const guestToAssign = unassignedGuests[0];
    if (!guestToAssign) {
      alert('没有未分配座位的嘉宾');
      return;
    }

    const existingGuest = getZoneGuests(zoneId).find(
      (g) => parseInt(g.seatNumber || '0') === seatNumber,
    );

    if (existingGuest) {
      alert('该座位已被占用');
      return;
    }

    try {
      await guestsApi.updateSeat(
        eventId,
        guestToAssign.id,
        zoneId,
        seatNumber.toString(),
      );
      loadData();
    } catch (err) {
      alert('分配失败');
    }
  };

  const handleDragStart = (guestId: string) => {
    setDragState({ isDragging: true, guestId });
  };

  const handleDragEnd = () => {
    setDragState({ isDragging: false, guestId: null });
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

  const generateSeatChart = (zone: SeatZoneWithStats) => {
    const zoneGuests = getZoneGuests(zone.id);
    const guestMap = new Map<number, Guest>();
    zoneGuests.forEach((g) => {
      const num = parseInt(g.seatNumber || '0');
      if (num > 0) guestMap.set(num, g);
    });

    const seatsPerRow = Math.ceil(Math.sqrt(zone.capacity));
    const totalRows = Math.ceil(zone.capacity / seatsPerRow);
    const seats: JSX.Element[] = [];

    for (let row = 0; row < totalRows; row++) {
      const rowSeats: JSX.Element[] = [];
      for (let col = 0; col < seatsPerRow; col++) {
        const seatNumber = row * seatsPerRow + col + 1;
        if (seatNumber > zone.capacity) break;

        const guest = guestMap.get(seatNumber);
        const isOccupied = !!guest;

        rowSeats.push(
          <div
            key={seatNumber}
            draggable={!isOccupied && dragState.isDragging}
            onDragOver={(e) => {
              if (!isOccupied) e.preventDefault();
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (!isOccupied && dragState.guestId) {
                handleDropSeat(zone.id, seatNumber);
              }
            }}
            onClick={() => {
              if (isOccupied) {
                handleOpenEditSeat(guest);
              } else {
                handleQuickAssign(zone.id, seatNumber);
              }
            }}
            className={`
              w-12 h-12 rounded-lg flex items-center justify-center text-xs font-medium
              transition-all cursor-pointer relative group
              ${isOccupied
                ? guest.checkInStatus === 'checked_in'
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-primary-500 text-white shadow-md hover:shadow-lg'
                : 'bg-gray-100 text-gray-400 border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50'
              }
              ${dragState.isDragging && !isOccupied ? 'ring-2 ring-primary-400 bg-primary-100' : ''}
            `}
            title={isOccupied ? `${guest.name} - ${guest.company || '无公司'}${guest.seatNumber ? ' - ' + guest.seatNumber + '号' : ''}` : `空座 - ${seatNumber}号（点击或拖拽分配）`}
          >
            {isOccupied ? (
              <span className="text-center leading-tight">
                {guest.name.substring(0, 2)}
              </span>
            ) : (
              <span>{seatNumber}</span>
            )}
            {isOccupied && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemoveSeat(guest.id);
                }}
                className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px]"
              >
                ×
              </button>
            )}
          </div>,
        );
      }
      seats.push(
        <div key={`row-${row}`} className="flex justify-center gap-1">
          {rowSeats}
        </div>,
      );
    }

    return seats;
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
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('chart')}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-all ${
                viewMode === 'chart'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Grid3X3 size={16} />
              座位图
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-1.5 rounded-md text-sm flex items-center gap-1.5 transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-primary-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <List size={16} />
              列表
            </button>
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

      {unassignedGuests.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-gray-400" />
              <h3 className="font-medium text-gray-900">
                未分配座位的嘉宾 <span className="text-gray-500 font-normal">({unassignedGuests.length}人)</span>
              </h3>
            </div>
            <p className="text-xs text-gray-500 flex items-center gap-1">
              <Move size={14} />
              拖拽嘉宾卡片到座位上进行分配
            </p>
          </div>
          <div className="p-4">
            <div className="flex flex-wrap gap-2">
              {unassignedGuests.map((guest) => (
                <div
                  key={guest.id}
                  draggable
                  onDragStart={() => handleDragStart(guest.id)}
                  onDragEnd={handleDragEnd}
                  className={`
                    flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg
                    border border-gray-200 cursor-grab active:cursor-grabbing
                    hover:border-primary-400 hover:bg-primary-50 transition-all
                    ${dragState.guestId === guest.id ? 'opacity-50' : ''}
                  `}
                >
                  <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium text-xs">
                      {guest.name.charAt(0)}
                    </span>
                  </div>
                  <span className="text-sm text-gray-700">{guest.name}</span>
                  <span className="text-xs text-gray-400">
                    {guest.company}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {selectedZone && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-serif font-bold text-gray-900">
                {getZoneName(selectedZone, zones) || '区域'}
                {viewMode === 'chart' ? ' - 座位图' : ' - 嘉宾列表'}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                共 {getZoneGuests(selectedZone).length} 位嘉宾，{zones.find((z) => z.id === selectedZone)?.capacity || 0} 个座位
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

          {viewMode === 'chart' && (
            <div className="p-6">
              <div className="flex items-center justify-center gap-8 mb-6">
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-6 h-6 rounded bg-gray-100 border-2 border-dashed border-gray-300"></div>
                  <span>空座</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-6 h-6 rounded bg-primary-500"></div>
                  <span>已分配（未签到）</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <div className="w-6 h-6 rounded bg-green-500"></div>
                  <span>已签到</span>
                </div>
              </div>
              <div className="text-center mb-4">
                <div className="inline-block px-8 py-2 bg-gray-100 rounded-full text-xs text-gray-500">
                  舞 台
                </div>
              </div>
              <div className="space-y-1.5 overflow-x-auto pb-4">
                {generateSeatChart(zones.find((z) => z.id === selectedZone)!)}
              </div>
            </div>
          )}

          {viewMode === 'list' && (
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
          )}
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
                  placeholder="例如：VIP区、媒体区、A区"
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

      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-gray-900">批量分配座位</h2>
              <button
                onClick={() => setShowAssignModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  起始座位号
                </label>
                <input
                  type="number"
                  value={startSeatNumber}
                  onChange={(e) => setStartSeatNumber(Number(e.target.value))}
                  min={1}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  将从 {startSeatNumber} 号开始，按顺序为选中的嘉宾分配座位号
                </p>
              </div>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-700">
                    选择嘉宾
                  </label>
                  <button
                    onClick={toggleSelectAll}
                    className="text-sm text-primary-600 hover:text-primary-700"
                  >
                    {selectedGuests.size === unassignedGuests.length ? '取消全选' : '全选'}
                  </button>
                </div>
                <div className="border border-gray-200 rounded-xl max-h-64 overflow-y-auto">
                  {unassignedGuests.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                      所有嘉宾都已分配座位
                    </div>
                  ) : (
                    unassignedGuests.map((guest) => (
                      <div
                        key={guest.id}
                        onClick={() => toggleGuestSelection(guest.id)}
                        className={`flex items-center gap-3 p-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                          selectedGuests.has(guest.id) ? 'bg-primary-50' : ''
                        }`}
                      >
                        {selectedGuests.has(guest.id) ? (
                          <CheckSquare size={18} className="text-primary-600" />
                        ) : (
                          <Square size={18} className="text-gray-300" />
                        )}
                        <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                          <span className="text-primary-700 font-medium text-xs">
                            {guest.name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900 text-sm">{guest.name}</p>
                          <p className="text-xs text-gray-500">{guest.company || '-'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2.5 px-4 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-all"
              >
                取消
              </button>
              <button
                onClick={handleBulkAssign}
                disabled={selectedGuests.size === 0}
                className="flex-1 py-2.5 px-4 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                分配座位 ({selectedGuests.size} 人)
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditSeatModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-xl font-serif font-bold text-gray-900">编辑座位号</h2>
              <button
                onClick={() => setShowEditSeatModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {editingGuest && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center">
                    <span className="text-primary-700 font-medium text-sm">
                      {editingGuest.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{editingGuest.name}</p>
                    <p className="text-xs text-gray-500">{editingGuest.company || '-'}</p>
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  座位号
                </label>
                <input
                  type="text"
                  value={editSeatNumber}
                  onChange={(e) => setEditSeatNumber(e.target.value)}
                  placeholder="例如：A01、VIP-05、12"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
                <p className="text-xs text-gray-500 mt-1">
                  支持自定义格式，如 A01、VIP-05、12 等
                </p>
              </div>
              <div className="flex gap-3 pt-4">
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
