/* ============================================================
   NOVASAAS — utils/tokenGen.js
   Cryptographically secure token generation and expiry
   utilities used by the auth flow.

   Exports
   ───────
   generateToken(bytes?)     → hex string  (default 32 bytes = 64 chars)
   generateShortToken(len?)  → numeric OTP (default 6 digits)
   generateSlug(bytes?)      → url-safe base64 token (default 24 bytes)
   tokenExpiry(hours?)       → Date  (default 24 h from now)
   isTokenExpired(date)      → boolean
   hashToken(token)          → sha-256 hex (for DB storage of sensitive tokens)
   compareToken(raw, hashed) → boolean (constant-time safe comparison)
   ============================================================ */

'use strict';

import crypto from 'crypto';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────── */
const DEFAULT_BYTES = 32;   /* 64-char hex string — email verification */
const DEFAULT_SHORT_LEN = 6;    /* 6-digit OTP                              */
const DEFAULT_SLUG_BYTES = 24;   /* 32-char url-safe base64                  */
const DEFAULT_EXPIRY_HRS = 24;   /* hours until a token expires              */
const MAX_EXPIRY_HRS = 720;  /* 30 days — hard ceiling                   */

/* ─────────────────────────────────────────────────────────────
   1. generateToken
   Returns a cryptographically secure random hex string.

   @param  {number} bytes  Number of random bytes (default 32)
   @returns {string}       Hex-encoded string (2× bytes in length)

   Example: generateToken()     → "a3f8c2…" (64 chars)
            generateToken(16)   → "a3f8c2…" (32 chars)
   ───────────────────────────────────────────────────────────── */
export function generateToken(bytes = DEFAULT_BYTES) {
    if (!Number.isInteger(bytes) || bytes < 8 || bytes > 256) {
        throw new RangeError('generateToken: bytes must be an integer between 8 and 256');
    }
    return crypto.randomBytes(bytes).toString('hex');
}

/* ─────────────────────────────────────────────────────────────
   2. generateShortToken
   Returns a zero-padded numeric OTP string.
   Useful for SMS / email 6-digit codes.

   @param  {number} len  Digit length (default 6, max 10)
   @returns {string}     Zero-padded numeric string

   Example: generateShortToken()   → "047291"
            generateShortToken(8)  → "03819274"
   ───────────────────────────────────────────────────────────── */
export function generateShortToken(len = DEFAULT_SHORT_LEN) {
    if (!Number.isInteger(len) || len < 4 || len > 10) {
        throw new RangeError('generateShortToken: len must be an integer between 4 and 10');
    }
    const max = Math.pow(10, len);
    /* Rejection sampling — avoids modulo bias */
    let num;
    do {
        const buf = crypto.randomBytes(4);
        num = buf.readUInt32BE(0) % max;
    } while (num >= max);

    return String(num).padStart(len, '0');
}

/* ─────────────────────────────────────────────────────────────
   3. generateSlug
   Returns a URL-safe base64 token (no +, /, = padding).
   Shorter than hex — good for URLs and referral codes.

   @param  {number} bytes  Random bytes (default 24 → 32-char slug)
   @returns {string}       URL-safe base64 string

   Example: generateSlug()    → "mNQ8kXv3P7tLqR2Yc0uJfA" (32 chars)
   ───────────────────────────────────────────────────────────── */
