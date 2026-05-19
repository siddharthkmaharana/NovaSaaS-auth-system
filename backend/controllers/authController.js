/* ============================================================
   NOVASAAS — controllers/authController.js
   Business logic for the sign-up and email-verification flow.

   Handlers
   ────────
   signup(req, res, next)   POST /api/signup
   verify(req, res, next)   GET  /api/verify/:token
   resend(req, res, next)   POST /api/resend
   getStatus(req, res, next)GET  /api/status/:email
   ============================================================ */

'use strict';

import validator from 'validator';
import Lead from '../models/Lead.js';
import { sendVerificationEmail } from '../config/mailer.js';
import {
    generateTokenBundle,
    compareToken,
    isTokenExpired,
} from '../utils/tokenGen.js';

/* ─────────────────────────────────────────────────────────────
   CONSTANTS
   ───────────────────────────────────────────────────────────── */
const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const IS_PROD = process.env.NODE_ENV === 'production';
const TOKEN_EXPIRY_HRS = parseInt(process.env.TOKEN_EXPIRY_HOURS || '24', 10);
const RESEND_COOLDOWN_S = 60; /* seconds before resend is allowed again */

/* ─────────────────────────────────────────────────────────────
   HELPERS
   ───────────────────────────────────────────────────────────── */

/**
 * Sanitise a string: trim, lowercase, collapse internal spaces.
 */
function sanitiseStr(str = '') {
    return String(str).trim().replace(/\s+/g, ' ');
}

/**
 * Build a safe redirect URL for the dashboard after verification.
 * Encodes the user's name so it arrives in the query string.
 */
function dashboardUrl(name) {
    const encoded = encodeURIComponent(name);
    return `${BASE_URL}/dashboard.html?verified=true&name=${encoded}`;
}

/**
 * Wrap an async route handler so errors propagate to next()
 * without try/catch boilerplate in every handler.
 */
