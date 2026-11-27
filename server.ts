import 'dotenv/config';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const HOST = '0.0.0.0';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Load public Firebase web configuration (projectId, apiKey, firestoreDatabaseId)
interface FirebaseAppletConfig {
  projectId: string;
  apiKey: string;
  firestoreDatabaseId: string;
}

const firebaseConfigPath = path.resolve(__dirname, 'firebase-applet-config.json');
const firebaseConfig: FirebaseAppletConfig = JSON.parse(
  fs.readFileSync(firebaseConfigPath, 'utf8')
);

// Configurable idle timeout: default 30 minutes (1_800_000 ms)
const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const parsedIdleTimeout = Number(process.env.SESSION_IDLE_TIMEOUT_MS);
const IDLE_TIMEOUT_MS =
  Number.isFinite(parsedIdleTimeout) && parsedIdleTimeout >= 1000
    ? Math.floor(parsedIdleTimeout)
    : DEFAULT_IDLE_TIMEOUT_MS;

// Absolute maximum session lifetime: default 12 hours
const DEFAULT_MAX_LIFETIME_MS = 12 * 60 * 60 * 1000;
const parsedMaxLifetime = Number(process.env.SESSION_MAX_LIFETIME_MS);
const MAX_SESSION_LIFETIME_MS =
  Number.isFinite(parsedMaxLifetime) && parsedMaxLifetime >= IDLE_TIMEOUT_MS
    ? Math.floor(parsedMaxLifetime)
    : DEFAULT_MAX_LIFETIME_MS;

// Warning lead time: 1 minute before logout
const WARNING_LEAD_MS = Math.min(60 * 1000, Math.floor(IDLE_TIMEOUT_MS / 2));

const SESSION_COOKIE_NAME = 'gebaco_sid';
const SESSION_EXPIRED_MESSAGE = "Votre session a expiré pour cause d'inactivité";
const GENERIC_AUTH_ERROR =
  'Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.';
const RATE_LIMIT_ERROR =
  'Trop de tentatives infructueuses. Veuillez patienter avant de réessayer.';

// Rate limit settings (sliding window)
const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS_PER_ACCOUNT = 5;
const MAX_ATTEMPTS_PER_IP = 20;

// Signing key from environment or ephemeral 256-bit in-memory secret
const SESSION_SIGNING_KEY =
  process.env.SESSION_SECRET && process.env.SESSION_SECRET.trim().length >= 16
    ? process.env.SESSION_SECRET.trim()
    : crypto.randomBytes(32).toString('hex');

const ADMIN_DEFAULT_EMAIL = 'jnoufe@gmail.com';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const USER_ID_PATTERN = /^[a-zA-Z0-9._-]{1,128}$/;

interface ServerRoleRecord {
  id: string;
  name: string;
  isPredefined: boolean;
  permissions: string[];
}

interface ServerUserRecord {
  id: string;
  businessId: string;
  name: string;
  email: string;
  roleId: string;
  locationIds: string[];
  isActive: boolean;
  passwordHash?: string;
  passwordUpdatedAt?: string;
}

interface SessionRecord {
  sid: string;
  userId: string;
  email: string;
  roleId: string;
  businessId: string;
  permissions: string[];
  createdAt: number;
  lastActivity: number;
}

interface RateLimitEntry {
  count: number;
  windowStart: number;
  lockedUntil: number;
}

interface AuthenticatedRequest extends Request {
  authSession?: SessionRecord;
  authToken?: string;
}

const activeSessions = new Map<string, SessionRecord>();
const revokedSessions = new Map<string, number>();
const rateLimits = new Map<string, RateLimitEntry>();

const serverRolesById = new Map<string, ServerRoleRecord>([
  [
    'role-admin',
    {
      id: 'role-admin',
      name: 'Administrateur',
      isPredefined: true,
      permissions: [
        'manage_businesses',
        'manage_locations',
        'manage_users',
        'manage_roles',
        'view_contacts',
        'manage_contacts',
        'view_products',
        'manage_products',
        'view_purchases',
        'manage_purchases',
        'access_pos',
        'view_sales',
        'manage_sales',
        'view_expenses',
        'manage_expenses',
        'view_reports',
        'adjust_stock',
        'print_barcodes',
        'manage_settings',
      ],
    },
  ],
  [
    'role-cashier',
    {
      id: 'role-cashier',
      name: 'Caissier / Vendeur',
      isPredefined: true,
      permissions: [
        'access_pos',
        'view_sales',
        'manage_sales',
        'view_contacts',
        'manage_contacts',
        'view_products',
      ],
    },
  ],
  [
    'role-stock',
    {
      id: 'role-stock',
      name: 'Responsable Stock',
      isPredefined: false,
      permissions: [
        'view_products',
        'manage_products',
        'view_purchases',
        'manage_purchases',
        'adjust_stock',
        'print_barcodes',
      ],
    },
  ],
]);

