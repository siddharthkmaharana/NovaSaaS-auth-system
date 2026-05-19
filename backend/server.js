/* ============================================================
   NOVASAAS — server.js
   Express application entry point.
   Boots in this order:
     1. Validate required env vars (crash fast on missing config)
     2. Connect to MongoDB with retry logic
     3. Mount middleware stack (security → parsing → logging)
     4. Mount API routes
     5. Serve frontend static files
     6. 404 + global error handlers
     7. Start HTTP listener
   ============================================================ */

'use strict';

/* ── NODE BUILT-INS ──────────────────────────────────────── */
import path from 'path';
import { fileURLToPath } from 'url';

/* ── THIRD-PARTY ─────────────────────────────────────────── */
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import dotenv from 'dotenv';

/* ── INTERNAL ────────────────────────────────────────────── */
import { connectDB } from './config/db.js';
import authRoutes from './routes/auth.js';
import leadRoutes from './routes/lead.js';

/* ─────────────────────────────────────────────────────────────
   0. ENVIRONMENT
   ───────────────────────────────────────────────────────────── */
dotenv.config();

/* ESM __dirname shim */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/* ─────────────────────────────────────────────────────────────
   1. ENV VALIDATION — crash fast before anything else starts
   ───────────────────────────────────────────────────────────── */
const REQUIRED_VARS = [
    'PORT',
    'MONGO_URI',
    'BASE_URL',
    'MAIL_HOST',
    'MAIL_PORT',
    'MAIL_USER',
    'MAIL_PASS',
];

function validateEnv() {
    const missing = REQUIRED_VARS.filter(k => !process.env[k]);
    if (missing.length) {
        console.error('\n❌  Missing required environment variables:');
        missing.forEach(k => console.error(`     • ${k}`));
        console.error('\n   Copy .env.example to .env and fill in the values.\n');
        process.exit(1);
    }
    console.log('✅  Environment variables validated');
}

validateEnv();

/* Destructure commonly used vars after validation */
const {
    PORT = 3000,
    NODE_ENV = 'development',
    BASE_URL = `http://localhost:${PORT}`,
} = process.env;

const IS_PROD = NODE_ENV === 'production';
const IS_DEV = NODE_ENV === 'development';

/* ─────────────────────────────────────────────────────────────
   2. EXPRESS APP
   ───────────────────────────────────────────────────────────── */
const app = express();

/* ─────────────────────────────────────────────────────────────
   3. SECURITY MIDDLEWARE
   ───────────────────────────────────────────────────────────── */

/* 3a. Helmet — sets secure HTTP headers */
app.use(
    helmet({
        contentSecurityPolicy: {
            directives: {
                defaultSrc: ["'self'"],
                scriptSrc: [
                    "'self'",
                    "'unsafe-inline'",           /* allow inline scripts in HTML files  */
                    'https://fonts.googleapis.com',
                    'https://cdn.jsdelivr.net',  /* canvas-confetti CDN                 */
                ],
                styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
                fontSrc: ["'self'", 'https://fonts.gstatic.com'],
                imgSrc: ["'self'", 'data:', 'https:'],
                connectSrc: ["'self'"],
                frameSrc: ["'none'"],
                objectSrc: ["'none'"],
            },
        },
        crossOriginEmbedderPolicy: false, /* needed for canvas-confetti worker */
    })
);

/* 3b. CORS */
const ALLOWED_ORIGINS = IS_PROD
    ? [BASE_URL]
    : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'];

app.use(
    cors({
        origin(origin, cb) {
            /* Allow requests with no origin (Postman, curl, same-origin) */
            if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
            cb(new Error(`CORS: origin '${origin}' not allowed`));
        },
        methods: ['GET', 'POST', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization'],
        credentials: false,
    })
);

/* 3c. NoSQL injection sanitisation */
app.use(mongoSanitize({ replaceWith: '_' }));

/* ─────────────────────────────────────────────────────────────
   4. GLOBAL RATE LIMITER
   Broad limit — individual stricter limits on /api/signup
   ───────────────────────────────────────────────────────────── */
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,  /* 15 minutes */
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        message: 'Too many requests from this IP. Please try again in 15 minutes.',
    },
    skip: req => IS_DEV && req.ip === '::1', /* skip localhost in dev */
});

app.use('/api', globalLimiter);

/* ─────────────────────────────────────────────────────────────
   5. BODY PARSING & COMPRESSION
   ───────────────────────────────────────────────────────────── */
app.use(compression());
app.use(express.json({ limit: '10kb' }));      /* reject huge payloads */
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

/* ─────────────────────────────────────────────────────────────
   6. REQUEST LOGGING
   ───────────────────────────────────────────────────────────── */
const MORGAN_FORMAT = IS_PROD
    ? ':remote-addr :method :url :status :res[content-length] - :response-time ms'
    : 'dev';

app.use(morgan(MORGAN_FORMAT));

