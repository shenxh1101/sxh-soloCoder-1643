import { Router, type Request, type Response } from 'express';
import { db } from '../db/database.js';
import type { Event } from '../../shared/types.js';

const router = Router();

router.get('/', (_req: Request, res: Response): void => {
  const events = db.getEvents();
  res.json(events);
});

router.get('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const event = db.getEventById(id);
  if (!event) {
    res.status(404).json({ error: '活动不存在' });
    return;
  }
  res.json(event);
});

router.post('/', (req: Request, res: Response): void => {
  const { name, startTime, endTime, location, expectedAttendees, description, creatorId } = req.body;

  if (!name || !startTime || !endTime || !location || !expectedAttendees) {
    res.status(400).json({ error: '请填写必填字段' });
    return;
  }

  const eventData: Omit<Event, 'id' | 'createdAt' | 'updatedAt'> = {
    name,
    startTime,
    endTime,
    location,
    expectedAttendees: Number(expectedAttendees),
    description: description || '',
    status: 'upcoming',
    creatorId: creatorId || 'admin-001',
  };

  const newEvent = db.addEvent(eventData);
  res.status(201).json(newEvent);
});

router.put('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const updates = req.body;

  const updated = db.updateEvent(id, updates);
  if (!updated) {
    res.status(404).json({ error: '活动不存在' });
    return;
  }
  res.json(updated);
});

router.delete('/:id', (req: Request, res: Response): void => {
  const { id } = req.params;
  const deleted = db.deleteEvent(id);
  if (!deleted) {
    res.status(404).json({ error: '活动不存在' });
    return;
  }
  res.json({ message: '删除成功' });
});

export default router;
