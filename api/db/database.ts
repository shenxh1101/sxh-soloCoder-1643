import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type {
  DatabaseData,
  User,
  Event,
  Guest,
  CheckInRecord,
  SeatZone,
  Forum,
} from '../../shared/types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, '../../data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getInitialData(): DatabaseData {
  const now = new Date().toISOString();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString();
  const dayAfter = new Date();
  dayAfter.setDate(dayAfter.getDate() + 2);
  const dayAfterStr = dayAfter.toISOString();

  return {
    users: [
      {
        id: 'admin-001',
        username: 'admin',
        name: '系统管理员',
        role: 'admin',
      },
      {
        id: 'recep-001',
        username: 'reception',
        name: '前台接待员',
        role: 'receptionist',
      },
    ],
    events: [
      {
        id: 'event-001',
        name: '2026科技创新峰会',
        startTime: tomorrowStr,
        endTime: dayAfterStr,
        location: '上海国际会议中心',
        expectedAttendees: 200,
        description: '汇聚行业精英，探讨科技创新前沿趋势',
        status: 'upcoming',
        creatorId: 'admin-001',
        createdAt: now,
        updatedAt: now,
      },
    ],
    guests: [],
    checkIns: [],
    seatZones: [
      {
        id: 'zone-vip-001',
        eventId: 'event-001',
        name: 'VIP区',
        type: 'vip',
        capacity: 30,
        color: '#d4af37',
      },
      {
        id: 'zone-media-001',
        eventId: 'event-001',
        name: '媒体区',
        type: 'media',
        capacity: 50,
        color: '#3b82f6',
      },
      {
        id: 'zone-general-001',
        eventId: 'event-001',
        name: '普通区',
        type: 'general',
        capacity: 120,
        color: '#6b7280',
      },
    ],
    forums: [],
  };
}

