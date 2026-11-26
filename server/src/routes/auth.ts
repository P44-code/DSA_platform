import { Router, type Response } from 'express';
import * as z from 'zod';
import { SessionModel } from '../models/Session.js';
import { UserModel } from '../models/User.js';
import {
  createSessionToken,
  getSessionExpiry,
  hashPassword,
  hashSessionToken,
  sessionCookieName,
  sessionMaxAgeSeconds,
  verifyPassword,
} from '../services/auth.js';

export const authRouter = Router();

const authBuckets = new Map<string, { count: number; expiresAt: number }>();

authRouter.use('/login', (request, response, next) => {
  const now = Date.now();
  const key = request.ip || 'unknown';
  const bucket = authBuckets.get(key);
  if (!bucket || bucket.expiresAt <= now) {
    authBuckets.set(key, { count: 1, expiresAt: now + 60_000 });
    next();
    return;
  }
  if (bucket.count >= 5) {
    response.setHeader('Retry-After', Math.ceil((bucket.expiresAt - now) / 1000));
    response.status(429).json({ error: 'Too many login attempts. Try again shortly.' });
    return;
  }
  bucket.count += 1;
  next();
});

authRouter.use('/register', (request, response, next) => {
  const now = Date.now();
  const key = request.ip || 'unknown';
  const bucket = authBuckets.get(`register:${key}`);
  if (!bucket || bucket.expiresAt <= now) {
    authBuckets.set(`register:${key}`, { count: 1, expiresAt: now + 300_000 });
    next();
    return;
  }
  if (bucket.count >= 5) {
    response.setHeader('Retry-After', Math.ceil((bucket.expiresAt - now) / 1000));
    response.status(429).json({ error: 'Too many account creation attempts. Try again later.' });
    return;
  }
  bucket.count += 1;
  next();
});

const credentialsSchema = z.object({
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
});

const registrationSchema = credentialsSchema.extend({
  displayName: z.string().trim().min(2).max(60),
});

function setSessionCookie(response: Response, token: string) {
  const production = process.env.NODE_ENV === 'production';
  const secure = production ? '; Secure' : '';
  const sameSite = production ? 'None' : 'Lax';
  response.setHeader(
    'Set-Cookie',
    `${sessionCookieName}=${token}; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=${sessionMaxAgeSeconds}${secure}`,
  );
}

function clearSessionCookie(response: Response) {
  const production = process.env.NODE_ENV === 'production';
  const secure = production ? '; Secure' : '';
  const sameSite = production ? 'None' : 'Lax';
  response.setHeader('Set-Cookie', `${sessionCookieName}=; HttpOnly; SameSite=${sameSite}; Path=/; Max-Age=0${secure}`);
}

function readSessionToken(cookieHeader: string | undefined) {
  const cookie = cookieHeader?.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${sessionCookieName}=`));
  return cookie?.slice(sessionCookieName.length + 1);
}

async function createSession(userId: string, response: Response) {
  const token = createSessionToken();
  await SessionModel.create({
    tokenHash: hashSessionToken(token),
    userId,
    expiresAt: getSessionExpiry(),
  });
  setSessionCookie(response, token);
}

export async function currentUser(cookieHeader: string | undefined) {
  const token = readSessionToken(cookieHeader);
  if (!token) return null;
  const session = await SessionModel.findOne({
    tokenHash: hashSessionToken(token),
    expiresAt: { $gt: new Date() },
  });
  if (!session) return null;
  return UserModel.findById(session.userId, { email: 1, displayName: 1 }).lean();
}

authRouter.post('/register', async (request, response) => {
  const parsed = registrationSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Use a name, valid email, and password with at least 8 characters.' });
    return;
  }

  try {
    const email = parsed.data.email.toLowerCase();
    const existing = await UserModel.exists({ email });
    if (existing) {
      response.status(409).json({ error: 'An account with that email already exists.' });
      return;
    }

    const { salt, hash } = await hashPassword(parsed.data.password);
    const user = await UserModel.create({
      email,
      displayName: parsed.data.displayName,
      passwordHash: hash,
      passwordSalt: salt,
    });
    await createSession(String(user._id), response);
    response.status(201).json({ user: { email: user.email, displayName: user.displayName } });
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 11000) {
      response.status(409).json({ error: 'An account with that email already exists.' });
      return;
    }
    response.status(503).json({ error: 'Account creation is currently unavailable.' });
  }
});

authRouter.post('/login', async (request, response) => {
  const parsed = credentialsSchema.safeParse(request.body);
  if (!parsed.success) {
    response.status(400).json({ error: 'Enter a valid email and password.' });
    return;
  }

  try {
    const user = await UserModel.findOne({ email: parsed.data.email.toLowerCase() }).select('+passwordHash +passwordSalt');
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordSalt, user.passwordHash))) {
      response.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }
    await createSession(String(user._id), response);
    response.json({ user: { email: user.email, displayName: user.displayName } });
  } catch {
    response.status(503).json({ error: 'Login is currently unavailable.' });
  }
});

authRouter.get('/me', async (request, response) => {
  try {
    const user = await currentUser(request.headers.cookie);
    response.json({ user });
  } catch {
    response.status(503).json({ error: 'Authentication service unavailable.' });
  }
});

authRouter.post('/logout', async (request, response) => {
  const token = readSessionToken(request.headers.cookie);
  if (token) {
    try {
      await SessionModel.deleteOne({ tokenHash: hashSessionToken(token) });
    } catch {
      // Always clear the browser cookie even if session cleanup fails.
    }
  }
  clearSessionCookie(response);
  response.status(204).send();
});
