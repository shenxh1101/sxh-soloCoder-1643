import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  MapPin,
  Clock,
  Users,
  X,
} from 'lucide-react';
import { forumsApi, guestsApi, eventsApi } from '@/api';
import type { Forum, Guest, Event } from '@shared/types';

export default function ForumManagement() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [forums, setForums] = useState<Forum[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingForum, setEditingForum] = useState<Forum | null>(null);
  const [selectedForum, setSelectedForum] = useState<string | null>(null);
  const [showGuestModal, setShowGuestModal] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    location: '',
    startTime: '',
    endTime: '',
    description: '',
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
      const [eventData, forumsData, guestsData] = await Promise.all([
        eventsApi.getById(eventId),
        forumsApi.getByEvent(eventId),
        guestsApi.getByEvent(eventId),
      ]);
      setEvent(eventData);
      setForums(forumsData);
      setGuests(guestsData);
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
      if (editingForum) {
        await forumsApi.update(eventId, editingForum.id, formData);
      } else {
        await forumsApi.create(eventId, formData);
      }
      setShowModal(false);
      setEditingForum(null);
      resetForm();
      loadData();
    } catch (err) {
      alert(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handleEdit = (forum: Forum) => {
    setEditingForum(forum);
    setFormData({
      name: forum.name,
      location: forum.location,
      startTime: forum.startTime ? forum.startTime.slice(0, 16) : '',
      endTime: forum.endTime ? forum.endTime.slice(0, 16) : '',
      description: forum.description || '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!eventId || !confirm('确定要删除这个分论坛吗？')) return;
    try {
      await forumsApi.delete(eventId, id);
      loadData();
    } catch (err) {
      alert('删除失败');
    }
  };

  const handleAddGuest = async (guestId: string) => {
    if (!eventId || !selectedForum) return;
    try {
      await forumsApi.addGuests(eventId, selectedForum, [guestId]);
      loadData();
    } catch (err) {
      alert('添加失败');
    }
  };

  const handleRemoveGuest = async (guestId: string) => {
    if (!eventId || !selectedForum) return;
    try {
      await forumsApi.removeGuest(eventId, selectedForum, guestId);
      loadData();
    } catch (err) {
      alert('移除失败');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      location: '',
      startTime: '',
      endTime: '',
      description: '',
    });
  };

  const getForumGuests = (forumId: string) => {
    const forum = forums.find((f) => f.id === forumId);
    if (!forum) return [];
    return guests.filter((g) => forum.guestIds.includes(g.id));
  };

  const getAvailableGuests = () => {
    const forum = forums.find((f) => f.id === selectedForum);
    if (!forum) return guests;
    return guests.filter((g) => !forum.guestIds.includes(g.id));
  };

  const formatTime = (timeStr: string) => {
    if (!timeStr) return '-';
    const date = new Date(timeStr);
    return date.toLocaleString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
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
          <h1 className="text-2xl font-serif font-bold text-gray-900">分论坛管理</h1>
          <p className="text-gray-500 mt-1">{event?.name || '活动'}</p>
        </div>
        <button
          onClick={() => {
            setEditingForum(null);
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-5 py-2.5 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all hover:shadow-lg"
        >
          <Plus size={18} />
          <span>添加分论坛</span>
        </button>
      </div>

      {forums.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
          <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">暂无分论坛，点击上方按钮添加</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {forums.map((forum) => (
            <div
              key={forum.id}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-card transition-all"
            >
              <div className="p-6 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 text-lg">{forum.name}</h3>
                      <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <MapPin size={14} />
                          {forum.location || '待定'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users size={14} />
                          {forum.guestIds.length} 人
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEdit(forum)}
                      className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-all"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(forum.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                  <Clock size={14} />
                  <span>
                    {formatTime(forum.startTime)} - {formatTime(forum.endTime)}
                  </span>
                </div>

                {forum.description && (
                  <p className="mt-3 text-sm text-gray-600 line-clamp-2">
                    {forum.description}
                  </p>
                )}
              </div>

              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700">参与嘉宾</span>
                  <button
                    onClick={() => {
                      setSelectedForum(forum.id);
                      setShowGuestModal(true);
                    }}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    管理嘉宾
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {getForumGuests(forum.id).slice(0, 6).map((guest) => (
                    <div
                      key={guest.id}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-lg"
                    >
                      <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 text-xs font-medium">
                          {guest.name.charAt(0)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-700">{guest.name}</span>
                    </div>
                  ))}
                  {forum.guestIds.length > 6 && (
                    <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
                      <span className="text-sm text-gray-500">
                        +{forum.guestIds.length - 6} 更多
                      </span>
                    </div>
                  )}
                  {forum.guestIds.length === 0 && (
                    <span className="text-sm text-gray-400">暂无嘉宾</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg animate-fade-in">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-xl font-serif font-bold text-gray-900">
                {editingForum ? '编辑分论坛' : '添加分论坛'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分论坛名称 *
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
                  举办地点
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="如：会议厅A"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    开始时间
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    结束时间
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  分论坛描述
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
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
                  {editingForum ? '保存' : '添加'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showGuestModal && selectedForum && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-fade-in">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-serif font-bold text-gray-900">管理分论坛嘉宾</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {forums.find((f) => f.id === selectedForum)?.name}
                </p>
              </div>
              <button
                onClick={() => {
                  setShowGuestModal(false);
                  setSelectedForum(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3">已添加的嘉宾</p>
                <div className="flex flex-wrap gap-2">
                  {getForumGuests(selectedForum).length === 0 ? (
                    <span className="text-sm text-gray-400">暂无</span>
                  ) : (
                    getForumGuests(selectedForum).map((guest) => (
                      <div
                        key={guest.id}
                        className="flex items-center gap-2 px-3 py-1.5 bg-primary-50 rounded-lg"
                      >
                        <span className="text-sm text-primary-700">{guest.name}</span>
                        <button
                          onClick={() => handleRemoveGuest(guest.id)}
                          className="text-primary-400 hover:text-primary-600"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
              <div className="p-4">
                <p className="text-sm font-medium text-gray-700 mb-3">可添加的嘉宾</p>
                {getAvailableGuests().length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">所有嘉宾都已添加</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {getAvailableGuests().map((guest) => (
                      <div
                        key={guest.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                            <span className="text-gray-600 text-xs font-medium">
                              {guest.name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{guest.name}</p>
                            <p className="text-xs text-gray-500">{guest.company}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => handleAddGuest(guest.id)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all"
                        >
                          <Plus size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-gray-100">
              <button
                onClick={() => {
                  setShowGuestModal(false);
                  setSelectedForum(null);
                }}
                className="w-full py-2.5 px-4 bg-primary-700 hover:bg-primary-600 text-white rounded-xl transition-all"
              >
                完成
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
