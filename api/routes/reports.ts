import { Router, type Request, type Response } from 'express';
import { db } from '../db/database.js';
import type { ReportData } from '../../shared/types.js';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response): void => {
  const { eventId } = req.params;

  const guests = db.getGuestsByEvent(eventId);
  const zones = db.getSeatZonesByEvent(eventId);
  const checkIns = db.getCheckInsByEvent(eventId);

  const totalGuests = guests.length;
  const checkedInCount = guests.filter((g) => g.checkInStatus === 'checked_in').length;
  const checkInRate = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  const zoneStats = zones.map((zone) => {
    const zoneGuests = guests.filter((g) => g.seatZoneId === zone.id);
    const zoneCheckedIn = zoneGuests.filter((g) => g.checkInStatus === 'checked_in').length;
    return {
      zoneId: zone.id,
      zoneName: zone.name,
      total: zoneGuests.length,
      checkedIn: zoneCheckedIn,
    };
  });

  const hourlyMap = new Map<string, number>();
  for (const checkIn of checkIns) {
    const hour = checkIn.checkInTime.slice(0, 13) + ':00:00';
    hourlyMap.set(hour, (hourlyMap.get(hour) || 0) + 1);
  }

  const checkInTrend = Array.from(hourlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([time, count]) => ({ time, count }));

  const report: ReportData = {
    totalGuests,
    checkedInCount,
    checkInRate,
    zoneStats,
    checkInTrend,
  };

  res.json(report);
});

export default router;
