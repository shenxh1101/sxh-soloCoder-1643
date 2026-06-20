import type {
  User,
  Event,
  Guest,
  CheckInRecord,
  SeatZone,
  Forum,
  ReportData,
  ImportGuestRow,
  ImportResult,
  ImportDuplicateStrategy,
  InvitationRecord,
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
    const errorData = await response.json().catch(() => ({ error: '请求失败' }));
    const error = new Error(errorData.error || '请求失败');
    (error as any).data = errorData;
    throw error;
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
  getByEvent: (eventId: string, inviteStatus?: string) => {
    const url = inviteStatus
      ? `/events/${eventId}/guests?inviteStatus=${inviteStatus}`
      : `/events/${eventId}/guests`;
    return request<Guest[]>(url);
  },
  getById: (eventId: string, guestId: string) =>
    request<Guest>(`/events/${eventId}/guests/${guestId}`),
  getInvitations: (eventId: string, guestId: string) =>
    request<InvitationRecord[]>(`/events/${eventId}/guests/${guestId}/invitations`),
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
  getInvitePreview: (eventId: string, guestId: string, method: 'email' | 'sms') =>
    request<{
      method: string;
      subject: string;
      content: string;
      checkInLink: string;
      qrCode: string;
    }>(`/events/${eventId}/guests/${guestId}/invite/preview`, {
      method: 'POST',
      body: JSON.stringify({ method }),
    }),
  sendInvite: (eventId: string, guestId: string, method: 'email' | 'sms') =>
    request<{ success: boolean; message: string; guest: Guest }>(
      `/events/${eventId}/guests/${guestId}/invite/send`,
      {
        method: 'POST',
        body: JSON.stringify({ method }),
      },
    ),
  validateImport: (eventId: string, fileBase64: string) =>
    request<{
      total: number;
      valid: number;
      invalid: number;
      duplicates: number;
      rows: ImportGuestRow[];
    }>(`/events/${eventId}/guests/import/validate`, {
      method: 'POST',
      body: JSON.stringify({ file: { data: fileBase64 } }),
    }),
  importGuests: (eventId: string, fileBase64: string, strategy?: ImportDuplicateStrategy) =>
    request<ImportResult>(`/events/${eventId}/guests/import`, {
      method: 'POST',
      body: JSON.stringify({ file: { data: fileBase64 }, strategy }),
    }),
  bulkInvite: (eventId: string, method: 'email' | 'sms', guestIds: string[]) =>
    request<{ success: boolean; successCount: number; failedCount: number; total: number }>(
      `/events/${eventId}/guests/bulk-invite`,
      {
        method: 'POST',
        body: JSON.stringify({ method, guestIds }),
      },
    ),
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
  bulkAssignSeats: (eventId: string, zoneId: string, guestIds: string[], startNumber?: number) =>
    request<{ success: boolean; assignedCount: number; guests: Guest[] }>(
      `/events/${eventId}/seats/zones/${zoneId}/bulk-assign`,
      {
        method: 'POST',
        body: JSON.stringify({ guestIds, startNumber }),
      },
    ),
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
