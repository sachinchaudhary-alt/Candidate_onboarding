// Copies the Vite production build into backend/app so `npm start` in
// backend/ serves the UI and the API from the same CAP server/port.
import { cpSync, rmSync } from 'node:fs';

rmSync('backend/app', { recursive: true, force: true });
cpSync('dist', 'backend/app', { recursive: true });
