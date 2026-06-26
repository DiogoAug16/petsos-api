import { StatusCodes } from "http-status-codes";

const buckets = new Map();
let hits = 0;

const pruneExpiredBuckets = (now) => {
  hits += 1;
  if (hits % 1000 !== 0) return;

  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
};

export const rateLimit = ({ windowMs, max, keyPrefix = "global" }) => {
  return (req, res, next) => {
    const now = Date.now();
    pruneExpiredBuckets(now);
    const identity = req.userId || req.ip || "unknown";
    const key = `${keyPrefix}:${identity}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    bucket.count += 1;

    if (bucket.count > max) {
      return res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message: "Muitas requisições. Tente novamente em instantes.",
        errorCode: "RATE_LIMITED",
      });
    }

    return next();
  };
};
