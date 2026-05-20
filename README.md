# Round Table

**Where your people gather.** A macOS-styled unified collaboration platform that replaces the fragmented mess of Slack, WhatsApp, Google Suite, email, and text messaging with a single, visually intuitive interface organized around the metaphor of gathering at a table.

Built for families, faith communities, project teams, and neighborhoods.

## Live URLs

- **Preview**: https://3000-iwvsgsrstz8hjhpi7s3t2-8f57ffe2.sandbox.novita.ai
- **GitHub**: https://github.com/Cmooreculinary/round-table

## Features (39+ Implemented)

### Core
- **Round Table Visualization** - Live/dormant states with animated glow, shimmer, member seats
- **5-Step Onboarding Wizard** - Welcome, Profile, Color, First Table, Invite (with Skip option)
- **Dark/Light Mode** - Smooth theme transitions with localStorage persistence
- **macOS Dock** - Glass morphism, hover effects, tooltips, badge counts

### Communications Hub
- **Email Client** - Inbox, Sent, Starred, Compose, Reply, Star toggle
- **iMessage-style Texting** - Green/gray bubbles, thread sidebar, SMS labels
- **Direct Messages** - Two-panel chat with walkie/video shortcuts
- **Walkie-Talkie** - Push-to-talk, ping notifications, Web Audio beeps

### Collaboration
- **Shared Calendar** - Monthly grid, color-coded events, table filters
- **File Sharing** - Drag-and-drop, 8 file types, modal-based naming
- **Contacts** - Search, On/Not-On sections, invite/chat buttons
- **App Launcher** - 24 apps (Apple, Google, Microsoft) with filters

### Social
- **Invite System** - Generate codes, copy links, usage/expiry tracking
- **Join Flow** - `/join/:code` landing page with register/login
- **Referral Tracking** - Invited/joined counts, badge progression, leaderboard
- **Video Call UI** - Full-screen overlay with controls

### Security
- **Authentication** - SHA-256 + salt via Web Crypto, HttpOnly SameSite cookies
- **CSRF Protection** - Token-based on all POST/PUT/DELETE endpoints
- **XSS Prevention** - `escapeHtml()` on all user input
- **Rate Limiting** - 100 req/min/IP, sliding window, auto-cleanup
- **Security Headers** - HSTS, CSP, X-Frame-Options DENY, X-Content-Type-Options, Referrer-Policy
- **Input Validation** - Typed validators for email, password, names, colors, dates, etc.

## API Endpoints (30+)

### Authentication
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/auth/register` | Create account (name, email, password) |
| POST | `/api/auth/login` | Login (returns session token + cookie) |
| POST | `/api/auth/logout` | Destroy session |
| GET | `/api/csrf-token` | Get CSRF token |

### User & Members
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/me` | Current user profile |
| PUT | `/api/me` | Update name, color, status, email |
| GET | `/api/members` | All members (safe: no passwordHash) |

### Tables
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tables` | List tables with member details |
| GET | `/api/tables/:id` | Single table |
| POST | `/api/tables` | Create table |
| PUT | `/api/tables/:id` | Update table |
| DELETE | `/api/tables/:id` | Delete table (creator only) |
| POST | `/api/tables/:id/items` | Add shared item |
| DELETE | `/api/tables/:id/items/:itemId` | Remove item |

### Communications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/messages?with=userId` | Chat messages |
| POST | `/api/messages` | Send message |
| GET | `/api/emails?folder=inbox` | Emails by folder |
| POST | `/api/emails` | Send email |
| POST | `/api/emails/:id/read` | Mark read |
| POST | `/api/emails/:id/star` | Toggle star |
| GET | `/api/texts?with=userId` | Text thread |
| POST | `/api/texts` | Send text |

### Calendar & Notifications
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/events` | Calendar events |
| POST | `/api/events` | Create event |
| DELETE | `/api/events/:id` | Delete event |
| GET | `/api/notifications` | All notifications |
| POST | `/api/notifications/read-all` | Mark all read |
| POST | `/api/walkie/ping` | Ping a user |

### Social
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/invites` | Active invites |
| POST | `/api/invites` | Create invite code |
| POST | `/api/invites/join` | Join via code |
| DELETE | `/api/invites/:id` | Delete invite |
| GET | `/api/contacts` | All contacts |
| POST | `/api/contacts` | Add contact |
| DELETE | `/api/contacts/:id` | Remove contact |
| POST | `/api/contacts/:id/invite` | Invite contact |
| GET | `/api/referrals` | Referral stats |
| GET | `/api/referrals/leaderboard` | Top inviters |

### Pages
| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Main app |
| GET | `/join/:code` | Invite join landing page |
| GET | `/favicon.ico` | SVG favicon |

## Tech Stack

- **Backend**: Hono v4 on Cloudflare Pages
- **Frontend**: Vanilla JS (~1,900 lines) + Tailwind CSS (CDN)
- **CSS**: Custom macOS design system (~3,100 lines) with full dark mode
- **Icons**: Font Awesome 6.5
- **Audio**: Web Audio API (walkie-talkie beeps)
- **Design**: macOS-inspired with Apple system font stack
- **Build**: Vite + @hono/vite-cloudflare-pages
- **Security**: Web Crypto API (SHA-256), CSRF tokens, XSS escaping

## Project Structure

```
round-table/
├── src/
│   └── index.tsx              # Hono server, 30+ API routes, HTML pages
├── public/
│   └── static/
│       ├── app.js             # Full frontend application
│       └── style.css          # Complete macOS design system
├── package.json
├── tsconfig.json
├── vite.config.ts
├── wrangler.jsonc
├── ecosystem.config.cjs       # PM2 dev config
├── EMERGENT_PROMPT.md          # Full build specification
├── EXPLAINER.md                # Product explainer
├── PROBLEMS_SOLVED.md          # 65 problems solved
└── README.md                   # This file
```

## Development

```bash
npm run build          # Build for production
npm run dev:sandbox    # Start dev server (port 3000)
pm2 start ecosystem.config.cjs  # Start with PM2
```

## Deployment

- **Platform**: Cloudflare Pages
- **Status**: Launch-Ready
- **Build Command**: `npm run build`
- **Output Directory**: `dist/`
- **Production Branch**: `main`
- **Last Updated**: 2026-04-21

## License

Proprietary - All Rights Reserved
