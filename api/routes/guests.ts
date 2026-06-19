import { Router, type Request, type Response } from 'express';
import QRCode from 'qrcode';
import { db } from '../db/database.js';
import type { Guest } from '../../shared/types.js';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const guests = db.getGuestsByEvent(eventId);
  res.json(guests);
});

router.get('/:guestId', (req: Request, res: Response): void => {
  const { guestId } = req.params;
  const guest = db.getGuestById(guestId);
  if (!guest) {
    res.status(404).json({ error: '嘉宾不存在' });
    return;
  }
  res.json(guest);
});

router.post('/', async (req: Request, res: Response): Promise<void> => {
  const { eventId } = req.params;
  const { name, company, position, phone, email } = req.body;

  if (!name) {
    res.status(400).json({ error: '嘉宾姓名不能为空' });
    return;
  }

  const qrCode = `guest-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const guestData: Omit<Guest, 'id' | 'createdAt'> = {
    eventId,
    name,
    company: company || '',
    position: position || '',
    phone: phone || '',
    email: email || '',
    qrCode,
    checkInStatus: 'pending',
    forumIds: [],
  };

  const newGuest = db.addGuest(guestData);
  res.status(201).json(newGuest);
});

router.put('/:guestId', (req: Request, res: Response): void => {
  const { guestId } = req.params;
  const updates = req.body;

  const updated = db.updateGuest(guestId, updates);
  if (!updated) {
    res.status(404).json({ error: '嘉宾不存在' });
    return;
  }
  res.json(updated);
});

router.delete('/:guestId', (req: Request, res: Response): void => {
  const { guestId } = req.params;
  const deleted = db.deleteGuest(guestId);
  if (!deleted) {
    res.status(404).json({ error: '嘉宾不存在' });
    return;
  }
  res.json({ message: '删除成功' });
});

router.get('/:guestId/qrcode', async (req: Request, res: Response): Promise<void> => {
  const { guestId } = req.params;
  const guest = db.getGuestById(guestId);

  if (!guest) {
    res.status(404).json({ error: '嘉宾不存在' });
    return;
  }

  try {
    const qrDataUrl = await QRCode.toDataURL(guest.qrCode, {
      width: 300,
      margin: 2,
      color: {
        dark: '#1e3a5f',
        light: '#ffffff',
      },
    });
    res.json({ qrCode: guest.qrCode, qrDataUrl });
  } catch (error) {
    res.status(500).json({ error: '生成二维码失败' });
  }
});

router.put('/:guestId/seat', (req: Request, res: Response): void => {
  const { guestId } = req.params;
  const { seatZoneId, seatNumber } = req.body;

  const guest = db.getGuestById(guestId);
  if (!guest) {
    res.status(404).json({ error: '嘉宾不存在' });
    return;
  }

  const updated = db.updateGuest(guestId, { seatZoneId, seatNumber });
  res.json(updated);
});

export default router;
