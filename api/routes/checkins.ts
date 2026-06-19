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
    res.status(404).json({ error: '二维码无效或未找到对应嘉宾', errorCode: 'invalid_qrcode' });
    return;
  }

  if (guest.eventId !== eventId) {
    res.status(400).json({ error: '该嘉宾不属于当前活动', errorCode: 'wrong_event', guest });
    return;
  }

  if (guest.checkInStatus === 'checked_in') {
    res.status(400).json({ error: '嘉宾已签到，请勿重复签到', errorCode: 'already_checked_in', guest });
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
