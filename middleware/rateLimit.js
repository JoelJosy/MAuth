import redis from "../config/redis.js";

const rateLimit = ({
  keyPrefix,
  limit,
  windowDuration,
  strategy = "hybrid", // "email", "ip", or "hybrid"
  ipLimit = null, // Optional separate IP limit for hybrid
  ipWindowDuration = null,
}) => {
  return async (req, res, next) => {
    const checks = [];

    if (strategy === "email" && req.body.email) {
      checks.push({
        key: `${keyPrefix}:email:${req.body.email}`,
        limit,
        windowDuration,
        type: "email",
      });
    } else if (strategy === "ip") {
      checks.push({
        key: `${keyPrefix}:ip:${req.ip}`,
        limit,
        windowDuration,
        type: "ip",
      });
    } else if (strategy === "hybrid") {
      if (req.body.email) {
        checks.push({
          key: `${keyPrefix}:email:${req.body.email}`,
          limit,
          windowDuration,
          type: "email",
        });
      }
      checks.push({
        key: `${keyPrefix}:ip:${req.ip}`,
        limit: ipLimit || Math.ceil(limit * 1.5), // Slightly higher IP limit
        windowDuration: ipWindowDuration || windowDuration,
        type: "ip",
      });
    }

    // If no checks configured, fall back to IP
    if (checks.length === 0) {
      checks.push({
        key: `${keyPrefix}:ip:${req.ip}`,
        limit,
        windowDuration,
        type: "ip",
      });
    }

    try {
      // Check all limits
      for (const check of checks) {
        const current = await redis.incr(check.key);

        if (current === 1) {
          await redis.expire(check.key, check.windowDuration);
        }

        const ttl = await redis.ttl(check.key);

        if (current > check.limit) {
          return res.status(429).json({
            error: `Rate limit exceeded (${check.type}). Please try again later.`,
            retryAfter: ttl > 0 ? ttl : check.windowDuration,
            limit: check.limit,
            remaining: 0,
            limitType: check.type,
          });
        }

        // Add headers for the most restrictive limit
        if (check === checks[0]) {
          res.set({
            "X-RateLimit-Limit": check.limit,
            "X-RateLimit-Remaining": Math.max(0, check.limit - current),
            "X-RateLimit-Reset": new Date(
              Date.now() + ttl * 1000
            ).toISOString(),
            "X-RateLimit-Type": check.type,
          });
        }
      }

      next();
    } catch (err) {
      console.error("Rate limiting failed:", err);
      // Fail open - don't block requests if Redis is down
      next();
    }
  };
};

// Rate limit configurations
const strictRateLimit = rateLimit({
  keyPrefix: "auth_strict",
  limit: 5,
  windowDuration: 300,
  strategy: "hybrid",
  ipLimit: 10,
  ipWindowDuration: 300,
}); // 5 per email per 5min + 10 per IP per 5min

const moderateRateLimit = rateLimit({
  keyPrefix: "auth_moderate",
  limit: 10,
  windowDuration: 60,
  strategy: "ip",
}); // 10 per minute per IP

const lenientRateLimit = rateLimit({
  keyPrefix: "auth_lenient",
  limit: 30,
  windowDuration: 60,
  strategy: "ip",
}); // 30 per minute per IP

export { strictRateLimit, moderateRateLimit, lenientRateLimit, rateLimit };
