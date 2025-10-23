class CacheManager {
    constructor() {
        this.cache = new Map();
        this.ttl = new Map();
        this.maxSize = 1000; // Maximum cache entries
    }

    set(key, value, ttlMs = 300000) { // Default 5 minutes TTL
        // Remove oldest entries if cache is full
        if (this.cache.size >= this.maxSize) {
            const firstKey = this.cache.keys().next().value;
            this.delete(firstKey);
        }

        this.cache.set(key, value);
        this.ttl.set(key, Date.now() + ttlMs);
    }

    get(key) {
        const ttl = this.ttl.get(key);
        if (ttl && Date.now() > ttl) {
            this.delete(key);
            return null;
        }
        return this.cache.get(key);
    }

    has(key) {
        const ttl = this.ttl.get(key);
        if (ttl && Date.now() > ttl) {
            this.delete(key);
            return false;
        }
        return this.cache.has(key);
    }

    delete(key) {
        this.cache.delete(key);
        this.ttl.delete(key);
    }

    clear() {
        this.cache.clear();
        this.ttl.clear();
    }

    // Clean expired entries
    cleanup() {
        const now = Date.now();
        for (const [key, ttl] of this.ttl.entries()) {
            if (now > ttl) {
                this.delete(key);
            }
        }
    }

    // Get cache statistics
    getStats() {
        return {
            size: this.cache.size,
            maxSize: this.maxSize,
            hitRate: this.hits / (this.hits + this.misses) || 0
        };
    }
}

// Global cache instance
const globalCache = new CacheManager();

// Cleanup expired entries every 5 minutes
setInterval(() => {
    globalCache.cleanup();
}, 300000);

module.exports = { CacheManager, globalCache };