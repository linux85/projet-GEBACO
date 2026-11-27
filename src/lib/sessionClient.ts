export const DEFAULT_IDLE_TIMEOUT_MS = 30 * 60 * 1000;
export const DEFAULT_WARNING_LEAD_MS = 60 * 1000;
export const INACTIVITY_LOGOUT_MESSAGE = "Votre session a expiré pour cause d'inactivité";

export interface ServerSessionInfo {
  ok: boolean;
  authenticated: boolean;
  status?: number;
  code?: string;
  message?: string;
  userId?: string;
  email?: string;
  roleId?: string;
  businessId?: string;
  permissions?: string[];
  lastActivity?: number;
  expiresAt?: number;
  idleTimeoutMs: number;
  warningLeadMs: number;
  offline?: boolean;
  apiUnavailable?: boolean;
}

function isBackendApiUnavailable(res: Response, data: unknown): boolean {
  if (res.status === 404 || res.status === 405 || res.status === 502 || res.status === 503) {
    return true;
  }
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.toLowerCase().includes('application/json') || data === null) {
    return true;
  }
  return false;
}

type SessionExpiredListener = (message: string) => void;

// Held strictly in JS memory (never in localStorage or sessionStorage)
let inMemorySessionToken: string | null = null;
const sessionExpiredListeners = new Set<SessionExpiredListener>();

export function subscribeSessionExpired(listener: SessionExpiredListener): () => void {
  sessionExpiredListeners.add(listener);
  return () => {
    sessionExpiredListeners.delete(listener);
  };
}

function notifySessionExpired(message: string): void {
  inMemorySessionToken = null;
  sessionExpiredListeners.forEach((listener) => {
    try {
      listener(message);
    } catch (err) {
      console.error('Session expired listener error:', err);
    }
  });
}

export function clearMemorySessionToken(): void {
  inMemorySessionToken = null;
}

export function hasMemorySessionToken(): boolean {
  return Boolean(inMemorySessionToken);
}

export interface ApiFetchOptions extends RequestInit {
  skipExpiredNotify?: boolean;
}

