"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createRateLimiter = void 0;
const createRateLimiter = (maxRequests = 10, windowMs = 60000) => {
    const buckets = new Map();
    return (req, res, next) => {
        const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() ||
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
exports.createRateLimiter = createRateLimiter;
