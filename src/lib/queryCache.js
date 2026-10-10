// Small in-memory cache for public, read-mostly queries.
// It deduplicates concurrent requests and never persists data across browser sessions.
const cache = new Map();

export function cachedRequest(key, fetcher, ttlMs = 30000) {
  const now = Date.now();
  const existing = cache.get(key);
  if (existing?.promise) return existing.promise;
  if (existing && existing.expiresAt > now) return Promise.resolve(existing.value);

  let promise;
  promise = Promise.resolve()
    .then(fetcher)
    .then((result) => {
      // Supabase returns errors as values; do not cache failed requests.
      if (result?.error || (Array.isArray(result) && result.some((item) => item?.error))) {
        if (cache.get(key)?.promise === promise) cache.delete(key);
        return result;
      }
      // An invalidated or superseded request must not repopulate the cache.
      if (cache.get(key)?.promise === promise) {
        cache.set(key, { value: result, expiresAt: Date.now() + ttlMs });
      }
      return result;
    })
    .catch((error) => {
      if (cache.get(key)?.promise === promise) cache.delete(key);
      throw error;
    });

  cache.set(key, { promise, expiresAt: 0 });
  return promise;
}

export function invalidateCachedRequest(prefix = "") {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}
