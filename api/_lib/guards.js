// Request checks shared by the functions in api/. Vercel does not turn
// files under an underscore-prefixed folder into endpoints of their own.

const SITE_HOSTS = new Set(['hausoftoots.com', 'www.hausoftoots.com']);
const MAX_TRACKED_CLIENTS = 5000;

/**
 * Browsers send Origin on every POST, so a page on another site cannot
 * call these functions through a visitor's browser. Matching the request's
 * own host keeps preview deployments and local development working.
 */
export function isSameSiteRequest(req) {
    const source = req.headers?.origin || req.headers?.referer;
    if (!source) return false;

    let sourceHost;
    try {
        sourceHost = new URL(source).host.toLowerCase();
    } catch (error) {
        return false;
    }

    const requestHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').toLowerCase();
    return SITE_HOSTS.has(sourceHost) || (requestHost !== '' && sourceHost === requestHost);
}

export function isJsonRequest(req) {
    return /^application\/json\b/i.test(String(req.headers?.['content-type'] || ''));
}

export function clientKey(req) {
    const forwardedFor = String(req.headers?.['x-forwarded-for'] || '').split(',')[0].trim();
    return forwardedFor || String(req.headers?.['x-real-ip'] || '') || 'unknown';
}

/**
 * Returns a function that records a request for a client key and returns 0
 * when it is allowed, or the number of seconds to wait when the client is
 * over the limit.
 *
 * The counts live in one function instance's memory, so this slows a single
 * abusive client but is not a hard cap across instances or cold starts.
 */
export function createRateLimiter({ max, windowMs }) {
    const recentRequests = new Map();

    return function takeRateLimitSlot(key, now = Date.now()) {
        const windowStart = now - windowMs;
        const hits = (recentRequests.get(key) || []).filter(time => time > windowStart);

        if (hits.length >= max) {
            recentRequests.set(key, hits);
            return Math.max(1, Math.ceil((hits[0] + windowMs - now) / 1000));
        }

        hits.push(now);
        // Re-inserting keeps the Map ordered by last activity, so the entry
        // evicted below is always the client seen longest ago.
        recentRequests.delete(key);
        recentRequests.set(key, hits);
        if (recentRequests.size > MAX_TRACKED_CLIENTS) {
            recentRequests.delete(recentRequests.keys().next().value);
        }
        return 0;
    };
}
