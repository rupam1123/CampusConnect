# CampusConnect

CampusConnect is a campus collaboration platform maintained by **Rupam**.

- **Live application:** https://campusconnect-rupam-2026.lucentterrapin1.chatgpt.site
- **GitHub:** https://github.com/rupam1123/CampusConnect
- **Administrator:** drupam1289@gmail.com

## Hosted application

The frontend, API backend and persistent D1 database run together on ChatGPT Sites. Sign in with a ChatGPT account associated with a Gmail address. The server uses the platform's verified identity; typing another person's email or changing browser storage does not grant access to their account.

Students can create their own profiles. Professors must first be authorized by Rupam through **Admin** on the login screen. The administrator can register a Professor profile with the same account and use the normal workspace.

### Features

- Professor course creation with a date range and weekday schedule; lecture sessions are generated automatically.
- Manual student enrollment, Excel enrollment using an `Email` column, and co-instructor access.
- Course discussions with replies, unread counts and automatic updates every three seconds.
- Five-parameter student feedback, duplicate protection, and professor analytics.
- Project listings with branch, batch and CPI eligibility; student resume-link applications and professor decisions.
- Campus forum posts, votes and comments.
- Profile updates and explicit account anonymization. Public discussion history remains; owners must remove their courses and projects before deleting their accounts.

The hosted version uses ChatGPT sign-in instead of email OTP/password authentication, and polling instead of Socket.IO. It does not need a separate email server, MongoDB service or WebSocket host.

## Run and verify locally

Use Node.js **24** and npm.

```sh
npm ci
npm ci --prefix backend
npm ci --prefix frontend
npm run lint --prefix frontend
npm run build
npm test
npm start
```

The preview runs at http://127.0.0.1:4173 and stores local data in the ignored `outputs/preview.sqlite` file. It simulates Rupam's identity **only for local QA**. This local bridge is not part of the deployed Worker. Production identity comes exclusively from ChatGPT Sites.

The integration suite uses an isolated in-memory SQLite database. It exercises registration, professor authorization, course scheduling, manual/Excel enrollment, membership restrictions, discussions, feedback/analytics, projects/applications, forum activity and account deletion protections. It never connects to production data.

## Structure

| Directory | Purpose |
| --- | --- |
| `frontend/` | React UI and Vite build |
| `hosted/worker.mjs` | Production API routing, platform identity and server-side permissions |
| `hosted/store.mjs` | Request-scoped D1 document adapter for shared controllers |
| `backend/controllers/` | Shared application behavior |
| `backend/models/` | Shared document definitions and retained MongoDB models |
| `backend/server.js` | Optional standalone Express/MongoDB/Socket.IO server |
| `drizzle/` | Versioned, additive D1 schema migrations |
| `tests/` | Local integration regression suite |
| `Documents/` | Updated project submission documents |
| `.openai/hosting.json` | Sites project identity and database binding |

## Deployment and data

`npm run build` produces the production frontend and a Worker at `dist/server/index.js`. The Sites publishing workflow packages this output, synchronizes the exact source commit and applies the schema migrations. GitHub pushes run verification through GitHub Actions; they do not automatically publish Sites deployments.

`OWNER_EMAIL` is configured as a hosted runtime secret. Credentials and local database files are excluded from Git. Do not put secrets in `hosting.json`, frontend code or commits.

This deployment starts with a **new database**, as requested. No old MongoDB connection or backup was supplied. No migration or deletion of an external database is performed. Database schemas are deployed separately from user records, and ordinary rebuilds do not reset records.

## Optional original MongoDB backend

The original Express backend is retained for a separate Node host. Copy `backend/.env.example` to `backend/.env` and configure MongoDB, a JWT secret, the admin password and Gmail SMTP credentials. Run `npm start --prefix backend`, then `npm run dev --prefix frontend`. Vite proxies `/api` and `/socket.io` to port 5000.

That version accepts Gmail registrations while retaining support for existing IITK accounts. Standalone email delivery is disabled by default. To enable signup and reset emails on a separate Node host, explicitly set ENABLE_EMAIL_DELIVERY=true and configure your own EMAIL_USER, EMAIL_PASS and matching OWNER_EMAIL. The ChatGPT-hosted deployment uses neither these passwords nor MongoDB records.
