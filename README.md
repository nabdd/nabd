# Nabd

Blood donor platform for Lebanon. Hospitals post a request, matching donors nearby get a WhatsApp message and answer with one tap.

- **Frontend** (`/`): React 19, TypeScript, Vite, Tailwind CSS v4, Motion, three.js.
- **Backend** (`/server`): Node.js, NestJS 11, TypeScript, SQLite (`node:sqlite`), JWT auth.

## Run it

You need Node.js 22.13 or newer (24 recommended). Two terminals:

```bash
# 1. API on http://localhost:4000
cd server
npm install
npm run dev
```

```bash
# 2. Website on http://localhost:5173 (proxies /api to the API)
npm install
npm run dev
```

On first start in development the API creates `server/data/nabd.db` and fills it with demo data.

**Demo hospital login** (development only, never created in production):
`bloodbank@aubmc.org.lb` / `nabd-demo-2026`

Reset the demo data with `npm run db:reset` inside `server/` (stop the API first), then start it again.

## Frontend routes

| Route | Screen |
| --- | --- |
| `/` | Animated landing page with a 3D hero |
| `/join` | Public donor sign-up form (calls the API) |
| `/login` | Hospital sign in |
| `/app` | Requests dashboard (needs sign in) |
| `/app/requests/new` | New request, live donor matching, WhatsApp preview |
| `/app/requests/:id` | Live request tracking, updates every 8 seconds |
| `/app/donors` | Donor directory |
| `/donor`, `/whatsapp` | Design previews with sample data |

## API

All routes are under `/api`. Everything needs `Authorization: Bearer <token>` except the ones marked public or admin.

| Method and path | What it does |
| --- | --- |
| `GET /health` (public) | Health check for the host. 500 if the database cannot be read |
| **Auth** | |
| `POST /auth/login` (public) | Email and password, returns a token valid for 8 hours |
| `GET /auth/me` | The signed-in hospital |
| `PATCH /auth/password` | `currentPassword`, `newPassword` (10+ characters). Signs out other sessions, returns a new token |
| **Hospital settings** | |
| `GET /hospital` | Name, city, phone, address, default radius and minimum days |
| `PATCH /hospital` | Change any of those (email cannot be changed here) |
| **Donors** | |
| `POST /donors` (public) | Donor sign-up. Sends a WhatsApp verification message |
| `GET /donors` | Directory with filters: `type`, `q`, `eligible=now`, `page`, `pageSize` |
| `GET /donors/stats` | Totals and counts per blood type |
| `GET /donors/:id` | Profile with response history for your requests. Age and health answers only after the donor confirmed for you |
| `PATCH /donors/:id` | Record the typed `bloodType` or a `lastDonation` date. Only for donors who confirmed one of your requests |
| **Requests** | |
| `POST /requests/preview` | Which donors a request would reach, before sending |
| `POST /requests` | Create a request and send it on WhatsApp |
| `GET /requests?status=` | List with counts per status |
| `GET /requests/:id` | Stats, confirmed donors, activity log |
| `POST /requests/:id/remind` | Re-send to donors who have not replied |
| `POST /requests/:id/expand` | Widen to 30 km and notify more donors |
| `PATCH /requests/:id/fulfill` | Close the request |
| `POST /requests/:id/responses/:responseId/arrived` | Record a donation |
| `GET /stats/dashboard` | Numbers for the dashboard cards |
| **Blood drives** | |
| `GET /drives?when=upcoming\|past\|all` | Your drives with invite counts |
| `POST /drives` | `title`, `city`, `location`, `startsAt`, `endsAt` (ISO with timezone, at most 24 hours), optional `capacity`, `notes` |
| `GET /drives/:id` | The drive and who said they will come (short names only) |
| `PATCH /drives/:id` | Change details. `capacity: null` removes the limit |
| `DELETE /drives/:id` | Cancel (the drive stays listed as cancelled) |
| `POST /drives/:id/invite` | `radiusKm`, optional `bloodTypes`, `dryRun: true` to only count. Each donor is invited once per drive |
| **Message templates** | |
| `GET /templates` | The reply texts you can reword, with defaults and allowed placeholders |
| `PUT /templates/:key` | `{ "body": "..." }`. Placeholders like `{firstName}` are checked |
| `DELETE /templates/:key` | Back to the default text |
| **Reports** | |
| `GET /reports/summary?from=&to=` | Requests, units, response rates, per blood type and per day. Dates `YYYY-MM-DD` (UTC), default last 30 days, at most 366 |
| `GET /reports/export.csv?from=&to=` | The same requests as a CSV file |
| **Admin** (needs `X-Admin-Token`) | |
| `GET /admin/hospitals` | All hospital accounts |
| `POST /admin/hospitals` | Create one: `name`, `email`, `password`, `city`, optional `phone`, `address` |
| `POST /admin/hospitals/:id/password` | Set a new password (for a forgotten one). Signs the hospital out everywhere |
| **WhatsApp** | |
| `GET, POST /webhooks/whatsapp` (public, signed) | WhatsApp verification handshake and incoming replies |

