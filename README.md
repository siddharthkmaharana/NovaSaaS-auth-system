# ⚡ NovaSaaS — Futuristic SaaS Landing Page + Sign Up Workflow

> A conversion-optimized SaaS landing page with lead capture, email verification, and a glowing thank-you dashboard — built with a retro-futuristic cyberpunk aesthetic.

---

## 🌌 Project Vision

**NovaSaaS** is a full-stack SaaS boilerplate featuring a jaw-dropping landing page paired with a complete user onboarding flow: sign-up → email verification → personalized dashboard. Every pixel is intentional — dark glassmorphism UI, neon accents, particle backgrounds, and buttery-smooth micro-animations.

---

## 🗂️ Project Structure

```
novasaas/
├── frontend/
│   ├── index.html              # Landing page (hero, features, pricing, CTA)
│   ├── signup.html             # Sign-up form with validation
│   ├── verify.html             # Email verification status page
│   ├── dashboard.html          # Thank-you / welcome dashboard
│   ├── css/
│   │   ├── globals.css         # CSS variables, resets, typography
│   │   ├── landing.css         # Landing page styles + animations
│   │   ├── auth.css            # Sign-up / verify page styles
│   │   └── dashboard.css       # Dashboard styles
│   └── js/
│       ├── particles.js        # Canvas particle background engine
│       ├── animations.js       # Scroll-triggered reveals, counters
│       ├── form.js             # Client-side validation + API calls
│       └── dashboard.js        # Dashboard data + greeting logic
│
├── backend/
│   ├── server.js               # Express app entry point
│   ├── config/
│   │   ├── db.js               # MongoDB connection (Mongoose)
│   │   └── mailer.js           # Nodemailer transporter config
│   ├── models/
│   │   └── Lead.js             # Mongoose Lead schema
│   ├── routes/
│   │   ├── auth.js             # POST /api/signup, GET /api/verify/:token
│   │   └── lead.js             # GET /api/leads (admin)
│   ├── controllers/
│   │   └── authController.js   # Business logic for sign-up & verify
│   ├── middleware/
│   │   └── rateLimiter.js      # Express-rate-limit for /api/signup
│   └── utils/
│       └── tokenGen.js         # Crypto token generator
│
├── .env.example                # Environment variable template
├── package.json
└── README.md
```

---

## 🎨 Design System

| Token             | Value                          | Usage                         |
|-------------------|-------------------------------|-------------------------------|
| `--clr-bg`        | `#050810`                     | Page background               |
| `--clr-surface`   | `rgba(255,255,255,0.04)`      | Glass card background         |
| `--clr-border`    | `rgba(99,179,237,0.15)`       | Card borders                  |
| `--clr-neon`      | `#00f5d4`                     | Primary CTA, highlights       |
| `--clr-pulse`     | `#7c3aed`                     | Secondary accent (purple)     |
| `--clr-text`      | `#e2e8f0`                     | Body text                     |
| `--clr-muted`     | `#64748b`                     | Placeholder, captions         |
| `--font-display`  | `'Orbitron', sans-serif`      | Headlines, logo               |
| `--font-body`     | `'DM Sans', sans-serif`       | Body copy, form labels        |
| `--font-mono`     | `'JetBrains Mono', monospace` | Code blocks, token display    |

**Visual effects:** Animated particle canvas · Glassmorphism cards · Neon glow box-shadows · CSS grid noise overlay · Gradient mesh backgrounds · Scroll-triggered fade-ups · Magnetic CTA button · Typewriter hero text

---

## 🛠️ Tech Stack

| Layer        | Technology                          |
|--------------|-------------------------------------|
| Frontend     | HTML5, Tailwind CSS (CDN), Vanilla JS |
| Backend      | Node.js 20+, Express 4              |
| Database     | MongoDB Atlas (free tier)           |
| ODM          | Mongoose 8                          |
| Email        | Nodemailer + Gmail App Password     |
| Security     | `crypto` (built-in), `express-rate-limit`, `helmet` |
| Dev Tools    | Nodemon, dotenv                     |

---

## ⚙️ Environment Variables

Create a `.env` file from `.env.example`:

```env
# Server
PORT=3000
NODE_ENV=development
BASE_URL=http://localhost:3000

# MongoDB
MONGO_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/novasaas

# Nodemailer (Gmail)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your@gmail.com
MAIL_PASS=your_16_char_app_password   # Gmail → Security → App Passwords

# App
JWT_SECRET=change_me_to_a_random_64_char_string
TOKEN_EXPIRY_HOURS=24
```

> **Gmail App Password setup:** Google Account → Security → 2-Step Verification → App Passwords → Generate for "Mail / Other".

---

## 🚀 Getting Started

### Prerequisites
- Node.js ≥ 20
- MongoDB Atlas account (free)
- Gmail account with 2FA enabled

### Installation

```bash
# 1. Clone the repo
git clone https://github.com/yourusername/novasaas.git
cd novasaas

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# → Edit .env with your credentials

# 4. Start development server
npm run dev

# 5. Open in browser
open http://localhost:3000
```

