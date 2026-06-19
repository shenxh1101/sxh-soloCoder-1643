import { Router, type Request, type Response } from 'express';
import { db } from '../db/database.js';
import type { SeatZone } from '../../shared/types.js';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const zones = db.getSeatZonesByEvent(eventId);
  const guests = db.getGuestsByEvent(eventId);

  const zonesWithStats = zones.map((zone) => {
    const zoneGuests = guests.filter((g) => g.seatZoneId === zone.id);
    const checkedInCount = zoneGuests.filter((g) => g.checkInStatus === 'checked_in').length;
    return {
      ...zone,
      assignedCount: zoneGuests.length,
      checkedInCount,
    };
  });

  res.json(zonesWithStats);
});

router.post('/zones', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const { name, type, capacity, color } = req.body;

  if (!name || !type || !capacity) {
    res.status(400).json({ error: '请填写必填字段' });
    return;
  }

  const zoneData: Omit<SeatZone, 'id'> = {
    eventId,
    name,
    type: type as SeatZone['type'],
    capacity: Number(capacity),
    color: color || '#6b7280',
  };

  const newZone = db.addSeatZone(zoneData);
  res.status(201).json(newZone);
});

router.put('/zones/:zoneId', (req: Request, res: Response): void => {
  const { zoneId } = req.params;
  const updates = req.body;

  const updated = db.updateSeatZone(zoneId, updates);
  if (!updated) {
    res.status(404).json({ error: '座位区域不存在' });
    return;
  }
  res.json(updated);
});

router.delete('/zones/:zoneId', (req: Request, res: Response): void => {
  const { zoneId } = req.params;
  const deleted = db.deleteSeatZone(zoneId);
  if (!deleted) {
    res.status(404).json({ error: '座位区域不存在' });
    return;
  }
  res.json({ message: '删除成功' });
});

export default router;
