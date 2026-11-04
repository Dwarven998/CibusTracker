import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { db, UserRecord } from '../db';
import { AuthenticatedRequest, requireAuth, signToken } from '../middleware/auth';
import { realtimeHub } from '../ws';

const router = Router();

function sanitizeUser(user: UserRecord) {
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

router.post('/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required.' });
    return;
  }

  const user = db.state.users.find((u) => u.email.toLowerCase() === String(email).toLowerCase().trim());
  if (!user || !bcrypt.compareSync(String(password), user.passwordHash)) {
    res.status(401).json({ error: 'Invalid email or password.' });
    return;
  }

  if (user.status !== 'ACTIVE') {
    res.status(403).json({ error: `Your account is ${user.status.toLowerCase()}. Please contact CIBUS Cebu Administration.` });
    return;
  }

  const token = signToken(user);
  res.json({
    token,
    user: sanitizeUser(user),
  });
});

router.post('/register', (req: Request, res: Response) => {
  const { email, phone, password, fullName, discountType } = req.body;
  if (!email || !phone || !password || !fullName) {
    res.status(400).json({ error: 'Full name, email, phone number, and password are required.' });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  if (db.state.users.some((u) => u.email.toLowerCase() === normalizedEmail)) {
    res.status(409).json({ error: 'An account with this email already exists.' });
    return;
  }

  const newUser: UserRecord = {
    id: `user-pax-${Date.now()}`,
    email: normalizedEmail,
    phone: String(phone).trim(),
    passwordHash: bcrypt.hashSync(String(password), 10),
    fullName: String(fullName).trim(),
    role: 'PASSENGER',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
    discountType: ['REGULAR', 'STUDENT', 'SENIOR', 'PWD'].includes(discountType) ? discountType : 'REGULAR',
  };

  db.state.users.push(newUser);
  db.save();
  realtimeHub.broadcast('ADMIN_CONFIG_UPDATED');

  const token = signToken(newUser);
  res.status(201).json({
    token,
    user: sanitizeUser(newUser),
  });
});

router.get('/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  res.json({ user: sanitizeUser(req.user) });
});

router.put('/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated' });
    return;
  }
  const { fullName, phone, discountType } = req.body;
  if (fullName) req.user.fullName = String(fullName).trim();
  if (phone) req.user.phone = String(phone).trim();
  if (discountType && ['REGULAR', 'STUDENT', 'SENIOR', 'PWD'].includes(discountType)) {
    req.user.discountType = discountType;
  }
  db.save();
  res.json({ user: sanitizeUser(req.user) });
});

export default router;