const serverUsersByEmail = new Map<string, ServerUserRecord>([
  [
    ADMIN_DEFAULT_EMAIL,
    {
      id: 'usr-firebase-admin',
      businessId: 'biz-1',
      name: 'Administrateur Firebase',
      email: ADMIN_DEFAULT_EMAIL,
      roleId: 'role-admin',
      locationIds: [],
      isActive: true,
    },
  ],
]);

// =========================================================================
// SERVER-SIDE PASSWORD HASHING (crypto.scrypt + legacy PBKDF2 compatibility)
// =========================================================================

const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const SCRYPT_KEYLEN = 64;

function scryptAsync(
  password: string,
  salt: string,
  keylen: number,
  options: crypto.ScryptOptions
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, keylen, options, (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

function pbkdf2Async(
  password: string,
  salt: Buffer,
  iterations: number,
  keylen: number
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(password, salt, iterations, keylen, 'sha256', (err, derivedKey) => {
      if (err) reject(err);
      else resolve(derivedKey);
    });
  });
}

async function hashPasswordScrypt(plainPassword: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = await scryptAsync(plainPassword, salt, SCRYPT_KEYLEN, {
    N: SCRYPT_N,
    r: SCRYPT_R,
    p: SCRYPT_P,
  });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt}$${derived.toString('hex')}`;
}

async function verifyStoredPasswordHash(
  plainPassword: string,
  storedHash: string
): Promise<{ valid: boolean; needsUpgrade: boolean }> {
  if (!plainPassword || !storedHash || typeof storedHash !== 'string') {
    return { valid: false, needsUpgrade: false };
  }

  const parts = storedHash.split('$');
  if (parts[0] === 'scrypt' && parts.length === 6) {
    const N = Number(parts[1]);
    const r = Number(parts[2]);
    const p = Number(parts[3]);
    const salt = parts[4];
    const expectedHex = parts[5];
    if (!Number.isFinite(N) || !Number.isFinite(r) || !Number.isFinite(p) || !salt || !expectedHex) {
      return { valid: false, needsUpgrade: false };
    }
    const expected = Buffer.from(expectedHex, 'hex');
    if (expected.length === 0) return { valid: false, needsUpgrade: false };

    const derived = await scryptAsync(plainPassword, salt, expected.length, { N, r, p });
    const valid =
      derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
    return { valid, needsUpgrade: false };
  }

  if (parts[0] === 'pbkdf2' && parts.length === 4) {
    const iterations = Number(parts[1]);
    const saltHex = parts[2];
    const expectedHex = parts[3];
    if (!Number.isFinite(iterations) || iterations < 10000 || !saltHex || !expectedHex) {
      return { valid: false, needsUpgrade: false };
    }
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(expectedHex, 'hex');
    if (salt.length === 0 || expected.length === 0) {
      return { valid: false, needsUpgrade: false };
    }
    const derived = await pbkdf2Async(plainPassword, salt, iterations, expected.length);
    const valid =
      derived.length === expected.length && crypto.timingSafeEqual(derived, expected);
    return { valid, needsUpgrade: valid };
  }

  return { valid: false, needsUpgrade: false };
}

// Pre-computed dummy scrypt hash to keep response timing uniform when a user is absent
let dummyScryptHashPromise: Promise<string> | null = null;
function getDummyScryptHash(): Promise<string> {
  if (!dummyScryptHashPromise) {
    dummyScryptHashPromise = hashPasswordScrypt(crypto.randomBytes(24).toString('hex'));
  }
  return dummyScryptHashPromise;
}

// =========================================================================
// FIRESTORE DIRECTORY & CREDENTIAL SYNCHRONIZATION
// =========================================================================

function getFirestoreBaseUrl(): string {
  return `https://firestore.googleapis.com/v1/projects/${firebaseConfig.projectId}/databases/${firebaseConfig.firestoreDatabaseId}/documents`;
}

function readFirestoreString(field: any): string | undefined {
  return typeof field?.stringValue === 'string' ? field.stringValue : undefined;
}

function readFirestoreBool(field: any): boolean | undefined {
  return typeof field?.booleanValue === 'boolean' ? field.booleanValue : undefined;
}

let lastDirectorySyncAt = 0;

