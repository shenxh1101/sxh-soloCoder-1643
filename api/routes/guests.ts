import { Router, type Request, type Response } from 'express';
import QRCode from 'qrcode';
import * as XLSX from 'xlsx';
import { db } from '../db/database.js';
import type { Guest, ImportGuestRow, ImportResult } from '../../shared/types.js';

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
    inviteStatus: 'unsent',
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

router.post('/:guestId/invite/preview', (req: Request, res: Response): void => {
  const { guestId, eventId } = req.params;
  const { method } = req.body;

  const guest = db.getGuestById(guestId);
  const event = db.getEventById(eventId);

  if (!guest) {
    res.status(404).json({ error: '嘉宾不存在' });
    return;
  }
  if (!event) {
    res.status(404).json({ error: '活动不存在' });
    return;
  }

  const checkInLink = `${req.protocol}://${req.get('host')}/checkin/${guest.qrCode}`;
  const eventDate = new Date(event.startTime).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  let subject = '';
  let content = '';

  if (method === 'email') {
    subject = `邀请函 - ${event.name}`;
    content = `尊敬的 ${guest.name} 嘉宾：

您好！诚挚邀请您参加"${event.name}"。

活动信息：
- 活动名称：${event.name}
- 活动时间：${eventDate}
- 活动地点：${event.location}

${event.description ? `活动介绍：${event.description}\n` : ''}
签到方式：扫描下方二维码或点击链接完成签到
签到链接：${checkInLink}

期待您的光临！

${event.name} 组委会`;
  } else {
    subject = '【活动邀请】';
    content = `${subject}${event.name}诚邀${guest.name}参加，时间${eventDate}，地点${event.location}。签到：${checkInLink} 回T退订`;
  }

  res.json({
    method,
    subject,
    content,
    checkInLink,
    qrCode: guest.qrCode,
  });
});

router.post('/:guestId/invite/send', (req: Request, res: Response): void => {
  const { guestId, eventId } = req.params;
  const { method } = req.body;

  const guest = db.getGuestById(guestId);
  const event = db.getEventById(eventId);

  if (!guest) {
    res.status(404).json({ error: '嘉宾不存在' });
    return;
  }
  if (!event) {
    res.status(404).json({ error: '活动不存在' });
    return;
  }

  if (method === 'email' && !guest.email) {
    res.status(400).json({ error: '嘉宾邮箱为空，无法发送邮件邀请' });
    return;
  }
  if (method === 'sms' && !guest.phone) {
    res.status(400).json({ error: '嘉宾手机号为空，无法发送短信邀请' });
    return;
  }

  const now = new Date().toISOString();

  db.addInvitation({
    guestId,
    eventId,
    method,
    status: 'sent',
    sentAt: now,
  });

  db.updateGuest(guestId, {
    inviteStatus: 'sent',
    inviteSentAt: now,
    inviteMethod: method,
  });

  res.json({
    success: true,
    message: `${method === 'email' ? '邮件' : '短信'}邀请发送成功`,
    guest: db.getGuestById(guestId),
  });
});

