import { Router, type Request, type Response } from 'express';
import { db } from '../db/database.js';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const checkIns = db.getCheckInsByEvent(eventId);
  res.json(checkIns);
});

router.post('/', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const { qrCode, guestId, method = 'qrcode' } = req.body;

  let guest;
  if (guestId) {
    guest = db.getGuestById(guestId);
  } else if (qrCode) {
    guest = db.getGuestByQrCode(qrCode);
  }

  if (!guest) {
    res.status(404).json({ error: '未找到对应嘉宾' });
    return;
  }

  if (guest.eventId !== eventId) {
    res.status(400).json({ error: '嘉宾不属于该活动' });
    return;
  }

  if (guest.checkInStatus === 'checked_in') {
    res.status(400).json({ error: '嘉宾已签到', guest });
    return;
  }

  const now = new Date().toISOString();

  db.updateGuest(guest.id, {
    checkInStatus: 'checked_in',
    checkInTime: now,
  });

  const record = db.addCheckIn({
    guestId: guest.id,
    eventId,
    checkInTime: now,
    method: method as 'qrcode' | 'manual',
  });

  const updatedGuest = db.getGuestById(guest.id);

  res.json({
    message: '签到成功',
    guest: updatedGuest,
    checkInRecord: record,
  });
});

export default router;