### Scripts

| Command         | Description                          |
|-----------------|--------------------------------------|
| `npm run dev`   | Start with Nodemon (hot-reload)      |
| `npm start`     | Production start                     |
| `npm run seed`  | Seed 5 sample leads to MongoDB       |

---

## 🔌 API Reference

### `POST /api/signup`

Register a new lead and trigger verification email.

**Request Body:**
```json
{
  "name": "Alex Mercer",
  "email": "alex@example.com",
  "company": "TechCorp"         // optional
}
```

**Response `201`:**
```json
{
  "success": true,
  "message": "Verification email sent to alex@example.com"
}
```

**Errors:**
| Code | Reason                        |
|------|-------------------------------|
| 400  | Missing/invalid fields        |
| 409  | Email already registered      |
| 429  | Rate limit exceeded (5/15min) |

---

### `GET /api/verify/:token`

Verify email token from the link sent in the email.

**Response `200`:** Redirects to `/dashboard.html?verified=true&name=Alex`

**Errors:**
| Code | Reason                        |
|------|-------------------------------|
| 400  | Invalid or expired token      |
| 404  | Token not found               |

---

## 📧 Email Template

Verification emails are sent as styled HTML with:
- Dark-themed branded template matching the site
- Large neon "Verify My Email" button
- Expiry notice (24 hours)
- Fallback plain-text version

---

## 🗃️ MongoDB Schema — `Lead`

```js
{
  name:            String,   // required
  email:           String,   // required, unique, lowercase
  company:         String,   // optional
  verified:        Boolean,  // default: false
  verifyToken:     String,   // crypto random hex (64 chars)
  verifyExpires:   Date,     // now + 24h
  signedUpAt:      Date,     // default: Date.now
  verifiedAt:      Date      // set on verification
}
```

---

## 🎯 Landing Page Sections

| Section       | Description                                             |
|---------------|---------------------------------------------------------|
| **Navbar**    | Logo + nav links + "Get Early Access" CTA               |
| **Hero**      | Typewriter headline, subtext, particle canvas, dual CTA |
| **Social Proof** | Animated counter (users, uptime, integrations)       |
| **Features**  | 6-card bento grid with hover glow effects               |
| **How It Works** | 3-step horizontal flow with animated connector line  |
| **Pricing**   | 3-tier cards with recommended badge, toggle monthly/annual |
| **Testimonials** | Infinite auto-scroll carousel                        |
| **CTA Banner**| Full-width gradient section with email capture          |
| **Footer**    | Links, social icons, legal                              |

---

## ✅ Feature Checklist

### Frontend
- [ ] Animated particle canvas background (Hero)
- [ ] Typewriter effect for hero headline
- [ ] Scroll-triggered section reveals (Intersection Observer)
- [ ] Glassmorphism feature cards with neon hover glow
- [ ] Animated statistics counter
- [ ] Pricing toggle (monthly ↔ annual with discount badge)
- [ ] Infinite testimonial carousel (CSS marquee)
- [ ] Sign-up form with real-time validation
- [ ] Loading state on form submit button
- [ ] Email verification status page
- [ ] Personalized thank-you dashboard with user's name

### Backend
- [ ] Express server with CORS, Helmet, compression
- [ ] MongoDB connection with retry logic
- [ ] `POST /api/signup` with duplicate-email check
- [ ] Crypto token generation & storage
- [ ] Nodemailer HTML email dispatch
- [ ] `GET /api/verify/:token` with expiry check
- [ ] Verified lead count endpoint (for live counter)
- [ ] Rate limiting (5 requests / 15 min per IP)
- [ ] Global error handler middleware
- [ ] Environment variable validation on startup

---

## 🛡️ Security Measures

- `helmet` — Sets secure HTTP headers
- `express-rate-limit` — Prevents signup spam
- Email token uses `crypto.randomBytes(32)` — cryptographically secure
- Token expiry enforced server-side (24 hours)
- MongoDB `unique` index on email field
- Input sanitization with `validator.js`
- `.env` excluded from git via `.gitignore`

---

## 🌐 Deployment (Recommended Stack)

| Service       | Purpose              | Free Tier |
|---------------|----------------------|-----------|
| **Render**    | Node.js backend      | ✅        |
| **MongoDB Atlas** | Database         | ✅ 512MB  |
| **Vercel**    | Frontend static host | ✅        |
| **Gmail SMTP**| Email sending        | ✅        |

---

## 📸 Page Flow

```
Landing Page (index.html)
      ↓  [Click "Get Early Access"]
  Sign-Up Page (signup.html)
      ↓  [Submit form]
  Email Sent Page (verify.html)  ←── User checks email
      ↓  [Click verification link in email]
  Backend: GET /api/verify/:token
      ↓  [Token valid]
  Dashboard (dashboard.html?verified=true&name=Alex)
```

---

## 📄 License

MIT © 2026 NovaSaaS. Built with ☕ and neon dreams.
