// Local device convenience PIN. Unlike the original local-only app, this PIN
// is NOT an encryption key - real data protection is Supabase Auth + RLS.
// This is purely a fast-unlock gate on top of an already-authenticated
// session, so a salted hash comparison is sufficient (nothing sensitive is
// derived from it).

interface StoredPin {
  saltB64: string
  hashB64: string
}

interface LockoutState {
  failedAttempts: number
  lockedUntil?: number
}

const COOLDOWNS_SECONDS = [0, 0, 0, 0, 30, 120, 600]

function pinKey(userId: string): string {
  return `local_pin_${userId}`
}
function lockoutKey(userId: string): string {
  return `local_pin_lockout_${userId}`
}

function bufToB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i])
  return btoa(binary)
}
function b64ToBuf(b64: string): ArrayBuffer {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)).buffer
}

async function hashPin(pin: string, salt: ArrayBuffer): Promise<ArrayBuffer> {
  const enc = new TextEncoder()
  const data = new Uint8Array(salt.byteLength + enc.encode(pin).byteLength)
  data.set(new Uint8Array(salt), 0)
  data.set(enc.encode(pin), salt.byteLength)
  return crypto.subtle.digest('SHA-256', data)
}

export function hasLocalPin(userId: string): boolean {
  return localStorage.getItem(pinKey(userId)) != null
}

export async function setupLocalPin(userId: string, pin: string): Promise<void> {
  const salt = crypto.getRandomValues(new Uint8Array(16)).buffer
  const hash = await hashPin(pin, salt)
  const stored: StoredPin = { saltB64: bufToB64(salt), hashB64: bufToB64(hash) }
  localStorage.setItem(pinKey(userId), JSON.stringify(stored))
}

export async function verifyLocalPin(userId: string, pin: string): Promise<boolean> {
  const raw = localStorage.getItem(pinKey(userId))
  if (!raw) return false
  const stored = JSON.parse(raw) as StoredPin
  const hash = await hashPin(pin, b64ToBuf(stored.saltB64))
  return bufToB64(hash) === stored.hashB64
}

export function clearLocalPin(userId: string): void {
  localStorage.removeItem(pinKey(userId))
  localStorage.removeItem(lockoutKey(userId))
}

function cooldownFor(attempts: number): number {
  const idx = Math.min(attempts, COOLDOWNS_SECONDS.length - 1)
  return COOLDOWNS_SECONDS[idx]
}

export function getLockoutState(userId: string): { lockedUntil: number | null; failedAttempts: number } {
  const raw = localStorage.getItem(lockoutKey(userId))
  const state: LockoutState = raw ? JSON.parse(raw) : { failedAttempts: 0 }
  const lockedUntil = state.lockedUntil && state.lockedUntil > Date.now() ? state.lockedUntil : null
  return { lockedUntil, failedAttempts: state.failedAttempts }
}

export function recordFailedAttempt(userId: string): { lockedUntil: number | null; failedAttempts: number } {
  const current = getLockoutState(userId)
  const failedAttempts = current.failedAttempts + 1
  const cooldown = cooldownFor(failedAttempts)
  const lockedUntil = cooldown > 0 ? Date.now() + cooldown * 1000 : undefined
  const state: LockoutState = { failedAttempts, lockedUntil }
  localStorage.setItem(lockoutKey(userId), JSON.stringify(state))
  return { lockedUntil: lockedUntil ?? null, failedAttempts }
}

export function resetFailedAttempts(userId: string): void {
  localStorage.setItem(lockoutKey(userId), JSON.stringify({ failedAttempts: 0 }))
}
