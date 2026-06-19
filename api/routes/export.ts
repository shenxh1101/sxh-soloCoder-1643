import { Router, type Request, type Response } from 'express';
import * as XLSX from 'xlsx';
import { db } from '../db/database.js';

const router = Router({ mergeParams: true });

router.get('/guests', (req: Request, res: Response): void => {
  const { eventId } = req.params;

  const guests = db.getGuestsByEvent(eventId);
  const zones = db.getSeatZonesByEvent(eventId);
  const event = db.getEventById(eventId);

  const zoneMap = new Map(zones.map((z) => [z.id, z.name]));

  const data = guests.map((guest) => ({
    姓名: guest.name,
    公司: guest.company,
    职位: guest.position,
    手机: guest.phone,
    邮箱: guest.email,
    座位区域: guest.seatZoneId ? zoneMap.get(guest.seatZoneId) || '' : '',
    座位号: guest.seatNumber || '',
    签到状态: guest.checkInStatus === 'checked_in' ? '已签到' : '未签到',
    签到时间: guest.checkInTime || '',
    二维码: guest.qrCode,
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, '嘉宾名单');

  const fileName = `${event?.name || '嘉宾名单'}_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.xlsx`;

  const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileName)}"`);
  res.send(buffer);
});

export default router;
