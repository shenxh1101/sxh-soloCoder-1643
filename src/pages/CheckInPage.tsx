import { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  User,
  CheckCircle,
  XCircle,
  Search,
  Clock,
  Camera,
  CameraOff,
  AlertTriangle,
  MapPin,
  CheckCheck,
} from 'lucide-react';
import { checkInsApi, guestsApi, eventsApi, seatsApi } from '@/api';
import type { Guest, Event, SeatZone } from '@shared/types';
import { Html5Qrcode } from 'html5-qrcode';
import { getZoneName } from '@/lib/utils';

type ScanResult = {
  success: boolean;
  guest?: Guest;
  message: string;
  errorCode?: string;
};

export default function CheckInPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const [event, setEvent] = useState<Event | null>(null);
  const [zones, setZones] = useState<SeatZone[]>([]);
  const [qrInput, setQrInput] = useState('');
  const [searchName, setSearchName] = useState('');
  const [searchResults, setSearchResults] = useState<Guest[]>([]);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recentCheckIns, setRecentCheckIns] = useState<Guest[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = 'qr-reader';
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessingRef = useRef(false);
  const resumeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
    return () => {
      stopScanner();
    };
  }, [eventId]);

  const loadEvent = async () => {
    if (!eventId) return;
    try {
      const [eventData, zonesData] = await Promise.all([
        eventsApi.getById(eventId),
        seatsApi.getZones(eventId),
      ]);
      setEvent(eventData);
      setZones(zonesData);
    } catch (err) {
      console.error('加载活动失败:', err);
    }
  };

  const handleQrSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!qrInput.trim() || !eventId) return;
    await processQrCode(qrInput.trim(), false);
    setQrInput('');
  };

  const processQrCode = async (qrCode: string, fromCamera: boolean): Promise<void> => {
    if (isProcessingRef.current || !eventId || isPaused) return;
    isProcessingRef.current = true;

    try {
      const response = await checkInsApi.checkIn(eventId, {
        qrCode,
        method: 'qrcode',
      });

      setResult({
        success: true,
        guest: response.guest,
        message: response.message,
      });
      setRecentCheckIns((prev) => [response.guest, ...prev].slice(0, 10));
      playBeep();

      if (fromCamera) {
        pauseAndResume();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '签到失败';
      let errorCode = 'unknown';
      let guest: Guest | undefined;

      const errorData = (err as any)?.data;
      if (errorData) {
        if (errorData.errorCode) {
          errorCode = errorData.errorCode;
        }
        if (errorData.guest) {
          guest = errorData.guest;
        }
      }

      setResult({
        success: false,
        guest,
        message: errorMessage,
        errorCode,
      });
      playErrorBeep();

      if (fromCamera) {
        pauseAndResume();
      }
    } finally {
      if (!fromCamera) {
        setTimeout(() => {
          setResult(null);
          isProcessingRef.current = false;
        }, 3000);
      }
    }
  };

  const pauseAndResume = () => {
    setIsPaused(true);
    if (scannerRef.current && scannerRef.current.isScanning) {
      scannerRef.current.pause();
    }

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(() => {
      setResult(null);
      setIsPaused(false);
      isProcessingRef.current = false;
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.resume();
      }
    }, 2000);
  };

  const playBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 880;
      oscillator.type = 'sine';
      gainNode.gain.value = 0.3;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 150);
    } catch {
      // 忽略音频错误
    }
  };

  const playErrorBeep = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.frequency.value = 300;
      oscillator.type = 'square';
      gainNode.gain.value = 0.2;
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioContext.close();
      }, 200);
    } catch {
      // 忽略音频错误
    }
  };

  const startScanner = async () => {
    if (!eventId) return;
    setCameraError(null);

    try {
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(scannerContainerId);
      }

      await scannerRef.current.start(
        { facingMode: 'environment' },
        {
          fps: 15,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          processQrCode(decodedText, true);
        },
        () => {
          // 扫描错误回调，忽略（持续扫描中）
        },
      );

      setIsScanning(true);
    } catch (err) {
      console.error('启动摄像头失败:', err);
      setCameraError(
        '无法启动摄像头，请确保已授予摄像头权限，或使用 HTTPS 协议访问。' +
          '您也可以手动输入二维码内容进行签到。',
      );
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('停止摄像头失败:', err);
      }
    }
    setIsScanning(false);
    setIsPaused(false);
  };

  const toggleScanner = () => {
    if (isScanning) {
      stopScanner();
    } else {
      startScanner();
    }
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
    if (!eventId || guest.checkInStatus === 'checked_in') return;
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
      setRecentCheckIns((prev) => [response.guest, ...prev].slice(0, 10));
      setSearchName('');
      setSearchResults([]);
      setShowSearch(false);
      playBeep();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '签到失败';
      let errorCode = 'unknown';
      let guestInfo: Guest | undefined;

      const errorData = (err as any)?.data;
      if (errorData) {
        if (errorData.errorCode) {
          errorCode = errorData.errorCode;
        }
        if (errorData.guest) {
          guestInfo = errorData.guest;
        }
      }

      setResult({
        success: false,
        guest: guestInfo,
        message: errorMessage,
        errorCode,
      });
      playErrorBeep();
    }

    setTimeout(() => setResult(null), 3000);
  };

  const getResultIcon = () => {
    if (!result) return null;
    if (result.success) {
      return <CheckCircle className="w-10 h-10 text-green-500 flex-shrink-0" />;
    }
    switch (result.errorCode) {
      case 'invalid_qrcode':
        return <XCircle className="w-10 h-10 text-red-500 flex-shrink-0" />;
      case 'already_checked_in':
        return <CheckCheck className="w-10 h-10 text-yellow-500 flex-shrink-0" />;
      case 'wrong_event':
        return <AlertTriangle className="w-10 h-10 text-orange-500 flex-shrink-0" />;
      default:
        return <XCircle className="w-10 h-10 text-red-500 flex-shrink-0" />;
    }
  };

  const getResultStyle = () => {
    if (!result) return '';
    if (result.success) {
      return 'bg-green-50 border-green-200';
    }
    switch (result.errorCode) {
      case 'already_checked_in':
        return 'bg-yellow-50 border-yellow-200';
      case 'wrong_event':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-red-50 border-red-200';
    }
  };

  const getResultTitle = () => {
    if (!result) return '';
    if (result.success) return '签到成功';
    switch (result.errorCode) {
      case 'invalid_qrcode':
        return '二维码无效';
      case 'already_checked_in':
        return '已签到';
      case 'wrong_event':
        return '活动不匹配';
      default:
        return '签到失败';
    }
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
                className={`relative w-full max-w-sm mx-auto aspect-square rounded-2xl border-2 overflow-hidden transition-all ${
                  isScanning
                    ? 'border-primary-500 bg-black'
                    : 'border-dashed border-gray-200 bg-gray-50 hover:border-primary-300 hover:bg-primary-50/50'
                }`}
              >
                {isScanning ? (
                  <div className="absolute inset-0">
                    <div id={scannerContainerId} className="w-full h-full" />
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="relative w-48 h-48">
                        <div
                          className={`absolute inset-0 border-2 rounded-lg transition-all ${
                            isPaused ? 'border-yellow-400' : 'border-primary-400'
                          } ${isPaused ? 'animate-pulse' : ''}`}
                        ></div>
                        <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-primary-500 rounded-tl-lg"></div>
                        <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-primary-500 rounded-tr-lg"></div>
                        <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-primary-500 rounded-bl-lg"></div>
                        <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-primary-500 rounded-br-lg"></div>
                      </div>
                    </div>
                    {isPaused && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <div className="text-center text-white">
                          <div className="w-16 h-16 mx-auto mb-2 bg-white/20 rounded-full flex items-center justify-center">
                          {result?.success ? (
                            <CheckCircle className="w-10 h-10 text-green-400" />
                          ) : (
                            <XCircle className="w-10 h-10 text-red-400" />
                          )}
                        </div>
                        <p className="text-sm font-medium">
                          {result?.success ? '签到成功' : '签到失败'}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <button
                  onClick={toggleScanner}
                  className="w-full h-full text-center group flex flex-col items-center justify-center"
                >
                  <div className="w-24 h-24 mx-auto mb-4 rounded-2xl bg-white shadow-card flex items-center justify-center group-hover:shadow-card-hover transition-all">
                    <Camera className="w-12 h-12 text-primary-600" />
                  </div>
                  <p className="text-gray-600 font-medium">点击开启摄像头扫码</p>
                  <p className="text-sm text-gray-400 mt-1">或手动输入二维码内容</p>
                </button>
              )}
            </div>

              {cameraError && (
                <div className="mt-4 max-w-sm mx-auto p-3 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-yellow-700">{cameraError}</p>
                </div>
              )}

              {isScanning && (
                <div className="mt-4 text-center">
                  <button
                    onClick={toggleScanner}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors text-sm"
                  >
                    <CameraOff size={16} />
                    <span>关闭摄像头</span>
                  </button>
                </div>
              )}

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

              {result && !isPaused && (
                <div
                  className={`mt-6 max-w-sm mx-auto p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${getResultStyle()}`}
                >
                  {getResultIcon()}
                  <div className="flex-1 min-w-0">
                    <p
                      className={`font-bold ${
                        result.success
                          ? 'text-green-800'
                          : result.errorCode === 'already_checked_in'
                            ? 'text-yellow-800'
                            : result.errorCode === 'wrong_event'
                              ? 'text-orange-800'
                              : 'text-red-800'
                      }`}
                    >
                      {getResultTitle()}
                    </p>
                    <p
                      className={`text-sm mt-1 ${
                        result.success
                          ? 'text-green-600'
                          : result.errorCode === 'already_checked_in'
                            ? 'text-yellow-600'
                            : result.errorCode === 'wrong_event'
                              ? 'text-orange-600'
                              : 'text-red-600'
                      }`}
                    >
                      {result.message}
                    </p>
                    {result.guest && (
                      <div className="mt-2 pt-2 border-t border-current/20">
                        <p
                          className={`text-sm font-medium ${
                            result.success
                              ? 'text-green-700'
                              : result.errorCode === 'already_checked_in'
                                ? 'text-yellow-700'
                                : result.errorCode === 'wrong_event'
                                  ? 'text-orange-700'
                                  : 'text-red-700'
                          }`}
                        >
                          {result.guest.name}
                        </p>
                        {result.guest.company && (
                          <p
                            className={`text-xs ${
                              result.success
                              ? 'text-green-600'
                              : result.errorCode === 'already_checked_in'
                                ? 'text-yellow-600'
                                : result.errorCode === 'wrong_event'
                                  ? 'text-orange-600'
                                  : 'text-red-600'
                            }`}
                          >
                            {result.guest.company}
                          </p>
                        )}
                      </div>
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
                <div className="space-y-2 max-h-96 overflow-y-auto">
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
                        {guest.seatZoneId && (
                          <p className="text-xs text-primary-600 mt-0.5 flex items-center gap-1">
                            <MapPin size={12} />
                            {getZoneName(guest.seatZoneId, zones)}
                            {guest.seatNumber ? ` - ${guest.seatNumber}号` : ''}
                          </p>
                        )}
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