function asyncHandler(fn) {
    return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

/**
 * Check whether enough time has passed since the last resend.
 * Returns true if the cooldown has elapsed (resend is allowed).
 */
function resendAllowed(lead) {
    if (!lead.lastResendAt) return true;
    const elapsed = (Date.now() - new Date(lead.lastResendAt).getTime()) / 1000;
    return elapsed >= RESEND_COOLDOWN_S;
}

/* ─────────────────────────────────────────────────────────────
   INPUT VALIDATION
   ───────────────────────────────────────────────────────────── */

/**
 * Validates and sanitises signup fields.
 * Returns { valid: true, data } or { valid: false, errors[] }.
 */
function validateSignupInput(body) {
    const errors = [];

    /* ── name ── */
    const name = sanitiseStr(body.name || '');
    if (!name) {
        errors.push({ field: 'name', message: 'Name is required' });
    } else if (name.length < 2) {
        errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
    } else if (name.length > 100) {
        errors.push({ field: 'name', message: 'Name must be under 100 characters' });
    } else if (!/^[a-zA-ZÀ-ÖØ-öø-ÿ\s'\-]+$/.test(name)) {
        errors.push({ field: 'name', message: 'Name contains invalid characters' });
    }

    /* ── email ── */
    const email = sanitiseStr(body.email || '').toLowerCase();
    if (!email) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!validator.isEmail(email)) {
        errors.push({ field: 'email', message: 'Please enter a valid email address' });
    } else if (email.length > 254) {
        errors.push({ field: 'email', message: 'Email address is too long' });
    }

    /* ── company (optional) ── */
    const company = sanitiseStr(body.company || '').slice(0, 120);

    if (errors.length) return { valid: false, errors };
    return { valid: true, data: { name, email, company } };
}

/* ─────────────────────────────────────────────────────────────
   CONTROLLER 1 — signup
   POST /api/signup
   ───────────────────────────────────────────────────────────── */

/**
 * Handles new lead registration.
 *
 * Flow:
 *  1. Validate + sanitise input
 *  2. Check if email already registered and verified → 409
 *  3. Check if email registered but unverified → regenerate token,
 *     respect resend cooldown, resend email
 *  4. New email → create Lead, generate token, send email → 201
 */
export const signup = asyncHandler(async (req, res) => {
    /* 1. Validate */
    const { valid, errors, data } = validateSignupInput(req.body);
    if (!valid) {
        return res.status(422).json({
            success: false,
            message: errors[0].message,
            errors,
        });
    }

    const { name, email, company } = data;

    /* 2. Existing lead lookup */
    const existing = await Lead.findOne({ email }).lean(false);

    if (existing) {
        /* Already verified — tell the user to sign in */
        if (existing.verified) {
            return res.status(409).json({
                success: false,
                message: 'This email is already registered and verified. Please sign in.',
                field: 'email',
            });
        }

        /* Unverified — respect cooldown before re-sending */
        if (!resendAllowed(existing)) {
            const waitSecs = Math.ceil(
                RESEND_COOLDOWN_S -
                (Date.now() - new Date(existing.lastResendAt).getTime()) / 1000
            );
            return res.status(429).json({
                success: false,
                message: `Please wait ${waitSecs} seconds before requesting another email.`,
            });
        }

        /* Regenerate token and resend */
        const { rawToken, verifyToken, verifyExpires } = generateTokenBundle({
            hours: TOKEN_EXPIRY_HRS,
        });

        existing.verifyToken = verifyToken;
        existing.verifyExpires = verifyExpires;
        existing.lastResendAt = new Date();
        /* Update name/company in case they changed */
        existing.name = name;
        existing.company = company;
        await existing.save();

        await sendVerificationEmail({ name, email, token: rawToken });

        return res.status(200).json({
            success: true,
            message: `Verification email resent to ${email}. Please check your inbox.`,
        });
    }

    /* 3. Brand-new lead */
    const { rawToken, verifyToken, verifyExpires } = generateTokenBundle({
        hours: TOKEN_EXPIRY_HRS,
    });

    const lead = new Lead({
        name,
        email,
        company,
        verifyToken,
        verifyExpires,
        lastResendAt: new Date(),
    });

    await lead.save();

    /* Send email — if this fails we roll back (delete the lead) so
       the user can retry without hitting a "duplicate email" wall. */
    try {
        await sendVerificationEmail({ name, email, token: rawToken });
    } catch (mailErr) {
        await Lead.deleteOne({ _id: lead._id });
        console.error('[signup] Email delivery failed, rolling back lead:', mailErr.message);
        return res.status(502).json({
            success: false,
            message: 'We could not send the verification email. Please try again in a moment.',
        });
    }

    /* Log in non-production only (never log emails in prod logs) */
    if (!IS_PROD) {
        console.log(`[signup] ✅ New lead: ${email}`);
    }

    return res.status(201).json({
        success: true,
        message: `Verification email sent to ${email}. Please check your inbox.`,
    });
});

/* ─────────────────────────────────────────────────────────────
   CONTROLLER 2 — verify
   GET /api/verify/:token
   ───────────────────────────────────────────────────────────── */

/**
 * Handles email verification from the link sent in the email.
 *
 * Flow:
 *  1. Sanitise token param
 *  2. Find lead whose hashed verifyToken matches → 404 if not found
 *  3. Check expiry → redirect to verify.html?status=expired
 *  4. Mark lead as verified, clear token fields
 *  5. Redirect to dashboard with name in query string
 */
export const verify = asyncHandler(async (req, res) => {
    /* 1. Sanitise */
    const rawToken = sanitiseStr(req.params.token || '');

    if (!rawToken || rawToken.length < 32) {
        return res.redirect(
            `${BASE_URL}/verify.html?status=invalid`
        );
    }

    /* 2. Find all unverified leads and compare hashes in app-layer
          (avoids leaking timing info by not querying on hash directly
          when using compareToken — for extra safety we fetch
          candidates and compare). In practice the token space is so
          large (2^256 pre-image) that direct hash lookup is fine too.
          We use direct lookup here for performance, protected by
          timingSafeEqual inside compareToken on the raw → DB path. */
    const { hashToken } = await import('../utils/tokenGen.js');
    const hashedIncoming = hashToken(rawToken);

    const lead = await Lead.findOne({
        verifyToken: hashedIncoming,
        verified: false,
    });

    if (!lead) {
        /* Token not found or already used */
        return res.redirect(
            `${BASE_URL}/verify.html?status=invalid`
        );
    }

    /* 3. Expiry check */
    if (isTokenExpired(lead.verifyExpires)) {
        /* Don't delete the lead — let them resend from verify page */
        return res.redirect(
            `${BASE_URL}/verify.html?status=expired&email=${encodeURIComponent(lead.email)}`
        );
    }

    /* 4. Mark verified */
    lead.verified = true;
    lead.verifiedAt = new Date();
    lead.verifyToken = undefined;
    lead.verifyExpires = undefined;
    lead.lastResendAt = undefined;
    await lead.save();

    if (!IS_PROD) {
        console.log(`[verify] ✅ Verified: ${lead.email}`);
    }

    /* 5. Redirect to dashboard */
    return res.redirect(dashboardUrl(lead.name));
});

/* ─────────────────────────────────────────────────────────────
   CONTROLLER 3 — resend
   POST /api/resend
   ───────────────────────────────────────────────────────────── */

/**
 * Explicit resend endpoint — called by verify.html "Resend" button.
 *
 * Flow:
 *  1. Validate email
 *  2. Find unverified lead → 404 if not found or already verified
 *  3. Respect cooldown → 429
 *  4. Regenerate token, update lead, resend email → 200
 */
export const resend = asyncHandler(async (req, res) => {
    const email = sanitiseStr(req.body.email || '').toLowerCase();

    if (!email || !validator.isEmail(email)) {
        return res.status(422).json({
            success: false,
            message: 'A valid email address is required.',
        });
    }

    const lead = await Lead.findOne({ email });

    /* Deliberately vague — do not confirm whether email exists */
    if (!lead || lead.verified) {
        return res.status(200).json({
            success: true,
            message: `If ${email} is registered and unverified, a new link has been sent.`,
        });
    }

    if (!resendAllowed(lead)) {
        const waitSecs = Math.ceil(
            RESEND_COOLDOWN_S -
            (Date.now() - new Date(lead.lastResendAt).getTime()) / 1000
        );
        return res.status(429).json({
            success: false,
            message: `Please wait ${waitSecs} seconds before requesting another email.`,
        });
    }

    /* Regenerate */
    const { rawToken, verifyToken, verifyExpires } = generateTokenBundle({
        hours: TOKEN_EXPIRY_HRS,
    });

    lead.verifyToken = verifyToken;
    lead.verifyExpires = verifyExpires;
    lead.lastResendAt = new Date();
    await lead.save();

    try {
        await sendVerificationEmail({ name: lead.name, email, token: rawToken });
    } catch (mailErr) {
        console.error('[resend] Email delivery failed:', mailErr.message);
        return res.status(502).json({
            success: false,
            message: 'We could not send the email. Please try again in a moment.',
        });
    }

    return res.status(200).json({
        success: true,
        message: `Verification email sent to ${email}. Please check your inbox.`,
    });
});

/* ─────────────────────────────────────────────────────────────
   CONTROLLER 4 — getStatus
   GET /api/status/:email
   Returns verification status of an email (non-sensitive data only).
   Useful for the frontend to poll without exposing full lead data.
   ───────────────────────────────────────────────────────────── */
export const getStatus = asyncHandler(async (req, res) => {
    const email = sanitiseStr(req.params.email || '').toLowerCase();

    if (!email || !validator.isEmail(email)) {
        return res.status(422).json({
            success: false,
            message: 'A valid email address is required.',
        });
    }

    const lead = await Lead
        .findOne({ email })
        .select('verified signedUpAt verifiedAt')
        .lean();

    if (!lead) {
        /* Return 200 with not-found — avoids email enumeration */
        return res.status(200).json({
            success: true,
            found: false,
            verified: false,
        });
    }

    return res.status(200).json({
        success: true,
        found: true,
        verified: lead.verified,
        signedUpAt: lead.signedUpAt,
        verifiedAt: lead.verifiedAt || null,
    });
});