async function syncDirectoryFromFirestore(force = false): Promise<void> {
  const now = Date.now();
  if (!force && now - lastDirectorySyncAt < 5000) return;
  lastDirectorySyncAt = now;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      // 1. Load roles & users from master_erp_state
      const masterRes = await fetch(`${getFirestoreBaseUrl()}/erp_state/master_erp_state`, {
        signal: controller.signal,
      });
      if (masterRes.ok) {
        const masterDoc = (await masterRes.json()) as any;
        const payloadStr = readFirestoreString(masterDoc?.fields?.payload);
        if (payloadStr) {
          const parsed = JSON.parse(payloadStr);
          if (Array.isArray(parsed?.roles)) {
            for (const r of parsed.roles) {
              if (r && typeof r.id === 'string' && Array.isArray(r.permissions)) {
                const existing = serverRolesById.get(r.id);
                if (!existing?.isPredefined) {
                  serverRolesById.set(r.id, {
                    id: r.id,
                    name: String(r.name || r.id),
                    isPredefined: Boolean(r.isPredefined),
                    permissions: r.permissions.filter((p: unknown) => typeof p === 'string'),
                  });
                }
              }
            }
          }

          if (Array.isArray(parsed?.users)) {
            for (const u of parsed.users) {
              if (u && typeof u.email === 'string' && typeof u.id === 'string') {
                const emailKey = u.email.trim().toLowerCase();
                const existing = serverUsersByEmail.get(emailKey);
                // Preserve stronger server scrypt hash if already present
                const resolvedHash =
                  existing?.passwordHash?.startsWith('scrypt$')
                    ? existing.passwordHash
                    : typeof u.passwordHash === 'string'
                    ? u.passwordHash
                    : existing?.passwordHash;

                serverUsersByEmail.set(emailKey, {
                  id: u.id,
                  businessId: String(u.businessId || existing?.businessId || 'biz-1'),
                  name: String(u.name || existing?.name || emailKey),
                  email: emailKey,
                  roleId: String(u.roleId || existing?.roleId || 'role-cashier'),
                  locationIds: Array.isArray(u.locationIds) ? u.locationIds : [],
                  isActive: u.isActive !== false,
                  passwordHash: resolvedHash,
                  passwordUpdatedAt: u.passwordUpdatedAt || existing?.passwordUpdatedAt,
                });
              }
            }
          }
        }
      }

      // 2. Load individual server-persisted user credential documents from /users
      const usersRes = await fetch(`${getFirestoreBaseUrl()}/users?pageSize=200`, {
        signal: controller.signal,
      });
      if (usersRes.ok) {
        const usersList = (await usersRes.json()) as any;
        if (Array.isArray(usersList?.documents)) {
          for (const docItem of usersList.documents) {
            const fields = docItem?.fields;
            if (!fields) continue;
            const email = readFirestoreString(fields.email)?.trim().toLowerCase();
            const id = readFirestoreString(fields.id) || String(docItem.name || '').split('/').pop();
            if (!email || !id) continue;

            const existing = serverUsersByEmail.get(email);
            const cloudHash = readFirestoreString(fields.passwordHash);
            const resolvedHash =
              existing?.passwordHash?.startsWith('scrypt$')
                ? existing.passwordHash
                : cloudHash || existing?.passwordHash;

            serverUsersByEmail.set(email, {
              id,
              businessId: readFirestoreString(fields.businessId) || existing?.businessId || 'biz-1',
              name: readFirestoreString(fields.name) || existing?.name || email,
              email,
              roleId: readFirestoreString(fields.roleId) || existing?.roleId || 'role-cashier',
              locationIds: existing?.locationIds || [],
              isActive: readFirestoreBool(fields.isActive) ?? existing?.isActive ?? true,
              passwordHash: resolvedHash,
              passwordUpdatedAt:
                readFirestoreString(fields.passwordUpdatedAt) || existing?.passwordUpdatedAt,
            });
          }
        }
      }
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    // Graceful offline / unreachable Firestore fallback
  }
}

