const Redis = require('ioredis');

/**
 * Redis Client
 * ─────────────────────────────────────────────────────
 * Used for:
 *   1. Token blacklist  → on logout, we store the refresh token here
 *      so it can't be reused even if it hasn't expired yet.
 *   2. Rate limiting    → (Week 3) count requests per IP.
 *
 * Why Redis and not MongoDB?
 *   Redis is an in-memory store → O(1) lookups.
 *   Checking a token blacklist on every request needs to be FAST.
 *   Redis also supports TTL (time-to-live) natively, so blacklisted
 *   tokens auto-delete when they would have expired anyway.
 *
 * Bug fix (v2):
 *   Previous version set `redis = client` inside the 'connect' event,
 *   which meant getRedis() always returned null during the connection
 *   handshake. Now we assign the client immediately and track
 *   readiness via the 'ready' event flag instead.
 */

let client = null;

const connectRedis = () => {
  client = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    // How many times to retry a COMMAND that fails (not the connection itself)
    maxRetriesPerRequest: 1,

    // Connection retry strategy — controls reconnect attempts
    retryStrategy: (times) => {
      if (times > 3) {
        // Give up after 3 attempts — Redis is probably not installed
        console.warn(
          '⚠️  Redis unavailable — running without token blacklist.\n' +
          '   Install Redis: brew install redis && brew services start redis'
        );
        return null; // Returning null stops reconnection attempts
      }
      // Exponential backoff: 200ms, 400ms, 800ms
      return Math.min(times * 200, 800);
    },
  });

  // 'ready' fires when the connection is established AND Redis responds to PING
  // This is more reliable than 'connect' (which fires before the server is ready)
  client.on('ready', () => {
    console.log('✅ Redis connected and ready');
  });

  client.on('error', (err) => {
    // ioredis emits errors on every retry — we only want to see connection errors,
    // not the flood of ECONNREFUSED messages during retry backoff.
    if (err.code !== 'ECONNREFUSED') {
      console.error('❌ Redis error:', err.message);
    }
  });

  client.on('end', () => {
    console.warn('⚠️  Redis connection closed');
  });

  return client;
};

/**
 * getRedis()
 * ─────────────────────────────────────────────────────
 * Returns the Redis client IF it is currently connected.
 * Callers should always guard with: const redis = getRedis();
 * if (redis) { ... }
 *
 * ioredis exposes `status` which can be:
 *   'connecting' | 'connect' | 'ready' | 'reconnecting' | 'end'
 * We only hand out the client when it's actually 'ready'.
 */
const getRedis = () => {
  if (client && client.status === 'ready') {
    return client;
  }
  return null;
};

module.exports = { connectRedis, getRedis };
