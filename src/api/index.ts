import type {
  User,
  Event,
  Guest,
  CheckInRecord,
  SeatZone,
  Forum,
  ReportData,
} from '../../shared/types';

const API_BASE = '/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: '请求失败' }));
    throw new Error(error.error || '请求失败');
  }

  return response.json();
}

export const authApi = {
  login: (username: string, password: string) =>
    request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  logout: () =>
    request('/auth/logout', { method: 'POST' }),
};

export const eventsApi = {
  getAll: () => request<Event[]>('/events'),
  getById: (id: string) => request<Event>(`/events/${id}`),
  create: (data: Partial<Event>) =>
    request<Event>('/events', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: string, data: Partial<Event>) =>
    request<Event>(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: string) =>
    request(`/events/${id}`, { method: 'DELETE' }),
};

export const guestsApi = {
  getByEvent: (eventId: string) =>
    request<Guest[]>(`/events/${eventId}/guests`),
  getById: (eventId: string, guestId: string) =>
    request<Guest>(`/events/${eventId}/guests/${guestId}`),
  create: (eventId: string, data: Partial<Guest>) =>
    request<Guest>(`/events/${eventId}/guests`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (eventId: string, guestId: string, data: Partial<Guest>) =>
    request<Guest>(`/events/${eventId}/guests/${guestId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (eventId: string, guestId: string) =>
    request(`/events/${eventId}/guests/${guestId}`, { method: 'DELETE' }),
  getQrCode: (eventId: string, guestId: string) =>
    request<{ qrCode: string; qrDataUrl: string }>(
      `/events/${eventId}/guests/${guestId}/qrcode`,
    ),
  updateSeat: (eventId: string, guestId: string, seatZoneId?: string, seatNumber?: string) =>
    request<Guest>(`/events/${eventId}/guests/${guestId}/seat`, {
      method: 'PUT',
      body: JSON.stringify({ seatZoneId, seatNumber }),
    }),
};

export const checkInsApi = {
  getByEvent: (eventId: string) =>
    request<CheckInRecord[]>(`/events/${eventId}/checkins`),
  checkIn: (eventId: string, data: { qrCode?: string; guestId?: string; method?: string }) =>
    request<{ message: string; guest: Guest; checkInRecord: CheckInRecord }>(
      `/events/${eventId}/checkins`,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    ),
};

export const seatsApi = {
  getZones: (eventId: string) =>
    request<(SeatZone & { assignedCount: number; checkedInCount: number })[]>(
      `/events/${eventId}/seats`,
    ),
  createZone: (eventId: string, data: Partial<SeatZone>) =>
    request<SeatZone>(`/events/${eventId}/seats/zones`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateZone: (eventId: string, zoneId: string, data: Partial<SeatZone>) =>
    request<SeatZone>(`/events/${eventId}/seats/zones/${zoneId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  deleteZone: (eventId: string, zoneId: string) =>
    request(`/events/${eventId}/seats/zones/${zoneId}`, { method: 'DELETE' }),
};

export const reportsApi = {
  getReport: (eventId: string) =>
    request<ReportData>(`/events/${eventId}/reports`),
};

export const forumsApi = {
  getByEvent: (eventId: string) =>
    request<Forum[]>(`/events/${eventId}/forums`),
  getById: (eventId: string, forumId: string) =>
    request<Forum>(`/events/${eventId}/forums/${forumId}`),
  create: (eventId: string, data: Partial<Forum>) =>
    request<Forum>(`/events/${eventId}/forums`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (eventId: string, forumId: string, data: Partial<Forum>) =>
    request<Forum>(`/events/${eventId}/forums/${forumId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (eventId: string, forumId: string) =>
    request(`/events/${eventId}/forums/${forumId}`, { method: 'DELETE' }),
  addGuests: (eventId: string, forumId: string, guestIds: string[]) =>
    request<Forum>(`/events/${eventId}/forums/${forumId}/guests`, {
      method: 'POST',
      body: JSON.stringify({ guestIds }),
    }),
  removeGuest: (eventId: string, forumId: string, guestId: string) =>
    request<Forum>(`/events/${eventId}/forums/${forumId}/guests/${guestId}`, {
      method: 'DELETE',
    }),
};

export const exportApi = {
  downloadGuests: (eventId: string) => {
    window.open(`${API_BASE}/events/${eventId}/export/guests`, '_blank');
  },
};
