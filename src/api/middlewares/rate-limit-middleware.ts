import { Request, Response, NextFunction } from "express";

interface RateRecord {
  count: number;
  resetAt: number;
}

export const createRateLimiter = (maxRequests = 10, windowMs = 60_000) => {
  const buckets = new Map<string, RateRecord>();

  return (req: Request, res: Response, next: NextFunction) => {
    const ip =
      (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ||
      req.ip ||
      "unknown";
    const now = Date.now();
    const record = buckets.get(ip);

    if (!record || record.resetAt <= now) {
      buckets.set(ip, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (record.count >= maxRequests) {
      res.status(429).json({
        message: "Too many requests. Please wait a minute and try again.",
      });
      return;
    }

    record.count += 1;
    next();
  };
};
