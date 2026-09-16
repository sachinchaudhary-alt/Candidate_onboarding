// Copies the Vite production build into ../app (the backend, one level up)
// so `npm start` at the repo root serves the UI and the API from the same
// CAP server/port.
import { cpSync, rmSync } from 'node:fs';

rmSync('../app', { recursive: true, force: true });
cpSync('dist', '../app', { recursive: true });
