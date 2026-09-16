# Ccentrik — Recruitment & Onboarding (Frontend Prototype)

A fully interactive **frontend-only** prototype of an enterprise HR recruitment and
employee-onboarding platform. There is **no backend, no database and no API** — every
workflow action runs in the browser against mock data and is persisted to
`localStorage`.

Built with **React + Vite + React Router + Lucide**. The **Talent Acquisition** and
**Candidate** areas share a premium light UI (`src/styles/ta.css`,
`src/components/ta/`); the HR area still uses the original SAP-inspired design system.

## Getting started

```bash
npm install
npm run dev        # http://localhost:5173
```

Other scripts:

| Script | Purpose |
| --- | --- |
| `npm run build` | Production build |
| `npm run preview` | Serve the production build |
| `npm run test:routes` | SSR-renders every route and reports crashes |
| `npm run test:flow` | Drives the full acceptance workflow through the real reducers |
| `npm test` | Runs both test suites |
| `npm run graph` | Regenerate the code map in `graph/` (`GRAPH.md` + data) |
| `npm run graph:open` | Serve `graph/index.html` (force-directed code map) and open it |

## Roles

At `/login` pick a role — this is a pure frontend simulation, no auth:

- **Candidate** — browse jobs, apply, upload a resume (with simulated auto-fill),
  track the application, upload documents, accept/decline the offer.
- **Talent Acquisition** — review applications (approve / return / reject), schedule
  and grade multiple interview rounds, verify documents, prepare offers.
- **HR** — approve or return offers, verify documents, confirm joining and create the
  employee record.

Use the top-bar log-out icon (or the people icon in the candidate header) to switch roles.

## End-to-end flow

```
Candidate applies  →  Candidate ID + Application ID generated
      → TA review (approve)
      → Interview rounds (schedule → record Pass/Fail/Hold)
      → Document verification (candidate uploads → TA/HR verify/reject)
      → Offer prepared by TA
      → HR approves → offer issued
      → Candidate accepts → Joining pending
      → HR marks joining complete → Employee ID generated
```

Every transition writes an entry to the activity timeline and (where relevant) a
notification and a toast. `npm run test:flow` exercises all 21 steps of this flow.

## Project structure

```
src/
├── components/
│   ├── common/       Button, Field, Modal/Drawer, Table, Badge, Timeline, Stepper, …
│   ├── ta/           premium TA UI kit — Card, DataGrid, KpiCard, DonutChart,
│   │                 FunnelChart, Tag, Toolbar, Pager, TAHeader, …
│   ├── navigation/    Sidebar, Topbar, TASidebar, TATopbar, GlobalSearch, …
│   ├── routing/       RoleRoute guard
│   ├── workflow/      CandidateProfile, ScheduleInterviewModal, InterviewResultModal,
│   │                  OfferDrawer, DocumentTable, ReasonModal
│   └── JobCard.jsx
├── context/          AppContext (all state + workflow actions), ToastContext
├── constants/        statuses.js (central status registry), roles.js
├── data/             jobs.js, seed.js (mock candidates/interviews/offers + a
│                     deterministic generator that fills the pipeline)
├── hooks/            useLocalStorage, useCollectionView (search/filter/sort/paginate)
├── layouts/          CandidateLayout, TALayout, HRLayout
├── pages/            candidate/ · talentAcquisition/ · hr/ · shared/
├── routes/           AppRoutes.jsx
├── styles/           ta.css (premium TA design layer, scoped under .ta-shell)
└── utils/            ids.js, format.js, metrics.js, resumeParser.js (all frontend-only)
```

`graph/` holds an offline code map — run `npm run graph:open` for the
force-directed view, or read `graph/GRAPH.md`.

## State & persistence

- A single `AppContext` holds `applications`, `interviews`, `documents`, `offers`,
  `employees`, `activities`, `notifications` and ID counters.
- All workflow actions are pure functions over an immutable draft, then persisted to
  `localStorage` (key `talentflow.data.v7`). Refreshing the page keeps your progress.
- **Settings → Reset demo data** restores the original seed.

## Notes on the simulation

- **Resume parsing** (`utils/resumeParser.js`) is a frontend mock — it returns a
  plausible profile and marks the fields it "extracted"; there is no OCR/AI service.
- **File uploads** use a real file picker but only file metadata (name, size, type) is
  stored — nothing is uploaded anywhere.
- **Offer letter download / document preview** show a toast; there are no real files.

The architecture keeps data access behind `AppContext` selectors and actions so a real
API can be dropped in later without rewriting the UI.
