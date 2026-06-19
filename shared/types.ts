export interface User {
  id: string;
  username: string;
  name: string;
  role: 'admin' | 'receptionist';
}

export interface Event {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  location: string;
  expectedAttendees: number;
  description?: string;
  status: 'upcoming' | 'ongoing' | 'ended';
  creatorId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Guest {
  id: string;
  eventId: string;
  name: string;
  company: string;
  position: string;
  phone: string;
  email: string;
  qrCode: string;
  checkInStatus: 'pending' | 'checked_in';
  checkInTime?: string;
  seatZoneId?: string;
  seatNumber?: string;
  forumIds: string[];
  createdAt: string;
}

export interface CheckInRecord {
  id: string;
  guestId: string;
  eventId: string;
  checkInTime: string;
  method: 'qrcode' | 'manual';
}

export interface SeatZone {
  id: string;
  eventId: string;
  name: string;
  type: 'vip' | 'media' | 'general' | 'custom';
  capacity: number;
  color: string;
}

export interface Forum {
  id: string;
  eventId: string;
  name: string;
  location: string;
  startTime: string;
  endTime: string;
  description?: string;
  guestIds: string[];
}

export interface ReportData {
  totalGuests: number;
  checkedInCount: number;
  checkInRate: number;
  zoneStats: {
    zoneId: string;
    zoneName: string;
    total: number;
    checkedIn: number;
  }[];
  checkInTrend: {
    time: string;
    count: number;
  }[];
}

export interface DatabaseData {
  users: User[];
  events: Event[];
  guests: Guest[];
  checkIns: CheckInRecord[];
  seatZones: SeatZone[];
  forums: Forum[];
}
