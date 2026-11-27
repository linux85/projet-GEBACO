/**
 * Client-side password hashing and verification using Web Crypto API (PBKDF2-SHA256).
 * Passwords are always stored as salted cryptographic hashes, never in plaintext.
 */

const PBKDF2_ITERATIONS = 100000;
const SALT_BYTES = 16;
const HASH_BITS = 256;

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.trim();
  const len = Math.floor(clean.length / 2);
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function derivePbkdf2Bits(
  plainPassword: string,
  salt: Uint8Array,
  iterations: number
): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(plainPassword),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: salt as BufferSource,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    HASH_BITS
  );

  return new Uint8Array(bits);
}

export async function hashPassword(plainPassword: string): Promise<string> {
  const salt = new Uint8Array(SALT_BYTES);
  crypto.getRandomValues(salt);
  const hash = await derivePbkdf2Bits(plainPassword, salt, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToHex(salt)}$${bytesToHex(hash)}`;
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  if (!plainPassword || !storedHash) return false;

  const parts = storedHash.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') {
    return false;
  }

  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 10000) {
    return false;
  }

  const salt = hexToBytes(parts[2]);
  const expected = hexToBytes(parts[3]);
  if (salt.length === 0 || expected.length === 0) {
    return false;
  }

  const derived = await derivePbkdf2Bits(plainPassword, salt, iterations);
  return constantTimeEqual(derived, expected);
}

export function generateStrongPassword(length = 12): string {
  const charset = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += charset[values[i] % charset.length];
  }
  return result;
}
