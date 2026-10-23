import type { NextRequest } from 'next/server';

/**
 * API GUARDS (WEBSITE CLIENT)
 * This is now a lightweight utility. 
 * Token verification is handled by the Standalone Backend.
 */

export function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return (
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

// Simple rate limiter for client-side protection
const rateLimitStore = new Map<string, { count: number; resetAtMs: number }>();

export async function enforceRateLimit(opts: {
  name: string;
  tokensPerInterval: number;
  intervalMs: number;
  req: NextRequest;
}): Promise<{ ok: true } | { ok: false; retryAfterSeconds: number }> {
  const key = `${opts.name}:${getClientIp(opts.req)}`;
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || now >= current.resetAtMs) {
    rateLimitStore.set(key, { count: 1, resetAtMs: now + opts.intervalMs });
    return { ok: true };
  }

  if (current.count >= opts.tokensPerInterval) {
    const retryAfterSeconds = Math.max(1, Math.ceil((current.resetAtMs - now) / 1000));
    return { ok: false, retryAfterSeconds };
  }

  current.count += 1;
  rateLimitStore.set(key, current);
  return { ok: true };
}

// Helper to extract token for the backend API
export function extractAuthToken(req: NextRequest): string | null {
  const header = req.headers.get('authorization') || '';
  const match = header.match(/^Bearer\s+(.+)$/i);
  return match?.[1] || null;
}