router.post('/import/validate', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const { file } = req.body;

  if (!file || !file.data) {
    res.status(400).json({ error: '请上传Excel文件' });
    return;
  }

  try {
    const workbook = XLSX.read(file.data, { type: 'base64' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet) as any[];

    const existingGuests = db.getGuestsByEvent(eventId);
    const existingPhones = new Set(existingGuests.map((g) => g.phone).filter(Boolean));
    const existingEmails = new Set(existingGuests.map((g) => g.email).filter(Boolean));

    const validatedRows: ImportGuestRow[] = rows.map((row, index) => {
      const name = String(row['姓名'] || row['name'] || '').trim();
      const company = String(row['公司'] || row['company'] || '').trim();
      const position = String(row['职位'] || row['position'] || '').trim();
      const phone = String(row['手机'] || row['手机号'] || row['phone'] || '').trim();
      const email = String(row['邮箱'] || row['email'] || '').trim();

      const errors: string[] = [];
      if (!name) errors.push('姓名不能为空');
      if (phone && !/^1[3-9]\d{9}$/.test(phone)) errors.push('手机号格式不正确');
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('邮箱格式不正确');

      const isDuplicatePhone = phone ? existingPhones.has(phone) : false;
      const isDuplicateEmail = email ? existingEmails.has(email) : false;

      if (isDuplicatePhone) errors.push('手机号已存在');
      if (isDuplicateEmail) errors.push('邮箱已存在');

      const valid = errors.length === 0;

      return {
        name,
        company,
        position,
        phone,
        email,
        rowIndex: index + 2,
        valid,
        errors,
        isDuplicatePhone,
        isDuplicateEmail,
      };
    });

    const validRows = validatedRows.filter((r) => r.valid);
    const invalidRows = validatedRows.filter((r) => !r.valid);
    const duplicateCount = validatedRows.filter(
      (r) => r.isDuplicatePhone || r.isDuplicateEmail,
    ).length;

    res.json({
      total: rows.length,
      valid: validRows.length,
      invalid: invalidRows.length,
      duplicates: duplicateCount,
      rows: validatedRows,
    });
  } catch (error) {
    res.status(400).json({ error: '文件解析失败，请确保是有效的Excel文件' });
  }
});

router.post('/import', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const { file, skipDuplicates = true } = req.body;

  if (!file || !file.data) {
    res.status(400).json({ error: '请上传Excel文件' });
    return;
  }

  try {
    const workbook = XLSX.read(file.data, { type: 'base64' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(firstSheet) as any[];

    const importedGuests: Guest[] = [];
    const errors: string[] = [];
    let skipped = 0;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const name = String(row['姓名'] || row['name'] || '').trim();
      const company = String(row['公司'] || row['company'] || '').trim();
      const position = String(row['职位'] || row['position'] || '').trim();
      const phone = String(row['手机'] || row['手机号'] || row['phone'] || '').trim();
      const email = String(row['邮箱'] || row['email'] || '').trim();

      if (!name) {
        errors.push(`第${i + 2}行：姓名不能为空`);
        continue;
      }
      if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
        errors.push(`第${i + 2}行：手机号格式不正确`);
        continue;
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push(`第${i + 2}行：邮箱格式不正确`);
        continue;
      }

      if (skipDuplicates) {
        const existingByPhone = phone ? db.getGuestByPhone(eventId, phone) : null;
        const existingByEmail = email ? db.getGuestByEmail(eventId, email) : null;
        if (existingByPhone || existingByEmail) {
          skipped++;
          continue;
        }
      }

      const qrCode = `guest-${eventId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      const guestData: Omit<Guest, 'id' | 'createdAt'> = {
        eventId,
        name,
        company,
        position,
        phone,
        email,
        qrCode,
        checkInStatus: 'pending',
        forumIds: [],
        inviteStatus: 'unsent',
      };

      const newGuest = db.addGuest(guestData);
      importedGuests.push(newGuest);
    }

    const result: ImportResult = {
      total: rows.length,
      valid: importedGuests.length + skipped,
      invalid: errors.length,
      duplicates: skipped,
      imported: importedGuests.length,
      guests: importedGuests,
      errors,
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: '导入失败，请重试' });
  }
});

router.post('/bulk-invite', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const { method, guestIds } = req.body;

  if (!method || !guestIds || !Array.isArray(guestIds)) {
    res.status(400).json({ error: '参数不正确' });
    return;
  }

  let successCount = 0;
  let failedCount = 0;
  const now = new Date().toISOString();

  for (const guestId of guestIds) {
    const guest = db.getGuestById(guestId);
    if (!guest || guest.eventId !== eventId) {
      failedCount++;
      continue;
    }

    if (method === 'email' && !guest.email) {
      failedCount++;
      continue;
    }
    if (method === 'sms' && !guest.phone) {
      failedCount++;
      continue;
    }

    db.addInvitation({
      guestId,
      eventId,
      method,
      status: 'sent',
      sentAt: now,
    });

    db.updateGuest(guestId, {
      inviteStatus: 'sent',
      inviteSentAt: now,
      inviteMethod: method,
    });

    successCount++;
  }

  res.json({
    success: true,
    successCount,
    failedCount,
    total: guestIds.length,
  });
});

export default router;