/**
 * Authenticated fetch wrapper: attaches in-memory Bearer token and CSRF header,
 * and intercepts HTTP 401 { code: "SESSION_EXPIRED" } across all AJAX calls.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  options: ApiFetchOptions = {}
): Promise<Response> {
  const { skipExpiredNotify = false, headers: rawHeaders, ...rest } = options;

  const headers = new Headers(rawHeaders);
  if (!headers.has('X-Requested-With')) {
    headers.set('X-Requested-With', 'fetch');
  }
  if (inMemorySessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemorySessionToken}`);
  }

  const response = await fetch(input, {
    ...rest,
    headers,
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    let code: string | undefined;
    let message: string | undefined;
    try {
      const cloned = response.clone();
      const body = await cloned.json();
      if (body && typeof body === 'object') {
        code = typeof body.code === 'string' ? body.code : undefined;
        message = typeof body.message === 'string' ? body.message : undefined;
      }
    } catch {
      // Non-JSON 401 body
    }

    if (code === 'SESSION_EXPIRED') {
      inMemorySessionToken = null;
      if (!skipExpiredNotify) {
        notifySessionExpired(message || INACTIVITY_LOGOUT_MESSAGE);
      }
    }
  }

  return response;
}

export async function loginWithPasswordOnServer(
  email: string,
  password: string
): Promise<ServerSessionInfo> {
  try {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      skipExpiredNotify: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data && typeof data.token === 'string') {
      inMemorySessionToken = data.token;
      return {
        ok: true,
        authenticated: true,
        status: res.status,
        userId: data.userId,
        email: data.email,
        roleId: data.roleId,
        businessId: data.businessId,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        lastActivity: data.lastActivity,
        expiresAt: data.expiresAt,
        idleTimeoutMs:
          typeof data.idleTimeoutMs === 'number' ? data.idleTimeoutMs : DEFAULT_IDLE_TIMEOUT_MS,
        warningLeadMs:
          typeof data.warningLeadMs === 'number' ? data.warningLeadMs : DEFAULT_WARNING_LEAD_MS,
      };
    }

    return {
      ok: false,
      authenticated: false,
      status: res.status,
      code: data?.code,
      message: data?.message,
      apiUnavailable: isBackendApiUnavailable(res, data),
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
      warningLeadMs: DEFAULT_WARNING_LEAD_MS,
    };
  } catch {
    return {
      ok: false,
      authenticated: false,
      offline: true,
      apiUnavailable: true,
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
      warningLeadMs: DEFAULT_WARNING_LEAD_MS,
    };
  }
}

export async function createServerSession(payload: {
  firebaseIdToken: string;
}): Promise<ServerSessionInfo> {
  try {
    const res = await apiFetch('/api/auth/session', {
      method: 'POST',
      skipExpiredNotify: true,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        firebaseIdToken: payload.firebaseIdToken,
      }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data && typeof data.token === 'string') {
      inMemorySessionToken = data.token;
      return {
        ok: true,
        authenticated: true,
        status: res.status,
        userId: data.userId,
        email: data.email,
        roleId: data.roleId,
        businessId: data.businessId,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        lastActivity: data.lastActivity,
        expiresAt: data.expiresAt,
        idleTimeoutMs:
          typeof data.idleTimeoutMs === 'number' ? data.idleTimeoutMs : DEFAULT_IDLE_TIMEOUT_MS,
        warningLeadMs:
          typeof data.warningLeadMs === 'number' ? data.warningLeadMs : DEFAULT_WARNING_LEAD_MS,
      };
    }

    return {
      ok: false,
      authenticated: false,
      status: res.status,
      code: data?.code,
      message: data?.message,
      apiUnavailable: isBackendApiUnavailable(res, data),
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
      warningLeadMs: DEFAULT_WARNING_LEAD_MS,
    };
  } catch {
    return {
      ok: false,
      authenticated: false,
      offline: true,
      apiUnavailable: true,
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
      warningLeadMs: DEFAULT_WARNING_LEAD_MS,
    };
  }
}

export async function checkServerSession(): Promise<ServerSessionInfo> {
  try {
    const res = await apiFetch('/api/auth/session', {
      method: 'GET',
      skipExpiredNotify: true,
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.authenticated) {
      if (typeof data.token === 'string') {
        inMemorySessionToken = data.token;
      }
      return {
        ok: true,
        authenticated: true,
        status: res.status,
        userId: data.userId,
        email: data.email,
        roleId: data.roleId,
        businessId: data.businessId,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        lastActivity: data.lastActivity,
        expiresAt: data.expiresAt,
        idleTimeoutMs:
          typeof data.idleTimeoutMs === 'number' ? data.idleTimeoutMs : DEFAULT_IDLE_TIMEOUT_MS,
        warningLeadMs:
          typeof data.warningLeadMs === 'number' ? data.warningLeadMs : DEFAULT_WARNING_LEAD_MS,
      };
    }

    if (res.status === 401) {
      inMemorySessionToken = null;
    }

    const unavailable = isBackendApiUnavailable(res, data);
    return {
      ok: false,
      authenticated: false,
      status: res.status,
      code: data?.code,
      message: data?.message,
      apiUnavailable: unavailable,
      idleTimeoutMs:
        typeof data?.idleTimeoutMs === 'number' ? data.idleTimeoutMs : DEFAULT_IDLE_TIMEOUT_MS,
      warningLeadMs: DEFAULT_WARNING_LEAD_MS,
    };
  } catch {
    return {
      ok: false,
      authenticated: false,
      offline: true,
      apiUnavailable: true,
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
      warningLeadMs: DEFAULT_WARNING_LEAD_MS,
    };
  }
}

export async function pingServerSession(): Promise<{
  ok: boolean;
  expired: boolean;
  offline?: boolean;
  code?: string;
  message?: string;
  lastActivity?: number;
  expiresAt?: number;
  idleTimeoutMs?: number;
  warningLeadMs?: number;
}> {
  try {
    const res = await apiFetch('/api/auth/ping', {
      method: 'POST',
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      return {
        ok: true,
        expired: false,
        lastActivity: data.lastActivity,
        expiresAt: data.expiresAt,
        idleTimeoutMs: data.idleTimeoutMs,
        warningLeadMs: data.warningLeadMs,
      };
    }

    if (res.status === 401) {
      return {
        ok: false,
        expired: data?.code === 'SESSION_EXPIRED' || data?.code === 'SESSION_REVOKED',
        code: data?.code,
        message: data?.message || INACTIVITY_LOGOUT_MESSAGE,
      };
    }

    if (isBackendApiUnavailable(res, data)) {
      return {
        ok: true,
        expired: false,
        offline: true,
      };
    }

    return {
      ok: false,
      expired: false,
      code: data?.code,
      message: data?.message,
    };
  } catch {
    return {
      ok: true,
      expired: false,
      offline: true,
    };
  }
}

export async function saveUserCredentialOnServer(payload: {
  userId: string;
  email: string;
  name: string;
  businessId: string;
  roleId: string;
  locationIds: string[];
  isActive: boolean;
  password?: string;
}): Promise<{ ok: boolean; hasPassword?: boolean; passwordUpdatedAt?: string; message?: string }> {
  try {
    const res = await apiFetch('/api/admin/users/password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.ok) {
      return {
        ok: true,
        hasPassword: Boolean(data.hasPassword),
        passwordUpdatedAt: data.passwordUpdatedAt,
      };
    }

    return {
      ok: false,
      message: data?.message || 'Erreur lors de la mise à jour sécurisée sur le serveur.',
    };
  } catch {
    return {
      ok: false,
      message: 'Serveur inaccessible pour enregistrer le mot de passe.',
    };
  }
}

export async function switchUserOnServer(targetUserId: string): Promise<ServerSessionInfo> {
  try {
    const res = await apiFetch('/api/auth/switch-user', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ targetUserId }),
    });

    const data = await res.json().catch(() => null);
    if (res.ok && data?.authenticated && typeof data.token === 'string') {
      inMemorySessionToken = data.token;
      return {
        ok: true,
        authenticated: true,
        status: res.status,
        userId: data.userId,
        email: data.email,
        roleId: data.roleId,
        businessId: data.businessId,
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
        lastActivity: data.lastActivity,
        expiresAt: data.expiresAt,
        idleTimeoutMs:
          typeof data.idleTimeoutMs === 'number' ? data.idleTimeoutMs : DEFAULT_IDLE_TIMEOUT_MS,
        warningLeadMs:
          typeof data.warningLeadMs === 'number' ? data.warningLeadMs : DEFAULT_WARNING_LEAD_MS,
      };
    }

    return {
      ok: false,
      authenticated: false,
      status: res.status,
      code: data?.code,
      message: data?.message,
      apiUnavailable: isBackendApiUnavailable(res, data),
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
      warningLeadMs: DEFAULT_WARNING_LEAD_MS,
    };
  } catch {
    return {
      ok: false,
      authenticated: false,
      offline: true,
      apiUnavailable: true,
      idleTimeoutMs: DEFAULT_IDLE_TIMEOUT_MS,
      warningLeadMs: DEFAULT_WARNING_LEAD_MS,
    };
  }
}

export async function revokeServerSession(): Promise<void> {
  const token = inMemorySessionToken;
  inMemorySessionToken = null;

  try {
    const headers: Record<string, string> = {
      'X-Requested-With': 'fetch',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'same-origin',
      headers,
    });
  } catch {
    // Ignore network failures during logout cleanup
  }
}
