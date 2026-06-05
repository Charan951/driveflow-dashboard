import NodeCache from 'node-cache';

// Initialize cache with standard TTL of 5 minutes (300 seconds)
const cache = new NodeCache({ stdTTL: 300, checkperiod: 320 });

/**
 * Middleware to cache API responses
 * @param {number} duration - Cache duration in seconds
 */
export const cacheMiddleware = (duration) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }

    // Generate a unique cache key based on URL and query params
    const key = `__express__${req.originalUrl || req.url}`;
    const cachedResponse = cache.get(key);

    if (cachedResponse) {
      return res.json(cachedResponse);
    } else {
      // Hijack res.json to store the response before sending it
      const originalJson = res.json;
      res.json = function (body) {
        // Restore original res.json to prevent infinite loops
        res.json = originalJson;
        
        // Cache the response body
        cache.set(key, body, duration);
        
        // Send the response
        return originalJson.call(this, body);
      };
      next();
    }
  };
};

export const clearCache = (prefix) => {
  const keys = cache.keys();
  const keysToDelete = keys.filter(key => key.startsWith(`__express__${prefix}`));
  cache.del(keysToDelete);
};
