import crypto from 'crypto';
import jwt, { SignOptions } from 'jsonwebtoken';
import { config } from './config';

const REFRESH_SECRET = `${config.jwtSecret}-refresh`;

export interface AuthUser {
  id: number;
  username: string;
  name: string;
  role: string;
  email: string;
  active: boolean;
}

export interface AuthPayload extends AuthUser {
  iat?: number;
  exp?: number;
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

export function verifyPassword(input: string, storedHash: string): boolean {
  return hashPassword(input) === storedHash;
}

export function createPasswordHash(password: string): string {
  return hashPassword(password);
}

export function createToken(user: AuthUser): string {
  const options: SignOptions = { expiresIn: config.jwtExpiresIn as SignOptions['expiresIn'] };
  return jwt.sign(user, config.jwtSecret, options);
}

export function createRefreshToken(user: AuthUser): string {
  const options: SignOptions = { expiresIn: '30d' as SignOptions['expiresIn'] };
  return jwt.sign(user, REFRESH_SECRET, options);
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, config.jwtSecret) as AuthPayload;
  } catch {
    return null;
  }
}

export function verifyRefreshToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, REFRESH_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export function generateMfaSecret(): string {
  return crypto.randomBytes(20).toString('hex');
}

export function generateTotpCode(secret: string, now = Date.now()): string {
  const counter = Math.floor(now / 30000);
  const data = Buffer.from(String(counter), 'utf8');
  const hash = crypto.createHmac('sha1', secret).update(data).digest();
  const offset = hash[hash.length - 1] & 0x0f;
  const binary = hash.readUInt32BE(offset) & 0x7fffffff;
  return String(binary % 1000000).padStart(6, '0');
}

export function verifyTotp(secret: string, code: string): boolean {
  const current = generateTotpCode(secret, Date.now());
  const previous = generateTotpCode(secret, Date.now() - 30000);
  return code === current || code === previous;
}

export function canAccessModule(role: string, moduleName: string): boolean {
  if (role === 'ADMIN') return true;

  const module = moduleName.toLowerCase();
  switch (module) {
    case 'dashboard':
    case 'inventory':
    case 'filters':
    case 'brakes':
    case 'accessories':
    case 'oil':
      return ['INVENTORY_MANAGER', 'POS_CASHIER', 'SALES_REP', 'ACCOUNTANT'].includes(role);
    case 'pos':
    case 'sale':
      return ['POS_CASHIER', 'SALES_REP', 'INVENTORY_MANAGER'].includes(role);
    case 'debtors':
    case 'customers':
      return ['POS_CASHIER', 'SALES_REP', 'ACCOUNTANT'].includes(role);
    case 'purchasing':
    case 'suppliers':
      return ['INVENTORY_MANAGER', 'ACCOUNTANT'].includes(role);
    case 'accounting':
    case 'expenses':
      return role === 'ACCOUNTANT';
    case 'reports':
      return ['INVENTORY_MANAGER', 'ACCOUNTANT'].includes(role);
    case 'users':
      return role === 'ADMIN';
    case 'settings':
    case 'audit':
      return role === 'ADMIN';
    default:
      return true;
  }
}

export function requireAuth(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const token = authHeader.slice(7);
  const user = verifyToken(token);
  if (!user) {
    res.status(401).json({ error: 'Invalid token' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(roles: string[]) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}

export function requireModuleAccess(moduleName: string) {
  return (req: any, res: any, next: any) => {
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!canAccessModule(req.user.role, moduleName)) {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }

    next();
  };
}