/* ─────────────────────────────────────────────────────────────
   7. HEALTH CHECK  (before auth routes — no rate limit)
   ───────────────────────────────────────────────────────────── */
app.get('/health', (_req, res) => {
    res.json({
        status: 'ok',
        env: NODE_ENV,
        uptime: Math.floor(process.uptime()),
        timestamp: new Date().toISOString(),
    });
});

/* ─────────────────────────────────────────────────────────────
   8. API ROUTES
   ───────────────────────────────────────────────────────────── */
app.use('/api', authRoutes);   /* POST /api/signup  GET /api/verify/:token */
app.use('/api', leadRoutes);   /* GET  /api/leads   GET /api/stats          */

/* ─────────────────────────────────────────────────────────────
   9. STATIC FILES — serve frontend
   ───────────────────────────────────────────────────────────── */
const FRONTEND_DIR = path.join(__dirname, '..', 'frontend');

app.use(
    express.static(FRONTEND_DIR, {
        maxAge: IS_PROD ? '7d' : 0,
        etag: true,
        lastModified: true,
        index: 'index.html',
        /* Cache busting for HTML files */
        setHeaders(res, filePath) {
            if (filePath.endsWith('.html')) {
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
        },
    })
);

/* SPA fallback — all non-API, non-static routes serve index.html */
app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

/* ─────────────────────────────────────────────────────────────
   10. 404 HANDLER
   ───────────────────────────────────────────────────────────── */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route ${req.method} ${req.originalUrl} not found`,
    });
});

/* ─────────────────────────────────────────────────────────────
   11. GLOBAL ERROR HANDLER
   ───────────────────────────────────────────────────────────── */
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    /* CORS errors */
    if (err.message && err.message.startsWith('CORS:')) {
        return res.status(403).json({ success: false, message: err.message });
    }

    /* Mongoose validation errors */
    if (err.name === 'ValidationError') {
        const messages = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ success: false, message: messages.join(', ') });
    }

    /* Mongoose duplicate key */
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return res.status(409).json({
            success: false,
            message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
        });
    }

    /* JSON parse errors from express.json() */
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ success: false, message: 'Invalid JSON in request body' });
    }

    /* Payload too large */
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ success: false, message: 'Request body too large (max 10kb)' });
    }

    /* Log unexpected errors */
    const statusCode = err.status || err.statusCode || 500;
    if (statusCode >= 500) {
        console.error(`[${new Date().toISOString()}] ❌ Server error:`, err.stack || err.message);
    }

    res.status(statusCode).json({
        success: false,
        message: IS_PROD && statusCode === 500
            ? 'An internal server error occurred. Please try again.'
            : err.message || 'Internal server error',
        ...(IS_DEV && { stack: err.stack }),
    });
});

/* ─────────────────────────────────────────────────────────────
   12. BOOT SEQUENCE
   ───────────────────────────────────────────────────────────── */
async function startServer() {
    try {
        /* Connect to MongoDB first — don't accept requests until DB is ready */
        await connectDB();

        const server = app.listen(PORT, () => {
            const divider = '─'.repeat(48);
            console.log(`\n${divider}`);
            console.log(`  ⚡  NovaSaaS server running`);
            console.log(`  🌐  ${BASE_URL}`);
            console.log(`  🔧  ENV   : ${NODE_ENV}`);
            console.log(`  🏥  Health: ${BASE_URL}/health`);
            console.log(`${divider}\n`);
        });

        /* ── GRACEFUL SHUTDOWN ── */
        function shutdown(signal) {
            console.log(`\n🛑  ${signal} received — shutting down gracefully…`);
            server.close(async () => {
                try {
                    const mongoose = await import('mongoose');
                    await mongoose.default.connection.close();
                    console.log('✅  MongoDB connection closed');
                } catch { /* ignore */ }
                console.log('👋  Server closed. Bye!\n');
                process.exit(0);
            });

            /* Force-kill after 10 s if graceful shutdown hangs */
            setTimeout(() => {
                console.error('⚠️  Forced shutdown after timeout');
                process.exit(1);
            }, 10_000);
        }

        process.on('SIGTERM', () => shutdown('SIGTERM'));
        process.on('SIGINT', () => shutdown('SIGINT'));

    } catch (err) {
        console.error('❌  Failed to start server:', err.message);
        process.exit(1);
    }
}

/* ─────────────────────────────────────────────────────────────
   13. UNHANDLED REJECTION / EXCEPTION GUARDS
   ───────────────────────────────────────────────────────────── */
process.on('unhandledRejection', (reason) => {
    console.error('❌  Unhandled Promise Rejection:', reason);
    process.exit(1);
});

process.on('uncaughtException', (err) => {
    console.error('❌  Uncaught Exception:', err.stack || err.message);
    process.exit(1);
});

/* ── GO ───────────────────────────────────────────────────── */
startServer();

export default app; /* for testing */