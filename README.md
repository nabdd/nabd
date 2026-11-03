# Nabd

Blood donor platform for Lebanon. Hospitals post a request, matching donors nearby get a WhatsApp message and answer with one tap.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, Motion and three.js (react-three-fiber).

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173.

## Routes

| Route | Screen |
| --- | --- |
| `/` | Animated landing page with a 3D hero |
| `/join` | Public donor sign-up form |
| `/join/success` | Sign-up confirmation |
| `/login` | Hospital sign in (any 4+ character password works in this demo) |
| `/app` | Hospital dashboard: requests |
| `/app/requests/new` | New request, donor matching, WhatsApp preview |
| `/app/requests/:id` | Live request tracking |
| `/app/donors` | Donor directory |
| `/donor` | Donor profile and history |
| `/whatsapp` | WhatsApp conversation preview |

All data is mock data in `src/data/mock.ts`. Light and dark themes follow the system setting, with a toggle.