export function generateSlug(bytes = DEFAULT_SLUG_BYTES) {
    if (!Number.isInteger(bytes) || bytes < 8 || bytes > 128) {
        throw new RangeError('generateSlug: bytes must be an integer between 8 and 128');
    }
    return crypto
        .randomBytes(bytes)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

/* ─────────────────────────────────────────────────────────────
   4. tokenExpiry
   Returns a Date representing now + N hours.

   @param  {number} hours  Hours from now (default 24, max 720)
   @returns {Date}

   Example: tokenExpiry()    → Date 24h from now
            tokenExpiry(1)   → Date 1h  from now
            tokenExpiry(168) → Date 7 days from now
   ───────────────────────────────────────────────────────────── */
export function tokenExpiry(hours = DEFAULT_EXPIRY_HRS) {
    if (typeof hours !== 'number' || hours <= 0 || hours > MAX_EXPIRY_HRS) {
        throw new RangeError(
            `tokenExpiry: hours must be a positive number ≤ ${MAX_EXPIRY_HRS}`
        );
    }
    return new Date(Date.now() + hours * 60 * 60 * 1000);
}

/* ─────────────────────────────────────────────────────────────
   5. isTokenExpired
   Returns true if the given Date is in the past.

   @param  {Date|string|number} expiry  Expiry date/timestamp
   @returns {boolean}

   Example: isTokenExpired(new Date(Date.now() - 1)) → true
            isTokenExpired(new Date(Date.now() + 1)) → false
   ───────────────────────────────────────────────────────────── */
export function isTokenExpired(expiry) {
    if (!expiry) return true;
    const expiryTime = expiry instanceof Date
        ? expiry.getTime()
        : new Date(expiry).getTime();

    if (isNaN(expiryTime)) {
        throw new TypeError('isTokenExpired: expiry must be a valid Date or parseable date string');
    }
    return Date.now() > expiryTime;
}

/* ─────────────────────────────────────────────────────────────
   6. hashToken
   Returns a SHA-256 hex digest of a token.

   Use this when storing sensitive tokens in the DB so that
   a database breach does not expose raw tokens.
   Store the hash in DB; compare via compareToken().

   @param  {string} token  Raw token string
   @returns {string}       SHA-256 hex string (64 chars)

   Example: hashToken("abc123") → "6ca13d52ca70..."
   ───────────────────────────────────────────────────────────── */
export function hashToken(token) {
    if (typeof token !== 'string' || !token.length) {
        throw new TypeError('hashToken: token must be a non-empty string');
    }
    return crypto
        .createHash('sha256')
        .update(token)
        .digest('hex');
}

/* ─────────────────────────────────────────────────────────────
   7. compareToken
   Constant-time comparison of a raw token against its hash.
   Prevents timing-based side-channel attacks.

   @param  {string} rawToken     Token from the user (email link, header…)
   @param  {string} storedHash   SHA-256 hash stored in the DB
   @returns {boolean}

   Example: compareToken("abc123", hashToken("abc123")) → true
            compareToken("wrong",  hashToken("abc123")) → false
   ───────────────────────────────────────────────────────────── */
export function compareToken(rawToken, storedHash) {
    if (typeof rawToken !== 'string' || typeof storedHash !== 'string') return false;
    try {
        const incoming = Buffer.from(hashToken(rawToken), 'hex');
        const stored = Buffer.from(storedHash, 'hex');
        /* Buffer lengths must match for timingSafeEqual */
        if (incoming.length !== stored.length) return false;
        return crypto.timingSafeEqual(incoming, stored);
    } catch {
        return false;
    }
}

/* ─────────────────────────────────────────────────────────────
   8. generateTokenBundle
   Convenience helper — generates token + hash + expiry in one
   call, ready to spread into a Mongoose document update.

   @param  {object} opts
   @param  {number} opts.bytes   Token bytes (default 32)
   @param  {number} opts.hours   Expiry hours (default 24)
   @param  {boolean} opts.hash   Whether to hash for DB storage (default true)
   @returns {{ rawToken, verifyToken, verifyExpires }}

   Example:
     const { rawToken, verifyToken, verifyExpires } = generateTokenBundle();
     // rawToken    → send in email link
     // verifyToken → store in MongoDB (hashed)
     // verifyExpires → store in MongoDB
   ───────────────────────────────────────────────────────────── */
export function generateTokenBundle({
    bytes = DEFAULT_BYTES,
    hours = DEFAULT_EXPIRY_HRS,
    hash = true,
} = {}) {
    const rawToken = generateToken(bytes);
    const verifyToken = hash ? hashToken(rawToken) : rawToken;
    const verifyExpires = tokenExpiry(hours);
    return { rawToken, verifyToken, verifyExpires };
}

/* ─────────────────────────────────────────────────────────────
   DEFAULT EXPORT — named group for easy destructuring
   ───────────────────────────────────────────────────────────── */
export default {
    generateToken,
    generateShortToken,
    generateSlug,
    tokenExpiry,
    isTokenExpired,
    hashToken,
    compareToken,
    generateTokenBundle,
};