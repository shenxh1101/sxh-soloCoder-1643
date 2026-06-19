import { Router, type Request, type Response } from 'express';
import { db } from '../db/database.js';

const router = Router();

router.post('/login', (req: Request, res: Response): void => {
  const { username, password } = req.body;

  if (!username || !password) {
    res.status(400).json({ error: '用户名和密码不能为空' });
    return;
  }

  const user = db.getUserByUsername(username);

  if (!user) {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  if (password !== 'admin123' && password !== 'reception123') {
    res.status(401).json({ error: '用户名或密码错误' });
    return;
  }

  const { ...userWithoutPassword } = user;
  res.json({ user: userWithoutPassword, token: `token-${user.id}-${Date.now()}` });
});

router.post('/logout', (_req: Request, res: Response): void => {
  res.json({ message: '登出成功' });
});

export default router;
