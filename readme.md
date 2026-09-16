# TA Portal — backend + frontend

A CAP (Cloud Application Programming Model) backend for the candidate + Talent
Acquisition onboarding portal, plus the React frontend that runs against it.

File or Folder | Purpose
---------|----------
`db/` | domain model (`schema.cds`)
`srv/` | service definition + implementation, resume parser, mailer, email templates
`app/` | built frontend static files, served by the backend at runtime (generated — don't edit directly)
`frontend/` | the React app source (Vite)
`seed-*.mjs` | one-off scripts to populate demo data / lookup values

## Running it

The backend serves both the API and the built frontend on the same port, so
there's only one thing to start day-to-day:

```bash
npm install       # backend deps (repo root)
npm start         # cds-serve, serving API + UI at http://localhost:4004
```

Do **not** use `cds watch` here — it auto-redeploys the schema on every file
change, which wipes the persistent `db.sqlite` data. Use plain `npm start`.

To work on the frontend itself (hot reload):

```bash
cd frontend
npm install
npm run dev       # Vite dev server on :5173, proxies /odata to :4004
```

After frontend changes, rebuild and sync into the backend's `app/` folder so
`npm start` serves the latest UI:

```bash
cd frontend
npm run build:backend
```

## Email

Candidate notifications go out over Gmail SMTP once configured — copy
`.env.example` to `.env` and fill in `GMAIL_USER` / `GMAIL_APP_PASSWORD`.
Without those set, the app just logs and skips sending.

## Tests

```bash
cd frontend
npm test          # smoke test + full end-to-end flow against an isolated backend instance
```

## Learn more

CAP docs: <https://cap.cloud.sap>.
