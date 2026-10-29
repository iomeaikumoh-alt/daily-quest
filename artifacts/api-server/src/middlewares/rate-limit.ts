import type { NextFunction, Request, RequestHandler, Response } from "express";

interface RateLimitOptions {
  windowMs: number;
  max: () => number;
}

/**
 * Small in-memory fixed-window limiter for the AI routes, so a public demo URL
 * cannot burn through the Anthropic budget. Single-instance only by design.
 */
export function rateLimit({ windowMs, max }: RateLimitOptions): RequestHandler {
  const hits = new Map<string, { count: number; resetAt: number }>();

  const sweep = setInterval(() => {
    const nowMs = Date.now();
    for (const [key, entry] of hits) {
      if (entry.resetAt <= nowMs) hits.delete(key);
    }
  }, windowMs);
  sweep.unref();

  return (req: Request, res: Response, next: NextFunction) => {
    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const nowMs = Date.now();
    const entry = hits.get(key);
    const limit = max();

    if (!entry || entry.resetAt <= nowMs) {
      hits.set(key, { count: 1, resetAt: nowMs + windowMs });
      next();
      return;
    }

    entry.count += 1;
    if (entry.count > limit) {
      const retryAfterSec = Math.max(1, Math.ceil((entry.resetAt - nowMs) / 1000));
      req.log.warn({ key, count: entry.count, limit }, "AI rate limit exceeded");
      res.setHeader("Retry-After", String(retryAfterSec));
      res.status(429).json({ error: "요청이 너무 많아요. 잠시 후 다시 시도해 주세요.", retryAfterSec });
      return;
    }
    next();
  };
}