### Creating the first hospital in production

Set `ADMIN_TOKEN` (32+ random characters) on the server, then:

```bash
curl -X POST https://<your-api>/api/admin/hospitals \
  -H "X-Admin-Token: <ADMIN_TOKEN>" -H "Content-Type: application/json" \
  -d '{"name":"AUBMC Blood Bank","email":"bloodbank@aubmc.org.lb","password":"<10+ characters>","city":"Beirut"}'
```

Without `ADMIN_TOKEN` the admin routes answer 404, as if they did not exist.

### How matching works

A donor is contacted only if they are verified, not opted out or paused, have a compatible blood type for the patient, live inside the radius, and are past the minimum days since their last donation (donors within 14 days of eligible are listed but not ticked). The server decides who is eligible. The client can only narrow the list.

Distances use the city centres of the hospital and the donor, because donors register with a city, not an address.

### Privacy

- Hospitals see "Rami H." and "+961 70 ••• 456" until a donor says yes to one of that hospital's requests. Only then are the full name and number shown.
- The sign-up form answers the same way whether or not a number is already registered, so it cannot be used to look people up.
- Replying `STOP` on WhatsApp opts a donor out. Tapping "Pause 30 days" pauses them.
- Passwords are hashed with bcrypt. Login responses are identical for unknown email and wrong password. Sign-in and sign-up are rate limited.

## WhatsApp

`WHATSAPP_PROVIDER=console` (the default) logs messages and keeps the latest in memory instead of sending them. In development you can play the donor side:

```bash
# See what was "sent"
curl http://localhost:4000/api/dev/outbox
# Donor taps "I can donate" (use the id from a button in the outbox, e.g. yes:126)
curl -X POST http://localhost:4000/api/dev/simulate-reply -H 'Content-Type: application/json' \
  -d '{"requestDonorId":126,"action":"yes"}'
# Then action "eta_1h", "eta_today", "eta_tomorrow", "no" or "pause"
```

These `/api/dev` routes answer 404 when `NODE_ENV=production`.

To send real messages set `WHATSAPP_PROVIDER=cloud` and fill in the variables in `server/.env.example` (copy it to `server/.env`). You need a WhatsApp Business account, and two templates approved by Meta:

- `blood_request_urgent_v2` (body variables in order): `{{1}}` donor first name, `{{2}}` hospital, `{{3}}` blood type and component, `{{4}}` units, `{{5}}` time window, `{{6}}` distance, `{{7}}` note. Three quick-reply buttons: "I can donate", "Not this time", "Pause 30 days".
- `donor_verify_v1`: `{{1}}` donor first name, asking them to reply YES.
- `blood_drive_invite_v1`: `{{1}}` donor first name, `{{2}}` hospital, `{{3}}` drive title, `{{4}}` date and time, `{{5}}` location. Two quick-reply buttons: "I will come", "Not this time".

Point the webhook in the Meta dashboard to `https://<your-host>/api/webhooks/whatsapp` with your verify token. Deliveries are rejected unless they carry a valid `X-Hub-Signature-256`.

The cloud provider has not been run against Meta's servers yet. Everything else is covered by automated tests.

## Tests and checks

```bash
cd server
npm run typecheck
npm test          # 41 end-to-end tests against an in-memory database
cd ..
npm run build     # typecheck and build the website
```

## Production notes

- Set `NODE_ENV=production`, a `JWT_SECRET` of 32+ characters, and `CORS_ORIGIN` if the website is on another host.
- Demo data is not created in production. Create hospital accounts with `POST /api/admin/hospitals` (see above).
- Set the host's health check path to `/api/health`.
- Databases from an older version are upgraded automatically on start (new columns and tables are added, nothing is removed).
- SQLite is a single file and fine for one server. For several servers move to Postgres, which means replacing `server/src/database/database.service.ts`.