export function readDatabase(): DatabaseData {
  ensureDataDir();
  if (!fs.existsSync(DATA_FILE)) {
    const initialData = getInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch {
    const initialData = getInitialData();
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

export function writeDatabase(data: DatabaseData): void {
  ensureDataDir();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const db = {
  getUsers: (): User[] => readDatabase().users,
  getUserByUsername: (username: string): User | undefined =>
    readDatabase().users.find((u) => u.username === username),
  getUserById: (id: string): User | undefined =>
    readDatabase().users.find((u) => u.id === id),

  getEvents: (): Event[] => readDatabase().events,
  getEventById: (id: string): Event | undefined =>
    readDatabase().events.find((e) => e.id === id),
  addEvent: (event: Omit<Event, 'id' | 'createdAt' | 'updatedAt'>): Event => {
    const data = readDatabase();
    const newEvent: Event = {
      ...event,
      id: generateId('event'),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    data.events.push(newEvent);
    writeDatabase(data);
    return newEvent;
  },
  updateEvent: (id: string, updates: Partial<Event>): Event | undefined => {
    const data = readDatabase();
    const index = data.events.findIndex((e) => e.id === id);
    if (index === -1) return undefined;
    data.events[index] = {
      ...data.events[index],
      ...updates,
      id,
      updatedAt: new Date().toISOString(),
    };
    writeDatabase(data);
    return data.events[index];
  },
  deleteEvent: (id: string): boolean => {
    const data = readDatabase();
    const initialLength = data.events.length;
    data.events = data.events.filter((e) => e.id !== id);
    data.guests = data.guests.filter((g) => g.eventId !== id);
    data.checkIns = data.checkIns.filter((c) => c.eventId !== id);
    data.seatZones = data.seatZones.filter((z) => z.eventId !== id);
    data.forums = data.forums.filter((f) => f.eventId !== id);
    writeDatabase(data);
    return data.events.length < initialLength;
  },

  getGuestsByEvent: (eventId: string): Guest[] =>
    readDatabase().guests.filter((g) => g.eventId === eventId),
  getGuestById: (id: string): Guest | undefined =>
    readDatabase().guests.find((g) => g.id === id),
  getGuestByQrCode: (qrCode: string): Guest | undefined =>
    readDatabase().guests.find((g) => g.qrCode === qrCode),
  addGuest: (guest: Omit<Guest, 'id' | 'createdAt'>): Guest => {
    const data = readDatabase();
    const newGuest: Guest = {
      ...guest,
      id: generateId('guest'),
      createdAt: new Date().toISOString(),
    };
    data.guests.push(newGuest);
    writeDatabase(data);
    return newGuest;
  },
  updateGuest: (id: string, updates: Partial<Guest>): Guest | undefined => {
    const data = readDatabase();
    const index = data.guests.findIndex((g) => g.id === id);
    if (index === -1) return undefined;
    data.guests[index] = { ...data.guests[index], ...updates, id };
    writeDatabase(data);
    return data.guests[index];
  },
  deleteGuest: (id: string): boolean => {
    const data = readDatabase();
    const initialLength = data.guests.length;
    data.guests = data.guests.filter((g) => g.id !== id);
    data.checkIns = data.checkIns.filter((c) => c.guestId !== id);
    for (const forum of data.forums) {
      forum.guestIds = forum.guestIds.filter((gid) => gid !== id);
    }
    writeDatabase(data);
    return data.guests.length < initialLength;
  },

  getCheckInsByEvent: (eventId: string): CheckInRecord[] =>
    readDatabase().checkIns.filter((c) => c.eventId === eventId),
  addCheckIn: (record: Omit<CheckInRecord, 'id'>): CheckInRecord => {
    const data = readDatabase();
    const newRecord: CheckInRecord = {
      ...record,
      id: generateId('checkin'),
    };
    data.checkIns.push(newRecord);
    writeDatabase(data);
    return newRecord;
  },

  getSeatZonesByEvent: (eventId: string): SeatZone[] =>
    readDatabase().seatZones.filter((z) => z.eventId === eventId),
  getSeatZoneById: (id: string): SeatZone | undefined =>
    readDatabase().seatZones.find((z) => z.id === id),
  addSeatZone: (zone: Omit<SeatZone, 'id'>): SeatZone => {
    const data = readDatabase();
    const newZone: SeatZone = {
      ...zone,
      id: generateId('zone'),
    };
    data.seatZones.push(newZone);
    writeDatabase(data);
    return newZone;
  },
  updateSeatZone: (id: string, updates: Partial<SeatZone>): SeatZone | undefined => {
    const data = readDatabase();
    const index = data.seatZones.findIndex((z) => z.id === id);
    if (index === -1) return undefined;
    data.seatZones[index] = { ...data.seatZones[index], ...updates, id };
    writeDatabase(data);
    return data.seatZones[index];
  },
  deleteSeatZone: (id: string): boolean => {
    const data = readDatabase();
    const initialLength = data.seatZones.length;
    data.seatZones = data.seatZones.filter((z) => z.id !== id);
    for (const guest of data.guests) {
      if (guest.seatZoneId === id) {
        guest.seatZoneId = undefined;
        guest.seatNumber = undefined;
      }
    }
    writeDatabase(data);
    return data.seatZones.length < initialLength;
  },

  getForumsByEvent: (eventId: string): Forum[] =>
    readDatabase().forums.filter((f) => f.eventId === eventId),
  getForumById: (id: string): Forum | undefined =>
    readDatabase().forums.find((f) => f.id === id),
  addForum: (forum: Omit<Forum, 'id' | 'guestIds'>): Forum => {
    const data = readDatabase();
    const newForum: Forum = {
      ...forum,
      id: generateId('forum'),
      guestIds: [],
    };
    data.forums.push(newForum);
    writeDatabase(data);
    return newForum;
  },
  updateForum: (id: string, updates: Partial<Forum>): Forum | undefined => {
    const data = readDatabase();
    const index = data.forums.findIndex((f) => f.id === id);
    if (index === -1) return undefined;
    data.forums[index] = { ...data.forums[index], ...updates, id };
    writeDatabase(data);
    return data.forums[index];
  },
  deleteForum: (id: string): boolean => {
    const data = readDatabase();
    const initialLength = data.forums.length;
    data.forums = data.forums.filter((f) => f.id !== id);
    writeDatabase(data);
    return data.forums.length < initialLength;
  },
  addGuestToForum: (forumId: string, guestId: string): boolean => {
    const data = readDatabase();
    const forum = data.forums.find((f) => f.id === forumId);
    if (!forum) return false;
    if (!forum.guestIds.includes(guestId)) {
      forum.guestIds.push(guestId);
      writeDatabase(data);
    }
    return true;
  },
  removeGuestFromForum: (forumId: string, guestId: string): boolean => {
    const data = readDatabase();
    const forum = data.forums.find((f) => f.id === forumId);
    if (!forum) return false;
    forum.guestIds = forum.guestIds.filter((id) => id !== guestId);
    writeDatabase(data);
    return true;
  },
};