async function persistUserCredentialToFirestore(user: ServerUserRecord): Promise<void> {
  if (!USER_ID_PATTERN.test(user.id)) return;
  try {
    const query = [
      'updateMask.fieldPaths=id',
      'updateMask.fieldPaths=email',
      'updateMask.fieldPaths=name',
      'updateMask.fieldPaths=businessId',
      'updateMask.fieldPaths=roleId',
      'updateMask.fieldPaths=isActive',
      ...(user.passwordHash ? ['updateMask.fieldPaths=passwordHash'] : []),
      ...(user.passwordUpdatedAt ? ['updateMask.fieldPaths=passwordUpdatedAt'] : []),
    ].join('&');

    const fields: Record<string, any> = {
      id: { stringValue: user.id },
      email: { stringValue: user.email },
      name: { stringValue: user.name },
      businessId: { stringValue: user.businessId },
      roleId: { stringValue: user.roleId },
      isActive: { booleanValue: user.isActive },
    };
    if (user.passwordHash) {
      fields.passwordHash = { stringValue: user.passwordHash };
    }
    if (user.passwordUpdatedAt) {
      fields.passwordUpdatedAt = { stringValue: user.passwordUpdatedAt };
    }

    await fetch(`${getFirestoreBaseUrl()}/users/${encodeURIComponent(user.id)}?${query}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ fields }),
    });
  } catch {
    // Offline fallback: serverUsersByEmail retains credential in memory
  }
}

async function verifyFirebaseIdTokenWithGoogle(idToken: string): Promise<{
  valid: boolean;
  email?: string;
  displayName?: string;
  photoURL?: string;
}> {
  if (!idToken || idToken.length < 50 || idToken.length > 8192) {
    return { valid: false };
  }

  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      }
    );
    if (!res.ok) return { valid: false };
    const data = (await res.json()) as any;
    const fbUser = Array.isArray(data?.users) ? data.users[0] : null;
    if (!fbUser || typeof fbUser.email !== 'string') {
      return { valid: false };
    }
    return {
      valid: true,
      email: fbUser.email.trim().toLowerCase(),
      displayName: typeof fbUser.displayName === 'string' ? fbUser.displayName : undefined,
      photoURL: typeof fbUser.photoUrl === 'string' ? fbUser.photoUrl : undefined,
    };
  } catch {
    return { valid: false };
  }
}

async function verifyFirebaseEmailPasswordWithGoogle(
  email: string,
  password: string
): Promise<{ valid: boolean; email?: string }> {
  try {
    const res = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseConfig.apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }),
      }
    );
    if (!res.ok) return { valid: false };
    const data = (await res.json()) as any;
    if (typeof data?.email !== 'string') return { valid: false };
    return { valid: true, email: data.email.trim().toLowerCase() };
  } catch {
    return { valid: false };
  }
}

// =========================================================================
// RATE LIMITING & SESSION LIFECYCLE HELPERS
// =========================================================================

function getClientIp(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function checkRateLimit(keys: string[]): { blocked: boolean; retryAfterSec: number } {
  const now = Date.now();
  let maxRetryMs = 0;

  for (const key of keys) {
    const entry = rateLimits.get(key);
    if (!entry) continue;
    if (entry.lockedUntil > now) {
      maxRetryMs = Math.max(maxRetryMs, entry.lockedUntil - now);
    } else if (now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimits.delete(key);
    }
  }

  if (maxRetryMs > 0) {
    return { blocked: true, retryAfterSec: Math.max(1, Math.ceil(maxRetryMs / 1000)) };
  }
  return { blocked: false, retryAfterSec: 0 };
}

function recordFailedAttempt(key: string, maxAttempts: number): void {
  const now = Date.now();
  const entry = rateLimits.get(key);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
    rateLimits.set(key, { count: 1, windowStart: now, lockedUntil: 0 });
    return;
  }
  entry.count += 1;
  if (entry.count >= maxAttempts) {
    entry.lockedUntil = now + RATE_LIMIT_WINDOW_MS;
  }
}

function clearRateLimit(keys: string[]): void {
  for (const key of keys) {
    rateLimits.delete(key);
  }
}

// Periodic cleanup of expired sessions & stale rate-limit windows
const sweepInterval = setInterval(() => {
  const now = Date.now();
  for (const [sid, session] of activeSessions.entries()) {
    if (
      now - session.lastActivity > IDLE_TIMEOUT_MS ||
      now - session.createdAt > MAX_SESSION_LIFETIME_MS
    ) {
      activeSessions.delete(sid);
    }
  }
  for (const [sid, revokedAt] of revokedSessions.entries()) {
    if (now - revokedAt > IDLE_TIMEOUT_MS * 2) {
      revokedSessions.delete(sid);
    }
  }
  for (const [key, entry] of rateLimits.entries()) {
    if (entry.lockedUntil <= now && now - entry.windowStart > RATE_LIMIT_WINDOW_MS) {
      rateLimits.delete(key);
    }
  }
}, 60 * 1000);
sweepInterval.unref();

function signSessionId(sid: string): string {
  const hmac = crypto.createHmac('sha256', SESSION_SIGNING_KEY).update(sid).digest('hex');
  return `${sid}.${hmac}`;
}

function verifySignedToken(token: string): string | null {
  if (!token || typeof token !== 'string') return null;
  const dotIndex = token.indexOf('.');
  if (dotIndex <= 0 || dotIndex === token.length - 1) return null;

  const sid = token.slice(0, dotIndex);
  const providedHmac = token.slice(dotIndex + 1);
  if (!/^[a-f0-9]{32,64}$/i.test(sid) || !/^[a-f0-9]{64}$/i.test(providedHmac)) {
    return null;
  }

  const expectedHmac = crypto
    .createHmac('sha256', SESSION_SIGNING_KEY)
    .update(sid)
    .digest('hex');

  const providedBuf = Buffer.from(providedHmac, 'hex');
  const expectedBuf = Buffer.from(expectedHmac, 'hex');
  if (providedBuf.length !== expectedBuf.length) return null;
  if (!crypto.timingSafeEqual(providedBuf, expectedBuf)) return null;

  return sid;
}

function parseCookies(cookieHeader: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx <= 0) continue;
    const key = pair.slice(0, idx).trim();
    const rawVal = pair.slice(idx + 1).trim();
    try {
      cookies[key] = decodeURIComponent(rawVal);
    } catch {
      cookies[key] = rawVal;
    }
  }
  return cookies;
}

function setSessionCookie(res: Response, token: string): void {
  const maxAgeSec = Math.max(86400, Math.ceil((IDLE_TIMEOUT_MS * 2) / 1000));
  const cookieValue = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    `Max-Age=${maxAgeSec}`,
  ].join('; ');
  res.setHeader('Set-Cookie', cookieValue);
}

function clearSessionCookie(res: Response): void {
  const cookieValue = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
    'Max-Age=0',
    'Expires=Thu, 01 Jan 1970 00:00:00 GMT',
  ].join('; ');
  res.setHeader('Set-Cookie', cookieValue);
}

function extractRequestToken(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return bearer;
  }
  const cookies = parseCookies(req.headers.cookie);
  return cookies[SESSION_COOKIE_NAME] || null;
}

function resolvePermissionsForRole(roleId: string): string[] {
  const role = serverRolesById.get(roleId);
  if (role) return [...role.permissions];
  // Least-privilege fallback if role ID is unknown
  const cashier = serverRolesById.get('role-cashier');
  return cashier ? [...cashier.permissions] : [];
}

function issueRegeneratedSession(
  req: Request,
  res: Response,
  user: ServerUserRecord
): { token: string; session: SessionRecord } {
  const previousToken = extractRequestToken(req);
  if (previousToken) {
    const prevSid = verifySignedToken(previousToken);
    if (prevSid) {
      activeSessions.delete(prevSid);
      revokedSessions.set(prevSid, Date.now());
    }
  }

  const now = Date.now();
  const sid = crypto.randomBytes(24).toString('hex');
  const permissions = resolvePermissionsForRole(user.roleId);

  const session: SessionRecord = {
    sid,
    userId: user.id,
    email: user.email,
    roleId: user.roleId,
    businessId: user.businessId,
    permissions,
    createdAt: now,
    lastActivity: now,
  };
  activeSessions.set(sid, session);

  const token = signSessionId(sid);
  setSessionCookie(res, token);
  return { token, session };
}

function isSameOriginMutationAllowed(req: Request): boolean {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return true;
  }

  const origin = req.headers.origin;
  const host = (req.headers['x-forwarded-host'] || req.headers.host || '') as string;

  if (typeof origin === 'string' && origin.length > 0 && host) {
    try {
      const originHost = new URL(origin).host;
      if (originHost !== host) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const hasBearer =
    typeof req.headers.authorization === 'string' && req.headers.authorization.startsWith('Bearer ');
  const hasFetchHeader = req.headers['x-requested-with'] === 'fetch';
  const isJson =
    typeof req.headers['content-type'] === 'string' &&
    req.headers['content-type'].toLowerCase().includes('application/json');

  return hasBearer || hasFetchHeader || isJson;
}

function verifyOriginMiddleware(req: Request, res: Response, next: NextFunction): void {
  if (!isSameOriginMutationAllowed(req)) {
    res.status(403).json({
      code: 'FORBIDDEN_ORIGIN',
      message: 'Requête refusée : origine ou en-tête de sécurité invalide.',
    });
    return;
  }
  next();
}

function requireActiveSession(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const token = extractRequestToken(req);
  if (!token) {
    res.status(401).json({
      code: 'UNAUTHENTICATED',
      authenticated: false,
      message: 'Authentification requise.',
    });
    return;
  }

  const sid = verifySignedToken(token);
  if (!sid) {
    clearSessionCookie(res);
    res.status(401).json({
      code: 'SESSION_EXPIRED',
      authenticated: false,
      message: SESSION_EXPIRED_MESSAGE,
    });
    return;
  }

  if (revokedSessions.has(sid)) {
    clearSessionCookie(res);
    res.status(401).json({
      code: 'SESSION_REVOKED',
      authenticated: false,
      message: 'Votre session a été fermée.',
    });
    return;
  }

  const session = activeSessions.get(sid);
  if (!session) {
    clearSessionCookie(res);
    res.status(401).json({
      code: 'SESSION_EXPIRED',
      authenticated: false,
      message: SESSION_EXPIRED_MESSAGE,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
    });
    return;
  }

  const now = Date.now();
  if (
    now - session.lastActivity > IDLE_TIMEOUT_MS ||
    now - session.createdAt > MAX_SESSION_LIFETIME_MS
  ) {
    activeSessions.delete(sid);
    clearSessionCookie(res);
    res.status(401).json({
      code: 'SESSION_EXPIRED',
      authenticated: false,
      message: SESSION_EXPIRED_MESSAGE,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
    });
    return;
  }

  // Update last_activity timestamp on every valid authenticated request
  session.lastActivity = now;
  setSessionCookie(res, token);

  req.authSession = session;
  req.authToken = token;
  next();
}

function requirePermission(permission: string) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    const session = req.authSession;
    if (!session) {
      res.status(401).json({
        code: 'UNAUTHENTICATED',
        message: 'Authentification requise.',
      });
      return;
    }

    // Re-resolve permissions from authoritative server role record
    const effectivePermissions = resolvePermissionsForRole(session.roleId);
    if (!effectivePermissions.includes(permission)) {
      res.status(403).json({
        code: 'FORBIDDEN',
        message: 'Accès refusé : permission insuffisante pour effectuer cette action.',
      });
      return;
    }

    next();
  };
}

async function createApp() {
  const app = express();
  app.set('trust proxy', 1);
  app.disable('x-powered-by');
  app.use(express.json({ limit: '1mb' }));

  // Defensive security headers (no X-Frame-Options to preserve AI Studio iframe preview)
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });

  // Prime Firestore user/role directory in background on startup
  void syncDirectoryFromFirestore(true);

  // Enforce CSRF / Origin check on all /api state-changing calls
  app.use('/api', verifyOriginMiddleware);

  // Public health check (no secrets exposed)
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      ok: true,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      warningLeadMs: WARNING_LEAD_MS,
    });
  });

  // Server-verified email + password login with rate limiting, scrypt, and uniform anti-enumeration errors
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body.password === 'string' ? body.password : '';

    if (!email || email.length > 254 || !EMAIL_PATTERN.test(email) || password.length < 8 || password.length > 256) {
      res.status(400).json({
        code: 'INVALID_INPUT',
        message: GENERIC_AUTH_ERROR,
      });
      return;
    }

    const ip = getClientIp(req);
    const ipKey = `ip:${ip}`;
    const acctKey = `acct:${ip}:${email}`;

    const limitCheck = checkRateLimit([ipKey, acctKey]);
    if (limitCheck.blocked) {
      res.setHeader('Retry-After', String(limitCheck.retryAfterSec));
      res.status(429).json({
        code: 'RATE_LIMITED',
        message: RATE_LIMIT_ERROR,
      });
      return;
    }

    await syncDirectoryFromFirestore(false);
    let user = serverUsersByEmail.get(email);
    if (!user) {
      await syncDirectoryFromFirestore(true);
      user = serverUsersByEmail.get(email);
    }

    let authenticated = false;

    if (user?.passwordHash) {
      const check = await verifyStoredPasswordHash(password, user.passwordHash);
      authenticated = check.valid;
      if (check.valid && check.needsUpgrade) {
        // Transparently upgrade legacy PBKDF2 hash to scrypt on server
        const upgradedHash = await hashPasswordScrypt(password);
        user.passwordHash = upgradedHash;
        user.passwordUpdatedAt = new Date().toISOString();
        void persistUserCredentialToFirestore(user);
      }
    } else {
      // Uniform timing mitigation when user/hash is absent
      const dummyHash = await getDummyScryptHash();
      await verifyStoredPasswordHash(password, dummyHash);

      // Fallback to Firebase Auth Email/Password verification on server
      const fbCheck = await verifyFirebaseEmailPasswordWithGoogle(email, password);
      if (fbCheck.valid && fbCheck.email) {
        authenticated = true;
        if (!user) {
          const isDefaultAdmin = fbCheck.email === ADMIN_DEFAULT_EMAIL;
          user = {
            id: isDefaultAdmin ? 'usr-firebase-admin' : `usr-${Date.now()}`,
            businessId: 'biz-1',
            name: fbCheck.email.split('@')[0] || 'Utilisateur',
            email: fbCheck.email,
            roleId: isDefaultAdmin ? 'role-admin' : 'role-cashier',
            locationIds: ['all'],
            isActive: true,
          };
          serverUsersByEmail.set(fbCheck.email, user);
        }
      }
    }

    if (!authenticated || !user || user.isActive === false) {
      recordFailedAttempt(ipKey, MAX_ATTEMPTS_PER_IP);
      recordFailedAttempt(acctKey, MAX_ATTEMPTS_PER_ACCOUNT);
      res.status(401).json({
        code: 'INVALID_CREDENTIALS',
        message: GENERIC_AUTH_ERROR,
      });
      return;
    }

    clearRateLimit([acctKey]);
    const { token, session } = issueRegeneratedSession(req, res, user);

    res.status(200).json({
      authenticated: true,
      token,
      userId: session.userId,
      email: session.email,
      roleId: session.roleId,
      businessId: session.businessId,
      permissions: session.permissions,
      lastActivity: session.lastActivity,
      expiresAt: session.lastActivity + IDLE_TIMEOUT_MS,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      warningLeadMs: WARNING_LEAD_MS,
    });
  });

  // Exchange a verified Firebase ID Token for a server session (never trusts unverified email/userId)
  app.post('/api/auth/session', async (req: Request, res: Response) => {
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const firebaseIdToken = typeof body.firebaseIdToken === 'string' ? body.firebaseIdToken.trim() : '';

    const ip = getClientIp(req);
    const ipKey = `session-ip:${ip}`;
    const limitCheck = checkRateLimit([ipKey]);
    if (limitCheck.blocked) {
      res.setHeader('Retry-After', String(limitCheck.retryAfterSec));
      res.status(429).json({
        code: 'RATE_LIMITED',
        message: RATE_LIMIT_ERROR,
      });
      return;
    }

    const verified = await verifyFirebaseIdTokenWithGoogle(firebaseIdToken);
    if (!verified.valid || !verified.email) {
      recordFailedAttempt(ipKey, MAX_ATTEMPTS_PER_IP);
      res.status(401).json({
        code: 'INVALID_TOKEN',
        message: 'Jeton d’authentification Firebase invalide ou expiré.',
      });
      return;
    }

    await syncDirectoryFromFirestore(false);
    let user = serverUsersByEmail.get(verified.email);
    if (!user) {
      const isAdminEmail = verified.email === ADMIN_DEFAULT_EMAIL;
      user = {
        id: isAdminEmail ? 'usr-firebase-admin' : `usr-${Date.now()}`,
        businessId: 'biz-1',
        name: verified.displayName || verified.email.split('@')[0] || 'Utilisateur',
        email: verified.email,
        // Least privilege for newly created non-admin Google accounts
        roleId: isAdminEmail ? 'role-admin' : 'role-cashier',
        locationIds: ['all'],
        isActive: true,
      };
      serverUsersByEmail.set(verified.email, user);
    }

    if (user.isActive === false) {
      res.status(403).json({
        code: 'ACCOUNT_DISABLED',
        message: GENERIC_AUTH_ERROR,
      });
      return;
    }

    clearRateLimit([ipKey]);
    const { token, session } = issueRegeneratedSession(req, res, user);

    res.status(201).json({
      authenticated: true,
      token,
      userId: session.userId,
      email: session.email,
      roleId: session.roleId,
      businessId: session.businessId,
      permissions: session.permissions,
      lastActivity: session.lastActivity,
      expiresAt: session.lastActivity + IDLE_TIMEOUT_MS,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      warningLeadMs: WARNING_LEAD_MS,
    });
  });

  // Validate current session & update last_activity
  app.get('/api/auth/session', requireActiveSession, (req: AuthenticatedRequest, res: Response) => {
    const session = req.authSession!;
    res.json({
      authenticated: true,
      token: req.authToken,
      userId: session.userId,
      email: session.email,
      roleId: session.roleId,
      businessId: session.businessId,
      permissions: resolvePermissionsForRole(session.roleId),
      lastActivity: session.lastActivity,
      expiresAt: session.lastActivity + IDLE_TIMEOUT_MS,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      warningLeadMs: WARNING_LEAD_MS,
    });
  });

  // Keepalive / activity renewal endpoint ("Rester connecté" & throttled activity sync)
  app.post('/api/auth/ping', requireActiveSession, (req: AuthenticatedRequest, res: Response) => {
    const session = req.authSession!;
    res.json({
      ok: true,
      authenticated: true,
      lastActivity: session.lastActivity,
      expiresAt: session.lastActivity + IDLE_TIMEOUT_MS,
      idleTimeoutMs: IDLE_TIMEOUT_MS,
      warningLeadMs: WARNING_LEAD_MS,
    });
  });

  // Server-enforced RBAC: only administrators with 'manage_users' can switch active user context
  app.post(
    '/api/auth/switch-user',
    requireActiveSession,
    requirePermission('manage_users'),
    async (req: AuthenticatedRequest, res: Response) => {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';

      if (!USER_ID_PATTERN.test(targetUserId)) {
        res.status(400).json({
          code: 'INVALID_INPUT',
          message: 'Identifiant utilisateur cible invalide.',
        });
        return;
      }

      await syncDirectoryFromFirestore(false);
      const targetUser = Array.from(serverUsersByEmail.values()).find((u) => u.id === targetUserId);
      if (!targetUser || targetUser.isActive === false) {
        res.status(404).json({
          code: 'USER_NOT_FOUND',
          message: 'Utilisateur cible introuvable ou inactif.',
        });
        return;
      }

      const { token, session } = issueRegeneratedSession(req, res, targetUser);
      res.json({
        authenticated: true,
        token,
        userId: session.userId,
        email: session.email,
        roleId: session.roleId,
        businessId: session.businessId,
        permissions: session.permissions,
        lastActivity: session.lastActivity,
        expiresAt: session.lastActivity + IDLE_TIMEOUT_MS,
        idleTimeoutMs: IDLE_TIMEOUT_MS,
        warningLeadMs: WARNING_LEAD_MS,
      });
    }
  );

  // Server-enforced RBAC: create/update user credential & scrypt hash (requires 'manage_users')
  app.post(
    '/api/admin/users/password',
    requireActiveSession,
    requirePermission('manage_users'),
    async (req: AuthenticatedRequest, res: Response) => {
      const body = req.body && typeof req.body === 'object' ? req.body : {};
      const userId = typeof body.userId === 'string' ? body.userId.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const businessId = typeof body.businessId === 'string' ? body.businessId.trim() : 'biz-1';
      const roleId = typeof body.roleId === 'string' ? body.roleId.trim() : 'role-cashier';
      const isActive = typeof body.isActive === 'boolean' ? body.isActive : true;
      const password = typeof body.password === 'string' ? body.password : '';

      if (!USER_ID_PATTERN.test(userId) || !EMAIL_PATTERN.test(email) || email.length > 254) {
        res.status(400).json({
          code: 'INVALID_INPUT',
          message: 'Identifiant ou adresse email invalide.',
        });
        return;
      }

      if (password && (password.length < 8 || password.length > 256)) {
        res.status(400).json({
          code: 'INVALID_PASSWORD',
          message: 'Le mot de passe doit contenir entre 8 et 256 caractères.',
        });
        return;
      }

      const existing = serverUsersByEmail.get(email);
      let nextHash = existing?.passwordHash;
      let passwordUpdatedAt = existing?.passwordUpdatedAt;

      if (password) {
        nextHash = await hashPasswordScrypt(password);
        passwordUpdatedAt = new Date().toISOString();
      }

      const updatedRecord: ServerUserRecord = {
        id: userId,
        businessId,
        name: name || existing?.name || email,
        email,
        roleId,
        locationIds: Array.isArray(body.locationIds)
          ? body.locationIds.filter((l: unknown): l is string => typeof l === 'string')
          : existing?.locationIds || [],
        isActive,
        passwordHash: nextHash,
        passwordUpdatedAt,
      };

      serverUsersByEmail.set(email, updatedRecord);
      await persistUserCredentialToFirestore(updatedRecord);

      res.json({
        ok: true,
        userId: updatedRecord.id,
        hasPassword: Boolean(updatedRecord.passwordHash),
        passwordUpdatedAt: updatedRecord.passwordUpdatedAt,
      });
    }
  );

  // Explicit logout: remove server session & clear session cookie
  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const token = extractRequestToken(req);
    if (token) {
      const sid = verifySignedToken(token);
      if (sid) {
        activeSessions.delete(sid);
        revokedSessions.set(sid, Date.now());
      }
    }
    clearSessionCookie(res);
    res.json({ ok: true, authenticated: false });
  });

  // Protect all other /api/* endpoints with active session & idle timeout enforcement
  app.use('/api', requireActiveSession, (_req: Request, res: Response) => {
    res.status(404).json({
      code: 'NOT_FOUND',
      message: 'Point de terminaison API introuvable.',
    });
  });

  if (!IS_PRODUCTION) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.use((_req: Request, res: Response) => {
      const indexFile = path.join(distPath, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(404).send('Build artifacts not found.');
      }
    });
  }

  app.listen(PORT, HOST, () => {
    console.log(
      `GEBACO server listening on http://${HOST}:${PORT} (idleTimeoutMs=${IDLE_TIMEOUT_MS})`
    );
  });
}

createApp().catch((err) => {
  console.error('Failed to start GEBACO server:', err);
  process.exit(1);
});
