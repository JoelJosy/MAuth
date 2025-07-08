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
    try {
      // Redis pipeline
      const multi = redis.multi();

      if (strategy === "email" && req.body.email) {
        // Single email check
        const emailKey = `${keyPrefix}:email:${req.body.email}`;
        multi.incr(emailKey);
        multi.ttl(emailKey);
        multi.expire(emailKey, windowDuration);

        const [current, ttl] = await multi.exec();

        if (current > limit) {
          return res.status(429).json({
            error: "Rate limit exceeded (email). Please try again later.",
            retryAfter: ttl > 0 ? ttl : windowDuration,
            limit,
            remaining: 0,
            limitType: "email",
          });
        }

        res.set({
          "X-RateLimit-Limit": limit,
          "X-RateLimit-Remaining": Math.max(0, limit - current),
          "X-RateLimit-Reset": new Date(Date.now() + ttl * 1000).toISOString(),
          "X-RateLimit-Type": "email",
        });
      } else if (strategy === "ip") {
        // Single IP check
        const ipKey = `${keyPrefix}:ip:${req.ip}`;
        multi.incr(ipKey);
        multi.ttl(ipKey);
        multi.expire(ipKey, windowDuration);

        const [current, ttl] = await multi.exec();

        if (current > limit) {
          return res.status(429).json({
            error: "Rate limit exceeded (IP). Please try again later.",
            retryAfter: ttl > 0 ? ttl : windowDuration,
            limit,
            remaining: 0,
            limitType: "ip",
          });
        }

        res.set({
          "X-RateLimit-Limit": limit,
          "X-RateLimit-Remaining": Math.max(0, limit - current),
          "X-RateLimit-Reset": new Date(Date.now() + ttl * 1000).toISOString(),
          "X-RateLimit-Type": "ip",
        });
      } else if (strategy === "hybrid") {
        // Hybrid: email + IP checks
        const emailKey = req.body.email
          ? `${keyPrefix}:email:${req.body.email}`
          : null;
        const ipKey = `${keyPrefix}:ip:${req.ip}`;
        const actualIpLimit = ipLimit || Math.ceil(limit * 1.5);
        const actualIpWindow = ipWindowDuration || windowDuration;

        if (emailKey) {
          multi.incr(emailKey);
          multi.ttl(emailKey);
          multi.expire(emailKey, windowDuration);
        }
        multi.incr(ipKey);
        multi.ttl(ipKey);
        multi.expire(ipKey, actualIpWindow);

        const results = await multi.exec();

        // Process email check (if exists)
        if (emailKey) {
          const [emailCurrent, emailTtl] = results.slice(0, 2);

          if (emailCurrent > limit) {
            return res.status(429).json({
              error: "Rate limit exceeded (email). Please try again later.",
              retryAfter: emailTtl > 0 ? emailTtl : windowDuration,
              limit,
              remaining: 0,
              limitType: "email",
            });
          }
        }

        // Process IP check
        const [ipCurrent, ipTtl] = emailKey
          ? results.slice(3, 5)
          : results.slice(0, 2);

        if (ipCurrent > actualIpLimit) {
          return res.status(429).json({
            error: "Rate limit exceeded (IP). Please try again later.",
            retryAfter: ipTtl > 0 ? ipTtl : actualIpWindow,
            limit: actualIpLimit,
            remaining: 0,
            limitType: "ip",
          });
        }

        // Set headers for most restrictive limit (email if exists, otherwise IP)
        if (emailKey) {
          const [emailCurrent, emailTtl] = results.slice(0, 2);
          res.set({
            "X-RateLimit-Limit": limit,
            "X-RateLimit-Remaining": Math.max(0, limit - emailCurrent),
            "X-RateLimit-Reset": new Date(
              Date.now() + emailTtl * 1000
            ).toISOString(),
            "X-RateLimit-Type": "email",
          });
        } else {
          res.set({
            "X-RateLimit-Limit": actualIpLimit,
            "X-RateLimit-Remaining": Math.max(0, actualIpLimit - ipCurrent),
            "X-RateLimit-Reset": new Date(
              Date.now() + ipTtl * 1000
            ).toISOString(),
            "X-RateLimit-Type": "ip",
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
