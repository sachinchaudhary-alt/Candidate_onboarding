require('dotenv').config();
const cds = require('@sap/cds');
const path = require('node:path');
const multer = require('multer');
const { parseResume } = require('./srv/resumeParser');

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } });

async function documentsEntity() {
  const db = await cds.connect.to('db');
  const { Documents } = cds.entities('ta.master');
  return { db, Documents };
}

cds.on('bootstrap', (app) => {
  // Real (non-AI) resume parsing: reads the uploaded file's actual text and
  // extracts whatever a few patterns can reliably find. Not an OData
  // entity/action — it's a plain file upload, so a normal Express route.
  app.post('/parse-resume', upload.single('resume'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    try {
      const fields = await parseResume(req.file.buffer, req.file.mimetype, req.file.originalname);
      res.json(fields);
    } catch (err) {
      console.warn('[resume-parse] failed:', err.message);
      res.status(422).json({ error: 'Could not read this file' });
    }
  });

  // Candidate uploads one of their checklist documents — the actual file
  // bytes are stored in SQLite (Documents.fileContent) so TA can open the
  // real thing later, not just see a filename.
  app.post('/upload-document/:documentId', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const { db, Documents } = await documentsEntity();
    const { documentId } = req.params;
    const doc = await db.run(SELECT.one.from(Documents).where({ ID: documentId }));
    if (!doc) return res.status(404).json({ error: 'Document not found' });
    await db.run(UPDATE(Documents).set({
      fileContent: req.file.buffer,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      status: 'UPLOADED',
      uploadedAt: new Date().toISOString(),
      rejectionReason: null,
      verifiedAt: null,
      skipReason: null,
    }).where({ ID: documentId }));
    res.json({ ok: true });
  });

  // The frontend is a client-side-routed SPA (React Router) served out of
  // app/. A direct load or refresh of a route like /ta/candidates isn't a
  // real file, so it 404s unless we fall back to app/index.html and let
  // React Router take over. OData calls, the routes above, and real static
  // assets (anything with a file extension) are all left alone.
  app.use((req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/odata') || path.extname(req.path)) {
      return next();
    }
    res.sendFile(path.join(__dirname, 'app', 'index.html'));
  });
});

module.exports = cds.server;
