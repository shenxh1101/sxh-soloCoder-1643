import { Router, type Request, type Response } from 'express';
import { db } from '../db/database.js';
import type { Forum } from '../../shared/types.js';

const router = Router({ mergeParams: true });

router.get('/', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const forums = db.getForumsByEvent(eventId);
  res.json(forums);
});

router.get('/:forumId', (req: Request, res: Response): void => {
  const { forumId } = req.params;
  const forum = db.getForumById(forumId);
  if (!forum) {
    res.status(404).json({ error: '分论坛不存在' });
    return;
  }
  res.json(forum);
});

router.post('/', (req: Request, res: Response): void => {
  const { eventId } = req.params;
  const { name, location, startTime, endTime, description } = req.body;

  if (!name) {
    res.status(400).json({ error: '分论坛名称不能为空' });
    return;
  }

  const forumData: Omit<Forum, 'id' | 'guestIds'> = {
    eventId,
    name,
    location: location || '',
    startTime: startTime || '',
    endTime: endTime || '',
    description: description || '',
  };

  const newForum = db.addForum(forumData);
  res.status(201).json(newForum);
});

router.put('/:forumId', (req: Request, res: Response): void => {
  const { forumId } = req.params;
  const updates = req.body;

  const updated = db.updateForum(forumId, updates);
  if (!updated) {
    res.status(404).json({ error: '分论坛不存在' });
    return;
  }
  res.json(updated);
});

router.delete('/:forumId', (req: Request, res: Response): void => {
  const { forumId } = req.params;
  const deleted = db.deleteForum(forumId);
  if (!deleted) {
    res.status(404).json({ error: '分论坛不存在' });
    return;
  }
  res.json({ message: '删除成功' });
});

router.post('/:forumId/guests', (req: Request, res: Response): void => {
  const { forumId } = req.params;
  const { guestIds } = req.body;

  if (!Array.isArray(guestIds)) {
    res.status(400).json({ error: 'guestIds 必须是数组' });
    return;
  }

  const forum = db.getForumById(forumId);
  if (!forum) {
    res.status(404).json({ error: '分论坛不存在' });
    return;
  }

  const newGuestIds = [...new Set([...forum.guestIds, ...guestIds])];
  const updated = db.updateForum(forumId, { guestIds: newGuestIds });

  res.json(updated);
});

router.delete('/:forumId/guests/:guestId', (req: Request, res: Response): void => {
  const { forumId, guestId } = req.params;

  const result = db.removeGuestFromForum(forumId, guestId);
  if (!result) {
    res.status(404).json({ error: '分论坛不存在' });
    return;
  }

  const forum = db.getForumById(forumId);
  res.json(forum);
});

export default router;
