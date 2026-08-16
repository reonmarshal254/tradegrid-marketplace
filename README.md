# Secondhand Marketplace

A professional marketplace platform for buying and selling secondhand items.

- **Sellers** post items (name, description, price, age, receipt available) with photos.
- **Buyers** browse/search the feed, view full item details, react to items, and contact sellers directly via **WhatsApp** or **phone call**.
- **Notifications** via the in-app bell and **Web Push** (browser notifications) when someone reacts to your items.
- Auth with **email/password** or **Google sign-in**, email verification and password reset via **Nodemailer**.

## Tech stack

| Layer     | Technology                                   |
| --------- | -------------------------------------------- |
| Backend   | Node.js, Express, JWT                        |
| Database  | PostgreSQL (remote, e.g. Neon / Supabase / RDS) |
| Images    | Cloudinary                                   |
| Email     | Nodemailer (SMTP)                            |
| Push      | Web Push (VAPID) + Service Worker            |
| Frontend  | React 18, Vite, Tailwind CSS 4, React Router |

## Project structure

```
secondhand-items/
├── backend/
│   ├── src/
│   │   ├── config/        # env + postgres pool
│   │   ├── controllers/   # auth, items, notifications, push, users
│   │   ├── db/            # schema.sql + migrate script
│   │   ├── middleware/    # auth, error handling, image upload
│   │   ├── routes/        # API routes
│   │   ├── services/      # cloudinary, mailer, push/notifications
│   │   ├── utils/         # jwt/token helpers
│   │   ├── app.js
│   │   └── server.js
│   ├── scripts/           # VAPID key generator
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── auth/          # auth context (token + user state)
│   │   ├── components/    # navbar, item cards, icons, ui
│   │   ├── pages/         # all routes/pages
│   │   ├── push/          # service worker + push subscription
│   │   └── utils/
│   └── .env.example
└── package.json           # root convenience scripts
```

## Getting started

### 1. Prerequisites

- Node.js 18+
- A PostgreSQL database (local or remote)
- A Cloudinary account
- An SMTP provider (Gmail app password, Resend, SendGrid, Mailgun, etc.)
- A Google OAuth Client ID (optional, only needed for "Sign in with Google")

### 2. Install dependencies

```bash
npm run install:all
```

### 3. Configure the backend

```bash
cp backend/.env.example backend/.env
```

Fill in every value in `backend/.env`:

| Variable                  | Description                                        |
| ------------------------- | -------------------------------------------------- |
| `DATABASE_URL`            | `postgres://user:password@host:5432/dbname`        |
| `JWT_SECRET`              | long random string                                 |
| `CLOUDINARY_*`            | Cloudinary credentials (Dashboard → API Keys)      |
| `SMTP_*`                  | SMTP server credentials + `MAIL_FROM`              |
| `GOOGLE_CLIENT_ID`        | Google OAuth Client ID (see below)                 |
| `VAPID_PUBLIC_KEY`        | generated below                                    |
| `VAPID_PRIVATE_KEY`       | generated below                                    |
| `VAPID_SUBJECT`           | `mailto:you@example.com`                           |

Generate your Web Push VAPID keys:

```bash
npm run keys --prefix backend
```

Copy the two printed keys into `.env`.

### 4. Create the database schema

```bash
npm run migrate --prefix backend
```

### 5. Configure the frontend

```bash
cp frontend/.env.example frontend/.env
```

Set `VITE_GOOGLE_CLIENT_ID` (optional). The Vite dev server proxies `/api` to the backend automatically, so no API URL is needed locally.

### 6. Run locally

```bash
npm run dev:backend   # terminal 1 -> http://localhost:5000
npm run dev:frontend  # terminal 2 -> http://localhost:5173
```

## Google sign-in setup

The app uses the OAuth 2.0 **authorization-code flow**:

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials).
2. Create an **OAuth 2.0 Client ID** of type **Web application**.
3. Add authorized redirect URIs:
   - `http://localhost:5173/auth/google/callback`
   - `https://your-production-domain/auth/google/callback`
4. Put the **Client ID** in `frontend/.env` (`VITE_GOOGLE_CLIENT_ID`).
5. Put the **Client ID** and **Client Secret** in `backend/.env`:
   - `GOOGLE_CLIENT_ID`
   - `GOOGLE_CLIENT_SECRET`

The redirect URI sent by the browser is validated against your `CLIENT_URL` origins, so the same backend config works for multiple environments.

## Push notifications

Web Push needs a secure context (`https://` or `localhost`). In production your frontend must be served over HTTPS. Users opt in from **Profile settings → Push notifications**. After that they are notified immediately when someone reacts to their items, even when the tab is closed.

## API overview

| Method | Endpoint                          | Auth | Description                          |
| ------ | --------------------------------- | ---- | ------------------------------------ |
| POST   | `/api/auth/register`              |      | Register with email/password         |
| POST   | `/api/auth/login`                 |      | Log in                               |
| POST   | `/api/auth/google`                |      | Exchange Google auth `code` + `redirect_uri` |
| POST   | `/api/auth/verify-email`          |      | Verify email with emailed token      |
| POST   | `/api/auth/resend-verification`   |      | Resend verification email            |
| POST   | `/api/auth/forgot-password`       |      | Send password reset email            |
| POST   | `/api/auth/reset-password`        |      | Reset password with emailed token    |
| GET    | `/api/auth/me`                    | ✅   | Current user                         |
| PUT    | `/api/auth/me`                    | ✅   | Update profile (name/phone/whatsapp/location) |
| GET    | `/api/items`                      | opt  | List items (search, price, location, sort, pagination) |
| GET    | `/api/items/my`                   | ✅   | My items                             |
| POST   | `/api/items`                      | ✅   | Create item (multipart images)       |
| GET    | `/api/items/:id`                  | opt  | Item details (seller contact info)   |
| PUT    | `/api/items/:id`                  | ✅   | Update item                          |
| DELETE | `/api/items/:id`                  | ✅   | Delete item                          |
| POST   | `/api/items/:id/sold`             | ✅   | Mark as sold                         |
| POST   | `/api/items/:id/react`            | ✅   | Toggle reaction + notify seller      |
| GET    | `/api/notifications`              | ✅   | List notifications                   |
| POST   | `/api/notifications/read-all`     | ✅   | Mark all read                        |
| POST   | `/api/notifications/:id/read`     | ✅   | Mark one read                        |
| GET    | `/api/push/vapid-public-key`      |      | Public VAPID key for the browser     |
| POST   | `/api/push/subscribe`             | ✅   | Save a push subscription             |
| POST   | `/api/push/unsubscribe`           | ✅   | Remove a push subscription           |
| GET    | `/api/users/:id`                  | ✅   | Public user profile + stats          |

## Production deployment

1. **Frontend build** — the backend serves `frontend/dist` automatically in production mode:

   ```bash
   npm run build
   NODE_ENV=production npm start --prefix backend
   ```

2. Set `NODE_ENV=production` and update `CLIENT_URL` to your frontend domain.
3. Host the backend on a service with HTTPS (Railway, Render, Fly.io, a VPS with Caddy/Nginx, etc.).
4. Push notifications require HTTPS on your domain.

## Security notes

- Passwords are hashed with bcrypt (12 rounds).
- JWT is signed and verified server-side; routes use middleware guards.
- Express rate limiting on auth endpoints; Helmet sets secure headers.
- Image uploads are validated by MIME type and size (max 8 MB each, 8 per item).
- All database access uses parameterized queries (SQL injection safe).
- Push subscriptions are cleaned up automatically when the browser unsubscribes.

## License

MIT
