import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  QrCode,
  User,
  CheckCircle,
  XCircle,
  Search,
  Clock,
  ScanLine,
} from 'lucide-react';
import { checkInsApi, guestsApi, eventsApi } from '@/api';
import type { Guest, Event } from '@shared/types';

export default function CheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [qrInput, setQrInput] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState<Guest[]>([]);
  const [result, setResult] = useState<{
    success: boolean;
    guest?: Guest;
    message: string;
  } | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<Guest[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;
    try {
      const data = await eventsApi.getById(eventId);
      setEvent(data);
    } catch (err) {
      console.error('加载活动失败:', err);
    }
  };

  const handleQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim() || !eventId) return;

    try {
      const response = await checkInsApi.checkIn(eventId, {
        qrCode: qrInput.trim(),
        method: 'qrcode',
      });
      setResult({
        success: true,
        guest: response.guest,
        message: response.message,
      });
      setRecentCheckIns((prev) => [response.guest, ...prev].slice(0, 5));
      setQrInput('');
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : '签到失败',
      });
    }

    setTimeout(() => setResult(null), 3000);
  };

  const handleSearch = (value: string) => {
    setSearchName(value);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    if (!value.trim()) {
      setSearchResults([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => {
      searchGuests(value);
    }, 300);
  };

  const searchGuests = async (name: string) => {
    if (!eventId) return;
    try {
      const allGuests = await guestsApi.getByEvent(eventId);
      const filtered = allGuests
        .filter((g) => g.name.toLowerCase().includes(name.toLowerCase()))
        .slice(0, 5);
      setSearchResults(filtered);
    } catch (err) {
      console.error('搜索失败:', err);
    }
  };

  const handleManualCheckIn = async (guest: Guest) => {
    if (!eventId) return;
    try {
      const response = await checkInsApi.checkIn(eventId, {
        guestId: guest.id,
        method: 'manual',
      });
      setResult({
        success: true,
        guest: response.guest,
        message: '签到成功',
      });
      setRecentCheckIns((prev) => [response.guest, ...prev].slice(0, 5));
      setSearchName('');
      setSearchResults([]);
      setShowSearch(false);
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : '签到失败',
      });
    }

    setTimeout(() => setResult(null), 3000);
  };

  const handleCameraScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setIsScanning(false);
      alert('摄像头扫码功能需要HTTPS环境，当前可手动输入二维码内容进行签到');
    }, 2000);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-serif font-bold text-gray-900">签到管理</h1>
        <p className="text-gray-500 mt-1">{event?.name || '活动'}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-serif font-bold text-gray-900">扫码签到</h2>
              <p className="text-sm text-gray-500 mt-1">扫描嘉宾邀请二维码完成签到</p>
            </div>

            <div className="p-6">
              <div
                className={`relative w-full max-w-sm mx-auto aspect-square rounded-2xl border-2 border-dashed flex items-center justify-center transition-all ${
                  isScanning
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/50'
                }`}
              >
                {isScanning ? (
                  <div className="text-center">
                    <div className="relative w-48 h-48 mx-auto mb-4">
                      <div className="absolute inset-0 border-2 border-primary-500 rounded-lg"></div>
                      <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent animate-scan-line"></div>
                      <ScanLine className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 text-primary-500" />
                    </div>
                    <p className="text-primary-600 font-medium">正在扫描...</p>
                  </div>
                ) : (
                  <button
                    onClick={handleCameraScan}
                    className="text-center group"
                  >
                    <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white shadow-card flex items-center justify-center group-hover:shadow-card-hover transition-all">
                      <QrCode className="w-12 h-12 text-primary-600" />
                    </div>
                    <p className="text-gray-600 font-medium">点击开启摄像头扫码</p>
                    <p className="text-sm text-gray-400 mt-1">或手动输入二维码内容</p>
                  </button>
                )}
              </div>

              <form onSubmit={handleQrSubmit} className="mt-6 max-w-sm mx-auto">
                <div className="relative">
                  <input
                    type="text"
                    value={qrInput}
                    onChange={(e) => setQrInput(e.target.value)}
                    placeholder="输入二维码内容..."
                    className="w-full px-4 py-3 pr-24 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-primary-700 hover:bg-primary-600 text-white text-sm rounded-lg transition-all"
                  >
                    签到
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => setShowSearch(!showSearch)}
                  className="text-sm text-primary-600 hover:text-primary-700"
                >
                  {showSearch ? '返回扫码' : '手动查找嘉宾签到'}
                </button>
              </div>

              {showSearch && (
                <div className="mt-6 max-w-sm mx-auto">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      type="text"
                      value={searchName}
                      onChange={(e) => handleSearch(e.target.value)}
                      placeholder="搜索嘉宾姓名..."
                      className="w-full pl-12 pr-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="mt-2 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                      {searchResults.map((guest) => (
                        <button
                          key={guest.id}
                          onClick={() => handleManualCheckIn(guest)}
                          disabled={guest.checkInStatus === 'checked_in'}
                          className={`w-full flex items-center gap-3 p-3 text-left hover:bg-gray-50 transition-colors ${
                            guest.checkInStatus === 'checked_in'
                              ? 'opacity-50 cursor-not-allowed'
                              : ''
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-primary-700 font-medium text-sm">
                              {guest.name.charAt(0)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {guest.name}
                            </p>
                            <p className="text-sm text-gray-500 truncate">
                              {guest.company}
                            </p>
                          </div>
                          {guest.checkInStatus === 'checked_in' ? (
                            <span className="text-xs text-green-600">已签到</span>
                          ) : (
                            <span className="text-xs text-primary-600">点击签到</span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {result && (
                <div
                  className={`mt-6 max-w-sm mx-auto p-4 rounded-xl flex items-center gap-3 animate-fade-in ${
                    result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-6 h-6 text-red-600 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className={`font-medium ${result.success ? 'text-green-800' : 'text-red-800'}`}>
                      {result.message}
                    </p>
                    {result.guest && (
                      <p className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}>
                        {result.guest.name}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-100">
              <h2 className="text-lg font-serif font-bold text-gray-900">最近签到</h2>
            </div>
            <div className="p-4">
              {recentCheckIns.length === 0 ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">暂无签到记录</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentCheckIns.map((guest, index) => (
                    <div
                      key={guest.id + index}
                      className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"
                    >
                      <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                        <span className="text-green-700 font-medium text-sm">
                          {guest.name.charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-sm truncate">
                          {guest.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {guest.company}
                        </p>
                      </div>
                      <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
